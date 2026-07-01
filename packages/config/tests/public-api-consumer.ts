import {
  VIBE_CONFIG_SCHEMA,
  createDefaultVibeConfig,
  loadVibeConfigFromProjectRoot,
  parseVibeConfig,
} from "@vibe-engineer/config";
import type { AgenticHarness, VibeConfig, VibeConfigResult } from "@vibe-engineer/config";

const supportedHarnesses: readonly AgenticHarness[] = ["pi", "claude-code", "codex"];
const harness: AgenticHarness = supportedHarnesses[1] ?? "claude-code";
const createdConfig: VibeConfig = createDefaultVibeConfig({ agenticHarness: harness });

export async function consumeResolvedConfig(projectRoot: string): Promise<number> {
  const loaded: VibeConfigResult = await loadVibeConfigFromProjectRoot(projectRoot);
  if (!loaded.ok) {
    return loaded.diagnostics.length;
  }
  const resolved: VibeConfig = loaded.config;
  return (
    resolved.maxParallelAgents +
    resolved.maxValidationFixIterations +
    resolved.agenticWorkPackageTargetHours
  );
}

export function consumeParserBoundary(input: unknown): VibeConfigResult {
  return parseVibeConfig(input);
}

export const publicApiConsumerWitness = {
  schemaId: VIBE_CONFIG_SCHEMA.id,
  createdHarness: createdConfig.agenticHarness,
  deterministicBlocksByDefault: createdConfig.verification.deterministicBlocks,
  advisoryReviewBlocksByDefault: createdConfig.verification.advisoryReviewBlocks,
} as const;
