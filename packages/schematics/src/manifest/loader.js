import fs from "node:fs/promises";
import path from "node:path";

const DL08_EXTENSION = "dev.vibe-engineer.schematics.dl08";
const OPERATION_KINDS = new Set([
  "create_file",
  "replace_generated_file",
  "create_directory",
  "replace_marked_section",
  "report_stale_generated",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

async function parseJsonFile(filePath) {
  let text;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch (error) {
    fail("manifest_io", `Could not read schematic manifest: ${error.message}`, { filePath });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail("manifest_json", `Schematic manifest is not valid JSON: ${error.message}`, { filePath });
  }
}

function assertArrayOfStrings(value, field) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0))
    fail("manifest_semantics", `${field} must be a non-empty string array.`, { field });
}

function extractDl08(manifest) {
  const extension = manifest.extensions?.[DL08_EXTENSION];
  if (!isObject(extension) || extension.schemaVersion !== "1.0.0")
    fail("manifest_semantics", `Manifest must include ${DL08_EXTENSION} with schemaVersion 1.0.0.`);
  if (!isObject(extension.inputSchema))
    fail("manifest_semantics", "DL-08 extension must include inputSchema.");
  if (typeof extension.nameField !== "string")
    fail("manifest_semantics", "DL-08 extension must include nameField.");
  assertArrayOfStrings(extension.touchedPathPatterns, "touchedPathPatterns");
  if (!Array.isArray(extension.forbiddenPathPatterns))
    fail("manifest_semantics", "forbiddenPathPatterns must be an array.");
  if (
    !isObject(extension.securitySafety) ||
    extension.securitySafety.noNetwork !== true ||
    extension.securitySafety.noShell !== true ||
    extension.securitySafety.deterministicOnly !== true
  ) {
    fail(
      "manifest_semantics",
      "DL-08 securitySafety must require noNetwork, noShell, and deterministicOnly.",
    );
  }
  if (!Array.isArray(extension.operations) || extension.operations.length === 0)
    fail("manifest_semantics", "DL-08 extension must include operations.");
  const operations = extension.operations.map((operation, index) => {
    if (!isObject(operation)) fail("manifest_semantics", "Operation must be an object.", { index });
    if (!OPERATION_KINDS.has(operation.kind))
      fail("manifest_semantics", "Unsupported operation kind.", { index, kind: operation.kind });
    if (typeof operation.id !== "string" || operation.id.length === 0)
      fail("manifest_semantics", "Operation id is required.", { index });
    if (operation.kind !== "report_stale_generated" && typeof operation.pathTemplate !== "string")
      fail("manifest_semantics", "Operation pathTemplate is required.", { index });
    if (
      ["create_file", "replace_generated_file", "replace_marked_section"].includes(
        operation.kind,
      ) &&
      typeof operation.template !== "string"
    )
      fail("manifest_semantics", "File/section operation template is required.", { index });
    if (
      ["replace_generated_file", "replace_marked_section"].includes(operation.kind) &&
      typeof operation.blockId !== "string"
    )
      fail("manifest_semantics", "Generated replacement operation blockId is required.", { index });
    return Object.freeze({ ...operation });
  });
  return Object.freeze({ ...extension, operations });
}

function enforceFailClosedConflictPolicy(manifest) {
  if (manifest.conflictBehavior !== "fail")
    fail("manifest_conflict_policy", "Core v1 engine only accepts conflictBehavior fail.", {
      conflictBehavior: manifest.conflictBehavior,
    });
  for (const generatedPath of manifest.generatedPaths ?? []) {
    if (generatedPath.conflictPolicy !== "fail")
      fail(
        "manifest_conflict_policy",
        "Core v1 engine fails closed on non-fail generated path conflict policy.",
        { pathTemplate: generatedPath.pathTemplate, conflictPolicy: generatedPath.conflictPolicy },
      );
  }
}

function mapManifest(manifest, manifestPath) {
  enforceFailClosedConflictPolicy(manifest);
  const dl08 = extractDl08(manifest);
  return Object.freeze({
    manifest,
    manifestPath: path.resolve(manifestPath),
    manifestDir: path.dirname(path.resolve(manifestPath)),
    id: manifest.schematicId,
    version: manifest.schematicVersion,
    title: manifest.title,
    purpose: manifest.purpose,
    owner: manifest.owner,
    generatedPaths: manifest.generatedPaths,
    domainNeutrality: manifest.domainNeutrality,
    dl08,
  });
}

export async function loadSchematicManifest(manifestPath, { validateSchematicManifest }) {
  if (typeof validateSchematicManifest !== "function")
    fail("manifest_validator_missing", "Real schematic manifest validator must be injected.");
  const parsed = await parseJsonFile(manifestPath);
  const validation = await validateSchematicManifest(parsed, { artifactPath: manifestPath });
  if (!validation || validation.ok !== true) {
    fail(
      "manifest_validation_failed",
      "Injected real schematic manifest validator rejected the manifest.",
      { manifestPath, errors: validation?.errors ?? [] },
    );
  }
  return mapManifest(validation.artifact ?? parsed, manifestPath);
}

export { DL08_EXTENSION };
