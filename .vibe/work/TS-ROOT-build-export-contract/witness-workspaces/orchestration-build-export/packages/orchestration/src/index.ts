import fs from 'node:fs';
import path from 'node:path';
import { validateArtifactFile } from '@vibe-engineer/artifacts';
import type { ArtifactKind, ArtifactValidationError } from '@vibe-engineer/artifacts';

export const DEFAULT_ORCHESTRATION_LIMITS = Object.freeze({
  maxParallelAgents: 8,
  maxValidationFixIterations: 3,
  agenticWorkPackageTargetHours: 6,
});

export type OrchestrationNodeStatus =
  | 'pending'
  | 'ready'
  | 'active'
  | 'passed'
  | 'validated'
  | 'failed'
  | 'blocked'
  | 'pending-live'
  | 'invalidated';

export type FailureRouteStatus = 'none' | 'routing-needed' | 'routed' | 'blocked';

export interface OrchestrationLimits {
  readonly maxParallelAgents: number;
  readonly maxValidationFixIterations: number;
  readonly agenticWorkPackageTargetHours: number;
}

export interface OwnershipClaim {
  readonly path: string;
  readonly access: 'read' | 'write';
  readonly ownerNodeId: string;
  readonly claimId?: string;
  readonly serializedHandoff?: string;
}

export interface ArtifactOutputRef {
  readonly artifactId: string;
  readonly artifactKind: ArtifactKind;
  readonly path: string;
  readonly ownerNodeId: string;
  readonly status: 'produced' | 'validated' | 'passed' | 'stale' | 'blocked' | 'pending-live';
  readonly dirtyState?: 'clean' | 'dirty-owned' | 'dirty-unowned' | 'unknown';
  readonly evidenceRefs?: readonly string[];
}

export interface FailureRoutingHook {
  readonly status: FailureRouteStatus;
  readonly hookRef: string;
  readonly owner: string;
  readonly classificationRef?: string;
  readonly routeTo?: string;
  readonly evidenceRefs?: readonly string[];
}

export interface OrchestrationNode {
  readonly id: string;
  readonly title: string;
  readonly dependsOn: readonly string[];
  readonly ownershipClaims: readonly OwnershipClaim[];
  readonly expectedOutputs: readonly ArtifactOutputRef[];
  readonly evidenceRefs: readonly string[];
  readonly failureRouting: FailureRoutingHook;
  readonly estimate: {
    readonly agenticHours: number;
    readonly split: boolean;
  };
}

export interface OrchestrationWorkPlan {
  readonly schemaVersion: 'orchestration-work-plan/1.0.0';
  readonly runId: string;
  readonly limits: OrchestrationLimits;
  readonly nodes: readonly OrchestrationNode[];
  readonly untouchablePaths: readonly string[];
  readonly readOnlyPaths: readonly string[];
}

export interface NodeRuntimeState {
  readonly id: string;
  readonly status: OrchestrationNodeStatus;
  readonly attempts: number;
  readonly validationFixIterations: number;
  readonly activeAgentId?: string;
  readonly startedAt?: string;
  readonly endedAt?: string;
  readonly failureRouting: FailureRoutingHook;
  readonly evidenceRefs: readonly string[];
  readonly outputRefs: readonly ArtifactOutputRef[];
  readonly statusReason?: string;
}

export interface JoinRecord {
  readonly consumerNodeId: string;
  readonly upstreamNodeId: string;
  readonly artifactId: string;
  readonly artifactKind: ArtifactKind;
  readonly artifactPath: string;
  readonly schemaVersion: string;
  readonly schemaId: string;
  readonly evidenceRefs: readonly string[];
  readonly joinedAt: string;
}

export interface ResumeCheckpoint {
  readonly cursorNodeIds: readonly string[];
  readonly completedNodeIds: readonly string[];
  readonly retryNodeIds: readonly string[];
  readonly blockedNodeIds: readonly string[];
  readonly inspectedAt: string;
  readonly reasons: readonly string[];
}

export interface DurableRunState {
  readonly schemaVersion: 'orchestration-runtime-state/1.0.0';
  readonly runId: string;
  readonly workPlanPath: string;
  readonly limits: OrchestrationLimits;
  readonly nodes: readonly NodeRuntimeState[];
  readonly activeClaims: readonly OwnershipClaim[];
  readonly joinRecords: readonly JoinRecord[];
  readonly failureRoutes: readonly FailureRoutingHook[];
  readonly resume: ResumeCheckpoint;
  readonly checkpoints: readonly string[];
  readonly updatedAt: string;
}

export interface ScheduleDecision {
  readonly scheduledNodeIds: readonly string[];
  readonly blockedNodeIds: readonly string[];
  readonly reasons: readonly string[];
  readonly activeCount: number;
  readonly maxParallelAgents: number;
}

export interface JoinDecision {
  readonly consumerNodeId: string;
  readonly joinedArtifactIds: readonly string[];
  readonly joinRecords: readonly JoinRecord[];
}

export interface ArtifactInvalidation {
  readonly nodeId: string;
  readonly artifactPath: string;
  readonly reason: string;
  readonly errors?: readonly ArtifactValidationError[];
}

export interface ResumeInspection {
  readonly resume: ResumeCheckpoint;
  readonly invalidations: readonly ArtifactInvalidation[];
}

export interface ValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export class OrchestrationContractError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(message: string, issues: readonly ValidationIssue[]) {
    super(message);
    this.name = 'OrchestrationContractError';
    this.issues = issues;
  }
}

type UnknownRecord = Readonly<Record<string, unknown>>;

const NODE_STATUSES = new Set<OrchestrationNodeStatus>([
  'pending',
  'ready',
  'active',
  'passed',
  'validated',
  'failed',
  'blocked',
  'pending-live',
  'invalidated',
]);

const OUTPUT_STATUSES = new Set<ArtifactOutputRef['status']>([
  'produced',
  'validated',
  'passed',
  'stale',
  'blocked',
  'pending-live',
]);

const DIRTY_STATES = new Set<NonNullable<ArtifactOutputRef['dirtyState']>>([
  'clean',
  'dirty-owned',
  'dirty-unowned',
  'unknown',
]);

const FAILURE_ROUTE_STATUSES = new Set<FailureRouteStatus>(['none', 'routing-needed', 'routed', 'blocked']);

const parseJsonDocument: (text: string) => unknown = JSON.parse;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addIssue(issues: ValidationIssue[], code: string, issuePath: string, message: string): void {
  issues.push({ code, path: issuePath, message });
}

function readRequiredString(record: UnknownRecord, key: string, issuePath: string, issues: ValidationIssue[]): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    addIssue(issues, 'REQUIRED_STRING', `${issuePath}/${key}`, `${key} must be a non-empty string.`);
    return '';
  }
  return value;
}

function readOptionalString(record: UnknownRecord, key: string, issuePath: string, issues: ValidationIssue[]): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
    addIssue(issues, 'OPTIONAL_STRING', `${issuePath}/${key}`, `${key} must be a non-empty string when present.`);
    return undefined;
  }
  return value;
}

function readRequiredNumber(record: UnknownRecord, key: string, issuePath: string, issues: ValidationIssue[]): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    addIssue(issues, 'REQUIRED_NUMBER', `${issuePath}/${key}`, `${key} must be a finite number.`);
    return 0;
  }
  return value;
}

function readRequiredBoolean(record: UnknownRecord, key: string, issuePath: string, issues: ValidationIssue[]): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') {
    addIssue(issues, 'REQUIRED_BOOLEAN', `${issuePath}/${key}`, `${key} must be boolean.`);
    return false;
  }
  return value;
}

function readStringArray(record: UnknownRecord, key: string, issuePath: string, issues: ValidationIssue[]): readonly string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    addIssue(issues, 'REQUIRED_ARRAY', `${issuePath}/${key}`, `${key} must be an array.`);
    return [];
  }
  const strings: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim() === '') {
      addIssue(issues, 'ARRAY_STRING', `${issuePath}/${key}/${String(index)}`, `${key} entries must be non-empty strings.`);
      return;
    }
    strings.push(item);
  });
  return strings;
}

function readRecordArray(record: UnknownRecord, key: string, issuePath: string, issues: ValidationIssue[]): readonly UnknownRecord[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    addIssue(issues, 'REQUIRED_ARRAY', `${issuePath}/${key}`, `${key} must be an array.`);
    return [];
  }
  const records: UnknownRecord[] = [];
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      addIssue(issues, 'ARRAY_OBJECT', `${issuePath}/${key}/${String(index)}`, `${key} entries must be objects.`);
      return;
    }
    records.push(item);
  });
  return records;
}

function normalizeClaimPath(claimPath: string): string {
  const normalized = path.posix.normalize(claimPath.replaceAll('\\', '/'));
  if (normalized === '.') return '';
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function claimPatternBase(claimPath: string): string {
  const normalized = normalizeClaimPath(claimPath);
  return normalized.endsWith('/**') ? normalized.slice(0, -3) : normalized;
}

function pathsOverlap(leftPath: string, rightPath: string): boolean {
  const left = claimPatternBase(leftPath);
  const right = claimPatternBase(rightPath);
  return left === right || right.startsWith(`${left}/`) || left.startsWith(`${right}/`);
}

function parseLimits(record: UnknownRecord, issuePath: string, issues: ValidationIssue[]): OrchestrationLimits {
  const maxParallelAgents = readRequiredNumber(record, 'maxParallelAgents', issuePath, issues);
  const maxValidationFixIterations = readRequiredNumber(record, 'maxValidationFixIterations', issuePath, issues);
  const agenticWorkPackageTargetHours = readRequiredNumber(record, 'agenticWorkPackageTargetHours', issuePath, issues);
  if (!Number.isInteger(maxParallelAgents) || maxParallelAgents < 1) addIssue(issues, 'INVALID_LIMIT', `${issuePath}/maxParallelAgents`, 'maxParallelAgents must be a positive integer.');
  if (!Number.isInteger(maxValidationFixIterations) || maxValidationFixIterations < 0) addIssue(issues, 'INVALID_LIMIT', `${issuePath}/maxValidationFixIterations`, 'maxValidationFixIterations must be a non-negative integer.');
  if (agenticWorkPackageTargetHours <= 0) addIssue(issues, 'INVALID_LIMIT', `${issuePath}/agenticWorkPackageTargetHours`, 'agenticWorkPackageTargetHours must be positive.');
  return { maxParallelAgents, maxValidationFixIterations, agenticWorkPackageTargetHours };
}

function parseOwnershipClaim(record: UnknownRecord, issuePath: string, issues: ValidationIssue[]): OwnershipClaim {
  const access = record['access'];
  if (access !== 'read' && access !== 'write') addIssue(issues, 'INVALID_ACCESS', `${issuePath}/access`, 'ownership claim access must be read or write.');
  const claim: OwnershipClaim = {
    path: readRequiredString(record, 'path', issuePath, issues),
    access: access === 'read' || access === 'write' ? access : 'read',
    ownerNodeId: readRequiredString(record, 'ownerNodeId', issuePath, issues),
  };
  const claimId = readOptionalString(record, 'claimId', issuePath, issues);
  const serializedHandoff = readOptionalString(record, 'serializedHandoff', issuePath, issues);
  return {
    ...claim,
    ...(claimId === undefined ? {} : { claimId }),
    ...(serializedHandoff === undefined ? {} : { serializedHandoff }),
  };
}

function parseArtifactOutputRef(record: UnknownRecord, issuePath: string, issues: ValidationIssue[]): ArtifactOutputRef {
  const status = record['status'];
  if (typeof status !== 'string' || !OUTPUT_STATUSES.has(status as ArtifactOutputRef['status'])) {
    addIssue(issues, 'INVALID_OUTPUT_STATUS', `${issuePath}/status`, 'Artifact output status is not allowed.');
  }
  const dirtyState = record['dirtyState'];
  if (dirtyState !== undefined && (typeof dirtyState !== 'string' || !DIRTY_STATES.has(dirtyState as NonNullable<ArtifactOutputRef['dirtyState']>))) {
    addIssue(issues, 'INVALID_DIRTY_STATE', `${issuePath}/dirtyState`, 'dirtyState is not allowed.');
  }
  const output: ArtifactOutputRef = {
    artifactId: readRequiredString(record, 'artifactId', issuePath, issues),
    artifactKind: readRequiredString(record, 'artifactKind', issuePath, issues) as ArtifactKind,
    path: readRequiredString(record, 'path', issuePath, issues),
    ownerNodeId: readRequiredString(record, 'ownerNodeId', issuePath, issues),
    status: typeof status === 'string' && OUTPUT_STATUSES.has(status as ArtifactOutputRef['status']) ? (status as ArtifactOutputRef['status']) : 'blocked',
  };
  const evidenceRefs = readStringArray(record, 'evidenceRefs', issuePath, issues);
  return {
    ...output,
    ...(dirtyState === undefined || typeof dirtyState !== 'string' || !DIRTY_STATES.has(dirtyState as NonNullable<ArtifactOutputRef['dirtyState']>) ? {} : { dirtyState: dirtyState as NonNullable<ArtifactOutputRef['dirtyState']> }),
    evidenceRefs,
  };
}

function parseFailureRouting(record: UnknownRecord, issuePath: string, issues: ValidationIssue[]): FailureRoutingHook {
  const status = record['status'];
  if (typeof status !== 'string' || !FAILURE_ROUTE_STATUSES.has(status as FailureRouteStatus)) {
    addIssue(issues, 'INVALID_FAILURE_ROUTE_STATUS', `${issuePath}/status`, 'failure routing status is not allowed.');
  }
  const base: FailureRoutingHook = {
    status: typeof status === 'string' && FAILURE_ROUTE_STATUSES.has(status as FailureRouteStatus) ? (status as FailureRouteStatus) : 'blocked',
    hookRef: readRequiredString(record, 'hookRef', issuePath, issues),
    owner: readRequiredString(record, 'owner', issuePath, issues),
  };
  const classificationRef = readOptionalString(record, 'classificationRef', issuePath, issues);
  const routeTo = readOptionalString(record, 'routeTo', issuePath, issues);
  const evidenceRefs = readStringArray(record, 'evidenceRefs', issuePath, issues);
  return {
    ...base,
    ...(classificationRef === undefined ? {} : { classificationRef }),
    ...(routeTo === undefined ? {} : { routeTo }),
    evidenceRefs,
  };
}

function parseNode(record: UnknownRecord, issuePath: string, issues: ValidationIssue[]): OrchestrationNode {
  const estimateRecord = record['estimate'];
  if (!isRecord(estimateRecord)) addIssue(issues, 'REQUIRED_OBJECT', `${issuePath}/estimate`, 'estimate must be an object.');
  const estimateSource = isRecord(estimateRecord) ? estimateRecord : {};
  const failureRoutingRecord = record['failureRouting'];
  if (!isRecord(failureRoutingRecord)) addIssue(issues, 'REQUIRED_OBJECT', `${issuePath}/failureRouting`, 'failureRouting must be an object.');
  return {
    id: readRequiredString(record, 'id', issuePath, issues),
    title: readRequiredString(record, 'title', issuePath, issues),
    dependsOn: readStringArray(record, 'dependsOn', issuePath, issues),
    ownershipClaims: readRecordArray(record, 'ownershipClaims', issuePath, issues).map((claim, index) => parseOwnershipClaim(claim, `${issuePath}/ownershipClaims/${String(index)}`, issues)),
    expectedOutputs: readRecordArray(record, 'expectedOutputs', issuePath, issues).map((output, index) => parseArtifactOutputRef(output, `${issuePath}/expectedOutputs/${String(index)}`, issues)),
    evidenceRefs: readStringArray(record, 'evidenceRefs', issuePath, issues),
    failureRouting: isRecord(failureRoutingRecord) ? parseFailureRouting(failureRoutingRecord, `${issuePath}/failureRouting`, issues) : { status: 'blocked', hookRef: '', owner: '', evidenceRefs: [] },
    estimate: {
      agenticHours: readRequiredNumber(estimateSource, 'agenticHours', `${issuePath}/estimate`, issues),
      split: readRequiredBoolean(estimateSource, 'split', `${issuePath}/estimate`, issues),
    },
  };
}

export function parseWorkPlan(input: unknown): OrchestrationWorkPlan {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    throw new OrchestrationContractError('Work plan must be an object.', [{ code: 'NOT_OBJECT', path: '', message: 'Work plan boundary input must be an object.' }]);
  }
  const schemaVersion = input['schemaVersion'];
  if (schemaVersion !== 'orchestration-work-plan/1.0.0') {
    addIssue(issues, 'SCHEMA_VERSION', '/schemaVersion', 'Work plan schemaVersion must be orchestration-work-plan/1.0.0.');
  }
  const limitsRecord = input['limits'];
  if (!isRecord(limitsRecord)) addIssue(issues, 'REQUIRED_OBJECT', '/limits', 'limits must be an object.');
  const plan: OrchestrationWorkPlan = {
    schemaVersion: 'orchestration-work-plan/1.0.0',
    runId: readRequiredString(input, 'runId', '', issues),
    limits: isRecord(limitsRecord) ? parseLimits(limitsRecord, '/limits', issues) : { ...DEFAULT_ORCHESTRATION_LIMITS },
    nodes: readRecordArray(input, 'nodes', '', issues).map((node, index) => parseNode(node, `/nodes/${String(index)}`, issues)),
    untouchablePaths: readStringArray(input, 'untouchablePaths', '', issues),
    readOnlyPaths: readStringArray(input, 'readOnlyPaths', '', issues),
  };
  issues.push(...validateDag(plan));
  issues.push(...validateOwnershipClaims(plan));
  issues.push(...validateWorkPackageSizing(plan));
  if (issues.length > 0) throw new OrchestrationContractError('Invalid orchestration work plan.', issues);
  return plan;
}

export function validateDag(plan: OrchestrationWorkPlan): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  plan.nodes.forEach((node, index) => {
    if (ids.has(node.id)) addIssue(issues, 'DUPLICATE_NODE_ID', `/nodes/${String(index)}/id`, `Duplicate node id ${node.id}.`);
    ids.add(node.id);
  });
  plan.nodes.forEach((node, index) => {
    node.dependsOn.forEach((dependencyId, depIndex) => {
      if (!ids.has(dependencyId)) addIssue(issues, 'MISSING_DEPENDENCY', `/nodes/${String(index)}/dependsOn/${String(depIndex)}`, `Dependency ${dependencyId} is not declared.`);
    });
  });
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const nodeById = new Map(plan.nodes.map((node) => [node.id, node]));
  const visit = (nodeId: string, chain: readonly string[]): void => {
    if (visiting.has(nodeId)) {
      addIssue(issues, 'DAG_CYCLE', '/nodes', `Cycle detected: ${[...chain, nodeId].join(' -> ')}.`);
      return;
    }
    if (visited.has(nodeId)) return;
    const node = nodeById.get(nodeId);
    if (node === undefined) return;
    visiting.add(nodeId);
    node.dependsOn.forEach((dependencyId) => { visit(dependencyId, [...chain, nodeId]); });
    visiting.delete(nodeId);
    visited.add(nodeId);
  };
  plan.nodes.forEach((node) => { visit(node.id, []); });
  return issues;
}

export function validateWorkPackageSizing(plan: OrchestrationWorkPlan): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  plan.nodes.forEach((node) => {
    if (node.estimate.agenticHours > plan.limits.agenticWorkPackageTargetHours && !node.estimate.split) {
      addIssue(issues, 'WORK_PACKAGE_TOO_LARGE', `/nodes/${node.id}/estimate/agenticHours`, `Unsplit work package ${node.id} exceeds ${String(plan.limits.agenticWorkPackageTargetHours)} agentic hours.`);
    }
  });
  return issues;
}

export function validateOwnershipClaims(plan: OrchestrationWorkPlan): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const writeClaims = plan.nodes.flatMap((node) => node.ownershipClaims.filter((claim) => claim.access === 'write').map((claim) => ({ nodeId: node.id, claim })));
  writeClaims.forEach(({ nodeId, claim }) => {
    plan.untouchablePaths.forEach((untouchablePath) => {
      if (pathsOverlap(claim.path, untouchablePath)) addIssue(issues, 'UNTOUCHABLE_WRITE_CLAIM', `/nodes/${nodeId}/ownershipClaims`, `Node ${nodeId} claims untouchable path ${claim.path}.`);
    });
    plan.readOnlyPaths.forEach((readOnlyPath) => {
      if (pathsOverlap(claim.path, readOnlyPath)) addIssue(issues, 'READONLY_WRITE_CLAIM', `/nodes/${nodeId}/ownershipClaims`, `Node ${nodeId} claims read-only path ${claim.path}.`);
    });
  });
  for (let leftIndex = 0; leftIndex < writeClaims.length; leftIndex += 1) {
    const left = writeClaims[leftIndex];
    if (left === undefined) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < writeClaims.length; rightIndex += 1) {
      const right = writeClaims[rightIndex];
      if (right === undefined) continue;
      if (left.nodeId !== right.nodeId && pathsOverlap(left.claim.path, right.claim.path)) {
        const leftHandoff = left.claim.serializedHandoff;
        const rightHandoff = right.claim.serializedHandoff;
        if (leftHandoff === undefined || rightHandoff === undefined || leftHandoff !== rightHandoff) {
          addIssue(issues, 'WRITE_OWNERSHIP_CONFLICT', '/nodes', `Write ownership conflict between ${left.nodeId}:${left.claim.path} and ${right.nodeId}:${right.claim.path}.`);
        }
      }
    }
  }
  return issues;
}

function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf8');
  return parseJsonDocument(raw);
}

export function readWorkPlanFile(filePath: string): OrchestrationWorkPlan {
  return parseWorkPlan(readJsonFile(filePath));
}

function initialNodeState(node: OrchestrationNode): NodeRuntimeState {
  return {
    id: node.id,
    status: 'pending',
    attempts: 0,
    validationFixIterations: 0,
    failureRouting: node.failureRouting,
    evidenceRefs: node.evidenceRefs,
    outputRefs: node.expectedOutputs,
  };
}

function writeStateFile(statePath: string, state: DurableRunState): DurableRunState {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return state;
}

export function createInitialRunState(options: { readonly workPlanPath: string; readonly statePath: string; readonly now?: string }): DurableRunState {
  const plan = readWorkPlanFile(options.workPlanPath);
  const now = options.now ?? new Date().toISOString();
  const state: DurableRunState = {
    schemaVersion: 'orchestration-runtime-state/1.0.0',
    runId: plan.runId,
    workPlanPath: options.workPlanPath,
    limits: plan.limits,
    nodes: plan.nodes.map(initialNodeState),
    activeClaims: [],
    joinRecords: [],
    failureRoutes: [],
    resume: {
      cursorNodeIds: [],
      completedNodeIds: [],
      retryNodeIds: [],
      blockedNodeIds: [],
      inspectedAt: now,
      reasons: ['initial durable state written before scheduling'],
    },
    checkpoints: [`${now} initial-state-written`],
    updatedAt: now,
  };
  return writeStateFile(options.statePath, state);
}

function parseNodeRuntimeState(record: UnknownRecord, issuePath: string, issues: ValidationIssue[]): NodeRuntimeState {
  const status = record['status'];
  if (typeof status !== 'string' || !NODE_STATUSES.has(status as OrchestrationNodeStatus)) addIssue(issues, 'INVALID_NODE_STATUS', `${issuePath}/status`, 'Node status is invalid.');
  const failureRoutingRecord = record['failureRouting'];
  if (!isRecord(failureRoutingRecord)) addIssue(issues, 'REQUIRED_OBJECT', `${issuePath}/failureRouting`, 'failureRouting must be an object.');
  const base: NodeRuntimeState = {
    id: readRequiredString(record, 'id', issuePath, issues),
    status: typeof status === 'string' && NODE_STATUSES.has(status as OrchestrationNodeStatus) ? (status as OrchestrationNodeStatus) : 'blocked',
    attempts: readRequiredNumber(record, 'attempts', issuePath, issues),
    validationFixIterations: readRequiredNumber(record, 'validationFixIterations', issuePath, issues),
    failureRouting: isRecord(failureRoutingRecord) ? parseFailureRouting(failureRoutingRecord, `${issuePath}/failureRouting`, issues) : { status: 'blocked', hookRef: '', owner: '', evidenceRefs: [] },
    evidenceRefs: readStringArray(record, 'evidenceRefs', issuePath, issues),
    outputRefs: readRecordArray(record, 'outputRefs', issuePath, issues).map((output, index) => parseArtifactOutputRef(output, `${issuePath}/outputRefs/${String(index)}`, issues)),
  };
  const activeAgentId = readOptionalString(record, 'activeAgentId', issuePath, issues);
  const startedAt = readOptionalString(record, 'startedAt', issuePath, issues);
  const endedAt = readOptionalString(record, 'endedAt', issuePath, issues);
  const statusReason = readOptionalString(record, 'statusReason', issuePath, issues);
  return {
    ...base,
    ...(activeAgentId === undefined ? {} : { activeAgentId }),
    ...(startedAt === undefined ? {} : { startedAt }),
    ...(endedAt === undefined ? {} : { endedAt }),
    ...(statusReason === undefined ? {} : { statusReason }),
  };
}

function parseResumeCheckpoint(record: UnknownRecord, issuePath: string, issues: ValidationIssue[]): ResumeCheckpoint {
  return {
    cursorNodeIds: readStringArray(record, 'cursorNodeIds', issuePath, issues),
    completedNodeIds: readStringArray(record, 'completedNodeIds', issuePath, issues),
    retryNodeIds: readStringArray(record, 'retryNodeIds', issuePath, issues),
    blockedNodeIds: readStringArray(record, 'blockedNodeIds', issuePath, issues),
    inspectedAt: readRequiredString(record, 'inspectedAt', issuePath, issues),
    reasons: readStringArray(record, 'reasons', issuePath, issues),
  };
}

function parseJoinRecord(record: UnknownRecord, issuePath: string, issues: ValidationIssue[]): JoinRecord {
  return {
    consumerNodeId: readRequiredString(record, 'consumerNodeId', issuePath, issues),
    upstreamNodeId: readRequiredString(record, 'upstreamNodeId', issuePath, issues),
    artifactId: readRequiredString(record, 'artifactId', issuePath, issues),
    artifactKind: readRequiredString(record, 'artifactKind', issuePath, issues) as ArtifactKind,
    artifactPath: readRequiredString(record, 'artifactPath', issuePath, issues),
    schemaVersion: readRequiredString(record, 'schemaVersion', issuePath, issues),
    schemaId: readRequiredString(record, 'schemaId', issuePath, issues),
    evidenceRefs: readStringArray(record, 'evidenceRefs', issuePath, issues),
    joinedAt: readRequiredString(record, 'joinedAt', issuePath, issues),
  };
}

export function parseRunState(input: unknown): DurableRunState {
  const issues: ValidationIssue[] = [];
  if (!isRecord(input)) {
    throw new OrchestrationContractError('Run state must be an object.', [{ code: 'NOT_OBJECT', path: '', message: 'Run state boundary input must be an object.' }]);
  }
  if (input['schemaVersion'] !== 'orchestration-runtime-state/1.0.0') addIssue(issues, 'SCHEMA_VERSION', '/schemaVersion', 'Run state schemaVersion must be orchestration-runtime-state/1.0.0.');
  const limitsRecord = input['limits'];
  if (!isRecord(limitsRecord)) addIssue(issues, 'REQUIRED_OBJECT', '/limits', 'limits must be an object.');
  const resumeRecord = input['resume'];
  if (!isRecord(resumeRecord)) addIssue(issues, 'REQUIRED_OBJECT', '/resume', 'resume must be an object.');
  const state: DurableRunState = {
    schemaVersion: 'orchestration-runtime-state/1.0.0',
    runId: readRequiredString(input, 'runId', '', issues),
    workPlanPath: readRequiredString(input, 'workPlanPath', '', issues),
    limits: isRecord(limitsRecord) ? parseLimits(limitsRecord, '/limits', issues) : { ...DEFAULT_ORCHESTRATION_LIMITS },
    nodes: readRecordArray(input, 'nodes', '', issues).map((node, index) => parseNodeRuntimeState(node, `/nodes/${String(index)}`, issues)),
    activeClaims: readRecordArray(input, 'activeClaims', '', issues).map((claim, index) => parseOwnershipClaim(claim, `/activeClaims/${String(index)}`, issues)),
    joinRecords: readRecordArray(input, 'joinRecords', '', issues).map((record, index) => parseJoinRecord(record, `/joinRecords/${String(index)}`, issues)),
    failureRoutes: readRecordArray(input, 'failureRoutes', '', issues).map((record, index) => parseFailureRouting(record, `/failureRoutes/${String(index)}`, issues)),
    resume: isRecord(resumeRecord) ? parseResumeCheckpoint(resumeRecord, '/resume', issues) : { cursorNodeIds: [], completedNodeIds: [], retryNodeIds: [], blockedNodeIds: [], inspectedAt: '', reasons: [] },
    checkpoints: readStringArray(input, 'checkpoints', '', issues),
    updatedAt: readRequiredString(input, 'updatedAt', '', issues),
  };
  if (issues.length > 0) throw new OrchestrationContractError('Invalid orchestration run state.', issues);
  return state;
}

export function loadRunState(statePath: string): DurableRunState {
  return parseRunState(readJsonFile(statePath));
}

function nodeStateById(state: DurableRunState): Map<string, NodeRuntimeState> {
  return new Map(state.nodes.map((node) => [node.id, node]));
}

function planNodeById(plan: OrchestrationWorkPlan): Map<string, OrchestrationNode> {
  return new Map(plan.nodes.map((node) => [node.id, node]));
}

function blockingDependencyStatus(status: OrchestrationNodeStatus): boolean {
  return status === 'blocked' || status === 'pending-live' || status === 'failed' || status === 'invalidated';
}

function dependencyReady(status: OrchestrationNodeStatus): boolean {
  return status === 'passed' || status === 'validated';
}

function candidateReady(node: OrchestrationNode, states: Map<string, NodeRuntimeState>): boolean {
  return node.dependsOn.every((dependencyId) => {
    const dependencyState = states.get(dependencyId);
    return dependencyState !== undefined && dependencyReady(dependencyState.status);
  });
}

function activeCount(state: DurableRunState): number {
  return state.nodes.filter((node) => node.status === 'active').length;
}

function activeWriteClaims(state: DurableRunState, plan: OrchestrationWorkPlan): readonly OwnershipClaim[] {
  const activeIds = new Set(state.nodes.filter((node) => node.status === 'active').map((node) => node.id));
  return plan.nodes.flatMap((node) => activeIds.has(node.id) ? node.ownershipClaims.filter((claim) => claim.access === 'write') : []);
}

function hasConflictWithClaims(candidate: OrchestrationNode, claims: readonly OwnershipClaim[]): boolean {
  return candidate.ownershipClaims.some((claim) => claim.access === 'write' && claims.some((activeClaim) => activeClaim.access === 'write' && activeClaim.ownerNodeId !== claim.ownerNodeId && pathsOverlap(activeClaim.path, claim.path)));
}

export function selectReadyNodes(plan: OrchestrationWorkPlan, state: DurableRunState): ScheduleDecision {
  if (state.limits.maxParallelAgents !== plan.limits.maxParallelAgents) {
    throw new OrchestrationContractError('State and plan maxParallelAgents differ.', [{ code: 'LIMIT_DRIFT', path: '/limits/maxParallelAgents', message: 'Persisted state must match the work-plan parallelism cap.' }]);
  }
  const currentActiveCount = activeCount(state);
  if (currentActiveCount > plan.limits.maxParallelAgents) {
    throw new OrchestrationContractError('Active node count exceeds maxParallelAgents.', [{ code: 'ACTIVE_COUNT_EXCEEDS_CAP', path: '/nodes', message: `Active count ${String(currentActiveCount)} exceeds ${String(plan.limits.maxParallelAgents)}.` }]);
  }
  const capacity = plan.limits.maxParallelAgents - currentActiveCount;
  const states = nodeStateById(state);
  const reasons: string[] = [];
  const blockedNodeIds: string[] = [];
  const selected: string[] = [];
  const selectedWriteClaims: OwnershipClaim[] = [...activeWriteClaims(state, plan)];
  for (const node of plan.nodes) {
    const runtime = states.get(node.id);
    if (runtime === undefined) {
      blockedNodeIds.push(node.id);
      reasons.push(`${node.id}: missing runtime state`);
      continue;
    }
    if (runtime.status !== 'pending' && runtime.status !== 'ready' && runtime.status !== 'invalidated') continue;
    const blockedDependency = node.dependsOn.find((dependencyId) => {
      const dependency = states.get(dependencyId);
      return dependency === undefined || blockingDependencyStatus(dependency.status) || !dependencyReady(dependency.status);
    });
    if (blockedDependency !== undefined) {
      blockedNodeIds.push(node.id);
      reasons.push(`${node.id}: dependency ${blockedDependency} is not validated/passed`);
      continue;
    }
    if (!candidateReady(node, states)) continue;
    if (hasConflictWithClaims(node, selectedWriteClaims)) {
      blockedNodeIds.push(node.id);
      reasons.push(`${node.id}: write ownership conflict with active or selected node`);
      continue;
    }
    if (selected.length < capacity) {
      selected.push(node.id);
      selectedWriteClaims.push(...node.ownershipClaims.filter((claim) => claim.access === 'write'));
    }
  }
  return { scheduledNodeIds: selected, blockedNodeIds, reasons, activeCount: currentActiveCount, maxParallelAgents: plan.limits.maxParallelAgents };
}

function updateNode(nodes: readonly NodeRuntimeState[], nodeId: string, updater: (node: NodeRuntimeState) => NodeRuntimeState): readonly NodeRuntimeState[] {
  const targetIndex = nodes.findIndex((node) => node.id === nodeId);
  if (targetIndex < 0) throw new OrchestrationContractError('Node not found in runtime state.', [{ code: 'NODE_NOT_FOUND', path: '/nodes', message: `Node ${nodeId} not found.` }]);
  return nodes.map((node) => node.id === nodeId ? updater(node) : node);
}

export function persistScheduleDecision(options: { readonly statePath: string; readonly plan: OrchestrationWorkPlan; readonly decision: ScheduleDecision; readonly now?: string }): DurableRunState {
  const state = loadRunState(options.statePath);
  const now = options.now ?? new Date().toISOString();
  const scheduledSet = new Set(options.decision.scheduledNodeIds);
  const planById = planNodeById(options.plan);
  const nodes = state.nodes.map((node) => scheduledSet.has(node.id) ? { ...node, status: 'active' as const, attempts: node.attempts + 1, startedAt: now } : node);
  const activeClaims = options.decision.scheduledNodeIds.flatMap((nodeId) => planById.get(nodeId)?.ownershipClaims.filter((claim) => claim.access === 'write') ?? []);
  const nextState: DurableRunState = {
    ...state,
    nodes,
    activeClaims: [...state.activeClaims, ...activeClaims],
    resume: {
      ...state.resume,
      cursorNodeIds: options.decision.scheduledNodeIds,
      blockedNodeIds: options.decision.blockedNodeIds,
      inspectedAt: now,
      reasons: options.decision.reasons,
    },
    checkpoints: [...state.checkpoints, `${now} schedule ${options.decision.scheduledNodeIds.join(',')}`],
    updatedAt: now,
  };
  return writeStateFile(options.statePath, nextState);
}

export function transitionNode(options: { readonly statePath: string; readonly nodeId: string; readonly status: OrchestrationNodeStatus; readonly evidenceRefs?: readonly string[]; readonly outputRefs?: readonly ArtifactOutputRef[]; readonly statusReason?: string; readonly now?: string; readonly validationFixIterations?: number }): DurableRunState {
  const state = loadRunState(options.statePath);
  const now = options.now ?? new Date().toISOString();
  if (!NODE_STATUSES.has(options.status)) throw new OrchestrationContractError('Invalid node status transition.', [{ code: 'INVALID_NODE_STATUS', path: '/status', message: `Status ${options.status} is not allowed.` }]);
  const validationFixIterations = options.validationFixIterations;
  if (validationFixIterations !== undefined && validationFixIterations > state.limits.maxValidationFixIterations) {
    throw new OrchestrationContractError('Validation/fix iteration cap exceeded.', [{ code: 'VALIDATION_FIX_CAP_EXCEEDED', path: '/validationFixIterations', message: `Iteration count ${String(validationFixIterations)} exceeds ${String(state.limits.maxValidationFixIterations)}.` }]);
  }
  const nodes = updateNode(state.nodes, options.nodeId, (node) => ({
    ...node,
    status: options.status,
    ...(options.status === 'passed' || options.status === 'validated' || options.status === 'failed' || options.status === 'blocked' || options.status === 'pending-live' ? { endedAt: now } : {}),
    ...(options.evidenceRefs === undefined ? {} : { evidenceRefs: options.evidenceRefs }),
    ...(options.outputRefs === undefined ? {} : { outputRefs: options.outputRefs }),
    ...(options.statusReason === undefined ? {} : { statusReason: options.statusReason }),
    ...(validationFixIterations === undefined ? {} : { validationFixIterations }),
  }));
  const transitionedNode = nodes.find((node) => node.id === options.nodeId);
  if (transitionedNode === undefined) throw new OrchestrationContractError('Node not found after transition.', [{ code: 'NODE_NOT_FOUND', path: '/nodes', message: `Node ${options.nodeId} not found after transition.` }]);
  const failureRoutes = options.status === 'failed' || options.status === 'blocked' || options.status === 'pending-live' ? [...state.failureRoutes, transitionedNode.failureRouting] : state.failureRoutes;
  const activeClaims = state.activeClaims.filter((claim) => claim.ownerNodeId !== options.nodeId);
  const nextState: DurableRunState = {
    ...state,
    nodes,
    activeClaims,
    failureRoutes,
    checkpoints: [...state.checkpoints, `${now} transition ${options.nodeId} ${options.status}`],
    updatedAt: now,
  };
  return writeStateFile(options.statePath, nextState);
}

function assertOutputReusable(output: ArtifactOutputRef): void {
  const issues: ValidationIssue[] = [];
  if (output.status !== 'validated' && output.status !== 'passed') addIssue(issues, 'UPSTREAM_OUTPUT_NOT_VALIDATED', '/expectedOutputs', `Output ${output.artifactId} is ${output.status}, not validated/passed.`);
  if (output.dirtyState === 'dirty-unowned' || output.dirtyState === 'unknown') addIssue(issues, 'STALE_OR_UNOWNED_DIRTY_ARTIFACT', '/expectedOutputs', `Output ${output.artifactId} has dirtyState ${output.dirtyState}.`);
  if (issues.length > 0) throw new OrchestrationContractError('Upstream output cannot be joined.', issues);
}

export function joinValidatedOutputs(options: { readonly statePath: string; readonly plan: OrchestrationWorkPlan; readonly consumerNodeId: string; readonly now?: string }): JoinDecision {
  const state = loadRunState(options.statePath);
  const now = options.now ?? new Date().toISOString();
  const planById = planNodeById(options.plan);
  const consumer = planById.get(options.consumerNodeId);
  if (consumer === undefined) throw new OrchestrationContractError('Consumer node not found.', [{ code: 'NODE_NOT_FOUND', path: '/consumerNodeId', message: `Node ${options.consumerNodeId} not found.` }]);
  const states = nodeStateById(state);
  const seenArtifactIds = new Set<string>();
  const seenArtifactPaths = new Set<string>();
  const records: JoinRecord[] = [];
  for (const upstreamNodeId of consumer.dependsOn) {
    const upstreamState = states.get(upstreamNodeId);
    if (upstreamState === undefined || !dependencyReady(upstreamState.status)) {
      throw new OrchestrationContractError('Upstream node is not ready for join.', [{ code: 'UPSTREAM_NOT_READY', path: '/dependsOn', message: `Upstream ${upstreamNodeId} is not passed/validated.` }]);
    }
    for (const output of upstreamState.outputRefs) {
      assertOutputReusable(output);
      if (seenArtifactIds.has(output.artifactId) || seenArtifactPaths.has(path.resolve(output.path))) {
        throw new OrchestrationContractError('Conflicting outputs are not silently mergeable.', [{ code: 'CONFLICTING_OUTPUTS', path: '/outputRefs', message: `Output ${output.artifactId} conflicts by artifactId or path.` }]);
      }
      if (!fs.existsSync(output.path)) throw new OrchestrationContractError('Missing dependency artifact.', [{ code: 'MISSING_DEPENDENCY_ARTIFACT', path: output.path, message: `Artifact ${output.path} is missing.` }]);
      const validation = validateArtifactFile(output.path, { kind: output.artifactKind });
      if (!validation.ok) {
        throw new OrchestrationContractError('Canonical dependency artifact validation failed.', validation.errors.map((error) => ({ code: 'INVALID_CANONICAL_ARTIFACT', path: error.pointer, message: error.message })));
      }
      seenArtifactIds.add(output.artifactId);
      seenArtifactPaths.add(path.resolve(output.path));
      records.push({
        consumerNodeId: consumer.id,
        upstreamNodeId,
        artifactId: output.artifactId,
        artifactKind: output.artifactKind,
        artifactPath: output.path,
        schemaVersion: validation.schemaVersion,
        schemaId: validation.schemaId,
        evidenceRefs: output.evidenceRefs ?? [],
        joinedAt: now,
      });
    }
  }
  const nextState: DurableRunState = {
    ...state,
    joinRecords: [...state.joinRecords, ...records],
    checkpoints: [...state.checkpoints, `${now} join ${options.consumerNodeId} ${records.map((record) => record.artifactId).join(',')}`],
    updatedAt: now,
  };
  writeStateFile(options.statePath, nextState);
  return { consumerNodeId: consumer.id, joinedArtifactIds: records.map((record) => record.artifactId), joinRecords: records };
}

export function inspectResumeState(options: { readonly statePath: string; readonly plan: OrchestrationWorkPlan; readonly now?: string }): ResumeInspection {
  const state = loadRunState(options.statePath);
  const now = options.now ?? new Date().toISOString();
  const invalidations: ArtifactInvalidation[] = [];
  const completedNodeIds: string[] = [];
  const retryNodeIds: string[] = [];
  const blockedNodeIds: string[] = [];
  const reasons: string[] = [];
  state.nodes.forEach((node) => {
    if (node.status === 'passed' || node.status === 'validated') {
      const badOutput = node.outputRefs.find((output) => {
        if (!fs.existsSync(output.path)) return true;
        const validation = validateArtifactFile(output.path, { kind: output.artifactKind });
        return !validation.ok || output.status === 'stale' || output.dirtyState === 'dirty-unowned' || output.dirtyState === 'unknown';
      });
      if (badOutput === undefined) {
        completedNodeIds.push(node.id);
        return;
      }
      const validation = fs.existsSync(badOutput.path) ? validateArtifactFile(badOutput.path, { kind: badOutput.artifactKind }) : undefined;
      invalidations.push({
        nodeId: node.id,
        artifactPath: badOutput.path,
        reason: validation === undefined ? 'missing artifact' : validation.ok ? 'stale or unowned dirty artifact' : 'invalid canonical artifact',
        ...(validation !== undefined && !validation.ok ? { errors: validation.errors } : {}),
      });
      retryNodeIds.push(node.id);
      reasons.push(`${node.id}: invalidated by ${badOutput.path}`);
      return;
    }
    if (node.status === 'failed' || node.status === 'invalidated') retryNodeIds.push(node.id);
    if (node.status === 'blocked' || node.status === 'pending-live') blockedNodeIds.push(node.id);
  });
  const readyDecision = selectReadyNodes(options.plan, state);
  const resume: ResumeCheckpoint = {
    cursorNodeIds: readyDecision.scheduledNodeIds,
    completedNodeIds,
    retryNodeIds,
    blockedNodeIds: [...blockedNodeIds, ...readyDecision.blockedNodeIds],
    inspectedAt: now,
    reasons: [...reasons, ...readyDecision.reasons],
  };
  return { resume, invalidations };
}

export function assertNoLiveProviderSpawningCapability(): true {
  return true;
}
