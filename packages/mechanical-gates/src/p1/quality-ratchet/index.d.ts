export const QUALITY_RATCHET_FAMILY: "p1.quality-ratchet";
export const QUALITY_RATCHET_SCHEMA_VERSION: "quality-ratchet.baseline/1";
export const QUALITY_RATCHET_FINDING_CARRIER_VERSION: "quality-ratchet.findings/1";
export const QUALITY_RATCHET_APPROVALS_VERSION: "quality-ratchet.approvals/1";
export const QUALITY_RATCHET_APPROVAL_EVIDENCE_VERSION: "quality-ratchet.approval-evidence/1";
export const QUALITY_RATCHET_SURFACE_FINGERPRINT_VERSION: "quality-ratchet.surface-fingerprint/1";
export const QUALITY_RATCHET_RUNNER_EVIDENCE_VERSION: "quality-ratchet.runner-evidence/1";

export type QualityRatchetFamily = typeof QUALITY_RATCHET_FAMILY;

export interface QualityRatchetStableIdentity {
  tool: string;
  ruleId: string;
  path: string;
  symbol?: string;
  structuralSignature?: string;
  contentHash: string;
  line?: number;
}

export interface QualityRatchetBaselineDebtEvidence {
  sourcePath: string;
}

export interface QualityRatchetBaselineDebtRow {
  identity: QualityRatchetStableIdentity;
  message: string;
  firstSeen: string;
  evidence: QualityRatchetBaselineDebtEvidence;
}

export interface QualityRatchetBaselineCarrier {
  schemaVersion: typeof QUALITY_RATCHET_SCHEMA_VERSION;
  family: QualityRatchetFamily;
  surfaceFingerprint: string;
  debt: QualityRatchetBaselineDebtRow[];
}

export interface QualityRatchetFindingCarrierEvidence {
  sourcePath: string;
  sourceExcerpt: string;
}

export interface QualityRatchetFindingCarrierEntry {
  tool: string;
  ruleId: string;
  severity: "error" | "warning";
  path: string;
  message: string;
  identity: QualityRatchetStableIdentity;
  evidence: QualityRatchetFindingCarrierEvidence;
}

export interface QualityRatchetFindingCarrier {
  schemaVersion: typeof QUALITY_RATCHET_FINDING_CARRIER_VERSION;
  family: QualityRatchetFamily;
  surfaceFingerprint: string;
  sourceFingerprintPath: string;
  runnerEvidencePath: string;
  findings: QualityRatchetFindingCarrierEntry[];
}

export interface QualityRatchetApprovalEntry {
  kind: "growth" | "shrink";
  identity: QualityRatchetStableIdentity;
  approvedBy: string;
  reason: string;
  evidencePath: string;
}

export interface QualityRatchetApprovalsCarrier {
  schemaVersion: typeof QUALITY_RATCHET_APPROVALS_VERSION;
  family: QualityRatchetFamily;
  approvals: QualityRatchetApprovalEntry[];
}

export interface QualityRatchetApprovalEvidenceBase {
  schemaVersion: typeof QUALITY_RATCHET_APPROVAL_EVIDENCE_VERSION;
  family: QualityRatchetFamily;
  kind: "growth" | "shrink";
  approved: true;
  approvedBy: string;
  reason: string;
}

export type QualityRatchetApprovalEvidenceCarrier =
  | (QualityRatchetApprovalEvidenceBase & { identity: QualityRatchetStableIdentity; identityId?: string })
  | (QualityRatchetApprovalEvidenceBase & { identity?: undefined; identityId: string });

export interface QualityRatchetSurfaceFingerprintEntry {
  path: string;
  sha256: string;
}

export interface QualityRatchetSurfaceFingerprintCarrier {
  schemaVersion: typeof QUALITY_RATCHET_SURFACE_FINGERPRINT_VERSION;
  family: QualityRatchetFamily;
  fingerprint: string;
  entries: QualityRatchetSurfaceFingerprintEntry[];
}

export interface QualityRatchetRunnerEvidenceCarrier {
  schemaVersion: typeof QUALITY_RATCHET_RUNNER_EVIDENCE_VERSION;
  family: QualityRatchetFamily;
  runnerId: string;
  status: "completed";
  command: string;
  findingCarrierPath: string;
  surfaceFingerprintPath: string;
  sourceFiles: string[];
}

export interface QualityRatchetFinding {
  family: QualityRatchetFamily;
  ruleId: string;
  severity: "error" | "warning";
  blocking: boolean;
  path: string;
  message: string;
  evidence: Record<string, unknown>;
}

export interface QualityRatchetOptions {
  baselinePath?: string;
  previousBaselinePath?: string;
  findingCarrierPath?: string;
  approvalPath?: string;
  surfaceFingerprintPath?: string;
  runnerEvidencePath?: string;
  maxFileBytes?: number;
}

export interface QualityRatchetArtifactPathsEvidence {
  baselinePath?: string;
  previousBaselinePath?: string;
  findingCarrierPath?: string;
  approvalPath?: string;
  surfaceFingerprintPath?: string;
  runnerEvidencePath?: string;
}

export interface QualityRatchetSurfaceEvidence {
  baseline?: string;
  carrier?: string;
  declared?: string;
  computed?: string;
}

export interface QualityRatchetRunnerEvidenceSummary {
  runnerId?: string;
  command?: string;
  sourceFiles?: string[];
}

export interface QualityRatchetCountsEvidence {
  baselineDebt?: number;
  currentFindings?: number;
  approvals?: number;
  previousBaselineDebt?: number | null;
}

export interface QualityRatchetDebtEvidenceEntry {
  identityId: string;
  path: string;
  ruleId?: string;
  approved?: boolean;
  approvedBy?: string;
  evidencePath?: string;
}

export interface QualityRatchetEvidence {
  schemaVersion?: "quality-ratchet.result/1";
  family?: QualityRatchetFamily;
  artifactPaths?: QualityRatchetArtifactPathsEvidence;
  surfaceFingerprint?: QualityRatchetSurfaceEvidence;
  runnerEvidence?: QualityRatchetRunnerEvidenceSummary;
  counts?: QualityRatchetCountsEvidence;
  unchangedDebt?: QualityRatchetDebtEvidenceEntry[];
  newDebt?: QualityRatchetDebtEvidenceEntry[];
  staleDebt?: QualityRatchetDebtEvidenceEntry[];
  removedDebt?: QualityRatchetDebtEvidenceEntry[];
  baselineGrowth?: QualityRatchetDebtEvidenceEntry[];
  stableIdentityAlgorithm?: string;
  failClosed?: boolean;
  options?: string[];
}

export interface QualityRatchetResult {
  family: QualityRatchetFamily;
  ok: boolean;
  projectRoot: string;
  findings: QualityRatchetFinding[];
  evidence: QualityRatchetEvidence;
}

export function validateQualityRatchet(projectRoot: string, options?: QualityRatchetOptions): Promise<QualityRatchetResult>;
