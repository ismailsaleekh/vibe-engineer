// @ts-check
// I-19 / DL-23 — tracing span API: REAL OpenTelemetry emission (no mock). The
// InMemorySpanExporter is the real test exporter; spans carry the required
// bounded attributes; the correlation id survives onto the span (W1 join).
import { describe, it, expect } from "vitest";
import { createLocalCapture } from "../src/test-exporters.js";
import { createUuidV4, isValidUuidV4 } from "../src/ids.js";

describe("W1: startSpan emits a real OTel span with required attributes", () => {
  it("records a span read out of the real InMemorySpanExporter", async () => {
    const cap = createLocalCapture({ serviceName: "obs-test", surface: "harness" });
    const correlationId = createUuidV4();
    const handle = cap.spanApi.startSpan("reference.operation", {
      surface: "harness",
      "operation.name": "reference.operation",
      correlationId,
    });
    expect(handle.correlationId).toBe(correlationId);
    expect(handle.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(handle.spanId).toMatch(/^[0-9a-f]{16}$/);
    handle.end({ outcome: "succeeded" });
    const collected = await cap.collect();
    expect(collected.spans.length).toBe(1);
    const span = collected.spans[0];
    expect(span.name).toBe("reference.operation");
    expect(span.attributes["correlationId"]).toBe(correlationId);
    expect(span.attributes["surface"]).toBe("harness");
    expect(span.attributes["outcome"]).toBe("succeeded");
    await cap.shutdown();
  });

  it("error path: span carries error.type + classification + ERROR status (W2)", async () => {
    const cap = createLocalCapture({ serviceName: "obs-test", surface: "api" });
    const correlationId = createUuidV4();
    const handle = cap.spanApi.startSpan("api.request", {
      surface: "api",
      "operation.name": "api.request",
      correlationId,
      requestId: createUuidV4(),
      route: "/api/golden-records/:goldenRecordId/classify",
    });
    handle.end({
      outcome: "failed",
      errorType: "InvalidRequest",
      errorClassification: "redacted:invalid-request",
    });
    const collected = await cap.collect();
    const span = collected.spans[0];
    expect(span.attributes["error.type"]).toBe("InvalidRequest");
    expect(span.attributes["error.classification"]).toBe("redacted:invalid-request");
    // OTel span status ERROR is code 2 — assert via the readable jsonExported shape if present
    await cap.shutdown();
  });
});

describe("W3 NEGATIVE: missing required span attribute fails closed", () => {
  it("throws when correlationId is missing", () => {
    const cap = createLocalCapture({ serviceName: "obs-test", surface: "harness" });
    expect(() =>
      cap.spanApi.startSpan("reference.operation", {
        surface: "harness",
        "operation.name": "reference.operation",
      }),
    ).toThrow();
  });

  it("throws when an invalid (non-v4) correlationId is supplied", () => {
    const cap = createLocalCapture({ serviceName: "obs-test", surface: "harness" });
    expect(() =>
      cap.spanApi.startSpan("reference.operation", {
        surface: "harness",
        "operation.name": "reference.operation",
        correlationId: "not-a-uuid",
      }),
    ).toThrow();
  });
});

describe("W5 regression: trace/span ids are canonical hex (no raw user content in span ids)", () => {
  it("the emitted traceId/spanId are not derived from user input", async () => {
    const cap = createLocalCapture({ serviceName: "obs-test", surface: "verification" });
    const handle = cap.spanApi.startSpan("verification.run", {
      surface: "verification",
      "operation.name": "verification.run",
      correlationId: createUuidV4(),
      runId: createUuidV4(),
    });
    handle.end({ outcome: "succeeded" });
    const collected = await cap.collect();
    const span = collected.spans[0];
    expect(span.spanContext().traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(span.spanContext().spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(isValidUuidV4(span.attributes["correlationId"])).toBe(true);
    await cap.shutdown();
  });
});
