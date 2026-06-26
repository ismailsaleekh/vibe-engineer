import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const evidenceRoot = join(repoRoot, ".vibe/work/I-12-mechanical-P1-ratchet-test-scanner/test-anti-pattern/post-fix-revalidation-evidence");
const productWorkspaceRoot = join(repoRoot, "packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces");
const scannerModulePath = join(repoRoot, "packages/mechanical-gates/src/p1/test-anti-pattern/index.js");
const adversarialRoot = join(evidenceRoot, "adversarial-workspaces");

function ensureDir(pathValue) {
  mkdirSync(pathValue, { recursive: true });
}

function write(pathValue, content) {
  ensureDir(dirname(pathValue));
  writeFileSync(pathValue, content);
}

function productWorkspace(name) {
  return join(productWorkspaceRoot, name);
}

function adversarialWorkspace(name) {
  return join(adversarialRoot, name);
}

function standardPolicy(overrides = {}) {
  return {
    schemaVersion: "i12.test-anti-pattern/1",
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

function createStandardWorkspace(name, testSource, policyOverrides = {}, readme = "This README documents the documented behavior for users.\n") {
  const root = adversarialWorkspace(name);
  write(join(root, "test-anti-pattern.policy.json"), `${JSON.stringify(standardPolicy(policyOverrides), null, 2)}\n`);
  write(join(root, "README.md"), readme);
  write(join(root, "resources/required-resource.txt"), "resource:present\n");
  write(join(root, "resources/setup-sentinel.txt"), "ready:true\n");
  write(join(root, "tests/case.test.ts"), testSource);
  return root;
}

function ruleIds(result) {
  return result.findings.map((finding) => finding.ruleId).sort();
}

function isTypedResult(result) {
  if (!result || typeof result !== "object" || result.family !== "p1.test-anti-pattern" || typeof result.ok !== "boolean" || !Array.isArray(result.findings) || !result.evidence || typeof result.evidence !== "object" || Array.isArray(result.evidence)) return false;
  return result.findings.every((finding) => finding && typeof finding === "object" && finding.family === "p1.test-anti-pattern" && typeof finding.ruleId === "string" && ["error", "warning"].includes(finding.severity) && typeof finding.blocking === "boolean" && typeof finding.path === "string" && typeof finding.message === "string" && finding.evidence && typeof finding.evidence === "object" && !Array.isArray(finding.evidence));
}

async function main() {
  ensureDir(evidenceRoot);
  ensureDir(adversarialRoot);
  const scanner = await import(pathToFileURL(scannerModulePath).href);
  const { validateTestAntiPatterns, assertTestAntiPatternFinding } = scanner;
  const records = [];
  const failures = [];

  async function record(name, root, expectation, options = {}) {
    let result;
    let threw = false;
    let thrownMessage;
    try {
      result = await validateTestAntiPatterns(root, options);
    } catch (error) {
      threw = true;
      thrownMessage = error instanceof Error ? error.message : String(error);
    }
    const typed = result ? isTypedResult(result) : false;
    const ids = result ? ruleIds(result) : [];
    const ok = Boolean(result?.ok);
    const hasExpectedRule = expectation.expectedRuleId ? ids.includes(expectation.expectedRuleId) : true;
    const expectedOkMatches = expectation.ok === undefined ? true : ok === expectation.ok;
    const passed = !threw && typed && expectedOkMatches && hasExpectedRule && (!expectation.custom || expectation.custom(result));
    const entry = {
      name,
      root: relative(repoRoot, root),
      options,
      expected: expectation,
      threw,
      thrownMessage,
      actualOk: result?.ok,
      typed,
      ruleIds: ids,
      evidence: result?.evidence,
      passed
    };
    records.push(entry);
    if (!passed) failures.push(entry);
    return result;
  }

  await record("positive-product-fixture", productWorkspace("positive"), {
    ok: true,
    custom: (result) => result.evidence?.parser === "typescript" && result.evidence?.proofMode === "typescript-ast" && Array.isArray(result.evidence?.discoveredTestFiles) && result.evidence.discoveredTestFiles.includes("tests/meaningful.test.ts")
  });

  const negativeExpectations = new Map([
    ["exit-code-only", "test.exit-code-only"],
    ["no-assertions", "test.no-meaningful-assertions"],
    ["smoke-only", "test.smoke-only"],
    ["smoke-tautology", "test.no-meaningful-assertions"],
    ["happy-path-only", "risky-behavior.happy-path-only"],
    ["weak-count", "test.weak-count-assertion"],
    ["silent-fallback", "test.silent-fallback"],
    ["skipped-metadata", "skipped-test.missing-metadata"],
    ["volatile-snapshot", "snapshot.volatile-without-normalization"],
    ["setup-silent-pass", "setup-resource.missing-assertion"],
    ["missing-resource", "setup-resource.missing"],
    ["parser-self-agreement", "parser-self-agreement-fixture"],
    ["public-claim-gap", "public-claim.coverage-gap"],
    ["missing-public-claim-source", "public-claim.source-unreadable"],
    ["public-claim-source-mismatch", "public-claim.source-missing-text"],
    ["regression-missing-shape", "regression.missing-failure-shape"],
    ["malformed-policy", "policy.unreadable"],
    ["missing-policy", "policy.unreadable"],
    ["path-traversal-policy", "discovery.test-root-invalid"],
    ["parser-failure", "parser.failure"]
  ]);
  for (const [name, expectedRuleId] of negativeExpectations) {
    await record(`negative-product-fixture:${name}`, productWorkspace(name), { ok: false, expectedRuleId });
  }

  await record("fail-closed-option:unknown", productWorkspace("positive"), { ok: false, expectedRuleId: "policy.unknown-validator-option" }, { unexpectedOption: true });
  await record("fail-closed-option:malformed-maxFileBytes-string", productWorkspace("positive"), { ok: false, expectedRuleId: "policy.invalid-validator-option" }, { maxFileBytes: "not-a-number" });
  await record("fail-closed-option:maxFileBytes-zero", productWorkspace("positive"), { ok: false, expectedRuleId: "policy.invalid-validator-option" }, { maxFileBytes: 0 });
  await record("fail-closed-option:maxFileBytes-over-cap", productWorkspace("positive"), { ok: false, expectedRuleId: "policy.invalid-validator-option" }, { maxFileBytes: 1024 * 1024 + 1 });
  await record("fail-closed-option:policyPath-number", productWorkspace("positive"), { ok: false, expectedRuleId: "policy.invalid-validator-option" }, { policyPath: 123 });
  await record("fail-closed-option:policyPath-traversal", productWorkspace("positive"), { ok: false, expectedRuleId: "policy.invalid-validator-option" }, { policyPath: "../test-anti-pattern.policy.json" });
  await record("fail-closed-option:null-options", productWorkspace("positive"), { ok: false, expectedRuleId: "policy.invalid-validator-option" }, null);

  const claimTraversal = createStandardWorkspace(
    "claim-path-traversal",
    `assertRequiredFixtureResource("resources/required-resource.txt");\nfunction assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }\n\ntest("public claim: validates documented behavior", () => {\n  const documented = { status: "documented", count: 2 };\n  expect(documented.status).toBe("documented");\n  expect(documented.count).toBe(2);\n});\n\n// @failure-shape invalid input must fail loudly\ntest("rejects malformed risky input", () => {\n  const result = { ok: false };\n  expect(result.ok).toBe(false);\n});\n`,
    { publicClaims: [{ id: "documented-behavior", claimPath: "../README.md", requiredTestNameIncludes: "public claim: validates documented behavior", requiredClaimText: "documented behavior" }] }
  );
  await record("fail-closed-public-claim:claimPath-traversal", claimTraversal, { ok: false, expectedRuleId: "public-claim.source-unreadable" });

  const malformedPublicClaim = createStandardWorkspace(
    "malformed-public-claim-policy",
    `test("placeholder", () => { expect(1).toBe(1); });\n`,
    { publicClaims: [{ id: "documented-behavior", claimPath: "README.md" }] }
  );
  await record("fail-closed-public-claim:malformed-policy-entry", malformedPublicClaim, { ok: false, expectedRuleId: "policy.malformed" });

  const selfComparisonSmoke = createStandardWorkspace(
    "self-comparison-smoke",
    `assertRequiredFixtureResource("resources/required-resource.txt");\nfunction assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }\n\ntest("smoke public claim: validates documented behavior", () => {\n  const status = "loaded";\n  const count = status.length;\n  expect(status).toBe(status);\n  expect(count).toBe(count);\n});\n\n// @failure-shape invalid input must fail loudly\ntest("rejects malformed risky input", () => {\n  const result = { ok: false };\n  expect(result.ok).toBe(false);\n});\n`
  );
  await record("adversarial-F1:self-comparison-smoke-tautology", selfComparisonSmoke, {
    ok: false,
    custom: (result) => ["test.no-meaningful-assertions", "test.smoke-only"].some((ruleId) => ruleIds(result).includes(ruleId))
  });

  const literalAliasSmoke = createStandardWorkspace(
    "literal-alias-smoke",
    `assertRequiredFixtureResource("resources/required-resource.txt");\nfunction assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }\n\ntest("smoke public claim: validates documented behavior", () => {\n  const status = "loaded";\n  const count = 1;\n  expect(status).toBe("loaded");\n  expect(count).toBe(1);\n});\n\n// @failure-shape invalid input must fail loudly\ntest("rejects malformed risky input", () => {\n  const result = { ok: false };\n  expect(result.ok).toBe(false);\n});\n`
  );
  await record("adversarial-F1:literal-alias-smoke-tautology", literalAliasSmoke, {
    ok: false,
    custom: (result) => ["test.no-meaningful-assertions", "test.smoke-only"].some((ruleId) => ruleIds(result).includes(ruleId))
  });

  const literalAliasPublicClaim = createStandardWorkspace(
    "literal-alias-public-claim",
    `assertRequiredFixtureResource("resources/required-resource.txt");\nfunction assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }\n\ntest("public claim: validates documented behavior", () => {\n  const status = "documented";\n  const count = 3;\n  expect(status).toBe("documented");\n  expect(count).toBe(3);\n});\n\n// @failure-shape invalid input must fail loudly\ntest("rejects malformed risky input", () => {\n  const result = { ok: false };\n  expect(result.ok).toBe(false);\n});\n`
  );
  await record("adversarial-F1:literal-alias-public-claim-tautology", literalAliasPublicClaim, {
    ok: false,
    expectedRuleId: "test.no-meaningful-assertions"
  });

  let untypedRejected = false;
  try {
    assertTestAntiPatternFinding({ family: "p1.test-anti-pattern" });
  } catch {
    untypedRejected = true;
  }
  const untypedEntry = { name: "fail-closed-untyped-finding", passed: untypedRejected, untypedRejected };
  records.push(untypedEntry);
  if (!untypedRejected) failures.push(untypedEntry);

  const summary = {
    ok: failures.length === 0,
    scannerModule: relative(repoRoot, scannerModulePath),
    productFixtureRoot: relative(repoRoot, productWorkspaceRoot),
    adversarialRoot: relative(repoRoot, adversarialRoot),
    recordCount: records.length,
    failures: failures.map((entry) => ({ name: entry.name, actualOk: entry.actualOk, ruleIds: entry.ruleIds, expected: entry.expected, typed: entry.typed, threw: entry.threw, thrownMessage: entry.thrownMessage })),
    records
  };
  writeFileSync(join(evidenceRoot, "i12b-post-fix-revalidation-witness-result.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  if (failures.length > 0) process.exitCode = 1;
}

await main();
