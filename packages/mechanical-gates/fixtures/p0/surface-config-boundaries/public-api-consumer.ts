import { validateGovernedSurface } from "@vibe-engineer/mechanical-gates/p0/governed-surface";
import { validateStrictConfig } from "@vibe-engineer/mechanical-gates/p0/config-guards";
import {
  assertTypedFindings,
  type P0Finding,
  type P0ValidatorResult,
  validatePackageBoundaries
} from "@vibe-engineer/mechanical-gates/p0/boundaries";

async function consume(root: string): Promise<P0ValidatorResult[]> {
  const results = await Promise.all([
    validateGovernedSurface(root),
    validateStrictConfig(root),
    validatePackageBoundaries(root)
  ]);
  for (const result of results) {
    const findings: P0Finding[] = result.findings;
    assertTypedFindings(findings);
  }
  return results;
}

void consume("fixtures/p0/surface-config-boundaries/valid-workspace");
