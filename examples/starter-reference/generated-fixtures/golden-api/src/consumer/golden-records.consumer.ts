// @sample @demo @reference — golden-records consumer fixture (I-16A / DL-14).
//
// Consumer flow: calls the GENERATED/SHARED client (derived ONLY from the
// canonical contract — no hand-authored fetch DTOs) and re-parses the
// network-crossing response against `goldenRecordSuccessResponseSchema`. The
// consumer imports contract-derived client + types ONLY; it contains NO Zod
// schema definition and NO duplicated DTO shape for golden payloads (DL-14 §5;
// verified by W-NODUP). Mirrors
// packages/contracts/src/consumer/reference-flow.consumer.ts (I-11).

import { goldenRecordsClient } from "../../../golden-contracts/src/generated/golden-records-client.js";
import { goldenRecordSuccessResponseSchema, type GoldenRecordSuccessResponse } from "../../../golden-contracts/src/golden-records.contract.js";

export async function callGoldenRecordsConsumer(): Promise<GoldenRecordSuccessResponse> {
  const response = await goldenRecordsClient.classifyGoldenRecord({
    params: { goldenRecordId: "gr_abc123" },
    headers: { "x-golden-client": "consumer-fixture" },
    body: {
      title: "Alpha",
      summary: "Domain-neutral golden-record sample payload.",
      status: "active",
      sequence: 7,
      absence: { kind: "not-provided", reason: "domain-neutral absence model" }
    }
  });

  if (response.status !== 200) {
    throw new Error(`Golden-records flow failed with status ${response.status}`);
  }
  // Re-parse the network-crossing response against the success schema (DL-14).
  return goldenRecordSuccessResponseSchema.parse(response.body);
}
