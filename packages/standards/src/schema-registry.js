import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STANDARD_ERROR_CODES, StandardsError } from "./errors.js";

export const SUPPORTED_SCHEMA_VERSION = "1.0.0";

export const STANDARD_SCHEMA_KINDS = Object.freeze(["standard-definition", "standards-catalog"]);

export const STANDARD_SCHEMA_FILES = Object.freeze({
  "standard-definition": "schemas/standard-definition.schema.json",
  "standards-catalog": "schemas/standards-catalog.schema.json",
});

export const STANDARD_SCHEMA_IDS = Object.freeze({
  "standard-definition":
    "https://schemas.vibe-engineer.dev/standards/v1/standard-definition.schema.json",
  "standards-catalog":
    "https://schemas.vibe-engineer.dev/standards/v1/standards-catalog.schema.json",
});

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function schemaPathForKind(kind) {
  const relativePath = STANDARD_SCHEMA_FILES[kind];
  if (!relativePath) return undefined;
  return path.join(packageRoot, relativePath);
}

export function loadStandardsSchema(kind) {
  const schemaPath = schemaPathForKind(kind);
  if (!schemaPath) {
    throw new StandardsError(`Unknown standards schema kind: ${kind}`, {
      code: STANDARD_ERROR_CODES.SCHEMA_NOT_FOUND,
      pointer: "/kind",
    });
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (error) {
    throw new StandardsError(`Unable to load standards schema ${kind}: ${error.message}`, {
      code: STANDARD_ERROR_CODES.SCHEMA_UNREADABLE,
      pointer: "/schema",
    });
  }

  if (
    parsed.$schema !== "https://json-schema.org/draft/2020-12/schema" ||
    parsed.$id !== STANDARD_SCHEMA_IDS[kind]
  ) {
    throw new StandardsError(
      `Standards schema ${kind} is not the expected JSON Schema 2020-12 document.`,
      {
        code: STANDARD_ERROR_CODES.SCHEMA_UNREADABLE,
        pointer: "/$schema",
      },
    );
  }
  return parsed;
}

export function loadAllStandardsSchemas() {
  return Object.freeze(
    Object.fromEntries(STANDARD_SCHEMA_KINDS.map((kind) => [kind, loadStandardsSchema(kind)])),
  );
}
