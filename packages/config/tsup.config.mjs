import { defineConfig } from "tsup";

// @vibe-engineer/config — ESM dist + .d.ts. No runtime deps.
export default defineConfig({
  entry: ["src/index.js"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  sourcemap: false,
  clean: true,
  dts: true,
  tsconfig: "./tsconfig.build.json",
});
