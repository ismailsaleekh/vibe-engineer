# DL-06 — Agentic Harness Integrations

## Status

- status: LOCKED
- output_class: locked_decision_document
- date: 2026-06-23
- owner_lane: DL-06 decision-lock execution
- artifact_path: `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-06-agentic-harness-integrations.md`
- report_path: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-06-agentic-harness-integrations/DL-06-execution-report.md`

## Source citations

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/master-strategy/strategy-final.md` — §4.1 `Harness repo package hypothesis`; §5.2 `Decision-lock table`; §§6–7 sequencing and ready rules; §9.2 `Decision triad ownership`; §§10–11 validation and real-boundary witness rows.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md` — `Required future decision template`; `Dependency declaration format`; `Evidence checklist`; `Real-boundary policy`; `Ownership and dirty-tree policy`.
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md` — `Core / extension / sample-demo boundary`; `Allowed and forbidden vocabulary policy`; `Decision-artifact checklist`; `Implementation enforcement plan`.
- `/Users/lizavasilyeva/work/harness-starter/README.md` — §§2–4, §§7–13, §§15–16.
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md` — §§4–8.
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md` — §6 `Agentic harness integrations`.
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md` — §§6–12.
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md` — §§1, 5, 7, 9, 11–13.
- `/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/README.md` — `Customization`; `Context Files`; `Programmatic Usage`; `CLI Reference`; `Philosophy`.
- `/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md` — `Locations`; `How Skills Work`; `Skill Commands`; `Skill Structure`; `Frontmatter`; `Validation`; `Using Skills from Other Harnesses`.
- `/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md` — `Quick Start`; `Extension Locations`; `Events`; `ExtensionAPI Methods`; `Custom Tools`; `Mode Behavior`; `Examples Reference`.
- `/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/docs/prompt-templates.md` — `Locations`; `Format`; `Usage`; `Arguments`; `Loading Rules`.
- `/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md` — `Install and Manage`; `Creating a Pi Package`; `Package Structure`; `Dependencies`; `Scope and Deduplication`.
- `/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/docs/sdk.md` — `Core Concepts`; `Extensions`; `Skills`; `Context Files`; `Slash Commands`; `Run Modes`; `Exports`.
- `/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/docs/rpc.md` — `Protocol Overview`; `Commands`; `get_commands`; `Extension UI Protocol`.
- `/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/docs/json.md` — `JSON Event Stream Mode`; `Event Types`; `Output Format`.
- `/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/docs/tui.md` — `TUI Components`; `Overlays`; `Common Patterns`.
- `/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/subagent/README.md`; `index.ts`; `agents.ts` — extension-built subagent example.
- `/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/permission-gate.ts`; `protected-paths.ts`; `dynamic-resources/index.ts`; `prompt-customizer.ts`; `send-user-message.ts`; `commands.ts`; `plan-mode/README.md` — focused extension and command examples.
- `/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/examples/sdk/04-skills.ts`; `06-extensions.ts`; `07-context-files.ts`; `08-prompt-templates.ts`; `12-full-control.ts`; `13-session-runtime.ts` — focused SDK/resource examples.

## Decision summary

DL-06 locks **pi first** for v1 agentic harness integration. The common adapter abstraction is a capability-matrix contract that can describe many harnesses, but v1 production implementation may only close pi support through `I-14-pi-adapter-skill-consumption` unless a later decision supplies authoritative non-pi evidence.

Claude Code, Codex, OpenCode, and later integrations are **planned/deferred**, not v1-supported by this decision. Unsupported harness features must never silently no-op; they must be capability-flagged as `unknown`, `deferred`, or `blocked` and must block any dependent that would rely on them.

## Decision details

1. `agenticHarness` is a create/config selection concept, not a stack preset and not a prompt for `maxParallelAgents`, bootstrap behavior, or implementation parallelism.
2. Each harness adapter must publish a typed capability matrix and generated-file manifest before create/import or skill generation can treat that harness as selectable.
3. Adapters translate the six locked user-facing skills — `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship` — into the selected harness's native command/skill/prompt surface.
4. Adapter output must be deterministic and schema-consumable by downstream lanes, but final schema details remain owned by `DL-02`, `DL-03`, and `DL-07`.
5. Any feature absent in a target harness must be represented as an explicit unsupported capability with a downstream consequence. Silent fallback to a weaker behavior is forbidden.
6. DL-06 does not prove runtime loading. The first real proof is owned by `I-14`; until that proof passes, pi runtime support is designed but not truth-green.
7. Adapter code, generated assets, packages, tests, schemas, and starter generation are non-goals for this decision-only lane.

## Alternatives considered

### Pi first

- decision: accepted
- rationale: final strategy and README expect initial pi integration, and local pi docs/examples provide evidence for concrete v1 mechanisms.
- consequences: `I-14` implements pi first; non-pi adapters remain blocked until separately evidenced.

### Claude Code, Codex, or OpenCode first

- decision: rejected for v1 first target
- rationale: no local authoritative harness-resource documentation was provided for these targets, so choosing them first would contradict the pi-first strategy without evidence.
- consequences: future research may unlock them, but DL-06 does not authorize v1 implementation.

### Multi-harness parity in v1

- decision: rejected
- rationale: parity without per-harness evidence would create silent fallbacks and shape-only claims.
- consequences: common abstraction is locked now; support status is per-harness and evidence-gated.

### Defer all harness integration decisions

- decision: rejected
- rationale: `I-14`, `I-15`, and generated skills need a first target and adapter abstraction; pi has enough evidence to proceed as first target.
- consequences: only unknown non-pi details are deferred.

## First integration target

Accepted first target: **pi**.

Rationale:

- The final strategy states pi should be first unless rejected with evidence.
- The README says the harness provides agent integrations initially for `pi`.
- Local authoritative pi docs and examples are available and cite actual mechanisms for skills, prompt templates, extensions, packages, context files, CLI modes, RPC, JSON event streaming, and SDK embedding.
- No equivalent local authoritative docs were provided for Claude Code, Codex, or OpenCode harness-specific generated assets.

Consequence: `I-14-pi-adapter-skill-consumption` owns the first adapter implementation and must not implement other adapters unless a later green decision expands scope.

## Common harness adapter abstraction

Every adapter must provide these typed fields. Values must use `known`, `unknown`, `deferred`, or `blocked` evidence states; blanks are invalid.

| Field | Required content | DL-06 rule |
| --- | --- | --- |
| `adapter_id` | Stable id such as `pi`, `claude-code`, `codex`, `opencode` | Required before generated config can reference the adapter. |
| `display_name` | Human-readable name | Required for create UX. |
| `evidence_status` | `known` / `unknown` / `deferred` / `blocked` plus cited source | Required; undocumented parity is invalid. |
| `version_compatibility` | harness name, version/range if known, resource format version, Node/runtime requirements if applicable | Unknown versions block support claims, not planning. |
| `skills_commands_surface` | native command/skill format, invocation name, autoload/discovery behavior | Must cover all six skills or block unsupported skills. |
| `prompt_template_surface` | file format/location, arguments, command name, expansion behavior | Required if adapter emits prompt templates. |
| `hook_event_support` | lifecycle/tool/input/session hooks, blocking ability, UI ability | Must distinguish deterministic gates from advisory UI prompts. |
| `subagent_capability` | built-in / extension-built / external / unsupported | No adapter may claim subagents without evidence. |
| `plan_mode_capability` | built-in / extension-built / external / unsupported | No adapter may rely on plan mode unless implemented/proven. |
| `context_file_conventions` | context file names/locations/load timing/trust behavior | Must preserve project-owned instructions and DL-20A neutrality. |
| `command_invocation_model` | slash command, CLI command, RPC/SDK prompt, JSON mode, shell command, or extension command | Must include machine-readable path where downstream automation relies on it. |
| `generated_files` | exact generated file families, ownership, trust/security implications | Required before `I-15` writes starter assets. |
| `package_distribution` | local files, npm/git package, project-local install, user-global install | Must identify install/update/trust behavior. |
| `security_trust` | project trust prompt, extension execution, package execution, protected paths, command policy | Must coordinate with `DL-22`; no destructive default. |
| `capability_flags` | booleans/enums for skills, prompts, hooks, tools, subagents, context, RPC/SDK, UI, packages | Consumers must branch on flags, never name heuristics. |
| `real_boundary_witness` | producer/carrier/consumer proof and status | Required for closure of implementation lanes. |

### v1 compatibility/capability matrix

| Harness | v1 disposition | Skills/commands | Prompts | Hooks/events | Subagents | Context files | Invocation/API | Generated files | Evidence status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pi` | v1 first target; implementation owned by `I-14` | known: skills load from documented locations and expose `/skill:name` | known: `.pi/prompts/*.md` and global/package prompts expose slash commands | known: TypeScript extensions register commands/tools and subscribe to events | known limitation: not built in; extension/package-built only | known: `AGENTS.md`/`CLAUDE.md` and system prompt files | known: interactive, `-p`, JSON, RPC, SDK | known families listed below | known for design; runtime proof pending `I-14` |
| `claude-code` | planned/deferred | unknown except pi can optionally load Claude skills directories when configured | unknown | unknown | unknown | unknown | unknown | deferred | deferred; future owner must supply authoritative docs |
| `codex` | planned/deferred | unknown except pi can optionally load Codex skills directories when configured | unknown | unknown | unknown | unknown | unknown | deferred | deferred; future owner must supply authoritative docs |
| `opencode` | planned/deferred | unknown | unknown | unknown | unknown | unknown | unknown | deferred | deferred; local pi docs mention OpenCode providers, not OpenCode harness asset semantics |
| later integrations | deferred | unknown | unknown | unknown | unknown | unknown | unknown | deferred | future decision/research required |

Adapter manifests must also carry these version-compatibility fields:

| Harness | `harness_version_range` | `resource_format_version` | `runtime_requirements` | `compatibility_evidence` |
| --- | --- | --- | --- | --- |
| `pi` | unknown until `I-14` records actual installed `pi` version/range | Agent Skills standard plus pi-specific skill/template/extension/package docs; exact generated manifest schema deferred to `DL-02`/`DL-03` | Node/TypeScript extension runtime and pi project trust behavior per pi docs; exact package runtime captured by `I-14` | known docs/examples available; live compatibility pending real boundary |
| `claude-code` | unknown | unknown | unknown | deferred/blocked |
| `codex` | unknown | unknown | unknown | deferred/blocked |
| `opencode` | unknown | unknown | unknown | deferred/blocked |
| later integrations | unknown | unknown | unknown | deferred |

## Pi v1 integration decision

The pi adapter is the only v1-supported adapter target from this decision. It must be implemented as a native pi resource producer, not as a text-only compatibility shim.

### Pi mechanisms to use

1. **Skills**: Generate or package Agent Skills-compatible `SKILL.md` assets for the six core skills. Pi documents global, project, package, settings, and CLI skill loading, including `.pi/skills/`, `.agents/skills/`, `~/.pi/agent/skills/`, `~/.agents/skills/`, package `skills/`, and `--skill`. Skills register as `/skill:name` commands.
2. **Prompt templates**: Generate `.pi/prompts/*.md` prompt templates when a skill requires a reusable slash-command prompt or argument expansion. Pi templates use Markdown frontmatter, filename-derived command names, positional arguments, and non-recursive `.pi/prompts` discovery.
3. **Extensions**: Generate optional `.pi/extensions/**` TypeScript extensions for native commands, tools, hooks/events, permission gates, protected-path policies, resource discovery, system-prompt customization, subagent orchestration, or plan-mode-like behavior.
4. **Pi packages**: If distribution as a reusable package is needed, emit a pi package manifest in `package.json` with `pi.extensions`, `pi.skills`, `pi.prompts`, and optional `pi.themes`. Package install/update/trust behavior must be explicit.
5. **Context files**: Generate project context through `AGENTS.md` and, when appropriate for cross-harness compatibility, `CLAUDE.md`. Pi loads matching context files from global/parent/current locations; project-local dynamic settings/resources require trust.
6. **CLI modes**: Use interactive mode for user operation, `pi -p`/`--print` for one-shot prompts, `--mode json` for event-stream observation, and `--mode rpc` for process integration.
7. **RPC/SDK**: Use `get_commands` through RPC or `pi.getCommands()`/`DefaultResourceLoader` through SDK/extension APIs as the preferred real-boundary observation point for generated skills/templates/extensions.
8. **TUI/UI**: Custom UI is optional and must be extension-owned. UI claims must cite `docs/tui.md` and degrade explicitly in non-TUI modes.

### Pi generated-file families

`I-14` and `I-15` may refine exact filenames only after `DL-02`, `DL-03`, and `DL-07` are green, but they must stay within these families:

- `.pi/skills/<skill>/SKILL.md` and/or `.agents/skills/<skill>/SKILL.md` for project-local six-skill assets.
- `.pi/prompts/<name>.md` for reusable pi prompt templates.
- `.pi/extensions/<name>.ts` or `.pi/extensions/<name>/index.ts` for commands, tools, hooks, plan-mode/subagent behavior, permission/path gates, or dynamic resource discovery.
- optional pi package `package.json` manifest containing a `pi` key for shareable resources.
- `AGENTS.md` and, if downstream compatibility requires, `CLAUDE.md` for context conventions.
- generated harness config fields recording `agenticHarness: pi` and adapter capability/version metadata.

### Explicit pi limitations

- Pi does **not** ship built-in subagents or built-in plan mode. Pi's README and examples show these as extension/package-built capabilities. Therefore v1 may only expose subagent or plan-mode behavior through generated extensions/packages whose real execution is proven.
- Project-local `.pi` resources load only after project trust; non-interactive modes rely on `defaultProjectTrust` or `--approve`/`--no-approve`. Adapter tests must account for trust instead of assuming resources load silently.
- Pi packages/extensions run with system permissions. Security policy and destructive-command behavior coordinate with `DL-22`; DL-06 only requires explicit capability/trust fields.
- Pi skill validation is lenient for many standard violations and does not load skills missing descriptions. Adapter output must be strict even if pi would warn-and-load.

## Other harness disposition

| Harness | Disposition | Rationale | Blocked dependents |
| --- | --- | --- | --- |
| Claude Code | planned/deferred | No local authoritative Claude Code harness docs were provided. Pi docs only state pi can load skills from Claude skill directories when configured; that does not prove Claude Code generation semantics. | Any Claude Code adapter package, create choice marked ready, or generated Claude-specific assets. |
| Codex | planned/deferred | No local authoritative Codex harness docs were provided. Pi docs only state pi can load Codex skill directories when configured; that does not prove Codex generation semantics. | Any Codex adapter package, create choice marked ready, or generated Codex-specific assets. |
| OpenCode | planned/deferred | Local pi docs list OpenCode providers for model access, not OpenCode harness resource/command semantics. | Any OpenCode adapter package, create choice marked ready, or generated OpenCode-specific assets. |
| Later integrations | deferred | Must be researched by a future decision or implementation-planning lane with authoritative docs and real-boundary witness design. | Any later adapter implementation or selectable ready create option. |

No decision here forbids later support. It only forbids unsupported v1 parity claims.

## Dependencies and prerequisites

```yaml
dependencies:
  depends_on:
    - id: DL-24A-planning-output-discipline
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies required decision schema, dependency declaration, evidence, validation, real-boundary, and dirty-tree policy.
    - id: DL-20A-domain-neutrality-foundation
      type: decision
      required_status: LOCKED/PASS
      rationale: Supplies core/extension/sample-demo boundary and domain-neutrality checklist.
    - id: source-docs
      type: source_doc
      required_status: AVAILABLE
      rationale: README, locked decisions, verification layer, mechanical gates, planning backlog, strategy, and playbook define harness goals and constraints.
    - id: pi-docs-and-examples
      type: source_doc
      required_status: AVAILABLE
      rationale: Pi-specific claims must cite actual pi skills/extensions/prompts/packages/context/CLI/RPC/SDK/TUI documentation and examples.
  blocks:
    - id: I-14-pi-adapter-skill-consumption
      reason: Needs pi-first target, generated-file families, capability matrix, and real-boundary witness contract.
    - id: I-15-create-import-starter-UX
      reason: Needs `agenticHarness` selection semantics, adapter support gating, and generated integration asset families.
    - id: generated-skills-and-commands
      reason: Need common adapter abstraction and pi surface mapping before generated assets can be declared harness-compatible.
    - id: later adapter implementations
      reason: Need capability matrix entries and evidence status for each harness.
  blocked_dependents:
    - id: I-14-pi-adapter-skill-consumption
      blocked_until: DL-02, DL-03, DL-05, DL-07, DL-10 coordination is sufficient for implementation, and I-14 can run the pi real-boundary proof.
      relying_on: pi adapter resource families, capability flags, six-skill mapping, and real-boundary proof contract.
    - id: I-15-create-import-starter-UX
      blocked_until: DL-06 plus create/starter dependencies DL-02/DL-07/DL-08/DL-09/DL-10/DL-16/DL-17 are green as required by strategy.
      relying_on: `agenticHarness` config semantics and selectable adapter support status.
    - id: non-pi adapter packages
      blocked_until: future evidence-backed decision/refinement supplies authoritative harness docs and witness contracts.
      relying_on: non-pi resource formats and runtime consumers.
  required_before_finalizing:
    - id: I-14-pi-adapter-skill-consumption
      required_content: Actual pi-compatible generated files loaded/observed by pi runtime/loader/executor, not a hand-rolled parser.
    - id: I-15-create-import-starter-UX
      required_content: Actual create/import path writes selected `agenticHarness` and generated integration assets without unsupported selections or forbidden prompts.
    - id: generated skills
      required_content: DL-03 skill protocols and DL-02 schemas consumed by generated pi resources.
    - id: adapter CLI invocation
      required_content: DL-07 machine-readable CLI contracts for any command path an adapter calls.
    - id: verification/failure routing
      required_content: DL-05/DL-10 policy for registry/meta-agent and failure routing integration.
    - id: security/trust behavior
      required_content: DL-22 policy before destructive hooks, permission gates, or package trust defaults finalize.
  deferrals:
    - deferred_question: Exact artifact schemas, skill protocol schemas, CLI output contracts, registry/failure routing, and security policy.
      rationale: Owned by DL-02, DL-03, DL-05, DL-07, DL-10, and DL-22; DL-06 only records integration consequences.
      future_owner: DL-02/DL-03/DL-05/DL-07/DL-10/DL-22
      allowed_now: true
      blocked_dependents:
        - implementation details in I-14/I-15/generated skills that rely on those schemas or policies
      invalid_if_any_dependent_relies: true
    - deferred_question: Claude Code, Codex, OpenCode, and later harness generated-resource semantics.
      rationale: No local authoritative docs were supplied for those harnesses.
      future_owner: future adapter research/decision lane before each non-pi implementation
      allowed_now: true
      blocked_dependents:
        - non-pi adapter packages
        - ready create selection for non-pi harnesses
      invalid_if_any_dependent_relies: true
  owned_write_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-06-agentic-harness-integrations.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-06-agentic-harness-integrations/**
  read_only_paths:
    - /Users/lizavasilyeva/work/harness-starter/** source docs and orchestration artifacts
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md
    - /Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24A-planning-output-discipline/**
    - /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20A-domain-neutrality-foundation/**
    - /Users/lizavasilyeva/work/vibe-engineer/** inventory outside DL-06 owned paths
    - /usr/local/lib/node_modules/@earendil-works/pi-coding-agent/**
  untouchable_paths:
    - /Users/lizavasilyeva/work/vibe-engineer/.git/**
    - package source paths
    - root config files
    - CI files
    - generated starter files
    - adapter packages
    - .pi runtime config
    - any decision/report path not owned by DL-06
  handoff_notes:
    - from: DL-06
      to: I-14-pi-adapter-skill-consumption
      condition: Implement pi adapter in packages/adapters/pi/** and examples/harness-integrations/pi/** using this matrix and later green DL-02/DL-03/DL-05/DL-07/DL-10/DL-22 constraints.
      shared_path_policy: disjoint
    - from: DL-06
      to: I-15-create-import-starter-UX
      condition: Use `agenticHarness` config and adapter support status for create/import UX and generated starter fixtures.
      shared_path_policy: disjoint
```

## Blocked dependents

- `I-14-pi-adapter-skill-consumption`: blocked until it can implement under its owned paths and run the pi real-boundary witness.
- `I-15-create-import-starter-UX`: blocked from claiming a ready non-pi choice until adapter evidence exists; blocked from final create behavior until its own dependencies are green.
- Generated skills/commands: blocked from final file format until `DL-02`, `DL-03`, and `DL-07` are green.
- Non-pi adapters: blocked until future evidence-backed decisions define their native mechanisms and real-boundary proofs.

## Verification/witness consequences

- deterministic checks affected: adapter manifest/capability validation, generated-file family validation, create-choice support gating, skill/command registry validation, security/trust checks, and future docs consistency checks.
- positive witnesses required downstream:
  - `I-14`: generated pi skill/template/extension assets exist in lane-owned fixtures and are observed by actual pi mechanisms such as RPC `get_commands`, `pi -p`/`--mode json`, or SDK/ResourceLoader command/resource APIs.
  - `I-14`: all six skills are present or an unsupported skill blocks with evidence; pi project trust is handled intentionally.
  - `I-15`: create/import persists selected `agenticHarness`, writes only supported generated integration assets, and includes brief/no-brief create paths.
- negative witnesses required downstream:
  - `I-14`: malformed skill frontmatter, missing description, invalid extension command/tool schema, or untrusted project-local resource is rejected or blocked with explicit evidence.
  - `I-14`: shape-only parsing of generated files is rejected as final proof.
  - `I-15`: unsupported non-pi harness selection cannot be silently accepted as working; no stack preset, max-parallel, or separate bootstrap prompt is introduced.
- regression witnesses required downstream:
  - product/package/CLI remains `vibe-engineer`;
  - six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`;
  - `agenticHarness` remains a create/config concept;
  - pi adapter remains routed to `I-14`; create/import/starter boundary remains routed to `I-15`;
  - no production implementation is authorized by DL-06.
- real_boundary_required: yes for `I-14`, no live runtime seam created by this decision artifact.
- real_boundary_status: required_before_closure for `I-14`; not proven by DL-06.
- if no live seam: this artifact is a decision document and writes no adapter code or generated assets.

### I-14 real-boundary contract

Required actual seam:

- Producer: actual pi adapter generator/implementation in `packages/adapters/pi/**`.
- Carrier: generated pi-compatible files in lane-owned paths, such as skill `SKILL.md` directories, prompt templates, extension files, context files, or package manifests.
- Consumer: actual pi runtime/loader/executor path, not a hand-rolled parser.

Acceptable proof candidates for `I-14` to lock or refine:

- `pi --mode rpc get_commands` observes generated skill/template/extension commands with provenance.
- `pi -p` or `--mode json` loads an explicit generated skill/template/extension and emits expected events.
- SDK `DefaultResourceLoader`/`createAgentSession` observes generated skills/templates/context files and `pi.getCommands()`/RPC command listing matches expected assets.
- A generated extension command/tool is callable and returns schema-valid output.

If live pi execution is unavailable in `I-14`, that lane must close `pending-live/BLOCKED`; a mock loader or synthetic parser cannot declare truth-green.

## Ownership/path consequences

- owned_write_paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-06-agentic-harness-integrations.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-06-agentic-harness-integrations/**`
- read_only_paths:
  - all cited source docs, prerequisite decisions/reports, pi docs/examples, and target inventory outside DL-06 owned paths.
- untouchable_paths:
  - `.git/**`, package source, root configs, CI files, generated starter files, adapter packages, `.pi` runtime config, and non-owned decisions/reports.
- serialized/shared ownership notes: none for DL-06 writes. Future implementation lanes own adapter/source/create paths under strategy ownership.

## Domain-neutrality check

- DL-20A status consulted: green (`LOCKED`/PASS).
- governed surfaces affected: decision artifact and future adapter abstractions; no production code generated.
- surface classification: core harness integration rules are core and must be domain-neutral; consuming-project harness extensions may carry project-specific content only at extension boundaries; pi examples are technical examples, not business-domain defaults.
- allowed generic terms used: skill, command, prompt, extension, adapter, context file, artifact, registry, provider, runner, evidence, harness, package, schema, CLI, RPC, SDK.
- project/business terms mentioned: none as defaults; DL-20A forbidden examples remain prohibited for core adapters.
- result: PASS. No core adapter rule encodes ecommerce, inventory, fashion, Billz, Telegram, Instagram, or any consuming-project business model.

## Dirty-tree safety

- unrelated dirty work assumed: yes.
- git stash/reset/clean/checkout/restore used: no.
- writes limited to owned paths: yes.
- conflicts discovered: none for the DL-06 decision artifact. Target inventory showed other parallel decision work directories, but no visible `docs/decisions/DL-06-agentic-harness-integrations.md` before this artifact and no non-owned write was made.

## Deferral rationale

This decision is `LOCKED`; specific subquestions are explicitly deferred and blocked where dependents would rely on them.

- deferred_question: non-pi harness generated-resource semantics and compatibility.
- reason_now: no local authoritative docs for Claude Code, Codex, or OpenCode harness resource formats were supplied; inventing parity would violate evidence rules.
- future_owner: future adapter research/decision lane before each non-pi implementation.
- required_before_finalizing: any non-pi adapter package, ready create selection, or generated non-pi integration asset.
- blocked_dependents: non-pi adapter implementations and selectable non-pi ready create options.
- proof_no_dependent_relies_now: v1 first implementation is pi through `I-14`; non-pi rows are marked planned/deferred and cannot unblock implementation.

## Evidence checklist

1. Report artifact was created first and updated after each stage.
2. Source files inspected are listed in the report and cited above by path/section.
3. Files changed are this decision artifact and the DL-06 execution report only.
4. No production/package/root/config/CI/generated starter files were touched.
5. This artifact produces exactly one output class: `locked_decision_document`.
6. Dependencies, blocked dependents, required sequencing, deferrals, ownership, read-only, untouchable, and handoff fields use the DL-24A dependency declaration format.
7. Deferred non-pi support cannot be relied on by dependents; affected dependents are blocked.
8. Positive, negative, and regression witnesses are stated for `I-14` and `I-15`.
9. Real-boundary status is stated: required for `I-14`, not proven by DL-06.
10. Ownership/path consequences are explicit and dirty-tree-safe.
11. Domain-neutrality check applies DL-20A.
12. Locked decisions remain uncontradicted: `vibe-engineer`, two-repo direction, six skills, artifact flow, `agenticHarness` create/config concept, automatic build/ship verification/context, mechanical gate families, and no push/PR without approval.
13. Downstream dependents cannot finalize without the required adapter evidence and later schema/protocol/security decisions.
14. Validator checklist and severity policy are included below.

## Validation plan and severity policy

Independent Triad-B validation must inspect the actual DL-06 decision artifact and execution report, plus visible inventory/diff evidence available without destructive git operations.

### Positive witnesses

- Artifact exists at `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-06-agentic-harness-integrations.md` and uses DL-24A-compatible schema with exactly one output class.
- Pi first is accepted and cites actual pi skills, extensions, prompts, packages, context files, CLI modes, RPC/SDK, JSON, TUI docs, and examples.
- Common adapter abstraction and compatibility matrix are concrete enough for `I-14` and `I-15` planning.
- Dependencies on `DL-02`, `DL-03`, `DL-05`, `DL-07`, `DL-10`, and `DL-22` are coordination dependencies, not falsely locked schema/protocol/security details.
- `I-14` real-boundary contract requires actual pi loader/executor consumption.
- DL-20A checklist is applied.

### Negative witnesses

- A pi support claim without cited pi docs/examples is not green.
- A non-pi support claim without authoritative harness evidence is rejected or must be marked deferred/blocked.
- A hand-rolled parser or shape-only file inspection is rejected as final `I-14` proof.
- Silent no-op fallback for unsupported harness features is rejected.
- Business-domain vocabulary in core adapter abstractions is rejected unless clearly source-cited negative/sample/demo content per DL-20A.

### Regression witnesses

- Product/package/CLI remains `vibe-engineer`.
- Six skills remain `brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`.
- Create UX still asks default agentic harness and optional brief only; it does not ask stack preset, max parallel agents, or separate bootstrap/skip-bootstrap.
- Pi adapter remains routed to `I-14`; create/import/starter boundary remains routed to `I-15`.
- No production implementation is authorized by DL-06.
- DL-24A and DL-20A are not contradicted; DL-20B/DL-24B remain later audits.

### Sibling/blast-radius checks

- Check strategy §§4–11 and §§17–19 for consistency.
- Check source docs and pi docs/examples cited are accurately represented.
- Check no package source, root config, CI, generated starter, git metadata, adapter package, `.pi` runtime config, or non-owned decision/report file was edited.
- Check future owner references match strategy ownership: `I-14` owns `packages/adapters/pi/**` and `examples/harness-integrations/pi/**`; `I-15` owns create/import/starter fixture paths.

### Severity policy

- `critical`: out-of-license write; missing DL-24A/DL-20A dependency; false live-proof closure; unsupported silent fallback; contradiction of pi-first strategy without evidence; missing adapter abstraction; missing real-boundary witness contract; domain-neutrality violation.
- `major-local`: incomplete matrix, unclear dependency mapping, incomplete pi citations, or weak validator witnesses repairable within DL-06 paths.
- `minor-local`: citation/wording issue that does not weaken gates.
- `clean`: all requirements satisfied.

## Known ambiguities / future owners

- Exact artifact schemas are owned by `DL-02`.
- Exact skill protocols and handoff contracts are owned by `DL-03`.
- Registry/meta-agent policy is owned by `DL-05`.
- CLI primitive and machine-readable output contracts are owned by `DL-07`.
- Verification/failure routing is owned by `DL-10`.
- Security/trust/destructive-command policy is owned by `DL-22`.
- Non-pi harness support requires future authoritative docs and witness contracts before implementation.
- `I-14` must refine and run the live pi proof; `I-15` must prove create/import and selected `agenticHarness` behavior through actual generated fixtures.
