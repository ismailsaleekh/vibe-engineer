import path from "node:path";
import {
  validateArtifact,
  validateArtifactFile,
  validateArtifactKind,
} from "@vibe-engineer/artifacts";
import { blocked, ok, validationBlocked } from "../../shared/result.js";
import { VERIFICATION_DELTA_LAYERS, VERIFICATION_DELTA_ACTIONS } from "./catalog.js";

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationError(field, message, code = "INVALID_INPUT") {
  return Object.freeze({ field, code, message });
}

function hasBlockingPlanState(plan) {
  if (plan.status !== "approved") return true;
  if (Array.isArray(plan.openBlockers) && plan.openBlockers.some((item) => item?.blocking === true))
    return true;
  const requiredItems = plan.verificationDelta?.requiredItems;
  return (
    Array.isArray(requiredItems) &&
    requiredItems.some((item) => item?.action === "blocked" && item?.blocking === true)
  );
}

export function validateVerificationDeltaCatalog(delta) {
  const publicValidation = validateArtifactKind("verification_delta", delta);
  if (!publicValidation.ok)
    return validationBlocked("verification_delta_public_schema", publicValidation.errors);
  const seen = new Set();
  const errors = [];
  delta.requiredItems.forEach((item, index) => {
    if (!VERIFICATION_DELTA_LAYERS.includes(item.layer)) {
      errors.push(
        validationError(
          `/requiredItems/${index}/layer`,
          `Unknown Verification Delta layer ${item.layer}.`,
          "UNKNOWN_LAYER",
        ),
      );
    }
    if (seen.has(item.layer)) {
      errors.push(
        validationError(
          `/requiredItems/${index}/layer`,
          `Duplicate Verification Delta layer ${item.layer}.`,
          "DUPLICATE_LAYER",
        ),
      );
    }
    seen.add(item.layer);
    if (!VERIFICATION_DELTA_ACTIONS.includes(item.action)) {
      errors.push(
        validationError(
          `/requiredItems/${index}/action`,
          `Invalid Verification Delta action ${item.action}.`,
          "INVALID_ACTION",
        ),
      );
    }
    if (
      item.action === "blocked" &&
      (typeof item.blockedBy !== "string" || typeof item.unblockCondition !== "string")
    ) {
      errors.push(
        validationError(
          `/requiredItems/${index}`,
          "Blocked Verification Delta items require blockedBy and unblockCondition.",
          "BLOCKED_METADATA_REQUIRED",
        ),
      );
    }
  });
  for (const layer of VERIFICATION_DELTA_LAYERS) {
    if (!seen.has(layer))
      errors.push(
        validationError(
          "/requiredItems",
          `Missing Verification Delta layer ${layer}.`,
          "MISSING_LAYER",
        ),
      );
  }
  return errors.length === 0
    ? ok({ delta, publicValidation })
    : validationBlocked("verification_delta_catalog", errors);
}

export function validateImplementationPlanObjectForBuildIntake(plan, options = {}) {
  const requireApproved = options.requireApproved !== false;
  const publicValidation = validateArtifactKind("implementation_plan", plan);
  if (!publicValidation.ok)
    return validationBlocked("implementation_plan_public_schema", publicValidation.errors);
  const deltaValidation = validateVerificationDeltaCatalog(plan.verificationDelta);
  if (!deltaValidation.ok) return deltaValidation;
  if (requireApproved && hasBlockingPlanState(plan)) {
    return blocked("implementation_plan_not_approved", {
      artifact: plan,
      errors: Object.freeze([
        validationError(
          "status",
          "Build intake requires an approved Implementation Plan with no blocking blockers or blocked Verification Delta items.",
          "PLAN_NOT_APPROVED",
        ),
      ]),
    });
  }
  return ok({ artifact: plan, publicValidation, deltaValidation });
}

export function resolvePlanCarrierPath(descriptor) {
  if (!isPlainObject(descriptor)) {
    return blocked("invalid_plan_descriptor", {
      errors: Object.freeze([
        validationError(
          "descriptor",
          "Plan descriptor must be an object with inputRoot and artifactName.",
        ),
      ]),
    });
  }
  const { inputRoot, artifactName } = descriptor;
  if (typeof inputRoot !== "string" || inputRoot.trim().length === 0) {
    return blocked("invalid_plan_descriptor", {
      errors: Object.freeze([
        validationError("inputRoot", "inputRoot must be a non-empty string."),
      ]),
    });
  }
  if (typeof artifactName !== "string" || artifactName.trim().length === 0) {
    return blocked("invalid_plan_descriptor", {
      errors: Object.freeze([
        validationError("artifactName", "artifactName must be a non-empty string."),
      ]),
    });
  }
  if (path.isAbsolute(artifactName)) {
    return blocked("unsafe_plan_path", {
      errors: Object.freeze([
        validationError(
          "artifactName",
          "artifactName must be relative, not absolute.",
          "ABSOLUTE_PATH_REJECTED",
        ),
      ]),
    });
  }
  const inputRootResolved = path.resolve(inputRoot);
  const artifactPath = path.resolve(inputRootResolved, artifactName);
  const relativePath = path.relative(inputRootResolved, artifactPath);
  if (relativePath === "" || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return blocked("unsafe_plan_path", {
      errors: Object.freeze([
        validationError(
          "artifactName",
          "artifactName must remain inside inputRoot.",
          "PATH_TRAVERSAL_REJECTED",
        ),
      ]),
    });
  }
  if (path.extname(artifactPath) !== ".json") {
    return blocked("plan_carrier_not_json", {
      errors: Object.freeze([
        validationError(
          "artifactName",
          "Implementation Plan carriers must be .json files.",
          "CARRIER_NOT_JSON",
        ),
      ]),
    });
  }
  return ok({ inputRoot: inputRootResolved, artifactPath, relativePath });
}

export function validateImplementationPlanFileForBuildIntake(descriptor, options = {}) {
  const resolved = resolvePlanCarrierPath(descriptor);
  if (!resolved.ok) return resolved;
  const publicValidation = validateArtifactFile(resolved.value.artifactPath, {
    kind: "implementation_plan",
  });
  if (!publicValidation.ok)
    return validationBlocked("implementation_plan_public_file_schema", publicValidation.errors);
  const artifact = publicValidation.artifact;
  const buildIntakeValidation = validateImplementationPlanObjectForBuildIntake(artifact, options);
  if (!buildIntakeValidation.ok) return buildIntakeValidation;
  return ok({
    ...buildIntakeValidation.value,
    filePath: resolved.value.artifactPath,
    relativePath: resolved.value.relativePath,
  });
}

export function validateAnyImplementationPlanArtifact(artifact) {
  const publicValidation = validateArtifact(artifact);
  if (!publicValidation.ok)
    return validationBlocked("implementation_plan_public_artifact", publicValidation.errors);
  if (publicValidation.kind !== "implementation_plan") {
    return validationBlocked("implementation_plan_kind", [
      validationError(
        "artifactKind",
        "Expected implementation_plan artifact.",
        "ARTIFACT_KIND_MISMATCH",
      ),
    ]);
  }
  return validateImplementationPlanObjectForBuildIntake(artifact, { requireApproved: false });
}
