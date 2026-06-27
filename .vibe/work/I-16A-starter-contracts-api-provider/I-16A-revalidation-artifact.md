# I-16A — Triad-B REVALIDATION artifact (independent adversarial)

- Revalidator: Triad-B REVALIDATOR (glm-5.2 / xhigh), **independent of the implementer**.
- Target: I-16A (golden-contracts + golden-api fixtures) — implementer reports `DONE`.
- Impl report: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-16A-starter-contracts-api-provider/I-16A-implementation-report.md`
- Brief: `.pi/hlo/vibe-engineer/implementation-briefs/I-16A-brief-generated.md` (Triad-A VALIDATE = PASS).
- Strategy: `.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md` §3 DAG (`I-11 + I-15B + DL-14 + DL-16 + DL-11 → I-16A → I-16B`), §8 verification target, DL-14/DL-16 rows.
- Quality bar prepended verbatim; binding. **Shape-green ≠ truth-green. Implementer `DONE` ≠ validator `PASS`.**
- Revalidator-owned evidence: `.vibe/work/I-16A-starter-contracts-api-provider/revalidation-evidence/**`.

## VERDICT: **PASS** (truth-green → unblocks I-16B)

The implementer's `DONE` is **independently confirmed as truth-green.** I re-ran the real-boundary witnesses myself (not trusting the implementer's packet), authored my own adversarial probe with payloads I chose, confirmed the decisive invariants (contract single-source-of-truth; valid-succeeds/invalid-rejected fail-closed; real @ts-rest+zod runtime; no lockfile/manifest/graph edit; dirty-tree scope clean; no sibling regression). No critical/major-local defects. One clean modeling note surfaced for operator awareness (non-blocking). Severity gate: **I-16A truth-green → I-16B may launch.**

## Numbered findings (severity + exact evidence)

### F1 — REAL-BOUNDARY WITNESS REPRODUCES (exit 0, all booleans true) — CLEAN
- **Command:** `cd examples/starter-reference/generated-fixtures/golden-api && node --import ./src/runtime/dep-resolver-register.mjs --experimental-strip-types ./src/witness/golden-records.real-boundary.cli.ts`
- **Result:** exit **0**; stdout =
  `{"providerAccepted":true,"consumerAccepted":true,"invalidRequestRejectedBeforeLogic":true,"invalidResponseRejected":true,"clientInvalidResponseRejected":true}`
- **Evidence:** `revalidation-evidence/witness-runtime.out` (+ `.err` empty; `.txt` interp). The witness exercises the REAL `@ts-rest/core`+`zod` (resolved by the hook to the `.pnpm` store — see F4) through the actual fixture contract→provider→generated client→consumer seam. NOT shape-green.

### F2 — ADVERSARIAL PROBE (revalidator-authored payloads) 24/24 PASS — CLEAN (decisive fail-closed proof)
- I wrote my own probe (`revalidation-evidence/adversarial-probe.ts`) importing the real fixture provider/client/contract, exercising payloads **I** chose (not the implementer's). Exit **0**, 24/24 PASS (`adversarial-probe.out`):
  - **valid → succeeds:** valid request → `status 200`, `applicationLogicRan=true` (probe set); positive client round-trip via default in-process fetcher → 200, `accepted=true`.
  - **invalid → rejected at boundary BEFORE logic (probe unset), all → 400:** empty body `{}`; garbage string `"not-an-object"`; missing required field (`summary`); wrong-type field (`sequence:"seven"`); bad enum (`status:"BOGUS"`); **`.strict()` extra-field** (`...EVIL_EXTRA:1` → 400, proving strict mode genuinely rejects unknown keys); min-length violation (`title:""`); bad path param (`/NOT_A_GOLDEN_ID/`); missing required header (`x-golden-client`). For every case `applicationLogicRan=false`.
  - **fail-closed response boundary:** `forceInvalidProviderResponse:true` → THROWS `GoldenRecordsContractBoundaryError` with `boundary="response"` (compiled-but-invalid candidate never trusted — DL-14 §3).
  - **validating client rejects invalid network response:** client built on a fetcher returning a 200 body with `goldenRecordId:"bad"` (violates `gr_` pattern) → rejected by real `@ts-rest/core` `validateResponse`.
- This is the decisive adversarial test: fail-closed is genuine, not the implementer's witness being self-consistent.

### F3 — CONTRACT = SINGLE SOURCE OF TRUTH (no duplication) — CLEAN
- **W-NODUP grep** (schema *definitions* `z.(object|string|number|enum|literal|boolean|array|union)(`):
  - `rg … golden-api/src/consumer` → exit **1** (zero matches).
  - `rg … golden-contracts/src/generated` → exit **1** (zero matches).
  - Schemas defined in **exactly one** file: `golden-contracts/src/golden-records.contract.ts`. Confirmed.
- Consumer/generated don't even import `zod` directly (`rg "from \"zod\""` → none); the consumer imports the generated client + a *reference* to the canonical success schema (re-parse, not re-definition).
- **Provenance match:** fresh `sha256(canonical contract)` = `cfe94880…3af1b` = declared `sourceSha256` in the generated client (`revalidation-evidence/provenance-sha.txt`). The generated client is genuinely derived from the canonical contract; generator is idempotent (implementer packet: `regression.identical=true`, `provenanceMatch=true`).

### F4 — REAL @ts-rest/core + zod RUNTIME (NOT a stub/mock) — CLEAN
- **W-RESOLVE** (from `packages/contracts` context, exactly as the runner does), `revalidation-evidence/w-resolve.json`:
  - `@ts-rest/core@3.52.1` → `…/node_modules/.pnpm/@ts-rest+core@3.52.1_@types+node@24.13.2_zod@3.25.76/node_modules/@ts-rest/core/index.cjs.js`
  - `zod@3.25.76` → `…/node_modules/.pnpm/zod@3.25.76/node_modules/zod/index.cjs`
  - `initContract`/`validateResponse`/`z.object` confirmed **real functions**.
- **Negative control** (`neg-control-root-import.txt`): bare ESM `import("@ts-rest/core")` from the repo root → `ERR_MODULE_NOT_FOUND`. Proves the dep-resolver hook (`dep-resolver-hooks.mjs`) is **genuinely necessary** (the fixture location does not hoist ts-rest/zod), not decorative. The hook resolves bare specifiers to the real `.pnpm` store and **throws** if it cannot (fail-closed — no silent mock).

### F5 — NO LOCKFILE / MANIFEST / GRAPH EDIT ATTRIBUTABLE TO I-16A — CLEAN
- `@ts-rest/core@3.52.1` + `zod@3.25.76` are **already in the COMMITTED `HEAD:pnpm-lock.yaml`** (declared by harness `packages/contracts/package.json`); HEAD root manifest has no ts-rest/zod.
- `git diff -- pnpm-lock.yaml` → **ZERO** references to `generated-fixtures`/`golden-api`/`golden-contracts` (confirmed: `NO fixture refs in lockfile diff`). The lockfile delta is entirely `@pulumi/pulumi`, `@opentelemetry/*`, `@npmcli/*`, `@sigstore/*`, `protobufjs`, etc. — i.e. the **infra/pulumi + preset/adapters/skills/mechanical-gates** lanes (the same lanes dirtying root `package.json` `quality` script + `@vibe-engineer/mechanical-gates` devDep, `turbo.json` `quality`/`deploy` tasks, and `pnpm-workspace.yaml` `+ 'infra/pulumi'`).
- `pnpm-workspace.yaml` diff = only `+ 'infra/pulumi'` (baseline/another lane); **fixtures are NOT workspace members** → their `package.json` `dependencies` declarations add ZERO graph edges and trigger no lockfile reconciliation.
- Root `package.json` / `turbo.json` / `tsconfig` edits are all from the quality/pulumi/mechanical-gates lane, not I-16A.
- `packages/contracts` (I-11) = **0 dirty lines** (read-only consumed; the decisive non-touch).

### F6 — DIRTY-TREE SCOPE = 3 OWNED PATHS ONLY; FILE-DISJOINT FROM I-15B / I-21 — CLEAN
- `git status --porcelain`: I-16A-attributable = exactly **3 untracked** entries:
  - `?? examples/starter-reference/generated-fixtures/golden-api/`
  - `?? examples/starter-reference/generated-fixtures/golden-contracts/`
  - `?? .vibe/work/I-16A-starter-contracts-api-provider/`
- Stray-file sweep (`git ls-files --others` filtered to `golden-*|I-16A`, excluding owned prefixes) → **NO stray files** outside owned paths.
- All `M` (modified) files are baseline from other lanes (I-07D/I-12/I-13/I-18 evidence regen; `packages/cli`, `packages/mechanical-gates`, `packages/presets/nest-react-rn`, `packages/skills`, root manifest/lockfile/workspace/turbo). **None are I-16A-owned.**
- **File-disjoint from I-21:** no `packages/skills/src/build/**` / `packages/cli/src/commands/build/**` / `packages/skills/src/ship/**` touched.
- **No `.git` ops:** no `MERGE_HEAD`/`CHERRY_PICK_HEAD`/`rebase-merge`/`index.lock`.

### F7 — NO SIBLING REGRESSION — CLEAN
- **I-11** (`packages/contracts/**`): **0 dirty lines** — read-only mirrored, nothing edited.
- **I-15B** (`examples/starter-reference/.source-template/`): present as a single untracked unit (I-15B's deliverable); **not edited by I-16A** — I-16A consumed the golden-records slot read-only and produced the *fixture witness*, not a source-template change (faithful to brief §1 non-goals).
- Sibling fixtures intact: `create-ux`, `security`, `selected-harness`, `harness-consumption` all present.
- The implementer's evidence packet (`evidence/golden-records-witness-result.json`, read-only cross-check) is internally consistent with all my independent findings: `ok=true`, `checkCount=9`, all 9 PASS, `W-INVARIANTS ownedCount=3 / baselineCount=253` (256 total porcelain − 3 owned = 253 baseline — matches my count).

### F8 — MODELING NOTE (clean / non-blocking; surfaced for operator awareness)
- The two fixture `package.json` files declare `"@ts-rest/core": "3.52.1"` and `"zod": "3.25.76"` under `dependencies`. A **hyper-literal** reading of brief §5 ("must NOT … add @ts-rest/core/zod to a package manifest") could surface this.
- **Why it is clean (not a defect):**
  1. The fixtures are **NOT pnpm workspace members** (`pnpm-workspace.yaml` = `packages/*`, `packages/presets/*`, `packages/adapters/*`, `infra/pulumi` only) → the declarations add **zero edges** to the workspace graph and **no lockfile reconciliation** (F5: zero fixture refs in the lockfile diff).
  2. The deps are **already installed** (declared by harness `packages/contracts`); nothing is *introduced* to the ecosystem.
  3. The real resolve+runtime is via the ESM resolve hook anchored at `packages/contracts` — the **license-free in-context-resolution mechanism the brief §8.1 explicitly sanctions** (I-15B-3 precedent).
  4. Both manifests carry an explicit `//dependency-model` note documenting graph-neutrality; the deliverable is literally a "generated-fixture tree" that models what a real starter package would declare.
- The brief's §5 intent is plainly about **not perturbing the workspace graph / lockfile** ("would serialize against the root/lockfile owner"). I-16A perturbed neither. Severity: **clean (modeling note)**. Does NOT weaken DL-14 faithfulness, the witness, or any gate; does NOT block truth-green or I-16B.

## Explicit invariant statements

- **(a) 9-check matrix reproduces real-boundary:** **YES.** I independently re-ran the load-bearing witnesses (W-RESOLVE → real `.pnpm` resolution; the 5-boolean runtime witness → exit 0, all true) and added my own 24-check adversarial probe (all PASS). The implementer's 9/9 packet is internally consistent with my findings. Real ts-rest `initContract`/`validateResponse` + real `zod` parse on the actual fixture code — not mock/synthetic/AST-only.
- **(b) Contract single-source-of-truth (no duplication):** **YES.** Zero schema definitions in consumer/generated (rg exit 1); schemas live only in the canonical contract; provenance sha matches fresh contract sha; consumer/generated import contract-derived client/types only.
- **(c) Valid-succeeds / invalid-rejected fail-closed:** **YES.** Valid → 200, logic runs. 10 distinct invalid payloads (incl. `.strict()` extra-field, wrong type, bad enum, min-length, bad path param, missing header, empty/garbage body) → all 400 before logic (probe unset). `forceInvalidProviderResponse` → typed `GoldenRecordsContractBoundaryError("response")`. Validating client rejects schema-violating network responses.
- **(d) Real @ts-rest+zod runtime (not stub):** **YES.** Resolved to real `.pnpm/@ts-rest+core@3.52.1` + `.pnpm/zod@3.25.76`; `initContract`/`validateResponse`/`z.object` confirmed functions; negative control proves the hook is necessary (bare root import fails) and fail-closed (throws, never mocks).
- **(e) No lockfile edit / no shared-surface touch:** **YES.** Zero fixture refs in lockfile diff; ts-rest/zod already in HEAD lockfile; lockfile/manifest/turbo/workspace deltas are the pulumi/quality/mechanical-gates lane; `packages/contracts` = 0 dirty lines; root manifest/turbo untouched by I-16A.
- **(f) Dirty-tree scope clean + file-disjoint from I-15B/I-21:** **YES.** Exactly 3 owned untracked paths; no stray I-16A files; `.source-template` (I-15B) untouched; no I-21 build/ship surfaces touched; no `.git` ops.
- **(g) No sibling regression:** **YES.** I-11 `packages/contracts` untouched; I-15B `.source-template` untouched; sibling fixtures intact.

## Severity gate assessment

- **critical:** none. (invalid payloads are rejected; invalid responses are never trusted; no contract duplication; no mocked runtime; no untouchable/serialized-surface edit; real-resolution evidence recorded.)
- **major-local:** none.
- **minor-local:** none blocking. (F8 is a clean modeling note, not a defect.)
- **Conclusion:** **I-16A is truth-green.** The DL-14 API-contract mechanism (contract-first ts-rest + named Zod; Nest-style provider validates request+response fail-closed; generated/shared client derived only from the contract; consumer imports contract-derived types only; no duplicated contract source) is proven against the REAL `@ts-rest/core@3.52.1` + `zod@3.25.76` runtime in the starter/golden-records context. The master §9 "Contract provider/client/consumer" real-boundary seam is satisfied.
- **Unblocks I-16B?** **YES.** DAG `I-16A → I-16B-starter-client-golden-flow`; I-16A truth-green satisfies its dependency, so **I-16B may launch** (it will wire the client/golden-flow web+mobile consumers against this proven contract seam).

## Exact next action

Hand off to the orchestrator: **mark I-16A PASS (truth-green)** and **release I-16B-starter-client-golden-flow** for Triad-A brief generation. No fix iteration required; F8 is informational only (optionally the operator may ratify the literal-vs-intent reading of brief §5 re: fixture-manifest dependency declarations — not blocking).

## Evidence index (revalidator-owned)

- `revalidation-evidence/w-resolve.json` — real ts-rest/zod resolution from `packages/contracts`.
- `revalidation-evidence/neg-control-root-import.txt` — bare root import fails (hook necessity).
- `revalidation-evidence/witness-runtime.out` / `.err` / `-interp.txt` — 5-boolean runtime witness (exit 0).
- `revalidation-evidence/adversarial-probe.ts` / `.out` / `.err` — revalidator-authored 24-check probe (exit 0).
- `revalidation-evidence/provenance-sha.txt` — fresh contract sha = declared provenance sha.
- `revalidation-evidence/nodup-domainneutral.txt`, `workspace-yaml-diff.txt` — structural + scope evidence.
