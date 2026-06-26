import { validateQualityRatchet } from "../../../../../packages/mechanical-gates/src/p1/quality-ratchet/index.js";
import type { QualityRatchetOptions, QualityRatchetResult, QualityRatchetFamily } from "../../../../../packages/mechanical-gates/src/p1/quality-ratchet/index.js";

const options: QualityRatchetOptions = {
  baselinePath: "baseline.json",
  findingCarrierPath: "findings.json",
  approvalPath: "approvals.json",
  surfaceFingerprintPath: "surface-fingerprint.json",
  runnerEvidencePath: "runner-evidence.json",
  maxFileBytes: 262144,
};

async function consume(): Promise<QualityRatchetResult> {
  const result = await validateQualityRatchet(".", options);
  const family: QualityRatchetFamily = result.family;
  const ok: boolean = result.ok;
  const projectRoot: string = result.projectRoot;
  const findingCount: number = result.findings.length;
  const evidence: object = result.evidence;
  void [family, ok, projectRoot, findingCount, evidence];
  return result;
}

void consume;
