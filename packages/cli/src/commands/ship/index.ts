import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { validateArtifactFile } from "@vibe-engineer/artifacts";
import {
  runShipFromBuildResult,
  persistShipPacket,
  PLAN_REF_RUNNER_CODES,
} from "@vibe-engineer/skills/ship";
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

type ShipOptions = {
  buildResultPath: string;
  evidenceRoot: string;
  projectRoot: string;
  runId: string;
  runnerCatalogPath: string;
  resultFile?: string;
  contextRoot?: string;
};

type ParseResult = { ok: true; options: ShipOptions } | { ok: false; envelope: UnknownRecord };

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
function runShip(options: UnknownRecord): Promise<
  | {
      ok: true;
      shipPacket: UnknownRecord;
      shipPacketPath: string;
      evidencePackets: string[];
      finalVerify: UnknownRecord;
    }
  | {
      ok: false;
      reason: string;
      runnerCode?: string | null;
      verificationStatus?: string;
      driftStatus?: string;
      intakeReason?: string | null;
      buildStatus?: string | null;
    }
> {
  return runShipFromBuildResult(options);
}
function persistPacket(
  shipPacket: UnknownRecord,
  persistence: UnknownRecord,
): Promise<{ ok: true; filePath: string } | { ok: false; reason: string }> {
  return persistShipPacket(shipPacket, persistence);
}

const VALUE_FLAGS = new Set([
  "--build-result",
  "--evidence-root",
  "--project-root",
  "--run-id",
  "--runner-catalog",
  "--result-file",
  "--context-root",
]);

const REQUIRED_FLAGS = new Set([
  "--build-result",
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
    message: `Unsupported ship flag: ${displayFlag}.`,
    details: { flag: displayFlag },
  });
}

function flagProperty(flag: string): keyof ShipOptions | null {
  if (flag === "--build-result") return "buildResultPath";
  if (flag === "--evidence-root") return "evidenceRoot";
  if (flag === "--project-root") return "projectRoot";
  if (flag === "--run-id") return "runId";
  if (flag === "--runner-catalog") return "runnerCatalogPath";
  if (flag === "--result-file") return "resultFile";
  if (flag === "--context-root") return "contextRoot";
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

function parseShipOptions(invocation: CommandInvocation, args: string[]): ParseResult {
  const values = new Map<keyof ShipOptions, string>();
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
          message: "Duplicate ship flag is not allowed.",
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
        envelope: invalidInput(invocation, "Secret-like ship input is not accepted.", {
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
        message: "Unexpected positional arguments for ship.",
        details: { positionalCount: positionals.length },
      }).envelope,
    };
  }

  for (const flag of REQUIRED_FLAGS) {
    const property = flagProperty(flag);
    if (property !== null && !values.has(property)) {
      return {
        ok: false,
        envelope: invalid(invocation, {
          code: CliErrorCode.MissingFlagValue,
          message: "Missing required ship flag.",
          details: { flag },
        }).envelope,
      };
    }
  }

  const runId = values.get("runId") ?? "";
  if (!SAFE_ID.test(runId))
    return {
      ok: false,
      envelope: invalidInput(invocation, "run-id must be a stable lowercase artifact id segment.", {
        flag: "--run-id",
      }).envelope,
    };

  const projectRootRaw = values.get("projectRoot") ?? "";
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
  const buildResult = resolveWithinProject(
    projectRootReal,
    values.get("buildResultPath") ?? "",
    "build result path",
    { mustExist: true, allowProtected: true },
  );
  if (typeof buildResult !== "string")
    return {
      ok: false,
      envelope: invalidInput(invocation, buildResult.error, { flag: "--build-result" }).envelope,
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
  const contextRootRaw = values.get("contextRoot");
  const contextRoot =
    contextRootRaw === undefined
      ? undefined
      : resolveWithinProject(projectRootReal, contextRootRaw, "context root", {
          mustExist: true,
          allowProtected: false,
        });
  if (contextRoot !== undefined && typeof contextRoot !== "string")
    return {
      ok: false,
      envelope: invalidInput(invocation, contextRoot.error, { flag: "--context-root" }).envelope,
    };

  return {
    ok: true,
    options: {
      buildResultPath: buildResult,
      evidenceRoot,
      projectRoot: projectRootReal,
      runId,
      runnerCatalogPath: runnerCatalog,
      ...(typeof resultFile === "string" ? { resultFile } : {}),
      ...(typeof contextRoot === "string" ? { contextRoot } : {}),
    },
  };
}

async function readRunnerCatalog(
  catalogPath: string,
): Promise<UnknownRecord[] | { error: string }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch {
    return { error: "Runner catalog must be a readable JSON file." };
  }
  if (!Array.isArray(parsed) || parsed.some((entry) => !isRecord(entry)))
    return { error: "Runner catalog JSON must be an array of typed runner objects." };
  return parsed as UnknownRecord[];
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function classificationForReason(reason: string, runnerCode?: string | null): string {
  if (
    reason === "ship_final_verify_blocks" ||
    reason === "ship_context_drift_blocks" ||
    reason === "ship_final_verify_no_evidence"
  )
    return CliClassification.DeterministicFailure;
  if (reason === "ship_final_verify_runner_exception") {
    return typeof runnerCode === "string" && PLAN_REF_RUNNER_CODES.has(runnerCode)
      ? CliClassification.InvalidInput
      : CliClassification.DeterministicFailure;
  }
  if (
    reason === "ship_packet_persist_pre_schema" ||
    reason === "ship_packet_persisted_public_schema" ||
    reason === "ship_packet_public_schema" ||
    reason === "ship_evidence_packet" ||
    reason === "ship_runner_catalog"
  )
    return CliClassification.InvalidInput;
  if (
    reason === "ship_intake_build_result_invalid" ||
    reason === "ship_intake_build_result_not_passed" ||
    reason === "ship_intake_build_result_has_blocking_warnings" ||
    reason === "ship_intake_missing_build_result" ||
    reason === "ship_intake_carrier_not_json" ||
    reason === "ship_intake_directory_target" ||
    reason === "ship_intake_path_stat_failed" ||
    reason === "ship_intake_unsafe_path" ||
    reason === "ship_intake_build_result_has_blocking_warnings"
  )
    return CliClassification.InvalidInput;
  if (reason === "ship_final_verify_no_plan_ref") return CliClassification.InvalidInput;
  if (reason === "invalid_ship_options" || reason === "invalid_run_id")
    return CliClassification.InvalidInput;
  return CliClassification.InternalError;
}

function statusForReason(reason: string, runnerCode?: string | null): string {
  if (
    reason === "ship_final_verify_blocks" ||
    reason === "ship_context_drift_blocks" ||
    reason === "ship_final_verify_no_evidence"
  )
    return "failure";
  if (reason === "ship_final_verify_runner_exception") {
    return typeof runnerCode === "string" && PLAN_REF_RUNNER_CODES.has(runnerCode)
      ? "blocked"
      : "failure";
  }
  return "blocked";
}

function messageForReason(outcome: {
  reason: string;
  verificationStatus?: string;
  driftStatus?: string;
  intakeReason?: string | null;
  runnerCode?: string | null;
}): string {
  const reason = outcome.reason;
  if (reason === "ship_final_verify_blocks")
    return `Final verification status '${outcome.verificationStatus ?? "unknown"}' blocks the ship (master §8); no Ship Packet produced.`;
  if (reason === "ship_context_drift_blocks")
    return "Final context-drift check is unresolved; ship is blocked (master §8). No Ship Packet produced.";
  if (reason === "ship_final_verify_no_evidence")
    return "Final verification produced no Evidence Packets; ship cannot proceed.";
  if (reason === "ship_final_verify_runner_exception")
    return `Final verification runner rejected the ship request (code '${outcome.runnerCode ?? "unknown"}').`;
  if (reason === "ship_final_verify_no_plan_ref")
    return "Build Result carries no implementationPlanRef path; final verification cannot run.";
  if (reason === "ship_intake_build_result_not_passed")
    return "Ship intake consumes passed Build Results only.";
  if (reason === "ship_intake_build_result_invalid")
    return "Build Result failed public schema validation; ship intake rejects it.";
  if (reason === "ship_intake_build_result_has_blocking_warnings")
    return "Passed Build Result carries blocking warnings; ship intake refuses it.";
  if (reason && reason.startsWith("ship_intake_")) return "Ship intake rejected the Build Result.";
  if (
    reason === "ship_packet_public_schema" ||
    reason === "ship_packet_persist_pre_schema" ||
    reason === "ship_packet_persisted_public_schema"
  )
    return "Ship Packet failed public schema validation.";
  if (reason === "ship_evidence_packet")
    return "Final-verify Evidence Packet failed schema validation.";
  return "Ship skill rejected the request.";
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
  if (!validation.ok) {
    const invocation = isRecord(finalEnvelope.invocation)
      ? (finalEnvelope.invocation as CommandInvocation)
      : (finalEnvelope.invocation as CommandInvocation);
    return makeCreateEnvelope({
      invocation,
      status: "failure",
      payload: makePayload("internal_error", { accepted: false }),
      diagnostics: [
        makeDiagnostic({
          code: CliErrorCode.InvalidEnvelope,
          classification: CliClassification.InternalError,
          message: "Ship command generated an invalid result envelope.",
        }),
      ],
      errors: [
        makeCliError({
          code: CliErrorCode.InvalidEnvelope,
          classification: CliClassification.InternalError,
          message: "Ship command generated an invalid result envelope.",
          details: redactValue({ validationErrors: validation.errors }) as UnknownRecord,
        }),
      ],
    });
  }
  if (resultFile !== undefined) {
    try {
      await makeWriteResultFileAtomic(resultFile, finalEnvelope);
    } catch {
      const invocation = isRecord(finalEnvelope.invocation)
        ? (finalEnvelope.invocation as CommandInvocation)
        : (finalEnvelope.invocation as CommandInvocation);
      return makeCreateEnvelope({
        invocation,
        status: "blocked",
        payload: makePayload("result_file_error", { resultFile: redactText(resultFile) }),
        diagnostics: [
          makeDiagnostic({
            code: CliErrorCode.ResultFileWriteFailed,
            classification: CliClassification.WriteConflict,
            message: "Result file could not be written atomically.",
            path: redactText(resultFile),
          }),
        ],
        errors: [
          makeCliError({
            code: CliErrorCode.ResultFileWriteFailed,
            classification: CliClassification.WriteConflict,
            message: "Result file could not be written atomically.",
            details: redactValue({ resultFile }) as UnknownRecord,
          }),
        ],
      });
    }
  }
  return finalEnvelope;
}

async function run({ invocation, args }: CommandContext): Promise<{ envelope: UnknownRecord }> {
  const parsed = parseShipOptions(invocation, args);
  if (!parsed.ok) return commandResult(parsed.envelope);
  const catalog = await readRunnerCatalog(parsed.options.runnerCatalogPath);
  if (!Array.isArray(catalog))
    return invalidInput(invocation, catalog.error, { flag: "--runner-catalog" });

  const shipOutcome = await runShip({
    buildResultPath: parsed.options.buildResultPath,
    evidenceRoot: parsed.options.evidenceRoot,
    projectRoot: parsed.options.projectRoot,
    runId: parsed.options.runId,
    runnerCatalog: catalog,
    ...(parsed.options.contextRoot !== undefined
      ? { contextProjectRoot: parsed.options.contextRoot }
      : {}),
  });

  if (!shipOutcome.ok) {
    const reason = typeof shipOutcome.reason === "string" ? shipOutcome.reason : "ship_failed";
    const classification = classificationForReason(reason, shipOutcome.runnerCode ?? undefined);
    const status = statusForReason(reason, shipOutcome.runnerCode ?? undefined);
    const message = messageForReason({
      reason,
      verificationStatus:
        typeof shipOutcome.verificationStatus === "string"
          ? shipOutcome.verificationStatus
          : undefined,
      driftStatus:
        typeof shipOutcome.driftStatus === "string" ? shipOutcome.driftStatus : undefined,
      intakeReason: typeof shipOutcome.intakeReason === "string" ? shipOutcome.intakeReason : null,
      runnerCode: typeof shipOutcome.runnerCode === "string" ? shipOutcome.runnerCode : null,
    });
    const envelope = makeCreateEnvelope({
      invocation,
      status,
      payload: makePayload(
        "ship_packet",
        redactValue({
          ok: false,
          reason,
          verificationStatus:
            typeof shipOutcome.verificationStatus === "string"
              ? shipOutcome.verificationStatus
              : null,
          driftStatus: typeof shipOutcome.driftStatus === "string" ? shipOutcome.driftStatus : null,
          intakeReason:
            typeof shipOutcome.intakeReason === "string" ? shipOutcome.intakeReason : null,
          buildStatus: typeof shipOutcome.buildStatus === "string" ? shipOutcome.buildStatus : null,
          runnerCode: typeof shipOutcome.runnerCode === "string" ? shipOutcome.runnerCode : null,
        }) as UnknownRecord,
      ),
      diagnostics: [
        makeDiagnostic({
          severity: "error",
          code:
            classification === CliClassification.InternalError
              ? CliErrorCode.InternalError
              : status === "failure"
                ? CliErrorCode.FoundationFailure
                : CliErrorCode.InvalidInvocation,
          classification,
          message,
        }),
      ],
      errors: [
        makeCliError({
          code:
            classification === CliClassification.InternalError
              ? CliErrorCode.InternalError
              : status === "failure"
                ? CliErrorCode.FoundationFailure
                : CliErrorCode.InvalidInvocation,
          classification,
          retryable: false,
          blocking: status === "blocked",
          message,
          details: redactValue({ reason }) as UnknownRecord,
        }),
      ],
    });
    return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
  }

  // Green ship — persist the Ship Packet atomically, then validate the persisted carrier.
  const ship = (
    shipOutcome as {
      value: { shipPacket: UnknownRecord; shipPacketPath: string; evidencePackets: string[] };
    }
  ).value;
  const shipPacket = ship.shipPacket;
  const shipPacketPathHint = ship.shipPacketPath;
  const evidencePackets = ship.evidencePackets;
  const persisted = await persistPacket(shipPacket, {
    outputRoot: dirname(shipPacketPathHint),
    artifactName: "ship-packet.json",
  });
  if (!persisted.ok) {
    const envelope = makeCreateEnvelope({
      invocation,
      status: "failure",
      payload: makePayload(
        "ship_packet",
        redactValue({ ok: false, reason: "persist_failed" }) as UnknownRecord,
      ),
      diagnostics: [
        makeDiagnostic({
          code: CliErrorCode.InternalError,
          classification: CliClassification.InternalError,
          message: "Ship Packet could not be persisted.",
        }),
      ],
      errors: [
        makeCliError({
          code: CliErrorCode.InternalError,
          classification: CliClassification.InternalError,
          message: "Ship Packet could not be persisted.",
          details: redactValue({ reason: persisted.reason }) as UnknownRecord,
        }),
      ],
    });
    return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
  }

  const persistedFilePath = (persisted as { value: { filePath: string } }).value.filePath;
  const persistedValidation = validateArtifactFile(persistedFilePath, { kind: "ship_packet" });
  if (!persistedValidation.ok) {
    const envelope = makeCreateEnvelope({
      invocation,
      status: "failure",
      payload: makePayload(
        "ship_packet",
        redactValue({ ok: false, reason: "persisted_carrier_invalid" }) as UnknownRecord,
      ),
      diagnostics: [
        makeDiagnostic({
          code: CliErrorCode.InternalError,
          classification: CliClassification.InternalError,
          message: "Persisted Ship Packet failed schema validation.",
        }),
      ],
      errors: [
        makeCliError({
          code: CliErrorCode.InternalError,
          classification: CliClassification.InternalError,
          message: "Persisted Ship Packet failed schema validation.",
          details: redactValue({ path: persistedFilePath }) as UnknownRecord,
        }),
      ],
    });
    return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
  }

  // W5 — re-assert the no-push/no-commit/no-PR invariant on the persisted carrier.
  const persistedPacket = persistedValidation.artifact as UnknownRecord;
  const commitPrep = isRecord(persistedPacket.commitPreparation)
    ? persistedPacket.commitPreparation
    : {};
  const prPrep = isRecord(persistedPacket.prPreparation) ? persistedPacket.prPreparation : {};
  const invariantOk =
    persistedPacket.noPushWithoutApproval === true &&
    commitPrep.commitPerformedByAgent === false &&
    prPrep.prOpenedByAgent === false;
  if (!invariantOk) {
    const envelope = makeCreateEnvelope({
      invocation,
      status: "failure",
      payload: makePayload(
        "ship_packet",
        redactValue({ ok: false, reason: "no_push_invariant_violation" }) as UnknownRecord,
      ),
      diagnostics: [
        makeDiagnostic({
          code: CliErrorCode.InternalError,
          classification: CliClassification.InternalError,
          message: "Persisted Ship Packet violated the no-push/no-commit/no-PR invariant.",
        }),
      ],
      errors: [
        makeCliError({
          code: CliErrorCode.InternalError,
          classification: CliClassification.InternalError,
          message: "Persisted Ship Packet violated the no-push/no-commit/no-PR invariant.",
          details: redactValue({ path: persistedFilePath }) as UnknownRecord,
        }),
      ],
    });
    return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
  }

  const evidenceDescriptors = (evidencePackets ?? []).map((packetPath) => {
    const v = validateArtifactFile(packetPath, { kind: "evidence_packet" });
    return makeArtifactDescriptor({
      kind: "evidence_packet",
      path: packetPath,
      schemaVersion: "1.0.0",
      role: "evidence_packet",
      sha256: v.ok ? sha256File(packetPath) : null,
    });
  });

  const shipPacketDescriptor = makeArtifactDescriptor({
    kind: "ship_packet",
    path: persistedFilePath,
    schemaVersion: "1.0.0",
    role: "ship_packet",
    sha256: sha256File(persistedFilePath),
  });
  const envelope = makeCreateEnvelope({
    invocation,
    status: "success",
    payload: makePayload(
      "ship_packet",
      redactValue({
        ok: true,
        runId: parsed.options.runId,
        shipPacketPath: persistedFilePath,
        shipPacketArtifactId: shipPacket.artifactId ?? null,
        shipPacketStatus: persistedPacket.status ?? null,
        noPushWithoutApproval: true,
        commitPerformedByAgent: false,
        prOpenedByAgent: false,
        evidencePackets,
        selectedHarnessLiveSeam: null,
      }) as UnknownRecord,
    ),
    diagnostics: [],
    artifacts: [shipPacketDescriptor, ...evidenceDescriptors],
  });
  return commandResult(await finalizeEnvelope(envelope, parsed.options.resultFile));
}

export const shipCommand = Object.freeze({
  id: "ship",
  visibility: "implementation",
  description:
    "Turn a passed Build Result into a schema-valid Ship Packet after final verification + context-drift check (no push/commit/PR).",
  run,
});

export default shipCommand;
