import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const evidenceRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(evidenceRoot, "..", "..", "..", "..", "..");
const scannerModulePath = join(repoRoot, "packages", "mechanical-gates", "src", "p1", "test-anti-pattern", "index.js");
const fixtureRoot = join(repoRoot, "packages", "mechanical-gates", "fixtures", "p1", "test-anti-pattern", "workspaces");
const scratchRoot = join(evidenceRoot, "adversarial-workspaces");

const scanner = await import(pathToFileURL(scannerModulePath).href);
const { validateTestAntiPatterns, assertTestAntiPatternFinding } = scanner;
const family = "p1.test-anti-pattern";
const policy = {
  schemaVersion: "i12.test-anti-pattern/1",
  proofMode: "typescript-ast",
  testRoots: ["tests"],
  allowSkippedWithMetadata: true,
  requiredSkipMetadata: ["owner", "date", "reason"],
  normalizedSnapshotHelpers: ["normalizeVolatileOutput"],
  requiredSetupFiles: ["resources/required-resource.txt"],
  setupSentinels: [{ file: "resources/setup-sentinel.txt", contains: "ready:true" }],
  requiredSetupAssertionCalls: ["assertRequiredFixtureResource"],
  publicClaims: [{ id: "documented-behavior", claimPath: "README.md", requiredTestNameIncludes: "public claim: validates documented behavior" }],
  riskyBehaviors: [{ id: "risky-parser", requiredNegativeTestNameIncludes: "rejects malformed risky input" }],
  exactCountRequired: true,
  requiredRegressionFailureShape: true
};

function assert(condition, message, evidence = {}) {
  if (!condition) {
    const error = new Error(message);
    error.evidence = evidence;
    throw error;
  }
}

function assertTypedResult(result) {
  assert(result && typeof result === "object", "result must be object", result);
  assert(result.family === family, "result family mismatch", result);
  assert(typeof result.ok === "boolean", "result ok must be boolean", result);
  assert(Array.isArray(result.findings), "findings must be array", result);
  assert(result.evidence && typeof result.evidence === "object" && !Array.isArray(result.evidence), "evidence must be object", result);
  for (const finding of result.findings) {
    assert(finding.family === family, "finding family mismatch", finding);
    for (const key of ["ruleId", "severity", "blocking", "path", "message", "evidence"]) {
      assert(Object.prototype.hasOwnProperty.call(finding, key), `finding missing ${key}`, finding);
    }
  }
}

function workspace(name) {
  return join(fixtureRoot, name);
}

async function runRequiredFixtures() {
  const results = [];
  const positive = await validateTestAntiPatterns(workspace("positive"));
  assertTypedResult(positive);
  assert(positive.ok === true, "positive fixture must pass", positive);
  assert(positive.evidence.parser === "typescript" && positive.evidence.proofMode === "typescript-ast", "positive fixture must use typed AST proof", positive.evidence);
  results.push({ name: "positive", ok: positive.ok, findings: positive.findings.map((finding) => finding.ruleId), evidence: positive.evidence });

  const expectations = new Map([
    ["exit-code-only", "test.exit-code-only"],
    ["no-assertions", "test.no-meaningful-assertions"],
    ["smoke-only", "test.smoke-only"],
    ["happy-path-only", "risky-behavior.happy-path-only"],
    ["weak-count", "test.weak-count-assertion"],
    ["silent-fallback", "test.silent-fallback"],
    ["skipped-metadata", "skipped-test.missing-metadata"],
    ["volatile-snapshot", "snapshot.volatile-without-normalization"],
    ["setup-silent-pass", "setup-resource.missing-assertion"],
    ["missing-resource", "setup-resource.missing"],
    ["parser-self-agreement", "parser-self-agreement-fixture"],
    ["public-claim-gap", "public-claim.coverage-gap"],
    ["regression-missing-shape", "regression.missing-failure-shape"],
    ["malformed-policy", "policy.unreadable"],
    ["missing-policy", "policy.unreadable"],
    ["path-traversal-policy", "discovery.test-root-invalid"],
    ["parser-failure", "parser.failure"]
  ]);
  for (const [name, ruleId] of expectations) {
    const result = await validateTestAntiPatterns(workspace(name));
    assertTypedResult(result);
    assert(result.ok === false, `${name} must fail`, result);
    assert(result.findings.some((finding) => finding.ruleId === ruleId), `${name} missing expected ${ruleId}`, result);
    results.push({ name, ok: result.ok, expectedRuleId: ruleId, findings: result.findings.map((finding) => finding.ruleId) });
  }

  const unknownOption = await validateTestAntiPatterns(workspace("positive"), { unexpectedOption: true });
  assertTypedResult(unknownOption);
  assert(unknownOption.ok === false && unknownOption.findings.some((finding) => finding.ruleId === "policy.unknown-validator-option"), "unknown option must fail closed", unknownOption);
  let untypedRejected = false;
  try {
    assertTestAntiPatternFinding({ family });
  } catch {
    untypedRejected = true;
  }
  assert(untypedRejected, "untyped finding assertion must reject incomplete finding");
  results.push({ name: "unknown-option", ok: unknownOption.ok, findings: unknownOption.findings.map((finding) => finding.ruleId) });
  results.push({ name: "untyped-finding-assertion", rejected: untypedRejected });
  return results;
}

function writeWorkspace(name, { readme = "# Documented behavior\n\nThe public claim is documented here.\n", testSource, policyOverrides = {} }) {
  const root = join(scratchRoot, name);
  mkdirSync(join(root, "tests"), { recursive: true });
  mkdirSync(join(root, "resources"), { recursive: true });
  writeFileSync(join(root, "test-anti-pattern.policy.json"), JSON.stringify({ ...policy, ...policyOverrides }, null, 2));
  if (readme !== null) writeFileSync(join(root, "README.md"), readme);
  writeFileSync(join(root, "resources", "required-resource.txt"), "fixture:true\n");
  writeFileSync(join(root, "resources", "setup-sentinel.txt"), "ready:true\n");
  writeFileSync(join(root, "tests", "case.test.ts"), testSource);
  return root;
}

async function runAdversarialFixtures() {
  rmSync(scratchRoot, { recursive: true, force: true });
  mkdirSync(scratchRoot, { recursive: true });
  const adversarial = [];

  const smokeTautologyRoot = writeWorkspace("smoke-tautology-evades", {
    testSource: `assertRequiredFixtureResource("resources/required-resource.txt");\nfunction assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }\ntest("smoke public claim: validates documented behavior", () => {\n  expect(true).toBe(true);\n  expect("loaded").toBe("loaded");\n});\n// @failure-shape invalid input must fail loudly\ntest("rejects malformed risky input", () => { expect({ ok: false }.ok).toBe(false); });\n`
  });
  const smokeTautology = await validateTestAntiPatterns(smokeTautologyRoot);
  assertTypedResult(smokeTautology);
  adversarial.push({
    name: "smoke-tautology-evades",
    expected: "fail: smoke-only/no-meaningful-assertions should catch tautological smoke QA",
    actualOk: smokeTautology.ok,
    findings: smokeTautology.findings.map((finding) => finding.ruleId)
  });

  const missingReadmeRoot = writeWorkspace("missing-readme-evades", {
    readme: null,
    testSource: `assertRequiredFixtureResource("resources/required-resource.txt");\nfunction assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }\ntest("public claim: validates documented behavior", () => { expect(["alpha", "beta"]).toHaveLength(2); });\n// @failure-shape invalid input must fail loudly\ntest("rejects malformed risky input", () => { expect({ ok: false }.ok).toBe(false); });\n`
  });
  const missingReadme = await validateTestAntiPatterns(missingReadmeRoot);
  assertTypedResult(missingReadme);
  adversarial.push({
    name: "missing-readme-evades",
    expected: "fail: public claim policy points at missing README.md",
    actualOk: missingReadme.ok,
    findings: missingReadme.findings.map((finding) => finding.ruleId)
  });

  const malformedOption = await validateTestAntiPatterns(workspace("positive"), { maxFileBytes: "not-a-number" });
  assertTypedResult(malformedOption);
  adversarial.push({
    name: "malformed-maxFileBytes-option",
    expected: "fail: malformed runtime option must not disable bounded-read cap",
    actualOk: malformedOption.ok,
    findings: malformedOption.findings.map((finding) => finding.ruleId)
  });

  return adversarial;
}

let exitCode = 0;
let requiredFixtures = [];
let adversarial = [];
let errorRecord = null;
try {
  requiredFixtures = await runRequiredFixtures();
  adversarial = await runAdversarialFixtures();
  const escaped = adversarial.filter((entry) => entry.actualOk === true);
  if (escaped.length > 0) exitCode = 1;
} catch (error) {
  exitCode = 1;
  errorRecord = { message: error instanceof Error ? error.message : String(error), evidence: error?.evidence };
}

const evidence = {
  ok: exitCode === 0,
  scannerModule: relative(repoRoot, scannerModulePath),
  fixtureRoot: relative(repoRoot, fixtureRoot),
  requiredFixtures,
  adversarial,
  error: errorRecord
};
writeFileSync(join(evidenceRoot, "i12b-validation-witness-result.json"), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
process.exit(exitCode);
