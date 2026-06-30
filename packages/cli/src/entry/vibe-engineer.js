#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadVibeConfigFile, loadVibeConfigFromProjectRoot } from "@vibe-engineer/config";
import { CliClassification, CliErrorCode } from "../errors/codes.js";
import {
  parseFlagToken,
  sanitizeArgvForMetadata,
  sanitizeCommandForDisplay,
  sanitizeFlagForDisplay,
} from "../errors/sanitization.js";
import { createCommandLoader } from "../command-loader/loader.js";
import {
  artifactDescriptor,
  createEnvelope,
  envelopeBytes,
  invalidInvocationEnvelope,
  internalErrorEnvelope,
  payload,
  validateCliResultEnvelope,
  writeResultFileAtomic,
} from "../envelope/result-envelope.js";
import { cliError, diagnostic } from "../errors/codes.js";
import { configBlockedEnvelope } from "../envelope/result-envelope.js";

const GLOBAL_VALUE_FLAGS = new Set(["--result-file", "--project-root", "--config"]);
const GLOBAL_BOOLEAN_FLAGS = new Set(["--json", "--quiet", "--non-interactive"]);

function nowIso() {
  return new Date().toISOString();
}

function packageJsonPath() {
  const entryDir = dirname(fileURLToPath(import.meta.url));
  return resolve(entryDir, "../../package.json");
}

function parseGlobalArgs(argv) {
  const options = {
    json: argv.includes("--json"),
    quiet: argv.includes("--quiet"),
    nonInteractive: argv.includes("--non-interactive"),
    resultFile: null,
    projectRoot: null,
    configPath: null,
    command: null,
    commandArgs: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const parsedFlag = parseFlagToken(token);
    if (GLOBAL_BOOLEAN_FLAGS.has(token)) {
      if (token === "--json") options.json = true;
      if (token === "--quiet") options.quiet = true;
      if (token === "--non-interactive") options.nonInteractive = true;
      continue;
    }
    if (parsedFlag.isFlag && GLOBAL_VALUE_FLAGS.has(parsedFlag.flag)) {
      const value = parsedFlag.hasInlineValue ? parsedFlag.value : argv[index + 1];
      if (
        typeof value !== "string" ||
        value.length === 0 ||
        (!parsedFlag.hasInlineValue && value.startsWith("--"))
      ) {
        return {
          ok: false,
          code: CliErrorCode.MissingFlagValue,
          flag: parsedFlag.flag,
          message: `Missing value for ${parsedFlag.flag}.`,
          options,
        };
      }
      if (parsedFlag.flag === "--result-file") options.resultFile = resolve(value);
      if (parsedFlag.flag === "--project-root") options.projectRoot = resolve(value);
      if (parsedFlag.flag === "--config") options.configPath = resolve(value);
      if (!parsedFlag.hasInlineValue) index += 1;
      continue;
    }
    if (options.command === null) {
      if (parsedFlag.isFlag) {
        const displayFlag = sanitizeFlagForDisplay(token);
        return {
          ok: false,
          code: CliErrorCode.InvalidFlag,
          flag: displayFlag,
          message: `Unknown global flag: ${displayFlag}.`,
          options,
        };
      }
      options.command = token;
      continue;
    }
    options.commandArgs.push(token);
  }

  if (options.command === null) options.command = "help";
  return { ok: true, options };
}

function createInvocation({ argv, options, command, startedAt }) {
  return {
    id: randomUUID(),
    command: sanitizeCommandForDisplay(command),
    argv: sanitizeArgvForMetadata(argv),
    projectRoot: options.projectRoot,
    configPath: options.configPath,
    startedAt,
    endedAt: startedAt,
  };
}

function finalizeInvocation(invocation) {
  return { ...invocation, endedAt: nowIso() };
}

async function loadConfigIfRequested(invocation, options) {
  if (options.configPath) {
    const result = await loadVibeConfigFile(options.configPath);
    return result.ok
      ? { ok: true, result }
      : { ok: false, envelope: configBlockedEnvelope(invocation, result) };
  }
  if (options.projectRoot) {
    const result = await loadVibeConfigFromProjectRoot(options.projectRoot);
    return result.ok
      ? { ok: true, result }
      : { ok: false, envelope: configBlockedEnvelope(invocation, result) };
  }
  return { ok: true, result: null };
}

function carrierFailureEnvelope(invocation, resultFile, error) {
  const message = "Result file could not be written atomically.";
  return createEnvelope({
    invocation,
    status: "blocked",
    payload: payload("result_file_error", { resultFile }),
    diagnostics: [
      diagnostic({
        code: CliErrorCode.ResultFileWriteFailed,
        classification: CliClassification.WriteConflict,
        message,
        path: resultFile,
      }),
    ],
    errors: [
      cliError({
        code: CliErrorCode.ResultFileWriteFailed,
        classification: CliClassification.WriteConflict,
        message,
        details: {
          resultFile,
          errorCode: error && typeof error === "object" && "code" in error ? error.code : null,
        },
      }),
    ],
  });
}

function invalidEnvelopeFailure(invocation, validation) {
  return createEnvelope({
    invocation,
    status: "failure",
    payload: payload("internal_error", { accepted: false }),
    diagnostics: [
      diagnostic({
        code: CliErrorCode.InvalidEnvelope,
        classification: CliClassification.InternalError,
        message: "CLI producer generated an invalid result envelope.",
      }),
    ],
    errors: [
      cliError({
        code: CliErrorCode.InvalidEnvelope,
        classification: CliClassification.InternalError,
        message: "CLI producer generated an invalid result envelope.",
        details: { validationErrors: validation.errors },
      }),
    ],
  });
}

function firstMessage(envelope) {
  const errorMessage =
    Array.isArray(envelope.errors) &&
    envelope.errors[0] &&
    typeof envelope.errors[0].message === "string"
      ? envelope.errors[0].message
      : null;
  if (errorMessage) return errorMessage;
  const diagnosticMessage =
    Array.isArray(envelope.diagnostics) &&
    envelope.diagnostics[0] &&
    typeof envelope.diagnostics[0].message === "string"
      ? envelope.diagnostics[0].message
      : null;
  return diagnosticMessage;
}

function formatHumanEnvelope(envelope) {
  const command =
    typeof envelope.invocation?.command === "string" ? envelope.invocation.command : "command";
  const payloadKind = typeof envelope.payload?.kind === "string" ? envelope.payload.kind : "result";
  const data =
    envelope.payload &&
    typeof envelope.payload === "object" &&
    envelope.payload.data &&
    typeof envelope.payload.data === "object"
      ? envelope.payload.data
      : {};
  const lines = [];

  if (envelope.status === "success") {
    if (payloadKind === "help_result" && Array.isArray(data.commands)) {
      lines.push("vibe-engineer commands:");
      for (const item of data.commands) {
        lines.push(`  ${item.id} — ${item.description}`);
      }
      return `${lines.join("\n")}\n`;
    }
    if (payloadKind === "version_result") {
      lines.push(`${data.name ?? "vibe-engineer"} ${data.version ?? "unknown"}`);
      return `${lines.join("\n")}\n`;
    }
    if (payloadKind === "command_help_result") {
      lines.push(`vibe-engineer ${data.command ?? command}`);
      if (typeof data.description === "string") lines.push(data.description);
      if (typeof data.usage === "string") {
        lines.push("");
        lines.push("Usage:");
        lines.push(`  ${data.usage}`);
      }
      if (Array.isArray(data.options) && data.options.length > 0) {
        lines.push("");
        lines.push("Options:");
        for (const option of data.options) lines.push(`  ${option}`);
      }
      if (Array.isArray(data.examples) && data.examples.length > 0) {
        lines.push("");
        lines.push("Examples:");
        for (const example of data.examples) lines.push(`  ${example}`);
      }
      return `${lines.join("\n")}\n`;
    }
    if (payloadKind === "create_result") {
      const mode = data.mode === "import" ? "import" : "create";
      lines.push(`vibe-engineer ${mode} completed`);
      if (data.project && typeof data.project === "object")
        lines.push(`Project: ${data.project.name ?? data.project.slug ?? "unknown"}`);
      if (typeof data.targetRoot === "string") lines.push(`Target: ${data.targetRoot}`);
      if (typeof data.selectedHarness === "string") lines.push(`Harness: ${data.selectedHarness}`);
      if (typeof data.briefStatus === "string") lines.push(`Brief: ${data.briefStatus}`);
      if (mode === "create" && typeof data.targetRoot === "string") {
        lines.push("Next:");
        lines.push(`  cd ${data.targetRoot}`);
        lines.push("  pnpm install");
        lines.push("  pnpm exec vibe-engineer help --json");
        lines.push("  pnpm run quality:quick");
      }
      return `${lines.join("\n")}\n`;
    }
    lines.push(`vibe-engineer ${command} succeeded`);
    lines.push(`Result: ${payloadKind}`);
    return `${lines.join("\n")}\n`;
  }

  lines.push(`vibe-engineer ${command} ${envelope.status}`);
  const message = firstMessage(envelope);
  if (message) lines.push(message);
  if (typeof envelope.exitCode === "number") lines.push(`Exit code: ${envelope.exitCode}`);
  return `${lines.join("\n")}\n`;
}

async function emitEnvelope(envelope, options) {
  let finalEnvelope = envelope;
  if (options.resultFile) {
    finalEnvelope = {
      ...finalEnvelope,
      artifacts: [
        ...finalEnvelope.artifacts,
        artifactDescriptor({
          kind: "cli_result",
          path: options.resultFile,
          schemaVersion: finalEnvelope.schemaVersion,
          role: "report",
        }),
      ],
    };
  }

  const validation = validateCliResultEnvelope(finalEnvelope);
  if (!validation.ok) {
    finalEnvelope = invalidEnvelopeFailure(finalEnvelope.invocation, validation);
  }

  if (options.resultFile) {
    try {
      await writeResultFileAtomic(options.resultFile, finalEnvelope);
    } catch (error) {
      finalEnvelope = carrierFailureEnvelope(finalEnvelope.invocation, options.resultFile, error);
    }
  }

  const machineMode = options.json || options.resultFile;
  const output = machineMode ? envelopeBytes(finalEnvelope) : formatHumanEnvelope(finalEnvelope);
  if (!(options.quiet && options.resultFile && finalEnvelope.status !== "blocked")) {
    process.stdout.write(output);
  }
  return finalEnvelope.exitCode;
}

export async function runCli(argv = process.argv.slice(2)) {
  const startedAt = nowIso();
  const parsed = parseGlobalArgs(argv);
  const options = parsed.options;
  const command = options.command ?? "help";
  let invocation = createInvocation({ argv, options, command, startedAt });

  if (!parsed.ok) {
    invocation = finalizeInvocation(invocation);
    return emitEnvelope(
      invalidInvocationEnvelope(invocation, {
        code: parsed.code,
        classification: CliClassification.InvalidInvocation,
        message: parsed.message,
        details: { flag: parsed.flag },
      }),
      options,
    );
  }

  try {
    const config = await loadConfigIfRequested(invocation, options);
    if (!config.ok) {
      const envelope = {
        ...config.envelope,
        invocation: finalizeInvocation(config.envelope.invocation),
      };
      return emitEnvelope(envelope, options);
    }

    invocation = finalizeInvocation(invocation);
    const loader = createCommandLoader();
    const result = await loader.dispatch(command, options.commandArgs, {
      invocation,
      packageJsonPath: packageJsonPath(),
      config: config.result,
    });
    return emitEnvelope(result.envelope, options);
  } catch (error) {
    invocation = finalizeInvocation(invocation);
    if (
      error &&
      typeof error === "object" &&
      typeof error.code === "string" &&
      typeof error.classification === "string"
    ) {
      return emitEnvelope(
        invalidInvocationEnvelope(invocation, {
          code: error.code,
          classification: error.classification,
          message: error.message,
          details: { errorName: error.name ?? null },
        }),
        options,
      );
    }
    return emitEnvelope(internalErrorEnvelope(invocation), options);
  }
}

if (import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const exitCode = await runCli();
  process.exitCode = exitCode;
}
