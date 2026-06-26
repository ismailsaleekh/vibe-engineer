# I-00A Fix Report

Status: DONE for implementation; independent validation required.

## Files inspected
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/impl-q01-fix-brief-generated.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/impl-q01-fix-brief-validation.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/impl-q01-fix-brief-generate-report.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/impl-q01-fix-brief-validate-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/I-00A-validation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/implementation-report.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/impl-q01-brief-generated.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/impl-q01-brief-validation.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-revalidation.md`
- `/Users/lizavasilyeva/work/harness-starter/README.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00B-governance-baseline/I-00B-validation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-01A-artifact-schemas/I-01A-validation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/package.json`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/witnesses/workspace-surface-witness.mjs`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/fixtures/README.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/fixtures/valid-workspace/package.json`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/fixtures/valid-workspace/packages/artifacts/package.json`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/fixtures/fake-cli-bin/packages/cli/package.json`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/ownership/I-00A-workspace-package-skeleton.md`

## Files changed
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/I-00A-fix-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/witnesses/workspace-surface-witness.mjs`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/fixtures/README.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/fixtures/valid-workspace-with-artifacts-source/**`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/fixtures/future-non-pi-adapter/**`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/fixtures/wrong-root-name/**`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/fixtures/non-private-root/**`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/evidence/fix/**`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/ownership/I-00A-workspace-package-skeleton.md`

No root `package.json` edit was needed.

## Ownership / conflict inventory
- Owned write paths per validated fix brief: root `package.json` script metadata only; I-00A witness; I-00A fixtures; I-00A fix evidence; this report; optional I-00A ownership note.
- Read-only/untouchable package source includes `packages/artifacts/**` and all other product package subtrees; no write command targeted those paths.
- I-00B is PASS and path-disjoint. I-01A is still `NEEDS-FIX`; this fix does not claim I-01A green.
- Current target inventory evidence: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/evidence/fix/sibling-blast-radius.txt` confirms `packages/artifacts/{README.md,src,schemas}` present and `packages/core`, `apps`, `examples`, `.github`, `scripts`, and root `node_modules` absent.
- Path-scoped dirty/status evidence: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/evidence/fix/path-scoped-status.txt`.
- No concrete ownership conflict found.

## Root-cause summary
- Validation F-1: current root `workspace:surface` false-reds with `PACKAGE_SOURCE_CREATED` for sibling-owned `packages/artifacts` source even though real pnpm workspace graph is green.
- Root cause: the current root witness conflated the initial skeleton snapshot invariant (package dirs contain only `package.json`) with the stable post-handoff current workspace surface contract.

## Semantic change implemented
- `workspace-surface-witness.mjs` now has explicit modes: default `current-surface` and opt-in `skeleton-snapshot` via `--mode skeleton-snapshot` or `--skeleton-snapshot`.
- Default `current-surface` still runs the real `pnpm -r list --depth -1 --json` graph and all stable I-00A root/package checks: root identity/private/license/package manager, strict root configs, required package manifests/names/private posture, CLI identity, test-only `@vibe-engineer/testing`, no production dependency on testing, no `packages/core`, no future non-pi adapters, and no fake CLI bin.
- Default `current-surface` no longer rejects downstream-owned package source after handoff.
- The skeleton-only package directory source invariant remains enforced only in explicit `skeleton-snapshot` mode with failure code `PACKAGE_SOURCE_CREATED`.
- Ownership note now records current-surface vs skeleton-snapshot handoff semantics.

## Evidence command table

All commands ran from `/Users/lizavasilyeva/work/vibe-engineer` unless otherwise noted. Per-command `.cmd.txt`, `.stdout`, `.stderr`, and `.exit` files are under `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/evidence/fix/`. Aggregate table: `command-summary.json`.

| Witness | Command | Exit | Evidence stem |
| --- | --- | ---: | --- |
| Real package-manager graph | `pnpm -r list --depth -1 --json` | 0 | `pnpm-workspace-graph-direct.*` |
| Root script graph | `pnpm run workspace:graph` | 0 | `root-script-workspace-graph.*` |
| Current root surface script | `pnpm run workspace:surface` | 0 | `root-script-workspace-surface.*` |
| Direct current witness | `node .vibe/work/I-00A-workspace-package-skeleton/witnesses/workspace-surface-witness.mjs --root .` | 0 | `direct-current-surface.*` |
| Valid fixture current mode | `node .../workspace-surface-witness.mjs --root .../fixtures/valid-workspace` | 0 | `fixture-valid-workspace-current.*` |
| Downstream artifact source regression, current mode | `node .../workspace-surface-witness.mjs --root .../fixtures/valid-workspace-with-artifacts-source` | 0 | `fixture-artifacts-source-current.*` |
| Downstream artifact source regression, skeleton snapshot mode | `node .../workspace-surface-witness.mjs --root .../fixtures/valid-workspace-with-artifacts-source --mode skeleton-snapshot` | 1 (expected) | `fixture-artifacts-source-skeleton-snapshot.*` |
| Missing package negative | `node .../workspace-surface-witness.mjs --root .../fixtures/missing-package` | 1 (expected) | `negative-missing-package.*` |
| `packages/core` negative | `node .../workspace-surface-witness.mjs --root .../fixtures/packages-core` | 1 (expected) | `negative-packages-core.*` |
| Production dependency on testing negative | `node .../workspace-surface-witness.mjs --root .../fixtures/testing-prod-dependency` | 1 (expected) | `negative-testing-prod-dependency.*` |
| Fake CLI bin negative | `node .../workspace-surface-witness.mjs --root .../fixtures/fake-cli-bin` | 1 (expected) | `negative-fake-cli-bin.*` |
| Future non-pi adapter negative | `node .../workspace-surface-witness.mjs --root .../fixtures/future-non-pi-adapter` | 1 (expected) | `negative-future-non-pi-adapter.*` |
| Wrong root name negative | `node .../workspace-surface-witness.mjs --root .../fixtures/wrong-root-name` | 1 (expected) | `negative-wrong-root-name.*` |
| Non-private root negative | `node .../workspace-surface-witness.mjs --root .../fixtures/non-private-root` | 1 (expected) | `negative-non-private-root.*` |
| Sibling/blast-radius inventory | Python/finder inventory in evidence runner | 0 | `sibling-blast-radius.txt`, `owned-fix-inventory.txt` |
| Path-scoped dirty status | `git status --short --untracked-files=all -- ...` and `git diff --name-status -- ...` (read-only) | 0 | `path-scoped-status.txt` |

## Positive current-tree graph/surface proof
- Direct pnpm graph proof exit 0; `graph-summary.json` records 19 entries: root plus all 18 required workspace packages.
- `pnpm run workspace:graph` exit 0 and emitted the same root/package workspace graph.
- `pnpm run workspace:surface` exit 0 on the actual dirty target tree; stdout records `{ "ok": true, "mode": "current-surface", "requiredPackageCount": 18, "failures": [] }`.
- Direct witness command exit 0 and uses the same actual witness file and actual pnpm graph boundary.

## Root-failure-class regression proof
- Added fixture `valid-workspace-with-artifacts-source` with downstream-owned files under `packages/artifacts/{README.md,src,schemas,fixtures}`.
- Default current-surface witness against that fixture exits 0 and emits no `PACKAGE_SOURCE_CREATED`: `fixture-artifacts-source-current.*`.
- Explicit skeleton-snapshot mode against the same fixture exits 1 with `PACKAGE_SOURCE_CREATED` for `packages/artifacts`: `fixture-artifacts-source-skeleton-snapshot.*`.

## Negative witnesses preserved
- Missing package fails with `PACKAGE_MANIFEST_MISSING`.
- Added `packages/core` fails with `FORBIDDEN_CORE_PACKAGE`.
- Production dependency on `@vibe-engineer/testing` fails with `TESTING_PRODUCTION_DEPENDENCY`.
- Fake CLI bin pointing at absent file fails with `FAKE_CLI_BIN`.
- Future non-pi adapter path fails with `FORBIDDEN_FUTURE_ADAPTER`.
- Wrong root package name fails with `ROOT_PACKAGE_NAME`.
- Non-private root fails with `ROOT_PACKAGE_PRIVATE`.

## Dirty-tree and sibling safety notes
- No forbidden git mutation command was used. Only read-only `git status`/`git diff` status evidence was captured.
- No `packages/artifacts/**`, I-00B governance file, product package source, root lockfile/config, `.git`, `apps`, `examples`, `.github`, or `scripts` path was edited by this fix.
- `packages/artifacts/**` remains present for I-01A and is still not represented as green; `I-01A-validation-report.md` remains `Final verdict: NEEDS-FIX`.
- I-00B validation report remains PASS.
- `packages/core`, `apps`, `examples`, `.github`, `scripts`, and root `node_modules` remain absent.

## Blockers / pending-live seams
- None for this I-00A fix. The real package-manager graph and current root `workspace:surface` witnesses ran successfully.
- Downstream remains blocked on independent revalidation of I-00A and separate I-01A fix/revalidation; this fix does not unblock I-01A-dependent lanes.

## Residual risks
- Implementer did not self-validate. Independent validator must inspect actual changed files and rerun graph/surface/regression/negative/sibling witnesses.

## Next required independent validation
- Inspect path-scoped changed owned files and diffs/inventory.
- Rerun direct `pnpm -r list --depth -1 --json`, `pnpm run workspace:graph`, exact current `pnpm run workspace:surface`, direct witness, downstream-source regression, and all negative fixtures.
- Confirm no out-of-license writes and that I-01A remains NEEDS-FIX.

## Final implementer status
DONE — direct pnpm graph, root `workspace:graph`, and current-tree root `workspace:surface` ran and exited 0; source-handoff regression and original/added negatives produced expected exits.
