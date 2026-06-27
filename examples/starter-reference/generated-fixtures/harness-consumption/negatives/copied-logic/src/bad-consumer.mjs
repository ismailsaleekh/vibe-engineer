// NEGATIVE fixture for W-NEG-COPIED-HARNESS-LOGIC.
//
// This consumer COPIES harness logic (DL-16 §2 violation): it re-declares a
// harness-internal validator symbol (`validateGeneratedFileManifest`) inline
// instead of consuming the harness package. The witness runner's copied-logic
// detector MUST flag this file. This file is a negative carrier only — it is
// never executed; it exists to prove the detector is non-vacuous.

export function validateGeneratedFileManifest() {
  // COPIED harness logic stand-in (forbidden by DL-16 §2).
  return { ok: true };
}

export function createPiDownstreamManifestSummary() {
  return { adapterId: "pi" };
}
