import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const mechanicalPackageRoot = join(fixtureRoot, "..", "..", "..");
const repoRoot = join(mechanicalPackageRoot, "..", "..");
const workRoot = join(repoRoot, ".vibe", "work", "I-12-mechanical-P1-ratchet-test-scanner", "test-anti-pattern");
const typecheckOnly = process.argv.includes("--typecheck");
const evidenceRoot = join(workRoot, typecheckOnly ? "typecheck-evidence" : "witness-evidence");

function assert(condition, message, evidence = {}) {
  if (!condition) {
    const error = new Error(message);
    error.evidence = evidence;
    throw error;
  }
}

function ensureDirectory(pathValue) {
  mkdirSync(pathValue, { recursive: true });
}

function runCommand(label, command, args, options = {}) {
  const completed = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", ...options });
  ensureDirectory(evidenceRoot);
  const safeLabel = label.replace(/[^a-z0-9_.-]+/gi, "-").toLowerCase();
  writeFileSync(join(evidenceRoot, `${safeLabel}.log`), JSON.stringify({ command, args, cwd: options.cwd ?? repoRoot, status: completed.status, stdout: completed.stdout, stderr: completed.stderr }, null, 2));
  assert(completed.status === 0, `${label} failed`, { status: completed.status, stdout: completed.stdout, stderr: completed.stderr });
  return completed;
}

async function loadScanner() {
  return import(pathToFileURL(join(mechanicalPackageRoot, "src", "p1", "test-anti-pattern", "index.js")).href);
}

function workspace(name) {
  return join(fixtureRoot, "workspaces", name);
}

function assertTypedResult(result, expectedFamily = "p1.test-anti-pattern") {
  assert(result && typeof result === "object", "result must be object", result);
  assert(result.family === expectedFamily, "result family mismatch", result);
  assert(typeof result.ok === "boolean", "result ok must be boolean", result);
  assert(Array.isArray(result.findings), "result findings must be array", result);
  assert(result.evidence && typeof result.evidence === "object" && !Array.isArray(result.evidence), "result evidence must be object", result);
  for (const finding of result.findings) {
    assert(finding.family === expectedFamily, "finding family mismatch", finding);
    for (const key of ["ruleId", "severity", "blocking", "path", "message", "evidence"]) {
      assert(Object.prototype.hasOwnProperty.call(finding, key), `finding missing ${key}`, finding);
    }
  }
}

async function expectPass(validateTestAntiPatterns, name) {
  const result = await validateTestAntiPatterns(workspace(name));
  assertTypedResult(result);
  assert(result.ok === true, `${name} expected pass`, result);
  assert(result.evidence.discoveredTestFiles.length > 0, `${name} must parse real on-disk test files`, result.evidence);
  return result;
}

async function expectFail(validateTestAntiPatterns, name, expectedRuleId) {
  const result = await validateTestAntiPatterns(workspace(name));
  assertTypedResult(result);
  assert(result.ok === false, `${name} expected fail`, result);
  assert(result.findings.some((finding) => finding.ruleId === expectedRuleId), `${name} missing ${expectedRuleId}`, { findings: result.findings });
  return result;
}

function runTypecheckWitness() {
  ensureDirectory(evidenceRoot);
  runCommand("scanner syntax check", process.execPath, ["--check", join(mechanicalPackageRoot, "src", "p1", "test-anti-pattern", "index.js")]);
  runCommand("witness syntax check", process.execPath, ["--check", fileURLToPath(import.meta.url)]);
  runCommand("type declaration consumer", join(repoRoot, "node_modules", ".bin", "tsc"), [
    "--noEmit",
    "--strict",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--lib", "ES2022,DOM",
    join(fixtureRoot, "typecheck-consumer.ts")
  ]);
  const evidence = { ok: true, mode: "typecheck", evidenceRoot: relative(repoRoot, evidenceRoot) };
  writeFileSync(join(evidenceRoot, "test-anti-pattern-typecheck.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}

async function runFullWitness() {
  ensureDirectory(evidenceRoot);
  const scanner = await loadScanner();
  const { validateTestAntiPatterns, assertTestAntiPatternFinding } = scanner;

  const positive = await expectPass(validateTestAntiPatterns, "positive");
  const nestedSuitePositive = await expectPass(validateTestAntiPatterns, "nested-suite-positive");
  const negativeExpectations = new Map([
    ["exit-code-only", "test.exit-code-only"],
    ["no-assertions", "test.no-meaningful-assertions"],
    ["smoke-only", "test.smoke-only"],
    ["smoke-tautology", "test.no-meaningful-assertions"],
    ["literal-alias-public-claim-tautology", "test.no-meaningful-assertions"],
    ["typescript-wrapper-literal-alias-tautology", "test.no-meaningful-assertions"],
    ["skipped-public-claim-only", "public-claim.coverage-gap"],
    ["skipped-risky-negative-only", "risky-behavior.happy-path-only"],
    ["describe-skip-public-claim-only", "public-claim.coverage-gap"],
    ["describe-skip-risky-negative-only", "risky-behavior.happy-path-only"],
    ["nested-describe-skip-public-claim", "public-claim.coverage-gap"],
    ["nested-describe-skip-risky-negative", "risky-behavior.happy-path-only"],
    ["inherited-describe-skip-public-claim", "public-claim.coverage-gap"],
    ["inherited-describe-skip-risky-negative", "risky-behavior.happy-path-only"],
    ["deep-describe-skip-public-claim", "public-claim.coverage-gap"],
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
  const negativeResults = [];
  for (const [name, ruleId] of negativeExpectations) {
    negativeResults.push({ name, expectedRuleId: ruleId, result: await expectFail(validateTestAntiPatterns, name, ruleId) });
  }

  const unknownOptionResult = await validateTestAntiPatterns(workspace("positive"), { unexpectedOption: true });
  assertTypedResult(unknownOptionResult);
  assert(unknownOptionResult.ok === false && unknownOptionResult.findings.some((finding) => finding.ruleId === "policy.unknown-validator-option"), "unknown option must fail closed", unknownOptionResult);

  const malformedMaxFileBytesResult = await validateTestAntiPatterns(workspace("positive"), { maxFileBytes: "not-a-number" });
  assertTypedResult(malformedMaxFileBytesResult);
  assert(malformedMaxFileBytesResult.ok === false && malformedMaxFileBytesResult.findings.some((finding) => finding.ruleId === "policy.invalid-validator-option"), "malformed maxFileBytes must fail closed", malformedMaxFileBytesResult);

  let untypedRejected = false;
  try {
    assertTestAntiPatternFinding({ family: "p1.test-anti-pattern" });
  } catch {
    untypedRejected = true;
  }
  assert(untypedRejected, "untyped finding assertion must fail closed");

  const evidence = {
    ok: true,
    family: "p1.test-anti-pattern",
    positive: {
      ok: positive.ok,
      discoveredTestFiles: positive.evidence.discoveredTestFiles,
      testCaseCount: positive.evidence.testCaseCount
    },
    nestedSuitePositive: {
      ok: nestedSuitePositive.ok,
      discoveredTestFiles: nestedSuitePositive.evidence.discoveredTestFiles,
      testCaseCount: nestedSuitePositive.evidence.testCaseCount
    },
    negativeRuleIds: negativeResults.flatMap((entry) => entry.result.findings.map((finding) => finding.ruleId)),
    negativeCases: negativeResults.map((entry) => ({ name: entry.name, expectedRuleId: entry.expectedRuleId, findingCount: entry.result.findings.length })),
    failClosed: {
      unknownOption: unknownOptionResult.findings.map((finding) => finding.ruleId),
      malformedMaxFileBytes: malformedMaxFileBytesResult.findings.map((finding) => finding.ruleId),
      untypedRejected
    },
    realBoundary: {
      scannerModule: relative(repoRoot, join(mechanicalPackageRoot, "src", "p1", "test-anti-pattern", "index.js")),
      fixtureRoot: relative(repoRoot, join(fixtureRoot, "workspaces")),
      parser: positive.evidence.parser,
      proofMode: positive.evidence.proofMode
    }
  };
  writeFileSync(join(evidenceRoot, "test-anti-pattern-witness.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}

if (typecheckOnly) {
  runTypecheckWitness();
} else {
  await runFullWitness();
}
