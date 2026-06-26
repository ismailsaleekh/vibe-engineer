#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repo = process.argv[2] ?? process.cwd();
const evidenceRoot = process.argv[3] ?? path.join(repo, '.vibe/work/TS-ROOT-build-export-contract/validation-evidence');
const resultPath = path.join(evidenceRoot, 'structured-contract-validator-result.json');
const negativeRoot = path.join(evidenceRoot, 'negative-fixtures');
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
];

const requiredFalseFlags = ['allowUnreachableCode', 'allowUnusedLabels'];

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

const requiredExceptionClasses = [
  'external-tool-config',
  'generated-output',
  'fixtures-evidence',
  'temporary-witness-tooling',
  'production-migration-debt',
  'active-source-js-export-debt',
  'cjs-none',
];

function readJson(rel) {
  const absolute = path.join(repo, rel);
  return JSON.parse(fs.readFileSync(absolute, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assert(condition, code, message, details = {}) {
  if (!condition) {
    return { code, message, details };
  }
  return undefined;
}

function commandTokens(command) {
  if (typeof command !== 'string') return [];
  return command.trim().split(/\s+/u);
}

function scriptDelegatesToTurbo(command, task) {
  const tokens = commandTokens(command);
  const expected = ['pnpm', 'exec', 'turbo', 'run', task];
  return expected.every((token, index) => tokens[index] === token);
}

function validateRootPackage(rootPackage) {
  const issues = [];
  if (!isObject(rootPackage.scripts)) {
    issues.push({ code: 'ROOT_SCRIPTS_OBJECT', message: 'root package scripts must be an object' });
    return issues;
  }
  for (const task of ['build', 'typecheck', 'test']) {
    const script = rootPackage.scripts[task];
    const issue = assert(scriptDelegatesToTurbo(script, task), 'ROOT_SCRIPT_MUST_DELEGATE_TO_TURBO', `root script ${task} must delegate through pnpm exec turbo run ${task}`, { script });
    if (issue) issues.push(issue);
  }
  for (const preserved of ['workspace:graph', 'workspace:surface']) {
    const issue = assert(typeof rootPackage.scripts[preserved] === 'string' && rootPackage.scripts[preserved].length > 0, 'ROOT_SCRIPT_PRESERVED_MISSING', `root script ${preserved} must remain present`);
    if (issue) issues.push(issue);
  }
  return issues;
}

function validateTurbo(turbo) {
  const issues = [];
  if (!isObject(turbo.tasks)) {
    issues.push({ code: 'TURBO_TASKS_OBJECT', message: 'turbo tasks must be an object' });
    return issues;
  }
  const taskNames = Object.keys(turbo.tasks).sort();
  const expectedTasks = ['build', 'test', 'typecheck'];
  const issue = assert(JSON.stringify(taskNames) === JSON.stringify(expectedTasks), 'TURBO_TASK_SET_EXACT', 'turbo tasks must be exactly build, typecheck, and test', { taskNames });
  if (issue) issues.push(issue);
  for (const task of expectedTasks) {
    if (!isObject(turbo.tasks[task])) {
      issues.push({ code: 'TURBO_TASK_MISSING', message: `turbo task ${task} must exist` });
      continue;
    }
    if (!Array.isArray(turbo.tasks[task].dependsOn)) issues.push({ code: 'TURBO_DEPENDS_ARRAY', message: `turbo ${task}.dependsOn must be an array` });
    if (!Array.isArray(turbo.tasks[task].outputs)) issues.push({ code: 'TURBO_OUTPUTS_ARRAY', message: `turbo ${task}.outputs must be an array` });
  }
  if (isObject(turbo.tasks.build)) {
    if (!turbo.tasks.build.dependsOn.includes('^build')) issues.push({ code: 'TURBO_BUILD_DEPENDS_UPSTREAM', message: 'build must depend on ^build' });
    if (!turbo.tasks.build.outputs.includes('dist/**')) issues.push({ code: 'TURBO_BUILD_OUTPUT_DIST', message: 'build outputs must include dist/**' });
  }
  for (const broadGate of ['e2e', 'mobile', 'visual', 'deploy', 'ci', 'quality']) {
    if (hasOwn(turbo.tasks, broadGate)) issues.push({ code: 'TURBO_BROAD_GATE_FORBIDDEN', message: `turbo task ${broadGate} is out of scope for TS-ROOT` });
  }
  return issues;
}

function validateTsconfig(tsconfig) {
  const issues = [];
  const options = tsconfig.compilerOptions;
  if (!isObject(options)) {
    issues.push({ code: 'TSCONFIG_COMPILER_OPTIONS_OBJECT', message: 'compilerOptions must be an object' });
    return issues;
  }
  for (const flag of requiredTrueFlags) {
    if (options[flag] !== true) issues.push({ code: 'STRICT_FLAG_NOT_TRUE', message: `${flag} must be true`, details: { actual: options[flag] } });
  }
  for (const flag of requiredFalseFlags) {
    if (options[flag] !== false) issues.push({ code: 'STRICT_FLAG_NOT_FALSE', message: `${flag} must be false`, details: { actual: options[flag] } });
  }
  if (options.allowJs === true) issues.push({ code: 'ALLOW_JS_ENABLED', message: 'allowJs must be absent or false' });
  return issues;
}

function collectConstValues(value, values = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectConstValues(item, values);
    return values;
  }
  if (isObject(value)) {
    if (typeof value.const === 'string') values.push(value.const);
    for (const item of Object.values(value)) collectConstValues(item, values);
  }
  return values;
}

function collectSchemaTightnessIssues(schema) {
  const issues = [];
  const defs = schema.$defs ?? {};
  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  for (const key of ['rootScripts', 'turboTasks', 'strictCompilerOptions', 'packageTsconfigConvention', 'packageExportConvention', 'generatedDistPolicy', 'sourceJsDebtPolicy', 'ts09vDeferral', 'witnessPolicy']) {
    if (!required.has(key)) issues.push({ code: 'SCHEMA_REQUIRED_FIELD_MISSING', message: `schema must require ${key}` });
  }
  const preserved = schema.properties?.rootScripts?.properties?.preserved;
  const preservedConsts = new Set(collectConstValues(preserved));
  if (!preservedConsts.has('workspace:graph') || !preservedConsts.has('workspace:surface')) {
    issues.push({ code: 'SCHEMA_PRESERVED_SCRIPTS_NOT_FAIL_CLOSED', message: 'schema must fail closed unless both workspace:graph and workspace:surface are preserved', details: { preservedConsts: [...preservedConsts] } });
  }
  const ts09v = defs.ts09vDeferral?.properties?.requiredIndependentPasses;
  const ts09vConsts = new Set(collectConstValues(ts09v));
  if (!ts09vConsts.has('I-09S') || !ts09vConsts.has('I-09A')) {
    issues.push({ code: 'SCHEMA_TS09V_PASSES_NOT_FAIL_CLOSED', message: 'schema must fail closed unless TS-09V defers until both I-09S and I-09A PASS', details: { requiredIndependentPassesConsts: [...ts09vConsts] } });
  }
  const packageExportRef = schema.properties?.packageExportConvention?.$ref;
  const generatedDistRef = schema.properties?.generatedDistPolicy?.$ref;
  const packageTsconfigRef = schema.properties?.packageTsconfigConvention?.$ref;
  if (packageExportRef === '#/$defs/stringArrayObject') {
    issues.push({ code: 'SCHEMA_PACKAGE_EXPORT_POLICY_FREEFORM', message: 'package export convention is freeform string requirements instead of typed fail-closed fields' });
  }
  if (generatedDistRef === '#/$defs/stringArrayObject') {
    issues.push({ code: 'SCHEMA_GENERATED_DIST_POLICY_FREEFORM', message: 'generated dist policy is freeform string requirements instead of typed fail-closed fields' });
  }
  if (packageTsconfigRef === '#/$defs/stringArrayObject') {
    issues.push({ code: 'SCHEMA_PACKAGE_TSCONFIG_POLICY_FREEFORM', message: 'package tsconfig convention is freeform string requirements instead of typed fail-closed fields' });
  }
  if (!schema.properties?.exceptionClasses && !defs.exceptionClass) {
    issues.push({ code: 'SCHEMA_EXCEPTION_CLASSES_MISSING', message: 'schema lacks exact exception classes required by TS migration amendment' });
  }
  return issues;
}

function validateContract(contract, schema) {
  const issues = [];
  if (contract.schemaVersion !== 'build-export-contract/1.0.0') issues.push({ code: 'CONTRACT_SCHEMA_VERSION', message: 'contract schemaVersion mismatch' });
  if (contract.contractId !== 'TS-ROOT-build-export-contract') issues.push({ code: 'CONTRACT_ID', message: 'contractId mismatch' });
  if (contract.status !== 'active') issues.push({ code: 'CONTRACT_STATUS', message: 'status must be active' });
  for (const task of ['build', 'typecheck', 'test']) {
    const script = contract.rootScripts?.[task];
    if (!isObject(script) || script.delegatesToTurbo !== true || script.usesWorkspaceExecution !== true || !scriptDelegatesToTurbo(script.command, task)) {
      issues.push({ code: 'CONTRACT_ROOT_SCRIPT', message: `contract root script ${task} must encode Turbo workspace delegation`, details: { script } });
    }
    const turboTask = contract.turboTasks?.[task];
    if (!isObject(turboTask) || turboTask.required !== true || !Array.isArray(turboTask.dependsOn) || !Array.isArray(turboTask.outputs)) {
      issues.push({ code: 'CONTRACT_TURBO_TASK', message: `contract turbo task ${task} must be typed and required`, details: { turboTask } });
    }
  }
  const preserved = contract.rootScripts?.preserved;
  for (const preservedScript of ['workspace:graph', 'workspace:surface']) {
    if (!Array.isArray(preserved) || !preserved.includes(preservedScript)) {
      issues.push({ code: 'CONTRACT_PRESERVED_SCRIPT', message: `contract must preserve ${preservedScript}` });
    }
  }
  for (const flag of requiredTrueFlags) {
    if (!contract.strictCompilerOptions?.requiredTrue?.includes(flag)) issues.push({ code: 'CONTRACT_STRICT_TRUE_FLAG_MISSING', message: `contract strict requiredTrue missing ${flag}` });
  }
  for (const flag of requiredFalseFlags) {
    if (!contract.strictCompilerOptions?.requiredFalse?.includes(flag)) issues.push({ code: 'CONTRACT_STRICT_FALSE_FLAG_MISSING', message: `contract strict requiredFalse missing ${flag}` });
  }
  if (!contract.strictCompilerOptions?.forbidden?.includes('allowJs')) issues.push({ code: 'CONTRACT_ALLOW_JS_FORBIDDEN_MISSING', message: 'contract must forbid allowJs' });
  if (contract.sourceJsDebtPolicy?.productionJsIsDebt !== true) issues.push({ code: 'CONTRACT_PRODUCTION_JS_DEBT', message: 'audited production JS must be migration debt, not allowlist' });
  if (contract.sourceJsDebtPolicy?.auditedProductionJsCount !== 43) issues.push({ code: 'CONTRACT_AUDITED_COUNT', message: 'audited production JS count must be 43' });
  const workspaceWitness = contract.sourceJsDebtPolicy?.workspaceSurfaceWitness;
  if (!isObject(workspaceWitness) || workspaceWitness.path !== '.vibe/work/I-00A-workspace-package-skeleton/witnesses/workspace-surface-witness.mjs' || workspaceWitness.finalStateAllowed !== false) {
    issues.push({ code: 'CONTRACT_WORKSPACE_SURFACE_CLASSIFICATION', message: 'workspace-surface witness must be exact evidence-only debt entry', details: { workspaceWitness } });
  }
  const sourceDebt = contract.sourceJsDebtPolicy?.currentSourceJsExportsAndBins;
  if (!Array.isArray(sourceDebt) || !sourceDebt.some((entry) => entry.path === 'packages/verification/package.json#/exports/.' && entry.finalStateAllowed === false)) {
    issues.push({ code: 'CONTRACT_TS09V_DEBT_ENTRY', message: 'contract must classify verification export as TS-09V debt' });
  }
  if (contract.ts09vDeferral?.deferred !== true) issues.push({ code: 'CONTRACT_TS09V_DEFERRED', message: 'TS-09V must be deferred' });
  for (const pass of ['I-09S', 'I-09A']) {
    if (!Array.isArray(contract.ts09vDeferral?.requiredIndependentPasses) || !contract.ts09vDeferral.requiredIndependentPasses.includes(pass)) {
      issues.push({ code: 'CONTRACT_TS09V_REQUIRED_PASS_MISSING', message: `TS-09V deferral must require ${pass}` });
    }
  }
  if (!Array.isArray(contract.ts09vDeferral?.forbiddenUntilReady) || !contract.ts09vDeferral.forbiddenUntilReady.includes('packages/verification/**')) {
    issues.push({ code: 'CONTRACT_TS09V_FORBIDDEN_PATH', message: 'TS-09V deferral must forbid packages/verification/** until ready' });
  }
  const exceptionClasses = contract.exceptionClasses;
  if (!Array.isArray(exceptionClasses)) {
    issues.push({ code: 'CONTRACT_EXCEPTION_CLASSES_MISSING', message: 'contract JSON lacks exact exceptionClasses array' });
  } else {
    const ids = new Set(exceptionClasses.map((entry) => entry?.id));
    for (const id of requiredExceptionClasses) {
      if (!ids.has(id)) issues.push({ code: 'CONTRACT_EXCEPTION_CLASS_MISSING', message: `contract exceptionClasses missing ${id}` });
    }
  }
  issues.push(...collectSchemaTightnessIssues(schema));
  return issues;
}

function valuePointsToSourceJs(value) {
  if (typeof value === 'string') {
    const normalized = value.replaceAll('\\', '/');
    const segments = normalized.split('/');
    const last = segments[segments.length - 1] ?? '';
    return segments.includes('src') && (last.endsWith('.js') || last.endsWith('.mjs') || last.endsWith('.cjs'));
  }
  if (Array.isArray(value)) return value.some(valuePointsToSourceJs);
  if (isObject(value)) return Object.values(value).some(valuePointsToSourceJs);
  return false;
}

function validatePackageFinalState(packageJson) {
  const issues = [];
  if (valuePointsToSourceJs(packageJson.exports)) issues.push({ code: 'PACKAGE_EXPORT_SOURCE_JS_FINAL_STATE', message: 'package exports point to production source JS/MJS/CJS as final state' });
  if (valuePointsToSourceJs(packageJson.bin)) issues.push({ code: 'PACKAGE_BIN_SOURCE_JS_FINAL_STATE', message: 'package bin points to production source JS/MJS/CJS as final state' });
  if (typeof packageJson.types === 'string' && packageJson.types.replaceAll('\\', '/').split('/').includes('src')) issues.push({ code: 'PACKAGE_TYPES_SOURCE_FINAL_STATE', message: 'package types points to source instead of generated dist declarations' });
  return issues;
}

function validateGeneratedDistFixture(fixtureDir) {
  const issues = [];
  const distJs = path.join(fixtureDir, 'dist/index.js');
  const distDts = path.join(fixtureDir, 'dist/index.d.ts');
  const srcTs = path.join(fixtureDir, 'src/index.ts');
  const buildEvidence = path.join(fixtureDir, 'build-evidence.json');
  if (fs.existsSync(distJs)) {
    if (!fs.existsSync(srcTs)) issues.push({ code: 'GENERATED_DIST_MISSING_TS_SOURCE', message: 'dist JS lacks matching TS source' });
    if (!fs.existsSync(distDts)) issues.push({ code: 'GENERATED_DIST_MISSING_DECLARATION', message: 'dist JS lacks matching declaration output' });
    if (!fs.existsSync(buildEvidence)) issues.push({ code: 'GENERATED_DIST_MISSING_BUILD_EVIDENCE', message: 'dist JS lacks build evidence' });
  }
  return issues;
}

function writeNegativeFixtures(base) {
  const weakenedTsconfig = clone(base.tsconfig);
  weakenedTsconfig.compilerOptions.strict = false;
  writeJson(path.join(negativeRoot, 'weakened-strict-tsconfig.json'), weakenedTsconfig);

  const allowJsTsconfig = clone(base.tsconfig);
  allowJsTsconfig.compilerOptions.allowJs = true;
  writeJson(path.join(negativeRoot, 'allow-js-tsconfig.json'), allowJsTsconfig);

  const bypassRoot = clone(base.rootPackage);
  bypassRoot.scripts.build = 'pnpm -r run build';
  writeJson(path.join(negativeRoot, 'root-build-bypasses-turbo.package.json'), bypassRoot);

  const missingTestRoot = clone(base.rootPackage);
  delete missingTestRoot.scripts.test;
  writeJson(path.join(negativeRoot, 'root-test-missing.package.json'), missingTestRoot);

  const missingTurbo = clone(base.turbo);
  delete missingTurbo.tasks.typecheck;
  writeJson(path.join(negativeRoot, 'missing-turbo-typecheck.turbo.json'), missingTurbo);

  const sourceJsPackage = {
    name: '@fixture/source-js-final-state',
    type: 'module',
    exports: { '.': './src/index.js' },
    bin: { fixture: './src/index.js' },
    types: './src/index.d.ts',
  };
  writeJson(path.join(negativeRoot, 'source-js-export-bin.package.json'), sourceJsPackage);

  const distFixture = path.join(negativeRoot, 'generated-dist-without-source-declaration-evidence');
  fs.mkdirSync(path.join(distFixture, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(distFixture, 'dist/index.js'), 'export const fixture = true;\n');
  writeJson(path.join(distFixture, 'package.json'), { name: '@fixture/bad-dist', type: 'module', exports: { '.': './dist/index.js' }, types: './dist/index.d.ts' });

  const missingTs09v = clone(base.contract);
  missingTs09v.ts09vDeferral.requiredIndependentPasses = ['I-09A'];
  writeJson(path.join(negativeRoot, 'contract-omits-i09s-ts09v-deferral.json'), missingTs09v);

  const allowlistProductionJs = clone(base.contract);
  allowlistProductionJs.sourceJsDebtPolicy.productionJsIsDebt = false;
  if (Array.isArray(allowlistProductionJs.sourceJsDebtPolicy.currentSourceJsExportsAndBins)) {
    allowlistProductionJs.sourceJsDebtPolicy.currentSourceJsExportsAndBins[0].finalStateAllowed = true;
  }
  writeJson(path.join(negativeRoot, 'contract-treats-production-js-as-final-allowlist.json'), allowlistProductionJs);
}

function runNegativeFixtureChecks(base) {
  const results = [];
  const checks = [
    ['weakened strict flag', () => validateTsconfig(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'weakened-strict-tsconfig.json'), 'utf8')))],
    ['allowJs true', () => validateTsconfig(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'allow-js-tsconfig.json'), 'utf8')))],
    ['root build bypasses Turbo', () => validateRootPackage(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'root-build-bypasses-turbo.package.json'), 'utf8')))],
    ['root test script missing', () => validateRootPackage(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'root-test-missing.package.json'), 'utf8')))],
    ['missing Turbo typecheck task', () => validateTurbo(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'missing-turbo-typecheck.turbo.json'), 'utf8')))],
    ['source-JS package export/bin final state', () => validatePackageFinalState(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'source-js-export-bin.package.json'), 'utf8')))],
    ['generated dist without TS/declaration/build evidence', () => validateGeneratedDistFixture(path.join(negativeRoot, 'generated-dist-without-source-declaration-evidence'))],
    ['contract omits I-09S TS-09V deferral', () => validateContract(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'contract-omits-i09s-ts09v-deferral.json'), 'utf8')), base.schema)],
    ['contract treats production JS as final allowlist', () => validateContract(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'contract-treats-production-js-as-final-allowlist.json'), 'utf8')), base.schema)],
  ];
  for (const [name, check] of checks) {
    const issues = check();
    results.push({ name, rejected: issues.length > 0, issueCodes: issues.map((issue) => issue.code), issueCount: issues.length });
  }
  return results;
}

function verifyAuditedDebtStillPresent() {
  const missing = auditedProductionJsDebt.filter((rel) => !fs.existsSync(path.join(repo, rel)));
  return {
    expectedCount: auditedProductionJsDebt.length,
    missing,
    allPresent: missing.length === 0,
  };
}

const base = {
  rootPackage: readJson('package.json'),
  turbo: readJson('turbo.json'),
  tsconfig: readJson('tsconfig.base.json'),
  schema: readJson('packages/mechanical-gates/src/p0/build-export-contract/build-export-contract.schema.json'),
  contract: readJson('packages/mechanical-gates/src/p0/build-export-contract/build-export-contract.json'),
  verificationPackage: readJson('packages/verification/package.json'),
};

writeNegativeFixtures(base);

const currentIssues = [
  ...validateRootPackage(base.rootPackage).map((issue) => ({ area: 'rootPackage', ...issue })),
  ...validateTurbo(base.turbo).map((issue) => ({ area: 'turbo', ...issue })),
  ...validateTsconfig(base.tsconfig).map((issue) => ({ area: 'tsconfig', ...issue })),
  ...validateContract(base.contract, base.schema).map((issue) => ({ area: 'contract', ...issue })),
];

const negativeResults = runNegativeFixtureChecks(base);
const negativeFailures = negativeResults.filter((result) => !result.rejected);
const verificationExport = base.verificationPackage.exports?.['.'];
const auditedDebt = verifyAuditedDebtStillPresent();
if (!auditedDebt.allPresent) currentIssues.push({ area: 'auditedDebt', code: 'AUDITED_PRODUCTION_JS_MISSING', message: 'audited production JS debt file missing or migrated in TS-ROOT', details: auditedDebt });
if (verificationExport !== './src/index.js') currentIssues.push({ area: 'ts09v', code: 'VERIFICATION_EXPORT_CHANGED', message: 'packages/verification export changed; TS-09V must remain deferred', details: { verificationExport } });

const result = {
  repo,
  evidenceRoot,
  ok: currentIssues.length === 0 && negativeFailures.length === 0,
  currentIssues,
  negativeResults,
  negativeFailures,
  regression: {
    auditedProductionJsDebt: auditedDebt,
    verificationPackageExport: verificationExport,
    verificationClassifiedAsTs09vDebt: verificationExport === './src/index.js',
    workspaceSurfaceScript: base.rootPackage.scripts?.['workspace:surface'],
  },
};

writeJson(resultPath, result);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
