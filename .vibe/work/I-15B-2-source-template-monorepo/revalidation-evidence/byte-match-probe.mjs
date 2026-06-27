// Independent revalidator probe: W-TEMPLATE-CONSUMES-PRESET real-boundary.
// Renders the LIVE preset (in-context self-reference spawn into presetRoot, same
// sanctioned pattern as the materializer) and byte-compares each of the 29
// preset-declared paths against the ACTUAL ON-DISK .source-template/<path> file.
// The materializer's own check compares in-memory sha256s (circular w.r.t. its
// own write); THIS probe reads disk independently. If any mismatch → false-green.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const REPO = "/Users/lizavasilyeva/work/vibe-engineer";
const PRESET_ROOT = join(REPO, "packages/presets/nest-react-rn");
const TEMPLATE_ROOT = join(REPO, "examples/starter-reference/.source-template");
const PRESET_NAME = "@vibe-engineer/preset-nest-react-rn";

const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

const renderScript = `
const m = await import(${JSON.stringify(PRESET_NAME)});
const { createHash } = await import('node:crypto');
const files = m.renderNestReactRnPresetFiles();
const out = files.map((f) => ({ path: f.path, sha256: createHash('sha256').update(f.content,'utf8').digest('hex'), content: f.content }));
const layout = m.getStarterLayoutDeclaration();
const meta = m.getNestReactRnPresetMetadata();
process.stdout.write(JSON.stringify({ files: out, layout, meta }));
`;
const res = spawnSync("node", ["--input-type=module", "-e", renderScript], {
  cwd: PRESET_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
});
if (res.status !== 0) { console.error("PRESET RENDER FAILED", res.status, res.stderr); process.exit(2); }
const { files: presetFiles, layout, meta } = JSON.parse(res.stdout);
console.log(`preset rendered ${presetFiles.length} files; presetId=${meta.presetId}; consumedTypescriptPresetId=${meta.consumedTypescriptPresetId ?? "n/a"}`);
console.log(`layout scope=${layout.scope}; apps=${layout.apps.map((a) => a.directory).join(",")}; packages=${layout.packages.map((p) => p.directory).join(",")}`);

let mismatch = 0;
const report = [];
for (const f of presetFiles) {
  const diskPath = join(TEMPLATE_ROOT, f.path);
  let diskContent;
  try { diskContent = await readFile(diskPath, "utf8"); }
  catch (e) { mismatch++; report.push({ path: f.path, reason: "MISSING ON DISK" }); continue; }
  const diskSha = sha256(diskContent);
  if (diskSha !== f.sha256) { mismatch++; report.push({ path: f.path, reason: "BYTE MISMATCH", preset: f.sha256, disk: diskSha }); }
}
console.log(`\nW-TEMPLATE-CONSUMES-PRESET on-disk byte-match: ${presetFiles.length - mismatch}/${presetFiles.length}`);
if (mismatch === 0) console.log("PASS: all 29 preset-declared paths are byte-identical ON DISK to the live preset render (real derivation, not lookalike).");
else { console.log(`FAIL: ${mismatch} mismatch(es):`); console.log(JSON.stringify(report, null, 2)); }
process.exit(mismatch === 0 ? 0 : 1);
