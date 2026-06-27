# REVALIDATION ARTIFACT — I-21 build-skill-orchestration (Triad-B adversarial)

- **Revalidator:** independent adversarial REVALIDATOR (glm-5.2 via zai, thinking: xhigh).
- **Mode:** read-only on both repos (no product edits, no git mutations, no package-manager mutations). WRITE only this artifact + own evidence tree (`revalidation-evidence/**`). One read-only `pnpm install --frozen-lockfile` consistency check (locked-frozen, no-op, did not mutate the lockfile).
- **Quality bar:** `prompts/quality-bar.md` prepended verbatim, binding. Implementer `DONE` ≠ validator `PASS`. Shape-green ≠ truth-green.
- **Target under revalidation:** impl report `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-21-build-skill-orchestration/I-21-implementation-report.md` (claims DONE: 23/23 real-boundary witnesses PASS; failed-verification-blocks enforced; self-executed EXTEND-I-02A/I-00A manifest+lockfile handoff; selected-harness live-skill seam honestly pending-live/BLOCKED F1).
- **Precedent (mirrored rigor):** EXTEND-I-02A Step-0 finisher report + revalidation artifact (PASS) — the self-executed manifest handoff must mirror this standard.
- **Provenance:** node v24.16.0, pnpm 10.33.0, lockfileVersion 9.0. Date 2026-06-27.

## Verdict

**`PASS`** — I-21 is **truth-green on its deterministic functional contract**. All 7 task-mandated verification dimensions reproduce with real-boundary evidence (witnesses re-run by THIS revalidator, exit 0): the 23/23 matrix, the decisive failed-verification-blocks invariant (independently probed), the scoped+correct self-executed manifest+lockfile handoff (5 additive `link:` edges, decomposed three-way), the genuinely pending-live (NOT faked) selected-harness seam, the Build-Result happy path, and zero sibling breakage. **I-21 truth-green → UNBLOCKS I-22** (I-22 consumes the tracked, functional ship-intake carrier seam; the findings below do NOT touch that seam).

Caveat (recorded, does not gate I-22): **one major-local finding (F1)** — 2 of I-21's 4 owned source subtrees (`packages/skills/src/build/**`, `packages/cli/src/commands/build/**`) are matched by the pre-existing `.gitignore:7 build/` rule and are therefore **UNTRACKED by git** (won't persist on `git add`/commit), and the implementer's report makes a **factually false** dirty-tree-scope claim about them. This is a durability + report-accuracy defect requiring a follow-up fix, NOT a functional false-green and NOT an out-of-license edit. It does not block I-22 (ship intake is tracked + functional) and does not invalidate I-21's deterministic PASS.

## Stage log
- [x] 0. Artifact scaffolded (checkpointing).
- [x] 1. Read ground-truth reading list (impl report, brief, brief-validation, EXTEND-I-02A Step-0 finisher + revalidation precedent).
- [x] 2. Re-ran 23-witness matrix independently (build-chain 14/14 + CLI 9/9, exit 0).
- [x] 3. Verified failed-verification-blocks enforced (independent adversarial probe; decisive invariant).
- [x] 4. Verified self-executed manifest+lockfile handoff scoped + correct (three-way decomposition; symlink-timestamp corroboration).
- [x] 5. Verified selected-harness live-skill seam genuinely pending-live (NOT faked).
- [x] 6. Verified Build-Result happy path (real carrier consumed by ship intake).
- [x] 7. Verified no sibling break (I-02A + I-09 runners exit 0; build coexists with verify).
- [x] 8. Verified dirty-tree / scope (clean except the gitignore finding F1).
- [x] 9. Severity gate + verdict + next action.

Evidence tree: `revalidation-evidence/` (`independent-probe.mjs` + `probe-summary.json` + `probe-run/**`, plus console-captured witnesses reproduced verbatim below).

## Findings (every claim independently reproduced by THIS revalidator)

### Dimension (a) — 23-witness matrix reproduces real-boundary — CONFIRMED (clean)
Re-ran BOTH witnesses myself (not on the implementer's word):
- `node .vibe/work/I-21-build-skill-orchestration/witness-build-chain.mjs` → **exit 0, 14/14 PASS** (W1 plan→build, W2 build→verify→evidence [16 packets all schema-valid], W3 build→context [real graph write, header valid], W4 build→Build-Result [schema-valid], W4b persist+revalidate, W5 Build-Result→ship-intake [readyForShip, 16 runs], W7/F1 selected-harness pending-live, N1 plan-not-approved, N1b plan-invalid-schema, N2 failed-verification-blocks, N4 malformed-Build-Result-rejects, N4b non-passed-rejects, N7 no-internal-relative-imports, R1 idempotent-rerun).
- `node packages/cli/src/commands/build/run-cli-witness.mjs` → **exit 0, 9/9 PASS** (W6 loader registers build, W6 cli declares `@vibe-engineer/skills: workspace:*`, W6 green dispatch [status=success exit=0 valid envelope + build_result artifact], R3 secret-redaction, N2 cli failed-verification [status=failure exit=1 no build_result], N1 cli plan-not-approved [exit 2], N5 unknown-flag [exit 2], N5b missing-required [exit 2], R2 build coexists with verify).
- **Total = 23/23 PASS**, matching the report's claim exactly. Each witness is REAL-boundary (real I-06 approved-plan fixture, real `@vibe-engineer/artifacts` validator, real `@vibe-engineer/verification` runner producing 16 Evidence Packets, real `@vibe-engineer/context` graph write, real I-03 typed run-state, real I-14A manifest, real ship intake). No mocks/synthetic green.
- Count note: the brief's N3/N6 are addressed by construction/notes (N3 impossible on green path — W2/W4 assert presence; N6 = `verification_runner_exception` classified `InternalError`, not a crash) rather than dedicated witnesses — acceptable.

### Dimension (b) — failed-verification-blocks enforced (decisive invariant) — CONFIRMED (clean; load-bearing contract holds)
My OWN adversarial probe (`revalidation-evidence/independent-probe.mjs`, Probe A), not the implementer's N2:
- Fed `runBuildFromImplementationPlan` an approved plan + a catalog whose **blocking** schema-validation layer targets a non-plan JSON → result `{ok:false, reason:'verification_failed_blocks_build', verificationStatus:'failed', value:undefined}`. **No Build Result produced; status `failed` not `passed`.** ✓
- EXTRA adversarial data point: a single-layer catalog (skipping the advisory-review layer) → verification status `blocked` → build blocks (the "required-category-skipped" branch of N2). Correct fail-closed behavior. ✓
- Probe B: ship intake rejects a failed-status Build Result (`build_result_not_passed`). ✓
- Probe C: the green carrier's `status=passed` is honest + schema-valid. ✓
- Probe E: unapproved plan → `plan_not_approved` block. ✓
- The build skill routes non-green verification through the REAL I-03 typed state (`routeVerificationOutcome` → transitionNode failed/blocked) AND returns `blocked('verification_failed_blocks_build', …)` before assembling any Build Result. The invariant is structurally enforced, not heuristic.

### Dimension (c) — self-executed EXTEND-I-02A/I-00A manifest+lockfile handoff SCOPED + correct — CONFIRMED (clean; matches the precedent standard)
Three-way decomposition (committed HEAD vs current dirty tree), corroborated by symlink timestamps + import graphs + the implementer's own BEFORE snapshots:

| surface | HEAD (committed) | NOW (dirty) | delta | attribution |
| --- | --- | --- | --- | --- |
| `packages/cli/package.json` deps | artifacts, config, security, verification | +adapter-pi, +context, +skills | +3 lines | **skills ← I-21**; adapter-pi+context ← I-15A Step-0 (pre-existing) |
| `packages/skills/package.json` deps | artifacts | +adapter-pi, +context, +orchestration, +verification + exports map (`./build`, `./ship/intake`) | +4 deps + exports | **all 4 ← I-21** |
| `pnpm-lock.yaml` | 4550 lines (HEAD) / 4550 (impl BEFORE snapshot) | 4565 lines | **+15 lines = 5 edges × 3 lines** | **5 additive `link:` edges, all I-21** |

- **I-21-attributable lockfile delta = exactly 5 additive `link:` edges** (1 cli→skills + 4 skills→{verification,context,orchestration,adapter-pi}); zero external packages; zero removals; zero version re-resolution; **single-version invariant holds** (no `@vibe-engineer/{skills,verification,context,orchestration,adapter-pi}@<version>` snapshots — all resolve as `link:`). This EXACTLY matches the implementer's "5 additive link: edges" claim and mirrors the EXTEND-I-02A precedent (2 edges/6 lines there; 5 edges/15 lines here — same atomic mechanism, lower-or-equal rigor).
- **Attribution independently corroborated (not on the implementer's word):**
  1. Import graph: the CLI **build command** imports only `@vibe-engineer/skills/build` + `@vibe-engineer/artifacts` (so cli needs only `skills` for I-21); the build **skill source** imports adapter-pi/context/orchestration/verification (declared in skills/package.json). I-15A's `create`/`import` commands import adapter-pi/context directly (justifying cli's pre-existing adapter-pi/context edges).
  2. Symlink timestamps: cli's `adapter-pi`/`context` created **03:21** (I-15A Step-0 window); cli's `skills` + all 4 skills-package deps created **06:14** (I-21 window). Independent filesystem corroboration of the split.
  3. Implementer BEFORE snapshots (`evidence/step0/before-cli-deps.txt` = skills ABSENT; `before-skills-deps.txt` = the 4 deps ABSENT; `before-lockfile-lines.txt` = 4550) are honest and consistent with the +15-line delta.
- **Each dep resolves REAL (not a hoist):** declared-dep symlinks under `shamefully-hoist=false` + `link-workspace-packages=true` (.npmrc untouched by I-21); real-load probes — from CLI command context `@vibe-engineer/skills/build` + `@vibe-engineer/skills/ship/intake` load real (exports map works, expected functions present); from skills build context all 4 new deps load real.
- **`pnpm install --frozen-lockfile` → exit 0** ("Lockfile is up to date… Already up to date. Scope: all 20 workspace projects"). Lockfile↔manifest integrity holds; no mutation.
- Note (F2): the report attributes only `skills` to the cli manifest edit, which is correct for I-21, but does not explicitly decompose the 3-line cumulative cli manifest diff (adapter-pi/context being I-15A's). Verified independently correct — minor transparency gap only.

### Dimension (d) — selected-harness live-skill seam GENUINELY pending-live (NOT faked) — CONFIRMED (clean)
- The deterministic portion RAN FOR REAL: `runSelectedHarnessPath()` returns `summary.deterministicPath:"manifest-read-and-validated"`, `familyCount:6`, `manifestSelectable:true`, reading the REAL I-14A `@vibe-engineer/adapter-pi/generated-file-manifest` (manifestProducedByLane `I-14A-pi-adapter-capability-generated-file-manifest`).
- The live-skill-execution seam is HONESTLY `pending-live/BLOCKED`: `pendingLive.status:"pending-live/BLOCKED"`, `classification:"pending-live"`, a concrete 156-char `prerequisite` ("operator live-pi environment (a real pi runtime/adapter…); none is present…"), with correct `blocks` (I-23/FINAL-BUGHUNT live build/ship proof; selected-pi truth-green claims) and `doesNotBlock` (I-21 deterministic PASS, I-22 deterministic ship).
- **NO faked execution:** direct inspection of the harness object found **no** status/result/state field claiming a skill `ran|executed|completed|succeeded|passed`. A repo-wide grep for `mock|fake|stub|simulat|pretend|synthetic` across all I-21 source matched ONLY the honest disclosure comment ("does NOT fake/mock the live-pi seam"). The Build Result's `advisoryFindings` carries the genuine pending-live advisory; the CLI envelope emits an `UnsupportedOperation` warning diagnostic. Faking = critical; **here it is honestly pending-live.** ✓

### Dimension (e) — Build Result produced on success (happy path) — CONFIRMED (clean)
- Green plan + passing verification → real Build Result (`build-c108728f95ea4ca8.json`): `status:"passed"`, `artifactKind:"build_result"`, schema-valid (re-validated by `@vibe-engineer/artifacts`), 16 `verificationRuns` (1 blocking schema-validation pass + 1 advisory-review pass + 14 skipped non-blocking), real F1 advisory, real context-graph update, real implementation-plan link. Persisted carrier re-validates. Consumed by `intakeBuildResult` → `payload.readyForShip:true`, `verificationRunCount:16`, `statusAtLinkTime:"passed"`. ✓

### Dimension (f) — no sibling break (blast-radius) — CONFIRMED (clean)
- `node packages/cli/src/testing/run-witnesses.mjs` (I-02A foundation/loader/envelope) → **exit 0**.
- `node packages/verification/tests/run-witnesses.mjs` (I-09 runner) → **exit 0** (`ok:true`).
- CLI witness R2: `build` coexists with `verify` in the loader. The manifest+lockfile handoff did not break sibling resolution; frozen-lockfile integrity holds across all 20 projects.

### Dimension (g) — dirty-tree / scope — PARTIALLY clean (F1 below); no out-of-license edits
- No out-of-license edits attributable to I-21: root `package.json` (only pre-existing `mechanical-gates` churn), `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `.git**` — all untouched by I-21 (verified via path-scoped diffs). The `packages/cli/src/commands/security/*` + `packages/mechanical-gates/*` + `packages/presets/*` dirty entries are pre-existing sibling-lane (I-18B/I-12/I-13/I-15B) baseline churn, disjoint from I-21's surface. No git stash/reset/clean/checkout/restore; no commits/push/PR; the only package-manager op was the scoped `pnpm install` reconcile + the read-only frozen check.
- **F1 (major-local — see below):** the implementer's `git status --porcelain`-based scope claim is **false** for 2 of the 4 owned source subtrees (they are gitignored), and those source files are untracked → durability defect.

## Findings — defect list

### F1 — (major-local) 2 of 4 owned source subtrees are GITIGNORED → untracked durability defect + false dirty-tree-scope claim in the report
- **Evidence:** `git check-ignore -v` returns `.gitignore:7:build/` for both `packages/cli/src/commands/build/index.ts` and `packages/skills/src/build/index.js`. The `.gitignore` `build/` rule is **pre-existing at HEAD** (line 7, intended for build outputs) and over-broadly matches any `build/` directory. Consequently these source dirs do NOT appear in `git status --porcelain` (only `packages/skills/src/ship/intake/` and `.vibe/work/I-21-build-skill-orchestration/` appear as untracked; the two `build/` subtrees are invisible).
- **Durability consequence:** the I-21 **build skill source** (`packages/skills/src/build/**`) and the **`vibe-engineer build` CLI command** (`packages/cli/src/commands/build/index.ts`) are UNTRACKED by git → a normal `git add`/commit would **silently drop** them. The lane's primary deliverable would not persist. On-disk the code exists and runs (witnesses pass), so this is a persistence/durability defect, not a functional one.
- **Report-accuracy defect:** the implementer wrote "`git status --porcelain` shows ONLY: new files under `packages/skills/src/build/**`, …, `packages/cli/src/commands/build/**`" — this is **factually false** for those two paths. The implementer either did not actually run porcelain-scoped verification or did not notice the source was invisible to git; per the quality bar ("no silent fallbacks") this should have been flagged, not asserted falsely.
- **Why major-local (not critical):** it is NOT an out-of-license edit, NOT a faked live-pi seam, NOT a failed-verification-not-blocking defect, NOT schema permissiveness, NOT a hidden push/PR. The deterministic functional contract is truth-green on-disk. It does NOT touch the I-21→I-22 carrier seam (ship intake is tracked + functional), so it does NOT block I-22.
- **Fix:** add `.gitignore` negation rules (`!packages/skills/src/build/` and `!packages/cli/src/commands/build/`) OR establish an explicit force-add policy — **but `.gitignore` is a root/serialized surface not owned by I-21 → STOP BLOCKED for the serialized handoff** (do NOT edit it unlicensed). Recommend the operator adjudicate this as a recurring EXTEND-`.gitignore`-style handoff.

### F2 — (minor-local) cli manifest diff not decomposed in the report
- The report attributes only `skills` to the cli manifest edit (correct for I-21), but does not explicitly note that the cumulative 3-line cli manifest diff includes adapter-pi/context as pre-existing I-15A Step-0 churn. Attribution verified independently correct (symlink timestamps + import graphs + BEFORE snapshots). Transparency nit only.

### F3 — (minor-local) brief N3/N6 covered by construction/notes, not dedicated witnesses
- N3 (missing Evidence Packet/Build Result) is structurally impossible on the green path (W2/W4 assert presence); N6 (missing-runner classification) is covered by the `verification_runner_exception → InternalError` path. Acceptable; recorded for completeness.

## Severity gate assessment

**I-21 is truth-green on its deterministic functional contract.** Every load-bearing seam is REAL (not shape-green):
- (a) 23/23 witnesses reproduce real-boundary (re-run by this revalidator, exit 0). ✓
- (b) failed-verification-blocks enforced — independent adversarial probe confirms a failing blocking layer yields NO Build Result (status `failed`); skipped-required-category → `blocked`. ✓
- (c) self-executed manifest+lockfile handoff scoped + correct — 5 additive `link:` edges (three-way-decomposed; symlink/import/BEFORE corroboration; zero unrelated churn; zero version snapshots); all deps resolve REAL; frozen-lockfile exit 0; matches the EXTEND-I-02A precedent standard. ✓
- (d) selected-harness live-skill seam genuinely `pending-live/BLOCKED` (NOT faked) — deterministic manifest-read ran real; no execution-claim field anywhere; no mock/stub/synthetic. ✓
- (e) Build Result happy path — real schema-valid carrier consumed by ship intake. ✓
- (f) no sibling break — I-02A + I-09 runners exit 0; build coexists with verify. ✓
- (g) dirty-tree — no out-of-license edits; **except** the gitignore durability defect (F1) which is a persistence/reporting issue, not a dirty-tree-safety violation (no unsafe git op, no non-owned edit).

**Blocking analysis:** none of the task's halt conditions trigger (no witness failure, no failed-verification-not-blocking, no manifest over-reach, no faked live-skill). The major-local F1 does NOT block I-22 (I-22 consumes the tracked, green ship-intake carrier seam, not the gitignored build-skill source) and does NOT invalidate I-21's deterministic PASS.

**I-21 truth-green → UNBLOCKS I-22** for deterministic ship work. F1 (gitignore) must be fixed in a follow-up before I-21's build-skill + CLI-command source is committed/persisted, but that is parallel to / non-gating for I-22's deterministic consumption of the ship intake.

## Exact next action

1. **I-21 REVALIDATION = PASS** (truth-green; unblocks I-22). MARK I-21 deterministic-green.
2. **Launch I-22** (ship orchestrator) — it consumes the tracked, functional `packages/skills/src/ship/intake/**` + the schema-valid Build Result carrier; F1 does not gate it.
3. **Open a follow-up fix for F1 (major-local):** adjudicate the `.gitignore` `build/` rule vs I-21's owned source location as a serialized EXTEND-`.gitignore`-style handoff (add negation rules `!packages/skills/src/build/` + `!packages/cli/src/commands/build/`, or a force-add policy). Do NOT edit `.gitignore` unlicensed. This must land before I-21 source is committed.
4. **Optional:** the report should correct the false porcelain claim and add the I-15A attribution note (F2).

## Files touched (this agent — owned WRITE only)
- `.vibe/work/I-21-build-skill-orchestration/I-21-revalidation-artifact.md` (this file).
- `.vibe/work/I-21-build-skill-orchestration/revalidation-evidence/{independent-probe.mjs, probe-summary.json, probe-run/**}`.

No product edits, no git mutations, no package-manager mutations (the single `pnpm install --frozen-lockfile` was a read-only consistency check — locked-frozen, no-op). Read-only witnesses only (`node` witness runners + import probes; `git status`/`diff`/`show`/`check-ignore`/`ls-files`; `pnpm install --frozen-lockfile`). No edits to the impl report, prior evidence trees, any brief/prompt/ledger/status/handoff, or any product file. `.git**` untouched.

*Independent adversarial revalidation — read-only on both repos; only this artifact + `revalidation-evidence/**` written.*
