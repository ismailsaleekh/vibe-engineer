// @ts-check
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  validateArtifactFile,
  validateArtifact,
  validateArtifactKind,
} from "@vibe-engineer/artifacts";

export const VERIFICATION_RUNNER_VERSION = "0.1.0";

export const VERIFICATION_STATUSES = Object.freeze({
  PASSED: "passed",
  FAILED: "failed",
  BLOCKED: "blocked",
  ADVISORY_WARNING: "advisory_warning",
});

export const VERIFICATION_STATUS_VALUES = Object.freeze(Object.values(VERIFICATION_STATUSES));

export const EVIDENCE_RESULTS = Object.freeze({
  PASS: "pass",
  FAIL: "fail",
  BLOCKED: "blocked",
  ADVISORY: "advisory",
  SKIPPED: "skipped",
});

export const EVIDENCE_FAILURE_CLASSIFICATIONS = Object.freeze({
  DETERMINISTIC_PRODUCT_OR_CODE_FAILURE: "deterministic_product_or_code_failure",
  SCHEMA_OR_CONTRACT_FAILURE: "schema_or_contract_failure",
  SAFETY_OR_SECURITY_POLICY_FAILURE: "safety_or_security_policy_failure",
  MECHANICAL_GATE_FAILURE: "mechanical_gate_failure",
  TEST_ASSERTION_FAILURE: "test_assertion_failure",
  TEST_BUG: "test_bug",
  ENVIRONMENT_ISSUE: "environment_issue",
  TIMING_OR_FLAKY_SUSPICION: "timing_or_flaky_suspicion",
  EXTERNAL_DEPENDENCY_DRIFT: "external_dependency_drift",
  ADVISORY_FINDING: "advisory_finding",
  MISSING_EVIDENCE: "missing_evidence",
  MISSING_RUNNER_OR_PREREQUISITE: "missing_runner_or_prerequisite",
  SKIPPED_REQUIRED_DELTA_CATEGORY: "skipped_required_delta_category",
  BLOCKED_PREREQUISITE: "blocked_prerequisite",
  RUNNER_INTERNAL_ERROR: "runner_internal_error",
  CLASSIFICATION_UNKNOWN: "classification_unknown",
});

export const EVIDENCE_FAILURE_CLASSIFICATION_VALUES = Object.freeze(
  Object.values(EVIDENCE_FAILURE_CLASSIFICATIONS),
);

const REQUIRED_OPTION_KEYS = Object.freeze([
  "implementationPlanPath",
  "evidenceRoot",
  "projectRoot",
  "runId",
  "runnerCatalog",
]);
const OPTIONAL_OPTION_KEYS = Object.freeze(["rerunOf"]);
const ALLOWED_OPTION_KEYS = new Set([...REQUIRED_OPTION_KEYS, ...OPTIONAL_OPTION_KEYS]);
const DELTA_ACTIONS = new Set(["add", "update", "reuse", "not_applicable", "blocked"]);
const RUNNER_KINDS = new Set(["command", "validator"]);
const EVIDENCE_CLASSES = new Set(["deterministic", "advisory", "informational"]);
const ALLOWED_COMMAND_CLASSIFICATIONS = new Set(["read_only", "local_deterministic_write"]);
export const PORTABLE_NODE_RUNTIME_COMMAND = "vibe-engineer:node";
const MAX_TIMEOUT_MS = 30000;
const MAX_STREAM_BYTES = 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: false });
const LAYERS = new Set([
  "safety_hooks",
  "typecheck",
  "lint_format",
  "mechanical_gate",
  "unit",
  "integration",
  "contract_adapter",
  "e2e",
  "ui_verification",
  "ai_eval",
  "build_package",
  "context_drift",
  "observability",
  "advisory_review",
  "final_dod",
  "schema_validation",
]);
const PROTECTED_RELATIVE_PREFIXES = Object.freeze([
  ".git",
  ".github",
  "scripts",
  "infra",
  "docs",
  "packages/cli/src",
  "packages/artifacts",
  "packages/orchestration",
]);
const PROTECTED_RELATIVE_FILES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".npmrc",
  "turbo.json",
]);
const SECRET_KEY_PARTS = Object.freeze([
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
]);
const NODE_EVAL_ARGS = new Set(["-e", "--eval", "-p", "--print"]);

export class VerificationRunnerError extends Error {
  /** @param {string} code @param {string} message @param {unknown} [details] */
  constructor(code, message, details = undefined) {
    super(redactText(message));
    this.name = "VerificationRunnerError";
    this.code = code;
    this.details = redactValue(details);
  }
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @param {unknown} value @returns {string} */
function stringValue(value) {
  return typeof value === "string" ? value : "";
}

/** @param {string} input @returns {string} */
function safeId(input) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9.:-]+/g, "-")
      .replace(/^-+/, "x-")
      .replace(/-+$/, "") || "x"
  );
}

/** @param {string} value @returns {boolean} */
function isSecretLikeKey(value) {
  const normalized = value.toLowerCase().replaceAll("_", "-");
  return SECRET_KEY_PARTS.some(
    (part) =>
      normalized === part ||
      normalized.includes(`-${part}`) ||
      normalized.includes(`${part}-`) ||
      normalized.includes(part),
  );
}

/** @param {string} text @returns {string} */
function redactText(text) {
  let out = text;
  out = out.replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer <redacted>");
  out = out.replace(
    /([A-Za-z0-9_.-]*(?:token|password|passphrase|secret|apikey|api-key|credential|client-secret)[A-Za-z0-9_.-]*\s*=\s*)([^\s,;"']+)/gi,
    "$1<redacted>",
  );
  out = out.replace(
    /(--(?:token|auth-token|access-token|password|passphrase|secret|api-key|apikey|credential|credentials|client-secret)(?:=|\s+))([^\s]+)/gi,
    "$1<redacted>",
  );
  out = out.replace(/\bSECRET[_A-Z0-9-]*\b/g, "<redacted>");
  out = out.replace(
    /\b[A-Z0-9_]*(?:TOKEN|PASSWORD|PASSPHRASE|SECRET|APIKEY|API_KEY|CREDENTIAL|CLIENT_SECRET)[A-Z0-9_]*\b/g,
    "<redacted>",
  );
  return out;
}

/** @param {string} value @returns {boolean} */
function isSecretLikeValue(value) {
  const trimmed = value.trim();
  if (trimmed === "") return false;
  if (redactText(trimmed) !== trimmed) return true;
  if (/^(?:sk|ghp|gho|github_pat|xox[baprs])-?[A-Za-z0-9_=-]{12,}$/i.test(trimmed)) return true;
  return false;
}

/** @param {string} arg @returns {string} */
function redactCommandArg(arg) {
  return isSecretLikeValue(arg) ? "<redacted>" : redactText(arg);
}

/** @param {unknown} value @returns {unknown} */
function redactValue(value) {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (isRecord(value)) {
    /** @type {Record<string, unknown>} */
    const result = {};
    for (const [key, entry] of Object.entries(value))
      result[key] = isSecretLikeKey(key) ? "<redacted>" : redactValue(entry);
    return result;
  }
  return value;
}

/** @param {string} root @returns {string} */
function realRoot(root) {
  const resolved = path.resolve(root);
  return fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
}

/** @param {string} parent @param {string} child @returns {boolean} */
function isContained(parent, child) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** @param {string} projectRoot @param {string} absPath @returns {string} */
function projectRelative(projectRoot, absPath) {
  return path.relative(projectRoot, absPath).replaceAll(path.sep, "/");
}

/** @param {string} projectRoot @param {string} absPath @returns {boolean} */
function isProtectedProjectPath(projectRoot, absPath) {
  const rel = projectRelative(projectRoot, absPath);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return false;
  if (PROTECTED_RELATIVE_FILES.has(rel)) return true;
  return PROTECTED_RELATIVE_PREFIXES.some(
    (prefix) => rel === prefix || rel.startsWith(`${prefix}/`),
  );
}

/** @param {string} root @param {string} candidate @param {string} label @returns {string} */
function resolveContained(root, candidate, label) {
  if (candidate.trim() === "")
    throw new VerificationRunnerError("INVALID_PATH", `${label} must be a non-empty path.`);
  const rootReal = realRoot(root);
  const resolved = path.resolve(rootReal, candidate);
  const existing = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
  const parent = fs.existsSync(resolved) ? path.dirname(existing) : path.dirname(resolved);
  const parentReal = fs.existsSync(parent) ? fs.realpathSync(parent) : parent;
  if (
    !isContained(rootReal, existing) ||
    (existing !== rootReal && !isContained(rootReal, parentReal))
  )
    throw new VerificationRunnerError(
      "PATH_CONTAINMENT_DENIED",
      `${label} escapes its declared root.`,
      { root: rootReal, candidate },
    );
  return resolved;
}

/** @param {string} pathValue @param {string} base @returns {string} */
function resolveMaybeRelative(pathValue, base) {
  return path.isAbsolute(pathValue) ? path.resolve(pathValue) : path.resolve(base, pathValue);
}

/** @param {string} root @param {string} absPath @returns {boolean} */
function isRealPathContained(root, absPath) {
  const rootReal = realRoot(root);
  const resolved = path.resolve(absPath);
  const existing = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
  if (existing === rootReal) return true;
  const parent = fs.existsSync(resolved) ? path.dirname(existing) : path.dirname(resolved);
  const parentReal = fs.existsSync(parent) ? fs.realpathSync(parent) : parent;
  return isContained(rootReal, existing) && isContained(rootReal, parentReal);
}

/** @param {string} absPath @returns {boolean} */
function existingPathIsSymlink(absPath) {
  try {
    return fs.lstatSync(absPath).isSymbolicLink();
  } catch {
    return false;
  }
}

/** @param {string} arg @returns {boolean} */
function argLooksLikeSecretFlag(arg) {
  const flag = arg.replace(/^--?/, "").split("=")[0] || "";
  return arg.startsWith("-") && isSecretLikeKey(flag);
}

/** @param {string} kind @param {string} value @returns {boolean} */
function validateTypedScalar(kind, value) {
  if (isSecretLikeValue(value)) return false;
  if (kind === "positive_integer" || kind === "duration_ms" || kind === "byte_count")
    return /^[1-9][0-9]{0,8}$/.test(value);
  if (kind === "public_literal")
    return /^[A-Za-z0-9._:=-]{1,128}$/.test(value) && !argLooksLikeSecretFlag(value);
  return false;
}

/** @param {Record<string, unknown>} spec @param {Record<string, unknown>} safety @returns {{ok:true,typedIndexes:Set<number>}|{ok:false,code:string,message:string}} */
function validateTypedArgPolicy(spec, safety) {
  const args = Array.isArray(spec.args) ? spec.args.map(String) : [];
  /** @type {Set<number>} */
  const typedIndexes = new Set();
  const argPaths = spec.argPaths;
  if (argPaths !== undefined) {
    if (!Array.isArray(argPaths) || argPaths.some((entry) => !isRecord(entry)))
      return {
        ok: false,
        code: "UNSAFE_PATH",
        message: "argPaths must be typed objects when present.",
      };
    for (const entry of argPaths) {
      const index = entry.index;
      if (!Number.isInteger(index) || Number(index) < 0 || Number(index) >= args.length)
        return {
          ok: false,
          code: "UNSAFE_PATH",
          message: "argPaths entries require an in-range integer index.",
        };
      typedIndexes.add(Number(index));
    }
  }
  const publicArgs = Array.isArray(spec.publicArgs)
    ? spec.publicArgs
    : Array.isArray(safety.publicArgs)
      ? safety.publicArgs
      : [];
  for (const entry of publicArgs) {
    if (!isRecord(entry) || !Number.isInteger(entry.index) || typeof entry.value !== "string")
      return {
        ok: false,
        code: "COMMAND_POLICY_DENIED",
        message: "publicArgs entries require index and exact value.",
      };
    const index = Number(entry.index);
    if (
      index < 0 ||
      index >= args.length ||
      args[index] !== entry.value ||
      isSecretLikeValue(entry.value) ||
      argLooksLikeSecretFlag(entry.value)
    )
      return {
        ok: false,
        code: "COMMAND_POLICY_DENIED",
        message: "publicArgs entry does not match a safe exact argv value.",
      };
    typedIndexes.add(index);
  }
  const scalarArgs = Array.isArray(spec.scalarArgs)
    ? spec.scalarArgs
    : Array.isArray(safety.scalarArgs)
      ? safety.scalarArgs
      : [];
  for (const entry of scalarArgs) {
    if (!isRecord(entry) || !Number.isInteger(entry.index) || typeof entry.kind !== "string")
      return {
        ok: false,
        code: "COMMAND_POLICY_DENIED",
        message: "scalarArgs entries require index and kind.",
      };
    const index = Number(entry.index);
    if (index < 0 || index >= args.length || !validateTypedScalar(entry.kind, args[index] || ""))
      return {
        ok: false,
        code: "COMMAND_POLICY_DENIED",
        message: "scalarArgs entry does not match a safe typed scalar argv value.",
      };
    typedIndexes.add(index);
  }
  for (const [index, arg] of args.entries()) {
    if (isSecretLikeValue(arg) || argLooksLikeSecretFlag(arg))
      return {
        ok: false,
        code: "COMMAND_POLICY_DENIED",
        message: "Secret-like command argv is denied before spawn.",
      };
    if (NODE_EVAL_ARGS.has(arg))
      return {
        ok: false,
        code: "COMMAND_POLICY_DENIED",
        message: "Node inline eval/print argv is denied before spawn.",
      };
    if (!typedIndexes.has(index))
      return {
        ok: false,
        code: "COMMAND_POLICY_DENIED",
        message:
          "Every command argv value must be declared as a typed path, public literal, or narrow non-secret scalar.",
      };
  }
  return { ok: true, typedIndexes };
}

/** @param {unknown} options @returns {{implementationPlanPath:string,evidenceRoot:string,projectRoot:string,runId:string,runnerCatalog:Record<string,unknown>[],rerunOf?:string}} */
function parseOptions(options) {
  if (!isRecord(options))
    throw new VerificationRunnerError(
      "INVALID_OPTIONS",
      "runVerificationPlan options must be a plain object.",
    );
  for (const key of Object.keys(options)) {
    if (!ALLOWED_OPTION_KEYS.has(key))
      throw new VerificationRunnerError("INVALID_OPTIONS", `Unknown option field ${key}.`);
  }
  for (const key of REQUIRED_OPTION_KEYS) {
    if (!(key in options))
      throw new VerificationRunnerError("INVALID_OPTIONS", `Missing required option field ${key}.`);
  }
  const implementationPlanPath = stringValue(options.implementationPlanPath);
  const evidenceRoot = stringValue(options.evidenceRoot);
  const projectRoot = stringValue(options.projectRoot);
  const runId = stringValue(options.runId);
  if (!implementationPlanPath || !evidenceRoot || !projectRoot || !runId)
    throw new VerificationRunnerError(
      "INVALID_OPTIONS",
      "Path and runId options must be non-empty strings.",
    );
  if (!/^[a-z0-9][a-z0-9._:-]*$/.test(runId))
    throw new VerificationRunnerError(
      "INVALID_OPTIONS",
      "runId must be a stable lowercase artifact id segment.",
    );
  if (
    !Array.isArray(options.runnerCatalog) ||
    options.runnerCatalog.some((entry) => !isRecord(entry))
  )
    throw new VerificationRunnerError(
      "INVALID_OPTIONS",
      "runnerCatalog must be an array of typed runner objects.",
    );
  const rerunOf = options.rerunOf === undefined ? undefined : stringValue(options.rerunOf);
  if (options.rerunOf !== undefined && (!rerunOf || !/^[a-z0-9][a-z0-9._:-]*$/.test(rerunOf)))
    throw new VerificationRunnerError(
      "INVALID_OPTIONS",
      "rerunOf must be a stable artifact id when present.",
    );
  return {
    implementationPlanPath,
    evidenceRoot,
    projectRoot,
    runId,
    runnerCatalog: /** @type {Record<string, unknown>[]} */ (options.runnerCatalog),
    ...(rerunOf === undefined ? {} : { rerunOf }),
  };
}

/** @param {unknown} value @param {string} key @returns {string} */
function requireString(value, key) {
  if (typeof value !== "string" || value.length === 0)
    throw new VerificationRunnerError("INVALID_RUNNER_SPEC", `${key} must be a non-empty string.`);
  return value;
}

/** @param {unknown} value @param {string} key @returns {boolean} */
function requireBoolean(value, key) {
  if (typeof value !== "boolean")
    throw new VerificationRunnerError("INVALID_RUNNER_SPEC", `${key} must be boolean.`);
  return value;
}

/** @param {Record<string, unknown>} spec @returns {Record<string, unknown>} */
function normalizeRunnerSpec(spec) {
  const kind = requireString(spec.kind, "runner.kind");
  if (!RUNNER_KINDS.has(kind))
    throw new VerificationRunnerError(
      "INVALID_RUNNER_SPEC",
      "runner.kind must be command or validator.",
    );
  const layer = requireString(spec.layer, "runner.layer");
  if (!LAYERS.has(layer))
    throw new VerificationRunnerError(
      "INVALID_RUNNER_SPEC",
      `runner.layer is not a Verification Delta layer: ${layer}.`,
    );
  const evidenceClass = requireString(spec.evidenceClass, "runner.evidenceClass");
  if (!EVIDENCE_CLASSES.has(evidenceClass))
    throw new VerificationRunnerError("INVALID_RUNNER_SPEC", "runner.evidenceClass is invalid.");
  const blocking = requireBoolean(spec.blocking, "runner.blocking");
  const id = requireString(spec.id, "runner.id");
  return { ...spec, id, layer, evidenceClass, blocking, kind };
}

/** @param {unknown} value @returns {string[]} */
function stringArrayValue(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}

/** @param {Record<string, unknown>} spec @param {number} index @returns {string} */
function runnerIdForDiagnostics(spec, index) {
  return typeof spec.id === "string" && spec.id.length > 0 ? spec.id : `catalog[${index}]`;
}

/** @param {Record<string, unknown>} item @param {boolean} fallback @returns {boolean} */
function requiredItemBlocking(item, fallback) {
  return typeof item.blocking === "boolean" ? item.blocking : fallback;
}

/** @param {Record<string, unknown>[]} catalog @param {Record<string, unknown>} item @returns {Record<string, unknown>[]} */
function describeCatalogCandidates(catalog, item) {
  const itemId = stringValue(item.id);
  const itemLayer = stringValue(item.layer);
  return catalog.map((spec, index) => {
    const id = runnerIdForDiagnostics(spec, index);
    const layer = stringValue(spec.layer);
    const requiredItemIds = stringArrayValue(spec.requiredItemIds);
    const matchesLayer = layer === itemLayer;
    const matchesRequiredItem =
      id === itemId || id === `${itemLayer}:${itemId}` || requiredItemIds.includes(itemId);
    return {
      id,
      layer: layer || null,
      kind: stringValue(spec.kind) || null,
      requiredItemIds,
      matchesLayer,
      matchesRequiredItem,
      selectedByResolver: matchesLayer && matchesRequiredItem,
    };
  });
}

/** @param {Record<string, unknown>[]} catalog @param {Record<string, unknown>} item @returns {string[]} */
function candidateRunnerIdsChecked(catalog, item) {
  return describeCatalogCandidates(catalog, item).map((entry) => String(entry.id));
}

/** @param {Record<string, unknown>} item @returns {Record<string, unknown>} */
function suggestedRunnerCatalogEntryShape(item) {
  const itemId = requireString(item.id, "requiredItem.id");
  const layer = requireString(item.layer, "requiredItem.layer");
  const itemBlocking = requiredItemBlocking(item, true);
  const evidenceClass = itemBlocking ? "deterministic" : "advisory";
  return {
    id: itemId,
    requiredItemIds: [itemId],
    layer,
    evidenceClass,
    blocking: itemBlocking,
    kind: "command",
    command: "<absolute path to the active Node.js executable>",
    args: ["<projectRoot-contained runner .mjs>", "<evidenceRoot-contained output artifact>"],
    cwd: ".",
    expectedArtifacts: ["<evidenceRoot-contained output artifact>"],
    argPaths: [
      { index: 0, root: "projectRoot" },
      { index: 1, root: "evidenceRoot" },
    ],
    safety: {
      classification: "local_deterministic_write",
      timeoutMs: "<positive integer <= 30000>",
      maxStdoutBytes: "<positive integer <= 1048576>",
      maxStderrBytes: "<positive integer <= 1048576>",
      maxOutputBytes: "<positive integer <= 2097152>",
      allowedWriteRoots: ["<evidenceRoot or explicitly allowed project subdir>"],
      envAllowlist: [],
      passThroughEnv: false,
    },
  };
}

/** @param {Record<string, unknown>} item @param {string} code @param {string} reason @returns {string} */
function defaultNextAction(item, code, reason) {
  const itemId = requireString(item.id, "requiredItem.id");
  const layer = requireString(item.layer, "requiredItem.layer");
  const action = requireString(item.action, "requiredItem.action");
  if (code === "MISSING_RUNNER_OR_PREREQUISITE")
    return `Register or repair an executable runner catalog entry for item ${itemId} on layer ${layer}; use requiredItemIds:["${itemId}"] and ensure the runner prerequisite exists. Reason: ${reason}`;
  if (code === "MISSING_EVIDENCE")
    return `Update the runner for item ${itemId} to create the declared expected artifact, or correct expectedArtifacts to the actual evidence path. Reason: ${reason}`;
  if (action === "reuse")
    return `Keep item ${itemId} action=reuse only when prior validated evidence is intentionally reused; otherwise change the item to add/update and register an executable runner.`;
  if (action === "not_applicable")
    return `Keep item ${itemId} action=not_applicable only when layer ${layer} truly does not apply; otherwise change the item to add/update and register an executable runner.`;
  if (action === "blocked")
    return `Resolve the prerequisite for item ${itemId} or keep action=blocked with an exact blockedBy reason before rerunning verification.`;
  return `Review item ${itemId} (${action}) and provide executable runner evidence before treating verification as complete.`;
}

/** @param {{item:Record<string,unknown>,status:string,result:string,packetBlocking:boolean,classification:string,code:string,reason:string,candidateRunnerIdsChecked?:string[],candidateRunnersChecked?:Record<string,unknown>[],matchedRunnerIds?:string[],selectedRunnerId?:string|null,missingPath?:string|null,suggestedNextAction?:string,suggestedRunnerCatalogEntry?:Record<string,unknown>,manualEvidenceAllowed?:boolean}} input @returns {Record<string, unknown>} */
function makeItemDiagnostic(input) {
  const itemId = requireString(input.item.id, "requiredItem.id");
  const layer = requireString(input.item.layer, "requiredItem.layer");
  const action = requireString(input.item.action, "requiredItem.action");
  const itemBlocking = requiredItemBlocking(input.item, input.packetBlocking);
  const reason = redactText(input.reason);
  const diagnostic = {
    schemaVersion: "1.0.0",
    itemId,
    layer,
    action,
    blocking: itemBlocking,
    packetBlocking: input.packetBlocking,
    status: input.status,
    result: input.result,
    code: input.code,
    classification: input.classification,
    candidateRunnerIdsChecked: input.candidateRunnerIdsChecked || [],
    candidateRunnersChecked: input.candidateRunnersChecked || [],
    matchedRunnerIds: input.matchedRunnerIds || [],
    selectedRunnerId: input.selectedRunnerId || null,
    missingPath: input.missingPath || null,
    reason,
    missingRegistryReason:
      input.code === "MISSING_RUNNER_OR_PREREQUISITE" && !(input.missingPath || "")
        ? reason
        : null,
    missingPrerequisiteReason:
      input.code === "MISSING_RUNNER_OR_PREREQUISITE" && (input.missingPath || "")
        ? reason
        : null,
    suggestedNextAction:
      input.suggestedNextAction || defaultNextAction(input.item, input.code, reason),
    suggestedRunnerCatalogEntry:
      input.suggestedRunnerCatalogEntry || suggestedRunnerCatalogEntryShape(input.item),
    manualEvidenceAllowed: Boolean(input.manualEvidenceAllowed),
  };
  return /** @type {Record<string, unknown>} */ (redactValue(diagnostic));
}

/** @param {Record<string, unknown>} diagnostic @returns {string} */
function itemDiagnosticSummary(diagnostic) {
  return redactText(
    `Verification item ${String(diagnostic.itemId)} layer=${String(diagnostic.layer)} action=${String(diagnostic.action)} blocking=${String(diagnostic.blocking)} status=${String(diagnostic.status)} result=${String(diagnostic.result)} code=${String(diagnostic.code)} reason=${String(diagnostic.reason)} candidates=${JSON.stringify(diagnostic.candidateRunnerIdsChecked)} next=${String(diagnostic.suggestedNextAction)}`,
  );
}

/** @param {Record<string, unknown>[]} catalog @param {Record<string, unknown>} item @returns {Record<string, unknown>[]} */
function resolveRunners(catalog, item) {
  const itemId = requireString(item.id, "requiredItem.id");
  const itemLayer = requireString(item.layer, "requiredItem.layer");
  return catalog.map(normalizeRunnerSpec).filter((spec) => {
    if (spec.layer !== itemLayer) return false;
    if (spec.id === itemId || spec.id === `${itemLayer}:${itemId}`) return true;
    const ids = spec.requiredItemIds;
    return (
      Array.isArray(ids) && ids.every((entry) => typeof entry === "string") && ids.includes(itemId)
    );
  });
}

/** @param {string} evidenceRoot @param {Record<string, unknown>} packet @returns {Promise<string>} */
async function persistEvidencePacket(evidenceRoot, packet) {
  const finalName = `${String(packet.artifactId)}.json`.replaceAll(":", "_");
  const finalPath = resolveContained(evidenceRoot, finalName, "Evidence Packet final path");
  const dir = path.dirname(finalPath);
  await fsp.mkdir(dir, { recursive: true });
  const validation = validateArtifactKind("evidence_packet", packet);
  if (!validation.ok)
    throw new VerificationRunnerError(
      "MALFORMED_EVIDENCE_PACKET",
      "Evidence Packet candidate failed schema validation.",
      { artifactId: packet.artifactId, errors: validation.errors },
    );
  const tempPath = path.join(
    dir,
    `.${path.basename(finalPath, ".json")}.${process.pid}.${Date.now()}.tmp.json`,
  );
  try {
    await fsp.writeFile(tempPath, `${JSON.stringify(packet, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    const fileValidation = validateArtifactFile(tempPath, { kind: "evidence_packet" });
    if (!fileValidation.ok)
      throw new VerificationRunnerError(
        "MALFORMED_EVIDENCE_PACKET",
        "Persisted temp Evidence Packet failed file validation.",
        fileValidation.errors,
      );
    await fsp.rename(tempPath, finalPath);
    return finalPath;
  } catch (error) {
    await fsp.rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

/** @param {{runId:string,index:number,item:Record<string,unknown>,plan:Record<string,unknown>,implementationPlanPath:string,projectRoot:string,evidenceRoot:string,startedAt:string,endedAt:string,evidenceClass:string,layer:string,commandOrTool:Record<string,unknown>,status:string,result:string,blocking:boolean,artifacts:string[],warnings:string[],failureDetails?:Record<string,unknown>,rerunOf?:string,stdoutRef?:string,stderrRef?:string,logsRef?:string,normalizationNotes?:string,runnerResolution?:Record<string,unknown>,itemDiagnostic?:Record<string,unknown>}} data @returns {Record<string,unknown>} */
function makePacket(data) {
  const itemId = requireString(data.item.id, "requiredItem.id");
  const itemLayer = requireString(data.item.layer, "requiredItem.layer");
  const itemAction = requireString(data.item.action, "requiredItem.action");
  const itemBlocking = requiredItemBlocking(data.item, data.blocking);
  const artifactId = `evidence:${safeId(data.runId)}:${safeId(itemId)}:${String(data.index).padStart(2, "0")}`;
  const planId = requireString(data.plan.artifactId, "plan.artifactId");
  const delta = isRecord(data.plan.verificationDelta) ? data.plan.verificationDelta : {};
  const packet = {
    schemaVersion: "1.0.0",
    artifactKind: "evidence_packet",
    artifactId,
    title: `Verification evidence for ${itemId}`,
    createdAt: data.endedAt,
    updatedAt: data.endedAt,
    producer: {
      kind: "verification_runner",
      id: "i-09a-runner-core",
      name: "@vibe-engineer/verification",
      version: VERIFICATION_RUNNER_VERSION,
      runId: data.runId,
    },
    status: data.status,
    ownership: {
      ownerLane: "I-09A-verification-runner-core-evidence-routing",
      ownedWritePaths: [
        "packages/verification/src/**",
        "packages/verification/fixtures/**",
        "packages/verification/tests/**",
        ".vibe/work/I-09A-verification-runner-core-evidence-routing/**",
      ],
      readOnlyPaths: ["packages/artifacts/**", "packages/orchestration/**", "packages/cli/**"],
      untouchablePaths: [".git/**", "pnpm-lock.yaml", "package.json", "pnpm-workspace.yaml"],
      concurrencyNotes: "I-09A runner core evidence packet written atomically under evidenceRoot.",
    },
    links: [
      {
        rel: "evidence_for",
        artifactKind: "implementation_plan",
        artifactId: planId,
        path: data.implementationPlanPath,
        required: true,
        statusAtLinkTime: "approved",
      },
    ],
    extensions: {
      "dev.vibe.verification": {
        schemaVersion: "1.0.0",
        requiredItemId: itemId,
        requiredItemLayer: itemLayer,
        requiredItemAction: itemAction,
        requiredItemBlocking: itemBlocking,
        requiredItem: {
          id: itemId,
          layer: itemLayer,
          action: itemAction,
          blocking: itemBlocking,
        },
        runId: data.runId,
        runnerVersion: VERIFICATION_RUNNER_VERSION,
        ...(data.runnerResolution === undefined ? {} : { runnerResolution: data.runnerResolution }),
        ...(data.itemDiagnostic === undefined ? {} : { diagnostics: [data.itemDiagnostic] }),
      },
    },
    evidenceClass: data.evidenceClass,
    layer: data.layer,
    subjectRefs: [
      {
        rel: "evidence_for",
        artifactKind: "implementation_plan",
        artifactId: planId,
        path: data.implementationPlanPath,
        required: true,
        statusAtLinkTime: "approved",
      },
      {
        rel: "evidence_for",
        artifactKind: "verification_delta",
        artifactId: requireString(delta.artifactId, "verificationDelta.artifactId"),
        path: data.implementationPlanPath,
        required: true,
        statusAtLinkTime: "complete",
      },
    ],
    commandOrTool: evidenceCommandOrTool(data.commandOrTool),
    startedAt: data.startedAt,
    endedAt: data.endedAt,
    exitStatus:
      data.commandOrTool.exitStatus && isRecord(data.commandOrTool.exitStatus)
        ? data.commandOrTool.exitStatus
        : { kind: "not_applicable", status: data.result },
    result: data.result,
    blocking: data.blocking,
    artifacts: data.artifacts,
    warnings: data.warnings,
    ...(data.failureDetails === undefined ? {} : { failureDetails: data.failureDetails }),
    ...(data.rerunOf === undefined ? {} : { rerunOf: data.rerunOf }),
    ...(data.stdoutRef === undefined ? {} : { stdoutRef: data.stdoutRef }),
    ...(data.stderrRef === undefined ? {} : { stderrRef: data.stderrRef }),
    ...(data.logsRef === undefined ? {} : { logsRef: data.logsRef }),
    ...(data.normalizationNotes === undefined
      ? {}
      : { normalizationNotes: data.normalizationNotes }),
  };
  return /** @type {Record<string, unknown>} */ (redactValue(packet));
}

/** @param {Record<string, unknown>} commandOrTool @returns {Record<string, unknown>} */
function evidenceCommandOrTool(commandOrTool) {
  const { exitStatus: _exitStatus, ...rest } = commandOrTool;
  return rest;
}

/** @param {string} command @returns {string} */
function resolveCommandExecutable(command) {
  return command === PORTABLE_NODE_RUNTIME_COMMAND ? process.execPath : command;
}

/** @param {string} code @param {string} message @param {string} classification @returns {Record<string, unknown>} */
function failureDetails(code, message, classification) {
  if (!EVIDENCE_FAILURE_CLASSIFICATION_VALUES.includes(/** @type {any} */ (classification)))
    throw new VerificationRunnerError(
      "INVALID_FAILURE_CLASSIFICATION",
      `Unsupported Evidence Packet failure classification ${classification}.`,
    );
  return { code, message: redactText(message), classification };
}

/** @param {Record<string, unknown>} spec @param {string} projectRoot @param {string} evidenceRoot @param {string} cwd @returns {{ok:true}|{ok:false,code:string,message:string,missingPath?:string,nextAction?:string}} */
function validateCommandSafety(spec, projectRoot, evidenceRoot, cwd) {
  const safety = spec.safety;
  if (!isRecord(safety))
    return {
      ok: false,
      code: "COMMAND_POLICY_DENIED",
      message: "Command runner safety policy is missing.",
    };
  const classification = safety.classification;
  if (typeof classification !== "string" || !ALLOWED_COMMAND_CLASSIFICATIONS.has(classification))
    return {
      ok: false,
      code: "COMMAND_POLICY_DENIED",
      message: "Command classification is missing, unknown, or denied.",
    };
  if (spec.shell === true || safety.shell === true)
    return { ok: false, code: "COMMAND_POLICY_DENIED", message: "shell:true is denied." };
  const command = spec.command;
  if (typeof command !== "string" || command.length === 0)
    return { ok: false, code: "COMMAND_POLICY_DENIED", message: "Command executable is missing." };
  if (!Array.isArray(spec.args) || spec.args.some((entry) => typeof entry !== "string"))
    return {
      ok: false,
      code: "COMMAND_POLICY_DENIED",
      message: "Command args must be an explicit string array.",
    };
  if (/\s|[;&|<>`$]/.test(command))
    return {
      ok: false,
      code: "COMMAND_POLICY_DENIED",
      message: "Shell-string command syntax is denied.",
    };
  const effectiveCommand = resolveCommandExecutable(command);
  const executableName = path.basename(effectiveCommand);
  const deniedExecutables = new Set([
    "git",
    "rm",
    "curl",
    "wget",
    "ssh",
    "scp",
    "gh",
    "pulumi",
    "terraform",
    "docker",
    "touch",
  ]);
  if (deniedExecutables.has(executableName))
    return {
      ok: false,
      code: "COMMAND_POLICY_DENIED",
      message: `Executable ${executableName} is denied by policy.`,
    };
  const packageManagers = new Set(["pnpm", "npm", "yarn", "corepack"]);
  if (packageManagers.has(executableName))
    return {
      ok: false,
      code: "COMMAND_POLICY_DENIED",
      message: "Package-manager commands are denied in I-09A runners.",
    };
  if (!path.isAbsolute(effectiveCommand))
    return {
      ok: false,
      code: "COMMAND_POLICY_DENIED",
      message:
        "Command executable must be an explicit typed absolute Node runtime path or the portable vibe-engineer:node runtime alias.",
    };
  const commandReal = fs.existsSync(effectiveCommand)
    ? fs.realpathSync(effectiveCommand)
    : path.resolve(effectiveCommand);
  const processExecReal = fs.realpathSync(process.execPath);
  if (commandReal !== processExecReal) {
    if (!isContained(projectRoot, commandReal))
      return {
        ok: false,
        code: "UNSAFE_PATH",
        message: "Command executable path escapes projectRoot.",
      };
    return {
      ok: false,
      code: "COMMAND_POLICY_DENIED",
      message:
        "Unsupported command executable; only process.execPath or its exact realpath is allowed.",
    };
  }
  if (!isRealPathContained(projectRoot, cwd))
    return { ok: false, code: "UNSAFE_CWD", message: "Command cwd escapes projectRoot." };
  const timeoutMsRaw = safety.timeoutMs;
  const maxStdoutBytesRaw = safety.maxStdoutBytes;
  const maxStderrBytesRaw = safety.maxStderrBytes;
  const maxOutputBytesRaw = safety.maxOutputBytes;
  if (
    ![timeoutMsRaw, maxStdoutBytesRaw, maxStderrBytesRaw, maxOutputBytesRaw].every(
      (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
    )
  )
    return {
      ok: false,
      code: "RESOURCE_CAP_MISSING",
      message: "Command timeout/output caps must be finite positive numbers.",
    };
  const timeoutMs = Number(timeoutMsRaw);
  const maxStdoutBytes = Number(maxStdoutBytesRaw);
  const maxStderrBytes = Number(maxStderrBytesRaw);
  const maxOutputBytes = Number(maxOutputBytesRaw);
  if (
    timeoutMs > MAX_TIMEOUT_MS ||
    maxStdoutBytes > MAX_STREAM_BYTES ||
    maxStderrBytes > MAX_STREAM_BYTES ||
    maxOutputBytes > MAX_OUTPUT_BYTES
  )
    return {
      ok: false,
      code: "RESOURCE_CAP_EXCEEDED",
      message: "Command timeout/output caps exceed implementation-owned maxima.",
    };
  if (safety.passThroughEnv === true)
    return {
      ok: false,
      code: "ENVIRONMENT_POLICY_DENIED",
      message: "Raw process.env pass-through is denied.",
    };
  const argPolicy = validateTypedArgPolicy(spec, safety);
  if (!argPolicy.ok) return argPolicy;
  const args = /** @type {string[]} */ (spec.args);
  if (args.length === 0)
    return {
      ok: false,
      code: "COMMAND_POLICY_DENIED",
      message: "Node command runners require a typed projectRoot script path.",
    };
  const scriptArg = args[0] || "";
  if (NODE_EVAL_ARGS.has(scriptArg))
    return {
      ok: false,
      code: "COMMAND_POLICY_DENIED",
      message: "Node inline eval/print runners are denied before spawn.",
    };
  const scriptPath = resolveMaybeRelative(scriptArg, cwd);
  if (
    !argPolicy.typedIndexes.has(0) ||
    !isRealPathContained(projectRoot, scriptPath) ||
    isProtectedProjectPath(projectRoot, scriptPath)
  )
    return {
      ok: false,
      code: "COMMAND_POLICY_DENIED",
      message: "Node command runners require argv[0] to be a typed projectRoot runner script path.",
    };
  if (!/\.m?js$/i.test(scriptPath))
    return {
      ok: false,
      code: "COMMAND_POLICY_DENIED",
      message: "Node command runner script path must be a JS/MJS file.",
    };
  if (!fs.existsSync(scriptPath) || !fs.statSync(scriptPath).isFile())
    return {
      ok: false,
      code: "MISSING_RUNNER_OR_PREREQUISITE",
      message: `Declared Node runner script is missing or not a file: ${scriptPath}.`,
      missingPath: scriptPath,
      nextAction:
        "Create the project-contained runner script or update runner.args[0] to an existing executable .js/.mjs prerequisite.",
    };
  const expectedArtifacts = spec.expectedArtifacts;
  if (
    !Array.isArray(expectedArtifacts) ||
    expectedArtifacts.some((entry) => typeof entry !== "string" || entry.length === 0)
  )
    return {
      ok: false,
      code: "UNSAFE_PATH",
      message: "expectedArtifacts must be explicit path strings.",
    };
  const allowedRoots = Array.isArray(safety.allowedWriteRoots)
    ? safety.allowedWriteRoots
        .filter((entry) => typeof entry === "string")
        .map((entry) => resolveMaybeRelative(entry, projectRoot))
    : [];
  for (const artifact of expectedArtifacts) {
    const abs = resolveMaybeRelative(artifact, cwd);
    const inEvidence = isRealPathContained(evidenceRoot, abs);
    const inAllowed = allowedRoots.some((root) => isRealPathContained(root, abs));
    if (!inEvidence && !inAllowed)
      return {
        ok: false,
        code: "UNSAFE_PATH",
        message: "Expected artifact path is outside evidenceRoot and allowed write roots.",
      };
    if (isProtectedProjectPath(projectRoot, abs))
      return {
        ok: false,
        code: "UNSAFE_PATH",
        message: "Expected artifact path targets a protected project path.",
      };
    if (
      existingPathIsSymlink(abs) &&
      !isRealPathContained(evidenceRoot, fs.realpathSync(abs)) &&
      !allowedRoots.some((root) => isRealPathContained(root, fs.realpathSync(abs)))
    )
      return {
        ok: false,
        code: "UNSAFE_PATH",
        message: "Expected artifact symlink escapes declared roots.",
      };
  }
  const argPaths = spec.argPaths;
  if (argPaths !== undefined) {
    for (const entry of /** @type {Record<string, unknown>[]} */ (argPaths)) {
      const index = entry.index;
      const rootKind = entry.root;
      if (!Number.isInteger(index) || typeof rootKind !== "string")
        return {
          ok: false,
          code: "UNSAFE_PATH",
          message: "argPaths entries require integer index and root.",
        };
      const arg = args[Number(index)];
      if (typeof arg !== "string")
        return {
          ok: false,
          code: "UNSAFE_PATH",
          message: "argPaths index does not reference a string arg.",
        };
      const root =
        rootKind === "projectRoot"
          ? projectRoot
          : rootKind === "evidenceRoot"
            ? evidenceRoot
            : null;
      if (root === null)
        return {
          ok: false,
          code: "UNSAFE_PATH",
          message: "argPaths root must be projectRoot or evidenceRoot.",
        };
      const abs = resolveMaybeRelative(arg, cwd);
      if (!isRealPathContained(root, abs))
        return { ok: false, code: "UNSAFE_PATH", message: "Typed arg path escapes declared root." };
      if (rootKind === "projectRoot" && isProtectedProjectPath(projectRoot, abs))
        return {
          ok: false,
          code: "UNSAFE_PATH",
          message: "Typed arg path targets a protected project path.",
        };
    }
  }
  return { ok: true };
}

/** @param {Record<string, unknown>} spec @returns {{ok:true,env:Record<string,string>,summary:string}|{ok:false,code:string,message:string}} */
function buildEnvironment(spec) {
  const safety = spec.safety;
  if (!isRecord(safety))
    return {
      ok: false,
      code: "ENVIRONMENT_POLICY_DENIED",
      message: "Safety policy missing for environment construction.",
    };
  const allowlist = safety.envAllowlist;
  if (!Array.isArray(allowlist) || allowlist.some((entry) => typeof entry !== "string"))
    return {
      ok: false,
      code: "ENVIRONMENT_POLICY_DENIED",
      message: "envAllowlist must be an explicit string array.",
    };
  const env = Object.create(null);
  const configured = isRecord(spec.env) ? spec.env : {};
  for (const [key, rawValue] of Object.entries(configured)) {
    if (!allowlist.includes(key))
      return {
        ok: false,
        code: "ENVIRONMENT_POLICY_DENIED",
        message: `Environment key ${key} is not allowlisted.`,
      };
    if (isSecretLikeKey(key))
      return {
        ok: false,
        code: "ENVIRONMENT_POLICY_DENIED",
        message: `Environment key ${key} is secret-like and denied.`,
      };
    if (typeof rawValue !== "string")
      return {
        ok: false,
        code: "ENVIRONMENT_POLICY_DENIED",
        message: `Environment key ${key} must be string.`,
      };
    if (
      redactText(rawValue) !== rawValue ||
      /\b(prod|production|live|deploy|release)\b/i.test(rawValue)
    )
      return {
        ok: false,
        code: "ENVIRONMENT_POLICY_DENIED",
        message: `Environment value for ${key} is secret-like or production-like.`,
      };
    env[key] = rawValue;
  }
  env.VIBE_ENGINEER_VERIFICATION_RUNNER = "1";
  return {
    ok: true,
    env,
    summary: `allowlist:${allowlist.join(",") || "empty"}; provided:${Object.keys(configured).join(",") || "none"}; raw-process-env:false`,
  };
}

/** @param {Buffer[]} chunks @returns {string} */
function decodeChunks(chunks) {
  return TEXT_DECODER.decode(Buffer.concat(chunks));
}

/** @param {string} filePath @param {string} root @param {string} label @returns {void} */
function assertSafeTextWriteTarget(filePath, root, label) {
  const abs = path.resolve(filePath);
  const parent = path.dirname(abs);
  if (!isRealPathContained(root, parent))
    throw new VerificationRunnerError("UNSAFE_PATH", `${label} parent escapes evidence root.`);
  if (existingPathIsSymlink(abs))
    throw new VerificationRunnerError("UNSAFE_PATH", `${label} must not be a symlink.`);
}

/** @param {string} filePath @param {string} root @param {string} text @returns {Promise<void>} */
async function writeSafeEvidenceText(filePath, root, text) {
  assertSafeTextWriteTarget(filePath, root, "evidence sidecar");
  await fsp.writeFile(filePath, text, "utf8");
}

/** @param {string} abs @param {Record<string, unknown>} spec @param {string} projectRoot @param {string} evidenceRoot @param {string} cwd @returns {{ok:true,path:string,size:number}|{ok:false,code:string,message:string}} */
function validateExpectedArtifactAfterRun(abs, spec, projectRoot, evidenceRoot, cwd) {
  if (!fs.existsSync(abs))
    return {
      ok: false,
      code: "MISSING_EVIDENCE",
      message: `Expected evidence artifact is missing: ${abs}.`,
    };
  const safety = isRecord(spec.safety) ? spec.safety : {};
  const allowedRoots = Array.isArray(safety.allowedWriteRoots)
    ? safety.allowedWriteRoots
        .filter((entry) => typeof entry === "string")
        .map((entry) => resolveMaybeRelative(entry, projectRoot))
    : [];
  const real = fs.realpathSync(abs);
  const inEvidence = isRealPathContained(evidenceRoot, real);
  const inAllowed = allowedRoots.some((root) => isRealPathContained(root, real));
  if (!inEvidence && !inAllowed)
    return {
      ok: false,
      code: "UNSAFE_PATH",
      message: "Expected artifact realpath escapes declared roots.",
    };
  if (isProtectedProjectPath(projectRoot, real))
    return {
      ok: false,
      code: "UNSAFE_PATH",
      message: "Expected artifact realpath targets a protected project path.",
    };
  if (!isRealPathContained(cwd, path.dirname(abs)) && !inEvidence && !inAllowed)
    return {
      ok: false,
      code: "UNSAFE_PATH",
      message: "Expected artifact path escapes command roots.",
    };
  const size = fs.statSync(real).size;
  const maxOutputBytes = Number(safety.maxOutputBytes || 0);
  if (size > maxOutputBytes)
    return {
      ok: false,
      code: "ARTIFACT_LIMIT_EXCEEDED",
      message: "Expected artifact exceeded maxOutputBytes.",
    };
  return { ok: true, path: real, size };
}

/** @param {Record<string, unknown>} spec @param {Record<string, unknown>} item @param {{projectRoot:string,evidenceRoot:string,runId:string,rerunOf?:string,implementationPlanPath:string,plan:Record<string,unknown>,index:number}} ctx @returns {Promise<{packet:Record<string,unknown>,path:string}>} */
async function executeCommandRunner(spec, item, ctx) {
  const startedAt = new Date().toISOString();
  const projectRoot = realRoot(ctx.projectRoot);
  const evidenceRoot = realRoot(ctx.evidenceRoot);
  const cwdInput = typeof spec.cwd === "string" ? spec.cwd : ".";
  const cwdResolved = path.resolve(projectRoot, cwdInput);
  const cwd = fs.existsSync(cwdResolved) ? fs.realpathSync(cwdResolved) : cwdResolved;
  const runnerId = requireString(spec.id, "runner.id");
  const runnerResolution = {
    candidateRunnerIdsChecked: [runnerId],
    candidateRunnersChecked: [
      {
        id: runnerId,
        layer: stringValue(spec.layer),
        kind: stringValue(spec.kind),
        requiredItemIds: stringArrayValue(spec.requiredItemIds),
        selectedByResolver: true,
      },
    ],
    matchedRunnerIds: [runnerId],
    selectedRunnerId: runnerId,
    resolutionStatus: "matched",
  };
  const safety = validateCommandSafety(spec, projectRoot, evidenceRoot, cwd);
  if (!safety.ok) {
    const safetyFailure = /** @type {{ok:false,code:string,message:string,missingPath?:string,nextAction?:string}} */ (safety);
    const endedAt = new Date().toISOString();
    const classification =
      safetyFailure.code === "MISSING_RUNNER_OR_PREREQUISITE"
        ? EVIDENCE_FAILURE_CLASSIFICATIONS.MISSING_RUNNER_OR_PREREQUISITE
        : EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE;
    const itemDiagnostic = makeItemDiagnostic({
      item,
      status: "blocked",
      result: "blocked",
      packetBlocking: true,
      classification,
      code: safetyFailure.code,
      reason: safetyFailure.message,
      candidateRunnerIdsChecked: [runnerId],
      candidateRunnersChecked: runnerResolution.candidateRunnersChecked,
      matchedRunnerIds: [runnerId],
      selectedRunnerId: runnerId,
      missingPath: safetyFailure.missingPath || null,
      suggestedNextAction: safetyFailure.nextAction,
      manualEvidenceAllowed: false,
    });
    const packet = makePacket({
      runId: ctx.runId,
      index: ctx.index,
      item,
      plan: ctx.plan,
      implementationPlanPath: ctx.implementationPlanPath,
      projectRoot,
      evidenceRoot,
      startedAt,
      endedAt,
      evidenceClass: "deterministic",
      layer: stringValue(spec.layer),
      commandOrTool: {
        kind: "command",
        name: stringValue(spec.command || spec.id),
        argv: Array.isArray(spec.args) ? spec.args.map(String).map(redactCommandArg) : [],
        workingDirectory: cwd,
        environmentSummary: "not constructed; denied before spawn",
        exitStatus: { kind: "tool_status", status: "not_spawned" },
      },
      status: "blocked",
      result: "blocked",
      blocking: true,
      artifacts: [],
      warnings: [itemDiagnosticSummary(itemDiagnostic)],
      failureDetails: failureDetails(safetyFailure.code, safetyFailure.message, classification),
      runnerResolution,
      itemDiagnostic,
      ...(ctx.rerunOf === undefined ? {} : { rerunOf: ctx.rerunOf }),
    });
    return { packet, path: await persistEvidencePacket(evidenceRoot, packet) };
  }
  const envResult = buildEnvironment(spec);
  if (!envResult.ok) {
    const envFailure = /** @type {{ok:false,code:string,message:string}} */ (envResult);
    const endedAt = new Date().toISOString();
    const packet = makePacket({
      runId: ctx.runId,
      index: ctx.index,
      item,
      plan: ctx.plan,
      implementationPlanPath: ctx.implementationPlanPath,
      projectRoot,
      evidenceRoot,
      startedAt,
      endedAt,
      evidenceClass: "deterministic",
      layer: stringValue(spec.layer),
      commandOrTool: {
        kind: "command",
        name: stringValue(spec.command || spec.id),
        argv: Array.isArray(spec.args) ? spec.args.map(String).map(redactCommandArg) : [],
        workingDirectory: cwd,
        environmentSummary: "denied",
        exitStatus: { kind: "tool_status", status: "not_spawned" },
      },
      status: "blocked",
      result: "blocked",
      blocking: true,
      artifacts: [],
      warnings: [
        itemDiagnosticSummary(
          makeItemDiagnostic({
            item,
            status: "blocked",
            result: "blocked",
            packetBlocking: true,
            classification: EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE,
            code: envFailure.code,
            reason: envFailure.message,
            candidateRunnerIdsChecked: [runnerId],
            candidateRunnersChecked: runnerResolution.candidateRunnersChecked,
            matchedRunnerIds: [runnerId],
            selectedRunnerId: runnerId,
            manualEvidenceAllowed: false,
          }),
        ),
      ],
      failureDetails: failureDetails(
        envFailure.code,
        envFailure.message,
        EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE,
      ),
      runnerResolution,
      itemDiagnostic: makeItemDiagnostic({
        item,
        status: "blocked",
        result: "blocked",
        packetBlocking: true,
        classification: EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE,
        code: envFailure.code,
        reason: envFailure.message,
        candidateRunnerIdsChecked: [runnerId],
        candidateRunnersChecked: runnerResolution.candidateRunnersChecked,
        matchedRunnerIds: [runnerId],
        selectedRunnerId: runnerId,
        manualEvidenceAllowed: false,
      }),
      ...(ctx.rerunOf === undefined ? {} : { rerunOf: ctx.rerunOf }),
    });
    return { packet, path: await persistEvidencePacket(evidenceRoot, packet) };
  }
  const sidecarDir = resolveContained(evidenceRoot, "sidecars", "sidecar directory");
  await fsp.mkdir(sidecarDir, { recursive: true });
  const sidecarBase = `${safeId(ctx.runId)}-${safeId(requireString(item.id, "requiredItem.id"))}-${String(ctx.index).padStart(2, "0")}`;
  const stdoutRef = path.join(sidecarDir, `${sidecarBase}.stdout.log`);
  const stderrRef = path.join(sidecarDir, `${sidecarBase}.stderr.log`);
  const logsRef = path.join(sidecarDir, `${sidecarBase}.runner.log`);
  /** @type {Buffer[]} */ const stdoutChunks = [];
  /** @type {Buffer[]} */ const stderrChunks = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let capturedStdoutBytes = 0;
  let capturedStderrBytes = 0;
  let capCode = "";
  const args = Array.isArray(spec.args) ? spec.args.map(String) : [];
  const requestedCommand = requireString(spec.command, "runner.command");
  const command = resolveCommandExecutable(requestedCommand);
  const maxStdoutBytes = Number(isRecord(spec.safety) ? spec.safety.maxStdoutBytes : 0);
  const maxStderrBytes = Number(isRecord(spec.safety) ? spec.safety.maxStderrBytes : 0);
  const maxOutputBytes = Number(isRecord(spec.safety) ? spec.safety.maxOutputBytes : 0);
  const timeoutMs = Number(isRecord(spec.safety) ? spec.safety.timeoutMs : 0);
  const child = spawn(command, args, {
    cwd,
    env: envResult.env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const exit = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      capCode = "COMMAND_TIMEOUT";
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      }, 100);
    }, timeoutMs);
    child.on(
      "error",
      /** @param {unknown} error */ (error) => {
        clearTimeout(timer);
        resolve({ error });
      },
    );
    child.stdout.on(
      "data",
      /** @param {unknown} chunk */ (chunk) => {
        const buffer = Buffer.from(chunk);
        stdoutBytes += buffer.byteLength;
        if (stdoutBytes > maxStdoutBytes && !capCode) {
          capCode = "STDOUT_LIMIT_EXCEEDED";
          child.kill("SIGTERM");
        }
        if (stdoutBytes + stderrBytes > maxOutputBytes && !capCode) {
          capCode = "OUTPUT_LIMIT_EXCEEDED";
          child.kill("SIGTERM");
        }
        const remainingStream = Math.max(0, maxStdoutBytes - capturedStdoutBytes);
        const remainingAggregate = Math.max(
          0,
          maxOutputBytes - capturedStdoutBytes - capturedStderrBytes,
        );
        const allowedBytes = Math.min(buffer.byteLength, remainingStream, remainingAggregate);
        if (allowedBytes > 0) {
          stdoutChunks.push(buffer.subarray(0, allowedBytes));
          capturedStdoutBytes += allowedBytes;
        }
      },
    );
    child.stderr.on(
      "data",
      /** @param {unknown} chunk */ (chunk) => {
        const buffer = Buffer.from(chunk);
        stderrBytes += buffer.byteLength;
        if (stderrBytes > maxStderrBytes && !capCode) {
          capCode = "STDERR_LIMIT_EXCEEDED";
          child.kill("SIGTERM");
        }
        if (stdoutBytes + stderrBytes > maxOutputBytes && !capCode) {
          capCode = "OUTPUT_LIMIT_EXCEEDED";
          child.kill("SIGTERM");
        }
        const remainingStream = Math.max(0, maxStderrBytes - capturedStderrBytes);
        const remainingAggregate = Math.max(
          0,
          maxOutputBytes - capturedStdoutBytes - capturedStderrBytes,
        );
        const allowedBytes = Math.min(buffer.byteLength, remainingStream, remainingAggregate);
        if (allowedBytes > 0) {
          stderrChunks.push(buffer.subarray(0, allowedBytes));
          capturedStderrBytes += allowedBytes;
        }
      },
    );
    child.on(
      "close",
      /** @param {unknown} code @param {unknown} signal */ (code, signal) => {
        clearTimeout(timer);
        resolve({ code, signal });
      },
    );
  });
  const stdout = redactText(decodeChunks(stdoutChunks));
  const stderr = redactText(decodeChunks(stderrChunks));
  await writeSafeEvidenceText(stdoutRef, evidenceRoot, stdout);
  await writeSafeEvidenceText(stderrRef, evidenceRoot, stderr);
  const remainingLogBudget = Math.max(
    0,
    maxOutputBytes - Buffer.byteLength(stdout) - Buffer.byteLength(stderr),
  );
  const runnerLogText = redactText(
    JSON.stringify(
      {
        command: requestedCommand,
        resolvedCommand: requestedCommand === command ? undefined : command,
        args: args.map(redactCommandArg),
        cwd,
        exit: redactValue(exit),
        stdoutBytes,
        stderrBytes,
        capCode,
      },
      null,
      2,
    ),
  );
  await writeSafeEvidenceText(
    logsRef,
    evidenceRoot,
    runnerLogText.length > remainingLogBudget
      ? runnerLogText.slice(0, remainingLogBudget)
      : runnerLogText,
  );
  const endedAt = new Date().toISOString();
  const common = {
    runId: ctx.runId,
    index: ctx.index,
    item,
    plan: ctx.plan,
    implementationPlanPath: ctx.implementationPlanPath,
    projectRoot,
    evidenceRoot,
    startedAt,
    endedAt,
    evidenceClass: stringValue(spec.evidenceClass),
    layer: stringValue(spec.layer),
    commandOrTool: {
      kind: "command",
      name: requestedCommand,
      argv: args.map(redactCommandArg),
      workingDirectory: cwd,
      environmentSummary:
        requestedCommand === command
          ? envResult.summary
          : `${envResult.summary}; ${PORTABLE_NODE_RUNTIME_COMMAND} resolved to the active Node.js runtime`,
      exitStatus:
        isRecord(exit) && "code" in exit
          ? {
              kind: "exit_code",
              code: typeof exit.code === "number" ? exit.code : -1,
              status: typeof exit.signal === "string" ? exit.signal : "closed",
            }
          : { kind: "tool_status", status: "spawn_error" },
    },
    artifacts: [stdoutRef, stderrRef, logsRef],
    warnings: [],
    stdoutRef,
    stderrRef,
    logsRef,
    runnerResolution,
    ...(ctx.rerunOf === undefined ? {} : { rerunOf: ctx.rerunOf }),
  };
  if (isRecord(exit) && "error" in exit) {
    const err = /** @type {{code?:string,message?:string}} */ (exit.error);
    const classification =
      err.code === "ENOENT"
        ? EVIDENCE_FAILURE_CLASSIFICATIONS.MISSING_RUNNER_OR_PREREQUISITE
        : EVIDENCE_FAILURE_CLASSIFICATIONS.RUNNER_INTERNAL_ERROR;
    const code = err.code === "ENOENT" ? "MISSING_RUNNER_OR_PREREQUISITE" : "RUNNER_SPAWN_ERROR";
    const spawnMessage = err.message || "Runner spawn failed.";
    const itemDiagnostic = makeItemDiagnostic({
      item,
      status: "blocked",
      result: "blocked",
      packetBlocking: true,
      classification,
      code,
      reason: spawnMessage,
      candidateRunnerIdsChecked: [runnerId],
      candidateRunnersChecked: runnerResolution.candidateRunnersChecked,
      matchedRunnerIds: [runnerId],
      selectedRunnerId: runnerId,
      manualEvidenceAllowed: false,
    });
    const packet = makePacket({
      ...common,
      status: "blocked",
      result: "blocked",
      blocking: true,
      warnings: [itemDiagnosticSummary(itemDiagnostic)],
      failureDetails: failureDetails(code, spawnMessage, classification),
      itemDiagnostic,
    });
    return { packet, path: await persistEvidencePacket(evidenceRoot, packet) };
  }
  if (capCode) {
    const capMessage =
      capCode === "COMMAND_TIMEOUT"
        ? "Command timed out and was terminated."
        : capCode === "OUTPUT_LIMIT_EXCEEDED"
          ? "Command aggregate stdout and stderr exceeded configured maxOutputBytes."
          : "Command output exceeded configured byte caps.";
    const itemDiagnostic = makeItemDiagnostic({
      item,
      status: "blocked",
      result: "blocked",
      packetBlocking: true,
      classification: EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE,
      code: capCode === "COMMAND_TIMEOUT" ? "COMMAND_TIMEOUT" : capCode,
      reason: capMessage,
      candidateRunnerIdsChecked: [runnerId],
      candidateRunnersChecked: runnerResolution.candidateRunnersChecked,
      matchedRunnerIds: [runnerId],
      selectedRunnerId: runnerId,
      manualEvidenceAllowed: false,
    });
    const packet = makePacket({
      ...common,
      status: "blocked",
      result: "blocked",
      blocking: true,
      warnings: [itemDiagnosticSummary(itemDiagnostic)],
      failureDetails: failureDetails(
        capCode === "COMMAND_TIMEOUT" ? "COMMAND_TIMEOUT" : capCode,
        capMessage,
        EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE,
      ),
      itemDiagnostic,
      normalizationNotes: "Output was bounded and redacted before persistence.",
    });
    return { packet, path: await persistEvidencePacket(evidenceRoot, packet) };
  }
  const exitCode = isRecord(exit) && typeof exit.code === "number" ? exit.code : -1;
  if (exitCode !== 0) {
    const classification =
      typeof spec.failureClassification === "string"
        ? spec.failureClassification
        : EVIDENCE_FAILURE_CLASSIFICATIONS.TEST_ASSERTION_FAILURE;
    const packet = makePacket({
      ...common,
      status:
        spec.evidenceClass === "advisory" && spec.blocking === false
          ? "advisory_warning"
          : "failed",
      result: spec.evidenceClass === "advisory" && spec.blocking === false ? "advisory" : "fail",
      blocking: Boolean(spec.blocking),
      failureDetails: failureDetails(
        spec.evidenceClass === "advisory" && spec.blocking === false
          ? "ADVISORY_FINDING"
          : "RUNNER_NONZERO_EXIT",
        `Runner exited with code ${String(exitCode)}.`,
        spec.evidenceClass === "advisory" && spec.blocking === false
          ? EVIDENCE_FAILURE_CLASSIFICATIONS.ADVISORY_FINDING
          : classification,
      ),
    });
    return { packet, path: await persistEvidencePacket(evidenceRoot, packet) };
  }
  /** @type {string[]} */
  const outputArtifacts = [];
  for (const artifact of /** @type {string[]} */ (spec.expectedArtifacts)) {
    const abs = resolveMaybeRelative(artifact, cwd);
    const artifactValidation = validateExpectedArtifactAfterRun(
      abs,
      spec,
      projectRoot,
      evidenceRoot,
      cwd,
    );
    if (!artifactValidation.ok) {
      const artifactFailure = /** @type {{ok:false,code:string,message:string}} */ (artifactValidation);
      const classification =
        artifactFailure.code === "MISSING_EVIDENCE"
          ? EVIDENCE_FAILURE_CLASSIFICATIONS.MISSING_EVIDENCE
          : EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE;
      const itemDiagnostic = makeItemDiagnostic({
        item,
        status: "blocked",
        result: "blocked",
        packetBlocking: true,
        classification,
        code: artifactFailure.code,
        reason: artifactFailure.message,
        candidateRunnerIdsChecked: [runnerId],
        candidateRunnersChecked: runnerResolution.candidateRunnersChecked,
        matchedRunnerIds: [runnerId],
        selectedRunnerId: runnerId,
        missingPath: abs,
        manualEvidenceAllowed: false,
      });
      const packet = makePacket({
        ...common,
        status: "blocked",
        result: "blocked",
        blocking: true,
        warnings: [itemDiagnosticSummary(itemDiagnostic)],
        failureDetails: failureDetails(
          artifactFailure.code,
          artifactFailure.message,
          classification,
        ),
        itemDiagnostic,
      });
      return { packet, path: await persistEvidencePacket(evidenceRoot, packet) };
    }
    const artifactText = await fsp.readFile(artifactValidation.path, "utf8").catch(() => null);
    if (artifactText !== null) {
      const redacted = redactText(artifactText);
      if (redacted !== artifactText)
        await writeSafeEvidenceText(artifactValidation.path, evidenceRoot, redacted);
    }
    outputArtifacts.push(artifactValidation.path);
  }
  const packet = makePacket({
    ...common,
    status: spec.evidenceClass === "advisory" ? "advisory_warning" : "passed",
    result: spec.evidenceClass === "advisory" ? "advisory" : "pass",
    blocking: Boolean(spec.blocking),
    artifacts: [...common.artifacts, ...outputArtifacts],
  });
  return { packet, path: await persistEvidencePacket(evidenceRoot, packet) };
}

/** @param {Record<string, unknown>} spec @param {Record<string, unknown>} item @param {{projectRoot:string,evidenceRoot:string,runId:string,rerunOf?:string,implementationPlanPath:string,plan:Record<string,unknown>,index:number}} ctx @returns {Promise<{packet:Record<string,unknown>,path:string}>} */
async function executeValidatorRunner(spec, item, ctx) {
  const startedAt = new Date().toISOString();
  const endedAt = new Date().toISOString();
  const name = requireString(spec.validator, "validator");
  const projectRoot = realRoot(ctx.projectRoot);
  const evidenceRoot = realRoot(ctx.evidenceRoot);
  const commonTool = {
    kind: "validator",
    name,
    workingDirectory: projectRoot,
    environmentSummary: "in-process typed validator; no raw process.env",
    exitStatus: { kind: "tool_status", status: "completed" },
  };
  const runnerId = requireString(spec.id, "runner.id");
  const runnerResolution = {
    candidateRunnerIdsChecked: [runnerId],
    candidateRunnersChecked: [
      {
        id: runnerId,
        layer: stringValue(spec.layer),
        kind: stringValue(spec.kind),
        requiredItemIds: stringArrayValue(spec.requiredItemIds),
        selectedByResolver: true,
      },
    ],
    matchedRunnerIds: [runnerId],
    selectedRunnerId: runnerId,
    resolutionStatus: "matched",
  };
  try {
    if (name === "validateArtifactFile") {
      const targetPath = requireString(spec.targetPath, "targetPath");
      const kind = requireString(spec.artifactKind, "artifactKind");
      const abs = resolveContained(projectRoot, targetPath, "validator targetPath");
      const validation = validateArtifactFile(abs, { kind: /** @type {any} */ (kind) });
      if (!validation.ok) {
        const packet = makePacket({
          runId: ctx.runId,
          index: ctx.index,
          item,
          plan: ctx.plan,
          implementationPlanPath: ctx.implementationPlanPath,
          projectRoot,
          evidenceRoot,
          startedAt,
          endedAt,
          evidenceClass: stringValue(spec.evidenceClass),
          layer: stringValue(spec.layer),
          commandOrTool: commonTool,
          status: "failed",
          result: "fail",
          blocking: Boolean(spec.blocking),
          artifacts: [abs],
          warnings: [],
          failureDetails: failureDetails(
            "SCHEMA_OR_CONTRACT_FAILURE",
            "Validator rejected artifact file.",
            EVIDENCE_FAILURE_CLASSIFICATIONS.SCHEMA_OR_CONTRACT_FAILURE,
          ),
          runnerResolution,
          ...(ctx.rerunOf === undefined ? {} : { rerunOf: ctx.rerunOf }),
        });
        return { packet, path: await persistEvidencePacket(evidenceRoot, packet) };
      }
      const packet = makePacket({
        runId: ctx.runId,
        index: ctx.index,
        item,
        plan: ctx.plan,
        implementationPlanPath: ctx.implementationPlanPath,
        projectRoot,
        evidenceRoot,
        startedAt,
        endedAt,
        evidenceClass: stringValue(spec.evidenceClass),
        layer: stringValue(spec.layer),
        commandOrTool: commonTool,
        status: "passed",
        result: "pass",
        blocking: Boolean(spec.blocking),
        artifacts: [abs],
        warnings: [],
        runnerResolution,
        ...(ctx.rerunOf === undefined ? {} : { rerunOf: ctx.rerunOf }),
      });
      return { packet, path: await persistEvidencePacket(evidenceRoot, packet) };
    }
    if (name === "malformedEvidencePacketCandidate") {
      const malformed = makePacket({
        runId: ctx.runId,
        index: ctx.index,
        item,
        plan: ctx.plan,
        implementationPlanPath: ctx.implementationPlanPath,
        projectRoot,
        evidenceRoot,
        startedAt,
        endedAt,
        evidenceClass: "deterministic",
        layer: stringValue(spec.layer),
        commandOrTool: commonTool,
        status: "blocked",
        result: "blocked",
        blocking: true,
        artifacts: [],
        warnings: [],
        failureDetails: failureDetails(
          "MALFORMED_CANDIDATE",
          "Intentional malformed candidate witness.",
          EVIDENCE_FAILURE_CLASSIFICATIONS.SCHEMA_OR_CONTRACT_FAILURE,
        ),
        runnerResolution,
      });
      malformed.failureDetails = {
        code: "BAD",
        message: "invalid",
        classification: "resource_limit_exceeded",
      };
      const validation = validateArtifact(malformed);
      if (validation.ok)
        throw new VerificationRunnerError(
          "UNEXPECTED_VALID_MALFORMED_CANDIDATE",
          "Malformed candidate unexpectedly validated.",
        );
      const packet = makePacket({
        runId: ctx.runId,
        index: ctx.index,
        item,
        plan: ctx.plan,
        implementationPlanPath: ctx.implementationPlanPath,
        projectRoot,
        evidenceRoot,
        startedAt,
        endedAt,
        evidenceClass: "deterministic",
        layer: stringValue(spec.layer),
        commandOrTool: commonTool,
        status: "blocked",
        result: "blocked",
        blocking: true,
        artifacts: [],
        warnings: ["Malformed Evidence Packet candidate rejected before final persistence."],
        failureDetails: failureDetails(
          "MALFORMED_EVIDENCE_PACKET",
          "Malformed Evidence Packet candidate was rejected by real artifact validation.",
          EVIDENCE_FAILURE_CLASSIFICATIONS.SCHEMA_OR_CONTRACT_FAILURE,
        ),
        runnerResolution,
        ...(ctx.rerunOf === undefined ? {} : { rerunOf: ctx.rerunOf }),
      });
      return { packet, path: await persistEvidencePacket(evidenceRoot, packet) };
    }
    if (name === "throwInternalError")
      throw new Error("Intentional validator internal error with token=DUMMY_INTERNAL_VALUE");
    throw new VerificationRunnerError("UNKNOWN_VALIDATOR", `Unknown validator ${name}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown validator error.";
    const isUnsupportedValidator =
      error instanceof VerificationRunnerError && error.code === "UNKNOWN_VALIDATOR";
    const itemDiagnostic = isUnsupportedValidator
      ? makeItemDiagnostic({
          item,
          status: "blocked",
          result: "blocked",
          packetBlocking: true,
          classification: EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE,
          code: "UNSUPPORTED_ACTION",
          reason: "Unsupported validator action is denied before execution.",
          candidateRunnerIdsChecked: [runnerId],
          candidateRunnersChecked: runnerResolution.candidateRunnersChecked,
          matchedRunnerIds: [runnerId],
          selectedRunnerId: runnerId,
          manualEvidenceAllowed: false,
        })
      : undefined;
    const packet = makePacket({
      runId: ctx.runId,
      index: ctx.index,
      item,
      plan: ctx.plan,
      implementationPlanPath: ctx.implementationPlanPath,
      projectRoot,
      evidenceRoot,
      startedAt,
      endedAt,
      evidenceClass: stringValue(spec.evidenceClass || "deterministic"),
      layer: stringValue(spec.layer || item.layer),
      commandOrTool: commonTool,
      status: isUnsupportedValidator ? "blocked" : "failed",
      result: isUnsupportedValidator ? "blocked" : "fail",
      blocking: true,
      artifacts: [],
      warnings: itemDiagnostic === undefined ? [] : [itemDiagnosticSummary(itemDiagnostic)],
      failureDetails: failureDetails(
        isUnsupportedValidator ? "UNSUPPORTED_ACTION" : "RUNNER_INTERNAL_ERROR",
        isUnsupportedValidator
          ? "Unsupported validator action is denied before execution."
          : message,
        isUnsupportedValidator
          ? EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE
          : EVIDENCE_FAILURE_CLASSIFICATIONS.RUNNER_INTERNAL_ERROR,
      ),
      runnerResolution,
      ...(itemDiagnostic === undefined ? {} : { itemDiagnostic }),
      ...(ctx.rerunOf === undefined ? {} : { rerunOf: ctx.rerunOf }),
    });
    return { packet, path: await persistEvidencePacket(evidenceRoot, packet) };
  }
}

/** @param {Record<string, unknown>} item @param {{projectRoot:string,evidenceRoot:string,runId:string,rerunOf?:string,implementationPlanPath:string,plan:Record<string,unknown>,index:number}} ctx @param {string} status @param {string} result @param {boolean} blocking @param {string} classification @param {string} code @param {string} message @param {{candidateRunnerIdsChecked?:string[],candidateRunnersChecked?:Record<string,unknown>[],matchedRunnerIds?:string[],selectedRunnerId?:string|null,missingPath?:string|null,suggestedNextAction?:string,suggestedRunnerCatalogEntry?:Record<string,unknown>,manualEvidenceAllowed?:boolean,runnerResolutionStatus?:string}} [details] @returns {Promise<{packet:Record<string,unknown>,path:string}>} */
async function recordNonExecuted(
  item,
  ctx,
  status,
  result,
  blocking,
  classification,
  code,
  message,
  details = {},
) {
  const now = new Date().toISOString();
  const action = requireString(item.action, "requiredItem.action");
  const itemBlocking = requiredItemBlocking(item, blocking);
  const manualEvidenceAllowed =
    details.manualEvidenceAllowed === true || action === "not_applicable" || itemBlocking === false;
  const commandKind = action === "not_applicable" ? "manual_operator" : "tool";
  const runnerResolution = {
    candidateRunnerIdsChecked: details.candidateRunnerIdsChecked || [],
    candidateRunnersChecked: details.candidateRunnersChecked || [],
    matchedRunnerIds: details.matchedRunnerIds || [],
    selectedRunnerId: details.selectedRunnerId || null,
    resolutionStatus: details.runnerResolutionStatus || (status === "blocked" ? "not_resolved" : "recorded"),
  };
  const itemDiagnostic = makeItemDiagnostic({
    item,
    status,
    result,
    packetBlocking: blocking,
    classification,
    code,
    reason: message,
    candidateRunnerIdsChecked: runnerResolution.candidateRunnerIdsChecked,
    candidateRunnersChecked: runnerResolution.candidateRunnersChecked,
    matchedRunnerIds: runnerResolution.matchedRunnerIds,
    selectedRunnerId: runnerResolution.selectedRunnerId,
    missingPath: details.missingPath || null,
    suggestedNextAction: details.suggestedNextAction,
    suggestedRunnerCatalogEntry: details.suggestedRunnerCatalogEntry,
    manualEvidenceAllowed,
  });
  const evidenceClass = result === "skipped" ? "informational" : "deterministic";
  const packet = makePacket({
    runId: ctx.runId,
    index: ctx.index,
    item,
    plan: ctx.plan,
    implementationPlanPath: ctx.implementationPlanPath,
    projectRoot: realRoot(ctx.projectRoot),
    evidenceRoot: realRoot(ctx.evidenceRoot),
    startedAt: now,
    endedAt: now,
    evidenceClass,
    layer: requireString(item.layer, "requiredItem.layer"),
    commandOrTool: {
      kind: commandKind,
      name: `delta-item-${String(item.action)}`,
      workingDirectory: realRoot(ctx.projectRoot),
      environmentSummary:
        commandKind === "manual_operator"
          ? "explicit not-applicable/non-blocking manual record; no command executed"
          : "automated verification delta registry resolution; no command executed",
      exitStatus: { kind: "not_applicable", status: result },
    },
    status,
    result,
    blocking,
    artifacts: [],
    warnings: [
      redactText(requireString(item.rationale, "requiredItem.rationale")),
      itemDiagnosticSummary(itemDiagnostic),
    ],
    ...(result === "pass" || result === "skipped"
      ? {}
      : { failureDetails: failureDetails(code, itemDiagnosticSummary(itemDiagnostic), classification) }),
    runnerResolution,
    itemDiagnostic,
    ...(ctx.rerunOf === undefined ? {} : { rerunOf: ctx.rerunOf }),
  });
  return { packet, path: await persistEvidencePacket(realRoot(ctx.evidenceRoot), packet) };
}

/** @param {unknown} requiredItems @returns {Record<string, unknown>[]} */
function readRequiredItems(requiredItems) {
  if (!Array.isArray(requiredItems) || requiredItems.some((entry) => !isRecord(entry)))
    throw new VerificationRunnerError(
      "INVALID_VERIFICATION_DELTA",
      "verificationDelta.requiredItems must be typed objects.",
    );
  return /** @type {Record<string, unknown>[]} */ (requiredItems);
}

/** @param {Record<string, unknown>[]} packets @returns {string} */
function aggregateStatus(packets) {
  if (packets.some((packet) => packet.status === "blocked")) return VERIFICATION_STATUSES.BLOCKED;
  if (packets.some((packet) => packet.status === "failed" && packet.blocking === true))
    return VERIFICATION_STATUSES.FAILED;
  if (packets.some((packet) => packet.status === "advisory_warning"))
    return VERIFICATION_STATUSES.ADVISORY_WARNING;
  return VERIFICATION_STATUSES.PASSED;
}

/** @param {Record<string, unknown>} packet @returns {Record<string, unknown>[]} */
function packetItemDiagnostics(packet) {
  const extensions = isRecord(packet.extensions) ? packet.extensions : {};
  const verification = isRecord(extensions["dev.vibe.verification"])
    ? /** @type {Record<string, unknown>} */ (extensions["dev.vibe.verification"])
    : {};
  const diagnostics = Array.isArray(verification.diagnostics) ? verification.diagnostics : [];
  return diagnostics.filter((entry) => isRecord(entry));
}

/** @param {unknown} options @returns {Promise<Record<string, unknown>>} */
export async function runVerificationPlan(options) {
  const parsed = parseOptions(options);
  const projectRoot = realRoot(parsed.projectRoot);
  const evidenceRoot = path.resolve(parsed.evidenceRoot);
  await fsp.mkdir(evidenceRoot, { recursive: true });
  const evidenceRootReal = realRoot(evidenceRoot);
  const implementationPlanPath = resolveMaybeRelative(parsed.implementationPlanPath, projectRoot);
  if (!isContained(projectRoot, implementationPlanPath))
    throw new VerificationRunnerError(
      "PATH_CONTAINMENT_DENIED",
      "implementationPlanPath must be contained under projectRoot.",
    );
  const planValidation = validateArtifactFile(implementationPlanPath, {
    kind: "implementation_plan",
  });
  if (!planValidation.ok)
    throw new VerificationRunnerError(
      "INVALID_IMPLEMENTATION_PLAN",
      "Implementation Plan failed artifact validation.",
      planValidation.errors,
    );
  const plan = /** @type {Record<string, unknown>} */ (planValidation.artifact);
  if (plan.status !== "approved")
    throw new VerificationRunnerError(
      "PLAN_NOT_APPROVED",
      "Implementation Plan status must be approved before verification can run.",
      { status: plan.status },
    );
  if (
    !isRecord(plan.verificationDelta) ||
    plan.verificationDelta.artifactKind !== "verification_delta"
  )
    throw new VerificationRunnerError(
      "INVALID_VERIFICATION_DELTA",
      "Implementation Plan must embed a Verification Delta artifact.",
    );
  const deltaValidation = validateArtifactKind("verification_delta", plan.verificationDelta);
  if (!deltaValidation.ok)
    throw new VerificationRunnerError(
      "INVALID_VERIFICATION_DELTA",
      "Embedded Verification Delta failed artifact validation.",
      deltaValidation.errors,
    );
  const requiredItems = readRequiredItems(plan.verificationDelta.requiredItems);
  /** @type {Record<string, unknown>[]} */
  const packets = [];
  /** @type {string[]} */
  const packetPaths = [];
  /** @type {Record<string, unknown>[]} */
  const failures = [];
  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const executedItems = [];
  /** @type {string[]} */
  const recordedItems = [];
  /** @type {string[]} */
  const blockedItems = [];
  /** @type {Record<string, unknown>[]} */
  const itemDiagnostics = [];
  for (const [index, item] of requiredItems.entries()) {
    const action = requireString(item.action, "requiredItem.action");
    if (!DELTA_ACTIONS.has(action))
      throw new VerificationRunnerError(
        "INVALID_VERIFICATION_DELTA",
        `Unrecognized Verification Delta action ${action}.`,
      );
    const itemId = requireString(item.id, "requiredItem.id");
    const itemCtx = {
      projectRoot,
      evidenceRoot: evidenceRootReal,
      runId: parsed.runId,
      implementationPlanPath,
      plan,
      index,
      ...(parsed.rerunOf === undefined ? {} : { rerunOf: parsed.rerunOf }),
    };
    /** @type {{packet:Record<string,unknown>,path:string}[]} */
    let outcomes = [];
    if (action === "reuse") {
      outcomes = [
        await recordNonExecuted(
          item,
          itemCtx,
          "not_run",
          "skipped",
          false,
          EVIDENCE_FAILURE_CLASSIFICATIONS.CLASSIFICATION_UNKNOWN,
          "REUSE_RECORDED",
          "Reuse item recorded without execution.",
        ),
      ];
      recordedItems.push(itemId);
    } else if (action === "not_applicable") {
      outcomes = [
        await recordNonExecuted(
          item,
          itemCtx,
          "not_run",
          "skipped",
          false,
          EVIDENCE_FAILURE_CLASSIFICATIONS.CLASSIFICATION_UNKNOWN,
          "NOT_APPLICABLE_RECORDED",
          "Not-applicable item recorded without execution.",
        ),
      ];
      recordedItems.push(itemId);
    } else if (action === "blocked") {
      outcomes = [
        await recordNonExecuted(
          item,
          itemCtx,
          "blocked",
          "blocked",
          true,
          EVIDENCE_FAILURE_CLASSIFICATIONS.BLOCKED_PREREQUISITE,
          "BLOCKED_PREREQUISITE",
          stringValue(item.blockedBy) ||
            "Required Verification Delta item is blocked by prerequisite.",
        ),
      ];
      blockedItems.push(itemId);
    } else {
      /** @type {Record<string, unknown>[]} */
      let runners = [];
      const candidates = describeCatalogCandidates(parsed.runnerCatalog, item);
      const candidateIds = candidates.map((entry) => String(entry.id));
      try {
        runners = resolveRunners(parsed.runnerCatalog, item);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Runner catalog contract failure.";
        outcomes = [
          await recordNonExecuted(
            item,
            itemCtx,
            "blocked",
            "blocked",
            true,
            EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE,
            "UNSUPPORTED_COMMAND",
            message,
            {
              candidateRunnerIdsChecked: candidateIds,
              candidateRunnersChecked: candidates,
              runnerResolutionStatus: "catalog_error",
              suggestedNextAction: `Fix the malformed runner catalog entry and rerun item ${itemId}; runner entries must normalize before matching by layer/id/requiredItemIds.`,
            },
          ),
        ];
        blockedItems.push(itemId);
      }
      if (outcomes.length === 0 && runners.length === 0) {
        const itemLayer = requireString(item.layer, "requiredItem.layer");
        const missingReason = `No runner catalog entry matched required item id="${itemId}" layer="${itemLayer}" action="${action}" blocking=${String(requiredItemBlocking(item, true))}. Checked runner ids: ${JSON.stringify(candidateIds)}. A match requires the same layer plus id="${itemId}", id="${itemLayer}:${itemId}", or requiredItemIds containing "${itemId}".`;
        outcomes = [
          await recordNonExecuted(
            item,
            itemCtx,
            "blocked",
            "blocked",
            true,
            EVIDENCE_FAILURE_CLASSIFICATIONS.MISSING_RUNNER_OR_PREREQUISITE,
            "MISSING_RUNNER_OR_PREREQUISITE",
            missingReason,
            {
              candidateRunnerIdsChecked: candidateIds,
              candidateRunnersChecked: candidates,
              runnerResolutionStatus: "not_resolved",
              suggestedNextAction: `Add a runner catalog entry for item ${itemId} on layer ${itemLayer} using requiredItemIds:["${itemId}"] and executable command/validator evidence before treating this blocking add/update item as verified.`,
            },
          ),
        ];
        blockedItems.push(itemId);
      } else if (outcomes.length === 0) {
        for (const runner of runners) {
          try {
            if (runner.kind === "command")
              outcomes.push(await executeCommandRunner(runner, item, itemCtx));
            else outcomes.push(await executeValidatorRunner(runner, item, itemCtx));
            executedItems.push(itemId);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Runner contract failure.";
            const runnerId = stringValue(runner.id) || itemId;
            outcomes.push(
              await recordNonExecuted(
                item,
                itemCtx,
                "blocked",
                "blocked",
                true,
                EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE,
                "UNSUPPORTED_COMMAND",
                message,
                {
                  candidateRunnerIdsChecked: [runnerId],
                  candidateRunnersChecked: [
                    {
                      id: runnerId,
                      layer: stringValue(runner.layer),
                      kind: stringValue(runner.kind),
                      requiredItemIds: stringArrayValue(runner.requiredItemIds),
                      selectedByResolver: true,
                    },
                  ],
                  matchedRunnerIds: [runnerId],
                  selectedRunnerId: runnerId,
                  runnerResolutionStatus: "runner_contract_error",
                  suggestedNextAction: `Repair runner ${runnerId} for item ${itemId}; executable runner evidence is required for blocking add/update verification.`,
                },
              ),
            );
            blockedItems.push(itemId);
          }
        }
      }
    }
    for (const outcome of outcomes) {
      packets.push(outcome.packet);
      packetPaths.push(outcome.path);
      if (outcome.packet.status === "blocked") blockedItems.push(itemId);
      if (isRecord(outcome.packet.failureDetails)) failures.push(outcome.packet.failureDetails);
      if (Array.isArray(outcome.packet.warnings))
        warnings.push(...outcome.packet.warnings.map(String));
      itemDiagnostics.push(...packetItemDiagnostics(outcome.packet));
    }
  }
  const status = aggregateStatus(packets);
  return /** @type {Record<string, unknown>} */ (
    redactValue({
      status,
      runId: parsed.runId,
      evidencePackets: packetPaths,
      executedItems: [...new Set(executedItems)],
      recordedItems: [...new Set(recordedItems)],
      blockedItems: [...new Set(blockedItems)],
      failures,
      warnings,
      itemDiagnostics,
      ...(parsed.rerunOf === undefined ? {} : { rerunOf: parsed.rerunOf }),
    })
  );
}
