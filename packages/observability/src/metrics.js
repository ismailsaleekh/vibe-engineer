// @ts-check
//
// Typed OpenTelemetry Metrics helpers for @vibe-engineer/observability
// (I-19 / DL-23 Metrics default).
//
// DL-23 Metrics §2: "Metrics must be emitted through typed helpers in
// packages/observability, not through arbitrary strings at call sites." §3–§4:
// the 6 locked categories with bounded, domain-neutral, low-cardinality labels
// (surface/operation/outcome/statusClass/component/runner/result). Raw user
// content / secrets / high-cardinality ids / business names are FORBIDDEN in
// core labels.
//
// The helpers below wrap REAL `@opentelemetry/sdk-metrics` instruments (NO mock).
// A call site cannot pass an arbitrary metric name or label key — the typed
// factory only exposes the locked names + bounded label keys (W4 anti-degradation
// + W5 regression).

import {
  MeterProvider,
  InMemoryMetricExporter,
  PeriodicExportingMetricReader,
  AggregationTemporality,
} from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import {
  METRIC_NAMES,
  METRIC_LABEL_KEYS,
  METRIC_LABEL_VALUES,
  surfaceSchema,
  outcomeSchema,
} from "./contracts.js";

export { InMemoryMetricExporter, AggregationTemporality };

/**
 * Build a real OTel meter provider. The default reader is a real
 * InMemoryMetricExporter read on-demand by the verification consumer (W1).
 *
 * @param {{ serviceName: string, exporter?: InMemoryMetricExporter, exportIntervalMs?: number }} opts
 */
export function createMeterProvider(opts) {
  const exporter = opts.exporter ?? new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: opts.exportIntervalMs ?? 50,
  });
  const provider = new MeterProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: opts.serviceName,
    }),
    readers: [reader],
  });
  const meter = provider.getMeter("@vibe-engineer/observability", "0.1.0-i19");
  return { provider, meter, exporter, reader };
}

/**
 * Validate a bounded label set. Throws on any label key/value outside the locked
 * vocabulary (DL-23 naming §4; W5 regression). High-cardinality raw ids never
 * reach the label set.
 *
 * @param {Record<string, string>} labels
 * @param {string[]} allowedKeys
 */
function validateLabels(labels, allowedKeys) {
  for (const [k, v] of Object.entries(labels)) {
    if (!allowedKeys.includes(k)) {
      throw new Error(
        `metrics: label key '${k}' is not in the bounded core vocabulary (DL-23 metrics §4). Allowed: ${allowedKeys.join(", ")}`,
      );
    }
    if (typeof v !== "string" || v.length === 0 || v.length > 64) {
      throw new Error(
        `metrics: label value for '${k}' must be a bounded non-empty string (≤64 chars)`,
      );
    }
    // Enum-bound values must be from the locked set.
    if (k === METRIC_LABEL_KEYS.surface) surfaceSchema.parse(v);
    if (k === METRIC_LABEL_KEYS.outcome) outcomeSchema.parse(v);
    if (k === METRIC_LABEL_KEYS.statusClass && !METRIC_LABEL_VALUES.statusClass.includes(v)) {
      throw new Error(
        `metrics: statusClass '${v}' not in bounded enum ${JSON.stringify(METRIC_LABEL_VALUES.statusClass)}`,
      );
    }
    if (k === METRIC_LABEL_KEYS.result && !METRIC_LABEL_VALUES.result.includes(v)) {
      throw new Error(
        `metrics: result '${v}' not in bounded enum ${JSON.stringify(METRIC_LABEL_VALUES.result)}`,
      );
    }
  }
}

/** The full bounded label-key vocabulary (call sites may use any subset). */
const ALL_KEYS = Object.values(METRIC_LABEL_KEYS);

/**
 * Create the typed metric helpers for all 6 locked categories. Each helper
 * validates its bounded labels before touching a real OTel instrument.
 *
 * @param {import("@opentelemetry/api").Meter} meter
 */
export function createMetrics(meter) {
  if (!meter) throw new Error("createMetrics: an OTel Meter is required");

  const requestCounter = meter.createCounter(METRIC_NAMES.requestCount, {
    description: "inbound request count",
  });
  const requestDuration = meter.createHistogram(METRIC_NAMES.requestDuration, {
    description: "inbound request duration ms",
    unit: "ms",
  });
  const clientCallCounter = meter.createCounter(METRIC_NAMES.clientCallCount, {
    description: "outbound client/external call count",
  });
  const clientCallDuration = meter.createHistogram(METRIC_NAMES.clientCallDuration, {
    description: "outbound client/external call duration ms",
    unit: "ms",
  });
  const operationCounter = meter.createCounter(METRIC_NAMES.operationCount, {
    description: "golden critical-path operation count",
  });
  const operationDuration = meter.createHistogram(METRIC_NAMES.operationDuration, {
    description: "golden critical-path operation duration ms",
    unit: "ms",
  });
  const errorCounter = meter.createCounter(METRIC_NAMES.errorCount, {
    description: "error count by bounded class",
  });
  const verificationRunCounter = meter.createCounter(METRIC_NAMES.verificationRunCount, {
    description: "verification run count",
  });
  const verificationRunDuration = meter.createHistogram(METRIC_NAMES.verificationRunDuration, {
    description: "verification run duration ms",
    unit: "ms",
  });
  const assertionCounter = meter.createCounter(METRIC_NAMES.observabilityAssertionCount, {
    description: "observability assertion pass/fail accounting",
  });

  return {
    /** @param {Record<string, string>} labels */
    requestIncrement(labels) {
      validateLabels(labels, ALL_KEYS);
      requestCounter.add(1, labels);
    },
    /** @param {Record<string, string>} labels @param {number} ms */
    requestDurationMs(labels, ms) {
      validateLabels(labels, ALL_KEYS);
      requestDuration.record(Math.max(0, ms), labels);
    },
    /** @param {Record<string, string>} labels */
    clientCallIncrement(labels) {
      validateLabels(labels, ALL_KEYS);
      clientCallCounter.add(1, labels);
    },
    /** @param {Record<string, string>} labels @param {number} ms */
    clientCallDurationMs(labels, ms) {
      validateLabels(labels, ALL_KEYS);
      clientCallDuration.record(Math.max(0, ms), labels);
    },
    /** @param {Record<string, string>} labels */
    operationIncrement(labels) {
      validateLabels(labels, ALL_KEYS);
      operationCounter.add(1, labels);
    },
    /** @param {Record<string, string>} labels @param {number} ms */
    operationDurationMs(labels, ms) {
      validateLabels(labels, ALL_KEYS);
      operationDuration.record(Math.max(0, ms), labels);
    },
    /** @param {Record<string, string>} labels */
    errorIncrement(labels) {
      validateLabels(labels, ALL_KEYS);
      errorCounter.add(1, labels);
    },
    /** @param {Record<string, string>} labels */
    verificationRunIncrement(labels) {
      validateLabels(labels, ALL_KEYS);
      verificationRunCounter.add(1, labels);
    },
    /** @param {Record<string, string>} labels @param {number} ms */
    verificationRunDurationMs(labels, ms) {
      validateLabels(labels, ALL_KEYS);
      verificationRunDuration.record(Math.max(0, ms), labels);
    },
    /**
     * @param {Record<string, string>} labels @param {1 | 0} passed (1 = passed, 0 = failed)
     */
    observabilityAssertionIncrement(labels, passed) {
      validateLabels(labels, ALL_KEYS);
      assertionCounter.add(1, {
        ...labels,
        [METRIC_LABEL_KEYS.result]: passed === 1 ? "passed" : "failed",
      });
    },

    // Raw instruments exposed for the test-exporter flush path (verification reads these).
    instruments: {
      requestCounter,
      requestDuration,
      clientCallCounter,
      clientCallDuration,
      operationCounter,
      operationDuration,
      errorCounter,
      verificationRunCounter,
      verificationRunDuration,
      assertionCounter,
    },
  };
}
export { METRIC_NAMES, METRIC_LABEL_KEYS, METRIC_LABEL_VALUES };
