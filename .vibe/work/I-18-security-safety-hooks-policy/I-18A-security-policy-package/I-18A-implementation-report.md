# I-18A Implementation Report — Security Policy Package

## current status
DONE — implementation and lane-owned evidence complete; pending independent validation. Implementer does not self-validate or declare PASS. Final witness rerun completed after replacing realistic-looking secret sentinels with explicit fake sentinel values in fixture sources, hardening absolute-path containment, and aligning sandbox `blocked/pending-live` literal; evidence outputs contain only redacted values.

## files inspected
### Source-of-truth docs/artifacts read-only
- `/Users/lizavasilyeva/work/harness-starter/README.md` — product vision, domain-neutral core, artifact workflow, verification model.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — locked `vibe-engineer` name, skill-first workflow, automatic verification/context, CI/deploy safety.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — evidence-over-assertion, safety hooks as hard blockers, Verification Delta, runner/evidence discipline.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — deterministic hard gates, schema/contract strictness, wiring integrity, secret/unsafe-config mechanical expectations.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §22 security/safety model and implementation backlog.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — report-first, dirty-tree, Triad discipline, real-boundary proof rules.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md` — I-18 DAG, ownership, real-boundary, severity rules.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-18-security-safety-hooks-policy-brief-generated.md` — validated I-18 split and I-18A requirements.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/I-18-implementation-lane-readiness-extract.md` and `I-18-lane-readiness-extract-validation-artifact.md` — I-18S→I-18A→I-18B scheduling gate; validation `PASS`/`clean`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger-compact.md`, `status.md`, `handoff.md` — current dirty-tree/concurrent lane context.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-18-security-safety-hooks-policy/I-18S-implementation-report.md` and `I-18S-validation-artifact.md` — I-18S dependency/export carrier `PASS`/`clean`.

### Product docs/contracts read-only
- `/Users/lizavasilyeva/work/vibe-engineer/README.md`, `docs/README.md`.
- `docs/decisions/DL-02-artifact-schemas.md`, `DL-07-cli-primitives.md`, `DL-10-verification-implementation.md`, `DL-15-mechanical-engine.md`, `DL-20A-domain-neutrality-foundation.md`, `DL-22-security-safety-model.md`, `DL-24A-planning-output-discipline.md`.

### Product source/sibling patterns read-only
- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- `packages/security/package.json`, `packages/cli/package.json`.
- `packages/artifacts/**`, `packages/verification/**`, `packages/mechanical-gates/**`, `packages/testing/**` as patterns/contracts.
- `packages/cli/src/command-loader/**`, `entry/**`, `envelope/**`, `errors/**`, and sibling command patterns under `doctor`, `config`, `schematic`, `verify`.

## files changed
- `packages/security/src/index.js`
- `packages/security/fixtures/policy/witness.mjs`
- `packages/security/fixtures/redaction/witness.mjs`
- `packages/security/fixtures/contracts/witness.mjs`
- `packages/security/fixtures/real-boundary/package-api/witness.mjs`
- `packages/security/fixtures/real-boundary/cli-package-context-import/witness.mjs`
- `.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/**`

No `packages/security/package.json` edit was made by I-18A; it matches the I-18S post-validation snapshot.

## owned/read-only/untouchable path confirmation
- Edited only owned I-18A paths: `packages/security/src/**`, `packages/security/fixtures/**`, and the I-18A work/evidence root.
- Read-only paths were inspected only; no edits to CLI loader/entry/envelope/errors/testing/default registration, `packages/verification/**`, `packages/mechanical-gates/**`, `packages/testing/**`, `packages/artifacts/**`, docs/decisions, root manifests/config, `packages/cli/package.json`, or `pnpm-lock.yaml`.
- Untouchable paths preserved: `.git/**`, root package/workspace/lock/turbo/config, CI/scripts/infra/Pulumi, I-18B paths, I-12/I-13/I-20 surfaces, unrelated dirty work.
- `bg_status` showed no background tasks in this Pi extension runtime at implementation start; prompt noted concurrent I-12AB orchestration, and no I-12/I-13/I-20 paths were touched.

## baseline dirty-tree/status evidence
- Report artifact created first, before source edits.
- Baseline `git status --short`: `inventory/baseline-status.txt`.
- Baseline owned inventory: `inventory/owned-paths-before.txt`.
- Final owned inventory: `inventory/owned-paths-after.txt`.
- Final dirty-tree proof and required final command capture: `evidence/final/dirty-tree-proof.txt`, `evidence/final/required-final-commands.txt`.
- Scoped final diff command artifact: `evidence/final/scoped-diff.patch`.

## implementation design summary
Implemented dependency-neutral ESM public API exported through the existing I-18S package export `@vibe-engineer/security` → `./src/index.js`.

Core exported surfaces include:
- policy version/model parsing and strict validation: `SECURITY_POLICY_VERSION`, `DEFAULT_SECURITY_POLICY`, `parseSecurityPolicy`;
- stable enums/string-literal objects: `SecurityCategory`, `SecurityClassification`, `SecuritySeverity`, `SecurityDecision`, `SecurityGateStatus`, `CommandSafetyClassification`, `ExternalIntegrationMode`, `SandboxCapabilityStatus`;
- typed result/finding/event builders: `createSecurityFinding`, `createSecurityGateResult`, `createSecurityAuditEvent`;
- deterministic gate APIs: `runSecurityGate`, `evaluateCommandSafety`, `evaluateEnvConfigSafety`, `evaluateExternalIntegrationSafety`, `evaluateSandboxCapability`, `evaluateEvidenceSafety`;
- deterministic redaction APIs: `redactSecurityText`, `redactSecurityValue`, `isSecretLikeValue`;
- real-boundary smoke API for CLI package context: `__i18aCliBoundarySmoke`.

Policy/config behavior is fail-closed: malformed policy, unknown policy version, unknown policy/request fields, unsupported sandbox claims, unsafe paths, destructive commands, production-like defaults, secret-like values, and unsafe external integrations block with stable classifications. Regex/signatures are confined to typed detector/redaction functions with typed inputs/outputs and fixture witnesses.

## positive/negative/regression witness matrix
| Class | Witness | Evidence |
| --- | --- | --- |
| Positive package API import | package-context import command and package API fixture | `evidence/real-boundary/package-api/*` |
| Positive CLI package context import | actual `packages/cli` context import through I-18S seam | `evidence/real-boundary/cli-package-context-import/*` |
| Allowed local/read-only command/env/config | `packages/security/fixtures/policy/witness.mjs` | `evidence/positive/policy-witness.*`, `evidence/positive/policy-positive-summary.json` |
| Safe non-production env/config | policy witness local/test/loopback values | same as above |
| External disabled/dry-run/read-only default | policy witness disabled + dry-run integrations | same as above |
| Advisory non-blocking note | advisory note returns `advisory` / `allow_with_advisory`; required gates still block | same as above |
| Secret-like CLI arg/env/config/evidence/diagnostic | policy witness negative cases | `evidence/negative/policy-negative-summary.json` |
| Production credential/default | policy witness production-like DB URL sentinel | `evidence/negative/policy-negative-summary.json` |
| Destructive commands | policy witness covers `rm -rf`, force push, Pulumi apply, publish, DB drop | `evidence/negative/policy-negative-summary.json` |
| Unsafe env/config defaults | production-by-default and enabled integration default | `evidence/negative/policy-negative-summary.json` |
| External live credential/budget/network | enabled live provider without approval | `evidence/negative/policy-negative-summary.json` |
| Malformed/unknown policy/version/fields | contract witness | `evidence/contracts/*` |
| Unsafe path escape/protected target | policy witness | `evidence/negative/policy-negative-summary.json` |
| Unsupported/fake sandbox claim | policy and contract witnesses | `evidence/negative/*`, `evidence/contracts/*` |
| Redaction all surfaces | redaction witness for stdout/result/evidence/diagnostic/error/log | `evidence/redaction/*` |
| Regression: CLI manifest/lock unchanged | cmp + sha256 against I-18S post-validation snapshots | `evidence/regression/manifest-lock-cli-immutability.txt` |
| Regression: no production `@vibe-engineer/testing` dependency | top-level package manifest sweep | `evidence/regression/top-level-testing-dependency-sweep.json` |
| Regression: no I-18B surfaces | command/starter security dirs absent | `evidence/regression/manifest-lock-cli-immutability.txt` |

## real-boundary package API and CLI-package-context import evidence
Required commands were run from the actual package contexts:

1. Package context:
```bash
cd /Users/lizavasilyeva/work/vibe-engineer/packages/security
node --input-type=module -e "const security = await import('@vibe-engineer/security'); console.log(JSON.stringify({ok: true, exports: Object.keys(security).sort()}));"
```
- Exit: `0`
- Evidence: `evidence/real-boundary/package-api/package-context-import.stdout|stderr|exit`

2. CLI package context through I-18S dependency/link/export state:
```bash
cd /Users/lizavasilyeva/work/vibe-engineer/packages/cli
node --input-type=module -e "const security = await import('@vibe-engineer/security'); const result = security.__i18aCliBoundarySmoke ? security.__i18aCliBoundarySmoke() : {ok: true, exports: Object.keys(security).sort()}; console.log(JSON.stringify(result));"
```
- Exit: `0`
- Evidence: `evidence/real-boundary/cli-package-context-import/cli-context-import.stdout|stderr|exit`

Additional lane-owned real-boundary fixture witnesses:
- `node packages/security/fixtures/real-boundary/package-api/witness.mjs` → exit `0`, evidence under `evidence/real-boundary/package-api/`.
- `node packages/security/fixtures/real-boundary/cli-package-context-import/witness.mjs` → exit `0`, evidence under `evidence/real-boundary/cli-package-context-import/`.

## command outputs/exit codes/artifact paths
Commands run from `/Users/lizavasilyeva/work/vibe-engineer` unless noted:

- `git status --short` → exit `0`; `inventory/baseline-status.txt`, `evidence/final/dirty-tree-proof.txt`.
- `find packages/security .vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package -maxdepth 6 -type f | sort` → exit `0`; `inventory/owned-paths-before.txt`, `inventory/owned-paths-after.txt`, `evidence/final/required-final-commands.txt`.
- `git diff -- packages/security .vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package` → exit `0`; `evidence/final/scoped-diff.patch`, `evidence/final/required-final-commands.txt`.
- Package-context import command → exit `0`; `evidence/real-boundary/package-api/package-context-import.*`.
- CLI-context import command → exit `0`; `evidence/real-boundary/cli-package-context-import/cli-context-import.*`.
- `node packages/security/fixtures/policy/witness.mjs` → exit `0`; `evidence/positive/policy-witness.*`, summaries under `evidence/positive/` and `evidence/negative/`.
- `node packages/security/fixtures/redaction/witness.mjs` → exit `0`; `evidence/redaction/redaction-witness.*`, `redaction-summary.json`.
- `node packages/security/fixtures/contracts/witness.mjs` → exit `0`; `evidence/contracts/contracts-witness.*`, `contract-negative-summary.json`.
- `node packages/security/fixtures/real-boundary/package-api/witness.mjs` → exit `0`; `evidence/real-boundary/package-api/witness.*`, `package-api-summary.json`.
- `node packages/security/fixtures/real-boundary/cli-package-context-import/witness.mjs` → exit `0`; `evidence/real-boundary/cli-package-context-import/witness.*`, `cli-package-context-summary.json`.
- Post-rerun evidence leak scan over I-18A evidence root found no `sk_live_FAKE` or explicit fake-secret sentinel values in evidence outputs.
- Regression immutability cmp/sha sweep → cmp exits `0` for `packages/cli/package.json`, `pnpm-lock.yaml`, and `packages/security/package.json`; `evidence/regression/manifest-lock-cli-immutability.txt`.
- Top-level `@vibe-engineer/testing` production dependency sweep → `ok: true`; `evidence/regression/top-level-testing-dependency-sweep.json`.

No package-local scripts were added, so the optional `pnpm --filter @vibe-engineer/security typecheck/test` commands were not applicable and were not substituted with weaker package-manager mutations.

## blockers, if any
None encountered within I-18A scope. No new dependencies, package-manager mutation, lockfile/root/CLI manifest edit, CLI loader/default registration edit, verification/mechanical/testing/artifacts edit, docs edit, I-18B edit, I-12/I-13/I-20 edit, or live seam blocker was required.

## final summary and handoff to independent validation
I-18A implemented the typed fail-closed `@vibe-engineer/security` policy/gate/redaction package and lane-owned witnesses. Independent validation should inspect `packages/security/src/index.js`, all `packages/security/fixtures/**`, and this evidence root; rerun positive/negative/regression/real-boundary witnesses; confirm I-18S seam still holds; and keep I-18B/I-20 blocked until validation is clean.
