# I-20S Revalidation Artifact — adversarial REVALIDATE (Triad-B finisher/impl result)

- **Revalidator:** independent adversarial (model: glm-5.2 via zai, thinking: xhigh). Zero out-of-license edits (only this artifact + `revalidation-evidence/**` touched; no git/package-manager mutation ops).
- **Target under revalidation:** `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-20S-ci-pulumi-dependency-root-handoff/I-20S-implementation-report.md` (impl reported `DONE`).
- **Repo:** `/Users/lizavasilyeva/work/vibe-engineer`. Node v24.16.0, pnpm 10.33.0.
- **Owned WRITE paths:** this artifact + `.vibe/work/I-20S-ci-pulumi-dependency-root-handoff/revalidation-evidence/**`.
- **Read-only:** both repos. **Untouchable:** all product source, the impl report, prior evidence trees, prompts/briefs/ledger/status/handoff, `.git/**`. No git/package-manager mutation ops; only read-only witnesses (`node` import probes, `git diff/status`, `pnpm -r list`/`turbo --dry-run` introspection, grep).

---

## VERDICT: **PASS** — I-20S is truth-green → unblocks I-20A.

Every load-bearing claim in the impl report was independently re-run and confirmed against on-disk reality. Scripts-only root manifest (the round-1 fix point) HOLDS; the workspace-importer Pulumi dependency model is PROVEN REAL (real ESM resolution + hoist-negative); the lockfile reconciliation is scoped; negatives are clean; no placeholder runner, no I-20A/I-20B/I-20C leakage; dirty-tree scope clean; no sibling breakage. One non-blocking minor-local (honestly-documented vitest peer-annotation re-render) does not weaken any witness.

---

## Target / ground-truth read

- Impl report (treated unverified until confirmed): all material claims confirmed below.
- Validated brief `I-20S-brief-generated.md` §4 owned WRITE paths (root package.json **scripts-only** + turbo task graph + pnpm-lock + `infra/pulumi/package.json`; pnpm-workspace only-if-necessary): respected exactly.
- Brief validation PASS artifact: scripts-only ownership confirmed; no over-reach remains.
- Strategy amendment §4/§5: exactly-one Pulumi dep-model decision — **Model 1 (workspace importer)** chosen and proven; no hybrid.

---

## Findings (numbered; severity + exact evidence)

### F1 — `clean` (critical-check #1) — Scripts-only root package.json — the round-1 fix point HOLDS
- **Witness:** `git diff -- package.json` (cwd repo root). `revalidation-evidence/01-root-package-json-diff.txt`.
- **Exact diff:** exactly ONE added line, inside the `scripts` block: `+    "quality": "node scripts/quality/run-quality.mjs",` (between `test` and `workspace:graph`).
- **Evidence:** NO dependency additions/removals, NO `exports`, NO `engines`/`packageManager`/`overrides`/other-field changes. The hunk is `@@ -13,6 +13,7 @@` (1-for-1 insertion in scripts). The NEEDS-FIX over-reach the round-1 fix was meant to prevent is **absent**.
- **Verdict:** PASS — scripts-only confirmed.

### F2 — `clean` (critical-check #2) — Workspace-importer Pulumi dep-model PROVEN REAL (no hoist)
- **W-RESOLVE-PULUMI** (`revalidation-evidence/04-w-resolve-pulumi.txt`): real ESM `require.resolve('@pulumi/pulumi')` from `infra/pulumi/` context → `RESOLVE_OK resolved_path=…/node_modules/.pnpm/@pulumi+pulumi@3.248.0_typescript@5.9.3/node_modules/@pulumi/pulumi/index.js`; `Config` export present (`typeof Config === 'function'`); **EXIT=0**. Resolves via the **workspace importer** (`infra/pulumi/node_modules/@pulumi/pulumi` → symlink into `.pnpm/…`), NOT a hoisted root dep.
- **W-NEG-UNDECLARED-HOIST** (`revalidation-evidence/05-w-neg-undeclared-hoist.txt`): same probe from root `.` context → `EXPECTED_FAIL Cannot find module '@pulumi/pulumi'`; **EXIT=0** (= expected fail). `node_modules/@pulumi/` ABSENT at root. **No hoist assumption.**
- **node_modules posture:** `infra/pulumi/node_modules/@pulumi/pulumi` → symlink to `.pnpm/@pulumi+pulumi@3.248.0_typescript@5.9.3/…`; root `node_modules/@pulumi/` ABSENT (honors `.npmrc shamefully-hoist=false`). `revalidation-evidence/03-infra-contents-and-nodemodules.txt`.
- **Verdict:** PASS — real-boundary resolution proven; no npx/hoist/latest.

### F3 — `clean` (check #3) — turbo task graph correct; no over-reach
- **Witness:** `git diff -- turbo.json` (`revalidation-evidence/02-turbo-workspace-diff.txt`). Added ONLY `quality` (`dependsOn:["^build"]`, `outputs:[]`) and `deploy` (`dependsOn:["^build"]`, `outputs:[]`) task entries — pure task-graph metadata.
- **No runner created** (check #5): I-20S wires the task graph only; `scripts/quality/**` (I-20A) untouched/absent. No deploy mutation/auto-trigger (W-NEG-DEPLOY-MUTATION-VIA-SCRIPTS clean, F7).
- **§8.10 turbo dry-runs** (`revalidation-evidence/08-tooling-witnesses.txt`): `turbo run quality --dry-run=json` **EXIT=0** (root `vibe-engineer#quality` + `@vibe-engineer/infra-pulumi#quality` in graph); `turbo run deploy --dry-run=json` **EXIT=0**. Task graph well-formed.
- **Verdict:** PASS.

### F4 — `clean` (check #4) — No I-20C/I-20A/I-20B leakage
- **Witness:** `revalidation-evidence/03-infra-contents-and-nodemodules.txt`.
- `infra/` contains **ONLY** `infra/pulumi/package.json` (find excluding node_modules → 1 file). NO `Pulumi.yaml`/`index.ts`/config/stacks (I-20C-owned, NOT pre-created).
- `scripts/quality/` **ABSENT**; `scripts/` **ABSENT** (I-20A-owned, NOT pre-created).
- `.github/workflows/` **ABSENT**; `.github/` **ABSENT** (I-20B/I-20C-owned, NOT pre-created).
- `git ls-files --others --exclude-standard -- infra` → `infra/pulumi/package.json` only.
- **Verdict:** PASS — I-20S did not pre-create any downstream lane's surface.

### F5 — `clean` (check #5) — No placeholder runner (honest handoff, fails LOUD)
- **Witness:** `pnpm run quality` dispatch (`revalidation-evidence/09-no-placeholder-runner.txt`). **EXIT=1** with `code: 'MODULE_NOT_FOUND'` / `ELIFECYCLE Command failed with exit code 1` (target `scripts/quality/run-quality.mjs` does not exist yet).
- The `quality` script entry is an honest **wiring contract** whose target lands in I-20A; it FAILS LOUD (not a stub that false-greens). Shape-green trap avoided.
- **Verdict:** PASS.

### F6 — `clean` (check #6) — Dirty-tree / scope safety
- **Witness:** `git status --porcelain` + `git diff --stat`.
- I-20S-attributable edits are **exactly**: `M package.json` (root, +1 scripts), `M turbo.json` (+8), `M pnpm-workspace.yaml` (+1, `infra/pulumi`), `M pnpm-lock.yaml` (scoped, see F7), `?? infra/` (only `infra/pulumi/package.json`), `?? .vibe/work/I-20S-*/` (this work).
- All other dirty-tree entries (`.vibe/work/I-12-*`, `I-13-*`, `I-13C-*`, `I-18-*-I-18B-*`, `I-10C-AGG-*`, `DL-18P-*`; `packages/cli/src/commands/security/*`; `packages/mechanical-gates/**`; `docs/decisions/DL-18B-*`) are **baseline / concurrent-lane** (I-12, I-13, I-13C, I-18B, I-10C-AGG, DL-18P) — content is foreign to I-20S's owned surfaces and I-20S claims none of them.
- NO `.git/**` ops (no stash/reset/clean/checkout/restore; revalidator ran none either). No package-manager install/add/update beyond the scoped Pulumi reconciliation (lockfile deltas all attributable to Pulumi + deterministic peer re-render, F9).
- **Verdict:** PASS.

### F7 — `clean` (check #7 + #8) — No sibling breakage; dependency honesty
- **Sibling/blast-radius** (`revalidation-evidence/10-sibling-blast-radius.txt`): `pnpm run workspace:graph` (=`pnpm -r list --depth -1 --json`) **EXIT=0**; all **20** workspace packages resolve — the 19 pre-existing (incl. `vibe-engineer` = the CLI package, `@vibe-engineer/{verification,mechanical-gates,security,preset-typescript,contracts,…}`) + the new `@vibe-engineer/infra-pulumi`. No green-lane breakage.
- **Exactly ONE dep-model:** Model 1 (workspace importer). NO isolated lockfile under `infra/pulumi` (find → none) → **no hybrid**. Consistent with `.npmrc` (`shared-workspace-lockfile=true`, `link-workspace-packages=true`, `shamefully-hoist=false`); **no `.npmrc` change** (untouched in dirty tree).
- **Pinned exact:** `@pulumi/pulumi: 3.248.0` (no `^`/`~`); `.npmrc save-exact=true` honored; lockfile entry `3.248.0(typescript@5.9.3)`.
- **W-NEG-NPX-LATEST** + **W-NEG-DEPLOY-MUTATION-VIA-SCRIPTS** (`revalidation-evidence/06-w-neg-npx-latest-and-deploy.txt`): both `grep_exit=1` (clean) — no `npx pulumi`, no `latest`, no floating pulumi specifier, no `pulumi up/destroy/refresh/import`/`gh deploy`/`deploy --auto`/`workflow_dispatch` in owned script/turbo entries.
- **Verdict:** PASS.

### F8 — `clean` (check #2 lockfile scope) — W-LOCKFILE-SCOPED proven
- **Witness:** `revalidation-evidence/07-lockfile-scoped.txt` (full `importers:` section diff + all removed lines).
- `importers:` section has exactly **two** hunks:
  1. **NEW** `infra/pulumi:` importer — `dependencies: '@pulumi/pulumi': { specifier: 3.248.0, version: 3.248.0(typescript@5.9.3) }`.
  2. **One** existing-importer change in `packages/contracts` (the importer preceding `packages/mechanical-gates: {}`): the `vitest` **annotation** re-render — `- version: 4.1.9(@types/node@24.13.2)(@vitest/coverage-v8@4.1.9)` / `+ version: 4.1.9(@opentelemetry/api@1.9.1)(@types/node@24.13.2)(@vitest/coverage-v8@4.1.9)`. **Specifier stays `4.1.9`** (declared dep unchanged).
- **root `.` importer UNCHANGED** (appears only as context lines; no `+`/`-` within it).
- All 5 removed lines in the entire lockfile diff are **annotation/snapshot-key re-renders** (1 importer vitest annotation + tinybench block re-render + vitest snapshot key re-render), each paired with an added line that inserts `@opentelemetry/api@1.9.1` into the peer-resolution string. No declared-dependency removal anywhere. The remaining ~1269 added lines are Pulumi + transitives (@grpc/grpc-js, @opentelemetry/*, google-protobuf, etc.) under `packages:`/`snapshots:`.
- **Verdict:** PASS — lockfile reconciliation is scoped (Pulumi importer + Pulumi transitive entries + deterministic peer re-render).

### F9 — `minor-local` (non-blocking) — vitest peer-annotation re-render in `packages/contracts` (honestly documented)
- **Evidence:** see F8 — the 5 annotation re-render lines. This is a deterministic, automatic consequence of `@pulumi/pulumi` transitively providing `@opentelemetry/api@1.9.1` into the store, which pnpm then re-renders into vitest's optional-peer-resolution annotations (vitest lists `@opentelemetry/api` as an optional peer).
- **Assessment:** NOT a declared-dependency change (specifier `4.1.9` unchanged); NOT broad importer churn (root `.` untouched; only the vitest-owning importer's annotation); NOT a manual update. The implementer documented it explicitly and honestly (Stage 5 + "Non-blocking minor-local"). It does not weaken W-LOCKFILE-SCOPED (the load-bearing claim — "no churn in unrelated *importers'* declared deps" — holds: declared specifiers are invariant). Strictly it is lockfile content outside the literal "pulumi entries", but it is the unavoidable deterministic side-effect of the Pulumi addition, not over-reach.
- **Severity:** minor-local. Does NOT block I-20S or dependents.

---

## Explicit statements (per task deliverable)

- **(a) Scripts-only root package.json:** ✅ YES — the only diff is one `quality` script entry; no deps/exports/other-field edits. Round-1 fix point intact.
- **(b) Workspace-importer Pulumi model proven real:** ✅ YES — W-RESOLVE-PULUMI resolves real from `infra/pulumi/` via the workspace importer (`.pnpm/@pulumi+pulumi@3.248.0_typescript@5.9.3/`); W-NEG-UNDECLARED-HOIST fails-as-expected from root (no hoist assumption); root `node_modules/@pulumi` absent.
- **(c) No I-20C/I-20A leakage:** ✅ YES — `infra/` holds only `infra/pulumi/package.json` (no Pulumi.yaml/index.ts/config); `scripts/quality/**` and `.github/workflows/**` both ABSENT.
- **(d) No placeholder runner:** ✅ YES — `pnpm quality` FAILS LOUD (`MODULE_NOT_FOUND`, exit 1); the entry is an honest I-20A handoff, not a stub.
- **(e) Dirty-tree scope clean:** ✅ YES — I-20S edits are exactly the owned paths (package.json scripts, turbo.json, pnpm-workspace.yaml, pnpm-lock.yaml, infra/pulumi/package.json, .vibe/work/I-20S-*/); all other entries are baseline/concurrent-lane; no git ops.
- **(f) No sibling breakage:** ✅ YES — all 20 workspace packages resolve; `workspace:graph` + turbo dry-runs exit 0.

## Severity gate assessment (brief §10 / amendment §6)
**No critical. No major-local.** One non-blocking **minor-local** (F9, honestly documented). W-RESOLVE-PULUMI + W-LOCKFILE-SCOPED + W-SCRIPT-ENTRIES + W-DECLARED-LOCKED are **real-green**; all W-NEG-* clean; no required I-20S real seam is pending (live Pulumi CLI preview/deploy = I-20D `pending-live`; aggregate quality spawn = I-20A handoff — both correctly out of I-20S scope and honestly deferred). **I-20S is truth-green → unblocks I-20A.**

## Exact next action
**Launch I-20A** (`local-quality-runner-and-wiring-integrity`). I-20A consumes (read-only) the root `quality` script entry (`node scripts/quality/run-quality.mjs`), the turbo `quality`/`deploy` task graph, the lockfile baseline, and `@vibe-engineer/infra-pulumi` workspace package; lands the real aggregate runner at `scripts/quality/run-quality.mjs` introducing **no new external dep** (workspace `@vibe-engineer/*` consumption only → no lockfile churn). I-20C fills `infra/pulumi/**` source via serialized handoff against this package-manifest/lockfile baseline. I-20B/I-20D remain gated downstream. The F9 annotation re-render needs no action (deterministic, honest, non-blocking).

---

*Revalidator final response (terse) below; this artifact is the binding deliverable. Evidence tree: `.vibe/work/I-20S-ci-pulumi-dependency-root-handoff/revalidation-evidence/` (01–10).*
