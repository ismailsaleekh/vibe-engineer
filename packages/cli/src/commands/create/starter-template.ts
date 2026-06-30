import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CliClassification, CliErrorCode } from "../../errors/codes.js";
import { normalizeSlug } from "./selected-harness.ts";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type LayoutFile = {
  path: string;
  bytes: number;
  sha256: string;
};

type StarterLayout = {
  schemaVersion: "vibe-engineer.templates.starter-layout.v1";
  generatedBy: string;
  sourceRoot: string;
  shippedRoot: "templates/starter";
  fileCount: number;
  files: LayoutFile[];
};

type MaterializeMode = "create";

type LocalWorkspaceDependency = {
  packageName: string;
  relativePackageDir: string;
};

type StarterDependencyPlan = {
  cliDependency: string;
  nodeExecPath: string;
  runnerPathEnv: string;
  sourceWorkspaceRoot: string | null;
  pnpmOverrides: JsonObject | null;
};

export type StarterMaterializationResult = {
  packageRoot: string;
  templateRoot: string;
  layoutPath: string;
  fileCount: number;
  writtenFiles: string[];
  overlayPaths: string[];
  substitutionPaths: string[];
  projectSlug: string;
};

export class StarterTemplateError extends Error {
  readonly code: string;
  readonly classification: string;
  readonly details: JsonObject;

  constructor(input: {
    code: string;
    classification: string;
    message: string;
    details?: JsonObject;
  }) {
    super(input.message);
    this.name = "StarterTemplateError";
    this.code = input.code;
    this.classification = input.classification;
    this.details = input.details ?? {};
    Object.setPrototypeOf(this, StarterTemplateError.prototype);
  }
}

export function isStarterTemplateError(error: unknown): error is StarterTemplateError {
  return error instanceof StarterTemplateError;
}

const STARTER_LAYOUT_SCHEMA_VERSION = "vibe-engineer.templates.starter-layout.v1";
const STARTER_SHIPPED_ROOT = "templates/starter";
const STARTER_LAYOUT_FILE = "templates/starter.layout.json";
const OVERLAY_PATHS = Object.freeze(["vibe-engineer.config.json", ".vibe/context/manifest.json"]);
const STATIC_SUBSTITUTION_PATHS = Object.freeze(["package.json", ".vibe/registry/runner-catalog.json"]);
const TEMPLATE_PACKAGE_SCOPE = "@vibe-engineer-starter";
const TEMPLATE_SLUG = "vibe-engineer-starter";
const TEMPLATE_TITLE = "Vibe Engineer Starter";
const MATERIALIZED_PATH_RENAMES = Object.freeze(
  new Map<string, string>([["_gitignore", ".gitignore"]]),
);
const LOCAL_WORKSPACE_DEPENDENCIES = Object.freeze<readonly LocalWorkspaceDependency[]>([
  { packageName: "@vibe-engineer/adapter-pi", relativePackageDir: "packages/adapters/pi" },
  { packageName: "@vibe-engineer/artifacts", relativePackageDir: "packages/artifacts" },
  { packageName: "@vibe-engineer/config", relativePackageDir: "packages/config" },
  { packageName: "@vibe-engineer/context", relativePackageDir: "packages/context" },
  { packageName: "@vibe-engineer/security", relativePackageDir: "packages/security" },
  { packageName: "@vibe-engineer/schematics", relativePackageDir: "packages/schematics" },
  { packageName: "@vibe-engineer/skills", relativePackageDir: "packages/skills" },
  { packageName: "@vibe-engineer/verification", relativePackageDir: "packages/verification" },
]);

function templateError(input: {
  code: string;
  classification?: string;
  message: string;
  details?: JsonObject;
}): StarterTemplateError {
  return new StarterTemplateError({
    code: input.code,
    classification: input.classification ?? CliClassification.InvalidConfig,
    message: input.message,
    details: input.details,
  });
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateParsedJsonObject(value: unknown, path: string): JsonObject {
  if (!isJsonObject(value)) {
    throw templateError({
      code: CliErrorCode.InvalidConfig,
      message: "Starter template JSON root must be an object.",
      details: { starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_JSON", path },
    });
  }
  return value;
}

function parseJsonObject(text: string, path: string): JsonObject {
  try {
    return validateParsedJsonObject(JSON.parse(text), path);
  } catch (error) {
    if (isStarterTemplateError(error)) throw error;
    throw templateError({
      code: CliErrorCode.InvalidConfig,
      message: "Starter template JSON could not be parsed.",
      details: {
        starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_JSON",
        path,
        errorMessage: error instanceof Error ? error.message : null,
      },
    });
  }
}

function parseJsonValue(text: string, path: string): JsonValue {
  try {
    return JSON.parse(text) as JsonValue;
  } catch (error) {
    throw templateError({
      code: CliErrorCode.InvalidConfig,
      message: "Starter template JSON could not be parsed.",
      details: {
        starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_JSON",
        path,
        errorMessage: error instanceof Error ? error.message : null,
      },
    });
  }
}

function validateRelativeTemplatePath(pathValue: unknown): string {
  if (typeof pathValue !== "string" || pathValue.length === 0) {
    throw templateError({
      code: CliErrorCode.InvalidConfig,
      message: "Starter layout entry path must be a non-empty string.",
      details: { starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_LAYOUT" },
    });
  }
  if (
    pathValue.startsWith("/") ||
    pathValue.includes("\\") ||
    pathValue.split("/").includes("..") ||
    pathValue.split("/").includes("")
  ) {
    throw templateError({
      code: CliErrorCode.InvalidConfig,
      message: "Starter layout entry path must be a safe relative POSIX path.",
      details: { starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_LAYOUT", path: pathValue },
    });
  }
  return pathValue;
}

function validateSha(value: unknown, pathValue: string): string {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(value)) {
    throw templateError({
      code: CliErrorCode.InvalidConfig,
      message: "Starter layout entry has an invalid sha256 field.",
      details: { starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_LAYOUT", path: pathValue },
    });
  }
  return value;
}

function validateLayout(value: JsonObject, layoutPath: string): StarterLayout {
  if (value.schemaVersion !== STARTER_LAYOUT_SCHEMA_VERSION) {
    throw templateError({
      code: CliErrorCode.MissingConfig,
      classification: CliClassification.MissingPrerequisite,
      message: "Starter layout schema version is not supported.",
      details: {
        starterTemplateCode: "VE_STARTER_TEMPLATE_SCHEMA_MISMATCH",
        layoutPath,
        expected: STARTER_LAYOUT_SCHEMA_VERSION,
        actual: typeof value.schemaVersion === "string" ? value.schemaVersion : null,
      },
    });
  }
  if (
    typeof value.generatedBy !== "string" ||
    typeof value.sourceRoot !== "string" ||
    value.shippedRoot !== STARTER_SHIPPED_ROOT
  ) {
    throw templateError({
      code: CliErrorCode.InvalidConfig,
      message: "Starter layout metadata is invalid.",
      details: { starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_LAYOUT", layoutPath },
    });
  }
  if (
    typeof value.fileCount !== "number" ||
    !Number.isInteger(value.fileCount) ||
    value.fileCount < 1 ||
    !Array.isArray(value.files)
  ) {
    throw templateError({
      code: CliErrorCode.InvalidConfig,
      message: "Starter layout file list is invalid.",
      details: { starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_LAYOUT", layoutPath },
    });
  }
  const files: LayoutFile[] = value.files.map((entry) => {
    if (!isJsonObject(entry)) {
      throw templateError({
        code: CliErrorCode.InvalidConfig,
        message: "Starter layout file entry must be an object.",
        details: { starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_LAYOUT", layoutPath },
      });
    }
    const pathValue = validateRelativeTemplatePath(entry.path);
    if (typeof entry.bytes !== "number" || !Number.isInteger(entry.bytes) || entry.bytes < 0) {
      throw templateError({
        code: CliErrorCode.InvalidConfig,
        message: "Starter layout entry has an invalid byte count.",
        details: { starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_LAYOUT", path: pathValue },
      });
    }
    return { path: pathValue, bytes: entry.bytes, sha256: validateSha(entry.sha256, pathValue) };
  });
  if (files.length !== value.fileCount) {
    throw templateError({
      code: CliErrorCode.InvalidConfig,
      message: "Starter layout fileCount does not match files length.",
      details: {
        starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_LAYOUT",
        layoutPath,
        fileCount: value.fileCount,
        filesLength: files.length,
      },
    });
  }
  const seen = new Set<string>();
  for (const file of files) {
    if (seen.has(file.path)) {
      throw templateError({
        code: CliErrorCode.InvalidConfig,
        message: "Starter layout contains a duplicate path.",
        details: { starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_LAYOUT", path: file.path },
      });
    }
    seen.add(file.path);
  }
  for (const overlayPath of OVERLAY_PATHS) {
    if (!seen.has(overlayPath)) {
      throw templateError({
        code: CliErrorCode.InvalidConfig,
        message: "Starter layout is missing a required overlay path.",
        details: { starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_LAYOUT", path: overlayPath },
      });
    }
  }
  for (const substitutionPath of STATIC_SUBSTITUTION_PATHS) {
    if (!seen.has(substitutionPath)) {
      throw templateError({
        code: CliErrorCode.InvalidConfig,
        message: "Starter layout is missing a required substitution path.",
        details: {
          starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_LAYOUT",
          path: substitutionPath,
        },
      });
    }
  }
  return {
    schemaVersion: STARTER_LAYOUT_SCHEMA_VERSION,
    generatedBy: value.generatedBy,
    sourceRoot: value.sourceRoot,
    shippedRoot: STARTER_SHIPPED_ROOT,
    fileCount: value.fileCount,
    files,
  };
}

function fileSha256(buffer: Buffer): string {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

async function loadLayout(layoutPath: string): Promise<StarterLayout> {
  let text: string;
  try {
    text = await readFile(layoutPath, "utf8");
  } catch (error) {
    throw templateError({
      code: CliErrorCode.MissingConfig,
      classification: CliClassification.MissingPrerequisite,
      message: "Starter layout manifest could not be read from the installed package.",
      details: {
        starterTemplateCode: "VE_STARTER_TEMPLATE_LAYOUT_MISSING",
        layoutPath,
        errorMessage: error instanceof Error ? error.message : null,
      },
    });
  }
  return validateLayout(parseJsonObject(text, layoutPath), layoutPath);
}

function assertUnder(parent: string, child: string, label: string): void {
  const rel = relative(parent, child);
  if (rel === "" || rel.startsWith("..")) {
    throw templateError({
      code: CliErrorCode.InvalidConfig,
      message: `${label} resolved outside its expected root.`,
      details: { starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_LAYOUT", parent, child },
    });
  }
}

export function resolveVibeEngineerPackageRoot(): string {
  const resolvedEntry = import.meta.resolve("vibe-engineer");
  if (!resolvedEntry.startsWith("file:")) {
    throw templateError({
      code: CliErrorCode.MissingConfig,
      classification: CliClassification.MissingPrerequisite,
      message: "The installed vibe-engineer package did not resolve to a file URL.",
      details: { starterTemplateCode: "VE_STARTER_TEMPLATE_UNRESOLVED", resolvedEntry },
    });
  }
  const entryPath = fileURLToPath(resolvedEntry);
  let cursor = dirname(entryPath);
  for (let depth = 0; depth < 8; depth += 1) {
    const layoutPath = join(cursor, STARTER_LAYOUT_FILE);
    const templateRoot = join(cursor, STARTER_SHIPPED_ROOT);
    if (existsSync(layoutPath) && existsSync(templateRoot)) return cursor;
    const next = dirname(cursor);
    if (next === cursor) break;
    cursor = next;
  }
  throw templateError({
    code: CliErrorCode.MissingConfig,
    classification: CliClassification.MissingPrerequisite,
    message:
      "The installed vibe-engineer package root could not be derived from the exported entrypoint.",
    details: {
      starterTemplateCode: "VE_STARTER_TEMPLATE_ROOT_NOT_FOUND",
      resolvedEntry,
      entryPath,
    },
  });
}

async function assertTargetRootEmpty(targetRoot: string): Promise<void> {
  if (!existsSync(targetRoot)) return;
  const targetStat = await stat(targetRoot);
  if (!targetStat.isDirectory()) {
    throw templateError({
      code: CliErrorCode.InvalidInvocation,
      classification: CliClassification.WriteConflict,
      message: "Create target root exists and is not a directory.",
      details: { starterTemplateCode: "VE_STARTER_TEMPLATE_TARGET_CONFLICT", targetRoot },
    });
  }
  const entries = await readdir(targetRoot);
  if (entries.length > 0) {
    throw templateError({
      code: CliErrorCode.InvalidInvocation,
      classification: CliClassification.WriteConflict,
      message:
        "Create target root is not empty; starter materialization is non-destructive and will not clobber existing files.",
      details: {
        starterTemplateCode: "VE_STARTER_TEMPLATE_TARGET_CONFLICT",
        targetRoot,
        entryCount: entries.length,
        sampleEntries: entries.slice(0, 10),
      },
    });
  }
}

function applyTypedSubstitution(
  relativePath: string,
  content: Buffer,
  projectName: string,
  dependencyPlan: StarterDependencyPlan,
): { content: Buffer; changed: boolean } {
  const originalText = content.toString("utf8");
  const projectSlug = normalizeSlug(projectName);
  let rewrittenText = originalText
    .replaceAll("__VIBE_PROJECT_NAME__", projectName)
    .replaceAll("__VIBE_PROJECT_SLUG__", projectSlug)
    .replaceAll("__VIBE_PACKAGE_SCOPE__", `@${projectSlug}`)
    .replaceAll(TEMPLATE_PACKAGE_SCOPE, `@${projectSlug}`)
    .replaceAll(TEMPLATE_TITLE, projectName)
    .replaceAll(TEMPLATE_SLUG, projectSlug);

  if (relativePath === "package.json") {
    const object = parseJsonObject(rewrittenText, relativePath);
    if (typeof object.name !== "string") {
      throw templateError({
        code: CliErrorCode.InvalidConfig,
        message:
          "Root package.json must contain a string name field for typed project-name substitution.",
        details: {
          starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_SUBSTITUTION",
          path: relativePath,
        },
      });
    }
    applyRootPackageDependencyPlan(object, dependencyPlan);
    rewrittenText = `${JSON.stringify(object, null, 2)}\n`;
  }

  if (relativePath === ".vibe/registry/runner-catalog.json") {
    const withNode = replaceJsonString(parseJsonValue(rewrittenText, relativePath), "__VIBE_NODE_EXEC_PATH__", dependencyPlan.nodeExecPath);
    const withPath = replaceJsonString(withNode, "__VIBE_RUNNER_PATH__", dependencyPlan.runnerPathEnv);
    rewrittenText = `${JSON.stringify(withPath, null, 2)}\n`;
  }

  return { content: Buffer.from(rewrittenText, "utf8"), changed: rewrittenText !== originalText };
}

function materializedRelativePath(sourceRelativePath: string): string {
  return MATERIALIZED_PATH_RENAMES.get(sourceRelativePath) ?? sourceRelativePath;
}

function fileDependency(dependencyPackageRoot: string): string {
  return `file:${dependencyPackageRoot.replaceAll("\\", "/")}`;
}

function detectSourceWorkspaceRoot(packageRoot: string): string | null {
  if (packageRoot.includes("node_modules")) return null;
  const workspaceRoot = resolve(packageRoot, "../..");
  if (
    existsSync(join(workspaceRoot, "pnpm-workspace.yaml")) &&
    existsSync(join(workspaceRoot, "packages/cli/package.json"))
  ) {
    return workspaceRoot;
  }
  return null;
}

async function createStarterDependencyPlan(packageRoot: string): Promise<StarterDependencyPlan> {
  const packageJson = parseJsonObject(await readFile(join(packageRoot, "package.json"), "utf8"), join(packageRoot, "package.json"));
  const version = typeof packageJson.version === "string" && packageJson.version.length > 0 ? packageJson.version : "0.0.0";
  const sourceWorkspaceRoot = detectSourceWorkspaceRoot(packageRoot);
  if (sourceWorkspaceRoot === null) {
    return {
      cliDependency: version,
      nodeExecPath: process.execPath,
      runnerPathEnv: process.env.PATH ?? "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
      sourceWorkspaceRoot: null,
      pnpmOverrides: null,
    };
  }

  const overrides: JsonObject = {};
  for (const dependency of LOCAL_WORKSPACE_DEPENDENCIES) {
    const dependencyRoot = join(sourceWorkspaceRoot, dependency.relativePackageDir);
    if (existsSync(join(dependencyRoot, "package.json"))) {
      overrides[dependency.packageName] = fileDependency(dependencyRoot);
    }
  }
  return {
    cliDependency: fileDependency(packageRoot),
    nodeExecPath: process.execPath,
    runnerPathEnv: process.env.PATH ?? "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
    sourceWorkspaceRoot,
    pnpmOverrides: overrides,
  };
}

function applyRootPackageDependencyPlan(object: JsonObject, dependencyPlan: StarterDependencyPlan): void {
  const devDependencies = isJsonObject(object.devDependencies) ? object.devDependencies : {};
  devDependencies["vibe-engineer"] = dependencyPlan.cliDependency;
  object.devDependencies = devDependencies;
  if (dependencyPlan.pnpmOverrides !== null) {
    const pnpm = isJsonObject(object.pnpm) ? object.pnpm : {};
    pnpm.overrides = dependencyPlan.pnpmOverrides;
    object.pnpm = pnpm;
  }
}

function replaceJsonString(value: JsonValue, needle: string, replacement: string): JsonValue {
  if (typeof value === "string") return value === needle ? replacement : value;
  if (Array.isArray(value)) return value.map((entry) => replaceJsonString(entry, needle, replacement));
  if (isJsonObject(value)) {
    const output: JsonObject = {};
    for (const [key, entry] of Object.entries(value)) output[key] = replaceJsonString(entry, needle, replacement);
    return output;
  }
  return value;
}

async function loadVerifiedSourceFiles(
  templateRoot: string,
  layout: StarterLayout,
  projectName: string,
  dependencyPlan: StarterDependencyPlan,
): Promise<{ files: Array<{ relativePath: string; targetRelativePath: string; content: Buffer }>; substitutionPaths: string[] }> {
  const files: Array<{ relativePath: string; targetRelativePath: string; content: Buffer }> = [];
  const substitutionPaths: string[] = [];
  for (const entry of layout.files) {
    const sourcePath = resolve(templateRoot, ...entry.path.split("/"));
    assertUnder(templateRoot, sourcePath, "Starter template source file");
    let sourceContent: Buffer;
    try {
      sourceContent = await readFile(sourcePath);
    } catch (error) {
      throw templateError({
        code: CliErrorCode.MissingConfig,
        classification: CliClassification.MissingPrerequisite,
        message: "A starter template source file listed in the layout manifest is missing.",
        details: {
          starterTemplateCode: "VE_STARTER_TEMPLATE_SOURCE_MISSING",
          path: entry.path,
          sourcePath,
          errorMessage: error instanceof Error ? error.message : null,
        },
      });
    }
    if (sourceContent.byteLength !== entry.bytes || fileSha256(sourceContent) !== entry.sha256) {
      throw templateError({
        code: CliErrorCode.MissingConfig,
        classification: CliClassification.MissingPrerequisite,
        message: "A shipped starter template file does not match the layout manifest.",
        details: {
          starterTemplateCode: "VE_STARTER_TEMPLATE_SOURCE_HASH_MISMATCH",
          path: entry.path,
          expectedBytes: entry.bytes,
          actualBytes: sourceContent.byteLength,
          expectedSha256: entry.sha256,
          actualSha256: fileSha256(sourceContent),
        },
      });
    }
    const substituted = applyTypedSubstitution(entry.path, sourceContent, projectName, dependencyPlan);
    if (substituted.changed) substitutionPaths.push(entry.path);
    files.push({
      relativePath: entry.path,
      targetRelativePath: materializedRelativePath(entry.path),
      content: substituted.content,
    });
  }
  return { files, substitutionPaths };
}

export async function materializeStarterTree(
  targetRoot: string,
  options: { projectName: string; mode: MaterializeMode },
): Promise<StarterMaterializationResult> {
  if (options.mode !== "create") {
    throw templateError({
      code: CliErrorCode.InternalError,
      classification: CliClassification.InternalError,
      message: "Starter materialization is only valid for create mode.",
      details: { starterTemplateCode: "VE_STARTER_TEMPLATE_INVALID_MODE", mode: options.mode },
    });
  }

  const packageRoot = resolveVibeEngineerPackageRoot();
  const layoutPath = join(packageRoot, STARTER_LAYOUT_FILE);
  const templateRoot = join(packageRoot, STARTER_SHIPPED_ROOT);
  const layout = await loadLayout(layoutPath);
  const dependencyPlan = await createStarterDependencyPlan(packageRoot);
  const loaded = await loadVerifiedSourceFiles(templateRoot, layout, options.projectName, dependencyPlan);
  const sourceFiles = loaded.files;
  await assertTargetRootEmpty(targetRoot);

  for (const file of sourceFiles) {
    const targetPath = resolve(targetRoot, ...file.targetRelativePath.split("/"));
    assertUnder(resolve(targetRoot), targetPath, "Starter materialization target file");
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, file.content);
  }

  return {
    packageRoot,
    templateRoot,
    layoutPath,
    fileCount: layout.fileCount,
    writtenFiles: sourceFiles.map((file) => file.targetRelativePath),
    overlayPaths: [...OVERLAY_PATHS],
    substitutionPaths: loaded.substitutionPaths,
    projectSlug: normalizeSlug(options.projectName),
  };
}
