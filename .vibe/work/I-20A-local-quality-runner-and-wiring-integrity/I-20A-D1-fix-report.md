# I-20A-D1 Fix Report — Triad-B FIX

**Task:** D1 cross-lane CLI contract gap. Make the I-20A `pnpm quality` runner's
argument parser accept BOTH the space-form (`--profile ci`) AND the `=`-form
(`--profile=ci`), so hosted CI cannot fail-closed on a standard valid CLI form.
Root-cause fix at the parser (symptom-fix of editing `quality.yml` rejected per directive).

**Status:** DONE
**Agent:** Triad-B FIX (implementer; separate revalidation follows)
**VERDICT:** DONE

## Stage 0 — scoping / ownership

- Parser location: `scripts/quality/run-quality.mjs::parseArgs(argv)` (inline).
  Owned write path `scripts/quality/**` ✔.
- `scripts/ci/quality/wiring-integrity-gate.mjs` has its OWN `parseArgs` with the same
  fragility, but is a STANDALONE CLI (`node .../wiring-integrity-gate.mjs`), NOT the
  `pnpm quality` entry. It is NOT part of the D1 contract (`parityBlockingCommand` in
  `quality-wiring.config.json` = `pnpm quality -- --profile=ci ...`). Untouchable per
  license; flagged here for blast-radius, NOT edited.
- `package.json` quality script = `node scripts/quality/run-quality.mjs` → this is the
  parser the D1 contract routes to. Confirmed.
- Current `quality.yml` blocking step uses the `=`-form
  (`pnpm quality -- --profile=ci --evidence-dir ... --summary-out ...`). The parser fix
  is still strictly correct + robust (accepts a standard valid form it previously
  rejected); W-CI-PARITY additionally exercises the space-form to prove the new
  capability closes the contract gap.

## Stage 1 — root-cause fix (implemented)

File: `scripts/quality/run-quality.mjs`. Replaced the prefix-match-only `parseArgs`
(which accepted solely the `=`-form) with a parser that accepts BOTH forms for every
known value flag (`--profile`, `--evidence-dir`, `--summary-out`):

- `=`-form (`--profile=ci`): split on the FIRST `=` (so values containing `=` and empty
  values like `--profile=` are preserved exactly as before → still fail-closed).
- space-form (`--profile ci`): consume the next token as the value.
- `--` (pnpm/npm args separator, contract: `pnpm quality -- ...`) still skipped.
- Unknown flag (either form) → recorded as `unknown` → caller fail-closed. NO regression.
- Value flag with no following value (malformed) → recorded as `unknown` → fail-closed.
  No silent accept, no weakened error handling.
- Flags driven by a single `KNOWN_VALUE_FLAGS` map (name→setter); adding a flag is one
  entry + a witness. No boolean flags exist; none silently coerced.

Preserved exactly: `=`-form semantics, required-arg enforcement, unknown-flag
fail-closed, exit codes (1 = fail-closed parse/validation; 2 = real quality verdict).

## Stage 2 — witnesses (all run; real-boundary subprocess of the actual runner)

Harness: `.vibe/work/I-20A-local-quality-runner-and-wiring-integrity/D1-fix-evidence/d1-witness.mjs`
Results: `D1-fix-evidence/d1-witness-results.json` → **9 passed, 0 failed.**

D1 is a PARSER contract, not an aggregate-state contract. This repo is a dirty
multi-orchestrator tree; the p0 aggregate legitimately flags modified files
(wiring=pass, p1/p2 ok, p0 has ~3.3k blocking findings — pre-existing, orthogonal to
arg parsing). So parse-acceptance is judged by: (a) no parse-stage fail-closed
(no "unknown argument"/"is required", exit ∈ {0,2} never parse-exit-1-without-summary),
(b) run reaches completion (wiring-integrity.json + summary.json emitted), (c) FORM
PARITY — `=`-form, space-form, mixed-form produce identical exitCode + overallOk +
per-tier ok-vector.

- **W-PARSE-BOTH/{eq,space,mixed}-form** — PASS. All accepted=true, parseFailed=false,
  identical verdict (exit=2, overallOk=false, tierOk=p0=0,p1=1,p2=1), parity=true.
  The space-form (previously REJECTED at parse stage) is now accepted and behaves
  identically to the `=`-form.
- **W-CI-PARITY/exact-yml(=`-form`)** — PASS. The exact `quality.yml` invocation shape
  accepted, reaches completion.
- **W-CI-PARITY/space-form** — PASS + parity-with-yml=true. **D1 closure**: the form the
  parser previously rejected now accepted with identical verdict to the yml form.
- **W-NEG-UNKNOWN** — PASS (4/4): unknown `=`-flag (`--bogus=1`→exit1 "unknown
  argument(s)"), unknown space-flag (`--bogus 1`→exit1), value flag missing its value
  (trailing `--profile`→exit1), space-form missing required arg (no --evidence-dir→exit1).
  Error handling unchanged; no silent swallow.

## Stage 3 — no-regression (existing I-20A gauntlet)

`node .../witnesses/run-witnesses.mjs` → **12/13 PASS**.
- W-RUN, W-FC-POS, W-FC-NEG, N1–N8, R1 all PASS (parser change weakened nothing).
- The single FAIL is **R2 (scope)** and is **pre-existing / not caused by this fix**:
  it flags I-20B's `scripts/ci/github-quality/**` + `scripts/ci/pulumi/**` artifacts as
  "scriptsOutside". My D1 delta adds **zero** scriptsOutside files (verified below).

## Stage 4 — dirty-tree / scope (`git status --porcelain`)

My delta is ONLY:
- `scripts/quality/run-quality.mjs` (the parser — owned WRITE; untracked I-20A lane file)
- `.vibe/work/I-20A-local-quality-runner-and-wiring-integrity/D1-fix-evidence/**`
  (witness harness + result json + per-witness evidence dirs)
- `.vibe/work/I-20A-local-quality-runner-and-wiring-integrity/I-20A-D1-fix-report.md`

NOT touched (confirmed): `.github/workflows/quality.yml` (I-20B-owned — left intact; the
parser now accepts its form), root `package.json`/`pnpm-lock.yaml` (pre-existing `M` from
other lanes — not mine), `scripts/ci/quality/**` (untouched), `infra/**`, all
`packages/**` source, `.git/**`, prior evidence/reports. No git stash/reset/clean used.

## Notes for revalidation

- The aggregate exit=2 / overallOk=false in this tree is environment state (p0 findings
  on a dirty tree), NOT a D1 matter. D1 closure = the space-form is now ACCEPTED and
  PARITY-identical to the `=`-form (proven). In a clean/green tree the runner exits 0.
- Blast-radius for I-20B (per the adjudication): I-20B's real-execution parity witness
  should cover the space-form invocation now that the parser accepts it. The `quality.yml`
  file itself was NOT edited (out of license; the parser fix is the root-cause deliverable).
- Observation (NOT acted on, out of license): `scripts/ci/quality/wiring-integrity-gate.mjs`
  has an independent `parseArgs` with the same `=`-only fragility. It is a standalone CLI
  outside the D1 `pnpm quality` contract; flagged for the relevant owner, not edited here.
