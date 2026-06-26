import {
  assertTestAntiPatternFinding,
  assertTestAntiPatternFindings,
  validateTestAntiPatterns,
  type TestAntiPatternFinding,
  type TestAntiPatternOptions,
  type TestAntiPatternResult
} from "../../../src/p1/test-anti-pattern/index.js";

const options: TestAntiPatternOptions = { policyPath: "test-anti-pattern.policy.json", maxFileBytes: 1024 };
const resultPromise: Promise<TestAntiPatternResult> = validateTestAntiPatterns(".", options);
const finding: TestAntiPatternFinding = {
  family: "p1.test-anti-pattern",
  ruleId: "typecheck.sample",
  severity: "error",
  blocking: true,
  path: "tests/sample.test.ts",
  message: "typed finding sample",
  evidence: { typed: true }
};
assertTestAntiPatternFinding(finding);
assertTestAntiPatternFindings([finding]);
void resultPromise;
