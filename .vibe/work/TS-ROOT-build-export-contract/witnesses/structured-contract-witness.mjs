#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const targetRoot = process.argv[2] ?? process.cwd();
const workRoot = path.join(targetRoot, '.vibe/work/TS-ROOT-build-export-contract');
const outputDir = path.join(workRoot, 'witness-output');
fs.mkdirSync(outputDir, { recursive: true });

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(targetRoot, relativePath), 'utf8'));
const fail = (code, message, details = {}) => {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
};
const assert = (condition, code, message, details) => {
  if (!condition) fail(code, message, details);
};

const strictTrue = [
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
  'declaration',
  'declarationMap',
  'sourceMap',
  'noEmitOnError',
];
const strictFalse = ['allowUnreachableCode', 'allowUnusedLabels', 'skipLibCheck'];
const auditedProductionJs = [
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

function validateRootScripts(packageJson) {
  for (const script of ['build', 'typecheck', 'test']) {
    assert(packageJson.scripts?.[script] === `pnpm exec turbo run ${script}`, 'ROOT_SCRIPT', `${script} must delegate to pnpm exec turbo run ${script}`, { actual: packageJson.scripts?.[script] });
  }
  assert(packageJson.scripts?.['workspace:graph'] === 'pnpm -r list --depth -1 --json', 'WORKSPACE_GRAPH_MISSING', 'workspace:graph must be preserved');
  assert(packageJson.scripts?.['workspace:surface'] === 'node .vibe/work/I-00A-workspace-package-skeleton/witnesses/workspace-surface-witness.mjs --root .', 'WORKSPACE_SURFACE_MISSING', 'workspace:surface must be preserved exactly as evidence-only witness');
}

function validateTurboTasks(turboJson) {
  assert(Object.keys(turboJson.tasks ?? {}).sort().join(',') === 'build,test,typecheck', 'TURBO_TASKS', 'turbo must define exactly build/typecheck/test tasks for TS-ROOT scope', { tasks: turboJson.tasks });
  assert(JSON.stringify(turboJson.tasks.build.dependsOn) === JSON.stringify(['^build']), 'TURBO_BUILD_DEPS', 'build must depend on upstream package builds');
  assert(JSON.stringify(turboJson.tasks.build.outputs) === JSON.stringify(['dist/**']), 'TURBO_BUILD_OUTPUTS', 'build outputs must be dist/**');
  assert(JSON.stringify(turboJson.tasks.typecheck.outputs) === JSON.stringify([]), 'TURBO_TYPECHECK_OUTPUTS', 'typecheck must not claim product outputs');
  assert(JSON.stringify(turboJson.tasks.test.dependsOn) === JSON.stringify(['build', '^build']), 'TURBO_TEST_DEPS', 'test must depend on package build and upstream builds');
}

function validateStrictTsconfig(tsconfig) {
  const options = tsconfig.compilerOptions ?? {};
  for (const flag of strictTrue) assert(options[flag] === true, 'STRICT_FLAG_WEAKENED', `${flag} must be true`, { actual: options[flag] });
  for (const flag of strictFalse) assert(options[flag] === false, 'STRICT_FALSE_WEAKENED', `${flag} must be false`, { actual: options[flag] });
  assert(!Object.hasOwn(options, 'allowJs'), 'ALLOW_JS_FORBIDDEN', 'allowJs must not be introduced');
}

function validateBuildExportContract(contract) {
  assert(contract.schemaVersion === 'build-export-contract/1.0.0', 'CONTRACT_SCHEMA_VERSION', 'contract schemaVersion mismatch');
  assert(contract.contractId === 'TS-ROOT-build-export-contract', 'CONTRACT_ID', 'contractId mismatch');
  for (const script of ['build', 'typecheck', 'test']) {
    assert(contract.rootScripts?.[script]?.delegatesToTurbo === true, 'CONTRACT_SCRIPT_TURBO', `${script} must be marked as Turbo-delegated`);
    assert(contract.rootScripts?.[script]?.usesWorkspaceExecution === true, 'CONTRACT_SCRIPT_WORKSPACE', `${script} must use workspace execution`);
  }
  assert(contract.rootScripts?.preserved?.includes('workspace:graph'), 'CONTRACT_WORKSPACE_GRAPH', 'workspace:graph preservation missing');
  assert(contract.rootScripts?.preserved?.includes('workspace:surface'), 'CONTRACT_WORKSPACE_SURFACE', 'workspace:surface preservation missing');
  assert(contract.strictCompilerOptions?.forbidden?.includes('allowJs'), 'CONTRACT_ALLOWJS_FORBIDDEN', 'contract must forbid allowJs');
  assert(contract.strictCompilerOptions?.requiredTrue?.includes('strict'), 'CONTRACT_STRICT_REQUIRED', 'contract must require strict');
  assert(contract.packageTsconfigConvention?.requirements?.some((item) => item.includes('outDir: dist')), 'CONTRACT_TSCONFIG_DIST', 'package tsconfig convention must require dist outDir');
  assert(contract.packageExportConvention?.requirements?.some((item) => item.includes('generated dist')), 'CONTRACT_EXPORT_DIST', 'package export convention must require generated dist outputs');
  assert(contract.generatedDistPolicy?.requirements?.some((item) => item.includes('matching TypeScript source')), 'CONTRACT_GENERATED_DIST_EVIDENCE', 'generated dist policy must require matching TS source');
  assert(contract.sourceJsDebtPolicy?.productionJsIsDebt === true, 'CONTRACT_SOURCE_JS_DEBT', 'production JS must be classified as debt');
  assert(contract.sourceJsDebtPolicy?.auditedProductionJsCount === 43, 'CONTRACT_43_COUNT', 'contract must preserve audited 43 production JS count');
  assert(contract.sourceJsDebtPolicy?.workspaceSurfaceWitness?.classification?.includes('evidence-only'), 'CONTRACT_WORKSPACE_SURFACE_EVIDENCE', 'workspace surface witness must be evidence-only');
  assert(contract.sourceJsDebtPolicy?.workspaceSurfaceWitness?.finalStateAllowed === false, 'CONTRACT_WORKSPACE_SURFACE_NOT_FINAL', 'workspace surface witness must not be final production runtime');
  const debtRows = contract.sourceJsDebtPolicy?.currentSourceJsExportsAndBins ?? [];
  assert(debtRows.some((row) => row.path === 'packages/verification/package.json#/exports/.' && row.classification.includes('TS-09V') && row.finalStateAllowed === false), 'CONTRACT_TS09V_DEBT', 'verification source-JS export must be TS-09V debt');
  assert(contract.ts09vDeferral?.deferred === true, 'CONTRACT_TS09V_DEFERRED', 'TS-09V must be deferred');
  assert(contract.ts09vDeferral?.requiredIndependentPasses?.includes('I-09S') && contract.ts09vDeferral?.requiredIndependentPasses?.includes('I-09A'), 'CONTRACT_TS09V_GATES', 'TS-09V must require I-09S and I-09A PASS');
  assert(contract.ts09vDeferral?.forbiddenUntilReady?.includes('packages/verification/**'), 'CONTRACT_VERIFICATION_FORBIDDEN', 'packages/verification must remain forbidden until TS-09V ready');
}

function assertSourceJsExportRejected(manifest) {
  const exportValue = manifest.exports?.['.'];
  const paths = [];
  if (typeof exportValue === 'string') paths.push(exportValue);
  if (exportValue && typeof exportValue === 'object') paths.push(...Object.values(exportValue).filter((value) => typeof value === 'string'));
  if (typeof manifest.bin === 'string') paths.push(manifest.bin);
  if (manifest.bin && typeof manifest.bin === 'object') paths.push(...Object.values(manifest.bin).filter((value) => typeof value === 'string'));
  if (paths.some((value) => /(^|\/)src\/.*\.(js|mjs|cjs)$/.test(value.replace(/^\.\//, '')))) {
    fail('SOURCE_JS_EXPORT_OR_BIN_REJECTED', 'package export/bin points to source JS and is not allowed final state', { paths });
  }
}

function assertGeneratedDistEvidence(packageRoot) {
  const distJs = path.join(packageRoot, 'dist/index.js');
  if (fs.existsSync(distJs)) {
    const sourceTs = path.join(packageRoot, 'src/index.ts');
    const distDts = path.join(packageRoot, 'dist/index.d.ts');
    const buildEvidence = path.join(packageRoot, '.build-evidence.json');
    if (!fs.existsSync(sourceTs) || !fs.existsSync(distDts) || !fs.existsSync(buildEvidence)) {
      fail('GENERATED_DIST_WITHOUT_EVIDENCE_REJECTED', 'dist JS requires matching TS source, declaration, and build evidence', { packageRoot });
    }
  }
}

function runNegativeWitnesses(tsconfig) {
  const fixtureRoot = path.join(workRoot, 'fixtures/negative');
  fs.mkdirSync(fixtureRoot, { recursive: true });
  const weakened = structuredClone(tsconfig);
  weakened.compilerOptions.strict = false;
  fs.writeFileSync(path.join(fixtureRoot, 'weakened-tsconfig.json'), `${JSON.stringify(weakened, null, 2)}\n`);
  assertThrows(() => validateStrictTsconfig(weakened), 'STRICT_FLAG_WEAKENED');
  const allowJs = structuredClone(tsconfig);
  allowJs.compilerOptions.allowJs = true;
  fs.writeFileSync(path.join(fixtureRoot, 'allow-js-tsconfig.json'), `${JSON.stringify(allowJs, null, 2)}\n`);
  assertThrows(() => validateStrictTsconfig(allowJs), 'ALLOW_JS_FORBIDDEN');
  const sourceExport = { name: '@fixture/source-export', type: 'module', exports: { '.': './src/index.js' }, bin: './src/cli.js' };
  fs.writeFileSync(path.join(fixtureRoot, 'source-js-export-package.json'), `${JSON.stringify(sourceExport, null, 2)}\n`);
  assertThrows(() => assertSourceJsExportRejected(sourceExport), 'SOURCE_JS_EXPORT_OR_BIN_REJECTED');
  const distFixture = path.join(fixtureRoot, 'generated-dist-without-evidence');
  fs.mkdirSync(path.join(distFixture, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(distFixture, 'dist/index.js'), 'export const value = 1;\n');
  assertThrows(() => assertGeneratedDistEvidence(distFixture), 'GENERATED_DIST_WITHOUT_EVIDENCE_REJECTED');
  return ['weakened strict flag rejected', 'allowJs rejected', 'source-JS export/bin final state rejected', 'generated dist without TS/declaration/build evidence rejected'];
}

function assertThrows(fn, expectedCode) {
  try {
    fn();
  } catch (error) {
    if (error?.code === expectedCode) return;
    throw error;
  }
  fail('NEGATIVE_WITNESS_DID_NOT_FAIL', `expected ${expectedCode} failure`);
}

function runRegressionWitnesses(packageJson, verificationPackage) {
  assert(packageJson.scripts['workspace:surface']?.includes('.vibe/work/I-00A-workspace-package-skeleton/witnesses/workspace-surface-witness.mjs'), 'WORKSPACE_SURFACE_REGRESSION', 'workspace:surface must remain present');
  assert(verificationPackage.exports?.['.'] === './src/index.js', 'VERIFICATION_EXPORT_BASELINE', 'verification source-JS export must be reported as TS-09V debt and not edited by TS-ROOT', { actual: verificationPackage.exports?.['.'] });
  assert(auditedProductionJs.length === 43, 'AUDITED_LIST_COUNT', 'audited list fixture must contain 43 entries');
  const missing = auditedProductionJs.filter((relativePath) => !fs.existsSync(path.join(targetRoot, relativePath)));
  assert(missing.length === 0, 'AUDITED_43_MIGRATED_OR_MISSING', 'TS-ROOT must not migrate/remove audited 43 production JS files', { missing });
  return { auditedProductionJsCount: auditedProductionJs.length, verificationExportDebt: verificationPackage.exports?.['.'] };
}

try {
  const packageJson = readJson('package.json');
  const turboJson = readJson('turbo.json');
  const tsconfig = readJson('tsconfig.base.json');
  const schema = readJson('packages/mechanical-gates/src/p0/build-export-contract/build-export-contract.schema.json');
  const contract = readJson('packages/mechanical-gates/src/p0/build-export-contract/build-export-contract.json');
  const verificationPackage = readJson('packages/verification/package.json');
  assert(schema.$id === 'https://vibe-engineer.local/schemas/p0/build-export-contract.schema.json', 'SCHEMA_ID', 'schema $id mismatch');
  validateRootScripts(packageJson);
  validateTurboTasks(turboJson);
  validateStrictTsconfig(tsconfig);
  validateBuildExportContract(contract);
  const negativeWitnesses = runNegativeWitnesses(tsconfig);
  const regression = runRegressionWitnesses(packageJson, verificationPackage);
  const result = {
    ok: true,
    targetRoot,
    parsedFiles: ['package.json', 'turbo.json', 'tsconfig.base.json', 'build-export-contract.schema.json', 'build-export-contract.json', 'packages/verification/package.json'],
    positiveWitnesses: ['root scripts delegate to Turbo', 'turbo tasks present', 'strict flags locked', 'build/export contract policy fields present'],
    negativeWitnesses,
    regression,
    resultUrl: pathToFileURL(path.join(outputDir, 'structured-contract-witness-result.json')).href,
  };
  fs.writeFileSync(path.join(outputDir, 'structured-contract-witness-result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const failure = { ok: false, code: error?.code ?? 'UNCAUGHT', message: error?.message, details: error?.details ?? {} };
  fs.writeFileSync(path.join(outputDir, 'structured-contract-witness-result.json'), `${JSON.stringify(failure, null, 2)}\n`);
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
}
