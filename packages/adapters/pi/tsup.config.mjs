import { defineConfig } from "tsup";

// @vibe-engineer/adapter-pi — TypeScript source. 4 public subpaths.
// esbuild resolves/strips .ts specifiers at bundle time; dts via tsc with allowImportingTsExtensions.
export default defineConfig({
  entry: [
    "src/capabilities/index.ts",
    "src/generated-file-manifest/index.ts",
    "src/create-consumption/index.ts",
    "src/schema/index.ts",
  ],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  sourcemap: false,
  clean: true,
  dts: true,
  tsconfig: "./tsconfig.json",
});
