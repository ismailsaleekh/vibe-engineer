import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemasDir = process.env.SCHEMAS_DIR
  ? path.resolve(process.env.SCHEMAS_DIR)
  : path.join(packageRoot, "schemas");
const outFile = process.env.OUT_FILE
  ? path.resolve(process.env.OUT_FILE)
  : path.join(packageRoot, "src/generated/types.d.ts");

function tsName(schema) {
  return schema.title || "GeneratedArtifact";
}
function literal(value) {
  return JSON.stringify(value);
}
function typeFor(schema) {
  if (!schema || typeof schema !== "object") return "unknown";
  if (schema.const !== undefined) return literal(schema.const);
  if (schema.enum) return schema.enum.map(literal).join(" | ");
  const types = Array.isArray(schema.type) ? schema.type : [schema.type].filter(Boolean);
  if (types.length > 1) return types.map((t) => typeFor({ ...schema, type: t })).join(" | ");
  const type = types[0];
  if (type === "string") return "string";
  if (type === "integer" || type === "number") return "number";
  if (type === "boolean") return "boolean";
  if (type === "null") return "null";
  if (type === "array") return `Array<${typeFor(schema.items)}>`;
  if (type === "object") {
    const props = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const lines = Object.entries(props).map(
      ([key, child]) =>
        `  ${JSON.stringify(key)}${required.has(key) ? "" : "?"}: ${typeFor(child)};`,
    );
    if (schema.additionalProperties && schema.additionalProperties !== false) {
      lines.push(
        `  [key: string]: ${schema.additionalProperties === true ? "unknown" : typeFor(schema.additionalProperties)};`,
      );
    }
    return `{\n${lines.join("\n")}\n}`;
  }
  return "unknown";
}

const schemas = fs
  .readdirSync(schemasDir)
  .filter((f) => f.endsWith(".schema.json"))
  .sort()
  .map((file) => JSON.parse(fs.readFileSync(path.join(schemasDir, file), "utf8")));
const artifactKindUnion = schemas
  .map((schema) => literal(schema.properties.artifactKind.const))
  .join(" | ");
const body = [
  `// Generated from canonical JSON Schemas by scripts/generate-types.mjs. Do not hand edit.`,
  ``,
  `export type ArtifactKind = ${artifactKindUnion};`,
  ``,
  `export interface ArtifactValidationError {`,
  `  artifactPath: string | null;`,
  `  artifactKind: ArtifactKind | null;`,
  `  schemaId: string | null;`,
  `  schemaVersion: string | null;`,
  `  pointer: string;`,
  `  code: string;`,
  `  message: string;`,
  `}`,
  ``,
  `export type ArtifactValidationResult<T> =`,
  `  | { ok: true; artifact: T; kind: ArtifactKind; schemaId: string; schemaVersion: string }`,
  `  | { ok: false; errors: ArtifactValidationError[] };`,
  ``,
];
for (const schema of schemas) {
  body.push(`export type ${tsName(schema)} = ${typeFor(schema)};`, ``);
}
body.push(`export type AnyArtifactV1 = ${schemas.map(tsName).join(" | ")};`, ``);
body.push(`export const ARTIFACT_KINDS: readonly ArtifactKind[];`);
body.push(`export const SUPPORTED_SCHEMA_VERSION: '1.0.0';`);
body.push(`export const SCHEMA_FILES: Readonly<Record<ArtifactKind, string>>;`);
body.push(`export function schemaPathForKind(kind: ArtifactKind): string | undefined;`);
body.push(`export function loadSchema(kind: ArtifactKind): unknown;`);
body.push(`export function loadAllSchemas(): Readonly<Record<ArtifactKind, unknown>>;`);
body.push(
  `export function compileAllArtifactSchemas(): Readonly<{ schemaVersion: '1.0.0'; kinds: readonly ArtifactKind[] }>;`,
);
body.push(
  `export function validateArtifact(data: unknown, options?: { artifactPath?: string }): ArtifactValidationResult<AnyArtifactV1>;`,
);
body.push(
  `export function validateArtifactKind(kind: ArtifactKind, data: unknown, options?: { artifactPath?: string }): ArtifactValidationResult<AnyArtifactV1>;`,
);
body.push(
  `export function validateArtifactFile(filePath: string, options?: { artifactPath?: string; kind?: ArtifactKind }): ArtifactValidationResult<AnyArtifactV1>;`,
);
body.push(`export const ValidationErrorCode: Readonly<Record<string, string>>;`, ``);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, body.join("\n"));
