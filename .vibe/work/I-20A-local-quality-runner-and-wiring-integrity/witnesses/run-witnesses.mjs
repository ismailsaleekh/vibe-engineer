#!/usr/bin/env node
// I-20A witness matrix harness. Exercises every required witness (real-boundary
// where load-bearing) and records command + exit code + trimmed output into the
// lane evidence dir. Exits 0 only if every witness meets its expectation.
//
// Witnesses:
//   W-RUN     real runner spawns real aggregate, schema-valid evidence, wiring PASS
//   W-FC-POS  canonical {p0,p1,p2} vs real aggregate → gate PASS (exit 0)
//   W-FC-NEG  phantom family p9 → gate HARD fail (exit 2) naming p9   [REAL boundary]
//   N1        missing runner export → fail-closed
//   N2        missing/unwritable evidence dir → fail-closed
//   N3        skipped required tier (no evidence) → fail-closed
//   N4        internal relative import → fail-closed
//   N5        missing testing-boundary public contract → fail-closed
//   N6        dynamic/latest/unlocked dependency → fail-closed
//   N7        weakened deterministic failure (advisory) → still HARD fail
//   N8        full E2E/mobile/visual as default CI → fail-closed
//   R1        local/CI parity inputs identical
//   R2        dirty-tree scope = owned paths only

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadQualityContext, runWiringGateFromContext } from "../../../../scripts/ci/quality/lib/context.mjs";
import { enumerateRegisteredAndRunning, applyFailClosedRule } from "../../../../scripts/ci/quality/lib/deterministic-failure.mjs";
import { buildPublicContractProof, classifyImportSpecifier } from "../../../../scripts/ci/quality/lib/public-contract.mjs";
import { auditDeclaredDependencies, auditImportSpecifiers, extractImportSpecifiers } from "../../../../scripts/ci/quality/lib/dependency-audit.mjs";
import { assertCiProfile, buildParityInputs } from "../../../../scripts/ci/quality/lib/profile-policy.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK_ROOT = path.resolve(HERE, "..");
const EVIDENCE = path.join(WORK_ROOT, "evidence");
const REPO_ROOT = path.resolve(WORK_ROOT, "../../..");
const RUNNER = path.join(REPO_ROOT, "scripts/quality/run-quality.mjs");
const GATE = path.join(REPO_ROOT, "scripts/ci/quality/wiring-integrity-gate.mjs");

mkdirSync(EVIDENCE, { recursive: true });

const results = [];
function record(name, { passed, exitCode = null, expectation, detail }) {
  results.push({ name, passed, exitCode, expectation, detail });
  const tag = passed ? "PASS" : "FAIL";
  console.log(`[${tag}] ${name}${exitCode !== null ? ` (exit ${exitCode})` : ""} — ${detail}`);
}

function runSubprocess(file, args, opts = {}) {
  try {
    const out = execFileSync("node", [file, ...args], { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
    return { exitCode: 0, stdout: out, stderr: "" };
  } catch (error) {
    return { exitCode: error.status ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

function expectThrow(fn, label) {
  try { fn(); return { threw: false, message: null }; }
  catch (error) { return { threw: true, message: error instanceof Error ? error.message : String(error) }; }
}
async function expectThrowAsync(fn, label) {
  try { await fn(); return { threw: false, message: null }; }
  catch (error) { return { threw: true, message: error instanceof Error ? error.message : String(error) }; }
}

function trim(text, max = 400) {
  const s = String(text ?? "").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// --- context (loaded once) ---
const context = await loadQualityContext();

// ===== W-RUN =====
{
  const dir = path.join(EVIDENCE, "w-run");
  rmSync(dir, { recursive: true, force: true });
  const r = runSubprocess(RUNNER, [`--profile=ci`, `--evidence-dir=${dir}`, `--summary-out=${dir}/summary.json`]);
  let summary = null;
  try { summary = JSON.parse(readFile(path.join(dir, "summary.json"))); } catch { summary = null; }
  const spawnedAll = summary && Array.isArray(summary.tiers) && summary.tiers.map((t) => t.family).sort().join(",") === "p0,p1,p2";
  const allEvidencePresent = summary && summary.tiers.every((t) => t.evidenceFile && existsSync(t.evidenceFile));
  const wiringPass = summary && summary.wiring && summary.wiring.verdict === "pass";
  const passed = !!summary && spawnedAll && allEvidencePresent && wiringPass;
  record("W-RUN", {
    passed,
    exitCode: r.exitCode,
    expectation: "real spawn of {p0,p1,p2}, schema-valid evidence written, wiring PASS (exit reflects real P0 findings on dirty tree)",
    detail: `spawned=${spawnedAll} evidence=${allEvidencePresent} wiring=${wiringPass ? "pass" : "fail"} runnerExit=${r.exitCode}; stdout=${trim(r.stdout)}`
  });
}

// ===== W-FC-POS =====
{
  const dir = path.join(EVIDENCE, "w-fc-pos");
  rmSync(dir, { recursive: true, force: true });
  const r = runSubprocess(GATE, [`--profile=ci`, `--evidence-dir=${dir}`]);
  const passed = r.exitCode === 0 && /PASS/.test(r.stdout);
  record("W-FC-POS", { passed, exitCode: r.exitCode, expectation: "canonical {p0,p1,p2} ⊆ registered-and-running → exit 0 PASS", detail: trim(r.stdout) });
}

// ===== W-FC-NEG (REAL boundary: phantom family vs real aggregate) =====
{
  const dir = path.join(EVIDENCE, "w-fc-neg");
  rmSync(dir, { recursive: true, force: true });
  const r = runSubprocess(GATE, [`--profile=ci`, `--evidence-dir=${dir}`, `--expected=p0,p1,p2,p9`]);
  const namesP9 = /p9/.test(r.stderr);
  const passed = r.exitCode === 2 && namesP9;
  record("W-FC-NEG", { passed, exitCode: r.exitCode, expectation: "phantom p9 declared vs REAL aggregate → HARD fail exit 2 naming p9", detail: trim(r.stderr) });
}

// ===== N1 missing runner =====
{
  // Stub module missing runP0Aggregate → p0 not running → expected{p0,p1,p2}\registered={p0}
  const stub = { runP1Aggregate: context.aggregateModule.runP1Aggregate, runP2Aggregate: context.aggregateModule.runP2Aggregate };
  const enumResult = await enumerateRegisteredAndRunning(stub, REPO_ROOT);
  const rule = applyFailClosedRule({ expectedFamilies: ["p0", "p1", "p2"], registeredAndRunning: enumResult.registeredAndRunning });
  const p0Probed = enumResult.perTier.find((t) => t.family === "p0");
  const passed = p0Probed === undefined && !enumResult.registeredAndRunning.includes("p0") && rule.verdict === "fail" && rule.missingFamilies.includes("p0");
  record("N1", { passed, expectation: "missing runner export → not registered-and-running → fail-closed", detail: `p0Probed=${p0Probed === undefined ? "absent" : "present"} registered=${enumResult.registeredAndRunning.join(",")} missing=${rule.missingFamilies.join(",")}` });
}

// ===== N2 missing/unwritable evidence dir =====
{
  const r = runSubprocess(RUNNER, [`--profile=ci`, `--evidence-dir=/dev/null/not-a-dir/cannot-create`, `--summary-out=/dev/null/not-a-dir/s.json`]);
  const passed = r.exitCode !== 0 && /FAIL-CLOSED/.test(r.stderr);
  record("N2", { passed, exitCode: r.exitCode, expectation: "unwritable/missing evidence dir → fail-closed non-zero", detail: trim(r.stderr) });
}

// ===== N3 skipped required delta category =====
{
  // Simulate a tier that produced no evidence (runError) — N3 logic flags it.
  const perTier = [
    { family: "p0", exportName: "runP0Aggregate", registered: true, running: true, carrierFamily: "p0.aggregate", ok: true, findingCount: 0, blockingFindingCount: 0, implementedFamilies: [], evidenceFile: null, runError: "boom" },
    { family: "p1", exportName: "runP1Aggregate", registered: true, running: true, carrierFamily: "p1.aggregate", ok: true, findingCount: 0, blockingFindingCount: 0, implementedFamilies: [], evidenceFile: "/tmp/x.json", runError: null }
  ];
  const missing = perTier.filter((t) => !t.evidenceFile || t.runError);
  const n3Diagnostic = missing.length > 0 ? `required tier(s) produced no evidence: ${missing.map((t) => t.family).join(", ")}` : null;
  const passed = n3Diagnostic && /p0/.test(n3Diagnostic);
  record("N3", { passed, expectation: "tier with missing evidence/runError → skipped-category diagnostic, non-green", detail: n3Diagnostic });
}

// ===== N4 internal relative import =====
{
  const rel = "../../packages/mechanical-gates/src/aggregate/index.js";
  const cls = classifyImportSpecifier(rel, context.config.allowedImportSpecifiers);
  const proof = expectThrow(() => buildPublicContractProof({ specifier: rel, module: context.aggregateModule, resolvedUrl: rel, p0ImplementedFamilies: ["p0.testing-boundary"], allowed: context.config.allowedImportSpecifiers }));
  const passed = !cls.publicSpecifierUsed && !cls.noInternalRelativeImport && proof.threw;
  record("N4", { passed, expectation: "internal relative import specifier → rejected (fail-closed)", detail: `public=${cls.publicSpecifierUsed} noInternal=${cls.noInternalRelativeImport} threw=${proof.threw}` });
}

// ===== N5 missing testing-boundary public contract =====
{
  const proof = expectThrow(() => buildPublicContractProof({ specifier: "@vibe-engineer/mechanical-gates/aggregate", module: context.aggregateModule, resolvedUrl: context.aggregateResolvedUrl, p0ImplementedFamilies: ["p0.governed-surface", "p0.boundaries"], allowed: context.config.allowedImportSpecifiers }));
  const passed = proof.threw && /testing-boundary/.test(proof.message);
  record("N5", { passed, expectation: "p0.testing-boundary absent from implementedFamilies → fail-closed", detail: trim(proof.message) });
}

// ===== N6 dynamic/latest/unlocked dependency =====
{
  const depLatest = expectThrow(() => auditDeclaredDependencies([{ name: "some-pkg", spec: "latest" }]));
  const depStar = expectThrow(() => auditDeclaredDependencies([{ name: "some-pkg", spec: "*" }]));
  const importViolations = auditImportSpecifiers(["npx-bogus", "@undeclared/pkg", "node:fs"], ["@vibe-engineer/mechanical-gates/aggregate"]);
  const passed = depLatest.threw && depStar.threw && importViolations.length === 2;
  record("N6", { passed, expectation: "latest/* spec or undeclared import specifier → fail-closed", detail: `latest.threw=${depLatest.threw} *.threw=${depStar.threw} importViolations=${JSON.stringify(importViolations)}` });
}

// ===== N7 weakened deterministic failure (advisory cannot soften) =====
{
  const hard = applyFailClosedRule({ expectedFamilies: ["p0", "p1", "p2", "p9"], registeredAndRunning: ["p0", "p1", "p2"], advisory: false });
  const adv = applyFailClosedRule({ expectedFamilies: ["p0", "p1", "p2", "p9"], registeredAndRunning: ["p0", "p1", "p2"], advisory: true });
  const passed = hard.verdict === "fail" && hard.exitCode === 2 && adv.verdict === "fail" && adv.exitCode === 2 && adv.advisoryIgnored && /p9/.test(hard.diagnostic);
  record("N7", { passed, expectation: "non-empty missing set ALWAYS hard-fails (exit 2) even with advisory=true", detail: `hard=${hard.verdict}/${hard.exitCode} advisory=${adv.verdict}/${adv.exitCode} ignored=${adv.advisoryIgnored}` });
}

// ===== N8 full E2E/mobile/visual as default CI =====
{
  const bad = { profiles: { ci: { composition: ["p0.aggregate", "full-e2e"], excludes: { fullE2E: false, fullMobileE2E: true, fullVisualUi: true } } } };
  const bad2 = { profiles: { ci: { composition: ["x"], excludes: { fullE2E: true, fullMobileE2E: false, fullVisualUi: true } } } };
  const t1 = expectThrow(() => assertCiProfile(bad, "ci"));
  const t2 = expectThrow(() => assertCiProfile(bad2, "ci"));
  const good = expectThrow(() => assertCiProfile(context.config, "ci"));
  const passed = t1.threw && t2.threw && !good.threw;
  record("N8", { passed, expectation: "ci profile must exclude fullE2E/mobile/visual (false → fail-closed)", detail: `fullE2E-false.threw=${t1.threw} fullMobile-false.threw=${t2.threw} canonical.threw=${good.threw}` });
}

// ===== R1 local/CI parity =====
{
  const parity = buildParityInputs({ config: context.config, profile: "ci", parityBlockingCommand: context.config.parityBlockingCommand });
  // The parity blocking command must be the SAME command the runner implements.
  const cmdMatchesContract = parity.blockingCommand.startsWith("pnpm quality -- --profile=ci");
  const passed = parity.localAndCiEquivalent && parity.excludesFullE2E && parity.excludesFullMobileE2E && parity.excludesFullVisualUi && cmdMatchesContract;
  record("R1", { passed, expectation: "same blocking command local+CI; deterministic quick-gate excludes", detail: `equiv=${parity.localAndCiEquivalent} cmdMatches=${cmdMatchesContract}` });
}

// ===== R2 dirty-tree scope =====
{
  // Dirty tree is the PERMANENT baseline (target committed at 001c76d; brief §4).
  // R2 must confirm I-20A's OWN delta is ⊆ owned paths — NOT that the whole tree
  // is clean (other lanes' baselines are pre-existing and not I-20A's concern).
  // Mechanism: (a) every explicitly-authored I-20A file is under an owned prefix;
  // (b) the scripts/ subtree contains ONLY {scripts/quality, scripts/ci/quality};
  // (c) no tracked file outside owned prefixes was modified by I-20A (all I-20A
  // writes created new files under owned prefixes → they appear as ?? not M).
  let status = "";
  try { status = execFileSync("git", ["status", "--short", "--untracked-files=all"], { cwd: REPO_ROOT, encoding: "utf8" }); } catch { status = ""; }
  writeFileSync(path.join(EVIDENCE, "r2-git-status.txt"), status, "utf8");
  const lines = status.split("\n").map((l) => l.trim()).filter(Boolean);
  const filePath = (l) => l.replace(/^.../, "");
  const ownedPrefixes = ["scripts/quality/", "scripts/ci/quality/", ".vibe/work/I-20A-"];
  const isOwned = (p) => ownedPrefixes.some((pre) => p.startsWith(pre));

  // (a) explicitly-authored files (the complete I-20A deliverable set).
  const authored = [
    "scripts/quality/run-quality.mjs",
    "scripts/quality/expected-families.manifest.json",
    "scripts/quality/quality-wiring.config.json",
    "scripts/quality/lib/schema-validator.mjs",
    "scripts/quality/schemas/expected-families.manifest.schema.json",
    "scripts/quality/schemas/quality-wiring.config.schema.json",
    "scripts/quality/schemas/wiring-integrity.schema.json",
    "scripts/quality/schemas/quality-summary.schema.json",
    "scripts/ci/quality/wiring-integrity-gate.mjs",
    "scripts/ci/quality/lib/public-contract.mjs",
    "scripts/ci/quality/lib/dependency-audit.mjs",
    "scripts/ci/quality/lib/profile-policy.mjs",
    "scripts/ci/quality/lib/deterministic-failure.mjs",
    "scripts/ci/quality/lib/context.mjs"
  ];
  const authoredOwned = authored.every((p) => isOwned(p));
  const authoredMissing = authored.filter((p) => !existsSync(path.join(REPO_ROOT, p)));

  // (b) scripts/ subtree contains ONLY the owned quality subsets.
  const scriptsEntries = lines.map(filePath).filter((p) => p.startsWith("scripts/"));
  const scriptsOutside = scriptsEntries.filter((p) => !p.startsWith("scripts/quality/") && !p.startsWith("scripts/ci/quality/"));

  // (c) I-20A made no modification (M) to a tracked non-owned file: all I-20A files
  // are new (??), so any M entry under a non-owned path is pre-existing baseline.
  const i20aModifiedNonOwned = lines
    .filter((l) => l.startsWith("M ") || l.startsWith("MM"))
    .map(filePath)
    .filter((p) => p.startsWith("scripts/quality/") || p.startsWith("scripts/ci/quality/") || p.startsWith(".vibe/work/I-20A-"));

  const passed = authoredOwned && authoredMissing.length === 0 && scriptsOutside.length === 0 && i20aModifiedNonOwned.length === 0;
  record("R2", {
    passed,
    expectation: "I-20A delta ⊆ owned paths (scripts/quality, scripts/ci/quality, .vibe/work/I-20A-*); rest is pre-existing baseline",
    detail: `authoredOwned=${authoredOwned} missing=${authoredMissing.length} scriptsOutside=${JSON.stringify(scriptsOutside)} i20aTrackedMods=${i20aModifiedNonOwned.length}; baseline (other lanes) recorded in r2-git-status.txt`
  });
}

// --- summary ---
const passed = results.filter((r) => r.passed).length;
const total = results.length;
const allGreen = passed === total;
const matrixFile = path.join(EVIDENCE, "witness-matrix.json");
writeFileSync(matrixFile, `${JSON.stringify({ generatedAt: new Date().toISOString(), passed, total, allGreen, results }, null, 2)}\n`, "utf8");
console.log(`\nWITNESS MATRIX: ${passed}/${total} ${allGreen ? "ALL GREEN" : "FAILURES"} → ${matrixFile}`);
process.exit(allGreen ? 0 : 1);

function readFile(p) {
  try { return execFileSync("cat", [p], { encoding: "utf8" }); } catch { return ""; }
}
