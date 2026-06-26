import path from "node:path";
import ts from "typescript";
import {
  assertTypedFindings,
  createFinding,
  createValidatorResult,
  normalizeProjectPath,
  readJsonFileBounded,
  readTextFileBounded,
  walkProjectFiles
} from "../boundaries/contracts.js";

const FAMILY = "p0.testing-boundary";
const DEFAULT_POLICY_PATH = "mechanical-testing-boundary.json";
const PRODUCTION_DEPENDENCY_SECTIONS = ["dependencies", "peerDependencies", "optionalDependencies"];
const DEV_DEPENDENCY_SECTION = "devDependencies";

function finding(ruleId, findingPath, message, evidence = {}) {
  return createFinding({ family: FAMILY, ruleId, path: findingPath, message, evidence });
}

function failClosedResult(projectRoot, ruleId, findingPath, message, evidence = {}) {
  const findings = [finding(ruleId, findingPath, message, evidence)];
  return createValidatorResult({
    family: FAMILY,
    projectRoot,
    findings,
    evidence: {
      policyPath: evidence.policyPath ?? DEFAULT_POLICY_PATH,
      parser: "typescript",
      proofMode: "typescript-ast",
      failClosed: true
    }
  });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string" && entry.length > 0) ? value : undefined;
}

function validatePolicy(policy, options, policyPath, findings) {
  if (!isPlainObject(policy)) {
    findings.push(finding("testing-boundary.policy-schema", policyPath, "Testing-boundary policy must be a JSON object."));
    return undefined;
  }

  if (policy.proofMode !== "typescript-ast") {
    findings.push(finding("testing-boundary.regex-only-proof-rejected", `${policyPath}#/proofMode`, "Testing-boundary proof must use TypeScript AST import discovery, not regex or narrative proof.", {
      expected: "typescript-ast",
      actual: policy.proofMode ?? null
    }));
  }
  if (policy.parserSelfAgreementOnly === true) {
    findings.push(finding("testing-boundary.parser-self-agreement-only", `${policyPath}#/parserSelfAgreementOnly`, "Parser self-agreement-only proof is rejected; real manifests and source imports are required."));
  }

  const testOnlyPackageName = options.testOnlyPackageName ?? policy.testOnlyPackageName;
  if (typeof testOnlyPackageName !== "string" || testOnlyPackageName.length === 0) {
    findings.push(finding("testing-boundary.policy-schema", `${policyPath}#/testOnlyPackageName`, "Policy must name the test-only package."));
  }
  if (typeof policy.testOnlyPackageName === "string" && options.testOnlyPackageName && options.testOnlyPackageName !== policy.testOnlyPackageName) {
    findings.push(finding("testing-boundary.policy-schema", `${policyPath}#/testOnlyPackageName`, "Options and policy disagree on the test-only package name.", {
      option: options.testOnlyPackageName,
      policy: policy.testOnlyPackageName
    }));
  }

  const packageManifestRoots = asStringArray(policy.packageManifestRoots);
  const requiredPackageManifestPaths = asStringArray(policy.requiredPackageManifestPaths);
  const sourceRoots = asStringArray(policy.sourceRoots);
  const sourceExtensions = asStringArray(policy.sourceExtensions);
  const excludedDirectoryNames = asStringArray(policy.excludedDirectoryNames);
  const testSurface = isPlainObject(policy.testSurface) ? policy.testSurface : undefined;
  const testFileSuffixes = testSurface ? asStringArray(testSurface.fileSuffixes) : undefined;
  const testDirectorySegments = testSurface ? asStringArray(testSurface.directorySegments) : undefined;

  for (const [jsonPath, value] of [
    ["packageManifestRoots", packageManifestRoots],
    ["requiredPackageManifestPaths", requiredPackageManifestPaths],
    ["sourceRoots", sourceRoots],
    ["sourceExtensions", sourceExtensions],
    ["excludedDirectoryNames", excludedDirectoryNames],
    ["testSurface/fileSuffixes", testFileSuffixes],
    ["testSurface/directorySegments", testDirectorySegments]
  ]) {
    if (!value) {
      findings.push(finding("testing-boundary.policy-schema", `${policyPath}#/${jsonPath}`, "Testing-boundary policy field must be a non-empty string array."));
    }
  }

  if (findings.length > 0) return undefined;
  return {
    testOnlyPackageName,
    packageManifestRoots,
    requiredPackageManifestPaths,
    sourceRoots,
    sourceExtensions: new Set(sourceExtensions),
    excludedDirectoryNames,
    testFileSuffixes,
    testDirectorySegments
  };
}

function isExcludedPath(filePath, excludedDirectoryNames) {
  const segments = filePath.split("/");
  return segments.some((segment) => excludedDirectoryNames.includes(segment));
}

function isSourceFile(filePath, policy) {
  return policy.sourceExtensions.has(path.posix.extname(filePath)) && !isExcludedPath(filePath, policy.excludedDirectoryNames);
}

function isTestSurface(filePath, policy) {
  const basename = path.posix.basename(filePath);
  if (policy.testFileSuffixes.some((suffix) => basename.endsWith(suffix))) return true;
  const segments = filePath.split("/");
  return policy.testDirectorySegments.some((segment) => segments.includes(segment));
}

function sourceKindFor(filePath) {
  if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs") || filePath.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function discoverImports(sourceText, sourceFile) {
  const parsed = ts.createSourceFile(sourceFile, sourceText, ts.ScriptTarget.Latest, true, sourceKindFor(sourceFile));
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
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require" && node.arguments.length === 1) {
      record(node, node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }

  visit(parsed);
  return imports;
}

function importsTestOnlyPackage(specifier, packageName) {
  return specifier === packageName || specifier.startsWith(`${packageName}/`);
}

function isPublishableTestOnlyManifest(manifest) {
  if (manifest.private !== true) return true;
  if (isPlainObject(manifest.publishConfig) && manifest.publishConfig.access === "public") return true;
  if ("files" in manifest) return true;
  if ("bin" in manifest) return true;
  if (isPlainObject(manifest.scripts) && typeof manifest.scripts.prepublishOnly === "string") return true;
  return false;
}

function hasTestOnlyPolicy(manifest) {
  return manifest.vibeEngineer?.testOnly === true && manifest.vibeEngineer?.productionDependencyAllowed === false;
}

async function collectPackageManifests(projectRoot, policy, findings) {
  const manifestPaths = new Set();
  for (const root of policy.packageManifestRoots) {
    let safeRoot;
    try {
      safeRoot = normalizeProjectPath(projectRoot, root);
      const files = await walkProjectFiles(projectRoot, { start: safeRoot, excludeDirectoryNames: policy.excludedDirectoryNames });
      for (const file of files) {
        if (path.posix.basename(file) === "package.json" && !isExcludedPath(file, policy.excludedDirectoryNames)) {
          manifestPaths.add(file);
        }
      }
    } catch (error) {
      findings.push(finding("testing-boundary.manifest-unreadable", root, "Package manifest root is unreadable or outside the validation root.", {
        root,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined
      }));
    }
  }
  for (const required of policy.requiredPackageManifestPaths) manifestPaths.add(required);

  const manifests = [];
  for (const manifestPath of [...manifestPaths].sort()) {
    let safeManifestPath;
    try {
      safeManifestPath = normalizeProjectPath(projectRoot, manifestPath);
      const manifest = await readJsonFileBounded(projectRoot, safeManifestPath);
      if (!isPlainObject(manifest) || typeof manifest.name !== "string" || manifest.name.length === 0) {
        findings.push(finding("testing-boundary.manifest-schema", safeManifestPath, "package.json must be an object with a non-empty name."));
        continue;
      }
      manifests.push({ manifest, manifestPath: safeManifestPath, packageRoot: path.posix.dirname(safeManifestPath) });
    } catch (error) {
      findings.push(finding("testing-boundary.manifest-unreadable", manifestPath, "Required package manifest is missing, unreadable, malformed, or outside the validation root.", {
        manifestPath,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined
      }));
    }
  }
  return manifests;
}

function inspectDependencyEdges(manifests, testOnlyPackageName, findings) {
  const dependencyEdges = [];
  for (const row of manifests) {
    for (const section of [...PRODUCTION_DEPENDENCY_SECTIONS, DEV_DEPENDENCY_SECTION]) {
      const dependencies = row.manifest[section];
      if (dependencies === undefined) continue;
      if (!isPlainObject(dependencies)) {
        findings.push(finding("testing-boundary.manifest-schema", `${row.manifestPath}#/${section}`, "Dependency section must be an object when present."));
        continue;
      }
      if (testOnlyPackageName in dependencies) {
        const productionReachable = PRODUCTION_DEPENDENCY_SECTIONS.includes(section);
        dependencyEdges.push({
          packageName: row.manifest.name,
          section,
          dependencyName: testOnlyPackageName,
          productionReachable,
          manifestPath: row.manifestPath
        });
        if (productionReachable) {
          findings.push(finding("testing-boundary.production-dependency", `${row.manifestPath}#/${section}/${testOnlyPackageName}`, "Production-reachable dependency on the test-only package is forbidden.", {
            packageName: row.manifest.name,
            section,
            dependencyName: testOnlyPackageName
          }));
        }
      }
    }
  }
  return dependencyEdges;
}

function inspectTestOnlyPackageManifest(manifests, testOnlyPackageName, findings) {
  const testOnlyRows = manifests.filter((row) => row.manifest.name === testOnlyPackageName);
  if (testOnlyRows.length === 0) {
    findings.push(finding("testing-boundary.test-only-manifest-missing", ".", "The test-only package manifest was not found in the governed package graph.", { testOnlyPackageName }));
  }
  const evidence = [];
  for (const row of testOnlyRows) {
    const publishable = isPublishableTestOnlyManifest(row.manifest);
    if (publishable) {
      findings.push(finding("testing-boundary.publishable-test-package", row.manifestPath, "The test-only package must be private and non-publishable.", {
        private: row.manifest.private ?? null,
        hasPublishConfig: isPlainObject(row.manifest.publishConfig),
        hasFiles: "files" in row.manifest,
        hasBin: "bin" in row.manifest,
        hasPrepublishOnly: isPlainObject(row.manifest.scripts) && typeof row.manifest.scripts.prepublishOnly === "string"
      }));
    }
    if (!hasTestOnlyPolicy(row.manifest)) {
      findings.push(finding("testing-boundary.test-only-policy-missing", `${row.manifestPath}#/vibeEngineer`, "The test-only package manifest must declare testOnly:true and productionDependencyAllowed:false."));
    }
    evidence.push({
      manifestPath: row.manifestPath,
      private: row.manifest.private === true,
      testOnly: row.manifest.vibeEngineer?.testOnly === true,
      productionDependencyAllowed: row.manifest.vibeEngineer?.productionDependencyAllowed === true
    });
  }
  return evidence;
}

async function collectSourceFiles(projectRoot, policy, findings) {
  const files = new Set();
  for (const sourceRoot of policy.sourceRoots) {
    try {
      const safeSourceRoot = normalizeProjectPath(projectRoot, sourceRoot);
      const rootFiles = await walkProjectFiles(projectRoot, { start: safeSourceRoot, excludeDirectoryNames: policy.excludedDirectoryNames });
      for (const file of rootFiles) {
        if (isSourceFile(file, policy)) files.add(file);
      }
    } catch (error) {
      findings.push(finding("testing-boundary.source-root-unreadable", sourceRoot, "Source root is unreadable or outside the validation root.", {
        sourceRoot,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined
      }));
    }
  }
  return [...files].sort();
}

async function inspectSourceImports(projectRoot, sourceFiles, policy, findings) {
  let importCount = 0;
  let productionImportCount = 0;
  const importEvidence = [];
  for (const sourceFile of sourceFiles) {
    let sourceText;
    try {
      sourceText = await readTextFileBounded(projectRoot, sourceFile);
    } catch (error) {
      findings.push(finding("testing-boundary.source-unreadable", sourceFile, "Source file is unreadable during AST import discovery; testing-boundary fails closed.", {
        sourceFile,
        errorName: error instanceof Error ? error.name : undefined,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined
      }));
      continue;
    }
    for (const importRecord of discoverImports(sourceText, sourceFile)) {
      importCount += 1;
      if (!importsTestOnlyPackage(importRecord.specifier, policy.testOnlyPackageName)) continue;
      const testSurface = isTestSurface(sourceFile, policy);
      importEvidence.push({ sourceFile, testSurface, specifier: importRecord.specifier, line: importRecord.line, column: importRecord.column });
      if (!testSurface) {
        productionImportCount += 1;
        findings.push(finding("testing-boundary.production-import", sourceFile, "Production source must not import the test-only package.", {
          specifier: importRecord.specifier,
          line: importRecord.line,
          column: importRecord.column,
          parser: "typescript",
          proofMode: "typescript-ast"
        }));
      }
    }
  }
  return { importCount, productionImportCount, importEvidence };
}

export async function validateTestingBoundary(projectRoot, options = {}) {
  const policyPath = options.policyPath ?? DEFAULT_POLICY_PATH;
  const findings = [];
  let policyJson;
  try {
    const safePolicyPath = normalizeProjectPath(projectRoot, policyPath);
    policyJson = await readJsonFileBounded(projectRoot, safePolicyPath);
  } catch (error) {
    return failClosedResult(projectRoot, "testing-boundary.policy-unreadable", policyPath, "Testing-boundary policy is missing, unreadable, malformed, or outside the validation root.", {
      policyPath,
      errorName: error instanceof Error ? error.name : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined
    });
  }

  const policy = validatePolicy(policyJson, options, policyPath, findings);
  if (!policy) {
    return createValidatorResult({
      family: FAMILY,
      projectRoot,
      findings,
      evidence: { policyPath, parser: "typescript", proofMode: "typescript-ast", failClosed: true }
    });
  }

  const manifests = await collectPackageManifests(projectRoot, policy, findings);
  const dependencyEdges = inspectDependencyEdges(manifests, policy.testOnlyPackageName, findings);
  const testOnlyManifests = inspectTestOnlyPackageManifest(manifests, policy.testOnlyPackageName, findings);
  const sourceFiles = await collectSourceFiles(projectRoot, policy, findings);
  const { importCount, productionImportCount, importEvidence } = await inspectSourceImports(projectRoot, sourceFiles, policy, findings);

  assertTypedFindings(findings);
  return createValidatorResult({
    family: FAMILY,
    projectRoot,
    findings,
    evidence: {
      policyPath,
      parser: "typescript",
      proofMode: "typescript-ast",
      testOnlyPackageName: policy.testOnlyPackageName,
      packageCount: manifests.length,
      sourceFileCount: sourceFiles.length,
      importCount,
      productionImportCount,
      dependencyEdges,
      testOnlyManifests,
      sourceImports: importEvidence,
      productionDependencySections: PRODUCTION_DEPENDENCY_SECTIONS,
      devDependencySection: DEV_DEPENDENCY_SECTION,
      excludedDirectoryNames: policy.excludedDirectoryNames,
      testSurface: {
        fileSuffixes: policy.testFileSuffixes,
        directorySegments: policy.testDirectorySegments
      }
    }
  });
}
