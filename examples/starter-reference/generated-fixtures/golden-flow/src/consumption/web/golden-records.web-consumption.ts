// @sample @demo @reference — golden-records WEB consumption witness (I-16B / DL-16 §247).
//
// Proves `apps/web` imports + exercises the SAME shared-client surface as mobile
// (mirrors the I-15B source-template `apps/web/.../golden-records.tsx` import
// shape — both apps import `useGoldenRecords` from `@vibe-engineer-starter/api-client`).
// This witness binds the framework-neutral golden flow to the WEB transport
// adapter and drives it against the REAL I-16A provider through the REAL
// `@ts-rest/core` + `zod` runtime. It proves the IMPORT + FLOW seam; it does NOT
// render a live DOM tree (live web E2E/UI is `I-17A`).

import { createWebTransport, WEB_PLATFORM } from "../../../../golden-client/src/transport/web.js";
import { useGoldenRecords } from "../../../../golden-client/src/use-golden-records.js";
import { runGoldenRecordsFlow, type GoldenFlowOutcome } from "../../flow/golden-records.flow.js";

/**
 * Web-consumption witness: build the WEB transport, run the golden flow through
 * the shared client against the real provider, and exercise the framework-neutral
 * `useGoldenRecords` accessor on the SAME shared-client surface.
 */
export async function runWebConsumptionWitness(): Promise<GoldenFlowOutcome> {
  const transport = createWebTransport();
  const flowOutcome = await runGoldenRecordsFlow("web", transport, WEB_PLATFORM.clientHeader);

  // Exercise the framework-neutral `useGoldenRecords` accessor against a shared
  // client built from the SAME web transport — proves web consumes the SAME
  // shared-client surface (not a duplicated logic path).
  const accessor = useGoldenRecords();
  const sharedClient = await import("../../../../golden-client/src/golden-records.shared-client.js").then(
    (m) => m.createGoldenRecordsSharedClient(transport)
  );
  const accessorOutcome = await accessor.classifyOnce(sharedClient);
  if (accessorOutcome.accepted !== true) {
    throw new Error("web useGoldenRecords accessor did not accept the shared-client response");
  }
  return flowOutcome;
}
