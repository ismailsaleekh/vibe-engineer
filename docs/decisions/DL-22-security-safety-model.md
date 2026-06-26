# DL-22 — Security and Safety Model

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-22 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-22-security-safety-model.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-22-security-safety-model/reports/decision-lock-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 row `DL-22-security-safety-model`; §6.2 `Implementation DAG`; §7 `Explicit ready queue rules`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§14–18 evidence, dirty-tree, closure, and severity rules.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §5 `DAG and ready-queue safety check`; §7 `Verification and real-boundary witness check`; §§8–10 coverage, severity, and recommendation.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/ready-queue.md` — §5 `Explicitly blocked items and blockers`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md` — `Evidence Packet`; `Validation and type-generation consequences`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-06-agentic-harness-integrations.md` — `Common harness adapter abstraction`; `Pi v1 integration decision`; `Explicit pi limitations`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md` — `Decision details`; `Machine-readable output and error contract`; `Interactive and non-interactive behavior`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md` — `Decision details`; `Evidence packet requirements`; `Failure classification taxonomy`; `Deterministic hard blockers vs advisory results`; `Verification/witness consequences`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§3.1 `Domain-neutral core`; 3.4 `Verification/context updates are automatic`; 7 `CLI role`; 9 `Verification model`; 15 `Success criteria`; 16 `Locked decisions and planning backlog`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§1–8, 10–11.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§1.1–1.6; 5.1 `Safety hooks and hard guards`; 5.6 `Contract and adapter tests`; 5.9 `AI evaluation tests`; 5.11 `Context and drift checks`; 5.13–5.14; 6.2; 8–9; 13–16.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1, 4, 5, 7, 8, 11–13.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §22 `Security and safety model`; §24 `Planning-phase output requirement`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§5.2, 10–11.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

`vibe-engineer` v1 security and safety is a deterministic, fail-closed policy model for the domain-neutral harness. It requires hard gates for secrets, production-like credentials, unsafe commands, destructive operations, generated env/config defaults, external integrations, and security evidence. Advisory review may supplement these gates but never replaces deterministic closure for core security/safety claims.

The harness must be honest about its control boundary: it can enforce generated policy checks, hooks, CLI guards, verification runners, evidence packets, and adapter capability declarations; it must not claim OS/container/network/tool sandbox isolation unless the selected harness, OS, or CI environment actually provides it and a later implementation lane proves it at the real boundary.

This decision defines requirements and proof ownership only. It does not implement scanners, hooks, CLI commands, mechanical gates, CI workflows, adapters, schemas, generated starter files, or production code.

## Decision details

### Security/safety scope

In scope for the v1 security/safety model:

1. Harness core security policy for CLI primitives, hooks, verification, mechanical gates, generated config/env conventions, generated starter defaults, selected agentic harness adapters, and external integration defaults.
2. Security-sensitive generated artifacts and fixtures, including sample/demo/reference fixtures, when they could accidentally embed secrets, production credentials, unsafe commands, or unproven external operations.
3. Machine-readable security results consumed by CLI, verification, build, ship, CI/local parity, and final bug-hunt lanes.
4. Operator approval boundaries for destructive or externally mutating actions.
5. Audit/evidence records for scanner results, blocks, denials, approvals, overrides, env validation, external integration decisions, and verification outcomes.

Out of scope for this decision-only artifact:

- exact CLI command names or final CLI schemas beyond security requirements;
- exact Evidence Packet schema field names beyond required semantics;
- exact scanner engines, regexes, secret-rule catalogs, hook files, package code, CI provider syntax, generated starter layout, or mechanical implementation;
- project/business-domain safety rules for a consuming project.

### Threat/safety assumptions

The v1 model protects against these generic risks:

- real secrets or credentials being generated, committed, logged, inserted into fixtures, or written into evidence;
- production-like credentials, endpoints, tokens, or environment names being used from local/dev/test/CI defaults without explicit policy and evidence;
- agents executing commands outside their intended write paths, invoking destructive tools, weakening repository state, pushing/opening PRs, publishing, deploying, or mutating external systems without approval;
- external integrations leaking tokens, making unapproved network mutations, or silently falling back to unsafe behavior;
- adapters claiming capabilities or sandboxing stronger than the actual selected harness can enforce;
- verification/build/ship/CI paths proceeding without security evidence;
- advisory-only review being treated as hard security closure.

The harness assumes hostile or accidental input may arrive through user prompts, generated files, environment variables, artifact files, adapter payloads, external API data, logs, and tool output. Boundary data must be schema-validated and security-checked before load-bearing consumers rely on it.

### Secret scanning policy

A secret is any value that grants access, authenticates a principal, decrypts data, signs requests, controls infrastructure, or would be unsafe to disclose. This includes tokens, API keys, passwords, private keys, certificates, session cookies, OAuth credentials, database connection strings with credentials, webhooks with embedded credentials, signing secrets, encryption keys, cloud/provider credentials, package registry tokens, deploy keys, and equivalent future credential classes.

Requirements:

1. Secret scanning must run over governed harness core surfaces, generated starter templates/fixtures, generated env/config examples, docs/examples that are shipped as runnable assets, adapter assets, hooks, CLI-visible configs, and evidence/log artifacts where secrets could appear.
2. Secret scanning must fail closed for committed/generated real-looking secrets and credentials. It must not silently redact and continue when a secret exists in a generated default or committed fixture.
3. Generated defaults and fixtures must never contain real secrets or production credentials. Placeholders must be visibly non-secret and generic, such as `REPLACE_WITH_LOCAL_ONLY_VALUE` or `DUMMY_NON_SECRET_TOKEN`, and must be distinguishable by env metadata from real credentials.
4. False positives may be allowlisted only through a reviewed, typed allowlist entry with path or artifact id, rule id, stable fingerprint that does not expose the secret value, owner/reviewer, justification, expiry or review condition, and evidence that the value is non-secret. Unscoped or permanent blanket allowlists are invalid.
5. Allowlists are themselves security-sensitive artifacts. Missing, stale, duplicate, overbroad, or rationale-free allowlist entries must fail deterministic validation.
6. Scanners may use pattern/signature rules as detection mechanisms, but load-bearing pass/fail decisions must be represented through typed findings/evidence, not through prose or heuristic consumer parsing.
7. Scanner output must be redacted by default. Evidence may include rule ids, classifications, file paths, spans, and fingerprints; it must not print secret values.

### Production credential detection policy

Production-like credentials and endpoints require stricter treatment than generic secrets because local/dev/test/CI generated assets must not accidentally point at real environments.

Requirements:

1. Env/config validation must classify variables and config fields by security role: non-secret, secret placeholder, local-only secret, test-only value, external integration token, production-restricted credential, endpoint, destructive-operation control, or unknown.
2. Production indicators include generic names and metadata such as `PROD`, `PRODUCTION`, `LIVE`, `DEPLOY`, `RELEASE`, production-restricted environment labels, provider account identifiers, non-local endpoints, credential-bearing URLs, and fields marked production-restricted by schema/config. Exact detection catalogs are implementation-owned, but the policy is fail-closed when classification is unknown and production impact is plausible.
3. Generated `.env.example`, sample config, starter defaults, CI examples, and docs snippets must use placeholder values only. They must not include real hostnames, account ids, tokens, passwords, private keys, deploy keys, or production database URLs.
4. Generated local/dev/test/CI defaults must prefer loopback/local service endpoints, test containers, in-memory/local fixtures, or empty disabled integration settings. Any required nonlocal integration must be disabled until the operator supplies credentials outside committed/generated defaults.
5. A real production credential may never be generated into defaults, committed fixtures, docs examples, or evidence packets. A later implementation may support operator-supplied production credentials only through explicit runtime environment or secret-store mechanisms, with redaction and audit evidence.
6. A config that looks production-capable but lacks explicit operator approval, environment classification, and security evidence must block CLI/verification/build/ship/CI consumers.

### Command allow/deny/destructive-operation policy

Agent-executed commands use a default-deny safety posture for security-sensitive or destructive behavior. The final CLI surface belongs to `DL-07`; DL-22 locks these security requirements for whichever commands and adapters invoke tools.

Requirements:

1. Commands must be classified before execution as read-only, local deterministic write within owned paths, network read, network/external mutation, destructive local operation, repository-state operation, credential operation, production-impacting operation, or unknown.
2. Unknown, unclassified, or policy-unmatched commands are blocked by default in agent/CI/non-interactive modes.
3. Allowed commands must be scoped to explicit project roots, owned write paths, read-only paths, untouchable paths, and expected side effects. A command allowed in one lane is not globally allowed.
4. Denied or approval-required categories include, at minimum: deleting or overwriting outside owned paths; modifying `.git/**`; using stash/reset/clean/checkout/restore; force pushes; opening PRs or pushing without explicit approval; publishing packages; deploying; running migrations against production-like environments; mutating external APIs; writing to credential stores; exfiltrating files/secrets; disabling security/verification gates; weakening config; and any command whose safety classification is unknown.
5. Destructive operations require explicit operator approval unless a locked future decision makes a narrower deterministic non-interactive exception. Approval must be scoped, time-bounded or invocation-bounded, tied to an exact command/action and paths/resources, recorded in evidence, and rechecked by the consuming command/hook.
6. Approval cannot waive these hard prohibitions: generating or committing real secrets into defaults/fixtures, claiming unsupported sandboxing, silently bypassing required security evidence, editing unowned paths, or treating failed deterministic security gates as green.
7. Non-interactive automation must never pause for hidden prompts. Missing required approval produces a machine-readable blocked result.
8. CLI/security hooks must surface blocks, denials, and approval-required states through stable machine-readable classifications consumable by verification/build/ship/CI.

### Sandboxing assumptions and non-claims

The harness must not overclaim sandboxing.

What the harness can require or enforce through its own implementation:

- typed command policies, path ownership, CLI guards, hooks, deny/allow decisions, generated config defaults, scanner/validator results, evidence packets, and adapter capability declarations;
- deterministic blocking when a command/config/integration violates known policy;
- redaction and no-secret logging policies for harness-produced outputs;
- documentation of required environment controls for local/CI/operator contexts.

What the harness must not claim unless later proven by actual environment/harness support:

- filesystem isolation beyond path checks;
- network isolation or egress filtering;
- process sandboxing, container isolation, or syscall restrictions;
- prevention of all malicious model/tool behavior;
- selected harness enforcement of tool permissions beyond its documented/proven capabilities;
- CI/provider isolation beyond configured workflows and provider guarantees.

Every adapter/environment must declare sandbox capability as `proven`, `not_provided`, `unknown`, or `blocked/pending-live`. Unsupported sandbox capabilities must not silently degrade into a success claim. If a later lane depends on real sandbox isolation and cannot prove it through actual provider/API/spawn/tool execution, that lane remains `pending-live/BLOCKED`.

### Generated env/config conventions

Generated env/config defaults must be safe, domain-neutral, and non-secret.

Requirements:

1. Generated examples must use placeholder values, local-only defaults, or disabled integration stubs. They must not embed real credentials, production endpoints, or sensitive account identifiers.
2. Generated committed env files must be examples/templates only unless a later owner explicitly separates a local uncommitted file. Any real local secret must live outside committed/generated defaults.
3. Env/config schemas must mark secret-bearing fields, production-restricted fields, external-integration fields, destructive-operation controls, and safe placeholder fields.
4. Placeholder values must be machine-recognizable and must not accidentally satisfy production credential detection.
5. Config inspection, validation, and evidence output must redact secret-bearing fields and credential-like values by default.
6. Missing required real credentials for an external integration should disable or block that integration with evidence, not silently substitute fake credentials or call a production endpoint.
7. Local/dev/test/CI defaults must preserve locked config concepts such as `agenticHarness`, `maxParallelAgents: 8`, `maxValidationFixIterations: 3`, and `agenticWorkPackageTargetHours: 6` without making those values secrets.
8. CI examples must not require production credentials to pass baseline harness verification. If optional integration tests require external credentials, they must be explicitly opt-in, redacted, and blocked/skipped only under a policy that records why required coverage remains valid.

### External integration safe defaults

External integrations include agentic harness adapters, APIs, webhooks, package registries, model/tool providers, CI providers, deploy targets, databases, object stores, observability backends, and any future networked system.

Requirements:

1. External integrations are disabled, dry-run, local-fixture-only, or read-only by default unless a later decision explicitly marks a safe default and proof owner.
2. Tokens and credentials must be supplied through runtime environment or secret-store mechanisms, never generated into committed defaults or logged.
3. Network/external mutation requires explicit policy classification, operator approval where destructive or production-impacting, and evidence of the target environment and intended side effect.
4. Adapter manifests must declare capabilities, required credentials, allowed/forbidden actions, trust/sandbox implications, and unsupported features. Silent no-op fallback is forbidden.
5. External payloads and responses are boundary data and must be validated through named runtime schemas/contracts where they become load-bearing.
6. Generated adapter examples must be sample/demo/reference-labeled when appropriate and must not include real provider secrets or project-specific business rules.
7. AI/model/tool integrations must record prompt/tool/schema changes and refusal/escalation safety checks as evidence where applicable. AI evals may supplement but do not replace deterministic security gates.

### Audit/evidence log policy

Every security-significant decision or result must produce machine-readable evidence. Exact schema syntax belongs to `DL-02`/`DL-10`, but DL-22 requires these semantics:

- event id/run id and timestamp;
- producer/actor kind and id, including agent/CLI/hook/validator/operator where known;
- policy id/version and rule/check ids;
- action attempted and normalized non-secret command/config/integration summary;
- project root, owned/read-only/untouchable path scope, and affected artifact refs;
- classification: pass, fail, blocked, denied, approval_required, approved_override, advisory, or unknown-blocked;
- security category: secret_scan, prod_credential, command_policy, destructive_operation, sandbox_capability, generated_env, external_integration, redaction, evidence_integrity, or related category;
- deterministic/advisory class and blocking effect;
- redacted diagnostics, stable error/finding codes, and no secret values;
- scanner findings with rule ids, spans, fingerprints, and allowlist refs when applicable;
- approval/override refs with approver, scope, expiry/review condition, rationale, and exact operation/resource approved;
- carrier artifacts: result file, Evidence Packet, audit log path, hook report, verification result, build/ship refs, and digest where available;
- consumer decision: blocked/proceeded and why.

Evidence must be retained in lane-owned work/evidence paths and linked into Build Result, Ship Packet, CI/local parity evidence, and final bug-hunt evidence where those lanes consume security results.

### Override/exception policy

Overrides are exceptional and never silent.

Allowed exception types:

- false-positive secret or credential allowlist entry meeting the allowlist requirements above;
- scoped operator approval for an otherwise blocked destructive or external mutation;
- explicit environment/operator responsibility acknowledgment for an unsupported sandbox capability, only when no dependent claims sandbox proof;
- temporary advisory acceptance for a non-hard advisory finding, with rationale and follow-up.

Invalid exceptions:

- unscoped or permanent blanket secret allowlists;
- approvals that expose or commit real secrets;
- approvals that allow unowned path edits or forbidden git destructive operations in this workstream;
- treating failed deterministic security gates as passed;
- fake sandbox guarantees;
- undocumented non-interactive bypasses;
- advisory-only closure for required deterministic security gates.

## Alternatives considered

### Advisory-only safety

- decision: rejected
- rationale: locked verification doctrine requires deterministic hard blockers for safety hooks and hard guards. Advisory review cannot prove secrets, command policy, generated env safety, or destructive-operation control.
- consequences: security review agents may recommend fixes, but core security closure requires deterministic evidence.

### Scanner-only safety

- decision: rejected
- rationale: secret scanning alone does not control destructive commands, production credential use, external integrations, sandbox claims, env conventions, or audit evidence.
- consequences: scanners are mandatory but are one part of a broader policy/check/evidence model.

### Unrestricted agent commands

- decision: rejected
- rationale: unrestricted commands contradict dirty-tree ownership, no destructive git operations, no push/PR without approval, and safety hook requirements.
- consequences: agent-executed commands are classified, scoped, allow/deny checked, and blocked or approval-gated.

### Fake sandbox claims

- decision: rejected
- rationale: shape-green is not truth-green. The harness cannot claim isolation not provided by the actual selected agentic harness/OS/CI environment.
- consequences: sandbox capabilities must be declared honestly and proven at the real boundary or marked unsupported/pending-live/BLOCKED.

### No audit logs

- decision: rejected
- rationale: evidence over assertion is a locked invariant. Build/ship/CI/final validation need security decisions and blocks to be inspectable.
- consequences: security blocks, overrides, scanner results, command denials, env validation, external integration decisions, and verification results require evidence.

### Selected balanced model

- decision: accepted
- rationale: deterministic hard gates for core safety, typed machine-readable evidence, strict approvals for destructive/external actions, honest sandbox boundaries, and advisory review as supplemental judgment provide safe v1 requirements without implementing production details in a decision artifact.
- consequences: later lanes can implement and prove security in their owned paths; dependents remain blocked if proof is missing.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms final strategy is safe for decision execution sequencing and preserves security/safety witness doctrine.
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies decision template, dependency declaration, evidence checklist, real-boundary policy, and dirty-tree discipline.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies domain-neutral core/extension/sample-demo boundary and allowed/forbidden vocabulary policy.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification layer, mechanical gates, backlog, strategy, playbook, quality bar, and current sibling decisions define security/safety requirements and ownership boundaries.
  blocks:
    - id: I-02-cli-primitive-foundation
      reason: CLI foundation must reject unsafe config/commands and emit machine-readable security blocks.
    - id: I-09-verification-runner-evidence-failure-routing
      reason: Verification runner must record security evidence and hard-block failed security checks.
    - id: I-10-mechanical-gates-P0
      reason: P0 quality/mechanical path must include assigned safety/config/allowlist/wiring checks where DL-15 maps them.
    - id: I-18-security-safety-hooks-policy
      reason: Primary implementation lane for secret, command, destructive, env, and external-integration policy hooks.
    - id: I-20-ci-local-parity-wiring
      reason: Local and CI aggregate paths must invoke the same relevant security gates and preserve evidence.
    - id: generated configs/hooks
      reason: Generated env/config/hook defaults must not finalize without DL-22 safe-default policy.
    - id: I-21-build-skill-orchestration
      reason: Build must consume verification/security evidence and hard-block failed security checks.
    - id: I-22-ship-skill-orchestration
      reason: Ship must consume final security evidence and must not bypass blocks or push/PR without approval.
  blocked_dependents:
    - id: I-02-cli-primitive-foundation
      blocked_until: DL-22 is independently validated clean and implementation prerequisites are green.
      relying_on: command policy, unsafe config rejection, machine-readable safety block requirements, env/config redaction requirements.
    - id: I-09-verification-runner-evidence-failure-routing
      blocked_until: DL-22, DL-10, DL-02, DL-07, and required implementation prerequisites are aligned.
      relying_on: security evidence semantics and hard-block behavior.
    - id: I-10-mechanical-gates-P0
      blocked_until: DL-22 and DL-15 assign concrete P0/P1/P2 security gate responsibilities.
      relying_on: secret/allowlist/config/safety policy requirements.
    - id: I-18-security-safety-hooks-policy
      blocked_until: DL-22 is validated and implementation lanes can write packages/security, security CLI, and security fixtures.
      relying_on: full v1 security/safety model.
    - id: I-20-ci-local-parity-wiring
      blocked_until: I-09/I-10/I-18 security gates exist and DL-18 CI defaults are available.
      relying_on: local/CI parity and security evidence consumption.
    - id: I-21-build-skill-orchestration
      blocked_until: verification/security gates and evidence consumers are implemented and proven.
      relying_on: build hard-blocking on security failures.
    - id: I-22-ship-skill-orchestration
      blocked_until: build/security/verification evidence is consumable and final security checks are wired.
      relying_on: final verification/security block and no destructive external action without approval.
    - id: generated configs/hooks
      blocked_until: generated defaults and hooks implement safe env/config, secret, credential, command, and external-integration policy.
      relying_on: DL-22 generated default and hook requirements.
  required_before_finalizing:
    - id: DL-07-cli-primitives / I-02
      required_content: Exact CLI output/exit/schema integration for safety blocks without changing DL-22 policy.
    - id: DL-10-verification-implementation / I-09
      required_content: Evidence/failure taxonomy must encode DL-22 security results and hard-blocking classifications.
    - id: DL-15-mechanical-engine / I-10-I-13
      required_content: Exact mechanical/security gate placement, allowlist mechanics, and hard/advisory calibration.
    - id: DL-18-ci-cd-defaults / I-20
      required_content: CI/local parity must invoke the same security gate set and preserve evidence.
    - id: DL-06-agentic-harness-integrations / I-14
      required_content: Adapter capability/trust/sandbox/security behavior must use DL-22 non-claims and external integration policy.
    - id: I-18-security-safety-hooks-policy
      required_content: Actual secret scanner, production credential detector, command/destructive/env/external integration hooks and fixtures.
    - id: I-21/I-22
      required_content: Build/ship security evidence consumption and block propagation.
  deferrals:
    - deferred_question: Exact scanner engines, secret-rule signatures, production endpoint catalogs, and allowlist file schemas.
      rationale: Implementation/tool choices belong to DL-15/I-10 and I-18; DL-22 locks semantic policy and evidence requirements.
      future_owner: DL-15-mechanical-engine / I-10-mechanical-gates-P0 / I-18-security-safety-hooks-policy
      allowed_now: true
      blocked_dependents:
        - affected security gate implementation until exact tools are chosen and proven
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact CLI command names, flags, and final result envelope schema for security commands/blocks.
      rationale: CLI surface belongs to DL-07/I-02; DL-22 locks security semantics only.
      future_owner: DL-07-cli-primitives / I-02-cli-primitive-foundation / I-18-security-safety-hooks-policy
      allowed_now: true
      blocked_dependents:
        - any CLI implementation needing missing command syntax
      invalid_if_any_dependent_relies: true
    - deferred_question: Exact CI provider/workflow syntax for security gates.
      rationale: Provider-specific CI defaults belong to DL-18/I-20.
      future_owner: DL-18-ci-cd-defaults / I-20-ci-local-parity-wiring
      allowed_now: true
      blocked_dependents:
        - CI/security parity closure
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-22-security-safety-model.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-22-security-safety-model/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/** prerequisite and sibling decisions
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/** prerequisite and sibling reports
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-22 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - /Users/lizavasilyeva/work/vibe-engineer/packages/**
    - /Users/lizavasilyeva/work/vibe-engineer/apps/**
    - /Users/lizavasilyeva/work/vibe-engineer/examples/**
    - /Users/lizavasilyeva/work/vibe-engineer/scripts/**
    - /Users/lizavasilyeva/work/vibe-engineer/.github/**
    - root config files
    - production/package/source files
    - generated starter files
    - non-DL-22 decision/report/work paths
  handoff_notes:
    - from: DL-22
      to: I-18-security-safety-hooks-policy
      condition: After DL-22 independent validation is clean and implementation prerequisites are green.
      shared_path_policy: disjoint
    - from: DL-22
      to: I-02/I-09/I-10/I-20/I-21/I-22
      condition: Each lane implements/consumes DL-22 security results in its owned paths after prerequisites and handoffs are green.
      shared_path_policy: disjoint_or_serialized_by_strategy
```

## Blocked dependents

These dependents remain blocked until DL-22 is independently validated clean and their full sibling prerequisites are satisfied:

- `I-02-cli-primitive-foundation`.
- `I-09-verification-runner-evidence-failure-routing`.
- `I-10-mechanical-gates-P0` and any later mechanical security gate placement from `DL-15`.
- `I-18-security-safety-hooks-policy`.
- `I-20-ci-local-parity-wiring`.
- Generated configs/hooks and any generated starter defaults that carry env/config/security policy.
- `I-21-build-skill-orchestration` and `I-22-ship-skill-orchestration` where they consume security evidence or govern destructive external actions.
- Build/ship/final closure if security evidence, real-boundary proof, or local/CI parity is missing.

## Verification/witness consequences

- deterministic checks affected: secret scanning, production credential/env validation, command allow/deny/destructive-operation gates, external-integration safety checks, security evidence schema validation, override/allowlist validation, redaction checks, and local/CI wiring checks.
- positive witnesses required downstream:
  - a placeholder-only generated env/config fixture passes and records redacted evidence;
  - allowed scoped command within owned paths passes and records policy evidence;
  - non-secret sample/demo fixture with reviewed false-positive allowlist passes only when allowlist metadata is valid;
  - external integration disabled/dry-run/read-only default passes without requiring real credentials;
  - build/ship/CI consume passing security evidence and proceed only when all hard security gates pass.
- negative witnesses required downstream:
  - a real-looking secret or production credential in generated defaults/fixtures is blocked;
  - an unapproved destructive command is denied with machine-readable evidence;
  - a production-like endpoint/credential in local/dev/test/CI defaults blocks unless explicitly approved and outside committed defaults;
  - fake sandbox guarantee unsupported by actual harness/OS/CI capability is rejected;
  - missing security evidence blocks CLI/verification/build/ship/CI consumers;
  - advisory-only security review is rejected as sufficient closure.
- regression witnesses required downstream:
  - product/package/CLI name remains `vibe-engineer`;
  - six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
  - build/ship still run verification/context/evidence automatically;
  - deterministic gates remain hard blockers and advisory review remains supplemental unless promoted by task criteria;
  - mechanical gate families remain intact;
  - domain-neutral core remains intact;
  - no push/PR/destructive external operation occurs without explicit approval where required.
- real_boundary_required: no for this decision artifact itself; yes for later implementation seams.
- real_boundary_status: not_applicable for DL-22 closure; required_before_closure for `I-02`, `I-09`, `I-10`, `I-18`, `I-20`, `I-21`, and `I-22`.
- earliest required security real-boundary seam:
  - Producer: actual secret scanner, command policy, destructive-operation guard, generated-env validator, or external-integration safety rule implemented by the owning lane.
  - Carrier: actual hook/verification result/evidence packet/exit status/audit log written by the harness path.
  - Consumer: actual CLI/verify/build/ship/failure-routing/CI consumer that blocks or proceeds from that result.
  - Closure rule: forbidden case must hard-block with evidence. If the actual provider/API/spawn/writer/carrier/consumer seam cannot run, closure remains `pending-live/BLOCKED`, not shape-green.
- if no live seam: DL-22 is a decision artifact only and does not implement or claim runtime proof.

## Ownership/path consequences

- owned_write_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-22-security-safety-model.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-22-security-safety-model/**`
- read_only_paths:
  - cited source docs and orchestration artifacts in `/Users/lizavasilyeva/work/harness-starter/**`;
  - prerequisite and sibling decisions/reports in `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/**` and `.vibe/work/**`;
  - target repo inventory outside DL-22 owned paths.
- untouchable_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/.git/**`;
  - production/package/source paths, root configs, CI workflows/scripts, generated starter files;
  - security package source, CLI source, verification source, mechanical gate source, adapter source;
  - any decision/report/work path not owned by DL-22;
  - all `/Users/lizavasilyeva/work/harness-starter/**` paths.
- serialized/shared ownership notes:
  - future security package and security CLI paths are owned by `I-18` only after prerequisites are green;
  - CLI loader/shared package metadata remains serialized through `I-02`/later handoffs;
  - CI/root writes remain serialized through `I-20`;
  - this decision authorizes no production, root config, CI, or generated starter writes.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED` and independently validated `PASS`.
- governed surfaces affected by this decision: security policy requirements for core CLI, hooks, verification, generated env/config conventions, adapter/external-integration defaults, audit/evidence logs, future docs/examples, and implementation proof owners.
- surface classification: core harness security policy. Consuming-project security rules are extension-owned. Sample/demo/reference fixtures must be explicitly labeled and must not include real secrets or production credentials.
- positive generic terms used: secret, credential, token, key, certificate, environment variable, command, hook, adapter, external integration, audit log, evidence packet, sandbox, allowlist, denylist, destructive operation, production, local/dev/test/CI, redaction, scanner, validator.
- project/business terms mentioned: none as core defaults. This decision does not encode ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout/product/customer-order, or equivalent business-domain security rules.
- consuming-project extension boundary: project-specific security policies may extend or tighten checks through consuming-project configuration/extensions, but may not be hidden core defaults.
- sample/demo boundary: sample/demo/reference fixtures may use only generic placeholders and must be labeled; real secrets/prod credentials are forbidden even in sample/demo content.
- deterministic enforcement owner mapping: DL-15/I-10 for mechanical placement where applicable, I-18 for security hooks/policy implementation, I-02/I-09/I-20/I-21/I-22 for consumers, I-24 for docs consistency, DL-20B/DL-24B/final bughunt for audits.
- advisory owner mapping: security/advisory reviewers may supplement later validation and final bughunt but cannot replace hard gates.
- positive/negative/regression witness consequences: listed in `Verification/witness consequences`.
- locked decisions preserved: `vibe-engineer` name, two-repo direction, six skills, artifact flow, fixed starter stack/E2E where relevant, automatic verification/context/evidence, mechanical gates, and no push/PR without approval.
- dirty-tree/path ownership impact: decision-only writes limited to DL-22 paths.
- result: PASS for this decision artifact.

## Dirty-tree safety

- unrelated dirty work assumed: yes
- git stash/reset/clean/checkout/restore used: no
- writes limited to owned paths: yes
- conflicts discovered: none. Initial target inventory showed no DL-22 decision artifact and no DL-22 work path before report creation. Later DL-22 owned-path inventory showed only this execution report before the decision artifact write.
- source docs, sibling decisions, package source, root config, CI, generated starter files, and `.git/**` were not edited.

## Deferral rationale

Not applicable to the decision status. This decision is `LOCKED`.

Deferred implementation details are intentionally assigned to future owners and block affected dependents if unresolved:

- exact scanner engines/rules and allowlist schema: `DL-15`/`I-10`/`I-18`;
- exact CLI command names, flags, exit codes, and result schemas: `DL-07`/`I-02`/`I-18`;
- exact Evidence Packet field names and failure taxonomy integration: `DL-02`/`DL-10`/`I-09`;
- exact CI provider syntax and artifact retention: `DL-18`/`I-20`;
- exact adapter trust/runtime enforcement details: `DL-06`/`I-14` plus `I-18` where security hooks apply.

Proof no dependent relies now: no production implementation is authorized by DL-22 alone. Later lanes may rely on the locked requirements, but must remain blocked if their exact implementation owner has not supplied the needed detail or proof.

## Evidence checklist

1. Report artifact was created before this decision artifact at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-22-security-safety-model/reports/decision-lock-execution-report.md`.
2. Required source files were inspected and are cited above by path and section heading.
3. Files changed by this lane are limited to this decision artifact and the DL-22 execution report.
4. No production/package/source/root config/CI/generated starter files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Dependencies, blocked dependents, required sequencing, deferrals, owned/read-only/untouchable paths, and handoffs use the DL-24A dependency declaration format.
7. No unresolved implementation detail is relied on without an owner and blocked-dependent mapping.
8. Verification/witness consequences include positive, negative, regression, and real-boundary requirements.
9. Real-boundary status is stated: this decision creates no live seam; later security implementation seams require actual proof before closure.
10. Ownership/path consequences are explicit and dirty-tree-safe.
11. Domain-neutrality check applies DL-20A and uses only generic security vocabulary.
12. Locked decisions remain uncontradicted: `vibe-engineer`, two-repo direction, six skills, artifact flow, `plan` Verification Delta, automatic `build`/`ship` verification/context/evidence, fixed starter stack/E2E where relevant, mechanical gates, and no push/PR without approval.
13. Downstream dependents cannot finalize without deterministic security evidence and real-boundary proof where assigned.
14. Validator checklist and severity policy are included below.

## Validation plan and severity policy

Independent Triad-B validation must inspect the actual DL-22 decision artifact, execution report, and available inventory/diff evidence, not just this narrative.

### Positive witnesses

- Artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-22-security-safety-model.md` and follows DL-24A schema with exactly one output class.
- Artifact resolves backlog §22 topics: secret scanning, production credential detection, command allow/deny lists, sandboxing assumptions, generated env conventions, safe defaults for external integrations, destructive-operation policy, and audit/evidence logs.
- Every security policy requirement maps to future proof owners or blocked dependents.
- Deterministic hard-block expectations are stated and advisory review is supplemental only.
- DL-20A domain-neutrality checklist is applied.

### Negative witnesses

- A hypothetical real secret or production credential in generated defaults is rejected or blocked by this model.
- A destructive command without explicit approval/allowed policy is rejected.
- A fake sandbox guarantee unsupported by actual agentic harness/OS/CI controls is rejected.
- A later CLI/verification/build/ship/CI lane without security evidence remains blocked.
- Advisory-only security review is rejected as sufficient for hard safety closure.
- A secret allowlist without owner, rule id, fingerprint, justification, and review/expiry metadata is rejected.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Build/ship still run verification/context/evidence automatically.
- Deterministic gates remain hard blockers; advisory review remains supplemental unless promoted by task criteria.
- Mechanical gate families remain intact and are not contradicted.
- Domain-neutral core remains intact.
- No push/PR/destructive external operation occurs without explicit approval where required.

### Sibling/blast-radius checks

- Check consistency with final strategy §§5.2, 6.2, 7, 9.2, 10, 11, 17, 18.
- Check consistency with DL-24A template/evidence/deferral rules.
- Check consistency with DL-20A domain-neutrality boundary.
- Check consistency with source docs listed above.
- Check sibling boundaries: `DL-07` owns exact CLI surface; `DL-10` owns verification taxonomy/evidence model; `DL-15` owns mechanical engine details; `DL-18` owns CI/CD defaults; `DL-23` owns observability defaults. DL-22 sets security requirements but does not usurp those exact designs.
- Check target repo inventory: only DL-22 owned decision/work paths changed.

### Severity policy

- `critical`: missing/invalid DL-24A schema; missing DL-20A check; source contradiction; out-of-license write; advisory-only safety closure; fake sandbox claim; no deterministic proof owner for core security gates; missing blocked dependents; security policy that permits real secrets/prod credentials/destructive operations silently; false real-boundary closure.
- `major-local`: incomplete security topic coverage, unclear sibling handoff, incomplete evidence/audit field requirements, or incomplete positive/negative/regression witness design repairable within DL-22 paths.
- `minor-local`: wording/citation clarity issue that does not weaken security, ownership, dependency, or proof gates.
- `clean`: all requirements and witnesses satisfied.

## Known ambiguities / future owners

- `DL-07` owns exact CLI command names, flags, stdout/stderr/result-file behavior, and final machine-readable block schemas. DL-22 requires security block semantics only.
- `DL-10` and `DL-02` own exact Evidence Packet/failure taxonomy schemas. DL-22 requires security evidence semantics only.
- `DL-15` and `I-10` own exact mechanical engine placement for security-related gates, strict config guards, allowlists, wiring, and scanner integration.
- `DL-18` and `I-20` own exact CI provider/wiring and artifact-retention mechanics.
- `DL-06`/`I-14` own adapter capability proof; DL-22 requires honest trust/sandbox/security capability declarations.
- `DL-23` owns observability defaults; DL-22 owns secret/redaction/security evidence requirements when observability artifacts might expose sensitive values.
- `I-18` is the primary security/safety hook implementation owner.
- Sandboxing remains environment-dependent. Any implementation claiming stronger isolation than policy checks must prove it with actual harness/OS/CI/provider evidence or remain `pending-live/BLOCKED`.
