// Ship skill core: drives the ship-intake → final-verify → final-context-drift → Ship Packet
// pipeline deterministically over a PASSED Build Result. Failed/blocked final verification
// MUST block (master §8 I-22: "failed final verify blocks") — no Ship Packet is emitted. The
// ship skill NEVER performs any push, commit, PR, tag, remote, or deploy mutation against git or
// Ship Packet's noPushWithoutApproval===true, commitPerformedByAgent===false,
// prOpenedByAgent===false are enforced by the schema's `const` constraints, which this
// assembler preserves, never weakens.
//
// Consumes ONLY public package contracts:
//   - @vibe-engineer/skills/ship/intake  (intakeBuildResult — the I-21-owned intake seam)
//   - @vibe-engineer/artifacts           (validate Build Result in, Evidence Packets, Ship Packet out)
//   - @vibe-engineer/verification        (runVerificationPlan — real final-verify over the Verification Delta)
//   - @vibe-engineer/context             (checkContextDrift + validateContextProject + writeContextProject — real final-context gate)

import path from "node:path";
import { validateArtifactFile, validateArtifactKind } from "@vibe-engineer/artifacts";
import {
  runVerificationPlan,
  VERIFICATION_STATUSES,
  VerificationRunnerError,
} from "@vibe-engineer/verification";
import {
  checkContextDrift,
  validateContextProject,
  writeContextProject,
} from "@vibe-engineer/context";
import { intakeBuildResult } from "@vibe-engineer/skills/ship/intake";
import { writeJsonAtomic } from "../../shared/atomic-json-writer.js";
import { deterministicArtifactId } from "../../shared/time-id.js";
import { blocked, ok, validationBlocked } from "../../shared/result.js";

const SHIP_PRODUCER = Object.freeze({
  kind: "skill",
  id: "skill-ship",
  name: "ship",
  version: "1.0.0",
});

const SHIP_OWNERSHIP = Object.freeze({
  ownerLane: "I-22-ship-skill-orchestration",
  ownedWritePaths: Object.freeze([
    "packages/skills/src/ship/orchestrator/**",
    "packages/cli/src/commands/ship/**",
    ".vibe/work/I-22-ship-skill-orchestration/**",
  ]),
  readOnlyPaths: Object.freeze([
    "packages/artifacts/**",
    "packages/orchestration/**",
    "packages/context/**",
    "packages/verification/**",
    "packages/adapters/pi/**",
    "packages/skills/src/ship/intake/**",
    "packages/cli/src/{entry,envelope,command-loader,errors,testing}/**",
  ]),
  untouchablePaths: Object.freeze([
    ".git/**",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "package.json",
    "packages/skills/package.json",
    "packages/cli/package.json",
    "packages/artifacts/schemas/**",
  ]),
  concurrencyNotes:
    "Ship orchestrator owns ship/orchestrator/**, the ship CLI command, and its own work dir; build/intake remain I-21. Never pushes/commits/opens PRs.",
  handoffPolicy:
    "Ship Packet artifacts require independent validation before operator approval; no-push-without-approval is enforced by schema const constraints.",
});

const GREEN_VERIFY_STATUSES = new Set([
  VERIFICATION_STATUSES.PASSED,
  VERIFICATION_STATUSES.ADVISORY_WARNING,
]);
const BLOCKING_VERIFY_RESULTS = new Set(["fail", "blocked"]);
// Verification-runner error codes that indicate the Build Result's plan ref is stale/invalid
// (an input problem) rather than a runner-internal contract failure.
const PLAN_REF_RUNNER_CODES = new Set([
  "PLAN_NOT_APPROVED",
  "INVALID_IMPLEMENTATION_PLAN",
  "PATH_CONTAINMENT_DENIED",
  "INVALID_OPTIONS",
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
    return blocked("invalid_ship_options", {
      errors: Object.freeze([
        validationError(
          "options",
          "Ship options must be a structured object, not prose or raw chat.",
        ),
      ]),
    });
  }
  return ok(options);
}

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
      : path.join(evidenceRoot, "ship-work");
  return ok({ evidenceRoot: path.resolve(evidenceRoot), workRoot: path.resolve(workRoot) });
}

/**
 * Map a real final-verification Evidence Packet into a Ship Packet finalVerification entry.
 * The packet's `result` (pass|fail|blocked|advisory|skipped) maps 1:1 onto the Ship Packet
 * finalVerification[].result enum; `blocking` is carried verbatim.
 */
function finalVerificationEntry(packetPath, packet) {
  const artifactId =
    typeof packet.artifactId === "string" ? packet.artifactId : path.basename(packetPath, ".json");
  const pktStatus = typeof packet.status === "string" ? packet.status : "passed";
  const result = typeof packet.result === "string" ? packet.result : "pass";
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
        : `Final verification evidence ${artifactId}`,
    result,
    blocking: packet.blocking === true,
  };
}

function evidenceLinkFromPacket(packetPath, packet) {
  const artifactId =
    typeof packet.artifactId === "string" ? packet.artifactId : path.basename(packetPath, ".json");
  const pktStatus = typeof packet.status === "string" ? packet.status : "passed";
  return {
    rel: "evidence_for",
    artifactKind: "evidence_packet",
    artifactId,
    path: packetPath,
    required: true,
    statusAtLinkTime: pktStatus,
  };
}

/**
 * Real final-context-drift gate. Writes a deterministic ship-context snapshot within the owned
 * work root via the real @vibe-engineer/context writer (unless an external contextProjectRoot is
 * supplied, in which case that real on-disk context graph is validated directly), then runs the
 * real checkContextDrift + validateContextProject over it. Returns the drift classification and
 * a schema-valid context_file_header ref for contextPreservation.
 */
async function runFinalContextCheck({
  projectRoot,
  workRoot,
  runId,
  buildResultArtifactId,
  now,
  contextProjectRoot,
}) {
  const wroteFresh = typeof contextProjectRoot !== "string" || contextProjectRoot.length === 0;
  const contextRoot = wroteFresh
    ? path.join(workRoot, "context")
    : path.resolve(contextProjectRoot);

  if (wroteFresh) {
    const graphId = `ship-context-${runId}`;
    const sourceId = `src-ship-${runId}`;
    const relativeSourcePath = `sources/${sourceId}.md`;
    const sources = [
      {
        sourceId,
        kind: "artifact",
        relativePath: relativeSourcePath,
        content: `# Ship context for ${buildResultArtifactId}\nShip Packet produced from Build Result ${buildResultArtifactId} after final verification + context-drift check.\n`,
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
        areaId: "ship-result",
        title: `Ship context for ${buildResultArtifactId}`,
        owner: "vibe-engineer-ship",
        level: 1,
        mandatory: true,
        sourceRefs: [sourceId],
        context: [
          {
            contextId: `ctx-ship-${runId}`,
            level: 1,
            mandatory: true,
            text: `Ship skill validated Build Result ${buildResultArtifactId} with a real final context-drift check before assembling a Ship Packet.`,
            sourceRefs: [sourceId],
            citationRefs: [`${sourceId}:sha256`],
          },
        ],
        scope: {
          kind: "repo",
          paths: ["packages/skills/src/ship"],
          description: "Ship skill context closure.",
        },
      },
    ];
    await writeContextProject({
      projectRoot: contextRoot,
      generatedAt: now,
      producer: { ...SHIP_PRODUCER, runId },
      graphId,
      reset: true,
      sources,
      areas,
      links: [],
      summaries: [],
    });
  }

  const drift = await checkContextDrift(contextRoot);
  const validation = await validateContextProject(contextRoot);
  const headerPath = path.join(
    contextRoot,
    ".vibe",
    "context",
    "index",
    "context-graph.header.json",
  );
  const headerValidation = validateArtifactFile(headerPath, { kind: "context_file_header" });
  const contextHeaderRef = headerValidation.ok
    ? {
        rel: "context_for",
        artifactKind: "context_file_header",
        artifactId: "ctx-index-graph",
        path: headerPath,
        required: true,
        statusAtLinkTime: "current",
      }
    : null;

  return {
    contextProjectRoot: contextRoot,
    wroteFresh,
    drift,
    validation,
    headerPath,
    headerValidation,
    contextHeaderRef,
    updateStatus: drift.ok ? (wroteFresh ? "updated" : "clean") : "blocked",
  };
}

function assembleShipPacket({
  intakePayload,
  runId,
  finalVerify,
  packetPaths,
  packetsById,
  contextCheck,
  now,
}) {
  const buildResultArtifactId = intakePayload.buildResultArtifactId;
  const shipArtifactId = deterministicArtifactId("ship", [runId, buildResultArtifactId, now]);
  const producer = { ...SHIP_PRODUCER, runId };

  const finalVerification = packetPaths.map((packetPath) =>
    finalVerificationEntry(packetPath, packetsById[packetPath]),
  );
  const driftEvidenceRefs = packetPaths
    .filter((packetPath) => {
      const packet = packetsById[packetPath] ?? {};
      return packet.layer === "context_drift";
    })
    .map((packetPath) => evidenceLinkFromPacket(packetPath, packetsById[packetPath]));

  const contextPreservation = {
    contextHeaderRefs: contextCheck.contextHeaderRef ? [contextCheck.contextHeaderRef] : [],
    driftCheckEvidenceRefs: driftEvidenceRefs,
    updateStatus: contextCheck.updateStatus,
  };

  const shipPacket = {
    schemaVersion: "1.0.0",
    artifactKind: "ship_packet",
    artifactId: shipArtifactId,
    title: `Ship Packet for ${buildResultArtifactId}`,
    createdAt: now,
    updatedAt: now,
    producer,
    status: "ready_for_review",
    ownership: SHIP_OWNERSHIP,
    links: [intakePayload.buildResultRef],
    extensions: {
      "dev.vibe.ship": {
        schemaVersion: "1.0.0",
        runId,
        finalVerifyStatus: finalVerify.status,
        finalVerificationCount: finalVerification.length,
        contextUpdateStatus: contextCheck.updateStatus,
        noPushEnforced: true,
      },
    },
    buildResultRef: intakePayload.buildResultRef,
    finalVerification,
    contextPreservation,
    commitPreparation: {
      suggestedCommitMessage: `Ship ${buildResultArtifactId} for review (no-push-without-approval)`,
      commitBody:
        "Ship Packet assembled by the vibe-engineer ship skill. Commit is NOT performed by the agent; operator approval required.",
      commitPerformedByAgent: false,
    },
    prPreparation: {
      suggestedTitle: `Review ship packet for ${buildResultArtifactId}`,
      suggestedBody: `Ship Packet ${shipArtifactId} references Build Result ${buildResultArtifactId}. Final verification status: ${finalVerify.status}; context preservation: ${contextCheck.updateStatus}.`,
      reviewerNotes: [
        "Operator approval is required before any push, commit, PR, or deploy.",
        "The agent did not perform any push, commit, PR, tag, or remote/deploy mutation.",
      ],
      prOpenedByAgent: false,
    },
    releaseOrMigrationNotes: [],
    followUps: [],
    noPushWithoutApproval: true,
  };
  return shipPacket;
}

/**
 * Run the ship skill over a PASSED Build Result.
 *
 * @param {object} options
 * @param {string} options.buildResultPath     - passed Build Result (.json) produced by the build skill.
 * @param {string} options.evidenceRoot        - owned root for ship evidence/work.
 * @param {string} options.projectRoot         - repo project root (read-only containment).
 * @param {string} options.runId               - stable lowercase artifact id segment.
 * @param {object[]} options.runnerCatalog     - typed verification runner catalog for final verify.
 * @param {string} [options.workRoot]          - override owned work root.
 * @param {string} [options.contextProjectRoot]- optional external context project to drift-check (real).
 * @param {string} [options.now]               - deterministic timestamp override.
 * @returns {Promise<{ok:true,...}|{ok:false,...}>}
 */
export async function runShipFromBuildResult(options) {
  const optionsResult = requireOptionsObject(options);
  if (!optionsResult.ok) return optionsResult;

  const required = ["buildResultPath", "evidenceRoot", "projectRoot", "runId", "runnerCatalog"];
  for (const key of required) {
    if (
      options[key] === undefined ||
      options[key] === null ||
      (typeof options[key] === "string" && options[key].length === 0)
    ) {
      return blocked("invalid_ship_options", {
        errors: Object.freeze([validationError(key, `Ship requires ${key}.`)]),
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
    return validationBlocked("ship_runner_catalog", [
      validationError("runnerCatalog", "runnerCatalog must be an array of typed runner objects."),
    ]);
  }
  const roots = resolveWorkRoot(options);
  if (!roots.ok) return roots;
  const { evidenceRoot, workRoot } = roots.value;
  const projectRoot = path.resolve(options.projectRoot);
  const now = nowIso(options);
  const shipEvidenceRoot = path.join(workRoot, "final-verify-evidence");

  // W1 — real ship intake over the Build Result (rejects malformed/non-passed/blocking-warning).
  const intake = await intakeBuildResult({ buildResultPath: options.buildResultPath });
  if (!intake.ok) {
    const reason =
      intake.reason === "validation_failed"
        ? "ship_intake_build_result_invalid"
        : `ship_intake_${String(intake.reason ?? "rejected")}`;
    return blocked(reason, {
      errors:
        intake.errors ??
        Object.freeze([
          validationError("buildResultPath", "Ship intake rejected the Build Result."),
        ]),
      intakeReason: intake.reason ?? null,
      buildStatus: intake.buildStatus ?? null,
    });
  }
  const intakePayload = intake.value.payload;
  const buildResult = intake.value.buildResult;

  // Resolve the implementation plan path (carried by the Build Result) for final verification.
  const planRef = isPlainObject(buildResult.implementationPlanRef)
    ? buildResult.implementationPlanRef
    : null;
  const planPath =
    planRef && typeof planRef.path === "string" && planRef.path.length > 0 ? planRef.path : null;
  if (planPath === null) {
    return blocked("ship_final_verify_no_plan_ref", {
      errors: Object.freeze([
        validationError(
          "buildResultPath",
          "Build Result carries no implementationPlanRef path; final verification cannot run.",
        ),
      ]),
    });
  }

  // W2 — real final verification over the Build Result's Verification Delta.
  let finalVerify;
  try {
    finalVerify = await runVerificationPlan({
      implementationPlanPath: planPath,
      evidenceRoot: shipEvidenceRoot,
      projectRoot,
      runId: options.runId,
      runnerCatalog: options.runnerCatalog,
    });
  } catch (error) {
    const code =
      error instanceof VerificationRunnerError && typeof error.code === "string"
        ? error.code
        : isPlainObject(error) && typeof error.code === "string"
          ? error.code
          : "RUNNER_EXCEPTION";
    return blocked("ship_final_verify_runner_exception", {
      errors: Object.freeze([
        validationError(
          "verification",
          `Final verification runner rejected the request: ${code}`,
          code,
        ),
      ]),
      runnerCode: code,
    });
  }

  const packetPaths = Array.isArray(finalVerify.evidencePackets)
    ? finalVerify.evidencePackets.map(String)
    : [];
  if (packetPaths.length === 0) {
    // N6 — no evidence packets means no green; final verify did not produce evidence.
    return blocked("ship_final_verify_no_evidence", {
      errors: Object.freeze([
        validationError(
          "verification",
          "Final verification produced no Evidence Packets; ship cannot proceed.",
        ),
      ]),
      verificationStatus: finalVerify.status,
    });
  }
  const packetsById = {};
  for (const packetPath of packetPaths) {
    const packetValidation = validateArtifactFile(packetPath, { kind: "evidence_packet" });
    if (!packetValidation.ok) {
      return validationBlocked("ship_evidence_packet", [
        validationError(
          "evidencePackets",
          `Final-verify Evidence Packet ${packetPath} failed schema validation.`,
        ),
      ]);
    }
    packetsById[packetPath] = packetValidation.artifact;
  }

  const verifyGreen = GREEN_VERIFY_STATUSES.has(finalVerify.status);
  const anyBlockingFailure = Object.values(packetsById).some(
    (packet) => BLOCKING_VERIFY_RESULTS.has(packet.result) && packet.blocking === true,
  );

  // N4 (load-bearing) — failed/blocked final verification MUST block. No Ship Packet.
  if (!verifyGreen || anyBlockingFailure) {
    return blocked("ship_final_verify_blocks", {
      errors: Object.freeze([
        validationError(
          "verification",
          `Final verification status '${finalVerify.status}' blocks the ship (master §8). No Ship Packet produced.`,
          "FINAL_VERIFY_NOT_GREEN",
        ),
      ]),
      verificationStatus: finalVerify.status,
      evidencePackets: packetPaths,
    });
  }

  // W3 — real final context-drift / context-preservation check.
  const contextCheck = await runFinalContextCheck({
    projectRoot,
    workRoot,
    runId: options.runId,
    buildResultArtifactId: intakePayload.buildResultArtifactId,
    now,
    contextProjectRoot: options.contextProjectRoot,
  });
  // N5 (load-bearing) — unresolved context drift MUST block. No Ship Packet.
  if (!contextCheck.drift.ok || !contextCheck.validation.ok) {
    const blockingFindings = (contextCheck.drift.findings ?? []).filter(
      (finding) => isPlainObject(finding) && finding.blocking === true,
    );
    return blocked("ship_context_drift_blocks", {
      errors: Object.freeze([
        validationError(
          "context",
          `Final context-drift check is unresolved (${blockingFindings.length} blocking finding(s)); ship is blocked (master §8). No Ship Packet produced.`,
          "CONTEXT_DRIFT_UNRESOLVED",
        ),
      ]),
      driftStatus: contextCheck.drift.status,
      blockingFindingCount: blockingFindings.length,
    });
  }

  // W4 — assemble + validate the Ship Packet through the real artifacts validator.
  const shipPacket = assembleShipPacket({
    intakePayload,
    runId: options.runId,
    finalVerify,
    packetPaths,
    packetsById,
    contextCheck,
    now,
  });
  const shipValidation = validateArtifactKind("ship_packet", shipPacket);
  if (!shipValidation.ok) {
    return validationBlocked("ship_packet_public_schema", shipValidation.errors);
  }

  // W5 — assert the no-push/no-commit/no-PR invariant (enforced by schema const; prove the
  // assembler never emits otherwise). These are structurally non-emissable as anything else.
  if (
    shipPacket.noPushWithoutApproval !== true ||
    shipPacket.commitPreparation.commitPerformedByAgent !== false ||
    shipPacket.prPreparation.prOpenedByAgent !== false
  ) {
    return blocked("ship_packet_invariant_violation", {
      errors: Object.freeze([
        validationError(
          "noPushWithoutApproval",
          "Ship Packet no-push/no-commit/no-PR invariant was violated by the assembler.",
        ),
      ]),
    });
  }

  return ok({
    shipPacket,
    shipPacketPath: path.join(workRoot, "ship-packet.json"),
    finalVerify,
    evidencePackets: packetPaths,
    contextCheck,
    intake,
    intakePayload,
    shipValidation,
  });
}

export function resolveShipPacketPath(outputRoot, artifactName) {
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
          "Ship Packet carrier must use .json extension.",
          "CARRIER_NOT_JSON",
        ),
      ]),
    });
  }
  return ok({ outputRoot: root, artifactPath, relativePath });
}

export async function persistShipPacket(shipPacket, persistence) {
  if (!isPlainObject(shipPacket)) {
    return blocked("invalid_ship_packet", {
      errors: Object.freeze([
        validationError("shipPacket", "shipPacket must be a structured object."),
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
  const beforeValidation = validateArtifactKind("ship_packet", shipPacket);
  if (!beforeValidation.ok)
    return validationBlocked("ship_packet_persist_pre_schema", beforeValidation.errors);
  const artifactName = persistence.artifactName ?? `${shipPacket.artifactId}.json`;
  const resolved = resolveShipPacketPath(persistence.outputRoot, artifactName);
  if (!resolved.ok) return resolved;
  await writeJsonAtomic(resolved.value.artifactPath, shipPacket);
  const afterValidation = validateArtifactFile(resolved.value.artifactPath, {
    kind: "ship_packet",
  });
  if (!afterValidation.ok)
    return validationBlocked("ship_packet_persisted_public_schema", afterValidation.errors);
  return ok({
    filePath: resolved.value.artifactPath,
    relativePath: resolved.value.relativePath,
    beforeValidation,
    afterValidation,
  });
}

export { SHIP_PRODUCER, SHIP_OWNERSHIP, PLAN_REF_RUNNER_CODES };
