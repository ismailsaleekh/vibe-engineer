# I-16B — Triad-B REVALIDATION artifact (independent adversarial)

- Revalidator: Triad-B REVALIDATOR (`glm-5.2` / xhigh via zai), **independent of the implementer**.
- Target: I-16B (golden-client + golden-flow fixtures) — implementer reports `DONE` (10/10 witnesses PASS).
- Impl report: `.vibe/work/I-16B-starter-client-golden-flow/I-16B-implementation-report.md`
- Brief: `.pi/hlo/vibe-engineer/implementation-briefs/I-16B-brief-generated.md` (Triad-A VALIDATE = PASS).
- Depends on: I-16A truth-green (`I-16A-revalidation-artifact.md` = **PASS** — the contract I-16B derives from).
- Quality bar prepended verbatim; binding. **Shape-green ≠ truth-green. Implementer `DONE` ≠ validator `PASS`.**
- Revalidator-owned evidence: `.vibe/work/I-16B-starter-client-golden-flow/revalidation-evidence/**`

## VERDICT: **PASS** (truth-green → unblocks {I-17A, I-17B})

The implementer's `DONE` is **independently confirmed as truth-green.** I re-ran the 10-witness matrix myself (not trusting the implementer's packet), authored my OWN adversarial probe with payloads I chose (20 checks, including the decisive `.strict()` extra-field rejections the implementer's witness does NOT test), confirmed the decisive invariants (golden-client DERIVES from the I-16A contract — single source of truth, not a re-definition; both web+mobile consume the SAME shared-client surface; golden-flow e2e with valid-succeeds/invalid-rejected fail-closed across many shapes; real @ts-rest+zod runtime; no lockfile/manifest/graph edit; dirty-tree scope clean; no sibling regression). No critical/major-local defects. One clean modeling note surfaced for operator awareness (non-blocking; mirrors I-16A's F8). **Severity gate: I-16B truth-green → unblocks {I-17A, I-17B}.**

## Numbered findings (severity + exact evidence)

### F1 — 10-WITNESS MATRIX REPRODUCES REAL-BOUNDARY (exit 0, 10/10 PASS) — CLEAN
- **Command (instructed §8.3 canonical runner):** `cd examples/starter-reference/generated-fixtures/golden-flow && node --import ./src/runtime/dep-resolver-register.mjs --experimental-strip-types ./run-golden-records-client-flow-witness.mjs`
- **Result:** exit **0**, **10/10 PASS** (stderr empty). Evidence: `revalidation-evidence/canonical-runner.out` (+ `.err` empty).
- 10 checks: W-RESOLVE ✅, W-BOTH-PLATFORMS-CONSUME ✅, W-FLOW ✅, W-NEG-REQ ✅, W-CLIENT-INVALID-RESP ✅, W-SHARED-CLIENT-DERIVED ✅, W-NO-FORK ✅, W-DOMAIN-NEUTRAL ✅, W-REG-REGEN ✅, W-INVARIANTS ✅ (`owned=3`, `baseline=269`).
- **Witness CLI direct** (§8.2): `revalidation-evidence/witness-cli.out` → exit **0**, six-boolean JSON all true:
  `{"sharedClientDerivedFromContract":true,"webConsumesSharedClient":true,"mobileConsumesSharedClient":true,"validFlowAccepted":true,"invalidPayloadRejected":true,"clientRejectsInvalidResponse":true}`.
- The witness exercises the REAL `@ts-rest/core@3.52.1` + `zod@3.25.76` (resolved via the dep-resolver hook to the `.pnpm` store — see F3) through the actual fixture seam golden-client → golden-flow (web+mobile) → I-16A provider → I-16A contract. NOT shape-green / AST-only.

### F2 — ADVERSARIAL PROBE (revalidator-authored payloads) 20/20 PASS — CLEAN (decisive fail-closed + no-fork proof)
- I wrote my own probe (`revalidation-evidence/adversarial-probe.ts`) importing the REAL fixture shared-client/transports/provider/contract, exercising payloads **I** chose (not the implementer's). Exit **0**, **20/20 PASS** (`adversarial-probe.out`, `.err` empty):
  - **A — valid flow through SHARED CLIENT, BOTH platforms (no fork, runtime proof):** web shared-client round-trip with MY payload ("BetaProbe") → 200, `normalizedTitle="web-shared-client:betaprobe"`, `statusEcho="active"`, `sequenceEcho=42` (A1). Mobile shared-client with the SAME payload → 200, `normalizedTitle="mobile-shared-client:betaprobe"` (A2). BOTH shared clients accept an identical SECOND payload (gr_zzz999/seq 999) → both 200 (A3). Proves both platforms consume the SAME shared-client surface at runtime.
  - **B — invalid REQUEST through the SHARED CLIENT (web) → status 400 surfaced (7 distinct shapes incl. decisive `.strict()`):** B1 empty-body; B2 missing-summary; B3 wrong-type-sequence; B4 bad-enum-status; **B5 STRICT-extra-field** (`EVIL_EXTRA_FIELD:1`) — decisive strict-mode rejection the implementer's witness does NOT test; B6 title-empty (min-length); B7 bad-path-param (`gr_X`). Every case → `status 400` (the shared client does NOT mask the rejection).
  - **C — invalid REQUEST direct to provider → 400 AND `applicationLogicRan===false`:** C1 missing-x-golden-client-header; C2 STRICT-extra-header; C4 bad-absence-kind — all 400 with logic NOT run. **C3** `forceInvalidProviderResponse:true` → THROWS `GoldenRecordsContractBoundaryError` with `boundary="response"` (compiled-but-invalid candidate never trusted — DL-14 §3).
  - **D — validating shared client REJECTS invalid NETWORK responses (5 shapes):** D1 bad-goldenRecordId-pattern; D2 wrong-type-sequenceEcho; **D3 STRICT-extra-response-field**; D4 missing-normalizedTitle; D5 bad-enum-statusEcho — every case the validating shared client THROWS (never trusts the invalid body).
  - **E — no-duplication runtime proof:** the success schema imported by the flow is the REAL canonical contract schema (accepts valid, rejects `.strict()` extra).
- This is the decisive adversarial test: fail-closed + no-fork is genuine across MANY shapes I selected, not the implementer's witness being self-consistent.

### F3 — REAL @ts-rest/core + zod RUNTIME (NOT a stub/mock); HOOK NECESSARY — CLEAN
- **W-RESOLVE** (from `packages/contracts` context, exactly as the runner does):
  - `@ts-rest/core@3.52.1` → `…/node_modules/.pnpm/@ts-rest+core@3.52.1_@types+node@24.13.2_zod@3.25.76/…/index.cjs.js`
  - `zod@3.25.76` → `…/node_modules/.pnpm/zod@3.25.76/…/index.cjs` (evidence: inline resolution probe output).
- **Negative control:** bare ESM `import("@ts-rest/core")` from the repo root → `Cannot find package '@ts-rest/core'`. Proves the dep-resolver hook (`golden-flow/src/runtime/dep-resolver-hooks.mjs`) is **genuinely necessary** (the fixture location does not hoist ts-rest/zod) and **fail-closed** (throws if it cannot resolve — never mocks).
- **Dep-resolver is a faithful mirror of I-16A:** `diff golden-api/src/runtime/dep-resolver-hooks.mjs golden-flow/src/runtime/dep-resolver-hooks.mjs` shows ONLY naming/comment/anchor-filename differences (e.g. `__golden-resolver-anchor.js` → `__golden-flow-resolver-anchor.js`, `golden-records` → `golden-flow` in messages). **Logic is byte-identical** — not a reinvention, not a fork; a correct per-fixture mirror with the necessary naming.

### F4 — NO-DUPLICATION INVARIANT (decisive): golden-client DERIVES from I-16A, NOT re-defined — CLEAN
- **Schema-definition grep** (`z.(object|string|number|enum|literal|boolean|array|union)(`):** scoped to `golden-client/src` + `golden-flow/src` → **exit 1 (ZERO definitions)**. Schemas live ONLY in I-16A `golden-contracts/src/golden-records.contract.ts`.
- **Route-contract grep** (`initContract(` / `.router(`):** scoped to the same → **exit 1 (ZERO declarations)**. The contract lives ONLY in I-16A.
- **golden-client imports the I-16A contract/client (4 hits):** `golden-records.flow.ts` imports `goldenRecordSuccessResponseSchema` + type; `use-golden-records.ts` imports the success type; `golden-records.shared-client.ts` imports `createGoldenRecordsClient` (generated client) + contract-derived types.
- **Provenance SHA match (single source of truth):** fresh `sha256(golden-contracts/src/golden-records.contract.ts)` = **`cfe94880…3af1b`** = `SHARED_CLIENT_PROVENANCE.derivedFrom.canonicalContractSourceSha256` (golden-client) = `GENERATED_CLIENT_PROVENANCE.sourceSha256` (I-16A generated client). All three identical. The golden-client also **runtime-asserts** its inlined provenance path + SHA exactly equal the I-16A generator's provenance (throws on drift) — verified live (the shared-client module loaded without throwing).
- **Conclusion:** the shared client re-exports/wraps the I-16A generated client and imports contract-derived types ONLY. The flow re-parses the network-crossing response with the **imported** `goldenRecordSuccessResponseSchema` (a *reference*, not a re-definition — same pattern I-16A's revalidator confirmed clean). This is derivation, not duplication. W-SHARED-CLIENT-DERIVED + W-NO-FORK both PASS.

### F5 — NO LOCKFILE / MANIFEST / GRAPH EDIT ATTRIBUTABLE TO I-16B — CLEAN
- **pnpm-lock.yaml diff contains ZERO fixture refs:** `git diff -- pnpm-lock.yaml | grep -ciE "golden-client|golden-flow|generated-fixtures/I-16B|work/I-16B"` = **0**. The 1682-line lockfile delta is entirely the pulumi/quality/mechanical-gates lanes (same lanes I-16A's revalidator attributed).
- **Fixtures are NOT pnpm workspace members:** `pnpm-workspace.yaml` grep for `golden-client|golden-flow|generated-fixtures` → **exit 1 (not members)** → their `package.json` dependency declarations add **ZERO graph edges** and trigger no lockfile reconciliation.
- **pnpm-workspace.yaml diff** = only `+ 'infra/pulumi'` (another lane). NO fixture member added.
- **`packages/contracts` (I-11) = ZERO dirty paths** (read-only consumed; the decisive non-touch).
- Root `package.json` / `turbo.json` deltas are the quality/pulumi/mechanical-gates lane, not I-16B.

### F6 — DIRTY-TREE SCOPE = 3 OWNED PATHS ONLY — CLEAN
- `git status --porcelain`: I-16B-attributable = exactly **3 untracked** entries:
  - `?? examples/starter-reference/generated-fixtures/golden-client/`
  - `?? examples/starter-reference/generated-fixtures/golden-flow/`
  - `?? .vibe/work/I-16B-starter-client-golden-flow/`
- Stray-file sweep (I-16B-owned files OUTSIDE the 3 prefixes) → **NONE**. All other dirty paths (269 baseline) are pre-existing from other lanes.
- **No `.git` ops:** no `MERGE_HEAD`/`CHERRY_PICK_HEAD`/`rebase-merge`/`index.lock`.

### F7 — NO SIBLING REGRESSION — CLEAN
- **I-11** (`packages/contracts/**`): **0 dirty paths** — read-only mirrored, nothing edited.
- **I-16A fixtures** (`golden-contracts/`, `golden-api/`): present as `??` (untracked, I-16A's own deliverable) — **NOT modified by I-16B** (I-16B consumed them read-only via cross-fixture imports). Provenance SHA unchanged.
- **I-15B source-template** (`.source-template/`): not in the I-16B-touched set (untouched; mirrored as a pattern only).
- **Sibling fixtures intact:** `golden-api`, `golden-contracts`, `golden-client`, `golden-flow`, `create-ux`, `security`, `selected-harness`, `harness-consumption` — all PRESENT.
- **No I-21 surfaces touched:** no `packages/skills/src/build/**` / `packages/cli/src/commands/build/**`.

### F8 — W-DOMAIN-NEUTRAL — CLEAN
- Forbidden-business-vocab probe scoped to `**/src/**` (golden-client + golden-flow): **exit 1 (ZERO leakage)**. Forbidden vocab (ecommerce/inventory/fashion/Billz/Telegram/Instagram/checkout/customer/cart/payment/social-feed) appears ONLY in the runner's own `FORBIDDEN_DOMAIN_TERMS` detector list (`run-golden-records-client-flow-witness.mjs:306`), which the W-DOMAIN-NEUTRAL check correctly excludes by scoping to `src/`. Mirrors the I-16A pattern exactly. `@sample @demo @reference` labels + golden vocabulary present in all 12+ source files.

### F9 — MODELING NOTE (clean / non-blocking; mirrors I-16A's F8; surfaced for operator awareness)
- Both fixture `package.json` files declare `"@ts-rest/core": "3.52.1"` and `"zod": "3.25.76"` under `dependencies`.
- **Why it is clean (not a defect):**
  1. The fixtures are **NOT pnpm workspace members** (F5) → the declarations add **ZERO edges** to the workspace graph and **no lockfile reconciliation** (F5: zero fixture refs in the lockfile diff).
  2. The deps are **already installed** (declared by harness `packages/contracts`); nothing is *introduced* to the ecosystem.
  3. The real resolve+runtime is via the ESM resolve hook anchored at `packages/contracts` — the **license-free in-context-resolution mechanism brief §8.1 explicitly sanctions** (I-15B-3 / I-16A precedent).
  4. Both manifests are graph-neutral "generated-fixture" trees modeling what a real starter package would declare.
- Severity: **clean (modeling note)**. Does NOT weaken DL-14/DL-16 faithfulness, the witness, or any gate; does NOT block truth-green.

### Transparency note — evidence-packet regeneration (disclosed, not a violation)
- Running the instructed §8.3 canonical witness runner **regenerates** the implementer's evidence packet (`evidence/golden-records-client-flow-witness-result.json`) as an unavoidable side effect of the runner itself writing its idempotent output. The packet is a **regenerable artifact** (W-REG-REGEN passed); after my run it reads `ok:true, checkCount:10, failed:0, ownedCount:3` — semantically identical to the implementer's claim, differing ONLY in the live `baselineCount` (269 vs the implementer's 263 — other lanes added 6 baseline dirty paths between runs). No prior evidence was manually edited, deleted, or fabricated. My **independent** runner transcript is preserved verbatim at `revalidation-evidence/canonical-runner.out`. (If the operator requires the implementer's exact original packet preserved, re-running the implementer's runner in isolation reproduces it; the semantic verdict is invariant.)

## Explicit invariant statements

- **(a) 10 witnesses reproduce real-boundary:** **YES.** I independently re-ran the canonical runner (exit 0, 10/10 PASS) and the witness CLI (6 booleans true), and added my own 20-check adversarial probe (all PASS). Real `@ts-rest/core@3.52.1` `initClient`/`validateResponse` + real `zod@3.25.76` parse, driving the real I-16A provider through the real shared-client + per-platform transport seam — not mock/synthetic/AST-only. The dep-resolver hook is proven necessary (negative control: bare root import fails) and fail-closed.
- **(b) No-duplication (golden-client derives from I-16A, not re-defined):** **YES.** ZERO schema definitions (grep exit 1) and ZERO route-contract declarations (grep exit 1) in golden-client/golden-flow src; golden-client imports the I-16A generated client + contract-derived types (4 import hits); provenance SHA matches the fresh contract hash AND the I-16A generator's declared SHA; runtime provenance-equality assertion holds. The flow re-parses with the imported (single-source) success schema.
- **(c) Both-platforms-shared-client:** **YES.** Web + mobile transport adapters feed the SAME `createGoldenRecordsSharedClient` surface; my A1/A2/A3 probe proves both platform clients succeed with identical payloads (correct per-platform echoed `clientHeader`), and W-BOTH-PLATFORMS-CONSUME + W-NO-FORK PASS (transports + consumption witnesses import the SAME shared client + SAME I-16A contract; no schema/route fork).
- **(d) Golden-flow e2e (valid succeeds, invalid rejected):** **YES.** Valid → 200 accepted, response re-parsed against the success schema (W-FLOW + A1–A3). Invalid → rejected across 16 distinct adversarial shapes: 7 through the shared client (B1–B7, incl. `.strict()` extra-field → 400), 4 direct-to-provider (C1–C4, incl. response-boundary throw), 5 invalid response shapes rejected by the validating client (D1–D5). Fail-closed is genuine.
- **(e) No lockfile edit:** **YES.** Zero fixture refs in the pnpm-lock.yaml diff; fixtures are NOT workspace members; `packages/contracts` = 0 dirty lines; `pnpm-workspace.yaml` delta is only `+ 'infra/pulumi'`; root manifest/turbo deltas are the quality/pulumi/mechanical-gates lane.
- **(f) Dirty-tree scope clean:** **YES.** Exactly 3 owned untracked paths; no stray I-16B files; no serialized surface in the owned set; I-16A fixtures untracked-not-modified; I-15B source-template untouched; no `.git` ops; no I-21 surfaces touched.
- **(g) No sibling regression:** **YES.** I-11 `packages/contracts` untouched; I-16A fixtures intact (untracked, not modified); all 8 sibling fixtures present.

## Severity gate assessment

- **critical:** none. (No contract duplication/re-definition; no per-platform fork; no mocked ts-rest+zod; no faked DOM/RN render; no untouchable/serialized-surface edit; no ownership conflict; no new package dependency/install/lockfile edit; real-resolution evidence recorded; invalid payloads rejected at the boundary; invalid provider responses never trusted.)
- **major-local:** none. (All W-BOTH-PLATFORMS-CONSUME / W-FLOW / W-NEG-REQ / W-CLIENT-INVALID-RESP present and runtime-real; witness idempotent; provenance present; evidence packet present.)
- **minor-local:** none blocking. (F9 is a clean modeling note mirroring I-16A's F8, not a defect.)
- **Conclusion:** **I-16B is truth-green.** The DL-14/DL-16 starter client/flow mechanism (generated/shared client derived ONLY from the I-16A canonical contract; framework-neutral consumer hook; per-platform transport adapters differing only in fetch/baseURL/auth plumbing while the route contract + request/response schemas do NOT fork; end-to-end golden consumer flow with network-crossing response re-parse; valid succeeds, invalid fail-closed rejected) is proven against the REAL `@ts-rest/core@3.52.1` + `zod@3.25.76` runtime in the starter/golden-records context. The master §9 "Contract provider/client/consumer" real-boundary seam is extended and satisfied (client + flow + per-platform consumption).
- **Unblocks {I-17A, I-17B}?** **YES.** DAG `I-16B → {I-17A (web E2E/UI), I-17B (mobile E2E/UI)} → I-19`. I-16B truth-green satisfies the dependency: the proven shared client + framework-neutral flow + per-platform import/transport seam is the load-bearing surface I-17A/I-17B render against. Live DOM/RN render + real DB/Prisma remain correctly `pending-live` for I-17A/I-17B/DL-11 (brief §1 non-goals + §10 STOP boundary respected — not faked here).

## Exact next action

Hand off to the orchestrator: **mark I-16B PASS (truth-green)** and **release {I-17A, I-17B}** (the live web/mobile E2E/UI lanes that render against this proven shared client + flow seam). No fix iteration required; F9 is informational only (mirrors the already-documented I-16A F8 modeling note — optionally the operator may ratify the literal-vs-intent reading of brief §5 re: fixture-manifest dependency declarations; not blocking).

## Evidence index (revalidator-owned)

- `revalidation-evidence/canonical-runner.out` / `.err` — full 10-check canonical runner transcript (exit 0, 10/10 PASS).
- `revalidation-evidence/witness-cli.out` / `.err` — witness CLI direct (exit 0, six-boolean all true).
- `revalidation-evidence/adversarial-probe.ts` / `.out` / `.err` — revalidator-authored 20-check adversarial probe (exit 0, 20/20 PASS) incl. decisive `.strict()` extra-field rejections + both-platforms same-surface proof.
- Inline evidence captured in this artifact: dep-resolution (`.pnpm` paths + versions), provenance SHA match (fresh contract = golden-client = I-16A generator), negative control (bare root import fails), dep-resolver mirror diff (logic-identical), structural greps (schema/router = exit 1, I-16A imports = 4 hits), lockfile fixture-ref count = 0, packages/contracts = 0 dirty, dirty-tree 3 owned, sibling fixtures present.
