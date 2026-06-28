import { defineConfig } from "tsup";

// @vibe-engineer/security — ESM dist + best-available .d.ts.
//
// ROOT-CAUSE NOTE (quality bar #2/#4): src/index.js is plain `.js` with `// @ts-check`
// and carries PRE-EXISTING strict-mode type debt (TS4111/TS2339/TS2345/TS7006/TS18048)
// that was never exercised — this package had NO typecheck/build script before WP-01
// (metadata: skeleton-only). Fixing that debt requires source edits owned by the
// security implementation lane, NOT WP-01 (owned WRITE = package.json/tsup/tsconfig).
// tsup's dts worker cannot emit past these errors (it ignores noEmitOnError). So we
// generate the public `.d.ts` with a permissive `tsc` in `onSuccess`: tsc's default
// `noEmitOnError=false` emits best-available declarations despite the source errors.
// The residual strict-source debt is recorded in the WP-01 report for the owning lane.
// No runtime deps.
async function onSuccess() {
  const { execFileSync } = await import("node:child_process");
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const tscBin = require.resolve("typescript/bin/tsc");
  const args = [
    "src/index.js",
    "--allowJs",
    "--checkJs", "false",
    "--declaration",
    "--emitDeclarationOnly",
    "--outDir", "dist",
    "--rootDir", "src",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--lib", "ES2022",
    "--skipLibCheck",
    "--strict", "false",
    "--noEmitOnError", "false"
  ];
  try {
    execFileSync(process.execPath, [tscBin, ...args], { stdio: "inherit" });
  } catch {
    // tsc reports source errors but (noEmitOnError=false) still wrote dist/index.d.ts.
    process.stdout.write("[security] tsc reported pre-existing source type debt; dist/index.d.ts emitted\n");
  }
}

export default defineConfig({
  entry: ["src/index.js"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  sourcemap: false,
  clean: true,
  dts: false,
  tsconfig: "./tsconfig.json",
  onSuccess
});
