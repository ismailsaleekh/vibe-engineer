#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createImplementationPlanFromWorkBriefIntake } from "../../src/plan/orchestrator/plan-skill.js";
import { createDefaultArchitectureRunnerCatalogEntry } from "../../src/shared/verification-discipline.js";

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
    ".pi/autopilot/vibe-engineer-improvements/evidence/implement-plan-skill-verification-discipline/plan-witnesses",
);

const qualityRunnerCatalog = [
  {
    kind: "command",
    id: "starter:typecheck",
    requiredItemIds: ["typecheck", "starter-typecheck"],
    layer: "typecheck",
    blocking: true,
  },
  {
    kind: "command",
    id: "starter:lint-format",
    requiredItemIds: ["lint_format", "starter-lint-format"],
    layer: "lint_format",
    blocking: true,
  },
  {
    kind: "command",
    id: "starter:unit",
    requiredItemIds: ["unit", "starter-unit"],
    layer: "unit",
    blocking: true,
  },
  {
    kind: "command",
    id: "starter:build-package",
    requiredItemIds: ["build_package", "starter-build-package"],
    layer: "build_package",
    blocking: true,
  },
];

function extensionOf(plan) {
  const extension = plan.extensions?.["dev.vibe.plan-build-discipline"];
  assert.ok(extension, "plan-build discipline extension must be present");
  return extension;
}

function classification(extension, itemIdOrLayer) {
  const found = extension.verificationPlan.classifications.find(
    (entry) => entry.itemId === itemIdOrLayer || entry.layer === itemIdOrLayer,
  );
  assert.ok(found, `classification ${itemIdOrLayer} must exist`);
  return found;
}

async function createPlan(caseId, options) {
  const result = await createImplementationPlanFromWorkBriefIntake(workBriefDescriptor, {
    artifactId: `plan-discipline-${caseId}`,
    now: "2026-07-01T00:00:00.000Z",
    runId: `run-plan-discipline-${caseId}`,
    ...options,
  });
  assert.equal(result.ok, true, `${caseId} plan creation must succeed: ${result.reason ?? ""}`);
  return result.value.plan;
}

function assertArchitectureBuildMustRegister(plan, harnessId) {
  const extension = extensionOf(plan);
  const architecture = classification(extension, "architecture-agent-review");
  assert.equal(architecture.layer, "advisory_review");
  assert.equal(architecture.layerEquivalent, "architecture_review");
  assert.equal(architecture.classification, "build-must-register");
  assert.equal(architecture.blocking, true);
  assert.equal(architecture.runnerRegistered, false);
  assert.equal(architecture.runnerCatalogEntry.id, "architecture-agent-review");
  assert.equal(architecture.runnerCatalogEntry.runnerType, "agent");
  assert.equal(architecture.runnerCatalogEntry.vibeEngineerHarness.adapterId, harnessId);
  assert.equal(architecture.runnerCatalogEntry.vibeEngineerHarness.noFallbackToPi, true);
  assert.match(architecture.selectedHarnessImplication, /selected harness/u);
  assert.equal(extension.verificationPlan.architectureAgentReview.required, true);
  const deltaItem = plan.verificationDelta.requiredItems.find(
    (item) => item.id === "architecture-agent-review",
  );
  assert.ok(deltaItem, "Verification Delta must contain architecture-agent-review item");
  assert.equal(deltaItem.layer, "advisory_review");
  assert.equal(deltaItem.action, "add");
  assert.equal(deltaItem.blocking, true);
}

async function run() {
  await fs.mkdir(evidenceRoot, { recursive: true });
  const cases = [];

  const docsOnly = await createPlan("docs-only", {
    affectedAreas: [
      {
        kind: "docs",
        path: "docs/usage.md",
        reason: "Documentation-only wording update without app implementation surfaces.",
      },
    ],
    implementationSurfaces: [],
    runnerCatalog: qualityRunnerCatalog,
  });
  {
    const extension = extensionOf(docsOnly);
    assert.equal(docsOnly.status, "approved");
    assert.deepEqual(extension.schematicPlan.applicable, []);
    assert.match(extension.schematicPlan.noneJustification, /not applicable/u);
    assert.equal(extension.verificationPlan.architectureAgentReview.required, false);
    assert.equal(extension.selectedHarness.id, "pi");
    assert.ok(extension.selectedHarness.implications.some((entry) => entry.includes("selected pi")));
    assert.equal(classification(extension, "typecheck").classification, "registered");
    assert.equal(classification(extension, "ai_eval").classification, "not-applicable");
    assert.equal(classification(extension, "advisory_review").classification, "advisory");
    cases.push({ id: "docs-only", status: docsOnly.status });
    await fs.writeFile(
      path.join(evidenceRoot, "docs-only-plan.json"),
      `${JSON.stringify(docsOnly, null, 2)}\n`,
    );
  }

  const appPlan = await createPlan("app-surfaces", {
    affectedAreas: [
      { kind: "app", path: "apps/api/src/orders", reason: "Add backend feature module." },
      { kind: "app", path: "apps/web/src/routes/orders", reason: "Add web route." },
      { kind: "app", path: "apps/mobile/src/screens/orders", reason: "Add mobile screen." },
    ],
    implementationSurfaces: ["backend", "web", "mobile"],
    selectedHarness: "codex",
    runnerCatalog: qualityRunnerCatalog,
  });
  {
    const extension = extensionOf(appPlan);
    assert.equal(appPlan.status, "approved");
    assert.equal(extension.selectedHarness.id, "codex");
    assert.ok(
      extension.selectedHarness.implications.some((entry) => entry.includes("selected codex")),
    );
    assert.deepEqual(
      extension.schematicPlan.applicable.map((entry) => entry.slug).sort(),
      ["expo-screen-flow", "nest-feature-module", "react-route-module"],
    );
    assert.deepEqual(extension.schematicPlan.gaps, []);
    assert.equal(appPlan.schematics.length, 3);
    assertArchitectureBuildMustRegister(appPlan, "codex");
    assert.equal(classification(extension, "typecheck").classification, "registered");
    cases.push({ id: "app-surfaces", status: appPlan.status });
    await fs.writeFile(
      path.join(evidenceRoot, "app-surfaces-plan.json"),
      `${JSON.stringify(appPlan, null, 2)}\n`,
    );
  }

  const architectureRegistered = await createPlan("architecture-registered", {
    affectedAreas: [
      { kind: "app", path: "apps/api/src/orders", reason: "Add backend feature module." },
    ],
    implementationSurfaces: ["backend"],
    runnerCatalog: [
      ...qualityRunnerCatalog,
      createDefaultArchitectureRunnerCatalogEntry({ selectedHarness: "pi" }),
    ],
  });
  {
    const extension = extensionOf(architectureRegistered);
    const architecture = classification(extension, "architecture-agent-review");
    assert.equal(architecture.classification, "registered");
    assert.equal(architecture.runnerRegistered, true);
    assert.equal(architecture.runnerCatalogEntry, undefined);
    assert.equal(extension.verificationPlan.architectureAgentReview.required, true);
    cases.push({ id: "architecture-registered", status: architectureRegistered.status });
  }

  const schematicGap = await createPlan("schematic-gap", {
    affectedAreas: [
      { kind: "app", path: "apps/api/src/orders", reason: "Add backend feature module." },
    ],
    implementationSurfaces: ["backend"],
    availableSchematics: ["react-route-module"],
    runnerCatalog: qualityRunnerCatalog,
  });
  {
    const extension = extensionOf(schematicGap);
    assert.equal(schematicGap.status, "blocked");
    assert.equal(extension.schematicPlan.gaps.length, 1);
    assert.equal(extension.schematicPlan.gaps[0].slug, "nest-feature-module");
    assert.equal(extension.schematicPlan.gaps[0].blocking, true);
    assert.ok(
      schematicGap.openBlockers.some((item) => item.id === "blocker-schematic-nest-feature-module"),
    );
    assertArchitectureBuildMustRegister(schematicGap, "pi");
    cases.push({ id: "schematic-gap", status: schematicGap.status });
  }

  const manualAdvisory = await createPlan("manual-advisory", {
    affectedAreas: [
      {
        kind: "docs",
        path: "docs/evaluation.md",
        reason: "Document non-blocking model evaluation guidance.",
      },
    ],
    implementationSurfaces: [],
    verificationRequirements: [
      {
        layer: "ai_eval",
        itemId: "model-review-note",
        classification: "manual-only",
        blocking: false,
        rationale: "Human-only model review is advisory for this docs change.",
      },
      {
        layer: "observability",
        itemId: "logs-advisory-note",
        classification: "advisory",
        blocking: false,
        rationale: "No executable log check is needed for this docs-only change.",
      },
    ],
  });
  {
    const extension = extensionOf(manualAdvisory);
    assert.equal(manualAdvisory.status, "approved");
    assert.equal(classification(extension, "model-review-note").classification, "manual-only");
    assert.equal(classification(extension, "logs-advisory-note").classification, "advisory");
    cases.push({ id: "manual-advisory", status: manualAdvisory.status });
  }

  const falseRegistered = await createPlan("false-registered", {
    affectedAreas: [
      {
        kind: "docs",
        path: "docs/integration.md",
        reason: "Attempt to claim a registered runner that is not in the catalog.",
      },
    ],
    implementationSurfaces: [],
    verificationRequirements: [
      {
        layer: "integration",
        itemId: "missing-integration-runner",
        classification: "registered",
        blocking: true,
        rationale: "Registered verification must correspond to a catalog runner.",
      },
    ],
  });
  {
    const extension = extensionOf(falseRegistered);
    assert.equal(falseRegistered.status, "blocked");
    assert.equal(classification(extension, "missing-integration-runner").classification, "registered");
    assert.ok(
      falseRegistered.openBlockers.some(
        (item) => item.id === "blocker-runner-missing-missing-integration-runner",
      ),
    );
    cases.push({ id: "false-registered", status: falseRegistered.status });
  }

  const blockingManual = await createPlan("blocking-manual", {
    affectedAreas: [
      {
        kind: "docs",
        path: "docs/evaluation.md",
        reason: "Attempt to make manual evidence a blocking gate.",
      },
    ],
    implementationSurfaces: [],
    verificationRequirements: [
      {
        layer: "ai_eval",
        itemId: "manual-blocking-review",
        classification: "manual-only",
        blocking: true,
        rationale: "Blocking verification cannot be prose-only/manual-only.",
      },
    ],
  });
  {
    const extension = extensionOf(blockingManual);
    assert.equal(blockingManual.status, "blocked");
    assert.equal(classification(extension, "manual-blocking-review").classification, "manual-only");
    assert.ok(
      blockingManual.openBlockers.some(
        (item) => item.id === "blocker-verification-manual-blocking-review",
      ),
    );
    cases.push({ id: "blocking-manual", status: blockingManual.status });
  }

  const summary = {
    schemaVersion: "plan-discipline-witness.v1",
    generatedAt: new Date().toISOString(),
    cases,
    assertions: [
      "applicable schematics are listed for backend/web/mobile implementation surfaces",
      "docs-only plans justify no applicable schematics",
      "missing required schematics produce blocking schematic gaps",
      "verification classifications cover registered, build-must-register, not-applicable, advisory, and manual-only states",
      "architecture-agent-review is required for backend/web/mobile implementation changes",
      "selected harness implications are present and runner registration forbids Pi fallback",
      "registered verification claims without a matching catalog runner are rejected",
      "blocking manual-only verification is rejected with a planner blocker",
    ],
  };
  await fs.writeFile(path.join(evidenceRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`plan discipline witnesses passed: ${cases.length} cases`);
}

run().catch(async (error) => {
  await fs.mkdir(evidenceRoot, { recursive: true });
  await fs.writeFile(
    path.join(evidenceRoot, "failure.json"),
    `${JSON.stringify(
      {
        schemaVersion: "plan-discipline-witness.v1",
        failedAt: new Date().toISOString(),
        message: error?.message ?? String(error),
        stack: error?.stack,
      },
      null,
      2,
    )}\n`,
  );
  console.error(error);
  process.exitCode = 1;
});
