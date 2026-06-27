# I-20B Revalidation Artifact (Independent adversarial REVALIDATOR)

- **Target under revalidation:** I-20B GitHub Actions quick-gate (`<10min` default PR/push blocking CI).
- **Impl report (claims DONE):** `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-20B-github-actions-quick-gate/I-20B-implementation-report.md`
- **Role:** Independent adversarial REVALIDATOR (glm-5.2 via zai, thinking: xhigh).
- **Quality bar:** binding (prepended verbatim). Shape-green ≠ truth-green. Implementer `DONE` is never validator `PASS`.
- **Owned WRITE:** this artifact + `revalidation-evidence/**`.
- **Read-only / untouchable:** both repos (read-only witnesses; no product edits); impl report; prior evidence trees; all prompts/briefs/ledger/status/handoff; `.git/**`.

## VERDICT: **PASS** (truth-green)

The I-20B quick-gate is truth-green. I independently re-ran both load-bearing witnesses against the REAL on-disk artifacts (W-QG-POS exit 0 on the real `quality.yml`; W-QG-NEG 12/12 fixtures fail-closed with the expected rule code), confirmed the `<10min` budget is structurally truthful (no silent slow jobs), confirmed no auto-deploy / no full-E2E in default CI, confirmed SHA-pinning + least-privilege + local/CI parity, confirmed the validator is a real structural parser (js-yaml, fail-closed on malformed YAML), confirmed js-yaml resolves from the declared root devDep, confirmed the hosted run is honestly `pending-live` (NOT faked), and confirmed dirty-tree scope is clean and file-disjoint. Zero critical or major-local findings. The hosted GitHub-Actions live run remains correctly deferred to I-20D (`pending-live`) — I-20B does not claim hosted-run truth-green, which is the correct, honest posture.

---

## 0. Ground-truth read (independently)

Impl report (treated as unverified until confirmed); `I-20B-brief-generated.md` (validated brief: owned paths, W-QG-POS/NEG-all-11/BUDGET/PARITY-CAVEAT, STOP boundary, §3.4 caveat); `I-20B-brief-validation-artifact.md` (brief PASS, 2 minor-local notes D1/D2 applied as guidance); `locked-decisions.md` §10; `verification-layer.md` §5.15; `mechanical-verification-gates.md` §7; `ledger-compact.md` (I-13C truth-green, I-20A truth-green, I-20B js-yaml Step-1 truth-green `b3f0e9fb1` PASS, I-20B resume `bed7c28c6` DONE). On-disk: `.github/workflows/quality.yml` + `scripts/ci/github-quality/**` (16 files).

## 1. Numbered findings (severity + exact evidence)

> Severity scale per amendment §6: critical / major-local / minor-local / clean. I found ZERO critical and ZERO major-local. Three non-blocking minor-local observations recorded below.

### F1 — minor-local — budget is structurally justified but live wall-clock unproven (by-design, deferred to I-20D)
- **Evidence:** `quality.yml` job `quality` sets `timeout-minutes: 10` (hard cap), the ci profile (`scripts/quality/quality-wiring.config.json` lines 23-26) `excludes: { fullE2E: true, fullMobileE2E: true, fullVisualUi: true }`, `concurrency.cancel-in-progress: true`, pnpm-store cache (`actions/cache@0057852…`). No full-E2E/mobile/visual/smoke job. The brief (§6 W-QG-BUDGET) explicitly forbids claiming `<10min` proven from a local dry-run (shape-only) and defers hosted-run budget proof to I-20D `pending-live` — the implementer obeyed this; the report states "Hosted-run budget proof is I-20D pending-live (per brief — not claimed here)."
- **Non-blocking because:** the brief defines `<10min` as structural-justified + deferred-live, not local-dry-run-proven. This is exactly the sanctioned handling. The STOP-for-reclassification rule (§10) never triggers because no slow job was added. **No action.**

### F2 — minor-local — neg-06/neg-07 fire their target code AND a legitimately-related ACTION-UNPINNED (honest caveat, not a fixture defect)
- **Evidence:** my own run of the validator on `neg-06-full-suite.yml` → `FAIL [FULL-SUITE] (critical) ... "npx playwright test"` **plus** `FAIL [ACTION-UNPINNED] (critical) ... "npx"` (exit 1, 2 findings). On `neg-07-smoke-unbarred.yml` → `FAIL [SMOKE-UNBARRED] (major-local) ... "npx playwright test --grep @smoke"` **plus** `FAIL [ACTION-UNPINNED] (critical) ... "npx"` (exit 1). The fixture runner asserts (non-zero exit AND expected code present), so both PASS. The extra ACTION-UNPINNED is a genuinely-separate real violation (bare `npx` = dynamic tool install, correctly flagged by `DYNAMIC_INSTALL_RES`), NOT a fixture defect.
- **Non-blocking because:** each fixture's target code fires crisply; fail-closed is preserved (exit 1); the implementer documented this honestly in report §7 Note. The negative suite proves the targeted rule fires, not that it is the *only* rule. **No action.**

### F3 — minor-local — historical first-I-20B-run authored deploy.yml/infra-preview.yml scaffolds (ledger line 532); current state is clean and I-20C-owned
- **Evidence:** `ledger-compact.md` line 532 records the first I-20B implementer (`b0092775f`, which BLOCKED) authored "deploy.yml + infra-preview.yml scaffolds". Ledger line 536 records I-20C (`bcca4f001`) created the final `infra-preview.yml`/`deploy.yml` + `infra/pulumi/**`; ledger line 544 MARKs **I-20C TRUTH-GREEN**. The current I-20B report §8 + §9 explicitly disclaim deploy.yml/infra-preview.yml ("I-20C-owned, concurrent, untouched") and list only `quality.yml` + `scripts/ci/github-quality/**` + report as I-20B-owned. The three `.github/workflows/*.yml` files are content-distinct and filename-disjoint (quality aggregate vs Pulumi/deploy); `scripts/ci/` tree confirms `github-quality/`=I-20B, `pulumi/`=I-20C, `quality/`=I-20A (file-disjoint).
- **Non-blocking because:** the current I-20B deliverable owns ONLY its licensed paths; the deploy/infra-preview files are I-20C-truth-green and content-distinct. The shared serialized surface `.github/workflows/**` has no filename collision or content overlap. I cannot prove negative authorship via git for untracked greenfield files, but the current ownership state (report disclaim + I-20C truth-green + content-distinct) is consistent and clean. **No action** (historical scaffolding superseded by I-20C; not a current-scope violation).

> **No critical findings. No major-local findings.** All three are minor-local / by-design / historical — none weakens any gate, witness, owned-path, serialization boundary, or fork.

## 2. Mandatory verification axes (a–j) — all CONFIRMED with exact evidence

Evidence captured to `revalidation-evidence/witnesses.log` (revalidator-owned runs from repo root) + `revalidation-evidence/package-json-diff.txt`.

### (a) W-QG-POS real-boundary — CONFIRMED
- Witness (my run, repo root): `node scripts/ci/github-quality/validate-workflow.mjs --workflow .github/workflows/quality.yml` → `OK workflow .github/workflows/quality.yml satisfies the I-20B quick-gate contract (0 findings; rules: ruleAggregate, rulePermissions, rulePaths, ruleUpload, ruleFullSuite, ruleSmoke, ruleActionPinning, ruleDeployMutation, ruleSecretExposure, ruleBudget, rulePullRequestTarget).` **exit 0.**
- The validator genuinely parses the REAL `quality.yml` via js-yaml (`readWorkflow` → `load(text)` in `lib/yaml.mjs`) and runs 11 typed rules over the parsed mapping — not a stub. Confirmed `quality.yml` invokes `pnpm quality` (the I-20A runner), `permissions: contents: read`, SHA-pinned actions, no `pull_request_target`.

### (b) W-QG-NEG all-11 real-boundary + fail-closed (no false-green) — CONFIRMED
- Witness (my run): `node scripts/ci/github-quality/run-fixtures.mjs` → **12/12 fixtures matched expectation (11 negative, 1 positive)**, exit 0. Every negative fires its expected code + non-zero exit (1): AGG-MISSING, AGG-PARTIAL, PERMS-BROAD, PATHS-UNSAFE, UPLOAD-MISSING, FULL-SUITE, SMOKE-UNBARRED, ACTION-UNPINNED, DEPLOY-MUTATION, SECRET-EXPOSURE, BUDGET-VIOLATION.
- The fixtures are REAL workflow-YAML variants (proper `on:`/`permissions:`/`concurrency:`/`jobs:`/`steps:` mappings parsed by js-yaml), each exercising exactly one hard-failure rule. NOT synthetic mocks. None silently passes (each exits 1).
- **Independent false-green probe:** I authored two extra regressions. (A) `pull_request_target` + `${{ secrets.TOKEN }}` in `run:` → fires `SECRET-EXPOSURE` + `PULL_REQUEST_TARGET`, exit 1. (B) malformed YAML (`branches: [main` unclosed) → `FAIL [YAML-PARSE] ... missed comma between flow collection entries (5:1)` exit 1 — proving the validator fail-closes on parse errors, never false-passes.

### (c) `<10min` budget truthful — CONFIRMED (structural + deferred-live, no silent slow jobs)
- `quality.yml`: single job `quality`, `timeout-minutes: 10` (hard cap), `concurrency.cancel-in-progress: true`, pnpm-store cache. The only `run:` steps are `corepack enable`, `pnpm install --frozen-lockfile`, and the aggregate `pnpm quality -- --profile=ci …`. ci profile excludes full E2E/mobile/visual. No smoke job, no full-suite step, no second unlabeled slow workflow. The validator's BUDGET-VIOLATION rule (neg-11) rejects `timeout-minutes > 10`.
- The implementer did NOT silently split slow work into a separate workflow to dodge the gate (no `release-candidate.yml` created; no slow job hidden). Hosted wall-clock proof honestly deferred to I-20D `pending-live`.

### (d) No auto-deploy / no full-E2E in default CI — CONFIRMED
- `quality.yml` triggers are `push` (main/master) + `pull_request` only. No `workflow_dispatch`, no `pull_request_target`. No deploy/infra-mutation step (no `pulumi`/`terraform`/`kubectl`/`helm`/`gcloud deploy`/etc.). No Playwright/Cypress/nx-e2e/detox/maestro/visual step. The validator's DEPLOY-MUTATION + FULL-SUITE rules would reject any such step (witnessed in neg-06/neg-09).

### (e) SHA-pinned actions + least-privilege — CONFIRMED
- Every `uses:` in `quality.yml` is a full 40-hex SHA: `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5`, `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020`, `actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830`, `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02`. No `@vN`/`@latest`/`@main` floating refs (the only `@`-grep hit is a comment line, not an action ref). The validator's `SHA_REF_RE` (`^[\\w.-]+/[\\w.-]+@[0-9a-f]{40}$`) + `FLOATING_TAG_RE` reject non-SHA refs + dynamic installs.
- `permissions: { contents: read }` top-level; no job-level broader grants; no `write-all`/`read-all`. The validator's `rulePermissions` rejects any write-grant in `WRITE_PERM_KEYS` (incl. `id-token: write`).
- No `pull_request_target` for untrusted content (amendment §5 I-20B). Confirmed by the dedicated `rulePullRequestTarget` + my regression witness (A).

### (f) Local/CI parity (W-QG-PARITY-CAVEAT) — CONFIRMED
- `quality.yml` blocking step: `pnpm quality -- --profile=ci --evidence-dir .vibe/ci-evidence --summary-out .vibe/ci-evidence/quality-summary.json`. I-20A `parityBlockingCommand` (`scripts/quality/quality-wiring.config.json` line 3): `pnpm quality -- --profile=ci --evidence-dir <dir> --summary-out <summary-json>`. **Byte-parity** (placeholders filled with concrete paths). Same blocking path as local (mechanical §7).
- §3.4 caveat resolved via option (ii): I-13C is truth-green (ledger line 514: "Truth-green this wave: …I-13C…"; line 526: "{p0,p1,p2}"), `runP2Aggregate` is registered in the PUBLIC aggregate API (`packages/mechanical-gates/src/aggregate/index.js` line 3), `expected-families.manifest.json` declares `expectedFamilies: [p0,p1,p2]` → the fail-closed wiring gate passes on the complete aggregate. The gate is LIVE-BLOCKING in CI (never weakened, never advisory). Coded honestly in `quality.yml` header comments.
- Evidence + summary upload present (`actions/upload-artifact@…` with `if: always()`, `path: .vibe/ci-evidence`).

### (g) js-yaml via declared root dep — CONFIRMED
- `lib/yaml.mjs`: `import { load } from "js-yaml"`. Witness (my run, from the owned path): `(cd scripts/ci/github-quality && node -e "import('js-yaml').then(m=>console.log('load is', typeof m.load))")` → `load is function`. `js-yaml@4.2.0` is a root `devDependencies` entry (`package.json` line 24), declared by the validated I-20B js-yaml Step-1 EXTEND-I-20S handoff (ledger `b3f0e9fb1` PASS). Resolves from the owned path (symlink, not hoist) — no relative import, no hoist accident.

### (h) Hosted run honestly pending-live (NOT faked) — CONFIRMED
- No hosted GitHub Actions run result is claimed or fabricated anywhere in the impl report or witnesses. The report explicitly states "Hosted-run budget proof is I-20D pending-live (per brief — not claimed here)" and "I-20B does NOT claim hosted-run truth-green." Ledger line 546 confirms "hosted run deferred to I-20D pending-live." The witnesses are real-boundary (validator parse/reject) + structural (budget composition), correctly framed as NOT a hosted-run substitute. **No faked hosted evidence.**

### (i) Dirty-tree scope clean + file-disjoint — CONFIRMED
- I-20B-owned on-disk writes: `.github/workflows/quality.yml` (untracked-greenfield) + `scripts/ci/github-quality/**` (16 files: validate-workflow.mjs, run-fixtures.mjs, lib/yaml.mjs, lib/rules.mjs, 12 fixtures) + `.vibe/work/I-20B-github-actions-quick-gate/**` (report + js-yaml Step-1 serialized evidence — legitimately part of this lane's validated Step-1 handoff). `scripts/ci/` tree confirms disjoint: `github-quality/`=I-20B, `quality/`=I-20A, `pulumi/`=I-20C.
- **Root package.json/lockfile/turbo/workspace edits are NOT I-20B's.** `git diff package.json` shows exactly 3 additive lines, all attributable to OTHER lanes: `"js-yaml": "4.2.0"` (I-20S Step-1 / I-20B js-yaml Step-1 serialized handoff), `"quality": "node scripts/quality/run-quality.mjs"` (I-20A), `"@vibe-engineer/mechanical-gates": "workspace:*"` (I-20A Step-1 / I-13C). I-20B added NONE of these directly; the js-yaml line is the validated EXTEND-I-20S handoff, owned/executed through the serialized Step-1 finisher (not an out-of-license I-20B edit). `pnpm-lock.yaml`/`turbo.json`/`pnpm-workspace.yaml` deltas are the pre-existing multi-orchestrator baseline (I-20S/I-20A/I-13C).
- `infra/**` (I-20C), `.github/workflows/infra-preview.yml` + `deploy.yml` (I-20C, truth-green), `scripts/quality/**` + `scripts/ci/quality/**` (I-20A), `scripts/ci/pulumi/**` (I-20C), `docs/**`, `.git/**` — none edited by I-20B. `.github/workflows/**` filenames disjoint (no collision). No ownership overlap. (See F3 for the historical first-run scaffolding note — superseded, not a current violation.)

### (j) Validator is structural, not regex-heuristic — CONFIRMED
- The load-bearing typed contract (the workflow document) is parsed by the PUBLIC locked `js-yaml@4.2.0` (`readWorkflow` → `load(text)`), yielding a typed JS mapping. The 11 rules inspect typed properties: `doc.jobs.<job>.steps[]`, `doc.permissions`, `doc.on`, `doc["timeout-minutes"]`, `job["continue-on-error"]`, `step.uses`, `step.run`, job-key/name. NOT a regex scan over raw workflow text.
- Regex is used ONLY on the *content* of `run:` shell-script strings (matching command patterns like `pnpm test`, `npx playwright test`, `pulumi up`, `${{ secrets.* }}`) — which is the correct typed approach because shell-command-string contents have no structural parser; the YAML structure surrounding them IS parsed typed. This does NOT violate the quality bar ("no heuristic/regex standing in for a typed contract") — the YAML contract is typed; the shell-string inspection is pattern-matching on string data, which is appropriate. The hand-rolled/regex YAML parser that the bar forbids is NOT present. Witnessed: malformed YAML → typed `ParseError` fail-closed (regression B), not a heuristic skip.

## 3. Severity gate assessment — I-20B truth-green

- **No critical finding** (no unowned edits; no partial-command-as-truth; no full E2E/mobile/visual default; no broad perms; no `pull_request_target`; no unpinned action; no PR deploy/mutation; no secret exposure; no silent budget-dodge; no fake witness). ✓
- **No major-local finding** (validator complete with all 11 negatives; positive witness real; upload present; path filter safe — none present; §3.4 caveat handled/recorded). ✓
- **W-QG-POS** (real, exit 0) ✓ + **W-QG-NEG all-11** (real, fail-closed, no false-green) ✓ + **W-QG-BUDGET** (structural + deferred-live, no silent slow job) ✓ + **W-QG-PARITY-CAVEAT** (option (ii): I-13C truth-green, {p0,p1,p2} registered, live-blocking) ✓ — all satisfied with real evidence. ✓
- **Precondition I-20A truth-green:** confirmed (ledger line 528: "MARK I-20A TRUTH-GREEN"; the aggregate runner + wiring gate + parity command consumed via public contract only). ✓
- **→ I-20B is truth-green.** With I-20C truth-green (ledger line 544), I-20B truth-green **unblocks I-20D** (hosted GitHub Actions live run: budget wall-clock + green-on-host — the one remaining `pending-live` seam, correctly owned by I-20D, not closeable by I-20B).

## 4. Exact next action

- **Mark I-20B TRUTH-GREEN** (lane PASS). No NEEDS-FIX; no BLOCKED. The 3 minor-local findings (F1 by-design deferred-live, F2 honest multi-finding caveat, F3 historical superseded scaffolding) require no action and weaken no gate.
- **Unblock + launch I-20D** (hosted GitHub Actions run): the live seam (real `<10min` budget wall-clock + green-on-host) is the one remaining truth-green closure for the I-20 wave. I-20B's static validator + `quality.yml` are consumable read-only by I-20D.
- I-20D must independently re-confirm: (1) the real workflow runs green on hosted runners within `<10min`; (2) the fail-closed wiring gate blocks live when a tier is missing; (3) evidence+summary artifacts upload; (4) all actions resolve at the pinned SHAs on-host.

## STATUS: COMPLETE — VERDICT PASS (I-20B truth-green; unblocks I-20D with I-20C green).
