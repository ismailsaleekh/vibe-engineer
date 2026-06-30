// Deterministic hard-failure enforcement for the fail-closed wiring-integrity gate.
//
// The fail-closed rule is: expected ⊆ registered-and-running. If the set difference
// is non-empty, the gate MUST emit a HARD failure (non-zero exit, explicit diagnostic
// naming each missing family). It must NEVER be downgraded to advisory/warn-and-pass
// (amendment §5 I-20A negative N7 + post-i18b §3.2). The `advisory` flag is accepted
// but IGNORED for hard failures — proving a hard failure cannot be weakened.

import { buildPublicContractProof } from "./public-contract.mjs";
import { buildDependencyProof } from "./dependency-audit.mjs";
import { buildParityInputs } from "./profile-policy.mjs";

const RUN_PATTERN = /^runP(\d+)Aggregate$/;

/**
 * Enumerate the registered-and-running tier set at runtime from the PUBLIC aggregate
 * export surface. For each `runP{N}Aggregate` export, invoke it against projectRoot
 * and confirm it returns a typed carrier whose `family === "p{N}.aggregate"`.
 *
 * This is the REAL runtime enumeration: real PUBLIC import, real invocation, real
 * typed-carrier check. A runner export that is missing, throws, or returns a wrong
 * carrier family is classified as NOT registered-and-running (but the exception is
 * captured as evidence rather than crashing the gate).
 */
export async function enumerateRegisteredAndRunning(module, projectRoot) {
  const probedExports = Object.keys(module)
    .filter((k) => RUN_PATTERN.test(k))
    .sort();
  const perTier = [];
  for (const exportName of probedExports) {
    const family = `p${RUN_PATTERN.exec(exportName)[1]}`;
    const runner = module[exportName];
    const exportPresent = typeof runner === "function";
    let running = false;
    let carrierFamily = null;
    let implementedFamilies = [];
    let invocationError = null;
    if (exportPresent) {
      try {
        const result = await runner(projectRoot);
        if (
          result &&
          typeof result === "object" &&
          typeof result.family === "string" &&
          typeof result.ok === "boolean" &&
          "findings" in result &&
          "evidence" in result
        ) {
          carrierFamily = result.family;
          running = result.family === `${family}.aggregate`;
          if (result.evidence && Array.isArray(result.evidence.implementedFamilies)) {
            implementedFamilies = [...result.evidence.implementedFamilies];
          }
        } else {
          invocationError = `runner returned a non-carrier result (family/ok/findings/evidence shape mismatch)`;
        }
      } catch (error) {
        invocationError =
          error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      }
    }
    perTier.push({
      family,
      exportName,
      exportPresent,
      running,
      carrierFamily,
      implementedFamilies,
      invocationError,
    });
  }
  const registeredAndRunning = perTier
    .filter((t) => t.running)
    .map((t) => t.family)
    .sort();
  return { probedExports, perTier, registeredAndRunning };
}

/**
 * Apply the fail-closed rule. Returns { verdict, missingFamilies, exitCode, diagnostic }.
 * `advisory` is accepted but a non-empty missing set ALWAYS yields a HARD failure
 * (verdict "fail", exitCode 2) — the failure cannot be weakened (N7).
 */
export function applyFailClosedRule({ expectedFamilies, registeredAndRunning, advisory = false }) {
  const expected = [...new Set(expectedFamilies)].sort();
  const registered = new Set(registeredAndRunning);
  const missing = expected.filter((f) => !registered.has(f)).sort();
  if (missing.length === 0) {
    return {
      verdict: "pass",
      missingFamilies: [],
      exitCode: 0,
      diagnostic: null,
      advisoryIgnored: false,
    };
  }
  const names = missing.join(", ");
  const diagnostic =
    `FAIL-CLOSED wiring-integrity: expected families not registered-and-running: ${names}. ` +
    `expected=${JSON.stringify(expected)} registered-and-running=${JSON.stringify([...registered].sort())}. ` +
    `A declared-but-unregistered family is an incomplete/partial aggregate (mechanical §7 "CI invokes partial gate instead of aggregate gate"). ` +
    (advisory
      ? `advisory flag IGNORED — hard failure cannot be weakened (N7).`
      : `hard failure (non-zero exit) per post-i18b §3.2.`);
  return {
    verdict: "fail",
    missingFamilies: missing,
    exitCode: 2,
    diagnostic,
    advisoryIgnored: Boolean(advisory),
  };
}

/**
 * Build the complete wiring-integrity evidence object. Throws (fail-closed) on any
 * public-contract / dependency / profile violation. Applies the fail-closed rule
 * deterministically (advisory cannot weaken it).
 */
export async function buildWiringEvidence({
  projectRoot,
  expectedFamilies,
  aggregateModule,
  aggregateImportSpecifier,
  aggregateResolvedUrl,
  allowedImportSpecifiers,
  declaredDependencies,
  ownSourceTexts,
  config,
  profile,
  parityBlockingCommand,
  advisory = false,
}) {
  const startedAt = new Date().toISOString();
  const enumeration = await enumerateRegisteredAndRunning(aggregateModule, projectRoot);
  const p0Tier = enumeration.perTier.find((t) => t.family === "p0");
  const p0ImplementedFamilies = p0Tier ? p0Tier.implementedFamilies : [];

  const publicContractConsumption = buildPublicContractProof({
    specifier: aggregateImportSpecifier,
    module: aggregateModule,
    resolvedUrl: aggregateResolvedUrl,
    p0ImplementedFamilies,
    allowed: allowedImportSpecifiers,
  });
  const declaredDependencyProof = buildDependencyProof({
    declared: declaredDependencies,
    ownSourceTexts,
    allowedImportSpecifiers,
  });
  const parityInputs = buildParityInputs({ config, profile, parityBlockingCommand });

  const rule = applyFailClosedRule({
    expectedFamilies,
    registeredAndRunning: enumeration.registeredAndRunning,
    advisory,
  });

  const endedAt = new Date().toISOString();
  return {
    schemaVersion: "quality.wiring-integrity/1",
    gate: "fail-closed-wiring-integrity",
    profile,
    expectedFamilies: [...new Set(expectedFamilies)].sort(),
    registeredAndRunningFamilies: enumeration.registeredAndRunning,
    missingFamilies: rule.missingFamilies,
    verdict: rule.verdict,
    failClosedRule: "expected ⊆ registered-and-running",
    diagnostic: rule.diagnostic,
    publicContractConsumption,
    declaredDependencyProof,
    parityInputs,
    runtimeEnumeration: {
      method:
        "public-export-surface /^runP(\\d+)Aggregate$/ + real invocation typed-carrier check (family === p{N}.aggregate)",
      probedExports: enumeration.probedExports,
      perTier: enumeration.perTier.map((t) => ({
        family: t.family,
        exportName: t.exportName,
        exportPresent: t.exportPresent,
        running: t.running,
        carrierFamily: t.carrierFamily,
        implementedFamilies: t.implementedFamilies,
      })),
    },
    startedAt,
    endedAt,
    exitCode: rule.exitCode,
    advisoryIgnored: rule.advisoryIgnored,
  };
}
