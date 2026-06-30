# DL-19 — Open-Source Governance

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-19 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-19-open-source-governance.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-19-open-source-governance/DL-19-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §4.1 `Harness repo package hypothesis`; §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 `Decision-lock table`, row `DL-19-open-source-governance`; §6.2 `Implementation DAG`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`, rows `DL-*`, `I-00`, `I-24`; §§14-18 evidence, dirty-tree, closure, and severity policy.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §5 `DAG and ready-queue safety check`; §8 `Coverage by product surface`; §9 `Severity gate and closure criteria check`; §10 `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`; `Downstream gating impact`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — opening overview; §1 `Product vision`; §2 `The two repositories`; §3 `Non-negotiable design rules`; §4 `Core workflow`; §9 `Verification model`; §13 `Relationship between starter kit and harness`; §15 `Success criteria`; §16 `Locked decisions and planning backlog`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§1-2 `Product / package / CLI name` and `Two-repo direction`; §§3-11 starter stack, create UX, config defaults, six skills, schematics, automatic verification/context, E2E, verification layer, and mechanical gates.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §1 `Core principles`; §5.13 `Advisory review agents`; §11 `Agent registry`; §12.14 `Meta-agent safety rule`; §14 `Blocking policy summary`; §16 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §1 `Core verification doctrine`; §7 `Quality wiring-integrity gate`; §8 `Code-smell gate`; §§11-13 verification fit, implementation priority, and final invariant.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §19 `Open-source governance`; related §18 `CI/CD provider defaults`, §21 `Documentation system`, and §22 `Security and safety model` for handoffs only.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§0, 5.2, 10, and 11 for quality bar, Triad A/B, evidence-bound validation, dirty-tree safety, and no band-aids.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

The `vibe-engineer` harness repo uses an MIT-licensed, permissive, domain-neutral open-source governance baseline. Future implementation must create standard root governance artifacts, package metadata license fields, README references, changelog/release documentation, and docs/reference links from this decision without reopening policy.

The locked governance baseline is:

- license: `MIT` SPDX identifier;
- contribution model: public issues and pull requests, maintainer-reviewed merges only, no CLA, DCO 1.1 sign-off required for all external pull-request commits;
- code of conduct: Contributor Covenant Code of Conduct v2.1 adapted with project maintainers/contact placeholders filled by the implementation owner before external contributor solicitation;
- security reporting: public hardening issues may use normal issues, vulnerability reports must use a private channel, preferably GitHub private vulnerability reporting for the repository; no package/public release may proceed without a real private reporting path;
- release/versioning: SemVer for packages and CLI, with documented pre-1.0 semantics and prerelease channels;
- changelog: Keep a Changelog style `CHANGELOG.md` with `Unreleased` and SemVer release sections;
- plugin/preset API stability: documented public APIs are tiered as stable, experimental, deprecated, or internal; unmarked internals are not compatibility surfaces;
- backwards compatibility: public contracts break only under the SemVer/deprecation policy, with explicit migration notes; no silent fallbacks, hidden legacy shims, or fake-green compatibility.

## Decision details

1. Governance applies to the open-source `vibe-engineer` harness repo, not to project-specific consuming-project governance.
2. The harness remains domain-neutral and must not make business-domain policy assumptions.
3. `I-00-repo-skeleton-governance` must create the initial root governance files and package metadata fields from this decision.
4. `I-24-docs-reference-governance-polish` must link and polish governance/reference material from actual files without inventing new policy.
5. `DL-18-ci-cd-defaults` owns release automation and CI provider details, but must consume the SemVer, changelog, release-channel, and no-publish-without-governance constraints here.
6. `DL-21-documentation-system` owns docs structure, but must ensure governance, contributing, security, versioning, and changelog content are discoverable.
7. `DL-22-security-safety-model` owns technical safety controls, but must align with the public/private security reporting and supported-versions policy here.
8. Exact maintainer names, contact addresses, and repository-hosting URLs are operational metadata, not policy. If unavailable during implementation, the creating lane must use explicit placeholders and block public release/external contribution solicitation until real values are provided.

## Alternatives considered

### Permissive license options

- decision: accepted `MIT`.
- rationale: MIT is widely understood in the JavaScript/TypeScript ecosystem, is compatible with broad commercial and open-source consumption, and fits the harness/starter consumption model with minimal friction.
- consequences: root `LICENSE` and all package metadata license fields must use `MIT`; later dependency/license scans must ensure third-party compatibility.

### Apache-2.0 permissive option

- decision: rejected for the v1 baseline.
- rationale: Apache-2.0 provides an explicit patent grant, but its additional terms are heavier than needed for this initial TypeScript harness baseline and are less idiomatic for small npm packages than MIT.
- consequences: a future legal/business decision could change the license only before public release or under a migration plan; this decision does not authorize dual licensing.

### BSD/ISC permissive options

- decision: rejected.
- rationale: they are also permissive, but MIT is the clearest default for the intended ecosystem and avoids needless variation.
- consequences: do not use BSD/ISC SPDX fields in root/package metadata unless a later explicit governance decision supersedes this one.

### Copyleft/network-copyleft options

- decision: rejected.
- rationale: GPL/AGPL-style licenses would reduce adoption by teams that need to embed the harness, presets, schematics, or generated starter outputs in varied projects. The strategy requires a reusable domain-neutral harness consumed by future projects, not a copyleft adoption gate.
- consequences: do not impose GPL/AGPL terms on harness code or generated starter outputs.

### Code-of-conduct choices

- decision: accepted Contributor Covenant Code of Conduct v2.1.
- rationale: it is a standard open-source baseline, concrete enough for `CODE_OF_CONDUCT.md`, and keeps conduct expectations separate from project-specific business domains.
- consequences: future file must adapt the v2.1 text, fill maintainer contact/escalation placeholders, and not invent a bespoke weaker policy.

### Centralized-maintainer contribution model

- decision: accepted for v1.
- rationale: early governance, package surfaces, verification contracts, and security posture need consistent maintainer review. This preserves evidence-bound verification and no self-validation.
- consequences: contributors may open issues/PRs, but only maintainers merge after required checks/evidence.

### Open-core contribution model

- decision: rejected.
- rationale: source docs lock `vibe-engineer` as an open-source domain-neutral harness. Open-core policy would add product/business model decisions not present in scope.
- consequences: do not reserve core harness features for a closed edition in governance files.

### Broad-committer model

- decision: rejected for v1.
- rationale: broad direct commit access before stable governance, registry, package, and security controls would conflict with evidence-bound verification and maintainer review.
- consequences: future maintainer expansion is allowed, but direct merge rights require documented maintainer approval and continued validation gates.

### SemVer vs calendar/custom versioning

- decision: accepted SemVer.
- rationale: package/CLI consumers, presets, plugins, adapters, schematics, artifacts, and generated starter templates need compatibility semantics tied to API changes, not dates.
- consequences: release docs, changelog headings, package versions, and migration notes must use SemVer.

### Keep-a-Changelog style vs freeform changelog

- decision: accepted Keep a Changelog style.
- rationale: structured sections support release-note generation, migration discovery, and validator checks better than freeform prose.
- consequences: `CHANGELOG.md` must include `Unreleased` and categorized release entries.

### Stable/experimental plugin API models

- decision: accepted tiered stability.
- rationale: `vibe-engineer` needs extension points without freezing every internal implementation detail. Stable/experimental/deprecated/internal labels give contributors and validators clear expectations.
- consequences: public extension surfaces must declare tier; undocumented internals are not compatibility contracts.

### Security reporting options

- decision: accepted private vulnerability reporting plus public non-sensitive issue reporting.
- rationale: vulnerabilities should not be disclosed publicly before triage, while non-sensitive hardening work can use normal issue/PR flow.
- consequences: `SECURITY.md` must document private reporting, expected response/triage stance, supported versions, and DL-22 handoff.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies required decision artifact schema, dependency format, evidence checklist, validator checklist, real-boundary policy, and dirty-tree discipline.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies domain-neutrality boundary and checklist for governance policy.
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms final strategy is safe for decision-lock execution.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: Strategy, README, locked decisions, verification, mechanical gates, backlog, playbook, and quality bar define governance scope and invariants.
  blocks:
    - id: I-00-repo-skeleton-governance
      reason: I-00 must create root governance files and package metadata from this policy.
    - id: I-24-docs-reference-governance-polish
      reason: I-24 must link and polish actual governance/reference material from this policy.
  blocked_dependents:
    - id: I-00-repo-skeleton-governance
      blocked_until: DL-19 is independently validated PASS and DL-24B allows implementation launch where applicable.
      relying_on: License, contribution, code of conduct, security reporting, versioning, changelog, compatibility, API-stability, and governance artifact map.
    - id: I-24-docs-reference-governance-polish
      blocked_until: DL-19 is independently validated PASS and actual governance files exist from I-00.
      relying_on: README/docs/reference governance links, release/version/changelog docs, contribution and security policy references.
  required_before_finalizing:
    - id: DL-18-ci-cd-defaults
      required_content: Release automation and CI decisions must consume SemVer, prerelease channels, changelog, release-note, package-publication, and governance-file-present constraints.
    - id: DL-21-documentation-system
      required_content: Docs structure decisions must provide discoverable links for license, contributing, code of conduct, security, changelog, release/versioning, and API stability policy without taking over governance policy.
    - id: DL-22-security-safety-model
      required_content: Technical security controls must align with private vulnerability reporting, public hardening issue handling, supported versions, and no-public-release-without-private-reporting-path constraints.
    - id: I-00-repo-skeleton-governance
      required_content: Actual `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, README governance references, and package metadata license fields.
    - id: I-24-docs-reference-governance-polish
      required_content: Actual docs/reference/security/release/contribution links and stale-link checks.
  deferrals:
    - deferred_question: Exact maintainer contact address and repository-hosting URL.
      rationale: Operational metadata is not present in source docs and belongs to repo creation/publication setup, not governance-policy selection.
      future_owner: I-00-repo-skeleton-governance/operator repository setup
      allowed_now: true
      blocked_dependents:
        - public release/package publication if real private security and conduct contact paths are absent
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-19-open-source-governance.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-19-open-source-governance/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/**
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/**
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-19 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - /Users/lizavasilyeva/work/vibe-engineer/README.md
    - /Users/lizavasilyeva/work/vibe-engineer/LICENSE
    - /Users/lizavasilyeva/work/vibe-engineer/CONTRIBUTING.md
    - /Users/lizavasilyeva/work/vibe-engineer/CODE_OF_CONDUCT.md
    - /Users/lizavasilyeva/work/vibe-engineer/SECURITY.md
    - /Users/lizavasilyeva/work/vibe-engineer/CHANGELOG.md
    - /Users/lizavasilyeva/work/vibe-engineer/package.json
    - /Users/lizavasilyeva/work/vibe-engineer/.github/**
    - /Users/lizavasilyeva/work/vibe-engineer/packages/**
    - /Users/lizavasilyeva/work/vibe-engineer/docs/reference/**
    - /Users/lizavasilyeva/work/vibe-engineer/docs/security/**
    - /Users/lizavasilyeva/work/vibe-engineer/examples/**
    - any non-DL-19 decision/report/work path
  handoff_notes:
    - from: DL-19
      to: I-00-repo-skeleton-governance
      condition: Create root governance files and package metadata from this locked policy.
      shared_path_policy: serialized
    - from: DL-19
      to: I-24-docs-reference-governance-polish
      condition: Link/polish actual governance files after I-00 and docs-system decisions.
      shared_path_policy: serialized
    - from: DL-19
      to: DL-18-ci-cd-defaults
      condition: Release automation must preserve SemVer/changelog/publication constraints.
      shared_path_policy: disjoint
    - from: DL-19
      to: DL-21-documentation-system
      condition: Documentation structure must expose governance material without changing policy.
      shared_path_policy: disjoint
    - from: DL-19
      to: DL-22-security-safety-model
      condition: Security controls must align with public/private reporting policy.
      shared_path_policy: disjoint
```

## Blocked dependents

- `I-00-repo-skeleton-governance`: blocked until DL-19 is validated because it must create root governance files, README governance references, and package metadata license fields from this policy.
- `I-24-docs-reference-governance-polish`: blocked until DL-19 is validated and actual governance files exist because it must link and polish real material.
- `DL-18-ci-cd-defaults`: not replaced by DL-19, but cannot finalize release/publish automation contrary to the SemVer, prerelease, changelog, release-note, and governance-file-present constraints here.
- `DL-21-documentation-system`: not replaced by DL-19, but must preserve discoverability of governance content and not invent conflicting governance policy.
- `DL-22-security-safety-model`: not replaced by DL-19, but must align technical safety controls and docs with the public/private vulnerability reporting stance here.
- Public release/package publication is blocked if real private security-reporting and code-of-conduct reporting paths are absent.

## License decision

- selected license: `MIT`.
- SPDX identifier: `MIT`.
- rationale: MIT is permissive, concise, familiar to npm/TypeScript consumers, and compatible with broad use of a reusable open-source harness and generated starter consumption model.
- alternatives rejected: Apache-2.0 for extra terms/patent complexity at v1; BSD/ISC for needless ecosystem variation; GPL/AGPL/copyleft for adoption friction and generated-output ambiguity.
- required future file/package metadata consequences:
  - `LICENSE` must contain the standard MIT License text with project copyright holder/year filled by `I-00`/operator.
  - root/package metadata must set `license` to `MIT`.
  - README/package docs must refer to MIT license.
  - package publication must not use a conflicting SPDX value.
- starter/harness applicability:
  - Harness repo code and packages are MIT licensed.
  - Generated starter/reference outputs should state whether generated files are MIT from the harness template, project-owned, or otherwise operator-owned; no GPL/AGPL terms may be introduced by default.
- third-party-license compatibility constraints:
  - Later implementation must run or record dependency/license review before public release.
  - Dependencies with terms incompatible with MIT redistribution or generated starter use must be rejected or isolated by a later owner.

## Contribution model

- who may contribute: anyone may open issues, discussions where enabled, and pull requests, subject to this policy, repository rules, and maintainer review.
- maintainer model: centralized maintainer review for v1. Maintainers approve, request changes, or close contributions. Direct merge rights require explicit maintainer appointment.
- merge expectations:
  - No unreviewed external merge.
  - Maintainers must require evidence appropriate to the changed surface.
  - Changes affecting contracts, schemas, prompts, governance, security, release behavior, or public APIs need explicit maintainer attention and validation evidence.
- issue/PR expectations:
  - Issues should describe observed behavior, expected behavior, affected surface, reproduction/context where relevant, and whether the topic is a bug, feature, docs, security-hardening, or governance proposal.
  - PRs should link issues or explain motivation, list changed files/surfaces, provide verification evidence, include migration/release notes when public behavior changes, and update changelog entries when appropriate.
- CLA/DCO/no-CLA decision:
  - No CLA is required for v1.
  - DCO 1.1 sign-off is required for all external pull-request commits using `Signed-off-by:` commit trailers or an equivalent PR attestation documented in `CONTRIBUTING.md`.
  - Rationale: avoids bespoke legal onboarding while giving a concrete contribution-rights attestation.
- contributor validation expectations:
  - Contributors must not self-validate as the only proof for significant changes.
  - Deterministic checks are hard blockers when available.
  - Evidence must include positive/negative/regression witnesses for behavior, schema, contracts, docs, governance, or security surfaces touched.
  - Maintainers may request additional evidence before merge.

## Code of conduct policy

- chosen baseline: Contributor Covenant Code of Conduct v2.1.
- required content model:
  - `CODE_OF_CONDUCT.md` must adapt the Contributor Covenant v2.1 text.
  - It must state expected behavior, unacceptable behavior, enforcement responsibilities, scope, reporting path, enforcement guidelines, and attribution.
- reporting/escalation placeholders:
  - Exact maintainer contact/escalation address is operational metadata to be filled by `I-00`/operator.
  - If no real private conduct-reporting path exists, external contributor solicitation and public release are blocked until one is provided.
- owner/maintainer responsibilities:
  - Maintainers receive and triage reports, enforce the policy consistently, protect reporter privacy where possible, and document any public moderation/removal actions only as appropriate.
- exact future artifact consequences:
  - `CODE_OF_CONDUCT.md` must exist before public contribution solicitation.
  - `CONTRIBUTING.md` and README governance references must link to it.
  - Docs/reference material must link to the actual file rather than duplicating divergent policy.

## Security reporting policy

- public reporting path expectations:
  - Non-sensitive hardening requests, documentation corrections, and general safety improvement proposals may be filed as public issues/PRs.
  - Reports that include exploit details, vulnerabilities, secrets, bypasses, private tokens, or instructions to compromise users must not be filed publicly.
- private vulnerability reporting stance:
  - The repo must provide a private reporting channel before public release/package publication.
  - Preferred channel: GitHub private vulnerability reporting/security advisories for the repository if hosted on GitHub.
  - If that channel is unavailable, `I-00`/operator must provide an equivalent private contact path before release; absent a real path, publication remains blocked.
- supported versions/security-fix policy:
  - Before `1.0.0`, security fixes target the latest released minor line unless maintainers explicitly document additional support.
  - From `1.0.0`, security support targets the latest major release line; support for older majors must be explicitly documented in `SECURITY.md`.
  - Unsupported versions receive best-effort guidance only and no silent backport promise.
- disclosure/triage expectations:
  - `SECURITY.md` must ask reporters to avoid public disclosure until maintainers triage and coordinate a fix/release path.
  - It must state that maintainers will acknowledge and triage reports on a best-effort basis until a later SLA is explicitly decided.
- handoff to `DL-22-security-safety-model`:
  - DL-19 does not implement secret scanning, destructive-command policy, sandboxing, hooks, or technical controls.
  - DL-22/I-18 must align those controls with this reporting policy and supported-versions stance.

## Release and versioning strategy

- versioning choice: Semantic Versioning (`MAJOR.MINOR.PATCH`) for published packages, CLI, documented public APIs, presets, plugins, adapters, schematics, artifact schemas, and generated starter template releases.
- pre-1.0 semantics:
  - `0.y.z` may introduce breaking public-surface changes in minor releases only when clearly documented in changelog and migration notes.
  - Patch releases must remain bug/security/documentation fixes without intentional breaking changes.
  - Experimental APIs may change more frequently, but changes must still be visible in release notes.
- v1+ semantics:
  - Major releases may include breaking public API/CLI/config/schema/template changes.
  - Minor releases add backwards-compatible features or mark deprecations.
  - Patch releases fix bugs/security/docs without breaking public contracts.
- release cadence/channel policy:
  - No fixed calendar cadence is required.
  - Release only when validation evidence is complete for the changed surfaces.
  - Stable releases use the default npm `latest` channel.
  - Prereleases use SemVer prerelease identifiers and npm dist-tags such as `next`, `alpha`, `beta`, or `rc` as decided by release automation owners.
- npm/package publication implications:
  - Packages must carry `license: MIT` and SemVer versions.
  - Public package publication is blocked until root governance files, private security reporting path, changelog entry, and release notes exist.
- handoff to `DL-18-ci-cd-defaults`:
  - DL-18 owns provider, workflow, tagging, publishing, and automation mechanics.
  - DL-18 must not publish releases that bypass this governance policy.

## Changelog strategy

- format: Keep a Changelog style Markdown.
- required root artifact: `CHANGELOG.md`.
- required sections:
  - `Unreleased` at top.
  - Release headings using SemVer versions and dates.
  - Categories: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security` when applicable.
- migration/release-note expectations:
  - Any public API, CLI, config, artifact schema, preset/plugin, adapter, schematic, generated template, or documented behavior change must include a changelog entry.
  - Breaking changes require explicit migration notes in the changelog and any release docs created by later owners.
  - Security fixes must use the `Security` category while avoiding exploit details that belong in private disclosure until safe.
- ownership:
  - `I-00` creates the initial changelog with `Unreleased` and governance/versioning baseline.
  - Future implementation/release lanes update it as part of changes.
  - `I-24` ensures docs/reference links point to the real changelog.

## Plugin/preset API stability policy

- public vs internal classification:
  - Public stable surfaces are only those documented as public exports, CLI commands/output contracts, config schemas, artifact schemas, skill/agent/schematic manifest schemas, preset/plugin extension APIs, adapter integration APIs, standards package exports, mechanical gate configuration/result schemas, and generated starter template contracts.
  - Internal surfaces include unexported package internals, implementation modules, fixtures, prompt construction internals, test helpers not documented as public, generated intermediate files, and undocumented file paths.
- required stability tiers:
  - `stable`: subject to SemVer compatibility and deprecation policy.
  - `experimental`: documented as unstable; may change in minor releases before v1 and with clear release notes after v1 until promoted.
  - `deprecated`: still present but scheduled for removal with migration guidance.
  - `internal`: no compatibility promise; consumers must not rely on it.
- surface-specific policy:
  - Presets/plugins: authoring APIs and manifest schemas must be tiered; bundled preset internals are internal unless documented.
  - Schematics: schematic authoring API, manifest format, and dry-run/conflict contract are public when documented; template internals are internal unless documented.
  - Adapters: adapter manifest/contract and generated skill/command compatibility contract are public when documented; per-provider implementation internals are internal.
  - Skills: user-facing skill names and artifact handoff protocols are stable once documented; prompt internals are internal.
  - Standards: documented standards and exported rule identifiers are public; draft standards may be experimental.
  - Mechanical gates: finding schema, config surface, and aggregate status contract are public when documented; detector internals may be internal or experimental.
- deprecation/removal policy:
  - Stable public APIs require deprecation notice before removal.
  - Before v1, removal can occur in minor releases with clear migration notes.
  - After v1, removal of stable public APIs requires a major release unless a critical security/safety issue forces faster removal; such exception must be documented.
- extension compatibility expectations:
  - Extensions must consume documented public APIs only.
  - No hidden compatibility shims or silent fallback behavior may mask an incompatible extension.
  - Invalid/unsupported plugin/preset/adapter usage must fail clearly with evidence.

## Backwards compatibility policy

- breaking changes include:
  - removing or renaming documented CLI commands, options, output fields, or exit/status semantics;
  - changing required config fields/default semantics;
  - changing artifact schemas, skill manifests, agent registry manifests, schematic manifests, or evidence packet formats incompatibly;
  - changing package public exports or documented APIs incompatibly;
  - changing generated starter template contracts in ways that require consuming-project migration;
  - changing adapter/plugin/preset extension APIs incompatibly;
  - weakening or making advisory-only a deterministic hard gate that was documented as blocking.
- compatibility promises:
  - CLI: documented commands and machine-readable outputs follow SemVer.
  - Config: schema versions and defaults changes must be documented; invalid old config must fail clearly rather than silently downgrade.
  - Artifacts: schema versions/migrations are required for incompatible changes once schemas exist.
  - Schematics/generated starter templates: template contract changes must include migration/release notes.
  - Adapters/plugins/presets: documented public APIs follow stability tiers.
  - Documented APIs: no hidden reliance on internal paths.
- migration/deprecation notice expectations:
  - Breaking changes require changelog entries and migration notes.
  - Deprecations must name replacement path or explicit removal rationale.
  - Removals follow SemVer/deprecation rules unless critical security/safety demands faster action.
- no-silent-fallback/no-legacy-shim constraints:
  - No silent fallback may convert unsupported config/API/artifact/plugin input into success.
  - No hidden legacy compatibility shim may make fake-green behavior appear valid.
  - Compatibility must be explicit, typed/schema-validated, versioned, and evidenced.

## Governance artifact map and future owners

| Future file/section                 | Required contents                                                                                                                                     | Creating owner lane                                                                            | Validating lane                                                 | Read-only dependencies            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------- |
| `LICENSE`                           | Standard MIT license text with copyright holder/year                                                                                                  | `I-00-repo-skeleton-governance`                                                                | `I-00` validator; later `I-24` link checks                      | DL-19, operator metadata          |
| `package.json` and package metadata | `license: MIT`; repository/package metadata consistent with governance                                                                                | `I-00` for root; package owners for later package metadata                                     | `I-00`/package lane validators; DL-18 for publish checks        | DL-19, DL-01                      |
| `CONTRIBUTING.md`                   | Issue/PR flow, maintainer review, DCO 1.1 sign-off for all external PR commits, validation evidence expectations, changelog/release-note expectations | `I-00`                                                                                         | `I-00` validator; `I-24` docs checks                            | DL-19, DL-24A, verification docs  |
| `CODE_OF_CONDUCT.md`                | Contributor Covenant v2.1 adaptation, scope, reporting, enforcement, contact placeholder/real value                                                   | `I-00`                                                                                         | `I-00` validator; `I-24` link checks                            | DL-19, operator contact metadata  |
| `SECURITY.md`                       | Private vulnerability reporting path, public hardening issue rule, supported versions, disclosure/triage stance, DL-22 handoff                        | `I-00`                                                                                         | `I-00` validator; `DL-22`/`I-18` alignment; `I-24` docs checks  | DL-19, DL-22 when available       |
| `CHANGELOG.md`                      | Keep a Changelog structure, `Unreleased`, categories, initial governance baseline                                                                     | `I-00`                                                                                         | `I-00` validator; DL-18/I-20 release checks; `I-24` link checks | DL-19, DL-18 for automation later |
| README governance references        | Links to license, contributing, CoC, security, changelog, versioning/release policy                                                                   | `I-00` initial root README                                                                     | `I-00` validator; `I-24` docs polish                            | DL-19, DL-21                      |
| Release/version documentation       | SemVer, pre-1.0/v1+ semantics, channels, publication blockers                                                                                         | `I-00` minimal root docs/README section; `I-24` fuller docs/reference if docs structure exists | DL-18/I-20 and `I-24` validators                                | DL-19, DL-18, DL-21               |
| Docs/reference governance links     | Links to actual governance/security/contribution/changelog/versioning/API-stability docs                                                              | `I-24-docs-reference-governance-polish`                                                        | `I-24` validator                                                | DL-19, DL-21, actual I-00 files   |
| API stability policy reference      | Public/internal/tier/deprecation rules for plugins, presets, schematics, adapters, skills, standards, gates                                           | `I-00` minimal governance text; `I-24` docs/reference polish                                   | `I-24` validator and relevant API owners                        | DL-19, DL-01..DL-15 as applicable |
| Security docs/reference             | Public/private reporting links and DL-22 technical-control references                                                                                 | `I-24` after DL-22/I-18 content exists                                                         | `I-24` validator                                                | DL-19, DL-22, I-18                |

## Verification/witness consequences

- deterministic checks affected: future license/package metadata consistency checks, governance file presence checks, docs link checks, changelog/release-note checks, package publish blockers, and security-reporting path checks.
- positive witnesses required downstream:
  - root `LICENSE` exists and is MIT;
  - package metadata license fields match `MIT`;
  - `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `CHANGELOG.md` exist with required content;
  - README/docs links resolve to actual governance files;
  - changelog contains `Unreleased` and SemVer sections;
  - release docs describe SemVer/pre-release/publication blockers;
  - API stability policy classifies public vs internal surfaces.
- negative witnesses required downstream:
  - missing or non-MIT license/package metadata is rejected;
  - missing code-of-conduct/security private reporting path blocks public release;
  - vague contribution policy allowing unvalidated merges is rejected;
  - publication without changelog/release notes is rejected;
  - plugin/preset policy without public/internal boundaries is rejected;
  - silent fallback/legacy shim compatibility is rejected.
- regression witnesses required downstream:
  - product/package/CLI name remains `vibe-engineer`;
  - harness repo remains open-source and domain-neutral;
  - starter kit remains generated/reference consumer, not copied harness logic;
  - six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
  - artifact flow remains raw intent -> Work Brief -> Implementation Plan -> Build Result -> Ship Packet;
  - automatic verification/context behavior remains intact;
  - mechanical gate families remain hard-blocking where locked;
  - no push/PR without explicit approval remains intact.
- real_boundary_required: no for this decision artifact itself; yes for later governance-file/package/docs/release/security seams.
- real_boundary_status: not_applicable for DL-19 decision artifact; required_before_closure for `I-00`, `DL-18`/`I-20`, `DL-21`/`I-24`, and `DL-22`/`I-18` consumers.
- if no live seam: this document locks policy only and does not create live package publication, legal compliance proof, security handling, release automation, or root governance files.

## Ownership/path consequences

- owned_write_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-19-open-source-governance.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-19-open-source-governance/**`
- read_only_paths:
  - all cited source docs and orchestration artifacts in `/Users/lizavasilyeva/work/harness-starter/**`;
  - DL-24A/DL-20A decision artifacts and validation reports;
  - target repo inventory outside DL-19 owned paths.
- untouchable_paths:
  - `.git/**`, root governance files, README, package metadata/root config, CI workflows, package source, generated starter files, docs/reference pages, website/docs files, examples, and unrelated decision/work paths.
- serialized/shared ownership notes:
  - `I-00` is the serialized owner for root governance files and package metadata.
  - `I-24` is the serialized owner for docs/reference governance polish after actual files exist.
  - `DL-18`, `DL-21`, and `DL-22` consume constraints but own disjoint decision artifacts.

## Domain-neutrality check

- DL-20A status consulted: green (`LOCKED` and validation `PASS`).
- governed surfaces affected: decision artifact and future governance docs/reference material.
- surface classification: harness-core governance policy, not consuming-project extension or sample/demo.
- positive generic terms used: maintainers, contributors, issues, pull requests, releases, versions, packages, presets, plugins, adapters, schematics, skills, standards, verification, context, security reports, changelog entries.
- project/business terms mentioned: none as core policy; source-forbidden examples are not used as governance defaults.
- result: PASS. Governance policy is domain-neutral and does not encode ecommerce, inventory, fashion, Billz, Telegram, Instagram, or other project-specific business vocabulary.
- extension boundary: consuming projects may add their own governance requirements, but those extensions are project-owned and must not become hidden harness defaults.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- writes limited to owned paths: yes.
- conflicts discovered: none. Target inventory showed no existing DL-19 decision artifact and only this DL-19 execution report in the owned work area after report-first creation. Other visible decision/work artifacts are unrelated and were not edited.

## Deferral rationale

Not applicable to decision status. This decision is `LOCKED`.

Operational metadata deferral only:

- deferred_question: exact maintainer contact/address and repository-hosting URL for conduct/security reports.
- reason_now: source docs do not provide operational contact metadata, and this policy decision can lock the required content model without inventing a real contact.
- future_owner: `I-00-repo-skeleton-governance` with operator/repository setup input.
- required_before_finalizing: public release/package publication and external contributor solicitation.
- blocked_dependents: public release/package publication if a real private reporting path is absent.
- proof_no_dependent_relies_now: `I-00` can create governance files from the policy and must block release if real contact/reporting values are unavailable; `I-24` can link actual files after I-00.

## Evidence checklist

1. Report artifact was created before substantive inspection and before this decision artifact, then updated after inspection.
2. Exact source files inspected are listed in the execution report and cited above by path/section.
3. Files changed by this lane are this decision artifact and the DL-19 execution report only.
4. No production/package/root/config/CI/generated starter/docs-reference files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Dependencies, blocks, blocked dependents, required-before-finalizing, deferrals, ownership, read-only, untouchable, and handoff fields use the DL-24A dependency declaration format.
7. Backlog §19 topics are resolved: license, contribution model, code of conduct, release/versioning, changelog, plugin/preset API stability, backwards compatibility, and security reporting.
8. License uses SPDX identifier `MIT` and maps to `LICENSE` and package metadata consequences.
9. Governance artifact map names future files/sections and owners for `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, README references, package metadata, release/version docs, and docs/reference links.
10. Verification/witness consequences include positive, negative, regression, and real-boundary downstream proof.
11. Ownership/path consequences are explicit and dirty-tree-safe.
12. DL-20A domain-neutrality is applied and passes.
13. Locked product decisions remain uncontradicted: `vibe-engineer`, open-source domain-neutral harness, starter consumption model, six skills, artifact flow, automatic verification/context, fixed stack/E2E references, mechanical gates, and no push/PR without approval.
14. Validator checklist and severity policy are included below.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and any available diff/inventory, not only this artifact.

### Positive witnesses

- This artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-19-open-source-governance.md`.
- Execution report exists at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-19-open-source-governance/DL-19-execution-report.md` and records report-first execution.
- DL-24A schema fields and dependency declaration are present.
- All backlog §19 topics are resolved or operationally assigned without dependent reliance on undecided policy.
- Governance artifact map is concrete enough for `I-00` and `I-24`.
- Handoffs to `DL-18`, `DL-21`, and `DL-22` are constraints only and do not take over sibling scope.
- Domain-neutrality checklist passes.

### Negative witnesses

- Reject if license/SPDX or exact legal blocker is absent while allowing `I-00` to proceed.
- Reject if code-of-conduct policy is vague or has no future artifact/owner.
- Reject if contribution model allows unvalidated direct merges.
- Reject if SemVer/calver/custom versioning is unresolved.
- Reject if changelog format/ownership is absent.
- Reject if plugin/preset public vs internal API boundaries are ambiguous.
- Reject if compatibility policy permits silent fallbacks, hidden legacy shims, or fake-green compatibility.
- Reject if security policy has no private reporting stance or silently takes over DL-22 technical controls.
- Reject any business-domain governance leakage as core harness policy.

### Regression witnesses

- `vibe-engineer` name remains unchanged.
- Harness remains open-source and domain-neutral.
- Starter kit remains generated/reference consumer, not copied harness logic.
- Six skills, artifact flow, automatic verification/context, mechanical gates, and no-push-without-approval remain intact.
- `DL-18`, `DL-21`, `DL-22`, `DL-20B`, and `DL-24B` remain later owner/audit decisions.

### Sibling/blast-radius checks

- Check final strategy §§3-6, §9.2, §10, and §§14-18 for consistency.
- Check DL-24A output discipline and DL-20A domain-neutrality for compliance.
- Check source docs for contradictions.
- Check no root governance files, README, package metadata, CI/release workflows, docs pages, production source, generated starter files, `.git/**`, or unrelated decision/work paths were edited.
- Check governance policy does not overconstrain docs, technical security controls, or CI/release implementation beyond required handoffs.

### Severity policy

- `critical`: locked decision contradiction; missing DL-24A/DL-20A prerequisite; missing decision artifact; out-of-license write; root governance/production file edit by this decision lane; missing concrete license/legal blocker; missing required backlog §19 topic; invalid deferral with dependent relying on it; evidence-bound verification contradiction; false real-boundary closure; domain-neutrality violation; unsafe dirty-tree operation.
- `major-local`: incomplete but repairable governance artifact map, unclear future owner/handoff, incomplete alternatives/evidence, incomplete compatibility/API-stability policy, or weak validation plan.
- `minor-local`: wording/citation/format issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: all schema, source, ownership, governance, domain-neutrality, and witness requirements satisfied.

## Known ambiguities / future owners

- Exact maintainer contacts, copyright holder/year, and repository-hosting URLs remain operational metadata for `I-00`/operator setup; public release is blocked if real private conduct/security reporting paths are absent.
- `DL-18` owns CI/CD provider defaults, tagging, release automation, package publishing mechanics, and local/CI parity.
- `DL-21` owns documentation structure and website/docs tooling.
- `DL-22` owns technical security/safety controls, hooks, scanners, command policies, environment defaults, and evidence logs.
- `I-00` owns creation of root governance files and package metadata.
- `I-24` owns docs/reference governance polish and link validation after actual files exist.
- `DL-20B` and `DL-24B` remain later audits and are not replaced by this decision.
