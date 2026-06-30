import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export const P0_FAMILIES = Object.freeze({
  governedSurface: "p0.governed-surface",
  configGuards: "p0.config-guards",
  boundaries: "p0.boundaries",
  contracts: "p0.contracts",
});

export const P0_SEVERITIES = Object.freeze(["error", "warning"]);

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;

export class P0ValidationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "P0ValidationError";
    this.code = options.code ?? "P0_VALIDATION_ERROR";
    this.path = options.path;
  }
}

export function normalizeProjectPath(projectRoot, candidatePath) {
  const root = path.resolve(projectRoot);
  const absolute = path.resolve(root, candidatePath);
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  if (
    relative === "" ||
    relative.startsWith("../") ||
    relative === ".." ||
    path.isAbsolute(relative)
  ) {
    throw new P0ValidationError(`Path escapes validation root: ${candidatePath}`, {
      code: "P0_PATH_TRAVERSAL",
      path: candidatePath,
    });
  }
  return relative;
}

export function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

export async function readTextFileBounded(projectRoot, relativePath, options = {}) {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_FILE_BYTES;
  const safeRelative = normalizeProjectPath(projectRoot, relativePath);
  const absolute = path.join(path.resolve(projectRoot), safeRelative);
  const metadata = await stat(absolute).catch((error) => {
    throw new P0ValidationError(`Required file is unreadable: ${safeRelative}`, {
      code: "P0_FILE_UNREADABLE",
      path: safeRelative,
      cause: error,
    });
  });
  if (!metadata.isFile()) {
    throw new P0ValidationError(`Required path is not a file: ${safeRelative}`, {
      code: "P0_NOT_A_FILE",
      path: safeRelative,
    });
  }
  if (metadata.size > maxBytes) {
    throw new P0ValidationError(`File exceeds bounded read size ${maxBytes}: ${safeRelative}`, {
      code: "P0_FILE_TOO_LARGE",
      path: safeRelative,
    });
  }
  return readFile(absolute, "utf8");
}

export async function readJsonFileBounded(projectRoot, relativePath) {
  const text = await readTextFileBounded(projectRoot, relativePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new P0ValidationError(`Invalid JSON in ${relativePath}: ${error.message}`, {
      code: "P0_INVALID_JSON",
      path: relativePath,
      cause: error,
    });
  }
}

export async function pathExists(projectRoot, relativePath) {
  const safeRelative = normalizeProjectPath(projectRoot, relativePath);
  return stat(path.join(path.resolve(projectRoot), safeRelative))
    .then(() => true)
    .catch(() => false);
}

export async function walkProjectFiles(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  const start = options.start ? normalizeProjectPath(root, options.start) : ".";
  const excludes = new Set([
    "node_modules",
    ".git",
    ".tmp",
    "dist",
    "build",
    ...(options.excludeDirectoryNames ?? []),
  ]);
  const files = [];

  async function visit(relativeDirectory) {
    const absoluteDirectory = path.join(root, relativeDirectory === "." ? "" : relativeDirectory);
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    for (const entry of entries) {
      const relative = toPosixPath(
        path.join(relativeDirectory === "." ? "" : relativeDirectory, entry.name),
      );
      if (entry.isDirectory()) {
        if (!excludes.has(entry.name)) {
          await visit(relative);
        }
        continue;
      }
      if (entry.isFile()) {
        files.push(relative);
      }
    }
  }

  await visit(start);
  return files.sort();
}

export function createFinding({
  family,
  ruleId,
  severity = "error",
  blocking = severity === "error",
  path: findingPath,
  message,
  evidence = {},
}) {
  const finding = {
    family,
    ruleId,
    severity,
    blocking,
    path: findingPath,
    message,
    evidence,
  };
  assertTypedFinding(finding);
  return finding;
}

export function assertTypedFinding(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new P0ValidationError("Finding must be an object", { code: "P0_UNTYPED_FINDING" });
  }
  const required = ["family", "ruleId", "severity", "blocking", "path", "message", "evidence"];
  for (const key of required) {
    if (!(key in value)) {
      throw new P0ValidationError(`Finding missing required field: ${key}`, {
        code: "P0_UNTYPED_FINDING",
      });
    }
  }
  if (typeof value.family !== "string" || value.family.length === 0) {
    throw new P0ValidationError("Finding family must be a non-empty string", {
      code: "P0_UNTYPED_FINDING",
    });
  }
  if (typeof value.ruleId !== "string" || value.ruleId.length === 0) {
    throw new P0ValidationError("Finding ruleId must be a non-empty string", {
      code: "P0_UNTYPED_FINDING",
    });
  }
  if (!P0_SEVERITIES.includes(value.severity)) {
    throw new P0ValidationError(`Finding severity is unsupported: ${value.severity}`, {
      code: "P0_UNTYPED_FINDING",
    });
  }
  if (typeof value.blocking !== "boolean") {
    throw new P0ValidationError("Finding blocking must be boolean", { code: "P0_UNTYPED_FINDING" });
  }
  if (typeof value.path !== "string") {
    throw new P0ValidationError("Finding path must be string", { code: "P0_UNTYPED_FINDING" });
  }
  if (typeof value.message !== "string" || value.message.length === 0) {
    throw new P0ValidationError("Finding message must be a non-empty string", {
      code: "P0_UNTYPED_FINDING",
    });
  }
  if (!value.evidence || typeof value.evidence !== "object" || Array.isArray(value.evidence)) {
    throw new P0ValidationError("Finding evidence must be an object", {
      code: "P0_UNTYPED_FINDING",
    });
  }
  return true;
}

export function assertTypedFindings(findings) {
  if (!Array.isArray(findings)) {
    throw new P0ValidationError("Findings carrier must be an array", {
      code: "P0_UNTYPED_FINDING",
    });
  }
  for (const finding of findings) {
    assertTypedFinding(finding);
  }
  return true;
}

export function createValidatorResult({ family, projectRoot, findings, evidence = {} }) {
  assertTypedFindings(findings);
  return {
    family,
    ok: findings.filter((finding) => finding.blocking).length === 0,
    projectRoot: path.resolve(projectRoot),
    findings,
    evidence,
  };
}
