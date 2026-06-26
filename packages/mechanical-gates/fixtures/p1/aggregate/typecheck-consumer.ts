import { P1AggregateFamily, type P1AggregateOptions, type P1AggregateResult, runP1Aggregate, runP0Aggregate } from "../../../src/aggregate/index.js";

const families: readonly P1AggregateFamily[] = P1AggregateFamily;
const options: P1AggregateOptions = {
  families: ["p1.schema-contract-strictness", "p1.quality-ratchet", "p1.test-anti-pattern"],
  schemaContractStrictness: {
    manifestPath: "packages/contracts/schema-contract-strictness.manifest.json",
    bridge: {
      sourceRoot: "packages/mechanical-gates/src/p1/schema-contract-strictness",
      sourceFiles: [
        "packages/mechanical-gates/src/p1/schema-contract-strictness/index.ts",
        "packages/mechanical-gates/src/p1/schema-contract-strictness/validate-schema-contract-strictness.ts"
      ],
      outputDir: ".vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate/typecheck-bridge-output",
      moduleRelativePath: "index.js"
    }
  },
  qualityRatchet: { options: { baselinePath: "baseline.json" } },
  testAntiPattern: { options: { policyPath: "test-anti-pattern.policy.json" } }
};

async function consume(): Promise<boolean> {
  const result: P1AggregateResult = await runP1Aggregate("/tmp/p1-aggregate-type-consumer", options);
  const subresultFamily: P1AggregateFamily | undefined = result.evidence.subresults[0]?.family;
  const p0 = await runP0Aggregate("/tmp/p1-aggregate-type-consumer", { families: ["p0.allowlist"] });
  return result.family === "p1.aggregate" && typeof result.ok === "boolean" && p0.family === "p0.aggregate" && families.length === 3 && subresultFamily !== undefined;
}

void consume;
