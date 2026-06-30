#!/usr/bin/env node
// C2 build-side template copy (WP-01, ship-as-files — wave1-launch-spec §4).
// Deterministic + re-runnable. Driven by the CLI `build` script BEFORE tsup.
//
// Inputs (read-only):
//   <root>/examples/starter-reference/.source-template/**   → shipped starter
//   <root>/examples/harness-integrations/pi/{manifest-fixtures,runtime-fixtures}/** → shipped pi assets
// Outputs (owned, shipped via `files` allowlist):
//   packages/cli/templates/starter/**          (starter file tree)
//   packages/cli/templates/pi/**               (pi asset templates/manifests)
//   packages/cli/templates/starter.layout.json (preset-serialized layout manifest)
//
// This file is C2 build machinery inside the exclusively-WP-01-owned packages/cli/ tree.
import { createReadStream, createWriteStream, constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(CLI_ROOT, "..", "..");

const STARTER_SRC = path.join(REPO_ROOT, "examples/starter-reference/.source-template");
const PI_SRC_ROOT = path.join(REPO_ROOT, "examples/harness-integrations/pi");
const PI_SRC_DIRS = ["manifest-fixtures", "runtime-fixtures"];

const STARTER_OUT = path.join(CLI_ROOT, "templates/starter");
const PI_OUT = path.join(CLI_ROOT, "templates/pi");
const LAYOUT_OUT = path.join(CLI_ROOT, "templates/starter.layout.json");

const SCHEMA_VERSION = "vibe-engineer.templates.starter-layout.v1";

async function rmrf(target) {
  await fs.rm(target, { recursive: true, force: true });
}

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true });
}

// Recursive copy preserving directory structure and dotfiles. Returns list of copied
// rel-paths (posix, relative to the destination root) for inventory use.
async function copyTree(srcRoot, destRoot) {
  await rmrf(destRoot);
  await ensureDir(destRoot);
  const copied = [];
  const stack = [{ src: srcRoot, rel: "" }];
  while (stack.length > 0) {
    const { src, rel } = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(src, { withFileTypes: true });
    } catch (error) {
      throw new Error(`copy-templates: cannot read source dir ${src}: ${error.message}`);
    }
    // sort for determinism (does not affect copy order correctness, only log order)
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const entrySrc = path.join(src, entry.name);
      const entryRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      const entryDest = path.join(destRoot, entryRel);
      if (entry.isDirectory()) {
        await ensureDir(entryDest);
        stack.push({ src: entrySrc, rel: entryRel });
      } else if (entry.isFile()) {
        await ensureDir(path.dirname(entryDest));
        await copyFileAtomic(entrySrc, entryDest);
        copied.push(entryRel);
      }
      // symlinks / other types are intentionally ignored (templates are plain files)
    }
  }
  return copied;
}

function copyFileAtomic(src, dest) {
  // Stream-based byte copy (handles dotfiles, binary, utf-8 uniformly).
  return new Promise((resolve, reject) => {
    const tmp = `${dest}.tmp.${process.pid}`;
    const source = createReadStream(src);
    let opened = false;
    source.on("error", (error) => {
      if (!opened) reject(new Error(`copy-templates: cannot read ${src}: ${error.message}`));
    });
    const target = createWriteStream(tmp);
    target.on("error", (error) =>
      reject(new Error(`copy-templates: cannot write ${tmp}: ${error.message}`)),
    );
    target.on("finish", () => {
      opened = true;
      fs.rename(tmp, dest).then(resolve, (error) => {
        reject(new Error(`copy-templates: cannot finalize ${dest}: ${error.message}`));
      });
    });
    source.pipe(target);
  });
}

async function sha256OfFile(filePath) {
  const { createHash } = await import("node:crypto");
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(`sha256:${hash.digest("hex")}`));
  });
}

async function buildLayoutManifest(starterDestRoot, starterFiles) {
  // Preset-serialized layout manifest: a stable JSON inventory of the shipped starter
  // tree with per-file size + sha256. Deterministic ordering (posix, sorted).
  const sorted = [...starterFiles].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const entries = [];
  for (const rel of sorted) {
    const abs = path.join(starterDestRoot, rel);
    const stat = await fs.stat(abs);
    const integrity = await sha256OfFile(abs);
    entries.push({ path: rel, bytes: stat.size, sha256: integrity });
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedBy: "packages/cli/scripts/copy-templates.mjs",
    sourceRoot: "examples/starter-reference/.source-template",
    shippedRoot: "templates/starter",
    fileCount: entries.length,
    files: entries,
  };
}

async function writeJsonAtomic(dest, value) {
  const tmp = `${dest}.tmp.${process.pid}`;
  await ensureDir(path.dirname(dest));
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(tmp, dest);
}

function log(message) {
  process.stdout.write(`[copy-templates] ${message}\n`);
}

async function main() {
  // Source existence gates (fail closed if a read-only input is missing).
  await fs.access(STARTER_SRC, fsConstants.R_OK).catch(() => {
    throw new Error(`copy-templates: starter source not found: ${STARTER_SRC}`);
  });
  for (const dir of PI_SRC_DIRS) {
    const p = path.join(PI_SRC_ROOT, dir);
    await fs.access(p, fsConstants.R_OK).catch(() => {
      throw new Error(`copy-templates: pi source not found: ${p}`);
    });
  }

  log(
    `copying starter: ${path.relative(REPO_ROOT, STARTER_SRC)} → ${path.relative(REPO_ROOT, STARTER_OUT)}`,
  );
  const starterFiles = await copyTree(STARTER_SRC, STARTER_OUT);

  log(
    `copying pi assets: ${PI_SRC_DIRS.map((d) => path.relative(REPO_ROOT, path.join(PI_SRC_ROOT, d))).join(", ")} → ${path.relative(REPO_ROOT, PI_OUT)}`,
  );
  const piFiles = [];
  for (const dir of PI_SRC_DIRS) {
    const files = await copyTree(path.join(PI_SRC_ROOT, dir), path.join(PI_OUT, dir));
    piFiles.push(...files.map((rel) => `${dir}/${rel}`));
  }

  log("writing layout manifest");
  const layout = await buildLayoutManifest(STARTER_OUT, starterFiles);
  await rmrf(LAYOUT_OUT);
  await writeJsonAtomic(LAYOUT_OUT, layout);

  log(
    `done: starter=${starterFiles.length} files, pi=${piFiles.length} files, layout entries=${layout.files.length}`,
  );
}

main().catch((error) => {
  process.stderr.write(`copy-templates: FAILED: ${error.message}\n`);
  process.exitCode = 1;
});
