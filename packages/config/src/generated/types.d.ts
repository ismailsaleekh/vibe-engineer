export type AgenticHarness = "pi" | "claude-code" | "codex";
export type VerificationWebE2E = "playwright";
export type VerificationMobileDefaultE2E = "maestro";
export type VerificationMobileAdvancedE2E = "detox";
export type VibeConfigSchemaId = "vibe-engineer.config.v1";
export type VibeConfigSchemaVersion = "1.0.0";
export type VibeConfigResultStatus = "success" | "failure" | "blocked";
export type VibeConfigIssueCode =
  | "MISSING_CONFIG"
  | "MALFORMED_JSON"
  | "UNSUPPORTED_CONFIG_FORMAT"
  | "UNKNOWN_FIELD"
  | "SECRET_LIKE_FIELD_REJECTED"
  | "UNSUPPORTED_HARNESS"
  | "REQUIRED_FIELD"
  | "INVALID_TYPE"
  | "INVALID_RANGE"
  | "INVALID_ENUM";
export type VibeConfigIssueClassification = "missing_config" | "invalid_config";
export type VibeConfigProvenanceSource = "file" | "default";

export interface VibeVerificationMobileE2EConfig {
  readonly default: VerificationMobileDefaultE2E;
  readonly advanced: VerificationMobileAdvancedE2E;
}

export interface VibeVerificationConfig {
  readonly deterministicBlocks: boolean;
  readonly advisoryReviewBlocks: boolean;
  readonly webE2E: VerificationWebE2E;
  readonly mobileE2E: VibeVerificationMobileE2EConfig;
}

export interface VibeUiVerificationConfig {
  readonly enabled: boolean;
}

export interface VibeAgentRegistryConfig {
  readonly validationRequired: boolean;
}

export interface VibeConfig {
  readonly agenticHarness: AgenticHarness;
  readonly maxParallelAgents: number;
  readonly maxValidationFixIterations: number;
  readonly agenticWorkPackageTargetHours: number;
  readonly verification: VibeVerificationConfig;
  readonly uiVerification: VibeUiVerificationConfig;
  readonly agentRegistry: VibeAgentRegistryConfig;
}

export interface VibeConfigIssue {
  readonly code: VibeConfigIssueCode;
  readonly classification: VibeConfigIssueClassification;
  readonly path: string;
  readonly message: string;
  readonly blocking: true;
  readonly redacted: true;
  readonly supportedValues?: readonly AgenticHarness[];
  readonly deferredValues?: readonly string[];
}

export interface VibeConfigDiagnostic {
  readonly severity: "error";
  readonly code: VibeConfigIssueCode;
  readonly classification: VibeConfigIssueClassification;
  readonly path: string;
  readonly message: string;
  readonly redacted: true;
}

export interface VibeConfigProvenanceEntry {
  readonly source: VibeConfigProvenanceSource;
}

export interface VibeConfigProvenance {
  readonly "/agenticHarness"?: VibeConfigProvenanceEntry;
  readonly "/maxParallelAgents"?: VibeConfigProvenanceEntry;
  readonly "/maxValidationFixIterations"?: VibeConfigProvenanceEntry;
  readonly "/agenticWorkPackageTargetHours"?: VibeConfigProvenanceEntry;
  readonly "/verification/deterministicBlocks"?: VibeConfigProvenanceEntry;
  readonly "/verification/advisoryReviewBlocks"?: VibeConfigProvenanceEntry;
  readonly "/verification/webE2E"?: VibeConfigProvenanceEntry;
  readonly "/verification/mobileE2E/default"?: VibeConfigProvenanceEntry;
  readonly "/verification/mobileE2E/advanced"?: VibeConfigProvenanceEntry;
  readonly "/uiVerification/enabled"?: VibeConfigProvenanceEntry;
  readonly "/agentRegistry/validationRequired"?: VibeConfigProvenanceEntry;
}

export interface VibeConfigSuccessResult {
  readonly ok: true;
  readonly status: "success";
  readonly schemaId: VibeConfigSchemaId;
  readonly schemaVersion: VibeConfigSchemaVersion;
  readonly config: VibeConfig;
  readonly provenance: VibeConfigProvenance;
  readonly diagnostics: readonly [];
  readonly configPath?: string;
  readonly projectRoot?: string;
}

export interface VibeConfigFailureResult {
  readonly ok: false;
  readonly status: "failure" | "blocked";
  readonly schemaId: VibeConfigSchemaId;
  readonly schemaVersion: VibeConfigSchemaVersion;
  readonly classification: VibeConfigIssueClassification;
  readonly issues: readonly VibeConfigIssue[];
  readonly diagnostics: readonly VibeConfigDiagnostic[];
  readonly configPath?: string;
  readonly projectRoot?: string;
}

export type VibeConfigResult = VibeConfigSuccessResult | VibeConfigFailureResult;

export interface VibeConfigSchemaContract {
  readonly id: VibeConfigSchemaId;
  readonly version: VibeConfigSchemaVersion;
  readonly configFileName: "vibe-engineer.config.json";
  readonly requiredTopLevelKeys: readonly ["agenticHarness"];
  readonly topLevelKeys: readonly string[];
  readonly supportedAgenticHarnesses: readonly AgenticHarness[];
  readonly deferredAgenticHarnesses: readonly [];
  readonly defaults: Omit<VibeConfig, "agenticHarness">;
  readonly ranges: {
    readonly maxParallelAgents: { readonly integer: true; readonly min: 1; readonly max: 8 };
    readonly maxValidationFixIterations: {
      readonly integer: true;
      readonly min: 1;
      readonly max: 3;
    };
    readonly agenticWorkPackageTargetHours: {
      readonly integer: false;
      readonly exclusiveMin: 0;
      readonly max: 6;
    };
  };
}

export const VIBE_CONFIG_FILE_NAME: "vibe-engineer.config.json";
export const VIBE_CONFIG_SCHEMA_ID: VibeConfigSchemaId;
export const VIBE_CONFIG_SCHEMA_VERSION: VibeConfigSchemaVersion;
export const SUPPORTED_AGENTIC_HARNESSES: readonly ["pi", "claude-code", "codex"];
export const VIBE_CONFIG_SCHEMA: VibeConfigSchemaContract;

export function createDefaultVibeConfig(options: {
  readonly agenticHarness: AgenticHarness;
}): VibeConfig;
export function parseVibeConfig(input: unknown): VibeConfigResult;
export function loadVibeConfigFile(configPath: string): Promise<VibeConfigResult>;
export function loadVibeConfigFromProjectRoot(projectRoot: string): Promise<VibeConfigResult>;
