import {
  createDownstreamManifestSummary,
  validateGeneratedFileManifest,
  type DownstreamManifestSummary,
  type GeneratedFileFamily,
  type GeneratedFileConsumerLaneId,
  type GeneratedFileFamilyId,
  type GeneratedFileManifest,
  type GeneratedFileProducerLaneId,
  type GeneratedFileTrustSecurity,
  type GeneratedFileVersion,
  type ValidationResult,
} from "../schema/index.ts";
import { getPiAdapterCapabilityMatrix } from "../capabilities/index.ts";

// Node 17+ exposes `structuredClone` as a runtime global; the package's strict tsc
// invocation (`--lib ES2022`) omits its typing, so declare the ambient minimal signature.
declare const structuredClone: { <T>(value: T): T };

export const PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION = "pi-generated-file-manifest/v1" as const;

const version = (formatName: string, formatVersion: string): GeneratedFileVersion => ({
  formatName,
  formatVersion,
  schemaVersion: PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION,
  adapterCapabilityVersion: "pi-adapter-capability-matrix/v1",
});

const trustSecurity = (
  overrides: Omit<GeneratedFileTrustSecurity, "evidence">,
): GeneratedFileTrustSecurity => ({
  ...overrides,
  evidence: {
    state: "known",
    source: "DL-06-agentic-harness-integrations.md + DL-22-security-safety-model.md",
    notes:
      "Generated-file family carries explicit trust, sandbox, credential, command, external-integration, and destructive-operation semantics.",
  },
});

const family = (
  familyId: GeneratedFileFamilyId,
  description: string,
  pathPatterns: readonly string[],
  producedByLane: GeneratedFileProducerLaneId,
  consumedByLanes: readonly GeneratedFileConsumerLaneId[],
  security: GeneratedFileTrustSecurity,
  fileVersion: GeneratedFileVersion,
  readinessState: GeneratedFileFamily["readiness"]["state"],
  reason: string,
): GeneratedFileFamily => ({
  familyId,
  description,
  pathPatterns,
  owner: {
    ownerKind: "lane",
    ownerId: producedByLane,
    writePathScope: pathPatterns,
    allowedOperations: ["generate-in-later-lane", "validate"],
  },
  producedByLane,
  consumedByLanes,
  trustSecurity: security,
  version: fileVersion,
  readiness: {
    state: readinessState,
    reason,
  },
});

const projectInstructionSecurity = trustSecurity({
  classification: "project-instruction",
  trustBoundary:
    "Project-local instructions are loaded by pi after project trust; content must remain domain-neutral and cannot embed secrets.",
  projectTrustRequired: true,
  executesCode: false,
  commandPolicy: "not-applicable",
  sandboxCapability: "not_provided",
  credentialPolicy: "no-credentials-required",
  externalIntegration: "disabled-by-default",
  destructiveOperationPolicy: "forbidden",
});

export const PI_GENERATED_FILE_MANIFEST: GeneratedFileManifest = {
  schemaVersion: PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION,
  adapterId: "pi",
  adapterCapabilityVersion: "pi-adapter-capability-matrix/v1",
  producedByLane: "I-14A-pi-adapter-capability-generated-file-manifest",
  families: [
    family(
      "pi-skill-files",
      "Agent Skills-compatible files for the six locked vibe-engineer skills.",
      [".pi/skills/<skill>/SKILL.md", ".agents/skills/<skill>/SKILL.md"],
      "I-14B-pi-adapter-runtime-skill-consumption",
      [
        "I-14B-pi-adapter-runtime-skill-consumption",
        "I-15A-create-import-cli-ux-selected-harness",
        "I-21-build-skill-orchestration",
      ],
      projectInstructionSecurity,
      version("Agent Skills SKILL.md", "v1"),
      "ready",
      "Manifest family is declared and validated by I-14A; actual file generation/runtime proof belongs to I-14B/I-15A.",
    ),
    family(
      "pi-prompt-templates",
      "Reusable pi slash-command prompt templates for generated skill workflows.",
      [".pi/prompts/<name>.md"],
      "I-14B-pi-adapter-runtime-skill-consumption",
      ["I-14B-pi-adapter-runtime-skill-consumption", "I-15A-create-import-cli-ux-selected-harness"],
      projectInstructionSecurity,
      version("Pi prompt template markdown", "v1"),
      "ready",
      "Templates are an allowed family only when downstream lanes validate manifest metadata and avoid silent unsupported behavior.",
    ),
    family(
      "pi-extensions",
      "Optional TypeScript extensions for commands, tools, hooks, permission/path gates, subagent or plan-mode-like behavior, and dynamic resources.",
      [".pi/extensions/<name>.ts", ".pi/extensions/<name>/index.ts"],
      "I-14B-pi-adapter-runtime-skill-consumption",
      [
        "I-14B-pi-adapter-runtime-skill-consumption",
        "I-18-security-safety-hooks-policy",
        "I-21-build-skill-orchestration",
      ],
      trustSecurity({
        classification: "executable-extension",
        trustBoundary:
          "TypeScript extension code executes with pi/package permissions after project trust; no sandbox isolation is claimed by I-14A.",
        projectTrustRequired: true,
        executesCode: true,
        commandPolicy: "default-deny",
        sandboxCapability: "not_provided",
        credentialPolicy: "operator-supplied-only",
        externalIntegration: "disabled-by-default",
        destructiveOperationPolicy: "approval-required",
      }),
      version("Pi TypeScript extension", "v1"),
      "blocked",
      "Executable extension generation and live loading are intentionally blocked until I-14B/I-18 prove the actual runtime/security boundary.",
    ),
    family(
      "pi-package-manifest",
      "Optional package.json `pi` key for shareable resources.",
      ["package.json#pi"],
      "I-14B-pi-adapter-runtime-skill-consumption",
      ["I-14B-pi-adapter-runtime-skill-consumption", "I-15B-starter-template-harness-consumption"],
      trustSecurity({
        classification: "package-manifest",
        trustBoundary:
          "Pi package install/update/trust behavior must be explicit before a package manifest is generated or consumed.",
        projectTrustRequired: true,
        executesCode: true,
        commandPolicy: "default-deny",
        sandboxCapability: "not_provided",
        credentialPolicy: "operator-supplied-only",
        externalIntegration: "disabled-by-default",
        destructiveOperationPolicy: "approval-required",
      }),
      version("Pi package manifest key", "v1"),
      "deferred",
      "Optional package distribution is declared for compatibility but not generated by I-14A.",
    ),
    family(
      "context-files",
      "Project context/instruction files loaded by pi and optional cross-harness compatibility context.",
      ["AGENTS.md", "CLAUDE.md"],
      "I-15A-create-import-cli-ux-selected-harness",
      [
        "I-15A-create-import-cli-ux-selected-harness",
        "I-08-context-graph-index-drift",
        "I-21-build-skill-orchestration",
      ],
      projectInstructionSecurity,
      version("Pi context file", "v1"),
      "ready",
      "Context file family is ready as manifest data; actual starter/create writes belong to I-15A.",
    ),
    family(
      "harness-config",
      "Generated harness config fields recording `agenticHarness: pi` and adapter capability/version metadata.",
      [
        "generated harness config field: agenticHarness=pi",
        "generated harness config field: adapterCapabilityVersion",
        "generated harness config field: generatedFileManifestVersion",
      ],
      "I-15A-create-import-cli-ux-selected-harness",
      [
        "I-15A-create-import-cli-ux-selected-harness",
        "I-15B-starter-template-harness-consumption",
        "I-21-build-skill-orchestration",
      ],
      trustSecurity({
        classification: "configuration",
        trustBoundary:
          "Configuration selects the typed pi adapter manifest only; it must not silently enable unsupported non-pi harnesses or runtime claims.",
        projectTrustRequired: false,
        executesCode: false,
        commandPolicy: "not-applicable",
        sandboxCapability: "not_provided",
        credentialPolicy: "no-credentials-required",
        externalIntegration: "disabled-by-default",
        destructiveOperationPolicy: "forbidden",
      }),
      version("vibe-engineer harness adapter config", "v1"),
      "ready",
      "Config metadata is ready for downstream consumption after this manifest validates; create/import behavior remains I-15A-owned.",
    ),
  ],
};

export const getPiGeneratedFileManifest = (): GeneratedFileManifest =>
  structuredClone(PI_GENERATED_FILE_MANIFEST);

export const validatePiGeneratedFileManifest = (
  value: unknown,
): ValidationResult<GeneratedFileManifest> => validateGeneratedFileManifest(value);

export const createPiDownstreamManifestSummary = (): DownstreamManifestSummary =>
  createDownstreamManifestSummary(getPiAdapterCapabilityMatrix(), getPiGeneratedFileManifest());

export {
  CREATE_PI_ASSET_FAMILIES,
  CreatePiAssetValidationError,
  selectCreatePiAssets,
  validateCreatePiAssetWritePlan,
  type CreatePiAssetConflictPolicy,
  type CreatePiAssetDescriptor,
  type CreatePiAssetExistingPathKind,
  type CreatePiAssetExistingPathState,
  type CreatePiAssetFamilyId,
  type CreatePiAssetKind,
  type CreatePiAssetPlannedWrite,
  type CreatePiAssetValidationIssue,
  type CreatePiAssetValidationResult,
  type CreatePiAssetWritePlan,
} from "../create-consumption/index.ts";
