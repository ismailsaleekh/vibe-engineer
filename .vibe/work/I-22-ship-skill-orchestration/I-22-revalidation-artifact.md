# REVALIDATION ARTIFACT — I-22 ship-skill-orchestration (Triad-B adversarial)

- **Revalidator:** independent adversarial REVALIDATOR (glm-5.2 via zai, thinking: xhigh).
- **Mode:** read-only on both repos (no product edits, no git mutations, no package-manager mutations). WRITE only this artifact + own evidence tree (`revalidation-evidence/**`). No edits to product source, the impl report, prior evidence, any brief/prompt/ledger/status/handoff, or `.git**`.
- **Quality bar:** `prompts/quality-bar.md` prepended verbatim, binding. Implementer `DONE` ≠ validator `PASS`. Shape-green ≠ truth-green.
- **Target under revalidation:** impl report `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-22-ship-skill-orchestration/I-22-implementation-report.md` (claims DONE: 20/20 + 13/13 real-boundary witnesses green; failed-final-verify/unresolved-drift block; no-push/no-commit/no-PR statically+ dynamically proven; manifest `./ship` export added as EXTEND-I-00A).
- **Precedent:** I-21 revalidation PASS (the build skill that produces the Build Result I-22 consumes), with its major-local gitignore F1 caveat.
- **Provenance:** node v24.16.0, pnpm 10.33.0, branch `main`, HEAD `001c76d7cf57`. Date 2026-06-27.

## Verdict

**`PASS`** — I-22 is **truth-green on its deterministic functional contract**. All 7 task-mandated dimensions reproduce with REAL-boundary evidence, re-run by THIS revalidator (not on the implementer's word): the 33/33 witness matrix (20 orchestrator + 13 CLI, exit 0), the **decisive** no-push/no-commit/no-PR invariant proven at BOTH the schema-const layer AND dynamically (my own adversarial probe, 9/9), failed-final-verify + unresolved-context-drift blocking (N4/N5 real), schema-valid Ship Packet carrier, the scoped single-line `./ship` manifest export (EXTEND-I-00A) with zero cli-manifest and zero lockfile I-22-attributable delta, no sibling break, and clean dirty-tree scope. The Ship Packet schema structurally forbids any push/commit/PR via `const` + root `additionalProperties:false` — even a buggy assembler could not emit a violating packet. **I-22 truth-green → contributes to unblocking I-23/FINAL-BUGHUNT's deterministic build/ship proof** (I-22 has no pending-live seam of its own; its deterministic PASS is not gated by I-14B).

No critical finding. No blocking major-local finding. Two non-gating minor-local nits (report prose / determinism-id freshness; brief N3 covered structurally) recorded below.

## Stage log
- [x] 0. Artifact scaffolded (checkpointing; updated after each stage).
- [x] 1. Read ground-truth (impl report, I-22 brief, I-21 revalidation artifact).
- [x] 2. Mapped on-disk reality (owned paths, witness scripts, source).
- [x] 3. Re-ran 33-witness matrix independently (orchestrator 20/20 + CLI 13/13, exit 0).
- [x] 4. No-push/no-commit/no-PR invariant — schema-const (S1–S4) + dynamic git-state (my probe, 9/9).
- [x] 5. Failed-final-verify / unresolved-drift blocks — N4 independent + N5 real-corruption inspection.
- [x] 6. Ship Packet schema-valid — W4/W4b + my S0 baseline re-validation.
- [x] 7. Manifest `./ship` export scoped — three-way diff attribution; lockfile = zero I-22 delta.
- [x] 8. No sibling break — I-21 build 14/14 + I-02A + I-09 exit 0; R2 coexist.
- [x] 9. Dirty-tree / scope clean — `.gitignore` change is I-21's follow-up, not I-22's; no out-of-license edits.
- [x] 10. Severity gate + verdict + next action.

Evidence tree: `revalidation-evidence/` (`independent-probe.mjs` + `probe-summary.json` + `probe-n4/**` + `probe-green/**` + `orchestrator-witness-run.txt` + `cli-witness-run.txt` + `i21-build-witness.txt` + `i02a-witness.txt` + `i09-witness.txt`).

## Findings (every claim independently reproduced by THIS revalidator)

### (a) 33-witness matrix reproduces REAL-BOUNDARY — CONFIRMED (clean)
Re-ran BOTH witnesses myself (exit 0):
- `node .vibe/work/I-22-ship-skill-orchestration/witness-ship-chain.mjs` → **20/20 PASS** (W1 intake→orchestrator over a real passed Build Result `build-040477c785f8f7c3.json` [status=passed, producer `skill-build`, 16 verificationRuns, real approved-plan ref]; W2 final-verify → 16 schema-valid Evidence Packets, status=passed; W3 real `checkContextDrift`+`validateContextProject`+`writeContextProject`, drift.ok=true; W4/W4b Ship Packet schema-valid + persisted carrier revalidates; W5 no-push invariant; N1–N7b/R1; W7 static+dynamic no-push).
- `node packages/cli/src/commands/ship/run-cli-witness.mjs` → **13/13 PASS** (W6 loader registers `ship`, W6 declares skills dep + `./ship` export, W6 seed-build via real `build` sibling, **W6 green dispatch** status=success exit=0 valid envelope + ship_packet artifact, R3 secret redaction, **N4 CLI failed-final-verify** status=failure exit=1 classification=deterministic_failure shipPacket=false, N9 missing-prerequisite deterministic_failure, N8/N8b/N1 invalid-invocation, R2 ship+build+verify coexist).
- **Total = 33/33 PASS**, matching the report exactly. Each is REAL-boundary: real I-06 approved-plan fixture, real `@vibe-engineer/verification` runner (16 Evidence Packets), real `@vibe-engineer/context` graph write + drift detection, real I-02A `createCommandLoader`/`loader.dispatch`, real `@vibe-engineer/artifacts` validators. No mock/synthetic green. CLI W6 dispatches through the REAL `createCommandLoader([shipCommand])` + `loader.dispatch('ship', …)` (not a mock), seeded by the REAL `build` sibling command.

### (b) No-push/no-commit/no-PR invariant — SCHEMA-ENFORCED + DYNAMICALLY PROVEN (DECISIVE — clean)
This is the load-bearing ship-skill contract. Proven at TWO independent layers by my own probe (`revalidation-evidence/independent-probe.mjs`, 9/9 PASS):
1. **SCHEMA-CONST ENFORCEMENT (decisive):** `ship-packet.schema.json` declares `"noPushWithoutApproval":{type:boolean,const:true}`, `"commitPerformedByAgent":{type:boolean,const:false}`, `"prOpenedByAgent":{type:boolean,const:false}`, all three in the schema `required`, with root `"additionalProperties":false` and `additionalProperties:false` on commitPreparation/prPreparation. I loaded the real green Ship Packet through the REAL `@vibe-engineer/artifacts` `validateArtifactKind('ship_packet', …)` validator and mutated each invariant field:
   - **S1** `noPushWithoutApproval:false` → **REJECTED** (const:true enforced). ✓
   - **S2** `commitPerformedByAgent:true` → **REJECTED** (const:false enforced). ✓
   - **S3** `prOpenedByAgent:true` → **REJECTED** (const:false enforced). ✓
   - **S4** injected a stray `gitPushCommand:'git push origin main'` field → **REJECTED** (root additionalProperties:false — no hidden push/commit/PR field can sneak in). ✓
   - **S0** baseline: the unmutated green packet VALIDATES (validator is correctly accepting valid packets). ✓
   ⇒ The invariant is **structurally un-emissable**: even a buggy assembler cannot produce a schema-valid Ship Packet that authorizes push/commit/PR. The schema is the authoritative gate.
2. **ASSEMBLER + W5 DEFENSE-IN-DEPTH:** `ship-skill.js` hardcodes `noPushWithoutApproval:true`, `commitPerformedByAgent:false`, `prOpenedByAgent:false` and re-asserts all three post-assembly (returns `blocked('ship_packet_invariant_violation')` if any is wrong). The CLI `index.ts` additionally re-asserts on the **persisted** carrier before emitting success.
3. **DYNAMIC (no git/remote mutation):**
   - **W7 static:** exact brief grep `rg -n "git push|git commit|gh pr create|git tag|pulumi|child_process.*git|fetch\(.+https?://" packages/skills/src/ship/orchestrator packages/cli/src/commands/ship` → **0 matches (exit 1)**.
   - **W7 dynamic (green):** `git rev-parse HEAD` + `git for-each-ref` snapshot EQUAL before/after a real green ship run — HEAD `001c76d7cf57` unchanged, refs unchanged. ✓
   - **W7 dynamic (failing/N4):** identical equality holds before/after a failing ship run. ✓
   ⇒ A successful ship run performs **zero** commit/push/tag/remote/deploy writes.

### (c) Failed-final-verify / unresolved-context-drift BLOCK (load-bearing) — CONFIRMED (clean)
- **N4 (failed-final-verify blocks):** my probe fed `runShipFromBuildResult` the green Build Result + the witness's failing blocking catalog → returned `{ok:false, reason:'ship_final_verify_blocks', verificationStatus:'failed'}`, **NO Ship Packet emitted**. The CLI maps this to status=`failure`, exit=1, classification=`deterministic_failure`, shipPacket=false. The source routes this BEFORE any packet assembly (`if (!verifyGreen || anyBlockingFailure) return blocked('ship_final_verify_blocks', …)`). ✓
- **N5 (unresolved-context-drift blocks):** the orchestrator witness constructs a REAL drift — writes a real context project via `writeContextProject`, then **corrupts the source content** (`# corrupted content for drift`) so the recorded fingerprint no longer matches → real `checkContextDrift` detects the mismatch → `blocked('ship_context_drift_blocks', driftStatus=blocked)`. Real fingerprint-mismatch drift, NOT synthetic. ✓

### (d) Ship Packet schema-valid — CONFIRMED (clean)
- W4/W4b: green Ship Packet (`ship-2afa844d483b5b5a.json`, status=`ready_for_review`) validates against `ship-packet.schema.json` via the real `@vibe-engineer/artifacts` validator; the persisted carrier re-validates after atomic write. My S0 baseline independently re-confirmed. 16 `finalVerification[]` entries (minItems:1 satisfied), `contextPreservation` with real context_header ref + drift evidence ref, all required fields present and typed. ✓

### (e) Manifest `./ship` export scoped (EXTEND-I-00A) — CONFIRMED (clean; no over-reach)
Three-way attribution (`git diff HEAD -- packages/skills/package.json`): HEAD had NO `exports` block + only `@vibe-engineer/artifacts` dep. The dirty diff adds the exports block (`./build`, `./ship`, `./ship/intake`) + 5 deps. Per the I-21 revalidation (PASS), I-21 added `./build` + `./ship/intake` + all 5 deps (adapter-pi/context/orchestration/verification + artifacts) as its self-executed EXTEND-I-02A/I-00A handoff. **I-22's attributable delta = the single additive line `"./ship": "./src/ship/orchestrator/index.js"`.** No deps added by I-22 (skills still has exactly I-21's 5 deps; confirmed). The `./ship` export resolves REAL (orchestrator/index.js exports `runShipFromBuildResult`/`persistShipPacket`/etc., all `typeof function` — proven by CLI W6 + direct import).
- **`packages/cli/package.json`:** I-22 made **ZERO** edits. The ` M` shows only `+adapter-pi`/`+skills`/`+context` — all I-21/I-15A Step-0 (per I-21 revalidation's three-way decomposition). No `./ship`-related or I-22 cli manifest change.
- **`pnpm-lock.yaml`:** 4565 lines (= I-21's +15 from its 5 additive `link:` edges). **Zero I-22-attributable lockfile delta** — `rg "ship/orchestrator|orchestrator/index" pnpm-lock.yaml` → 0 matches (exit 1). The `./ship` export is an `exports`-map entry, not a dependency, so it cannot and does not touch the lockfile. Frozen-lockfile integrity unaffected.
- **Other untouchables untouched by I-22:** root `package.json` (+3), `pnpm-workspace.yaml` (`+infra/pulumi` = DL-18P lane), `turbo.json` (+8) all carry **zero ship/I-22/orchestrator references** (grep exit 1) — pre-existing baseline churn from sibling lanes (I-12/I-13/I-15B/I-18B/DL-18P). `packages/artifacts/schemas/` — **not modified** (I-22 did not touch any schema). ✓

### (f) No sibling break (blast-radius) — CONFIRMED (clean)
- `node .vibe/work/I-21-build-skill-orchestration/witness-build-chain.mjs` → **14/14 PASS** (I-21 build skill still green; produces the Build Result I-22 consumes). ✓
- `node packages/cli/src/testing/run-witnesses.mjs` → **exit 0** (I-02A foundation/loader/envelope intact). ✓
- `node packages/verification/tests/run-witnesses.mjs` → **exit 0** (`ok:true`; I-09 runner intact). ✓
- CLI R2: `ship`+`build`+`verify` register together in the loader. ✓

### (g) Dirty-tree / scope — CLEAN (no out-of-license edits)
- **I-22 product-surface delta = exactly the 4 owned files + 1 licensed manifest line:** `packages/skills/src/ship/orchestrator/{index.js,ship-skill.js}`, `packages/cli/src/commands/ship/{index.ts,run-cli-witness.mjs}`, `.vibe/work/I-22-ship-skill-orchestration/**`, and the single `"./ship"` export on `packages/skills/package.json`. All four owned source paths are UNTRACKED-but-VISIBLE (`??` in porcelain; `git check-ignore` exit 1 = **NOT gitignored**) — unlike I-21's earlier state, I-22's source has no durability/gitignore defect.
- **`.gitignore` change (` M`) is NOT I-22's:** it is the I-21 gitignore follow-up fix (`I-21-gitignore-fix-report.md` exists in the I-21 work tree; `.gitignore` mtime `08:22` precedes I-22's files at `08:42+`; **zero** gitignore mentions anywhere in I-22's evidence). The removed bare `build/` rule and its explanatory comment are I-21's follow-up. I-22 did not touch `.gitignore`.
- No git stash/reset/clean/checkout/restore; no commits/pushes/PR/tag; no package-manager install/add/update/remove; no remote/deploy mutation. No edits to the impl report, prior evidence trees, any brief/prompt/ledger/status/handoff, or any product file outside the owned subtrees.

## Findings — defect list

### F1 — (minor-local) report prose cites a stale R1 deterministic artifactId
- **Evidence:** the report's R1 prose names `ship-1f89895960e608ff`; my re-runs observed `ship-c3452025ea3f3bfe` (run 1) and `ship-2afa844d483b5b5a` (run 2). These differ across runs because the green path's `deterministicArtifactId('ship', [runId, buildResultArtifactId, now])` uses wall-clock `now` unless fixed.
- **Not a defect:** the R1 witness FIXES `now` within a single run and proves the SAME id across its two internal reruns (R1 PASS in both runs). Determinism is correctly proven within fixed inputs; the report's specific id is just from an earlier run. Cosmetic prose nit only. Does not gate anything.

### F2 — (minor-local) brief N3 (blocking-warning Build Result) covered structurally, not by a dedicated runtime witness
- The orchestrator witness records N3 as a structural guarantee ("a passed carrier cannot carry blocking warnings schema-validly"), relying on the build-result schema (I-21's contract) rather than feeding a runtime blocking-warning fixture. This is acceptable (structurally impossible input) and consistent with I-21's treatment; recorded for completeness. Does not gate.

## Severity gate assessment

**I-22 is truth-green on its deterministic functional contract.** Every load-bearing seam is REAL (not shape-green):
- (a) 33/33 witnesses reproduce real-boundary (re-run by this revalidator, exit 0). ✓
- (b) No-push/no-commit/no-PR invariant — schema-const-enforced (S1–S4 mutated→rejected; stray field→rejected) AND dynamically proven (git HEAD `001c76d7cf57` + refs unchanged by green AND failing runs; static grep 0 matches). Decisive. ✓
- (c) Failed-final-verify blocks (N4, independent probe) + unresolved-context-drift blocks (N5, real fingerprint corruption). ✓
- (d) Ship Packet schema-valid (W4/W4b + S0 baseline). ✓
- (e) Manifest `./ship` export scoped (single additive line; zero cli-manifest I-22 delta; zero lockfile I-22 delta; schemas untouched). ✓
- (f) No sibling break (I-21 build 14/14; I-02A exit 0; I-09 exit 0; R2 coexist). ✓
- (g) Dirty-tree scope clean (only owned subtrees + 1 licensed export line; `.gitignore` is I-21's, not I-22's; no out-of-license edits). ✓

**Blocking analysis:** none of the task's halt conditions trigger — no witness failure, no failed-final-verify-not-blocking, no no-push-invariant hole, no manifest over-reach, no faked live seam, no out-of-license edit. The two minor-local findings (F1/F2) are non-gating prose/coverage nits.

**F1 pending-live:** I-22 wires NO selected-harness live ship-step — its deterministic PASS depends on no live-pi seam. The report's F1 disclosure ("no selected-harness live seam exercised by I-22") is honest and accurate. I-22 is NOT blocked by I-14B.

**I-22 truth-green → with I-17A/B + I-19, contributes to unblocking I-23/FINAL-BUGHUNT** for the deterministic build/ship artifact chain. I-22's deterministic ship PASS is complete; I-23's live build/ship proof remains subject to whatever other lanes (I-14B live-pi, the broader aggregate) gate it, but that is outside I-22's unit scope.

## Exact next action

1. **I-22 REVALIDATION = PASS** (truth-green). MARK I-22 deterministic-green.
2. **Advance I-23/FINAL-BUGHUNT** for the deterministic build/ship chain — I-22's Ship Packet carrier seam is real, schema-valid, no-push-const-enforced, and consumed by a proven CLI dispatch.
3. **No fix required for I-22.** Optional cosmetic: the implementer may refresh the report's R1 prose id to avoid the stale-determinism-id nit (F1); no functional change.
4. (Carry-forward, not I-22's:) the I-21 `.gitignore` follow-up is already in-flight (`I-21-gitignore-fix-report.md`); confirm it lands before I-21 source is committed.

## Files touched (this agent — owned WRITE only)
- `.vibe/work/I-22-ship-skill-orchestration/I-22-revalidation-artifact.md` (this file).
- `.vibe/work/I-22-ship-skill-orchestration/revalidation-evidence/{independent-probe.mjs, probe-summary.json, orchestrator-witness-run.txt, cli-witness-run.txt, i21-build-witness.txt, i02a-witness.txt, i09-witness.txt, probe-n4/**, probe-green/**}`.

No product edits, no git mutations, no package-manager mutations. Read-only witnesses only (`node` witness runners + my own probe; `git status`/`diff`/`show`/`check-ignore`; `rg`). No edits to the impl report, prior evidence trees, any brief/prompt/ledger/status/handoff, or any product file. `.git**` untouched.

*Independent adversarial revalidation — read-only on both repos; only this artifact + `revalidation-evidence/**` written.*
