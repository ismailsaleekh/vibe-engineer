import {
  DEFAULT_ORCHESTRATION_LIMITS,
  assertNoLiveProviderSpawningCapability,
  parseWorkPlan,
  type DurableRunState,
  type OrchestrationWorkPlan,
  type ScheduleDecision,
} from "../src/index.js";

const plan: OrchestrationWorkPlan = parseWorkPlan({
  schemaVersion: "orchestration-work-plan/1.0.0",
  runId: "typecheck-run",
  limits: DEFAULT_ORCHESTRATION_LIMITS,
  untouchablePaths: [".git/**"],
  readOnlyPaths: ["packages/artifacts/**"],
  nodes: [],
});

const decision: ScheduleDecision = {
  scheduledNodeIds: [],
  blockedNodeIds: [],
  reasons: [],
  activeCount: 0,
  maxParallelAgents: plan.limits.maxParallelAgents,
};

const state: DurableRunState = {
  schemaVersion: "orchestration-runtime-state/1.0.0",
  runId: plan.runId,
  workPlanPath: "fixtures/work-plans/valid-acyclic.json",
  limits: plan.limits,
  nodes: [],
  activeClaims: [],
  joinRecords: [],
  failureRoutes: [],
  resume: {
    cursorNodeIds: decision.scheduledNodeIds,
    completedNodeIds: [],
    retryNodeIds: [],
    blockedNodeIds: [],
    inspectedAt: "2026-06-24T00:00:00.000Z",
    reasons: [],
  },
  checkpoints: [],
  updatedAt: "2026-06-24T00:00:00.000Z",
};

if (state.runId !== "typecheck-run") throw new Error("typecheck consumer failed");
assertNoLiveProviderSpawningCapability();
