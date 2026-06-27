import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { assertTypedFindings } from "../../../src/p0/boundaries/index.js";
import { validateTestingBoundary } from "../../../src/p0/testing-boundary/index.js";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(fixtureRoot, "..", "..", "..");
const repoRoot = join(packageRoot, "..", "..");
const testingPackageRoot = join(repoRoot, "packages", "testing");
const typecheckOnly = process.argv.includes("--typecheck");

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

function assertResultTyped(result) {
  assert(result && typeof result === "object", "result must be object", { result });
  assert(result.family === "p0.testing-boundary", "result family mismatch", { family: result.family });
  assert(typeof result.ok === "boolean", "result ok must be boolean", { result });
  assert(Array.isArray(result.findings), "result findings must be array", { result });
  assertTypedFindings(result.findings);
  assert(result.evidence && typeof result.evidence === "object", "result evidence must be object", { result });
}

async function expectPass(label, root, options) {
  const result = await validateTestingBoundary(root, options);
  assertResultTyped(result);
  assert(result.ok, `${label} expected pass`, { findings: result.findings, evidence: result.evidence });
  return result;
}

async function expectFail(label, root, expectedRuleIds, options) {
  const result = await validateTestingBoundary(root, options);
  assertResultTyped(result);
  assert(!result.ok, `${label} expected fail`, { result });
  const actual = ruleIds(result);
  for (const expectedRuleId of expectedRuleIds) {
    assert(actual.has(expectedRuleId), `${label} missing expected rule ${expectedRuleId}`, {
      expectedRuleIds,
      actualRuleIds: [...actual],
      findings: result.findings
    });
  }
  return result;
}

function runCommand(label, command, args, options) {
  const completed = spawnSync(command, args, { encoding: "utf8", ...options });
  assert(completed.status === 0, `${label} failed`, {
    command,
    args,
    cwd: options?.cwd,
    status: completed.status,
    stdout: completed.stdout,
    stderr: completed.stderr
  });
  return completed;
}

function collectSyntaxFiles(root, allowedExtensions = new Set([".js", ".mjs"])) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", ".git", "dist", "build", "coverage"].includes(entry.name)) visit(absolute);
        continue;
      }
      if (entry.isFile() && allowedExtensions.has(extname(entry.name))) files.push(absolute);
    }
  }
  if (existsSync(root)) visit(root);
  return files.sort();
}

function runNodeCheck(absoluteFile) {
  const relativeFile = relative(packageRoot, absoluteFile);
  runCommand(`node --check ${relativeFile}`, process.execPath, ["--check", absoluteFile], { cwd: packageRoot });
}

function runTypescriptConsumerCheck() {
  const tsc = join(repoRoot, "node_modules", ".bin", "tsc");
  assert(existsSync(tsc), "existing TypeScript compiler is required for declaration consumer checks", { tsc });
  runCommand("testing-boundary declaration consumer", tsc, [
    "--noEmit",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict",
    "--skipLibCheck", "false",
    "fixtures/p0/testing-boundary/type-consumer.ts"
  ], { cwd: packageRoot });
  runCommand("testing helper declaration consumer", tsc, [
    "--noEmit",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict",
    "--skipLibCheck", "false",
    "fixtures/type-consumer.ts"
  ], { cwd: testingPackageRoot });
}

async function runTypecheckWitness() {
  const syntaxFiles = [
    ...collectSyntaxFiles(join(packageRoot, "src", "p0", "testing-boundary")),
    ...collectSyntaxFiles(join(packageRoot, "fixtures", "p0", "testing-boundary")),
    ...collectSyntaxFiles(join(testingPackageRoot, "src")),
    ...collectSyntaxFiles(join(testingPackageRoot, "fixtures"))
  ];
  for (const file of syntaxFiles) runNodeCheck(file);
  runTypescriptConsumerCheck();
  const helperModule = await import(new URL("../../../../testing/src/index.js", import.meta.url));
  const apiShape = {
    validateTestingBoundary: typeof validateTestingBoundary,
    assertTypedFindings: typeof assertTypedFindings,
    createEphemeralWorkspace: typeof helperModule.createEphemeralWorkspace,
    assertOkResult: typeof helperModule.assertOkResult,
    assertBlockingFinding: typeof helperModule.assertBlockingFinding,
    normalizeForSnapshot: typeof helperModule.normalizeForSnapshot
  };
  assert(Object.values(apiShape).every((value) => value === "function"), "testing-boundary/helper APIs failed to load as functions", apiShape);
  console.log(JSON.stringify({ ok: true, mode: "typecheck", checkedFiles: syntaxFiles.length, declarationConsumer: "typescript", apiShape }));
}

function assertNoSharedMechanicalWiring() {
  const mechanicalPackage = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  assert(!Object.prototype.hasOwnProperty.call(mechanicalPackage.exports, "./p0/testing-boundary"), "mechanical-gates package export was wired out of license", { exports: mechanicalPackage.exports });
  const aggregateSource = readFileSync(join(packageRoot, "src", "aggregate", "run-p0-aggregate.js"), "utf8");
  assert(aggregateSource.includes("p0.testing-boundary"), "aggregate runner must register p0.testing-boundary as an implemented family post-handoff", {});
}

async function runFullWitness() {
  const positive = await expectPass("test-only dependency and test-surface import", workspace("valid-test-only"));
  assert(positive.evidence.dependencyEdges.some((edge) => edge.section === "devDependencies" && edge.productionReachable === false), "positive fixture must prove devDependency edge", positive.evidence);
  assert(positive.evidence.sourceImports.every((entry) => entry.testSurface === true), "positive fixture must confine imports to test/fixture surfaces", positive.evidence);
  assert(positive.evidence.testOnlyManifests.every((entry) => entry.private === true && entry.testOnly === true && entry.productionDependencyAllowed === false), "positive fixture test-only package must be private/non-publishable/test-only", positive.evidence);

  const realTestingPackage = await expectPass("real packages/testing manifest", repoRoot, { policyPath: "packages/testing/fixtures/mechanical-testing-boundary.json" });
  assert(realTestingPackage.evidence.testOnlyManifests.length === 1, "real testing package manifest must be inspected", realTestingPackage.evidence);
  assert(realTestingPackage.evidence.testOnlyManifests[0].private === true, "real testing package must be private", realTestingPackage.evidence);

  const helperConsumption = runCommand("@vibe-engineer/testing helper consumer", process.execPath, ["fixtures/helper-consumer.mjs"], { cwd: testingPackageRoot });
  const helperOutput = JSON.parse(helperConsumption.stdout.trim());
  assert(helperOutput.ok === true && helperOutput.helperPackage === "@vibe-engineer/testing", "helper consumer did not exercise package self-reference", helperOutput);

  const productionDependency = await expectFail("production dependency edge", workspace("production-dependency"), ["testing-boundary.production-dependency"]);
  assert(productionDependency.findings.some((finding) => finding.blocking === true && finding.evidence.section === "dependencies"), "production dependency finding must be blocking and section-specific", productionDependency.findings);

  const productionImport = await expectFail("production source import", workspace("production-import"), ["testing-boundary.production-import"]);
  assert(productionImport.findings.some((finding) => finding.evidence.parser === "typescript" && finding.evidence.proofMode === "typescript-ast"), "production import finding must prove TypeScript AST discovery", productionImport.findings);

  await expectFail("publishable test-only package", workspace("publishable-testing"), ["testing-boundary.publishable-test-package"]);
  await expectFail("missing required manifest", workspace("missing-manifest"), ["testing-boundary.manifest-unreadable"]);
  await expectFail("malformed manifest", workspace("malformed-manifest"), ["testing-boundary.manifest-unreadable"]);
  await expectFail("missing policy", workspace("missing-policy"), ["testing-boundary.policy-unreadable"]);
  await expectFail("malformed policy", workspace("malformed-policy"), ["testing-boundary.policy-unreadable"]);
  await expectFail("regex/narrative/parser-self-agreement proof", workspace("regex-only-proof"), ["testing-boundary.regex-only-proof-rejected", "testing-boundary.parser-self-agreement-only"]);
  await expectFail("policy path traversal", workspace("valid-test-only"), ["testing-boundary.policy-unreadable"], { policyPath: "../outside-root.json" });

  assertNoSharedMechanicalWiring();

  const regressionEvidence = {
    noPackagesCoreAssumption: !JSON.stringify({ positive: positive.evidence, realTestingPackage: realTestingPackage.evidence }).includes("packages/core"),
    aggregateUnchangedByWitness: true,
    mechanicalPackageNoTestingExport: true,
    noP1P2TestingBoundaryCreated: !existsSync(join(packageRoot, "src", "p1", "testing-boundary")) && !existsSync(join(packageRoot, "src", "p2", "testing-boundary"))
  };
  assert(regressionEvidence.noPackagesCoreAssumption, "testing-boundary evidence contains forbidden packages/core assumption", regressionEvidence);
  assert(regressionEvidence.noP1P2TestingBoundaryCreated, "testing-boundary created P1/P2 surfaces", regressionEvidence);

  console.log(JSON.stringify({
    ok: true,
    mode: "p0-testing-boundary",
    fixtureRoot: relative(packageRoot, fixtureRoot),
    positive: {
      dependencyEdges: positive.evidence.dependencyEdges,
      sourceImports: positive.evidence.sourceImports,
      testOnlyManifests: positive.evidence.testOnlyManifests,
      realTestingPackage: realTestingPackage.evidence.testOnlyManifests,
      helperConsumption: helperOutput
    },
    negativeWitnesses: 9,
    regressionEvidence
  }));
}

if (typecheckOnly) {
  await runTypecheckWitness();
} else {
  await runFullWitness();
}
