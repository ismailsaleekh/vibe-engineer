import fs from "node:fs/promises";
import path from "node:path";
import { executeSchematic } from "@vibe-engineer/schematics";
import {
  createEnvelope,
  payload,
  validateCliResultEnvelope,
  writeResultFileAtomic,
  artifactDescriptor,
} from "../../envelope/result-envelope.js";
import { cliError, diagnostic, CliClassification, CliErrorCode } from "../../errors/codes.js";
import { validateSchematicManifestWithArtifacts } from "./artifacts-adapter.js";

function parseArgs(args) {
  const options = {
    mode: null,
    manifest: null,
    inputFile: null,
    targetRoot: null,
    resultFile: null,
    planFile: null,
    json: false,
    nonInteractive: false,
  };
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (["plan", "dry-run", "apply"].includes(token) && options.mode === null) {
      options.mode = token;
      continue;
    }
    if (
      ["--manifest", "--input-file", "--target-root", "--result-file", "--plan-file"].includes(
        token,
      )
    ) {
      const value = args[index + 1];
      if (typeof value !== "string" || value.startsWith("--"))
        throw Object.assign(new Error(`Missing value for ${token}.`), {
          code: "invalid_invocation",
          details: { flag: token },
        });
      if (token === "--manifest") options.manifest = value;
      if (token === "--input-file") options.inputFile = value;
      if (token === "--target-root") options.targetRoot = value;
      if (token === "--result-file") options.resultFile = value;
      if (token === "--plan-file") options.planFile = value;
      index += 1;
      continue;
    }
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--non-interactive") {
      options.nonInteractive = true;
      continue;
    }
    positionals.push(token);
  }
  if (positionals.length > 0)
    throw Object.assign(new Error("Unexpected schematic command positional arguments."), {
      code: "invalid_invocation",
      details: { positionals },
    });
  for (const key of ["manifest", "inputFile", "targetRoot"]) {
    if (!options[key])
      throw Object.assign(new Error(`Missing required schematic option ${key}.`), {
        code: "invalid_invocation",
        details: { option: key },
      });
  }
  return { ...options, mode: options.mode ?? "dry-run" };
}

function extractPlanData(planFileContent) {
  const parsed = JSON.parse(planFileContent);
  if (parsed?.payload?.kind === "schematic_result" && parsed.payload.data?.plan_fingerprint)
    return parsed.payload.data;
  return parsed;
}

function statusMapping(engineStatus) {
  if (engineStatus === "ok") return { cliStatus: "success", classification: null, code: null };
  if (engineStatus === "invalid_input")
    return {
      cliStatus: "blocked",
      classification: CliClassification.InvalidInput,
      code: CliErrorCode.InvalidInvocation,
    };
  if (engineStatus === "conflicts")
    return {
      cliStatus: "blocked",
      classification: CliClassification.WriteConflict,
      code: CliErrorCode.ResultFileWriteFailed,
    };
  return {
    cliStatus: "blocked",
    classification: CliClassification.MissingPrerequisite,
    code: CliErrorCode.InvalidInvocation,
  };
}

function envelopeForEngine(invocation, engineResult, resultFile = null) {
  const mapped = statusMapping(engineResult.status);
  const diagnostics = [];
  const errors = [];
  if (mapped.cliStatus !== "success") {
    const message = `Schematic command did not complete successfully: ${engineResult.status}.`;
    diagnostics.push(
      diagnostic({ code: mapped.code, classification: mapped.classification, message }),
    );
    errors.push(
      cliError({
        code: mapped.code,
        classification: mapped.classification,
        message,
        details: {
          engineStatus: engineResult.status,
          conflicts: engineResult.conflicts,
          diagnostics: engineResult.diagnostics ?? [],
        },
      }),
    );
  }
  const artifacts = [];
  if (resultFile)
    artifacts.push(
      artifactDescriptor({
        kind: "cli_result",
        path: path.resolve(resultFile),
        schemaVersion: "vibe-engineer.cli.result.v1",
        role: "report",
      }),
    );
  return createEnvelope({
    invocation,
    status: mapped.cliStatus,
    payload: payload("schematic_result", engineResult),
    diagnostics,
    errors,
    artifacts,
  });
}

export const schematicCommand = Object.freeze({
  id: "schematic",
  visibility: "skill/agent primitive",
  description: "Plan, dry-run, or apply a manifest-driven schematic.",
  async run({ invocation, args }) {
    let options;
    try {
      options = parseArgs(args);
    } catch (error) {
      const message = error.message;
      return {
        envelope: createEnvelope({
          invocation,
          status: "blocked",
          payload: payload("schematic_result", { accepted: false }),
          diagnostics: [
            diagnostic({
              code: CliErrorCode.InvalidInvocation,
              classification: CliClassification.InvalidInvocation,
              message,
            }),
          ],
          errors: [
            cliError({
              code: CliErrorCode.InvalidInvocation,
              classification: CliClassification.InvalidInvocation,
              message,
              details: error.details ?? {},
            }),
          ],
        }),
      };
    }
    let input;
    try {
      input = JSON.parse(await fs.readFile(path.resolve(options.inputFile), "utf8"));
    } catch (error) {
      const message = `Could not read schematic input JSON: ${error.message}`;
      return {
        envelope: createEnvelope({
          invocation,
          status: "blocked",
          payload: payload("schematic_result", { accepted: false }),
          diagnostics: [
            diagnostic({
              code: CliErrorCode.InvalidInvocation,
              classification: CliClassification.InvalidInput,
              message,
            }),
          ],
          errors: [
            cliError({
              code: CliErrorCode.InvalidInvocation,
              classification: CliClassification.InvalidInput,
              message,
            }),
          ],
        }),
      };
    }
    let expectedPlan = null;
    if (options.planFile) {
      try {
        expectedPlan = extractPlanData(await fs.readFile(path.resolve(options.planFile), "utf8"));
      } catch (error) {
        const message = `Could not read schematic dry-run plan file: ${error.message}`;
        return {
          envelope: createEnvelope({
            invocation,
            status: "blocked",
            payload: payload("schematic_result", { accepted: false }),
            diagnostics: [
              diagnostic({
                code: CliErrorCode.InvalidInvocation,
                classification: CliClassification.InvalidInput,
                message,
              }),
            ],
            errors: [
              cliError({
                code: CliErrorCode.InvalidInvocation,
                classification: CliClassification.InvalidInput,
                message,
              }),
            ],
          }),
        };
      }
    }
    const engineResult = await executeSchematic({
      manifestPath: path.resolve(options.manifest),
      input,
      targetRoot: path.resolve(options.targetRoot),
      mode: options.mode,
      deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts },
      expectedPlan,
    });
    const envelope = envelopeForEngine(invocation, engineResult, options.resultFile);
    const validation = validateCliResultEnvelope(envelope);
    if (!validation.ok)
      throw new Error(
        `schematic command produced invalid envelope: ${validation.errors.join("; ")}`,
      );
    if (options.resultFile) await writeResultFileAtomic(path.resolve(options.resultFile), envelope);
    return { envelope };
  },
});

export default schematicCommand;
