// I-15A shared selected-harness join + DL-17 bootstrap context + generated-file writers.
// Consumed by both `create` and `import` command modules (internal to create/** + import/** only).
// Node-24 native .ts type-stripping; type-annotation-only; `as unknown as` casts on JS/external siblings.
// Mirrors the accepted verify/index.ts + security/index.ts precedent (no strict cli tsconfig dependency).

import { existsSync, realpathSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";

import { createDefaultVibeConfig } from "@vibe-engineer/config";
import { writeContextProject } from "@vibe-engineer/context";
import {
  getHarnessAdapter,
  HARNESS_ADAPTER_CONTRACT_SCHEMA_VERSION,
  HARNESS_GENERATED_FILE_MANIFEST_SCHEMA_VERSION,
  isSupportedHarnessAdapterId,
  getPiAdapterCapabilityMatrix,
  isAdapterManifestSelectable,
  PI_ADAPTER_CAPABILITY_SCHEMA_VERSION,
  PI_ADAPTER_ID,
  SUPPORTED_HARNESS_ADAPTER_IDS,
  type HarnessAdapter,
  type HarnessContextFile,
  type HarnessGeneratedFileFamily,
} from "@vibe-engineer/adapter-pi/capabilities";
import {
  getPiGeneratedFileManifest,
  PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION,
} from "@vibe-engineer/adapter-pi/generated-file-manifest";
import {
  validateCapabilityMatrix,
  validateGeneratedFileManifest,
} from "@vibe-engineer/adapter-pi/schema";

import {
  writeArchitectureAgentReviewAssets,
  type ArchitectureAgentReviewAssets,
} from "./architecture-agent-review-assets.ts";

export type UnknownRecord = Record<string, unknown>;
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type CapabilityMatrixApi = {
  schemaVersion: string;
  producedByLane: string;
  adapterPackage: string;
  adapters: UnknownRecord[];
};

type ManifestFamily = {
  familyId: string;
  producedByLane: string;
  pathPatterns: readonly string[];
  readiness: { state: string; reason: string };
};

type GeneratedFileManifestApi = {
  schemaVersion: string;
  adapterId: string;
  adapterCapabilityVersion: string;
  producedByLane: string;
  families: ManifestFamily[];
};

type ValidationResultApi = { valid: boolean; errors?: unknown };

// Typed wrappers: workspace deps are JS siblings; wrapping preserves exact call semantics while
// giving the call sites explicit typed contracts (no `as unknown`, no FunctionType annotation).
function getConfig(options: UnknownRecord): UnknownRecord {
  return createDefaultVibeConfig(options);
}
function writeContext(options: UnknownRecord): Promise<UnknownRecord> {
  return writeContextProject(options);
}
function getMatrix(): CapabilityMatrixApi {
  return getPiAdapterCapabilityMatrix();
}
function getManifest(): GeneratedFileManifestApi {
  return getPiGeneratedFileManifest();
}
function isManifestSelectable(matrix: CapabilityMatrixApi, adapterId: string): boolean {
  return isAdapterManifestSelectable(matrix, adapterId);
}
function validateMatrix(value: unknown): ValidationResultApi {
  return validateCapabilityMatrix(value);
}
function validateManifest(value: unknown): ValidationResultApi {
  return validateGeneratedFileManifest(value);
}

export const SELECTED_PI_HARNESS = "pi";
export const DEFAULT_AGENTIC_HARNESS = SELECTED_PI_HARNESS;
export const SUPPORTED_AGENTIC_HARNESSES = SUPPORTED_HARNESS_ADAPTER_IDS;
export const I15A_LANE_ID = "I-15A-create-import-cli-ux-selected-harness";
export const I15A_OWNED_FAMILIES = Object.freeze(["context-files", "harness-config"]);
export const LATER_INTEGRATIONS = "later-integrations";
export const MAX_BRIEF_BYTES = 8192;
export const PI_BRAINSTORM_INSTRUCTION =
  "Run the brainstorm skill with `/skill:brainstorm` and several sentences describing the project to create the initial Work Brief and project context.";
export const PROMPT_LEVEL_BRAINSTORM_INSTRUCTION =
  "Use the brainstorm protocol as prompt-level guidance with several sentences describing the project; persist the initial Work Brief and project context under .vibe/work/<work-id>/ instead of relying on an unproven native skill asset.";
export const BRAINSTORM_INSTRUCTION = PI_BRAINSTORM_INSTRUCTION;

export const PROVENANCE_LABELS = Object.freeze([
  "user_provided",
  "normalized_from_user",
  "harness_default",
  "inferred_from_user",
  "placeholder",
  "assumption",
  "unknown",
] as const);
export type ProvenanceLabel = (typeof PROVENANCE_LABELS)[number];

export const VIBE_ENGINEER_SKILLS = Object.freeze([
  "brainstorm",
  "grill-me",
  "task",
  "plan",
  "build",
  "ship",
]);

export type ManifestMeta = {
  adapterId: string;
  adapterCapabilityVersion: string;
  generatedFileManifestVersion: string;
  capabilitySchemaVersion: string;
  manifestSchemaVersion: string;
};

export type SelectedManifest = {
  matrix: CapabilityMatrixApi;
  manifest: GeneratedFileManifestApi;
  meta: ManifestMeta;
  ownedFamilies: ManifestFamily[];
};

export type SelectedHarness = {
  adapter: HarnessAdapter;
  meta: ManifestMeta;
  ownedFamilies: readonly (ManifestFamily | HarnessGeneratedFileFamily)[];
  piManifest: SelectedManifest | null;
};

export type ResolveManifestError = { code: string; message: string; details: UnknownRecord };

// --- real-boundary manifest resolution + selected-harness contract confirmation ---

export function resolveSelectedPiManifest(): SelectedManifest | ResolveManifestError {
  let matrix: CapabilityMatrixApi;
  let manifest: GeneratedFileManifestApi;
  try {
    matrix = getMatrix();
    manifest = getManifest();
  } catch (error) {
    return {
      code: "MANIFEST_UNAVAILABLE",
      message: "Selected-pi adapter capability/generated-file manifest could not be loaded.",
      details: { errorName: isErrorRecord(error) ? String(error.name) : null },
    };
  }
  const matrixValidation = validateMatrix(matrix);
  if (!matrixValidation.valid) {
    return {
      code: "INVALID_CAPABILITY_MATRIX",
      message: "Pi adapter capability matrix failed its own validator.",
      details: { errors: matrixValidation.errors ?? null },
    };
  }
  const manifestValidation = validateManifest(manifest);
  if (!manifestValidation.valid) {
    return {
      code: "INVALID_GENERATED_FILE_MANIFEST",
      message: "Pi generated-file manifest failed its own validator.",
      details: { errors: manifestValidation.errors ?? null },
    };
  }
  if (
    manifest.adapterId !== PI_ADAPTER_ID ||
    matrix.adapterPackage !== "@vibe-engineer/adapter-pi"
  ) {
    return {
      code: "MANIFEST_ADAPTER_MISMATCH",
      message: "Loaded manifest does not identify the pi adapter.",
      details: { adapterId: manifest.adapterId, adapterPackage: matrix.adapterPackage },
    };
  }
  const ownedFamilies = manifest.families.filter(
    (family) => family.producedByLane === I15A_LANE_ID,
  );
  const ownedIds = new Set(ownedFamilies.map((family) => family.familyId));
  for (const expected of I15A_OWNED_FAMILIES) {
    if (!ownedIds.has(expected)) {
      return {
        code: "MANIFEST_FAMILY_DRIFT",
        message: `Expected I-15A-owned manifest family '${expected}' is absent.`,
        details: { expected, present: [...ownedIds] },
      };
    }
  }
  for (const family of ownedFamilies) {
    if (family.readiness.state !== "ready") {
      return {
        code: "MANIFEST_FAMILY_NOT_READY",
        message: `I-15A-owned family '${family.familyId}' is not ready.`,
        details: { familyId: family.familyId, state: family.readiness.state },
      };
    }
  }
  const meta: ManifestMeta = {
    adapterId: manifest.adapterId,
    adapterCapabilityVersion: PI_ADAPTER_CAPABILITY_SCHEMA_VERSION,
    generatedFileManifestVersion: PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION,
    capabilitySchemaVersion: matrix.schemaVersion,
    manifestSchemaVersion: manifest.schemaVersion,
  };
  return { matrix, manifest, meta, ownedFamilies };
}

export type HarnessGateError = {
  code: string;
  classification: string;
  message: string;
  details: UnknownRecord;
};

export type ResolveSelectedHarnessResult =
  | { ok: true; selected: SelectedHarness }
  | { ok: false; error: HarnessGateError };

function requestedOrDefault(requestedHarness: string | undefined): string {
  return typeof requestedHarness === "string" && requestedHarness.length > 0
    ? requestedHarness
    : DEFAULT_AGENTIC_HARNESS;
}

function fixedRunnerCommand(
  adapter: HarnessAdapter,
  command: readonly string[],
): readonly string[] {
  if (adapter.id === "claude-code") {
    return command.map((token) => (token === "<schema>" ? "<schema-json>" : token));
  }
  if (adapter.id !== "codex") return command;
  const withoutUnsupportedApproval = command.filter(
    (token, index) => token !== "--ask-for-approval" && command[index - 1] !== "--ask-for-approval",
  );
  const execIndex = withoutUnsupportedApproval.indexOf("exec");
  if (execIndex < 0 || withoutUnsupportedApproval.includes('approval_policy="never"')) {
    return withoutUnsupportedApproval;
  }
  return [
    ...withoutUnsupportedApproval.slice(0, execIndex + 1),
    "-c",
    'approval_policy="never"',
    ...withoutUnsupportedApproval.slice(execIndex + 1),
  ];
}

function adapterWithFreshProjectRunnerFixes(adapter: HarnessAdapter): HarnessAdapter {
  if (adapter.id !== "claude-code" && adapter.id !== "codex") return adapter;
  return {
    ...adapter,
    invocationModel: {
      ...adapter.invocationModel,
      nonInteractiveCommand: fixedRunnerCommand(
        adapter,
        adapter.invocationModel.nonInteractiveCommand,
      ),
    },
    verificationRunnerInvocation: {
      ...adapter.verificationRunnerInvocation,
      recommendedCommand: fixedRunnerCommand(
        adapter,
        adapter.verificationRunnerInvocation.recommendedCommand,
      ),
      ...(adapter.id === "codex"
        ? { defaultPermissionMode: "read-only sandbox with approval_policy=never config override" }
        : {}),
    },
  };
}

function adapterOwnedFamilies(adapter: HarnessAdapter): readonly HarnessGeneratedFileFamily[] {
  return adapter.generatedFileManifest.families.filter(
    (family) => family.producedByLane === I15A_LANE_ID,
  );
}

function verifyAdapterCreateImportReadiness(adapter: HarnessAdapter): HarnessGateError | null {
  if (adapter.createImportSelectable !== true) {
    return {
      code: "HARNESS_NOT_CREATE_IMPORT_SELECTABLE",
      classification: "unsupported_operation",
      message: `Harness '${adapter.id}' is not selectable for create/import.`,
      details: { requestedHarness: adapter.id, supported: [...SUPPORTED_AGENTIC_HARNESSES] },
    };
  }
  const ownedFamilies = adapterOwnedFamilies(adapter);
  const hasHarnessConfig = ownedFamilies.some((family) => family.familyId === "harness-config");
  const hasReadyContext = ownedFamilies.some(
    (family) =>
      family.support === "ready" && family.pathPatterns.some((path) => path.endsWith(".md")),
  );
  if (!hasHarnessConfig || !hasReadyContext) {
    return {
      code: "HARNESS_ADAPTER_MANIFEST_INCOMPLETE",
      classification: "missing_prerequisite",
      message: `Harness '${adapter.id}' adapter manifest is missing ready create/import families.`,
      details: {
        requestedHarness: adapter.id,
        hasHarnessConfig,
        hasReadyContext,
        ownedFamilies: ownedFamilies.map((family) => ({
          familyId: family.familyId,
          support: family.support,
        })),
      },
    };
  }
  return null;
}

export function resolveSelectedHarness(
  requestedHarness: string | undefined,
): ResolveSelectedHarnessResult {
  const harness = requestedOrDefault(requestedHarness);
  if (!isSupportedHarnessAdapterId(harness)) {
    return {
      ok: false,
      error: {
        code: "UNSUPPORTED_HARNESS_BLOCKED",
        classification: "unsupported_operation",
        message: `Unsupported agentic harness '${harness}'. Supported agentic harnesses are exactly: pi, claude-code, codex.`,
        details: {
          requestedHarness: harness,
          supported: [...SUPPORTED_AGENTIC_HARNESSES],
          noFallbackToPi: true,
        },
      },
    };
  }
  const rawAdapter = getHarnessAdapter(harness);
  if (rawAdapter === undefined) {
    return {
      ok: false,
      error: {
        code: "HARNESS_ADAPTER_MISSING",
        classification: "missing_prerequisite",
        message: `Supported harness '${harness}' has no registered HarnessAdapter contract.`,
        details: { requestedHarness: harness, supported: [...SUPPORTED_AGENTIC_HARNESSES] },
      },
    };
  }
  const adapter = adapterWithFreshProjectRunnerFixes(rawAdapter);
  const readiness = verifyAdapterCreateImportReadiness(adapter);
  if (readiness !== null) return { ok: false, error: readiness };

  if (adapter.id === SELECTED_PI_HARNESS) {
    const piManifest = resolveSelectedPiManifest();
    if ("code" in piManifest) {
      return {
        ok: false,
        error: {
          code: piManifest.code,
          classification: "missing_prerequisite",
          message: piManifest.message,
          details: piManifest.details,
        },
      };
    }
    if (!isManifestSelectable(piManifest.matrix, SELECTED_PI_HARNESS)) {
      return {
        ok: false,
        error: {
          code: "PI_NOT_MANIFEST_SELECTABLE",
          classification: "missing_prerequisite",
          message:
            "The pi adapter is not manifest-selectable on disk; selected-harness join cannot proceed.",
          details: { adapterId: SELECTED_PI_HARNESS },
        },
      };
    }
    return {
      ok: true,
      selected: {
        adapter,
        meta: piManifest.meta,
        ownedFamilies: piManifest.ownedFamilies,
        piManifest,
      },
    };
  }

  return {
    ok: true,
    selected: {
      adapter,
      meta: {
        adapterId: adapter.id,
        adapterCapabilityVersion: HARNESS_ADAPTER_CONTRACT_SCHEMA_VERSION,
        generatedFileManifestVersion: HARNESS_GENERATED_FILE_MANIFEST_SCHEMA_VERSION,
        capabilitySchemaVersion: adapter.capabilityMatrix.schemaVersion,
        manifestSchemaVersion: adapter.generatedFileManifest.schemaVersion,
      },
      ownedFamilies: adapterOwnedFamilies(adapter),
      piManifest: null,
    },
  };
}

// --- DL-17 bootstrap context (pure; no IO) ---

export type BriefStatus = "provided" | "skipped";

export type ProvenanceEntry = { label: ProvenanceLabel; source?: string };

export type BootstrapHighLevel = {
  projectName: string;
  projectSlug: string;
  selectedHarness: string;
  briefSummary: string | null;
  goals: ProvenanceEntry;
  constraints: ProvenanceEntry;
  nonGoals: ProvenanceEntry;
  audience: ProvenanceEntry;
  integrations: ProvenanceEntry;
  unknowns: string[];
  assumptions: string[];
  brainstormInstruction: string | null;
  status: "sparse_provided" | "needs_user_context";
  provenanceMap: UnknownRecord;
};

export type BootstrapArtifacts = {
  briefStatus: BriefStatus;
  sourceRecord: {
    briefStatus: BriefStatus;
    briefText: string | null;
    selectedHarness: string;
    projectName: string;
    projectSlug: string;
    producer: UnknownRecord;
    generatedAt: string;
  };
  highLevel: BootstrapHighLevel;
  provenanceMap: UnknownRecord;
};

function isErrorRecord(value: unknown): value is { name?: unknown; message?: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeSlug(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const slug = trimmed.replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "project";
}

export function isSecretLikeBrief(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  if (/^(?:sk|ghp|gho|github_pat|xox[baprs])-?[A-Za-z0-9_=-]{12,}$/iu.test(trimmed)) return true;
  if (
    /\b(?:Bearer|token|password|passphrase|secret|api[_-]?key|credential|client[_-]?secret)\s*[:=]\s*\S+/iu.test(
      trimmed,
    )
  )
    return true;
  return false;
}

export type BuildBootstrapInput = {
  projectName: string;
  selectedHarness: string;
  brief: string | null;
  generatedAt: string;
  producer: UnknownRecord;
};

function brainstormInstructionForHarness(selectedHarness: string): string {
  return selectedHarness === SELECTED_PI_HARNESS
    ? PI_BRAINSTORM_INSTRUCTION
    : PROMPT_LEVEL_BRAINSTORM_INSTRUCTION;
}

// DL-17: provided-brief writes sparse provenance-labeled context (NO over-inference).
// We do NOT regex-extract goals/constraints/etc. (quality bar forbids heuristics standing in
// for typed contracts). Missing categories are classified `unknown` (an allowed inference).
// The brief text is recorded verbatim as `user_provided`.
export function buildBootstrap(input: BuildBootstrapInput): BootstrapArtifacts {
  const projectSlug = normalizeSlug(input.projectName);
  const rawBrief = input.brief ?? "";
  const trimmedBrief = rawBrief.trim();
  const briefStatus: BriefStatus = trimmedBrief.length === 0 ? "skipped" : "provided";
  const brainstormInstruction = brainstormInstructionForHarness(input.selectedHarness);
  const unknown = (reason: string): ProvenanceEntry => ({ label: "unknown", source: reason });

  const sourceRecord: BootstrapArtifacts["sourceRecord"] = {
    briefStatus,
    briefText: briefStatus === "provided" ? rawBrief : null,
    selectedHarness: input.selectedHarness,
    projectName: input.projectName,
    projectSlug,
    producer: input.producer,
    generatedAt: input.generatedAt,
  };

  if (briefStatus === "skipped") {
    const provenanceMap: UnknownRecord = {
      projectName: { label: "normalized_from_user", source: "create/import naming value" },
      projectSlug: { label: "normalized_from_user", source: "create/import naming value" },
      selectedHarness: {
        label: "harness_default",
        source: "selected harness adapter boundary; supported harnesses: pi, claude-code, codex",
      },
      briefSummary: { label: "placeholder", source: "no user-provided brief" },
      goals: { label: "unknown", source: "no brief provided" },
      brainstormInstruction: {
        label: "harness_default",
        source: "DL-17 skipped-brief later-skill recommendation",
      },
    };
    const highLevel: BootstrapHighLevel = {
      projectName: input.projectName,
      projectSlug,
      selectedHarness: input.selectedHarness,
      briefSummary: null,
      goals: unknown("No project brief was provided."),
      constraints: unknown("No project brief was provided."),
      nonGoals: unknown("No project brief was provided."),
      audience: unknown("No project brief was provided."),
      integrations: unknown("No project brief was provided."),
      unknowns: [
        "Project purpose / desired outcome is unknown (no brief provided).",
        "Goals, constraints, non-goals, risks, and acceptance criteria are unknown.",
        "Intended audience/users are unknown.",
        "Domain-specific context is unknown.",
      ],
      assumptions: [],
      brainstormInstruction,
      status: "needs_user_context",
      provenanceMap,
    };
    return { briefStatus, sourceRecord, highLevel, provenanceMap };
  }

  // Provided brief: sparse — the brief text is the only user fact; everything else is unknown.
  const provenanceMap: UnknownRecord = {
    projectName: { label: "normalized_from_user", source: "create/import naming value" },
    projectSlug: { label: "normalized_from_user", source: "create/import naming value" },
    selectedHarness: {
      label: "harness_default",
      source: "selected harness adapter boundary; supported harnesses: pi, claude-code, codex",
    },
    briefSummary: { label: "user_provided", source: "user-provided project brief (verbatim)" },
    goals: { label: "unknown", source: "not explicitly extracted from the brief" },
    brainstormInstruction: {
      label: "harness_default",
      source: "DL-17 advisory refinement instruction for sparse briefs",
    },
  };
  const highLevel: BootstrapHighLevel = {
    projectName: input.projectName,
    projectSlug,
    selectedHarness: input.selectedHarness,
    briefSummary: trimmedBrief,
    goals: unknown(
      "Goals are not explicitly and unambiguously extracted from the brief; refine via brainstorm.",
    ),
    constraints: unknown("Constraints are not explicitly extracted from the brief."),
    nonGoals: unknown("Non-goals are not explicitly extracted from the brief."),
    audience: unknown("Audience/users are not explicitly extracted from the brief."),
    integrations: unknown("Integrations are not explicitly extracted from the brief."),
    unknowns: [
      "Explicit goals/outcomes were not unambiguously stated and remain unknown.",
      "Explicit constraints, non-goals, risks, and acceptance criteria are unknown.",
      "Intended audience/users are unknown unless stated.",
      "Architecture, data model, integrations, and workflow are NOT inferred (DL-17 anti-overdesign).",
    ],
    assumptions: [],
    brainstormInstruction,
    status: "sparse_provided",
    provenanceMap,
  };
  return { briefStatus, sourceRecord, highLevel, provenanceMap };
}

// --- generated-artifact writers (IO) ---

function realRoot(pathValue: string): string {
  const abs = resolve(pathValue);
  return existsSync(abs) ? realpathSync(abs) : abs;
}

function contained(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export type ResolveTargetResult = { ok: true; targetRoot: string } | { ok: false; error: string };

export function resolveTargetRoot(
  projectRoot: string,
  targetRootValue: string,
  label: string,
): ResolveTargetResult {
  if (targetRootValue.trim().length === 0)
    return { ok: false, error: `${label} must be a non-empty path.` };
  const rootReal = realRoot(projectRoot);
  const resolved = isAbsolute(targetRootValue)
    ? resolve(targetRootValue)
    : resolve(rootReal, targetRootValue);
  if (!contained(rootReal, resolved))
    return { ok: false, error: `${label} escapes the project root.` };
  return { ok: true, targetRoot: resolved };
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeJsonObjects(base: JsonObject, overlay: JsonObject): JsonObject {
  const merged: JsonObject = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const previous = merged[key];
    if (isJsonObject(previous) && isJsonObject(value)) {
      merged[key] = mergeJsonObjects(previous, value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function narrowJsonObjectOrNull(value: unknown): JsonObject | null {
  return isJsonObject(value) ? value : null;
}

async function readJsonObjectIfPresent(pathValue: string): Promise<JsonObject | null> {
  if (!existsSync(pathValue)) return null;
  const text = await readFile(pathValue, "utf8");
  return narrowJsonObjectOrNull(JSON.parse(text));
}

async function readJsonValueIfPresent(pathValue: string): Promise<JsonValue | null> {
  if (!existsSync(pathValue)) return null;
  const text = await readFile(pathValue, "utf8");
  return JSON.parse(text) as JsonValue;
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function formatJsonPrimitive(value: JsonPrimitive): string {
  return JSON.stringify(value);
}

function formatJsonForPrettier(value: JsonValue, indent = 0, prefixLength = 0): string {
  const indentation = " ".repeat(indent);
  const childIndentation = " ".repeat(indent + 2);
  if (value === null || typeof value !== "object") return formatJsonPrimitive(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((item) => item === null || typeof item !== "object")) {
      const inline = `[${value.map((item) => formatJsonPrimitive(item as JsonPrimitive)).join(", ")}]`;
      if (indent + prefixLength + inline.length <= 99) return inline;
    }
    return `[
${value
  .map((item) => `${childIndentation}${formatJsonForPrettier(item, indent + 2)}`)
  .join(",\n")}
${indentation}]`;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return "{}";
  return `{
${entries
  .map(([key, item]) => {
    const prefix = `${childIndentation}${JSON.stringify(key)}: `;
    return `${prefix}${formatJsonForPrettier(item, indent + 2, prefix.length - childIndentation.length)}`;
  })
  .join(",\n")}
${indentation}}`;
}

function toJsonObject(value: unknown): JsonObject {
  const jsonValue = toJsonValue(value);
  return isJsonObject(jsonValue) ? jsonValue : {};
}

function applyStarterScopeToGeneratedConfig(
  config: JsonObject,
  starterScope: GeneratedStarterScope | null | undefined,
): void {
  if (starterScope === null || starterScope === undefined || starterScope.includesMobile) return;
  const verification = isJsonObject(config.verification) ? config.verification : null;
  if (verification !== null && Object.prototype.hasOwnProperty.call(verification, "mobileE2E")) {
    delete verification.mobileE2E;
  }
}

function relativeProjectPath(projectRoot: string, pathValue: string): string {
  return relative(projectRoot, pathValue).replaceAll("\\", "/");
}

export type ContextFileRecord = {
  kind: HarnessContextFile;
  path: string;
};

export type GeneratedStarterScope = {
  id: string;
  label: string;
  flags: string[];
  apps: string[];
  packages: string[];
  generatedSurfaces: string[];
  omittedSurfaces: string[];
  omittedChecks: string[];
  includesApi: boolean;
  includesWeb: boolean;
  includesMobile: boolean;
  includesPrisma: boolean;
};

export type GeneratedArtifacts = {
  configPath: string;
  agentsPath: string | null;
  claudePath: string | null;
  contextFiles: readonly ContextFileRecord[];
  sourceRecordPath: string;
  selectedHarnessMetadataPath: string;
  selectedHarnessReadmePath: string;
  selectedHarnessHandoffPath: string;
  runnerCatalogPath: string | null;
  starterPresetManifestPath: string | null;
  starterReferencePath: string | null;
  architectureAgentReview: ArchitectureAgentReviewAssets | null;
  starterTemplateMutationPaths: readonly string[];
  harnessConfigMeta: {
    agenticHarness: string;
    adapterCapabilityVersion: string;
    generatedFileManifestVersion: string;
  };
  contextProject: UnknownRecord;
  bootstrap: BootstrapArtifacts;
  selectedHarnessMetadata: UnknownRecord;
};

function provenanceLine(entry: ProvenanceEntry | null | undefined, value: string): string {
  if (!entry) return `- (unknown) — provenance: unknown`;
  return `- ${value} — provenance: ${entry.label}${entry.source ? ` (${entry.source})` : ""}`;
}

function generatedFamilyRecord(family: HarnessGeneratedFileFamily): UnknownRecord {
  return {
    familyId: family.familyId,
    pathPatterns: [...family.pathPatterns],
    support: family.support,
    producedByLane: family.producedByLane,
    writer: family.writer,
    reason: family.reason,
    evidence: family.evidence,
  };
}

function selectedOwnedFamilyRecord(
  family: ManifestFamily | HarnessGeneratedFileFamily,
): UnknownRecord {
  return {
    familyId: family.familyId,
    pathPatterns: [...family.pathPatterns],
    producedByLane: family.producedByLane,
    support: "support" in family ? family.support : family.readiness.state,
    reason: "reason" in family ? family.reason : family.readiness.reason,
  };
}

function capabilityRecord(
  declaration: HarnessAdapter["capabilityMatrix"]["capabilities"]["contextFiles"],
): UnknownRecord {
  return {
    support: declaration.support,
    summary: declaration.summary,
    downstreamConsequence: declaration.downstreamConsequence,
    evidence: declaration.evidence,
  };
}

function capabilityRecords(adapter: HarnessAdapter): UnknownRecord {
  return Object.fromEntries(
    Object.entries(adapter.capabilityMatrix.capabilities).map(([key, declaration]) => [
      key,
      capabilityRecord(declaration),
    ]),
  );
}

function handoffStepLines(adapter: HarnessAdapter): string[] {
  const lines: string[] = [];
  for (const step of adapter.handoffInstructions) {
    lines.push(
      `- ${step.stepId}: ${step.inputArtifact} → ${step.outputArtifact}; ${
        step.nativeCommand === null ? "prompt-level only" : `native command ${step.nativeCommand}`
      }.`,
    );
    lines.push(`  - Persist: ${step.persistenceRule}`);
    lines.push(`  - Handoff: ${step.handoffRule}`);
    if (step.unsupportedNativeAssetNote !== null)
      lines.push(`  - Unsupported native asset note: ${step.unsupportedNativeAssetNote}`);
  }
  return lines;
}

function unsupportedSurfaceLines(adapter: HarnessAdapter): string[] {
  if (adapter.unsupportedFeatureBehavior.blockedFamilies.length === 0) {
    return ["- No blocked generated asset families are declared for this adapter."];
  }
  return adapter.unsupportedFeatureBehavior.blockedFamilies.map(
    (family) => `- ${family}: ${adapter.unsupportedFeatureBehavior.message}`,
  );
}

function buildSelectedHarnessMetadata(
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
  architectureRunnerImplemented: boolean,
): UnknownRecord {
  const { adapter, meta } = selected;
  return {
    schemaVersion: "vibe-engineer.selected-harness.v1",
    generatedAt: bootstrap.sourceRecord.generatedAt,
    producer: bootstrap.sourceRecord.producer,
    project: {
      name: bootstrap.highLevel.projectName,
      slug: bootstrap.highLevel.projectSlug,
      briefStatus: bootstrap.briefStatus,
    },
    adapter: {
      id: adapter.id,
      displayName: adapter.displayName,
      capabilityMatrixSchemaVersion: adapter.capabilityMatrix.schemaVersion,
      adapterCapabilityVersion: meta.adapterCapabilityVersion,
      generatedFileManifestVersion: meta.generatedFileManifestVersion,
      noFallbackToPi: adapter.assetWriter.noFallbackToPi,
    },
    config: {
      agenticHarness: adapter.id,
      supportedHarnesses: [...SUPPORTED_AGENTIC_HARNESSES],
      noSilentFallback: true,
    },
    assetWriter: {
      strategy: adapter.assetWriter.strategy,
      contextFiles: [...adapter.assetWriter.contextFiles],
      nativeAssetFamilies: [...adapter.assetWriter.nativeAssetFamilies],
      blockedAssetFamilies: [...adapter.assetWriter.blockedAssetFamilies],
      unsupportedFeaturePolicy: adapter.assetWriter.unsupportedFeaturePolicy,
      noFallbackToPi: adapter.assetWriter.noFallbackToPi,
    },
    generatedFileManifest: {
      schemaVersion: adapter.generatedFileManifest.schemaVersion,
      adapterCapabilityVersion: adapter.generatedFileManifest.adapterCapabilityVersion,
      families: adapter.generatedFileManifest.families.map(generatedFamilyRecord),
    },
    selectedOwnedFamilies: selected.ownedFamilies.map(selectedOwnedFamilyRecord),
    capabilities: capabilityRecords(adapter),
    unsupportedFeatureBehavior: adapter.unsupportedFeatureBehavior,
    runtimePrerequisiteDiagnostic: adapter.runtimePrerequisiteDiagnostic,
    invocationModel: adapter.invocationModel,
    structuredOutput: adapter.structuredOutput,
    verificationRunnerInvocation: {
      ...adapter.verificationRunnerInvocation,
      runnerImplemented: architectureRunnerImplemented,
      architectureAgentRunnerId: architectureRunnerImplemented ? "architecture-agent-review" : null,
      implementationBoundary: architectureRunnerImplemented
        ? "Generated starter includes the single default architecture agent runner; invocation uses this selected harness metadata and no Pi fallback."
        : "No generated starter runner catalog is present for this import-only target.",
    },
    securityTrustPolicy: adapter.securityTrustPolicy,
    handoffInstructions: adapter.handoffInstructions,
    assertions: {
      contextFilesExpected: [...adapter.assetWriter.contextFiles],
      piNativeAssetsExpected: adapter.id === SELECTED_PI_HARNESS,
      nonPiNativeProjectAssetPolicy:
        adapter.id === SELECTED_PI_HARNESS
          ? "pi native .pi skill/prompt assets generated from shipped templates"
          : "blocked: no evidenced generated project-local skill/plugin/command assets for this harness",
      noFallbackToPi: adapter.assetWriter.noFallbackToPi,
      liveRuntimeUnavailableDiagnostic:
        adapter.runtimePrerequisiteDiagnostic.unavailableRuntimeBehavior,
    },
  };
}

function renderSelectedHarnessReadme(
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
  architectureRunnerImplemented: boolean,
): string {
  const { adapter } = selected;
  const lines: string[] = [];
  lines.push(`# Selected harness: ${adapter.displayName}`);
  lines.push("");
  lines.push(`Adapter id: \`${adapter.id}\`.`);
  lines.push(
    "No silent Pi fallback is allowed; generated files are for this selected adapter only.",
  );
  lines.push("");
  lines.push("## Native generated surfaces");
  lines.push("");
  lines.push(`- Context files: ${adapter.assetWriter.contextFiles.join(", ") || "none"}.`);
  lines.push(
    `- Native asset families generated now: ${
      adapter.assetWriter.nativeAssetFamilies.join(", ") || "none"
    }.`,
  );
  lines.push("- Unsupported/blocked generated asset families:");
  lines.push(...unsupportedSurfaceLines(adapter));
  lines.push("");
  lines.push("## Live runtime prerequisites");
  lines.push("");
  lines.push(
    `- Binary/version probe: \`${adapter.runtimePrerequisiteDiagnostic.versionCommand.join(" ")}\`.`,
  );
  lines.push(`- Auth: ${adapter.runtimePrerequisiteDiagnostic.authPrerequisite}`);
  lines.push(`- Missing runtime diagnostic: ${adapter.runtimePrerequisiteDiagnostic.message}`);
  lines.push(`- Missing binary: ${adapter.runtimePrerequisiteDiagnostic.missingBinaryMessage}`);
  lines.push(`- Missing auth: ${adapter.runtimePrerequisiteDiagnostic.missingAuthMessage}`);
  lines.push("- create/import do not launch the live runtime or validate auth.");
  lines.push("");
  lines.push("## Architecture agent runner");
  lines.push("");
  if (architectureRunnerImplemented) {
    lines.push(
      "- Generated runner id: `architecture-agent-review`; it invokes this selected harness only and writes `.vibe/evidence/architecture-agent-review/review.json`.",
    );
    lines.push(
      "- Missing CLI/runtime/auth or unparseable harness output is blocked; no Pi fallback is allowed.",
    );
  } else {
    lines.push("- Import-only targets do not receive a generated starter runner catalog.");
  }
  lines.push("");
  lines.push("## Security and trust");
  lines.push("");
  lines.push(
    `- Project trust required: ${String(adapter.securityTrustPolicy.projectTrustRequired)}.`,
  );
  lines.push(`- Sandbox: ${adapter.securityTrustPolicy.sandbox}.`);
  lines.push(`- Permission model: ${adapter.securityTrustPolicy.permissionModel}.`);
  lines.push(`- Destructive operations: ${adapter.securityTrustPolicy.destructiveOperations}.`);
  lines.push(`- External integrations: ${adapter.securityTrustPolicy.externalIntegrations}.`);
  lines.push(`- Trust boundary: ${adapter.securityTrustPolicy.trustBoundary}`);
  lines.push("");
  lines.push("## Task / plan / build / ship handoff");
  lines.push("");
  lines.push(...handoffStepLines(adapter));
  lines.push("");
  lines.push("## Bootstrap context");
  lines.push("");
  lines.push(`- Project: ${bootstrap.highLevel.projectName} (${bootstrap.highLevel.projectSlug}).`);
  lines.push(`- Brief status: ${bootstrap.briefStatus}.`);
  lines.push(
    "- Keep unknowns first-class; do not infer product architecture from sparse/skipped briefs.",
  );
  lines.push("");
  return lines.join("\n");
}

function renderHandoffMarkdown(selected: SelectedHarness): string {
  const { adapter } = selected;
  const lines: string[] = [];
  lines.push(`# ${adapter.displayName} handoff instructions`);
  lines.push("");
  lines.push(
    "Persist every handoff artifact under `.vibe/work/<work-id>/`; chat history alone is not a carrier.",
  );
  lines.push("");
  lines.push(...handoffStepLines(adapter));
  lines.push("");
  lines.push("## Unsupported native asset policy");
  lines.push("");
  lines.push(...unsupportedSurfaceLines(adapter));
  lines.push("");
  return lines.join("\n");
}

function renderStarterHarnessSection(selected: SelectedHarness): string {
  const { adapter } = selected;
  const lines: string[] = [];
  lines.push("<!-- vibe-engineer:selected-harness:start -->");
  lines.push("");
  lines.push("## Selected agentic harness");
  lines.push("");
  lines.push(`This starter was generated with \`${adapter.id}\` (${adapter.displayName}).`);
  lines.push("Generated harness assets are adapter-specific; there is no silent Pi fallback.");
  lines.push("");
  lines.push(`- Context files: ${adapter.assetWriter.contextFiles.join(", ") || "none"}.`);
  lines.push(
    `- Native asset families generated now: ${
      adapter.assetWriter.nativeAssetFamilies.join(", ") || "none"
    }.`,
  );
  lines.push(
    `- Blocked asset families: ${adapter.assetWriter.blockedAssetFamilies.join(", ") || "none"}.`,
  );
  lines.push(`- Live runtime diagnostic: ${adapter.runtimePrerequisiteDiagnostic.message}`);
  lines.push(
    `- Runtime binary probe: \`${adapter.runtimePrerequisiteDiagnostic.versionCommand.join(" ")}\`.`,
  );
  lines.push(`- Trust boundary: ${adapter.securityTrustPolicy.trustBoundary}`);
  lines.push(
    "- See `.vibe/harness/README.md` and `.vibe/harness/handoff.md` for trust, security, blocked native surfaces, and handoff guidance.",
  );
  lines.push("");
  lines.push("<!-- vibe-engineer:selected-harness:end -->");
  return lines.join("\n");
}

function runnerCatalogHarnessMetadata(
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
): JsonObject {
  const { adapter } = selected;
  return toJsonObject({
    schemaVersion: "vibe-engineer.runner-catalog-harness.v1",
    generatedAt: bootstrap.sourceRecord.generatedAt,
    adapterId: adapter.id,
    displayName: adapter.displayName,
    noFallbackToPi: adapter.assetWriter.noFallbackToPi,
    contextFiles: adapter.assetWriter.contextFiles,
    nativeAssetFamilies: adapter.assetWriter.nativeAssetFamilies,
    blockedAssetFamilies: adapter.assetWriter.blockedAssetFamilies,
    unsupportedFeaturePolicy: adapter.unsupportedFeatureBehavior.policy,
    runnerImplemented: true,
    architectureAgentRunner: {
      runnerId: "architecture-agent-review",
      implemented: true,
      invocationMetadataPath: ".vibe/harness/selected-harness.json",
      unavailableRuntimeBehavior: adapter.verificationRunnerInvocation.unavailableRuntimeBehavior,
      noFallbackToPi: adapter.assetWriter.noFallbackToPi,
    },
    liveInvocation: {
      recommendedCommand: adapter.verificationRunnerInvocation.recommendedCommand,
      unavailableRuntimeBehavior: adapter.verificationRunnerInvocation.unavailableRuntimeBehavior,
      runtimePrerequisiteDiagnostic: adapter.runtimePrerequisiteDiagnostic,
      structuredOutput: adapter.structuredOutput,
      failClosed: true,
    },
  });
}

function starterPresetHarnessMetadata(
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
): JsonObject {
  const { adapter, meta } = selected;
  return toJsonObject({
    schemaVersion: "vibe-engineer.starter-preset-harness.v1",
    generatedAt: bootstrap.sourceRecord.generatedAt,
    adapterId: adapter.id,
    displayName: adapter.displayName,
    adapterCapabilityVersion: meta.adapterCapabilityVersion,
    generatedFileManifestVersion: meta.generatedFileManifestVersion,
    contextFiles: adapter.assetWriter.contextFiles,
    nativeAssetFamilies: adapter.assetWriter.nativeAssetFamilies,
    blockedAssetFamilies: adapter.assetWriter.blockedAssetFamilies,
    noFallbackToPi: adapter.assetWriter.noFallbackToPi,
    runtimePrerequisiteDiagnostic: adapter.runtimePrerequisiteDiagnostic,
  });
}

async function writeSelectedHarnessSurfaces(
  targetRoot: string,
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
  architectureRunnerImplemented: boolean,
): Promise<{
  selectedHarnessMetadataPath: string;
  selectedHarnessReadmePath: string;
  selectedHarnessHandoffPath: string;
  selectedHarnessMetadata: UnknownRecord;
}> {
  const harnessRoot = resolve(targetRoot, ".vibe", "harness");
  const selectedHarnessMetadataPath = resolve(harnessRoot, "selected-harness.json");
  const selectedHarnessReadmePath = resolve(harnessRoot, "README.md");
  const selectedHarnessHandoffPath = resolve(harnessRoot, "handoff.md");
  const selectedHarnessMetadata = buildSelectedHarnessMetadata(
    selected,
    bootstrap,
    architectureRunnerImplemented,
  );
  await mkdir(harnessRoot, { recursive: true });
  await writeFile(
    selectedHarnessMetadataPath,
    `${formatJsonForPrettier(toJsonValue(selectedHarnessMetadata))}\n`,
    "utf8",
  );
  await writeFile(
    selectedHarnessReadmePath,
    renderSelectedHarnessReadme(selected, bootstrap, architectureRunnerImplemented),
    "utf8",
  );
  await writeFile(selectedHarnessHandoffPath, renderHandoffMarkdown(selected), "utf8");
  return {
    selectedHarnessMetadataPath,
    selectedHarnessReadmePath,
    selectedHarnessHandoffPath,
    selectedHarnessMetadata,
  };
}

async function rewriteRunnerCatalogHarnessMetadata(
  targetRoot: string,
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
): Promise<{ path: string | null; mutationPath: string | null }> {
  const runnerCatalogPath = resolve(targetRoot, ".vibe", "registry", "runner-catalog.json");
  const catalogValue = await readJsonValueIfPresent(runnerCatalogPath);
  if (catalogValue === null) return { path: null, mutationPath: null };
  if (!Array.isArray(catalogValue)) {
    throw new Error(
      "Generated runner catalog must be a JSON array before harness metadata can be applied.",
    );
  }
  const harnessMetadata = runnerCatalogHarnessMetadata(selected, bootstrap);
  const rewritten = catalogValue.map((entry) =>
    isJsonObject(entry)
      ? {
          ...entry,
          vibeEngineerHarness: harnessMetadata,
        }
      : entry,
  );
  await writeFile(runnerCatalogPath, `${JSON.stringify(rewritten, null, 2)}\n`, "utf8");
  return {
    path: runnerCatalogPath,
    mutationPath: relativeProjectPath(targetRoot, runnerCatalogPath),
  };
}

async function rewriteStarterPresetHarnessMetadata(
  targetRoot: string,
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
): Promise<{ path: string | null; mutationPath: string | null }> {
  const starterPresetManifestPath = resolve(
    targetRoot,
    ".vibe",
    "generated",
    "nest-react-rn-preset",
    "manifest.json",
  );
  const manifest = await readJsonObjectIfPresent(starterPresetManifestPath);
  if (manifest === null) return { path: null, mutationPath: null };
  const layout = isJsonObject(manifest.layout) ? manifest.layout : {};
  const rewritten: JsonObject = {
    ...manifest,
    layout: {
      ...layout,
      agenticHarness: selected.adapter.id,
    },
    vibeEngineerHarness: starterPresetHarnessMetadata(selected, bootstrap),
  };
  await writeFile(starterPresetManifestPath, `${JSON.stringify(rewritten, null, 2)}\n`, "utf8");
  return {
    path: starterPresetManifestPath,
    mutationPath: relativeProjectPath(targetRoot, starterPresetManifestPath),
  };
}

async function rewriteStarterReferenceHarnessSection(
  targetRoot: string,
  selected: SelectedHarness,
): Promise<{ path: string | null; mutationPath: string | null }> {
  const starterReferencePath = resolve(targetRoot, "docs", "reference", "starter.md");
  if (!existsSync(starterReferencePath)) return { path: null, mutationPath: null };
  const current = await readFile(starterReferencePath, "utf8");
  const rewritten = replaceMarkedSection(
    current,
    "vibe-engineer:selected-harness",
    renderStarterHarnessSection(selected),
  );
  await writeFile(starterReferencePath, rewritten, "utf8");
  return {
    path: starterReferencePath,
    mutationPath: relativeProjectPath(targetRoot, starterReferencePath),
  };
}

function replaceMarkedSection(text: string, marker: string, replacement: string): string {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);
  if (startIndex >= 0 && endIndex > startIndex) {
    return `${text.slice(0, startIndex)}${replacement}${text.slice(endIndex + end.length)}`;
  }
  return `${text.trimEnd()}\n\n${replacement}\n`;
}

function renderContextMarkdown(
  kind: HarnessContextFile,
  bootstrap: BootstrapArtifacts,
  meta: ManifestMeta,
  adapter: HarnessAdapter,
): string {
  const { highLevel, sourceRecord } = bootstrap;
  const harnessVerb = sourceRecord.briefStatus === "provided" ? "create" : "create/import";
  const lines: string[] = [];
  lines.push("# " + highLevel.projectName + " — Project Context (" + kind + ")");
  lines.push("");
  lines.push(
    "> Bootstrap context generated by 'vibe-engineer " +
      harnessVerb +
      "'. This is sparse, provenance-labeled setup context — NOT a product plan. Every load-bearing statement carries a DL-17 provenance label.",
  );
  lines.push("");
  lines.push("## Setup facts");
  lines.push(
    provenanceLine(
      { label: "normalized_from_user", source: "create/import naming value" },
      "Project name: '" + highLevel.projectName + "' (slug '" + highLevel.projectSlug + "')",
    ),
  );
  lines.push(
    provenanceLine(
      { label: "harness_default", source: "selected harness adapter boundary" },
      "Selected agentic harness: '" + highLevel.selectedHarness + "' (" + adapter.displayName + ")",
    ),
  );
  lines.push(
    provenanceLine(
      { label: "harness_default", source: "selected harness generated-file manifest" },
      "Adapter capability version: '" + meta.adapterCapabilityVersion + "'",
    ),
  );
  lines.push(
    provenanceLine(
      { label: "harness_default", source: "selected harness generated-file manifest" },
      "Generated-file manifest version: '" + meta.generatedFileManifestVersion + "'",
    ),
  );
  lines.push("");
  if (sourceRecord.briefStatus === "provided") {
    lines.push("## Provided project brief (verbatim, user_provided)");
    lines.push("");
    lines.push("```text");
    lines.push(highLevel.briefSummary ?? "");
    lines.push("```");
    lines.push("");
    lines.push("## High-level context (sparse — unknowns are first-class)");
  } else {
    lines.push("## Brief status");
    lines.push("");
    lines.push(
      "Brief status: 'skipped' (placeholder — no user-provided brief). High-level product context is intentionally incomplete ('needs_user_context').",
    );
    lines.push("");
    lines.push("## High-level context (intentional placeholder)");
  }
  lines.push(
    provenanceLine(
      highLevel.goals.label === "unknown"
        ? { label: "unknown", source: highLevel.goals.source }
        : highLevel.goals,
      `Goals: ${highLevel.goals.label === "unknown" ? "unknown" : "(see above)"}`,
    ),
  );
  lines.push(
    provenanceLine(
      highLevel.constraints.label === "unknown"
        ? { label: "unknown", source: highLevel.constraints.source }
        : highLevel.constraints,
      `Constraints: ${highLevel.constraints.label === "unknown" ? "unknown" : "(see above)"}`,
    ),
  );
  lines.push(
    provenanceLine(
      highLevel.nonGoals.label === "unknown"
        ? { label: "unknown", source: highLevel.nonGoals.source }
        : highLevel.nonGoals,
      `Non-goals: ${highLevel.nonGoals.label === "unknown" ? "unknown" : "(see above)"}`,
    ),
  );
  lines.push(
    provenanceLine(
      highLevel.audience.label === "unknown"
        ? { label: "unknown", source: highLevel.audience.source }
        : highLevel.audience,
      `Audience/users: ${highLevel.audience.label === "unknown" ? "unknown" : "(see above)"}`,
    ),
  );
  lines.push(
    provenanceLine(
      highLevel.integrations.label === "unknown"
        ? { label: "unknown", source: highLevel.integrations.source }
        : highLevel.integrations,
      `Integrations: ${highLevel.integrations.label === "unknown" ? "unknown" : "(see above)"}`,
    ),
  );
  lines.push("");
  lines.push("## Unknowns");
  for (const item of highLevel.unknowns) lines.push(`- ${item} — provenance: unknown`);
  lines.push("");
  if (highLevel.brainstormInstruction !== null) {
    lines.push("## Next step (advisory)");
    lines.push("");
    lines.push(`> ${highLevel.brainstormInstruction} — provenance: harness_default (DL-17).`);
    lines.push("");
  }
  lines.push("## Provenance map");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(highLevel.provenanceMap, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Invariants (harness_default)");
  lines.push("");
  lines.push("- Product/package/CLI name: `vibe-engineer`.");
  lines.push(`- Six skills: ${VIBE_ENGINEER_SKILLS.join(", ")}.`);
  lines.push(
    "- Artifact flow: raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.",
  );
  lines.push(
    "- Anti-overdesign (DL-17): no roadmap, schema, domain model, architecture, users, integrations, or workflow is inferred from a sparse/skipped brief.",
  );
  lines.push("");
  return lines.join("\n");
}

export async function writeGeneratedArtifacts(
  targetRoot: string,
  bootstrap: BootstrapArtifacts,
  selected: SelectedHarness,
  options: { reset: boolean; starterScope?: GeneratedStarterScope | null },
): Promise<GeneratedArtifacts> {
  const { adapter, meta } = selected;
  const starterContextManifestPath = resolve(targetRoot, ".vibe", "context", "manifest.json");
  const starterContextManifest =
    options.reset && existsSync(starterContextManifestPath)
      ? await readFile(starterContextManifestPath, "utf8")
      : null;
  if (options.reset) {
    await rm(resolve(targetRoot, ".vibe", "context"), { recursive: true, force: true });
  }
  if (starterContextManifest !== null) {
    await mkdir(dirname(starterContextManifestPath), { recursive: true });
    await writeFile(starterContextManifestPath, starterContextManifest, "utf8");
  }

  // --- harness-config: vibe-engineer.config.json via @vibe-engineer/config (authority for agenticHarness) ---
  // WP-06 overlay contract: preserve the shipped starter structural block, then apply DL-17 harness defaults.
  const configPath = resolve(targetRoot, "vibe-engineer.config.json");
  const templateConfig = await readJsonObjectIfPresent(configPath);
  const configObject = getConfig({ agenticHarness: adapter.id });
  const mergedConfig =
    templateConfig === null ? configObject : mergeJsonObjects(templateConfig, configObject);
  applyStarterScopeToGeneratedConfig(mergedConfig, options.starterScope);
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(mergedConfig, null, 2)}\n`, "utf8");

  // --- selected context-files (DL-17 bootstrap context, provenance-labeled) ---
  const contextFiles: ContextFileRecord[] = [];
  let agentsPath: string | null = null;
  let claudePath: string | null = null;
  for (const contextFile of adapter.assetWriter.contextFiles) {
    const contextPath = resolve(targetRoot, contextFile);
    await writeFile(
      contextPath,
      renderContextMarkdown(contextFile, bootstrap, meta, adapter),
      "utf8",
    );
    contextFiles.push({ kind: contextFile, path: contextPath });
    if (contextFile === "AGENTS.md") agentsPath = contextPath;
    if (contextFile === "CLAUDE.md") claudePath = contextPath;
  }

  // --- bootstrap source record (DL-17) ---
  const sourceRecordPath = resolve(
    targetRoot,
    ".vibe",
    "context",
    "sources",
    "bootstrap-brief.json",
  );
  await mkdir(dirname(sourceRecordPath), { recursive: true });
  await writeFile(sourceRecordPath, `${JSON.stringify(bootstrap.sourceRecord, null, 2)}\n`, "utf8");

  // --- DL-09 context graph/index via the real context package (W-CONSUMER-CONTEXT producer side) ---
  const briefSourceContent =
    bootstrap.briefStatus === "provided"
      ? `# Bootstrap Project Brief (user_provided)\n\n${bootstrap.sourceRecord.briefText ?? ""}\n`
      : `# Bootstrap Brief Absence Record\n\nbrief_status: skipped\nNo user-provided project brief is available; high-level context is intentionally incomplete.\n`;
  const contextSources = [
    {
      sourceId: "src:bootstrap-brief",
      relativePath: ".vibe/context/sources/bootstrap-brief.md",
      content: briefSourceContent,
      kind: "source_doc",
      artifactRef: {
        artifactKind: "context_file_header",
        artifactId: "bootstrap-brief",
        path: ".vibe/context/sources/bootstrap-brief.md",
      },
      level: 1,
    },
  ];
  const contextAreas = [
    {
      areaId: "bootstrap",
      title: "Bootstrap Project Context",
      sourceRefs: ["src:bootstrap-brief"],
      context: [
        {
          contextId: "ctx:bootstrap:setup",
          level: 1,
          mandatory: true,
          text: `Project '${bootstrap.highLevel.projectName}' initialized with selected agentic harness '${bootstrap.highLevel.selectedHarness}'. Brief status: ${bootstrap.briefStatus}.`,
          sourceRefs: ["src:bootstrap-brief"],
          citationRefs: ["src:bootstrap-brief:sha256"],
        },
      ],
      scope: {
        kind: "repo",
        paths: ["."],
        description: "Domain-neutral bootstrap project context (DL-17).",
      },
    },
  ];
  const contextSummaries = [
    {
      summaryId: "bootstrap-high-level",
      title: "Bootstrap High-Level Context Summary",
      areaId: "bootstrap",
      sourceRefs: ["src:bootstrap-brief"],
      derivedFromNodeIds: ["ctx:bootstrap"],
      level: 2,
      mandatory: false,
      summary:
        bootstrap.briefStatus === "provided"
          ? "Sparse provided-brief high-level context; goals/constraints/integrations remain unknown (DL-17 anti-overdesign)."
          : `Intentional skipped-brief placeholder; ${bootstrap.highLevel.brainstormInstruction ?? "provide a project brief to create initial high-level context."}`,
    },
  ];
  const contextProject = await writeContext({
    projectRoot: targetRoot,
    reset: false,
    producer: bootstrap.sourceRecord.producer,
    sources: contextSources,
    areas: contextAreas,
    summaries: contextSummaries,
    links: [
      {
        linkId: "work:bootstrap-create",
        kind: "work",
        ref: {
          artifactKind: "implementation_plan",
          artifactId: "ip:bootstrap-create",
          path: ".vibe/work/bootstrap/create-result.json",
        },
        content: '{"status":"bootstrap"}\n',
      },
      {
        linkId: "decision:dl17",
        kind: "decision",
        ref: {
          artifactKind: "context_file_header",
          artifactId: "dl:17",
          path: "docs/decisions/DL-17-bootstrap-context-generation.md",
        },
        content: "# DL-17\nBootstrap context generation contract.\n",
      },
    ],
  });

  const architectureRunnerImplemented =
    options.starterScope !== null && options.starterScope !== undefined;
  const harnessSurfaces = await writeSelectedHarnessSurfaces(
    targetRoot,
    selected,
    bootstrap,
    architectureRunnerImplemented,
  );
  const runnerCatalog = await rewriteRunnerCatalogHarnessMetadata(targetRoot, selected, bootstrap);
  const starterPresetManifest = await rewriteStarterPresetHarnessMetadata(
    targetRoot,
    selected,
    bootstrap,
  );
  const starterReference = await rewriteStarterReferenceHarnessSection(targetRoot, selected);
  const architectureAgentReview = await writeArchitectureAgentReviewAssets(
    targetRoot,
    selected,
    bootstrap,
    options.starterScope,
  );
  const starterTemplateMutationPaths = [
    runnerCatalog.mutationPath,
    starterPresetManifest.mutationPath,
    starterReference.mutationPath,
    ...(architectureAgentReview?.mutationPaths ?? []),
  ].filter((pathValue): pathValue is string => typeof pathValue === "string");

  return {
    configPath,
    sourceRecordPath,
    selectedHarnessMetadataPath: harnessSurfaces.selectedHarnessMetadataPath,
    selectedHarnessReadmePath: harnessSurfaces.selectedHarnessReadmePath,
    selectedHarnessHandoffPath: harnessSurfaces.selectedHarnessHandoffPath,
    runnerCatalogPath: runnerCatalog.path,
    starterPresetManifestPath: starterPresetManifest.path,
    starterReferencePath: starterReference.path,
    architectureAgentReview,
    starterTemplateMutationPaths: [...new Set(starterTemplateMutationPaths)],
    harnessConfigMeta: {
      agenticHarness: adapter.id,
      adapterCapabilityVersion: meta.adapterCapabilityVersion,
      generatedFileManifestVersion: meta.generatedFileManifestVersion,
    },
    contextProject,
    bootstrap,
    selectedHarnessMetadata: harnessSurfaces.selectedHarnessMetadata,
    agentsPath,
    claudePath,
    contextFiles,
  };
}
