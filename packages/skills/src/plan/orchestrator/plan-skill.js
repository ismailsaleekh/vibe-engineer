import path from "node:path";
import { validateArtifactFile, validateArtifactKind } from "@vibe-engineer/artifacts";
import { writeJsonAtomic } from "../../shared/atomic-json-writer.js";
import { deterministicArtifactId } from "../../shared/time-id.js";
import { blocked, ok, validationBlocked } from "../../shared/result.js";
import {
  PLAN_BUILD_DISCIPLINE_EXTENSION,
  createPlanBuildDiscipline,
  disciplineOpenBlockers,
  verificationDeltaOverridesFromDiscipline,
} from "../../shared/verification-discipline.js";
import { intakeWorkBriefForPlan } from "../intake/work-brief-intake.js";
import { buildVerificationDelta } from "../verification-delta/catalog.js";
import { validateImplementationPlanObjectForBuildIntake } from "../verification-delta/validator.js";

const PLAN_PRODUCER = Object.freeze({
  kind: "skill",
  id: "skill-plan",
  name: "plan",
  version: "1.0.0",
});

const PLAN_OWNERSHIP = Object.freeze({
  ownerLane: "I-06-plan-skill-verification-delta",
  ownedWritePaths: Object.freeze([
    "packages/skills/src/plan/orchestrator/**",
    "packages/skills/src/plan/verification-delta/**",
    "packages/skills/fixtures/implementation-plan/**",
    ".vibe/work/I-06-plan-skill-verification-delta/**",
  ]),
  readOnlyPaths: Object.freeze([
    "packages/skills/src/plan/intake/**",
    "packages/skills/src/shared/**",
    "packages/skills/src/input/**",
    "packages/artifacts/**",
  ]),
  untouchablePaths: Object.freeze([
    ".git/**",
    "package.json",
    "pnpm-lock.yaml",
    "packages/skills/package.json",
    "packages/skills/src/build/**",
    "packages/skills/src/ship/**",
  ]),
  concurrencyNotes:
    "Plan skill consumes only persisted Work Brief carriers through the I-05B/I-05A plan-intake seam; build and ship remain downstream.",
  handoffPolicy:
    "Implementation Plan artifacts require independent validation before downstream build intake.",
});

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(field, message, code = "INVALID_INPUT") {
  return Object.freeze({ field, code, message });
}

function requireOptionsObject(options) {
  if (!isPlainObject(options)) {
    return blocked("invalid_planner_options", {
      errors: Object.freeze([
        validationError(
          "options",
          "Planner options must be a structured object, not prose or raw chat.",
        ),
      ]),
    });
  }
  return ok(options);
}

function nowIso(options) {
  if (typeof options.now === "string" && options.now.length > 0) return options.now;
  return new Date().toISOString();
}

function nonEmptyArray(value, fallback) {
  if (Array.isArray(value)) {
    const normalized = value
      .filter((item) => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
    if (normalized.length > 0) return normalized;
  }
  return fallback;
}

function mapAffectedAreas(workBrief, options) {
  if (Array.isArray(options.affectedAreas) && options.affectedAreas.length > 0) {
    return options.affectedAreas.map((item, index) => {
      if (!isPlainObject(item)) throw new TypeError(`affectedAreas[${index}] must be an object.`);
      for (const field of ["kind", "path", "reason"]) {
        if (typeof item[field] !== "string" || item[field].trim().length === 0)
          throw new TypeError(`affectedAreas[${index}].${field} must be a non-empty string.`);
      }
      return { kind: item.kind, path: item.path, reason: item.reason };
    });
  }
  return [
    {
      kind: "skill",
      path: "packages/skills/src/plan/**",
      reason: `Plan derives implementation scope from ${workBrief.sourceSkill} Work Brief ${workBrief.artifactId}.`,
    },
  ];
}

function createAcceptanceCriteria(workBrief, options) {
  const explicit = Array.isArray(options.acceptanceCriteria) ? options.acceptanceCriteria : [];
  if (explicit.length > 0) {
    return explicit.map((item, index) => {
      if (
        !isPlainObject(item) ||
        typeof item.id !== "string" ||
        typeof item.description !== "string"
      )
        throw new TypeError(`acceptanceCriteria[${index}] must include id and description.`);
      return { id: item.id, description: item.description };
    });
  }
  const notes = Array.isArray(workBrief.acceptanceNotes) ? workBrief.acceptanceNotes : [];
  const mapped = notes
    .filter(
      (note) =>
        isPlainObject(note) && typeof note.id === "string" && typeof note.description === "string",
    )
    .map((note) => ({ id: `ac-${note.id}`, description: note.description }));
  return mapped.length > 0
    ? mapped
    : [
        {
          id: "ac-typed-plan",
          description: "A schema-valid Implementation Plan is produced from the ready Work Brief.",
        },
      ];
}

function createImplementationSteps(workBrief, affectedAreas, criteria) {
  return [
    {
      id: "step-read-work-brief",
      description: `Consume Work Brief ${workBrief.artifactId} through plan intake and preserve typed artifact handoff.`,
      expectedTouchedAreas: affectedAreas,
      acceptanceLinks: criteria.map((criterion) => criterion.id),
    },
    {
      id: "step-implement-scope",
      description: `Implement the approved scope: ${workBrief.desiredOutcome}`,
      dependsOn: ["step-read-work-brief"],
      expectedTouchedAreas: affectedAreas,
      acceptanceLinks: criteria.map((criterion) => criterion.id),
    },
    {
      id: "step-verify-delta",
      description:
        "Execute all required Verification Delta layers or keep the plan blocked with explicit unblock metadata.",
      dependsOn: ["step-implement-scope"],
      expectedTouchedAreas: [
        {
          kind: "test",
          path: ".vibe/work/**",
          reason: "Verification evidence must be captured as durable artifacts or command logs.",
        },
      ],
      acceptanceLinks: criteria.map((criterion) => criterion.id),
    },
  ];
}

function createRisks(workBrief, options) {
  const risks = [];
  const sourceRisks = Array.isArray(workBrief.risksAndUnknowns) ? workBrief.risksAndUnknowns : [];
  sourceRisks.forEach((description, index) => {
    if (typeof description === "string" && description.trim().length > 0) {
      risks.push({
        id: `risk-work-brief-${index + 1}`,
        description: description.trim(),
        sensitiveArea: "work_brief.risksAndUnknowns",
        mitigation:
          "Planner must convert candidate risk into explicit Verification Delta evidence or an open blocker.",
      });
    }
  });
  const sensitiveAreas = Array.isArray(options.sensitiveAreas) ? options.sensitiveAreas : [];
  sensitiveAreas.forEach((item, index) => {
    if (isPlainObject(item) && typeof item.area === "string" && typeof item.reason === "string") {
      risks.push({
        id: `risk-sensitive-${index + 1}`,
        description: item.reason,
        sensitiveArea: item.area,
        mitigation: "Independent validation must inspect this sensitive area before closure.",
      });
    }
  });
  return risks;
}

function createOpenBlockers(options, delta, discipline) {
  const explicit = Array.isArray(options.openBlockers) ? options.openBlockers : [];
  const blockers = explicit.map((item, index) => {
    if (!isPlainObject(item)) throw new TypeError(`openBlockers[${index}] must be an object.`);
    return {
      id: typeof item.id === "string" && item.id.length > 0 ? item.id : `blocker-${index + 1}`,
      description:
        typeof item.description === "string" && item.description.length > 0
          ? item.description
          : "Planner supplied blocker lacks detailed description.",
      blocking: item.blocking !== false,
      owner: typeof item.owner === "string" && item.owner.length > 0 ? item.owner : "planner",
    };
  });
  for (const item of delta.requiredItems) {
    if (item.action === "blocked" && item.blocking === true) {
      blockers.push({
        id: `blocker-${item.layer}`,
        description: `${item.layer} verification blocked by ${item.blockedBy}; ${item.unblockCondition}`,
        blocking: true,
        owner: item.fixerOwner,
      });
    }
  }
  blockers.push(...disciplineOpenBlockers(discipline));
  return blockers;
}

function createDefinitionOfDone(delta) {
  return [
    {
      id: "dod-public-schema-validation",
      description:
        "Implementation Plan and embedded Verification Delta validate through the public @vibe-engineer/artifacts validator before and after persistence.",
      blocking: true,
    },
    {
      id: "dod-all-delta-layers-classified",
      description: `All ${delta.requiredItems.length} Verification Delta catalog layers are present with required evidence expectations.`,
      blocking: true,
    },
    {
      id: "dod-independent-validation",
      description:
        "An independent validator must inspect the changed files and real producer→consumer seams.",
      blocking: true,
    },
  ];
}

function createLinkFromWorkBrief(workBrief, intakeResult) {
  return {
    rel: "derived_from",
    artifactKind: "work_brief",
    artifactId: workBrief.artifactId,
    path: intakeResult.filePath,
    required: true,
    statusAtLinkTime: workBrief.status,
  };
}

function createImplementationPlanArtifact(workBrief, intakeResult, options) {
  const now = nowIso(options);
  const planArtifactId =
    options.artifactId ??
    deterministicArtifactId("implementation-plan", [
      workBrief.artifactId,
      workBrief.updatedAt,
      workBrief.desiredOutcome,
    ]);
  const producer = { ...PLAN_PRODUCER, runId: options.runId ?? `run-${planArtifactId}` };
  const ownership = options.ownership ?? PLAN_OWNERSHIP;
  const affectedAreas = mapAffectedAreas(workBrief, options);
  const discipline = createPlanBuildDiscipline({
    planArtifactId,
    workBrief,
    affectedAreas,
    options,
  });
  const disciplineOverrides = verificationDeltaOverridesFromDiscipline(discipline);
  const verificationDelta = buildVerificationDelta({
    planArtifactId,
    workBrief,
    now,
    producer,
    ownership,
    options: {
      ...options,
      verificationDeltaOverrides: {
        ...(isPlainObject(options.verificationDeltaOverrides)
          ? options.verificationDeltaOverrides
          : {}),
        ...disciplineOverrides,
      },
    },
  });
  const acceptanceCriteria = createAcceptanceCriteria(workBrief, options);
  const openBlockers = createOpenBlockers(options, verificationDelta, discipline);
  const isBlocked =
    openBlockers.some((item) => item.blocking === true) ||
    verificationDelta.requiredItems.some(
      (item) => item.action === "blocked" && item.blocking === true,
    );
  const status = isBlocked ? "blocked" : "approved";
  verificationDelta.status = isBlocked ? "blocked" : "complete";
  verificationDelta.links[0].statusAtLinkTime = status;
  verificationDelta.implementationPlanRef.statusAtLinkTime = status;
  const workBriefRef = createLinkFromWorkBrief(workBrief, intakeResult);
  return {
    schemaVersion: "1.0.0",
    artifactKind: "implementation_plan",
    artifactId: planArtifactId,
    title: options.title ?? `Implementation Plan for ${workBrief.title}`,
    createdAt: now,
    updatedAt: now,
    producer,
    status,
    ownership,
    links: [
      workBriefRef,
      {
        rel: "verification_delta_of",
        artifactKind: "verification_delta",
        artifactId: verificationDelta.artifactId,
        path: `${verificationDelta.artifactId}.json`,
        required: true,
        statusAtLinkTime: verificationDelta.status,
      },
    ],
    extensions: {
      "dev.vibe.plan-skill": {
        schemaVersion: "1.0.0",
        sourceSkill: workBrief.sourceSkill,
        workType: workBrief.workType,
        intakeRelativePath: intakeResult.relativePath,
      },
      [PLAN_BUILD_DISCIPLINE_EXTENSION]: discipline,
    },
    workBriefRef,
    objective: options.objective ?? workBrief.desiredOutcome,
    scope: nonEmptyArray(
      options.scope,
      [workBrief.problemOrOpportunity, workBrief.desiredOutcome].filter(
        (item) => typeof item === "string" && item.length > 0,
      ),
    ),
    nonScope: nonEmptyArray(
      options.nonScope,
      Array.isArray(workBrief.nonGoals) ? workBrief.nonGoals : ["Do not bypass Work Brief intake."],
    ),
    contextClosure: [workBriefRef],
    affectedAreas,
    schematics: discipline.planSchematicEntries,
    implementationSteps: createImplementationSteps(workBrief, affectedAreas, acceptanceCriteria),
    acceptanceCriteria,
    definitionOfDone: createDefinitionOfDone(verificationDelta),
    risks: createRisks(workBrief, options),
    openBlockers,
    verificationDelta,
    workDecompositionHints: [
      "Keep implementation work packages within the validated orchestration size bound.",
    ],
    parallelismHints: [
      "Parallel work is allowed only across disjoint owned paths and after dependency gates pass.",
    ],
    docsContextUpdatesExpected: [
      "Update context or handoff artifacts only when owned by the executing lane.",
    ],
    approval:
      status === "approved"
        ? {
            approvedBy: producer,
            approvedAt: now,
            notes:
              "Approved by plan skill because no blocking Verification Delta item or open blocker remains.",
          }
        : undefined,
    reviewNotes:
      status === "blocked"
        ? [
            "Plan remains blocked until every blocking Verification Delta item and open blocker is resolved.",
          ]
        : ["Plan is ready for independent validation and downstream build intake."],
  };
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map((item) => stripUndefined(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, stripUndefined(entryValue)]),
    );
  }
  return value;
}

export async function createImplementationPlanFromWorkBriefIntake(intakeDescriptor, options = {}) {
  const optionsResult = requireOptionsObject(options);
  if (!optionsResult.ok) return optionsResult;
  const intake = await intakeWorkBriefForPlan(intakeDescriptor);
  if (!intake.ok) return intake;
  try {
    const plan = stripUndefined(
      createImplementationPlanArtifact(intake.value.artifact, intake.value, options),
    );
    const validation = validateArtifactKind("implementation_plan", plan);
    if (!validation.ok)
      return validationBlocked("implementation_plan_public_schema", validation.errors);
    return ok({ plan, workBrief: intake.value.artifact, intake: intake.value, validation });
  } catch (error) {
    return blocked("plan_creation_failed", {
      errors: Object.freeze([validationError("planner", error.message)]),
    });
  }
}

export function resolveOutputPlanPath(outputRoot, artifactName) {
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
          "Implementation Plan carrier must use .json extension.",
          "CARRIER_NOT_JSON",
        ),
      ]),
    });
  }
  return ok({ outputRoot: root, artifactPath, relativePath });
}

export async function persistImplementationPlan(plan, persistence) {
  if (!isPlainObject(persistence)) {
    return blocked("invalid_persistence_options", {
      errors: Object.freeze([
        validationError("persistence", "Persistence requires outputRoot and artifactName."),
      ]),
    });
  }
  const beforeValidation = validateImplementationPlanObjectForBuildIntake(plan, {
    requireApproved: false,
  });
  if (!beforeValidation.ok) return beforeValidation;
  const artifactName = persistence.artifactName ?? `${plan.artifactId}.json`;
  const resolved = resolveOutputPlanPath(persistence.outputRoot, artifactName);
  if (!resolved.ok) return resolved;
  await writeJsonAtomic(resolved.value.artifactPath, plan);
  const afterValidation = validateArtifactFile(resolved.value.artifactPath, {
    kind: "implementation_plan",
  });
  if (!afterValidation.ok)
    return validationBlocked("implementation_plan_persisted_public_schema", afterValidation.errors);
  return ok({
    filePath: resolved.value.artifactPath,
    relativePath: resolved.value.relativePath,
    beforeValidation,
    afterValidation,
  });
}

export async function createAndMaybePersistImplementationPlan(intakeDescriptor, options = {}) {
  const created = await createImplementationPlanFromWorkBriefIntake(intakeDescriptor, options);
  if (!created.ok) return created;
  if (!options.persistence) return created;
  const persisted = await persistImplementationPlan(created.value.plan, options.persistence);
  if (!persisted.ok) return persisted;
  return ok({ ...created.value, persistence: persisted.value });
}
