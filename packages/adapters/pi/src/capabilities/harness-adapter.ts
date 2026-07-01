import type { EvidenceRecord } from "../schema/index.ts";

export const HARNESS_ADAPTER_CONTRACT_SCHEMA_VERSION = "vibe-harness-adapter-contract/v1" as const;
export const HARNESS_GENERATED_FILE_MANIFEST_SCHEMA_VERSION =
  "vibe-harness-generated-file-manifest/v1" as const;
export const HARNESS_ADAPTER_REGISTRY_SCHEMA_VERSION = "vibe-harness-adapter-registry/v1" as const;

export const SUPPORTED_HARNESS_ADAPTER_IDS = ["pi", "claude-code", "codex"] as const;
export type HarnessAdapterId = (typeof SUPPORTED_HARNESS_ADAPTER_IDS)[number];

export type HarnessCapabilitySupport = "ready" | "blocked" | "unsupported" | "pending-live";
export type HarnessUnsupportedFeaturePolicy = "block";
export type HarnessContextFile = "AGENTS.md" | "CLAUDE.md";

export interface HarnessCapabilityDeclaration {
  readonly support: HarnessCapabilitySupport;
  readonly evidence: EvidenceRecord;
  readonly summary: string;
  readonly downstreamConsequence: string;
}

export interface HarnessCapabilityMatrix {
  readonly schemaVersion: typeof HARNESS_ADAPTER_CONTRACT_SCHEMA_VERSION;
  readonly adapterId: HarnessAdapterId;
  readonly displayName: string;
  readonly capabilities: {
    readonly contextFiles: HarnessCapabilityDeclaration;
    readonly nativeSkills: HarnessCapabilityDeclaration;
    readonly promptTemplates: HarnessCapabilityDeclaration;
    readonly hooks: HarnessCapabilityDeclaration;
    readonly subagents: HarnessCapabilityDeclaration;
    readonly planMode: HarnessCapabilityDeclaration;
    readonly invocation: HarnessCapabilityDeclaration;
    readonly structuredOutput: HarnessCapabilityDeclaration;
    readonly verificationRunner: HarnessCapabilityDeclaration;
  };
}

export interface HarnessGeneratedFileFamily {
  readonly familyId: string;
  readonly pathPatterns: readonly string[];
  readonly support: HarnessCapabilitySupport;
  readonly producedByLane: "I-15A-create-import-cli-ux-selected-harness" | "future-adapter-lane";
  readonly writer: "writeGeneratedArtifacts" | "writePiHarnessAssets" | "future-runner" | "none";
  readonly reason: string;
  readonly evidence: EvidenceRecord;
}

export interface HarnessGeneratedFileManifest {
  readonly schemaVersion: typeof HARNESS_GENERATED_FILE_MANIFEST_SCHEMA_VERSION;
  readonly adapterId: HarnessAdapterId;
  readonly adapterCapabilityVersion: typeof HARNESS_ADAPTER_CONTRACT_SCHEMA_VERSION;
  readonly families: readonly HarnessGeneratedFileFamily[];
}

export interface HarnessAssetWriterPlan {
  readonly strategy: "pi-native-assets-and-context" | "claude-context-only" | "codex-context-only";
  readonly contextFiles: readonly HarnessContextFile[];
  readonly nativeAssetFamilies: readonly string[];
  readonly blockedAssetFamilies: readonly string[];
  readonly unsupportedFeaturePolicy: HarnessUnsupportedFeaturePolicy;
  readonly noFallbackToPi: true;
}

export interface HarnessInvocationModel {
  readonly binary: "pi" | "claude" | "codex";
  readonly nonInteractiveCommand: readonly string[];
  readonly interactiveCommand: readonly string[];
  readonly projectRootFlag: string | null;
  readonly requiresGitRepository: boolean;
  readonly missingRuntimeDiagnostic: string;
  readonly evidence: EvidenceRecord;
}

export interface HarnessStructuredOutputStrategy {
  readonly strategy:
    | "json-event-parse-and-adapter-validation"
    | "native-json-schema"
    | "native-output-schema";
  readonly schemaFlag: string | null;
  readonly finalMessageCarrier: string;
  readonly failClosedWhenMissing: true;
  readonly evidence: EvidenceRecord;
}

export interface HarnessVerificationRunnerInvocation {
  readonly recommendedCommand: readonly string[];
  readonly defaultPermissionMode: string;
  readonly expectedStructuredOutput: HarnessStructuredOutputStrategy["strategy"];
  readonly unavailableRuntimeBehavior: "blocked-missing-prerequisite";
  readonly evidence: EvidenceRecord;
}

export interface HarnessSecurityTrustPolicy {
  readonly projectTrustRequired: boolean;
  readonly projectContextAutoload: readonly HarnessContextFile[];
  readonly sandbox: string;
  readonly permissionModel: string;
  readonly credentials: "no-credentials-required" | "operator-auth-required";
  readonly destructiveOperations: "forbidden" | "approval-required";
  readonly externalIntegrations: "disabled-by-default" | "unknown-blocked";
  readonly trustBoundary: string;
  readonly evidence: EvidenceRecord;
}

export interface HarnessUnsupportedFeatureBehavior {
  readonly policy: HarnessUnsupportedFeaturePolicy;
  readonly diagnosticCode: "UNSUPPORTED_HARNESS_FEATURE";
  readonly message: string;
  readonly blockedFamilies: readonly string[];
}

export interface HarnessWitnessPlan {
  readonly configWitnesses: readonly string[];
  readonly createWitnesses: readonly string[];
  readonly importWitnesses: readonly string[];
  readonly negativeWitnesses: readonly string[];
  readonly liveRuntimeWitness: "not-run" | "pending-live";
}

export type HarnessHandoffStepId = "task" | "plan" | "build" | "ship";

export interface HarnessHandoffInstruction {
  readonly stepId: HarnessHandoffStepId;
  readonly inputArtifact: string;
  readonly outputArtifact: string;
  readonly nativeCommand: string | null;
  readonly promptInstruction: string;
  readonly persistenceRule: string;
  readonly handoffRule: string;
  readonly unsupportedNativeAssetNote: string | null;
}

export interface HarnessRuntimePrerequisiteDiagnostic {
  readonly diagnosticCode: "HARNESS_RUNTIME_UNAVAILABLE";
  readonly classification: "missing_prerequisite";
  readonly binary: HarnessInvocationModel["binary"];
  readonly versionCommand: readonly string[];
  readonly authPrerequisite: string;
  readonly liveProbePolicy: "not-run-by-create-import";
  readonly unavailableRuntimeBehavior: HarnessVerificationRunnerInvocation["unavailableRuntimeBehavior"];
  readonly message: string;
  readonly missingBinaryMessage: string;
  readonly missingAuthMessage: string;
  readonly noFallbackToPi: true;
}

export interface HarnessAdapter {
  readonly id: HarnessAdapterId;
  readonly displayName: string;
  readonly capabilityMatrix: HarnessCapabilityMatrix;
  readonly generatedFileManifest: HarnessGeneratedFileManifest;
  readonly assetWriter: HarnessAssetWriterPlan;
  readonly invocationModel: HarnessInvocationModel;
  readonly structuredOutput: HarnessStructuredOutputStrategy;
  readonly verificationRunnerInvocation: HarnessVerificationRunnerInvocation;
  readonly securityTrustPolicy: HarnessSecurityTrustPolicy;
  readonly unsupportedFeatureBehavior: HarnessUnsupportedFeatureBehavior;
  readonly handoffInstructions: readonly HarnessHandoffInstruction[];
  readonly runtimePrerequisiteDiagnostic: HarnessRuntimePrerequisiteDiagnostic;
  readonly witnessPlan: HarnessWitnessPlan;
  readonly createImportSelectable: true;
}

const known = (source: string, notes: string): EvidenceRecord => ({
  state: "known",
  source,
  notes,
});

const blocked = (source: string, notes: string): EvidenceRecord => ({
  state: "blocked",
  source,
  notes,
});

const capability = (
  support: HarnessCapabilitySupport,
  evidence: EvidenceRecord,
  summary: string,
  downstreamConsequence: string,
): HarnessCapabilityDeclaration => ({ support, evidence, summary, downstreamConsequence });

const family = (
  familyId: string,
  pathPatterns: readonly string[],
  support: HarnessCapabilitySupport,
  producedByLane: HarnessGeneratedFileFamily["producedByLane"],
  writer: HarnessGeneratedFileFamily["writer"],
  reason: string,
  evidence: EvidenceRecord,
): HarnessGeneratedFileFamily => ({
  familyId,
  pathPatterns,
  support,
  producedByLane,
  writer,
  reason,
  evidence,
});

const handoffStep = (
  stepId: HarnessHandoffStepId,
  inputArtifact: string,
  outputArtifact: string,
  nativeCommand: string | null,
  promptInstruction: string,
  persistenceRule: string,
  handoffRule: string,
  unsupportedNativeAssetNote: string | null,
): HarnessHandoffInstruction => ({
  stepId,
  inputArtifact,
  outputArtifact,
  nativeCommand,
  promptInstruction,
  persistenceRule,
  handoffRule,
  unsupportedNativeAssetNote,
});

const handoffInstructionsFor = (
  adapterId: HarnessAdapterId,
): readonly HarnessHandoffInstruction[] => {
  const native = (stepId: HarnessHandoffStepId): string | null =>
    adapterId === "pi" ? `/skill:${stepId}` : null;
  const unsupportedNote =
    adapterId === "pi"
      ? null
      : "No evidenced generated project-local native skill/command asset exists for this harness; use prompt-level instructions and persisted artifacts instead of inventing .pi/.claude/.codex commands.";
  return [
    handoffStep(
      "task",
      "raw-intent",
      "work-brief",
      native("task"),
      "Normalize exactly one operator request into a Work Brief before planning.",
      "Persist .vibe/work/<work-id>/raw-intent.md when needed and .vibe/work/<work-id>/work-brief.json as the durable output.",
      "Hand exactly one Work Brief to plan; do not produce implementation-plan, build-result, or ship-packet in task.",
      unsupportedNote,
    ),
    handoffStep(
      "plan",
      "work-brief",
      "implementation-plan-with-verification-delta",
      native("plan"),
      "Consume one Work Brief and produce one Implementation Plan with embedded Verification Delta.",
      "Persist .vibe/work/<work-id>/implementation-plan.json; keep status draft until explicit operator approval.",
      "Hand an approved persisted plan to build; do not execute build or ship work from plan.",
      unsupportedNote,
    ),
    handoffStep(
      "build",
      "approved-implementation-plan",
      "build-result",
      native("build"),
      "Implement only the approved plan scope and record deterministic evidence references.",
      "Persist .vibe/work/<work-id>/build-result.json with changed files, evidence refs, and any blockers.",
      "Hand the Build Result plus evidence to ship; do not claim release readiness without the persisted packet.",
      unsupportedNote,
    ),
    handoffStep(
      "ship",
      "build-result",
      "ship-packet",
      native("ship"),
      "Review Build Result evidence and prepare a release/merge handoff packet without inventing missing proofs.",
      "Persist .vibe/work/<work-id>/ship-packet.json with release notes, risks, and final evidence links.",
      "Stop if required evidence is missing; do not push, deploy, or open external PRs unless explicitly authorized outside create/import.",
      unsupportedNote,
    ),
  ];
};

const runtimePrerequisiteDiagnostic = (
  binary: HarnessInvocationModel["binary"],
  displayName: string,
  message: string,
): HarnessRuntimePrerequisiteDiagnostic => ({
  diagnosticCode: "HARNESS_RUNTIME_UNAVAILABLE",
  classification: "missing_prerequisite",
  binary,
  versionCommand: [binary, "--version"],
  authPrerequisite:
    "Operator-managed local CLI authentication/subscription is required before any live model/runtime invocation; create/import do not perform auth probes.",
  liveProbePolicy: "not-run-by-create-import",
  unavailableRuntimeBehavior: "blocked-missing-prerequisite",
  message,
  missingBinaryMessage: `${displayName} binary '${binary}' is required for live harness runs; install it or select a supported installed harness explicitly. No Pi fallback is allowed.`,
  missingAuthMessage: `${displayName} authentication/subscription is required for live harness runs; authenticate the '${binary}' CLI before invoking a live runner. No Pi fallback is allowed.`,
  noFallbackToPi: true,
});

const piEvidence = known(
  "extract-harness-cli-evidence + existing @vibe-engineer/adapter-pi manifests",
  "Pi 0.80.2 local help and the existing Pi adapter prove AGENTS.md/CLAUDE.md, .pi skills, .pi prompt templates, JSON event mode, RPC, and project-trust semantics; built-in subagents and plan mode remain blocked.",
);
const claudeEvidence = known(
  "extract-harness-cli-evidence: claude --help / agents / plugin init",
  "Claude Code 2.1.197 help proves CLAUDE.md auto-discovery, print mode, JSON/stream-json output, --json-schema, --agents, permission modes, hooks/plugins, and safe/bare mode; project-local skill/plugin/command paths are not proven.",
);
const codexEvidence = known(
  "extract-harness-cli-evidence: codex help / exec help / debug prompt-input",
  "Codex CLI 0.142.4 help and debug prompt-input prove AGENTS.md auto-loading, codex exec JSONL events, --output-schema, --output-last-message, sandbox/approval flags, plugins/MCP, and unproven project-local skill/plugin paths.",
);

const piBlockedEvidence = blocked(
  "existing Pi adapter capability matrix",
  "Pi extension/package, built-in subagent, and built-in plan-mode generation require separate live runtime and security proof.",
);
const claudeBlockedEvidence = blocked(
  "extract-harness-cli-evidence unsupported Claude Code surfaces",
  "Project-local Claude Code skills, plugins, custom commands, hooks, MCP config, and generated agent JSON are not generated until a later adapter lane proves exact discovery/trust semantics.",
);
const codexBlockedEvidence = blocked(
  "extract-harness-cli-evidence unsupported Codex surfaces",
  "Project-local Codex skills, plugins, hooks, MCP config, and prompt-template formats are not generated until exact discovery/trust semantics are proven.",
);

const piCapabilities: HarnessCapabilityMatrix = {
  schemaVersion: HARNESS_ADAPTER_CONTRACT_SCHEMA_VERSION,
  adapterId: "pi",
  displayName: "Pi Coding Agent",
  capabilities: {
    contextFiles: capability(
      "ready",
      piEvidence,
      "Pi project context uses AGENTS.md and optional CLAUDE.md.",
      "Create/import may emit the existing Pi context files.",
    ),
    nativeSkills: capability(
      "ready",
      piEvidence,
      "Agent Skills-compatible .pi/skills/<skill>/SKILL.md resources expose the six skills.",
      "Create/import may copy validated Pi skill templates through writePiHarnessAssets.",
    ),
    promptTemplates: capability(
      "ready",
      piEvidence,
      ".pi/prompts/*.md prompt templates are evidenced.",
      "Create/import may copy validated Pi prompt templates through writePiHarnessAssets.",
    ),
    hooks: capability(
      "blocked",
      piBlockedEvidence,
      ".pi/extensions hooks are executable and intentionally not generated by create/import.",
      "Hook/extension generation must block until a later security/runtime lane proves it.",
    ),
    subagents: capability(
      "blocked",
      piBlockedEvidence,
      "Pi has no built-in subagent surface in current evidence.",
      "Subagent-dependent generation must block instead of falling back.",
    ),
    planMode: capability(
      "blocked",
      piBlockedEvidence,
      "Pi has no built-in plan mode in current evidence.",
      "Plan-mode behavior must be prompt/extension-built only after separate proof.",
    ),
    invocation: capability(
      "ready",
      piEvidence,
      "Use pi --approve --no-session --mode json -p for future non-interactive witnesses.",
      "Automation must parse JSON events and fail closed on missing final evidence.",
    ),
    structuredOutput: capability(
      "ready",
      piEvidence,
      "Pi has JSON event/RPC carriers but no CLI JSON Schema final-response flag.",
      "Structured output requires adapter-side event parsing and schema validation.",
    ),
    verificationRunner: capability(
      "pending-live",
      piEvidence,
      "Recommended future runner is pi --approve --no-session --mode json -p <prompt>.",
      "Missing binary/auth/unparseable output must produce a blocked missing-prerequisite result.",
    ),
  },
};

const claudeCapabilities: HarnessCapabilityMatrix = {
  schemaVersion: HARNESS_ADAPTER_CONTRACT_SCHEMA_VERSION,
  adapterId: "claude-code",
  displayName: "Claude Code",
  capabilities: {
    contextFiles: capability(
      "ready",
      claudeEvidence,
      "Claude Code help directly evidences CLAUDE.md auto-discovery.",
      "Create/import may emit CLAUDE.md for Claude Code without Pi fallback.",
    ),
    nativeSkills: capability(
      "blocked",
      claudeBlockedEvidence,
      "Skills exist, but project-local generated skill discovery paths are not proven by the current evidence.",
      "Do not emit .claude or plugin skill trees until a future proof supplies exact semantics.",
    ),
    promptTemplates: capability(
      "blocked",
      claudeBlockedEvidence,
      "Custom commands/workflows/plugins exist, but project-local generated command formats are unproven.",
      "Prompt/command generation must block instead of guessing paths.",
    ),
    hooks: capability(
      "blocked",
      claudeBlockedEvidence,
      "Hooks/plugins are evidenced, but generated project-local hook file format/trust is unproven.",
      "Hook/plugin generation must block until a later adapter/security proof.",
    ),
    subagents: capability(
      "ready",
      claudeEvidence,
      "Claude Code exposes custom/current-session agents through --agent/--agents.",
      "Future runners may pass explicit --agents JSON; create/import does not emit unconsumed agent assets.",
    ),
    planMode: capability(
      "ready",
      claudeEvidence,
      "Claude Code permission mode includes plan.",
      "Future verification runners may request plan permission mode explicitly.",
    ),
    invocation: capability(
      "ready",
      claudeEvidence,
      "Use claude -p --output-format json --json-schema with explicit permissions for future runners.",
      "Automation should use explicit flags and fail closed for auth/runtime/settings issues.",
    ),
    structuredOutput: capability(
      "ready",
      claudeEvidence,
      "Claude Code supports --json-schema for structured final output in print mode.",
      "Future runners should rely on native schema validation and still validate adapter-side.",
    ),
    verificationRunner: capability(
      "pending-live",
      claudeEvidence,
      "Recommended future runner is claude -p --output-format json --json-schema <schema> with restricted tools.",
      "Missing binary/auth/cloud-only review/unparseable output must block.",
    ),
  },
};

const codexCapabilities: HarnessCapabilityMatrix = {
  schemaVersion: HARNESS_ADAPTER_CONTRACT_SCHEMA_VERSION,
  adapterId: "codex",
  displayName: "Codex CLI",
  capabilities: {
    contextFiles: capability(
      "ready",
      codexEvidence,
      "codex debug prompt-input showed cwd AGENTS.md injected as model-visible instructions.",
      "Create/import may emit AGENTS.md for Codex without Pi fallback.",
    ),
    nativeSkills: capability(
      "blocked",
      codexBlockedEvidence,
      "Codex skills are SKILL.md resources, but project-local discovery paths are not proven.",
      "Do not emit .codex/project skill trees until a future proof supplies exact semantics.",
    ),
    promptTemplates: capability(
      "blocked",
      codexBlockedEvidence,
      "No Codex custom slash-command prompt template format is evidenced.",
      "Prompt-template generation must block instead of guessing.",
    ),
    hooks: capability(
      "blocked",
      codexBlockedEvidence,
      "Hook trust flags exist, but generated hook file format is not evidenced.",
      "Hook generation must block until a later adapter/security proof.",
    ),
    subagents: capability(
      "unsupported",
      codexBlockedEvidence,
      "No explicit Codex subagent command is evidenced.",
      "Subagent-dependent behavior must block.",
    ),
    planMode: capability(
      "unsupported",
      codexBlockedEvidence,
      "Planning is prompt-level; no separate Codex plan mode is evidenced.",
      "Plan-mode-dependent behavior must block.",
    ),
    invocation: capability(
      "ready",
      codexEvidence,
      "Use codex exec --json --output-schema --output-last-message with sandbox/approval flags.",
      "Automation must fail closed for missing auth/runtime/git prerequisites or unparseable output.",
    ),
    structuredOutput: capability(
      "ready",
      codexEvidence,
      "codex exec supports --output-schema and --output-last-message.",
      "Future runners should use native output schema plus adapter-side validation.",
    ),
    verificationRunner: capability(
      "pending-live",
      codexEvidence,
      'Recommended future runner is codex exec -c approval_policy="never" --sandbox read-only --json --output-schema <file>.',
      "Missing binary/auth/git/unparseable output must block.",
    ),
  },
};

const commonConfigFamily = (adapterId: HarnessAdapterId): HarnessGeneratedFileFamily =>
  family(
    "harness-config",
    [`generated harness config field: agenticHarness=${adapterId}`],
    "ready",
    "I-15A-create-import-cli-ux-selected-harness",
    "writeGeneratedArtifacts",
    "Create/import records the selected adapter id in vibe-engineer.config.json.",
    adapterId === "pi" ? piEvidence : adapterId === "claude-code" ? claudeEvidence : codexEvidence,
  );

const commonSelectedHarnessFamilies = (
  adapterId: HarnessAdapterId,
): readonly HarnessGeneratedFileFamily[] => {
  const evidence =
    adapterId === "pi" ? piEvidence : adapterId === "claude-code" ? claudeEvidence : codexEvidence;
  return [
    family(
      "selected-harness-metadata",
      [".vibe/harness/selected-harness.json"],
      "ready",
      "I-15A-create-import-cli-ux-selected-harness",
      "writeGeneratedArtifacts",
      "Create/import emits machine-readable selected harness metadata, native/blocked asset assertions, and runtime prerequisite diagnostics.",
      evidence,
    ),
    family(
      "selected-harness-guidance",
      [".vibe/harness/README.md", ".vibe/harness/handoff.md"],
      "ready",
      "I-15A-create-import-cli-ux-selected-harness",
      "writeGeneratedArtifacts",
      "Create/import emits human-readable security, trust, unsupported-surface, and task/plan/build/ship handoff guidance for the selected harness.",
      evidence,
    ),
    family(
      "runner-catalog-harness-metadata",
      [".vibe/registry/runner-catalog.json#vibeEngineerHarness"],
      "ready",
      "I-15A-create-import-cli-ux-selected-harness",
      "writeGeneratedArtifacts",
      "Generated starter runner catalog entries carry selected-harness metadata and live invocation placeholders without implementing the architecture agent runner.",
      evidence,
    ),
    family(
      "starter-preset-harness-metadata",
      [".vibe/generated/nest-react-rn-preset/manifest.json#layout.agenticHarness"],
      "ready",
      "I-15A-create-import-cli-ux-selected-harness",
      "writeGeneratedArtifacts",
      "Generated starter preset metadata is rewritten to the selected harness instead of retaining the pi template default.",
      evidence,
    ),
  ];
};

const piGeneratedManifest: HarnessGeneratedFileManifest = {
  schemaVersion: HARNESS_GENERATED_FILE_MANIFEST_SCHEMA_VERSION,
  adapterId: "pi",
  adapterCapabilityVersion: HARNESS_ADAPTER_CONTRACT_SCHEMA_VERSION,
  families: [
    commonConfigFamily("pi"),
    family(
      "context-files",
      ["AGENTS.md", "CLAUDE.md"],
      "ready",
      "I-15A-create-import-cli-ux-selected-harness",
      "writeGeneratedArtifacts",
      "Existing Pi behavior emits both context files.",
      piEvidence,
    ),
    family(
      "pi-skill-files",
      [".pi/skills/<skill>/SKILL.md"],
      "ready",
      "I-15A-create-import-cli-ux-selected-harness",
      "writePiHarnessAssets",
      "Existing Pi behavior emits six validated skill files.",
      piEvidence,
    ),
    family(
      "pi-prompt-templates",
      [".pi/prompts/vibe-<skill>.md"],
      "ready",
      "I-15A-create-import-cli-ux-selected-harness",
      "writePiHarnessAssets",
      "Existing Pi behavior emits six validated prompt templates.",
      piEvidence,
    ),
    ...commonSelectedHarnessFamilies("pi"),
    family(
      "pi-extensions",
      [".pi/extensions/<name>.ts"],
      "blocked",
      "future-adapter-lane",
      "none",
      "Executable Pi extensions are blocked until runtime/security proof exists.",
      piBlockedEvidence,
    ),
    family(
      "pi-package-manifest",
      ["package.json#pi"],
      "blocked",
      "future-adapter-lane",
      "none",
      "Pi package manifest generation is blocked for create/import.",
      piBlockedEvidence,
    ),
  ],
};

const claudeGeneratedManifest: HarnessGeneratedFileManifest = {
  schemaVersion: HARNESS_GENERATED_FILE_MANIFEST_SCHEMA_VERSION,
  adapterId: "claude-code",
  adapterCapabilityVersion: HARNESS_ADAPTER_CONTRACT_SCHEMA_VERSION,
  families: [
    commonConfigFamily("claude-code"),
    family(
      "claude-context-file",
      ["CLAUDE.md"],
      "ready",
      "I-15A-create-import-cli-ux-selected-harness",
      "writeGeneratedArtifacts",
      "CLAUDE.md auto-discovery is evidenced by Claude Code help.",
      claudeEvidence,
    ),
    ...commonSelectedHarnessFamilies("claude-code"),
    family(
      "claude-project-skills",
      ["unproven Claude Code project-local skill/plugin paths"],
      "blocked",
      "future-adapter-lane",
      "none",
      "Project-local Claude Code skills/plugins are intentionally not emitted without path/trust proof.",
      claudeBlockedEvidence,
    ),
    family(
      "claude-custom-commands",
      ["unproven Claude Code project-local command/workflow paths"],
      "blocked",
      "future-adapter-lane",
      "none",
      "Claude Code custom command/workflow files are not generated until exact formats are proven.",
      claudeBlockedEvidence,
    ),
    family(
      "claude-hooks-and-mcp",
      ["unproven Claude Code hook/plugin/MCP generated files"],
      "blocked",
      "future-adapter-lane",
      "none",
      "Claude Code hook/plugin/MCP generation is blocked until a later adapter/security proof.",
      claudeBlockedEvidence,
    ),
    family(
      "claude-explicit-agents-json",
      ["future runner-owned --agents JSON"],
      "blocked",
      "future-adapter-lane",
      "future-runner",
      "Explicit --agents JSON is evidenced but not generated by create/import until a runner consumes it.",
      claudeBlockedEvidence,
    ),
  ],
};

const codexGeneratedManifest: HarnessGeneratedFileManifest = {
  schemaVersion: HARNESS_GENERATED_FILE_MANIFEST_SCHEMA_VERSION,
  adapterId: "codex",
  adapterCapabilityVersion: HARNESS_ADAPTER_CONTRACT_SCHEMA_VERSION,
  families: [
    commonConfigFamily("codex"),
    family(
      "codex-context-file",
      ["AGENTS.md"],
      "ready",
      "I-15A-create-import-cli-ux-selected-harness",
      "writeGeneratedArtifacts",
      "AGENTS.md injection is evidenced by codex debug prompt-input.",
      codexEvidence,
    ),
    ...commonSelectedHarnessFamilies("codex"),
    family(
      "codex-project-skills",
      ["unproven Codex project-local skill paths"],
      "blocked",
      "future-adapter-lane",
      "none",
      "Codex project-local skills are intentionally not emitted without discovery proof.",
      codexBlockedEvidence,
    ),
    family(
      "codex-plugins-and-hooks",
      ["unproven Codex plugin/hook generated files"],
      "blocked",
      "future-adapter-lane",
      "none",
      "Codex plugin/hook generation is blocked until exact trust/file semantics are proven.",
      codexBlockedEvidence,
    ),
    family(
      "codex-output-schema",
      ["future architecture runner output schema"],
      "blocked",
      "future-adapter-lane",
      "future-runner",
      "codex exec --output-schema is evidenced but schema assets belong to a later runner lane.",
      codexBlockedEvidence,
    ),
  ],
};

const piAdapter: HarnessAdapter = {
  id: "pi",
  displayName: "Pi Coding Agent",
  capabilityMatrix: piCapabilities,
  generatedFileManifest: piGeneratedManifest,
  assetWriter: {
    strategy: "pi-native-assets-and-context",
    contextFiles: ["AGENTS.md", "CLAUDE.md"],
    nativeAssetFamilies: ["pi-skill-files", "pi-prompt-templates"],
    blockedAssetFamilies: ["pi-extensions", "pi-package-manifest", "subagents", "plan-mode"],
    unsupportedFeaturePolicy: "block",
    noFallbackToPi: true,
  },
  invocationModel: {
    binary: "pi",
    nonInteractiveCommand: ["pi", "--approve", "--no-session", "--mode", "json", "-p", "<prompt>"],
    interactiveCommand: ["pi"],
    projectRootFlag: null,
    requiresGitRepository: false,
    missingRuntimeDiagnostic: "Pi CLI/auth/runtime unavailable for selected harness.",
    evidence: piEvidence,
  },
  structuredOutput: {
    strategy: "json-event-parse-and-adapter-validation",
    schemaFlag: null,
    finalMessageCarrier: "JSON event stream parsed by adapter-side validator",
    failClosedWhenMissing: true,
    evidence: piEvidence,
  },
  verificationRunnerInvocation: {
    recommendedCommand: ["pi", "--approve", "--no-session", "--mode", "json", "-p", "<prompt>"],
    defaultPermissionMode: "project trust required; default-deny tools unless explicitly allowed",
    expectedStructuredOutput: "json-event-parse-and-adapter-validation",
    unavailableRuntimeBehavior: "blocked-missing-prerequisite",
    evidence: piEvidence,
  },
  securityTrustPolicy: {
    projectTrustRequired: true,
    projectContextAutoload: ["AGENTS.md", "CLAUDE.md"],
    sandbox: "not provided by Pi; use OS/container sandbox for unattended runs",
    permissionModel:
      "--approve/--no-approve project trust plus adapter default-deny command policy",
    credentials: "operator-auth-required",
    destructiveOperations: "forbidden",
    externalIntegrations: "disabled-by-default",
    trustBoundary:
      "Project-local .pi resources and TypeScript extensions require project trust; create/import emits only non-executable skills/prompts/context.",
    evidence: piEvidence,
  },
  unsupportedFeatureBehavior: {
    policy: "block",
    diagnosticCode: "UNSUPPORTED_HARNESS_FEATURE",
    message: "Unsupported Pi adapter features block instead of silently no-oping.",
    blockedFamilies: ["pi-extensions", "pi-package-manifest", "subagents", "plan-mode"],
  },
  handoffInstructions: handoffInstructionsFor("pi"),
  runtimePrerequisiteDiagnostic: runtimePrerequisiteDiagnostic(
    "pi",
    "Pi Coding Agent",
    "Pi CLI/auth/runtime unavailable for selected harness.",
  ),
  witnessPlan: {
    configWitnesses: ["config accepts agenticHarness=pi"],
    createWitnesses: ["create pi preserves existing .pi skills/prompts and AGENTS.md/CLAUDE.md"],
    importWitnesses: ["import pi preserves existing behavior and idempotent Pi assets"],
    negativeWitnesses: ["unsupported feature families are listed as blocked"],
    liveRuntimeWitness: "pending-live",
  },
  createImportSelectable: true,
};

const claudeAdapter: HarnessAdapter = {
  id: "claude-code",
  displayName: "Claude Code",
  capabilityMatrix: claudeCapabilities,
  generatedFileManifest: claudeGeneratedManifest,
  assetWriter: {
    strategy: "claude-context-only",
    contextFiles: ["CLAUDE.md"],
    nativeAssetFamilies: [],
    blockedAssetFamilies: [
      "claude-project-skills",
      "claude-custom-commands",
      "claude-hooks-and-mcp",
      "claude-explicit-agents-json",
    ],
    unsupportedFeaturePolicy: "block",
    noFallbackToPi: true,
  },
  invocationModel: {
    binary: "claude",
    nonInteractiveCommand: [
      "claude",
      "-p",
      "--output-format",
      "json",
      "--json-schema",
      "<schema-json>",
      "--no-session-persistence",
      "<prompt>",
    ],
    interactiveCommand: ["claude"],
    projectRootFlag: "--add-dir",
    requiresGitRepository: false,
    missingRuntimeDiagnostic: "Claude Code CLI/auth/runtime unavailable for selected harness.",
    evidence: claudeEvidence,
  },
  structuredOutput: {
    strategy: "native-json-schema",
    schemaFlag: "--json-schema",
    finalMessageCarrier: "Claude Code print-mode JSON output",
    failClosedWhenMissing: true,
    evidence: claudeEvidence,
  },
  verificationRunnerInvocation: {
    recommendedCommand: [
      "claude",
      "-p",
      "--output-format",
      "json",
      "--json-schema",
      "<schema-json>",
      "--permission-mode",
      "plan",
      "--allowedTools",
      "Read,Grep,Glob,Bash(git diff:*)",
      "--no-session-persistence",
      "<prompt>",
    ],
    defaultPermissionMode: "plan/dontAsk with explicit allowedTools and disallowedTools",
    expectedStructuredOutput: "native-json-schema",
    unavailableRuntimeBehavior: "blocked-missing-prerequisite",
    evidence: claudeEvidence,
  },
  securityTrustPolicy: {
    projectTrustRequired: true,
    projectContextAutoload: ["CLAUDE.md"],
    sandbox: "permission modes and allowed/disallowed tools; no OS sandbox claim",
    permissionModel:
      "--permission-mode default|acceptEdits|auto|dontAsk|plan|bypassPermissions with explicit tool allow/deny",
    credentials: "operator-auth-required",
    destructiveOperations: "approval-required",
    externalIntegrations: "disabled-by-default",
    trustBoundary:
      "Create/import emits only CLAUDE.md; plugin, hook, command, and generated agent assets remain blocked until proven.",
    evidence: claudeEvidence,
  },
  unsupportedFeatureBehavior: {
    policy: "block",
    diagnosticCode: "UNSUPPORTED_HARNESS_FEATURE",
    message:
      "Unproven Claude Code generated asset families block instead of silently falling back to Pi assets.",
    blockedFamilies: [
      "claude-project-skills",
      "claude-custom-commands",
      "claude-hooks-and-mcp",
      "claude-explicit-agents-json",
    ],
  },
  handoffInstructions: handoffInstructionsFor("claude-code"),
  runtimePrerequisiteDiagnostic: runtimePrerequisiteDiagnostic(
    "claude",
    "Claude Code",
    "Claude Code CLI/auth/runtime unavailable for selected harness.",
  ),
  witnessPlan: {
    configWitnesses: ["config accepts agenticHarness=claude-code"],
    createWitnesses: ["create claude-code writes CLAUDE.md and no .pi assets"],
    importWitnesses: ["import claude-code writes CLAUDE.md and no .pi assets"],
    negativeWitnesses: [
      "Claude project-local skills/plugins/commands/hooks are blocked in the adapter manifest",
    ],
    liveRuntimeWitness: "pending-live",
  },
  createImportSelectable: true,
};

const codexAdapter: HarnessAdapter = {
  id: "codex",
  displayName: "Codex CLI",
  capabilityMatrix: codexCapabilities,
  generatedFileManifest: codexGeneratedManifest,
  assetWriter: {
    strategy: "codex-context-only",
    contextFiles: ["AGENTS.md"],
    nativeAssetFamilies: [],
    blockedAssetFamilies: [
      "codex-project-skills",
      "codex-plugins-and-hooks",
      "codex-output-schema",
      "subagents",
      "plan-mode",
    ],
    unsupportedFeaturePolicy: "block",
    noFallbackToPi: true,
  },
  invocationModel: {
    binary: "codex",
    nonInteractiveCommand: [
      "codex",
      "exec",
      "-c",
      'approval_policy="never"',
      "--cd",
      ".",
      "--sandbox",
      "read-only",
      "--json",
      "--output-schema",
      "<schema-file>",
      "--output-last-message",
      "<last-message-file>",
      "<prompt>",
    ],
    interactiveCommand: ["codex"],
    projectRootFlag: "--cd",
    requiresGitRepository: false,
    missingRuntimeDiagnostic: "Codex CLI/auth/runtime unavailable for selected harness.",
    evidence: codexEvidence,
  },
  structuredOutput: {
    strategy: "native-output-schema",
    schemaFlag: "--output-schema",
    finalMessageCarrier: "--output-last-message file plus JSONL events",
    failClosedWhenMissing: true,
    evidence: codexEvidence,
  },
  verificationRunnerInvocation: {
    recommendedCommand: [
      "codex",
      "exec",
      "-c",
      'approval_policy="never"',
      "--cd",
      ".",
      "--sandbox",
      "read-only",
      "--json",
      "--output-schema",
      "<schema-file>",
      "--output-last-message",
      "<last-message-file>",
      "<prompt>",
    ],
    defaultPermissionMode: "read-only sandbox with approval_policy=never config override",
    expectedStructuredOutput: "native-output-schema",
    unavailableRuntimeBehavior: "blocked-missing-prerequisite",
    evidence: codexEvidence,
  },
  securityTrustPolicy: {
    projectTrustRequired: true,
    projectContextAutoload: ["AGENTS.md"],
    sandbox: "--sandbox read-only|workspace-write|danger-full-access",
    permissionModel:
      "approval_policy config override plus --sandbox read-only|workspace-write|danger-full-access selection",
    credentials: "operator-auth-required",
    destructiveOperations: "approval-required",
    externalIntegrations: "disabled-by-default",
    trustBoundary:
      "Create/import emits only AGENTS.md; project-local skills/plugins/hooks and runner schemas remain blocked until proven/consumed.",
    evidence: codexEvidence,
  },
  unsupportedFeatureBehavior: {
    policy: "block",
    diagnosticCode: "UNSUPPORTED_HARNESS_FEATURE",
    message:
      "Unproven Codex generated asset families block instead of silently falling back to Pi assets.",
    blockedFamilies: [
      "codex-project-skills",
      "codex-plugins-and-hooks",
      "codex-output-schema",
      "subagents",
      "plan-mode",
    ],
  },
  handoffInstructions: handoffInstructionsFor("codex"),
  runtimePrerequisiteDiagnostic: runtimePrerequisiteDiagnostic(
    "codex",
    "Codex CLI",
    "Codex CLI/auth/runtime unavailable for selected harness.",
  ),
  witnessPlan: {
    configWitnesses: ["config accepts agenticHarness=codex"],
    createWitnesses: ["create codex writes AGENTS.md and no .pi assets"],
    importWitnesses: ["import codex writes AGENTS.md and no .pi assets"],
    negativeWitnesses: [
      "Codex project-local skills/plugins/hooks/schema assets are blocked in the adapter manifest",
    ],
    liveRuntimeWitness: "pending-live",
  },
  createImportSelectable: true,
};

export const HARNESS_ADAPTERS = [piAdapter, claudeAdapter, codexAdapter] as const;

export const HARNESS_ADAPTER_REGISTRY = {
  schemaVersion: HARNESS_ADAPTER_REGISTRY_SCHEMA_VERSION,
  supportedAdapterIds: SUPPORTED_HARNESS_ADAPTER_IDS,
  adapters: HARNESS_ADAPTERS,
} as const;

export const isSupportedHarnessAdapterId = (value: string): value is HarnessAdapterId =>
  SUPPORTED_HARNESS_ADAPTER_IDS.includes(value as HarnessAdapterId);

export const getHarnessAdapter = (adapterId: string): HarnessAdapter | undefined =>
  HARNESS_ADAPTERS.find((adapter) => adapter.id === adapterId);

export const listHarnessAdapters = (): readonly HarnessAdapter[] => [...HARNESS_ADAPTERS];

export const getHarnessAdapterRegistry = (): typeof HARNESS_ADAPTER_REGISTRY =>
  HARNESS_ADAPTER_REGISTRY;
