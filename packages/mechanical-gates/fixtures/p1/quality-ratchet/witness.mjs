import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateQualityRatchet } from "../../../src/p1/quality-ratchet/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASE_ROOT = path.join(__dirname, "cases");

function sha256(text) {
  return createHash("sha256").update(text.replaceAll("\r\n", "\n").replaceAll("\r", "\n")).digest("hex");
}

function surfaceFingerprint(entries) {
  return sha256(JSON.stringify([...entries].sort((left, right) => left.path.localeCompare(right.path))));
}

function identity({ path: findingPath = "src/sample.ts", symbol = "exampleFunction", structuralSignature = "function:exampleFunction:example-rule", excerpt, line = 3, tool = "example-mechanical-tool", ruleId = "example.rule" }) {
  return {
    tool,
    ruleId,
    path: findingPath,
    symbol,
    structuralSignature,
    contentHash: sha256(excerpt),
    line
  };
}

function stableIdentityId(stableIdentity) {
  return sha256(JSON.stringify({
    tool: stableIdentity.tool,
    ruleId: stableIdentity.ruleId,
    path: stableIdentity.path,
    symbol: stableIdentity.symbol ?? null,
    structuralSignature: stableIdentity.structuralSignature ?? null,
    contentHash: stableIdentity.contentHash
  }));
}

function findingFromIdentity(stableIdentity, excerpt, line = stableIdentity.line ?? 3) {
  return {
    tool: stableIdentity.tool,
    ruleId: stableIdentity.ruleId,
    severity: "error",
    path: stableIdentity.path,
    message: "Example mechanical debt for ratchet witness.",
    identity: { ...stableIdentity, line },
    evidence: {
      sourcePath: stableIdentity.path,
      sourceExcerpt: excerpt
    }
  };
}

async function writeJson(root, relativePath, value) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(root, relativePath, value) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, value, "utf8");
}

async function runCommand(command, args, cwd) {
  const result = await new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
  if (result.exitCode !== 0) {
    throw new Error(`Command failed (${result.exitCode}): ${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

async function makeCase(name, configure = {}) {
  const root = path.join(CASE_ROOT, name);
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });

  const excerpt = configure.excerpt ?? "export function exampleFunction(value) {\n  return value + 1;\n}";
  const sourceText = configure.sourceText ?? `const prefix = true;\n\n${excerpt}\n\nexport const after = prefix;\n`;
  await writeText(root, "src/sample.ts", sourceText);
  const sourceEntry = { path: "src/sample.ts", sha256: sha256(sourceText) };
  const fingerprint = surfaceFingerprint([sourceEntry]);
  const stableIdentity = configure.identity ?? identity({ excerpt, line: configure.line ?? 3 });
  const currentFinding = configure.finding ?? findingFromIdentity(stableIdentity, excerpt, configure.currentLine ?? stableIdentity.line ?? 3);
  if (configure.findingEvidenceExtra && currentFinding.evidence && typeof currentFinding.evidence === "object") Object.assign(currentFinding.evidence, configure.findingEvidenceExtra);
  const baselineRow = { identity: { ...stableIdentity, line: configure.baselineLine ?? stableIdentity.line ?? 3 }, message: "Existing baseline debt.", firstSeen: "2026-06-26T00:00:00.000Z", evidence: { sourcePath: configure.baselineEvidenceSourcePath ?? "src/sample.ts", ...(configure.baselineEvidenceExtra ?? {}) } };
  const baselineDebt = configure.baselineDebt ?? (configure.includeBaseline === false ? [] : [baselineRow]);
  const currentFindings = configure.currentFindings ?? (configure.includeFinding === false ? [] : [currentFinding]);
  const approvals = configure.approvals ?? [];

  const surface = {
    schemaVersion: "quality-ratchet.surface-fingerprint/1",
    family: "p1.quality-ratchet",
    fingerprint: configure.surfaceFingerprintOverride ?? fingerprint,
    entries: configure.surfaceEntries ?? [sourceEntry]
  };
  const baseline = configure.baselineOverride ?? {
    schemaVersion: "quality-ratchet.baseline/1",
    family: "p1.quality-ratchet",
    surfaceFingerprint: configure.baselineSurfaceFingerprintOverride ?? fingerprint,
    debt: baselineDebt
  };
  const findingCarrier = configure.findingCarrierOverride ?? {
    schemaVersion: "quality-ratchet.findings/1",
    family: "p1.quality-ratchet",
    surfaceFingerprint: configure.findingSurfaceFingerprintOverride ?? fingerprint,
    sourceFingerprintPath: "surface-fingerprint.json",
    runnerEvidencePath: "runner-evidence.json",
    findings: currentFindings
  };
  const approvalCarrier = configure.approvalOverride ?? {
    schemaVersion: "quality-ratchet.approvals/1",
    family: "p1.quality-ratchet",
    approvals
  };
  const runnerEvidence = configure.runnerEvidenceOverride ?? {
    schemaVersion: "quality-ratchet.runner-evidence/1",
    family: "p1.quality-ratchet",
    runnerId: "example-quality-tool",
    status: "completed",
    command: "example-quality-tool --json quality-ratchet.findings.json",
    findingCarrierPath: "findings.json",
    surfaceFingerprintPath: "surface-fingerprint.json",
    sourceFiles: configure.runnerSourceFiles ?? ["src/sample.ts"]
  };

  await writeJson(root, "baseline.json", baseline);
  await writeJson(root, "findings.json", findingCarrier);
  await writeJson(root, "approvals.json", approvalCarrier);
  await writeJson(root, "surface-fingerprint.json", surface);
  await writeJson(root, "runner-evidence.json", runnerEvidence);
  for (const approval of approvals) {
    const defaultApprovalEvidence = {
      schemaVersion: "quality-ratchet.approval-evidence/1",
      family: "p1.quality-ratchet",
      kind: approval.kind,
      identity: approval.identity,
      approved: true,
      approvedBy: approval.approvedBy,
      reason: approval.reason
    };
    const approvalEvidence = configure.approvalEvidenceByPath && Object.prototype.hasOwnProperty.call(configure.approvalEvidenceByPath, approval.evidencePath)
      ? configure.approvalEvidenceByPath[approval.evidencePath]
      : defaultApprovalEvidence;
    if (approvalEvidence === null) continue;
    if (typeof approvalEvidence === "string") await writeText(root, approval.evidencePath, approvalEvidence);
    else await writeJson(root, approval.evidencePath, approvalEvidence);
  }
  if (configure.previousBaseline) await writeJson(root, "previous-baseline.json", configure.previousBaseline(fingerprint, stableIdentity, baselineRow));
  return { root, fingerprint, stableIdentity, baselineRow, currentFinding, excerpt };
}

async function runCase(name, expectedOk, expectedRuleIds, options = {}) {
  const projectRoot = path.join(CASE_ROOT, name);
  const result = await validateQualityRatchet(projectRoot, {
    baselinePath: "baseline.json",
    findingCarrierPath: "findings.json",
    approvalPath: "approvals.json",
    surfaceFingerprintPath: "surface-fingerprint.json",
    runnerEvidencePath: "runner-evidence.json",
    ...options
  });
  assert.equal(result.family, "p1.quality-ratchet", `${name}: family`);
  assert.equal(result.ok, expectedOk, `${name}: ok mismatch: ${JSON.stringify(result.findings, null, 2)}`);
  for (const ruleId of expectedRuleIds) {
    assert.ok(result.findings.some((finding) => finding.ruleId === ruleId), `${name}: expected rule ${ruleId}; got ${result.findings.map((finding) => finding.ruleId).join(",")}`);
  }
  return result;
}

async function prepareCases() {
  await rm(CASE_ROOT, { recursive: true, force: true });
  await mkdir(CASE_ROOT, { recursive: true });

  await makeCase("zero-debt-new-repo", { includeBaseline: false, includeFinding: false });
  await makeCase("unchanged-baseline", {});

  const shrink = await makeCase("approved-shrink-base", {});
  await makeCase("approved-shrink", {
    includeFinding: false,
    approvals: [{ kind: "shrink", identity: shrink.stableIdentity, approvedBy: "operator", reason: "Debt removed by source change; approval records baseline shrink.", evidencePath: "approvals/shrink.json" }]
  });

  await makeCase("line-movement", {
    baselineLine: 3,
    currentLine: 30,
    sourceText: "// unrelated header\n// unrelated line\n// unrelated line\n// unrelated line\n\nexport function exampleFunction(value) {\n  return value + 1;\n}\n"
  });

  await makeCase("new-finding-not-in-baseline", { includeBaseline: false });
  await makeCase("stale-baseline-row", { includeFinding: false });
  const growthCase = await makeCase("baseline-growth-without-approval", {
    previousBaseline: (fingerprint) => ({ schemaVersion: "quality-ratchet.baseline/1", family: "p1.quality-ratchet", surfaceFingerprint: fingerprint, debt: [] })
  });
  assert.ok(growthCase.root);

  const approvedGrowthIdentity = identity({ excerpt: "export function exampleFunction(value) {\n  return value + 1;\n}" });
  await makeCase("approved-baseline-growth", {
    previousBaseline: (fingerprint) => ({ schemaVersion: "quality-ratchet.baseline/1", family: "p1.quality-ratchet", surfaceFingerprint: fingerprint, debt: [] }),
    approvals: [{ kind: "growth", identity: approvedGrowthIdentity, approvedBy: "operator", reason: "Operator approved baseline growth with evidence.", evidencePath: "approvals/growth.json" }]
  });

  await makeCase("invalid-baseline-schema", {
    baselineOverride: { schemaVersion: "quality-ratchet.baseline/999", family: "p1.quality-ratchet", surfaceFingerprint: "not-a-sha", debt: [] }
  });
  await makeCase("surface-fingerprint-mismatch", { baselineSurfaceFingerprintOverride: "0".repeat(64) });

  const duplicate = await makeCase("duplicate-finding-identity-base", {});
  await makeCase("duplicate-finding-identity", {
    currentFindings: [duplicate.currentFinding, { ...duplicate.currentFinding, message: "Duplicate copy" }]
  });

  const unstableExcerpt = "export function exampleFunction(value) {\n  return value + 1;\n}";
  const unstableIdentity = identity({ excerpt: unstableExcerpt });
  delete unstableIdentity.contentHash;
  await makeCase("unstable-line-only-identity", {
    identity: unstableIdentity,
    finding: {
      tool: "example-mechanical-tool",
      ruleId: "example.rule",
      severity: "error",
      path: "src/sample.ts",
      message: "Line-only identity should fail.",
      identity: { tool: "example-mechanical-tool", ruleId: "example.rule", path: "src/sample.ts", line: 3 },
      evidence: { sourcePath: "src/sample.ts", sourceExcerpt: unstableExcerpt }
    },
    baselineDebt: []
  });

  await makeCase("missing-runner-evidence", {});
  await rm(path.join(CASE_ROOT, "missing-runner-evidence", "runner-evidence.json"), { force: true });
  await makeCase("runner-sourcefile-missing", { runnerSourceFiles: ["src/missing.ts"] });
  await makeCase("runner-sourcefile-absolute", { runnerSourceFiles: [path.join(CASE_ROOT, "runner-sourcefile-absolute", "src/sample.ts")] });
  await makeCase("runner-sourcefile-omits-surface", { runnerSourceFiles: [] });
  await makeCase("runner-sourcefile-duplicate", { runnerSourceFiles: ["src/sample.ts", "src/sample.ts"] });
  await makeCase("baseline-row-source-missing", { baselineEvidenceSourcePath: "src/missing-baseline-source.ts" });
  await makeCase("baseline-row-source-absolute", { baselineEvidenceSourcePath: path.join(CASE_ROOT, "baseline-row-source-absolute", "src/sample.ts") });
  await makeCase("baseline-row-evidence-extra-field", { baselineEvidenceExtra: { parserAgreementOnly: true } });
  await makeCase("finding-evidence-extra-field", { findingEvidenceExtra: { parserAgreementOnly: true } });

  const absoluteFindingExcerpt = "export function exampleFunction(value) {\n  return value + 1;\n}";
  const absoluteFindingPath = path.join(CASE_ROOT, "finding-source-and-path-absolute", "src/sample.ts");
  const absoluteFindingIdentity = identity({ findingPath: absoluteFindingPath, excerpt: absoluteFindingExcerpt });
  await makeCase("finding-source-and-path-absolute", {
    includeBaseline: false,
    identity: absoluteFindingIdentity,
    finding: {
      tool: absoluteFindingIdentity.tool,
      ruleId: absoluteFindingIdentity.ruleId,
      severity: "error",
      path: absoluteFindingPath,
      message: "Absolute finding carrier paths should fail closed.",
      identity: absoluteFindingIdentity,
      evidence: { sourcePath: absoluteFindingPath, sourceExcerpt: absoluteFindingExcerpt }
    }
  });

  await makeCase("approval-evidence-absolute", {
    approvals: [{
      kind: "shrink",
      identity: identity({ excerpt: "export function exampleFunction(value) {\n  return value + 1;\n}" }),
      approvedBy: "operator",
      reason: "Absolute approval evidence path should fail closed.",
      evidencePath: path.join(CASE_ROOT, "approval-evidence-absolute", "approvals/shrink.json")
    }]
  });

  const approvalEvidenceExcerpt = "export function exampleFunction(value) {\n  return value + 1;\n}";
  const approvalEvidenceIdentity = identity({ excerpt: approvalEvidenceExcerpt });
  const approvalEvidenceReason = "Strict approval evidence content must match the approval entry.";
  const approvalEvidencePreviousBaseline = (fingerprint) => ({ schemaVersion: "quality-ratchet.baseline/1", family: "p1.quality-ratchet", surfaceFingerprint: fingerprint, debt: [] });
  const approvalEvidenceEntry = (overrides = {}) => ({ kind: "growth", identity: approvalEvidenceIdentity, approvedBy: "operator", reason: approvalEvidenceReason, evidencePath: "approvals/growth.json", ...overrides });
  const approvalEvidenceArtifact = (overrides = {}) => ({
    schemaVersion: "quality-ratchet.approval-evidence/1",
    family: "p1.quality-ratchet",
    kind: "growth",
    identity: approvalEvidenceIdentity,
    approved: true,
    approvedBy: "operator",
    reason: approvalEvidenceReason,
    ...overrides
  });
  const approvalEvidenceCase = async (name, approvalEvidenceByPath, approvalOverrides = {}) => makeCase(name, {
    previousBaseline: approvalEvidencePreviousBaseline,
    approvals: [approvalEvidenceEntry(approvalOverrides)],
    approvalEvidenceByPath
  });
  await approvalEvidenceCase("approval-evidence-non-json", { "approvals/growth.json": "not-json-not-typed-evidence\n" });
  await approvalEvidenceCase("approval-evidence-non-object", { "approvals/growth.json": [] });
  await approvalEvidenceCase("approval-evidence-missing", { "approvals/growth.json": null });
  await approvalEvidenceCase("approval-evidence-missing-required-field", { "approvals/growth.json": { schemaVersion: "quality-ratchet.approval-evidence/1", family: "p1.quality-ratchet", kind: "growth", identity: approvalEvidenceIdentity, approved: true, approvedBy: "operator" } });
  await approvalEvidenceCase("approval-evidence-unknown-field", { "approvals/growth.json": approvalEvidenceArtifact({ parserAgreementOnly: true }) });
  await approvalEvidenceCase("approval-evidence-wrong-schema", { "approvals/growth.json": approvalEvidenceArtifact({ schemaVersion: "quality-ratchet.approval-evidence/999" }) });
  await approvalEvidenceCase("approval-evidence-wrong-family", { "approvals/growth.json": approvalEvidenceArtifact({ family: "p1.unrelated" }) });
  await approvalEvidenceCase("approval-evidence-approved-false", { "approvals/growth.json": approvalEvidenceArtifact({ approved: false }) });
  await approvalEvidenceCase("approval-evidence-kind-mismatch", { "approvals/growth.json": approvalEvidenceArtifact({ kind: "shrink" }) });
  await approvalEvidenceCase("approval-evidence-identity-mismatch", { "approvals/growth.json": approvalEvidenceArtifact({ identity: identity({ excerpt: approvalEvidenceExcerpt, symbol: "differentFunction", structuralSignature: "function:differentFunction:example-rule" }) }) });
  await approvalEvidenceCase("approval-evidence-identity-id-mismatch", { "approvals/growth.json": { schemaVersion: "quality-ratchet.approval-evidence/1", family: "p1.quality-ratchet", kind: "growth", identityId: "0".repeat(64), approved: true, approvedBy: "operator", reason: approvalEvidenceReason } });
  await approvalEvidenceCase("approval-evidence-approved-by-mismatch", { "approvals/growth.json": approvalEvidenceArtifact({ approvedBy: "somebody-else" }) });
  await approvalEvidenceCase("approval-evidence-reason-mismatch", { "approvals/growth.json": approvalEvidenceArtifact({ reason: "Different reason" }) });
  await approvalEvidenceCase("approval-evidence-unrelated-json", { "approvals/growth.json": { schemaVersion: "quality-ratchet.approval-evidence/1", family: "p1.quality-ratchet", kind: "growth", approved: true, approvedBy: "operator", reason: approvalEvidenceReason, unrelatedReadableJson: true } });
  await approvalEvidenceCase("approval-evidence-traversal", { "../approval-evidence.json": null }, { evidencePath: "../approval-evidence.json" });

  const missingSource = await makeCase("missing-source-evidence-base", {});
  await makeCase("missing-source-evidence", {
    finding: {
      ...missingSource.currentFinding,
      evidence: { ...missingSource.currentFinding.evidence, sourcePath: "src/missing.ts" }
    },
    surfaceEntries: [{ path: "src/sample.ts", sha256: sha256(`const prefix = true;\n\n${missingSource.excerpt}\n\nexport const after = prefix;\n`) }]
  });
}

async function typecheckWitness() {
  await prepareCases();
  const declaration = await readFile(path.join(__dirname, "../../../src/p1/quality-ratchet/index.d.ts"), "utf8");
  assert.match(declaration, /validateQualityRatchet\(projectRoot: string, options\?: QualityRatchetOptions\): Promise<QualityRatchetResult>/u);
  assert.doesNotMatch(declaration, /QualityRatchetFindingCarrierEntry[\s\S]*?evidence:[\s\S]*?\[key: string\]/u, "finding-carrier evidence declaration must not permit arbitrary evidence keys");
  const repoRoot = path.resolve(__dirname, "../../../../..");
  await runCommand(path.join(repoRoot, "node_modules/.bin/tsc"), [
    "--noEmit",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict",
    "--skipLibCheck", "false",
    path.join(__dirname, "type-consumer-negative-extra-evidence.ts")
  ], repoRoot);
  const result = await runCase("zero-debt-new-repo", true, []);
  assert.equal(typeof result.projectRoot, "string");
  assert.ok(Array.isArray(result.findings));
  assert.ok(result.evidence && typeof result.evidence === "object");
  console.log(JSON.stringify({ ok: true, mode: "typecheck", family: result.family, witness: "quality-ratchet-export-and-result-carrier" }, null, 2));
}

async function fullWitness() {
  await prepareCases();
  const positives = [];
  positives.push(await runCase("zero-debt-new-repo", true, []));
  positives.push(await runCase("unchanged-baseline", true, []));
  const shrinkResult = await runCase("approved-shrink", true, []);
  assert.equal(shrinkResult.evidence.removedDebt.length, 1, "approved shrink emits removed-debt evidence");
  positives.push(shrinkResult);
  positives.push(await runCase("line-movement", true, []));
  const approvedGrowthResult = await runCase("approved-baseline-growth", true, [], { previousBaselinePath: "previous-baseline.json" });
  assert.equal(approvedGrowthResult.evidence.baselineGrowth[0].approved, true, "approved growth emits approved baseline-growth evidence");
  positives.push(approvedGrowthResult);

  const negatives = [];
  negatives.push(await runCase("new-finding-not-in-baseline", false, ["debt.new-finding"]));
  negatives.push(await runCase("stale-baseline-row", false, ["debt.stale-baseline-row"]));
  negatives.push(await runCase("baseline-growth-without-approval", false, ["debt.baseline-growth-unapproved"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("invalid-baseline-schema", false, ["baseline.schema-invalid"]));
  negatives.push(await runCase("surface-fingerprint-mismatch", false, ["surface.fingerprint-mismatch"]));
  negatives.push(await runCase("duplicate-finding-identity", false, ["identity.duplicate"]));
  negatives.push(await runCase("unstable-line-only-identity", false, ["identity.unstable"]));
  const traversal = await validateQualityRatchet(path.join(CASE_ROOT, "unchanged-baseline"), {
    baselinePath: "../outside-baseline.json",
    findingCarrierPath: "findings.json",
    approvalPath: "approvals.json",
    surfaceFingerprintPath: "surface-fingerprint.json",
    runnerEvidencePath: "runner-evidence.json"
  });
  assert.equal(traversal.ok, false, "path traversal must fail closed");
  assert.ok(traversal.findings.some((finding) => finding.evidence?.errorCode === "QUALITY_RATCHET_PATH_TRAVERSAL" || finding.ruleId === "input.path-traversal" || finding.ruleId === "baseline.schema-invalid"));
  negatives.push(traversal);
  const absoluteOption = await validateQualityRatchet(path.join(CASE_ROOT, "unchanged-baseline"), {
    baselinePath: path.join(CASE_ROOT, "unchanged-baseline", "baseline.json"),
    findingCarrierPath: "findings.json",
    approvalPath: "approvals.json",
    surfaceFingerprintPath: "surface-fingerprint.json",
    runnerEvidencePath: "runner-evidence.json"
  });
  assert.equal(absoluteOption.ok, false, "absolute option path must fail closed");
  assert.ok(absoluteOption.findings.some((finding) => finding.ruleId === "input.absolute-path"));
  negatives.push(absoluteOption);
  negatives.push(await runCase("missing-runner-evidence", false, ["evidence.missing-runner"]));
  negatives.push(await runCase("runner-sourcefile-missing", false, ["evidence.missing-runner"]));
  negatives.push(await runCase("runner-sourcefile-absolute", false, ["input.absolute-path"]));
  negatives.push(await runCase("runner-sourcefile-omits-surface", false, ["evidence.missing-runner"]));
  negatives.push(await runCase("runner-sourcefile-duplicate", false, ["evidence.missing-runner"]));
  negatives.push(await runCase("baseline-row-source-missing", false, ["evidence.missing-source"]));
  negatives.push(await runCase("baseline-row-source-absolute", false, ["input.absolute-path"]));
  negatives.push(await runCase("baseline-row-evidence-extra-field", false, ["baseline.schema-invalid"]));
  negatives.push(await runCase("finding-evidence-extra-field", false, ["finding-carrier.schema-invalid"]));
  negatives.push(await runCase("finding-source-and-path-absolute", false, ["input.absolute-path"]));
  negatives.push(await runCase("approval-evidence-absolute", false, ["input.absolute-path"]));
  negatives.push(await runCase("approval-evidence-non-json", false, ["approval.evidence-invalid"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-non-object", false, ["approval.evidence-invalid"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-missing", false, ["approval.missing-evidence"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-missing-required-field", false, ["approval.evidence-invalid"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-unknown-field", false, ["approval.evidence-invalid"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-wrong-schema", false, ["approval.evidence-invalid"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-wrong-family", false, ["approval.evidence-invalid"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-approved-false", false, ["approval.evidence-invalid"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-kind-mismatch", false, ["approval.evidence-mismatch"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-identity-mismatch", false, ["approval.evidence-mismatch"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-identity-id-mismatch", false, ["approval.evidence-mismatch"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-approved-by-mismatch", false, ["approval.evidence-mismatch"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-reason-mismatch", false, ["approval.evidence-mismatch"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-unrelated-json", false, ["approval.evidence-invalid"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("approval-evidence-traversal", false, ["input.path-traversal"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runCase("missing-source-evidence", false, ["evidence.missing-source"]));

  console.log(JSON.stringify({
    ok: true,
    family: "p1.quality-ratchet",
    positives: positives.map((entry) => ({ ok: entry.ok, findings: entry.findings.length, removedDebt: entry.evidence.removedDebt?.length ?? 0 })),
    negatives: negatives.map((entry) => ({ ok: entry.ok, ruleIds: entry.findings.map((finding) => finding.ruleId) })),
    realBoundary: "actual validator consumed on-disk baseline, approval, finding-carrier, surface fingerprint, runner evidence, and source fixtures",
    stableIdentity: "line-movement passed with changed line evidence because line is excluded from identity hash"
  }, null, 2));
}

if (process.argv.includes("--typecheck")) {
  await typecheckWitness();
} else {
  await fullWitness();
}
