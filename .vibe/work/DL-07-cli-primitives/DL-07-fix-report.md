# DL-07 Fix Report

## Checkpoint 0 — initialized
- Status: in-progress
- Scope: Fix `partial` CLI status semantics in DL-07 decision artifact only.
- Owned write paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-fix-report.md`
- Files changed so far: this report initialized.
- Evidence: pending input review.
- Blockers: none currently known.
- Next step: read required briefs, reports, decision artifact, foundation decisions, and source docs.

## Checkpoint 1 — DL-07 inputs and validation finding reviewed
- Status: in-progress
- Files inspected:
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/briefs/ta-dl-07-brief-generated.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/briefs/ta-dl-07-brief-validation.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/tasks/session-81315-81315/b8499cb6f.output`
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-execution-report.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-validation-report.md`
- Files changed: this fix report only.
- Evidence: validator found one major-local content defect: `status=partial` is allowed but lacks stable process-exit mapping and consumer semantics; root fix must define or remove `partial` semantics in the decision artifact.
- Blockers: none currently known.
- Next step: finish required source/foundation review, then patch the decision artifact and report.

## Checkpoint 2 — foundation and source docs reviewed
- Status: in-progress
- Files inspected additionally:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md`
  - `/Users/lizavasilyeva/work/harness-starter/README.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
  - `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md`
  - remaining tail of `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
- Files changed: this fix report only.
- Evidence: DL-24A requires no hidden/vague deferrals and stable dependency/witness consequences; DL-20A requires domain-neutral core terms; source docs preserve skill-first UX, deterministic blocking, evidence over assertion, and real-boundary witness obligations.
- Root-cause analysis: existing artifact makes `partial` a first-class status but does not say if it is success/failure/warning/advisory/blocked, which exit code it produces, which envelope fields are mandatory, or how consumers branch. The repair must be normative at the common status/exit/envelope/consumer/witness sections, not a local table-only patch.
- Blockers: none currently known.
- Next step: edit DL-07 decision artifact to add exact `partial` semantics, exit code, consumer behavior, blocker relationship, misuse constraints, and downstream witness obligations.

## Checkpoint 3 — first decision-artifact patch applied
- Status: in-progress
- Files changed:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-fix-report.md`
- Patch evidence:
  - Added required `payload.data.partial` contract for `status=partial`.
  - Added exit code `8` as the only common exit for `partial` across human, agent, and CI modes.
  - Added status semantics table mapping `partial` to blocking non-passed incomplete result, distinct from `success`, `failure`, `blocked`, and advisory warnings.
  - Added machine-envelope minimum validity rules and reserved `partial_incomplete` classification.
  - Added skills/orchestrators/CI/evidence-collector behavior for `partial`.
- Blockers: none currently known.
- Next step: update downstream witness/validation sections and inspect the changed decision artifact for consistency.

## Checkpoint 4 — witness and validator sections patched
- Status: in-progress
- Files changed:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-fix-report.md`
- Patch evidence:
  - Updated downstream deterministic checks to include `partial` exit/status mapping and partial-envelope validity.
  - Added positive real-boundary witness obligation for the first actual command that can emit `partial`.
  - Added negative witnesses rejecting `partial` with exit `0`, missing required fields, consumer pass/CI green, or misuse to mask blockers/failures/advisory warnings.
  - Updated `I-02` and real-boundary obligations to require actual CLI producer → stdout/stderr/process exit/result-file carrier → consumer parser proof for `partial`.
  - Updated validation plan and DL-10 future-owner note for consistency.
- Blockers: none currently known.
- Next step: inspect changed sections for consistency and then finalize the fix report.

## Checkpoint 5 — partial-envelope field consistency tightened
- Status: in-progress
- Files changed:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-fix-report.md`
- Patch evidence: completed scopes now include `required: true`; `resume.allowed`/`resume.command` semantics are explicit for both resumable and non-resumable partial results.
- Blockers: none currently known.
- Next step: final read-through of changed sections and close the fix report.

## Checkpoint 6 — consistency read-through completed
- Status: in-progress
- Files inspected after patch:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md` changed machine-contract/status sections
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md` changed witness/validation/future-owner sections
- Files changed:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-fix-report.md`
- Evidence: changed sections now define `partial` as blocking non-success/non-advisory status with exit `8`, mandatory machine fields, explicit skill/orchestrator/CI/evidence behavior, misuse prohibitions, and real-boundary witness requirements.
- Follow-up consistency tweak: exit table wording now says typed incomplete-scope evidence rather than assuming every partial is resumable/fixable.
- Blockers: none currently known.
- Next step: final report closure.

## Final checkpoint — fix complete
- Status: DONE; ready for independent revalidation.
- Artifact changed:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
- Report changed:
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-fix-report.md`
- Root-cause fix evidence:
  - `partial` is now explicitly a blocking, non-success, non-advisory, non-warning deterministic-gate status.
  - Human, agent, and CI default exit behavior is now stable: `status=partial` exits `8`; `partial` with exit `0` is invalid.
  - Required `status=partial` machine fields are defined under `payload.data.partial`, including `overallDisposition`, `completedScopes`, `incompleteScopes`, `resume`, `diagnostics`, `errors`, and artifact-disposition rules.
  - Skills/orchestrators/CI/evidence collectors must stop/block on `partial`, record partial evidence only as incomplete/non-passing evidence, route to fixer/resume when typed and safe, or report `BLOCKED`.
  - Relationship to `blocked`, `failure`, `success`/`passed`, `needs_fix`, and advisory findings is explicit in the status semantics table.
  - Misuse rules forbid `partial` from masking invalid invocation, prerequisites, safety/ownership/external/internal failures, hard deterministic failures, or advisory-only warnings.
  - Downstream real-boundary witnesses now require actual CLI producer → stdout/stderr/process exit/result-file carrier → skill/orchestrator/CI/evidence-consumer parser proof for `partial` behavior.
- Dirty-tree/ownership evidence:
  - No git stash/reset/clean/checkout/restore used.
  - No production source, root config, CI, generated starter, git metadata, source docs, execution report, or validation report edited.
  - Writes stayed within the two owned fix paths.
- Blockers: none.
- Next step: independent validator should re-inspect actual changed owned files and classify closure.
