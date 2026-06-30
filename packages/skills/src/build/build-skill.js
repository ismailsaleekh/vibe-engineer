// Build skill core: drives the plan → implementation-hooks → verify → context → evidence
// → Build Result pipeline deterministically. Failed verification MUST block (DL-10): a
// non-green verification never yields a passed Build Result.
//
// Consumes ONLY public package contracts:
//   - @vibe-engineer/artifacts  (validate Implementation Plan in, Build Result out, Evidence Packets)
//   - @vibe-engineer/verification (runVerificationPlan; selects layers from the plan Verification Delta)
//   - @vibe-engineer/context     (writeContextProject — real context graph update within owned paths)
//   - @vibe-engineer/orchestration (typed run-state / failure routing — via implementation-hooks)

import fs from "node:fs/promises";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { validateArtifactFile, validateArtifactKind } from "@vibe-engineer/artifacts";
import { runVerificationPlan, VERIFICATION_STATUSES } from "@vibe-engineer/verification";
import { writeContextProject } from "@vibe-engineer/context";
import { writeJsonAtomic } from "../shared/atomic-json-writer.js";
import { deterministicArtifactId } from "../shared/time-id.js";
import { blocked, ok, validationBlocked } from "../shared/result.js";
import {
  initializeBuildRunState,
  runImplementationHooks,
  routeVerificationOutcome,
} from "./implementation-hooks.js";
import { runSelectedHarnessPath } from "./selected-harness.js";

const BUILD_PRODUCER = Object.freeze({
  kind: "skill",
  id: "skill-build",
  name: "build",
  version: "1.0.0",
});

const BUILD_OWNERSHIP = Object.freeze({
  ownerLane: "I-21-build-skill-orchestration",
  ownedWritePaths: Object.freeze([
    "packages/skills/src/build/**",
    "packages/skills/src/ship/intake/**",
    "packages/cli/src/commands/build/**",
    ".vibe/work/I-21-build-skill-orchestration/**",
  ]),
  readOnlyPaths: Object.freeze([
    "packages/artifacts/**",
    "packages/orchestration/**",
    "packages/context/**",
    "packages/verification/**",
    "packages/adapters/pi/**",
    "packages/cli/src/{entry,envelope,command-loader,errors,testing}/**",
  ]),
  untouchablePaths: Object.freeze([
    ".git/**",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "package.json",
    "packages/cli/package.json",
    "packages/skills/package.json",
    "packages/artifacts/schemas/**",
    "packages/skills/src/ship/orchestrator/**",
    "packages/cli/src/commands/ship/**",
  ]),
  concurrencyNotes:
    "Build skill owns build/**, ship/intake/**, cli build command, and its own work dir; ship orchestrator remains I-22.",
  handoffPolicy:
    "Build Result artifacts require independent validation before downstream ship intake (I-22).",
});

const GREEN_STATUSES = new Set([
  VERIFICATION_STATUSES.PASSED,
  VERIFICATION_STATUSES.ADVISORY_WARNING,
]);

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(field, message, code = "INVALID_INPUT") {
  return Object.freeze({ field, code, message });
}

function nowIso(options) {
  if (options && typeof options.now === "string" && options.now.length > 0) return options.now;
  return new Date().toISOString();
}

function requireOptionsObject(options) {
  if (!isPlainObject(options)) {
    return blocked("invalid_build_options", {
      errors: Object.freeze([
        validationError(
          "options",
          "Build options must be a structured object, not prose or raw chat.",
        ),
      ]),
    });
  }
  return ok(options);
}

function readJsonSafe(filePath) {
  return readFile(filePath, "utf8")
    .then((text) => JSON.parse(text))
    .catch(() => null);
}

/**
 * Resolve a build-scoped work root under the caller-supplied evidence root, ensuring the
 * build skill writes ONLY within owned paths.
 */
function resolveWorkRoot(options) {
  const evidenceRoot = typeof options.evidenceRoot === "string" ? options.evidenceRoot : "";
  if (evidenceRoot.length === 0)
    return blocked("invalid_evidence_root", {
      errors: Object.freeze([
        validationError("evidenceRoot", "evidenceRoot must be a non-empty path."),
      ]),
    });
  const workRoot =
    typeof options.workRoot === "string" && options.workRoot.length > 0
      ? options.workRoot
      : path.join(evidenceRoot, "build-work");
  return ok({ evidenceRoot: path.resolve(evidenceRoot), workRoot: path.resolve(workRoot) });
}

function changedFilesFromPlan(plan, buildResultPath) {
  const areas = Array.isArray(plan.affectedAreas) ? plan.affectedAreas : [];
  const summary = areas
    .filter(
      (area) =>
        isPlainObject(area) && typeof area.path === "string" && typeof area.reason === "string",
    )
    .map((area) => ({
      path: area.path,
      changeKind: "unchanged_validated",
      ownerLane: "I-21-build-skill-orchestration",
      summary: `Build validated declared affected area: ${area.reason}`,
    }));
  summary.push({
    path: buildResultPath,
    changeKind: "created",
    ownerLane: "I-21-build-skill-orchestration",
    summary: "Build skill produced this schema-valid Build Result artifact.",
  });
  return summary;
}

function verificationRunsFromPackets(packetPaths, packetsById) {
  return packetPaths.map((packetPath) => {
    const packet = packetsById[packetPath] ?? {};
    const artifactId =
      typeof packet.artifactId === "string"
        ? packet.artifactId
        : path.basename(packetPath, ".json");
    const result = typeof packet.result === "string" ? packet.result : "pass";
    const pktStatus = typeof packet.status === "string" ? packet.status : "passed";
    return {
      evidencePacketRef: {
        rel: "evidence_for",
        artifactKind: "evidence_packet",
        artifactId,
        path: packetPath,
        required: true,
        statusAtLinkTime: pktStatus,
      },
      summary:
        typeof packet.title === "string" && packet.title.length > 0
          ? packet.title
          : `Verification evidence ${artifactId}`,
      result,
      blocking: packet.blocking === true,
    };
  });
}

/**
 * Update the context graph via the real @vibe-engineer/context public API, scoped to an
 * owned work root (the build skill never writes the repo's .vibe/context). Returns a real
 * context_file_header path + validation.
 */
async function updateContextForBuild({
  projectRoot,
  workRoot,
  runId,
  plan,
  buildResultArtifactId,
  now,
}) {
  const contextProjectRoot = path.join(workRoot, "context");
  const graphId = `build-context-${runId}`;
  const planArtifactId =
    typeof plan.artifactId === "string" ? plan.artifactId : "implementation-plan";
  const sourceId = `src-build-${runId}`;
  const relativeSourcePath = path.join("sources", `${sourceId}.md`);
  const sources = [
    {
      sourceId,
      kind: "artifact",
      relativePath: relativeSourcePath,
      content: `# Build context for ${planArtifactId}\nBuild Result ${buildResultArtifactId} produced by the build skill.\n`,
      artifactRef: {
        artifactKind: "build_result",
        artifactId: buildResultArtifactId,
        path: relativeSourcePath,
        required: true,
      },
      level: 1,
    },
  ];
  const areas = [
    {
      areaId: "build-result",
      title: `Build Result context for ${planArtifactId}`,
      owner: "vibe-engineer-build",
      level: 1,
      mandatory: true,
      sourceRefs: [sourceId],
      context: [
        {
          contextId: `ctx-build-${runId}`,
          level: 1,
          mandatory: true,
          text: `Build skill produced Build Result ${buildResultArtifactId} consuming approved Implementation Plan ${planArtifactId}.`,
          sourceRefs: [sourceId],
          citationRefs: [`${sourceId}:sha256`],
        },
      ],
      scope: {
        kind: "repo",
        paths: ["packages/skills/src/build"],
        description: "Build skill context closure.",
      },
    },
  ];
  const ctx = await writeContextProject({
    projectRoot: contextProjectRoot,
    generatedAt: now,
    producer: { ...BUILD_PRODUCER, runId },
    graphId,
    reset: true,
    sources,
    areas,
  });
  const headerPath = path.join(
    contextProjectRoot,
    ".vibe",
    "context",
    "index",
    "context-graph.header.json",
  );
  const headerValidation = validateArtifactFile(headerPath, { kind: "context_file_header" });
  const graphValidation = validateArtifactFile(ctx.graphPath.replace(/\\/g, "/"), {
    kind: "context_file_header",
  }).ok
    ? { ok: true }
    : { ok: false, path: ctx.graphPath };
  return {
    contextProjectRoot,
    graphPath: ctx.graphPath,
    indexPath: ctx.indexPath,
    headerPath,
    headerValidation,
    graphHeaderValid: graphValidation.ok,
    sourceRef: {
      rel: "context_for",
      artifactKind: "context_file_header",
      artifactId: `ctx-index-graph`,
      path: path.relative(projectRoot, headerPath).split(path.sep).join("/"),
      required: true,
      statusAtLinkTime: "current",
    },
  };
}

function assembleBuildResult({
  plan,
  planPath,
  runId,
  verificationResult,
  packetPaths,
  packetsById,
  contextUpdate,
  harness,
  hooks,
  buildResultPath,
  now,
}) {
  const planArtifactId =
    typeof plan.artifactId === "string" ? plan.artifactId : "implementation-plan";
  const buildArtifactId = deterministicArtifactId("build", [runId, planArtifactId, now]);
  const producer = { ...BUILD_PRODUCER, runId };
  const planLink = {
    rel: "implements",
    artifactKind: "implementation_plan",
    artifactId: planArtifactId,
    path: planPath,
    required: true,
    statusAtLinkTime: "approved",
  };
  const verificationRuns = verificationRunsFromPackets(packetPaths, packetsById);
  const advisoryFindings = [];
  if (harness && harness.ok && harness.pendingLive) {
    advisoryFindings.push(
      `Selected-harness live-skill-execution seam (I-14B) is ${harness.pendingLive.status}: missing ${harness.pendingLive.prerequisite}`,
    );
  }
  if (verificationResult.status === VERIFICATION_STATUSES.ADVISORY_WARNING) {
    advisoryFindings.push(
      "Verification completed with advisory-only findings; build remains green.",
    );
  }
  const buildResult = {
    schemaVersion: "1.0.0",
    artifactKind: "build_result",
    artifactId: buildArtifactId,
    title: `Build Result for ${planArtifactId}`,
    createdAt: now,
    updatedAt: now,
    producer,
    status: "passed",
    ownership: BUILD_OWNERSHIP,
    links: [planLink],
    extensions: {
      "dev.vibe.build": {
        schemaVersion: "1.0.0",
        runId,
        verificationStatus: verificationResult.status,
        hookCount: hooks.hooks.length,
        harnessDeterministic: harness && harness.ok ? harness.summary.deterministicPath : null,
      },
    },
    implementationPlanRef: planLink,
    implementationSummary: `Build skill consumed approved Implementation Plan ${planArtifactId}, drove ${hooks.hooks.length} implementation hooks, ran verification (status ${verificationResult.status}), and updated the context graph.`,
    changedFilesSummary: changedFilesFromPlan(plan, buildResultPath),
    schematicsUsed: [],
    testsAndVerificationChanged: [],
    verificationRuns,
    warningsAndBlockers: [],
    contextDocsUpdates: [
      {
        ref: contextUpdate.sourceRef,
        updateStatus: "updated",
        summary: `Context graph ${contextUpdate.graphPath} updated via @vibe-engineer/context; context_file_header validated (${contextUpdate.headerValidation.ok ? "ok" : "failed"}).`,
      },
    ],
    finalStatusReason: `Verification status '${verificationResult.status}' is green; build passed with ${verificationRuns.length} evidence packet(s).`,
    advisoryFindings,
  };
  return buildResult;
}

/**
 * Run the build skill over an approved Implementation Plan.
 *
 * @param {object} options
 * @param {string} options.implementationPlanPath - approved Implementation Plan (.json).
 * @param {string} options.evidenceRoot            - owned root for build evidence/work.
 * @param {string} options.projectRoot             - repo project root (read-only containment).
 * @param {string} options.runId                   - stable lowercase artifact id segment.
 * @param {object[]} options.runnerCatalog         - typed verification runner catalog.
 * @param {string} [options.workRoot]              - override owned work root.
 * @param {string} [options.now]                   - deterministic timestamp override.
 * @returns {Promise<{ok:true,...}|{ok:false,...}>}
 */
export async function runBuildFromImplementationPlan(options) {
  const optionsResult = requireOptionsObject(options);
  if (!optionsResult.ok) return optionsResult;

  const required = [
    "implementationPlanPath",
    "evidenceRoot",
    "projectRoot",
    "runId",
    "runnerCatalog",
  ];
  for (const key of required) {
    if (
      options[key] === undefined ||
      options[key] === null ||
      (typeof options[key] === "string" && options[key].length === 0)
    ) {
      return blocked("invalid_build_options", {
        errors: Object.freeze([validationError(key, `Build requires ${key}.`)]),
      });
    }
  }
  if (!/^[a-z0-9][a-z0-9._:-]*$/.test(options.runId)) {
    return blocked("invalid_run_id", {
      errors: Object.freeze([
        validationError("runId", "runId must be a stable lowercase artifact id segment."),
      ]),
    });
  }
  if (
    !Array.isArray(options.runnerCatalog) ||
    options.runnerCatalog.some((entry) => !isPlainObject(entry))
  ) {
    return validationBlocked("build_runner_catalog", [
      validationError("runnerCatalog", "runnerCatalog must be an array of typed runner objects."),
    ]);
  }
  const roots = resolveWorkRoot(options);
  if (!roots.ok) return roots;
  const { evidenceRoot, workRoot } = roots.value;
  const projectRoot = path.resolve(options.projectRoot);
  const now = nowIso(options);

  // W1 — load + validate the approved Implementation Plan through the real artifacts validator.
  const planValidation = validateArtifactFile(options.implementationPlanPath, {
    kind: "implementation_plan",
  });
  if (!planValidation.ok) {
    return validationBlocked("build_intake_implementation_plan", [
      validationError(
        "implementationPlanPath",
        "Implementation Plan failed public schema validation.",
        "PLAN_INVALID",
      ),
    ]);
  }
  const plan = planValidation.artifact;
  if (plan.status !== "approved") {
    return blocked("plan_not_approved", {
      errors: Object.freeze([
        validationError(
          "implementationPlanPath",
          `Implementation Plan status must be approved before build can run (got '${plan.status}').`,
          "PLAN_NOT_APPROVED",
        ),
      ]),
      planStatus: plan.status,
    });
  }

  // Implementation hooks — initialize I-03 typed run-state and drive the hook record.
  await fs.mkdir(workRoot, { recursive: true });
  const setup = await initializeBuildRunState(plan, {
    runId: options.runId,
    workRoot,
    ownedWritePaths: BUILD_OWNERSHIP.ownedWritePaths,
    now,
  });
  const hooks = await runImplementationHooks(setup, {
    changedAreas: Array.isArray(plan.affectedAreas) ? plan.affectedAreas : [],
  });

  // W2 — invoke the real verification runner, selecting layers from the plan Verification Delta.
  let verificationResult;
  try {
    const raw = await runVerificationPlan({
      implementationPlanPath: options.implementationPlanPath,
      evidenceRoot,
      projectRoot,
      runId: options.runId,
      runnerCatalog: options.runnerCatalog,
    });
    verificationResult = isPlainObject(raw)
      ? raw
      : {
          status: "failed",
          failures: [
            {
              code: "INVALID_RUNNER_RESULT",
              classification: "schema_or_contract_failure",
              message: "Runner returned a malformed result.",
            },
          ],
        };
  } catch (error) {
    const code =
      isPlainObject(error) && typeof error.code === "string" ? error.code : "RUNNER_EXCEPTION";
    return blocked("verification_runner_exception", {
      errors: Object.freeze([
        validationError("verification", `Verification runner rejected the request: ${code}`, code),
      ]),
      runnerCode: code,
    });
  }

  const packetPaths = Array.isArray(verificationResult.evidencePackets)
    ? verificationResult.evidencePackets.map(String)
    : [];
  const packetsById = {};
  for (const packetPath of packetPaths) {
    const packetValidation = validateArtifactFile(packetPath, { kind: "evidence_packet" });
    if (!packetValidation.ok) {
      return validationBlocked("build_evidence_packet", [
        validationError(
          "evidencePackets",
          `Evidence Packet ${packetPath} failed schema validation.`,
        ),
      ]);
    }
    packetsById[packetPath] = packetValidation.artifact;
  }

  const verificationGreen = GREEN_STATUSES.has(verificationResult.status);

  // N2 — failed verification MUST block. Route the failure through I-03 typed state.
  if (!verificationGreen) {
    await routeVerificationOutcome(setup, false, verificationResult.status, packetPaths);
    const primary =
      Array.isArray(verificationResult.failures) && verificationResult.failures[0]
        ? verificationResult.failures[0]
        : null;
    return blocked("verification_failed_blocks_build", {
      errors: Object.freeze([
        validationError(
          "verification",
          `Verification status '${verificationResult.status}' blocks the build (DL-10). No Build Result produced.`,
          "VERIFICATION_NOT_GREEN",
        ),
      ]),
      verificationStatus: verificationResult.status,
      runnerCode: primary && typeof primary.code === "string" ? primary.code : null,
      evidencePackets: packetPaths,
    });
  }

  // W3 — real context graph update within owned paths.
  const buildResultPath = path.join(workRoot, "build-result.json");
  const planArtifactIdCtx =
    typeof plan.artifactId === "string" ? plan.artifactId : "implementation-plan";
  const buildResultArtifactId = deterministicArtifactId("build", [
    options.runId,
    planArtifactIdCtx,
    now,
  ]);
  const contextUpdate = await updateContextForBuild({
    projectRoot,
    workRoot,
    runId: options.runId,
    plan,
    buildResultArtifactId,
    now,
  });

  // W7 — selected-harness deterministic path + honest I-14B pending-live disclosure.
  const harness = runSelectedHarnessPath();

  // W4 — assemble + validate the Build Result through the real artifacts validator.
  const buildResult = assembleBuildResult({
    plan,
    planPath: options.implementationPlanPath,
    runId: options.runId,
    verificationResult,
    packetPaths,
    packetsById,
    contextUpdate,
    harness,
    hooks,
    buildResultPath,
    now,
  });
  const buildValidation = validateArtifactKind("build_result", buildResult);
  if (!buildValidation.ok) {
    return validationBlocked("build_result_public_schema", buildValidation.errors);
  }

  // Green verification → route the build work-package node to 'passed' through I-03.
  const routed = await routeVerificationOutcome(
    setup,
    true,
    verificationResult.status,
    packetPaths,
  );

  return ok({
    buildResult,
    buildResultPath,
    verificationResult,
    evidencePackets: packetPaths,
    contextUpdate,
    harness,
    hooks,
    runState: routed.state,
    planValidation,
    buildValidation,
  });
}

export function resolveBuildResultPath(outputRoot, artifactName) {
  if (typeof outputRoot !== "string" || outputRoot.trim().length === 0) {
    return blocked("invalid_output_root", {
      errors: Object.freeze([
        validationError("outputRoot", "outputRoot must be a non-empty string."),
      ]),
    });
  }
  if (typeof artifactName !== "string" || artifactName.trim().length === 0) {
    return blocked("invalid_artifact_name", {
      errors: Object.freeze([
        validationError("artifactName", "artifactName must be a non-empty string."),
      ]),
    });
  }
  if (path.isAbsolute(artifactName)) {
    return blocked("unsafe_output_path", {
      errors: Object.freeze([
        validationError(
          "artifactName",
          "artifactName must be relative, not absolute.",
          "ABSOLUTE_PATH_REJECTED",
        ),
      ]),
    });
  }
  const root = path.resolve(outputRoot);
  const artifactPath = path.resolve(root, artifactName);
  const relativePath = path.relative(root, artifactPath);
  if (relativePath === "" || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return blocked("unsafe_output_path", {
      errors: Object.freeze([
        validationError(
          "artifactName",
          "artifactName must stay inside outputRoot.",
          "PATH_TRAVERSAL_REJECTED",
        ),
      ]),
    });
  }
  if (path.extname(artifactPath) !== ".json") {
    return blocked("output_carrier_not_json", {
      errors: Object.freeze([
        validationError(
          "artifactName",
          "Build Result carrier must use .json extension.",
          "CARRIER_NOT_JSON",
        ),
      ]),
    });
  }
  return ok({ outputRoot: root, artifactPath, relativePath });
}

export async function persistBuildResult(buildResult, persistence) {
  if (!isPlainObject(buildResult)) {
    return blocked("invalid_build_result", {
      errors: Object.freeze([
        validationError("buildResult", "buildResult must be a structured object."),
      ]),
    });
  }
  if (!isPlainObject(persistence)) {
    return blocked("invalid_persistence_options", {
      errors: Object.freeze([
        validationError("persistence", "Persistence requires outputRoot and artifactName."),
      ]),
    });
  }
  const beforeValidation = validateArtifactKind("build_result", buildResult);
  if (!beforeValidation.ok)
    return validationBlocked("build_result_persist_pre_schema", beforeValidation.errors);
  const artifactName = persistence.artifactName ?? `${buildResult.artifactId}.json`;
  const resolved = resolveBuildResultPath(persistence.outputRoot, artifactName);
  if (!resolved.ok) return resolved;
  await writeJsonAtomic(resolved.value.artifactPath, buildResult);
  const afterValidation = validateArtifactFile(resolved.value.artifactPath, {
    kind: "build_result",
  });
  if (!afterValidation.ok)
    return validationBlocked("build_result_persisted_public_schema", afterValidation.errors);
  return ok({
    filePath: resolved.value.artifactPath,
    relativePath: resolved.value.relativePath,
    beforeValidation,
    afterValidation,
  });
}

export { BUILD_PRODUCER, BUILD_OWNERSHIP };
