# I-18A Independent Validation Artifact

Verdict: NEEDS-FIX
Severity: critical
Validated scope: `I-18A-security-policy-package` only.
Updated: 2026-06-26

## Scope / license

- Owned validator write paths used:
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/I-18A-validation-artifact.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/validation-evidence/**`
- Product source/config/manifests were read-only. No product source edits were made by this validator.
- No `git stash`, `git reset`, `git clean`, `git checkout`, `git restore`, commit, push, package-manager mutation, or broad format/fix command was used.
- Dirty tree is treated as baseline; current repo has no HEAD and all top-level surfaces are untracked.

## Checkpoints

### Checkpoint 0 — artifact created first

- Status: complete.
- Evidence: this artifact was created before source inspection or validation commands.

### Checkpoint 1 — required source-of-truth read

Files inspected read-only:
- `/Users/lizavasilyeva/work/harness-starter/README.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-18-security-safety-hooks-policy-brief-generated.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-18-implementation-lane-readiness-extract.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-18-lane-readiness-extract-validation-artifact.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18S-validation-artifact.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-18A-prompt-validation-artifact.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-18A-implementation.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/I-18A-implementation-report.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger-compact.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/handoff.md`
- Additional relevant product decision: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-22-security-safety-model.md`

Key requirements extracted:
- I-18A must implement fail-closed typed `@vibe-engineer/security` policy/gate/redaction APIs only under owned paths.
- I-18A must prove actual package import and actual CLI-package-context import through the I-18S dependency/export seam.
- Unsafe paths, malformed command/target inputs, secrets, production credentials, destructive/external operations, unsupported/fake sandbox claims, and pending-live/blocking conditions must fail closed with stable classifications and redacted evidence.
- Inputs must be bounded and evidence/redaction carriers must not throw or leak secrets.
- I-18B/I-12/I-13/I-20, CI/Pulumi/scripts/root/package-manager/lockfile/shared build/export/CLI manifest surfaces must remain untouched.

### Checkpoint 2 — dirty-tree, owned-file, and source inspection

Evidence:
- `validation-evidence/status/git-status-short.txt` — repo dirty/untracked baseline.
- `validation-evidence/inventory/owned-paths.txt` — I-18A owned product/work inventory.
- `validation-evidence/diff/path-scoped-diff-name-status.txt` and `validation-evidence/diff/path-scoped-diff.patch` — path-scoped diff evidence; empty because repo has no tracked HEAD.
- `validation-evidence/contracts/source-function-lines.txt` — source function locations:
  - `redactSecurityValue` line 177;
  - `parseSecurityPolicy` line 242;
  - `evaluateCommandSafety` line 342;
  - `isUnsafePathTarget` line 389;
  - `scanKeyValueRecord` line 410;
  - `evaluateSandboxCapability` line 460;
  - `evaluateEvidenceSafety` line 481.

Changed/owned implementation files inspected:
- `packages/security/src/index.js`
- `packages/security/fixtures/policy/witness.mjs`
- `packages/security/fixtures/redaction/witness.mjs`
- `packages/security/fixtures/contracts/witness.mjs`
- `packages/security/fixtures/real-boundary/package-api/witness.mjs`
- `packages/security/fixtures/real-boundary/cli-package-context-import/witness.mjs`
- I-18A implementation evidence/report root.

### Checkpoint 3 — real-boundary and positive witnesses

Positive/real-boundary commands:
- Package context import: `cd packages/security && node --input-type=module -e "import('@vibe-engineer/security')..."` → exit `0`; evidence `validation-evidence/real-boundary/package-context-import.txt`.
- CLI package context import through I-18S seam: `cd packages/cli && node --input-type=module -e "import('@vibe-engineer/security')..."` → exit `0`; evidence `validation-evidence/real-boundary/cli-context-import.txt`.
- Independent adversarial witness positive cases for local read-only command/env/external fixture and read-only external integration passed; evidence `validation-evidence/negative/adversarial-security-witness-summary.json`.
- Syntax/package consistency: `node --check` on `packages/security/src/index.js` and all lane-owned witness `.mjs` files → all exit `0`; evidence `validation-evidence/package-checks/node-checks.txt`.

Result: the actual package/API import seam exists, including actual CLI-package-context import via I-18S. This does not close I-18A because critical negative witnesses fail.

### Checkpoint 4 — negative/adversarial witnesses

Independent validator witness:
- Script: `validation-evidence/negative/adversarial-security-witness.mjs`
- Command: `node .vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/validation-evidence/negative/adversarial-security-witness.mjs`
- Exit: `1`
- Summary: `validation-evidence/negative/adversarial-security-witness-summary.json`
- Stdout/stderr/exit: `validation-evidence/negative/adversarial-security-witness.stdout|stderr|exit`

The adversarial witness ran 28 cases. Basic safe positives and several required negatives passed, but 11 required negative cases failed:
- `safe/..` terminal traversal segment passed/allowed.
- Windows drive absolute path `C:\Users\outside` passed/allowed.
- Policy with invented command classification parsed as ok.
- Policy with fake sandbox status parsed as ok.
- Sandbox status `blocked/pending-live` passed/allowed as green.
- Command request missing `command` passed/allowed.
- `argv` provided as a string was ignored and passed/allowed.
- `targetPaths` provided as a string was ignored and passed/allowed.
- Secret in config array was not scanned and passed/allowed.
- Circular evidence caused stack overflow instead of typed fail-closed result.
- BigInt evidence threw `TypeError` instead of typed fail-closed result.

### Checkpoint 5 — redaction, regression, and blast-radius

Evidence:
- Redaction sentinel scan: `validation-evidence/redaction/sentinel-scan.txt`; implementation evidence outputs did not contain fake secret sentinels.
- Default shipped binary regression: `validation-evidence/regression/default-security-command.txt`; `node packages/cli/src/entry/vibe-engineer.js ... security --api-key ...` remains `unsupported_operation`, exit `2`, with secret redacted in stdout/result file.
- Manifest/lockfile regression: `validation-evidence/regression/unauthorized-surface-regression.txt`; `packages/cli/package.json`, `packages/security/package.json`, and `pnpm-lock.yaml` match I-18S post-validation snapshots.
- Top-level `@vibe-engineer/testing` production dependency sweep: `validation-evidence/regression/top-level-testing-dependency-sweep.txt`, exit `0`, no production dependency found.
- I-18B/CI/Pulumi/script absence: `validation-evidence/regression/unauthorized-surface-regression.txt`; `packages/cli/src/commands/security`, `examples/starter-reference/generated-fixtures/security`, `.github`, `scripts`, and `infra` absent.
- Sibling sweep: `validation-evidence/blast-radius/sibling-sweep.txt`; inspected adjacent CLI command dirs, verification package, mechanical-gates surfaces, and I-18S carrier artifacts.
- Final dirty-tree proof and validator evidence inventory: `validation-evidence/final/final-dirty-tree-proof.txt`.

## Validation matrix

| Check | Result | Evidence |
| --- | --- | --- |
| Owned-file inspection | completed | `packages/security/src/index.js`, fixtures, I-18A report/evidence, validation inventories |
| Dirty-tree scoped status | completed | `validation-evidence/status/git-status-short.txt`, `validation-evidence/final/final-dirty-tree-proof.txt` |
| Actual package import | pass | `validation-evidence/real-boundary/package-context-import.txt` exit `0` |
| Actual CLI-package import via I-18S | pass | `validation-evidence/real-boundary/cli-context-import.txt` exit `0` |
| Basic positive policy evaluation | pass | adversarial witness positive cases passed |
| Required negative command/path safety | fail | traversal/Windows absolute/malformed command/target cases passed as green |
| Required negative policy contract strictness | fail | invented policy enum values accepted |
| Required sandbox pending-live/fake status semantics | fail | fake status can be policy-allowed; `blocked/pending-live` returns green |
| Bounded input / evidence carrier safety | fail | circular and BigInt evidence throw instead of typed block |
| Redaction of normal evidence outputs | pass for covered outputs | sentinel scan found no fake secret sentinel in implementation evidence outputs |
| Default shipped security command remains unsupported | pass | CLI regression command exit `2`, `unsupported_operation`, redacted argv |
| Unauthorized surface regression | pass | I-18B/CI/Pulumi/scripts absent; manifests/lockfile match I-18S snapshots |
| Package syntax consistency | pass | `node --check` exits `0` for security source/fixtures |

## Findings

| ID | Severity | Finding | Evidence | Required root-cause fix |
| --- | --- | --- | --- | --- |
| F1 | critical | Path containment is incomplete: terminal traversal `safe/..` and Windows drive absolute paths pass as `allow`. | `validation-evidence/negative/adversarial-security-witness-summary.json`; root cause near `isUnsafePathTarget` line 389. | Replace string-prefix path checks with typed normalized path classification for POSIX and Windows forms; reject any `..` segment, terminal traversal, drive/UNC absolute paths, root/tilde/protected roots, and malformed path values; add negative fixtures. |
| F2 | critical | Malformed command/target inputs fail open: missing `command`, string `argv`, and string `targetPaths` are ignored and pass. | same witness summary; root cause near `evaluateCommandSafety` line 342. | Add strict request schema validation with stable classifications for required command string, `argv` array, `targetPaths` array, declared write paths, and known classifications; malformed values must produce blocking findings. |
| F3 | critical | Policy contract is permissive for enum values: invented command classifications and fake sandbox statuses are accepted as policy arrays of strings. | same witness summary; root cause near `parseSecurityPolicy` line 242. | Validate every policy enum/list value against closed typed sets and safe subsets; reject unknown command classifications, external modes, sandbox statuses, advisory classifications, and unsafe policy relaxations fail-closed. |
| F4 | critical | Sandbox `blocked/pending-live` is treated as green `passed/allow`, which can let pending-live proof masquerade as truth-green. | same witness summary; root cause near `DEFAULT_SECURITY_POLICY` and `evaluateSandboxCapability` line 460. | Model `blocked/pending-live` as blocking or explicit non-green pending status in the gate result; unsupported/fake claims must not be policy-allowable without blocking evidence. |
| F5 | critical | Env/config scanner misses secrets inside arrays, allowing a secret-bearing config array to pass. | same witness summary; root cause near `scanKeyValueRecord` line 410. | Recursively scan arrays and nested records with depth/item/byte caps; fail closed on unsupported value shapes rather than skipping them. |
| F6 | critical | Evidence/redaction carrier is not bounded or JSON-safe: circular evidence overflows recursion and BigInt evidence throws. | same witness summary; root cause near `redactSecurityValue` line 177 and `evaluateEvidenceSafety` line 481. | Implement cycle-safe, depth/item/byte-bounded redaction/serialization with JSON-safe handling for BigInt/symbol/functions/unknown objects; errors must return typed blocked gate results with redacted diagnostics. |

## Severity classification

Severity: critical.

Rationale: I-18A is a security/safety policy gate. Multiple required unsafe inputs return `passed`/`allow`, fake/pending-live sandbox semantics can be made green, and malformed/unbounded evidence can throw instead of emitting a typed blocking carrier. These are deterministic false-greens in load-bearing security policy behavior, but they appear fixable within I-18A-owned package source/fixtures/evidence paths.

## Final routing

NEEDS-FIX. I-18A is not truth-green and I-18B must remain blocked. Fix within I-18A-owned paths, add regression witnesses for each failure above, then rerun independent revalidation.
