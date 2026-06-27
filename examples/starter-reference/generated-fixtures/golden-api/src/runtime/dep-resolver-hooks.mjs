// @sample @demo @reference — golden-records fixture dep resolver (I-16A runtime support).
//
// REAL-BOUNDARY POSTURE (quality bar: shape-green is not truth-green).
//
// The golden fixtures are NOT pnpm workspace members and live under
// examples/starter-reference/generated-fixtures/**. The repo-root `node_modules`
// does NOT hoist `@ts-rest/core` (pnpm keeps it virtual under .pnpm), so bare
// specifier resolution from the fixture location FAILS. The deps are declared +
// installed in the harness `packages/contracts` context (`@ts-rest/core@3.52.1`,
// `zod@3.25.76`).
//
// To let the fixture `.ts` files import the REAL `@ts-rest/core` + `zod`
// (exercised by the witness — NO mock, NO synthetic green), this module is an
// ESM `resolve` loader hook. Registered via `node --import ./register.mjs`, it
// walks up from its own location to find the repository root
// (`packages/contracts`) and maps the bare specifiers `@ts-rest/core` and `zod`
// to their REAL resolved pnpm-store paths (provenance exported on
// `DEP_RESOLVER_PROVENANCE`). Every other specifier delegates to Node's default
// resolution.
//
// This adds ZERO edges to the harness workspace graph: no package.json /
// pnpm-lock.yaml / pnpm-workspace.yaml / turbo / tsconfig edit, no `node_modules`
// created, no new package dependency introduced, no install. It only redirects
// bare-specifier resolution at runtime — exactly the in-context resolution
// posture the brief §8.1 sanctions (I-15B-3 in-context spawn precedent). If the
// real packages ever fail to resolve, the hook THROWS (fail-closed) rather than
// silently fall back to a mock.

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MAPPED_BARE_SPECIFIERS = new Set(["@ts-rest/core", "zod"]);

function locateRepositoryRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (existsSync(path.join(dir, "packages", "contracts", "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        "golden-records dep-resolver: could not locate repository root (packages/contracts) — cannot resolve real @ts-rest/core + zod. STOP-BLOCKED rather than mock."
      );
    }
    dir = parent;
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = locateRepositoryRoot(here);
const anchorModule = path.join(repositoryRoot, "packages", "contracts", "__golden-resolver-anchor.js");
const requireFromContracts = createRequire(anchorModule);

function realResolve(specifier) {
  try {
    return requireFromContracts.resolve(specifier);
  } catch (error) {
    throw new Error(
      `golden-records dep-resolver: real resolution of '${specifier}' failed from packages/contracts: ${error.message}. STOP-BLOCKED rather than mock.`
    );
  }
}

export const DEP_RESOLVER_PROVENANCE = {
  repositoryRoot,
  resolverAnchor: "packages/contracts",
  resolved: {
    "@ts-rest/core": pathToFileURL(realResolve("@ts-rest/core")).href,
    zod: pathToFileURL(realResolve("zod")).href
  }
};

// The fixture mirrors the I-11 TypeScript ESM convention of importing with `.js`
// extensions (the canonical post-compile form). Under `--experimental-strip-types`
// Node does NOT auto-rewrite `.js` specifiers to their on-disk `.ts` source, so
// for RELATIVE specifiers ending in `.js` that do not exist on disk we resolve
// the matching `.ts` file. Absolute/bare specifiers (incl. the mapped
// @ts-rest/core + zod) are handled before this fallback.
function isRelativeJsSpecifier(specifier) {
  return (specifier.startsWith("./") || specifier.startsWith("../")) && specifier.endsWith(".js");
}

export async function resolve(specifier, context, nextResolve) {
  if (MAPPED_BARE_SPECIFIERS.has(specifier)) {
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
