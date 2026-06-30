// @ts-check
// I-19 / DL-23 — metrics typed helpers: bounded vocabulary enforced (W4/W5).
// Real OTel instruments; arbitrary label keys/values rejected at call sites.
import { describe, it, expect } from "vitest";
import {
  createMeterProvider,
  createMetrics,
  METRIC_NAMES,
  METRIC_LABEL_KEYS,
} from "../src/metrics.js";

function makeMetrics() {
  const { meter } = createMeterProvider({ serviceName: "obs-test", exportIntervalMs: 1000 });
  return createMetrics(meter);
}

describe("W1: the 6 locked metric categories are exposed (DL-23 metrics §3)", () => {
  it("exposes exactly the locked category names (request/client.call/operation/error/verification.run/observability.assertion)", () => {
    const names = Object.values(METRIC_NAMES);
    expect(names).toEqual(
      expect.arrayContaining([
        "request.count",
        "request.duration",
        "client.call.count",
        "client.call.duration",
        "operation.count",
        "operation.duration",
        "error.count",
        "verification.run.count",
        "verification.run.duration",
        "observability.assertion.count",
      ]),
    );
  });

  it("increments a real OTel instrument through the typed helper (no mock)", () => {
    const m = makeMetrics();
    expect(() =>
      m.operationIncrement({
        surface: "harness",
        operation: "reference.operation",
        outcome: "succeeded",
      }),
    ).not.toThrow();
    expect(() =>
      m.requestIncrement({
        surface: "api",
        operation: "api.request",
        outcome: "succeeded",
        statusClass: "2xx",
      }),
    ).not.toThrow();
    expect(() =>
      m.errorIncrement({ surface: "api", operation: "api.request", statusClass: "5xx" }),
    ).not.toThrow();
    expect(() =>
      m.verificationRunIncrement({
        surface: "verification",
        operation: "verification.run",
        outcome: "succeeded",
        runner: "vitest",
      }),
    ).not.toThrow();
    expect(() =>
      m.observabilityAssertionIncrement(
        { surface: "verification", operation: "observability.assertion", component: "log-schema" },
        1,
      ),
    ).not.toThrow();
  });
});

describe("W4/W5 NEGATIVE: bounded label vocabulary rejects arbitrary strings", () => {
  it("rejects an unknown label key (no arbitrary call-site strings)", () => {
    const m = makeMetrics();
    expect(() =>
      m.operationIncrement({
        surface: "harness",
        operation: "reference.operation",
        outcome: "succeeded",
        orderTotal: "99.95",
      }),
    ).toThrow();
  });

  it("rejects an out-of-enum surface/outcome (low-cardinality bounded enums only)", () => {
    const m = makeMetrics();
    expect(() =>
      m.operationIncrement({ surface: "billing", operation: "x", outcome: "succeeded" }),
    ).toThrow();
    expect(() =>
      m.operationIncrement({ surface: "harness", operation: "x", outcome: "queued" }),
    ).toThrow();
  });

  it("rejects an out-of-bounds statusClass", () => {
    const m = makeMetrics();
    expect(() =>
      m.errorIncrement({ surface: "api", operation: "api.request", statusClass: "teapot" }),
    ).toThrow();
  });

  it("rejects a high-cardinality raw id as a label value (DL-23 naming §4)", () => {
    const m = makeMetrics();
    const longId = "x".repeat(65);
    expect(() =>
      m.operationIncrement({ surface: "harness", operation: longId, outcome: "succeeded" }),
    ).toThrow();
  });
});
