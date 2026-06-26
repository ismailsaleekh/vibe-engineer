import {
  CODE_SMELL_FAMILY,
  CODE_SMELL_TOOL,
  validateCodeSmells,
  type CodeSmellDetectorId,
  type CodeSmellFinding,
  type CodeSmellOptions,
  type CodeSmellResult
} from "../../../src/p2/code-smell/index.js";

const detector: CodeSmellDetectorId = "deep-control-flow-nesting";
const options: CodeSmellOptions = {
  includePaths: ["projects/clean/src"],
  detectors: [detector],
  maxFileBytes: 262144
};

function consumeFinding(finding: CodeSmellFinding): string {
  return `${finding.family}:${finding.detectorId}:${finding.identity.tool}:${finding.mode}:${finding.threshold.metric}`;
}

export async function consumeCodeSmellApi(root: string): Promise<CodeSmellResult> {
  const result = await validateCodeSmells(root, options);
  if (result.family !== CODE_SMELL_FAMILY) {
    throw new Error("unexpected family");
  }
  if (CODE_SMELL_TOOL !== "p2.code-smell") {
    throw new Error("unexpected tool");
  }
  for (const finding of result.findings) {
    consumeFinding(finding);
  }
  return result;
}
