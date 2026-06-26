import { STANDARD_IDS } from './catalog-data.js';
import { STANDARD_ERROR_CODES, makeStandardError } from './errors.js';
import { SUPPORTED_SCHEMA_VERSION } from './schema-registry.js';

const STANDARD_FIELDS = Object.freeze([
  'schemaVersion',
  'standardId',
  'title',
  'summary',
  'rationale',
  'category',
  'level',
  'neutrality',
  'appliesTo',
  'requirements',
  'references',
  'tags'
]);

const REQUIREMENT_FIELDS = Object.freeze(['id', 'statement', 'verification']);
const REFERENCE_FIELDS = Object.freeze(['label', 'path', 'section']);
const CATALOG_FIELDS = Object.freeze(['schemaVersion', 'catalogId', 'title', 'summary', 'neutrality', 'standardIds', 'standards']);

const REQUIRED_STANDARD_FIELDS = Object.freeze([
  'schemaVersion',
  'standardId',
  'title',
  'summary',
  'rationale',
  'category',
  'level',
  'neutrality',
  'appliesTo',
  'requirements',
  'references'
]);

const REQUIRED_REQUIREMENT_FIELDS = Object.freeze(['id', 'statement', 'verification']);
const REQUIRED_REFERENCE_FIELDS = Object.freeze(['label', 'path']);
const REQUIRED_CATALOG_FIELDS = Object.freeze(['schemaVersion', 'catalogId', 'title', 'summary', 'neutrality', 'standardIds', 'standards']);

const CATEGORIES = Object.freeze(new Set([
  'contracts',
  'documentation',
  'domain-neutrality',
  'evidence',
  'orchestration',
  'package-boundaries',
  'schematics',
  'security',
  'testing',
  'typescript',
  'verification'
]));

const LEVELS = Object.freeze(new Set(['required', 'recommended', 'advisory']));
const NEUTRALITY = Object.freeze(new Set(['core', 'extension', 'sample-demo', 'negative-fixture']));
const APPLY_SURFACES = Object.freeze(new Set([
  'agents',
  'artifacts',
  'commands',
  'config',
  'context',
  'docs',
  'evidence',
  'fixtures',
  'packages',
  'prompts',
  'schemas',
  'schematics',
  'skills',
  'standards',
  'verification'
]));

const KNOWN_IDS = Object.freeze(new Set(STANDARD_IDS));

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pathJoin(base, token) {
  return `${base}/${String(token).replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

function add(errors, pointer, code, message, standardId = null) {
  errors.push(makeStandardError({ code, pointer, message, standardId }));
}

function validateAllowedKeys(value, allowed, pointer, errors) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      add(errors, pathJoin(pointer, key), STANDARD_ERROR_CODES.UNKNOWN_FIELD, `Unknown field ${key} is not allowed.`);
    }
  }
}

function validateRequiredKeys(value, required, pointer, errors) {
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      add(errors, pathJoin(pointer, key), STANDARD_ERROR_CODES.REQUIRED_FIELD, `Required field ${key} is missing.`);
    }
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function isSlug(value) {
  if (!isNonEmptyString(value)) return false;
  const first = value.charCodeAt(0);
  if (!((first >= 48 && first <= 57) || (first >= 97 && first <= 122))) return false;
  for (let index = 1; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const allowed = (code >= 48 && code <= 57) || (code >= 97 && code <= 122) || code === 45;
    if (!allowed) return false;
  }
  return true;
}

function validateString(value, pointer, fieldName, errors) {
  if (!isNonEmptyString(value)) {
    add(errors, pointer, STANDARD_ERROR_CODES.INVALID_TYPE, `${fieldName} must be a non-empty string.`);
    return false;
  }
  return true;
}

function validateSchemaVersion(value, pointer, errors) {
  if (!isNonEmptyString(value)) {
    add(errors, pointer, STANDARD_ERROR_CODES.UNSUPPORTED_SCHEMA_VERSION, 'schemaVersion must be the supported semantic version string.');
    return;
  }
  if (value !== SUPPORTED_SCHEMA_VERSION) {
    add(errors, pointer, STANDARD_ERROR_CODES.UNSUPPORTED_SCHEMA_VERSION, `Unsupported schemaVersion ${value}.`);
  }
}

function validateKnownStandardId(value, pointer, errors) {
  if (!isSlug(value)) {
    add(errors, pointer, STANDARD_ERROR_CODES.INVALID_STANDARD_ID, 'standardId must be a lower-case kebab identifier.');
    return;
  }
  if (!KNOWN_IDS.has(value)) {
    add(errors, pointer, STANDARD_ERROR_CODES.UNKNOWN_STANDARD_ID, `Unknown standardId ${value}.`, value);
  }
}

function validateEnum(value, allowed, pointer, fieldName, errors) {
  if (!validateString(value, pointer, fieldName, errors)) return;
  if (!allowed.has(value)) {
    add(errors, pointer, STANDARD_ERROR_CODES.INVALID_VALUE, `${fieldName} has an unsupported value.`);
  }
}

function validateStringList(value, allowed, pointer, fieldName, errors, options = {}) {
  if (!Array.isArray(value) || value.length === 0) {
    add(errors, pointer, STANDARD_ERROR_CODES.MALFORMED_LIST, `${fieldName} must be a non-empty array.`);
    return;
  }
  const seen = new Set();
  value.forEach((entry, index) => {
    const entryPointer = pathJoin(pointer, index);
    if (!validateString(entry, entryPointer, fieldName, errors)) return;
    if (options.requireSlug === true && !isSlug(entry)) {
      add(errors, entryPointer, STANDARD_ERROR_CODES.INVALID_VALUE, `${fieldName} must contain lower-case kebab identifiers.`);
    }
    if (seen.has(entry)) {
      add(errors, entryPointer, STANDARD_ERROR_CODES.MALFORMED_LIST, `${fieldName} contains duplicate value ${entry}.`);
    }
    seen.add(entry);
    if (allowed && !allowed.has(entry)) {
      add(errors, entryPointer, STANDARD_ERROR_CODES.INVALID_VALUE, `${fieldName} contains unsupported value ${entry}.`);
    }
  });
}

function validateRequirement(value, pointer, errors) {
  if (!isRecord(value)) {
    add(errors, pointer, STANDARD_ERROR_CODES.NOT_OBJECT, 'Requirement must be an object.');
    return;
  }
  validateAllowedKeys(value, REQUIREMENT_FIELDS, pointer, errors);
  validateRequiredKeys(value, REQUIRED_REQUIREMENT_FIELDS, pointer, errors);
  if (Object.hasOwn(value, 'id')) {
    if (!isSlug(value.id)) add(errors, pathJoin(pointer, 'id'), STANDARD_ERROR_CODES.INVALID_VALUE, 'Requirement id must be a lower-case kebab identifier.');
  }
  if (Object.hasOwn(value, 'statement')) validateString(value.statement, pathJoin(pointer, 'statement'), 'statement', errors);
  if (Object.hasOwn(value, 'verification')) validateString(value.verification, pathJoin(pointer, 'verification'), 'verification', errors);
}

function validateReference(value, pointer, errors) {
  if (!isRecord(value)) {
    add(errors, pointer, STANDARD_ERROR_CODES.NOT_OBJECT, 'Reference must be an object.');
    return;
  }
  validateAllowedKeys(value, REFERENCE_FIELDS, pointer, errors);
  validateRequiredKeys(value, REQUIRED_REFERENCE_FIELDS, pointer, errors);
  if (Object.hasOwn(value, 'label')) validateString(value.label, pathJoin(pointer, 'label'), 'label', errors);
  if (Object.hasOwn(value, 'path')) validateString(value.path, pathJoin(pointer, 'path'), 'path', errors);
  if (Object.hasOwn(value, 'section')) validateString(value.section, pathJoin(pointer, 'section'), 'section', errors);
}

function validateArrayOfObjects(value, pointer, fieldName, itemValidator, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    add(errors, pointer, STANDARD_ERROR_CODES.MALFORMED_LIST, `${fieldName} must be a non-empty array.`);
    return;
  }
  value.forEach((entry, index) => itemValidator(entry, pathJoin(pointer, index), errors));
}

export function validateStandardDefinition(definition) {
  const errors = [];
  if (!isRecord(definition)) {
    add(errors, '', STANDARD_ERROR_CODES.NOT_OBJECT, 'Standard definition must be an object.');
    return Object.freeze({ ok: false, errors: Object.freeze(errors) });
  }

  validateAllowedKeys(definition, STANDARD_FIELDS, '', errors);
  validateRequiredKeys(definition, REQUIRED_STANDARD_FIELDS, '', errors);

  if (Object.hasOwn(definition, 'schemaVersion')) validateSchemaVersion(definition.schemaVersion, '/schemaVersion', errors);
  if (Object.hasOwn(definition, 'standardId')) validateKnownStandardId(definition.standardId, '/standardId', errors);
  if (Object.hasOwn(definition, 'title')) validateString(definition.title, '/title', 'title', errors);
  if (Object.hasOwn(definition, 'summary')) validateString(definition.summary, '/summary', 'summary', errors);
  if (Object.hasOwn(definition, 'rationale')) validateString(definition.rationale, '/rationale', 'rationale', errors);
  if (Object.hasOwn(definition, 'category')) validateEnum(definition.category, CATEGORIES, '/category', 'category', errors);
  if (Object.hasOwn(definition, 'level')) validateEnum(definition.level, LEVELS, '/level', 'level', errors);
  if (Object.hasOwn(definition, 'neutrality')) validateEnum(definition.neutrality, NEUTRALITY, '/neutrality', 'neutrality', errors);
  if (Object.hasOwn(definition, 'appliesTo')) validateStringList(definition.appliesTo, APPLY_SURFACES, '/appliesTo', 'appliesTo', errors);
  if (Object.hasOwn(definition, 'requirements')) validateArrayOfObjects(definition.requirements, '/requirements', 'requirements', validateRequirement, errors);
  if (Object.hasOwn(definition, 'references')) validateArrayOfObjects(definition.references, '/references', 'references', validateReference, errors);
  if (Object.hasOwn(definition, 'tags')) validateStringList(definition.tags, undefined, '/tags', 'tags', errors, { requireSlug: true });

  if (errors.length > 0) return Object.freeze({ ok: false, errors: Object.freeze(errors) });
  return Object.freeze({ ok: true, standard: definition, schemaVersion: SUPPORTED_SCHEMA_VERSION });
}

export function validateStandardsCatalog(catalog) {
  const errors = [];
  if (!isRecord(catalog)) {
    add(errors, '', STANDARD_ERROR_CODES.NOT_OBJECT, 'Standards catalog must be an object.');
    return Object.freeze({ ok: false, errors: Object.freeze(errors) });
  }

  validateAllowedKeys(catalog, CATALOG_FIELDS, '', errors);
  validateRequiredKeys(catalog, REQUIRED_CATALOG_FIELDS, '', errors);
  if (Object.hasOwn(catalog, 'schemaVersion')) validateSchemaVersion(catalog.schemaVersion, '/schemaVersion', errors);
  if (Object.hasOwn(catalog, 'catalogId') && catalog.catalogId !== 'vibe-engineer-core-standards') {
    add(errors, '/catalogId', STANDARD_ERROR_CODES.CATALOG_MALFORMED, 'catalogId must be vibe-engineer-core-standards.');
  }
  if (Object.hasOwn(catalog, 'title')) validateString(catalog.title, '/title', 'title', errors);
  if (Object.hasOwn(catalog, 'summary')) validateString(catalog.summary, '/summary', 'summary', errors);
  if (Object.hasOwn(catalog, 'neutrality') && catalog.neutrality !== 'core') {
    add(errors, '/neutrality', STANDARD_ERROR_CODES.CATALOG_MALFORMED, 'standards catalog neutrality must be core.');
  }

  const ids = Array.isArray(catalog.standardIds) ? catalog.standardIds : [];
  if (!Array.isArray(catalog.standardIds) || catalog.standardIds.length === 0) {
    add(errors, '/standardIds', STANDARD_ERROR_CODES.MALFORMED_LIST, 'standardIds must be a non-empty array.');
  }
  const seenIds = new Set();
  ids.forEach((standardId, index) => {
    const pointer = `/standardIds/${index}`;
    if (!isSlug(standardId)) {
      add(errors, pointer, STANDARD_ERROR_CODES.INVALID_STANDARD_ID, 'Catalog standard id must be a lower-case kebab identifier.');
      return;
    }
    if (seenIds.has(standardId)) add(errors, pointer, STANDARD_ERROR_CODES.DUPLICATE_STANDARD_ID, `Duplicate standard id ${standardId}.`, standardId);
    seenIds.add(standardId);
    if (!KNOWN_IDS.has(standardId)) add(errors, pointer, STANDARD_ERROR_CODES.UNKNOWN_STANDARD_ID, `Catalog contains unknown standard id ${standardId}.`, standardId);
  });

  if (!Array.isArray(catalog.standards) || catalog.standards.length === 0) {
    add(errors, '/standards', STANDARD_ERROR_CODES.MALFORMED_LIST, 'standards must be a non-empty array.');
  } else {
    const definitionIds = new Set();
    catalog.standards.forEach((standard, index) => {
      const result = validateStandardDefinition(standard);
      if (!result.ok) {
        for (const error of result.errors) {
          add(errors, `/standards/${index}${error.pointer}`, error.code, error.message, error.standardId);
        }
        return;
      }
      if (definitionIds.has(standard.standardId)) {
        add(errors, `/standards/${index}/standardId`, STANDARD_ERROR_CODES.DUPLICATE_STANDARD_ID, `Duplicate standard definition ${standard.standardId}.`, standard.standardId);
      }
      definitionIds.add(standard.standardId);
    });

    for (const standardId of ids) {
      if (!definitionIds.has(standardId)) {
        add(errors, '/standards', STANDARD_ERROR_CODES.CATALOG_MALFORMED, `Catalog standardIds includes ${standardId} but no matching definition exists.`, standardId);
      }
    }
    for (const standardId of definitionIds) {
      if (!seenIds.has(standardId)) {
        add(errors, '/standardIds', STANDARD_ERROR_CODES.CATALOG_MALFORMED, `Catalog definition ${standardId} is missing from standardIds.`, standardId);
      }
    }
  }

  if (STANDARD_IDS.length !== seenIds.size) {
    add(errors, '/standardIds', STANDARD_ERROR_CODES.CATALOG_MALFORMED, 'Catalog must include every supported core standard id exactly once.');
  }

  if (errors.length > 0) return Object.freeze({ ok: false, errors: Object.freeze(errors) });
  return Object.freeze({ ok: true, catalog, schemaVersion: SUPPORTED_SCHEMA_VERSION });
}
