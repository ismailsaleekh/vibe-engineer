export const BUILTIN_SCHEMATIC_IDS = Object.freeze([
  "builtin.module",
  "builtin.contract",
  "builtin.adapter",
  "builtin.test-fixture",
  "builtin.context-file",
  "builtin.standard-doc",
] as const);

export const BUILTIN_SCHEMATIC_SLUGS = Object.freeze([
  "module",
  "contract",
  "adapter",
  "test-fixture",
  "context-file",
  "standard-doc",
] as const);

export const REQUIRED_TYPESCRIPT_PRESET_FILE_KINDS = Object.freeze([
  "typescript-config",
  "eslint-policy",
  "prettier-policy",
  "workspace-config",
  "turbo-config",
  "package-manifest",
] as const);

export type BuiltInSchematicId = (typeof BUILTIN_SCHEMATIC_IDS)[number];
export type BuiltInSchematicSlug = (typeof BUILTIN_SCHEMATIC_SLUGS)[number];
export type RequiredTypeScriptPresetFileKind = (typeof REQUIRED_TYPESCRIPT_PRESET_FILE_KINDS)[number];

export interface BuiltInSchematicCatalogOptions {
  readonly templatesRoot: string;
}

export interface BuiltInSchematicManifestReadOptions extends BuiltInSchematicCatalogOptions {
  readonly readTextFile: (filePath: string) => string | Promise<string>;
}

export interface BuiltInSchematicCatalogEntry {
  readonly slug: BuiltInSchematicSlug;
  readonly schematicId: BuiltInSchematicId;
  readonly manifestPath: string;
}

export interface BuiltInSchematicManifestEntry extends BuiltInSchematicCatalogEntry {
  readonly manifest: unknown;
}

export interface StandardContract {
  readonly standardId: string;
  readonly title: string;
  readonly summary: string;
}

export interface StandardsApiContract {
  readonly loadStandard: (id: string) => StandardContract;
}

export interface TypeScriptPresetMetadataContract {
  readonly presetId: string;
  readonly quickGateLabel: string;
}

export interface TypeScriptPresetFileManifestEntryContract {
  readonly kind: string;
}

export interface GeneratedTypeScriptPresetFileContract {
  readonly path: string;
  readonly content: string;
}

export interface TypeScriptPresetApiContract {
  readonly getTypeScriptPresetMetadata: () => TypeScriptPresetMetadataContract;
  readonly getTypeScriptPresetFileManifest: () => readonly TypeScriptPresetFileManifestEntryContract[];
  readonly renderTypeScriptPresetFiles: () => readonly GeneratedTypeScriptPresetFileContract[];
  readonly validateTypeScriptPresetFiles: (
    files: readonly GeneratedTypeScriptPresetFileContract[],
  ) => { readonly ok: boolean };
}

export interface BuiltInContractApis {
  readonly standardsApi: StandardsApiContract;
  readonly typescriptPresetApi: TypeScriptPresetApiContract;
}

export interface BuiltInContractAssertionResult {
  readonly ok: true;
  readonly count: number;
  readonly schematicIds: readonly string[];
}

export type BuiltInContractInputValue = string | boolean;
export type BuiltInContractInput = Readonly<Record<string, BuiltInContractInputValue>>;

type UnknownRecord = Record<string, unknown>;

const BUILTIN_SCHEMATIC_REGISTRY = Object.freeze([
  Object.freeze({ slug: "module", schematicId: "builtin.module" }),
  Object.freeze({ slug: "contract", schematicId: "builtin.contract" }),
  Object.freeze({ slug: "adapter", schematicId: "builtin.adapter" }),
  Object.freeze({ slug: "test-fixture", schematicId: "builtin.test-fixture" }),
  Object.freeze({ slug: "context-file", schematicId: "builtin.context-file" }),
  Object.freeze({ slug: "standard-doc", schematicId: "builtin.standard-doc" }),
] as const);

const REQUIRED_INPUT_CONTRACT_FIELDS = Object.freeze([
  "standardId",
  "standardTitle",
  "standardSummary",
  "presetId",
  "quickGateLabel",
  "packageManager",
  "typecheckCommand",
] as const);

const REGEXP_SPECIAL_CHARACTERS = /[\\^$.*+?()[\]{}|]/g;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(code: string, message: string, details: UnknownRecord = {}): never {
  const error = new Error(message) as Error & { code: string; details: UnknownRecord };
  error.code = code;
  error.details = details;
  throw error;
}

function assertNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail("builtins_contract", `${label} must be a non-empty string.`, { label });
  }
  return value;
}

function assertRecord(value: unknown, label: string): UnknownRecord {
  if (!isRecord(value)) fail("builtins_contract", `${label} must be an object.`, { label });
  return value;
}

function readRecordField(record: UnknownRecord, field: string, label: string): UnknownRecord {
  return assertRecord(record[field], `${label}.${field}`);
}

function readStringField(record: UnknownRecord, field: string, label: string): string {
  return assertNonEmptyString(record[field], `${label}.${field}`);
}

function readOptionalStringArray(record: UnknownRecord, field: string, label: string): readonly string[] {
  const value = record[field];
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    fail("builtins_contract", `${label}.${field} must be a string array.`, { field });
  }
  return Object.freeze([...value]);
}

function uniqueStrings(values: readonly string[], label: string): readonly string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) fail("builtins_contract", `${label} must be unique.`, { value });
    seen.add(value);
  }
  return values;
}

function manifestDl08(manifest: unknown): UnknownRecord {
  const manifestRecord = assertRecord(manifest, "manifest");
  const extensions = readRecordField(manifestRecord, "extensions", "manifest");
  return readRecordField(extensions, "dev.vibe-engineer.schematics.dl08", "manifest.extensions");
}

function inputProperties(dl08: UnknownRecord): UnknownRecord {
  const inputSchema = readRecordField(dl08, "inputSchema", "dl08");
  return readRecordField(inputSchema, "properties", "dl08.inputSchema");
}

function schemaPattern(properties: UnknownRecord, field: string): string {
  const schema = readRecordField(properties, field, "dl08.inputSchema.properties");
  return readStringField(schema, "pattern", `dl08.inputSchema.properties.${field}`);
}

export function regexpPatternForLiteral(value: string): string {
  return `^${value.replace(REGEXP_SPECIAL_CHARACTERS, "\\$&")}$`;
}

function assertExactPattern(properties: UnknownRecord, field: string, expectedValue: string): void {
  const actualPattern = schemaPattern(properties, field);
  const expectedPattern = regexpPatternForLiteral(expectedValue);
  if (actualPattern !== expectedPattern) {
    fail("builtins_contract", `Input ${field} must be constrained to the actual upstream contract value.`, {
      field,
      expectedPattern,
      actualPattern,
    });
  }
}

function presetManifestDefaults(api: TypeScriptPresetApiContract): Readonly<{
  packageManager: string;
  typecheckCommand: string;
}> {
  const rendered = api.renderTypeScriptPresetFiles();
  const validation = api.validateTypeScriptPresetFiles(rendered);
  if (validation.ok !== true) {
    fail("builtins_contract", "Actual TypeScript preset rendered files failed their validator.", {});
  }
  const manifestFile = rendered.find((file) => file.path === ".vibe/generated/typescript-preset/manifest.json");
  if (!manifestFile) fail("builtins_contract", "Actual TypeScript preset manifest output is required.", {});
  const parsed = JSON.parse(manifestFile.content) as unknown;
  const manifest = assertRecord(parsed, "typescriptPresetManifest");
  const pnpmDefaults = readRecordField(manifest, "pnpmDefaults", "typescriptPresetManifest");
  const testAndTypecheckDefaults = readRecordField(
    manifest,
    "testAndTypecheckDefaults",
    "typescriptPresetManifest",
  );
  return Object.freeze({
    packageManager: readStringField(pnpmDefaults, "packageManager", "typescriptPresetManifest.pnpmDefaults"),
    typecheckCommand: readStringField(
      testAndTypecheckDefaults,
      "typecheckCommand",
      "typescriptPresetManifest.testAndTypecheckDefaults",
    ),
  });
}

function assertInputSchemaConsumesActualContracts(
  dl08: UnknownRecord,
  standard: StandardContract,
  presetMetadata: TypeScriptPresetMetadataContract,
  presetDefaults: Readonly<{ packageManager: string; typecheckCommand: string }>,
): void {
  const properties = inputProperties(dl08);
  for (const field of REQUIRED_INPUT_CONTRACT_FIELDS) {
    readRecordField(properties, field, "dl08.inputSchema.properties");
  }
  assertExactPattern(properties, "standardId", standard.standardId);
  assertExactPattern(properties, "standardTitle", standard.title);
  assertExactPattern(properties, "standardSummary", standard.summary);
  assertExactPattern(properties, "presetId", presetMetadata.presetId);
  assertExactPattern(properties, "quickGateLabel", presetMetadata.quickGateLabel);
  assertExactPattern(properties, "packageManager", presetDefaults.packageManager);
  assertExactPattern(properties, "typecheckCommand", presetDefaults.typecheckCommand);
}

function joinManifestPath(templatesRoot: string, slug: BuiltInSchematicSlug): string {
  const trimmedRoot = templatesRoot.replace(/[\\/]+$/, "");
  if (trimmedRoot.length === 0) fail("builtins_contract", "templatesRoot must not be empty.", {});
  return `${trimmedRoot}/${slug}/manifest.json`;
}

export function createBuiltInSchematicCatalog(
  options: BuiltInSchematicCatalogOptions,
): readonly BuiltInSchematicCatalogEntry[] {
  const templatesRoot = assertNonEmptyString(options.templatesRoot, "templatesRoot");
  return Object.freeze(
    BUILTIN_SCHEMATIC_REGISTRY.map((entry) =>
      Object.freeze({
        slug: entry.slug,
        schematicId: entry.schematicId,
        manifestPath: joinManifestPath(templatesRoot, entry.slug),
      }),
    ),
  );
}

export async function readBuiltInSchematicManifests(
  options: BuiltInSchematicManifestReadOptions,
): Promise<readonly BuiltInSchematicManifestEntry[]> {
  const entries: BuiltInSchematicManifestEntry[] = [];
  for (const item of createBuiltInSchematicCatalog(options)) {
    const manifestText = await options.readTextFile(item.manifestPath);
    const manifest = JSON.parse(manifestText) as unknown;
    entries.push(Object.freeze({ ...item, manifest }));
  }
  return Object.freeze(entries);
}

export function normalizeBuiltInContractInput(input: unknown, apis: BuiltInContractApis): BuiltInContractInput {
  const record = assertRecord(input, "input");
  const standardId = readStringField(record, "standardId", "input");
  const standard = apis.standardsApi.loadStandard(standardId);
  const presetMetadata = apis.typescriptPresetApi.getTypeScriptPresetMetadata();
  const presetDefaults = presetManifestDefaults(apis.typescriptPresetApi);
  const expected: Readonly<Record<(typeof REQUIRED_INPUT_CONTRACT_FIELDS)[number], string>> = Object.freeze({
    standardId: standard.standardId,
    standardTitle: standard.title,
    standardSummary: standard.summary,
    presetId: presetMetadata.presetId,
    quickGateLabel: presetMetadata.quickGateLabel,
    packageManager: presetDefaults.packageManager,
    typecheckCommand: presetDefaults.typecheckCommand,
  });
  for (const [field, value] of Object.entries(expected)) {
    const supplied = record[field];
    if (supplied !== undefined && supplied !== value) {
      fail("builtins_contract", `Input ${field} does not match the actual upstream contract value.`, {
        field,
        expected: value,
        actual: supplied,
      });
    }
  }
  const normalized: Record<string, BuiltInContractInputValue> = {};
  for (const [field, value] of Object.entries(record)) {
    if (typeof value !== "string" && typeof value !== "boolean") {
      fail("builtins_contract", `Input ${field} must be a string or boolean before schematic execution.`, {
        field,
      });
    }
    normalized[field] = value;
  }
  for (const [field, value] of Object.entries(expected)) normalized[field] = value;
  return Object.freeze(normalized);
}

export function assertBuiltInContractSurfaces(
  entries: readonly BuiltInSchematicManifestEntry[],
  apis: BuiltInContractApis,
): BuiltInContractAssertionResult {
  if (!Array.isArray(entries) || entries.length !== BUILTIN_SCHEMATIC_IDS.length) {
    fail("builtins_contract", "Built-in entries must contain exactly the registered schematic set.", {
      count: entries.length,
    });
  }
  const presetMetadata = apis.typescriptPresetApi.getTypeScriptPresetMetadata();
  const presetDefaults = presetManifestDefaults(apis.typescriptPresetApi);
  const presetKinds = new Set(apis.typescriptPresetApi.getTypeScriptPresetFileManifest().map((entry) => entry.kind));
  const seen = new Set<string>();
  for (const entry of entries) {
    const manifest = assertRecord(entry.manifest, "manifest");
    const manifestSchematicId = readStringField(manifest, "schematicId", "manifest");
    if (manifestSchematicId !== entry.schematicId) {
      fail("builtins_contract", "Catalog schematic id must match manifest schematicId.", { slug: entry.slug });
    }
    if (seen.has(manifestSchematicId)) {
      fail("builtins_contract", "Built-in schematic ids must be unique.", { schematicId: manifestSchematicId });
    }
    seen.add(manifestSchematicId);
    const dl08 = manifestDl08(manifest);
    if (readStringField(dl08, "builtInId", "dl08") !== manifestSchematicId) {
      fail("builtins_contract", "DL-08 builtInId must match schematicId.", { slug: entry.slug });
    }
    const standardIds = uniqueStrings(readOptionalStringArray(dl08, "standardIds", "dl08"), `standardIds for ${entry.slug}`);
    const primaryStandardId = standardIds[0];
    if (primaryStandardId === undefined) {
      fail("builtins_contract", "Built-ins must declare at least one standard id.", { slug: entry.slug });
    }
    for (const standardId of standardIds) {
      const loaded = apis.standardsApi.loadStandard(standardId);
      if (loaded.standardId !== standardId) {
        fail("builtins_contract", "Standards API returned mismatched standard id.", { standardId });
      }
    }
    const primaryStandard = apis.standardsApi.loadStandard(primaryStandardId);
    assertInputSchemaConsumesActualContracts(dl08, primaryStandard, presetMetadata, presetDefaults);
    const typescriptPreset = readRecordField(dl08, "typescriptPreset", "dl08");
    if (readStringField(typescriptPreset, "presetId", "dl08.typescriptPreset") !== presetMetadata.presetId) {
      fail("builtins_contract", "Built-in TypeScript preset id must match actual preset metadata.", { slug: entry.slug });
    }
    const requiredFileKinds = readOptionalStringArray(typescriptPreset, "requiredFileKinds", "dl08.typescriptPreset");
    for (const kind of REQUIRED_TYPESCRIPT_PRESET_FILE_KINDS) {
      if (!requiredFileKinds.includes(kind)) {
        fail("builtins_contract", "Built-in must require the load-bearing TypeScript preset file kinds.", {
          slug: entry.slug,
          kind,
        });
      }
    }
    for (const kind of requiredFileKinds) {
      if (!presetKinds.has(kind)) {
        fail("builtins_contract", "Built-in references a TypeScript preset file kind not present in actual preset manifest.", {
          slug: entry.slug,
          kind,
        });
      }
    }
  }
  return Object.freeze({ ok: true, count: entries.length, schematicIds: Object.freeze([...seen].sort()) });
}
