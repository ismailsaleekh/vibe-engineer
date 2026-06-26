import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = process.cwd();
const PRODUCT_ENTRYPOINT = path.join(REPO_ROOT, "packages/mechanical-gates/src/p1/quality-ratchet/index.js");
const { validateQualityRatchet } = await import(pathToFileURL(PRODUCT_ENTRYPOINT).href);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASE_ROOT = path.join(REPO_ROOT, "packages/mechanical-gates/fixtures/p1/quality-ratchet/cases");
const SUMMARY_PATH = path.join(__dirname, "product-fixture-entrypoint-summary.json");

async function run(caseName, expectedOk, expectedRuleIds = [], extraOptions = {}) {
  const result = await validateQualityRatchet(path.join(CASE_ROOT, caseName), {
    baselinePath: "baseline.json",
    findingCarrierPath: "findings.json",
    approvalPath: "approvals.json",
    surfaceFingerprintPath: "surface-fingerprint.json",
    runnerEvidencePath: "runner-evidence.json",
    ...extraOptions,
  });
  assert.equal(result.ok, expectedOk, `${caseName}: unexpected ok ${JSON.stringify(result.findings, null, 2)}`);
  for (const ruleId of expectedRuleIds) {
    assert.ok(result.findings.some((finding) => finding.ruleId === ruleId), `${caseName}: missing ${ruleId}; got ${result.findings.map((finding) => finding.ruleId).join(",")}`);
  }
  return {
    caseName,
    ok: result.ok,
    ruleIds: result.findings.map((finding) => finding.ruleId),
    artifactPaths: result.evidence.artifactPaths,
    runnerEvidence: result.evidence.runnerEvidence,
    counts: result.evidence.counts,
  };
}

const results = [];
results.push(await run("zero-debt-new-repo", true));
results.push(await run("unchanged-baseline", true));
results.push(await run("approved-shrink", true));
results.push(await run("line-movement", true));
results.push(await run("approved-baseline-growth", true, [], { previousBaselinePath: "previous-baseline.json" }));
results.push(await run("new-finding-not-in-baseline", false, ["debt.new-finding"]));
results.push(await run("stale-baseline-row", false, ["debt.stale-baseline-row"]));
results.push(await run("baseline-growth-without-approval", false, ["debt.baseline-growth-unapproved"], { previousBaselinePath: "previous-baseline.json" }));
results.push(await run("invalid-baseline-schema", false, ["baseline.schema-invalid"]));
results.push(await run("surface-fingerprint-mismatch", false, ["surface.fingerprint-mismatch"]));
results.push(await run("runner-sourcefile-missing", false, ["evidence.missing-runner"]));
results.push(await run("runner-sourcefile-absolute", false, ["input.absolute-path"]));
results.push(await run("baseline-row-source-missing", false, ["evidence.missing-source"]));
results.push(await run("baseline-row-source-absolute", false, ["input.absolute-path"]));
results.push(await run("finding-evidence-extra-field", false, ["finding-carrier.schema-invalid"]));
results.push(await run("finding-source-and-path-absolute", false, ["input.absolute-path"]));
results.push(await run("approval-evidence-absolute", false, ["input.absolute-path"]));

const summary = {
  ok: true,
  productEntrypoint: PRODUCT_ENTRYPOINT,
  productFixtureCaseRoot: CASE_ROOT,
  note: "Read-only direct entrypoint probe over product fixture carriers; product witness script was not executed because it regenerates product fixtures.",
  results,
};
await writeFile(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
