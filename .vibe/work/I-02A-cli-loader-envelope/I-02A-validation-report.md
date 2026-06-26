# I-02A CLI Loader/Envelope Independent Validation Report

- Validator: independent adversarial Triad-B
- Target repo: `/Users/lizavasilyeva/work/vibe-engineer`
- Report path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-02A-cli-loader-envelope/I-02A-validation-report.md`
- Final verdict: **NEEDS-FIX**
- Highest severity: **critical**

## 0. Report-first / dirty-tree safety

- Report created first on 2026-06-24 before product reads or witnesses in this validator session.
- Validator writes were confined to this report and `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-02A-cli-loader-envelope/evidence/validation/**`.
- No product/source/root/package manifest edits were made by this validator.
- No forbidden git/package-manager mutation was used: no `stash/reset/clean/checkout/restore`, no commit/push, no `pnpm install/add/update/remove`, no manual symlink/link-state edits.
- `bg_status` at start and final check: no background tasks in this Pi extension runtime.
- Dirty tree is broad untracked/greenfield. `git diff` cannot prove attribution because files are untracked; validation used scoped status, inventories, checksums, actual file inspection, provider link-state reads, and independent witnesses.

Initial/final evidence:
- `evidence/validation/initial-status.txt`
- `evidence/validation/initial-status-summary.txt`
- `evidence/validation/final-inventory-status.txt`
- `evidence/validation/final-inventory-summary.txt`
- `evidence/validation/final-checksums.txt`

## 1. Files inspected

Required orchestration/prompts/reports:
- `prompts/quality-bar.md`, `status.md`, `handoff.md`, targeted `ledger.md` excerpts.
- `implementation-briefs/ta-i-02a-brief-generated.md`.
- `reports/ta-i-02a-brief-validation.md`.
- `prompts/i-02a-finisher-execute.md`.
- `reports/i-02a-finisher-wrapper-validation.md`.
- `reports/post-q05-i02a-i08-blocker-adjudication.md`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/post-q05-root-provider-unit/validation-report.md`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-02A-cli-loader-envelope/I-02A-implementation-report.md`.

Product/source/contracts:
- `packages/cli/package.json`
- `packages/cli/src/entry/vibe-engineer.js`
- `packages/cli/src/envelope/result-envelope.js`
- `packages/cli/src/command-loader/loader.js`
- `packages/cli/src/errors/codes.js`
- `packages/cli/src/testing/run-witnesses.mjs`
- `packages/config/package.json`, `packages/config/src/index.js`, I-01B validation report.
- `packages/artifacts/package.json`, `packages/artifacts/src/index.js`, `packages/artifacts/src/validation.js`.
- `docs/decisions/DL-01-repo-package-structure.md`, `DL-02-artifact-schemas.md`, `DL-07-cli-primitives.md` targeted excerpts.
- Root package scripts and workspace surface witness script before running read-only workspace witnesses.

## 2. Commands / evidence

| Command / witness | cwd | Exit | Evidence |
| --- | --- | ---: | --- |
| `bg_status` | Pi runtime | 0 | no background tasks visible |
| scoped `git status`, inventory, checksums | target root | 0 | `initial-status.txt`, `initial-status-summary.txt` |
| targeted ledger/decision excerpt scans | target/orchestration paths | 0 | `ledger-targeted-excerpts.txt`, `decision-targeted-excerpts.txt` |
| `node --check` over all I-02A `.js/.mjs` CLI source files | target root | 0 | `node-check-summary.txt` + per-file stdout/stderr |
| validator-owned harness `node evidence/validation/validation-harness.mjs` | shell launched with absolute path; harness spawns from target root and `packages/cli` | 0 (harness completed; summary `ok:false`) | `validation-harness.stdout`, `validation-harness.stderr`, `validation-harness.exit`, `harness/summary.json`, per-case `harness/*.cmd.txt/*.stdout/*.stderr/*.exit` |
| direct executable bin path `packages/cli/src/entry/vibe-engineer.js version --json --non-interactive` | target root | 0 | `direct-bin-entry.*`, `entry-mode.txt` |
| `pnpm run workspace:graph` | target root | 0 | `workspace-graph.*` |
| `pnpm run workspace:surface` | target root | 0 | `workspace-surface.*` |
| provider link-state `readlink/realpath` | target root | 0 | `provider-link-state.txt` |
| final scoped status/inventory/checksums | target root | 0 | `final-inventory-status.txt`, `final-inventory-summary.txt`, `final-checksums.txt` |

Package-local `pnpm --filter vibe-engineer test` was **not** run because `packages/cli/src/testing/run-witnesses.mjs` hard-codes `rmSync(evidenceRoot)` for `.vibe/work/I-02A-cli-loader-envelope/evidence/package-test`, which would overwrite implementation evidence outside validator-owned evidence. Equivalent validator-owned real-boundary harness was run instead.

## 3. Actual file / inventory analysis

- `packages/cli/package.json` has public package name `vibe-engineer`, ESM `type: module`, bin `vibe-engineer -> ./src/entry/vibe-engineer.js`, package exports for entry/envelope/command-loader, test script, and only the root/provider PASS workspace dependencies `@vibe-engineer/artifacts` and `@vibe-engineer/config`. No devDependencies or new unauthorized deps.
- CLI source inventory contains only owned subtrees: `entry`, `envelope`, `command-loader`, `errors`, `testing`.
- `packages/cli/src/commands/**`: absent.
- `packages/core`: absent.
- CLI imports providers by public package specifier (`@vibe-engineer/config`, `@vibe-engineer/artifacts` in test only); no relative provider import found.
- Later command-family names appear only in `LATER_COMMANDS` fail-closed rejection list and validator/test witnesses, not as payload implementations.
- Root/provider/sibling checksum comparison showed root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, provider manifests, context/orchestration/mechanical-gates/registry manifests stable during validation. Broad untracked sibling work remains expected dirty-tree baseline.
- CLI provider link state is real pnpm link state: `packages/cli/node_modules/@vibe-engineer/config -> ../../../config`; `@vibe-engineer/artifacts -> ../../../artifacts`.

## 4. Contract comparison

Clean portions:
- DL-07 envelope version is exactly `vibe-engineer.cli.result.v1`; status union code is `success|failure|blocked|partial`.
- Exit/status mapping code covers `0..8` with `partial=8`; validation witnesses confirm success, deterministic failure, invalid invocation, invalid config/missing prerequisite, write conflict, internal validator path, and partial.
- `payload.kind` / `payload.schemaVersion` are present in witnessed success/failure/blocked/partial envelopes.
- Stdout machine carrier emits exactly one JSON envelope except explicit quiet result-file mode.
- Result-file carrier writes matching envelope by temp-file then rename in source; positive witness confirmed stdout/result structural equality and no leftover temp.
- Config seam uses actual `@vibe-engineer/config` public loaders for `--config` and `--project-root`; valid/malformed/missing/unsupported witnesses passed.
- Artifact provider API is reachable; minimal I-02A commands accept no DL-02 artifact inputs, so artifact validation is not load-bearing.
- Command loader registers only `help`, `version`, `foundation`; unknown/later command names fail closed.

Contract failures:
- Secret-like inline unknown flags leak the secret value into `diagnostics[].message`, `errors[].message`, and `errors[].details.flag` in machine stdout/result carrier. This violates the brief and DL-07 requirement that secrets never appear in argv, diagnostics, errors, artifacts, stdout, result files, or logs.
- Local envelope validator accepts malformed non-success envelopes lacking stable diagnostic/error code evidence, and accepts diagnostic classifications outside the stable DL-07 classification set. This weakens the typed consumer seam.

## 5. Real-boundary witness table

| Required seam | Result | Evidence / notes |
| --- | --- | --- |
| Provider import seam | PASS | `harness/provider-import-package-local.*` and `provider-import-pnpm-filter.*` import actual public `@vibe-engineer/config` loaders and `@vibe-engineer/artifacts.validateArtifactFile`. |
| Package entrypoint / binary process seam | PASS with non-blocking bin-shim note | Direct executable bin path and `pnpm --filter vibe-engineer exec node src/entry/vibe-engineer.js ...` passed. `pnpm --filter vibe-engineer exec vibe-engineer ...` exited 254 command not found (`package-manager-bin-smoke.*`); classified acceptable/non-load-bearing because self-bin shim is not materialized without install/global link mutation, while declared bin file is executable and actual entry process boundary passed. |
| Stdout envelope seam | PASS for normal cases; FAIL for secret-redaction case | Normal witnesses have exactly one JSON envelope and no stderr. Secret inline cases are valid JSON but contain leaked secret canary in message/details before evidence redaction. |
| Result-file carrier seam | PASS normal; secret result command failed before file write | `harness/result-file-positive.*` and `result-file-positive.json` are structurally equal; quiet mode file valid; invalid path returns typed `write_conflict`. |
| Envelope validator seam | FAIL | `harness/envelope-validator-and-loader-public-export.stdout` shows valid envelopes accepted and many malformed envelopes rejected, but `badDiagnosticClassification:true` and `failureWithoutErrors:true`. |
| Config seam | PASS | `config-success-file`, `config-success-project-root`, `malformed-config`, `missing-config-project-root`, `unsupported-harness-config`, `unsupported-config-format` all use actual config provider through CLI. |
| Artifact seam | PASS/N-A | `artifact-provider-reachability.*` confirms API reachable; loader/entry expose no DL-02 artifact input/list command in I-02A. |
| Command-loader seam | PASS | `help` lists only foundation commands; unknown/later/unknown flag/missing value/duplicate/malformed metadata witnesses pass typed fail-closed checks. |
| Partial non-green seam | PASS | `partial-non-green.*`: exit `8`, status `partial`, `payload.data.partial` with blocking incomplete scope and `partial_incomplete`. |
| Secret redaction seam | FAIL | `secret-inline-flag.*`, `secret-inline-result-file.*`, `harness/summary.json`; evidence files redact the synthetic canary but record that raw process carrier contained it. |

## 6. Positive / negative / regression witness summary

Positive witnesses:
- `node --check`: all five CLI source/test files exit 0.
- Direct executable bin path `version`: exit 0, `status: success`, no stderr.
- `help`: exit 0, lists exactly `foundation`, `help`, `version`.
- Result-file positive and quiet-result-file positive: valid envelopes under validator evidence.
- Valid config by explicit `--config` and `--project-root`: exit 0 and metadata reflects path/root.

Negative witnesses:
- Unknown command -> exit 2, `blocked`, `invalid_invocation`.
- Later commands `create`, `doctor`, `config` -> exit 2, `blocked`, `unsupported_operation`.
- Unknown global flag / command flag, missing result-file value, missing config value, invalid foundation status, unexpected positional -> typed exit 2 envelopes.
- Missing config, malformed config JSON, unsupported harness, unsupported format -> typed exit 3 config/prerequisite envelopes via actual config loader.
- Invalid result-file path -> exit 5, `blocked`, `write_conflict`, no target file.
- Simulated foundation failure -> exit 1, `failure`, `deterministic_failure`.
- Malformed partial variants rejected.
- Duplicate command id and malformed metadata throw stable typed loader errors.

Regression / blast radius:
- `packages/cli/package.json` is the only I-02A manifest changed; root/lock/workspace/provider/sibling manifests were not mutated by this validator and checksums remained stable during validation.
- `packages/cli/src/commands/**` absent; no `packages/core`.
- Workspace graph and workspace surface scripts exit 0.
- Provider source/manifests inspected read-only; no provider source mutation by I-02A found.

## 7. Findings

| ID | Severity | Finding | Evidence | Required fix scope |
| --- | --- | --- | --- | --- |
| F-01 | critical | Secret-like inline unknown flags are redacted in `invocation.argv` but leak the secret value into machine-envelope diagnostic/error message/details, hence stdout/result carriers are not secret-safe. | `harness/summary.json` records `secret-redaction-inline-unknown-flag`; redacted process evidence in `harness/secret-inline-flag.stdout` and `harness/secret-inline-result-file.stdout`; source path `packages/cli/src/entry/vibe-engineer.js` returns invalid flag message/details with raw token. | I-02A-owned CLI arg/error redaction paths (`entry`, possibly `errors/envelope`). |
| F-02 | major-local | Typed envelope validator accepts a diagnostic classification outside the stable DL-07 classification set. Consumers could accept malformed classifications instead of branching on stable contracts. | `harness/envelope-validator-and-loader-public-export.stdout` has `badDiagnosticClassification:true`; validator source only checks classification is non-empty string. | I-02A-owned `packages/cli/src/envelope/result-envelope.js` / classifications. |
| F-03 | major-local | Typed envelope validator accepts a `failure` envelope with empty `diagnostics[]` and `errors[]`, leaving no stable code/classification evidence for a non-success status. | `harness/envelope-validator-and-loader-public-export.stdout` has `failureWithoutErrors:true`; DL-07 requires stable diagnostic/error codes/classifications for consumers. | I-02A-owned `packages/cli/src/envelope/result-envelope.js`. |

## 8. Residual root/package-manager classification

No root/package-manager ruling is needed to fix the blocking findings. Provider deps/link state are real and pass. The missing `pnpm --filter vibe-engineer exec vibe-engineer` self-bin shim is recorded as an acceptable non-load-bearing residual because fixing/materializing it would require install/link-state/global package-manager mutation outside this validator license, while the package declares the bin and the executable package-local entry boundary passes.

## Final verdict

**NEEDS-FIX** — critical secret-redaction failure plus major-local typed envelope validator gaps. Fixes appear confined to I-02A-owned CLI source paths; no out-of-license ruling is required.
