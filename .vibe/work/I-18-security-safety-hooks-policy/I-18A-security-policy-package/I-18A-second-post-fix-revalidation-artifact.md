# I-18A Second Post-Fix Revalidation Artifact

Status: COMPLETE — NEEDS-FIX / critical

## Checkpoint 0 — Artifact created first
- Time: 2026-06-26
- Scope: independent adversarial revalidation of I-18A second post-fix fix.
- Write boundaries: this artifact and optional evidence under `second-post-fix-revalidation-evidence/` only.
- Product/source edits: none.
- Next step: read source-of-truth materials, then inspect dirty tree and owned files.

## Checkpoint 1 — Source list inventory
- Command: `wc -l` over all required source-of-truth files.
- Evidence: all 16 required files are present; total 5705 lines.
- Product/source edits: none.
- Next step: read required source-of-truth files completely in bounded chunks.

## Checkpoint 2 — Required source-of-truth read
- Status: in progress toward validation; verdict TBD.
- Files inspected/read: all required orchestration docs listed in prompt; I-18 brief; I-18A implementation prompt; I-18A implementation, validation, first fix, first post-fix revalidation, and second fix artifacts; current ledger/status/handoff.
- Extracted closure targets: PF1 unsafe command-policy relaxation, PF2 removable protected path floor, PF3 malformed external boolean fields, PF4 malformed sandbox claim fields; plus original F1-F6 fail-open cases and I-18S/API real-boundary regression.
- Product/source edits: none.
- Validator writes: this artifact only so far.
- Next step: inspect product package source, manifests, I-18S carrier/evidence, dirty tree, and relevant product decisions before running independent witnesses.

## Checkpoint 3 — Dirty-tree, owned-file, source, and carrier inspection
- Status: in progress; verdict TBD.
- Validator writes: this artifact plus `second-post-fix-revalidation-evidence/**` only.
- Evidence created:
  - `second-post-fix-revalidation-evidence/status/git-status-short.txt`
  - `second-post-fix-revalidation-evidence/inventory/owned-paths.txt`
  - `second-post-fix-revalidation-evidence/diff/path-scoped-diff-summary.txt`
  - `second-post-fix-revalidation-evidence/diff/path-scoped-diff.patch`
- Files inspected/read: `packages/security/src/index.js`; policy/contracts/redaction/real-boundary fixtures; `packages/security/package.json`; `packages/cli/package.json`; root `package.json`; `pnpm-workspace.yaml`; relevant `pnpm-lock.yaml` importer section; CLI entry/loader; I-18S implementation and validation artifacts; product README/docs and DL-22/DL-15 decisions.
- Key source inspection notes: second fix is visible in `parseSecurityPolicy`, `evaluateCommandSafety`, `isUnsafePathTarget`, `evaluateExternalIntegrationSafety`, and `evaluateSandboxCapability`; I-18S dependency/export carrier is still declared in manifests/lockfile; default loader still lists `security` only as unsupported future command.
- Product/source edits: none.
- Blockers: none.
- Next step: run independent real-boundary, syntax/package, positive/negative/fail-closed, redaction/audit, regression, and blast-radius witnesses using validator-only evidence files.

## Checkpoint 4 — Witnesses and regression checks executed
- Status: in progress; provisional verdict `NEEDS-FIX`.
- Validator writes: this artifact plus `second-post-fix-revalidation-evidence/**` only.
- Commands/evidence:
  - `package-checks/node-checks.txt` and `validator-witness-node-check.*`: `node --check` passed for security source, lane fixtures, and validator witness.
  - `real-boundary/package-context-import.*`: actual `packages/security` context import of `@vibe-engineer/security` exited `0` and exercised `__i18aCliBoundarySmoke`.
  - `real-boundary/cli-context-import.*`: actual `packages/cli` context import through I-18S dependency/export carrier exited `0`.
  - `negative/second-post-fix-adversarial-witness.*`: independent 87-case positive/negative/regression witness exited `1` with 9 fail-open failures.
  - `redaction/generated-output-sentinel-scan.*`: generated outputs contain no fake secret sentinel leaks.
  - `regression/default-security-command-*`: default shipped `security` command remains unsupported/blocked with redacted argv.
  - `regression/unauthorized-surface-regression.txt`: manifests/link carrier intact; I-18B/CI/Pulumi/scripts/infra surfaces absent.
  - `regression/top-level-testing-dependency-sweep.json`: no top-level production dependency on `@vibe-engineer/testing`.
  - `blast-radius/security-reference-sweep.txt` and `sibling-package-sweep.txt`: adjacent CLI/security/verification/mechanical/testing seams swept.
- PF1–PF4 closure: the second-fix targeted PF1 unsafe policy, PF2 removable path floor, PF3 malformed external booleans, and PF4 malformed sandbox provider/claim cases all pass in the adversarial witness.
- Remaining failures: command-string secret not scanned; several path safety variants pass green (`C:...`, `~user/...`, `./package.json`, `./.git/config`, `pnpm-workspace.yaml`, `turbo.json`, package manifests).
- Product/source edits: none.
- Blockers: none to validation; defects appear fixable within I-18A-owned source/fixtures/evidence.
- Next step: finalize dirty-tree evidence, classify severity, and write final verdict/root-cause fixes.

## Checkpoint 5 — Final classification
- Status: COMPLETE.
- Verdict: `NEEDS-FIX`.
- Severity: `critical`.
- Validated scope: `I-18A-security-policy-package` second post-fix revalidation only.

### Validator write scope / dirty-tree safety
- Validator write paths used:
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/I-18A-second-post-fix-revalidation-artifact.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/second-post-fix-revalidation-evidence/**`
- Product/source writes by validator: none.
- Forbidden operations not used: no `git stash`, `git reset`, `git clean`, `git checkout`, `git restore`, commit, push, package-manager mutation, product edit, manifest edit, lockfile edit, CI/Pulumi/script/doc edit, or I-18B/I-12/I-13/I-20 edit.
- Final dirty-tree evidence: `second-post-fix-revalidation-evidence/final/final-dirty-tree-proof.txt`.
- Exit summary: `second-post-fix-revalidation-evidence/final/exit-code-summary.txt`.
- No concrete ownership conflict found.

### Closure check for prior findings
| Prior finding | Second post-fix result | Evidence |
| --- | --- | --- |
| Original F1 path containment terminal traversal/Windows absolute | PARTIAL: tested `safe/..`, `../outside`, POSIX absolute, UNC, `C:\\Users\\outside`, `~/...`, root `package.json`, root `pnpm-lock.yaml`, and CLI entry path block; remaining path aliases/protected surfaces still pass green (SPF2/SPF3). | `negative/second-post-fix-adversarial-witness-summary.json` |
| Original F2 malformed command/target inputs | CLOSED for missing command, string `argv`, string `targetPaths`, malformed classification, unknown command field. | same |
| Original F3 permissive policy enum/list values | CLOSED for invented/unsafe command classifications, fake/pending sandbox statuses, unsafe external modes, advisory escalation, unknown policy fields. | same |
| Original F4 `blocked/pending-live` sandbox green | CLOSED: pending-live and fake sandbox claims block; well-formed `unknown`/`not_provided` remain honest non-claims. | same |
| Original F5 arrays/nested config secret scan | CLOSED for array-contained fake secret and bounded large config array. | same |
| Original F6 circular/BigInt evidence throws | CLOSED for circular/BigInt/large evidence; no throw; typed blocked/redacted result. | same |
| PF1 unsafe command-policy relaxation | CLOSED for policy parser and direct unsafe-policy evaluator cases. | same |
| PF2 removable protected path floor | PARTIAL: `protectedPathPrefixes: []` is rejected and direct `package.json` remains protected, but path canonicalization and mandatory protected surface coverage still fail for aliases/workspace/config/package manifests. | same |
| PF3 malformed external boolean fields | CLOSED: string booleans, malformed id/mode, unknown external field, non-array/non-object entries block. | same |
| PF4 malformed sandbox provider/claim fields | CLOSED: malformed provider/claim/status and unknown sandbox fields block. | same |

### Validation matrix
| Check | Result | Evidence |
| --- | --- | --- |
| Actual owned-file/source inspection | complete | `packages/security/src/index.js`, fixtures, manifests, source line evidence `source/function-lines.txt` |
| Dirty-tree scoped status/inventory/diff | complete | `status/git-status-short.txt`, `inventory/owned-paths.txt`, `diff/path-scoped-diff*`, `final/final-dirty-tree-proof.txt` |
| Actual package-context import/export/API | pass | `real-boundary/package-context-import.stdout`, exit `0` |
| Actual CLI-package-context import via I-18S | pass | `real-boundary/cli-context-import.stdout`, exit `0`; manifests/lock/symlink checked in `regression/unauthorized-surface-regression.txt` |
| Positive policy parsing/evaluation | pass | adversarial witness positive cases |
| Command/path safety negative cases | fail | 8 path/manifest alias/protected-surface failures plus command-string secret failure in adversarial witness |
| Sandbox capability status / exact `blocked/pending-live` semantics | pass | adversarial witness sandbox cases |
| Redaction/audit/bounded evidence inputs | pass for tested carriers | adversarial witness; `redaction/generated-output-sentinel-scan.txt` |
| Bounded env/config inputs | pass for tested large/circular/BigInt config | adversarial witness |
| Malformed/unknown/unsafe policies and unsupported fields | pass | adversarial witness policy/contract cases |
| Default shipped `security` command remains unsupported | pass | `regression/default-security-command-*` |
| No I-18B/I-12/I-13/I-20/CI/Pulumi/root/package-manager/lockfile/shared build/export/package manifest edits by validator | pass | `regression/unauthorized-surface-regression.txt`, `final/final-dirty-tree-proof.txt` |
| Package/typecheck/build consistency scoped to I-18A | partial/applicable checks pass | `package-checks/node-checks.txt`, `package-checks/pnpm-list-security-depth0.*`, `package-checks/security-package-script-scope.json`; no package scripts exist to run without manifest edits |
| Sibling/blast-radius sweep | complete | `blast-radius/security-reference-sweep.txt`, `blast-radius/sibling-package-sweep.txt` |

### Findings
| ID | Severity | Finding | Evidence | Required root-cause fix |
| --- | --- | --- | --- | --- |
| SPF1 | critical | Secret-like CLI data embedded in the `command` string returns `passed/allow`; only `argv` is scanned for secret-like CLI arguments. | `negative/second-post-fix-adversarial-witness-summary.json`; source near `evaluateCommandSafety` line 437. | Either strictly model `command` as an executable token and reject whitespace/embedded arguments, or scan the full typed command carrier (`command` + `argv`) for secret-like key/value material before allowing. Add regression for command-string secret redaction/blocking. |
| SPF2 | critical | Path normalization is still incomplete: Windows drive-relative paths (`C:...`), tilde-user home paths (`~user/...`), and dot-segment aliases (`./package.json`, `./.git/config`) pass `passed/allow`. | same summary; source near `isUnsafePathTarget` line 505. | Normalize/canonicalize path targets before policy comparison: reject any Windows drive prefix, tilde or tilde-user home form, dot-segment alias to protected roots, `.git` aliases, traversal, UNC, absolute paths, empty/malformed segments. Add regression cases. |
| SPF3 | critical | Mandatory protected path floor is incomplete: root workspace/config files (`pnpm-workspace.yaml`, `turbo.json`) and package manifests (`packages/cli/package.json`, `packages/security/package.json`) pass `passed/allow` under default policy. | same summary; source constant `MANDATORY_PROTECTED_PATH_PREFIXES` line 108. | Expand the non-removable protected floor for root/package-manager/workspace/turbo/config/package manifests and serialized handoff surfaces, or require explicit owned-write policy for package manifests; evaluator must block these by default independent of custom policy relaxation. Add regression cases. |

### Severity rationale
Severity is `critical` because I-18A is a load-bearing security/safety policy gate and the current package still returns deterministic false-green `passed/allow` results for secret-bearing command strings and protected path/package-manager/workspace/package-manifest targets. These defects are fixable inside I-18A-owned `packages/security/src/**`, fixtures, and evidence paths. I-18B must remain blocked.

### Final routing
`NEEDS-FIX`. I-18A is not truth-green after the second fix. Fix SPF1–SPF3 at root cause, add targeted regression witnesses, then rerun independent revalidation.
