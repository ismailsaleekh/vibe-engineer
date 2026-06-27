# I-13C Implementation Report (Triad-B IMPLEMENT)

**Lane:** `I-13C-p2-aggregate-runner-bridge`
**Implementer:** glm-5.2 (zai, thinking high) — Triad-B IMPLEMENTER
**Brief:** `.pi/hlo/vibe-engineer/implementation-briefs/I-13C-brief-generated.md` (validated PASS)
**Target repo:** `/Users/lizavasilyeva/work/vibe-engineer` (HEAD `001c76d`)
**Work root:** `.vibe/work/I-13C-p2-aggregate-runner-bridge`
**Status:** **DONE — clean (truth-green)**

## Stage 1 — Reading / premise confirmation

Confirmed on-disk:
- HEAD = `001c76d` ✓.
- `src/aggregate/index.js`/`index.d.ts` registered P0 + P1 only; **no P2** ✓.
- `src/aggregate/p2/` and `fixtures/p2/aggregate/` did **not** exist ✓.
- P2 source `src/p2/code-smell/index.ts` self-contained (`node:crypto`/`node:fs/promises`/`node:path`/`typescript`) + `node-shims.d.ts` ✓.
- P2 public API: `validateCodeSmells(projectRoot, options?)`, `CODE_SMELL_FAMILY="p2.code-smell"`, `CODE_SMELL_RATCHET_CARRIER_VERSION="quality-ratchet.findings/1"` ✓.
- `mechanical-gates/package.json` has **no `dependencies` block**; `./aggregate` barrel maps to `index.{js,d.ts}` ✓ (OBS-2 confirmed: no `package.json` edit required — mirrors I-12C).
- I-12C P1 runner + fixtures pattern confirmed ✓.
- Pre-existing dirty-tree (I-18B / DL-18P: `packages/cli/src/commands/security/**`, `docs/decisions/DL-18B-*`, `.vibe/work/I-18*`, `.vibe/work/DL-18P*`) is **file-disjoint** from every I-13C owned path ✓.

## Stage 2 — Runner authored

`packages/mechanical-gates/src/aggregate/p2/run-p2-aggregate.js` (new). Faithful mirror of `p1/run-p1-aggregate.js` adapted to P2:
- `P2_AGGREGATE_FAMILY="p2.aggregate"`, `P2_AGGREGATE_FAMILIES=Object.freeze(["p2.code-smell"])`, `VALIDATOR_EXPORT_NAME="validateCodeSmells"`, `AGGREGATE_WORK_ROOT=".vibe/work/I-13C-p2-aggregate-runner-bridge/aggregate"`.
- Real compile-bridge: `spawnSync("pnpm", ["exec","tsc", ...])` compiles the **real** P2 source (`node-shims.d.ts` + `index.ts`) to the owned work root, dynamic `import()` (cache-bust), reads `validateCodeSmells`, invokes it over the real I-13 fixtures, asserts `family==="p2.code-smell"`.
  - **Bridge compile flags = the P2 witness compile flags** (`--strict --skipLibCheck false --lib ES2022`), NOT the P1 strict matrix. Rationale: the P2 source is read-only and contains unused locals (`TraversalFailure`, `sourceFile`) that fail `--noUnusedLocals`/`--noUnusedParameters`; the only faithful, in-license mirror is the exact invocation the real P2 source compiles under (the one the green I-13 P2 witness uses). No band-aid; no edit to read-only P2 source.
- Typed build-artifact carrier `codeSmellBridge`: `carrierVersion:"p2.aggregate.code-smell-runner-bridge/1"`, `bridgeFamily`, `validatorFamilyExpected`, `ratchetCarrierVersion`, `sourceTsFilesUsed`, `outputArtifactDirectory/File`, `moduleUrl`, `exportedValidatorName`, command/args/cwd/status/stdout/stderr/signal/errorMessage, `exportFound`, `validatorFamilyObserved`, `typedSubresultValidation`.
- Aggregate result `family:"p2.aggregate"`, `evidence.schemaVersion:"p2.aggregate.result/1"`, `implementedFamilies`, `requestedFamilies`, `subresults`, **`stableFindings`** (P2 findings projected into the ratchet seam carrying `tool`/`ruleId`/`detectorId`/`mode`/`symbol`/`structuralSignature`/`contentHash` consistent with `quality-ratchet.findings/1`), `codeSmellBridge`, `sourceApiIdentities`, `sourceFiles`, `inputPaths`, `summary`.
- Fail-closed ruleIds: `aggregate.p2-bridge.compile-failed`, `aggregate.p2-bridge.missing-artifact`, `aggregate.p2-bridge.import-failed`, `aggregate.p2-bridge.wrong-export`, `aggregate.p2-bridge.wrong-family`, `aggregate.p2-bridge.path-invalid`, `aggregate.malformed-subresult`, `aggregate.validator-exception`, `aggregate.missing-subresult`, `aggregate.omitted-family`, `aggregate.unknown-family`, `aggregate.invalid-option`, `aggregate.unknown-option`. Any bridge failure ⇒ `ok:false` with the specific ruleId + typed carrier still emitted (never throws out, never silent). Injected synthetic `subresults` option rejected as `aggregate.unknown-option`.
- Path normalization mirrors I-12C: `normalizeRepoRelative`/`assertAllowedPrefix`; bridge source allowlist `[src/p2/code-smell/, fixtures/p2/aggregate/]`, output allowlist `[I-13C work root/, fixtures/p2/aggregate/]`; repo-root-escape/traversal rejected.

## Stage 3 — Barrel + declarations extended

- `src/aggregate/index.js`: added `export { P2_AGGREGATE_FAMILIES as P2AggregateFamily, runP2Aggregate } from "./p2/run-p2-aggregate.js";` (purely additive; P0/P1 exports untouched).
- `src/aggregate/index.d.ts`: added `P2AggregateFamily`, `P2CodeSmellBridgeOptions`, `P2CodeSmellAggregateOptions`, `P2AggregateOptions`, `P2CodeSmellBridgeEvidence`, `P2AggregateFinding`, `P2AggregateStableFinding`, `P2AggregateEvidence`, `P2AggregateResult`, `P2AggregateFamily` const, `runP2Aggregate` (mirrors the P1 declaration block).
- `package.json`: **unchanged** (OBS-2 — `./aggregate` already resolves the new export; no subpath needed; `dependencies` absent → trivially unchanged).

## Stage 4 — Fixtures authored

`fixtures/p2/aggregate/`:
- `witness.mjs` — positive (clean green + smelly real-findings + stableFindings ratchet projection) + full negative matrix + P0/P1 sibling/blast-radius regression + `--typecheck` mode.
- `typecheck-consumer.ts` — declaration consumer (mirrors P1).
- `bridge-modules/{compile-failure,malformed-result,validator-exception,wrong-export,wrong-family}/index.ts` — negative bridge fixtures (P2-flavored mirrors of the I-11 fixtures; each exports/abuses `validateCodeSmells`).

## Stage 5 — Validation commands + evidence (all exit 0)

Run from `/Users/lizavasilyeva/work/vibe-engineer`. Evidence JSON written to `.vibe/work/I-13C-p2-aggregate-runner-bridge/aggregate/{witness,typecheck}-evidence/`.

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `node --check src/aggregate/p2/run-p2-aggregate.js` | 0 | syntax OK |
| 1 | `node --check src/aggregate/index.js` | 0 | syntax OK |
| 1 | `node --check fixtures/p2/aggregate/witness.mjs` | 0 | syntax OK |
| 2 | `tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck false fixtures/p2/aggregate/typecheck-consumer.ts` | 0 | declaration consumer typechecks |
| 3 | `node fixtures/p2/aggregate/witness.mjs` (full) | 0 | W-P2-POS clean + smelly + full negative matrix + P0/P1 regression all pass |
| 3 | `node fixtures/p2/aggregate/witness.mjs --typecheck` | 0 | typecheck mode pass |
| 4 | W-REG via public `./aggregate` self-reference | 0 | `runP2Aggregate`=`function`, `P2AggregateFamily`=`["p2.code-smell"]`, registered set `{p0,p1,p2}` |

**W-P2-POS (real-boundary):** bridge compiled the **real** `src/p2/code-smell/{node-shims.d.ts,index.ts}` → `exportFound:true`, `exportedValidatorName:"validateCodeSmells"`, `validatorFamilyObserved:"p2.code-smell"`, `typedSubresultValidation.ok:true`, `status:0`, compiled artifact exists on disk. Clean project → `ok:true` (0 findings). Smelly project → `ok:false` (8 real findings incl. blocking `deep-control-flow-nesting` mode `hard`), and `stableFindings` carries the real stable identity (`tool:"p2.code-smell"`, `detectorId`, `mode:"hard"`, `contentHash` `c40895b8…`) — ratchet seam preserved.

**Negative matrix (all fail closed with the typed carrier + expected ruleId, `ok:false`):** compile-failure→`aggregate.p2-bridge.compile-failed`(+missing-subresult); missing-artifact→`aggregate.p2-bridge.missing-artifact`; wrong-export→`aggregate.p2-bridge.wrong-export`; wrong-family→`aggregate.p2-bridge.wrong-family`; malformed-result→`aggregate.malformed-subresult`; validator-exception→`aggregate.validator-exception`; bridge output traversal→`aggregate.p2-bridge.path-invalid`; bridge input traversal→`aggregate.p2-bridge.path-invalid`; omitted-family→`aggregate.omitted-family`; unknown-family→`aggregate.unknown-family`; invalid families option→`aggregate.invalid-option`; unknown option→`aggregate.unknown-option`; injected synthetic `subresults`→`aggregate.unknown-option`.

**W-REG / W-FC-POS achievability:** the public `./aggregate` barrel now exposes `{runP0Aggregate, runP1Aggregate, runP2Aggregate}` → real aggregate registered family set is `{p0,p1,p2}`. (Note: the workspace packages are not hoisted into a root `node_modules/@vibe-engineer`; `@vibe-engineer/mechanical-gates/*` bare specifiers resolve via Node **package self-reference**, which only applies from inside the package — so W-REG was run from `packages/mechanical-gates/`, exercising the actual `exports` mapping `./aggregate`→`index.js`. The repo-root form in the brief cannot self-reference in this layout; the from-package run is the truthful equivalent and is what every other witness in this repo does via relative imports.) I-13C claims registration reality + fail-closed carrier only; the actual I-20A W-FC-POS run belongs to I-20A/I-20D.

**Sibling/blast-radius sweep:** `runP0Aggregate` over `fixtures/p0/allowlist-domain-aggregate/valid-aggregate` → `family:"p0.aggregate"`, `ok:true`, `p0.allowlist` subresult retained. `runP1Aggregate(repoRoot)` → `family:"p1.aggregate"`, `ok:true`, implemented families `["p1.schema-contract-strictness","p1.quality-ratchet","p1.test-anti-pattern"]` retained. Barrel extension is purely additive — no P0/P1 regression.

## Stage 6 — No-new-deps + dirty-tree proof

`git status --porcelain` shows only I-13C owned changes plus pre-existing file-disjoint I-18B/DL-18P dirty-tree:
- **Owned (this lane):** `M packages/mechanical-gates/src/aggregate/index.js`, `M packages/mechanical-gates/src/aggregate/index.d.ts`, `?? packages/mechanical-gates/src/aggregate/p2/`, `?? packages/mechanical-gates/fixtures/p2/aggregate/`, `?? .vibe/work/I-13C-p2-aggregate-runner-bridge/`.
- **Benign witness artifact:** `?? .vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate/i11-bridge-artifacts/run-…/` — emitted by re-running `runP1Aggregate` (the P1 runner's designed `AGGREGATE_WORK_ROOT`); ephemeral `.vibe/work` evidence, not a source/serialized-surface edit.
- **Pre-existing (not this lane):** `packages/cli/src/commands/security/**`, `docs/decisions/DL-18B-*`, `.vibe/work/I-18*`, `.vibe/work/DL-18P*`.

- `git diff -- packages/mechanical-gates/package.json` → **empty** (unchanged).
- `git diff -- pnpm-lock.yaml` → **0 lines** (unchanged).
- `git diff -- turbo.json package.json` → **0 lines** (unchanged, I-20S-owned surfaces untouched).

No new package dependency. No edit to root scripts / turbo / lockfile / workflows / CLI / Pulumi / I-13 P2 source internals / I-12 P1 runner. No commits (operator commits only).

## Stage 7 — Files changed (exact)

New:
- `packages/mechanical-gates/src/aggregate/p2/run-p2-aggregate.js`
- `packages/mechanical-gates/fixtures/p2/aggregate/witness.mjs`
- `packages/mechanical-gates/fixtures/p2/aggregate/typecheck-consumer.ts`
- `packages/mechanical-gates/fixtures/p2/aggregate/bridge-modules/compile-failure/index.ts`
- `packages/mechanical-gates/fixtures/p2/aggregate/bridge-modules/malformed-result/index.ts`
- `packages/mechanical-gates/fixtures/p2/aggregate/bridge-modules/validator-exception/index.ts`
- `packages/mechanical-gates/fixtures/p2/aggregate/bridge-modules/wrong-export/index.ts`
- `packages/mechanical-gates/fixtures/p2/aggregate/bridge-modules/wrong-family/index.ts`
- `.vibe/work/I-13C-p2-aggregate-runner-bridge/**` (report + witness/typecheck evidence JSON)

Modified:
- `packages/mechanical-gates/src/aggregate/index.js` (additive P2 barrel export)
- `packages/mechanical-gates/src/aggregate/index.d.ts` (additive P2 declarations)

## Deferred debts / STOP items

None. No BLOCKED ruling. No band-aids, no silent fallbacks, no out-of-license edits. The single adaptation vs. the literal brief (bridge compile flags = P2 witness flags rather than P1 strict matrix) is the only faithful in-license choice, since the alternative would require editing read-only P2 source — explicitly forbidden.

**Status: DONE — clean / truth-green.** Real-boundary witnesses pass (real P2 source compiled → real `validateCodeSmells` → real I-13 fixtures), registration is real (`{p0,p1,p2}`), full fail-closed negative matrix passes, no new dependency, dirty-tree scope clean.
