# I-18A Second Fix Report

## Status
DONE — PF1–PF4 root-cause fixes implemented inside I-18A-owned paths with targeted evidence. This is not independent validation; I-18B remains blocked pending second post-fix revalidation.

## Files inspected
- Required planning/source docs:
  - `/Users/lizavasilyeva/work/harness-starter/README.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
  - `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-18-security-safety-hooks-policy-brief-generated.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/I-18A-implementation.md`
- Prior I-18A artifacts:
  - `.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/I-18A-implementation-report.md`
  - `.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/I-18A-validation-artifact.md`
  - `.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/I-18A-fix-report.md`
  - `.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/I-18A-post-fix-revalidation-artifact.md`
- Product/source/evidence:
  - `packages/security/src/index.js`
  - `packages/security/fixtures/policy/witness.mjs`
  - `packages/security/fixtures/contracts/witness.mjs`
  - `packages/security/fixtures/redaction/witness.mjs`
  - `.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/post-fix-revalidation-evidence/negative/post-fix-adversarial-witness-summary.json`
  - `.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/post-fix-revalidation-evidence/negative/post-fix-adversarial-witness.mjs`

## Files changed
- `packages/security/src/index.js`
- `packages/security/fixtures/policy/witness.mjs`
- `packages/security/fixtures/contracts/witness.mjs`
- `.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/I-18A-second-fix-report.md`
- `.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/second-fix-evidence/**`

## Owned/read-only/untouchable confirmation
- Product edits stayed within owned I-18A paths: `packages/security/src/**` and `packages/security/fixtures/**`.
- Evidence/report writes stayed under the I-18A work root.
- No root/package-manager/lockfile/workspace, CLI manifest, CLI loader/entry/default registration, I-18B, I-12/I-13/I-20, CI/Pulumi/scripts/docs, verification, mechanical-gates, testing, artifacts package, or unrelated dirty path edits were made.
- No `git stash/reset/clean/checkout/restore`, package-manager mutation, commit, push, or broad format/fix command was used.

## Baseline/final dirty-tree evidence
- Baseline status: `second-fix-evidence/baseline/git-status-short.txt`.
- Baseline owned inventory: `second-fix-evidence/baseline/owned-paths-before.txt`.
- Baseline scoped diff: `second-fix-evidence/baseline/scoped-diff-before.patch`.
- Final status: `second-fix-evidence/final/git-status-short.txt`.
- Final owned inventory: `second-fix-evidence/final/owned-paths-after.txt`.
- Final scoped diff: `second-fix-evidence/final/scoped-diff.patch`.

## Root-cause fixes
- PF1: `parseSecurityPolicy` now restricts `allowedCommandClassifications` to the safe I-18A subset (`read_only`, `local_deterministic_write`), and `evaluateCommandSafety` hard-blocks unsafe command classifications independent of supplied policy objects.
- PF2: mandatory protected path prefixes are a non-removable policy floor; path evaluation always unions custom policy paths with mandatory protected roots/manifests/lockfile/CLI protected paths.
- PF3: external integration entries now strictly validate `id`, `mode`, and boolean fields before applying defaults; malformed field types block with `unknown_request_field`.
- PF4: sandbox claims now strictly validate non-empty string `provider`, `status`, and `claim`; malformed schema blocks with `unknown_request_field` while `unknown` remains only an honest non-overclaiming status for well-formed claims.

## Witness/evidence summary
Commands run from `/Users/lizavasilyeva/work/vibe-engineer` unless noted:
- `node --check` for `packages/security/src/index.js`, lane fixtures, and second-fix witness → exit `0`; evidence `second-fix-evidence/witnesses/node-checks.*`.
- `node packages/security/fixtures/policy/witness.mjs` → exit `0`; evidence `second-fix-evidence/witnesses/policy-witness.*`; negative count `29`.
- `node packages/security/fixtures/contracts/witness.mjs` → exit `0`; evidence `second-fix-evidence/witnesses/contracts-witness.*`; contract negative count `15`.
- `node packages/security/fixtures/redaction/witness.mjs` → exit `0`; evidence `second-fix-evidence/witnesses/redaction-witness.*`.
- `node packages/security/fixtures/real-boundary/package-api/witness.mjs` → exit `0`; evidence `second-fix-evidence/witnesses/package-api-witness.*`.
- `node packages/security/fixtures/real-boundary/cli-package-context-import/witness.mjs` → exit `0`; evidence `second-fix-evidence/witnesses/cli-context-witness.*`.
- Actual package-context import from `packages/security` → exit `0`; evidence `second-fix-evidence/witnesses/package-context-import.*`.
- Actual CLI-package-context import from `packages/cli` through I-18S seam → exit `0`; evidence `second-fix-evidence/witnesses/cli-context-import.*`.
- Second-fix PF1–PF4 adversarial witness → exit `0`; evidence `second-fix-evidence/witnesses/second-fix-adversarial-witness.*`, summary `ok: true`, `total: 12`, `failureCount: 0`.
- Copied post-fix revalidation 74-case adversarial witness rerun under second-fix evidence root → exit `0`; evidence `second-fix-evidence/negative/post-fix-adversarial-witness-rerun.*`, summary `ok: true`, `total: 74`, `failureCount: 0`.
- Default shipped `security` command remains unsupported → exit `2` with sentinel redacted; evidence `second-fix-evidence/regression/default-security-command-*`.
- Manifest/lock/I-18B absence regression → cmp/test exits `0`; evidence `second-fix-evidence/regression/unauthorized-surface-regression.txt`.
- Top-level production `@vibe-engineer/testing` dependency sweep → `ok: true`; evidence `second-fix-evidence/regression/top-level-testing-dependency-sweep.json`.
- Generated output sentinel scan excluding witness source → `sentinel_scan_result=PASS`; evidence `second-fix-evidence/regression/generated-output-sentinel-scan.txt`.

## Blockers
None. No non-owned dependency, package-manager, lockfile, manifest, CLI loader/default-registration, verification/mechanical/testing/artifacts, docs/CI/Pulumi/scripts, I-18B, or I-12/I-13/I-20 edit was required.

## Handoff
All remaining critical post-fix revalidation findings PF1–PF4 were addressed at root cause with regression witnesses. Independent second post-fix revalidation must still judge truth-green; this report does not self-validate.
