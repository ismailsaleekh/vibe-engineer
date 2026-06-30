import {
  GENERATED_FILE_FAMILY_IDS,
  SKILL_IDS,
  validateCapabilityMatrix,
  type AdapterCapability,
  type AdapterCapabilityMatrix,
  type CapabilitySurface,
  type EvidenceRecord,
  type SkillCapability,
  type SkillId,
  type ValidationResult,
} from "../schema/index.ts";

// Node 17+ exposes `structuredClone` as a runtime global; the package's strict tsc
// invocation (`--lib ES2022`) omits its typing, so declare the ambient minimal signature.
declare const structuredClone: { <T>(value: T): T };

export const PI_ADAPTER_ID = "pi" as const;
export const PI_ADAPTER_CAPABILITY_SCHEMA_VERSION = "pi-adapter-capability-matrix/v1" as const;
export const VIBE_ENGINEER_SKILLS = [...SKILL_IDS];

const known = (source: string, notes: string): EvidenceRecord => ({
  state: "known",
  source,
  notes,
});
const unknown = (source: string, notes: string): EvidenceRecord => ({
  state: "unknown",
  source,
  notes,
});
const deferred = (source: string, notes: string): EvidenceRecord => ({
  state: "deferred",
  source,
  notes,
});

const surface = (
  evidence: EvidenceRecord,
  support: CapabilitySurface["support"],
  details: string,
  downstreamConsequence: string,
): CapabilitySurface => ({
  evidence,
  support,
  details,
  downstreamConsequence,
});

const piSkill = (skillId: SkillId): SkillCapability => ({
  skillId,
  nativeCommand: `/skill:${skillId}`,
  resourceFamily: "pi-skill-files",
  evidence: known(
    "DL-03 skill protocols + DL-06 pi skills decision",
    "The six locked skills are generated as Agent Skills-compatible SKILL.md resources.",
  ),
  readiness: "ready",
  protocolSource: "DL-03-skill-protocols.md",
});

const nonPiAdapter = (
  adapterId: "claude-code" | "codex" | "opencode" | "later-integrations",
  displayName: string,
  evidence: EvidenceRecord,
): AdapterCapability => ({
  adapterId,
  displayName,
  evidenceStatus: evidence,
  versionCompatibility: {
    harnessName: displayName,
    harnessVersionRange: "unknown",
    resourceFormatVersion: "unknown",
    runtimeRequirements: ["future evidence-backed decision required"],
    compatibilityEvidence: evidence,
  },
  skillsCommandsSurface: {
    ...surface(
      evidence,
      evidence.state === "deferred" ? "deferred" : "unknown",
      "No v1 native generated-resource contract is authorized for this harness.",
      "Any dependent selection or generation for this harness must block until a future adapter decision supplies evidence.",
    ),
    nativeFormat: "unknown",
    autoloadDiscovery: ["unknown"],
    skills: [],
  },
  promptTemplateSurface: surface(
    evidence,
    evidence.state === "deferred" ? "deferred" : "unknown",
    "Prompt template semantics are not evidenced for v1.",
    "Prompt generation must block for this harness.",
  ),
  hookEventSupport: surface(
    evidence,
    evidence.state === "deferred" ? "deferred" : "unknown",
    "Hook/event semantics are not evidenced for v1.",
    "Hook, tool, event, UI, plan-mode, or subagent generation must block.",
  ),
  subagentCapability: {
    ...surface(
      evidence,
      evidence.state === "deferred" ? "deferred" : "unknown",
      "Subagent capability is not evidenced for v1.",
      "Subagent-dependent behavior must block.",
    ),
    implementationKind: "unsupported",
    requiresGeneratedExtension: false,
  },
  planModeCapability: {
    ...surface(
      evidence,
      evidence.state === "deferred" ? "deferred" : "unknown",
      "Plan-mode capability is not evidenced for v1.",
      "Plan-mode-dependent behavior must block.",
    ),
    implementationKind: "unsupported",
    requiresGeneratedExtension: false,
  },
  contextFileConventions: surface(
    evidence,
    evidence.state === "deferred" ? "deferred" : "unknown",
    "Context-file conventions are not evidenced for v1.",
    "Context file generation must block for this harness.",
  ),
  commandInvocationModel: {
    interactive: surface(
      evidence,
      "unknown",
      "Unknown invocation model.",
      "Invocation must block.",
    ),
    printMode: surface(
      evidence,
      "unknown",
      "Unknown print/non-interactive model.",
      "Invocation must block.",
    ),
    jsonMode: surface(
      evidence,
      "unknown",
      "Unknown machine-readable event model.",
      "Automation must block.",
    ),
    rpcMode: surface(evidence, "unknown", "Unknown RPC model.", "Automation must block."),
    sdk: surface(evidence, "unknown", "Unknown SDK model.", "Automation must block."),
    shellCommandPolicy: "blocked",
  },
  generatedFiles: {
    evidence,
    manifestSchemaVersion: "pi-generated-file-manifest/v1",
    families: [],
    downstreamConsequence: "No non-pi generated files may be emitted by v1 lanes.",
  },
  packageDistribution: {
    ...surface(
      evidence,
      evidence.state === "deferred" ? "deferred" : "unknown",
      "Package distribution semantics are not evidenced for v1.",
      "Package generation or install claims must block.",
    ),
    distributionKinds: [],
    trustUpdatePolicy: "blocked until future adapter evidence exists",
  },
  securityTrust: {
    evidence,
    projectTrustRequired: false,
    extensionExecution: "none",
    commandPolicy: "default-deny",
    sandboxCapability: "unknown",
    credentialPolicy: "unknown-blocked",
    destructiveOperations: "forbidden",
    externalIntegration: "unknown-blocked",
    trustBoundary: "No v1 trust boundary is declared; non-pi rows are non-selectable.",
  },
  capabilityFlags: {
    skills: false,
    prompts: false,
    hooks: false,
    extensions: false,
    subagents: false,
    planMode: false,
    contextFiles: false,
    rpc: false,
    sdk: false,
    jsonMode: false,
    packages: false,
    ui: false,
    unsupportedFeaturePolicy: "block",
  },
  realBoundaryWitness: {
    evidence,
    boundaryStatus: evidence.state === "deferred" ? "deferred" : "unknown",
    producer: "future adapter lane",
    carrier: "future generated-resource manifest",
    consumer: "future harness runtime/API consumer",
    evidencePath: "future evidence-backed decision required",
    runtimeExecutionClaim: "not-claimed",
  },
  selection: {
    manifestSelectable: false,
    createImportSelectable: false,
    readiness:
      evidence.state === "blocked"
        ? "blocked"
        : evidence.state === "deferred"
          ? "deferred"
          : "unknown",
    reason:
      "Non-pi harnesses are explicit future/deferred/unknown rows and are never ready or selectable in v1.",
  },
});

const piAdapter: AdapterCapability = {
  adapterId: PI_ADAPTER_ID,
  displayName: "Pi Coding Agent",
  evidenceStatus: known(
    "DL-06-agentic-harness-integrations.md",
    "Pi is the only v1 live adapter target; this row declares the typed manifest contract and does not claim live runtime execution.",
  ),
  versionCompatibility: {
    harnessName: "pi",
    harnessVersionRange: "unknown until I-14B/live runtime records installed pi version",
    resourceFormatVersion:
      "Agent Skills standard plus pi-specific prompt/template/extension/package resource formats",
    runtimeRequirements: [
      "Node/TypeScript extension runtime",
      "project trust for project-local .pi resources",
      "DL-22 default-deny command policy",
    ],
    compatibilityEvidence: known(
      "DL-06 pi mechanisms and explicit limitations",
      "Design evidence is known; live runtime compatibility remains I-14B pending-live.",
    ),
  },
  skillsCommandsSurface: {
    ...surface(
      known("DL-03 + DL-06", "All six locked skills map to pi Agent Skills slash commands."),
      "ready",
      "Generate `.pi/skills/<skill>/SKILL.md` and/or `.agents/skills/<skill>/SKILL.md` assets exposing `/skill:<skill>`.",
      "Downstream lanes may consume the typed mapping, but I-14B owns actual file generation/runtime loading.",
    ),
    nativeFormat: "Agent Skills SKILL.md",
    autoloadDiscovery: [".pi/skills/<skill>/SKILL.md", ".agents/skills/<skill>/SKILL.md"],
    skills: VIBE_ENGINEER_SKILLS.map((skillId) => piSkill(skillId)),
  },
  promptTemplateSurface: surface(
    known(
      "DL-06 pi prompt templates",
      "Pi prompt templates are `.pi/prompts/*.md` markdown files with filename-derived slash commands and frontmatter/arguments.",
    ),
    "ready",
    "Reusable slash-command prompt templates may be declared in `.pi/prompts/<name>.md`.",
    "Downstream generation must validate template family metadata before writing files.",
  ),
  hookEventSupport: surface(
    known(
      "DL-06 pi extensions",
      "Pi TypeScript extensions can register commands/tools and subscribe to events; deterministic gates must not be advisory-only.",
    ),
    "ready",
    "Optional `.pi/extensions/**` TypeScript extensions can provide commands, tools, hooks/events, permission gates, and dynamic resources.",
    "Executable extension files require DL-22 trust/security metadata and later runtime proof.",
  ),
  subagentCapability: {
    ...surface(
      known(
        "DL-06 explicit pi limitations",
        "Pi does not ship built-in subagents; subagent behavior is extension/package-built only.",
      ),
      "blocked",
      "No built-in subagent claim is made in I-14A.",
      "Any subagent-dependent lane must wait for generated extension/package implementation and live proof.",
    ),
    implementationKind: "extension-built",
    requiresGeneratedExtension: true,
  },
  planModeCapability: {
    ...surface(
      known(
        "DL-06 explicit pi limitations",
        "Pi does not ship built-in plan mode; plan-mode-like behavior is extension/package-built only.",
      ),
      "blocked",
      "No built-in plan-mode claim is made in I-14A.",
      "Any plan-mode-dependent lane must wait for generated extension/package implementation and live proof.",
    ),
    implementationKind: "extension-built",
    requiresGeneratedExtension: true,
  },
  contextFileConventions: surface(
    known(
      "DL-06 context files",
      "Pi loads AGENTS.md and optional CLAUDE.md context files subject to trust and load timing.",
    ),
    "ready",
    "Context file families are `AGENTS.md` and optional `CLAUDE.md`, with generated content preserving project-owned instructions.",
    "Downstream writers must use the generated-file manifest and DL-22 trust fields before emitting context files.",
  ),
  commandInvocationModel: {
    interactive: surface(
      known("DL-06 CLI modes", "Interactive mode is user-facing operation."),
      "ready",
      "User operation through `pi` interactive mode.",
      "No automation may infer machine success from prose.",
    ),
    printMode: surface(
      known("DL-06 CLI modes", "`pi -p`/`--print` is available for one-shot prompts."),
      "ready",
      "One-shot prompt mode can be used by future runtime witnesses where safe.",
      "Future runtime lanes must validate machine-readable outputs where they rely on automation.",
    ),
    jsonMode: surface(
      known("DL-06 JSON mode", "`--mode json` provides event-stream observation."),
      "ready",
      "JSON mode is the preferred observation surface for event-stream runtime proof.",
      "I-14A does not execute live pi runtime; I-14B owns it.",
    ),
    rpcMode: surface(
      known("DL-06 RPC", "RPC `get_commands` can observe generated commands."),
      "ready",
      "RPC command listing is a preferred real-boundary observation point.",
      "I-14A proves manifest API consumption only; live pi RPC is pending I-14B.",
    ),
    sdk: surface(
      known("DL-06 SDK", "SDK/ResourceLoader APIs can observe generated resources."),
      "ready",
      "SDK resource loading can be used by future live witnesses.",
      "I-14A does not claim SDK runtime loading.",
    ),
    shellCommandPolicy: "default-deny",
  },
  generatedFiles: {
    evidence: known(
      "DL-06 pi generated-file families",
      "The generated-file manifest enumerates every permitted pi family and its owner/trust/version/consumer fields.",
    ),
    manifestSchemaVersion: "pi-generated-file-manifest/v1",
    families: [...GENERATED_FILE_FAMILY_IDS],
    downstreamConsequence:
      "Downstream lanes must validate the manifest before generating pi files; malformed or missing family metadata blocks.",
  },
  packageDistribution: {
    ...surface(
      known(
        "DL-06 pi packages",
        "Pi packages may declare resources through a package.json `pi` key; trust/update behavior must be explicit.",
      ),
      "ready",
      "Primary v1 generation uses project-local files; optional package distribution is declared but not generated in I-14A.",
      "Package distribution requires explicit generated-file manifest metadata and later lane implementation.",
    ),
    distributionKinds: ["project-local-files", "pi-package"],
    trustUpdatePolicy:
      "Project-local files require project trust; package install/update/trust behavior must be explicit before use.",
  },
  securityTrust: {
    evidence: known(
      "DL-22 + DL-06",
      "Adapter declares project trust, executable extension, command policy, sandbox non-claims, credential, destructive-operation, and external-integration defaults.",
    ),
    projectTrustRequired: true,
    extensionExecution: "typescript-extension",
    commandPolicy: "default-deny",
    sandboxCapability: "not_provided",
    credentialPolicy: "no-credentials-required",
    destructiveOperations: "forbidden",
    externalIntegration: "disabled-by-default",
    trustBoundary:
      "Project-local pi resources and TypeScript extensions run only after trust; I-14A claims no OS/network/process sandbox beyond policy declarations.",
  },
  capabilityFlags: {
    skills: true,
    prompts: true,
    hooks: true,
    extensions: true,
    subagents: false,
    planMode: false,
    contextFiles: true,
    rpc: true,
    sdk: true,
    jsonMode: true,
    packages: true,
    ui: false,
    unsupportedFeaturePolicy: "block",
  },
  realBoundaryWitness: {
    evidence: known(
      "I-14A implementer witness",
      "Actual package API is consumed by fixture generator/validator and persisted downstream summary; live pi runtime remains out of lane.",
    ),
    boundaryStatus: "implemented",
    producer:
      "@vibe-engineer/adapter-pi subpath APIs under packages/adapters/pi/src/{capabilities,generated-file-manifest,schema}",
    carrier:
      "packages/adapters/pi/fixtures/manifest and examples/harness-integrations/pi/manifest-fixtures JSON carriers",
    consumer:
      ".vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/witnesses/manifest-api-consumer.mjs",
    evidencePath:
      ".vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/downstream-summary.json",
    runtimeExecutionClaim: "not-claimed",
  },
  selection: {
    manifestSelectable: true,
    createImportSelectable: false,
    readiness: "ready",
    reason:
      "Ready only as a typed manifest/API contract for downstream consumers; create/import selected-harness behavior belongs to I-15A.",
  },
};

export const PI_ADAPTER_CAPABILITY_MATRIX: AdapterCapabilityMatrix = {
  schemaVersion: PI_ADAPTER_CAPABILITY_SCHEMA_VERSION,
  producedByLane: "I-14A-pi-adapter-capability-generated-file-manifest",
  adapterPackage: "@vibe-engineer/adapter-pi",
  adapters: [
    piAdapter,
    nonPiAdapter(
      "claude-code",
      "Claude Code",
      deferred(
        "DL-06 other harness disposition",
        "No local authoritative Claude Code harness generated-resource docs were provided for v1.",
      ),
    ),
    nonPiAdapter(
      "codex",
      "Codex",
      deferred(
        "DL-06 other harness disposition",
        "No local authoritative Codex harness generated-resource docs were provided for v1.",
      ),
    ),
    nonPiAdapter(
      "opencode",
      "OpenCode",
      deferred(
        "DL-06 other harness disposition",
        "Local pi docs mention OpenCode providers, not OpenCode harness asset semantics.",
      ),
    ),
    nonPiAdapter(
      "later-integrations",
      "Later integrations",
      unknown(
        "DL-06 future integrations",
        "Future harnesses require future evidence-backed decisions.",
      ),
    ),
  ],
};

export const getPiAdapterCapabilityMatrix = (): AdapterCapabilityMatrix =>
  structuredClone(PI_ADAPTER_CAPABILITY_MATRIX);

export const validatePiAdapterCapabilityMatrix = (
  value: unknown,
): ValidationResult<AdapterCapabilityMatrix> => validateCapabilityMatrix(value);

export const getAdapterCapabilityById = (
  matrix: AdapterCapabilityMatrix,
  adapterId: string,
): AdapterCapability | undefined =>
  matrix.adapters.find((adapter) => adapter.adapterId === adapterId);

export const isAdapterManifestSelectable = (
  matrix: AdapterCapabilityMatrix,
  adapterId: string,
): boolean => {
  const validation = validateCapabilityMatrix(matrix);
  if (!validation.valid) {
    return false;
  }
  const adapter = getAdapterCapabilityById(matrix, adapterId);
  return adapter?.selection.manifestSelectable === true && adapter.selection.readiness === "ready";
};
