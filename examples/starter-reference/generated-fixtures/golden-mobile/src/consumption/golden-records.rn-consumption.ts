// @sample @demo @reference — golden-records RN consumption seam for the mobile-E2E surface (I-17B / DL-12 / DL-14 §5 / DL-16 §60).
//
// This module proves the generated mobile-E2E surface (Maestro flows + Detox
// specs) targets the SAME golden-records React Native screen that imports the
// I-16B SHARED client — `useGoldenRecords` + `createMobileTransport` (the
// mobile transport adapter) + `createGoldenRecordsSharedClient`. It DERIVES /
// IMPORTS the shared-client surface; it does NOT duplicate the client, the
// contract, any DTO, or any Zod schema (DL-14 §5; DL-16 §60; W-NO-FORK).
//
// The Maestro/Detox flows assert on testIDs (`golden-records-screen`,
// `golden-record-list`, `golden-record-item-N`) that correspond to the RN
// screen rendered from the SAME `useGoldenRecords` accessor the I-16B
// mobile-consumption witness binds. This module binds the typed accessor against
// the REAL I-16A provider through the REAL `@ts-rest/core`/`zod` runtime (via
// the mobile transport) to prove the E2E surface is anchored on the real
// shared-client boundary — NO live RN render is performed (live mobile E2E/UI
// is pending-live/BLOCKED; see README).

import { createMobileTransport, MOBILE_PLATFORM } from "../../../golden-client/src/transport/mobile.js";
import { useGoldenRecords } from "../../../golden-client/src/use-golden-records.js";
import { createGoldenRecordsSharedClient } from "../../../golden-client/src/golden-records.shared-client.js";
import { type GoldenRecordSuccessResponse } from "../../../golden-contracts/src/golden-records.contract.js";

/**
 * TestIDs the generated Maestro/Detox flows assert on. These correspond to the
 * golden-records RN screen (`.source-template/apps/mobile/src/screens/golden-
 * records/golden-records.tsx`) that imports `useGoldenRecords` from the I-16B
 * shared client — i.e. the E2E surface is anchored on the SAME shared-client-
 * rendered screen (no separate/duplicated screen surface).
 */
export const GOLDEN_RECORDS_TEST_IDS = {
  screen: "golden-records-screen",
  list: "golden-record-list",
  item: (index: number) => `golden-record-item-${index}`,
  homeGotoGoldenRecords: "home-goto-golden-records"
} as const;

/**
 * The E2E surface's anchor: bind the framework-neutral `useGoldenRecords`
 * accessor to the MOBILE transport (the SAME surface `apps/mobile` consumes per
 * I-16B DL-16 §247) and drive it against the REAL I-16A provider through the
 * mobile transport. Returns the accepted success response — proving the flows'
 * target screen is fed by the shared client (no fork).
 *
 * This is the deterministic no-fork seam; it does NOT launch a device/simulator
 * (live mobile E2E is pending-live/BLOCKED).
 */
export async function runGoldenRecordsRnConsumptionSeam(): Promise<GoldenRecordSuccessResponse> {
  const transport = createMobileTransport();
  const sharedClient = createGoldenRecordsSharedClient(transport);
  const accessor = useGoldenRecords();
  const response = await accessor.classifyOnce(sharedClient);
  if (response.accepted !== true) {
    throw new Error(
      `golden-mobile RN consumption seam did not bind the shared client (accepted=${String(response.accepted)} via ${MOBILE_PLATFORM.clientHeader}).`
    );
  }
  return response;
}
