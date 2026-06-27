# I-20A Revalidation Artifact (Triad-B adversarial)

- **Target:** `scripts/quality/**` (local quality runner) + `scripts/ci/quality/**` (fail-closed wiring-integrity gate)
- **Repo:** `/Users/lizavasilyeva/work/vibe-engineer`
- **Impl report:** `.vibe/work/I-20A-local-quality-runner-and-wiring-integrity/I-20A-implementation-report.md` (claim: DONE, 13/13 witnesses green, 9/9 schema-valid)
- **Revalidator:** glm-5.2 (zai, thinking xhigh) — independent adversarial; read-only witnesses + own evidence tree only.
- **Brief:** `harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-20A-brief-generated.md`
- **Ruling (reframe authority):** `…/reports/I-20A-blocker-adjudication-ruling.md` (`EXTEND-I-20S`, §7) + `…/I-20A-blocker-adjudication-validation-artifact.md` (PASS, F6/F7).
- **Verdict:** **PASS** — I-20A is **truth-green**. All 9 verification axes independently confirmed against on-disk reality + binding brief/§7. The marquee W-FC-NEG fail-closed contract is **REAL-boundary (not synthetic)**. W-FC-POS is **genuinely green at runtime** (Fork-B payoff closes). Unblocks I-20B; contributes to I-20C / I-20-COMPLETE.

---

## Verification matrix (each independently run by this revalidator; commands + exit + evidence in `revalidation-evidence/`)

| # | Axis | Independent result | Severity |
| --- | --- | --- | --- |
| 1 | W-RUN real-boundary | PASS (truth-green for runner contract) — see §1 | clean |
| 2 | W-FC-NEG real-boundary (CRITICAL) | PASS — real aggregate, real gate, phantom p9 → exit 2 naming p9 | clean |
| 3 | W-FC-POS genuinely green | PASS — exit 0, {p0,p1,p2}⊆registered {p0,p1,p2} at runtime | clean |
| 4 | Fail-closed never silently passes | CONFIRMED — phantom/malformed/missing all fail loudly; advisory can't weaken | clean |
| 5 | Public-API-only (no internal relative import) | CLEAN — only `@vibe-engineer/mechanical-gates/aggregate` | clean |
| 6 | N1–N8 negatives + R1–R2 regression | impl harness 13/13; N6/N7 + marquee independently re-confirmed | clean |
| 7 | Schema validity (9/9) | PASS — 4 schemas `additionalProperties:false`; validator rejects invalid | clean |
| 8 | Dirty-tree / scope safety | CLEAN — I-20A delta = `scripts/quality`+`scripts/ci/quality`+work root only | clean |
| 9 | Local/CI parity hint | CLEAN — invocation-portable; parity cmd = I-20B CI cmd | clean |

---

### §1. W-RUN real-boundary — PASS (truth-green for the runner contract)

**Command:** `pnpm quality -- --profile=ci --evidence-dir=<dir> --summary-out=<dir>/summary.json`
**Exit:** `2`  ·  **Evidence:** `revalidation-evidence/wrun/{p0,p1,p2}.aggregate.json` (3.7 MB p0) + `summary.json` + `wiring-integrity.json`.

- The runner **really spawns** all three registered tiers via the PUBLIC `@vibe-engineer/mechanical-gates/aggregate` export (verified: `aggregatePublicExports=[runP0Aggregate,runP1Aggregate,runP2Aggregate]`, each a `function`, resolved via the package `exports` map — not a relative path).
- It writes **schema-valid** per-tier evidence + summary (9/9 schema-valid; see §7).
- `wiring.verdict = "pass"`, `missingFamilies = []` — the I-20A-owned wiring seam is GREEN.
- **Exit 2 is HONEST aggregate quality-red, NOT a wiring/runner defect.** p0 returns `ok:false` with **3307 real blocking findings** on the dirty in-flight tree (e.g. `"tsconfig.json must be readable JSON."`, `"P0 aggregate validator raised instead of returning a typed result; aggregate fails closed."`). p1/p2 return `ok:true`. `overallOk=false` → exit 2. This is the correct behaviour of a quality gate on a tree with real findings — forcing exit 0 would require **suppressing real findings = false-green = critical**, which the runner correctly refuses (quality-bar binding). The task's literal "exit 0" is the idealised expectation on a findings-clean tree; it is not achievable here without a false-green. `p0.testing-boundary` is present in implementedFamilies (N5 positive REAL).
- This matches the brief §7/§8.1 (exit is context-dependent; "exit 0 on a clean registered set") and the impl's `D1` framing. The wiring verdict (the actual deliverable) is independently inspectable as pass. **Not an I-20A defect.**

### §2. W-FC-NEG real-boundary — PASS (THE critical check; not synthetic)

**Command:** `node scripts/ci/quality/wiring-integrity-gate.mjs --profile=ci --evidence-dir=<dir> --expected=p0,p1,p2,p9`
**Exit:** `2`  ·  **Evidence:** `revalidation-evidence/wfc-neg/wiring-integrity.json`.

- Declares a **phantom family `p9`** that the real aggregate does not register.
- **REAL boundary, not mocked/synthetic:** the SAME public aggregate module is imported and **every** `runP{N}Aggregate` export is **really invoked** against `projectRoot` and checked for a typed carrier (`family === "p{N}.aggregate"`) in `enumerateRegisteredAndRunning`. The real registered-and-running set is `{p0,p1,p2}` (all three `running:true`). Only the *negative input* (the phantom manifest entry) is constructed — which is exactly what a negative witness is (operator-authorized reframe, ruling §7 + validation artifact F6).
- `expected={p0,p1,p2,p9} \ registered-and-running={p0,p1,p2} = {p9}` → `verdict:"fail"`, `exitCode:2`, diagnostic explicitly names `p9` and cites mechanical §7 "CI invokes partial gate instead of aggregate gate". No silent pass.

### §3. W-FC-POS genuinely green at runtime (not pending) — PASS

**Command:** `node scripts/ci/quality/wiring-integrity-gate.mjs --profile=ci --evidence-dir=<dir>` (canonical manifest `{p0,p1,p2}`)
**Exit:** `0`  ·  **Evidence:** `revalidation-evidence/wfc-pos/wiring-integrity.json`.

- Independently probed the real aggregate's registered set: `runP2Aggregate` **IS** an exported `function` (I-13C landed — confirmed by direct import). registeredAndRunning = `{p0,p1,p2}` via real invocation.
- `{p0,p1,p2} ⊆ {p0,p1,p2}` → `verdict:"pass"`, `exitCode:0`, `missingFamilies:[]`. The `pending-I-13C` tail collapses. **Fork-B payoff closes.** `publicContractConsumption`: public specifier used, no internal relative import, `testingBoundaryRegistered:true`.

### §4. Fail-closed never silently passes — CONFIRMED

Independent adversarial probe (`revalidation-evidence/adversarial-probe.mjs`, 11/11 ok):
- **Phantom family** → exit 2 naming the phantom (§2).
- **Malformed manifest** → schema layer rejects (4 variants tested: extra property / wrong `schemaVersion` const / missing required / bad family pattern) → `assertValid` throws in `loadQualityContext` → `main()` rejection → `process.exit(1)` (control flow confirmed by reading source: `loadQualityContext()` is the first awaited call in both runner and gate, un-wrapped).
- **Missing manifest** → `readJson` → `fs.readFile` → `ENOENT` throw → exit 1 (tested).
- **Advisory can't weaken (N7):** `applyFailClosedRule` with `expected={p0,p9}\registered={p0}` yields `verdict:"fail", exitCode:2` both with and without `advisory`; `advisoryIgnored:true` when advisory set.
- **Dynamic/latest dep (N6):** `auditDeclaredDependencies([{spec:"latest"}])` and `[{spec:"*"}]` both throw; `auditImportSpecifiers` flags `npx-bogus`/`@undeclared/pkg`.
No path omits/degrades/warns-and-passes. The §7 "partial gate instead of aggregate gate" failure mode is structurally impossible (the runner runs the wiring gate FIRST and refuses a partial aggregate spawn if wiring fails).

### §5. Public-API-only consumption — CLEAN

- Grep of `scripts/quality/**` + `scripts/ci/quality/**`: the **only** package import specifier is `@vibe-engineer/mechanical-gates/aggregate` (the public one). String `packages/mechanical-gates/src` appears **only** in comments / the forbidden-pattern detector in `public-contract.mjs` — no actual import reaches package internals.
- All other imports are `node:*` builtins or internal `./`/`../` wiring between I-20A's own files (allowed as internal module wiring; the audit explicitly skips `./`,`../`).
- `dependency-audit` extracts every import specifier from real owned source and asserts each is a builtin or the allowed public specifier (N4/N6 enforcement is live in every wiring evidence `observedImportSpecifiers`).

### §6. N1–N8 negatives + R1–R2 regression — PASS

- Impl harness `node …/witnesses/run-witnesses.mjs` → **13/13 ALL GREEN** (re-run by this validator, exit 0). N-series use fixtures to exercise the gate's internal fail-closed logic (appropriate — they are NOT the producer→consumer seam; the real aggregate is exercised REAL by W-RUN/W-FC-POS/W-FC-NEG). The marquee W-FC-NEG is real-boundary (§2).
- Independently re-confirmed N6 (latest/* rejected, undeclared imports flagged) and N7 (advisory can't weaken) against the live lib functions (§4). N2 is a real-runner ENOTDIR fail-closed (exit 1).
- R1 (parity): `parityInputs.localAndCiEquivalent=true`; blocking command = `pnpm quality -- --profile=ci …` (the I-20B CI command); excludes full E2E/mobile/visual. R2 (scope): see §8.

### §7. Schema validity (9/9) — PASS

- Impl validator `node …/witnesses/validate-evidence-schemas.mjs` → **9 pass / 0 fail** (re-run, exit 0). Independently re-validated: the validator is a **real deterministic** JSON-Schema (draft 2020-12 subset) validator — it **rejects** a wiring evidence missing a required field and one with an extra property (`additionalProperties:false`), and accepts valid evidence.
- **All 4 schemas enforce `additionalProperties:false`** at every object level (manifest, config, wiring-integrity, summary + nested public-contract/dependency/parity/enumeration/tier objects). Patterns `^p\d+$` / `^runP\d+Aggregate$` enforced.
- **Self-contained validator is justified:** `ajv` and `@vibe-engineer/artifacts` are **UNRESOLVABLE** from repo root (confirmed by `import.meta.resolve`); root devDeps contain neither (no new dependency could be added — would mutate the I-20S-serialized lockfile). The validator governs **only** the runner's own output artifact shape — it is NOT standing in for the load-bearing typed seam (the PUBLIC aggregate API), which is exercised real-boundary and self-enforces its carrier shape.

### §8. Dirty-tree / scope safety — CLEAN

- `scripts/` subtree contains **only** `quality/` (8 files) + `ci/quality/` (6 files) = 14 files, **all NEW/untracked** (`?? scripts/`). No other `scripts/` content.
- I-20A work root `.vibe/work/I-20A-…/` is entirely **untracked** (all new); zero tracked modifications by I-20A.
- Modified **tracked** files are all attributable to **other lanes**, not I-20A (diffs inspected):
  - `package.json`: adds ONLY the `quality` script + `@vibe-engineer/mechanical-gates:workspace:*` devDep → **I-20S / Step-1** (the authorized single devDep; I-20A is gated on I-20S PASS). Nothing I-20A-specific.
  - `turbo.json`: adds `quality` task (I-20S) + `deploy` task (I-20C). `pnpm-workspace.yaml`: adds `infra/pulumi` (I-20C). `packages/mechanical-gates/src/aggregate/**` + new `src/aggregate/p2/` → **I-13C**. `packages/cli/src/commands/security/**` → another lane.
- I-20A touched **nothing** outside its owned prefixes (`scripts/quality/**`, `scripts/ci/quality/**`, `.vibe/work/I-20A-*/**`). No git stash/reset/clean/checkout/restore used; canonical manifest/scripts intact.

### §9. Local/CI parity hint — CLEAN

- The runner resolves all files (schemas, manifest, config) **relative to the module location** (`import.meta.url`), not cwd; uses only Node builtins + the public aggregate export; `projectRoot=process.cwd()`. **Invocation-portable** — no local-only assumptions that would break in CI.
- `parityBlockingCommand` = `pnpm quality -- --profile=ci --evidence-dir=<dir> --summary-out=<summary-json>` = exactly the blocking path I-20B will invoke (locked-decisions §10 + mechanical §7 local/CI equivalence).

---

## Minor-local nits (NON-BLOCKING — no gate/witness weakened)

- **NIT-1 (doc/ergonomics):** the config `parityBlockingCommand` documents **space-separated** flag syntax (`--evidence-dir <dir> --summary-out <summary-json>`), but the runner/gate accept only `=` syntax. Space-separated args are rejected **fail-closed as "unknown"** (loud/safe, NOT silent). I-20B must invoke with `=` form. Non-blocking.
- **NIT-2 (report accuracy):** impl report header says `scripts/quality/` "9 files"; on-disk there are **8** (14 total across `scripts/`). Cosmetic count nit.
- **NIT-3 (W-RUN exit):** task literally requested W-RUN "exit 0"; on this dirty in-flight tree it is exit 2 (honest aggregate quality-red, §1). Correct/non-false-green behaviour; flagged only for transparency. Not an I-20A defect.

## Severity gate assessment

- **critical:** none. No false-green on wiring; W-FC-NEG is real-boundary (not synthetic/mocked — the operator-authorized reframe constructs only the negative input against the REAL aggregate); no silent family omission; no internal relative import; no dynamic/latest/auto-deploy; I-20S + testing-boundary public contract both confirmed present at runtime (not treated green falsely); no new dependency.
- **major-local:** none. Wiring gate complete and correct; W-FC-NEG (real) + W-FC-POS (genuinely green) + W-POS-{p0,p1,p2} all green; N1–N8 fail-closed; schema-valid evidence + summary; local/CI-parity evidence; quick-gate parity inputs emitted.
- **minor-local:** 3 non-blocking nits (above) — none weaken any gate/witness.
- **clean (I-20A truth-green):** ALL of wiring gate correct + W-FC-NEG real-green + W-FC-POS real-green + W-POS-{p0,p1,p2} real-green + schema-valid evidence + local/CI-parity evidence + dirty-tree scope clean. ✅

## Severity-gate conclusion

**I-20A is truth-green.** It **unblocks I-20B** (the runner + fail-closed wiring gate + local/CI-parity contract are real and correct; the `pnpm quality -- --profile=ci …` blocking path is invocation-portable and ready for I-20B's `quality.yml`) and **contributes to I-20C / I-20-COMPLETE** (W-FC-POS is genuinely green, closing the Fork-B payoff). No blockers, no out-of-license edits, no false-green.

## Exact next action

I-20A → **PASS / unblock I-20B**. I-20B may now wire `pnpm quality -- --profile=ci --evidence-dir=<dir> --summary-out=<summary-json>` as the blocking quick-gate job (use `=` flag syntax per NIT-1), invoking the SAME path proven here. The wiring-integrity gate (exit 0 standalone) proves wiring; the full runner fails closed only on real findings (correct blocking). No I-20A re-work required.
