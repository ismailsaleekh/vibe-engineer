// @ts-check
// I-19 / DL-23 — W3 NEGATIVE + W1 field-presence: log-record schema fail-closed.
// Missing any required field / unknown key / malformed correlation id MUST throw
// (DL-23 failure policy §1: "Missing required observability evidence is a hard
// verification failure").
import { describe, it, expect } from "vitest";
import {
  parseLogRecord,
  assertSpanShapedLog,
  assertRequestShapedLog,
  logRecordSchema,
} from "../src/contracts.js";
import { createUuidV4 } from "../src/ids.js";

/** A fully-valid record baseline (all always-required fields present). */
function validRecord(overrides = {}) {
  return {
    schemaVersion: "observability.log.v1",
    timestamp: "2026-06-27T00:00:00.000Z",
    severity: "info",
    "service.name": "obs-test",
    surface: "harness",
    "operation.name": "reference.operation",
    "event.name": "reference.operation.started",
    correlationId: createUuidV4(),
    outcome: "succeeded",
    "redaction.status": "not-required",
    ...overrides,
  };
}

describe("W1 positive: a well-formed record parses with all required DL-23 fields", () => {
  it("accepts a record carrying every required field", () => {
    const r = validRecord();
    expect(() => parseLogRecord(r)).not.toThrow();
    expect(parseLogRecord(r).correlationId).toBe(r.correlationId);
  });

  it("accepts error + trace + request conditional fields when well-formed", () => {
    const r = validRecord({
      traceId: "0af7651916cd43dd8448eb211c80319c",
      spanId: "b7ad6b7169203331",
      requestId: createUuidV4(),
      durationMs: 42,
      error: { type: "InvalidRequest", message: "bad payload", stackRef: "rule:invalid-request" },
      "redaction.status": "applied",
    });
    expect(parseLogRecord(r).error.type).toBe("InvalidRequest");
  });
});

describe("W3 NEGATIVE: missing required field fails CLOSED (DL-23 §1 hard failure)", () => {
  const requiredKeys = [
    "schemaVersion",
    "timestamp",
    "severity",
    "service.name",
    "surface",
    "operation.name",
    "event.name",
    "correlationId",
    "outcome",
    "redaction.status",
  ];
  for (const key of requiredKeys) {
    it(`rejects a record missing required field '${key}'`, () => {
      const r = validRecord();
      delete r[key];
      expect(() => parseLogRecord(r)).toThrow();
    });
  }

  it("rejects an out-of-enum severity/surface/outcome", () => {
    expect(() => parseLogRecord(validRecord({ severity: "trace" }))).toThrow();
    expect(() => parseLogRecord(validRecord({ surface: "billing" }))).toThrow();
    expect(() => parseLogRecord(validRecord({ outcome: "pending" }))).toThrow();
  });

  it("rejects a malformed correlationId (non-v4)", () => {
    expect(() => parseLogRecord(validRecord({ correlationId: "not-a-uuid" }))).toThrow();
    expect(() => parseLogRecord(validRecord({ correlationId: "00000000-0000-1000-8000-000000000000" }))).toThrow();
  });

  it("rejects unknown keys (.strict()) — no silent free-form extension", () => {
    expect(() => parseLogRecord(validRecord({ businessOrderTotal: 99.95 }))).toThrow();
  });
});

describe("W3 NEGATIVE: span/request shape assertions fail closed where the boundary requires", () => {
  it("assertSpanShapedLog throws when traceId/spanId absent on a span-context log", () => {
    const r = validRecord();
    expect(() => assertSpanShapedLog(r)).toThrow();
    try {
      assertSpanShapedLog(r);
    } catch (e) {
      expect(e.code).toBe("OBS_SPAN_SHAPE");
    }
  });

  it("assertRequestShapedLog throws when requestId/runId/operationId all absent", () => {
    const r = validRecord();
    expect(() => assertRequestShapedLog(r)).toThrow();
    try {
      assertRequestShapedLog(r);
    } catch (e) {
      expect(e.code).toBe("OBS_REQUEST_SHAPE");
    }
  });

  it("assertRequestShapedLog passes when runId is present (non-request boundary, DL-23 §2)", () => {
    const r = validRecord({ runId: createUuidV4() });
    expect(() => assertRequestShapedLog(r)).not.toThrow();
  });
});

describe("W4 anti-degradation: logRecordSchema is the contract surface", () => {
  it("an arbitrary console-style string is not a valid record (logs-only/unstructured is not closure)", () => {
    expect(() => logRecordSchema.parse("something happened")).toThrow();
    expect(() => logRecordSchema.parse({ msg: "hello" })).toThrow();
  });
});
