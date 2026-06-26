# I-07B Built-in Schematics Fixtures Validation Artifact

verdict: NEEDS-FIX
severity: critical + major-local + minor-local
report: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-07B-built-in-schematics-fixtures/I-07B-validation-report.md`

## Findings

| ID | Severity | Finding | Exact evidence | Required fix scope |
| --- | --- | --- | --- | --- |
| F-CRITICAL-01 | critical | New production code is JavaScript: `packages/schematics/src/builtins/index.js`. The validation prompt requires production code to be TypeScript unless the validated brief explicitly justified a witness-only exception; the `.mjs` witness is fixture-only, but this file is under `src/**`. | `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/inspection/static-sweep.json` reports `productionJsMjs: ["packages/schematics/src/builtins/index.js"]`; node-check evidence confirms it is checked as JS. | Convert lane-owned built-in catalog/contract production source to TypeScript with a real typecheck witness, or obtain an explicit HLO/brief ruling before revalidation. Keep executable `.mjs` only in fixture/witness paths. |
| F-MAJOR-01 | major-local | Standards content is not consumed/fail-closed at the real generation boundary. A valid `standardId` with forged `standardTitle`/`standardSummary` applies successfully and emits forged content. This false-greens the standards contract seam. | Command `node .vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/inspection/adversarial-contract-probe.mjs` exit `2`; result JSON shows `actualStatus: "ok"` and generated body contains `Forged title not returned by I-07C` and `Forged summary not returned by I-07C` while actual `standardsApi.loadStandard("domain-neutral-core")` returned different title/summary. | Derive or validate standard content from the actual I-07C API in the built-in production boundary; add negative witnesses for valid ID + mismatched content. Apply the same fail-closed approach to preset-derived expectations where applicable. |
| F-MINOR-01 | minor-local | `module` manifest duplicates `deterministic-schematics` in DL-08 `standardIds`. | `.vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/inspection/static-sweep.json`, `manifestRows[0].duplicateStandardIds: ["deterministic-schematics"]`. | Remove duplicate and add uniqueness assertion in witness/static checks. |

## Evidence summary

- Required independent commands passed:
  - `node-check`: exit `0`, checked `packages/schematics/src/builtins/index.js` and `packages/schematics/fixtures/builtins/run-builtins-witnesses.mjs`.
  - Built-ins real-boundary witness: exit `0`, summary `ok: true` for RB1/P1/P2/N1/N2/N3/N4/N5 under validation evidence.
  - I-07A engine regression: exit `0`, summary `ok: true` for generation seam.
- Dirty-tree scope: final scoped status shows I-07B-owned product paths and lane work root only for this lane; root/package/lockfile/CLI-loader/shared paths remain ambient broad untracked baseline already present before I-07B product edits.
- Sibling sweep: I-07A/I-07C/I-07D artifacts read as PASS/clean; I-07A RB4 default binary remains pending-live and was not claimed green.
- Safety: no validator product edits, no secrets found, no `@vibe-engineer/testing` imports, no prohibited git/package-manager/destructive operations used.

## Validation matrix

- Built-in catalog shape: PASS with minor duplicate noted.
- Real I-07A manifest/engine/template witness: PASS for implementer cases.
- Standards/preset consumption: FAIL due forged standards content acceptance.
- Deterministic positive/negative/regression witnesses: PARTIAL; required witness passes, adversarial negative fails.
- TypeScript production-code invariant: FAIL critical.
- Docs/schema/contracts consistency: PARTIAL; manifests validate, but standards content contract is not enforced.

No product fixes were made by this validator.
