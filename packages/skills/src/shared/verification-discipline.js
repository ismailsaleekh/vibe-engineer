const APP_AWARE_SCHEMATICS = Object.freeze([
  "nest-feature-module",
  "nest-crud-resource",
  "react-route-module",
  "react-crud-feature",
  "expo-screen-flow",
  "mobile-crud-flow",
  "playwright-e2e-spec",
  "maestro-e2e-flow",
]);

export const PLAN_BUILD_DISCIPLINE_EXTENSION = "dev.vibe.plan-build-discipline";
export const ARCHITECTURE_AGENT_REVIEW_ITEM_ID = "architecture-agent-review";
export const ARCHITECTURE_AGENT_REVIEW_LAYER = "advisory_review";

export const VERIFICATION_CLASSIFICATIONS = Object.freeze([
  "registered",
  "build-must-register",
  "not-applicable",
  "advisory",
  "manual-only",
]);

export const VERIFICATION_LAYERS = Object.freeze([
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

const QUALITY_LAYERS = new Set(["typecheck", "lint_format", "unit", "build_package"]);
const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/;

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function safeId(value, fallback = "x") {
  const normalized = normalizeString(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9]+$/, "");
  return SAFE_ID_PATTERN.test(normalized) ? normalized : fallback;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function normalizeAvailableSchematics(value) {
  if (!Array.isArray(value)) return new Set(APP_AWARE_SCHEMATICS);
  const slugs = value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (isPlainObject(entry)) return entry.slug ?? entry.id ?? entry.name;
      return null;
    })
    .filter((entry) => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim());
  return new Set(slugs);
}

function textForDetection(workBrief, affectedAreas, options) {
  const parts = [];
  for (const field of [
    "title",
    "background",
    "problemOrOpportunity",
    "desiredOutcome",
    "affectedSurface",
    "observedBehavior",
    "expectedBehavior",
    "workType",
  ]) {
    if (typeof workBrief?.[field] === "string") parts.push(workBrief[field]);
  }
  for (const field of [
    "scope",
    "constraints",
    "userVisibleBehavior",
    "nonGoals",
    "risksAndUnknowns",
  ]) {
    if (Array.isArray(workBrief?.[field]))
      parts.push(...workBrief[field].filter((item) => typeof item === "string"));
  }
  if (Array.isArray(affectedAreas)) {
    for (const area of affectedAreas) {
      if (!isPlainObject(area)) continue;
      for (const field of ["kind", "path", "reason"]) {
        if (typeof area[field] === "string") parts.push(area[field]);
      }
    }
  }
  if (Array.isArray(options?.implementationSurfaces)) parts.push(...options.implementationSurfaces);
  return parts.join("\n").toLowerCase();
}

function detectImplementationSurfaces(workBrief, affectedAreas, options = {}) {
  const explicit = normalizeStringArray(options.implementationSurfaces);
  const explicitSet = new Set(explicit.map((item) => item.toLowerCase()));
  const text = textForDetection(workBrief, affectedAreas, options);
  const backend =
    explicitSet.has("backend") ||
    explicitSet.has("api") ||
    /(^|[^a-z])(backend|api|server|nestjs?|controller|service|provider|prisma|database|apps\/api)([^a-z]|$)/u.test(
      text,
    );
  const web =
    explicitSet.has("web") ||
    explicitSet.has("frontend") ||
    /(^|[^a-z])(web|frontend|react|route|browser|component|hook|apps\/web)([^a-z]|$)/u.test(text);
  const mobile =
    explicitSet.has("mobile") ||
    explicitSet.has("expo") ||
    /(^|[^a-z])(mobile|expo|screen|navigation|maestro|apps\/mobile)([^a-z]|$)/u.test(text);
  const reasons = [];
  if (backend)
    reasons.push(
      "backend/api implementation signals were found in the Work Brief or affected areas.",
    );
  if (web)
    reasons.push(
      "web/frontend implementation signals were found in the Work Brief or affected areas.",
    );
  if (mobile)
    reasons.push(
      "mobile/expo implementation signals were found in the Work Brief or affected areas.",
    );
  return { backend, web, mobile, text, reasons };
}

function chooseSchematicSlug(surface, text) {
  const crud = /(^|[^a-z])(crud|create|read|update|delete|resource|list|edit|form)([^a-z]|$)/u.test(
    text,
  );
  if (surface === "backend") return crud ? "nest-crud-resource" : "nest-feature-module";
  if (surface === "web") return crud ? "react-crud-feature" : "react-route-module";
  if (surface === "mobile") return crud ? "mobile-crud-flow" : "expo-screen-flow";
  return null;
}

function schematicPlanEntry(planArtifactId, slug, surface, purpose) {
  const artifactId = safeId(slug, "schematic");
  return {
    schematicRef: {
      rel: "manifest_for",
      artifactKind: "schematic_manifest",
      artifactId,
      path: `packages/schematics/templates/${slug}/manifest.json`,
      required: true,
      statusAtLinkTime: "planned",
    },
    plannedInputsRef: {
      rel: "derived_from",
      artifactKind: "implementation_plan",
      artifactId: safeId(`${planArtifactId}-${slug}-inputs`, `${artifactId}-inputs`),
      path: `${planArtifactId}/schematics/${slug}.inputs.json`,
      required: true,
      statusAtLinkTime: "planned",
    },
    purpose: purpose || `Generate repeatable ${surface} structure with ${slug}.`,
  };
}

function normalizePlannedSchematicOverride(entry, index, planArtifactId) {
  if (!isPlainObject(entry)) throw new TypeError(`plannedSchematics[${index}] must be an object.`);
  const slug = normalizeString(entry.slug ?? entry.id ?? entry.schematic, "");
  if (!slug) throw new TypeError(`plannedSchematics[${index}] requires slug.`);
  const surface = normalizeString(entry.surface, "custom");
  const purpose = normalizeString(entry.purpose, `Apply planned schematic ${slug}.`);
  return {
    slug,
    surface,
    reason: normalizeString(entry.reason, purpose),
    required: entry.required !== false,
    planEntry: isPlainObject(entry.planEntry)
      ? entry.planEntry
      : schematicPlanEntry(planArtifactId, slug, surface, purpose),
  };
}

function buildSchematicPlan(
  planArtifactId,
  workBrief,
  affectedAreas,
  options,
  surfaces,
  availableSchematics,
) {
  const planned = [];
  if (Array.isArray(options.plannedSchematics)) {
    options.plannedSchematics.forEach((entry, index) => {
      planned.push(normalizePlannedSchematicOverride(entry, index, planArtifactId));
    });
  } else if (options.requireSchematics !== false) {
    for (const [surface, required] of Object.entries({
      backend: surfaces.backend,
      web: surfaces.web,
      mobile: surfaces.mobile,
    })) {
      if (!required) continue;
      const slug = chooseSchematicSlug(surface, surfaces.text);
      if (!slug) continue;
      planned.push({
        slug,
        surface,
        reason: `Detected ${surface} implementation work that benefits from the built-in ${slug} schematic.`,
        required: true,
        planEntry: schematicPlanEntry(
          planArtifactId,
          slug,
          surface,
          `Use ${slug} for repeatable ${surface} app structure instead of ad-hoc file creation.`,
        ),
      });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const item of planned) {
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    deduped.push(item);
  }

  const gaps = deduped
    .filter((item) => !availableSchematics.has(item.slug))
    .map((item) => ({
      slug: item.slug,
      surface: item.surface,
      blocking: item.required !== false,
      reason: `Required schematic ${item.slug} for ${item.surface} is not available in the active schematic catalog.`,
    }));

  const noneJustification =
    deduped.length === 0
      ? surfaces.backend || surfaces.web || surfaces.mobile
        ? "No repeatable app schematic was selected because the plan constraints explicitly disabled schematic use."
        : "No backend, web, or mobile repeatable app-structure changes were detected; schematics are not applicable."
      : null;

  return {
    applicable: deduped,
    gaps,
    noneJustification,
    availableSchematics: [...availableSchematics].sort(),
  };
}

function runnerRequiredItemIds(spec) {
  return Array.isArray(spec?.requiredItemIds)
    ? spec.requiredItemIds.filter((entry) => typeof entry === "string")
    : [];
}

export function runnerMatchesRequiredItem(spec, itemId, layer) {
  if (!isPlainObject(spec)) return false;
  const specLayer = typeof spec.layer === "string" ? spec.layer : "";
  if (specLayer !== layer) return false;
  const specId = typeof spec.id === "string" ? spec.id : "";
  return (
    specId === itemId ||
    specId === `${layer}:${itemId}` ||
    runnerRequiredItemIds(spec).includes(itemId)
  );
}

export function findMatchingRunners(catalog, itemId, layer) {
  if (!Array.isArray(catalog)) return [];
  return catalog.filter((entry) => runnerMatchesRequiredItem(entry, itemId, layer));
}

function hasBlockingRunner(catalog, itemId, layer) {
  return findMatchingRunners(catalog, itemId, layer).some((entry) => entry.blocking === true);
}

function selectedHarnessId(options) {
  const explicit = options.selectedHarness ?? options.agenticHarness ?? options.harness;
  if (typeof explicit === "string" && explicit.trim().length > 0) return explicit.trim();
  const metadata = options.selectedHarnessMetadata;
  if (isPlainObject(metadata)) {
    const id = metadata.id ?? metadata.adapterId ?? metadata.agenticHarness;
    if (typeof id === "string" && id.trim().length > 0) return id.trim();
  }
  return "pi";
}

export function createDefaultArchitectureRunnerCatalogEntry(options = {}) {
  const harnessId = selectedHarnessId(options);
  return {
    kind: "command",
    id: ARCHITECTURE_AGENT_REVIEW_ITEM_ID,
    requiredItemIds: [ARCHITECTURE_AGENT_REVIEW_ITEM_ID],
    layer: ARCHITECTURE_AGENT_REVIEW_LAYER,
    layerEquivalent: "architecture_review",
    layerEquivalentReason:
      "The artifact schemas expose advisory_review; this item is the required architecture review gate.",
    evidenceClass: "deterministic",
    blocking: true,
    runnerType: "agent",
    agentRunner: true,
    description:
      "Single architecture agent review runner; invokes the selected harness and writes structured passed/failed/blocked evidence.",
    command: process.execPath,
    args: [".tooling/scripts/architecture-agent-review.mjs"],
    cwd: ".",
    argPaths: [{ index: 0, root: "projectRoot" }],
    expectedArtifacts: [".vibe/evidence/architecture-agent-review/review.json"],
    env: typeof process.env.PATH === "string" ? { PATH: process.env.PATH } : {},
    safety: {
      classification: "local_deterministic_write",
      timeoutMs: 30000,
      maxStdoutBytes: 500000,
      maxStderrBytes: 500000,
      maxOutputBytes: 1200000,
      passThroughEnv: false,
      envAllowlist: ["PATH"],
      allowedWriteRoots: [".vibe/evidence"],
    },
    vibeEngineerHarness: {
      schemaVersion: "vibe-engineer.runner-catalog-harness.v1",
      adapterId: harnessId,
      noFallbackToPi: true,
    },
    architectureReview: {
      schemaVersion: "vibe-engineer.runner-catalog-architecture-review.v1",
      outputSchemaVersion: "vibe-engineer.architecture-agent-review.v1",
      promptPath: ".vibe/verification/architecture-agent-review/prompt.md",
      outputSchemaPath: ".vibe/verification/architecture-agent-review/schema.json",
      evidenceOutputPath: ".vibe/evidence/architecture-agent-review/review.json",
      scriptPath: ".tooling/scripts/architecture-agent-review.mjs",
      selectedHarnessMetadataPath: ".vibe/harness/selected-harness.json",
      noFallbackToPi: true,
    },
  };
}

function classificationToDeltaAction(classification, preferredAction) {
  if (preferredAction === "add" || preferredAction === "update") return preferredAction;
  if (classification === "registered" || classification === "build-must-register") return "add";
  return "not_applicable";
}

function evidenceKindForLayer(layer, classification) {
  if (classification === "advisory" || classification === "manual-only") return "evidence_packet";
  if (layer === "ui_verification") return "screenshot";
  if (layer === "ai_eval") return "metric";
  if (layer === "context_drift") return "context_header";
  if (layer === "e2e") return "trace";
  if (layer === "mechanical_gate" || layer === "unit" || layer === "integration")
    return "test_report";
  return "command_log";
}

function baseClassificationForLayer(layer, catalog) {
  const itemId = layer;
  const matching = findMatchingRunners(catalog, itemId, layer);
  if (matching.length > 0) {
    const blocking = hasBlockingRunner(catalog, itemId, layer);
    return {
      itemId,
      layer,
      classification: blocking ? "registered" : "advisory",
      blocking,
      deltaAction: blocking ? "add" : "not_applicable",
      runnerRegistered: true,
      rationale: blocking
        ? `Runner catalog already registers blocking executable verification for ${layer}.`
        : `Runner catalog contains only non-blocking/advisory verification for ${layer}.`,
      expectedArtifacts: [`${layer}/evidence`],
    };
  }
  if (QUALITY_LAYERS.has(layer)) {
    return {
      itemId,
      layer,
      classification: "not-applicable",
      blocking: false,
      deltaAction: "not_applicable",
      runnerRegistered: false,
      rationale: `${layer} is not blocking for this plan because no matching runner is registered in the active catalog.`,
      expectedArtifacts: [`${layer}/not-applicable`],
    };
  }
  return {
    itemId,
    layer,
    classification: layer === "advisory_review" ? "advisory" : "not-applicable",
    blocking: false,
    deltaAction: "not_applicable",
    runnerRegistered: false,
    rationale:
      layer === "advisory_review"
        ? "No implementation-boundary architecture change requires advisory review for this plan."
        : `${layer} is not applicable to this bounded implementation scope.`,
    expectedArtifacts: [`${layer}/not-applicable`],
  };
}

function normalizeVerificationRequirement(entry, index, catalog, options) {
  if (!isPlainObject(entry))
    throw new TypeError(`verificationRequirements[${index}] must be an object.`);
  const layer = normalizeString(entry.layer, "");
  if (!VERIFICATION_LAYERS.includes(layer))
    throw new TypeError(`verificationRequirements[${index}].layer is not a supported layer.`);
  const itemId = safeId(entry.itemId ?? entry.id ?? layer, layer);
  const runnerRegistered = findMatchingRunners(catalog, itemId, layer).length > 0;
  const classification = normalizeString(
    entry.classification,
    runnerRegistered
      ? "registered"
      : entry.runnerCatalogEntry
        ? "build-must-register"
        : "not-applicable",
  );
  if (!VERIFICATION_CLASSIFICATIONS.includes(classification))
    throw new TypeError(`verificationRequirements[${index}].classification is invalid.`);
  const blocking =
    typeof entry.blocking === "boolean"
      ? entry.blocking
      : classification === "registered" || classification === "build-must-register";
  const deltaAction = classificationToDeltaAction(classification, entry.action);
  return {
    itemId,
    layer,
    classification,
    blocking,
    deltaAction,
    runnerRegistered,
    runnerCatalogEntry: isPlainObject(entry.runnerCatalogEntry)
      ? entry.runnerCatalogEntry
      : undefined,
    rationale: normalizeString(
      entry.rationale,
      `${itemId} is classified ${classification} for ${layer} verification.`,
    ),
    expectedArtifacts:
      Array.isArray(entry.expectedArtifacts) && entry.expectedArtifacts.length > 0
        ? entry.expectedArtifacts.map(String)
        : [`${layer}/${itemId}`],
  };
}

function createVerificationClassifications(surfaces, catalog, options) {
  const byLayer = new Map(
    VERIFICATION_LAYERS.map((layer) => [layer, baseClassificationForLayer(layer, catalog)]),
  );
  const architectureRequired = Boolean(surfaces.backend || surfaces.web || surfaces.mobile);
  if (architectureRequired) {
    const itemId = ARCHITECTURE_AGENT_REVIEW_ITEM_ID;
    const runnerRegistered =
      findMatchingRunners(catalog, itemId, ARCHITECTURE_AGENT_REVIEW_LAYER).length > 0;
    byLayer.set(ARCHITECTURE_AGENT_REVIEW_LAYER, {
      itemId,
      layer: ARCHITECTURE_AGENT_REVIEW_LAYER,
      layerEquivalent: "architecture_review",
      classification: runnerRegistered ? "registered" : "build-must-register",
      blocking: true,
      deltaAction: "add",
      runnerRegistered,
      runnerCatalogEntry: runnerRegistered
        ? undefined
        : createDefaultArchitectureRunnerCatalogEntry(options),
      rationale:
        "Backend, web, or mobile implementation changes require the single architecture-agent-review runner before build closure.",
      expectedArtifacts: [".vibe/evidence/architecture-agent-review/review.json"],
      selectedHarnessImplication:
        "The architecture review must invoke the selected harness only and must not silently fall back to Pi.",
    });
  }
  if (Array.isArray(options.verificationRequirements)) {
    options.verificationRequirements.forEach((entry, index) => {
      const normalized = normalizeVerificationRequirement(entry, index, catalog, options);
      byLayer.set(normalized.layer, normalized);
    });
  }
  return VERIFICATION_LAYERS.map((layer) => byLayer.get(layer));
}

export function createPlanBuildDiscipline({
  planArtifactId,
  workBrief,
  affectedAreas,
  options = {},
}) {
  const availableSchematics = normalizeAvailableSchematics(options.availableSchematics);
  const runnerCatalog = Array.isArray(options.runnerCatalog) ? options.runnerCatalog : [];
  const surfaces = detectImplementationSurfaces(workBrief, affectedAreas, options);
  const schematicPlan = buildSchematicPlan(
    planArtifactId,
    workBrief,
    affectedAreas,
    options,
    surfaces,
    availableSchematics,
  );
  const harnessId = selectedHarnessId(options);
  const classifications = createVerificationClassifications(surfaces, runnerCatalog, {
    ...options,
    selectedHarness: harnessId,
  });
  const architectureClassification = classifications.find(
    (entry) => entry.itemId === ARCHITECTURE_AGENT_REVIEW_ITEM_ID,
  );
  return {
    schemaVersion: "1.0.0",
    selectedHarness: {
      id: harnessId,
      implications: [
        `Executable agent verification must use the selected ${harnessId} harness only.`,
        "If the selected harness CLI/runtime/auth is unavailable or output is unparseable, blocking verification must fail closed.",
        "No silent Pi fallback is allowed for non-Pi harness selections.",
      ],
    },
    implementationSurfaces: {
      backend: surfaces.backend,
      web: surfaces.web,
      mobile: surfaces.mobile,
      reasons: surfaces.reasons,
    },
    schematicPlan: {
      applicable: schematicPlan.applicable.map(({ planEntry, ...entry }) => entry),
      noneJustification: schematicPlan.noneJustification,
      gaps: schematicPlan.gaps,
      availableSchematics: schematicPlan.availableSchematics,
    },
    planSchematicEntries: schematicPlan.applicable.map((entry) => entry.planEntry),
    verificationPlan: {
      classificationLegend: [...VERIFICATION_CLASSIFICATIONS],
      classifications,
      architectureAgentReview: {
        required: Boolean(architectureClassification?.blocking),
        itemId: ARCHITECTURE_AGENT_REVIEW_ITEM_ID,
        layer: ARCHITECTURE_AGENT_REVIEW_LAYER,
        layerEquivalent: "architecture_review",
        classification: architectureClassification?.classification ?? "not-applicable",
        selectedHarnessImplication:
          architectureClassification?.selectedHarnessImplication ??
          "Architecture review is not required because no backend/web/mobile implementation change was detected.",
      },
    },
  };
}

export function verificationDeltaOverridesFromDiscipline(discipline) {
  const classifications = discipline?.verificationPlan?.classifications;
  if (!Array.isArray(classifications)) return {};
  const overrides = {};
  for (const entry of classifications) {
    if (!isPlainObject(entry) || !VERIFICATION_LAYERS.includes(entry.layer)) continue;
    const classification = VERIFICATION_CLASSIFICATIONS.includes(entry.classification)
      ? entry.classification
      : "not-applicable";
    const blocking = entry.blocking === true;
    overrides[entry.layer] = {
      id: safeId(entry.itemId ?? entry.layer, entry.layer),
      action: classificationToDeltaAction(classification, entry.deltaAction),
      blocking,
      rationale: normalizeString(
        entry.rationale,
        `${entry.layer} verification classified ${classification} by plan/build discipline.`,
      ),
      expectedArtifacts:
        Array.isArray(entry.expectedArtifacts) && entry.expectedArtifacts.length > 0
          ? entry.expectedArtifacts.map(String)
          : [`${entry.layer}/${safeId(entry.itemId ?? entry.layer, entry.layer)}`],
      evidenceRequired: [
        {
          kind: evidenceKindForLayer(entry.layer, classification),
          description: `${entry.layer} verification classified ${classification} by plan/build discipline.`,
          blocking,
        },
      ],
    };
  }
  return overrides;
}

export function disciplineOpenBlockers(discipline) {
  const blockers = [];
  const gaps = discipline?.schematicPlan?.gaps;
  if (Array.isArray(gaps)) {
    for (const gap of gaps) {
      if (!isPlainObject(gap) || gap.blocking !== true) continue;
      blockers.push({
        id: `blocker-schematic-${safeId(gap.slug, "missing")}`,
        description: gap.reason,
        blocking: true,
        owner: "planner",
      });
    }
  }
  const classifications = discipline?.verificationPlan?.classifications;
  if (Array.isArray(classifications)) {
    for (const item of classifications) {
      if (!isPlainObject(item) || item.blocking !== true) continue;
      if (
        (item.classification === "manual-only" || item.classification === "advisory") &&
        item.blocking === true
      ) {
        blockers.push({
          id: `blocker-verification-${safeId(item.itemId ?? item.layer, "manual")}`,
          description: `Blocking verification item ${item.itemId ?? item.layer} is ${item.classification}; blocking closure requires executable registered verification.`,
          blocking: true,
          owner: "planner",
        });
      }
      if (item.classification === "registered" && item.runnerRegistered !== true) {
        blockers.push({
          id: `blocker-runner-missing-${safeId(item.itemId ?? item.layer, "runner")}`,
          description: `Verification item ${item.itemId ?? item.layer} is classified registered but no matching executable runner is present in the active catalog.`,
          blocking: true,
          owner: "planner",
        });
      }
      if (
        item.classification === "build-must-register" &&
        !isPlainObject(item.runnerCatalogEntry)
      ) {
        blockers.push({
          id: `blocker-runner-entry-${safeId(item.itemId ?? item.layer, "runner")}`,
          description: `Verification item ${item.itemId ?? item.layer} must be registered during build but has no runner catalog entry shape.`,
          blocking: true,
          owner: "planner",
        });
      }
    }
  }
  return blockers;
}

export function plannedSchematicSlugsFromPlan(plan) {
  const extension = plan?.extensions?.[PLAN_BUILD_DISCIPLINE_EXTENSION];
  const applicable = extension?.schematicPlan?.applicable;
  if (Array.isArray(applicable) && applicable.length > 0) {
    return applicable
      .map((entry) => (isPlainObject(entry) ? entry.slug : null))
      .filter((entry) => typeof entry === "string" && entry.length > 0);
  }
  if (!Array.isArray(plan?.schematics)) return [];
  return plan.schematics
    .map((entry) => entry?.schematicRef?.artifactId ?? entry?.schematicRef?.path)
    .filter((entry) => typeof entry === "string" && entry.length > 0)
    .map((entry) => {
      const value = entry.includes("/") ? (entry.split("/").at(-2) ?? entry) : entry;
      return value.replace(/\.json$/u, "");
    });
}

export function planBuildDisciplineFromPlan(plan) {
  const extension = plan?.extensions?.[PLAN_BUILD_DISCIPLINE_EXTENSION];
  return isPlainObject(extension) ? extension : null;
}

export function blockingVerificationItems(plan) {
  const items = plan?.verificationDelta?.requiredItems;
  return Array.isArray(items)
    ? items.filter((item) => isPlainObject(item) && item.blocking === true)
    : [];
}
