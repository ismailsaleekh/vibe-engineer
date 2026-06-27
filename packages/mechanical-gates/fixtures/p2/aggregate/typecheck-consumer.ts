import { P2AggregateFamily, type P2AggregateOptions, type P2AggregateResult, type P2CodeSmellBridgeEvidence, runP2Aggregate, runP1Aggregate } from "../../../src/aggregate/index.js";

const families: readonly P2AggregateFamily[] = P2AggregateFamily;
const options: P2AggregateOptions = {
  families: ["p2.code-smell"],
  codeSmell: {
    projectRoot: "packages/mechanical-gates/fixtures/p2/code-smell/projects/clean",
    options: { includePaths: ["src"], maxFileBytes: 262144 },
    bridge: {
      sourceRoot: "packages/mechanical-gates/src/p2/code-smell",
      sourceFiles: [
        "packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts",
        "packages/mechanical-gates/src/p2/code-smell/index.ts"
      ],
      outputDir: ".vibe/work/I-13C-p2-aggregate-runner-bridge/aggregate/typecheck-bridge-output",
      moduleRelativePath: "index.js"
    }
  }
};

async function consume(): Promise<boolean> {
  const result: P2AggregateResult = await runP2Aggregate("/tmp/p2-aggregate-type-consumer", options);
  const bridge: P2CodeSmellBridgeEvidence | null = result.evidence.codeSmellBridge;
  const p1 = await runP1Aggregate("/tmp/p2-aggregate-type-consumer");
  const bridgeFamily: string | null = bridge ? bridge.validatorFamilyObserved : null;
  return result.family === "p2.aggregate" && typeof result.ok === "boolean" && p1.family === "p1.aggregate" && families.length === 1 && bridgeFamily !== null;
}

void consume;
