# I-20A-D1 REVALIDATION (adversarial) — Triad-B D1 fix (parser accepts both CLI forms)

- Role: **INDEPENDENT ADVERSARIAL REVALIDATOR** (Triad-C). Implementer = Triad-B FIX (glm-5.2 via zai, thinking xhigh).
- Quality bar (`prompts/quality-bar.md`): binding (prepended verbatim). Shape-green ≠ truth-green. Implementer `DONE` is never validator `PASS`.
- Working dir: `/Users/lizavasilyeva/work/vibe-engineer`. Witnesses run from repo root.
- Owned WRITE: this artifact + `D1-revalidation-evidence/**` ONLY. Read-only on both repos; untouchable: product source, the fix report, prior evidence trees, prompts/briefs/ledger/status/handoff, `.git/**`. No git/package-manager-mutating ops performed.

## Target under revalidation
- Fix report: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-20A-local-quality-runner-and-wiring-integrity/I-20A-D1-fix-report.md`
- Implementer claim: `DONE` — `parseArgs` now accepts BOTH `=`-form and space-form; 9/9 D1 witnesses pass; 12/13 no-regression (sole R2 FAIL claimed pre-existing I-20B scope noise).

## VERDICT: **PASS** — D1 is **truth-green / CLOSED**.

Independently reproduced at the real boundary: the EXACT `quality.yml` blocking-step CLI (mixed `=`/space form) now executes the REAL aggregate (exit 2 honest quality-red on the dirty tree; real per-tier evidence emitted; wiring `pass`) instead of the pre-fix parse-stage exit 1 (`unknown argument(s)`). Both forms parse identically per flag; fail-closed error handling is fully intact; the `=`-form still works; the fix is root-cause-in-parser (the yml was NOT normalized — it still uses the space-form); the D1 delta is only `scripts/quality/run-quality.mjs` (owned); R2 FAIL is genuinely pre-existing I-20B/I-20C scope noise. The implementer's `DONE` is corroborated by independent on-disk reality.

---

## Numbered findings (severity + exact evidence)

> Severity scale: critical / major-local / minor-local / clean. ZERO critical, ZERO major-local, ZERO minor-local attributable to the D1 fix. One pre-existing CRITICAL **product** defect (D1) is correctly **fixed** by this delta (the fixer's job — this strengthens I-20A). Everything clean.

### F1 — clean — W-CI-PARITY (DECISIVE): the exact yml blocking-step CLI now executes the aggregate (D1 closed)
- **yml invocation under test (`.github/workflows/quality.yml` line 72, verbatim):**
  `run: pnpm quality -- --profile=ci --evidence-dir .vibe/ci-evidence --summary-out .vibe/ci-evidence/quality-summary.json`
  → `--profile=ci` is `=`-form; `--evidence-dir` and `--summary-out` are **SPACE-form**. (The TASK prompt said "space-form"; the FIX REPORT said "`=`-form"; **on-disk truth: MIXED** — I-20D's PASS F5 established this exactly. Either way the parser must accept the space-form.)
- **My witness command (repo root):** `node scripts/quality/run-quality.mjs -- --profile=ci --evidence-dir <D1-revalidation-evidence/w-ci-parity/exact-yml-mixed> --summary-out <…>/quality-summary.json`
- **Exit / output:** **exit 2**; stdout `quality FAIL (profile=ci)`; `wiring: pass | aggregates ok: p0=fail(… blocking), p1=ok, p2=ok`. `parseFailed=false`.
- **Real evidence emitted (runner reached COMPLETION, not parse-stage):** `p0.aggregate.json` (3.8 MB real findings), `p1.aggregate.json`, `p2.aggregate.json`, `quality-summary.json`, `wiring-integrity.json`. `summary`: `overallOk=false, exitCode=2, wiring.verdict=pass, tiers=[(p0,false),(p1,true),(p2,true)]`.
- **Before-fix reproduction (independent, I-20D F5, `revalidation-evidence/formA-stderr.txt`):** same flag shape → `FAIL-CLOSED quality: unknown argument(s) ["--evidence-dir",...,"--summary-out",...]` (exit 1, zero evidence, aggregate never spawned).
- **D1 closure = exit 1 (parse) → exit 2 (real aggregate verdict):** the parity quick-gate is now FUNCTIONAL (executes the aggregate and emits an honest verdict) rather than broken-at-parse. The exit-2/overallOk=false here is CORRECT quality-red on a dirty in-flight tree with real p0 findings (forcing exit 0 would be false-green = critical, which the runner correctly refuses); on a findings-clean tree it would exit 0. ✓

### F2 — clean — W-CI-PARITY no-separator variant: identical outcome
- **Witness:** same command WITHOUT the leading `--` (pnpm may strip its separator; parser must accept either). → **exit 2**, parity-with-sep=true (identical to F1). The `--`-skip branch is exercised and harmless. ✓

### F3 — clean — W-PARSE-BOTH: per-flag form parity (no lone-rejector)
- **Harness:** `D1-revalidation-evidence/d1-reval-witness.mjs` (independently authored; own assertions). For each flag family I ran all-`=`-form, all-space-form, mixed-form, AND three single-flag flips (flip `--profile` / `--evidence-dir` / `--summary-out` to space-form while holding the others `=`-form).
- **Result (all 7 variants):** every variant **accepted=true, exit=2, identical tierOk=`p0=0,p1=1,p2=1`, parity=true**. No flag accepts one form but not the other; no flag is a lone rejector; the form does not change behavior. ✓ (form-parity is the actual D1 contract.)

### F4 — clean — W-NEG-UNKNOWN: fail-closed error handling fully intact (NO regression)
- All 6 negatives fail-closed (exit 1), none silently accepted:
  - `--bogus=1` → exit 1 `unknown argument(s) ["--bogus=1"]`
  - `--bogus 1` → exit 1 `unknown argument(s) ["--bogus","1"]`
  - trailing `--profile` (no value) → exit 1 `unknown argument(s) ["--profile"]` (malformed space-form value flag)
  - trailing `--evidence-dir` (no value) → exit 1 `unknown argument(s) ["--evidence-dir"]`
  - `--profile=` (empty value) → exit 1 `--profile=ci is required (got "")` (empty NOT silently coerced to "ci" — `=`-form empty-value semantics preserved exactly, as the fix report promised)
  - space-form missing required `--evidence-dir` → exit 1 `--evidence-dir=<dir> is required`
- Adding space-form acceptance did NOT weaken unknown/malformed/empty handling. ✓

### F5 — clean — W-EQ-WORKS: the originally-working `=`-form is unbroken
- all-`=`-form run → accepted=true, exit 2, wiring `pass`. The fix added space-form acceptance without regressing the `=`-form (also corroborated by F3 all-eq). ✓

### F6 — clean — Root-cause, not symptom: `quality.yml` UNTOUCHED (parser is the fix)
- On-disk `quality.yml` line 72 **still uses the space-form** for `--evidence-dir`/`--summary-out`. A symptom-fix would have normalized the yml to `=`-form (so the parser wouldn't need to accept space-form). The parser DOES accept the space-form and the yml was NOT normalized → the fix is genuinely in the parser (the divergent component per I-20D F5's adjudication). ✓
- The on-disk parser (`scripts/quality/run-quality.mjs::parseArgs`) has a `KNOWN_VALUE_FLAGS` map + two branches: `=`-form (`eq=indexOf("="); if(eq>2){name=…;value=…}`) and space-form (`if(KNOWN_VALUE_FLAGS.has(arg)){value=tokens[i+1]; …}`), plus `--`-skip and unknown→fail-closed. Correct dual-form implementation.
- **`scripts/quality/` and `.github/` are UNTRACKED** (`?? scripts/`, `?? .github/`; `git ls-files scripts/quality/` empty) — there is no committed baseline, so `git diff` is empty by construction (expected lane output in a dirty tree; NOT a problem). The before-state is independently documented by I-20D F5's exit-1 reproduction; the after-state by my witnesses + on-disk read.

### F7 — clean — Dirty-tree scope: the D1 delta is ONLY `scripts/quality/run-quality.mjs`
- `git status --porcelain` + `--untracked-files=all`: the D1 fix's sole product-source touch is `scripts/quality/run-quality.mjs` (owned WRITE under `scripts/quality/**`). `.github/workflows/quality.yml` untouched (F6). NO root `package.json`/`pnpm-lock.yaml`/`turbo.json`/`pnpm-workspace.yaml` (the `M` entries there predate this fix — other lanes' baseline). NO `scripts/ci/quality/**` edit (the standalone wiring-gate `parseArgs` with the same `=`-only fragility was correctly LEFT UNEDITED — it is a separate CLI outside the `pnpm quality` D1 contract; flagged by the fixer as blast-radius, not in scope). NO other product source, `.git/**`, prior evidence/reports. No git stash/reset/clean/checkout/restore used. ✓

### F8 — clean — No gauntlet regression: 12/13 PASS; R2 FAIL genuinely pre-existing
- `node .../witnesses/run-witnesses.mjs` (independent re-run) → **12/13 PASS**: W-RUN (exit 2, wiring `pass`, real p0 findings), W-FC-POS (exit 0, {p0,p1,p2}⊆registered), W-FC-NEG (exit 2 naming phantom p9, real-boundary), N1–N8 (all fail-closed correctly), R1 (parity equiv=true). Parser change weakened nothing.
- **Sole FAIL = R2 (dirty-tree scope).** R2's `scriptsOutside` list = exactly 16 files in `scripts/ci/github-quality/**` (I-20B lane) + `scripts/ci/pulumi/validate-pulumi-scaffold.mjs` (I-20C lane); `i20aTrackedMods=0`; `authoredOwned=true missing=0`. **Independently confirmed pre-existing:** those dirs' mtimes (github-quality 01:43, pulumi 01:15) precede the D1 fix's `run-quality.mjs` mtime (02:10); the D1 fix's file is under owned `scripts/quality/` and is ABSENT from the scriptsOutside list → the parser delta adds **zero** scriptsOutside files. R2 FAIL is I-20B/I-20C scope noise, NOT this delta. ✓

### Corroboration (fixer's own harness)
- `D1-fix-evidence/d1-witness-results.json` → 9/9 pass: eq/space/mixed all exit=2 with identical `p0=0,p1=1,p2=1` tierOk, parity=true; W-NEG all exit 1 with `unknown argument(s)`. Matches my independent results. (Note: the fixer's "exact-yml" variant actually used all-`=`-form — a labeling imprecision; my F1 runs the genuinely-exact MIXED yml form, which is the decisive witness the fixer under-tested.)

---

## Explicit deliverable statements (per task)

**(a) W-CI-PARITY D1 closure — YES.** The EXACT yml space/mixed-form blocking-step CLI (`--profile=ci --evidence-dir <d> --summary-out <j>`) now SUCCEEDS past parse: exit 2 (real aggregate verdict), wiring `pass`, real per-tier evidence emitted — vs the pre-fix exit 1 `unknown argument(s)` (I-20D F5 reproduction). Hosted CI would no longer fail-closed on D1.

**(b) W-PARSE-BOTH both forms per flag — YES.** All three value flags (`--profile`, `--evidence-dir`, `--summary-out`) parse identically in `=`-form, space-form, mixed-form, and per-flag flips; identical exit + overallOk + tierOk vector; no lone-rejector.

**(c) W-NEG-UNKNOWN no error-handling regression — YES.** Unknown `=`-flag, unknown space-flag, value-flag-missing-value, and empty-value all fail-closed (exit 1) with clear diagnostics; space-form acceptance did not silently swallow malformed input.

**(d) No gauntlet regression (R2 FAIL genuinely pre-existing) — YES.** 12/13 PASS; R2's scriptsOutside is `scripts/ci/github-quality/**` (I-20B) + `scripts/ci/pulumi/**` (I-20C) — pre-existing lane output (mtimes precede the fix; absent the parser file), not the D1 delta.

**(e) `=`-form still works — YES.** all-`=`-form accepted, exit 2, wiring `pass` (F5).

**(f) Root-cause not symptom (quality.yml untouched) — YES.** `quality.yml` line 72 STILL uses the space-form for `--evidence-dir`/`--summary-out`; the parser accepts it; the yml was NOT normalized to `=`-form. Fix is in the parser (the divergent component).

**(g) Dirty-tree scope clean — YES.** D1 product-source delta = `scripts/quality/run-quality.mjs` ONLY (owned). No yml, no root manifests/lockfile, no `scripts/ci/quality/**`, no other product source, no `.git/**`. Pre-existing dirty `M`/`??` from other lanes is baseline.

## Severity gate assessment

- **critical attributable to the D1 fix:** NONE. (D1 itself was a critical PRODUCT defect; this fix correctly CLOSES it.)
- **major-local / minor-local attributable to the D1 fix:** NONE.
- **clean:** W-CI-PARITY (decisive, exact mixed form now executes) + W-CI-PARITY no-sep + W-PARSE-BOTH (7 variants, full parity) + W-NEG-UNKNOWN (6 fail-closed) + W-EQ-WORKS + root-cause-not-symptom (yml untouched) + dirty-tree scope (only `run-quality.mjs`) + no gauntlet regression (12/13; R2 pre-existing) → **D1 is truth-green / CLOSED.**
- **→ I-20-COMPLETE deterministic?** D1's deterministic blocker is removed: the parity quick-gate's command shape is now executable (the aggregate runs and emits honest verdicts instead of parse-failing). However, **I-20-COMPLETE / FINAL-BUGHUNT live claims are NOT made deterministic by D1 alone** — they remain additionally gated on the live seams W3 (hosted GHA real run — no git remote here), W4 (Pulumi preview — not logged into Pulumi Cloud), W5 (repo-environment protection API proof) per I-20D's next-action, all still `pending-live/BLOCKED`. D1 closure unblocks the *deterministic* parity path; the *live* seams are separate tracked blockers.

## Exact next action

1. **D1 is CLOSED — no fix re-work required.** The I-20A-D1 fix is truth-green.
2. **Blast-radius follow-up (I-20B, tracked, NOT blocking this D1 PASS):** per I-20D F5's adjudication, I-20B should add a real-execution parity witness to its static validator so the command-string-present regex check can never again mask a parser-rejects-the-command break (the textbook shape-green≠truth-green gap that let D1 slip). Also note (out of scope here): `scripts/ci/quality/wiring-integrity-gate.mjs` has an independent `=`-only `parseArgs` (a standalone CLI outside the `pnpm quality` contract) — flag to its owner; not a D1 matter.
3. **I-20 wave live closure remains gated on** W3/W4/W5 (above) — push to a GitHub remote, Pulumi Cloud auth, GitHub Environment protection — independent of D1.

---

*Independent revalidator evidence tree: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-20A-local-quality-runner-and-wiring-integrity/D1-revalidation-evidence/**` — `d1-reval-witness.mjs` (own harness), `d1-reval-results.json` (15/15 pass), `w-ci-parity/exact-yml-mixed/{p0,p1,p2}.aggregate.json + quality-summary.json + wiring-integrity.json` (decisive real-boundary evidence), `w-parse-both/**`, `w-neg/**`, `w-eq-works/**`. Corroborating: I-20D `revalidation-evidence/formA-stderr.txt` (before-fix exit-1 reproduction); I-20A gauntlet `evidence/witness-matrix.json` (12/13).*
