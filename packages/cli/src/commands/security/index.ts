import { existsSync, realpathSync, statSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import {
  DEFAULT_SECURITY_POLICY,
  SecurityDecision,
  SecurityGateStatus,
  isSecretLikeValue,
  parseSecurityPolicy,
  redactSecurityText,
  redactSecurityValue,
  runSecurityGate
} from "@vibe-engineer/security";
import {
  artifactDescriptor,
  createEnvelope,
  invalidInvocationEnvelope,
  payload,
  validateCliResultEnvelope,
  writeResultFileAtomic
} from "../../envelope/result-envelope.js";
import { CliClassification, CliErrorCode, cliError, diagnostic } from "../../errors/codes.js";
import { isSecretFlag, parseFlagToken, sanitizeFlagForDisplay } from "../../errors/sanitization.js";

type UnknownRecord = Record<string, unknown>;

type CommandInvocation = {
  id: string;
  command: string;
  argv: string[];
  projectRoot: string | null;
  configPath: string | null;
  startedAt: string;
  endedAt: string;
};

type CommandContext = {
  invocation: CommandInvocation;
  args: string[];
  context: UnknownRecord;
};

type SecurityOptionKey = "requestFile" | "policyFile" | "projectRoot" | "resultFile";

type SecurityOptions = {
  projectRoot: string;
  requestFile: string;
  policyFile?: string;
  resultFile?: string;
};

type ParseResult =
  | { ok: true; options: SecurityOptions }
  | { ok: false; envelope: UnknownRecord };

type ReadJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string; details: UnknownRecord };

type EnvelopeFactoryInput = {
  invocation: CommandInvocation;
  status: string;
  payload: UnknownRecord;
  diagnostics?: UnknownRecord[];
  artifacts?: UnknownRecord[];
  errors?: UnknownRecord[];
  exitCode?: number | null;
};

type InvalidInvocationInput = { code?: string; classification?: string; message: string; details?: UnknownRecord };

type ParsedFlagToken = {
  isFlag: boolean;
  flag: string | null;
  hasInlineValue: boolean;
  value: string | null;
};

const makeArtifactDescriptor = artifactDescriptor as unknown as (input: { kind: string; path: string; schemaVersion?: string | null; role: string; sha256?: string | null }) => UnknownRecord;
const makeCreateEnvelope = createEnvelope as unknown as (input: EnvelopeFactoryInput) => UnknownRecord;
const makeInvalidInvocationEnvelope = invalidInvocationEnvelope as unknown as (invocation: CommandInvocation, input: InvalidInvocationInput) => UnknownRecord;
const makePayload = payload as unknown as (kind: string, data?: UnknownRecord, schemaVersion?: string) => UnknownRecord;
const makeValidateCliResultEnvelope = validateCliResultEnvelope as unknown as (envelope: UnknownRecord) => { ok: true; envelope: UnknownRecord } | { ok: false; errors: string[] };
const makeWriteResultFileAtomic = writeResultFileAtomic as unknown as (resultFile: string, envelope: UnknownRecord) => Promise<void>;
const makeCliError = cliError as unknown as (input: { code: string; classification: string; retryable?: boolean; blocking?: boolean; message: string; details?: UnknownRecord }) => UnknownRecord;
const makeDiagnostic = diagnostic as unknown as (input: { severity?: string; code: string; classification: string; message: string; path?: string | null; span?: unknown; hint?: string | null }) => UnknownRecord;

const VALUE_FLAGS = new Set<string>(["--request-file", "--policy-file", "--project-root", "--result-file"]);
const REQUIRED_FLAGS = new Set<string>(["--request-file"]);
const REDACTED = "<redacted>";
const PROTECTED_PROJECT_PREFIXES: readonly string[] = Object.freeze([
  ".git",
  ".github",
  "scripts",
  "infra",
  "docs",
  "packages/cli/src/entry",
  "packages/cli/src/command-loader",
  "packages/cli/src/envelope",
  "packages/cli/src/errors",
  "packages/cli/src/testing",
  "packages/cli/src/commands/verify",
  "packages/security",
  "packages/verification",
  "packages/artifacts",
  "packages/mechanical-gates",
  "packages/testing"
]);
const PROTECTED_PROJECT_FILES = new Set<string>(["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc", "turbo.json", "packages/cli/package.json", "packages/security/package.json"]);

function commandResult(envelope: UnknownRecord): { envelope: UnknownRecord } {
  return { envelope };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactText(text: string): string {
  return redactSecurityText(text);
}

function securityRedacted(value: unknown): unknown {
  return redactSecurityValue(value);
}

function invalid(invocation: CommandInvocation, options: { code?: string; classification?: string; message: string; details?: UnknownRecord }): { envelope: UnknownRecord } {
  return commandResult(makeInvalidInvocationEnvelope(invocation, {
    code: options.code ?? CliErrorCode.InvalidInvocation,
    classification: options.classification ?? CliClassification.InvalidInvocation,
    message: redactText(options.message),
    details: securityRedacted(options.details ?? {}) as UnknownRecord
  }));
}

function invalidInput(invocation: CommandInvocation, message: string, details: UnknownRecord = {}): { envelope: UnknownRecord } {
  return invalid(invocation, {
    code: CliErrorCode.InvalidInvocation,
    classification: CliClassification.InvalidInput,
    message,
    details
  });
}

function secretInput(invocation: CommandInvocation, flag: string | null): { envelope: UnknownRecord } {
  return invalidInput(invocation, "Secret-like security command input is not accepted.", { flag: flag === null ? REDACTED : sanitizeFlagForDisplay(flag), value: REDACTED });
}

function missingFlagValue(invocation: CommandInvocation, flag: string): { envelope: UnknownRecord } {
  const displayFlag = sanitizeFlagForDisplay(flag);
  return invalid(invocation, {
    code: CliErrorCode.MissingFlagValue,
    message: `Missing value for ${displayFlag}.`,
    details: { flag: displayFlag }
  });
}

function unknownFlag(invocation: CommandInvocation, token: string): { envelope: UnknownRecord } {
  const displayFlag = sanitizeFlagForDisplay(token);
  return invalid(invocation, {
    code: CliErrorCode.InvalidFlag,
    message: `Unsupported security flag: ${displayFlag}.`,
    details: { flag: displayFlag }
  });
}

function projectRelative(projectRoot: string, absPath: string): string {
  return relative(projectRoot, absPath).replaceAll("\\", "/");
}

function contained(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function realRoot(pathValue: string): string {
  const abs = resolve(pathValue);
  return existsSync(abs) ? realpathSync(abs) : abs;
}

function isProtectedProjectPath(projectRoot: string, absPath: string): boolean {
  const rel = projectRelative(projectRoot, absPath);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return false;
  if (PROTECTED_PROJECT_FILES.has(rel)) return true;
  return PROTECTED_PROJECT_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`));
}

function resolveWithinProject(projectRoot: string, pathValue: string, label: string, options: { mustExist: boolean; allowProtected: boolean }): string | { error: string } {
  if (pathValue.trim().length === 0) return { error: `${label} must be a non-empty path.` };
  if (isSecretLikeValue(pathValue)) return { error: `${label} contains a secret-like value.` };
  const rootReal = realRoot(projectRoot);
  const resolved = isAbsolute(pathValue) ? resolve(pathValue) : resolve(rootReal, pathValue);
  if (options.mustExist && !existsSync(resolved)) return { error: `${label} does not exist.` };
  const existing = existsSync(resolved) ? realpathSync(resolved) : resolved;
  const parent = existsSync(resolved) ? dirname(existing) : dirname(resolved);
  const parentReal = existsSync(parent) ? realpathSync(parent) : parent;
  if (!contained(rootReal, existing) || !contained(rootReal, parentReal)) return { error: `${label} escapes project root.` };
  if (!options.allowProtected && isProtectedProjectPath(rootReal, existing)) return { error: `${label} targets a protected project path.` };
  return resolved;
}

function propertyForFlag(flag: string): SecurityOptionKey | null {
  if (flag === "--request-file") return "requestFile";
  if (flag === "--policy-file") return "policyFile";
  if (flag === "--project-root") return "projectRoot";
  if (flag === "--result-file") return "resultFile";
  return null;
}

function tokenLooksSecretLike(token: string, parsed: ParsedFlagToken): boolean {
  if (parsed.isFlag && isSecretFlag(parsed.flag)) return true;
  if (isSecretLikeValue(token)) return true;
  return false;
}

function parseSecurityOptions(invocation: CommandInvocation, args: string[]): ParseResult {
  const values = new Map<SecurityOptionKey, string>();
  const seenFlags = new Set<string>();
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] ?? "";
    const parsed: ParsedFlagToken = parseFlagToken(token);
    if (!parsed.isFlag) {
      if (isSecretLikeValue(token)) return { ok: false, envelope: secretInput(invocation, null).envelope };
      positionals.push(token);
      continue;
    }
    const flag = typeof parsed.flag === "string" ? parsed.flag : "";
    if (tokenLooksSecretLike(token, parsed)) return { ok: false, envelope: secretInput(invocation, flag).envelope };
    if (!VALUE_FLAGS.has(flag)) return { ok: false, envelope: unknownFlag(invocation, token).envelope };
    if (seenFlags.has(flag)) {
      return { ok: false, envelope: invalid(invocation, {
        message: "Duplicate security flag is not allowed.",
        details: { flag: sanitizeFlagForDisplay(flag) }
      }).envelope };
    }
    seenFlags.add(flag);
    const value = parsed.hasInlineValue ? parsed.value : args[index + 1];
    if (typeof value !== "string" || value.length === 0 || (!parsed.hasInlineValue && value.startsWith("--"))) return { ok: false, envelope: missingFlagValue(invocation, flag).envelope };
    if (isSecretLikeValue(value)) return { ok: false, envelope: secretInput(invocation, flag).envelope };
    const property = propertyForFlag(flag);
    if (property === null) return { ok: false, envelope: unknownFlag(invocation, token).envelope };
    values.set(property, value);
    if (!parsed.hasInlineValue) index += 1;
  }

  if (positionals.length > 0) {
    return { ok: false, envelope: invalid(invocation, {
      message: "Unexpected positional arguments for security.",
      details: { positionalCount: positionals.length }
    }).envelope };
  }

  for (const flag of REQUIRED_FLAGS) {
    const property = propertyForFlag(flag);
    if (property !== null && !values.has(property)) {
      return { ok: false, envelope: invalid(invocation, {
        code: CliErrorCode.MissingFlagValue,
        message: "Missing required security flag.",
        details: { flag }
      }).envelope };
    }
  }

  const projectRoot = resolve(values.get("projectRoot") ?? invocation.projectRoot ?? process.cwd());
  if (!existsSync(projectRoot) || !statSync(projectRoot).isDirectory()) return { ok: false, envelope: invalidInput(invocation, "project-root must be an existing directory.", { flag: "--project-root" }).envelope };
  const projectRootReal = realRoot(projectRoot);
  const requestFile = resolveWithinProject(projectRootReal, values.get("requestFile") ?? "", "request file", { mustExist: true, allowProtected: false });
  if (typeof requestFile !== "string") return { ok: false, envelope: invalidInput(invocation, requestFile.error, { flag: "--request-file" }).envelope };
  const policyFileRaw = values.get("policyFile");
  const policyFile = policyFileRaw === undefined ? undefined : resolveWithinProject(projectRootReal, policyFileRaw, "policy file", { mustExist: true, allowProtected: false });
  if (policyFile !== undefined && typeof policyFile !== "string") return { ok: false, envelope: invalidInput(invocation, policyFile.error, { flag: "--policy-file" }).envelope };
  const resultFileRaw = values.get("resultFile");
  const resultFile = resultFileRaw === undefined ? undefined : resolveWithinProject(projectRootReal, resultFileRaw, "result file", { mustExist: false, allowProtected: false });
  if (resultFile !== undefined && typeof resultFile !== "string") return { ok: false, envelope: invalidInput(invocation, resultFile.error, { flag: "--result-file" }).envelope };

  return {
    ok: true,
    options: {
      projectRoot: projectRootReal,
      requestFile,
      ...(policyFile === undefined ? {} : { policyFile }),
      ...(resultFile === undefined ? {} : { resultFile })
    }
  };
}

async function readJsonFile(filePath: string, label: string): Promise<ReadJsonResult> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    return { ok: true, value: parsed };
  } catch (error) {
    const record = isRecord(error) ? error : {};
    return { ok: false, message: `${label} must be readable JSON.`, details: { path: filePath, errorName: typeof record.name === "string" ? record.name : null } };
  }
}

function securityEnvelope(invocation: CommandInvocation, options: SecurityOptions, gateResult: UnknownRecord): UnknownRecord {
  const status: string = gateResult.status === SecurityGateStatus.Passed || gateResult.status === SecurityGateStatus.Advisory ? "success" : "blocked";
  const data = securityRedacted({
    ok: status === "success",
    securityStatus: gateResult.status,
    decision: gateResult.decision,
    blocking: gateResult.blocking,
    findings: gateResult.findings,
    redactions: gateResult.redactions,
    auditEvents: gateResult.auditEvents,
    source: {
      requestFile: options.requestFile,
      policyFile: options.policyFile ?? null,
      projectRoot: options.projectRoot
    }
  }) as UnknownRecord;
  if (status === "success") return makeCreateEnvelope({ invocation, status, payload: makePayload("security_gate_result", data) });
  const findings = Array.isArray(gateResult.findings) ? gateResult.findings : [];
  const firstFinding = findings[0];
  const message = typeof firstFinding?.message === "string" ? firstFinding.message : "Security gate blocked the request.";
  return makeCreateEnvelope({
    invocation,
    status,
    payload: makePayload("security_gate_result", data),
    diagnostics: [makeDiagnostic({ code: CliErrorCode.InvalidInvocation, classification: CliClassification.SafetyPolicyBlock, message })],
    errors: [makeCliError({
      code: CliErrorCode.InvalidInvocation,
      classification: CliClassification.SafetyPolicyBlock,
      retryable: false,
      blocking: true,
      message,
      details: securityRedacted({ classification: firstFinding?.classification ?? null, category: firstFinding?.category ?? null, source: data.source }) as UnknownRecord
    })]
  });
}

function invalidEnvelopeFailure(invocation: CommandInvocation, validation: UnknownRecord): UnknownRecord {
  return makeCreateEnvelope({
    invocation,
    status: "failure",
    payload: makePayload("internal_error", { accepted: false }),
    diagnostics: [makeDiagnostic({ code: CliErrorCode.InvalidEnvelope, classification: CliClassification.InternalError, message: "Security command generated an invalid result envelope." })],
    errors: [makeCliError({ code: CliErrorCode.InvalidEnvelope, classification: CliClassification.InternalError, message: "Security command generated an invalid result envelope.", details: securityRedacted({ validationErrors: validation.errors }) as UnknownRecord })]
  });
}

function resultFileFailure(invocation: CommandInvocation, resultFile: string, error: unknown): UnknownRecord {
  const record = isRecord(error) ? error : {};
  const message = "Result file could not be written atomically.";
  return makeCreateEnvelope({
    invocation,
    status: "blocked",
    payload: makePayload("result_file_error", { resultFile: redactText(resultFile) }),
    diagnostics: [makeDiagnostic({ code: CliErrorCode.ResultFileWriteFailed, classification: CliClassification.WriteConflict, message, path: redactText(resultFile) })],
    errors: [makeCliError({ code: CliErrorCode.ResultFileWriteFailed, classification: CliClassification.WriteConflict, message, details: securityRedacted({ resultFile, errorCode: typeof record.code === "string" ? record.code : null }) as UnknownRecord })]
  });
}

async function finalizeEnvelope(envelope: UnknownRecord, resultFile?: string): Promise<UnknownRecord> {
  let finalEnvelope: UnknownRecord = envelope;
  if (resultFile !== undefined) {
    await mkdir(dirname(resultFile), { recursive: true });
    finalEnvelope = {
      ...finalEnvelope,
      artifacts: [
        ...(Array.isArray(finalEnvelope.artifacts) ? finalEnvelope.artifacts : []),
        makeArtifactDescriptor({ kind: "cli_result", path: resultFile, schemaVersion: typeof finalEnvelope.schemaVersion === "string" ? finalEnvelope.schemaVersion : null, role: "report" })
      ]
    };
  }
  const validation = makeValidateCliResultEnvelope(finalEnvelope);
  if (!validation.ok) finalEnvelope = invalidEnvelopeFailure(isRecord(finalEnvelope.invocation) ? finalEnvelope.invocation as CommandInvocation : envelope.invocation as CommandInvocation, validation as UnknownRecord);
  if (resultFile !== undefined) {
    try {
      await makeWriteResultFileAtomic(resultFile, finalEnvelope);
    } catch (error) {
      finalEnvelope = resultFileFailure(isRecord(finalEnvelope.invocation) ? finalEnvelope.invocation as CommandInvocation : envelope.invocation as CommandInvocation, resultFile, error);
    }
  }
  return finalEnvelope;
}

async function run({ invocation, args }: CommandContext): Promise<{ envelope: UnknownRecord }> {
  const parsed = parseSecurityOptions(invocation, args);
  if (!parsed.ok) return commandResult(parsed.envelope);

  const requestRead = await readJsonFile(parsed.options.requestFile, "Security request file");
  if (!requestRead.ok) return invalidInput(invocation, requestRead.message, requestRead.details);
  if (!isRecord(requestRead.value)) return invalidInput(invocation, "Security request file must contain a JSON object.", { path: parsed.options.requestFile });

  let request: UnknownRecord = requestRead.value;
  if (parsed.options.policyFile !== undefined) {
    const policyRead = await readJsonFile(parsed.options.policyFile, "Security policy file");
    if (!policyRead.ok) return invalidInput(invocation, policyRead.message, policyRead.details);
    const policyParse = parseSecurityPolicy(policyRead.value);
    if (!policyParse.ok) {
      const envelope = securityEnvelope(invocation, parsed.options, policyParse.result);
      return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
    }
    request = { ...request, policy: policyParse.policy };
  } else if (request.policy === undefined) {
    request = { ...request, policy: DEFAULT_SECURITY_POLICY };
  }

  const rawGateResult = runSecurityGate(request);
  const gateResult: UnknownRecord = isRecord(rawGateResult) ? rawGateResult : {};
  const envelope = securityEnvelope(invocation, parsed.options, gateResult);
  return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
}

export const securityCommand = Object.freeze({
  id: "security",
  visibility: "implementation",
  description: "Run fail-closed security and safety policy gates through @vibe-engineer/security.",
  run
});

export { SecurityDecision, SecurityGateStatus };
export default securityCommand;