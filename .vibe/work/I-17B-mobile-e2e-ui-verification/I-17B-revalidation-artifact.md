# I-17B Revalidation Artifact (independent adversarial)

- **Target (impl report, unverified until confirmed):** `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-17B-mobile-e2e-ui-verification/I-17B-implementation-report.md`
- **Binding brief:** `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-17B-brief-generated.md`
- **Revalidator:** glm-5.2 via zai (thinking: xhigh), Triad-B independent adversarial.
- **Quality bar:** `prompts/quality-bar.md` (binding; shape-green ≠ truth-green; implementer DONE ≠ validator PASS).
- **Verdict:** **PASS** (truth-green within I-17B deterministic scope; live device seam honestly `pending-live/BLOCKED`, not faked).
- **Revalidator evidence tree:** `.vibe/work/I-17B-mobile-e2e-ui-verification/revalidation-evidence/**`

## What I independently ran (not the implementer's claims)

1. Re-ran BOTH witnesses from the product repo root myself:
   - `node --experimental-strip-types …/golden-mobile/run-mobile-witness.mjs` → **exit 0, 13/13 PASS**.
   - `node --experimental-strip-types …/e2e-ui/mobile/run-ui-witness.mjs` → **exit 0, 14/14 PASS**.
   - **Total 27/27 deterministic checks green** (matches impl claim; independently reproduced).
2. Wrote + ran an **independent adversarial probe** (`revalidation-evidence/adversarial-probe.ts`) that imports the REAL validators from the fixtures and feeds them the REAL generated artifacts, then applies REAL mutations — proving every gate is load-bearing on real data, not just the implementer's synthetic `negativeWitness()` factory. **Result: 11/11 (2 controls PASS unmutated; 9 real mutations fail-closed with the correct rule).** Saved to `revalidation-evidence/adversarial-probe-result.json`.
3. Independently inspected git state, lockfile attribution, fixture manifests, all validators, witnesses, runners, Maestro YAML, Detox spec, metadata JSON, capture-matrix, checks, baseline governance, consumption seam, and the LOCKED DL-12/DL-13 decision docs.

## Numbered findings (severity + exact evidence)

1. **[clean] 27-check matrix reproduced real-boundary (item 1).** Both runners exit 0 with real evidence: golden-mobile 13/13 (W-MAESTRO-STRUCT, W-DETOX-STRUCT, W-SEL-METADATA, W-NO-FORK, W-NEG-FAKE-LIVE + 5 negatives + W-REG-DOMAIN-NEUTRAL + W-REG-LOCKED + W-INVARIANTS); e2e-ui/mobile 14/14 (W-UI-MATRIX, W-UI-CHECKS-CLASSIFIED, W-BASELINE-GOV, W-NEG-MISSING-ARTIFACT, W-NEG-ADVISORY-HARD-BLOCK, W-NEG-FAKE-LIVE + 5 negatives + W-REG-DOMAIN-NEUTRAL + W-REG-LOCKED + W-INVARIANTS). Env probe honestly reports all 5 device/binary prereqs absent.

2. **[clean] DL-12 selection/conflict validator faithful + real (item 2).** `golden-mobile/src/validate/selection-metadata.ts` implements the DL-12 selection algorithm + conflict policy with substantive typed logic (not a stub): Rule 1 Detox-trigger-present⇒not-maestro-only (W-NEG-SEL-CONFLICT); Rule 2 high-risk-Detox-only⇒requires equivalent black-box proof; Rule 3 both-mode split coverage; policy witnesses W-NEG-MAESTRO-ONLY-POLICY / W-NEG-DETOX-ONLY-POLICY; W-NEG-FAKE-LIVE (rejects `proven_by` when `allowLiveProofProven:false`). Faithful to DL-12 details §5 (conflicts fail), §8 (pending-live not green), and the both-mode split rule. Selection metadata JSON (gr-01..gr-04) carries all 14 DL-12 fields + declarative triggers; gr-03 demonstrates `runner:both` split coverage (black_box_user_flow + synchronization_control).

3. **[clean] DL-13 capture-matrix/baseline-governance/missing-artifact validator real (item 3).** `e2e-ui/mobile/src/validate/ui-capture.ts` is substantial typed logic (not a stub): matrix completeness (≥1 iOS sim + ≥1 Android emu × {default,loading,empty,error,long_content} + ≥1 interaction state); every row declares all 5 required artifact kinds (screenshot/baseline_ref/a11y_tree/geometry/visual_diff) with `closure_basis:ui_verification`; deterministic/advisory classification with advisory-never-sole-hard-block; normalization `must_not_mask_semantic_change:true`; baseline-governance identity fields + `forbidden_auto_accept` + `initial_creation_is_not_automatic_pass`. Capture matrix = 2 device profiles × 6 states = 12 rows, all `capture_status:pending-live/BLOCKED`, `evidence_refs:null`. Negative gates W-NEG-MISSING-ARTIFACT / W-NEG-SILENT-BASELINE / W-NEG-E2E-AS-UI / W-NEG-ADVISORY-HARD-BLOCK / W-NEG-FAKE-LIVE all real.

4. **[clean] Live device seam GENUINELY pending-live — NOT faked (item 4).** Evidence:
   - The runners' only `spawnSync` calls are read-only env probes (`command -v <binary>`, `xcrun simctl list devices booted`) + the witness/negative CLIs + `git status`. **No spawn of `maestro`/`detox`/`xcrun`/`emulator` to actually RUN a flow** (grep across both fixtures → 0 device-run invocations).
   - **Zero committed PNG/JPG/MP4/screenshot/video** in either fixture (no synthesized capture).
   - The single `capture_status:"captured-green"` occurrence is inside `ui-capture.ts`'s `uiNegativeWitness("fake-live")` factory — it is the **anti-fake-live test fixture**, asserting the validator REJECTS it, not a live-green claim.
   - `liveDeviceRunPendingLive` is computed from the REAL env probe (`livePrereqsAbsent && noFakeLiveClaim`) — it would be `false` (failing) if any prereq were present or any scenario claimed `proven_by`. My adversarial fake-live mutations fail-closed on both validators.
   - The RN consumption seam (`golden-records.rn-consumption.ts`) drives the REAL `@ts-rest/core`+`zod` runtime via the I-16B mobile transport against the REAL I-16A provider and returned `accepted:true, goldenRecordId:"gr_abc123"` — a real-boundary seam that throws if not accepted; it does NOT launch a device (correctly deferred to pending-live).

5. **[clean] File-disjoint from I-17A (item 5).** I-17A sibling surfaces `golden-web/` + `e2e-ui/web/` exist as parallel (untracked `??`) baseline. **Zero tracked (non-`??`) changes touch `golden-web/**` or `e2e-ui/web/**`** (`git status --porcelain` → grep for tracked changes to those paths = none). I-17B's only references to those paths are the W-INVARIANTS file-disjointness guard comments/filters (the disjointness assertions themselves), never an edit. I-17B's owned delta = only `golden-mobile/**` + `e2e-ui/mobile/**` + `.vibe/work/I-17B-…/`. The `e2e-ui/` shared parent holds I-17A `web/` and I-17B `mobile/` as file-disjoint siblings.

6. **[clean] No I-17B-attributable lockfile edit (item 6).** `pnpm-lock.yaml` contains **0** references to `golden-mobile`/`e2e-ui/mobile` (grep -c = 0) — neither fixture is a pnpm workspace member (`pnpm-workspace.yaml` = `packages/*`, `packages/presets/*`, `packages/adapters/*`, `infra/pulumi`). **No `maestro`/`detox`/`react-native`/`@wix` anywhere in the lockfile or tracked manifests** (grep = none). The lockfile/manifest changes that DO exist are web(Playwright)+infra tooling attributable to OTHER active lanes, not I-17B: `@axe-core/playwright` + `pixelmatch` + `react`/`react-dom`/`vite` (I-17A web e2e-ui — Playwright-based), `@vibe-engineer/mechanical-gates` workspace dep + `quality`/`deploy` turbo tasks + `infra/pulumi` workspace entry (I-00A/I-12 quality + DL-18P pulumi). I-17B declares maestro/detox/RN (golden-mobile) and pixelmatch/axe-core (e2e-ui/mobile) strictly as **optional peerDependencies in graph-neutral fixture manifests** — no install, no graph edge.

7. **[clean] Negatives non-vacuous fail-closed (item 7).** My independent adversarial probe (real validators on real data, **not** the implementer's factory) — 11/11:
   - Controls: real 4-scenario DL-12 metadata PASSES (ok,0 errors); real matrix+checks+baselines PASSES (ok,0 errors) → proves the validator is not trivially-rejecting.
   - DL-12 real mutations all fail-closed with correct rule: GR-04 runner detox→maestro → W-NEG-SEL-CONFLICT; blanked rationale → W-NEG-MISSING-METADATA; `live_proof_status:proven_by…` → W-NEG-FAKE-LIVE; all-maestro collection → W-NEG-MAESTRO-ONLY-POLICY.
   - DL-13 real mutations all fail-closed: row missing `visual_diff` → W-NEG-MISSING-ARTIFACT; governance `auto_accept_allowed:true` → W-NEG-SILENT-BASELINE; `closure_basis:e2e_pass` → W-NEG-E2E-AS-UI; row `capture_status:captured-green` → W-NEG-FAKE-LIVE; advisory+hard_block check → W-NEG-ADVISORY-HARD-BLOCK.

8. **[clean] Dirty-tree scope clean (item g).** All edits confined to the 3 owned WRITE prefixes. Serialized surfaces (root manifest/lockfile/workspace/turbo/tsconfig, `.github/**`, `packages/**`) untouched by I-17B (their dirty changes are sibling-lane baseline). I-16A/I-16B/I-15B predecessors read-only (zero tracked modifications to `golden-client/`, `golden-flow/`, `golden-contracts/`, `golden-api/`, `.source-template/`). The impl report's note about a transient out-of-license `examples/.vibe/` write (wrong REPO_ROOT depth) that was caught, fixed, and re-run green is consistent with the on-disk reality (no such stray evidence dir remains under the fixtures; evidence is correctly at the 5-level work root).

9. **[minor-local, non-blocking] Witness self-scope caveat.** The runners' W-INVARIANTS dirty-tree check treats untracked (`??`) sibling dirs as baseline and flags only TRACKED changes to I-17A/predecessor paths — a reasonable dirty-tree heuristic, but it cannot by itself prove I-17B didn't ADD a file inside an already-untracked sibling dir. This is NOT a defect: my independent checks (finding 5: zero tracked changes to web/predecessor paths; zero cross-references into `e2e-ui/web`/`golden-web`; the `golden-mobile`+`e2e-ui/mobile` trees are self-contained with no web references) establish file-disjointness directly. Recorded for completeness only.

10. **[minor-local, non-blocking] Spec-syntax check is shape-green by design.** The Detox/Maestro structural validators confirm spec/flow SYNTAX shape (regex) + DL-12 category + testID anchoring to the real consumption seam — they cannot EXECUTE Detox/Maestro (no binaries). This is correctly and honestly deferred to `pending-live/BLOCKED`; the metadata + no-fork seam are real-boundary. Not a gate weakening.

## Explicit statements (a–g)

- **(a) 27 checks reproduce real-boundary:** YES. Both witnesses re-run by me, exit 0, 27/27 green; env probe honest; consumption seam drove the REAL provider (`accepted:true`).
- **(b) DL-12/DL-13 validators real (not stubs):** YES. Substantial typed logic; independently proven load-bearing on REAL data via the adversarial probe.
- **(c) live device seam genuinely pending-live, not faked:** YES. No device-run spawn, no committed capture artifacts, anti-fake-live test present, `pending-live` computed from real env probe, fake-live mutations fail-closed.
- **(d) file-disjoint from I-17A:** YES. Zero tracked changes to `golden-web/**`/`e2e-ui/web/**`; self-contained mobile trees; only disjointness-guard references.
- **(e) no I-17B-attributable lockfile edit:** YES. 0 fixture importers in lockfile; no maestro/detox/RN/@wix; graph-neutral peer-only manifests; manifest/lockfile dirty changes are web/infra sibling-lane baseline.
- **(f) negatives non-vacuous:** YES. Independent adversarial probe on REAL data: 2 controls pass unmutated, 9 real mutations fail-closed with correct rule.
- **(g) dirty-tree scope clean:** YES. Only 3 owned WRITE prefixes; serialized surfaces + predecessors untouched.

## Severity gate assessment

- **critical:** none. No out-of-license edit; no fake live proof; no Maestro-only/Detox-only policy; no E2E-as-UI; no silent baseline; no forked client/contract/DTO; no domain-neutrality violation; no I-17B graph edge/install/lockfile edit.
- **major-local:** none. All negative gates fail-closed (independently verified on real data); DL-12 metadata complete + conflict-free; both-mode split present; DL-13 matrix complete (2 devices × 6 states); baseline-governance identity present; validators non-bypassable.
- **minor-local:** findings 9 & 10 (witness self-scope dirty-tree heuristic; spec-syntax shape-green pending-live) — recorded, non-blocking, do not weaken any gate.
- **pending-live/BLOCKED (env-gated, not a debt):** live device-driven Maestro/Detox mobile-E2E run + live mobile UI-verification capture. Blocks **I-23/final-closure LIVE proof**, NOT I-17B deterministic PASS.

**I-17B is truth-green for its deterministic scope.** Combined with I-17A (web) + I-19 (observability), I-17B satisfies the deterministic prerequisites downstream of `I-16B + I-17A + I-17B + DL-23 + DL-11 → I-19` and toward `… + I-17A + I-17B + … → I-23`. **I-23's LIVE mobile proof remains pending-live** until an environment provides iOS Simulator runtime + Android emulator + Maestro CLI + Detox CLI + RN build + Metro bundle.

## Exact next action

No fix required from the I-17B implementer. Hand I-17B forward as **PASS (deterministic truth-green; live device seam honestly pending-live/BLOCKED)**. Track the pending-live prerequisites (simulator/emulator + Maestro + Detox + RN build) on the I-23 live-closure lane; do NOT mark I-23 mobile live proof green until those run real.

## Revalidator-run commands (exact, exit codes)
```
node --experimental-strip-types …/golden-mobile/run-mobile-witness.mjs            # exit 0 (13/13)
node --experimental-strip-types …/e2e-ui/mobile/run-ui-witness.mjs                # exit 0 (14/14)
node --experimental-strip-types …/revalidation-evidence/adversarial-probe.ts      # exit 0 (11/11)
```
