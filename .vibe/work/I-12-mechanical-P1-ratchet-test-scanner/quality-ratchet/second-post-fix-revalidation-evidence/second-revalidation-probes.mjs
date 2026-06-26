import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = process.cwd();
const PRODUCT_ENTRYPOINT = path.join(REPO_ROOT, "packages/mechanical-gates/src/p1/quality-ratchet/index.js");
const { validateQualityRatchet } = await import(pathToFileURL(PRODUCT_ENTRYPOINT).href);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASE_ROOT = path.join(__dirname, "probe-cases");
const SUMMARY_PATH = path.join(__dirname, "second-revalidation-probes-summary.json");

function sha256(text) {
  return createHash("sha256").update(text.replaceAll("\r\n", "\n").replaceAll("\r", "\n")).digest("hex");
}

function surfaceFingerprint(entries) {
  return sha256(JSON.stringify([...entries].sort((left, right) => left.path.localeCompare(right.path))));
}

function identity({ findingPath = "src/sample.ts", symbol = "sampleFunction", structuralSignature = "function:sampleFunction:quality-ratchet", excerpt, line = 3, tool = "example-mechanical-tool", ruleId = "example.rule" }) {
  const output = { tool, ruleId, path: findingPath, symbol, structuralSignature, contentHash: sha256(excerpt), line };
  if (symbol === null) delete output.symbol;
  if (structuralSignature === null) delete output.structuralSignature;
  return output;
}

function findingFromIdentity(stableIdentity, excerpt, line = stableIdentity.line ?? 3) {
  return {
    tool: stableIdentity.tool,
    ruleId: stableIdentity.ruleId,
    severity: "error",
    path: stableIdentity.path,
    message: "Example quality-ratchet debt.",
    identity: { ...stableIdentity, line },
    evidence: { sourcePath: stableIdentity.path, sourceExcerpt: excerpt }
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

async function makeCase(name, configure = {}) {
  const root = path.join(CASE_ROOT, name);
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });

  const excerpt = configure.excerpt ?? "export function sampleFunction(value) {\n  return value + 1;\n}";
  const sourceText = configure.sourceText ?? `const before = true;\n\n${excerpt}\n\nexport const after = before;\n`;
  await writeText(root, "src/sample.ts", sourceText);
  if (configure.extraFiles) {
    for (const [relativePath, text] of Object.entries(configure.extraFiles)) await writeText(root, relativePath, text);
  }

  const sourceEntry = { path: "src/sample.ts", sha256: sha256(sourceText) };
  const entries = configure.surfaceEntries ?? [sourceEntry];
  const fingerprint = configure.surfaceFingerprintOverride ?? surfaceFingerprint(entries);
  const stableIdentity = configure.identity ?? identity({ excerpt, line: configure.line ?? 3 });
  const currentFinding = configure.finding ?? findingFromIdentity(stableIdentity, excerpt, configure.currentLine ?? stableIdentity.line ?? 3);
  if (configure.findingEvidenceExtra && currentFinding.evidence && typeof currentFinding.evidence === "object") Object.assign(currentFinding.evidence, configure.findingEvidenceExtra);
  const baselineRow = {
    identity: { ...stableIdentity, line: configure.baselineLine ?? stableIdentity.line ?? 3 },
    message: "Existing baseline debt.",
    firstSeen: "2026-06-26T00:00:00.000Z",
    evidence: { sourcePath: configure.baselineEvidenceSourcePath ?? "src/sample.ts", ...(configure.baselineEvidenceExtra ?? {}) }
  };
  const baselineDebt = configure.baselineDebt ?? (configure.includeBaseline === false ? [] : [baselineRow]);
  const currentFindings = configure.currentFindings ?? (configure.includeFinding === false ? [] : [currentFinding]);
  const approvals = configure.approvals ?? [];

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
    sourceFingerprintPath: configure.carrierSourceFingerprintPath ?? "surface-fingerprint.json",
    runnerEvidencePath: configure.carrierRunnerEvidencePath ?? "runner-evidence.json",
    findings: currentFindings
  };
  const approvalCarrier = configure.approvalOverride ?? {
    schemaVersion: "quality-ratchet.approvals/1",
    family: "p1.quality-ratchet",
    approvals
  };
  const surface = configure.surfaceOverride ?? {
    schemaVersion: "quality-ratchet.surface-fingerprint/1",
    family: "p1.quality-ratchet",
    fingerprint,
    entries
  };
  const runnerEvidence = configure.runnerEvidenceOverride ?? {
    schemaVersion: "quality-ratchet.runner-evidence/1",
    family: "p1.quality-ratchet",
    runnerId: "example-quality-runner",
    status: configure.runnerStatus ?? "completed",
    command: "example-quality-runner --json findings.json",
    findingCarrierPath: configure.runnerFindingCarrierPath ?? "findings.json",
    surfaceFingerprintPath: configure.runnerSurfaceFingerprintPath ?? "surface-fingerprint.json",
    sourceFiles: configure.runnerSourceFiles ?? ["src/sample.ts"],
    ...(configure.runnerEvidenceExtra ?? {})
  };

  if (!configure.omitBaseline) await writeJson(root, "baseline.json", baseline);
  if (!configure.omitFindings) await writeJson(root, "findings.json", findingCarrier);
  await writeJson(root, "approvals.json", approvalCarrier);
  await writeJson(root, "surface-fingerprint.json", surface);
  if (!configure.omitRunnerEvidence) await writeJson(root, "runner-evidence.json", runnerEvidence);
  for (const approval of approvals) {
    if (configure.skipApprovalEvidenceWrite) continue;
    if (typeof approval.evidencePath === "string" && !path.isAbsolute(approval.evidencePath) && !approval.evidencePath.startsWith("..")) {
      await writeJson(root, approval.evidencePath, {
        schemaVersion: "quality-ratchet.approval-evidence/1",
        family: "p1.quality-ratchet",
        kind: approval.kind,
        identity: approval.identity,
        approved: true,
        approvedBy: approval.approvedBy,
        reason: approval.reason
      });
    }
  }
  if (configure.previousBaseline) await writeJson(root, "previous-baseline.json", configure.previousBaseline(fingerprint, stableIdentity, baselineRow));
  return { root, fingerprint, stableIdentity, baselineRow, currentFinding, excerpt, sourceText };
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
  assert.equal(result.ok, expectedOk, `${name}: expected ok=${expectedOk}, got ${JSON.stringify(result.findings, null, 2)}`);
  for (const ruleId of expectedRuleIds) {
    assert.ok(result.findings.some((finding) => finding.ruleId === ruleId), `${name}: expected rule ${ruleId}; got ${result.findings.map((finding) => finding.ruleId).join(",")}`);
  }
  return { name, ok: result.ok, ruleIds: result.findings.map((finding) => finding.ruleId), evidence: result.evidence };
}

async function prepareCases() {
  await rm(CASE_ROOT, { recursive: true, force: true });
  await mkdir(CASE_ROOT, { recursive: true });

  await makeCase("zero-debt-new-repo", { includeBaseline: false, includeFinding: false });
  await makeCase("unchanged-baseline", {});

  const shrink = await makeCase("approved-shrink-seed", {});
  await makeCase("approved-shrink", {
    includeFinding: false,
    approvals: [{ kind: "shrink", identity: shrink.stableIdentity, approvedBy: "operator", reason: "removed debt", evidencePath: "approvals/shrink.json" }]
  });

  await makeCase("line-movement", {
    baselineLine: 3,
    currentLine: 40,
    sourceText: `// added non-semantic line\n// added non-semantic line\n\nexport function sampleFunction(value) {\n  return value + 1;\n}\n`
  });

  await makeCase("new-finding-not-in-baseline", { includeBaseline: false });
  await makeCase("stale-baseline-row", { includeFinding: false });
  await makeCase("baseline-growth-without-approval", {
    previousBaseline: (fingerprint) => ({ schemaVersion: "quality-ratchet.baseline/1", family: "p1.quality-ratchet", surfaceFingerprint: fingerprint, debt: [] })
  });
  const growthSeed = await makeCase("approved-growth-seed", {});
  await makeCase("approved-baseline-growth", {
    previousBaseline: (fingerprint) => ({ schemaVersion: "quality-ratchet.baseline/1", family: "p1.quality-ratchet", surfaceFingerprint: fingerprint, debt: [] }),
    approvals: [{ kind: "growth", identity: growthSeed.stableIdentity, approvedBy: "operator", reason: "approved growth", evidencePath: "approvals/growth.json" }]
  });

  await makeCase("invalid-baseline-schema", {
    baselineOverride: { schemaVersion: "quality-ratchet.baseline/999", family: "p1.quality-ratchet", surfaceFingerprint: "not-a-sha", debt: [] }
  });
  await makeCase("surface-fingerprint-mismatch", { baselineSurfaceFingerprintOverride: "0".repeat(64) });
  await makeCase("surface-source-hash-mismatch", { surfaceEntries: [{ path: "src/sample.ts", sha256: "0".repeat(64) }] });

  const duplicate = await makeCase("duplicate-seed", {});
  await makeCase("duplicate-finding-identity", { currentFindings: [duplicate.currentFinding, { ...duplicate.currentFinding, message: "duplicate" }] });

  const unstableExcerpt = "export function sampleFunction(value) {\n  return value + 1;\n}";
  const unstableIdentity = identity({ excerpt: unstableExcerpt, symbol: null, structuralSignature: null });
  await makeCase("unstable-line-only-identity", {
    identity: unstableIdentity,
    finding: findingFromIdentity(unstableIdentity, unstableExcerpt),
    baselineDebt: []
  });

  await makeCase("missing-runner-evidence", { omitRunnerEvidence: true });
  await makeCase("runner-status-running", { runnerStatus: "running" });
  await makeCase("runner-evidence-extra-field", { runnerEvidenceExtra: { parserAgreementOnly: true } });
  await makeCase("runner-sourcefile-missing", { runnerSourceFiles: ["src/missing.ts"] });
  await makeCase("runner-sourcefile-omits-surface", { runnerSourceFiles: [] });
  await makeCase("runner-sourcefile-duplicate", { runnerSourceFiles: ["src/sample.ts", "src/sample.ts"] });
  await makeCase("runner-sourcefile-absolute", { runnerSourceFiles: [path.join(CASE_ROOT, "runner-sourcefile-absolute", "src/sample.ts")] });
  await makeCase("runner-carrier-ref-mismatch", { runnerFindingCarrierPath: "other-findings.json" });

  await makeCase("baseline-row-source-missing", { baselineEvidenceSourcePath: "src/missing-baseline.ts" });
  await makeCase("baseline-row-source-absolute", { baselineEvidenceSourcePath: path.join(CASE_ROOT, "baseline-row-source-absolute", "src/sample.ts") });
  await makeCase("baseline-row-source-mismatch", { baselineEvidenceSourcePath: "src/other.ts", extraFiles: { "src/other.ts": "export const other = true;\n" }, surfaceEntries: [{ path: "src/sample.ts", sha256: sha256("const before = true;\n\nexport function sampleFunction(value) {\n  return value + 1;\n}\n\nexport const after = before;\n") }, { path: "src/other.ts", sha256: sha256("export const other = true;\n") }] });
  await makeCase("baseline-row-evidence-extra-field", { baselineEvidenceExtra: { parserAgreementOnly: true } });

  await makeCase("finding-evidence-extra-field", { findingEvidenceExtra: { parserAgreementOnly: true } });
  const absoluteFindingPath = path.join(CASE_ROOT, "finding-source-and-path-absolute", "src/sample.ts");
  const absoluteIdentity = identity({ findingPath: absoluteFindingPath, excerpt: "export function sampleFunction(value) {\n  return value + 1;\n}" });
  await makeCase("finding-source-and-path-absolute", {
    includeBaseline: false,
    identity: absoluteIdentity,
    finding: findingFromIdentity(absoluteIdentity, "export function sampleFunction(value) {\n  return value + 1;\n}")
  });
  const missingSourceSeed = await makeCase("missing-source-seed", {});
  await makeCase("finding-source-missing", {
    finding: { ...missingSourceSeed.currentFinding, evidence: { ...missingSourceSeed.currentFinding.evidence, sourcePath: "src/missing.ts" } }
  });

  await makeCase("approval-missing-evidence", {
    includeFinding: false,
    approvals: [{ kind: "shrink", identity: shrink.stableIdentity, approvedBy: "operator", reason: "missing approval evidence", evidencePath: "approvals/missing.json" }],
    skipApprovalEvidenceWrite: true
  });
  await makeCase("approval-extra-field", {
    approvals: [{ kind: "shrink", identity: shrink.stableIdentity, approvedBy: "operator", reason: "extra field", evidencePath: "approvals/shrink.json", parserAgreementOnly: true }]
  });
  await makeCase("approval-evidence-traversal", {
    includeFinding: false,
    approvals: [{ kind: "shrink", identity: shrink.stableIdentity, approvedBy: "operator", reason: "traversal", evidencePath: "../approval.json" }]
  });
  await makeCase("approval-evidence-absolute", {
    includeFinding: false,
    approvals: [{ kind: "shrink", identity: shrink.stableIdentity, approvedBy: "operator", reason: "absolute", evidencePath: path.join(CASE_ROOT, "approval-evidence-absolute", "approvals/shrink.json") }]
  });

  await makeCase("previous-baseline-invalid", {
    previousBaseline: () => ({ schemaVersion: "quality-ratchet.baseline/999", family: "p1.quality-ratchet", surfaceFingerprint: "nope", debt: [] })
  });
}

await prepareCases();
const results = [];

// Positives / allowed behavior.
results.push(await runCase("zero-debt-new-repo", true, []));
results.push(await runCase("unchanged-baseline", true, []));
const shrinkResult = await runCase("approved-shrink", true, []);
assert.equal(shrinkResult.evidence.removedDebt.length, 1, "approved shrink must emit removedDebt evidence");
results.push(shrinkResult);
const lineMovement = await runCase("line-movement", true, []);
results.push(lineMovement);
const approvedGrowth = await runCase("approved-baseline-growth", true, [], { previousBaselinePath: "previous-baseline.json" });
assert.equal(approvedGrowth.evidence.baselineGrowth[0].approved, true, "approved growth must emit approved baselineGrowth evidence");
results.push(approvedGrowth);

// Required blockers / fail-closed behavior.
results.push(await runCase("new-finding-not-in-baseline", false, ["debt.new-finding"]));
results.push(await runCase("stale-baseline-row", false, ["debt.stale-baseline-row"]));
results.push(await runCase("baseline-growth-without-approval", false, ["debt.baseline-growth-unapproved"], { previousBaselinePath: "previous-baseline.json" }));
results.push(await runCase("invalid-baseline-schema", false, ["baseline.schema-invalid"]));
results.push(await runCase("surface-fingerprint-mismatch", false, ["surface.fingerprint-mismatch"]));
results.push(await runCase("surface-source-hash-mismatch", false, ["surface.source-hash-mismatch"]));
results.push(await runCase("duplicate-finding-identity", false, ["identity.duplicate"]));
results.push(await runCase("unstable-line-only-identity", false, ["identity.unstable"]));
results.push(await runCase("missing-runner-evidence", false, ["evidence.missing-runner"]));
results.push(await runCase("runner-status-running", false, ["evidence.missing-runner"]));
results.push(await runCase("runner-evidence-extra-field", false, ["evidence.missing-runner"]));
results.push(await runCase("runner-sourcefile-missing", false, ["evidence.missing-runner"]));
results.push(await runCase("runner-sourcefile-omits-surface", false, ["evidence.missing-runner"]));
results.push(await runCase("runner-sourcefile-duplicate", false, ["evidence.missing-runner"]));
results.push(await runCase("runner-sourcefile-absolute", false, ["input.absolute-path"]));
results.push(await runCase("runner-carrier-ref-mismatch", false, ["evidence.missing-runner"]));
results.push(await runCase("baseline-row-source-missing", false, ["evidence.missing-source"]));
results.push(await runCase("baseline-row-source-absolute", false, ["input.absolute-path"]));
results.push(await runCase("baseline-row-source-mismatch", false, ["evidence.missing-source"]));
results.push(await runCase("baseline-row-evidence-extra-field", false, ["baseline.schema-invalid"]));
results.push(await runCase("finding-evidence-extra-field", false, ["finding-carrier.schema-invalid"]));
results.push(await runCase("finding-source-and-path-absolute", false, ["input.absolute-path"]));
results.push(await runCase("finding-source-missing", false, ["evidence.missing-source"]));
results.push(await runCase("approval-missing-evidence", false, ["approval.missing-evidence"]));
results.push(await runCase("approval-extra-field", false, ["approval.schema-invalid"]));
results.push(await runCase("approval-evidence-traversal", false, ["input.path-traversal"]));
results.push(await runCase("approval-evidence-absolute", false, ["input.absolute-path"]));
results.push(await runCase("previous-baseline-invalid", false, ["baseline.schema-invalid"], { previousBaselinePath: "previous-baseline.json" }));

const relativeTraversal = await validateQualityRatchet(path.join(CASE_ROOT, "unchanged-baseline"), {
  baselinePath: "../outside-baseline.json",
  findingCarrierPath: "findings.json",
  approvalPath: "approvals.json",
  surfaceFingerprintPath: "surface-fingerprint.json",
  runnerEvidencePath: "runner-evidence.json"
});
assert.equal(relativeTraversal.ok, false, "relative traversal option must fail closed");
assert.ok(relativeTraversal.findings.some((finding) => finding.ruleId === "input.path-traversal"));
results.push({ name: "relative-option-traversal", ok: relativeTraversal.ok, ruleIds: relativeTraversal.findings.map((finding) => finding.ruleId), evidence: relativeTraversal.evidence });

const absoluteOption = await validateQualityRatchet(path.join(CASE_ROOT, "unchanged-baseline"), {
  baselinePath: path.join(CASE_ROOT, "unchanged-baseline", "baseline.json"),
  findingCarrierPath: "findings.json",
  approvalPath: "approvals.json",
  surfaceFingerprintPath: "surface-fingerprint.json",
  runnerEvidencePath: "runner-evidence.json"
});
assert.equal(absoluteOption.ok, false, "absolute option path must fail closed");
assert.ok(absoluteOption.findings.some((finding) => finding.ruleId === "input.absolute-path"));
results.push({ name: "absolute-option-baseline", ok: absoluteOption.ok, ruleIds: absoluteOption.findings.map((finding) => finding.ruleId), evidence: absoluteOption.evidence });

const unknownOption = await validateQualityRatchet(path.join(CASE_ROOT, "unchanged-baseline"), { unknown: true });
assert.equal(unknownOption.ok, false, "unknown option must fail closed");
assert.ok(unknownOption.findings.some((finding) => finding.ruleId === "input.unknown-option"));
results.push({ name: "unknown-option", ok: unknownOption.ok, ruleIds: unknownOption.findings.map((finding) => finding.ruleId), evidence: unknownOption.evidence });

const invalidMax = await validateQualityRatchet(path.join(CASE_ROOT, "unchanged-baseline"), { maxFileBytes: 0 });
assert.equal(invalidMax.ok, false, "invalid maxFileBytes must fail closed");
assert.ok(invalidMax.findings.some((finding) => finding.ruleId === "input.invalid-option"));
results.push({ name: "invalid-max-file-bytes", ok: invalidMax.ok, ruleIds: invalidMax.findings.map((finding) => finding.ruleId), evidence: invalidMax.evidence });

const summary = {
  ok: true,
  productEntrypoint: PRODUCT_ENTRYPOINT,
  evidenceRoot: __dirname,
  realBoundary: "actual validateQualityRatchet consumed validation-owned on-disk baseline, approval, finding-carrier, surface-fingerprint, runner-evidence, and source carriers",
  closure: {
    absolutePathsFailClosed: ["absolute-option-baseline", "runner-sourcefile-absolute", "baseline-row-source-absolute", "finding-source-and-path-absolute", "approval-evidence-absolute"].every((name) => results.find((result) => result.name === name)?.ok === false),
    originalRunnerMissingClosed: results.find((result) => result.name === "runner-sourcefile-missing")?.ok === false,
    originalBaselineMissingClosed: results.find((result) => result.name === "baseline-row-source-missing")?.ok === false
  },
  results
};

await writeFile(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
