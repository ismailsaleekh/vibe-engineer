import { STANDARD_DEFINITIONS, STANDARD_IDS, STANDARDS_CATALOG } from './catalog-data.js';
import { STANDARD_ERROR_CODES, StandardsError } from './errors.js';
import { validateStandardDefinition, validateStandardsCatalog } from './validation.js';

export { STANDARD_ERROR_CODES, StandardsError } from './errors.js';
export {
  STANDARD_SCHEMA_FILES,
  STANDARD_SCHEMA_IDS,
  STANDARD_SCHEMA_KINDS,
  SUPPORTED_SCHEMA_VERSION,
  loadAllStandardsSchemas,
  loadStandardsSchema,
  schemaPathForKind
} from './schema-registry.js';
export { validateStandardDefinition, validateStandardsCatalog } from './validation.js';
export { STANDARD_IDS, STANDARDS_CATALOG } from './catalog-data.js';

const STANDARD_MAP = new Map(STANDARD_DEFINITIONS.map((standard) => [standard.standardId, standard]));

function clone(value) {
  return structuredClone(value);
}

function assertCatalogValid() {
  const result = validateStandardsCatalog(STANDARDS_CATALOG);
  if (!result.ok) {
    throw new StandardsError('Embedded standards catalog failed validation.', {
      code: STANDARD_ERROR_CODES.CATALOG_MALFORMED,
      pointer: '',
      errors: result.errors
    });
  }
}

assertCatalogValid();

export function listStandards() {
  return Object.freeze([...STANDARD_IDS]);
}

export function loadStandard(id) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new StandardsError('standardId must be a non-empty string.', {
      code: STANDARD_ERROR_CODES.INVALID_STANDARD_ID,
      pointer: '/standardId'
    });
  }
  const standard = STANDARD_MAP.get(id);
  if (!standard) {
    throw new StandardsError(`Unknown standardId ${id}.`, {
      code: STANDARD_ERROR_CODES.UNKNOWN_STANDARD_ID,
      pointer: '/standardId',
      standardId: id
    });
  }
  return clone(standard);
}

export function getStandardsCatalog() {
  return clone(STANDARDS_CATALOG);
}
