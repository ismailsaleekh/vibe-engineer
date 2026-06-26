#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = process.argv[2] ?? process.cwd();
const evidenceRoot = process.argv[3] ?? path.join(repo, '.vibe/work/TS-ROOT-build-export-contract/validation-fix-evidence');
const negativeRoot = path.join(evidenceRoot, 'negative-fixtures');
const resultPath = path.join(evidenceRoot, 'structured-contract-witness-result.json');
fs.mkdirSync(negativeRoot, { recursive: true });

const requiredTrueFlags = [
  'strict',
  'noImplicitAny',
  'strictNullChecks',
  'strictFunctionTypes',
  'strictBindCallApply',
  'strictPropertyInitialization',
  'noImplicitThis',
  'alwaysStrict',
  'exactOptionalPropertyTypes',
  'noUncheckedIndexedAccess',
  'noImplicitOverride',
  'noImplicitReturns',
  'noPropertyAccessFromIndexSignature',
  'useUnknownInCatchVariables',
  'noFallthroughCasesInSwitch',
  'noUnusedLocals',
  'noUnusedParameters',
  'isolatedModules',
  'verbatimModuleSyntax',
  'forceConsistentCasingInFileNames',
  'resolveJsonModule',
  'declaration',
  'declarationMap',
  'sourceMap',
  'noEmitOnError',
];
const requiredFalseFlags = ['allowUnreachableCode', 'allowUnusedLabels', 'skipLibCheck'];
const expectedExceptionIds = [
  'workspace-surface-witness-evidence-only',
  'audited-production-js-mjs-migration-debt',
  'ts09v-verification-source-js-export-deferred',
  'transient-build-outputs-ts-root-evidence-only',
];
const auditedProductionJsDebt = [
  'packages/artifacts/src/errors.js',
  'packages/artifacts/src/index.js',
  'packages/artifacts/src/schema-registry.js',
  'packages/artifacts/src/validation.js',
  'packages/config/src/index.js',
  'packages/cli/src/entry/vibe-engineer.js',
  'packages/cli/src/envelope/result-envelope.js',
  'packages/cli/src/command-loader/loader.js',
  'packages/cli/src/errors/codes.js',
  'packages/cli/src/errors/sanitization.js',
  'packages/cli/src/commands/doctor/index.js',
  'packages/cli/src/commands/config/index.js',
  'packages/cli/src/commands/schematic/artifacts-adapter.js',
  'packages/cli/src/commands/schematic/index.js',
  'packages/context/src/index.js',
  'packages/registry/src/index.js',
  'packages/mechanical-gates/src/aggregate/index.js',
  'packages/mechanical-gates/src/aggregate/run-p0-aggregate.js',
  'packages/mechanical-gates/src/p0/allowlist/index.js',
  'packages/mechanical-gates/src/p0/allowlist/validate-escape-allowlist.js',
  'packages/mechanical-gates/src/p0/boundaries/contracts.js',
  'packages/mechanical-gates/src/p0/boundaries/index.js',
  'packages/mechanical-gates/src/p0/boundaries/validate-package-boundaries.js',
  'packages/mechanical-gates/src/p0/config-guards/index.js',
  'packages/mechanical-gates/src/p0/config-guards/validate-strict-config.js',
  'packages/mechanical-gates/src/p0/domain-purity/index.js',
  'packages/mechanical-gates/src/p0/domain-purity/validate-domain-purity.js',
  'packages/mechanical-gates/src/p0/governed-surface/index.js',
  'packages/mechanical-gates/src/p0/governed-surface/validate-governed-surface.js',
  'packages/mechanical-gates/src/p0/testing-boundary/index.js',
  'packages/mechanical-gates/src/p0/testing-boundary/validate-testing-boundary.js',
  'packages/schematics/src/engine/index.js',
  'packages/schematics/src/engine/markers.js',
  'packages/schematics/src/manifest/loader.js',
  'packages/schematics/src/template/input.js',
  'packages/schematics/src/template/path-safety.js',
  'packages/schematics/src/template/renderer.js',
  'packages/standards/src/catalog-data.js',
  'packages/standards/src/errors.js',
  'packages/standards/src/index.js',
  'packages/standards/src/schema-registry.js',
  'packages/standards/src/validation.js',
  'packages/testing/src/index.js',
];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(repo, rel), 'utf8'));
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function pointerEscape(segment) {
  return String(segment).replaceAll('~', '~0').replaceAll('/', '~1');
}
function collectRequirementsKeys(value, currentPath = []) {
  const hits = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => hits.push(...collectRequirementsKeys(item, [...currentPath, index])));
    return hits;
  }
  if (isObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      const next = [...currentPath, key];
      if (key === 'requirements') hits.push(`/${next.map(pointerEscape).join('/')}`);
      hits.push(...collectRequirementsKeys(item, next));
    }
  }
  return hits;
}
function collectObjectSchemasWithoutAdditionalFalse(value, currentPath = []) {
  const hits = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => hits.push(...collectObjectSchemasWithoutAdditionalFalse(item, [...currentPath, index])));
    return hits;
  }
  if (isObject(value)) {
    if (value.type === 'object' && value.additionalProperties !== false) hits.push(`/${currentPath.map(pointerEscape).join('/')}`);
    for (const [key, item] of Object.entries(value)) hits.push(...collectObjectSchemasWithoutAdditionalFalse(item, [...currentPath, key]));
  }
  return hits;
}
function validateWithPython(schemaPath, instancePath) {
  const code = `import json, sys\nfrom jsonschema import Draft202012Validator\nschema=json.load(open(sys.argv[1]))\ninstance=json.load(open(sys.argv[2]))\nDraft202012Validator.check_schema(schema)\nerrors=sorted(Draft202012Validator(schema).iter_errors(instance), key=lambda e: list(e.path))\nif errors:\n    print(json.dumps([{'path': list(e.path), 'message': e.message, 'schemaPath': list(e.schema_path)} for e in errors], indent=2))\n    sys.exit(1)\nprint('VALID')\n`;
  const proc = spawnSync('python3', ['-c', code, schemaPath, instancePath], { cwd: repo, encoding: 'utf8' });
  return { exitCode: proc.status, stdout: proc.stdout, stderr: proc.stderr };
}
function fail(code, message, details = {}) {
  return { code, message, details };
}
function validateRootPackage(rootPackage, contract) {
  const issues = [];
  for (const task of ['build', 'typecheck', 'test']) {
    const expected = contract.rootScripts?.[task]?.command;
    if (rootPackage.scripts?.[task] !== expected) issues.push(fail('ROOT_SCRIPT_CONTRACT_MISMATCH', `${task} script must match contract`, { actual: rootPackage.scripts?.[task], expected }));
  }
  for (const preserved of ['workspace:graph', 'workspace:surface']) {
    if (typeof rootPackage.scripts?.[preserved] !== 'string' || rootPackage.scripts[preserved].length === 0) issues.push(fail('ROOT_PRESERVED_SCRIPT_MISSING', `${preserved} must remain present`));
  }
  return issues;
}
function validateTurbo(turbo, contract) {
  const issues = [];
  const taskNames = Object.keys(turbo.tasks ?? {}).sort();
  if (JSON.stringify(taskNames) !== JSON.stringify(['build', 'test', 'typecheck'])) issues.push(fail('TURBO_TASK_SET_MISMATCH', 'Turbo tasks must be exactly build/typecheck/test', { taskNames }));
  for (const task of ['build', 'typecheck', 'test']) {
    const actual = turbo.tasks?.[task];
    const expected = contract.turboTasks?.[task];
    if (!isObject(actual) || !isObject(expected)) {
      issues.push(fail('TURBO_TASK_MISSING', `${task} task missing`));
      continue;
    }
    if (JSON.stringify(actual.dependsOn ?? []) !== JSON.stringify(expected.dependsOn ?? [])) issues.push(fail('TURBO_DEPENDS_MISMATCH', `${task}.dependsOn mismatch`, { actual: actual.dependsOn, expected: expected.dependsOn }));
    if (JSON.stringify(actual.outputs ?? []) !== JSON.stringify(expected.outputs ?? [])) issues.push(fail('TURBO_OUTPUTS_MISMATCH', `${task}.outputs mismatch`, { actual: actual.outputs, expected: expected.outputs }));
  }
  return issues;
}
function validateTsconfig(tsconfig) {
  const issues = [];
  const options = tsconfig.compilerOptions ?? {};
  for (const flag of requiredTrueFlags) if (options[flag] !== true) issues.push(fail('STRICT_FLAG_NOT_TRUE', `${flag} must be true`, { actual: options[flag] }));
  for (const flag of requiredFalseFlags) if (options[flag] !== false) issues.push(fail('STRICT_FLAG_NOT_FALSE', `${flag} must be false`, { actual: options[flag] }));
  if (options.allowJs === true) issues.push(fail('ALLOW_JS_ENABLED', 'allowJs must not be true'));
  return issues;
}
function valuePointsToSourceJs(value) {
  if (typeof value === 'string') {
    const normalized = value.replaceAll('\\', '/');
    const parts = normalized.split('/');
    const last = parts.at(-1) ?? '';
    return parts.includes('src') && (last.endsWith('.js') || last.endsWith('.mjs') || last.endsWith('.cjs'));
  }
  if (Array.isArray(value)) return value.some(valuePointsToSourceJs);
  if (isObject(value)) return Object.values(value).some(valuePointsToSourceJs);
  return false;
}
function validatePackageFinalState(pkg) {
  const issues = [];
  if (valuePointsToSourceJs(pkg.exports)) issues.push(fail('PACKAGE_EXPORT_SOURCE_JS_FINAL_STATE', 'exports point to source JS/MJS/CJS as final state'));
  if (valuePointsToSourceJs(pkg.bin)) issues.push(fail('PACKAGE_BIN_SOURCE_JS_FINAL_STATE', 'bin points to source JS/MJS/CJS as final state'));
  return issues;
}
function writeFixtures(base) {
  const fixtures = [];
  const addContractFixture = (name, mutate) => {
    const c = clone(base.contract);
    mutate(c);
    const file = path.join(negativeRoot, `${name}.contract.json`);
    writeJson(file, c);
    fixtures.push({ name, file, kind: 'schema-contract' });
  };
  addContractFixture('missing-exception-classes', (c) => { delete c.exceptionClasses; });
  addContractFixture('preserved-only-workspace-graph', (c) => { c.rootScripts.preserved = ['workspace:graph']; });
  addContractFixture('ts09v-missing-i09s', (c) => { c.ts09vDeferral.requiredIndependentPasses = ['I-09A']; });
  addContractFixture('freeform-requirements-only-policies', (c) => {
    c.packageTsconfigConvention = { requirements: ['freeform prose is not load-bearing'] };
    c.packageExportConvention = { requirements: ['freeform prose is not load-bearing'] };
    c.generatedDistPolicy = { requirements: ['freeform prose is not load-bearing'] };
  });
  addContractFixture('source-js-export-bin-final-allowed', (c) => {
    c.packageExportConvention.runtimeExports.sourceJsAllowedFinalState = true;
    c.packageExportConvention.binEntries.sourceJsAllowedFinalState = true;
  });
  addContractFixture('audited-production-js-final-allowlist', (c) => {
    c.exceptionClasses[1].finalAllowlist = true;
    c.sourceJsDebtPolicy.productionJsIsDebt = false;
    c.packageExportConvention.currentSourceJsDebt.finalAllowlist = true;
  });
  addContractFixture('weakened-strict-contract', (c) => { c.strictCompilerOptions.requiredTrue = c.strictCompilerOptions.requiredTrue.filter((flag) => flag !== 'strict'); });

  const weakTsconfig = clone(base.tsconfig);
  weakTsconfig.compilerOptions.strict = false;
  const weakTsconfigFile = path.join(negativeRoot, 'weakened-strict-tsconfig.json');
  writeJson(weakTsconfigFile, weakTsconfig);
  fixtures.push({ name: 'weakened-strict-tsconfig', file: weakTsconfigFile, kind: 'tsconfig' });

  const allowJsTsconfig = clone(base.tsconfig);
  allowJsTsconfig.compilerOptions.allowJs = true;
  const allowJsFile = path.join(negativeRoot, 'allow-js-tsconfig.json');
  writeJson(allowJsFile, allowJsTsconfig);
  fixtures.push({ name: 'allow-js-tsconfig', file: allowJsFile, kind: 'tsconfig' });

  const sourceJsPkg = { name: '@fixture/source-js-final-state', type: 'module', exports: { '.': './src/index.js' }, bin: { fixture: './src/index.js' } };
  const sourceJsPkgFile = path.join(negativeRoot, 'source-js-export-bin.package.json');
  writeJson(sourceJsPkgFile, sourceJsPkg);
  fixtures.push({ name: 'source-js-export-bin-package-final-state', file: sourceJsPkgFile, kind: 'package-final-state' });
  return fixtures;
}

const files = {
  schema: 'packages/mechanical-gates/src/p0/build-export-contract/build-export-contract.schema.json',
  contract: 'packages/mechanical-gates/src/p0/build-export-contract/build-export-contract.json',
  rootPackage: 'package.json',
  turbo: 'turbo.json',
  tsconfig: 'tsconfig.base.json',
  verificationPackage: 'packages/verification/package.json',
};
const base = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, readJson(rel)]));
const schemaPath = path.join(repo, files.schema);
const contractPath = path.join(repo, files.contract);
const actualSchemaValidation = validateWithPython(schemaPath, contractPath);
const actualIssues = [];
if (actualSchemaValidation.exitCode !== 0) actualIssues.push(fail('ACTUAL_CONTRACT_SCHEMA_VALIDATION_FAILED', 'actual contract must validate against JSON Schema 2020-12', actualSchemaValidation));
if (base.schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') actualIssues.push(fail('SCHEMA_DRAFT_MISMATCH', 'schema must declare JSON Schema 2020-12'));
if (base.schema.additionalProperties !== false) actualIssues.push(fail('SCHEMA_TOP_LEVEL_NOT_CLOSED', 'schema top-level additionalProperties must be false'));
const openObjectSchemas = collectObjectSchemasWithoutAdditionalFalse(base.schema);
if (openObjectSchemas.length > 0) actualIssues.push(fail('SCHEMA_OBJECT_NOT_FAIL_CLOSED', 'all object schemas must set additionalProperties false', { openObjectSchemas }));
actualIssues.push(...validateRootPackage(base.rootPackage, base.contract));
actualIssues.push(...validateTurbo(base.turbo, base.contract));
actualIssues.push(...validateTsconfig(base.tsconfig));
const requirementsHits = [
  ...collectRequirementsKeys(base.contract.packageTsconfigConvention, ['packageTsconfigConvention']),
  ...collectRequirementsKeys(base.contract.packageExportConvention, ['packageExportConvention']),
  ...collectRequirementsKeys(base.contract.generatedDistPolicy, ['generatedDistPolicy']),
];
if (requirementsHits.length > 0) actualIssues.push(fail('FREEFORM_REQUIREMENTS_POLICY_PRESENT', 'package tsconfig/export/generated-dist policy must not use requirements string arrays', { requirementsHits }));
const exceptionIds = base.contract.exceptionClasses?.map((entry) => entry.id) ?? [];
if (JSON.stringify(exceptionIds) !== JSON.stringify(expectedExceptionIds)) actualIssues.push(fail('EXCEPTION_CLASSES_NOT_EXACT', 'exceptionClasses must be exact ordered typed array', { exceptionIds, expectedExceptionIds }));
if (JSON.stringify(base.contract.rootScripts?.preserved ?? []) !== JSON.stringify(['workspace:graph', 'workspace:surface'])) actualIssues.push(fail('PRESERVED_ROOT_SCRIPTS_NOT_EXACT', 'rootScripts.preserved must exactly preserve workspace:graph and workspace:surface', { preserved: base.contract.rootScripts?.preserved }));
if (JSON.stringify(base.contract.ts09vDeferral?.requiredIndependentPasses ?? []) !== JSON.stringify(['I-09S', 'I-09A'])) actualIssues.push(fail('TS09V_REQUIRED_PASSES_NOT_EXACT', 'TS-09V must require I-09S and I-09A', { passes: base.contract.ts09vDeferral?.requiredIndependentPasses }));
if (!base.contract.ts09vDeferral?.forbiddenUntilReady?.includes('packages/verification/**')) actualIssues.push(fail('VERIFICATION_NOT_FORBIDDEN_UNTIL_READY', 'packages/verification/** must remain forbidden until TS-09V ready'));
if (base.contract.sourceJsDebtPolicy?.auditedProductionJsCount !== 43 || base.contract.exceptionClasses?.[1]?.auditedProductionJsMjsCount !== 43) actualIssues.push(fail('AUDITED_COUNT_NOT_43', 'contract must encode audited count 43'));
if (base.contract.packageExportConvention?.runtimeExports?.sourceJsAllowedFinalState !== false || base.contract.packageExportConvention?.binEntries?.sourceJsAllowedFinalState !== false) actualIssues.push(fail('SOURCE_JS_FINAL_STATE_ALLOWED', 'source-JS exports/bin must not be allowed final state'));
if (base.contract.exceptionClasses?.[1]?.finalAllowlist !== false || base.contract.packageExportConvention?.currentSourceJsDebt?.finalAllowlist !== false) actualIssues.push(fail('PRODUCTION_JS_FINAL_ALLOWLIST_ALLOWED', 'audited production JS/MJS must not be final allowlist'));
if (base.contract.generatedDistPolicy?.tsRootWitnessOutputs?.allowedRoot !== '.vibe/work/TS-ROOT-build-export-contract/**' || base.contract.generatedDistPolicy?.tsRootWitnessOutputs?.productDistWriteAllowed !== false) actualIssues.push(fail('GENERATED_DIST_POLICY_NOT_TRANSIENT_ONLY', 'TS-ROOT generated outputs must be owned transient evidence only'));
const missingAuditedDebt = auditedProductionJsDebt.filter((rel) => !fs.existsSync(path.join(repo, rel)));
if (auditedProductionJsDebt.length !== 43 || missingAuditedDebt.length > 0) actualIssues.push(fail('AUDITED_PRODUCTION_JS_DEBT_MISSING', 'audited 43 production JS/MJS debt files must remain present', { expectedCount: auditedProductionJsDebt.length, missingAuditedDebt }));
const verificationExport = base.verificationPackage.exports?.['.'];
if (verificationExport !== './src/index.js') actualIssues.push(fail('VERIFICATION_EXPORT_CHANGED', 'packages/verification package export must remain TS-09V source-JS debt for this fix', { verificationExport }));

const fixtures = writeFixtures(base);
const negativeResults = fixtures.map((fixture) => {
  if (fixture.kind === 'schema-contract') {
    const validation = validateWithPython(schemaPath, fixture.file);
    return { name: fixture.name, kind: fixture.kind, file: fixture.file, rejected: validation.exitCode !== 0, validation };
  }
  if (fixture.kind === 'tsconfig') {
    const issues = validateTsconfig(JSON.parse(fs.readFileSync(fixture.file, 'utf8')));
    return { name: fixture.name, kind: fixture.kind, file: fixture.file, rejected: issues.length > 0, issueCodes: issues.map((issue) => issue.code) };
  }
  const issues = validatePackageFinalState(JSON.parse(fs.readFileSync(fixture.file, 'utf8')));
  return { name: fixture.name, kind: fixture.kind, file: fixture.file, rejected: issues.length > 0, issueCodes: issues.map((issue) => issue.code) };
});
const negativeFailures = negativeResults.filter((result) => !result.rejected);
const result = {
  repo,
  evidenceRoot,
  parsedActualFiles: files,
  ok: actualIssues.length === 0 && negativeFailures.length === 0,
  actualSchemaValidation,
  actualIssues,
  negativeResults,
  negativeFailures,
  regression: {
    auditedProductionJsDebtCount: auditedProductionJsDebt.length,
    auditedProductionJsDebtAllPresent: missingAuditedDebt.length === 0,
    verificationPackageExport: verificationExport,
    verificationRemainsTs09vDebt: verificationExport === './src/index.js',
    packagesVerificationForbiddenUntilReady: base.contract.ts09vDeferral?.forbiddenUntilReady ?? [],
    workspaceSurfaceScript: base.rootPackage.scripts?.['workspace:surface'],
    downstreamRouting: [
      'I-09A protected-drift routing: BLOCKED pending independent TS-ROOT revalidation PASS',
      'I-09B: BLOCKED pending I-09A post-fix validation PASS / W-RB2.5 truth-green',
      'I-11/root-baseline/shared-package lanes: BLOCKED pending independent TS-ROOT revalidation PASS'
    ]
  }
};
writeJson(resultPath, result);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
