import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ARTIFACT_KINDS, loadSchema, validateArtifactFile } from "@vibe-engineer/artifacts";

export const RegistrySeverity = Object.freeze({
  CRITICAL: "critical",
  MAJOR_LOCAL: "major-local",
  MINOR_LOCAL: "minor-local",
});

export const RegistryRuleId = Object.freeze({
  SCHEMA_I01A: "schema.i01a.agent_registry_entry",
  FILE_DISCOVERY: "registry.file_discovery",
  DUPLICATE_ID: "registry.graph.duplicate_id",
  REF_RESOLUTION: "registry.graph.ref_resolution",
  REF_TYPE_COMPATIBILITY: "registry.graph.ref_type_compatibility",
  REQUIRED_VALIDATOR: "registry.graph.required_validator",
  SELF_VALIDATION_ONLY: "registry.graph.self_validation_only",
  INDEPENDENCE_CYCLE: "registry.graph.independence_cycle",
  UNUSED_VALIDATOR_FIXER: "registry.graph.unused_validator_fixer",
  UNLINKED_STABLE_CORE: "registry.graph.unlinked_stable_core",
  TOOL_FORBIDDEN_PRECEDENCE: "registry.policy.tool_forbidden_precedence",
  MATURITY_EVIDENCE: "registry.policy.maturity_evidence",
  DEPRECATION_SUPERSESSION: "registry.policy.deprecation_supersession",
  DOMAIN_NEUTRALITY: "registry.policy.domain_neutrality",
  SCOPE_CLASSIFICATION: "registry.policy.scope_classification",
  DORMANT_RATIONALE: "registry.policy.dormant_rationale",
  META_AGENT_SAFETY: "registry.policy.meta_agent_safety",
  ADAPTER_SCOPE: "registry.policy.adapter_scope",
  SKILL_LINKS: "registry.policy.skill_links",
});

export const LOCKED_SKILLS = Object.freeze([
  "brainstorm",
  "grill-me",
  "task",
  "plan",
  "build",
  "ship",
]);
export const PRODUCT_NAME = "vibe-engineer";
export const ARTIFACT_FLOW = Object.freeze([
  "raw_intent",
  "work_brief",
  "implementation_plan",
  "build_result",
  "ship_packet",
]);

const REGISTRY_EXTENSION = "dev.vibe.registry";
const REQUIRED_META_FORBIDDEN = Object.freeze([
  "silent_mutation",
  "auto_registration",
  "direct_file_mutation",
  "push",
  "pr",
  "verification_bypass",
]);
const FORBIDDEN_CORE_TERMS = Object.freeze([
  "ecommerce",
  "e-commerce",
  "inventory",
  "fashion",
  "billz",
  "telegram",
  "instagram",
  "shopify",
  "checkout",
  "cart",
  "sku",
]);
const LOAD_BEARING_VALIDATOR_REQUIRED_TYPES = Object.freeze([
  "orchestrator",
  "specialist",
  "validator",
  "fixer",
  "meta",
  "skill_adapter",
]);
const BYPASS_RATIONALE_STATES = Object.freeze([
  "non_load_bearing",
  "dormant",
  "deprecated",
  "sample_demo",
]);
const SCHEMA_IDS_BY_KIND = Object.freeze(
  Object.fromEntries(ARTIFACT_KINDS.map((kind) => [kind, loadSchema(kind).$id])),
);

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pointer(pathValue) {
  return pathValue || "";
}

function makeError({
  filePath = null,
  entryId = null,
  ruleId,
  severity = RegistrySeverity.CRITICAL,
  pointer: jsonPointer = "",
  message,
  schemaId = null,
  schemaCode = null,
  details = undefined,
}) {
  return {
    path: filePath,
    entryId,
    ruleId,
    severity,
    pointer: pointer(jsonPointer),
    schemaId,
    schemaCode,
    message,
    details,
  };
}

function entryExtension(entry) {
  return isObject(entry.extensions) && isObject(entry.extensions[REGISTRY_EXTENSION])
    ? entry.extensions[REGISTRY_EXTENSION]
    : { schemaVersion: "1.0.0" };
}

function classification(entry) {
  return entryExtension(entry).classification ?? "core";
}

function registryScope(entry) {
  return entryExtension(entry).registryScope ?? classification(entry);
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeCapability(value) {
  return normalizeText(value)
    .replace(/^tool:/, "")
    .replace(/^action:/, "")
    .replaceAll(/\s+/g, "_");
}

function refKey(ref) {
  return ref?.artifactId ?? null;
}

function isSelfRef(entry, ref) {
  return ref?.artifactKind === "agent_registry_entry" && ref?.artifactId === entry.agentId;
}

function isRequiredAgentRef(ref) {
  return ref?.artifactKind === "agent_registry_entry" && ref?.required === true;
}

function hasArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function defaultRepoRoot() {
  return path.resolve(packageRootFromImportMeta(), "../..");
}

function normalizeRelativePath(filePath, repoRoot) {
  const absolute = path.resolve(filePath);
  const relative = path.relative(repoRoot, absolute).replaceAll(path.sep, "/");
  return relative.startsWith("..") ? absolute : relative;
}

function resolveEvidencePath(refPath, repoRoot) {
  if (typeof refPath !== "string" || refPath.trim() === "") return null;
  return path.resolve(repoRoot, refPath);
}

const ALLOWED_EVIDENCE_PREFIXES = Object.freeze([
  ".vibe/registry/",
  ".vibe/work/I-04-agent-registry-validation/evidence/",
  ".vibe/work/I-04-agent-registry-validation/fix-evidence/",
  ".vibe/work/I-04-agent-registry-validation/residual-fix-evidence/",
  "packages/registry/fixtures/evidence/",
  "packages/registry/.generated-fixtures/",
]);

function isAllowedEvidencePath(absolutePath, repoRoot) {
  const relative = path.relative(repoRoot, absolutePath).replaceAll(path.sep, "/");
  return (
    relative &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative) &&
    ALLOWED_EVIDENCE_PREFIXES.some((prefix) => relative.startsWith(prefix))
  );
}

function extensionPointer(namespace, key) {
  return `/extensions/${namespace.replaceAll("~", "~0").replaceAll("/", "~1")}/${key}`;
}

function textForDomainScan(entry) {
  const ext = entryExtension(entry);
  const parts = [
    entry.artifactId,
    entry.agentId,
    entry.title,
    entry.displayName,
    entry.description,
    entry.purpose,
    entry.domainNeutralityReview,
    ...(Array.isArray(entry.tags) ? entry.tags : []),
    ...(Array.isArray(entry.examples) ? entry.examples : []),
    ...(Array.isArray(entry.contextRequirements) ? entry.contextRequirements : []),
    ...(Array.isArray(ext.linkedSkills) ? ext.linkedSkills : []),
    ext.scopeLabel,
    ext.rationale,
  ];
  return parts.filter(Boolean).join("\n").toLowerCase();
}

function walkJsonFiles(rootPath, discovered, errors) {
  let stat;
  try {
    stat = fs.statSync(rootPath);
  } catch (error) {
    errors.push(
      makeError({
        filePath: rootPath,
        ruleId: RegistryRuleId.FILE_DISCOVERY,
        pointer: "",
        message: `Registry root is not readable: ${error.message}`,
      }),
    );
    return;
  }
  if (stat.isFile()) {
    if (path.extname(rootPath) === ".json") discovered.push(path.resolve(rootPath));
    else
      errors.push(
        makeError({
          filePath: rootPath,
          ruleId: RegistryRuleId.FILE_DISCOVERY,
          pointer: "",
          message: "Registry entry carrier must be a .json file.",
        }),
      );
    return;
  }
  if (!stat.isDirectory()) {
    errors.push(
      makeError({
        filePath: rootPath,
        ruleId: RegistryRuleId.FILE_DISCOVERY,
        pointer: "",
        message: "Registry root must be a file or directory.",
      }),
    );
    return;
  }
  const entries = fs
    .readdirSync(rootPath, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const childPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) walkJsonFiles(childPath, discovered, errors);
    else if (entry.isFile() && path.extname(entry.name) === ".json")
      discovered.push(path.resolve(childPath));
  }
}

export function discoverRegistryEntryFiles(roots) {
  const rootList = Array.isArray(roots) ? roots : [roots];
  const files = [];
  const errors = [];
  for (const root of rootList.filter(Boolean)) walkJsonFiles(path.resolve(root), files, errors);
  return { files: uniqueSorted(files), errors };
}

function validateSchemaRefList(entry, listName, errors, filePath) {
  const refs = entry[listName];
  if (!Array.isArray(refs)) return;
  refs.forEach((schemaRef, index) => {
    const expected = SCHEMA_IDS_BY_KIND[schemaRef?.artifactKind];
    if (!expected || schemaRef.schemaId !== expected) {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId ?? entry.artifactId,
          ruleId: RegistryRuleId.MATURITY_EVIDENCE,
          pointer: `/${listName}/${index}/schemaId`,
          message: `${listName} must use canonical I-01A schema id for artifactKind ${schemaRef?.artifactKind}.`,
          details: { expected, actual: schemaRef?.schemaId },
        }),
      );
    }
  });
}

function validateToolPolicy(entry, filePath, errors) {
  const allowed = new Map(
    (entry.allowedTools ?? []).map((tool) => [normalizeCapability(tool), tool]),
  );
  for (const forbidden of entry.forbiddenActions ?? []) {
    const normalizedForbidden = normalizeCapability(forbidden);
    if (allowed.has(normalizedForbidden)) {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.TOOL_FORBIDDEN_PRECEDENCE,
          pointer: "/forbiddenActions",
          message: `Forbidden action ${forbidden} contradicts allowed tool ${allowed.get(normalizedForbidden)}; forbidden policy wins.`,
        }),
      );
    }
    for (const [normalizedAllowed, originalAllowed] of allowed) {
      if (
        normalizedForbidden === `use_${normalizedAllowed}` ||
        normalizedForbidden === `${normalizedAllowed}_write` ||
        normalizedForbidden.includes(`:${normalizedAllowed}`)
      ) {
        errors.push(
          makeError({
            filePath,
            entryId: entry.agentId,
            ruleId: RegistryRuleId.TOOL_FORBIDDEN_PRECEDENCE,
            pointer: "/forbiddenActions",
            message: `Forbidden action ${forbidden} conflicts with allowed tool ${originalAllowed}; forbidden policy wins.`,
          }),
        );
      }
    }
  }
}

function validateEvidenceRef(
  entry,
  ref,
  refPointer,
  expectedEvidenceType,
  filePath,
  options,
  errors,
) {
  if (
    !isObject(ref) ||
    ref.rel !== "evidence_for" ||
    ref.artifactKind !== "evidence_packet" ||
    ref.required !== true ||
    ref.statusAtLinkTime !== "passed"
  ) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: refPointer,
        message: `${expectedEvidenceType} evidence refs for stable/core entries must be required evidence_for links to passed evidence_packet artifacts.`,
      }),
    );
    return;
  }
  const repoRoot = path.resolve(options.repoRoot ?? defaultRepoRoot());
  const evidencePath = resolveEvidencePath(ref.path, repoRoot);
  if (!evidencePath || !isAllowedEvidencePath(evidencePath, repoRoot)) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: `${refPointer}/path`,
        message: `${expectedEvidenceType} evidence path must stay inside Q06-owned registry/package evidence locations.`,
        details: { path: ref.path, allowedPrefixes: ALLOWED_EVIDENCE_PREFIXES },
      }),
    );
    return;
  }
  if (!fs.existsSync(evidencePath)) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: `${refPointer}/path`,
        message: `${expectedEvidenceType} evidence packet file does not exist: ${normalizeRelativePath(evidencePath, repoRoot)}.`,
        details: { artifactId: ref.artifactId, path: ref.path },
      }),
    );
    return;
  }
  const evidenceResult = validateArtifactFile(evidencePath, { kind: "evidence_packet" });
  if (!evidenceResult.ok) {
    for (const schemaError of evidenceResult.errors) {
      errors.push(
        makeError({
          filePath: schemaError.artifactPath ?? evidencePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.MATURITY_EVIDENCE,
          pointer: refPointer,
          schemaId: schemaError.schemaId,
          schemaCode: schemaError.code,
          message: `${expectedEvidenceType} evidence packet failed I-01A schema validation: ${schemaError.message}`,
          details: {
            evidencePointer: schemaError.pointer,
            artifactId: ref.artifactId,
            path: ref.path,
          },
        }),
      );
    }
    return;
  }
  const evidence = evidenceResult.artifact;
  const evidenceExt = evidence.extensions?.["dev.vibe.registry.evidence"];
  if (evidence.artifactId !== ref.artifactId) {
    errors.push(
      makeError({
        filePath: evidencePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: `${refPointer}/artifactId`,
        message: `${expectedEvidenceType} evidence artifactId does not match registry reference.`,
        details: { expected: ref.artifactId, actual: evidence.artifactId },
      }),
    );
  }
  if (evidence.status !== "passed" || evidence.result !== "pass") {
    errors.push(
      makeError({
        filePath: evidencePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: refPointer,
        message: `${expectedEvidenceType} evidence must have status passed and result pass.`,
        details: { status: evidence.status, result: evidence.result },
      }),
    );
  }
  const subjectMatches = (evidence.subjectRefs ?? []).some(
    (subject) =>
      subject.rel === "evidence_for" &&
      subject.artifactKind === "agent_registry_entry" &&
      subject.artifactId === entry.agentId &&
      subject.required === true &&
      subject.statusAtLinkTime === entry.status,
  );
  if (!subjectMatches) {
    errors.push(
      makeError({
        filePath: evidencePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: "/subjectRefs",
        message: `${expectedEvidenceType} evidence packet must have a required evidence_for subjectRef for this agent registry entry.`,
        details: { expectedAgentId: entry.agentId, expectedStatus: entry.status },
      }),
    );
  }
  if (!isObject(evidenceExt)) {
    errors.push(
      makeError({
        filePath: evidencePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: "/extensions/dev.vibe.registry.evidence",
        message: `${expectedEvidenceType} evidence packet must carry typed registry evidence extension metadata.`,
      }),
    );
    return;
  }
  if (
    evidenceExt.agentId !== entry.agentId ||
    evidenceExt.agentVersion !== entry.agentVersion ||
    evidenceExt.evidenceType !== expectedEvidenceType
  ) {
    errors.push(
      makeError({
        filePath: evidencePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: "/extensions/dev.vibe.registry.evidence",
        message: `${expectedEvidenceType} evidence packet extension is stale or targets the wrong agent/version/type.`,
        details: {
          expected: {
            agentId: entry.agentId,
            agentVersion: entry.agentVersion,
            evidenceType: expectedEvidenceType,
          },
          actual: {
            agentId: evidenceExt.agentId,
            agentVersion: evidenceExt.agentVersion,
            evidenceType: evidenceExt.evidenceType,
          },
        },
      }),
    );
  }
}

function validateMaturityEvidence(entry, filePath, options, errors) {
  validateSchemaRefList(entry, "inputSchemas", errors, filePath);
  validateSchemaRefList(entry, "outputSchemas", errors, filePath);
  if (!["stable", "core"].includes(entry.maturity)) return;
  if (!entry.owner || !/^\d+\.\d+\.\d+$/.test(entry.agentVersion ?? "")) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: "/agentVersion",
        message: "Stable/core registry entries require owner and semantic agentVersion.",
      }),
    );
  }
  if (!hasArray(entry.changelog)) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: "/changelog",
        message: "Stable/core registry entries require changelog evidence.",
      }),
    );
  }
  if (!hasArray(entry.evals)) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: "/evals",
        message: "Stable/core registry entries require eval evidence refs.",
      }),
    );
  } else {
    entry.evals.forEach((ref, index) =>
      validateEvidenceRef(entry, ref, `/evals/${index}`, "eval", filePath, options, errors),
    );
  }
  const ext = entryExtension(entry);
  if (!hasArray(ext.smokeRefs)) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: extensionPointer(REGISTRY_EXTENSION, "smokeRefs"),
        message:
          "Stable/core registry entries require smoke evidence refs in registry extension metadata.",
      }),
    );
  } else {
    ext.smokeRefs.forEach((ref, index) =>
      validateEvidenceRef(
        entry,
        ref,
        `${extensionPointer(REGISTRY_EXTENSION, "smokeRefs")}/${index}`,
        "smoke",
        filePath,
        options,
        errors,
      ),
    );
  }
  if (!String(entry.domainNeutralityReview ?? "").includes("PASS")) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: "/domainNeutralityReview",
        message: "Stable/core registry entries require PASS domain-neutrality review evidence.",
      }),
    );
  }
}

function validateScopeAndDomain(entry, filePath, options, errors) {
  const ext = entryExtension(entry);
  const cls = classification(entry);
  const scope = registryScope(entry);
  const allowedScopes = new Set(options.allowedScopes ?? ["core"]);
  if (cls === "project_extension" || scope === "project_extension") {
    if (!allowedScopes.has("project_extension")) {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.SCOPE_CLASSIFICATION,
          pointer: `/extensions/${REGISTRY_EXTENSION}/registryScope`,
          message:
            "Project-extension registry entries are accepted only when project_extension scope is explicitly enabled.",
        }),
      );
    }
    if (ext.extensionScope !== "project_extension" || ext.isolated !== true) {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.SCOPE_CLASSIFICATION,
          pointer: `/extensions/${REGISTRY_EXTENSION}`,
          message:
            "Project-extension entries must declare isolated project_extension scope metadata.",
        }),
      );
    }
    return;
  }
  if (cls === "sample_demo" || scope === "sample_demo") {
    if (
      options.allowSamples !== true ||
      ext.isolated !== true ||
      ext.sampleLabel !== "sample_demo"
    ) {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.SCOPE_CLASSIFICATION,
          pointer: `/extensions/${REGISTRY_EXTENSION}`,
          message:
            "Sample/demo entries are accepted only when explicitly allowed, labeled, and isolated.",
        }),
      );
    }
    return;
  }
  if (cls === "negative_example") return;
  const haystack = textForDomainScan(entry);
  const found = FORBIDDEN_CORE_TERMS.filter((term) => haystack.includes(term));
  if (found.length > 0) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.DOMAIN_NEUTRALITY,
        pointer: "",
        message: `Core registry entry contains project/business vocabulary forbidden by DL-20A: ${found.join(", ")}.`,
        details: { forbiddenTerms: found },
      }),
    );
  }
}

function validateMetaSafety(entry, filePath, errors) {
  if (entry.agentType !== "meta") return;
  const ext = entryExtension(entry);
  const authority = ext.outputAuthority;
  if (!["recommendation_only", "patch_material"].includes(authority)) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.META_AGENT_SAFETY,
        pointer: `/extensions/${REGISTRY_EXTENSION}/outputAuthority`,
        message: "Meta-agent output authority must be recommendation_only or patch_material.",
      }),
    );
  }
  const normalRoute = Array.isArray(ext.normalRoute) ? ext.normalRoute : [];
  for (const required of ["planning", "build", "verification"]) {
    if (!normalRoute.includes(required)) {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.META_AGENT_SAFETY,
          pointer: `/extensions/${REGISTRY_EXTENSION}/normalRoute`,
          message:
            "Meta-agent recommendations must route through normal planning, build, and verification.",
        }),
      );
      break;
    }
  }
  if (entry.safety?.writesAllowed !== false) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.META_AGENT_SAFETY,
        pointer: "/safety/writesAllowed",
        message: "Meta-agents must not be allowed to mutate files directly.",
      }),
    );
  }
  const forbidden = new Set((entry.forbiddenActions ?? []).map(normalizeCapability));
  for (const required of REQUIRED_META_FORBIDDEN) {
    if (!forbidden.has(required)) {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.META_AGENT_SAFETY,
          pointer: "/forbiddenActions",
          message: `Meta-agent must forbid ${required}.`,
        }),
      );
    }
  }
  const unsafeAllowed = (entry.allowedTools ?? [])
    .map(normalizeCapability)
    .filter((tool) => ["write", "edit", "bash", "push", "pr", "auto_registration"].includes(tool));
  if (unsafeAllowed.length > 0) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.META_AGENT_SAFETY,
        pointer: "/allowedTools",
        message: `Meta-agent allowed tools include direct mutation capability: ${unsafeAllowed.join(", ")}.`,
      }),
    );
  }
}

function validateAdapterScope(entry, filePath, errors) {
  const ext = entryExtension(entry);
  if (Array.isArray(entry.selectedHarnessAdapters)) {
    const unsupported = entry.selectedHarnessAdapters.filter((adapter) => adapter !== "pi");
    if (unsupported.length > 0) {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.ADAPTER_SCOPE,
          pointer: "/selectedHarnessAdapters",
          message: `Non-pi harness support remains deferred/blocked: ${unsupported.join(", ")}.`,
        }),
      );
    }
  }
  if (
    ext.adapterRuntimeImplemented === true ||
    ext.adapterManifestWrites === true ||
    (ext.nonPiHarnessSupport && ext.nonPiHarnessSupport !== "deferred_blocked")
  ) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.ADAPTER_SCOPE,
        pointer: `/extensions/${REGISTRY_EXTENSION}`,
        message:
          "Adapter manifest/runtime assumptions and non-pi support claims are out of scope for registry validation.",
      }),
    );
  }
}

function validateSkillLinks(entry, filePath, errors) {
  const ext = entryExtension(entry);
  const linkedSkills = Array.isArray(ext.linkedSkills) ? ext.linkedSkills : [];
  if (entry.agentType !== "skill_adapter" && linkedSkills.length === 0) return;
  const unknown = linkedSkills.filter((skill) => !LOCKED_SKILLS.includes(skill));
  if (unknown.length > 0) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.SKILL_LINKS,
        pointer: `/extensions/${REGISTRY_EXTENSION}/linkedSkills`,
        message: `Registry entry references unknown skills: ${unknown.join(", ")}.`,
      }),
    );
  }
  if (entry.agentType === "skill_adapter") {
    const exact =
      JSON.stringify([...linkedSkills].sort()) === JSON.stringify([...LOCKED_SKILLS].sort());
    if (!exact) {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.SKILL_LINKS,
          pointer: `/extensions/${REGISTRY_EXTENSION}/linkedSkills`,
          message: `Core skill_adapter must link exactly the six locked skills: ${LOCKED_SKILLS.join(", ")}.`,
        }),
      );
    }
  }
}

function hasCoreRegistryClassification(entry) {
  return (
    !["sample_demo", "project_extension", "negative_example"].includes(classification(entry)) &&
    !["sample_demo", "project_extension", "negative_example"].includes(registryScope(entry))
  );
}

function isStableCoreLoadBearing(entry) {
  return (
    entry.status === "active" &&
    ["stable", "core"].includes(entry.maturity) &&
    hasCoreRegistryClassification(entry) &&
    LOAD_BEARING_VALIDATOR_REQUIRED_TYPES.includes(entry.agentType)
  );
}

function isActiveStableCore(entry) {
  return (
    entry.status === "active" &&
    ["stable", "core"].includes(entry.maturity) &&
    hasCoreRegistryClassification(entry)
  );
}

function validateLoadBearingBypassRationale(entry, filePath, options, errors) {
  const ext = entryExtension(entry);
  const rationale = isObject(ext.nonLoadBearingRationale)
    ? ext.nonLoadBearingRationale
    : isObject(ext.dormantRationale)
      ? ext.dormantRationale
      : null;
  const attemptsBypass = ext.allowDormant === true || rationale !== null;
  if (!attemptsBypass) return false;

  const rationalePointer = isObject(ext.nonLoadBearingRationale)
    ? extensionPointer(REGISTRY_EXTENSION, "nonLoadBearingRationale")
    : isObject(ext.dormantRationale)
      ? extensionPointer(REGISTRY_EXTENSION, "dormantRationale")
      : `/extensions/${REGISTRY_EXTENSION}/allowDormant`;

  if (!rationale) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.DORMANT_RATIONALE,
        pointer: `/extensions/${REGISTRY_EXTENSION}/allowDormant`,
        message:
          "Bare allowDormant=true is not an allowed graph/validator bypass; provide typed nonLoadBearingRationale or dormantRationale metadata with owner, rationale, decisionRef, and evidenceRef.",
      }),
    );
    return false;
  }

  const state = rationale.status ?? rationale.state;
  const missing = [];
  if (!BYPASS_RATIONALE_STATES.includes(state)) missing.push("status/state");
  if (typeof rationale.rationale !== "string" || rationale.rationale.trim() === "")
    missing.push("rationale");
  if (
    typeof (rationale.owner ?? rationale.approver) !== "string" ||
    String(rationale.owner ?? rationale.approver).trim() === ""
  )
    missing.push("owner/approver");
  if (typeof rationale.decisionRef !== "string" || rationale.decisionRef.trim() === "")
    missing.push("decisionRef");
  if (!isObject(rationale.evidenceRef)) missing.push("evidenceRef");
  if (missing.length > 0) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.DORMANT_RATIONALE,
        pointer: rationalePointer,
        message: `Typed dormant/non-load-bearing bypass rationale is incomplete: missing ${missing.join(", ")}.`,
        details: { missing },
      }),
    );
    return false;
  }

  if (state === "non_load_bearing") {
    if (entry.status !== "active" || !["stable", "core"].includes(entry.maturity)) {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.DORMANT_RATIONALE,
          pointer: rationalePointer,
          message:
            "non_load_bearing bypass applies only to active stable/core entries that are explicitly proven non-load-bearing.",
        }),
      );
      return false;
    }
  } else if (state === "dormant") {
    if (entry.status === "active") {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.DORMANT_RATIONALE,
          pointer: rationalePointer,
          message:
            "Active stable/core entries cannot claim dormant bypass; use non_load_bearing rationale or change entry status through a valid policy.",
        }),
      );
      return false;
    }
  } else if (state === "deprecated") {
    if (entry.status !== "deprecated" || entry.deprecation === null) {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.DORMANT_RATIONALE,
          pointer: rationalePointer,
          message: "Deprecated bypass requires deprecated status and deprecation metadata.",
        }),
      );
      return false;
    }
  } else if (state === "sample_demo") {
    if (classification(entry) !== "sample_demo" && registryScope(entry) !== "sample_demo") {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.DORMANT_RATIONALE,
          pointer: rationalePointer,
          message: "sample_demo bypass requires sample_demo classification or registry scope.",
        }),
      );
      return false;
    }
  }

  const errorCountBeforeEvidence = errors.length;
  validateEvidenceRef(
    entry,
    rationale.evidenceRef,
    `${rationalePointer}/evidenceRef`,
    state,
    filePath,
    options,
    errors,
  );
  return errors.length === errorCountBeforeEvidence;
}

function validateDeprecation(entry, filePath, entriesById, errors) {
  const deprecated = entry.status === "deprecated" || entry.deprecation !== null;
  if (!deprecated) return;
  const ext = entryExtension(entry);
  const supersededBy = ext.supersededBy;
  if (!entry.supersessionReason || !supersededBy) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.DEPRECATION_SUPERSESSION,
        pointer: "/deprecation",
        message:
          "Deprecated entries require supersessionReason and extension supersededBy metadata.",
      }),
    );
  }
  if (supersededBy && !entriesById.has(supersededBy)) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.DEPRECATION_SUPERSESSION,
        pointer: `/extensions/${REGISTRY_EXTENSION}/supersededBy`,
        message: `Deprecated entry supersededBy target ${supersededBy} does not resolve.`,
      }),
    );
  }
  const hasSupersededByLink = (entry.links ?? []).some(
    (link) =>
      link.rel === "superseded_by" &&
      link.artifactKind === "agent_registry_entry" &&
      link.artifactId === supersededBy,
  );
  if (supersededBy && !hasSupersededByLink) {
    errors.push(
      makeError({
        filePath,
        entryId: entry.agentId,
        ruleId: RegistryRuleId.DEPRECATION_SUPERSESSION,
        pointer: "/links",
        message: "Deprecated entry must include a superseded_by link to its replacement.",
      }),
    );
  }
}

function validateGraph(entries, entriesById, pathById, bypassAllowedById, errors) {
  const incoming = new Map(entries.map((entry) => [entry.agentId, []]));
  const outgoing = new Map(entries.map((entry) => [entry.agentId, []]));
  const undirected = new Map(entries.map((entry) => [entry.agentId, new Set()]));
  const requiredValidatorEdges = new Map(entries.map((entry) => [entry.agentId, []]));

  function addResolvedEdge(entry, target) {
    if (target === entry.agentId) return;
    incoming.get(target)?.push(entry.agentId);
    outgoing.get(entry.agentId)?.push(target);
    undirected.get(entry.agentId)?.add(target);
    undirected.get(target)?.add(entry.agentId);
  }

  function resolveAgentRef(entry, listName, ref, index) {
    if (ref.artifactKind !== "agent_registry_entry") return null;
    const target = refKey(ref);
    const pointerValue = `/${listName}/${index}`;
    if (!entriesById.has(target)) {
      errors.push(
        makeError({
          filePath: pathById.get(entry.agentId),
          entryId: entry.agentId,
          ruleId: RegistryRuleId.REF_RESOLUTION,
          pointer: pointerValue,
          message: `Registry reference ${target} does not resolve to a loaded agent_registry_entry.`,
        }),
      );
      return null;
    }
    addResolvedEdge(entry, target);
    return entriesById.get(target);
  }

  function validateRefType(entry, listName, ref, index, targetEntry) {
    if (!targetEntry || ref.artifactKind !== "agent_registry_entry") return;
    if (
      listName === "validatorRefs" &&
      !["validator", "reviewer"].includes(targetEntry.agentType)
    ) {
      errors.push(
        makeError({
          filePath: pathById.get(entry.agentId),
          entryId: entry.agentId,
          ruleId: RegistryRuleId.REF_TYPE_COMPATIBILITY,
          pointer: `/${listName}/${index}`,
          message: `validatorRefs must target validator/reviewer-compatible entries; ${ref.artifactId} is ${targetEntry.agentType}.`,
          details: {
            targetAgentId: ref.artifactId,
            targetAgentType: targetEntry.agentType,
            allowedTargetTypes: ["validator", "reviewer"],
          },
        }),
      );
    }
    if (listName === "fixerRefs" && !["fixer", "orchestrator"].includes(targetEntry.agentType)) {
      errors.push(
        makeError({
          filePath: pathById.get(entry.agentId),
          entryId: entry.agentId,
          ruleId: RegistryRuleId.REF_TYPE_COMPATIBILITY,
          pointer: `/${listName}/${index}`,
          message: `fixerRefs must target fixer/orchestrator repair-compatible entries; ${ref.artifactId} is ${targetEntry.agentType}.`,
          details: {
            targetAgentId: ref.artifactId,
            targetAgentType: targetEntry.agentType,
            allowedTargetTypes: ["fixer", "orchestrator"],
          },
        }),
      );
    }
  }

  for (const entry of entries) {
    for (const [listName, list] of [
      ["validatorRefs", entry.validatorRefs ?? []],
      ["fixerRefs", entry.fixerRefs ?? []],
      ["links", entry.links ?? []],
    ]) {
      list.forEach((ref, index) => {
        const targetEntry = resolveAgentRef(entry, listName, ref, index);
        validateRefType(entry, listName, ref, index, targetEntry);
      });
    }
    const requiredValidators = (entry.validatorRefs ?? []).filter(isRequiredAgentRef);
    const nonSelfRequiredValidators = requiredValidators.filter((ref) => !isSelfRef(entry, ref));
    if (requiredValidators.length > 0 && requiredValidators.every((ref) => isSelfRef(entry, ref))) {
      errors.push(
        makeError({
          filePath: pathById.get(entry.agentId),
          entryId: entry.agentId,
          ruleId: RegistryRuleId.SELF_VALIDATION_ONLY,
          pointer: "/validatorRefs",
          message: "Self-validation cannot be the only blocking validator.",
        }),
      );
    }
    if (
      isStableCoreLoadBearing(entry) &&
      bypassAllowedById.get(entry.agentId) !== true &&
      nonSelfRequiredValidators.length === 0
    ) {
      errors.push(
        makeError({
          filePath: pathById.get(entry.agentId),
          entryId: entry.agentId,
          ruleId: RegistryRuleId.REQUIRED_VALIDATOR,
          pointer: "/validatorRefs",
          message:
            "Active stable/core load-bearing registry entries require at least one non-self required validatorRef to an independent validator/reviewer entry unless an explicit typed non-load-bearing policy applies.",
          details: {
            allowedTargetTypes: ["validator", "reviewer"],
            loadBearingAgentTypes: LOAD_BEARING_VALIDATOR_REQUIRED_TYPES,
          },
        }),
      );
    }
    requiredValidatorEdges.set(
      entry.agentId,
      nonSelfRequiredValidators.map((ref) => ref.artifactId),
    );
  }

  const activeStableCoreEntries = entries.filter(
    (entry) => isActiveStableCore(entry) && bypassAllowedById.get(entry.agentId) !== true,
  );
  const componentById = new Map();
  const components = [];
  for (const entry of activeStableCoreEntries) {
    if (componentById.has(entry.agentId)) continue;
    const component = [];
    const queue = [entry.agentId];
    componentById.set(entry.agentId, components.length);
    for (let i = 0; i < queue.length; i += 1) {
      const current = queue[i];
      if (
        entriesById.has(current) &&
        activeStableCoreEntries.some((candidate) => candidate.agentId === current)
      )
        component.push(current);
      for (const next of undirected.get(current) ?? []) {
        if (!componentById.has(next)) {
          componentById.set(next, components.length);
          queue.push(next);
        }
      }
    }
    components.push(component);
  }
  const mainComponentIndex = components.reduce((best, component, index) => {
    if (best === -1) return index;
    const hasOrchestrator = component.some(
      (id) => entriesById.get(id)?.agentType === "orchestrator",
    );
    const bestHasOrchestrator = components[best].some(
      (id) => entriesById.get(id)?.agentType === "orchestrator",
    );
    if (hasOrchestrator && !bestHasOrchestrator) return index;
    return component.length > components[best].length ? index : best;
  }, -1);

  for (const entry of entries) {
    const ext = entryExtension(entry);
    const inbound = incoming.get(entry.agentId) ?? [];
    const outbound = outgoing.get(entry.agentId) ?? [];
    const activeStableCore = isActiveStableCore(entry);
    const bypassAllowed = bypassAllowedById.get(entry.agentId) === true;
    if (activeStableCore && inbound.length === 0 && outbound.length === 0 && !bypassAllowed) {
      errors.push(
        makeError({
          filePath: pathById.get(entry.agentId),
          entryId: entry.agentId,
          ruleId: RegistryRuleId.UNLINKED_STABLE_CORE,
          pointer: "/links",
          message:
            "Stable/core registry entry is reachable only from itself and lacks allowed typed dormant/deprecated/sample/non-load-bearing rationale.",
        }),
      );
    }
    if (
      activeStableCore &&
      !bypassAllowed &&
      mainComponentIndex !== -1 &&
      componentById.get(entry.agentId) !== mainComponentIndex
    ) {
      errors.push(
        makeError({
          filePath: pathById.get(entry.agentId),
          entryId: entry.agentId,
          ruleId: RegistryRuleId.UNLINKED_STABLE_CORE,
          pointer: "/links",
          message:
            "Stable/core registry entry is disconnected from the loaded non-self registry graph.",
          details: {
            component: components[componentById.get(entry.agentId)] ?? [],
            mainComponent: components[mainComponentIndex] ?? [],
          },
        }),
      );
    }
    if (
      ["validator", "fixer"].includes(entry.agentType) &&
      activeStableCore &&
      inbound.length === 0 &&
      !bypassAllowed
    ) {
      errors.push(
        makeError({
          filePath: pathById.get(entry.agentId),
          entryId: entry.agentId,
          ruleId: RegistryRuleId.UNUSED_VALIDATOR_FIXER,
          pointer: "/agentType",
          message: `${entry.agentType} entry is not referenced by any loaded entry and lacks allowed typed dormant/deprecated/non-load-bearing rationale.`,
        }),
      );
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  function dfs(id) {
    if (visiting.has(id)) {
      const cycleStart = stack.indexOf(id);
      const cycle = stack.slice(cycleStart).concat(id);
      errors.push(
        makeError({
          filePath: pathById.get(id),
          entryId: id,
          ruleId: RegistryRuleId.INDEPENDENCE_CYCLE,
          pointer: "/validatorRefs",
          message: `Blocking validator cycle defeats independence: ${cycle.join(" -> ")}.`,
          details: { cycle },
        }),
      );
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const next of requiredValidatorEdges.get(id) ?? []) if (entriesById.has(next)) dfs(next);
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }
  for (const entry of entries) dfs(entry.agentId);
}

function validatePolicy(entries, entriesById, pathById, options) {
  const errors = [];
  for (const entry of entries) {
    const filePath = pathById.get(entry.agentId);
    validateToolPolicy(entry, filePath, errors);
    validateMaturityEvidence(entry, filePath, options, errors);
    validateScopeAndDomain(entry, filePath, options, errors);
    validateMetaSafety(entry, filePath, errors);
    validateAdapterScope(entry, filePath, errors);
    validateSkillLinks(entry, filePath, errors);
    validateDeprecation(entry, filePath, entriesById, errors);
  }
  const bypassAllowedById = new Map();
  for (const entry of entries) {
    bypassAllowedById.set(
      entry.agentId,
      validateLoadBearingBypassRationale(entry, pathById.get(entry.agentId), options, errors),
    );
  }
  validateGraph(entries, entriesById, pathById, bypassAllowedById, errors);
  return errors;
}

function graphFor(entries) {
  return {
    validatorLinks: entries.flatMap((entry) =>
      (entry.validatorRefs ?? [])
        .filter((ref) => ref.artifactKind === "agent_registry_entry")
        .map((ref) => ({ from: entry.agentId, to: ref.artifactId, required: ref.required })),
    ),
    fixerLinks: entries.flatMap((entry) =>
      (entry.fixerRefs ?? [])
        .filter((ref) => ref.artifactKind === "agent_registry_entry")
        .map((ref) => ({ from: entry.agentId, to: ref.artifactId, required: ref.required })),
    ),
    topLevelLinks: entries.flatMap((entry) =>
      (entry.links ?? [])
        .filter((ref) => ref.artifactKind === "agent_registry_entry")
        .map((ref) => ({
          from: entry.agentId,
          to: ref.artifactId,
          required: ref.required,
          rel: ref.rel,
        })),
    ),
  };
}

export function validateRegistryFiles(files, options = {}) {
  const errors = [];
  const entries = [];
  const entriesById = new Map();
  const pathById = new Map();
  for (const filePath of uniqueSorted(files.map((file) => path.resolve(file)))) {
    const schemaResult = validateArtifactFile(filePath, { kind: "agent_registry_entry" });
    if (!schemaResult.ok) {
      for (const schemaError of schemaResult.errors) {
        errors.push(
          makeError({
            filePath: schemaError.artifactPath ?? filePath,
            entryId: null,
            ruleId: RegistryRuleId.SCHEMA_I01A,
            pointer: schemaError.pointer,
            schemaId: schemaError.schemaId,
            schemaCode: schemaError.code,
            message: schemaError.message,
          }),
        );
      }
      continue;
    }
    const entry = schemaResult.artifact;
    if (entriesById.has(entry.agentId)) {
      errors.push(
        makeError({
          filePath,
          entryId: entry.agentId,
          ruleId: RegistryRuleId.DUPLICATE_ID,
          pointer: "/agentId",
          message: `Duplicate registry agentId ${entry.agentId}; first path ${pathById.get(entry.agentId)}.`,
        }),
      );
      continue;
    }
    entries.push(entry);
    entriesById.set(entry.agentId, entry);
    pathById.set(entry.agentId, filePath);
  }
  errors.push(...validatePolicy(entries, entriesById, pathById, options));
  return Object.freeze({
    ok: errors.length === 0,
    entries: Object.freeze(entries),
    entriesById,
    pathById,
    graph: graphFor(entries),
    errors: Object.freeze(errors),
  });
}

export function loadRegistry(roots, options = {}) {
  const discovery = discoverRegistryEntryFiles(roots);
  const validation = validateRegistryFiles(discovery.files, options);
  const errors = [...discovery.errors, ...validation.errors];
  return Object.freeze({
    ok: errors.length === 0,
    roots: Object.freeze(
      (Array.isArray(roots) ? roots : [roots]).filter(Boolean).map((root) => path.resolve(root)),
    ),
    files: Object.freeze(discovery.files),
    entries: validation.entries,
    entriesById: validation.entriesById,
    pathById: validation.pathById,
    graph: validation.graph,
    errors: Object.freeze(errors),
  });
}

export function assertRegistryOk(result) {
  if (result.ok) return result;
  const summary = result.errors
    .map(
      (error) => `${error.ruleId} ${error.path ?? "<no-path>"}${error.pointer}: ${error.message}`,
    )
    .join("\n");
  throw new Error(`Registry validation failed with ${result.errors.length} error(s):\n${summary}`);
}

export function packageRootFromImportMeta(importMetaUrl = import.meta.url) {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), "..");
}

export function canonicalSchemaIdsByKind() {
  return { ...SCHEMA_IDS_BY_KIND };
}
