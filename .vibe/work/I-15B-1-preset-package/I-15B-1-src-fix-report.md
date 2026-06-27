# I-15B-1 SRC-FIX report — word-boundary domain-term matcher (root-cause fix)

- **Agent:** Triad-B FIX (combined adjudication + fix), glm-5.2 via zai, thinking: high.
- **Binding direction:** Step-2 finisher report (S5 latent src defect: coarse substring matcher false-positives "production"→"product") + Step-0 revalidation (PASS; resolution seam truth-green) + I-15B brief (I-15B-1 scope + W-NEG matrix) + quality bar (prepended verbatim).
- **Scope:** authorized for `packages/presets/nest-react-rn/src/**` for THIS defect ONLY (make `validateDomainNeutralText` word-boundary aware); optional owned-fixture assertion under `fixtures/**`; this report + own evidence tree.
- **Implementer is NOT self-judge:** a separate revalidation follows.
- **Status:** see Stage log (updated after every stage).

## Owned WRITE paths (this fixer)
- `packages/presets/nest-react-rn/src/**` (the `validateDomainNeutralText` matcher fix — THIS defect ONLY).
- `packages/presets/nest-react-rn/fixtures/**` (if a new positive-validation assertion for the defect closure is needed — owned).
- `.vibe/work/I-15B-1-preset-package/src-fix-evidence/**` (evidence tree).
- `.vibe/work/I-15B-1-preset-package/I-15B-1-src-fix-report.md` (this report).

## Untouchable (confirmed)
- `packages/presets/nest-react-rn/package.json` / `templates/**` / `tsconfig.json` (manifest done; do NOT reword boundaryRule).
- `pnpm-lock.yaml` (Step-0 closed); `packages/presets/typescript/**`; all other lanes' surfaces; `.git**`; prior evidence/reports.

## Stage log
- [x] S0 — report artifact created (this checkpoint).
- [x] S1 — on-disk analysis confirmed (matcher location + "production"/"product" collision).
- [x] S2 — defect reproduced BEFORE the fix (validate(rendered) → ok:false, evidence:["product"]).
- [x] S3 — root-cause fix applied (word-boundary-aware matcher).
- [x] S4 — AFTER: defect closure + full gauntlet run (all green).
- [x] S5 — siblings + dirty-tree scope confirmed.
- [x] S6 — verdict: DONE.

## S1 — on-disk analysis (CONFIRMS Step-2 S5)
- `packages/presets/nest-react-rn/src/index.ts:369` declares `FORBIDDEN_DOMAIN_TERMS` (incl. the e-commerce term `"product"`).
- `src/index.ts:1058` (pre-fix) `validateDomainNeutralText` iterated each term and tested `file.content.toLowerCase().includes(term.toLowerCase())` — a coarse case-insensitive substring test (the heuristic). CONFIRMED.
- `STARTER_PACKAGES.testing.boundaryRule` (line ~180) = `"Test-only; no production package may depend on it."` — serialized into `.vibe/generated/nest-react-rn-preset/manifest.json` (also echoed in `packages/testing/package.json` manifestEntry at line 475: "no production consumer").
- Collision confirmed: `"product"` ⊆ `"production"` → false-positive `PRESET_DOMAIN_SPECIFIC_CORE_TEXT` on the preset's own rendered manifest.
- The `W-NEG-OVER-INFERENCE` witness injects `// checkout` (whole-word token) — a word-boundary matcher must still fire it. (Also injects nothing that weakens over-inference.)

## S2 — defect reproduced BEFORE the fix
Witness `node packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` → **exit 2 (BLOCKED — source defect)**. `positiveValidation:"blocked-source-defect"`; finding `{code:"PRESET_DOMAIN_SPECIFIC_CORE_TEXT", path:".vibe/generated/nest-react-rn-preset/manifest.json", evidence:["product"]}`. Every other component was already green (phaseA/resolve/compile/b3Load/layout/manifest/11 negatives/rendererOptions/defensiveCopy). Evidence: `src-fix-evidence/before-fix-witness-run.log`.

## S3 — root-cause fix applied (word-boundary-aware matcher)
Two localized edits in `src/index.ts` (THIS defect ONLY; zero other src changes):

1. Added a regex-literal escaper + a module-load-compiled word-boundary pattern table (compiled once, deterministic — NOT a per-call heuristic):
```ts
function escapeRegExpLiteral(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const FORBIDDEN_DOMAIN_TERM_PATTERNS: readonly { readonly term: string; readonly pattern: RegExp }[] =
  FORBIDDEN_DOMAIN_TERMS.map((term) => ({
    term,
    pattern: new RegExp(`\\b${escapeRegExpLiteral(term)}\\b`, "i"),
  }));
```
2. Replaced the coarse substring test with the precompiled word-boundary test:
```ts
// BEFORE (heuristic, the defect):
for (const term of FORBIDDEN_DOMAIN_TERMS) {
  if (file.content.toLowerCase().includes(term.toLowerCase())) { ... }
}
// AFTER (root-cause fix):
for (const { term, pattern } of FORBIDDEN_DOMAIN_TERM_PATTERNS) {
  if (pattern.test(file.content)) { ... }
}
```
The `\b` anchors make `product` NOT match `production`/`products` (no word boundary between `t` and `i`/`s`), while `checkout` injected as `// checkout` still matches (`\b` before `c` after the space, `\b` after `t`). Case-insensitivity (`i` flag) preserves the prior casing posture. The non-sample-demo-file scope and all other validator behavior are untouched.

I did NOT reword `testing.boundaryRule` (symptom-fix, explicitly forbidden) and did NOT weaken any negative assertion.

## S4 — AFTER: defect closure + FULL gauntlet run (ALL GREEN)
Witness re-run → **exit 0**, `ok:true`, `blocked:false`. Evidence: `src-fix-evidence/after-fix-witness-run.log` + `after-fix-result.json`.

| Component | Result |
|---|---|
| Phase A (node --check ×3, 8 template JSON, manifest invariants, source hygiene, public bare specifier, no relative import into TS preset) | GREEN ✅ |
| **W-RESOLVE-TS-PRESET** (resolve `@vibe-engineer/preset-typescript` from preset context) | GREEN ✅ exit 0; `TS_PRESET_OK function true` |
| **W-PRESET-CONTRACT (compile)** `tsc --noEmit -p .../tsconfig.json` | GREEN ✅ exit 0 |
| **W-PRESET-CONTRACT (runtime)** in-context self-reference load | GREEN ✅ 26 exported keys; render/validate/layout/manifest/optionsErr present |
| render | 29 files ✅ |
| **positive validation** `validate(rendered)` | **ok:true, 0 findings — DEFECT CLOSED** ✅ |
| layout (DL-16 fidelity) | GREEN ✅ |
| manifest | GREEN ✅ |
| **11-negative W-NEG-* gauntlet** | **11/11 ok** ✅ — incl. **W-NEG-OVER-INFERENCE still firing** (observedCodes includes `PRESET_DOMAIN_SPECIFIC_CORE_TEXT`) |
| renderer-options negatives | 3/3 ok (`PRESET_MALFORMED_RENDER_OPTIONS`) ✅ |
| defensive-copy | GREEN ✅ blockedMutation:true |

**Direct word-boundary behavior probe** (`src-fix-evidence/word-boundary-probe.log`):
- Within-word substrings that must NOT fire: `production`→[], `products`→[], `ordering`→[], `delivered`→[] ✅ (the defect collision `product`⊆`production` is fixed).
- Whole tokens that MUST fire: `product`→[product], `order`→[order], `checkout`→[checkout], `Product`(capital)→[product] ✅ (case-insensitive, fail-closed preserved).
- (Note: a hyphen-separated token like `inventory-item` correctly still fires `inventory` because the hyphen IS a word boundary — that is correct whole-token detection, not a false positive.)

## S5 — siblings + dirty-tree scope (CONFIRMED)
- **Sibling I-07D no-regression:** `node packages/presets/typescript/fixtures/witnesses/run-typescript-preset-witness.mjs` → **exit 0**, `{ok:true, generatedFileCount:12, negativeCount:33}`. Consumed preset unaffected. ✅
- **Dirty-tree scope (`git status --porcelain packages/presets/nest-react-rn/`):**
  - `M packages/presets/nest-react-rn/package.json` — **pre-existing** in-license I-15B-1 skeleton→implemented manifest (Step-0 F6; NOT touched by this fixer).
  - `?? packages/presets/nest-react-rn/{src,templates,tsconfig.json,fixtures/consumer,fixtures/witnesses}` — **pre-existing** I-15B-1 implementation; `src/` is an untracked dir (no committed baseline), so the in-place matcher edit does NOT change git status. The fixtures witness runner mtime (04:52) predates the src edit (04:56) → **NO fixture edit** this session (the existing positive-validation witness already covers defect closure).
- **ZERO out-of-license edits:** only `src/index.ts` (THIS defect, matcher only); NO `package.json`/`templates/**`/`tsconfig.json` edit, NO `pnpm-lock.yaml` edit, NO `packages/presets/typescript/**` edit, NO `.git**` ops, NO stash/reset/clean/checkout/restore, NO new node_modules link, NO lockfile-mutating command, NO reword of `boundaryRule`. The coarse `term.toLowerCase()` substring matcher is fully removed (grep-confirmed absent).

## S6 — verdict: `DONE`
The Step-2 latent src defect is closed at root cause: `validateDomainNeutralText` is now word-boundary aware (precompiled `\b`-anchored, case-insensitive regex per forbidden term; deterministic module-load compilation, not a per-call heuristic). `validate(rendered)` → **ok:true** (defect closure); the FULL I-15B-1 gauntlet is all-green (W-RESOLVE + W-PRESET-CONTRACT compile+runtime incl. positive validation + 11-negative W-NEG-* with W-NEG-OVER-INFERENCE still firing + render/layout/manifest/renderer-options/defensive-copy); sibling I-07D unaffected; dirty-tree scope clean (only the matcher fix in `src/**`). No negative assertion weakened, no boundaryRule reworded, no out-of-license edit. Implementer is NOT self-judge — a separate revalidation follows.

## Files touched (this fixer — owned WRITE only)
- `packages/presets/nest-react-rn/src/index.ts` (the word-boundary matcher fix — THIS defect ONLY; two localized regions: the new `escapeRegExpLiteral` + `FORBIDDEN_DOMAIN_TERM_PATTERNS` const, and the `validateDomainNeutralText` body).
- `.vibe/work/I-15B-1-preset-package/src-fix-evidence/{before-fix-witness-run.log,after-fix-witness-run.log,after-fix-result.json,word-boundary-probe.log}` (evidence tree).
- `.vibe/work/I-15B-1-preset-package/I-15B-1-src-fix-report.md` (this report).

No `fixtures/**` edit (defect closure covered by the existing positive-validation witness); no other product edits; no `.git**` ops; no lockfile-mutating commands.

*Implementer is NOT self-judge — separate revalidation follows.*
