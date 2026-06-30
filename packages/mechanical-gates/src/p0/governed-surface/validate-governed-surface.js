import path from "node:path";
import {
  createFinding,
  createValidatorResult,
  normalizeProjectPath,
  P0_FAMILIES,
  pathExists,
  readJsonFileBounded,
  walkProjectFiles,
} from "../boundaries/contracts.js";

const GOVERNANCE_CONFIG = "mechanical-surface.json";
const GOVERNED_FILE_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".yaml",
  ".yml",
]);

function isGovernableFile(relativePath) {
  if (relativePath === GOVERNANCE_CONFIG) return false;
  if (relativePath.startsWith("vendor/") || relativePath.includes("/vendor/")) return false;
  if (relativePath.startsWith("generated/") || relativePath.includes("/generated/")) return false;
  if (relativePath.includes("/node_modules/")) return false;
  return GOVERNED_FILE_EXTENSIONS.has(path.posix.extname(relativePath));
}

function covers(surface, filePath) {
  if (surface.kind === "exact") return surface.path === filePath;
  if (surface.kind === "prefix")
    return filePath === surface.path || filePath.startsWith(`${surface.path}/`);
  return false;
}

function underPrefix(prefix, filePath) {
  return filePath === prefix || filePath.startsWith(`${prefix}/`);
}

function finding(ruleId, findingPath, message, evidence = {}) {
  return createFinding({
    family: P0_FAMILIES.governedSurface,
    ruleId,
    path: findingPath,
    message,
    evidence,
  });
}

export async function validateGovernedSurface(projectRoot, options = {}) {
  const configPath = options.configPath ?? GOVERNANCE_CONFIG;
  const config = await readJsonFileBounded(projectRoot, configPath);
  const findings = [];

  if (!Array.isArray(config.surfaces)) {
    findings.push(
      finding(
        "governed-surface.schema",
        configPath,
        "Governed surface config must contain a surfaces array.",
      ),
    );
    return createValidatorResult({
      family: P0_FAMILIES.governedSurface,
      projectRoot,
      findings,
      evidence: { configPath },
    });
  }

  const surfaces = [];
  const seenRows = new Map();
  for (const [index, row] of config.surfaces.entries()) {
    const rowPath = `${configPath}#/surfaces/${index}`;
    if (!row || typeof row !== "object") {
      findings.push(finding("governed-surface.schema", rowPath, "Surface row must be an object."));
      continue;
    }
    const kind = row.kind === "prefix" ? "prefix" : row.kind === "exact" ? "exact" : undefined;
    if (!kind || typeof row.path !== "string" || row.path.length === 0) {
      findings.push(
        finding(
          "governed-surface.schema",
          rowPath,
          "Surface row must define non-empty path and exact/prefix kind.",
        ),
      );
      continue;
    }
    const relative = normalizeProjectPath(projectRoot, row.path);
    const tools = Array.isArray(row.tools)
      ? row.tools.filter((tool) => typeof tool === "string" && tool.length > 0)
      : [];
    if (tools.length === 0) {
      findings.push(
        finding(
          "governed-surface.empty-tool-surface",
          rowPath,
          "Governed surface row must name at least one owning tool.",
          { path: relative },
        ),
      );
    }
    const key = `${kind}:${relative}`;
    if (seenRows.has(key)) {
      findings.push(
        finding(
          "governed-surface.duplicate-row",
          rowPath,
          "Duplicate governed surface row is forbidden.",
          {
            duplicateOf: seenRows.get(key),
            path: relative,
            kind,
          },
        ),
      );
    } else {
      seenRows.set(key, rowPath);
    }
    surfaces.push({ path: relative, kind, tools, rowPath });
  }

  const excludedPaths = Array.isArray(config.excludedPaths)
    ? config.excludedPaths
        .filter((value) => typeof value === "string")
        .map((value) => normalizeProjectPath(projectRoot, value))
    : [];

  for (const surface of surfaces) {
    const leakedExclusion = excludedPaths.find(
      (excludedPath) =>
        underPrefix(excludedPath, surface.path) || underPrefix(surface.path, excludedPath),
    );
    if (leakedExclusion) {
      findings.push(
        finding(
          "governed-surface.excluded-path-leak",
          surface.rowPath,
          "Governed surface overlaps an excluded/generated/vendor path.",
          {
            surfacePath: surface.path,
            excludedPath: leakedExclusion,
          },
        ),
      );
    }
  }

  const requiredPaths = Array.isArray(config.requiredPaths)
    ? config.requiredPaths
        .filter((value) => typeof value === "string")
        .map((value) => normalizeProjectPath(projectRoot, value))
    : [];

  for (const requiredPath of requiredPaths) {
    if (!(await pathExists(projectRoot, requiredPath))) {
      findings.push(
        finding(
          "governed-surface.missing-required-path",
          requiredPath,
          "Required governed path is absent on disk.",
          { requiredPath },
        ),
      );
      continue;
    }
    if (!surfaces.some((surface) => covers(surface, requiredPath))) {
      findings.push(
        finding(
          "governed-surface.missing-required-path",
          requiredPath,
          "Required governed path is not covered by any surface row.",
          { requiredPath },
        ),
      );
    }
  }

  const allFiles = await walkProjectFiles(projectRoot);
  const governableFiles = allFiles
    .filter(isGovernableFile)
    .filter(
      (filePath) => !excludedPaths.some((excludedPath) => underPrefix(excludedPath, filePath)),
    );
  for (const filePath of governableFiles) {
    if (!surfaces.some((surface) => covers(surface, filePath))) {
      findings.push(
        finding(
          "governed-surface.omitted-file",
          filePath,
          "Governable file is omitted from the governed surface registry.",
          { filePath },
        ),
      );
    }
  }

  return createValidatorResult({
    family: P0_FAMILIES.governedSurface,
    projectRoot,
    findings,
    evidence: {
      configPath,
      governedSurfaceCount: surfaces.length,
      governableFileCount: governableFiles.length,
      requiredPathCount: requiredPaths.length,
      excludedPathCount: excludedPaths.length,
    },
  });
}
