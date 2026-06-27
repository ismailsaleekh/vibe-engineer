// @ts-check
//
// Typed observability contracts for @vibe-engineer/observability (I-19 / DL-23).
//
// Domain-neutral harness-core typed contracts for the v1 observability defaults.
// Every load-bearing producer→consumer seam (DL-23 "Observability contract") is a
// typed zod schema (mirrors the I-16A `@ts-rest`+`zod` precedent; no invented
// schema DSL). Required-field absence is a schema-validation failure BY
// CONSTRUCTION (DL-23 "Required structured log fields" + failure policy §1:
// "Missing required observability evidence is a hard verification failure").
//
// Vocabulary is intentionally generic/sample/demo/reference-only (DL-20A).
// No business-domain telemetry names live here (DL-23 domain-neutrality check).

import { z } from "zod";

// --- Bounded enums (DL-23 "severity / surface / outcome") ---------------------

export const SEVERITIES = Object.freeze(["debug", "info", "warn", "error", "fatal"]);
export const SURFACES = Object.freeze([
  "harness",
  "api",
  "web",
  "mobile",
  "verification",
  "starter-reference",
]);
export const OUTCOMES = Object.freeze(["started", "succeeded", "failed", "blocked"]);

/**
 * `redaction.status` evidence marker (DL-23 Redaction/security interaction +
 * "redaction.status or equivalent evidence marker when sensitive fields are
 * handled"). Bounded enum — never a free-form string.
 *
 * - `applied`: redaction policy (DL-22/I-18) was applied to this record.
 * - `not-required`: record carries no sensitive surface; no redaction needed.
 * - `blocked-pending-live`: DL-22/I-18 semantics unavailable for a sensitive
 *   assertion → that closure is pending-live/BLOCKED (DL-23 failure policy §5),
 *   NEVER faked. Carrying this marker honestly is the W6 contract.
 */
export const REDACTION_STATUSES = Object.freeze([
  "applied",
  "not-required",
  "blocked-pending-live",
]);

// --- Canonical correlation / request / run ID contract (DL-23 §3) ------------

/**
 * Strict RFC 4122 UUID **v4** regular expression.
 *
 * Canonical textual UUID v4 layout (lowercase hex):
 *   8-4-4-4-12, version nibble = 4, variant nibble ∈ {8,9,a,b}.
 *
 * DL-23 §3: "Generated correlationId and requestId values are canonical RFC 4122
 * UUID v4 strings produced only by the packages/observability typed ID factory
 * using a cryptographic random source." §6: "Call sites must not hand-roll IDs,
 * parse IDs with heuristic text matching, or use raw user-supplied IDs as trusted
 * values." This regex IS the typed parser (not heuristic text-matching): it
 * encodes the version + variant bits the RFC requires, so an arbitrary 36-char
 * string (or a v1/v3/v5 UUID) is REJECTED.
 */
export const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * W3C Trace Context traceparent `trace-id` (32 lowercase hex) and `span-id`
 * (16 lowercase hex) — https://www.w3.org/TR/trace-context/#trace-id
 *
 * These are NOT UUIDs; OpenTelemetry trace/span ids are hex strings of fixed
 * length. The correlation layer carries them verbatim from the active span.
 */
export const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/;
export const SPAN_ID_PATTERN = /^[0-9a-f]{16}$/;

export const severitySchema = z.enum(SEVERITIES);
export const surfaceSchema = z.enum(SURFACES);
export const outcomeSchema = z.enum(OUTCOMES);
export const redactionStatusSchema = z.enum(REDACTION_STATUSES);
export const uuidV4Schema = z.string().regex(UUID_V4_PATTERN, "canonical RFC 4122 UUID v4 required");
export const traceIdSchema = z.string().regex(TRACE_ID_PATTERN, "W3C trace-id (32 lowercase hex) required");
export const spanIdSchema = z.string().regex(SPAN_ID_PATTERN, "W3C span-id (16 lowercase hex) required");

/**
 * Redacted error classification block (DL-23 "error.type, error.message, and
 * error.stackRef or redacted equivalent for error records, subject to DL-22").
 *
 * `stackRef` is a NON-secret stable reference (e.g. an artifact ref / rule id),
 * NEVER a raw stack that might carry secrets. The redaction gate
 * (`redactRecord`) re-scrubs `message`/`type` so raw sensitive values never
 * appear even when an instrumentation site supplies them.
 */
export const errorBlockSchema = z
  .object({
    type: z.string().min(1),
    message: z.string(),
    stackRef: z.string().min(1).nullable(),
    classification: z.string().min(1).optional(),
  })
  .strict();

/**
 * Structured log record — the load-bearing carrier of the observability seam
 * (DL-23 "Structured logs and required fields"). `.strict()` rejects unknown
 * keys (no silent free-form extension). Every ALWAYS-required field below maps
 * 1:1 to a DL-23 required field; absence is a hard schema failure (W3 negative).
 *
 * Conditional fields (`traceId`/`spanId`/`requestId`/`runId`/`durationMs`/`error`)
 * are optional at the schema layer but ENFORCED by the layer-specific asserters
 * (`assertSpanShapedLog`, `assertRequestShapedLog`) where the boundary requires
 * them — so a span-context log without traceId/spanId still fails closed (W3).
 */
export const logRecordSchema = z
  .object({
    schemaVersion: z.literal("observability.log.v1"),
    timestamp: z.string().min(1), // UTC RFC 3339 (producer fills; format-checked at emit)
    severity: severitySchema,
    "service.name": z.string().min(1),
    surface: surfaceSchema,
    "operation.name": z.string().min(1),
    "event.name": z.string().min(1),
    correlationId: uuidV4Schema,
    traceId: traceIdSchema.optional(),
    spanId: spanIdSchema.optional(),
    requestId: uuidV4Schema.optional(),
    runId: uuidV4Schema.optional(),
    operationId: uuidV4Schema.optional(),
    outcome: outcomeSchema,
    durationMs: z.number().nonnegative().finite().optional(),
    error: errorBlockSchema.optional(),
    "redaction.status": redactionStatusSchema,
  })
  .strict();

/**
 * Validate + parse a log record against the typed schema. Throws on any missing
 * required field, wrong type, unknown key, or malformed correlation/trace id.
 * This is the fail-closed gate every adapter calls before emitting.
 */
export function parseLogRecord(record) {
  return logRecordSchema.parse(record);
}

/**
 * Span-shaped assertion (W3 negative: "missing traceId/spanId where span-shaped
 * fails"). A log emitted inside an active span MUST carry both traceId and
 * spanId. Throws a typed `SpanShapeError` if either is missing/malformed.
 */
export function assertSpanShapedLog(record) {
  if (record.traceId === undefined || record.spanId === undefined) {
    const e = new Error(
      "span-shaped log record missing traceId/spanId (DL-23 correlation §7 / failure policy §1)"
    );
    e.name = "SpanShapeError";
    e.code = "OBS_SPAN_SHAPE";
    throw e;
  }
  traceIdSchema.parse(record.traceId);
  spanIdSchema.parse(record.spanId);
  return record;
}

/**
 * Request-shaped assertion (W3 negative: "missing requestId where request-shaped
 * fails"). DL-23 correlation §2: "API surfaces also carry a requestId; when the
 * boundary is not request-shaped, requestId may be absent only if the record
 * includes an applicable runId or operationId plus correlationId."
 */
export function assertRequestShapedLog(record) {
  if (record.requestId === undefined && record.runId === undefined && record.operationId === undefined) {
    const e = new Error(
      "request-shaped log record missing requestId (DL-23 correlation §2): requestId is required for request-shaped API/client boundaries unless runId/operationId is present"
    );
    e.name = "RequestShapeError";
    e.code = "OBS_REQUEST_SHAPE";
    throw e;
  }
  return record;
}

// --- Span-attribute contract (DL-23 "Tracing/span defaults") -----------------

export const spanAttributeKeySchema = z.enum([
  "service.name",
  "surface",
  "operation.name",
  "correlationId",
  "requestId",
  "route",
  "outcome",
  "error.type",
  "error.classification",
  "runId",
  "sample.demo",
]);

export const spanAttributesSchema = z
  .object({
    "service.name": z.string().min(1),
    surface: surfaceSchema,
    "operation.name": z.string().min(1),
    correlationId: uuidV4Schema,
    requestId: uuidV4Schema.optional(),
    route: z.string().min(1).optional(),
    outcome: outcomeSchema,
    "error.type": z.string().min(1).optional(),
    "error.classification": z.string().min(1).optional(),
    runId: uuidV4Schema.optional(),
    "sample.demo": z.boolean().optional(),
  })
  .strict();

// --- Metric categories contract (DL-23 "Metrics categories and naming") ------

/**
 * The 6 locked metric categories and their bounded label-key sets (DL-23 metrics
 * §3 + "Naming constraints"). Typed helpers (`createMetrics`) only ever emit
 * these names with these bounded label keys — call sites cannot pass arbitrary
 * strings (W4 anti-degradation + W5 regression: domain-neutral + bounded).
 *
 * Labels are bounded enums / low-cardinality ids (surface, operation, outcome,
 * statusClass, runner, component). Raw user content / secrets / high-cardinality
 * ids are FORBIDDEN in core metric labels (DL-23 naming §3).
 */
export const METRIC_NAMES = Object.freeze({
  requestCount: "request.count",
  requestDuration: "request.duration",
  clientCallCount: "client.call.count",
  clientCallDuration: "client.call.duration",
  operationCount: "operation.count",
  operationDuration: "operation.duration",
  errorCount: "error.count",
  verificationRunCount: "verification.run.count",
  verificationRunDuration: "verification.run.duration",
  observabilityAssertionCount: "observability.assertion.count",
});

export const METRIC_LABEL_KEYS = Object.freeze({
  surface: "surface",
  operation: "operation",
  outcome: "outcome",
  statusClass: "statusClass",
  component: "component",
  runner: "runner",
  result: "result",
});

export const METRIC_LABEL_VALUES = Object.freeze({
  surface: SURFACES,
  outcome: OUTCOMES,
  statusClass: ["2xx", "4xx", "5xx", "error", "ok"],
  result: ["passed", "failed"],
});

export const SCHEMA_VERSIONS = Object.freeze({
  log: "observability.log.v1",
  evidence: "observability.evidence.v1",
});
