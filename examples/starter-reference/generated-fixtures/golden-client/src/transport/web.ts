// @sample @demo @reference — golden-client WEB transport adapter (I-16B / DL-14 §60 / DL-16).
//
// Per-platform transport adapter for `apps/web`: a DOM-`fetch`-SHAPED adapter
// that produces the `ApiFetcher` contract consumed by the SHARED golden client.
// Platform transport adapters MAY differ for fetch/base URL/auth transport
// (DL-14 §60); request/response schemas and route contracts do NOT fork — they
// are imported from the I-16A canonical contract ONLY.
//
// No live DOM runtime is booted here (live web E2E/UI is `I-17A`). To exercise
// the REAL boundary without a network server, the adapter routes the typed call
// to the REAL in-process I-16A provider handler (`handleGoldenRecordsApiRequest`)
// — the same real-provider target a DOM `fetch` would reach over the wire. This
// is the real `@ts-rest/core` + `zod` runtime driving the real provider; NO mock.

import { type ApiFetcher } from "@ts-rest/core";
import { handleGoldenRecordsApiRequest } from "../../../golden-api/src/provider/golden-records.provider.js";

/** WEB platform identity: DOM-fetch-shape transport, browser base URL, web auth header. */
export const WEB_PLATFORM = {
  platform: "web" as const,
  baseUrl: "http://i16b.web.golden.local",
  clientHeader: "web-shared-client"
};

/**
 * Build a DOM-fetch-shaped `ApiFetcher` for the web platform. The adapter owns
 * ONLY fetch/baseURL/auth transport plumbing; the typed request/response shape is
 * bound by the shared client + canonical contract (no fork).
 */
export function createWebTransport(): ApiFetcher {
  return async (args) => {
    const response = handleGoldenRecordsApiRequest({
      method: "POST",
      path: new URL(args.path, WEB_PLATFORM.baseUrl).pathname,
      headers: { ...args.headers, "x-golden-client": WEB_PLATFORM.clientHeader },
      body: args.rawBody
    });
    return {
      status: response.status,
      body: response.body,
      headers: new Headers({ "content-type": "application/json" })
    };
  };
}
