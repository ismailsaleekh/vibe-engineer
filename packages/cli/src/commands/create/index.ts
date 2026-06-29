// vibe-engineer create — selected-pi starter creation with DL-17 bootstrap context.
// Mirrors the accepted verify/index.ts + security/index.ts Node-24-native-.ts-load precedent.
import { existsSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { stdin as promptInput, stdout as promptOutput } from "node:process";
import { createInterface } from "node:readline/promises";
import { basename, dirname, resolve } from "node:path";
import {
  artifactDescriptor,
  createEnvelope,
  invalidInvocationEnvelope,
  payload,
  validateCliResultEnvelope,
  writeResultFileAtomic,
} from "../../envelope/result-envelope.js";
import { CliClassification, CliErrorCode, cliError, diagnostic } from "../../errors/codes.js";
import { parseFlagToken, sanitizeFlagForDisplay } from "../../errors/sanitization.js";
import {
  buildBootstrap,
  gateSelectedHarness,
  isSecretLikeBrief,
  MAX_BRIEF_BYTES,
  normalizeSlug,
  resolveSelectedPiManifest,
  SELECTED_PI_HARNESS,
  writeGeneratedArtifacts,
} from "./selected-harness.ts";
import {
  isPiHarnessAssetError,
  writePiHarnessAssets,
} from "./pi-harness-assets.ts";
import {
  isStarterTemplateError,
  materializeStarterTree,
} from "./starter-template.ts";

type UnknownRecord = Record<string, unknown>;

type CommandInvocation = {
  id: string;
  command: string;
  argv: string[];
  projectRoot: string | null;
  configPath: string | null;
  startedAt: string;
  endedAt: string;
};

type CommandContext = {
  invocation: CommandInvocation;
  args: string[];
  context: UnknownRecord;
};

type CreateOptions = {
  targetRoot: string;
  projectName: string;
  agenticHarness: string;
  brief: string | null;
  resultFile?: string;
  json: boolean;
  nonInteractive: boolean;
};

type ParsedCreateOptions = {
  targetRoot: string | null;
  projectName: string | null;
  agenticHarness: string | null;
  brief: string | null;
  resultFile?: string;
  json: boolean;
  nonInteractive: boolean;
};

type CompleteOptionsResult = { ok: true; options: CreateOptions } | { ok: false; envelope: UnknownRecord };
type ParseResult = { ok: true; options: ParsedCreateOptions } | { ok: false; envelope: UnknownRecord };

type EnvelopeFactoryInput = {
  invocation: CommandInvocation;
  status: string;
  payload: UnknownRecord;
  diagnostics?: UnknownRecord[];
  artifacts?: UnknownRecord[];
  errors?: UnknownRecord[];
  exitCode?: number | null;
};

type InvalidInvocationInput = { code?: string; classification?: string; message: string; details?: UnknownRecord };

function makeArtifactDescriptor(input: { kind: string; path: string; schemaVersion?: string | null; role: string; sha256?: string | null }): UnknownRecord { return artifactDescriptor(input); }
function makeCreateEnvelope(input: EnvelopeFactoryInput): UnknownRecord { return createEnvelope(input); }
function makeInvalidInvocationEnvelope(invocation: CommandInvocation, input: InvalidInvocationInput): UnknownRecord { return invalidInvocationEnvelope(invocation, input); }
function makePayload(kind: string, data?: UnknownRecord, schemaVersion?: string): UnknownRecord { return payload(kind, data, schemaVersion); }
function makeValidateCliResultEnvelope(envelope: UnknownRecord): { ok: true; envelope: UnknownRecord } | { ok: false; errors: string[] } { return validateCliResultEnvelope(envelope); }
function makeWriteResultFileAtomic(resultFile: string, envelope: UnknownRecord): Promise<void> { return writeResultFileAtomic(resultFile, envelope); }
function makeCliError(input: { code: string; classification: string; retryable?: boolean; blocking?: boolean; message: string; details?: UnknownRecord }): UnknownRecord { return cliError(input); }
function makeDiagnostic(input: { severity?: string; code: string; classification: string; message: string; path?: string | null; span?: unknown; hint?: string | null }): UnknownRecord { return diagnostic(input); }

const VALUE_FLAGS = new Set(["--project-name", "--agentic-harness", "--brief", "--project-brief", "--target-root", "--result-file", "--project-root"]);
const BOOLEAN_FLAGS = new Set(["--json", "--non-interactive"]);
const BRIEF_FLAGS = new Set(["--brief", "--project-brief"]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function commandResult(envelope: UnknownRecord): { envelope: UnknownRecord } {
  return { envelope };
}

function invalid(invocation: CommandInvocation, options: { code?: string; classification?: string; message: string; details?: UnknownRecord }): { envelope: UnknownRecord } {
  return commandResult(makeInvalidInvocationEnvelope(invocation, {
    code: options.code ?? CliErrorCode.InvalidInvocation,
    classification: options.classification ?? CliClassification.InvalidInvocation,
    message: options.message,
    details: options.details ?? {},
  }));
}

function unknownFlag(invocation: CommandInvocation, token: string): { envelope: UnknownRecord } {
  const displayFlag = sanitizeFlagForDisplay(token);
  return invalid(invocation, {
    code: CliErrorCode.InvalidFlag,
    message: `Unsupported create flag: ${displayFlag}. Create accepts only project naming, --agentic-harness, --brief, and global envelope flags.`,
    details: { flag: displayFlag, acceptedValueFlags: [...VALUE_FLAGS], acceptedBooleanFlags: [...BOOLEAN_FLAGS] },
  });
}

function missingFlagValue(invocation: CommandInvocation, flag: string): { envelope: UnknownRecord } {
  return invalid(invocation, {
    code: CliErrorCode.MissingFlagValue,
    message: `Missing value for ${sanitizeFlagForDisplay(flag)}.`,
    details: { flag: sanitizeFlagForDisplay(flag) },
  });
}

function canonicalValueFlag(flag: string): string {
  return BRIEF_FLAGS.has(flag) ? "--brief" : flag;
}

function parseCreateOptions(invocation: CommandInvocation, args: string[]): ParseResult {
  const values = new Map<string, string>();
  const booleans = new Set<string>();
  const seenFlags = new Set<string>();
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] ?? "";
    const parsed = parseFlagToken(token);
    if (!parsed.isFlag) {
      positionals.push(token);
      continue;
    }
    const flag = typeof parsed.flag === "string" ? parsed.flag : "";
    if (BOOLEAN_FLAGS.has(flag)) {
      if (seenFlags.has(flag)) return { ok: false, envelope: invalid(invocation, { message: "Duplicate create flag is not allowed.", details: { flag: sanitizeFlagForDisplay(flag) } }).envelope };
      seenFlags.add(flag);
      booleans.add(flag);
      continue;
    }
    if (!VALUE_FLAGS.has(flag)) return { ok: false, envelope: unknownFlag(invocation, token).envelope };
    const canonicalFlag = canonicalValueFlag(flag);
    if (seenFlags.has(canonicalFlag)) return { ok: false, envelope: invalid(invocation, { message: "Duplicate create flag is not allowed.", details: { flag: sanitizeFlagForDisplay(flag) } }).envelope };
    seenFlags.add(canonicalFlag);
    const value = parsed.hasInlineValue ? parsed.value : args[index + 1];
    if (typeof value !== "string" || value.length === 0 || (!parsed.hasInlineValue && value.startsWith("--"))) {
      return { ok: false, envelope: missingFlagValue(invocation, flag).envelope };
    }
    values.set(canonicalFlag, value);
    if (!parsed.hasInlineValue) index += 1;
  }

  if (positionals.length > 1) {
    return { ok: false, envelope: invalid(invocation, { message: "Unexpected positional arguments for create.", details: { positionalCount: positionals.length } }).envelope };
  }
  if (positionals.length === 1) {
    if (values.has("--target-root")) {
      return { ok: false, envelope: invalid(invocation, { message: "Duplicate create target is not allowed.", details: { flag: "--target-root", positionalCount: 1 } }).envelope };
    }
    values.set("--target-root", positionals[0] ?? "");
  }

  const targetRootRaw = values.get("--target-root") ?? null;
  const targetRoot = targetRootRaw === null ? null : resolve(targetRootRaw);

  const projectNameRaw = values.get("--project-name");
  const projectName = (typeof projectNameRaw === "string" && projectNameRaw.trim().length > 0) ? projectNameRaw.trim() : null;

  const agenticHarnessRaw = values.get("--agentic-harness");
  const agenticHarness = (typeof agenticHarnessRaw === "string" && agenticHarnessRaw.trim().length > 0) ? agenticHarnessRaw.trim() : null;
  const brief = values.get("--brief") ?? null;

  const resultFileRaw = values.get("--result-file");
  const resultFile = resultFileRaw === undefined ? undefined : resolve(resultFileRaw);

  return {
    ok: true,
    options: {
      targetRoot,
      projectName,
      agenticHarness,
      brief,
      ...(resultFile === undefined ? {} : { resultFile }),
      json: booleans.has("--json"),
      nonInteractive: booleans.has("--non-interactive"),
    },
  };
}

function producer(invocation: CommandInvocation): UnknownRecord {
  return { kind: "agent", id: "i-15a-create-command", name: "@vibe-engineer/cli", version: "1.0.0", runId: invocation.id };
}

function generatedAt(invocation: CommandInvocation): string {
  return typeof invocation.startedAt === "string" && invocation.startedAt.length > 0 ? invocation.startedAt : new Date().toISOString();
}

async function completeCreateOptions(invocation: CommandInvocation, parsed: ParsedCreateOptions, mode: "create" | "import"): Promise<CompleteOptionsResult> {
  let targetRoot = parsed.targetRoot;
  let projectName = parsed.projectName;
  let agenticHarness = parsed.agenticHarness;
  let brief = parsed.brief;
  const canPrompt = !parsed.nonInteractive && Boolean(promptInput.isTTY) && Boolean(promptOutput.isTTY);

  if (targetRoot === null && canPrompt) {
    const fallbackTarget = mode === "import" ? "." : "./my-vibe-project";
    const rl = createInterface({ input: promptInput, output: promptOutput });
    try {
      const targetAnswer = (await rl.question(`${mode === "import" ? "Existing project root" : "Target directory"} [${fallbackTarget}]: `)).trim();
      targetRoot = resolve(targetAnswer.length > 0 ? targetAnswer : fallbackTarget);
      const defaultName = basename(targetRoot) || "project";
      const nameAnswer = (await rl.question(`Project name [${defaultName}]: `)).trim();
      projectName = nameAnswer.length > 0 ? nameAnswer : defaultName;
      const harnessAnswer = (await rl.question(`Agentic harness [${SELECTED_PI_HARNESS}]: `)).trim();
      agenticHarness = harnessAnswer.length > 0 ? harnessAnswer : SELECTED_PI_HARNESS;
      const briefAnswer = (await rl.question("Project brief (optional): ")).trim();
      brief = briefAnswer.length > 0 ? briefAnswer : null;
    } finally {
      rl.close();
    }
  }

  if (targetRoot === null) {
    return { ok: false, envelope: invalid(invocation, { code: CliErrorCode.MissingFlagValue, message: "Missing required create flag.", details: { flag: "--target-root" } }).envelope };
  }

  if (canPrompt && parsed.targetRoot !== null) {
    const rl = createInterface({ input: promptInput, output: promptOutput });
    try {
      const defaultName = basename(targetRoot) || "project";
      if (projectName === null) {
        const nameAnswer = (await rl.question(`Project name [${defaultName}]: `)).trim();
        projectName = nameAnswer.length > 0 ? nameAnswer : defaultName;
      }
      if (agenticHarness === null) {
        const harnessAnswer = (await rl.question(`Agentic harness [${SELECTED_PI_HARNESS}]: `)).trim();
        agenticHarness = harnessAnswer.length > 0 ? harnessAnswer : SELECTED_PI_HARNESS;
      }
      if (brief === null) {
        const briefAnswer = (await rl.question("Project brief (optional): ")).trim();
        brief = briefAnswer.length > 0 ? briefAnswer : null;
      }
    } finally {
      rl.close();
    }
  }

  return {
    ok: true,
    options: {
      targetRoot,
      projectName: projectName ?? (basename(targetRoot) || "project"),
      agenticHarness: agenticHarness ?? SELECTED_PI_HARNESS,
      brief,
      ...(parsed.resultFile === undefined ? {} : { resultFile: parsed.resultFile }),
      json: parsed.json,
      nonInteractive: parsed.nonInteractive,
    },
  };
}

async function finalizeEnvelope(envelope: UnknownRecord, resultFile?: string): Promise<UnknownRecord> {
  let finalEnvelope: UnknownRecord = envelope;
  if (resultFile !== undefined) {
    await mkdir(dirname(resultFile), { recursive: true });
    finalEnvelope = {
      ...finalEnvelope,
      artifacts: [
        ...(Array.isArray(finalEnvelope.artifacts) ? finalEnvelope.artifacts : []),
        makeArtifactDescriptor({ kind: "cli_result", path: resultFile, schemaVersion: typeof finalEnvelope.schemaVersion === "string" ? finalEnvelope.schemaVersion : null, role: "report" }),
      ],
    };
  }
  const validation = makeValidateCliResultEnvelope(finalEnvelope);
  if (!validation.ok) {
    const invocationRef = isRecord(finalEnvelope.invocation) ? finalEnvelope.invocation as CommandInvocation : envelope.invocation as CommandInvocation;
    finalEnvelope = makeCreateEnvelope({
      invocation: invocationRef,
      status: "failure",
      payload: makePayload("internal_error", { accepted: false }),
      diagnostics: [makeDiagnostic({ code: CliErrorCode.InvalidEnvelope, classification: CliClassification.InternalError, message: "Create command generated an invalid result envelope." })],
      errors: [makeCliError({ code: CliErrorCode.InvalidEnvelope, classification: CliClassification.InternalError, message: "Create command generated an invalid result envelope.", details: { validationErrors: (validation as { errors: string[] }).errors } })],
    });
  }
  if (resultFile !== undefined) {
    try {
      await makeWriteResultFileAtomic(resultFile, finalEnvelope);
    } catch {
      const invocationRef = isRecord(finalEnvelope.invocation) ? finalEnvelope.invocation as CommandInvocation : envelope.invocation as CommandInvocation;
      finalEnvelope = makeCreateEnvelope({
        invocation: invocationRef,
        status: "blocked",
        payload: makePayload("result_file_error", { resultFile }),
        diagnostics: [makeDiagnostic({ code: CliErrorCode.ResultFileWriteFailed, classification: CliClassification.WriteConflict, message: "Result file could not be written atomically.", path: resultFile })],
      });
    }
  }
  return finalEnvelope;
}

export async function runCreate({ invocation, args }: CommandContext, mode: "create" | "import"): Promise<{ envelope: UnknownRecord }> {
  const parsed = parseCreateOptions(invocation, args);
  if (!parsed.ok) return commandResult(parsed.envelope);
  const completed = await completeCreateOptions(invocation, parsed.options, mode);
  if (!completed.ok) return commandResult(completed.envelope);
  const options = completed.options;

  // Selected-pi manifest gate (real I-14A consumers).
  const selected = resolveSelectedPiManifest();
  if ("code" in selected) {
    const envelope = makeCreateEnvelope({
      invocation,
      status: "blocked",
      payload: makePayload("create_result", { ok: false, stage: "manifest_resolution", harness: options.agenticHarness }),
      diagnostics: [makeDiagnostic({ code: CliErrorCode.MissingConfig, classification: CliClassification.MissingPrerequisite, message: selected.message })],
      errors: [makeCliError({ code: CliErrorCode.MissingConfig, classification: CliClassification.MissingPrerequisite, blocking: true, message: selected.message, details: selected.details })],
    });
    return commandResult(await finalizeEnvelope(envelope, options.resultFile));
  }

  const gateError = gateSelectedHarness(selected, options.agenticHarness);
  if (gateError !== null) {
    const envelope = makeCreateEnvelope({
      invocation,
      status: "blocked",
      payload: makePayload("create_result", { ok: false, stage: "harness_selection", requestedHarness: options.agenticHarness, supported: [SELECTED_PI_HARNESS] }),
      diagnostics: [makeDiagnostic({ code: gateError.code === "DEFERRED_HARNESS_BLOCKED" || gateError.code === "UNSUPPORTED_HARNESS_BLOCKED" ? CliErrorCode.UnsupportedOperation : CliErrorCode.MissingConfig, classification: gateError.classification, message: gateError.message })],
      errors: [makeCliError({ code: CliErrorCode.UnsupportedOperation, classification: gateError.classification, blocking: true, message: gateError.message, details: gateError.details })],
    });
    return commandResult(await finalizeEnvelope(envelope, options.resultFile));
  }

  // Brief validation (DL-17 / DL-22): secret-bearing or oversized brief → typed blocked; no secret echo.
  let briefForBootstrap: string | null = options.brief;
  if (options.brief !== null) {
    const trimmed = options.brief.trim();
    if (trimmed.length === 0) {
      briefForBootstrap = null;
    } else if (Buffer.byteLength(options.brief, "utf8") > MAX_BRIEF_BYTES) {
      const envelope = makeCreateEnvelope({
        invocation,
        status: "blocked",
        payload: makePayload("create_result", { ok: false, stage: "brief_validation", briefStatus: "rejected", reason: "oversized" }),
        diagnostics: [makeDiagnostic({ code: CliErrorCode.InvalidInvocation, classification: CliClassification.InvalidInput, message: "Project brief exceeds the maximum accepted size." })],
        errors: [makeCliError({ code: CliErrorCode.InvalidInvocation, classification: CliClassification.InvalidInput, blocking: true, message: "Project brief exceeds the maximum accepted size.", details: { maxBytes: MAX_BRIEF_BYTES } })],
      });
      return commandResult(await finalizeEnvelope(envelope, options.resultFile));
    } else if (isSecretLikeBrief(options.brief)) {
      const envelope = makeCreateEnvelope({
        invocation,
        status: "blocked",
        payload: makePayload("create_result", { ok: false, stage: "brief_validation", briefStatus: "rejected", reason: "secret_like", brief: "<redacted>" }),
        diagnostics: [makeDiagnostic({ code: CliErrorCode.InvalidInvocation, classification: CliClassification.SafetyPolicyBlock, message: "Secret-like project brief input is not accepted." })],
        errors: [makeCliError({ code: CliErrorCode.InvalidInvocation, classification: CliClassification.SafetyPolicyBlock, blocking: true, message: "Secret-like project brief input is not accepted.", details: { brief: "<redacted>" } })],
      });
      return commandResult(await finalizeEnvelope(envelope, options.resultFile));
    }
  }

  // For import mode, the target root must already exist (existing project).
  if (mode === "import" && (!existsSync(options.targetRoot) || !statSync(options.targetRoot).isDirectory())) {
    const envelope = makeCreateEnvelope({
      invocation,
      status: "blocked",
      payload: makePayload("create_result", { ok: false, stage: "target_root", mode, targetRoot: options.targetRoot }),
      diagnostics: [makeDiagnostic({ code: CliErrorCode.InvalidInvocation, classification: CliClassification.InvalidInput, message: "Import target root must be an existing directory." })],
      errors: [makeCliError({ code: CliErrorCode.InvalidInvocation, classification: CliClassification.InvalidInput, blocking: true, message: "Import target root must be an existing directory.", details: { targetRoot: options.targetRoot } })],
    });
    return commandResult(await finalizeEnvelope(envelope, options.resultFile));
  }

  const bootstrap = buildBootstrap({
    projectName: options.projectName,
    selectedHarness: SELECTED_PI_HARNESS,
    brief: briefForBootstrap,
    generatedAt: generatedAt(invocation),
    producer: producer(invocation),
  });

  let starterMaterialization: Awaited<ReturnType<typeof materializeStarterTree>> | null = null;
  if (mode === "create") {
    try {
      starterMaterialization = await materializeStarterTree(options.targetRoot, { projectName: options.projectName, mode: "create" });
    } catch (error) {
      const record = isRecord(error) ? error : {};
      const code = isStarterTemplateError(error) ? error.code : CliErrorCode.InternalError;
      const classification = isStarterTemplateError(error) ? error.classification : CliClassification.InternalError;
      const details = isStarterTemplateError(error) ? error.details : { errorName: typeof record.name === "string" ? record.name : null, errorMessage: typeof record.message === "string" ? record.message : null };
      const message = error instanceof Error ? error.message : "Starter template materialization failed.";
      const envelope = makeCreateEnvelope({
        invocation,
        status: "blocked",
        payload: makePayload("create_result", { ok: false, stage: "starter_materialization", mode, targetRoot: options.targetRoot }),
        diagnostics: [makeDiagnostic({ code, classification, message })],
        errors: [makeCliError({ code, classification, blocking: true, message, details })],
      });
      return commandResult(await finalizeEnvelope(envelope, options.resultFile));
    }
  }

  let generated;
  try {
    generated = await writeGeneratedArtifacts(options.targetRoot, bootstrap, selected.meta, { reset: mode === "create" });
  } catch (error) {
    const record = isRecord(error) ? error : {};
    const envelope = makeCreateEnvelope({
      invocation,
      status: "blocked",
      payload: makePayload("create_result", { ok: false, stage: "artifact_write", mode, targetRoot: options.targetRoot }),
      diagnostics: [makeDiagnostic({ code: CliErrorCode.InternalError, classification: CliClassification.InternalError, message: "Generated artifact write failed." })],
      errors: [makeCliError({ code: CliErrorCode.InternalError, classification: CliClassification.InternalError, blocking: true, message: "Generated artifact write failed.", details: { errorName: typeof record.name === "string" ? record.name : null, errorMessage: typeof record.message === "string" ? record.message : null } })],
    });
    return commandResult(await finalizeEnvelope(envelope, options.resultFile));
  }

  let piHarnessAssets;
  try {
    piHarnessAssets = await writePiHarnessAssets({ targetRoot: options.targetRoot, mode, manifest: selected.manifest, capabilityMatrix: selected.matrix });
  } catch (error) {
    const record = isRecord(error) ? error : {};
    const code = isPiHarnessAssetError(error) ? error.code : CliErrorCode.InternalError;
    const classification = isPiHarnessAssetError(error) ? error.classification : CliClassification.InternalError;
    const details = isPiHarnessAssetError(error) ? error.details : { stage: "pi_asset_validation", errorName: typeof record.name === "string" ? record.name : null, errorMessage: typeof record.message === "string" ? record.message : null };
    const message = error instanceof Error ? error.message : "Pi harness asset validation failed.";
    const envelope = makeCreateEnvelope({
      invocation,
      status: "blocked",
      payload: makePayload("create_result", { ok: false, stage: "pi_asset_validation", mode, targetRoot: options.targetRoot }),
      diagnostics: [makeDiagnostic({ code, classification, message })],
      errors: [makeCliError({ code, classification, blocking: true, message, details })],
    });
    return commandResult(await finalizeEnvelope(envelope, options.resultFile));
  }

  const data = {
    ok: true,
    stage: "complete",
    mode,
    project: { name: options.projectName, slug: normalizeSlug(options.projectName) },
    selectedHarness: SELECTED_PI_HARNESS,
    briefStatus: bootstrap.briefStatus,
    targetRoot: options.targetRoot,
    harnessConfig: generated.harnessConfigMeta,
    manifest: {
      adapterCapabilityVersion: selected.meta.adapterCapabilityVersion,
      generatedFileManifestVersion: selected.meta.generatedFileManifestVersion,
      ownedFamilies: selected.ownedFamilies.map((family) => ({ familyId: family.familyId, readiness: family.readiness.state })),
    },
    generatedFiles: {
      configPath: generated.configPath,
      contextFiles: { agents: generated.agentsPath, claude: generated.claudePath },
      sourceRecord: generated.sourceRecordPath,
      starterTemplate: starterMaterialization === null ? null : {
        layoutPath: starterMaterialization.layoutPath,
        templateRoot: starterMaterialization.templateRoot,
        fileCount: starterMaterialization.fileCount,
        overlayPaths: starterMaterialization.overlayPaths,
        substitutionPaths: starterMaterialization.substitutionPaths,
        projectSlug: starterMaterialization.projectSlug,
      },
      piAssets: piHarnessAssets.writtenAssets.map((asset) => ({ kind: asset.kind, familyId: asset.familyId, skillId: asset.skillId, path: asset.path, targetPath: asset.targetPath, sha256: asset.sha256 })),
    },
    harnessAssets: {
      piAssetFamilies: piHarnessAssets.piAssetFamilies,
      skillCount: piHarnessAssets.skillCount,
      promptCount: piHarnessAssets.promptCount,
      extensionsPolicy: piHarnessAssets.extensionsPolicy,
      manifestValidation: piHarnessAssets.manifestValidation,
      conflictPolicy: piHarnessAssets.conflictPolicy,
    },
    contextProject: { graphPath: typeof (generated.contextProject as UnknownRecord).graphPath === "string" ? (generated.contextProject as UnknownRecord).graphPath : null, indexPath: typeof (generated.contextProject as UnknownRecord).indexPath === "string" ? (generated.contextProject as UnknownRecord).indexPath : null },
    provenanceLabels: bootstrap.provenanceMap,
  };

  const artifacts = [
    makeArtifactDescriptor({ kind: "vibe_config", path: generated.configPath, schemaVersion: "vibe-engineer.config.v1", role: "harness-config" }),
    makeArtifactDescriptor({ kind: "context_file", path: generated.agentsPath, schemaVersion: "pi-context-file/v1", role: "context-files" }),
    makeArtifactDescriptor({ kind: "context_file", path: generated.claudePath, schemaVersion: "pi-context-file/v1", role: "context-files" }),
    ...piHarnessAssets.writtenAssets.map((asset) => makeArtifactDescriptor({ kind: asset.kind, path: asset.targetPath, schemaVersion: selected.meta.generatedFileManifestVersion, role: asset.familyId, sha256: asset.sha256 })),
  ];

  const envelope = makeCreateEnvelope({
    invocation,
    status: "success",
    payload: makePayload("create_result", data),
    artifacts,
  });
  return commandResult(await finalizeEnvelope(envelope, options.resultFile));
}

async function run(context: CommandContext): Promise<{ envelope: UnknownRecord }> {
  return runCreate(context, "create");
}

export const createCommand = Object.freeze({
  id: "create",
  visibility: "starter",
  description: "Create a new vibe-engineer starter project with the selected pi agentic harness and DL-17 bootstrap context.",
  run,
});

export default createCommand;
