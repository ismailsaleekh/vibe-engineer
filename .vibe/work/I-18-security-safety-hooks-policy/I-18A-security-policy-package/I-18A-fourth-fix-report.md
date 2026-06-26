# I-18A Fourth Fix Report

## Status log
- Stage 0 report-first checkpoint: IN PROGRESS. Created report before source inspection/edits. Owned write paths acknowledged: packages/security/src/**, packages/security/fixtures/**, optional packages/security/tests/**, this report, fourth-fix-evidence/**, and six exact existing I-18A summary side-effect files for rerunning existing witnesses only. Next: read source-of-truth list.

## Files inspected
- See stages 1, 3, 5, and 6 for full source-truth, product source/fixture, witness, and scope inspections.

## Files changed
- See stages 4, 5, and 6 for final changed-file inventory.

## Evidence
- See `fourth-fix-evidence/**` and stages 2, 5, and 6 for command captures and exit codes.

## Blockers
- None.

## Validation boundary
- Implementer DONE is not validation PASS; I-18B remains blocked pending independent I-18A revalidation PASS.

## Stage 1 — required source-of-truth read
Status: COMPLETE. Read required sources before product edits.

Citations / extracted requirements:
- `quality-bar.md`: perfect solution only; dirty-tree safety; report-first checkpointing; implementer must not self-validate; real-boundary proof required.
- `ledger-compact.md`, `status.md`, `handoff.md`: I-18A is non-green after third revalidation; I-18B remains blocked; dirty no-HEAD tree is baseline; no cleanup/reset/stash.
- `I-18-security-safety-hooks-policy-brief-generated.md`: I-18 split is I-18S -> I-18A -> I-18B; I-18A owns security package source/fixtures/tests and must prove package/CLI package context imports; I-18B/default CLI support is out of scope.
- Prior prompts/reports (`I-18A-implementation.md`, first/second/third fix prompts and reports): I-18A security package must be typed, deterministic, fail-closed, redacting, and preserve prior F1-F6/PF1-PF4/SPF2/SPF3 closures.
- `I-18A-validation-artifact.md`: original F1-F6 were path containment, malformed carriers, permissive policy enums, pending-live sandbox, missed config arrays, unbounded evidence.
- `I-18A-post-fix-revalidation-artifact.md`: PF1-PF4 were unsafe command policy relaxation, removable protected floor, malformed external booleans, malformed sandbox claim fields.
- `I-18A-second-post-fix-revalidation-artifact.md`: SPF1-SPF3 were command-string secret omission, incomplete path canonicalization, and missing mandatory protected floor.
- `I-18A-third-fix-report.md` and `third-fix-evidence/negative/third-fix-adversarial-witness-summary.json`: third fix covered 44 cases but did not include embedded flag-only/split command-carrier SPF1 cases.
- `I-18A-third-post-fix-revalidation-artifact.md`: binding remaining defect TPR1/SPF1-incomplete: public package import allows `command: "node --api-key"` with empty or split argv and `command: "node --client-secret"` with split value; root cause is whole-carrier token scanning only, not typed command-carrier token stream scanning across `command` and `argv`.

Files inspected in this stage: all 19 required source-truth artifacts listed in the prompt, plus current handoff/status/ledger continuation relevant to I-18A routing.
Files changed in this stage: this report only.
Blockers: none.
Next step: capture baseline dirty-tree/scope evidence, inspect I-18A-owned product source/fixtures and existing witness side effects.

## Stage 2 — baseline dirty-tree/scope evidence
Status: COMPLETE.

Commands captured under `fourth-fix-evidence/baseline/`:
- `git status --short` -> `git-status-short.stdout|stderr|exit` (exit recorded).
- `find packages/security .vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package -maxdepth 6 -type f | sort` -> `owned-paths-before.stdout|stderr|exit`.
- `git diff -- packages/security .vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package` -> `scoped-diff-before.stdout|stderr|exit`.

Files inspected in this stage: path-scoped dirty-tree/status/inventory/diff outputs.
Files changed in this stage: this report and `fourth-fix-evidence/baseline/**`.
Owned/read-only/untouchable confirmation: evidence writes stayed under fourth-fix evidence root; no product edits yet; no git cleanup/reset/stash/checkout/restore.
Blockers: none.
Next step: inspect security source/fixtures and existing witness script write side effects before edits/reruns.

## Stage 3 — product source/fixtures and existing witness side-effect inspection
Status: COMPLETE.

Files inspected:
- `packages/security/src/index.js`
- `packages/security/fixtures/policy/witness.mjs`
- `packages/security/fixtures/contracts/witness.mjs`
- `packages/security/fixtures/redaction/witness.mjs`
- `packages/security/fixtures/real-boundary/package-api/witness.mjs`
- `packages/security/fixtures/real-boundary/cli-package-context-import/witness.mjs`
- `packages/security/package.json` was kept read-only by path rule (package API/export context only).

Existing witness side-effect confirmation before rerun:
- `policy/witness.mjs` writes only `evidence/positive/policy-positive-summary.json` and `evidence/negative/policy-negative-summary.json` under already-existing I-18A evidence dirs.
- `contracts/witness.mjs` writes only `evidence/contracts/contract-negative-summary.json`.
- `redaction/witness.mjs` writes only `evidence/redaction/redaction-summary.json`.
- `real-boundary/package-api/witness.mjs` writes only `evidence/real-boundary/package-api/package-api-summary.json`.
- `real-boundary/cli-package-context-import/witness.mjs` writes only `evidence/real-boundary/cli-package-context-import/cli-package-context-summary.json`.
These are exactly the six prompt-authorized existing summary side-effect files; no witness script edit was needed to route outputs.

Root-cause notes:
- Current `evaluateCommandSafety` creates carrier tokens as whole `command` plus whole `argv` entries, so `command: "node --api-key"` is tested only as one full string and misses embedded flag token `--api-key`.
- Current logic blocks an argv token that itself starts with `-` and has a secret-like key, proving inconsistent carrier handling across `command` and `argv`.
- Required design: introduce a bounded typed command-carrier tokenizer over explicit inputs (`command` string and `argv` string array), producing a deterministic token stream with source locations, then scan flag keys/inline values/adjacent values across `command` and `argv` before any allow.

Files changed in this stage: this report only.
Blockers: none.
Next step: implement SPF1 root-cause typed command-carrier model and add lane-owned real command-carrier fixture/witness files.

## Stage 4 — implementation and fourth-fix fixtures
Status: COMPLETE.

Files changed:
- `packages/security/src/index.js`
- `packages/security/fixtures/policy/witness.mjs`
- `packages/security/fixtures/policy/fourth-fix-command-carriers/embedded-api-key-flag.json`
- `packages/security/fixtures/policy/fourth-fix-command-carriers/split-api-key-value.json`
- `packages/security/fixtures/policy/fourth-fix-command-carriers/split-client-secret-value.json`
- `packages/security/fixtures/policy/fourth-fix-command-carriers/embedded-api-key-inline.json`
- `packages/security/fixtures/policy/fourth-fix-command-carriers/argv-adjacent-api-key.json`
- `packages/security/fixtures/policy/fourth-fix-command-carriers/positive-safe-argv.json`
- `packages/security/fixtures/policy/fourth-fix-command-carriers/witness.mjs`
- this report

Root-cause design summary:
- Added bounded typed command-carrier token stream construction from explicit inputs: whitespace-tokenized `command` string tokens plus `argv` tokens, with source locations and caps.
- Added typed secret flag parsing for command-carrier tokens (`--api-key`, `--client-secret`, `--token`, and existing secret-like key set via `isSecretLikeKey`) with inline `=`/`:` value and adjacent next-token value modeling.
- `evaluateCommandSafety` now scans the full token stream before allow: embedded flags in `command`, inline key/value, adjacent argv key/value, and split command/argv carriers block with stable `secret_like_value`.
- Details for adjacent/split values use secret-keyed fields so non-secret-looking fake values such as `abc123` are redacted from generated outputs/evidence.
- Existing SPF2 path canonicalization and SPF3 mandatory protected floor logic was not weakened.

Fourth-fix real policy-input files/witness:
- Added lane-owned JSON carrier fixtures under `packages/security/fixtures/policy/fourth-fix-command-carriers/**` for all mandatory examples.
- Added fixture witness `packages/security/fixtures/policy/fourth-fix-command-carriers/witness.mjs` that reads those actual files and exercises the public `@vibe-engineer/security` API.
- Witness writes only `fourth-fix-evidence/negative/fourth-fix-command-carriers-summary.json`.

Files inspected this stage: source/fixtures listed above.
Blockers: none.
Next step: run syntax, existing lane witnesses, real-boundary imports, fourth-fix adversarial witness, SPF2/SPF3/prior regression witnesses, redaction/scope checks with captures under fourth-fix evidence.

## Stage 5 — syntax, real-boundary, adversarial, and regression witnesses
Status: COMPLETE.

Witness matrix (all stdout/stderr/exit captured under `fourth-fix-evidence/**`; exit `2` for default shipped CLI is expected/required unsupported-operation behavior):

| Area | Command / witness | Evidence path | Exit |
| --- | --- | --- | --- |
| Syntax/package consistency | `node --check` for `packages/security/src/index.js`, five existing fixture witnesses, and `packages/security/fixtures/policy/fourth-fix-command-carriers/witness.mjs` | `fourth-fix-evidence/syntax/node-checks.*` | 0 |
| Syntax/package consistency | `node --check fourth-fix-evidence/negative/fourth-fix-regression-witness.mjs` | `fourth-fix-evidence/syntax/fourth-fix-regression-witness-check.*` | 0 |
| Existing lane policy witness | `node packages/security/fixtures/policy/witness.mjs` | `fourth-fix-evidence/witnesses/policy-witness.*`; authorized side effects: `evidence/positive/policy-positive-summary.json`, `evidence/negative/policy-negative-summary.json` | 0 |
| Existing lane contracts witness | `node packages/security/fixtures/contracts/witness.mjs` | `fourth-fix-evidence/witnesses/contracts-witness.*`; authorized side effect: `evidence/contracts/contract-negative-summary.json` | 0 |
| Existing lane redaction witness | `node packages/security/fixtures/redaction/witness.mjs` | `fourth-fix-evidence/witnesses/redaction-witness.*`; authorized side effect: `evidence/redaction/redaction-summary.json` | 0 |
| Existing package API fixture witness | `node packages/security/fixtures/real-boundary/package-api/witness.mjs` | `fourth-fix-evidence/real-boundary/package-api/witness.*`; authorized side effect: `evidence/real-boundary/package-api/package-api-summary.json` | 0 |
| Existing CLI package-context fixture witness | `node packages/security/fixtures/real-boundary/cli-package-context-import/witness.mjs` | `fourth-fix-evidence/real-boundary/cli-package-context-import/witness.*`; authorized side effect: `evidence/real-boundary/cli-package-context-import/cli-package-context-summary.json` | 0 |
| Real package API import | from `packages/security`, `await import('@vibe-engineer/security')` + `__i18aCliBoundarySmoke()` | `fourth-fix-evidence/real-boundary/package-api/package-context-import.*` | 0 |
| Real CLI package-context import | from `packages/cli`, `await import('@vibe-engineer/security')` + smoke | `fourth-fix-evidence/real-boundary/cli-package-context-import/cli-context-import.*` | 0 |
| Real package API SPF1 public-boundary command carrier | from `packages/security`, public import checks exact three TPR1 false-greens and positive safe carrier | `fourth-fix-evidence/real-boundary/package-api/fourth-command-carrier-public-import.*` | 0 |
| CLI package-context SPF1 command carrier | from `packages/cli`, public import checks exact three TPR1 false-greens and positive safe carrier | `fourth-fix-evidence/real-boundary/cli-package-context-import/fourth-command-carrier-cli-context.*` | 0 |
| Mandatory real policy-input command-carrier files / adversarial witness | `node packages/security/fixtures/policy/fourth-fix-command-carriers/witness.mjs` reads actual JSON fixtures and exercises `@vibe-engineer/security` | `fourth-fix-evidence/negative/fourth-fix-command-carriers-witness.*`; summary `fourth-fix-evidence/negative/fourth-fix-command-carriers-summary.json` | 0 |
| SPF2/SPF3/prior closure regression witness | `node fourth-fix-evidence/negative/fourth-fix-regression-witness.mjs` | `fourth-fix-evidence/negative/fourth-fix-regression-witness.*`; summary `fourth-fix-evidence/negative/fourth-fix-regression-witness-summary.json` | 0 |
| Default shipped CLI unsupported | `node packages/cli/src/entry/vibe-engineer.js security --api-key <fake>` | `fourth-fix-evidence/regression/default-security-command.*` | 2 expected |
| Unauthorized surface/scope sweep | diff/existence/manifest snippet sweep for protected/root/CLI/I-18B/shared surfaces | `fourth-fix-evidence/regression/unauthorized-surface-regression.*` | 0 |
| No production testing dependency | package manifest sweep for `dependencies['@vibe-engineer/testing']` | `fourth-fix-evidence/regression/top-level-testing-dependency-sweep.*` | 0 |
| Generated-output secret scan | `rg` for fake sentinels/`abc123`, excluding witness source/fixture input/sentinel logs | `fourth-fix-evidence/regression/generated-output-sentinel-scan.*` | 0 |

Coverage notes:
- Exact TPR1 false-greens now block with `secret_like_value`: `command: "node --api-key", argv: []`; `command: "node --api-key", argv: ["abc123"]`; `command: "node --client-secret", argv: ["abc123"]`.
- Embedded flag keys without values (`--api-key`, `--token`) and split non-secret-looking values block; existing argv-only and argv-adjacent cases still block; inline fake sentinel values block and redact.
- Safe positive command carrier represented as `command: "node"` plus safe `argv` against a lane-owned non-protected fixture passes.
- SPF2 regression witness blocks `C:outside`, `C:../outside`, `C:/Users/outside`, `C:\\Users\\outside`, `//server/share`, `\\\\server\\share`, `~`, `~/secret`, `~user/.ssh/config`, dot aliases, traversal, POSIX absolute, root, empty, malformed double segment.
- SPF3 regression witness blocks root manifests/lock/workspace/turbo, `.git/config`, CLI/security package manifests, CLI loader/entry/envelope/errors/testing paths, and direct unsafe policy floor removal.
- Prior F1-F6/PF1-PF4 closures remain covered by existing lane witnesses and fourth-fix regression witness: unsafe command relaxation, malformed external booleans, malformed sandbox provider/claim, pending-live sandbox, malformed command/argv/target arrays, secret arrays, circular/BigInt evidence all fail closed.
- Default shipped `security` command remains `unsupported_operation` with secret-like argv redacted; this fix does not claim shipped `vibe-engineer security` support.

Files changed in this stage: this report; `fourth-fix-evidence/syntax/**`, `witnesses/**`, `real-boundary/**`, `negative/**`, `regression/**`; six exact existing I-18A lane summary side-effect files listed above.
Blockers: none.
Next step: final dirty-tree/scope proof and handoff.

## Stage 6 — final dirty-tree/scope proof
Status: COMPLETE.

Final evidence:
- `git status --short` -> `fourth-fix-evidence/final/git-status-short.stdout|stderr|exit` (exit 0).
- `find packages/security .vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package -maxdepth 6 -type f | sort` -> `fourth-fix-evidence/final/owned-paths-after.stdout|stderr|exit` (exit 0).
- `git diff -- packages/security .vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package` -> `fourth-fix-evidence/final/scoped-diff.stdout|stderr|exit` (exit 0; repo remains no-HEAD/untracked baseline, so actual file inventory/source inspection is the evidence carrier).
- Consolidated exit summary: `fourth-fix-evidence/final/exit-code-summary.txt`.
- Source line anchors: `fourth-fix-evidence/source/changed-source-lines.stdout`.

Owned/read-only/untouchable confirmation:
- Product edits were confined to `packages/security/src/**` and `packages/security/fixtures/**`.
- Fourth-fix report/evidence writes were confined to this report and `fourth-fix-evidence/**`, except the six exact authorized existing witness summary side-effect files.
- No edits to `packages/security/package.json`, `packages/cli/package.json`, root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, CLI loader/entry/envelope/errors/testing/default registration, verification/mechanical/testing/artifacts, I-18S, I-18B, I-12/I-13/I-20, CI/Pulumi/scripts/docs, or package-manager state.
- No `git stash/reset/clean/checkout/restore`, commit, push, package-manager mutation, or broad format/fix command used.

Files changed by this fourth fix:
- `packages/security/src/index.js`
- `packages/security/fixtures/policy/witness.mjs`
- `packages/security/fixtures/policy/fourth-fix-command-carriers/*.json`
- `packages/security/fixtures/policy/fourth-fix-command-carriers/witness.mjs`
- `.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/I-18A-fourth-fix-report.md`
- `.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/fourth-fix-evidence/**`
- Authorized existing summary side effects only: `evidence/positive/policy-positive-summary.json`, `evidence/negative/policy-negative-summary.json`, `evidence/contracts/contract-negative-summary.json`, `evidence/redaction/redaction-summary.json`, `evidence/real-boundary/package-api/package-api-summary.json`, `evidence/real-boundary/cli-package-context-import/cli-package-context-summary.json`.

## Blockers
None encountered. No correct root-cause fix required non-owned paths, dependency/export/build/package-manager/root/manifest/lockfile/CLI loader/default-registration/shared package/docs/CI/Pulumi/I-18B/I-12/I-13/I-20 edits.

## Final handoff
Status: DONE for implementer scope only. SPF1 embedded secret flags and split command-carrier key/value cases are fixed at root cause with typed command-carrier token stream scanning and real public package/CLI package-context witnesses. SPF2/SPF3 and prior I-18A findings remain covered by regression witnesses. Implementer `DONE` is not validation `PASS`; I-18B remains blocked pending independent I-18A revalidation PASS.
