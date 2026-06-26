import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { P1AggregateFamily, runP0Aggregate, runP1Aggregate } from "../../../src/aggregate/index.js";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const mechanicalPackageRoot = join(fixtureRoot, "..", "..", "..");
const repoRoot = join(mechanicalPackageRoot, "..", "..");
const workRoot = join(repoRoot, ".vibe", "work", "I-12-mechanical-P1-ratchet-test-scanner", "aggregate");
const typecheckOnly = process.argv.includes("--typecheck");
const evidenceRoot = join(workRoot, typecheckOnly ? "typecheck-evidence" : "witness-evidence");
const implementedFamilies = ["p1.schema-contract-strictness", "p1.quality-ratchet", "p1.test-anti-pattern"];

function ensureDirectory(pathValue) {
  mkdirSync(pathValue, { recursive: true });
}

function runCommand(label, command, args, options = {}) {
  const completed = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", ...options });
  ensureDirectory(evidenceRoot);
  const safeLabel = label.replace(/[^a-z0-9_.-]+/gi, "-").toLowerCase();
  writeFileSync(join(evidenceRoot, `${safeLabel}.json`), JSON.stringify({ command, args, cwd: options.cwd ?? repoRoot, status: completed.status, stdout: completed.stdout, stderr: completed.stderr }, null, 2));
  assert.equal(completed.status, 0, `${label} failed: ${completed.stderr || completed.stdout}`);
  return completed;
}

function bridgeModuleOptions(name, outputName = name, extraBridge = {}) {
  return {
    schemaContractStrictness: {
      bridge: {
        sourceRoot: `packages/mechanical-gates/fixtures/p1/aggregate/bridge-modules/${name}`,
        sourceFiles: [`packages/mechanical-gates/fixtures/p1/aggregate/bridge-modules/${name}/index.ts`],
        outputDir: `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate/witness-bridge-artifacts/${outputName}`,
        ...extraBridge
      }
    }
  };
}

function ruleIds(result) {
  return new Set(result.findings.map((entry) => entry.ruleId));
}

function assertTypedAggregateResult(result) {
  assert.equal(result.family, "p1.aggregate", "aggregate family");
  assert.equal(typeof result.ok, "boolean", "aggregate ok boolean");
  assert.equal(typeof result.projectRoot, "string", "aggregate projectRoot string");
  assert.ok(Array.isArray(result.findings), "aggregate findings array");
  assert.ok(result.evidence && typeof result.evidence === "object" && !Array.isArray(result.evidence), "aggregate evidence object");
  assert.deepEqual(result.evidence.implementedFamilies, implementedFamilies, "implemented families");
  assert.ok(Array.isArray(result.evidence.subresults), "subresults array");
  assert.ok(result.evidence.summary && typeof result.evidence.summary === "object", "summary object");
  for (const finding of result.findings) {
    for (const key of ["family", "ruleId", "severity", "blocking", "path", "message", "evidence"]) {
      assert.ok(Object.prototype.hasOwnProperty.call(finding, key), `finding missing ${key}`);
    }
  }
}

async function expectAggregateFail(label, options, expectedRuleIds) {
  const result = await runP1Aggregate(repoRoot, options);
  assertTypedAggregateResult(result);
  assert.equal(result.ok, false, `${label} expected aggregate fail closed`);
  const actual = ruleIds(result);
  for (const expectedRuleId of expectedRuleIds) {
    assert.ok(actual.has(expectedRuleId), `${label} missing ${expectedRuleId}; got ${[...actual].join(",")}`);
  }
  return result;
}

async function runTypecheckWitness() {
  ensureDirectory(evidenceRoot);
  runCommand("aggregate index syntax", process.execPath, ["--check", "packages/mechanical-gates/src/aggregate/index.js"]);
  runCommand("p1 aggregate source syntax", process.execPath, ["--check", "packages/mechanical-gates/src/aggregate/p1/run-p1-aggregate.js"]);
  runCommand("aggregate witness syntax", process.execPath, ["--check", "packages/mechanical-gates/fixtures/p1/aggregate/witness.mjs"]);
  runCommand("aggregate declaration consumer", join(repoRoot, "node_modules", ".bin", "tsc"), [
    "--noEmit",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict",
    "--skipLibCheck", "false",
    "packages/mechanical-gates/fixtures/p1/aggregate/typecheck-consumer.ts"
  ]);
  assert.equal(typeof runP1Aggregate, "function", "runP1Aggregate export");
  assert.equal(typeof runP0Aggregate, "function", "runP0Aggregate export");
  assert.deepEqual([...P1AggregateFamily], implementedFamilies, "P1AggregateFamily runtime carrier");
  const evidence = { ok: true, mode: "typecheck", evidenceRoot: relative(repoRoot, evidenceRoot), exports: { runP1Aggregate: typeof runP1Aggregate, runP0Aggregate: typeof runP0Aggregate, P1AggregateFamily } };
  writeFileSync(join(evidenceRoot, "aggregate-typecheck.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}

async function runFullWitness() {
  ensureDirectory(evidenceRoot);
  assert.equal(typeof runP1Aggregate, "function", "runP1Aggregate actual aggregate export");
  assert.equal(typeof runP0Aggregate, "function", "runP0Aggregate actual aggregate export remains");

  const positive = await runP1Aggregate(repoRoot);
  assertTypedAggregateResult(positive);
  assert.equal(positive.ok, true, `positive aggregate should pass: ${JSON.stringify(positive.findings, null, 2)}`);
  assert.deepEqual(positive.evidence.requestedFamilies, implementedFamilies, "requested families positive");
  assert.deepEqual(positive.evidence.subresults.map((entry) => entry.family).sort(), [...implementedFamilies].sort(), "all P1 subresults present");
  assert.equal(positive.evidence.i11Bridge.validatorFamilyObserved, "p1.schema-contract-strictness", "actual I-11 family observed");
  assert.equal(positive.evidence.i11Bridge.exportedValidatorName, "validateSchemaContractStrictness", "I-11 export checked");
  assert.equal(positive.evidence.i11Bridge.typedSubresultValidation.ok, true, "I-11 typed subresult validation");
  assert.ok(positive.evidence.i11Bridge.sourceTsFilesUsed.every((entry) => entry.includes("schema-contract-strictness")), "I-11 source TS files recorded");
  assert.ok(existsSync(join(repoRoot, positive.evidence.i11Bridge.outputArtifactFile)), "I-11 compiled artifact exists");
  const quality = positive.evidence.subresults.find((entry) => entry.family === "p1.quality-ratchet");
  assert.equal(quality.ok, true, "quality ratchet positive subresult");
  assert.equal(quality.evidence.artifactPaths.baselinePath, "baseline.json", "quality ratchet consumed on-disk baseline fixture");
  const antiPattern = positive.evidence.subresults.find((entry) => entry.family === "p1.test-anti-pattern");
  assert.equal(antiPattern.ok, true, "test anti-pattern positive subresult");
  assert.ok(antiPattern.evidence.discoveredTestFiles.length > 0, "test anti-pattern consumed on-disk workspace tests");

  const p0Regression = await runP0Aggregate(join(mechanicalPackageRoot, "fixtures", "p0", "allowlist-domain-aggregate", "valid-aggregate"));
  assert.equal(p0Regression.family, "p0.aggregate", "P0 aggregate family unchanged");
  assert.equal(p0Regression.ok, true, "P0 aggregate valid fixture remains green");
  assert.ok(p0Regression.evidence.subresults.some((entry) => entry.family === "p0.allowlist"), "P0 aggregate subresults retained");

  const negativeResults = [];
  negativeResults.push(await expectAggregateFail("I-11 compile failure", bridgeModuleOptions("compile-failure"), ["aggregate.i11-bridge.compile-failed", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("I-11 missing compiled artifact", {
    schemaContractStrictness: { bridge: { moduleRelativePath: "missing.js" } }
  }, ["aggregate.i11-bridge.missing-artifact", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("I-11 wrong export", bridgeModuleOptions("wrong-export"), ["aggregate.i11-bridge.wrong-export", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("I-11 wrong family", bridgeModuleOptions("wrong-family"), ["aggregate.i11-bridge.wrong-family", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("I-11 malformed result", bridgeModuleOptions("malformed-result"), ["aggregate.malformed-subresult", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("I-11 validator exception", bridgeModuleOptions("validator-exception"), ["aggregate.validator-exception", "aggregate.missing-subresult"]));
  for (const family of implementedFamilies) {
    negativeResults.push(await expectAggregateFail(`omitted family ${family}`, { families: implementedFamilies.filter((entry) => entry !== family) }, ["aggregate.omitted-family"]));
  }
  negativeResults.push(await expectAggregateFail("unknown requested family", { families: [...implementedFamilies, "p1.unknown-family"] }, ["aggregate.unknown-family"]));
  negativeResults.push(await expectAggregateFail("missing quality-ratchet baseline input", { qualityRatchet: { options: { baselinePath: "missing-baseline.json" } } }, ["baseline.schema-invalid"]));
  negativeResults.push(await expectAggregateFail("bridge output traversal", { schemaContractStrictness: { bridge: { outputDir: "../outside-aggregate" } } }, ["aggregate.i11-bridge.path-invalid", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("bridge input traversal", { schemaContractStrictness: { bridge: { sourceRoot: "../outside", sourceFiles: ["../outside/index.ts"] } } }, ["aggregate.i11-bridge.path-invalid", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("synthetic subresult injection option rejected", { subresults: [{ family: "p1.schema-contract-strictness", ok: true, findings: [], evidence: {} }] }, ["aggregate.unknown-option"]));

  const evidence = {
    ok: true,
    family: "p1.aggregate",
    aggregateExport: relative(repoRoot, join(mechanicalPackageRoot, "src", "aggregate", "index.js")),
    declaration: relative(repoRoot, join(mechanicalPackageRoot, "src", "aggregate", "index.d.ts")),
    positive: {
      summary: positive.evidence.summary,
      i11Bridge: {
        sourceTsFilesUsed: positive.evidence.i11Bridge.sourceTsFilesUsed,
        outputArtifactDirectory: positive.evidence.i11Bridge.outputArtifactDirectory,
        outputArtifactFile: positive.evidence.i11Bridge.outputArtifactFile,
        status: positive.evidence.i11Bridge.status,
        moduleUrl: positive.evidence.i11Bridge.moduleUrl,
        exportedValidatorName: positive.evidence.i11Bridge.exportedValidatorName,
        validatorFamilyObserved: positive.evidence.i11Bridge.validatorFamilyObserved,
        typedSubresultValidation: positive.evidence.i11Bridge.typedSubresultValidation
      },
      qualityArtifactPaths: quality.evidence.artifactPaths,
      testAntiPatternFiles: antiPattern.evidence.discoveredTestFiles,
      p0RegressionSummary: p0Regression.evidence.summary
    },
    negativeRuleIds: negativeResults.map((entry) => entry.findings.map((finding) => finding.ruleId)),
    realBoundary: "actual aggregate export invoked actual I-11 compiled bridge plus actual I-12A/I-12B public validators over on-disk inputs"
  };
  writeFileSync(join(evidenceRoot, "aggregate-witness.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}

if (typecheckOnly) {
  await runTypecheckWitness();
} else {
  await runFullWitness();
}
