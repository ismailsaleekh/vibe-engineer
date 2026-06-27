// Build-skill implementation hooks: drives the plan→hooks→verify→context→evidence
// pipeline through the REAL I-03 orchestration typed-state runtime (durable run-state
// with failure routing). Hooks are deterministic; they do NOT spawn arbitrary agents.
//
// The hooks module derives a minimal OrchestrationWorkPlan from an approved
// Implementation Plan, initializes a durable typed run-state, and transitions the
// build work-package node through its lifecycle (pending → active → passed|failed|blocked).
// Verification outcome is routed back through transitionNode so failure routing is
// genuinely typed (I-03), not a heuristic.

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createInitialRunState,
  transitionNode,
  parseWorkPlan,
  DEFAULT_ORCHESTRATION_LIMITS
} from '@vibe-engineer/orchestration';
import { writeJsonAtomic } from '../shared/atomic-json-writer.js';

const HOOK_NODE_ID = 'build-work-package';

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validationError(field, message, code = 'INVALID_INPUT') {
  return Object.freeze({ field, code, message });
}

function nowIso(options) {
  if (options && typeof options.now === 'string' && options.now.length > 0) return options.now;
  return new Date().toISOString();
}

/**
 * Derive a minimal, schema-valid OrchestrationWorkPlan from an approved Implementation
 * Plan. The single build work-package node claims the build skill's owned write paths.
 * @param {object} plan - validated, approved Implementation Plan artifact.
 * @param {object} context
 * @param {string} context.runId
 * @param {string} context.workRoot - owned directory for the derived work plan + state.
 * @param {readonly string[]} [context.ownedWritePaths]
 */
export function deriveBuildWorkPlan(plan, context) {
  if (!isPlainObject(plan)) throw new TypeError('plan must be the validated Implementation Plan object.');
  if (!isPlainObject(context)) throw new TypeError('context must be an object.');
  if (typeof context.runId !== 'string' || context.runId.length === 0) throw new TypeError('context.runId is required.');
  if (typeof context.workRoot !== 'string' || context.workRoot.length === 0) throw new TypeError('context.workRoot is required.');
  const planArtifactId = typeof plan.artifactId === 'string' ? plan.artifactId : 'implementation-plan';
  const ownedWritePaths = Array.isArray(context.ownedWritePaths) && context.ownedWritePaths.length > 0
    ? context.ownedWritePaths
    : ['packages/skills/src/build/**', '.vibe/work/I-21-build-skill-orchestration/**'];
  return Object.freeze({
    schemaVersion: 'orchestration-work-plan/1.0.0',
    runId: context.runId,
    limits: DEFAULT_ORCHESTRATION_LIMITS,
    untouchablePaths: Object.freeze(['.git/**', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'package.json']),
    readOnlyPaths: Object.freeze(['packages/artifacts/**', 'packages/orchestration/**']),
    nodes: Object.freeze([
      {
        id: HOOK_NODE_ID,
        title: `Build work package for ${planArtifactId}`,
        dependsOn: [],
        ownershipClaims: ownedWritePaths.map((p) => ({ path: p, access: 'write', ownerNodeId: HOOK_NODE_ID })),
        expectedOutputs: [
          {
            artifactId: `build-result-${context.runId}`,
            artifactKind: 'build_result',
            path: `${context.workRoot}/build-result.json`,
            ownerNodeId: HOOK_NODE_ID,
            status: 'pending-live',
            dirtyState: 'unknown',
            evidenceRefs: []
          }
        ],
        evidenceRefs: [],
        failureRouting: {
          status: 'none',
          hookRef: 'dl10-build-hook:build-work-package',
          owner: 'I-21-build-skill-orchestration',
          classificationRef: 'dl10-verification-blocks',
          evidenceRefs: []
        },
        estimate: { agenticHours: DEFAULT_ORCHESTRATION_LIMITS.agenticWorkPackageTargetHours, split: false }
      }
    ])
  });
}

/**
 * Persist the derived work plan and initialize a durable typed run-state via the real
 * I-03 runtime. Returns the initialized state + the resolved paths.
 */
export async function initializeBuildRunState(plan, context) {
  const workPlan = deriveBuildWorkPlan(plan, context);
  const workPlanPath = path.join(context.workRoot, 'build-work-plan.json');
  const statePath = path.join(context.workRoot, 'build-run-state.json');
  await writeJsonAtomic(workPlanPath, workPlan);
  // Validate the derived plan parses through the real I-03 contract (DAG/sizing/ownership).
  parseWorkPlan(workPlan);
  const now = nowIso(context);
  const initialState = createInitialRunState({ workPlanPath, statePath, now });
  return Object.freeze({ workPlan, workPlanPath, statePath, initialState, startedAt: now });
}

/**
 * Transition the build work-package node to 'active'. Captures the deterministic
 * implementation-hook execution record (the hooks the build skill drove).
 */
export async function runImplementationHooks(setup, hookInputs) {
  const state = transitionNode({
    statePath: setup.statePath,
    nodeId: HOOK_NODE_ID,
    status: 'active',
    statusReason: 'Build skill driving implementation hooks: load plan, materialize changes, prepare verification.',
    now: setup.startedAt
  });
  const hooks = Object.freeze([
    { id: 'hook-load-approved-plan', description: 'Consume the approved Implementation Plan through the public @vibe-engineer/artifacts validator.', evidenceRefs: [] },
    { id: 'hook-materialize-changes', description: 'Record the implementation scope declared by the plan (changedFilesSummary derived from plan.affectedAreas).', evidenceRefs: [] },
    { id: 'hook-prepare-verification', description: 'Select verification layers from the plan Verification Delta and prepare the runner catalog.', evidenceRefs: [] }
  ]);
  return Object.freeze({
    state,
    hooks,
    changedAreas: Array.isArray(hookInputs?.changedAreas) ? hookInputs.changedAreas : [],
    activatedAt: setup.startedAt
  });
}

/**
 * Route the verification outcome through the typed I-03 failure router. Green verification
 * transitions the node to 'passed'; a failed/blocked verification layer transitions to
 * 'failed'/'blocked' (failure routing via I-03). This is the load-bearing
 * failed-verification-blocks contract: a non-green verification NEVER yields a passed node.
 */
export async function routeVerificationOutcome(setup, verificationGreen, verificationStatus, evidenceRefs) {
  const refs = Array.isArray(evidenceRefs) ? evidenceRefs.filter((r) => typeof r === 'string' && r.length > 0) : [];
  const now = nowIso();
  if (verificationGreen) {
    const state = transitionNode({
      statePath: setup.statePath,
      nodeId: HOOK_NODE_ID,
      status: 'passed',
      evidenceRefs: refs,
      statusReason: `Verification status '${verificationStatus}' is green; build work package passed.`,
      now
    });
    return Object.freeze({ green: true, status: 'passed', state, endedAt: now });
  }
  const status = verificationStatus === 'blocked' ? 'blocked' : 'failed';
  const state = transitionNode({
    statePath: setup.statePath,
    nodeId: HOOK_NODE_ID,
    status,
    evidenceRefs: refs,
    statusReason: `Verification status '${verificationStatus}' is non-green; build blocks (failed-verification-blocks, DL-10).`,
    now
  });
  return Object.freeze({ green: false, status, state, endedAt: now });
}

export async function readRunState(setup) {
  const raw = await fs.readFile(setup.statePath, 'utf8').catch(() => null);
  if (raw === null) return null;
  return JSON.parse(raw);
}

export { HOOK_NODE_ID };
