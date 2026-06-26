#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCommandLoader } from "../../command-loader/loader.js";
import { validateCliResultEnvelope } from "../../envelope/result-envelope.js";
import { schematicCommand } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../..");
const fixtureRoot = resolve(repoRoot, "packages/schematics/fixtures/engine");
const manifestPath = resolve(fixtureRoot, "schematic/manifest.json");
const inputPath = resolve(fixtureRoot, "inputs/valid.json");
const canonicalCommand = "node packages/cli/src/commands/schematic/run-cli-witnesses.mjs --evidence-root .vibe/work/I-07A-schematics-manifest-engine/evidence/cli";

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
function invocation(command = "schematic") {
  return { id: `i-07a-${command}-witness`, command, argv: [command, "apply", "--json", "--non-interactive"], projectRoot: repoRoot, configPath: null, startedAt: "2026-06-24T00:00:00.000Z", endedAt: "2026-06-24T00:00:00.000Z" };
}
async function dispatchSchematic(slug, mode = "apply", extraArgs = []) {
  const targetRoot = resolve(args.evidenceRoot, "targets", slug);
  const resultFile = resolve(args.evidenceRoot, "result-files", `${slug}.json`);
  mkdirSync(targetRoot, { recursive: true });
  mkdirSync(dirname(resultFile), { recursive: true });
  const loader = createCommandLoader([schematicCommand]);
  const result = await loader.dispatch("schematic", [mode, "--manifest", manifestPath, "--input-file", inputPath, "--target-root", targetRoot, "--result-file", resultFile, ...extraArgs, "--json", "--non-interactive"], { invocation: invocation(), packageJsonPath: resolve(repoRoot, "packages/cli/package.json"), config: null });
  const validation = validateCliResultEnvelope(result.envelope);
  assert.equal(validation.ok, true, validation.errors?.join("; "));
  assert.equal(existsSync(resultFile), true);
  const reread = JSON.parse(readFileSync(resultFile, "utf8"));
  assert.deepEqual(reread, result.envelope);
  return { envelope: result.envelope, targetRoot, resultFile };
}
async function writeCase(nn, id, slug, fn) {
  if (args.caseSlug && args.caseSlug !== slug) return null;
  const prefix = casePrefix(nn, id, slug);
  let stdout;
  let stderr = "";
  let exit = 0;
  let result;
  let fsRoot = args.evidenceRoot;
  try {
    result = await fn((root) => { fsRoot = root; return root; });
    stdout = result;
  } catch (error) {
    exit = 1;
    stderr = `${error.stack ?? error.message}\n`;
    result = { witness: id, slug, passed: false, error: error.message };
    stdout = result;
  }
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.cmd.txt`), `${canonicalCommand} --case ${slug}\n`, "utf8");
  writeJson(`${prefix}.stdout.json`, stdout);
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.stderr.txt`), stderr, "utf8");
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.exit.txt`), `${exit}\n`, "utf8");
  writeJson(`${prefix}.result.json`, result);
  writeJson(`${prefix}.fs-snapshot.json`, snapshot(fsRoot));
  return { witnessId: id, caseSlug: slug, result: exit === 0 ? "passed" : "failed", files: ["cmd.txt", "stdout.json", "stderr.txt", "exit.txt", "result.json", "fs-snapshot.json"].map((ext) => `${prefix}.${ext}`) };
}

const cases = [];
cases.push(await writeCase(1, "RB2", "loader-envelope-result-file", async (setRoot) => {
  const dispatched = await dispatchSchematic("rb2-loader", "apply");
  setRoot(dispatched.targetRoot);
  assert.equal(dispatched.envelope.status, "success");
  assert.equal(dispatched.envelope.payload.kind, "schematic_result");
  assert.equal(dispatched.envelope.payload.data.status, "ok");
  return { witness: "RB2", envelopeStatus: dispatched.envelope.status, resultFile: relative(repoRoot, dispatched.resultFile), structuralEquivalence: true };
}));

cases.push(await writeCase(2, "P5", "cli-dispatch-success", async (setRoot) => {
  const dispatched = await dispatchSchematic("p5-cli", "dry-run");
  setRoot(dispatched.targetRoot);
  assert.equal(dispatched.envelope.status, "success");
  assert.equal(dispatched.envelope.payload.data.mode, "dry-run");
  assert.equal(snapshot(dispatched.targetRoot).length, 0);
  return { witness: "P5", envelope: dispatched.envelope, resultFile: relative(repoRoot, dispatched.resultFile), dryRunNoWrites: true };
}));

cases.push(await writeCase(3, "RB4", "default-binary-pending-live", async () => {
  return { witness: "RB4", status: "pending-live/BLOCKED", reason: "Shipped default binary uses I-02A default createCommandLoader() and does not register schematic without serialized I-02A handoff; no loader/package edit is licensed." };
}));

cases.push(await writeCase(4, "P5", "cli-plan-file-consumed-and-stale-blocked", async (setRoot) => {
  const dry = await dispatchSchematic("p5-plan-carrier", "dry-run");
  setRoot(dry.targetRoot);
  assert.equal(dry.envelope.status, "success");
  assert.equal(typeof dry.envelope.payload.data.plan_fingerprint, "string");
  const apply = await dispatchSchematic("p5-plan-carrier", "apply", ["--plan-file", dry.resultFile]);
  assert.equal(apply.envelope.status, "success");
  assert.equal(apply.envelope.payload.data.status, "ok");
  const stale = await dispatchSchematic("p5-stale-plan", "dry-run");
  const staleSrc = resolve(stale.targetRoot, "src");
  mkdirSync(staleSrc, { recursive: true });
  writeFileSync(resolve(staleSrc, "example-module.js"), "handwritten stale plan obstruction\n", "utf8");
  const staleApply = await dispatchSchematic("p5-stale-plan", "apply", ["--plan-file", stale.resultFile]);
  assert.equal(staleApply.envelope.status, "blocked");
  assert.equal(staleApply.envelope.payload.data.status, "blocked");
  assert.equal(staleApply.envelope.payload.data.conflicts[0].reason, "plan_fingerprint_mismatch");
  assert.equal(readFileSync(resolve(staleSrc, "example-module.js"), "utf8"), "handwritten stale plan obstruction\n");
  return { witness: "P5", planFingerprint: dry.envelope.payload.data.plan_fingerprint, applyConsumedPlanFile: relative(repoRoot, dry.resultFile), staleBlockedBeforeWrite: true };
}));

const completed = cases.filter(Boolean);
for (const item of completed) item.sha256 = Object.fromEntries(item.files.map((file) => [file, sha256Text(readFileSync(resolve(args.evidenceRoot, file), "utf8"))]));
const summary = { ok: completed.every((item) => item.result === "passed"), cases: completed };
writeJson("summary.json", summary);
console.log(JSON.stringify(summary));
process.exitCode = summary.ok ? 0 : 1;
