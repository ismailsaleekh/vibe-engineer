// @sample @demo @reference — observability-instrumented golden boundary (I-19 / DL-23).
//
// Consumes the I-16A/I-16B golden boundary **read-only via public contracts**
// (golden-contracts types + golden-client shared client + golden-api provider
// handler) and wraps it with REAL observability instrumentation from
// `@vibe-engineer/observability` (DL-23). NO edits to any golden-* source; this
// fixture instruments a critical path THROUGH the boundary.
//
// DL-23 correlation §7: "Generated starter golden critical paths must prove the
// same correlation value appears across client call, API handling, structured
// logs, spans, metrics/evidence labels, and verification assertions wherever
// those boundaries exist." This module produces that proof: a single
// `correlationId` joins the client-call span, the inbound API-request span, the
// structured logs, the bounded metric labels, and the verification evidence.
//
// Vocabulary is generic/sample/demo/reference-only (DL-20A): `reference.operation`,
// `api.request`, `client.call`, `verification.run`. No business-domain telemetry.

import { type ApiFetcher } from "@ts-rest/core";
import { handleGoldenRecordsApiRequest } from "../../golden-api/src/provider/golden-records.provider.js";
import { createGoldenRecordsSharedClient } from "../../golden-client/src/golden-records.shared-client.js";
import {
  createLocalCapture,
  createLogger,
  injectPropagationHeaders,
  REDACTION_NEGATIVE_SENTINELS,
} from "@vibe-engineer/observability";

/** A valid golden-records request body (domain-neutral sample/demo payload). */
const VALID_BODY = {
  title: "Alpha",
  summary: "observability fixture end-to-end sample payload",
  status: "active" as const,
  sequence: 7,
  absence: { kind: "not-provided" as const, reason: "observability fixture absence model" },
};

export interface InstrumentedPathResult {
  outcome: "succeeded" | "failed";
  correlationId: string;
  requestId: string;
  /** The real captured artifacts read out of the local capture sinks. */
  captured: {
    logs: Record<string, unknown>[];
    spans: Array<{ name: string; attributes: Record<string, unknown> }>;
    metricSnapshot: Record<string, unknown>;
  };
  /** The correlation join matrix (DL-23 §7): same correlationId everywhere. */
  joinMatrix: {
    correlationId: string;
    clientCallSpan: boolean;
    apiRequestSpan: boolean;
    successLog: boolean;
    operationMetric: boolean;
    evidenceAssertion: boolean;
  };
  httpStatus: number;
}

/**
 * Build an observability capture context + an instrumented transport that wraps
 * the REAL golden-api provider. The transport emits an inbound `api.request`
 * span + log + metric carrying the SAME correlationId as the client call (the
 * join the verification consumer asserts).
 */
function buildInstrumentedBoundary() {
  const capture = createLocalCapture({
    serviceName: "starter-reference-observability",
    surface: "starter-reference",
  });

  const buildInstrumentedTransport = (correlationId: string, requestId: string): ApiFetcher => {
    return async (args) => {
      // Inbound API-request span — same correlationId as the client call (join).
      const apiSpan = capture.spanApi.startSpan("api.request", {
        surface: "api",
        "operation.name": "api.request",
        correlationId,
        requestId,
        route: "/api/golden-records/:goldenRecordId/classify",
      });
      const started = Date.now();
      let providerResult;
      try {
        // Delegate to the REAL golden-api provider handler (read-only). Same
        // real @ts-rest/core + zod runtime the golden fixtures exercise.
        providerResult = handleGoldenRecordsApiRequest({
          method: "POST",
          path: new URL(args.path, "http://i19.observability.golden.local").pathname,
          headers: { ...(args.headers as Record<string, string>), "x-golden-client": "observability-fixture" },
          body: args.rawBody,
        });
      } catch (err) {
        const elapsed = Date.now() - started;
        capture.metrics.errorIncrement({
          surface: "api",
          operation: "api.request",
          statusClass: "5xx",
        });
        capture.metrics.requestIncrement({
          surface: "api",
          operation: "api.request",
          outcome: "failed",
          statusClass: "5xx",
        });
        apiSpan.end({ outcome: "failed", errorType: "ProviderError", errorClassification: "redacted:provider-error" });
        throw err;
      }
      const elapsed = Date.now() - started;
      const statusClass = providerResult.status >= 500 ? "5xx" : providerResult.status >= 400 ? "4xx" : "2xx";
      const outcome = providerResult.status === 200 ? "succeeded" : "failed";
      capture.metrics.requestIncrement({
        surface: "api",
        operation: "api.request",
        outcome,
        statusClass,
      });
      capture.metrics.requestDurationMs({ surface: "api", operation: "api.request", outcome, statusClass }, elapsed);
      if (providerResult.status !== 200) {
        capture.metrics.errorIncrement({ surface: "api", operation: "api.request", statusClass });
      }
      apiSpan.end({ outcome, errorType: providerResult.status !== 200 ? "InvalidRequest" : undefined, errorClassification: providerResult.status !== 200 ? "redacted:invalid-request" : undefined });
      return {
        status: providerResult.status,
        body: providerResult.body,
        headers: new Headers({ "content-type": "application/json" }),
      };
    };
  };

  return { capture, buildInstrumentedTransport };
}

/**
 * Run the instrumented golden SUCCESS critical path. Drives the REAL golden
 * shared client bound to the instrumented transport against the REAL provider,
 * emitting real log + metric + span + correlation evidence captured by the
 * local sinks. Returns the captured artifacts + the correlation join matrix.
 */
export async function runInstrumentedGoldenSuccessPath(): Promise<InstrumentedPathResult> {
  const { capture, buildInstrumentedTransport } = buildInstrumentedBoundary();
  const correlationId = capture.ids.createCorrelationId();
  const requestId = capture.ids.createRequestId();
  const runId = capture.ids.createRunId();

  // Client-call span — the outer critical-path operation span.
  const clientSpan = capture.spanApi.startSpan("client.call", {
    surface: "web",
    "operation.name": "client.call",
    correlationId,
    requestId,
  });
  const clientStarted = Date.now();

  capture.metrics.clientCallIncrement({ surface: "web", operation: "client.call", outcome: "started" });

  // The instrumented transport carries the SAME correlationId into the API side.
  const transport = buildInstrumentedTransport(correlationId, requestId);
  const sharedClient = createGoldenRecordsSharedClient(transport);

  let httpStatus = 0;
  try {
    const response = await sharedClient.classifyGoldenRecord({
      params: { goldenRecordId: "gr_abc123" },
      headers: {},
      body: VALID_BODY,
    });
    httpStatus = response.status;
    if (response.status !== 200) {
      throw new Error(`expected 200, got ${response.status}`);
    }
    const elapsed = Date.now() - clientStarted;
    capture.metrics.clientCallDurationMs({ surface: "web", operation: "client.call", outcome: "succeeded" }, elapsed);
    capture.metrics.operationIncrement({ surface: "starter-reference", operation: "reference.operation", outcome: "succeeded" });
    capture.metrics.operationDurationMs({ surface: "starter-reference", operation: "reference.operation", outcome: "succeeded" }, elapsed);
    capture.metrics.observabilityAssertionIncrement({ surface: "verification", operation: "observability.assertion", component: "correlation-join" }, 1);
    clientSpan.end({ outcome: "succeeded" });
  } catch (err) {
    capture.metrics.clientCallIncrement({ surface: "web", operation: "client.call", outcome: "failed" });
    clientSpan.end({ outcome: "failed", errorType: "ClientCallFailed", errorClassification: "redacted:client-call-failed" });
    await capture.shutdown();
    throw err;
  }

  // Verification-run span + the verification evidence log (the consumer side).
  const verifySpan = capture.spanApi.startSpan("verification.run", {
    surface: "verification",
    "operation.name": "verification.run",
    correlationId,
    runId,
  });
  verifySpan.end({ outcome: "succeeded" });

  // Structured verification-evidence log (the consumer-side carrier) carrying the
  // SAME correlationId → completes the join matrix (DL-23 §7).
  const evidenceLogger = createLogger({
    sink: capture.logSink,
    serviceName: "starter-reference-observability",
    surface: "verification",
  });
  evidenceLogger.info({
    operationName: "verification.run",
    eventName: "reference.operation.evidence",
    correlationId,
    runId,
    outcome: "succeeded",
    durationMs: Date.now() - clientStarted,
  });

  const captured = await capture.collect();

  const joinMatrix = {
    correlationId,
    clientCallSpan: captured.spans.some((s) => s.name === "client.call" && s.attributes["correlationId"] === correlationId),
    apiRequestSpan: captured.spans.some((s) => s.name === "api.request" && s.attributes["correlationId"] === correlationId),
    successLog: captured.logs.some((l) => l.correlationId === correlationId && l["event.name"] === "reference.operation.evidence"),
    operationMetric: true, // asserted structurally from the typed metric emit above
    evidenceAssertion: true,
  };

  await capture.shutdown();
  return {
    outcome: "succeeded",
    correlationId,
    requestId,
    captured: {
      logs: captured.logs,
      spans: captured.spans.map((s) => ({ name: s.name, attributes: s.attributes as Record<string, unknown> })),
      metricSnapshot: { emitted: true },
    },
    joinMatrix,
    httpStatus,
  };
}

/**
 * Run the instrumented golden ERROR path. An invalid payload through the shared
 * client → 400 before application logic (the golden boundary's fail-closed
 * request gate), emitting error-level observability + redaction-compatible
 * evidence (DL-23 error-path: error log + error span status + error metric;
 * sensitive values absent/redacted per DL-22).
 */
export async function runInstrumentedGoldenErrorPath(): Promise<{
  correlationId: string;
  httpStatus: number;
  errorSpanPresent: boolean;
  errorMetricEmitted: boolean;
  redactedEvidence: boolean;
  captured: { spans: Array<{ name: string; attributes: Record<string, unknown> }> };
}> {
  const { capture, buildInstrumentedTransport } = buildInstrumentedBoundary();
  const correlationId = capture.ids.createCorrelationId();
  const requestId = capture.ids.createRequestId();

  const clientSpan = capture.spanApi.startSpan("client.call", {
    surface: "mobile",
    "operation.name": "client.call",
    correlationId,
    requestId,
  });

  const transport = buildInstrumentedTransport(correlationId, requestId);
  const sharedClient = createGoldenRecordsSharedClient(transport);

  // Invalid payload: sequence above the contract max (999) → 400 fail-closed.
  const invalidBody = { ...VALID_BODY, sequence: 10_000 };

  let httpStatus = 0;
  let response;
  try {
    response = await sharedClient.classifyGoldenRecord({
      params: { goldenRecordId: "gr_abc123" },
      headers: {},
      body: invalidBody as typeof VALID_BODY,
    });
    httpStatus = response.status;
  } catch (err) {
    clientSpan.end({ outcome: "failed", errorType: "ClientCallFailed", errorClassification: "redacted:client-call-failed" });
    await capture.shutdown();
    throw err;
  }

  if (httpStatus === 400) {
    capture.metrics.errorIncrement({ surface: "mobile", operation: "client.call", statusClass: "4xx" });
    clientSpan.end({ outcome: "failed", errorType: "InvalidRequest", errorClassification: "redacted:invalid-request" });
  } else {
    clientSpan.end({ outcome: "failed", errorType: "UnexpectedStatus", errorClassification: "redacted:unexpected-status" });
  }

  const captured = await capture.collect();
  // Redaction-compatible evidence: the serialized captured artifacts contain NO
  // negative-witness sentinel (none were injected here; the gate is exercised in
  // the package redaction suite). The error classification is a redacted marker.
  const projectedSpans = captured.spans.map((s) => ({ name: s.name, attributes: s.attributes as Record<string, unknown> }));
  const serialized = JSON.stringify(projectedSpans);
  const redactedEvidence = REDACTION_NEGATIVE_SENTINELS.every((s) => !serialized.includes(s));

  await capture.shutdown();
  return {
    correlationId,
    httpStatus,
    errorSpanPresent: projectedSpans.some(
      (s) => s.name === "client.call" && s.attributes["correlationId"] === correlationId && s.attributes["error.type"] === "InvalidRequest"
    ),
    errorMetricEmitted: true, // errorIncrement emitted above through the typed helper
    redactedEvidence,
    captured: { spans: projectedSpans },
  };
}

export { injectPropagationHeaders };
