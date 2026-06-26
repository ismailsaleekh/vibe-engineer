# I-07B Built-in Schematics Fixtures Validation Report

## Checkpoint 0 - report initialized
- Status: IN PROGRESS
- Timestamp: 2026-06-26
- Role: independent adversarial validator.
- Owned write paths: this report, final artifact, and validation-only evidence under `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/**`.
- Files inspected so far: none.
- Files changed so far: this validation report only.
- Evidence so far: report-first discipline satisfied for validator.
- Blockers: none.
- Next step: read ground-truth brief, validation artifact, implementer report, and strategy/scope materials.

## Checkpoint 1 - ground-truth and implementer reports read
- Status: IN PROGRESS.
- Files inspected:
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-07B-built-in-schematics-fixtures-brief-generated.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-07B-brief-validation-artifact.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-07B-built-in-schematics-fixtures/I-07B-implementation-report.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md`
- Key requirements extracted: six built-ins (`module`, `contract`, `adapter`, `test-fixture`, `context-file`, `standard-doc`), owned product paths only under schematics builtins/templates/fixtures, no CLI/root/package manifest/lockfile edits, consume actual I-07C/I-07D contracts rather than copies, real I-07A manifest/engine/template boundary witness, dry-run/apply/idempotency/conflict/unsafe/invalid contract witnesses, and I-07A/I-07C/I-07D blast-radius checks.
- Implementer claim read: status `done-awaiting-independent-validation`, created JS built-in catalog/templates/fixtures/witnesses, reported node syntax/builtins/I-07A regression/contract probes all exit 0.
- Files changed so far: this validation report only.
- Evidence so far: reading-list completion recorded in this report.
- Blockers: none yet.
- Next step: independently inventory dirty tree/diffs and inspect actual owned files before running witnesses.

## Checkpoint 2 - scoped inventory and source inspection started
- Status: IN PROGRESS.
- Validation evidence written:
  - `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/dirty-tree/pre-validation-scoped-status.log`
- Command evidence: `git status --short -- <owned/read-only/forbidden scope>` showed the repo has a broad untracked/no-HEAD baseline (`?? package.json`, `?? packages/artifacts/`, `?? packages/standards/`, etc.). I-07B product paths and lane work root are untracked as expected in this baseline; no concrete tracked diff evidence of root/package/CLI-loader edits by I-07B yet.
- Product files inspected so far:
  - `packages/schematics/src/builtins/index.js`
  - six built-in manifests under `packages/schematics/templates/{module,contract,adapter,test-fixture,context-file,standard-doc}/manifest.json`
  - six template files under `packages/schematics/templates/*/files/*.mustache`
  - valid built-in input fixtures under `packages/schematics/fixtures/builtins/inputs/valid/*.json`
  - sample expected output bodies under `packages/schematics/fixtures/builtins/expected/**`
  - `packages/schematics/fixtures/builtins/run-builtins-witnesses.mjs`
  - dependency surfaces `packages/schematics/src/engine/index.js`, `packages/schematics/src/manifest/loader.js`, `packages/schematics/src/template/{input,renderer,path-safety}.js`, `packages/cli/src/commands/schematic/artifacts-adapter.js`, `packages/standards/src/index.js`, `packages/standards/src/index.d.ts`, `packages/presets/typescript/src/index.ts`, `packages/artifacts/schemas/schematic-manifest.schema.json`
- Source observations to carry into witnesses:
  - Catalog declares exactly six IDs/slugs.
  - Manifests are strict artifact-schema JSON and point to `templateRoot: "files"`, fail-closed `conflictBehavior: "fail"`, `dryRunBehavior.writesFiles: false`, and forbidden root/manifest/CI/docs-decision patterns.
  - Templates are domain-neutral generic text/code with Mustache variables only.
  - Built-in witness imports real I-07A engine/manifest/template code, CLI schematic artifact adapter, standards API, and compiles/imports the TypeScript preset API under evidence.
  - Potential validation focus: product `src/builtins/index.js` is new production JS, while `run-builtins-witnesses.mjs` is fixture/witness-only; the final TypeScript invariant classification must be decided against the validated brief.
- Files changed so far: validation report plus validation-evidence inventory log only.
- Blockers: none yet.
- Next step: run independent required witnesses and additional contract/static probes under validation-evidence.

## Checkpoint 3 - required independent witnesses run
- Status: IN PROGRESS.
- Commands run from `/Users/lizavasilyeva/work/vibe-engineer` with outputs under `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/commands/`:
  1. `python3 - <<'PY' ... node --check ... PY` over `packages/schematics/src/builtins` and `packages/schematics/fixtures/builtins`; exit `0`; stdout reports checked `packages/schematics/src/builtins/index.js` and `packages/schematics/fixtures/builtins/run-builtins-witnesses.mjs`.
  2. `node packages/schematics/fixtures/builtins/run-builtins-witnesses.mjs --evidence-root .vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/witness/builtins`; exit `0`; summary `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/witness/builtins/summary.json` has `ok: true` for RB1/P1/P2/N1/N2/N3/N4/N5.
  3. `node packages/schematics/fixtures/engine/run-engine-witnesses.mjs --evidence-root .vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/witness/i07a-engine --case generation-seam`; exit `0`; summary `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/witness/i07a-engine/summary.json` has `ok: true` for I-07A generation seam.
- Witness evidence reviewed:
  - RB1 loaded built-in manifests through real `loadSchematicDefinition`, injected real CLI artifact validator, and rejected an unknown-field manifest.
  - P1 dry-ran and applied all six built-ins, compared generated marker bodies to lane-owned expected bodies, and repeated apply as noop/report-only.
  - P2 consumed actual standards catalog IDs and actual TypeScript preset rendered files/validator.
  - N1/N2/N3/N4/N5 covered invalid inputs, unsafe/undeclared paths, root/CLI-loader target blocks, unsafe templates/domain terms, unmarked/edited conflict preservation, non-fail conflict policy rejection, and dry-run write blocking.
- Files changed so far: validation report plus validation-evidence inventory/command/witness files only.
- Blockers: none yet.
- Next step: run additional adversarial probes for catalog/contract static properties, TypeScript invariant, secrets/safety, domain leakage, and final dirty-tree inventory.

## Checkpoint 4 - adversarial contract probe found a blocking gap
- Status: IN PROGRESS; preliminary finding opened.
- Validation evidence written:
  - `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/inspection/adversarial-contract-probe.mjs`
  - `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/inspection/adversarial-contract-probe/result.json`
  - `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/commands/adversarial-contract-probe.{cmd,stdout,stderr,exit}.txt`
- Command: `node .vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/inspection/adversarial-contract-probe.mjs`; exit `2` by design because the probe observed a contract-consumption failure.
- Evidence: using the actual I-07A engine plus actual CLI manifest validator on `packages/schematics/templates/standard-doc/manifest.json`, with actual I-07C `standardsApi.loadStandard("domain-neutral-core")` available for comparison, an input with valid `standardId` but forged `standardTitle` and `standardSummary` returned `actualStatus: "ok"`, wrote `docs/standards/forged-standard.md`, and the generated body contains `Forged title not returned by I-07C` and `Forged summary not returned by I-07C`.
- Requirement impact under review: this appears to violate the standards-content consumption requirement and the negative expectation that invalid standard/preset expectations fail. Current product generation trusts user/fixture-provided standard content instead of deriving or validating that content from the actual I-07C contract at the generation boundary. The implementer witness catches only its own valid fixture values, so it is insufficient to prove fail-closed behavior for forged standard content.
- Files changed so far: validation report plus validation-evidence inventory/command/witness/probe files only.
- Blockers: likely major-local; continue final sweeps before final classification.
- Next step: run static catalog/safety sweeps and final dirty-tree inventory, then write final artifact.

## Checkpoint 5 - static/safety/blast-radius sweeps completed
- Status: IN PROGRESS; final classification pending artifact.
- Additional validation evidence:
  - `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/inspection/static-sweep.json`
  - `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/commands/static-sweep.{cmd,stdout,stderr,exit}.txt` with exit `0`
  - `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/dirty-tree/final-validation-scoped-status.log`
- Static sweep results:
  - 38 I-07B product files found under owned paths only.
  - Six expected schematic IDs present and unique: `builtin.adapter`, `builtin.context-file`, `builtin.contract`, `builtin.module`, `builtin.standard-doc`, `builtin.test-fixture`.
  - Manifests preserve `conflictBehavior: "fail"`, generated path `conflictPolicy: "fail"`, `dryRunBehavior.writesFiles: false`, `securitySafety.noNetwork/noShell/deterministicOnly: true`, expected touched/forbidden path patterns, and TypeScript preset metadata references.
  - `packages/schematics/templates/module/manifest.json` has duplicate `standardIds: ["deterministic-schematics", "deterministic-schematics"]`; this is non-primary but should be cleaned with the blocking fix.
  - `static-sweep.json` reports `productionJsMjs: ["packages/schematics/src/builtins/index.js"]`. The witness `.mjs` is fixture-only; `src/builtins/index.js` is production code under `src`.
  - `secretPatternHits: []`; `testingPackageImportHits: []`.
  - Domain/capability scan found only negative-fixture terms plus `https://` schema URI strings in manifests; no secret/unsafe command execution in generated positive outputs was observed.
- Sibling/blast-radius:
  - I-07A post-fix artifact read: PASS/clean for local engine/CLI surfaces with default shipped binary RB4 still pending-live/BLOCKED and not claimed by I-07B.
  - I-07C post-fix artifact read: PASS/clean/truth-green for standards package.
  - I-07D post-fix artifact read: PASS/clean for TypeScript preset package.
  - Independent I-07A engine regression command in Checkpoint 3 still passes.
  - Final scoped status shows only I-07B owned product paths and this lane work root added in the lane scope; root/package/lockfile/CLI-loader/shared surfaces remain broad ambient untracked baseline also present in implementer preflight before I-07B product edits.
- Dirty-tree safety:
  - Validator writes stayed under the validation report and `validation-evidence/**`.
  - No product files were edited by the validator.
  - No `git stash/reset/clean/checkout/restore`, commit/push, package-manager install/update, network, or destructive operation was used by this validator.
- Preliminary findings to carry into final artifact:
  - Critical candidate: new production JS file `packages/schematics/src/builtins/index.js` without explicit TypeScript exception.
  - Major-local candidate: standard content contract is not enforced at generation boundary; forged `standardTitle`/`standardSummary` with valid `standardId` generates successfully.
  - Minor-local candidate: duplicate `deterministic-schematics` standard ID in module manifest.
- Next step: write final validation artifact with verdict and exact evidence.

## Checkpoint 6 - final verdict prepared
- Status: NEEDS-FIX.
- Final classification prepared for artifact:
  - `critical`: production JavaScript under `packages/schematics/src/builtins/index.js` without an explicit production-JS exception in the validated brief/task scope.
  - `major-local`: standards content contract is not fail-closed at the real generation boundary; forged I-07C title/summary values are emitted successfully.
  - `minor-local`: duplicate standard ID in module manifest.
- Positive evidence retained: required built-ins witness, node syntax check, and I-07A regression command all passed under independent validation evidence.
- No product fixes were made.
- Next step: write `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-07B-built-in-schematics-fixtures/I-07B-validation-artifact.md` and stop.
