import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { validateArtifactFile } from "@vibe-engineer/artifacts";
import { runBuildFromImplementationPlan, persistBuildResult } from "@vibe-engineer/skills/build";
import {
  artifactDescriptor,
  createEnvelope,
  invalidInvocationEnvelope,
  payload,
  validateCliResultEnvelope,
  writeResultFileAtomic
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

type BuildOptions = {
  implementationPlanPath: string;
  evidenceRoot: string;
  projectRoot: string;
  runId: string;
  runnerCatalogPath: string;
  resultFile?: string;
};

type ParseResult =
  | { ok: true; options: BuildOptions }
  | { ok: false; envelope: UnknownRecord };

type EnvelopeFactoryInput = {
  invocation: CommandInvocation;
  status: string;
  payload: UnknownRecord;
  diagnostics?: UnknownRecord[];
  artifacts?: UnknownRecord[];
  errors?: UnknownRecord[];
  exitCode?: number | null;
};

type InvalidInvocationInput = { code?: string; classification?: string; message: string; details?: unknown };

const makeArtifactDescriptor = artifactDescriptor as unknown as (input: { kind: string; path: string; schemaVersion?: string | null; role: string; sha256?: string | null }) => UnknownRecord;
const makeCreateEnvelope = createEnvelope as unknown as (input: EnvelopeFactoryInput) => UnknownRecord;
const makeInvalidInvocationEnvelope = invalidInvocationEnvelope as unknown as (invocation: CommandInvocation, input: InvalidInvocationInput) => UnknownRecord;
const makePayload = payload as unknown as (kind: string, data?: UnknownRecord, schemaVersion?: string) => UnknownRecord;
const makeValidateCliResultEnvelope = validateCliResultEnvelope as unknown as (envelope: UnknownRecord) => { ok: true; envelope: UnknownRecord } | { ok: false; errors: string[] };
const makeWriteResultFileAtomic = writeResultFileAtomic as unknown as (resultFile: string, envelope: UnknownRecord) => Promise<void>;
const makeCliError = cliError as unknown as (input: { code: string; classification: string; retryable?: boolean; blocking?: boolean; message: string; details?: UnknownRecord }) => UnknownRecord;
const makeDiagnostic = diagnostic as unknown as (input: { severity?: string; code: string; classification: string; message: string; path?: string | null; span?: unknown; hint?: string | null }) => UnknownRecord;
const runBuild = runBuildFromImplementationPlan as unknown as (options: UnknownRecord) => Promise<{ ok: true; buildResult: UnknownRecord; buildResultPath: string; evidencePackets: string[]; harness?: UnknownRecord } | { ok: false; reason: string; planStatus?: string; verificationStatus?: string; runnerCode?: string | null }>;
const persistResult = persistBuildResult as unknown as (buildResult: UnknownRecord, persistence: UnknownRecord) => Promise<{ ok: true; filePath: string } | { ok: false; reason: string }>;

const VALUE_FLAGS = new Set([
  "--implementation-plan",
  "--evidence-root",
  "--project-root",
  "--run-id",
  "--runner-catalog",
  "--result-file"
]);

const REQUIRED_FLAGS = new Set(["--implementation-plan", "--evidence-root", "--project-root", "--run-id", "--runner-catalog"]);
const SAFE_ID = /^[a-z0-9][a-z0-9._:-]*$/u;
const SECRET_KEY_PARTS = ["token", "auth-token", "access-token", "password", "passphrase", "secret", "api-key", "apikey", "credential", "credentials", "client-secret", "clientsecret"];
const PROTECTED_PROJECT_PREFIXES = [".git", ".github", "scripts", "infra", "docs", "packages/cli/src", "packages/artifacts", "packages/orchestration"];
const PROTECTED_PROJECT_FILES = new Set(["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc", "turbo.json"]);

function commandResult(envelope: UnknownRecord): { envelope: UnknownRecord } {
  return { envelope };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedSecretKey(value: string): string {
  return value.toLowerCase().replaceAll("_", "-");
}

function isSecretLikeKey(value: string): boolean {
  const normalized = normalizedSecretKey(value);
  return SECRET_KEY_PARTS.some((part) => normalized === part || normalized.includes(`-${part}`) || normalized.includes(`${part}-`) || normalized.includes(part));
}

function redactText(text: string): string {
  let out = text;
  out = out.replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/giu, "Bearer <redacted>");
  out = out.replace(/([A-Za-z0-9_.-]*(?:token|password|passphrase|secret|apikey|api-key|credential|client-secret)[A-Za-z0-9_.-]*\s*=\s*)([^\s,;"']+)/giu, "$1<redacted>");
  out = out.replace(/(--(?:token|auth-token|access-token|password|passphrase|secret|api-key|apikey|credential|credentials|client-secret)(?:=|\s+))([^\s]+)/giu, "$1<redacted>");
  out = out.replace(/\bSECRET[_A-Z0-9-]*\b/gu, "<redacted>");
  out = out.replace(/\b[A-Z0-9_]*(?:TOKEN|PASSWORD|PASSPHRASE|SECRET|APIKEY|API_KEY|CREDENTIAL|CLIENT_SECRET)[A-Z0-9_]*\b/gu, "<redacted>");
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
    for (const [key, entry] of Object.entries(value)) result[key] = isSecretLikeKey(key) ? "<redacted>" : redactValue(entry);
    return result;
  }
  return value;
}

function invalid(invocation: CommandInvocation, options: { code?: string; classification?: string; message: string; details?: UnknownRecord }): { envelope: UnknownRecord } {
  return commandResult(makeInvalidInvocationEnvelope(invocation, {
    code: options.code ?? CliErrorCode.InvalidInvocation,
    classification: options.classification ?? CliClassification.InvalidInvocation,
    message: redactText(options.message),
    details: redactValue(options.details ?? {})
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
    message: `Unsupported build flag: ${displayFlag}.`,
    details: { flag: displayFlag }
  });
}

function flagProperty(flag: string): keyof BuildOptions | null {
  if (flag === "--implementation-plan") return "implementationPlanPath";
  if (flag === "--evidence-root") return "evidenceRoot";
  if (flag === "--project-root") return "projectRoot";
  if (flag === "--run-id") return "runId";
  if (flag === "--runner-catalog") return "runnerCatalogPath";
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
  return PROTECTED_PROJECT_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`));
}

function resolveWithinProject(projectRoot: string, pathValue: string, label: string, options: { mustExist: boolean; allowProtected: boolean }): string | { error: string } {
  if (pathValue.trim().length === 0) return { error: `${label} must be a non-empty path.` };
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

function parseBuildOptions(invocation: CommandInvocation, args: string[]): ParseResult {
  const values = new Map<keyof BuildOptions, string>();
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
    if (!VALUE_FLAGS.has(flag)) return { ok: false, envelope: unknownFlag(invocation, token).envelope };
    if (seenFlags.has(flag)) {
      return { ok: false, envelope: invalid(invocation, {
        message: "Duplicate build flag is not allowed.",
        details: { flag: sanitizeFlagForDisplay(flag) }
      }).envelope };
    }
    seenFlags.add(flag);
    const value = parsed.hasInlineValue ? parsed.value : args[index + 1];
    if (typeof value !== "string" || value.length === 0 || (!parsed.hasInlineValue && value.startsWith("--"))) {
      return { ok: false, envelope: missingFlagValue(invocation, flag).envelope };
    }
    if (isSecretLikeValue(value)) {
      return { ok: false, envelope: invalidInput(invocation, "Secret-like build input is not accepted.", { flag: sanitizeFlagForDisplay(flag), value: "<redacted>" }).envelope };
    }
    const property = flagProperty(flag);
    if (property === null) return { ok: false, envelope: unknownFlag(invocation, token).envelope };
    values.set(property, value);
    if (!parsed.hasInlineValue) index += 1;
  }

  if (positionals.length > 0) {
    return { ok: false, envelope: invalid(invocation, {
      message: "Unexpected positional arguments for build.",
      details: { positionalCount: positionals.length }
    }).envelope };
  }

  for (const flag of REQUIRED_FLAGS) {
    const property = flagProperty(flag);
    if (property !== null && !values.has(property)) {
      return { ok: false, envelope: invalid(invocation, {
        code: CliErrorCode.MissingFlagValue,
        message: "Missing required build flag.",
        details: { flag }
      }).envelope };
    }
  }

  const runId = values.get("runId") ?? "";
  if (!SAFE_ID.test(runId)) return { ok: false, envelope: invalidInput(invocation, "run-id must be a stable lowercase artifact id segment.", { flag: "--run-id" }).envelope };

  const projectRootRaw = values.get("projectRoot") ?? "";
  const projectRoot = resolve(projectRootRaw);
  if (!existsSync(projectRoot) || !statSync(projectRoot).isDirectory()) {
    return { ok: false, envelope: invalidInput(invocation, "project-root must be an existing directory.", { flag: "--project-root" }).envelope };
  }
  const projectRootReal = realRoot(projectRoot);
  const implementationPlan = resolveWithinProject(projectRootReal, values.get("implementationPlanPath") ?? "", "implementation plan path", { mustExist: true, allowProtected: true });
  if (typeof implementationPlan !== "string") return { ok: false, envelope: invalidInput(invocation, implementationPlan.error, { flag: "--implementation-plan" }).envelope };
  const runnerCatalog = resolveWithinProject(projectRootReal, values.get("runnerCatalogPath") ?? "", "runner catalog path", { mustExist: true, allowProtected: false });
  if (typeof runnerCatalog !== "string") return { ok: false, envelope: invalidInput(invocation, runnerCatalog.error, { flag: "--runner-catalog" }).envelope };
  const evidenceRoot = resolveWithinProject(projectRootReal, values.get("evidenceRoot") ?? "", "evidence root", { mustExist: false, allowProtected: false });
  if (typeof evidenceRoot !== "string") return { ok: false, envelope: invalidInput(invocation, evidenceRoot.error, { flag: "--evidence-root" }).envelope };
  const resultFileRaw = values.get("resultFile");
  const resultFile = resultFileRaw === undefined ? undefined : resolveWithinProject(projectRootReal, resultFileRaw, "result file", { mustExist: false, allowProtected: false });
  if (resultFile !== undefined && typeof resultFile !== "string") return { ok: false, envelope: invalidInput(invocation, resultFile.error, { flag: "--result-file" }).envelope };

  return {
    ok: true,
    options: {
      implementationPlanPath: implementationPlan,
      evidenceRoot,
      projectRoot: projectRootReal,
      runId,
      runnerCatalogPath: runnerCatalog,
      ...(typeof resultFile === "string" ? { resultFile } : {})
    }
  };
}

async function readRunnerCatalog(catalogPath: string): Promise<UnknownRecord[] | { error: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    return { error: "Runner catalog must be a readable JSON file." };
  }
  if (!Array.isArray(parsed) || parsed.some((entry) => !isRecord(entry))) return { error: "Runner catalog JSON must be an array of typed runner objects." };
  return parsed as UnknownRecord[];
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function classificationForReason(reason: string): string {
  if (reason === "plan_not_approved") return CliClassification.InvalidInput;
  if (reason === "verification_failed_blocks_build") return CliClassification.DeterministicFailure;
  if (reason === "verification_runner_exception") return CliClassification.InternalError;
  if (reason === "build_result_public_schema" || reason === "build_result_persist_pre_schema" || reason === "build_result_persisted_public_schema" || reason === "build_evidence_packet" || reason === "build_intake_implementation_plan") return CliClassification.InvalidInput;
  if (reason === "invalid_build_options" || reason === "invalid_run_id" || reason === "build_runner_catalog") return CliClassification.InvalidInput;
  return CliClassification.InternalError;
}

function statusForReason(reason: string): string {
  if (reason === "verification_failed_blocks_build" || reason === "verification_runner_exception") return "failure";
  return "blocked";
}

async function finalizeEnvelope(envelope: UnknownRecord, resultFile?: string): Promise<UnknownRecord> {
  let finalEnvelope = envelope;
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
  if (!validation.ok) {
    const invocation = isRecord(finalEnvelope.invocation) ? finalEnvelope.invocation as CommandInvocation : (finalEnvelope.invocation as CommandInvocation);
    return makeCreateEnvelope({
      invocation,
      status: "failure",
      payload: makePayload("internal_error", { accepted: false }),
      diagnostics: [makeDiagnostic({ code: CliErrorCode.InvalidEnvelope, classification: CliClassification.InternalError, message: "Build command generated an invalid result envelope." })],
      errors: [makeCliError({ code: CliErrorCode.InvalidEnvelope, classification: CliClassification.InternalError, message: "Build command generated an invalid result envelope.", details: redactValue({ validationErrors: validation.errors }) as UnknownRecord })]
    });
  }
  if (resultFile !== undefined) {
    try {
      await makeWriteResultFileAtomic(resultFile, finalEnvelope);
    } catch {
      const invocation = isRecord(finalEnvelope.invocation) ? finalEnvelope.invocation as CommandInvocation : (finalEnvelope.invocation as CommandInvocation);
      return makeCreateEnvelope({
        invocation,
        status: "blocked",
        payload: makePayload("result_file_error", { resultFile: redactText(resultFile) }),
        diagnostics: [makeDiagnostic({ code: CliErrorCode.ResultFileWriteFailed, classification: CliClassification.WriteConflict, message: "Result file could not be written atomically.", path: redactText(resultFile) })],
        errors: [makeCliError({ code: CliErrorCode.ResultFileWriteFailed, classification: CliClassification.WriteConflict, message: "Result file could not be written atomically.", details: redactValue({ resultFile }) as UnknownRecord })]
      });
    }
  }
  return finalEnvelope;
}

async function run({ invocation, args }: CommandContext): Promise<{ envelope: UnknownRecord }> {
  const parsed = parseBuildOptions(invocation, args);
  if (!parsed.ok) return commandResult(parsed.envelope);
  const catalog = await readRunnerCatalog(parsed.options.runnerCatalogPath);
  if (!Array.isArray(catalog)) return invalidInput(invocation, catalog.error, { flag: "--runner-catalog" });

  const buildOutcome = await runBuild({
    implementationPlanPath: parsed.options.implementationPlanPath,
    evidenceRoot: parsed.options.evidenceRoot,
    projectRoot: parsed.options.projectRoot,
    runId: parsed.options.runId,
    runnerCatalog: catalog
  });

  if (!buildOutcome.ok) {
    const reason = typeof buildOutcome.reason === "string" ? buildOutcome.reason : "build_failed";
    const classification = classificationForReason(reason);
    const status = statusForReason(reason);
    let message: string;
    if (reason === "plan_not_approved") {
      message = "Implementation Plan status must be approved before build can run.";
    } else if (reason === "verification_failed_blocks_build") {
      message = `Verification status '${buildOutcome.verificationStatus ?? "unknown"}' blocks the build (DL-10); no Build Result produced.`;
    } else if (reason === "verification_runner_exception") {
      message = "Verification runner rejected the build request.";
    } else if (reason === "build_intake_implementation_plan") {
      message = "Implementation Plan failed public schema validation; build rejects it.";
    } else if (reason === "build_evidence_packet") {
      message = "Verification produced an Evidence Packet that failed schema validation.";
    } else if (reason === "build_result_public_schema") {
      message = "Build Result failed public schema validation.";
    } else {
      message = "Build skill rejected the request.";
    }
    const envelope = makeCreateEnvelope({
      invocation,
      status,
      payload: makePayload("build_result", redactValue({
        ok: false,
        reason,
        planStatus: typeof buildOutcome.planStatus === "string" ? buildOutcome.planStatus : null,
        verificationStatus: typeof buildOutcome.verificationStatus === "string" ? buildOutcome.verificationStatus : null,
        runnerCode: typeof buildOutcome.runnerCode === "string" ? buildOutcome.runnerCode : null
      }) as UnknownRecord),
      diagnostics: [makeDiagnostic({ severity: "error", code: classification === CliClassification.InternalError ? CliErrorCode.InternalError : CliErrorCode.InvalidInvocation, classification, message })],
      errors: [makeCliError({
        code: classification === CliClassification.InternalError ? CliErrorCode.InternalError : CliErrorCode.InvalidInvocation,
        classification,
        retryable: false,
        blocking: status === "blocked",
        message,
        details: redactValue({ reason }) as UnknownRecord
      })]
    });
    return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
  }

  // Green build — persist the Build Result atomically, then validate the persisted carrier.
  const build = (buildOutcome as { value: { buildResult: UnknownRecord; buildResultPath: string; evidencePackets: string[]; harness?: UnknownRecord } }).value;
  const persisted = await persistResult(build.buildResult, { outputRoot: dirname(build.buildResultPath), artifactName: "build-result.json" });
  if (!persisted.ok) {
    const envelope = makeCreateEnvelope({
      invocation,
      status: "failure",
      payload: makePayload("build_result", redactValue({ ok: false, reason: "persist_failed" }) as UnknownRecord),
      diagnostics: [makeDiagnostic({ code: CliErrorCode.InternalError, classification: CliClassification.InternalError, message: "Build Result could not be persisted." })],
      errors: [makeCliError({ code: CliErrorCode.InternalError, classification: CliClassification.InternalError, message: "Build Result could not be persisted.", details: redactValue({ reason: persisted.reason }) as UnknownRecord })]
    });
    return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
  }

  const persistedFilePath = (persisted as { value: { filePath: string } }).value.filePath;
  const persistedValidation = validateArtifactFile(persistedFilePath, { kind: "build_result" });
  if (!persistedValidation.ok) {
    const envelope = makeCreateEnvelope({
      invocation,
      status: "failure",
      payload: makePayload("build_result", redactValue({ ok: false, reason: "persisted_carrier_invalid" }) as UnknownRecord),
      diagnostics: [makeDiagnostic({ code: CliErrorCode.InternalError, classification: CliClassification.InternalError, message: "Persisted Build Result failed schema validation." })],
      errors: [makeCliError({ code: CliErrorCode.InternalError, classification: CliClassification.InternalError, message: "Persisted Build Result failed schema validation.", details: redactValue({ path: persistedFilePath }) as UnknownRecord })]
    });
    return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
  }

  const evidenceDescriptors = (build.evidencePackets ?? []).map((packetPath) => {
    const v = validateArtifactFile(packetPath, { kind: "evidence_packet" });
    return makeArtifactDescriptor({ kind: "evidence_packet", path: packetPath, schemaVersion: "1.0.0", role: "evidence_packet", sha256: v.ok ? sha256File(packetPath) : null });
  });

  const harness = isRecord(build.harness) ? build.harness : {};
  const pendingLive = isRecord(harness.pendingLive) ? harness.pendingLive : null;
  const advisoryDiagnostics: UnknownRecord[] = [];
  if (pendingLive) {
    advisoryDiagnostics.push(makeDiagnostic({
      severity: "warning",
      code: CliErrorCode.UnsupportedOperation,
      classification: CliClassification.UnsupportedOperation,
      message: `Selected-harness live-skill-execution seam is ${String(pendingLive.status)}: missing ${String(pendingLive.prerequisite)} (F1 pending-live; deterministic build remains green).`
    }));
  }

  const buildResultDescriptor = makeArtifactDescriptor({ kind: "build_result", path: persistedFilePath, schemaVersion: "1.0.0", role: "build_result", sha256: sha256File(persistedFilePath) });
  const envelope = makeCreateEnvelope({
    invocation,
    status: "success",
    payload: makePayload("build_result", redactValue({
      ok: true,
      runId: parsed.options.runId,
      buildResultPath: persistedFilePath,
      buildResultArtifactId: build.buildResult.artifactId ?? null,
      evidencePackets: build.evidencePackets,
      harnessDeterministic: isRecord(harness.summary) ? harness.summary.deterministicPath ?? null : null,
      selectedHarnessLiveSeam: pendingLive ? { status: String(pendingLive.status), classification: String(pendingLive.classification) } : null
    }) as UnknownRecord),
    diagnostics: advisoryDiagnostics,
    artifacts: [buildResultDescriptor, ...evidenceDescriptors]
  });
  return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
}

export const buildCommand = Object.freeze({
  id: "build",
  visibility: "implementation",
  description: "Run an approved Implementation Plan through the build skill (hooks → verify → context → evidence → Build Result).",
  run
});

export default buildCommand;
