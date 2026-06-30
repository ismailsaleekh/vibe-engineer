import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateArtifactFile } from "@vibe-engineer/artifacts";
import {
  createInitialRunState,
  inspectResumeState,
  joinValidatedOutputs,
  persistScheduleDecision,
  readWorkPlanFile,
  selectReadyNodes,
  transitionNode,
} from "@vibe-engineer/orchestration";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
process.chdir(packageRoot);

const evidenceRoot = path.resolve(
  repoRoot,
  ".vibe/work/I-03-orchestration-runtime/evidence/real-boundary",
);
fs.rmSync(evidenceRoot, { recursive: true, force: true });
fs.mkdirSync(evidenceRoot, { recursive: true });

const publicImportResult = validateArtifactFile("fixtures/artifacts/valid/evidence_packet.json", {
  kind: "evidence_packet",
});
assert.equal(publicImportResult.ok, true);
fs.writeFileSync(
  path.join(evidenceRoot, "artifact-public-import.txt"),
  `public @vibe-engineer/artifacts validateArtifactFile ok=${publicImportResult.ok}\n`,
  "utf8",
);

const plan = readWorkPlanFile("fixtures/work-plans/valid-acyclic.json");
fs.copyFileSync(
  "fixtures/work-plans/valid-acyclic.json",
  path.join(evidenceRoot, "producer-carrier-work-plan.json"),
);
const stateFile = path.join(evidenceRoot, "durable-run-state.json");
const initialState = createInitialRunState({
  workPlanPath: "fixtures/work-plans/valid-acyclic.json",
  statePath: stateFile,
  now: "2026-06-24T01:00:00.000Z",
});
assert.equal(
  initialState.nodes.every((node) => node.status === "pending"),
  true,
);
fs.writeFileSync(
  path.join(evidenceRoot, "producer.txt"),
  "producer consumed on-disk work plan and canonical artifact fixture through public package seam\n",
  "utf8",
);

const firstDecision = selectReadyNodes(plan, initialState);
assert.deepEqual(firstDecision.scheduledNodeIds, ["produce-artifact"]);
persistScheduleDecision({
  statePath: stateFile,
  plan,
  decision: firstDecision,
  now: "2026-06-24T01:00:01.000Z",
});
transitionNode({
  statePath: stateFile,
  nodeId: "produce-artifact",
  status: "validated",
  now: "2026-06-24T01:00:02.000Z",
});
const secondDecision = selectReadyNodes(plan, JSON.parse(fs.readFileSync(stateFile, "utf8")));
assert.deepEqual(secondDecision.scheduledNodeIds, ["join-artifact"]);
const joinDecision = joinValidatedOutputs({
  statePath: stateFile,
  plan,
  consumerNodeId: "join-artifact",
  now: "2026-06-24T01:00:03.000Z",
});
assert.deepEqual(joinDecision.joinedArtifactIds, ["artifact-evidence_packet-001"]);
fs.writeFileSync(
  path.join(evidenceRoot, "join.txt"),
  `${JSON.stringify(joinDecision, null, 2)}\n`,
  "utf8",
);
transitionNode({
  statePath: stateFile,
  nodeId: "join-artifact",
  status: "passed",
  now: "2026-06-24T01:00:04.000Z",
});
const thirdDecision = selectReadyNodes(plan, JSON.parse(fs.readFileSync(stateFile, "utf8")));
assert.deepEqual(thirdDecision.scheduledNodeIds, ["ship-state"]);
const resumeInspection = inspectResumeState({
  statePath: stateFile,
  plan,
  now: "2026-06-24T01:00:05.000Z",
});
assert.ok(resumeInspection.resume.completedNodeIds.includes("produce-artifact"));
assert.ok(!resumeInspection.resume.retryNodeIds.includes("produce-artifact"));
fs.writeFileSync(
  path.join(evidenceRoot, "resume.txt"),
  `${JSON.stringify(resumeInspection, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(evidenceRoot, "consumer-scheduler-output.json"),
  `${JSON.stringify({ firstDecision, secondDecision, thirdDecision, joinDecision, resumeInspection }, null, 2)}\n`,
  "utf8",
);
console.log(`real-boundary witness passed: ${stateFile}`);
