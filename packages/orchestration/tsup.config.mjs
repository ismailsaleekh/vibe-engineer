import { defineConfig } from "tsup";

// @vibe-engineer/orchestration — ESM dist + .d.ts via tsup (migrated from tsc-emit).
// external: workspace sibling resolved from node_modules at install (WP-02 publish graph).
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  sourcemap: false,
  clean: true,
  dts: true,
  external: ["@vibe-engineer/artifacts"],
  tsconfig: "./tsconfig.json",
});
