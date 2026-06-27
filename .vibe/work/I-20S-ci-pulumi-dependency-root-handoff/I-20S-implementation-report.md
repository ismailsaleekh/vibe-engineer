# I-20S Implementation Report — ci-pulumi-dependency-root-handoff

- **Lane:** I-20S-ci-pulumi-dependency-root-handoff (Triad-B IMPLEMENTER)
- **Model:** glm-5.2 via zai (thinking: high)
- **Working dir:** `/Users/lizavasilyeva/work/vibe-engineer`
- **Brief:** `.pi/hlo/vibe-engineer/implementation-briefs/I-20S-brief-generated.md` (validation PASS)
- **Status:** DONE (all required real-boundary witnesses green; negatives clean; honest handoffs recorded)

---

## Stage 0 — Report created (this artifact). NEXT: gate-check.

## Stage 1 — Launch gate check (§3) — PASS

Read ledger tail. All 8 pre-I-20 gates truth-green at implementation time:
- `DL-18P` — TRUTH-GREEN (revalidation `b2aaaf3b7` PASS; "DL-18P-TRUTH-GREEN-PRE-I20S-GATE-SATISFIED").
- `I-09-SPLIT-COMPLETE` — I-09 truth-green (long-green per ledger truth list).
- `I-10C-AGG` — TRUTH-GREEN (post-finisher revalidation `b15b02f36` PASS; "I-10C-TRUTH-GREEN-I-20S-IMPLEMENT-UNLOCKED-LAUNCHED").
- `I-07D` — green (TypeScript preset; prerequisite of green I-07B which depends on I-07A/C/D).
- `I-11` — truth-green (long-green).
- `I-12` — truth-green (I-12A/B/C all PASS).
- `I-13` (lane-scope) — truth-green (I-13 P2 scope PASS; I-13C TRUTH-GREEN Fork-B bridge).
- `I-18` (incl. I-18B) — TRUTH-GREEN (I-18B post-finisher revalidation `b7536c923` PASS; parent I-18 fully green).

HLO launched this implementer after explicitly declaring both remaining pre-gates (DL-18P + I-10C-AGG) satisfied. Gate HOLDS. No edits blocked.

## Stage 2 — Baseline snapshot (before) — captured

- Root `package.json` scripts = `build/typecheck/test/workspace:graph/workspace:surface`; **no `quality` script** (greenfield). devDeps = eslint/prettier/turbo/typescript/typescript-eslint. `packageManager pnpm@10.33.0`, engines node>=20.19.0/pnpm>=10.33.0.
- `turbo.json` tasks = `build/typecheck/test` only; **no quality/deploy tasks** (greenfield).
- `.npmrc` = `save-exact=true`, `shamefully-hoist=false`, `link-workspace-packages=true`, `shared-workspace-lockfile=true`, `auto-install-peers=false`, `strict-peer-dependencies=true`, `engine-strict=true`, `ignore-scripts=true`.
- `pnpm-workspace.yaml` globs = `packages/*`, `packages/presets/*`, `packages/adapters/*` (no `infra/*`).
- `pnpm-lock.yaml` importers = `.` only; `@pulumi` count = **0** before.
- `infra/`, `infra/pulumi/`, `.github/workflows/`, `scripts/quality`, `scripts/ci` all **ABSENT** (greenfield).
- Owned root paths (`package.json`, `turbo.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`) clean in dirty tree (not modified). The single `package.json` dirty-tree match is a fixture under `packages/mechanical-gates/fixtures/...`, NOT root.
- Node v24.16.0, pnpm 10.33.0.
- Network/registry reachable: `pnpm view @pulumi/pulumi version` → `3.248.0`.

## Stage 3 — Dependency-model decision (§5) — DECIDED: Model 1 (Workspace importer)

**Choice:** Model 1 — `infra/pulumi` becomes a pnpm workspace package covered by the single shared root `pnpm-lock.yaml`.

**Rationale / on-disk consistency argument:**
- `.npmrc shared-workspace-lockfile=true` mandates a SINGLE shared lockfile for the whole workspace. Model 2 (isolated `infra/pulumi/pnpm-lock.yaml`) would diverge from this locked posture and require justifying a split-lockfile, which is inconsistent with the on-disk repo posture.
- `.npmrc link-workspace-packages=true` + the existing workspace glob posture (monorepo of `packages/*`) — extending to include `infra/pulumi` is the consistent, minimal extension.
- `.npmrc shamefully-hoist=false` is honored: Pulumi deps resolve from the declared `infra/pulumi` package context (its own `node_modules` via the workspace graph), NOT from a hoisted root `node_modules`. Proven by W-NEG-UNDECLARED-HOIST (resolution from a non-declaring context MUST fail).
- No `.npmrc` change required (Model 1 is consistent as-is) → no serialized-handoff ruling needed.

**Realization:** extend `pnpm-workspace.yaml` to include `infra/pulumi`; declare pinned Pulumi deps in `infra/pulumi/package.json`; reconcile via scoped `pnpm install`.

## Stage 4 — Realization (manifest + workspace) — DONE

- Created `infra/pulumi/package.json` (name `@vibe-engineer/infra-pulumi`, private, type module, engines node>=20.19.0, dep `@pulumi/pulumi: 3.248.0` exact). Pinned version confirmed via `pnpm view @pulumi/pulumi version` → `3.248.0`; `.npmrc save-exact=true` honored (no `^`/`~`).
- Extended `pnpm-workspace.yaml` with `- 'infra/pulumi'` (minimal literal, evidence-backed; Model 1 requires it).
- No `.npmrc` change required (Model 1 consistent as-is) → no serialized-handoff ruling.

## Stage 5 — Lockfile reconciliation — DONE

- `pnpm install` (scoped, wrapper-licensed) → exit 0; 186 packages added (Pulumi + transitives), Done in 5.6s. Full log: `evidence/01-pnpm-install.log`.
- Resulting node_modules posture (honors `shamefully-hoist=false`):
  - `infra/pulumi/node_modules/@pulumi/pulumi` → symlink to `node_modules/.pnpm/@pulumi+pulumi@3.248.0_typescript@5.9.3/node_modules/@pulumi/pulumi` (declared+locked, resolves from package context).
  - root `node_modules/@pulumi/` → **ABSENT** (no hoist).
- Lockfile importer diff (W-LOCKFILE-SCOPED, full diff at `evidence/02-lockfile-full.diff`):
  - NEW `infra/pulumi` importer: `@pulumi/pulumi` specifier `3.248.0` → version `3.248.0(typescript@5.9.3)`. ✓
  - Root `.` importer: declared devDeps specifiers/versions **unchanged**. ✓
  - One incidental non-Pulumi line in `packages/contracts` importer: `vitest` peer-resolution **annotation** changed from `4.1.9(@types/node@24.13.2)(@vitest/coverage-v8@4.1.9)` → `4.1.9(@opentelemetry/api@1.1.1)(@types/node@24.13.2)(@vitest/coverage-v8@4.1.9)`. The **specifier** remains `4.1.9` (declared dep unchanged) — pnpm re-annotated the optional-peer set because `@pulumi/pulumi` transitively provides `@opentelemetry/api@1.9.1` into the store. This is an automatic, deterministic consequence of adding the Pulumi dep, NOT a manual/broad update and NOT a declared-dependency change to any unrelated importer. Recorded honestly.
  - Remaining ~1640 insertions = new `packages:` + `snapshots:` entries for Pulumi + transitives (@grpc/grpc-js, @opentelemetry/api, google-protobuf, etc.) — all scoped to the Pulumi dep.

## Stage 6 — Root script + turbo wiring — DONE

- Root `package.json`: added ONLY `"quality": "node scripts/quality/run-quality.mjs"` (scripts-only field; no other manifest field touched). This is the **wiring contract** — the runner target `scripts/quality/run-quality.mjs` lands in I-20A; **NO placeholder/fake runner created** (shape-green trap avoided).
- `turbo.json`: added `quality` task (`dependsOn: ["^build"]`, `outputs: []`) + `deploy` task (`dependsOn: ["^build"]`, `outputs: []`). Pure task-graph metadata; no deploy mutation/auto-trigger (W-NEG-DEPLOY-MUTATION-VIA-SCRIPTS clean).
- Strictly-required root script = `quality` only; no root `deploy` script (deploy is manual/protected `workflow_dispatch`, I-20C-owned per locked-decisions §10).

## Stage 7 — Witnesses — ALL GREEN

| Witness | Result | Evidence |
|---|---|---|
| W-RESOLVE-PULUMI (positive, from `infra/pulumi/`) | PASS exit 0; resolved=`node_modules/.pnpm/@pulumi+pulumi@3.248.0_typescript@5.9.3/node_modules/@pulumi/pulumi/index.js`; `Config` export present | ESM `import('@pulumi/pulumi')` via `createRequire` |
| W-LOCKFILE-SCOPED (before/after importer diff) | PASS — only new `infra/pulumi` importer + scoped Pulumi entries; root `.` unchanged; one incidental vitest peer-annotation (specifier unchanged) | `evidence/02-lockfile-full.diff` |
| W-SCRIPT-ENTRIES (root script + turbo graph) | PASS — root `quality` script wired; `quality`+`deploy` turbo tasks present; `pnpm quality` dispatch reaches the entry (invokes `node scripts/quality/run-quality.mjs`); runner target is honest I-20A handoff | — |
| W-DECLARED-LOCKED | PASS — `@pulumi/pulumi: 3.248.0` exact (no `^`/`~`); locked entry present | — |
| W-NEG-NPX-LATEST | CLEAN — grep `npx pulumi|pulumi.*latest|"@pulumi/[^"]*":[~^]` exit 1 (no matches) | — |
| W-NEG-UNDECLARED-HOIST (from root `.`) | PASS — `import('@pulumi/pulumi')` → `Cannot find package '@pulumi/pulumi'` (exit 0 = expected fail); root `node_modules/@pulumi` absent | — |
| W-NEG-UNRELATED-CHURN | CLEAN — `package.json` +1 (scripts), `turbo.json` +8 (tasks), `pnpm-workspace.yaml` +1 (infra/pulumi), `pnpm-lock.yaml` scoped; no `.npmrc`/`tsconfig.base`/workflow/runner/source churn | — |
| W-NEG-NO-WORKFLOW-NO-RUNNER | CLEAN — `.github/workflows` + `scripts/quality` both ABSENT (I-20S created neither) | — |
| W-NEG-DEPLOY-MUTATION-VIA-SCRIPTS | CLEAN — grep `pulumi (up|destroy|refresh|import)|gh deploy|deploy.*--auto|workflow_dispatch` exit 1 | — |
| §8.10 `pnpm run workspace:graph` | PASS exit 0 (workspace graph validates with new importer) | — |
| §8.10 `turbo run quality --dry-run=json` | PASS exit 0 (well-formed; new task graph valid) | — |

## Stage 8 — Dirty-tree scope sweep — CLEAN

I-20S edits (exactly):
- `M package.json` (root; +1 line, scripts-only)
- `M turbo.json` (+8 lines, quality/deploy tasks)
- `M pnpm-workspace.yaml` (+1 line, `infra/pulumi`)
- `M pnpm-lock.yaml` (scoped Pulumi reconciliation)
- `?? infra/` (contains ONLY `infra/pulumi/package.json`; `infra/pulumi/node_modules` gitignored; NO Pulumi.yaml/index.ts/config — I-20C-owned source not created)
- `?? .vibe/work/I-20S-ci-pulumi-dependency-root-handoff/` (this report + evidence)

FORBIDDEN-PATHSET EMPTY: no `.github/**`, `scripts/quality/**`, `scripts/ci/**`, `.npmrc`, `tsconfig.base.json`, any `packages/**` source, or any other lane's surface touched. Pre-existing dirty-tree entries from other lanes are baseline (untouched by I-20S). No git stash/reset/clean/checkout/restore; no commit/push.

## Files changed (exact)
- `package.json` (root) — +`quality` script entry.
- `turbo.json` — +`quality` and `deploy` task graph entries.
- `pnpm-workspace.yaml` — +`infra/pulumi` glob member.
- `pnpm-lock.yaml` — scoped Pulumi reconciliation (new `infra/pulumi` importer + Pulumi transitive entries; one incidental vitest peer-annotation).
- `infra/pulumi/package.json` — NEW (Pulumi package manifest, exact-pinned dep).
- `.vibe/work/I-20S-ci-pulumi-dependency-root-handoff/**` — report + evidence.

## Severity classification
**clean.** W-RESOLVE-PULUMI + W-LOCKFILE-SCOPED + W-SCRIPT-ENTRIES + W-DECLARED-LOCKED are real-green; all W-NEG-* clean; no required I-20S real seam pending. The dep-model + lockfile + resolution proof is fully proven-real in this lane (I-20S's truth-green).

## Deferred debts / handoffs (honest — NOT I-20S truth-green, per §7.3)
- **Quality runner spawn end-to-end** (`pnpm quality` actually running the aggregate runner + emitting evidence/summary) → **I-20A** witness. I-20S wires the `quality` script entry (`scripts/quality/run-quality.mjs` contract path) + turbo `quality` task; the runner target does not exist yet (no placeholder created).
- **Live Pulumi CLI preview/deploy** (Pulumi Cloud backend) → **I-20D** `pending-live/BLOCKED`. I-20S proves dependency resolution only.
- **Actual GitHub Actions run** → **I-20B/I-20D** witness. I-20S does not create workflow files.
- **Pulumi scaffold source** (`infra/pulumi/index.ts`, `Pulumi.yaml`, stacks, config) + any additional Pulumi provider deps → **I-20C** serialized handoff (package manifest/lockfile baseline is I-20S's handoff; any I-20C dep addition requires serialized handoff back to the I-20S surface).
- **`deploy` turbo task backing script** → **I-20C** wires the `infra/pulumi` deploy script; I-20S added only the forward task-graph metadata.
- **Non-blocking minor-local (recorded, does not block):** the vitest peer-annotation change in `packages/contracts` is an incidental deterministic side-effect of the Pulumi transitive (`@opentelemetry/api`); declared specifier unchanged. Validator may independently confirm.

## Status
**DONE.** Model 1 (workspace importer) realized + proven; all required real-boundary witnesses green; all negatives clean; dirty-tree scope clean; honest handoffs recorded.
