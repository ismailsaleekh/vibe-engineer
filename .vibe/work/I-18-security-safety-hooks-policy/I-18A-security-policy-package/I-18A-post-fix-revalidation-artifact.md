# I-18A Post-Fix Revalidation Artifact

## Checkpoint 0 — initialized

Status: IN-PROGRESS
Verdict: TBD
Timestamp: 2026-06-26

Files changed by validator: this artifact only so far.
Files inspected: none yet.
Evidence: artifact created before validation work per checkpointing requirement.
Blockers: none yet.
Next step: read source-of-truth documents and prior implementation/validation/fix artifacts.

## Checkpoint 1 — source-of-truth artifacts read

Status: IN-PROGRESS
Verdict: TBD

Files changed by validator: this artifact only.
Files inspected/read: required planning docs, I-18 execution brief, I-18A implementation prompt, implementation report, original validation artifact, fix report, current ledger/status/handoff.
Evidence: reads completed via tool outputs in session; no product source inspected yet.
Blockers: none.
Next step: collect dirty-tree/path-scoped status and inspect I-18A owned product files, package manifests, I-18S carrier artifacts, and witness scripts before executing any witness that could write outside validator evidence root.

## Checkpoint 2 — dirty-tree, owned-file, and source inspection

Status: IN-PROGRESS
Verdict: TBD

Files changed by validator: this artifact plus `post-fix-revalidation-evidence/**` only.
Files inspected/read: `packages/security/src/index.js`; `packages/security/package.json`; `packages/cli/package.json`; root `package.json`; `pnpm-workspace.yaml`; CLI loader/entry/envelope/errors; I-18S validation artifact and manifest snapshots; I-18A fixture witnesses (read-only).
Evidence files:
- `post-fix-revalidation-evidence/status/git-status-short.txt` — dirty tree is untracked/no-HEAD baseline with 20 project surfaces; no clean-tree assumption.
- `post-fix-revalidation-evidence/inventory/owned-paths.txt` — I-18A owned source/evidence inventory.
- `post-fix-revalidation-evidence/diff/path-scoped-diff*.txt|patch` — empty git diff due untracked no-HEAD repo; validation uses actual file contents plus I-18S snapshots.
- `post-fix-revalidation-evidence/source/function-lines.txt` — load-bearing policy/redaction/evaluation functions located.
- `post-fix-revalidation-evidence/blast-radius/security-reference-sweep.txt` — preliminary adjacent reference sweep.
Important inspection note: lane-owned package fixture witnesses write to the original implementation evidence root, so this revalidator will not execute those scripts directly; independent witness scripts will be written/executed under the validator-only evidence root.
Blockers: none.
Next step: run real-boundary package/CLI-context imports, syntax checks, independent positive/negative/redaction/contracts/bounded-input witnesses, and regression/blast-radius commands without product writes.

## Checkpoint 3 — witnesses and checks executed

Status: IN-PROGRESS
Verdict: NEEDS-FIX (provisional)

Files changed by validator: this artifact plus `post-fix-revalidation-evidence/**` only.
Commands/evidence:
- `post-fix-revalidation-evidence/package-checks/node-checks.txt` — `node --check` passed for `packages/security/src/index.js`, lane-owned fixtures, and validator witness.
- `post-fix-revalidation-evidence/real-boundary/package-context-import.*` — actual package-context import of `@vibe-engineer/security` exited `0` and exercised `__i18aCliBoundarySmoke`.
- `post-fix-revalidation-evidence/real-boundary/cli-context-import.*` — actual `packages/cli` context import through I-18S dependency/export seam exited `0`.
- `post-fix-revalidation-evidence/negative/post-fix-adversarial-witness.*` — independent 74-case witness exited `1` with 8 fail-open failures.
- `post-fix-revalidation-evidence/redaction/generated-output-sentinel-scan.txt` — generated outputs (excluding validator witness source/sentinel scan logs) contain no fake secret sentinels.
- `post-fix-revalidation-evidence/regression/default-security-command-*` — shipped default `security` command remains `unsupported_operation`, exit `2`, with raw `--api-key` sentinel redacted.
- `post-fix-revalidation-evidence/regression/unauthorized-surface-regression.txt` — I-18B/CI/Pulumi/scripts/infra surfaces absent; CLI/security manifests and lockfile match I-18S post-snapshots.
- `post-fix-revalidation-evidence/regression/top-level-testing-dependency-sweep.json` — no top-level production `@vibe-engineer/testing` dependency.
- `post-fix-revalidation-evidence/package-checks/pnpm-list-security-depth0.*` — package listing command exited `0`.
Key failed witness cases:
1. Unsafe command-policy relaxations are accepted: policy allows `network_external_mutation`, `credential_operation`, and `unknown` command classifications.
2. Unsafe path-policy relaxation is accepted: policy can remove required protected path prefixes.
3. With the unsafe command policy, a `curl -X POST https://...` command classified as `network_external_mutation` returns `passed/allow`.
4. With the unsafe path policy, `package.json` target returns `passed/allow`.
5. Malformed external integration boolean fields supplied as strings return `passed/allow`.
6. Malformed sandbox `provider`/`claim` types with status `unknown` return `passed/allow`.
Closed original findings evidence: traversal/absolute path, malformed command/target, unknown enum values, blocked/pending-live sandbox, array-contained config secret, circular/BigInt evidence, redaction, and real import boundaries all passed in the same adversarial witness.
Blockers: none to validation; product still has fixable security false-green defects.
Next step: finalize blast-radius/status evidence, classify severity, and write final artifact verdict with exact root-cause fixes required.

## Checkpoint 4 — final classification

Status: COMPLETE
Verdict: NEEDS-FIX
Severity: critical
Validated scope: `I-18A-security-policy-package` post-fix revalidation only.

Validator write scope used:
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/I-18A-post-fix-revalidation-artifact.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/post-fix-revalidation-evidence/**`

Product/source writes by validator: none. No stash/reset/clean/checkout/restore, package-manager mutation, commit, push, product edit, manifest edit, lockfile edit, CI/Pulumi/script/doc edit, or I-18B/I-12/I-13/I-20 edit was used.

Final dirty-tree evidence:
- `post-fix-revalidation-evidence/final/final-dirty-tree-proof.txt`
- Dirty tree remains the expected no-HEAD/untracked baseline plus validator-owned artifact/evidence. No concrete ownership conflict found.

### Closure check for original validation findings

| Original finding | Post-fix result | Evidence |
| --- | --- | --- |
| F1 path containment terminal traversal/Windows absolute | CLOSED for tested direct policy/default cases | adversarial witness path cases all pass except unsafe policy relaxation case below |
| F2 malformed command/target inputs | CLOSED for command schema cases | adversarial witness malformed command/argv/target/declaredWritePaths/workingDirectory/unknown field cases pass |
| F3 permissive policy enum/list values | PARTIALLY CLOSED, still critical for unsafe command policy/path relaxations | unsafe command classifications and empty protected path policy accepted |
| F4 `blocked/pending-live` sandbox green | CLOSED for status and policy list | pending-live sandbox claim blocks; pending-live policy status rejects |
| F5 config arrays missed | CLOSED | secret in config array blocks and redacts |
| F6 circular/BigInt evidence throws | CLOSED | circular/BigInt/symbol/function/large evidence fail closed without throw |

### Validation matrix

| Check | Result | Evidence |
| --- | --- | --- |
| Actual package-context import/export/API | pass | `post-fix-revalidation-evidence/real-boundary/package-context-import.*` exit `0` |
| Actual CLI package context import through I-18S carrier | pass | `post-fix-revalidation-evidence/real-boundary/cli-context-import.*` exit `0`; I-18S validation artifact read |
| Positive safe local/read-only/env/config/external/advisory cases | pass | `post-fix-revalidation-evidence/negative/post-fix-adversarial-witness-summary.json` |
| Required negative direct command/path/secrets/prod/destructive/external/pending-live/evidence cases | pass for default-policy/direct cases | same summary |
| Unsafe policy fail-closed | fail | unsafe command/path policy relaxations accepted |
| Malformed external/sandbox typed input fail-closed | fail | malformed external boolean strings and sandbox provider/claim types pass as green |
| Redaction/audit/bounded inputs | pass for tested outputs | adversarial witness + `redaction/generated-output-sentinel-scan.txt` |
| Default shipped security command remains unsupported | pass | `regression/default-security-command-assertion.json` |
| No I-18B/I-12/I-13/I-20/CI/Pulumi/root/package-manager/lockfile/shared build/export/package manifest edits by I-18A fix | pass | `regression/unauthorized-surface-regression.txt`; manifests/lockfile match I-18S snapshots |
| Package syntax/list consistency | pass | `package-checks/node-checks.txt`; `package-checks/pnpm-list-security-depth0.*` |
| Sibling/blast-radius sweep | completed | `blast-radius/security-reference-sweep.txt`; `blast-radius/sibling-sweep.txt` |

### Findings

| ID | Severity | Finding | Evidence | Required root-cause fix |
| --- | --- | --- | --- | --- |
| PF1 | critical | `parseSecurityPolicy` accepts unsafe command-classification policy relaxations (`network_external_mutation`, `credential_operation`, `unknown`). With such a policy, a mutating external command (`curl -X POST https://...`) classified as `network_external_mutation` returns `passed/allow`. | `post-fix-revalidation-evidence/negative/post-fix-adversarial-witness-summary.json`; source near `parseSecurityPolicy` and `evaluateCommandSafety`. | Restrict policy `allowedCommandClassifications` to the safe I-18A subset (`read_only`, `local_deterministic_write`) unless a future typed approval model exists; independently hard-block credential, production-impacting, repository-state, destructive, unknown, and external-mutation command classifications regardless of policy relaxation; add regression cases. |
| PF2 | critical | `parseSecurityPolicy` accepts `protectedPathPrefixes: []`; with that policy, a protected target (`package.json`) returns `passed/allow`. | same summary; source near `parseSecurityPolicy` and `isUnsafePathTarget`. | Treat required protected path prefixes as non-removable mandatory policy floor or reject policies that omit/relax them; path evaluator must always block root/home/traversal/.git/root manifests/lockfile/CLI protected paths independent of custom policy; add regression cases. |
| PF3 | critical | External integration entries are not strictly typed: boolean fields supplied as strings are ignored and can produce `passed/allow`. | same summary; source near `evaluateExternalIntegrationSafety`. | Validate every external integration field type (`id`, `mode`, booleans) and fail closed with stable classification for malformed entries before applying defaults; do not coerce/ignore non-boolean approval/credential/network fields. |
| PF4 | critical | Sandbox capability entries are not strictly typed: malformed `provider`/`claim` values with allowed status `unknown` produce `passed/allow`. | same summary; source near `evaluateSandboxCapability`. | Validate sandbox claim schema (`provider`, `status`, `claim` strings and no unknowns) and fail closed for malformed provider/claim fields; keep `unknown` honest but not a bypass for malformed/overclaiming data. |

### Severity rationale

Severity is `critical` because I-18A is a security/safety policy package and remaining defects are deterministic false-greens in load-bearing policy seams: unsafe policy relaxations can allow external mutation and protected-path targeting, and malformed external/sandbox typed inputs can be accepted as green. These are fixable within I-18A-owned `packages/security/src/**`, fixtures, and evidence paths; I-18B must remain blocked.

### Final routing

NEEDS-FIX. I-18A is not truth-green after the post-validation fix. Fix PF1–PF4 at root cause, add targeted regression fixtures/witnesses, then rerun independent post-fix revalidation.
