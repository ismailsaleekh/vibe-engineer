# DL-18B — Pulumi + Deployment Defaults

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-26
- owner_lane: DL-18P-pulumi-deployment-defaults-reconciliation (decision / context lane)
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-18B-pulumi-deployment-defaults.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-18P-pulumi-deployment-defaults-reconciliation/DL-18P-execution-report.md`
- brief_path: `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/DL-18P-brief-generated.md`
- pre_I20_gate: DL-18P PASS is one of the 8 pre-`I-20S` gates (amendment §2 DAG); this record is the decision source consumed by `I-20C` (`pulumi-scaffold-preview-deploy`) and `I-20D` (`ci-pulumi-real-boundary-validation`).

## Source citations

Primary content authority (locked provider/deploy defaults — read in full):

- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — **§10 `CI/CD and deployment defaults`** (subsections: _Deployment and infrastructure-as-code_, _Deployment environments_, _Release/deploy trigger_).
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — **§5.15 `CI/CD and deployment verification`** (locked defaults + the complete 8-rule hard-failure set).
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — **§7 `Quality wiring-integrity gate`** (deployment/deploy/destroy mechanical clauses).

Lane spec (the contract this record realizes):

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/post-i18b-ready-queue-validated.md` — §4.1 (DL-18P row: verification target), §6 (DL-18P ownership row).
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/i-20-strategy-amendment.md` — §3 (DL-18P required content, verbatim), §1 last paragraph (create-new-artifact branch locked), §7 (closure), §2 (split DAG: DL-18P PASS is a pre-I-20 gate).

Format model + scope-complement sibling (read-only; mirrored + cross-linked, NOT edited):

- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-18-ci-cd-defaults.md` — sibling locked decision record; **DL-18 owns CI/CD provider + local/CI parity defaults; DL-18B owns the Pulumi + deployment defaults specifically. The two are complementary, not contradictory.**

Quality bar (binding, verbatim-prepended):

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

`vibe-engineer` v1 locks **Pulumi TypeScript** as the default IaC scaffold and **Pulumi Cloud** as the default backend, **provider-agnostic** with **no default cloud / provider / region / deployment target**, default environments **`dev`** and **`prod`**, **no per-PR preview environments**, a **PR infrastructure workflow that is preview/diff-only and non-mutating**, a **deploy workflow that is `workflow_dispatch`-only, manual, and protected by GitHub Environment approval**, **no auto deploy/publish on PR / push / merge / tag by default**, and **no default `pulumi destroy`** (any destructive break-glass flow requires protected manual approval and explicit future ownership).

This record exists so `I-20C` (scaffold + workflows) and `I-20D` (real-boundary validation) have one authoritative decision target to implement and verify against, rather than inferring deployment truth from orchestration docs. It is **decision/context only**: it produces no runtime seam, no workflow files, no Pulumi code. Per the amendment §1 create-new-artifact branch, this is a dedicated target decision artifact for Pulumi/deployment defaults; it does **not** amend `DL-18-ci-cd-defaults.md`.

## Decision details

Each item below restates a locked default with its verbatim source string and section. Every item is traceable to a verbatim string in `locked-decisions.md §10` and/or `verification-layer.md §5.15` and/or `mechanical-verification-gates.md §7`.

### 1. Default IaC engine: Pulumi TypeScript

- **Decision:** `Pulumi TypeScript` is the v1 default IaC engine for generated deployment scaffolding.
- **Verbatim source:**
  - `locked-decisions §10`: _"Default IaC engine for generated deployment scaffolding: `Pulumi TypeScript`."_
  - `verification-layer §5.15`: _"Deployment IaC: Pulumi TypeScript."_

### 2. Default Pulumi backend: Pulumi Cloud

- **Decision:** `Pulumi Cloud` is the default Pulumi backend. Self-managed state backends are a future/explicit-override surface, **not** the default.
- **Verbatim source:**
  - `locked-decisions §10`: _"Default Pulumi backend: `Pulumi Cloud`."_ / _"Self-managed Pulumi state backends can be supported later or by explicit project override, but they are not the default."_
  - `verification-layer §5.15`: _"Pulumi backend: Pulumi Cloud by default."_

### 3. No default cloud / provider / region / deployment target (provider-agnostic)

- **Decision:** v1 scaffold stays **provider-agnostic**. It must not hard-code a default deployment target, cloud provider, or region until a project chooses AWS, GCP, Azure, Kubernetes, or another provider.
- **Verbatim source:**
  - `locked-decisions §10`: _"Pulumi is provider-based. v1 must **not** hard-code a default deployment target or cloud provider. Generated Pulumi scaffolding should remain provider-agnostic until a project chooses AWS, GCP, Azure, Kubernetes, or another provider."_
  - `verification-layer §5.15`: _"No default cloud/deployment target; provider selection is project-specific."_

### 4. Default environments: `dev` and `prod`

- **Decision:** the default generated deployment environments are `dev` and `prod`.
- **Verbatim source:**
  - `locked-decisions §10` (_Deployment environments_): default environments `dev` / `prod`.
  - `verification-layer §5.15`: _"Default environments: `dev` and `prod`."_

### 5. No per-PR preview environments by default

- **Decision:** per-PR preview environments are **not** part of v1 defaults.
- **Verbatim source:**
  - `locked-decisions §10`: _"Per-PR preview environments are not part of v1 defaults."_
  - `verification-layer §5.15`: _"No per-PR preview environments by default."_

### 6. PR infrastructure workflow is preview/diff-only and non-mutating

- **Decision:** PR CI may run a **non-mutating** Pulumi preview/diff. A PR workflow that deploys or mutates infrastructure is a hard failure.
- **Verbatim source:**
  - `locked-decisions §10`: _"PR CI may run a non-mutating Pulumi preview/diff."_
  - `verification-layer §5.15` (Hard failures): _"PR workflow deploys or mutates infrastructure."_ (this is a failure condition)
  - `mechanical-verification-gates §7`: _"deployment workflows are manual/protected and cannot auto-deploy from PRs, pushes, or merges by default;"_ and _"PR infrastructure workflows are preview/diff-only and cannot mutate infrastructure;"_

### 7. Deploy workflow is `workflow_dispatch`-only, manual, and protected by environment approval

- **Decision:** release/deploy is **manual**. Deploy workflows require explicit user trigger (`workflow_dispatch`) and protected GitHub Environment approval for `dev`/`prod`. A deploy workflow lacking manual trigger or protected environment approval is a hard failure.
- **Verbatim source:**
  - `locked-decisions §10`: _"Release/deploy is manual. A user must explicitly trigger the release/deploy readiness command or skill…"_ and _"Deploy workflows require explicit user trigger and protected environment approval."_
  - `verification-layer §5.15`: _"Release/deploy is manual through an explicit user-triggered readiness/deploy command or skill."_; Hard failure: _"deploy workflow lacks manual trigger or protected environment approval."_
  - `mechanical-verification-gates §7` (Mechanical failures): _"deployment workflow lacks manual trigger or protected environment approval;"_

### 8. No auto deploy/publish on PR, push, merge, or tag by default

- **Decision:** PRs, pushes, merges, **and tags** must not auto-deploy/publish by default. Auto-deploy from any of these is a hard/mechanical failure.
- **Verbatim source:**
  - `locked-decisions §10`: _"…PRs, pushes, and merges must not auto-deploy by default."_
  - `mechanical-verification-gates §7`: _"deployment workflows are manual/protected and cannot auto-deploy from PRs, pushes, or merges by default;"_ and Mechanical failure _"PR/push/merge workflow can deploy or mutate infrastructure by default;"_
  - `i-20-strategy-amendment §3` extends the set to include _tag_ (strict superset of locked-decisions §10; not contradicted by it).

### 9. No default `pulumi destroy`; break-glass requires protected manual approval

- **Decision:** there is no default `pulumi destroy`. Any destructive break-glass flow requires protected manual approval and explicit future ownership. A `pulumi destroy` available outside an explicit protected/manual break-glass flow is a hard failure and a mechanical wiring failure.
- **Verbatim source:**
  - `verification-layer §5.15` (Hard failures): _"`pulumi destroy` is available outside an explicit protected/manual break-glass flow."_ (failure condition)
  - `mechanical-verification-gates §7` (Mechanical failures): _"Pulumi destroy/break-glass flow is available without explicit protected manual approval;"_
  - (`locked-decisions §10` is silent on destroy; DL-18B does not cite it for this item.)

## Scope boundary vs DL-18 (CI/CD Provider Defaults)

To keep exactly one source of truth with no contradictory restatement:

| Topic                           | DL-18 (CI/CD provider + parity)                                      | DL-18B (Pulumi + deployment)                                                                                        |
| ------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| CI provider / local↔CI parity   | **Owner:** GitHub Actions, aggregate `pnpm quality` parity contract. | Consumer (does not redefine CI provider).                                                                           |
| Deployment IaC engine           | Restates as part of CI/CD context.                                   | **Owner:** `Pulumi TypeScript` default locked here.                                                                 |
| Pulumi backend                  | n/a                                                                  | **Owner:** `Pulumi Cloud` default locked here.                                                                      |
| Default environments            | n/a                                                                  | **Owner:** `dev`/`prod`.                                                                                            |
| Deploy trigger / no-auto-deploy | Touches "no push/PR/publication without approval" for release.       | **Owner:** deploy = `workflow_dispatch` + protected env; no auto-deploy on PR/push/merge/tag; PR preview/diff-only. |
| `pulumi destroy`                | n/a                                                                  | **Owner:** no default; protected break-glass only.                                                                  |

Where both records touch the same deployment fact (Pulumi TS, Pulumi Cloud, `dev`/`prod`, manual deploy, no per-PR preview, no auto-deploy), **DL-18B agrees with and cross-links DL-18** rather than restating a divergent value. DL-18 remains the authoritative owner of the CI provider and the local/CI parity contract; DL-18B is the authoritative owner of the Pulumi + deployment defaults. See: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-18-ci-cd-defaults.md`.

## Consumer lanes (gated on DL-18P PASS)

This record is decision truth consumed by implementation/verification lanes — it is **not** itself an implementation:

- **`I-20C` (`pulumi-scaffold-preview-deploy`)** — implements the actual Pulumi scaffold, the preview/diff PR workflow, the manual `workflow_dispatch` deploy workflow with protected GitHub Environments for `dev`/`prod`, and the absence of a default destroy. Blocked until DL-18P PASS.
- **`I-20D` (`ci-pulumi-real-boundary-validation`)** — verifies the implemented Pulumi/deployment surface real-boundary (actual workflow YAML, actual protected-environment approvals, actual preview/diff non-mutation, actual absence of auto-deploy, actual destroy break-glass gating) against this record. Blocked until DL-18P PASS.
- **`I-20S`** (I-20 launch) — per amendment §2 DAG, DL-18P PASS is one of the 8 pre-`I-20S` gates.

## Implementation / verification obligations for I-20C / I-20D (NOT DL-18P deliverables)

DL-18P locks decision truth only. The following `verification-layer §5.15` hard failures must be **satisfied by I-20C (implementation) and I-20D (verification)** once the deployment surface exists — they are listed here for traceability, **not** as DL-18P deliverables, so this record does not over-reach into I-20-owned implementation:

1. Default CI exceeds the quick-gate budget without explicit reclassification.
2. CI invokes full E2E / full mobile / full visual verification by default.
3. PR workflow deploys or mutates infrastructure. **(= DL-18B item #6 — also DL-18P decision content.)**
4. Deploy workflow lacks manual trigger or protected environment approval. **(= DL-18B item #7.)**
5. Pulumi uses plaintext committed secrets or an unapproved backend. (Backend default `Pulumi Cloud` is locked in item #2; secrets handling is owned by DL-22/I-18.)
6. Workflow permissions are broader than required.
7. `pulumi destroy` is available outside an explicit protected/manual break-glass flow. **(= DL-18B item #9 — also DL-18P decision content.)**
8. A project claims deployment readiness without preview/result evidence.

The deployment-surface facts that **are** DL-18P decision content are items #6, #7, #9 (and the defaults #1–#5, #8). The remaining hard failures (#1, #2, #5-secrets, #6-perms, #8-evidence above) are I-20C/I-20D implementation/verification obligations, not DL-18P scope.

## Alternatives considered

### Amend DL-18 in place vs create a dedicated DL-18B artifact

- decision: **create DL-18B (accepted).**
- rationale: amendment §1 (last paragraph) explicitly locks the "create a dedicated target decision artifact for Pulumi/deployment defaults rather than forcing I-20 to infer from orchestration docs" branch, and warns that amending `DL-18-ci-cd-defaults.md` instead "is a new explicit ruling and must be revalidated." Creating DL-18B gives I-20C/I-20D a single authoritative target and keeps DL-18 focused on CI/CD provider + parity.
- consequences: two complementary records (DL-18 + DL-18B) cross-linked; no contradiction.

### Pulumi vs an alternative IaC engine

- decision: Pulumi (accepted), consistent with `locked-decisions §10`.
- rationale: locked source names `Pulumi TypeScript` as the v1 default; DL-18P restates locked truth and does not re-open the choice.
- consequences: alternatives (Terraform raw, CDK, etc.) are out of scope and not v1 defaults.

### Pulumi Cloud vs self-managed backend as default

- decision: Pulumi Cloud as default (accepted); self-managed as future/explicit-override (rejected for v1 default).
- rationale: `locked-decisions §10` and `verification-layer §5.15` lock `Pulumi Cloud by default`.

### Auto-deploy on merge/tag vs manual deploy

- decision: manual deploy only (accepted); auto-deploy rejected.
- rationale: `locked-decisions §10` + `mechanical-verification-gates §7` + `i-20-strategy-amendment §3` lock no-auto-deploy on PR/push/merge/tag.

### Default `pulumi destroy` vs protected break-glass only

- decision: no default destroy; protected manual break-glass only (accepted).
- rationale: `verification-layer §5.15` + `mechanical-verification-gates §7` make an ungated destroy a hard/mechanical failure.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-18-ci-cd-defaults
      type: decision
      required_status: LOCKED/PASS
      rationale: Sibling CI/CD provider + local/CI parity owner; DL-18B is complementary and cross-linked, never contradictory.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: locked-decisions §10, verification-layer §5.15, and mechanical-verification-gates §7 define the deployment defaults DL-18B restates.
    - id: i-20-strategy-amendment
      type: lane_spec
      required_status: AVAILABLE
      rationale: §3 defines DL-18P required content; §1 locks the create-new-artifact branch; §2 makes DL-18P PASS a pre-I-20 gate.
    - id: post-i18b-ready-queue-validated
      type: lane_spec
      required_status: AVAILABLE
      rationale: §4.1 defines the DL-18P verification target; §6 defines ownership/write paths.
  blocks:
    - id: I-20C-pulumi-scaffold-preview-deploy
      reason: Needs locked Pulumi + deployment defaults to implement scaffold/workflows against.
    - id: I-20D-ci-pulumi-real-boundary-validation
      reason: Needs locked defaults to verify the implemented deployment surface real-boundary.
    - id: I-20S
      reason: DL-18P PASS is one of the 8 pre-I-20 gates (amendment §2 DAG).
  blocked_dependents:
    - id: I-20C-pulumi-scaffold-preview-deploy
      blocked_until: DL-18P is independently validated clean.
      relying_on: Pulumi TS default, Pulumi Cloud backend, dev/prod, no per-PR preview, PR preview/diff-only, manual workflow_dispatch deploy + protected env, no auto-deploy, no default destroy.
    - id: I-20D-ci-pulumi-real-boundary-validation
      blocked_until: DL-18P is clean AND I-20C implementation exists.
      relying_on: same decision target as the real-boundary verification input.
    - id: I-20S
      blocked_until: All 8 pre-I-20 gates (incl. DL-18P) PASS.
      relying_on: DL-18B as the authoritative deployment decision source.
  required_before_finalizing:
    - id: I-20C-pulumi-scaffold-preview-deploy
      required_content: Actual Pulumi scaffold + PR preview/diff workflow + manual deploy workflow + protected environments + no default destroy.
    - id: I-20D-ci-pulumi-real-boundary-validation
      required_content: Real-boundary witnesses proving the implemented surface matches this record.
  deferrals:
    - deferred_question: Exact Pulumi program/project structure, provider plugin wiring, and protected GitHub Environment names.
      rationale: Implementation detail owned by I-20C, not DL-18P decision truth.
      future_owner: I-20C-pulumi-scaffold-preview-deploy
      allowed_now: true
      blocked_dependents:
        - I-20D real-boundary closure until I-20C material exists
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact break-glass destroy workflow mechanics and approver identity.
      rationale: Operational/governance detail owned by I-20C + operator, not DL-18P.
      future_owner: I-20C-pulumi-scaffold-preview-deploy / operator
      allowed_now: true
      blocked_dependents:
        - I-20D destroy-flow witness until mechanics are real
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-18B-pulumi-deployment-defaults.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-18P-pulumi-deployment-defaults-reconciliation/**
  read_only_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-18-ci-cd-defaults.md
    - /Users/lizavasilyeva/work/harness-starter/docs/**
    - /Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/**
  untouchable_paths:
    - ALL /Users/lizavasilyeva/work/vibe-engineer/** EXCEPT the two owned WRITE paths (every other docs/decisions/*.md, all source, all workflows, all manifests)
    - /Users/lizavasilyeva/work/harness-starter/**
    - .git/** on both repos
  handoff_notes:
    - from: DL-18P
      to: I-20C-pulumi-scaffold-preview-deploy
      condition: After DL-18P independent validation is clean.
      shared_path_policy: disjoint (DL-18P owns only this decision artifact + work tree; I-20C owns implementation files).
    - from: DL-18P
      to: I-20D-ci-pulumi-real-boundary-validation
      condition: After DL-18P clean AND I-20C implementation exists.
      shared_path_policy: disjoint.
```

## Blocked dependents

- `I-20C` (`pulumi-scaffold-preview-deploy`): primary implementation consumer; blocked until DL-18P PASS.
- `I-20D` (`ci-pulumi-real-boundary-validation`): primary verification consumer; blocked until DL-18P PASS and I-20C material exists.
- `I-20S` (I-20 launch): blocked until all 8 pre-I-20 gates, including DL-18P, PASS.

## Evidence checklist

1. Execution report created before this decision artifact and updated after source inspection.
2. Source files inspected are listed in `Source citations` (locked §10, verification §5.15, mechanical §7, amendment §3, queue §4.1/§6, sibling DL-18).
3. Files changed are limited to this decision artifact and the DL-18P execution report.
4. No production/package/root/config/CI/workflow/source/starter files were touched; `DL-18-ci-cd-defaults.md` was not edited.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. All 9 required content items (§6 of the brief) are present, each with a verbatim source string + section.
7. Scope boundary vs DL-18 is declared and cross-linked; no contradictory restatement.
8. Consumer lanes (I-20C/I-20D/I-20S) and the pre-I-20-gate role are recorded.
9. I-20C/I-20D implementation/verification obligations are clearly marked as downstream, not DL-18P deliverables (no over-reach).
10. No git mutations and no package-manager operations were performed.

## Validation plan and severity policy

Independent Triad revalidation must inspect the actual changed/owned files and run the witnesses, not just this report.

### Positive witnesses

- Decision artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-18B-pulumi-deployment-defaults.md` and is newly created.
- Each of the 9 content items (Pulumi TypeScript; Pulumi Cloud; provider-agnostic / no default cloud/target; `dev`/`prod`; no per-PR preview; PR preview/diff non-mutating; deploy `workflow_dispatch` + protected env; no auto-deploy on PR/push/merge/tag; no default `pulumi destroy`) is present and verbatim-grounded in locked §10 / verification §5.15 / mechanical §7.
- Canonical decision-record sections mirror the DL-18 sibling shape.
- Scope boundary vs DL-18 is declared; consumer lanes recorded; no over-reach.

### Negative witnesses

- Any of the 9 content items missing, materially misstated, or contradicted by locked §10 / verification §5.15 / mechanical §7 → **critical**.
- Any write outside the two owned paths → **critical**.
- Any git mutation / package-manager op → **critical**.
- Any edit to `DL-18-ci-cd-defaults.md` or any other untouchable file → **critical**.
- A false claim that DL-18P is itself a deployment _implementation_ → **critical**.
- A content item present but weakly/ambiguously grounded (no verbatim source string) → **major-local**.
- A cross-record inconsistency with DL-18 that does not rise to a contradiction → **major-local**.

### Regression witnesses

- `locked-decisions §10` deployment facts remain the sole authority; DL-18B restates, does not contradict.
- DL-18 remains the CI/CD provider + local/CI parity owner; DL-18B is complementary.
- No new dependency, workflow file, or runtime seam is introduced by DL-18P.

### Sibling/blast-radius checks

- Re-read `locked-decisions §10`, `verification-layer §5.15`, `mechanical-verification-gates §7` against every content item.
- Confirm `DL-18-ci-cd-defaults.md` is unchanged (`git status`).
- Confirm changed paths are limited to the two DL-18P owned paths.
- Confirm `docs/decisions/DL-18B-pulumi-deployment-defaults.md` is the only new file under `docs/decisions/`.

### Severity policy

- `critical`: a content item missing/misstated/contradicted; write outside owned paths; git/package-manager mutation; edit to an untouchable file; false implementation claim.
- `major-local`: weak/ambiguous grounding; missing canonical section; non-contradictory cross-record inconsistency.
- `minor-local`: non-blocking citation/format nits weakening no content item and no witness.
- `clean`: all content, grounding, scope, and ownership requirements satisfied.

## Known ambiguities / future owners

- Exact Pulumi program/project structure, provider plugin wiring, and protected GitHub Environment names → `I-20C`.
- Exact break-glass destroy workflow mechanics and approver identity → `I-20C` / operator.
- Exact secrets/permissions policy for deploy workflows → `DL-22` / `I-18` (secrets) and `I-20C` (workflow permissions), verified by `I-20D`.
- Self-managed Pulumi backends → future/explicit project override, not v1 default.
