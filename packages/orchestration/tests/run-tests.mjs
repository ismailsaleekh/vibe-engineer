import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSchema, validateArtifactFile } from '@vibe-engineer/artifacts';
import {
  DEFAULT_ORCHESTRATION_LIMITS,
  OrchestrationContractError,
  assertNoLiveProviderSpawningCapability,
  createInitialRunState,
  inspectResumeState,
  joinValidatedOutputs,
  parseWorkPlan,
  persistScheduleDecision,
  readWorkPlanFile,
  selectReadyNodes,
  transitionNode,
} from '@vibe-engineer/orchestration';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '../..');
process.chdir(packageRoot);

const evidenceRoot = path.resolve(repoRoot, '.vibe/work/I-03-orchestration-runtime/evidence/tests');
fs.rmSync(evidenceRoot, { recursive: true, force: true });
fs.mkdirSync(evidenceRoot, { recursive: true });

function loadValidPlanObject() {
  return JSON.parse(fs.readFileSync('fixtures/work-plans/valid-acyclic.json', 'utf8'));
}

function expectContractError(fn, code) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof OrchestrationContractError, `expected OrchestrationContractError for ${code}`);
    assert.ok(error.issues.some((issue) => issue.code === code), `expected issue code ${code}, got ${JSON.stringify(error.issues)}`);
    return error;
  }
  throw new Error(`Expected ${code} failure`);
}

function writePlanFixture(name, plan) {
  const planPath = path.join(evidenceRoot, `${name}.json`);
  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  return planPath;
}

function statePath(name) {
  return path.join(evidenceRoot, `${name}.state.json`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const publicArtifact = validateArtifactFile('fixtures/artifacts/valid/evidence_packet.json', { kind: 'evidence_packet' });
assert.equal(publicArtifact.ok, true, 'public @vibe-engineer/artifacts validates canonical fixture');
const invalidPublicArtifact = validateArtifactFile('fixtures/artifacts/invalid/evidence_packet-missing-schemaVersion.json', { kind: 'evidence_packet' });
assert.equal(invalidPublicArtifact.ok, false, 'public @vibe-engineer/artifacts rejects invalid fixture');

const validPlan = readWorkPlanFile('fixtures/work-plans/valid-acyclic.json');
assert.equal(validPlan.limits.maxParallelAgents, DEFAULT_ORCHESTRATION_LIMITS.maxParallelAgents);
assert.deepEqual(validPlan.nodes.map((node) => node.id), ['produce-artifact', 'join-artifact', 'ship-state']);

const initial = createInitialRunState({ workPlanPath: 'fixtures/work-plans/valid-acyclic.json', statePath: statePath('positive'), now: '2026-06-24T00:00:00.000Z' });
assert.equal(initial.nodes[0].status, 'pending');
assert.ok(fs.existsSync(statePath('positive')), 'durable state is written before scheduling');
const decision1 = selectReadyNodes(validPlan, initial);
assert.deepEqual(decision1.scheduledNodeIds, ['produce-artifact']);
assert.equal(decision1.maxParallelAgents, 8);
persistScheduleDecision({ statePath: statePath('positive'), plan: validPlan, decision: decision1, now: '2026-06-24T00:00:01.000Z' });
transitionNode({ statePath: statePath('positive'), nodeId: 'produce-artifact', status: 'validated', now: '2026-06-24T00:00:02.000Z' });
const afterProduce = inspectResumeState({ statePath: statePath('positive'), plan: validPlan, now: '2026-06-24T00:00:03.000Z' });
assert.ok(afterProduce.resume.completedNodeIds.includes('produce-artifact'));
assert.ok(!afterProduce.resume.retryNodeIds.includes('produce-artifact'));
const decision2 = selectReadyNodes(validPlan, transitionNode({ statePath: statePath('positive'), nodeId: 'produce-artifact', status: 'validated', now: '2026-06-24T00:00:04.000Z' }));
assert.deepEqual(decision2.scheduledNodeIds, ['join-artifact']);
const join = joinValidatedOutputs({ statePath: statePath('positive'), plan: validPlan, consumerNodeId: 'join-artifact', now: '2026-06-24T00:00:05.000Z' });
assert.deepEqual(join.joinedArtifactIds, ['artifact-evidence_packet-001']);
assert.equal(join.joinRecords[0].schemaVersion, '1.0.0');
transitionNode({ statePath: statePath('positive'), nodeId: 'join-artifact', status: 'blocked', statusReason: 'typed carrier for DL-10 route', now: '2026-06-24T00:00:06.000Z' });
const blockedState = JSON.parse(fs.readFileSync(statePath('positive'), 'utf8'));
assert.equal(blockedState.failureRoutes.length, 1, 'failure-routing hook/status carrier is persisted');
assert.equal(blockedState.failureRoutes[0].owner, 'DL-10');

const cyclePlan = loadValidPlanObject();
cyclePlan.nodes[0].dependsOn = ['ship-state'];
expectContractError(() => parseWorkPlan(cyclePlan), 'DAG_CYCLE');

const missingDependencyPlan = loadValidPlanObject();
missingDependencyPlan.nodes[1].dependsOn = ['missing-node'];
expectContractError(() => parseWorkPlan(missingDependencyPlan), 'MISSING_DEPENDENCY');

const conflictPlan = loadValidPlanObject();
conflictPlan.nodes[1].ownershipClaims[0].path = conflictPlan.nodes[0].ownershipClaims[0].path;
expectContractError(() => parseWorkPlan(conflictPlan), 'WRITE_OWNERSHIP_CONFLICT');

const readOnlyClaimPlan = loadValidPlanObject();
readOnlyClaimPlan.nodes[0].ownershipClaims[0].path = 'packages/artifacts/schemas/forbidden.schema.json';
expectContractError(() => parseWorkPlan(readOnlyClaimPlan), 'READONLY_WRITE_CLAIM');

const untouchableClaimPlan = loadValidPlanObject();
untouchableClaimPlan.nodes[0].ownershipClaims[0].path = '.git/config';
expectContractError(() => parseWorkPlan(untouchableClaimPlan), 'UNTOUCHABLE_WRITE_CLAIM');

const oversizedPlan = loadValidPlanObject();
oversizedPlan.nodes[0].estimate.agenticHours = 7;
oversizedPlan.nodes[0].estimate.split = false;
expectContractError(() => parseWorkPlan(oversizedPlan), 'WORK_PACKAGE_TOO_LARGE');

const blockedPlanPath = writePlanFixture('blocked-prerequisite', loadValidPlanObject());
const blockedRuntime = createInitialRunState({ workPlanPath: blockedPlanPath, statePath: statePath('blocked-prerequisite'), now: '2026-06-24T00:01:00.000Z' });
transitionNode({ statePath: statePath('blocked-prerequisite'), nodeId: 'produce-artifact', status: 'pending-live', now: '2026-06-24T00:01:01.000Z' });
const blockedDecision = selectReadyNodes(parseWorkPlan(loadValidPlanObject()), { ...blockedRuntime, nodes: JSON.parse(fs.readFileSync(statePath('blocked-prerequisite'), 'utf8')).nodes });
assert.ok(blockedDecision.blockedNodeIds.includes('join-artifact'));

const activePlan = loadValidPlanObject();
activePlan.nodes = Array.from({ length: 9 }, (_, index) => ({
  ...clone(activePlan.nodes[0]),
  id: `active-${index}`,
  title: `Active ${index}`,
  ownershipClaims: [{ path: `packages/orchestration/fixtures/runtime-output/active-${index}`, access: 'write', ownerNodeId: `active-${index}` }],
  expectedOutputs: [],
}));
const parsedActivePlan = parseWorkPlan(activePlan);
const activeState = {
  schemaVersion: 'orchestration-runtime-state/1.0.0',
  runId: 'active-cap',
  workPlanPath: 'active.json',
  limits: parsedActivePlan.limits,
  nodes: parsedActivePlan.nodes.map((node) => ({ id: node.id, status: 'active', attempts: 1, validationFixIterations: 0, failureRouting: node.failureRouting, evidenceRefs: [], outputRefs: [] })),
  activeClaims: [],
  joinRecords: [],
  failureRoutes: [],
  resume: { cursorNodeIds: [], completedNodeIds: [], retryNodeIds: [], blockedNodeIds: [], inspectedAt: '2026-06-24T00:00:00.000Z', reasons: [] },
  checkpoints: [],
  updatedAt: '2026-06-24T00:00:00.000Z',
};
expectContractError(() => selectReadyNodes(parsedActivePlan, activeState), 'ACTIVE_COUNT_EXCEEDS_CAP');

const iterationPath = writePlanFixture('iteration-cap', loadValidPlanObject());
createInitialRunState({ workPlanPath: iterationPath, statePath: statePath('iteration-cap'), now: '2026-06-24T00:02:00.000Z' });
expectContractError(() => transitionNode({ statePath: statePath('iteration-cap'), nodeId: 'produce-artifact', status: 'failed', validationFixIterations: 4 }), 'VALIDATION_FIX_CAP_EXCEEDED');

const missingArtifactPlan = loadValidPlanObject();
missingArtifactPlan.nodes[0].expectedOutputs[0].path = 'fixtures/artifacts/valid/missing.json';
const missingArtifactPlanPath = writePlanFixture('missing-artifact', missingArtifactPlan);
const parsedMissingArtifactPlan = readWorkPlanFile(missingArtifactPlanPath);
createInitialRunState({ workPlanPath: missingArtifactPlanPath, statePath: statePath('missing-artifact'), now: '2026-06-24T00:03:00.000Z' });
transitionNode({ statePath: statePath('missing-artifact'), nodeId: 'produce-artifact', status: 'validated', outputRefs: parsedMissingArtifactPlan.nodes[0].expectedOutputs });
expectContractError(() => joinValidatedOutputs({ statePath: statePath('missing-artifact'), plan: parsedMissingArtifactPlan, consumerNodeId: 'join-artifact' }), 'MISSING_DEPENDENCY_ARTIFACT');

const invalidArtifactPlan = loadValidPlanObject();
invalidArtifactPlan.nodes[0].expectedOutputs[0].path = 'fixtures/artifacts/invalid/evidence_packet-missing-schemaVersion.json';
const invalidArtifactPlanPath = writePlanFixture('invalid-artifact', invalidArtifactPlan);
const parsedInvalidArtifactPlan = readWorkPlanFile(invalidArtifactPlanPath);
createInitialRunState({ workPlanPath: invalidArtifactPlanPath, statePath: statePath('invalid-artifact'), now: '2026-06-24T00:04:00.000Z' });
transitionNode({ statePath: statePath('invalid-artifact'), nodeId: 'produce-artifact', status: 'validated', outputRefs: parsedInvalidArtifactPlan.nodes[0].expectedOutputs });
expectContractError(() => joinValidatedOutputs({ statePath: statePath('invalid-artifact'), plan: parsedInvalidArtifactPlan, consumerNodeId: 'join-artifact' }), 'INVALID_CANONICAL_ARTIFACT');

const dirtyPlan = loadValidPlanObject();
dirtyPlan.nodes[0].expectedOutputs[0].dirtyState = 'dirty-unowned';
const dirtyPlanPath = writePlanFixture('dirty-output', dirtyPlan);
const parsedDirtyPlan = readWorkPlanFile(dirtyPlanPath);
createInitialRunState({ workPlanPath: dirtyPlanPath, statePath: statePath('dirty-output'), now: '2026-06-24T00:05:00.000Z' });
transitionNode({ statePath: statePath('dirty-output'), nodeId: 'produce-artifact', status: 'validated', outputRefs: parsedDirtyPlan.nodes[0].expectedOutputs });
expectContractError(() => joinValidatedOutputs({ statePath: statePath('dirty-output'), plan: parsedDirtyPlan, consumerNodeId: 'join-artifact' }), 'STALE_OR_UNOWNED_DIRTY_ARTIFACT');
const dirtyResume = inspectResumeState({ statePath: statePath('dirty-output'), plan: parsedDirtyPlan });
assert.ok(dirtyResume.resume.retryNodeIds.includes('produce-artifact'), 'dirty unowned artifact invalidates completed node for retry');

const conflictOutputPlan = loadValidPlanObject();
const duplicateProducer = clone(conflictOutputPlan.nodes[0]);
duplicateProducer.id = 'produce-artifact-duplicate';
duplicateProducer.ownershipClaims = [{ path: 'packages/orchestration/fixtures/runtime-output/produce-artifact-duplicate', access: 'write', ownerNodeId: 'produce-artifact-duplicate' }];
duplicateProducer.expectedOutputs[0].ownerNodeId = 'produce-artifact-duplicate';
conflictOutputPlan.nodes.splice(1, 0, duplicateProducer);
conflictOutputPlan.nodes[2].dependsOn = ['produce-artifact', 'produce-artifact-duplicate'];
const conflictOutputPlanPath = writePlanFixture('conflicting-outputs', conflictOutputPlan);
const parsedConflictOutputPlan = readWorkPlanFile(conflictOutputPlanPath);
createInitialRunState({ workPlanPath: conflictOutputPlanPath, statePath: statePath('conflicting-outputs'), now: '2026-06-24T00:06:00.000Z' });
transitionNode({ statePath: statePath('conflicting-outputs'), nodeId: 'produce-artifact', status: 'validated', outputRefs: parsedConflictOutputPlan.nodes[0].expectedOutputs });
transitionNode({ statePath: statePath('conflicting-outputs'), nodeId: 'produce-artifact-duplicate', status: 'validated', outputRefs: parsedConflictOutputPlan.nodes[1].expectedOutputs });
expectContractError(() => joinValidatedOutputs({ statePath: statePath('conflicting-outputs'), plan: parsedConflictOutputPlan, consumerNodeId: 'join-artifact' }), 'CONFLICTING_OUTPUTS');

const skillManifestSchemaText = JSON.stringify(loadSchema('skill_manifest'));
for (const skill of ['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship']) {
  assert.ok(skillManifestSchemaText.includes(`"${skill}"`), `skill ${skill} remains in canonical public artifact schema`);
}
for (const kind of ['work_brief', 'implementation_plan', 'build_result', 'ship_packet']) {
  assert.equal(validateArtifactFile(`../artifacts/fixtures/valid/${kind}.json`, { kind }).ok, true, `artifact flow kind ${kind} remains canonical through public validator`);
}
assert.equal(fs.existsSync(path.resolve(repoRoot, 'packages/core')), false, 'packages/core is not introduced');
assert.equal(assertNoLiveProviderSpawningCapability(), true, 'runtime exposes no live provider spawn capability');

fs.writeFileSync(path.join(evidenceRoot, 'unit-witness-summary.json'), `${JSON.stringify({ ok: true, witnesses: 'positive-negative-regression', publicArtifactImport: true }, null, 2)}\n`, 'utf8');
console.log('orchestration unit/negative/regression witnesses passed');
