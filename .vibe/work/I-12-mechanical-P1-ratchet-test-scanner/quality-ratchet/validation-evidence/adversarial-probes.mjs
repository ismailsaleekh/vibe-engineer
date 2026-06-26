import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateQualityRatchet } from "../../../../../packages/mechanical-gates/src/p1/quality-ratchet/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASE_ROOT = path.join(__dirname, "probe-cases");

function sha256(text) {
  return createHash("sha256").update(text.replaceAll("\r\n", "\n").replaceAll("\r", "\n")).digest("hex");
}

function surfaceFingerprint(entries) {
  return sha256(JSON.stringify([...entries].sort((left, right) => left.path.localeCompare(right.path))));
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

function baseObjects(overrides = {}) {
  const excerpt = "export function exampleFunction(value) {\n  return value + 1;\n}";
  const sourceText = `const prefix = true;\n\n${excerpt}\n\nexport const after = prefix;\n`;
  const sourceEntry = { path: "src/sample.ts", sha256: sha256(sourceText) };
  const fingerprint = surfaceFingerprint([sourceEntry]);
  const identity = {
    tool: "example-mechanical-tool",
    ruleId: "example.rule",
    path: "src/sample.ts",
    symbol: "exampleFunction",
    structuralSignature: "function:exampleFunction:example-rule",
    contentHash: sha256(excerpt),
    line: 3
  };
  const finding = {
    tool: identity.tool,
    ruleId: identity.ruleId,
    severity: "error",
    path: identity.path,
    message: "Example mechanical debt for ratchet adversarial probe.",
    identity,
    evidence: { sourcePath: "src/sample.ts", sourceExcerpt: excerpt }
  };
  const baselineRow = {
    identity,
    message: "Existing baseline debt.",
    firstSeen: "2026-06-26T00:00:00.000Z",
    evidence: { sourcePath: "src/sample.ts" }
  };
  return {
    sourceText,
    fingerprint,
    identity,
    finding,
    baselineRow,
    surface: {
      schemaVersion: "quality-ratchet.surface-fingerprint/1",
      family: "p1.quality-ratchet",
      fingerprint,
      entries: [sourceEntry]
    },
    baseline: {
      schemaVersion: "quality-ratchet.baseline/1",
      family: "p1.quality-ratchet",
      surfaceFingerprint: fingerprint,
      debt: [baselineRow]
    },
    findings: {
      schemaVersion: "quality-ratchet.findings/1",
      family: "p1.quality-ratchet",
      surfaceFingerprint: fingerprint,
      sourceFingerprintPath: "surface-fingerprint.json",
      runnerEvidencePath: "runner-evidence.json",
      findings: [finding]
    },
    approvals: {
      schemaVersion: "quality-ratchet.approvals/1",
      family: "p1.quality-ratchet",
      approvals: []
    },
    runnerEvidence: {
      schemaVersion: "quality-ratchet.runner-evidence/1",
      family: "p1.quality-ratchet",
      runnerId: "example-quality-tool",
      status: "completed",
      command: "example-quality-tool --json quality-ratchet.findings.json",
      findingCarrierPath: "findings.json",
      surfaceFingerprintPath: "surface-fingerprint.json",
      sourceFiles: ["src/sample.ts"]
    },
    ...overrides
  };
}

async function makeCase(name, mutate) {
  const root = path.join(CASE_ROOT, name);
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  const objects = baseObjects();
  mutate(objects);
  await writeText(root, "src/sample.ts", objects.sourceText);
  await writeJson(root, "baseline.json", objects.baseline);
  await writeJson(root, "findings.json", objects.findings);
  const approvalsForDisk = structuredClone(objects.approvals);
  for (const approval of approvalsForDisk.approvals ?? []) {
    const shouldWriteEvidence = approval.writeEvidence !== false;
    delete approval.writeEvidence;
    if (shouldWriteEvidence && typeof approval.evidencePath === "string" && !approval.evidencePath.startsWith("..")) {
      await writeJson(root, approval.evidencePath, { approved: true, kind: approval.kind, reason: approval.reason });
    }
  }
  await writeJson(root, "approvals.json", approvalsForDisk);
  await writeJson(root, "surface-fingerprint.json", objects.surface);
  await writeJson(root, "runner-evidence.json", objects.runnerEvidence);
  if (objects.previousBaseline) await writeJson(root, "previous-baseline.json", objects.previousBaseline);
  return root;
}

async function validateCase(name, options = {}) {
  return validateQualityRatchet(path.join(CASE_ROOT, name), {
    baselinePath: "baseline.json",
    findingCarrierPath: "findings.json",
    approvalPath: "approvals.json",
    surfaceFingerprintPath: "surface-fingerprint.json",
    runnerEvidencePath: "runner-evidence.json",
    ...options
  });
}

function hasRule(result, ruleId) {
  return result.findings.some((finding) => finding.ruleId === ruleId);
}

await rm(CASE_ROOT, { recursive: true, force: true });
await mkdir(CASE_ROOT, { recursive: true });

await makeCase("approved-growth", (objects) => {
  objects.previousBaseline = {
    schemaVersion: "quality-ratchet.baseline/1",
    family: "p1.quality-ratchet",
    surfaceFingerprint: objects.fingerprint,
    debt: []
  };
  objects.approvals.approvals = [{
    kind: "growth",
    identity: objects.identity,
    approvedBy: "independent-validator",
    reason: "Operator-approved baseline growth evidence for adversarial validation.",
    evidencePath: "approvals/growth.json"
  }];
});
const failures = [];
function expect(condition, message, detail) {
  if (!condition) failures.push({ message, detail });
}

const approvedGrowth = await validateCase("approved-growth", { previousBaselinePath: "previous-baseline.json" });
expect(approvedGrowth.ok === true, "approved growth should pass", approvedGrowth.findings);
expect(approvedGrowth.evidence.baselineGrowth?.[0]?.approved === true, "approved growth should be represented as approved baselineGrowth evidence", approvedGrowth.evidence.baselineGrowth);

await makeCase("missing-approval-evidence", (objects) => {
  objects.previousBaseline = {
    schemaVersion: "quality-ratchet.baseline/1",
    family: "p1.quality-ratchet",
    surfaceFingerprint: objects.fingerprint,
    debt: []
  };
  objects.approvals.approvals = [{
    kind: "growth",
    identity: objects.identity,
    approvedBy: "independent-validator",
    reason: "Missing approval evidence must fail closed.",
    evidencePath: "approvals/missing.json",
    writeEvidence: false
  }];
});
const missingApprovalEvidence = await validateCase("missing-approval-evidence", { previousBaselinePath: "previous-baseline.json" });
expect(missingApprovalEvidence.ok === false, "missing approval evidence should fail closed", missingApprovalEvidence.findings);
expect(hasRule(missingApprovalEvidence, "approval.missing-evidence"), "missing approval evidence should produce approval.missing-evidence", missingApprovalEvidence.findings);

await makeCase("approval-path-traversal", (objects) => {
  objects.approvals.approvals = [{
    kind: "shrink",
    identity: objects.identity,
    approvedBy: "independent-validator",
    reason: "Traversal approval evidence must fail closed.",
    evidencePath: "../outside.json",
    writeEvidence: false
  }];
});
const approvalTraversal = await validateCase("approval-path-traversal");
expect(approvalTraversal.ok === false, "approval traversal should fail closed", approvalTraversal.findings);
expect(hasRule(approvalTraversal, "input.path-traversal"), "approval traversal should produce input.path-traversal", approvalTraversal.findings);

await makeCase("runner-sourcefile-missing", (objects) => {
  objects.runnerEvidence.sourceFiles = ["src/missing.ts"];
});
const runnerSourcefileMissing = await validateCase("runner-sourcefile-missing");
expect(runnerSourcefileMissing.ok === false, "runner evidence sourceFiles pointing at missing source should fail closed", runnerSourcefileMissing.findings);
expect(hasRule(runnerSourcefileMissing, "evidence.missing-runner") || hasRule(runnerSourcefileMissing, "evidence.missing-source"), "runner sourceFiles missing source should produce evidence finding", runnerSourcefileMissing.findings);

await makeCase("baseline-row-source-missing", (objects) => {
  objects.baseline.debt[0].evidence.sourcePath = "src/missing-baseline-source.ts";
});
const baselineRowSourceMissing = await validateCase("baseline-row-source-missing");
expect(baselineRowSourceMissing.ok === false, "baseline row source evidence pointing at missing source should fail closed", baselineRowSourceMissing.findings);
expect(hasRule(baselineRowSourceMissing, "evidence.missing-source"), "baseline row missing source should produce evidence.missing-source", baselineRowSourceMissing.findings);

console.log(JSON.stringify({
  ok: failures.length === 0,
  failures,
  approvedGrowth: { ok: approvedGrowth.ok, baselineGrowth: approvedGrowth.evidence.baselineGrowth, ruleIds: approvedGrowth.findings.map((finding) => finding.ruleId) },
  missingApprovalEvidence: { ok: missingApprovalEvidence.ok, ruleIds: missingApprovalEvidence.findings.map((finding) => finding.ruleId) },
  approvalTraversal: { ok: approvalTraversal.ok, ruleIds: approvalTraversal.findings.map((finding) => finding.ruleId) },
  runnerSourcefileMissing: { ok: runnerSourcefileMissing.ok, ruleIds: runnerSourcefileMissing.findings.map((finding) => finding.ruleId) },
  baselineRowSourceMissing: { ok: baselineRowSourceMissing.ok, ruleIds: baselineRowSourceMissing.findings.map((finding) => finding.ruleId) }
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
