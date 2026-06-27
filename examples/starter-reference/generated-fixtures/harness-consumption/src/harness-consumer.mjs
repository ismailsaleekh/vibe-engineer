// I-15B-3 harness-consumption witness — generated-starter consumer module.
//
// This module is the STATIC evidence that a generated @vibe-engineer-starter
// app CONSUMES the `vibe-engineer` harness package through its PUBLIC surface
// (DL-16 §2: the starter consumes the harness; it never copies harness logic).
//
// It imports ONLY the public `vibe-engineer` package (no `@vibe-engineer/*`
// harness internals, no relative imports into packages/adapters/presets). The
// public surface consumed here mirrors the cli `exports` map
// (`packages/cli/package.json`): `.`, `./envelope`, `./command-loader`.
//
// RESOLUTION NOTE: under strict pnpm (`shamefully-hoist=false`) a package cannot
// import `vibe-engineer` by its bare public specifier unless that dependency is
// declared AND linked in its resolution context. This fixture is intentionally
// NOT a pnpm workspace member (it is a generated-fixture artifact), so the bare
// specifier does NOT resolve from this fixture's own directory. The witness
// runner (`run-harness-consumption-witness.mjs`) therefore exercises the REAL
// resolve+import by spawning this consumption from the `packages/cli` resolution
// context (cwd=packages/cli), where `vibe-engineer` resolves via Node package
// SELF-REFERENCE (the package's own `name` + `exports` map) — the exact in-
// context self-reference spawn posture the I-15B-2 revalidator certified as
// REAL-BOUNDARY ("load success itself proves the seam"). This is not shape-only:
// the real public surface is loaded and its symbols are returned to the runner.

/**
 * Consume the `vibe-engineer` harness package public surface and return the
 * resolved symbols. Called by the witness runner from the cli resolution
 * context. Throws if any public subpath fails to resolve/load — proving the
 * generated starter depends on the real harness package, not a copy.
 */
export async function consumeHarnessPublicSurface() {
  const root = await import("vibe-engineer");
  const envelope = await import("vibe-engineer/envelope");
  const commandLoader = await import("vibe-engineer/command-loader");
  return {
    root: { keys: Object.keys(root), hasRunCli: typeof root.runCli === "function" },
    envelope: {
      keys: Object.keys(envelope),
      hasCreateEnvelope: typeof envelope.createEnvelope === "function",
      hasValidateCliResultEnvelope: typeof envelope.validateCliResultEnvelope === "function",
      hasCliStatuses: typeof envelope.CLI_STATUSES === "object",
    },
    commandLoader: {
      keys: Object.keys(commandLoader),
      hasCommandLoader: typeof commandLoader.CommandLoader === "function",
      hasCreateCommandLoader: typeof commandLoader.createCommandLoader === "function",
    },
  };
}
