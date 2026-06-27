// Pure-Node JSON Schema (draft 2020-12 subset) validator.
//
// Scope: a real, deterministic validator for the subset of JSON Schema used by
// I-20A's own evidence schemas (scripts/quality/schemas/**). Supported keywords:
//   type, enum, const, required, properties, additionalProperties (false | schema),
//   items, minItems, maxItems, minLength, maxLength, pattern, anyOf, oneOf.
//
// This is NOT a heuristic standing in for a typed producer→consumer contract.
// The load-bearing typed seam in this lane is the PUBLIC aggregate API
// (@vibe-engineer/mechanical-gates/aggregate), which is exercised real-boundary
// and enforces its own carrier shape (assertTypedFindings/createValidatorResult).
// This validator governs only the quality runner's OWN output artifact shape.

const KNOWN_KEYWORDS = new Set([
  "type", "enum", "const", "required", "properties", "additionalProperties",
  "items", "minItems", "maxItems", "minLength", "maxLength", "pattern",
  "anyOf", "oneOf", "$schema", "$id", "title", "description"
]);

function getType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

const TYPE_MATCHES = {
  null: (v) => v === null,
  boolean: (v) => typeof v === "boolean",
  integer: (v) => typeof v === "number" && Number.isInteger(v),
  number: (v) => typeof v === "number",
  string: (v) => typeof v === "string",
  array: (v) => Array.isArray(v),
  object: (v) => typeof v === "object" && v !== null && !Array.isArray(v)
};

function validateInstance(instance, schema, path, errors) {
  if (schema === true) return;
  if (schema === false) {
    errors.push({ path, message: "schema false rejects all instances" });
    return;
  }
  if (typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error(`Invalid schema at ${path}: expected object, got ${getType(schema)}`);
  }
  for (const keyword of Object.keys(schema)) {
    if (!KNOWN_KEYWORDS.has(keyword)) {
      throw new Error(`Unsupported JSON Schema keyword '${keyword}' at ${path} — extend the validator or narrow the schema.`);
    }
  }

  if ("type" in schema) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const ok = types.some((t) => TYPE_MATCHES[t]?.(instance));
    if (!ok) {
      errors.push({ path, message: `expected type ${JSON.stringify(schema.type)}, got ${getType(instance)}` });
      return; // type mismatch: deeper checks are meaningless
    }
  }

  if ("enum" in schema && !schema.enum.some((cand) => deepEqual(cand, instance))) {
    errors.push({ path, message: `value not in enum ${JSON.stringify(schema.enum)}` });
  }
  if ("const" in schema && !deepEqual(schema.const, instance)) {
    errors.push({ path, message: `value !== const ${JSON.stringify(schema.const)}` });
  }

  if (getType(instance) === "string") {
    if ("minLength" in schema && instance.length < schema.minLength) {
      errors.push({ path, message: `string shorter than minLength ${schema.minLength}` });
    }
    if ("maxLength" in schema && instance.length > schema.maxLength) {
      errors.push({ path, message: `string longer than maxLength ${schema.maxLength}` });
    }
    if ("pattern" in schema) {
      const re = new RegExp(schema.pattern);
      if (!re.test(instance)) {
        errors.push({ path, message: `string does not match pattern ${schema.pattern}` });
      }
    }
  }

  if (getType(instance) === "array") {
    if ("minItems" in schema && instance.length < schema.minItems) {
      errors.push({ path, message: `array shorter than minItems ${schema.minItems}` });
    }
    if ("maxItems" in schema && instance.length > schema.maxItems) {
      errors.push({ path, message: `array longer than maxItems ${schema.maxItems}` });
    }
    if ("items" in schema) {
      for (let i = 0; i < instance.length; i += 1) {
        validateInstance(instance[i], schema.items, `${path}[${i}]`, errors);
      }
    }
  }

  if (getType(instance) === "object") {
    if ("required" in schema) {
      for (const key of schema.required) {
        if (!(key in instance)) {
          errors.push({ path, message: `missing required property '${key}'` });
        }
      }
    }
    if ("properties" in schema) {
      for (const [key, subSchema] of Object.entries(schema.properties)) {
        if (key in instance) {
          validateInstance(instance[key], subSchema, joinPath(path, key), errors);
        }
      }
    }
    if ("additionalProperties" in schema) {
      const known = schema.properties ? new Set(Object.keys(schema.properties)) : new Set();
      for (const key of Object.keys(instance)) {
        if (!known.has(key)) {
          if (schema.additionalProperties === false) {
            errors.push({ path, message: `additional property '${key}' not allowed` });
          } else if (typeof schema.additionalProperties === "object") {
            validateInstance(instance[key], schema.additionalProperties, joinPath(path, key), errors);
          }
        }
      }
    }
  }

  if ("anyOf" in schema) {
    const anyOk = schema.anyOf.some((sub) => {
      const tmp = [];
      validateInstance(instance, sub, path, tmp);
      return tmp.length === 0;
    });
    if (!anyOk) errors.push({ path, message: "value matches none of anyOf branches" });
  }
  if ("oneOf" in schema) {
    const matches = schema.oneOf.filter((sub) => {
      const tmp = [];
      validateInstance(instance, sub, path, tmp);
      return tmp.length === 0;
    });
    if (matches.length !== 1) {
      errors.push({ path, message: `value matches ${matches.length} oneOf branches (expected exactly 1)` });
    }
  }
}

function joinPath(base, key) {
  return base === "" ? key : `${base}.${key}`;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object") {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

export function validateJson(instance, schema) {
  const errors = [];
  validateInstance(instance, schema, "", errors);
  return { ok: errors.length === 0, errors };
}

export class SchemaValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = "SchemaValidationError";
    this.code = "QUALITY_SCHEMA_INVALID";
    this.errors = errors;
  }
}

export function assertValid(instance, schema, label) {
  const result = validateJson(instance, schema);
  if (!result.ok) {
    const detail = result.errors.map((e) => `${e.path || "<root>"}: ${e.message}`).join("; ");
    throw new SchemaValidationError(`Schema validation failed for ${label}: ${detail}`, result.errors);
  }
  return result;
}
