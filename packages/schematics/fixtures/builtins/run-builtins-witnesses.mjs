#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { executeSchematic, loadSchematicDefinition } from "../../src/engine/index.js";
import { parseGeneratedBlock } from "../../src/engine/markers.js";
import { validateSchematicManifestWithArtifacts } from "../../../cli/src/commands/schematic/artifacts-adapter.js";
import * as standardsApi from "../../../standards/src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const fixtureRoot = resolve(repoRoot, "packages/schematics/fixtures/builtins");
const templatesRoot = resolve(repoRoot, "packages/schematics/templates");
const canonicalCommand = "node packages/schematics/fixtures/builtins/run-builtins-witnesses.mjs --evidence-root .vibe/work/I-07B-built-in-schematics-fixtures/evidence/builtins";

function parseArgs(argv) {
  const out = { evidenceRoot: null, caseSlug: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--evidence-root") out.evidenceRoot = resolve(repoRoot, argv[++i]);
    else if (argv[i] === "--case") out.caseSlug = argv[++i];
  }
  if (!out.evidenceRoot) throw new Error("--evidence-root is required");
  return out;
}

const args = parseArgs(process.argv.slice(2));
rmSync(args.evidenceRoot, { recursive: true, force: true });
mkdirSync(args.evidenceRoot, { recursive: true });

function sha256Text(text) { return createHash("sha256").update(text).digest("hex"); }
function writeJson(file, value) { writeFileSync(resolve(args.evidenceRoot, file), `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function readJson(file) { return JSON.parse(readFileSync(file, "utf8")); }
function casePrefix(nn, id, slug) { return `${String(nn).padStart(2, "0")}-${id}-${slug}`; }
function snapshot(root) {
  if (!existsSync(root)) return [];
  const rows = [];
  function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      const full = resolve(dir, name);
      const stat = statSync(full);
      const rel = relative(root, full).replaceAll("\\", "/");
      if (stat.isDirectory()) walk(full);
      else rows.push({ path: rel, sha256: sha256Text(readFileSync(full)), bytes: stat.size });
    }
  }
  walk(root);
  return rows;
}
function targetRoot(slug) {
  const root = resolve(args.evidenceRoot, "targets", slug);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  return root;
}
async function writeCase(nn, id, slug, fn) {
  if (args.caseSlug && args.caseSlug !== slug) return null;
  const prefix = casePrefix(nn, id, slug);
  const cmd = `${canonicalCommand} --case ${slug}\n`;
  let stdout;
  let stderr = "";
  let exit = 0;
  let fsRoot = null;
  try {
    stdout = await fn((root) => { fsRoot = root; return root; });
  } catch (error) {
    exit = 1;
    stderr = `${error.stack ?? error.message}\n`;
    stdout = { witness: id, slug, passed: false, error: error.message };
  }
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.cmd.txt`), cmd, "utf8");
  writeJson(`${prefix}.stdout.json`, stdout);
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.stderr.txt`), stderr, "utf8");
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.exit.txt`), `${exit}\n`, "utf8");
  writeJson(`${prefix}.fs-snapshot.json`, snapshot(fsRoot ?? args.evidenceRoot));
  return { witnessId: id, caseSlug: slug, result: exit === 0 ? "passed" : "failed", files: ["cmd.txt", "stdout.json", "stderr.txt", "exit.txt", "fs-snapshot.json"].map((ext) => `${prefix}.${ext}`) };
}
function manifestForSlug(slug) {
  const entry = getBuiltInSchematicCatalog().find((item) => item.slug === slug);
  if (!entry) throw new Error(`Unknown built-in slug ${slug}`);
  return entry.manifestPath;
}
function inputForSlug(slug) { return readJson(resolve(fixtureRoot, "inputs/valid", `${slug}.json`)); }
function normalizeContractInput(input) {
  return normalizeBuiltInContractInput(input, { standardsApi, typescriptPresetApi: presetApi });
}
async function runBuiltIn(slug, input, root, mode, extra = {}) {
  return executeSchematic({ manifestPath: manifestForSlug(slug), input: normalizeContractInput(input), targetRoot: root, mode, deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts }, ...extra });
}
async function runBuiltInRaw(slug, input, root, mode, extra = {}) {
  return executeSchematic({ manifestPath: manifestForSlug(slug), input, targetRoot: root, mode, deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts }, ...extra });
}
function manifestJsonForSlug(slug) { return readJson(manifestForSlug(slug)); }
function generatedPathsForSlug(slug, input) {
  const manifest = manifestJsonForSlug(slug);
  const normalized = input.name.trim().replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_\-./]+/g, " ").trim().split(/\s+/).filter(Boolean).map((word) => word.toLowerCase());
  const pathSegment = normalized.join("-");
  return manifest.generatedPaths.map((item) => item.pathTemplate.replaceAll("{{pathSegment}}", pathSegment));
}
function assertExpectedBodies(slug, root, input) {
  for (const rel of generatedPathsForSlug(slug, input)) {
    const actual = readFileSync(resolve(root, rel), "utf8");
    const parsed = parseGeneratedBlock(actual);
    assert.equal(parsed.ok, true, rel);
    const expected = readFileSync(resolve(fixtureRoot, "expected", slug, `${rel}.body`), "utf8");
    assert.equal(parsed.body, expected, rel);
  }
}
function assertInputContractsMatchActualApis(slug, input) {
  const normalized = normalizeContractInput(input);
  assert.equal(normalized.standardId, input.standardId, `${slug} standard id`);
  assert.equal(normalized.standardTitle, input.standardTitle, `${slug} standard title`);
  assert.equal(normalized.standardSummary, input.standardSummary, `${slug} standard summary`);
  assert.equal(normalized.presetId, input.presetId, `${slug} preset id`);
  assert.equal(normalized.quickGateLabel, input.quickGateLabel, `${slug} quick gate`);
  assert.equal(normalized.packageManager, input.packageManager, `${slug} package manager`);
  assert.equal(normalized.typecheckCommand, input.typecheckCommand, `${slug} typecheck command`);
}
function copyManifestVariant(slug, variant, mutate) {
  const sourceDir = resolve(repoRoot, "packages/schematics/templates", slug);
  const dir = resolve(args.evidenceRoot, "manifest-variants", variant);
  rmSync(dir, { recursive: true, force: true });
  cpSync(sourceDir, dir, { recursive: true });
  const manifestPath = resolve(dir, "manifest.json");
  const manifest = readJson(manifestPath);
  mutate(manifest, dir);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}
async function compileBuiltInCatalogApi() {
  const compiledRoot = resolve(args.evidenceRoot, "contract-probe/schematics-builtins-compiled");
  rmSync(compiledRoot, { recursive: true, force: true });
  mkdirSync(compiledRoot, { recursive: true });
  const tsc = resolve(repoRoot, "node_modules/.bin/tsc");
  const result = spawnSync(tsc, [
    "packages/schematics/src/builtins/index.ts",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict", "true",
    "--exactOptionalPropertyTypes", "true",
    "--noUncheckedIndexedAccess", "true",
    "--declaration", "true",
    "--sourceMap", "false",
    "--outDir", compiledRoot,
    "--rootDir", "packages/schematics/src",
    "--skipLibCheck", "false"
  ], { cwd: repoRoot, encoding: "utf8" });
  writeFileSync(resolve(args.evidenceRoot, "contract-probe/schematics-builtins-tsc.stdout.txt"), result.stdout, "utf8");
  writeFileSync(resolve(args.evidenceRoot, "contract-probe/schematics-builtins-tsc.stderr.txt"), result.stderr, "utf8");
  writeFileSync(resolve(args.evidenceRoot, "contract-probe/schematics-builtins-tsc.exit.txt"), `${result.status}\n`, "utf8");
  assert.equal(result.status, 0, "Built-in catalog TypeScript source must compile for actual API import");
  return import(pathToFileURL(resolve(compiledRoot, "builtins/index.js")).href);
}

async function compileTypeScriptPresetApi() {
  const compiledRoot = resolve(args.evidenceRoot, "contract-probe/typescript-preset-compiled");
  rmSync(compiledRoot, { recursive: true, force: true });
  mkdirSync(compiledRoot, { recursive: true });
  const tsc = resolve(repoRoot, "node_modules/.bin/tsc");
  const result = spawnSync(tsc, [
    "packages/presets/typescript/src/index.ts",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict", "true",
    "--exactOptionalPropertyTypes", "true",
    "--noUncheckedIndexedAccess", "true",
    "--declaration", "false",
    "--sourceMap", "false",
    "--outDir", compiledRoot,
    "--rootDir", "packages/presets/typescript",
    "--skipLibCheck", "false"
  ], { cwd: repoRoot, encoding: "utf8" });
  writeFileSync(resolve(args.evidenceRoot, "contract-probe/typescript-preset-tsc.stdout.txt"), result.stdout, "utf8");
  writeFileSync(resolve(args.evidenceRoot, "contract-probe/typescript-preset-tsc.stderr.txt"), result.stderr, "utf8");
  writeFileSync(resolve(args.evidenceRoot, "contract-probe/typescript-preset-tsc.exit.txt"), `${result.status}\n`, "utf8");
  assert.equal(result.status, 0, "TypeScript preset source must compile for actual API import");
  return import(pathToFileURL(resolve(compiledRoot, "src/index.js")).href);
}

const builtinsApi = await compileBuiltInCatalogApi();
const {
  assertBuiltInContractSurfaces,
  createBuiltInSchematicCatalog,
  normalizeBuiltInContractInput,
  readBuiltInSchematicManifests,
} = builtinsApi;
const presetApi = await compileTypeScriptPresetApi();
function getBuiltInSchematicCatalog() { return createBuiltInSchematicCatalog({ templatesRoot }); }
const cases = [];
const builtInSlugs = getBuiltInSchematicCatalog().map((entry) => entry.slug);

cases.push(await writeCase(1, "RB1", "manifest-loader-and-contracts", async () => {
  const entries = await readBuiltInSchematicManifests({ templatesRoot, readTextFile: (filePath) => readFileSync(filePath, "utf8") });
  const contract = assertBuiltInContractSurfaces(entries, { standardsApi, typescriptPresetApi: presetApi });
  const definitions = [];
  for (const item of getBuiltInSchematicCatalog()) {
    definitions.push(await loadSchematicDefinition(item.manifestPath, { validateSchematicManifest: validateSchematicManifestWithArtifacts }));
  }
  assert.deepEqual(definitions.map((item) => item.id).sort(), contract.schematicIds);
  const invalid = validateSchematicManifestWithArtifacts(readJson(resolve(fixtureRoot, "invalid-manifests/unknown-field.json")), { artifactPath: resolve(fixtureRoot, "invalid-manifests/unknown-field.json") });
  assert.equal(invalid.ok, false);
  return { witness: "RB1", contract, loaded: definitions.map((definition) => ({ id: definition.id, operations: definition.dl08.operations.length })), invalidUnknownFieldRejected: true };
}));

cases.push(await writeCase(2, "P1", "dry-run-apply-idempotency", async (setRoot) => {
  const results = [];
  for (const slug of builtInSlugs) {
    const input = inputForSlug(slug);
    assertInputContractsMatchActualApis(slug, input);
    const root = setRoot(targetRoot(`p1-${slug}`));
    const before = snapshot(root);
    const dry = await runBuiltIn(slug, input, root, "dry-run");
    assert.equal(dry.status, "ok", `${slug} dry-run`);
    assert.equal(dry.plan_fingerprint.startsWith("sha256:"), true, `${slug} plan fingerprint`);
    assert.deepEqual(snapshot(root), before, `${slug} dry-run wrote files`);
    const apply = await runBuiltIn(slug, input, root, "apply");
    assert.equal(apply.status, "ok", `${slug} apply`);
    assertExpectedBodies(slug, root, input);
    const rerun = await runBuiltIn(slug, input, root, "apply");
    assert.equal(rerun.status, "ok", `${slug} rerun`);
    assert.equal(rerun.operations.every((op) => ["noop", "report_only"].includes(op.action)), true, `${slug} rerun noop`);
    results.push({ slug, plan: dry.plan_fingerprint, written: apply.apply.written, rerunActions: rerun.operations.map((op) => op.action) });
  }
  return { witness: "P1", results };
}));

cases.push(await writeCase(3, "P2", "preset-and-standards-consumption", async () => {
  const entries = await readBuiltInSchematicManifests({ templatesRoot, readTextFile: (filePath) => readFileSync(filePath, "utf8") });
  const catalog = standardsApi.getStandardsCatalog();
  const rendered = presetApi.renderTypeScriptPresetFiles();
  const validation = presetApi.validateTypeScriptPresetFiles(rendered);
  assert.equal(validation.ok, true);
  const consumedStandardIds = new Set();
  for (const entry of entries) {
    for (const standardId of entry.manifest.extensions["dev.vibe-engineer.schematics.dl08"].standardIds) {
      const standard = standardsApi.loadStandard(standardId);
      consumedStandardIds.add(standard.standardId);
    }
  }
  assert.equal([...consumedStandardIds].every((id) => catalog.standardIds.includes(id)), true);
  const presetManifestKinds = new Set(presetApi.getTypeScriptPresetFileManifest().map((entry) => entry.kind));
  for (const required of ["typescript-config", "eslint-policy", "prettier-policy", "workspace-config", "turbo-config", "package-manifest"]) {
    assert.equal(presetManifestKinds.has(required), true, required);
  }
  return { witness: "P2", consumedStandardIds: [...consumedStandardIds].sort(), presetFileCount: rendered.length, presetValidation: validation };
}));

cases.push(await writeCase(4, "N1", "invalid-inputs", async (setRoot) => {
  const root = setRoot(targetRoot("n1-invalid-inputs"));
  const matrix = [
    ["module", "module-unknown-field.json"],
    ["contract", "contract-missing-required.json"],
    ["adapter", "adapter-wrong-type.json"],
    ["test-fixture", "test-fixture-malformed-name.json"],
    ["standard-doc", "standard-doc-unsupported-standard.json"],
    ["standard-doc", "standard-doc-forged-standard-content.json"],
    ["module", "module-forged-preset-contract.json"],
    ["context-file", "context-file-unsafe-name.json"]
  ];
  const results = [];
  for (const [slug, file] of matrix) {
    const invalidInput = readJson(resolve(fixtureRoot, "inputs/invalid", file));
    if (file.includes("forged")) {
      assert.throws(() => normalizeContractInput(invalidInput), /actual upstream contract value/);
    }
    const result = await runBuiltInRaw(slug, invalidInput, root, "dry-run");
    assert.equal(["invalid_input", "blocked"].includes(result.status), true, file);
    results.push({ slug, file, status: result.status, diagnostics: result.diagnostics });
  }
  assert.deepEqual(snapshot(root), []);
  return { witness: "N1", results };
}));

cases.push(await writeCase(5, "N2", "path-safety-and-forbidden-targets", async (setRoot) => {
  const root = setRoot(targetRoot("n2-path-safety"));
  const input = inputForSlug("module");
  const variants = [
    copyManifestVariant("module", "outside-target", (manifest) => { manifest.extensions["dev.vibe-engineer.schematics.dl08"].operations[1].pathTemplate = "../escape.ts"; }),
    copyManifestVariant("module", "undeclared-target", (manifest) => { manifest.extensions["dev.vibe-engineer.schematics.dl08"].operations[1].pathTemplate = "other/example.ts"; }),
    copyManifestVariant("module", "root-package-manifest", (manifest) => { manifest.extensions["dev.vibe-engineer.schematics.dl08"].operations[1].pathTemplate = "package.json"; }),
    copyManifestVariant("module", "cli-loader-target", (manifest) => { manifest.extensions["dev.vibe-engineer.schematics.dl08"].operations[1].pathTemplate = "packages/cli/src/entry/vibe-engineer.js"; })
  ];
  const results = [];
  for (const manifestPath of variants) {
    const result = await executeSchematic({ manifestPath, input, targetRoot: root, mode: "dry-run", deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts } });
    assert.equal(result.status, "blocked", manifestPath);
    results.push({ manifest: relative(args.evidenceRoot, manifestPath), diagnostics: result.diagnostics });
  }
  assert.deepEqual(snapshot(root), []);
  return { witness: "N2", results };
}));

cases.push(await writeCase(6, "N3", "unsafe-template-features", async (setRoot) => {
  const root = setRoot(targetRoot("n3-template-safety"));
  const input = inputForSlug("module");
  const badTemplates = ["triple.mustache", "raw-ampersand.mustache", "undeclared-partial.mustache", "capability-token.mustache", "domain.mustache"];
  const results = [];
  for (const name of badTemplates) {
    const manifestPath = copyManifestVariant("module", `template-${name}`, (manifest, dir) => {
      const target = resolve(dir, "files", name);
      writeFileSync(target, readFileSync(resolve(fixtureRoot, "invalid-templates", name)), "utf8");
      manifest.extensions["dev.vibe-engineer.schematics.dl08"].operations[1].template = name;
    });
    const result = await executeSchematic({ manifestPath, input, targetRoot: root, mode: "dry-run", deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts } });
    assert.equal(result.status, "blocked", name);
    results.push({ template: name, diagnostics: result.diagnostics });
  }
  assert.deepEqual(snapshot(root), []);
  return { witness: "N3", results };
}));

cases.push(await writeCase(7, "N4", "conflict-preserves-user-files", async (setRoot) => {
  const results = [];
  for (const slug of builtInSlugs) {
    const input = inputForSlug(slug);
    const root = setRoot(targetRoot(`n4-unmarked-${slug}`));
    const generatedPath = generatedPathsForSlug(slug, input)[0];
    mkdirSync(dirname(resolve(root, generatedPath)), { recursive: true });
    writeFileSync(resolve(root, generatedPath), "handwritten user content\n", "utf8");
    const conflict = await runBuiltIn(slug, input, root, "apply");
    assert.equal(conflict.status, "conflicts", `${slug} unmarked conflict`);
    assert.equal(readFileSync(resolve(root, generatedPath), "utf8"), "handwritten user content\n");

    const editedRoot = setRoot(targetRoot(`n4-edited-${slug}`));
    const apply = await runBuiltIn(slug, input, editedRoot, "apply");
    assert.equal(apply.status, "ok");
    const generated = readFileSync(resolve(editedRoot, generatedPath), "utf8");
    const edited = generated.replace("\n", "\nmanual edit preserved for conflict probe\n");
    writeFileSync(resolve(editedRoot, generatedPath), edited, "utf8");
    const editedResult = await runBuiltIn(slug, input, editedRoot, "apply");
    assert.equal(editedResult.status, "conflicts", `${slug} edited generated conflict`);
    assert.equal(readFileSync(resolve(editedRoot, generatedPath), "utf8"), edited);
    results.push({ slug, unmarked: conflict.conflicts, edited: editedResult.conflicts });
  }
  return { witness: "N4", results };
}));

cases.push(await writeCase(8, "N5", "manifest-policy-and-dry-run-write", async (setRoot) => {
  const root = setRoot(targetRoot("n5-policy"));
  const input = inputForSlug("module");
  const mergeManifest = copyManifestVariant("module", "merge-policy", (manifest) => {
    manifest.conflictBehavior = "merge_with_typed_strategy";
    manifest.generatedPaths[0].conflictPolicy = "merge_with_typed_strategy";
  });
  const merge = await executeSchematic({ manifestPath: mergeManifest, input, targetRoot: root, mode: "dry-run", deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts } });
  assert.equal(merge.status, "blocked");
  const dryWrite = await runBuiltIn("module", input, root, "dry-run", { attemptDryRunWrite: true });
  assert.equal(dryWrite.status, "blocked");
  assert.deepEqual(snapshot(root), []);
  return { witness: "N5", mergeDiagnostics: merge.diagnostics, dryRunWriteDiagnostics: dryWrite.diagnostics };
}));

const completed = cases.filter(Boolean);
const summary = { ok: completed.every((item) => item.result === "passed"), cases: completed };
for (const item of completed) {
  item.sha256 = Object.fromEntries(item.files.map((file) => [file, sha256Text(readFileSync(resolve(args.evidenceRoot, file), "utf8"))]));
}
writeJson("summary.json", summary);
console.log(JSON.stringify(summary));
process.exitCode = summary.ok ? 0 : 1;
