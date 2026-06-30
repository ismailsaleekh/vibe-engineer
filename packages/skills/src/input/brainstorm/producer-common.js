import fs from "node:fs/promises";
import path from "node:path";
import { blocked, ok } from "../../shared/result.js";
import { WORK_TYPES, writeWorkBrief } from "../common/work-brief-writer.js";

export const PRODUCER_SOURCE_SKILLS = Object.freeze(["brainstorm", "grill-me", "task"]);

const PRODUCER_EXTENSION_NAMESPACE = "dev.vibe.skill-producers";

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(field, message, code = "INVALID_INPUT") {
  return Object.freeze({ field, code, message });
}

function fail(reason, errors) {
  return blocked(reason, { errors: Object.freeze(errors) });
}

function requirePlainObject(value, field) {
  return isPlainObject(value)
    ? ok(value)
    : fail("invalid_object", [validationError(field, `${field} must be a structured object.`)]);
}

function stringField(object, field, errors) {
  const value = object[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(validationError(field, `${field} must be a non-empty string.`));
    return null;
  }
  return value;
}

function optionalStringField(object, field, errors) {
  const value = object[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(validationError(field, `${field} must be omitted or a non-empty string.`));
    return undefined;
  }
  return value;
}

function stringArrayField(object, field, errors, { required = false, minItems = 0 } = {}) {
  const value = object[field];
  if (value === undefined) {
    if (required) errors.push(validationError(field, `${field} is required.`));
    return required ? null : [];
  }
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim().length === 0) ||
    value.length < minItems
  ) {
    errors.push(
      validationError(
        field,
        `${field} must be an array of non-empty strings${minItems > 0 ? ` with at least ${minItems} item(s)` : ""}.`,
      ),
    );
    return null;
  }
  return value;
}

function enumField(object, field, allowed, errors) {
  const value = stringField(object, field, errors);
  if (value !== null && !allowed.includes(value)) {
    errors.push(
      validationError(field, `${field} must be one of: ${allowed.join(", ")}.`, "INVALID_ENUM"),
    );
    return null;
  }
  return value;
}

function rawIntentLinkFrom(input, expectedSourceSkill, errors) {
  const rawIntent = input.rawIntent;
  if (!isPlainObject(rawIntent)) {
    errors.push(
      validationError("rawIntent", "rawIntent must be an object with artifactId and path."),
    );
    return null;
  }
  const artifactId = stringField(rawIntent, "artifactId", errors);
  const rawPath = stringField(rawIntent, "path", errors);
  const statusAtLinkTime = optionalStringField(rawIntent, "statusAtLinkTime", errors) ?? "captured";
  if (rawIntent.sourceSkill !== undefined && rawIntent.sourceSkill !== expectedSourceSkill) {
    errors.push(
      validationError(
        "rawIntent.sourceSkill",
        `rawIntent.sourceSkill must match ${expectedSourceSkill}.`,
        "SOURCE_SKILL_MISMATCH",
      ),
    );
  }
  if (artifactId === null || rawPath === null) return null;
  return {
    rel: "raw_intent",
    artifactKind: "work_brief",
    artifactId,
    path: rawPath,
    required: true,
    statusAtLinkTime,
  };
}

function acceptanceNotesFrom(input, errors) {
  const notes = input.acceptanceNotes;
  if (!Array.isArray(notes) || notes.length === 0) {
    errors.push(
      validationError(
        "acceptanceNotes",
        "acceptanceNotes must contain at least one non-empty acceptance note.",
      ),
    );
    return null;
  }
  const mapped = [];
  notes.forEach((note, index) => {
    if (typeof note === "string" && note.trim().length > 0) {
      mapped.push({ id: `accept-${index + 1}`, description: note });
      return;
    }
    if (isPlainObject(note)) {
      const id = stringField(note, "id", errors);
      const description = stringField(note, "description", errors);
      const candidateScenarioRefs =
        note.candidateScenarioRefs === undefined
          ? undefined
          : stringArrayField(note, "candidateScenarioRefs", errors);
      if (id !== null && description !== null) {
        mapped.push(
          candidateScenarioRefs === undefined
            ? { id, description }
            : { id, description, candidateScenarioRefs },
        );
      }
      return;
    }
    errors.push(
      validationError(
        `acceptanceNotes.${index}`,
        "Each acceptance note must be a non-empty string or object with id and description.",
      ),
    );
  });
  return mapped.length === notes.length ? mapped : null;
}

export function nonEmptySignal(values) {
  return Array.isArray(values) && values.length > 0;
}

export function normalizeCommonWorkBriefInput(
  input,
  expectedSourceSkill,
  producerSpecificExtension,
) {
  const objectResult = requirePlainObject(input, "input");
  if (!objectResult.ok) return objectResult;
  const object = objectResult.value;
  const errors = [];

  if (object.sourceSkill !== undefined && object.sourceSkill !== expectedSourceSkill) {
    errors.push(
      validationError(
        "sourceSkill",
        `sourceSkill must not contradict enforced producer ${expectedSourceSkill}.`,
        "SOURCE_SKILL_MISMATCH",
      ),
    );
  }

  const title = stringField(object, "title", errors);
  const workType = enumField(object, "workType", WORK_TYPES, errors);
  const background = stringField(object, "background", errors);
  const problemOrOpportunity = stringField(object, "problemOrOpportunity", errors);
  const desiredOutcome = stringField(object, "desiredOutcome", errors);
  const rawIntentLink = rawIntentLinkFrom(object, expectedSourceSkill, errors);
  const acceptanceNotes = acceptanceNotesFrom(object, errors);
  const constraints = stringArrayField(object, "constraints", errors);
  const userVisibleBehavior = stringArrayField(object, "userVisibleBehavior", errors);
  const nonGoals = stringArrayField(object, "nonGoals", errors);
  const risksAndUnknowns = stringArrayField(object, "risksAndUnknowns", errors);
  const candidateE2ECases = stringArrayField(object, "candidateE2ECases", errors);
  const candidateUIStates = stringArrayField(object, "candidateUIStates", errors);
  const openQuestions = stringArrayField(object, "openQuestions", errors);
  const assumptions = stringArrayField(object, "assumptions", errors);
  const sourceMetadata = isPlainObject(object.sourceMetadata) ? object.sourceMetadata : null;

  if (!sourceMetadata) {
    errors.push(validationError("sourceMetadata", "sourceMetadata must be an object."));
  } else {
    stringArrayField(sourceMetadata, "rawIntentRefs", errors, { required: true, minItems: 1 });
    stringArrayField(sourceMetadata, "conversationRefs", errors, { required: true });
    stringArrayField(sourceMetadata, "operatorRefs", errors, { required: true });
    optionalStringField(sourceMetadata, "inputTimestamp", errors);
  }

  const createdAt = optionalStringField(object, "createdAt", errors) ?? new Date().toISOString();
  const updatedAt = optionalStringField(object, "updatedAt", errors) ?? createdAt;
  const artifactId = optionalStringField(object, "artifactId", errors);
  const producerVersion = optionalStringField(object, "producerVersion", errors) ?? "1.0.0";
  const runId = optionalStringField(object, "runId", errors);

  if (
    errors.length > 0 ||
    title === null ||
    workType === null ||
    background === null ||
    problemOrOpportunity === null ||
    desiredOutcome === null ||
    rawIntentLink === null ||
    acceptanceNotes === null ||
    sourceMetadata === null
  ) {
    return fail("invalid_producer_input", errors);
  }

  return ok({
    artifactId,
    title,
    createdAt,
    updatedAt,
    producerVersion,
    runId,
    status: "ready",
    sourceSkill: expectedSourceSkill,
    workType,
    background,
    problemOrOpportunity,
    desiredOutcome,
    constraints: constraints ?? [],
    userVisibleBehavior: userVisibleBehavior ?? [],
    nonGoals: nonGoals ?? [],
    risksAndUnknowns: risksAndUnknowns ?? [],
    acceptanceNotes,
    sourceMetadata,
    rawIntentLink,
    tags: ["domain-neutral", expectedSourceSkill],
    ownership: {
      ownerLane: "I-05B-brainstorm-grill-task-producers",
      ownedWritePaths: [
        "packages/skills/src/input/brainstorm/**",
        "packages/skills/src/input/grill-me/**",
        "packages/skills/src/input/task/**",
        "packages/skills/src/plan/intake/**",
        "packages/skills/fixtures/work-brief/producers/**",
      ],
      readOnlyPaths: [
        "packages/skills/src/shared/**",
        "packages/skills/src/input/common/**",
        "packages/artifacts/**",
        "docs/decisions/**",
      ],
      untouchablePaths: [
        ".git/**",
        "packages/skills/package.json",
        "pnpm-lock.yaml",
        "package.json",
      ],
      concurrencyNotes:
        "I-05B producer-owned Work Brief output; final planning/risk analysis is downstream.",
    },
    extensions: {
      [PRODUCER_EXTENSION_NAMESPACE]: {
        schemaVersion: "1.0.0",
        sourceSkill: expectedSourceSkill,
        producerSignals: producerSpecificExtension,
      },
    },
    candidateE2ECases: candidateE2ECases.length === 0 ? undefined : candidateE2ECases,
    candidateUIStates: candidateUIStates.length === 0 ? undefined : candidateUIStates,
    openQuestions: openQuestions.length === 0 ? undefined : openQuestions,
    assumptions: assumptions.length === 0 ? undefined : assumptions,
  });
}

export async function resolveSafeArtifactPath(
  descriptor,
  rootField = "outputRoot",
  nameField = "artifactName",
) {
  const objectResult = requirePlainObject(descriptor, "pathDescriptor");
  if (!objectResult.ok) return objectResult;
  const object = objectResult.value;
  const errors = [];
  const root = stringField(object, rootField, errors);
  const artifactName = stringField(object, nameField, errors);
  if (errors.length > 0 || root === null || artifactName === null)
    return fail("invalid_path_descriptor", errors);

  if (path.isAbsolute(artifactName)) {
    return fail("unsafe_path", [
      validationError(
        nameField,
        `${nameField} must be a relative artifact name, not an absolute path.`,
        "ABSOLUTE_PATH_REJECTED",
      ),
    ]);
  }
  if (artifactName.endsWith("/") || artifactName.endsWith("\\")) {
    return fail("directory_target", [
      validationError(nameField, `${nameField} must identify a JSON file, not a directory.`),
    ]);
  }
  const allowedRoot = path.resolve(root);
  const resolvedPath = path.resolve(allowedRoot, artifactName);
  const relative = path.relative(allowedRoot, resolvedPath);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    return fail("unsafe_path", [
      validationError(
        nameField,
        `${nameField} must stay inside ${root} after path normalization.`,
        "PATH_TRAVERSAL_REJECTED",
      ),
    ]);
  }
  if (path.extname(resolvedPath) !== ".json") {
    return fail("carrier_not_json", [
      validationError(
        nameField,
        "Work Brief artifacts must use a .json carrier.",
        "CARRIER_NOT_JSON",
      ),
    ]);
  }
  try {
    const stats = await fs.stat(resolvedPath);
    if (stats.isDirectory()) {
      return fail("directory_target", [
        validationError(nameField, `${nameField} resolves to a directory.`),
      ]);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      return fail("path_stat_failed", [
        validationError(nameField, `Unable to inspect target path: ${error.message}`),
      ]);
    }
  }
  return ok({ allowedRoot, artifactPath: resolvedPath, relativePath: relative });
}

export async function persistProducerWorkBrief(normalizedResult, outputDescriptor) {
  if (!normalizedResult.ok) return normalizedResult;
  const safePath = await resolveSafeArtifactPath(outputDescriptor, "outputRoot", "artifactName");
  if (!safePath.ok) return safePath;
  try {
    const written = await writeWorkBrief(normalizedResult.value, safePath.value.artifactPath);
    if (!written.ok) return written;
    return ok({
      sourceSkill: normalizedResult.value.sourceSkill,
      filePath: safePath.value.artifactPath,
      relativePath: safePath.value.relativePath,
      artifact: written.value.artifact,
      fileValidation: written.value.fileValidation,
    });
  } catch (error) {
    return fail("persist_failed", [
      validationError("outputPath", `Unable to persist Work Brief: ${error.message}`),
    ]);
  }
}
