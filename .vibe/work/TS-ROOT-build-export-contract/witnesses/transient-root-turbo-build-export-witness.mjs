#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const targetRoot = process.argv[2] ?? process.cwd();
const workRoot = path.join(targetRoot, '.vibe/work/TS-ROOT-build-export-contract');
const workspaceRoot = path.join(workRoot, 'witness-workspaces/orchestration-build-export');
const outputDir = path.join(workRoot, 'witness-output');
fs.mkdirSync(outputDir, { recursive: true });

function assertOwned(candidatePath) {
  const resolved = path.resolve(candidatePath);
  const owned = path.resolve(workRoot);
  if (resolved !== owned && !resolved.startsWith(`${owned}${path.sep}`)) {
    throw new Error(`Refusing to write outside owned work root: ${resolved}`);
  }
}
function copyFile(relativePath) {
  const from = path.join(targetRoot, relativePath);
  const to = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
function copyDir(relativePath) {
  const from = path.join(targetRoot, relativePath);
  const to = path.join(workspaceRoot, relativePath);
  fs.cpSync(from, to, {
    recursive: true,
    filter: (source) => {
      const rel = path.relative(from, source).replaceAll(path.sep, '/');
      return rel === '' || (!rel.startsWith('dist') && !rel.includes('/dist/') && !rel.startsWith('node_modules'));
    },
  });
}
function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      TURBO_TELEMETRY_DISABLED: '1',
      TURBO_CACHE_DIR: path.join(workspaceRoot, '.turbo-cache'),
      XDG_CACHE_HOME: path.join(outputDir, 'xdg-cache'),
      npm_config_cache: path.join(outputDir, 'npm-cache'),
      npm_config_store_dir: path.join(outputDir, 'pnpm-store'),
    },
    maxBuffer: 20 * 1024 * 1024,
  });
  return { command: [command, ...args].join(' '), cwd, exitCode: result.status, stdout: result.stdout, stderr: result.stderr };
}
function writeJson(name, data) {
  fs.writeFileSync(path.join(outputDir, name), `${JSON.stringify(data, null, 2)}\n`);
}

try {
  assertOwned(workspaceRoot);
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
  fs.mkdirSync(workspaceRoot, { recursive: true });
  for (const file of ['package.json', 'turbo.json', 'tsconfig.base.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml']) copyFile(file);
  copyDir('packages/artifacts');
  copyDir('packages/orchestration');

  const productNodeModules = path.join(targetRoot, 'node_modules');
  if (!fs.existsSync(productNodeModules)) throw new Error('target root node_modules is required for no-install transient witness');
  fs.symlinkSync(productNodeModules, path.join(workspaceRoot, 'node_modules'), 'dir');
  const productArtifactsNodeModules = path.join(targetRoot, 'packages/artifacts/node_modules');
  if (fs.existsSync(productArtifactsNodeModules)) {
    fs.symlinkSync(productArtifactsNodeModules, path.join(workspaceRoot, 'packages/artifacts/node_modules'), 'dir');
  }
  fs.mkdirSync(path.join(workspaceRoot, 'packages/orchestration/node_modules/@vibe-engineer'), { recursive: true });
  fs.symlinkSync('../../../artifacts', path.join(workspaceRoot, 'packages/orchestration/node_modules/@vibe-engineer/artifacts'), 'dir');

  const build = run('pnpm', ['run', 'build'], workspaceRoot);
  writeJson('transient-root-turbo-build-command.json', build);
  if (build.exitCode !== 0) {
    throw new Error(`transient root script/Turbo build failed with exit ${build.exitCode}`);
  }
  const packageRoot = path.join(workspaceRoot, 'packages/orchestration');
  const emittedJs = path.join(packageRoot, 'dist/src/index.js');
  const emittedDts = path.join(packageRoot, 'dist/src/index.d.ts');
  if (!fs.existsSync(emittedJs) || !fs.existsSync(emittedDts)) {
    throw new Error('transient build did not emit expected JS and declaration outputs under owned workspace');
  }
  const productDist = path.join(targetRoot, 'packages/orchestration/dist/src/index.js');
  if (path.resolve(emittedJs) === path.resolve(productDist) || !path.resolve(emittedJs).startsWith(path.resolve(workRoot))) {
    throw new Error('emitted JS is not owned transient output');
  }

  const consumerRoot = path.join(workspaceRoot, 'consumer');
  fs.mkdirSync(path.join(consumerRoot, 'node_modules/@vibe-engineer'), { recursive: true });
  fs.symlinkSync(packageRoot, path.join(consumerRoot, 'node_modules/@vibe-engineer/orchestration'), 'dir');
  const consumerScript = path.join(consumerRoot, 'consume-orchestration.mjs');
  fs.writeFileSync(consumerScript, `
const resolved = await import.meta.resolve('@vibe-engineer/orchestration');
const orchestration = await import('@vibe-engineer/orchestration');
if (!resolved.includes('/.vibe/work/TS-ROOT-build-export-contract/witness-workspaces/orchestration-build-export/packages/orchestration/dist/src/index.js')) {
  throw new Error('resolved export did not use owned transient dist: ' + resolved);
}
if (orchestration.DEFAULT_ORCHESTRATION_LIMITS.maxParallelAgents !== 8) {
  throw new Error('unexpected orchestration export value');
}
console.log(JSON.stringify({ ok: true, resolved, maxParallelAgents: orchestration.DEFAULT_ORCHESTRATION_LIMITS.maxParallelAgents }, null, 2));
`);
  const consume = run('node', [consumerScript], consumerRoot);
  writeJson('transient-package-export-consumption-command.json', consume);
  if (consume.exitCode !== 0) {
    throw new Error(`transient package export consumption failed with exit ${consume.exitCode}`);
  }
  const summary = {
    ok: true,
    workspaceRoot,
    buildCommand: build.command,
    buildExitCode: build.exitCode,
    consumeCommand: consume.command,
    consumeExitCode: consume.exitCode,
    emitted: {
      js: emittedJs,
      dts: emittedDts,
      jsUnderOwnedWorkRoot: path.resolve(emittedJs).startsWith(path.resolve(workRoot)),
      dtsUnderOwnedWorkRoot: path.resolve(emittedDts).startsWith(path.resolve(workRoot)),
    },
    productDistReadOnlyBaseline: productDist,
  };
  writeJson('transient-root-turbo-build-export-witness-result.json', summary);
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  const failure = { ok: false, message: error.message, workspaceRoot };
  writeJson('transient-root-turbo-build-export-witness-result.json', failure);
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
}
