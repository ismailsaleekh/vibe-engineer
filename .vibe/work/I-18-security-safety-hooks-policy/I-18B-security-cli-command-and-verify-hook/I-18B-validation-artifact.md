# I-18B Independent Implementation Validation Artifact

- Status: COMPLETE
- Final verdict: NEEDS-FIX
- Severity gate: one `critical` finding (production JavaScript command source). Runtime behavior witnesses otherwise passed for the bounded I-18B seams.
- Artifact path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18B-security-cli-command-and-verify-hook/I-18B-validation-artifact.md`

## Checkpoint log

1. Created this artifact and `validation-evidence/**` before product witnesses.
2. Read required source-truth excerpts and line-count evidence before product witnesses: `validation-evidence/docs/required-source-line-counts.txt`, `validation-evidence/docs/source-truth-excerpts.txt`.
3. Captured mandatory dirty-tree/path-scoped status and diff evidence before runtime witnesses: `validation-evidence/commands/mandatory-*`.
4. Inspected actual product seams read-only: security command, security fixtures, security package API, CLI loader/entry/envelope/errors, verify command, verification runner, artifacts package, sibling command patterns, and package manifests.
5. Ran mandatory syntax checks: `validation-evidence/commands/syntax-*`.
6. Performed side-effect preflight: `validation-evidence/preflight/runtime-preflight-summary.md`, `validation-evidence/preflight/runtime-script-side-effect-scan.*`.
7. Created validator-owned stronger-equivalent harness: `validation-evidence/harness/i18b-validator-runtime-witness.mjs`.
8. First harness runs failed due validator harness bugs before/at harness setup; fixed only validator-owned harness. Final harness run passed: `validation-evidence/commands/runtime-validator-harness-rerun2.*`, summary `validation-evidence/witnesses/runtime/runtime-witness-summary.json`.
9. Ran preflight-safe direct probes for build-facing consumer and default unsupported entry: `validation-evidence/commands/direct-*`.
10. Captured production JS/MJS inventory, sibling/blast-radius scans, redaction scan, command-exit summary, key source line snippets, and final status/diff evidence.

## Source-truth facts used

Evidence: `validation-evidence/docs/source-truth-excerpts.txt`, `validation-evidence/source/key-source-line-snippets.txt`, `validation-evidence/source/production-js-gate-lines.txt`.

- Locked docs require strict TypeScript/domain-neutral harness behavior, evidence over assertion, independent validation, fail-closed safety hooks, machine JSON CLI envelopes, Evidence Packets, and real-boundary witnesses.
- I-18B implementation prompt requires: `securityCommand` composable via `createCommandLoader([securityCommand])`, existing envelope/error/result-file contracts, real `@vibe-engineer/security` API consumption, domain-neutral fixtures, actual `verifyCommand`/`@vibe-engineer/verification`/Evidence Packet witness, and build-facing API fixture only with I-21 pending.
- I-18B implementation prompt forbids default shipped registration and shared/root/package-manager/CI/Pulumi/build-command edits.
- I-18A fifth post-fix revalidation is `PASS`/clean for the security package public API; I-18B/I-20 remained downstream-blocked until scheduled.
- Validation prompt production-source gate says I-18B-owned production `.js`/`.mjs` additions are `critical` unless witness/fixture-only, justified, not shipped production source, and not weakening the TypeScript invariant; it explicitly calls out `packages/cli/src/commands/security/index.js` for scrutiny.

## Files inspected

Required source truth read-only:

- `/Users/lizavasilyeva/work/harness-starter/README.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger-compact.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/handoff.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-18B-implementation.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-18B-prompt-validation-artifact.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-18B-implementation-validation.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18B-security-cli-command-and-verify-hook/I-18B-implementation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/I-18A-fifth-post-fix-revalidation-artifact.md`

Product seams inspected read-only:

- `packages/cli/src/commands/security/index.js`
- `packages/cli/src/commands/security/run-cli-witnesses.mjs`
- `packages/cli/src/commands/security/run-verify-security-hook-witness.mjs`
- `examples/starter-reference/generated-fixtures/security/**`
- `packages/security/src/index.js`, `packages/security/package.json`, selected `packages/security/fixtures/**`
- `packages/cli/src/command-loader/loader.js`
- `packages/cli/src/entry/vibe-engineer.js`
- `packages/cli/src/envelope/result-envelope.js`
- `packages/cli/src/errors/codes.js`, `packages/cli/src/errors/sanitization.js`
- `packages/cli/src/commands/verify/index.ts`
- `packages/verification/src/index.js`, selected `packages/verification/fixtures/**`
- `packages/artifacts/src/index.js`, Evidence Packet schema context
- Sibling command patterns: `doctor`, `config`, `schematic`
- Root and package manifests: root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `packages/cli/package.json`, `packages/security/package.json`

## Files changed by validator

Only validator-owned paths:

- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18B-security-cli-command-and-verify-hook/I-18B-validation-artifact.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18B-security-cli-command-and-verify-hook/validation-evidence/**`

No product files, implementation report, package manifests, lockfiles, docs, CLI loader/entry/envelope/errors, verify package, security package, CI/Pulumi/scripts, or `.git/**` were edited by this validator.

## Command list

All commands ran from cwd `/Users/lizavasilyeva/work/vibe-engineer` unless noted. For each row, evidence is under `validation-evidence/commands/<name>.command.txt|stdout|stderr|exit`.

| Command evidence name | Exit | Notes |
| --- | ---: | --- |
| `mandatory-git-status` | 0 | Required dirty-tree snapshot. |
| `mandatory-owned-find` | 0 | Required owned-path inventory. |
| `mandatory-owned-diff` | 0 | Required owned-path diff; empty because repo has no tracked HEAD. |
| `mandatory-shared-status` | 0 | Required shared-surface status. |
| `mandatory-shared-diff` | 0 | Required shared-surface diff; empty because repo has no tracked HEAD. |
| `syntax-index` | 0 | `node --check packages/cli/src/commands/security/index.js`. |
| `syntax-cli-witness` | 0 | `node --check packages/cli/src/commands/security/run-cli-witnesses.mjs`. |
| `syntax-verify-witness` | 0 | `node --check packages/cli/src/commands/security/run-verify-security-hook-witness.mjs`. |
| `syntax-hook-runner` | 0 | `node --check examples/.../security-hook-runner.mjs`. |
| `syntax-build-consumer` | 0 | `node --check examples/.../build-security-api-consumer.mjs`. |
| `syntax-validator-runtime-harness` | 0 | Validator harness syntax before first run. |
| `runtime-validator-harness` | 1 | Validator harness import path bug; pre-product-seam setup failure, fixed in owned harness only. |
| `syntax-validator-runtime-harness-rerun` | 0 | Syntax after import fix. |
| `runtime-validator-harness-rerun` | 1 | Validator harness over-redacted typed boolean inputs; fixed in owned harness only. |
| `syntax-validator-runtime-harness-rerun2` | 0 | Syntax after input-writer fix. |
| `runtime-validator-harness-rerun2` | 0 | Final real-boundary harness passed; summary in `validation-evidence/witnesses/runtime/runtime-witness-summary.json`. |
| `direct-build-facing-consumer` | 0 | Direct preflight-safe fixture invocation; stdout says `futureJoin: I-21`. |
| `direct-default-entry-security-redaction` | 2 | Expected unsupported default entry; stdout redacted argv and classification `unsupported_operation`. |
| `final-git-status` | 0 | Final dirty-tree snapshot. |
| `final-owned-find` | 0 | Final owned-path inventory. |
| `final-owned-diff` | 0 | Final owned-path diff; empty no-HEAD baseline. |
| `final-shared-status` | 0 | Final shared-surface status. |
| `final-shared-diff` | 0 | Final shared-surface diff; empty no-HEAD baseline. |
| `final-artifact-redaction-self-check` | 0 | Final artifact self-check found no raw sentinel strings in this artifact. |

Other evidence commands/scans:

- `validation-evidence/docs/required-source-line-counts.txt`
- `validation-evidence/docs/source-truth-excerpts.txt`
- `validation-evidence/preflight/runtime-script-side-effect-scan.*`
- `validation-evidence/source/key-product-file-inventory.txt`
- `validation-evidence/source/production-js-mjs-inventory.txt`
- `validation-evidence/source/key-source-line-snippets.txt`
- `validation-evidence/source/production-js-gate-lines.txt`
- `validation-evidence/scans/no-production-testing-dependency.*`
- `validation-evidence/scans/default-loader-registration-scan.*`
- `validation-evidence/scans/domain-neutral-secret-vocabulary-scan.*`
- `validation-evidence/scans/raw-sentinel-scan-classification.json`
- `validation-evidence/commands/command-exit-summary.txt`

## Side-effect preflight proof

Evidence: `validation-evidence/preflight/runtime-preflight-summary.md`, `validation-evidence/preflight/runtime-script-side-effect-scan.*`.

| Runtime witness | Preflight result | Write/delete/output targets | Ruling |
| --- | --- | --- | --- |
| `node packages/cli/src/commands/security/run-cli-witnesses.mjs` | Not license-safe direct | Hard-coded `workRoot/.vibe/.../I-18B.../evidence`; `fsp.rm(caseRoot)`, `fsp.mkdir`, `fsp.writeFile`, result files and summaries under implementation-owned `evidence/**` | Not run directly. Validator-owned stronger-equivalent harness used. |
| `node packages/cli/src/commands/security/run-verify-security-hook-witness.mjs` | Not license-safe direct | Hard-coded `workRoot/.../evidence/real-boundary/verify-security-hook`; deletes case dirs; writes runner catalogs, request-with-policy files, Evidence Packets, summaries, result files under implementation-owned `evidence/**` | Not run directly. Validator-owned stronger-equivalent harness used. |
| Validator harness `validation-evidence/harness/i18b-validator-runtime-witness.mjs` | License-safe | Deletes/creates only `validation-evidence/witnesses/runtime/**`; spawns actual product modules and runner; all result files/Evidence Packets under validation evidence | Run; final exit 0. |
| `node examples/.../build-security-api-consumer.mjs` | Read-only except stdout | No file writes/deletes found; stdout/stderr captured to validator evidence | Run direct; exit 0. |
| `node packages/cli/src/entry/vibe-engineer.js security --api-key <validator-redaction-sentinel>` | Read-only except stdout/stderr | No `--result-file`; stdout/stderr captured to validator evidence | Run direct; expected exit 2. |

## Actual changed-file / diff inspection summary

- `git status --short` shows the established no-HEAD/untracked baseline (`.gitignore`, `.vibe/`, `examples/`, `packages/`, manifests, docs, etc.). Dirty tree is not a blocker.
- Required `git diff -- ...` commands exit 0 and are empty because the repo has no tracked HEAD; file inventory/status/source inspection are the concrete carriers.
- I-18B-owned product files inventoried: `packages/cli/src/commands/security/index.js`, `packages/cli/src/commands/security/run-cli-witnesses.mjs`, `packages/cli/src/commands/security/run-verify-security-hook-witness.mjs`, and `examples/starter-reference/generated-fixtures/security/**`.
- Shared-surface status remains baseline untracked for manifests/packages/docs; no validator edit occurred outside artifact/evidence.
- No concrete ownership conflict found.

## Production JS/MJS scrutiny result

Evidence: `validation-evidence/source/production-js-mjs-inventory.txt`, `validation-evidence/source/key-source-line-snippets.txt`, `validation-evidence/source/production-js-gate-lines.txt`.

I-18B-owned `.js`/`.mjs` inventory:

- `packages/cli/src/commands/security/index.js`
- `packages/cli/src/commands/security/run-cli-witnesses.mjs`
- `packages/cli/src/commands/security/run-verify-security-hook-witness.mjs`
- `examples/starter-reference/generated-fixtures/security/runner/security-hook-runner.mjs`
- `examples/starter-reference/generated-fixtures/security/build-facing/build-security-api-consumer.mjs`

Classification:

- `packages/cli/src/commands/security/index.js` is `critical`: it is production command source, exports `securityCommand`, imports real runtime CLI/security modules, and is not witness-only or fixture-only. The production JS gate requires critical classification for production `.js`/`.mjs` additions unless all exception criteria are true; the first, third, and TypeScript-invariant criteria fail for this file.
- `packages/cli/src/commands/security/run-cli-witnesses.mjs` and `run-verify-security-hook-witness.mjs` are witness-only scripts; not classified as production command source.
- Fixture runner/build-facing `.mjs` files are fixture-only; not classified as production command source.

## Real-boundary witness matrix

Final runtime harness evidence: `validation-evidence/commands/runtime-validator-harness-rerun2.*`, `validation-evidence/witnesses/runtime/runtime-witness-summary.json`.

| Seam | Result | Evidence |
| --- | --- | --- |
| `createCommandLoader([securityCommand])` → dispatch `security` → actual `@vibe-engineer/security` → existing CLI envelope/result writer | PASS | `runtime-witness-summary.json` `cliSecurity.positiveSafe`: status `success`, securityStatus `passed`, result file under `validation-evidence/witnesses/runtime/cli-security/positive-safe/safe-result.json`. |
| Security CLI negative/fail-closed cases | PASS | `runtime-witness-summary.json` `cliSecurity.*`; per-case envelopes under `validation-evidence/witnesses/runtime/cli-security/**/envelope.json`. |
| `createCommandLoader([verifyCommand])` → actual `@vibe-engineer/verification runVerificationPlan` → runner invokes actual `@vibe-engineer/security` → Evidence Packets/result-file/envelope | PASS | `runtime-witness-summary.json` `verifySecurity.approvedSafe`: status `success`, 16 Evidence Packets, output `security-hook-result.json`. |
| Verify fail-closed cases | PASS | `verifySecurity.blockedSecurity`, `missingRequiredEvidence`, `malformedPolicy`, `malformedEvidence`, `draftPlanBlocked`, `protectedEvidenceRoot`. |
| Build-facing security API consumer fixture | PASS | Harness and direct command: `direct-build-facing-consumer.stdout` has `futureJoin: I-21`, exit 0; no build command paths touched. |
| Default shipped entry unsupported/redacted | PASS | Harness and direct command: `direct-default-entry-security-redaction.stdout`, exit 2, `unsupported_operation`, argv value redacted. |

## Positive / negative / regression matrix

### Positive cases

| Case | Result | Evidence |
| --- | --- | --- |
| Safe local/read-only request through security command loader | PASS | `runtime-witness-summary.json` `cliSecurity.positiveSafe`. |
| Safe policy/config/request produces valid envelope and valid result file | PASS | `validation-evidence/witnesses/runtime/cli-security/positive-safe/safe-result.json`. |
| Approved Verification Delta safety hook succeeds | PASS | `runtime-witness-summary.json` `verifySecurity.approvedSafe`, 16 Evidence Packets under `validation-evidence/witnesses/runtime/verify-security/approved-safe/packets/**`. |
| Build-facing consumer invokes real API and records I-21 pending | PASS | `direct-build-facing-consumer.*`, `validation-evidence/witnesses/runtime/build-facing/consumer-spawn.json`. |

### Negative / fail-closed cases

| Case | Result | Stable classification/evidence |
| --- | --- | --- |
| Unknown flags | PASS | `invalid_invocation`, `cliSecurity.unknownFlag`. |
| Unexpected positionals | PASS | `invalid_invocation`, `cliSecurity.unexpectedPositional`. |
| Secret-like CLI input | PASS | `invalid_input`, `cliSecurity.secretLikeCliInput`; output redacted. |
| Malformed request JSON | PASS | `invalid_input`, `cliSecurity.malformedRequestJson`. |
| Malformed request config | PASS | `safety_policy_block`, `cliSecurity.malformedConfig`. |
| Malformed policy | PASS | CLI `safety_policy_block`; verify `safety_policy_block`, `cliSecurity.malformedPolicy`, `verifySecurity.malformedPolicy`. |
| Malformed Evidence Packet candidate | PASS | `invalid_input`, `verifySecurity.malformedEvidence`. |
| Missing required security evidence | PASS | `missing_prerequisite`, `verifySecurity.missingRequiredEvidence`. |
| Production credential/live-secret-like defaults | PASS | blocked via safety policy; per-case envelope under `validation-evidence/witnesses/runtime/cli-security/blocked-prod-credential/envelope.json`. |
| Destructive command | PASS | `safety_policy_block`; findings include `destructive_command`/`unsafe_command_target`. |
| Unsafe env/config defaults | PASS | blocked in production-credential/external fixtures. |
| Unsafe external integration/network/live credential/budget-required operation | PASS | `safety_policy_block`; findings include `unsafe_external_integration`. |
| Path escape request file | PASS | `invalid_input`, `cliSecurity.pathEscape`. |
| Protected result-file target | PASS | `invalid_input`, `cliSecurity.protectedResultFile`. |
| Protected verify evidence root | PASS | `invalid_input`, `verifySecurity.protectedEvidenceRoot`. |

### Regression cases

| Regression | Result | Evidence |
| --- | --- | --- |
| Default shipped entry remains unsupported for `security` and redacts supplied value | PASS | `direct-default-entry-security-redaction.*`, exit 2, `unsupported_operation`, argv contains `<redacted>`. |
| No default CLI loader/entry/shared registration edit | PASS | `scans/default-loader-registration-scan.stdout` only shows `security` in later/unsupported/sanitization lists; no `securityCommand` import. Harness `defaultLoaderSecurityRegistered=false`. |
| Existing envelope/result-file/exit behavior | PASS | `regression.foundationEnvelope` exit 0/status `success`; syntax checks and envelope assertions passed. |
| Existing verify seam intact | PASS | Actual `verifyCommand` + actual runner produced valid envelopes/Evidence Packets. |
| No manifests/lockfile/root/package-manager/CI/Pulumi/build docs edits by validator | PASS | `mandatory-*` and `final-*` shared status/diff; no validator writes outside owned evidence. |
| No production dependency on `@vibe-engineer/testing` | PASS | `scans/no-production-testing-dependency.stdout` shows no production manifest dependency. |

## Redaction proof

Evidence:

- `validation-evidence/witnesses/runtime/runtime-witness-summary.json`
- `validation-evidence/scans/raw-sentinel-scan-classification.json`
- `validation-evidence/commands/direct-default-entry-security-redaction.stdout|stderr|command.txt`

Results:

- Runtime harness redaction scan reports `forbiddenProbeHits: 0` under `validation-evidence/witnesses/runtime/**`.
- Raw sentinel classification scan reports `generatedOutputHitCount: 0`.
- Raw validator/local/implementation sentinel strings appear only in command transcripts and source-truth/source-snippet metadata; product stdout/stderr/result/Evidence Packet/log outputs do not contain them.
- The default-entry product stdout redacts the validator sentinel.
- Direct default-entry stdout redacts argv as `['security', '--api-key', '<redacted>']` and stderr is empty.

## Sibling / blast-radius proof

- I-18A security API behavior remains the real consumed public API; I-18A PASS/clean artifact inspected, and runtime harness imported/used `runSecurityGate`, policy parser, enums, and redaction from the actual package.
- CLI loader/entry/default registration boundaries remain unmodified: default `createCommandLoader()` does not register `security`; entry remains unsupported for `security`.
- Verify command and verification runner evidence routing remain intact: actual `verifyCommand` and `runVerificationPlan` produced result files, Evidence Packets, sidecars, and CLI envelopes under validator-owned evidence.
- Package dependency graph: `packages/cli/package.json` depends on `@vibe-engineer/security` and `@vibe-engineer/verification`; no production `@vibe-engineer/testing` dependency found.
- Starter/reference security fixtures are domain-neutral; vocabulary scan found only a negative `productionEndpoint` fixture (`service.example.invalid`) and no business-domain/auth/provider/live-secret vocabulary needing product fix.
- I-20 surfaces remain out of scope/blocked: no `.github`, `scripts`, `infra`, root script/lockfile/manifest, build/ship/create/import, or Pulumi edit by this validator.

## Dirty-tree / shared-surface proof

- Repo is dirty/no-HEAD/untracked baseline; this is not a blocker.
- No `git stash`, `git reset`, `git clean`, `git checkout`, or `git restore` used.
- Direct implementation witness scripts were not run because preflight proved unowned implementation-evidence writes/deletes.
- Validator-owned harness deletes/writes only `validation-evidence/witnesses/runtime/**`.
- Final status/diff evidence: `validation-evidence/commands/final-*`.

## Severity-classified findings

| ID | Severity | Finding | Evidence | Required fix |
| --- | --- | --- | --- | --- |
| F1 | critical | I-18B added/owns production command source as JavaScript: `packages/cli/src/commands/security/index.js`. It exports `securityCommand` and is not witness-only or fixture-only, so it fails the mandatory production TypeScript source gate. Syntax success does not waive this. | `validation-evidence/source/production-js-mjs-inventory.txt`; `validation-evidence/source/key-source-line-snippets.txt` lines 1-23 and 330-338; `validation-evidence/source/production-js-gate-lines.txt` lines 137-148. | Replace production security command implementation with TypeScript production source (or obtain an independently validated source-invariant ruling before implementation); update witnesses/imports accordingly; rerun syntax, real-boundary, redaction, and blast-radius validation. |
| N1 | clean | Real security CLI behavior through actual loader/API/envelope/result file passed. | `runtime-validator-harness-rerun2.*`, `runtime-witness-summary.json`. | None. |
| N2 | clean | Real verify security-hook seam through actual verify command/runner/Evidence Packets passed. | `runtime-witness-summary.json`, `validation-evidence/witnesses/runtime/verify-security/**`. | None. |
| N3 | clean | Default shipped entry remains unsupported and redacted. | `direct-default-entry-security-redaction.*`. | None. |
| N4 | clean | Build-facing fixture invokes real API only and records I-21 pending. | `direct-build-facing-consumer.*`. | None. |
| N5 | clean | Redaction scan found no generated-output sentinel leaks. | `scans/raw-sentinel-scan-classification.json`, runtime summary. | None. |

## Fix requirements for NEEDS-FIX

1. Remove or replace `packages/cli/src/commands/security/index.js` as production JavaScript. The production command implementation must satisfy the TypeScript production-source invariant; witness-only `.mjs` scripts/fixtures may remain witness/fixture-only if still justified and non-shipped.
2. Preserve the passing real-boundary behavior when migrating: `createCommandLoader([securityCommand])`, actual `@vibe-engineer/security` API, existing CLI envelope/result-file writer, actual `verifyCommand`/`runVerificationPlan`, Evidence Packets, and redaction.
3. Re-run independent validation after the fix, including production JS/MJS inventory, syntax checks, validator-owned real-boundary witnesses, redaction scan, and shared-surface/blast-radius scans.

## Blockers / rulings needed

- No validation blocker remains. Verdict is `NEEDS-FIX`, not `BLOCKED`, because validation could proceed with validator-owned harnesses and found a concrete critical product-source defect.

## Final verdict

NEEDS-FIX: critical production JavaScript command source in `packages/cli/src/commands/security/index.js` violates the mandatory TypeScript production-source gate, despite runtime seams passing.
