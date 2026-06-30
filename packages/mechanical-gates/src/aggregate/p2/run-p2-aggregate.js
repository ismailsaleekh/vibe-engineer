import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  assertTypedFindings,
  createFinding,
  createValidatorResult,
} from "../../p0/boundaries/contracts.js";

export const P2_AGGREGATE_FAMILY = "p2.aggregate";
export const P2_AGGREGATE_FAMILIES = Object.freeze(["p2.code-smell"]);

const CODE_SMELL_FAMILY = "p2.code-smell";
const VALIDATOR_EXPORT_NAME = "validateCodeSmells";
const RATCHET_CARRIER_VERSION = "quality-ratchet.findings/1";
const I13_DEFAULT_SOURCE_ROOT = "packages/mechanical-gates/src/p2/code-smell";
const I13_DEFAULT_SOURCE_FILES = Object.freeze([
  "packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts",
  "packages/mechanical-gates/src/p2/code-smell/index.ts",
]);
const AGGREGATE_WORK_ROOT = ".vibe/work/I-13C-p2-aggregate-runner-bridge/aggregate";
const DEFAULT_CODE_SMELL_PROJECT_ROOT =
  "packages/mechanical-gates/fixtures/p2/code-smell/projects/clean";
const DEFAULT_CODE_SMELL_OPTIONS = Object.freeze({
  includePaths: ["src"],
  maxFileBytes: 262144,
});
const ALLOWED_BRIDGE_SOURCE_PREFIXES = Object.freeze([
  "packages/mechanical-gates/src/p2/code-smell/",
  "packages/mechanical-gates/fixtures/p2/aggregate/",
]);
const ALLOWED_BRIDGE_OUTPUT_PREFIXES = Object.freeze([
  `${AGGREGATE_WORK_ROOT}/`,
  "packages/mechanical-gates/fixtures/p2/aggregate/",
]);

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const mechanicalPackageRoot = path.resolve(moduleDirectory, "../../..");
const repoRoot = path.resolve(mechanicalPackageRoot, "../..");

function finding(ruleId, findingPath, message, evidence = {}) {
  return createFinding({
    family: P2_AGGREGATE_FAMILY,
    ruleId,
    path: findingPath,
    message,
    evidence,
  });
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
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`${label} escapes repository root: ${candidatePath}`);
  }
  return relativePath;
}

function assertAllowedPrefix(relativePath, prefixes, label) {
  if (
    !prefixes.some(
      (prefix) => relativePath === prefix.slice(0, -1) || relativePath.startsWith(prefix),
    )
  ) {
    throw new Error(
      `${label} is outside the aggregate-owned bridge contract roots: ${relativePath}`,
    );
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
  if (
    relativeToOutput === "" ||
    relativeToOutput === ".." ||
    relativeToOutput.startsWith("../") ||
    path.isAbsolute(relativeToOutput)
  ) {
    throw new Error(`bridge moduleRelativePath escapes bridge output directory: ${modulePath}`);
  }
  return {
    relativeToOutput,
    repoRelative: toPosix(path.relative(repoRoot, absolutePath)),
    absolutePath,
  };
}

function normalizeProjectRootOption(defaultRoot, candidateRoot, label) {
  if (candidateRoot === undefined) return path.resolve(defaultRoot);
  if (typeof candidateRoot !== "string" || candidateRoot.length === 0)
    throw new Error(`${label} projectRoot must be a non-empty string.`);
  return path.resolve(candidateRoot);
}

function assertResultCarrier(result, expectedFamily) {
  if (!isPlainObject(result))
    throw new Error(`Validator ${expectedFamily} returned a non-object result carrier.`);
  if (result.family !== expectedFamily)
    throw new Error(`Validator family mismatch for ${expectedFamily}: ${String(result.family)}`);
  if (typeof result.ok !== "boolean")
    throw new Error(`Validator ${expectedFamily} result missing boolean ok.`);
  if (typeof result.projectRoot !== "string")
    throw new Error(`Validator ${expectedFamily} result missing projectRoot string.`);
  if (!Array.isArray(result.findings))
    throw new Error(`Validator ${expectedFamily} result missing findings array.`);
  assertTypedFindings(result.findings);
  for (const entry of result.findings) {
    if (entry.family !== expectedFamily)
      throw new Error(
        `Validator ${expectedFamily} emitted finding for wrong family: ${entry.family}`,
      );
  }
  if (!isPlainObject(result.evidence))
    throw new Error(`Validator ${expectedFamily} result missing typed evidence object.`);
}

function bridgeFinding(ruleId, message, bridgeEvidence, extra = {}) {
  return finding(ruleId, ".", message, { ...extra, bridgeEvidence });
}

function baseBridgeEvidence({ sourceRoot, sourceFiles, outputDir, moduleRelativePath }) {
  const outputModule = normalizeCompiledModulePath(outputDir, moduleRelativePath);
  return {
    carrierVersion: "p2.aggregate.code-smell-runner-bridge/1",
    bridgeFamily: P2_AGGREGATE_FAMILY,
    validatorFamilyExpected: CODE_SMELL_FAMILY,
    ratchetCarrierVersion: RATCHET_CARRIER_VERSION,
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
    signal: null,
    errorMessage: undefined,
    exportFound: false,
    validatorFamilyObserved: null,
    typedSubresultValidation: { ok: false, diagnostics: [] },
  };
}

function defaultBridgeOutputDir() {
  return `${AGGREGATE_WORK_ROOT}/code-smell-bridge-artifacts/run-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeBridgeOptions(rawBridge = {}) {
  if (!isPlainObject(rawBridge))
    throw new Error("codeSmell.bridge must be a plain object when provided.");
  const allowed = new Set(["sourceRoot", "sourceFiles", "outputDir", "moduleRelativePath"]);
  const unknown = Object.keys(rawBridge).find((key) => !allowed.has(key));
  if (unknown) throw new Error(`Unknown code-smell bridge option: ${unknown}`);
  const sourceRoot = normalizeBridgeSourcePath(
    rawBridge.sourceRoot ?? I13_DEFAULT_SOURCE_ROOT,
    "bridge sourceRoot",
  );
  const sourceFiles = rawBridge.sourceFiles ?? [...I13_DEFAULT_SOURCE_FILES];
  if (!Array.isArray(sourceFiles) || sourceFiles.length === 0)
    throw new Error("bridge sourceFiles must be a non-empty array.");
  const normalizedSourceFiles = sourceFiles.map((entry, index) =>
    normalizeBridgeSourcePath(entry, `bridge sourceFiles[${index}]`),
  );
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

function runCodeSmellCompile(bridgeOptions, evidence) {
  const absoluteOutputDir = path.resolve(repoRoot, bridgeOptions.outputDir);
  rmSync(absoluteOutputDir, { recursive: true, force: true });
  mkdirSync(absoluteOutputDir, { recursive: true });
  const args = [
    "exec",
    "tsc",
    "--outDir",
    absoluteOutputDir,
    "--rootDir",
    path.resolve(repoRoot, bridgeOptions.sourceRoot),
    "--target",
    "ES2022",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--strict",
    "--skipLibCheck",
    "false",
    "--lib",
    "ES2022",
    ...bridgeOptions.sourceFiles.map((entry) => path.resolve(repoRoot, entry)),
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

async function loadCodeSmellValidator(bridgeOptions, evidence) {
  const outputModule = normalizeCompiledModulePath(
    bridgeOptions.outputDir,
    bridgeOptions.moduleRelativePath,
  );
  if (!existsSync(outputModule.absolutePath) || !statSync(outputModule.absolutePath).isFile()) {
    return {
      finding: bridgeFinding(
        "aggregate.p2-bridge.missing-artifact",
        "P2 bridge compiled module artifact is missing; aggregate fails closed.",
        evidence,
        { outputArtifactFile: outputModule.repoRelative },
      ),
    };
  }
  let moduleNamespace;
  try {
    moduleNamespace = await import(
      `${pathToFileURL(outputModule.absolutePath).href}?aggregateBridgeRun=${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
  } catch (error) {
    return {
      finding: bridgeFinding(
        "aggregate.p2-bridge.import-failed",
        "P2 bridge compiled module import failed; aggregate fails closed.",
        evidence,
        {
          errorName: error instanceof Error ? error.name : undefined,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      ),
    };
  }
  const validator = moduleNamespace[VALIDATOR_EXPORT_NAME];
  evidence.exportFound = typeof validator === "function";
  if (typeof validator !== "function") {
    return {
      finding: bridgeFinding(
        "aggregate.p2-bridge.wrong-export",
        "P2 bridge module does not export validateCodeSmells; aggregate fails closed.",
        evidence,
        { exportedKeys: Object.keys(moduleNamespace).sort() },
      ),
    };
  }
  return { validator };
}

async function runCodeSmell(projectRoot, rawOptions = {}) {
  const bridgeEvidenceShell = { bridge: null };
  try {
    const bridgeOptions = normalizeBridgeOptions(rawOptions.bridge ?? {});
    const evidence = baseBridgeEvidence(bridgeOptions);
    bridgeEvidenceShell.bridge = evidence;
    const compiled = runCodeSmellCompile(bridgeOptions, evidence);
    if (!compiled) {
      evidence.typedSubresultValidation.diagnostics.push("compile failed before validator import");
      return {
        result: null,
        evidence,
        aggregateFinding: bridgeFinding(
          "aggregate.p2-bridge.compile-failed",
          "P2 bridge TypeScript compile failed; aggregate fails closed.",
          evidence,
        ),
      };
    }
    const loaded = await loadCodeSmellValidator(bridgeOptions, evidence);
    if (loaded.finding) return { result: null, evidence, aggregateFinding: loaded.finding };
    const codeSmellProjectRoot = normalizeProjectRootOption(
      path.resolve(repoRoot, DEFAULT_CODE_SMELL_PROJECT_ROOT),
      rawOptions.projectRoot,
      "codeSmell",
    );
    const validatorOptions = { ...DEFAULT_CODE_SMELL_OPTIONS, ...(rawOptions.options ?? {}) };
    let result;
    try {
      result = await loaded.validator(codeSmellProjectRoot, validatorOptions);
    } catch (error) {
      evidence.typedSubresultValidation.diagnostics.push(
        "validator threw before returning a typed result carrier",
      );
      return {
        result: null,
        evidence,
        aggregateFinding: bridgeFinding(
          "aggregate.validator-exception",
          "P2 validator raised instead of returning a typed result; aggregate fails closed.",
          evidence,
          {
            family: CODE_SMELL_FAMILY,
            errorName: error instanceof Error ? error.name : undefined,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        ),
      };
    }
    evidence.validatorFamilyObserved = isPlainObject(result) ? (result.family ?? null) : null;
    try {
      assertResultCarrier(result, CODE_SMELL_FAMILY);
      evidence.typedSubresultValidation = { ok: true, diagnostics: [] };
    } catch (error) {
      evidence.typedSubresultValidation = {
        ok: false,
        diagnostics: [error instanceof Error ? error.message : String(error)],
      };
      const ruleId =
        isPlainObject(result) && result.family && result.family !== CODE_SMELL_FAMILY
          ? "aggregate.p2-bridge.wrong-family"
          : "aggregate.malformed-subresult";
      return {
        result: null,
        evidence,
        aggregateFinding: bridgeFinding(
          ruleId,
          "P2 validator returned a malformed or wrong-family typed result carrier; aggregate fails closed.",
          evidence,
          {
            family: CODE_SMELL_FAMILY,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        ),
      };
    }
    return { result, evidence };
  } catch (error) {
    const evidence = bridgeEvidenceShell.bridge ?? {
      carrierVersion: "p2.aggregate.code-smell-runner-bridge/1",
      bridgeFamily: P2_AGGREGATE_FAMILY,
      validatorFamilyExpected: CODE_SMELL_FAMILY,
      ratchetCarrierVersion: RATCHET_CARRIER_VERSION,
      typedSubresultValidation: {
        ok: false,
        diagnostics: [error instanceof Error ? error.message : String(error)],
      },
    };
    return {
      result: null,
      evidence,
      aggregateFinding: bridgeFinding(
        "aggregate.p2-bridge.path-invalid",
        "P2 bridge input/output path or option is invalid; aggregate fails closed.",
        evidence,
        {
          errorName: error instanceof Error ? error.name : undefined,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      ),
    };
  }
}

function projectStableIdentity(entry) {
  const identity = isPlainObject(entry) && isPlainObject(entry.identity) ? entry.identity : null;
  return {
    family: entry.family,
    ruleId: entry.ruleId,
    detectorId: entry.detectorId ?? null,
    path: entry.path,
    blocking: entry.blocking,
    mode: entry.mode ?? null,
    tool: identity ? (identity.tool ?? null) : null,
    symbol: identity ? (identity.symbol ?? null) : null,
    structuralSignature: identity ? (identity.structuralSignature ?? null) : null,
    contentHash: identity ? (identity.contentHash ?? null) : null,
  };
}

function validateAggregateOptions(options) {
  const findings = [];
  if (!isPlainObject(options)) {
    findings.push(
      finding(
        "aggregate.invalid-option",
        ".",
        "P2 aggregate options must be a plain object when provided.",
        { actualType: Array.isArray(options) ? "array" : typeof options },
      ),
    );
    return { findings, options: {} };
  }
  const allowed = new Set(["families", "codeSmell"]);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key))
      findings.push(
        finding("aggregate.unknown-option", ".", "Unknown P2 aggregate option fails closed.", {
          option: key,
        }),
      );
  }
  if (
    options.families !== undefined &&
    (!Array.isArray(options.families) ||
      !options.families.every((entry) => typeof entry === "string" && entry.length > 0))
  ) {
    findings.push(
      finding(
        "aggregate.invalid-option",
        ".",
        "P2 aggregate families option must be an array of non-empty strings.",
        { option: "families" },
      ),
    );
  }
  if (options.codeSmell !== undefined && !isPlainObject(options.codeSmell)) {
    findings.push(
      finding(
        "aggregate.invalid-option",
        ".",
        "P2 aggregate codeSmell options must be a plain object.",
        { option: "codeSmell" },
      ),
    );
  }
  return { findings, options };
}

async function runImplementedFamily(projectRoot, family, options) {
  if (family === CODE_SMELL_FAMILY) return runCodeSmell(projectRoot, options.codeSmell ?? {});
  throw new Error(`Unknown P2 family dispatch: ${family}`);
}

export async function runP2Aggregate(projectRoot, options = {}) {
  const normalizedProjectRoot = path.resolve(projectRoot);
  const optionState = validateAggregateOptions(options);
  const findings = [...optionState.findings];
  const subresults = [];
  const bridgeEvidence = { codeSmell: null };
  const sourceApiIdentities = {
    codeSmell: I13_DEFAULT_SOURCE_FILES,
  };
  const requestedFamilies = Array.isArray(optionState.options.families)
    ? [...optionState.options.families]
    : [...P2_AGGREGATE_FAMILIES];

  for (const family of requestedFamilies) {
    if (!P2_AGGREGATE_FAMILIES.includes(family)) {
      findings.push(
        finding("aggregate.unknown-family", ".", "Aggregate requested an unknown P2 family.", {
          family,
          implementedFamilies: [...P2_AGGREGATE_FAMILIES],
        }),
      );
    }
  }

  for (const family of P2_AGGREGATE_FAMILIES) {
    if (!requestedFamilies.includes(family)) {
      findings.push(
        finding(
          "aggregate.omitted-family",
          ".",
          "Aggregate run omitted an implemented P2 gate family.",
          {
            omittedFamily: family,
            implementedFamilies: [...P2_AGGREGATE_FAMILIES],
            requestedFamilies,
          },
        ),
      );
    }
  }

  for (const family of requestedFamilies) {
    if (!P2_AGGREGATE_FAMILIES.includes(family)) continue;
    try {
      const familyRun = await runImplementedFamily(
        normalizedProjectRoot,
        family,
        optionState.options,
      );
      if (family === CODE_SMELL_FAMILY) bridgeEvidence.codeSmell = familyRun.evidence ?? null;
      if (familyRun.aggregateFinding) {
        findings.push(familyRun.aggregateFinding);
        continue;
      }
      assertResultCarrier(familyRun.result, family);
      subresults.push(familyRun.result);
      findings.push(...familyRun.result.findings);
    } catch (error) {
      findings.push(
        finding(
          "aggregate.validator-exception",
          ".",
          "P2 aggregate validator raised instead of returning a typed result; aggregate fails closed.",
          {
            family,
            errorName: error instanceof Error ? error.name : undefined,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorCode:
              error && typeof error === "object" && "code" in error ? error.code : undefined,
          },
        ),
      );
    }
  }

  const subresultFamilies = new Set(subresults.map((entry) => entry.family));
  for (const family of P2_AGGREGATE_FAMILIES) {
    if (requestedFamilies.includes(family) && !subresultFamilies.has(family)) {
      findings.push(
        finding(
          "aggregate.missing-subresult",
          ".",
          "Implemented P2 family did not produce a typed subresult carrier; aggregate fails closed.",
          { family },
        ),
      );
    }
  }

  const summary = Object.fromEntries(
    P2_AGGREGATE_FAMILIES.map((family) => {
      const result = subresults.find((entry) => entry.family === family);
      return [
        family,
        result
          ? { ok: result.ok, findingCount: result.findings.length }
          : { ok: false, missing: true },
      ];
    }),
  );

  return createValidatorResult({
    family: P2_AGGREGATE_FAMILY,
    projectRoot: normalizedProjectRoot,
    findings,
    evidence: {
      schemaVersion: "p2.aggregate.result/1",
      family: P2_AGGREGATE_FAMILY,
      implementedFamilies: [...P2_AGGREGATE_FAMILIES],
      requestedFamilies,
      subresults,
      stableFindings: findings.map((entry) => projectStableIdentity(entry)),
      codeSmellBridge: bridgeEvidence.codeSmell,
      sourceApiIdentities,
      sourceFiles: {
        codeSmell: bridgeEvidence.codeSmell?.sourceTsFilesUsed ?? I13_DEFAULT_SOURCE_FILES,
      },
      inputPaths: {
        codeSmell: optionState.options.codeSmell?.projectRoot ?? DEFAULT_CODE_SMELL_PROJECT_ROOT,
      },
      summary,
    },
  });
}
