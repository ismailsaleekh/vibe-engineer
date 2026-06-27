// I-15B-3 REVALIDATOR — decisive context-contrast probe (NOT shape-only).
//
// Question under test: is the keystone W-HARNESS-IMPORT spawn (import("vibe-engineer")
// from cwd=packages/cli) a GENUINE real-boundary proof, or a false-green (accidental
// hoist / wrong-context resolution)?
//
// Strategy: run the IDENTICAL resolution+import probe from FOUR contexts and compare:
//   C1. cwd=packages/cli     -> the implementer's claimed context. Should resolve.
//   C2. cwd=<repo root>      -> root name=@vibe-engineer/workspace, no node_modules/vibe-engineer.
//                               Should FAIL (proves no global hoist; resolution is context-tied).
//   C3. cwd=<neutral tmp outside repo> -> no resolution context at all. Should FAIL.
//   C4. cwd=packages/adapters/pi -> a sibling workspace pkg NOT named vibe-engineer, not a
//                               declared dep of adapter-pi. Should FAIL (no self-ref, no link).
//
// For C1, additionally: resolve the ACTUAL on-disk file path each subpath maps to
// (to prove it points into packages/cli — the REAL harness — not a .pnpm shadow),
// and report the TYPE of each loaded symbol (function/object vs undefined/stub).
//
// Also probe the @vibe-engineer/adapter-pi resolution from packages/cli and confirm
// it resolves via the REAL external workspace:* symlink (readlink), proving a genuine
// external-consumption path complements the vibe-engineer self-reference.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readlinkSync, realpathSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Use the KNOWN absolute repo root (bulletproof; a prior relative-path bug landed
// 6 levels up at /Users/lizavasilyeva and corrupted the first run).
const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
// sanity: confirm the cli package.json name lives here (fail loud if wrong)
const moduleDir = fileURLToPath(new URL(".", import.meta.url));

const ctxs = [
  { id: "C1-packages-cli", cwd: join(repoRoot, "packages/cli") },
  { id: "C2-repo-root", cwd: repoRoot },
  { id: "C4-adapters-pi", cwd: join(repoRoot, "packages/adapters/pi") },
];
// C3: a neutral temp dir OUTSIDE the repo
const c3Dir = mkdtempSync(join(tmpdir(), "i15b3-contrast-"));
ctxs.push({ id: "C3-neutral-tmp", cwd: c3Dir });

const probeScript = `
const { createRequire } = await import("node:module");
const probes = [
  ["vibe-engineer", ["runCli"]],
  ["vibe-engineer/envelope", ["createEnvelope", "validateCliResultEnvelope", "CLI_STATUSES"]],
  ["vibe-engineer/command-loader", ["CommandLoader", "createCommandLoader"]],
];
const out = { subpaths: {}, resolvedPaths: {} };
const req = createRequire(import.meta.url);
for (const [spec, syms] of probes) {
  // (1) dynamic import — does the public surface actually load?
  try {
    const m = await import(spec);
    const types = Object.fromEntries(syms.map((s) => [s, typeof m[s]]));
    const missing = syms.filter((s) => typeof m[s] === "undefined");
    out.subpaths[spec] = { importOk: true, missing, types };
  } catch (e) {
    out.subpaths[spec] = { importOk: false, code: e.code, message: String(e.message).slice(0, 200) };
  }
  // (2) resolve the ACTUAL on-disk file path the specifier maps to
  try {
    const resolved = req.resolve(spec);
    out.resolvedPaths[spec] = { ok: true, resolved };
  } catch (e) {
    out.resolvedPaths[spec] = { ok: false, code: e.code, message: String(e.message).slice(0, 200) };
  }
}
process.stdout.write(JSON.stringify(out));
`;

const results = [];
for (const c of ctxs) {
  const res = spawnSync("node", ["--input-type=module", "-e", probeScript], {
    cwd: c.cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  let payload = null;
  let parseErr = null;
  if (res.stdout) {
    try { payload = JSON.parse(res.stdout); } catch (e) { parseErr = String(e.message).slice(0, 160); }
  }
  results.push({
    context: c.id,
    cwd: c.cwd,
    exit: res.status,
    stderr: (res.stderr || "").slice(0, 200),
    parseErr,
    payload,
  });
}

// Probe the @vibe-engineer/adapter-pi external link from packages/cli.
const adapterProbe = `
const { createRequire } = await import("node:module");
const req = createRequire(import.meta.url);
const out = {};
try {
  const m = await import("@vibe-engineer/adapter-pi/generated-file-manifest");
  out.importOk = true;
  out.hasGetPiGeneratedFileManifest = typeof m.getPiGeneratedFileManifest === "function";
  out.hasCreatePiDownstreamManifestSummary = typeof m.createPiDownstreamManifestSummary === "function";
  out.hasValidatePiGeneratedFileManifest = typeof m.validatePiGeneratedFileManifest === "function";
} catch (e) { out.importOk = false; out.code = e.code; out.message = String(e.message).slice(0, 200); }
try { out.resolved = req.resolve("@vibe-engineer/adapter-pi/generated-file-manifest"); } catch (e) { out.resolvedErr = String(e.message).slice(0,160); }
process.stdout.write(JSON.stringify(out));
`;
const adapterRes = spawnSync("node", ["--input-type=module", "-e", adapterProbe], {
  cwd: join(repoRoot, "packages/cli"),
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
let adapterPayload = null;
try { adapterPayload = JSON.parse(adapterRes.stdout); } catch (e) { adapterPayload = { parseErr: String(e.message).slice(0,160) }; }

// Inspect the symlinks on disk (independent of node resolution).
const linkInfo = {};
const adapterLink = join(repoRoot, "packages/cli/node_modules/@vibe-engineer/adapter-pi");
const pnpmSelfLink = join(repoRoot, "node_modules/.pnpm/node_modules/vibe-engineer");
for (const [k, p] of [["adapter-pi-link", adapterLink], ["pnpm-self-link", pnpmSelfLink]]) {
  try {
    linkInfo[k] = { exists: true, readlink: readlinkSync(p), realpath: realpathSync(p) };
  } catch (e) {
    linkInfo[k] = { exists: existsSync(p), error: String(e.message).slice(0, 120) };
  }
}

const report = { ts: new Date().toISOString(), contexts: results, adapterProbe: { exit: adapterRes.status, payload: adapterPayload }, linkInfo, repoRoot };
console.log(JSON.stringify(report, null, 2));
