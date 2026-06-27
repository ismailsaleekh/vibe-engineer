// @sample @demo @reference — observability fixture dep resolver (I-19 runtime support).
//
// REAL-BOUNDARY POSTURE (quality bar: shape-green is not truth-green).
//
// Verbatim mirror of the proven I-16A/I-16B mechanism
// (golden-{api,flow}/src/runtime/dep-resolver-hooks.mjs), extended for the
// observability fixture's two anchor contexts:
//   * `packages/observability` — owns the REAL `pino`, `@opentelemetry/*`,
//     `zod`, `@vibe-engineer/security`, and `@vibe-engineer/observability` deps.
//   * `packages/contracts` — owns the REAL `@ts-rest/core` + `zod` the golden
//     boundary exercises (validated I-15B-3 in-context resolution precedent).
//
// The observability fixture is NOT a pnpm workspace member and lives under
// examples/starter-reference/generated-fixtures/observability/**. Bare-specifier
// resolution from the fixture location FAILS under strict pnpm
// (shamefully-hoist=false). To let the fixture `.ts` files import the REAL
// `@vibe-engineer/observability`, `pino`, `@opentelemetry/*`, `@ts-rest/core`,
// and `zod` (exercised by the witness — NO mock, NO synthetic green), this
// module is an ESM `resolve` loader hook. Registered via
// `node --import ./register.mjs`, it walks up from its own location to find the
// repository root and maps bare specifiers to their REAL resolved pnpm-store
// paths (provenance exported on `DEP_RESOLVER_PROVENANCE`). Relative `.js`
// specifiers that don't exist on disk resolve to their `.ts` source (Node 24
// type-stripping convention). Every other specifier delegates to Node default.
//
// This adds ZERO edges to the harness workspace graph: no package.json /
// pnpm-lock.yaml / pnpm-workspace.yaml / turbo / tsconfig edit, no `node_modules`
// created, no install. It only redirects bare-specifier resolution at runtime.
// If the real packages ever fail to resolve, the hook THROWS (fail-closed).

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MAPPED_PREFIXES = [
  "@vibe-engineer/observability",
  "@opentelemetry/",
  "pino",
  "@ts-rest/core",
  "zod",
];

function looksMapped(specifier) {
  return MAPPED_PREFIXES.some(
    (p) => specifier === p || specifier.startsWith(p) || specifier.startsWith(p + "/")
  );
}

function locateRepositoryRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (existsSync(path.join(dir, "packages", "observability", "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        "observability dep-resolver: could not locate repository root (packages/observability) — cannot resolve real deps. STOP-BLOCKED rather than mock."
      );
    }
    dir = parent;
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = locateRepositoryRoot(here);
const observabilityCtx = path.join(repositoryRoot, "packages", "observability");
const contractsCtx = path.join(repositoryRoot, "packages", "contracts");
const requireFromObservability = createRequire(path.join(observabilityCtx, "__observability-resolver-anchor.js"));
const requireFromContracts = createRequire(path.join(contractsCtx, "__observability-resolver-anchor.js"));

function realResolve(specifier) {
  // Observability-owned deps resolve from packages/observability; the golden
  // contract deps (@ts-rest/core + zod) resolve from packages/contracts (the
  // validated I-15B-3 anchor the golden fixtures themselves use).
  const requireFn =
    specifier === "@ts-rest/core" || (specifier !== "zod" && false)
      ? requireFromContracts
      : specifier.startsWith("@opentelemetry") || specifier === "pino" || specifier.startsWith("@vibe-engineer/observability") || specifier === "zod"
        ? requireFromObservability
        : requireFromContracts;
  try {
    return requireFn.resolve(specifier);
  } catch {
    // fall back to the other anchor before failing closed.
    try {
      return requireFromContracts.resolve(specifier);
    } catch (error2) {
      try {
        return requireFromObservability.resolve(specifier);
      } catch (error) {
        throw new Error(
          `observability dep-resolver: real resolution of '${specifier}' failed: ${error.message}. STOP-BLOCKED rather than mock.`
        );
      }
    }
  }
}

export const DEP_RESOLVER_PROVENANCE = {
  repositoryRoot,
  anchors: ["packages/observability", "packages/contracts"],
  resolved: {
    "@vibe-engineer/observability": pathToFileURL(realResolve("@vibe-engineer/observability")).href,
    pino: pathToFileURL(realResolve("pino")).href,
    "@opentelemetry/api": pathToFileURL(realResolve("@opentelemetry/api")).href,
    "@ts-rest/core": pathToFileURL(realResolve("@ts-rest/core")).href,
    zod: pathToFileURL(realResolve("zod")).href,
  },
};

function isRelativeJsSpecifier(specifier) {
  return (specifier.startsWith("./") || specifier.startsWith("../")) && specifier.endsWith(".js");
}

export async function resolve(specifier, context, nextResolve) {
  if (looksMapped(specifier)) {
    return { url: pathToFileURL(realResolve(specifier)).href, shortCircuit: true };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (isRelativeJsSpecifier(specifier) && error && error.code === "ERR_MODULE_NOT_FOUND") {
      const tsSpecifier = specifier.slice(0, -3) + ".ts";
      return nextResolve(tsSpecifier, context);
    }
    throw error;
  }
}
