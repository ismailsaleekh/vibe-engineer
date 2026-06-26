import type { P0Finding, P0ValidatorResult } from "../p0/boundaries/index.js";
import type { QualityRatchetOptions, QualityRatchetResult } from "../p1/quality-ratchet/index.js";
import type { TestAntiPatternOptions, TestAntiPatternResult } from "../p1/test-anti-pattern/index.js";

export type P0AggregateFamily =
  | "p0.governed-surface"
  | "p0.config-guards"
  | "p0.boundaries"
  | "p0.allowlist"
  | "p0.domain-purity";

export interface P0AggregateOptions {
  families?: P0AggregateFamily[];
  governedSurface?: { configPath?: string };
  strictConfig?: Record<string, unknown>;
  boundaries?: { configPath?: string };
  allowlist?: { policyPath?: string; maxFileBytes?: number };
  domainPurity?: { policyPath?: string; maxFileBytes?: number };
}

export interface P0AggregateResult extends P0ValidatorResult {
  family: "p0.aggregate";
  evidence: {
    implementedFamilies: P0AggregateFamily[];
    requestedFamilies: P0AggregateFamily[];
    subresults: P0ValidatorResult[];
    summary: Record<string, unknown>;
    [key: string]: unknown;
  };
  findings: P0Finding[];
}

export function runP0Aggregate(projectRoot: string, options?: P0AggregateOptions): Promise<P0AggregateResult>;

export type P1AggregateFamily =
  | "p1.schema-contract-strictness"
  | "p1.quality-ratchet"
  | "p1.test-anti-pattern";

export interface P1SchemaContractBridgeOptions {
  sourceRoot?: string;
  sourceFiles?: string[];
  outputDir?: string;
  moduleRelativePath?: string;
}

export interface P1SchemaContractStrictnessAggregateOptions {
  manifestPath?: string;
  bridge?: P1SchemaContractBridgeOptions;
}

export interface P1QualityRatchetAggregateOptions {
  projectRoot?: string;
  options?: QualityRatchetOptions;
}

export interface P1TestAntiPatternAggregateOptions {
  projectRoot?: string;
  options?: TestAntiPatternOptions;
}

export interface P1AggregateOptions {
  families?: P1AggregateFamily[];
  schemaContractStrictness?: P1SchemaContractStrictnessAggregateOptions;
  qualityRatchet?: P1QualityRatchetAggregateOptions;
  testAntiPattern?: P1TestAntiPatternAggregateOptions;
}

export interface SchemaContractStrictnessFinding {
  family: "p1.schema-contract-strictness";
  ruleId: string;
  severity: "error" | "warning";
  blocking: boolean;
  path: string;
  message: string;
  evidence: Record<string, unknown>;
}

export interface SchemaContractStrictnessResult {
  family: "p1.schema-contract-strictness";
  ok: boolean;
  projectRoot: string;
  findings: SchemaContractStrictnessFinding[];
  evidence: Record<string, unknown>;
}

export interface P1AggregateFinding {
  family: "p1.aggregate" | P1AggregateFamily;
  ruleId: string;
  severity: "error" | "warning";
  blocking: boolean;
  path: string;
  message: string;
  evidence: Record<string, unknown>;
}

export type P1AggregateSubresult = SchemaContractStrictnessResult | QualityRatchetResult | TestAntiPatternResult;

export interface P1SchemaContractBridgeEvidence {
  carrierVersion: "p1.aggregate.i11-runner-bridge/1";
  bridgeFamily: "p1.aggregate";
  validatorFamilyExpected: "p1.schema-contract-strictness";
  sourceTsFilesUsed: string[];
  sourceRoot: string;
  outputArtifactDirectory: string;
  outputArtifactFile: string;
  moduleRelativePath: string;
  moduleUrl: string;
  exportedValidatorName: "validateSchemaContractStrictness";
  command: string | null;
  args: string[];
  cwd: string;
  status: number | null;
  stdout: string;
  stderr: string;
  signal?: string | null;
  errorMessage?: string;
  exportFound: boolean;
  validatorFamilyObserved: string | null;
  typedSubresultValidation: { ok: boolean; diagnostics: string[] };
}

export interface P1AggregateEvidence {
  schemaVersion: "p1.aggregate.result/1";
  family: "p1.aggregate";
  implementedFamilies: P1AggregateFamily[];
  requestedFamilies: string[];
  subresults: P1AggregateSubresult[];
  stableFindings: Array<{ family: string; ruleId: string; path: string; blocking: boolean }>;
  i11Bridge: P1SchemaContractBridgeEvidence | null;
  sourceApiIdentities: {
    schemaContractStrictness: string[];
    qualityRatchet: string;
    testAntiPattern: string;
  };
  sourceFiles: {
    schemaContractStrictness: string[];
    qualityRatchet: string[];
    testAntiPattern: string[];
  };
  inputPaths: {
    schemaContractStrictness: string;
    qualityRatchet: string;
    testAntiPattern: string;
  };
  summary: Record<P1AggregateFamily, { ok: boolean; findingCount?: number; missing?: boolean }>;
}

export interface P1AggregateResult {
  family: "p1.aggregate";
  ok: boolean;
  projectRoot: string;
  findings: P1AggregateFinding[];
  evidence: P1AggregateEvidence;
}

export const P1AggregateFamily: readonly P1AggregateFamily[];
export function runP1Aggregate(projectRoot: string, options?: P1AggregateOptions): Promise<P1AggregateResult>;
