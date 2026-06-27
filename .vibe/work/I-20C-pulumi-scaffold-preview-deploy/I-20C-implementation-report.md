# I-20C Implementation Report — pulumi-scaffold-preview-deploy

- **Lane:** I-20C-pulumi-scaffold-preview-deploy (Triad-B IMPLEMENTER)
- **Model:** glm-5.2 via zai (thinking: high)
- **Working dir:** `/Users/lizavasilyeva/work/vibe-engineer`
- **Brief:** `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/I-20C-brief-generated.md` (validation PASS)
- **Binding content spec:** `docs/decisions/DL-18B-pulumi-deployment-defaults.md` (LOCKED)
- **Status:** **DONE** — provider-agnostic Pulumi TS scaffold + `dev`/`prod` + preview-only PR workflow + `workflow_dispatch`/protected-environment deploy authored; all deterministic/static real-boundary witnesses green; all N1–N9 negatives fail-closed; live preview/deploy seam `pending-live` (I-20D-owned, not faked).

---

## Stage 0 — Report created FIRST (checkpoint discipline), updated after every stage.

## Stage 1 — Precondition gate check (brief §2 + §8) — PASS

| Precondition | Required state | On-disk evidence | Verdict |
| --- | --- | --- | --- |
| DL-18B/DL-18P decision record present + LOCKED | exists, LOCKED, 9 content items verbatim-grounded | `docs/decisions/DL-18B-pulumi-deployment-defaults.md` exists, `status: LOCKED` | ✅ PASS |
| I-20S PASS | independently revalidated PASS | `.vibe/work/I-20S-ci-pulumi-dependency-root-handoff/I-20S-revalidation-artifact.md` → **VERDICT: PASS** | ✅ PASS |
| `infra/pulumi/package.json` present (I-20S-owned, read-only) | Pulumi dep declared | `@pulumi/pulumi: 3.248.0` | ✅ PASS |
| Pulumi deps resolvable (no install) | node_modules realized by I-20S | `infra/pulumi/node_modules/@pulumi/pulumi` present; `require.resolve` OK; `typescript@5.9.3` resolvable | ✅ PASS |

> The planning-stage brief-validation artifact predates DL-18P/I-20S closure (it correctly marked I-20C "not launchable now"). Both hard preconditions are now satisfied on disk; the HLO launched this implementer after the pre-I-20 gates cleared. The brief's PASS verdict (launch-safety of the brief itself) is unaffected.

## Stage 2 — Baseline snapshot (before authoring)

- `infra/pulumi/`: only `node_modules/` + I-20S `package.json`. Program files absent → I-20C creates them.
- `.github/workflows/`, `docs/deployment/`, `scripts/ci/pulumi/`: ABSENT for I-20C (greenfield). (Sibling lanes I-20A/I-20B had created `scripts/quality/**`, `scripts/ci/quality/**`, `.github/workflows/quality.yml` — file-disjoint from I-20C's owned names; left untouched.)
- `git ls-files infra .github docs/deployment scripts/ci/pulumi` → empty (all I-20C paths new).
- `.npmrc`: `ignore-scripts=true`, `shamefully-hoist=false`, `shared-workspace-lockfile=true`, `save-exact=true`, `engine-strict=true` (I-20S; read-only).
- Pulumi CLI v3.248.0 present; **not logged into Pulumi Cloud** (`pulumi whoami` → backend auth/endpoint error) → live witness expected `pending-live`.

## Stage 3 — Authoring — DONE

Created (all under owned WRITE paths; **zero** out-of-license edits):

- `infra/pulumi/Pulumi.yaml` — project (runtime nodejs/typescript, main index.ts; no provider/region).
- `infra/pulumi/index.ts` — provider-agnostic program: imports ONLY `@pulumi/pulumi`; no provider/resource; exports project/stack metadata (no provider needed). I-20S `package.json` untouched.
- `infra/pulumi/tsconfig.json` — program typecheck config (owned by I-20C under `infra/pulumi/**`).
- `infra/pulumi/Pulumi.dev.yaml`, `infra/pulumi/Pulumi.prod.yaml` — `dev`/`prod` stack config; no secrets; provider-agnostic only.
- `.github/workflows/infra-preview.yml` — PR/push preview/diff-only, non-mutating, least perms (`contents: read`), no `pull_request_target`, SHA-pinned, artifact + step-summary upload.
- `.github/workflows/deploy.yml` — `workflow_dispatch`-only (`stack: dev|prod`), protected `environment: ${{ inputs.stack }}`, no auto-trigger, no `pulumi destroy`, least perms, SHA-pinned, artifact + step-summary upload.
- `scripts/ci/pulumi/validate-pulumi-scaffold.mjs` — Pulumi-specific static validator (Node ESM, zero deps) enforcing N1–N9; fails closed with rule-named diagnostics.
- `docs/deployment/README.md`, `docs/deployment/pulumi.md` — deployment model docs (domain-neutral).

Immutable action SHAs (resolved from named tags via the GitHub API at authoring time; validator rejects moving tags/`@latest`/`@main`):
- `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5` (v4.3.1)
- `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020` (v4.4.0)
- `pnpm/action-setup@a7487c7e89a18df4991f7f222e4898a00d66ddda` (v4.1.0)
- `actions/upload-artifact@4cec3d8aa04e39d1a68397de0c4cd6fb9dce8ec1` (v4.6.1)

## Stage 4 — Witnesses — all deterministic/static GREEN; live seam `pending-live`

### 4.1 Positive (real-boundary)

| Witness | Command | Exit | Artifact |
| --- | --- | --- | --- |
| W-PROG-COMPILE | `node_modules/.bin/tsc -p infra/pulumi/tsconfig.json --noEmit` | **0** | `evidence/w-prog-compile.txt` (typescript 5.9.3, I-20S-declared `@pulumi/pulumi@3.248.0`) |
| W-PROVIDER-AGNOSTIC | structural import/ctor scan over `infra/pulumi/index.ts` | PASS | `evidence/w-provider-agnostic.txt` (imports=`["@pulumi/pulumi"]`, 0 provider imports, no ctor) |
| W-STACKS | de-commented parse of `Pulumi.dev.yaml`/`Pulumi.prod.yaml` + secret scan | PASS | `evidence/w-stacks.txt` (both parse, no plaintext secret) |
| W-PREVIEW-WORKFLOW-STATIC | validator over real `infra-preview.yml` | **0** | `evidence/w-workflows-yaml.txt` |
| W-DEPLOY-WORKFLOW-STATIC | validator over real `deploy.yml` | **0** | `evidence/w-workflows-yaml.txt` |
| Validator positive (combined) | `node scripts/ci/pulumi/validate-pulumi-scaffold.mjs --infra infra/pulumi --workflows .github/workflows/infra-preview.yml .github/workflows/deploy.yml` | **0** | "PASS — provider-agnostic + conformant workflows, no N1-N9 violation." |
| W-LIVE-PREVIEW | `pulumi preview` (dev/prod) via Pulumi Cloud | n/a | **`pending-live/BLOCKED`** — `evidence/w-live-preview.txt` |

**W-LIVE-PREVIEW — pending-live/BLOCKED (expected; NOT faked):** `pulumi whoami` / `pulumi stack select dev` / `pulumi preview` all fail with a backend auth/endpoint error (no Pulumi Cloud login; `PULUMI_ACCESS_TOKEN` unset; project/stacks not initialized). Exact missing prerequisites recorded. Per the quality bar (shape-green ≠ truth-green), this is **not** substituted with `act`/mocked Pulumi/synthetic fixtures. The live preview/deploy proof is **I-20D-owned**. This is the documented acceptable closure state for I-20C.

### 4.2 Negative (N1–N9 — each FAILS CLOSED, rule named)

Driver: `node scripts/ci/pulumi/validate-pulumi-scaffold.mjs --infra <fixture-infra|real> --workflows <fixture|real>`. All 11 fixtures exit **1** and name the target rule:

| Neg | Fixture | Expected rule | Exit | Named |
| --- | --- | --- | --- | --- |
| N1 | `negative/n1-provider-infra/` (@pulumi/aws dep + import + ctor + `aws:region`) | N1 | 1 | ✅ N1 |
| N2-secret | `negative/n2-secret-infra/` (plaintext `database-password`/`api-token`) | N2 | 1 | ✅ N2 |
| N2-backend | `negative/n2-backend-infra/` (`backend: url: file://`) | N2 | 1 | ✅ N2 |
| N3 | `negative/infra-preview-mutation.yml` (`pulumi up` in PR workflow) | N3 | 1 | ✅ N3 |
| N4 | `negative/deploy-bad-auto.yml` (`on: push` auto-trigger) | N4 | 1 | ✅ N4 |
| N5-dispatch | `negative/deploy-bad-no-dispatch.yml` (no `workflow_dispatch`) | N5 | 1 | ✅ N5 |
| N5-env | `negative/deploy-bad-no-env.yml` (no `environment:` binding) | N5 | 1 | ✅ N5 |
| N6 | `negative/deploy-bad-destroy.yml` (`pulumi destroy`) | N6 | 1 | ✅ N6 |
| N7 | `negative/deploy-bad-no-login.yml` (`pulumi up` w/o `pulumi login`) | N7 | 1 | ✅ N7 |
| N8 | `negative/deploy-bad-perms.yml` (`contents: write`, `packages: write`) | N8 | 1 | ✅ N8 |
| N9 | `negative/deploy-bad-unpinned.yml` (`actions/checkout@v4`) | N9 | 1 | ✅ N9 |

Summary: **pass=11 fail=0**. (Some auto-deploy fixtures legitimately also trip the entangled N3 "auto-triggered + mutating" rule — that is a real, desirable combined detection, not a false positive.)

### 4.3 Regression (R1–R3)

- R1: project remains `vibe-engineer`; two-repo direction preserved; scaffold vocabulary domain-neutral. ✅
- R2: deployment defaults match DL-18B / locked-decisions §10 / §5.15 — Pulumi TS, Pulumi Cloud, no default provider, dev/prod, no per-PR preview, PR preview/diff-only, manual/protected deploy, no auto-deploy, no default destroy. ✅
- R3: local/CI parity — same Pulumi CLI (pinned `3.248.0` matching I-20S SDK) and same program locally and in workflows; no CI-only bespoke path. ✅

## Stage 5 — Dirty-tree scope confirmation (only owned paths touched)

`git status --porcelain` for I-20C surfaces only new (untracked) owned paths:
- `?? infra/` (I-20C program files; I-20S `package.json`+`node_modules` are the pre-existing baseline within it — **unchanged by I-20C**)
- `?? .github/` (only `infra-preview.yml` + `deploy.yml` authored by I-20C; `quality.yml` is I-20B's, untouched)
- `?? docs/deployment/`
- `?? scripts/` (only `scripts/ci/pulumi/**` authored by I-20C; `scripts/quality/**`, `scripts/ci/quality/**` are I-20A/I-20B's, untouched)
- `?? .vibe/work/I-20C-pulumi-scaffold-preview-deploy/`

No I-20C path appears as Modified/Added-staged/Renamed/Deleted — **all I-20C deliverables are new files**; zero pre-existing file was modified. The broader dirty tree (I-18B baseline, I-12/I-13 work dirs, I-20S root manifest changes, DL-18P/I-10C-AGG work dirs, sibling I-20A/I-20B files) is the permanent baseline and was **not** touched. No git stash/reset/clean/checkout/restore/commit/push performed.

Confirmed: `infra/pulumi/package.json` content is byte-identical to the I-20S handoff (`@pulumi/pulumi: 3.248.0`).

## Stage 6 — Sibling / blast-radius

- **`.github/workflows/**` (shared dir):** I-20C authored only `infra-preview.yml` + `deploy.yml`, file-disjoint from I-20B's `quality.yml`/`release-candidate.yml`. No concurrent-edit collision.
- **`scripts/ci/**`:** I-20C authored only `scripts/ci/pulumi/` (sibling to I-20B's `scripts/ci/quality/`). No override of I-20A/I-20B surfaces.
- **`infra/pulumi/**`:** I-20C authored program/config files only; the manifest/lock (`package.json`, lockfile) remain I-20S-owned and read-only. No dependency added/changed → no serialized-surface ruling needed.
- **Root manifests/workspace/turbo:** untouched (I-20S/I-00A owned). The Pulumi program consumed the I-20S-declared dep as-is; no unmet dependency → no STOP/BLOCKED.
- **`docs/decisions/**`:** read-only (DL-18B/DL-18/DL-22); not edited.

## Stage 7 — Deferred debts

- **Live Pulumi preview/deploy seam → `pending-live/BLOCKED`, owned by I-20D** (`ci-pulumi-real-boundary-validation`). Not faked. I-20D must close: actual `pulumi preview`/`pulumi up` against Pulumi Cloud for dev/prod, actual protected-environment approval proof, with real credentials/backend.
- **Protected GitHub Environments `dev`/`prod` + `PULUMI_ACCESS_TOKEN` secret:** operator one-time setup described in `docs/deployment/README.md`; not realizable in this environment.
- No deterministic/static debt remains.

## Stage 8 — Severity self-assessment (implementer; independent revalidation is Triad-C's role)

- No `critical`: no provider/region/default resource; no committed secret / no unapproved backend; PR workflow non-mutating; no auto-deploy; deploy is manual + protected-env; no `pulumi destroy`; no serialized-surface edit; no false live claim; no faked seam; DL-18B present.
- No `major-local`: scaffold complete (dev+prod, backend, docs); all N1–N9 negatives proven fail-closed; workflows carry artifact + summary upload; no ownership ambiguity; live witness explicitly recorded `pending-live` (I-20D).
- Validator underwent two real-bug fixes during authoring (comment-stripping before structural scans; inline-vs-block `permissions:` newline handling; missing-`package.json` robustness) — all confirmed by re-running the full positive + 11-negative matrix (pass=11 fail=0).

**Closure state:** I-20C is **truth-green for its owned deterministic/static surface**; the live preview/deploy seam is explicitly `pending-live` (I-20D-owned), not falsely claimed green. This matches the brief's `clean` definition for I-20C.
