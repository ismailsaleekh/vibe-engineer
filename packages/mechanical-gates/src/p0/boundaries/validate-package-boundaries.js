import path from "node:path";
import ts from "typescript";
import {
  createFinding,
  createValidatorResult,
  normalizeProjectPath,
  P0_FAMILIES,
  readJsonFileBounded,
  readTextFileBounded,
  walkProjectFiles
} from "./contracts.js";

const BOUNDARY_CONFIG = "mechanical-boundaries.json";
const SOURCE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"]);

function finding(ruleId, findingPath, message, evidence = {}) {
  return createFinding({
    family: P0_FAMILIES.boundaries,
    ruleId,
    path: findingPath,
    message,
    evidence
  });
}

function isSourceFile(filePath) {
  return SOURCE_EXTENSIONS.has(path.posix.extname(filePath)) && !filePath.includes("/generated/") && !filePath.includes("/vendor/");
}

function isRelativeSpecifier(specifier) {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function stripSourceExtension(filePath) {
  return filePath.replace(/\.(mjs|cjs|js|jsx|ts|tsx)$/u, "");
}

function packageForPath(packages, filePath) {
  return packages.find((packageRow) => filePath === packageRow.root || filePath.startsWith(`${packageRow.root}/`));
}

function packageForBareSpecifier(packages, specifier) {
  return packages.find((packageRow) => specifier === packageRow.name || specifier.startsWith(`${packageRow.name}/`));
}

function packageRelative(packageRow, filePath) {
  return filePath.slice(packageRow.root.length).replace(/^\//u, "");
}

function importTargetForRelative(sourceFile, specifier) {
  const sourceDirectory = path.posix.dirname(sourceFile);
  const normalized = path.posix.normalize(path.posix.join(sourceDirectory, specifier));
  return stripSourceExtension(normalized);
}

function pathMatchesWithoutExtension(candidatePath, targetWithoutExtension) {
  return stripSourceExtension(candidatePath) === targetWithoutExtension || stripSourceExtension(`${candidatePath}/index.ts`) === targetWithoutExtension;
}

function discoverImports(sourceText, sourceFile) {
  const sourceKind = sourceFile.endsWith(".tsx") || sourceFile.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const parsed = ts.createSourceFile(sourceFile, sourceText, ts.ScriptTarget.Latest, true, sourceKind);
  const imports = [];

  function record(node, moduleSpecifier) {
    if (moduleSpecifier && ts.isStringLiteralLike(moduleSpecifier)) {
      const position = parsed.getLineAndCharacterOfPosition(node.getStart(parsed));
      imports.push({ specifier: moduleSpecifier.text, line: position.line + 1, column: position.character + 1 });
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      record(node, node.moduleSpecifier);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1) {
      record(node, node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }

  visit(parsed);
  return imports;
}

function isPrivateReachIn(targetPackage, targetPackageRelativePath, specifier) {
  const privatePaths = targetPackage.privatePaths;
  if (privatePaths.some((privatePath) => targetPackageRelativePath === privatePath || targetPackageRelativePath.startsWith(`${privatePath}/`))) {
    return true;
  }
  if (specifier === targetPackage.name) return false;
  const subpath = specifier.startsWith(`${targetPackage.name}/`) ? specifier.slice(targetPackage.name.length + 1) : targetPackageRelativePath;
  if (targetPackage.publicEntrypoints.some((entrypoint) => subpath === entrypoint || stripSourceExtension(subpath) === stripSourceExtension(entrypoint))) {
    return false;
  }
  return specifier.startsWith(`${targetPackage.name}/`) && subpath.length > 0;
}

function detectCycles(edges) {
  const cycles = [];
  const nodes = [...edges.keys()].sort();
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function visit(node) {
    if (visiting.has(node)) {
      const cycleStart = stack.indexOf(node);
      cycles.push([...stack.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of [...(edges.get(node) ?? new Set())].sort()) {
      visit(next);
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of nodes) visit(node);
  return cycles;
}

function assertPackageRows(config, projectRoot, findings, configPath) {
  if (!Array.isArray(config.packages)) {
    findings.push(finding("boundaries.schema", `${configPath}#/packages`, "Boundary config must define a packages array."));
    return [];
  }
  const seen = new Set();
  const packages = [];
  for (const [index, row] of config.packages.entries()) {
    const rowPath = `${configPath}#/packages/${index}`;
    if (!row || typeof row !== "object" || typeof row.name !== "string" || typeof row.root !== "string") {
      findings.push(finding("boundaries.schema", rowPath, "Package row must define string name and root."));
      continue;
    }
    if (seen.has(row.name)) {
      findings.push(finding("boundaries.duplicate-package", rowPath, "Duplicate package boundary row is forbidden.", { packageName: row.name }));
      continue;
    }
    seen.add(row.name);
    packages.push({
      name: row.name,
      root: normalizeProjectPath(projectRoot, row.root),
      allowedDependencies: new Set(Array.isArray(row.allowedDependencies) ? row.allowedDependencies.filter((value) => typeof value === "string") : []),
      publicEntrypoints: Array.isArray(row.publicEntrypoints) ? row.publicEntrypoints.filter((value) => typeof value === "string") : ["index.ts", "index.js"],
      privatePaths: Array.isArray(row.privatePaths) ? row.privatePaths.filter((value) => typeof value === "string") : ["internal", "private"]
    });
  }
  return packages.sort((left, right) => right.root.length - left.root.length);
}

export async function validatePackageBoundaries(projectRoot, options = {}) {
  const configPath = options.configPath ?? BOUNDARY_CONFIG;
  const config = await readJsonFileBounded(projectRoot, configPath);
  const findings = [];

  if (config.proofMode !== "typescript-ast") {
    findings.push(finding("boundaries.regex-only-proof-rejected", `${configPath}#/proofMode`, "Boundary proof must use the TypeScript AST parser, not regex or narrative proof.", {
      expected: "typescript-ast",
      actual: config.proofMode ?? null
    }));
  }
  if (config.parserSelfAgreementOnly === true) {
    findings.push(finding("boundaries.parser-self-agreement-only", `${configPath}#/parserSelfAgreementOnly`, "Parser self-agreement-only boundary proof is rejected; configured graph rules and source imports are required."));
  }

  const packages = assertPackageRows(config, projectRoot, findings, configPath);
  const files = (await walkProjectFiles(projectRoot)).filter(isSourceFile);
  const packageFiles = files.filter((filePath) => packageForPath(packages, filePath));
  const edges = new Map(packages.map((packageRow) => [packageRow.name, new Set()]));
  let importCount = 0;

  for (const sourceFile of packageFiles) {
    const sourcePackage = packageForPath(packages, sourceFile);
    const sourceText = await readTextFileBounded(projectRoot, sourceFile);
    for (const importRecord of discoverImports(sourceText, sourceFile)) {
      importCount += 1;
      let targetPackage;
      let targetPackageRelativePath = "";

      if (isRelativeSpecifier(importRecord.specifier)) {
        const targetWithoutExtension = importTargetForRelative(sourceFile, importRecord.specifier);
        const targetFile = packageFiles.find((candidate) => pathMatchesWithoutExtension(candidate, targetWithoutExtension));
        if (!targetFile) continue;
        targetPackage = packageForPath(packages, targetFile);
        targetPackageRelativePath = packageRelative(targetPackage, targetFile);
      } else {
        targetPackage = packageForBareSpecifier(packages, importRecord.specifier);
        if (!targetPackage) continue;
        const subpath = importRecord.specifier === targetPackage.name ? "" : importRecord.specifier.slice(targetPackage.name.length + 1);
        targetPackageRelativePath = subpath;
      }

      if (!targetPackage || !sourcePackage || targetPackage.name === sourcePackage.name) continue;
      edges.get(sourcePackage.name).add(targetPackage.name);

      if (!sourcePackage.allowedDependencies.has(targetPackage.name)) {
        findings.push(finding("boundaries.forbidden-import-direction", sourceFile, "Import violates the declared package boundary dependency direction.", {
          sourcePackage: sourcePackage.name,
          targetPackage: targetPackage.name,
          specifier: importRecord.specifier,
          line: importRecord.line,
          allowedDependencies: [...sourcePackage.allowedDependencies].sort()
        }));
      }

      if (isPrivateReachIn(targetPackage, targetPackageRelativePath, importRecord.specifier)) {
        findings.push(finding("boundaries.private-reach-in", sourceFile, "Import reaches into another package private implementation surface.", {
          sourcePackage: sourcePackage.name,
          targetPackage: targetPackage.name,
          specifier: importRecord.specifier,
          targetPackageRelativePath,
          line: importRecord.line
        }));
      }
    }
  }

  for (const cycle of detectCycles(edges)) {
    findings.push(finding("boundaries.cycle", configPath, "Package boundary graph contains a forbidden cycle.", { cycle }));
  }

  return createValidatorResult({
    family: P0_FAMILIES.boundaries,
    projectRoot,
    findings,
    evidence: {
      configPath,
      parser: "typescript",
      proofMode: "typescript-ast",
      packageCount: packages.length,
      sourceFileCount: packageFiles.length,
      importCount,
      graph: Object.fromEntries([...edges.entries()].map(([name, targets]) => [name, [...targets].sort()]))
    }
  });
}
