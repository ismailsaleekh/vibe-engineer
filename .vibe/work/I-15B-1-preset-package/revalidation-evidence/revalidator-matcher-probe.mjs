// I-15B-1 REVALIDATOR independent probe — matcher fix + full pipeline.
// REAL-BOUNDARY load of the REAL preset source bytes (the identical src/index.ts
// the witness self-references). Loaded via Node-24 native type-stripping from
// the source file's own location, so the transitive
// `import ... from "@vibe-engineer/preset-typescript"` resolves via the REAL
// workspace `link:` edge (Step-0) — NOT a mock/synthetic. The self-reference
// load mechanism itself is independently proven by the witness runner (which is
// physically inside the package) running green; this probe isolates the matcher
// precision using the same real source bytes.
import { writeFileSync, mkdirSync } from "node:fs";

const preset = await import(
  "/Users/lizavasilyeva/work/vibe-engineer/packages/presets/nest-react-rn/src/index.ts",
);

// Reaching this line PROVES the transitive harness-consumption seam resolved via
// the real link: src/index.ts has a top-level `import ... from
// "@vibe-engineer/preset-typescript"` that would throw ERR_MODULE_NOT_FOUND at
// module load if the workspace link were absent. So a successful load == real
// transitive resolution from the source file's own context.

const rendered = preset.renderNestReactRnPresetFiles();

// ---- Probe (a): positive — defect closure (production/product false-positive gone)
const posRes = preset.validateNestReactRnPresetFiles(rendered);
const probeA = {
  name: "(a) validate(renderNestReactRnPresetFiles())",
  ok: posRes.ok,
  findingCount: posRes.findings.length,
  findingCodes: posRes.findings.map((f) => f.code),
  fileCount: posRes.fileCount,
};

// ---- Carrier: inject a suffix into a non-sample-demo file (mirror witness carrier)
function inject(suffix) {
  return rendered.map((f) =>
    f.path === "tsconfig.base.json" ? { ...f, content: `${f.content}\n${suffix}\n` } : f,
  );
}
function domainFindings(res) {
  return res.findings
    .filter((f) => f.code === "PRESET_DOMAIN_SPECIFIC_CORE_TEXT")
    .map((f) => ({ path: f.path, evidence: f.evidence }));
}
function allCodes(res) {
  return res.findings.map((f) => f.code);
}

// ---- Probe (b): W-NEG-OVER-INFERENCE — REAL forbidden business terms still fail-closed
const realTerms = ["ecommerce", "inventory", "order", "payment", "customer", "cart", "checkout"];
const probeB = realTerms.map((term) => {
  const res = preset.validateNestReactRnPresetFiles(inject(`// ${term} placeholder`));
  return { term, failClosed: res.ok === false, domainFound: domainFindings(res), observedCodes: allCodes(res) };
});

// ---- Probe (c): edge cases (decisive — word-boundary precision, no weakening)
const probeC = {};
for (const [label, suffix, expectation] of [
  ["products_plural", "// products listing", "shouldNotFlag"],
  ["production_legit", "// production environment", "shouldNotFlag"],
  ["product_whole", "// a product catalog", "shouldFlag"],
  ["Product_capital", "// My Product list", "shouldFlag"],
  ["ordering_verb", "// ordering more items", "shouldNotFlag"], // "order" must not fire on "ordering"
  ["delivered_verb", "// delivered yesterday", "shouldNotFlag"], // none
]) {
  const res = preset.validateNestReactRnPresetFiles(inject(suffix));
  const df = domainFindings(res);
  const flagged = df.length > 0;
  probeC[label] = { expectation, flagged, domainFindings: df, observedCodes: allCodes(res) };
}

// ---- Unit-level matcher replication (PURE \b regex semantics — isolates the fix)
function escapeRegExpLiteral(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const patterns = preset.FORBIDDEN_DOMAIN_TERMS.map((t) => ({
  term: t,
  pattern: new RegExp(`\\b${escapeRegExpLiteral(t)}\\b`, "i"),
}));
function matchTerms(text) {
  return patterns.filter((p) => p.pattern.test(text)).map((p) => p.term);
}
const unitProbe = {
  forbiddenTerms: [...preset.FORBIDDEN_DOMAIN_TERMS],
  cases: {
    production_sentence: { text: "Test-only; no production package may depend on it.", matches: matchTerms("Test-only; no production package may depend on it.") },
    products: { text: "// products", matches: matchTerms("// products") },
    product_whole: { text: "// product", matches: matchTerms("// product") },
    Product_capital: { text: "// Product", matches: matchTerms("// Product") },
    ordering_verb: { text: "// ordering", matches: matchTerms("// ordering") },
    order_whole: { text: "// order", matches: matchTerms("// order") },
    checkout_whole: { text: "// checkout", matches: matchTerms("// checkout") },
    ecommerce_phrase: { text: "the ecommerce site", matches: matchTerms("the ecommerce site") },
    inventory_hyphen: { text: "inventory-item count", matches: matchTerms("inventory-item count") },
    socialfeed_hyphen: { text: "social-feed widget", matches: matchTerms("social-feed widget") },
  },
};

const report = {
  loadMechanism: "real src/index.ts via absolute path (Node 24 type-stripping); load success itself proves the transitive @vibe-engineer/preset-typescript import resolved via the real workspace link from the source file's own context (top-level import would throw ERR_MODULE_NOT_FOUND otherwise)",
  transitiveTsPresetResolvedViaRealLink: true, // proven by the await import(src) above not throwing
  probeA,
  probeB,
  probeC,
  unitProbe,
  publicApiExportCount: Object.keys(preset).length,
  consumeBareSpecifier: "@vibe-engineer/preset-typescript (workspace:* link)",
};
const outDir = "/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-15B-1-preset-package/revalidation-evidence";
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/revalidator-matcher-probe.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
