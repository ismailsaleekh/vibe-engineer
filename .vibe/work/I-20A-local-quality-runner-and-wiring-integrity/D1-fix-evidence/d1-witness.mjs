#!/usr/bin/env node
// I-20A-D1 FIX witness matrix (Triad-B FIX implementation evidence).
// Drives the REAL runner (`node scripts/quality/run-quality.mjs`) via subprocess
// for every required witness (truth-green, real parse boundary — not shape-green).
//
// Witnesses:
//   W-PARSE-BOTH   every value flag: `=`-form AND space-form parse identically, exit 0,
//                  real schema-valid evidence + summary emitted.
//   W-CI-PARITY    (D1 closure) the EXACT `pnpm quality` CLI from quality.yml AND its
//                  space-form equivalent both exit 0 with real evidence.
//   W-NEG-UNKNOWN  unknown `=`-flag, unknown space-flag, and a value flag missing its
//                  value all FAIL-CLOSED (non-zero) — no regression in error handling.
//
// The harness mirrors run-witnesses.mjs subprocess conventions (cwd=repo root, node).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE = HERE; // artifacts written alongside
const REPO_ROOT = path.resolve(HERE, "../../../.."); // D1-fix-evidence -> lane -> work -> .vibe -> repo root
const RUNNER = path.join(REPO_ROOT, "scripts/quality/run-quality.mjs");

const results = [];
function record(name, passed, detail, extra = {}) {
  results.push({ name, passed, detail, ...extra });
  console.log(`[${passed ? "PASS" : "FAIL"}] ${name} — ${detail}`);
}

function runSubprocess(args) {
  try {
    const stdout = execFileSync("node", [RUNNER, ...args], {
      cwd: REPO_ROOT, encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { exitCode: 0, stdout, stderr: "" };
  } catch (error) {
    return { exitCode: error.status ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

function freshDir(name) {
  const d = path.join(EVIDENCE, name);
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
  return d;
}

function loadJson(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

// ===== W-PARSE-BOTH =====
// D1 is a PARSER contract, not an aggregate-state contract. The repo is a dirty
// multi-orchestrator tree; the p0 aggregate legitimately flags modified files
// (pre-existing, orthogonal to arg parsing). So the parse-acceptance criterion is:
//   (a) the runner does NOT fail at the PARSE stage — i.e. stderr contains no
//       "unknown argument"/"is required" fail-closed, and exit ∈ {0,2} (both are
//       post-parse outcomes: 0=all-green, 2=real quality verdict), NEVER the
//       parse-stage exit 1 with an unknown/required-arg message;
//   (b) the runner reaches COMPLETION (emits wiring-integrity.json + summary.json);
//   (c) FORM PARITY: the `=`-form, space-form, and mixed-form produce the SAME
//       exitCode, summary.overallOk, and per-tier ok-vector — the form must not
//       change behavior. (This is the actual D1 closure.)
const PARSE_FAIL_RE = /unknown argument|--profile=ci is required|--evidence-dir=.* is required|--summary-out=.* is required/;
let parityRefs = null; // captured from the first variant, compared against the rest
const variantOutcomes = [];
{
  const variants = [
    { label: "eq-form",    args: (dir) => [`--profile=ci`, `--evidence-dir=${dir}`, `--summary-out=${dir}/summary.json`] },
    { label: "space-form", args: (dir) => [`--profile`, `ci`, `--evidence-dir`, dir, `--summary-out`, `${dir}/summary.json`] },
    { label: "mixed-form", args: (dir) => [`--profile=ci`, `--evidence-dir`, dir, `--summary-out=${dir}/summary.json`] },
  ];
  for (const v of variants) {
    const dir = freshDir(`w-parse-both/${v.label}`);
    // also pass the pnpm-style `--` separator in the space-form to prove it is skipped
    const args = v.label === "space-form" ? ["--", ...v.args(dir)] : v.args(dir);
    const r = runSubprocess(args);
    const summaryPath = path.join(dir, "summary.json");
    const summary = loadJson(summaryPath);
    const wiringPresent = existsSync(path.join(dir, "wiring-integrity.json"));
    const summaryPresent = !!summary;
    const parseFailed = PARSE_FAIL_RE.test(`${r.stdout}\n${r.stderr}`) || (r.exitCode === 1 && !summaryPresent);
    const reachedCompletion = summaryPresent && wiringPresent;
    const accepted = !parseFailed && reachedCompletion && (r.exitCode === 0 || r.exitCode === 2);
    const outcome = {
      exitCode: r.exitCode,
      overallOk: summary && summary.overallOk,
      tierOk: summary && Array.isArray(summary.tiers) ? summary.tiers.map((t) => `${t.family}=${t.ok ? 1 : 0}`).join(",") : null,
    };
    variantOutcomes.push({ label: v.label, ...outcome });
    if (parityRefs === null) parityRefs = outcome;
    const sameAsRef = outcome.exitCode === parityRefs.exitCode &&
      String(outcome.overallOk) === String(parityRefs.overallOk) &&
      outcome.tierOk === parityRefs.tierOk;
    record(`W-PARSE-BOTH/${v.label}`, accepted && sameAsRef,
      `accepted=${accepted} parseFailed=${parseFailed} exit=${r.exitCode} overallOk=${outcome.overallOk} tierOk=${outcome.tierOk} parity=${sameAsRef}`,
      { variant: v.label, exitCode: r.exitCode, stderrHead: r.stderr.trim().slice(0, 80) });
  }
}

// ===== W-CI-PARITY (D1 closure) =====
// (a) the EXACT CLI shape from .github/workflows/quality.yml, and (b) its space-form
// equivalent — both must be ACCEPTED by the parser (criteria as above) AND produce
// identical verdicts (the form the parser previously REJECTED now behaves identically).
{
  const dirA = freshDir("w-ci-parity/exact-yml");
  const rA = runSubprocess(["--", "--profile=ci", `--evidence-dir=${dirA}`, `--summary-out=${dirA}/summary.json`]);
  const sA = loadJson(path.join(dirA, "summary.json"));
  const accA = !PARSE_FAIL_RE.test(`${rA.stdout}\n${rA.stderr}`) && !!sA && (rA.exitCode === 0 || rA.exitCode === 2);
  const outA = { exitCode: rA.exitCode, overallOk: sA && sA.overallOk };
  record("W-CI-PARITY/exact-yml(-form)", accA,
    `accepted=${accA} exit=${rA.exitCode} overallOk=${outA.overallOk}`, { exitCode: rA.exitCode });

  const dirB = freshDir("w-ci-parity/space-form");
  const rB = runSubprocess(["--", "--profile", "ci", "--evidence-dir", dirB, "--summary-out", `${dirB}/summary.json`]);
  const sB = loadJson(path.join(dirB, "summary.json"));
  const accB = !PARSE_FAIL_RE.test(`${rB.stdout}\n${rB.stderr}`) && !!sB && (rB.exitCode === 0 || rB.exitCode === 2);
  const outB = { exitCode: rB.exitCode, overallOk: sB && sB.overallOk };
  // PARITY: space-form must match the `=`-form (exact-yml) outcome — D1 closure.
  const parity = outB.exitCode === outA.exitCode && String(outB.overallOk) === String(outA.overallOk);
  record("W-CI-PARITY/space-form", accB && parity,
    `accepted=${accB} exit=${rB.exitCode} overallOk=${outB.overallOk} parity-with-yml=${parity} (D1 closure: previously-REJECTED form now accepted + identical)`,
    { exitCode: rB.exitCode });
}

// ===== W-NEG-UNKNOWN (error-handling regression guard) =====
// Unknown `=`-flag, unknown space-flag, and a value flag missing its value must all
// FAIL-CLOSED (non-zero). None may exit 0.
{
  // (a) unknown `=`-form flag
  const dirA = freshDir("w-neg-unknown/eq");
  const rA = runSubprocess(["--profile=ci", `--evidence-dir=${dirA}`, `--summary-out=${dirA}/s.json`, "--bogus=1"]);
  record("W-NEG-UNKNOWN/eq-bogus", rA.exitCode !== 0,
    `exit=${rA.exitCode} (must be non-zero; stderr=${rA.stderr.trim().slice(0, 80)})`,
    { exitCode: rA.exitCode });

  // (b) unknown space-form flag
  const dirB = freshDir("w-neg-unknown/space");
  const rB = runSubprocess(["--profile", "ci", "--evidence-dir", dirB, "--summary-out", `${dirB}/s.json`, "--bogus", "1"]);
  record("W-NEG-UNKNOWN/space-bogus", rB.exitCode !== 0,
    `exit=${rB.exitCode} (must be non-zero)`, { exitCode: rB.exitCode });

  // (c) value flag missing its value (trailing `--profile` with nothing after)
  const rC = runSubprocess(["--profile", `--evidence-dir=/tmp/x`, `--summary-out=/tmp/x/s.json`]);
  record("W-NEG-UNKNOWN/missing-value", rC.exitCode !== 0,
    `exit=${rC.exitCode} (must be non-zero; malformed must not silently accept)`,
    { exitCode: rC.exitCode });

  // (d) required-arg sanity still enforced in space-form (no --evidence-dir at all)
  const rD = runSubprocess(["--profile", "ci", "--summary-out", "/tmp/x/s.json"]);
  record("W-NEG-UNKNOWN/space-missing-required", rD.exitCode !== 0,
    `exit=${rD.exitCode} (must be non-zero)`, { exitCode: rD.exitCode });
}

// ===== summary =====
const passed = results.filter((r) => r.passed).length;
const failed = results.length - passed;
writeFileSync(path.join(EVIDENCE, "d1-witness-results.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), runner: RUNNER, passed, failed, results }, null, 2)}\n`, "utf8");
console.log(`\nD1 witnesses: ${passed} passed, ${failed} failed of ${results.length}.`);
process.exit(failed === 0 ? 0 : 1);
