import type { QualityRatchetApprovalEvidenceCarrier, QualityRatchetFindingCarrierEntry } from "../../../src/p1/quality-ratchet/index.js";

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
    // @ts-expect-error runtime schema rejects unknown evidence fields; declaration must reject them too.
    parserAgreementOnly: true,
  },
};

const malformedApprovalEvidence: QualityRatchetApprovalEvidenceCarrier = {
  schemaVersion: "quality-ratchet.approval-evidence/1",
  family: "p1.quality-ratchet",
  kind: "growth",
  approved: true,
  approvedBy: "operator",
  reason: "strict approval evidence declarations reject unknown fields",
  identityId: "0".repeat(64),
  // @ts-expect-error runtime schema rejects unknown approval evidence fields; declaration must reject them too.
  parserAgreementOnly: true,
};

void malformedCarrierEntry;
void malformedApprovalEvidence;
