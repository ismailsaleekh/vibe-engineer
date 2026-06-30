// @ts-check
// I-19 / DL-23 — logging abstraction: real emit through the typed gate.
// The log record is schema-validated at emit (W3 missing-field negative fires
// here), redaction applies before write, and the pino/memory adapters traverse
// the REAL emit path (no mock).
import { describe, it, expect } from "vitest";
import {
  createLogger,
  createPinoSink,
  createMemorySink,
  createBrowserRnCaptureAdapter,
} from "../src/logging.js";
import { createUuidV4 } from "../src/ids.js";
import { REDACTION_NEGATIVE_SENTINELS, assertNoSentinelLeak } from "../src/redaction.js";

function baseFields(overrides = {}) {
  return {
    operationName: "reference.operation",
    eventName: "reference.operation.succeeded",
    correlationId: createUuidV4(),
    outcome: "succeeded",
    ...overrides,
  };
}

describe("W1: logger emits a schema-validated structured record to a real sink", () => {
  it("writes the full typed record to the memory sink", () => {
    const { sink, capture } = createMemorySink();
    const logger = createLogger({ sink, serviceName: "obs-test", surface: "harness" });
    logger.info(baseFields());
    expect(capture).toHaveLength(1);
    expect(capture[0].schemaVersion).toBe("observability.log.v1");
    expect(capture[0]["service.name"]).toBe("obs-test");
    expect(capture[0].surface).toBe("harness");
  });

  it("the pino adapter traverses the REAL pino JSON-line path (no mock)", async () => {
    const { pino } = await import("pino");
    const written = [];
    const stream = { write: (line) => written.push(line) };
    const pinoLogger = pino({ level: "info" }, stream);
    const capture = [];
    const sink = createPinoSink(pinoLogger, { capture });
    const logger = createLogger({ sink, serviceName: "obs-test", surface: "api" });
    logger.warn(baseFields({ outcome: "failed" }));
    // pino emitted a real newline-delimited JSON line.
    expect(written.length).toBe(1);
    const line = JSON.parse(written[0]);
    expect(line.level).toBe(40); // pino warn numeric level
    expect(line.surface).toBe("api");
    expect(capture).toHaveLength(1);
  });
});

describe("W3 NEGATIVE: emit fails closed when a required field is missing", () => {
  it("throws (does not silently drop) when correlationId is missing", () => {
    const { sink, capture } = createMemorySink();
    const logger = createLogger({ sink, serviceName: "obs-test", surface: "harness" });
    const bad = baseFields();
    delete bad.correlationId;
    expect(() => logger.info(bad)).toThrow();
    expect(capture).toHaveLength(0);
  });
});

describe("W2/W4 redaction gate: sensitive sentinels never reach the carrier", () => {
  it("redacts a sentinel-bearing message and sets redaction.status=applied", () => {
    const { sink, capture } = createMemorySink();
    const logger = createLogger({
      sink,
      serviceName: "obs-test",
      surface: "api",
      sensitiveHints: REDACTION_NEGATIVE_SENTINELS,
    });
    logger.error(
      baseFields({
        outcome: "failed",
        error: {
          type: "InvalidRequest",
          message: `token=${REDACTION_NEGATIVE_SENTINELS[0]} leaked`,
          stackRef: "rule:invalid-request",
        },
      }),
    );
    expect(capture).toHaveLength(1);
    const serialized = JSON.stringify(capture[0]);
    assertNoSentinelLeak(serialized);
    expect(capture[0]["redaction.status"]).toBe("applied");
    // the error message still carries the typed classification, but not the raw sentinel
    expect(serialized).toContain("InvalidRequest");
  });
});

describe("browser/RN adapter: structured record is the carrier; console is non-authoritative", () => {
  it("writes the typed record to the local capture sink (the authoritative contract)", () => {
    const capture = [];
    const { sink, devConsole } = createBrowserRnCaptureAdapter({ capture });
    const logger = createLogger({
      sink,
      serviceName: "obs-test",
      surface: "mobile",
      devConsole,
    });
    logger.info(baseFields());
    expect(capture).toHaveLength(1);
    expect(capture[0].surface).toBe("mobile");
  });
});
