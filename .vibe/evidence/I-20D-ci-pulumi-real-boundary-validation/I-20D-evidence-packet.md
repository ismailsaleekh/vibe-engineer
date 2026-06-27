# I-20D validation evidence packet — CI/Pulumi real-boundary validation

- Lane: `I-20D-ci-pulumi-real-boundary-validation` (VALIDATION-ONLY; produces NO product edits).
- Owned WRITE: `.vibe/work/I-20D-ci-pulumi-real-boundary-validation/**` + `.vibe/evidence/I-20D*/**`.
- Working dir: `/Users/lizavasilyeva/work/vibe-engineer`. All witnesses run from repo root.
- Quality bar binding (prepended verbatim). Shape-green ≠ truth-green. No live seam declared PASS without live evidence.
- Companion report: `…/I-20D-validation-report.md`.

## 0. Pre-flight gate state (launch gates hold)

- I-20S / I-20A / I-20B / I-20C each independently revalidated **PASS** (read from their revalidation artifacts). On-disk outputs present + shaped (root `quality` script + `turbo.json` quality/deploy; `scripts/quality/**`; `scripts/ci/{quality,github-quality,pulumi}/**`; `.github/workflows/{quality,infra-preview,deploy}.yml`; `infra/pulumi/**`).
- **I-13C landed** → `packages/mechanical-gates/src/aggregate/index.js` exports `runP0Aggregate` + `runP1Aggregate` + **`runP2Aggregate`**; manifest declares `{p0,p1,p2}`. W6 (W-FC-POS) is genuinely PASS at runtime (the brief itself anticipates this in §3 Step 6; W1's canonical run subsumes it).
- Dirty-tree scope: I-20D added ONLY untracked files under its owned work/evidence paths; **zero** product/sibling/tracked-file modifications by I-20D.

## 1. Per-witness verdicts

| ID | Witness | Verdict | Real boundary | Evidence |
| --- | --- | --- | --- | --- |
| W1-core | Real aggregate spawn + schema-valid evidence + wiring gate | **PASS** (via `=`-form CLI) | REAL `runP0/P1/P2Aggregate` via PUBLIC export; REAL schema validation | `w1-local-aggregate/formB-*` |
| W1-CLI | Brief/CI parity command (space-form) | **FAIL → DEFECT D1 routed** | REAL runner CLI parser vs documented command | `w1-local-aggregate/{formA-*,stdout.txt,stderr.txt}` |
| W1-neg | W-FC-NEG phantom p9 | **PASS** (exit 2, names p9) | REAL wiring gate, REAL registered set | `w1-negative-fc-neg/*` |
| W2-pos | Static validator on REAL `quality.yml` | **PASS** (exit 0) | REAL `js-yaml` parse + REAL rules | `w2-workflow-validator/pos-stdout.txt` |
| W2-neg | Negative fixture suite (11 neg + 1 pos) | **PASS** (12/12) | REAL parser-boundary rejection per rule | `w2-workflow-validator/fixtures-stdout.txt` |
| W3 | Hosted GitHub Actions run | **pending-live/BLOCKED** | (no hosted repo) | `w3-hosted-gha/capture.txt` |
| W4 | Pulumi preview dev + prod | **pending-live/BLOCKED** | (no Pulumi Cloud creds) | `w4-pulumi-preview/capture.txt` |
| W5 | Protected-env deploy evidence | **partial / pending-live/BLOCKED** | file-level REAL; repo-API proof absent | this §3 + `deploy.yml` |
| W6 | W-FC-POS P2 positive wiring | **PASS** (I-13C landed; subsumed by W1) | REAL canonical manifest run | `w1-local-aggregate/formB-summary.json` |

---

## 2. W1 — Local aggregate real run (core)

**Canonical aggregate machinery is REAL and sound.** Two CLI forms probed at the real boundary:

- **Form B (`=`-joined, matches the implemented `parseArgs`):**
  `node scripts/quality/run-quality.mjs --profile=ci --evidence-dir=<dir> --summary-out=<json>` → **exit 2**.
  - `wiring.verdict = pass`, `expected=[p0,p1,p2]`, `registeredAndRunning=[p0,p1,p2]`, `missing=[]` → **W-FC-POS PASS** (I-13C landed).
  - REAL aggregate spawned for all 3 tiers via PUBLIC `@vibe-engineer/mechanical-gates/aggregate`: `p0` (3317 blocking findings = real P0 quality-red on the dirty in-flight tree, NOT a wiring defect — per I-20A D1), `p1` ok, `p2` ok. Per-tier typed-carrier evidence written (`p0.aggregate.json` 3.7MB, `p1`, `p2`).
  - Schema-validity (independent, via `scripts/quality/lib/schema-validator.mjs`): `wiring-integrity.json` → PASS (`wiring-integrity.schema.json`); `summary.json` → PASS (`quality-summary.schema.json`). (Per-tier aggregate evidence is the raw typed carrier output; the runner schema-gates wiring + summary by design.)
  - Exit 2 is the **honest** blocking behavior (real P0 findings), not a wiring/integrity failure. The wiring verdict is independently inspectable as `pass`. → **W1-core PASS.**

- **Form A (space-separated, used by the brief §5 command AND `quality.yml`'s blocking step AND `quality-wiring.config.json` `parityBlockingCommand`):**
  `pnpm quality -- --profile=ci --evidence-dir <dir> --summary-out <json>` → **exit 1**, `FAIL-CLOSED quality: unknown argument(s) ["--evidence-dir","…","--summary-out","…"]`.
  → **DEFECT D1** (see §6). The aggregate never spawns via the documented/CI parity command.

### W1-negative — W-FC-NEG (phantom p9)
`node scripts/ci/quality/wiring-integrity-gate.mjs --profile=ci --evidence-dir=<dir> --expected=p0,p1,p2,p9` → **exit 2**. Wiring evidence: `verdict=fail, exitCode=2, missing=[p9]`; diagnostic names `p9` and cites mechanical §7 "CI invokes partial gate instead of aggregate gate". The phantom-family override uses the sanctioned witness surface (the gate CLI's own `--expected` flag, documented in its header) — the canonical manifest was NOT mutated. **PASS.**

---

## 3. W2 — Static workflow validator on REAL workflows

- **Positive:** `node scripts/ci/github-quality/validate-workflow.mjs --workflow=.github/workflows/quality.yml` → **exit 0**, `OK … 0 findings; rules: ruleAggregate, rulePermissions, rulePaths, ruleUpload, ruleFullSuite, ruleSmoke, ruleActionPinning, ruleDeployMutation, ruleSecretExposure, ruleBudget, rulePullRequestTarget`.
- **Negative suite:** `node scripts/ci/github-quality/run-fixtures.mjs` → **exit 0, 12/12 matched**. Every negative fixture is REJECTED (non-zero exit + expected rule code fires): `AGG-MISSING, AGG-PARTIAL, PERMS-BROAD, PATHS-UNSAFE, UPLOAD-MISSING, FULL-SUITE, SMOKE-UNBARRED, ACTION-UNPINNED, DEPLOY-MUTATION, SECRET-EXPOSURE, BUDGET-VIOLATION`; positive `pos-quality.yml` → exit 0.
- Fixtures are REAL workflow-YAML variants parsed by the locked `js-yaml` (real parser boundary), not synthetic mocks. None silently passes. **W2 PASS.**
- **Shape-green≠truth-green caveat (the I-20D-mandated gap):** the static validator confirms the command STRING is present in `quality.yml` but does NOT execute the runner — so it cannot catch D1 (the runner's parser rejects the space-form the workflow uses). This is precisely why W1's real run is load-bearing and why D1 is a real-boundary finding, not a static one.

---

## 4. W3 — Hosted GitHub Actions run → pending-live/BLOCKED

- Exact prerequisite: **no GitHub remote** (`git remote -v` empty); `gh run list --workflow quality.yml` → `failed to determine base repo: no git remotes found`; `gh repo view` → `no git remotes found`. `gh` IS authenticated (`ismailsaleekh`, scopes repo/read:org/gist) but there is no hosted repo/commit at HEAD.
- Did NOT synthesize a run; did NOT use `act` (shape-only, not truth). Verdict: **pending-live/BLOCKED** — blocks I-20-COMPLETE / FINAL-BUGHUNT live claims, not I-20D's deterministic-scope PASS. Exact unblock: push to a GitHub remote and observe a real `quality.yml` run (run ID, status, artifacts, summary, wall-clock < 10 min).

---

## 5. W4 — Pulumi preview dev + prod → pending-live/BLOCKED

- Pulumi CLI present (`pulumi version` → `v3.248.0`).
- Exact prerequisite: **`PULUMI_ACCESS_TOKEN` unset** AND the local Pulumi backend is **misconfigured toward an S3 endpoint** (`pulumi whoami` → `error: read ".pulumi/meta.yaml" … operation error S3: GetObject … Invalid region: region was not a valid DNS name`); NOT logged into Pulumi Cloud.
- Did NOT run `pulumi login`, `pulumi preview`, `pulumi up`, or any mutating op. Did NOT substitute a local/S3-backend preview or mocked output as truth (the brief requires the **Pulumi Cloud** backend; a self-managed S3 backend is explicitly disallowed and is the broken config here). Verdict: **pending-live/BLOCKED**. Exact unblock: authenticate to Pulumi Cloud (`PULUMI_ACCESS_TOKEN` / `pulumi login`) and run non-mutating `pulumi preview --stack dev --diff` + `--stack prod --diff`.
- Static corroboration (real-boundary read-only): `Pulumi.yaml`/`Pulumi.dev.yaml`/`Pulumi.prod.yaml` declare Pulumi Cloud backend (no file://), no default provider/region/resource (`index.ts` imports only `@pulumi/pulumi`, instantiates no resource); plaintext-secret grep over all Pulumi files → clean.

---

## 6. W5 — Protected-env deploy evidence → partial / pending-live/BLOCKED

- **File-level proof (REAL, PASS):** `.github/workflows/deploy.yml` — `on: workflow_dispatch:` ONLY (no `push`/`pull_request`/`schedule`/`workflow_call`); `environment: ${{ inputs.stack }}` with `inputs.stack` choice `[dev, prod]` → the job binds to a protected GitHub Environment for both stacks; least perms (`contents: read`); all actions pinned to immutable SHAs (no `@vN`/`@latest`/`@main`); no `pulumi destroy` anywhere (grep over workflows + `infra/pulumi` → only comment mentions); no plaintext secrets in stack configs (grep clean).
- **Repo-settings / API proof of environment protection (required reviewers on `dev`/`prod`) → pending-live/BLOCKED:** no GitHub remote ⇒ `gh api` repo-environment protection cannot be queried. Exact unblock: configure the hosted repo's `dev`/`prod` GitHub Environments with required reviewers and capture the protection API response.
- Did NOT dispatch `deploy.yml`. Verdict: **partial** (file-level truth proven; protection-API proof pending-live/BLOCKED).

---

## 7. §5.15 complete 8-hard-failure sweep (verification-layer §5.15)

| # | §5.15 hard failure | Witness | Result |
| --- | --- | --- | --- |
| 1 | default CI exceeds quick-gate budget w/o reclassification | W2 (BUDGET-VIOLATION neg-11 rejected); real `quality.yml` `timeout-minutes:10` + ci excludes full suites | PASS (static); live wall-clock = W3 pending-live/BLOCKED |
| 2 | CI invokes full E2E/mobile/visual by default | W2 (FULL-SUITE neg-06 rejected); ci profile excludes them | PASS |
| 3 | PR workflow deploys or mutates infra | W2 (DEPLOY-MUTATION neg-09 rejected); real `quality.yml` has no deploy/mutation | PASS |
| 4 | deploy lacks manual trigger or protected env approval | W5 file-level (`workflow_dispatch` + `environment:`) | PASS (static); protection-API proof pending-live/BLOCKED |
| 5 | Pulumi plaintext secrets or unapproved backend | W4 static (Pulumi Cloud by config, no plaintext) | PASS (static); live Pulumi-Cloud preview pending-live/BLOCKED |
| 6 | workflow permissions broader than required | W2 (PERMS-BROAD neg-03 rejected); all workflows `contents: read` | PASS |
| 7 | `pulumi destroy` outside protected/manual break-glass | W4/W5 (no `pulumi destroy` in any workflow; deploy manual+protected) | PASS (static); live dispatch proof pending-live/BLOCKED |
| 8 | claims deployment readiness w/o preview/result evidence | N/A — I-20D makes NO readiness claim; all live seams honestly pending | PASS (no false claim) |

**Mechanical §7 sweep:** partial-gate-as-truth (W1/W1-neg: aggregate-only parity path proven, partial command rejected via AGG-PARTIAL/AGG-MISSING); path-filter skipping governed paths (PATHS-UNSAFE neg-04 rejected); quick-CI budget blowout (BUDGET-VIOLATION neg-11); mislabeled smoke (SMOKE-UNBARRED neg-07); PR deploy/mutation (DEPLOY-MUTATION neg-09); unprotected destroy (none present + §5.15 #7); missing runner/dependency (W1-core spawns REAL aggregate; AGG-MISSING neg-01); dynamic package execution (ACTION-UNPINNED neg-08, bare `npx` flagged). All reachable, all rejected where applicable. **Clean on the deterministic surface.**

---

## 8. Defects routed (NOT patched in place — I-20D owns no product file)

### D1 — CRITICAL (route to I-20A; blast radius I-20B) — `pnpm quality` CLI argument-contract mismatch breaks the documented local/CI parity command
- **Root cause:** `scripts/quality/run-quality.mjs` `parseArgs` accepts ONLY the `=`-joined form (`--evidence-dir=<dir>`, `--summary-out=<json>`, `--profile=<p>`); it rejects the space-separated form as `unknown argument(s)` and fail-closes (exit 1).
- **Contradiction:** the space-separated form is the one used by (a) the I-20D/I-20A brief canonical command `pnpm quality -- --profile=ci --evidence-dir <dir> --summary-out <json>`, (b) `scripts/quality/quality-wiring.config.json` `parityBlockingCommand`, and — critically — (c) **`.github/workflows/quality.yml`'s blocking step**: `run: pnpm quality -- --profile=ci --evidence-dir .vibe/ci-evidence --summary-out .vibe/ci-evidence/quality-summary.json`.
- **Impact:** in real hosted CI the `quality.yml` blocking step would **fail-closed (exit 1) on every run** before the aggregate ever runs — the local/CI parity quick-gate is non-functional via its documented command. The I-20B static validator passes `quality.yml` (the command string is present) but cannot catch this — a textbook shape-green≠truth-green gap that only W1's real run exposes.
- **Reproduction (real boundary):**
  - FAIL: `node scripts/quality/run-quality.mjs --profile=ci --evidence-dir <dir> --summary-out <json>` → exit 1, `FAIL-CLOSED quality: unknown argument(s) ["--evidence-dir","…","--summary-out","…"]`. (Captured in `w1-local-aggregate/formA-stderr.txt`.)
  - OK (workaround form): `node scripts/quality/run-quality.mjs --profile=ci --evidence-dir=<dir> --summary-out=<json>` → exit 2 (real P0 findings), wiring=pass, all 3 tiers spawned, schema-valid evidence.
- **Routing:** primary owner **I-20A** (`scripts/quality/run-quality.mjs` parser — accept space-separated `--flag <value>` OR document/normalize to `=`-form everywhere). Blast-radius owner **I-20B** (`.github/workflows/quality.yml` blocking step uses the broken space-form; the static validator needs a real-execution parity check OR the workflow must use the `=`-form the parser accepts). I-20D did NOT edit either file (out of license). This defect does **not** invalidate the underlying wiring/aggregate machinery (proven sound via the `=`-form) but it MUST be fixed before I-20-COMPLETE and before any hosted-CI claim (W3).

No other defects found in I-20A/B/C outputs at the real boundary.

---

## 9. Verdict

- **I-20D deterministic-scope truth-green:** **PASS with one routed defect (D1).** W1-core PASS (real aggregate + schema-valid evidence + wiring pass, via the implemented `=`-form CLI); W-FC-NEG PASS; W2 PASS (real workflow + full negative suite rejected); W6 PASS (I-13C landed → W-FC-POS genuinely green, subsumed by W1). D1 routed (not patched). Dirty-tree scope clean.
- **Live seams honestly pending-live/BLOCKED (block I-20-COMPLETE / FINAL-BUGHUNT live claims, NOT I-20D's deterministic PASS):**
  - W3: no GitHub remote.
  - W4: no Pulumi Cloud creds; local backend misconfigured to S3.
  - W5: file-level proof PASS; repo-environment protection API proof pending (no remote).
- **No live seam falsely declared PASS. No `act`/mocked-Pulumi/synthetic fixture used as truth. No mutating Pulumi/deploy op. No product file edited. No package-manager op. No git mutation.**
