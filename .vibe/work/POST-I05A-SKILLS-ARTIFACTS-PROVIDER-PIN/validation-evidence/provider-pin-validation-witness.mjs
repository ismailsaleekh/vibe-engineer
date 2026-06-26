import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = '/Users/lizavasilyeva/work/vibe-engineer';
const ev = path.join(root, '.vibe/work/POST-I05A-SKILLS-ARTIFACTS-PROVIDER-PIN/validation-evidence');
const resultsDir = path.join(ev, 'witness-results');
const fixturesDir = path.join(ev, 'validator-owned-fixtures');
fs.mkdirSync(resultsDir, { recursive: true });
fs.mkdirSync(fixturesDir, { recursive: true });

const result = {
  ok: false,
  checks: [],
  commandResults: [],
  negativeChecks: [],
  malformedFixture: null,
  siblingConsumers: [],
  rootBareImport: null
};

function rel(p) {
  return path.relative(root, p).replaceAll(path.sep, '/');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function record(name, details = {}) {
  result.checks.push({ name, ok: true, ...details });
}

function fail(name, error, details = {}) {
  result.checks.push({ name, ok: false, error: String(error?.stack ?? error), ...details });
  throw error;
}

function assertCheck(name, fn) {
  try {
    const details = fn() ?? {};
    record(name, details);
  } catch (error) {
    fail(name, error);
  }
}

function importerBlock(lockText, importer) {
  const lines = lockText.split(/\r?\n/);
  const key = `  ${importer}:`;
  const start = lines.indexOf(key);
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length) {
    const line = lines[end];
    if (line.startsWith('  ') && !line.startsWith('    ') && line.endsWith(':')) break;
    end += 1;
  }
  return lines.slice(start, end).join('\n');
}

function hasArtifactsLockEdge(lockText, importer) {
  const block = importerBlock(lockText, importer);
  return Boolean(block && block.includes("'@vibe-engineer/artifacts':") && block.includes('specifier: workspace:*') && block.includes('version: link:../artifacts'));
}

function run(command, args, options = {}) {
  const spawned = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, ...(options.env ?? {}) }
  });
  const row = {
    label: options.label ?? [command, ...args].join(' '),
    cwd: options.cwd ?? root,
    command,
    args,
    status: spawned.status,
    signal: spawned.signal,
    stdout: spawned.stdout,
    stderr: spawned.stderr,
    expected: options.expected
  };
  result.commandResults.push(row);
  if (options.expected !== undefined) assert.equal(spawned.status, options.expected, `${row.label} expected exit ${options.expected}, got ${spawned.status}; stderr=${spawned.stderr}`);
  return row;
}

function runNodeModuleProbe(label, cwd, code, expected = 0) {
  return run('node', ['--input-type=module', '-e', code], { label, cwd, expected });
}

function allFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...allFiles(p));
    else if (ent.isFile()) out.push(p);
  }
  return out;
}

function packageForFile(filePath) {
  const relative = rel(filePath);
  const parts = relative.split('/');
  if (parts[0] !== 'packages' || parts.length < 2) return null;
  if (parts[1] === 'presets' || parts[1] === 'adapters') return parts.slice(0, 3).join('/');
  return parts.slice(0, 2).join('/');
}

assertCheck('skills manifest dependency and skeleton preservation', () => {
  const pkg = readJson('packages/skills/package.json');
  assert.equal(pkg.name, '@vibe-engineer/skills');
  assert.equal(pkg.version, '0.0.0');
  assert.equal(pkg.license, 'MIT');
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.private, true);
  assert.ok(pkg.description.includes('Skeleton manifest'));
  assert.equal(pkg.vibeEngineer?.implementationStatus, 'skeleton-only');
  assert.equal(pkg.dependencies?.['@vibe-engineer/artifacts'], 'workspace:*');
  assert.deepEqual(Object.keys(pkg.dependencies), ['@vibe-engineer/artifacts']);
  assert.equal(pkg.scripts, undefined);
  assert.equal(pkg.exports, undefined);
  assert.equal(pkg.source, undefined);
  return { dependencies: pkg.dependencies };
});

assertCheck('registry manifest dependency and metadata preservation', () => {
  const pkg = readJson('packages/registry/package.json');
  assert.equal(pkg.name, '@vibe-engineer/registry');
  assert.equal(pkg.dependencies?.['@vibe-engineer/artifacts'], 'workspace:*');
  assert.deepEqual(Object.keys(pkg.dependencies), ['@vibe-engineer/artifacts']);
  assert.deepEqual(pkg.exports, { '.': { types: './src/index.d.ts', import: './src/index.js' } });
  assert.deepEqual(pkg.scripts, {
    typecheck: 'tsc --noEmit -p tsconfig.json',
    test: 'node tests/run-tests.mjs',
    'test:fixtures': 'node tests/fixture-witness.mjs',
    build: 'node scripts/build-smoke.mjs'
  });
  assert.equal(pkg.vibeEngineer?.implementationUnit, 'I-04-agent-registry-validation');
  return { dependencies: pkg.dependencies };
});

assertCheck('registry runtime import uses public artifacts package only', () => {
  const text = readText('packages/registry/src/index.js');
  assert.match(text, /import \{ ARTIFACT_KINDS, loadSchema, validateArtifactFile \} from '@vibe-engineer\/artifacts';/);
  for (const forbidden of ['../../artifacts/src', '../artifacts/src', 'mockArtifact', 'fallback', 'dual import']) assert.equal(text.includes(forbidden), false, forbidden);
  assert.equal((text.match(/@vibe-engineer\/artifacts/g) ?? []).length, 1);
});

assertCheck('registry declaration imports public artifacts types only', () => {
  const text = readText('packages/registry/src/index.d.ts');
  assert.match(text, /import type \{ AgentRegistryEntryV1, ArtifactKind \} from '@vibe-engineer\/artifacts';/);
  for (const forbidden of ['../../artifacts/src', '../artifacts/src']) assert.equal(text.includes(forbidden), false, forbidden);
});

assertCheck('lockfile skills and registry importer edges', () => {
  const lock = readText('pnpm-lock.yaml');
  assert.equal(hasArtifactsLockEdge(lock, 'packages/skills'), true);
  assert.equal(hasArtifactsLockEdge(lock, 'packages/registry'), true);
  return { skillsBlock: importerBlock(lock, 'packages/skills'), registryBlock: importerBlock(lock, 'packages/registry') };
});

assertCheck('package-local artifacts links resolve to artifacts package', () => {
  const expected = path.join(root, 'packages/artifacts');
  const rows = [];
  for (const p of ['packages/skills/node_modules/@vibe-engineer/artifacts', 'packages/registry/node_modules/@vibe-engineer/artifacts']) {
    const full = path.join(root, p);
    assert.equal(fs.lstatSync(full).isSymbolicLink(), true, `${p} must be a symlink generated by pnpm workspace linking`);
    const target = fs.readlinkSync(full);
    const resolved = fs.realpathSync(full);
    assert.equal(resolved, expected);
    rows.push({ path: p, readlink: target, realpath: resolved });
  }
  return { links: rows };
});

assertCheck('root has no artifacts dependency or hoist workaround', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.dependencies?.['@vibe-engineer/artifacts'], undefined);
  assert.equal(pkg.devDependencies?.['@vibe-engineer/artifacts'], undefined);
  const npmrc = readText('.npmrc');
  assert.match(npmrc, /shamefully-hoist=false/);
  return { rootName: pkg.name };
});

assertCheck('workspace has no relative artifacts source reach-in outside artifacts package', () => {
  const offenders = [];
  for (const file of allFiles(path.join(root, 'packages'))) {
    const relative = rel(file);
    if (relative.startsWith('packages/artifacts/')) continue;
    if (!/\.(js|mjs|cjs|ts|tsx|d\.ts|json)$/.test(relative)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('../../artifacts/src') || text.includes('../artifacts/src')) offenders.push(relative);
  }
  assert.deepEqual(offenders, []);
});

assertCheck('source artifacts imports have manifest dependencies and lockfile edges', () => {
  const lock = readText('pnpm-lock.yaml');
  const packages = new Map();
  for (const file of allFiles(path.join(root, 'packages'))) {
    const relative = rel(file);
    if (relative.startsWith('packages/artifacts/')) continue;
    if (!/\.(js|mjs|cjs|ts|tsx|d\.ts)$/.test(relative)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('@vibe-engineer/artifacts')) {
      const pkgPath = packageForFile(file);
      if (pkgPath) {
        if (!packages.has(pkgPath)) packages.set(pkgPath, []);
        packages.get(pkgPath).push(relative);
      }
    }
  }
  const checked = [];
  for (const [pkgPath, files] of packages) {
    const manifest = readJson(`${pkgPath}/package.json`);
    assert.equal(manifest.dependencies?.['@vibe-engineer/artifacts'], 'workspace:*', `${pkgPath} missing manifest dependency`);
    assert.equal(hasArtifactsLockEdge(lock, pkgPath), true, `${pkgPath} missing lockfile edge`);
    checked.push({ pkgPath, packageName: manifest.name, files });
  }
  return { checked };
});

assertCheck('no production package depends on @vibe-engineer/testing in dependencies', () => {
  const offenders = [];
  for (const manifestPath of allFiles(path.join(root, 'packages')).filter((p) => p.endsWith('/package.json'))) {
    const relative = rel(manifestPath);
    if (relative.includes('/fixtures/')) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.dependencies?.['@vibe-engineer/testing']) offenders.push(relative);
  }
  assert.deepEqual(offenders, []);
});

assertCheck('no copied artifact validator/schema implementation outside artifacts', () => {
  const offenders = [];
  for (const file of allFiles(path.join(root, 'packages'))) {
    const relative = rel(file);
    if (relative.startsWith('packages/artifacts/')) continue;
    if (!/\.(js|mjs|cjs|ts|tsx|d\.ts|json)$/.test(relative)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const copiedArtifactValidator = /export function validateArtifact(File|Kind)?\b/.test(text) || /compileAllArtifactSchemas/.test(text);
    const copiedArtifactSchemaRegistry = /SCHEMA_FILES\s*=\s*\{/.test(text) && text.includes('work_brief') && text.includes('implementation_plan');
    const copiedArtifactSchemaFile = relative.includes('/schemas/') && text.includes('"artifactKind"') && text.includes('work_brief') && !relative.startsWith('packages/artifacts/');
    if (copiedArtifactValidator || copiedArtifactSchemaRegistry || copiedArtifactSchemaFile) offenders.push(relative);
  }
  assert.deepEqual(offenders, []);
});

// Validator-owned malformed Work Brief fixture: remove raw_intent link and rawIntentRefs.
const validWorkBrief = readJson('packages/artifacts/fixtures/valid/work_brief.json');
const malformed = structuredClone(validWorkBrief);
malformed.artifactId = 'validator-owned-missing-raw-intent';
malformed.links = [];
malformed.sourceMetadata.rawIntentRefs = [];
const malformedPath = path.join(fixturesDir, 'malformed-work-brief-missing-raw-intent.json');
fs.writeFileSync(malformedPath, JSON.stringify(malformed, null, 2) + '\n');
result.malformedFixture = rel(malformedPath);

runNodeModuleProbe('skills package-context public artifacts import and validator behavior', path.join(root, 'packages/skills'), `
  import assert from 'node:assert/strict';
  const mod = await import('@vibe-engineer/artifacts');
  assert.equal(typeof mod.validateArtifact, 'function');
  assert.equal(typeof mod.validateArtifactKind, 'function');
  assert.equal(typeof mod.validateArtifactFile, 'function');
  const valid = mod.validateArtifactFile('${root}/packages/artifacts/fixtures/valid/work_brief.json', { kind: 'work_brief' });
  assert.equal(valid.ok, true, JSON.stringify(valid.errors));
  const invalid = mod.validateArtifactFile('${malformedPath}', { kind: 'work_brief' });
  assert.equal(invalid.ok, false, 'missing raw_intent malformed Work Brief must reject');
  assert.equal(Array.isArray(invalid.errors), true);
  assert.ok(invalid.errors.some((error) => typeof error.pointer === 'string' && typeof error.code === 'string' && typeof error.message === 'string'));
  console.log(JSON.stringify({ publicImport: true, validOk: valid.ok, invalidOk: invalid.ok, invalidErrors: invalid.errors.map((e) => ({ pointer: e.pointer, code: e.code, message: e.message })) }));
`, 0);

runNodeModuleProbe('registry package-context public registry/artifacts import and fixture validation', path.join(root, 'packages/registry'), `
  import assert from 'node:assert/strict';
  const artifacts = await import('@vibe-engineer/artifacts');
  assert.ok(Array.isArray(artifacts.ARTIFACT_KINDS));
  assert.equal(typeof artifacts.loadSchema, 'function');
  assert.equal(typeof artifacts.validateArtifactFile, 'function');
  const registry = await import('@vibe-engineer/registry');
  assert.equal(typeof registry.canonicalSchemaIdsByKind, 'function');
  assert.equal(typeof registry.loadRegistry, 'function');
  const ids = registry.canonicalSchemaIdsByKind();
  assert.ok(ids.work_brief.endsWith('/work-brief.schema.json'));
  assert.ok(ids.agent_registry_entry.endsWith('/agent-registry-entry.schema.json'));
  const fixture = registry.loadRegistry('${root}/packages/registry/fixtures/valid/core-set');
  assert.equal(fixture.ok, true, fixture.errors.map((error) => error.message).join('; '));
  console.log(JSON.stringify({ artifactKinds: artifacts.ARTIFACT_KINDS.length, schemaIds: Object.keys(ids).length, registryFixtureEntries: fixture.entries.length }));
`, 0);

for (const consumer of [
  { label: 'cli', cwd: 'packages/cli', filter: 'vibe-engineer' },
  { label: 'context', cwd: 'packages/context', filter: '@vibe-engineer/context' },
  { label: 'orchestration', cwd: 'packages/orchestration', filter: '@vibe-engineer/orchestration' },
  { label: 'verification', cwd: 'packages/verification', filter: '@vibe-engineer/verification' }
]) {
  if (!fs.existsSync(path.join(root, consumer.cwd, 'package.json'))) continue;
  const direct = runNodeModuleProbe(`${consumer.label} direct package-context artifacts import`, path.join(root, consumer.cwd), `
    import assert from 'node:assert/strict';
    const mod = await import('@vibe-engineer/artifacts');
    assert.equal(typeof mod.validateArtifactFile, 'function');
    console.log('${consumer.label}:ok');
  `, 0);
  const filter = run('pnpm', ['--filter', consumer.filter, 'exec', 'node', '--input-type=module', '-e', "import { validateArtifactFile } from '@vibe-engineer/artifacts'; console.log(typeof validateArtifactFile);"], { label: `${consumer.label} pnpm-filter artifacts import`, cwd: root, expected: 0 });
  result.siblingConsumers.push({ label: consumer.label, directExit: direct.status, filterExit: filter.status, filter: consumer.filter });
}

result.rootBareImport = run('node', ['--input-type=module', '-e', `
  import { validateArtifactFile } from '@vibe-engineer/artifacts';
  console.log(typeof validateArtifactFile);
`], { label: 'root bare artifacts import non-consumer probe', cwd: root });

function expectNegative(name, fixture, checker) {
  let failedClosed = false;
  let message = '';
  try {
    checker(fixture);
  } catch (error) {
    failedClosed = true;
    message = String(error.message ?? error);
  }
  result.negativeChecks.push({ name, failedClosed, message });
  assert.equal(failedClosed, true, `${name} should fail closed`);
}

const currentLock = readText('pnpm-lock.yaml');
const currentSkills = readJson('packages/skills/package.json');
const currentRegistry = readJson('packages/registry/package.json');
const currentRoot = readJson('package.json');

expectNegative('missing skills artifacts dependency', { skills: { ...currentSkills, dependencies: {} } }, ({ skills }) => assert.equal(skills.dependencies?.['@vibe-engineer/artifacts'], 'workspace:*'));
expectNegative('missing registry artifacts dependency', { registry: { ...currentRegistry, dependencies: {} } }, ({ registry }) => assert.equal(registry.dependencies?.['@vibe-engineer/artifacts'], 'workspace:*'));
expectNegative('missing packages/skills lockfile importer edge', currentLock.replace(/  packages\/skills:\n    dependencies:\n      '@vibe-engineer\/artifacts':\n        specifier: workspace:\*\n        version: link:\.\.\/artifacts\n/, '  packages/skills: {}\n'), (lock) => assert.equal(hasArtifactsLockEdge(lock, 'packages/skills'), true));
expectNegative('missing packages/registry lockfile importer edge', currentLock.replace(/  packages\/registry:\n    dependencies:\n      '@vibe-engineer\/artifacts':\n        specifier: workspace:\*\n        version: link:\.\.\/artifacts\n/, '  packages/registry: {}\n'), (lock) => assert.equal(hasArtifactsLockEdge(lock, 'packages/registry'), true));
expectNegative('registry runtime relative artifacts reach-in', "import { ARTIFACT_KINDS } from '../../artifacts/src/index.js';", (text) => assert.equal(text.includes('../../artifacts/src'), false));
expectNegative('registry type relative artifacts reach-in', "import type { AgentRegistryEntryV1 } from '../../artifacts/src/generated/types.d.ts';", (text) => assert.equal(text.includes('../../artifacts/src'), false));
expectNegative('root package artifacts dependency workaround', { ...currentRoot, dependencies: { ...(currentRoot.dependencies ?? {}), '@vibe-engineer/artifacts': 'workspace:*' } }, (pkg) => assert.equal(pkg.dependencies?.['@vibe-engineer/artifacts'], undefined));
expectNegative('production @vibe-engineer/testing dependency', { dependencies: { '@vibe-engineer/testing': 'workspace:*' } }, (pkg) => assert.equal(pkg.dependencies?.['@vibe-engineer/testing'], undefined));
expectNegative('mock/relative validator accepted as proof', { proof: 'mock', importPath: '../../artifacts/src/index.js' }, (proof) => {
  assert.equal(proof.importPath, '@vibe-engineer/artifacts');
  assert.equal(proof.proof, 'real-public-package-import');
});

// Persist copied negative fixtures for auditability.
const negativeFixturePath = path.join(fixturesDir, 'negative-fixtures.json');
fs.writeFileSync(negativeFixturePath, JSON.stringify(result.negativeChecks, null, 2) + '\n');

result.ok = result.checks.every((check) => check.ok) && result.commandResults.filter((row) => row.expected !== undefined).every((row) => row.status === row.expected) && result.negativeChecks.every((row) => row.failedClosed);
fs.writeFileSync(path.join(resultsDir, 'provider-pin-validation-witness-result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ok: result.ok, checks: result.checks.length, commandResults: result.commandResults.length, negativeChecks: result.negativeChecks.length, resultPath: rel(path.join(resultsDir, 'provider-pin-validation-witness-result.json')) }));
