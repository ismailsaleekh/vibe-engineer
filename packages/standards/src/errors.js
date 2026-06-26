export const STANDARD_ERROR_CODES = Object.freeze({
  NOT_OBJECT: 'STANDARDS_NOT_OBJECT',
  REQUIRED_FIELD: 'STANDARDS_REQUIRED_FIELD',
  UNKNOWN_FIELD: 'STANDARDS_UNKNOWN_FIELD',
  INVALID_TYPE: 'STANDARDS_INVALID_TYPE',
  INVALID_VALUE: 'STANDARDS_INVALID_VALUE',
  INVALID_STANDARD_ID: 'STANDARDS_INVALID_STANDARD_ID',
  UNKNOWN_STANDARD_ID: 'STANDARDS_UNKNOWN_STANDARD_ID',
  UNSUPPORTED_SCHEMA_VERSION: 'STANDARDS_UNSUPPORTED_SCHEMA_VERSION',
  DUPLICATE_STANDARD_ID: 'STANDARDS_DUPLICATE_STANDARD_ID',
  MALFORMED_LIST: 'STANDARDS_MALFORMED_LIST',
  CATALOG_MALFORMED: 'STANDARDS_CATALOG_MALFORMED',
  SCHEMA_NOT_FOUND: 'STANDARDS_SCHEMA_NOT_FOUND',
  SCHEMA_UNREADABLE: 'STANDARDS_SCHEMA_UNREADABLE'
});

export class StandardsError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'StandardsError';
    this.code = options.code ?? STANDARD_ERROR_CODES.INVALID_VALUE;
    this.pointer = options.pointer ?? '';
    this.standardId = options.standardId ?? null;
    this.errors = Array.isArray(options.errors) ? options.errors : undefined;
  }
}

export function makeStandardError({ code, pointer = '', message, standardId = null }) {
  return Object.freeze({
    code,
    pointer,
    message,
    standardId
  });
}
