# DL-07 Triad-B Validation Report

## Verdict

NEEDS-FIX

Severity classification: `major-local`.

Summary: DL-07 is broadly complete and source-consistent, but the common CLI envelope permits `status: partial` without defining stable process-exit/consumer semantics. That leaves the load-bearing CLI spawn/result contract ambiguous for `I-02` and later consumers.

## Stage log / checkpoint trail

- Checkpoint 0: Created this validation report first at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-validation-report.md` before inspecting target artifacts in this session.
- Checkpoint 1: Inspected DL-07 work-dir, parent work inventory, and decision inventory read-only.
- Checkpoint 2: Inspected DL-07 decision artifact, execution report, execution log, Triad-A generated brief, and Triad-A validation.
- Checkpoint 3: Inspected required prerequisite/source docs: master strategy, MST-R, DL-24A decision/validation, DL-20A decision/validation, README, locked decisions, verification layer, mechanical gates, planning backlog, playbook, and quality bar.
- Checkpoint 4: Ran focused content checks for schema/coverage, command matrix, machine contract, domain-neutrality, negative/regression constraints, and real-boundary mapping.
- Checkpoint 5: Finalized severity findings and recommendation in this report.

No shell/process commands were run. No git stash/reset/clean/checkout/restore was used. This validator wrote only this validation report.

## Artifacts and files inspected

DL-07 target artifacts:

- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-execution-report.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/tasks/session-81315-81315/b8499cb6f.output`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/` inventory
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/` inventory
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/` inventory

Triad-A/control artifacts:

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/briefs/ta-dl-07-brief-generated.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/briefs/ta-dl-07-brief-validation.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md`

Prerequisites and source docs:

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md`
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md`
- `/Users/lizavasilyeva/work/harness-starter/README.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md`

## Actual changed/owned-file inspection

- Required decision artifact exists: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`.
- Required execution report exists: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-execution-report.md`.
- DL-07 work dir contains only licensed decision-lock artifacts/reports visible to this pass: `DL-07-execution-report.md` and this `DL-07-validation-report.md`.
- Parent work inventory contains decision-lock work dirs for DL-01 through DL-08 plus DL-20A and DL-24A; no obvious stray DL-07 work path is visible.
- Decision inventory contains DL-01 through DL-08 plus DL-20A and DL-24A; no duplicate/renamed DL-07 decision artifact is visible.
- Execution report claims implementer changed only the DL-07 decision artifact and DL-07 execution report; execution log shows report write before decision write and no visible shell/process command use.
- No git diff/status was run because this validation prompt prohibits shell/process commands; validation is based on on-disk content, execution log, and read-only inventory.

## Coverage against validated brief

| Requirement | Result | Evidence |
| --- | --- | --- |
| Deliverable | PASS with finding below | Artifact exists at the required path and declares `status: LOCKED` / `output_class: locked_decision_document`. |
| Non-goals | PASS | No CLI code/package/schema/root config/CI/generated starter implementation was written or authorized. |
| STOP boundary | PASS with finding below | Hard prerequisites are present; no ownership conflict found. Output contract ambiguity requires fix before closure. |
| Required artifact schema | PASS | DL-24A-compatible status, citations, summary/details, alternatives, dependencies, blocked dependents, witnesses, ownership, domain-neutrality, dirty-tree, evidence, validation plan, and future owners are present. |
| DL-24A dependency/status/output discipline | PASS with finding below | Uses one output class and dependency YAML; however the machine contract has one unresolved status/exit semantic. |
| Evidence/report requirements | PASS | Execution report exists, lists inspected/changed files, evidence, dirty-tree compliance, blockers, and next step. |
| Source citations | PASS | Artifact cites strategy, MST-R, DL-24A, DL-20A, README, locked decisions, verification layer, mechanical gates, backlog, playbook, and quality bar by path/heading. |
| Dependencies | PASS | DL-24A, DL-20A, MST-R/source docs, sibling decisions, blocked dependents, deferrals, and handoff notes are declared. |
| Validation plan/severity gates | PASS | Positive, negative, regression, sibling/blast-radius, and severity checks are present. |
| Downstream gating | PASS with finding below | Direct dependents are blocked until DL-07 validation and sibling prerequisites; fix needed before DL-07 can close cleanly. |

## Planning-backlog coverage

Backlog §7 questions are covered, except for the status/exit ambiguity finding:

1. Public/documented vs internal/agent/CI primitives: covered by the CLI surface matrix and visibility classes.
2. Skill/agent/CI/generated-project invocation: covered by the requirement to spawn the actual `vibe-engineer` binary with explicit roots/artifact paths and machine mode, never chat history/private internals.
3. Machine-readable output/error/exit contract: substantially covered by the envelope, stdout/stderr policy, typed diagnostics/errors, and exit table, but incomplete because `partial` is an allowed envelope status with no stable exit mapping.

Candidate families are explicitly accepted/rejected/deferred: create/import/init, schematics, verification, context, doctor, config, update/migration, registry validation, build, ship, and generic skill-run.

## Source-doc consistency check

- Master strategy/MST-R: DL-07 preserves `vibe-engineer`, skill-first UX, decision-only scope, DL-07 as CLI gate, DL-24A/DL-20A prerequisites, dirty-tree rules, and later real-boundary proof lanes.
- README and locked decisions: preserves public create/import direction, six skills, low-level primitives for agents/CI/debug, no normal-user requirement to run verify/context/schematics, fixed create prompts, config defaults, automatic build/ship verification/context, and no push/PR without approval.
- Verification-layer spec: preserves evidence-over-assertion, deterministic blocking, no prose scraping, automatic verification/context, registry validation, and build/ship responsibilities.
- Mechanical gates spec: does not weaken deterministic/schema/contract/wiring doctrine; future CLI witnesses include result-envelope schema, exit-code mapping, and machine-mode stdout/stderr checks.
- Planning backlog §7: addressed as above, with the `partial` status/exit gap as the blocking local defect.
- DL-24A: artifact follows the template and deferral rules, but DL-24A requires stable dependency/evidence/witness consequences; the unresolved `partial` status weakens the CLI output contract.
- DL-20A: domain-neutrality rules are applied and not contradicted.

## Domain-neutrality audit

PASS for domain-neutrality.

- Affected surfaces are correctly classified as core harness CLI names, output envelopes, diagnostics, prompts, docs implications, and future command examples.
- Command names and payload terms use generic harness vocabulary: project root, config, context, schematics, verification, registry, artifacts, evidence, skills, agents, build, ship.
- Forbidden business terms appear only in the explicit DL-20A negative-example statement that says the CLI does not embed ecommerce/inventory/fashion/Billz/Telegram/Instagram or checkout/product/customer-order-style models.
- Project-specific names are allowed only as explicit user/project inputs to create/import or future extension commands, not as core defaults.

## Positive witnesses

- Artifact can guide `I-02` for binary namespace, command loader boundary, common envelope fields, machine flags, stdout/stderr policy, stable diagnostic/error codes, and most exit mappings.
- Matrix gives downstream owner/witness lanes for create/import, schematics, verify, context, doctor/config, registry, build, and ship.
- Deferrals are explicit and block dependents: destructive update/apply waits for DL-22/future migration owner; generic skill-run waits for DL-03/DL-06; command payload internals wait for sibling schema/protocol decisions.
- Later live proof lanes are named with actual binary/spawn/carrier/consumer expectations.

## Negative witnesses

The artifact explicitly forbids or blocks known-bad alternatives:

- Human prose/log/stderr scraping as a contract.
- Hidden prompts in automation/non-interactive mode.
- Treating all low-level primitives as normal user-facing workflow.
- Public `init` as a third creation path.
- Destructive/security-sensitive behavior decided without DL-22.
- `update apply`/migration apply from DL-07 alone.
- Generic `skill run` implementation before DL-03/DL-06.
- Machine-mode stdout banners/progress.
- Domain-specific core CLI defaults/examples.
- Shape-only CLI proof in later implementation lanes.

## Regression/sibling/blast-radius check

- No contradiction found against locked product/CLI name, two-repo direction, six skills, artifact flow, create/import UX, generated config defaults, schematics-as-agent primitives, automatic build/ship verification/context/evidence, mechanical gates, or no-push-without-approval.
- DL-07 does not claim ownership over artifact schemas, skill protocols, schematic internals, context graph, verification implementation, registry schema, or security/safety policy beyond CLI boundary dependencies.
- Sibling decision inventory is visible for DL-01 through DL-08 plus DL-20A/DL-24A. Per this validation license, sibling decision bodies outside the actual DL-07 artifact and listed prerequisites were not read; inventory shows no obvious out-of-license DL-07 duplicate or stray write.

## Real-boundary status

PASS for planning-decision real-boundary treatment.

- DL-07 is a planning decision and does not claim live CLI behavior.
- Artifact explicitly states no live CLI seam is created by the decision itself.
- Later proof requires actual `vibe-engineer` binary/entrypoint, real spawn, stdout/stderr/exit status, result-file carrier, schema-valid envelope, and actual consumer/parser/validator.
- If an implementation lane cannot run that live boundary, the artifact requires `pending-live/BLOCKED`; shape-only fixtures or hand-authored envelopes are insufficient.

## Dirty-tree and process-compliance check

- Validator report-first compliance: PASS. This report was created before validation inspection and updated after stages.
- Validator write-scope compliance: PASS. Only the provided `VALIDATION_REPORT` was written.
- Implementer write-scope compliance: PASS by visible evidence; changed files are reported as the decision artifact and execution report only.
- Implementer report-first process: minor-local process note. The execution log shows initial `ls`/`read` inspections before the execution report write, then the report write before the decision artifact write. No target writes preceded the report, and the decision artifact was written only after the report existed.
- Dirty-tree safety: PASS. Dirty parallel decision work is visible in sibling work dirs, but no concrete DL-07 ownership conflict or production/root/config/CI/generated-starter/git edit was found.

## Findings

| Severity | Finding | Evidence | Required fix |
| --- | --- | --- | --- |
| critical | None | No wrong decision, missing artifact/report, source-doc contradiction, domain-specific core leakage, out-of-license write, or false live proof found. | None. |
| major-local | The common CLI result contract permits `status: partial` but does not define a stable process exit mapping or consumer semantics for `partial`. | In `DL-07-cli-primitives.md`, the envelope/status rules allow `success | failure | blocked | partial`; the exit table maps only success, failure, and blocked statuses and says future commands must not redefine exit meanings. | Update the DL-07 artifact/report so every allowed common `status` has stable exit/consumer semantics. Either remove `partial` from the common status enum until a future owner decides it, or define its exit code, blocking/non-blocking behavior, diagnostic/error classification rules, artifact obligations, and consumer branching expectations. Update affected witnesses/negative cases and revalidate. |
| minor-local | Execution agent performed initial inventory/brief reads before creating its report. | Execution log shows `ls` and `read` operations before the execution report write. | No DL-07 content fix required if the major-local contract fix is made; future/fix agents should create the report before nontrivial inspection beyond prompt/path intake. |
| clean | Domain-neutrality, ownership, source consistency other than the partial-status gap, command-family coverage, deferral mapping, and real-boundary planning are satisfactory. | Evidence sections above. | None. |

## Recommendation

DL-07 is **not closed cleanly** yet. Route a DL-07 fix/revalidation lane limited to the owned decision/report paths to repair the `partial` status/exit contract. Until clean revalidation, `I-02` and downstream CLI consumers must remain blocked on DL-07.
