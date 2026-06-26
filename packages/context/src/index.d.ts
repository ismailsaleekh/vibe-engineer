export const CONTEXT_SCHEMA_VERSION: '1.0.0';
export const CONTEXT_INDEX_VERSION: '1.0.0';
export const CONTEXT_SCHEMA_IDS: Readonly<Record<string, string>>;

export interface ContextFinding {
  severity: string;
  code: string;
  pointer: string;
  message: string;
  blocking: boolean;
  [key: string]: unknown;
}

export interface ContextValidationResult {
  ok: boolean;
  status: 'clean' | 'blocked';
  findings: ContextFinding[];
  [key: string]: unknown;
}

export function defaultProducer(): Record<string, unknown>;
export function createContextHeader(options: Record<string, unknown>): Record<string, unknown>;
export function writeContextProject(options: Record<string, unknown>): Promise<Record<string, unknown>>;
export function buildContextIndex(options: Record<string, unknown>): Record<string, unknown>;
export function validateContextProject(projectRoot: string, options?: Record<string, unknown>): Promise<ContextValidationResult>;
export function checkContextDrift(projectRoot: string, options?: Record<string, unknown>): Promise<ContextValidationResult>;
export function retrieveContextClosure(projectRoot: string, request: Record<string, unknown>, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
export function classifyFindings(findings: ContextFinding[]): 'clean' | 'major-local' | 'minor-local';
export const __providerSeams: Readonly<{ artifactsValidateArtifactFileType: string }>;
