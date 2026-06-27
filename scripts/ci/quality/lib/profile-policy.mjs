// CI profile composition policy for the fail-closed wiring-integrity gate.
//
// The `ci` profile is the deterministic quick-gate tier. It MUST exclude full E2E,
// full mobile E2E, and full visual/UI verification from the DEFAULT CI composition
// (amendment §5 I-20A negative N8 + verification §5.15). Tiny labeled smoke is out
// of I-20A's scope (I-20B). Any violation → fail-closed.

const REQUIRED_EXCLUDE_KEYS = ["fullE2E", "fullMobileE2E", "fullVisualUi"];

/**
 * Assert the named profile is a valid deterministic quick-gate composition.
 * Throws (fail-closed) if the profile is missing, excludes are not all true,
 * or the composition is empty.
 */
export function assertCiProfile(config, profile) {
  if (!config || typeof config !== "object") {
    throw new Error(`profile-policy: quality-wiring config missing.`);
  }
  const profiles = config.profiles;
  if (!profiles || typeof profiles !== "object" || !(profile in profiles)) {
    throw new Error(`profile-policy: profile '${profile}' is not declared in quality-wiring config.`);
  }
  const entry = profiles[profile];
  if (!Array.isArray(entry.composition) || entry.composition.length === 0) {
    throw new Error(`profile-policy: profile '${profile}' has empty composition (partial/empty gate forbidden).`);
  }
  if (!entry.excludes || typeof entry.excludes !== "object") {
    throw new Error(`profile-policy: profile '${profile}' missing excludes policy.`);
  }
  for (const key of REQUIRED_EXCLUDE_KEYS) {
    if (entry.excludes[key] !== true) {
      throw new Error(
        `profile-policy: profile '${profile}' must exclude ${key} from default CI (full E2E/mobile/visual as default CI forbidden — N8).`
      );
    }
  }
  return entry;
}

/**
 * Build the local/CI parity inputs proof. The SAME blocking command is invoked
 * locally and in CI (R1 local/CI parity). Proves the deterministic quick-gate
 * excludes full E2E/mobile/visual.
 */
export function buildParityInputs({ config, profile, parityBlockingCommand }) {
  assertCiProfile(config, profile);
  if (typeof parityBlockingCommand !== "string" || parityBlockingCommand.length === 0) {
    throw new Error("profile-policy: parity blocking command is empty.");
  }
  const excludes = config.profiles[profile].excludes;
  return {
    blockingCommand: parityBlockingCommand,
    profile,
    localAndCiEquivalent: true,
    excludesFullE2E: excludes.fullE2E === true,
    excludesFullMobileE2E: excludes.fullMobileE2E === true,
    excludesFullVisualUi: excludes.fullVisualUi === true
  };
}
