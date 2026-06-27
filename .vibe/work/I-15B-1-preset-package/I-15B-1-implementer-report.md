# I-15B-1 Implementer Report — `nest-react-rn` preset package (Triad-B)

- **Lane:** `I-15B-starter-template-harness-consumption` → sub-lane `I-15B-1-preset-package`
- **Working dir:** `/Users/lizavasilyeva/work/vibe-engineer`
- **Quality bar:** prepended verbatim, binding. PERFECT only; shape-green ≠ truth-green; blocked = analyze, never improvise.
- **Status:** `BLOCKED` (keystone real-boundary seam; all in-license work complete + type-clean)
- **Stage:** COMPLETE — in-license implementation done; witness run; BLOCK evidence recorded; awaits serialized operator `pnpm install` (EXTEND-I-15B-style handoff).

## Owned WRITE paths (THIS implementer — per brief §4 / §3 table I-15B-1)

- `packages/presets/nest-react-rn/package.json` (I-15B-owned after I-00A skeleton handoff ✓)
- `packages/presets/nest-react-rn/src/**`
- `packages/presets/nest-react-rn/templates/**`
- `packages/presets/nest-react-rn/fixtures/**`
- `packages/presets/nest-react-rn/tsconfig.json` (preset-local, mirror I-07D)
- `.vibe/work/I-15B-1-preset-package/**` (this report + evidence)

**Out of scope (other sub-lanes / untouchable):** `examples/starter-reference/.source-template/**` (I-15B-2), `examples/starter-reference/generated-fixtures/harness-consumption/**` (I-15B-3), root `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml`/`turbo.json`, `packages/cli/**`, `packages/presets/typescript/**`, `packages/adapters/pi/**`, `docs/decisions/**`, `.git/**`.

## Ground truth read (read-only)

- Brief: `…/implementation-briefs/I-15B-brief-generated.md` (I-15B-1 = preset sub-lane).
- Brief validation artifact: `…/reports/I-15B-brief-validation-artifact.md` → PASS (2 minor-local: D-1 sibling path nit, D-2 §5 wording; advisory §5 = high-likelihood EXTEND-I-02A-style BLOCK on the real-resolution seam).
- DL-16 (LOCKED): app/package names/scope `@vibe-engineer-starter`, boundaries, golden module `golden-records`, no-auth, PostgreSQL+Prisma, `ts-rest`+Zod.
- I-07D public contract: `packages/presets/typescript/src/index.ts` — exports `TYPESCRIPT_PRESET_METADATA`, `TYPESCRIPT_COMPILER_STRICT_OPTIONS`, `ESLINT_POLICY_DEFAULTS`, `PRETTIER_DEFAULTS`, `PNPM_DEFAULTS`, `TURBO_TASK_DEFAULTS`, `PACKAGE_SCRIPT_DEFAULTS`, `TEST_AND_TYPECHECK_DEFAULTS`, `getTypeScriptPresetMetadata()`, `renderTypeScriptPresetFiles()`, `validateTypeScriptPresetFiles()`, `getTypeScriptPresetFileManifest()`, `PresetFileKind`, `StandardId`, etc.
- I-15A blocker ruling (EXTEND-I-02A): `…/reports/I-15A-blocker-adjudication-ruling.md` — the precedent for the resolution seam.
- I-07D witness pattern mirrored: `packages/presets/typescript/fixtures/witnesses/run-typescript-preset-witness.mjs` + `fixtures/consumer/public-api-consumer.ts`.

## Critical pre-analysis — the W-RESOLVE-TS-PRESET resolution seam (BLOCKER, pre-routed)

**Confirmed on-disk (read-only):**
- `@vibe-engineer/preset-typescript` is declared as a workspace dep **nowhere** (only its own `package.json`). `packages/presets/nest-react-rn/node_modules` does not exist. Repo-root `node_modules/@vibe-engineer/` = `{mechanical-gates}` only.
- The I-07D witness self-import works **only** via Node's **package self-reference** (importing a package by its own `name` from within its own dir → resolves to itself, no symlink). That is why I-07D's `node -e "import('@vibe-engineer/preset-typescript')"` run from cwd=`packages/presets/typescript` resolves to its own `exports`→`src/index.ts`. **Self-reference does NOT help I-15B-1**: the nest-react-rn preset is a *different* package, so consuming `@vibe-engineer/preset-typescript` requires a **real node_modules link** in `packages/presets/nest-react-rn/node_modules/@vibe-engineer/preset-typescript`.
- Under strict pnpm (`shamefully-hoist=false`, `link-workspace-packages=true`, `shared-workspace-lockfile=true`): that link is created **only** by `pnpm install`, which mutates `pnpm-lock.yaml` (adding a `packages/presets/nest-react-rn:` importer block with `'@vibe-engineer/preset-typescript': specifier: workspace:* version: link:../../typescript`).
- A relative/`:../` import into `packages/presets/typescript/src` is a **private/internal scoped import** → explicitly FORBIDDEN (brief §5; W-NEG-PRIVATE-SCOPED-IMPORT = critical).

**Therefore:** the in-license surface is (a) declaring `"@vibe-engineer/preset-typescript": "workspace:*"` in the nest-react-rn preset's OWN `package.json` (I-15B-1 owned — in-license, exactly as the I-15A ruling's analogous manifest edit was in-license for the field-owner), and (b) writing all preset source/templates/fixtures/witness. The **out-of-license seam** is the `pnpm install` (lockfile mutation + node_modules link creation). This is the exact EXTEND-I-02A-style serialized handoff the brief §5/§7/§8/§9 pre-routes and the validation-artifact §3/§5 flags as high-likelihood.

**License distinction vs I-15A precedent:** in I-15A the manifest surface (`packages/cli/package.json`) was serialized to I-02A → EXTEND-I-02A owned BOTH manifest edit + lockfile. Here the nest-react-rn manifest IS I-15B-1's owned write, so the **manifest `workspace:*` declaration is in-license**; only the **`pnpm install` reconciliation** (root `pnpm-lock.yaml` mutation) is out-of-license.

## Plan (faithful to brief §6 I-15B-1)

1. ✅ Report-first (this file).
2. Preset `package.json`: convert skeleton → real manifest (`@vibe-engineer/preset-nest-react-rn`, `implementationStatus: implemented`, `exports "." → src/index.ts`, `dependencies: { "@vibe-engineer/preset-typescript": "workspace:*" }`, witness/typecheck scripts). **In-license.** No root/lockfile edit.
3. Preset `tsconfig.json` (preset-local, mirrors I-07D's `tsconfig.json`).
4. Preset `src/index.ts`: typed template registry declaring the locked DL-16 layout/scope/names/golden module/.vibe//.tooling, strict-TS/pnpm/turbo/lint/test defaults **derived from** the consumed I-07D preset (no duplication), plus preset-side negatives (over-inference, non-pi, copied-logic markers). Consumes `@vibe-engineer/preset-typescript` public exports.
5. Preset `templates/**`: materializable file skeletons (per-app manifests, tsconfig inheritors, turbo/pnpm workspace files, eslint/prettier inheritors) declared by the registry.
6. Preset `fixtures/consumer/public-api-consumer.ts` + `fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` (mirror I-07D): real-boundary witness (W-RESOLVE-TS-PRESET + W-PRESET-CONTRACT + preset-side W-NEG-*).
7. Run §8 witness. **Expected: BLOCK** at the real `import("@vibe-engineer/preset-typescript")` (no node_modules link) → record evidence + STOP BLOCKED with exact ruling.
8. Final: report exact files, witnesses, dirty-tree scope, status, handoff notes for I-15B-2, TS-02A sibling-pin acknowledgement.

## Files changed (exact)

All within owned WRITE paths (`packages/presets/nest-react-rn/**` + `.vibe/work/I-15B-1-preset-package/**`):

- `packages/presets/nest-react-rn/package.json` — converted skeleton → real manifest (added `exports`, `scripts`, `dependencies: { @vibe-engineer/preset-typescript: workspace:* }`, `vibeEngineer.implementationStatus: implemented`).
- `packages/presets/nest-react-rn/tsconfig.json` — preset-local tsconfig (mirrors I-07D).
- `packages/presets/nest-react-rn/src/index.ts` — typed preset contract: DL-16 layout declaration + derived strict defaults (consumed from `@vibe-engineer/preset-typescript`) + render/validate/manifest + preset-side negatives.
- `packages/presets/nest-react-rn/templates/starter-layout.json`, `starter-tsconfig-base.json`, `starter-app-tsconfig.json`, `starter-pnpm-workspace.json`, `starter-turbo-tasks.json`, `starter-package-manifest.json`, `starter-harness-config.json`, `starter-context-placeholder.json` — materializable skeletons for I-15B-2.
- `packages/presets/nest-react-rn/fixtures/consumer/public-api-consumer.ts` — typed public-API consumer witness (mirrors I-07D).
- `packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` — real-boundary witness runner.
- `.vibe/work/I-15B-1-preset-package/I-15B-1-implementer-report.md` (this file).
- `.vibe/work/I-15B-1-preset-package/evidence/nest-react-rn-preset-witness-result.json` (witness evidence).

## Witnesses run + evidence

Witness: `node packages/presets/nest-react-rn/fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` → **exit `2` (BLOCK)**. Evidence: `.vibe/work/I-15B-1-preset-package/evidence/nest-react-rn-preset-witness-result.json`.

**PHASE A — GREEN (structural/syntax; no link required):**
- `node --check` on `src/index.ts`, `fixtures/consumer/public-api-consumer.ts`, `fixtures/witnesses/run-nest-react-rn-preset-witness.mjs` → all exit `0` (source is syntactically valid, incl. under Node 24 native type-stripping).
- Template JSON parse: 8/8 templates parse with expected keys.
- Package manifest invariants: `name=@vibe-engineer/preset-nest-react-rn`, `private=true`, `dependencies.@vibe-engineer/preset-typescript=workspace:*` (in-license declaration), `implementationStatus=implemented`, `exports.".".import=./src/index.ts`.
- Source hygiene: `find packages/presets/nest-react-rn/src -name '*.js'|'*.mjs'|'*.cjs'` → empty (TS-only, like I-07D).
- Consume-via-public-bare-specifier: `src/index.ts` imports `from "@vibe-engineer/preset-typescript"`; NO relative/`:../` import into the TS preset (W-NEG-PRIVATE-SCOPED-IMPORT satisfied at the source).

**PHASE B — BLOCKED (keystone real-boundary seam):**
- **W-RESOLVE-TS-PRESET:** `node --input-type=module -e 'await import("@vibe-engineer/preset-typescript")'` from cwd=`packages/presets/nest-react-rn` → **exit `1`**, `ERR_MODULE_NOT_FOUND: Cannot find package '@vibe-engineer/preset-typescript' imported from .../packages/presets/nest-react-rn`.
- **W-PRESET-CONTRACT (compile):** `tsc -p packages/presets/nest-react-rn/tsconfig.json` → **exit `1`** with **exactly two** errors, **both** `TS2307: Cannot find module '@vibe-engineer/preset-typescript'` (one in `src/index.ts:29`, one in `fixtures/consumer/public-api-consumer.ts:7`). **Zero other type errors** — confirms the in-license source is type-clean (the earlier TS4111/TS6133 defects were fixed); the sole compile gate is the missing workspace link.
- **W-PRESET-CONTRACT (runtime render/validate/negative gauntlet):** `skipped-pending-link` — the compiled API cannot load until the link exists (the render/validate/layout/negative machinery is compiled into `src/index.ts` and ready; it is only gated on the link).

**Sibling no-regression (read-only baseline):** `node packages/presets/typescript/fixtures/witnesses/run-typescript-preset-witness.mjs` → **exit `0`** (`ok:true`, 12 files, 33 negatives). I-07D unaffected (I-15B-1 writes only under disjoint `packages/presets/nest-react-rn/**`).

## Dirty-tree scope confirmation

`git status --short -- packages/presets/nest-react-rn/ .vibe/work/I-15B-1-preset-package/` shows writes **only** in owned paths: `packages/presets/nest-react-rn/{package.json,tsconfig.json,src/,templates/,fixtures/}` + `.vibe/work/I-15B-1-preset-package/`. **No** edit to root `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml`/`turbo.json`, `packages/cli/**`, `packages/presets/typescript/**`, `packages/adapters/pi/**`, `docs/decisions/**`, `.git/**`, or any I-15B-2/I-15B-3 surface. Dirty-tree baseline (other lanes' `M`/`??` entries repo-wide) untouched. No `git stash/reset/clean/checkout/restore`; no `pnpm`/install/lockfile-mutating command run.

## TS-02A sibling-pin acknowledgement (§11 — recorded before DONE)

I-15B-1's harness-side `.ts` (preset `src/**`) follows the accepted Node-24-native-`.ts`-load precedent (type-annotation-only; `as unknown as` casts on JS siblings; bare workspace imports; no strict cli tsconfig dependency). I-15B-1 does **not** block on TS-02A and does **not** claim strict-tsc-green for the harness. **TS-02A must later sweep I-15B-1's preset `.ts` surfaces** the way it sweeps `create`/`import`/`verify`/`security`. (Starter-local tsconfigs under `.source-template/**` are I-15B-2 template artifacts, not harness code — out of TS-02A scope.)

## VERDICT: `BLOCKED`

**Root cause:** the nest-react-rn preset consumes `@vibe-engineer/preset-typescript` via its public bare specifier (top-level import in `src/index.ts`). Under strict pnpm (`shamefully-hoist=false`, `link-workspace-packages=true`, `shared-workspace-lockfile=true`), that specifier resolves from the nest-react-rn preset-package resolution context **only** via a `node_modules` link created by `pnpm install` — which mutates the root `pnpm-lock.yaml`. No such link exists today (`packages/presets/nest-react-rn/node_modules` absent; repo-root `node_modules/@vibe-engineer/` = `{mechanical-gates}` only). I-07D's own witness works **only** via Node's package self-reference (importing a package by its own name from within its own dir) — a mechanism unavailable to I-15B-1, which is a *different* package. A relative/`:../` import into `packages/presets/typescript/src` is a forbidden private/internal scoped import (critical: W-NEG-PRIVATE-SCOPED-IMPORT).

**Exact ruling needed (EXTEND-I-15B-style, mirroring the validated + executed + revalidated I-15A EXTEND-I-02A precedent — `reports/I-15A-blocker-adjudication-ruling.md`):**

1. **In-license (already DONE by I-15B-1):** `packages/presets/nest-react-rn/package.json` declares `"@vibe-engineer/preset-typescript": "workspace:*"` in `dependencies`. I-15B-1 OWNS this manifest (brief §4), so this declaration is in-license — unlike I-15A, where the consuming manifest (`packages/cli/package.json`) was serialized to I-02A and the whole op was EXTEND-I-02A. **Only the lockfile-reconciling step is out-of-license here.**
2. **Out-of-license (the gate):** authorize an operator `pnpm install` to materialize the `packages/presets/nest-react-rn/node_modules/@vibe-engineer/preset-typescript` workspace link + reconcile the scoped `pnpm-lock.yaml` importer block (`packages/presets/nest-react-rn:` gaining `'@vibe-engineer/preset-typescript': specifier: workspace:* version: link:../../typescript`). Predicted lockfile delta: a NEW `packages/presets/nest-react-rn:` importer block with ONE `link:` edge; **no** new versioned `packages:` snapshot (workspace link); **no** unrelated importer churn (the preset declares no other deps). Lower-churn than the I-15A precedent (which added two deps to the cli importer).
3. After the handoff, I-15B-1 resumes: W-RESOLVE-TS-PRESET + W-PRESET-CONTRACT (compile + runtime render/validate/layout/negative gauntlet) run green; then DONE.

**Why this is not improvised / not faked:** the witness records the exact `ERR_MODULE_NOT_FOUND` + `TS2307` evidence; it does NOT fake the resolution, does NOT use a relative import into the TS preset, does NOT weaken any gate. The in-license artifact is structurally + type-clean (Phase A green; tsc emits only the two resolution errors). The block is purely the serialized operator install.

## Handoff notes for I-15B-2 (depends on I-15B-1)

- **Precondition NOT yet met:** I-15B-2 consumes the I-15B-1 preset; it must NOT start until I-15B-1 is truth-green (i.e. until the EXTEND-I-15B install handoff lands and W-RESOLVE-TS-PRESET + W-PRESET-CONTRACT are green).
- **What I-15B-1 provides I-15B-2 (once unblocked):** the public preset contract `@vibe-engineer/preset-nest-react-rn` exporting `getStarterLayoutDeclaration()`, `renderNestReactRnPresetFiles()`, `validateNestReactRnPresetFiles()`, `getNestReactRnPresetMetadata()`, `getNestReactRnPresetFileManifest()`, `STARTER_LAYOUT`, and the DL-16 file-kind/finding types. I-15B-2 materializes `examples/starter-reference/.source-template/**` from the preset's rendered skeletons + the locked DL-16 layout (3 apps, 6 packages, scope `@vibe-engineer-starter`, golden-records sample/demo, no-auth, PostgreSQL+Prisma, ts-rest+Zod, agenticHarness=pi).
- **I-15B-2 must** declare `@vibe-engineer/preset-nest-react-rn` as a workspace dep in its OWN template-local manifests (in-license, inside `.source-template/**`) — NOT mutate the real harness workspace graph. If I-15B-2 needs a real (non-template) resolution of the preset, it hits the same serialized-install seam → STOP BLOCKED the same way.
- **Boundary rules to enforce (I-15B-2 witness):** `packages/domain` imports no Prisma/NestJS/React/RN/api-client/UI/node:fs; `packages/ui` imports no app/api/Prisma/api-client code; `packages/contracts` owns ts-rest+Zod; `packages/api-client` derived from contracts. The boundary rules + forbiddenImports are encoded in `STARTER_PACKAGES` (src/index.ts).
