import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { validateQualityRatchet } from "../../../src/p1/quality-ratchet/index.js";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(fixtureRoot, "..", "..", "..");
const repoRoot = resolve(packageRoot, "..", "..");
const workRoot = join(repoRoot, ".vibe", "work", "I-13-mechanical-P2-smell-framework");
const typecheckOnly = process.argv.includes("--typecheck");
const evidenceRoot = join(workRoot, typecheckOnly ? "typecheck-evidence" : "witness-evidence");
const compileRoot = join(workRoot, "compiled-p2-code-smell");

function ensureDirectory(pathValue) {
  mkdirSync(pathValue, { recursive: true });
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function normalizeLineEndings(text) {
  return text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function writeJson(pathValue, value) {
  ensureDirectory(dirname(pathValue));
  writeFileSync(pathValue, JSON.stringify(value, null, 2));
}

function runCommand(label, command, args, options = {}) {
  const completed = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", ...options });
  const evidence = { label, command, args, cwd: options.cwd ?? repoRoot, status: completed.status, stdout: completed.stdout, stderr: completed.stderr };
  writeJson(join(evidenceRoot, `${label.replace(/[^a-z0-9_.-]+/gi, "-").toLowerCase()}.json`), evidence);
  assert.equal(completed.status, 0, `${label} failed: ${completed.stderr || completed.stdout}`);
  return evidence;
}

function compileP2Source() {
  rmSync(compileRoot, { recursive: true, force: true });
  ensureDirectory(evidenceRoot);
  runCommand("p2 source compile", "pnpm", [
    "exec", "tsc",
    "--outDir", relative(repoRoot, compileRoot),
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
  assert.ok(existsSync(join(compileRoot, "index.js")), "compiled P2 index.js exists");
}

async function importCompiledApi() {
  compileP2Source();
  return import(pathToFileURL(join(compileRoot, "index.js")).href);
}

function assertTypedP2Result(result) {
  assert.equal(result.family, "p2.code-smell", "P2 family");
  assert.equal(typeof result.ok, "boolean", "P2 ok boolean");
  assert.equal(typeof result.projectRoot, "string", "P2 projectRoot string");
  assert.ok(Array.isArray(result.findings), "P2 findings array");
  assert.ok(result.evidence && typeof result.evidence === "object" && !Array.isArray(result.evidence), "P2 evidence object");
  for (const finding of result.findings) {
    for (const key of ["family", "ruleId", "detectorId", "severity", "blocking", "path", "message", "evidence", "identity", "confidence", "mode", "threshold"]) {
      assert.ok(Object.hasOwn(finding, key), `finding missing ${key}`);
    }
    assert.equal(finding.family, "p2.code-smell", "finding family");
    assert.equal(finding.identity.tool, "p2.code-smell", "identity tool");
    assert.equal(finding.identity.ruleId, finding.ruleId, "identity ruleId");
    assert.equal(finding.identity.path, finding.path, "identity path");
    assert.ok(finding.identity.symbol.length > 0, "identity symbol");
    assert.ok(finding.identity.structuralSignature.length > 0, "identity structural signature");
    assert.match(finding.identity.contentHash, /^[a-f0-9]{64}$/u, "identity content hash");
    assert.equal(finding.evidence.sourceHash, finding.identity.contentHash, "source hash matches identity hash");
    assert.equal(finding.evidence.calibration.mode, finding.mode, "calibration mode");
  }
}

function requireRule(result, ruleId, predicate = () => true) {
  const finding = result.findings.find((entry) => entry.ruleId === ruleId && predicate(entry));
  assert.ok(finding, `missing ${ruleId}; got ${result.findings.map((entry) => `${entry.ruleId}:${entry.mode}`).join(",")}`);
  return finding;
}

async function runTypecheckWitness() {
  ensureDirectory(evidenceRoot);
  runCommand("p2 typecheck public consumer", "pnpm", [
    "exec", "tsc",
    "--noEmit",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict",
    "--skipLibCheck", "false",
    "--lib", "ES2022",
    "packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts",
    "packages/mechanical-gates/src/p2/code-smell/index.ts",
    "packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts"
  ]);
  const api = await importCompiledApi();
  assert.equal(api.CODE_SMELL_FAMILY, "p2.code-smell", "family constant");
  assert.equal(typeof api.validateCodeSmells, "function", "validateCodeSmells export");
  const result = await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { includePaths: ["src"], maxFileBytes: 262144 });
  assertTypedP2Result(result);
  assert.equal(result.ok, true, `clean typecheck boundary should be ok: ${JSON.stringify(result.findings, null, 2)}`);
  const evidence = { ok: true, mode: "typecheck", compiledApi: relative(repoRoot, join(compileRoot, "index.js")), typecheckConsumer: "packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts", cleanBoundaryFindings: result.findings.length };
  writeJson(join(evidenceRoot, "p2-typecheck-boundary.json"), evidence);
  console.log(JSON.stringify(evidence));
}

async function runDetectorWitness(api) {
  const smelly = await api.validateCodeSmells(join(fixtureRoot, "projects", "smelly"), { includePaths: ["src"], maxFileBytes: 262144 });
  assertTypedP2Result(smelly);
  requireRule(smelly, "deep-control-flow-nesting", (finding) => finding.mode === "hard" && finding.blocking);
  requireRule(smelly, "deep-control-flow-nesting", (finding) => finding.mode === "advisory" && !finding.blocking);
  requireRule(smelly, "combinatorial-path-explosion", (finding) => finding.mode === "hard" && finding.blocking);
  requireRule(smelly, "combinatorial-path-explosion", (finding) => finding.mode === "ratcheted" && !finding.blocking);
  requireRule(smelly, "catch-log-continue", (finding) => finding.mode === "hard" && finding.blocking);
  requireRule(smelly, "silent-no-op-dispatcher", (finding) => finding.mode === "hard" && finding.blocking);
  requireRule(smelly, "serialized-json-assembled-as-strings", (finding) => finding.mode === "advisory" && !finding.blocking);
  assert.equal(smelly.ok, false, "smelly project blocks on hard findings");

  const clean = await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { includePaths: ["src"], maxFileBytes: 262144 });
  assertTypedP2Result(clean);
  assert.equal(clean.ok, true, `clean project should not be flagged: ${JSON.stringify(clean.findings, null, 2)}`);

  writeJson(join(evidenceRoot, "p2-smelly-result.json"), smelly);
  writeJson(join(evidenceRoot, "p2-clean-result.json"), clean);
  return { smelly, clean };
}

async function runMalformedWitness(api) {
  const invalidOptions = await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { unexpected: true });
  const invalidPolicyObject = await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), null);
  const traversal = await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { includePaths: ["../outside"] });
  const absolute = await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { includePaths: [repoRoot] });
  const missingRoot = await api.validateCodeSmells(join(fixtureRoot, "projects", "missing-root"));
  const oversized = await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { includePaths: ["src/clean.ts"], maxFileBytes: 16 });
  const parseFailure = await api.validateCodeSmells(join(fixtureRoot, "projects", "parse-failure"), { includePaths: ["src"], maxFileBytes: 262144 });
  const cases = { invalidOptions, invalidPolicyObject, traversal, absolute, missingRoot, oversized, parseFailure };
  for (const [label, result] of Object.entries(cases)) {
    assertTypedP2Result(result);
    assert.equal(result.ok, false, `${label} must fail closed`);
    assert.ok(result.findings.some((finding) => finding.blocking), `${label} has blocking finding`);
  }
  requireRule(invalidOptions, "input.unknown-option", (finding) => finding.message.includes("Unknown code-smell option"));
  requireRule(invalidPolicyObject, "input.invalid-option", (finding) => finding.message.includes("strict object"));
  requireRule(traversal, "input.path-traversal", (finding) => finding.message.includes("traversal"));
  requireRule(absolute, "input.absolute-path", (finding) => finding.message.includes("Absolute"));
  requireRule(oversized, "input.file-too-large", (finding) => finding.message.includes("bounded read cap"));
  requireRule(parseFailure, "parse.syntax-error", (finding) => finding.message.includes("parser"));
  writeJson(join(evidenceRoot, "p2-malformed-results.json"), cases);
  return cases;
}

async function runStableIdentityWitness(api) {
  const before = await api.validateCodeSmells(join(fixtureRoot, "projects", "stable-before"), { includePaths: ["src/stable.ts"], detectors: ["deep-control-flow-nesting"], maxFileBytes: 262144 });
  const after = await api.validateCodeSmells(join(fixtureRoot, "projects", "stable-after"), { includePaths: ["src/stable.ts"], detectors: ["deep-control-flow-nesting"], maxFileBytes: 262144 });
  const beforeFinding = requireRule(before, "deep-control-flow-nesting", (finding) => finding.identity.symbol.includes("stableNested"));
  const afterFinding = requireRule(after, "deep-control-flow-nesting", (finding) => finding.identity.symbol.includes("stableNested"));
  assert.deepEqual(beforeFinding.identity, afterFinding.identity, "stable identity unchanged by unrelated line movement before symbol");
  const evidence = { before: beforeFinding.identity, after: afterFinding.identity, beforeLine: beforeFinding.evidence.line, afterLine: afterFinding.evidence.line };
  writeJson(join(evidenceRoot, "p2-stable-identity.json"), evidence);
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

function writeRatchetArtifacts(p2Finding, variant) {
  const ratchetRoot = join(fixtureRoot, "ratchet-fixture", variant);
  rmSync(ratchetRoot, { recursive: true, force: true });
  ensureDirectory(ratchetRoot);
  const sourceRelative = p2Finding.evidence.sourcePath;
  const sourceAbsolute = join(fixtureRoot, "projects", "smelly", sourceRelative);
  const sourceText = normalizeLineEndings(readFileSync(sourceAbsolute, "utf8"));
  const sourceHash = sha256(sourceText);
  const surfaceEntries = [{ path: `projects/smelly/${sourceRelative}`, sha256: sourceHash }];
  const surfaceFingerprint = sha256(JSON.stringify(surfaceEntries));
  const entry = ratchetEntryFromP2Finding({ ...p2Finding, path: `projects/smelly/${p2Finding.path}`, identity: { ...p2Finding.identity, path: `projects/smelly/${p2Finding.identity.path}` }, evidence: { ...p2Finding.evidence, sourcePath: `projects/smelly/${p2Finding.evidence.sourcePath}` } });
  const baselineDebt = variant === "unchanged" ? [{ identity: entry.identity, message: entry.message, firstSeen: "2026-06-26", evidence: { sourcePath: entry.evidence.sourcePath } }] : [];
  const baseline = { schemaVersion: "quality-ratchet.baseline/1", family: "p1.quality-ratchet", surfaceFingerprint, debt: baselineDebt };
  const carrier = { schemaVersion: "quality-ratchet.findings/1", family: "p1.quality-ratchet", surfaceFingerprint, sourceFingerprintPath: `ratchet-fixture/${variant}/surface.json`, runnerEvidencePath: `ratchet-fixture/${variant}/runner-evidence.json`, findings: [entry] };
  const approvals = { schemaVersion: "quality-ratchet.approvals/1", family: "p1.quality-ratchet", approvals: [] };
  const surface = { schemaVersion: "quality-ratchet.surface-fingerprint/1", family: "p1.quality-ratchet", fingerprint: surfaceFingerprint, entries: surfaceEntries };
  const runner = { schemaVersion: "quality-ratchet.runner-evidence/1", family: "p1.quality-ratchet", runnerId: "p2-code-smell-witness", status: "completed", command: "node packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs", findingCarrierPath: `ratchet-fixture/${variant}/findings.json`, surfaceFingerprintPath: `ratchet-fixture/${variant}/surface.json`, sourceFiles: surfaceEntries.map((entryValue) => entryValue.path) };
  writeJson(join(ratchetRoot, "baseline.json"), baseline);
  writeJson(join(ratchetRoot, "findings.json"), carrier);
  writeJson(join(ratchetRoot, "approvals.json"), approvals);
  writeJson(join(ratchetRoot, "surface.json"), surface);
  writeJson(join(ratchetRoot, "runner-evidence.json"), runner);
  return ratchetRoot;
}

async function runRatchetWitness(p2SmellyResult) {
  const selectedFinding = requireRule(p2SmellyResult, "deep-control-flow-nesting", (finding) => finding.mode === "hard");
  const unchangedRoot = writeRatchetArtifacts(selectedFinding, "unchanged");
  const newDebtRoot = writeRatchetArtifacts(selectedFinding, "new-debt");
  const malformedRoot = join(fixtureRoot, "ratchet-fixture", "malformed");
  rmSync(malformedRoot, { recursive: true, force: true });
  ensureDirectory(malformedRoot);
  writeJson(join(malformedRoot, "baseline.json"), { schemaVersion: "quality-ratchet.baseline/1", family: "p1.quality-ratchet", surfaceFingerprint: "0".repeat(64), debt: [] });
  writeJson(join(malformedRoot, "findings.json"), { schemaVersion: "quality-ratchet.findings/1", family: "p1.quality-ratchet", findings: [] });
  writeJson(join(malformedRoot, "approvals.json"), { schemaVersion: "quality-ratchet.approvals/1", family: "p1.quality-ratchet", approvals: [] });

  const unchangedOptions = { baselinePath: "ratchet-fixture/unchanged/baseline.json", findingCarrierPath: "ratchet-fixture/unchanged/findings.json", approvalPath: "ratchet-fixture/unchanged/approvals.json", surfaceFingerprintPath: "ratchet-fixture/unchanged/surface.json", runnerEvidencePath: "ratchet-fixture/unchanged/runner-evidence.json", maxFileBytes: 262144 };
  const newDebtOptions = { baselinePath: "ratchet-fixture/new-debt/baseline.json", findingCarrierPath: "ratchet-fixture/new-debt/findings.json", approvalPath: "ratchet-fixture/new-debt/approvals.json", surfaceFingerprintPath: "ratchet-fixture/new-debt/surface.json", runnerEvidencePath: "ratchet-fixture/new-debt/runner-evidence.json", maxFileBytes: 262144 };
  const malformedOptions = { baselinePath: "ratchet-fixture/malformed/baseline.json", findingCarrierPath: "ratchet-fixture/malformed/findings.json", approvalPath: "ratchet-fixture/malformed/approvals.json", surfaceFingerprintPath: "ratchet-fixture/malformed/surface.json", runnerEvidencePath: "ratchet-fixture/malformed/runner-evidence.json", maxFileBytes: 262144 };
  const unchanged = await validateQualityRatchet(fixtureRoot, unchangedOptions);
  const newDebt = await validateQualityRatchet(fixtureRoot, newDebtOptions);
  const malformed = await validateQualityRatchet(fixtureRoot, malformedOptions);
  assert.equal(unchanged.family, "p1.quality-ratchet", "ratchet family");
  assert.equal(unchanged.ok, true, `unchanged P2 carrier should satisfy ratchet: ${JSON.stringify(unchanged.findings, null, 2)}`);
  assert.equal(newDebt.ok, false, "new P2 finding should be ratchet debt");
  assert.ok(newDebt.findings.some((finding) => finding.ruleId === "debt.new-finding"), "new debt rule observed");
  assert.equal(malformed.ok, false, "malformed ratchet carrier/evidence fails closed");
  assert.ok(malformed.findings.some((finding) => finding.ruleId === "finding-carrier.schema-invalid" || finding.ruleId === "surface.schema-invalid" || finding.ruleId === "evidence.missing-runner"), "malformed ratchet evidence rule observed");
  const evidence = { unchanged, newDebt, malformed, realBoundary: "compiled P2 finding carrier consumed by actual validateQualityRatchet from src/p1/quality-ratchet/index.js" };
  writeJson(join(evidenceRoot, "p2-to-i12-ratchet.json"), evidence);
  return evidence;
}

function runSiblingRegressionWitnesses() {
  const commands = [
    ["p0 allowlist-domain aggregate", "node", ["fixtures/p0/allowlist-domain-aggregate/witness.mjs"], { cwd: packageRoot }],
    ["p0 surface-config-boundaries", "node", ["fixtures/p0/surface-config-boundaries/witness.mjs"], { cwd: packageRoot }],
    ["p0 testing-boundary", "node", ["fixtures/p0/testing-boundary/witness.mjs"], { cwd: packageRoot }],
    ["p1 aggregate witness", "node", ["packages/mechanical-gates/fixtures/p1/aggregate/witness.mjs"], { cwd: repoRoot }]
  ];
  return commands.map(([label, command, args, options]) => runCommand(label, command, args, options));
}

async function runFullWitness() {
  ensureDirectory(evidenceRoot);
  const api = await importCompiledApi();
  assert.equal(api.CODE_SMELL_TOOL, "p2.code-smell", "tool constant");
  const detectorEvidence = await runDetectorWitness(api);
  const malformedEvidence = await runMalformedWitness(api);
  const stableEvidence = await runStableIdentityWitness(api);
  const ratchetEvidence = await runRatchetWitness(detectorEvidence.smelly);
  const siblingEvidence = runSiblingRegressionWitnesses();
  const summary = {
    ok: true,
    compiledApi: relative(repoRoot, join(compileRoot, "index.js")),
    smellyFindingCount: detectorEvidence.smelly.findings.length,
    cleanFindingCount: detectorEvidence.clean.findings.length,
    malformedCases: Object.keys(malformedEvidence),
    stableIdentity: stableEvidence,
    ratchet: {
      unchangedOk: ratchetEvidence.unchanged.ok,
      newDebtOk: ratchetEvidence.newDebt.ok,
      malformedOk: ratchetEvidence.malformed.ok
    },
    siblingCommands: siblingEvidence.map((entry) => ({ label: entry.label, status: entry.status })),
    realBoundary: "compiled P2 API executed over on-disk fixtures; actual I-12 validateQualityRatchet consumed P2 carrier"
  };
  writeJson(join(evidenceRoot, "p2-witness-summary.json"), summary);
  console.log(JSON.stringify(summary));
}

if (typecheckOnly) {
  await runTypecheckWitness();
} else {
  await runFullWitness();
}
