export type StandardSchemaVersion = '1.0.0';

export type StandardCategory =
  | 'contracts'
  | 'documentation'
  | 'domain-neutrality'
  | 'evidence'
  | 'orchestration'
  | 'package-boundaries'
  | 'schematics'
  | 'security'
  | 'testing'
  | 'typescript'
  | 'verification';

export type StandardLevel = 'required' | 'recommended' | 'advisory';
export type StandardNeutrality = 'core' | 'extension' | 'sample-demo' | 'negative-fixture';

/** Lowercase kebab identifier validated by the runtime and JSON Schemas. */
export type KebabIdentifier = string;

/** Runtime/schema contract: arrays using this type must contain at least one item. */
export type NonEmptyArray<T> = [T, ...T[]];

export type StandardSurface =
  | 'agents'
  | 'artifacts'
  | 'commands'
  | 'config'
  | 'context'
  | 'docs'
  | 'evidence'
  | 'fixtures'
  | 'packages'
  | 'prompts'
  | 'schemas'
  | 'schematics'
  | 'skills'
  | 'standards'
  | 'verification';

export interface StandardRequirement {
  /** Unique within a standard by convention; lowercase kebab identifier. */
  id: KebabIdentifier;
  statement: string;
  verification: string;
}

export interface StandardReference {
  label: string;
  path: string;
  section?: string;
}

export interface StandardDefinition {
  schemaVersion: StandardSchemaVersion;
  /** Stable lowercase kebab identifier known to STANDARD_IDS. */
  standardId: KebabIdentifier;
  title: string;
  summary: string;
  rationale: string;
  category: StandardCategory;
  level: StandardLevel;
  neutrality: StandardNeutrality;
  /** Non-empty, unique supported surfaces. */
  appliesTo: NonEmptyArray<StandardSurface>;
  requirements: NonEmptyArray<StandardRequirement>;
  references: NonEmptyArray<StandardReference>;
  /** Optional non-empty, unique lowercase kebab identifiers. */
  tags?: NonEmptyArray<KebabIdentifier>;
}

export interface StandardsCatalog {
  schemaVersion: StandardSchemaVersion;
  catalogId: 'vibe-engineer-core-standards';
  title: string;
  summary: string;
  neutrality: 'core';
  /** Non-empty, unique lowercase kebab identifiers matching every catalog standard exactly once. */
  standardIds: NonEmptyArray<KebabIdentifier>;
  standards: NonEmptyArray<StandardDefinition>;
}

export interface StandardValidationError {
  code: string;
  pointer: string;
  message: string;
  standardId: string | null;
}

export type StandardDefinitionValidationResult =
  | { ok: true; standard: StandardDefinition; schemaVersion: StandardSchemaVersion }
  | { ok: false; errors: readonly StandardValidationError[] };

export type StandardsCatalogValidationResult =
  | { ok: true; catalog: StandardsCatalog; schemaVersion: StandardSchemaVersion }
  | { ok: false; errors: readonly StandardValidationError[] };

export class StandardsError extends Error {
  readonly code: string;
  readonly pointer: string;
  readonly standardId: string | null;
  readonly errors?: readonly StandardValidationError[];
}

export const STANDARD_ERROR_CODES: Readonly<{
  NOT_OBJECT: 'STANDARDS_NOT_OBJECT';
  REQUIRED_FIELD: 'STANDARDS_REQUIRED_FIELD';
  UNKNOWN_FIELD: 'STANDARDS_UNKNOWN_FIELD';
  INVALID_TYPE: 'STANDARDS_INVALID_TYPE';
  INVALID_VALUE: 'STANDARDS_INVALID_VALUE';
  INVALID_STANDARD_ID: 'STANDARDS_INVALID_STANDARD_ID';
  UNKNOWN_STANDARD_ID: 'STANDARDS_UNKNOWN_STANDARD_ID';
  UNSUPPORTED_SCHEMA_VERSION: 'STANDARDS_UNSUPPORTED_SCHEMA_VERSION';
  DUPLICATE_STANDARD_ID: 'STANDARDS_DUPLICATE_STANDARD_ID';
  MALFORMED_LIST: 'STANDARDS_MALFORMED_LIST';
  CATALOG_MALFORMED: 'STANDARDS_CATALOG_MALFORMED';
  SCHEMA_NOT_FOUND: 'STANDARDS_SCHEMA_NOT_FOUND';
  SCHEMA_UNREADABLE: 'STANDARDS_SCHEMA_UNREADABLE';
}>;

export const SUPPORTED_SCHEMA_VERSION: StandardSchemaVersion;
export const STANDARD_IDS: readonly string[];
export const STANDARDS_CATALOG: StandardsCatalog;

export const STANDARD_SCHEMA_KINDS: readonly ['standard-definition', 'standards-catalog'];
export const STANDARD_SCHEMA_FILES: Readonly<Record<'standard-definition' | 'standards-catalog', string>>;
export const STANDARD_SCHEMA_IDS: Readonly<Record<'standard-definition' | 'standards-catalog', string>>;

export function listStandards(): readonly string[];
export function loadStandard(id: string): StandardDefinition;
export function getStandardsCatalog(): StandardsCatalog;
export function validateStandardDefinition(definition: unknown): StandardDefinitionValidationResult;
export function validateStandardsCatalog(catalog: unknown): StandardsCatalogValidationResult;
export function schemaPathForKind(kind: string): string | undefined;
export function loadStandardsSchema(kind: 'standard-definition' | 'standards-catalog'): unknown;
export function loadAllStandardsSchemas(): Readonly<Record<'standard-definition' | 'standards-catalog', unknown>>;
