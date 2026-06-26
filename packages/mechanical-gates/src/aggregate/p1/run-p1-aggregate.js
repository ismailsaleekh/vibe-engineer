import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assertTypedFindings, createFinding, createValidatorResult } from "../../p0/boundaries/contracts.js";
import { validateQualityRatchet } from "../../p1/quality-ratchet/index.js";
import { validateTestAntiPatterns } from "../../p1/test-anti-pattern/index.js";

export const P1_AGGREGATE_FAMILY = "p1.aggregate";
export const P1_AGGREGATE_FAMILIES = Object.freeze([
  "p1.schema-contract-strictness",
  "p1.quality-ratchet",
  "p1.test-anti-pattern"
]);

const VALIDATOR_EXPORT_NAME = "validateSchemaContractStrictness";
const SCHEMA_CONTRACT_FAMILY = "p1.schema-contract-strictness";
const I11_DEFAULT_SOURCE_ROOT = "packages/mechanical-gates/src/p1/schema-contract-strictness";
const I11_DEFAULT_SOURCE_FILES = Object.freeze([
  "packages/mechanical-gates/src/p1/schema-contract-strictness/index.ts",
  "packages/mechanical-gates/src/p1/schema-contract-strictness/validate-schema-contract-strictness.ts"
]);
const AGGREGATE_WORK_ROOT = ".vibe/work/I-12-mechanical-P1-ratchet-test-scanner/aggregate";
const DEFAULT_SCHEMA_MANIFEST_PATH = "packages/contracts/schema-contract-strictness.manifest.json";
const DEFAULT_QUALITY_ROOT = "packages/mechanical-gates/fixtures/p1/quality-ratchet/cases/unchanged-baseline";
const DEFAULT_TEST_ROOT = "packages/mechanical-gates/fixtures/p1/test-anti-pattern/workspaces/positive";
const DEFAULT_QUALITY_OPTIONS = Object.freeze({
  baselinePath: "baseline.json",
  findingCarrierPath: "findings.json",
  approvalPath: "approvals.json",
  surfaceFingerprintPath: "surface-fingerprint.json",
  runnerEvidencePath: "runner-evidence.json"
});
const ALLOWED_BRIDGE_SOURCE_PREFIXES = Object.freeze([
  "packages/mechanical-gates/src/p1/schema-contract-strictness/",
  "packages/mechanical-gates/fixtures/p1/aggregate/"
]);
const ALLOWED_BRIDGE_OUTPUT_PREFIXES = Object.freeze([
  `${AGGREGATE_WORK_ROOT}/`,
  "packages/mechanical-gates/fixtures/p1/aggregate/"
]);

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const mechanicalPackageRoot = path.resolve(moduleDirectory, "../../..");
const repoRoot = path.resolve(mechanicalPackageRoot, "../..");

function finding(ruleId, findingPath, message, evidence = {}) {
  return createFinding({ family: P1_AGGREGATE_FAMILY, ruleId, path: findingPath, message, evidence });
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function truncateText(value) {
  if (typeof value !== "string") return "";
  return value.length > 4000 ? `${value.slice(0, 4000)}\n...[truncated]` : value;
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function normalizeRepoRelative(candidatePath, label) {
  if (typeof candidatePath !== "string" || candidatePath.length === 0) {
    throw new Error(`${label} must be a non-empty repo-relative string.`);
  }
  if (path.isAbsolute(candidatePath)) {
    throw new Error(`${label} must be repo-relative, not absolute: ${candidatePath}`);
  }
  const absolutePath = path.resolve(repoRoot, candidatePath);
  const relativePath = toPosix(path.relative(repoRoot, absolutePath));
  if (relativePath === "" || relativePath === ".." || relativePath.startsWith("../") || path.isAbsolute(relativePath)) {
    throw new Error(`${label} escapes repository root: ${candidatePath}`);
  }
  return relativePath;
}

function assertAllowedPrefix(relativePath, prefixes, label) {
  if (!prefixes.some((prefix) => relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix))) {
    throw new Error(`${label} is outside the aggregate-owned bridge contract roots: ${relativePath}`);
  }
}

function normalizeBridgeSourcePath(candidatePath, label) {
  const relativePath = normalizeRepoRelative(candidatePath, label);
  assertAllowedPrefix(relativePath, ALLOWED_BRIDGE_SOURCE_PREFIXES, label);
  return relativePath;
}

function normalizeBridgeOutputDir(candidatePath) {
  const relativePath = normalizeRepoRelative(candidatePath, "bridge outputDir");
  assertAllowedPrefix(relativePath, ALLOWED_BRIDGE_OUTPUT_PREFIXES, "bridge outputDir");
  return relativePath;
}

function normalizeCompiledModulePath(outputDir, candidatePath) {
  const modulePath = candidatePath ?? "index.js";
  if (typeof modulePath !== "string" || modulePath.length === 0 || path.isAbsolute(modulePath)) {
    throw new Error("bridge moduleRelativePath must be a non-empty relative path.");
  }
  const absoluteOutputDir = path.resolve(repoRoot, outputDir);
  const absolutePath = path.resolve(absoluteOutputDir, modulePath);
  const relativeToOutput = toPosix(path.relative(absoluteOutputDir, absolutePath));
  if (relativeToOutput === "" || relativeToOutput === ".." || relativeToOutput.startsWith("../") || path.isAbsolute(relativeToOutput)) {
    throw new Error(`bridge moduleRelativePath escapes bridge output directory: ${modulePath}`);
  }
  return { relativeToOutput, repoRelative: toPosix(path.relative(repoRoot, absolutePath)), absolutePath };
}

function normalizeProjectRootOption(defaultRoot, candidateRoot, label) {
  if (candidateRoot === undefined) return path.resolve(defaultRoot);
  if (typeof candidateRoot !== "string" || candidateRoot.length === 0) throw new Error(`${label} projectRoot must be a non-empty string.`);
  return path.resolve(candidateRoot);
}

function assertResultCarrier(result, expectedFamily) {
  if (!isPlainObject(result)) throw new Error(`Validator ${expectedFamily} returned a non-object result carrier.`);
  if (result.family !== expectedFamily) throw new Error(`Validator family mismatch for ${expectedFamily}: ${String(result.family)}`);
  if (typeof result.ok !== "boolean") throw new Error(`Validator ${expectedFamily} result missing boolean ok.`);
  if (typeof result.projectRoot !== "string") throw new Error(`Validator ${expectedFamily} result missing projectRoot string.`);
  if (!Array.isArray(result.findings)) throw new Error(`Validator ${expectedFamily} result missing findings array.`);
  assertTypedFindings(result.findings);
  for (const entry of result.findings) {
    if (entry.family !== expectedFamily) throw new Error(`Validator ${expectedFamily} emitted finding for wrong family: ${entry.family}`);
  }
  if (!isPlainObject(result.evidence)) throw new Error(`Validator ${expectedFamily} result missing typed evidence object.`);
}

function bridgeFinding(ruleId, message, bridgeEvidence, extra = {}) {
  return finding(ruleId, ".", message, { ...extra, bridgeEvidence });
}

function baseBridgeEvidence({ sourceRoot, sourceFiles, outputDir, moduleRelativePath }) {
  const outputModule = normalizeCompiledModulePath(outputDir, moduleRelativePath);
  return {
    carrierVersion: "p1.aggregate.i11-runner-bridge/1",
    bridgeFamily: P1_AGGREGATE_FAMILY,
    validatorFamilyExpected: SCHEMA_CONTRACT_FAMILY,
    sourceTsFilesUsed: sourceFiles,
    sourceRoot,
    outputArtifactDirectory: outputDir,
    outputArtifactFile: outputModule.repoRelative,
    moduleRelativePath: outputModule.relativeToOutput,
    moduleUrl: pathToFileURL(outputModule.absolutePath).href,
    exportedValidatorName: VALIDATOR_EXPORT_NAME,
    command: null,
    args: [],
    cwd: repoRoot,
    status: null,
    stdout: "",
    stderr: "",
    exportFound: false,
    validatorFamilyObserved: null,
    typedSubresultValidation: { ok: false, diagnostics: [] }
  };
}

function defaultBridgeOutputDir() {
  return `${AGGREGATE_WORK_ROOT}/i11-bridge-artifacts/run-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeBridgeOptions(rawBridge = {}) {
  if (!isPlainObject(rawBridge)) throw new Error("schemaContractStrictness.bridge must be a plain object when provided.");
  const allowed = new Set(["sourceRoot", "sourceFiles", "outputDir", "moduleRelativePath"]);
  const unknown = Object.keys(rawBridge).find((key) => !allowed.has(key));
  if (unknown) throw new Error(`Unknown schema-contract bridge option: ${unknown}`);
  const sourceRoot = normalizeBridgeSourcePath(rawBridge.sourceRoot ?? I11_DEFAULT_SOURCE_ROOT, "bridge sourceRoot");
  const sourceFiles = rawBridge.sourceFiles ?? [...I11_DEFAULT_SOURCE_FILES];
  if (!Array.isArray(sourceFiles) || sourceFiles.length === 0) throw new Error("bridge sourceFiles must be a non-empty array.");
  const normalizedSourceFiles = sourceFiles.map((entry, index) => normalizeBridgeSourcePath(entry, `bridge sourceFiles[${index}]`));
  const sourceRootPrefix = `${sourceRoot}/`;
  for (const sourceFile of normalizedSourceFiles) {
    if (sourceFile !== sourceRoot && !sourceFile.startsWith(sourceRootPrefix)) {
      throw new Error(`bridge source file must be under bridge sourceRoot: ${sourceFile}`);
    }
  }
  const outputDir = normalizeBridgeOutputDir(rawBridge.outputDir ?? defaultBridgeOutputDir());
  const moduleRelativePath = rawBridge.moduleRelativePath ?? "index.js";
  normalizeCompiledModulePath(outputDir, moduleRelativePath);
  return { sourceRoot, sourceFiles: normalizedSourceFiles, outputDir, moduleRelativePath };
}

function runI11Compile(bridgeOptions, evidence) {
  const absoluteOutputDir = path.resolve(repoRoot, bridgeOptions.outputDir);
  rmSync(absoluteOutputDir, { recursive: true, force: true });
  mkdirSync(absoluteOutputDir, { recursive: true });
  const args = [
    "--filter", "@vibe-engineer/contracts", "exec", "tsc",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict",
    "--noImplicitAny",
    "--strictNullChecks",
    "--exactOptionalPropertyTypes",
    "--noUncheckedIndexedAccess",
    "--noImplicitReturns",
    "--noUnusedLocals",
    "--noUnusedParameters",
    "--forceConsistentCasingInFileNames",
    "--noEmitOnError",
    "--isolatedModules",
    "--verbatimModuleSyntax",
    "--lib", "ES2022,DOM",
    "--types", "node",
    "--outDir", absoluteOutputDir,
    "--rootDir", path.resolve(repoRoot, bridgeOptions.sourceRoot),
    ...bridgeOptions.sourceFiles.map((entry) => path.resolve(repoRoot, entry))
  ];
  evidence.command = "pnpm";
  evidence.args = args;
  evidence.cwd = repoRoot;
  const completed = spawnSync("pnpm", args, { cwd: repoRoot, encoding: "utf8" });
  evidence.status = completed.status;
  evidence.stdout = truncateText(completed.stdout);
  evidence.stderr = truncateText(completed.stderr);
  evidence.signal = completed.signal ?? null;
  evidence.errorMessage = completed.error instanceof Error ? completed.error.message : undefined;
  return completed.status === 0;
}

async function loadI11Validator(bridgeOptions, evidence) {
  const outputModule = normalizeCompiledModulePath(bridgeOptions.outputDir, bridgeOptions.moduleRelativePath);
  if (!existsSync(outputModule.absolutePath) || !statSync(outputModule.absolutePath).isFile()) {
    return { finding: bridgeFinding("aggregate.i11-bridge.missing-artifact", "I-11 bridge compiled module artifact is missing; aggregate fails closed.", evidence, { outputArtifactFile: outputModule.repoRelative }) };
  }
  let moduleNamespace;
  try {
    moduleNamespace = await import(`${pathToFileURL(outputModule.absolutePath).href}?aggregateBridgeRun=${Date.now()}-${Math.random().toString(16).slice(2)}`);
  } catch (error) {
    return { finding: bridgeFinding("aggregate.i11-bridge.import-failed", "I-11 bridge compiled module import failed; aggregate fails closed.", evidence, { errorName: error instanceof Error ? error.name : undefined, errorMessage: error instanceof Error ? error.message : String(error) }) };
  }
  const validator = moduleNamespace[VALIDATOR_EXPORT_NAME];
  evidence.exportFound = typeof validator === "function";
  if (typeof validator !== "function") {
    return { finding: bridgeFinding("aggregate.i11-bridge.wrong-export", "I-11 bridge module does not export validateSchemaContractStrictness; aggregate fails closed.", evidence, { exportedKeys: Object.keys(moduleNamespace).sort() }) };
  }
  return { validator };
}

async function runSchemaContractStrictness(projectRoot, rawOptions = {}) {
  const bridgeEvidenceShell = { bridge: null };
  try {
    const bridgeOptions = normalizeBridgeOptions(rawOptions.bridge ?? {});
    const evidence = baseBridgeEvidence(bridgeOptions);
    bridgeEvidenceShell.bridge = evidence;
    const compiled = runI11Compile(bridgeOptions, evidence);
    if (!compiled) {
      evidence.typedSubresultValidation.diagnostics.push("compile failed before validator import");
      return { result: null, evidence, aggregateFinding: bridgeFinding("aggregate.i11-bridge.compile-failed", "I-11 bridge TypeScript compile failed; aggregate fails closed.", evidence) };
    }
    const loaded = await loadI11Validator(bridgeOptions, evidence);
    if (loaded.finding) return { result: null, evidence, aggregateFinding: loaded.finding };
    let result;
    try {
      result = await loaded.validator(projectRoot, { manifestPath: rawOptions.manifestPath ?? DEFAULT_SCHEMA_MANIFEST_PATH });
    } catch (error) {
      evidence.typedSubresultValidation.diagnostics.push("validator threw before returning a typed result carrier");
      return { result: null, evidence, aggregateFinding: bridgeFinding("aggregate.validator-exception", "I-11 validator raised instead of returning a typed result; aggregate fails closed.", evidence, { family: SCHEMA_CONTRACT_FAMILY, errorName: error instanceof Error ? error.name : undefined, errorMessage: error instanceof Error ? error.message : String(error) }) };
    }
    evidence.validatorFamilyObserved = isPlainObject(result) ? result.family ?? null : null;
    try {
      assertResultCarrier(result, SCHEMA_CONTRACT_FAMILY);
      evidence.typedSubresultValidation = { ok: true, diagnostics: [] };
    } catch (error) {
      evidence.typedSubresultValidation = { ok: false, diagnostics: [error instanceof Error ? error.message : String(error)] };
      const ruleId = isPlainObject(result) && result.family && result.family !== SCHEMA_CONTRACT_FAMILY ? "aggregate.i11-bridge.wrong-family" : "aggregate.malformed-subresult";
      return { result: null, evidence, aggregateFinding: bridgeFinding(ruleId, "I-11 validator returned a malformed or wrong-family typed result carrier; aggregate fails closed.", evidence, { family: SCHEMA_CONTRACT_FAMILY, errorMessage: error instanceof Error ? error.message : String(error) }) };
    }
    return { result, evidence };
  } catch (error) {
    const evidence = bridgeEvidenceShell.bridge ?? {
      carrierVersion: "p1.aggregate.i11-runner-bridge/1",
      bridgeFamily: P1_AGGREGATE_FAMILY,
      validatorFamilyExpected: SCHEMA_CONTRACT_FAMILY,
      typedSubresultValidation: { ok: false, diagnostics: [error instanceof Error ? error.message : String(error)] }
    };
    return { result: null, evidence, aggregateFinding: bridgeFinding("aggregate.i11-bridge.path-invalid", "I-11 bridge input/output path or option is invalid; aggregate fails closed.", evidence, { errorName: error instanceof Error ? error.name : undefined, errorMessage: error instanceof Error ? error.message : String(error) }) };
  }
}

async function runQualityRatchet(projectRoot, rawOptions = {}) {
  const qualityProjectRoot = normalizeProjectRootOption(path.resolve(repoRoot, DEFAULT_QUALITY_ROOT), rawOptions.projectRoot, "qualityRatchet");
  const validatorOptions = { ...DEFAULT_QUALITY_OPTIONS, ...(rawOptions.options ?? {}) };
  return validateQualityRatchet(qualityProjectRoot, validatorOptions);
}

async function runTestAntiPatterns(projectRoot, rawOptions = {}) {
  const scannerProjectRoot = normalizeProjectRootOption(path.resolve(repoRoot, DEFAULT_TEST_ROOT), rawOptions.projectRoot, "testAntiPattern");
  return validateTestAntiPatterns(scannerProjectRoot, rawOptions.options ?? {});
}

function validateAggregateOptions(options) {
  const findings = [];
  if (!isPlainObject(options)) {
    findings.push(finding("aggregate.invalid-option", ".", "P1 aggregate options must be a plain object when provided.", { actualType: Array.isArray(options) ? "array" : typeof options }));
    return { findings, options: {} };
  }
  const allowed = new Set(["families", "schemaContractStrictness", "qualityRatchet", "testAntiPattern"]);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key)) findings.push(finding("aggregate.unknown-option", ".", "Unknown P1 aggregate option fails closed.", { option: key }));
  }
  if (options.families !== undefined && (!Array.isArray(options.families) || !options.families.every((entry) => typeof entry === "string" && entry.length > 0))) {
    findings.push(finding("aggregate.invalid-option", ".", "P1 aggregate families option must be an array of non-empty strings.", { option: "families" }));
  }
  for (const key of ["schemaContractStrictness", "qualityRatchet", "testAntiPattern"]) {
    if (options[key] !== undefined && !isPlainObject(options[key])) {
      findings.push(finding("aggregate.invalid-option", ".", `P1 aggregate ${key} options must be a plain object.`, { option: key }));
    }
  }
  return { findings, options };
}

async function runImplementedFamily(projectRoot, family, options) {
  if (family === SCHEMA_CONTRACT_FAMILY) return runSchemaContractStrictness(projectRoot, options.schemaContractStrictness ?? {});
  if (family === "p1.quality-ratchet") return { result: await runQualityRatchet(projectRoot, options.qualityRatchet ?? {}) };
  if (family === "p1.test-anti-pattern") return { result: await runTestAntiPatterns(projectRoot, options.testAntiPattern ?? {}) };
  throw new Error(`Unknown P1 family dispatch: ${family}`);
}

export async function runP1Aggregate(projectRoot, options = {}) {
  const normalizedProjectRoot = path.resolve(projectRoot);
  const optionState = validateAggregateOptions(options);
  const findings = [...optionState.findings];
  const subresults = [];
  const bridgeEvidence = { schemaContractStrictness: null };
  const sourceApiIdentities = {
    schemaContractStrictness: I11_DEFAULT_SOURCE_FILES,
    qualityRatchet: "packages/mechanical-gates/src/p1/quality-ratchet/index.js#validateQualityRatchet",
    testAntiPattern: "packages/mechanical-gates/src/p1/test-anti-pattern/index.js#validateTestAntiPatterns"
  };
  const requestedFamilies = Array.isArray(optionState.options.families) ? [...optionState.options.families] : [...P1_AGGREGATE_FAMILIES];

  for (const family of requestedFamilies) {
    if (!P1_AGGREGATE_FAMILIES.includes(family)) {
      findings.push(finding("aggregate.unknown-family", ".", "Aggregate requested an unknown P1 family.", { family, implementedFamilies: [...P1_AGGREGATE_FAMILIES] }));
    }
  }

  for (const family of P1_AGGREGATE_FAMILIES) {
    if (!requestedFamilies.includes(family)) {
      findings.push(finding("aggregate.omitted-family", ".", "Aggregate run omitted an implemented P1 gate family.", { omittedFamily: family, implementedFamilies: [...P1_AGGREGATE_FAMILIES], requestedFamilies }));
    }
  }

  for (const family of requestedFamilies) {
    if (!P1_AGGREGATE_FAMILIES.includes(family)) continue;
    try {
      const familyRun = await runImplementedFamily(normalizedProjectRoot, family, optionState.options);
      if (family === SCHEMA_CONTRACT_FAMILY) bridgeEvidence.schemaContractStrictness = familyRun.evidence ?? null;
      if (familyRun.aggregateFinding) {
        findings.push(familyRun.aggregateFinding);
        continue;
      }
      assertResultCarrier(familyRun.result, family);
      subresults.push(familyRun.result);
      findings.push(...familyRun.result.findings);
    } catch (error) {
      findings.push(finding("aggregate.validator-exception", ".", "P1 aggregate validator raised instead of returning a typed result; aggregate fails closed.", { family, errorName: error instanceof Error ? error.name : undefined, errorMessage: error instanceof Error ? error.message : String(error), errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined }));
    }
  }

  const subresultFamilies = new Set(subresults.map((entry) => entry.family));
  for (const family of P1_AGGREGATE_FAMILIES) {
    if (requestedFamilies.includes(family) && !subresultFamilies.has(family)) {
      findings.push(finding("aggregate.missing-subresult", ".", "Implemented P1 family did not produce a typed subresult carrier; aggregate fails closed.", { family }));
    }
  }

  const summary = Object.fromEntries(P1_AGGREGATE_FAMILIES.map((family) => {
    const result = subresults.find((entry) => entry.family === family);
    return [family, result ? { ok: result.ok, findingCount: result.findings.length } : { ok: false, missing: true }];
  }));

  return createValidatorResult({
    family: P1_AGGREGATE_FAMILY,
    projectRoot: normalizedProjectRoot,
    findings,
    evidence: {
      schemaVersion: "p1.aggregate.result/1",
      family: P1_AGGREGATE_FAMILY,
      implementedFamilies: [...P1_AGGREGATE_FAMILIES],
      requestedFamilies,
      subresults,
      stableFindings: findings.map((entry) => ({ family: entry.family, ruleId: entry.ruleId, path: entry.path, blocking: entry.blocking })),
      i11Bridge: bridgeEvidence.schemaContractStrictness,
      sourceApiIdentities,
      sourceFiles: {
        schemaContractStrictness: bridgeEvidence.schemaContractStrictness?.sourceTsFilesUsed ?? I11_DEFAULT_SOURCE_FILES,
        qualityRatchet: ["packages/mechanical-gates/src/p1/quality-ratchet/index.js"],
        testAntiPattern: ["packages/mechanical-gates/src/p1/test-anti-pattern/index.js"]
      },
      inputPaths: {
        schemaContractStrictness: optionState.options.schemaContractStrictness?.manifestPath ?? DEFAULT_SCHEMA_MANIFEST_PATH,
        qualityRatchet: optionState.options.qualityRatchet?.projectRoot ?? DEFAULT_QUALITY_ROOT,
        testAntiPattern: optionState.options.testAntiPattern?.projectRoot ?? DEFAULT_TEST_ROOT
      },
      summary
    }
  });
}
