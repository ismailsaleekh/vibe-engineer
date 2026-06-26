import type { QualityRatchetFindingCarrierEntry } from "../../../../../packages/mechanical-gates/src/p1/quality-ratchet/index.js";

const malformedCarrierEntry: QualityRatchetFindingCarrierEntry = {
  tool: "example-tool",
  ruleId: "example.rule",
  severity: "error",
  path: "src/sample.ts",
  message: "malformed extra evidence should not type-check if the carrier schema is strict",
  identity: {
    tool: "example-tool",
    ruleId: "example.rule",
    path: "src/sample.ts",
    symbol: "sample",
    contentHash: "0".repeat(64),
  },
  evidence: {
    sourcePath: "src/sample.ts",
    sourceExcerpt: "export const sample = true;",
    // @ts-expect-error runtime schema rejects unknown evidence fields; declaration should reject them too.
    parserAgreementOnly: true,
  },
};

void malformedCarrierEntry;
