# DL-07 — CLI Primitives

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-07 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-execution-report.md`

This decision locks the CLI primitive boundary and common machine contract. Sibling decisions still own their domain schemas/protocols; implementation lanes remain blocked until their full dependency set is green.

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §3 `Locked decisions implementation must preserve`; §4.1 `Harness repo package hypothesis`; §5.1 `Mandatory output discipline for all decision artifacts`; §5.2 `Decision-lock table`; §6 `Dependency DAG with scheduler gates`; §7 `Explicit ready queue rules`; §9.2 `Decision triad ownership`; §10 `Verification matrix by lane`; §11 `Early real-boundary witness plan`; §§14–18 `Evidence`, `Dirty-tree`, `Final closure`, and `Severity` requirements.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-revalidation.md` — §1 `Verdict`; §4 `Final source-doc coverage check`; §5 `DAG and ready-queue safety check`; §7 `Verification and real-boundary witness check`; §8 `Coverage by product surface`; §9 `Severity gate and closure criteria check`; §10 `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/ready-queue.md` — §2 `First ready queue items`; §5 `Explicitly blocked items and blockers`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Validator checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`; `Downstream gating impact`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/reports/validation-report.md` — `Verdict`; `Recommendation`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Decision details`; `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`; `Verification and witness consequences`.
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/DL-20A-validation-report.md` — `Verdict`; `Domain-neutrality-specific audit`; `Recommendation`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§3.2 `User interacts with skills, not low-level tooling`; 4 `Core workflow`; 7 `CLI role`; 8 `Schematics`; 9 `Verification model`; 10 `Context preservation and retrieval`; 13 `Relationship between starter kit and harness`; 14 `Initial implementation order`; 15 `Success criteria`; 16 `Locked decisions and planning backlog`.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§1 `Product / package / CLI name`; 4 `App creation UX`; 5 `Generated project config defaults`; 6 `Skills generated per app`; 7 `Schematics are internal/agent-facing`; 8 `Verification and context updates are automatic`; 10 `Verification-layer decisions`; 11 `Mechanical verification gates`.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§1 `Core principles`; 2 `Artifact flow`; 3 `Responsibilities by skill/orchestrator`; 4 `Verification Delta`; 5 `Verification catalog`; 6 `Orchestration model`; 9 `Failure routing and fixing`; 11 `Agent registry`; 13 `Harness configuration`; 14 `Blocking policy summary`; 16 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1 `Core verification doctrine`; 2 `Governed quality surface`; 5 `Schema and contract strictness gate`; 7 `Quality wiring-integrity gate`; 11 `How this fits the verification layer`; 12 `Implementation priority`; 13 `Final invariant`.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §7 `CLI primitive design`; §2 `Artifact schemas`; §3 `Skill protocols`; §8 `Schematics system`; §9 `Context and memory system`; §10 `Verification implementation details`; §22 `Security and safety model`; §24 `Planning-phase output requirement`.
- `/Users/lizavasilyeva/work/harness-starter/guides/high-level-orchestrator-playbook.md` — §§0 `Binding operator directives`; 5.2 `Work-item loop`; 10 `The quality bar`; 11 `Operator anti-patterns`.
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md` — full quality bar.

## Decision summary

The CLI binary and command namespace are `vibe-engineer`. The CLI is a deterministic engine and primitive surface; normal users primarily operate through the six skills `brainstorm`, `grill-me`, `task`, `plan`, `build`, and `ship`.

Backlog §7 is answered as follows:

1. Public/documented user-facing CLI commands are limited to starter creation/import, diagnostics/config inspection, and skill launchers where the skill itself is user-facing. Low-level schematics, verification, context, registry, and most config primitives are agent/skill/CI/debug primitives, not ordinary user workflow.
2. Skills, agents, CI, and generated projects call primitives by spawning the actual `vibe-engineer` binary with explicit flags, project roots, artifact paths, and machine mode; they must not rely on chat history or scrape prose logs.
3. All automation consumes a stable CLI result envelope emitted as JSON to stdout and/or atomically written to a result file. The envelope carries versioning, status, typed payload, diagnostics, evidence/artifact links, typed error classification, and stable exit behavior.

## Decision details

### Binary and namespace

- The executable name is `vibe-engineer`.
- The CLI-owning package lane is `packages/cli` per the strategy hypothesis; exact package publishing details remain subject to `DL-01` where they do not change the locked binary name.
- Command names and payload vocabulary must remain domain-neutral and use generic harness concepts.
- Command implementations must be discoverable through a command loader owned initially by `I-02-cli-primitive-foundation`, so later command-family lanes do not race on one shared manual index.

### Visibility classes

DL-07 uses these visibility classes:

- `public user-facing`: documented for humans in normal or setup/debug workflow.
- `skill launcher`: a CLI entrypoint for a locked user-facing skill, but semantics/protocol are owned by `DL-03` and relevant skill lanes.
- `skill/agent primitive`: invoked by skills/agents as deterministic helpers; not expected in normal human workflow.
- `CI primitive`: invoked by local/CI quality, validation, or generated-project automation.
- `debug/diagnostic`: safe for advanced troubleshooting; may be human-readable by default but must support machine mode.
- `internal/hidden`: implementation subcommand or substep not documented as stable for external users.
- `rejected`: not part of v1 CLI surface.
- `deferred`: not decided here because no dependent may rely on it until its owner decides it.

### Normative command rules

1. Any skill/agent/CI/debug command must support machine mode: `--json` and `--result-file <path>`.
2. Automation must invoke commands with `--non-interactive` or an equivalent machine-mode flag; hidden prompts are forbidden in automation.
3. Mutating commands must accept explicit project root and output/artifact/work paths. Hidden reliance on current chat, unstated agent memory, or ambient notebooks is forbidden.
4. Human-readable output is not a contract. Only the result envelope and schema-validated artifacts are contracts.
5. Destructive or security-sensitive behavior is not authorized by DL-07. It must wait for `DL-22-security-safety-model` and, where relevant, the owning command-family decision/implementation lane.
6. DL-07 defines the common envelope and command boundary; it does not define artifact schemas, skill protocols, schematic manifests, context graph internals, verification evidence taxonomy, registry schema, or security policy internals.

## CLI surface matrix

| Command/family                                             | Visibility class                                                                              | Intended caller                                             | Accepted input forms                                                                                                                       | Output/result envelope obligations                                                                                                        | Side-effect policy                                                                                                                    | Interactive/non-interactive policy                                                                            | Related artifact/schema decision                     | Implementation owner lane                                                                           | Validation witness owner                                                 | Blocked/deferred notes                                                                                                                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vibe-engineer create`                                     | public user-facing; also skill/agent primitive for fixture generation                         | human, skill, agent, generated project setup                | project path/name flags; selected agentic harness; optional brief path/string; config path; `--json`; `--result-file`; `--non-interactive` | `payload.kind=create_result`; generated paths; persisted harness/config summary; context/bootstrap artifacts; diagnostics; evidence links | writes a new starter/generated fixture only under explicit target path; must not write outside target/work paths                      | interactive allowed for humans with only locked prompts; automation requires all values and no hidden prompts | `DL-02`, `DL-06`, `DL-09`, `DL-16`, `DL-17`, `DL-22` | `I-15-create-import-starter-UX` after `I-02` foundation                                             | `I-15`; rerun in `I-23`                                                  | Accepted. Must preserve no stack-preset/max-agents/bootstrap prompts. Security/destructive overwrite behavior waits for `DL-22`.                                                          |
| `vibe-engineer import`                                     | public user-facing; also skill/agent primitive                                                | human, skill, agent, existing generated project             | existing project root; selected agentic harness; optional brief/context path; config path; machine flags                                   | `payload.kind=import_result`; detected project facts; config writes; context/bootstrap artifacts; diagnostics                             | mutates only explicit project root after safety/ownership checks                                                                      | interactive allowed for humans; automation non-interactive only                                               | `DL-02`, `DL-06`, `DL-09`, `DL-16`, `DL-17`, `DL-22` | `I-15-create-import-starter-UX`                                                                     | `I-15`; rerun in `I-23`                                                  | Accepted. Destructive/conflict policy blocked on `DL-22`/`DL-08` where applicable.                                                                                                        |
| `vibe-engineer init`                                       | rejected as public v1 command; internal/hidden only if an implementation lane needs a substep | implementation lane only                                    | none as public API                                                                                                                         | none as public API                                                                                                                        | no public side effects                                                                                                                | no public prompts                                                                                             | `DL-16`, `DL-17`, `DL-22` if later revived           | none for public command                                                                             | none                                                                     | Rejected publicly to avoid a third creation UX path. Existing-project setup is `import`; new setup is `create`.                                                                           |
| `vibe-engineer schematic run <schematic-id>`               | skill/agent primitive; debug/diagnostic for advanced dry-run only                             | skill, agent, implementation lane; advanced human debugging | schematic id; variables via flags/config/artifact; `--project-root`; `--dry-run`; `--result-file`; `--json`; `--non-interactive`           | `payload.kind=schematic_result`; manifest id/version; planned/written/skipped/conflicted files; artifact links                            | dry-run is read-only; normal run writes only owned target paths declared by schematic/plan                                            | no interactive prompts in agent/CI mode                                                                       | `DL-02`, `DL-08`, `DL-09`, `DL-22`                   | `I-07-schematics-engine` with loader foundation from `I-02`                                         | `I-07`; rerun in `I-23`                                                  | Accepted as primitive, not a normal user-facing skill. Exact manifest, idempotency, conflict behavior owned by `DL-08`.                                                                   |
| `vibe-engineer verify`                                     | skill/agent primitive; CI primitive; debug/diagnostic                                         | `build`, `ship`, agents, CI, advanced troubleshooting       | project root; verification scope/plan/artifact paths; optional layer filters; machine flags                                                | `payload.kind=verification_result`; deterministic/advisory status; evidence packet links; failure classifications; rerun hints            | may write evidence artifacts under explicit evidence/work paths; must not mutate product source except through owning build/fix lanes | non-interactive in skill/CI; human debug may be human-readable but must support JSON                          | `DL-02`, `DL-10`, `DL-15`, `DL-18`, `DL-22`          | `I-09-verification-runner-evidence-failure-routing`; CI parity in `I-20`; consumed by `I-21`/`I-22` | `I-09`, `I-20`, `I-21`, `I-22`, `I-23`                                   | Accepted. Exact runner catalog/evidence/failure taxonomy owned by `DL-10`; security hooks by `DL-22`.                                                                                     |
| `vibe-engineer context index`                              | skill/agent primitive; CI/debug primitive                                                     | build/ship/context agents, CI                               | project root; context roots; output graph path; machine flags                                                                              | `payload.kind=context_index_result`; graph/index artifact links; stale/missing summaries                                                  | writes context index artifacts only to explicit context/work paths                                                                    | non-interactive only for automation                                                                           | `DL-02`, `DL-09`                                     | `I-08-context-memory-drift`; consumed by `I-15`, `I-21`, `I-22`                                     | `I-08`, `I-15`, `I-21`, `I-22`, `I-23`                                   | Accepted. Graph format/storage/retrieval owned by `DL-09`.                                                                                                                                |
| `vibe-engineer context validate`                           | skill/agent primitive; CI/debug primitive                                                     | build/ship/context agents, CI                               | project root; graph/context artifact paths; machine flags                                                                                  | `payload.kind=context_validation_result`; drift/missing/stale diagnostics; artifact links                                                 | read-only except optional evidence/result files                                                                                       | non-interactive only for automation                                                                           | `DL-02`, `DL-09`, `DL-10`                            | `I-08-context-memory-drift`; CI/build/ship consumers later                                          | `I-08`, `I-21`, `I-22`, `I-23`                                           | Accepted.                                                                                                                                                                                 |
| `vibe-engineer context update`                             | skill/agent primitive                                                                         | `build`, `ship`, context agents                             | project root; source artifact paths; update plan; output paths; machine flags                                                              | `payload.kind=context_update_result`; changed context artifacts; links to plan/build/ship/evidence                                        | writes context artifacts only under explicit owned project/context paths                                                              | non-interactive in automation; no hidden prompts                                                              | `DL-02`, `DL-09`, `DL-10`, `DL-22`                   | `I-08-context-memory-drift`; consumed by `I-21`/`I-22`                                              | `I-08`, `I-21`, `I-22`, `I-23`                                           | Accepted. Destructive/stale-conflict handling waits for `DL-22` if policy-sensitive.                                                                                                      |
| `vibe-engineer doctor`                                     | public debug/diagnostic; CI primitive                                                         | human, agent, CI                                            | project root/config path; scope flags; machine flags                                                                                       | `payload.kind=doctor_result`; health checks; dependency/config/registry/context summaries; diagnostics                                    | read-only except result/evidence output                                                                                               | interactive not needed; human default may be prose; machine mode required for automation                      | `DL-02`, `DL-05`, `DL-09`, `DL-10`, `DL-22`          | `I-02-cli-primitive-foundation` for base checks; later lanes extend by command loader               | `I-02`, later relevant lanes                                             | Accepted. Must not become substitute for normal build/ship verification.                                                                                                                  |
| `vibe-engineer config inspect`                             | debug/diagnostic; CI primitive                                                                | human debugging, agent, CI                                  | project root; config path; selectors; redaction mode; machine flags                                                                        | `payload.kind=config_inspect_result`; resolved config summary; source locations; redacted values                                          | read-only except result file                                                                                                          | no prompts; human prose allowed only outside machine mode                                                     | `DL-02`, `DL-22`                                     | `I-02-cli-primitive-foundation`; config package by `I-01`                                           | `I-02`; `I-18` for security redaction if needed                          | Accepted. Secret/redaction policy depends on `DL-22`.                                                                                                                                     |
| `vibe-engineer config validate`                            | debug/diagnostic; CI primitive; skill/agent primitive                                         | agent, CI, human debugging                                  | project root; config path; machine flags                                                                                                   | `payload.kind=config_validation_result`; schema errors; defaults applied; source locations                                                | read-only except result/evidence                                                                                                      | non-interactive                                                                                               | `DL-02`, `DL-22`                                     | `I-02-cli-primitive-foundation`; config package by `I-01`                                           | `I-02`; `I-18` if security policy applies                                | Accepted.                                                                                                                                                                                 |
| `vibe-engineer update check` / `vibe-engineer update plan` | debug/diagnostic; CI primitive                                                                | human debugging, CI, agent                                  | project root; current/target versions; config path; machine flags                                                                          | `payload.kind=update_plan_result`; available migrations; risk/blocker summary; artifact links                                             | read-only except plan/result artifacts                                                                                                | non-interactive                                                                                               | `DL-02`, `DL-19`, `DL-21`, `DL-22`                   | deferred beyond `I-02` unless scheduled by future migration/governance lane                         | future owner set by `DL-19`/`DL-21`/`DL-22` or later implementation plan | Accepted only for non-destructive check/plan.                                                                                                                                             |
| `vibe-engineer update apply` / migration apply             | deferred                                                                                      | human/agent/CI only after future decision                   | not decided                                                                                                                                | must use CLI envelope if later accepted                                                                                                   | potentially mutating/destructive                                                                                                      | must obey future safety confirmations/non-interactive rules                                                   | `DL-19`, `DL-21`, `DL-22`                            | future migration/update lane, not authorized by DL-07                                               | future validator                                                         | Deferred because destructive/versioning policy is not decided. No dependent may implement/apply migrations from DL-07 alone.                                                              |
| `vibe-engineer registry validate`                          | skill/agent primitive; CI primitive; debug/diagnostic                                         | agents, CI, build/ship, advanced debugging                  | registry root/path; project root; scope; machine flags                                                                                     | `payload.kind=registry_validation_result`; accepted/rejected entries; schema/prompt/tool diagnostics                                      | read-only except result/evidence                                                                                                      | non-interactive                                                                                               | `DL-02`, `DL-03`, `DL-05`, `DL-06`, `DL-22`          | `I-04-agent-registry-validation-meta`; command integration through `I-02` loader if needed          | `I-04`, `I-14`, `I-21`, `I-23`                                           | Accepted. Exact registry schema/meta-agent policy owned by `DL-05`.                                                                                                                       |
| `vibe-engineer build`                                      | skill launcher; public only as the `build` skill entrypoint                                   | human through selected harness, skill adapter, agent        | approved Implementation Plan path; project root; machine flags; approval token if future policy requires                                   | `payload.kind=build_result`; Build Result artifact link; verification/context/evidence summaries                                          | mutates implementation-owned files only under build orchestration ownership; writes Build Result/evidence/context                     | may be interactive only at user-approval boundaries defined by `DL-03`/`DL-22`; automation no hidden prompts  | `DL-02`, `DL-03`, `DL-04`, `DL-09`, `DL-10`, `DL-22` | `I-21-build-skill-orchestration` after dependencies                                                 | `I-21`; rerun in `I-23`                                                  | Accepted as skill launcher, not a low-level primitive. Exact skill protocol owned by `DL-03`; security by `DL-22`.                                                                        |
| `vibe-engineer ship`                                       | skill launcher; public only as the `ship` skill entrypoint                                    | human through selected harness, skill adapter, agent        | Build Result path; project root; machine flags; explicit approval for push/PR if future policy permits                                     | `payload.kind=ship_packet`; Ship Packet artifact link; final verification/context/evidence summaries                                      | prepares commit/PR material but must not push/open PR without approval                                                                | interactive approval allowed only where explicitly required; automation no hidden prompts                     | `DL-02`, `DL-03`, `DL-04`, `DL-09`, `DL-10`, `DL-22` | `I-22-ship-skill-orchestration`                                                                     | `I-22`; rerun in `I-23`                                                  | Accepted as skill launcher. No push/PR authority is granted by DL-07.                                                                                                                     |
| `vibe-engineer skill run <skill>` generic launcher         | deferred                                                                                      | selected harness adapters, humans if later approved         | not decided                                                                                                                                | must use CLI envelope if accepted                                                                                                         | not decided                                                                                                                           | not decided                                                                                                   | `DL-03`, `DL-06`, `DL-22`                            | future owner if `DL-03`/`DL-06` require it                                                          | future validator                                                         | Deferred to avoid replacing skill protocol/adapter decisions. `build`/`ship` concrete launchers remain accepted because strategy assigns CLI command paths to their implementation lanes. |

## Machine-readable output and error contract

### Required result envelope

Every command in machine mode must emit exactly one final result envelope. The envelope is a contract, not a prose convention. `DL-02` owns final artifact-schema publication, but `DL-07` locks these required envelope fields and semantics for `I-02`:

```json
{
  "schemaVersion": "vibe-engineer.cli.result.v1",
  "invocation": {
    "id": "<stable invocation id>",
    "command": "<canonical command family>",
    "argv": ["<normalized non-secret argv tokens>"],
    "projectRoot": "<absolute or repo-relative resolved root>",
    "configPath": "<path or null>",
    "startedAt": "<ISO-8601>",
    "endedAt": "<ISO-8601>"
  },
  "status": "success | failure | blocked | partial",
  "exitCode": 0,
  "payload": {
    "kind": "<command-specific payload kind>",
    "schemaVersion": "<payload schema version>",
    "data": {}
  },
  "diagnostics": [
    {
      "severity": "info | warning | error",
      "code": "VE_<STABLE_CODE>",
      "classification": "<typed classification>",
      "message": "<human-readable but non-contractual text>",
      "path": "<optional path>",
      "span": "<optional structured location>",
      "hint": "<optional remediation hint>"
    }
  ],
  "artifacts": [
    {
      "kind": "<artifact kind>",
      "path": "<path>",
      "schemaVersion": "<schema version or null>",
      "role": "input | output | evidence | report",
      "sha256": "<optional content digest>"
    }
  ],
  "errors": [
    {
      "code": "VE_<STABLE_ERROR_CODE>",
      "classification": "<typed classification>",
      "retryable": false,
      "blocking": true,
      "message": "<human-readable but non-contractual text>",
      "details": {}
    }
  ]
}
```

Required properties:

- `schemaVersion` is mandatory and versioned independently from command payload schemas.
- `status` must be one of `success`, `failure`, `blocked`, or `partial`.
- `payload.kind` must identify the command-specific payload type, even when `status` is not `success`.
- `diagnostics[].code` and `errors[].code` are stable identifiers. Consumers must branch on codes/classifications, not on messages.
- `message` and human-readable logs are for humans only and must not be treated as parser contracts.
- `artifacts[]` must link emitted evidence, generated files, Work Brief/Plan/Build/Ship artifacts, context artifacts, registry reports, or result files when applicable.
- When `status=partial`, the additional `payload.data.partial` fields defined in `Partial status contract` below are mandatory; `partial` without those fields is schema-invalid and must be rejected by consumers.
- Secrets and credentials must never be exposed in the envelope; detailed redaction rules are owned by `DL-22`.

### Exit status contract

The process exit status must align with the envelope:

| Exit code | Meaning                                                                                                                                                                 | Envelope status | Typical classification                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------- |
| `0`       | command succeeded                                                                                                                                                       | `success`       | none or info/warning diagnostics only                       |
| `1`       | valid invocation completed and found deterministic failure                                                                                                              | `failure`       | `deterministic_failure`                                     |
| `2`       | invalid arguments, unsupported option, or input artifact shape invalid before command execution                                                                         | `blocked`       | `invalid_invocation` or `invalid_input`                     |
| `3`       | project root, config, registry, or required prerequisite missing/invalid                                                                                                | `blocked`       | `invalid_project`, `invalid_config`, `missing_prerequisite` |
| `4`       | safety/security/destructive-operation policy blocked execution                                                                                                          | `blocked`       | `safety_policy_block`                                       |
| `5`       | ownership/path conflict, write conflict, or unsafe dirty-tree condition for owned paths                                                                                 | `blocked`       | `ownership_conflict` or `write_conflict`                    |
| `6`       | required external/runtime provider unavailable                                                                                                                          | `blocked`       | `external_unavailable`                                      |
| `7`       | unexpected internal bug                                                                                                                                                 | `failure`       | `internal_error`                                            |
| `8`       | valid multi-scope invocation completed at least one required in-scope unit and left at least one required in-scope unit incomplete with typed incomplete-scope evidence | `partial`       | `partial_incomplete`                                        |

Future commands may add command-specific diagnostic codes, but they must not redefine these exit meanings. `status=partial` with exit `0` is invalid. Exit `8` is the default and only common process exit for `partial` in human, agent, and CI invocation modes.

### Status semantics and deterministic-gate mapping

| Envelope status | Deterministic gate meaning                                                                                                                                                                                     | Higher-level/report mapping                                                                                                                                                    | Relationship to advisory findings                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `success`       | Passed. The command completed its required scope and all hard deterministic gates passed.                                                                                                                      | May be reported as `passed`, `DONE`, or equivalent by a consuming skill/orchestrator.                                                                                          | May include `info`/`warning` diagnostics for advisory findings. Advisory findings do not change the CLI status.                                  |
| `failure`       | Failed. The command completed its required scope and found a deterministic failure, or hit an internal command failure classified as `internal_error`.                                                         | Usually maps to `failed` or `needs_fix` depending on the consuming workflow's vocabulary.                                                                                      | Not advisory.                                                                                                                                    |
| `blocked`       | Blocked. The command could not validly execute or continue because invocation, inputs, prerequisites, safety policy, ownership, external availability, or project/config state prevented a trustworthy result. | Maps to `BLOCKED` or equivalent. A consumer may not convert it to `needs_fix` unless a documented fixer can resolve the exact prerequisite.                                    | Not advisory.                                                                                                                                    |
| `partial`       | Blocking incomplete result. It is not success, not passed, not advisory, and not a warning-only status. Deterministic gates must treat it as non-passing until a later complete rerun returns `success`.       | May map to `needs_fix` only when the incomplete scopes are actionable by a fixer/resume path; otherwise maps to `BLOCKED`. It must never map to `passed`, `DONE`, or CI green. | Advisory-only findings must be represented as warning diagnostics on `success` or in command-specific advisory payload fields, not as `partial`. |

`partial` is allowed only for commands with an explicit multi-scope or multi-target contract where at least one required in-scope unit completed with usable typed evidence and at least one required in-scope unit remained incomplete. If no required unit completed, use `blocked` or `failure` instead. If all required units completed but some advisory review is unavailable or inconclusive, use `success` with advisory diagnostics unless the owning verification decision makes that advisory item a hard gate.

### Partial status contract

When `status=partial`, the process exit code must be `8` for humans, agents, and CI. Human default mode may print a prose summary before process exit, but the process still exits `8`; machine mode must emit the envelope normally. Agent and CI consumers must treat exit `8` as a hard non-green result.

A `partial` envelope must include these machine-readable fields in addition to the common envelope fields:

```json
{
  "status": "partial",
  "exitCode": 8,
  "payload": {
    "kind": "<command-specific payload kind>",
    "schemaVersion": "<payload schema version>",
    "data": {
      "partial": {
        "overallDisposition": "not_passed_blocking",
        "completedScopes": [
          {
            "id": "<stable scope id>",
            "kind": "<scope kind>",
            "required": true,
            "artifacts": ["<artifact path or artifact id>"]
          }
        ],
        "incompleteScopes": [
          {
            "id": "<stable scope id>",
            "kind": "<scope kind>",
            "required": true,
            "blocking": true,
            "reasonCode": "VE_<STABLE_CODE>",
            "classification": "partial_incomplete",
            "nextAction": "<typed next action or null>"
          }
        ],
        "resume": {
          "allowed": true,
          "command": ["vibe-engineer", "<command>", "<args>"]
        }
      }
    }
  }
}
```

Minimum validity rules for `status=partial`:

- `payload.data.partial.overallDisposition` must be exactly `not_passed_blocking`.
- `completedScopes[]` must contain at least one completed required scope with a stable `id`, `kind`, and artifact/evidence reference; otherwise the command must report `blocked` or `failure`.
- `incompleteScopes[]` must contain at least one required incomplete scope with `required: true`, `blocking: true`, stable `reasonCode`, and typed `classification`.
- `diagnostics[]` must include at least one `severity: "error"` diagnostic with classification `partial_incomplete` and a stable code for the incomplete scope class.
- `errors[]` must include at least one item with `classification: "partial_incomplete"`, `blocking: true`, and `details.incompleteScopeIds` listing the affected incomplete scopes. `retryable` must reflect whether `resume.allowed` is true.
- `resume.allowed` must be boolean. When true, `resume.command` must be canonical argv for a non-interactive rerun/resume path; when false, `resume.command` must be `null` and consumers must classify the workflow as `BLOCKED` unless another typed fixer is available.
- `artifacts[]` may list only artifacts actually produced and valid for completed scopes. Missing, invalid, or incomplete artifacts must be listed under `incompleteScopes[]`, not presented as successful output artifacts.
- `partial` must not be emitted for invalid invocation, invalid project/config, missing global prerequisite, safety/security block, ownership/path conflict, unavailable required external provider, or internal bug; those conditions use exits `2` through `7` as applicable.
- `partial` must not downgrade a hard deterministic failure to a warning, must not suppress a required blocker, and must not be used to let `build`, `ship`, validation, or CI proceed as green.

### Stdout/stderr policy

- In machine mode (`--json`, `--result-file`, or documented automation mode), stdout must contain only the final JSON envelope unless `--result-file` is used with `--quiet`, in which case stdout may be empty and the result file is the carrier.
- If `--result-file <path>` is supplied, the command must write the same envelope atomically to that path.
- Human progress, spinners, banners, and narrative summaries are forbidden on stdout in machine mode.
- Stderr may carry human progress or runtime warnings, but agents/CI must not parse stderr as the contract. Spawn failures before envelope creation are the only exception and must be handled as process failures by the consumer.
- Human default mode may print prose, tables, or summaries, but every command intended for automation must have machine mode.

### Typed error classifications

Common classifications reserved by DL-07:

- `invalid_invocation`
- `invalid_input`
- `invalid_project`
- `invalid_config`
- `missing_prerequisite`
- `unsupported_operation`
- `deterministic_failure`
- `safety_policy_block`
- `ownership_conflict`
- `write_conflict`
- `external_unavailable`
- `internal_error`
- `partial_incomplete`

Sibling decisions may refine command-specific error codes and payload fields, but they must preserve these classifications for cross-command consumers. Sibling decisions may add narrower partial reason codes, but they must preserve the common `partial_incomplete` classification and exit `8` behavior.

## Skill/agent/CI consumption contract

- Skills, agents, CI, and generated projects must invoke the actual `vibe-engineer` binary/entrypoint, not import private command internals as a substitute for CLI-boundary proof.
- Automation must pass `--json` and/or `--result-file <path>` and parse only the result envelope plus schema-validated artifacts.
- Automation must supply explicit artifact paths: Work Brief, Implementation Plan, Verification Delta, Build Result, Ship Packet, Evidence Packet, context graph/index, registry paths, or schematic manifests as applicable.
- Skills must treat primitive commands as deterministic helpers. A skill may summarize human text to the user, but skill-to-primitive and primitive-to-skill handoff is through typed artifacts and the CLI result envelope.
- CI must treat nonzero exits as blocking according to the exit table and must record the envelope/evidence artifact paths.
- For `status=partial`, skills/orchestrators must stop the current deterministic gate, record the envelope and completed-scope evidence, route actionable incomplete scopes to the appropriate fixer/resume path, and report `needs_fix` only when that workflow vocabulary means "non-green and fixable". If no safe fixer/resume path exists, they must report `BLOCKED`.
- For `status=partial`, CI must fail/block the job on exit `8`; it may upload completed-scope evidence as diagnostic evidence, but it must not mark the aggregate quality, build, ship, or validation gate green.
- For `status=partial`, evidence collectors must mark the command result and any aggregate evidence packet as incomplete/non-passing. Completed-scope artifacts may be retained as partial evidence, but they cannot prove the whole command or dependent gate passed.
- Generated projects must call the installed/local `vibe-engineer` command path selected by their harness config; hidden global state or chat-history dependence is forbidden.
- Consumers must never scrape phrases from human logs, progress output, stderr, or diagnostic messages.

## Interactive and non-interactive behavior

- `create` and `import` may prompt humans, but only for locked creation inputs: project/repo/app naming values, default agentic harness, and optional project brief.
- `create` and `import` must not prompt for stack preset, max parallel agents, separate bootstrap/skip-bootstrap, or other forbidden UX additions.
- All automation paths must be non-interactive. Missing required values in non-interactive mode must produce exit `2` or `3` with a typed envelope, not a prompt.
- Commands invoked by `build`, `ship`, agents, CI, or validators must never pause for hidden confirmations.
- Approval boundaries for destructive operations, commits, pushes, PRs, secrets, credentials, and unsafe external operations are not decided by DL-07. They are blocked on `DL-22` and relevant skill decisions.
- Project-root discovery may walk upward from cwd to a documented config marker, but automation must be able to pass `--project-root`. The resolved root must appear in the envelope.
- Config loading must be explicit and observable in the envelope. Defaults may be applied only through typed config rules; no command may infer contract-critical settings from chat history.

## Alternatives considered

### User-facing everything

- decision: rejected
- rationale: README and locked decisions state normal users should not operate dozens of low-level commands; users operate through six skills, with verification/context/schematics automatic.
- consequences: low-level commands exist but are classified as skill/agent/CI/debug primitives.

### Internal-only CLI

- decision: rejected
- rationale: locked decisions require `vibe-engineer create/import` for starter setup, diagnostics are necessary for support, and CI/agents need a stable process boundary.
- consequences: a small public surface is documented while most primitives remain automation-first.

### Prose/log output as the contract

- decision: rejected
- rationale: backlog §7 requires reliable agent parsing, and verification sources require evidence over assertion. Prose/log scraping would be heuristic and unstable.
- consequences: JSON result envelope, stable codes, exit table, and artifact links are mandatory.

### One giant command

- decision: rejected
- rationale: create, schematics, verification, context, registry, config, diagnostics, build, and ship have distinct ownership, payloads, side effects, and witness lanes.
- consequences: command families are separated and mapped to owner lanes.

### Command families with typed output

- decision: accepted
- rationale: preserves skill-first UX while giving agents/CI deterministic primitives and real spawn boundaries.
- consequences: `I-02` can implement the common loader/envelope; family lanes implement their own payloads under sibling decisions.

### Defer all exact CLI details to sibling decisions

- decision: rejected
- rationale: `I-02-cli-primitive-foundation` needs a stable output/error/exit contract and command namespace before it can safely proceed.
- consequences: DL-07 locks common CLI semantics now and defers only sibling-owned payload internals or destructive/security details.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: MST-R
      type: external_prerequisite
      required_status: PASS
      rationale: Confirms the final strategy is safe for decision execution and contains the CLI gate.
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies required template, output class, dependency format, evidence checklist, real-boundary, and dirty-tree policy.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies domain-neutral core/extension/sample-demo rules for CLI names, prompts, outputs, diagnostics, and defaults.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification layer, mechanical gates, backlog, strategy, playbook, and quality bar define CLI role and proof requirements.
  blocks:
    - id: I-02-cli-primitive-foundation
      reason: Needs binary namespace, common command contract, exit/error behavior, and result envelope.
    - id: I-07-schematics-engine
      reason: Needs schematic command visibility and CLI result obligations.
    - id: I-09-verification-runner-evidence-failure-routing
      reason: Needs verification command boundary, envelope, and evidence link obligations.
    - id: I-15-create-import-starter-UX
      reason: Needs create/import public surface and non-interactive machine behavior.
    - id: I-21-build-skill-orchestration
      reason: Needs build skill launcher and primitive-consumption contract.
    - id: I-22-ship-skill-orchestration
      reason: Needs ship skill launcher and no-push/no-hidden-prompt CLI boundaries.
  blocked_dependents:
    - id: I-02-cli-primitive-foundation
      blocked_until: DL-07 is independently validated clean and DL-22/security prerequisites for CLI foundation are satisfied.
      relying_on: common CLI envelope, exit codes, command visibility classes, config/doctor primitives, command-loader boundary.
    - id: I-07-schematics-engine
      blocked_until: DL-07, DL-08, and required artifact/config dependencies are green.
      relying_on: `vibe-engineer schematic run` primitive contract.
    - id: I-09-verification-runner-evidence-failure-routing
      blocked_until: DL-07, DL-10, DL-22, and required artifact/orchestration dependencies are green.
      relying_on: `vibe-engineer verify` primitive contract and evidence links.
    - id: I-15-create-import-starter-UX
      blocked_until: DL-07 plus create/import sibling decisions and prerequisites are green.
      relying_on: public create/import command contract and prompt/non-interactive policy.
    - id: I-21-build-skill-orchestration
      blocked_until: DL-07 plus skill/context/verification/orchestration dependencies are green.
      relying_on: build launcher contract and primitive consumption rules.
    - id: I-22-ship-skill-orchestration
      blocked_until: DL-07 plus skill/context/verification/security dependencies are green.
      relying_on: ship launcher contract, final verification behavior, and no push/PR without approval boundary.
    - id: update-apply-or-migration-apply implementation
      blocked_until: DL-22 and future migration/versioning owner explicitly decide destructive apply behavior.
      relying_on: security/destructive operation policy not owned by DL-07.
  required_before_finalizing:
    - id: DL-02-artifact-schemas
      required_content: Final schema definitions for CLI result envelope publication and command-specific payload/artifact schemas.
    - id: DL-03-skill-protocols
      required_content: Exact skill invocation and artifact handoff protocol for skill launchers and primitive calls.
    - id: DL-08-schematics-system
      required_content: Schematic manifests, input variables, idempotency, dry-run, and conflict behavior for schematic CLI payloads.
    - id: DL-09-context-memory-drift
      required_content: Context graph/index/update/validate payload schemas and storage semantics.
    - id: DL-10-verification-implementation
      required_content: Verification runner, evidence packet, failure taxonomy, rerun/advisory/hard result semantics.
    - id: DL-22-security-safety-model
      required_content: Secret redaction, command allow/deny, destructive operation confirmation, safe external operation, and audit log policy.
  deferrals:
    - deferred_question: Exact payload fields for each command family beyond the common result envelope.
      rationale: Payload internals belong to artifact, skill, schematic, context, verification, registry, and security decisions.
      future_owner: DL-02, DL-03, DL-05, DL-08, DL-09, DL-10, DL-22 and owning I-* lanes.
      allowed_now: true
      blocked_dependents:
        - affected command-family implementation until its owner decision is green
      invalid_if_any_dependent_relies: true
    - deferred_question: Destructive `update apply` / migration apply command behavior.
      rationale: Security/destructive/versioning policy is not available and must not be invented here.
      future_owner: DL-22 plus future migration/governance owner from DL-19/DL-21 or implementation planning.
      allowed_now: true
      blocked_dependents:
        - update-apply-or-migration-apply implementation
      invalid_if_any_dependent_relies: true
    - deferred_question: Generic `vibe-engineer skill run <skill>` launcher.
      rationale: Exact skill protocols and selected-harness adapter invocation are owned by DL-03 and DL-06; build/ship concrete command paths are accepted separately by strategy ownership.
      future_owner: DL-03-skill-protocols / DL-06-agentic-harness-integrations
      allowed_now: true
      blocked_dependents:
        - any generic skill-run CLI implementation
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/**
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/**
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-07 owned paths
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - /Users/lizavasilyeva/work/vibe-engineer/packages/**
    - /Users/lizavasilyeva/work/vibe-engineer/apps/**
    - /Users/lizavasilyeva/work/vibe-engineer/examples/**
    - /Users/lizavasilyeva/work/vibe-engineer/scripts/**
    - /Users/lizavasilyeva/work/vibe-engineer/.github/**
    - root config files
    - generated starter files
    - non-owned decision/report paths
  handoff_notes:
    - from: DL-07
      to: I-02-cli-primitive-foundation
      condition: After independent DL-07 validation is clean and other lane prerequisites are satisfied.
      shared_path_policy: serialized
    - from: I-02-cli-primitive-foundation
      to: I-07/I-09/I-15/I-21/I-22 command-family lanes
      condition: Command loader/envelope foundation exists and ownership handoff is recorded.
      shared_path_policy: serialized
```

## Blocked dependents

At minimum, these lanes remain blocked until DL-07 is independently validated clean and their sibling prerequisites are satisfied:

- `I-02-cli-primitive-foundation` — blocked on DL-07 common CLI contract plus `DL-22` for security-sensitive CLI foundation.
- `I-07-schematics-engine` — blocked on DL-07 + `DL-08` and artifact/config prerequisites.
- `I-09-verification-runner-evidence-failure-routing` — blocked on DL-07 + `DL-10` + `DL-22` and artifact/orchestration prerequisites.
- `I-15-create-import-starter-UX` — blocked on DL-07 plus create/import/starter/context/security decisions.
- `I-21-build-skill-orchestration` — blocked on DL-07 plus skill/orchestration/context/verification dependencies.
- `I-22-ship-skill-orchestration` — blocked on DL-07 plus skill/context/verification/security dependencies.

Additional blocked/deferred dependents:

- Any destructive `update apply` / migration apply command is blocked until `DL-22` and a future migration/versioning owner decide the policy.
- Any generic `vibe-engineer skill run <skill>` implementation is blocked until `DL-03`/`DL-06` decide the protocol/adapter boundary.
- Any command-family implementation that relies on unresolved payload internals is blocked until its owner decision supplies the exact schema/protocol.

## Verification/witness consequences

- deterministic checks affected: CLI command-loader tests, result-envelope schema validation, status/exit-code mapping including `partial` exit `8`, stdout/stderr machine-mode discipline, non-interactive hidden-prompt checks, root/config/input validation, partial-envelope validity, and command-family payload schema checks.
- positive witnesses required downstream:
  - actual `vibe-engineer` binary emits schema-valid JSON envelope for accepted command families;
  - `--result-file` is written atomically and matches stdout envelope where both are requested;
  - `create`/`import` preserve locked prompts and generated config defaults;
  - `verify`, `context`, `schematic`, `registry`, `config`, `doctor`, `build`, and `ship` return typed payload kinds and artifact links when implemented;
  - the first implemented command family that can legitimately produce a multi-scope incomplete result proves an actual binary/spawn/stdout-stderr/exit/result-file witness where `status=partial` exits `8`, includes mandatory `payload.data.partial`, `diagnostics`, `errors`, and artifacts, and is consumed by the real skill/CI parser as non-green.
- negative witnesses required downstream:
  - invalid flags/inputs produce exit `2` and typed envelope;
  - invalid config/project root produces exit `3` and typed envelope;
  - deterministic verification failure produces exit `1` without prose scraping;
  - safety/security/ownership conflicts produce typed blocked exits after `DL-22` policy exists;
  - `status=partial` with exit `0`, missing `payload.data.partial`, no blocking incomplete scope, no `partial_incomplete` error, or aggregate consumer pass/CI green is rejected;
  - a command using `partial` to mask invalid invocation, missing global prerequisite, safety block, ownership conflict, external-provider outage, internal bug, hard deterministic failure, or advisory-only warning is rejected;
  - machine mode with human banners/progress on stdout is rejected;
  - hidden prompt in non-interactive mode is rejected.
- regression witnesses required downstream:
  - binary remains `vibe-engineer`;
  - normal users remain skill-first and are not required to run low-level verify/context/schematic primitives;
  - six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
  - create flow does not add forbidden prompts;
  - build/ship automatically run verification/context/evidence and do not push/PR without approval;
  - schematics remain deterministic agent-facing generators;
  - DL-24A and DL-20A remain prerequisites.
- real_boundary_required: yes for later implementation lanes; no live CLI seam is created by this decision artifact itself.
- real_boundary_status: required_before_closure for `I-02`, `I-07`, `I-09`, `I-15`, `I-21`, `I-22`, and `I-23`; not_applicable for this decision artifact.
- if no live seam: this decision locks design and proof obligations only; it does not implement or run the CLI.

Earliest proof lanes:

- `I-02-cli-primitive-foundation`: actual `vibe-engineer` binary invokes primitive command(s), emits schema-valid machine output, writes/reads result carriers, rejects invalid config/inputs, and locks consumer parser behavior so `partial`/exit `8` is non-green and cannot be treated as success.
- `I-07-schematics-engine`: actual CLI schematic command writes/validates fixture output under owned paths.
- `I-09-verification-runner-evidence-failure-routing`: actual `vibe-engineer verify` invokes runners/gates and writes evidence consumed by build/validators.
- `I-15-create-import-starter-UX`: actual `vibe-engineer create/import` writes starter fixture and persists selected harness/config without forbidden prompts.
- `I-21-build-skill-orchestration`: actual build skill/command consumes Implementation Plan and invokes verification/context/evidence paths.
- `I-22-ship-skill-orchestration`: actual ship skill/command consumes Build Result and prepares Ship Packet without pushing.

If any implementation lane cannot run the actual binary/spawn/stdout/stderr/process-exit/result-file/consumer parser boundary, that lane must remain `pending-live/BLOCKED`; shape-only fixtures or hand-authored envelopes are insufficient. For `partial`, the real-boundary witness must cross the actual CLI producer → stdout/stderr/process exit carrier → result-file carrier when used → skill/orchestrator/CI/evidence-consumer parser, and must prove the consumer blocks rather than treating partial evidence as whole-command proof.

## Ownership/path consequences

- owned_write_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/**`
- read_only_paths:
  - all cited source docs and orchestration artifacts in `/Users/lizavasilyeva/work/harness-starter/**`;
  - prior decisions/reports for `DL-24A` and `DL-20A`;
  - target repo inventory outside DL-07 owned paths;
  - sibling decision artifacts/reports if present.
- untouchable_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/.git/**`;
  - production package/source paths, root configs, CI, generated starter files;
  - non-owned decision/report paths.
- serialized/shared ownership notes:
  - `I-02` owns the command loader/foundation and must provide serialized handoff before later command-family lanes edit shared CLI registration/package metadata.
  - DL-07 authorizes no package/source/root/config/CI/generated-starter writes.

## Domain-neutrality check

- DL-20A status consulted: `LOCKED` and independently validated `PASS`.
- governed surfaces affected by this decision: CLI command names, output envelopes, error classifications, diagnostics, prompts, docs implications, and future command-family examples.
- surface classification: core harness CLI decision; no consuming-project extension or sample/demo implementation is created here.
- positive generic vocabulary permitted: apps, packages, modules, contracts, adapters, tests, standards, context, plans, verification, schematics, skills, agents, registries, artifacts, evidence, config, project root, generated starter.
- project/business terms mentioned: none as core defaults. DL-20A forbidden examples are not used as CLI defaults or examples here.
- result: PASS. The CLI surface uses generic harness vocabulary and does not embed ecommerce, inventory, fashion, Billz, Telegram, Instagram, checkout/product/customer-order style models, or equivalent project/business assumptions.
- extension boundary: project-specific names may enter only as explicit user/project inputs to `create`/`import` or consuming-project extension commands; they must not become core defaults.
- sample/demo boundary: no sample/demo behavior is decided here; future examples must be labeled and checked under DL-20A.
- deterministic/advisory enforcement owners: command/domain-neutrality enforcement maps to `DL-15`/`I-10`, `I-04`, `I-07`, `I-15`, `I-24`, `DL-20B`, and final bughunt as assigned by DL-20A.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- writes limited to owned paths: yes.
- conflicts discovered: no concrete DL-07 content conflict before writing this artifact. Concurrent dirty-tree context exists in other decision work areas, but those paths are outside DL-07 ownership and were not touched.
- no production/package/root/config/CI/generated starter paths were edited.

## Deferral rationale

This decision status is `LOCKED`; only sibling-owned details are deferred.

### Command payload internals

- deferred_question: exact command-specific payload fields and artifact schemas beyond the common envelope.
- reason_now: those details belong to `DL-02`, `DL-03`, `DL-05`, `DL-08`, `DL-09`, `DL-10`, and related implementation lanes.
- future_owner: listed sibling decisions and owner lanes.
- required_before_finalizing: affected command-family implementations.
- blocked_dependents: any lane relying on missing payload details.
- proof_no_dependent_relies_now: `I-02` can implement the common envelope, exit codes, command loader, config/doctor primitives, and validation scaffolding without inventing command-family payload internals.

### Destructive update/migration apply

- deferred_question: whether/how `vibe-engineer update apply` or migration apply exists.
- reason_now: destructive/security/versioning policy is owned by `DL-22` and future governance/migration owners.
- future_owner: `DL-22-security-safety-model` plus future migration/versioning lane.
- required_before_finalizing: any mutating update/migration implementation.
- blocked_dependents: update/migration apply implementation.
- proof_no_dependent_relies_now: non-destructive `update check/plan` is enough for current CLI primitive classification; no listed immediate implementation lane requires destructive update apply.

### Generic skill launcher

- deferred_question: whether `vibe-engineer skill run <skill>` exists as a generic skill launcher.
- reason_now: skill protocol and selected-harness adapter invocation are owned by `DL-03` and `DL-06`.
- future_owner: `DL-03-skill-protocols` and `DL-06-agentic-harness-integrations`.
- required_before_finalizing: any generic skill-run CLI implementation.
- blocked_dependents: generic skill-run implementation only.
- proof_no_dependent_relies_now: concrete `build`/`ship` CLI paths are accepted because strategy assigns those command paths to `I-21`/`I-22`; other skills can remain adapter/skill surfaces until their owners decide.

## Evidence checklist

1. Report artifact was created first at `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-07-cli-primitives/DL-07-execution-report.md` and updated before the decision write.
2. Source files inspected are listed in the execution report and cited above by path/section heading.
3. Files changed are this decision artifact and the DL-07 execution report only.
4. No production/package/root/config/CI/generated starter files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Dependencies, blocked dependents, required sequencing, deferrals, ownership, read-only, untouchable, and handoff fields use the DL-24A dependency declaration format.
7. Deferrals prove that no dependent may rely on unresolved payload/destructive/generic-skill details; affected dependents are blocked.
8. Verification/witness consequences list positive, negative, regression, and real-boundary requirements.
9. Real-boundary status is stated: no live CLI proof is claimed by this decision; actual binary/spawn/carrier/consumer proof is required in implementation lanes.
10. Ownership/path consequences are explicit and dirty-tree-safe.
11. Domain-neutrality check is present and applies DL-20A.
12. Locked decisions remain uncontradicted: `vibe-engineer`, two-repo direction, six skills, artifact flow, automatic build/ship verification/context/evidence, fixed create UX/defaults, schematics internal boundary, mechanical gates, and no push/PR without approval.
13. Downstream dependents cannot finalize without this CLI primitive contract and their sibling prerequisites.
14. Validator checklist and severity policy are included below.

## Validation plan and severity policy

Independent Triad-B validation must inspect actual changed/owned files and any available diff, not just this artifact or report.

### Positive witnesses

- Artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-07-cli-primitives.md` and follows DL-24A schema.
- Artifact explicitly answers backlog §7: public/internal classification, skill/agent/CI invocation, and parseable output/error/exit format, including `partial` status semantics.
- CLI surface matrix covers create/import/init, schematics, verification, context, doctor, config, update/migrations, registry validation, and build/ship launchers.
- Machine-readable output/error contract is stable enough for `I-02` to implement without inventing parse rules, including exit `8`, required `payload.data.partial` fields, and non-green consumer handling for `status=partial`.
- Accepted command families map to owner lanes and validation witness owners.
- Skill-first UX and automatic verification/context behavior are preserved.
- Domain-neutrality checklist is present and applied.

### Negative witnesses

- A CLI decision omitting output/exit/error semantics is not green.
- A CLI decision relying on scraping human prose logs is rejected.
- A decision making all commands ordinary public user-facing commands is rejected.
- A decision that lets implementation proceed while deferring the output contract needed by `I-02` is rejected.
- A decision that allows `status=partial` without exact exit code, blocking/non-blocking semantics, required machine fields, and consumer behavior is rejected.
- A decision or implementation that permits `partial` to avoid a hard deterministic blocker, produce CI green, or replace `blocked`/`failure`/advisory semantics is rejected.
- A decision that decides security/destructive command behavior without `DL-22` or blocked-dependent mapping is rejected.
- A decision that uses project/business domain examples in core CLI defaults is rejected unless explicitly sample/demo or negative-example labeled.

### Regression witnesses

- Product/package/CLI name remains `vibe-engineer`.
- Six user-facing skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Normal users are not required to run low-level `verify`, `context update`, or schematics during normal work.
- Create flow asks only project naming, default agentic harness, and optional project brief; no stack preset, max-parallel-agents, or separate bootstrap prompt is added.
- `build` and `ship` automatically run verification/context/evidence and do not push/PR without approval.
- Schematics remain deterministic agent-facing generators, not ordinary user-facing skills.
- DL-24A output discipline and DL-20A domain-neutrality foundation remain prerequisites and are not contradicted.

### Sibling/blast-radius checks

- Check consistency against source docs and strategy §§3–11.
- Check existing sibling decisions, if present by validation time, for contradictions.
- Confirm DL-07 does not claim ownership over artifact schemas, skill protocols, schematic internals, context graph, verification implementation, registry schema, or security/safety policy beyond CLI boundary dependencies.
- Check that no path outside `docs/decisions/DL-07-cli-primitives.md` and `.vibe/work/DL-07-cli-primitives/**` changed by this execution.
- Check no production source/root config/CI/generated starter files or git metadata were touched.

### Severity policy

- `critical`: locked-decision contradiction; missing DL-24A/DL-20A prerequisite; out-of-license write; missing decision artifact; no parseable output/error contract while unblocking CLI implementation; public/internal command boundary contradictory to skill UX; invalid deferral relied on by dependents; false real-boundary closure; domain-specific core CLI defaults.
- `major-local`: incomplete command matrix, unclear owner mapping, missing source citation, weak validation witness plan, or unresolved sibling-decision dependency that blocks direct CLI dependents but can be repaired within DL-07 paths.
- `minor-local`: wording/format/citation clarity issue that does not weaken downstream gating.
- `clean`: all schema, source, command, dependency, domain-neutrality, ownership, and witness requirements are satisfied.

## Known ambiguities / future owners

- `DL-02` owns final artifact schema publication and command-family payload schemas, including whether the CLI result envelope is also packaged as an artifact schema.
- `DL-03` owns exact skill protocols, including user approval boundaries and whether any non-build/ship skills receive CLI launchers.
- `DL-05` owns registry schema/meta-agent policy consumed by `registry validate`.
- `DL-06` owns selected agentic harness adapter invocation details and generated skill/command files.
- `DL-08` owns schematic API, manifest, variable/input system, idempotency, conflict behavior, and dry-run payloads.
- `DL-09` owns context graph/storage/index/update/validate details.
- `DL-10` owns verification runner, evidence model, failure taxonomy, rerun strategy, and advisory/hard result representation within the common DL-07 status contract, including the rule that `partial` is non-green exit `8` and advisory-only findings are not `partial`.
- `DL-15` owns exact mechanical engine/tooling; `I-10` and later lanes own deterministic checks.
- `DL-22` owns secret redaction, command allow/deny policy, sandbox/destructive-operation rules, external-operation safety, env conventions, and audit/evidence logs.
- `DL-19`/`DL-21` or a future migration lane must decide versioning/update/migration apply semantics before any destructive update command exists.
- No live CLI behavior is proven here; all actual binary/consumer proof belongs to implementation lanes and remains pending until those lanes run.
