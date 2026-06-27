// Revalidator's INDEPENDENT adversarial probe (NOT the implementer's factory).
// Imports the REAL validators from I-17B fixtures and feeds them the REAL
// generated artifacts, then applies REAL mutations to prove each gate is
// load-bearing (fail-closed) on real data — not just synthetic factory probes.
//
// Run:
//   node --experimental-strip-types revalidation-evidence/adversarial-probe.ts

import { readFile } from "node:fs/promises";
import { validateSelectionMetadata } from "/Users/lizavasilyeva/work/vibe-engineer/examples/starter-reference/generated-fixtures/golden-mobile/src/validate/selection-metadata.ts";
import { validateUiCapture } from "/Users/lizavasilyeva/work/vibe-engineer/examples/starter-reference/generated-fixtures/e2e-ui/mobile/src/validate/ui-capture.ts";

const GOLDEN_MOBILE = "/Users/lizavasilyeva/work/vibe-engineer/examples/starter-reference/generated-fixtures/golden-mobile";
const E2E_UI_MOBILE = "/Users/lizavasilyeva/work/vibe-engineer/examples/starter-reference/generated-fixtures/e2e-ui/mobile";

const results = [];
function check(name, fn) {
  let r;
  try { r = fn(); }
  catch (e) { r = { threw: String(e && e.stack || e) }; }
  const ok = r && r.ok === true;
  results.push({ name, ok, ...r });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${r.note ? ` — ${r.note}` : ""}`);
}

// ---------- DL-12 selection-metadata validator on REAL metadata ----------
const metaNames = ["gr-01-app-launch-smoke.json", "gr-02-navigate-read-list.json", "gr-03-resync-after-reload.json", "gr-04-deterministic-state-reset.json"];
const realScenarios = [];
for (const n of metaNames) {
  realScenarios.push(JSON.parse(await readFile(`${GOLDEN_MOBILE}/metadata/${n}`, "utf8")));
}

// Control: REAL unmutated data must PASS (proves validator isn't trivially-rejecting).
check("DL-12 control: REAL 4-scenario metadata PASSES", () => {
  const r = validateSelectionMetadata(structuredClone(realScenarios), { allowLiveProofProven: false });
  return { ok: r.ok === true, note: `ok=${r.ok} errors=${r.errors.length}` };
});

// Mutation 1: flip a Detox-required scenario's runner to maestro-only → W-NEG-SEL-CONFLICT
check("DL-12 mutation: GR-04 runner detox→maestro (Detox trigger present) → W-NEG-SEL-CONFLICT fail-closed", () => {
  const sc = structuredClone(realScenarios);
  const gr04 = sc.find((s) => s.scenario_id === "GR-04-deterministic-state-reset");
  gr04.runner = "maestro"; // Detox triggers still present → conflict
  gr04.artifact_expectations = ["maestro-runner.log", "screenshot"]; // keep maestro-consistent so only the conflict fires
  const r = validateSelectionMetadata(sc, { allowLiveProofProven: false });
  const fired = r.errors.filter((e) => e.rule === "W-NEG-SEL-CONFLICT");
  return { ok: !r.ok && fired.length > 0, note: `rejected=${!r.ok} selConflictFired=${fired.length} detail=${fired[0]?.detail ?? ""}` };
});

// Mutation 2: blank a required field → W-NEG-MISSING-METADATA
check("DL-12 mutation: GR-01 runner_selection_rationale blanked → W-NEG-MISSING-METADATA fail-closed", () => {
  const sc = structuredClone(realScenarios);
  sc.find((s) => s.scenario_id === "GR-01-app-launch-smoke").runner_selection_rationale = "";
  const r = validateSelectionMetadata(sc, { allowLiveProofProven: false });
  const fired = r.errors.filter((e) => e.rule === "W-NEG-MISSING-METADATA");
  return { ok: !r.ok && fired.length > 0, note: `rejected=${!r.ok} missingFired=${fired.length}` };
});

// Mutation 3: fake live proof on a real scenario → W-NEG-FAKE-LIVE
check("DL-12 mutation: GR-02 live_proof_status=proven_by → W-NEG-FAKE-LIVE fail-closed", () => {
  const sc = structuredClone(realScenarios);
  sc.find((s) => s.scenario_id === "GR-02-navigate-read-list").live_proof_status = "proven_by simulated-screenshot.png";
  const r = validateSelectionMetadata(sc, { allowLiveProofProven: false });
  const fired = r.errors.filter((e) => e.rule === "W-NEG-FAKE-LIVE");
  return { ok: !r.ok && fired.length > 0, note: `rejected=${!r.ok} fakeLiveFired=${fired.length}` };
});

// Mutation 4: Maestro-only policy (strip all detox/both) → W-NEG-MAESTRO-ONLY-POLICY
check("DL-12 mutation: collection all-maestro (no Detox coverage) → W-NEG-MAESTRO-ONLY-POLICY fail-closed", () => {
  const sc = structuredClone(realScenarios).filter((s) => s.runner !== "detox" && s.runner !== "both");
  for (const s of sc) { s.runner = "maestro"; s.detox_required_triggers = []; s.coverage_intent = "black_box_user_flow"; }
  const r = validateSelectionMetadata(sc, { allowLiveProofProven: false });
  const fired = r.errors.filter((e) => e.rule === "W-NEG-MAESTRO-ONLY-POLICY");
  return { ok: !r.ok && fired.length > 0, note: `rejected=${!r.ok} policyFired=${fired.length}` };
});

// ---------- DL-13 ui-capture validator on REAL matrix/checks/baselines ----------
const realMatrix = JSON.parse(await readFile(`${E2E_UI_MOBILE}/capture-matrix.json`, "utf8"));
const realChecksDir = `${E2E_UI_MOBILE}/checks`;
const realChecks = {
  "visual-diff": JSON.parse(await readFile(`${realChecksDir}/visual-diff.json`, "utf8")),
  accessibility: JSON.parse(await readFile(`${realChecksDir}/accessibility.json`, "utf8")),
  "layout-geometry": JSON.parse(await readFile(`${realChecksDir}/layout-geometry.json`, "utf8")),
  "interaction-state": JSON.parse(await readFile(`${realChecksDir}/interaction-state.json`, "utf8"))
};
const realBaselines = {
  governance: JSON.parse(await readFile(`${E2E_UI_MOBILE}/baselines/governance.json`, "utf8"))
};

// Control: REAL unmutated data must PASS.
check("DL-13 control: REAL matrix+checks+baselines PASSES", () => {
  const r = validateUiCapture(structuredClone(realMatrix), structuredClone(realChecks), structuredClone(realBaselines), { liveDeviceCaptureAvailable: false });
  return { ok: r.ok === true, note: `ok=${r.ok} errors=${r.errors.length}` };
});

// Mutation 5: delete a required artifact kind from a real row → W-NEG-MISSING-ARTIFACT
check("DL-13 mutation: real row 'iphone-default' missing visual_diff → W-NEG-MISSING-ARTIFACT fail-closed", () => {
  const m = structuredClone(realMatrix);
  const row = m.rows.find((r) => r.row_id === "iphone-default");
  delete row.expected_artifacts.visual_diff;
  const r = validateUiCapture(m, structuredClone(realChecks), structuredClone(realBaselines), { liveDeviceCaptureAvailable: false });
  const fired = r.errors.filter((e) => e.rule === "W-NEG-MISSING-ARTIFACT");
  return { ok: !r.ok && fired.length > 0, note: `rejected=${!r.ok} missingArtFired=${fired.length}` };
});

// Mutation 6: enable silent auto-accept in real governance → W-NEG-SILENT-BASELINE
check("DL-13 mutation: real governance auto_accept_allowed=true → W-NEG-SILENT-BASELINE fail-closed", () => {
  const b = structuredClone(realBaselines);
  b.governance.forbidden_auto_accept.auto_accept_allowed = true;
  const r = validateUiCapture(structuredClone(realMatrix), structuredClone(realChecks), b, { liveDeviceCaptureAvailable: false });
  const fired = r.errors.filter((e) => e.rule === "W-NEG-SILENT-BASELINE");
  return { ok: !r.ok && fired.length > 0, note: `rejected=${!r.ok} silentBaselineFired=${fired.length}` };
});

// Mutation 7: closure_basis e2e_pass → W-NEG-E2E-AS-UI
check("DL-13 mutation: real matrix closure_basis=e2e_pass → W-NEG-E2E-AS-UI fail-closed", () => {
  const m = structuredClone(realMatrix);
  m.closure_basis = "e2e_pass";
  const r = validateUiCapture(m, structuredClone(realChecks), structuredClone(realBaselines), { liveDeviceCaptureAvailable: false });
  const fired = r.errors.filter((e) => e.rule === "W-NEG-E2E-AS-UI");
  return { ok: !r.ok && fired.length > 0, note: `rejected=${!r.ok} e2eAsUiFired=${fired.length}` };
});

// Mutation 8: a real row claims live capture → W-NEG-FAKE-LIVE
check("DL-13 mutation: real row capture_status=captured-green → W-NEG-FAKE-LIVE fail-closed", () => {
  const m = structuredClone(realMatrix);
  m.rows.find((r) => r.row_id === "pixel-error").capture_status = "captured-green";
  const r = validateUiCapture(m, structuredClone(realChecks), structuredClone(realBaselines), { liveDeviceCaptureAvailable: false });
  const fired = r.errors.filter((e) => e.rule === "W-NEG-FAKE-LIVE");
  return { ok: !r.ok && fired.length > 0, note: `rejected=${!r.ok} fakeLiveFired=${fired.length}` };
});

// Mutation 9: advisory check mis-classified as hard_block on real checks → W-NEG-ADVISORY-HARD-BLOCK
check("DL-13 mutation: add advisory+hard_block check on real set → W-NEG-ADVISORY-HARD-BLOCK fail-closed", () => {
  const c = structuredClone(realChecks);
  c["llm-subjective"] = { classification: "advisory", hard_block: true };
  const r = validateUiCapture(structuredClone(realMatrix), c, structuredClone(realBaselines), { liveDeviceCaptureAvailable: false });
  const fired = r.errors.filter((e) => e.rule === "W-NEG-ADVISORY-HARD-BLOCK");
  return { ok: !r.ok && fired.length > 0, note: `rejected=${!r.ok} advisoryHardFired=${fired.length}` };
});

const failed = results.filter((r) => !r.ok);
const summary = {
  ok: failed.length === 0,
  totalChecks: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results
};
console.log(`\n=== ADVERSARIAL PROBE: ${summary.ok ? "ALL GATES LOAD-BEARING" : "VACUITY/WEAKNESS FOUND"} (${summary.passed}/${summary.totalChecks}) ===`);
console.log(JSON.stringify(summary, null, 2));

const { writeFile, mkdir } = await import("node:fs/promises");
await mkdir("/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-17B-mobile-e2e-ui-verification/revalidation-evidence", { recursive: true });
await writeFile("/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-17B-mobile-e2e-ui-verification/revalidation-evidence/adversarial-probe-result.json", JSON.stringify(summary, null, 2), "utf8");

if (!summary.ok) process.exit(1);
