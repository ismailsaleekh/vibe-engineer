import type {
  GeneratedFileFamilyId,
  I14ARuntimeExecutionClaim,
  SkillId,
  ValidationIssue,
} from "../schema/index.ts";

export type PiRuntimeFixtureSchemaVersion = "pi-runtime-fixture/v1";
export type PiRuntimeAssetKind = "skill" | "prompt-template" | "extension" | "package-manifest" | "context" | "harness-config";
export type PiRuntimeGenerationMode = "runtime-fixture";
export type PiRuntimeValidationSeverity = "error";
export type PiRuntimeExtensionSandboxClaim = "not_provided" | "pending-live" | "blocked";

export interface PiRuntimeSkillProtocol {
  readonly skillId: SkillId;
  readonly protocolKind: "work-brief-producer" | "implementation-plan-producer" | "build-result-producer" | "ship-packet-producer";
  readonly inputArtifact: "raw-intent" | "work-brief" | "approved-implementation-plan" | "build-result";
  readonly outputArtifact: "work-brief" | "implementation-plan-with-verification-delta" | "build-result" | "ship-packet";
  readonly forbiddenArtifacts: readonly ("implementation-plan" | "build-result" | "ship-packet" | "push" | "pull-request")[];
  readonly summary: string;
}

export interface PiRuntimePromptContract {
  readonly templateName: string;
  readonly description: string;
  readonly argumentHint: string;
  readonly argumentContract: readonly string[];
  readonly skillId: SkillId;
}

export interface PiRuntimeExtensionPolicy {
  readonly defaultDeny: true;
  readonly requiresCredentialsByDefault: false;
  readonly permitsDestructiveOperationsByDefault: false;
  readonly permitsExternalMutationByDefault: false;
  readonly claimsSandboxing: PiRuntimeExtensionSandboxClaim;
  readonly runtimeExecutionClaim: I14ARuntimeExecutionClaim;
  readonly trustBoundary: string;
}

export interface PiRuntimeContextPolicy {
  readonly domainNeutral: true;
  readonly secretsAllowed: false;
  readonly businessDomainAssumptionsAllowed: false;
  readonly liveRuntimeTruthGreenClaimAllowed: false;
}

export interface PiRuntimeAssetMetadata {
  readonly generatedBy: "I-14B-pi-adapter-runtime-skill-consumption";
  readonly runtimeExecutionClaim: I14ARuntimeExecutionClaim;
  readonly skillProtocol?: PiRuntimeSkillProtocol;
  readonly promptContract?: PiRuntimePromptContract;
  readonly extensionPolicy?: PiRuntimeExtensionPolicy;
  readonly contextPolicy?: PiRuntimeContextPolicy;
}

export interface PiRuntimeAsset {
  readonly kind: PiRuntimeAssetKind;
  readonly familyId: GeneratedFileFamilyId;
  readonly path: string;
  readonly content: string;
  readonly metadata: PiRuntimeAssetMetadata;
}

export interface PiRuntimeFixture {
  readonly schemaVersion: PiRuntimeFixtureSchemaVersion;
  readonly mode: PiRuntimeGenerationMode;
  readonly adapterId: "pi";
  readonly adapterCapabilityVersion: "pi-adapter-capability-matrix/v1";
  readonly generatedFileManifestVersion: "pi-generated-file-manifest/v1";
  readonly runtimeExecutionClaim: I14ARuntimeExecutionClaim;
  readonly downstreamLiveRuntimeBlock: "pending-live/BLOCKED";
  readonly assets: readonly PiRuntimeAsset[];
}

export interface PiRuntimeValidationIssue extends ValidationIssue {
  readonly severity: PiRuntimeValidationSeverity;
}

export type PiRuntimeValidationResult<T> =
  | { readonly valid: true; readonly value: T; readonly issues: readonly [] }
  | { readonly valid: false; readonly issues: readonly PiRuntimeValidationIssue[] };

export class PiRuntimeContractError extends Error {
  readonly issues: readonly PiRuntimeValidationIssue[];

  constructor(message: string, issues: readonly PiRuntimeValidationIssue[]) {
    super(message);
    this.name = "PiRuntimeContractError";
    this.issues = issues;
  }
}
