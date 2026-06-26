import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTIFACT_KINDS, loadSchema, validateArtifactFile } from '../../artifacts/src/index.js';

export const RegistrySeverity = Object.freeze({
  CRITICAL: 'critical',
  MAJOR_LOCAL: 'major-local',
  MINOR_LOCAL: 'minor-local'
});

export const RegistryRuleId = Object.freeze({
  SCHEMA_I01A: 'schema.i01a.agent_registry_entry',
  FILE_DISCOVERY: 'registry.file_discovery',
  DUPLICATE_ID: 'registry.graph.duplicate_id',
  REF_RESOLUTION: 'registry.graph.ref_resolution',
  SELF_VALIDATION_ONLY: 'registry.graph.self_validation_only',
  INDEPENDENCE_CYCLE: 'registry.graph.independence_cycle',
  UNUSED_VALIDATOR_FIXER: 'registry.graph.unused_validator_fixer',
  UNLINKED_STABLE_CORE: 'registry.graph.unlinked_stable_core',
  TOOL_FORBIDDEN_PRECEDENCE: 'registry.policy.tool_forbidden_precedence',
  MATURITY_EVIDENCE: 'registry.policy.maturity_evidence',
  DEPRECATION_SUPERSESSION: 'registry.policy.deprecation_supersession',
  DOMAIN_NEUTRALITY: 'registry.policy.domain_neutrality',
  SCOPE_CLASSIFICATION: 'registry.policy.scope_classification',
  META_AGENT_SAFETY: 'registry.policy.meta_agent_safety',
  ADAPTER_SCOPE: 'registry.policy.adapter_scope',
  SKILL_LINKS: 'registry.policy.skill_links'
});

export const LOCKED_SKILLS = Object.freeze(['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship']);
export const PRODUCT_NAME = 'vibe-engineer';
export const ARTIFACT_FLOW = Object.freeze(['raw_intent', 'work_brief', 'implementation_plan', 'build_result', 'ship_packet']);

const REGISTRY_EXTENSION = 'dev.vibe.registry';
const REQUIRED_META_FORBIDDEN = Object.freeze(['silent_mutation', 'auto_registration', 'direct_file_mutation', 'push', 'pr', 'verification_bypass']);
const FORBIDDEN_CORE_TERMS = Object.freeze(['ecommerce', 'e-commerce', 'inventory', 'fashion', 'billz', 'telegram', 'instagram', 'shopify', 'checkout', 'cart', 'sku']);
const SCHEMA_IDS_BY_KIND = Object.freeze(Object.fromEntries(ARTIFACT_KINDS.map((kind) => [kind, loadSchema(kind).$id])));

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pointer(pathValue) {
  return pathValue || '';
}

function makeError({ filePath = null, entryId = null, ruleId, severity = RegistrySeverity.CRITICAL, pointer: jsonPointer = '', message, schemaId = null, schemaCode = null, details = undefined }) {
  return { path: filePath, entryId, ruleId, severity, pointer: pointer(jsonPointer), schemaId, schemaCode, message, details };
}

function entryExtension(entry) {
  return isObject(entry.extensions) && isObject(entry.extensions[REGISTRY_EXTENSION]) ? entry.extensions[REGISTRY_EXTENSION] : { schemaVersion: '1.0.0' };
}

function classification(entry) {
  return entryExtension(entry).classification ?? 'core';
}

function registryScope(entry) {
  return entryExtension(entry).registryScope ?? classification(entry);
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeCapability(value) {
  return normalizeText(value).replace(/^tool:/, '').replace(/^action:/, '').replaceAll(/\s+/g, '_');
}

function refKey(ref) {
  return ref?.artifactId ?? null;
}

function isSelfRef(entry, ref) {
  return ref?.artifactKind === 'agent_registry_entry' && ref?.artifactId === entry.agentId;
}

function isRequiredAgentRef(ref) {
  return ref?.artifactKind === 'agent_registry_entry' && ref?.required === true;
}

function hasArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
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
    ext.rationale
  ];
  return parts.filter(Boolean).join('\n').toLowerCase();
}

function walkJsonFiles(rootPath, discovered, errors) {
  let stat;
  try {
    stat = fs.statSync(rootPath);
  } catch (error) {
    errors.push(makeError({ filePath: rootPath, ruleId: RegistryRuleId.FILE_DISCOVERY, pointer: '', message: `Registry root is not readable: ${error.message}` }));
    return;
  }
  if (stat.isFile()) {
    if (path.extname(rootPath) === '.json') discovered.push(path.resolve(rootPath));
    else errors.push(makeError({ filePath: rootPath, ruleId: RegistryRuleId.FILE_DISCOVERY, pointer: '', message: 'Registry entry carrier must be a .json file.' }));
    return;
  }
  if (!stat.isDirectory()) {
    errors.push(makeError({ filePath: rootPath, ruleId: RegistryRuleId.FILE_DISCOVERY, pointer: '', message: 'Registry root must be a file or directory.' }));
    return;
  }
  const entries = fs.readdirSync(rootPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const childPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) walkJsonFiles(childPath, discovered, errors);
    else if (entry.isFile() && path.extname(entry.name) === '.json') discovered.push(path.resolve(childPath));
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
      errors.push(makeError({
        filePath,
        entryId: entry.agentId ?? entry.artifactId,
        ruleId: RegistryRuleId.MATURITY_EVIDENCE,
        pointer: `/${listName}/${index}/schemaId`,
        message: `${listName} must use canonical I-01A schema id for artifactKind ${schemaRef?.artifactKind}.`,
        details: { expected, actual: schemaRef?.schemaId }
      }));
    }
  });
}

function validateToolPolicy(entry, filePath, errors) {
  const allowed = new Map((entry.allowedTools ?? []).map((tool) => [normalizeCapability(tool), tool]));
  for (const forbidden of entry.forbiddenActions ?? []) {
    const normalizedForbidden = normalizeCapability(forbidden);
    if (allowed.has(normalizedForbidden)) {
      errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.TOOL_FORBIDDEN_PRECEDENCE, pointer: '/forbiddenActions', message: `Forbidden action ${forbidden} contradicts allowed tool ${allowed.get(normalizedForbidden)}; forbidden policy wins.` }));
    }
    for (const [normalizedAllowed, originalAllowed] of allowed) {
      if (normalizedForbidden === `use_${normalizedAllowed}` || normalizedForbidden === `${normalizedAllowed}_write` || normalizedForbidden.includes(`:${normalizedAllowed}`)) {
        errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.TOOL_FORBIDDEN_PRECEDENCE, pointer: '/forbiddenActions', message: `Forbidden action ${forbidden} conflicts with allowed tool ${originalAllowed}; forbidden policy wins.` }));
      }
    }
  }
}

function validateMaturityEvidence(entry, filePath, errors) {
  validateSchemaRefList(entry, 'inputSchemas', errors, filePath);
  validateSchemaRefList(entry, 'outputSchemas', errors, filePath);
  if (!['stable', 'core'].includes(entry.maturity)) return;
  if (!entry.owner || !/^\d+\.\d+\.\d+$/.test(entry.agentVersion ?? '')) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.MATURITY_EVIDENCE, pointer: '/agentVersion', message: 'Stable/core registry entries require owner and semantic agentVersion.' }));
  }
  if (!hasArray(entry.changelog)) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.MATURITY_EVIDENCE, pointer: '/changelog', message: 'Stable/core registry entries require changelog evidence.' }));
  }
  if (!hasArray(entry.evals)) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.MATURITY_EVIDENCE, pointer: '/evals', message: 'Stable/core registry entries require eval evidence refs.' }));
  }
  const ext = entryExtension(entry);
  if (!hasArray(ext.smokeRefs)) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.MATURITY_EVIDENCE, pointer: `/extensions/${REGISTRY_EXTENSION}/smokeRefs`, message: 'Stable/core registry entries require smoke evidence refs in registry extension metadata.' }));
  }
  if (!String(entry.domainNeutralityReview ?? '').includes('PASS')) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.MATURITY_EVIDENCE, pointer: '/domainNeutralityReview', message: 'Stable/core registry entries require PASS domain-neutrality review evidence.' }));
  }
}

function validateScopeAndDomain(entry, filePath, options, errors) {
  const ext = entryExtension(entry);
  const cls = classification(entry);
  const scope = registryScope(entry);
  const allowedScopes = new Set(options.allowedScopes ?? ['core']);
  if (cls === 'project_extension' || scope === 'project_extension') {
    if (!allowedScopes.has('project_extension')) {
      errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.SCOPE_CLASSIFICATION, pointer: `/extensions/${REGISTRY_EXTENSION}/registryScope`, message: 'Project-extension registry entries are accepted only when project_extension scope is explicitly enabled.' }));
    }
    if (ext.extensionScope !== 'project_extension' || ext.isolated !== true) {
      errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.SCOPE_CLASSIFICATION, pointer: `/extensions/${REGISTRY_EXTENSION}`, message: 'Project-extension entries must declare isolated project_extension scope metadata.' }));
    }
    return;
  }
  if (cls === 'sample_demo' || scope === 'sample_demo') {
    if (options.allowSamples !== true || ext.isolated !== true || ext.sampleLabel !== 'sample_demo') {
      errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.SCOPE_CLASSIFICATION, pointer: `/extensions/${REGISTRY_EXTENSION}`, message: 'Sample/demo entries are accepted only when explicitly allowed, labeled, and isolated.' }));
    }
    return;
  }
  if (cls === 'negative_example') return;
  const haystack = textForDomainScan(entry);
  const found = FORBIDDEN_CORE_TERMS.filter((term) => haystack.includes(term));
  if (found.length > 0) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.DOMAIN_NEUTRALITY, pointer: '', message: `Core registry entry contains project/business vocabulary forbidden by DL-20A: ${found.join(', ')}.`, details: { forbiddenTerms: found } }));
  }
}

function validateMetaSafety(entry, filePath, errors) {
  if (entry.agentType !== 'meta') return;
  const ext = entryExtension(entry);
  const authority = ext.outputAuthority;
  if (!['recommendation_only', 'patch_material'].includes(authority)) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.META_AGENT_SAFETY, pointer: `/extensions/${REGISTRY_EXTENSION}/outputAuthority`, message: 'Meta-agent output authority must be recommendation_only or patch_material.' }));
  }
  const normalRoute = Array.isArray(ext.normalRoute) ? ext.normalRoute : [];
  for (const required of ['planning', 'build', 'verification']) {
    if (!normalRoute.includes(required)) {
      errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.META_AGENT_SAFETY, pointer: `/extensions/${REGISTRY_EXTENSION}/normalRoute`, message: 'Meta-agent recommendations must route through normal planning, build, and verification.' }));
      break;
    }
  }
  if (entry.safety?.writesAllowed !== false) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.META_AGENT_SAFETY, pointer: '/safety/writesAllowed', message: 'Meta-agents must not be allowed to mutate files directly.' }));
  }
  const forbidden = new Set((entry.forbiddenActions ?? []).map(normalizeCapability));
  for (const required of REQUIRED_META_FORBIDDEN) {
    if (!forbidden.has(required)) {
      errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.META_AGENT_SAFETY, pointer: '/forbiddenActions', message: `Meta-agent must forbid ${required}.` }));
    }
  }
  const unsafeAllowed = (entry.allowedTools ?? []).map(normalizeCapability).filter((tool) => ['write', 'edit', 'bash', 'push', 'pr', 'auto_registration'].includes(tool));
  if (unsafeAllowed.length > 0) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.META_AGENT_SAFETY, pointer: '/allowedTools', message: `Meta-agent allowed tools include direct mutation capability: ${unsafeAllowed.join(', ')}.` }));
  }
}

function validateAdapterScope(entry, filePath, errors) {
  const ext = entryExtension(entry);
  if (Array.isArray(entry.selectedHarnessAdapters)) {
    const unsupported = entry.selectedHarnessAdapters.filter((adapter) => adapter !== 'pi');
    if (unsupported.length > 0) {
      errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.ADAPTER_SCOPE, pointer: '/selectedHarnessAdapters', message: `Non-pi harness support remains deferred/blocked: ${unsupported.join(', ')}.` }));
    }
  }
  if (ext.adapterRuntimeImplemented === true || ext.adapterManifestWrites === true || (ext.nonPiHarnessSupport && ext.nonPiHarnessSupport !== 'deferred_blocked')) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.ADAPTER_SCOPE, pointer: `/extensions/${REGISTRY_EXTENSION}`, message: 'Adapter manifest/runtime assumptions and non-pi support claims are out of scope for registry validation.' }));
  }
}

function validateSkillLinks(entry, filePath, errors) {
  const ext = entryExtension(entry);
  const linkedSkills = Array.isArray(ext.linkedSkills) ? ext.linkedSkills : [];
  if (entry.agentType !== 'skill_adapter' && linkedSkills.length === 0) return;
  const unknown = linkedSkills.filter((skill) => !LOCKED_SKILLS.includes(skill));
  if (unknown.length > 0) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.SKILL_LINKS, pointer: `/extensions/${REGISTRY_EXTENSION}/linkedSkills`, message: `Registry entry references unknown skills: ${unknown.join(', ')}.` }));
  }
  if (entry.agentType === 'skill_adapter') {
    const exact = JSON.stringify([...linkedSkills].sort()) === JSON.stringify([...LOCKED_SKILLS].sort());
    if (!exact) {
      errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.SKILL_LINKS, pointer: `/extensions/${REGISTRY_EXTENSION}/linkedSkills`, message: `Core skill_adapter must link exactly the six locked skills: ${LOCKED_SKILLS.join(', ')}.` }));
    }
  }
}

function validateDeprecation(entry, filePath, entriesById, errors) {
  const deprecated = entry.status === 'deprecated' || entry.deprecation !== null;
  if (!deprecated) return;
  const ext = entryExtension(entry);
  const supersededBy = ext.supersededBy;
  if (!entry.supersessionReason || !supersededBy) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.DEPRECATION_SUPERSESSION, pointer: '/deprecation', message: 'Deprecated entries require supersessionReason and extension supersededBy metadata.' }));
  }
  if (supersededBy && !entriesById.has(supersededBy)) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.DEPRECATION_SUPERSESSION, pointer: `/extensions/${REGISTRY_EXTENSION}/supersededBy`, message: `Deprecated entry supersededBy target ${supersededBy} does not resolve.` }));
  }
  const hasSupersededByLink = (entry.links ?? []).some((link) => link.rel === 'superseded_by' && link.artifactKind === 'agent_registry_entry' && link.artifactId === supersededBy);
  if (supersededBy && !hasSupersededByLink) {
    errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.DEPRECATION_SUPERSESSION, pointer: '/links', message: 'Deprecated entry must include a superseded_by link to its replacement.' }));
  }
}

function validateGraph(entries, entriesById, pathById, errors) {
  const incoming = new Map(entries.map((entry) => [entry.agentId, []]));
  const requiredValidatorEdges = new Map(entries.map((entry) => [entry.agentId, []]));
  for (const entry of entries) {
    for (const [listName, list] of [['validatorRefs', entry.validatorRefs ?? []], ['fixerRefs', entry.fixerRefs ?? []]]) {
      list.forEach((ref, index) => {
        if (ref.artifactKind !== 'agent_registry_entry') return;
        const target = refKey(ref);
        if (!entriesById.has(target)) {
          errors.push(makeError({ filePath: pathById.get(entry.agentId), entryId: entry.agentId, ruleId: RegistryRuleId.REF_RESOLUTION, pointer: `/${listName}/${index}`, message: `Registry reference ${target} does not resolve to a loaded agent_registry_entry.` }));
        } else if (target !== entry.agentId) {
          incoming.get(target)?.push(entry.agentId);
        }
      });
    }
    const requiredValidators = (entry.validatorRefs ?? []).filter(isRequiredAgentRef);
    if (requiredValidators.length > 0 && requiredValidators.every((ref) => isSelfRef(entry, ref))) {
      errors.push(makeError({ filePath: pathById.get(entry.agentId), entryId: entry.agentId, ruleId: RegistryRuleId.SELF_VALIDATION_ONLY, pointer: '/validatorRefs', message: 'Self-validation cannot be the only blocking validator.' }));
    }
    requiredValidatorEdges.set(entry.agentId, requiredValidators.filter((ref) => !isSelfRef(entry, ref)).map((ref) => ref.artifactId));
  }

  for (const entry of entries) {
    const ext = entryExtension(entry);
    const inbound = incoming.get(entry.agentId) ?? [];
    const outboundCount = (entry.validatorRefs ?? []).length + (entry.fixerRefs ?? []).length + (entry.links ?? []).filter((link) => link.artifactKind === 'agent_registry_entry').length;
    const activeStableCore = entry.status === 'active' && ['stable', 'core'].includes(entry.maturity) && !['sample_demo', 'project_extension', 'negative_example'].includes(classification(entry));
    if (activeStableCore && inbound.length === 0 && outboundCount === 0 && ext.allowDormant !== true) {
      errors.push(makeError({ filePath: pathById.get(entry.agentId), entryId: entry.agentId, ruleId: RegistryRuleId.UNLINKED_STABLE_CORE, pointer: '/links', message: 'Stable/core registry entry is unlinked and lacks allowed dormant/deprecated/sample rationale.' }));
    }
    if (['validator', 'fixer'].includes(entry.agentType) && activeStableCore && inbound.length === 0 && ext.allowDormant !== true) {
      errors.push(makeError({ filePath: pathById.get(entry.agentId), entryId: entry.agentId, ruleId: RegistryRuleId.UNUSED_VALIDATOR_FIXER, pointer: '/agentType', message: `${entry.agentType} entry is not referenced by any loaded entry and lacks allowed dormant/deprecated rationale.` }));
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  function dfs(id) {
    if (visiting.has(id)) {
      const cycleStart = stack.indexOf(id);
      const cycle = stack.slice(cycleStart).concat(id);
      errors.push(makeError({ filePath: pathById.get(id), entryId: id, ruleId: RegistryRuleId.INDEPENDENCE_CYCLE, pointer: '/validatorRefs', message: `Blocking validator cycle defeats independence: ${cycle.join(' -> ')}.`, details: { cycle } }));
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
    validateMaturityEvidence(entry, filePath, errors);
    validateScopeAndDomain(entry, filePath, options, errors);
    validateMetaSafety(entry, filePath, errors);
    validateAdapterScope(entry, filePath, errors);
    validateSkillLinks(entry, filePath, errors);
    validateDeprecation(entry, filePath, entriesById, errors);
  }
  validateGraph(entries, entriesById, pathById, errors);
  return errors;
}

function graphFor(entries) {
  return {
    validatorLinks: entries.flatMap((entry) => (entry.validatorRefs ?? []).filter((ref) => ref.artifactKind === 'agent_registry_entry').map((ref) => ({ from: entry.agentId, to: ref.artifactId, required: ref.required }))),
    fixerLinks: entries.flatMap((entry) => (entry.fixerRefs ?? []).filter((ref) => ref.artifactKind === 'agent_registry_entry').map((ref) => ({ from: entry.agentId, to: ref.artifactId, required: ref.required })))
  };
}

export function validateRegistryFiles(files, options = {}) {
  const errors = [];
  const entries = [];
  const entriesById = new Map();
  const pathById = new Map();
  for (const filePath of uniqueSorted(files.map((file) => path.resolve(file)))) {
    const schemaResult = validateArtifactFile(filePath, { kind: 'agent_registry_entry' });
    if (!schemaResult.ok) {
      for (const schemaError of schemaResult.errors) {
        errors.push(makeError({
          filePath: schemaError.artifactPath ?? filePath,
          entryId: null,
          ruleId: RegistryRuleId.SCHEMA_I01A,
          pointer: schemaError.pointer,
          schemaId: schemaError.schemaId,
          schemaCode: schemaError.code,
          message: schemaError.message
        }));
      }
      continue;
    }
    const entry = schemaResult.artifact;
    if (entriesById.has(entry.agentId)) {
      errors.push(makeError({ filePath, entryId: entry.agentId, ruleId: RegistryRuleId.DUPLICATE_ID, pointer: '/agentId', message: `Duplicate registry agentId ${entry.agentId}; first path ${pathById.get(entry.agentId)}.` }));
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
    errors: Object.freeze(errors)
  });
}

export function loadRegistry(roots, options = {}) {
  const discovery = discoverRegistryEntryFiles(roots);
  const validation = validateRegistryFiles(discovery.files, options);
  const errors = [...discovery.errors, ...validation.errors];
  return Object.freeze({
    ok: errors.length === 0,
    roots: Object.freeze((Array.isArray(roots) ? roots : [roots]).filter(Boolean).map((root) => path.resolve(root))),
    files: Object.freeze(discovery.files),
    entries: validation.entries,
    entriesById: validation.entriesById,
    pathById: validation.pathById,
    graph: validation.graph,
    errors: Object.freeze(errors)
  });
}

export function assertRegistryOk(result) {
  if (result.ok) return result;
  const summary = result.errors.map((error) => `${error.ruleId} ${error.path ?? '<no-path>'}${error.pointer}: ${error.message}`).join('\n');
  throw new Error(`Registry validation failed with ${result.errors.length} error(s):\n${summary}`);
}

export function packageRootFromImportMeta(importMetaUrl = import.meta.url) {
  return path.resolve(path.dirname(fileURLToPath(importMetaUrl)), '..');
}

export function canonicalSchemaIdsByKind() {
  return { ...SCHEMA_IDS_BY_KIND };
}
