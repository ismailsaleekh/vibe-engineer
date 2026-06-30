import { defineConfig } from "tsup";

// @vibe-engineer/skills — multi-subpath public API. Workspace siblings external.
export default defineConfig({
  entry: ["src/build/index.js", "src/ship/orchestrator/index.js", "src/ship/intake/index.js"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  sourcemap: false,
  clean: true,
  dts: true,
  external: [
    "@vibe-engineer/adapter-pi",
    "@vibe-engineer/artifacts",
    "@vibe-engineer/context",
    "@vibe-engineer/orchestration",
    "@vibe-engineer/verification",
    "@vibe-engineer/skills",
  ],
  tsconfig: "./tsconfig.json",
});
