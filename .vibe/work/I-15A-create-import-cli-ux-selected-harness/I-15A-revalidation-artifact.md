# I-15A Revalidation Artifact (Triad-B adversarial REVALIDATOR)

- **Target under revalidation:** I-15A `vibe-engineer create`/`import` + selected-pi harness join (impl report `DONE`, 16 real-boundary witnesses; W-RB4 + live-pi pending-live).
- **Impl report:** `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-15A-create-import-cli-ux-selected-harness/I-15A-implementer-report.md`
- **Revalidator:** independent adversarial REVALIDATOR (glm-5.2 via zai, thinking xhigh). Read-only on both repos; no product edits; no git mutations. WRITE only this artifact + own evidence tree.
- **Quality bar:** prepended verbatim, binding. Implementer `DONE` ≠ validator `PASS`. Shape-green ≠ truth-green. Gateway lane — rigorous.
- **Verdict:** **PASS** — I-15A is **truth-green**. Severity: **clean**.

## Verdict

**PASS.** Every load-bearing producer→consumer seam independently reproduced REAL-BOUNDARY; W-RB4 + live-pi honestly `pending-live/BLOCKED` (not faked); zero out-of-license edits; dirty-tree scope clean; no green sibling regressed; creation-UX matches locked-decisions §4. Unblocks I-15B / the rest of the chain.

## Stage log
- [x] 0. Artifact scaffolded FIRST (checkpointing).
- [x] 1. Read impl report + brief + brief-PASS + Step-0 revalidation PASS + locked-decisions §4/§5/§6.
- [x] 2. `node --check` all 3 new `.ts` source files (create/index.ts, import/index.ts, create/selected-harness.ts) → exit 0.
- [x] 3. Re-ran 16-witness matrix myself (`--evidence-root` → own tree) → 16/16 pass, exit 0.
- [x] 4. Adversarial cli-context resolution gating probe (the flagged Node-24/ESM nuance).
- [x] 5. Real I-14A manifest gate confirmed on disk.
- [x] 6. Independent real context consumer replay (validateContextProject + retrieveContextClosure).
- [x] 7. Dirty-tree scope + sibling blast-radius sweep.
- [x] 8. Creation-UX vs §4; severity gate; final verdict.

Evidence tree (this agent, owned WRITE): `.vibe/work/I-15A-create-import-cli-ux-selected-harness/revalidation-evidence/**`
- `cli/**` — my independent 16-case witness run (summary.json ok=true).
- `adversarial-probes.log` — cli-context resolution gating + real manifest gate + independent context consumer + git diffs + as-any ban.
- `schematic-sibling/**` — sibling no-regression witness.

---

## 1. Required findings (numbered; severity + exact evidence)

### F1 — 16-witness matrix reproduces REAL-BOUNDARY (clean)

**Witness command:** `node packages/cli/src/commands/create/run-cli-witnesses.mjs --evidence-root .vibe/work/I-15A-create-import-cli-ux-selected-harness/revalidation-evidence/cli` → **exit 0**, `summary.json ok=true`, **16/16 passed** (W-RESOLVE, W-CREATE-PROVIDED, W-CREATE-SKIPPED, W-IMPORT, W-CONSUMER-MANIFEST, W-CONSUMER-CONTEXT, W-MACHINE-ENVELOPE, W-NEG-NON-PI, W-NEG-INVALID-MANIFEST, W-NEG-INVALID-BRIEF, W-NEG-OVER-INFERENCE, W-NEG-SKIPPED-CONFIDENT, W-NEG-MISSING-PROVENANCE, W-NEG-FORBIDDEN-PROMPTS, W-REG-INVARIANTS, W-RB4).

**Each witness is REAL-BOUNDARY (verified by reading the runner + replaying key seams):**
- The runner is located under `packages/cli/src/commands/create/` and imports the REAL command modules (`./index.ts`, `../import/index.ts`) via a REAL `createCommandLoader([createCommand])`/`([importCommand])` dispatch — not mocked fixtures.
- It imports the REAL I-14A manifest/matrix via the public API (`@vibe-engineer/adapter-pi/{capabilities,generated-file-manifest,schema}`), the REAL context package (`validateContextProject`/`retrieveContextClosure`/`writeContextProject`), and REAL config (`createDefaultVibeConfig`).
- W-CREATE-PROVIDED writes REAL on-disk artifacts (`vibe-engineer.config.json`, `AGENTS.md`, `CLAUDE.md`, source record, context graph/index) into a temp target and asserts their content; result-file is written atomically and reread-equivalence-checked.
- No `as any` anywhere in I-15A source (`grep -rnE "as any\b" packages/cli/src/commands/{create,import}/` → NONE). Quality-bar ban honored.
- Evidence: `revalidation-evidence/cli/summary.json`, `revalidation-evidence/cli/0[1-9]-*`/`1[0-6]-*` per-case stdout/exit files.

### F2 — Real I-14A manifest gate (clean) — valid passes, invalid fail-closed

**Independent probe (from packages/cli context, real public function):**
```
adapterId= pi    pi-selectable= true    schemaVersion= pi-generated-file-manifest/v1
I-15A-owned: [["context-files","ready"],["harness-config","ready"]]
```
- The create command's `resolveSelectedPiManifest()` (selected-harness.ts) calls the real `getPiAdapterCapabilityMatrix()` + `getPiGeneratedFileManifest()`, runs the real `validateCapabilityMatrix` + `validateGeneratedFileManifest`, gates on `isAdapterManifestSelectable(matrix,"pi")` (NOT `createImportSelectable`), and confirms the I-15A-owned families (`context-files` + `harness-config`, both `ready`). On any missing/invalid signal it returns a typed `ResolveManifestError` → the command emits a `blocked` envelope (fail-closed).
- **Fail-closed verification (W-NEG-INVALID-MANIFEST):** feeding a malformed manifest/matrix to the REAL validators → `valid:false` (manifest with `families:"not-an-array"` rejected; matrix with `adapters:[]` rejected). The command hard-depends on these validators (unconditional `validateMatrix`/`validateManifest` in `resolveSelectedPiManifest`). The command cannot be made to *see* a malformed manifest without an internal monkey-patch (the manifest is produced by a hardcoded no-arg public function); the brief explicitly acknowledged this and the witness correctly documents the hard dependency rather than faking an injection. Honest + correct.
- Evidence: `revalidation-evidence/cli/09-W-NEG-INVALID-MANIFEST-*.stdout.json`; `adversarial-probes.log` "Real manifest gate" section.

### F3 — Selected-pi join is REAL-BOUNDARY; probes correctly placed under packages/cli/; Node-24 type-stripping (clean) — the flagged nuance, cleared

This was the task's explicit flagged concern (the implementer "reasoned through the ESM-resolution nuance"). **Independently cleared both ways:**
- **From REPO ROOT:** `node --input-type=module -e "import('@vibe-engineer/adapter-pi/capabilities')…"` → **`ERR_MODULE_NOT_FOUND`** (resolution correctly FAILS where the dep is not declared).
- **From packages/cli context:** same import → **`RESOLVED_FROM_CLI_CONTEXT=OK` (8 keys)**.

This proves the witness runner's location under `packages/cli/src/commands/create/` is **load-bearing** for ESM resolution (governed by the importing module's location, not cwd) — it is NOT a wrong-context false-green and NOT a phantom hoist (`shamefully-hoist=false`; Step-0 revalidation F3 already proved declared-workspace `link:` edges). The adapter exports raw `.ts` (`import: ./src/.../index.ts`), so the cli-context probe genuinely exercises **Node-24 native type-stripping** (Step-0 revalidation F2 cleared the same attack vector under plain `node` v24.16.0). The join consumes the adapter-pi PUBLIC API only (no relative/`:../` imports into the package) — `getPiAdapterCapabilityMatrix`, `getPiGeneratedFileManifest`, `validateCapabilityMatrix`, `validateGeneratedFileManifest`, `isAdapterManifestSelectable`, `createPiDownstreamManifestSummary`. Evidence: `adversarial-probes.log`.

### F4 — DL-17 bootstrap + harness-config + AGENTS.md/CLAUDE.md generation is REAL (not placeholder) (clean)

- **harness-config (`vibe-engineer.config.json`):** full real config via `createDefaultVibeConfig({ agenticHarness: "pi" })` — `{agenticHarness:"pi", maxParallelAgents:8, maxValidationFixIterations:3, agenticWorkPackageTargetHours:6, verification:{…}, uiVerification:{…}, agentRegistry:{…}}`. `agenticHarness` uses the config-schema authority (no parallel format); adapter/manifest versions are carried as harness-config metadata in the result envelope + AGENTS.md "Setup facts" (consistent with brief §5 step 6). Config defaults **untouched (8/3/6)** — W-REG-INVARIANTS green.
- **context-files (`AGENTS.md` + `CLAUDE.md`):** 3246 bytes each (provided path), real provenance-labeled content — every load-bearing line carries a DL-17 label (`user_provided`, `normalized_from_user`, `harness_default`, `unknown`). Provided path records the brief **verbatim** under `user_provided`; skipped path (2957 bytes) carries the `Brief status: 'skipped'` + `needs_user_context` + `brainstorm` instruction. **No over-inference:** W-NEG-OVER-INFERENCE (vague "app" brief) and W-NEG-SKIPPED-CONFIDENT assert NO confident product-design sections (`## roadmap/architecture/database schema/domain model/users/integrations/workflow/feature`) are generated; only sparse facts + `unknown`s. Provenance labels present (W-NEG-MISSING-PROVENANCE).
- **Bootstrap follows from brief presence (no separate bootstrap prompt)** per §4: provided → sparse provenance-labeled context; skipped → neutral placeholder + `brainstorm`. DL-17 contract honored.
- Evidence: `revalidation-evidence/cli/targets/w-create-provided/{vibe-engineer.config.json,AGENTS.md,CLAUDE.md}`; per-case `0[2-3,11-13]-*` stdout.

### F5 — W-RB4 (shipped-binary) + live-pi genuinely `pending-live/BLOCKED` (NOT faked) (clean) — critical attack vector cleared

- **W-RB4 honestly pending-live:** the witness constructs the **real** `createCommandLoader([])` (the shipped default binary's loader, no commands registered) and dispatches `create` → asserts `status:"blocked"`, `payload.kind:"cli_invocation_error"`, error code **`VE_UNSUPPORTED_OPERATION`**. Confirmed create/import are NOT registered: `git diff HEAD -- packages/cli/package.json` shows ONLY the 2 Step-0 `dependencies` lines, **NO `bin`/`exports` change**, and `create`/`import` remain in `LATER_COMMANDS`. The runner does NOT claim green on shipped-binary wiring. Evidence: `revalidation-evidence/cli/16-W-RB4-default-binary-pending-live.stdout.json` (`status:"pending-live/BLOCKED"`).
- **Live-pi runtime honestly pending-live:** I-15A does NOT mint a `PiRuntimeFixture` (I-14B-only carrier) and does NOT claim a live-pi connection. Manifest producers on disk are only `I-14B` + `I-15A` (no fake runtime authorship). Evidence: `adversarial-probes.log` "all family producers" = `["I-14B-pi-adapter-runtime-skill-consumption","I-15A-create-import-cli-ux-selected-harness"]`.
- **No faking:** both seams honestly recorded with exact prerequisites (serialized I-02A entry/loader/manifest handoff for W-RB4; operator credentials for live-pi). Faking would be critical — none found.

### F6 — No out-of-license edits / dirty-tree scope clean (clean)

`git status --porcelain -- <owned paths>` shows the I-15A product delta is **exactly 4 new untracked dirs** under the brief's owned WRITE paths:
```
?? examples/starter-reference/generated-fixtures/create-ux/
?? examples/starter-reference/generated-fixtures/selected-harness/
?? packages/cli/src/commands/create/
?? packages/cli/src/commands/import/
```
- **NO tracked-file edits** by I-15A in product (all `??`, zero `M`/`D` attributable to this lane).
- **`packages/cli/package.json`** (the `M`) diff vs HEAD = **exactly the 2 Step-0 dep lines** (`@vibe-engineer/adapter-pi`, `@vibe-engineer/context`) — the EXTEND-I-02A Step-0 footprint (revalidated PASS), NOT an I-15A edit; **no `bin`/`exports`/entry/loader/envelope/errors change**.
- **`pnpm-lock.yaml`** churn (1652 ins vs HEAD) is pre-existing multi-orchestrator baseline (Step-0 three-way-proved its attributable delta = 6 lines; I-15A ran no lockfile-mutating command).
- **NO edits** to other lanes' surfaces, adapter-pi/context/config internals (public exports consumed only), `docs/decisions/**`, prompts/briefs/ledger, or `.git/**`. Work-root writes confined to `.vibe/work/I-15A-create-import-cli-ux-selected-harness/**`. Evidence: `adversarial-probes.log` git sections.

### F7 — No sibling regression (clean)

Re-ran green sibling witnesses (read-only; my own evidence roots):
- **I-02A foundation:** `node packages/cli/src/testing/run-witnesses.mjs` → **exit 0** ("I-02A CLI package witnesses passed"). The dep addition + new command dirs did not regress the cli loader/envelope/foundation.
- **schematic:** `node packages/cli/src/commands/schematic/run-cli-witnesses.mjs --evidence-root …` → **exit 0**, `ok:true` (RB2/P5/RB4/P5 all passed). *(Bare invocation without `--evidence-root` throws `--evidence-root is required` — a required-arg, NOT an I-15A regression; the impl report ran it with the flag.)*
- **security:** `node packages/cli/src/commands/security/run-cli-witnesses.mjs` → **exit 0**, `ok:true` (15 cases).
- The new `create`/`import` command modules are file-disjoint from verify/security/schematic; the cli loader/registration is untouched. No green sibling regressed.

### F8 — Creation-UX matches locked-decisions §4 (clean)

locked-decisions §4: creation asks ONLY (a) project/repo/app naming, (b) default agentic harness selection, (c) optional project brief; **no stack prompt, no maxParallel prompt, no separate "skip bootstrap?" prompt** (bootstrap follows from brief presence). §5: config defaults 8/3/6, `maxParallelAgents` not prompted. §6: six skills.

I-15A implementation matches exactly:
- `create`/`import` accept ONLY `--project-name` (naming), `--agentic-harness` (default `pi`), `--brief` (optional), plus global envelope flags (`--target-root` required, `--result-file`, `--json`, `--non-interactive`). **No stack/maxParallel/bootstrap flag** (`VALUE_FLAGS`/`BOOLEAN_FLAGS` closed sets in create/index.ts).
- **W-NEG-FORBIDDEN-PROMPTS:** `--stack next --max-parallel 4` → `blocked`, `cli_invocation_error`, **`VE_INVALID_FLAG`**. ✓
- Non-pi harnesses (claude-code/codex/opencode/later-integrations/unknown) → typed `blocked` (`VE_UNSUPPORTED_OPERATION`), **never silent** (W-NEG-NON-PI all 5 blocked). §4 lists the eventual harness *menu*; DL-06 makes pi-only selectable in v1 — non-pi correctly blocked with reason, not silently accepted. ✓
- Bootstrap follows from brief presence (provided → sparse bootstrap; skipped → neutral placeholder + `brainstorm`). No separate bootstrap prompt. ✓
- Config defaults 8/3/6 untouched; six skills present in AGENTS.md invariants. ✓

---

## 2. Explicit gate statements (all clean)

- **(a) 16 witnesses reproduce real-boundary:** YES — F1. Real command modules via real CommandLoader dispatch; real I-14A manifest/matrix; real context package; real on-disk generated artifacts; no mocks/synthetic shape-only green.
- **(b) I-14A manifest gate real:** YES — F2. Real `getPi{…}Manifest()` read + real validators + `isAdapterManifestSelectable` gate; malformed fails validators (fail-closed); command hard-depends on them.
- **(c) Selected-pi join real-boundary (probes correctly placed, Node-24 type-stripping):** YES — F3. Resolution FAILS from repo root (`ERR_MODULE_NOT_FOUND`) + SUCCEEDS from packages/cli context (8 keys) → runner location under `packages/cli/` is load-bearing, not a hoist false-green; adapter `.ts` exports genuinely loaded via Node-24 type-stripping.
- **(d) Bootstrap/config generation real:** YES — F4. Full real config (8/3/6 defaults, agenticHarness=pi); real provenance-labeled AGENTS.md/CLAUDE.md (verbatim brief / placeholder+brainstorm); no over-inference.
- **(e) W-RB4/live-pi genuinely pending-live not faked:** YES — F5. Real `createCommandLoader([])` → `VE_UNSUPPORTED_OPERATION`/blocked; no bin/exports registration; no `PiRuntimeFixture` minted; no live-pi claim; exact prerequisites stated.
- **(f) Dirty-tree scope clean:** YES — F6. Exactly 4 new untracked owned dirs; package.json M = Step-0's 2 lines only (no bin/exports); lockfile churn = pre-existing baseline; no out-of-license edits; no `.git` ops.
- **(g) No sibling regression:** YES — F7. I-02A foundation, schematic, security all green (exit 0); loader/registration untouched.
- **(h) Creation-UX matches §4:** YES — F8. Naming + default-harness + optional-brief only; no stack/maxParallel/bootstrap prompt; bootstrap follows brief presence; non-pi blocked not silent.

## 3. Severity gate assessment

**clean.** All dependent-blocking truth-green witnesses green (W-CREATE-PROVIDED/SKIPPED, W-IMPORT, W-CONSUMER-MANIFEST, W-CONSUMER-CONTEXT, W-MACHINE-ENVELOPE); all W-NEG-* fail-closed; W-REG-INVARIANTS clean; W-RB4 + live-pi honestly `pending-live/BLOCKED`. **No critical / major-local / minor-local findings.**

The two `pending-live/BLOCKED` seams are correctly out-of-license and honestly recorded (shipped-binary registration = serialized I-02A handoff; live-pi = I-14B operator credentials) — they do NOT weaken I-15A's truth-green, which is established by the deterministic witness-loader exercise of the command logic + the real producer→consumer seams.

**I-15A is truth-green → it unblocks I-15B / the rest of the starter chain (I-15B → I-16 → I-17 → …).** W-RB4 (shipped-binary dispatch wiring) and live-pi remain deferred to their serialized owners (I-02A / I-14B) and are NOT blockers for I-15A's deliverable.

## 4. Exact next action

1. **MARK I-15A TRUTH-GREEN (PASS).** No fix required.
2. **Proceed downstream** — the gateway lane's selected-pi create/import join + DL-17 bootstrap + generated `harness-config`/`context-files` are real and consumed by the real adapter-manifest + context validators/retrievers.
3. **Deferred (out of I-15A license, not blockers):** (a) W-RB4 shipped-binary registration of `create`/`import` via a serialized I-02A entry/loader/manifest handoff; (b) live-pi runtime seam (I-14B, operator credentials); (c) strict-tsc-green closure (`TS-02A` sweeps create/import sibling imports — impl acknowledged the sibling-pin, correctly does NOT claim strict-tsc-green).

## Files touched (this agent — owned WRITE only)
- `.vibe/work/I-15A-create-import-cli-ux-selected-harness/I-15A-revalidation-artifact.md` (this file).
- `.vibe/work/I-15A-create-import-cli-ux-selected-harness/revalidation-evidence/cli/**` (my independent 16-case witness run).
- `.vibe/work/I-15A-create-import-cli-ux-selected-harness/revalidation-evidence/schematic-sibling/**` (sibling no-regression run).
- `.vibe/work/I-15A-create-import-cli-ux-selected-harness/revalidation-evidence/adversarial-probes.log`.

No product edits, no git mutations. Read-only witnesses only (`node --check`; `node import` probes; witness-runner replays; `git status`/`git diff`; `grep`). No edits to impl report, prior evidence trees, briefs/prompts/ledger/status/handoff, or any product file. `.git/**` untouched. No pnpm/lockfile-mutating commands.

*Independent adversarial revalidation — read-only on both repos; only this artifact + `revalidation-evidence/**` written.*
