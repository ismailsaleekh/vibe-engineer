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
// This module NEVER fakes redaction: sensitive records traverse the real
// `@vibe-engineer/security` ESM export before emission, and redaction-negative
// sentinels must not survive into the structured carrier.

import { redactSecurityValue } from "@vibe-engineer/security";
import { redactionStatusSchema } from "./contracts.js";

// Read-only consumption of the DL-22/I-18 contract (workspace dep). The actual
// redaction function is the I-18 implementation; we call it verbatim through the
// package's ESM export. This keeps the logger emit path synchronous while using
// the real public package boundary. A previous createRequire() bridge could not
// resolve the ESM-only security package and incorrectly fell back to the
// pending-live marker while preserving the raw sentinel; the static import is
// the correct Node ESM seam for this workspace.

const SENSITIVE_KEY_RE =
  /(token|password|passphrase|secret|apikey|api[-_]?key|credential|client[-_]?secret|private[-_]?key|signing[-_]?key|authorization)/i;

/**
 * Redact a structured log/evidence record using the real DL-22/I-18 contract.
 * Sets `redaction.status`:
 *   - `applied` when the security gate redacted at least one surface;
 *   - `not-required` when no sensitive surface was detected;
 *   - `blocked-pending-live` is reserved for future adapter/provider closures;
 *     this package's synchronous logger path depends on the real security package
 *     and must redact sensitive values before the carrier is emitted.
 *
 * @param {Record<string, unknown>} record
 * @param {{ sensitiveHints?: string[], allowPendingLive?: boolean }} [opts]
 * @returns {Record<string, unknown>}
 */
export function redactRecord(record, opts) {
  const hints = opts?.sensitiveHints ?? [];
  const hasSensitiveSurface =
    hints.some((h) => typeof h === "string" && h.length > 0) || containsSensitiveSurface(record);

  if (!hasSensitiveSurface) {
    return { ...record, "redaction.status": redactionStatusSchema.parse("not-required") };
  }

  // Real DL-22/I-18 redaction. redactSecurityValue walks the whole object graph
  // (strings, nested objects, arrays) and substitutes `<redacted*>` placeholders
  // for token/password/secret/bearer/key patterns (no raw value preserved).
  const redacted = /** @type {Record<string, unknown>} */ (redactSecurityValue(record));
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
      `redaction leak: sentinel raw value(s) survived into serialized output (DL-22). This is a hard failure.`,
    );
    e.name = "RedactionLeakError";
    e.code = "OBS_REDACTION_LEAK";
    // NOTE: never include the leaked raw value in the error message.
    throw e;
  }
}
