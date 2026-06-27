// I-15A shared selected-pi join + DL-17 bootstrap context + generated-file writers.
// Consumed by both `create` and `import` command modules (internal to create/** + import/** only).
// Node-24 native .ts type-stripping; type-annotation-only; `as unknown as` casts on JS/external siblings.
// Mirrors the accepted verify/index.ts + security/index.ts precedent (no strict cli tsconfig dependency).

import { existsSync, realpathSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";

import { createDefaultVibeConfig } from "@vibe-engineer/config";
import { writeContextProject } from "@vibe-engineer/context";
import {
  getPiAdapterCapabilityMatrix,
  isAdapterManifestSelectable,
  PI_ADAPTER_CAPABILITY_SCHEMA_VERSION,
  PI_ADAPTER_ID,
} from "@vibe-engineer/adapter-pi/capabilities";
import {
  getPiGeneratedFileManifest,
  PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION,
} from "@vibe-engineer/adapter-pi/generated-file-manifest";
import {
  validateCapabilityMatrix,
  validateGeneratedFileManifest,
} from "@vibe-engineer/adapter-pi/schema";

type UnknownRecord = Record<string, unknown>;

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

// Casts: workspace deps are JS/TS siblings; the precedent casts JS siblings `as unknown as`.
const getConfig = createDefaultVibeConfig as unknown as (options: UnknownRecord) => UnknownRecord;
const writeContext = writeContextProject as unknown as (options: UnknownRecord) => Promise<UnknownRecord>;
const getMatrix = getPiAdapterCapabilityMatrix as unknown as () => CapabilityMatrixApi;
const getManifest = getPiGeneratedFileManifest as unknown as () => GeneratedFileManifestApi;
const isManifestSelectable = isAdapterManifestSelectable as unknown as (matrix: CapabilityMatrixApi, adapterId: string) => boolean;
const validateMatrix = validateCapabilityMatrix as unknown as (value: unknown) => ValidationResultApi;
const validateManifest = validateGeneratedFileManifest as unknown as (value: unknown) => ValidationResultApi;

export const SELECTED_PI_HARNESS = "pi";
export const I15A_LANE_ID = "I-15A-create-import-cli-ux-selected-harness";
export const I15A_OWNED_FAMILIES = Object.freeze(["context-files", "harness-config"]);
export const DEFERRED_HARNESSES = Object.freeze(["claude-code", "codex", "opencode"]);
export const LATER_INTEGRATIONS = "later-integrations";
export const MAX_BRIEF_BYTES = 8192;
export const BRAINSTORM_INSTRUCTION =
  "Run the brainstorm skill with several sentences describing the project to create the initial Work Brief and project context.";

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

export type ResolveManifestError = { code: string; message: string; details: UnknownRecord };

// --- real-boundary manifest resolution + I-15A contract confirmation ---

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
    return { code: "INVALID_CAPABILITY_MATRIX", message: "Pi adapter capability matrix failed its own validator.", details: { errors: matrixValidation.errors ?? null } };
  }
  const manifestValidation = validateManifest(manifest);
  if (!manifestValidation.valid) {
    return { code: "INVALID_GENERATED_FILE_MANIFEST", message: "Pi generated-file manifest failed its own validator.", details: { errors: manifestValidation.errors ?? null } };
  }
  if (manifest.adapterId !== PI_ADAPTER_ID || matrix.adapterPackage !== "@vibe-engineer/adapter-pi") {
    return { code: "MANIFEST_ADAPTER_MISMATCH", message: "Loaded manifest does not identify the pi adapter.", details: { adapterId: manifest.adapterId, adapterPackage: matrix.adapterPackage } };
  }
  const ownedFamilies = manifest.families.filter((family) => family.producedByLane === I15A_LANE_ID);
  const ownedIds = new Set(ownedFamilies.map((family) => family.familyId));
  for (const expected of I15A_OWNED_FAMILIES) {
    if (!ownedIds.has(expected)) {
      return { code: "MANIFEST_FAMILY_DRIFT", message: `Expected I-15A-owned manifest family '${expected}' is absent.`, details: { expected, present: [...ownedIds] } };
    }
  }
  for (const family of ownedFamilies) {
    if (family.readiness.state !== "ready") {
      return { code: "MANIFEST_FAMILY_NOT_READY", message: `I-15A-owned family '${family.familyId}' is not ready.`, details: { familyId: family.familyId, state: family.readiness.state } };
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

export type HarnessGateError = { code: string; classification: string; message: string; details: UnknownRecord };

// Gate on manifest-selectability (NOT createImportSelectable — enabling create/import is THIS lane's job).
export function gateSelectedHarness(selected: SelectedManifest, requestedHarness: string | undefined): HarnessGateError | null {
  const harness = typeof requestedHarness === "string" && requestedHarness.length > 0 ? requestedHarness : SELECTED_PI_HARNESS;
  if (harness !== SELECTED_PI_HARNESS) {
    const deferred = DEFERRED_HARNESSES.includes(harness as never) || harness === LATER_INTEGRATIONS;
    return {
      code: deferred ? "DEFERRED_HARNESS_BLOCKED" : "UNSUPPORTED_HARNESS_BLOCKED",
      classification: "unsupported_operation",
      message: deferred
        ? `Harness '${harness}' is deferred in v1 and is not selectable; only the pi agentic harness is selectable.`
        : `Harness '${harness}' is not a supported agentic harness; only the pi agentic harness is selectable.`,
      details: { requestedHarness: harness, supported: [SELECTED_PI_HARNESS], deferred: [...DEFERRED_HARNESSES] },
    };
  }
  if (!isManifestSelectable(selected.matrix, SELECTED_PI_HARNESS)) {
    return {
      code: "PI_NOT_MANIFEST_SELECTABLE",
      classification: "missing_prerequisite",
      message: "The pi adapter is not manifest-selectable on disk; selected-harness join cannot proceed.",
      details: { adapterId: SELECTED_PI_HARNESS },
    };
  }
  return null;
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
  if (/\b(?:Bearer|token|password|passphrase|secret|api[_-]?key|credential|client[_-]?secret)\s*[:=]\s*\S+/iu.test(trimmed)) return true;
  return false;
}

export type BuildBootstrapInput = {
  projectName: string;
  selectedHarness: string;
  brief: string | null;
  generatedAt: string;
  producer: UnknownRecord;
};

// DL-17: provided-brief writes sparse provenance-labeled context (NO over-inference).
// We do NOT regex-extract goals/constraints/etc. (quality bar forbids heuristics standing in
// for typed contracts). Missing categories are classified `unknown` (an allowed inference).
// The brief text is recorded verbatim as `user_provided`.
export function buildBootstrap(input: BuildBootstrapInput): BootstrapArtifacts {
  const projectSlug = normalizeSlug(input.projectName);
  const rawBrief = input.brief ?? "";
  const trimmedBrief = rawBrief.trim();
  const briefStatus: BriefStatus = trimmedBrief.length === 0 ? "skipped" : "provided";
  const unknown = (reason: string): ProvenanceEntry => ({ label: "unknown", source: reason });

  const harnessDefault = (source: string): ProvenanceEntry => ({ label: "harness_default", source });

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
      selectedHarness: { label: "harness_default", source: "DL-06 agentic harness integration; pi is the only v1 selectable harness" },
      briefSummary: { label: "placeholder", source: "no user-provided brief" },
      goals: { label: "unknown", source: "no brief provided" },
      brainstormInstruction: { label: "harness_default", source: "DL-17 skipped-brief later-skill recommendation" },
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
      brainstormInstruction: BRAINSTORM_INSTRUCTION,
      status: "needs_user_context",
      provenanceMap,
    };
    return { briefStatus, sourceRecord, highLevel, provenanceMap };
  }

  // Provided brief: sparse — the brief text is the only user fact; everything else is unknown.
  const provenanceMap: UnknownRecord = {
    projectName: { label: "normalized_from_user", source: "create/import naming value" },
    projectSlug: { label: "normalized_from_user", source: "create/import naming value" },
    selectedHarness: { label: "harness_default", source: "DL-06 agentic harness integration; pi is the only v1 selectable harness" },
    briefSummary: { label: "user_provided", source: "user-provided project brief (verbatim)" },
    goals: { label: "unknown", source: "not explicitly extracted from the brief" },
    brainstormInstruction: { label: "harness_default", source: "DL-17 advisory refinement instruction for sparse briefs" },
  };
  const highLevel: BootstrapHighLevel = {
    projectName: input.projectName,
    projectSlug,
    selectedHarness: input.selectedHarness,
    briefSummary: trimmedBrief,
    goals: unknown("Goals are not explicitly and unambiguously extracted from the brief; refine via brainstorm."),
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
    brainstormInstruction: BRAINSTORM_INSTRUCTION,
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

export function resolveTargetRoot(projectRoot: string, targetRootValue: string, label: string): ResolveTargetResult {
  if (targetRootValue.trim().length === 0) return { ok: false, error: `${label} must be a non-empty path.` };
  const rootReal = realRoot(projectRoot);
  const resolved = isAbsolute(targetRootValue) ? resolve(targetRootValue) : resolve(rootReal, targetRootValue);
  if (!contained(rootReal, resolved)) return { ok: false, error: `${label} escapes the project root.` };
  return { ok: true, targetRoot: resolved };
}

export type GeneratedArtifacts = {
  configPath: string;
  agentsPath: string;
  claudePath: string;
  sourceRecordPath: string;
  harnessConfigMeta: {
    agenticHarness: string;
    adapterCapabilityVersion: string;
    generatedFileManifestVersion: string;
  };
  contextProject: UnknownRecord;
  bootstrap: BootstrapArtifacts;
};

function provenanceLine(entry: ProvenanceEntry | null | undefined, value: string): string {
  if (!entry) return `- (unknown) — provenance: unknown`;
  return `- ${value} — provenance: ${entry.label}${entry.source ? ` (${entry.source})` : ""}`;
}

function renderContextMarkdown(kind: "AGENTS.md" | "CLAUDE.md", bootstrap: BootstrapArtifacts, meta: ManifestMeta): string {
  const { highLevel, sourceRecord } = bootstrap;
  const harnessVerb = sourceRecord.briefStatus === "provided" ? "create" : "create/import";
  const lines: string[] = [];
  lines.push("# " + highLevel.projectName + " — Project Context (" + kind + ")");
  lines.push("");
  lines.push("> Bootstrap context generated by 'vibe-engineer " + harnessVerb + "'. This is sparse, provenance-labeled setup context — NOT a product plan. Every load-bearing statement carries a DL-17 provenance label.");
  lines.push("");
  lines.push("## Setup facts");
  lines.push(provenanceLine({ label: "normalized_from_user", source: "create/import naming value" }, "Project name: '" + highLevel.projectName + "' (slug '" + highLevel.projectSlug + "')"));
  lines.push(provenanceLine({ label: "harness_default", source: "DL-06 agentic harness integration" }, "Selected agentic harness: '" + highLevel.selectedHarness + "'"));
  lines.push(provenanceLine({ label: "harness_default", source: "DL-06 pi generated-file manifest" }, "Adapter capability version: '" + meta.adapterCapabilityVersion + "'"));
  lines.push(provenanceLine({ label: "harness_default", source: "DL-06 pi generated-file manifest" }, "Generated-file manifest version: '" + meta.generatedFileManifestVersion + "'"));
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
    lines.push("Brief status: 'skipped' (placeholder — no user-provided brief). High-level product context is intentionally incomplete ('needs_user_context').");
    lines.push("");
    lines.push("## High-level context (intentional placeholder)");
  }
  lines.push(provenanceLine(highLevel.goals.label === "unknown" ? { label: "unknown", source: highLevel.goals.source } : highLevel.goals, `Goals: ${highLevel.goals.label === "unknown" ? "unknown" : "(see above)"}`));
  lines.push(provenanceLine(highLevel.constraints.label === "unknown" ? { label: "unknown", source: highLevel.constraints.source } : highLevel.constraints, `Constraints: ${highLevel.constraints.label === "unknown" ? "unknown" : "(see above)"}`));
  lines.push(provenanceLine(highLevel.nonGoals.label === "unknown" ? { label: "unknown", source: highLevel.nonGoals.source } : highLevel.nonGoals, `Non-goals: ${highLevel.nonGoals.label === "unknown" ? "unknown" : "(see above)"}`));
  lines.push(provenanceLine(highLevel.audience.label === "unknown" ? { label: "unknown", source: highLevel.audience.source } : highLevel.audience, `Audience/users: ${highLevel.audience.label === "unknown" ? "unknown" : "(see above)"}`));
  lines.push(provenanceLine(highLevel.integrations.label === "unknown" ? { label: "unknown", source: highLevel.integrations.source } : highLevel.integrations, `Integrations: ${highLevel.integrations.label === "unknown" ? "unknown" : "(see above)"}`));
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
  lines.push("- Artifact flow: raw intent → Work Brief → Implementation Plan → Build Result → Ship Packet.");
  lines.push("- Anti-overdesign (DL-17): no roadmap, schema, domain model, architecture, users, integrations, or workflow is inferred from a sparse/skipped brief.");
  lines.push("");
  return lines.join("\n");
}

export async function writeGeneratedArtifacts(
  targetRoot: string,
  bootstrap: BootstrapArtifacts,
  meta: ManifestMeta,
  options: { reset: boolean },
): Promise<GeneratedArtifacts> {
  if (options.reset) {
    await rm(resolve(targetRoot, ".vibe", "context"), { recursive: true, force: true });
  }

  // --- harness-config: vibe-engineer.config.json via @vibe-engineer/config (authority for agenticHarness) ---
  const configObject = getConfig({ agenticHarness: SELECTED_PI_HARNESS });
  const configPath = resolve(targetRoot, "vibe-engineer.config.json");
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(configObject, null, 2)}\n`, "utf8");

  // --- context-files: AGENTS.md + CLAUDE.md (DL-17 bootstrap context, provenance-labeled) ---
  const agentsPath = resolve(targetRoot, "AGENTS.md");
  const claudePath = resolve(targetRoot, "CLAUDE.md");
  await writeFile(agentsPath, renderContextMarkdown("AGENTS.md", bootstrap, meta), "utf8");
  await writeFile(claudePath, renderContextMarkdown("CLAUDE.md", bootstrap, meta), "utf8");

  // --- bootstrap source record (DL-17) ---
  const sourceRecordPath = resolve(targetRoot, ".vibe", "context", "sources", "bootstrap-brief.json");
  await mkdir(dirname(sourceRecordPath), { recursive: true });
  await writeFile(sourceRecordPath, `${JSON.stringify(bootstrap.sourceRecord, null, 2)}\n`, "utf8");

  // --- DL-09 context graph/index via the real context package (W-CONSUMER-CONTEXT producer side) ---
  const briefSourceContent = bootstrap.briefStatus === "provided"
    ? `# Bootstrap Project Brief (user_provided)\n\n${bootstrap.sourceRecord.briefText ?? ""}\n`
    : `# Bootstrap Brief Absence Record\n\nbrief_status: skipped\nNo user-provided project brief is available; high-level context is intentionally incomplete.\n`;
  const contextSources = [
    {
      sourceId: "src:bootstrap-brief",
      relativePath: ".vibe/context/sources/bootstrap-brief.md",
      content: briefSourceContent,
      kind: "source_doc",
      artifactRef: { artifactKind: "context_file_header", artifactId: "bootstrap-brief", path: ".vibe/context/sources/bootstrap-brief.md" },
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
      scope: { kind: "repo", paths: ["."], description: "Domain-neutral bootstrap project context (DL-17)." },
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
      summary: bootstrap.briefStatus === "provided"
        ? "Sparse provided-brief high-level context; goals/constraints/integrations remain unknown (DL-17 anti-overdesign)."
        : "Intentional skipped-brief placeholder; run the brainstorm skill to create initial high-level context.",
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
      { linkId: "work:bootstrap-create", kind: "work", ref: { artifactKind: "implementation_plan", artifactId: "ip:bootstrap-create", path: ".vibe/work/bootstrap/create-result.json" }, content: '{"status":"bootstrap"}\n' },
      { linkId: "decision:dl17", kind: "decision", ref: { artifactKind: "context_file_header", artifactId: "dl:17", path: "docs/decisions/DL-17-bootstrap-context-generation.md" }, content: "# DL-17\nBootstrap context generation contract.\n" },
    ],
  });

  return {
    configPath,
    agentsPath,
    claudePath,
    sourceRecordPath,
    harnessConfigMeta: {
      agenticHarness: SELECTED_PI_HARNESS,
      adapterCapabilityVersion: meta.adapterCapabilityVersion,
      generatedFileManifestVersion: meta.generatedFileManifestVersion,
    },
    contextProject,
    bootstrap,
  };
}
