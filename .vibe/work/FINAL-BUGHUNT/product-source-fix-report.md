# FINAL-BUGHUNT Product-Source FIX Report (Triad-B FIX, pass 2 — product source)

> Implementer: Triad-B FIX (glm-5.2, thinking high). NOT self-validating (Validator must independently confirm).
> Binding: quality bar (prepended verbatim). PERFECT solution only; no band-aids, no false-green, no rubber-stamping.
> Working dir: `/Users/lizavasilyeva/work/vibe-engineer`. Dirty tree; no git ops.
> Owned WRITE: `packages/**/src/**` (the 170 defect sites), escape-allowlist carrier, `.vibe/work/FINAL-BUGHUNT/product-source-fix-evidence/**`, this report.
> Read-only/untouchable (per bar "Edit only explicitly owned write paths; treat all unspecified as untouchable"): `package.json`/`pnpm-lock.yaml`, the root governance carriers `mechanical-surface.json` / `mechanical-boundaries.json` / `mechanical-domain-purity.json` / `mechanical-testing-boundary.json` (NOT in my write license), `.git**`, prior evidence/reports.

## Status: BLOCKED — exit-0 is NOT achievable within this agent's write license.

`pnpm quality -- --profile=ci` cannot reach exit 0 in-license because **22 of the 26 p0.domain-purity
findings are irreducible within `packages/**/src/**`-only write access**. The remaining 148 findings are
fixable in-license (complete per-category fix-plan in §C), but fixing them is moot while the 22 hold the
gate RED. Per the quality bar ("Blocked means analyze, never improvise … halt BLOCKED with zero
out-of-license edits and report root cause, touched files, and the exact ruling needed"), this agent
made **ZERO source edits** and **ZERO out-of-license edits**, and files this ruling request.

## §A Root cause of the hard block (22 irreducible domain-purity findings)

The locked forbidden terms — `ecommerce`, `inventory`, `Billz`, `Telegram` (hardcoded in
`packages/mechanical-gates/src/p0/domain-purity/validate-domain-purity.js:15` `DEFAULT_FORBIDDEN`,
which the policy `forbiddenTerms` may only *add to*, never remove) — are ALSO enumerated, as
**load-bearing runtime enforcement vocabulary**, inside five *product* packages. Each enumeration is
used by that package's own domain-neutrality enforcement to **reject or flag** user/content carrying
those terms. Removing or renaming a locked term from any of these arrays is a **behavior change**
(weakening domain-neutrality enforcement), not a source cleanup — and is therefore forbidden by the
"no band-aids / no silent fallbacks" bar.

Evidence (each array is consumed at runtime — verified by grep, not assumed):

| Site (file:line) | Array | Locked-term hits | Runtime enforcement consumer (proof) |
|---|---|---|---|
| `packages/adapters/pi/src/runtime/validation.ts:28` | `BUSINESS_DOMAIN_MARKERS` | ecommerce, inventory, Telegram, Billz (4) | `:272 hasAnyMarker(asset.content, BUSINESS_DOMAIN_MARKERS)` — flags skill assets carrying business-domain markers |
| `packages/registry/src/index.js:40` | `FORBIDDEN_CORE_TERMS` | ecommerce, inventory, Billz, Telegram (4) | `:337 FORBIDDEN_CORE_TERMS.filter((term) => haystack.includes(term))` — rejects registry entries |
| `packages/schematics/src/engine/index.js:10` | `DOMAIN_FORBIDDEN_TERMS` | ecommerce, inventory, Billz, Telegram, +BillzInvoice, +TelegramBotBusinessRule (6) | `:62 …filter((term) => content.includes(term))` rejects generated content; **also a public export at `:322`** (stable API) |
| `packages/presets/typescript/src/index.ts:~266` | `FORBIDDEN_DOMAIN_TERMS` | ecommerce, inventory, Billz, Telegram (4) | `:971 for (const term of FORBIDDEN_DOMAIN_TERMS)` — preset domain-neutrality scan |
| `packages/presets/nest-react-rn/src/index.ts:~374` | `FORBIDDEN_DOMAIN_TERMS` | ecommerce, inventory, Billz, Telegram (4) | `:406 FORBIDDEN_DOMAIN_TERMS.map((term) => ({…word-boundary patterns…}))` — preset enforcement |
| **subtotal** | | **22** | |

Why every in-license resolution is a band-aid or out-of-license:
1. **Rename/remove terms in source** → weakens each package's own enforcement (behavior change). ✗ band-aid.
2. **Runtime string construction** (`"eco"+"mmerce"`) to dodge the AST string-literal carrier → textbook obfuscation; explicitly the "heuristic standing in for typed contracts" the bar forbids. ✗ band-aid.
3. **Read the locked floor from the root carrier at runtime** → the carrier (`mechanical-domain-purity.json`) lives at repo root and is a *governance* artifact, not a runtime dependency; the enumerated packages (`@vibe-engineer/adapter-pi`, `registry`, `schematics`, presets) are **published packages** that cannot resolve a repo-root governance JSON in standalone consumption. Architecturally wrong + fragile. ✗ not clean.
4. **Reclassify these files' surfaces** to `sample-demo`/`fixture`/`excluded` via `mechanical-domain-purity.json#/surfaces` → the carrier is **outside this agent's write license** (not in owned WRITE list; bar = "treat all unspecified paths as untouchable"). ✗ out-of-license.
5. **Relocate the locked term-list into a shared non-scanned module** that these packages may legitimately import → any module under `packages/*/src` is scanned by `domain-purity` (no unscanned text extension exists; `.json`/`.md`/`.cjs` all scanned; `generatedVendor`/`IGNORED_SURFACES` only apply via the untouchable carrier `surfaces`). A non-scanned store must live **outside `packages/*/src`** → out-of-license. ✗ out-of-license.

The domain-purity gate has **no allowlist mechanism** (only surface reclassification, which needs the
untouchable carrier), so there is no in-license escape hatch for these 22.

→ The 22 are genuinely BLOCKED in-license. They hold `p0.domain-purity` RED regardless of any
in-license work on the other 148 findings, so `pnpm quality -- --profile=ci` cannot exit 0 within
this agent's license.

## §B Exact ruling needed (pick one)

1. **Grant write license to `mechanical-domain-purity.json`** so this agent may EITHER (a) reclassify
   the five enforcement-vocabulary files above as `fixture`/`sample-demo` surfaces (honest: they are
   meta-enforcement of domain-neutrality, scanning its own vocabulary), OR (b) externalize the locked
   term-list into the carrier and have each product package read it from a governed, in-package,
   non-scanned location; OR
2. **Authorize a governed shared non-scanned term-store** (e.g. `packages/contracts/src/terms/` plus a
   carrier surface row classifying it as `fixture`/`excluded`) that exports `LOCKED_FORBIDDEN_DOMAIN_TERMS`,
   which the five product packages import instead of hardcoding — centralizing the vocabulary in one
   non-scanned place (genuine architectural improvement, no behavior change); OR
3. **Confirm a behavior change is acceptable** (weaken product-side enforcement to rely solely on the
   central `p0.domain-purity` gate) — explicitly NOT assumed by this agent.

Any one ruling unblocks all 22; the other 148 findings then fall to the §C plan and exit-0 is reachable.

## §C Complete fix-plan for the other 148 findings (recovery-ready once §B ruling lands)

These are all fixable in-license; plans recorded so recovery is mechanical. (Not executed now because
exit-0 is deterministically blocked by §A; executing would risk band-aids/breakage for zero path to
the goal — "Blocked means analyze, never improvise.")

### C1 p0.domain-purity — gate's own default (4) — IN-LICENSE FIXABLE
`packages/mechanical-gates/src/p0/domain-purity/validate-domain-purity.js:15` `DEFAULT_FORBIDDEN` is
self-referential. Fix: drop the hardcoded `DEFAULT_FORBIDDEN` floor and instead treat the governed
carrier's `forbiddenTerms` as authoritative (the carrier already lists the 4 locked terms; the gate
already loads it). Keep fail-closed behavior when the carrier is unreadable (emit
`domain-purity.policy-unreadable` only). Removes the 4 self-hits; behavior preserved (same terms,
now single-sourced). This is the handoff's recommended fix ("externalize the forbidden-term default
into a non-scanned policy carrier (read by the gate)").

### C2 p0.boundaries — cli→schematics reach-in (1) — IN-LICENSE FIXABLE
`packages/cli/src/commands/schematic/index.js:3` imports `../../../../schematics/src/engine/index.js`.
Fix: `@vibe-engineer/schematics` already exports `executeSchematic`/`DOMAIN_FORBIDDEN_TERMS` (engine
`index.js:322`); consume via the package specifier `@vibe-engineer/schematics`. Requires declaring the
dep in the cli `package.json` — **`package.json` is untouchable for this agent**, so this item ALSO
needs a `package.json` write grant (or confirmation that the cli `package.json` dep declaration is
in-license). Flagged for the ruling.

### C3 p0.allowlist — type-escapes (141) — IN-LICENSE FIXABLE (root-cause preferred)
Detection rules (from `validate-escape-allowlist.js`, verified): `as-any` hard-banned (never
allowlistable); `as-unknown` flagged UNLESS immediately consumed by a named runtime call
(name ⊇ schema|parse|validate|narrow); `raw-json-parse` flagged UNLESS parent is such a named call;
`broad-type` = `Function`/`Object` type-refs, **any `FunctionType` arrow-in-type node**, or empty `{}`;
comment directives `ts-ignore`/`ts-expect-error`/`ts-nocheck`/`eslint-disable*`.

Per-kind root-cause plan:
- **`raw-json-parse` (44):** route every `JSON.parse(x)` through a named boundary parser whose name
  contains `parse`/`validate`/`schema`/`narrow` (e.g. `parseJsonUnknown(text): unknown`). Once the
  call site is `parseJsonUnknown(text)`, no `JSON.parse` call remains in scanned source → finding
  vanishes. Genuine boundary-discipline improvement (centralized error handling). Sites: adapters/pi
  (capabilities, generated-file-manifest, runtime/validation), artifacts (validation, schema-registry),
  cli (command-loader, commands/{schematic,security,ship,verify,create} + their `run-cli-witness*.mjs`,
  testing/run-witnesses), config, context, mechanical-gates (boundaries/contracts, p1/{quality-ratchet,
  test-anti-pattern,schema-contract-strictness}), presets/{typescript,nest-react-rn}, schematics
  (engine/markers, manifest/loader, builtins), skills (work-brief-writer), standards (index,
  schema-registry), testing.
- **`as-unknown` + `broad-type` paired in CLI commands (~85 across create/ship/security/verify +
  selected-harness):** root cause is untyped JS siblings (`envelope/result-envelope.js`,
  `errors/codes.js`, selected-harness deps) cast `as unknown as (FnType)`. Fix: author sibling `.d.ts`
  declarations (`FunctionDeclaration`, not `FunctionType` → not flagged) with the exact signatures the
  casts assert, then replace `const makeX = X as unknown as FnType;` with `const makeX = X;` (type
  inferred from the `.d.ts`; no `as unknown`, no written `FunctionType` node → both findings vanish;
  runtime identical). Verify with `turbo run typecheck`.
- **`as-unknown` in adapters/pi/schema (2), runtime/validation (2), schematics/builtins (2):** replace
  `value as unknown as TypedMatrix` (post-validation) with the validators' typed return path, or wrap
  in the named runtime narrower so `isImmediatelyNarrowedAsUnknown` holds.
- **`broad-type` schematics/builtins (6), orchestration (2):** replace inline `FunctionType`/`{}`/
  `Function`/`Object` with named `interface` call-signatures or concrete records.
- **`eslint-disable-next-line` observability/ids.js (1):** remove the directive (resolve the underlying
  lint finding at root cause).
- **Genuinely-unavoidable residue (if any):** add reviewed entries to
  `mechanical-escape-allowlist.json#/entries` with `justification`+`whyUnavoidable`+`reviewer`+
  `reviewedOn`+matching `locator.textIncludes` (this carrier IS in my write license). None anticipated
  to be unavoidable after the above root-cause work.

### C4 p0.config-guards — turbo/typecheck+test (2) — IN-LICENSE FIXABLE (gate-source)
`package.json#/scripts/{typecheck,test}` route through `turbo`; the gate requires the `tsc`/test-runner
token directly. `package.json` is untouchable, so fix at the **gate** (`mechanical-gates/src`, in
license): teach `validate-strict-config.js` to recognize `pnpm exec turbo run <leg>` (and `pnpm -r
run <leg>`) as a valid monorepo typecheck/test surface (it already proves the leg runs). Honest —
turbo IS a real typecheck/test orchestrator; this is truth-green, not shape-green.

## §D Work performed this pass
- Created this report (owned write path). **ZERO edits to `packages/**/src/**`. ZERO out-of-license edits.**
- Independently read all four p0 validators (allowlist, domain-purity, + their contracts) to derive the
  EXACT detection rules (not guessed) — recorded in §C so fixes are correct, not shape-green.
- Verified each of the 22 blocked arrays is load-bearing (runtime consumer grep, §A table) — proving
  source removal/rename is a behavior change, not a cleanup.
- Confirmed the domain-purity carrier is outside write license and the gate has no allowlist → no
  in-license escape for the 22.

## Stage log
- [x] S0 — report created first.
- [x] S1 — read handoff + pass-1 fix report; confirmed 170 = 141+26+1+2.
- [x] S2 — read all p0 gate validators + contracts; derived exact detection rules (§C).
- [x] S3 — triaged all 170 per-site; classified fixable-in-license (148) vs irreducible (22).
- [x] S4 — verified the 22 irreducible are load-bearing enforcement vocab (§A evidence) + every in-license resolution is band-aid/out-of-license.
- [x] S5 — confirmed exit-0 impossible in-license; halted per "Blocked means analyze, never improvise."
- [x] S6 — authored ruling request (§B) + complete recovery fix-plan (§C).
- [x] S7 — verdict.

## VERDICT: BLOCKED — 22 of 26 p0.domain-purity findings are load-bearing self-referential enforcement vocabulary in product packages (adapters/pi, registry, schematics, 2 presets), irreducible without an out-of-license edit to the untouchable `mechanical-domain-purity.json` carrier (reclassify/externalize) or a shared non-scanned term-store; the other 148 findings are fixable in-license and a complete per-category root-cause fix-plan is recorded (§C). Zero source edits, zero out-of-license edits. Ruling needed: §B option 1/2/3.
