# I-18A Third Post-Fix Revalidation Artifact

Status: COMPLETE
Verdict: NEEDS-FIX
Severity: critical

## Checkpoint 0 - artifact initialized
- Files inspected: none yet.
- Files changed by validator: this artifact only.
- Evidence: artifact created before validation per task instruction.
- Blockers: none.
- Next step: read source truth and prior reports.

## Checkpoint 1 - required source truth read
- Files inspected: `I-18A-third-post-fix-fix.md`, `I-18A-third-fix-prompt-validation-artifact.md`, `I-18A-third-fix-report.md`, `I-18A-second-post-fix-revalidation-artifact.md`.
- Extracted blocker to validate: SPF1 command-string secret/command carrier fail-open; SPF2 incomplete canonical path rejection; SPF3 missing mandatory protected floor for workspace/turbo/package manifests and shared CLI surfaces.
- Implementer-reported fix: `packages/security/src/index.js`, `packages/security/fixtures/policy/witness.mjs`, `packages/security/fixtures/contracts/witness.mjs`, `third-fix-evidence/**`, report only; claimed 44-case adversarial witness, real package/API and CLI-package-context imports, unsupported shipped CLI security command, no unauthorized surfaces.
- Prior failing revalidation evidence: 9 deterministic false-green cases; F1-F6 and PF1-PF4 mostly closed except SPF1-SPF3.
- Files changed by validator: this artifact only.
- Blockers: none.
- Next step: inspect path-scoped status/diff/inventory and actual security package source/fixtures/evidence.

## Checkpoint 2 - dirty tree, scope, source, prior artifacts inspected
- Commands inspected: `git status --short -- packages/security .vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package`; `git diff --stat/name-status -- packages/security .vibe/work/...`; `git ls-files -- packages/security`; `find packages/security .vibe/work/... -maxdepth 6 -type f`.
- Dirty-tree evidence: path-scoped status shows `?? packages/security/` and `?? .vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/`; `git diff` is empty because these lane surfaces are untracked/no-HEAD baseline; `git ls-files -- packages/security` returns no tracked files. No git cleanup/reset/restore/stash/checkout used.
- Inventory evidence: 305 files under owned product/work paths; validator-created file is this artifact only.
- Files inspected: `packages/security/src/index.js`; `packages/security/fixtures/policy/witness.mjs`; `packages/security/fixtures/contracts/witness.mjs`; `packages/security/fixtures/redaction/witness.mjs`; `packages/security/fixtures/real-boundary/package-api/witness.mjs`; `packages/security/fixtures/real-boundary/cli-package-context-import/witness.mjs`; `third-fix-evidence/negative/third-fix-adversarial-witness.mjs`; `third-fix-evidence/negative/third-fix-adversarial-witness-summary.json`; `third-fix-evidence/source/changed-source-lines.txt`; `third-fix-evidence/final/exit-code-summary.txt`; `third-fix-evidence/final/scoped-diff.patch`; package/root/workspace/turbo manifests; prior I-18A validation/fix/revalidation artifacts for F1-F6 and PF1-PF4.
- Source inspection evidence: `MANDATORY_PROTECTED_PATH_PREFIXES` now includes root manifests/configs (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, config files), `packages/cli/package.json`, `packages/security/package.json`, and shared CLI entry/loader/envelope/errors/testing prefixes. `evaluateCommandSafety` scans typed carrier tokens from both `command` and `argv`. `isUnsafePathTarget` rejects empty/root/dot/dotdot, any Windows drive prefix, UNC/network `//`, absolute `/`, tilde, empty segments, any `..` segment, then compares dot-normalized canonical path against mandatory+policy protected prefixes.
- Fixture/evidence inspection: third-fix witness source contains required SPF1-SPF3 negatives and positives; summary reports `ok: true`, `total: 44`, every check `ok: true`; implementer exit summary reports all syntax/package/API/CLI-context/witness/regression commands with expected exits, default CLI security command exit `2`, sentinel scan exit `0`.
- Scope inspection: no tracked diff in root/package-manager/manifest/CLI loader/I-18B/I-18S/shared surfaces; manifests read-only show only `@vibe-engineer/security` existing CLI dependency and no `@vibe-engineer/testing` production dependency.
- Files changed by validator: this artifact only.
- Blockers: none.
- Next step: run independent no-product-write syntax, real-boundary, command/path adversarial, regression, redaction, and blast-radius witnesses.

## Checkpoint 3 - independent witnesses run
- Files changed by validator: this artifact only. I did not execute lane fixture witnesses that write summaries under evidence roots; I inspected them and ran no-product-write inline witnesses against the actual exported/source API.
- Syntax checks: `node --check` for `packages/security/src/index.js`, policy/contracts/redaction/real-boundary fixture `.mjs` files, and third-fix adversarial witness all exited `0`.
- Real-boundary package import: from `packages/security`, `await import('@vibe-engineer/security')` exited `0`, exported the expected API names, and `__i18aCliBoundarySmoke()` returned `{ok:true,status:"passed",decision:"allow"}`.
- Real-boundary CLI package-context import: from `packages/cli`, `await import('@vibe-engineer/security')` exited `0` and smoke returned `{ok:true,status:"passed",decision:"allow"}`.
- Broad independent no-write adversarial witness: direct source import of `packages/security/src/index.js` ran 73 checks and exited `0`: safe positives, SPF1 command-string key+value secret examples, malformed command carriers, destructive shell-like forms, SPF2 Windows/UNC/tilde/dot/traversal/malformed path cases, SPF3 mandatory floor, direct unsafe policy floor removal, external/sandbox/evidence/redaction regressions all behaved as expected.
- Public package focused adversarial witness: from `packages/security`, 5 selected public-import checks exited `0`: positive safe target, command-string `--api-key <secret>` block/redact, `C:outside` block, `pnpm-workspace.yaml` block, and direct unsafe policy floor removal block. From `packages/cli`, combined command-string secret plus `./turbo.json` path returned `blocked` with `secret_like_value` and `unsafe_command_target` and redacted sentinel.
- Default shipped CLI regression: `node packages/cli/src/entry/vibe-engineer.js security --api-key <fake>` exited `2`, returned `unsupported_operation`, and redacted the argv sentinel.
- Scope/dependency sweep: independent Node sweep found `packages/cli/src/commands/security`, starter security fixtures, `.github`, `scripts`, and `infra` absent; no production `@vibe-engineer/testing` dependency; CLI still depends on `@vibe-engineer/security: workspace:*`; security package export remains `./src/index.js`; root package manager remains `pnpm@10.33.0`.
- Sentinel scan: `rg` over I-18A work/security generated outputs excluding `.mjs`, `.md`, and sentinel-scan logs returned no fake-secret matches.
- Non-required note: importing `@vibe-engineer/security` from the workspace root failed because the root package does not declare the dependency; required package and CLI package contexts passed.
- Critical failing witness discovered: public package import from `packages/security` ran three embedded-secret-flag cases expecting `blocked/secret_like_value`; command exited `1` because all three returned `passed/allow` with no classifications:
  - `command: "node --api-key", argv: []`
  - `command: "node --api-key", argv: ["abc123"]`
  - `command: "node --client-secret", argv: ["abc123"]`
- Blockers: none.
- Next step: classify findings and final verdict.

## Findings
| ID | Severity | Classification | Finding | Evidence | Required fix |
| --- | --- | --- | --- | --- | --- |
| TPR1 / SPF1-incomplete | critical | NEEDS-FIX | The SPF1 root cause is not fully closed. Secret-like CLI flag keys embedded inside the `command` string pass green when the flag lacks an inline value or when its value is carried separately in `argv`. This is the same command-carrier ambiguity class as the prior blocker: the typed command carrier is not scanned as a full token stream, and `command` is not strictly modeled as an executable token. | Source: `evaluateCommandSafety` only tests `isSecretLikeValue(token.value)` for the entire `command` string and only applies `token.value.startsWith('-') && isSecretLikeKey(token.value)` to whole carrier tokens. Witness from `packages/security` public import returned `passed/allow` for `node --api-key`, `node --api-key` + `argv:["abc123"]`, and `node --client-secret` + `argv:["abc123"]`. By contrast, `argv:["--api-key"]` blocks, proving inconsistent carrier handling. | Either reject whitespace/embedded arguments in `command` so it is a strict executable token, or tokenize/scan the full typed command carrier (`command` plus `argv`) for secret-like flag keys and key/value pairs across carrier boundaries. Add public-boundary regression cases for embedded secret flag without value and split command/argv secret key/value. |

## SPF / regression classification
| Area | Classification | Evidence |
| --- | --- | --- |
| SPF1 command-string key+value examples | clean for narrow examples | `node --api-key <fake-secret>` and `node --client-secret=<fake-secret>` block/redact in direct and public package witnesses. |
| SPF1 embedded secret flag / split carrier | critical | TPR1 failing public-boundary witness; returns `passed/allow`. |
| SPF2 path canonicalization | clean for required cases | Independent 73-case witness blocks Windows drive-relative/absolute/backslash, UNC, tilde, dot aliases, traversal, absolute/root/empty/double-slash/dot, declared write path, working directory, and backslash package-manifest aliases with `unsafe_command_target`. |
| SPF3 mandatory protected floor | clean for required cases | Independent witnesses block `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.git/config`, CLI/security package manifests, CLI loader/entry/envelope/errors/testing, and direct unsafe policy floor removal. |
| F1-F6 prior findings | clean except command-carrier gap above | Traversal/Windows absolute, malformed command/target carriers, policy enum restrictions, pending-live sandbox, config array secret, circular/BigInt evidence all pass current witnesses. |
| PF1-PF4 prior findings | clean | Unsafe command policy relaxation, removable protected floor, malformed external booleans, and malformed sandbox provider/claim all fail closed in current witnesses. |
| Real package/API and CLI-context seams | clean | Actual `@vibe-engineer/security` imports from `packages/security` and `packages/cli` exit `0`; smoke passes. |
| Secret redaction for executed outputs | clean for tested outputs | Fake sentinels redacted in command-string secret, env/config/evidence, default CLI regression, and rg scan excluding witness sources/scan logs found no generated-output leaks. |
| Dirty-tree / scope / blast radius | clean | Validator wrote only this artifact; no forbidden git operations; scoped shared-surface diff exits `0`; I-18B security command/starter security fixtures absent; no production `@vibe-engineer/testing` dependency. |

## Severity rationale
- Severity is `critical` because the load-bearing command safety policy still returns deterministic false-green `passed/allow` for secret-like command carrier data embedded in the `command` string, specifically secret flag keys and split command/argv key-value carriers.
- This is fixable within I-18A-owned `packages/security/src/**` and fixtures/evidence; no ownership/environment wall was encountered.
- SPF2 and SPF3 appear closed for the required boundaries, but I-18B must remain blocked because SPF1 remains incomplete.

## Final verdict
NEEDS-FIX. Implementer `DONE` is not validation `PASS`; I-18B remains blocked pending a subsequent independent revalidation that closes TPR1/SPF1-incomplete.
