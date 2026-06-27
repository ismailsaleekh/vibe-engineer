// @ts-check
//
// @vibe-engineer/observability — public surface barrel (I-19 / DL-23).
//
// Domain-neutral harness-core observability abstraction: typed structured
// logging (Pino default Node/Nest/CLI adapter + browser/RN capture adapters),
// OpenTelemetry-backed tracing span API, OpenTelemetry typed metrics helpers
// (the 6 locked categories), canonical RFC 4122 UUID v4 correlation/request/run
// id factory + W3C Trace Context propagation, DL-22/I-18 redaction integration,
// and local capture / in-process OTel test exporters (the verification sink).
//
// Core code depends on THIS abstraction — not ad-hoc console.log or
// framework-logger calls (DL-23 Logging §1). Vocabulary is generic/sample/demo/
// reference only (DL-20A). No production backend is required for verification
// (DL-23 starter scope §3).

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
  TRACE_ID_PATTERN,
  SPAN_ID_PATTERN,
  SCHEMA_VERSIONS,
} from "./contracts.js";

export {
  createUuidV4,
  isValidUuidV4,
  parseUuidV4,
  createCorrelationId,
  createRequestId,
  createRunId,
  createOperationId,
} from "./ids.js";

export {
  formatTraceparent,
  parseTraceparent,
  injectPropagationHeaders,
  resolveInboundIds,
  propagateRoundTrip,
} from "./propagation.js";

export {
  createLogger,
  createPinoSink,
  createBrowserRnCaptureAdapter,
  createMemorySink,
} from "./logging.js";

export {
  createTracerProvider,
  createSpanApi,
  InMemorySpanExporter,
} from "./tracing.js";

export {
  createMeterProvider,
  createMetrics,
  InMemoryMetricExporter,
  AggregationTemporality,
} from "./metrics.js";

export {
  redactRecord,
  assertNoSentinelLeak,
  REDACTION_NEGATIVE_SENTINELS,
} from "./redaction.js";

export { createLocalCapture } from "./test-exporters.js";
