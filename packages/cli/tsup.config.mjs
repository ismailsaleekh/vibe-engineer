import { defineConfig } from "tsup";

// vibe-engineer (CLI) — bundled ESM runtime. Entry = bin source (.js).
// Workspace siblings are declared deps → external (resolved from node_modules at install; WP-05 seam).
// envelope + command-loader are also public export subpaths → emitted as standalone entries.
// Output preserves subdir shape: dist/entry/vibe-engineer.js, dist/envelope/result-envelope.js, dist/command-loader/loader.js.
export default defineConfig({
  entry: [
    "src/entry/vibe-engineer.js",
    "src/envelope/result-envelope.js",
    "src/command-loader/loader.js"
  ],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  sourcemap: false,
  clean: true,
  splitting: false,
  external: [
    "@vibe-engineer/adapter-pi",
    "@vibe-engineer/artifacts",
    "@vibe-engineer/config",
    "@vibe-engineer/skills",
    "@vibe-engineer/context",
    "@vibe-engineer/security",
    "@vibe-engineer/schematics",
    "@vibe-engineer/verification"
  ]
});
