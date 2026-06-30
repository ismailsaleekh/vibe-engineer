// @ts-check
//
// Domain-neutral OpenTelemetry span API for @vibe-engineer/observability
// (I-19 / DL-23 Tracing default).
//
// DL-23 Tracing §2: "The harness observability package must expose a small
// domain-neutral span API over OpenTelemetry concepts and must not require
// callers to know exporter details." §3: "Required spans include inbound API
// request spans where an API exists, client call spans for web/mobile/API client
// boundaries, verification-run spans where verification exercises observability,
// and operation spans for generated golden critical paths." §5: in-process/test
// OTel exporters are sufficient for verification (no remote backend required).
//
// This is a thin typed facade over the REAL `@opentelemetry/api` +
// `@opentelemetry/sdk-trace-base` (NO mock). The InMemorySpanExporter is the
// real test exporter the verification consumer reads to prove a real span was
// emitted (W1). Callers never touch exporter details.

import * as api from "@opentelemetry/api";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { spanAttributesSchema } from "./contracts.js";
import { isValidUuidV4 } from "./ids.js";

export { InMemorySpanExporter };

/**
 * Build a real OTel tracer provider backed by `BasicTracerProvider` + the given
 * exporter (default: real InMemorySpanExporter). The resource carries
 * `service.name` + bounded harness identity (DL-23 span attrs §1).
 *
 * @param {{ serviceName: string, exporter?: any, surface: string }} opts
 * @returns {{ provider: BasicTracerProvider, tracer: api.Tracer, exporter: any }}
 */
export function createTracerProvider(opts) {
  const exporter = opts.exporter ?? new InMemorySpanExporter();
  const provider = new BasicTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: opts.serviceName,
      surface: opts.surface,
    }),
  });
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  // Register globally so any api.trace usage shares this provider.
  try {
    provider.register();
  } catch {
    // a provider may already be registered in the process; that's fine — our
    // explicit tracer below is the authoritative one for the harness span API.
  }
  const tracer = provider.getTracer("@vibe-engineer/observability", "0.1.0-i19");
  return { provider, tracer, exporter };
}

/**
 * Typed span-starter bound to the required span-attribute contract. The caller
 * passes the bounded correlation context; required attributes (service.name,
 * surface, operation.name, correlationId, outcome) are validated against the
 * typed schema and attached to the real OTel span. The returned handle records
 * outcome + error classification on end() and links the span ids back to the
 * caller so logs/metrics/evidence can join on the SAME trace/span ids (W1
 * correlation join matrix).
 *
 * @param {api.Tracer} tracer
 * @param {{ serviceName?: string, surface?: string }} [defaults]
 * @returns {{ startSpan: (name: string, attrs: SpanStartAttrs) => SpanHandle }}
 */
export function createSpanApi(tracer, defaults) {
  if (!tracer) throw new Error("createSpanApi: an api.Tracer is required");
  return {
    startSpan(name, attrs) {
      // Validate the bounded span-attribute contract BEFORE creating the span
      // (W3 negative: missing required span attribute fails closed here).
      // Required provider-context defaults (service.name/surface) + outcome
      // (`started` at span start) are injected so a caller that correctly
      // passes the bounded operation/correlation context still satisfies the
      // required-attribute contract.
      const merged = {
        ...attrs,
        "service.name": attrs["service.name"] ?? defaults?.serviceName,
        surface: attrs.surface ?? defaults?.surface,
        outcome: attrs.outcome ?? "started",
        "sample.demo": attrs["sample.demo"] ?? true,
      };
      const validated = spanAttributesSchema.parse(merged);
      const correlationId = validated.correlationId;
      if (!isValidUuidV4(correlationId)) {
        throw new Error(
          "startSpan: correlationId must be a canonical UUID v4 (DL-23 correlation §1)",
        );
      }
      const span = tracer.startSpan(name, {
        attributes: toOtelAttributes(validated),
      });
      // Insert the active span into the OTel context so downstream logs/metrics
      // can read traceId/spanId from `api.trace.getSpan(api.context.active())`.
      const ctx = api.trace.setSpan(api.context.active(), span);
      /** @type {any} */
      const anySpan = span;
      const spanCtx =
        typeof anySpan.spanContext === "function"
          ? anySpan.spanContext()
          : { traceId: undefined, spanId: undefined };
      return {
        span,
        context: ctx,
        traceId: spanCtx.traceId,
        spanId: spanCtx.spanId,
        correlationId,
        end(result) {
          const outcome = result?.outcome ?? "succeeded";
          span.setAttribute("outcome", outcome);
          if (result?.errorType) span.setAttribute("error.type", result.errorType);
          if (result?.errorClassification)
            span.setAttribute("error.classification", result.errorClassification);
          if (outcome === "failed") {
            try {
              span.setStatus({
                code: api.SpanStatusCode.ERROR,
                message: result?.errorClassification ?? "failed",
              });
            } catch {
              /* setStatus optional on some span impls */
            }
          }
          span.end();
        },
      };
    },
  };
}

/**
 * @typedef {Object} SpanStartAttrs
 * @property {string} [service.name]
 * @property {string} surface
 * @property {string} operation.name
 * @property {string} correlationId
 * @property {string} [requestId]
 * @property {string} [route]
 * @property {import("./contracts.js").Outcome} [outcome]
 * @property {string} [error.type]
 * @property {string} [error.classification]
 * @property {string} [runId]
 * @property {boolean} [sample.demo]
 */

/**
 * @typedef {Object} SpanHandle
 * @property {any} span The real OTel span.
 * @property {import("@opentelemetry/api").Context} context Active context carrying the span.
 * @property {string | undefined} traceId
 * @property {string | undefined} spanId
 * @property {string} correlationId
 * @property {(result?: { outcome?: import("./contracts.js").Outcome, errorType?: string, errorClassification?: string }) => void} end
 */

/** Map the typed bounded span-attribute object to OTel attribute key/value pairs. */
function toOtelAttributes(validated) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, v] of Object.entries(validated)) {
    if (v === undefined) continue;
    out[k] = typeof v === "boolean" ? String(v) : String(v);
  }
  return out;
}
