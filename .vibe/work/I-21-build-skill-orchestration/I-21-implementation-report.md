# I-21 — Build Skill Orchestration — Implementation Report (Triad-B IMPLEMENTER)

- **Lane**: `I-21-build-skill-orchestration` (build skill + `vibe-engineer build` CLI + ship intake).
- **Implementer**: Triad-B IMPLEMENTER (glm-5.2 via zai, thinking: high).
- **Working dir**: `/Users/lizavasilyeva/work/vibe-engineer` (product repo).
- **Brief**: `.pi/hlo/vibe-engineer/implementation-briefs/I-21-brief-generated.md` (PASS-validated).
- **VERDICT: DONE** — deterministic-green on all W1–W6 real-boundary witnesses + W7/F1 pending-live honestly disclosed; all negatives fail closed; dirty-tree safe.

## Owned WRITE paths (master §5 I-21 row)
- `packages/skills/src/build/**` ✓
- `packages/skills/src/ship/intake/**` ✓
- `packages/cli/src/commands/build/**` ✓
- `.vibe/work/I-21-build-skill-orchestration/**` ✓

## Files changed (exact)

**Created (owned source):**
- `packages/skills/src/build/index.js` — build skill barrel.
- `packages/skills/src/build/build-skill.js` — core orchestrator (`runBuildFromImplementationPlan`, `persistBuildResult`, `resolveBuildResultPath`).
- `packages/skills/src/build/implementation-hooks.js` — typed-state hooks via the REAL I-03 runtime (`createInitialRunState`/`transitionNode`/failure routing).
- `packages/skills/src/build/selected-harness.js` — real I-14A manifest read + honest I-14B pending-live disclosure (F1).
- `packages/skills/src/ship/intake/index.js` — ship intake (`intakeBuildResult`, `resolveShipIntakePath`).
- `packages/cli/src/commands/build/index.ts` — `vibe-engineer build` CLI command (Node-24 type-stripping, mirrors `verify/index.ts`).
- `packages/cli/src/commands/build/run-cli-witness.mjs` — W6 CLI dispatch witness runner.
- `.vibe/work/I-21-build-skill-orchestration/witness-build-chain.mjs` — W1–W5/N1–N4/R1 witness.
- `.vibe/work/I-21-build-skill-orchestration/evidence/witness-build-chain-summary.json`
- `.vibe/work/I-21-build-skill-orchestration/evidence/witness-cli-dispatch-summary.json`
- `.vibe/work/I-21-build-skill-orchestration/I-21-implementation-report.md` (this file).

**Modified (authorized Step-0 handoff — see §Step-0):**
- `packages/cli/package.json` — added `@vibe-engineer/skills: workspace:*` (EXTEND-I-02A).
- `packages/skills/package.json` — added `@vibe-engineer/{verification,context,orchestration,adapter-pi}` workspace:* deps + `exports` map (`./build`, `./ship/intake`) (EXTEND-I-00A / skeleton activation).
- `pnpm-lock.yaml` — reconciled; exactly 5 additive `link:` edges (1 cli→skills, 4 skills→{verification,context,orchestration,adapter-pi}); zero external packages; `pnpm install --frozen-lockfile` exit 0.

## Step-0 — manifest + lockfile reconciliation (authorized under autonomous policy)

The brief validation F1 flagged these serialized manifest handoffs as near-certain. On-disk
confirmed `@vibe-engineer/skills` absent from cli/package.json and
`verification/context/orchestration/adapter-pi` absent from skills/package.json. Per the
**OPERATOR-DIRECTIVE-AUTONOMOUS-EXECUTION** (ledger 2026-06-26: "HLO proceeds without
interruption for all recurring execution (validated lockfile/dep reconciliations…)") and the
I-15B-1 LOCKFILE-RECONCILE / EXTEND-I-02A precedent (ledger `EXTEND-I02A-STEP0-DONE`), the
recurring EXTEND class is self-executed by the HLO under its own authority. This is the 7th
instance of the recurring workspace-dep pattern.

Three-way-scoped lockfile delta (before/after importer-block snapshots in
`.vibe/work/I-21-build-skill-orchestration/evidence/step0/`):
- `packages/cli` importer block: +1 edge `@vibe-engineer/skills: link:../skills`
- `packages/skills` importer block: +4 edges (`adapter-pi`, `context`, `orchestration`, `verification`)
- No external packages; `pnpm install --frozen-lockfile` exit 0; node_modules links materialized and real-resolved from both package contexts.

## Witnesses run (commands + exit codes + outcome)

All witnesses are REAL-boundary: real I-06 plan fixture (approved-plan.json), real
`@vibe-engineer/artifacts` validator, real `@vibe-engineer/verification` runner (16 Evidence
Packets produced), real `@vibe-engineer/context` graph write, real I-03 orchestration
typed-state, real I-14A manifest, real ship intake. No mocks/synthetic green.

**Build-chain witness** — `node .vibe/work/I-21-build-skill-orchestration/witness-build-chain.mjs` → **exit 0**, 14/14 PASS:
- W1 plan→build (approved plan validated) ✓
- W2 build→verify→evidence (16 Evidence Packets, all schema-valid) ✓
- W3 build→context (real graph write, context_file_header valid) ✓
- W4 build→Build-Result (schema-valid `build_result`; status `passed`) ✓ + W4b persist+revalidate ✓
- W5 Build-Result→ship-intake (payload ready, 16 runs, statusAtLinkTime `passed`) ✓
- W7/F1 selected-harness (I-14A manifest read deterministic-green; I-14B live seam `pending-live/BLOCKED`) ✓
- N1 plan_not_approved ✓ · N1b plan-invalid-schema ✓ · N2 failed-verification-blocks (status `failed` → no Build Result, DL-10) ✓ · N4 malformed-Build-Result-intake-rejects ✓ · N4b non-passed-intake-rejects ✓ · N7 no internal relative imports into non-owned packages ✓ · R1 idempotent rerun ✓

**CLI dispatch witness** — `node packages/cli/src/commands/build/run-cli-witness.mjs` → **exit 0**, 9/9 PASS:
- W6 loader registers `build`; CLI declares `@vibe-engineer/skills: workspace:*`; green dispatch → status `success`, exit 0, valid envelope, `build_result` artifact descriptor ✓
- R3 secret-redaction (secret-like input rejected + redacted from envelope) ✓
- N2 CLI failed-verification → status `failure` exit 1, no build_result artifact ✓ · N1 CLI plan-not-approved → blocked exit 2 ✓ · N5 unknown flag → blocked ✓ · N5b missing required flag → blocked ✓ · R2 build coexists with verify sibling ✓

**Regression** — siblings unregressed:
- `node packages/cli/src/testing/run-witnesses.mjs` (I-02A foundation/loader/envelope) → exit 0.
- `node packages/verification/tests/run-witnesses.mjs` (I-09 runner) → exit 0.

## N6 / N3 notes (correct classification, not crash)
- N6: a runner exception is caught and surfaced as `verification_runner_exception` (classification InternalError) — not a generic crash. Runner missing-prerequisite classifications flow through `@vibe-engineer/verification`'s proven taxonomy (I-09-owned) and block the build deterministically.
- N3: missing Evidence Packet / Build Result is impossible on the green path (W2/W4 assert); the negative paths (N1/N1b/N2) produce no Build Result by construction.

## F1 — pending-live disclosure (binding)
I-21 closes **deterministic-green but `pending-live/BLOCKED` on the selected-harness
live-skill-execution seam** (I-14B). The build skill reads + validates the real I-14A
generated-file manifest and capability matrix (deterministic portion green) and records the
live-pi execution seam as `pending-live/BLOCKED` with prerequisite "operator live-pi
environment". This is disclosed honestly in the Build Result `advisoryFindings`, the CLI
envelope diagnostic, and this report — it is NOT faked/mocked. This blocks
I-23/FINAL-BUGHUNT live build/ship proof and any claim that selected-pi build-time live skill
execution is truth-green; it does NOT block I-21's deterministic PASS, I-22's deterministic
ship work, or file-disjoint lanes.

## TS-02A sibling-pin (acknowledged)
I-21 emits `packages/cli/src/commands/build/index.ts` per the accepted Node-24 type-stripping
precedent (verify/create/import). `node --check` on the `.ts` relies on that precedent; strict
tsc-green closure is deferred to the TS-02A lane, which serializes AFTER I-21 on
`cli/src/commands/build/**`. TS-02A will sweep this surface.

## Dirty-tree scope confirmation
`git status --porcelain` shows ONLY:
- new files under `packages/skills/src/build/**`, `packages/skills/src/ship/intake/**`, `packages/cli/src/commands/build/**`, `.vibe/work/I-21-build-skill-orchestration/**` (all owned);
- the three authorized Step-0 edits (`packages/cli/package.json`, `packages/skills/package.json`, `pnpm-lock.yaml`).
No git stash/reset/clean/checkout/restore; no commits/push/PR; no package-manager add/update/remove (only the scoped `pnpm install --no-frozen-lockfile` reconciliation, then `--frozen-lockfile` verified exit 0). The pre-existing `M packages/cli/src/commands/security/run-cli-witnesses.mjs` is baseline dirty-tree churn from the I-18B lane — NOT touched by I-21.

## Deferred debts
None within I-21's deterministic scope. The I-14B live-skill seam is `pending-live/BLOCKED` (F1) — closed by an operator live-pi environment in a later lane, not by I-21.
