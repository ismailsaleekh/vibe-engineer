# I-22 — ship skill orchestration — IMPLEMENTATION REPORT (Triad-B)

- **Lane**: `I-22-ship-skill-orchestration`
- **Implementer**: Triad-B IMPLEMENTER (glm-5.2, thinking: high)
- **Binding spec**: `implementation-briefs/I-22-brief-generated.md` (independent PASS: `reports/I-22-brief-validation-artifact.md`)
- **Working dir**: `/Users/lizavasilyeva/work/vibe-engineer`
- **Status**: **DONE — deterministic truth-green.**

## Deliverable (brief §1) — realized

Ship skill orchestrator + `vibe-engineer ship` CLI command that turn a **passed Build Result**
into a **schema-valid Ship Packet** after **final verification** (real `runVerificationPlan`)
+ **final context-drift check** (real `checkContextDrift` + `validateContextProject`), with a
hard **no-push / no-commit / no-PR / no-tag / no-remote / no-deploy** contract. Failed/blocked
final verification **blocks** (no Ship Packet) — master §8 load-bearing property. The
no-push/no-commit/no-PR invariant is enforced by `ship-packet.schema.json` `const` constraints
(`noPushWithoutApproval:true`, `commitPerformedByAgent:false`, `prOpenedByAgent:false`), which
the assembler preserves, never weakens.

## Files changed (exact — owned paths only + the licensed additive manifest line)

- `packages/skills/src/ship/orchestrator/index.js` (entry — re-exports)
- `packages/skills/src/ship/orchestrator/ship-skill.js` (orchestrator core: intake → final-verify → final-context → assemble → validate → persist)
- `packages/cli/src/commands/ship/index.ts` (CLI command, Node-24 type-stripping; mirrors `build/index.ts`)
- `packages/cli/src/commands/ship/run-cli-witness.mjs` (W6/N8/N9/R2/R3 CLI witness)
- `.vibe/work/I-22-ship-skill-orchestration/**` (this report, witnesses, evidence)
- `packages/skills/package.json` — **single licensed additive export** `"./ship": "./src/ship/orchestrator/index.js"` (EXTEND-I-00A handoff; identical pattern to I-21's `./build` + `./ship/intake`).

No other paths touched. No git/package-manager/remote/deploy mutation. No stash/reset/clean/checkout/restore.

## Licensing note (manifest EXTEND-I-00A)

The binding brief §4 step 2 + §3 serialization note direct the implementer to add the single
additive `"./ship"` export as the licensed EXTEND-I-00A handoff. The HLO implementer prompt
authorizes faithful execution of the brief; the independent validation PASS confirmed this exact
edit; I-21 established the identical pattern on disk (`./build`, `./ship/intake`). Treated as
licensed. Recorded for the validator. (The committed baseline had no `exports` at all; I-21
added the block in the dirty tree, I-22 added the one `./ship` line.)

## Public-contract consumption (N10 clean — zero internal relative imports into non-owned packages)

- `@vibe-engineer/skills/ship/intake` — `intakeBuildResult` (the I-21 intake seam; self-reference import).
- `@vibe-engineer/artifacts` — `validateArtifactFile`, `validateArtifactKind` (Build Result in, Evidence Packets, Ship Packet out).
- `@vibe-engineer/verification` — `runVerificationPlan`, `VERIFICATION_STATUSES`, `VerificationRunnerError` (real final verify).
- `@vibe-engineer/context` — `checkContextDrift`, `validateContextProject`, `writeContextProject` (real final-context gate).
- CLI consumes `@vibe-engineer/skills/ship` (the new public export, proven by W6) + sibling `../../envelope/result-envelope.js`, `../../errors/{codes,sanitization}.js` exactly as `build` does.

## Witnesses run (real-boundary — NO fake/mock/synthetic green)

### Orchestrator witness — `node .vibe/work/I-22-ship-skill-orchestration/witness-ship-chain.mjs` → **20/20 PASS**
- **W1 intake→orchestrator (REAL):** real `intakeBuildResult` over a real passed Build Result produced by the real build skill (`runBuildFromImplementationPlan` over `packages/verification/fixtures/plans/approved-plan.json`); `buildResultRef.statusAtLinkTime=passed`.
- **W2 orchestrator→final-verify (REAL):** real `runVerificationPlan` over the Build Result's Verification Delta → 16 schema-valid Evidence Packets (`evidence_packet.schema.json`); green status.
- **W3 orchestrator→final-context (REAL):** real `writeContextProject` + `checkContextDrift` + `validateContextProject` over a real context graph; `drift.ok=true`, context_file_header validated.
- **W4 orchestrator→Ship-Packet (REAL):** Ship Packet validates against `ship-packet.schema.json` via real `@vibe-engineer/artifacts`; persisted carrier revalidates. (master §9 build/ship chain.)
- **W5 no-push/no-commit/no-PR seam (REAL):** `noPushWithoutApproval===true`, `commitPerformedByAgent===false`, `prOpenedByAgent===false`; `finalVerification[]` (16) + real `context_drift`-layer evidence ref.
- **W7 no-push/no-remote invariant (REAL static + dynamic):** brief §8 step 4 exact grep → 0 matches; dynamic `git rev-parse HEAD` + `git for-each-ref` snapshot equal before/after a ship run (no commit/push/tag).
- **Negatives fail closed:** N1 missing BR (`ship_intake_missing_build_result`), N2 non-passed (`ship_intake_build_result_not_passed`), N3 blocking-warning (structural schema guarantee), **N4 failed final verify blocks** (`ship_final_verify_blocks`, status=failed — load-bearing), **N5 unresolved drift blocks** (`ship_context_drift_blocks` via corrupted context fingerprint — load-bearing), N6 empty `finalVerification` rejected, N7/N7b `const` violations rejected, N10 no internal relative imports.
- **R1 idempotent rerun:** deterministic `artifactId` (`ship-1f89895960e608ff`) across reruns with fixed `now`.

### CLI dispatch witness — `node packages/cli/src/commands/ship/run-cli-witness.mjs` → **13/13 PASS**
- **W6 CLI dispatch (REAL):** `createCommandLoader([shipCommand])` dispatches `ship` → command imports the real orchestrator via `@vibe-engineer/skills/ship` → success envelope, exit 0, valid `validateCliResultEnvelope`, `ship_packet` artifact present, persisted carrier exists.
- **N1/N2/N4/N8/N8b/N9** via CLI all non-green with correct classification; **N4** = `deterministic_failure` (exit 1), no ship_packet artifact; **N9** missing runner/prerequisite → `deterministic_failure` classification, not a crash.
- **R2 sibling coexist:** `ship` + `build` + `verify` register together in the loader.
- **R3 secret redaction:** secret-like `--run-id` rejected + redacted from envelope (no leak).

### Brief §8 exact static commands
- W7 no-push: `rg -n "git push|git commit|gh pr create|git tag|pulumi|child_process.*git|fetch\(.+https?://" packages/skills/src/ship/orchestrator packages/cli/src/commands/ship` → **exit 1 (0 matches)**.
- N10 import-boundary: `rg -n "from ['\"]\.\./\.\./artifacts/src|verification/src|context/src" …` → **exit 1 (0 matches)**.

## Evidence artifacts

- Orchestrator witness summary: `.vibe/work/I-22-ship-skill-orchestration/evidence/witness-ship-chain-summary.json`
- CLI witness summary: `.vibe/work/I-22-ship-skill-orchestration/evidence/witness-cli-dispatch-summary.json`
- Sample green Ship Packet: `.vibe/work/I-22-ship-skill-orchestration/evidence/witness-ship-chain/ship-*.json`
- Sample green Build Result (seed): `.vibe/work/I-22-ship-skill-orchestration/evidence/witness-ship-chain/seed-build/build-*.json`

## F1 pending-live disclosure (binding)

I-22 wires **NO selected-harness live ship-step**. Deterministic truth-green (intake → final-verify
→ final-context → Ship Packet → CLI envelope, all real-boundary, all negatives fail-closed,
no-push invariant statically + dynamically proven) does **NOT** depend on live-pi. **No
selected-harness live seam is exercised by I-22** (the recommended path per brief §6 F1). I-22's
deterministic PASS is not blocked by I-14B.

## TS-02A sibling-pin (acknowledged)

I-22 emits `packages/cli/src/commands/ship/index.ts` per the accepted Node-24 type-stripping
precedent (`verify`/`build`/`create`/`import`). Strict-tsc-green closure of I-22's `.ts` surfaces
is deferred to the TS-02A sibling-pin lane; I-22 is not blocked by TS-02A.

## Deferred debts

None.

## Dirty-tree safety

`git status --porcelain` shows only: `packages/skills/src/ship/orchestrator/` (new),
`packages/cli/src/commands/ship/` (new), `.vibe/work/I-22-ship-skill-orchestration/` (new), and
`packages/skills/package.json` (the single additive `./ship` export line on a manifest I-21
already established in the dirty tree). No stash/reset/clean/checkout/restore used; no
commits/pushes/PR/tag; no package-manager install/add/update/remove; no remote/deploy mutation.

## VERDICT: DONE
