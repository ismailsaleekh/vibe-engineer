// @ts-check
//
// Canonical RFC 4122 UUID **v4** ID factory for @vibe-engineer/observability
// (I-19 / DL-23 correlation §3).
//
// DL-23 §3: "Generated correlationId and requestId values are canonical RFC 4122
// UUID v4 strings produced only by the packages/observability typed ID factory
// using a cryptographic random source available to the runtime."
// §6: "Call sites must not hand-roll IDs, parse IDs with heuristic text matching,
// or use raw user-supplied IDs as trusted values."
//
// Node 20+ ships `crypto.randomUUID()` (CSPRNG-backed). React Native (and any
// runtime lacking `node:crypto`) provides the WebCrypto `globalThis.crypto`
// interface with `getRandomValues` + `randomUUID` (Hermes/JSC ship WebCrypto).
// If NEITHER is present, the factory THROWS (fail-closed) rather than falling
// back to Math.random — a non-crypto fallback is a silent fallback forbidden by
// DL-23 §3 + the quality bar ("no heuristic/regex standing in for typed
// contracts"; "no silent fallbacks").

import { UUID_V4_PATTERN } from "./contracts.js";

/** @returns {Crypto} the runtime crypto interface, or throws fail-closed. */
function resolveCrypto() {
  // Node: node:crypto exports a Crypto with randomUUID. Web/RN: globalThis.crypto.
  /** @type {any} */
  let cryptoApi;
  try {
    // Node path (CJS interop under type:module).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("node:crypto");
    if (nodeCrypto && typeof nodeCrypto.randomUUID === "function") {
      cryptoApi = nodeCrypto;
    }
  } catch {
    // not node:crypto — fall through to WebCrypto.
  }
  if (!cryptoApi) {
    /** @type {any} */
    const g = globalThis;
    if (g.crypto && typeof g.crypto.randomUUID === "function") {
      cryptoApi = g.crypto;
    } else if (g.crypto && typeof g.crypto.getRandomValues === "function") {
      cryptoApi = g.crypto;
    }
  }
  if (!cryptoApi) {
    const e = new Error(
      "observability id-factory: no cryptographic random source available on this runtime (DL-23 §3 requires crypto-backed UUID v4). STOP-pending-live/BLOCKED rather than fall back to Math.random."
    );
    e.name = "NoCryptoSourceError";
    e.code = "OBS_NO_CRYPTO_SOURCE";
    throw e;
  }
  return /** @type {Crypto} */ (cryptoApi);
}

/**
 * Build a canonical RFC 4122 UUID **v4** string from a cryptographic random
 * source. Sets the version (4) and variant (8/9/a/b) bits per RFC 4122 §4.4.
 * Uses the runtime's CSPRNG-backed `randomUUID()` when present; otherwise
 * constructs the UUID from `crypto.getRandomValues(new Uint8Array(16))` with the
 * RFC-mandated bit fixups. Never Math.random.
 * @returns {string}
 */
export function createUuidV4() {
  const crypto = resolveCrypto();
  // Prefer the runtime's spec-compliant randomUUID (Node + WebCrypto both ship it).
  if (typeof crypto.randomUUID === "function") {
    const id = crypto.randomUUID();
    // Fail-closed belt-and-suspenders: assert canonical v4 form before trusting.
    if (!UUID_V4_PATTERN.test(id)) {
      const e = new Error(`id-factory: runtime randomUUID() returned non-canonical value (len ${id.length})`);
      e.name = "IdFactoryError";
      e.code = "OBS_ID_NON_CANONICAL";
      throw e;
    }
    return id;
  }
  // Fallback path: WebCrypto getRandomValues (no randomUUID), with RFC bit fixups.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10 (RFC 4122)
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  if (!UUID_V4_PATTERN.test(id)) {
    const e = new Error("id-factory: getRandomValues-derived UUID failed canonical v4 parse");
    e.name = "IdFactoryError";
    e.code = "OBS_ID_NON_CANONICAL";
    throw e;
  }
  return id;
}

/**
 * Strictly validate a value as a canonical RFC 4122 UUID **v4** string (the typed
 * parser — NOT heuristic text matching; DL-23 §6). Returns true only for
 * canonical lowercase v4 layout with correct version/variant bits.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidUuidV4(value) {
  return typeof value === "string" && UUID_V4_PATTERN.test(value);
}

/**
 * Parse + canonically validate a UUID v4. Throws a typed `InvalidUuidV4Error` on
 * any non-canonical value. This is the trust gate for inbound headers (§4): an
 * inbound x-request-id/correlation id is ONLY preserved when this returns the
 * canonical string.
 * @param {unknown} value
 * @returns {string}
 */
export function parseUuidV4(value) {
  if (!isValidUuidV4(value)) {
    const e = new Error("parseUuidV4: value is not a canonical RFC 4122 UUID v4 string");
    e.name = "InvalidUuidV4Error";
    e.code = "OBS_INVALID_UUID_V4";
    throw e;
  }
  return /** @type {string} */ (value);
}

// --- Typed correlation / request / run / operation ID factories --------------

/** Canonical correlation id (DL-23 §1: required on every request/run/invocation). */
export function createCorrelationId() {
  return createUuidV4();
}

/** Canonical request id (DL-23 §2: required for request-shaped API/client boundaries). */
export function createRequestId() {
  return createUuidV4();
}

/** Canonical verification run id (DL-23 §1 + §7: verification runners create/capture a runId). */
export function createRunId() {
  return createUuidV4();
}

/** Canonical operation id for a golden critical-path invocation (DL-23 §1). */
export function createOperationId() {
  return createUuidV4();
}
