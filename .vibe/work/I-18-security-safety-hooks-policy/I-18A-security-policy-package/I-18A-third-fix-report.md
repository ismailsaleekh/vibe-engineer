# I-18A Third Fix Report

## Status
DONE — SPF1–SPF3 root-cause fixes implemented inside I-18A-owned security package paths with third-fix evidence. This implementer result is not validation PASS; I-18B remains blocked pending independent I-18A revalidation.

## Stage checkpoints

### Stage 0 — report initialized first
Status: complete.
- Created this report before source inspection or edits.
- Initial changed file: this report only.

### Stage 1 — source-of-truth read
Status: complete.
Read-only files inspected and cited:
1. `quality-bar.md` — perfect-solution, dirty-tree safety, report-first, no self-validation, real-boundary requirements.
2. `ledger-compact.md` — I-18A third-fix routing, dirty no-HEAD baseline, I-18B blocked.
3. `status.md` — active board and downstream blockers.
4. `handoff.md` — I-18A second revalidation NEEDS-FIX/critical.
5. `I-18-security-safety-hooks-policy-brief-generated.md` — I-18 split, I-18A owned paths, I-18B non-goals.
6. `I-18A-implementation.md` — typed API, fail-closed behavior, real package/CLI context witnesses.
7. `I-18A-post-validation-fix.md` — first-fix scope for F1–F6.
8. `I-18A-post-fix-revalidation.md` — first post-fix revalidation protocol.
9. `I-18A-second-post-fix-fix.md` — second-fix scope for PF1–PF4.
10. `I-18A-second-post-fix-revalidation.md` — second revalidation protocol.
11. `I-18A-implementation-report.md` — current API/fixture/evidence baseline.
12. `I-18A-validation-artifact.md` — original F1–F6 critical findings.
13. `I-18A-fix-report.md` — F1–F6 fix evidence.
14. `I-18A-post-fix-revalidation-artifact.md` — PF1–PF4 critical findings.
15. `I-18A-second-fix-report.md` — PF1–PF4 second-fix evidence.
16. `I-18A-second-post-fix-revalidation-artifact.md` — binding SPF1–SPF3 findings.
17. `second-post-fix-adversarial-witness-summary.json` — exact 9 false-green cases.
Additional read-only references inspected: I-18S implementation/validation artifacts, `packages/security/package.json`, `packages/cli/package.json`, root manifest/workspace/turbo configs, CLI entry/loader.

### Stage 2 — baseline/scope evidence and source inspection
Status: complete.
Evidence:
- `third-fix-evidence/baseline/git-status-short.txt`
- `third-fix-evidence/baseline/owned-paths-before.txt`
- `third-fix-evidence/baseline/scoped-diff-before.patch`

### Stage 3 — implementation
Status: complete.
Files changed:
- `packages/security/src/index.js`
- `packages/security/fixtures/policy/witness.mjs`
- `packages/security/fixtures/contracts/witness.mjs`
- `third-fix-evidence/**`
- this report

Mandated existing fixture commands also refresh their pre-existing hardcoded I-18A evidence summaries under the I-18A work root; third-fix command captures are under `third-fix-evidence/**`.

Root-cause design:
- SPF1: `evaluateCommandSafety` now scans the full typed command carrier (`command` plus `argv`) for secret-like key/value material and blocks with `secret_like_value` before allow.
- SPF2: path safety now canonicalizes dot segments before policy comparison and rejects Windows drive prefixes including drive-relative, UNC/network paths, tilde/tilde-user paths, absolute roots, traversal, empty/malformed segments, and protected aliases.
- SPF3: mandatory non-removable protected floor now covers root/package-manager/workspace/turbo/root config files, root/package manifests, package manifests for CLI/security, and CLI loader/entry/envelope/errors/testing shared surfaces.

Source-line evidence: `third-fix-evidence/source/changed-source-lines.txt`.

### Stage 4 — witnesses and regression checks
Status: complete.
Exit summary: `third-fix-evidence/final/exit-code-summary.txt`.

Key witness matrix:
- Syntax checks for `packages/security/src/index.js` and all required fixture `.mjs` files: exit `0`, `third-fix-evidence/syntax/**`.
- Existing policy/contracts/redaction witnesses: exit `0`, `third-fix-evidence/witnesses/*`.
- Existing package API and CLI-context fixture witnesses: exit `0`, `third-fix-evidence/real-boundary/**/witness.*`.
- Actual package-context import from `packages/security`: exit `0`, `third-fix-evidence/real-boundary/package-api/package-context-import.*`.
- Actual CLI package-context import through I-18S dependency/export carrier from `packages/cli`: exit `0`, `third-fix-evidence/real-boundary/cli-package-context-import/cli-context-import.*`.
- New third-fix adversarial witness: exit `0`, `third-fix-evidence/negative/third-fix-adversarial-witness.*`; 44 cases, 0 failures.
- Default shipped `security` command regression: expected exit `2`, `unsupported_operation`, raw argv secret redacted, `third-fix-evidence/regression/default-security-command.*`.
- No production `@vibe-engineer/testing` dependency sweep: exit `0`, `third-fix-evidence/regression/top-level-testing-dependency-sweep.*`.
- Unauthorized-surface regression: exit `0`, `third-fix-evidence/regression/unauthorized-surface-regression.*`.
- Generated output sentinel scan excluding witness sources: exit `0`, `third-fix-evidence/regression/generated-output-sentinel-scan.*`.

Third-fix adversarial coverage includes command-string secret blocking/redaction; Windows drive-relative/absolute, UNC, tilde, dot-alias, traversal, root, empty/malformed path blocks; mandatory protected floor for `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.git/config`, CLI/security package manifests, CLI loader/entry; unsafe custom policy floor removal; and regression closure for F1–F6/PF1–PF4 shapes.

### Stage 5 — final dirty-tree/scope proof
Status: complete.
Evidence:
- `third-fix-evidence/final/git-status-short.txt`
- `third-fix-evidence/final/owned-paths-after.txt`
- `third-fix-evidence/final/scoped-diff.patch`

Scope confirmation:
- No package manifest, lockfile, package-manager, root config, CLI loader/entry/default registration, verification/mechanical/testing/artifacts, I-18B, I-12/I-13/I-20, docs, CI/Pulumi/scripts, or unrelated path edits were made.
- No `git stash/reset/clean/checkout/restore`, commit, push, package-manager mutation, or broad format/fix command was used.

## Blockers
None encountered within the authorized I-18A third-fix scope.

## Final handoff
DONE for implementer scope only. Independent revalidation must inspect actual changed files/diffs and rerun witnesses before any PASS; I-18B remains blocked until that happens.
