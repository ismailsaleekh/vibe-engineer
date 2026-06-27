import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { P2AggregateFamily, runP0Aggregate, runP1Aggregate, runP2Aggregate } from "../../../src/aggregate/index.js";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const mechanicalPackageRoot = join(fixtureRoot, "..", "..", "..");
const repoRoot = join(mechanicalPackageRoot, "..", "..");
const workRoot = join(repoRoot, ".vibe", "work", "I-13C-p2-aggregate-runner-bridge", "aggregate");
const typecheckOnly = process.argv.includes("--typecheck");
const evidenceRoot = join(workRoot, typecheckOnly ? "typecheck-evidence" : "witness-evidence");
const implementedFamilies = ["p2.code-smell"];
const cleanProject = "packages/mechanical-gates/fixtures/p2/code-smell/projects/clean";
const smellyProject = "packages/mechanical-gates/fixtures/p2/code-smell/projects/smelly";

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
    codeSmell: {
      bridge: {
        sourceRoot: `packages/mechanical-gates/fixtures/p2/aggregate/bridge-modules/${name}`,
        sourceFiles: [`packages/mechanical-gates/fixtures/p2/aggregate/bridge-modules/${name}/index.ts`],
        outputDir: `.vibe/work/I-13C-p2-aggregate-runner-bridge/aggregate/witness-bridge-artifacts/${outputName}`,
        ...extraBridge
      }
    }
  };
}

function ruleIds(result) {
  return new Set(result.findings.map((entry) => entry.ruleId));
}

function assertTypedAggregateResult(result) {
  assert.equal(result.family, "p2.aggregate", "aggregate family");
  assert.equal(typeof result.ok, "boolean", "aggregate ok boolean");
  assert.equal(typeof result.projectRoot, "string", "aggregate projectRoot string");
  assert.ok(Array.isArray(result.findings), "aggregate findings array");
  assert.ok(result.evidence && typeof result.evidence === "object" && !Array.isArray(result.evidence), "aggregate evidence object");
  assert.deepEqual(result.evidence.implementedFamilies, implementedFamilies, "implemented families");
  assert.ok(Array.isArray(result.evidence.subresults), "subresults array");
  assert.ok(result.evidence.summary && typeof result.evidence.summary === "object", "summary object");
  assert.ok(Array.isArray(result.evidence.stableFindings), "stableFindings array (ratchet seam)");
  for (const finding of result.findings) {
    for (const key of ["family", "ruleId", "severity", "blocking", "path", "message", "evidence"]) {
      assert.ok(Object.prototype.hasOwnProperty.call(finding, key), `finding missing ${key}`);
    }
  }
}

async function expectAggregateFail(label, options, expectedRuleIds) {
  const result = await runP2Aggregate(repoRoot, options);
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
  runCommand("p2 aggregate source syntax", process.execPath, ["--check", "packages/mechanical-gates/src/aggregate/p2/run-p2-aggregate.js"]);
  runCommand("aggregate witness syntax", process.execPath, ["--check", "packages/mechanical-gates/fixtures/p2/aggregate/witness.mjs"]);
  runCommand("aggregate declaration consumer", join(repoRoot, "node_modules", ".bin", "tsc"), [
    "--noEmit",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict",
    "--skipLibCheck", "false",
    "packages/mechanical-gates/fixtures/p2/aggregate/typecheck-consumer.ts"
  ]);
  assert.equal(typeof runP2Aggregate, "function", "runP2Aggregate export");
  assert.equal(typeof runP1Aggregate, "function", "runP1Aggregate export retained");
  assert.equal(typeof runP0Aggregate, "function", "runP0Aggregate export retained");
  assert.deepEqual([...P2AggregateFamily], implementedFamilies, "P2AggregateFamily runtime carrier");
  const evidence = { ok: true, mode: "typecheck", evidenceRoot: relative(repoRoot, evidenceRoot), exports: { runP2Aggregate: typeof runP2Aggregate, runP1Aggregate: typeof runP1Aggregate, runP0Aggregate: typeof runP0Aggregate, P2AggregateFamily: [...P2AggregateFamily] } };
  writeFileSync(join(evidenceRoot, "aggregate-typecheck.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}

async function runFullWitness() {
  ensureDirectory(evidenceRoot);
  assert.equal(typeof runP2Aggregate, "function", "runP2Aggregate actual aggregate export");
  assert.equal(typeof runP1Aggregate, "function", "runP1Aggregate export retained");
  assert.equal(typeof runP0Aggregate, "function", "runP0Aggregate export retained");

  // W-P2-POS (clean): default aggregate run compiles REAL P2 source -> REAL validateCodeSmells over the clean fixture.
  const clean = await runP2Aggregate(repoRoot);
  assertTypedAggregateResult(clean);
  assert.equal(clean.ok, true, `clean aggregate should pass: ${JSON.stringify(clean.findings, null, 2)}`);
  assert.deepEqual(clean.evidence.requestedFamilies, implementedFamilies, "requested families positive");
  assert.deepEqual(clean.evidence.subresults.map((entry) => entry.family).sort(), [...implementedFamilies].sort(), "all P2 subresults present");
  const cleanBridge = clean.evidence.codeSmellBridge;
  assert.ok(cleanBridge, "clean bridge evidence present");
  assert.equal(cleanBridge.exportFound, true, "real validateCodeSmells export found");
  assert.equal(cleanBridge.exportedValidatorName, "validateCodeSmells", "export name recorded");
  assert.equal(cleanBridge.validatorFamilyObserved, "p2.code-smell", "actual P2 family observed");
  assert.equal(cleanBridge.typedSubresultValidation.ok, true, "typed subresult validation ok");
  assert.equal(cleanBridge.status, 0, "bridge compile exited 0");
  assert.ok(cleanBridge.sourceTsFilesUsed.every((entry) => entry.includes("code-smell")), "P2 source TS files recorded");
  assert.ok(existsSync(join(repoRoot, cleanBridge.outputArtifactFile)), "P2 compiled artifact exists");
  const cleanSubresult = clean.evidence.subresults.find((entry) => entry.family === "p2.code-smell");
  assert.equal(cleanSubresult.ok, true, "clean code-smell subresult ok");

  // W-P2-POS (smelly): real findings flow through the bridge and into stableFindings (ratchet seam).
  const smelly = await runP2Aggregate(repoRoot, { codeSmell: { projectRoot: smellyProject } });
  assertTypedAggregateResult(smelly);
  assert.equal(smelly.ok, false, "smelly aggregate must block on real hard findings");
  const smellySubresult = smelly.evidence.subresults.find((entry) => entry.family === "p2.code-smell");
  assert.equal(smellySubresult.ok, false, "smelly code-smell subresult fails");
  const blockingSmell = smellySubresult.findings.find((entry) => entry.blocking);
  assert.ok(blockingSmell, "smelly project produced at least one real blocking code-smell finding");
  const stableBlocking = smelly.evidence.stableFindings.find((entry) => entry.blocking);
  assert.ok(stableBlocking, "stableFindings carries at least one blocking finding");
  assert.equal(stableBlocking.tool, "p2.code-smell", "stableFindings preserves ratchet tool identity");
  assert.equal(stableBlocking.detectorId, blockingSmell.detectorId, "stableFindings preserves detectorId");
  assert.equal(stableBlocking.mode, blockingSmell.mode, "stableFindings preserves mode");
  assert.ok(stableBlocking.contentHash && /^[a-f0-9]{64}$/.test(stableBlocking.contentHash), "stableFindings preserves contentHash");

  // Sibling/blast-radius sweep: P0 + P1 aggregate behavior unchanged.
  const p0Regression = await runP0Aggregate(join(mechanicalPackageRoot, "fixtures", "p0", "allowlist-domain-aggregate", "valid-aggregate"));
  assert.equal(p0Regression.family, "p0.aggregate", "P0 aggregate family unchanged");
  assert.equal(p0Regression.ok, true, "P0 aggregate valid fixture remains green");
  assert.ok(p0Regression.evidence.subresults.some((entry) => entry.family === "p0.allowlist"), "P0 aggregate subresults retained");
  const p1Regression = await runP1Aggregate(repoRoot);
  assert.equal(p1Regression.family, "p1.aggregate", "P1 aggregate family unchanged");
  assert.equal(p1Regression.ok, true, "P1 aggregate positive path remains green");
  assert.deepEqual([...p1Regression.evidence.implementedFamilies], ["p1.schema-contract-strictness", "p1.quality-ratchet", "p1.test-anti-pattern"], "P1 implemented families retained");

  // Negative matrix (mirror I-12C bridge matrix adapted to P2).
  const negativeResults = [];
  negativeResults.push(await expectAggregateFail("P2 compile failure", bridgeModuleOptions("compile-failure"), ["aggregate.p2-bridge.compile-failed", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("P2 missing compiled artifact", { codeSmell: { bridge: { moduleRelativePath: "missing.js" } } }, ["aggregate.p2-bridge.missing-artifact", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("P2 wrong export", bridgeModuleOptions("wrong-export"), ["aggregate.p2-bridge.wrong-export", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("P2 wrong family", bridgeModuleOptions("wrong-family"), ["aggregate.p2-bridge.wrong-family", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("P2 malformed result", bridgeModuleOptions("malformed-result"), ["aggregate.malformed-subresult", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("P2 validator exception", bridgeModuleOptions("validator-exception"), ["aggregate.validator-exception", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("bridge output traversal", { codeSmell: { bridge: { outputDir: "../outside-aggregate" } } }, ["aggregate.p2-bridge.path-invalid", "aggregate.missing-subresult"]));
  negativeResults.push(await expectAggregateFail("bridge input traversal", { codeSmell: { bridge: { sourceRoot: "../outside", sourceFiles: ["../outside/index.ts"] } } }, ["aggregate.p2-bridge.path-invalid", "aggregate.missing-subresult"]));
  for (const family of implementedFamilies) {
    negativeResults.push(await expectAggregateFail(`omitted family ${family}`, { families: [] }, ["aggregate.omitted-family"]));
  }
  negativeResults.push(await expectAggregateFail("unknown requested family", { families: [...implementedFamilies, "p2.unknown-family"] }, ["aggregate.unknown-family"]));
  negativeResults.push(await expectAggregateFail("invalid families option", { families: "p2.code-smell" }, ["aggregate.invalid-option"]));
  negativeResults.push(await expectAggregateFail("unknown aggregate option", { unexpectedP2: true }, ["aggregate.unknown-option"]));
  negativeResults.push(await expectAggregateFail("synthetic subresult injection option rejected", { subresults: [{ family: "p2.code-smell", ok: true, findings: [], evidence: {} }] }, ["aggregate.unknown-option"]));

  const evidence = {
    ok: true,
    family: "p2.aggregate",
    aggregateExport: relative(repoRoot, join(mechanicalPackageRoot, "src", "aggregate", "index.js")),
    declaration: relative(repoRoot, join(mechanicalPackageRoot, "src", "aggregate", "index.d.ts")),
    positive: {
      cleanSummary: clean.evidence.summary,
      smellySummary: smelly.evidence.summary,
      codeSmellBridge: {
        sourceTsFilesUsed: cleanBridge.sourceTsFilesUsed,
        outputArtifactDirectory: cleanBridge.outputArtifactDirectory,
        outputArtifactFile: cleanBridge.outputArtifactFile,
        status: cleanBridge.status,
        moduleUrl: cleanBridge.moduleUrl,
        exportedValidatorName: cleanBridge.exportedValidatorName,
        validatorFamilyObserved: cleanBridge.validatorFamilyObserved,
        typedSubresultValidation: cleanBridge.typedSubresultValidation
      },
      stableBlockingIdentity: stableBlocking,
      p0RegressionFamily: p0Regression.family,
      p1RegressionImplementedFamilies: p1Regression.evidence.implementedFamilies
    },
    negativeRuleIds: negativeResults.map((entry) => entry.findings.map((finding) => finding.ruleId)),
    realBoundary: "actual aggregate export invoked a real tsc compile-bridge of the real P2 source over on-disk I-13 fixtures"
  };
  writeFileSync(join(evidenceRoot, "aggregate-witness.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}

if (typecheckOnly) {
  await runTypecheckWitness();
} else {
  await runFullWitness();
}
