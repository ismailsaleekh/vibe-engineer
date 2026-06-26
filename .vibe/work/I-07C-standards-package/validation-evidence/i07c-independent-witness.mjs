import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const validationEvidenceDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(validationEvidenceDir, '../../../..');
const packageRoot = path.join(repoRoot, 'packages/standards');
const standardsApi = await import(pathToFileURL(path.join(packageRoot, 'src/index.js')).href);
const { validateDomainPurity } = await import(pathToFileURL(path.join(repoRoot, 'packages/mechanical-gates/src/p0/domain-purity/index.js')).href);

const checks = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, message, detail = {}) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
}

async function readJson(absolutePath) {
  return JSON.parse(await fs.readFile(absolutePath, 'utf8'));
}

async function record(name, fn) {
  try {
    const evidence = await fn();
    checks.push({ name, ok: true, evidence });
  } catch (error) {
    checks.push({
      name,
      ok: false,
      error: {
        name: error?.name ?? 'Error',
        message: error?.message ?? String(error),
        detail: error?.detail ?? null,
        stack: error?.stack ?? null
      }
    });
  }
}

function typedErrors(errors) {
  return Array.isArray(errors) && errors.every((error) => (
    error && typeof error.code === 'string' && error.code.length > 0
    && typeof error.pointer === 'string'
    && typeof error.message === 'string' && error.message.length > 0
    && Object.hasOwn(error, 'standardId')
  ));
}

function expectResultCode(result, code, label) {
  assert(result && result.ok === false, `${label} must fail closed.`, { result });
  assert(typedErrors(result.errors), `${label} must return typed errors.`, { errors: result.errors });
  assert(result.errors.some((error) => error.code === code), `${label} must include ${code}.`, { errors: result.errors });
  return result.errors;
}

function expectThrowsCode(fn, code, label) {
  try {
    fn();
  } catch (error) {
    assert(error instanceof standardsApi.StandardsError, `${label} must throw StandardsError.`, { errorName: error?.name });
    assert(error.code === code, `${label} must throw ${code}.`, { actual: error.code });
    return { code: error.code, pointer: error.pointer, standardId: error.standardId, message: error.message };
  }
  throw new Error(`${label} must throw.`);
}

async function listFiles(relativeDir, suffixes) {
  const absoluteDir = path.join(packageRoot, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(relative, suffixes));
    if (entry.isFile() && suffixes.some((suffix) => relative.endsWith(suffix))) files.push(relative);
  }
  return files.sort();
}

function importSpecifiers(sourceText) {
  const specifiers = [];
  const pattern = /(?:^|\n)\s*import(?:\s+[\s\S]*?\s+from\s+|\s*)['"]([^'"]+)['"]/g;
  let match;
  while ((match = pattern.exec(sourceText)) !== null) specifiers.push(match[1]);
  return specifiers;
}

function sorted(value) {
  return [...value].sort();
}

await record('manifest and source dependency hygiene', async () => {
  const packageJson = await readJson(path.join(packageRoot, 'package.json'));
  assert(packageJson.name === '@vibe-engineer/standards', 'package name must remain @vibe-engineer/standards.', { name: packageJson.name });
  assert(packageJson.private === true, 'standards package must remain private/non-publishable.', { private: packageJson.private });
  const dependencyFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  const declared = new Set();
  for (const field of dependencyFields) for (const dep of Object.keys(packageJson[field] ?? {})) declared.add(dep);
  assert(!declared.has('@vibe-engineer/testing'), 'standards must not depend on @vibe-engineer/testing.', { declared: sorted(declared) });
  for (const forbidden of ['@vibe-engineer/mechanical-gates', '@vibe-engineer/cli', 'vibe-engineer', '@vibe-engineer/adapter-pi']) {
    assert(!(packageJson.dependencies && Object.hasOwn(packageJson.dependencies, forbidden)), `standards must not have production dependency on ${forbidden}.`);
  }

  const srcFiles = await listFiles('src', ['.js']);
  const builtins = new Set(['node:fs', 'node:path', 'node:url']);
  const imports = [];
  const externalImports = [];
  for (const relative of srcFiles) {
    const text = await fs.readFile(path.join(packageRoot, relative), 'utf8');
    for (const specifier of importSpecifiers(text)) {
      imports.push({ file: relative, specifier });
      const relativeImport = specifier.startsWith('./') || specifier.startsWith('../');
      const builtinImport = specifier.startsWith('node:') && builtins.has(specifier);
      if (!relativeImport && !builtinImport) externalImports.push({ file: relative, specifier, declared: declared.has(specifier) });
      if (!relativeImport && !builtinImport) assert(declared.has(specifier), 'external source import must be declared in package.json.', { file: relative, specifier, declared: sorted(declared) });
    }
  }
  return { private: packageJson.private, declared: sorted(declared), srcFiles, imports, externalImports };
});

await record('runtime exports and declaration value surface match', async () => {
  const runtimeExports = Object.keys(standardsApi).sort();
  const declarationText = await fs.readFile(path.join(packageRoot, 'src/index.d.ts'), 'utf8');
  const declarationValueExports = [...declarationText.matchAll(/export\s+(?:declare\s+)?(?:const|function|class)\s+([A-Za-z_$][\w$]*)/g)].map((match) => match[1]).sort();
  assert(JSON.stringify(runtimeExports) === JSON.stringify(declarationValueExports), 'runtime value exports must exactly match index.d.ts value exports.', { runtimeExports, declarationValueExports });
  for (const required of ['listStandards', 'loadStandard', 'getStandardsCatalog', 'validateStandardDefinition', 'STANDARD_IDS', 'STANDARDS_CATALOG', 'STANDARD_ERROR_CODES']) {
    assert(runtimeExports.includes(required), `required public export missing: ${required}.`, { runtimeExports });
  }
  return { runtimeExports, declarationValueExports };
});

await record('positive real public API consumer', async () => {
  const ids = standardsApi.listStandards();
  const catalog = standardsApi.getStandardsCatalog();
  assert(Object.isFrozen(ids), 'listStandards result must be frozen to protect caller mutation.', { idsFrozen: Object.isFrozen(ids) });
  assert(Array.isArray(ids) && ids.length > 0, 'listStandards must return non-empty ids.', { ids });
  assert(new Set(ids).size === ids.length, 'STANDARD_IDS/listStandards must be unique.', { ids });
  assert(JSON.stringify(ids) === JSON.stringify(catalog.standardIds), 'catalog.standardIds must match listStandards order.', { ids, catalogIds: catalog.standardIds });
  const catalogValidation = standardsApi.validateStandardsCatalog(catalog);
  assert(catalogValidation.ok === true, 'getStandardsCatalog output must validate.', { catalogValidation });
  const loaded = [];
  for (const id of ids) {
    const standard = standardsApi.loadStandard(id);
    const validation = standardsApi.validateStandardDefinition(standard);
    assert(validation.ok === true, `loadStandard(${id}) output must validate.`, { validation });
    assert(standard.standardId === id, `loaded standard id must match ${id}.`, { standard });
    loaded.push({ id, category: standard.category, level: standard.level, neutrality: standard.neutrality, requirementCount: standard.requirements.length });
  }
  const cloneProbe = standardsApi.loadStandard(ids[0]);
  cloneProbe.title = 'mutated by validation probe';
  assert(standardsApi.loadStandard(ids[0]).title !== cloneProbe.title, 'loadStandard must return defensive clones.', { id: ids[0] });
  return { ids, loaded, catalogId: catalog.catalogId };
});

await record('negative fail-closed typed validator cases', async () => {
  const ids = standardsApi.listStandards();
  const base = standardsApi.loadStandard(ids[0]);
  const catalog = standardsApi.getStandardsCatalog();
  const codes = standardsApi.STANDARD_ERROR_CODES;
  const cases = {};

  cases.loadUnknown = expectThrowsCode(() => standardsApi.loadStandard('does-not-exist'), codes.UNKNOWN_STANDARD_ID, 'loadStandard unknown id');
  cases.loadMissing = expectThrowsCode(() => standardsApi.loadStandard(''), codes.INVALID_STANDARD_ID, 'loadStandard missing id');

  const missingId = clone(base);
  delete missingId.standardId;
  cases.missingStandardId = expectResultCode(standardsApi.validateStandardDefinition(missingId), codes.REQUIRED_FIELD, 'missing standardId');

  const missingTitle = clone(base);
  delete missingTitle.title;
  cases.missingRequiredField = expectResultCode(standardsApi.validateStandardDefinition(missingTitle), codes.REQUIRED_FIELD, 'missing title');

  cases.unknownStandardId = expectResultCode(standardsApi.validateStandardDefinition({ ...clone(base), standardId: 'unknown-standard' }), codes.UNKNOWN_STANDARD_ID, 'unknown standardId');
  cases.unknownField = expectResultCode(standardsApi.validateStandardDefinition({ ...clone(base), extraField: true }), codes.UNKNOWN_FIELD, 'unknown field');
  cases.unsupportedVersion = expectResultCode(standardsApi.validateStandardDefinition({ ...clone(base), schemaVersion: '9.0.0' }), codes.UNSUPPORTED_SCHEMA_VERSION, 'unsupported schemaVersion');
  cases.malformedAppliesTo = expectResultCode(standardsApi.validateStandardDefinition({ ...clone(base), appliesTo: [] }), codes.MALFORMED_LIST, 'empty appliesTo');
  cases.malformedRequirements = expectResultCode(standardsApi.validateStandardDefinition({ ...clone(base), requirements: [] }), codes.MALFORMED_LIST, 'empty requirements');
  cases.malformedReferences = expectResultCode(standardsApi.validateStandardDefinition({ ...clone(base), references: [] }), codes.MALFORMED_LIST, 'empty references');

  const malformedCatalog = clone(catalog);
  malformedCatalog.standardIds = 'not-a-list';
  cases.malformedCatalog = expectResultCode(standardsApi.validateStandardsCatalog(malformedCatalog), codes.MALFORMED_LIST, 'malformed catalog standardIds');

  const duplicateCatalog = clone(catalog);
  duplicateCatalog.standardIds[1] = duplicateCatalog.standardIds[0];
  cases.duplicateCatalogId = expectResultCode(standardsApi.validateStandardsCatalog(duplicateCatalog), codes.DUPLICATE_STANDARD_ID, 'duplicate catalog id');

  const catalogUnknownField = clone(catalog);
  catalogUnknownField.extraField = true;
  cases.catalogUnknownField = expectResultCode(standardsApi.validateStandardsCatalog(catalogUnknownField), codes.UNKNOWN_FIELD, 'catalog unknown field');

  return cases;
});

await record('JSON Schema 2020-12 and runtime/schema contract consistency', async () => {
  const definitionSchema = await readJson(path.join(packageRoot, 'schemas/standard-definition.schema.json'));
  const catalogSchema = await readJson(path.join(packageRoot, 'schemas/standards-catalog.schema.json'));
  assert(definitionSchema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'standard definition schema must be JSON Schema 2020-12.', { schema: definitionSchema.$schema });
  assert(catalogSchema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'catalog schema must be JSON Schema 2020-12.', { schema: catalogSchema.$schema });
  assert(definitionSchema.additionalProperties === false, 'definition schema root must disallow unknown fields.');
  assert(definitionSchema.properties.requirements.items.additionalProperties === false, 'requirement schema must disallow unknown fields.');
  assert(definitionSchema.properties.references.items.additionalProperties === false, 'reference schema must disallow unknown fields.');
  assert(catalogSchema.additionalProperties === false, 'catalog schema root must disallow unknown fields.');

  const ids = standardsApi.listStandards();
  const base = standardsApi.loadStandard(ids[0]);
  const catalog = standardsApi.getStandardsCatalog();
  assert(standardsApi.validateStandardDefinition(base).ok === true, 'canonical loaded standard must satisfy runtime validator.');
  assert(standardsApi.validateStandardsCatalog(catalog).ok === true, 'canonical catalog must satisfy runtime validator.');

  for (const standard of catalog.standards) {
    assert(definitionSchema.required.every((field) => Object.hasOwn(standard, field)), 'canonical standard must contain every schema-required field.', { standardId: standard.standardId });
    assert(definitionSchema.properties.category.enum.includes(standard.category), 'canonical standard category must be in schema enum.', { standardId: standard.standardId, category: standard.category });
    assert(definitionSchema.properties.level.enum.includes(standard.level), 'canonical standard level must be in schema enum.', { standardId: standard.standardId, level: standard.level });
    assert(definitionSchema.properties.neutrality.enum.includes(standard.neutrality), 'canonical standard neutrality must be in schema enum.', { standardId: standard.standardId, neutrality: standard.neutrality });
    for (const surface of standard.appliesTo) {
      assert(definitionSchema.properties.appliesTo.items.enum.includes(surface), 'canonical appliesTo entry must be in schema enum.', { standardId: standard.standardId, surface });
    }
  }

  function runtimeDefinitionOutcome(value) {
    const result = standardsApi.validateStandardDefinition(value);
    return result.ok ? { ok: true, errors: [] } : { ok: false, errors: clone(result.errors) };
  }
  function runtimeCatalogOutcome(value) {
    const result = standardsApi.validateStandardsCatalog(value);
    return result.ok ? { ok: true, errors: [] } : { ok: false, errors: clone(result.errors) };
  }

  const divergences = [];
  const emptyReferencesRuntime = runtimeDefinitionOutcome({ ...clone(base), references: [] });
  if (definitionSchema.properties.references.minItems !== 1 && emptyReferencesRuntime.ok === false) {
    divergences.push({
      label: 'definition.references empty array',
      schemaConstraint: { minItems: definitionSchema.properties.references.minItems ?? null, schemaAllowsEmptyArray: true },
      runtime: emptyReferencesRuntime
    });
  }

  const emptyTagsRuntime = runtimeDefinitionOutcome({ ...clone(base), tags: [] });
  if (definitionSchema.properties.tags.minItems !== 1 && emptyTagsRuntime.ok === false) {
    divergences.push({
      label: 'definition.tags empty array',
      schemaConstraint: { minItems: definitionSchema.properties.tags.minItems ?? null, schemaAllowsEmptyArray: true },
      runtime: emptyTagsRuntime
    });
  }

  const tagPattern = definitionSchema.properties.tags.items.pattern;
  const nonSlugTagRuntime = runtimeDefinitionOutcome({ ...clone(base), tags: ['Not A Slug'] });
  const schemaRejectsNonSlugTag = typeof tagPattern === 'string' && !(new RegExp(tagPattern).test('Not A Slug'));
  if (schemaRejectsNonSlugTag && nonSlugTagRuntime.ok === true) {
    divergences.push({
      label: 'definition.tags non-slug value',
      schemaConstraint: { pattern: tagPattern, schemaRejectsNonSlugTag },
      runtime: nonSlugTagRuntime
    });
  }

  const duplicateCatalog = clone(catalog);
  duplicateCatalog.standardIds[1] = duplicateCatalog.standardIds[0];
  const duplicateCatalogRuntime = runtimeCatalogOutcome(duplicateCatalog);
  if (catalogSchema.properties.standardIds.uniqueItems !== true && duplicateCatalogRuntime.ok === false) {
    divergences.push({
      label: 'catalog duplicate standardIds',
      schemaConstraint: { uniqueItems: catalogSchema.properties.standardIds.uniqueItems ?? null, schemaAllowsDuplicates: true },
      runtime: duplicateCatalogRuntime
    });
  }

  assert(divergences.length === 0, 'JSON Schema and runtime validator disagree on standard/catalog contract cases.', { divergences });
  return { definitionSchemaId: definitionSchema.$id, catalogSchemaId: catalogSchema.$id, divergences };
});

await record('real I-10B domain-purity boundary', async () => {
  const core = await validateDomainPurity(repoRoot, { policyPath: '.vibe/work/I-07C-standards-package/validation-evidence/core-domain-policy.json' });
  assert(core.ok === true, 'standards core source/schema/package surfaces must pass real domain-purity validator.', { findings: core.findings, evidence: core.evidence });
  const boundary = await validateDomainPurity(repoRoot, { policyPath: '.vibe/work/I-07C-standards-package/validation-evidence/boundary-domain-policy.json' });
  assert(boundary.ok === false, 'domain-specific validation fixture classified core must fail real domain-purity validator.', { findings: boundary.findings });
  assert(boundary.findings.some((finding) => finding.ruleId === 'domain-purity.core-domain-leak' && finding.path.endsWith('domain-core-leak.js')), 'core leak must produce typed path-specific domain-purity.core-domain-leak finding.', { findings: boundary.findings });
  assert(!boundary.findings.some((finding) => finding.path.endsWith('domain-sample-demo.js')), 'same terms in sample-demo validation fixture must not weaken/fail the boundary.', { findings: boundary.findings });
  return { core: { ok: core.ok, findings: core.findings, evidence: core.evidence }, boundary: { ok: boundary.ok, findings: boundary.findings, evidence: boundary.evidence } };
});

const ok = checks.every((check) => check.ok);
const payload = {
  ok,
  generatedAt: new Date().toISOString(),
  repoRoot,
  packageRoot,
  checks
};
const resultPath = path.join(validationEvidenceDir, 'independent-witness-result.json');
await fs.writeFile(resultPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok, resultPath, failedChecks: checks.filter((check) => !check.ok).map((check) => check.name) }, null, 2));
if (!ok) process.exitCode = 1;
