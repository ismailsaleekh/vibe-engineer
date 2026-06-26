import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const workRoot = join(repoRoot, '.vibe/work/I-07D-typescript-preset-package');
const evidenceRoot = join(workRoot, 'validator-evidence');
const compiledRoot = join(workRoot, 'validator-compiled');
const fixtureRoot = join(workRoot, 'validator-fixtures/strict-project');
const consumerRoot = join(workRoot, 'validator-fixtures/package-consumer');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');

const requiredStrictTrueFlags = Object.freeze([
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
]);

const requiredStrictFalseFlags = Object.freeze(['allowUnreachableCode', 'allowUnusedLabels']);

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });
  return {
    command: [command, ...args].join(' '),
    cwd,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function compactCommand(commandResult) {
  return {
    command: commandResult.command,
    cwd: commandResult.cwd,
    status: commandResult.status,
    signal: commandResult.signal,
    stdout: commandResult.stdout.slice(0, 6000),
    stderr: commandResult.stderr.slice(0, 6000),
  };
}

function assertCondition(condition, message, detail = {}) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail;
    throw error;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function byPath(files) {
  return new Map(files.map((file) => [file.path, file]));
}

function withMutatedContent(files, path, mutator) {
  return clone(files).map((file) => (file.path === path ? { ...file, content: mutator(file.content) } : file));
}

function resultCodes(result) {
  return result.ok ? [] : result.findings.map((finding) => finding.code);
}

function expectReject(api, name, files, expectedCode) {
  const result = api.validateTypeScriptPresetFiles(files);
  return {
    name,
    expectedCode,
    accepted: result.ok,
    observedCodes: resultCodes(result),
    pass: !result.ok && resultCodes(result).includes(expectedCode),
  };
}

function isPathSafe(path) {
  return path.length > 0
    && !path.startsWith('/')
    && !path.startsWith('\\')
    && !path.includes('\\')
    && path.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

async function writeGeneratedFiles(files) {
  await rm(fixtureRoot, { recursive: true, force: true });
  for (const file of files) {
    assertCondition(isPathSafe(file.path), 'renderer produced unsafe path', { path: file.path });
    const destination = resolve(fixtureRoot, file.path);
    assertCondition(destination === fixtureRoot || destination.startsWith(`${fixtureRoot}/`), 'renderer escaped fixture root', { path: file.path, destination });
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.content, 'utf8');
  }
}

async function readGeneratedFilesFromDisk(api) {
  const manifest = api.getTypeScriptPresetFileManifest();
  const manifestByPath = new Map(manifest.map((entry) => [entry.outputPath, entry]));
  const files = [];
  for (const entry of manifest) {
    if (entry.kind === 'source-fixture') {
      const samplePath = join(fixtureRoot, entry.outputPath);
      try {
        const sampleContent = await readFile(samplePath, 'utf8');
        files.push({ path: entry.outputPath, kind: entry.kind, content: sampleContent, manifest: entry });
      } catch {
        // sample source is optional in the public validator required-file set, but the default renderer should write it.
      }
      continue;
    }
    const content = await readFile(join(fixtureRoot, entry.outputPath), 'utf8');
    const manifestEntry = manifestByPath.get(entry.outputPath);
    assertCondition(manifestEntry !== undefined, 'manifest entry disappeared during readback', { path: entry.outputPath });
    files.push({ path: entry.outputPath, kind: entry.kind, content, manifest: manifestEntry });
  }
  return files;
}

async function parseGeneratedJson(path) {
  return JSON.parse(await readFile(join(fixtureRoot, path), 'utf8'));
}

async function setupConsumerFixture() {
  await rm(consumerRoot, { recursive: true, force: true });
  await mkdir(join(consumerRoot, 'node_modules/@vibe-engineer'), { recursive: true });
  await symlink(join(repoRoot, 'packages/presets/typescript'), join(consumerRoot, 'node_modules/@vibe-engineer/preset-typescript'), 'dir');
  await writeFile(join(consumerRoot, 'package.json'), JSON.stringify({ type: 'module', private: true }, null, 2), 'utf8');
  await writeFile(join(consumerRoot, 'tsconfig.json'), JSON.stringify({
    extends: join(repoRoot, 'tsconfig.base.json'),
    compilerOptions: {
      noEmit: true,
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      types: [],
    },
    include: ['public-api-consumer.ts'],
  }, null, 2), 'utf8');
  await writeFile(join(consumerRoot, 'public-api-consumer.ts'), `import {\n  TYPESCRIPT_COMPILER_STRICT_OPTIONS,\n  getTypeScriptPresetFileManifest,\n  getTypeScriptPresetMetadata,\n  renderTypeScriptPresetFiles,\n  validateTypeScriptPresetFiles,\n  type TypeScriptPresetValidationResult,\n} from '@vibe-engineer/preset-typescript';\n\nconst metadata = getTypeScriptPresetMetadata();\nconst manifest = getTypeScriptPresetFileManifest();\nconst files = renderTypeScriptPresetFiles();\nconst result: TypeScriptPresetValidationResult = validateTypeScriptPresetFiles(files);\nif (!result.ok) {\n  throw new Error(result.findings.map((finding) => finding.code).join(','));\n}\nexport const validatorConsumerResult = {\n  presetId: metadata.presetId,\n  manifestCount: manifest.length,\n  fileCount: result.fileCount,\n  strict: TYPESCRIPT_COMPILER_STRICT_OPTIONS.strict,\n} as const;\n`, 'utf8');
}

function rendererOptionEvidence(api) {
  const cases = [];
  for (const [name, options] of [
    ['unknown option silently ignored', { unexpectedOption: true }],
    ['wrong includeSampleSource type', { includeSampleSource: 'false' }],
    ['null options', null],
    ['path traversal packageDirectory', { packageDirectory: '../escape' }],
    ['forbidden testing packageName', { packageName: '@vibe-engineer/testing' }],
  ]) {
    try {
      const rendered = api.renderTypeScriptPresetFiles(options);
      cases.push({ name, accepted: true, returnedFileCount: Array.isArray(rendered) ? rendered.length : null, typedCode: null, pass: false });
    } catch (error) {
      cases.push({
        name,
        accepted: false,
        errorName: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        typedCode: typeof error === 'object' && error !== null && 'code' in error ? error.code : null,
        pass: false,
      });
    }
  }
  return cases;
}

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  await rm(compiledRoot, { recursive: true, force: true });
  await mkdir(compiledRoot, { recursive: true });
  await setupConsumerFixture();

  const commands = {};
  commands.packageTypecheck = run(tscBin, ['--noEmit', '-p', 'packages/presets/typescript/tsconfig.json', '--pretty', 'false'], repoRoot);
  commands.validatorConsumerTypecheck = run(tscBin, ['--noEmit', '-p', 'tsconfig.json', '--pretty', 'false'], consumerRoot);
  commands.packageCompile = run(tscBin, [
    '-p', 'packages/presets/typescript/tsconfig.json',
    '--noEmit', 'false',
    '--outDir', relative(repoRoot, compiledRoot),
    '--rootDir', 'packages/presets/typescript',
    '--declaration', 'true',
    '--declarationMap', 'true',
    '--sourceMap', 'true',
    '--pretty', 'false',
  ], repoRoot);
  commands.rootBarePackageImport = run('node', ['-e', "import('@vibe-engineer/preset-typescript').then((m)=>console.log(JSON.stringify({ok:true,keys:Object.keys(m).length}))).catch((error)=>{console.error(error instanceof Error ? error.message : String(error)); process.exit(1);})"], repoRoot);
  commands.consumerSymlinkPackageImport = run('node', ['-e', "import('@vibe-engineer/preset-typescript').then((m)=>{const files=m.renderTypeScriptPresetFiles(); const result=m.validateTypeScriptPresetFiles(files); console.log(JSON.stringify({ok:result.ok,fileCount:files.length,keys:Object.keys(m).length})); if(!result.ok) process.exit(2);}).catch((error)=>{console.error(error instanceof Error ? error.message : String(error)); process.exit(1);})"], consumerRoot);

  assertCondition(commands.packageTypecheck.status === 0, 'package typecheck failed', compactCommand(commands.packageTypecheck));
  assertCondition(commands.validatorConsumerTypecheck.status === 0, 'validator-owned consumer typecheck failed', compactCommand(commands.validatorConsumerTypecheck));
  assertCondition(commands.packageCompile.status === 0, 'package compile to workdir failed', compactCommand(commands.packageCompile));

  const api = await import(pathToFileURL(join(compiledRoot, 'src/index.js')).href);
  const rendered = api.renderTypeScriptPresetFiles();
  await writeGeneratedFiles(rendered);
  const diskFiles = await readGeneratedFilesFromDisk(api);
  const validation = api.validateTypeScriptPresetFiles(diskFiles);

  const rootTsconfig = await parseGeneratedJson('tsconfig.base.json');
  const packageTsconfig = await parseGeneratedJson('packages/example/tsconfig.json');
  const strictFlagEvidence = [];
  for (const flag of requiredStrictTrueFlags) {
    strictFlagEvidence.push({ flag, expected: true, actual: rootTsconfig.compilerOptions?.[flag], pass: rootTsconfig.compilerOptions?.[flag] === true });
  }
  for (const flag of requiredStrictFalseFlags) {
    strictFlagEvidence.push({ flag, expected: false, actual: rootTsconfig.compilerOptions?.[flag], pass: rootTsconfig.compilerOptions?.[flag] === false });
  }
  const packageTsconfigEvidence = {
    extends: packageTsconfig.extends,
    pass: packageTsconfig.extends === '../../tsconfig.base.json',
  };

  commands.generatedFixtureTsc = run(tscBin, ['-p', 'packages/example/tsconfig.json', '--noEmit', '--pretty', 'false'], fixtureRoot);

  const manifest = api.getTypeScriptPresetFileManifest();
  const standards = await import(pathToFileURL(join(repoRoot, 'packages/standards/src/index.js')).href);
  const standardsIds = new Set(standards.listStandards());
  const manifestStandardIds = [...new Set(manifest.flatMap((entry) => entry.requiredStandardIds))].sort();
  const standardsCompatibility = [];
  for (const standardId of manifestStandardIds) {
    const exists = standardsIds.has(standardId);
    let validates = false;
    if (exists) {
      validates = standards.validateStandardDefinition(standards.loadStandard(standardId)).ok === true;
    }
    standardsCompatibility.push({ standardId, exists, validates, pass: exists && validates });
  }
  commands.standardsRegression = run('node', ['packages/standards/fixtures/run-witnesses.mjs'], repoRoot, {
    I07C_EVIDENCE_DIR: join(evidenceRoot, 'standards-regression'),
  });

  const negativeResults = [];
  negativeResults.push(expectReject(api, 'strict:false', withMutatedContent(diskFiles, 'tsconfig.base.json', (content) => content.replace('"strict": true', '"strict": false')), 'PRESET_STRICT_FLAG_WEAKENED'));
  negativeResults.push(expectReject(api, 'missing noUncheckedIndexedAccess', withMutatedContent(diskFiles, 'tsconfig.base.json', (content) => content.replace('    "noUncheckedIndexedAccess": true,\n', '')), 'PRESET_STRICT_FLAG_WEAKENED'));
  negativeResults.push(expectReject(api, 'missing exactOptionalPropertyTypes', withMutatedContent(diskFiles, 'tsconfig.base.json', (content) => content.replace('    "exactOptionalPropertyTypes": true,\n', '')), 'PRESET_STRICT_FLAG_WEAKENED'));
  negativeResults.push(expectReject(api, 'missing noImplicitOverride', withMutatedContent(diskFiles, 'tsconfig.base.json', (content) => content.replace('    "noImplicitOverride": true,\n', '')), 'PRESET_STRICT_FLAG_WEAKENED'));
  negativeResults.push(expectReject(api, 'package tsconfig does not extend base', withMutatedContent(diskFiles, 'packages/example/tsconfig.json', (content) => content.replace('"../../tsconfig.base.json"', '"./tsconfig.loose.json"')), 'PRESET_PACKAGE_TSCONFIG_WEAKENED'));
  negativeResults.push(expectReject(api, 'eslint policy missing no-explicit-any', withMutatedContent(diskFiles, '.vibe/generated/typescript-preset/eslint-policy.json', (content) => {
    const policy = JSON.parse(content);
    policy.rules = policy.rules.filter((rule) => rule.name !== '@typescript-eslint/no-explicit-any');
    return `${JSON.stringify(policy, null, 2)}\n`;
  }), 'PRESET_ESLINT_RULE_MISSING'));
  negativeResults.push(expectReject(api, 'eslint config missing no-explicit-any while policy stale', withMutatedContent(diskFiles, 'eslint.config.mjs', (content) => content.replace('      "@typescript-eslint/no-explicit-any": "error",\n', '')), 'PRESET_ESLINT_RULE_MISSING'));
  negativeResults.push(expectReject(api, 'prettier policy missing printWidth', withMutatedContent(diskFiles, '.vibe/generated/typescript-preset/prettier-policy.json', (content) => {
    const policy = JSON.parse(content);
    delete policy.printWidth;
    return `${JSON.stringify(policy, null, 2)}\n`;
  }), 'PRESET_PRETTIER_DEFAULT_MISSING'));
  negativeResults.push(expectReject(api, 'prettier config missing deterministic settings while policy stale', withMutatedContent(diskFiles, 'prettier.config.mjs', () => 'export default {};\n'), 'PRESET_PRETTIER_DEFAULT_MISSING'));
  negativeResults.push(expectReject(api, 'path traversal', [{ ...clone(diskFiles[0]), path: '../escape.json', manifest: { ...clone(diskFiles[0].manifest), outputPath: '../escape.json' } }, ...clone(diskFiles.slice(1))], 'PRESET_UNSAFE_GENERATED_PATH'));
  negativeResults.push(expectReject(api, 'absolute path', [{ ...clone(diskFiles[0]), path: '/tmp/escape.json', manifest: { ...clone(diskFiles[0].manifest), outputPath: '/tmp/escape.json' } }, ...clone(diskFiles.slice(1))], 'PRESET_UNSAFE_GENERATED_PATH'));
  negativeResults.push(expectReject(api, 'duplicate output path', [clone(diskFiles[0]), { ...clone(diskFiles[1]), path: diskFiles[0].path, manifest: { ...clone(diskFiles[1].manifest), outputPath: diskFiles[0].path } }, ...clone(diskFiles.slice(2))], 'PRESET_DUPLICATE_GENERATED_PATH'));
  negativeResults.push(expectReject(api, 'missing required generated file', clone(diskFiles).filter((file) => file.path !== 'turbo.json'), 'PRESET_MISSING_REQUIRED_FILE'));
  negativeResults.push(expectReject(api, 'malformed generated JSON', withMutatedContent(diskFiles, 'tsconfig.base.json', () => '{'), 'PRESET_MALFORMED_JSON'));
  negativeResults.push(expectReject(api, 'file manifest outputPath mismatch', [{ ...clone(diskFiles[0]), manifest: { ...clone(diskFiles[0].manifest), outputPath: 'wrong.json' } }, ...clone(diskFiles.slice(1))], 'PRESET_MANIFEST_CONTENT_MISMATCH'));
  negativeResults.push(expectReject(api, 'file manifest kind mismatch', [{ ...clone(diskFiles[0]), kind: 'eslint-config' }, ...clone(diskFiles.slice(1))], 'PRESET_MANIFEST_CONTENT_MISMATCH'));
  negativeResults.push(expectReject(api, 'file manifest standardIds emptied', [{ ...clone(diskFiles[0]), manifest: { ...clone(diskFiles[0].manifest), requiredStandardIds: [] } }, ...clone(diskFiles.slice(1))], 'PRESET_MANIFEST_CONTENT_MISMATCH'));
  negativeResults.push(expectReject(api, 'generated manifest omits kind field', withMutatedContent(diskFiles, '.vibe/generated/typescript-preset/manifest.json', (content) => {
    const manifestJson = JSON.parse(content);
    delete manifestJson.files[0].kind;
    return `${JSON.stringify(manifestJson, null, 2)}\n`;
  }), 'PRESET_MANIFEST_CONTENT_MISMATCH'));
  negativeResults.push(expectReject(api, 'domain-specific vocabulary in core output', withMutatedContent(diskFiles, '.vibe/generated/typescript-preset/manifest.json', (content) => content.replace('TypeScript Strict Preset', 'TypeScript checkout Preset')), 'PRESET_DOMAIN_SPECIFIC_CORE_TEXT'));
  negativeResults.push(expectReject(api, 'quick gate full e2e default', withMutatedContent(diskFiles, 'package.json', (content) => content.replace('pnpm run build', 'pnpm run build && pnpm run full:e2e')), 'PRESET_FORBIDDEN_DEFAULT_COMMAND'));
  negativeResults.push(expectReject(api, 'quick gate full mobile e2e default', withMutatedContent(diskFiles, 'package.json', (content) => content.replace('pnpm run build', 'pnpm run build && pnpm run mobile:e2e:full')), 'PRESET_FORBIDDEN_DEFAULT_COMMAND'));
  negativeResults.push(expectReject(api, 'quick gate full visual default', withMutatedContent(diskFiles, 'package.json', (content) => content.replace('pnpm run build', 'pnpm run build && pnpm run visual:full')), 'PRESET_FORBIDDEN_DEFAULT_COMMAND'));
  negativeResults.push(expectReject(api, 'quick gate generic deploy default', withMutatedContent(diskFiles, 'package.json', (content) => content.replace('pnpm run build', 'pnpm run build && pnpm run deploy')), 'PRESET_FORBIDDEN_DEFAULT_COMMAND'));
  negativeResults.push(expectReject(api, 'quick gate pulumi deploy alias default', withMutatedContent(diskFiles, 'package.json', (content) => content.replace('pnpm run build', 'pnpm run build && pnpm run pulumi:deploy')), 'PRESET_FORBIDDEN_DEFAULT_COMMAND'));
  negativeResults.push(expectReject(api, 'quick gate pulumi up default', withMutatedContent(diskFiles, 'package.json', (content) => content.replace('pnpm run build', 'pnpm run build && pulumi up')), 'PRESET_FORBIDDEN_DEFAULT_COMMAND'));
  negativeResults.push(expectReject(api, 'testing production dependency', withMutatedContent(diskFiles, 'package.json', (content) => content.replace('"devDependencies": {', '"dependencies": { "@vibe-engineer/testing": "workspace:*" },\n    "devDependencies": {')), 'PRESET_FORBIDDEN_TESTING_PRODUCTION_DEPENDENCY'));
  negativeResults.push(expectReject(api, 'validator malformed non-array input', { path: 'tsconfig.base.json' }, 'PRESET_MALFORMED_RENDER_OPTIONS'));
  negativeResults.push(expectReject(api, 'validator malformed file object', [{ path: 'x', content: 'x' }], 'PRESET_MALFORMED_RENDER_OPTIONS'));

  const rendererOptions = rendererOptionEvidence(api);

  const manifestCopyA = api.getTypeScriptPresetFileManifest();
  const manifestCopyOriginalLength = manifestCopyA[0].requiredStandardIds.length;
  let manifestMutationThrew = false;
  try {
    manifestCopyA[0].requiredStandardIds.push('mutated');
  } catch {
    manifestMutationThrew = true;
  }
  const manifestCopyB = api.getTypeScriptPresetFileManifest();
  const defensiveCopy = {
    mutationThrew: manifestMutationThrew,
    originalLength: manifestCopyOriginalLength,
    afterLength: manifestCopyB[0].requiredStandardIds.length,
    pass: manifestMutationThrew || manifestCopyB[0].requiredStandardIds.length === manifestCopyOriginalLength,
  };

  const packageJson = JSON.parse(await readFile(join(repoRoot, 'packages/presets/typescript/package.json'), 'utf8'));
  const exportsEvidence = {
    private: packageJson.private,
    dependencies: packageJson.dependencies ?? null,
    devDependencies: packageJson.devDependencies ?? null,
    exportsImport: packageJson.exports?.['.']?.import,
    exportsTypes: packageJson.exports?.['.']?.types,
    exportImportExists: packageJson.exports?.['.']?.import === './src/index.ts',
    exportTypesExists: packageJson.exports?.['.']?.types === './src/index.ts',
  };

  const templates = {};
  for (const name of ['strict-tsconfig-base.json', 'package-tsconfig.json', 'eslint-policy.json', 'prettier-defaults.json', 'pnpm-workspace-defaults.json', 'turbo-task-defaults.json', 'package-script-defaults.json', 'test-typecheck-defaults.json']) {
    templates[name] = { parsed: true, keys: Object.keys(JSON.parse(await readFile(join(repoRoot, 'packages/presets/typescript/templates', name), 'utf8'))).sort() };
  }

  const sourceJsScan = run('find', ['packages/presets/typescript/src', '-type', 'f', '(', '-name', '*.js', '-o', '-name', '*.mjs', '-o', '-name', '*.cjs', ')', '-print'], repoRoot);
  const noProductBuildOutput = run('find', ['packages/presets/typescript', '(', '-path', 'packages/presets/typescript/dist', '-o', '-path', 'packages/presets/typescript/dist/*', '-o', '-path', 'packages/presets/typescript/build', '-o', '-path', 'packages/presets/typescript/build/*', ')', '-print'], repoRoot);

  const positiveChecks = {
    packageTypecheck: commands.packageTypecheck.status === 0,
    validatorConsumerTypecheck: commands.validatorConsumerTypecheck.status === 0,
    packageCompile: commands.packageCompile.status === 0,
    consumerSymlinkPackageImport: commands.consumerSymlinkPackageImport.status === 0,
    generatedValidation: validation.ok === true,
    strictFlags: strictFlagEvidence.every((entry) => entry.pass),
    packageTsconfigExtends: packageTsconfigEvidence.pass,
    generatedFixtureTsc: commands.generatedFixtureTsc.status === 0,
    standardsIds: standardsCompatibility.every((entry) => entry.pass),
    standardsRegression: commands.standardsRegression.status === 0,
    defensiveCopy: defensiveCopy.pass,
    sourceTsOnly: sourceJsScan.status === 0 && sourceJsScan.stdout.trim() === '',
    noProductBuildOutput: noProductBuildOutput.status === 0 && noProductBuildOutput.stdout.trim() === '',
  };

  const unexpectedNegativePasses = negativeResults.filter((entry) => !entry.pass);
  const rendererOptionFailures = rendererOptions.filter((entry) => !entry.pass);
  const commandEvidence = Object.fromEntries(Object.entries(commands).map(([key, value]) => [key, compactCommand(value)]));
  commandEvidence.sourceJsScan = compactCommand(sourceJsScan);
  commandEvidence.noProductBuildOutput = compactCommand(noProductBuildOutput);

  const result = {
    ok: Object.values(positiveChecks).every(Boolean) && unexpectedNegativePasses.length === 0 && rendererOptionFailures.length === 0,
    repoRoot,
    workRoot,
    fixtureRoot,
    compiledRoot,
    consumerRoot,
    commands: commandEvidence,
    exportsEvidence,
    renderedFileCount: rendered.length,
    diskFileCount: diskFiles.length,
    validation: validation.ok ? { ok: true, fileCount: validation.fileCount } : { ok: false, findings: validation.findings },
    strictFlagEvidence,
    packageTsconfigEvidence,
    standardsCompatibility,
    manifestStandardIds,
    negativeResults,
    unexpectedNegativePasses,
    rendererOptions,
    rendererOptionFailures,
    defensiveCopy,
    templates,
    positiveChecks,
  };

  const resultPath = join(evidenceRoot, 'i07d-validator-witness-result.json');
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: result.ok, resultPath, unexpectedNegativePassCount: unexpectedNegativePasses.length, rendererOptionFailureCount: rendererOptionFailures.length }, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  await mkdir(evidenceRoot, { recursive: true });
  const resultPath = join(evidenceRoot, 'i07d-validator-witness-result.json');
  const payload = {
    ok: false,
    error: {
      message: error instanceof Error ? error.message : String(error),
      detail: error && typeof error === 'object' && 'detail' in error ? error.detail : null,
      stack: error instanceof Error ? error.stack : null,
    },
  };
  await writeFile(resultPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.error(JSON.stringify({ ok: false, resultPath, error: payload.error }, null, 2));
  process.exitCode = 1;
});
