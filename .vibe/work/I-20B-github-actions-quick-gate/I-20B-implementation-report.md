# I-20B Implementation Report (Triad-B IMPLEMENTER)

- **Lane:** `I-20B-github-actions-quick-gate`
- **Role:** Triad-B IMPLEMENTER (glm-5.2 via zai, thinking: high)
- **Brief:** `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-20B-brief-generated.md` (validation PASS, 2 minor-local non-blocking notes D1/D2 applied as guidance: locked `js-yaml` only — no hand-rolled parser; SHA-pinning default given greenfield `.github/`)
- **Working dir:** `/Users/lizavasilyeva/work/vibe-engineer`
- **Quality bar:** binding (PERFECT SOLUTION only; dirty-tree baseline; implementer does not self-validate).

## STATUS: DONE (all 4 in-license witnesses green; hosted-run deferred to I-20D pending-live)

The prior BLOCKED (§9 STOP #3, js-yaml unresolvable) is **RESOLVED**: the validated EXTEND-I-20S ruling was executed — Step-1 finisher `b214986b8` DONE + revalidation `b3f0e9fb1` PASS. `js-yaml@4.2.0` is now a root `devDependencies` entry and resolves from `scripts/ci/github-quality/` (re-witnessed: `import('js-yaml').load` is a function). Resumed and completed the full brief: the static workflow validator (`scripts/ci/github-quality/**`) + 11-fixture negative suite are built with the locked `js-yaml` parser (real typed boundary, no heuristic), and **W-QG-POS + W-QG-NEG (all 11) + W-QG-BUDGET + W-QG-PARITY-CAVEAT** all pass with real evidence. The authored `.github/workflows/quality.yml` is unchanged and re-confirmed in-license. Hosted GitHub Actions run remains I-20D `pending-live` (per brief — I-20B does NOT claim hosted-run truth-green).

## 1. Precondition gate (§9 STOP #1) — PASS

DAG gate `I-20A PASS` is independently truth-green (ledger: `2026-06-26 — I-20A-TRUTH-GREEN`). On-disk I-20A surface consumed via public contract only:
- `scripts/quality/run-quality.mjs` (aggregate runner) ✓; root `package.json` `quality` script = `node scripts/quality/run-quality.mjs` ✓; `turbo.json` quality task ✓.
- `scripts/quality/quality-wiring.config.json` (`parityBlockingCommand`, ci profile) + `scripts/quality/expected-families.manifest.json` (`expectedFamilies: [p0,p1,p2]`) ✓.
- `scripts/ci/quality/wiring-integrity-gate.mjs` (fail-closed wiring gate) ✓.

## 2. I-20A invocation contract captured (Stage 2)

- **parityBlockingCommand** (`quality-wiring.config.json`): `pnpm quality -- --profile=ci --evidence-dir <dir> --summary-out <summary-json>`.
- **Flag contract** (`run-quality.mjs` `parseArgs`): `--profile=ci` exactly; `--evidence-dir=` + `--summary-out=` required; unknown → fail-closed.
- **ci profile composition**: `["p0.aggregate","p1.aggregate","p2.aggregate","fail-closed-wiring-integrity"]`, `excludes: { fullE2E:true, fullMobileE2E:true, fullVisualUi:true }` → structurally fast.
- **quality.yml blocking step** (byte-parity WITNESSED below): `pnpm quality -- --profile=ci --evidence-dir .vibe/ci-evidence --summary-out .vibe/ci-evidence/quality-summary.json`.

## 3. `.github/workflows/quality.yml` — AUTHORED (in-license, faithful, POSITIVE witness now green) ✓

Unchanged from prior pass; re-confirmed. Structure: `push` (main/master) + `pull_request` (NO `paths:` filter → no governed path can be skipped); `permissions: { contents: read }`; `concurrency` cancel-in-progress; single blocking job `quality` (`ubuntu-latest`, `timeout-minutes: 10`); SHA-pinned actions (checkout/setup-node/cache/upload-artifact, 40-hex SHAs); `corepack enable` (reads `packageManager: pnpm@10.33.0`); `pnpm install --frozen-lockfile`; blocking step = verbatim aggregate; `upload-artifact` with `if: always()`. No `pull_request_target`, no deploy/infra-mutation, no full E2E/mobile/visual, no smoke job.

## 4. `release-candidate.yml` decision — OMITTED (Stage 4)

Default per brief: not created. The quick-gate hosts the full ci-profile aggregate within the `<10min` budget; no validated reason forces a separate workflow.

## 5. §3.4 fail-closed / CI-parity caveat (W-QG-PARITY-CAVEAT) — RESOLVED option (ii)

Blocking step invokes the I-20A aggregate, whose fail-closed wiring gate requires expected ⊆ registered-and-running for {p0,p1,p2}. **I-13C is truth-green** (ledger) and `expected-families.manifest.json` confirms all three tiers registered-and-running → gate PASSES on the complete aggregate; live-blocking in CI (never weakened, never advisory). Encoded as a documented comment in `quality.yml`.

## 6. Static workflow validator — BUILT (`scripts/ci/github-quality/**`) ✓

Real typed YAML boundary via locked `js-yaml@4.2.0` (no hand-rolled/regex parser — quality bar). Layout:
- `lib/yaml.mjs` — `readWorkflow()` (typed `ParseError`); `lib/rules.mjs` — 11 rule functions + `RULES`/`runAllRules`.
- `validate-workflow.mjs` — CLI (`--workflow <path>` and `--workflow=<path>` forms; exit 0 clean / 1 violations; one diagnostic per finding, each tagged with a stable CODE).
- `run-fixtures.mjs` — suite runner: asserts each fixture's `# expect: <CODE>` header is fired (non-zero exit + the expected code present in diagnostics) for negatives; exit 0 for positives.
- `fixtures/pos-quality.yml` (self-test) + `fixtures/neg-01..neg-11-*.yml` (11 single-rule negatives).

Rule codes map 1:1 to the brief's 11 negatives: `AGG-MISSING, AGG-PARTIAL, PERMS-BROAD, PATHS-UNSAFE, UPLOAD-MISSING, FULL-SUITE, SMOKE-UNBARRED, ACTION-UNPINNED, DEPLOY-MUTATION, SECRET-EXPOSURE, BUDGET-VIOLATION` (plus an additional positive-contract `PULL_REQUEST_TARGET` rule). The validator parses the REAL workflow(s) (not mocks) and rejects real malformed YAML with named-rule diagnostics — real parser-boundary witnesses.

## 7. Witnesses — ALL GREEN (real evidence)

| Witness | Status | Evidence |
|---|---|---|
| **W-QG-POS** (validator on REAL quality.yml) | **PASS** exit 0 | `node scripts/ci/github-quality/validate-workflow.mjs --workflow .github/workflows/quality.yml` → `OK workflow ... satisfies the I-20B quick-gate contract (0 findings; rules: ruleAggregate…rulePullRequestTarget)` exit 0. |
| **W-QG-NEG** (11 negatives, real malformed YAML rejected) | **PASS** all 11 exit 1 + expected code | `node scripts/ci/github-quality/run-fixtures.mjs` → `12/12 fixtures matched expectation (11 negative, 1 positive)` exit 0. Per-fixture: each expected code fired (AGG-MISSING, AGG-PARTIAL, PERMS-BROAD, PATHS-UNSAFE, UPLOAD-MISSING, FULL-SUITE, SMOKE-UNBARRED, ACTION-UNPINNED, DEPLOY-MUTATION, SECRET-EXPOSURE, BUDGET-VIOLATION). |
| **W-QG-BUDGET** (`<10min`) | **structural PASS + hosted deferred I-20D** | ci profile excludes full E2E/mobile/visual; `timeout-minutes: 10` hard cap; pnpm-store cache; concurrency-cancel. Hosted-run budget proof is I-20D `pending-live` (per brief — not claimed here). |
| **W-QG-PARITY-CAVEAT** (§3.4) | **PASS option (ii)** | I-13C truth-green; {p0,p1,p2} registered; gate passes; live-blocking never weakened. |
| Blocking-step byte-parity (mechanical §7) | **WITNESSED** | matches I-20A parityBlockingCommand shape: `pnpm quality -- --profile=ci --evidence-dir .vibe/ci-evidence --summary-out .vibe/ci-evidence/quality-summary.json`. |
| Precondition I-20A green | **WITNESSED** | §1 above. |
| Resume precondition (js-yaml resolves) | **WITNESSED** | `import('js-yaml').load` is a function from the owned path. |

### Per-fixture diagnostic evidence (target code fires; full diagnostics captured during run)

- neg-01 → `[AGG-MISSING] (critical) no aggregate ... invocation found` ✓
- neg-02 → `[AGG-PARTIAL] (critical) blocking truth is a PARTIAL command ... "pnpm test"` ✓
- neg-03 → `[PERMS-BROAD] (critical) ... grants \`contents: write\`` ✓
- neg-04 → `[PATHS-UNSAFE] (critical) ... paths include filter does not cover all governed paths` ✓
- neg-05 → `[UPLOAD-MISSING] (major-local) no actions/upload-artifact@<sha> step found` ✓
- neg-06 → `[FULL-SUITE] (critical) ... full-E2E (playwright) step as default CI ... "npx playwright test"` ✓
- neg-07 → `[SMOKE-UNBARRED] (major-local) job 'e2e' runs a smoke-scoped command ... but is not labeled smoke` ✓
- neg-08 → `[ACTION-UNPINNED] (critical) ... floating/mutable action ref \`actions/checkout@v4\`` ✓
- neg-09 → `[DEPLOY-MUTATION] (critical) ... pulumi ... in a PR/push quality workflow` ✓
- neg-10 → `[SECRET-EXPOSURE] (critical) ... interpolates a ${{ secrets.* }} into a run: shell script` ✓
- neg-11 → `[BUDGET-VIOLATION] (critical) ... timeout-minutes: 45 structurally cannot meet <10min` ✓

**Note (non-blocking, by-design):** neg-06 and neg-07 additionally surface a legitimately-related `[ACTION-UNPINNED]` finding because their `npx playwright test` step is a bare-`npx` dynamic install — a genuinely separate violation (correct fail-closed behavior), not a fixture defect. Each fixture's target code still fires crisply.

## 8. Dirty-tree scope — CLEAN (owned-only writes)

Path-scoped inventory (`git status --porcelain`), I-20B-owned entries (all untracked-new = greenfield):
- `?? .github/workflows/quality.yml` — **I-20B-owned** ✓
- `?? scripts/ci/github-quality/**` (16 files: validate-workflow.mjs, run-fixtures.mjs, lib/yaml.mjs, lib/rules.mjs, 12 fixtures) — **I-20B-owned** ✓
- `?? .vibe/work/I-20B-github-actions-quick-gate/` — **I-20B-owned** (this report) ✓

**Zero tracked modifications by I-20B.** The ` M package.json`, ` M pnpm-lock.yaml`, ` M turbo.json`, ` M pnpm-workspace.yaml`, ` M packages/**`, etc. in the dirty tree are the **pre-existing multi-orchestrator baseline** from other lanes (I-20S js-yaml Step-1, I-13C, I-20A, …) — NOT touched by this implementer. I-20B used only `read`/`write` to owned paths + read-only bash (`node` evals, `git status`, `find`). No `release-candidate.yml` created.

**Shared serialized surface `.github/workflows/**` — DISJOINT, no conflict:** post-I-20B contains `quality.yml` (I-20B-owned), `deploy.yml` + `infra-preview.yml` (I-20C-owned, concurrent, untouched). Filenames disjoint. No ownership overlap.

## 9. Files changed (exact, owned-only)

- `.github/workflows/quality.yml` — quick-gate workflow (kept from prior pass; in-license).
- `scripts/ci/github-quality/validate-workflow.mjs` — validator CLI.
- `scripts/ci/github-quality/run-fixtures.mjs` — negative-suite runner.
- `scripts/ci/github-quality/lib/yaml.mjs` — typed YAML parse boundary (locked `js-yaml`).
- `scripts/ci/github-quality/lib/rules.mjs` — 11 positive-contract/negative-suite rules.
- `scripts/ci/github-quality/fixtures/pos-quality.yml` — positive self-test.
- `scripts/ci/github-quality/fixtures/neg-01..neg-11-*.yml` — 11 single-rule negatives.
- `.vibe/work/I-20B-github-actions-quick-gate/I-20B-implementation-report.md` — this report.

No edits to `release-candidate.yml` (omitted), no edits to any read-only/untouchable path (I-20A `scripts/quality/**`/`scripts/ci/quality/**`, I-20S root/lockfile/turbo/workspace, I-20C `deploy.yml`/`infra-preview.yml`/`infra/pulumi/**`/`docs/**`, prompts/ledger/briefs). No git/PM ops.

## 10. Deferred debts / next step

- **Pending-live (owned by I-20D, not I-20B):** hosted GitHub Actions run (budget proof + green-on-host). I-20B does NOT claim hosted-run truth-green.
- Lane is ready for independent revalidation (Triad-A VALIDATOR): inspect actual changed files + run `node scripts/ci/github-quality/validate-workflow.mjs --workflow .github/workflows/quality.yml` and `node scripts/ci/github-quality/run-fixtures.mjs` independently.

## Status: DONE — all 4 in-license witnesses (W-QG-POS / W-QG-NEG all 11 / W-QG-BUDGET / W-QG-PARITY-CAVEAT) green with real evidence; hosted run deferred to I-20D pending-live.
