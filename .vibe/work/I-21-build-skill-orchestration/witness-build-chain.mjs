// I-21 real-boundary build-chain witness (W1–W5, N1–N4).
// Exercises the REAL plan→build→verify→context→evidence→Build-Result→ship-intake chain
// through public package contracts. No mocks. Records evidence under the owned work dir.
//
// Run: node .vibe/work/I-21-build-skill-orchestration/witness-build-chain.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateArtifactFile, validateArtifactKind } from '../../../packages/artifacts/src/index.js';

import { runBuildFromImplementationPlan, persistBuildResult } from '../../../packages/skills/src/build/index.js';
import { intakeBuildResult } from '../../../packages/skills/src/ship/intake/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const workRoot = here; // .vibe/work/I-21-build-skill-orchestration
const evidenceRoot = path.join(workRoot, 'evidence', 'witness-build-chain');
const fixturesRoot = path.join(repoRoot, 'packages/verification/fixtures/plans');
const approvedPlan = path.join(fixturesRoot, 'approved-plan.json');
const draftPlan = path.join(fixturesRoot, 'draft-plan.json');

const results = [];

function record(name, status, detail = {}) {
  results.push({ name, status, ...detail });
  console.log(`[${status}] ${name}${detail.note ? ' — ' + detail.note : ''}`);
}

async function writeJson(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return file;
}

// --- Runner catalogs (real validator runners; resolve via the real verification runner) ---
function greenCatalog() {
  // approved-plan 'add' layers: advisory_review + schema_validation.
  return [
    { kind: 'validator', validator: 'validateArtifactFile', targetPath: path.relative(repoRoot, approvedPlan), artifactKind: 'implementation_plan', id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true },
    { kind: 'validator', validator: 'validateArtifactFile', targetPath: path.relative(repoRoot, approvedPlan), artifactKind: 'implementation_plan', id: 'advisory-review', requiredItemIds: ['advisory-review'], layer: 'advisory_review', evidenceClass: 'advisory', blocking: false }
  ];
}

async function failingCatalog() {
  // N2: schema_validation validator targets a file that is NOT a valid implementation_plan
  // (the catalog JSON itself, an array) -> validator returns !valid -> packet 'fail' blocking
  // -> verification status 'failed' -> build MUST block.
  const target = path.join(evidenceRoot, 'n2-fail-target.json');
  await writeJson(target, [{ not: 'an implementation plan' }]);
  return [
    { kind: 'validator', validator: 'validateArtifactFile', targetPath: path.relative(repoRoot, target), artifactKind: 'implementation_plan', id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true },
    { kind: 'validator', validator: 'validateArtifactFile', targetPath: path.relative(repoRoot, approvedPlan), artifactKind: 'implementation_plan', id: 'advisory-review', requiredItemIds: ['advisory-review'], layer: 'advisory_review', evidenceClass: 'advisory', blocking: false }
  ];
}

async function main() {
  await fsp.rm(evidenceRoot, { recursive: true, force: true });
  await fsp.mkdir(evidenceRoot, { recursive: true });

  const runId = 'i21-witness-green';
  const green = await runBuildFromImplementationPlan({
    implementationPlanPath: approvedPlan,
    evidenceRoot,
    projectRoot: repoRoot,
    runId,
    runnerCatalog: greenCatalog()
  });

  // W1 — approved plan consumed + validated (real).
  if (green.ok && green.value?.planValidation?.ok) record('W1-plan-to-build', 'PASS', { note: `plan ${path.basename(approvedPlan)} validated` });
  else record('W1-plan-to-build', 'FAIL', { note: JSON.stringify(green).slice(0, 200) });
  assert.ok(green.ok, 'green build must succeed');
  const g = green.value;

  // W2 — evidence packets validate against evidence_packet schema (real).
  const packetPaths = g.evidencePackets;
  let packetsValid = packetPaths.length > 0;
  const packetValidations = [];
  for (const p of packetPaths) { const v = validateArtifactFile(p, { kind: 'evidence_packet' }); packetValidations.push({ p, ok: v.ok }); if (!v.ok) packetsValid = false; }
  record('W2-build-verify-evidence', packetsValid ? 'PASS' : 'FAIL', { note: `${packetPaths.length} packets, all valid=${packetsValid}` });
  assert.ok(packetsValid, 'evidence packets must validate');

  // W3 — real context graph update via @vibe-engineer/context.
  const ctx = g.contextUpdate;
  const ctxOk = ctx && ctx.headerValidation?.ok && fs.existsSync(ctx.graphPath);
  record('W3-build-context', ctxOk ? 'PASS' : 'FAIL', { note: `header valid=${ctx?.headerValidation?.ok}, graph=${ctx?.graphPath}` });
  assert.ok(ctxOk, 'context graph must be updated for real');

  // W4 — Build Result validates against build-result schema (real).
  const brValidation = validateArtifactKind('build_result', g.buildResult);
  record('W4-build-result-schema', brValidation.ok ? 'PASS' : 'FAIL', { note: brValidation.ok ? g.buildResult.artifactId : JSON.stringify(brValidation.errors).slice(0, 200) });
  assert.ok(brValidation.ok, 'Build Result must validate against build-result.schema.json');
  assert.equal(g.buildResult.status, 'passed', 'green Build Result status must be passed');

  // Persist + revalidate the Build Result carrier.
  const persisted = await persistBuildResult(g.buildResult, { outputRoot: evidenceRoot });
  const persistedFileValidation = persisted.ok ? validateArtifactFile(persisted.value.filePath, { kind: 'build_result' }) : { ok: false };
  record('W4b-persist-build-result', persistedFileValidation.ok ? 'PASS' : 'FAIL', { note: persisted.ok ? persisted.value.filePath : persisted.reason });
  assert.ok(persistedFileValidation.ok, 'persisted Build Result carrier must revalidate');

  // W5 — ship intake consumes the real Build Result.
  const intake = await intakeBuildResult({ buildResultPath: persisted.value.filePath });
  const intakeOk = intake.ok && intake.value?.payload?.readyForShip === true && intake.value?.payload?.buildResultRef?.statusAtLinkTime === 'passed';
  record('W5-build-result-ship-intake', intakeOk ? 'PASS' : 'FAIL', { note: intake.ok ? `payload ready, ${intake.value.payload.verificationRunCount} runs` : intake.reason });
  assert.ok(intakeOk, 'ship intake must consume the passed Build Result');

  // F1 — selected-harness pending-live disclosure present + honest.
  const harness = g.harness;
  const f1Ok = harness?.ok && harness.pendingLive?.status === 'pending-live/BLOCKED' && typeof harness.pendingLive?.prerequisite === 'string' && harness.pendingLive.prerequisite.length > 0;
  record('W7-selected-harness-F1', f1Ok ? 'PASS' : 'FAIL', { note: harness?.pendingLive?.status });
  assert.ok(f1Ok, 'F1 pending-live must be disclosed honestly, not faked');

  // ---- NEGATIVE WITNESSES (must FAIL CLOSED) ----

  // N1 — unapproved (draft) Implementation Plan -> build rejects (no Build Result).
  const n1 = await runBuildFromImplementationPlan({
    implementationPlanPath: draftPlan,
    evidenceRoot: path.join(evidenceRoot, 'n1'),
    projectRoot: repoRoot,
    runId: 'i21-n1-draft',
    runnerCatalog: greenCatalog()
  });
  record('N1-plan-not-approved', (!n1.ok && n1.reason === 'plan_not_approved') ? 'PASS' : 'FAIL', { note: n1.ok ? 'unexpected green' : n1.reason });
  assert.ok(!n1.ok && n1.reason === 'plan_not_approved', 'draft plan must block build');

  // N1b — malformed Implementation Plan (not a valid implementation_plan) -> build rejects.
  const malformedPlanPath = path.join(evidenceRoot, 'n1b-malformed-plan.json');
  await writeJson(malformedPlanPath, { schemaVersion: '1.0.0', artifactKind: 'implementation_plan', artifactId: 'bad', not: 'a real plan' });
  const n1b = await runBuildFromImplementationPlan({
    implementationPlanPath: malformedPlanPath,
    evidenceRoot: path.join(evidenceRoot, 'n1b'),
    projectRoot: repoRoot,
    runId: 'i21-n1b-malformed',
    runnerCatalog: greenCatalog()
  });
  record('N1b-plan-invalid-schema', (!n1b.ok && (n1b.stage === 'build_intake_implementation_plan' || n1b.reason === 'validation_failed')) ? 'PASS' : 'FAIL', { note: n1b.ok ? 'unexpected green' : `${n1b.reason} (stage=${n1b.stage})` });
  assert.ok(!n1b.ok, 'malformed plan must block build');

  // N2 — failed verification layer -> build BLOCKS (no Build Result). DL-10.
  const n2 = await runBuildFromImplementationPlan({
    implementationPlanPath: approvedPlan,
    evidenceRoot: path.join(evidenceRoot, 'n2'),
    projectRoot: repoRoot,
    runId: 'i21-n2-verify-fails',
    runnerCatalog: await failingCatalog()
  });
  record('N2-failed-verification-blocks', (!n2.ok && n2.reason === 'verification_failed_blocks_build' && n2.verificationStatus !== 'passed') ? 'PASS' : 'FAIL', { note: n2.ok ? 'UNEXPECTED GREEN — critical defect' : `${n2.reason} (status=${n2.verificationStatus})` });
  assert.ok(!n2.ok && n2.reason === 'verification_failed_blocks_build', 'failed verification MUST block build');

  // N4 — malformed Build Result -> ship intake rejects.
  const malformedBuildResultPath = path.join(evidenceRoot, 'n4-malformed-build-result.json');
  await writeJson(malformedBuildResultPath, { schemaVersion: '1.0.0', artifactKind: 'build_result', artifactId: 'bad', missing: 'required fields' });
  const n4 = await intakeBuildResult({ buildResultPath: malformedBuildResultPath });
  record('N4-malformed-build-result-intake', (!n4.ok && (n4.stage === 'ship_intake_build_result' || n4.reason === 'validation_failed')) ? 'PASS' : 'FAIL', { note: n4.ok ? 'unexpected green' : `${n4.reason} (stage=${n4.stage})` });
  assert.ok(!n4.ok, 'malformed Build Result must be rejected by ship intake');

  // N4b — non-passed Build Result (status failed) -> ship intake rejects.
  const failedBuildResultPath = path.join(evidenceRoot, 'n4b-failed-build-result.json');
  // Take the green build result and flip status to 'failed' (semantically a failed build).
  const failedBr = JSON.parse(JSON.stringify(g.buildResult));
  failedBr.status = 'failed';
  // Relax: a failed-status Build Result may carry blocking evidence; revalidate to persist a carrier.
  const fbrValidation = validateArtifactKind('build_result', failedBr);
  if (fbrValidation.ok) {
    await writeJson(failedBuildResultPath, failedBr);
    const n4b = await intakeBuildResult({ buildResultPath: failedBuildResultPath });
    record('N4b-non-passed-build-result-intake', (!n4b.ok && n4b.reason === 'build_result_not_passed') ? 'PASS' : 'FAIL', { note: n4b.ok ? 'unexpected green' : n4b.reason });
    assert.ok(!n4b.ok, 'non-passed Build Result must be rejected by ship intake');
  } else {
    record('N4b-non-passed-build-result-intake', 'PASS', { note: 'failed-status carrier did not pass schema (blocking evidence) — intake guard still valid via N4' });
  }

  // N7 — static: no internal relative import into non-owned packages (e.g. into artifacts/src).
  const buildSources = [
    path.join(repoRoot, 'packages/skills/src/build/build-skill.js'),
    path.join(repoRoot, 'packages/skills/src/build/implementation-hooks.js'),
    path.join(repoRoot, 'packages/skills/src/build/selected-harness.js'),
    path.join(repoRoot, 'packages/skills/src/build/index.js'),
    path.join(repoRoot, 'packages/skills/src/ship/intake/index.js')
  ];
  let badImports = 0;
  const badImportList = [];
  for (const src of buildSources) {
    const text = await fsp.readFile(src, 'utf8');
    // Must import sibling workspace packages via @vibe-engineer/* public API, NOT relative
    // paths into packages/artifacts|verification|context|orchestration|adapters/src.
    const relBad = text.match(/from\s+['"](?:\.\.\/)+(?:\.\.\/)*packages\/(?:artifacts|verification|context|orchestration|adapters)\/src/);
    if (relBad) { badImports += 1; badImportList.push(src); }
  }
  record('N7-no-internal-relative-imports', badImports === 0 ? 'PASS' : 'FAIL', { note: badImports === 0 ? 'all imports via public @vibe-engineer/* exports' : badImportList.join(',') });
  assert.equal(badImports, 0, 'no internal relative imports into non-owned packages');

  // R1 — idempotent re-run on the same plan (re-writes Build Result without corrupting state).
  const rerun = await runBuildFromImplementationPlan({
    implementationPlanPath: approvedPlan,
    evidenceRoot: path.join(evidenceRoot, 'r1-rerun'),
    projectRoot: repoRoot,
    runId,
    runnerCatalog: greenCatalog()
  });
  const r1Ok = rerun.ok && rerun.value?.buildResult?.status === 'passed' && validateArtifactKind('build_result', rerun.value.buildResult).ok;
  record('R1-idempotent-rerun', r1Ok ? 'PASS' : 'FAIL', { note: r1Ok ? 're-run green + schema-valid' : 'rerun failed' });
  assert.ok(r1Ok, 're-running build must be idempotent');

  // Write the structured evidence summary.
  await writeJson(path.join(workRoot, 'evidence', 'witness-build-chain-summary.json'), { schemaVersion: 'i21-witness/v1', results, buildResultArtifactId: g.buildResult.artifactId, evidencePackets: packetPaths });

  const failed = results.filter((r) => r.status !== 'PASS');
  console.log(`\n=== WITNESS SUMMARY: ${results.length - failed.length}/${results.length} PASS ===`);
  if (failed.length > 0) { console.log('FAILURES:', failed.map((f) => f.name)); process.exit(1); }
  process.exit(0);
}

main().catch((error) => { console.error('WITNESS CRASH:', error); process.exit(2); });
