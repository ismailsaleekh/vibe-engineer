import { validateGovernedSurface } from "@vibe-engineer/mechanical-gates/p0/governed-surface";
import { validateStrictConfig } from "@vibe-engineer/mechanical-gates/p0/config-guards";
import { validatePackageBoundaries } from "@vibe-engineer/mechanical-gates/p0/boundaries";
import {
  assertTypedFindings,
  createFinding,
  createValidatorResult
} from "../p0/boundaries/contracts.js";
import { validateEscapeAllowlist } from "../p0/allowlist/index.js";
import { validateDomainPurity } from "../p0/domain-purity/index.js";
import { validateTestingBoundary } from "../p0/testing-boundary/index.js";

const FAMILY = "p0.aggregate";
const IMPLEMENTED_FAMILIES = Object.freeze([
  "p0.governed-surface",
  "p0.config-guards",
  "p0.boundaries",
  "p0.allowlist",
  "p0.domain-purity",
  "p0.testing-boundary"
]);

function finding(ruleId, findingPath, message, evidence = {}) {
  return createFinding({ family: FAMILY, ruleId, path: findingPath, message, evidence });
}

function assertValidatorResult(result, family) {
  if (!result || typeof result !== "object" || result.family !== family || typeof result.ok !== "boolean" || !Array.isArray(result.findings) || !result.evidence || typeof result.evidence !== "object") {
    throw new Error(`Validator ${family} returned an invalid typed result carrier.`);
  }
  assertTypedFindings(result.findings);
}

async function runFamily(projectRoot, family, options) {
  if (family === "p0.governed-surface") return validateGovernedSurface(projectRoot, options.governedSurface ?? {});
  if (family === "p0.config-guards") return validateStrictConfig(projectRoot, options.strictConfig ?? {});
  if (family === "p0.boundaries") return validatePackageBoundaries(projectRoot, options.boundaries ?? {});
  if (family === "p0.allowlist") return validateEscapeAllowlist(projectRoot, options.allowlist ?? {});
  if (family === "p0.domain-purity") return validateDomainPurity(projectRoot, options.domainPurity ?? {});
  if (family === "p0.testing-boundary") return validateTestingBoundary(projectRoot, options.testingBoundary ?? {});
  throw new Error(`Unknown P0 aggregate family: ${family}`);
}

export async function runP0Aggregate(projectRoot, options = {}) {
  const requestedFamilies = options.families ?? [...IMPLEMENTED_FAMILIES];
  const findings = [];
  const subresults = [];

  for (const family of requestedFamilies) {
    if (!IMPLEMENTED_FAMILIES.includes(family)) {
      findings.push(finding("aggregate.unknown-family", ".", "Aggregate requested an unknown P0 family.", { family }));
    }
  }

  for (const family of IMPLEMENTED_FAMILIES) {
    if (!requestedFamilies.includes(family)) {
      findings.push(finding("aggregate.omitted-family", ".", "Aggregate run omitted an implemented P0 gate family.", {
        omittedFamily: family,
        implementedFamilies: [...IMPLEMENTED_FAMILIES],
        requestedFamilies
      }));
    }
  }

  for (const family of requestedFamilies) {
    if (!IMPLEMENTED_FAMILIES.includes(family)) continue;
    try {
      const result = await runFamily(projectRoot, family, options);
      assertValidatorResult(result, family);
      subresults.push(result);
      findings.push(...result.findings);
    } catch (error) {
      findings.push(finding("aggregate.validator-exception", ".", "P0 aggregate validator raised instead of returning a typed result; aggregate fails closed.", {
        family,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined
      }));
    }
  }

  const summary = Object.fromEntries(IMPLEMENTED_FAMILIES.map((family) => {
    const result = subresults.find((candidate) => candidate.family === family);
    return [family, result ? { ok: result.ok, findingCount: result.findings.length } : { ok: false, omitted: true }];
  }));

  return createValidatorResult({
    family: FAMILY,
    projectRoot,
    findings,
    evidence: {
      implementedFamilies: [...IMPLEMENTED_FAMILIES],
      requestedFamilies,
      subresults,
      summary
    }
  });
}
