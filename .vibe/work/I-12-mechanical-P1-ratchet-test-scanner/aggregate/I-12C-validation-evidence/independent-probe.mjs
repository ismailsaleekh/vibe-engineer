import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const evidenceRoot = path.join(repoRoot, ".vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate/I-12C-validation-evidence");
mkdirSync(evidenceRoot, { recursive: true });
const fakeBridgeRoot = path.join(evidenceRoot, "fake-bridge");
mkdirSync(fakeBridgeRoot, { recursive: true });
writeFileSync(path.join(fakeBridgeRoot, "index.ts"), `export async function validateSchemaContractStrictness(projectRoot: string) {\n  return { family: "p1.schema-contract-strictness", ok: true, projectRoot, findings: [], evidence: { fake: true } };\n}\n`);

const aggregateUrl = pathToFileURL(path.join(repoRoot, "packages/mechanical-gates/src/aggregate/index.js")).href;
const directAggregate = await import(aggregateUrl);
const implementedFamilies = ["p1.schema-contract-strictness", "p1.quality-ratchet", "p1.test-anti-pattern"];
const results = { imports: {}, positive: {}, negatives: [] };

assert.equal(typeof directAggregate.runP1Aggregate, "function");
assert.equal(typeof directAggregate.runP0Aggregate, "function");
assert.deepEqual([...directAggregate.P1AggregateFamily], implementedFamilies);

const packageImportProbe = spawnSync(process.execPath, [
  "--input-type=module",
  "--eval",
  `const m = await import('@vibe-engineer/mechanical-gates/aggregate'); console.log(JSON.stringify({ keys: Object.keys(m).sort(), runP1Aggregate: typeof m.runP1Aggregate, runP0Aggregate: typeof m.runP0Aggregate, P1AggregateFamily: [...m.P1AggregateFamily] }));`
], { cwd: path.join(repoRoot, "packages/mechanical-gates"), encoding: "utf8" });
writeFileSync(path.join(evidenceRoot, "package-aggregate-import-probe.json"), JSON.stringify({ command: process.execPath, cwd: path.join(repoRoot, "packages/mechanical-gates"), status: packageImportProbe.status, stdout: packageImportProbe.stdout, stderr: packageImportProbe.stderr }, null, 2));
assert.equal(packageImportProbe.status, 0, packageImportProbe.stderr || packageImportProbe.stdout);
const packageImport = JSON.parse(packageImportProbe.stdout);
assert.equal(packageImport.runP1Aggregate, "function");
assert.equal(packageImport.runP0Aggregate, "function");
assert.deepEqual(packageImport.P1AggregateFamily, implementedFamilies);

results.imports = {
  direct: Object.keys(directAggregate).sort(),
  packageSelfReference: packageImport.keys,
  runtimeFamilies: [...directAggregate.P1AggregateFamily]
};

function ruleIds(result) {
  return new Set(result.findings.map((entry) => entry.ruleId));
}

function assertAggregateShape(result) {
  assert.equal(result.family, "p1.aggregate");
  assert.equal(typeof result.ok, "boolean");
  assert.equal(typeof result.projectRoot, "string");
  assert.ok(Array.isArray(result.findings));
  assert.ok(result.evidence && typeof result.evidence === "object" && !Array.isArray(result.evidence));
  assert.deepEqual(result.evidence.implementedFamilies, implementedFamilies);
  assert.ok(Array.isArray(result.evidence.subresults));
  assert.ok(result.evidence.summary && typeof result.evidence.summary === "object");
  for (const family of implementedFamilies) assert.ok(Object.prototype.hasOwnProperty.call(result.evidence.summary, family));
  for (const finding of result.findings) {
    for (const key of ["family", "ruleId", "severity", "blocking", "path", "message", "evidence"]) assert.ok(Object.prototype.hasOwnProperty.call(finding, key), `finding missing ${key}`);
  }
}

function bridgeOptions(name, outputName = name, extraBridge = {}) {
  return {
    schemaContractStrictness: {
      bridge: {
        sourceRoot: `packages/mechanical-gates/fixtures/p1/aggregate/bridge-modules/${name}`,
        sourceFiles: [`packages/mechanical-gates/fixtures/p1/aggregate/bridge-modules/${name}/index.ts`],
        outputDir: `.vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate/I-12C-validation-evidence/bridge-output/${outputName}`,
        ...extraBridge
      }
    }
  };
}

async function expectFail(label, options, expectedRuleIds) {
  const result = await directAggregate.runP1Aggregate(repoRoot, options);
  assertAggregateShape(result);
  assert.equal(result.ok, false, `${label} should fail closed`);
  const ids = ruleIds(result);
  for (const expected of expectedRuleIds) assert.ok(ids.has(expected), `${label} missing ${expected}; got ${[...ids].join(",")}`);
  results.negatives.push({ label, ok: result.ok, ruleIds: [...ids], families: result.evidence.subresults.map((entry) => entry.family) });
  return result;
}

const positive = await directAggregate.runP1Aggregate(repoRoot);
assertAggregateShape(positive);
assert.equal(positive.ok, true, JSON.stringify(positive.findings, null, 2));
assert.equal(positive.evidence.family, "p1.aggregate");
assert.deepEqual(positive.evidence.subresults.map((entry) => entry.family).sort(), [...implementedFamilies].sort());
assert.deepEqual(Object.keys(positive.evidence.summary).sort(), [...implementedFamilies].sort());
assert.equal(positive.evidence.i11Bridge.exportedValidatorName, "validateSchemaContractStrictness");
assert.equal(positive.evidence.i11Bridge.validatorFamilyObserved, "p1.schema-contract-strictness");
assert.equal(positive.evidence.i11Bridge.typedSubresultValidation.ok, true);
assert.equal(positive.evidence.i11Bridge.status, 0);
assert.ok(positive.evidence.i11Bridge.args.includes("--noEmitOnError"));
assert.ok(positive.evidence.i11Bridge.sourceTsFilesUsed.includes("packages/mechanical-gates/src/p1/schema-contract-strictness/index.ts"));
assert.ok(positive.evidence.sourceApiIdentities.qualityRatchet.includes("validateQualityRatchet"));
assert.ok(positive.evidence.sourceApiIdentities.testAntiPattern.includes("validateTestAntiPatterns"));
assert.equal(positive.evidence.summary["p1.quality-ratchet"].ok, true);
assert.equal(positive.evidence.summary["p1.test-anti-pattern"].ok, true);
results.positive = {
  ok: positive.ok,
  family: positive.family,
  subresultFamilies: positive.evidence.subresults.map((entry) => entry.family),
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
  sourceApiIdentities: positive.evidence.sourceApiIdentities,
  inputPaths: positive.evidence.inputPaths,
  summary: positive.evidence.summary
};

await expectFail("I-11 compile failure", bridgeOptions("compile-failure"), ["aggregate.i11-bridge.compile-failed", "aggregate.missing-subresult"]);
await expectFail("I-11 missing compiled artifact", { schemaContractStrictness: { bridge: { outputDir: ".vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate/I-12C-validation-evidence/bridge-output/missing-artifact", moduleRelativePath: "missing.js" } } }, ["aggregate.i11-bridge.missing-artifact", "aggregate.missing-subresult"]);
await expectFail("I-11 wrong export", bridgeOptions("wrong-export"), ["aggregate.i11-bridge.wrong-export", "aggregate.missing-subresult"]);
await expectFail("I-11 wrong family", bridgeOptions("wrong-family"), ["aggregate.i11-bridge.wrong-family", "aggregate.missing-subresult"]);
await expectFail("I-11 malformed subresult", bridgeOptions("malformed-result"), ["aggregate.malformed-subresult", "aggregate.missing-subresult"]);
await expectFail("I-11 validator exception", bridgeOptions("validator-exception"), ["aggregate.validator-exception", "aggregate.missing-subresult"]);
for (const family of implementedFamilies) await expectFail(`omitted ${family}`, { families: implementedFamilies.filter((entry) => entry !== family) }, ["aggregate.omitted-family"]);
await expectFail("unknown family", { families: [...implementedFamilies, "p1.mystery"] }, ["aggregate.unknown-family"]);
await expectFail("missing quality baseline", { qualityRatchet: { options: { baselinePath: "missing-baseline.json" } } }, ["baseline.schema-invalid"]);
await expectFail("missing test scanner policy", { testAntiPattern: { options: { policyPath: "missing-policy.json" } } }, ["policy.unreadable"]);
await expectFail("bridge output traversal", { schemaContractStrictness: { bridge: { outputDir: "../outside" } } }, ["aggregate.i11-bridge.path-invalid", "aggregate.missing-subresult"]);
await expectFail("bridge input traversal", { schemaContractStrictness: { bridge: { sourceRoot: "../outside", sourceFiles: ["../outside/index.ts"] } } }, ["aggregate.i11-bridge.path-invalid", "aggregate.missing-subresult"]);
await expectFail("synthetic subresults option", { subresults: [{ family: "p1.schema-contract-strictness", ok: true, findings: [], evidence: {} }] }, ["aggregate.unknown-option"]);
await expectFail("validation-owned fake bridge source rejected", { schemaContractStrictness: { bridge: { sourceRoot: ".vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate/I-12C-validation-evidence/fake-bridge", sourceFiles: [".vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate/I-12C-validation-evidence/fake-bridge/index.ts"], outputDir: ".vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate/I-12C-validation-evidence/bridge-output/fake-bridge" } } }, ["aggregate.i11-bridge.path-invalid", "aggregate.missing-subresult"]);

writeFileSync(path.join(evidenceRoot, "independent-probe-results.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ ok: true, negativeCount: results.negatives.length, positive: results.positive.summary, imports: results.imports }, null, 2));
