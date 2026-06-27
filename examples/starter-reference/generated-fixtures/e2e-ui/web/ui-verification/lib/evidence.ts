// @sample @demo @reference — UI-verification evidence packet writer (I-17A / DL-13).
//
// Shared helper every deterministic specialist uses to emit a STRUCTURED
// evidence packet conforming to `../evidence-packet.schema.json`. Specialists
// never rely on subjective screenshot opinion as the blocking signal: a finding
// hard-blocks ONLY when produced by a deterministic rule (DL-13). The structural
// validator (run-structural-validate.mjs) re-validates emitted packets against
// the schema in-license.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = path.resolve(here, "..", "evidence");

export interface DeterministicResult {
  rule_id: string;
  passed: boolean;
  blocking: boolean;
  actual?: unknown;
  expected?: unknown;
  evidence_ref?: string | null;
}

export interface AdvisoryFinding {
  issue_class: string;
  classification: "advisory";
  note?: string | null;
}

export interface ViewportRef {
  id: string;
  width: number;
  height: number;
  device: string | null;
}

export interface EvidencePacket {
  ui_run_id: string;
  verification_layer: "ui_verification";
  specialist:
    | "overlap-clipping"
    | "spacing-alignment"
    | "responsive-layout"
    | "truncation"
    | "color-contrast"
    | "accessibility"
    | "visual-regression";
  app_target: "golden-web";
  route: string;
  state_id: string;
  viewport: ViewportRef;
  deterministic_results: DeterministicResult[];
  advisory_findings: AdvisoryFinding[];
  overall: { passed: boolean; blocking_failures: number };
  artifact_refs: {
    screenshot?: string | null;
    dom?: string | null;
    a11y?: string | null;
    geometry?: string | null;
    baseline?: string | null;
    diff?: string | null;
  };
}

export interface EmitArgs {
  specialist: EvidencePacket["specialist"];
  route: string;
  state_id: string;
  viewport: ViewportRef;
  results: DeterministicResult[];
  advisory?: AdvisoryFinding[];
  artifacts?: EvidencePacket["artifact_refs"];
}

function summarize(results: DeterministicResult[]): {
  passed: boolean;
  blocking_failures: number;
} {
  const blocking_failures = results.filter((r) => r.blocking && !r.passed).length;
  return { passed: blocking_failures === 0, blocking_failures };
}

/**
 * Write a structured evidence packet and return its path. Called from each
 * specialist after collecting deterministic metadata. Specialists then assert
 * `overall.passed` so a blocking deterministic failure hard-fails the run.
 */
export async function writeEvidence(args: EmitArgs): Promise<{
  packet: EvidencePacket;
  path: string;
}> {
  const overall = summarize(args.results);
  const packet: EvidencePacket = {
    ui_run_id: process.env.GOLDEN_WEB_UI_RUN_ID ?? `ui-run-${Date.now()}`,
    verification_layer: "ui_verification",
    specialist: args.specialist,
    app_target: "golden-web",
    route: args.route,
    state_id: args.state_id,
    viewport: args.viewport,
    deterministic_results: args.results,
    advisory_findings: args.advisory ?? [],
    overall,
    artifact_refs: args.artifacts ?? {}
  };
  await mkdir(evidenceDir, { recursive: true });
  const file = path.join(
    evidenceDir,
    `${args.specialist}--${args.state_id}--${args.viewport.id}.json`
  );
  await writeFile(file, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return { packet, path: file };
}
