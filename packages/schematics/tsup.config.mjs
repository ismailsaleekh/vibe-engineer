import { defineConfig } from "tsup";

// @vibe-engineer/schematics — ESM dist + .d.ts. Public entry = engine. No external deps.
export default defineConfig({
  entry: ["src/engine/index.js"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  sourcemap: false,
  clean: true,
  dts: true,
  tsconfig: "./tsconfig.json"
});
