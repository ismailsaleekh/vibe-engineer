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

export type StarterScopeId = "default" | "no-mobile" | "web-only";

export type StarterScopeMetadata = {
  id: StarterScopeId;
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

type StarterScopePlan = StarterScopeMetadata & {
  omittedPathPrefixes: readonly string[];
  omittedExactPaths: readonly string[];
};

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
  omittedFiles: string[];
  overlayPaths: string[];
  substitutionPaths: string[];
  projectSlug: string;
  scope: StarterScopeMetadata;
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
const STATIC_SUBSTITUTION_PATHS = Object.freeze([
  "package.json",
  ".vibe/registry/runner-catalog.json",
]);
const PORTABLE_NODE_RUNTIME_COMMAND = "vibe-engineer:node";
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
  { packageName: "@vibe-engineer/orchestration", relativePackageDir: "packages/orchestration" },
  { packageName: "@vibe-engineer/security", relativePackageDir: "packages/security" },
  { packageName: "@vibe-engineer/schematics", relativePackageDir: "packages/schematics" },
  { packageName: "@vibe-engineer/skills", relativePackageDir: "packages/skills" },
  { packageName: "@vibe-engineer/verification", relativePackageDir: "packages/verification" },
]);
const DEFAULT_STARTER_APPS = Object.freeze(["api", "web", "mobile"]);
const DEFAULT_STARTER_PACKAGES = Object.freeze([
  "domain",
  "contracts",
  "api-client",
  "config",
  "testing",
  "ui",
]);
const STARTER_SCOPE_PLANS = Object.freeze<Record<StarterScopeId, StarterScopePlan>>({
  default: {
    id: "default",
    label: "API + web + mobile",
    flags: [],
    apps: [...DEFAULT_STARTER_APPS],
    packages: [...DEFAULT_STARTER_PACKAGES],
    generatedSurfaces: [
      "NestJS API with Prisma migrations",
      "React web app",
      "Expo React Native mobile app",
      "shared domain/contracts/api-client/config/testing/ui packages",
    ],
    omittedSurfaces: [],
    omittedChecks: [],
    includesApi: true,
    includesWeb: true,
    includesMobile: true,
    includesPrisma: true,
    omittedPathPrefixes: [],
    omittedExactPaths: [],
  },
  "no-mobile": {
    id: "no-mobile",
    label: "API + web",
    flags: ["--no-mobile"],
    apps: ["api", "web"],
    packages: [...DEFAULT_STARTER_PACKAGES],
    generatedSurfaces: [
      "NestJS API with Prisma migrations",
      "React web app",
      "shared domain/contracts/api-client/config/testing/ui packages",
    ],
    omittedSurfaces: [
      "apps/mobile Expo app",
      "React Native package entrypoints",
      "mobile package scripts",
      "mobile e2e/ui-verification placeholders",
    ],
    omittedChecks: ["mobile unit/device/e2e checks"],
    includesApi: true,
    includesWeb: true,
    includesMobile: false,
    includesPrisma: true,
    omittedPathPrefixes: ["apps/mobile", "packages/ui/src/native"],
    omittedExactPaths: [],
  },
  "web-only": {
    id: "web-only",
    label: "web-only",
    flags: ["--web-only"],
    apps: ["web"],
    packages: ["config", "ui"],
    generatedSurfaces: ["React web app", "shared config package", "shared UI package"],
    omittedSurfaces: [
      "apps/api NestJS API",
      "apps/api Prisma schema, migrations, seed, and local DB tooling",
      "apps/mobile Expo app",
      "domain/contracts/api-client/testing packages",
      "API/mobile package scripts and checks",
    ],
    omittedChecks: ["API", "Prisma migration", "mobile unit/device/e2e checks"],
    includesApi: false,
    includesWeb: true,
    includesMobile: false,
    includesPrisma: false,
    omittedPathPrefixes: [
      "apps/api",
      "apps/mobile",
      "apps/web/src/routes/golden-records",
      "packages/api-client",
      "packages/contracts",
      "packages/domain",
      "packages/testing",
      "packages/ui/src/native",
    ],
    omittedExactPaths: [".tooling/dev-services/docker-compose.json"],
  },
});

export function starterScopeFromId(scopeId: StarterScopeId): StarterScopeMetadata {
  const plan = STARTER_SCOPE_PLANS[scopeId];
  return {
    id: plan.id,
    label: plan.label,
    flags: [...plan.flags],
    apps: [...plan.apps],
    packages: [...plan.packages],
    generatedSurfaces: [...plan.generatedSurfaces],
    omittedSurfaces: [...plan.omittedSurfaces],
    omittedChecks: [...plan.omittedChecks],
    includesApi: plan.includesApi,
    includesWeb: plan.includesWeb,
    includesMobile: plan.includesMobile,
    includesPrisma: plan.includesPrisma,
  };
}

function starterScopePlan(scopeId: StarterScopeId): StarterScopePlan {
  return STARTER_SCOPE_PLANS[scopeId];
}

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

function pathMatchesPrefix(relativePath: string, prefix: string): boolean {
  return relativePath === prefix || relativePath.startsWith(`${prefix}/`);
}

function isOmittedByScope(relativePath: string, scope: StarterScopePlan): boolean {
  return (
    scope.omittedExactPaths.includes(relativePath) ||
    scope.omittedPathPrefixes.some((prefix) => pathMatchesPrefix(relativePath, prefix))
  );
}

function deleteJsonKey(object: JsonObject, key: string): void {
  if (Object.prototype.hasOwnProperty.call(object, key)) delete object[key];
}

function scopePackageName(projectSlug: string, packageName: string): string {
  return `@${projectSlug}/${packageName}`;
}

function toJsonObject(value: unknown): JsonObject {
  const jsonValue = JSON.parse(JSON.stringify(value)) as JsonValue;
  return isJsonObject(jsonValue) ? jsonValue : {};
}

function scopeMetadataJson(scope: StarterScopeMetadata): JsonObject {
  return toJsonObject({
    id: scope.id,
    label: scope.label,
    flags: scope.flags,
    apps: scope.apps,
    packages: scope.packages,
    generatedSurfaces: scope.generatedSurfaces,
    omittedSurfaces: scope.omittedSurfaces,
    omittedChecks: scope.omittedChecks,
    includesApi: scope.includesApi,
    includesWeb: scope.includesWeb,
    includesMobile: scope.includesMobile,
    includesPrisma: scope.includesPrisma,
  });
}

function replaceMarkedSection(
  text: string,
  marker: string,
  replacementBody: string,
  style: "html" | "hash" = "html",
): string {
  const start = style === "hash" ? `# ${marker}:start` : `<!-- ${marker}:start -->`;
  const end = style === "hash" ? `# ${marker}:end` : `<!-- ${marker}:end -->`;
  const body = replacementBody.trimEnd();
  const replacement = style === "html" ? `${start}\n\n${body}\n\n${end}` : `${start}\n${body}\n${end}`;
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);
  if (startIndex >= 0 && endIndex > startIndex) {
    return `${text.slice(0, startIndex)}${replacement}${text.slice(endIndex + end.length)}`;
  }
  return `${text.trimEnd()}\n\n${replacement}\n`;
}

function renderStarterQaScopeSection(scope: StarterScopeMetadata): string {
  const lines: string[] = [];
  lines.push("## Generated starter QA and scope");
  lines.push("");
  lines.push(`Generated scope: \`${scope.id}\` (${scope.label}).`);
  lines.push("");
  lines.push("Generated surfaces:");
  lines.push("");
  for (const item of scope.generatedSurfaces) lines.push(`- ${item}`);
  lines.push("");
  lines.push("Omitted surfaces/checks:");
  lines.push("");
  if (scope.omittedSurfaces.length === 0 && scope.omittedChecks.length === 0) {
    lines.push("- none; the default starter includes API, web, and mobile surfaces.");
  } else {
    for (const item of scope.omittedSurfaces) lines.push(`- ${item}`);
    for (const item of scope.omittedChecks) lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("### pnpm approve-builds guidance");
  lines.push("");
  lines.push(
    "If `pnpm install` reports ignored build scripts or prompts for approval, run `pnpm approve-builds` from the project root and approve only build scripts for packages you intentionally installed.",
  );
  lines.push(
    scope.includesApi
      ? "The default/API scopes may legitimately prompt for Prisma/Nest/esbuild-related packages such as `@prisma/client`, `prisma`, `@nestjs/core`, or `esbuild`; do not approve unrelated packages."
      : "The web-only scope has no generated API/Prisma surface; approve only web-tooling packages such as `esbuild` if pnpm asks.",
  );
  lines.push("");
  lines.push("### NestJS + tsx dependency injection");
  lines.push("");
  if (scope.includesApi) {
    lines.push(
      "The API dev runtime uses `tsx`, which does not emit TypeScript decorator metadata. NestJS constructors must use explicit `@Inject(...)` tokens or explicit provider wiring; do not rely on reflected constructor parameter types.",
    );
    lines.push(
      "Future Nest schematics or hand-written modules should copy the generated controller pattern and keep DI tokens explicit in tests and implementation files.",
    );
  } else {
    lines.push(
      "No NestJS API files are generated in this scope, so Nest/Prisma checks are intentionally omitted.",
    );
  }
  lines.push("");
  lines.push("### Prisma migration safety");
  lines.push("");
  if (scope.includesPrisma) {
    lines.push(
      "`vibe-engineer doctor` checks generated Prisma migration folders for missing or empty `migration.sql` files (the local symptom behind Prisma P3015). If the folder was never applied or shared, delete only that local empty folder and rerun `pnpm run db:migrate`; otherwise restore the migration from version control or create a new corrective migration.",
    );
  } else {
    lines.push(
      "Prisma schema, migrations, seed scripts, and DB checks are not generated in this scope.",
    );
  }
  lines.push("");
  lines.push("### Local generated files");
  lines.push("");
  lines.push(
    "`.gitignore` and `.prettierignore` intentionally exclude local DB/data stores, env files, build/cache outputs, and generated evidence/work caches while keeping README placeholders tracked.",
  );
  return lines.join("\n");
}

function renderGitignoreQaSection(): string {
  return [
    "# Local DB/data stores",
    ".data/",
    "data/",
    "*.db",
    "*.db-journal",
    "*.sqlite",
    "*.sqlite3",
    "apps/api/prisma/*.db",
    "apps/api/prisma/*.sqlite",
    "",
    "# Tool/build caches",
    ".cache/",
    "**/.cache/",
    ".vite/",
    "apps/web/dist/",
    "apps/api/dist/",
    "",
    "# Generated local evidence/work caches",
    ".vibe/evidence/**",
    "!.vibe/evidence/",
    "!.vibe/evidence/README.md",
    ".vibe/work/**",
    "!.vibe/work/",
    "!.vibe/work/README.md",
    ".vibe/cache/",
    ".vibe/tmp/",
  ].join("\n");
}

function renderPrettierignoreQaSection(): string {
  return [
    ".data",
    "**/.data",
    "data",
    "*.db",
    "*.sqlite",
    "*.sqlite3",
    ".cache",
    "**/.cache",
    ".vite",
    "**/.vite",
    ".vibe/cache",
    ".vibe/tmp",
    ".vibe/evidence/**",
    ".vibe/work/**",
  ].join("\n");
}

function renderWebOnlyEnv(): string {
  return "# Generated local-only web defaults. No real secrets.\nWEB_PORT=5173\n";
}

function renderWebOnlyConfigEnv(): string {
  return `// Environment wrapper for the @vibe-engineer-starter config package (web-only scope).\n// No real secrets in defaults; local-only non-secret placeholders (DL-22).\n\nexport interface StarterEnv {\n  readonly webPort: number;\n}\n\nexport function readStarterEnv(source: NodeJS.ProcessEnv = process.env): StarterEnv {\n  const webPortRaw = source["WEB_PORT"] ?? "5173";\n  const webPort = Number(webPortRaw);\n  if (!Number.isFinite(webPort)) {\n    throw new Error("WEB_PORT must be a finite number");\n  }\n  return Object.freeze({ webPort });\n}\n`;
}

function renderWebOnlyConfigTest(): string {
  return `import assert from "node:assert/strict";\nimport test from "node:test";\nimport { readStarterEnv } from "../src/index.js";\n\ntest("config parses explicit local web port", () => {\n  assert.deepEqual(readStarterEnv({ WEB_PORT: "5199" }), { webPort: 5199 });\n});\n`;
}

function applyRootPackageScopePlan(
  object: JsonObject,
  scope: StarterScopeMetadata,
  projectSlug: string,
): void {
  const scripts = isJsonObject(object.scripts) ? object.scripts : {};
  if (scope.id === "no-mobile") {
    deleteJsonKey(scripts, "dev:mobile");
    deleteJsonKey(scripts, "dev:mobile:ios");
    deleteJsonKey(scripts, "dev:mobile:android");
  }
  if (scope.id === "web-only") {
    scripts.dev = `pnpm --filter ${scopePackageName(projectSlug, "web")} run dev`;
    scripts["dev:web"] = `pnpm --filter ${scopePackageName(projectSlug, "web")} run dev`;
    deleteJsonKey(scripts, "dev:api");
    deleteJsonKey(scripts, "dev:mobile");
    deleteJsonKey(scripts, "dev:mobile:ios");
    deleteJsonKey(scripts, "dev:mobile:android");
    deleteJsonKey(scripts, "db:start");
    deleteJsonKey(scripts, "db:stop");
    deleteJsonKey(scripts, "db:migrate");
    deleteJsonKey(scripts, "db:seed");
    deleteJsonKey(scripts, "db:reset:local");
  }
  object.scripts = scripts;

  const vibeEngineer = isJsonObject(object.vibeEngineer) ? object.vibeEngineer : {};
  vibeEngineer.appNames = [...scope.apps];
  vibeEngineer.packageNames = [...scope.packages];
  vibeEngineer.persistence = scope.includesPrisma
    ? "PostgreSQL + Prisma"
    : "none (web-only starter; API/Prisma omitted)";
  vibeEngineer.contractMechanism = scope.includesApi
    ? "ts-rest + named Zod schemas"
    : "not generated in web-only scope";
  vibeEngineer.starterScope = scopeMetadataJson(scope);
  object.vibeEngineer = vibeEngineer;
}

function applyPackageManifestScopePlan(
  relativePath: string,
  object: JsonObject,
  scope: StarterScopeMetadata,
  projectSlug: string,
): void {
  if (relativePath === "apps/web/package.json" && scope.id === "web-only") {
    const dependencies = isJsonObject(object.dependencies) ? object.dependencies : {};
    deleteJsonKey(dependencies, scopePackageName(projectSlug, "api-client"));
    object.dependencies = dependencies;
  }
  if (!scope.includesMobile) {
    deleteJsonKey(object, "react-native");
  }
  if (relativePath === "packages/ui/package.json" && !scope.includesMobile) {
    const exportsObject = isJsonObject(object.exports) ? object.exports : {};
    deleteJsonKey(exportsObject, "./native");
    object.exports = exportsObject;
  }
}

function applyTsconfigScopePlan(object: JsonObject, scope: StarterScopeMetadata): void {
  const allowedReferences = new Set<string>([
    ...scope.apps.map((app) => `./apps/${app}`),
    ...scope.packages.map((packageName) => `./packages/${packageName}`),
  ]);
  const references = Array.isArray(object.references) ? object.references : [];
  object.references = references.filter(
    (entry): entry is JsonObject =>
      isJsonObject(entry) && typeof entry.path === "string" && allowedReferences.has(entry.path),
  );
}

function applyRunnerCatalogScopePlan(value: JsonValue, scope: StarterScopeMetadata): JsonValue {
  if (!Array.isArray(value)) return value;
  const scopeMetadata = scopeMetadataJson(scope);
  return value.map((entry) =>
    isJsonObject(entry)
      ? {
          ...entry,
          starterScope: scopeMetadata,
        }
      : entry,
  );
}

function applyStarterPresetScopePlan(object: JsonObject, scope: StarterScopeMetadata): void {
  const layout = isJsonObject(object.layout) ? object.layout : {};
  const apps = Array.isArray(layout.apps) ? layout.apps : [];
  layout.apps = apps.filter(
    (entry): entry is JsonObject =>
      isJsonObject(entry) && typeof entry.id === "string" && scope.apps.includes(entry.id),
  );
  const packages = Array.isArray(layout.packages) ? layout.packages : [];
  layout.packages = packages.filter(
    (entry): entry is JsonObject =>
      isJsonObject(entry) && typeof entry.name === "string" && scope.packages.includes(entry.name),
  );
  layout.persistence = scope.includesPrisma
    ? "PostgreSQL + Prisma"
    : "none (web-only starter; API/Prisma omitted)";
  layout.contractMechanism = scope.includesApi
    ? "ts-rest + named Zod schemas"
    : "not generated in web-only scope";
  layout.starterScope = scopeMetadataJson(scope);
  object.layout = layout;

  if (Array.isArray(object.files)) {
    const plan = starterScopePlan(scope.id);
    object.files = object.files.filter(
      (entry) =>
        isJsonObject(entry) &&
        typeof entry.outputPath === "string" &&
        !isOmittedByScope(entry.outputPath, plan),
    );
  }
}

function applyTextScopePlan(
  relativePath: string,
  text: string,
  scope: StarterScopeMetadata,
): string {
  let next = text;
  if (relativePath === "docs/reference/starter.md") {
    next = replaceMarkedSection(
      next,
      "vibe-engineer:starter-qa-scope",
      renderStarterQaScopeSection(scope),
    );
  }
  if (relativePath === "_gitignore") {
    next = replaceMarkedSection(
      next,
      "vibe-engineer:local-qa-ignore",
      renderGitignoreQaSection(),
      "hash",
    );
  }
  if (relativePath === ".prettierignore") {
    next = replaceMarkedSection(
      next,
      "vibe-engineer:local-qa-ignore",
      renderPrettierignoreQaSection(),
      "hash",
    );
  }
  if (scope.id === "web-only") {
    if (relativePath === ".env" || relativePath === ".env.example") next = renderWebOnlyEnv();
    if (relativePath === "packages/config/src/env.ts") next = renderWebOnlyConfigEnv();
    if (relativePath === "packages/config/test/env.test.ts") next = renderWebOnlyConfigTest();
  }
  return next;
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
  scope: StarterScopeMetadata,
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
    applyRootPackageScopePlan(object, scope, projectSlug);
    rewrittenText = `${JSON.stringify(object, null, 2)}\n`;
  }

  if (relativePath.endsWith("/package.json") && relativePath !== "package.json") {
    const object = parseJsonObject(rewrittenText, relativePath);
    applyPackageManifestScopePlan(relativePath, object, scope, projectSlug);
    rewrittenText = `${JSON.stringify(object, null, 2)}\n`;
  }

  if (relativePath === "tsconfig.json") {
    const object = parseJsonObject(rewrittenText, relativePath);
    applyTsconfigScopePlan(object, scope);
    rewrittenText = `${JSON.stringify(object, null, 2)}\n`;
  }

  if (relativePath === ".vibe/generated/nest-react-rn-preset/manifest.json") {
    const object = parseJsonObject(rewrittenText, relativePath);
    applyStarterPresetScopePlan(object, scope);
    rewrittenText = `${JSON.stringify(object, null, 2)}\n`;
  }

  if (relativePath === ".vibe/registry/runner-catalog.json") {
    const withNode = replaceJsonString(
      parseJsonValue(rewrittenText, relativePath),
      "__VIBE_NODE_EXEC_PATH__",
      dependencyPlan.nodeExecPath,
    );
    const withPath = replaceJsonString(
      withNode,
      "__VIBE_RUNNER_PATH__",
      dependencyPlan.runnerPathEnv,
    );
    const withScope = applyRunnerCatalogScopePlan(withPath, scope);
    rewrittenText = `${JSON.stringify(withScope, null, 2)}\n`;
  }

  rewrittenText = applyTextScopePlan(relativePath, rewrittenText, scope);

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
  const packageJson = parseJsonObject(
    await readFile(join(packageRoot, "package.json"), "utf8"),
    join(packageRoot, "package.json"),
  );
  const version =
    typeof packageJson.version === "string" && packageJson.version.length > 0
      ? packageJson.version
      : "0.0.0";
  const sourceWorkspaceRoot = detectSourceWorkspaceRoot(packageRoot);
  if (sourceWorkspaceRoot === null) {
    return {
      cliDependency: version,
      nodeExecPath: PORTABLE_NODE_RUNTIME_COMMAND,
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
    nodeExecPath: PORTABLE_NODE_RUNTIME_COMMAND,
    runnerPathEnv: process.env.PATH ?? "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
    sourceWorkspaceRoot,
    pnpmOverrides: overrides,
  };
}

function applyRootPackageDependencyPlan(
  object: JsonObject,
  dependencyPlan: StarterDependencyPlan,
): void {
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
  if (Array.isArray(value))
    return value.map((entry) => replaceJsonString(entry, needle, replacement));
  if (isJsonObject(value)) {
    const output: JsonObject = {};
    for (const [key, entry] of Object.entries(value))
      output[key] = replaceJsonString(entry, needle, replacement);
    return output;
  }
  return value;
}

async function loadVerifiedSourceFiles(
  templateRoot: string,
  layout: StarterLayout,
  projectName: string,
  dependencyPlan: StarterDependencyPlan,
  scope: StarterScopeMetadata,
): Promise<{
  files: Array<{ relativePath: string; targetRelativePath: string; content: Buffer }>;
  substitutionPaths: string[];
}> {
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
    const substituted = applyTypedSubstitution(
      entry.path,
      sourceContent,
      projectName,
      dependencyPlan,
      scope,
    );
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
  options: { projectName: string; mode: MaterializeMode; scope?: StarterScopeId },
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
  const scope = starterScopeFromId(options.scope ?? "default");
  const scopePlan = starterScopePlan(scope.id);
  const loaded = await loadVerifiedSourceFiles(
    templateRoot,
    layout,
    options.projectName,
    dependencyPlan,
    scope,
  );
  const omittedFiles = loaded.files
    .filter((file) => isOmittedByScope(file.relativePath, scopePlan))
    .map((file) => file.targetRelativePath);
  const sourceFiles = loaded.files.filter(
    (file) => !isOmittedByScope(file.relativePath, scopePlan),
  );
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
    fileCount: sourceFiles.length,
    writtenFiles: sourceFiles.map((file) => file.targetRelativePath),
    omittedFiles,
    overlayPaths: [...OVERLAY_PATHS],
    substitutionPaths: loaded.substitutionPaths,
    projectSlug: normalizeSlug(options.projectName),
    scope,
  };
}
