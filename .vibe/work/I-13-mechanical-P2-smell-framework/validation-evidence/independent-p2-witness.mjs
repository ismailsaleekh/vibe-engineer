import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { validateQualityRatchet } from "../../../../packages/mechanical-gates/src/p1/quality-ratchet/index.js";

const scriptPath = fileURLToPath(import.meta.url);
const evidenceRoot = dirname(scriptPath);
const repoRoot = resolve(evidenceRoot, "..", "..", "..", "..");
const fixtureRoot = join(repoRoot, "packages", "mechanical-gates", "fixtures", "p2", "code-smell");
const compileRoot = join(evidenceRoot, "compiled-p2-independent");
const outputRoot = join(evidenceRoot, "independent-output");
const scratchRoot = join(evidenceRoot, "scratch-projects");
const ratchetProjectRoot = join(evidenceRoot, "ratchet-project");
const defects = [];
const notes = [];

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

function recordDefect(id, message, evidence = {}) {
  defects.push({ id, message, evidence });
}

function runCommand(label, command, args, options = {}) {
  const completed = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", ...options });
  const evidence = {
    label,
    command,
    args,
    cwd: options.cwd ?? repoRoot,
    status: completed.status,
    signal: completed.signal,
    stdout: completed.stdout,
    stderr: completed.stderr,
    error: completed.error instanceof Error ? completed.error.message : undefined
  };
  writeJson(join(outputRoot, `${label.replace(/[^a-z0-9_.-]+/gi, "-").toLowerCase()}.json`), evidence);
  return evidence;
}

async function compileAndImportP2() {
  rmSync(compileRoot, { recursive: true, force: true });
  ensureDirectory(compileRoot);
  const compile = runCommand("independent p2 compile", "pnpm", [
    "exec",
    "tsc",
    "--outDir",
    relative(repoRoot, compileRoot),
    "--rootDir",
    "packages/mechanical-gates/src/p2/code-smell",
    "--target",
    "ES2022",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--strict",
    "--skipLibCheck",
    "false",
    "--lib",
    "ES2022",
    "packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts",
    "packages/mechanical-gates/src/p2/code-smell/index.ts"
  ]);
  if (compile.status !== 0 || !existsSync(join(compileRoot, "index.js"))) {
    recordDefect("compile.failed", "Independent P2 compile failed or did not emit index.js under validation evidence.", compile);
    return undefined;
  }
  return import(`${pathToFileURL(join(compileRoot, "index.js")).href}?independent=${Date.now()}`);
}

function writeScratchProjects() {
  rmSync(scratchRoot, { recursive: true, force: true });
  ensureDirectory(join(scratchRoot, "detectors", "src"));
  ensureDirectory(join(scratchRoot, "clean", "src"));
  ensureDirectory(join(scratchRoot, "parse", "src"));
  writeFileSync(join(scratchRoot, "detectors", "src", "detectors.ts"), `
export function hardNested(input: number): number {
  if (input > 0) {
    for (let index = 0; index < input; index += 1) {
      while (index < input * 2) {
        try {
          if (index % 2 === 0) {
            return index;
          }
        } catch (error) {
          throw error;
        }
      }
    }
  }
  return 0;
}

export function advisoryDecisionPoints(value: number): number {
  let score = 0;
  if (value > 0) score += 1;
  if (value > 1) score += 1;
  if (value > 2) score += 1;
  if (value > 3) score += 1;
  if (value > 4) score += 1;
  if (value > 5) score += 1;
  if (value > 6) score += 1;
  return score;
}

export function ratchetedDecisionPoints(value: number): number {
  let score = 0;
  if (value > 0) score += 1;
  if (value > 1) score += 1;
  if (value > 2) score += 1;
  if (value > 3) score += 1;
  if (value > 4) score += 1;
  if (value > 5) score += 1;
  if (value > 6) score += 1;
  if (value > 7) score += 1;
  return score;
}

export function hardDecisionPoints(value: number, flags: readonly boolean[]): number {
  let score = 0;
  if (value > 0) score += 1;
  if (value > 1) score += 1;
  if (value > 2) score += 1;
  if (value > 3) score += 1;
  if (value > 4) score += 1;
  if (value > 5) score += 1;
  if (value > 6) score += 1;
  if (value > 7) score += 1;
  if (flags[0]) score += 1;
  if (flags[1]) score += 1;
  if (flags[2]) score += 1;
  if (flags[3]) score += 1;
  return score;
}

export function logAndContinue(read: () => string): string {
  let value = "";
  try {
    value = read();
  } catch (error) {
    console.error(error);
  }
  return value;
}

export function noOpSwitch(type: string): { ok: boolean } {
  switch (type) {
    case "known":
      return { ok: true };
    default:
      return { ok: true };
  }
}

export function noOpIfElse(action: string): readonly string[] {
  if (action === "known") {
    return ["handled"];
  } else {
    return [];
  }
}

export function jsonConcat(value: string): string {
  return '{"value":"' + value + '"}';
}

export function jsonTemplate(value: string): string {
  return \`{"value":"\${value}"}\`;
}
`);
  writeFileSync(join(scratchRoot, "clean", "src", "clean.ts"), `
export interface Result { readonly ok: boolean; readonly value?: string; readonly error?: string; }

export function typedRecovery(read: () => string): Result {
  try {
    return { ok: true, value: read() };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "read-failed" };
  }
}

export function strictSwitch(type: string): Result {
  switch (type) {
    case "known":
      return { ok: true, value: "handled" };
    default:
      return { ok: false, error: "unknown" };
  }
}

export function structuredJson(value: string): string {
  return JSON.stringify({ value });
}
`);
  writeFileSync(join(scratchRoot, "parse", "src", "broken.ts"), "export function broken(value: string): string {\n  if (value.length > 0) {\n    return value;\n\n}\n");
}

function schemaDefects(result, label) {
  const requiredFindingKeys = ["family", "ruleId", "detectorId", "severity", "blocking", "path", "message", "evidence", "identity", "confidence", "mode", "threshold"];
  if (!result || typeof result !== "object") return [`${label}: result is not object`];
  const problems = [];
  if (result.family !== "p2.code-smell") problems.push(`${label}: wrong family ${String(result.family)}`);
  if (typeof result.ok !== "boolean") problems.push(`${label}: ok is not boolean`);
  if (!Array.isArray(result.findings)) problems.push(`${label}: findings is not array`);
  if (!result.evidence || result.evidence.tool !== "p2.code-smell") problems.push(`${label}: missing result evidence tool`);
  for (const [index, finding] of (Array.isArray(result.findings) ? result.findings : []).entries()) {
    for (const key of requiredFindingKeys) {
      if (!Object.hasOwn(finding, key)) problems.push(`${label}: finding ${index} missing ${key}`);
    }
    if (finding.family !== "p2.code-smell") problems.push(`${label}: finding ${index} wrong family`);
    if (!finding.identity || finding.identity.tool !== "p2.code-smell") problems.push(`${label}: finding ${index} identity tool`);
    if (finding.identity && finding.identity.ruleId !== finding.ruleId) problems.push(`${label}: finding ${index} identity rule mismatch`);
    if (finding.identity && finding.identity.path !== finding.path) problems.push(`${label}: finding ${index} identity path mismatch`);
    if (!finding.identity?.symbol && !finding.identity?.structuralSignature) problems.push(`${label}: finding ${index} lacks symbol/structural signature`);
    if (!/^[a-f0-9]{64}$/u.test(finding.identity?.contentHash ?? "")) problems.push(`${label}: finding ${index} invalid content hash`);
    if (finding.identity && Object.hasOwn(finding.identity, "line")) problems.push(`${label}: finding ${index} identity contains line instead of line-only evidence`);
    if (finding.evidence?.line === undefined || typeof finding.evidence.line !== "number") problems.push(`${label}: finding ${index} lacks numeric evidence line`);
    if (finding.evidence?.calibration?.mode !== finding.mode) problems.push(`${label}: finding ${index} calibration mode mismatch`);
    if (!finding.threshold || typeof finding.threshold.observed !== "number") problems.push(`${label}: finding ${index} missing threshold observed`);
  }
  return problems;
}

function requireRule(result, ruleId, predicate = () => true) {
  return result.findings.find((finding) => finding.ruleId === ruleId && predicate(finding));
}

function expectRule(result, label, ruleId, predicate = () => true) {
  const finding = requireRule(result, ruleId, predicate);
  if (!finding) {
    recordDefect("missing.rule", `${label} missing expected ${ruleId}.`, {
      expected: ruleId,
      actual: result.findings.map((entry) => `${entry.ruleId}:${entry.mode}:${entry.blocking}`).sort()
    });
  }
  return finding;
}

function expectFailClosed(label, result, expectedRuleId) {
  if (!result || result.ok !== false || !Array.isArray(result.findings) || !result.findings.some((finding) => finding.blocking)) {
    recordDefect("fail-open.malformed", `${label} did not fail closed with a blocking finding.`, result);
    return;
  }
  if (expectedRuleId && !result.findings.some((finding) => finding.ruleId === expectedRuleId)) {
    recordDefect("missing.malformed-rule", `${label} failed but missed expected rule ${expectedRuleId}.`, {
      expectedRuleId,
      actualRuleIds: result.findings.map((finding) => finding.ruleId)
    });
  }
}

function expectNoFindings(label, result) {
  if (!result.ok || result.findings.length !== 0) {
    recordDefect("clean.false-positive", `${label} should be clean with zero findings.`, result);
  }
}

function ratchetEntryFromP2Finding(finding, sourcePrefix) {
  const prefixedPath = `${sourcePrefix}/${finding.path}`;
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

function writeRatchetVariant(variant, entry, includeBaselineDebt) {
  const variantRoot = join(ratchetProjectRoot, "ratchet-fixture", variant);
  ensureDirectory(variantRoot);
  const sourcePath = entry.evidence.sourcePath;
  const sourceText = normalizeLineEndings(readFileSync(join(ratchetProjectRoot, sourcePath), "utf8"));
  const surfaceEntries = [{ path: sourcePath, sha256: sha256(sourceText) }];
  const surfaceFingerprint = sha256(JSON.stringify(surfaceEntries));
  const baseline = {
    schemaVersion: "quality-ratchet.baseline/1",
    family: "p1.quality-ratchet",
    surfaceFingerprint,
    debt: includeBaselineDebt ? [{ identity: entry.identity, message: entry.message, firstSeen: "2026-06-26", evidence: { sourcePath } }] : []
  };
  const carrier = {
    schemaVersion: "quality-ratchet.findings/1",
    family: "p1.quality-ratchet",
    surfaceFingerprint,
    sourceFingerprintPath: `ratchet-fixture/${variant}/surface.json`,
    runnerEvidencePath: `ratchet-fixture/${variant}/runner-evidence.json`,
    findings: [entry]
  };
  const approvals = { schemaVersion: "quality-ratchet.approvals/1", family: "p1.quality-ratchet", approvals: [] };
  const surface = { schemaVersion: "quality-ratchet.surface-fingerprint/1", family: "p1.quality-ratchet", fingerprint: surfaceFingerprint, entries: surfaceEntries };
  const runner = {
    schemaVersion: "quality-ratchet.runner-evidence/1",
    family: "p1.quality-ratchet",
    runnerId: "independent-p2-code-smell-witness",
    status: "completed",
    command: "node .vibe/work/I-13-mechanical-P2-smell-framework/validation-evidence/independent-p2-witness.mjs",
    findingCarrierPath: `ratchet-fixture/${variant}/findings.json`,
    surfaceFingerprintPath: `ratchet-fixture/${variant}/surface.json`,
    sourceFiles: [sourcePath]
  };
  writeJson(join(variantRoot, "baseline.json"), baseline);
  writeJson(join(variantRoot, "findings.json"), carrier);
  writeJson(join(variantRoot, "approvals.json"), approvals);
  writeJson(join(variantRoot, "surface.json"), surface);
  writeJson(join(variantRoot, "runner-evidence.json"), runner);
}

async function runRatchetSeam(smelly) {
  rmSync(ratchetProjectRoot, { recursive: true, force: true });
  const sourcePrefix = "projects/smelly";
  ensureDirectory(join(ratchetProjectRoot, sourcePrefix, "src"));
  const productSmellySource = readFileSync(join(fixtureRoot, "projects", "smelly", "src", "smells.ts"), "utf8");
  writeFileSync(join(ratchetProjectRoot, sourcePrefix, "src", "smells.ts"), productSmellySource);
  const selected = requireRule(smelly, "deep-control-flow-nesting", (finding) => finding.mode === "hard" && finding.blocking === true);
  if (!selected) {
    recordDefect("ratchet.no-p2-finding", "Cannot construct P2 ratchet carrier because hard deep-control-flow finding is missing.", smelly);
    return undefined;
  }
  const entry = ratchetEntryFromP2Finding(selected, sourcePrefix);
  writeRatchetVariant("unchanged", entry, true);
  writeRatchetVariant("new-debt", entry, false);
  const malformedRoot = join(ratchetProjectRoot, "ratchet-fixture", "malformed");
  ensureDirectory(malformedRoot);
  writeJson(join(malformedRoot, "baseline.json"), { schemaVersion: "quality-ratchet.baseline/1", family: "p1.quality-ratchet", surfaceFingerprint: "0".repeat(64), debt: [] });
  writeJson(join(malformedRoot, "findings.json"), { schemaVersion: "quality-ratchet.findings/1", family: "p1.quality-ratchet", findings: [] });
  writeJson(join(malformedRoot, "approvals.json"), { schemaVersion: "quality-ratchet.approvals/1", family: "p1.quality-ratchet", approvals: [] });

  const optionsFor = (variant) => ({
    baselinePath: `ratchet-fixture/${variant}/baseline.json`,
    findingCarrierPath: `ratchet-fixture/${variant}/findings.json`,
    approvalPath: `ratchet-fixture/${variant}/approvals.json`,
    surfaceFingerprintPath: `ratchet-fixture/${variant}/surface.json`,
    runnerEvidencePath: `ratchet-fixture/${variant}/runner-evidence.json`,
    maxFileBytes: 262144
  });
  const unchanged = await validateQualityRatchet(ratchetProjectRoot, optionsFor("unchanged"));
  const newDebt = await validateQualityRatchet(ratchetProjectRoot, optionsFor("new-debt"));
  const malformed = await validateQualityRatchet(ratchetProjectRoot, optionsFor("malformed"));
  if (unchanged.ok !== true) recordDefect("ratchet.unchanged-failed", "P2 carrier unchanged baseline did not pass actual P1 ratchet.", unchanged);
  if (newDebt.ok !== false || !newDebt.findings.some((finding) => finding.ruleId === "debt.new-finding")) recordDefect("ratchet.new-debt-not-blocked", "P2 carrier new debt did not fail actual P1 ratchet with debt.new-finding.", newDebt);
  if (malformed.ok !== false || malformed.findings.length === 0) recordDefect("ratchet.malformed-not-blocked", "Malformed P2 ratchet carrier/evidence did not fail closed.", malformed);
  return { unchanged, newDebt, malformed, carrierEntry: entry };
}

async function main() {
  ensureDirectory(outputRoot);
  writeScratchProjects();
  const api = await compileAndImportP2();
  if (!api) return;
  if (api.CODE_SMELL_TOOL !== "p2.code-smell" || typeof api.validateCodeSmells !== "function") {
    recordDefect("api.shape", "Compiled P2 API did not expose expected tool constant/function.", { keys: Object.keys(api) });
    return;
  }

  const smelly = await api.validateCodeSmells(join(fixtureRoot, "projects", "smelly"), { includePaths: ["src"], maxFileBytes: 262144 });
  const clean = await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { includePaths: ["src"], maxFileBytes: 262144 });
  const scratchSmelly = await api.validateCodeSmells(join(scratchRoot, "detectors"), { includePaths: ["src"], maxFileBytes: 262144 });
  const scratchClean = await api.validateCodeSmells(join(scratchRoot, "clean"), { includePaths: ["src"], maxFileBytes: 262144 });
  writeJson(join(outputRoot, "smelly-result.json"), smelly);
  writeJson(join(outputRoot, "clean-result.json"), clean);
  writeJson(join(outputRoot, "scratch-smelly-result.json"), scratchSmelly);
  writeJson(join(outputRoot, "scratch-clean-result.json"), scratchClean);

  for (const problem of [...schemaDefects(smelly, "smelly"), ...schemaDefects(clean, "clean"), ...schemaDefects(scratchSmelly, "scratchSmelly"), ...schemaDefects(scratchClean, "scratchClean")]) {
    recordDefect("schema.invalid", problem);
  }

  expectRule(smelly, "fixture smelly deep hard", "deep-control-flow-nesting", (finding) => finding.mode === "hard" && finding.blocking === true);
  expectRule(smelly, "fixture smelly deep advisory", "deep-control-flow-nesting", (finding) => finding.mode === "advisory" && finding.blocking === false);
  expectRule(smelly, "fixture smelly combinatorial hard", "combinatorial-path-explosion", (finding) => finding.mode === "hard" && finding.blocking === true);
  expectRule(smelly, "fixture smelly combinatorial ratcheted", "combinatorial-path-explosion", (finding) => finding.mode === "ratcheted" && finding.blocking === false);
  expectRule(smelly, "fixture smelly catch", "catch-log-continue", (finding) => finding.mode === "hard" && finding.blocking === true);
  expectRule(smelly, "fixture smelly dispatcher", "silent-no-op-dispatcher", (finding) => finding.mode === "hard" && finding.blocking === true);
  expectRule(smelly, "fixture smelly json advisory", "serialized-json-assembled-as-strings", (finding) => finding.mode === "advisory" && finding.blocking === false);
  if (smelly.ok !== false) recordDefect("smelly.not-blocking", "Smelly fixture should block due hard findings.", smelly);
  expectNoFindings("product clean fixture", clean);

  expectRule(scratchSmelly, "scratch combinatorial advisory", "combinatorial-path-explosion", (finding) => finding.mode === "advisory" && finding.blocking === false && finding.threshold.observed === 7);
  expectRule(scratchSmelly, "scratch combinatorial ratcheted", "combinatorial-path-explosion", (finding) => finding.mode === "ratcheted" && finding.blocking === false && finding.threshold.observed === 8);
  expectRule(scratchSmelly, "scratch combinatorial hard", "combinatorial-path-explosion", (finding) => finding.mode === "hard" && finding.blocking === true && finding.threshold.observed >= 12);
  expectRule(scratchSmelly, "scratch no-op if/else", "silent-no-op-dispatcher", (finding) => finding.message.includes("fallback"));
  expectRule(scratchSmelly, "scratch json template/concat", "serialized-json-assembled-as-strings", (finding) => finding.mode === "advisory");
  expectNoFindings("scratch clean fixture", scratchClean);

  const malformed = {
    invalidOptions: await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { unexpected: true }),
    invalidPolicyObject: await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), null),
    traversal: await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { includePaths: ["../outside"] }),
    absolute: await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { includePaths: [repoRoot] }),
    missingRoot: await api.validateCodeSmells(join(fixtureRoot, "projects", "missing-root")),
    oversized: await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { includePaths: ["src/clean.ts"], maxFileBytes: 16 }),
    parseFailure: await api.validateCodeSmells(join(fixtureRoot, "projects", "parse-failure"), { includePaths: ["src"], maxFileBytes: 262144 }),
    unsupportedDetector: await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { detectors: ["not-a-detector"] }),
    allowlistUnknownOption: await api.validateCodeSmells(join(fixtureRoot, "projects", "smelly"), { includePaths: ["src"], allowlistPath: "allowlist.json" }),
    badFileSuffix: await api.validateCodeSmells(join(fixtureRoot, "projects", "clean"), { fileSuffixes: ["ts"] }),
    emptyIncludePaths: await api.validateCodeSmells(join(fixtureRoot, "projects", "smelly"), { includePaths: [] }),
    emptyFileSuffixes: await api.validateCodeSmells(join(fixtureRoot, "projects", "smelly"), { fileSuffixes: [] })
  };
  writeJson(join(outputRoot, "malformed-results.json"), malformed);
  expectFailClosed("invalid unknown options", malformed.invalidOptions, "input.unknown-option");
  expectFailClosed("invalid non-object options", malformed.invalidPolicyObject, "input.invalid-option");
  expectFailClosed("traversal include path", malformed.traversal, "input.path-traversal");
  expectFailClosed("absolute include path", malformed.absolute, "input.absolute-path");
  expectFailClosed("missing source root", malformed.missingRoot, "input.source-root-unreadable");
  expectFailClosed("oversized file cap", malformed.oversized, "input.file-too-large");
  expectFailClosed("TypeScript parse failure", malformed.parseFailure, "parse.syntax-error");
  expectFailClosed("unsupported detector id", malformed.unsupportedDetector, "input.invalid-option");
  expectFailClosed("unknown allowlist option proves no suppressor", malformed.allowlistUnknownOption, "input.unknown-option");
  expectFailClosed("malformed file suffix", malformed.badFileSuffix, "input.invalid-option");
  expectFailClosed("empty includePaths should not silently skip all files", malformed.emptyIncludePaths, "input.invalid-option");
  expectFailClosed("empty fileSuffixes should not silently skip all files", malformed.emptyFileSuffixes, "input.invalid-option");

  const before = await api.validateCodeSmells(join(fixtureRoot, "projects", "stable-before"), { includePaths: ["src/stable.ts"], detectors: ["deep-control-flow-nesting"], maxFileBytes: 262144 });
  const after = await api.validateCodeSmells(join(fixtureRoot, "projects", "stable-after"), { includePaths: ["src/stable.ts"], detectors: ["deep-control-flow-nesting"], maxFileBytes: 262144 });
  const beforeFinding = requireRule(before, "deep-control-flow-nesting", (finding) => finding.identity.symbol.includes("stableNested"));
  const afterFinding = requireRule(after, "deep-control-flow-nesting", (finding) => finding.identity.symbol.includes("stableNested"));
  const stableIdentity = { before: beforeFinding?.identity, after: afterFinding?.identity, beforeLine: beforeFinding?.evidence.line, afterLine: afterFinding?.evidence.line };
  if (!beforeFinding || !afterFinding || JSON.stringify(beforeFinding.identity) !== JSON.stringify(afterFinding.identity) || beforeFinding.evidence.line === afterFinding.evidence.line) {
    recordDefect("identity.unstable-line-move", "Stable identity did not survive line movement or line evidence did not change.", stableIdentity);
  }
  writeJson(join(outputRoot, "stable-identity.json"), stableIdentity);

  const ratchet = await runRatchetSeam(smelly);
  writeJson(join(outputRoot, "ratchet-seam.json"), ratchet);

  const summary = {
    ok: defects.length === 0,
    defectCount: defects.length,
    defects,
    notes,
    sourceApi: {
      compiledApi: relative(repoRoot, join(compileRoot, "index.js")),
      family: api.CODE_SMELL_FAMILY,
      tool: api.CODE_SMELL_TOOL
    },
    findingCounts: {
      smelly: smelly.findings.length,
      clean: clean.findings.length,
      scratchSmelly: scratchSmelly.findings.length,
      scratchClean: scratchClean.findings.length
    },
    malformedOkFlags: Object.fromEntries(Object.entries(malformed).map(([key, value]) => [key, value.ok])),
    stableIdentity,
    ratchet: ratchet ? { unchangedOk: ratchet.unchanged.ok, newDebtOk: ratchet.newDebt.ok, malformedOk: ratchet.malformed.ok } : null,
    realBoundary: "compiled P2 API from lane source executed over product and validation scratch fixtures; converted P2 carrier consumed by actual packages/mechanical-gates/src/p1/quality-ratchet/index.js"
  };
  writeJson(join(outputRoot, "summary.json"), summary);
  console.log(JSON.stringify(summary));
}

await main();
if (defects.length > 0) {
  process.exitCode = 1;
}
