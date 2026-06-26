export const TEST_ANTI_PATTERN_FAMILY: "p1.test-anti-pattern";
export const TEST_ANTI_PATTERN_POLICY_VERSION: "i12.test-anti-pattern/1";

export interface TestAntiPatternOptions {
  policyPath?: string;
  maxFileBytes?: number;
}

export interface TestAntiPatternFinding {
  family: typeof TEST_ANTI_PATTERN_FAMILY;
  ruleId: string;
  severity: "error" | "warning";
  blocking: boolean;
  path: string;
  message: string;
  evidence: Record<string, unknown>;
}

export interface TestAntiPatternResult {
  family: typeof TEST_ANTI_PATTERN_FAMILY;
  ok: boolean;
  projectRoot: string;
  findings: TestAntiPatternFinding[];
  evidence: Record<string, unknown>;
}

export function assertTestAntiPatternFinding(value: unknown): true;
export function assertTestAntiPatternFindings(findings: unknown): true;
export function validateTestAntiPatterns(projectRoot: string, options?: TestAntiPatternOptions): Promise<TestAntiPatternResult>;
