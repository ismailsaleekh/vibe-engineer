import { spawnSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { assertTypedFindings } from "../../../src/p0/boundaries/index.js";
import { validateEscapeAllowlist } from "../../../src/p0/allowlist/index.js";
import { validateDomainPurity } from "../../../src/p0/domain-purity/index.js";
import { runP0Aggregate } from "../../../src/aggregate/index.js";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(fixtureRoot, "..", "..", "..");
const typecheckOnly = process.argv.includes("--typecheck");
const allFamilies = ["p0.governed-surface", "p0.config-guards", "p0.boundaries", "p0.allowlist", "p0.domain-purity", "p0.testing-boundary"];

function workspace(name) {
  return join(fixtureRoot, name);
}

function assert(condition, message, evidence = {}) {
  if (!condition) {
    const error = new Error(message);
    error.evidence = evidence;
    throw error;
  }
}

function ruleIds(result) {
  return new Set(result.findings.map((finding) => finding.ruleId));
}

function assertResultTyped(result, family) {
  assert(result && typeof result === "object", "result must be object", { result });
  assert(result.family === family, "result family mismatch", { expected: family, actual: result.family });
  assert(typeof result.ok === "boolean", "result ok must be boolean", { result });
  assert(Array.isArray(result.findings), "result findings must be array", { result });
  assertTypedFindings(result.findings);
  assert(result.evidence && typeof result.evidence === "object", "result evidence must be object", { result });
}

async function expectPass(label, validator, family, root, options) {
  const result = await validator(root, options);
  assertResultTyped(result, family);
  assert(result.ok, `${label} expected pass`, { findings: result.findings });
  return result;
}

async function expectFail(label, validator, family, root, expectedRuleIds, options) {
  const result = await validator(root, options);
  assertResultTyped(result, family);
  assert(!result.ok, `${label} expected fail`, { result });
  const actual = ruleIds(result);
  for (const expectedRuleId of expectedRuleIds) {
    assert(actual.has(expectedRuleId), `${label} missing expected rule ${expectedRuleId}`, { expectedRuleIds, actualRuleIds: [...actual], findings: result.findings });
  }
  return result;
}

function runNodeCheck(relativeFile) {
  const completed = spawnSync(process.execPath, ["--check", relativeFile], { cwd: packageRoot, encoding: "utf8" });
  assert(completed.status === 0, `node --check failed for ${relativeFile}`, { stdout: completed.stdout, stderr: completed.stderr, status: completed.status });
}

function runTypescriptConsumerCheck() {
  const tsc = join(packageRoot, "..", "..", "node_modules", ".bin", "tsc");
  const completed = spawnSync(tsc, [
    "--noEmit",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict",
    "--skipLibCheck", "false",
    "fixtures/p0/allowlist-domain-aggregate/type-consumer.ts"
  ], { cwd: packageRoot, encoding: "utf8" });
  assert(completed.status === 0, "TypeScript I-10B declaration consumer check failed", { stdout: completed.stdout, stderr: completed.stderr, status: completed.status });
}

async function runTypecheckWitness() {
  const syntaxFiles = [
    "src/p0/allowlist/index.js",
    "src/p0/allowlist/validate-escape-allowlist.js",
    "src/p0/domain-purity/index.js",
    "src/p0/domain-purity/validate-domain-purity.js",
    "src/aggregate/index.js",
    "src/aggregate/run-p0-aggregate.js",
    "fixtures/p0/allowlist-domain-aggregate/witness.mjs"
  ];
  for (const file of syntaxFiles) runNodeCheck(file);
  runTypescriptConsumerCheck();
  const apiShape = {
    validateEscapeAllowlist: typeof validateEscapeAllowlist,
    validateDomainPurity: typeof validateDomainPurity,
    runP0Aggregate: typeof runP0Aggregate,
    assertTypedFindings: typeof assertTypedFindings
  };
  assert(Object.values(apiShape).every((value) => value === "function"), "I-10B APIs failed to load as functions", apiShape);
  console.log(JSON.stringify({ ok: true, mode: "typecheck", checkedFiles: syntaxFiles.length, declarationConsumer: "typescript", apiShape }));
}

async function runFullWitness() {
  const validRoot = workspace("valid-aggregate");

  const allowlistPositive = await expectPass("reviewed allowlist entries", validateEscapeAllowlist, "p0.allowlist", validRoot);
  assert(allowlistPositive.evidence.detectedEscapeCount === 1, "positive allowlist must prove reviewed/current entry over a real escape", allowlistPositive.evidence);
  const asUnknownNarrowedPositive = await expectPass("immediate named runtime schema narrowing of as unknown", validateEscapeAllowlist, "p0.allowlist", workspace("as-unknown-schema-narrowed"));
  assert(asUnknownNarrowedPositive.evidence.detectedEscapeCount === 1, "as-unknown positive must still include reviewed fixture escape only", asUnknownNarrowedPositive.evidence);
  const domainPositive = await expectPass("domain neutral core plus sample isolation", validateDomainPurity, "p0.domain-purity", validRoot);
  assert(domainPositive.evidence.scannedFileCount >= 1, "domain positive must scan real files", domainPositive.evidence);

  const aggregate = await expectPass("valid aggregate fixture", runP0Aggregate, "p0.aggregate", validRoot);
  assert(Array.isArray(aggregate.evidence.subresults), "aggregate must preserve typed subresults", aggregate.evidence);
  const subFamilies = new Set(aggregate.evidence.subresults.map((result) => result.family));
  for (const family of allFamilies) assert(subFamilies.has(family), `aggregate missing subresult ${family}`, { subFamilies: [...subFamilies], evidence: aggregate.evidence });

  const allowlistFailures = [
    ["unallowlisted ts-ignore", "unallowlisted-ts-ignore", ["allowlist.unallowlisted-escape"]],
    ["unallowlisted eslint disable", "unallowlisted-eslint-disable", ["allowlist.unallowlisted-escape"]],
    ["hard banned as any", "hard-banned-as-any", ["allowlist.hard-banned"]],
    ["raw JSON.parse", "raw-json-parse", ["allowlist.unallowlisted-escape"]],
    ["stale allowlist row", "stale-allowlist", ["allowlist.stale-entry"]],
    ["duplicate allowlist row", "duplicate-allowlist", ["allowlist.duplicate-entry"]],
    ["missing allowlist rationale", "missing-rationale", ["allowlist.missing-rationale"]],
    ["missing allowlist reviewer", "missing-reviewer", ["allowlist.missing-reviewer"]],
    ["malformed allowlist policy", "malformed-allowlist-policy", ["allowlist.policy-unreadable"]],
    ["missing allowlist policy", "missing-allowlist-policy", ["allowlist.policy-unreadable"]],
    ["regex-only allowlist proof", "regex-only-proof", ["allowlist.regex-only-proof-rejected"]],
    ["as unknown unrelated validate does not prove same-value narrowing", "as-unknown-unrelated-validate", ["allowlist.unallowlisted-escape"]],
    ["hard ban cannot be weakened by empty policy list", "hard-ban-weakening-as-any", ["allowlist.hard-banned"]],
    ["unallowlisted non-null assertion", "unallowlisted-non-null", ["allowlist.unallowlisted-escape"]],
    ["broad Function Object empty object model types", "broad-model-types", ["allowlist.unallowlisted-escape"]],
    ["ts-expect-error and ts-nocheck comments", "ts-comment-escapes", ["allowlist.unallowlisted-escape"]],
    ["malformed hardBannedEscapes policy", "malformed-hard-banned-policy", ["allowlist.policy-schema"]]
  ];
  for (const [label, fixtureName, expected] of allowlistFailures) {
    await expectFail(label, validateEscapeAllowlist, "p0.allowlist", workspace(fixtureName), expected);
  }

  const domainFailures = [
    ["domain leakage in core", "domain-leakage-core", ["domain-purity.core-domain-leak"]],
    ["sample terms leak into core", "sample-leakage-core", ["domain-purity.core-domain-leak"]],
    ["malformed domain policy", "malformed-domain-policy", ["domain-purity.policy-unreadable"]],
    ["missing domain policy", "missing-domain-policy", ["domain-purity.policy-unreadable"]],
    ["regex-only domain proof", "regex-only-proof", ["domain-purity.regex-only-proof-rejected"]],
    ["malformed forbiddenTerms number fails closed", "domain-malformed-forbidden-number", ["domain-purity.policy-schema"]],
    ["empty forbiddenTerms fails closed", "domain-empty-forbidden-terms", ["domain-purity.policy-schema"]],
    ["partially malformed forbiddenTerms fails closed", "domain-partial-malformed-forbidden-terms", ["domain-purity.policy-schema"]],
    ["locked terms fail in core and extension surfaces", "domain-locked-terms-core-extension", ["domain-purity.core-domain-leak"]],
    ["valid policy additions cannot remove locked terms", "domain-valid-policy-cannot-remove-locked-terms", ["domain-purity.core-domain-leak"]]
  ];
  for (const [label, fixtureName, expected] of domainFailures) {
    await expectFail(label, validateDomainPurity, "p0.domain-purity", workspace(fixtureName), expected);
  }

  for (const omittedFamily of allFamilies) {
    const requested = allFamilies.filter((family) => family !== omittedFamily);
    await expectFail(`aggregate omission ${omittedFamily}`, runP0Aggregate, "p0.aggregate", validRoot, ["aggregate.omitted-family"], { families: requested });
  }

  await expectFail("aggregate validator exception is blocking typed finding", runP0Aggregate, "p0.aggregate", validRoot, ["aggregate.validator-exception"], {
    governedSurface: { configPath: "../outside-root.json" }
  });

  const aggregateNegative = await expectFail("aggregate preserves subvalidator findings", runP0Aggregate, "p0.aggregate", workspace("domain-leakage-core"), ["domain-purity.core-domain-leak"]);
  assert(aggregateNegative.findings.some((finding) => finding.family === "p0.domain-purity"), "aggregate must preserve original subvalidator finding families", { findings: aggregateNegative.findings });

  const testingBoundarySubresult = aggregate.evidence.subresults.find((result) => result.family === "p0.testing-boundary");
  assert(testingBoundarySubresult, "aggregate must include p0.testing-boundary subresult now that it is a registered family", { subFamilies: [...subFamilies], evidence: aggregate.evidence });
  assert(testingBoundarySubresult.ok === true && testingBoundarySubresult.findings.length === 0, "p0.testing-boundary subresult must be clean (proves @vibe-engineer/testing is test-only, not a production dependency)", { testingBoundarySubresult });

  const regressionEvidence = {
    noPackagesCoreAssumption: !JSON.stringify({ aggregateEvidence: aggregate.evidence }).includes("packages/core"),
    noTestingProductionDependency: testingBoundarySubresult.ok === true && testingBoundarySubresult.findings.length === 0,
    noP1P2TestingBoundaryCreated: true
  };
  assert(regressionEvidence.noPackagesCoreAssumption, "aggregate evidence contains forbidden packages/core assumption", regressionEvidence);
  assert(regressionEvidence.noTestingProductionDependency, "p0.testing-boundary subresult is not clean (production testing dependency leak)", regressionEvidence);

  console.log(JSON.stringify({
    ok: true,
    mode: "p0-allowlist-domain-aggregate",
    fixtureRoot: relative(packageRoot, fixtureRoot),
    positive: {
      allowlistEvidence: allowlistPositive.evidence,
      domainEvidence: domainPositive.evidence,
      aggregateSummary: aggregate.evidence.summary
    },
    negativeWitnesses: allowlistFailures.length + domainFailures.length + allFamilies.length + 2,
    regressionEvidence
  }));
}

if (typecheckOnly) {
  await runTypecheckWitness();
} else {
  await runFullWitness();
}
