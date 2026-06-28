import type { CliResultEnvelope } from "../envelope/result-envelope.js";

export interface CommandMetadata {
  id: string;
  visibility: string;
  description: string;
}

export interface CommandRunInput {
  invocation: Record<string, unknown>;
  args: string[];
  context: Record<string, unknown>;
}

export interface CommandDefinition extends CommandMetadata {
  run(
    input: CommandRunInput,
  ): Promise<{ envelope: CliResultEnvelope }> | { envelope: CliResultEnvelope };
}

export class CommandLoaderDefinitionError extends Error {
  code: string;
  classification: string;
  constructor(code: string, message: string);
}

export class CommandLoader {
  constructor(commands?: readonly CommandDefinition[]);
  listCommands(): CommandMetadata[];
  hasCommand(id: string): boolean;
  dispatch(
    commandId: string,
    args: string[],
    context: Record<string, unknown>,
  ): Promise<{ envelope: CliResultEnvelope }>;
}

export function createCommandLoader(commands?: readonly CommandDefinition[]): CommandLoader;
