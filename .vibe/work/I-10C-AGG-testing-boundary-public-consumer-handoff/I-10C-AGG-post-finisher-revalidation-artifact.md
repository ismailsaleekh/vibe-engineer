# I-10C-AGG Post-Finisher Revalidation (Adversarial)

**Revalidator:** glm-5.2 via zai (thinking: xhigh), Triad-B independent adversarial REVALIDATOR
**Date:** 2026-06-26
**Status:** COMPLETE
**VERDICT: PASS** — I-10C-AGG is truth-green end-to-end; I-20A testing-boundary public-contract pre-gate is closed.

## Target under revalidation
- Finisher report: `.vibe/work/I-10C-AGG-.../I-10C-AGG-finisher-report.md`
- Implementation report: `.vibe/work/I-10C-AGG-.../I-10C-AGG-implementation-report.md`

## Stage log
- [x] S0: artifact skeleton
- [x] S1: ground-truth reading list (both reports, brief, ruling + validation artifact, amendment §2/§5)
- [x] S2: Model A real on-disk (registration + runtime run)
- [x] S3: no subpath export (Model A invariant)
- [x] S4: assertion fix correct + non-weakening
- [x] S5: public-consumer seam real-boundary (brittleness PROVED via transient negative test)
- [x] S6: full witness gauntlet W-1..W-6/W-TYPE
- [x] S7: sibling (P2/I-13) re-run + broader regression sweep (10/10)
- [x] S8: dirty-tree scope safety
- [x] S9: I-20A consumption seam
- [x] S10: verdict + severity gate

## Method
Every claim treated as unverified until confirmed on-disk. Witnesses re-run by me from `/Users/lizavasilyeva/work/vibe-engineer`. Evidence tree: `revalidation-evidence/` (`witness-gauntlet.txt`, `spawning-siblings-and-sweep.txt`, `wtype-brittleness-transient-negative.txt`, `scope-and-diffs.txt`).

## (a) Model A real on-disk — CONFIRMED (clean)
`packages/mechanical-gates/src/aggregate/run-p0-aggregate.js`:
- line 8: `import { validateTestingBoundary } from "../p0/testing-boundary/index.js";` (relative intra-package, mirrors allowlist/domain-purity style).
- `IMPLEMENTED_FAMILIES` (6) now includes `"p0.testing-boundary"`.
- `runFamily` branch: `if (family === "p0.testing-boundary") return validateTestingBoundary(projectRoot, options.testingBoundary ?? {});` routed through fail-closed `assertValidatorResult(result, family)`.
- **Runs at runtime (not just barrel-registered):** W-1/W-2 public-consumer + W-5a sibling all show the family executed with real typed-carrier evidence (`parser:"typescript"`, `proofMode:"typescript-ast"`). W-4 routes a real `testing-boundary.production-dependency` finding through the public aggregate (`blocking:true`). The registered P0 family set provably includes testing-boundary (6 families).

## (b) No subpath export (Model A invariant) — CONFIRMED (clean)
`packages/mechanical-gates/package.json` `exports` = `./aggregate`, `./p0/allowlist`, `./p0/domain-purity`, `./p0/governed-surface`, `./p0/config-guards`, `./p0/boundaries`. **NO `./p0/testing-boundary`.** `git diff -- packages/mechanical-gates/package.json` = **0 lines** (manifest untouched). W-5b `regressionEvidence.mechanicalPackageNoTestingExport:true`. Consumption is via the aggregate ONLY.

## (c) Assertion fix correct + non-weakening — CONFIRMED (clean)
`fixtures/p0/testing-boundary/witness.mjs` `git diff` is **exactly +1/−1** at line 145 (assertion B):
```
-  assert(!aggregateSource.includes("p0.testing-boundary"), "aggregate runner unexpectedly includes testing-boundary family", {});
+  assert(aggregateSource.includes("p0.testing-boundary"), "aggregate runner must register p0.testing-boundary as an implemented family post-handoff", {});
```
- **Assertion A (line 143, export-absence)** preserved VERBATIM (visible unchanged in the diff hunk context; W-5b green confirms it holds).
- **Assertion B** inverted negative→positive wiring check (brittle-by-design: turns red if registration reverted). Same source-include mechanism.
- **No other line/assertion/regression-evidence touched** in this file. Non-weakening: converts a now-contradictory placeholder into a correct positive regression guard; runtime-strong inclusion independently enforced by W-5a (line 166) + W-1/W-2.

## (d) Public-consumer seam REAL-boundary (not false-green) — CONFIRMED (clean; brittleness PROVED)
`fixtures/p0/testing-boundary-aggregate/witness-aggregate-public-consumer.mjs` line 17: `import { runP0Aggregate } from "@vibe-engineer/mechanical-gates/aggregate";` — **PUBLIC package name** (package self-reference via `exports`), NOT a relative `src/` import. Lives in-package (resolution reality honored). W-1 (typed subresult, ok:true, zero findings, real `proofMode:typescript-ast`), W-2 (DEFAULT run includes testing-boundary + all 6 families ok — substantive closure), W-3 (omitted-family fail-closed, ok:false), W-4 (real production-dependency violation → blocking finding, ok:false) — all assert real conditions including failures. Output emits `importPath:"@vibe-engineer/mechanical-gates/aggregate"`.
**W-TYPE brittleness PROVED via transient non-destructive test** (copy of package in /tmp, real-repo `tsc` binary, product tree untouched): baseline exit 0 → **remove `"p0.testing-boundary"` union member → exit 2, `TS2322`** → restore + **remove `testingBoundary?` option → exit 2, `TS2353`** → restore → exit 0. With `skipLibCheck:false`+`NodeNext` the consumer genuinely compiles `src/aggregate/index.d.ts`. Not shape-green; not a false-green (the prior rounds' false-green consumer is not the final form).

## (e) Full gauntlet green — CONFIRMED (clean)
| Witness | Command | Result |
| --- | --- | --- |
| W-1/W-2/W-3/W-4 | `node .../testing-boundary-aggregate/witness-aggregate-public-consumer.mjs` | exit 0 — all 4 sub-witnesses `ok:true` |
| W-5a (sibling aggregate) | `node .../allowlist-domain-aggregate/witness.mjs` | exit 0 — all 6 families `ok:true`/0 findings; `negativeWitnesses:35` |
| W-5b (was blocker) | `node .../testing-boundary/witness.mjs` | exit 0 — `regressionEvidence` all true incl. `mechanicalPackageNoTestingExport:true` |
| W-TYPE | `npx tsc --noEmit --strict --skipLibCheck false --module NodeNext --moduleResolution NodeNext --project .../tsconfig.typecheck.json` | exit 0 (only npm-config warnings) |

## (f) No sibling regression — CONFIRMED (clean)
- **P2 code-smell** (`fixtures/p2/code-smell/witness.mjs`, spawns testing-boundary child): exit 0; child `p0-testing-boundary` status 0.
- **I-13 postfix** (`.vibe/work/I-13-.../postfix-p2-regression-witness.mjs`, spawns testing-boundary child): exit 0; child `p0-testing-boundary` status 0.
- **Broader sweep (10/10 exit 0):** allowlist-domain-aggregate, surface-config-boundaries, testing-boundary-aggregate, testing-boundary, p1/aggregate, p1/quality-ratchet, p1/schema-contract-strictness, p1/test-anti-pattern, p2/aggregate, p2/code-smell. Zero regressions. The corpus-step mechanical-surface registration did NOT weaken W-5a/W-2 (governed-surface + allowlist/domain-purity all `ok:true`/0 findings).

## (g) Dirty-tree scope clean — CONFIRMED (clean)
`git status --porcelain` lane delta = **exactly the owned set**:
- Model A: `src/aggregate/run-p0-aggregate.js` (was CLEAN pre-edit → this lane).
- Type contract: `src/aggregate/index.d.ts` P0 region (this lane: import + union member + `testingBoundary?`; P2 region = I-13C baseline; disjoint — verified in diff).
- Owned fixtures: `fixtures/p0/allowlist-domain-aggregate/{witness.mjs, valid-aggregate/**}` (witness allFamilies→6 + non-weakening guard refinement; corpus `mechanical-testing-boundary.json` + `packages/{testing,consumer}/`; `mechanical-surface.json` **additive** 6 surfaces + 5 requiredPaths, nothing removed; fixture `package.json` lint extended additively).
- New in-package public-consumer dir: `fixtures/p0/testing-boundary-aggregate/**`.
- EXTEND edit: `fixtures/p0/testing-boundary/witness.mjs:145`.

**Forbidden paths EMPTY diff** (0 lines): root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `packages/mechanical-gates/package.json`, `packages/security/**`, `packages/mechanical-gates/src/p2/**` (smell framework), `.github/**`, `infra/pulumi/**`, `.git/**`.
**Pre-existing dirty-tree baselines NOT this lane** (present in pre-edit inventory): `src/aggregate/index.js` (I-13C P2 export — diff is ONLY the P2 re-export line, no testing-boundary), `index.d.ts` P2 region, `fixtures/p2/aggregate/`, `src/aggregate/p2/` (all I-13C); `packages/cli/src/commands/security/**` (I-18B); I-12 artifacts; DL-18P. None introduced by I-10C-AGG.

## (h) I-20A consumption seam CONFIRMED
I-20A consumes the testing-boundary via the **public aggregate contract**:
```ts
import { runP0Aggregate } from "@vibe-engineer/mechanical-gates/aggregate";
import type { P0AggregateOptions, P0AggregateFamily } from "@vibe-engineer/mechanical-gates/aggregate";
// default runP0Aggregate(root) now ENFORCES p0.testing-boundary (W-2) — single blocking path.
```
- Runtime: `runP0Aggregate` exported from public `./aggregate` (index.js); default run includes testing-boundary (W-2). Type contract: `P0AggregateFamily` has `"p0.testing-boundary"`, `P0AggregateOptions.testingBoundary?` (W-TYPE, brittle-proven).
- The public contract is real-boundary green and exercised by a real in-package consumer. Amendment §2 "no internal relative imports for I-20" satisfied: I-20A reaches testing-boundary only through `@vibe-engineer/mechanical-gates/aggregate`.
- Amendment §5 I-20A negative witness "missing testing-boundary public contract" is **closed** by W-1/W-TYPE.
- Note (not a blocker, correctly out of this lane's license): repo-ROOT resolution of the public name (e.g. from `scripts/quality/**`) requires the workspace symlink owned by `I-20S`; that linkage is a downstream concern, not this lane's deliverable. The contract this lane delivers is real and reachable via the public export.

## Numbered findings

1. **[clean / corroborating]** Model A registration real on-disk and runtime-executed — see (a).
2. **[clean]** No `./p0/testing-boundary` subpath export; manifest untouched — see (b).
3. **[clean]** Assertion A preserved verbatim; assertion B inverted to positive-wiring; +1/−1 only; no other assertion touched — see (c).
4. **[clean]** Public-consumer seam uses PUBLIC import name; brittleness PROVED by transient negative test — see (d).
5. **[clean]** Full gauntlet W-1..W-6/W-TYPE green — see (e).
6. **[clean]** Spawning siblings repaired (red child → green); broader sweep 10/10 green — see (f).
7. **[clean]** Dirty-tree delta confined to owned set; all forbidden paths empty; non-owned dirty paths are verifiable pre-existing baselines — see (g).
8. **[clean]** I-20A consumption seam (public aggregate contract) confirmed real — see (h).

No critical, major-local, or minor-local defects found. (The retained function name `assertNoSharedMechanicalWiring` is now slightly imprecise but the EXTEND ruling explicitly sanctioned keeping it to minimize edit surface; it is cosmetic/non-load-bearing — not a defect.)

## Severity gate assessment
**Zero critical / zero major-local / zero minor-local. → CLEAN.** Every load-bearing producer→carrier→consumer seam (public aggregate export → runP0Aggregate → validateTestingBoundary → typed `p0.testing-boundary` subresult) is exercised by a REAL-boundary witness (runtime + typed), with brittleness mechanically proven. Shape-green is not truth-green — and the truth-green bar is met here, not just shape-green.

**I-10C-AGG is truth-green → the `I-10C-AGG-testing-boundary-public-consumer-handoff PASS` hard pre-gate for `I-20A` (amendment §2 DAG / §5) is satisfied.** (I-20A launch is additionally gated by its own brief + the other DAG pre-gates — I-20S, DL-18P, I-09-SPLIT-COMPLETE, I-07D, I-11, I-12, I-13, I-18 — which are out of this lane's scope.)

## Next action
Lane may close as truth-green. Hand the PASS to the orchestrator; the next executable consumer is `I-20A-local-quality-runner-and-wiring-integrity`, which will consume the testing-boundary via `@vibe-engineer/mechanical-gates/aggregate` (no internal relative imports). No further fix needed on this lane.

## Evidence
`revalidation-evidence/witness-gauntlet.txt`, `.../spawning-siblings-and-sweep.txt`, `.../wtype-brittleness-transient-negative.txt`, `.../scope-and-diffs.txt`.
