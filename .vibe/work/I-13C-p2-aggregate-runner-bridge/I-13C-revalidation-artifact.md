# I-13C Revalidation Artifact (Triad-B adversarial REVALIDATOR)

- **Revalidator:** glm-5.2 (zai, thinking xhigh) — independent adversarial
- **Target repo:** `/Users/lizavasilyeva/work/vibe-engineer`
- **Status:** COMPLETE
- **VERDICT: PASS** — I-13C is **truth-green**.

## Target under revalidation
- Impl report: `.vibe/work/I-13C-p2-aggregate-runner-bridge/I-13C-implementation-report.md`
- Product changes: `packages/mechanical-gates/src/aggregate/**` (index.js, index.d.ts, p2/**) — `package.json` confirmed **untouched**.

## Revalidator evidence tree (owned by THIS agent)
`.vibe/work/I-13C-p2-aggregate-runner-bridge/revalidation-evidence/` — `dirty-tree-no-new-deps.txt`, `w-reg-self-reference.json`, `real-boundary-compiled-artifact.json`, `witness-full-result.json`, `witness-typecheck-result.json`. Every finding below was produced by a **revalidator-run** witness, not by reading the impl's prose.

## Stage results (all independent)
- [x] S1 ground-truth read (impl report, brief, spec §4.2/§3.3/§6, p1 mirror, P2 source API)
- [x] S2 registered set = {p0,p1,p2} — runtime probe of real aggregate public API (self-reference)
- [x] S3 real-boundary P2→`validateCodeSmells` seam — compiled artifact inspected + real findings flow
- [x] S4 fail-closed matrix — full witness re-run, all 13 negatives fail closed
- [x] S5 no-new-dependency — package.json/lockfile/root/turbo diffs all empty
- [x] S6 dirty-tree / scope safety — only owned paths changed; I-13 source untouched
- [x] S7 sibling-pin awareness — P0/P1 regression intact
- [x] S8 W-FC-POS achievable — registered set ⊇ declared {p0,p1,p2}

## Findings

### F1 — Registered set = {p0,p1,p2} (CRITICAL check) — **PASS**
Witness: `cd packages/mechanical-gates && node --input-type=module -e "import('@vibe-engineer/mechanical-gates/aggregate')..."` (self-reference — the truthful equivalent; see F-note).
- `runP0Aggregate`/`runP1Aggregate`/`runP2Aggregate` all `function`.
- `P2AggregateFamily` = `['p2.code-smell']`; `P1AggregateFamily` = 3 families retained.
- W-REG-OK: true, exit 0. Evidence: `w-reg-self-reference.json`.
- **(a) registered set = {p0,p1,p2}: CONFIRMED** via the real public `./aggregate` barrel exposing all three runners.

### F2 — Real-boundary P2→`validateCodeSmells` seam (CRITICAL check) — **PASS**
Full witness `node packages/mechanical-gates/fixtures/p2/aggregate/witness.mjs` exit 0.
- **Clean project:** `ok:true`, 0 findings. Bridge: `status:0`, `exportedValidatorName:"validateCodeSmells"`, `validatorFamilyObserved:"p2.code-smell"`, `typedSubresultValidation.ok:true`, compiled artifact exists on disk.
- **Smelly project:** `ok:false`, **8 real findings** incl. blocking `deep-control-flow-nesting` (mode `hard`); `stableFindings` carries the real ratchet identity (`tool:"p2.code-smell"`, detectorId, `mode:"hard"`, `contentHash c40895b8…`, structuralSignature).
- **Independent artifact probe (revalidator-run):** latest compiled bridge artifact is **37214 bytes**, contains **24 occurrences** of real detector logic (`deep-control-flow-nesting`, `silent-no-op-dispatcher`, `serialized-json-assembled-as-strings`, `contentHash`, `structuralSignature`, `CODE_SMELL_FAMILY`), and **0** mock/stub/fake strings. The compiled artifact IS `src/p2/code-smell/index.ts`.
- **(b) real P2→validateCodeSmells seam proven: YES** — not a stub/mock/synthetic.

### F3 — Fail-closed matrix (MAJOR-LOCAL check) — **PASS**
Full witness re-run produced exactly the expected ruleIds for every negative (each `ok:false`, typed carrier still emitted):
1. compile-failure → `aggregate.p2-bridge.compile-failed` (+`aggregate.missing-subresult`)
2. missing-artifact → `aggregate.p2-bridge.missing-artifact` (+missing-subresult)
3. wrong-export → `aggregate.p2-bridge.wrong-export`
4. wrong-family → `aggregate.p2-bridge.wrong-family`
5. malformed-result → `aggregate.malformed-subresult`
6. validator-exception → `aggregate.validator-exception`
7. output traversal → `aggregate.p2-bridge.path-invalid`
8. input traversal → `aggregate.p2-bridge.path-invalid`
9. omitted family → `aggregate.omitted-family`
10. unknown family → `aggregate.unknown-family`
11. invalid families option → `aggregate.invalid-option`
12. unknown option → `aggregate.unknown-option`
13. injected synthetic `subresults` → `aggregate.unknown-option`
Positive + negative both behave correctly. No silent success anywhere.

### F4 — No new package dependency (CRITICAL check) — **PASS**
Revalidator-run `git diff` (evidence `dirty-tree-no-new-deps.txt`):
- `git diff -- packages/mechanical-gates/package.json` → **empty** (exports/barrel unchanged; impl correctly determined no `exports` edit was needed — `./aggregate` already resolves the new export, mirroring I-12C which added no subpath).
- `git diff -- pnpm-lock.yaml` → **0 lines**.
- `git diff -- turbo.json package.json` → **0 lines** (I-20S surfaces untouched).
- **(c) no new dependency: CONFIRMED.**

### F5 — Dirty-tree / scope safety (CRITICAL check) — **PASS**
`git status --porcelain` (revalidator-run). Owned-by-I-13C:
- `M packages/mechanical-gates/src/aggregate/index.js`
- `M packages/mechanical-gates/src/aggregate/index.d.ts`
- `?? packages/mechanical-gates/src/aggregate/p2/`
- `?? packages/mechanical-gates/fixtures/p2/aggregate/`
- `?? .vibe/work/I-13C-p2-aggregate-runner-bridge/`

Pre-existing (NOT this lane — I-18B/DL-18P scope): `packages/cli/src/commands/security/**`, `docs/decisions/DL-18B-*`, `.vibe/work/{I-18,DL-18P}*`. Benign ephemeral: `.vibe/work/I-12-…/i11-bridge-artifacts/run-…` (emitted by the witness's P1 regression re-run; `.vibe/work` evidence, not a source/serialized edit).
- **(d) dirty-tree scope clean: CONFIRMED.** No edit to `src/p2/code-smell/**` (I-13 lane scope), no workflows/scripts/CLI/Pulumi, no `.git/**`. I-13C paths are file-disjoint from the pre-existing I-18B/DL-18P dirty-tree.

### F6 — Sibling-pin / blast-radius (MAJOR-LOCAL check) — **PASS**
Witness re-ran P0+P1 positive paths: `runP0Aggregate` → `family:"p0.aggregate"`, `ok:true`, `p0.allowlist` subresult retained; `runP1Aggregate` → `family:"p1.aggregate"`, `ok:true`, implemented families `[schema-contract-strictness, quality-ratchet, test-anti-pattern]` retained. Barrel extension is purely additive — no P0/P1 regression.

### F7 — W-FC-POS now achievable (downstream-critical check) — **PASS**
With P2 registered, the real aggregate reports `{p0,p1,p2}` (F1). The I-20A wiring gate's declared set `{p0,p1,p2}` is now ⊆ registered-and-running. The actual W-FC-POS run belongs to I-20A/I-20D (correctly not claimed here); I-13C only proves registration reality + fail-closed carrier, which it does.
- **(e) W-FC-POS now achievable: CONFIRMED.**

## Severity gate assessment — **I-13C TRUTH-GREEN**
- No critical defect: no silent false-green; `runP2Aggregate` registered/function/`p2.code-smell` present; no new dependency; no read-only/untouchable surface edited; real-boundary positive (not stubbed).
- No major-local defect: negative matrix complete; carrier evidence well-formed; `stableFindings` ratchet projection present; declarations typecheck (`--typecheck` mode exit 0: declaration consumer compiles, all exports functions).
- **Deviation analyzed (NOT a defect):** the P2 bridge uses a weaker `tsc` matrix (`--strict --skipLibCheck false --lib ES2022`) than P1's strict matrix (no `--noUnusedLocals`/`--noUnusedParameters`/`--noEmitOnError`/`--filter`). Revalidator independently confirmed this is the **faithful in-license choice**: (i) the flags are byte-for-byte identical to the **green I-13 P2 witness's own `compileP2Source`** invocation; (ii) the read-only P2 source genuinely contains an unused local (`interface TraversalFailure` at index.ts:149 — only the definition, never referenced → would fail `--noUnusedLocals`); (iii) the brief's §9 STOP boundary forbids editing read-only P2 source, so the impl correctly refused to weaken/massage the source to satisfy P1's stricter flags. The weaker matrix does not weaken any fail-closed guarantee: compile-failure is still caught via non-zero exit status, and the real source compiles clean under these flags (status 0). The impl's prose mention of `sourceFile` as an unused local is imprecise (it is a heavily-used property/parameter, not an unused top-level local), but the substantive justification stands. No band-aid, no silent fallback.

## Exact next action
Mark **I-13C truth-green** → the **W-FC-POS closure item is now satisfiable** (re-run I-20A's wiring gate against the now-complete `{p0,p1,p2}` aggregate). No fix routed.

## Severity tally
- critical: 0
- major-local: 0
- minor-local: 0 (the imprecise `sourceFile` citation in the impl report is report-only; weakens no gate/witness)
- clean: I-13C feeds dependents.
