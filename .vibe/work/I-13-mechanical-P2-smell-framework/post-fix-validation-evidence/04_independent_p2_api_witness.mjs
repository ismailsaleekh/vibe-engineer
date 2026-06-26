import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const evidenceRoot = join(repoRoot, ".vibe", "work", "I-13-mechanical-P2-smell-framework", "post-fix-validation-evidence");
const outputRoot = join(evidenceRoot, "04-output");
const compiledRoot = join(outputRoot, "compiled-p2-source");
const scratchRoot = join(outputRoot, "scratch-ratchet-root");
const fixtureRoot = join(repoRoot, "packages", "mechanical-gates", "fixtures", "p2", "code-smell");
const smellyProject = join(fixtureRoot, "projects", "smelly");
const cleanProject = join(fixtureRoot, "projects", "clean");
const parseFailureProject = join(fixtureRoot, "projects", "parse-failure");
const stableBeforeProject = join(fixtureRoot, "projects", "stable-before");
const stableAfterProject = join(fixtureRoot, "projects", "stable-after");

function ensureDirectory(pathValue) {
  mkdirSync(pathValue, { recursive: true });
}

function writeJson(relativePath, value) {
  const pathValue = join(outputRoot, relativePath);
  ensureDirectory(dirname(pathValue));
  writeFileSync(pathValue, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function normalizeLineEndings(text) {
  return text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function runCommand(label, command, args, cwd = repoRoot) {
  const completed = spawnSync(command, args, { cwd, encoding: "utf8" });
  const evidence = {
    label,
    cwd,
    command: [command, ...args].join(" "),
    status: completed.status,
    signal: completed.signal,
    stdout: completed.stdout,
    stderr: completed.stderr,
    errorMessage: completed.error instanceof Error ? completed.error.message : undefined
  };
  writeJson(join("commands", `${label}.json`), evidence);
  assert.equal(completed.status, 0, `${label} failed: ${completed.stderr || completed.stdout}`);
  return evidence;
}

function assertSha256(value, label) {
  assert.match(value, /^[a-f0-9]{64}$/u, `${label} must be sha256 hex`);
}

function assertFindingSchema(finding) {
  assert.equal(finding.family, "p2.code-smell", "finding family");
  assert.equal(typeof finding.ruleId, "string", "finding ruleId string");
  assert.equal(typeof finding.detectorId, "string", "finding detectorId string");
  assert.ok(finding.severity === "error" || finding.severity === "warning", "finding severity enum");
  assert.equal(typeof finding.blocking, "boolean", "finding blocking boolean");
  assert.equal(typeof finding.path, "string", "finding path string");
  assert.equal(typeof finding.message, "string", "finding message string");
  assert.equal(typeof finding.confidence, "number", "finding confidence number");
  assert.ok(finding.mode === "hard" || finding.mode === "advisory" || finding.mode === "ratcheted", "finding mode enum");
  assert.ok(finding.identity && typeof finding.identity === "object" && !Array.isArray(finding.identity), "identity object");
  assert.equal(finding.identity.tool, "p2.code-smell", "identity tool");
  assert.equal(finding.identity.ruleId, finding.ruleId, "identity ruleId matches finding");
  assert.equal(finding.identity.path, finding.path, "identity path matches finding");
  assert.equal(typeof finding.identity.symbol, "string", "identity symbol string");
  assert.ok(finding.identity.symbol.length > 0, "identity symbol non-empty");
  assert.equal(typeof finding.identity.structuralSignature, "string", "identity structural signature string");
  assert.ok(finding.identity.structuralSignature.length > 0, "identity structural signature non-empty");
  assertSha256(finding.identity.contentHash, "identity contentHash");
  assert.equal(Object.hasOwn(finding.identity, "line"), false, "stable identity excludes line-only identity");
  assert.ok(finding.evidence && typeof finding.evidence === "object" && !Array.isArray(finding.evidence), "finding evidence object");
  assert.equal(finding.evidence.schemaVersion, "p2.code-smell.finding/1", "finding schema version");
  assert.equal(finding.evidence.tool, "p2.code-smell", "finding evidence tool");
  assert.equal(finding.evidence.detectorId, finding.detectorId, "evidence detector matches");
  assert.deepEqual(finding.evidence.identity, finding.identity, "evidence identity matches top-level identity");
  assert.equal(finding.evidence.sourcePath, finding.path, "evidence sourcePath matches path");
  assert.equal(typeof finding.evidence.sourceExcerpt, "string", "source excerpt string");
  assertSha256(finding.evidence.sourceHash, "evidence sourceHash");
  assert.equal(finding.evidence.sourceHash, finding.identity.contentHash, "source hash matches identity content hash");
  assert.equal(typeof finding.evidence.line, "number", "evidence line number");
  assert.equal(finding.evidence.structuralSignature, finding.identity.structuralSignature, "evidence structural signature matches");
  assert.ok(finding.evidence.calibration && typeof finding.evidence.calibration === "object", "calibration object");
  assert.equal(finding.evidence.calibration.mode, finding.mode, "calibration mode matches finding mode");
  assert.equal(finding.evidence.calibration.confidence, finding.confidence, "calibration confidence matches");
  assert.deepEqual(finding.evidence.calibration.threshold, finding.threshold, "calibration threshold matches");
  for (const key of ["metric", "observed", "advisory", "ratcheted", "hard"]) {
    assert.ok(Object.hasOwn(finding.threshold, key), `threshold has ${key}`);
  }
  if (finding.mode === "hard") {
    assert.equal(finding.blocking, true, "hard findings block");
    assert.equal(finding.severity, "error", "hard findings are errors");
  } else {
    assert.equal(finding.blocking, false, `${finding.mode} findings do not directly block P2`);
    assert.equal(finding.severity, "warning", `${finding.mode} findings are warnings`);
  }
}

function assertP2Result(result) {
  assert.equal(result.family, "p2.code-smell", "result family");
  assert.equal(typeof result.ok, "boolean", "result ok boolean");
  assert.equal(typeof result.projectRoot, "string", "result projectRoot string");
  assert.ok(Array.isArray(result.findings), "result findings array");
  assert.ok(result.evidence && typeof result.evidence === "object" && !Array.isArray(result.evidence), "result evidence object");
  assert.equal(result.evidence.schemaVersion, "p2.code-smell.result/1", "result schema version");
  assert.equal(result.evidence.tool, "p2.code-smell", "result evidence tool");
  assert.ok(Array.isArray(result.evidence.detectors), "result detectors array");
  assert.ok(Array.isArray(result.evidence.includePaths), "result includePaths array");
  assert.ok(Array.isArray(result.evidence.excludeDirectoryNames), "result excludeDirectoryNames array");
  assert.ok(Array.isArray(result.evidence.fileSuffixes), "result fileSuffixes array");
  assert.equal(typeof result.evidence.maxFileBytes, "number", "result maxFileBytes number");
  assert.ok(Array.isArray(result.evidence.inspectedFiles), "result inspectedFiles array");
  assert.equal(typeof result.evidence.parsedFiles, "number", "result parsedFiles number");
  assert.equal(typeof result.evidence.failClosed, "boolean", "result failClosed boolean");
  assert.equal(result.evidence.allowlist, "not-implemented", "allowlist status stable");
  assert.equal(typeof result.evidence.defaultPolicyUsed, "boolean", "defaultPolicyUsed boolean");
  for (const finding of result.findings) assertFindingSchema(finding);
}

function requireFinding(result, ruleId, predicate = () => true) {
  const found = result.findings.find((finding) => finding.ruleId === ruleId && predicate(finding));
  assert.ok(found, `missing finding ${ruleId}; got ${result.findings.map((finding) => `${finding.ruleId}:${finding.mode}:${finding.blocking}`).join(", ")}`);
  return found;
}

function assertFailClosed(result, label) {
  assertP2Result(result);
  assert.equal(result.ok, false, `${label} must not greenwash`);
  assert.equal(result.evidence.failClosed, true, `${label} failClosed evidence`);
  assert.ok(result.findings.some((finding) => finding.blocking), `${label} has blocking finding`);
}

function compileP2Source() {
  rmSync(compiledRoot, { recursive: true, force: true });
  ensureDirectory(compiledRoot);
  runCommand("compile-p2-source", "pnpm", [
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
  assert.ok(existsSync(join(compiledRoot, "index.js")), "compiled actual P2 source exists");
}

function writeScratchSource() {
  rmSync(scratchRoot, { recursive: true, force: true });
  const sourceDir = join(scratchRoot, "projects", "smelly", "src");
  ensureDirectory(sourceDir);
  const sourceText = readFileSync(join(smellyProject, "src", "smells.ts"), "utf8");
  writeFileSync(join(sourceDir, "smells.ts"), sourceText);
}

function prefixP2FindingForRatchet(finding, prefix) {
  const prefixedPath = `${prefix}/${finding.path}`;
  return {
    tool: "p2.code-smell",
    ruleId: finding.ruleId,
    severity: finding.blocking ? "error" : "warning",
    path: prefixedPath,
    message: finding.message,
    identity: { ...finding.identity, path: prefixedPath },
    evidence: {
      sourcePath: prefixedPath,
      sourceExcerpt: finding.evidence.sourceExcerpt
    }
  };
}

function writeRatchetCase(caseName, entry, baselineDebt, options = {}) {
  const caseRoot = join(scratchRoot, "ratchet", caseName);
  ensureDirectory(caseRoot);
  const sourcePath = "projects/smelly/src/smells.ts";
  const sourceText = normalizeLineEndings(readFileSync(join(scratchRoot, sourcePath), "utf8"));
  const surfaceEntries = [{ path: sourcePath, sha256: sha256(sourceText) }];
  const surfaceFingerprint = sha256(JSON.stringify(surfaceEntries));
  const baseline = {
    schemaVersion: "quality-ratchet.baseline/1",
    family: "p1.quality-ratchet",
    surfaceFingerprint,
    debt: baselineDebt
  };
  const carrier = options.malformedCarrier ? {
    schemaVersion: "quality-ratchet.findings/1",
    family: "p1.quality-ratchet",
    findings: []
  } : {
    schemaVersion: "quality-ratchet.findings/1",
    family: "p1.quality-ratchet",
    surfaceFingerprint,
    sourceFingerprintPath: `ratchet/${caseName}/surface.json`,
    runnerEvidencePath: `ratchet/${caseName}/runner-evidence.json`,
    findings: [entry]
  };
  const approvals = { schemaVersion: "quality-ratchet.approvals/1", family: "p1.quality-ratchet", approvals: [] };
  const surface = { schemaVersion: "quality-ratchet.surface-fingerprint/1", family: "p1.quality-ratchet", fingerprint: surfaceFingerprint, entries: surfaceEntries };
  const runner = options.malformedEvidence ? { schemaVersion: "quality-ratchet.runner-evidence/1", family: "p1.quality-ratchet", runnerId: "independent-p2-api-witness", status: "started", command: "node 04_independent_p2_api_witness.mjs", findingCarrierPath: `ratchet/${caseName}/findings.json`, surfaceFingerprintPath: `ratchet/${caseName}/surface.json`, sourceFiles: [] } : { schemaVersion: "quality-ratchet.runner-evidence/1", family: "p1.quality-ratchet", runnerId: "independent-p2-api-witness", status: "completed", command: "node 04_independent_p2_api_witness.mjs", findingCarrierPath: `ratchet/${caseName}/findings.json`, surfaceFingerprintPath: `ratchet/${caseName}/surface.json`, sourceFiles: [sourcePath] };
  for (const [fileName, value] of Object.entries({ "baseline.json": baseline, "findings.json": carrier, "approvals.json": approvals, "surface.json": surface, "runner-evidence.json": runner })) {
    writeFileSync(join(caseRoot, fileName), `${JSON.stringify(value, null, 2)}\n`);
  }
  return {
    baselinePath: `ratchet/${caseName}/baseline.json`,
    findingCarrierPath: `ratchet/${caseName}/findings.json`,
    approvalPath: `ratchet/${caseName}/approvals.json`,
    surfaceFingerprintPath: `ratchet/${caseName}/surface.json`,
    runnerEvidencePath: `ratchet/${caseName}/runner-evidence.json`,
    maxFileBytes: 262144
  };
}

async function main() {
  rmSync(outputRoot, { recursive: true, force: true });
  ensureDirectory(outputRoot);
  compileP2Source();
  const api = await import(`${pathToFileURL(join(compiledRoot, "index.js")).href}?run=${Date.now()}`);
  const { validateQualityRatchet } = await import(`${pathToFileURL(join(repoRoot, "packages", "mechanical-gates", "src", "p1", "quality-ratchet", "index.js")).href}?run=${Date.now()}`);

  assert.equal(api.CODE_SMELL_FAMILY, "p2.code-smell", "P2 family constant");
  assert.equal(api.CODE_SMELL_TOOL, "p2.code-smell", "P2 tool constant");
  assert.equal(api.CODE_SMELL_RESULT_SCHEMA_VERSION, "p2.code-smell.result/1", "P2 result schema constant");
  assert.equal(api.CODE_SMELL_FINDING_SCHEMA_VERSION, "p2.code-smell.finding/1", "P2 finding schema constant");
  assert.equal(api.CODE_SMELL_RATCHET_CARRIER_VERSION, "quality-ratchet.findings/1", "P2 ratchet carrier version constant");
  assert.deepEqual([...api.CODE_SMELL_DETECTOR_IDS].sort(), [
    "catch-log-continue",
    "combinatorial-path-explosion",
    "deep-control-flow-nesting",
    "serialized-json-assembled-as-strings",
    "silent-no-op-dispatcher"
  ].sort(), "detector constants stable");

  const emptyInclude = await api.validateCodeSmells(smellyProject, { includePaths: [] });
  const emptySuffixes = await api.validateCodeSmells(smellyProject, { fileSuffixes: [] });
  assertFailClosed(emptyInclude, "includePaths empty array");
  assertFailClosed(emptySuffixes, "fileSuffixes empty array");
  requireFinding(emptyInclude, "input.invalid-option", (finding) => finding.message.includes("includePaths"));
  requireFinding(emptySuffixes, "input.invalid-option", (finding) => finding.message.includes("fileSuffixes"));
  assert.equal(emptyInclude.evidence.inspectedFiles.length, 0, "empty include fails before inspecting files");
  assert.equal(emptySuffixes.evidence.inspectedFiles.length, 0, "empty suffix fails before inspecting files");
  assert.equal(emptyInclude.evidence.parsedFiles, 0, "empty include parses no files after fail-closed");
  assert.equal(emptySuffixes.evidence.parsedFiles, 0, "empty suffix parses no files after fail-closed");

  const defaultSmelly = await api.validateCodeSmells(smellyProject);
  const defaultClean = await api.validateCodeSmells(cleanProject);
  assertP2Result(defaultSmelly);
  assertP2Result(defaultClean);
  assert.equal(defaultSmelly.evidence.defaultPolicyUsed, true, "omitted smelly options use defaults");
  assert.equal(defaultClean.evidence.defaultPolicyUsed, true, "omitted clean options use defaults");
  assert.equal(defaultSmelly.ok, false, "default smelly fixture fails on hard smells");
  assert.equal(defaultClean.ok, true, "default clean fixture passes");
  assert.ok(defaultSmelly.evidence.parsedFiles >= 1, "default smelly parses TS files");
  assert.ok(defaultClean.evidence.parsedFiles >= 1, "default clean parses TS files");
  assert.ok(defaultSmelly.evidence.inspectedFiles.includes("src/smells.ts"), "default smelly inspected normal TS source");
  assert.ok(defaultClean.evidence.inspectedFiles.includes("src/clean.ts"), "default clean inspected normal TS source");

  const explicitInclude = await api.validateCodeSmells(smellyProject, { includePaths: ["src"], maxFileBytes: 262144 });
  const explicitSuffix = await api.validateCodeSmells(smellyProject, { fileSuffixes: [".ts"], maxFileBytes: 262144 });
  assertP2Result(explicitInclude);
  assertP2Result(explicitSuffix);
  assert.equal(explicitInclude.ok, false, "non-empty include still detects smelly fixture");
  assert.equal(explicitSuffix.ok, false, "non-empty suffix still detects smelly fixture");
  assert.ok(explicitInclude.evidence.parsedFiles >= 1, "non-empty include parses files");
  assert.ok(explicitSuffix.evidence.parsedFiles >= 1, "non-empty suffix parses files");

  const detectorResult = explicitInclude;
  requireFinding(detectorResult, "deep-control-flow-nesting", (finding) => finding.mode === "hard" && finding.blocking);
  requireFinding(detectorResult, "deep-control-flow-nesting", (finding) => finding.mode === "advisory" && !finding.blocking);
  requireFinding(detectorResult, "combinatorial-path-explosion", (finding) => finding.mode === "hard" && finding.blocking);
  requireFinding(detectorResult, "combinatorial-path-explosion", (finding) => finding.mode === "ratcheted" && !finding.blocking);
  requireFinding(detectorResult, "catch-log-continue", (finding) => finding.mode === "hard" && finding.blocking);
  requireFinding(detectorResult, "silent-no-op-dispatcher", (finding) => finding.mode === "hard" && finding.blocking);
  requireFinding(detectorResult, "serialized-json-assembled-as-strings", (finding) => finding.mode === "advisory" && !finding.blocking);

  const malformedCases = {
    nonObjectOptions: await api.validateCodeSmells(cleanProject, null),
    unknownOption: await api.validateCodeSmells(cleanProject, { unexpectedOption: true }),
    unsupportedDetector: await api.validateCodeSmells(cleanProject, { detectors: ["not-a-detector"] }),
    traversalInclude: await api.validateCodeSmells(cleanProject, { includePaths: ["../outside"] }),
    absoluteInclude: await api.validateCodeSmells(cleanProject, { includePaths: [repoRoot] }),
    badSuffix: await api.validateCodeSmells(cleanProject, { fileSuffixes: ["ts"] }),
    missingRoot: await api.validateCodeSmells(join(fixtureRoot, "projects", "missing-root")),
    oversizedFileCap: await api.validateCodeSmells(cleanProject, { includePaths: ["src/clean.ts"], maxFileBytes: 16 }),
    parseFailure: await api.validateCodeSmells(parseFailureProject, { includePaths: ["src"], maxFileBytes: 262144 }),
    unknownAllowlistOption: await api.validateCodeSmells(cleanProject, { allowlist: [] })
  };
  for (const [label, result] of Object.entries(malformedCases)) {
    assertFailClosed(result, label);
  }
  requireFinding(malformedCases.unknownOption, "input.unknown-option");
  requireFinding(malformedCases.unsupportedDetector, "input.invalid-option", (finding) => finding.message.includes("unsupported detector"));
  requireFinding(malformedCases.traversalInclude, "input.path-traversal");
  requireFinding(malformedCases.absoluteInclude, "input.absolute-path");
  requireFinding(malformedCases.badSuffix, "input.invalid-option", (finding) => finding.message.includes("fileSuffixes"));
  requireFinding(malformedCases.missingRoot, "input.source-root-unreadable");
  requireFinding(malformedCases.oversizedFileCap, "input.file-too-large");
  requireFinding(malformedCases.parseFailure, "parse.syntax-error");
  requireFinding(malformedCases.unknownAllowlistOption, "input.unknown-option");

  const stableBefore = await api.validateCodeSmells(stableBeforeProject, { includePaths: ["src/stable.ts"], detectors: ["deep-control-flow-nesting"], maxFileBytes: 262144 });
  const stableAfter = await api.validateCodeSmells(stableAfterProject, { includePaths: ["src/stable.ts"], detectors: ["deep-control-flow-nesting"], maxFileBytes: 262144 });
  assertP2Result(stableBefore);
  assertP2Result(stableAfter);
  const stableBeforeFinding = requireFinding(stableBefore, "deep-control-flow-nesting", (finding) => finding.identity.symbol.includes("stableNested"));
  const stableAfterFinding = requireFinding(stableAfter, "deep-control-flow-nesting", (finding) => finding.identity.symbol.includes("stableNested"));
  assert.deepEqual(stableBeforeFinding.identity, stableAfterFinding.identity, "stable identity remains line-independent");
  assert.notEqual(stableBeforeFinding.evidence.line, stableAfterFinding.evidence.line, "line evidence moved while identity stayed stable");

  writeScratchSource();
  const scratchP2 = await api.validateCodeSmells(join(scratchRoot, "projects", "smelly"), { includePaths: ["src"], maxFileBytes: 262144 });
  assertP2Result(scratchP2);
  const selectedFinding = requireFinding(scratchP2, "deep-control-flow-nesting", (finding) => finding.mode === "hard");
  const ratchetEntry = prefixP2FindingForRatchet(selectedFinding, "projects/smelly");
  const baselineDebt = [{ identity: ratchetEntry.identity, message: ratchetEntry.message, firstSeen: "2026-06-26", evidence: { sourcePath: ratchetEntry.evidence.sourcePath } }];
  const unchangedOptions = writeRatchetCase("unchanged", ratchetEntry, baselineDebt);
  const newDebtOptions = writeRatchetCase("new-debt", ratchetEntry, []);
  const malformedCarrierOptions = writeRatchetCase("malformed-carrier", ratchetEntry, [], { malformedCarrier: true });
  const malformedEvidenceOptions = writeRatchetCase("malformed-evidence", ratchetEntry, [], { malformedEvidence: true });
  const unchangedRatchet = await validateQualityRatchet(scratchRoot, unchangedOptions);
  const newDebtRatchet = await validateQualityRatchet(scratchRoot, newDebtOptions);
  const malformedCarrierRatchet = await validateQualityRatchet(scratchRoot, malformedCarrierOptions);
  const malformedEvidenceRatchet = await validateQualityRatchet(scratchRoot, malformedEvidenceOptions);
  assert.equal(unchangedRatchet.family, "p1.quality-ratchet", "ratchet family unchanged");
  assert.equal(unchangedRatchet.ok, true, `unchanged P2 carrier should pass baseline: ${JSON.stringify(unchangedRatchet.findings, null, 2)}`);
  assert.equal(newDebtRatchet.ok, false, "new P2 carrier debt fails ratchet");
  assert.ok(newDebtRatchet.findings.some((finding) => finding.ruleId === "debt.new-finding"), "new debt finding emitted");
  assert.equal(malformedCarrierRatchet.ok, false, "malformed P2 carrier fails ratchet");
  assert.ok(malformedCarrierRatchet.findings.some((finding) => finding.blocking), "malformed carrier blocks");
  assert.equal(malformedEvidenceRatchet.ok, false, "malformed P2 evidence fails ratchet");
  assert.ok(malformedEvidenceRatchet.findings.some((finding) => finding.blocking), "malformed evidence blocks");

  writeJson("policy-results.json", { emptyInclude, emptySuffixes, defaultSmelly, defaultClean, explicitInclude, explicitSuffix });
  writeJson("malformed-results.json", malformedCases);
  writeJson("smelly-result.json", detectorResult);
  writeJson("clean-result.json", defaultClean);
  writeJson("stable-identity.json", { before: stableBeforeFinding.identity, after: stableAfterFinding.identity, beforeLine: stableBeforeFinding.evidence.line, afterLine: stableAfterFinding.evidence.line });
  writeJson("ratchet-seam.json", { unchangedRatchet, newDebtRatchet, malformedCarrierRatchet, malformedEvidenceRatchet, scratchRoot, realBoundary: "actual compiled P2 validateCodeSmells output converted to quality-ratchet.findings/1 carrier and consumed by actual packages/mechanical-gates/src/p1/quality-ratchet/index.js#validateQualityRatchet" });

  const summary = {
    ok: true,
    compiledApi: relative(repoRoot, join(compiledRoot, "index.js")),
    constants: {
      family: api.CODE_SMELL_FAMILY,
      tool: api.CODE_SMELL_TOOL,
      resultSchema: api.CODE_SMELL_RESULT_SCHEMA_VERSION,
      findingSchema: api.CODE_SMELL_FINDING_SCHEMA_VERSION,
      ratchetCarrier: api.CODE_SMELL_RATCHET_CARRIER_VERSION,
      detectors: [...api.CODE_SMELL_DETECTOR_IDS]
    },
    f1: { ok: emptyInclude.ok, failClosed: emptyInclude.evidence.failClosed, blockingFindings: emptyInclude.findings.filter((finding) => finding.blocking).length, ruleIds: emptyInclude.findings.map((finding) => finding.ruleId) },
    f2: { ok: emptySuffixes.ok, failClosed: emptySuffixes.evidence.failClosed, blockingFindings: emptySuffixes.findings.filter((finding) => finding.blocking).length, ruleIds: emptySuffixes.findings.map((finding) => finding.ruleId) },
    defaults: { smellyOk: defaultSmelly.ok, smellyParsedFiles: defaultSmelly.evidence.parsedFiles, smellyInspectedFiles: defaultSmelly.evidence.inspectedFiles, cleanOk: defaultClean.ok, cleanParsedFiles: defaultClean.evidence.parsedFiles, cleanInspectedFiles: defaultClean.evidence.inspectedFiles },
    explicitPolicies: { includeOk: explicitInclude.ok, includeParsedFiles: explicitInclude.evidence.parsedFiles, suffixOk: explicitSuffix.ok, suffixParsedFiles: explicitSuffix.evidence.parsedFiles },
    detectorFindings: detectorResult.findings.map((finding) => ({ ruleId: finding.ruleId, mode: finding.mode, blocking: finding.blocking, severity: finding.severity, path: finding.path })),
    malformedCases: Object.fromEntries(Object.entries(malformedCases).map(([label, result]) => [label, { ok: result.ok, failClosed: result.evidence.failClosed, blockingFindings: result.findings.filter((finding) => finding.blocking).length, ruleIds: result.findings.map((finding) => finding.ruleId) }])),
    stableIdentity: { before: stableBeforeFinding.identity, after: stableAfterFinding.identity, beforeLine: stableBeforeFinding.evidence.line, afterLine: stableAfterFinding.evidence.line },
    ratchet: { unchangedOk: unchangedRatchet.ok, newDebtOk: newDebtRatchet.ok, malformedCarrierOk: malformedCarrierRatchet.ok, malformedEvidenceOk: malformedEvidenceRatchet.ok },
    realBoundary: "compiled actual P2 source API + actual P1 validateQualityRatchet consumer; no detector or ratchet mock"
  };
  writeJson("summary.json", summary);
  console.log(JSON.stringify(summary));
}

await main();
