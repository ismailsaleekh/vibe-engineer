// @sample @demo @reference — golden-records framework-neutral golden FLOW (I-16B / DL-14 / DL-16 §245).
//
// The end-to-end golden consumer flow that drives the SHARED client against the
// REAL I-16A provider across the network-style boundary: seed/classify a golden
// record → read/consume the result → re-parse the network-crossing response
// against the I-16A `goldenRecordSuccessResponseSchema` (DL-14 §4 runtime
// validation across the network boundary). It exercises BOTH per-platform
// transport adapters (web + mobile) against the SAME shared client to prove the
// no-fork invariant (DL-14 §60; DL-16 §247).
//
// Framework-neutral: no React/RN import here. The web/mobile CONSUMPTION
// witnesses (`../consumption/web|mobile`) bind this flow to their respective
// transport adapters and prove both platforms import + exercise the SAME
// shared-client surface (W-BOTH-PLATFORMS-CONSUME). NO Zod schema / DTO shape is
// re-declared here (DL-14 §5; verified by W-SHARED-CLIENT-DERIVED / W-NO-FORK).

import { type ApiFetcher } from "@ts-rest/core";
import { goldenRecordSuccessResponseSchema, type GoldenRecordSuccessResponse } from "../../../golden-contracts/src/golden-records.contract.js";
import { createGoldenRecordsSharedClient } from "../../../golden-client/src/golden-records.shared-client.js";

export interface GoldenFlowOutcome {
  platform: "web" | "mobile";
  accepted: boolean;
  result: GoldenRecordSuccessResponse;
}

const VALID_BODY = {
  title: "Alpha",
  summary: "golden-flow end-to-end sample payload",
  status: "active" as const,
  sequence: 7,
  absence: { kind: "not-provided" as const, reason: "golden-flow absence model" }
};

/**
 * Drive the golden classify → read → consume flow through the SHARED client bound
 * to the given platform transport, against the REAL I-16A provider. Re-parses the
 * network-crossing response against the I-16A success schema (DL-14 §4).
 *
 * Used by both the web-consumption and mobile-consumption witnesses (proving the
 * shared client is consumed by both platforms with NO contract fork).
 */
export async function runGoldenRecordsFlow(
  platform: "web" | "mobile",
  transport: ApiFetcher,
  clientHeader: string
): Promise<GoldenFlowOutcome> {
  const sharedClient = createGoldenRecordsSharedClient(transport);
  const goldenRecordId = "gr_abc123";
  const response = await sharedClient.classifyGoldenRecord({
    params: { goldenRecordId },
    headers: { "x-golden-client": clientHeader },
    body: VALID_BODY
  });
  if (response.status !== 200) {
    throw new Error(`golden-flow (${platform}) failed: status ${response.status}, body ${JSON.stringify(response.body)}`);
  }
  // Re-parse the network-crossing response against the success schema (DL-14 §4).
  const result = goldenRecordSuccessResponseSchema.parse(response.body);
  return { platform, accepted: result.accepted === true, result };
}
