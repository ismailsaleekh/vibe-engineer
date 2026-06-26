import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createFinding, createValidatorResult } from "../../p0/boundaries/contracts.js";

export const QUALITY_RATCHET_FAMILY = "p1.quality-ratchet";
export const QUALITY_RATCHET_SCHEMA_VERSION = "quality-ratchet.baseline/1";
export const QUALITY_RATCHET_FINDING_CARRIER_VERSION = "quality-ratchet.findings/1";
export const QUALITY_RATCHET_APPROVALS_VERSION = "quality-ratchet.approvals/1";
export const QUALITY_RATCHET_APPROVAL_EVIDENCE_VERSION = "quality-ratchet.approval-evidence/1";
export const QUALITY_RATCHET_SURFACE_FINGERPRINT_VERSION = "quality-ratchet.surface-fingerprint/1";
export const QUALITY_RATCHET_RUNNER_EVIDENCE_VERSION = "quality-ratchet.runner-evidence/1";

const DEFAULT_BASELINE_PATH = "quality-ratchet.baseline.json";
const DEFAULT_FINDING_CARRIER_PATH = "quality-ratchet.findings.json";
const DEFAULT_APPROVAL_PATH = "quality-ratchet.approvals.json";
const DEFAULT_SURFACE_FINGERPRINT_PATH = "quality-ratchet.surface-fingerprint.json";
const DEFAULT_RUNNER_EVIDENCE_PATH = "quality-ratchet.runner-evidence.json";
const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const SHA_256_HEX = /^[a-f0-9]{64}$/u;

class QualityRatchetInputError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "QualityRatchetInputError";
    this.code = options.code ?? "QUALITY_RATCHET_INPUT_ERROR";
    this.path = options.path;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function normalizeLineEndings(text) {
  return text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function normalizeProjectPath(projectRoot, candidatePath) {
  if (typeof candidatePath !== "string" || candidatePath.length === 0) {
    throw new QualityRatchetInputError("Path must be a non-empty string.", { code: "QUALITY_RATCHET_PATH_INVALID", path: candidatePath });
  }
  if (path.isAbsolute(candidatePath)) {
    throw new QualityRatchetInputError(`Path must be project-relative, not absolute: ${candidatePath}`, { code: "QUALITY_RATCHET_PATH_ABSOLUTE", path: candidatePath });
  }
  const root = path.resolve(projectRoot);
  const absolute = path.resolve(root, candidatePath);
  const relativePath = path.relative(root, absolute).split(path.sep).join("/");
  if (relativePath === "" || relativePath === ".." || relativePath.startsWith("../") || path.isAbsolute(relativePath)) {
    throw new QualityRatchetInputError(`Path escapes validation root: ${candidatePath}`, { code: "QUALITY_RATCHET_PATH_TRAVERSAL", path: candidatePath });
  }
  return relativePath;
}

async function readTextFileBounded(projectRoot, relativePath, maxBytes) {
  const safePath = normalizeProjectPath(projectRoot, relativePath);
  const absolutePath = path.join(path.resolve(projectRoot), safePath);
  const metadata = await stat(absolutePath).catch((error) => {
    throw new QualityRatchetInputError(`Required file is unreadable: ${safePath}`, {
      code: "QUALITY_RATCHET_FILE_UNREADABLE",
      path: safePath,
      cause: error
    });
  });
  if (!metadata.isFile()) {
    throw new QualityRatchetInputError(`Required path is not a file: ${safePath}`, { code: "QUALITY_RATCHET_NOT_A_FILE", path: safePath });
  }
  if (metadata.size > maxBytes) {
    throw new QualityRatchetInputError(`File exceeds bounded read size ${maxBytes}: ${safePath}`, { code: "QUALITY_RATCHET_FILE_TOO_LARGE", path: safePath });
  }
  return readFile(absolutePath, "utf8");
}

async function pathExists(projectRoot, relativePath) {
  try {
    const safePath = normalizeProjectPath(projectRoot, relativePath);
    await stat(path.join(path.resolve(projectRoot), safePath));
    return true;
  } catch {
    return false;
  }
}

async function readJsonFileBounded(projectRoot, relativePath, maxBytes) {
  const safePath = normalizeProjectPath(projectRoot, relativePath);
  const text = await readTextFileBounded(projectRoot, safePath, maxBytes);
  try {
    return { path: safePath, value: JSON.parse(text), text };
  } catch (error) {
    throw new QualityRatchetInputError(`Invalid JSON in ${safePath}: ${error instanceof Error ? error.message : String(error)}`, {
      code: "QUALITY_RATCHET_INVALID_JSON",
      path: safePath,
      cause: error
    });
  }
}

function finding(ruleId, findingPath, message, evidence = {}) {
  return createFinding({ family: QUALITY_RATCHET_FAMILY, ruleId, path: findingPath, message, evidence });
}

function safeFinding(ruleId, findingPath, message, evidence = {}) {
  const normalizedPath = typeof findingPath === "string" && findingPath.length > 0 ? findingPath : ".";
  return finding(ruleId, normalizedPath, message, evidence);
}

function errorCode(error) {
  return error && typeof error === "object" && "code" in error ? error.code : undefined;
}

function pathInputRuleId(error) {
  const code = errorCode(error);
  if (code === "QUALITY_RATCHET_PATH_ABSOLUTE") return "input.absolute-path";
  if (code === "QUALITY_RATCHET_PATH_TRAVERSAL") return "input.path-traversal";
  return undefined;
}

function result(projectRoot, findings, evidence) {
  return createValidatorResult({
    family: QUALITY_RATCHET_FAMILY,
    projectRoot,
    findings,
    evidence
  });
}

function requireExactKeys(object, allowedKeys, objectPath, findings, ruleId) {
  for (const key of Object.keys(object)) {
    if (!allowedKeys.has(key)) {
      findings.push(safeFinding(ruleId, `${objectPath}#/${key}`, "Unknown schema field fails closed.", { key }));
    }
  }
}

function requireString(value, fieldPath, findings, ruleId) {
  if (typeof value !== "string" || value.length === 0) {
    findings.push(safeFinding(ruleId, fieldPath, "Required field must be a non-empty string."));
    return undefined;
  }
  return value;
}

function requireStringArray(value, fieldPath, findings, ruleId) {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string" && entry.length > 0)) {
    findings.push(safeFinding(ruleId, fieldPath, "Required field must be a string array."));
    return undefined;
  }
  return value;
}

function identityFailure(pathHint, message, evidence = {}) {
  return safeFinding("identity.unstable", pathHint, message, evidence);
}

function normalizeIdentity(projectRoot, rawIdentity, contextPath, findings) {
  if (!isPlainObject(rawIdentity)) {
    findings.push(identityFailure(contextPath, "Finding identity must be a structured object."));
    return undefined;
  }
  const allowedKeys = new Set(["tool", "ruleId", "path", "symbol", "structuralSignature", "contentHash", "line"]);
  requireExactKeys(rawIdentity, allowedKeys, contextPath, findings, "identity.unstable");
  const tool = requireString(rawIdentity.tool, `${contextPath}/tool`, findings, "identity.unstable");
  const ruleId = requireString(rawIdentity.ruleId, `${contextPath}/ruleId`, findings, "identity.unstable");
  let identityPath;
  try {
    identityPath = normalizeProjectPath(projectRoot, rawIdentity.path);
  } catch (error) {
    findings.push(safeFinding(pathInputRuleId(error) ?? "input.path-traversal", contextPath, "Finding identity path must be project-relative and inside the validation root.", { errorMessage: error instanceof Error ? error.message : String(error), errorCode: errorCode(error), path: rawIdentity.path }));
  }
  const symbol = typeof rawIdentity.symbol === "string" && rawIdentity.symbol.length > 0 ? rawIdentity.symbol : undefined;
  const structuralSignature = typeof rawIdentity.structuralSignature === "string" && rawIdentity.structuralSignature.length > 0 ? rawIdentity.structuralSignature : undefined;
  const contentHash = requireString(rawIdentity.contentHash, `${contextPath}/contentHash`, findings, "identity.unstable");
  if (contentHash && !SHA_256_HEX.test(contentHash)) {
    findings.push(identityFailure(`${contextPath}/contentHash`, "Finding identity contentHash must be a sha256 hex digest.", { contentHash }));
  }
  if (!symbol && !structuralSignature) {
    findings.push(identityFailure(contextPath, "Finding identity must include a symbol or structural signature; line-only identity is rejected.", { line: rawIdentity.line ?? null }));
  }
  if (typeof rawIdentity.line !== "undefined" && (!Number.isInteger(rawIdentity.line) || rawIdentity.line < 1)) {
    findings.push(identityFailure(`${contextPath}/line`, "Optional line evidence must be a positive integer when present."));
  }
  if (!tool || !ruleId || !identityPath || !contentHash || !SHA_256_HEX.test(contentHash) || (!symbol && !structuralSignature)) return undefined;
  return Object.freeze({ tool, ruleId, path: identityPath, symbol, structuralSignature, contentHash });
}

function identityId(identity) {
  return sha256(JSON.stringify({
    tool: identity.tool,
    ruleId: identity.ruleId,
    path: identity.path,
    symbol: identity.symbol ?? null,
    structuralSignature: identity.structuralSignature ?? null,
    contentHash: identity.contentHash
  }));
}

function parseBaseline(projectRoot, raw, baselinePath, findings) {
  if (!isPlainObject(raw)) {
    findings.push(safeFinding("baseline.schema-invalid", baselinePath, "Quality ratchet baseline must be a JSON object."));
    return undefined;
  }
  requireExactKeys(raw, new Set(["schemaVersion", "family", "surfaceFingerprint", "debt"]), baselinePath, findings, "baseline.schema-invalid");
  if (raw.schemaVersion !== QUALITY_RATCHET_SCHEMA_VERSION) findings.push(safeFinding("baseline.schema-invalid", `${baselinePath}#/schemaVersion`, "Unsupported quality ratchet baseline schema version."));
  if (raw.family !== QUALITY_RATCHET_FAMILY) findings.push(safeFinding("baseline.schema-invalid", `${baselinePath}#/family`, "Baseline family must be p1.quality-ratchet."));
  const surfaceFingerprint = requireString(raw.surfaceFingerprint, `${baselinePath}#/surfaceFingerprint`, findings, "baseline.schema-invalid");
  if (surfaceFingerprint && !SHA_256_HEX.test(surfaceFingerprint)) findings.push(safeFinding("baseline.schema-invalid", `${baselinePath}#/surfaceFingerprint`, "Baseline surface fingerprint must be a sha256 hex digest."));
  if (!Array.isArray(raw.debt)) {
    findings.push(safeFinding("baseline.schema-invalid", `${baselinePath}#/debt`, "Baseline debt must be an array."));
    return undefined;
  }
  const debt = [];
  raw.debt.forEach((row, index) => {
    const rowPath = `${baselinePath}#/debt/${index}`;
    if (!isPlainObject(row)) {
      findings.push(safeFinding("baseline.schema-invalid", rowPath, "Baseline debt row must be an object."));
      return;
    }
    requireExactKeys(row, new Set(["identity", "message", "firstSeen", "evidence"]), rowPath, findings, "baseline.schema-invalid");
    const identity = normalizeIdentity(projectRoot, row.identity, `${rowPath}/identity`, findings);
    const message = requireString(row.message, `${rowPath}/message`, findings, "baseline.schema-invalid");
    requireString(row.firstSeen, `${rowPath}/firstSeen`, findings, "baseline.schema-invalid");
    if (!isPlainObject(row.evidence)) {
      findings.push(safeFinding("baseline.schema-invalid", `${rowPath}/evidence`, "Baseline row evidence must be an object with sourcePath."));
      return;
    }
    requireExactKeys(row.evidence, new Set(["sourcePath"]), `${rowPath}/evidence`, findings, "baseline.schema-invalid");
    const sourcePathRaw = requireString(row.evidence.sourcePath, `${rowPath}/evidence/sourcePath`, findings, "baseline.schema-invalid");
    let sourcePath;
    try {
      if (sourcePathRaw) sourcePath = normalizeProjectPath(projectRoot, sourcePathRaw);
    } catch (error) {
      findings.push(safeFinding(pathInputRuleId(error) ?? "input.path-traversal", `${rowPath}/evidence/sourcePath`, "Baseline row source evidence path must be project-relative and inside the validation root.", { errorMessage: error instanceof Error ? error.message : String(error), errorCode: errorCode(error), path: sourcePathRaw }));
    }
    if (identity && message && sourcePath) debt.push({ identity, identityId: identityId(identity), message, rowPath, evidence: { sourcePath } });
  });
  if (!surfaceFingerprint || !SHA_256_HEX.test(surfaceFingerprint)) return undefined;
  return { surfaceFingerprint, debt };
}

function parseFindingCarrier(projectRoot, raw, carrierPath, findings) {
  if (!isPlainObject(raw)) {
    findings.push(safeFinding("finding-carrier.schema-invalid", carrierPath, "Finding carrier must be a JSON object."));
    return undefined;
  }
  requireExactKeys(raw, new Set(["schemaVersion", "family", "surfaceFingerprint", "sourceFingerprintPath", "runnerEvidencePath", "findings"]), carrierPath, findings, "finding-carrier.schema-invalid");
  if (raw.schemaVersion !== QUALITY_RATCHET_FINDING_CARRIER_VERSION) findings.push(safeFinding("finding-carrier.schema-invalid", `${carrierPath}#/schemaVersion`, "Unsupported finding carrier schema version."));
  if (raw.family !== QUALITY_RATCHET_FAMILY) findings.push(safeFinding("finding-carrier.schema-invalid", `${carrierPath}#/family`, "Finding carrier family must be p1.quality-ratchet."));
  const surfaceFingerprint = requireString(raw.surfaceFingerprint, `${carrierPath}#/surfaceFingerprint`, findings, "finding-carrier.schema-invalid");
  if (surfaceFingerprint && !SHA_256_HEX.test(surfaceFingerprint)) findings.push(safeFinding("finding-carrier.schema-invalid", `${carrierPath}#/surfaceFingerprint`, "Finding carrier surface fingerprint must be a sha256 hex digest."));
  const sourceFingerprintPath = requireString(raw.sourceFingerprintPath, `${carrierPath}#/sourceFingerprintPath`, findings, "finding-carrier.schema-invalid");
  const runnerEvidencePath = requireString(raw.runnerEvidencePath, `${carrierPath}#/runnerEvidencePath`, findings, "finding-carrier.schema-invalid");
  if (!Array.isArray(raw.findings)) {
    findings.push(safeFinding("finding-carrier.schema-invalid", `${carrierPath}#/findings`, "Finding carrier findings must be an array."));
    return undefined;
  }
  const carrierFindings = [];
  raw.findings.forEach((entry, index) => {
    const entryPath = `${carrierPath}#/findings/${index}`;
    if (!isPlainObject(entry)) {
      findings.push(safeFinding("finding-carrier.schema-invalid", entryPath, "Finding carrier entry must be an object."));
      return;
    }
    requireExactKeys(entry, new Set(["tool", "ruleId", "severity", "path", "message", "identity", "evidence"]), entryPath, findings, "finding-carrier.schema-invalid");
    const tool = requireString(entry.tool, `${entryPath}/tool`, findings, "finding-carrier.schema-invalid");
    const ruleId = requireString(entry.ruleId, `${entryPath}/ruleId`, findings, "finding-carrier.schema-invalid");
    const message = requireString(entry.message, `${entryPath}/message`, findings, "finding-carrier.schema-invalid");
    if (entry.severity !== "error" && entry.severity !== "warning") findings.push(safeFinding("finding-carrier.schema-invalid", `${entryPath}/severity`, "Finding severity must be error or warning."));
    let findingPath;
    try {
      findingPath = normalizeProjectPath(projectRoot, entry.path);
    } catch (error) {
      findings.push(safeFinding(pathInputRuleId(error) ?? "input.path-traversal", entryPath, "Finding path must be project-relative and inside the validation root.", { errorMessage: error instanceof Error ? error.message : String(error), errorCode: errorCode(error), path: entry.path }));
    }
    const identity = normalizeIdentity(projectRoot, entry.identity, `${entryPath}/identity`, findings);
    if (identity && tool && ruleId && findingPath && (identity.tool !== tool || identity.ruleId !== ruleId || identity.path !== findingPath)) {
      findings.push(safeFinding("identity.unstable", entryPath, "Finding identity must match finding tool, ruleId, and path."));
    }
    if (!isPlainObject(entry.evidence)) {
      findings.push(safeFinding("evidence.missing-source", `${entryPath}/evidence`, "Finding evidence must be an object with sourcePath and sourceExcerpt."));
      return;
    }
    requireExactKeys(entry.evidence, new Set(["sourcePath", "sourceExcerpt"]), `${entryPath}/evidence`, findings, "finding-carrier.schema-invalid");
    const sourcePathRaw = requireString(entry.evidence.sourcePath, `${entryPath}/evidence/sourcePath`, findings, "evidence.missing-source");
    const sourceExcerpt = requireString(entry.evidence.sourceExcerpt, `${entryPath}/evidence/sourceExcerpt`, findings, "evidence.missing-source");
    let sourcePath;
    try {
      if (sourcePathRaw) sourcePath = normalizeProjectPath(projectRoot, sourcePathRaw);
    } catch (error) {
      findings.push(safeFinding(pathInputRuleId(error) ?? "input.path-traversal", `${entryPath}/evidence/sourcePath`, "Finding source evidence path must be project-relative and inside the validation root.", { errorMessage: error instanceof Error ? error.message : String(error), errorCode: errorCode(error), path: sourcePathRaw }));
    }
    if (identity && sourceExcerpt && sha256(normalizeLineEndings(sourceExcerpt)) !== identity.contentHash) {
      findings.push(safeFinding("identity.unstable", entryPath, "Finding identity contentHash must match normalized source excerpt evidence."));
    }
    if (identity && tool && ruleId && message && findingPath && sourcePath && sourceExcerpt) carrierFindings.push({
      tool,
      ruleId,
      severity: entry.severity,
      blocking: entry.severity === "error",
      path: findingPath,
      message,
      identity,
      identityId: identityId(identity),
      evidence: { sourcePath, sourceExcerpt, sourceLine: entry.identity.line ?? null }
    });
  });
  if (!surfaceFingerprint || !SHA_256_HEX.test(surfaceFingerprint) || !sourceFingerprintPath || !runnerEvidencePath) return undefined;
  return { surfaceFingerprint, sourceFingerprintPath, runnerEvidencePath, findings: carrierFindings };
}

function parseApprovals(projectRoot, raw, approvalPath, findings) {
  if (!isPlainObject(raw)) {
    findings.push(safeFinding("approval.schema-invalid", approvalPath, "Approval file must be a JSON object."));
    return undefined;
  }
  requireExactKeys(raw, new Set(["schemaVersion", "family", "approvals"]), approvalPath, findings, "approval.schema-invalid");
  if (raw.schemaVersion !== QUALITY_RATCHET_APPROVALS_VERSION) findings.push(safeFinding("approval.schema-invalid", `${approvalPath}#/schemaVersion`, "Unsupported approval schema version."));
  if (raw.family !== QUALITY_RATCHET_FAMILY) findings.push(safeFinding("approval.schema-invalid", `${approvalPath}#/family`, "Approval family must be p1.quality-ratchet."));
  if (!Array.isArray(raw.approvals)) {
    findings.push(safeFinding("approval.schema-invalid", `${approvalPath}#/approvals`, "Approvals must be an array."));
    return undefined;
  }
  const approvals = [];
  raw.approvals.forEach((entry, index) => {
    const entryPath = `${approvalPath}#/approvals/${index}`;
    if (!isPlainObject(entry)) {
      findings.push(safeFinding("approval.schema-invalid", entryPath, "Approval entry must be an object."));
      return;
    }
    requireExactKeys(entry, new Set(["kind", "identity", "approvedBy", "reason", "evidencePath"]), entryPath, findings, "approval.schema-invalid");
    if (entry.kind !== "growth" && entry.kind !== "shrink") findings.push(safeFinding("approval.schema-invalid", `${entryPath}/kind`, "Approval kind must be growth or shrink."));
    const identity = normalizeIdentity(projectRoot, entry.identity, `${entryPath}/identity`, findings);
    const approvedBy = requireString(entry.approvedBy, `${entryPath}/approvedBy`, findings, "approval.schema-invalid");
    const reason = requireString(entry.reason, `${entryPath}/reason`, findings, "approval.schema-invalid");
    const evidencePathRaw = requireString(entry.evidencePath, `${entryPath}/evidencePath`, findings, "approval.schema-invalid");
    let evidencePath;
    try {
      if (evidencePathRaw) evidencePath = normalizeProjectPath(projectRoot, evidencePathRaw);
    } catch (error) {
      findings.push(safeFinding(pathInputRuleId(error) ?? "input.path-traversal", `${entryPath}/evidencePath`, "Approval evidence path must be project-relative and inside the validation root.", { errorMessage: error instanceof Error ? error.message : String(error), errorCode: errorCode(error), path: evidencePathRaw }));
    }
    if (identity && approvedBy && reason && evidencePath && (entry.kind === "growth" || entry.kind === "shrink")) approvals.push({ kind: entry.kind, identity, identityId: identityId(identity), approvedBy, reason, evidencePath, entryPath });
  });
  return approvals;
}

function parseSurfaceFingerprint(projectRoot, raw, fingerprintPath, findings) {
  if (!isPlainObject(raw)) {
    findings.push(safeFinding("surface.schema-invalid", fingerprintPath, "Surface fingerprint file must be a JSON object."));
    return undefined;
  }
  requireExactKeys(raw, new Set(["schemaVersion", "family", "fingerprint", "entries"]), fingerprintPath, findings, "surface.schema-invalid");
  if (raw.schemaVersion !== QUALITY_RATCHET_SURFACE_FINGERPRINT_VERSION) findings.push(safeFinding("surface.schema-invalid", `${fingerprintPath}#/schemaVersion`, "Unsupported surface fingerprint schema version."));
  if (raw.family !== QUALITY_RATCHET_FAMILY) findings.push(safeFinding("surface.schema-invalid", `${fingerprintPath}#/family`, "Surface fingerprint family must be p1.quality-ratchet."));
  const fingerprint = requireString(raw.fingerprint, `${fingerprintPath}#/fingerprint`, findings, "surface.schema-invalid");
  if (fingerprint && !SHA_256_HEX.test(fingerprint)) findings.push(safeFinding("surface.schema-invalid", `${fingerprintPath}#/fingerprint`, "Surface fingerprint must be a sha256 hex digest."));
  if (!Array.isArray(raw.entries) || raw.entries.length === 0) {
    findings.push(safeFinding("surface.schema-invalid", `${fingerprintPath}#/entries`, "Surface fingerprint entries must be a non-empty array."));
    return undefined;
  }
  const entries = [];
  raw.entries.forEach((entry, index) => {
    const entryPath = `${fingerprintPath}#/entries/${index}`;
    if (!isPlainObject(entry)) {
      findings.push(safeFinding("surface.schema-invalid", entryPath, "Surface fingerprint entry must be an object."));
      return;
    }
    requireExactKeys(entry, new Set(["path", "sha256"]), entryPath, findings, "surface.schema-invalid");
    let entryFilePath;
    try {
      entryFilePath = normalizeProjectPath(projectRoot, entry.path);
    } catch (error) {
      findings.push(safeFinding(pathInputRuleId(error) ?? "input.path-traversal", entryPath, "Surface fingerprint path must be project-relative and inside the validation root.", { errorMessage: error instanceof Error ? error.message : String(error), errorCode: errorCode(error), path: entry.path }));
    }
    const entryHash = requireString(entry.sha256, `${entryPath}/sha256`, findings, "surface.schema-invalid");
    if (entryHash && !SHA_256_HEX.test(entryHash)) findings.push(safeFinding("surface.schema-invalid", `${entryPath}/sha256`, "Surface entry sha256 must be a sha256 hex digest."));
    if (entryFilePath && entryHash && SHA_256_HEX.test(entryHash)) entries.push({ path: entryFilePath, sha256: entryHash });
  });
  if (!fingerprint || !SHA_256_HEX.test(fingerprint)) return undefined;
  return { fingerprint, entries: entries.sort((left, right) => left.path.localeCompare(right.path)) };
}

function parseRunnerEvidence(projectRoot, raw, evidencePath, findings) {
  if (!isPlainObject(raw)) {
    findings.push(safeFinding("evidence.missing-runner", evidencePath, "Runner evidence file must be a JSON object."));
    return undefined;
  }
  requireExactKeys(raw, new Set(["schemaVersion", "family", "runnerId", "status", "command", "findingCarrierPath", "surfaceFingerprintPath", "sourceFiles"]), evidencePath, findings, "evidence.missing-runner");
  if (raw.schemaVersion !== QUALITY_RATCHET_RUNNER_EVIDENCE_VERSION) findings.push(safeFinding("evidence.missing-runner", `${evidencePath}#/schemaVersion`, "Unsupported runner evidence schema version."));
  if (raw.family !== QUALITY_RATCHET_FAMILY) findings.push(safeFinding("evidence.missing-runner", `${evidencePath}#/family`, "Runner evidence family must be p1.quality-ratchet."));
  const runnerId = requireString(raw.runnerId, `${evidencePath}#/runnerId`, findings, "evidence.missing-runner");
  const command = requireString(raw.command, `${evidencePath}#/command`, findings, "evidence.missing-runner");
  const findingCarrierPath = requireString(raw.findingCarrierPath, `${evidencePath}#/findingCarrierPath`, findings, "evidence.missing-runner");
  const surfaceFingerprintPath = requireString(raw.surfaceFingerprintPath, `${evidencePath}#/surfaceFingerprintPath`, findings, "evidence.missing-runner");
  const sourceFilesRaw = requireStringArray(raw.sourceFiles, `${evidencePath}#/sourceFiles`, findings, "evidence.missing-runner");
  const sourceFiles = [];
  if (sourceFilesRaw) {
    for (const [index, sourceFile] of sourceFilesRaw.entries()) {
      try {
        sourceFiles.push(normalizeProjectPath(projectRoot, sourceFile));
      } catch (error) {
        findings.push(safeFinding(pathInputRuleId(error) ?? "input.path-traversal", `${evidencePath}#/sourceFiles/${index}`, "Runner evidence source file path must be project-relative and inside the validation root.", { errorMessage: error instanceof Error ? error.message : String(error), errorCode: errorCode(error), path: sourceFile }));
      }
    }
  }
  if (raw.status !== "completed") findings.push(safeFinding("evidence.missing-runner", `${evidencePath}#/status`, "Runner evidence status must be completed."));
  if (!runnerId || !command || !findingCarrierPath || !surfaceFingerprintPath || !sourceFilesRaw || sourceFiles.length !== sourceFilesRaw.length || raw.status !== "completed") return undefined;
  return { runnerId, command, findingCarrierPath, surfaceFingerprintPath, sourceFiles };
}

function approvalMap(approvals, kind) {
  const approved = new Map();
  for (const approval of approvals.filter((entry) => entry.kind === kind)) {
    approved.set(approval.identityId, approval);
  }
  return approved;
}

function duplicateIdentityFindings(entries, source, ruleId) {
  const seen = new Map();
  const duplicates = [];
  for (const entry of entries) {
    const prior = seen.get(entry.identityId);
    if (prior) {
      duplicates.push(safeFinding(ruleId, entry.identity.path, "Duplicate stable finding identity fails closed.", {
        identityId: entry.identityId,
        source,
        firstPath: prior.identity.path,
        duplicatePath: entry.identity.path,
        tool: entry.identity.tool,
        ruleId: entry.identity.ruleId
      }));
      continue;
    }
    seen.set(entry.identityId, entry);
  }
  return duplicates;
}

function approvalEvidenceReadRuleId(error) {
  const inputRuleId = pathInputRuleId(error);
  if (inputRuleId) return inputRuleId;
  const code = errorCode(error);
  if (code === "QUALITY_RATCHET_FILE_UNREADABLE" || code === "QUALITY_RATCHET_NOT_A_FILE" || code === "QUALITY_RATCHET_FILE_TOO_LARGE") return "approval.missing-evidence";
  return "approval.evidence-invalid";
}

function parseApprovalEvidenceArtifact(projectRoot, raw, evidencePath, approval, findings) {
  const initialFindingCount = findings.length;
  if (!isPlainObject(raw)) {
    findings.push(safeFinding("approval.evidence-invalid", evidencePath, "Approval evidence artifact must be a JSON object."));
    return false;
  }
  requireExactKeys(raw, new Set(["schemaVersion", "family", "kind", "identity", "identityId", "approved", "approvedBy", "reason"]), evidencePath, findings, "approval.evidence-invalid");
  if (raw.schemaVersion !== QUALITY_RATCHET_APPROVAL_EVIDENCE_VERSION) findings.push(safeFinding("approval.evidence-invalid", `${evidencePath}#/schemaVersion`, "Unsupported approval evidence schema version."));
  if (raw.family !== QUALITY_RATCHET_FAMILY) findings.push(safeFinding("approval.evidence-invalid", `${evidencePath}#/family`, "Approval evidence family must be p1.quality-ratchet."));
  if (raw.kind !== "growth" && raw.kind !== "shrink") findings.push(safeFinding("approval.evidence-invalid", `${evidencePath}#/kind`, "Approval evidence kind must be growth or shrink."));
  if ((raw.kind === "growth" || raw.kind === "shrink") && raw.kind !== approval.kind) {
    findings.push(safeFinding("approval.evidence-mismatch", `${evidencePath}#/kind`, "Approval evidence kind must match the approval entry kind.", { expected: approval.kind, actual: raw.kind }));
  }
  if (raw.approved !== true) {
    findings.push(safeFinding("approval.evidence-invalid", `${evidencePath}#/approved`, "Approval evidence must explicitly set approved: true.", { approved: raw.approved }));
  }
  const approvedBy = requireString(raw.approvedBy, `${evidencePath}#/approvedBy`, findings, "approval.evidence-invalid");
  const reason = requireString(raw.reason, `${evidencePath}#/reason`, findings, "approval.evidence-invalid");
  if (approvedBy && approvedBy !== approval.approvedBy) {
    findings.push(safeFinding("approval.evidence-mismatch", `${evidencePath}#/approvedBy`, "Approval evidence approvedBy must match the approval entry.", { expected: approval.approvedBy, actual: approvedBy }));
  }
  if (reason && reason !== approval.reason) {
    findings.push(safeFinding("approval.evidence-mismatch", `${evidencePath}#/reason`, "Approval evidence reason must match the approval entry.", { expected: approval.reason, actual: reason }));
  }

  const hasIdentity = Object.prototype.hasOwnProperty.call(raw, "identity");
  const hasIdentityId = Object.prototype.hasOwnProperty.call(raw, "identityId");
  if (!hasIdentity && !hasIdentityId) {
    findings.push(safeFinding("approval.evidence-invalid", evidencePath, "Approval evidence must include identity or identityId."));
  }
  if (hasIdentity) {
    const evidenceIdentity = normalizeIdentity(projectRoot, raw.identity, `${evidencePath}#/identity`, findings);
    if (evidenceIdentity) {
      const evidenceIdentityId = identityId(evidenceIdentity);
      if (evidenceIdentityId !== approval.identityId) {
        findings.push(safeFinding("approval.evidence-mismatch", `${evidencePath}#/identity`, "Approval evidence identity must match the approval entry identity.", { expected: approval.identityId, actual: evidenceIdentityId }));
      }
    }
  }
  if (hasIdentityId) {
    const evidenceIdentityId = requireString(raw.identityId, `${evidencePath}#/identityId`, findings, "approval.evidence-invalid");
    if (evidenceIdentityId && evidenceIdentityId !== approval.identityId) {
      findings.push(safeFinding("approval.evidence-mismatch", `${evidencePath}#/identityId`, "Approval evidence identityId must match the approval entry identity.", { expected: approval.identityId, actual: evidenceIdentityId }));
    }
  }

  return findings.length === initialFindingCount;
}

async function validateApprovalEvidence(projectRoot, approvals, maxFileBytes) {
  const findings = [];
  const validApprovals = [];
  for (const approval of approvals) {
    const before = findings.length;
    try {
      const evidenceRead = await readJsonFileBounded(projectRoot, approval.evidencePath, maxFileBytes);
      parseApprovalEvidenceArtifact(projectRoot, evidenceRead.value, evidenceRead.path, approval, findings);
    } catch (error) {
      findings.push(safeFinding(approvalEvidenceReadRuleId(error), approval.evidencePath, "Approval record must point at a readable strict JSON approval evidence artifact.", {
        kind: approval.kind,
        identityId: approval.identityId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: errorCode(error)
      }));
    }
    if (findings.length === before) validApprovals.push(approval);
  }
  return { findings, validApprovals };
}

async function validateSurfaceEntries(projectRoot, surface, maxFileBytes) {
  const findings = [];
  const actualEntries = [];
  for (const entry of surface.entries) {
    try {
      const text = await readTextFileBounded(projectRoot, entry.path, maxFileBytes);
      const actualSha = sha256(normalizeLineEndings(text));
      actualEntries.push({ path: entry.path, sha256: actualSha });
      if (actualSha !== entry.sha256) {
        findings.push(safeFinding("surface.source-hash-mismatch", entry.path, "Surface source fingerprint entry does not match the on-disk source file.", { expected: entry.sha256, actual: actualSha }));
      }
    } catch (error) {
      findings.push(safeFinding("evidence.missing-source", entry.path, "Surface fingerprint entry source file is missing or unreadable.", { errorMessage: error instanceof Error ? error.message : String(error) }));
    }
  }
  const computedFingerprint = sha256(JSON.stringify(actualEntries.sort((left, right) => left.path.localeCompare(right.path))));
  if (computedFingerprint !== surface.fingerprint) {
    findings.push(safeFinding("surface.fingerprint-mismatch", ".", "Surface fingerprint does not match its on-disk source entries.", { expected: surface.fingerprint, actual: computedFingerprint }));
  }
  return { findings, computedFingerprint };
}

async function validateFindingSourceEvidence(projectRoot, carrier, surface, maxFileBytes) {
  const findings = [];
  const surfacedPaths = new Set(surface.entries.map((entry) => entry.path));
  for (const entry of carrier.findings) {
    if (!surfacedPaths.has(entry.evidence.sourcePath)) {
      findings.push(safeFinding("evidence.missing-source", entry.evidence.sourcePath, "Finding source evidence path must be present in the surface fingerprint entries.", { identityId: entry.identityId }));
      continue;
    }
    try {
      const sourceText = normalizeLineEndings(await readTextFileBounded(projectRoot, entry.evidence.sourcePath, maxFileBytes));
      if (!sourceText.includes(normalizeLineEndings(entry.evidence.sourceExcerpt))) {
        findings.push(safeFinding("evidence.missing-source", entry.evidence.sourcePath, "Finding source excerpt must be present in the on-disk source file.", { identityId: entry.identityId }));
      }
    } catch (error) {
      findings.push(safeFinding("evidence.missing-source", entry.evidence.sourcePath, "Finding source evidence file is missing or unreadable.", { identityId: entry.identityId, errorMessage: error instanceof Error ? error.message : String(error) }));
    }
  }
  return findings;
}

async function validateBaselineSourceEvidence(projectRoot, baseline, surface, maxFileBytes) {
  const findings = [];
  const surfacedPaths = new Set(surface.entries.map((entry) => entry.path));
  for (const entry of baseline.debt) {
    if (entry.evidence.sourcePath !== entry.identity.path) {
      findings.push(safeFinding("evidence.missing-source", entry.evidence.sourcePath, "Baseline row source evidence path must match its stable identity path.", {
        identityId: entry.identityId,
        identityPath: entry.identity.path,
        sourcePath: entry.evidence.sourcePath
      }));
      continue;
    }
    if (!surfacedPaths.has(entry.evidence.sourcePath)) {
      findings.push(safeFinding("evidence.missing-source", entry.evidence.sourcePath, "Baseline row source evidence path must be present in the surface fingerprint entries.", { identityId: entry.identityId }));
      continue;
    }
    try {
      await readTextFileBounded(projectRoot, entry.evidence.sourcePath, maxFileBytes);
    } catch (error) {
      findings.push(safeFinding("evidence.missing-source", entry.evidence.sourcePath, "Baseline row source evidence file is missing or unreadable.", {
        identityId: entry.identityId,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined
      }));
    }
  }
  return findings;
}

async function validateRunnerEvidenceSourceFiles(projectRoot, runnerEvidence, carrier, surface, maxFileBytes) {
  const findings = [];
  const declaredPaths = new Set();
  const surfacedPaths = new Set(surface.entries.map((entry) => entry.path));
  const findingSourcePaths = new Set(carrier.findings.map((entry) => entry.evidence.sourcePath));

  for (const sourceFile of runnerEvidence.sourceFiles) {
    if (declaredPaths.has(sourceFile)) {
      findings.push(safeFinding("evidence.missing-runner", sourceFile, "Runner evidence sourceFiles must not contain duplicate paths.", { sourceFile }));
      continue;
    }
    declaredPaths.add(sourceFile);
    try {
      await readTextFileBounded(projectRoot, sourceFile, maxFileBytes);
    } catch (error) {
      findings.push(safeFinding("evidence.missing-runner", sourceFile, "Runner evidence sourceFiles must point at readable bounded on-disk source files.", {
        sourceFile,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined
      }));
    }
    if (!surfacedPaths.has(sourceFile)) {
      findings.push(safeFinding("evidence.missing-runner", sourceFile, "Runner evidence sourceFiles must match the consumed surface fingerprint entries.", { sourceFile }));
    }
  }

  for (const surfacePath of surfacedPaths) {
    if (!declaredPaths.has(surfacePath)) {
      findings.push(safeFinding("evidence.missing-runner", surfacePath, "Runner evidence sourceFiles must include every consumed surface fingerprint entry.", { sourceFile: surfacePath }));
    }
  }

  for (const sourcePath of findingSourcePaths) {
    if (!declaredPaths.has(sourcePath)) {
      findings.push(safeFinding("evidence.missing-runner", sourcePath, "Runner evidence sourceFiles must include every consumed finding source evidence path.", { sourceFile: sourcePath }));
    }
  }

  return findings;
}

function compareDebt({ baseline, previousBaseline, carrier, approvals }) {
  const findings = [];
  const baselineById = new Map(baseline.debt.map((entry) => [entry.identityId, entry]));
  const currentById = new Map(carrier.findings.map((entry) => [entry.identityId, entry]));
  const growthApprovals = approvalMap(approvals, "growth");
  const shrinkApprovals = approvalMap(approvals, "shrink");
  const newDebt = [];
  const staleDebt = [];
  const removedDebt = [];
  const baselineGrowth = [];
  const unchangedDebt = [];

  for (const current of carrier.findings) {
    const baselineRow = baselineById.get(current.identityId);
    if (!baselineRow) {
      newDebt.push(current);
      findings.push(safeFinding("debt.new-finding", current.path, "Current finding is not present in the quality ratchet baseline.", { identityId: current.identityId, tool: current.tool, ruleId: current.ruleId }));
      continue;
    }
    unchangedDebt.push(current);
  }

  for (const baselineRow of baseline.debt) {
    if (currentById.has(baselineRow.identityId)) continue;
    const approval = shrinkApprovals.get(baselineRow.identityId);
    if (approval) {
      removedDebt.push({ identityId: baselineRow.identityId, path: baselineRow.identity.path, ruleId: baselineRow.identity.ruleId, approvedBy: approval.approvedBy, evidencePath: approval.evidencePath });
      continue;
    }
    staleDebt.push(baselineRow);
    findings.push(safeFinding("debt.stale-baseline-row", baselineRow.identity.path, "Baseline row no longer matches a current finding and has no explicit shrink approval.", { identityId: baselineRow.identityId, tool: baselineRow.identity.tool, ruleId: baselineRow.identity.ruleId }));
  }

  if (previousBaseline) {
    const previousIds = new Set(previousBaseline.debt.map((entry) => entry.identityId));
    for (const baselineRow of baseline.debt) {
      if (previousIds.has(baselineRow.identityId)) continue;
      const approval = growthApprovals.get(baselineRow.identityId);
      baselineGrowth.push({ identityId: baselineRow.identityId, path: baselineRow.identity.path, approved: Boolean(approval), evidencePath: approval?.evidencePath });
      if (!approval) {
        findings.push(safeFinding("debt.baseline-growth-unapproved", baselineRow.identity.path, "Baseline growth compared with previous baseline requires explicit growth approval evidence.", { identityId: baselineRow.identityId, tool: baselineRow.identity.tool, ruleId: baselineRow.identity.ruleId }));
      }
    }
  }

  return { findings, newDebt, staleDebt, removedDebt, baselineGrowth, unchangedDebt };
}

function normalizeOptions(options) {
  const allowed = new Set(["baselinePath", "previousBaselinePath", "findingCarrierPath", "approvalPath", "surfaceFingerprintPath", "runnerEvidencePath", "maxFileBytes"]);
  const unknown = Object.keys(options).filter((key) => !allowed.has(key));
  if (unknown.length > 0) return { optionFindings: unknown.map((option) => safeFinding("input.unknown-option", ".", "Unknown quality ratchet validator option fails closed.", { option })) };
  return {
    baselinePath: options.baselinePath ?? DEFAULT_BASELINE_PATH,
    previousBaselinePath: options.previousBaselinePath,
    findingCarrierPath: options.findingCarrierPath ?? DEFAULT_FINDING_CARRIER_PATH,
    approvalPath: options.approvalPath ?? DEFAULT_APPROVAL_PATH,
    surfaceFingerprintPath: options.surfaceFingerprintPath ?? DEFAULT_SURFACE_FINGERPRINT_PATH,
    runnerEvidencePath: options.runnerEvidencePath ?? DEFAULT_RUNNER_EVIDENCE_PATH,
    maxFileBytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
    optionFindings: []
  };
}

async function readRequiredJson(projectRoot, filePath, maxFileBytes, ruleId, label) {
  try {
    return await readJsonFileBounded(projectRoot, filePath, maxFileBytes);
  } catch (error) {
    return {
      errorFinding: safeFinding(pathInputRuleId(error) ?? ruleId, typeof filePath === "string" && filePath.length > 0 ? filePath : ".", `${label} is missing, unreadable, malformed, or outside the validation root.`, {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: errorCode(error),
        path: filePath
      })
    };
  }
}

export async function validateQualityRatchet(projectRoot, options = {}) {
  const normalizedOptions = normalizeOptions(options);
  if (normalizedOptions.optionFindings.length > 0) {
    return result(projectRoot, normalizedOptions.optionFindings, { failClosed: true, options: Object.keys(options) });
  }
  const root = path.resolve(projectRoot);
  const maxFileBytes = normalizedOptions.maxFileBytes;
  if (!Number.isInteger(maxFileBytes) || maxFileBytes <= 0 || maxFileBytes > 1024 * 1024) {
    return result(root, [safeFinding("input.invalid-option", ".", "maxFileBytes must be a positive integer no larger than 1048576.", { maxFileBytes })], { failClosed: true });
  }

  const inputFindings = [];
  const baselineRead = await readRequiredJson(root, normalizedOptions.baselinePath, maxFileBytes, "baseline.schema-invalid", "Quality ratchet baseline");
  const carrierRead = await readRequiredJson(root, normalizedOptions.findingCarrierPath, maxFileBytes, "finding-carrier.schema-invalid", "Quality ratchet finding carrier");
  const approvalRead = await readRequiredJson(root, normalizedOptions.approvalPath, maxFileBytes, "approval.schema-invalid", "Quality ratchet approval file");
  const surfaceRead = await readRequiredJson(root, normalizedOptions.surfaceFingerprintPath, maxFileBytes, "surface.schema-invalid", "Quality ratchet surface fingerprint");
  const runnerRead = await readRequiredJson(root, normalizedOptions.runnerEvidencePath, maxFileBytes, "evidence.missing-runner", "Quality ratchet runner evidence");
  const previousBaselineRead = normalizedOptions.previousBaselinePath ? await readRequiredJson(root, normalizedOptions.previousBaselinePath, maxFileBytes, "baseline.schema-invalid", "Previous quality ratchet baseline") : undefined;

  for (const readResult of [baselineRead, carrierRead, approvalRead, surfaceRead, runnerRead, previousBaselineRead].filter(Boolean)) {
    if (readResult.errorFinding) inputFindings.push(readResult.errorFinding);
  }
  if (inputFindings.length > 0) return result(root, inputFindings, { failClosed: true });

  const schemaFindings = [];
  const baseline = parseBaseline(root, baselineRead.value, baselineRead.path, schemaFindings);
  const carrier = parseFindingCarrier(root, carrierRead.value, carrierRead.path, schemaFindings);
  const approvals = parseApprovals(root, approvalRead.value, approvalRead.path, schemaFindings);
  const surface = parseSurfaceFingerprint(root, surfaceRead.value, surfaceRead.path, schemaFindings);
  const runnerEvidence = parseRunnerEvidence(root, runnerRead.value, runnerRead.path, schemaFindings);
  const previousBaseline = previousBaselineRead ? parseBaseline(root, previousBaselineRead.value, previousBaselineRead.path, schemaFindings) : undefined;

  if (schemaFindings.length > 0 || !baseline || !carrier || !approvals || !surface || !runnerEvidence || (previousBaselineRead && !previousBaseline)) {
    return result(root, schemaFindings, {
      failClosed: true,
      artifactPaths: {
        baselinePath: baselineRead.path,
        findingCarrierPath: carrierRead.path,
        approvalPath: approvalRead.path,
        surfaceFingerprintPath: surfaceRead.path,
        runnerEvidencePath: runnerRead.path,
        previousBaselinePath: previousBaselineRead?.path
      }
    });
  }

  const findings = [];
  findings.push(...duplicateIdentityFindings(baseline.debt, "baseline", "identity.duplicate"));
  findings.push(...duplicateIdentityFindings(carrier.findings, "finding-carrier", "identity.duplicate"));
  findings.push(...duplicateIdentityFindings(approvals, "approval", "identity.duplicate-approval"));

  if (baseline.surfaceFingerprint !== surface.fingerprint) {
    findings.push(safeFinding("surface.fingerprint-mismatch", baselineRead.path, "Baseline surface fingerprint does not match the on-disk surface fingerprint carrier.", { baseline: baseline.surfaceFingerprint, surface: surface.fingerprint }));
  }
  if (carrier.surfaceFingerprint !== surface.fingerprint) {
    findings.push(safeFinding("surface.fingerprint-mismatch", carrierRead.path, "Finding carrier surface fingerprint does not match the on-disk surface fingerprint carrier.", { carrier: carrier.surfaceFingerprint, surface: surface.fingerprint }));
  }
  if (previousBaseline && previousBaseline.surfaceFingerprint !== surface.fingerprint) {
    findings.push(safeFinding("surface.fingerprint-mismatch", previousBaselineRead.path, "Previous baseline surface fingerprint must match the current surface carrier for growth comparison.", { previousBaseline: previousBaseline.surfaceFingerprint, surface: surface.fingerprint }));
  }

  let carrierSurfacePath;
  let runnerCarrierPath;
  let runnerSurfacePath;
  try { carrierSurfacePath = normalizeProjectPath(root, carrier.sourceFingerprintPath); } catch (error) { findings.push(safeFinding(pathInputRuleId(error) ?? "input.path-traversal", carrierRead.path, "Finding carrier sourceFingerprintPath must be project-relative and inside the validation root.", { errorMessage: error instanceof Error ? error.message : String(error), errorCode: errorCode(error) })); }
  try { runnerCarrierPath = normalizeProjectPath(root, runnerEvidence.findingCarrierPath); } catch (error) { findings.push(safeFinding(pathInputRuleId(error) ?? "input.path-traversal", runnerRead.path, "Runner evidence findingCarrierPath must be project-relative and inside the validation root.", { errorMessage: error instanceof Error ? error.message : String(error), errorCode: errorCode(error) })); }
  try { runnerSurfacePath = normalizeProjectPath(root, runnerEvidence.surfaceFingerprintPath); } catch (error) { findings.push(safeFinding(pathInputRuleId(error) ?? "input.path-traversal", runnerRead.path, "Runner evidence surfaceFingerprintPath must be project-relative and inside the validation root.", { errorMessage: error instanceof Error ? error.message : String(error), errorCode: errorCode(error) })); }
  if (carrierSurfacePath && carrierSurfacePath !== surfaceRead.path) findings.push(safeFinding("evidence.missing-source", carrierRead.path, "Finding carrier must reference the actual source/surface fingerprint file consumed by the validator.", { expected: surfaceRead.path, actual: carrierSurfacePath }));
  if (runnerCarrierPath && runnerCarrierPath !== carrierRead.path) findings.push(safeFinding("evidence.missing-runner", runnerRead.path, "Runner evidence must reference the actual finding carrier consumed by the validator.", { expected: carrierRead.path, actual: runnerCarrierPath }));
  if (runnerSurfacePath && runnerSurfacePath !== surfaceRead.path) findings.push(safeFinding("evidence.missing-runner", runnerRead.path, "Runner evidence must reference the actual source/surface fingerprint file consumed by the validator.", { expected: surfaceRead.path, actual: runnerSurfacePath }));

  const surfaceValidation = await validateSurfaceEntries(root, surface, maxFileBytes);
  findings.push(...surfaceValidation.findings);
  findings.push(...await validateFindingSourceEvidence(root, carrier, surface, maxFileBytes));
  findings.push(...await validateBaselineSourceEvidence(root, baseline, surface, maxFileBytes));
  findings.push(...await validateRunnerEvidenceSourceFiles(root, runnerEvidence, carrier, surface, maxFileBytes));
  const approvalEvidenceValidation = await validateApprovalEvidence(root, approvals, maxFileBytes);
  findings.push(...approvalEvidenceValidation.findings);

  const comparison = compareDebt({ baseline, previousBaseline, carrier, approvals: approvalEvidenceValidation.validApprovals });
  findings.push(...comparison.findings);

  return result(root, findings, {
    schemaVersion: "quality-ratchet.result/1",
    family: QUALITY_RATCHET_FAMILY,
    artifactPaths: {
      baselinePath: baselineRead.path,
      previousBaselinePath: previousBaselineRead?.path,
      findingCarrierPath: carrierRead.path,
      approvalPath: approvalRead.path,
      surfaceFingerprintPath: surfaceRead.path,
      runnerEvidencePath: runnerRead.path
    },
    surfaceFingerprint: {
      baseline: baseline.surfaceFingerprint,
      carrier: carrier.surfaceFingerprint,
      declared: surface.fingerprint,
      computed: surfaceValidation.computedFingerprint
    },
    runnerEvidence: {
      runnerId: runnerEvidence.runnerId,
      command: runnerEvidence.command,
      sourceFiles: runnerEvidence.sourceFiles
    },
    counts: {
      baselineDebt: baseline.debt.length,
      currentFindings: carrier.findings.length,
      approvals: approvals.length,
      previousBaselineDebt: previousBaseline?.debt.length ?? null
    },
    unchangedDebt: comparison.unchangedDebt.map((entry) => ({ identityId: entry.identityId, path: entry.path, ruleId: entry.ruleId })),
    newDebt: comparison.newDebt.map((entry) => ({ identityId: entry.identityId, path: entry.path, ruleId: entry.ruleId })),
    staleDebt: comparison.staleDebt.map((entry) => ({ identityId: entry.identityId, path: entry.identity.path, ruleId: entry.identity.ruleId })),
    removedDebt: comparison.removedDebt,
    baselineGrowth: comparison.baselineGrowth,
    stableIdentityAlgorithm: "sha256(tool,ruleId,path,symbol-or-structuralSignature,contentHash); line excluded"
  });
}
