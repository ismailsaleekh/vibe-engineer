// @sample @demo @reference — golden-client barrel (I-16B / DL-16 §223).
//
// The SINGLE shared-client surface BOTH `apps/web` and `apps/mobile` import
// (DL-16 §247). Mirrors the I-15B source-template `packages/api-client/src/index.ts`.
// Exports the shared client + provenance + framework-neutral hook + per-platform
// transport adapters. No contract re-declaration (DL-14 §5).

export {
  goldenRecordsClient,
  createGoldenRecordsClient,
  createGoldenRecordsSharedClient,
  GENERATED_CLIENT_PROVENANCE,
  SHARED_CLIENT_PROVENANCE,
  type GoldenRecordsSharedClient
} from "./golden-records.shared-client.js";
export { useGoldenRecords, type UseGoldenRecordsAccessor } from "./use-golden-records.js";
export { createWebTransport, WEB_PLATFORM } from "./transport/web.js";
export { createMobileTransport, MOBILE_PLATFORM } from "./transport/mobile.js";
