# I-20C Revalidation Artifact (Triad-B adversarial REVALIDATE)

- **Revalidator:** independent adversarial (model: glm-5.2 via zai, thinking: xhigh). Zero out-of-license edits (only this artifact + `revalidation-evidence/**` touched).
- **Target under revalidation:** `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-20C-pulumi-scaffold-preview-deploy/I-20C-implementation-report.md` (impl reported `DONE`).
- **Product repo:** `/Users/lizavasilyeva/work/vibe-engineer` (the `.git` repo; holds `infra/pulumi/**`, `.github/workflows/**`, `scripts/ci/pulumi/**`, `docs/deployment/**`). The HLO config/briefs/docs live in `/Users/lizavasilyeva/work/harness-starter`.
- **Owned WRITE paths (this agent):** this artifact + `.vibe/work/I-20C-pulumi-scaffold-preview-deploy/revalidation-evidence/**`.
- **Read-only:** both repos. **Untouchable:** all product source, the impl report, prior evidence trees, prompts/briefs/ledger/status/handoff, `.git/**`. No state-mutating git or package-manager ops.
- **Witness-method note:** read-only `git status/diff/ls-files`, `tsc --noEmit`, `node <validator>`, `pulumi whoami` were used to satisfy the mandated dirty-tree/scope + real-boundary witnesses (checklist items 9 and 11 require `git status --porcelain` and `tsc`). No add/commit/push/reset/stash/clean/checkout/restore/install was performed.

---

## VERDICT: **PASS** — I-20C is **truth-green** for its owned deterministic/static surface.

Every load-bearing claim in the impl report was independently re-run against on-disk reality. Provider-agnostic Pulumi TS scaffold + `dev`/`prod` + preview-only PR workflow + `workflow_dispatch`/protected-env deploy + N1–N9 validator are all correct and real-boundary; all 11 negatives fail-closed; `tsc` green; live preview/deploy seam is **honestly `pending-live/BLOCKED` (I-20D-owned), NOT faked**; dirty-tree scope is clean and file-disjoint from I-20A/I-20B. No critical, no major-local. This matches the brief's `clean` definition for I-20C.

---

## Target / ground-truth read (treated unverified until confirmed)

1. Impl report — all material claims confirmed below.
2. Brief `I-20C-brief-generated.md` — owned paths + serialization carve-out (`infra/pulumi/package.json`+lock = I-20S) + all 8 §5.15 hard-failure rules + STOP boundary: respected exactly.
3. Brief-validation PASS artifact (`reports/I-20C-brief-validation-artifact.md`) — PASS (2 minor-local, non-blocking); confirms owned-set, file-disjointness, live-seam-deferred-to-I-20D.
4. `next/post-i18b-ready-queue-validated.md` §5 (deployment-scope gate) + §6 (ownership matrix).
5. `docs/locked-decisions.md` §10 (the 9 CI/CD + deployment defaults) and `docs/verification-layer.md` §5.15 (the 8 deployment hard failures).
6. On-disk inspection (read-only) of `infra/pulumi/**`, both workflows, `scripts/ci/pulumi/**`, `docs/deployment/**`.

---

## Numbered findings (severity + exact evidence)

### F1 — `clean` (witness a) — Provider-agnostic invariant HOLDS
- **Evidence:** `infra/pulumi/index.ts` imports ONLY `@pulumi/pulumi` (`grep ^import` → single import). No `new ...Provider(...)`, no cloud-resource ctor; uses `pulumi.getProject()`, `pulumi.getStack()`, `new pulumi.Config("vibe-engineer")` (SDK config reader, not a provider). `Pulumi.yaml` declares `runtime: nodejs/typescript`, `main: index.ts`, **no provider/region/target**. Stack configs `Pulumi.dev.yaml`/`Pulumi.prod.yaml` carry only `vibe-engineer:provider-agnostic: true` — no region/provider config key.
- **Witness:** validator positive exit 0; N1 fixture (`@pulumi/aws` dep + `new aws.s3.Bucket` + `aws:region: us-east-1`) → `[N1] provider dependency declared: @pulumi/aws`, exit 1.
- **Verdict:** PASS.

### F2 — `clean` (witness b) — Pulumi TypeScript + Pulumi Cloud backend
- **Evidence:** `Pulumi.yaml` `runtime.name: nodejs` + `options.typescript: true`. `tsc -p infra/pulumi/tsconfig.json --noEmit` (typescript 5.9.3) → **exit 0**. No self-managed backend declared anywhere (`backend: url: file://|s3://|…` absent); default = Pulumi Cloud via `pulumi login` in both workflows. N2-backend fixture (`backend: url: file://./state`) → `[N2] unapproved (non-Pulumi-Cloud) self-managed backend declared`, exit 1.
- **Verdict:** PASS.

### F3 — `clean` (witness c) — `dev`/`prod` environments, no per-PR preview envs
- **Evidence:** `Pulumi.dev.yaml` + `Pulumi.prod.yaml` both present, parse, and carry no secrets. `infra-preview.yml` selects `dev` for preview; `deploy.yml` input-selects `dev`/`prod`. No ephemeral/per-PR stack envs.
- **Verdict:** PASS.

### F4 — `clean` (witness d) — Manual deploy ONLY, no auto-deploy (hard-failure rule 4)
- **Evidence:** `deploy.yml` `on:` block contains **only** `workflow_dispatch:` (input `stack` choice `dev`/`prod`); **no** `push`/`pull_request`/`schedule`/`workflow_run`/`workflow_call`/`release`/`create`/`registry_package`. Job binds `environment: ${{ inputs.stack }}` (protected GitHub Environment). N4 fixture (`on: push`) → `[N4] deploy workflow auto-triggers on push (auto-deploy)`, exit 1.
- **Verdict:** PASS.

### F5 — `clean` (witness e) — PR workflow preview/diff-only, non-mutating (hard-failure rule 3)
- **Evidence:** `infra-preview.yml` runs `pulumi preview --diff --non-interactive --show-config` only. `pulumi up`/`refresh`/`destroy` appear **only inside the comment block** (lines 7–8 documentation); the validator strips comments before scanning, so no mutation is seen. N3 fixture (`pulumi up --yes` in PR workflow) → `[N3] PR infra workflow runs a mutating pulumi command`, exit 1.
- **Verdict:** PASS.

### F6 — `clean` (witness f) — No committed/plaintext secrets (hard-failure rule 5)
- **Evidence:** Plaintext-secret grep (AKIA / `BEGIN … PRIVATE KEY` / `sk-…` / `ghp_…` / `xox…` / `password[:=]`) over `Pulumi.yaml`, both stack configs, `index.ts`, both workflows → exit 1 (none). Literal-token grep for `PULUMI_ACCESS_TOKEN: <non-${{secrets}}>` → exit 1 (none); every reference is `${{ secrets.PULUMI_ACCESS_TOKEN }}`. Stack configs have no secret values. N2-secret fixture (`database-password: hunter2`, `api-token: sk-…`) → `[N2] possible committed plaintext secret in stack config`, exit 1.
- **Verdict:** PASS.

### F7 — `clean` (witness g) — Break-glass for `pulumi destroy` (hard-failure rule 7)
- **Evidence:** `grep pulumi destroy` over `infra/pulumi/**` + `deploy.yml` → only the infra-preview comment. No `pulumi destroy` step in any product workflow; docs state destroy is absent by default and any break-glass is a separate future protected flow. N6 fixture (`pulumi destroy`) → `[N6] pulumi destroy present in deploy workflow`, exit 1.
- **Verdict:** PASS.

### F8 — `clean` (witness h) — N1–N9 validator is real-boundary; all 11 negatives fail-closed
- **Real-boundary:** `scripts/ci/pulumi/validate-pulumi-scaffold.mjs` parses the real YAML (own structural parser + `stripYamlComments`) and reads real `package.json`/`.ts` source; it is NOT a stub. (Imports only `node:fs/path/process` — zero deps.)
- **Positive:** real scaffold → `PASS — provider-agnostic + conformant workflows, no N1-N9 violation`, **exit 0**.
- **Negatives (independently re-run):** **pass=11 fail=0**; each exits 1 and names the target rule — N1 (provider dep), N2×2 (plaintext secret / file:// backend), N3 (PR mutation), N4 (auto-deploy push), N5×2 (no dispatch / no protected env), N6 (destroy), N7 (preview/up without login), N8 (`contents: write`), N9 (`@v4` moving tag). **No negative silently passes.** Fixtures are real YAML/TS (e.g. N1 = `import * as aws from "@pulumi/aws"` + `new aws.s3.Bucket`), not stubs.
- **Verdict:** PASS.

### F9 — `clean` (witness i) — `tsc` green
- **Evidence:** `node_modules/.bin/tsc -p infra/pulumi/tsconfig.json --noEmit` (typescript 5.9.3) → **exit 0**. `@pulumi/pulumi` resolves via the I-20S workspace importer (`infra/pulumi/node_modules/@pulumi/pulumi`), matching local/CI parity.
- **Verdict:** PASS.

### F10 — `clean` (witness j) — Live seam honestly `pending-live`, NOT faked
- **Evidence (independent):** `pulumi whoami` → **exit 1**, error `… S3: GetObject … Invalid region` (the local `~/.pulumi` is misconfigured toward an S3 endpoint and is not logged into Pulumi Cloud); `PULUMI_ACCESS_TOKEN` unset. A live `pulumi preview`/`pulumi up` therefore cannot run here. The implementer's `evidence/w-live-preview.txt` records `whoami-exit=1`, `stack-select-exit=1`, `preview-exit=1` and `VERDICT: pending-live/BLOCKED` owned by I-20D. This is an **honest** record of failure, **not** a faked green (`act`/mocked Pulumi/synthetic were not substituted). The local S3-misconfiguration is an environment artifact, not an I-20C scaffold defect (the scaffold correctly authenticates to Pulumi Cloud via `pulumi login`).
- **Verdict:** PASS.

### F11 — `clean` (witness k) — Dirty-tree scope clean + file-disjoint from I-20A/I-20B
- **Evidence (read-only `git status --porcelain`):** every I-20C deliverable is a **new (`??`) file**; **zero** pre-existing file is Modified/Deleted/Renamed by I-20C. New I-20C surfaces: `infra/pulumi/{Pulumi.yaml,Pulumi.dev.yaml,Pulumi.prod.yaml,index.ts,tsconfig.json}`, `.github/workflows/{infra-preview.yml,deploy.yml}`, `scripts/ci/pulumi/validate-pulumi-scaffold.mjs`, `docs/deployment/{README.md,pulumi.md}`, + this lane work root.
- **Serialization surfaces untouched by I-20C:** `M package.json`/`M pnpm-lock.yaml`/`M pnpm-workspace.yaml`/`M turbo.json` are **I-20S's** (confirmed by the I-20S revalidation PASS — F1 scripts-only package.json, F3 turbo quality/deploy tasks, F6 workspace `infra/pulumi`, F8 scoped lockfile). The two extra root devDeps (`@vibe-engineer/mechanical-gates`, `js-yaml`) are imported **only** by I-20A/I-20B scripts (`scripts/ci/quality/**`, `scripts/quality/**`), **not** by I-20C's zero-dependency validator — so I-20C neither needed nor added them. `infra/pulumi/package.json` (`@pulumi/pulumi: 3.248.0`) is I-20S-owned and consumed read-only; `docs/decisions/DL-18B-*.md` is DL-18P-owned (not I-20C).
- **File-disjointness:** I-20C owns **only** `scripts/ci/pulumi/**` (disjoint from I-20A's `scripts/quality/**` + `scripts/ci/quality/**`) and **only** `infra-preview.yml` + `deploy.yml` (disjoint from I-20B's `quality.yml`). No stray pulumi workflows/files outside the owned set.
- **Verdict:** PASS.

---

## Explicit constraint statements (per task deliverable)

- **(a) Provider-agnostic:** ✅ YES — no hard-coded provider/region/default resource; only `@pulumi/pulumi` imported; no provider ctor; N1 enforced + fail-closed.
- **(b) Pulumi TS + Cloud backend:** ✅ YES — `runtime: nodejs/typescript`; `tsc` exit 0; default backend Pulumi Cloud via `pulumi login`; no self-managed backend; N2-backend fail-closed.
- **(c) dev/prod:** ✅ YES — `Pulumi.dev.yaml` + `Pulumi.prod.yaml` present/valid/secret-free; no per-PR preview envs.
- **(d) Manual deploy only (no auto-deploy):** ✅ YES — `workflow_dispatch`-only; no push/PR/merge/tag/schedule; protected `environment:`; N4 fail-closed.
- **(e) PR preview-only (no mutation):** ✅ YES — `pulumi preview --diff` only; no up/refresh/destroy (only in comments); N3 fail-closed.
- **(f) No plaintext secrets:** ✅ YES — grep clean; stack configs secret-free; workflows use `${{ secrets.* }}`; N2-secret fail-closed.
- **(g) Break-glass for destroy:** ✅ YES — `pulumi destroy` absent from all product workflows; N6 fail-closed.
- **(h) N1–N9 validator real + 11 negatives fail-closed:** ✅ YES — real YAML/TS/package.json parsing; positive exit 0; **11/11** negatives exit 1 with correct named rule; none silently passes.
- **(i) tsc green:** ✅ YES — exit 0 (typescript 5.9.3).
- **(j) Live seam pending-live, not faked:** ✅ YES — `pulumi whoami` exit 1 (not logged in); implementer evidence honestly records exit-1 failures + `pending-live/BLOCKED`; no faked/mocked green.
- **(k) Dirty-tree scope clean + file-disjoint from I-20A/I-20B:** ✅ YES — all I-20C deliverables new; zero pre-existing file modified; serialization surfaces are I-20S's (PASS-confirmed); file-disjoint from I-20A (`scripts/quality`, `scripts/ci/quality`) and I-20B (`quality.yml`).

## Severity gate assessment (brief §7 / amendment §6)
**No critical. No major-local.** All deterministic + real-boundary witnesses are green; the live preview/deploy seam is explicitly and honestly `pending-live` (I-20D-owned), never falsely claimed green. All 8 §5.15 hard-failure rules are satisfied on I-20C's owned surface (PR non-mutation, manual+protected deploy, no plaintext secrets/unapproved backend, least perms, no unprotected destroy, no false deployment-readiness claim; quick-gate budget respected via `timeout-minutes: 10`; no full-E2E/mobile/visual in these infra workflows). **I-20C is truth-green** and may feed I-20D.

### Non-blocking observations (minor-local / informational — do NOT block)
- **O1 (minor-local):** The workflows install the Pulumi CLI via `curl -fsSL https://get.pulumi.com | sh -s -- --version 3.248.0`. The CLI is **version-pinned** (3.248.0, matching the I-20S SDK for local/CI parity) but not **checksum-pinned** (`curl|sh` supply-chain surface). N9 (which governs action `uses:` refs — those ARE 40-hex SHA-pinned) is satisfied; this is not a §5.15 hard-failure rule violation. A stricter future could verify the binary digest. Not in I-20C's fix scope.
- **O2 (informational):** The local `~/.pulumi` backend is misconfigured toward an S3 endpoint (environment artifact), which is why `pulumi whoami` surfaces an S3 error rather than a clean "not logged in". This does not affect the scaffold (CI uses `pulumi login` → Pulumi Cloud) and reinforces that the live seam is correctly `pending-live`.

## Exact next action
I-20C is truth-green → **launch I-20D** (`ci-pulumi-real-boundary-validation`) to close the live seam: actual `pulumi preview` for `dev`/`prod` against Pulumi Cloud, actual protected-GitHub-Environment approval proof, and actual `pulumi up` deploy evidence (all currently `pending-live/BLOCKED` until Pulumi Cloud creds + protected `dev`/`prod` environments + `PULUMI_ACCESS_TOKEN` are provisioned). No I-20C fix is required.

---

*Evidence tree: `.vibe/work/I-20C-pulumi-scaffold-preview-deploy/revalidation-evidence/witness-summary.txt` (+ impl's `evidence/**` re-run independently).*
