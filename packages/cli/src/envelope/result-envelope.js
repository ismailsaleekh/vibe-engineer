import { createHash } from "node:crypto";
import { dirname, basename, join } from "node:path";
import { writeFile, rename, rm } from "node:fs/promises";
import {
  CliClassification,
  CliErrorCode,
  EXIT_CODES,
  cliError,
  diagnostic,
} from "../errors/codes.js";

const STABLE_CLASSIFICATIONS = new Set(Object.values(CliClassification));
const STABLE_ERROR_CODES = new Set(Object.values(CliErrorCode));
const DIAGNOSTIC_SEVERITIES = new Set(["info", "warning", "error"]);

export const CLI_RESULT_SCHEMA_VERSION = "vibe-engineer.cli.result.v1";
export const CLI_STATUSES = Object.freeze(["success", "failure", "blocked", "partial"]);

const STATUS_EXIT = Object.freeze({
  success: EXIT_CODES.success,
  failure: null,
  blocked: null,
  partial: EXIT_CODES.partial,
});

const FAILURE_CLASSIFICATION_EXITS = new Map([
  [CliClassification.DeterministicFailure, EXIT_CODES.deterministicFailure],
  [CliClassification.InternalError, EXIT_CODES.internalError],
]);

const BLOCKED_CLASSIFICATION_EXITS = new Map([
  [CliClassification.InvalidInvocation, EXIT_CODES.invalidInvocation],
  [CliClassification.InvalidInput, EXIT_CODES.invalidInvocation],
  [CliClassification.UnsupportedOperation, EXIT_CODES.invalidInvocation],
  [CliClassification.InvalidProject, EXIT_CODES.invalidProjectOrConfig],
  [CliClassification.InvalidConfig, EXIT_CODES.invalidProjectOrConfig],
  [CliClassification.MissingPrerequisite, EXIT_CODES.invalidProjectOrConfig],
  [CliClassification.SafetyPolicyBlock, EXIT_CODES.safetyPolicyBlock],
  [CliClassification.OwnershipConflict, EXIT_CODES.ownershipConflict],
  [CliClassification.WriteConflict, EXIT_CODES.ownershipConflict],
  [CliClassification.ExternalUnavailable, EXIT_CODES.externalUnavailable],
]);

export function exitCodeFor(status, classification = null) {
  if (status === "success") return STATUS_EXIT.success;
  if (status === "partial") return STATUS_EXIT.partial;
  if (status === "failure")
    return FAILURE_CLASSIFICATION_EXITS.get(classification) ?? EXIT_CODES.deterministicFailure;
  if (status === "blocked")
    return BLOCKED_CLASSIFICATION_EXITS.get(classification) ?? EXIT_CODES.invalidInvocation;
  return EXIT_CODES.internalError;
}

export function artifactDescriptor({ kind, path, schemaVersion = null, role, sha256 = null }) {
  return { kind, path, schemaVersion, role, sha256 };
}

export function createEnvelope({
  invocation,
  status,
  payload,
  diagnostics = [],
  artifacts = [],
  errors = [],
  exitCode = null,
}) {
  const primaryClassification =
    errors[0]?.classification ??
    diagnostics.find((item) => item.severity === "error")?.classification ??
    null;
  return {
    schemaVersion: CLI_RESULT_SCHEMA_VERSION,
    invocation,
    status,
    exitCode: exitCode ?? exitCodeFor(status, primaryClassification),
    payload,
    diagnostics,
    artifacts,
    errors,
  };
}

export function payload(kind, data = {}, schemaVersion = "vibe-engineer.cli.payload.v1") {
  return { kind, schemaVersion, data };
}

export function invalidInvocationEnvelope(
  invocation,
  {
    code = CliErrorCode.InvalidInvocation,
    classification = CliClassification.InvalidInvocation,
    message,
    details = {},
  },
) {
  return createEnvelope({
    invocation,
    status: "blocked",
    payload: payload("cli_invocation_error", { accepted: false }),
    diagnostics: [diagnostic({ code, classification, message })],
    errors: [cliError({ code, classification, message, details })],
  });
}

export function internalErrorEnvelope(invocation) {
  const message = "Unexpected internal CLI error.";
  return createEnvelope({
    invocation,
    status: "failure",
    payload: payload("internal_error", { accepted: false }),
    diagnostics: [
      diagnostic({
        code: CliErrorCode.InternalError,
        classification: CliClassification.InternalError,
        message,
      }),
    ],
    errors: [
      cliError({
        code: CliErrorCode.InternalError,
        classification: CliClassification.InternalError,
        message,
      }),
    ],
  });
}

export function configBlockedEnvelope(invocation, configResult) {
  const classification =
    configResult.classification === "missing_config"
      ? CliClassification.MissingPrerequisite
      : CliClassification.InvalidConfig;
  const code =
    configResult.classification === "missing_config"
      ? CliErrorCode.MissingConfig
      : CliErrorCode.InvalidConfig;
  const message =
    configResult.classification === "missing_config"
      ? "Required config file is missing."
      : "Config file is invalid.";
  const diagnostics = (configResult.diagnostics ?? []).map((item) => ({
    severity: "error",
    code,
    classification,
    message,
    path: item.path ?? configResult.configPath ?? null,
    span: null,
    hint: null,
  }));
  return createEnvelope({
    invocation,
    status: "blocked",
    payload: payload("config_load_result", {
      ok: false,
      schemaId: configResult.schemaId ?? null,
      schemaVersion: configResult.schemaVersion ?? null,
      classification,
    }),
    diagnostics:
      diagnostics.length > 0
        ? diagnostics
        : [diagnostic({ code, classification, message, path: configResult.configPath ?? null })],
    errors: [
      cliError({
        code,
        classification,
        message,
        details: {
          issueCodes: (configResult.issues ?? []).map((item) => item.code),
          configPath: configResult.configPath ?? null,
          projectRoot: configResult.projectRoot ?? null,
        },
      }),
    ],
  });
}

export function foundationFailureEnvelope(invocation) {
  const classification = CliClassification.DeterministicFailure;
  const message = "Foundation command reported deterministic failure.";
  return createEnvelope({
    invocation,
    status: "failure",
    payload: payload("foundation_result", { ok: false }),
    diagnostics: [diagnostic({ code: CliErrorCode.FoundationFailure, classification, message })],
    errors: [cliError({ code: CliErrorCode.FoundationFailure, classification, message })],
  });
}

export function partialEnvelope(invocation) {
  const classification = CliClassification.PartialIncomplete;
  const message =
    "Foundation command completed one required scope and left another required scope incomplete.";
  return createEnvelope({
    invocation,
    status: "partial",
    payload: payload("foundation_result", {
      partial: {
        overallDisposition: "not_passed_blocking",
        completedScopes: [
          {
            id: "foundation.scope.completed",
            kind: "foundation_scope",
            required: true,
            artifacts: ["memory://foundation.completed"],
          },
        ],
        incompleteScopes: [
          {
            id: "foundation.scope.incomplete",
            kind: "foundation_scope",
            required: true,
            blocking: true,
            reasonCode: CliErrorCode.PartialIncomplete,
            classification,
            nextAction: "rerun_foundation_scope",
          },
        ],
        resume: {
          allowed: true,
          command: [
            "vibe-engineer",
            "foundation",
            "--status",
            "success",
            "--json",
            "--non-interactive",
          ],
        },
      },
    }),
    diagnostics: [
      diagnostic({
        severity: "error",
        code: CliErrorCode.PartialIncomplete,
        classification,
        message,
      }),
    ],
    errors: [
      cliError({
        code: CliErrorCode.PartialIncomplete,
        classification,
        retryable: true,
        blocking: true,
        message,
        details: { incompleteScopeIds: ["foundation.scope.incomplete"] },
      }),
    ],
  });
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasString(value, key) {
  return typeof value[key] === "string" && value[key].length > 0;
}

function hasNullableString(value, key) {
  return value[key] === null || typeof value[key] === "string";
}

function validateInvocation(invocation, errors) {
  if (!isObject(invocation)) {
    errors.push("invocation must be an object");
    return;
  }
  for (const key of ["id", "command", "startedAt", "endedAt"]) {
    if (!hasString(invocation, key)) errors.push(`invocation.${key} must be a non-empty string`);
  }
  if (!Array.isArray(invocation.argv) || invocation.argv.some((item) => typeof item !== "string"))
    errors.push("invocation.argv must be a string array");
  if (!hasNullableString(invocation, "projectRoot"))
    errors.push("invocation.projectRoot must be string or null");
  if (!hasNullableString(invocation, "configPath"))
    errors.push("invocation.configPath must be string or null");
}

function validatePayload(envelope, errors) {
  if (!isObject(envelope.payload)) {
    errors.push("payload must be an object");
    return;
  }
  if (!hasString(envelope.payload, "kind")) errors.push("payload.kind must be a non-empty string");
  if (!hasString(envelope.payload, "schemaVersion"))
    errors.push("payload.schemaVersion must be a non-empty string");
  if (!isObject(envelope.payload.data)) errors.push("payload.data must be an object");
}

function validateDiagnosticItems(items, path, errors) {
  if (!Array.isArray(items)) {
    errors.push(`${path} must be an array`);
    return;
  }
  for (const [index, item] of items.entries()) {
    if (!isObject(item)) {
      errors.push(`${path}[${index}] must be an object`);
      continue;
    }
    if (!hasString(item, "code")) {
      errors.push(`${path}[${index}].code must be string`);
    } else if (!STABLE_ERROR_CODES.has(item.code)) {
      errors.push(`${path}[${index}].code must be a stable CliErrorCode`);
    }
    if (!hasString(item, "classification")) {
      errors.push(`${path}[${index}].classification must be string`);
    } else if (!STABLE_CLASSIFICATIONS.has(item.classification)) {
      errors.push(`${path}[${index}].classification must be a stable CliClassification`);
    }
    if (
      path === "diagnostics" &&
      (!hasString(item, "severity") || !DIAGNOSTIC_SEVERITIES.has(item.severity))
    )
      errors.push(`${path}[${index}].severity must be a stable severity`);
    if (path === "errors") {
      if (typeof item.retryable !== "boolean")
        errors.push(`${path}[${index}].retryable must be boolean`);
      if (typeof item.blocking !== "boolean")
        errors.push(`${path}[${index}].blocking must be boolean`);
      if (!isObject(item.details)) errors.push(`${path}[${index}].details must be object`);
    }
    if (!hasString(item, "message")) errors.push(`${path}[${index}].message must be string`);
  }
}

function validateArtifacts(items, errors) {
  if (!Array.isArray(items)) {
    errors.push("artifacts must be an array");
    return;
  }
  for (const [index, item] of items.entries()) {
    if (!isObject(item)) {
      errors.push(`artifacts[${index}] must be an object`);
      continue;
    }
    for (const key of ["kind", "path", "role"]) {
      if (!hasString(item, key)) errors.push(`artifacts[${index}].${key} must be string`);
    }
    if (!(item.schemaVersion === null || typeof item.schemaVersion === "string"))
      errors.push(`artifacts[${index}].schemaVersion must be string or null`);
    if (!(item.sha256 === null || typeof item.sha256 === "string"))
      errors.push(`artifacts[${index}].sha256 must be string or null`);
  }
}

function validatePartial(envelope, errors) {
  if (envelope.status !== "partial") return;
  if (envelope.exitCode !== EXIT_CODES.partial) errors.push("partial exitCode must be 8");
  const partial = envelope.payload?.data?.partial;
  if (!isObject(partial)) {
    errors.push("partial requires payload.data.partial object");
    return;
  }
  if (partial.overallDisposition !== "not_passed_blocking")
    errors.push("partial.overallDisposition must be not_passed_blocking");
  if (!Array.isArray(partial.completedScopes) || partial.completedScopes.length === 0)
    errors.push("partial.completedScopes must be non-empty");
  if (!Array.isArray(partial.incompleteScopes) || partial.incompleteScopes.length === 0)
    errors.push("partial.incompleteScopes must be non-empty");
  for (const [index, scope] of (partial.completedScopes ?? []).entries()) {
    if (
      !isObject(scope) ||
      typeof scope.id !== "string" ||
      typeof scope.kind !== "string" ||
      scope.required !== true ||
      !Array.isArray(scope.artifacts) ||
      scope.artifacts.length === 0
    ) {
      errors.push(`partial.completedScopes[${index}] is malformed`);
    }
  }
  const incompleteIds = [];
  for (const [index, scope] of (partial.incompleteScopes ?? []).entries()) {
    if (
      !isObject(scope) ||
      typeof scope.id !== "string" ||
      typeof scope.kind !== "string" ||
      scope.required !== true ||
      scope.blocking !== true ||
      typeof scope.reasonCode !== "string" ||
      scope.classification !== CliClassification.PartialIncomplete
    ) {
      errors.push(`partial.incompleteScopes[${index}] is malformed`);
    } else {
      incompleteIds.push(scope.id);
    }
  }
  if (
    !isObject(partial.resume) ||
    typeof partial.resume.allowed !== "boolean" ||
    (partial.resume.allowed === true &&
      (!Array.isArray(partial.resume.command) ||
        partial.resume.command.some((item) => typeof item !== "string"))) ||
    (partial.resume.allowed === false && partial.resume.command !== null)
  ) {
    errors.push("partial.resume is malformed");
  }
  if (
    !envelope.diagnostics.some(
      (item) =>
        item.severity === "error" && item.classification === CliClassification.PartialIncomplete,
    )
  ) {
    errors.push("partial requires error diagnostic with partial_incomplete classification");
  }
  if (
    !envelope.errors.some(
      (item) =>
        item.classification === CliClassification.PartialIncomplete &&
        item.blocking === true &&
        Array.isArray(item.details?.incompleteScopeIds) &&
        incompleteIds.every((id) => item.details.incompleteScopeIds.includes(id)),
    )
  ) {
    errors.push("partial requires blocking partial_incomplete error with incompleteScopeIds");
  }
}

function validateStatusExit(envelope, errors) {
  if (!CLI_STATUSES.includes(envelope.status)) errors.push("status is invalid");
  if (!Number.isInteger(envelope.exitCode)) errors.push("exitCode must be an integer");
  if (envelope.status === "success" && envelope.exitCode !== 0)
    errors.push("success exitCode must be 0");
  if (envelope.status === "partial" && envelope.exitCode !== 8)
    errors.push("partial exitCode must be 8");
  if (envelope.status === "failure" && ![1, 7].includes(envelope.exitCode))
    errors.push("failure exitCode must be 1 or 7");
  if (envelope.status === "blocked" && ![2, 3, 4, 5, 6].includes(envelope.exitCode))
    errors.push("blocked exitCode must be 2, 3, 4, 5, or 6");
}

function validateNonSuccessEvidence(envelope, errors) {
  if (!["failure", "blocked", "partial"].includes(envelope.status)) return;
  if (!Array.isArray(envelope.errors) || envelope.errors.length === 0) {
    errors.push(`${envelope.status} requires at least one error item`);
  }
  if (
    !Array.isArray(envelope.diagnostics) ||
    !envelope.diagnostics.some(
      (item) =>
        item?.severity === "error" &&
        STABLE_ERROR_CODES.has(item.code) &&
        STABLE_CLASSIFICATIONS.has(item.classification),
    )
  ) {
    errors.push(
      `${envelope.status} requires at least one error-severity diagnostic with stable code/classification`,
    );
  }
}

export function validateCliResultEnvelope(envelope) {
  const errors = [];
  if (!isObject(envelope)) return { ok: false, errors: ["envelope must be an object"] };
  if (envelope.schemaVersion !== CLI_RESULT_SCHEMA_VERSION) errors.push("schemaVersion is invalid");
  validateInvocation(envelope.invocation, errors);
  validateStatusExit(envelope, errors);
  validatePayload(envelope, errors);
  validateDiagnosticItems(envelope.diagnostics, "diagnostics", errors);
  validateArtifacts(envelope.artifacts, errors);
  validateDiagnosticItems(envelope.errors, "errors", errors);
  validateNonSuccessEvidence(envelope, errors);
  validatePartial(envelope, errors);
  return errors.length === 0 ? { ok: true, envelope } : { ok: false, errors };
}

export async function writeResultFileAtomic(resultFile, envelope) {
  const targetDir = dirname(resultFile);
  const tempName = `.${basename(resultFile)}.${process.pid}.${Date.now()}.tmp`;
  const tempPath = join(targetDir, tempName);
  const bytes = `${JSON.stringify(envelope)}\n`;
  try {
    await writeFile(tempPath, bytes, { encoding: "utf8", flag: "wx" });
    await rename(tempPath, resultFile);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export function envelopeBytes(envelope) {
  return `${JSON.stringify(envelope)}\n`;
}

export function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}
