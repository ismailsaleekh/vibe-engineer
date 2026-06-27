# I-16A — Triad-B IMPLEMENT report (starter-contracts-api-provider: golden-api + golden-contracts fixtures)

- Lane: I-16A-starter-contracts-api-provider (golden-api + golden-contracts fixtures).
- Agent: Triad-B IMPLEMENTER (execute validated-PASS brief faithfully; NOT self-validating — independent Triad revalidation required for truth-green).
- Working dir: `/Users/lizavasilyeva/work/vibe-engineer`.
- Brief: `.pi/hlo/vibe-engineer/implementation-briefs/I-16A-brief-generated.md` (independent VALIDATE = PASS).
- Quality bar (`.pi/hlo/vibe-engineer/prompts/quality-bar.md`) prepended verbatim to the implementer prompt — binding.
- Owned WRITE: `examples/starter-reference/generated-fixtures/golden-contracts/**`, `examples/starter-reference/generated-fixtures/golden-api/**`, `.vibe/work/I-16A-starter-contracts-api-provider/**`.
- Status: **DONE (implementation complete; green against the real runtime; pending independent Triad revalidation).**

## Deliverable summary

Two generated-fixture trees under the reference starter that together constitute the **real-boundary golden witness for the DL-14 API-contract mechanism in the starter context**, mirroring the proven I-11 reference-flow pattern applied to the domain-neutral `golden-records` sample/demo module (DL-16/DL-20A). Contract is the single source of truth; the generated/shared client is derived ONLY from the contract; the Nest-compatible provider validates request+response (fail-closed); the consumer imports contract-derived types/client only; the witness exercises the REAL `@ts-rest/core`+`zod` runtime (no mock).

## Files changed (exact; all under owned WRITE paths)

**golden-contracts/** (`examples/starter-reference/generated-fixtures/golden-contracts/`):
- `package.json` — graph-neutral fixture manifest (NOT a pnpm workspace member; modeled deps only; no graph/lockfile impact).
- `README.md`
- `schema-contract-strictness.manifest.json` — strictness manifest + real-resolution provenance.
- `src/golden-records.contract.ts` — **canonical contract** (single source of truth; named `.strict()` Zod schemas + `ts-rest` router + inferred types).
- `src/generated/golden-records-client.ts` — **AUTO-GENERATED** shared client (initClient + validating ApiFetcher; provenance w/ canonical contract path + source SHA-256).
- `src/generation/generate-golden-records-client.ts` — generator that projects contract → client (idempotent).

**golden-api/** (`examples/starter-reference/generated-fixtures/golden-api/`):
- `package.json` — graph-neutral fixture manifest; `witness` script.
- `README.md`
- `src/provider/golden-records.provider.ts` — Nest-style provider (fail-closed req+resp validation; `GoldenRecordsContractBoundaryError`; `GoldenRecordsApplicationProbe`; `forceInvalidProviderResponse`).
- `src/consumer/golden-records.consumer.ts` — calls generated client + re-parses response (no local schema defs).
- `src/witness/golden-records.real-boundary.ts` (+ `.cli.ts`) — 5-boolean real-boundary witness.
- `src/runtime/dep-resolver-hooks.mjs` (+ `dep-resolver-register.mjs`) — ESM resolve hook mapping `@ts-rest/core`/`zod` to real pnpm-store paths + `.js`→`.ts` mapping for type-stripped execution.
- `run-golden-records-witness.mjs` — witness runner (canonical entry) + evidence packet emitter.

**work root** (`.vibe/work/I-16A-starter-contracts-api-provider/`):
- `I-16A-implementation-report.md` (this file).
- `evidence/golden-records-witness-result.json` (machine-readable evidence packet, ok=true, 9/9 checks PASS).

## Real-boundary witness result (REAL `@ts-rest/core@3.52.1` + `zod@3.25.76`; NO mock)

`runGoldenRecordsRealBoundaryWitness()` →
```json
{"providerAccepted":true,"consumerAccepted":true,"invalidRequestRejectedBeforeLogic":true,"invalidResponseRejected":true,"clientInvalidResponseRejected":true}
```
Runner = 9/9 checks PASS: W-RESOLVE, W-PROVIDER, W-NEG-REQ, W-NEG-RESP, W-CLIENT, W-NODUP, W-DOMAIN-NEUTRAL, W-REG-REGEN, W-INVARIANTS.

## Evidence — brief §8 validation commands (commands + exit codes + output)

All run under `/Users/lizavasilyeva/work/vibe-engineer`.

1. **§8.1 dep-resolution proof** (from `packages/contracts` context):
   - `node --input-type=module -e "import('@ts-rest/core').then(...); import('zod').then(...);"` → exit **0**
   - output: `ts-rest true validateResponse function` / `zod true object function`
   - resolved paths: `@ts-rest/core@3.52.1` → `node_modules/.pnpm/@ts-rest+core@3.52.1_.../...`; `zod@3.25.76` → `node_modules/.pnpm/zod@3.25.76/...` (recorded in evidence packet `runtime.resolution`).
2. **§8.2 run real-boundary witness** (.ts directly, with the dep-resolver `--import`):
   - `node --import ./src/runtime/dep-resolver-register.mjs --experimental-strip-types ./src/witness/golden-records.real-boundary.cli.ts` (cwd=`generated-fixtures/golden-api`) → exit **0**
   - output: the 5-boolean JSON above (all true).
   - (The brief §8.2 command omits the `--import` flag; the implementer fixes the exact entry path and invocation per §8.2 "exact path fixed by implementer". The `--import` is required for real bare-specifier resolution from the non-workspace fixture location — the license-free mechanism §8.1 sanctions. No manifest/lockfile edit.)
   - Canonical entry / runner: `node --import ./src/runtime/dep-resolver-register.mjs --experimental-strip-types ./run-golden-records-witness.mjs` → exit **0**, 9/9 checks PASS.
3. **§8.4 W-NODUP structural grep**:
   - `rg -n "z\.object|z\.string|z\.number|z\.enum" examples/.../golden-api/src/consumer examples/.../golden-contracts/src/generated` → exit **1** (ZERO schema definitions in consumer/generated — only in the canonical contract).
4. **§8.5 W-DOMAIN-NEUTRAL grep**:
   - `rg -n "@sample|@demo|@reference|golden-record|GoldenRecord" .../golden-contracts .../golden-api` → exit 0 (labels + golden vocabulary present throughout).
   - forbidden-business-vocab probe (`ecommerce|inventory|fashion|Billz|...`) scoped to `**/src/**` → exit **1** (clean). [The unscoped probe matches only the runner's own detector list — a self-match, not fixture logic; recorded.]

## Dirty-tree scope confirmation

`git status --porcelain` (cwd=repo root) shows exactly **3** entries attributable to this lane — all owned:
- `?? .vibe/work/I-16A-starter-contracts-api-provider/`
- `?? examples/starter-reference/generated-fixtures/golden-api/`
- `?? examples/starter-reference/generated-fixtures/golden-contracts/`

No serialized/unowned surface touched (root manifest/lockfile/turbo/tsconfig, harness `packages/contracts/**`, I-15B `.source-template/**`, sibling fixtures, barrels, `.github/**`, git state all untouched). 253 pre-existing baseline dirty paths recorded as baseline (not this lane). No new package dependency, no install, no lockfile edit, no `node_modules` created.

## How the real runtime is reached (truth-green, not shape-green)

The fixture path is NOT a pnpm workspace member and the repo-root `node_modules` does NOT hoist `@ts-rest/core` (pnpm keeps it virtual under `.pnpm`); bare-specifier resolution from the fixture location fails. Per brief §8.1 (in-context resolution, I-15B-3 precedent) the fixture uses a Node 24 ESM `resolve` loader hook (`src/runtime/dep-resolver-hooks.mjs`, registered via `--import`) that anchors CJS resolution at the harness `packages/contracts` package (which declares + resolves `@ts-rest/core@3.52.1` + `zod@3.25.76`) and maps the bare specifiers to their REAL pnpm-store paths. This adds ZERO edges to the workspace graph (no manifest/lockfile/node_modules/install), throws fail-closed if the real packages cannot resolve (never silently mocks), and the witness therefore exercises the actual `initContract`/`initClient`/`validateResponse` + real `zod` parse on the actual fixture contract/provider/client/consumer code.

## Staged log (recovery trail)

1. READ brief + validation artifact + I-11 mirror targets (contract/provider/consumer/generated-client/witness/manifest/generator) + I-15B source-template golden-records slot + I-15B-3 harness-consumption fixture precedent. DONE.
2. Dep-resolution probe: confirmed bare specifiers resolve ONLY from `packages/contracts`; validated the Node 24 ESM resolve-hook mechanism (real initContract+zod parse exercised; exit 0). DONE.
3. Authored golden-contracts fixture (canonical contract + generator → generated client + manifest + package.json + README). DONE.
4. Authored golden-api fixture (provider + consumer + witness + dep-resolver hook + witness runner + package.json + README). Fixed one cross-fixture relative-path depth (provider: `../../../../` → `../../../`) and the `.js`→`.ts` strip-types resolution (handled in the hook). DONE.
5. Ran all §8 validation commands + the runner (9/9 checks PASS, exit 0). Captured evidence packet. DONE.
6. Confirmed dirty-tree scope = 3 owned paths only. DONE.

## Deferred debts

None. (Severity gate: no critical/major-local defects observed by the implementer; independent Triad revalidation required for truth-green — DONE ≠ PASS.)

## STOP / BLOCKED

Not hit. No untouchable/serialized surface edited; no manifest/lockfile edit; no DB/Prisma boundary needed (in-fixture application probe, mirror I-11); no on-disk contradiction of DL-14 found.
