import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { ARTIFACT_KINDS, SUPPORTED_SCHEMA_VERSION, loadAllSchemas, loadSchema } from './schema-registry.js';
import { ValidationErrorCode, makeValidationError } from './errors.js';

const CORE_FIELDS = new Set(['schemaVersion','artifactKind','artifactId','title','createdAt','updatedAt','producer','status','ownership','links','extensions','description','tags','sourceRefs','approvedBy','supersessionReason','retention']);
const VERIFICATION_CATALOG_LAYERS = Object.freeze([
  'safety_hooks',
  'typecheck',
  'lint_format',
  'mechanical_gate',
  'unit',
  'integration',
  'contract_adapter',
  'e2e',
  'ui_verification',
  'ai_eval',
  'build_package',
  'context_drift',
  'observability',
  'advisory_review',
  'final_dod',
  'schema_validation'
]);

function pointerJoin(base, token) {
  const escaped = String(token).replaceAll('~', '~0').replaceAll('/', '~1');
  return `${base}/${escaped}`;
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addError(errors, ctx, pointer, code, message) {
  errors.push(makeValidationError({ ...ctx, pointer, code, message }));
}

function createContext(data, artifactPath, schema) {
  return {
    artifactPath: artifactPath ?? null,
    artifactKind: isObject(data) ? data.artifactKind ?? null : null,
    schemaVersion: isObject(data) ? data.schemaVersion ?? null : null,
    schemaId: schema?.$id ?? null,
  };
}

function ajvErrorPointer(error) {
  if (error.keyword === 'required' && error.params?.missingProperty) return pointerJoin(error.instancePath || '', error.params.missingProperty);
  if (error.keyword === 'additionalProperties' && error.params?.additionalProperty) return pointerJoin(error.instancePath || '', error.params.additionalProperty);
  if (error.keyword === 'propertyNames' && error.params?.propertyName) return pointerJoin(error.instancePath || '', error.params.propertyName);
  return error.instancePath || '';
}

function ajvErrorCode(error) {
  switch (error.keyword) {
    case 'required': return ValidationErrorCode.REQUIRED;
    case 'additionalProperties': return ValidationErrorCode.UNKNOWN_FIELD;
    case 'type': return ValidationErrorCode.TYPE;
    case 'const': return ValidationErrorCode.CONST;
    case 'enum': return ValidationErrorCode.ENUM;
    case 'pattern': return ValidationErrorCode.PATTERN;
    case 'minLength': return ValidationErrorCode.MIN_LENGTH;
    case 'minItems': return ValidationErrorCode.MIN_ITEMS;
    case 'minProperties': return ValidationErrorCode.MIN_PROPERTIES;
    case 'propertyNames': return ValidationErrorCode.PROPERTY_NAME;
    default: return ValidationErrorCode.SCHEMA_VALIDATION;
  }
}

function normalizeAjvErrors(ajvErrors, ctx) {
  return (ajvErrors ?? []).map((error) => makeValidationError({
    ...ctx,
    pointer: ajvErrorPointer(error),
    code: ajvErrorCode(error),
    message: error.message ?? `Schema validation failed for keyword ${error.keyword}.`
  }));
}

function createAjv() {
  return new Ajv2020({
    strict: true,
    allErrors: true,
    validateSchema: true,
    messages: true
  });
}

function compileSchemaRegistry() {
  const ajv = createAjv();
  const schemas = loadAllSchemas();
  const compiled = new Map();
  for (const kind of ARTIFACT_KINDS) {
    const schema = schemas[kind];
    if (!schema || schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
      throw new Error(`Schema ${kind} must be committed as JSON Schema 2020-12.`);
    }
    compiled.set(kind, ajv.compile(schema));
  }
  return { ajv, compiled };
}

const compiledRegistry = compileSchemaRegistry();

export function compileAllArtifactSchemas() {
  return Object.freeze({
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    kinds: Object.freeze([...compiledRegistry.compiled.keys()])
  });
}

function validateVersionAndKind(data, expectedKind, errors, ctx) {
  if (!isObject(data)) {
    addError(errors, ctx, '', ValidationErrorCode.NOT_OBJECT, 'Artifact must be a JSON object.');
    return;
  }
  if (typeof data.schemaVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(data.schemaVersion)) {
    addError(errors, ctx, '/schemaVersion', ValidationErrorCode.UNSUPPORTED_VERSION, 'schemaVersion must be semantic version 1.0.0.');
  } else if (data.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    addError(errors, ctx, '/schemaVersion', ValidationErrorCode.UNSUPPORTED_VERSION, `Unsupported artifact schemaVersion ${data.schemaVersion}.`);
  }
  if (!ARTIFACT_KINDS.includes(data.artifactKind)) {
    addError(errors, ctx, '/artifactKind', ValidationErrorCode.ARTIFACT_KIND_MISMATCH, 'Unknown artifactKind.');
  }
  if (expectedKind && data.artifactKind !== expectedKind) {
    addError(errors, ctx, '/artifactKind', ValidationErrorCode.ARTIFACT_KIND_MISMATCH, `Expected artifactKind ${expectedKind}.`);
  }
}

function linkMatches(link, rel, artifactKind, requiredStatus) {
  return isObject(link) && link.rel === rel && link.artifactKind === artifactKind && (!requiredStatus || link.statusAtLinkTime === requiredStatus) && link.required === true;
}

function evidencePacketLinkMatches(link) {
  return linkMatches(link, 'evidence_for', 'evidence_packet');
}

function requireLink(errors, ctx, pointer, link, rel, artifactKind, requiredStatus) {
  if (!linkMatches(link, rel, artifactKind, requiredStatus)) {
    const statusText = requiredStatus ? ` with statusAtLinkTime ${requiredStatus}` : '';
    addError(errors, ctx, pointer, ValidationErrorCode.BAD_LINK, `Required ${rel} link to ${artifactKind}${statusText} is missing or malformed.`);
  }
}

function requireEvidencePacketRef(errors, ctx, pointer, link) {
  if (!evidencePacketLinkMatches(link)) {
    addError(errors, ctx, pointer, ValidationErrorCode.EVIDENCE_LINK_REQUIRED, 'Verification evidence references must be required evidence_for links to evidence_packet artifacts.');
  }
}

function validateVerificationCatalog(data, errors, ctx, basePointer = '') {
  if (!Array.isArray(data.requiredItems)) return;
  const seen = new Set();
  data.requiredItems.forEach((item, index) => {
    if (!isObject(item)) return;
    if (typeof item.layer === 'string') seen.add(item.layer);
    if (item.action === 'not_applicable' && (typeof item.rationale !== 'string' || item.rationale.trim() === '')) {
      addError(errors, ctx, `${basePointer}/requiredItems/${index}/rationale`, ValidationErrorCode.NOT_APPLICABLE_RATIONALE_REQUIRED, 'not_applicable verification catalog items require a rationale.');
    }
    if (item.action === 'blocked') {
      if (typeof item.blockedBy !== 'string' || item.blockedBy.trim() === '') {
        addError(errors, ctx, `${basePointer}/requiredItems/${index}/blockedBy`, ValidationErrorCode.BLOCKED_ITEM_METADATA_REQUIRED, 'blocked verification catalog items require blockedBy.');
      }
      if (typeof item.unblockCondition !== 'string' || item.unblockCondition.trim() === '') {
        addError(errors, ctx, `${basePointer}/requiredItems/${index}/unblockCondition`, ValidationErrorCode.BLOCKED_ITEM_METADATA_REQUIRED, 'blocked verification catalog items require unblockCondition.');
      }
    }
  });
  for (const layer of VERIFICATION_CATALOG_LAYERS) {
    if (!seen.has(layer)) {
      addError(errors, ctx, `${basePointer}/requiredItems`, ValidationErrorCode.VERIFICATION_CATALOG_INCOMPLETE, `Verification Delta must include catalog layer ${layer}.`);
    }
  }
}

function requireEvidenceForLinks(data, errors, ctx) {
  if (!Array.isArray(data.links) || !data.links.some((link) => isObject(link) && link.rel === 'evidence_for' && link.required === true)) {
    addError(errors, ctx, '/links', ValidationErrorCode.EVIDENCE_FOR_REQUIRED, 'Evidence Packet must include a required top-level evidence_for link.');
  }
  if (!Array.isArray(data.subjectRefs) || data.subjectRefs.length === 0) return;
  data.subjectRefs.forEach((ref, index) => {
    if (!isObject(ref) || ref.rel !== 'evidence_for' || ref.required !== true) {
      addError(errors, ctx, `/subjectRefs/${index}`, ValidationErrorCode.EVIDENCE_FOR_REQUIRED, 'Evidence Packet subjectRefs must use required evidence_for links.');
    }
  });
}

function semanticChecks(kind, data, errors, ctx) {
  if (!isObject(data)) return;
  if (isObject(data.extensions)) {
    for (const [namespace, value] of Object.entries(data.extensions)) {
      if (!isObject(value) || typeof value.schemaVersion !== 'string') {
        addError(errors, ctx, `/extensions/${namespace}`, ValidationErrorCode.MALFORMED_EXTENSION, 'Extension value must be an object with schemaVersion.');
        continue;
      }
      for (const key of Object.keys(value)) {
        if (key !== 'schemaVersion' && CORE_FIELDS.has(key)) {
          addError(errors, ctx, `/extensions/${namespace}/${key}`, ValidationErrorCode.MALFORMED_EXTENSION, `Extension ${namespace} must not redefine core field ${key}.`);
        }
      }
    }
  }
  switch (kind) {
    case 'work_brief': {
      if (!Array.isArray(data.links) || !data.links.some((link) => linkMatches(link, 'raw_intent', 'work_brief'))) {
        addError(errors, ctx, '/links', ValidationErrorCode.BAD_LINK, 'Work Brief must include a required raw_intent link.');
      }
      break;
    }
    case 'implementation_plan': {
      requireLink(errors, ctx, '/workBriefRef', data.workBriefRef, 'derived_from', 'work_brief', 'ready');
      if (data.status === 'approved' && Array.isArray(data.openBlockers) && data.openBlockers.some((b) => b?.blocking === true)) {
        addError(errors, ctx, '/openBlockers', ValidationErrorCode.BAD_STATUS_HANDOFF, 'Approved Implementation Plan cannot contain unresolved blocking openBlockers.');
      }
      if (data.verificationDelta?.artifactKind !== 'verification_delta') {
        addError(errors, ctx, '/verificationDelta/artifactKind', ValidationErrorCode.BAD_LINK, 'Implementation Plan must embed a Verification Delta artifact.');
      } else {
        validateVerificationCatalog(data.verificationDelta, errors, ctx, '/verificationDelta');
      }
      break;
    }
    case 'verification_delta': {
      requireLink(errors, ctx, '/implementationPlanRef', data.implementationPlanRef, 'verification_delta_of', 'implementation_plan');
      if (!Array.isArray(data.requiredItems) || data.requiredItems.length === 0) {
        addError(errors, ctx, '/requiredItems', ValidationErrorCode.REQUIRED, 'Verification Delta must include required catalog items.');
      }
      validateVerificationCatalog(data, errors, ctx);
      break;
    }
    case 'build_result': {
      requireLink(errors, ctx, '/implementationPlanRef', data.implementationPlanRef, 'implements', 'implementation_plan', 'approved');
      if (!Array.isArray(data.verificationRuns) || data.verificationRuns.length === 0) {
        addError(errors, ctx, '/verificationRuns', ValidationErrorCode.REQUIRED, 'Build Result must reference Evidence Packets for verification claims.');
      } else {
        data.verificationRuns.forEach((run, index) => requireEvidencePacketRef(errors, ctx, `/verificationRuns/${index}/evidencePacketRef`, run?.evidencePacketRef));
      }
      if (Array.isArray(data.testsAndVerificationChanged)) {
        data.testsAndVerificationChanged.forEach((item, index) => requireEvidencePacketRef(errors, ctx, `/testsAndVerificationChanged/${index}/evidenceRef`, item?.evidenceRef));
      }
      if (Array.isArray(data.warningsAndBlockers)) {
        data.warningsAndBlockers.forEach((item, index) => requireEvidencePacketRef(errors, ctx, `/warningsAndBlockers/${index}/evidenceRef`, item?.evidenceRef));
      }
      if (data.status === 'passed' && Array.isArray(data.warningsAndBlockers) && data.warningsAndBlockers.some((item) => item?.blocking === true && ['critical','major-local'].includes(item?.severity))) {
        addError(errors, ctx, '/warningsAndBlockers', ValidationErrorCode.BAD_STATUS_HANDOFF, 'Passed Build Result cannot contain blocking critical or major-local evidence.');
      }
      break;
    }
    case 'ship_packet': {
      requireLink(errors, ctx, '/buildResultRef', data.buildResultRef, 'ship_packet_of', 'build_result', 'passed');
      if (Array.isArray(data.finalVerification)) {
        data.finalVerification.forEach((item, index) => requireEvidencePacketRef(errors, ctx, `/finalVerification/${index}/evidencePacketRef`, item?.evidencePacketRef));
      }
      if (isObject(data.contextPreservation) && Array.isArray(data.contextPreservation.driftCheckEvidenceRefs)) {
        data.contextPreservation.driftCheckEvidenceRefs.forEach((ref, index) => requireEvidencePacketRef(errors, ctx, `/contextPreservation/driftCheckEvidenceRefs/${index}`, ref));
      }
      if (data.noPushWithoutApproval !== true || data.commitPreparation?.commitPerformedByAgent !== false || data.prPreparation?.prOpenedByAgent !== false) {
        addError(errors, ctx, '/noPushWithoutApproval', ValidationErrorCode.BAD_STATUS_HANDOFF, 'Ship Packet must preserve no-push/no-PR-without-approval policy.');
      }
      break;
    }
    case 'evidence_packet': {
      requireEvidenceForLinks(data, errors, ctx);
      if (['fail','blocked'].includes(data.result) && !isObject(data.failureDetails)) {
        addError(errors, ctx, '/failureDetails', ValidationErrorCode.REQUIRED, 'Failure or blocked evidence requires failureDetails.');
      }
      if (data.evidenceClass === 'advisory' && data.blocking === true && data.result !== 'advisory') {
        addError(errors, ctx, '/blocking', ValidationErrorCode.BAD_STATUS_HANDOFF, 'Advisory evidence cannot masquerade as deterministic blocker.');
      }
      break;
    }
    case 'agent_registry_entry': {
      if (!Array.isArray(data.inputSchemas) || data.inputSchemas.length === 0 || !Array.isArray(data.outputSchemas) || data.outputSchemas.length === 0) {
        addError(errors, ctx, '/inputSchemas', ValidationErrorCode.REQUIRED, 'Agent registry entries require input and output schema refs.');
      }
      break;
    }
    case 'context_file_header': {
      if (!isObject(data.driftMetadata) || !isObject(data.updateMetadata)) {
        addError(errors, ctx, '/driftMetadata', ValidationErrorCode.REQUIRED, 'Context headers require update and drift metadata.');
      }
      break;
    }
    case 'schematic_manifest': {
      if (!Array.isArray(data.inputs) || data.inputs.length === 0 || !Array.isArray(data.generatedPaths) || data.generatedPaths.length === 0) {
        addError(errors, ctx, '/inputs', ValidationErrorCode.REQUIRED, 'Schematic manifests require input schema refs and generated path policy.');
      }
      break;
    }
    case 'skill_manifest': {
      if (!Array.isArray(data.outputArtifactSchemas) || data.outputArtifactSchemas.length === 0 || !Array.isArray(data.forbiddenActions) || data.forbiddenActions.length === 0) {
        addError(errors, ctx, '/outputArtifactSchemas', ValidationErrorCode.REQUIRED, 'Skill manifests require output schema refs and forbidden action policy.');
      }
      break;
    }
  }
}

export function validateArtifactKind(kind, data, options = {}) {
  const schema = loadSchema(kind);
  const ctx = createContext(data, options.artifactPath, schema);
  const errors = [];
  const validator = compiledRegistry.compiled.get(kind);
  if (!schema || !validator) {
    addError(errors, ctx, '', ValidationErrorCode.SCHEMA_INTERNAL_ERROR, `No schema registered for kind ${kind}.`);
    return { ok: false, errors };
  }
  validateVersionAndKind(data, kind, errors, ctx);
  const schemaOk = validator(data);
  if (!schemaOk) errors.push(...normalizeAjvErrors(validator.errors, ctx));
  semanticChecks(kind, data, errors, ctx);
  return errors.length === 0 ? { ok: true, artifact: data, kind, schemaId: schema.$id, schemaVersion: SUPPORTED_SCHEMA_VERSION } : { ok: false, errors };
}

export function validateArtifact(data, options = {}) {
  if (!isObject(data)) {
    const ctx = { artifactPath: options.artifactPath ?? null, artifactKind: null, schemaVersion: null, schemaId: null };
    return { ok: false, errors: [makeValidationError({ ...ctx, pointer: '', code: ValidationErrorCode.NOT_OBJECT, message: 'Artifact must be a JSON object.' })] };
  }
  const kind = data.artifactKind;
  if (!ARTIFACT_KINDS.includes(kind)) {
    const ctx = createContext(data, options.artifactPath, null);
    return { ok: false, errors: [makeValidationError({ ...ctx, pointer: '/artifactKind', code: ValidationErrorCode.ARTIFACT_KIND_MISMATCH, message: 'Unknown artifactKind.' })] };
  }
  return validateArtifactKind(kind, data, options);
}

export function validateArtifactFile(filePath, options = {}) {
  const artifactPath = options.artifactPath ?? filePath;
  if (path.extname(filePath) !== '.json') {
    return { ok: false, errors: [makeValidationError({ artifactPath, artifactKind: options.kind ?? null, schemaId: null, schemaVersion: null, pointer: '', code: ValidationErrorCode.CARRIER_NOT_JSON, message: 'Canonical artifact carriers must be UTF-8 JSON files; Markdown, YAML, frontmatter, and chat text are not accepted.' })] };
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return { ok: false, errors: [makeValidationError({ artifactPath, artifactKind: options.kind ?? null, schemaId: null, schemaVersion: null, pointer: '', code: ValidationErrorCode.JSON_PARSE_ERROR, message: `Invalid JSON artifact: ${error.message}` })] };
  }
  return options.kind ? validateArtifactKind(options.kind, parsed, { artifactPath }) : validateArtifact(parsed, { artifactPath });
}
