// @sample @demo @reference — I-17A web E2E/UI STRUCTURAL validator (W-STRUCTURAL).
//
// Shape-green layer (quality bar: shape-green is NOT truth-green). Runs WITHOUT a
// live browser and proves the suite is WELL-FORMED:
//   - golden-web consumes the I-16B shared client (W-WEB-APP-CONSUMES-SHARED-CLIENT shape)
//   - served-app harness is fail-closed (W-SERVED-APP-HARNESS shape)
//   - Playwright config viewport matrix is non-empty + matches the UI config
//   - every E2E/specialist selector resolves to a selector emitted by golden-web
//   - specialist configs well-formed + evidence schema specialist enum matches
//   - baseline manifest baseline_path entries are well-formed (PNGs absent under
//     first-baseline-proposal is NOT a shape failure)
// This does NOT prove truth-green (no real browser). The real-boundary witness
// (run-web-e2e-ui-witness.mjs) owns truth-green.

import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)); // e2e-ui/web
const goldenWeb = path.resolve(here, "../../golden-web");const checks = [];
function record(name, ok, summary) {
  checks.push({ name, ok, summary });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name} — ${summary}`);
}

async function readText(p) {
  return readFile(p, "utf8");
}
async function readDirFiles(root) {
  const out = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push(full);
    }
  }
  await walk(root);
  return out;
}

// Collect the full golden-web source blob (shape evidence).
async function goldenWebBlob() {
  const files = (await readDirFiles(path.join(goldenWeb, "src"))).filter((f) => /\.[tj]sx?$/.test(f));
  const parts = await Promise.all(files.map((f) => readText(f)));
  return parts.join("\n");
}

async function main() {
  const blob = await goldenWebBlob();

  // 1. golden-web consumes the I-16B shared client (no contract/client re-decl).
  const consumesSharedClient = /golden-client\/src\/(index|golden-records\.shared-client|use-golden-records|transport\/web)\.js/.test(blob)
    && /useGoldenRecords/.test(blob)
    && /createGoldenRecordsSharedClient/.test(blob)
    && /createWebTransport/.test(blob);
  const noContractFork = !/\bz\.(object|string|number|enum|literal|boolean|array|union)\s*\(/.test(blob)
    && !/\binitContract\s*\(/.test(blob);
  record("W-WEB-APP-CONSUMES-SHARED-CLIENT (shape)", consumesSharedClient && noContractFork,
    consumesSharedClient && noContractFork ? "golden-web imports the I-16B shared client; defines no Zod/route contract" : "shared-client consumption or no-fork defect");

  // 2. served-app harness fail-closed.
  const harness = await readText(path.join(goldenWeb, "harness/serve-golden-web.mjs"));
  const failClosed = /probeReady/.test(harness) && /throw new Error/.test(harness) && /fail-closed/.test(harness) && /SIGTERM/.test(harness);
  record("W-SERVED-APP-HARNESS (shape)", failClosed, failClosed ? "harness spawns/ready-probes/tears-down; non-ready throws (fail-closed)" : "harness not fail-closed");

  // 3. Playwright viewport matrix non-empty + matches UI config.
  const pwConfig = await readText(path.join(here, "playwright.config.ts"));
  const uiConfig = await readText(path.join(here, "ui-verification/ui-verification.config.ts"));
  const pwIds = [...pwConfig.matchAll(/id:\s*"([a-z]+)"/g)].map((m) => m[1]);
  const matrixNonEmpty = pwIds.length >= 5;
  const matrixHasCompactDesktop = pwIds.includes("compact") && pwIds.includes("desktop") && pwIds.includes("tablet") && pwIds.includes("small") && pwIds.includes("wide");
  const uiHasMatrix = /viewports:\s*\[/.test(uiConfig) && /compact/.test(uiConfig) && /desktop/.test(uiConfig);
  record("W-VIEWPORT-MATRIX (shape)", matrixNonEmpty && matrixHasCompactDesktop && uiHasMatrix,
    `playwright projects=[${pwIds.join(",")}] + UI config matrix present`);

  // 4. Selectors emitted by golden-web vs referenced by E2E/specialists.
  const emitted = new Set([...blob.matchAll(/data-testid="([a-z0-9-]+)"/g)].map((m) => m[1]));
  // Dynamic nav testids: app.tsx builds `data-testid={`nav-${id}`}` from item("X", ...).
  for (const m of blob.matchAll(/item\(\s*"([a-z-]+)"/g)) emitted.add(`nav-${m[1]}`);
  // Force-invalid query flag is a deterministic selector contract too.
  const requiredEmitted = ["nav-golden-records", "golden-records-section", "golden-record-card", "golden-record-title", "golden-record-id", "golden-record-accepted", "golden-records-error", "system-status-section"];
  const missingEmitted = requiredEmitted.filter((t) => !emitted.has(t));
  const e2eDir = path.join(here, "e2e");
  const specFiles = (await readDirFiles(e2eDir)).filter((f) => /\.e2e\.spec\.ts$/.test(f));
  const specBlob = (await Promise.all(specFiles.map(readText))).join("\n");
  const referenced = new Set([...specBlob.matchAll(/getByTestId\("([a-z0-9-]+)"\)/g)].map((m) => m[1]));
  const unresolvedSelectors = [...referenced].filter((t) => !emitted.has(t) && t !== "golden-record-card-DOES-NOT-EXIST" && t !== "golden-record-titel");
  record("selectors-resolve (shape)", missingEmitted.length === 0 && unresolvedSelectors.length === 0,
    missingEmitted.length === 0 && unresolvedSelectors.length === 0
      ? `all required selectors emitted by golden-web; all spec selectors resolve (${referenced.size} referenced)`
      : `missing emitted=${missingEmitted.join(",")} unresolved=${unresolvedSelectors.join(",")}`);

  // 5. Specialist configs well-formed + evidence schema enum matches config.
  const schema = JSON.parse(await readText(path.join(here, "ui-verification/evidence-packet.schema.json")));
  const schemaSpecialists = schema.properties.specialist.enum;
  const configSpecialistIds = [...uiConfig.matchAll(/id:\s*"(overlap-clipping|spacing-alignment|responsive-layout|truncation|color-contrast|accessibility|visual-regression)"/g)].map((m) => m[1]);
  const specialistsWellFormed =
    configSpecialistIds.length === 7 &&
    schemaSpecialists.length === 7 &&
    schemaSpecialists.every((s) => configSpecialistIds.includes(s));
  const specialistFiles = (await readDirFiles(path.join(here, "ui-verification/specialists"))).filter((f) => /\.spec\.ts$/.test(f));
  const specialistBlob = (await Promise.all(specialistFiles.map(readText))).join("\n");
  const everySpecialistEmitsEvidence = configSpecialistIds.every((id) => specialistBlob.includes(`specialist: "${id}"`) || specialistBlob.includes(`"${id}"`));
  record("specialists-well-formed (shape)", specialistsWellFormed && specialistFiles.length === 7 && everySpecialistEmitsEvidence,
    `${configSpecialistIds.length}/7 specialists configured; ${specialistFiles.length} specialist specs; schema enum aligned; each emits evidence`);

  // 6. Baseline manifest well-formed (PNGs absent under proposal is OK).
  const manifest = JSON.parse(await readText(path.join(here, "ui-verification/baselines/baseline-manifest.contract.json")));
  const baselinePathsWellFormed = manifest.required_baseline_identities.every((r) => typeof r.baseline_path === "string" && r.baseline_path.startsWith("baselines/") && r.baseline_path.endsWith(".png"));
  const baselineMode = manifest.baseline_mode === "first-baseline-proposal";
  record("baseline-manifest-well-formed (shape)", baselinePathsWellFormed && baselineMode,
    `${manifest.required_baseline_identities.length} baseline identities; mode=${manifest.baseline_mode}`);

  // 7. Provenance sha for golden-web source (shape provenance).
  const sha = createHash("sha256").update(blob, "utf8").digest("hex");
  record("golden-web-source-provenance", true, `golden-web src sha256=${sha.slice(0, 16)}…`);

  const failed = checks.filter((c) => !c.ok);
  const ok = failed.length === 0;
  console.log(`\n=== I-17A structural (shape-green): ${ok ? "PASS" : "FAIL"} (${checks.length} checks, ${failed.length} failed) ===`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("structural validator FATAL:", e);
  process.exit(2);
});
