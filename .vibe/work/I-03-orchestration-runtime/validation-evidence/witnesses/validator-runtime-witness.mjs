import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadSchema, validateArtifactFile } from '@vibe-engineer/artifacts';
import {
  DEFAULT_ORCHESTRATION_LIMITS,
  OrchestrationContractError,
  assertNoLiveProviderSpawningCapability,
  createInitialRunState,
  inspectResumeState,
  joinValidatedOutputs,
  loadRunState,
  parseWorkPlan,
  persistScheduleDecision,
  readWorkPlanFile,
  selectReadyNodes,
  transitionNode,
} from '@vibe-engineer/orchestration';

const packageRoot = process.cwd();
if (!packageRoot.endsWith('packages/orchestration')) {
  throw new Error(`validator witness must run from packages/orchestration; got ${packageRoot}`);
}
const repoRoot = path.resolve(packageRoot, '../..');
const evidenceRoot = path.resolve(repoRoot, '.vibe/work/I-03-orchestration-runtime/validation-evidence/witnesses/runtime-output');
fs.rmSync(evidenceRoot, { recursive: true, force: true });
fs.mkdirSync(evidenceRoot, { recursive: true });

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(name, value) {
  const out = path.join(evidenceRoot, name);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return out;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectContractError(label, fn, code) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof OrchestrationContractError, `${label}: expected OrchestrationContractError`);
    assert.ok(error.issues.some((issue) => issue.code === code), `${label}: expected ${code}, got ${JSON.stringify(error.issues)}`);
    return { label, code, issues: error.issues };
  }
  throw new Error(`${label}: expected ${code}`);
}

function writePlan(name, plan) {
  return writeJson(`plans/${name}.json`, plan);
}

function statePath(name) {
  return path.join(evidenceRoot, 'states', `${name}.json`);
}

const positives = [];
const negatives = [];
const regressions = [];

const validArtifact = validateArtifactFile('fixtures/artifacts/valid/evidence_packet.json', { kind: 'evidence_packet' });
assert.equal(validArtifact.ok, true, 'public artifacts package must validate canonical fixture');
const invalidArtifactPublic = validateArtifactFile('fixtures/artifacts/invalid/evidence_packet-missing-schemaVersion.json', { kind: 'evidence_packet' });
assert.equal(invalidArtifactPublic.ok, false, 'public artifacts package must reject invalid fixture');
positives.push('public @vibe-engineer/artifacts validateArtifactFile accepted valid canonical evidence_packet');
negatives.push('public @vibe-engineer/artifacts validateArtifactFile rejected invalid canonical evidence_packet');

const planObject = readJson('fixtures/work-plans/valid-acyclic.json');
const plan = readWorkPlanFile('fixtures/work-plans/valid-acyclic.json');
assert.equal(plan.limits.maxParallelAgents, DEFAULT_ORCHESTRATION_LIMITS.maxParallelAgents);
assert.equal(plan.limits.maxValidationFixIterations, DEFAULT_ORCHESTRATION_LIMITS.maxValidationFixIterations);
assert.equal(plan.limits.agenticWorkPackageTargetHours, DEFAULT_ORCHESTRATION_LIMITS.agenticWorkPackageTargetHours);
assert.deepEqual(plan.nodes.map((node) => node.id), ['produce-artifact', 'join-artifact', 'ship-state']);
positives.push('valid acyclic work plan accepted with default limits 8/3/6');

const boundaryStatePath = statePath('real-boundary');
const initialState = createInitialRunState({ workPlanPath: 'fixtures/work-plans/valid-acyclic.json', statePath: boundaryStatePath, now: '2026-06-24T02:00:00.000Z' });
assert.ok(fs.existsSync(boundaryStatePath), 'initial durable state must be written before scheduling');
assert.equal(initialState.nodes.every((node) => node.status === 'pending'), true);
assert.equal(initialState.nodes[0].failureRouting.owner, 'DL-10');
const firstDecision = selectReadyNodes(plan, loadRunState(boundaryStatePath));
assert.deepEqual(firstDecision.scheduledNodeIds, ['produce-artifact']);
assert.equal(firstDecision.maxParallelAgents, 8);
assert.ok(firstDecision.blockedNodeIds.includes('join-artifact'));
const afterSchedule = persistScheduleDecision({ statePath: boundaryStatePath, plan, decision: firstDecision, now: '2026-06-24T02:00:01.000Z' });
assert.equal(afterSchedule.activeClaims.length, 1, 'durable state records active ownership claim after scheduling');
assert.equal(afterSchedule.activeClaims[0].ownerNodeId, 'produce-artifact');
const afterProduce = transitionNode({ statePath: boundaryStatePath, nodeId: 'produce-artifact', status: 'validated', now: '2026-06-24T02:00:02.000Z' });
assert.equal(afterProduce.nodes.find((node) => node.id === 'produce-artifact')?.status, 'validated');
const secondDecision = selectReadyNodes(plan, loadRunState(boundaryStatePath));
assert.deepEqual(secondDecision.scheduledNodeIds, ['join-artifact']);
const joinDecision = joinValidatedOutputs({ statePath: boundaryStatePath, plan, consumerNodeId: 'join-artifact', now: '2026-06-24T02:00:03.000Z' });
assert.deepEqual(joinDecision.joinedArtifactIds, ['artifact-evidence_packet-001']);
assert.equal(joinDecision.joinRecords[0].schemaVersion, '1.0.0');
assert.ok(joinDecision.joinRecords[0].schemaId.includes('evidence-packet.schema.json'));
const afterJoinState = loadRunState(boundaryStatePath);
assert.equal(afterJoinState.joinRecords.length, 1, 'join metadata persisted to durable state');
transitionNode({ statePath: boundaryStatePath, nodeId: 'join-artifact', status: 'passed', now: '2026-06-24T02:00:04.000Z' });
const thirdDecision = selectReadyNodes(plan, loadRunState(boundaryStatePath));
assert.deepEqual(thirdDecision.scheduledNodeIds, ['ship-state']);
const afterThirdSchedule = persistScheduleDecision({ statePath: boundaryStatePath, plan, decision: thirdDecision, now: '2026-06-24T02:00:05.000Z' });
assert.deepEqual(afterThirdSchedule.resume.cursorNodeIds, ['ship-state']);
assert.equal(afterThirdSchedule.activeClaims[0].ownerNodeId, 'ship-state');
const resumeInspection = inspectResumeState({ statePath: boundaryStatePath, plan, now: '2026-06-24T02:00:06.000Z' });
assert.ok(resumeInspection.resume.completedNodeIds.includes('produce-artifact'));
assert.ok(resumeInspection.resume.completedNodeIds.includes('join-artifact'));
assert.equal(resumeInspection.resume.retryNodeIds.includes('produce-artifact'), false);
assert.deepEqual(resumeInspection.invalidations, []);
positives.push('actual runtime API consumed on-disk plan and wrote durable state before scheduling and after schedule/transition/join');
positives.push('scheduler emitted dependency-ready non-conflicting nodes and preserved maxParallelAgents 8');
positives.push('join validated canonical upstream artifact through public artifacts package and persisted join metadata');
positives.push('resume read persisted state and did not retry passed/validated nodes with valid clean artifacts');
writeJson('real-boundary-summary.json', { firstDecision, secondDecision, thirdDecision, joinDecision, resumeInspection });

const failureStatePath = statePath('failure-hook-carrier');
createInitialRunState({ workPlanPath: 'fixtures/work-plans/valid-acyclic.json', statePath: failureStatePath, now: '2026-06-24T02:10:00.000Z' });
const failureState = transitionNode({ statePath: failureStatePath, nodeId: 'join-artifact', status: 'blocked', statusReason: 'validator-owned DL-10 hook carrier witness', now: '2026-06-24T02:10:01.000Z' });
assert.equal(failureState.failureRoutes[0].owner, 'DL-10');
assert.equal(failureState.failureRoutes[0].status, 'routing-needed');
assert.equal('taxonomy' in failureState.failureRoutes[0], false);
positives.push('failure-routing hook/status fields carried with DL-10 owner and no local taxonomy field');

const cyclePlan = clone(planObject);
cyclePlan.nodes[0].dependsOn = ['ship-state'];
negatives.push(expectContractError('cycle rejected', () => parseWorkPlan(cyclePlan), 'DAG_CYCLE'));

const missingDependencyPlan = clone(planObject);
missingDependencyPlan.nodes[1].dependsOn = ['missing-node'];
negatives.push(expectContractError('missing dependency rejected', () => parseWorkPlan(missingDependencyPlan), 'MISSING_DEPENDENCY'));

const conflictPlan = clone(planObject);
conflictPlan.nodes[1].ownershipClaims[0].path = conflictPlan.nodes[0].ownershipClaims[0].path;
negatives.push(expectContractError('shared write ownership conflict rejected', () => parseWorkPlan(conflictPlan), 'WRITE_OWNERSHIP_CONFLICT'));

const readOnlyPlan = clone(planObject);
readOnlyPlan.nodes[0].ownershipClaims[0].path = 'packages/artifacts/schemas/forbidden.schema.json';
negatives.push(expectContractError('read-only write claim rejected', () => parseWorkPlan(readOnlyPlan), 'READONLY_WRITE_CLAIM'));

const untouchablePlan = clone(planObject);
untouchablePlan.nodes[0].ownershipClaims[0].path = '.git/config';
negatives.push(expectContractError('untouchable git write claim rejected', () => parseWorkPlan(untouchablePlan), 'UNTOUCHABLE_WRITE_CLAIM'));

const blockedStatePath = statePath('blocked-prerequisite');
createInitialRunState({ workPlanPath: 'fixtures/work-plans/valid-acyclic.json', statePath: blockedStatePath, now: '2026-06-24T02:20:00.000Z' });
transitionNode({ statePath: blockedStatePath, nodeId: 'produce-artifact', status: 'pending-live', now: '2026-06-24T02:20:01.000Z' });
const blockedDecision = selectReadyNodes(plan, loadRunState(blockedStatePath));
assert.ok(blockedDecision.blockedNodeIds.includes('join-artifact'), 'pending-live prerequisite must prevent dependent closure');
negatives.push('pending-live/BLOCKED prerequisite prevented dependent closure');

const activePlan = clone(planObject);
activePlan.nodes = Array.from({ length: 9 }, (_, index) => ({
  ...clone(planObject.nodes[0]),
  id: `active-${index}`,
  dependsOn: [],
  ownershipClaims: [{ path: `packages/orchestration/validation-active-${index}`, access: 'write', ownerNodeId: `active-${index}` }],
  expectedOutputs: [],
}));
const parsedActivePlan = parseWorkPlan(activePlan);
const activeState = {
  schemaVersion: 'orchestration-runtime-state/1.0.0',
  runId: 'active-cap-validation',
  workPlanPath: 'validator-active.json',
  limits: parsedActivePlan.limits,
  nodes: parsedActivePlan.nodes.map((node) => ({ id: node.id, status: 'active', attempts: 1, validationFixIterations: 0, failureRouting: node.failureRouting, evidenceRefs: [], outputRefs: [] })),
  activeClaims: [],
  joinRecords: [],
  failureRoutes: [],
  resume: { cursorNodeIds: [], completedNodeIds: [], retryNodeIds: [], blockedNodeIds: [], inspectedAt: '2026-06-24T02:21:00.000Z', reasons: [] },
  checkpoints: [],
  updatedAt: '2026-06-24T02:21:00.000Z',
};
negatives.push(expectContractError('active count above 8 rejected', () => selectReadyNodes(parsedActivePlan, activeState), 'ACTIVE_COUNT_EXCEEDS_CAP'));

const iterationStatePath = statePath('iteration-cap');
createInitialRunState({ workPlanPath: 'fixtures/work-plans/valid-acyclic.json', statePath: iterationStatePath, now: '2026-06-24T02:22:00.000Z' });
negatives.push(expectContractError('validation/fix iterations above 3 rejected', () => transitionNode({ statePath: iterationStatePath, nodeId: 'produce-artifact', status: 'failed', validationFixIterations: 4 }), 'VALIDATION_FIX_CAP_EXCEEDED'));

const oversizedPlan = clone(planObject);
oversizedPlan.nodes[0].estimate.agenticHours = 7;
oversizedPlan.nodes[0].estimate.split = false;
negatives.push(expectContractError('unsplit work package above 6 hours rejected', () => parseWorkPlan(oversizedPlan), 'WORK_PACKAGE_TOO_LARGE'));

const missingArtifactPlan = clone(planObject);
missingArtifactPlan.nodes[0].expectedOutputs[0].path = 'fixtures/artifacts/valid/missing.json';
const missingArtifactPlanPath = writePlan('missing-artifact', missingArtifactPlan);
const parsedMissingArtifactPlan = readWorkPlanFile(missingArtifactPlanPath);
const missingArtifactStatePath = statePath('missing-artifact');
createInitialRunState({ workPlanPath: missingArtifactPlanPath, statePath: missingArtifactStatePath, now: '2026-06-24T02:23:00.000Z' });
transitionNode({ statePath: missingArtifactStatePath, nodeId: 'produce-artifact', status: 'validated', outputRefs: parsedMissingArtifactPlan.nodes[0].expectedOutputs });
negatives.push(expectContractError('missing dependency artifact rejected', () => joinValidatedOutputs({ statePath: missingArtifactStatePath, plan: parsedMissingArtifactPlan, consumerNodeId: 'join-artifact' }), 'MISSING_DEPENDENCY_ARTIFACT'));

const invalidArtifactPlan = clone(planObject);
invalidArtifactPlan.nodes[0].expectedOutputs[0].path = 'fixtures/artifacts/invalid/evidence_packet-missing-schemaVersion.json';
const invalidArtifactPlanPath = writePlan('invalid-artifact', invalidArtifactPlan);
const parsedInvalidArtifactPlan = readWorkPlanFile(invalidArtifactPlanPath);
const invalidArtifactStatePath = statePath('invalid-artifact');
createInitialRunState({ workPlanPath: invalidArtifactPlanPath, statePath: invalidArtifactStatePath, now: '2026-06-24T02:24:00.000Z' });
transitionNode({ statePath: invalidArtifactStatePath, nodeId: 'produce-artifact', status: 'validated', outputRefs: parsedInvalidArtifactPlan.nodes[0].expectedOutputs });
negatives.push(expectContractError('invalid canonical artifact rejected through public artifacts package', () => joinValidatedOutputs({ statePath: invalidArtifactStatePath, plan: parsedInvalidArtifactPlan, consumerNodeId: 'join-artifact' }), 'INVALID_CANONICAL_ARTIFACT'));

const dirtyPlan = clone(planObject);
dirtyPlan.nodes[0].expectedOutputs[0].dirtyState = 'dirty-unowned';
const dirtyPlanPath = writePlan('dirty-output', dirtyPlan);
const parsedDirtyPlan = readWorkPlanFile(dirtyPlanPath);
const dirtyStatePath = statePath('dirty-output');
createInitialRunState({ workPlanPath: dirtyPlanPath, statePath: dirtyStatePath, now: '2026-06-24T02:25:00.000Z' });
transitionNode({ statePath: dirtyStatePath, nodeId: 'produce-artifact', status: 'validated', outputRefs: parsedDirtyPlan.nodes[0].expectedOutputs });
negatives.push(expectContractError('stale/unowned dirty artifact not reusable as green', () => joinValidatedOutputs({ statePath: dirtyStatePath, plan: parsedDirtyPlan, consumerNodeId: 'join-artifact' }), 'STALE_OR_UNOWNED_DIRTY_ARTIFACT'));
const dirtyResume = inspectResumeState({ statePath: dirtyStatePath, plan: parsedDirtyPlan, now: '2026-06-24T02:25:01.000Z' });
assert.ok(dirtyResume.resume.retryNodeIds.includes('produce-artifact'), 'dirty artifact must invalidate completed node for retry');

const conflictingOutputsPlan = clone(planObject);
const duplicateProducer = clone(conflictingOutputsPlan.nodes[0]);
duplicateProducer.id = 'produce-artifact-duplicate';
duplicateProducer.ownershipClaims = [{ path: 'packages/orchestration/validation-duplicate', access: 'write', ownerNodeId: 'produce-artifact-duplicate' }];
duplicateProducer.expectedOutputs[0].ownerNodeId = 'produce-artifact-duplicate';
conflictingOutputsPlan.nodes.splice(1, 0, duplicateProducer);
conflictingOutputsPlan.nodes[2].dependsOn = ['produce-artifact', 'produce-artifact-duplicate'];
const conflictingOutputsPlanPath = writePlan('conflicting-outputs', conflictingOutputsPlan);
const parsedConflictingOutputsPlan = readWorkPlanFile(conflictingOutputsPlanPath);
const conflictingOutputsStatePath = statePath('conflicting-outputs');
createInitialRunState({ workPlanPath: conflictingOutputsPlanPath, statePath: conflictingOutputsStatePath, now: '2026-06-24T02:26:00.000Z' });
transitionNode({ statePath: conflictingOutputsStatePath, nodeId: 'produce-artifact', status: 'validated', outputRefs: parsedConflictingOutputsPlan.nodes[0].expectedOutputs });
transitionNode({ statePath: conflictingOutputsStatePath, nodeId: 'produce-artifact-duplicate', status: 'validated', outputRefs: parsedConflictingOutputsPlan.nodes[1].expectedOutputs });
negatives.push(expectContractError('conflicting outputs not silently merged', () => joinValidatedOutputs({ statePath: conflictingOutputsStatePath, plan: parsedConflictingOutputsPlan, consumerNodeId: 'join-artifact' }), 'CONFLICTING_OUTPUTS'));

const skillSchemaText = JSON.stringify(loadSchema('skill_manifest'));
for (const skill of ['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship']) {
  assert.ok(skillSchemaText.includes(`"${skill}"`), `canonical skill_manifest schema must include ${skill}`);
}
regressions.push('six skills remain brainstorm/grill-me/task/plan/build/ship in canonical public skill_manifest schema');

const artifactFlow = [
  ['work_brief', '../artifacts/fixtures/valid/work_brief.json'],
  ['implementation_plan', '../artifacts/fixtures/valid/implementation_plan.json'],
  ['build_result', '../artifacts/fixtures/valid/build_result.json'],
  ['ship_packet', '../artifacts/fixtures/valid/ship_packet.json'],
];
for (const [kind, artifactPath] of artifactFlow) {
  const result = validateArtifactFile(artifactPath, { kind });
  assert.equal(result.ok, true, `${kind} fixture must validate through public artifacts package`);
}
const workBrief = readJson('../artifacts/fixtures/valid/work_brief.json');
const implementationPlan = readJson('../artifacts/fixtures/valid/implementation_plan.json');
const buildResult = readJson('../artifacts/fixtures/valid/build_result.json');
const shipPacket = readJson('../artifacts/fixtures/valid/ship_packet.json');
assert.ok(workBrief.links.some((link) => link.rel === 'raw_intent'));
assert.equal(implementationPlan.workBriefRef.artifactKind, 'work_brief');
assert.equal(implementationPlan.verificationDelta.artifactKind, 'verification_delta');
assert.equal(buildResult.implementationPlanRef.artifactKind, 'implementation_plan');
assert.equal(shipPacket.buildResultRef.artifactKind, 'build_result');
regressions.push('artifact flow remains raw intent -> Work Brief -> Implementation Plan -> Build Result -> Ship Packet through public validators and links');

const lockedDecisions = fs.readFileSync('/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md', 'utf8');
const verificationLayer = fs.readFileSync('/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md', 'utf8');
assert.ok(lockedDecisions.includes('plan` owns risk analysis and Verification Delta'));
assert.ok(verificationLayer.includes('risk analysis'));
assert.ok(verificationLayer.includes('Verification Delta'));
assert.ok(lockedDecisions.includes('`build` and `ship` orchestrators trigger'));
assert.ok(verificationLayer.includes('Verification is triggered by the higher-level skills/orchestrators'));
regressions.push('plan owns risk/Verification Delta and build/ship automatic verification/context/evidence preserved in locked docs');

const sourceText = fs.readFileSync('src/index.ts', 'utf8');
assert.equal(/node:child_process|child_process|spawn\(|execFile\(|fork\(|commander|yargs|process\.argv|bin\"/.test(sourceText), false, 'runtime source must not spawn live providers or implement CLI');
assert.equal(/\.\.\/artifacts\/src|artifacts\/src|node_modules\/\.pnpm/.test(sourceText), false, 'runtime source must use public artifact seam only');
assert.equal(/FailureTaxonomy|final taxonomy|taxonomy enum/i.test(sourceText), false, 'Q05 source must not define final DL-10 taxonomy');
assert.equal(fs.existsSync(path.resolve(repoRoot, 'packages/core')), false, 'packages/core must not exist');
assert.equal(assertNoLiveProviderSpawningCapability(), true);
regressions.push('DL-10 remains external hook/status owner, no live provider spawn, no CLI surface, no packages/core, public artifact import seam only');

const scopedDiff = execFileSync('git', ['diff', '--name-only', '--', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'docs', 'packages/artifacts', 'packages/config', 'packages/registry', 'packages/mechanical-gates', 'packages/cli', 'packages/skills', 'packages/adapters'], { cwd: repoRoot, encoding: 'utf8' }).trim();
assert.equal(scopedDiff, '', 'tracked diff for root/docs/sibling sentinels must be empty');
regressions.push('tracked diff for root/docs/sibling sentinels is empty; dirty untracked tree is path-scoped separately');

const summary = {
  ok: true,
  positives,
  negatives,
  regressions,
  defaultLimits: DEFAULT_ORCHESTRATION_LIMITS,
  evidenceRoot,
  boundaryStatePath,
};
writeJson('summary.json', summary);
console.log(`validator runtime witness passed: ${writeJson('summary-copy.json', summary)}`);
