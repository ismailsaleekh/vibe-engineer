// @ts-check
//
// Harness-owned structured logging abstraction for @vibe-engineer/observability
// (I-19 / DL-23 Logging default).
//
// DL-23 Logging §1: "Core code must depend on a packages/observability logging
// abstraction, not direct ad-hoc console.log calls or framework-specific logger
// calls as the load-bearing default." §2: "The default Node/Nest/CLI adapter is
// Pino emitting newline-delimited structured JSON records." §3–§4: browser/RN
// adapters write the SAME typed record to a local capture sink + a
// non-authoritative dev console projection.
//
// Every adapter funnels its record through `parseLogRecord` (the typed zod gate)
// BEFORE emitting — so a missing required field, malformed id, or unknown key
// fails closed at the seam (DL-23 failure policy §1; W3/W4 negatives). Adapters
// NEVER call ad-hoc `console.log` as the carrier — the structured record is the
// contract; console is a non-authoritative projection only (DL-23 §4).

import {
  parseLogRecord,
  SCHEMA_VERSIONS,
} from "./contracts.js";
import { redactRecord } from "./redaction.js";

/**
 * @typedef {Object} LogSink
 * @property {(record: Record<string, unknown>) => void} write
 *   Write a parsed, redacted structured record to the carrier (pino stream /
 *   in-memory capture list / RN bridge sink). MUST NOT throw on a valid record.
 */

/**
 * @typedef {Object} LoggerOptions
 * @property {LogSink} sink The authoritative structured-record carrier.
 * @property {string} serviceName Stable component identity (DL-23 `service.name`).
 * @property {import("./contracts.js").Surface} surface Bounded surface enum.
 * @property {() => string} [now] Injectable UTC RFC 3339 clock (default real time).
 * @property {boolean} [redact=true] Apply DL-22 redaction before writing.
 * @property {(projection: Record<string, unknown>) => void} [devConsole]
 *   Optional NON-authoritative dev console projection (DL-23 §4). Never the
 *   carrier of load-bearing data.
 * @property {string[]} [sensitiveHints]
 *   Optional sentinel list for the redaction gate's negative witnesses.
 */

/**
 * Build a harness-owned logger bound to a typed sink. Returns level helpers that
 * each accept the operation/event/correlation context + an optional payload and
 * emit a SCHEMA-VALIDATED structured record. A record missing a required field
 * throws synchronously (fail-closed) — it is NEVER silently dropped or emitted
 * partial.
 *
 * @param {LoggerOptions} options
 * @returns {{
 *   log: (level: import("./contracts.js").Severity, fields: LogFields) => Record<string, unknown>,
 *   debug: (fields: LogFields) => Record<string, unknown>,
 *   info: (fields: LogFields) => Record<string, unknown>,
 *   warn: (fields: LogFields) => Record<string, unknown>,
 *   error: (fields: LogFields) => Record<string, unknown>,
 *   fatal: (fields: LogFields) => Record<string, unknown>,
 * }}
 */
export function createLogger(options) {
  if (!options || typeof options.sink?.write !== "function") {
    throw new Error("createLogger: a typed LogSink { write } is required (DL-23 logging abstraction)");
  }
  const serviceName = options.serviceName;
  const surface = options.surface;
  if (typeof serviceName !== "string" || serviceName.length === 0) {
    throw new Error("createLogger: serviceName is required (DL-23 service.name)");
  }
  const now = options.now ?? (() => new Date().toISOString());
  const doRedact = options.redact !== false;

  function emit(level, fields) {
    /** @type {Record<string, unknown>} */
    const record = {
      schemaVersion: SCHEMA_VERSIONS.log,
      timestamp: now(),
      severity: level,
      "service.name": serviceName,
      surface,
      "operation.name": fields.operationName,
      "event.name": fields.eventName,
      correlationId: fields.correlationId,
      outcome: fields.outcome ?? "started",
      "redaction.status": "not-required",
    };
    if (fields.traceId !== undefined) record.traceId = fields.traceId;
    if (fields.spanId !== undefined) record.spanId = fields.spanId;
    if (fields.requestId !== undefined) record.requestId = fields.requestId;
    if (fields.runId !== undefined) record.runId = fields.runId;
    if (fields.operationId !== undefined) record.operationId = fields.operationId;
    if (fields.durationMs !== undefined) record.durationMs = fields.durationMs;
    if (fields.error !== undefined) record.error = fields.error;
    // Layer-specific assertions happen at the instrumentation boundary
    // (assertSpanShapedLog / assertRequestShapedLog). Here we schema-validate +
    // redact the final carrier.

    const redacted = doRedact
      ? redactRecord(record, { sensitiveHints: options.sensitiveHints })
      : record;

    // Final fail-closed schema gate (W3 missing-required-field negative fires here).
    const parsed = parseLogRecord(redacted);
    options.sink.write(parsed);
    if (typeof options.devConsole === "function") {
      options.devConsole(parsed); // NON-authoritative projection (DL-23 §4)
    }
    return parsed;
  }

  /** @type {(f: LogFields) => Record<string, unknown>} */
  const info = (f) => emit("info", f);
  return {
    log: emit,
    debug: (f) => emit("debug", f),
    info,
    warn: (f) => emit("warn", f),
    error: (f) => emit("error", f),
    fatal: (f) => emit("fatal", f),
  };
}

/**
 * @typedef {Object} LogFields
 * @property {string} operationName
 * @property {string} eventName
 * @property {string} correlationId
 * @property {import("./contracts.js").Outcome} [outcome]
 * @property {string} [traceId]
 * @property {string} [spanId]
 * @property {string} [requestId]
 * @property {string} [runId]
 * @property {string} [operationId]
 * @property {number} [durationMs]
 * @property {{ type: string; message: string; stackRef: string | null; classification?: string }} [error]
 */

// --- Adapters ---------------------------------------------------------------

/**
 * Pino-backed Node/Nest/CLI adapter (DL-23 Logging §2). Emits newline-delimited
 * structured JSON to the provided writable stream via real `pino` (NO mock). The
 * authoritative carrier is the pino JSON line; the in-memory capture list is the
 * verification sink that proves the real line was emitted.
 *
 * @param {import("pino").Logger | { write: (line: string) => void }} pinoInstanceOrStream
 * @param {{ capture?: Record<string, unknown>[] }} [extra]
 * @returns {LogSink}
 */
export function createPinoSink(pinoInstanceOrStream, extra) {
  const capture = extra?.capture;
  /** @type {LogSink} */
  return {
    write(record) {
      const line = JSON.stringify(record);
      // Real pino write path. A pino Logger instance: emit at the pino level that
      // maps to the record's severity so the line traverses pino's real
      // serialization path at the correct numeric level. A raw stream sinks the
      // JSON line directly.
      const inst = /** @type {any} */ (pinoInstanceOrStream);
      const severity = String(record.severity ?? "info");
      /** @param {string} lvl @param {(...a: any[]) => void} fallback */
      const pinoLevel =
        severity === "debug" ? inst.debug
        : severity === "info" ? inst.info
        : severity === "warn" ? inst.warn
        : severity === "error" ? inst.error
        : severity === "fatal" ? inst.fatal
        : inst.info;
      if (typeof inst.write === "function" && typeof pinoLevel !== "function") {
        inst.write(`${line}\n`);
      } else if (typeof pinoLevel === "function") {
        pinoLevel.call(inst, record);
      } else if (typeof inst.write === "function") {
        inst.write(`${line}\n`);
      }
      if (capture) capture.push(record);
    },
  };
}

/**
 * Browser / React-Native capture adapter (DL-23 Logging §3). The load-bearing
 * contract is the structured record emitted to the local capture sink; the dev
 * console is a NON-authoritative projection (DL-23 §4). `console` is never the
 * carrier of load-bearing data.
 *
 * @param {{ capture: Record<string, unknown>[] }} opts
 * @returns {{ sink: LogSink, devConsole: (projection: Record<string, unknown>) => void }}
 */
export function createBrowserRnCaptureAdapter(opts) {
  if (!opts?.capture || !Array.isArray(opts.capture)) {
    throw new Error("createBrowserRnCaptureAdapter: a capture list is required (DL-23 §3 local capture sink)");
  }
  return {
    sink: {
      write(record) {
        opts.capture.push(record);
      },
    },
    devConsole(projection) {
      // NON-authoritative projection only. Guarded so a headless/RN env w/o
      // console.table never crashes the authoritative path.
      const c = /** @type {any} */ (globalThis).console;
      if (c && typeof c.log === "function") {
        c.log(`[observability] ${projection.severity ?? "info"} ${projection["operation.name"] ?? ""}`);
      }
    },
  };
}

/**
 * In-memory capture sink (the verification carrier for unit tests + the local
 * capture sink in the starter demonstration). Pure list — deterministic,
 * inspectable by the verification consumer (W1/W2/W3).
 * @param {Record<string, unknown>[]} [into]
 * @returns {{ sink: LogSink, capture: Record<string, unknown>[] }}
 */
export function createMemorySink(into) {
  const capture = into ?? [];
  return {
    capture,
    sink: {
      write(record) {
        capture.push(record);
      },
    },
  };
}
