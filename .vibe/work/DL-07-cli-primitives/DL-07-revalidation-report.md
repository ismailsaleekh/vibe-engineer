# DL-07 Closing Revalidation Report

Status: complete
Verdict: PASS

## Checkpoint 0 - report created first
- Owned write path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-revalidation-report.md`
- No other files changed by this revalidator.
- Next step: inspect required briefs, logs, reports, fixed decision, and source/foundation documents.

## Checkpoint 1 - required DL-07 inputs inspected
- Status: in progress
- Files inspected:
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/briefs/ta-dl-07-brief-generated.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/briefs/ta-dl-07-brief-validation.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/tasks/session-81315-81315/b8499cb6f.output`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-validation-report.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/tasks/session-81315-81315/ba5813b88.output`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-fix-report.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
- Files changed by this revalidator: this report only.
- Evidence so far: original Triad-B finding was major-local for `status=partial` lacking stable process-exit/consumer semantics; fix report claims the decision now defines partial as blocking/non-green exit `8` with required envelope fields and consumer obligations.
- Blockers: none known.
- Next step: inspect foundation/source docs and relevant sibling decisions for consistency/blast radius.

## Checkpoint 2 - foundation/source documents inspected
- Status: in progress
- Files inspected additionally:
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
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/` inventory
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/**/*validation*report*.md` inventory
- Files changed by this revalidator: this report only.
- Evidence so far: DL-24A requires stable output/dependency/witness semantics and rejects deferred output contracts relied on by `I-02`; DL-20A requires generic/domain-neutral CLI surfaces; source docs require skill-first UX, deterministic blockers, evidence over assertion, automatic verification/context, and no prose scraping.
- Blockers: none known.
- Next step: inspect relevant green sibling decisions (`DL-02`, `DL-03`, `DL-04`, `DL-08`, `DL-09`, `DL-10`, `DL-22` where available) and run focused witnesses for `partial` semantics.

## Checkpoint 3 - strategy/sibling/blast-radius inputs inspected
- Status: in progress
- Files inspected additionally:
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/ready-queue.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/status.md`
  - sibling decisions: `DL-02`, `DL-03`, `DL-04`, `DL-08`, `DL-09`, `DL-10`, `DL-22`
  - sibling validation reports for green `DL-02`, `DL-03`, `DL-04`, `DL-08`, `DL-09`, `DL-10`
  - `/Users/lizavasilyeva/work/vibe-engineer` inventory and `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives` inventory
- Files changed by this revalidator: this report only.
- Evidence so far: green siblings preserve strict JSON artifact status discipline, six-skill handoffs, durable runtime blocking/join semantics, schematic/context/verification real-boundary obligations, deterministic hard blockers, and advisory-only non-blocking treatment. `DL-22` decision artifact exists but no independent validation report was visible, so it was used as consistency input only, not as a green prerequisite.
- Ownership evidence: target root visible inventory is `.git/`, `.vibe/`, `docs/`; DL-07 work area contains `DL-07-execution-report.md`, `DL-07-validation-report.md`, `DL-07-fix-report.md`, and this revalidation report. No production package/source/root config/CI/generated starter paths were visible in the inspected inventory.
- Blockers: none known.
- Next step: run focused content witnesses over the fixed DL-07 decision artifact for `status=partial` exit, envelope fields, consumer behavior, blocker relationship, and real-boundary proof obligations.

## Checkpoint 4 - focused `partial` witnesses completed
- Status: in progress
- Files inspected additionally:
  - focused reads/greps over `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
  - focused greps over original execution log `/Users/lizavasilyeva/work/harness-starter/.pi/tasks/session-81315-81315/b8499cb6f.output`
  - focused greps over fix log `/Users/lizavasilyeva/work/harness-starter/.pi/tasks/session-81315-81315/ba5813b88.output`
  - focused greps over `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-validation-report.md`
  - focused greps over `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-fix-report.md`
- Files changed by this revalidator: this report only.
- Positive evidence:
  - Exit table now includes exit `8` for envelope status `partial` with classification `partial_incomplete`.
  - Decision states `status=partial` with exit `0` is invalid and exit `8` is the default/only common process exit for humans, agents, and CI.
  - Decision states `partial` is blocking incomplete, non-success, non-passed, non-advisory, and non-warning; deterministic gates must treat it as non-passing until a complete rerun returns `success`.
  - Decision defines mandatory `payload.data.partial` fields and minimum validity rules, including `overallDisposition`, `completedScopes`, `incompleteScopes`, `diagnostics`, `errors`, `resume`, and artifact-disposition semantics.
  - Decision defines consumer behavior: skills/orchestrators stop the current deterministic gate; CI fails/blocks on exit `8`; evidence collectors mark aggregate evidence incomplete/non-passing.
  - Decision now requires real producer/carrier/consumer proof for `partial`: actual `vibe-engineer` binary/spawn, stdout/stderr/process exit, result-file carrier when used, and real skill/orchestrator/CI/evidence parser blocking behavior.
- Negative evidence:
  - `partial` cannot be emitted for invalid invocation, invalid project/config, missing global prerequisite, safety/security block, ownership/path conflict, unavailable external provider, or internal bug; those route to exits `2` through `7`.
  - `partial` cannot downgrade hard deterministic failure to a warning, suppress blockers, or let build/ship/validation/CI proceed green.
  - Downstream negative witnesses reject `partial` with exit `0`, missing `payload.data.partial`, no blocking incomplete scope, no `partial_incomplete` error, aggregate consumer pass/CI green, or masking blockers/failures/advisory warnings.
- Regression evidence:
  - Fixed decision still preserves `vibe-engineer`, six skills, skill-first UX, create/import prompt limits, automatic build/ship verification/context/evidence, schematics as agent-facing primitives, and DL-24A/DL-20A prerequisites.
- Blockers: none known.
- Next step: finalize independent severity classification and verdict in this report.

## Final revalidation verdict

Verdict: PASS
Severity classification: clean.

Summary: The DL-07 fix resolves the original major-local `partial` gap. `partial` now has stable non-green deterministic semantics, exit `8` across human/agent/CI modes, mandatory machine-envelope fields, explicit consumer behavior, blocker/failure/advisory boundaries, and downstream real-boundary witness obligations.

## Validation target checklist

| Required target | Result | Evidence |
| --- | --- | --- |
| 1. Deterministic-gate meaning of `partial` | PASS | `partial` is defined as a blocking incomplete result: not success, not passed, not advisory, not warning-only; deterministic gates must treat it as non-passing until complete rerun success. |
| 2. Human/agent/CI default exit behavior | PASS | Exit table maps `partial` to exit `8`; text says exit `8` is the default and only common process exit for `partial` in human, agent, and CI modes; `partial` with exit `0` is invalid. |
| 3. Machine-envelope fields for `status=partial` | PASS | `payload.data.partial` is mandatory with `overallDisposition: not_passed_blocking`, nonempty required `completedScopes`, nonempty required/blocking `incompleteScopes`, `diagnostics` error, `errors` with `details.incompleteScopeIds`, `resume.allowed`/`resume.command`, and artifact-disposition rules. |
| 4. Consumer behavior | PASS | Skills/orchestrators stop the deterministic gate and route to fixer/resume or `BLOCKED`; CI fails/blocks on exit `8`; evidence collectors mark command/aggregate evidence incomplete and non-passing. |
| 5. Relationship to `blocked`, `needs_fix`, `failed`, `passed`, advisory | PASS | Status table distinguishes `success`/passed, `failure`/failed-or-needs-fix, `blocked`/BLOCKED, and `partial`/non-green incomplete. `partial` may map to `needs_fix` only when fixable/resumable; otherwise `BLOCKED`; it never maps to passed/DONE/CI green. Advisory-only findings remain warnings/advisory payloads, not `partial`. |
| 6. Cannot avoid hard blockers | PASS | Rules forbid `partial` for invalid invocation, invalid project/config, missing global prerequisite, safety/security block, ownership/path conflict, unavailable external provider, or internal bug; forbid downgrading deterministic failure or suppressing blockers; negative witnesses reject masking blockers/failures/advisory warnings. |
| 7. Downstream real-boundary witness obligations | PASS | Decision requires actual binary/spawn/stdout/stderr/process-exit/result-file/consumer parser proof; `I-02` must lock consumer parser behavior so `partial`/exit `8` is non-green; if live seam cannot run, lane remains `pending-live/BLOCKED`. |
| 8. No contradiction with foundation/sibling decisions | PASS | See sibling/source consistency below. |

## Positive witnesses

- The fixed decision keeps the common CLI status enum stable and adds a complete exit mapping for every allowed status, including `partial`.
- The fixed decision gives `I-02` implementable parse rules: exit `8`, `partial_incomplete`, required `payload.data.partial`, stable diagnostics/errors, no prose/stderr parsing, and result-file/stdout carrier rules.
- The fixed decision maps `partial` consumers across skills/orchestrators, CI, and evidence collectors and requires non-green handling.
- The fixed decision preserves command-family matrix coverage and owner/witness mapping for create/import, schematics, verification, context, doctor/config, update/registry, build, and ship.

## Negative witnesses

- A `partial` result with exit `0` is invalid.
- A `partial` result missing `payload.data.partial`, blocking incomplete scopes, a `partial_incomplete` diagnostic/error, or affected incomplete scope ids is invalid.
- Consumers may not mark aggregate quality/build/ship/validation/CI green from partial evidence.
- `partial` cannot stand in for `blocked` on invalid invocation, missing prerequisites, safety/security, ownership/write conflict, external unavailability, or internal bug.
- `partial` cannot stand in for `failure` on hard deterministic failure and cannot represent advisory-only findings.

## Regression witnesses

- Product/CLI name remains `vibe-engineer`.
- Six user-facing skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Normal users remain skill-first; low-level verify/context/schematic commands are not normal workflow.
- Create/import prompt limits remain project naming/default harness/optional brief; no stack-preset, max-parallel-agents, or separate bootstrap prompt is introduced.
- Build/ship still automatically run verification/context/evidence and do not push/open PR without approval.
- Schematics remain deterministic agent-facing generators.
- DL-24A and DL-20A remain prerequisites and are not contradicted.

## Sibling/source consistency

- DL-02 artifact schemas: compatible. DL-07's CLI result envelope is a CLI contract and does not redefine DL-02 artifact statuses; it preserves strict typed schema/evidence behavior, no prose parsing, stable artifacts/evidence links, and fail-closed invalid fields.
- DL-03 skill protocols: compatible. Skills consume typed artifacts/CLI envelopes, stop on deterministic blockers, preserve build/ship automatic verification/context/evidence, and do not rely on chat/prose.
- DL-04 orchestration runtime: compatible. `partial` is a non-green join/status input; runtime consumers must not join it as validated/passed output and must keep live proof pending if the real boundary cannot run.
- DL-08 schematics: compatible. Schematic CLI remains machine-readable and real-boundary gated; no hidden overwrite/conflict behavior is introduced.
- DL-09 context: compatible. Context commands stay typed/fail-closed; context evidence from partial commands is incomplete/non-authoritative for whole-gate success.
- DL-10 verification: compatible. Deterministic failures remain hard blockers; advisory findings remain advisory/success-with-warning or command-specific advisory payloads; DL-10 remains owner of runner/evidence taxonomy while preserving DL-07's common `partial` exit `8` rule.
- DL-22 security/safety: compatible as read-only consistency input. No independent DL-22 validation report was visible, so this revalidation does not treat DL-22 as a green prerequisite; DL-07 still blocks security-sensitive CLI implementation on DL-22/security prerequisites and routes safety/security blocks to exit `4`/`blocked`, not `partial`.
- Source docs: compatible with README, locked decisions, verification layer, mechanical gates, planning backlog, playbook, strategy, quality bar, DL-24A, and DL-20A.

## Dirty-tree and ownership

- This revalidator wrote only `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-revalidation-report.md`.
- Fix log/write-scope evidence shows the fix agent wrote only `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md` and `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-fix-report.md`.
- Original execution write-scope evidence shows the execution agent wrote only the DL-07 decision artifact and DL-07 execution report.
- Current DL-07 work dir contains `DL-07-execution-report.md`, `DL-07-validation-report.md`, `DL-07-fix-report.md`, and this revalidation report.
- Target root visible inventory is `.git/`, `.vibe/`, and `docs/`; no production package/source/root config/CI/generated starter paths are visible in the inspected inventory.
- No clean-tree request and no stash/reset/clean/checkout/restore were used by this revalidator; logs/reports for original execution/fix also show no such operation.
- No shell/git diff/status facility was available in this harness; revalidation inspected actual owned files, reports, logs, and read-only inventories directly. No separate diff artifact was visible.

## Findings

| Severity | Finding | Required fix |
| --- | --- | --- |
| critical | None. | None. |
| major-local | None. The original `partial` exit/consumer-semantics gap is fixed. | None. |
| minor-local | None remaining for the fix target. Historical original-execution pre-report reads were already classified non-blocking and were not reintroduced by the fix/revalidation. | None. |
| clean | Fixed DL-07 now satisfies output/exit/error semantics, source consistency, sibling boundaries, domain-neutrality, ownership, and witness requirements. | None. |

## Closure recommendation

Close DL-07 as PASS for decision-lock purposes. Implementation lanes remain blocked only by their normal sibling/security/audit prerequisites and by required future real-boundary proofs; they are no longer blocked by the `partial` status semantics gap.
