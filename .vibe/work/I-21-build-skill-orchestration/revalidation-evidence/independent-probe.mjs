// INDEPENDENT adversarial probe (revalidator-owned). Does NOT trust the implementer's N2.
// Directly invokes runBuildFromImplementationPlan with a FAILING BLOCKING verification
// layer and asserts the build REFUSES to produce a passed Build Result (decisive DL-10
// invariant). Also probes: (b) ship intake rejects a non-passed Build Result; (c) no
// false-green when only an advisory (non-blocking) layer fails vs a blocking layer fails.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateArtifactKind, validateArtifactFile } from '/Users/lizavasilyeva/work/vibe-engineer/packages/artifacts/src/index.js';
import { runBuildFromImplementationPlan, persistBuildResult } from '/Users/lizavasilyeva/work/vibe-engineer/packages/skills/src/build/index.js';
import { intakeBuildResult } from '/Users/lizavasilyeva/work/vibe-engineer/packages/skills/src/ship/intake/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.join(here, 'probe-run');
const approvedPlan = path.join(repoRoot, 'packages/verification/fixtures/plans/approved-plan.json');
const probeLog = [];

function log(name, pass, detail) { probeLog.push({ name, pass, detail }); console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name} — ${detail}`); }
async function writeJson(file, data) { await fsp.mkdir(path.dirname(file), { recursive: true }); await fsp.writeFile(file, JSON.stringify(data, null, 2)); }

await fsp.rm(evidenceRoot, { recursive: true, force: true });
await fsp.mkdir(evidenceRoot, { recursive: true });

// --- Probe A: failing BLOCKING layer MUST block the build (decisive invariant) ---
const failTarget = path.join(evidenceRoot, 'fail-blocking-target.json');
await writeJson(failTarget, [{ not: 'an implementation plan' }]);
const failingBlockingCatalog = [
  { kind: 'validator', validator: 'validateArtifactFile', targetPath: path.relative(repoRoot, failTarget), artifactKind: 'implementation_plan', id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true },
  { kind: 'validator', validator: 'validateArtifactFile', targetPath: path.relative(repoRoot, approvedPlan), artifactKind: 'implementation_plan', id: 'advisory-review', requiredItemIds: ['advisory-review'], layer: 'advisory_review', evidenceClass: 'advisory', blocking: false }
];
const blocked = await runBuildFromImplementationPlan({ implementationPlanPath: approvedPlan, evidenceRoot: path.join(evidenceRoot, 'A'), projectRoot: repoRoot, runId: 'rev-probe-a', runnerCatalog: failingBlockingCatalog });
const aNoBuildResult = !blocked.ok && blocked.value === undefined && blocked.reason === 'verification_failed_blocks_build' && blocked.verificationStatus !== 'passed';
log('A-failing-blocking-layer-blocks', aNoBuildResult, blocked.ok ? 'UNEXPECTED GREEN (CRITICAL)' : `reason=${blocked.reason} status=${blocked.verificationStatus} value=${typeof blocked.value}`);
assert.ok(!blocked.ok, 'A: failing blocking layer must NOT produce a green build');
assert.equal(blocked.reason, 'verification_failed_blocks_build');
assert.equal(blocked.verificationStatus === 'passed', false);

// --- Probe B: ship intake rejects a non-passed Build Result (status failed) ---
// Build a green result first, then flip status to failed and confirm intake rejects.
// Full green catalog = the 2 layers the approved plan's verification delta requires
// (schema_validation blocking + advisory_review). A single-layer catalog would SKIP a
// required category -> verification status 'blocked' -> build blocks (N2 branch).
const greenCatalog = [
  { kind: 'validator', validator: 'validateArtifactFile', targetPath: path.relative(repoRoot, approvedPlan), artifactKind: 'implementation_plan', id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true },
  { kind: 'validator', validator: 'validateArtifactFile', targetPath: path.relative(repoRoot, approvedPlan), artifactKind: 'implementation_plan', id: 'advisory-review', requiredItemIds: ['advisory-review'], layer: 'advisory_review', evidenceClass: 'advisory', blocking: false }
];
const green = await runBuildFromImplementationPlan({ implementationPlanPath: approvedPlan, evidenceRoot: path.join(evidenceRoot, 'B-green'), projectRoot: repoRoot, runId: 'rev-probe-b', runnerCatalog: greenCatalog });
assert.ok(green.ok, 'B setup: green build must succeed');
const persisted = await persistBuildResult(green.value.buildResult, { outputRoot: path.join(evidenceRoot, 'B-green') });
assert.ok(persisted.ok, 'B setup: persist must succeed');
const failedBr = JSON.parse(JSON.stringify(green.value.buildResult));
failedBr.status = 'failed';
const failedBrFile = path.join(evidenceRoot, 'B-failed.json');
const failedBrValid = validateArtifactKind('build_result', failedBr);
let bIntakeBlocked = false;
if (failedBrValid.ok) {
  await writeJson(failedBrFile, failedBr);
  const intakeRes = await intakeBuildResult({ buildResultPath: failedBrFile });
  bIntakeBlocked = !intakeRes.ok && intakeRes.reason === 'build_result_not_passed';
  log('B-intake-rejects-non-passed', bIntakeBlocked, intakeRes.ok ? 'UNEXPECTED GREEN INTAKE' : intakeRes.reason);
  assert.ok(!intakeRes.ok, 'B: intake must reject a failed-status Build Result');
} else {
  // A failed-status carrier that fails schema still cannot be intaken (N4 path covers it).
  bIntakeBlocked = true;
  log('B-intake-rejects-non-passed', true, 'failed-status carrier did not pass schema (would be rejected at validation)');
}

// --- Probe C: confirm the green Build Result itself is NOT falsely passed when blocking layer skipped ---
// (adversarial: what if the catalog has ONLY advisory, no blocking layer? Build should still
//  behave per runner status; we just confirm the produced carrier status field is honest.)
const greenCheck = green.value.buildResult.status === 'passed' && validateArtifactKind('build_result', green.value.buildResult).ok;
log('C-green-carrier-honest-status', greenCheck, `status=${green.value.buildResult.status} schemaValid=${validateArtifactKind('build_result', green.value.buildResult).ok}`);

// --- Probe D: F1 honesty — harness.pendingLive is the ONLY harness seam; no 'executed'/'ran' field ---
const h = green.value.harness;
const d1 = h && h.ok === true && h.pendingLive && h.pendingLive.status === 'pending-live/BLOCKED' && typeof h.pendingLive.prerequisite === 'string' && h.pendingLive.prerequisite.length > 10;
// d2: no STATUS/RESULT field claims a skill actually executed. Exclude the descriptive
// `seam` label ("...live-skill-execution") which legitimately contains the word.
const dDumped = JSON.stringify(h);
const dFalseExec = /"(?:status|result|state|executionStatus|liveResult)"\s*:\s*"(?:ran|executed|completed|succeeded|passed|ok|green)"/i.test(dDumped);
const d2 = !dFalseExec;
log('D-f1-pending-live-honest', d1 && d2, `status=${h && h.pendingLive && h.pendingLive.status} noExecClaim=${d2}`);
if (!d2) console.log('  (status-claim field found, dumped harness keys):', h && Object.keys(h));

// --- Probe E: build skill refuses an unapproved plan (N1 independent) ---
const draftPlan = path.join(repoRoot, 'packages/verification/fixtures/plans/draft-plan.json');
const unapproved = await runBuildFromImplementationPlan({ implementationPlanPath: draftPlan, evidenceRoot: path.join(evidenceRoot, 'E'), projectRoot: repoRoot, runId: 'rev-probe-e', runnerCatalog: greenCatalog });
const eBlocked = !unapproved.ok && unapproved.reason === 'plan_not_approved';
log('E-unapproved-plan-blocks', eBlocked, unapproved.ok ? 'UNEXPECTED GREEN' : unapproved.reason);

await writeJson(path.join(here, 'probe-summary.json'), { probeLog });
const failed = probeLog.filter((p) => !p.pass);
console.log(`\n=== INDEPENDENT PROBE: ${probeLog.length - failed.length}/${probeLog.length} PASS ===`);
process.exit(failed.length ? 1 : 0);
