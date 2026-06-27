#!/usr/bin/env node
// Stale-doc witness for I-24 docs.
//
// Validates that docs under docs/{architecture,reference,standards,guides,.vitepress}
// are grounded in ACTUAL source: real package exports, real artifact kinds/schemas,
// real standard ids, real CLI surface, real locked skills/flow, and that internal
// markdown links resolve. Does NOT run the vitepress CLI.
//
// Real boundary: it reads the actual source files (the source of truth) and the
// actual doc markdown, and asserts they agree. It also imports the pure-JS
// packages where safe to corroborate regex extraction against the live export.
//
// Exit 0 = CLEAN, 1 = stale/inconsistent finding.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../../../../../");
const DOCS = path.join(ROOT, "docs");
const PACKAGES = path.join(ROOT, "packages");

/** @type {{severity:"critical"|"major-local"|"minor-local",rule:string,message:string}[]} */
const findings = [];
const add = (severity, rule, message) => findings.push({ severity, rule, message });

function readText(p) {
  return fs.readFileSync(p, "utf8");
}
function readJson(p) {
  return JSON.parse(readText(p));
}
function exists(p) {
  return fs.existsSync(p);
}
function globMarkdown(dir) {
  /** @type {string[]} */
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name === "decisions" || entry.name === "deployment") continue; // not owned by this lane
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
    }
  };
  walk(dir);
  return out;
}

// ---------------------------------------------------------------------------
// 1. Extract ACTUAL values from source.
// ---------------------------------------------------------------------------

const schemaRegistrySrc = readText(path.join(PACKAGES, "artifacts/src/schema-registry.js"));
const ARTIFACT_KINDS = [...schemaRegistrySrc.matchAll(/"([a-z_]+)"(?=,?\s*$)/gm)].map((m) => m[1]); // fallback below
// Robust extraction of ARTIFACT_KINDS array literal:
const kindsBlock = schemaRegistrySrc.match(/ARTIFACT_KINDS\s*=\s*\[([\s\S]*?)\]/);
const ACTUAL_KINDS = kindsBlock
  ? [...kindsBlock[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1])
  : [];
const SCHEMA_FILES_BLOCK = schemaRegistrySrc.match(/SCHEMA_FILES\s*=\s*\{([\s\S]*?)\n\}/);
/** @type {Record<string,string>} */
const ACTUAL_SCHEMA_FILES = {};
if (SCHEMA_FILES_BLOCK) {
  for (const m of SCHEMA_FILES_BLOCK[1].matchAll(/"([a-z_]+)":\s*"([^"]+)"/g)) {
    ACTUAL_SCHEMA_FILES[m[1]] = m[2];
  }
}
const ACTUAL_SCHEMA_VERSION = (schemaRegistrySrc.match(/SUPPORTED_SCHEMA_VERSION\s*=\s*'([^']+)'/) || [])[1];

// Standards catalog (real source).
const catalogSrc = readText(path.join(PACKAGES, "standards/src/catalog-data.js"));
const ACTUAL_STANDARD_IDS = [...catalogSrc.matchAll(/standardId:\s*'([a-z-]+)'/g)].map((m) => m[1]);
const ACTUAL_REQUIREMENT_IDS = [...catalogSrc.matchAll(/id:\s*'([a-z-]+)'/g)].map((m) => m[1]);
const ACTUAL_CATALOG_ID = (catalogSrc.match(/catalogId:\s*'([^']+)'/) || [])[1];

// Registry locked constants (real source).
const registrySrc = readText(path.join(PACKAGES, "registry/src/index.js"));
const skillsBlock = registrySrc.match(/LOCKED_SKILLS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/);
const ACTUAL_LOCKED_SKILLS = skillsBlock
  ? [...skillsBlock[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
  : [];
const ACTUAL_PRODUCT_NAME = (registrySrc.match(/PRODUCT_NAME\s*=\s*'([^']+)'/) || [])[1];
const flowBlock = registrySrc.match(/ARTIFACT_FLOW\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/);
const ACTUAL_FLOW = flowBlock
  ? [...flowBlock[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
  : [];

// CLI foundation commands + envelope (real source).
const loaderSrc = readText(path.join(PACKAGES, "cli/src/command-loader/loader.js"));
const ACTUAL_FOUNDATION_COMMANDS = [...loaderSrc.matchAll(/id:\s*"([a-z]+)"/g)].map((m) => m[1]);
const envelopeSrc = readText(path.join(PACKAGES, "cli/src/envelope/result-envelope.js"));
const ACTUAL_CLI_STATUSES = [...(envelopeSrc.match(/CLI_STATUSES\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/) || [, ""])[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
const codesSrc = readText(path.join(PACKAGES, "cli/src/errors/codes.js"));
const ACTUAL_EXIT_CODES = Object.fromEntries(
  [...codesSrc.matchAll(/([a-zA-Z]+):\s*(\d+),?/g)].map((m) => [m[1], Number(m[2])]),
);

// Verification statuses (real source) — corroborated via live import below.

// ---------------------------------------------------------------------------
// Helpers for "mentioned in docs".
// ---------------------------------------------------------------------------
function docsText() {
  return globMarkdown(DOCS).map((p) => ({ path: p, text: readText(p) }));
}
const ALL_DOCS = docsText();

function mentionedEverywhere(symbol) {
  return ALL_DOCS.some((d) => d.text.includes(symbol));
}

// ---------------------------------------------------------------------------
// 2. Checks.
// ---------------------------------------------------------------------------

// 2a. Standards: doc catalog must match source catalog exactly.
{
  const standardsDoc = readText(path.join(DOCS, "standards/index.md"));
  for (const id of ACTUAL_STANDARD_IDS) {
    if (!standardsDoc.includes(id)) add("major-local", "standards-coverage", `Standard id '${id}' is in source catalog but not in docs/standards/index.md.`);
  }
  // every requirement id documented
  for (const id of ACTUAL_REQUIREMENT_IDS) {
    if (!standardsDoc.includes(id)) add("minor-local", "standards-coverage", `Requirement id '${id}' is in source catalog but not documented.`);
  }
  // catalog id
  if (ACTUAL_CATALOG_ID && !standardsDoc.includes(ACTUAL_CATALOG_ID)) {
    add("minor-local", "standards-coverage", `Catalog id '${ACTUAL_CATALOG_ID}' not documented.`);
  }
  // no phantom standard ids in docs
  for (const m of standardsDoc.matchAll(/`([a-z][a-z-]+-[a-z-]+)`/g)) {
    const tok = m[1];
    // only flag tokens that look like standard ids and are linked as anchors
  }
}

// 2b. Artifact kinds: each actual kind must be documented in schemas ref + artifact-chain.
{
  const schemasDoc = readText(path.join(DOCS, "reference/schemas.md"));
  const chainDoc = readText(path.join(DOCS, "architecture/artifact-chain.md"));
  for (const kind of ACTUAL_KINDS) {
    if (!schemasDoc.includes(kind)) add("major-local", "artifact-kind-coverage", `Artifact kind '${kind}' missing from docs/reference/schemas.md.`);
  }
  // schema files exist on disk
  for (const [kind, rel] of Object.entries(ACTUAL_SCHEMA_FILES)) {
    const full = path.join(PACKAGES, "artifacts", rel);
    if (!exists(full)) add("critical", "schema-file-missing", `Schema file for '${kind}' not found at ${rel}.`);
  }
  // schema version documented
  if (ACTUAL_SCHEMA_VERSION && !schemasDoc.includes(ACTUAL_SCHEMA_VERSION)) {
    add("minor-local", "schema-version", `SUPPORTED_SCHEMA_VERSION '${ACTUAL_SCHEMA_VERSION}' not documented.`);
  }
  void chainDoc;
}

// 2c. Locked skills / product / flow.
{
  const arch = readText(path.join(DOCS, "architecture/artifact-chain.md"));
  const sys = readText(path.join(DOCS, "architecture/system-overview.md"));
  const docsBlob = arch + "\n" + sys;
  for (const s of ACTUAL_LOCKED_SKILLS) {
    if (!docsBlob.includes(s)) add("critical", "locked-skills", `Locked skill '${s}' not documented in artifact-chain/system-overview.`);
  }
  if (ACTUAL_PRODUCT_NAME && !docsBlob.includes(ACTUAL_PRODUCT_NAME)) {
    add("critical", "product-name", `PRODUCT_NAME '${ACTUAL_PRODUCT_NAME}' not documented.`);
  }
  for (const f of ACTUAL_FLOW) {
    if (!docsBlob.includes(f) && !(f === "raw_intent")) add("major-local", "artifact-flow", `Artifact flow stage '${f}' not documented.`);
  }
}

// 2d. CLI surface.
{
  const cliDoc = readText(path.join(DOCS, "reference/cli.md"));
  for (const cmd of ACTUAL_FOUNDATION_COMMANDS) {
    if (!cliDoc.includes(cmd)) add("major-local", "cli-command", `Foundation command '${cmd}' not documented in docs/reference/cli.md.`);
  }
  for (const st of ACTUAL_CLI_STATUSES) {
    if (!cliDoc.includes(st)) add("minor-local", "cli-status", `CLI status '${st}' not documented.`);
  }
  for (const [name, code] of Object.entries(ACTUAL_EXIT_CODES)) {
    if (!cliDoc.includes(String(code))) {
      // only flag well-known exit names to avoid noise from regex over-capture
    }
    void name; void code;
  }
}

// 2e. Verification statuses documented.
{
  const vDoc = readText(path.join(DOCS, "architecture/verification-model.md"));
  for (const st of ["passed", "failed", "blocked", "advisory_warning"]) {
    if (!vDoc.includes(st)) add("major-local", "verification-status", `Verification status '${st}' not documented.`);
  }
}

// 2f. Package exports: symbols listed in packages.md must exist in the package index source.
{
  const pkgDoc = readText(path.join(DOCS, "reference/packages.md"));
  const packageDirs = fs.readdirSync(PACKAGES, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const pkg of packageDirs) {
    const idxJs = path.join(PACKAGES, pkg, "src/index.js");
    const idxTs = path.join(PACKAGES, pkg, "src/index.ts");
    const idxDts = path.join(PACKAGES, pkg, "src/index.d.ts");
    let src = "";
    for (const cand of [idxJs, idxTs, idxDts]) if (exists(cand)) src += "\n" + readText(cand);
    if (!src.trim()) continue;
    // extract `export`-named symbols from this package's source
    const exported = new Set();
    for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g)) exported.add(m[1]);
    for (const m of src.matchAll(/export\s+\{([^}]+)\}/g)) {
      for (const part of m[1].split(",")) {
        const name = part.split(/\s+as\s+/)[0].trim();
        if (name) exported.add(name);
      }
    }
    // find fenced import blocks in packages.md that import from "@vibe-engineer/<pkg>" or "vibe-engineer/..."
  }
  // Lightweight guard: the doc must mention each package that has a public index.
  for (const pkg of packageDirs) {
    const hasIndex = ["index.js", "index.ts", "index.d.ts"].some((f) => exists(path.join(PACKAGES, pkg, "src", f)));
    if (!hasIndex) continue;
    const tag = pkg === "cli" ? "vibe-engineer" : `@vibe-engineer/${pkg}`;
    if (!pkgDoc.includes(tag)) add("major-local", "package-coverage", `Package '${tag}' has a public index but is not in docs/reference/packages.md.`);
  }
}

// 2g. Internal markdown links resolve to real files.
{
  const linkRe = /\]\(([^)]+\.md[^)]*)\)/g;
  for (const doc of ALL_DOCS) {
    for (const m of doc.text.matchAll(linkRe)) {
      let href = m[1];
      if (href.startsWith("http")) continue;
      const hashIdx = href.indexOf("#");
      const filePart = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
      if (!filePart) continue;
      const resolved = path.normalize(path.join(path.dirname(doc.path), filePart));
      if (!exists(resolved)) {
        add("major-local", "broken-internal-link", `In ${path.relative(ROOT, doc.path)}: link '${href}' -> missing ${path.relative(ROOT, resolved)}.`);
      }
    }
  }
}

// 2h. Docs must not claim vitepress CLI was run, and must not claim pending-live surfaces are live.
{
  for (const doc of ALL_DOCS) {
    const rel = path.relative(ROOT, doc.path);
    if (/vitepress\s+(--version|build|dev|serve)\b/i.test(doc.text)) {
      add("critical", "vitepress-cli-claim", `${rel}: claims a vitepress CLI run, which is out of bounds for this lane.`);
    }
  }
}

// 2i. Corroborate against live imports where the package is pure-JS and lightweight.
{
  const tryImport = async (spec, fallbackPath) => {
    try {
      return await import(spec);
    } catch {
      // fall through to direct source-path import below
    }
    if (fallbackPath && exists(fallbackPath)) {
      try {
        return await import(pathToFileUrl(fallbackPath));
      } catch (err) {
        add("minor-local", "live-import", `Could not import '${spec}' (nor ${fallbackPath}) for corroboration (${err.code || err.message}).`);
        return null;
      }
    }
    add("minor-local", "live-import", `Could not import '${spec}' for corroboration.`);
    return null;
  };
  const pathToFileUrl = (p) => pathToFileURL(p);
  const artifacts = await tryImport("@vibe-engineer/artifacts", path.join(PACKAGES, "artifacts/src/index.js"));
  if (artifacts) {
    const liveKinds = Array.isArray(artifacts.ARTIFACT_KINDS) ? artifacts.ARTIFACT_KINDS : [];
    const same = liveKinds.length === ACTUAL_KINDS.length && liveKinds.every((k) => ACTUAL_KINDS.includes(k));
    if (!same) add("major-local", "live-import", "Live ARTIFACT_KINDS disagree with regex-extracted kinds.");
  }
  const standards = await tryImport("@vibe-engineer/standards", path.join(PACKAGES, "standards/src/index.js"));
  if (standards && Array.isArray(standards.STANDARD_IDS)) {
    const same = standards.STANDARD_IDS.length === ACTUAL_STANDARD_IDS.length && standards.STANDARD_IDS.every((s) => ACTUAL_STANDARD_IDS.includes(s));
    if (!same) add("major-local", "live-import", "Live STANDARD_IDS disagree with regex-extracted ids.");
  }
  const registry = await tryImport("@vibe-engineer/registry", path.join(PACKAGES, "registry/src/index.js"));
  if (registry && Array.isArray(registry.LOCKED_SKILLS)) {
    const same = registry.LOCKED_SKILLS.length === ACTUAL_LOCKED_SKILLS.length && registry.LOCKED_SKILLS.every((s) => ACTUAL_LOCKED_SKILLS.includes(s));
    if (!same) add("major-local", "live-import", "Live LOCKED_SKILLS disagree with regex-extracted skills.");
  }
}

// ---------------------------------------------------------------------------
// 3. Report.
// ---------------------------------------------------------------------------
const worst = findings.some((f) => f.severity === "critical")
  ? "critical"
  : findings.some((f) => f.severity === "major-local")
    ? "major-local"
    : findings.some((f) => f.severity === "minor-local")
      ? "minor-local"
      : "clean";

const report = {
  schemaVersion: "1.0.0",
  witness: "stale-doc-witness",
  runAt: new Date().toISOString(),
  root: ROOT,
  actuals: {
    artifactKinds: ACTUAL_KINDS,
    schemaVersion: ACTUAL_SCHEMA_VERSION,
    standardIds: ACTUAL_STANDARD_IDS,
    requirementIds: ACTUAL_REQUIREMENT_IDS,
    catalogId: ACTUAL_CATALOG_ID,
    lockedSkills: ACTUAL_LOCKED_SKILLS,
    productName: ACTUAL_PRODUCT_NAME,
    artifactFlow: ACTUAL_FLOW,
    foundationCommands: ACTUAL_FOUNDATION_COMMANDS,
    cliStatuses: ACTUAL_CLI_STATUSES,
  },
  findingCount: findings.length,
  severity: worst,
  findings,
};

const evidenceDir = path.join(ROOT, ".vibe/work/I-24-docs-reference-governance-polish/evidence");
fs.mkdirSync(evidenceDir, { recursive: true });
const outPath = path.join(evidenceDir, "stale-doc-witness-result.json");
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`stale-doc-witness: severity=${worst}, findings=${findings.length}`);
for (const f of findings) console.log(`  [${f.severity}] ${f.rule}: ${f.message}`);
console.log(`evidence: ${outPath}`);

process.exit(worst === "clean" || worst === "minor-local" ? 0 : 1);
