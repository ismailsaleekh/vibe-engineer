import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { validateQualityRatchet } from "../../../../packages/mechanical-gates/src/p1/quality-ratchet/index.js";

const repoRoot = resolve(".");
const fixtureRoot = join(repoRoot, "packages", "mechanical-gates", "fixtures", "p2", "code-smell");
const evidenceRoot = join(repoRoot, ".vibe", "work", "I-13-mechanical-P2-smell-framework", "post-fix-evidence");
const compiledRoot = join(evidenceRoot, "compiled-p2-postfix");
const outputRoot = join(evidenceRoot, "postfix-output");
const scratchRoot = join(evidenceRoot, "scratch-ratchet-root");

function ensureDirectory(pathValue) {
  mkdirSync(pathValue, { recursive: true });
}

function writeJson(pathValue, value) {
  ensureDirectory(dirname(pathValue));
  writeFileSync(pathValue, JSON.stringify(value, null, 2));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function normalizeLineEndings(text) {
  return text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function runCommand(label, command, args, options = {}) {
  const completed = spawnSync(command, args, { cwd: options.cwd ?? repoRoot, encoding: "utf8" });
  const evidence = { label, command, args, cwd: options.cwd ?? repoRoot, status: completed.status, stdout: completed.stdout, stderr: completed.stderr };
  writeJson(join(outputRoot, "commands", `${label.replaceAll(" ", "-")}.json`), evidence);
  assert.equal(completed.status, 0, `${label} failed: ${completed.stderr || completed.stdout}`);
  return evidence;
}

async function compileAndImportP2() {
  rmSync(compiledRoot, { recursive: true, force: true });
  runCommand("compile-p2", "pnpm", [
    "exec", "tsc",
    "--outDir", relative(repoRoot, compiledRoot),
    "--rootDir", "packages/mechanical-gates/src/p2/code-smell",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict",
    "--skipLibCheck", "false",
    "--lib", "ES2022",
    "packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts",
    "packages/mechanical-gates/src/p2/code-smell/index.ts"
  ]);
  const compiledIndex = join(compiledRoot, "index.js");
  assert.ok(existsSync(compiledIndex), "compiled P2 index exists");
  return import(pathToFileURL(compiledIndex).href);
}

function assertTypedP2Result(result) {
  assert.equal(result.family, "p2.code-smell", "result family");
  assert.equal(typeof result.ok, "boolean", "result ok");
  assert.equal(typeof result.projectRoot, "string", "projectRoot");
  assert.ok(Array.isArray(result.findings), "findings array");
  assert.equal(result.evidence.tool, "p2.code-smell", "evidence tool");
  assert.equal(typeof result.evidence.failClosed, "boolean", "failClosed boolean");
  for (const finding of result.findings) {
    assert.equal(finding.family, "p2.code-smell", "finding family");
    assert.equal(finding.identity.tool, "p2.code-smell", "identity tool");
    assert.equal(finding.evidence.identity.contentHash, finding.identity.contentHash, "finding identity mirrors evidence identity");
    assert.equal(finding.evidence.calibration.mode, finding.mode, "calibration mode mirrors finding mode");
  }
}

function requireRule(result, ruleId, predicate = () => true) {
  const finding = result.findings.find((entry) => entry.ruleId === ruleId && predicate(entry));
  assert.ok(finding, `missing ${ruleId}; got ${result.findings.map((entry) => `${entry.ruleId}:${entry.mode}:${entry.blocking}`).join(",")}`);
  return finding;
}

function assertFailClosed(label, result) {
  assertTypedP2Result(result);
  assert.equal(result.ok, false, `${label} must fail closed`);
  assert.equal(result.evidence.failClosed, true, `${label} evidence.failClosed`);
  assert.ok(result.findings.some((finding) => finding.blocking), `${label} has blocking finding`);
}

async function runPolicyWitnesses(api) {
  const smellyRoot = join(fixtureRoot, "projects", "smelly");
  const cleanRoot = join(fixtureRoot, "projects", "clean");
  const emptyInclude = await api.validateCodeSmells(smellyRoot, { includePaths: [] });
  const emptySuffixes = await api.validateCodeSmells(smellyRoot, { fileSuffixes: [] });
  assertFailClosed("empty includePaths", emptyInclude);
  assertFailClosed("empty fileSuffixes", emptySuffixes);
  requireRule(emptyInclude, "input.invalid-option", (finding) => finding.message.includes("includePaths"));
  requireRule(emptySuffixes, "input.invalid-option", (finding) => finding.message.includes("fileSuffixes"));

  const defaultSmelly = await api.validateCodeSmells(smellyRoot);
  const defaultClean = await api.validateCodeSmells(cleanRoot);
  assertTypedP2Result(defaultSmelly);
  assertTypedP2Result(defaultClean);
  assert.equal(defaultSmelly.evidence.defaultPolicyUsed, true, "default smelly policy marker");
  assert.ok(defaultSmelly.evidence.parsedFiles > 0, "default smelly parses TS files");
  assert.equal(defaultSmelly.ok, false, "default smelly detects blocking smells");
  assert.equal(defaultClean.ok, true, "default clean passes");
  assert.ok(defaultClean.evidence.parsedFiles > 0, "default clean parses TS files");

  const explicitInclude = await api.validateCodeSmells(smellyRoot, { includePaths: ["src"], maxFileBytes: 262144 });
  const explicitSuffix = await api.validateCodeSmells(smellyRoot, { includePaths: ["src"], fileSuffixes: [".ts"], maxFileBytes: 262144 });
  assertTypedP2Result(explicitInclude);
  assertTypedP2Result(explicitSuffix);
  assert.equal(explicitInclude.ok, false, "non-empty includePaths still detects smelly fixture");
  assert.equal(explicitSuffix.ok, false, "non-empty fileSuffixes still detects smelly fixture");
  assert.ok(explicitInclude.evidence.parsedFiles > 0, "explicit include parses files");
  assert.ok(explicitSuffix.evidence.parsedFiles > 0, "explicit suffix parses files");

  const cases = { emptyInclude, emptySuffixes, defaultSmelly, defaultClean, explicitInclude, explicitSuffix };
  writeJson(join(outputRoot, "policy-results.json"), cases);
  return cases;
}

async function runMalformedWitnesses(api) {
  const cleanRoot = join(fixtureRoot, "projects", "clean");
  const parseFailureRoot = join(fixtureRoot, "projects", "parse-failure");
  const cases = {
    nonObjectOptions: await api.validateCodeSmells(cleanRoot, null),
    unknownOption: await api.validateCodeSmells(cleanRoot, { unexpected: true }),
    unsupportedDetector: await api.validateCodeSmells(cleanRoot, { detectors: ["not-a-detector"] }),
    traversalInclude: await api.validateCodeSmells(cleanRoot, { includePaths: ["../outside"] }),
    absoluteInclude: await api.validateCodeSmells(cleanRoot, { includePaths: [repoRoot] }),
    badSuffix: await api.validateCodeSmells(cleanRoot, { fileSuffixes: ["ts"] }),
    missingRoot: await api.validateCodeSmells(join(fixtureRoot, "projects", "missing-root")),
    oversizedFileCap: await api.validateCodeSmells(cleanRoot, { includePaths: ["src/clean.ts"], maxFileBytes: 1 }),
    parseFailure: await api.validateCodeSmells(parseFailureRoot, { includePaths: ["src"], maxFileBytes: 262144 }),
    unknownAllowlistOption: await api.validateCodeSmells(cleanRoot, { allowlist: {} })
  };
  for (const [label, result] of Object.entries(cases)) {
    assertFailClosed(label, result);
  }
  requireRule(cases.nonObjectOptions, "input.invalid-option");
  requireRule(cases.unknownOption, "input.unknown-option");
  requireRule(cases.unsupportedDetector, "input.invalid-option");
  requireRule(cases.traversalInclude, "input.path-traversal");
  requireRule(cases.absoluteInclude, "input.absolute-path");
  requireRule(cases.badSuffix, "input.invalid-option");
  requireRule(cases.missingRoot, "input.source-root-unreadable");
  requireRule(cases.oversizedFileCap, "input.file-too-large");
  requireRule(cases.parseFailure, "parse.syntax-error");
  requireRule(cases.unknownAllowlistOption, "input.unknown-option");
  writeJson(join(outputRoot, "malformed-results.json"), cases);
  return cases;
}

async function runDetectorWitnesses(api) {
  const smelly = await api.validateCodeSmells(join(fixtureRoot, "projects", "smelly"), { includePaths: ["src"], maxFileBytes: 262144 });
  const clean = await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { includePaths: ["src"], maxFileBytes: 262144 });
  assertTypedP2Result(smelly);
  assertTypedP2Result(clean);
  assert.equal(smelly.ok, false, "smelly fixture blocks");
  assert.equal(clean.ok, true, "clean fixture passes");
  requireRule(smelly, "deep-control-flow-nesting", (finding) => finding.mode === "hard" && finding.blocking);
  requireRule(smelly, "deep-control-flow-nesting", (finding) => finding.mode === "advisory" && !finding.blocking);
  requireRule(smelly, "combinatorial-path-explosion", (finding) => finding.mode === "hard" && finding.blocking);
  requireRule(smelly, "combinatorial-path-explosion", (finding) => finding.mode === "ratcheted" && !finding.blocking);
  requireRule(smelly, "catch-log-continue", (finding) => finding.mode === "hard" && finding.blocking);
  requireRule(smelly, "silent-no-op-dispatcher", (finding) => finding.mode === "hard" && finding.blocking);
  requireRule(smelly, "serialized-json-assembled-as-strings", (finding) => finding.mode === "advisory" && !finding.blocking);
  writeJson(join(outputRoot, "detector-smelly-result.json"), smelly);
  writeJson(join(outputRoot, "detector-clean-result.json"), clean);
  return { smelly, clean };
}

async function runStableIdentityWitness(api) {
  const before = await api.validateCodeSmells(join(fixtureRoot, "projects", "stable-before"), { includePaths: ["src/stable.ts"], detectors: ["deep-control-flow-nesting"], maxFileBytes: 262144 });
  const after = await api.validateCodeSmells(join(fixtureRoot, "projects", "stable-after"), { includePaths: ["src/stable.ts"], detectors: ["deep-control-flow-nesting"], maxFileBytes: 262144 });
  const beforeFinding = requireRule(before, "deep-control-flow-nesting", (finding) => finding.identity.symbol.includes("stableNested"));
  const afterFinding = requireRule(after, "deep-control-flow-nesting", (finding) => finding.identity.symbol.includes("stableNested"));
  assert.deepEqual(beforeFinding.identity, afterFinding.identity, "identity stable across unrelated line movement");
  assert.notEqual(beforeFinding.evidence.line, afterFinding.evidence.line, "line evidence moved while identity stayed stable");
  const evidence = { before: beforeFinding.identity, after: afterFinding.identity, beforeLine: beforeFinding.evidence.line, afterLine: afterFinding.evidence.line };
  writeJson(join(outputRoot, "stable-identity.json"), evidence);
  return evidence;
}

function ratchetEntryFromP2Finding(finding) {
  return {
    tool: "p2.code-smell",
    ruleId: finding.ruleId,
    severity: finding.blocking ? "error" : "warning",
    path: finding.path,
    message: finding.message,
    identity: finding.identity,
    evidence: {
      sourcePath: finding.evidence.sourcePath,
      sourceExcerpt: finding.evidence.sourceExcerpt
    }
  };
}

function prepareRatchetVariant(selectedFinding, variant) {
  const variantRoot = join(scratchRoot, "ratchet", variant);
  ensureDirectory(variantRoot);
  const sourceRelative = selectedFinding.evidence.sourcePath;
  const sourceText = normalizeLineEndings(readFileSync(join(fixtureRoot, "projects", "smelly", sourceRelative), "utf8"));
  ensureDirectory(join(scratchRoot, dirname(sourceRelative)));
  writeFileSync(join(scratchRoot, sourceRelative), sourceText);
  const surfaceEntries = [{ path: sourceRelative, sha256: sha256(sourceText) }];
  const surfaceFingerprint = sha256(JSON.stringify(surfaceEntries));
  const entry = ratchetEntryFromP2Finding(selectedFinding);
  const baselineDebt = variant === "unchanged" ? [{ identity: entry.identity, message: entry.message, firstSeen: "2026-06-26", evidence: { sourcePath: entry.evidence.sourcePath } }] : [];
  writeJson(join(variantRoot, "baseline.json"), { schemaVersion: "quality-ratchet.baseline/1", family: "p1.quality-ratchet", surfaceFingerprint, debt: baselineDebt });
  writeJson(join(variantRoot, "findings.json"), { schemaVersion: "quality-ratchet.findings/1", family: "p1.quality-ratchet", surfaceFingerprint, sourceFingerprintPath: `ratchet/${variant}/surface.json`, runnerEvidencePath: `ratchet/${variant}/runner-evidence.json`, findings: [entry] });
  writeJson(join(variantRoot, "approvals.json"), { schemaVersion: "quality-ratchet.approvals/1", family: "p1.quality-ratchet", approvals: [] });
  writeJson(join(variantRoot, "surface.json"), { schemaVersion: "quality-ratchet.surface-fingerprint/1", family: "p1.quality-ratchet", fingerprint: surfaceFingerprint, entries: surfaceEntries });
  writeJson(join(variantRoot, "runner-evidence.json"), { schemaVersion: "quality-ratchet.runner-evidence/1", family: "p1.quality-ratchet", runnerId: "postfix-p2-regression-witness", status: "completed", command: "node postfix-p2-regression-witness.mjs", findingCarrierPath: `ratchet/${variant}/findings.json`, surfaceFingerprintPath: `ratchet/${variant}/surface.json`, sourceFiles: surfaceEntries.map((entryValue) => entryValue.path) });
}

async function runRatchetWitness(selectedFinding) {
  rmSync(scratchRoot, { recursive: true, force: true });
  prepareRatchetVariant(selectedFinding, "unchanged");
  prepareRatchetVariant(selectedFinding, "new-debt");
  const malformedRoot = join(scratchRoot, "ratchet", "malformed");
  ensureDirectory(malformedRoot);
  writeJson(join(malformedRoot, "baseline.json"), { schemaVersion: "quality-ratchet.baseline/1", family: "p1.quality-ratchet", surfaceFingerprint: "0".repeat(64), debt: [] });
  writeJson(join(malformedRoot, "findings.json"), { schemaVersion: "quality-ratchet.findings/1", family: "p1.quality-ratchet", findings: [] });
  writeJson(join(malformedRoot, "approvals.json"), { schemaVersion: "quality-ratchet.approvals/1", family: "p1.quality-ratchet", approvals: [] });

  const optionsFor = (variant) => ({ baselinePath: `ratchet/${variant}/baseline.json`, findingCarrierPath: `ratchet/${variant}/findings.json`, approvalPath: `ratchet/${variant}/approvals.json`, surfaceFingerprintPath: `ratchet/${variant}/surface.json`, runnerEvidencePath: `ratchet/${variant}/runner-evidence.json`, maxFileBytes: 262144 });
  const unchanged = await validateQualityRatchet(scratchRoot, optionsFor("unchanged"));
  const newDebt = await validateQualityRatchet(scratchRoot, optionsFor("new-debt"));
  const malformed = await validateQualityRatchet(scratchRoot, optionsFor("malformed"));
  assert.equal(unchanged.ok, true, "unchanged P2 carrier passes ratchet");
  assert.equal(newDebt.ok, false, "new P2 finding fails ratchet as new debt");
  assert.ok(newDebt.findings.some((finding) => finding.ruleId === "debt.new-finding"), "new debt finding present");
  assert.equal(malformed.ok, false, "malformed carrier/evidence fails closed");
  assert.ok(malformed.evidence.failClosed, "malformed ratchet evidence failClosed");
  const evidence = { unchanged, newDebt, malformed, realBoundary: "actual validateCodeSmells compiled API carrier consumed by actual validateQualityRatchet from P1" };
  writeJson(join(outputRoot, "ratchet-seam.json"), evidence);
  return evidence;
}

function runSiblingWitnesses() {
  const packageRoot = join(repoRoot, "packages", "mechanical-gates");
  const p0Commands = [
    ["p0-allowlist-domain-aggregate", process.execPath, ["fixtures/p0/allowlist-domain-aggregate/witness.mjs"], packageRoot],
    ["p0-surface-config-boundaries", process.execPath, ["fixtures/p0/surface-config-boundaries/witness.mjs"], packageRoot],
    ["p0-testing-boundary", process.execPath, ["fixtures/p0/testing-boundary/witness.mjs"], packageRoot]
  ];
  const executed = p0Commands.map(([label, command, args, cwd]) => runCommand(label, command, args, { cwd }));
  const skipped = [{ label: "p1-aggregate-witness", reason: "existing witness writes under .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/** outside I-13 post-fix write license; P2-to-P1 ratchet seam is covered separately in this script" }];
  const evidence = { executed: executed.map((entry) => ({ label: entry.label, status: entry.status, cwd: entry.cwd })), skipped };
  writeJson(join(outputRoot, "sibling-witnesses.json"), evidence);
  return evidence;
}

async function main() {
  ensureDirectory(outputRoot);
  const api = await compileAndImportP2();
  assert.equal(api.CODE_SMELL_FAMILY, "p2.code-smell", "family constant");
  assert.equal(api.CODE_SMELL_TOOL, "p2.code-smell", "tool constant");
  const policy = await runPolicyWitnesses(api);
  const malformed = await runMalformedWitnesses(api);
  const detectors = await runDetectorWitnesses(api);
  const stable = await runStableIdentityWitness(api);
  const selectedFinding = requireRule(detectors.smelly, "deep-control-flow-nesting", (finding) => finding.mode === "hard" && finding.blocking);
  const ratchet = await runRatchetWitness(selectedFinding);
  const siblings = runSiblingWitnesses();
  const summary = {
    ok: true,
    compiledApi: relative(repoRoot, join(compiledRoot, "index.js")),
    emptyInclude: { ok: policy.emptyInclude.ok, failClosed: policy.emptyInclude.evidence.failClosed, blockingFindings: policy.emptyInclude.findings.filter((finding) => finding.blocking).length },
    emptySuffixes: { ok: policy.emptySuffixes.ok, failClosed: policy.emptySuffixes.evidence.failClosed, blockingFindings: policy.emptySuffixes.findings.filter((finding) => finding.blocking).length },
    defaults: { smellyOk: policy.defaultSmelly.ok, smellyParsed: policy.defaultSmelly.evidence.parsedFiles, cleanOk: policy.defaultClean.ok, cleanParsed: policy.defaultClean.evidence.parsedFiles },
    explicit: { includeOk: policy.explicitInclude.ok, includeParsed: policy.explicitInclude.evidence.parsedFiles, suffixOk: policy.explicitSuffix.ok, suffixParsed: policy.explicitSuffix.evidence.parsedFiles },
    malformedCases: Object.keys(malformed),
    detectors: { smellyFindings: detectors.smelly.findings.length, cleanFindings: detectors.clean.findings.length },
    stable,
    ratchet: { unchangedOk: ratchet.unchanged.ok, newDebtOk: ratchet.newDebt.ok, malformedOk: ratchet.malformed.ok },
    siblings
  };
  writeJson(join(outputRoot, "summary.json"), summary);
  console.log(JSON.stringify(summary, null, 2));
}

await main();
