#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createCommandLoader } from "../../../../packages/cli/src/command-loader/loader.js";
import { doctorCommand } from "../../../../packages/cli/src/commands/doctor/index.js";
import { configCommand } from "../../../../packages/cli/src/commands/config/index.js";
import { artifactDescriptor, createEnvelope, envelopeBytes, invalidInvocationEnvelope, payload, validateCliResultEnvelope, writeResultFileAtomic } from "../../../../packages/cli/src/envelope/result-envelope.js";
import { CliClassification, CliErrorCode, cliError, diagnostic } from "../../../../packages/cli/src/errors/codes.js";
import { parseFlagToken, sanitizeArgvForMetadata, sanitizeCommandForDisplay, sanitizeFlagForDisplay } from "../../../../packages/cli/src/errors/sanitization.js";

const GLOBAL_VALUE_FLAGS = new Set(["--result-file", "--project-root", "--config"]);
const GLOBAL_BOOLEAN_FLAGS = new Set(["--json", "--quiet", "--non-interactive"]);

function nowIso() {
  return new Date().toISOString();
}

function parseGlobal(argv) {
  const options = { resultFile: null, projectRoot: null, configPath: null, quiet: false, json: false, nonInteractive: false, command: null, commandArgs: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const parsed = parseFlagToken(token);
    if (options.command !== null) {
      options.commandArgs.push(token);
      continue;
    }
    if (GLOBAL_BOOLEAN_FLAGS.has(token)) {
      if (token === "--quiet") options.quiet = true;
      if (token === "--json") options.json = true;
      if (token === "--non-interactive") options.nonInteractive = true;
      continue;
    }
    if (parsed.isFlag && GLOBAL_VALUE_FLAGS.has(parsed.flag)) {
      const value = parsed.hasInlineValue ? parsed.value : argv[index + 1];
      if (typeof value !== "string" || value.length === 0 || (!parsed.hasInlineValue && value.startsWith("--"))) {
        return { ok: false, options, code: CliErrorCode.MissingFlagValue, flag: sanitizeFlagForDisplay(parsed.flag), message: `Missing value for ${sanitizeFlagForDisplay(parsed.flag)}.` };
      }
      if (parsed.flag === "--result-file") options.resultFile = resolve(value);
      if (parsed.flag === "--project-root") options.projectRoot = resolve(value);
      if (parsed.flag === "--config") options.configPath = resolve(value);
      if (!parsed.hasInlineValue) index += 1;
      continue;
    }
    if (parsed.isFlag) {
      const displayFlag = sanitizeFlagForDisplay(token);
      return { ok: false, options, code: CliErrorCode.InvalidFlag, flag: displayFlag, message: `Unknown global flag: ${displayFlag}.` };
    }
    options.command = token;
  }
  if (options.command === null) options.command = "doctor";
  return { ok: true, options };
}

function invocationFor(argv, options, startedAt) {
  return {
    id: randomUUID(),
    command: sanitizeCommandForDisplay(options.command),
    argv: sanitizeArgvForMetadata(argv),
    projectRoot: options.projectRoot,
    configPath: options.configPath,
    startedAt,
    endedAt: new Date().toISOString()
  };
}

function resultFileFailure(invocation, resultFile, error) {
  const message = "Result file could not be written atomically.";
  return createEnvelope({
    invocation,
    status: "blocked",
    payload: payload("result_file_error", { resultFile }),
    diagnostics: [diagnostic({ code: CliErrorCode.ResultFileWriteFailed, classification: CliClassification.WriteConflict, message, path: resultFile })],
    errors: [cliError({ code: CliErrorCode.ResultFileWriteFailed, classification: CliClassification.WriteConflict, message, details: { resultFile, errorCode: error?.code ?? null } })]
  });
}

function invalidProducerEnvelope(invocation, validation) {
  const message = "I-02B lane producer generated an invalid CLI result envelope.";
  return createEnvelope({
    invocation,
    status: "failure",
    payload: payload("internal_error", { accepted: false }),
    diagnostics: [diagnostic({ code: CliErrorCode.InvalidEnvelope, classification: CliClassification.InternalError, message })],
    errors: [cliError({ code: CliErrorCode.InvalidEnvelope, classification: CliClassification.InternalError, message, details: { validationErrors: validation.errors } })]
  });
}

async function emit(envelope, options) {
  let finalEnvelope = envelope;
  if (options.resultFile) {
    finalEnvelope = {
      ...finalEnvelope,
      artifacts: [...finalEnvelope.artifacts, artifactDescriptor({ kind: "cli_result", path: options.resultFile, schemaVersion: finalEnvelope.schemaVersion, role: "report" })]
    };
  }
  const validation = validateCliResultEnvelope(finalEnvelope);
  if (!validation.ok) finalEnvelope = invalidProducerEnvelope(finalEnvelope.invocation, validation);
  if (options.resultFile) {
    try {
      await writeResultFileAtomic(options.resultFile, finalEnvelope);
    } catch (error) {
      finalEnvelope = resultFileFailure(finalEnvelope.invocation, options.resultFile, error);
    }
  }
  if (!(options.quiet && options.resultFile && finalEnvelope.status !== "blocked")) {
    process.stdout.write(envelopeBytes(finalEnvelope));
  }
  return finalEnvelope.exitCode;
}

async function main() {
  const argv = process.argv.slice(2);
  const startedAt = nowIso();
  const parsed = parseGlobal(argv);
  const options = parsed.options;
  const invocation = invocationFor(argv, options, startedAt);
  if (!parsed.ok) {
    return emit(invalidInvocationEnvelope(invocation, {
      code: parsed.code,
      classification: CliClassification.InvalidInvocation,
      message: parsed.message,
      details: { flag: parsed.flag }
    }), options);
  }
  const loader = createCommandLoader([doctorCommand, configCommand]);
  const result = await loader.dispatch(options.command, options.commandArgs, {
    invocation,
    packageJsonPath: resolve("packages/cli/package.json"),
    config: null
  });
  return emit(result.envelope, options);
}

process.exitCode = await main();
