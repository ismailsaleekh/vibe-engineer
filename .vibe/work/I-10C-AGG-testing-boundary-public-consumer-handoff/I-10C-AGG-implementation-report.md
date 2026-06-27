# I-10C-AGG — Triad-B IMPLEMENT report

- Lane: `I-10C-AGG-testing-boundary-public-consumer-handoff`
- Role: Triad-B IMPLEMENTER (glm-5.2, thinking high). Independent revalidation follows.
- Brief: `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-10C-AGG-brief-generated.md` (validated PASS).
- Working dir (product): `/Users/lizavasilyeva/work/vibe-engineer`.
- Status: **IN_PROGRESS**

## Model

Model A: the mechanical-gates P0 aggregate runs `p0.testing-boundary` as a registered implemented family, reachable by a real public consumer (`@vibe-engineer/mechanical-gates/aggregate`). No `package.json`/export/lockfile edits.

## Owned WRITE paths (THIS implementer — brief §3)

- `packages/mechanical-gates/src/aggregate/run-p0-aggregate.js`
- `packages/mechanical-gates/src/aggregate/index.d.ts` (P0 region only)
- `packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/witness.mjs` (allFamilies/omission lines)
- `packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/valid-aggregate/**` (corpus copy + in-fixture-dir additive registrations)
- `packages/mechanical-gates/fixtures/p0/testing-boundary-aggregate/**` (NEW real public-consumer witnesses, in-package)
- `.vibe/work/I-10C-AGG-testing-boundary-public-consumer-handoff/**` (this report + inventories)

## Untouchable / serialized (do NOT touch)

`packages/mechanical-gates/package.json`, `pnpm-lock.yaml`, root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `src/aggregate/index.js`, `src/p0/testing-boundary/**`, `packages/testing/**`, `.github`, `scripts/**`, `infra/**`. Dirty tree is permanent baseline; no git stash/reset/clean/checkout/restore.

## Step plan (brief §4)

- [x] 0. Checkpoint (this file).
- [x] 1. Read ground truth + pre-edit inventory.
- [ ] 2. Extend `run-p0-aggregate.js`: register `p0.testing-boundary`, relative import, fail-closed carrier guard.
- [ ] 3. Extend `index.d.ts` P0 region: union member + `testingBoundary?` option.
- [ ] 4. Keep `allowlist-domain-aggregate` witness coherent + copy valid testing-boundary corpus into `valid-aggregate` + additive registrations + lint-script extension.
- [ ] 5. Build real public-consumer witnesses (`witness-aggregate-public-consumer.mjs`, `typecheck-public-consumer.ts`, `tsconfig.typecheck.json`) inside the package.
- [ ] 6. No package-manager / git ops.
- [ ] 7. Run validation commands W-1..W-6 + W-TYPE; capture evidence.
- [ ] 8. Finalize report + terse return.

## Pre-edit on-disk facts (confirmed)

- `run-p0-aggregate.js`: `IMPLEMENTED_FAMILIES` = exactly 5 (`governed-surface, config-guards, boundaries, allowlist, domain-purity`); `runFamily` + `assertValidatorResult` fail-closed carrier guard + `omitted-family`/`unknown-family`/`validator-exception` findings. Runner mixes public-name (governed-surface, config-guards, boundaries) and relative (allowlist, domain-purity) intra-package imports.
- `index.d.ts`: P0 region (5-member union + `P0AggregateOptions`), P1 region, P2 region (I-13C truth-green) — disjoint from P0 region.
- `src/p0/testing-boundary/index.js` exports `validateTestingBoundary`; `.d.ts` types `TestingBoundaryOptions`/`TestingBoundaryResult` (`family:"p0.testing-boundary"`). Result is async (`Promise`).
- `packages/mechanical-gates/package.json`: no declared `dependencies`/`devDependencies`; `exports` has `./aggregate`, no `./p0/testing-boundary`.
- `allowlist-domain-aggregate/witness.mjs`: line 13 `allFamilies` (5); full-aggregate positive (validRoot) + omission loop over allFamilies + validator-exception negative + domain-leakage negative.
- `valid-aggregate/package.json` `lint` = `eslint eslint.config.mjs packages/shared/src packages/domain/src packages/app/src`; `format:check` = `prettier --check .`.
- `valid-aggregate/mechanical-surface.json`: `surfaces` + `requiredPaths` + `excludedPaths: [generated, vendor]`.
- `valid-test-only` corpus = 7 files (policy + testing pkg + consumer pkg) — proven green.

## Stages

(to be appended after each stage)

---

## Stage log + evidence

### Stage A — Runner + type contract extended (W-6 owner-clean)
- `run-p0-aggregate.js`: added `p0.testing-boundary` to `IMPLEMENTED_FAMILIES`; added `runFamily` branch `if (family === "p0.testing-boundary") return validateTestingBoundary(projectRoot, options.testingBoundary ?? {})`; imported `validateTestingBoundary` via relative intra-package `../p0/testing-boundary/index.js` (mirrors existing allowlist/domain-purity relative style). Fail-closed carrier guard `assertValidatorResult(result, family)` reused unchanged.
- `index.d.ts` (P0 region only): added `import type { TestingBoundaryOptions } from "../p0/testing-boundary/index.js"`; added `"p0.testing-boundary"` to `P0AggregateFamily` union; added `testingBoundary?: TestingBoundaryOptions` to `P0AggregateOptions`. P1/P2 regions untouched.

### Stage B — Aggregate fixture witness kept coherent (W-5a GREEN)
- `allowlist-domain-aggregate/witness.mjs`: `allFamilies` extended to 6 (incl. `p0.testing-boundary`); omission loop now covers 6 families.
- The pre-existing regression guard `noTestingProductionDependency` blanket-asserted the string `@vibe-engineer/testing` absent from aggregate evidence. Now that testing-boundary is a legitimately registered family, that string legitimately appears as `testOnlyPackageName` (a policy/inspection field, NOT a production dependency). Per §8 STOP-boundary item 1 (editing inside the owned `allowlist-domain-aggregate/**` fixture dir is explicitly in-license to keep the witness green), the guard was REFINED — not weakened — to preserve its real safety intent: it now verifies the `p0.testing-boundary` subresult is present and clean (`ok:true`, 0 findings), which is the substantive proof that `@vibe-engineer/testing` is test-only, not production-reachable. (More precise than the old blanket string-absence heuristic.)
- Corpus copied into `valid-aggregate/`: `mechanical-testing-boundary.json` + `packages/testing/{package.json,src/index.js}` + `packages/consumer/{package.json,src/index.ts,src/consumer.test.ts,fixtures/helper.ts}` (mirrors proven-green `valid-test-only`).
- `valid-aggregate/mechanical-surface.json`: additive registration — 6 `surfaces` entries + 5 `requiredPaths`; NOTHING removed/weakened (existing `excludedPaths`/surfaces/requiredPaths preserved).
- `valid-aggregate/package.json` (FIXTURE manifest): `lint` script extended to also target `packages/consumer/src packages/consumer/fixtures packages/testing/src` (additive; no existing target removed). `format:check` already `prettier --check .` (covers `.`).
- `valid-aggregate/mechanical-boundaries.json`: NO edit needed (declares only `@mini/*`; testing/consumer not declared boundaries → 0 findings).

Evidence (cmd #3): `node packages/mechanical-gates/fixtures/p0/allowlist-domain-aggregate/witness.mjs` → **exit 0**; `aggregateSummary` = all 6 families `ok:true, findingCount:0`; `negativeWitnesses:35`; `regressionEvidence` all true.

### Stage C — Real public-consumer witnesses built IN-PACKAGE (W-1/W-2/W-3/W-4/W-TYPE GREEN)
New owned dir `packages/mechanical-gates/fixtures/p0/testing-boundary-aggregate/`:
- `witness-aggregate-public-consumer.mjs` — imports `{ runP0Aggregate }` from PUBLIC name `@vibe-engineer/mechanical-gates/aggregate` (package self-reference via `exports`; confirmed resolves `function` from inside the package, `ERR_MODULE_NOT_FOUND` from repo-root).
- `typecheck-public-consumer.ts` + `tsconfig.typecheck.json` — W-TYPE `tsc` consumer importing `{ runP0Aggregate }` + `type { P0AggregateOptions, P0AggregateFamily }` from the PUBLIC name; exercises the `p0.testing-boundary` literal and `testingBoundary?` option.

Evidence (cmd #2): `node .../witness-aggregate-public-consumer.mjs` → **exit 0**:
- W-1 public-consumer positive: typed `p0.testing-boundary` subresult, `ok:true`, 0 findings, real typed-carrier evidence (`parser:"typescript"`, `proofMode:"typescript-ast"`).
- W-2 default-run enforcement: default `runP0Aggregate(root)` (no `families`) includes `p0.testing-boundary` in subresults; all 6 families `ok:true`; `implementedFamilies` lists `p0.testing-boundary`.
- W-3 omitted-family fail-closed: 5 non-testing families → `aggregate.omitted-family` naming `p0.testing-boundary`, `ok:false`, subresult absent.
- W-4 validator-failure routing: real `production-dependency` adversarial fixture → `testing-boundary.production-dependency` blocking finding routed through the public aggregate, `ok:false`.

Evidence (cmd #5): `npx tsc --noEmit --strict --skipLibCheck false --module NodeNext --moduleResolution NodeNext --project .../tsconfig.typecheck.json` → **exit 0** (genuinely compiles `src/aggregate/index.d.ts`; brittle-by-design).

### Stage D — Dirty-tree safety (W-6 GREEN for this lane)
- Pre-edit inventory: `.vibe/work/.../pre-edit-inventory.txt` (19 lines; `src/aggregate/index.js` and `index.d.ts` already `M` from I-13C dirty-tree baseline before any of my edits).
- Post-edit inventory: `.vibe/work/.../post-edit-inventory.txt`.
- This lane's changed paths are EXACTLY §3 owned: `src/aggregate/run-p0-aggregate.js`, `src/aggregate/index.d.ts` (P0 region), `fixtures/p0/allowlist-domain-aggregate/{witness.mjs, valid-aggregate/**}`, new `fixtures/p0/testing-boundary-aggregate/**`, `.vibe/work/...`.
- Forbidden-path `git diff` (W-6): `packages/mechanical-gates/package.json`, `packages/mechanical-gates/src/p0/testing-boundary`, `packages/testing`, `pnpm-lock.yaml`, `package.json`, `pnpm-workspace.yaml`, `turbo.json` → **EMPTY**.
- `src/aggregate/index.js` shows a P2-export diff — this is the **pre-existing I-13C dirty-tree baseline** (already `M` in the pre-edit inventory; I did NOT edit it; brief §3/validation-artifact §6 explicitly acknowledge this baseline). Confirmed: I never opened/wrote `index.js`.

### Stage E — BLOCKED discovery (W-5b: I-10C witness)

**Blocker (single, surgical):** `node packages/mechanical-gates/fixtures/p0/testing-boundary/witness.mjs` → **exit 1**, failing ONLY on `assertNoSharedMechanicalWiring()` (line 144–148):
```
Error: aggregate runner unexpectedly includes testing-boundary family
  at assertNoSharedMechanicalWiring (.../fixtures/p0/testing-boundary/witness.mjs:145)
```
The guard asserts `!readFileSync(.../src/aggregate/run-p0-aggregate.js").includes("p0.testing-boundary")` — i.e. it encodes the **pre-handoff state** ("testing-boundary NOT yet wired into the aggregate"). This lane's licensed deliverable (Model A) REQUIRES the literal `p0.testing-boundary` in `run-p0-aggregate.js`; the assertion is therefore the exact **negation** of the deliverable and cannot be satisfied by any correct implementation of this lane.

The companion assertion in the same guard — `!mechanicalPackage.exports["./p0/testing-boundary"]` — I **do** satisfy (Model A adds no subpath export); that invariant can/should remain.

**Root cause:** the I-10C witness carries an anti-premature-wiring placeholder guard that this lane is licensed to supersede, but `fixtures/p0/testing-boundary/witness.mjs` is NOT in brief §3 owned WRITE paths (§2 item 11 / §4 step 5 classify `fixtures/p0/testing-boundary/**` as read-only "reusable corpus"). Brief §5 W-5 mandates: *"If any [green witness] does [regress] and the fix is outside §3 owned paths → STOP BLOCKED."* → BLOCKED.

**Zero out-of-license edits.** I did NOT touch `fixtures/p0/testing-boundary/witness.mjs` (nor any other unowned path). All my edits are within §3.

## Ruling needed (exact)

Extend §3 owned WRITE to include `packages/mechanical-gates/fixtures/p0/testing-boundary/witness.mjs` so the obsolete `assertNoSharedMechanicalWiring()` guard can be updated to the post-handoff reality:
- **Drop/invert** the `!aggregateSource.includes("p0.testing-boundary")` assertion (line 145) — testing-boundary is now a legitimately registered aggregate family (Model A). Preferred replacement: assert the aggregate runner DOES register `p0.testing-boundary` (positive wiring confirmation), or remove the anti-wiring hold entirely as superseded by this lane.
- **Keep** the `!exports["./p0/testing-boundary"]` assertion (line 145) — it enforces Model A's "no subpath export" invariant, which this lane satisfies and which must remain true.
- Update the downstream `regressionEvidence.mechanicalPackageNoTestingExport` semantics only if needed; keep the `./p0/testing-boundary` export-absence check intact.

This is a one-line-class coherence update inside a single read-only-classified witness; it does not touch any gate, validator, contract, package.json, lockfile, or serialized surface. Once granted, W-5b goes green and the lane is truth-green end-to-end (W-1/W-2/W-3/W-4/W-5a/W-6/W-TYPE already real-boundary green above).

## Status: BLOCKED

Provisional self-severity: **major-local** (blocks this lane's truth-green + direct dependent I-20A) — the handoff's substantive closure (runner wiring + public-consumer seam + default-run enforcement + type contract + all owned witnesses) is REAL-BOUNDARY GREEN; the sole blocker is an obsolete witness guard on an unowned file, resolvable by a one-class ownership extension ruling with no contract/gate/serialized-surface impact. NOT self-declared truth-green (validator decides).
