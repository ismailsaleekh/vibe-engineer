#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const { executeSchematic } = await import(pathToFileURL(resolve(repoRoot, "packages/schematics/src/engine/index.js")).href);
const { validateSchematicManifestWithArtifacts } = await import(pathToFileURL(resolve(repoRoot, "packages/cli/src/commands/schematic/artifacts-adapter.js")).href);
const standardsApi = await import(pathToFileURL(resolve(repoRoot, "packages/standards/src/index.js")).href);
const evidenceRoot = resolve(repoRoot, ".vibe/work/I-07B-built-in-schematics-fixtures/post-fix-revalidation-evidence");
const inspectionRoot = resolve(evidenceRoot, "inspection/contract-boundary-probe");
const templatesRoot = resolve(repoRoot, "packages/schematics/templates");
const fixtureRoot = resolve(repoRoot, "packages/schematics/fixtures/builtins");
const compiledBuiltins = resolve(evidenceRoot, "typescript/schematics-builtins-compiled/builtins/index.js");

rmSync(inspectionRoot, { recursive: true, force: true });
mkdirSync(inspectionRoot, { recursive: true });

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function snapshot(root) {
  if (!existsSync(root)) return [];
  const rows = [];
  function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      const full = resolve(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else rows.push({ path: relative(root, full).replaceAll("\\", "/"), bytes: stat.size });
    }
  }
  walk(root);
  return rows;
}
function captureThrow(fn) {
  try {
    fn();
    return { threw: false, message: null, code: null };
  } catch (error) {
    return { threw: true, message: error?.message ?? String(error), code: error?.code ?? null };
  }
}
function fieldPattern(entry, field) {
  return entry.manifest.extensions["dev.vibe-engineer.schematics.dl08"].inputSchema.properties[field].pattern;
}
function mutateEntry(entries, slug, mutator) {
  const mutated = clone(entries);
  const entry = mutated.find((item) => item.slug === slug);
  if (!entry) throw new Error(`Missing slug ${slug}`);
  mutator(entry.manifest.extensions["dev.vibe-engineer.schematics.dl08"]);
  return mutated;
}
function generatedPathForName(name) {
  return `docs/standards/${name.trim().toLowerCase().replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[_ ./]+/g, "-")}.md`;
}

if (!existsSync(compiledBuiltins)) {
  throw new Error(`Compiled built-in helper is missing: ${compiledBuiltins}`);
}

const builtinsApi = await import(pathToFileURL(compiledBuiltins).href);
const presetCompiledRoot = resolve(evidenceRoot, "contracts/typescript-preset-compiled");
rmSync(presetCompiledRoot, { recursive: true, force: true });
mkdirSync(presetCompiledRoot, { recursive: true });
const presetTsc = spawnSync(resolve(repoRoot, "node_modules/.bin/tsc"), [
  "packages/presets/typescript/src/index.ts",
  "--target", "ES2022",
  "--module", "NodeNext",
  "--moduleResolution", "NodeNext",
  "--strict", "true",
  "--exactOptionalPropertyTypes", "true",
  "--noUncheckedIndexedAccess", "true",
  "--declaration", "false",
  "--sourceMap", "false",
  "--outDir", presetCompiledRoot,
  "--rootDir", "packages/presets/typescript",
  "--skipLibCheck", "false",
], { cwd: repoRoot, encoding: "utf8" });
writeFileSync(resolve(inspectionRoot, "typescript-preset-tsc.stdout.txt"), presetTsc.stdout, "utf8");
writeFileSync(resolve(inspectionRoot, "typescript-preset-tsc.stderr.txt"), presetTsc.stderr, "utf8");
writeFileSync(resolve(inspectionRoot, "typescript-preset-tsc.exit.txt"), `${presetTsc.status}\n`, "utf8");
assert.equal(presetTsc.status, 0, "TypeScript preset source must compile");
const presetApi = await import(pathToFileURL(resolve(presetCompiledRoot, "src/index.js")).href);

const entries = await builtinsApi.readBuiltInSchematicManifests({
  templatesRoot,
  readTextFile: (filePath) => readFileSync(filePath, "utf8"),
});
const contractPositive = builtinsApi.assertBuiltInContractSurfaces(entries, { standardsApi, typescriptPresetApi: presetApi });
const presetMetadata = presetApi.getTypeScriptPresetMetadata();
const presetRendered = presetApi.renderTypeScriptPresetFiles();
const presetValidation = presetApi.validateTypeScriptPresetFiles(presetRendered);
assert.equal(presetValidation.ok, true);
const presetManifest = JSON.parse(presetRendered.find((file) => file.path === ".vibe/generated/typescript-preset/manifest.json").content);
const actualPatterns = [];
for (const entry of entries) {
  const dl08 = entry.manifest.extensions["dev.vibe-engineer.schematics.dl08"];
  const primaryStandard = standardsApi.loadStandard(dl08.standardIds[0]);
  actualPatterns.push({
    slug: entry.slug,
    standardId: primaryStandard.standardId,
    standardIdPattern: fieldPattern(entry, "standardId"),
    expectedStandardIdPattern: builtinsApi.regexpPatternForLiteral(primaryStandard.standardId),
    standardTitlePattern: fieldPattern(entry, "standardTitle"),
    expectedStandardTitlePattern: builtinsApi.regexpPatternForLiteral(primaryStandard.title),
    standardSummaryPattern: fieldPattern(entry, "standardSummary"),
    expectedStandardSummaryPattern: builtinsApi.regexpPatternForLiteral(primaryStandard.summary),
    presetIdPattern: fieldPattern(entry, "presetId"),
    expectedPresetIdPattern: builtinsApi.regexpPatternForLiteral(presetMetadata.presetId),
    quickGatePattern: fieldPattern(entry, "quickGateLabel"),
    expectedQuickGatePattern: builtinsApi.regexpPatternForLiteral(presetMetadata.quickGateLabel),
    packageManagerPattern: fieldPattern(entry, "packageManager"),
    expectedPackageManagerPattern: builtinsApi.regexpPatternForLiteral(presetManifest.pnpmDefaults.packageManager),
    typecheckCommandPattern: fieldPattern(entry, "typecheckCommand"),
    expectedTypecheckCommandPattern: builtinsApi.regexpPatternForLiteral(presetManifest.testAndTypecheckDefaults.typecheckCommand),
  });
}

const standardDocInput = readJson(resolve(fixtureRoot, "inputs/valid/standard-doc.json"));
const positiveRoot = resolve(inspectionRoot, "positive-standard-doc-target");
rmSync(positiveRoot, { recursive: true, force: true });
mkdirSync(positiveRoot, { recursive: true });
const positiveResult = await executeSchematic({
  manifestPath: resolve(templatesRoot, "standard-doc/manifest.json"),
  input: builtinsApi.normalizeBuiltInContractInput(standardDocInput, { standardsApi, typescriptPresetApi: presetApi }),
  targetRoot: positiveRoot,
  mode: "apply",
  deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts },
});
assert.equal(positiveResult.status, "ok");
const positiveOutputPath = resolve(positiveRoot, generatedPathForName(standardDocInput.name));
const positiveOutput = readFileSync(positiveOutputPath, "utf8");
assert.equal(positiveOutput.includes(standardsApi.loadStandard(standardDocInput.standardId).title), true);
assert.equal(positiveOutput.includes(standardsApi.loadStandard(standardDocInput.standardId).summary), true);

const forgedStandardInput = {
  ...standardDocInput,
  standardTitle: "Forged title not returned by I-07C",
  standardSummary: "Forged summary not returned by I-07C",
};
const forgedStandardHelper = captureThrow(() => builtinsApi.normalizeBuiltInContractInput(forgedStandardInput, { standardsApi, typescriptPresetApi: presetApi }));
assert.equal(forgedStandardHelper.threw, true);
const forgedStandardRoot = resolve(inspectionRoot, "forged-standard-target");
rmSync(forgedStandardRoot, { recursive: true, force: true });
mkdirSync(forgedStandardRoot, { recursive: true });
const forgedStandardRaw = await executeSchematic({
  manifestPath: resolve(templatesRoot, "standard-doc/manifest.json"),
  input: forgedStandardInput,
  targetRoot: forgedStandardRoot,
  mode: "apply",
  deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts },
});
assert.equal(["invalid_input", "blocked"].includes(forgedStandardRaw.status), true);
assert.deepEqual(snapshot(forgedStandardRoot), []);

const unknownStandardInput = readJson(resolve(fixtureRoot, "inputs/invalid/standard-doc-unsupported-standard.json"));
const unknownStandardHelper = captureThrow(() => builtinsApi.normalizeBuiltInContractInput(unknownStandardInput, { standardsApi, typescriptPresetApi: presetApi }));
assert.equal(unknownStandardHelper.threw, true);
const unknownRoot = resolve(inspectionRoot, "unknown-standard-target");
rmSync(unknownRoot, { recursive: true, force: true });
mkdirSync(unknownRoot, { recursive: true });
const unknownRaw = await executeSchematic({
  manifestPath: resolve(templatesRoot, "standard-doc/manifest.json"),
  input: unknownStandardInput,
  targetRoot: unknownRoot,
  mode: "apply",
  deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts },
});
assert.equal(["invalid_input", "blocked"].includes(unknownRaw.status), true);
assert.deepEqual(snapshot(unknownRoot), []);

const forgedPresetInput = readJson(resolve(fixtureRoot, "inputs/invalid/module-forged-preset-contract.json"));
const forgedPresetHelper = captureThrow(() => builtinsApi.normalizeBuiltInContractInput(forgedPresetInput, { standardsApi, typescriptPresetApi: presetApi }));
assert.equal(forgedPresetHelper.threw, true);
const forgedPresetRoot = resolve(inspectionRoot, "forged-preset-target");
rmSync(forgedPresetRoot, { recursive: true, force: true });
mkdirSync(forgedPresetRoot, { recursive: true });
const forgedPresetRaw = await executeSchematic({
  manifestPath: resolve(templatesRoot, "module/manifest.json"),
  input: forgedPresetInput,
  targetRoot: forgedPresetRoot,
  mode: "apply",
  deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts },
});
assert.equal(["invalid_input", "blocked"].includes(forgedPresetRaw.status), true);
assert.deepEqual(snapshot(forgedPresetRoot), []);

const malformedCarrierFindings = {
  renamedStandardTitleCarrier: captureThrow(() => builtinsApi.assertBuiltInContractSurfaces(
    mutateEntry(entries, "standard-doc", (dl08) => { dl08.inputSchema.properties.standardTitle.pattern = builtinsApi.regexpPatternForLiteral("Renamed title not returned by I-07C"); }),
    { standardsApi, typescriptPresetApi: presetApi },
  )),
  unknownStandardCarrier: captureThrow(() => builtinsApi.assertBuiltInContractSurfaces(
    mutateEntry(entries, "standard-doc", (dl08) => { dl08.standardIds[0] = "renamed-standard-id"; dl08.inputSchema.properties.standardId.pattern = builtinsApi.regexpPatternForLiteral("renamed-standard-id"); }),
    { standardsApi, typescriptPresetApi: presetApi },
  )),
  duplicateStandardIdCarrier: captureThrow(() => builtinsApi.assertBuiltInContractSurfaces(
    mutateEntry(entries, "module", (dl08) => { dl08.standardIds.push(dl08.standardIds[0]); }),
    { standardsApi, typescriptPresetApi: presetApi },
  )),
  unknownPresetKindCarrier: captureThrow(() => builtinsApi.assertBuiltInContractSurfaces(
    mutateEntry(entries, "module", (dl08) => { dl08.typescriptPreset.requiredFileKinds.push("not-an-actual-preset-kind"); }),
    { standardsApi, typescriptPresetApi: presetApi },
  )),
  renamedPresetIdCarrier: captureThrow(() => builtinsApi.assertBuiltInContractSurfaces(
    mutateEntry(entries, "module", (dl08) => { dl08.typescriptPreset.presetId = "renamed-preset"; }),
    { standardsApi, typescriptPresetApi: presetApi },
  )),
};
for (const [name, result] of Object.entries(malformedCarrierFindings)) {
  assert.equal(result.threw, true, name);
}

const result = {
  ok: true,
  contractPositive,
  actualPatterns,
  presetValidation,
  positiveGeneration: {
    status: positiveResult.status,
    output: relative(repoRoot, positiveOutputPath).replaceAll("\\", "/"),
    containsActualStandardTitle: true,
    containsActualStandardSummary: true,
  },
  forgedStandard: {
    helperRejected: forgedStandardHelper,
    rawEngineStatus: forgedStandardRaw.status,
    rawEngineDiagnostics: forgedStandardRaw.diagnostics,
    targetSnapshot: snapshot(forgedStandardRoot),
  },
  unknownStandard: {
    helperRejected: unknownStandardHelper,
    rawEngineStatus: unknownRaw.status,
    rawEngineDiagnostics: unknownRaw.diagnostics,
    targetSnapshot: snapshot(unknownRoot),
  },
  forgedPreset: {
    helperRejected: forgedPresetHelper,
    rawEngineStatus: forgedPresetRaw.status,
    rawEngineDiagnostics: forgedPresetRaw.diagnostics,
    targetSnapshot: snapshot(forgedPresetRoot),
  },
  malformedCarrierFindings,
};
writeJson(resolve(inspectionRoot, "result.json"), result);
console.log(JSON.stringify(result));
