export const EVIDENCE_STATES = ["known", "unknown", "deferred", "blocked"] as const;
export const READINESS_STATES = ["ready", "unknown", "deferred", "blocked"] as const;
export const SKILL_IDS = ["brainstorm", "grill-me", "task", "plan", "build", "ship"] as const;
export const GENERATED_FILE_FAMILY_IDS = [
  "pi-skill-files",
  "pi-prompt-templates",
  "pi-extensions",
  "pi-package-manifest",
  "context-files",
  "harness-config",
] as const;
export const SANDBOX_CAPABILITY_STATES = ["proven", "not_provided", "unknown", "blocked", "pending-live"] as const;
export const I14A_RUNTIME_EXECUTION_CLAIMS = ["not-claimed", "pending-live", "blocked"] as const;
export const I14A_OUT_OF_SCOPE_RUNTIME_EXECUTION_CLAIMS = ["proven", "live-proven", "runtime-proven", "loaded", "executed"] as const;
export const GENERATED_FILE_PRODUCER_LANE_IDS = [
  "I-14B-pi-adapter-runtime-skill-consumption",
  "I-15A-create-import-cli-ux-selected-harness",
] as const;
export const GENERATED_FILE_CONSUMER_LANE_IDS = [
  "I-08-context-graph-index-drift",
  "I-14B-pi-adapter-runtime-skill-consumption",
  "I-15A-create-import-cli-ux-selected-harness",
  "I-15B-starter-template-harness-consumption",
  "I-18-security-safety-hooks-policy",
  "I-21-build-skill-orchestration",
] as const;

export type EvidenceState = (typeof EVIDENCE_STATES)[number];
export type ReadinessState = (typeof READINESS_STATES)[number];
export type SkillId = (typeof SKILL_IDS)[number];
export type GeneratedFileFamilyId = (typeof GENERATED_FILE_FAMILY_IDS)[number];
export type SandboxCapabilityState = (typeof SANDBOX_CAPABILITY_STATES)[number];
export type I14ARuntimeExecutionClaim = (typeof I14A_RUNTIME_EXECUTION_CLAIMS)[number];
export type GeneratedFileProducerLaneId = (typeof GENERATED_FILE_PRODUCER_LANE_IDS)[number];
export type GeneratedFileConsumerLaneId = (typeof GENERATED_FILE_CONSUMER_LANE_IDS)[number];

export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export type ValidationResult<T> =
  | { readonly valid: true; readonly value: T; readonly issues: readonly [] }
  | { readonly valid: false; readonly issues: readonly ValidationIssue[] };

export interface EvidenceRecord {
  readonly state: EvidenceState;
  readonly source: string;
  readonly notes: string;
}

export interface VersionCompatibility {
  readonly harnessName: string;
  readonly harnessVersionRange: string;
  readonly resourceFormatVersion: string;
  readonly runtimeRequirements: readonly string[];
  readonly compatibilityEvidence: EvidenceRecord;
}

export interface CapabilitySurface {
  readonly evidence: EvidenceRecord;
  readonly support: ReadinessState;
  readonly details: string;
  readonly downstreamConsequence: string;
}

export interface SkillCapability {
  readonly skillId: SkillId;
  readonly nativeCommand: string;
  readonly resourceFamily: GeneratedFileFamilyId;
  readonly evidence: EvidenceRecord;
  readonly readiness: ReadinessState;
  readonly protocolSource: string;
}

export interface SkillsCommandsSurface extends CapabilitySurface {
  readonly nativeFormat: string;
  readonly autoloadDiscovery: readonly string[];
  readonly skills: readonly SkillCapability[];
}

export interface SubagentCapability extends CapabilitySurface {
  readonly implementationKind: "built-in" | "extension-built" | "external" | "unsupported";
  readonly requiresGeneratedExtension: boolean;
}

export interface PlanModeCapability extends CapabilitySurface {
  readonly implementationKind: "built-in" | "extension-built" | "external" | "unsupported";
  readonly requiresGeneratedExtension: boolean;
}

export interface CommandInvocationModel {
  readonly interactive: CapabilitySurface;
  readonly printMode: CapabilitySurface;
  readonly jsonMode: CapabilitySurface;
  readonly rpcMode: CapabilitySurface;
  readonly sdk: CapabilitySurface;
  readonly shellCommandPolicy: "not-required" | "default-deny" | "blocked";
}

export interface GeneratedFilesCapability {
  readonly evidence: EvidenceRecord;
  readonly manifestSchemaVersion: string;
  readonly families: readonly GeneratedFileFamilyId[];
  readonly downstreamConsequence: string;
}

export interface PackageDistributionCapability extends CapabilitySurface {
  readonly distributionKinds: readonly ("project-local-files" | "pi-package" | "npm-package" | "global-install")[];
  readonly trustUpdatePolicy: string;
}

export interface SecurityTrustCapability {
  readonly evidence: EvidenceRecord;
  readonly projectTrustRequired: boolean;
  readonly extensionExecution: "none" | "typescript-extension" | "package-extension";
  readonly commandPolicy: "default-deny" | "not-applicable";
  readonly sandboxCapability: SandboxCapabilityState;
  readonly credentialPolicy: "no-credentials-required" | "operator-supplied-only" | "unknown-blocked";
  readonly destructiveOperations: "forbidden" | "approval-required" | "not-applicable";
  readonly externalIntegration: "disabled-by-default" | "read-only" | "unknown-blocked";
  readonly trustBoundary: string;
}

export interface CapabilityFlags {
  readonly skills: boolean;
  readonly prompts: boolean;
  readonly hooks: boolean;
  readonly extensions: boolean;
  readonly subagents: boolean;
  readonly planMode: boolean;
  readonly contextFiles: boolean;
  readonly rpc: boolean;
  readonly sdk: boolean;
  readonly jsonMode: boolean;
  readonly packages: boolean;
  readonly ui: boolean;
  readonly unsupportedFeaturePolicy: "block" | "defer" | "unknown-block";
}

export interface RealBoundaryWitness {
  readonly evidence: EvidenceRecord;
  readonly boundaryStatus: "implemented" | "pending-live" | "blocked" | "deferred" | "unknown";
  readonly producer: string;
  readonly carrier: string;
  readonly consumer: string;
  readonly evidencePath: string;
  readonly runtimeExecutionClaim: I14ARuntimeExecutionClaim;
}

export interface AdapterSelectionStatus {
  readonly manifestSelectable: boolean;
  readonly createImportSelectable: boolean;
  readonly readiness: ReadinessState;
  readonly reason: string;
}

export interface AdapterCapability {
  readonly adapterId: string;
  readonly displayName: string;
  readonly evidenceStatus: EvidenceRecord;
  readonly versionCompatibility: VersionCompatibility;
  readonly skillsCommandsSurface: SkillsCommandsSurface;
  readonly promptTemplateSurface: CapabilitySurface;
  readonly hookEventSupport: CapabilitySurface;
  readonly subagentCapability: SubagentCapability;
  readonly planModeCapability: PlanModeCapability;
  readonly contextFileConventions: CapabilitySurface;
  readonly commandInvocationModel: CommandInvocationModel;
  readonly generatedFiles: GeneratedFilesCapability;
  readonly packageDistribution: PackageDistributionCapability;
  readonly securityTrust: SecurityTrustCapability;
  readonly capabilityFlags: CapabilityFlags;
  readonly realBoundaryWitness: RealBoundaryWitness;
  readonly selection: AdapterSelectionStatus;
}

export interface AdapterCapabilityMatrix {
  readonly schemaVersion: "pi-adapter-capability-matrix/v1";
  readonly producedByLane: "I-14A-pi-adapter-capability-generated-file-manifest";
  readonly adapterPackage: "@vibe-engineer/adapter-pi";
  readonly adapters: readonly AdapterCapability[];
}

export interface GeneratedFileOwner {
  readonly ownerKind: "lane" | "package";
  readonly ownerId: GeneratedFileProducerLaneId;
  readonly writePathScope: readonly string[];
  readonly allowedOperations: readonly ("declare" | "validate" | "generate-in-later-lane")[];
}

export interface GeneratedFileTrustSecurity {
  readonly classification: "project-instruction" | "executable-extension" | "package-manifest" | "configuration";
  readonly trustBoundary: string;
  readonly projectTrustRequired: boolean;
  readonly executesCode: boolean;
  readonly commandPolicy: "default-deny" | "not-applicable";
  readonly sandboxCapability: SandboxCapabilityState;
  readonly credentialPolicy: "no-credentials-required" | "operator-supplied-only" | "unknown-blocked";
  readonly externalIntegration: "disabled-by-default" | "read-only" | "unknown-blocked";
  readonly destructiveOperationPolicy: "forbidden" | "approval-required" | "not-applicable";
  readonly evidence: EvidenceRecord;
}

export interface GeneratedFileVersion {
  readonly formatName: string;
  readonly formatVersion: string;
  readonly schemaVersion: "pi-generated-file-manifest/v1";
  readonly adapterCapabilityVersion: "pi-adapter-capability-matrix/v1";
}

export interface GeneratedFileReadiness {
  readonly state: ReadinessState;
  readonly reason: string;
}

export interface GeneratedFileFamily {
  readonly familyId: GeneratedFileFamilyId;
  readonly description: string;
  readonly pathPatterns: readonly string[];
  readonly owner: GeneratedFileOwner;
  readonly producedByLane: GeneratedFileProducerLaneId;
  readonly consumedByLanes: readonly GeneratedFileConsumerLaneId[];
  readonly trustSecurity: GeneratedFileTrustSecurity;
  readonly version: GeneratedFileVersion;
  readonly readiness: GeneratedFileReadiness;
}

export interface GeneratedFileManifest {
  readonly schemaVersion: "pi-generated-file-manifest/v1";
  readonly adapterId: "pi";
  readonly adapterCapabilityVersion: "pi-adapter-capability-matrix/v1";
  readonly producedByLane: "I-14A-pi-adapter-capability-generated-file-manifest";
  readonly families: readonly GeneratedFileFamily[];
}

export interface DownstreamManifestSummary {
  readonly schemaVersion: "pi-adapter-downstream-summary/v1";
  readonly adapterId: "pi";
  readonly sixSkills: readonly SkillId[];
  readonly generatedFamilies: readonly GeneratedFileFamilyId[];
  readonly manifestReady: boolean;
  readonly createImportReady: false;
  readonly runtimeExecutionClaim: I14ARuntimeExecutionClaim;
  readonly blockedNonPiAdapters: readonly string[];
}

interface JsonObject {
  readonly [key: string]: unknown;
  readonly state?: unknown;
  readonly source?: unknown;
  readonly notes?: unknown;
  readonly evidence?: unknown;
  readonly support?: unknown;
  readonly details?: unknown;
  readonly downstreamConsequence?: unknown;
  readonly harnessName?: unknown;
  readonly harnessVersionRange?: unknown;
  readonly resourceFormatVersion?: unknown;
  readonly runtimeRequirements?: unknown;
  readonly compatibilityEvidence?: unknown;
  readonly skillId?: unknown;
  readonly nativeCommand?: unknown;
  readonly resourceFamily?: unknown;
  readonly readiness?: unknown;
  readonly protocolSource?: unknown;
  readonly nativeFormat?: unknown;
  readonly autoloadDiscovery?: unknown;
  readonly skills?: unknown;
  readonly prompts?: unknown;
  readonly hooks?: unknown;
  readonly implementationKind?: unknown;
  readonly requiresGeneratedExtension?: unknown;
  readonly interactive?: unknown;
  readonly printMode?: unknown;
  readonly jsonMode?: unknown;
  readonly rpcMode?: unknown;
  readonly sdk?: unknown;
  readonly shellCommandPolicy?: unknown;
  readonly manifestSchemaVersion?: unknown;
  readonly families?: unknown;
  readonly familyId?: unknown;
  readonly distributionKinds?: unknown;
  readonly trustUpdatePolicy?: unknown;
  readonly projectTrustRequired?: unknown;
  readonly extensionExecution?: unknown;
  readonly commandPolicy?: unknown;
  readonly sandboxCapability?: unknown;
  readonly credentialPolicy?: unknown;
  readonly destructiveOperations?: unknown;
  readonly externalIntegration?: unknown;
  readonly trustBoundary?: unknown;
  readonly unsupportedFeaturePolicy?: unknown;
  readonly boundaryStatus?: unknown;
  readonly producer?: unknown;
  readonly carrier?: unknown;
  readonly consumer?: unknown;
  readonly evidencePath?: unknown;
  readonly runtimeExecutionClaim?: unknown;
  readonly manifestSelectable?: unknown;
  readonly createImportSelectable?: unknown;
  readonly reason?: unknown;
  readonly adapterId?: unknown;
  readonly displayName?: unknown;
  readonly evidenceStatus?: unknown;
  readonly versionCompatibility?: unknown;
  readonly skillsCommandsSurface?: unknown;
  readonly promptTemplateSurface?: unknown;
  readonly hookEventSupport?: unknown;
  readonly subagentCapability?: unknown;
  readonly planModeCapability?: unknown;
  readonly contextFileConventions?: unknown;
  readonly commandInvocationModel?: unknown;
  readonly generatedFiles?: unknown;
  readonly packageDistribution?: unknown;
  readonly securityTrust?: unknown;
  readonly capabilityFlags?: unknown;
  readonly realBoundaryWitness?: unknown;
  readonly selection?: unknown;
  readonly ownerKind?: unknown;
  readonly ownerId?: unknown;
  readonly writePathScope?: unknown;
  readonly allowedOperations?: unknown;
  readonly classification?: unknown;
  readonly executesCode?: unknown;
  readonly destructiveOperationPolicy?: unknown;
  readonly formatName?: unknown;
  readonly formatVersion?: unknown;
  readonly schemaVersion?: unknown;
  readonly adapterCapabilityVersion?: unknown;
  readonly description?: unknown;
  readonly pathPatterns?: unknown;
  readonly owner?: unknown;
  readonly producedByLane?: unknown;
  readonly consumedByLanes?: unknown;
  readonly trustSecurity?: unknown;
  readonly version?: unknown;
  readonly adapterPackage?: unknown;
  readonly adapters?: unknown;
}

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const addIssue = (issues: ValidationIssue[], path: string, code: string, message: string): void => {
  issues.push({ path, code, message });
};

const checkExactObject = (
  value: unknown,
  path: string,
  requiredKeys: readonly string[],
  issues: ValidationIssue[],
): value is JsonObject => {
  if (!isRecord(value)) {
    addIssue(issues, path, "expected_object", "Expected a JSON object.");
    return false;
  }
  for (const key of requiredKeys) {
    if (!hasOwn(value, key)) {
      addIssue(issues, `${path}.${key}`, "missing_required", "Required field is missing.");
    }
  }
  for (const key of Object.keys(value)) {
    if (!requiredKeys.includes(key)) {
      addIssue(issues, `${path}.${key}`, "unknown_field", "Unknown fields fail closed.");
    }
  }
  return true;
};

const checkString = (value: unknown, path: string, issues: ValidationIssue[]): value is string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    addIssue(issues, path, "expected_non_empty_string", "Expected a non-empty string.");
    return false;
  }
  return true;
};

const checkBoolean = (value: unknown, path: string, issues: ValidationIssue[]): value is boolean => {
  if (typeof value !== "boolean") {
    addIssue(issues, path, "expected_boolean", "Expected a boolean.");
    return false;
  }
  return true;
};

const checkArray = (value: unknown, path: string, issues: ValidationIssue[]): value is readonly unknown[] => {
  if (!Array.isArray(value)) {
    addIssue(issues, path, "expected_array", "Expected an array.");
    return false;
  }
  return true;
};

const checkStringArray = (value: unknown, path: string, issues: ValidationIssue[], nonEmpty: boolean): value is readonly string[] => {
  if (!checkArray(value, path, issues)) {
    return false;
  }
  if (nonEmpty && value.length === 0) {
    addIssue(issues, path, "empty_array", "Array must not be empty.");
  }
  for (let index = 0; index < value.length; index += 1) {
    checkString(value[index], `${path}[${index}]`, issues);
  }
  return true;
};

const checkLiteral = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  issues: ValidationIssue[],
): value is T => {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    addIssue(issues, path, "unsupported_value", `Expected one of: ${allowed.join(", ")}.`);
    return false;
  }
  return true;
};

const sameStringSet = (actual: readonly string[], expected: readonly string[]): boolean => {
  if (actual.length !== expected.length) {
    return false;
  }
  const actualSet = new Set(actual);
  if (actualSet.size !== actual.length) {
    return false;
  }
  return expected.every((expectedValue) => actualSet.has(expectedValue));
};

const checkExactStringSet = (
  value: unknown,
  expected: readonly string[],
  path: string,
  code: string,
  issues: ValidationIssue[],
  message: string,
): value is readonly string[] => {
  if (!checkStringArray(value, path, issues, true)) {
    return false;
  }
  if (!sameStringSet(value, expected)) {
    addIssue(issues, path, code, message);
    return false;
  }
  return true;
};

const validateI14ARuntimeExecutionClaim = (value: unknown, path: string, issues: ValidationIssue[]): value is I14ARuntimeExecutionClaim => {
  if (typeof value === "string" && I14A_OUT_OF_SCOPE_RUNTIME_EXECUTION_CLAIMS.includes(value as (typeof I14A_OUT_OF_SCOPE_RUNTIME_EXECUTION_CLAIMS)[number])) {
    addIssue(issues, path, "i14a_runtime_claim_out_of_scope", "I-14A cannot claim live pi runtime execution; live-runtime proof belongs to I-14B.");
    return false;
  }
  return checkLiteral(value, I14A_RUNTIME_EXECUTION_CLAIMS, path, issues);
};

interface GeneratedFileFamilyContract {
  readonly pathPatterns: readonly string[];
  readonly producerLane: GeneratedFileProducerLaneId;
  readonly consumedByLanes: readonly GeneratedFileConsumerLaneId[];
  readonly ownerKind: "lane";
  readonly allowedOperations: readonly ("generate-in-later-lane" | "validate")[];
  readonly trustClassification: GeneratedFileTrustSecurity["classification"];
  readonly projectTrustRequired: boolean;
  readonly executesCode: boolean;
  readonly commandPolicy: GeneratedFileTrustSecurity["commandPolicy"];
  readonly sandboxCapability: SandboxCapabilityState;
  readonly credentialPolicy: GeneratedFileTrustSecurity["credentialPolicy"];
  readonly externalIntegration: GeneratedFileTrustSecurity["externalIntegration"];
  readonly destructiveOperationPolicy: GeneratedFileTrustSecurity["destructiveOperationPolicy"];
  readonly formatName: string;
  readonly formatVersion: string;
  readonly readinessState: ReadinessState;
}

const GENERATED_FILE_FAMILY_CONTRACTS: Record<GeneratedFileFamilyId, GeneratedFileFamilyContract> = {
  "pi-skill-files": {
    pathPatterns: [".pi/skills/<skill>/SKILL.md", ".agents/skills/<skill>/SKILL.md"],
    producerLane: "I-14B-pi-adapter-runtime-skill-consumption",
    consumedByLanes: ["I-14B-pi-adapter-runtime-skill-consumption", "I-15A-create-import-cli-ux-selected-harness", "I-21-build-skill-orchestration"],
    ownerKind: "lane",
    allowedOperations: ["generate-in-later-lane", "validate"],
    trustClassification: "project-instruction",
    projectTrustRequired: true,
    executesCode: false,
    commandPolicy: "not-applicable",
    sandboxCapability: "not_provided",
    credentialPolicy: "no-credentials-required",
    externalIntegration: "disabled-by-default",
    destructiveOperationPolicy: "forbidden",
    formatName: "Agent Skills SKILL.md",
    formatVersion: "v1",
    readinessState: "ready",
  },
  "pi-prompt-templates": {
    pathPatterns: [".pi/prompts/<name>.md"],
    producerLane: "I-14B-pi-adapter-runtime-skill-consumption",
    consumedByLanes: ["I-14B-pi-adapter-runtime-skill-consumption", "I-15A-create-import-cli-ux-selected-harness"],
    ownerKind: "lane",
    allowedOperations: ["generate-in-later-lane", "validate"],
    trustClassification: "project-instruction",
    projectTrustRequired: true,
    executesCode: false,
    commandPolicy: "not-applicable",
    sandboxCapability: "not_provided",
    credentialPolicy: "no-credentials-required",
    externalIntegration: "disabled-by-default",
    destructiveOperationPolicy: "forbidden",
    formatName: "Pi prompt template markdown",
    formatVersion: "v1",
    readinessState: "ready",
  },
  "pi-extensions": {
    pathPatterns: [".pi/extensions/<name>.ts", ".pi/extensions/<name>/index.ts"],
    producerLane: "I-14B-pi-adapter-runtime-skill-consumption",
    consumedByLanes: ["I-14B-pi-adapter-runtime-skill-consumption", "I-18-security-safety-hooks-policy", "I-21-build-skill-orchestration"],
    ownerKind: "lane",
    allowedOperations: ["generate-in-later-lane", "validate"],
    trustClassification: "executable-extension",
    projectTrustRequired: true,
    executesCode: true,
    commandPolicy: "default-deny",
    sandboxCapability: "not_provided",
    credentialPolicy: "operator-supplied-only",
    externalIntegration: "disabled-by-default",
    destructiveOperationPolicy: "approval-required",
    formatName: "Pi TypeScript extension",
    formatVersion: "v1",
    readinessState: "blocked",
  },
  "pi-package-manifest": {
    pathPatterns: ["package.json#pi"],
    producerLane: "I-14B-pi-adapter-runtime-skill-consumption",
    consumedByLanes: ["I-14B-pi-adapter-runtime-skill-consumption", "I-15B-starter-template-harness-consumption"],
    ownerKind: "lane",
    allowedOperations: ["generate-in-later-lane", "validate"],
    trustClassification: "package-manifest",
    projectTrustRequired: true,
    executesCode: true,
    commandPolicy: "default-deny",
    sandboxCapability: "not_provided",
    credentialPolicy: "operator-supplied-only",
    externalIntegration: "disabled-by-default",
    destructiveOperationPolicy: "approval-required",
    formatName: "Pi package manifest key",
    formatVersion: "v1",
    readinessState: "deferred",
  },
  "context-files": {
    pathPatterns: ["AGENTS.md", "CLAUDE.md"],
    producerLane: "I-15A-create-import-cli-ux-selected-harness",
    consumedByLanes: ["I-15A-create-import-cli-ux-selected-harness", "I-08-context-graph-index-drift", "I-21-build-skill-orchestration"],
    ownerKind: "lane",
    allowedOperations: ["generate-in-later-lane", "validate"],
    trustClassification: "project-instruction",
    projectTrustRequired: true,
    executesCode: false,
    commandPolicy: "not-applicable",
    sandboxCapability: "not_provided",
    credentialPolicy: "no-credentials-required",
    externalIntegration: "disabled-by-default",
    destructiveOperationPolicy: "forbidden",
    formatName: "Pi context file",
    formatVersion: "v1",
    readinessState: "ready",
  },
  "harness-config": {
    pathPatterns: ["generated harness config field: agenticHarness=pi", "generated harness config field: adapterCapabilityVersion", "generated harness config field: generatedFileManifestVersion"],
    producerLane: "I-15A-create-import-cli-ux-selected-harness",
    consumedByLanes: ["I-15A-create-import-cli-ux-selected-harness", "I-15B-starter-template-harness-consumption", "I-21-build-skill-orchestration"],
    ownerKind: "lane",
    allowedOperations: ["generate-in-later-lane", "validate"],
    trustClassification: "configuration",
    projectTrustRequired: false,
    executesCode: false,
    commandPolicy: "not-applicable",
    sandboxCapability: "not_provided",
    credentialPolicy: "no-credentials-required",
    externalIntegration: "disabled-by-default",
    destructiveOperationPolicy: "forbidden",
    formatName: "vibe-engineer harness adapter config",
    formatVersion: "v1",
    readinessState: "ready",
  },
};

const validateEvidenceRecord = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["state", "source", "notes"], issues)) {
    return;
  }
  checkLiteral(value.state, EVIDENCE_STATES, `${path}.state`, issues);
  checkString(value.source, `${path}.source`, issues);
  checkString(value.notes, `${path}.notes`, issues);
};

const validateCapabilitySurface = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["evidence", "support", "details", "downstreamConsequence"], issues)) {
    return;
  }
  validateEvidenceRecord(value.evidence, `${path}.evidence`, issues);
  checkLiteral(value.support, READINESS_STATES, `${path}.support`, issues);
  checkString(value.details, `${path}.details`, issues);
  checkString(value.downstreamConsequence, `${path}.downstreamConsequence`, issues);
};

const validateVersionCompatibility = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["harnessName", "harnessVersionRange", "resourceFormatVersion", "runtimeRequirements", "compatibilityEvidence"], issues)) {
    return;
  }
  checkString(value.harnessName, `${path}.harnessName`, issues);
  checkString(value.harnessVersionRange, `${path}.harnessVersionRange`, issues);
  checkString(value.resourceFormatVersion, `${path}.resourceFormatVersion`, issues);
  checkStringArray(value.runtimeRequirements, `${path}.runtimeRequirements`, issues, true);
  validateEvidenceRecord(value.compatibilityEvidence, `${path}.compatibilityEvidence`, issues);
};

const validateSkillCapability = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["skillId", "nativeCommand", "resourceFamily", "evidence", "readiness", "protocolSource"], issues)) {
    return;
  }
  checkLiteral(value.skillId, SKILL_IDS, `${path}.skillId`, issues);
  checkString(value.nativeCommand, `${path}.nativeCommand`, issues);
  checkLiteral(value.resourceFamily, GENERATED_FILE_FAMILY_IDS, `${path}.resourceFamily`, issues);
  validateEvidenceRecord(value.evidence, `${path}.evidence`, issues);
  checkLiteral(value.readiness, READINESS_STATES, `${path}.readiness`, issues);
  checkString(value.protocolSource, `${path}.protocolSource`, issues);
};

const validateSkillsCommandsSurface = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["evidence", "support", "details", "downstreamConsequence", "nativeFormat", "autoloadDiscovery", "skills"], issues)) {
    return;
  }
  validateEvidenceRecord(value.evidence, `${path}.evidence`, issues);
  checkLiteral(value.support, READINESS_STATES, `${path}.support`, issues);
  checkString(value.details, `${path}.details`, issues);
  checkString(value.downstreamConsequence, `${path}.downstreamConsequence`, issues);
  checkString(value.nativeFormat, `${path}.nativeFormat`, issues);
  checkStringArray(value.autoloadDiscovery, `${path}.autoloadDiscovery`, issues, true);
  if (checkArray(value.skills, `${path}.skills`, issues)) {
    for (let index = 0; index < value.skills.length; index += 1) {
      validateSkillCapability(value.skills[index], `${path}.skills[${index}]`, issues);
    }
  }
};

const validateSubagentOrPlanCapability = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["evidence", "support", "details", "downstreamConsequence", "implementationKind", "requiresGeneratedExtension"], issues)) {
    return;
  }
  validateEvidenceRecord(value.evidence, `${path}.evidence`, issues);
  checkLiteral(value.support, READINESS_STATES, `${path}.support`, issues);
  checkString(value.details, `${path}.details`, issues);
  checkString(value.downstreamConsequence, `${path}.downstreamConsequence`, issues);
  checkLiteral(value.implementationKind, ["built-in", "extension-built", "external", "unsupported"], `${path}.implementationKind`, issues);
  checkBoolean(value.requiresGeneratedExtension, `${path}.requiresGeneratedExtension`, issues);
};

const validateCommandInvocationModel = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["interactive", "printMode", "jsonMode", "rpcMode", "sdk", "shellCommandPolicy"], issues)) {
    return;
  }
  validateCapabilitySurface(value.interactive, `${path}.interactive`, issues);
  validateCapabilitySurface(value.printMode, `${path}.printMode`, issues);
  validateCapabilitySurface(value.jsonMode, `${path}.jsonMode`, issues);
  validateCapabilitySurface(value.rpcMode, `${path}.rpcMode`, issues);
  validateCapabilitySurface(value.sdk, `${path}.sdk`, issues);
  checkLiteral(value.shellCommandPolicy, ["not-required", "default-deny", "blocked"], `${path}.shellCommandPolicy`, issues);
};

const validateGeneratedFilesCapability = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["evidence", "manifestSchemaVersion", "families", "downstreamConsequence"], issues)) {
    return;
  }
  validateEvidenceRecord(value.evidence, `${path}.evidence`, issues);
  checkString(value.manifestSchemaVersion, `${path}.manifestSchemaVersion`, issues);
  if (checkArray(value.families, `${path}.families`, issues)) {
    for (let index = 0; index < value.families.length; index += 1) {
      checkLiteral(value.families[index], GENERATED_FILE_FAMILY_IDS, `${path}.families[${index}]`, issues);
    }
  }
  checkString(value.downstreamConsequence, `${path}.downstreamConsequence`, issues);
};

const validatePackageDistributionCapability = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["evidence", "support", "details", "downstreamConsequence", "distributionKinds", "trustUpdatePolicy"], issues)) {
    return;
  }
  validateEvidenceRecord(value.evidence, `${path}.evidence`, issues);
  checkLiteral(value.support, READINESS_STATES, `${path}.support`, issues);
  checkString(value.details, `${path}.details`, issues);
  checkString(value.downstreamConsequence, `${path}.downstreamConsequence`, issues);
  if (checkArray(value.distributionKinds, `${path}.distributionKinds`, issues)) {
    for (let index = 0; index < value.distributionKinds.length; index += 1) {
      checkLiteral(value.distributionKinds[index], ["project-local-files", "pi-package", "npm-package", "global-install"], `${path}.distributionKinds[${index}]`, issues);
    }
  }
  checkString(value.trustUpdatePolicy, `${path}.trustUpdatePolicy`, issues);
};

const validateSecurityTrustCapability = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["evidence", "projectTrustRequired", "extensionExecution", "commandPolicy", "sandboxCapability", "credentialPolicy", "destructiveOperations", "externalIntegration", "trustBoundary"], issues)) {
    return;
  }
  validateEvidenceRecord(value.evidence, `${path}.evidence`, issues);
  checkBoolean(value.projectTrustRequired, `${path}.projectTrustRequired`, issues);
  checkLiteral(value.extensionExecution, ["none", "typescript-extension", "package-extension"], `${path}.extensionExecution`, issues);
  checkLiteral(value.commandPolicy, ["default-deny", "not-applicable"], `${path}.commandPolicy`, issues);
  checkLiteral(value.sandboxCapability, SANDBOX_CAPABILITY_STATES, `${path}.sandboxCapability`, issues);
  checkLiteral(value.credentialPolicy, ["no-credentials-required", "operator-supplied-only", "unknown-blocked"], `${path}.credentialPolicy`, issues);
  checkLiteral(value.destructiveOperations, ["forbidden", "approval-required", "not-applicable"], `${path}.destructiveOperations`, issues);
  checkLiteral(value.externalIntegration, ["disabled-by-default", "read-only", "unknown-blocked"], `${path}.externalIntegration`, issues);
  checkString(value.trustBoundary, `${path}.trustBoundary`, issues);
};

const validateCapabilityFlags = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["skills", "prompts", "hooks", "extensions", "subagents", "planMode", "contextFiles", "rpc", "sdk", "jsonMode", "packages", "ui", "unsupportedFeaturePolicy"], issues)) {
    return;
  }
  for (const key of ["skills", "prompts", "hooks", "extensions", "subagents", "planMode", "contextFiles", "rpc", "sdk", "jsonMode", "packages", "ui"] as const) {
    checkBoolean(value[key], `${path}.${key}`, issues);
  }
  checkLiteral(value.unsupportedFeaturePolicy, ["block", "defer", "unknown-block"], `${path}.unsupportedFeaturePolicy`, issues);
};

const validateRealBoundaryWitness = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["evidence", "boundaryStatus", "producer", "carrier", "consumer", "evidencePath", "runtimeExecutionClaim"], issues)) {
    return;
  }
  validateEvidenceRecord(value.evidence, `${path}.evidence`, issues);
  checkLiteral(value.boundaryStatus, ["implemented", "pending-live", "blocked", "deferred", "unknown"], `${path}.boundaryStatus`, issues);
  checkString(value.producer, `${path}.producer`, issues);
  checkString(value.carrier, `${path}.carrier`, issues);
  checkString(value.consumer, `${path}.consumer`, issues);
  checkString(value.evidencePath, `${path}.evidencePath`, issues);
  validateI14ARuntimeExecutionClaim(value.runtimeExecutionClaim, `${path}.runtimeExecutionClaim`, issues);
};

const validateSelection = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["manifestSelectable", "createImportSelectable", "readiness", "reason"], issues)) {
    return;
  }
  checkBoolean(value.manifestSelectable, `${path}.manifestSelectable`, issues);
  checkBoolean(value.createImportSelectable, `${path}.createImportSelectable`, issues);
  checkLiteral(value.readiness, READINESS_STATES, `${path}.readiness`, issues);
  checkString(value.reason, `${path}.reason`, issues);
};

const validateAdapterCapability = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, [
    "adapterId",
    "displayName",
    "evidenceStatus",
    "versionCompatibility",
    "skillsCommandsSurface",
    "promptTemplateSurface",
    "hookEventSupport",
    "subagentCapability",
    "planModeCapability",
    "contextFileConventions",
    "commandInvocationModel",
    "generatedFiles",
    "packageDistribution",
    "securityTrust",
    "capabilityFlags",
    "realBoundaryWitness",
    "selection",
  ], issues)) {
    return;
  }
  checkString(value.adapterId, `${path}.adapterId`, issues);
  checkString(value.displayName, `${path}.displayName`, issues);
  validateEvidenceRecord(value.evidenceStatus, `${path}.evidenceStatus`, issues);
  validateVersionCompatibility(value.versionCompatibility, `${path}.versionCompatibility`, issues);
  validateSkillsCommandsSurface(value.skillsCommandsSurface, `${path}.skillsCommandsSurface`, issues);
  validateCapabilitySurface(value.promptTemplateSurface, `${path}.promptTemplateSurface`, issues);
  validateCapabilitySurface(value.hookEventSupport, `${path}.hookEventSupport`, issues);
  validateSubagentOrPlanCapability(value.subagentCapability, `${path}.subagentCapability`, issues);
  validateSubagentOrPlanCapability(value.planModeCapability, `${path}.planModeCapability`, issues);
  validateCapabilitySurface(value.contextFileConventions, `${path}.contextFileConventions`, issues);
  validateCommandInvocationModel(value.commandInvocationModel, `${path}.commandInvocationModel`, issues);
  validateGeneratedFilesCapability(value.generatedFiles, `${path}.generatedFiles`, issues);
  validatePackageDistributionCapability(value.packageDistribution, `${path}.packageDistribution`, issues);
  validateSecurityTrustCapability(value.securityTrust, `${path}.securityTrust`, issues);
  validateCapabilityFlags(value.capabilityFlags, `${path}.capabilityFlags`, issues);
  validateRealBoundaryWitness(value.realBoundaryWitness, `${path}.realBoundaryWitness`, issues);
  validateSelection(value.selection, `${path}.selection`, issues);
};

const validateGeneratedFileOwner = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["ownerKind", "ownerId", "writePathScope", "allowedOperations"], issues)) {
    return;
  }
  checkLiteral(value.ownerKind, ["lane", "package"], `${path}.ownerKind`, issues);
  checkLiteral(value.ownerId, GENERATED_FILE_PRODUCER_LANE_IDS, `${path}.ownerId`, issues);
  checkStringArray(value.writePathScope, `${path}.writePathScope`, issues, true);
  if (checkArray(value.allowedOperations, `${path}.allowedOperations`, issues)) {
    for (let index = 0; index < value.allowedOperations.length; index += 1) {
      checkLiteral(value.allowedOperations[index], ["declare", "validate", "generate-in-later-lane"], `${path}.allowedOperations[${index}]`, issues);
    }
  }
};

const validateGeneratedFileTrustSecurity = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["classification", "trustBoundary", "projectTrustRequired", "executesCode", "commandPolicy", "sandboxCapability", "credentialPolicy", "externalIntegration", "destructiveOperationPolicy", "evidence"], issues)) {
    return;
  }
  checkLiteral(value.classification, ["project-instruction", "executable-extension", "package-manifest", "configuration"], `${path}.classification`, issues);
  checkString(value.trustBoundary, `${path}.trustBoundary`, issues);
  checkBoolean(value.projectTrustRequired, `${path}.projectTrustRequired`, issues);
  checkBoolean(value.executesCode, `${path}.executesCode`, issues);
  checkLiteral(value.commandPolicy, ["default-deny", "not-applicable"], `${path}.commandPolicy`, issues);
  checkLiteral(value.sandboxCapability, SANDBOX_CAPABILITY_STATES, `${path}.sandboxCapability`, issues);
  checkLiteral(value.credentialPolicy, ["no-credentials-required", "operator-supplied-only", "unknown-blocked"], `${path}.credentialPolicy`, issues);
  checkLiteral(value.externalIntegration, ["disabled-by-default", "read-only", "unknown-blocked"], `${path}.externalIntegration`, issues);
  checkLiteral(value.destructiveOperationPolicy, ["forbidden", "approval-required", "not-applicable"], `${path}.destructiveOperationPolicy`, issues);
  validateEvidenceRecord(value.evidence, `${path}.evidence`, issues);
};

const validateGeneratedFileVersion = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["formatName", "formatVersion", "schemaVersion", "adapterCapabilityVersion"], issues)) {
    return;
  }
  checkString(value.formatName, `${path}.formatName`, issues);
  checkString(value.formatVersion, `${path}.formatVersion`, issues);
  checkLiteral(value.schemaVersion, ["pi-generated-file-manifest/v1"], `${path}.schemaVersion`, issues);
  checkLiteral(value.adapterCapabilityVersion, ["pi-adapter-capability-matrix/v1"], `${path}.adapterCapabilityVersion`, issues);
};

const validateGeneratedFileReadiness = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["state", "reason"], issues)) {
    return;
  }
  checkLiteral(value.state, READINESS_STATES, `${path}.state`, issues);
  checkString(value.reason, `${path}.reason`, issues);
};

const validateGeneratedFileFamily = (value: unknown, path: string, issues: ValidationIssue[]): void => {
  if (!checkExactObject(value, path, ["familyId", "description", "pathPatterns", "owner", "producedByLane", "consumedByLanes", "trustSecurity", "version", "readiness"], issues)) {
    return;
  }
  checkLiteral(value.familyId, GENERATED_FILE_FAMILY_IDS, `${path}.familyId`, issues);
  checkString(value.description, `${path}.description`, issues);
  checkStringArray(value.pathPatterns, `${path}.pathPatterns`, issues, true);
  validateGeneratedFileOwner(value.owner, `${path}.owner`, issues);
  checkLiteral(value.producedByLane, GENERATED_FILE_PRODUCER_LANE_IDS, `${path}.producedByLane`, issues);
  if (checkArray(value.consumedByLanes, `${path}.consumedByLanes`, issues)) {
    if (value.consumedByLanes.length === 0) {
      addIssue(issues, `${path}.consumedByLanes`, "empty_array", "Array must not be empty.");
    }
    for (let index = 0; index < value.consumedByLanes.length; index += 1) {
      checkLiteral(value.consumedByLanes[index], GENERATED_FILE_CONSUMER_LANE_IDS, `${path}.consumedByLanes[${index}]`, issues);
    }
  }
  validateGeneratedFileTrustSecurity(value.trustSecurity, `${path}.trustSecurity`, issues);
  validateGeneratedFileVersion(value.version, `${path}.version`, issues);
  validateGeneratedFileReadiness(value.readiness, `${path}.readiness`, issues);
};

const collectDuplicateStrings = (values: readonly string[]): readonly string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates].sort();
};

const getRecordArray = (value: unknown): readonly JsonObject[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
};

export const validateCapabilityMatrix = (value: unknown): ValidationResult<AdapterCapabilityMatrix> => {
  const issues: ValidationIssue[] = [];
  if (!checkExactObject(value, "$", ["schemaVersion", "producedByLane", "adapterPackage", "adapters"], issues)) {
    return { valid: false, issues };
  }
  checkLiteral(value.schemaVersion, ["pi-adapter-capability-matrix/v1"], "$.schemaVersion", issues);
  checkLiteral(value.producedByLane, ["I-14A-pi-adapter-capability-generated-file-manifest"], "$.producedByLane", issues);
  checkLiteral(value.adapterPackage, ["@vibe-engineer/adapter-pi"], "$.adapterPackage", issues);
  if (checkArray(value.adapters, "$.adapters", issues)) {
    if (value.adapters.length === 0) {
      addIssue(issues, "$.adapters", "empty_adapters", "Capability matrix must contain adapter rows.");
    }
    for (let index = 0; index < value.adapters.length; index += 1) {
      validateAdapterCapability(value.adapters[index], `$.adapters[${index}]`, issues);
    }
  }

  const adapters = getRecordArray(value.adapters);
  const ids = adapters.map((adapter) => (typeof adapter.adapterId === "string" ? adapter.adapterId : ""));
  for (const duplicate of collectDuplicateStrings(ids.filter((id) => id.length > 0))) {
    addIssue(issues, "$.adapters", "duplicate_adapter_id", `Duplicate adapter id '${duplicate}'.`);
  }
  const piAdapter = adapters.find((adapter) => adapter.adapterId === "pi");
  if (piAdapter === undefined) {
    addIssue(issues, "$.adapters", "missing_pi_adapter", "Capability matrix must include stable adapter id 'pi'.");
  }

  for (const [index, adapter] of adapters.entries()) {
    const adapterPath = `$.adapters[${index}]`;
    const selection = isRecord(adapter.selection) ? adapter.selection : undefined;
    const flags = isRecord(adapter.capabilityFlags) ? adapter.capabilityFlags : undefined;
    const evidenceStatus = isRecord(adapter.evidenceStatus) ? adapter.evidenceStatus : undefined;
    const skillsSurface = isRecord(adapter.skillsCommandsSurface) ? adapter.skillsCommandsSurface : undefined;
    const adapterId = typeof adapter.adapterId === "string" ? adapter.adapterId : "";

    if (flags?.unsupportedFeaturePolicy !== "block") {
      addIssue(issues, `${adapterPath}.capabilityFlags.unsupportedFeaturePolicy`, "unsupported_feature_policy_not_blocking", "Unsupported features must block instead of silently no-oping.");
    }

    if (adapterId !== "pi") {
      if (selection?.manifestSelectable === true || selection?.createImportSelectable === true || selection?.readiness === "ready") {
        addIssue(issues, `${adapterPath}.selection`, "non_pi_selectable", "Non-pi adapter rows must never be selectable or ready.");
      }
      if (evidenceStatus?.state === "known") {
        addIssue(issues, `${adapterPath}.evidenceStatus.state`, "non_pi_known_claim", "Non-pi adapter rows must remain explicit unknown/deferred/blocked until future evidence-backed decisions.");
      }
      for (const flagKey of ["skills", "prompts", "hooks", "extensions", "subagents", "planMode", "contextFiles", "rpc", "sdk", "jsonMode", "packages", "ui"] as const) {
        if (flags?.[flagKey] === true) {
          addIssue(issues, `${adapterPath}.capabilityFlags.${flagKey}`, "non_pi_enabled_flag", "Non-pi capability flags cannot be enabled in v1.");
        }
      }
    }

    if (adapterId === "pi") {
      if (selection?.manifestSelectable !== true) {
        addIssue(issues, `${adapterPath}.selection.manifestSelectable`, "pi_manifest_not_selectable", "The pi manifest contract must be selectable for downstream manifest consumers.");
      }
      if (selection?.createImportSelectable !== false) {
        addIssue(issues, `${adapterPath}.selection.createImportSelectable`, "create_import_claim_out_of_scope", "I-14A must not claim create/import selectable behavior.");
      }
      if (evidenceStatus?.state !== "known") {
        addIssue(issues, `${adapterPath}.evidenceStatus.state`, "pi_evidence_not_known", "The pi adapter row must carry known design evidence for this contract.");
      }
      const skills = Array.isArray(skillsSurface?.skills) ? skillsSurface.skills : [];
      const skillIds = skills.map((skill) => (isRecord(skill) && typeof skill.skillId === "string" ? skill.skillId : ""));
      for (const expectedSkill of SKILL_IDS) {
        if (!skillIds.includes(expectedSkill)) {
          addIssue(issues, `${adapterPath}.skillsCommandsSurface.skills`, "missing_skill_mapping", `Missing required six-skill mapping '${expectedSkill}'.`);
        }
      }
      for (const duplicate of collectDuplicateStrings(skillIds.filter((id) => id.length > 0))) {
        addIssue(issues, `${adapterPath}.skillsCommandsSurface.skills`, "duplicate_skill_mapping", `Duplicate skill mapping '${duplicate}'.`);
      }
    }

    if (flags?.skills === true && skillsSurface?.evidence !== undefined && isRecord(skillsSurface.evidence) && skillsSurface.evidence.state !== "known") {
      addIssue(issues, `${adapterPath}.capabilityFlags.skills`, "flag_without_known_evidence", "Enabled skill capability requires known evidence.");
    }
    if (flags?.prompts === true && isRecord(adapter.promptTemplateSurface) && isRecord(adapter.promptTemplateSurface.evidence) && adapter.promptTemplateSurface.evidence.state !== "known") {
      addIssue(issues, `${adapterPath}.capabilityFlags.prompts`, "flag_without_known_evidence", "Enabled prompt capability requires known evidence.");
    }
    if (flags?.hooks === true && isRecord(adapter.hookEventSupport) && isRecord(adapter.hookEventSupport.evidence) && adapter.hookEventSupport.evidence.state !== "known") {
      addIssue(issues, `${adapterPath}.capabilityFlags.hooks`, "flag_without_known_evidence", "Enabled hook capability requires known evidence.");
    }
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }
  return { valid: true, value: value as unknown as AdapterCapabilityMatrix, issues: [] };
};

export const validateGeneratedFileManifest = (value: unknown): ValidationResult<GeneratedFileManifest> => {
  const issues: ValidationIssue[] = [];
  if (!checkExactObject(value, "$", ["schemaVersion", "adapterId", "adapterCapabilityVersion", "producedByLane", "families"], issues)) {
    return { valid: false, issues };
  }
  checkLiteral(value.schemaVersion, ["pi-generated-file-manifest/v1"], "$.schemaVersion", issues);
  checkLiteral(value.adapterId, ["pi"], "$.adapterId", issues);
  checkLiteral(value.adapterCapabilityVersion, ["pi-adapter-capability-matrix/v1"], "$.adapterCapabilityVersion", issues);
  checkLiteral(value.producedByLane, ["I-14A-pi-adapter-capability-generated-file-manifest"], "$.producedByLane", issues);
  if (checkArray(value.families, "$.families", issues)) {
    if (value.families.length === 0) {
      addIssue(issues, "$.families", "empty_families", "Generated-file manifest must enumerate file families.");
    }
    for (let index = 0; index < value.families.length; index += 1) {
      validateGeneratedFileFamily(value.families[index], `$.families[${index}]`, issues);
    }
  }

  const families = getRecordArray(value.families);
  const familyIds = families.map((family) => (typeof family.familyId === "string" ? family.familyId : ""));
  for (const expectedFamily of GENERATED_FILE_FAMILY_IDS) {
    if (!familyIds.includes(expectedFamily)) {
      addIssue(issues, "$.families", "missing_generated_file_family", `Missing generated-file family '${expectedFamily}'.`);
    }
  }
  for (const duplicate of collectDuplicateStrings(familyIds.filter((id) => id.length > 0))) {
    addIssue(issues, "$.families", "duplicate_generated_file_family", `Duplicate generated-file family '${duplicate}'.`);
  }

  for (const [index, family] of families.entries()) {
    const familyPath = `$.families[${index}]`;
    const owner = isRecord(family.owner) ? family.owner : undefined;
    const trustSecurity = isRecord(family.trustSecurity) ? family.trustSecurity : undefined;
    const version = isRecord(family.version) ? family.version : undefined;
    const readiness = isRecord(family.readiness) ? family.readiness : undefined;
    const consumedByLanes = Array.isArray(family.consumedByLanes) ? family.consumedByLanes : [];
    if (!owner || !trustSecurity || !version || !readiness || consumedByLanes.length === 0) {
      addIssue(issues, familyPath, "missing_fail_closed_metadata", "Owner, security/trust, version, readiness, and consumer data are mandatory.");
    }
    if (typeof family.familyId === "string" && GENERATED_FILE_FAMILY_IDS.includes(family.familyId as GeneratedFileFamilyId)) {
      const contract = GENERATED_FILE_FAMILY_CONTRACTS[family.familyId as GeneratedFileFamilyId];
      checkExactStringSet(
        family.pathPatterns,
        contract.pathPatterns,
        `${familyPath}.pathPatterns`,
        "missing_required_path_pattern",
        issues,
        `Generated-file family '${family.familyId}' must declare exactly the required path patterns: ${contract.pathPatterns.join(", ")}.`,
      );
      if (family.producedByLane !== contract.producerLane) {
        addIssue(issues, `${familyPath}.producedByLane`, "unsupported_value", `Generated-file family '${family.familyId}' must be produced by '${contract.producerLane}'.`);
      }
      checkExactStringSet(
        family.consumedByLanes,
        contract.consumedByLanes,
        `${familyPath}.consumedByLanes`,
        "unsupported_value",
        issues,
        `Generated-file family '${family.familyId}' must declare exactly the typed consumer lanes: ${contract.consumedByLanes.join(", ")}.`,
      );
      if (owner !== undefined) {
        if (owner.ownerKind !== contract.ownerKind) {
          addIssue(issues, `${familyPath}.owner.ownerKind`, "unsupported_value", `Generated-file family '${family.familyId}' must be owned by a lane.`);
        }
        if (owner.ownerId !== contract.producerLane) {
          addIssue(issues, `${familyPath}.owner.ownerId`, "unsupported_value", `Generated-file family '${family.familyId}' owner lane must be '${contract.producerLane}'.`);
        }
        checkExactStringSet(
          owner.writePathScope,
          contract.pathPatterns,
          `${familyPath}.owner.writePathScope`,
          "missing_required_path_pattern",
          issues,
          `Generated-file family '${family.familyId}' owner write scope must exactly match required path patterns.`,
        );
        checkExactStringSet(
          owner.allowedOperations,
          contract.allowedOperations,
          `${familyPath}.owner.allowedOperations`,
          "unsupported_value",
          issues,
          `Generated-file family '${family.familyId}' owner operations must be typed and exact.`,
        );
      }
      if (trustSecurity !== undefined) {
        if (trustSecurity.classification !== contract.trustClassification) {
          addIssue(issues, `${familyPath}.trustSecurity.classification`, "unsupported_value", `Generated-file family '${family.familyId}' must use trust classification '${contract.trustClassification}'.`);
        }
        if (trustSecurity.projectTrustRequired !== contract.projectTrustRequired) {
          addIssue(issues, `${familyPath}.trustSecurity.projectTrustRequired`, "unsupported_value", `Generated-file family '${family.familyId}' project-trust metadata must be exact.`);
        }
        if (trustSecurity.executesCode !== contract.executesCode) {
          addIssue(issues, `${familyPath}.trustSecurity.executesCode`, "unsupported_value", `Generated-file family '${family.familyId}' executable-code metadata must be exact.`);
        }
        if (trustSecurity.commandPolicy !== contract.commandPolicy) {
          addIssue(issues, `${familyPath}.trustSecurity.commandPolicy`, "unsupported_value", `Generated-file family '${family.familyId}' command policy must be '${contract.commandPolicy}'.`);
        }
        if (trustSecurity.sandboxCapability !== contract.sandboxCapability) {
          addIssue(issues, `${familyPath}.trustSecurity.sandboxCapability`, "unsupported_value", `Generated-file family '${family.familyId}' sandbox metadata must be '${contract.sandboxCapability}'.`);
        }
        if (trustSecurity.credentialPolicy !== contract.credentialPolicy) {
          addIssue(issues, `${familyPath}.trustSecurity.credentialPolicy`, "unsupported_value", `Generated-file family '${family.familyId}' credential policy must be '${contract.credentialPolicy}'.`);
        }
        if (trustSecurity.externalIntegration !== contract.externalIntegration) {
          addIssue(issues, `${familyPath}.trustSecurity.externalIntegration`, "unsupported_value", `Generated-file family '${family.familyId}' external-integration policy must be '${contract.externalIntegration}'.`);
        }
        if (trustSecurity.destructiveOperationPolicy !== contract.destructiveOperationPolicy) {
          addIssue(issues, `${familyPath}.trustSecurity.destructiveOperationPolicy`, "unsupported_value", `Generated-file family '${family.familyId}' destructive-operation policy must be '${contract.destructiveOperationPolicy}'.`);
        }
      }
      if (version !== undefined) {
        if (version.formatName !== contract.formatName) {
          addIssue(issues, `${familyPath}.version.formatName`, "unsupported_value", `Generated-file family '${family.familyId}' format name must be '${contract.formatName}'.`);
        }
        if (version.formatVersion !== contract.formatVersion) {
          addIssue(issues, `${familyPath}.version.formatVersion`, "unsupported_value", `Generated-file family '${family.familyId}' format version must be '${contract.formatVersion}'.`);
        }
      }
      if (readiness !== undefined && readiness.state !== contract.readinessState) {
        addIssue(issues, `${familyPath}.readiness.state`, "unsupported_value", `Generated-file family '${family.familyId}' readiness state must be '${contract.readinessState}'.`);
      }
    }
    if (family.familyId === "pi-extensions" && trustSecurity?.executesCode !== true) {
      addIssue(issues, `${familyPath}.trustSecurity.executesCode`, "extension_execution_not_declared", "Pi extensions execute TypeScript and must declare executable trust/security implications.");
    }
    if (family.familyId !== "pi-extensions" && trustSecurity?.executesCode === true && trustSecurity.classification !== "package-manifest") {
      addIssue(issues, `${familyPath}.trustSecurity.executesCode`, "unexpected_executable_family", "Only extension/package manifest families may declare executable behavior in this manifest.");
    }
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }
  return { valid: true, value: value as unknown as GeneratedFileManifest, issues: [] };
};

export const createDownstreamManifestSummary = (
  capabilityMatrix: AdapterCapabilityMatrix,
  generatedFileManifest: GeneratedFileManifest,
): DownstreamManifestSummary => {
  const capabilityValidation = validateCapabilityMatrix(capabilityMatrix);
  if (!capabilityValidation.valid) {
    throw new Error(`Capability matrix failed validation: ${capabilityValidation.issues.map((issue) => issue.code).join(",")}`);
  }
  const manifestValidation = validateGeneratedFileManifest(generatedFileManifest);
  if (!manifestValidation.valid) {
    throw new Error(`Generated-file manifest failed validation: ${manifestValidation.issues.map((issue) => issue.code).join(",")}`);
  }
  const piAdapter = capabilityMatrix.adapters.find((adapter) => adapter.adapterId === "pi");
  if (piAdapter === undefined) {
    throw new Error("Validated matrix unexpectedly lacks pi adapter.");
  }
  return {
    schemaVersion: "pi-adapter-downstream-summary/v1",
    adapterId: "pi",
    sixSkills: [...SKILL_IDS],
    generatedFamilies: generatedFileManifest.families.map((family) => family.familyId),
    manifestReady: piAdapter.selection.manifestSelectable,
    createImportReady: false,
    runtimeExecutionClaim: piAdapter.realBoundaryWitness.runtimeExecutionClaim,
    blockedNonPiAdapters: capabilityMatrix.adapters.filter((adapter) => adapter.adapterId !== "pi").map((adapter) => adapter.adapterId),
  };
};
