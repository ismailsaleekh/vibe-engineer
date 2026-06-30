export const VERIFICATION_DELTA_CATALOG_VERSION = "1.0.0";

export const VERIFICATION_DELTA_LAYERS = Object.freeze([
  "safety_hooks",
  "typecheck",
  "lint_format",
  "mechanical_gate",
  "unit",
  "integration",
  "contract_adapter",
  "e2e",
  "ui_verification",
  "ai_eval",
  "build_package",
  "context_drift",
  "observability",
  "advisory_review",
  "final_dod",
  "schema_validation",
]);

export const VERIFICATION_DELTA_ACTIONS = Object.freeze([
  "add",
  "update",
  "reuse",
  "not_applicable",
  "blocked",
]);

export const MECHANICAL_GATE_CONSIDERATIONS = Object.freeze([
  "strict_config",
  "governed_surface",
  "escape_allowlist",
  "schema_contract_strictness",
  "ratchet",
  "wiring_integrity",
  "smell",
  "test_anti_pattern",
]);

const DEFAULT_LAYER_DESCRIPTIONS = Object.freeze({
  safety_hooks:
    "Confirm guarded execution, forbidden-action handling, and operator-safety hooks before closure.",
  typecheck: "Run package-appropriate type or syntax checks for changed source and witness code.",
  lint_format:
    "Run package-appropriate lint and formatting integrity checks without broad rewrites.",
  mechanical_gate:
    "Evaluate strict config, governed surfaces, escape allowlists, schema/contract strictness, ratchets, wiring integrity, smell checks, and test anti-pattern risk.",
  unit: "Exercise isolated deterministic behavior for changed planner and verification-delta logic.",
  integration:
    "Exercise producer-to-intake-to-plan orchestration using real artifacts and carriers.",
  contract_adapter:
    "Verify public artifact schema contracts and adapter boundaries used by the plan seam.",
  e2e: "Prove the intended user-facing planning flow through a durable artifact carrier where available.",
  ui_verification:
    "Classify user-interface verification need for this plan scope with explicit rationale.",
  ai_eval: "Classify AI-evaluation need for any model-mediated behavior with explicit rationale.",
  build_package:
    "Run package build or package-local integrity checks needed by the touched surface.",
  context_drift:
    "Check context, docs, prompts, schemas, and handoff drift for the changed surface.",
  observability: "Verify logs, evidence paths, metrics, or traces needed to inspect the change.",
  advisory_review: "Record advisory review needs separately from deterministic validation gates.",
  final_dod: "Confirm final definition-of-done evidence and independent validation handoff.",
  schema_validation:
    "Validate every produced canonical artifact through the public artifact validator before and after persistence.",
});

const DEFAULT_EVIDENCE_KIND_BY_LAYER = Object.freeze({
  safety_hooks: "command_log",
  typecheck: "command_log",
  lint_format: "command_log",
  mechanical_gate: "test_report",
  unit: "test_report",
  integration: "test_report",
  contract_adapter: "evidence_packet",
  e2e: "trace",
  ui_verification: "screenshot",
  ai_eval: "metric",
  build_package: "command_log",
  context_drift: "context_header",
  observability: "trace",
  advisory_review: "evidence_packet",
  final_dod: "evidence_packet",
  schema_validation: "command_log",
});

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }
  return value.trim();
}

function hasLayer(layers, layer) {
  return Array.isArray(layers) && layers.includes(layer);
}

function normalizeLayerOverride(overrides, layer) {
  if (!isPlainObject(overrides)) return {};
  const override = overrides[layer];
  if (override === undefined) return {};
  if (!isPlainObject(override))
    throw new TypeError(`verificationDeltaOverrides.${layer} must be an object.`);
  return override;
}

function chooseDefaultAction(layer, options) {
  if (hasLayer(options.notApplicableLayers, layer)) return "not_applicable";
  if (hasLayer(options.reuseLayers, layer)) return "reuse";
  if (hasLayer(options.updateLayers, layer)) return "update";
  return "add";
}

function expectedArtifactForLayer(layer, planArtifactId) {
  return `${planArtifactId}/verification/${layer}`;
}

function rationaleForLayer(layer, action, workBrief, override) {
  if (typeof override.rationale === "string" && override.rationale.trim().length > 0)
    return override.rationale.trim();
  const workType = typeof workBrief.workType === "string" ? workBrief.workType : "work";
  const base = DEFAULT_LAYER_DESCRIPTIONS[layer];
  if (action === "not_applicable")
    return `${base} Classified not applicable for ${workType} scope with explicit planner review.`;
  if (action === "reuse")
    return `${base} Existing evidence may be reused for this ${workType} scope if independently witnessed.`;
  if (action === "update")
    return `${base} Existing coverage requires update for this ${workType} scope.`;
  if (action === "blocked")
    return `${base} This required verification is currently blocked and prevents green approval.`;
  return `${base} Required for this ${workType} implementation plan.`;
}

export function buildSensitiveAreas(workBrief, options = {}) {
  const areas = [];
  const explicit = Array.isArray(options.sensitiveAreas) ? options.sensitiveAreas : [];
  for (const [index, item] of explicit.entries()) {
    if (!isPlainObject(item)) throw new TypeError(`sensitiveAreas[${index}] must be an object.`);
    const area = normalizeNonEmptyString(item.area, `sensitiveAreas[${index}].area`);
    const reason = normalizeNonEmptyString(item.reason, `sensitiveAreas[${index}].reason`);
    areas.push(`${area}: ${reason}`);
  }
  if (typeof workBrief.workType === "string")
    areas.push(
      `work_type:${workBrief.workType}: Work type influences required verification scope.`,
    );
  if (Array.isArray(workBrief.constraints) && workBrief.constraints.length > 0)
    areas.push("constraints: Work Brief constraints require planner-owned verification treatment.");
  if (Array.isArray(workBrief.risksAndUnknowns) && workBrief.risksAndUnknowns.length > 0)
    areas.push("risks_and_unknowns: Work Brief candidate risks require planner-owned mitigation.");
  return Object.freeze(
    areas.length > 0
      ? areas
      : ["artifact_handoff: Plan was derived from a typed Work Brief carrier."],
  );
}

export function buildVerificationDelta({
  planArtifactId,
  workBrief,
  now,
  producer,
  ownership,
  options = {},
}) {
  const overrides = isPlainObject(options.verificationDeltaOverrides)
    ? options.verificationDeltaOverrides
    : {};
  const blockedLayers = Array.isArray(options.blockedLayers) ? options.blockedLayers : [];
  const requiredItems = VERIFICATION_DELTA_LAYERS.map((layer) => {
    const override = normalizeLayerOverride(overrides, layer);
    const forcedBlocked = blockedLayers.includes(layer);
    const action = forcedBlocked
      ? "blocked"
      : (override.action ?? chooseDefaultAction(layer, options));
    if (!VERIFICATION_DELTA_ACTIONS.includes(action))
      throw new TypeError(`Invalid Verification Delta action for ${layer}: ${action}`);
    const item = {
      id: `vd-${layer}`,
      layer,
      action,
      rationale: rationaleForLayer(layer, action, workBrief, override),
      expectedArtifacts:
        Array.isArray(override.expectedArtifacts) && override.expectedArtifacts.length > 0
          ? override.expectedArtifacts
          : [expectedArtifactForLayer(layer, planArtifactId)],
      blocking:
        typeof override.blocking === "boolean" ? override.blocking : action !== "not_applicable",
      validationOwner: normalizeNonEmptyString(
        override.validationOwner ?? options.validationOwner ?? "independent-validator",
        `${layer}.validationOwner`,
      ),
      fixerOwner: normalizeNonEmptyString(
        override.fixerOwner ?? options.fixerOwner ?? "implementation-agent",
        `${layer}.fixerOwner`,
      ),
      evidenceRequired:
        Array.isArray(override.evidenceRequired) && override.evidenceRequired.length > 0
          ? override.evidenceRequired
          : [
              {
                kind: DEFAULT_EVIDENCE_KIND_BY_LAYER[layer],
                description: `Evidence proving ${layer} verification outcome for ${planArtifactId}.`,
                blocking: action !== "not_applicable",
              },
            ],
    };
    if (action === "blocked") {
      item.blockedBy = normalizeNonEmptyString(
        override.blockedBy ?? options.blockedBy ?? `blocked-${layer}`,
        `${layer}.blockedBy`,
      );
      item.unblockCondition = normalizeNonEmptyString(
        override.unblockCondition ??
          options.unblockCondition ??
          `Provide executable evidence for ${layer}.`,
        `${layer}.unblockCondition`,
      );
      item.blocking = true;
    }
    return item;
  });
  const blocked = requiredItems.some((item) => item.action === "blocked" && item.blocking === true);
  return {
    schemaVersion: "1.0.0",
    artifactKind: "verification_delta",
    artifactId: `${planArtifactId}-verification-delta`,
    title: `Verification Delta for ${workBrief.title}`,
    createdAt: now,
    updatedAt: now,
    producer,
    status: blocked ? "blocked" : "complete",
    ownership,
    links: [
      {
        rel: "verification_delta_of",
        artifactKind: "implementation_plan",
        artifactId: planArtifactId,
        path: `${planArtifactId}.json`,
        required: true,
        statusAtLinkTime: blocked ? "blocked" : "approved",
      },
    ],
    extensions: {
      "dev.vibe.plan-skill": {
        schemaVersion: "1.0.0",
        sourceWorkBriefId: workBrief.artifactId,
        sourceSkill: workBrief.sourceSkill,
      },
    },
    summary: `Verification Delta covers ${VERIFICATION_DELTA_LAYERS.length} locked layers for ${workBrief.artifactId}.`,
    implementationPlanRef: {
      rel: "verification_delta_of",
      artifactKind: "implementation_plan",
      artifactId: planArtifactId,
      path: `${planArtifactId}.json`,
      required: true,
      statusAtLinkTime: blocked ? "blocked" : "approved",
    },
    sensitiveAreas: buildSensitiveAreas(workBrief, options),
    catalogVersion: VERIFICATION_DELTA_CATALOG_VERSION,
    requiredItems,
    mechanicalGateImpacts: MECHANICAL_GATE_CONSIDERATIONS.map(
      (item) => `${item}: considered for this plan.`,
    ),
    advisoryReviewItems: [
      "Independent validation must classify deterministic blockers before any advisory review can be treated as closure.",
    ],
    rerunHints: ["Re-run public artifact validation after every plan or carrier mutation."],
    riskLinks: [
      {
        rel: "derived_from",
        artifactKind: "work_brief",
        artifactId: workBrief.artifactId,
        path: `${workBrief.artifactId}.json`,
        required: true,
        statusAtLinkTime: workBrief.status,
      },
    ],
  };
}
