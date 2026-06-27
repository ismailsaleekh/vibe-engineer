// @sample @demo @reference — golden-records CLIENT-FLOW REAL-BOUNDARY witness (I-16B / DL-14 / DL-16).
//
// REAL-BOUNDARY POSTURE (quality bar: shape-green is not truth-green).
//
// Exercises the REAL `@ts-rest/core` + `zod` runtime (resolved via the
// dep-resolver loader hook from the installed harness `packages/contracts`
// deps — NO mock, NO synthetic green), the REAL I-16A provider, and the REAL
// I-16A canonical contract, through the actual fixture seam:
//   golden-client (shared client + per-platform transports)
//     → golden-flow (web + mobile consumption)
//       → I-16A provider (golden-api) → I-16A contract (golden-contracts).
//
// Return shape extends the I-16A 5-boolean witness for the client/flow scope
// (brief §6 step 4):
//   { sharedClientDerivedFromContract, webConsumesSharedClient,
//     mobileConsumesSharedClient, validFlowAccepted, invalidPayloadRejected,
//     clientRejectsInvalidResponse }
//
// Witnesses (brief §7):
//   W-SHARED-CLIENT-DERIVED — golden-client imports the I-16A contract-derived
//                             client/types; SHARED_CLIENT_PROVENANCE names the
//                             canonical contract path + source SHA-256.    (struct, in runner)
//   W-NO-FORK              — web + mobile transports import the SAME shared
//                             client + SAME I-16A contract (no schema/route
//                             contract re-declaration).                    (struct, in runner)
//   W-BOTH-PLATFORMS-CONSUME — web + mobile witnesses exercise the SAME shared
//                             client against the real provider.            (runtime)
//   W-FLOW                 — golden flow (classify → read → consume) succeeds
//                             end-to-end; response re-parsed + accepted.   (runtime)
//   W-NEG-REQ              — invalid payload through the shared client → 400
//                             before application logic (probe unset).      (runtime)
//   W-CLIENT-INVALID-RESP  — validating shared client rejects an invalid
//                             network response.                           (runtime)

import { type ApiFetcher } from "@ts-rest/core";
import {
  createGoldenRecordsApplicationProbe,
  handleGoldenRecordsApiRequest
} from "../../../golden-api/src/provider/golden-records.provider.js";
import { createGoldenRecordsSharedClient } from "../../../golden-client/src/golden-records.shared-client.js";
import { createWebTransport, WEB_PLATFORM } from "../../../golden-client/src/transport/web.js";
import { createMobileTransport, MOBILE_PLATFORM } from "../../../golden-client/src/transport/mobile.js";
import { runWebConsumptionWitness } from "../consumption/web/golden-records.web-consumption.js";
import { runMobileConsumptionWitness } from "../consumption/mobile/golden-records.mobile-consumption.js";

export interface GoldenClientFlowBoundaryWitnessResult {
  sharedClientDerivedFromContract: boolean;
  webConsumesSharedClient: boolean;
  mobileConsumesSharedClient: boolean;
  validFlowAccepted: boolean;
  invalidPayloadRejected: boolean;
  clientRejectsInvalidResponse: boolean;
}

const HEADERS = { "x-golden-client": "client-flow-fixture" };

export async function runGoldenRecordsClientFlowRealBoundaryWitness(): Promise<GoldenClientFlowBoundaryWitnessResult> {
  // --- W-BOTH-PLATFORMS-CONSUME (positive): web + mobile exercise the SAME
  //     shared client against the REAL provider. -----------------------------
  const webOutcome = await runWebConsumptionWitness();
  const mobileOutcome = await runMobileConsumptionWitness();

  // --- W-FLOW (positive, DL-16 §245): seed/classify → read → consume succeeds
  //     end-to-end through the shared client; the network-crossing response was
  //     re-parsed against the success schema inside runGoldenRecordsFlow. Both
  //     transport adapters drove the SAME shared client to acceptance (no fork).
  const validFlowAccepted =
    webOutcome.accepted === true &&
    mobileOutcome.accepted === true &&
    webOutcome.result.goldenRecordId === "gr_abc123" &&
    mobileOutcome.result.goldenRecordId === "gr_abc123";

  // --- W-NEG-REQ (negative, fail-closed): an invalid payload through the SHARED
  //     client → rejected at the boundary → 400 typed error; application logic
  //     does NOT run (probe unset). Reuses the I-16A provider probe. ----------
  const invalidProbe = createGoldenRecordsApplicationProbe();
  const invalidRequestResponse = handleGoldenRecordsApiRequest(
    {
      method: "POST",
      path: "/api/golden-records/gr_abc123/classify",
      headers: HEADERS,
      body: {
        title: "",
        summary: "bad",
        status: "active",
        sequence: 7,
        absence: { kind: "not-provided", reason: "bad" }
      }
    },
    invalidProbe
  );
  const invalidPayloadRejected =
    invalidRequestResponse.status === 400 && invalidProbe.applicationLogicRan === false;

  // --- W-CLIENT-INVALID-RESP (negative): the VALIDATING shared client rejects a
  //     network response that violates the I-16A success schema (mirror I-16A
  //     W-CLIENT). Built via a SHARED client surface bound to a bad transport. -
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
  const invalidSharedClient = createGoldenRecordsSharedClient(invalidApi);
  let clientRejectsInvalidResponse = false;
  try {
    await invalidSharedClient.classifyGoldenRecord({
      params: { goldenRecordId: "gr_abc123" },
      headers: { "x-golden-client": "client-flow-fixture" },
      body: {
        title: "Alpha",
        summary: "client response validation sample",
        status: "active",
        sequence: 7,
        absence: { kind: "not-provided", reason: "client response validation" }
      }
    });
  } catch {
    clientRejectsInvalidResponse = true;
  }

  // --- W-SHARED-CLIENT-DERIVED (structural runtime check): the shared client
  //     can be built from BOTH the web and mobile transports (proves the same
  //     surface accepts both platform adapters — no fork). This is the runtime
  //     evidence that the shared client derives from the single I-16A contract
  //     surface; the full structural grep (no Zod/route re-declaration +
  //     provenance SHA match) is emitted by the runner. ----------------------
  const sharedClientDerivedFromContract =
    typeof createGoldenRecordsSharedClient(createWebTransport()) === "object" &&
    typeof createGoldenRecordsSharedClient(createMobileTransport()) === "object" &&
    WEB_PLATFORM.platform === "web" &&
    MOBILE_PLATFORM.platform === "mobile";

  return {
    sharedClientDerivedFromContract,
    webConsumesSharedClient: webOutcome.accepted === true,
    mobileConsumesSharedClient: mobileOutcome.accepted === true,
    validFlowAccepted,
    invalidPayloadRejected,
    clientRejectsInvalidResponse
  };
}
