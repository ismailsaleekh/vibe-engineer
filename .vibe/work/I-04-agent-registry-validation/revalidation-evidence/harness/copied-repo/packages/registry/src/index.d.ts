import type { AgentRegistryEntryV1, ArtifactKind } from '../../artifacts/src/generated/types.d.ts';

export type RegistrySeverity = 'critical' | 'major-local' | 'minor-local';

export interface RegistryValidationError {
  path: string | null;
  entryId: string | null;
  ruleId: string;
  severity: RegistrySeverity;
  pointer: string;
  schemaId: string | null;
  schemaCode: string | null;
  message: string;
  details?: unknown;
}

export interface RegistryGraphLink {
  from: string;
  to: string;
  required: boolean;
  rel?: string;
}

export interface RegistryGraph {
  validatorLinks: RegistryGraphLink[];
  fixerLinks: RegistryGraphLink[];
  topLevelLinks: RegistryGraphLink[];
}

export interface RegistryLoadOptions {
  allowedScopes?: Array<'core' | 'project_extension' | 'sample_demo'>;
  allowSamples?: boolean;
  repoRoot?: string;
}

export interface RegistryValidationResult {
  ok: boolean;
  entries: readonly AgentRegistryEntryV1[];
  entriesById: Map<string, AgentRegistryEntryV1>;
  pathById: Map<string, string>;
  graph: RegistryGraph;
  errors: readonly RegistryValidationError[];
}

export interface RegistryLoadResult extends RegistryValidationResult {
  roots: readonly string[];
  files: readonly string[];
}

export const RegistrySeverity: Readonly<Record<'CRITICAL' | 'MAJOR_LOCAL' | 'MINOR_LOCAL', RegistrySeverity>>;
export const RegistryRuleId: Readonly<Record<string, string>>;
export const LOCKED_SKILLS: readonly ['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship'];
export const PRODUCT_NAME: 'vibe-engineer';
export const ARTIFACT_FLOW: readonly ['raw_intent', 'work_brief', 'implementation_plan', 'build_result', 'ship_packet'];

export function discoverRegistryEntryFiles(roots: string | string[]): { files: string[]; errors: RegistryValidationError[] };
export function validateRegistryFiles(files: string[], options?: RegistryLoadOptions): RegistryValidationResult;
export function loadRegistry(roots: string | string[], options?: RegistryLoadOptions): RegistryLoadResult;
export function assertRegistryOk<T extends { ok: boolean; errors: readonly RegistryValidationError[] }>(result: T): T;
export function packageRootFromImportMeta(importMetaUrl?: string): string;
export function canonicalSchemaIdsByKind(): Record<ArtifactKind, string>;
export type { AgentRegistryEntryV1 };
