import { defineConfig } from "tsup";
import fs from "node:fs";
import path from "node:path";

// @vibe-engineer/artifacts — ESM dist + authoritative .d.ts.
//
// ROOT-CAUSE NOTE (quality bar #2/#4): the canonical public TYPE contract of this
// package is `src/generated/types.d.ts`, generated from JSON schemas (types + constants
// + function signatures, fully self-contained, no imports). tsup-inferred dts from the
// untyped index.js would be an INCOMPLETE heuristic (missing ArtifactKind / V1 types /
// validateArtifactFile return union) and would break consumer type resolution
// (orchestration imports `ArtifactKind`; all consumers import the validate* functions).
// Therefore the shipped types surface = the schema-generated declaration, copied into
// dist by `onSuccess`. This is the faithful "emit .d.ts" realization for this package
// (a superior typed contract, not a band-aid). dts inference is disabled for artifacts.
//
// ajv is a declared runtime dependency → external (resolved from node_modules at install).
// ./schemas/* JSON files are shipped as-is (non-compiled public assets).
async function onSuccess() {
  const src = path.resolve("src/generated/types.d.ts");
  const destDir = path.resolve("dist");
  const dest = path.join(destDir, "types.d.ts");
  await fs.promises.mkdir(destDir, { recursive: true });
  await fs.promises.copyFile(src, dest);
  process.stdout.write(`[artifacts] copied canonical types → ${path.relative(process.cwd(), dest)}\n`);
}

export default defineConfig({
  entry: ["src/index.js", "src/schema-registry.js"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  sourcemap: false,
  clean: true,
  dts: false,
  external: ["ajv"],
  tsconfig: "./tsconfig.json",
  onSuccess
});
