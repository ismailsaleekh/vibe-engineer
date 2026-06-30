import fs from "node:fs/promises";
import path from "node:path";
import { blocked, ok, validationBlocked } from "../../shared/result.js";
import { consumeWorkBriefFile } from "../../input/common/work-brief-consumer.js";

const PLAN_ACCEPTED_SOURCE_SKILLS = Object.freeze(["brainstorm", "grill-me", "task"]);

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(field, message, code = "INVALID_INPUT") {
  return Object.freeze({ field, code, message });
}

function fail(reason, errors) {
  return blocked(reason, { errors: Object.freeze(errors) });
}

function stringField(object, field, errors) {
  const value = object[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(validationError(field, `${field} must be a non-empty string.`));
    return null;
  }
  return value;
}

export async function resolvePlanIntakePath(descriptor) {
  if (!isPlainObject(descriptor)) {
    return fail("invalid_intake_descriptor", [
      validationError(
        "descriptor",
        "plan intake requires an object with inputRoot and artifactName, not raw intent text or chat.",
      ),
    ]);
  }
  const errors = [];
  const inputRoot = stringField(descriptor, "inputRoot", errors);
  const artifactName = stringField(descriptor, "artifactName", errors);
  if (errors.length > 0 || inputRoot === null || artifactName === null)
    return fail("invalid_intake_descriptor", errors);

  if (path.isAbsolute(artifactName)) {
    return fail("unsafe_path", [
      validationError(
        "artifactName",
        "artifactName must be relative to inputRoot, not absolute.",
        "ABSOLUTE_PATH_REJECTED",
      ),
    ]);
  }
  if (artifactName.endsWith("/") || artifactName.endsWith("\\")) {
    return fail("directory_target", [
      validationError("artifactName", "artifactName must identify a JSON file, not a directory."),
    ]);
  }
  const allowedRoot = path.resolve(inputRoot);
  const artifactPath = path.resolve(allowedRoot, artifactName);
  const relativePath = path.relative(allowedRoot, artifactPath);
  if (relativePath === "" || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return fail("unsafe_path", [
      validationError(
        "artifactName",
        "artifactName must stay inside inputRoot after path normalization.",
        "PATH_TRAVERSAL_REJECTED",
      ),
    ]);
  }
  if (path.extname(artifactPath) !== ".json") {
    return fail("carrier_not_json", [
      validationError(
        "artifactName",
        "plan intake consumes canonical .json Work Brief artifacts only.",
        "CARRIER_NOT_JSON",
      ),
    ]);
  }

  try {
    const stats = await fs.stat(artifactPath);
    if (stats.isDirectory()) {
      return fail("directory_target", [
        validationError("artifactName", "artifactName resolves to a directory."),
      ]);
    }
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fail("missing_work_brief", [
        validationError(
          "artifactName",
          `No Work Brief artifact exists at ${artifactName}.`,
          "MISSING_FILE",
        ),
      ]);
    }
    return fail("path_stat_failed", [
      validationError("artifactName", `Unable to inspect Work Brief path: ${error.message}`),
    ]);
  }
  return ok({ allowedRoot, artifactPath, relativePath });
}

export async function intakeWorkBriefForPlan(descriptor) {
  const resolved = await resolvePlanIntakePath(descriptor);
  if (!resolved.ok) return resolved;
  const consumed = consumeWorkBriefFile(resolved.value.artifactPath);
  if (!consumed.ok) return consumed;
  const artifact = consumed.value.artifact;
  if (artifact.artifactKind !== "work_brief") {
    return validationBlocked("plan_intake_kind", [
      {
        field: "artifactKind",
        code: "ARTIFACT_KIND_MISMATCH",
        message: "plan intake consumes Work Brief artifacts only.",
      },
    ]);
  }
  if (artifact.schemaVersion !== "1.0.0") {
    return validationBlocked("plan_intake_version", [
      {
        field: "schemaVersion",
        code: "UNSUPPORTED_VERSION",
        message: "plan intake supports Work Brief schemaVersion 1.0.0 only.",
      },
    ]);
  }
  if (!PLAN_ACCEPTED_SOURCE_SKILLS.includes(artifact.sourceSkill)) {
    return validationBlocked("plan_intake_source_skill", [
      {
        field: "sourceSkill",
        code: "INVALID_SOURCE_SKILL",
        message: "plan intake accepts Work Briefs from brainstorm, grill-me, or task only.",
      },
    ]);
  }
  if (artifact.status === "blocked") {
    return blocked("work_brief_blocked", {
      artifact,
      message: "Blocked Work Brief is not green-consumable by plan.",
    });
  }
  if (artifact.status !== "ready") {
    return validationBlocked("plan_intake_status", [
      {
        field: "status",
        code: "BAD_STATUS_HANDOFF",
        message: "plan intake requires status ready.",
      },
    ]);
  }
  return ok({
    artifact,
    filePath: resolved.value.artifactPath,
    relativePath: resolved.value.relativePath,
    validation: consumed.value.validation,
  });
}
