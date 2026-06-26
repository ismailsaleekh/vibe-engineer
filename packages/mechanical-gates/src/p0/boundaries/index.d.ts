export type P0Family = "p0.governed-surface" | "p0.config-guards" | "p0.boundaries" | "p0.contracts";
export type P0Severity = "error" | "warning";

export interface P0Finding {
  family: P0Family | string;
  ruleId: string;
  severity: P0Severity;
  blocking: boolean;
  path: string;
  message: string;
  evidence: Record<string, unknown>;
}

export interface P0ValidatorResult {
  family: P0Family | string;
  ok: boolean;
  projectRoot: string;
  findings: P0Finding[];
  evidence: Record<string, unknown>;
}

export class P0ValidationError extends Error {
  code: string;
  path?: string;
}

export const P0_FAMILIES: Readonly<Record<string, P0Family>>;
export const P0_SEVERITIES: readonly P0Severity[];
export function createFinding(input: P0Finding): P0Finding;
export function createValidatorResult(input: {
  family: string;
  projectRoot: string;
  findings: P0Finding[];
  evidence?: Record<string, unknown>;
}): P0ValidatorResult;
export function assertTypedFinding(value: unknown): true;
export function assertTypedFindings(findings: unknown): true;
export function validatePackageBoundaries(projectRoot: string, options?: { configPath?: string }): Promise<P0ValidatorResult>;
