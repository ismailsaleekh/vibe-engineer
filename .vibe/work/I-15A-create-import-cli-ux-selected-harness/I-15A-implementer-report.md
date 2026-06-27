# I-15A Triad-B IMPLEMENTER Report — create/import CLI UX + selected-harness pi join

- Lane: `I-15A-create-import-cli-ux-selected-harness`
- Role: Triad-B IMPLEMENTER. NOT self-validating (separate Triad-A/B revalidation follows).
- Working dir: `/Users/lizavasilyeva/work/vibe-engineer`
- Binding spec: `implementation-briefs/I-15A-brief-generated.md` (Triad-A PASS). Quality bar prepended verbatim — binding.
- Prerequisite: EXTEND-I-02A Step-0 DONE + revalidated PASS — `@vibe-engineer/adapter-pi` + `@vibe-engineer/context` are declared+locked cli deps; W-RESOLVE-CLI-* GREEN (consumed, not re-adjudicated).

## VERDICT: DONE

All real-boundary witnesses GREEN; `pending-live/BLOCKED` seams (W-RB4 shipped-binary dispatch + live pi runtime) honestly recorded; zero out-of-license edits; dirty-tree scope clean.

## Owned WRITE paths (this implementer) — all writes confined to these

- `packages/cli/src/commands/create/**` ✓
- `packages/cli/src/commands/import/**` ✓
- `examples/starter-reference/generated-fixtures/create-ux/**` ✓
- `examples/starter-reference/generated-fixtures/selected-harness/pi/**` ✓
- `.vibe/work/I-15A-create-import-cli-ux-selected-harness/**` ✓

NOT touched: `packages/cli/package.json` (the on-disk `M` is the pre-existing Step-0 dep footprint, NOT this lane), `packages/cli/src/{entry,command-loader,envelope,errors,testing}/**`, `packages/adapters/pi/**` internals (public exports consumed only), root config/lockfile, `.git/**`. Confirmed via `git status --porcelain` — all I-15A product writes are new untracked dirs under the owned paths above.

## Stage log (incremental checkpointing)

- [x] 0. Report scaffolded.
- [x] 1. Read ground-truth reading list (brief, PASS artifact, Step-0 revalidation PASS, verify/security/schematic precedents, capabilities + generated-file-manifest + context + config contracts, DL-17 full).
- [x] 2. I-14A contract confirmed on disk (facts below).
- [x] 3. Shared selected-harness + DL-17 bootstrap helpers (`create/selected-harness.ts`).
- [x] 4. `create` command (`create/index.ts`).
- [x] 5. `import` command (`import/index.ts` — reuses shared join/bootstrap in import mode).
- [x] 6. Lane-owned witness runner (`create/run-cli-witnesses.mjs`).
- [x] 7. Generated-fixture subtrees refreshed from REAL command output (`--refresh-fixtures`).
- [x] 8. Full witness matrix run — all GREEN.
- [x] 9. TS-02A sibling-pin acknowledgement recorded (below).
- [x] 10. Severity: **clean**.

## Ground-truth I-14A contract facts (confirmed on disk)

- `PI_ADAPTER_ID === "pi"`; `PI_ADAPTER_CAPABILITY_SCHEMA_VERSION === "pi-adapter-capability-matrix/v1"`; `PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION === "pi-generated-file-manifest/v1"`.
- pi `selection = { manifestSelectable: true, createImportSelectable: false, readiness: "ready" }`; `isAdapterManifestSelectable(matrix,"pi") === true`. The command gates on **manifest-selectability** (NOT `createImportSelectable` — enabling create/import is this lane's job).
- I-15A-owned families exactly `{ context-files, harness-config }`, both `readiness.state === "ready"`; `context-files` pathPatterns `["AGENTS.md","CLAUDE.md"]`. `pi-skill-files`/`pi-prompt-templates` = I-14B; `pi-extensions` = blocked; `pi-package-manifest` = deferred.
- `harness-config` conceptual fields: `agenticHarness=pi`, `adapterCapabilityVersion`, `generatedFileManifestVersion`.
- Real consumers exercised: `createPiDownstreamManifestSummary()`, `validateCapabilityMatrix`, `validateGeneratedFileManifest` (schema subpath); context `writeContextProject`, `validateContextProject`, `retrieveContextClosure`.
- Non-pi adapters `manifestSelectable:false` → BLOCK (DL-06).

## Implementation summary (DL-06 + DL-16 + DL-17 faithful)

- **Locked inputs only.** `create`/`import` accept exactly: `--project-name`, `--agentic-harness` (default `pi`), `--brief` (optional), plus global envelope flags `--target-root` (required), `--result-file`, `--json`, `--non-interactive`. No stack/maxParallel/bootstrap prompt. Any other flag → typed `cli_invocation_error` (`VE_INVALID_FLAG`).
- **Selected-pi join (DAG §9).** Reads the real I-14A matrix+manifest through public exports, validates them with their own validators, confirms the I-15A-owned ready families, gates on `isAdapterManifestSelectable`. Non-pi/unknown harness → typed `blocked` (`VE_UNSUPPORTED_OPERATION`), never silent. Missing/invalid manifest → typed `blocked`.
- **harness-config producer.** Writes `vibe-engineer.config.json` via `@vibe-engineer/config` (`createDefaultVibeConfig({ agenticHarness: "pi" })`) — config is the authority for the `agenticHarness` field shape (no parallel format; adapter/manifest versions are not config-schema fields and are recorded as harness-config metadata in the result envelope + context-files).
- **context-files producer.** Writes `AGENTS.md` + `CLAUDE.md` carrying DL-17 bootstrap context with provenance labels on every load-bearing claim.
- **DL-17 bootstrap.** Provided-brief path: verbatim brief as `user_provided` source record + sparse high-level context (all non-stated categories classified `unknown` — NO regex/heuristic extraction of goals/constraints/etc., honoring the quality-bar ban on heuristics standing in for typed contracts) + graph/index via the real context writer. Skipped-brief path: absence record + neutral `needs_user_context` placeholder + unknowns + `brainstorm` instruction. Invalid/oversized/secret brief → typed `blocked` (no secret echo). Provenance labels used are exactly the DL-17 set.
- **DL-20A domain-neutrality.** No business-domain defaults in core; only neutral placeholders + user-provided vocabulary.
- **Consumer seams (truth-green, not shape-green).** W-CONSUMER-MANIFEST proves the produced harness-config metadata corresponds to the real manifest (`createPiDownstreamManifestSummary` + `validateGeneratedFileManifest`); W-CONSUMER-CONTEXT proves the generated context loads clean under the real `validateContextProject` for both provided+skipped states and the real `retrieveContextClosure` cites the bootstrap source record.
- **No `PiRuntimeFixture` minted** (I-14B-only carrier). No faked live-runtime proof.

## Required witnesses — all run against REAL command modules / REAL manifest / REAL context package / REAL on-disk artifacts

Runner: `node packages/cli/src/commands/create/run-cli-witnesses.mjs` → **exit 0**, 16/16 cases passed (`evidence/cli/summary.json` ok=true).

| # | Witness | Result |
| --- | --- | --- |
| 01 | W-RESOLVE-CLI-ADAPTER + W-RESOLVE-CLI-CONTEXT (real resolvability + I-15A family confirmation) | PASS |
| 02 | W-CREATE-PROVIDED (success + on-disk config/context-files + provenance + atomic result-file) | PASS |
| 03 | W-CREATE-SKIPPED (success + placeholder + brainstorm + no confident sections) | PASS |
| 04 | W-IMPORT (success + selected-harness join) | PASS |
| 05 | W-CONSUMER-MANIFEST (real `createPiDownstreamManifestSummary`/`validateGeneratedFileManifest`) | PASS |
| 06 | W-CONSUMER-CONTEXT (real `validateContextProject` clean + `retrieveContextClosure` cites source) | PASS |
| 07 | W-MACHINE-ENVELOPE (schema-valid envelope + atomic result-file + no secret leak) | PASS |
| 08 | W-NEG-NON-PI (claude-code/codex/opencode/later-integrations/unknown all block) | PASS |
| 09 | W-NEG-INVALID-MANIFEST (validators reject malformed matrix+manifest; command hard-depends on them) | PASS |
| 10 | W-NEG-INVALID-BRIEF (oversized + secret-bearing blocked; no echo) | PASS |
| 11 | W-NEG-OVER-INFERENCE (vague brief → no confident sections; only unknowns + verbatim brief) | PASS |
| 12 | W-NEG-SKIPPED-CONFIDENT (skipped → intentional placeholder, not confident summary) | PASS |
| 13 | W-NEG-MISSING-PROVENANCE (DL-17 labels present on load-bearing claims) | PASS |
| 14 | W-NEG-FORBIDDEN-PROMPTS (`--stack`/`--max-parallel` rejected) | PASS |
| 15 | W-REG-INVARIANTS (name vibe-engineer, six skills, artifact flow, config defaults 8/6 untouched) | PASS |
| 16 | W-RB4 + live-pi (pending-live/BLOCKED, honestly recorded) | PASS |

## Validation commands (brief §7 — exit codes recorded)

1. `node packages/cli/src/commands/create/run-cli-witnesses.mjs` → **exit 0** (16/16).
2. `node --check packages/cli/src/commands/create/index.ts` → **exit 0**; `.../import/index.ts` → **exit 0** (Node 24 native .ts).
3. Direct-load probe (`import ./index.ts` + `../import/index.ts`, assert command def shape) → **exit 0**.
4. Resolvability W-RESOLVE-CLI-ADAPTER/CONTEXT → GREEN (inline case 01 of the runner; located under `packages/cli/` so bare workspace imports resolve from the cli context — Node ESM resolution is governed by the importing module's location, not cwd).
5. Sibling no-regression: `node packages/cli/src/testing/run-witnesses.mjs` (I-02A foundation) → **exit 0**; `schematic/run-cli-witnesses.mjs --evidence-root ...` → **exit 0** (ok:true); `security/run-cli-witnesses.mjs` → **exit 0** (ok:true). No green sibling regressed. (No pnpm/install/typecheck run — no strict cli tsconfig; TS-02A owns that; no lockfile-mutating commands run.)

## pending-live/BLOCKED seams (honest, NOT green)

- **W-RB4 (shipped-binary dispatch):** the shipped default binary uses I-02A `createCommandLoader()` (no commands registered); `create`/`import` are in `LATER_COMMANDS` → dispatch returns `cli_invocation_error` / `VE_UNSUPPORTED_OPERATION`. Registering them requires a serialized I-02A entry/loader/manifest handoff — out of I-15A's license. Witness-runner exercise (cases 02–06) is the deterministic-green proof of command logic; W-RB4 states shipped-binary wiring is not yet licensed.
- **Live pi runtime:** I-14B live-runtime seam remains `pending-live/BLOCKED` (operator credentials); I-15A does NOT claim it.

## TS-02A sibling-pin acknowledgement (brief §10 — mandatory)

I-15A produces new `.ts` command files mirroring the accepted `verify/index.ts` + `security/index.ts` Node-24-native-`.ts`-load precedent (type-annotation-only, `as unknown as` casts on JS/external siblings, bare workspace imports, explicit `.ts` specifiers for `.ts`→`.ts` sibling imports since Node 24 type-stripping does no extension resolution, no strict cli tsconfig). The deferred **strict-tsc-green closure** (cli tsconfig + build/typecheck script + envelope/errors TS migration + removal of redundant `as unknown as` casts across verify/security/create/import) is owned by the future **`TS-02A`** lane (post-starter-wave, pre-`I-24`/`FINAL-BUGHUNT`), per `post-i20-ready-queue.md` §5. `TS-02A` must later sweep the `create`/`import` sibling imports too. I-15A does not block on TS-02A and does not claim strict-tsc-green.

Note on Node's conservative type-stripper: template literals with escaped backticks were avoided in source (the stripper is stricter than `node --check` in that one respect); all command source is `node --check` clean AND runtime-load clean.

## Files changed (exact)

Product (owned WRITE):
- `packages/cli/src/commands/create/selected-harness.ts` (shared selected-pi join + DL-17 bootstrap builder + generated-artifact writers)
- `packages/cli/src/commands/create/index.ts` (`create` command; `runCreate(ctx, "create"|"import")`)
- `packages/cli/src/commands/create/run-cli-witnesses.mjs` (lane witness runner + fixture refresher)
- `packages/cli/src/commands/import/index.ts` (`import` command; reuses shared logic in import mode)
- `examples/starter-reference/generated-fixtures/create-ux/**` (provided-brief, skipped-brief, non-pi-blocked carriers — real command output)
- `examples/starter-reference/generated-fixtures/selected-harness/pi/**` (selected-pi-create harness-config + context-files — real command output)

Work root (owned WRITE):
- `.vibe/work/I-15A-create-import-cli-ux-selected-harness/I-15A-implementer-report.md` (this file)
- `.vibe/work/I-15A-create-import-cli-ux-selected-harness/evidence/cli/**` (witness case artifacts + summary.json + fixture-refresh.json)

Deferred debts: W-RB4 shipped-binary registration + live pi runtime = `pending-live/BLOCKED` (serialized I-02A / I-14B prerequisites, out of license). No other debts.

## Severity gate assessment: clean

All dependent-blocking truth-green witnesses green (W-CREATE-PROVIDED/SKIPPED, W-IMPORT, W-CONSUMER-MANIFEST, W-CONSUMER-CONTEXT, W-MACHINE-ENVELOPE); all W-NEG-* fail-closed; W-REG-INVARIANTS clean; W-RB4 + live-pi honestly `pending-live/BLOCKED`. No critical/major-local findings.
