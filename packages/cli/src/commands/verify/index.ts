import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { validateArtifactFile } from "@vibe-engineer/artifacts";
import {
  EVIDENCE_FAILURE_CLASSIFICATIONS,
  VERIFICATION_STATUSES,
  runVerificationPlan,
} from "@vibe-engineer/verification";
import {
  artifactDescriptor,
  createEnvelope,
  invalidInvocationEnvelope,
  payload,
  validateCliResultEnvelope,
  writeResultFileAtomic,
} from "../../envelope/result-envelope.js";
import { CliClassification, CliErrorCode, cliError, diagnostic } from "../../errors/codes.js";
import { parseFlagToken, sanitizeFlagForDisplay } from "../../errors/sanitization.js";

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

type VerifyOptions = {
  implementationPlanPath: string;
  evidenceRoot: string;
  projectRoot: string;
  runId: string;
  runnerCatalogPath: string;
  rerunOf?: string;
  resultFile?: string;
};

type RunnerFailure = {
  code: string;
  classification: string;
  message: string;
};

type MissingRunnerPrerequisite = RunnerFailure & {
  runnerId: string | null;
  missingPath: string | null;
  blockedItems: string[];
};

type PacketDescriptor = {
  path: string;
  sha256: string;
  schemaVersion: string;
  valid: boolean;
};

type ParseResult = { ok: true; options: VerifyOptions } | { ok: false; envelope: UnknownRecord };

type EnvelopeFactoryInput = {
  invocation: CommandInvocation;
  status: string;
  payload: UnknownRecord;
  diagnostics?: UnknownRecord[];
  artifacts?: UnknownRecord[];
  errors?: UnknownRecord[];
  exitCode?: number | null;
};

type InvalidInvocationInput = {
  code?: string;
  classification?: string;
  message: string;
  details?: unknown;
};

function makeArtifactDescriptor(input: {
  kind: string;
  path: string;
  schemaVersion?: string | null;
  role: string;
  sha256?: string | null;
}): UnknownRecord {
  return artifactDescriptor(input);
}
function makeCreateEnvelope(input: EnvelopeFactoryInput): UnknownRecord {
  return createEnvelope(input);
}
function makeInvalidInvocationEnvelope(
  invocation: CommandInvocation,
  input: InvalidInvocationInput,
): UnknownRecord {
  return invalidInvocationEnvelope(invocation, input);
}
function makePayload(kind: string, data?: UnknownRecord, schemaVersion?: string): UnknownRecord {
  return payload(kind, data, schemaVersion);
}
function makeValidateCliResultEnvelope(
  envelope: UnknownRecord,
): { ok: true; envelope: UnknownRecord } | { ok: false; errors: string[] } {
  return validateCliResultEnvelope(envelope);
}
function makeWriteResultFileAtomic(resultFile: string, envelope: UnknownRecord): Promise<void> {
  return writeResultFileAtomic(resultFile, envelope);
}
function makeCliError(input: {
  code: string;
  classification: string;
  retryable?: boolean;
  blocking?: boolean;
  message: string;
  details?: UnknownRecord;
}): UnknownRecord {
  return cliError(input);
}
function makeDiagnostic(input: {
  severity?: string;
  code: string;
  classification: string;
  message: string;
  path?: string | null;
  span?: unknown;
  hint?: string | null;
}): UnknownRecord {
  return diagnostic(input);
}

const VALUE_FLAGS = new Set([
  "--implementation-plan",
  "--evidence-root",
  "--project-root",
  "--run-id",
  "--runner-catalog",
  "--rerun-of",
  "--result-file",
]);

const REQUIRED_FLAGS = new Set([
  "--implementation-plan",
  "--evidence-root",
  "--project-root",
  "--run-id",
  "--runner-catalog",
]);
const SAFE_ID = /^[a-z0-9][a-z0-9._:-]*$/u;
const SECRET_KEY_PARTS = [
  "token",
  "auth-token",
  "access-token",
  "password",
  "passphrase",
  "secret",
  "api-key",
  "apikey",
  "credential",
  "credentials",
  "client-secret",
  "clientsecret",
];
const PROTECTED_PROJECT_PREFIXES = [
  ".git",
  ".github",
  "scripts",
  "infra",
  "docs",
  "packages/cli/src",
  "packages/artifacts",
  "packages/orchestration",
];
const PROTECTED_PROJECT_FILES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".npmrc",
  "turbo.json",
]);
const RUNNER_MISSING_PREREQUISITE = String(
  EVIDENCE_FAILURE_CLASSIFICATIONS.MISSING_RUNNER_OR_PREREQUISITE,
);
const RUNNER_STATUS_BLOCKED = String(VERIFICATION_STATUSES.BLOCKED);

function commandResult(envelope: UnknownRecord): { envelope: UnknownRecord } {
  return { envelope };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizedSecretKey(value: string): string {
  return value.toLowerCase().replaceAll("_", "-");
}

function isSecretLikeKey(value: string): boolean {
  const normalized = normalizedSecretKey(value);
  return SECRET_KEY_PARTS.some(
    (part) =>
      normalized === part ||
      normalized.includes(`-${part}`) ||
      normalized.includes(`${part}-`) ||
      normalized.includes(part),
  );
}

function redactText(text: string): string {
  let out = text;
  out = out.replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/giu, "Bearer <redacted>");
  out = out.replace(
    /([A-Za-z0-9_.-]*(?:token|password|passphrase|secret|apikey|api-key|credential|client-secret)[A-Za-z0-9_.-]*\s*=\s*)([^\s,;"']+)/giu,
    "$1<redacted>",
  );
  out = out.replace(
    /(--(?:token|auth-token|access-token|password|passphrase|secret|api-key|apikey|credential|credentials|client-secret)(?:=|\s+))([^\s]+)/giu,
    "$1<redacted>",
  );
  out = out.replace(/\bSECRET[_A-Z0-9-]*\b/gu, "<redacted>");
  out = out.replace(
    /\b[A-Z0-9_]*(?:TOKEN|PASSWORD|PASSPHRASE|SECRET|APIKEY|API_KEY|CREDENTIAL|CLIENT_SECRET)[A-Z0-9_]*\b/gu,
    "<redacted>",
  );
  return out;
}

function isSecretLikeValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (redactText(trimmed) !== trimmed) return true;
  if (/^(?:sk|ghp|gho|github_pat|xox[baprs])-?[A-Za-z0-9_=-]{12,}$/iu.test(trimmed)) return true;
  return false;
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (isRecord(value)) {
    const result: UnknownRecord = {};
    for (const [key, entry] of Object.entries(value))
      result[key] = isSecretLikeKey(key) ? "<redacted>" : redactValue(entry);
    return result;
  }
  return value;
}

function invalid(
  invocation: CommandInvocation,
  options: { code?: string; classification?: string; message: string; details?: UnknownRecord },
): { envelope: UnknownRecord } {
  return commandResult(
    makeInvalidInvocationEnvelope(invocation, {
      code: options.code ?? CliErrorCode.InvalidInvocation,
      classification: options.classification ?? CliClassification.InvalidInvocation,
      message: redactText(options.message),
      details: redactValue(options.details ?? {}),
    }),
  );
}

function invalidInput(
  invocation: CommandInvocation,
  message: string,
  details: UnknownRecord = {},
): { envelope: UnknownRecord } {
  return invalid(invocation, {
    code: CliErrorCode.InvalidInvocation,
    classification: CliClassification.InvalidInput,
    message,
    details,
  });
}

function missingFlagValue(
  invocation: CommandInvocation,
  flag: string,
): { envelope: UnknownRecord } {
  const displayFlag = sanitizeFlagForDisplay(flag);
  return invalid(invocation, {
    code: CliErrorCode.MissingFlagValue,
    message: `Missing value for ${displayFlag}.`,
    details: { flag: displayFlag },
  });
}

function unknownFlag(invocation: CommandInvocation, token: string): { envelope: UnknownRecord } {
  const displayFlag = sanitizeFlagForDisplay(token);
  return invalid(invocation, {
    code: CliErrorCode.InvalidFlag,
    message: `Unsupported verify flag: ${displayFlag}.`,
    details: { flag: displayFlag },
  });
}

function flagProperty(flag: string): keyof VerifyOptions | null {
  if (flag === "--implementation-plan") return "implementationPlanPath";
  if (flag === "--evidence-root") return "evidenceRoot";
  if (flag === "--project-root") return "projectRoot";
  if (flag === "--run-id") return "runId";
  if (flag === "--runner-catalog") return "runnerCatalogPath";
  if (flag === "--rerun-of") return "rerunOf";
  if (flag === "--result-file") return "resultFile";
  return null;
}

function realRoot(pathValue: string): string {
  const abs = resolve(pathValue);
  return existsSync(abs) ? realpathSync(abs) : abs;
}

function contained(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function projectRelative(projectRoot: string, absPath: string): string {
  return relative(projectRoot, absPath).replaceAll("\\", "/");
}

function isProtectedProjectPath(projectRoot: string, absPath: string): boolean {
  const rel = projectRelative(projectRoot, absPath);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return false;
  if (PROTECTED_PROJECT_FILES.has(rel)) return true;
  return PROTECTED_PROJECT_PREFIXES.some(
    (prefix) => rel === prefix || rel.startsWith(`${prefix}/`),
  );
}

function resolveWithinProject(
  projectRoot: string,
  pathValue: string,
  label: string,
  options: { mustExist: boolean; allowProtected: boolean },
): string | { error: string } {
  if (pathValue.trim().length === 0) return { error: `${label} must be a non-empty path.` };
  const rootReal = realRoot(projectRoot);
  const resolved = isAbsolute(pathValue) ? resolve(pathValue) : resolve(rootReal, pathValue);
  if (options.mustExist && !existsSync(resolved)) return { error: `${label} does not exist.` };
  const existing = existsSync(resolved) ? realpathSync(resolved) : resolved;
  const parent = existsSync(resolved) ? dirname(existing) : dirname(resolved);
  const parentReal = existsSync(parent) ? realpathSync(parent) : parent;
  if (!contained(rootReal, existing) || !contained(rootReal, parentReal))
    return { error: `${label} escapes project root.` };
  if (!options.allowProtected && isProtectedProjectPath(rootReal, existing))
    return { error: `${label} targets a protected project path.` };
  return resolved;
}

function parseVerifyOptions(invocation: CommandInvocation, args: string[]): ParseResult {
  const values = new Map<keyof VerifyOptions, string>();
  const seenFlags = new Set<string>();
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] ?? "";
    const parsed = parseFlagToken(token);
    if (!parsed.isFlag) {
      positionals.push(token);
      continue;
    }
    const flag = typeof parsed.flag === "string" ? parsed.flag : "";
    if (!VALUE_FLAGS.has(flag))
      return { ok: false, envelope: unknownFlag(invocation, token).envelope };
    if (seenFlags.has(flag)) {
      return {
        ok: false,
        envelope: invalid(invocation, {
          message: "Duplicate verify flag is not allowed.",
          details: { flag: sanitizeFlagForDisplay(flag) },
        }).envelope,
      };
    }
    seenFlags.add(flag);
    const value = parsed.hasInlineValue ? parsed.value : args[index + 1];
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      (!parsed.hasInlineValue && value.startsWith("--"))
    ) {
      return { ok: false, envelope: missingFlagValue(invocation, flag).envelope };
    }
    if (isSecretLikeValue(value)) {
      return {
        ok: false,
        envelope: invalidInput(invocation, "Secret-like verify input is not accepted.", {
          flag: sanitizeFlagForDisplay(flag),
          value: "<redacted>",
        }).envelope,
      };
    }
    const property = flagProperty(flag);
    if (property === null) return { ok: false, envelope: unknownFlag(invocation, token).envelope };
    values.set(property, value);
    if (!parsed.hasInlineValue) index += 1;
  }

  if (positionals.length > 0) {
    return {
      ok: false,
      envelope: invalid(invocation, {
        message: "Unexpected positional arguments for verify.",
        details: { positionalCount: positionals.length },
      }).envelope,
    };
  }

  for (const flag of REQUIRED_FLAGS) {
    const property = flagProperty(flag);
    if (property !== null && !values.has(property)) {
      // `--project-root` is a GLOBAL flag consumed by the entry parser and delivered as
      // invocation.projectRoot. Treat it as satisfied when present via either source (mirrors
      // the security/doctor/config context-fallback pattern). The other required flags are
      // command-specific and never stripped by the entry.
      if (flag !== "--project-root" || invocation.projectRoot === null) {
        return {
          ok: false,
          envelope: invalid(invocation, {
            code: CliErrorCode.MissingFlagValue,
            message: "Missing required verify flag.",
            details: { flag },
          }).envelope,
        };
      }
    }
  }

  const runId = values.get("runId") ?? "";
  const rerunOf = values.get("rerunOf");
  if (!SAFE_ID.test(runId))
    return {
      ok: false,
      envelope: invalidInput(invocation, "run-id must be a stable lowercase artifact id segment.", {
        flag: "--run-id",
      }).envelope,
    };
  if (rerunOf !== undefined && !SAFE_ID.test(rerunOf))
    return {
      ok: false,
      envelope: invalidInput(
        invocation,
        "rerun-of must be a stable lowercase artifact id segment.",
        { flag: "--rerun-of" },
      ).envelope,
    };

  // Fall back to the globally-parsed invocation.projectRoot (set by the entry parser when the
  // caller passes --project-root). Fail closed to "" (→ missing-dir error) rather than silently
  // using process.cwd(): verify requires a real project root containing the plan + catalog.
  const projectRootRaw = values.get("projectRoot") ?? invocation.projectRoot ?? "";
  const projectRoot = resolve(projectRootRaw);
  if (!existsSync(projectRoot) || !statSync(projectRoot).isDirectory()) {
    return {
      ok: false,
      envelope: invalidInput(invocation, "project-root must be an existing directory.", {
        flag: "--project-root",
      }).envelope,
    };
  }
  const projectRootReal = realRoot(projectRoot);
  const implementationPlan = resolveWithinProject(
    projectRootReal,
    values.get("implementationPlanPath") ?? "",
    "implementation plan path",
    { mustExist: true, allowProtected: true },
  );
  if (typeof implementationPlan !== "string")
    return {
      ok: false,
      envelope: invalidInput(invocation, implementationPlan.error, {
        flag: "--implementation-plan",
      }).envelope,
    };
  const runnerCatalog = resolveWithinProject(
    projectRootReal,
    values.get("runnerCatalogPath") ?? "",
    "runner catalog path",
    { mustExist: true, allowProtected: false },
  );
  if (typeof runnerCatalog !== "string")
    return {
      ok: false,
      envelope: invalidInput(invocation, runnerCatalog.error, { flag: "--runner-catalog" })
        .envelope,
    };
  const evidenceRoot = resolveWithinProject(
    projectRootReal,
    values.get("evidenceRoot") ?? "",
    "evidence root",
    { mustExist: false, allowProtected: false },
  );
  if (typeof evidenceRoot !== "string")
    return {
      ok: false,
      envelope: invalidInput(invocation, evidenceRoot.error, { flag: "--evidence-root" }).envelope,
    };
  const resultFileRaw = values.get("resultFile");
  const resultFile =
    resultFileRaw === undefined
      ? undefined
      : resolveWithinProject(projectRootReal, resultFileRaw, "result file", {
          mustExist: false,
          allowProtected: false,
        });
  if (resultFile !== undefined && typeof resultFile !== "string")
    return {
      ok: false,
      envelope: invalidInput(invocation, resultFile.error, { flag: "--result-file" }).envelope,
    };

  return {
    ok: true,
    options: {
      implementationPlanPath: implementationPlan,
      evidenceRoot,
      projectRoot: projectRootReal,
      runId,
      runnerCatalogPath: runnerCatalog,
      ...(rerunOf === undefined ? {} : { rerunOf }),
      ...(typeof resultFile === "string" ? { resultFile } : {}),
    },
  };
}

async function readRunnerCatalog(
  catalogPath: string,
): Promise<Record<string, unknown>[] | { error: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(catalogPath, "utf8"));
  } catch {
    return { error: "Runner catalog must be a readable JSON file." };
  }
  if (!Array.isArray(parsed) || parsed.some((entry) => !isRecord(entry)))
    return { error: "Runner catalog JSON must be an array of typed runner objects." };
  return parsed;
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function typedRunnerString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function typedArgPathRoot(spec: UnknownRecord, index: number): string | null {
  const argPaths = Array.isArray(spec.argPaths) ? spec.argPaths : [];
  for (const entry of argPaths) {
    if (!isRecord(entry)) continue;
    if (entry.index === index && typeof entry.root === "string") return entry.root;
  }
  return null;
}

function resolveRunnerCwd(projectRoot: string, spec: UnknownRecord): string {
  const cwdInput = typeof spec.cwd === "string" && spec.cwd.length > 0 ? spec.cwd : ".";
  const cwdResolved = resolve(projectRoot, cwdInput);
  return existsSync(cwdResolved) ? realpathSync(cwdResolved) : cwdResolved;
}

function missingRunnerPrerequisite(
  catalog: UnknownRecord[],
  projectRoot: string,
): MissingRunnerPrerequisite | null {
  const processExecReal = existsSync(process.execPath)
    ? realpathSync(process.execPath)
    : process.execPath;
  for (const spec of catalog) {
    if (spec.kind !== "command") continue;
    const runnerId = typedRunnerString(spec.id);
    const requiredItemIds = asStringArray(spec.requiredItemIds);
    const command = typedRunnerString(spec.command);
    if (command === null || !isAbsolute(command) || !existsSync(command)) continue;
    const commandReal = realpathSync(command);
    if (commandReal !== processExecReal) continue;
    const args = Array.isArray(spec.args) ? spec.args.map(String) : [];
    if (typedArgPathRoot(spec, 0) !== "projectRoot" || args.length === 0) continue;
    const scriptPath = isAbsolute(args[0] ?? "")
      ? resolve(args[0] ?? "")
      : resolve(resolveRunnerCwd(projectRoot, spec), args[0] ?? "");
    if (!existsSync(scriptPath)) {
      return {
        code: "MISSING_RUNNER_OR_PREREQUISITE",
        classification: RUNNER_MISSING_PREREQUISITE,
        message: "Declared Node runner script is missing.",
        runnerId,
        missingPath: scriptPath,
        blockedItems: requiredItemIds,
      };
    }
  }
  return null;
}

function missingRunnerResult(
  options: VerifyOptions,
  missing: MissingRunnerPrerequisite,
): UnknownRecord {
  return redactValue({
    status: RUNNER_STATUS_BLOCKED,
    runId: options.runId,
    evidencePackets: [],
    executedItems: [],
    recordedItems: [],
    blockedItems: missing.blockedItems,
    failures: [
      { code: missing.code, classification: missing.classification, message: missing.message },
    ],
    warnings: [],
    ...(options.rerunOf === undefined ? {} : { rerunOf: options.rerunOf }),
  }) as UnknownRecord;
}

function runnerFailures(result: UnknownRecord): RunnerFailure[] {
  const rawFailures = Array.isArray(result.failures) ? result.failures : [];
  const failures: RunnerFailure[] = [];
  for (const entry of rawFailures) {
    if (!isRecord(entry)) continue;
    failures.push({
      code: typeof entry.code === "string" ? entry.code : "UNKNOWN_VERIFICATION_FAILURE",
      classification:
        typeof entry.classification === "string" ? entry.classification : "classification_unknown",
      message:
        typeof entry.message === "string"
          ? redactText(entry.message)
          : "Verification runner reported a failure.",
    });
  }
  return failures;
}

function primaryFailure(result: UnknownRecord): RunnerFailure {
  return (
    runnerFailures(result)[0] ?? {
      code: "VERIFICATION_NOT_GREEN",
      classification: "classification_unknown",
      message: "Verification runner did not produce a green result.",
    }
  );
}

function mapFailureClassification(classification: string): string {
  if (
    classification === "missing_runner_or_prerequisite" ||
    classification === "missing_evidence" ||
    classification === "blocked_prerequisite"
  )
    return CliClassification.MissingPrerequisite;
  if (classification === "safety_or_security_policy_failure")
    return CliClassification.SafetyPolicyBlock;
  if (
    classification === "runner_internal_error" ||
    classification === "test_bug" ||
    classification === "classification_unknown"
  )
    return CliClassification.InternalError;
  if (
    classification === "schema_or_contract_failure" ||
    classification === "skipped_required_delta_category" ||
    classification === "mechanical_gate_failure"
  )
    return CliClassification.InvalidInput;
  if (
    classification === "external_dependency_drift" ||
    classification === "environment_issue" ||
    classification === "timing_or_flaky_suspicion"
  )
    return CliClassification.ExternalUnavailable;
  return CliClassification.DeterministicFailure;
}

function stableCodeForClassification(classification: string): string {
  if (classification === CliClassification.InternalError) return CliErrorCode.InternalError;
  if (classification === CliClassification.MissingPrerequisite) return CliErrorCode.MissingConfig;
  return CliErrorCode.InvalidInvocation;
}

function cliStatusForRunner(result: UnknownRecord): string {
  if (result.status === "passed" || result.status === "advisory_warning") return "success";
  if (result.status === "failed") return "failure";
  return "blocked";
}

function descriptorForPacket(packet: PacketDescriptor): UnknownRecord {
  return makeArtifactDescriptor({
    kind: "evidence_packet",
    path: packet.path,
    schemaVersion: packet.schemaVersion,
    role: "evidence_packet",
    sha256: packet.sha256,
  });
}

async function packetDescriptors(
  paths: string[],
): Promise<PacketDescriptor[] | { error: string; path: string }> {
  const descriptors: PacketDescriptor[] = [];
  for (const packetPath of paths) {
    const validation = validateArtifactFile(packetPath, { kind: "evidence_packet" });
    if (!validation.ok)
      return { error: "Runner returned an invalid Evidence Packet path.", path: packetPath };
    descriptors.push({
      path: packetPath,
      schemaVersion: "1.0.0",
      sha256: sha256File(packetPath),
      valid: true,
    });
  }
  return descriptors;
}

function runnerEnvelope(
  invocation: CommandInvocation,
  result: UnknownRecord,
  packets: PacketDescriptor[],
): UnknownRecord {
  const status = cliStatusForRunner(result);
  const firstFailure = primaryFailure(result);
  const classification =
    status === "success" ? null : mapFailureClassification(firstFailure.classification);
  const artifacts = packets.map(descriptorForPacket);
  const warnings = asStringArray(result.warnings).map(redactText);
  const commonPayload = makePayload(
    "verification_result",
    redactValue({
      ok: status === "success",
      runnerStatus: typeof result.status === "string" ? result.status : "unknown",
      runId: typeof result.runId === "string" ? result.runId : null,
      rerunOf: typeof result.rerunOf === "string" ? result.rerunOf : null,
      evidencePackets: packets,
      executedItems: asStringArray(result.executedItems),
      recordedItems: asStringArray(result.recordedItems),
      blockedItems: asStringArray(result.blockedItems),
      failures: runnerFailures(result),
      warnings,
    }) as UnknownRecord,
  );

  if (status === "success") {
    const advisoryDiagnostics =
      result.status === "advisory_warning"
        ? [
            makeDiagnostic({
              severity: "warning",
              code: CliErrorCode.InvalidInvocation,
              classification: CliClassification.DeterministicFailure,
              message: "Verification completed with advisory-only findings.",
            }),
          ]
        : [];
    return makeCreateEnvelope({
      invocation,
      status,
      payload: commonPayload,
      diagnostics: advisoryDiagnostics,
      artifacts,
    });
  }

  const stableClassification =
    typeof classification === "string" ? classification : CliClassification.InternalError;
  const stableCode = stableCodeForClassification(stableClassification);
  const message = firstFailure.message || "Verification runner reported a non-green result.";
  return makeCreateEnvelope({
    invocation,
    status,
    payload: commonPayload,
    diagnostics: [
      makeDiagnostic({
        severity: "error",
        code: stableCode,
        classification: stableClassification,
        message,
      }),
    ],
    artifacts,
    errors: [
      makeCliError({
        code: stableCode,
        classification: stableClassification,
        retryable:
          stableClassification === CliClassification.MissingPrerequisite ||
          stableClassification === CliClassification.ExternalUnavailable,
        blocking: status === "blocked",
        message,
        details: redactValue({
          runnerCode: firstFailure.code,
          runnerClassification: firstFailure.classification,
          evidencePacketPaths: packets.map((packet) => packet.path),
        }) as UnknownRecord,
      }),
    ],
  });
}

function runnerExceptionEnvelope(invocation: CommandInvocation, error: unknown): UnknownRecord {
  const record = isRecord(error) ? error : {};
  const runnerCode = typeof record.code === "string" ? record.code : "RUNNER_EXCEPTION";
  const invalidInputCodes = new Set([
    "INVALID_OPTIONS",
    "INVALID_IMPLEMENTATION_PLAN",
    "INVALID_VERIFICATION_DELTA",
    "PLAN_NOT_APPROVED",
    "PATH_CONTAINMENT_DENIED",
    "INVALID_RUNNER_SPEC",
  ]);
  const classification = invalidInputCodes.has(runnerCode)
    ? CliClassification.InvalidInput
    : CliClassification.InternalError;
  const status = classification === CliClassification.InternalError ? "failure" : "blocked";
  const code = stableCodeForClassification(classification);
  const message =
    runnerCode === "PLAN_NOT_APPROVED"
      ? "Implementation Plan status must be approved before verification can run."
      : "Verification runner rejected the request.";
  return makeCreateEnvelope({
    invocation,
    status,
    payload: makePayload(
      "verification_result",
      redactValue({ ok: false, runnerStatus: "not_run", runnerCode }) as UnknownRecord,
    ),
    diagnostics: [makeDiagnostic({ severity: "error", code, classification, message })],
    errors: [
      makeCliError({
        code,
        classification,
        blocking: true,
        message,
        details: redactValue({
          runnerCode,
          errorName: typeof record.name === "string" ? record.name : null,
        }) as UnknownRecord,
      }),
    ],
  });
}

function invalidEnvelopeFailure(
  invocation: CommandInvocation,
  validation: UnknownRecord,
): UnknownRecord {
  return makeCreateEnvelope({
    invocation,
    status: "failure",
    payload: makePayload("internal_error", { accepted: false }),
    diagnostics: [
      makeDiagnostic({
        code: CliErrorCode.InvalidEnvelope,
        classification: CliClassification.InternalError,
        message: "Verify command generated an invalid result envelope.",
      }),
    ],
    errors: [
      makeCliError({
        code: CliErrorCode.InvalidEnvelope,
        classification: CliClassification.InternalError,
        message: "Verify command generated an invalid result envelope.",
        details: redactValue({ validationErrors: validation.errors }) as UnknownRecord,
      }),
    ],
  });
}

function resultFileFailure(
  invocation: CommandInvocation,
  resultFile: string,
  error: unknown,
): UnknownRecord {
  const record = isRecord(error) ? error : {};
  const message = "Result file could not be written atomically.";
  return makeCreateEnvelope({
    invocation,
    status: "blocked",
    payload: makePayload("result_file_error", { resultFile: redactText(resultFile) }),
    diagnostics: [
      makeDiagnostic({
        code: CliErrorCode.ResultFileWriteFailed,
        classification: CliClassification.WriteConflict,
        message,
        path: redactText(resultFile),
      }),
    ],
    errors: [
      makeCliError({
        code: CliErrorCode.ResultFileWriteFailed,
        classification: CliClassification.WriteConflict,
        message,
        details: redactValue({
          resultFile,
          errorCode: typeof record.code === "string" ? record.code : null,
        }) as UnknownRecord,
      }),
    ],
  });
}

async function finalizeEnvelope(
  envelope: UnknownRecord,
  resultFile?: string,
): Promise<UnknownRecord> {
  let finalEnvelope = envelope;
  if (resultFile !== undefined) {
    await mkdir(dirname(resultFile), { recursive: true });
    finalEnvelope = {
      ...finalEnvelope,
      artifacts: [
        ...(Array.isArray(finalEnvelope.artifacts) ? finalEnvelope.artifacts : []),
        makeArtifactDescriptor({
          kind: "cli_result",
          path: resultFile,
          schemaVersion:
            typeof finalEnvelope.schemaVersion === "string" ? finalEnvelope.schemaVersion : null,
          role: "report",
        }),
      ],
    };
  }
  const validation = makeValidateCliResultEnvelope(finalEnvelope);
  if (!validation.ok)
    finalEnvelope = invalidEnvelopeFailure(
      isRecord(finalEnvelope.invocation)
        ? (finalEnvelope.invocation as CommandInvocation)
        : (envelope.invocation as CommandInvocation),
      validation as UnknownRecord,
    );
  if (resultFile !== undefined) {
    try {
      await makeWriteResultFileAtomic(resultFile, finalEnvelope);
    } catch (error) {
      finalEnvelope = resultFileFailure(
        isRecord(finalEnvelope.invocation)
          ? (finalEnvelope.invocation as CommandInvocation)
          : (envelope.invocation as CommandInvocation),
        resultFile,
        error,
      );
    }
  }
  return finalEnvelope;
}

async function run({ invocation, args }: CommandContext): Promise<{ envelope: UnknownRecord }> {
  const parsed = parseVerifyOptions(invocation, args);
  if (!parsed.ok) return commandResult(parsed.envelope);
  const catalog = await readRunnerCatalog(parsed.options.runnerCatalogPath);
  if (!Array.isArray(catalog))
    return invalidInput(invocation, catalog.error, { flag: "--runner-catalog" });

  const missingRunner = missingRunnerPrerequisite(catalog, parsed.options.projectRoot);
  if (missingRunner !== null) {
    const packets = await packetDescriptors([]);
    if (!Array.isArray(packets)) throw new Error("empty packet descriptor validation failed");
    const envelope = runnerEnvelope(
      invocation,
      missingRunnerResult(parsed.options, missingRunner),
      packets,
    );
    return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
  }

  let runnerResult: UnknownRecord;
  try {
    const result = await runVerificationPlan({
      implementationPlanPath: parsed.options.implementationPlanPath,
      evidenceRoot: parsed.options.evidenceRoot,
      projectRoot: parsed.options.projectRoot,
      runId: parsed.options.runId,
      runnerCatalog: catalog,
      ...(parsed.options.rerunOf === undefined ? {} : { rerunOf: parsed.options.rerunOf }),
    });
    runnerResult = isRecord(result)
      ? result
      : {
          status: "failed",
          failures: [
            {
              code: "INVALID_RUNNER_RESULT",
              classification: "schema_or_contract_failure",
              message: "Runner returned a malformed result.",
            },
          ],
        };
  } catch (error) {
    const envelope = await finalizeEnvelope(
      runnerExceptionEnvelope(invocation, error),
      parsed.options.resultFile,
    );
    return commandResult(envelope);
  }

  const packetPaths = asStringArray(runnerResult.evidencePackets);
  const packets = await packetDescriptors(packetPaths);
  if (!Array.isArray(packets)) {
    const envelope = makeCreateEnvelope({
      invocation,
      status: "failure",
      payload: makePayload(
        "verification_result",
        redactValue({
          ok: false,
          runnerStatus: runnerResult.status ?? "unknown",
          invalidEvidencePacketPath: packets.path,
        }) as UnknownRecord,
      ),
      diagnostics: [
        makeDiagnostic({
          code: CliErrorCode.InternalError,
          classification: CliClassification.InternalError,
          message: packets.error,
        }),
      ],
      errors: [
        makeCliError({
          code: CliErrorCode.InternalError,
          classification: CliClassification.InternalError,
          message: packets.error,
          details: redactValue({ path: packets.path }) as UnknownRecord,
        }),
      ],
    });
    return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
  }

  const envelope = runnerEnvelope(invocation, runnerResult, packets);
  return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
}

export const verifyCommand = Object.freeze({
  id: "verify",
  visibility: "implementation",
  description:
    "Run an approved Implementation Plan through the verification runner and emit CLI result evidence.",
  run,
});

export default verifyCommand;
