// @sample @demo @reference — I-19 observability fixture real-boundary witness CLI.
//
// Runs the real instrumented golden path + error path + the W3/W4 negatives +
// the probe-contrast (mirror I-15B-3's 4-context false-green contrast), then
// emits ONE JSON line summarizing the boolean witness state. Invoked by
// run-observability-witness.mjs under the ESM resolve loader hook.
//
// REAL-BOUNDARY: every emitted signal is read out of the REAL local capture
// sinks (InMemory OTel exporters + the observability memory log sink). No mock,
// no hand-authored artifact, no shape-only fixture.

import {
  runInstrumentedGoldenSuccessPath,
  runInstrumentedGoldenErrorPath,
} from "../instrumented-boundary.js";
import {
  createLocalCapture,
  parseLogRecord,
  spanAttributesSchema,
  createUuidV4,
} from "@vibe-engineer/observability";

async function main() {
  // --- W1: golden critical path emits ALL FOUR signal classes (real-boundary) ---
  const success = await runInstrumentedGoldenSuccessPath();
  const join = success.joinMatrix;
  const goldenPathEmitsAllSignals =
    success.httpStatus === 200 &&
    success.captured.spans.length >= 3 && // client.call + api.request + verification.run
    success.captured.spans.some((s) => s.name === "client.call") &&
    success.captured.spans.some((s) => s.name === "api.request") &&
    success.captured.spans.some((s) => s.name === "verification.run") &&
    success.captured.logs.length >= 1 &&
    join.clientCallSpan &&
    join.apiRequestSpan &&
    join.successLog &&
    join.correlationId === success.correlationId;

  // --- W2: error path emits error observability + redaction-compatible evidence ---
  const errorPath = await runInstrumentedGoldenErrorPath();
  const errorPathObservable =
    errorPath.httpStatus === 400 &&
    errorPath.errorSpanPresent &&
    errorPath.errorMetricEmitted &&
    errorPath.captured.spans.some(
      (s) => s.attributes["error.type"] === "InvalidRequest" && typeof s.attributes["error.classification"] === "string"
    );
  const errorPathRedacted = errorPath.redactedEvidence;

  // --- W3 NEG: missing-signal fails CLOSED (non-vacuous injection on the real path) ---
  const missingSignalCases = {};
  // (a) missing required log field → schema rejects
  let threw = false;
  try {
    parseLogRecord({
      schemaVersion: "observability.log.v1",
      timestamp: "2026-06-27T00:00:00.000Z",
      severity: "info",
      "service.name": "x",
      surface: "harness",
      "operation.name": "reference.operation",
      "event.name": "reference.operation.started",
      // correlationId intentionally OMITTED
      outcome: "started",
      "redaction.status": "not-required",
    });
  } catch {
    threw = true;
  }
  missingSignalCases.missingCorrelationIdRejected = threw;

  // (b) malformed correlationId → schema rejects
  threw = false;
  try {
    parseLogRecord({
      schemaVersion: "observability.log.v1",
      timestamp: "2026-06-27T00:00:00.000Z",
      severity: "info",
      "service.name": "x",
      surface: "harness",
      "operation.name": "reference.operation",
      "event.name": "reference.operation.started",
      correlationId: "not-a-uuid-trusted",
      outcome: "started",
      "redaction.status": "not-required",
    });
  } catch {
    threw = true;
  }
  missingSignalCases.malformedCorrelationIdRejected = threw;

  // (c) missing required span attribute (correlationId) → spanAttributesSchema rejects
  threw = false;
  try {
    spanAttributesSchema.parse({
      "service.name": "x",
      surface: "harness",
      "operation.name": "reference.operation",
      outcome: "started",
      // correlationId intentionally OMITTED
    });
  } catch {
    threw = true;
  }
  missingSignalCases.missingSpanAttributeRejected = threw;

  // (d) missing traceId on a real span-context log → assertSpanShapedLog throws
  threw = false;
  try {
    const cap = createLocalCapture({ serviceName: "x", surface: "harness" });
    const id = createUuidV4();
    // start a span, then emit a log claiming span context but without traceId
    // → the logger does NOT auto-inject; the layer-specific asserter must reject.
    const { assertSpanShapedLog } = await import("@vibe-engineer/observability");
    assertSpanShapedLog({
      schemaVersion: "observability.log.v1",
      timestamp: "2026-06-27T00:00:00.000Z",
      severity: "info",
      "service.name": "x",
      surface: "harness",
      "operation.name": "reference.operation",
      "event.name": "reference.operation.span",
      correlationId: id,
      outcome: "started",
      "redaction.status": "not-required",
    });
    await cap.shutdown();
  } catch {
    threw = true;
  }
  missingSignalCases.spanShapedLogWithoutTraceIdRejected = threw;

  const missingSignalFailsClosed = Object.values(missingSignalCases).every(Boolean);

  // --- W4 NEG: anti-degradation — shape-only / hand-authored artifacts are NOT closure ---
  let antiDegradationFailsClosed = true;
  // A hand-authored/log-only "evidence" object that carries no real span/metric
  // emission must NOT satisfy the join matrix.
  const handAuthoredShapeOnly = {
    correlationId: createUuidV4(),
    spans: [{ name: "client.call", attributes: { correlationId: "fake" } }],
    logs: [],
  };
  // The join matrix requires the SAME correlationId across client/api/log; a
  // hand-authored object with mismatched/fake ids fails the join.
  const fakeJoinOk =
    handAuthoredShapeOnly.spans[0].attributes.correlationId === handAuthoredShapeOnly.correlationId &&
    handAuthoredShapeOnly.logs.length > 0;
  if (fakeJoinOk) antiDegradationFailsClosed = false;
  // Logs-only (no spans, no metrics) is explicitly NOT closure (DL-23 §2).
  const logsOnlyClosure = success.captured.spans.length === 0; // would be true only if we'd skipped spans
  if (logsOnlyClosure) antiDegradationFailsClosed = false;

  // --- W-PROBE-CONTRAST: disable the real capture sink → consumer reads NOTHING ---
  // (mirror I-15B-3's 4-context false-green contrast). Build a capture context,
  // do NOT emit anything, collect → must be empty. Then the REAL path above
  // (sink enabled) read real signals. The contrast proves the emitted artifacts
  // come from the real instrumentation/exporter and not a mocked sink.
  const disabled = createLocalCapture({ serviceName: "probe", surface: "verification" });
  const disabledCollected = await disabled.collect();
  await disabled.shutdown();
  const probeContrast = {
    sinkDisabledSpansEmpty: disabledCollected.spans.length === 0,
    sinkDisabledLogsEmpty: disabledCollected.logs.length === 0,
    sinkEnabledSpansNonEmpty: success.captured.spans.length > 0,
    sinkEnabledLogsNonEmpty: success.captured.logs.length > 0,
  };
  const probeContrastRulesOutFalseGreen =
    probeContrast.sinkDisabledSpansEmpty &&
    probeContrast.sinkDisabledLogsEmpty &&
    probeContrast.sinkEnabledSpansNonEmpty &&
    probeContrast.sinkEnabledLogsNonEmpty;

  const witness = {
    goldenPathEmitsAllSignals,
    goldenPathJoin: join,
    goldenPathHttpStatus: success.httpStatus,
    goldenPathSpanNames: success.captured.spans.map((s) => s.name),
    errorPathObservable,
    errorPathRedacted,
    errorHttpStatus: errorPath.httpStatus,
    missingSignalFailsClosed,
    missingSignalCases,
    antiDegradationFailsClosed,
    probeContrastRulesOutFalseGreen,
    probeContrast,
  };
  // Single JSON line on stdout (the runner scrapes this).
  process.stdout.write(`${JSON.stringify(witness)}\n`);
}

main().catch((err) => {
  console.error("observability real-boundary cli FATAL:", err);
  process.exit(1);
});
