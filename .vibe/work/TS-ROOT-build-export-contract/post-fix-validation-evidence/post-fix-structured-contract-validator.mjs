#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(process.argv[2] ?? process.cwd());
const evidenceRoot = path.resolve(process.argv[3] ?? path.join(repo, '.vibe/work/TS-ROOT-build-export-contract/post-fix-validation-evidence'));
const negativeRoot = path.join(evidenceRoot, 'negative-fixtures');
const resultPath = path.join(evidenceRoot, 'post-fix-structured-contract-validator-result.json');
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
function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}
function asSet(value) {
  return new Set(Array.isArray(value) ? value : []);
}
function setEquals(actual, expected) {
  if (actual.size !== expected.length) return false;
  return expected.every((item) => actual.has(item));
}
function issue(code, message, details = {}) {
  return { code, message, details };
}
function tokens(command) {
  return typeof command === 'string' ? command.trim().split(/\s+/u) : [];
}
function scriptDelegates(command, task) {
  const expected = ['pnpm', 'exec', 'turbo', 'run', task];
  const actual = tokens(command);
  return expected.every((part, index) => actual[index] === part);
}
function noRequirementsKey(value) {
  if (Array.isArray(value)) return value.every(noRequirementsKey);
  if (!isObject(value)) return true;
  if (hasOwn(value, 'requirements')) return false;
  return Object.values(value).every(noRequirementsKey);
}
function collectConsts(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectConsts(item, out);
  } else if (isObject(value)) {
    if (typeof value.const === 'string') out.push(value.const);
    for (const item of Object.values(value)) collectConsts(item, out);
  }
  return out;
}

function validateRootPackage(rootPackage) {
  const issues = [];
  if (!isObject(rootPackage.scripts)) return [issue('ROOT_SCRIPTS_NOT_OBJECT', 'root scripts must be an object')];
  for (const task of ['build', 'typecheck', 'test']) {
    if (!scriptDelegates(rootPackage.scripts[task], task)) {
      issues.push(issue('ROOT_SCRIPT_NOT_TURBO', `root ${task} script must delegate through pnpm exec turbo run ${task}`, { actual: rootPackage.scripts[task] }));
    }
  }
  for (const preserved of ['workspace:graph', 'workspace:surface']) {
    if (typeof rootPackage.scripts[preserved] !== 'string' || rootPackage.scripts[preserved].length === 0) {
      issues.push(issue('ROOT_PRESERVED_SCRIPT_MISSING', `${preserved} must remain present`));
    }
  }
  return issues;
}
function validateRootScriptDefinitions(rootPackage) {
  return {
    build: rootPackage.scripts?.build,
    typecheck: rootPackage.scripts?.typecheck,
    test: rootPackage.scripts?.test,
    workspaceGraphPresent: typeof rootPackage.scripts?.['workspace:graph'] === 'string',
    workspaceSurfacePresent: typeof rootPackage.scripts?.['workspace:surface'] === 'string',
    delegates: ['build', 'typecheck', 'test'].every((task) => scriptDelegates(rootPackage.scripts?.[task], task)),
  };
}
function validateTurbo(turbo) {
  const issues = [];
  if (!isObject(turbo.tasks)) return [issue('TURBO_TASKS_NOT_OBJECT', 'turbo tasks must be an object')];
  const names = Object.keys(turbo.tasks).sort();
  if (JSON.stringify(names) !== JSON.stringify(['build', 'test', 'typecheck'])) {
    issues.push(issue('TURBO_TASK_SET_NOT_EXACT', 'turbo tasks must be exactly build/typecheck/test', { names }));
  }
  const expected = {
    build: { dependsOn: ['^build'], outputs: ['dist/**'] },
    typecheck: { dependsOn: ['^build'], outputs: [] },
    test: { dependsOn: ['build', '^build'], outputs: [] },
  };
  for (const [task, shape] of Object.entries(expected)) {
    const actual = turbo.tasks[task];
    if (!isObject(actual)) {
      issues.push(issue('TURBO_TASK_MISSING', `${task} task missing`));
      continue;
    }
    if (JSON.stringify(actual.dependsOn ?? []) !== JSON.stringify(shape.dependsOn)) issues.push(issue('TURBO_DEPENDS_MISMATCH', `${task} dependsOn mismatch`, { actual: actual.dependsOn, expected: shape.dependsOn }));
    if (JSON.stringify(actual.outputs ?? []) !== JSON.stringify(shape.outputs)) issues.push(issue('TURBO_OUTPUTS_MISMATCH', `${task} outputs mismatch`, { actual: actual.outputs, expected: shape.outputs }));
  }
  for (const broad of ['ci', 'deploy', 'e2e', 'mobile', 'visual', 'quality']) {
    if (hasOwn(turbo.tasks, broad)) issues.push(issue('TURBO_FORBIDDEN_BROAD_TASK', `forbidden broad task ${broad}`));
  }
  return issues;
}
function validateTsconfig(tsconfig) {
  const issues = [];
  const options = tsconfig.compilerOptions;
  if (!isObject(options)) return [issue('TSCONFIG_OPTIONS_NOT_OBJECT', 'compilerOptions must be object')];
  for (const flag of requiredTrueFlags) {
    if (options[flag] !== true) issues.push(issue('STRICT_FLAG_NOT_TRUE', `${flag} must be true`, { actual: options[flag] }));
  }
  for (const flag of requiredFalseFlags) {
    if (options[flag] !== false) issues.push(issue('STRICT_FLAG_NOT_FALSE', `${flag} must be false`, { actual: options[flag] }));
  }
  if (options.allowJs === true) issues.push(issue('ALLOW_JS_TRUE', 'allowJs must be absent or false'));
  return issues;
}
function validateSchemaStructure(schema) {
  const issues = [];
  const required = asSet(schema.required);
  for (const field of ['$schema', 'schemaVersion', 'contractId', 'status', 'exceptionClasses', 'rootScripts', 'turboTasks', 'strictCompilerOptions', 'packageTsconfigConvention', 'packageExportConvention', 'generatedDistPolicy', 'sourceJsDebtPolicy', 'ts09vDeferral', 'witnessPolicy']) {
    if (!required.has(field)) issues.push(issue('SCHEMA_TOP_REQUIRED_MISSING', `schema top-level required missing ${field}`));
  }
  if (schema.additionalProperties !== false) issues.push(issue('SCHEMA_TOP_ADDITIONAL_PROPERTIES', 'schema top-level must be additionalProperties:false'));
  const defs = schema.$defs ?? {};
  const exceptions = defs.exceptionClasses;
  if (!isObject(exceptions) || exceptions.minItems !== 4 || exceptions.maxItems !== 4 || exceptions.items !== false || !Array.isArray(exceptions.prefixItems) || exceptions.prefixItems.length !== 4) {
    issues.push(issue('SCHEMA_EXCEPTION_CLASSES_NOT_EXACT', 'schema exceptionClasses must be exact four-item prefix tuple'));
  }
  for (const defName of ['workspaceSurfaceException', 'auditedProductionJsException', 'ts09vException', 'transientBuildOutputException']) {
    if (defs[defName]?.additionalProperties !== false) issues.push(issue('SCHEMA_EXCEPTION_DEF_NOT_FAIL_CLOSED', `${defName} must have additionalProperties:false`));
  }
  const schemaExceptionIds = [defs.workspaceSurfaceException?.properties?.id?.const, defs.auditedProductionJsException?.properties?.id?.const, defs.ts09vException?.properties?.id?.const, defs.transientBuildOutputException?.properties?.id?.const];
  for (const id of expectedExceptionIds) {
    if (!schemaExceptionIds.includes(id)) issues.push(issue('SCHEMA_EXCEPTION_ID_MISSING', `schema missing exception id const ${id}`, { schemaExceptionIds }));
  }
  const preserved = defs.preservedRootScripts;
  const preservedConsts = new Set(collectConsts(preserved));
  if (!isObject(preserved) || preserved.minItems !== 2 || preserved.maxItems !== 2 || preserved.uniqueItems !== true || !preservedConsts.has('workspace:graph') || !preservedConsts.has('workspace:surface')) {
    issues.push(issue('SCHEMA_PRESERVED_SCRIPTS_NOT_FAIL_CLOSED', 'schema must fail closed for both workspace:graph and workspace:surface', { preservedConsts: [...preservedConsts] }));
  }
  const passes = defs.i09RequiredPasses;
  const passConsts = new Set(collectConsts(passes));
  if (!isObject(passes) || passes.minItems !== 2 || passes.maxItems !== 2 || passes.uniqueItems !== true || !passConsts.has('I-09S') || !passConsts.has('I-09A')) {
    issues.push(issue('SCHEMA_TS09V_PASSES_NOT_FAIL_CLOSED', 'schema must fail closed for both I-09S and I-09A', { passConsts: [...passConsts] }));
  }
  for (const defName of ['packageTsconfigConvention', 'packageExportConvention', 'generatedDistPolicy']) {
    const def = defs[defName];
    if (!isObject(def) || def.type !== 'object' || def.additionalProperties !== false) issues.push(issue('SCHEMA_POLICY_NOT_TYPED_OBJECT', `${defName} must be typed object with additionalProperties:false`));
    if (!noRequirementsKey(def)) issues.push(issue('SCHEMA_POLICY_HAS_FREEFORM_REQUIREMENTS', `${defName} must not use requirements:string[] as load-bearing model`));
  }
  return issues;
}
function validateExceptionClasses(contract) {
  const issues = [];
  if (!Array.isArray(contract.exceptionClasses)) return [issue('CONTRACT_EXCEPTION_CLASSES_MISSING', 'exceptionClasses array missing')];
  if (contract.exceptionClasses.length !== 4) issues.push(issue('CONTRACT_EXCEPTION_CLASSES_NOT_FOUR', 'exceptionClasses must contain exactly four entries', { length: contract.exceptionClasses.length }));
  const ids = contract.exceptionClasses.map((entry) => entry?.id);
  if (JSON.stringify(ids) !== JSON.stringify(expectedExceptionIds)) issues.push(issue('CONTRACT_EXCEPTION_CLASSES_NOT_EXACT_ORDER', 'exceptionClasses must be exact four expected classes in schema order', { ids, expectedExceptionIds }));
  const byId = new Map(contract.exceptionClasses.map((entry) => [entry?.id, entry]));
  const workspace = byId.get('workspace-surface-witness-evidence-only');
  if (!isObject(workspace) || workspace.category !== 'evidence-only-root-script' || workspace.subject !== '.vibe/work/I-00A-workspace-package-skeleton/witnesses/workspace-surface-witness.mjs' || workspace.productionRuntimeOrExportSource !== false || workspace.finalStateAllowed !== false || !setEquals(asSet(workspace.forbiddenUses), ['production-runtime-source', 'package-export-source', 'package-bin-source'])) {
    issues.push(issue('CONTRACT_WORKSPACE_EXCEPTION_WEAK', 'workspace-surface exception must be evidence-only and forbid runtime/export/bin use', { workspace }));
  }
  const audited = byId.get('audited-production-js-mjs-migration-debt');
  if (!isObject(audited) || audited.category !== 'migration-debt' || audited.auditedProductionJsMjsCount !== 43 || audited.finalAllowlist !== false) {
    issues.push(issue('CONTRACT_AUDITED_EXCEPTION_WEAK', 'audited production JS/MJS must be migration debt, not final allowlist', { audited }));
  }
  const ts09v = byId.get('ts09v-verification-source-js-export-deferred');
  if (!isObject(ts09v) || ts09v.category !== 'deferred-verification-source-js-export-debt' || ts09v.deferralId !== 'TS-09V' || !setEquals(asSet(ts09v.requiredIndependentPasses), ['I-09S', 'I-09A']) || !Array.isArray(ts09v.forbiddenUntilReady) || !ts09v.forbiddenUntilReady.includes('packages/verification/**') || ts09v.finalStateAllowed !== false) {
    issues.push(issue('CONTRACT_TS09V_EXCEPTION_WEAK', 'TS-09V exception/debt class must require I-09S and I-09A and keep verification forbidden until ready', { ts09v }));
  }
  const transient = byId.get('transient-build-outputs-ts-root-evidence-only');
  if (!isObject(transient) || transient.allowedRoot !== '.vibe/work/TS-ROOT-build-export-contract/**' || transient.productDistMutationAllowed !== false || transient.finalStateAllowed !== false || !setEquals(asSet(transient.forbiddenProductRoots), ['packages/**/dist/**'])) {
    issues.push(issue('CONTRACT_TRANSIENT_EXCEPTION_WEAK', 'transient build outputs must be evidence-only and forbid product dist mutation', { transient }));
  }
  return issues;
}
function validateContract(contract, schema) {
  const issues = [];
  if (contract.$schema !== './build-export-contract.schema.json') issues.push(issue('CONTRACT_SCHEMA_POINTER', 'contract $schema mismatch', { actual: contract.$schema }));
  if (contract.schemaVersion !== 'build-export-contract/1.0.0') issues.push(issue('CONTRACT_SCHEMA_VERSION', 'schemaVersion mismatch', { actual: contract.schemaVersion }));
  if (contract.contractId !== 'TS-ROOT-build-export-contract') issues.push(issue('CONTRACT_ID', 'contractId mismatch', { actual: contract.contractId }));
  if (contract.status !== 'active') issues.push(issue('CONTRACT_STATUS', 'status must be active', { actual: contract.status }));
  issues.push(...validateExceptionClasses(contract));
  for (const task of ['build', 'typecheck', 'test']) {
    const root = contract.rootScripts?.[task];
    if (!isObject(root) || root.delegatesToTurbo !== true || root.usesWorkspaceExecution !== true || !scriptDelegates(root.command, task)) issues.push(issue('CONTRACT_ROOT_SCRIPT_WEAK', `contract rootScripts.${task} must encode Turbo workspace delegation`, { root }));
    const turbo = contract.turboTasks?.[task];
    if (!isObject(turbo) || turbo.required !== true || !Array.isArray(turbo.dependsOn) || !Array.isArray(turbo.outputs)) issues.push(issue('CONTRACT_TURBO_TASK_WEAK', `contract turboTasks.${task} must be typed and required`, { turbo }));
  }
  if (!setEquals(asSet(contract.rootScripts?.preserved), ['workspace:graph', 'workspace:surface'])) issues.push(issue('CONTRACT_PRESERVED_SCRIPTS_WEAK', 'contract must preserve workspace:graph and workspace:surface exactly', { actual: contract.rootScripts?.preserved }));
  for (const flag of requiredTrueFlags) if (!contract.strictCompilerOptions?.requiredTrue?.includes(flag)) issues.push(issue('CONTRACT_STRICT_TRUE_MISSING', `contract strict requiredTrue missing ${flag}`));
  for (const flag of requiredFalseFlags) if (!contract.strictCompilerOptions?.requiredFalse?.includes(flag)) issues.push(issue('CONTRACT_STRICT_FALSE_MISSING', `contract strict requiredFalse missing ${flag}`));
  if (!contract.strictCompilerOptions?.forbidden?.includes('allowJs')) issues.push(issue('CONTRACT_ALLOWJS_FORBIDDEN_MISSING', 'contract must forbid allowJs'));
  const tsconfigPolicy = contract.packageTsconfigConvention;
  if (!isObject(tsconfigPolicy) || hasOwn(tsconfigPolicy, 'requirements') || tsconfigPolicy.policyId !== 'package-tsconfig-convention' || tsconfigPolicy.requiredBuildShape?.outDir !== 'dist' || tsconfigPolicy.requiredBuildShape?.declaration !== true || tsconfigPolicy.forbiddenCompilerOptions?.[0] !== 'allowJs' || tsconfigPolicy.runtimeImportWitnessRequired !== true) {
    issues.push(issue('CONTRACT_PACKAGE_TSCONFIG_POLICY_WEAK', 'package tsconfig convention must be typed, strict, dist/declarations/no allowJs, not freeform', { tsconfigPolicy }));
  }
  const exportPolicy = contract.packageExportConvention;
  if (!isObject(exportPolicy) || hasOwn(exportPolicy, 'requirements') || exportPolicy.runtimeExports?.requiredTargetPattern !== 'dist/**/*.js' || exportPolicy.runtimeExports?.sourceJsAllowedFinalState !== false || exportPolicy.typesExports?.requiredTargetPattern !== 'dist/**/*.d.ts' || exportPolicy.binEntries?.sourceJsAllowedFinalState !== false || exportPolicy.currentSourceJsDebt?.finalAllowlist !== false) {
    issues.push(issue('CONTRACT_PACKAGE_EXPORT_POLICY_WEAK', 'package export/types/bin convention must target generated dist and forbid source JS final state', { exportPolicy }));
  }
  const distPolicy = contract.generatedDistPolicy;
  if (!isObject(distPolicy) || hasOwn(distPolicy, 'requirements') || distPolicy.allowedOnlyWhen?.matchingTypeScriptSource !== true || distPolicy.allowedOnlyWhen?.matchingDeclarationOutput !== true || distPolicy.allowedOnlyWhen?.producedByBuild !== true || distPolicy.forbiddenUses?.handWrittenDistAllowed !== false || distPolicy.tsRootWitnessOutputs?.productDistWriteAllowed !== false) {
    issues.push(issue('CONTRACT_GENERATED_DIST_POLICY_WEAK', 'generated dist policy must require TS source, declarations, build evidence, and forbid product dist writes by TS-ROOT', { distPolicy }));
  }
  const debt = contract.sourceJsDebtPolicy;
  if (!isObject(debt) || debt.productionJsIsDebt !== true || debt.auditedProductionJsCount !== 43) issues.push(issue('CONTRACT_SOURCE_JS_DEBT_POLICY_WEAK', 'source JS policy must keep audited production JS as debt count 43', { debt }));
  if (debt?.workspaceSurfaceWitness?.path !== '.vibe/work/I-00A-workspace-package-skeleton/witnesses/workspace-surface-witness.mjs' || debt?.workspaceSurfaceWitness?.finalStateAllowed !== false) issues.push(issue('CONTRACT_WORKSPACE_SURFACE_DEBT_WEAK', 'workspace surface witness must be evidence-only and not final state', { value: debt?.workspaceSurfaceWitness }));
  if (!Array.isArray(debt?.currentSourceJsExportsAndBins) || !debt.currentSourceJsExportsAndBins.some((entry) => entry.path === 'packages/verification/package.json#/exports/.' && entry.finalStateAllowed === false)) issues.push(issue('CONTRACT_VERIFICATION_EXPORT_DEBT_MISSING', 'verification source-JS export must be classified as TS-09V debt', { value: debt?.currentSourceJsExportsAndBins }));
  const deferral = contract.ts09vDeferral;
  if (!isObject(deferral) || deferral.deferred !== true || !setEquals(asSet(deferral.requiredIndependentPasses), ['I-09S', 'I-09A']) || !Array.isArray(deferral.forbiddenUntilReady) || !deferral.forbiddenUntilReady.includes('packages/verification/**')) issues.push(issue('CONTRACT_TS09V_DEFERRAL_WEAK', 'TS-09V deferral must require I-09S + I-09A and forbid verification paths', { deferral }));
  const witness = contract.witnessPolicy;
  if (witness?.structuredContractWitness?.parsesActualJsonFiles !== true || witness?.structuredContractWitness?.regexOrProseSufficient !== false || witness?.realBoundaryWitness?.actualRootScriptToTurboToPackageBuild !== true || witness?.realBoundaryWitness?.packageExportImportRequired !== true) {
    issues.push(issue('CONTRACT_WITNESS_POLICY_WEAK', 'witness policy must require parsed JSON and real boundary root/Turbo/package-export proof', { witness }));
  }
  issues.push(...validateSchemaStructure(schema));
  return issues;
}
function pointsToSourceJs(value) {
  if (typeof value === 'string') {
    const normalized = value.replaceAll('\\', '/');
    const parts = normalized.split('/');
    const last = parts.at(-1) ?? '';
    return parts.includes('src') && /\.(js|mjs|cjs)$/u.test(last);
  }
  if (Array.isArray(value)) return value.some(pointsToSourceJs);
  if (isObject(value)) return Object.values(value).some(pointsToSourceJs);
  return false;
}
function validatePackageFinalState(packageJson) {
  const issues = [];
  if (pointsToSourceJs(packageJson.exports)) issues.push(issue('PACKAGE_EXPORT_SOURCE_JS_FINAL_STATE', 'exports point to src JS/MJS/CJS as final state'));
  if (pointsToSourceJs(packageJson.bin)) issues.push(issue('PACKAGE_BIN_SOURCE_JS_FINAL_STATE', 'bin points to src JS/MJS/CJS as final state'));
  if (typeof packageJson.types === 'string' && packageJson.types.replaceAll('\\', '/').split('/').includes('src')) issues.push(issue('PACKAGE_TYPES_SOURCE_FINAL_STATE', 'types points to source instead of dist declarations'));
  return issues;
}
function validateGeneratedDistFixture(dir) {
  const issues = [];
  if (fs.existsSync(path.join(dir, 'dist/index.js'))) {
    if (!fs.existsSync(path.join(dir, 'src/index.ts'))) issues.push(issue('DIST_WITHOUT_TS_SOURCE', 'generated dist JS missing matching TS source'));
    if (!fs.existsSync(path.join(dir, 'dist/index.d.ts'))) issues.push(issue('DIST_WITHOUT_DECLARATION', 'generated dist JS missing declaration'));
    if (!fs.existsSync(path.join(dir, 'build-evidence.json'))) issues.push(issue('DIST_WITHOUT_BUILD_EVIDENCE', 'generated dist JS missing build evidence'));
  }
  return issues;
}
function runJsonschema(schema, instances) {
  const input = JSON.stringify({ schema, instances });
  const code = `import json, sys\ntry:\n    import jsonschema\nexcept Exception as exc:\n    print(json.dumps({'available': False, 'error': str(exc)}))\n    sys.exit(0)\ndata=json.load(sys.stdin)\nschema=data['schema']\ntry:\n    jsonschema.Draft202012Validator.check_schema(schema)\n    schema_errors=[]\nexcept Exception as exc:\n    schema_errors=[str(exc)]\nvalidator=jsonschema.Draft202012Validator(schema)\nresults=[]\nfor item in data['instances']:\n    errors=[{'path':'/'.join(str(p) for p in e.absolute_path),'schemaPath':'/'.join(str(p) for p in e.absolute_schema_path),'message':e.message} for e in validator.iter_errors(item['value'])]\n    results.append({'name': item['name'], 'errorCount': len(errors), 'errors': errors[:20]})\nprint(json.dumps({'available': True, 'schemaErrors': schema_errors, 'results': results}, indent=2))`;
  const run = spawnSync('python3', ['-c', code], { input, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (run.status !== 0) return { available: false, runnerExitCode: run.status, stderr: run.stderr, stdout: run.stdout };
  try {
    return JSON.parse(run.stdout);
  } catch (error) {
    return { available: false, parseError: String(error), stdout: run.stdout, stderr: run.stderr };
  }
}
function writeNegativeFixtures(base) {
  fs.rmSync(negativeRoot, { recursive: true, force: true });
  fs.mkdirSync(negativeRoot, { recursive: true });
  const contractFixtures = [];
  function addContractFixture(name, mutator) {
    const value = clone(base.contract);
    mutator(value);
    const file = path.join(negativeRoot, `${name}.json`);
    writeJson(file, value);
    contractFixtures.push({ name, value, file });
  }
  addContractFixture('missing-exceptionClasses', (value) => { delete value.exceptionClasses; });
  addContractFixture('extra-exception-class', (value) => { value.exceptionClasses.push({ id: 'permissive-extra-exception', category: 'bad', finalStateAllowed: true }); });
  for (const id of expectedExceptionIds) addContractFixture(`missing-exception-${id}`, (value) => { value.exceptionClasses = value.exceptionClasses.filter((entry) => entry.id !== id); });
  addContractFixture('preserved-missing-workspace-surface', (value) => { value.rootScripts.preserved = ['workspace:graph']; });
  addContractFixture('preserved-missing-workspace-graph', (value) => { value.rootScripts.preserved = ['workspace:surface']; });
  addContractFixture('ts09v-missing-i09s', (value) => { value.ts09vDeferral.requiredIndependentPasses = ['I-09A']; value.exceptionClasses[2].requiredIndependentPasses = ['I-09A']; });
  addContractFixture('ts09v-missing-i09a', (value) => { value.ts09vDeferral.requiredIndependentPasses = ['I-09S']; value.exceptionClasses[2].requiredIndependentPasses = ['I-09S']; });
  addContractFixture('package-tsconfig-freeform-requirements', (value) => { value.packageTsconfigConvention = { requirements: ['extend base and build to dist'] }; });
  addContractFixture('package-export-freeform-requirements', (value) => { value.packageExportConvention = { requirements: ['exports must point to dist'] }; });
  addContractFixture('generated-dist-freeform-requirements', (value) => { value.generatedDistPolicy = { requirements: ['generated dist needs proof'] }; });
  addContractFixture('contract-omits-ts09v-deferral', (value) => { delete value.ts09vDeferral; });
  addContractFixture('audited-production-js-final-allowlist', (value) => { value.sourceJsDebtPolicy.productionJsIsDebt = false; value.exceptionClasses[1].finalAllowlist = true; value.packageExportConvention.currentSourceJsDebt.finalAllowlist = true; });
  addContractFixture('source-js-export-final-state-allowed', (value) => { value.packageExportConvention.runtimeExports.sourceJsAllowedFinalState = true; });
  const strictFalse = clone(base.tsconfig);
  strictFalse.compilerOptions.strict = false;
  writeJson(path.join(negativeRoot, 'tsconfig-strict-false.json'), strictFalse);
  const allowJs = clone(base.tsconfig);
  allowJs.compilerOptions.allowJs = true;
  writeJson(path.join(negativeRoot, 'tsconfig-allowJs-true.json'), allowJs);
  const missingBuild = clone(base.rootPackage);
  delete missingBuild.scripts.build;
  writeJson(path.join(negativeRoot, 'root-build-missing.package.json'), missingBuild);
  const bypassTypecheck = clone(base.rootPackage);
  bypassTypecheck.scripts.typecheck = 'pnpm -r run typecheck';
  writeJson(path.join(negativeRoot, 'root-typecheck-bypasses-turbo.package.json'), bypassTypecheck);
  const bypassTest = clone(base.rootPackage);
  bypassTest.scripts.test = 'pnpm -r test';
  writeJson(path.join(negativeRoot, 'root-test-bypasses-turbo.package.json'), bypassTest);
  const missingTurbo = clone(base.turbo);
  delete missingTurbo.tasks.build;
  writeJson(path.join(negativeRoot, 'turbo-build-task-missing.json'), missingTurbo);
  const sourcePackage = { name: '@fixture/source-js-final-state', type: 'module', exports: { '.': './src/index.js' }, bin: { cli: './src/index.js' }, types: './src/index.d.ts' };
  writeJson(path.join(negativeRoot, 'package-export-bin-source-js-final-state.json'), sourcePackage);
  const badDist = path.join(negativeRoot, 'generated-dist-without-source-declaration-build-evidence');
  fs.mkdirSync(path.join(badDist, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(badDist, 'dist/index.js'), 'export const bad = true;\n');
  writeJson(path.join(badDist, 'package.json'), { name: '@fixture/bad-dist', type: 'module', exports: { '.': './dist/index.js' }, types: './dist/index.d.ts' });
  return contractFixtures;
}
function verifyAuditedDebt() {
  const missing = auditedProductionJsDebt.filter((rel) => !fs.existsSync(path.join(repo, rel)));
  return { expectedCount: auditedProductionJsDebt.length, allPresent: missing.length === 0, missing };
}
function runNegativeStructuralChecks(base, contractFixtures, jsonschemaResult) {
  const jsonschemaByName = new Map((jsonschemaResult.results ?? []).map((entry) => [entry.name, entry]));
  const checks = [];
  for (const fixture of contractFixtures) {
    const structuralIssues = validateContract(fixture.value, base.schema);
    const schemaEntry = jsonschemaByName.get(fixture.name);
    checks.push({
      name: fixture.name,
      kind: 'contract',
      file: fixture.file,
      structuralRejected: structuralIssues.length > 0,
      structuralIssueCodes: structuralIssues.map((entry) => entry.code),
      schemaRejected: jsonschemaResult.available ? (schemaEntry?.errorCount ?? 0) > 0 : null,
      schemaErrorCount: schemaEntry?.errorCount ?? null,
    });
  }
  const otherChecks = [
    ['tsconfig-strict-false', 'tsconfig', () => validateTsconfig(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'tsconfig-strict-false.json'), 'utf8')))],
    ['tsconfig-allowJs-true', 'tsconfig', () => validateTsconfig(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'tsconfig-allowJs-true.json'), 'utf8')))],
    ['root-build-missing', 'rootPackage', () => validateRootPackage(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'root-build-missing.package.json'), 'utf8')))],
    ['root-typecheck-bypasses-turbo', 'rootPackage', () => validateRootPackage(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'root-typecheck-bypasses-turbo.package.json'), 'utf8')))],
    ['root-test-bypasses-turbo', 'rootPackage', () => validateRootPackage(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'root-test-bypasses-turbo.package.json'), 'utf8')))],
    ['turbo-build-task-missing', 'turbo', () => validateTurbo(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'turbo-build-task-missing.json'), 'utf8')))],
    ['package-export-bin-source-js-final-state', 'package', () => validatePackageFinalState(JSON.parse(fs.readFileSync(path.join(negativeRoot, 'package-export-bin-source-js-final-state.json'), 'utf8')))],
    ['generated-dist-without-source-declaration-build-evidence', 'dist', () => validateGeneratedDistFixture(path.join(negativeRoot, 'generated-dist-without-source-declaration-build-evidence'))],
  ];
  for (const [name, kind, check] of otherChecks) {
    const issues = check();
    checks.push({ name, kind, structuralRejected: issues.length > 0, structuralIssueCodes: issues.map((entry) => entry.code), schemaRejected: null, schemaErrorCount: null });
  }
  return checks;
}

const base = {
  rootPackage: readJson('package.json'),
  turbo: readJson('turbo.json'),
  tsconfig: readJson('tsconfig.base.json'),
  schema: readJson('packages/mechanical-gates/src/p0/build-export-contract/build-export-contract.schema.json'),
  contract: readJson('packages/mechanical-gates/src/p0/build-export-contract/build-export-contract.json'),
  verificationPackage: readJson('packages/verification/package.json'),
};
const contractFixtures = writeNegativeFixtures(base);
const jsonschemaResult = runJsonschema(base.schema, [{ name: 'actual-contract', value: base.contract }, ...contractFixtures.map(({ name, value }) => ({ name, value }))]);
const currentIssues = [
  ...validateRootPackage(base.rootPackage).map((entry) => ({ area: 'rootPackage', ...entry })),
  ...validateTurbo(base.turbo).map((entry) => ({ area: 'turbo', ...entry })),
  ...validateTsconfig(base.tsconfig).map((entry) => ({ area: 'tsconfig', ...entry })),
  ...validateContract(base.contract, base.schema).map((entry) => ({ area: 'contract', ...entry })),
];
if (jsonschemaResult.available) {
  if ((jsonschemaResult.schemaErrors ?? []).length > 0) currentIssues.push({ area: 'schema', code: 'JSONSCHEMA_SCHEMA_INVALID', message: 'JSON Schema 2020-12 checker rejected schema', details: jsonschemaResult.schemaErrors });
  const actual = (jsonschemaResult.results ?? []).find((entry) => entry.name === 'actual-contract');
  if (!actual || actual.errorCount !== 0) currentIssues.push({ area: 'schema', code: 'JSONSCHEMA_ACTUAL_CONTRACT_REJECTED', message: 'actual contract did not validate against schema', details: actual });
}
const negativeResults = runNegativeStructuralChecks(base, contractFixtures, jsonschemaResult);
const negativeFailures = negativeResults.filter((entry) => !entry.structuralRejected || (entry.kind === 'contract' && jsonschemaResult.available && !entry.schemaRejected));
const auditedDebt = verifyAuditedDebt();
if (!auditedDebt.allPresent) currentIssues.push({ area: 'auditedDebt', code: 'AUDITED_PRODUCTION_JS_MISSING', message: 'audited production JS/MJS debt was migrated/removed during TS-ROOT', details: auditedDebt });
const verificationExport = base.verificationPackage.exports?.['.'];
if (verificationExport !== './src/index.js') currentIssues.push({ area: 'ts09v', code: 'VERIFICATION_EXPORT_CHANGED', message: 'packages/verification export changed; TS-09V must remain deferred', details: { verificationExport } });
const result = {
  repo,
  evidenceRoot,
  resultPath,
  ok: currentIssues.length === 0 && negativeFailures.length === 0,
  jsonschema: jsonschemaResult,
  currentIssues,
  negativeResults,
  negativeFailures,
  rootScriptDirectWitness: validateRootScriptDefinitions(base.rootPackage),
  regression: {
    auditedProductionJsDebt: auditedDebt,
    verificationPackageExport: verificationExport,
    verificationClassifiedAsTs09vDebt: verificationExport === './src/index.js',
    workspaceSurfaceScript: base.rootPackage.scripts?.['workspace:surface'],
    contractExceptionClassIds: base.contract.exceptionClasses?.map((entry) => entry.id),
    ts09vRequiredIndependentPasses: base.contract.ts09vDeferral?.requiredIndependentPasses,
  },
};
writeJson(resultPath, result);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
