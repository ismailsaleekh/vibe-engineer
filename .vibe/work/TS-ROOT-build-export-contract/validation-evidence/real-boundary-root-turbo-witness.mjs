#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const repo = process.argv[2] ?? process.cwd();
const evidenceRoot = process.argv[3] ?? path.join(repo, '.vibe/work/TS-ROOT-build-export-contract/validation-evidence');
const workspace = path.join(evidenceRoot, 'transient-workspaces', 'root-turbo-orchestration-consumer');
const outputDir = path.join(evidenceRoot, 'real-boundary-output');
const cacheDir = path.join(evidenceRoot, 'transient-caches');
const tempDir = path.join(evidenceRoot, 'tmp');
const resultPath = path.join(outputDir, 'real-boundary-root-turbo-witness-result.json');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rmOwned(target) {
  const normalizedEvidenceRoot = path.resolve(evidenceRoot);
  const normalizedTarget = path.resolve(target);
  if (!normalizedTarget.startsWith(`${normalizedEvidenceRoot}${path.sep}`)) {
    throw new Error(`Refusing to remove non-validation-owned path: ${target}`);
  }
  fs.rmSync(target, { recursive: true, force: true });
}

function copyFile(rel) {
  const source = path.join(repo, rel);
  const dest = path.join(workspace, rel);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(source, dest);
}

function copyDir(rel, options = {}) {
  const source = path.join(repo, rel);
  const dest = path.join(workspace, rel);
  fs.cpSync(source, dest, {
    recursive: true,
    dereference: false,
    filter(sourcePath) {
      const relative = path.relative(source, sourcePath).replaceAll('\\', '/');
      if (relative === '') return true;
      if (relative === 'dist' || relative.startsWith('dist/')) return false;
      if (relative === 'node_modules' || relative.startsWith('node_modules/')) return false;
      if (relative === '.turbo' || relative.startsWith('.turbo/')) return false;
      if (options.exclude?.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`))) return false;
      return true;
    },
  });
}

function symlink(target, linkPath, type = 'dir') {
  ensureDir(path.dirname(linkPath));
  fs.rmSync(linkPath, { recursive: true, force: true });
  fs.symlinkSync(target, linkPath, type);
}

function shasumList(relDir) {
  const dir = path.join(workspace, relDir);
  if (!fs.existsSync(dir)) return [];
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) files.push(path.relative(workspace, absolute).replaceAll('\\', '/'));
    }
  };
  walk(dir);
  files.sort();
  return files;
}

function runCommand(command, args, cwd, logStem) {
  const env = {
    ...process.env,
    TURBO_CACHE_DIR: path.join(cacheDir, 'turbo-cache'),
    XDG_CACHE_HOME: path.join(cacheDir, 'xdg-cache'),
    TMPDIR: tempDir,
    npm_config_cache: path.join(cacheDir, 'pnpm-cache'),
    CI: '1',
  };
  ensureDir(outputDir);
  ensureDir(env.TURBO_CACHE_DIR);
  ensureDir(env.XDG_CACHE_HOME);
  ensureDir(env.TMPDIR);
  ensureDir(env.npm_config_cache);
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  const endedAt = new Date().toISOString();
  const stdoutPath = path.join(outputDir, `${logStem}.stdout`);
  const stderrPath = path.join(outputDir, `${logStem}.stderr`);
  fs.writeFileSync(stdoutPath, result.stdout ?? '');
  fs.writeFileSync(stderrPath, result.stderr ?? '');
  return {
    cwd,
    command: [command, ...args].join(' '),
    exitCode: result.status,
    signal: result.signal,
    startedAt,
    endedAt,
    stdoutPath,
    stderrPath,
    stdoutTail: (result.stdout ?? '').split('\n').slice(-40).join('\n'),
    stderrTail: (result.stderr ?? '').split('\n').slice(-40).join('\n'),
  };
}

rmOwned(workspace);
rmOwned(outputDir);
rmOwned(cacheDir);
rmOwned(tempDir);
ensureDir(workspace);
ensureDir(outputDir);
ensureDir(cacheDir);
ensureDir(tempDir);

for (const rel of ['package.json', 'turbo.json', 'tsconfig.base.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml']) copyFile(rel);
copyDir('packages/orchestration');
copyDir('packages/artifacts');

const nodeModules = path.join(workspace, 'node_modules');
ensureDir(path.join(nodeModules, '@vibe-engineer'));
ensureDir(path.join(nodeModules, '.bin'));
symlink(path.relative(path.join(nodeModules, '@vibe-engineer'), path.join(workspace, 'packages/orchestration')), path.join(nodeModules, '@vibe-engineer/orchestration'), 'dir');
symlink(path.relative(path.join(nodeModules, '@vibe-engineer'), path.join(workspace, 'packages/artifacts')), path.join(nodeModules, '@vibe-engineer/artifacts'), 'dir');
for (const nodeModulesMetadata of ['.modules.yaml', '.pnpm-workspace-state-v1.json']) {
  const source = path.join(repo, 'node_modules', nodeModulesMetadata);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(nodeModules, nodeModulesMetadata));
}
const productPnpmStore = path.join(repo, 'node_modules/.pnpm');
if (fs.existsSync(productPnpmStore)) symlink(productPnpmStore, path.join(nodeModules, '.pnpm'), 'dir');

function findPnpmStoreEntry(storePrefix, preferred) {
  if (!fs.existsSync(productPnpmStore)) return undefined;
  const entries = fs.readdirSync(productPnpmStore).filter((entry) => entry === storePrefix || entry.startsWith(`${storePrefix}@`)).sort();
  if (preferred && entries.includes(preferred)) return preferred;
  return entries[0];
}

function linkRootDependencyFromStore(packageName, storePrefix, preferredStoreDir) {
  const storeDirName = findPnpmStoreEntry(storePrefix, preferredStoreDir);
  if (!storeDirName) return;
  const transientTarget = path.join('.pnpm', storeDirName, 'node_modules', packageName);
  symlink(transientTarget, path.join(nodeModules, packageName), 'dir');
}

for (const bin of ['turbo', 'tsc', 'tsserver']) {
  const productBin = path.join(repo, 'node_modules/.bin', bin);
  if (fs.existsSync(productBin)) symlink(productBin, path.join(nodeModules, '.bin', bin), 'file');
}
linkRootDependencyFromStore('ajv', 'ajv', 'ajv@8.17.1');

const beforeDist = shasumList('packages/orchestration/dist');
const rootBuild = runCommand('pnpm', ['run', 'build'], workspace, 'root-pnpm-run-build');
const afterDist = shasumList('packages/orchestration/dist');

let consumer = null;
let importProbe = null;
if (rootBuild.exitCode === 0) {
  const consumerDir = path.join(workspace, 'consumer');
  ensureDir(consumerDir);
  const consumerPath = path.join(consumerDir, 'consume-orchestration.mjs');
  const resultJsonPath = path.join(outputDir, 'consumer-import-result.json');
  fs.writeFileSync(consumerPath, `import fs from 'node:fs';\nimport { DEFAULT_ORCHESTRATION_LIMITS } from '@vibe-engineer/orchestration';\nconst resolved = import.meta.resolve('@vibe-engineer/orchestration');\nconst file = new URL(resolved);\nconst result = { resolved, pathname: file.pathname, maxParallelAgents: DEFAULT_ORCHESTRATION_LIMITS.maxParallelAgents, exists: fs.existsSync(file), declarationExists: fs.existsSync(file.pathname.replace(/\\.js$/, '.d.ts')) };\nfs.writeFileSync(${JSON.stringify(resultJsonPath)}, JSON.stringify(result, null, 2) + '\\n');\nconsole.log(JSON.stringify(result));\n`);
  consumer = runCommand('node', [consumerPath], workspace, 'consumer-import');
  if (fs.existsSync(resultJsonPath)) importProbe = JSON.parse(fs.readFileSync(resultJsonPath, 'utf8'));
}

const expectedDistJs = path.join(workspace, 'packages/orchestration/dist/src/index.js');
const expectedDistDts = path.join(workspace, 'packages/orchestration/dist/src/index.d.ts');
const productDistPrefix = path.join(repo, 'packages/orchestration/dist');
const importPath = importProbe?.pathname ? path.resolve(importProbe.pathname) : undefined;
const result = {
  repo,
  workspace,
  outputDir,
  copiedFiles: {
    root: ['package.json', 'turbo.json', 'tsconfig.base.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml'],
    packages: ['packages/orchestration', 'packages/artifacts'],
  },
  rootBuild,
  consumer,
  importProbe,
  distInventoryBefore: beforeDist,
  distInventoryAfter: afterDist,
  assertions: {
    rootScriptExercised: rootBuild.command === 'pnpm run build',
    rootBuildSucceeded: rootBuild.exitCode === 0,
    consumerSucceeded: consumer?.exitCode === 0,
    expectedDistJsExists: fs.existsSync(expectedDistJs),
    expectedDistDtsExists: fs.existsSync(expectedDistDts),
    importResolvedUnderValidationWorkspace: importPath ? importPath.startsWith(path.resolve(workspace)) : false,
    importDidNotResolveToProductDist: importPath ? !importPath.startsWith(path.resolve(productDistPrefix)) : false,
    importResolvedToExpectedDist: importPath === path.resolve(expectedDistJs),
    declarationProbePassed: importProbe?.declarationExists === true,
    maxParallelAgentsExportObserved: importProbe?.maxParallelAgents === 8,
  },
};
result.ok = Object.values(result.assertions).every(Boolean);
fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
