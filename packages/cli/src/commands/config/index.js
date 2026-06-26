import { loadVibeConfigFile, loadVibeConfigFromProjectRoot, parseVibeConfig, VIBE_CONFIG_SCHEMA } from "@vibe-engineer/config";
import { createEnvelope, configBlockedEnvelope, invalidInvocationEnvelope, payload } from "../../envelope/result-envelope.js";
import { CliClassification, CliErrorCode } from "../../errors/codes.js";
import { isSecretFlag, parseFlagToken, sanitizeFlagForDisplay, sanitizeUserValueForDisplay } from "../../errors/sanitization.js";

const SOURCE_VALUE_FLAGS = new Set(["--project-root", "--config"]);
const ALLOWED_SUBCOMMANDS = new Set(["inspect", "validate"]);
const REDACTED = "<redacted>";

function commandResult(envelope) {
  return { envelope };
}

function invalid(invocation, { code = CliErrorCode.InvalidInvocation, message, details = {} }) {
  return commandResult(invalidInvocationEnvelope(invocation, {
    code,
    classification: CliClassification.InvalidInvocation,
    message,
    details
  }));
}

function missingFlagValue(invocation, flag) {
  const displayFlag = sanitizeFlagForDisplay(flag);
  return invalid(invocation, {
    code: CliErrorCode.MissingFlagValue,
    message: `Missing value for ${displayFlag}.`,
    details: { flag: displayFlag }
  });
}

function unknownFlag(invocation, token) {
  const displayFlag = sanitizeFlagForDisplay(token);
  return invalid(invocation, {
    code: CliErrorCode.InvalidFlag,
    message: `Unsupported config flag: ${displayFlag}.`,
    details: { flag: displayFlag }
  });
}

function parseSourceOptions(invocation, args) {
  const options = { projectRoot: null, configPath: null };
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    const parsed = parseFlagToken(token);
    if (parsed.isFlag) {
      if (!SOURCE_VALUE_FLAGS.has(parsed.flag)) return { ok: false, result: unknownFlag(invocation, token).envelope };
      const value = parsed.hasInlineValue ? parsed.value : args[index + 1];
      if (typeof value !== "string" || value.length === 0 || (!parsed.hasInlineValue && value.startsWith("--"))) {
        return { ok: false, result: missingFlagValue(invocation, parsed.flag).envelope };
      }
      if (parsed.flag === "--project-root") options.projectRoot = value;
      if (parsed.flag === "--config") options.configPath = value;
      if (!parsed.hasInlineValue) index += 1;
      continue;
    }
    positionals.push(token);
  }
  if (positionals.length > 0) {
    return { ok: false, result: invalid(invocation, {
      message: "Unexpected positional arguments for config subcommand.",
      details: { positionalCount: positionals.length }
    }).envelope };
  }
  return { ok: true, options };
}

function sourceFromInvocation(invocation, options) {
  return {
    configPath: options.configPath ?? invocation.configPath ?? null,
    projectRoot: options.projectRoot ?? invocation.projectRoot ?? null
  };
}

async function loadConfig(invocation, options, context) {
  const source = sourceFromInvocation(invocation, options);
  if (!source.configPath && !source.projectRoot && context.config?.ok === true) {
    return { ok: true, result: context.config, source: { configPath: context.config.configPath ?? null, projectRoot: context.config.projectRoot ?? null } };
  }
  if (source.configPath) {
    const result = await loadVibeConfigFile(source.configPath);
    return { ok: result.ok, result, source: { configPath: result.configPath ?? source.configPath, projectRoot: result.projectRoot ?? source.projectRoot } };
  }
  const projectRoot = source.projectRoot ?? process.cwd();
  const result = await loadVibeConfigFromProjectRoot(projectRoot);
  return { ok: result.ok, result, source: { configPath: result.configPath ?? null, projectRoot: result.projectRoot ?? projectRoot } };
}

function isSecretKey(key) {
  return isSecretFlag(`--${String(key)}`);
}

function redactConfigValue(value, key = "") {
  if (isSecretKey(key)) return REDACTED;
  if (Array.isArray(value)) return value.map((item) => redactConfigValue(item));
  if (value && typeof value === "object") {
    const output = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      output[childKey] = redactConfigValue(childValue, childKey);
    }
    return output;
  }
  return value;
}

function provenanceSummary(provenance) {
  const output = {};
  for (const [path, entry] of Object.entries(provenance ?? {})) {
    output[path] = { source: entry?.source === "file" ? "file" : "default" };
  }
  return output;
}

function inspectEnvelope(invocation, loaded) {
  return createEnvelope({
    invocation,
    status: "success",
    payload: payload("config_inspect_result", {
      ok: true,
      schema: {
        id: loaded.result.schemaId ?? VIBE_CONFIG_SCHEMA.id,
        version: loaded.result.schemaVersion ?? VIBE_CONFIG_SCHEMA.version,
        configFileName: VIBE_CONFIG_SCHEMA.configFileName
      },
      source: loaded.source,
      config: redactConfigValue(loaded.result.config),
      provenance: provenanceSummary(loaded.result.provenance)
    })
  });
}

function validateEnvelope(invocation, loaded) {
  return createEnvelope({
    invocation,
    status: "success",
    payload: payload("config_validation_result", {
      ok: true,
      valid: true,
      schema: {
        id: loaded.result.schemaId ?? VIBE_CONFIG_SCHEMA.id,
        version: loaded.result.schemaVersion ?? VIBE_CONFIG_SCHEMA.version,
        requiredTopLevelKeys: [...VIBE_CONFIG_SCHEMA.requiredTopLevelKeys],
        supportedAgenticHarnesses: [...VIBE_CONFIG_SCHEMA.supportedAgenticHarnesses]
      },
      source: loaded.source,
      provenance: provenanceSummary(loaded.result.provenance)
    })
  });
}

async function runSubcommand(subcommand, invocation, args, context) {
  const parsed = parseSourceOptions(invocation, args);
  if (!parsed.ok) return commandResult(parsed.result);
  const loaded = await loadConfig(invocation, parsed.options, context);
  if (!loaded.ok) return commandResult(configBlockedEnvelope(invocation, loaded.result));
  if (subcommand === "inspect") return commandResult(inspectEnvelope(invocation, loaded));
  return commandResult(validateEnvelope(invocation, loaded));
}

async function run({ invocation, args, context }) {
  const [subcommand, ...rest] = args;
  if (typeof subcommand !== "string" || !ALLOWED_SUBCOMMANDS.has(subcommand)) {
    return invalid(invocation, {
      message: "Unknown or missing config subcommand.",
      details: { subcommand: sanitizeUserValueForDisplay({ secret: false }) }
    });
  }
  return runSubcommand(subcommand, invocation, rest, context);
}

export const configCommand = Object.freeze({
  id: "config",
  visibility: "debug/diagnostic",
  description: "Inspect or validate vibe-engineer configuration through the public config provider.",
  run
});

export { parseVibeConfig, VIBE_CONFIG_SCHEMA };
export default configCommand;
