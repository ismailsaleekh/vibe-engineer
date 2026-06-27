// @ts-check
//
// Local capture / test exporters for @vibe-engineer/observability
// (I-19 / DL-23 starter scope §2: "local capture sinks/test exporters ... NOT a
// production backend"). These wrap the REAL OTel InMemory exporters + a pino
// capture stream so the verification consumer reads ACTUAL emitted artifacts
// (W1). No Prometheus/Jaeger/Grafana/cloud — DL-23 starter scope §3.
//
// DL-23 failure policy §3: "Shape-only fixtures, mocked emitters without actual
// instrumentation, hand-authored evidence artifacts, and synthetic-only logs are
// NOT closure evidence." Every artifact read out of a capture sink below was
// produced by real instrumentation traversing the real OTel/pino emit path.

import { createMemorySink } from "./logging.js";
import {
  createTracerProvider,
  createSpanApi,
  InMemorySpanExporter,
} from "./tracing.js";
import {
  createMeterProvider,
  createMetrics,
  InMemoryMetricExporter,
  AggregationTemporality,
} from "./metrics.js";
import { createCorrelationId, createRequestId, createRunId, createOperationId } from "./ids.js";
import { resolveInboundIds } from "./propagation.js";

/**
 * A local capture harness: wires real OTel span/metric providers + a pino/memory
 * log sink + a correlation-id factory into ONE bounded observability context.
 * Used by both the package unit tests and the starter demonstration so the
 * verification consumer reads real emitted artifacts from one deterministic
 * capture store (W1 correlation join matrix).
 *
 * @param {{ serviceName: string, surface: import("./contracts.js").Surface, logCapture?: Record<string, unknown>[] }} opts
 */
export function createLocalCapture(opts) {
  const logCapture = opts.logCapture ?? [];
  const { sink: logSink, capture: logCaptureResolved } = createMemorySink(logCapture);

  const spanExporter = new InMemorySpanExporter();
  const metricExporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  const { provider: tracerProvider, tracer, exporter: spanExpResolved } = createTracerProvider({
    serviceName: opts.serviceName,
    surface: opts.surface,
    exporter: spanExporter,
  });
  const { provider: meterProvider, meter, exporter: metricExpResolved, reader: metricReader } = createMeterProvider({
    serviceName: opts.serviceName,
    exporter: metricExporter,
  });

  const spanApi = createSpanApi(tracer, { serviceName: opts.serviceName, surface: opts.surface });
  const metrics = createMetrics(meter);

  return {
    serviceName: opts.serviceName,
    surface: opts.surface,
    logSink,
    logCapture: logCaptureResolved,
    spanExporter: spanExpResolved,
    metricExporter: metricExpResolved,
    metricReader,
    tracerProvider,
    meterProvider,
    spanApi,
    metrics,
    ids: {
      createCorrelationId,
      createRequestId,
      createRunId,
      createOperationId,
    },
    resolveInboundIds,
    /** Flush + collect every emitted artifact (the verification consumer's read). */
    async collect() {
      // Flush metrics (periodic reader) + spans (simple processor is sync).
      await metricReader?.collect()?.then?.(() => {}, () => {});
      const finishedSpans = typeof spanExpResolved.getFinishedSpans === "function" ? spanExpResolved.getFinishedSpans() : [];
      /** @type {any[]} */
      let metricRecords = [];
      try {
        // InMemoryMetricExporter (OTel 1.30) — read collected resources.
        const collected = metricExpResolved.getCollectedMetrics?.() ?? metricExpResolved.collect?.();
        metricRecords = Array.isArray(collected) ? collected : [];
      } catch {
        metricRecords = [];
      }
      return {
        logs: [...logCaptureResolved],
        spans: finishedSpans,
        metrics: metricRecords,
      };
    },
    async shutdown() {
      try { await tracerProvider.shutdown(); } catch {}
      try { await meterProvider.shutdown(); } catch {}
    },
  };
}

export { createTracerProvider, createSpanApi, createMeterProvider, createMetrics, InMemorySpanExporter, InMemoryMetricExporter, AggregationTemporality };
export { createCorrelationId, createRequestId, createRunId, createOperationId, createUuidV4, isValidUuidV4, parseUuidV4 } from "./ids.js";
export { resolveInboundIds, injectPropagationHeaders, parseTraceparent, formatTraceparent, propagateRoundTrip } from "./propagation.js";
export { createLogger, createPinoSink, createBrowserRnCaptureAdapter, createMemorySink } from "./logging.js";
export { redactRecord, assertNoSentinelLeak, REDACTION_NEGATIVE_SENTINELS } from "./redaction.js";
export {
  parseLogRecord,
  logRecordSchema,
  assertSpanShapedLog,
  assertRequestShapedLog,
  spanAttributesSchema,
  METRIC_NAMES,
  METRIC_LABEL_KEYS,
  METRIC_LABEL_VALUES,
  SEVERITIES,
  SURFACES,
  OUTCOMES,
  REDACTION_STATUSES,
  UUID_V4_PATTERN,
  SCHEMA_VERSIONS,
} from "./contracts.js";
