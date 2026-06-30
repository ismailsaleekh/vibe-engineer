# DL-15 — Mechanical Engine

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-15 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-15-mechanical-engine.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-15-mechanical-engine/DL-15-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §15 `Lint, boundary, and mechanical verification engine`; related §§10, 11, 14, 20, 22, 24.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1–13, especially governed surface, config guards, allowlists, schema/contract strictness, ratchet, wiring integrity, smells, test anti-patterns, priority, and final invariant.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§1.4–1.6; §§3–5; §5.13; §§6–9; §11; §§13–16.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§1–11.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§1–4; §§7–9; §11; §§15–16.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §§5.1–5.2 row `DL-15`; §§6–7; §§9.2–9.3; §§10–12; §§14–19.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §§1, 4, 5, 7, 8, 9, 10.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — required template, dependency declaration, evidence/validator checklists, real-boundary policy, ownership/dirty-tree policy, downstream gating.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`, `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — core/extension/sample-demo boundary, vocabulary policy, decision checklist, implementation enforcement plan, witness consequences.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`, `Domain-neutrality-specific audit`, `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md` and its validation report — verification runner/evidence/failure taxonomy handoff; validation observed `PASS`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-14-api-contract-mechanism.md` — read for coordination; validation report observed `IN-PROGRESS`, so DL-15 treats exact API mechanism as not green until independently validated.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-22-security-safety-model.md` — read for coordination; validation report observed `IN-PROGRESS`, so DL-15 does not rely on broad security policy as green.

## Decision summary

`vibe-engineer` mechanical verification is a hybrid engine: ESLint/custom ESLint rules handle AST-local TypeScript/import/test rules; typed standalone validators handle repository-wide contracts, config, governed surface, dependency graph, baselines, wiring, schema/contract strictness, generated-client freshness, domain-neutrality surface policy, and security-sensitive carrier checks; an aggregate quality runner invokes all required gates and emits typed findings/evidence for the DL-10 verification layer.

Deterministic P0/P1 mechanical gates are hard blockers or ratcheted blockers as specified below. Advisory review is supplementary only. Low-confidence structural smell detectors may begin advisory/ratcheted, but the smell framework, finding schema, fixture discipline, and calibrated high-confidence detectors are not optional.

## Decision details

1. The mechanical engine owns deterministic linter-like quality truth for governed surfaces; it does not replace unit/integration/E2E/security/observability/test-runner decisions.
2. The engine must expose a typed finding schema, typed allowlist/baseline schemas, a governed-surface registry, and aggregate runner semantics consumable by DL-10 verification evidence.
3. ESLint-only and regex-only enforcement are rejected for load-bearing boundaries. Import/boundary/source rules must use AST/parser services or a typed dependency graph; schema/contract rules must inspect named runtime schema sources and actual contract/client/provider artifacts, not prose or parser self-agreement.
4. Standalone validators are mandatory for cross-file/repo checks: surface registry integrity, config inheritance, package boundaries, dependency graph, generated-client freshness, duplicate schema detection, baselines/ratchet, wiring integrity, and CI/local parity.
5. The aggregate runner is the single local quality entrypoint for mechanical gates. I-20 must prove CI invokes the same semantic runner path; CI-only or local-only bespoke scripts are fake green.
6. All hard or ratcheted gates must produce stable typed findings. Narrative scanner output, untyped side files, or consumer regex parsing are invalid for load-bearing pass/fail decisions.
7. Projects may extend mechanical rules only through typed extension manifests/config, governed surfaces, and allowlist/baseline policies. Project-specific business rules must not become core defaults.
8. DL-15 does not implement production code and does not claim live seam proof. Later implementation lanes must prove the actual provider/carrier/consumer joins listed in this artifact.

## Alternatives considered

### ESLint-only engine

- decision: rejected
- rationale: ESLint is appropriate for AST-local rules, import restrictions, and many test anti-patterns, but cannot alone prove repo-wide surface completeness, config inheritance, CI wiring, baselines, generated-client freshness, contract-source uniqueness, or local/CI parity.
- consequences: custom ESLint rules are required but are only one engine component.

### Standalone-validator-only engine

- decision: rejected
- rationale: standalone validators can inspect repo-wide state but would miss the mature AST/type-aware ESLint ecosystem and editor/agent feedback loop for TypeScript source/test issues.
- consequences: standalone validators own cross-file/repo gates; ESLint rules own AST-local gates.

### Advisory-only mechanical review

- decision: rejected
- rationale: source doctrine says deterministic gates hard-block and advisory review cannot be sole closure proof. Advisory-only review would permit fake-green lint, unreviewed escapes, unvalidated contracts, and weak tests.
- consequences: advisory reviewers may recommend new detectors or semantic findings but cannot replace deterministic hard gates.

### Selected hybrid engine

- decision: accepted
- rationale: combining custom ESLint rules, typed standalone validators, aggregate runner, ratchet/baseline, wiring proof, and advisory calibration gives deterministic coverage without forcing one tool to do every job.
- consequences: I-10/I-11/I-12/I-13/I-20 have disjoint implementation ownership and concrete proof obligations.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies decision schema, evidence, dependency, real-boundary, and dirty-tree rules.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies domain-neutral core/extension/sample-demo policy and deterministic enforcement ownership.
    - id: DL-10-verification-implementation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies verification runner/evidence/failure semantics consumed by mechanical findings.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification layer, mechanical gates, backlog, strategy, playbook, and quality bar define DL-15 requirements.
  blocks:
    - id: I-10-mechanical-gates-P0
      reason: Needs P0 mechanism/status/finding/evidence requirements.
    - id: I-11-contract-strictness-minimal-real-fixture
      reason: Needs schema/contract strictness gate and real provider/client/consumer proof expectations.
    - id: I-12-mechanical-gates-P1-ratchet-test-scanner
      reason: Needs ratchet/baseline and test anti-pattern decisions.
    - id: I-13-mechanical-gates-P2-smells
      reason: Needs smell framework/calibration/finding schema policy.
    - id: I-20-ci-local-parity-wiring
      reason: Needs aggregate runner and wiring-integrity parity requirements.
  blocked_dependents:
    - id: I-10-mechanical-gates-P0
      blocked_until: DL-15 and DL-22 are green and P0 implementation can run aggregate quality against actual governed surfaces.
      relying_on: governed surface, config guards, allowlist, boundary/domain-purity, security-sensitive carrier checks, and wiring-foundation rules.
    - id: I-11-contract-strictness-minimal-real-fixture
      blocked_until: DL-14 and DL-11 are green enough for implementation closure, plus DL-15 strictness requirements are implemented.
      relying_on: named runtime schema boundary, no duplicate contract sources, generated client alignment, real provider/client/consumer proof.
    - id: I-12-mechanical-gates-P1-ratchet-test-scanner
      blocked_until: I-10 is clean and DL-11 supplies runner/tooling decisions needed by generated rule tests.
      relying_on: baseline/ratchet schema and test anti-pattern scanner.
    - id: I-13-mechanical-gates-P2-smells
      blocked_until: I-10 and I-12 are clean.
      relying_on: smell detector framework, calibration policy, stable finding schema, and baseline integration.
    - id: I-20-ci-local-parity-wiring
      blocked_until: I-09/I-10/I-12/I-13/I-18 exist and DL-18 is available.
      relying_on: local aggregate quality command and same-runner CI/static wiring proof.
  required_before_finalizing:
    - id: DL-11-test-runner-tooling
      required_content: Exact runner/tooling support for generated rule tests, fixtures, contract tests, scanner tests, and anti-pattern tests.
    - id: DL-14-api-contract-mechanism
      required_content: Green API/runtime contract mechanism for schema/contract strictness enforcement details.
    - id: DL-22-security-safety-model
      required_content: Green security policy for secret/prod-credential/destructive/env scanner catalogs and evidence semantics.
    - id: DL-18-ci-cd-defaults
      required_content: CI provider details for I-20 parity wiring.
  deferrals:
    - deferred_question: Exact package names, script names, config filenames, and CI workflow syntax.
      rationale: Owned by DL-01/I-00 and DL-18/I-20; DL-15 locks mechanism and proof requirements only.
      future_owner: I-10/I-20 with DL-01/DL-18 constraints
      allowed_now: true
      blocked_dependents: [I-10, I-20 if concrete names are needed]
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact test-runner APIs for rule/scanner fixtures.
      rationale: Owned by DL-11; DL-15 locks positive/negative/regression fixture expectations.
      future_owner: DL-11-test-runner-tooling
      allowed_now: true
      blocked_dependents: [I-11, I-12, generated rule-test closure]
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact security scanner catalogs and broad safety policy.
      rationale: Owned by DL-22/I-18; DL-15 owns only mechanical carrier/wiring expectations.
      future_owner: DL-22-security-safety-model / I-18-security-safety-hooks-policy
      allowed_now: true
      blocked_dependents: [I-10, I-18, I-20 security-sensitive closure]
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-15-mechanical-engine.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-15-mechanical-engine/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/** prerequisite and sibling decisions
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/** prerequisite and sibling reports
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-15 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - production package/source paths
    - root config files
    - CI workflows/scripts
    - generated starter files
    - non-DL-15 decision/report/work paths
    - /Users/lizavasilyeva/work/harness-starter/**
  handoff_notes:
    - from: DL-15
      to: I-10/I-11/I-12/I-13/I-20
      condition: After DL-15 independent validation is clean and each lane's sibling prerequisites are green.
      shared_path_policy: disjoint_or_serialized_by_strategy
```

## Gate-family matrix

| Priority       | Family                                                | Mechanism category                                                                         | Default status                                                                                                                | Rationale                                                                                                   | Owner                                                 | Fixture/evidence expectations                                                                                                                                                                                   | Handoffs                                                  |
| -------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| P0             | Governed quality surface registry                     | typed standalone validator + aggregate runner                                              | hard_block                                                                                                                    | A green tool is meaningless when governed files are omitted.                                                | `I-10`                                                | positive: complete surface passes; negative: omitted, duplicate, empty, leaked exclusion, missing path fail; regression: adding package requires surface update. Evidence: governed-surface report.             | `I-20` proves CI/path-filter parity.                      |
| P0             | Strict TypeScript/ESLint/Prettier/config guards       | config guard + custom ESLint rules + aggregate runner                                      | hard_block                                                                                                                    | Strict TS, lint, and formatting cannot silently weaken.                                                     | `I-10`                                                | weakened tsconfig/eslint/prettier/script fixture fails; strict inherited config passes; regression protects all required strict flags. Evidence: config-guard report.                                           | `DL-01/I-00` root config; `I-20` root/CI handoff.         |
| P0             | Escape/suppression allowlist                          | custom ESLint rules + typed standalone allowlist validator                                 | hard_block                                                                                                                    | Escapes are exceptional and must be reviewed/current.                                                       | `I-10`                                                | allowed reviewed row passes; unallowlisted, stale, duplicate, missing rationale, hard-banned `as any`/raw boundary `JSON.parse` fail. Evidence: allowlist report.                                               | DL-22 policy for security-sensitive exceptions.           |
| P0             | Package boundary, dependency graph, forbidden imports | ESLint import rule + typed dependency graph validator                                      | hard_block                                                                                                                    | Architecture boundaries require AST/graph-aware checks, not text matching.                                  | `I-10`                                                | valid direction passes; forbidden import/cycle/private package reach-in fails; regression locks harness package boundaries. Evidence: boundary graph report.                                                    | DL-01 package names; I-00/I-20 root ownership.            |
| P0             | Domain-purity / forbidden core leakage                | governed surface validator + AST/token-aware prompt/doc/rule scanner + advisory supplement | hard_block for deterministic core leakage; advisory supplement for semantic ambiguity                                         | DL-20A makes domain-neutrality a closure gate; deterministic proof over governed core surfaces is required. | `I-10` with I-04/I-07/I-15/I-24/DL-20B                | generic core terms pass; core business-domain leakage fails unless negative-example/sample-demo metadata is present; unlabeled sample fails. Evidence: domain-neutrality mechanical report.                     | DL-20A, DL-20B, I-04/I-24 semantic review.                |
| P0/P1-security | Secret/prod-credential mechanical carrier             | typed scanner finding schema + allowlist validator + aggregate runner                      | pending_until_dependency → hard_block when DL-22/I-18 policy exists                                                           | DL-15 decides mechanical carrier/wiring; DL-22 owns policy catalogs and broad safety.                       | `I-10` carrier, `I-18` policy/scanners, `I-20` parity | placeholder fixture passes; real-looking secret/prod credential fixture fails; stale/overbroad allowlist fails. Evidence: redacted typed security finding report.                                               | DL-22/I-18 required before security closure.              |
| P1a            | Schema/contract strictness                            | typed standalone validator + contract-specific AST/schema checks + aggregate runner        | pending_until_dependency → hard_block before I-11 closure                                                                     | Boundary data must use named runtime schemas; duplicated sources/parser self-agreement are rejected.        | `I-11` with DL-14 handoff                             | valid provider+generated client+consumer passes; unvalidated payload, duplicate schema, stale client, parser-only test fail. Evidence: contract-strictness report and real join evidence.                       | DL-14, DL-11, DL-10.                                      |
| P1b            | Quality ratchet                                       | typed baseline schema + ratchet validator + aggregate runner                               | ratcheted hard_block                                                                                                          | Existing debt may be snapshotted; new/stale/growing debt is blocked unless approved.                        | `I-12`                                                | new finding fails; stale baseline row fails; approved shrink passes; growth requires operator-approved evidence. Evidence: ratchet comparison report.                                                           | Consumes findings from P0/P1/P2 and DL-10 evidence.       |
| P1b            | Test anti-pattern scanner                             | custom ESLint test rules + typed standalone test validator                                 | hard_block for deterministic banned patterns; ratcheted/advisory for low-confidence rules                                     | Bad tests create false confidence; generated tests need meaningful assertions and metadata.                 | `I-12`                                                | meaningful test passes; smoke-only/no assertion/exit-code-only/skipped-without-metadata/volatile snapshot/setup-silent-pass fail. Evidence: test scanner report.                                                | DL-11 runner choices; DL-10 evidence.                     |
| P2             | Code-smell detector framework/calibration             | AST/structure-first standalone scanner + optional ESLint helpers + advisory reviewer       | framework/schema hard_block; detector findings ratcheted/advisory until calibrated; calibrated high-confidence may hard_block | Smells are structural risk; low confidence must be calibrated before strict blocking.                       | `I-13`                                                | clean fixture passes; smelly fixture emits stable finding; threshold regression protects false positives; high-confidence detector blocks only after calibration. Evidence: smell report and calibration notes. | I-12 baseline integration; advisory review supplementary. |
| CI/local       | Quality wiring-integrity                              | standalone wiring validator + CI/static check + aggregate runner                           | hard_block                                                                                                                    | A gate is real only when local scripts, agent commands, and CI run the same blocking path.                  | `I-20`                                                | CI missing aggregate/path filter/dependency fails; local and CI invoke same runner passes; runner list printable for evidence. Evidence: wiring/parity report.                                                  | DL-18 CI defaults, DL-10 verification runner.             |

## Tooling and architecture choices

- Mechanical package shape: future code belongs under `packages/mechanical-gates/**` per final strategy ownership; DL-15 does not create it.
- Rule layers:
  - ESLint/custom rules: AST-local TypeScript safety, import/boundary rules, forbidden escapes, local test anti-patterns, and source-level smell helpers.
  - Typed standalone validators: governed surface, config inheritance, dependency graph, schema/contract strictness, baselines, wiring integrity, generated-client freshness, domain-neutrality metadata, and security-sensitive carrier checks.
  - Aggregate runner: single semantic mechanical entrypoint invoked by local quality, DL-10 verification, build/ship, and CI/local parity.
  - Advisory reviewers: only for nuanced smell/domain/security semantics; never sole closure for deterministic gates.
- Finding schema expectations:
  - fields: `schemaVersion`, `tool`, `family`, `ruleId`, `severity`, `status`, `blocking`, `path`, optional `span`, `symbol`, `stableIdentity`, `structuralSignature`, `message`, `evidenceRefs`, `owner`, `allowlistRef`, `baselineRef`, `configFingerprint`, `surfaceId`, `createdAt`.
  - stable identity must not rely only on line numbers; use symbol/AST structure/content hash where possible.
- Baseline/allowlist expectations:
  - baselines are typed, versioned, scoped to governed surface fingerprints, and track stable finding identities;
  - allowlists are typed, reviewed, justified, owner/reviewer-scoped, and stale/duplicate/overbroad rows fail;
  - baseline growth requires explicit operator approval evidence; baseline shrink is allowed.
- Extension mechanism:
  - consuming projects may add typed rule packs, governed surfaces, baselines, and allowlists through extension manifests;
  - extension rules cannot weaken core hard gates or encode project-specific concepts into harness core.

## Boundary, dependency, and domain-purity rules

- Package boundary enforcement must combine ESLint import checks with a typed dependency graph validator. Text/regex-only import scanning is invalid for load-bearing enforcement.
- Forbidden imports include private implementation reach-ins, reverse dependency edges, generated/vendor/core leakage, package cycles where forbidden, and consuming-project extension imports from core packages.
- Domain-purity enforcement applies DL-20A: core rules/prompts/fixtures/docs must use generic harness vocabulary; project-specific vocabulary is allowed only in explicit extension or labeled sample/demo/negative fixtures.
- Generated starter sample/demo content must remain labeled and isolated. Mechanical domain-purity checks must not assume a particular business domain.

## Security-sensitive mechanical checks

DL-15 decides the mechanical carrier for secret/prod-credential detection: typed findings, redacted evidence, scoped allowlists, governed surface coverage, aggregate runner inclusion, and CI/local wiring proof. Broad security policy, command/destructive/env policy, scanner catalog details, approval semantics, and sandbox claims are owned by DL-22/I-18. Until DL-22 is independently green and I-18 supplies implementation policy, security-sensitive mechanical closure is `pending_until_dependency`; once available, deterministic secret/prod-credential findings are hard blockers.

## Schema/contract strictness requirements

The named rule family is `named-runtime-schema-boundary`.

Requirements:

1. External/input payloads enter as `unknown` or equivalently untrusted values.
2. Boundary payloads must be narrowed through named runtime schemas before use.
3. Important contracts must not use bare object/list/map shapes, duplicated DTOs, broad `Record<string, unknown>` domain models, or unvalidated `JSON.parse` at boundaries.
4. Provider, client, and consumer must share one canonical contract source; generated clients must be derived from that source and freshness-checked.
5. Contract tests must prove real behavior. Parser self-agreement, duplicated fixtures shaped to the parser, or mocked-only provider/client tests are negative witnesses.
6. If DL-14 is not independently green when I-11 runs, I-11 remains blocked for exact mechanism. DL-15 still requires the strictness properties above for whichever DL-14 mechanism is green.
7. Earliest real proof owner: `I-11-contract-strictness-minimal-real-fixture` with actual provider/API, generated client/carrier, and actual consumer fixture. Full starter proof remains `I-16`.

## Blocked dependents

- `I-10-mechanical-gates-P0`: blocked until DL-15 is validated and DL-22 security policy dependency is green where security-sensitive P0 checks are in scope.
- `I-11-contract-strictness-minimal-real-fixture`: blocked until DL-15 plus DL-14/DL-11 prerequisites are green enough for implementation closure.
- `I-12-mechanical-gates-P1-ratchet-test-scanner`: blocked until I-10 is clean and DL-11 test tooling is available.
- `I-13-mechanical-gates-P2-smells`: blocked until I-10/I-12 are clean.
- `I-20-ci-local-parity-wiring`: blocked until aggregate runner and mechanical/security gates exist and DL-18/I-09 prerequisites are available.
- Downstream lanes relying on mechanical evidence (`I-15`, `I-16`, `I-18`, `I-21`, `I-22`, `I-23`, final closure) remain blocked if required mechanical evidence or real-boundary proof is missing.

## Verification/witness consequences

- deterministic checks affected: P0 surface/config/allowlist/boundary/domain/wiring, P1 schema/contract/ratchet/test scanner, P2 smells, CI/local parity.
- positive witnesses downstream: complete governed surface, strict configs, reviewed allowlist row, legal boundary imports, generic domain-neutral core, named schema boundary, valid baseline shrink, meaningful tests, clean smell fixture, same local/CI runner.
- negative witnesses downstream: omitted governed file, weakened strict config, unallowlisted escape, forbidden import, core business-domain leakage, unvalidated payload, duplicate schema, parser self-agreement, stale generated client, new debt, stale baseline, weak/skipped tests, smell fixture, missing CI aggregate.
- regression witnesses downstream: product name, two-repo direction, six skills, artifact flow, Verification Delta ownership by `plan`, automatic build/ship verification/context/evidence, fixed starter stack/E2E, DL-20A/DL-24A foundations, no push/PR without approval.
- real_boundary_required: yes for implementation lanes; no live runtime seam is created by this decision artifact.
- real_boundary_status: not_applicable for DL-15 artifact; required_before_closure for I-10/I-11/I-12/I-13/I-20.
- closure rule: shape-only fixtures or mocked runners cannot close implementation lanes. If the actual aggregate/provider/client/baseline/scanner/CI seam cannot run, the owning lane is `pending-live/BLOCKED`.

## Ownership/path consequences

Future ownership follows final strategy §9.3:

- `I-10`: `packages/mechanical-gates/src/p0/**`, `packages/mechanical-gates/fixtures/p0/**`, `packages/mechanical-gates/package.json`, `.vibe/work/I-10-mechanical-gates-P0/**`.
- `I-11`: `packages/contracts/**`, `packages/mechanical-gates/src/p1/schema-contract-strictness/**`, `packages/mechanical-gates/fixtures/p1/schema-contract-strictness/**`, `.vibe/work/I-11-contract-strictness-minimal-real-fixture/**`.
- `I-12`: `packages/mechanical-gates/src/p1/quality-ratchet/**`, `packages/mechanical-gates/src/p1/test-anti-pattern/**`, corresponding fixtures, `.vibe/work/I-12-mechanical-gates-P1-ratchet-test-scanner/**`.
- `I-13`: `packages/mechanical-gates/src/p2/code-smell/**`, `packages/mechanical-gates/fixtures/p2/code-smell/**`, `.vibe/work/I-13-mechanical-gates-P2-smells/**`.
- `I-20`: `.github/workflows/**`, `scripts/quality/**`, `scripts/ci/**`, `package.json`, `turbo.json`, `.vibe/work/I-20-ci-local-parity-wiring/**`, serialized root/CI ownership only.

DL-15 itself changed only its decision artifact and execution report.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED`/PASS.
- governed surfaces affected: future mechanical rules, validators, prompts/docs/fixtures, generated rule tests, starter sample/demo checks, extension manifests.
- surface classification: core mechanical engine is harness core; project-specific mechanical rules are consuming-project extensions; generated starter/golden examples are sample/demo/reference.
- allowed generic terms: packages, modules, contracts, schemas, adapters, tests, fixtures, context, evidence, rules, validators, baselines, allowlists, imports, dependencies, runners, CI.
- project/business terms: none are core defaults. DL-20A-forbidden examples may appear only as negative examples or labeled sample/demo fixtures.
- deterministic enforcement: assigned to I-10 domain-purity governed-surface gate with DL-20B/I-24/advisory supplements.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes
- git stash/reset/clean/checkout/restore used: no
- writes limited to owned paths: yes
- conflicts discovered: none. Initial inventory showed no existing DL-15 decision artifact and no DL-15 work directory before this report was created; current DL-15 work directory contains this execution report.
- production/package/root/config/CI/generated starter files edited: no.

## Deferral rationale

Not applicable to decision status. This decision is `LOCKED`.

Deferred implementation details are assigned and gated:

- exact package/script/config/CI names: future owners I-10/I-20 with DL-01/DL-18 constraints;
- exact test runner APIs: DL-11; implementation closure blocked until available;
- exact API contract library/mechanism: DL-14; DL-15 only locks strictness requirements and real proof obligations;
- exact security policy/scanner catalogs: DL-22/I-18; DL-15 only locks mechanical carrier/wiring.

No dependent may rely on those deferred details as decided unless the named owner is green and proof exists.

## Evidence checklist

1. Execution report was created before this decision artifact.
2. Required source files and relevant decisions/reports were inspected and cited.
3. Files changed are limited to this decision artifact and DL-15 execution report.
4. No production/package/root/config/CI/generated starter files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Every locked mechanical family is mapped to mechanism, status, owner, fixtures, evidence, and handoffs.
7. Deterministic gates remain hard blockers or ratcheted blockers where source doctrine requires; advisory review is supplementary.
8. Related not-yet-green DL-11/DL-14/DL-22 details are handled as handoffs/blocked dependents, not invented readiness.
9. Domain-neutrality is applied per DL-20A.
10. Real-boundary proof is required from later implementation lanes and not claimed by this decision artifact.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and available inventory/diff evidence.

Positive witnesses:

- Artifact exists at the required path and follows DL-24A schema.
- Gate-family matrix covers governed surface, strict configs, allowlist, schema/contract strictness, ratchet, wiring, smells, test anti-pattern scanner, boundary/dependency/domain-purity, secret/prod-credential carrier, and generated rule-test expectations.
- P0 maps to I-10, schema/contract to I-11, ratchet/test scanner to I-12, smells to I-13, CI/local parity to I-20.
- DL-20A domain-neutrality and DL-10 evidence semantics are preserved.

Negative witnesses:

- Missing locked gate family is critical.
- Deterministic gate downgraded to advisory-only is critical.
- Schema/contract plan accepting parser self-agreement, duplicate schemas, unvalidated payloads, or shape-only tests is critical.
- Boundary/import enforcement relying on untyped text matching for load-bearing rules is critical.
- DL-11/DL-14/DL-22 unresolved choices must block or hand off; they must not be fabricated green.
- Business-domain leakage in core rules/fixtures/prompts is critical.

Regression witnesses:

- `vibe-engineer` name, two-repo direction, six skills, artifact flow, plan/build/ship responsibilities, fixed starter stack/E2E, automatic verification/context/evidence, DL-20A/DL-24A roles, and no-push-without-approval remain uncontradicted.

Severity policy:

- `critical`: missing/contradicting prerequisites; out-of-license write; production implementation by DL-15; missing locked gate family; false real-boundary closure; advisory-only replacement for deterministic gates; missing owner/evidence for core proof; source contradiction; domain-specific core leakage; invalid dependency deferral relied on by implementation.
- `major-local`: incomplete matrix, unclear status/owner/handoff, incomplete fixture/evidence expectations, or ambiguous future owner limited to DL-15/direct dependents.
- `minor-local`: wording/citation issue that does not weaken gates or unblock dependents incorrectly.
- `clean`: all schema, source, ownership, gate-family, dependency, witness, domain-neutrality, and dirty-tree requirements satisfied.

## Known ambiguities / future owners

- `DL-11` was not visible as a decision artifact in inspected inventory; it owns exact test runner/tooling needed by generated rule tests and contract/scanner fixtures.
- `DL-14` artifact was visible but validation was observed `IN-PROGRESS`; exact API mechanism must be treated as not green until independent validation passes.
- `DL-22` artifact was visible but validation was observed `IN-PROGRESS`; broad security/safety policy must be treated as not green until independent validation passes.
- `DL-18` will own CI/CD provider defaults; I-20 owns serialized CI/root wiring proof.
- `DL-20B` and `DL-24B` remain later audits and are not replaced by DL-15.
