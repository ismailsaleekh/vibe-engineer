# Required Reading / Blocker Extract

## Files read before stop

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/i-09a-validation-fix-execute.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/reports/i-09a-validation-fix-prompt-validation-artifact.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-09A-verification-runner-core-evidence-routing/I-09A-validation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-09A-verification-runner-core-evidence-routing/I-09A-validation-artifact.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-09A-verification-runner-core-evidence-routing/I-09A-validation-fix-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-09A-verification-runner-core-evidence-routing/I-09A-implementation-report.md`

## Original independent validation findings requiring closure

- `F-CRITICAL-SECRET-ARGV-LEAK`: raw secret-like argv persisted in schema-valid Evidence Packet and sidecar.
- `F-MAJOR-DL22-DEFAULT-DENY`: arbitrary `node -e` command passed/spawned instead of deny-before-spawn.
- `F-MAJOR-PATH-SYMLINK-ESCAPE`: expected-artifact symlink under evidence root to root `package.json` passed instead of realpath denial.
- `F-MAJOR-WITNESS-SUITE-NOT-VALIDATION-SAFE`: witness suite hardcoded implementer evidence root.
- `F-MAJOR-TYPECHECK-WEAKENED-BY-TS-NOCHECK`: witness suite started with `// @ts-nocheck`.

## Fix report claims

Changed files claimed by fix agent:

- `/Users/lizavasilyeva/work/vibe-engineer/packages/verification/src/index.js`
- `/Users/lizavasilyeva/work/vibe-engineer/packages/verification/tests/run-witnesses.mjs`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-09A-verification-runner-core-evidence-routing/I-09A-validation-fix-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-09A-verification-runner-core-evidence-routing/validation-fix-evidence/**`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-09A-verification-runner-core-evidence-routing/validation-fix-command-log/**`

Commands/witnesses claimed by fix agent:

- `node --check packages/verification/src/index.js` exit 0.
- `node --check` over all `.js/.mjs` in verification src/tests/fixtures exit 0.
- Strict local `tsc --allowJs --checkJs ... --noEmit` exit 0.
- Package-name API import from `packages/verification` exit 0.
- Witness suite redirected with `--evidence-root` into fix-owned evidence exit 0.
- Targeted validation-fix witness exit 0.
- Fix Evidence Packet sweep via real `@vibe-engineer/artifacts` exit 0.
- Claimed W-RB1, W-RB2, and W-RB2.5 preserved in implementer/fix evidence.

Residual risk/blocker claimed by fix agent:

- The fix report final checkpoint explicitly reports `Verdict: BLOCKED`.
- Blocking condition: `validation-fix-evidence/protected-hash-comparison.json` records protected root `package.json` and `turbo.json` hash drift during the fix window.
- Exact ruling requested by fix agent: determine/serialize ownership for concurrent protected root `package.json`/`turbo.json` drift, then launch independent I-09A post-fix validation; I-09B remains blocked.

## Fix blocker evidence inspected

`validation-fix-evidence/protected-hash-comparison.json` records:

```json
{
  "protectedPathCount": 122,
  "protectedChanged": [
    "package.json",
    "turbo.json"
  ],
  "ownedVerificationChangedSinceBeforeCommandInventory": [
    "packages/verification/src/index.js",
    "packages/verification/tests/run-witnesses.mjs"
  ]
}
```

## Revalidation ruling from prompt

The post-fix validation prompt states: if the fix report is absent, incomplete, or reports `BLOCKED`, stop as `BLOCKED` and record evidence; do not substitute your own fix. Therefore this revalidation stops before product inspection and before W-RB2.5/live witnesses.
