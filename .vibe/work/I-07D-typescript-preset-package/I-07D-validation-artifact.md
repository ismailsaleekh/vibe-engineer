# I-07D Validation Artifact

- verdict: NEEDS-FIX
- severity: critical
- validator: independent Triad-B validation
- report: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-07D-typescript-preset-package/I-07D-validation-report.md`

## Product files inspected

- `packages/presets/typescript/package.json`
- `packages/presets/typescript/tsconfig.json`
- `packages/presets/typescript/src/index.ts`
- `packages/presets/typescript/templates/{strict-tsconfig-base.json,package-tsconfig.json,eslint-policy.json,prettier-defaults.json,pnpm-workspace-defaults.json,turbo-task-defaults.json,package-script-defaults.json,test-typecheck-defaults.json}`
- `packages/presets/typescript/fixtures/consumer/public-api-consumer.ts`
- `packages/presets/typescript/fixtures/witnesses/run-typescript-preset-witness.mjs`
- `packages/presets/typescript/fixtures/generated/strict-project/**` via full inventory and comparison to independent renderer output
- Read-only context: root manifest/workspace/turbo/tsconfig, standards package manifest/API/witness, required HLO docs/reports/prompts.

## Validator files/evidence written

All validator writes stayed under `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-07D-typescript-preset-package/**`, including:

- `I-07D-validation-report.md`
- `I-07D-validation-artifact.md`
- `evidence-01-requirements-wc.log` through `evidence-09-focused-source-lines.log`
- `validator-witnesses/i07d-validator-witness.mjs`
- `validator-evidence/i07d-validator-witness-result.json`
- `validator-evidence/standards-regression/standards-witness-result.json`
- `validator-fixtures/**`
- `validator-compiled/**`

## Command evidence summary

- Requirements inventory: exit 0, `evidence-01-requirements-wc.log`.
- Requirement theme sweep: exit 0, `evidence-02-requirements-rg.log`.
- Scoped status/diff/inventory: exit 0, `evidence-03-status-inventory.log`.
- Static source/template scans: exit 0, `evidence-04-static-inspection.log`.
- Validator witness syntax: exit 0, `evidence-05-node-check-validator-witness.log`.
- Independent real-boundary witness: exit 1, `evidence-06-validator-witness-run.log`, detailed JSON `validator-evidence/i07d-validator-witness-result.json`.
  - Internal positives passed: package typecheck 0; validator-owned package consumer typecheck 0; package compile to workdir 0; workdir package-name runtime import 0; generated fixture `tsc --noEmit` 0; standards regression 0.
  - Internal root bare import from repo root failed 1 because package is not a root dependency/link; workdir package-name consumer import passed using actual package export.
- Final dirty-tree/write audit: exit 0, `evidence-07-final-dirty-tree-audit.log`.
- Product generated fixture compare: exit 0, `evidence-08-product-fixture-compare.log`.
- Focused source-line evidence: exit 0, `evidence-09-focused-source-lines.log`.

## Positive / real-boundary results

Passed:

- Actual package source + product fixture consumer typecheck under strict root baseline.
- Validator-owned consumer imported `@vibe-engineer/preset-typescript` by package name through a workdir-only package link and typechecked.
- Actual source compiled to `validator-compiled/**`; compiled API rendered 12 files.
- Actual renderer wrote strict fixture under `validator-fixtures/strict-project/**`; actual consumer read files back from disk.
- Generated paths were relative/safe; generated `tsconfig.base.json` preserved required strict flags; package tsconfig extended `../../tsconfig.base.json`.
- Actual validator accepted the generated/readback fixture.
- Actual TypeScript compiler consumed generated `packages/example/tsconfig.json` and sample source.
- Product generated fixture matched independent renderer output exactly.
- Defensive manifest copy check passed.
- Standards compatibility passed: all 7 manifest standard ids exist and validate; standards regression witness exit 0 with evidence redirected to the I-07D workdir.

## Negative/regression results

Passed fail-closed negatives included strict weakening, missing required strict flags, package tsconfig not extending strict base, policy-level ESLint/Prettier weakening, unsafe/absolute/duplicate paths, missing required file, malformed JSON, domain-specific term, full E2E/mobile/visual quick-gate terms, `pulumi up`, production `@vibe-engineer/testing`, and malformed validator input.

Failed fail-closed negatives are findings below.

## Findings

### F-CRITICAL-01 — validator accepts deploy wiring in default quick gate

- severity: critical
- evidence:
  - `validator-evidence/i07d-validator-witness-result.json` → `unexpectedNegativePasses` shows `quick gate generic deploy default` accepted with no findings.
  - Same evidence shows `quick gate pulumi deploy alias default` accepted with no findings.
  - `evidence-09-focused-source-lines.log`: `src/index.ts:258` defines limited forbidden terms; `src/index.ts:729`/`:737` validates by scanning only those terms.
- impact: unsafe generated quick/local defaults with deploy wiring can be validator-green, violating the required fail-closed quick-gate/deploy contract.

### F-MAJOR-01 — actual ESLint/Prettier config weakening is accepted when policy JSON is stale

- severity: major-local
- evidence:
  - `validator-evidence/i07d-validator-witness-result.json` → `unexpectedNegativePasses` shows `eslint config missing no-explicit-any while policy stale` accepted.
  - Same evidence shows `prettier config missing deterministic settings while policy stale` accepted.
  - `evidence-09-focused-source-lines.log`: validation calls policy JSON only at `src/index.ts:847-848`, not the generated `eslint.config.mjs` / `prettier.config.mjs` content.
- impact: generated config can lose required no-escape/no-unsafe lint and deterministic formatting enforcement while validator remains green.

### F-MAJOR-02 — manifest/content mismatch validation is incomplete

- severity: major-local
- evidence:
  - `validator-evidence/i07d-validator-witness-result.json` → `unexpectedNegativePasses` shows accepted `file manifest kind mismatch`, `file manifest standardIds emptied`, and `generated manifest omits kind field`.
  - `evidence-09-focused-source-lines.log`: `src/index.ts:822-826` checks only `manifest.outputPath` plus globally known kind; `src/index.ts:756`/`:853` generated manifest validation records paths only.
- impact: downstream consumers cannot trust manifest kind/standards metadata as an exact typed contract.

### F-MAJOR-03 — renderer options boundary is not typed/fail-closed

- severity: major-local
- evidence:
  - `validator-evidence/i07d-validator-witness-result.json` → `rendererOptions` shows unknown option and wrong `includeSampleSource` type silently accepted; null/path traversal/testing package options throw generic untyped errors with no stable code.
  - `evidence-09-focused-source-lines.log`: `src/index.ts:548-550` accepts `RenderTypeScriptPresetOptions` and directly reads properties instead of `unknown` + named runtime guard/result.
- impact: public renderer boundary lacks stable typed malformed-option findings/errors required for downstream I-07B/I-15/I-20 consumers.

## Dirty-tree / blast-radius conclusion

- Validator wrote only under the I-07D workdir.
- No prohibited git or package-manager mutation command was used; grep over validator logs/scripts found none.
- Product `src` has no JS/MJS/CJS and no product `dist/**`/`build/**` output.
- Package remains `private:true` with no dependency fields.
- Repo has no HEAD and broad expected untracked baseline; scoped inventories show I-07D surfaces plus baseline root/sibling untracked entries, with no tracked diff available. No evidence from validation indicates root/shared/sibling mutation by I-07D.

## Standards-package compatibility conclusion

PASS for this seam: all I-07D referenced standard ids exist in the actual I-07C standards API and validate; I-07C post-fix artifact is PASS/clean/truth-green; standards regression witness exit 0 under I-07D evidence redirection.

## Downstream feed decision

I-07D must not feed I-07B, I-15A/I-15B, or I-20 directly. The critical/major fail-closed contract defects must be fixed and independently revalidated before downstream planning/implementation relies on this preset.
