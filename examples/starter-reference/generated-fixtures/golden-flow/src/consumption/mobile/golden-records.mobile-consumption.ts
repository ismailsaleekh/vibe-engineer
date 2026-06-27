// @sample @demo @reference — golden-records MOBILE (React Native) consumption witness (I-16B / DL-16 §247).
//
// Proves `apps/mobile` imports + exercises the SAME shared-client surface as web
// (mirrors the I-15B source-template `apps/mobile/.../golden-records.tsx` import
// shape — both apps import `useGoldenRecords` from `@vibe-engineer-starter/api-client`).
// This witness binds the framework-neutral golden flow to the MOBILE transport
// adapter and drives it against the REAL I-16A provider through the REAL
// `@ts-rest/core` + `zod` runtime. It proves the IMPORT + FLOW seam; it does NOT
// render a live RN tree (live mobile E2E/UI is `I-17B`, may be pending-live).

import { createMobileTransport, MOBILE_PLATFORM } from "../../../../golden-client/src/transport/mobile.js";
import { useGoldenRecords } from "../../../../golden-client/src/use-golden-records.js";
import { runGoldenRecordsFlow, type GoldenFlowOutcome } from "../../flow/golden-records.flow.js";

/**
 * Mobile-consumption witness: build the MOBILE transport, run the golden flow
 * through the shared client against the real provider, and exercise the
 * framework-neutral `useGoldenRecords` accessor on the SAME shared-client surface.
 */
export async function runMobileConsumptionWitness(): Promise<GoldenFlowOutcome> {
  const transport = createMobileTransport();
  const flowOutcome = await runGoldenRecordsFlow("mobile", transport, MOBILE_PLATFORM.clientHeader);

  // Exercise the framework-neutral `useGoldenRecords` accessor against a shared
  // client built from the SAME mobile transport — proves mobile consumes the SAME
  // shared-client surface (not a duplicated logic path).
  const accessor = useGoldenRecords();
  const sharedClient = await import("../../../../golden-client/src/golden-records.shared-client.js").then(
    (m) => m.createGoldenRecordsSharedClient(transport)
  );
  const accessorOutcome = await accessor.classifyOnce(sharedClient);
  if (accessorOutcome.accepted !== true) {
    throw new Error("mobile useGoldenRecords accessor did not accept the shared-client response");
  }
  return flowOutcome;
}
