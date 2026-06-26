import assert from "node:assert/strict";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const probeRoot = path.join(evidenceRoot, "probe-cases");
const productCaseRoot = path.join(repoRoot, "packages/mechanical-gates/fixtures/p1/quality-ratchet/cases");
const productValidatorUrl = pathToFileURL(path.join(repoRoot, "packages/mechanical-gates/src/p1/quality-ratchet/index.js")).href;
const { validateQualityRatchet } = await import(productValidatorUrl);

function ruleIds(result) {
  return result.findings.map((finding) => finding.ruleId);
}

function assertTypedResult(label, result) {
  assert.equal(result.family, "p1.quality-ratchet", `${label}: family`);
  assert.equal(typeof result.ok, "boolean", `${label}: ok boolean`);
  assert.equal(typeof result.projectRoot, "string", `${label}: projectRoot string`);
  assert.ok(Array.isArray(result.findings), `${label}: findings array`);
  assert.ok(result.evidence && typeof result.evidence === "object" && !Array.isArray(result.evidence), `${label}: evidence object`);
  for (const finding of result.findings) {
    assert.equal(finding.family, "p1.quality-ratchet", `${label}: finding family`);
    assert.equal(typeof finding.ruleId, "string", `${label}: finding ruleId string`);
    assert.ok(finding.ruleId.length > 0, `${label}: finding ruleId non-empty`);
    assert.ok(finding.severity === "error" || finding.severity === "warning", `${label}: finding severity`);
    assert.equal(typeof finding.blocking, "boolean", `${label}: finding blocking boolean`);
    assert.equal(typeof finding.path, "string", `${label}: finding path string`);
    assert.equal(typeof finding.message, "string", `${label}: finding message string`);
    assert.ok(finding.evidence && typeof finding.evidence === "object" && !Array.isArray(finding.evidence), `${label}: finding evidence object`);
  }
}

async function runProductCase(name, expectedOk, expectedRules = [], options = {}) {
  const result = await validateQualityRatchet(path.join(productCaseRoot, name), {
    baselinePath: "baseline.json",
    findingCarrierPath: "findings.json",
    approvalPath: "approvals.json",
    surfaceFingerprintPath: "surface-fingerprint.json",
    runnerEvidencePath: "runner-evidence.json",
    ...options
  });
  assertTypedResult(name, result);
  assert.equal(result.ok, expectedOk, `${name}: expected ok=${expectedOk}; got rules ${ruleIds(result).join(",")}`);
  for (const expectedRule of expectedRules) {
    assert.ok(ruleIds(result).includes(expectedRule), `${name}: expected rule ${expectedRule}; got ${ruleIds(result).join(",")}`);
  }
  return { name, ok: result.ok, rules: ruleIds(result), evidence: result.evidence };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function copyCase(sourceName, targetName) {
  const target = path.join(probeRoot, targetName);
  await rm(target, { recursive: true, force: true });
  await cp(path.join(productCaseRoot, sourceName), target, { recursive: true });
  return target;
}

async function runProbeCase(sourceName, targetName, mutate, expectedOk, expectedRules, options = {}) {
  const root = await copyCase(sourceName, targetName);
  await mutate(root);
  const result = await validateQualityRatchet(root, {
    baselinePath: "baseline.json",
    findingCarrierPath: "findings.json",
    approvalPath: "approvals.json",
    surfaceFingerprintPath: "surface-fingerprint.json",
    runnerEvidencePath: "runner-evidence.json",
    ...options
  });
  assertTypedResult(targetName, result);
  assert.equal(result.ok, expectedOk, `${targetName}: expected ok=${expectedOk}; got rules ${ruleIds(result).join(",")}`);
  for (const expectedRule of expectedRules) {
    assert.ok(ruleIds(result).includes(expectedRule), `${targetName}: expected rule ${expectedRule}; got ${ruleIds(result).join(",")}`);
  }
  return { name: targetName, ok: result.ok, rules: ruleIds(result), evidence: result.evidence };
}

async function main() {
  await rm(probeRoot, { recursive: true, force: true });
  await mkdir(probeRoot, { recursive: true });

  const positives = [];
  positives.push(await runProductCase("zero-debt-new-repo", true));
  positives.push(await runProductCase("unchanged-baseline", true));
  const shrink = await runProductCase("approved-shrink", true);
  assert.equal(shrink.evidence.removedDebt.length, 1, "approved-shrink removedDebt evidence count");
  positives.push(shrink);
  positives.push(await runProductCase("line-movement", true));
  const approvedGrowth = await runProductCase("approved-baseline-growth", true, [], { previousBaselinePath: "previous-baseline.json" });
  assert.equal(approvedGrowth.evidence.baselineGrowth[0].approved, true, "approved growth marked approved");
  positives.push(approvedGrowth);

  const negatives = [];
  negatives.push(await runProductCase("new-finding-not-in-baseline", false, ["debt.new-finding"]));
  negatives.push(await runProductCase("stale-baseline-row", false, ["debt.stale-baseline-row"]));
  negatives.push(await runProductCase("baseline-growth-without-approval", false, ["debt.baseline-growth-unapproved"], { previousBaselinePath: "previous-baseline.json" }));
  negatives.push(await runProductCase("invalid-baseline-schema", false, ["baseline.schema-invalid"]));
  negatives.push(await runProductCase("surface-fingerprint-mismatch", false, ["surface.fingerprint-mismatch"]));
  negatives.push(await runProductCase("duplicate-finding-identity", false, ["identity.duplicate"]));
  negatives.push(await runProductCase("unstable-line-only-identity", false, ["identity.unstable"]));
  negatives.push(await runProductCase("missing-runner-evidence", false, ["evidence.missing-runner"]));
  negatives.push(await runProductCase("runner-sourcefile-missing", false, ["evidence.missing-runner"]));
  negatives.push(await runProductCase("runner-sourcefile-omits-surface", false, ["evidence.missing-runner"]));
  negatives.push(await runProductCase("runner-sourcefile-duplicate", false, ["evidence.missing-runner"]));
  negatives.push(await runProductCase("baseline-row-source-missing", false, ["evidence.missing-source"]));
  negatives.push(await runProductCase("baseline-row-evidence-extra-field", false, ["baseline.schema-invalid"]));
  negatives.push(await runProductCase("finding-evidence-extra-field", false, ["finding-carrier.schema-invalid"]));
  negatives.push(await runProductCase("missing-source-evidence", false, ["evidence.missing-source"]));

  const traversal = await validateQualityRatchet(path.join(productCaseRoot, "unchanged-baseline"), {
    baselinePath: "../outside-baseline.json",
    findingCarrierPath: "findings.json",
    approvalPath: "approvals.json",
    surfaceFingerprintPath: "surface-fingerprint.json",
    runnerEvidencePath: "runner-evidence.json"
  });
  assertTypedResult("relative traversal option", traversal);
  assert.equal(traversal.ok, false, "relative traversal option must fail");
  negatives.push({ name: "relative-traversal-option", ok: traversal.ok, rules: ruleIds(traversal), evidence: traversal.evidence });

  const absoluteOutside = await validateQualityRatchet(path.join(productCaseRoot, "unchanged-baseline"), {
    baselinePath: "/tmp/outside-quality-ratchet-baseline.json",
    findingCarrierPath: "findings.json",
    approvalPath: "approvals.json",
    surfaceFingerprintPath: "surface-fingerprint.json",
    runnerEvidencePath: "runner-evidence.json"
  });
  assertTypedResult("absolute outside option", absoluteOutside);
  assert.equal(absoluteOutside.ok, false, "absolute out-of-root option must fail");
  negatives.push({ name: "absolute-outside-option", ok: absoluteOutside.ok, rules: ruleIds(absoluteOutside), evidence: absoluteOutside.evidence });

  const adversarial = [];
  adversarial.push(await runProbeCase("unchanged-baseline", "runner-evidence-extra-field", async (root) => {
    const file = path.join(root, "runner-evidence.json");
    const json = await readJson(file);
    json.untypedExtra = true;
    await writeJson(file, json);
  }, false, ["evidence.missing-runner"]));
  adversarial.push(await runProbeCase("unchanged-baseline", "runner-wrong-carrier-path", async (root) => {
    const file = path.join(root, "runner-evidence.json");
    const json = await readJson(file);
    json.findingCarrierPath = "other-findings.json";
    await writeJson(file, json);
  }, false, ["evidence.missing-runner"]));
  adversarial.push(await runProbeCase("unchanged-baseline", "runner-wrong-surface-path", async (root) => {
    const file = path.join(root, "runner-evidence.json");
    const json = await readJson(file);
    json.surfaceFingerprintPath = "other-surface.json";
    await writeJson(file, json);
  }, false, ["evidence.missing-runner"]));
  adversarial.push(await runProbeCase("unchanged-baseline", "runner-noncompleted-status", async (root) => {
    const file = path.join(root, "runner-evidence.json");
    const json = await readJson(file);
    json.status = "failed";
    await writeJson(file, json);
  }, false, ["evidence.missing-runner"]));
  adversarial.push(await runProbeCase("unchanged-baseline", "runner-sourcefile-traversal", async (root) => {
    const file = path.join(root, "runner-evidence.json");
    const json = await readJson(file);
    json.sourceFiles = ["../escape.ts"];
    await writeJson(file, json);
  }, false, ["input.path-traversal"]));
  adversarial.push(await runProbeCase("unchanged-baseline", "baseline-evidence-path-mismatch", async (root) => {
    await writeFile(path.join(root, "src/other.ts"), "export const other = true;\n", "utf8");
    const baseline = await readJson(path.join(root, "baseline.json"));
    baseline.debt[0].evidence.sourcePath = "src/other.ts";
    await writeJson(path.join(root, "baseline.json"), baseline);
  }, false, ["evidence.missing-source"]));
  adversarial.push(await runProbeCase("unchanged-baseline", "approval-extra-field", async (root) => {
    const approvals = await readJson(path.join(root, "approvals.json"));
    const baseline = await readJson(path.join(root, "baseline.json"));
    approvals.approvals = [{ kind: "growth", identity: baseline.debt[0].identity, approvedBy: "operator", reason: "bad extra", evidencePath: "approvals/extra.json", extra: true }];
    await mkdir(path.join(root, "approvals"), { recursive: true });
    await writeJson(path.join(root, "approvals/extra.json"), { ok: true });
    await writeJson(path.join(root, "approvals.json"), approvals);
  }, false, ["approval.schema-invalid"]));
  adversarial.push(await runProbeCase("unchanged-baseline", "approval-missing-evidence", async (root) => {
    const approvals = await readJson(path.join(root, "approvals.json"));
    const baseline = await readJson(path.join(root, "baseline.json"));
    approvals.approvals = [{ kind: "growth", identity: baseline.debt[0].identity, approvedBy: "operator", reason: "missing evidence", evidencePath: "approvals/missing.json" }];
    await writeJson(path.join(root, "approvals.json"), approvals);
  }, false, ["approval.missing-evidence"]));
  adversarial.push(await runProbeCase("unchanged-baseline", "approval-evidence-traversal", async (root) => {
    const approvals = await readJson(path.join(root, "approvals.json"));
    const baseline = await readJson(path.join(root, "baseline.json"));
    approvals.approvals = [{ kind: "growth", identity: baseline.debt[0].identity, approvedBy: "operator", reason: "traversal", evidencePath: "../approval.txt" }];
    await writeJson(path.join(root, "approvals.json"), approvals);
  }, false, ["input.path-traversal"]));
  adversarial.push(await runProbeCase("unchanged-baseline", "surface-source-hash-mismatch", async (root) => {
    await writeFile(path.join(root, "src/sample.ts"), "export function exampleFunction(value) { return value + 2; }\n", "utf8");
  }, false, ["surface.source-hash-mismatch", "surface.fingerprint-mismatch"]));
  adversarial.push(await runProbeCase("unchanged-baseline", "unknown-validator-option", async () => {}, false, ["input.unknown-option"], { unexpectedOption: true }));
  adversarial.push(await runProbeCase("unchanged-baseline", "invalid-max-file-bytes", async () => {}, false, ["input.invalid-option"], { maxFileBytes: 0 }));

  const summary = {
    ok: true,
    validator: "validateQualityRatchet",
    validatorPath: "packages/mechanical-gates/src/p1/quality-ratchet/index.js",
    productFixtureRoot: "packages/mechanical-gates/fixtures/p1/quality-ratchet/cases",
    positives: positives.map((entry) => ({ name: entry.name, ok: entry.ok, removedDebt: entry.evidence.removedDebt?.length ?? 0, baselineGrowth: entry.evidence.baselineGrowth ?? [] })),
    negatives: negatives.map((entry) => ({ name: entry.name, ok: entry.ok, rules: entry.rules })),
    adversarial: adversarial.map((entry) => ({ name: entry.name, ok: entry.ok, rules: entry.rules })),
    closure: {
      originalF1_runnerSourcefileMissing: negatives.find((entry) => entry.name === "runner-sourcefile-missing"),
      originalF2_baselineRowSourceMissing: negatives.find((entry) => entry.name === "baseline-row-source-missing")
    }
  };
  await writeJson(path.join(evidenceRoot, "revalidation-probes-summary.json"), summary);
  console.log(JSON.stringify(summary, null, 2));
}

await main();
