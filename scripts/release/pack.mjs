#!/usr/bin/env node
// WP-05 release:pack — topologically `npm pack` all 10 publish packages and
// produce evidence + summary.json. Re-runnable (not one-shot). No publish.
//
// Usage:
//   node scripts/release/pack.mjs [--out <dir>] [--evidence-dir <dir>] [--summary-out <json>]
//
// Defaults: out / evidence under .vibe/work/WP-05-pack-install/release/pack/
// Exit 0 only when every per-tarball + aggregate assertion holds (W-P1, W-P2, W-R3).

import { mkdir, readFile, writeFile, access, readdir } from "node:fs/promises";
import path from "node:path";
import url from "node:url";

import {
  run,
  writeJson,
  sha256File,
  assertOk,
  AssertionFailure,
  cleanDir,
} from "./lib/release-helpers.mjs";

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_OUT = path.join(REPO_ROOT, ".vibe/release/pack");

// ---------- arg parsing (fail-closed; mirrors scripts/quality discipline) ----------
function parseArgs(argv) {
  const out = { out: DEFAULT_OUT, evidenceDir: null, summaryOut: null, unknown: [] };
  const known = { "--out": "out", "--evidence-dir": "evidenceDir", "--summary-out": "summaryOut" };
  const tokens = argv.slice(2);
  let i = 0;
  while (i < tokens.length) {
    const arg = tokens[i];
    if (arg === "--") {
      i += 1;
      continue;
    }
    const eq = arg.startsWith("--") ? arg.indexOf("=") : -1;
    if (eq > 2) {
      const name = arg.slice(0, eq);
      const value = arg.slice(eq + 1);
      if (known[name]) {
        out[known[name]] = value;
        i += 1;
        continue;
      }
      out.unknown.push(arg);
      i += 1;
      continue;
    }
    if (known[arg]) {
      const value = tokens[i + 1];
      if (value === undefined) {
        out.unknown.push(arg);
        i += 1;
        continue;
      }
      out[known[arg]] = value;
      i += 2;
      continue;
    }
    out.unknown.push(arg);
    i += 1;
  }
  return out;
}

// ---------- discover the 10 publish packages ----------
// Publish set = private !== true AND version === "0.1.0" AND name in the
// vibe-engineer scope (or exactly "vibe-engineer"). The fixtures under
// mechanical-gates/presets are excluded (they are 0.0.0 / null / @mini / @generated).
async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function childPackageJsons(parent) {
  const entries = await readdir(parent, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packageJson = path.join(parent, entry.name, "package.json");
    if (await fileExists(packageJson)) files.push(packageJson);
  }
  return files;
}

async function workspacePackageJsons() {
  const files = [];
  files.push(...(await childPackageJsons(path.join(REPO_ROOT, "packages"))));
  files.push(...(await childPackageJsons(path.join(REPO_ROOT, "packages", "presets"))));
  files.push(...(await childPackageJsons(path.join(REPO_ROOT, "packages", "adapters"))));
  const infraPulumi = path.join(REPO_ROOT, "infra", "pulumi", "package.json");
  if (await fileExists(infraPulumi)) files.push(infraPulumi);
  return [...new Set(files)];
}

async function discoverPublishPackages() {
  const all = await workspacePackageJsons();
  const publish = [];
  for (const f of all) {
    let manifest;
    try {
      manifest = JSON.parse(await readFile(f, "utf8"));
    } catch {
      continue;
    }
    if (manifest.private === true) continue;
    if (manifest.version !== "0.1.0") continue;
    const name = manifest.name;
    if (name !== "vibe-engineer" && !name.startsWith("@vibe-engineer/")) continue;
    publish.push({ name, dir: path.dirname(f), manifestPath: f, manifest });
  }
  return publish;
}

// ---------- topological order (leaf deps first, cli last) ----------
function topoSort(pkgs) {
  const byName = new Map(pkgs.map((p) => [p.name, p]));
  const visited = new Map(); // name -> "visiting" | "done"
  const out = [];
  function visit(p) {
    const state = visited.get(p.name);
    if (state === "done") return;
    if (state === "visiting") return; // cycle guard (should not happen)
    visited.set(p.name, "visiting");
    const deps = Object.keys(p.manifest.dependencies || {}).filter((d) => byName.has(d));
    for (const d of deps) visit(byName.get(d));
    visited.set(p.name, "done");
    out.push(p);
  }
  for (const p of pkgs) visit(p);
  return out;
}

// ---------- npm pack dry-run inventory parsing ----------
// `npm pack --dry-run` emits lines like:
//   npm notice 1.0 kB  dist/foo.js
// We collect the path tokens (last whitespace-separated token). Skip non-path lines.
function parseDryRunInventory(stdout) {
  const files = [];
  for (const line of stdout.split("\n")) {
    if (!line.startsWith("npm notice")) continue;
    if (line.includes("npm notice Tarball Contents")) continue;
    if (line.includes("npm notice package files")) continue;
    // path is the last whitespace-delimited token that looks like a relative path
    const m = line.match(/npm notice\s+\S+(?:\s+\S+)?\s+(.+?)\s*$/);
    if (!m) continue;
    let rel = m[1].trim();
    // some npm versions print "<size>  <path>"; the regex's group already starts at size; re-split
    // Normalize: take everything after the second token if first token is a size like "1.2kB"
    const parts = line.split(/\s+/).filter(Boolean);
    // drop "npm","notice"; the remaining: [maybeSize, maybeSize2, ...path]
    // We heuristically take the last token as path; but multi-word paths don't occur here.
    rel = parts[parts.length - 1];
    if (!rel || rel.startsWith("npm")) continue;
    files.push(rel);
  }
  return files;
}

// ---------- extract package/package.json from a produced tarball (real packed manifest) ----------
async function packedManifest(tarballPath) {
  // tarball layout: package/<files>. Extract package/package.json via `tar -xO`.
  const r = await run("tar", ["-xzOf", tarballPath, "package/package.json"]);
  if (!r.ok)
    throw new AssertionFailure("packed-manifest-extract", { tarballPath, stderr: r.stderr });
  try {
    return JSON.parse(r.stdout);
  } catch (e) {
    throw new AssertionFailure("packed-manifest-parse", { tarballPath, err: String(e) });
  }
}

// ---------- assertions (W-P1, W-P2, W-R3) ----------
const FORBIDDEN_PACKED_PATHS = [
  /^src\//,
  /^tsconfig/,
  /(^|\/)node_modules\//,
  /^\.git\//,
  /\.map$/,
  /(^|\/)fixtures?\//,
  /(^|\/)evidence\//,
  /(^|\/)witnesses?\//,
  /^\.vibe\//,
  /^\.pi\/tasks\//,
  /^docs\/planning\//,
  /^\.turbo/,
];
const PRIVATE_PKG_NAMES = [
  "@vibe-engineer/observability",
  "@vibe-engineer/registry",
  "@vibe-engineer/mechanical-gates",
  "@vibe-engineer/contracts",
  "@vibe-engineer/standards",
  "@vibe-engineer/testing",
  "@vibe-engineer/preset-nest-react-rn",
  "@vibe-engineer/preset-typescript",
  "@vibe-engineer/infra-pulumi",
];

function manifestReferencesPrivatePkg(manifest) {
  const blob = JSON.stringify({
    dependencies: manifest.dependencies || {},
    devDependencies: manifest.devDependencies || {},
    peerDependencies: manifest.peerDependencies || {},
    optionalDependencies: manifest.optionalDependencies || {},
  });
  return PRIVATE_PKG_NAMES.filter((n) => blob.includes(n));
}

function isForbiddenPackedPath(relPath) {
  // Starter templates intentionally include empty public scaffold directories such
  // as templates/starter/.vibe/evidence/README.md. Those are runtime templates,
  // not local evidence artifacts from this repository.
  if (relPath.startsWith("templates/starter/")) return false;
  if (relPath.startsWith("templates/pi/")) return false;
  return FORBIDDEN_PACKED_PATHS.some((re) => re.test(relPath));
}

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv);
  assertOk("pack-args", args.unknown.length === 0, { unknown: args.unknown });

  const outDir = path.resolve(args.out);
  const evidenceDir = path.resolve(args.evidenceDir || path.join(outDir, "evidence"));
  const summaryOut = path.resolve(args.summaryOut || path.join(outDir, "summary.json"));
  const tarballDir = path.join(outDir, "tarballs");
  await cleanDir(outDir);
  await mkdir(tarballDir, { recursive: true });
  await mkdir(evidenceDir, { recursive: true });

  const summary = {
    schemaVersion: "wp05.release.pack.summary/v1",
    generatedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    outDir,
    evidenceDir,
    tarballDir,
    packages: [],
    assertions: {
      "W-P1-pack-green": null,
      "W-P2-absence": null,
      "W-R3-allowlist": null,
      "C2-template-root": null,
    },
    errors: [],
    ok: false,
  };

  try {
    const publish = await discoverPublishPackages();
    assertOk("publish-count-10", publish.length === 10, {
      found: publish.length,
      names: publish.map((p) => p.name),
    });
    const ordered = topoSort(publish);
    assertOk("cli-last-in-topo", ordered[ordered.length - 1].name === "vibe-engineer", {
      order: ordered.map((p) => p.name),
    });

    for (const p of ordered) {
      // dry-run inventory
      const dryRun = await run("npm", ["pack", "--dry-run", "--json"], { cwd: p.dir });
      assertOk("pack-dryrun-ok", dryRun.ok, {
        pkg: p.name,
        exit: dryRun.exitCode,
        stderr: dryRun.stderr,
      });
      let dryJson;
      try {
        dryJson = JSON.parse(dryRun.stdout);
      } catch (e) {
        throw new AssertionFailure("dryrun-json-parse", { pkg: p.name, err: String(e) });
      }
      const entry = Array.isArray(dryJson) ? dryJson[0] : dryJson;
      const packedFiles = entry && Array.isArray(entry.files) ? entry.files.map((f) => f.path) : [];
      // Also keep the text dry-run for the evidence record (human-readable).
      const dryRunText = await run("npm", ["pack", "--dry-run"], { cwd: p.dir });

      // real pack
      const pack = await run("npm", ["pack", "--pack-destination", tarballDir], { cwd: p.dir });
      assertOk("pack-ok", pack.ok, { pkg: p.name, exit: pack.exitCode, stderr: pack.stderr });
      const tarballName = pack.stdout.trim().split("\n").pop().trim();
      const tarballPath = path.join(tarballDir, tarballName);
      assertOk("tarball-exists", await fileExists(tarballPath), { tarballPath });
      const stat = await import("node:fs/promises").then((m) => m.stat(tarballPath));
      const sha = await sha256File(tarballPath);

      // extract the REAL packed manifest from the tarball
      const manifest = await packedManifest(tarballPath);

      // W-R3: allowlist respected (no src/tsconfig/node_modules in packed files)
      const forbiddenHits = packedFiles.filter((f) => isForbiddenPackedPath(f));
      // W-P2a: no `workspace:` string anywhere in the packed manifest
      const manifestBlob = JSON.stringify(manifest);
      const hasWorkspace = manifestBlob.includes("workspace:");
      // W-P2b: no private-pkg name referenced in the packed manifest
      const privateRefs = manifestReferencesPrivatePkg(manifest);

      // C2: cli tarball contains template root
      let c2 = null;
      if (p.name === "vibe-engineer") {
        const starterFiles = packedFiles.filter((f) => f.startsWith("templates/starter/"));
        const piFiles = packedFiles.filter((f) => f.startsWith("templates/pi/"));
        const layout = packedFiles.filter((f) => f === "templates/starter.layout.json");
        c2 = {
          starterCount: starterFiles.length,
          piCount: piFiles.length,
          hasLayout: layout.length === 1,
        };
        assertOk("C2-starter-min80", starterFiles.length >= 80, {
          starterCount: starterFiles.length,
        });
        assertOk("C2-pi-present", piFiles.length >= 1, { piCount: piFiles.length });
        assertOk("C2-layout-present", layout.length === 1, { layout });
      }

      const perPkg = {
        name: p.name,
        dir: p.dir,
        tarball: tarballName,
        tarballPath,
        sizeBytes: stat.size,
        sha256: sha,
        packedFileCount: packedFiles.length,
        packedFiles,
        forbiddenPathHits: forbiddenHits,
        manifestHasWorkspace: hasWorkspace,
        manifestPrivatePkgRefs: privateRefs,
        c2,
      };
      summary.packages.push(perPkg);

      // per-package evidence
      await writeJson(path.join(evidenceDir, `${p.name.replace("/", "_")}.pack.json`), perPkg);
      await writeFile(
        path.join(evidenceDir, `${p.name.replace("/", "_")}.dryrun.txt`),
        dryRunText.stdout,
        "utf8",
      );

      // fail-closed per package
      assertOk("W-R3-allowlist", forbiddenHits.length === 0, { pkg: p.name, forbiddenHits });
      assertOk("W-P2-no-workspace", !hasWorkspace, { pkg: p.name });
      assertOk("W-P2-no-private-ref", privateRefs.length === 0, { pkg: p.name, privateRefs });
    }

    // aggregate assertions
    const allPackedFiles = summary.packages.flatMap((p) =>
      p.packedFiles.map((f) => ({ pkg: p.name, f })),
    );
    const anyForbidden = allPackedFiles.filter(({ f }) => isForbiddenPackedPath(f));
    const anyWorkspace = summary.packages.some((p) => p.manifestHasWorkspace);
    const anyPrivateRef = summary.packages.filter((p) => p.manifestPrivatePkgRefs.length > 0);
    const cliPkg = summary.packages.find((p) => p.name === "vibe-engineer");
    summary.assertions["W-P1-pack-green"] =
      summary.packages.length === 10 && summary.packages.every((p) => p.tarball && p.sha256);
    summary.assertions["W-P2-absence"] = !anyWorkspace && anyPrivateRef.length === 0;
    summary.assertions["W-R3-allowlist"] = anyForbidden.length === 0;
    summary.assertions["C2-template-root"] =
      !!cliPkg &&
      !!cliPkg.c2 &&
      cliPkg.c2.starterCount >= 80 &&
      cliPkg.c2.piCount >= 1 &&
      cliPkg.c2.hasLayout;
    summary.topoOrder = summary.packages.map((p) => p.name);
    summary.ok = Object.values(summary.assertions).every(Boolean);
  } catch (e) {
    summary.ok = false;
    if (e instanceof AssertionFailure) {
      summary.errors.push({ assertion: e.assertion, detail: e.detail });
    } else {
      summary.errors.push({
        assertion: "unexpected-throw",
        detail: { message: String(e), stack: e.stack },
      });
    }
  }

  await writeJson(summaryOut, summary);
  process.exit(summary.ok ? 0 : 1);
}

main().catch((e) => {
  console.error("pack.mjs fatal:", e);
  process.exit(1);
});
