import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(evidenceRoot, "..", "..", "..", "..", "..");
const scannerModulePath = join(repoRoot, "packages", "mechanical-gates", "src", "p1", "test-anti-pattern", "index.js");
const productFixtureRoot = join(repoRoot, "packages", "mechanical-gates", "fixtures", "p1", "test-anti-pattern", "workspaces");
const adversarialRoot = join(evidenceRoot, "adversarial-workspaces");
const resultPath = join(evidenceRoot, "i12b-second-post-fix-revalidation-witness-result.json");

const POLICY_VERSION = "i12.test-anti-pattern/1";

function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function basePolicy(overrides = {}) {
  return {
    schemaVersion: POLICY_VERSION,
    proofMode: "typescript-ast",
    testRoots: ["tests"],
    allowSkippedWithMetadata: true,
    requiredSkipMetadata: ["owner", "date", "reason"],
    normalizedSnapshotHelpers: ["normalizeVolatileOutput"],
    requiredSetupFiles: ["resources/required-resource.txt"],
    setupSentinels: [{ file: "resources/setup-sentinel.txt", contains: "ready:true" }],
    requiredSetupAssertionCalls: ["assertRequiredFixtureResource"],
    publicClaims: [{ id: "documented-behavior", claimPath: "README.md", requiredTestNameIncludes: "public claim: validates documented behavior", requiredClaimText: "documented behavior" }],
    riskyBehaviors: [{ id: "risky-parser", requiredNegativeTestNameIncludes: "rejects malformed risky input" }],
    exactCountRequired: true,
    requiredRegressionFailureShape: true,
    ...overrides
  };
}

function createWorkspace(name, { policy = basePolicy(), readme = "# Fixture\n\nThis fixture documents documented behavior.\n", testSource, resources = true }) {
  const root = join(adversarialRoot, name);
  mkdirSync(root, { recursive: true });
  writeText(join(root, "test-anti-pattern.policy.json"), JSON.stringify(policy, null, 2));
  if (readme !== undefined && readme !== null) writeText(join(root, "README.md"), readme);
  if (resources) {
    writeText(join(root, "resources", "required-resource.txt"), "fixture:present\n");
    writeText(join(root, "resources", "setup-sentinel.txt"), "ready:true\n");
  }
  writeText(join(root, "tests", "case.test.ts"), testSource);
  return root;
}

function assertTypedResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("result must be an object");
  if (result.family !== "p1.test-anti-pattern") throw new Error(`unexpected result family ${result.family}`);
  if (typeof result.ok !== "boolean") throw new Error("result ok must be boolean");
  if (!Array.isArray(result.findings)) throw new Error("result findings must be array");
  if (!result.evidence || typeof result.evidence !== "object" || Array.isArray(result.evidence)) throw new Error("result evidence must be object");
  for (const finding of result.findings) {
    for (const key of ["family", "ruleId", "severity", "blocking", "path", "message", "evidence"]) {
      if (!Object.prototype.hasOwnProperty.call(finding, key)) throw new Error(`finding missing ${key}`);
    }
    if (finding.family !== "p1.test-anti-pattern") throw new Error(`finding family mismatch ${finding.family}`);
  }
}

function ruleIds(result) {
  return result.findings.map((finding) => finding.ruleId).sort();
}

function hasRule(result, ruleId) {
  return result.findings.some((finding) => finding.ruleId === ruleId);
}

function record(records, name, expectation, result, passed, details = {}) {
  records.push({
    name,
    expectation,
    passed,
    ok: result?.ok,
    ruleIds: result ? ruleIds(result) : [],
    discoveredTestFiles: result?.evidence?.discoveredTestFiles ?? [],
    evidence: result?.evidence ?? {},
    details
  });
}

function commonPrelude() {
  return `assertRequiredFixtureResource("resources/required-resource.txt");\nfunction assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing fixture path"); }\nfunction parseInput(value: string): { ok: boolean; errorCode: string; status: string; count: number } { return value === "bad" ? { ok: false, errorCode: "E_MALFORMED", status: "rejected", count: 0 } : { ok: true, errorCode: "", status: "documented", count: 2 }; }\n`;
}

function meaningfulRiskNegativeTest() {
  return `// @failure-shape invalid input must return typed failure instead of falling back\ntest("rejects malformed risky input", () => {\n  const result = parseInput("bad");\n  expect(result.ok).toBe(false);\n  expect(result.errorCode).toBe("E_MALFORMED");\n});\n`;
}

async function main() {
  rmSync(adversarialRoot, { recursive: true, force: true });
  mkdirSync(adversarialRoot, { recursive: true });

  const scanner = await import(pathToFileURL(scannerModulePath).href);
  const { validateTestAntiPatterns, assertTestAntiPatternFinding } = scanner;
  const records = [];

  const validSubjectAlias = createWorkspace("valid-subject-alias", {
    testSource: `${commonPrelude()}\ntest("public claim: validates documented behavior", () => {\n  const result = parseInput("good");\n  const actualStatus = result.status;\n  const expectedStatus = "documented";\n  expect(actualStatus).toBe(expectedStatus);\n  expect(result.count).toBe(2);\n});\n\n${meaningfulRiskNegativeTest()}`
  });

  const asConstLiteralAlias = createWorkspace("as-const-literal-alias-public-claim-tautology", {
    testSource: `${commonPrelude()}\ntest("public claim: validates documented behavior", () => {\n  const expectedBehavior = "documented behavior" as const;\n  const aliasedActual = expectedBehavior;\n  expect(aliasedActual).toBe(expectedBehavior);\n  expect(expectedBehavior).toEqual(expectedBehavior);\n});\n\n${meaningfulRiskNegativeTest()}`
  });

  const skippedPublicClaimOnly = createWorkspace("skipped-public-claim-only", {
    testSource: `${commonPrelude()}\n// @owner verifier-team\n// @date 2026-06-26\n// @reason intentionally skipped public claim cannot count as executable coverage\ntest.skip("public claim: validates documented behavior", () => {\n  const result = parseInput("good");\n  expect(result.status).toBe("documented");\n});\n\n${meaningfulRiskNegativeTest()}`
  });

  const skippedRiskyNegativeOnly = createWorkspace("skipped-risky-negative-only", {
    testSource: `${commonPrelude()}\ntest("public claim: validates documented behavior", () => {\n  const result = parseInput("good");\n  expect(result.status).toBe("documented");\n  expect(result.count).toBe(2);\n});\n\n// @owner verifier-team\n// @date 2026-06-26\n// @reason intentionally skipped risky regression cannot count as executable negative coverage\n// @failure-shape invalid input must return typed failure instead of falling back\ntest.skip("rejects malformed risky input", () => {\n  const result = parseInput("bad");\n  expect(result.ok).toBe(false);\n});\n`
  });

  const missingClaimSource = createWorkspace("missing-claim-source", {
    readme: null,
    testSource: `${commonPrelude()}\ntest("public claim: validates documented behavior", () => {\n  const result = parseInput("good");\n  expect(result.status).toBe("documented");\n  expect(result.count).toBe(2);\n});\n\n${meaningfulRiskNegativeTest()}`
  });

  const claimTraversal = createWorkspace("claim-path-traversal", {
    policy: basePolicy({ publicClaims: [{ id: "documented-behavior", claimPath: "../README.md", requiredTestNameIncludes: "public claim: validates documented behavior", requiredClaimText: "documented behavior" }] }),
    testSource: `${commonPrelude()}\ntest("public claim: validates documented behavior", () => {\n  const result = parseInput("good");\n  expect(result.status).toBe("documented");\n  expect(result.count).toBe(2);\n});\n\n${meaningfulRiskNegativeTest()}`
  });

  const claimMismatch = createWorkspace("claim-source-mismatch", {
    readme: "# Fixture\n\nThis fixture deliberately omits the declared claim text.\n",
    testSource: `${commonPrelude()}\ntest("public claim: validates documented behavior", () => {\n  const result = parseInput("good");\n  expect(result.status).toBe("documented");\n  expect(result.count).toBe(2);\n});\n\n${meaningfulRiskNegativeTest()}`
  });

  const productPositive = await validateTestAntiPatterns(join(productFixtureRoot, "positive"));
  assertTypedResult(productPositive);
  record(records, "product-positive", "valid fixture must pass", productPositive, productPositive.ok === true);

  const productLiteralAlias = await validateTestAntiPatterns(join(productFixtureRoot, "literal-alias-public-claim-tautology"));
  assertTypedResult(productLiteralAlias);
  record(records, "product-literal-alias-public-claim-tautology", "PF1 product fixture must fail with no meaningful assertions", productLiteralAlias, productLiteralAlias.ok === false && hasRule(productLiteralAlias, "test.no-meaningful-assertions"));

  const validSubjectAliasResult = await validateTestAntiPatterns(validSubjectAlias);
  assertTypedResult(validSubjectAliasResult);
  record(records, "valid-subject-alias", "valid subject result compared to literal expected alias must not be falsely flagged", validSubjectAliasResult, validSubjectAliasResult.ok === true);

  const asConstLiteralAliasResult = await validateTestAntiPatterns(asConstLiteralAlias);
  assertTypedResult(asConstLiteralAliasResult);
  record(records, "adversarial-as-const-literal-alias", "const literal alias through TypeScript as-const must fail as vacuous/no meaningful assertion", asConstLiteralAliasResult, asConstLiteralAliasResult.ok === false && hasRule(asConstLiteralAliasResult, "test.no-meaningful-assertions"));

  const skippedPublicClaimResult = await validateTestAntiPatterns(skippedPublicClaimOnly);
  assertTypedResult(skippedPublicClaimResult);
  record(records, "adversarial-skipped-public-claim-only", "skipped test must not satisfy public claim coverage", skippedPublicClaimResult, skippedPublicClaimResult.ok === false && hasRule(skippedPublicClaimResult, "public-claim.coverage-gap"));

  const skippedRiskyNegativeResult = await validateTestAntiPatterns(skippedRiskyNegativeOnly);
  assertTypedResult(skippedRiskyNegativeResult);
  record(records, "adversarial-skipped-risky-negative-only", "skipped test must not satisfy risky negative/failure coverage", skippedRiskyNegativeResult, skippedRiskyNegativeResult.ok === false && hasRule(skippedRiskyNegativeResult, "risky-behavior.happy-path-only"));

  const missingClaimSourceResult = await validateTestAntiPatterns(missingClaimSource);
  assertTypedResult(missingClaimSourceResult);
  record(records, "F2-missing-claim-source", "missing public claim source must fail closed", missingClaimSourceResult, missingClaimSourceResult.ok === false && hasRule(missingClaimSourceResult, "public-claim.source-unreadable"));

  const claimTraversalResult = await validateTestAntiPatterns(claimTraversal);
  assertTypedResult(claimTraversalResult);
  record(records, "F2-claim-path-traversal", "public claim path traversal must fail closed", claimTraversalResult, claimTraversalResult.ok === false && hasRule(claimTraversalResult, "public-claim.source-unreadable"));

  const claimMismatchResult = await validateTestAntiPatterns(claimMismatch);
  assertTypedResult(claimMismatchResult);
  record(records, "F2-claim-source-mismatch", "public claim source missing declared text must fail closed", claimMismatchResult, claimMismatchResult.ok === false && hasRule(claimMismatchResult, "public-claim.source-missing-text"));

  for (const [name, options] of [
    ["F3-maxFileBytes-string", { maxFileBytes: "not-a-number" }],
    ["F3-maxFileBytes-zero", { maxFileBytes: 0 }],
    ["F3-maxFileBytes-over-cap", { maxFileBytes: 1024 * 1024 + 1 }],
    ["F3-policyPath-traversal", { policyPath: "../test-anti-pattern.policy.json" }],
    ["F3-unknown-option", { unexpectedOption: true }]
  ]) {
    const optionResult = await validateTestAntiPatterns(join(productFixtureRoot, "positive"), options);
    assertTypedResult(optionResult);
    const expectedRule = name === "F3-unknown-option" ? "policy.unknown-validator-option" : "policy.invalid-validator-option";
    record(records, name, "malformed/unsafe validator options must fail closed", optionResult, optionResult.ok === false && hasRule(optionResult, expectedRule), { options });
  }

  let untypedRejected = false;
  try {
    assertTestAntiPatternFinding({ family: "p1.test-anti-pattern" });
  } catch {
    untypedRejected = true;
  }
  records.push({ name: "typed-finding-assertion", expectation: "untyped finding carrier rejected", passed: untypedRejected, ok: null, ruleIds: [], discoveredTestFiles: [], evidence: {}, details: {} });

  const failures = records.filter((entry) => !entry.passed);
  const carrier = {
    ok: failures.length === 0,
    scannerModule: relative(repoRoot, scannerModulePath),
    productFixtureRoot: relative(repoRoot, productFixtureRoot),
    adversarialRoot: relative(repoRoot, adversarialRoot),
    records,
    failures: failures.map((entry) => ({ name: entry.name, expectation: entry.expectation, ok: entry.ok, ruleIds: entry.ruleIds, discoveredTestFiles: entry.discoveredTestFiles }))
  };
  writeFileSync(resultPath, JSON.stringify(carrier, null, 2));
  console.log(JSON.stringify(carrier));
  if (failures.length > 0) process.exitCode = 1;
}

await main();
