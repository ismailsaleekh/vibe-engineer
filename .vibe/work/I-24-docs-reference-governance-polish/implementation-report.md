# I-24 — Implementation Report (Triad-B IMPLEMENTER)

- **Lane:** `I-24-docs-reference-governance-polish` (W9 terminal docs/reference/governance lane; master §3 DAG line 124 → FINAL-BUGHUNT).
- **Implementer:** Triad-B IMPLEMENTER (glm-5.2:high via zai).
- **Binding spec:** `I-24-brief-generated.md` (PASS-validated) + master strategy `post-d1-strategy-final.md` §5/§8/§9/§10/§13/§14 + LOCKED `docs/decisions/DL-21-documentation-system.md`.
- **Working dir:** `/Users/lizavasilyeva/work/vibe-engineer` (product repo).
- **Owned WRITE paths (exact, brief §3):** `docs/reference/**`, `docs/guides/**`, `docs/standards/**`, `docs/security/**`, `docs/observability/**`, `docs/api/**`, `docs/site/**`, `docs/.vitepress/**` (DL-21-authorized; validator F-2 ruling), `.vibe/work/I-24-docs-reference-governance-polish/**`.

## STATUS: BLOCKED (two serialized rulings required before faithful Triad-B execution)

Per quality bar ("Blocked means analyze, never improvise") + brief §6 STOP/BLOCKED boundary (§6.1 sizing/split, §6.2 tooling serialization). **Zero product edits.** Only this report (owned `.vibe/work/I-24-.../`) was written. No `git stash/reset/clean/checkout/restore`. No root manifest/lockfile mutation. No `docs/decisions/**` edit. No out-of-license path touched.

---

## Stage 0 — Report created FIRST (this file), before any product edit. ✅

## Stage 1 — Inventory + reconcile (§7.1; read-only)

### On-disk facts independently confirmed

| Claim (brief §2) | On-disk reality | Verdict |
| --- | --- | --- |
| `docs/{reference,standards,security,observability,api,site,.vitepress}` absent | all ABSENT | ✅ must be created |
| `docs/decisions/DL-01..DL-24A` present incl. DL-21 LOCKED, DL-23 LOCKED | present (26 decisions) | ✅ read-only source |
| `docs/guides/getting-started/`, `docs/architecture/index.md`, `docs/README.md`, `docs/deployment/{README,pulumi}.md` present | present | ✅ I-00B/I-20C-owned, LINK only |
| Root `package.json` has NO `docs`/`vitepress`/markdown-lint/link-checker/typedoc script or devDep | confirmed: scripts={build,typecheck,test,quality,workspace:graph,workspace:surface}; devDeps have none | ✅ serialization hazard REAL |
| `vitepress`/`markdownlint`/`linkinator`/`typedoc` absent from `pnpm-lock.yaml` | `grep` = empty | ✅ dep genuinely unresolvable |
| `packages/standards/{src,schemas,fixtures}` present (I-07C) | present | ✅ consumable real source |
| `packages/cli` bin = `vibe-engineer` → `./src/entry/vibe-engineer.js` | confirmed | ✅ real CLI surface |
| Real CLI binary runs in non-interactive machine mode + emits result-envelope | CONFIRMED (see witness probe below) | ✅ W-CLIDOC real-boundary feasible |
| Dirty tree has many unrelated M/?? entries (I-13/I-18/I-20/Pulumi/cli/mechanical-gates churn) | confirmed via `git status` | ✅ none owned by I-24; left untouched |

### Real CLI binary probe (grounds W-CLIDOC achievability, no dep needed)

```
$ node packages/cli/src/entry/vibe-engineer.js
{"schemaVersion":"vibe-engineer.cli.result.v1",...,"command":"help","status":"success","exitCode":0,
 "payload":{"kind":"help_result","data":{"commands":[
   {"id":"help","visibility":"foundation","description":"List I-02A foundation commands."},
   {"id":"version","visibility":"foundation","description":"Report package version."},
   {"id":"foundation","visibility":"internal","description":"I-02A internal envelope/loader witness command."}],
   "machineOnly":true}}}
EXIT=0

$ node packages/cli/src/entry/vibe-engineer.js --help
{"schemaVersion":"vibe-engineer.cli.result.v1",...,"status":"blocked","exitCode":2,
 "errors":[{"code":"VE_INVALID_FLAG","classification":"invalid_invocation","blocking":true,
            "message":"Unknown global flag: --help.","details":{"flag":"--help"}}]}
EXIT=0   (envelope exitCode field = 2; process exit = 0)
```

The actual binary emits the DL-07 machine result-envelope (`vibe-engineer.cli.result.v1`) with `status`/`exitCode`/`payload.kind`/`errors[].code` — so a real CLI doc-test that spawns this binary and asserts the envelope is **achievable in-license with no new dependency** (plain `node` child_process + JSON parse).

### Path-name reconciliation (brief §3; validator F-2 ruling)

Master §5 I-24 row names `docs/site/**`; DL-21 names the VitePress config `docs/.vitepress/**`. The brief's validator (artifact F-2) ruled `docs/.vitepress/**` is **authorized by DL-21** (LOCKED green decision refines master §5's site surface to the VitePress-conventional config path) — no genuine ownership conflict, §6.4 dead-letter, **no STOP-BLOCKED on this point**. Both paths are owned WRITE. Noted and accepted.

### Boundaries reconciled in report

- `docs/decisions/**`: permanently read-only (master §10; W-NEG-DECISIONS-EDIT).
- I-00B anchors (`README.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/README.md`, `docs/architecture/index.md`): LINK-only without I-00B→I-24 handoff (§6.3).
- `docs/deployment/**`: I-20C-owned, LINK only.
- `.github/workflows/**`, `scripts/**`: I-20-owned; CI promotion of docs gates serialized to I-20/DL-18 (out of I-24 license).
- Root `package.json` + `pnpm-lock.yaml` + `pnpm-workspace.yaml` + `turbo.json` + root lint/format config: I-00A-owned; edits only by serialized EXTEND-I-00A/I-20S handoff (master §10 line 306).

---

## Stage 2 — BLOCKED: two serialized rulings required before faithful execution

The full DL-21 scope cannot be executed correctly as ONE in-license Triad-B unit. Two independent, each-sufficient STOP/BLOCKED triggers fire. Per "halt BLOCKED with zero out-of-license edits and report root cause + exact ruling needed," I halt here rather than improvise.

### BLOCKER R1 — Sizing/split (brief §6.1; master §3 line 73 + §6 line 212)

**Ground rule (master §3):** *"Every implementation/fix unit must be approximately `<= 6` agentic hours; if a Triad-A validator cannot prove that, it must split the node before execution."* **(master §6):** *"Any Triad-A validator finding a unit still too large must split it before Triad-B; no implementation agent may accept a giant prompt."* **(brief §6.1):** *"the unit MUST be split before full Triad-B execution … The implementer reports the split need BLOCKED with a proposed decomposition; the HLO/Triad-A re-routes."*

**Analysis:** The brief's own validator (artifact F-3, minor-local advisory) already assessed the full DL-21 scope — *"11 nav sections × multiple subtrees + VitePress site + 6 generated-reference generators + freshness gates + doc-tests + examples/tutorials + narrative/architecture/guides + security/observability docs + 8 docs-quality gates"* — as *"almost certainly >6h as one Triad-B unit"* and **recommended the HLO commit to an I-24A/B/C (or equivalent) pre-split before launch to avoid a near-certain early implementer STOP-BLOCKED round-trip.** The HLO launched without pre-splitting (F-3 was non-binding). The implementer now confirms: producing the full scope as one unit would (a) exceed the ≤6h sizing ceiling, and (b) require either shallow/under-scoped docs to fit (explicitly forbidden: *"Do NOT produce shallow/underscoped docs to fit a budget, and do NOT silently claim sub-scope as full I-24 closure"*) or silent partial-closure (forbidden).

**Ruling requested (R1):** HLO/Triad-A to commit a decomposition before full Triad-B execution.

**Proposed decomposition (faithful to brief §6.1 example; ordered so each sublane produces independently checkpointable evidence and respects the tooling serialization in R2):**

- **I-24A — docs IA + narrative guides + architecture + slots (DEP-FREE, can execute in-license now).** Owned: `docs/guides/**`, `docs/reference/index.md` (narrative index only), `docs/standards/**`, `docs/security/**` (slots/links only — no invented DL-22/I-18 policy), `docs/observability/**` (slots/links only — DL-23 LOCKED, I-19 evidence), `docs/api/**` (slots + generated-projection placeholders), `docs/site/**`. Realizes the 11 rendered nav sections as Markdown; links (not duplicates) `docs/decisions/**`, I-00B anchors, `docs/deployment/**`. No new dependency required. Achievable witnesses: W-LINK (own link checker), W-EXAMPLES-LABELED, W-REGRESS-LOCKED, W-NEG-DOMAIN-LEAK, W-NEG-INVENTED-POLICY, W-NEG-BROKEN-LINK, W-NEG-DECISIONS-EDIT.
- **I-24B — generated-reference generators + freshness gates (DEP-FREE).** Owned: `.vibe/work/I-24-.../gen-refs.mjs` + generated output under `docs/reference/**` (schema/CLI/package-exports/standards references) consuming REAL producers (`packages/artifacts` schemas, actual `vibe-engineer` binary metadata/envelope, `packages/standards` public output, TypeDoc-equivalent extraction). No new dependency (pure node generators). Achievable witnesses: **W-REF-GEN** (real generated reference + freshness), **W-NEG-STALE-REF**, **W-NEG-DRIFT-REF**, source-doc consistency.
- **I-24C — examples/tutorials + doc-tests (PARTIALLY DEP-FREE).** Owned: `docs/guides/tutorials/**`, `docs/guides/examples/**`. Real CLI doc-test against the actual binary (**W-CLIDOC**) is achievable in-license (no dep — see probe). Package/API snippet compile (**W-PKG-API-SNIPPET**) achievable via existing repo `tsc`/typecheck over real exports. Achievable witnesses: W-CLIDOC, W-PKG-API-SNIPPET, W-NEG-RUNNABLE-NODOCTEST.
- **I-24D — VitePress public site (SERIALIZED on R2).** Owned: `docs/.vitepress/**` (config/theme/sidebar/nav/search). **Blocked on R2** (vitepress devDep + lockfile). Achievable witness only after R2: **W-VP-BUILD** (actual `vitepress build`).

**Note:** the decomposition is the HLO/Triad-A's call; the above is the implementer's evidence-grounded proposal. Whichever decomposition is chosen, R2 below gates any sublane that needs VitePress/markdown-lint/link-checker/TypeDoc.

### BLOCKER R2 — VitePress / docs-tooling dependency serialization (brief §6.2; master §10 line 306)

**Ground rule (master §10):** *"Root package/workspace/config files: `I-00A` owner; `I-20` may edit root scripts/pipeline only after explicit serialized handoff."* **(brief §6.2):** *"Adding `vitepress`, a markdown-linter, a link-checker, a doc-test runner, or a reference generator as a package dependency touches root `package.json` + `pnpm-lock.yaml` (I-00A/I-20S serialized surfaces). This requires an EXTEND-I-00A/I-20S-style operator-authorized lockfile reconciliation … STOP-BLOCKED to request it; never silently mutate root/lockfile. If a docs-quality tool cannot be added in-license, record that gate as `pending-tooling/advisory` … never silently skip it and never silently substitute Prettier for markdown-lint."*

**Analysis — the required docs-quality gates map to deps that do not exist and cannot be added in-license:**

| Required gate (DL-21 witness consequences) | Tool | In root devDeps? | Resolution |
| --- | --- | --- | --- |
| W-VP-BUILD: actual VitePress build renders nav + pages | `vitepress` | **NO** (manifest + lockfile both empty) | needs serialized root devDep + lockfile |
| markdown-lint (DL-21 "Markdown/heading/navigation checks; docs lint/style checks") | `markdownlint-cli2` (or equivalent) | **NO** | needs serialized root devDep + lockfile |
| W-LINK (repo-declared link checker) | external link-checker (e.g. `linkinator`) | **NO** — but an **own** link resolver (internal MD links + required anchors) is writable in-license under `.vibe/work/I-24-.../` (no dep) | partly in-license; external-URL check would need dep |
| package-export reference (DL-21 "TypeDoc or equivalent") | `typedoc` | **NO** | needs serialized root devDep + lockfile (or a no-dep AST-based extractor, weaker) |

**Precedent (the recurring validated pattern — every implementer halted BLOCKED with zero out-of-license edits):**
1. **I-10C-AGG** — public-consumer witness needed workspace dep → BLOCKED → EXTEND ruling.
2. **I-20A** — repo-root quality runner needed `@vibe-engineer/mechanical-gates` root devDep → BLOCKED (zero out-of-license edits) → EXTEND-I-20S adjudication → validated → Step-1 finisher added the single root devDep + scoped lockfile.
3. **I-20B** — GH-Actions workflow validator needed `js-yaml` → BLOCKED (zero out-of-license edits) → EXTEND-I-20S → validated → Step-1 finisher.
4. **I-15A** — CLI commands needed `@vibe-engineer/adapter-pi` + `context` as `packages/cli` deps → pre-routed EXTEND-I-02A before launch.

This is the **5th+ instance** of the canonical "implementation lane needs a root/lockfile/CLI dep it cannot add in-license" pattern. The faithful, doctrine-consistent response is identical: halt BLOCKED, request the serialized EXTEND ruling, never silently mutate root/lockfile, never substitute Prettier for markdown-lint, never fake the VitePress build.

**Ruling requested (R2):** An operator-authorized serialized lockfile reconciliation — `EXTEND-I-00A` (or `EXTEND-I-20S`, per I-20S root-manifest ownership) — to add the required docs-tooling devDeps to **root** `package.json` and reconcile `pnpm-lock.yaml` (scoped, importer-link-only deltas; the I-20A/I-20B Step-1 precedent). Minimum dep set to satisfy DL-21's required deterministic gates:
- `vitepress` (W-VP-BUILD; DL-21-selected renderer),
- `markdownlint-cli2` (markdown/docs-lint gate; Prettier is NOT a substitute),
- a link-checker for external-URL validation (internal-link resolution can be the implementer's own no-dep checker),
- `typedoc` (or an explicitly-approved equivalent) for package-public-export reference generation.

Exact versions, scope (root vs a dedicated `docs` workspace package), and which finisher executes are the ruling's to set. Until R2 lands, the docs-tooling gates are honestly recorded `pending-tooling/advisory` — **not** silently skipped and **not** fake-greened.

---

## Stage 3 — Achievable-in-license subset (evidence the HLO can route without waiting on R2)

To make the ruling efficient, the implementer documents which deliverables/witnesses are dep-free and which are R2-gated, so non-serialized sublanes (e.g. proposed I-24A/I-24B/I-24C) can proceed in parallel with the R2 adjudication:

**Achievable NOW in-license (no new dep — pure node + existing repo tooling):**
- Full docs IA skeleton (11 rendered nav sections) under owned subtrees; LINK (not duplicate) `docs/decisions/**`, I-00B anchors, `docs/deployment/**`.
- Narrative guides + architecture docs (six-skill workflow, two-repo model, artifact flow, verification/context/evidence, schematics, CLI-as-primitive, dirty-tree + Triad discipline, agent-building, migration/contribution LINKs) — source-linked to locked decisions + current implementation; no invented details.
- **W-CLIDOC** real CLI doc-test: spawn the actual `vibe-engineer` binary (non-interactive machine mode), assert the `vibe-engineer.cli.result.v1` envelope `status`/`exitCode`/`payload.kind` (incl. a negative path: `--help` → `status:"blocked"`, `exitCode:2`, `errors[].code:"VE_INVALID_FLAG"`). Probe above proves feasibility.
- **W-REF-GEN** real generated reference + freshness check (no-dep node generator): e.g. CLI reference generated from actual binary metadata + standards reference from `packages/standards` real public output, with source-path/version/hash provenance + staleness fail.
- **W-LINK** internal-link resolution + required-anchor (governance/security/changelog/decisions/architecture) via implementer's own no-dep Markdown link resolver under `.vibe/work/I-24-.../`.
- **W-PKG-API-SNIPPET**: snippet typecheck against real public exports via existing repo `tsc`/typecheck.
- All **negative witnesses** not requiring the tooling dep: W-NEG-STALE-REF, W-NEG-DRIFT-REF, W-NEG-RUNNABLE-NODOCTEST, W-NEG-DOMAIN-LEAK (DL-20A forbidden-vocabulary list confirmed: `ecommerce/inventory/fashion/Billz/Telegram/Instagram/checkout/product/customer-order` + synthetics `ProductCatalog/ShoppingCart/CustomerOrder/CheckoutFlow/WarehouseStock/…`), W-NEG-INVENTED-POLICY, W-NEG-BROKEN-LINK, W-NEG-FAKE-LIVE, W-NEG-DECISIONS-EDIT.
- **W-EXAMPLES-LABELED**, **W-REGRESS-LOCKED** (preserve `vibe-engineer`, two-repo, six skills, artifact flow raw intent→Work Brief→Implementation Plan→Build Result→Ship Packet, `plan` owns Verification Delta, build/ship run verification/context/evidence, ship no push/PR, fixed stack, mechanical-gate families, deterministic/advisory boundary).

**R2-gated (honestly `pending-tooling` until the serialized dep ruling lands):**
- **W-VP-BUILD**: actual `vitepress build` renders nav + pages (DL-21 "Public-site closure requires actual VitePress build output and link-check evidence; a planned config or screenshot is not proof"). The `docs/.vitepress/**` config can be authored in-license, but its build cannot be witnessed without the dep. Authoring the config without the build witness would be shape-green only → forbidden as closure.
- Repo-declared markdown-lint (DL-21 mandatory; Prettier alone is NOT a substitute — explicit in §6.2).
- Repo-declared external link-checker (internal-link check is the implementer's own; external-URL check needs the dep).
- TypeDoc (or approved equivalent) package-export reference (a no-dep AST extractor is weaker and may not satisfy DL-21's "TypeDoc or equivalent TypeScript API extraction" — ruling decision).

---

## Witnesses run this session

- **Inventory witnesses (read-only, all PASS):** docs-tree presence/absence; root manifest script/devDep scan; lockfile dep-absence scan; CLI binary real-spawn envelope probe (positive + negative); dirty-tree ownership scope (`git status`).
- **No product-edit witnesses run** (halted BLOCKED before any product edit per §6.1/§6.2). No fake/mock/synthetic green. No `pending-live` live-seam claim made.

## Dirty-tree scope confirmation

`git status` shows extensive unrelated churn (I-13/I-18/I-20/Pulumi/cli/mechanical-gates, `.github/`, `.vibe/evidence/`, root manifest/lockfile) — **none of it created or modified by I-24**. The ONLY path this implementer created is the owned report:
- `+ .vibe/work/I-24-docs-reference-governance-polish/implementation-report.md` (this file).

No `docs/decisions/**` edit. No I-00B anchor edit. No `docs/deployment/**` edit. No root `package.json`/`pnpm-lock.yaml`/`turbo.json`/workspace edit. No `.github/`/`scripts/` edit. No `git` mutation. Zero out-of-license edits.

## Deferred debts

None silently absorbed. Two serialized rulings (R1 split, R2 tooling dep) are explicitly surfaced for the HLO/Triad-A; `pending-tooling/advisory` gates (W-VP-BUILD, markdown-lint, external link-check, TypeDoc) are explicitly disclosed, not skipped, not substituted, not fake-greened.

## Next step (exact ruling needed)

1. **R1:** HLO/Triad-A commits an I-24 decomposition (proposed I-24A/B/C + serialized I-24D above) and re-routes non-serialized sublanes.
2. **R2:** Operator authorizes + a serialized finisher (`EXTEND-I-00A` or `EXTEND-I-20S`, per root-manifest ownership) adds `vitepress` + `markdownlint-cli2` + external link-checker + `typedoc` (or approved equivalent) to root devDeps with scoped `pnpm-lock.yaml` reconciliation (I-20A/I-20B Step-1 precedent); then I-24D/`docs/.vitepress/**` implements and W-VP-BUILD becomes witnessable.

Until both rulings land, I-24 correctly remains **BLOCKED**. Implementer `DONE` ≠ validator `PASS`.

## Terse summary

BLOCKED — full DL-21 scope exceeds the ≤6h unit (R1 split needed) AND the required VitePress/markdown-lint/TypeDoc deps are absent from root manifest+lockfile and require a serialized EXTEND-I-00A/I-20S lockfile reconciliation (R2); halted with zero product edits per quality bar + brief §6.1/§6.2, report-only, proposed I-24A/B/C/D decomposition + achievable-in-license subset documented for efficient re-routing.
