// @sample @demo @reference — golden-client MOBILE (React Native) transport adapter (I-16B / DL-14 §60 / DL-16).
//
// Per-platform transport adapter for `apps/mobile`: a React-Native-`fetch`-SHAPED
// adapter that produces the `ApiFetcher` contract consumed by the SHARED golden
// client. Platform transport adapters MAY differ for fetch/base URL/auth
// transport (DL-14 §60); request/response schemas and route contracts do NOT
// fork — they are imported from the I-16A canonical contract ONLY.
//
// This is a typed, import-safe module. Live RN runtime rendering is NOT required
// here (that is `I-17B`, and may be `pending-live/BLOCKED`) — I-16B proves the
// IMPORT + FLOW seam, not a device render. To exercise the REAL boundary without
// a device, the adapter routes the typed call to the REAL in-process I-16A
// provider handler (`handleGoldenRecordsApiRequest`) — the real `@ts-rest/core` +
// `zod` runtime driving the real provider; NO mock.

import { type ApiFetcher } from "@ts-rest/core";
import { handleGoldenRecordsApiRequest } from "../../../golden-api/src/provider/golden-records.provider.js";

/** MOBILE (RN) platform identity: RN-fetch-shape transport, device base URL, mobile auth header. */
export const MOBILE_PLATFORM = {
  platform: "mobile" as const,
  baseUrl: "http://i16b.mobile.golden.local",
  clientHeader: "mobile-shared-client"
};

/**
 * Build a React-Native-fetch-shaped `ApiFetcher` for the mobile platform. The
 * adapter owns ONLY fetch/baseURL/auth transport plumbing; the typed
 * request/response shape is bound by the shared client + canonical contract
 * (no fork).
 */
export function createMobileTransport(): ApiFetcher {
  return async (args) => {
    const response = handleGoldenRecordsApiRequest({
      method: "POST",
      path: new URL(args.path, MOBILE_PLATFORM.baseUrl).pathname,
      headers: { ...args.headers, "x-golden-client": MOBILE_PLATFORM.clientHeader },
      body: args.rawBody
    });
    return {
      status: response.status,
      body: response.body,
      headers: new Headers({ "content-type": "application/json" })
    };
  };
}
