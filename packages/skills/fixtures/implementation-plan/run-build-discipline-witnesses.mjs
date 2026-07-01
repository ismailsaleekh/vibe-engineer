#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateArtifactKind } from "@vibe-engineer/artifacts";
import { createImplementationPlanFromWorkBriefIntake } from "../../src/plan/orchestrator/plan-skill.js";
import { runBuildFromImplementationPlan } from "../../src/build/build-skill.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../../..");
const workBriefRoot = path.join(
  repoRoot,
  "packages/skills/fixtures/work-brief/producers/positive-output",
);
const workBriefDescriptor = {
  inputRoot: workBriefRoot,
  artifactName: "brainstorm.work-brief.json",
};

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith("--")) {
      args.set(token.slice(2), argv[index + 1]);
      index += 1;
    }
  }
  return args;
}

const cliArgs = parseArgs(process.argv.slice(2));
const evidenceRoot = path.resolve(
  repoRoot,
  cliArgs.get("evidence-root") ??
    ".pi/autopilot/vibe-engineer-improvements/evidence/implement-build-skill-verification-discipline/build-witnesses",
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return file;
}

function validatorRunner({ id, layer, targetPath = "implementation-plan.json", artifactKind = "implementation_plan" }) {
  return {
    kind: "validator",
    id,
    requiredItemIds: [id],
    layer,
    evidenceClass: "deterministic",
    blocking: true,
    validator: "validateArtifactFile",
    targetPath,
    artifactKind,
  };
}

const registeredRunnerCatalog = [
  validatorRunner({ id: "typecheck", layer: "typecheck" }),
  validatorRunner({ id: "lint_format", layer: "lint_format" }),
  validatorRunner({ id: "unit", layer: "unit" }),
  validatorRunner({ id: "build_package", layer: "build_package" }),
  validatorRunner({ id: "architecture-agent-review", layer: "advisory_review" }),
];

async function createAppPlan(caseId) {
  const result = await createImplementationPlanFromWorkBriefIntake(workBriefDescriptor, {
    artifactId: `build-discipline-${caseId}`,
    now: "2026-07-01T00:00:00.000Z",
    runId: `run-build-discipline-${caseId}`,
    affectedAreas: [
      { kind: "app", path: "apps/api/src/orders", reason: "Add backend feature module." },
      { kind: "app", path: "apps/web/src/routes/orders", reason: "Add web route." },
      { kind: "app", path: "apps/mobile/src/screens/orders", reason: "Add mobile screen." },
    ],
    implementationSurfaces: ["backend", "web", "mobile"],
    selectedHarness: "codex",
    runnerCatalog: registeredRunnerCatalog,
  });
  assert.equal(result.ok, true, `${caseId} plan creation must succeed`);
  assert.equal(result.value.plan.status, "approved");
  return result.value.plan;
}

async function createDocsPlan(caseId) {
  const result = await createImplementationPlanFromWorkBriefIntake(workBriefDescriptor, {
    artifactId: `build-discipline-${caseId}`,
    now: "2026-07-01T00:00:00.000Z",
    runId: `run-build-discipline-${caseId}`,
    affectedAreas: [
      {
        kind: "docs",
        path: "docs/verification.md",
        reason: "Documentation-only verification discipline note.",
      },
    ],
    implementationSurfaces: [],
    runnerCatalog: registeredRunnerCatalog,
  });
  assert.equal(result.ok, true, `${caseId} plan creation must succeed`);
  assert.equal(result.value.plan.status, "approved");
  return result.value.plan;
}

async function runBuildCase(caseId, plan, runnerCatalog, extraOptions = {}) {
  const caseRoot = path.join(evidenceRoot, caseId);
  const projectRoot = path.join(caseRoot, "project");
  await fs.rm(caseRoot, { recursive: true, force: true });
  await fs.mkdir(projectRoot, { recursive: true });
  const planPath = await writeJson(path.join(projectRoot, "implementation-plan.json"), plan);
  const result = await runBuildFromImplementationPlan({
    implementationPlanPath: planPath,
    evidenceRoot: path.join(caseRoot, "evidence"),
    workRoot: path.join(caseRoot, "work"),
    projectRoot,
    runId: `build-discipline-${caseId}`,
    runnerCatalog,
    now: "2026-07-01T01:00:00.000Z",
    ...extraOptions,
  });
  await writeJson(path.join(caseRoot, "result.json"), result);
  return { result, caseRoot, projectRoot, planPath };
}

function requiredItem(plan, id) {
  const item = plan.verificationDelta.requiredItems.find((entry) => entry.id === id);
  assert.ok(item, `required item ${id} must exist`);
  return item;
}

function schematicUsageFromPlanEntry(entry) {
  const slug = entry.schematicRef.artifactId;
  return {
    schematicManifestRef: entry.schematicRef,
    inputRef: entry.plannedInputsRef,
    dryRunStatus: "passed",
    conflictStatus: "none",
    outputPaths: [
      typeof entry.plannedInputsRef?.path === "string" && entry.plannedInputsRef.path.length > 0
        ? entry.plannedInputsRef.path
        : `${slug}/outputs`,
    ],
  };
}

function unplannedSchematicUsage() {
  return {
    schematicManifestRef: {
      rel: "manifest_for",
      artifactKind: "schematic_manifest",
      artifactId: "unplanned-schematic",
      path: "packages/schematics/templates/unplanned-schematic/manifest.json",
      required: true,
      statusAtLinkTime: "current",
    },
    inputRef: {
      rel: "derived_from",
      artifactKind: "implementation_plan",
      artifactId: "unplanned-schematic-inputs",
      path: "unplanned/inputs.json",
      required: true,
      statusAtLinkTime: "current",
    },
    dryRunStatus: "passed",
    conflictStatus: "none",
    outputPaths: ["unplanned/output.ts"],
  };
}

function schematicSlugFromUsage(entry) {
  return entry.schematicManifestRef.artifactId;
}

function plannedSchematicSlugs(plan) {
  return plan.schematics.map((entry) => entry.schematicRef.artifactId).sort();
}

function assertBlocked(result, expectedReason, summaryPattern) {
  assert.equal(result.ok, false, `${expectedReason} must block`);
  assert.equal(result.reason, expectedReason);
  const serialized = JSON.stringify(result);
  assert.match(serialized, summaryPattern);
}

async function run() {
  await fs.mkdir(evidenceRoot, { recursive: true });
  const cases = [];

  const appPlan = await createAppPlan("positive-registered");
  const positive = await runBuildCase("positive-registered", appPlan, registeredRunnerCatalog);
  assert.equal(positive.result.ok, true, positive.result.reason ?? "positive build must pass");
  assert.equal(positive.result.value.buildResult.status, "passed");
  assert.equal(validateArtifactKind("build_result", positive.result.value.buildResult).ok, true);
  assert.equal(positive.result.value.buildResult.schematicsUsed.length, 3);
  assert.deepEqual(
    positive.result.value.buildResult.schematicsUsed.map(schematicSlugFromUsage).sort(),
    plannedSchematicSlugs(appPlan),
  );
  assert.ok(
    positive.result.value.verificationResult.executedItems.includes("architecture-agent-review"),
  );
  assert.ok(
    positive.result.value.buildResult.verificationRuns.some((run) =>
      run.evidencePacketRef.artifactId.includes("architecture-agent-review"),
    ),
  );
  const registry = JSON.parse(
    await fs.readFile(path.join(positive.projectRoot, ".vibe/registry/runner-catalog.json"), "utf8"),
  );
  assert.ok(registry.some((entry) => entry.id === "architecture-agent-review"));
  cases.push({ id: "positive-registered", status: "passed" });

  const explicitPlannedPlusExtra = await runBuildCase(
    "positive-planned-plus-unplanned-schematic-warning",
    clone(appPlan),
    registeredRunnerCatalog,
    {
      schematicsUsed: [...appPlan.schematics.map(schematicUsageFromPlanEntry), unplannedSchematicUsage()],
    },
  );
  assert.equal(
    explicitPlannedPlusExtra.result.ok,
    true,
    explicitPlannedPlusExtra.result.reason ?? "explicit planned schematic build must pass",
  );
  assert.ok(
    explicitPlannedPlusExtra.result.value.buildResult.warningsAndBlockers.some(
      (entry) => entry.blocking === false && /unplanned schematic/i.test(entry.summary),
    ),
  );
  cases.push({ id: "positive-planned-plus-unplanned-schematic-warning", status: "passed" });

  const missingSchematicPlan = clone(appPlan);
  missingSchematicPlan.schematics = [];
  const missingSchematic = await runBuildCase(
    "negative-missing-schematic",
    missingSchematicPlan,
    registeredRunnerCatalog,
  );
  assertBlocked(missingSchematic.result, "planned_schematics_missing", /planned schematics/i);
  cases.push({ id: "negative-missing-schematic", status: "blocked" });

  const docsPlan = await createDocsPlan("prose-only");
  const proseOnlyPlan = clone(docsPlan);
  const proseItem = requiredItem(proseOnlyPlan, "ai_eval");
  proseItem.action = "not_applicable";
  proseItem.blocking = true;
  proseItem.rationale = "Prose-only/manual AI evaluation cannot be a blocking build gate.";
  const proseOnly = await runBuildCase("negative-prose-only", proseOnlyPlan, registeredRunnerCatalog);
  assertBlocked(proseOnly.result, "verification_failed_blocks_build", /skipped|prose-only|not_applicable/i);
  cases.push({ id: "negative-prose-only", status: "blocked" });

  const missingRunnerPlan = clone(appPlan);
  const missingRunnerCatalog = registeredRunnerCatalog.filter((entry) => entry.id !== "typecheck");
  const missingRunner = await runBuildCase(
    "negative-missing-runner",
    missingRunnerPlan,
    missingRunnerCatalog,
  );
  assertBlocked(missingRunner.result, "verification_failed_blocks_build", /no matching blocking runner|No runner catalog entry/i);
  cases.push({ id: "negative-missing-runner", status: "blocked" });

  const skippedArchitecturePlan = clone(appPlan);
  const archItem = requiredItem(skippedArchitecturePlan, "architecture-agent-review");
  archItem.action = "not_applicable";
  archItem.blocking = true;
  archItem.rationale = "Architecture review was incorrectly skipped.";
  const skippedArchitecture = await runBuildCase(
    "negative-skipped-architecture-review",
    skippedArchitecturePlan,
    registeredRunnerCatalog,
  );
  assertBlocked(
    skippedArchitecture.result,
    "verification_failed_blocks_build",
    /architecture-agent-review.*skipped|skipped.*architecture-agent-review/i,
  );
  cases.push({ id: "negative-skipped-architecture-review", status: "blocked" });

  const failedRunnerCatalog = registeredRunnerCatalog.map((entry) =>
    entry.id === "unit" ? { ...entry, targetPath: "missing-implementation-plan.json" } : entry,
  );
  const failedBlocking = await runBuildCase(
    "negative-failed-blocking-check",
    clone(appPlan),
    failedRunnerCatalog,
  );
  assertBlocked(failedBlocking.result, "verification_failed_blocks_build", /unit|failed|SCHEMA_OR_CONTRACT_FAILURE/i);
  cases.push({ id: "negative-failed-blocking-check", status: "blocked" });

  const emptySchematicsUsed = await runBuildCase(
    "negative-empty-schematics-used",
    clone(appPlan),
    registeredRunnerCatalog,
    { schematicsUsed: [] },
  );
  assertBlocked(emptySchematicsUsed.result, "empty_schematics_used_blocks_build", /EMPTY_SCHEMATICS_USED|schematicsUsed empty/i);
  cases.push({ id: "negative-empty-schematics-used", status: "blocked" });

  const unplannedOnlySchematicsUsed = await runBuildCase(
    "negative-unplanned-only-schematics-used",
    clone(appPlan),
    registeredRunnerCatalog,
    { schematicsUsed: [unplannedSchematicUsage()] },
  );
  assertBlocked(
    unplannedOnlySchematicsUsed.result,
    "planned_schematics_used_missing",
    /PLANNED_SCHEMATICS_USED_MISSING|every planned schematic/i,
  );
  cases.push({ id: "negative-unplanned-only-schematics-used", status: "blocked" });

  const summary = {
    schemaVersion: "build-discipline-witness.v1",
    generatedAt: new Date().toISOString(),
    cases,
    assertions: [
      "positive build runs registered blocking verification including architecture-agent-review and writes Build Result verification refs",
      "planned schematic handoff is required before build closure",
      "blocking prose-only/not-applicable verification is rejected after verification evidence is recorded",
      "missing blocking runner catalog entries block the build",
      "skipped architecture-agent-review blocks the build",
      "failed blocking verification packets block the build",
      "empty schematicsUsed is rejected when schematics were planned",
      "non-empty schematicsUsed that omits planned schematic slugs is rejected",
      "unplanned schematic extras are advisory only after all planned schematic slugs are represented",
    ],
  };
  await writeJson(path.join(evidenceRoot, "summary.json"), summary);
  console.log(`build discipline witnesses passed: ${cases.length} cases`);
}

run().catch(async (error) => {
  await fs.mkdir(evidenceRoot, { recursive: true });
  await writeJson(path.join(evidenceRoot, "failure.json"), {
    schemaVersion: "build-discipline-witness.v1",
    failedAt: new Date().toISOString(),
    message: error?.message ?? String(error),
    stack: error?.stack,
  });
  console.error(error);
  process.exitCode = 1;
});
