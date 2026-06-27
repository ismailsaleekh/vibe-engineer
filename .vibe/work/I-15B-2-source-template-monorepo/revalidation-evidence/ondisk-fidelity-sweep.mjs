// Independent revalidator probe: ON-DISK DL-16 fidelity sweep.
// Reads ACTUAL on-disk .source-template files (NOT in-memory), and uses the
// real preset manifest's typed forbiddenImports contract (re-rendered) as the
// boundary source. Checks:
//   (1) all 10 manifests @vibe-engineer-starter/* + private
//   (2) per-package boundary rules (preset forbiddenImports + DL-16 app rules)
//   (3) W-NEG-OVER-INFERENCE: forbidden business terms in core (non-sample) files
//   (4) W-NEG-PRIVATE-SCOPED-IMPORT / copied-logic markers across ALL source
//   (5) single golden module labeled sample/demo/reference
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const REPO = "/Users/lizavasilyeva/work/vibe-engineer";
const PRESET_ROOT = join(REPO, "packages/presets/nest-react-rn");
const TEMPLATE_ROOT = join(REPO, "examples/starter-reference/.source-template");

// Re-render the preset to get the typed forbiddenImports contract.
const rs = `const m = await import("@vibe-engineer/preset-nest-react-rn"); const L = m.getStarterLayoutDeclaration(); const P = m.getNestReactRnPresetMetadata(); process.stdout.write(JSON.stringify({layout:L, meta:P}));`;
const rr = spawnSync("node", ["--input-type=module", "-e", rs], { cwd: PRESET_ROOT, encoding: "utf8", maxBuffer: 64*1024*1024 });
if (rr.status !== 0) { console.error("PRESET RENDER FAIL", rr.stderr); process.exit(2); }
const { layout, meta } = JSON.parse(rr.stdout);

// ---- read on-disk tree into a map rel->content ----
async function walk(dir, base, acc) {
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) await walk(full, base, acc);
    else acc.set(relative(base, full).split("\\").join("/"), await readFile(full, "utf8"));
  }
}
const tree = new Map();
await walk(TEMPLATE_ROOT, TEMPLATE_ROOT, tree);
console.log(`on-disk files scanned: ${tree.size}`);

let findings = 0;
function fail(check, detail) { findings++; console.log(`  [FAIL] ${check}: ${JSON.stringify(detail)}`); }

// (1) scope + private across 10 manifests
const manifestPaths = ["package.json", ...layout.apps.map((a) => `${a.directory}/package.json`), ...layout.packages.map((p) => `${p.directory}/package.json`)];
let scopeBad = 0;
for (const mp of manifestPaths) {
  const raw = tree.get(mp); if (!raw) { fail("SCOPE", { mp, reason: "manifest missing" }); continue; }
  let p; try { p = JSON.parse(raw); } catch { fail("SCOPE", { mp, reason: "not JSON" }); continue; }
  if (!String(p.name ?? "").startsWith("@vibe-engineer-starter/")) { fail("SCOPE", { mp, name: p.name }); scopeBad++; }
  if (p.private !== true) { fail("SCOPE", { mp, reason: "not private" }); scopeBad++; }
}
console.log(`(1) SCOPE+PRIVATE: ${manifestPaths.length} manifests; ${scopeBad} bad`);

// (2) per-package boundary rules: preset forbiddenImports + DL-16 app rules
const IMPORT_RE = /(?:from\s+["']|import\s*\(\s*["']|require\s*\(\s*["'])([^"']+)["']/g;
function importsOf(content) { const s = new Set(); for (const m of content.matchAll(IMPORT_RE)) s.add(m[1]); return s; }
function hits(spec, forbidden) { for (const f of forbidden) { if (spec === f || spec.startsWith(f + "/")) return f; } return null; }

const pkgRules = layout.packages.map((p) => ({ root: `${p.directory}/src`, forbidden: p.forbiddenImports, label: p.name }));
const appRules = [
  { root: "apps/api/src", forbidden: ["@vibe-engineer-starter/web", "@vibe-engineer-starter/mobile", "@vibe-engineer-starter/ui", "@vibe-engineer-starter/testing"], label: "apps/api" },
  { root: "apps/web/src", forbidden: ["@vibe-engineer-starter/api", "@prisma/client", "@nestjs", "@vibe-engineer-starter/mobile"], label: "apps/web" },
  { root: "apps/mobile/src", forbidden: ["@vibe-engineer-starter/api", "@prisma/client", "@nestjs", "react-dom"], label: "apps/mobile" },
];
let boundaryBad = 0;
for (const rule of [...pkgRules, ...appRules]) {
  for (const [path, content] of tree) {
    if (!path.startsWith(rule.root)) continue;
    if (!/\.(ts|tsx|mjs|js)$/.test(path)) continue;
    for (const spec of importsOf(content)) {
      const h = hits(spec, rule.forbidden);
      if (h) { fail("BOUNDARY", { rule: rule.label, path, spec, forbidden: h }); boundaryBad++; }
    }
  }
}
console.log(`(2) BOUNDARY: ${pkgRules.length} pkg + ${appRules.length} app rules; ${boundaryBad} violations`);

// (3) W-NEG-OVER-INFERENCE: forbidden business terms in CORE (non-sample) files
const SAMPLE_MARKERS = ["golden-records", "sample", "demo", "reference"];
const isSample = (p) => SAMPLE_MARKERS.some((m) => p.includes(m));
const TERMS = ["ecommerce","inventory","fashion","Billz","Telegram","Instagram","checkout","product","customer","order","cart","payment","social-feed"];
const PATS = TERMS.map((t) => ({ t, re: new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`, "i") }));
let overInf = 0;
for (const [path, content] of tree) {
  if (isSample(path)) continue;
  if (/\.(svg|png)$/.test(path)) continue;
  for (const { t, re } of PATS) if (re.test(content)) { fail("OVER-INFERENCE", { path, term: t }); overInf++; }
}
console.log(`(3) OVER-INFERENCE: ${overInf} forbidden-term hits in core files`);

// (4) W-NEG-PRIVATE-SCOPED-IMPORT / copied-logic markers across ALL source
const PRIVATE = /@vibe-engineer\/(?:preset-typescript|adapter-pi|context|config|verification|security|artifacts|schematics|standards|mechanical-gates)/;
const RELHARNESS = /(?:from\s+["']|require\s*\(\s*["'])(\.\.\/)+(?:packages|adapters|presets\/typescript)\//;
const COPIED = ["validateTypeScriptPresetFiles","getPiGeneratedFileManifest","writeContextProject","createPiDownstreamManifestSummary","run-witnesses","verification-runner","schematic-manifest-engine"];
let harnessBad = 0;
for (const [path, content] of tree) {
  if (!/\.(ts|tsx|mjs|js)$/.test(path)) continue;
  if (PRIVATE.test(content)) { fail("PRIVATE-SCOPED", { path }); harnessBad++; }
  if (RELHARNESS.test(content)) { fail("RELATIVE-HARNESS", { path }); harnessBad++; }
  for (const m of COPIED) if (content.includes(m)) { fail("COPIED-MARKER", { path, marker: m }); harnessBad++; }
}
console.log(`(4) PRIVATE-SCOPED/COPIED: ${harnessBad} hits`);

// (5) single golden module labeled
const golden = tree.get("apps/api/src/golden-records/sample.ts");
const goldenLabeled = golden !== undefined && /sample|demo|reference/i.test(golden);
console.log(`(5) GOLDEN-LABELED: ${goldenLabeled}`);
if (!goldenLabeled) fail("GOLDEN-LABELED", { reason: "missing or unlabeled" });

console.log(`\n=== ON-DISK SWEEP: ${findings === 0 ? "PASS" : "FAIL"} (${findings} findings) ===`);
console.log(`presetId=${meta.presetId}; consumedTypescriptPresetId=${meta.consumedTypescriptPresetId}; scope=${layout.scope}`);
process.exit(findings === 0 ? 0 : 1);
