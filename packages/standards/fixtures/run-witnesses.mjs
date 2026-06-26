import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDomainPurity } from '../../mechanical-gates/src/p0/domain-purity/index.js';
import * as standardsApi from '../src/index.js';

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(fixtureDir, '..');
const repoRoot = path.resolve(packageRoot, '../..');
const evidenceDir = process.env.I07C_EVIDENCE_DIR
  ? path.resolve(process.env.I07C_EVIDENCE_DIR)
  : path.join(repoRoot, '.vibe/work/I-07C-standards-package/evidence');

const expectedExports = Object.freeze([
  'STANDARD_ERROR_CODES',
  'STANDARD_IDS',
  'STANDARD_SCHEMA_FILES',
  'STANDARD_SCHEMA_IDS',
  'STANDARD_SCHEMA_KINDS',
  'STANDARDS_CATALOG',
  'SUPPORTED_SCHEMA_VERSION',
  'StandardsError',
  'getStandardsCatalog',
  'listStandards',
  'loadAllStandardsSchemas',
  'loadStandard',
  'loadStandardsSchema',
  'schemaPathForKind',
  'validateStandardDefinition',
  'validateStandardsCatalog'
]);

function assert(condition, message, detail = {}) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(packageRoot, relativePath), 'utf8'));
}

function expectErrorCode(result, code, label) {
  assert(result && result.ok === false, `${label} must fail closed.`, { result });
  assert(result.errors.some((error) => error.code === code), `${label} must include typed error code ${code}.`, { errors: result.errors });
  return result.errors;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertThrowsCode(fn, code, label) {
  try {
    fn();
  } catch (error) {
    assert(error instanceof standardsApi.StandardsError, `${label} must throw StandardsError.`, { errorName: error?.name });
    assert(error.code === code, `${label} must throw code ${code}.`, { actual: error.code });
    return { code: error.code, message: error.message, pointer: error.pointer, standardId: error.standardId };
  }
  throw new Error(`${label} must throw.`);
}

async function listSourceFiles(relativeDir) {
  const dir = path.join(packageRoot, relativeDir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) files.push(...await listSourceFiles(relative));
    if (entry.isFile() && relative.endsWith('.js')) files.push(relative);
  }
  return files.sort();
}

function extractImportSpecifiers(sourceText) {
  const imports = [];
  for (const rawLine of sourceText.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('import ')) continue;
    const marker = " from '";
    const markerIndex = line.indexOf(marker);
    if (markerIndex >= 0) {
      const start = markerIndex + marker.length;
      const end = line.indexOf("'", start);
      if (end > start) imports.push(line.slice(start, end));
      continue;
    }
    if (line.startsWith("import '") ) {
      const start = "import '".length;
      const end = line.indexOf("'", start);
      if (end > start) imports.push(line.slice(start, end));
    }
  }
  return imports;
}

async function assertNoPhantomSourceImports(packageJson) {
  const builtins = new Set(['node:fs', 'node:path', 'node:url']);
  const declared = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {})
  ]);
  const files = await listSourceFiles('src');
  const externalImports = [];
  for (const relative of files) {
    const text = await fs.readFile(path.join(packageRoot, relative), 'utf8');
    for (const specifier of extractImportSpecifiers(text)) {
      const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
      const isBuiltin = specifier.startsWith('node:') && builtins.has(specifier);
      if (!isRelative && !isBuiltin) externalImports.push({ file: relative, specifier });
      if (!isRelative && !isBuiltin && !declared.has(specifier)) {
        throw new Error(`Phantom source import ${specifier} in ${relative}.`);
      }
    }
  }
  assert(externalImports.length === 0, 'standards src must not import undeclared external modules.', { externalImports });
  return { files, externalImports };
}

async function assertDeclarationSurface() {
  const declarationText = await fs.readFile(path.join(packageRoot, 'src/index.d.ts'), 'utf8');
  for (const name of expectedExports) {
    assert(Object.hasOwn(standardsApi, name), `Runtime export missing ${name}.`);
    assert(declarationText.includes(name), `Declaration file missing ${name}.`);
  }
  for (const functionName of ['listStandards', 'loadStandard', 'getStandardsCatalog', 'validateStandardDefinition']) {
    assert(declarationText.includes(`function ${functionName}`), `Declaration function signature missing ${functionName}.`);
  }
  return { expectedExports, runtimeExportCount: Object.keys(standardsApi).length };
}

async function main() {
  await fs.mkdir(evidenceDir, { recursive: true });
  const evidence = {
    witness: 'I-07C standards package lane-owned real consumer',
    packageRoot,
    repoRoot,
    checks: {}
  };

  const packageJson = await readJson('package.json');
  assert(packageJson.private === true, 'standards package must remain private.');
  assert(!packageJson.dependencies || !Object.hasOwn(packageJson.dependencies, '@vibe-engineer/testing'), 'no production dependency on @vibe-engineer/testing.');
  assert(!packageJson.devDependencies || !Object.hasOwn(packageJson.devDependencies, '@vibe-engineer/testing'), 'no dependency on @vibe-engineer/testing.');
  for (const forbidden of ['@vibe-engineer/mechanical-gates', '@vibe-engineer/adapter-pi', '@vibe-engineer/cli', 'vibe-engineer']) {
    assert(!packageJson.dependencies || !Object.hasOwn(packageJson.dependencies, forbidden), `no production dependency on ${forbidden}.`);
  }
  evidence.checks.packageRegression = {
    private: packageJson.private,
    dependencies: packageJson.dependencies ?? {},
    devDependencies: packageJson.devDependencies ?? {}
  };

  evidence.checks.sourceImports = await assertNoPhantomSourceImports(packageJson);

  const declarationSurface = await assertDeclarationSurface();
  evidence.checks.declarations = declarationSurface;

  const schemas = standardsApi.loadAllStandardsSchemas();
  const definitionSchema = standardsApi.loadStandardsSchema('standard-definition');
  const catalogSchema = standardsApi.loadStandardsSchema('standards-catalog');
  assert(schemas['standard-definition'].$schema === 'https://json-schema.org/draft/2020-12/schema', 'definition schema must be JSON Schema 2020-12.');
  assert(schemas['standards-catalog'].$schema === 'https://json-schema.org/draft/2020-12/schema', 'catalog schema must be JSON Schema 2020-12.');
  assert(definitionSchema.$id === schemas['standard-definition'].$id, 'singular definition schema loader must match loadAllStandardsSchemas.');
  assert(catalogSchema.$id === schemas['standards-catalog'].$id, 'singular catalog schema loader must match loadAllStandardsSchemas.');
  evidence.checks.schemaRegistry = {
    kinds: standardsApi.STANDARD_SCHEMA_KINDS,
    definitionSchemaId: schemas['standard-definition'].$id,
    catalogSchemaId: schemas['standards-catalog'].$id,
    singularDefinitionSchemaId: definitionSchema.$id,
    singularCatalogSchemaId: catalogSchema.$id
  };

  const definitionProperties = schemas['standard-definition'].properties;
  const catalogProperties = schemas['standards-catalog'].properties;
  assert(definitionProperties.references.minItems === 1, 'definition schema references must be non-empty.');
  assert(definitionProperties.tags.minItems === 1, 'definition schema tags must be non-empty when present.');
  assert(definitionProperties.tags.uniqueItems === true, 'definition schema tags must be unique.');
  assert(definitionProperties.tags.items.pattern === '^[a-z0-9][a-z0-9-]*$', 'definition schema tags must be lowercase kebab identifiers.');
  assert(definitionProperties.appliesTo.minItems === 1, 'definition schema appliesTo must be non-empty.');
  assert(definitionProperties.appliesTo.uniqueItems === true, 'definition schema appliesTo must be unique.');
  assert(catalogProperties.standardIds.minItems === 1, 'catalog schema standardIds must be non-empty.');
  assert(catalogProperties.standardIds.uniqueItems === true, 'catalog schema standardIds must be unique.');
  assert(catalogProperties.standardIds.items.pattern === '^[a-z0-9][a-z0-9-]*$', 'catalog schema standardIds must be lowercase kebab identifiers.');
  evidence.checks.schemaRuntimeContract = {
    schemaConstraints: {
      referencesMinItems: definitionProperties.references.minItems,
      tagsMinItems: definitionProperties.tags.minItems,
      tagsUniqueItems: definitionProperties.tags.uniqueItems,
      tagsPattern: definitionProperties.tags.items.pattern,
      appliesToMinItems: definitionProperties.appliesTo.minItems,
      appliesToUniqueItems: definitionProperties.appliesTo.uniqueItems,
      standardIdsMinItems: catalogProperties.standardIds.minItems,
      standardIdsUniqueItems: catalogProperties.standardIds.uniqueItems,
      standardIdsPattern: catalogProperties.standardIds.items.pattern
    },
    runtimeNegatives: {}
  };

  const catalog = standardsApi.getStandardsCatalog();
  const ids = standardsApi.listStandards();
  assert(Array.isArray(ids) && ids.length > 0, 'listStandards must return at least one id.');
  assert(catalog.standardIds.length === ids.length, 'catalog ids and public ids must have the same length.');
  assert(ids.every((id) => catalog.standardIds.includes(id)), 'every public id must appear in catalog.standardIds.');
  const catalogValidation = standardsApi.validateStandardsCatalog(catalog);
  assert(catalogValidation.ok === true, 'embedded catalog must validate.');
  const loaded = [];
  for (const id of ids) {
    const standard = standardsApi.loadStandard(id);
    const validation = standardsApi.validateStandardDefinition(standard);
    assert(validation.ok === true, `loaded standard ${id} must validate.`, { validation });
    loaded.push({ id, category: standard.category, level: standard.level, neutrality: standard.neutrality });
  }
  evidence.checks.publicApiConsumer = { ids, loaded };

  const positiveStandard = await readJson('fixtures/positive/valid-standard.json');
  const positiveResult = standardsApi.validateStandardDefinition(positiveStandard);
  assert(positiveResult.ok === true, 'positive fixture must validate.');
  evidence.checks.positiveFixture = { ok: positiveResult.ok, standardId: positiveStandard.standardId };

  const missingId = standardsApi.validateStandardDefinition(await readJson('fixtures/negative/missing-standard-id.json'));
  expectErrorCode(missingId, standardsApi.STANDARD_ERROR_CODES.REQUIRED_FIELD, 'missing standardId fixture');
  const missingTitleCarrier = cloneJson(positiveStandard);
  delete missingTitleCarrier.title;
  const missingTitle = standardsApi.validateStandardDefinition(missingTitleCarrier);
  expectErrorCode(missingTitle, standardsApi.STANDARD_ERROR_CODES.REQUIRED_FIELD, 'missing required title field');
  const unknownId = standardsApi.validateStandardDefinition(await readJson('fixtures/negative/unknown-standard-id.json'));
  expectErrorCode(unknownId, standardsApi.STANDARD_ERROR_CODES.UNKNOWN_STANDARD_ID, 'unknown standardId fixture');
  const unknownField = standardsApi.validateStandardDefinition(await readJson('fixtures/negative/unknown-field.json'));
  expectErrorCode(unknownField, standardsApi.STANDARD_ERROR_CODES.UNKNOWN_FIELD, 'unknown field fixture');
  const unsupportedVersion = standardsApi.validateStandardDefinition(await readJson('fixtures/negative/unsupported-version.json'));
  expectErrorCode(unsupportedVersion, standardsApi.STANDARD_ERROR_CODES.UNSUPPORTED_SCHEMA_VERSION, 'unsupported version fixture');
  const malformedRequirements = standardsApi.validateStandardDefinition({ ...positiveStandard, requirements: [] });
  expectErrorCode(malformedRequirements, standardsApi.STANDARD_ERROR_CODES.MALFORMED_LIST, 'malformed requirements list');
  const duplicateCatalog = standardsApi.validateStandardsCatalog(await readJson('fixtures/negative/duplicate-catalog.json'));
  expectErrorCode(duplicateCatalog, standardsApi.STANDARD_ERROR_CODES.DUPLICATE_STANDARD_ID, 'duplicate catalog fixture');
  const malformedCatalog = standardsApi.validateStandardsCatalog({ ...catalog, standardIds: [] });
  expectErrorCode(malformedCatalog, standardsApi.STANDARD_ERROR_CODES.MALFORMED_LIST, 'malformed catalog standardIds');
  const catalogUnknownField = standardsApi.validateStandardsCatalog({ ...catalog, extraField: true });
  expectErrorCode(catalogUnknownField, standardsApi.STANDARD_ERROR_CODES.UNKNOWN_FIELD, 'catalog unknown field');

  const contractBase = standardsApi.loadStandard(standardsApi.listStandards()[0]);
  evidence.checks.schemaRuntimeContract.runtimeNegatives.referencesEmpty = expectErrorCode(
    standardsApi.validateStandardDefinition({ ...contractBase, references: [] }),
    standardsApi.STANDARD_ERROR_CODES.MALFORMED_LIST,
    'references empty array'
  );
  evidence.checks.schemaRuntimeContract.runtimeNegatives.tagsEmpty = expectErrorCode(
    standardsApi.validateStandardDefinition({ ...contractBase, tags: [] }),
    standardsApi.STANDARD_ERROR_CODES.MALFORMED_LIST,
    'tags empty array'
  );
  evidence.checks.schemaRuntimeContract.runtimeNegatives.tagsNonSlug = expectErrorCode(
    standardsApi.validateStandardDefinition({ ...contractBase, tags: ['Not A Slug'] }),
    standardsApi.STANDARD_ERROR_CODES.INVALID_VALUE,
    'tags non-slug value'
  );
  evidence.checks.schemaRuntimeContract.runtimeNegatives.tagsDuplicate = expectErrorCode(
    standardsApi.validateStandardDefinition({ ...contractBase, tags: ['duplicate-tag', 'duplicate-tag'] }),
    standardsApi.STANDARD_ERROR_CODES.MALFORMED_LIST,
    'duplicate tags'
  );
  evidence.checks.schemaRuntimeContract.runtimeNegatives.appliesToDuplicate = expectErrorCode(
    standardsApi.validateStandardDefinition({ ...contractBase, appliesTo: [contractBase.appliesTo[0], contractBase.appliesTo[0]] }),
    standardsApi.STANDARD_ERROR_CODES.MALFORMED_LIST,
    'duplicate appliesTo'
  );
  const duplicateCatalogCarrier = cloneJson(catalog);
  duplicateCatalogCarrier.standardIds = [catalog.standardIds[0], catalog.standardIds[0], ...catalog.standardIds.slice(2)];
  evidence.checks.schemaRuntimeContract.runtimeNegatives.standardIdsDuplicate = expectErrorCode(
    standardsApi.validateStandardsCatalog(duplicateCatalogCarrier),
    standardsApi.STANDARD_ERROR_CODES.DUPLICATE_STANDARD_ID,
    'duplicate standardIds'
  );

  const missingLoad = assertThrowsCode(
    () => standardsApi.loadStandard('does-not-exist'),
    standardsApi.STANDARD_ERROR_CODES.UNKNOWN_STANDARD_ID,
    'loadStandard unknown id'
  );
  evidence.checks.negativeFixtures = {
    missingId: missingId.errors,
    missingTitle: missingTitle.errors,
    unknownId: unknownId.errors,
    unknownField: unknownField.errors,
    unsupportedVersion: unsupportedVersion.errors,
    malformedRequirements: malformedRequirements.errors,
    duplicateCatalog: duplicateCatalog.errors,
    malformedCatalog: malformedCatalog.errors,
    catalogUnknownField: catalogUnknownField.errors,
    missingLoad
  };

  const corePurity = await validateDomainPurity(packageRoot, { policyPath: 'fixtures/domain/core-pass-policy.json' });
  assert(corePurity.ok === true, 'core standards source/schema/content surfaces must pass real domain purity.', { findings: corePurity.findings });
  const boundaryPurity = await validateDomainPurity(packageRoot, { policyPath: 'fixtures/domain/boundary-policy.json' });
  assert(boundaryPurity.ok === false, 'domain-leaking core fixture must fail real domain purity.');
  assert(boundaryPurity.findings.some((finding) => finding.ruleId === 'domain-purity.core-domain-leak' && finding.path === 'fixtures/domain/core-domain-leak.js'), 'core leak finding must be typed and path-specific.', { findings: boundaryPurity.findings });
  assert(!boundaryPurity.findings.some((finding) => finding.path === 'fixtures/domain/sample-demo-allowed.js'), 'sample-demo surface with same terms must not emit a blocking finding.', { findings: boundaryPurity.findings });
  evidence.checks.domainPurity = {
    core: { ok: corePurity.ok, findings: corePurity.findings, evidence: corePurity.evidence },
    boundary: { ok: boundaryPurity.ok, findings: boundaryPurity.findings, evidence: boundaryPurity.evidence }
  };

  const evidencePath = path.join(evidenceDir, 'standards-witness-result.json');
  await fs.writeFile(evidencePath, `${JSON.stringify({ ok: true, ...evidence }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: true, evidencePath, standardCount: ids.length }, null, 2));
}

main().catch(async (error) => {
  await fs.mkdir(evidenceDir, { recursive: true });
  const evidencePath = path.join(evidenceDir, 'standards-witness-result.json');
  const payload = {
    ok: false,
    error: {
      name: error?.name ?? 'Error',
      message: error?.message ?? String(error),
      detail: error?.detail ?? null,
      stack: error?.stack ?? null
    }
  };
  await fs.writeFile(evidencePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.error(JSON.stringify({ ok: false, evidencePath, error: payload.error }, null, 2));
  process.exitCode = 1;
});
