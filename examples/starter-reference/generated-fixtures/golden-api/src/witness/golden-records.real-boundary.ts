// @sample @demo @reference — golden-records REAL-BOUNDARY witness (I-16A / DL-14).
//
// REAL-BOUNDARY POSTURE (quality bar: shape-green is not truth-green).
//
// Exercises the REAL `@ts-rest/core` + `zod` runtime (resolved via the
// dep-resolver loader hook from the installed harness `packages/contracts`
// deps — NO mock, NO synthetic green) through the actual fixture contract →
// provider → generated client → consumer seam. Return shape mirrors I-11
// `runReferenceFlowRealBoundaryWitness()` exactly: five booleans covering the
// positive provider path, the positive consumer path, the fail-closed invalid
// request (rejected BEFORE application logic), the fail-closed invalid provider
// response (never trusted), and the validating-client rejecting an invalid
// network response.
//
// Witnesses (brief §7):
//   W-PROVIDER    — valid golden request → provider validates, runs logic
//                   (probe set), schema-valid 200; client+consumer accept.
//   W-NEG-REQ     — invalid payload → rejected at the boundary → 400 typed
//                   error; application logic does NOT run (probe unset).
//   W-NEG-RESP    — forceInvalidProviderResponse → candidate fails
//                   goldenRecordSuccessResponseSchema → typed boundary error.
//   W-CLIENT      — validating client rejects a network response that violates
//                   the success schema.
// (W-NODUP, W-DOMAIN-NEUTRAL, regression, and real-resolution proof are emitted
//  by the runner; this module returns the runtime boundary result object.)

import { type ApiFetcher } from "@ts-rest/core";
import { createGoldenRecordsClient } from "../../../golden-contracts/src/generated/golden-records-client.js";
import {
  createGoldenRecordsApplicationProbe,
  handleGoldenRecordsApiRequest
} from "../provider/golden-records.provider.js";
import { callGoldenRecordsConsumer } from "../consumer/golden-records.consumer.js";

export interface GoldenRecordsBoundaryWitnessResult {
  providerAccepted: boolean;
  consumerAccepted: boolean;
  invalidRequestRejectedBeforeLogic: boolean;
  invalidResponseRejected: boolean;
  clientInvalidResponseRejected: boolean;
}

const VALID_BODY = {
  title: "Alpha",
  summary: "real provider boundary sample payload",
  status: "active" as const,
  sequence: 7,
  absence: { kind: "not-provided" as const, reason: "real provider boundary" }
};

const HEADERS = { "x-golden-client": "provider-fixture" };

export async function runGoldenRecordsRealBoundaryWitness(): Promise<GoldenRecordsBoundaryWitnessResult> {
  // --- W-PROVIDER (positive): valid request → logic runs, schema-valid 200. ---
  const providerProbe = createGoldenRecordsApplicationProbe();
  const providerResponse = handleGoldenRecordsApiRequest(
  {
    method: "POST",
    path: "/api/golden-records/gr_abc123/classify",
    headers: HEADERS,
    body: VALID_BODY
  },
  providerProbe
  );

  // --- W-NEG-REQ (negative, fail-closed): invalid body → 400 before logic. ---
  const invalidProbe = createGoldenRecordsApplicationProbe();
  const invalidRequestResponse = handleGoldenRecordsApiRequest(
  {
    method: "POST",
    path: "/api/golden-records/gr_abc123/classify",
    headers: HEADERS,
    body: { title: "", summary: "bad", status: "active", sequence: 7, absence: { kind: "not-provided", reason: "bad" } }
  },
  invalidProbe
  );

  // --- W-NEG-RESP (negative, fail-closed): forced invalid candidate → throw. ---
  let invalidResponseRejected = false;
  try {
  handleGoldenRecordsApiRequest(
    {
    method: "POST",
    path: "/api/golden-records/gr_abc123/classify",
    headers: HEADERS,
    body: VALID_BODY,
    forceInvalidProviderResponse: true
    }
  );
  } catch {
  invalidResponseRejected = true;
  }

  // --- W-CLIENT (negative): validating client rejects an invalid response. ---
  const invalidApi: ApiFetcher = async () => ({
  status: 200,
    body: {
    goldenRecordId: "bad",
    accepted: true,
    normalizedTitle: "bad",
    statusEcho: "draft",
    sequenceEcho: 1,
    absence: { kind: "not-provided", reason: "bad" }
    },
    headers: new Headers({ "content-type": "application/json" })
  });
  const invalidClient = createGoldenRecordsClient(invalidApi);
  let clientInvalidResponseRejected = false;
  try {
  await invalidClient.classifyGoldenRecord({
    params: { goldenRecordId: "gr_abc123" },
    headers: { "x-golden-client": "consumer-fixture" },
    body: {
    title: "Alpha",
    summary: "client response validation sample",
    status: "active",
    sequence: 7,
    absence: { kind: "not-provided", reason: "client response validation" }
    }
  });
  } catch {
  clientInvalidResponseRejected = true;
  }

  // --- Consumer path (positive): real generated client + re-parse. ---
  const consumerResponse = await callGoldenRecordsConsumer();

  return {
  providerAccepted: providerProbe.applicationLogicRan && providerResponse.status === 200,
    consumerAccepted: consumerResponse.accepted === true,
    invalidRequestRejectedBeforeLogic:
    invalidRequestResponse.status === 400 && invalidProbe.applicationLogicRan === false,
    invalidResponseRejected,
    clientInvalidResponseRejected
  };
}
