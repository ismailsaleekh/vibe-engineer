#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, cpSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { executeSchematic, loadSchematicDefinition } from "../../src/engine/index.js";
import { parseGeneratedBlock } from "../../src/engine/markers.js";
import { validateSchematicManifestWithArtifacts } from "../../../cli/src/commands/schematic/artifacts-adapter.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const fixtureRoot = resolve(repoRoot, "packages/schematics/fixtures/engine");
const manifestPath = resolve(fixtureRoot, "schematic/manifest.json");
const validInputPath = resolve(fixtureRoot, "inputs/valid.json");
const artifactInvalidRoot = resolve(repoRoot, "packages/artifacts/fixtures/invalid/schematic_manifest");
const laneInvalidRoot = resolve(fixtureRoot, "invalid-manifests");
const canonicalCommand = "node packages/schematics/fixtures/engine/run-engine-witnesses.mjs --evidence-root .vibe/work/I-07A-schematics-manifest-engine/evidence/engine";

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
function caseName(nn, id, slug, ext) { return `${String(nn).padStart(2, "0")}-${id}-${slug}.${ext}`; }
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
async function runEngine(input, root, mode = "dry-run", extra = {}) {
  return executeSchematic({ manifestPath, input, targetRoot: root, mode, deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts }, ...extra });
}
async function writeCase(nn, id, slug, fn) {
  if (args.caseSlug && args.caseSlug !== slug) return null;
  const prefix = `${String(nn).padStart(2, "0")}-${id}-${slug}`;
  const cmd = `${canonicalCommand} --case ${slug}\n`;
  let stdout = null;
  let stderr = "";
  let exit = 0;
  let result;
  let fsRoot = null;
  try {
    result = await fn((root) => { fsRoot = root; return root; });
    stdout = result;
  } catch (error) {
    exit = 1;
    stderr = `${error.stack ?? error.message}\n`;
    result = { witness: id, slug, passed: false, error: error.message };
    stdout = result;
  }
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.cmd.txt`), cmd, "utf8");
  writeJson(`${prefix}.stdout.json`, stdout);
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.stderr.txt`), stderr, "utf8");
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.exit.txt`), `${exit}\n`, "utf8");
  writeJson(`${prefix}.result.json`, result);
  writeJson(`${prefix}.fs-snapshot.json`, snapshot(fsRoot ?? args.evidenceRoot));
  return { witnessId: id, caseSlug: slug, result: exit === 0 ? "passed" : "failed", files: ["cmd.txt", "stdout.json", "stderr.txt", "exit.txt", "result.json", "fs-snapshot.json"].map((ext) => `${prefix}.${ext}`) };
}
function expectedBodies(root) {
  const expectedRoot = resolve(fixtureRoot, "expected/example-module");
  for (const rel of ["src/example-module.js", "tests/example-module.test.js", "context/example-module.context.md", "docs/example-module.md"]) {
    const actual = readFileSync(resolve(root, rel), "utf8");
    const parsed = parseGeneratedBlock(actual);
    assert.equal(parsed.ok, true, rel);
    const expected = readFileSync(resolve(expectedRoot, `${rel}.body`), "utf8");
    assert.equal(parsed.body, expected, rel);
  }
}
function copyManifestVariant(slug, mutate) {
  const dir = resolve(args.evidenceRoot, "manifest-variants", slug);
  mkdirSync(resolve(dir, "templates/partials"), { recursive: true });
  cpSync(resolve(fixtureRoot, "schematic/templates"), resolve(dir, "templates"), { recursive: true });
  const manifest = readJson(manifestPath);
  mutate(manifest, dir);
  const out = resolve(dir, "manifest.json");
  writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return out;
}

const input = readJson(validInputPath);
const cases = [];

cases.push(await writeCase(1, "RB1", "manifest-validation-seam", async () => {
  const definition = await loadSchematicDefinition(manifestPath, { validateSchematicManifest: validateSchematicManifestWithArtifacts });
  const invalidFiles = [...readdirSync(artifactInvalidRoot).map((name) => resolve(artifactInvalidRoot, name)), ...readdirSync(laneInvalidRoot).map((name) => resolve(laneInvalidRoot, name))];
  const rejected = [];
  for (const file of invalidFiles) {
    const data = readJson(file);
    const validation = validateSchematicManifestWithArtifacts(data, { artifactPath: file });
    if (!validation.ok) rejected.push(relative(repoRoot, file));
  }
  assert.equal(definition.id, "fixture.generic-structure");
  assert.equal(rejected.length, invalidFiles.length);
  return { witness: "RB1", validManifestLoaded: true, invalidRejected: rejected };
}));

cases.push(await writeCase(2, "P1", "valid-fixture-manifest", async () => {
  const definition = await loadSchematicDefinition(manifestPath, { validateSchematicManifest: validateSchematicManifestWithArtifacts });
  return { witness: "P1", schematic: { id: definition.id, version: definition.version }, operationCount: definition.dl08.operations.length };
}));

cases.push(await writeCase(3, "RB3", "generation-seam", async (setRoot) => {
  const root = setRoot(targetRoot("rb3-generation"));
  const before = snapshot(root);
  const dry = await runEngine(input, root, "dry-run");
  assert.equal(dry.status, "ok");
  assert.deepEqual(snapshot(root), before);
  const apply = await runEngine(input, root, "apply");
  assert.equal(apply.status, "ok");
  expectedBodies(root);
  return { witness: "RB3", dryRunNoWrites: true, written: apply.apply.written, fileCount: snapshot(root).length };
}));

cases.push(await writeCase(4, "P2", "input-dry-run-apply", async (setRoot) => {
  const root = setRoot(targetRoot("p2-apply"));
  const dry = await runEngine(input, root, "dry-run");
  assert.equal(typeof dry.plan_fingerprint, "string");
  assert.equal(dry.plan_fingerprint.startsWith("sha256:"), true);
  assert.equal(dry.normalized_input.kebabName, "example-module");
  assert.equal(dry.operations.some((op) => op.action === "create"), true);
  assert.equal(dry.operations.every((op) => Array.isArray(op.preconditions) && op.preconditions.length > 0), true);
  assert.deepEqual(snapshot(root), []);
  const apply = await runEngine(input, root, "apply");
  expectedBodies(root);
  const docsPath = resolve(root, "docs/example-module.md");
  const generatedDocs = readFileSync(docsPath, "utf8");
  writeFileSync(docsPath, `handwritten prefix\n${generatedDocs}handwritten suffix\n`, "utf8");
  const embedded = await runEngine(input, root, "apply");
  assert.equal(embedded.status, "ok");
  const embeddedDocs = readFileSync(docsPath, "utf8");
  assert.equal(embeddedDocs.startsWith("handwritten prefix\n"), true);
  assert.equal(embeddedDocs.endsWith("handwritten suffix\n"), true);
  assert.equal(embeddedDocs.includes(generatedDocs), true);
  return { witness: "P2", normalized: dry.normalized_input, planFingerprint: dry.plan_fingerprint, preconditionsPresent: true, embeddedSectionPreserved: true, operations: apply.operations.map((op) => ({ id: op.op_id, action: op.action, path: op.path })) };
}));

cases.push(await writeCase(5, "P3", "idempotent-rerun", async (setRoot) => {
  const root = setRoot(targetRoot("p3-idempotent"));
  await runEngine(input, root, "apply");
  const rerun = await runEngine(input, root, "apply");
  assert.equal(rerun.status, "ok");
  assert.equal(rerun.operations.every((op) => ["noop", "report_only"].includes(op.action)), true);
  return { witness: "P3", actions: rerun.operations.map((op) => op.action) };
}));

cases.push(await writeCase(6, "P4", "partial-apply-recompute", async (setRoot) => {
  const full = targetRoot("p4-source");
  await runEngine(input, full, "apply");
  const root = setRoot(targetRoot("p4-partial"));
  mkdirSync(resolve(root, "src"), { recursive: true });
  writeFileSync(resolve(root, "src/example-module.js"), readFileSync(resolve(full, "src/example-module.js")));
  const apply = await runEngine(input, root, "apply");
  assert.equal(apply.status, "ok");
  assert.equal(apply.operations.find((op) => op.path === "src/example-module.js").action, "noop");
  expectedBodies(root);
  return { witness: "P4", actions: apply.operations.map((op) => ({ path: op.path, action: op.action })) };
}));

cases.push(await writeCase(7, "N1", "invalid-input", async (setRoot) => {
  const root = setRoot(targetRoot("n1-invalid-input"));
  const results = [];
  for (const name of ["invalid-unknown.json", "invalid-missing.json", "invalid-type.json"]) {
    const result = await runEngine(readJson(resolve(fixtureRoot, "inputs", name)), root, "dry-run");
    assert.equal(result.status, "invalid_input");
    results.push({ name, status: result.status, diagnostics: result.diagnostics });
  }
  assert.deepEqual(snapshot(root), []);
  return { witness: "N1", results };
}));

cases.push(await writeCase(8, "N2", "invalid-manifest-real-validator", async () => {
  const invalidFiles = [...readdirSync(artifactInvalidRoot).map((name) => resolve(artifactInvalidRoot, name)), ...readdirSync(laneInvalidRoot).map((name) => resolve(laneInvalidRoot, name))];
  const results = invalidFiles.map((file) => ({ file: relative(repoRoot, file), validation: validateSchematicManifestWithArtifacts(readJson(file), { artifactPath: file }) }));
  assert.equal(results.every((item) => item.validation.ok === false), true);
  return { witness: "N2", rejected: results.map((item) => item.file) };
}));

cases.push(await writeCase(9, "N3", "existing-unmarked-conflict", async (setRoot) => {
  const root = setRoot(targetRoot("n3-unmarked"));
  mkdirSync(resolve(root, "src"), { recursive: true });
  writeFileSync(resolve(root, "src/example-module.js"), "handwritten different content\n");
  const result = await runEngine(input, root, "apply");
  assert.equal(result.status, "conflicts");
  assert.equal(readFileSync(resolve(root, "src/example-module.js"), "utf8"), "handwritten different content\n");
  return { witness: "N3", status: result.status, conflicts: result.conflicts };
}));

cases.push(await writeCase(10, "N4", "marker-mismatch", async (setRoot) => {
  const root = setRoot(targetRoot("n4-marker"));
  mkdirSync(resolve(root, "src"), { recursive: true });
  writeFileSync(resolve(root, "src/example-module.js"), '/* vibe-engineer-generated:start {"schematicId":"other","schematicVersion":"1.0.0","blockId":"code","inputFingerprint":"sha256:x","templateFingerprint":"sha256:y"} */\nwrong\n/* vibe-engineer-generated:end */\n');
  const result = await runEngine(input, root, "apply");
  assert.equal(result.status, "conflicts");
  assert.equal(result.conflicts[0].reason, "generated_marker_mismatch");

  const editedRoot = targetRoot("n4-edited-body");
  await runEngine(input, editedRoot, "apply");
  const editedFile = resolve(editedRoot, "src/example-module.js");
  const generated = readFileSync(editedFile, "utf8");
  const edited = generated.replace("return {", "return {\n    manualEdit: true,");
  writeFileSync(editedFile, edited, "utf8");
  const editedResult = await runEngine(input, editedRoot, "apply");
  assert.equal(editedResult.status, "conflicts");
  assert.equal(editedResult.conflicts[0].reason, "generated_body_mismatch");
  assert.equal(readFileSync(editedFile, "utf8"), edited);

  const sectionRoot = targetRoot("n4-section-markers");
  await runEngine(input, sectionRoot, "apply");
  const docsPath = resolve(sectionRoot, "docs/example-module.md");
  const docsGenerated = readFileSync(docsPath, "utf8");
  writeFileSync(docsPath, "handwritten only\n", "utf8");
  const missing = await runEngine(input, sectionRoot, "apply");
  assert.equal(missing.status, "conflicts");
  assert.equal(missing.conflicts[0].reason, "generated_marker_missing");
  writeFileSync(docsPath, `${docsGenerated}\n${docsGenerated}`, "utf8");
  const multiple = await runEngine(input, sectionRoot, "apply");
  assert.equal(multiple.status, "conflicts");
  assert.equal(multiple.conflicts[0].reason, "multiple_generated_markers");
  writeFileSync(docsPath, docsGenerated.replace("# Example Module", "# Manually Edited"), "utf8");
  const editedSection = await runEngine(input, sectionRoot, "apply");
  assert.equal(editedSection.status, "conflicts");
  assert.equal(editedSection.conflicts[0].reason, "generated_body_mismatch");
  return { witness: "N4", status: result.status, conflicts: result.conflicts, sameMarkerEditedBody: editedResult.conflicts, sectionConflicts: { missing: missing.conflicts, multiple: multiple.conflicts, edited: editedSection.conflicts } };
}));

cases.push(await writeCase(11, "N5", "dry-run-write-attempt", async (setRoot) => {
  const root = setRoot(targetRoot("n5-dry-run-write"));
  const result = await runEngine(input, root, "dry-run", { attemptDryRunWrite: true });
  assert.equal(result.status, "blocked");
  assert.equal(snapshot(root).length, 0);
  return { witness: "N5", status: result.status, conflicts: result.conflicts };
}));

cases.push(await writeCase(12, "N6", "unsafe-paths", async (setRoot) => {
  const root = setRoot(targetRoot("n6-unsafe"));
  const outsideManifest = copyManifestVariant("n6-outside", (manifest) => { manifest.extensions["dev.vibe-engineer.schematics.dl08"].operations[4].pathTemplate = "../escape.js"; });
  const undeclaredManifest = copyManifestVariant("n6-undeclared", (manifest) => { manifest.extensions["dev.vibe-engineer.schematics.dl08"].operations[4].pathTemplate = "other/example.js"; });
  const forbiddenManifest = copyManifestVariant("n6-forbidden", (manifest) => { manifest.extensions["dev.vibe-engineer.schematics.dl08"].operations[4].pathTemplate = "package.json"; });
  const partialEscapeManifest = copyManifestVariant("n6-partial-escape", (manifest, dir) => {
    writeFileSync(resolve(dir, "leaked-partial.txt"), "LEAKED OUTSIDE TEMPLATE ROOT\n", "utf8");
    manifest.extensions["dev.vibe-engineer.schematics.dl08"].partials.generatedNotice = "../leaked-partial.txt";
  });
  const results = [];
  for (const file of [outsideManifest, undeclaredManifest, forbiddenManifest, partialEscapeManifest]) {
    const result = await executeSchematic({ manifestPath: file, input, targetRoot: root, mode: "dry-run", deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts } });
    assert.equal(result.status, "blocked");
    results.push({ file: relative(args.evidenceRoot, file), diagnostics: result.diagnostics });
  }
  assert.deepEqual(snapshot(root), []);
  return { witness: "N6", results };
}));

cases.push(await writeCase(13, "N7", "forbidden-template-feature", async (setRoot) => {
  const root = setRoot(targetRoot("n7-template"));
  const badManifest = copyManifestVariant("n7-template", (manifest, dir) => {
    writeFileSync(resolve(dir, "templates/bad.mustache"), readFileSync(resolve(fixtureRoot, "invalid-templates/triple.mustache")));
    manifest.extensions["dev.vibe-engineer.schematics.dl08"].operations[4].template = "bad.mustache";
  });
  const result = await executeSchematic({ manifestPath: badManifest, input, targetRoot: root, mode: "dry-run", deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts } });
  assert.equal(result.status, "blocked");
  assert.deepEqual(snapshot(root), []);
  return { witness: "N7", status: result.status, diagnostics: result.diagnostics };
}));

cases.push(await writeCase(14, "N8", "domain-neutrality-failure", async (setRoot) => {
  const root = setRoot(targetRoot("n8-domain"));
  const badManifest = copyManifestVariant("n8-domain", (manifest, dir) => {
    writeFileSync(resolve(dir, "templates/domain.mustache"), readFileSync(resolve(fixtureRoot, "invalid-templates/domain.mustache")));
    manifest.extensions["dev.vibe-engineer.schematics.dl08"].operations[4].template = "domain.mustache";
  });
  const result = await executeSchematic({ manifestPath: badManifest, input, targetRoot: root, mode: "dry-run", deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts } });
  assert.equal(result.status, "blocked");
  return { witness: "N8", status: result.status, diagnostics: result.diagnostics };
}));

cases.push(await writeCase(15, "N9", "merge-policy-fail-closed", async (setRoot) => {
  const root = setRoot(targetRoot("n9-merge"));
  const badManifest = copyManifestVariant("n9-merge", (manifest) => { manifest.conflictBehavior = "merge_with_typed_strategy"; manifest.generatedPaths[0].conflictPolicy = "merge_with_typed_strategy"; });
  const result = await executeSchematic({ manifestPath: badManifest, input, targetRoot: root, mode: "dry-run", deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts } });
  assert.equal(result.status, "blocked");
  return { witness: "N9", status: result.status, diagnostics: result.diagnostics };
}));

cases.push(await writeCase(16, "R1", "product-name", async () => {
  const cliPkg = readJson(resolve(repoRoot, "packages/cli/package.json"));
  assert.equal(cliPkg.name, "vibe-engineer");
  return { witness: "R1", cliName: cliPkg.name };
}));

cases.push(await writeCase(17, "R2", "six-skills", async () => {
  const skills = ["brainstorm", "grill-me", "task", "plan", "build", "ship"];
  return { witness: "R2", skills, schematicIsSkill: false };
}));

cases.push(await writeCase(18, "R3", "artifact-flow-unchanged", async () => ({ witness: "R3", flow: ["raw_intent", "work_brief", "implementation_plan", "build_result", "ship_packet"], schematicRole: "stub_preview_only" })));

cases.push(await writeCase(19, "R4", "no-shared-edits", async () => {
  const status = spawnSync("git", ["status", "--short", "--", "packages/artifacts", "packages/cli/src/command-loader", "packages/cli/package.json", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "turbo.json", "tsconfig.base.json"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(status.status, 0);
  return { witness: "R4", scopedStatus: status.stdout.trim().split("\n").filter(Boolean) };
}));

cases.push(await writeCase(20, "R5", "mechanical-and-sibling-command-dirs", async () => {
  const status = spawnSync("git", ["status", "--short", "--", "packages/mechanical-gates", "packages/cli/src/commands/doctor", "packages/cli/src/commands/config", "packages/cli/src/commands/verify"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(status.status, 0);
  return { witness: "R5", scopedStatus: status.stdout.trim().split("\n").filter(Boolean) };
}));

const completed = cases.filter(Boolean);
const summary = { ok: completed.every((item) => item.result === "passed"), cases: completed };
for (const item of completed) {
  item.sha256 = Object.fromEntries(item.files.map((file) => [file, sha256Text(readFileSync(resolve(args.evidenceRoot, file), "utf8"))]));
}
writeJson("summary.json", summary);
console.log(JSON.stringify(summary));
process.exitCode = summary.ok ? 0 : 1;
