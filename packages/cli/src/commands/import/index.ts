// vibe-engineer import — import an existing project into vibe-engineer management with the
// selected pi agentic harness and DL-17 bootstrap context. Shares the selected-harness join +
// bootstrap logic with `create` (internal to create/** + import/** only).
// Mirrors the accepted verify/index.ts Node-24-native-.ts-load precedent.
import { runCreate } from "../create/index.ts";
import type { UnknownRecord } from "../create/selected-harness.ts";

type CommandContext = {
  invocation: unknown;
  args: string[];
  context: UnknownRecord;
};

async function run(context: CommandContext): Promise<{ envelope: UnknownRecord }> {
  return runCreate(context as Parameters<typeof runCreate>[0], "import");
}

export const importCommand = Object.freeze({
  id: "import",
  visibility: "starter",
  description: "Import an existing project into vibe-engineer management with the selected pi agentic harness and DL-17 bootstrap context.",
  run,
});

export default importCommand;
