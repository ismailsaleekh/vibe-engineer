# Serialized Product-Source Handoff — p0 residual real findings

> Origin: FINAL-BUGHUNT FIX (Triad-B). These are the REAL product-source defects that keep
> `pnpm quality -- --profile=ci` at exit 2 AFTER the in-license root governance carriers were
> authored (which collapsed the prior ~3,680 fail-closed "policy-unreadable" findings to this
> honest scoped set of **170 blocking findings**). Every item below is in `packages/**/src/**`
> (product source) — OUT of the FIX agent's write-license — and is serialized to the source owners.
> Evidence: `post-fix-p0.aggregate.json` (this dir), reproduced via the public
> `@vibe-engineer/mechanical-gates/aggregate` export on the real workspace.

## p0 summary after carrier authoring
| family | ok | blocking | status |
|--------|----|----------|--------|
| p0.governed-surface | true | 0 | GREEN (carrier authored) |
| p0.testing-boundary | true | 0 | GREEN (carrier authored) |
| p0.config-guards | false | 2 | gate/monorepo mismatch (typecheck/test) — see §4 |
| p0.boundaries | false | 1 | REAL product-source defect — §1 |
| p0.allowlist | false | 141 | REAL product-source defects — §2 |
| p0.domain-purity | false | 26 | REAL product-source defects — §3 |

---

## §1 boundaries (1) — cli→schematics relative-path reach-in
- **Finding:** `boundaries.forbidden-import-direction` at `packages/cli/src/commands/schematic/index.js`
  imports `../../../../schematics/src/engine/index.js` (vibe-engineer → @vibe-engineer/schematics).
- **Root cause:** the cli reaches DIRECTLY into `@vibe-engineer/schematics` source via a relative
  path instead of through a declared package export; `@vibe-engineer/schematics` is not a declared
  dependency of the cli and exposes no public entrypoint for `engine`.
- **Honest fix (source owner):** expose `executeSchematic` via a public subpath export on
  `@vibe-engineer/schematics` (add to `package.json` `exports` + `mechanical-boundaries.json`
  `publicEntrypoints`), declare `@vibe-engineer/schematics` as a cli dependency, and import it via
  the package specifier. (After that, `mechanical-boundaries.json` needs no further change — its
  `allowedDependencies`/`publicEntrypoints` already mirror real `package.json` data.)

## §2 allowlist (141) — unallowlisted type-escapes in product source
By kind: `broad-type` 49, `as-unknown` 47, `raw-json-parse` 44, `eslint-disable-next-line` 1.
Affected files (full per-line list in `finding-breakdown.txt`):
- `packages/mechanical-gates/src/p0/boundaries/contracts.js` (raw `JSON.parse` in `readJsonFileBounded`)
- `packages/artifacts/src/validation.js`, `packages/artifacts/src/schema-registry.js` (raw `JSON.parse`)
- `packages/standards/src/schema-registry.js`, `packages/standards/src/index.js`
- `packages/schematics/src/engine/markers.js`, `packages/schematics/src/manifest/loader.js`
- `packages/cli/src/command-loader/loader.js`, `packages/cli/src/commands/{schematic,security}/*`
- `packages/context/src/index.js`, `packages/observability/src/ids.js`
- `packages/presets/{typescript,nest-react-rn}/src/index.ts` (`as unknown`, broad `{}`/`Function` types)
- `packages/skills/src/input/common/work-brief-writer.js`, `packages/testing/src/index.js`
- `packages/mechanical-gates/src/p1/{quality-ratchet,test-anti-pattern,index.js,validate-schema-contract-strictness.ts}`
- **Honest fix (source owner):** EITHER (a) eliminate the escapes at the source — route `JSON.parse`
  through named runtime boundary validators (the repo's own `validate*`/schema-narrow functions) so
  the `raw-json-parse` carrier disappears; replace `as unknown` with proper runtime narrowing;
  replace broad `{}`/`Function`/`Object` types with concrete typed contracts — OR (b) for genuinely
  unavoidable escapes, add a reviewed entry to `mechanical-escape-allowlist.json#/entries` with
  `justification`, `whyUnavoidable`, `reviewer`, `reviewedOn`, and a `locator.textIncludes` that
  matches the live escape (the gate rejects stale/unmatched/hard-banned entries — `as-any` is
  hard-banned and can never be allowlisted). Rubber-stamping all 141 without source review is a
  band-aid and is forbidden.

## §3 domain-purity (26) — forbidden domain terms in core source
Locked forbidden terms: `ecommerce`, `inventory`, `Billz`, `Telegram`. All 26 hits are in core
product source (not fixtures):
- `packages/mechanical-gates/src/p0/domain-purity/validate-domain-purity.js:15` — the gate's OWN
  `DEFAULT_FORBIDDEN` literal (self-referential; unavoidable in-source as written).
- `packages/adapters/pi/src/runtime/validation.ts:28`, `packages/registry/src/index.js:40` — domain
  registries enumerating the forbidden/example terms.
- `packages/schematics/src/engine/index.js:10` — demo business rules (`BillzInvoice`,
  `TelegramBotBusinessRule`) used to illustrate domain-neutral generation.
- `packages/presets/{typescript,nest-react-rn}/src/index.ts:{262-266,370-374}` — preset demo content
  carrying the example domain terms.
- **Honest fix (source owner):** externalize the forbidden-term default into a non-scanned policy
  carrier (read by the gate rather than inlined); move demo/example business-domain tokens to a
  `sample-demo`/`fixture` surface (reclassify in `mechanical-domain-purity.json#/surfaces`) or out of
  core source entirely. Editing core source is required and is out of the FIX agent's license.

## §4 config-guards (2) — typecheck/test assume single-package direct tool invocation
- `package.json#/scripts/typecheck` = `pnpm exec turbo run typecheck`; gate requires direct
  `tsc --noEmit`.
- `package.json#/scripts/test` = `pnpm exec turbo run test`; gate requires a direct test runner
  (node/vitest/…).
- **Root cause:** the config-guards validator parses root scripts and requires the tool token
  (`tsc`/test-runner) to appear directly; this monorepo routes typecheck/test through `turbo`, so the
  parser sees `exec`/`turbo`, not `tsc`/`node`. Forcing a root `tsc --noEmit` would be shape-green
  only (a root tsc on this multi-package repo is not a truthful typecheck without a proper solution
  tsconfig + `tsc -b`), so it was NOT faked (quality bar: shape-green ≠ truth-green).
- **Honest fix (gate owner OR source owner):** either (a) teach config-guards to recognize
  turbo/pnpm-monorepo script orchestration as a valid typecheck/test surface, or (b) introduce a root
  solution `tsconfig.json` with `references` to each package tsconfig and a `tsc -b --noEmit` script
  that is genuinely truth-green, plus a root test runner. The other config-guards legs (tsconfig
  flags, eslint rules, prettier defaults, module type, lint, format:check) are GREEN.

## Verdict for source owners
Once §1, §2, §3 are resolved in product source and §4 is resolved at the gate/orchestration seam,
`pnpm quality -- --profile=ci` reaches exit 0 on the real workspace with NO false-green. No further
`mechanical-*.json` / `mechanical-surface.json` / `tsconfig.json` authoring is required from the FIX
agent; the in-license governance contract is complete.
