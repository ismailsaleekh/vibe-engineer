#!/usr/bin/env node
// I-20A-D1 INDEPENDENT REVALIDATION witness harness (Triad-C).
// Drives the REAL runner (`node scripts/quality/run-quality.mjs`) via subprocess.
// Written independently of the implementer's harness; own assertions + evidence.
//
// D1 = the parseArgs contract: must accept BOTH `=`-form (--flag=v) and space-form
// (--flag v) for every value flag, because .github/workflows/quality.yml line 72
// uses a MIXED form: `--profile=ci` (=) but `--evidence-dir <d>` and `--summary-out <j>`
// (SPACE). Before the fix the space-form flags were rejected (exit 1 "unknown
// argument(s)") → hosted CI fail-closed every run (I-20D F5 reproduced).
//
// Witnesses:
//   W-CI-PARITY  (DECISIVE) the EXACT yml token shape (mixed form) must now be
//                ACCEPTED (no parse-stage exit 1) and reach completion.
//   W-PARSE-BOTH per-flag: `=`-form and space-form produce identical outcomes.
//   W-NEG-UNKNOWN error-handling intact: unknown/malformed/empty still fail-closed.
//   W-EQ-WORKS   the originally-working `=`-form still works (no regression).
//
// Acceptance for a POSITIVE parser witness on a dirty tree (D1 is a parser contract,
// not an aggregate-state contract): exit ∈ {0,2} (0=all-green, 2=real quality verdict),
// NOT parse-stage exit 1 with unknown/required message, AND summary.json +
// wiring-integrity.json emitted (runner reached completion past parse).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../../.."); // D1-revalidation-evidence -> I-20A lane -> work -> .vibe -> repo root
const RUNNER = path.join(REPO_ROOT, "scripts/quality/run-quality.mjs");
const results = [];

const PARSE_FAIL_RE = /unknown argument|--profile=ci is required|--evidence-dir=.*is required|--summary-out=.*is required/;

function run(args, label) {
  try {
    const stdout = execFileSync("node", [RUNNER, ...args], {
      cwd: REPO_ROOT, encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"], timeout: 120000,
    });
    return { exitCode: 0, stdout, stderr: "" };
  } catch (e) {
    return { exitCode: e.status ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}
function freshDir(name) {
  const d = path.join(HERE, name);
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
  return d;
}
function loadJson(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }
function summarize(dir, r, summaryName = "summary.json") {
  const summary = loadJson(path.join(dir, summaryName));
  const wiring = existsSync(path.join(dir, "wiring-integrity.json"));
  const parseFailed = PARSE_FAIL_RE.test(`${r.stdout}\n${r.stderr}`) || (r.exitCode === 1 && !summary);
  const reached = !!summary && wiring;
  const accepted = !parseFailed && reached && (r.exitCode === 0 || r.exitCode === 2);
  return { exitCode: r.exitCode, overallOk: summary && summary.overallOk,
    tierOk: summary && Array.isArray(summary.tiers) ? summary.tiers.map((t) => `${t.family}=${t.ok ? 1 : 0}`).join(",") : null,
    wiringVerdict: summary && summary.wiring && summary.wiring.verdict,
    accepted, parseFailed, reached,
    stderrHead: r.stderr.trim().slice(0, 120), stdoutHead: r.stdout.trim().slice(0, 120) };
}
function record(name, passed, detail, extra = {}) {
  results.push({ name, passed, detail, ...extra });
  console.log(`[${passed ? "PASS" : "FAIL"}] ${name} — ${detail}`);
}

// ===== W-CI-PARITY (DECISIVE — exact yml mixed form) =====
{
  // Exact flag FORMS from quality.yml line 72:
  //   --profile=ci          (=-form)
  //   --evidence-dir <dir>  (space-form)
  //   --summary-out <json>  (space-form)
  const dir = freshDir("w-ci-parity/exact-yml-mixed");
  const r = run(["--", "--profile=ci", "--evidence-dir", dir, "--summary-out", `${dir}/quality-summary.json`], "ci-parity");
  const s = summarize(dir, r, "quality-summary.json");
  record("W-CI-PARITY/exact-yml-mixed (DECISIVE)", s.accepted,
    `accepted=${s.accepted} parseFailed=${s.parseFailed} exit=${s.exitCode} wiring=${s.wiringVerdict} overallOk=${s.overallOk} tierOk=${s.tierOk}`,
    { exitCode: s.exitCode, stderrHead: s.stderrHead, stdoutHead: s.stdoutHead });

  // Same command WITHOUT the leading `--` (covers direct-node invocation where
  // pnpm's separator is stripped) — must also be accepted.
  const dir2 = freshDir("w-ci-parity/exact-yml-mixed-nosep");
  const r2 = run(["--profile=ci", "--evidence-dir", dir2, "--summary-out", `${dir2}/quality-summary.json`], "ci-parity-nosep");
  const s2 = summarize(dir2, r2, "quality-summary.json");
  record("W-CI-PARITY/exact-yml-mixed (no-sep)", s2.accepted,
    `accepted=${s2.accepted} exit=${s2.exitCode} parity-with-sep=${s2.exitCode === s.exitCode && String(s2.overallOk) === String(s.overallOk)}`,
    { exitCode: s2.exitCode });
}

// ===== W-PARSE-BOTH (per-flag form parity) =====
{
  const variants = [
    { label: "all-eq",    args: (d) => ["--profile=ci", `--evidence-dir=${d}`, `--summary-out=${d}/summary.json`] },
    { label: "all-space", args: (d) => ["--profile", "ci", "--evidence-dir", d, "--summary-out", `${d}/summary.json`] },
    { label: "mixed",     args: (d) => ["--profile=ci", "--evidence-dir", d, `--summary-out=${d}/summary.json`] },
  ];
  let ref = null;
  for (const v of variants) {
    const dir = freshDir(`w-parse-both/${v.label}`);
    const r = run(v.args(dir), v.label);
    const s = summarize(dir, r);
    if (ref === null) ref = s;
    const parity = s.exitCode === ref.exitCode && String(s.overallOk) === String(ref.overallOk) && s.tierOk === ref.tierOk;
    record(`W-PARSE-BOTH/${v.label}`, s.accepted && parity,
      `accepted=${s.accepted} exit=${s.exitCode} overallOk=${s.overallOk} tierOk=${s.tierOk} parity=${parity}`,
      { exitCode: s.exitCode });
  }
  // Per-flag flip: start all-eq, flip EACH flag to space-form individually, confirm
  // no flag is the lone rejector (each flip must still parse identically).
  const flip = [
    { label: "flip-profile",     args: (d) => ["--profile", "ci", `--evidence-dir=${d}`, `--summary-out=${d}/summary.json`] },
    { label: "flip-evidence-dir",args: (d) => ["--profile=ci", "--evidence-dir", d, `--summary-out=${d}/summary.json`] },
    { label: "flip-summary-out", args: (d) => ["--profile=ci", `--evidence-dir=${d}`, "--summary-out", `${d}/summary.json`] },
  ];
  for (const v of flip) {
    const dir = freshDir(`w-parse-both/${v.label}`);
    const r = run(v.args(dir), v.label);
    const s = summarize(dir, r);
    const parity = s.exitCode === ref.exitCode && String(s.overallOk) === String(ref.overallOk) && s.tierOk === ref.tierOk;
    record(`W-PARSE-BOTH/${v.label}`, s.accepted && parity,
      `accepted=${s.accepted} exit=${s.exitCode} parity=${parity}`, { exitCode: s.exitCode });
  }
}

// ===== W-NEG-UNKNOWN (fail-closed intact — NO regression) =====
{
  // (a) unknown =-flag
  const da = freshDir("w-neg/eq-bogus");
  const ra = run(["--profile=ci", `--evidence-dir=${da}`, `--summary-out=${da}/s.json`, "--bogus=1"], "neg-a");
  record("W-NEG-UNKNOWN/eq-bogus", ra.exitCode !== 0 && /unknown argument/.test(ra.stderr),
    `exit=${ra.exitCode} stderr=${ra.stderr.trim().slice(0, 90)}`, { exitCode: ra.exitCode });

  // (b) unknown space-flag
  const db = freshDir("w-neg/space-bogus");
  const rb = run(["--profile=ci", `--evidence-dir=${db}`, `--summary-out=${db}/s.json`, "--bogus", "1"], "neg-b");
  record("W-NEG-UNKNOWN/space-bogus", rb.exitCode !== 0 && /unknown argument/.test(rb.stderr),
    `exit=${rb.exitCode} stderr=${rb.stderr.trim().slice(0, 90)}`, { exitCode: rb.exitCode });

  // (c) value flag missing its value (trailing --profile)
  const rc = run(["--profile"], "neg-c");
  record("W-NEG-UNKNOWN/missing-value(profile)", rc.exitCode !== 0,
    `exit=${rc.exitCode} stderr=${rc.stderr.trim().slice(0, 90)}`, { exitCode: rc.exitCode });

  // (d) trailing --evidence-dir with no value (malformed)
  const rd = run(["--profile=ci", "--evidence-dir"], "neg-d");
  record("W-NEG-UNKNOWN/missing-value(evidence-dir)", rd.exitCode !== 0,
    `exit=${rd.exitCode} stderr=${rd.stderr.trim().slice(0, 90)}`, { exitCode: rd.exitCode });

  // (e) empty value --profile= must NOT silently pass as "ci"
  const de = freshDir("w-neg/empty-profile");
  const re = run(["--profile=", `--evidence-dir=${de}`, `--summary-out=${de}/s.json`], "neg-e");
  record("W-NEG-UNKNOWN/empty-profile(eq)", re.exitCode !== 0 && /is required|unknown argument/.test(re.stderr),
    `exit=${re.exitCode} stderr=${re.stderr.trim().slice(0, 90)}`, { exitCode: re.exitCode });

  // (f) space-form missing required arg (no --evidence-dir at all)
  const rf = run(["--profile", "ci", "--summary-out", "/tmp/d1/s.json"], "neg-f");
  record("W-NEG-UNKNOWN/space-missing-required(evidence-dir)", rf.exitCode !== 0,
    `exit=${rf.exitCode} stderr=${rf.stderr.trim().slice(0, 90)}`, { exitCode: rf.exitCode });
}

// ===== W-EQ-WORKS (originally-working =-form unbroken) =====
// Corroborated by W-PARSE-BOTH/all-eq; recorded explicitly for the deliverable checklist.
{
  const dir = freshDir("w-eq-works");
  const r = run(["--profile=ci", `--evidence-dir=${dir}`, `--summary-out=${dir}/summary.json`], "eq-works");
  const s = summarize(dir, r);
  record("W-EQ-WORKS/all-eq", s.accepted,
    `accepted=${s.accepted} exit=${s.exitCode} wiring=${s.wiringVerdict} overallOk=${s.overallOk}`, { exitCode: s.exitCode });
}

const passed = results.filter((r) => r.passed).length;
const failed = results.length - passed;
writeFileSync(path.join(HERE, "d1-reval-results.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), runner: RUNNER, passed, failed, results }, null, 2)}\n`, "utf8");
console.log(`\nD1 REVAL witnesses: ${passed} passed, ${failed} failed of ${results.length}.`);
process.exit(failed === 0 ? 0 : 1);
