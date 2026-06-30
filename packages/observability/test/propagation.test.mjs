// @ts-check
// I-19 / DL-23 — W3C Trace Context propagation + inbound correlation/request-id
// resolution (DL-23 correlation §4–§7). Real round-trip + the inbound-header
// regeneration-without-logging-invalid-value rule.
import { describe, it, expect } from "vitest";
import {
  formatTraceparent,
  parseTraceparent,
  injectPropagationHeaders,
  resolveInboundIds,
  propagateRoundTrip,
} from "../src/propagation.js";
import { createCorrelationId, isValidUuidV4 } from "../src/ids.js";

describe("W3C Trace Context traceparent format/parse", () => {
  it("formats + parses a canonical traceparent", () => {
    const tp = formatTraceparent({
      traceId: "0af7651916cd43dd8448eb211c80319c",
      spanId: "b7ad6b7169203331",
      sampled: true,
    });
    expect(tp).toBe("00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01");
    expect(parseTraceparent(tp)).toEqual({
      traceId: "0af7651916cd43dd8448eb211c80319c",
      spanId: "b7ad6b7169203331",
      sampled: true,
    });
  });

  it("parseTraceparent returns null on a malformed INBOUND value (best-effort, never throws)", () => {
    expect(parseTraceparent("garbage")).toBeNull();
    expect(parseTraceparent(undefined)).toBeNull();
    expect(parseTraceparent("00-zzz-b7ad6b7169203331-01")).toBeNull();
    expect(parseTraceparent("00-0af7651916cd43dd8448eb211c80319c-short-01")).toBeNull();
  });

  it("formatTraceparent rejects invalid ids (typed gate)", () => {
    expect(() => formatTraceparent({ traceId: "nope", spanId: "b7ad6b7169203331" })).toThrow();
    expect(() =>
      formatTraceparent({ traceId: "0af7651916cd43dd8448eb211c80319c", spanId: "nope" }),
    ).toThrow();
  });
});

describe("DL-23 correlation §4: inbound header preservation only on valid UUID v4", () => {
  it("preserves a valid v4 x-correlation-id + x-request-id", () => {
    const corr = createCorrelationId();
    const req = createCorrelationId();
    const out = resolveInboundIds({
      "x-correlation-id": corr,
      "x-request-id": req,
    });
    expect(out.correlationId).toBe(corr);
    expect(out.requestId).toBe(req);
    expect(out.regeneratedCorrelation).toBe(false);
    expect(out.regeneratedRequest).toBe(false);
  });

  it("regenerates + flags when inbound is a non-v4 value, and NEVER returns/logs the invalid value", () => {
    const invalidValue = "i-am-not-a-uuid-or-trusted-id";
    const out = resolveInboundIds({
      "x-correlation-id": invalidValue,
      "x-request-id": invalidValue,
    });
    expect(isValidUuidV4(out.correlationId)).toBe(true);
    expect(isValidUuidV4(out.requestId)).toBe(true);
    expect(out.regeneratedCorrelation).toBe(true);
    expect(out.regeneratedRequest).toBe(true);
    // The invalid inbound value is NOT present anywhere in the resolved output.
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain(invalidValue);
  });

  it("when no inbound headers, correlation===request (same generated v4) per DL-23 §5", () => {
    const out = resolveInboundIds({});
    expect(out.correlationId).toBe(out.requestId);
    expect(isValidUuidV4(out.correlationId)).toBe(true);
    expect(out.regeneratedCorrelation).toBe(false);
  });

  it("preserves a valid v4 correlation even when request header is garbage (mixed)", () => {
    const corr = createCorrelationId();
    const out = resolveInboundIds({ "x-correlation-id": corr, "x-request-id": "garbage" });
    expect(out.correlationId).toBe(corr);
    expect(isValidUuidV4(out.requestId)).toBe(true);
    expect(out.regeneratedRequest).toBe(true);
  });
});

describe("DL-23 §7: propagation round-trip survives the boundary (W1 correlation join)", () => {
  it("inject → extract preserves correlationId + requestId across a client→API boundary", () => {
    const corr = createCorrelationId();
    const req = createCorrelationId();
    const { headers, extracted } = propagateRoundTrip({
      correlationId: corr,
      requestId: req,
      traceId: "0af7651916cd43dd8448eb211c80319c",
      spanId: "b7ad6b7169203331",
    });
    expect(headers["x-correlation-id"]).toBe(corr);
    expect(headers["x-request-id"]).toBe(req);
    expect(headers.traceparent).toContain("0af7651916cd43dd8448eb211c80319c");
    expect(extracted.correlationId).toBe(corr);
    expect(extracted.requestId).toBe(req);
    expect(extracted.traceId).toBe("0af7651916cd43dd8448eb211c80319c");
    expect(extracted.spanId).toBe("b7ad6b7169203331");
  });
});
