// @sample @demo @reference — golden-web Vite config (I-17A / DL-16).
//
// Graph-neutral + real-resolution posture (mirrors golden-flow's
// src/runtime/dep-resolver-hooks.mjs discipline). The golden-client shared
// client transitively imports `@ts-rest/core` + `zod`, which the repo-root
// `node_modules` does NOT hoist (pnpm keeps them virtual under the harness
// `packages/contracts` context). Rather than a loader hook, the Vite dev/build
// server resolves these bare specifiers via `resolve.alias` anchored at the
// REAL `packages/contracts` resolved paths — the same in-context real-resolution
// posture as I-16B. If the real packages fail to resolve, the alias helper
// THROWS (fail-closed) rather than silently fall back to a stub.
//
// React JSX uses the automatic runtime (`react/jsx-runtime`), so no per-file
// `import React` is needed and no `@vitejs/plugin-react` dependency is required
// (keeps the EXTEND dep surface to react/react-dom/vite only).
//
// Real-boundary posture: this config + the dev server only run truth-green once
// `react`/`react-dom`/`vite` are actually installed (W-RB-PLAYWRIGHT). It is
// syntactically + structurally validated in-license (shape-green).

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

function locateRepositoryRoot(startDir: string): string {
  let dir = startDir;
  while (true) {
    if (existsSync(path.join(dir, "packages", "contracts", "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        "golden-web vite.config: could not locate repository root (packages/contracts) — cannot resolve real @ts-rest/core + zod for the served bundle. STOP-BLOCKED rather than mock."
      );
    }
    dir = parent;
  }
}

const repositoryRoot = locateRepositoryRoot(here);
const requireFromContracts = createRequire(
  path.join(repositoryRoot, "packages", "contracts", "__golden-web-vite-resolver-anchor.js")
);

function realResolve(spec: string): string {
  try {
    return requireFromContracts.resolve(spec);
  } catch (error) {
    throw new Error(
      `golden-web vite.config: real resolution of '${spec}' failed from packages/contracts: ${(error as Error).message}. STOP-BLOCKED rather than mock.`
    );
  }
}

// Bind the I-16B shared-client transitive deps to their REAL pnpm-store paths.
const sharedClientDeps: Record<string, string> = {
  "@ts-rest/core": realResolve("@ts-rest/core"),
  zod: realResolve("zod")
};

export default defineConfig({
  root: here,
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: sharedClientDeps
  },
  server: {
    host: "127.0.0.1",
    strictPort: true
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
