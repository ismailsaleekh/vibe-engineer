# Required reading and adjudication summary

## Superseded stop condition chain
- Original post-fix prompt required stopping if `I-09A-validation-fix-report.md` reports `BLOCKED`.
- Rerun prompt supersedes that stop only for the known protected-root drift blocker.
- Fix report final checkpoint is `BLOCKED` because protected root `package.json` and `turbo.json` hash-drifted during the fix window.
- Fix evidence `validation-fix-evidence/protected-hash-comparison.json` records `protectedPathCount: 122`, `protectedChanged: ["package.json", "turbo.json"]`, and owned verification changes limited to `packages/verification/src/index.js` and `packages/verification/tests/run-witnesses.mjs`.
- `i-09a-post-fix-blocker-adjudication.md` final ruling is `EXTEND`.
- `i-09a-protected-drift-adjudication.md` previously routed `WAIT_FOR_TS_ROOT_VALIDATION` and attributed root/shared drift to TS-ROOT.
- `TS-ROOT-build-export-contract-post-fix-validation-artifact.md` records `verdict: PASS`, `severity: clean`, and `I-09A protected-drift routing: PROCEED`.
- Historical blocked post-fix report states it stopped before product inspection and before W-RB witnesses; its outputs are preserved as historical evidence only.

## Original findings to close
1. `F-CRITICAL-SECRET-ARGV-LEAK` — raw secret-like argv persisted in schema-valid Evidence Packet and sidecar.
2. `F-MAJOR-DL22-DEFAULT-DENY` — arbitrary `node -e` with allowed classification/no typed runner path passed instead of deny-before-spawn.
3. `F-MAJOR-PATH-SYMLINK-ESCAPE` — expected-artifact symlink under evidence root to protected root path passed instead of canonical realpath denial.
4. `F-MAJOR-WITNESS-SUITE-NOT-VALIDATION-SAFE` — witness suite hardcoded implementer `evidence/**`.
5. `F-MAJOR-TYPECHECK-WEAKENED-BY-TS-NOCHECK` — `tests/run-witnesses.mjs` began with `// @ts-nocheck`.

## Fix report claimed changed files and witnesses
- Product changed by fix agent: `packages/verification/src/index.js`, `packages/verification/tests/run-witnesses.mjs`.
- Fix outputs: `validation-fix-evidence/**`, `validation-fix-command-log/**`, and `I-09A-validation-fix-report.md`.
- Claimed commands/witnesses: node syntax checks, strict local JS typecheck, package-name import, redirected witness suite, targeted secret/default-deny/symlink witness, fix packet sweep, W-RB1/W-RB2/W-RB2.5 preservation.
- Residual blocker: protected `package.json`/`turbo.json` drift, now TS-ROOT-resolved by adjudication.
