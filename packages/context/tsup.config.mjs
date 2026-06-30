import { defineConfig } from "tsup";

// @vibe-engineer/context — ESM dist + .d.ts. Workspace siblings external.
export default defineConfig({
  entry: ["src/index.js"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  sourcemap: false,
  clean: true,
  dts: true,
  external: ["@vibe-engineer/artifacts", "@vibe-engineer/config"],
  tsconfig: "./tsconfig.json",
});
