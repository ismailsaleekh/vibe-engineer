import type {
  QualityRatchetApprovalsCarrier,
  QualityRatchetBaselineCarrier,
  QualityRatchetEvidence,
  QualityRatchetFindingCarrierEntry,
  QualityRatchetRunnerEvidenceCarrier,
} from "../../../../../packages/mechanical-gates/src/p1/quality-ratchet/index.js";

const validFindingEntry: QualityRatchetFindingCarrierEntry = {
  tool: "example-tool",
  ruleId: "example.rule",
  severity: "error",
  path: "src/sample.ts",
  message: "valid finding carrier entry compiles",
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
  },
};

const malformedFindingEntry: QualityRatchetFindingCarrierEntry = {
  ...validFindingEntry,
  evidence: {
    sourcePath: "src/sample.ts",
    sourceExcerpt: "export const sample = true;",
    // @ts-expect-error finding-carrier evidence must reject unknown parser-self-agreement extras.
    parserAgreementOnly: true,
  },
};

const validBaselineCarrier: QualityRatchetBaselineCarrier = {
  schemaVersion: "quality-ratchet.baseline/1",
  family: "p1.quality-ratchet",
  surfaceFingerprint: "0".repeat(64),
  debt: [{
    identity: validFindingEntry.identity,
    message: "valid baseline carrier compiles",
    firstSeen: "2026-06-26T00:00:00.000Z",
    evidence: { sourcePath: "src/sample.ts" },
  }],
};

const malformedBaselineCarrier: QualityRatchetBaselineCarrier = {
  ...validBaselineCarrier,
  debt: [{
    ...validBaselineCarrier.debt[0],
    evidence: {
      sourcePath: "src/sample.ts",
      // @ts-expect-error baseline debt evidence must reject unknown extras.
      parserAgreementOnly: true,
    },
  }],
};

const validApprovalsCarrier: QualityRatchetApprovalsCarrier = {
  schemaVersion: "quality-ratchet.approvals/1",
  family: "p1.quality-ratchet",
  approvals: [{
    kind: "growth",
    identity: validFindingEntry.identity,
    approvedBy: "operator",
    reason: "valid approval compiles",
    evidencePath: "approvals/growth.json",
  }],
};

const malformedApprovalsCarrier: QualityRatchetApprovalsCarrier = {
  ...validApprovalsCarrier,
  approvals: [{
    ...validApprovalsCarrier.approvals[0],
    // @ts-expect-error approval entries must reject unknown extras.
    parserAgreementOnly: true,
  }],
};

const validRunnerEvidence: QualityRatchetRunnerEvidenceCarrier = {
  schemaVersion: "quality-ratchet.runner-evidence/1",
  family: "p1.quality-ratchet",
  runnerId: "example-runner",
  status: "completed",
  command: "example-runner --json findings.json",
  findingCarrierPath: "findings.json",
  surfaceFingerprintPath: "surface-fingerprint.json",
  sourceFiles: ["src/sample.ts"],
};

const malformedRunnerEvidence: QualityRatchetRunnerEvidenceCarrier = {
  ...validRunnerEvidence,
  // @ts-expect-error runner evidence carrier must reject unknown extras.
  parserAgreementOnly: true,
};

const validResultEvidence: QualityRatchetEvidence = {
  schemaVersion: "quality-ratchet.result/1",
  family: "p1.quality-ratchet",
  failClosed: true,
};

const malformedResultEvidence: QualityRatchetEvidence = {
  ...validResultEvidence,
  // @ts-expect-error exported result evidence must reject unknown extras.
  parserAgreementOnly: true,
};

void malformedFindingEntry;
void malformedBaselineCarrier;
void malformedApprovalsCarrier;
void malformedRunnerEvidence;
void malformedResultEvidence;
