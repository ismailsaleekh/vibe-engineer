import { SKILL_IDS, type SkillId } from "../schema/index.ts";
import type { PiRuntimeFixture, PiRuntimeValidationIssue } from "../runtime/types.ts";
import { validatePiRuntimeFixture } from "../runtime/validation.ts";

export type PiLoaderWitnessStatus = "proven" | "pending-live/BLOCKED" | "failed";
export type PiCommandSource = "skill" | "prompt" | "extension";

export interface PiRpcGetCommandsRequest {
  readonly id: "i14b-get-commands";
  readonly type: "get_commands";
}

export interface PiRpcCommandObservation {
  readonly name: string;
  readonly source: PiCommandSource;
  readonly path?: string;
  readonly description?: string;
}

const maybeString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

const responseWithOptionalId = <T extends Omit<PiRpcGetCommandsResponse, "id">>(id: unknown, response: T): PiRpcGetCommandsResponse => {
  const parsedId = maybeString(id);
  return parsedId === undefined ? response : { ...response, id: parsedId };
};

export interface PiRpcGetCommandsResponseData {
  readonly commands: readonly PiRpcCommandObservation[];
}

export interface PiRpcGetCommandsResponse {
  readonly id?: string;
  readonly type: "response";
  readonly command: "get_commands";
  readonly success: boolean;
  readonly data?: PiRpcGetCommandsResponseData;
  readonly error?: string;
}

export interface PiLoaderWitnessPlan {
  readonly fixtureRoot: string;
  readonly command: "pi";
  readonly args: readonly string[];
  readonly stdinJsonl: string;
  readonly requiredCommands: readonly string[];
  readonly expectedAssetPaths: readonly string[];
  readonly requiresProjectTrust: true;
  readonly requiresModelProviderCredentials: false;
  readonly destructiveOrExternalMutation: false;
  readonly runtimeExecutionClaimIfNotRun: "pending-live";
}

export interface PiLoaderWitnessEvaluation {
  readonly status: PiLoaderWitnessStatus;
  readonly observedCommands: readonly PiRpcCommandObservation[];
  readonly missingCommands: readonly string[];
  readonly validationIssues: readonly PiRuntimeValidationIssue[];
  readonly pendingLiveReason?: string;
}

const isRecord = (value: unknown): value is { readonly [key: string]: unknown } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const commandNameForSkill = (skillId: SkillId): string => `skill:${skillId}`;
const commandNameForPrompt = (skillId: SkillId): string => `vibe-${skillId}`;

export const createPiRpcGetCommandsRequest = (): PiRpcGetCommandsRequest => ({
  id: "i14b-get-commands",
  type: "get_commands",
});

export const createPiLoaderWitnessPlan = (fixtureRoot: string, fixture: PiRuntimeFixture): PiLoaderWitnessPlan => {
  const validation = validatePiRuntimeFixture(fixture);
  const requiredCommands = [
    ...SKILL_IDS.map((skillId) => commandNameForSkill(skillId)),
    ...SKILL_IDS.map((skillId) => commandNameForPrompt(skillId)),
  ];
  return {
    fixtureRoot,
    command: "pi",
    args: ["--mode", "rpc", "--no-session"],
    stdinJsonl: `${JSON.stringify(createPiRpcGetCommandsRequest())}\n`,
    requiredCommands,
    expectedAssetPaths: validation.valid ? fixture.assets.map((asset) => asset.path) : [],
    requiresProjectTrust: true,
    requiresModelProviderCredentials: false,
    destructiveOrExternalMutation: false,
    runtimeExecutionClaimIfNotRun: "pending-live",
  };
};

export const parsePiRpcGetCommandsResponse = (value: unknown): PiRpcGetCommandsResponse => {
  if (!isRecord(value)) {
    return { type: "response", command: "get_commands", success: false, error: "response_not_object" };
  }
  if (value["type"] !== "response" || value["command"] !== "get_commands") {
    return { type: "response", command: "get_commands", success: false, error: "unexpected_response_type" };
  }
  if (value["success"] !== true) {
    return responseWithOptionalId(value["id"], {
      type: "response",
      command: "get_commands",
      success: false,
      error: maybeString(value["error"]) ?? "rpc_get_commands_failed",
    });
  }
  const data = value["data"];
  const commandsValue = isRecord(data) ? data["commands"] : undefined;
  if (!Array.isArray(commandsValue)) {
    return responseWithOptionalId(value["id"], {
      type: "response",
      command: "get_commands",
      success: false,
      error: "missing_commands_array",
    });
  }
  const commands: PiRpcCommandObservation[] = [];
  for (const commandValue of commandsValue) {
    if (!isRecord(commandValue)) {
      continue;
    }
    const name = commandValue["name"];
    const source = commandValue["source"];
    if (typeof name !== "string") {
      continue;
    }
    if (source !== "skill" && source !== "prompt" && source !== "extension") {
      continue;
    }
    const observed: PiRpcCommandObservation = { name, source };
    const path = maybeString(commandValue["path"]);
    const description = maybeString(commandValue["description"]);
    commands.push({
      ...observed,
      ...(path === undefined ? {} : { path }),
      ...(description === undefined ? {} : { description }),
    });
  }
  return responseWithOptionalId(value["id"], {
    type: "response",
    command: "get_commands",
    success: true,
    data: { commands },
  });
};

export const evaluatePiLoaderWitnessResponse = (
  fixture: PiRuntimeFixture,
  response: PiRpcGetCommandsResponse,
): PiLoaderWitnessEvaluation => {
  const validation = validatePiRuntimeFixture(fixture);
  const validationIssues = validation.valid ? [] : validation.issues;
  if (!response.success || response.data === undefined) {
    return {
      status: "pending-live/BLOCKED",
      observedCommands: [],
      missingCommands: [],
      validationIssues,
      pendingLiveReason: response.error ?? "pi RPC get_commands did not return a successful command list.",
    };
  }
  const requiredCommands = [
    ...SKILL_IDS.map((skillId) => commandNameForSkill(skillId)),
    ...SKILL_IDS.map((skillId) => commandNameForPrompt(skillId)),
  ];
  const observedNames = response.data.commands.map((command) => command.name);
  const missingCommands = requiredCommands.filter((command) => !observedNames.includes(command));
  if (validationIssues.length > 0 || missingCommands.length > 0) {
    return {
      status: "failed",
      observedCommands: response.data.commands,
      missingCommands,
      validationIssues,
    };
  }
  return {
    status: "proven",
    observedCommands: response.data.commands,
    missingCommands: [],
    validationIssues: [],
  };
};

export const pendingLivePiLoaderWitness = (fixture: PiRuntimeFixture, reason: string): PiLoaderWitnessEvaluation => {
  const validation = validatePiRuntimeFixture(fixture);
  return {
    status: "pending-live/BLOCKED",
    observedCommands: [],
    missingCommands: [],
    validationIssues: validation.valid ? [] : validation.issues,
    pendingLiveReason: reason,
  };
};
