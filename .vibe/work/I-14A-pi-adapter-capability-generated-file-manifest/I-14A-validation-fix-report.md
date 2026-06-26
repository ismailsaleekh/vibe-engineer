# I-14A Validation Fix Report

## Status
- Verdict: DONE (fix implementation only; not truth-green)
- Created before product edits: yes
- Scope: fixed only validation findings from `b1c319c9b` (`F-CRITICAL-01`, `F-MAJOR-01`).
- I-14A remains not truth-green until independent post-fix revalidation returns `PASS`.

## Files inspected
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/i-14a-execute.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger-compact.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/handoff.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/I-14A-implementation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/I-14A-validation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/I-14A-validation-artifact.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/validation-evidence/validator-manifest-boundary-result.json`
- `packages/adapters/pi/package.json`
- `packages/adapters/pi/src/schema/index.ts`
- `packages/adapters/pi/src/capabilities/index.ts`
- `packages/adapters/pi/src/generated-file-manifest/index.ts`
- `packages/adapters/pi/fixtures/manifest/canonical-generated-file-manifest.json`
- `.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/witnesses/manifest-api-consumer.mjs`
- `.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/fix-evidence/i14a-fix-real-boundary-result.json`

## Files changed / written
- `packages/adapters/pi/src/schema/index.ts`
- `packages/adapters/pi/src/generated-file-manifest/index.ts`
- `packages/adapters/pi/fixtures/manifest/negative/runtime-proven-claim.json`
- `packages/adapters/pi/fixtures/manifest/negative/missing-generated-file-pi-skill-path-pattern.json`
- `packages/adapters/pi/fixtures/manifest/negative/unsupported-generated-file-produced-by-lane.json`
- `packages/adapters/pi/fixtures/manifest/negative/unsupported-generated-file-owner-lane.json`
- `.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/fix-evidence/i14a-fix-real-boundary-witness.mjs`
- `.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/fix-evidence/i14a-fix-real-boundary-result.json`
- `.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/fix-evidence/i14a-fix-downstream-summary.json`
- `.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/I-14A-validation-fix-report.md`
- Refreshed by existing owned implementer witness: package/example canonical fixtures, original negative fixture files, `witness-results.json`, `downstream-summary.json`.

## Root causes and fixes

### F-CRITICAL-01
- Root cause: I-14A schema modeled `runtimeExecutionClaim` as accepting `proven`, and `createDownstreamManifestSummary` silently converted invalid live-runtime green input to `pending-live`.
- Fix: added typed I-14A runtime claim model accepting only `not-claimed`, `pending-live`, `blocked`; typed live-runtime green claims (`proven`, `live-proven`, `runtime-proven`, `loaded`, `executed`) now fail with `i14a_runtime_claim_out_of_scope`; downstream summary now only returns already-validated claims and no longer remaps.

### F-MAJOR-01
- Root cause: generated-file family validator accepted generic non-empty path/producer/owner/consumer strings instead of the exact I-14A family contract.
- Fix: added typed per-family contracts enforcing exact path patterns, exact producer and owner lanes, exact owner write scopes and allowed operations, typed exact consumed-by lanes, exact trust/security fields including project trust/executable/command/sandbox/credential/external/destructive policies, exact version fields, and exact readiness state.

## Commands and evidence
- `bg_status` -> exit 0; no background tasks visible.
- Pre-edit scoped status/inventory over I-14A-owned and protected adjacent paths -> exit 0; no active overlap; no files under `packages/adapters/pi/src/runtime`, `src/generators`, or `src/loader-witness`.
- `pnpm --dir packages/adapters/pi run typecheck` -> exit 2 after first source edit; local generated-manifest typing follow-up required.
- `pnpm --dir packages/adapters/pi run typecheck` -> exit 0 after local typing fix.
- Node fixture generation for four new negatives -> exit 0.
- `node --experimental-strip-types .vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/witnesses/manifest-api-consumer.mjs` -> exit 0; `positiveOk=true`, `negativeOk=true`, `regressionOk=true`, `negativeCount=12`.
- `node --experimental-strip-types .vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/fix-evidence/i14a-fix-real-boundary-witness.mjs` -> exit 0; `positiveOk=true`, `negativeOk=true`, `mutationOk=true`, `regressionOk=true`.
- Final `pnpm --dir packages/adapters/pi run typecheck` -> exit 0.
- `find packages/adapters/pi/src -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) -print` -> exit 0, no output.
- Regression Node check -> exit 0; six skills exactly `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`; non-pi adapters never ready/selectable; create/import false; runtime claim `not-claimed`.
- Domain-neutrality sweep `rg -n -i 'billz|ecommerce|fashion|inventory|telegram|instagram' ...` -> exit 1, no matches.
- Final scoped inventory/status -> exit 0; I-14A owned paths and expected no-HEAD baseline shown; protected CLI/root/docs/package-manager paths remain out-of-scope baseline; no runtime/generator/loader files.
- One non-portable inventory attempt using BSD-incompatible `find -printf` failed before being rerun portably; no files changed by that failed command.

## Fix evidence artifacts
- `.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/fix-evidence/i14a-fix-real-boundary-witness.mjs`
- `.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/fix-evidence/i14a-fix-real-boundary-result.json`
- `.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/fix-evidence/i14a-fix-downstream-summary.json`

## Negative coverage
- Original eight negative classes still fail through actual API.
- New persisted negatives fail closed: runtime `proven`, missing pi skill path pattern, unsupported produced-by lane, unsupported owner lane.
- Additional fix-evidence mutations fail closed: equivalent live runtime green claim, summary invalid-runtime remap attempt, prompt-template path mismatch, harness-config missing required generated config fields, unsupported consumer lane, unsupported project-trust metadata.

## Blast-radius / dirty-tree safety
- No edits made to root package/workspace/config/lockfile, package-manager state, CLI, docs, CI, starter, `packages/adapters/pi/src/runtime/**`, `src/generators/**`, or `src/loader-witness/**`.
- Production adapter source remains TypeScript only under `packages/adapters/pi/src/**`; witness `.mjs` exists only under allowed work/fix-evidence roots.
- Validation-owned `validation-evidence/**` was read-only and not overwritten.

## Blockers / pending-live seams
- No implementation blocker remains in this fix scope.
- Live pi runtime execution remains non-green/not claimed and belongs to I-14B.
- Create/import selected-harness behavior remains not claimed and belongs to I-15A.
- I-14A remains not truth-green until independent post-fix revalidation `PASS`.
