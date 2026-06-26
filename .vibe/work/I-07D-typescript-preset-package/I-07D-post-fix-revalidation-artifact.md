# I-07D Post-Fix Revalidation Artifact

- verdict: PASS
- severity: clean
- report: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-07D-typescript-preset-package/I-07D-post-fix-revalidation-report.md`

## Product files inspected

- `packages/presets/typescript/package.json`
- `packages/presets/typescript/tsconfig.json`
- `packages/presets/typescript/src/index.ts`
- `packages/presets/typescript/templates/strict-tsconfig-base.json`
- `packages/presets/typescript/templates/package-tsconfig.json`
- `packages/presets/typescript/templates/eslint-policy.json`
- `packages/presets/typescript/templates/prettier-defaults.json`
- `packages/presets/typescript/templates/pnpm-workspace-defaults.json`
- `packages/presets/typescript/templates/turbo-task-defaults.json`
- `packages/presets/typescript/templates/package-script-defaults.json`
- `packages/presets/typescript/templates/test-typecheck-defaults.json`
- `packages/presets/typescript/fixtures/consumer/public-api-consumer.ts`
- `packages/presets/typescript/fixtures/witnesses/run-typescript-preset-witness.mjs`
- `packages/presets/typescript/fixtures/generated/strict-project/**` via full byte comparison against independent renderer output.
- Read-only contract/blast-radius surfaces: root `tsconfig.base.json`, root/package-manager/shared/sibling status scopes, `packages/standards/**`, I-07C reports/evidence.

## Validator files/evidence written

All validator writes stayed under I-07D-owned post-fix paths:

- `I-07D-post-fix-revalidation-report.md`
- `I-07D-post-fix-revalidation-artifact.md`
- `post-fix-validator-evidence/scoped-inspection.log`
- `post-fix-validator-evidence/i07d-validator-start-marker`
- `post-fix-validator-evidence/i07d-post-fix-validator-witness.mjs`
- `post-fix-validator-evidence/node-check-witness.log`
- `post-fix-validator-evidence/witness-run.log`
- `post-fix-validator-evidence/i07d-post-fix-validator-witness-failure.json` (harness bug run only)
- `post-fix-validator-evidence/node-check-witness-rerun.log`
- `post-fix-validator-evidence/witness-run-rerun.log`
- `post-fix-validator-evidence/i07d-post-fix-validator-witness-result.json`
- `post-fix-validator-evidence/witness-result-summary.log`
- `post-fix-validator-evidence/final-blast-radius.log`
- `post-fix-validator-evidence/product-fixture-compare.log`
- `post-fix-validator-evidence/standards-regression/standards-witness-result.json`
- `post-fix-validator-fixtures/**`
- `post-fix-validator-compiled/**`

## Command evidence summary

- Scoped inspection/status/static scan: cwd `/Users/lizavasilyeva/work/vibe-engineer`, exit 0, evidence `post-fix-validator-evidence/scoped-inspection.log`.
- Witness syntax check: exit 0, evidence `post-fix-validator-evidence/node-check-witness-rerun.log`.
- Independent real-boundary witness: cwd `/Users/lizavasilyeva/work/vibe-engineer`, exit 0, evidence `post-fix-validator-evidence/witness-run-rerun.log` and `i07d-post-fix-validator-witness-result.json`.
  - package typecheck 0; validator-owned package-name consumer typecheck 0; workdir package-name runtime import 0; compile actual source to workdir 0; generated fixture tsc 0; standards regression 0.
  - root bare runtime import from repo root 1 (`@vibe-engineer/preset-typescript` not root-linked); not used as green evidence, workdir package-name link and compiled runtime import passed.
- Final blast-radius audit: exit 0, evidence `post-fix-validator-evidence/final-blast-radius.log`.
- Product fixture compare: exit 0, evidence `post-fix-validator-evidence/product-fixture-compare.log`.

## Original-defect revalidation matrix

| Original defect | Independent result |
| --- | --- |
| F-CRITICAL-01 quick-gate deploy acceptance | Fixed. Generic deploy, deploy prefix/suffix aliases, `pulumi:deploy`, `pulumi up`, auto-deploy, production deploy, publish, full E2E, full mobile E2E, and full visual/UI defaults all reject with `PRESET_FORBIDDEN_DEFAULT_COMMAND`; safe `defaultAutoDeploy:false` metadata accepts. |
| F-MAJOR-01 actual ESLint/Prettier config weakening | Fixed. Mutating actual `eslint.config.mjs` while policy JSON stayed green rejects missing no-explicit-any, no-unsafe-return, and ban-ts-comment/no-escape rules with `PRESET_ESLINT_RULE_MISSING`; `prettier.config.mjs` `export default {};` rejects with `PRESET_PRETTIER_DEFAULT_MISSING`. |
| F-MAJOR-02 manifest/content exact contract | Fixed. Wrong file kind, generated manifest missing kind, empty/missing standard ids, stale kind mismatch, unknown manifest/generated paths, duplicate normalized path, missing required file, and missing ownership/consumer notes all reject with stable manifest/path codes. |
| F-MAJOR-03 renderer options boundary | Fixed. Unknown property, wrong `includeSampleSource` type, null/non-object options, traversal/absolute packageDirectory, unsafe package name, and testing package name throw `TypeScriptPresetOptionsError` with `PRESET_MALFORMED_RENDER_OPTIONS`; options validator returns typed finding. |

## Positive / real-boundary results

- Actual package source typechecked under `packages/presets/typescript/tsconfig.json`.
- Validator-owned TypeScript consumer imported `@vibe-engineer/preset-typescript` by package name through workdir-only link and typechecked.
- Actual source compiled to `post-fix-validator-compiled/**`; compiled runtime API imported and exercised.
- Actual renderer wrote 12 files under `post-fix-validator-fixtures/strict-generated-project/**`; actual readback matched bytes.
- Generated paths were normalized/relative and stayed inside fixture root.
- Generated `tsconfig.base.json` and package `tsconfig.json` parsed and preserved required strict flags/extends.
- Actual preset validator accepted good generated fixture; actual TypeScript compiler consumed generated fixture sample source.
- Templates parsed and aligned with manifest/default contracts; product generated fixture is byte-identical to independent renderer output.
- Defensive copy/freeze checks for manifest outputs passed.
- Generated package/script/Turbo quick defaults are quick/local and do not run full E2E/mobile/visual/deploy/publish/Pulumi by default.

## Negative/regression results

Passed fail-closed: 38 validator mutations plus 8 renderer malformed-option cases. Covered all required deploy, config, manifest, options-boundary, strict flag, package-tsconfig, missing-file, malformed JSON, domain vocabulary, traversal/absolute path, and `@vibe-engineer/testing` production dependency cases with stable codes.

## Dirty-tree and blast-radius conclusion

- Repo remains no-HEAD/broad-untracked baseline; scoped diffs were empty.
- `package.json` remains `private:true`; no dependency fields were added; exports/scripts point at real owned source/witness files.
- Product `src/**` is TypeScript-only; no product `dist/**`/`build/**` output found.
- Marker sweeps show this validator did not write `packages/presets/typescript/**`, `.vibe/work/I-07C-standards-package/**`, or `packages/standards/**`; all validator writes after the marker are I-07D post-fix report/evidence/fixtures/compiled files.
- No prohibited git or package-manager mutation command was used.

## I-07C sibling / truth-green conclusion

- Adjudication ruling read and recorded: `ACCEPT_FOR_REVALIDATION`.
- I-07C post-fix report/artifact still state PASS/clean/truth-green.
- Intact I-07C fix and validation evidence copies are readable; witness hashes for report/artifact/fix-evidence/validation-evidence were unchanged before/after standards regression.
- Standards regression was run with `I07C_EVIDENCE_DIR` redirected to `post-fix-validator-evidence/standards-regression`; no I-07C workdir or standards product files were modified.

## Standards-package compatibility conclusion

PASS. All 7 I-07D referenced standard ids exist in the actual I-07C standards API and validate; redirected standards regression witness exits 0.

## Downstream feed decision

I-07D may feed downstream planning/implementation for I-07B, I-15A/I-15B, and I-20 without caveat for this lane scope.

## Findings

none
