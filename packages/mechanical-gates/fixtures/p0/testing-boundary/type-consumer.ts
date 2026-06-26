import type { TestingBoundaryOptions, TestingBoundaryResult } from "../../../src/p0/testing-boundary/index.js";
import { validateTestingBoundary } from "../../../src/p0/testing-boundary/index.js";

const options: TestingBoundaryOptions = { policyPath: "mechanical-testing-boundary.json" };

async function consume(projectRoot: string): Promise<TestingBoundaryResult> {
  const result = await validateTestingBoundary(projectRoot, options);
  const family: "p0.testing-boundary" = result.family;
  void family;
  return result;
}

void consume;
