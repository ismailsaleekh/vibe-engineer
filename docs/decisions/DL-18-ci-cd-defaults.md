# DL-18 — CI/CD Provider Defaults

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-18 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-18-ci-cd-defaults.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-18-ci-cd-defaults/DL-18-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 `Decision-lock table`; §6.2 `Implementation DAG`; §9.2 `Decision triad ownership`; §9.3 `Implementation lane ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§14–18 evidence, dirty-tree, closure, and severity requirements.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §5 `DAG and ready-queue safety check`; §7 `Verification and real-boundary witness check`; §9 `Severity gate and closure criteria check`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Decision-artifact checklist`; `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Implementation enforcement plan`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md` — `Decision summary`; `Evidence packet requirements`; `Failure classification taxonomy`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-11-test-runner-tooling.md` — `Decision summary`; `Locked tool choices and policies`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-12-mobile-e2e-details.md` — `Decision summary`; `Decision details`; `Blocked dependents`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-13-ui-verification-stack.md` — `Decision summary`; `UI verification stack requirements`; `Blocked dependents`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-15-mechanical-engine.md` — `Decision summary`; `Gate-family matrix`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-19-open-source-governance.md` — `Decision summary`; `Release/versioning`; `Blocked dependents`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-22-security-safety-model.md` — `Decision summary`; `Generated env/config conventions`; `External integration safe defaults`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§2, 7, 9, 12–13, 16.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§2–3, §§8–11.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§1.1–1.6, §§3.3–3.4, §5.3a, §§5.10–5.14, §§13–14, §16.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1–7, §§11–13.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §18 `CI/CD provider defaults`; §19 `Open-source governance`; §22 `Security and safety model`; §23 `Observability defaults`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§0, 5.2, 10, 11.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

`vibe-engineer` v1 defaults to GitHub Actions for CI/CD. Provider-agnostic CI is a future extension surface, not the first implementation target.

The v1 invariant is local/CI parity: every blocking CI quality job must invoke the same root aggregate runner path that local agents and later build/ship paths invoke. CI may vary only provider metadata, environment labels, run ids, and evidence output directories. CI must not call divergent partial commands as the blocking truth.

Release automation is locked to safe mechanics only: manual release-candidate verification in GitHub Actions, using the same aggregate runner and governance/security checks. Actual package publication or public release remains blocked until governance files, security reporting paths, credentials, and operator approval exist.

## Decision details

### Provider default

1. GitHub Actions is the v1 default CI/CD provider because it matches the open-source harness baseline, supports PR checks, check annotations, artifact uploads, summaries, caches, branch protection, manual release workflows, and private vulnerability/reporting integrations required by related decisions.
2. V1 does not generate provider-agnostic CI templates first. A provider-neutral contract is expressed as semantic requirements in this decision; provider-specific implementation begins with GitHub Actions.
3. Future providers may be added only when they prove the same local/CI parity, evidence, security, artifact, and release constraints. A second provider may not weaken the GitHub Actions default or become a silent fallback.

### Canonical local aggregate command and runner

`I-20-ci-local-parity-wiring` must implement this exact v1 command contract unless a later decision supersedes DL-18 with equal or stronger proof:

- Root package script: `quality`.
- Canonical local command: `pnpm quality -- --profile=ci --evidence-dir <evidence-dir> --summary-out <summary-json>`.
- Canonical runner path behind the script: `scripts/quality/run-quality.mjs` or a typed equivalent under `scripts/quality/**` owned by `I-20`.
- CI workflow invocation: a GitHub Actions quality job must invoke the root script, not direct `turbo`, `vitest`, `playwright`, `maestro`, `detox`, mechanical, security, docs, or build commands as the blocking aggregate truth.
- Allowed local/CI differences: evidence directory, run id, provider metadata, redacted CI environment fields, concurrency labels, and artifact upload transport.
- Forbidden differences: omitting a required runner, changing blocking/advisory semantics, bypassing the DL-10 evidence model, skipping governed paths, using CI-only bespoke scripts, using local-only unpinned tools, or converting deterministic failures to warnings.

The aggregate runner must dispatch or verify all required quality layers through the DL-10 verification semantics and DL-15 mechanical aggregate semantics. It may internally use package scripts, Turborepo tasks, or runner-specific commands, but those are implementation details behind the same aggregate path.

### Required quality surfaces

The aggregate CI/local path must account for these domain-neutral surfaces when they exist:

- backend/API and contract/provider/client checks;
- web build, component, E2E, and UI verification checks;
- mobile component, Maestro, Detox, and mobile UI artifact checks;
- shared packages, schemas, adapters, CLI, skills, schematics, context, registry, verification, mechanical gates, security, observability, and docs/reference checks;
- starter/reference fixtures and generated harness-consumption witnesses;
- release-candidate package/build checks.

Missing surfaces are not silently skipped. A surface can be `not_applicable` only when the aggregate runner emits machine-readable evidence explaining the absent implemented surface or a `blocked` state naming the missing owner.

## Alternatives considered

### GitHub Actions as v1 default

- decision: accepted.
- rationale: best matches open-source repository defaults, PR checks, artifact/summary support, branch protection, manual release workflows, and private security-reporting coordination.
- consequences: `I-20` owns GitHub Actions workflow implementation and static validation; future providers remain extension work.

### Provider-agnostic templates first

- decision: rejected for v1.
- rationale: starting with multiple templates would dilute the parity proof and increase shape-green risk before one provider is proven end to end.
- consequences: DL-18 defines provider-neutral semantics, but implementation starts with GitHub Actions.

### Local-only verification with CI later

- decision: rejected.
- rationale: final strategy and mechanical wiring doctrine require local/CI parity before downstream build/ship closure.
- consequences: `I-20`, `I-21`, `I-22`, `I-23`, and final closure remain blocked until CI invokes the same aggregate runner.

### Multi-provider CI from day one

- decision: rejected.
- rationale: multi-provider support is valuable but not required to prove v1. It risks duplicating commands and masking provider-specific skips.
- consequences: future provider extensions must pass the same validation suite and may not become required for v1 closure.

### Release pipeline fully in v1 vs deferred/limited by governance dependencies

- decision: accepted as limited v1 release-candidate mechanics; publication enablement is gated.
- rationale: DL-19 locks SemVer/changelog/governance policy, so CI can verify release candidates now. Actual publication requires governance files, security reporting, credentials, and operator approval that are not produced by DL-18.
- consequences: release-candidate CI mechanics are locked; public release/package publication remains blocked until required owners provide proof.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies required decision artifact schema, dependency declaration, evidence checklist, validator checklist, real-boundary policy, and dirty-tree safety.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies domain-neutral core/extension/sample-demo boundary and vocabulary policy for CI defaults.
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms final strategy has no unresolved critical or major planning defects.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: Strategy, README, locked decisions, verification layer, mechanical gates, backlog, playbook, and quality bar define CI/CD requirements.
    - id: DL-10-verification-implementation
      type: decision
      required_status: LOCKED
      rationale: Defines verification runner/evidence/failure semantics consumed by CI.
    - id: DL-11-test-runner-tooling
      type: decision
      required_status: LOCKED
      rationale: Defines test runner families that CI must transport without redefining.
    - id: DL-12-mobile-e2e-details
      type: decision
      required_status: LOCKED
      rationale: Defines mobile E2E artifacts and pending-live rules CI must preserve.
    - id: DL-13-ui-verification-stack
      type: decision
      required_status: LOCKED
      rationale: Defines UI artifact and deterministic/advisory policy CI must preserve.
    - id: DL-15-mechanical-engine
      type: decision
      required_status: LOCKED
      rationale: Defines aggregate mechanical runner and wiring-integrity requirements.
    - id: DL-19-open-source-governance
      type: decision
      required_status: LOCKED
      rationale: Defines SemVer, changelog, release, governance, and publication constraints.
    - id: DL-22-security-safety-model
      type: decision
      required_status: LOCKED
      rationale: Defines secrets, permissions, command safety, env, redaction, and CI security evidence constraints.
  blocks:
    - id: I-20-ci-local-parity-wiring
      reason: Needs provider default, aggregate runner contract, workflow invocation, caching, matrix, artifacts, summaries, release-candidate stance, and validation witnesses.
    - id: I-21-build-skill-orchestration
      reason: Build closure depends on CI/local parity through I-20.
    - id: I-22-ship-skill-orchestration
      reason: Ship closure depends on CI/local parity and no push/PR/publication without approval.
    - id: I-23-end-to-end-real-boundary-witness
      reason: Full witness reruns CI/local/build/ship evidence paths.
    - id: I-24-docs-reference-governance-polish
      reason: Docs must describe actual CI/release constraints after I-20/I-00 material exists.
    - id: final closure
      reason: Final closure requires deterministic gates passing locally and CI wiring proving parity.
  blocked_dependents:
    - id: I-20-ci-local-parity-wiring
      blocked_until: DL-18 is independently validated clean and I-09/I-10/I-12/I-13/I-18 prerequisites exist per strategy.
      relying_on: GitHub Actions default, aggregate command identity, workflow invocation requirements, cache/matrix/artifact/summary policy, and validation witnesses.
    - id: I-21-build-skill-orchestration
      blocked_until: I-20 is clean.
      relying_on: same aggregate runner/evidence/failure path available to build and CI.
    - id: I-22-ship-skill-orchestration
      blocked_until: I-20 and I-21 are clean.
      relying_on: final verification evidence, release/no-push safeguards, and CI summary artifacts.
    - id: I-23-end-to-end-real-boundary-witness
      blocked_until: I-20, I-21, I-22, and any pending-live mobile/provider proofs are clean or explicitly BLOCKED.
      relying_on: local aggregate to CI workflow seam.
    - id: public release/package publication
      blocked_until: governance files, private security reporting path, release credentials, provenance/signing policy if required, and explicit operator approval exist.
      relying_on: DL-19/DL-22/I-00/I-24/operator setup beyond DL-18.
  required_before_finalizing:
    - id: I-20-ci-local-parity-wiring
      required_content: Actual `.github/workflows/**`, `scripts/quality/**`, `scripts/ci/**`, `package.json`, and `turbo.json` wiring proving CI invokes `pnpm quality` and the same runner path.
    - id: I-09-verification-runner-evidence-failure-routing
      required_content: Actual verification runner and Evidence Packet writer consumed by CI.
    - id: I-10/I-12/I-13 mechanical lanes
      required_content: Aggregate mechanical gates and reports included in quality runner.
    - id: I-18-security-safety-hooks-policy
      required_content: Security gates and evidence included in quality runner and CI permissions.
    - id: DL-16-starter-architecture
      required_content: Exact starter/reference fixture paths and app/service names for CI matrix rows; absent at DL-18 time, so I-20 must block exact starter rows until available.
    - id: DL-23-observability-defaults
      required_content: Exact observability artifact names and tests; absent at DL-18 time, so I-20 must carry placeholder blocked/not-applicable evidence until available.
  deferrals:
    - deferred_question: Exact starter/reference fixture path names and app/service commands.
      rationale: Owned by DL-16/I-15/I-16/I-17; DL-18 locks CI integration requirements only.
      future_owner: DL-16-starter-architecture / I-15-I-17
      allowed_now: true
      blocked_dependents:
        - I-20 starter/reference matrix closure if exact paths are needed
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact observability defaults and artifact semantics.
      rationale: Owned by DL-23/I-19; DL-18 only requires CI transport/upload when observability evidence exists.
      future_owner: DL-23-observability-defaults / I-19-observability-defaults-tests
      allowed_now: true
      blocked_dependents:
        - observability CI row closure if DL-23/I-19 evidence semantics are unavailable
      invalid_if_any_dependent_relies: true
    - deferred_question: Actual public package publication credentials and operator release approval.
      rationale: Operational setup and governance/security evidence are outside DL-18 and cannot be assumed.
      future_owner: I-00/I-24/operator repository setup with DL-19/DL-22 constraints
      allowed_now: true
      blocked_dependents:
        - public release/package publication
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-18-ci-cd-defaults.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-18-ci-cd-defaults/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/** sibling and prerequisite decisions except DL-18
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/** sibling and prerequisite reports except DL-18
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-18 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - /Users/lizavasilyeva/work/vibe-engineer/.github/**
    - /Users/lizavasilyeva/work/vibe-engineer/scripts/**
    - /Users/lizavasilyeva/work/vibe-engineer/package.json
    - /Users/lizavasilyeva/work/vibe-engineer/pnpm-lock.yaml
    - /Users/lizavasilyeva/work/vibe-engineer/pnpm-workspace.yaml
    - /Users/lizavasilyeva/work/vibe-engineer/turbo.json
    - /Users/lizavasilyeva/work/vibe-engineer/tsconfig*
    - /Users/lizavasilyeva/work/vibe-engineer/packages/**
    - /Users/lizavasilyeva/work/vibe-engineer/apps/**
    - /Users/lizavasilyeva/work/vibe-engineer/examples/**
    - any non-DL-18 decision/report/work path
    - /Users/lizavasilyeva/work/harness-starter/**
  handoff_notes:
    - from: DL-18
      to: I-20-ci-local-parity-wiring
      condition: After DL-18 independent validation is clean and I-20 prerequisites are green.
      shared_path_policy: serialized
    - from: DL-18
      to: I-21/I-22/I-23/I-24
      condition: Downstream lanes consume I-20 evidence and do not reimplement CI policy.
      shared_path_policy: disjoint_or_serialized_by_strategy
```

## Blocked dependents

- `I-20-ci-local-parity-wiring`: primary blocked lane. It must implement GitHub Actions workflows and local scripts/root wiring from this decision and prove parity with actual files.
- `I-21-build-skill-orchestration`: blocked through `I-20` because build must consume the same verification/evidence semantics that CI uses.
- `I-22-ship-skill-orchestration`: blocked through `I-20` because ship must run final verification, prepare PR material, and never push/open PR or publish without approval.
- `I-23-end-to-end-real-boundary-witness`: blocked until the actual local aggregate → CI workflow seam is proven or live provider proof is explicitly pending-live/BLOCKED.
- `I-24-docs-reference-governance-polish` and final closure: blocked from documenting/claiming CI/release readiness until actual workflows/evidence exist.
- Public release/package publication: blocked until governance/security/operator prerequisites are real, not placeholders.

## Provider default and extension policy

### V1 default

- Provider: GitHub Actions.
- Required workflow classes for `I-20`: PR/branch quality workflow, optional scheduled/maintenance verification workflow if needed by later owners, and manual release-candidate workflow.
- Required default runner OS: Linux for general quality unless a surface requires macOS or Windows. Mobile iOS proof may require macOS; if unavailable, it is `pending-live/BLOCKED` rather than green.
- Required package manager: pnpm, pinned by lockfile and package manager metadata from root config owners.
- Required monorepo build carrier: Turborepo may be used behind the aggregate runner, but CI cannot call it as the sole top-level blocking proof unless it is invoked by the canonical aggregate runner.

### Extension boundary

Future providers may add provider-specific templates only through explicit extension manifests/docs and provider-owned validation fixtures. A provider extension must prove:

1. same aggregate runner command and profile;
2. same evidence schema and artifact upload categories;
3. same hard/advisory semantics;
4. same path-governance coverage or stricter fail-closed behavior;
5. same security permissions/secrets constraints;
6. same release-candidate gating and no-publication-without-approval policy;
7. positive, negative, and regression witnesses equivalent to the GitHub Actions default.

Provider extensions may add provider-specific summaries, caches, or annotations, but they must not become hidden core defaults or domain-specific project workflows.

## Local/CI parity contract

`I-20` must prove this seam:

- Producer: actual root local aggregate command `pnpm quality -- --profile=ci ...` and its actual runner implementation.
- Carrier: root `package.json` script, `scripts/quality/**` runner, `scripts/ci/**` static validators, `turbo.json` task graph where used, GitHub Actions workflow invocation, and Evidence Packets/artifacts.
- Consumer: GitHub Actions job semantics, static workflow validator, CI summary/check annotations, DL-10 failure router, and downstream build/ship/final validation.

Required details:

1. Aggregate command identity: the CI blocking quality job must invoke `pnpm quality` with `--profile=ci`; local parity witness must invoke the same script/profile.
2. Workflow invocation: workflow YAML must not call direct partial runner commands as the only required quality check. Direct per-surface commands are allowed only inside the aggregate runner or as non-authoritative diagnostics.
3. Path filters: v1 required quality workflow must run fail-closed on PRs/branches affecting the repository. If any path filter is introduced, a static validator must prove all governed source/config/docs/workflow/script/schema/contract/starter paths are included and that unmatched paths do not silently skip required quality. Otherwise path filters are forbidden for blocking quality.
4. Dependency pinning: package manager version, Node version, action references, runner dependencies, browser/device tooling, and package lockfiles must be pinned or derived from committed root config/lockfiles. Dynamic latest execution is rejected for blocking quality.
5. Environment variables: CI may set only domain-neutral, redacted, non-secret defaults for baseline verification. Required secrets for optional external integrations must be absent on untrusted PRs and must cause opt-in blocked/skipped-with-policy evidence rather than fake success.
6. Evidence paths: CI must write machine-readable evidence under a CI-specific `.vibe/evidence/**` or lane-owned evidence directory chosen by I-20, upload it as artifacts, and include a summary JSON. Local runs must write the same schema to local evidence paths.
7. Exit semantics: deterministic hard failures exit non-zero and fail the check. Advisory findings may annotate/summarize but cannot be the sole hard blocker unless promoted by an approved plan/decision.
8. Static validation: `I-20` must include a workflow/static validator that rejects missing aggregate invocation, missing governed paths/path filters, unpinned dependencies, missing evidence uploads, missing summary generation, and unsafe permissions/secrets.

## Job/matrix strategy

The v1 GitHub Actions matrix is semantic, not a license to fork runners. Each blocking job or matrix row must invoke the same aggregate runner with a surface/profile selector, or be invoked by the aggregate runner itself.

| Surface / job family | V1 CI stance | Blocking policy | Owner coordination |
| --- | --- | --- | --- |
| Aggregate quality | Required on PR/branch quality workflow; invokes `pnpm quality -- --profile=ci`. | Hard block. | `I-20`, consumes `I-09`/mechanical/security/test lanes. |
| Backend/API | Run typecheck, unit/integration/backend E2E/contract checks through aggregate runner when surfaces exist. | Hard block when applicable. | `DL-11`, `DL-14`, `I-11`, `I-16`. |
| Web | Run build/component/Playwright/web UI verification artifacts through aggregate runner. | Hard block for deterministic failures. | `DL-11`, `DL-13`, `I-17`. |
| Mobile | Run metadata/static checks always; run Maestro/Detox device jobs where supported. Unsupported live device proof is `pending-live/BLOCKED`, not green. | Hard block for supported deterministic failures; pending-live blocks closure. | `DL-11`, `DL-12`, `DL-13`, `I-17`. |
| Contracts | Run schema/contract strictness, generated client freshness, provider/client/consumer witness when implemented. | Hard block. | `DL-14`, `DL-15`, `I-11`, `I-16`. |
| Mechanical gates | Run governed surface, strict config, allowlist, schema/contract strictness, ratchet, wiring, smells, test anti-patterns as implemented. | Hard/ratcheted per DL-15. | `DL-15`, `I-10`–`I-13`, `I-20`. |
| Docs/context | Run docs link/staleness, context/drift, decision/reference consistency when implemented. | Hard block unless a task explicitly marks advisory with evidence. | `DL-09`, `DL-21`, `I-08`, `I-24`. |
| Security | Run secret/env/command/static security gates and redaction/evidence validation. | Hard block. | `DL-22`, `I-18`. |
| Observability | Transport/run observability tests/artifacts once DL-23/I-19 define them; before then emit blocked/not-applicable evidence, not invented checks. | Hard block when required. | `DL-23`, `I-19`. |
| Starter/reference fixtures | Run generated/reference starter harness-consumption, build, E2E/UI/context evidence once paths exist. | Hard block; pending-live for unavailable live mobile/provider proof. | `DL-16`, `I-15`–`I-17`, `I-23`. |
| Release candidate | Manual workflow only; runs aggregate quality, build/package checks, changelog/SemVer/governance/security preflight. | Hard block for release-candidate readiness; no automatic publish. | `DL-19`, `DL-22`, `I-00`, `I-24`, operator. |

A later implementation may split this into multiple GitHub Actions jobs for duration or artifact isolation, but the validator must prove the combined required check set equals the local aggregate runner's required set.

## Caching strategy

Caching is permitted only as an acceleration layer. It must never be the source of truth for generated artifacts, evidence, baselines, contracts, or security decisions.

- Package manager/store cache: use pnpm store cache keyed by OS, Node major, pnpm version, lockfile hash, and package-manager metadata. Cache restore must not run without lockfile validation.
- Turborepo/build cache: local/CI cache may be used when keyed by lockfile, `turbo.json`, package graph, runner version, environment-affecting config, and task inputs/outputs. Remote cache is disabled by default unless a later security/governance owner supplies credentials, redaction, and approval evidence.
- Playwright/browser cache: cache browser binaries keyed by Playwright package/version, OS, lockfile, and install mode. Test reports/traces/screenshots are never restored from cache as proof.
- Mobile/E2E dependencies: cache Gradle, CocoaPods, Metro, Maestro, Detox, emulator/device support, and build intermediates only by lockfiles/tool versions/platform config. Simulator/emulator runtime state, app data, screenshots, videos, traces, and failure logs must not be reused as green evidence.
- Generated artifacts: contract clients, schemas, OpenAPI projections, docs, context indexes, baselines, and starter fixtures must be regenerated or freshness-validated. Cached generated outputs can speed builds only if a freshness validator proves they match committed sources.
- Mechanical baselines/allowlists: never cache as mutable truth. Baseline/allowlist files must come from committed/approved sources and be validated for staleness.
- Security constraints: cache keys, logs, artifacts, and summaries must not contain secrets. Caches must not be restored from untrusted forks into privileged contexts. Cache poisoning risks are blockers for protected/release workflows.
- Invalidation principle: any change to lockfiles, root config, package graph, runner implementation, workflow YAML, tool versions, generated sources, governed-surface registry, baselines, allowlists, security policy, or evidence schema must invalidate relevant caches.

## Artifact and evidence upload policy

CI must upload enough evidence for validators and future agents to recover truth without rerunning everything.

Required upload categories when produced:

- DL-10 Evidence Packets and per-layer machine results;
- aggregate runner summary JSON and normalized human summary Markdown;
- test reports for unit, integration, contract, backend E2E, web E2E, mobile E2E, and component tests;
- coverage reports and coverage summaries;
- build/package outputs needed for release-candidate verification;
- Playwright screenshots, videos, traces, HTML/blob reports;
- Maestro/Detox screenshots, videos, logs, device/runtime metadata, flake classifications;
- UI verification screenshots, diff images, accessibility reports, DOM/tree/geometry metadata, baselines comparison reports;
- mechanical gate reports: governed surface, strict config, allowlist, ratchet, wiring, smell, test anti-pattern, schema/contract strictness;
- security reports with redacted findings, allowlist validation, env/config validation, and command/policy denials;
- context/drift/doc reports;
- observability artifacts when DL-23/I-19 define them;
- CI summary JSON and PR/check annotation payloads;
- release-candidate artifacts and changelog/SemVer/governance preflight reports.

Retention principles:

- Pull-request evidence must be retained long enough for review and validation.
- Main-branch/release-candidate evidence must be retained longer than PR evidence and linked to Build Result/Ship Packet when applicable.
- Secrets and credentials must be redacted before upload; if redaction is uncertain, upload is blocked and security evidence records the blocker.
- Artifacts are evidence, not hidden inputs. CI must not require prior artifacts to pass current verification unless a freshness validator proves validity.

## PR summary and check annotation policy

1. CI must produce a machine-readable summary JSON containing run id, commit/ref, aggregate status, per-surface statuses, evidence artifact ids/paths, blocking/advisory classification, failure taxonomy, cache hits, skipped/blocked/pending-live items, and release/security/governance warnings.
2. CI may produce a human-readable GitHub Step Summary and PR comment/check summary derived from the machine summary.
3. GitHub check annotations may point to deterministic failures, report paths, and advisory findings. Annotation absence is not evidence of success; the machine summary and exit status are authoritative.
4. Blocking classifications:
   - deterministic verification, tests, builds, mechanical gates, security gates, context/drift when required, release-candidate preflight, and final DoD checks hard-block;
   - advisory/LLM review findings are advisory by default and cannot be the sole hard blocker unless promoted by an approved plan/decision;
   - missing evidence for a required layer hard-blocks.
5. CI must not automatically push commits, open PRs, merge, publish, deploy, or mutate external systems. Ship may prepare PR/commit text only; operator approval is required for push/PR/publication.
6. PR summary generation must be domain-neutral and must not infer business workflows. It summarizes harness surfaces, runners, artifacts, evidence, and blockers.

## Release pipeline stance

V1 release mechanics are limited and safe:

- Manual GitHub Actions release-candidate workflow is allowed and required before any public package release claim.
- Release-candidate workflow must invoke the same aggregate quality runner, build/package verification, changelog/SemVer validation, governance-file preflight, security-reporting preflight, no-secret checks, and artifact upload.
- Automatic publish on push, tag, or PR merge is not allowed in v1.
- Actual package publication/deployment is disabled until real governance files, private vulnerability reporting path, maintainer/contact metadata, credentials/secrets, package registry configuration, and explicit operator approval exist.
- If publication is later enabled, it must use protected environment approval or equivalent provider gate, least-privilege credentials, redacted evidence, provenance/signing only if the governance/security owners have defined and proven it, and no release if deterministic gates fail.

Deferral boundary: exact registry credentials, maintainer identity, repository URL, protected environment names, provenance/signing policy, and public release timing are not decided here. Future owners are `I-00`, `I-24`, DL-19/DL-22 consumers, and the operator. No current implementation lane may rely on actual publication being available.

## Security, secrets, and permissions implications

- Default GitHub Actions permissions for quality workflows: `contents: read` only, with job-specific elevation forbidden unless a future owner proves need and safety.
- Pull-request workflows from forks must not receive secrets and must not use `pull_request_target` for untrusted code quality execution.
- Third-party actions and tool installers must be pinned to immutable references or repository-owned wrappers; dynamic `latest` is rejected for blocking workflows.
- CI environment defaults must be local/test/disabled only. Production-like endpoints, credentials, deploy tokens, package tokens, and external mutation permissions are absent by default.
- Release-candidate publication credentials, if later configured, must be scoped to a protected manual workflow and never exposed to normal PR quality jobs.
- Cache/artifact/log output must be redacted and must not contain secret values.
- CI must consume DL-22 security evidence. Missing security evidence for required checks hard-blocks.
- This decision does not implement scanner catalogs, secret policies, sandboxing, command policy, or release credential handling; those remain DL-22/I-18 and governance/operator responsibilities.

## Verification/witness consequences

- deterministic checks affected: workflow/static validation, local/CI aggregate parity, package/script wiring, path-filter/governed-surface coverage, dependency pinning, cache invalidation, artifact/evidence upload, summary generation, permission/secrets policy, and release-candidate preflight.
- positive witnesses required downstream:
  - local `pnpm quality -- --profile=ci` invokes the actual aggregate runner and writes schema-valid evidence;
  - GitHub Actions workflow invokes the same root script/profile and uploads evidence;
  - workflow/static validator accepts a compliant workflow with pinned dependencies, no unsafe permissions, and complete artifact uploads;
  - surface matrix rows produce blocking/advisory statuses consistent with DL-10/DL-15/DL-22;
  - manual release-candidate workflow runs preflight without publishing.
- negative witnesses required downstream:
  - CI workflow missing `pnpm quality` aggregate invocation fails;
  - CI direct partial command as sole blocking proof fails;
  - path filters that skip governed paths fail;
  - missing pinned action/tool/dependency fails;
  - stale generated artifact/cache accepted as truth fails;
  - missing Evidence Packet/artifact upload/summary JSON fails;
  - unsafe `pull_request_target`, secret exposure, write permissions, auto-publish, auto-push, or auto-PR fails;
  - advisory LLM review as the sole hard blocker fails.
- regression witnesses required downstream:
  - product/package/CLI name remains `vibe-engineer`;
  - two-repo direction remains harness plus generated/reference starter consuming harness;
  - fixed starter stack and E2E choices remain NestJS, React, React Native, strict TypeScript, pnpm, Turborepo, PostgreSQL, Prisma, Playwright, Maestro + Detox;
  - six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
  - `build` and `ship` still run verification/context/evidence automatically;
  - mechanical gate families remain intact;
  - DL-19 owns governance/release policy, DL-22 owns security policy, DL-23 owns observability defaults, DL-20B/DL-24B remain later audits.
- real_boundary_required: yes for `I-20` implementation; no live seam is created by this DL-18 artifact.
- real_boundary_status: required_before_closure for `I-20` and downstream build/ship/full-witness closure; not_applicable for this decision artifact itself.
- if no live seam: DL-18 only locks the design/proof contract and does not create workflow files or run CI.

## Ownership/path consequences

Future implementation ownership follows final strategy §9.3:

- `I-20-ci-local-parity-wiring` owns `.github/workflows/**`, `scripts/quality/**`, `scripts/ci/**`, `package.json`, `turbo.json`, and `.vibe/work/I-20-ci-local-parity-wiring/**`, serialized for root/CI ownership.
- `I-09` owns verification runner/evidence source, not CI workflows.
- `I-10`–`I-13` own mechanical gate implementation, not CI workflows.
- `I-18` owns security hooks/policy implementation, not CI workflows.
- `I-21`/`I-22` consume I-20 evidence and do not rewrite CI policy.
- DL-18 owns only this decision artifact and `.vibe/work/DL-18-ci-cd-defaults/**`.

Any future change to root package scripts, workflow YAML, CI scripts, or `turbo.json` is serialized through `I-20` or a later explicit handoff. Decision-only lanes must not edit those files.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED` and independently validated `PASS`.
- governed surfaces affected: CI/CD decision artifact, future workflow defaults, scripts, evidence, summaries, provider extension boundaries, release-candidate mechanics.
- surface classification: core harness CI/CD policy with provider-specific mechanics; consuming-project CI extensions are project-owned and must not become core defaults.
- positive generic vocabulary used: packages, apps, contracts, adapters, tests, E2E, UI verification, mechanical gates, context, evidence, workflows, runners, artifacts, caches, summaries, release candidates.
- project/business terms: none as core defaults. This decision does not encode ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout, product, customer-order, or equivalent project-specific workflows.
- sample/demo boundary: starter/reference fixture references are labeled generic/reference and remain replaceable.
- extension boundary: future provider or consuming-project jobs may add domain-specific checks only through explicit extension ownership and cannot weaken core parity.
- deterministic/advisory owner mapping: `I-20` for CI/static validation; `I-10`–`I-13` for mechanical gates; `I-18` for security; `I-24`/audits for docs; validators/final bug hunt for semantic review.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- writes limited to owned paths: yes.
- files changed by this lane: this decision artifact and `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-18-ci-cd-defaults/DL-18-execution-report.md`.
- conflicts discovered: none. Initial owned-path inventory showed no existing DL-18 decision artifact and no DL-18 work tree before report creation.
- production/root/CI/package/source/starter files touched: none.

## Deferral rationale

This decision status is `LOCKED`; backlog §18 is resolved for v1 or explicitly gated as below.

Deferred implementation/operational details:

1. Exact starter/reference fixture paths and app/service commands.
   - reason_now: owned by DL-16 and implementation lanes, not DL-18.
   - future_owner: `DL-16`, `I-15`, `I-16`, `I-17`.
   - blocked_dependents: `I-20` starter/reference CI matrix closure if paths are needed.
   - proof_no_dependent_relies_now: no CI workflow is implemented by DL-18; I-20 must block if paths are absent.
2. Exact observability artifact names and checks.
   - reason_now: owned by DL-23/I-19; DL-23 decision artifact was absent at DL-18 execution time.
   - future_owner: `DL-23`, `I-19`.
   - blocked_dependents: observability CI row closure and downstream claims of observability CI evidence.
   - proof_no_dependent_relies_now: DL-18 only requires CI transport once observability evidence exists.
3. Public package publication credentials/provenance/operator approval.
   - reason_now: operational/governance/security setup is outside DL-18 and cannot be assumed.
   - future_owner: `I-00`, `I-24`, `DL-19`/`DL-22` consumers, operator.
   - blocked_dependents: public release/package publication.
   - proof_no_dependent_relies_now: v1 release-candidate workflow is manual and non-publishing until prerequisites are real.

## Evidence checklist

1. Report artifact was created before this decision artifact and updated after source inspection.
2. Source files inspected are listed in the execution report and cited above by path/section.
3. Files changed are limited to this decision artifact and the DL-18 execution report.
4. No production/package/root/config/CI/generated starter files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Dependencies, blocked dependents, required sequencing, deferrals, ownership, read-only paths, untouchable paths, and handoff notes use the DL-24A dependency declaration format.
7. Every backlog §18 topic is covered: provider default, local/CI parity, caching, matrix, artifact upload, PR summary, and release pipeline.
8. Deferrals name future owners, blocked dependents, and proof no current dependent may rely on the missing detail.
9. Verification/witness consequences include positive, negative, and regression witnesses.
10. Real-boundary status is stated: later `I-20` must prove actual local aggregate path and CI workflow invocation.
11. Domain-neutrality check is present and self-applied.
12. Locked decisions remain uncontradicted: `vibe-engineer`, two-repo direction, six skills, artifact flow, automatic build/ship verification/context, fixed starter stack/E2E, mechanical gates, and no push/PR without approval.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and available diffs/content, not just this report.

### Positive witnesses

- Decision artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-18-ci-cd-defaults.md`.
- Execution report exists at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-18-ci-cd-defaults/DL-18-execution-report.md`.
- Artifact uses DL-24A fields and exactly one output class.
- DL-20A domain-neutrality checklist is applied.
- Backlog §18 is fully resolved or explicitly deferred with blocked dependents.
- `I-20` can implement without guessing provider, aggregate command, workflow invocation, cache/matrix/artifact/summary/release policy, and validation witnesses.

### Negative witnesses

- A provider choice without local/CI parity is critical.
- `CI later` while allowing `I-20`/build/ship closure is critical.
- CI invoking a different partial command as blocking truth is critical.
- Path filters that skip governed paths are critical.
- Caching that hides stale generated artifacts, baselines, contracts, clients, evidence, or secrets is critical.
- PR summaries that make advisory LLM review the sole hard blocker are critical.
- Release publication without DL-19/DL-22/operator prerequisites is critical.
- Any write to `.github/**`, `scripts/**`, root configs, packages, examples, source docs, git metadata, or non-DL-18 decisions/reports by this lane is critical.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Two-repo direction remains domain-neutral harness plus generated/reference starter consuming harness.
- Fixed starter stack remains NestJS, React, React Native, strict TypeScript, pnpm, Turborepo, PostgreSQL, Prisma, shared contracts/client, tests/E2E/UI verification/CI/context/golden module.
- Web E2E remains Playwright; mobile E2E remains Maestro + Detox.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- `build` and `ship` still automatically run verification, evidence capture, context update, and drift checks.
- Mechanical gate families remain governed surface, strict config guards, escape/suppression allowlist, schema/contract strictness, quality ratchet, wiring-integrity, code-smell gate, and test anti-pattern scanner.
- `DL-19`, `DL-22`, and `DL-23` remain owners of governance/release policy details, security/safety details, and observability defaults respectively.
- `DL-20B` and `DL-24B` remain later audits.

### Sibling/blast-radius checks

- Check final strategy §§5–11 and §§14–18 for consistency.
- Check DL-24A/DL-20A artifacts and validation reports.
- Check source docs listed in this artifact.
- Check related decisions present under `docs/decisions/**`, especially DL-10/DL-11/DL-12/DL-13/DL-15/DL-19/DL-22.
- Confirm DL-16/DL-23 absent details are not invented.
- Confirm changed paths are limited to DL-18 owned paths.

### Severity policy

- `critical`: source contradiction; invalid output class/deferral; missing local/CI parity contract; false real-boundary closure; unowned write; production/CI/root implementation by this decision-only lane; locked decision contradiction; missing dependency/blocker mapping for `I-20`; release/security/governance policy invented over another owner; domain-specific core leakage.
- `major-local`: incomplete backlog §18 coverage, unclear cache/matrix/artifact/summary policy, unclear future proof owner, or weak validation witnesses repairable in DL-18 paths.
- `minor-local`: citation/wording issue that does not weaken gates.
- `clean`: all schema, source, ownership, dependency, witness, and domain-neutrality requirements satisfied.

## Known ambiguities / future owners

- Exact root package manager metadata, Node version, and action SHAs are implemented by `I-00`/`I-20` from committed root config/lockfiles.
- Exact starter/reference fixture paths are owned by `DL-16` and `I-15`–`I-17`; absent at DL-18 execution time.
- Exact observability artifact semantics are owned by `DL-23`/`I-19`; DL-23 decision artifact was absent at DL-18 execution time.
- Exact release credentials, private security reporting setup, maintainer contact, repository URL, protected environment names, and publication approval are owned by governance/security/operator setup, not DL-18.
- Exact mobile live device availability may remain `pending-live/BLOCKED`; CI must not fake mobile proof.
- Future provider extensions require explicit validation and cannot weaken the GitHub Actions v1 default.
