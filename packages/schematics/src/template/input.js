function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function wordsFromName(value) {
  const trimmed = String(value).trim();
  if (trimmed.length === 0) fail("invalid_input", "Name input must not be empty.");
  const separated = trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-./]+/g, " ")
    .trim();
  const words = separated.split(/\s+/).filter(Boolean).map((word) => word.toLowerCase());
  if (words.length === 0 || words.some((word) => !/^[a-z][a-z0-9]*$/.test(word))) {
    fail("invalid_input", "Name input must contain only deterministic identifier words.", { value });
  }
  return words;
}

function upperFirst(value) {
  return value.length === 0 ? value : `${value[0].toUpperCase()}${value.slice(1)}`;
}

export function normalizeNameFields(name) {
  const words = wordsFromName(name);
  const kebabName = words.join("-");
  const camelName = `${words[0]}${words.slice(1).map(upperFirst).join("")}`;
  const pascalName = words.map(upperFirst).join("");
  const constantName = words.map((word) => word.toUpperCase()).join("_");
  const humanTitle = words.map(upperFirst).join(" ");
  return { name: String(name).trim(), kebabName, camelName, pascalName, constantName, pathSegment: kebabName, humanTitle };
}

function validateStringConstraint(name, value, schema) {
  if (typeof value !== "string") fail("invalid_input", `Input ${name} must be a string.`, { field: name });
  if (Number.isInteger(schema.minLength) && value.length < schema.minLength) fail("invalid_input", `Input ${name} is shorter than minLength.`, { field: name });
  if (typeof schema.pattern === "string") {
    const pattern = new RegExp(schema.pattern);
    if (!pattern.test(value)) fail("invalid_input", `Input ${name} does not match its declared pattern.`, { field: name });
  }
}

export function validateAndNormalizeInput(manifest, input) {
  if (!isPlainObject(input)) fail("invalid_input", "Schematic input must be a JSON object.");
  const dl08 = manifest.dl08;
  const inputSchema = dl08.inputSchema;
  if (!isPlainObject(inputSchema) || inputSchema.type !== "object" || !isPlainObject(inputSchema.properties)) {
    fail("blocked", "Manifest DL-08 extension must declare an object inputSchema.");
  }
  const allowed = new Set(Object.keys(inputSchema.properties));
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) fail("invalid_input", `Unknown input field ${key}.`, { field: key });
  }
  for (const key of inputSchema.required ?? []) {
    if (!(key in input)) fail("invalid_input", `Missing required input field ${key}.`, { field: key });
  }
  const validated = {};
  for (const [key, schema] of Object.entries(inputSchema.properties)) {
    if (!(key in input)) continue;
    if (schema.type === "string") validateStringConstraint(key, input[key], schema);
    else if (schema.type === "boolean") {
      if (typeof input[key] !== "boolean") fail("invalid_input", `Input ${key} must be a boolean.`, { field: key });
    } else {
      fail("blocked", `Unsupported input schema type for ${key}.`, { field: key, type: schema.type });
    }
    validated[key] = input[key];
  }
  const nameField = dl08.nameField;
  if (typeof nameField !== "string" || !(nameField in validated)) fail("invalid_input", "Manifest nameField must reference a supplied input.");
  return Object.freeze({ ...validated, ...normalizeNameFields(validated[nameField]) });
}
