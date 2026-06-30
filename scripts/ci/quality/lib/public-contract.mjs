// Public-contract consumption proof for the fail-closed wiring-integrity gate.
//
// The load-bearing typed seam in I-20A is the PUBLIC aggregate API
// (@vibe-engineer/mechanical-gates/aggregate). Internal relative imports into
// packages/mechanical-gates/src/** are FORBIDDEN (amendment §5 I-20A + mechanical §7).
// This module classifies the import specifier used, asserts the resolved module is the
// canonical public export surface, and proves the testing-boundary public contract is
// registered at runtime (I-10C-AGG closure). Any violation → fail-closed.

export const PUBLIC_AGGREGATE_SPECIFIER = "@vibe-engineer/mechanical-gates/aggregate";

const RUN_PATTERN = /^runP(\d+)Aggregate$/;

/**
 * Classify an import specifier against the public-contract policy.
 * Returns { publicSpecifierUsed, noInternalRelativeImport }.
 * A relative path (./ ../../ /) or any path reaching packages/mechanical-gates/src
 * is classified as an internal relative import (forbidden).
 */
export function classifyImportSpecifier(specifier, allowed) {
  const allowedSet = new Set(allowed);
  const isRelative =
    typeof specifier === "string" &&
    (specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/"));
  const reachesSrc =
    typeof specifier === "string" && specifier.includes("packages/mechanical-gates/src");
  return {
    publicSpecifierUsed: allowedSet.has(specifier),
    noInternalRelativeImport: !isRelative && !reachesSrc,
  };
}

function isFunction(value) {
  return typeof value === "function";
}

/**
 * Assert the resolved module is the canonical PUBLIC aggregate export surface.
 * The public surface MUST expose at least runP0Aggregate and the enumerable
 * runP{N}Aggregate pattern. A module that bypasses the public export (e.g. a
 * partial/internal barrel) is rejected → fail-closed.
 */
export function assertPublicAggregateModule(module) {
  if (!module || typeof module !== "object") {
    throw new Error(
      "public-contract: aggregate module is not an object (public export surface missing).",
    );
  }
  if (!isFunction(module.runP0Aggregate)) {
    throw new Error(
      "public-contract: runP0Aggregate is not a function on the aggregate module (public export surface not consumed).",
    );
  }
  const runnerExports = Object.keys(module)
    .filter((k) => RUN_PATTERN.test(k))
    .sort();
  if (runnerExports.length === 0) {
    throw new Error(
      "public-contract: aggregate module exposes no runP{N}Aggregate runners (not the public surface).",
    );
  }
  return runnerExports;
}

/**
 * Build the public-contract consumption proof. Throws (fail-closed) if:
 *  - the import specifier is not the allowed public specifier (N4: internal relative import);
 *  - the resolved module is not the canonical public export surface (N4);
 *  - the testing-boundary public contract is not registered at runtime (N5).
 *
 * `p0ImplementedFamilies` is the runtime-reported implementedFamilies from the REAL
 * runP0Aggregate result — proving the testing-boundary family is genuinely registered.
 */
export function buildPublicContractProof({
  specifier,
  module,
  resolvedUrl,
  p0ImplementedFamilies,
  allowed,
}) {
  const classification = classifyImportSpecifier(specifier, allowed);
  if (!classification.publicSpecifierUsed) {
    throw new Error(
      `public-contract: aggregate import specifier '${specifier}' is not in the allowed public set ${JSON.stringify(allowed)} — internal relative import forbidden (N4).`,
    );
  }
  if (!classification.noInternalRelativeImport) {
    throw new Error(
      `public-contract: aggregate import specifier '${specifier}' reaches into package internals — internal relative import forbidden (N4).`,
    );
  }
  const runnerExports = assertPublicAggregateModule(module);
  const implemented = Array.isArray(p0ImplementedFamilies) ? p0ImplementedFamilies : [];
  const testingBoundaryRegistered = implemented.includes("p0.testing-boundary");
  if (!testingBoundaryRegistered) {
    throw new Error(
      `public-contract: testing-boundary public contract not registered at runtime (p0.testing-boundary absent from implementedFamilies=${JSON.stringify(implemented)}) — missing testing-boundary public contract (N5).`,
    );
  }
  return {
    aggregateImportSpecifier: specifier,
    aggregateResolvedModuleUrl:
      typeof resolvedUrl === "string" && resolvedUrl.length > 0
        ? resolvedUrl
        : PUBLIC_AGGREGATE_SPECIFIER,
    aggregatePublicExports: runnerExports,
    publicSpecifierUsed: true,
    noInternalRelativeImport: true,
    testingBoundaryRegistered,
  };
}
