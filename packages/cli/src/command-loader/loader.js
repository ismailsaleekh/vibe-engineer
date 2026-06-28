import { readFile } from "node:fs/promises";
import { CliClassification, CliErrorCode } from "../errors/codes.js";
import {
  sanitizeCommandForDisplay,
  sanitizeFlagForDisplay,
  sanitizeUserValueForDisplay,
} from "../errors/sanitization.js";
import {
  createEnvelope,
  foundationFailureEnvelope,
  invalidInvocationEnvelope,
  partialEnvelope,
  payload,
} from "../envelope/result-envelope.js";
import { createCommand } from "../commands/create/index.ts";
import { importCommand } from "../commands/import/index.ts";
import { doctorCommand } from "../commands/doctor/index.js";
import { configCommand } from "../commands/config/index.js";
import { verifyCommand } from "../commands/verify/index.ts";
import { securityCommand } from "../commands/security/index.ts";
import { schematicCommand } from "../commands/schematic/index.js";

// Deferred commands: declared in the v0.1 surface but not yet implemented.
// These route to a typed UnsupportedOperation envelope (fail-closed), never a no-op.
const LATER_COMMANDS = new Set(["context", "registry", "update", "init"]);

// The default public command surface for the shipped `vibe-engineer` binary
// is defined below FOUNDATION_COMMANDS (it composes them) — see DEFAULT_COMMANDS.

function commandResult(envelope) {
  return { envelope };
}

function parseFlagValue(args, index, flag) {
  const value = args[index + 1];
  if (typeof value !== "string" || value.startsWith("--")) {
    return { ok: false, error: `Missing value for ${flag}.` };
  }
  return { ok: true, value, nextIndex: index + 1 };
}

function rejectUnknownCommandFlag(invocation, flag) {
  const displayFlag = sanitizeFlagForDisplay(flag);
  return commandResult(
    invalidInvocationEnvelope(invocation, {
      code: CliErrorCode.InvalidFlag,
      classification: CliClassification.InvalidInvocation,
      message: `Unsupported flag for this command: ${displayFlag}.`,
      details: { flag: displayFlag },
    }),
  );
}

function ensureNoPositionals(invocation, positionals) {
  if (positionals.length === 0) return null;
  return commandResult(
    invalidInvocationEnvelope(invocation, {
      code: CliErrorCode.InvalidInvocation,
      classification: CliClassification.InvalidInvocation,
      message: "Unexpected positional arguments for command.",
      details: { positionalCount: positionals.length },
    }),
  );
}

function parseFoundationOptions(invocation, args) {
  const options = { status: "success" };
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--status") {
      const parsed = parseFlagValue(args, index, token);
      if (!parsed.ok) {
        return {
          error: invalidInvocationEnvelope(invocation, {
            code: CliErrorCode.MissingFlagValue,
            classification: CliClassification.InvalidInvocation,
            message: parsed.error,
            details: { flag: token },
          }),
        };
      }
      options.status = parsed.value;
      index = parsed.nextIndex;
    } else if (token === "--simulate-failure") {
      options.status = "failure";
    } else if (token === "--simulate-partial") {
      options.status = "partial";
    } else if (token.startsWith("--")) {
      return { error: rejectUnknownCommandFlag(invocation, token).envelope };
    } else {
      positionals.push(token);
    }
  }
  const positionalError = ensureNoPositionals(invocation, positionals);
  if (positionalError) return { error: positionalError.envelope };
  if (!["success", "failure", "partial"].includes(options.status)) {
    return {
      error: invalidInvocationEnvelope(invocation, {
        code: CliErrorCode.InvalidInvocation,
        classification: CliClassification.InvalidInvocation,
        message: "Invalid foundation status request.",
        details: { requestedStatus: sanitizeUserValueForDisplay() },
      }),
    };
  }
  return { options };
}

async function helpCommand({ invocation, args, context }) {
  for (const token of args) {
    if (token.startsWith("--")) return rejectUnknownCommandFlag(invocation, token);
  }
  const positionalError = ensureNoPositionals(
    invocation,
    args.filter((token) => !token.startsWith("--")),
  );
  if (positionalError) return positionalError;
  return commandResult(
    createEnvelope({
      invocation,
      status: "success",
      payload: payload("help_result", {
        commands: context.loader
          .listCommands()
          .filter((command) => command.visibility !== "internal")
          .map((command) => ({
            id: command.id,
            visibility: command.visibility,
            description: command.description,
          })),
        machineOnly: true,
      }),
    }),
  );
}

async function versionCommand({ invocation, args, context }) {
  for (const token of args) {
    if (token.startsWith("--")) return rejectUnknownCommandFlag(invocation, token);
  }
  const positionalError = ensureNoPositionals(
    invocation,
    args.filter((token) => !token.startsWith("--")),
  );
  if (positionalError) return positionalError;
  const pkg = JSON.parse(await readFile(context.packageJsonPath, "utf8"));
  return commandResult(
    createEnvelope({
      invocation,
      status: "success",
      payload: payload("version_result", {
        name: pkg.name,
        version: pkg.version,
      }),
    }),
  );
}

async function foundationCommand({ invocation, args }) {
  const parsed = parseFoundationOptions(invocation, args);
  if (parsed.error) return commandResult(parsed.error);
  if (parsed.options.status === "failure")
    return commandResult(foundationFailureEnvelope(invocation));
  if (parsed.options.status === "partial") return commandResult(partialEnvelope(invocation));
  return commandResult(
    createEnvelope({
      invocation,
      status: "success",
      payload: payload("foundation_result", {
        ok: true,
        commandLoaderBoundary: "i-02a-foundation",
      }),
    }),
  );
}

const FOUNDATION_COMMANDS = Object.freeze([
  Object.freeze({
    id: "help",
    visibility: "foundation",
    description: "List the v0.1 deterministic CLI primitives.",
    run: helpCommand,
  }),
  Object.freeze({
    id: "version",
    visibility: "foundation",
    description: "Report package version.",
    run: versionCommand,
  }),
  Object.freeze({
    id: "foundation",
    visibility: "internal",
    description: "I-02A internal envelope/loader witness command.",
    run: foundationCommand,
  }),
]);

// The default public command surface for the shipped `vibe-engineer` binary:
// the I-02A foundation commands plus the 7 real v0.1 commands.
// `build`/`ship` are SKILL commands (harness-native, never CLI) and are deliberately
// NOT registered — they route as Unknown command (InvalidInvocation), not Unsupported.
const DEFAULT_COMMANDS = Object.freeze([
  ...FOUNDATION_COMMANDS,
  createCommand,
  importCommand,
  doctorCommand,
  configCommand,
  verifyCommand,
  securityCommand,
  schematicCommand,
]);

function validateCommandMetadata(command) {
  return (
    command &&
    typeof command.id === "string" &&
    command.id.length > 0 &&
    typeof command.visibility === "string" &&
    typeof command.description === "string" &&
    typeof command.run === "function"
  );
}

export class CommandLoaderDefinitionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CommandLoaderDefinitionError";
    this.code = code;
    this.classification = CliClassification.InvalidInvocation;
  }
}

export class CommandLoader {
  constructor(commands = DEFAULT_COMMANDS) {
    this.commands = new Map();
    for (const command of commands) {
      if (!validateCommandMetadata(command)) {
        throw new CommandLoaderDefinitionError(
          CliErrorCode.MalformedCommandMetadata,
          "Command metadata is malformed.",
        );
      }
      if (this.commands.has(command.id)) {
        throw new CommandLoaderDefinitionError(
          CliErrorCode.DuplicateCommandId,
          "Duplicate command id is not allowed.",
        );
      }
      this.commands.set(command.id, command);
    }
  }

  listCommands() {
    return [...this.commands.values()].map(({ id, visibility, description }) => ({
      id,
      visibility,
      description,
    }));
  }

  hasCommand(id) {
    return this.commands.has(id);
  }

  async dispatch(commandId, args, context) {
    if (!this.commands.has(commandId)) {
      const unsupported = LATER_COMMANDS.has(commandId);
      return commandResult(
        invalidInvocationEnvelope(context.invocation, {
          code: unsupported ? CliErrorCode.UnsupportedOperation : CliErrorCode.InvalidInvocation,
          classification: unsupported
            ? CliClassification.UnsupportedOperation
            : CliClassification.InvalidInvocation,
          message: unsupported
            ? "Command family is deferred in the v0.1 CLI surface."
            : "Unknown command.",
          details: { commandId: sanitizeCommandForDisplay(commandId) },
        }),
      );
    }
    return this.commands
      .get(commandId)
      .run({ invocation: context.invocation, args, context: { ...context, loader: this } });
  }
}

export function createCommandLoader(commands = DEFAULT_COMMANDS) {
  return new CommandLoader(commands);
}
