export type CliStatus = "success" | "failure" | "blocked" | "partial";

export interface CliInvocation {
  id: string;
  command: string;
  argv: string[];
  projectRoot: string | null;
  configPath: string | null;
  startedAt: string;
  endedAt: string;
}

export interface CliPayload<TData extends Record<string, unknown> = Record<string, unknown>> {
  kind: string;
  schemaVersion: string;
  data: TData;
}

export interface CliDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  classification: string;
  message: string;
  path?: string | null;
  span?: unknown;
  hint?: string | null;
}

export interface CliErrorItem {
  code: string;
  classification: string;
  retryable: boolean;
  blocking: boolean;
  message: string;
  details: Record<string, unknown>;
}

export interface CliArtifactDescriptor {
  kind: string;
  path: string;
  schemaVersion: string | null;
  role: string;
  sha256: string | null;
}

export interface CliResultEnvelope<
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  schemaVersion: typeof CLI_RESULT_SCHEMA_VERSION;
  invocation: CliInvocation;
  status: CliStatus;
  exitCode: number;
  payload: CliPayload<TData>;
  diagnostics: CliDiagnostic[];
  artifacts: CliArtifactDescriptor[];
  errors: CliErrorItem[];
}

export interface CliEnvelopeValidationResult {
  ok: boolean;
  envelope?: CliResultEnvelope;
  errors?: string[];
}

export const CLI_RESULT_SCHEMA_VERSION: "vibe-engineer.cli.result.v1";
export const CLI_STATUSES: readonly CliStatus[];

export function exitCodeFor(status: CliStatus, classification?: string | null): number;
export function artifactDescriptor(input: {
  kind: string;
  path: string;
  schemaVersion?: string | null;
  role: string;
  sha256?: string | null;
}): CliArtifactDescriptor;
export function createEnvelope<
  TData extends Record<string, unknown> = Record<string, unknown>,
>(input: {
  invocation: CliInvocation;
  status: CliStatus;
  payload: CliPayload<TData>;
  diagnostics?: CliDiagnostic[];
  artifacts?: CliArtifactDescriptor[];
  errors?: CliErrorItem[];
  exitCode?: number | null;
}): CliResultEnvelope<TData>;
export function payload<TData extends Record<string, unknown> = Record<string, unknown>>(
  kind: string,
  data?: TData,
  schemaVersion?: string,
): CliPayload<TData>;
export function invalidInvocationEnvelope(
  invocation: CliInvocation,
  input: {
    code?: string;
    classification?: string;
    message: string;
    details?: Record<string, unknown>;
  },
): CliResultEnvelope;
export function internalErrorEnvelope(invocation: CliInvocation): CliResultEnvelope;
export function configBlockedEnvelope(
  invocation: CliInvocation,
  configResult: Record<string, unknown>,
): CliResultEnvelope;
export function foundationFailureEnvelope(invocation: CliInvocation): CliResultEnvelope;
export function partialEnvelope(invocation: CliInvocation): CliResultEnvelope;
export function validateCliResultEnvelope(envelope: unknown): CliEnvelopeValidationResult;
export function writeResultFileAtomic(
  resultFile: string,
  envelope: CliResultEnvelope,
): Promise<void>;
export function envelopeBytes(envelope: CliResultEnvelope): string;
export function sha256Text(text: string): string;
