// @sample @demo @reference — golden-records module (DL-16 / DL-20A).
import { initClient } from "@ts-rest/core";
import { goldenRecordsContract } from "@vibe-engineer-starter/contracts";

// Derived/shared client (DL-14/DL-16). Consumed by apps/web and apps/mobile.
// No hand-authored fetch DTOs and no duplicated schemas.
export const goldenRecordsClient = initClient(goldenRecordsContract, { baseUrl: "/api" });
