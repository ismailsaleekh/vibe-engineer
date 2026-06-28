import { getPiAdapterCapabilityMatrix } from "../capabilities/index.ts";
import { getPiGeneratedFileManifest } from "../generated-file-manifest/index.ts";
import {
  SKILL_IDS,
  validateCapabilityMatrix,
  validateGeneratedFileManifest,
  type AdapterCapabilityMatrix,
  type GeneratedFileFamily,
  type GeneratedFileFamilyId,
  type GeneratedFileManifest,
  type SkillId,
  type ValidationIssue,
} from "../schema/index.ts";

export const CREATE_PI_ASSET_FAMILIES = Object.freeze(["pi-skill-files", "pi-prompt-templates"] as const);
export type CreatePiAssetFamilyId = (typeof CREATE_PI_ASSET_FAMILIES)[number];
export type CreatePiAssetKind = "skill" | "prompt-template";
export type CreatePiAssetConflictPolicy = "fail-on-conflict" | "allow-identical-overwrite";
export type CreatePiAssetExistingPathKind = "missing" | "file" | "directory" | "symlink";

export interface CreatePiAssetDescriptor {
  readonly kind: CreatePiAssetKind;
  readonly familyId: CreatePiAssetFamilyId;
  readonly skillId: SkillId;
  readonly path: string;
  readonly shippedTemplatePath: string;
  readonly manifestPathPattern: string;
}

export interface CreatePiAssetPlannedWrite extends CreatePiAssetDescriptor {
  readonly content: string;
}

export interface CreatePiAssetExistingPathState {
  readonly path: string;
  readonly kind: CreatePiAssetExistingPathKind;
  readonly currentContent?: string;
}

export interface CreatePiAssetWritePlan {
  readonly conflictPolicy: CreatePiAssetConflictPolicy;
  readonly writes: readonly CreatePiAssetPlannedWrite[];
  readonly families: readonly CreatePiAssetFamilyId[];
}

export interface CreatePiAssetValidationIssue extends ValidationIssue {
  readonly severity: "error";
}

export type CreatePiAssetValidationResult<T> =
  | { readonly valid: true; readonly value: T; readonly issues: readonly [] }
  | { readonly valid: false; readonly issues: readonly CreatePiAssetValidationIssue[] };

const CREATE_CONSUMER_LANE = "I-15A-create-import-cli-ux-selected-harness";
const RUNTIME_PRODUCER_LANE = "I-14B-pi-adapter-runtime-skill-consumption";
const PI_SKILL_PATTERN = ".pi/skills/<skill>/SKILL.md";
const PI_PROMPT_PATTERN = ".pi/prompts/<name>.md";
const EXCLUDED_FAMILY_IDS = Object.freeze(["pi-extensions", "pi-package-manifest", "context-files", "harness-config"] as const);
const forbiddenDomainMarkers = (): readonly string[] => Object.freeze([
  "e" + "commerce",
  "fash" + "ion",
  "inven" + "tory",
  "ten" + "ant",
  "check" + "out",
  "tele" + "gram",
  "insta" + "gram",
  "bi" + "llz",
  "phar" + "macy",
  "ai-" + "pipeline",
]);

const isCreateFamilyId = (familyId: GeneratedFileFamilyId): familyId is CreatePiAssetFamilyId =>
  CREATE_PI_ASSET_FAMILIES.includes(familyId as CreatePiAssetFamilyId);

const issue = (issues: CreatePiAssetValidationIssue[], path: string, code: string, message: string): void => {
  issues.push({ path, code, message, severity: "error" });
};

const familyById = (manifest: GeneratedFileManifest, familyId: CreatePiAssetFamilyId): GeneratedFileFamily | undefined =>
  manifest.families.find((family) => family.familyId === familyId);

const sameStringSet = (actual: readonly string[], expected: readonly string[]): boolean => {
  if (actual.length !== expected.length) return false;
  const actualSet = new Set(actual);
  return actualSet.size === actual.length && expected.every((expectedValue) => actualSet.has(expectedValue));
};

const relativePathSafe = (path: string): boolean =>
  path.length > 0 && !path.startsWith("/") && !path.startsWith("~") && !path.includes(":\\") && !path.split("/").some((segment) => segment === "" || segment === "..");

const hasDomainMarker = (content: string): string | null => {
  const lower = content.toLowerCase();
  for (const marker of forbiddenDomainMarkers()) {
    if (lower.includes(marker.toLowerCase())) return marker;
  }
  return null;
};

const validateManifestAndMatrix = (
  manifest: GeneratedFileManifest,
  capabilityMatrix: AdapterCapabilityMatrix,
  issues: CreatePiAssetValidationIssue[],
): void => {
  const matrixValidation = validateCapabilityMatrix(capabilityMatrix);
  if (!matrixValidation.valid) {
    for (const matrixIssue of matrixValidation.issues) {
      issue(issues, `capabilityMatrix${matrixIssue.path.slice(1)}`, matrixIssue.code, matrixIssue.message);
    }
  }
  const manifestValidation = validateGeneratedFileManifest(manifest);
  if (!manifestValidation.valid) {
    for (const manifestIssue of manifestValidation.issues) {
      issue(issues, `generatedFileManifest${manifestIssue.path.slice(1)}`, manifestIssue.code, manifestIssue.message);
    }
  }
  const selectedFamilies = manifest.families.filter((family) => isCreateFamilyId(family.familyId));
  if (!sameStringSet(selectedFamilies.map((family) => family.familyId), [...CREATE_PI_ASSET_FAMILIES])) {
    issue(issues, "generatedFileManifest.families", "create_pi_asset_family_set_mismatch", "Create pi asset selector must be exactly pi-skill-files plus pi-prompt-templates.");
  }
  for (const familyId of CREATE_PI_ASSET_FAMILIES) {
    const family = familyById(manifest, familyId);
    if (family === undefined) {
      issue(issues, `generatedFileManifest.families.${familyId}`, "missing_create_pi_asset_family", `Required create pi asset family '${familyId}' is absent.`);
      continue;
    }
    if (family.readiness.state !== "ready") {
      issue(issues, `generatedFileManifest.families.${familyId}.readiness`, "create_pi_asset_family_not_ready", `Create pi asset family '${familyId}' must be ready.`);
    }
    if (family.producedByLane !== RUNTIME_PRODUCER_LANE) {
      issue(issues, `generatedFileManifest.families.${familyId}.producedByLane`, "create_pi_asset_family_wrong_producer", `Create pi asset family '${familyId}' must be produced by ${RUNTIME_PRODUCER_LANE}.`);
    }
    if (!family.consumedByLanes.includes(CREATE_CONSUMER_LANE)) {
      issue(issues, `generatedFileManifest.families.${familyId}.consumedByLanes`, "create_pi_asset_family_not_consumed_by_create", `Create pi asset family '${familyId}' must be consumed by ${CREATE_CONSUMER_LANE}.`);
    }
  }
  for (const excludedFamilyId of EXCLUDED_FAMILY_IDS) {
    if (CREATE_PI_ASSET_FAMILIES.includes(excludedFamilyId as CreatePiAssetFamilyId)) {
      issue(issues, `generatedFileManifest.families.${excludedFamilyId}`, "blocked_or_i15a_family_selected", `Family '${excludedFamilyId}' must never be selected for create pi asset writes.`);
    }
  }
};

const promptPath = (skillId: SkillId): string => `.pi/prompts/vibe-${skillId}.md`;
const skillPath = (skillId: SkillId): string => `.pi/skills/${skillId}/SKILL.md`;

export const selectCreatePiAssets = (input?: { readonly manifest?: GeneratedFileManifest; readonly capabilityMatrix?: AdapterCapabilityMatrix }): readonly CreatePiAssetDescriptor[] => {
  const manifest = input?.manifest ?? getPiGeneratedFileManifest();
  const capabilityMatrix = input?.capabilityMatrix ?? getPiAdapterCapabilityMatrix();
  const issues: CreatePiAssetValidationIssue[] = [];
  validateManifestAndMatrix(manifest, capabilityMatrix, issues);
  const skillFamily = familyById(manifest, "pi-skill-files");
  const promptFamily = familyById(manifest, "pi-prompt-templates");
  if (skillFamily !== undefined && !skillFamily.pathPatterns.includes(PI_SKILL_PATTERN)) {
    issue(issues, "generatedFileManifest.families.pi-skill-files.pathPatterns", "missing_pi_skill_path_pattern", "Create pi assets require the .pi skill path pattern, not an alternate only.");
  }
  if (promptFamily !== undefined && !promptFamily.pathPatterns.includes(PI_PROMPT_PATTERN)) {
    issue(issues, "generatedFileManifest.families.pi-prompt-templates.pathPatterns", "missing_pi_prompt_path_pattern", "Create pi assets require the .pi prompt path pattern.");
  }
  if (issues.length > 0) {
    throw new CreatePiAssetValidationError("Create pi asset family selection failed.", issues);
  }
  return Object.freeze([
    ...SKILL_IDS.map((skillId): CreatePiAssetDescriptor => ({
      kind: "skill",
      familyId: "pi-skill-files",
      skillId,
      path: skillPath(skillId),
      shippedTemplatePath: `templates/pi/runtime-fixtures/${skillPath(skillId)}`,
      manifestPathPattern: PI_SKILL_PATTERN,
    })),
    ...SKILL_IDS.map((skillId): CreatePiAssetDescriptor => ({
      kind: "prompt-template",
      familyId: "pi-prompt-templates",
      skillId,
      path: promptPath(skillId),
      shippedTemplatePath: `templates/pi/runtime-fixtures/${promptPath(skillId)}`,
      manifestPathPattern: PI_PROMPT_PATTERN,
    })),
  ]);
};

export class CreatePiAssetValidationError extends Error {
  readonly issues: readonly CreatePiAssetValidationIssue[];

  constructor(message: string, issues: readonly CreatePiAssetValidationIssue[]) {
    super(message);
    this.name = "CreatePiAssetValidationError";
    this.issues = issues;
    Object.setPrototypeOf(this, CreatePiAssetValidationError.prototype);
  }
}

export const validateCreatePiAssetWritePlan = (input: {
  readonly manifest: GeneratedFileManifest;
  readonly capabilityMatrix: AdapterCapabilityMatrix;
  readonly writes: readonly CreatePiAssetPlannedWrite[];
  readonly existingPaths: readonly CreatePiAssetExistingPathState[];
  readonly conflictPolicy: CreatePiAssetConflictPolicy;
}): CreatePiAssetValidationResult<CreatePiAssetWritePlan> => {
  const issues: CreatePiAssetValidationIssue[] = [];
  validateManifestAndMatrix(input.manifest, input.capabilityMatrix, issues);
  let expectedAssets: readonly CreatePiAssetDescriptor[] = [];
  try {
    expectedAssets = selectCreatePiAssets({ manifest: input.manifest, capabilityMatrix: input.capabilityMatrix });
  } catch (error) {
    if (error instanceof CreatePiAssetValidationError) {
      issues.push(...error.issues);
    } else {
      issue(issues, "generatedFileManifest", "create_pi_asset_selection_failed", "Create pi asset selector failed unexpectedly.");
    }
  }
  const expectedByPath = new Map(expectedAssets.map((asset) => [asset.path, asset]));
  if (input.writes.length !== expectedAssets.length) {
    issue(issues, "writes", "create_pi_asset_write_count_mismatch", "Create pi asset write plan must contain exactly six skill files and six prompt templates.");
  }
  const seenPaths = new Set<string>();
  for (let index = 0; index < input.writes.length; index += 1) {
    const write = input.writes[index];
    if (write === undefined) {
      issue(issues, `writes[${index}]`, "missing_write", "Create pi asset write is missing.");
      continue;
    }
    if (!relativePathSafe(write.path)) {
      issue(issues, `writes[${index}].path`, "unsafe_write_path", "Create pi asset write path must be relative and non-traversing.");
    }
    if (seenPaths.has(write.path)) {
      issue(issues, `writes[${index}].path`, "duplicate_write_path", "Create pi asset write paths must be unique.");
    }
    seenPaths.add(write.path);
    const expected = expectedByPath.get(write.path);
    if (expected === undefined) {
      issue(issues, `writes[${index}].path`, "write_path_not_in_create_pi_asset_manifest", "Write path is not one of the selected create pi asset paths.");
    } else if (write.familyId !== expected.familyId || write.kind !== expected.kind || write.skillId !== expected.skillId || write.manifestPathPattern !== expected.manifestPathPattern || write.shippedTemplatePath !== expected.shippedTemplatePath) {
      issue(issues, `writes[${index}]`, "write_descriptor_mismatch", "Write descriptor must match the selected create pi asset descriptor exactly.");
    }
    if (write.content.trim().length === 0) {
      issue(issues, `writes[${index}].content`, "empty_create_pi_asset_content", "Create pi asset content must be non-empty.");
    }
    const marker = hasDomainMarker(write.content);
    if (marker !== null) {
      issue(issues, `writes[${index}].content`, "create_pi_asset_domain_marker", `Create pi asset content contains forbidden domain marker '${marker}'.`);
    }
  }
  for (const expected of expectedAssets) {
    if (!seenPaths.has(expected.path)) {
      issue(issues, `writes.${expected.path}`, "missing_create_pi_asset_write", `Missing create pi asset write for ${expected.path}.`);
    }
  }
  const existingByPath = new Map(input.existingPaths.map((entry) => [entry.path, entry]));
  for (const write of input.writes) {
    const pathSegments = write.path.split("/");
    for (let segmentCount = 1; segmentCount < pathSegments.length; segmentCount += 1) {
      const parentPath = pathSegments.slice(0, segmentCount).join("/");
      const parent = existingByPath.get(parentPath);
      if (parent === undefined || parent.kind === "missing" || parent.kind === "directory") continue;
      if (parent.kind === "symlink") {
        issue(issues, `existingPaths.${parentPath}`, "ancestor_symlink_write_escape", "Create pi asset write refuses symlink ancestors because they may escape the project root.");
      } else {
        issue(issues, `existingPaths.${parentPath}`, "parent_path_not_directory", "Create pi asset write requires every existing parent path to be a directory.");
      }
    }
    const existing = existingByPath.get(write.path);
    if (existing === undefined || existing.kind === "missing") continue;
    if (existing.kind === "symlink") {
      issue(issues, `existingPaths.${write.path}`, "symlink_write_escape", "Create pi asset write refuses symlink targets because they may escape the project root.");
      continue;
    }
    if (existing.kind === "directory") {
      issue(issues, `existingPaths.${write.path}`, "unsafe_overwrite_conflict", "Create pi asset write refuses to overwrite a directory.");
      continue;
    }
    if (input.conflictPolicy === "fail-on-conflict") {
      issue(issues, `existingPaths.${write.path}`, "unsafe_overwrite_conflict", "Create pi asset write refuses existing files under fail-on-conflict policy.");
      continue;
    }
    if (existing.currentContent !== write.content) {
      issue(issues, `existingPaths.${write.path}`, "unsafe_overwrite_conflict", "Create pi asset write only permits identical-content overwrites in import mode.");
    }
  }
  if (issues.length > 0) {
    return { valid: false, issues };
  }
  return {
    valid: true,
    value: {
      conflictPolicy: input.conflictPolicy,
      writes: input.writes,
      families: [...CREATE_PI_ASSET_FAMILIES],
    },
    issues: [],
  };
};
