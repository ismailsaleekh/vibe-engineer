// @ts-check
//
// W3C Trace Context propagation + inbound correlation/request-id resolution for
// @vibe-engineer/observability (I-19 / DL-23 correlation §4–§7).
//
// DL-23 Tracing §4: "W3C Trace Context (traceparent and tracestate where
// available) is the default propagation carrier across HTTP/API/client
// boundaries." Correlation §4: "Inbound x-request-id and correlation headers may
// be preserved only when they validate as canonical UUID v4 strings under the
// typed ID parser. Otherwise the implementation must generate new UUID v4 IDs and
// record that regeneration occurred WITHOUT LOGGING THE INVALID INBOUND VALUE."
//
// The invalid-inbound value is NEVER placed in any record, evidence, or log —
// only the boolean `regenerated: true` marker (DL-23 §4 + the quality bar's "no
// silent fallbacks" — regeneration is explicit and recorded, but the untrusted
// raw value is never trusted or persisted).

import { isValidUuidV4, parseUuidV4, createCorrelationId, createRequestId } from "./ids.js";
import { TRACE_ID_PATTERN, SPAN_ID_PATTERN } from "./contracts.js";

/**
 * Canonical W3C `traceparent` header value for the given trace/span ids.
 * Format: `00-<traceId(32hex)>-<spanId(16hex)>-<flags(2hex)>`.
 * @param {{ traceId: string, spanId: string, sampled?: boolean }} ctx
 * @returns {string}
 */
export function formatTraceparent(ctx) {
  if (!TRACE_ID_PATTERN.test(ctx.traceId))
    throw new TypeError("formatTraceparent: invalid traceId");
  if (!SPAN_ID_PATTERN.test(ctx.spanId)) throw new TypeError("formatTraceparent: invalid spanId");
  const flags = ctx.sampled === false ? "00" : "01";
  return `00-${ctx.traceId}-${ctx.spanId}-${flags}`;
}

/**
 * Parse a W3C `traceparent` header. Returns `{ traceId, spanId, sampled }` or
 * `null` if the header is absent or non-canonical (never throws on a malformed
 * INBOUND value — propagation is best-effort across an untrusted boundary; the
 * caller regenerates a fresh context when this returns null).
 * @param {string|undefined|null} header
 * @returns {{ traceId: string, spanId: string, sampled: boolean } | null}
 */
export function parseTraceparent(header) {
  if (typeof header !== "string") return null;
  const parts = header.trim().split("-");
  if (parts.length !== 4) return null;
  const [, traceId, spanId, flags] = parts;
  if (!TRACE_ID_PATTERN.test(traceId)) return null;
  if (!SPAN_ID_PATTERN.test(spanId)) return null;
  if (!/^[0-9a-f]{2}$/.test(flags)) return null;
  return { traceId, spanId, sampled: (parseInt(flags, 16) & 0x01) === 0x01 };
}

/**
 * Inject W3C trace-context + correlation/request-id headers into a mutable
 * carrier (DL-23 correlation §7: web/mobile clients attach correlation/request
 * headers to API calls; API response → client evidence).
 *
 * Idempotent: overwrites existing `traceparent`/`tracestate`/`x-correlation-id`/
 * `x-request-id` on the carrier.
 * @param {Record<string, string>} carrier
 * @param {{ traceId?: string, spanId?: string, correlationId: string, requestId?: string, sampled?: boolean }} ctx
 * @returns {Record<string, string>}
 */
export function injectPropagationHeaders(carrier, ctx) {
  const out = { ...carrier };
  if (ctx.traceId && ctx.spanId) {
    out.traceparent = formatTraceparent({
      traceId: ctx.traceId,
      spanId: ctx.spanId,
      sampled: ctx.sampled,
    });
  }
  out["x-correlation-id"] = ctx.correlationId;
  if (ctx.requestId) {
    out["x-request-id"] = ctx.requestId;
  }
  return out;
}

/**
 * Extract correlation/request-id + trace context from an inbound header bag.
 * (DL-23 correlation §4 inbound-preservation gate.)
 *
 * Returns a typed resolution:
 *   - `correlationId` / `requestId` are preserved ONLY when the inbound header
 *     is a canonical UUID v4 (parseUuidV4); otherwise regenerated and
 *     `regeneratedCorrelation` / `regeneratedRequest` set `true`.
 *   - The INVALID INBOUND VALUE is NEVER returned or logged (DL-23 §4); only the
 *     boolean regeneration marker is.
 *   - `traceId`/`spanId` come from `traceparent` when canonical, else undefined
 *     (the caller starts a fresh trace).
 *
 * @param {Record<string, string | string[] | undefined>} headers
 * @returns {{
 *   correlationId: string,
 *   requestId: string,
 *   traceId?: string,
 *   spanId?: string,
 *   sampled?: boolean,
 *   regeneratedCorrelation: boolean,
 *   regeneratedRequest: boolean,
 *   inboundCorrelationPresent: boolean,
 *   inboundRequestPresent: boolean,
 * }}
 */
export function resolveInboundIds(headers) {
  const lower = /** @type {Record<string, string | undefined>} */ ({});
  for (const [k, v] of Object.entries(headers || {})) {
    if (Array.isArray(v)) lower[String(k).toLowerCase()] = v[0];
    else if (typeof v === "string") lower[String(k).toLowerCase()] = v;
  }

  const inboundCorrelation = lower["x-correlation-id"];
  const inboundRequest = lower["x-request-id"];
  const inboundTraceparent = lower["traceparent"];

  let correlationId;
  let regeneratedCorrelation = false;
  const inboundCorrelationPresent = inboundCorrelation !== undefined;
  if (inboundCorrelationPresent && isValidUuidV4(inboundCorrelation)) {
    correlationId = parseUuidV4(inboundCorrelation);
  } else {
    correlationId = createCorrelationId();
    regeneratedCorrelation = inboundCorrelationPresent; // only flag if a (bad) value was actually present
  }

  let requestId;
  let regeneratedRequest = false;
  const inboundRequestPresent = inboundRequest !== undefined;
  if (inboundRequestPresent && isValidUuidV4(inboundRequest)) {
    requestId = parseUuidV4(inboundRequest);
  } else {
    requestId = createRequestId();
    regeneratedRequest = inboundRequestPresent;
  }

  // DL-23 correlation §5: "requestId and correlationId default to the same
  // generated UUID v4 unless a valid upstream correlation value is received."
  // If BOTH inbound were absent, correlation === request (same generated v4).
  if (!inboundCorrelationPresent && !inboundRequestPresent) {
    requestId = correlationId;
  }

  const trace = parseTraceparent(inboundTraceparent);

  return {
    correlationId,
    requestId,
    traceId: trace?.traceId,
    spanId: trace?.spanId,
    sampled: trace?.sampled,
    regeneratedCorrelation,
    regeneratedRequest,
    inboundCorrelationPresent,
    inboundRequestPresent,
  };
}

/**
 * Propagation round-trip helper used by both instrumentation and verification
 * (W1 correlation join matrix): inject on the client side, extract on the API
 * side, and confirm the same correlationId/requestId survive the boundary.
 *
 * @param {{ correlationId: string, requestId?: string, traceId?: string, spanId?: string }} outbound
 * @returns {{ headers: Record<string,string>, extracted: ReturnType<resolveInboundIds> }}
 */
export function propagateRoundTrip(outbound) {
  const headers = injectPropagationHeaders(
    {},
    {
      correlationId: outbound.correlationId,
      requestId: outbound.requestId,
      traceId: outbound.traceId,
      spanId: outbound.spanId,
    },
  );
  const extracted = resolveInboundIds(headers);
  return { headers, extracted };
}
