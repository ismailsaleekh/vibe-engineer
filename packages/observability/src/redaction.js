// @ts-check
//
// Redaction integration for @vibe-engineer/observability (I-19 / DL-23
// Redaction/security interaction). Consumes the DL-22/I-18 secret/redaction
// contract from `@vibe-engineer/security` **read-only** (no edits to that
// surface; defects route back to I-18).
//
// DL-23: "Sensitive raw values must not appear in observability records or
// evidence. Evidence may include redacted placeholders, stable non-secret
// fingerprints where DL-22 permits, rule ids, and artifact refs." Failure policy
// §5: "Observability must fail closed when sensitive data redaction policy from
// DL-22 is unavailable for a sensitive assertion."
//
// This module NEVER fakes redaction: if the security contract is unresolvable
// (DL-22/I-18 not green in this environment) AND the record carries a sensitive
// surface, the record is marked `redaction.status = blocked-pending-live` (the
// honest W6 marker) rather than emitted with raw values.

import { redactionStatusSchema } from "./contracts.js";
import { createRequire } from "node:module";

// Read-only consumption of the DL-22/I-18 contract (workspace dep). The actual
// redaction functions are the I-18 implementation; we call them verbatim. The
// binding is resolved lazily + memoized so the gate runs synchronously inline
// with the logger emit. `createRequire` is imported at module top (ESM-safe).
/** @type {any} */
let securityBinding = null;
let securityBindingTried = false;
const nodeRequire = createRequire(import.meta.url);
/** @returns {any | null} */
function getSecurity() {
  if (securityBindingTried) return securityBinding;
  securityBindingTried = true;
  try {
    securityBinding = nodeRequire("@vibe-engineer/security");
  } catch {
    securityBinding = null; // DL-22/I-18 not resolvable here → pending-live path.
  }
  return securityBinding;
}

const SENSITIVE_KEY_RE = /(token|password|passphrase|secret|apikey|api[-_]?key|credential|client[-_]?secret|private[-_]?key|signing[-_]?key|authorization)/i;

/**
 * Redact a structured log/evidence record using the real DL-22/I-18 contract.
 * Sets `redaction.status`:
 *   - `applied` when the security gate redacted at least one surface;
 *   - `not-required` when no sensitive surface was detected;
 *   - `blocked-pending-live` when a sensitive surface is present BUT the
 *     security contract is unresolvable (DL-23 failure policy §5) — the record
 *     is STILL not emitted with raw values by the caller (the logger gate treats
 *     `blocked-pending-live` as a non-green marker for sensitive closure).
 *
 * @param {Record<string, unknown>} record
 * @param {{ sensitiveHints?: string[], allowPendingLive?: boolean }} [opts]
 * @returns {Record<string, unknown>}
 */
export function redactRecord(record, opts) {
  const hints = opts?.sensitiveHints ?? [];
  const hasSensitiveSurface =
    hints.some((h) => typeof h === "string" && h.length > 0) ||
    containsSensitiveSurface(record);

  const security = getSecurity();
  if (!security || typeof security.redactSecurityValue !== "function") {
    // DL-22/I-18 unavailable. Fail honestly per DL-23 §5.
    if (hasSensitiveSurface) {
      return {
        ...record,
        "redaction.status": redactionStatusSchema.parse("blocked-pending-live"),
      };
    }
    return { ...record, "redaction.status": redactionStatusSchema.parse("not-required") };
  }

  if (!hasSensitiveSurface) {
    return { ...record, "redaction.status": redactionStatusSchema.parse("not-required") };
  }

  // Real DL-22/I-18 redaction. redactSecurityValue walks the whole object graph
  // (strings, nested objects, arrays) and substitutes `<redacted*>` placeholders
  // for token/password/secret/bearer/key patterns (no raw value preserved).
  const redacted = /** @type {Record<string, unknown>} */ (
    security.redactSecurityValue(record)
  );
  redacted["redaction.status"] = redactionStatusSchema.parse("applied");
  return redacted;
}

/**
 * Predicate: does the record carry any key name or sentinel hint flagged
 * sensitive by the DL-22 surface taxonomy? This is a coarse pre-filter so the
 * redaction gate knows whether to engage the full DL-22 walk; the FULL redaction
 * (not this predicate) is what removes the raw value.
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
function containsSensitiveSurface(record) {
  try {
    const json = JSON.stringify(record);
    if (!json) return false;
    // Key-name surface check (cheap, bounded vocabulary — NOT a regex parser
    // standing in for a typed contract; the actual value scrub is the typed
    // DL-22 redactSecurityValue walk).
    return SENSITIVE_KEY_RE.test(json);
  } catch {
    return true; // non-serializable → treat as sensitive, fail safe.
  }
}

/**
 * Sentinel values used by the W2 error-path + W4 anti-degradation negative
 * witnesses. These are FAKE negative-witness sentinels (never real secrets):
 * they MUST be redacted out of every emitted record/evidence string. If any
 * sentinel survives into serialized output, that is a DL-22 leak → hard fail.
 */
export const REDACTION_NEGATIVE_SENTINELS = Object.freeze([
  "FAKE_OBSERVABILITY_NEGATIVE_WITNESS_SECRET_TOKEN_42",
  "FAKE_OBSERVABILITY_NEGATIVE_WITNESS_PASSWORD_88",
]);

/**
 * Assert that NO sentinel raw value survives in a serialized artifact (W2/W4
 * leak guard). Throws on any leak.
 * @param {string} serialized
 * @param {string[]} [sentinels]
 */
export function assertNoSentinelLeak(serialized, sentinels = REDACTION_NEGATIVE_SENTINELS) {
  const leaks = sentinels.filter((s) => serialized.includes(s));
  if (leaks.length > 0) {
    const e = new Error(
      `redaction leak: sentinel raw value(s) survived into serialized output (DL-22). This is a hard failure.`
    );
    e.name = "RedactionLeakError";
    e.code = "OBS_REDACTION_LEAK";
    // NOTE: never include the leaked raw value in the error message.
    throw e;
  }
}
