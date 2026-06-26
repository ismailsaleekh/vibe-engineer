import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  EVIDENCE,
  assert,
  deepClone,
  readJson,
  readLockImporters,
  requireWorkspaceEdge,
  writeResult
} from './witness-utils.mjs';

const fixtureDir = path.join(EVIDENCE, 'negative-fixtures/generated');
await mkdir(fixtureDir, { recursive: true });

const good = {
  verificationManifest: await readJson('packages/verification/package.json'),
  cliManifest: await readJson('packages/cli/package.json'),
  importers: await readLockImporters(),
  importProof: { kind: 'package-name-resolution', specifier: '@vibe-engineer/verification', viaDeclaredDependency: true, viaPublicExport: true }
};

function validateFixture(fixture) {
  const verificationDeps = fixture.verificationManifest.dependencies ?? {};
  if (verificationDeps['@vibe-engineer/artifacts'] !== 'workspace:*') throw new Error('missing verification artifacts dependency');
  if (verificationDeps['@vibe-engineer/orchestration'] !== 'workspace:*') throw new Error('missing verification orchestration dependency');
  if (fixture.verificationManifest.exports?.['.'] !== './src/index.js') throw new Error('missing or wrong verification public export');
  if (fixture.cliManifest.dependencies?.['@vibe-engineer/verification'] !== 'workspace:*') throw new Error('missing CLI verification dependency');
  requireWorkspaceEdge(fixture.importers, 'packages/verification', '@vibe-engineer/artifacts', 'link:../artifacts');
  requireWorkspaceEdge(fixture.importers, 'packages/verification', '@vibe-engineer/orchestration', 'link:../orchestration');
  requireWorkspaceEdge(fixture.importers, 'packages/cli', '@vibe-engineer/verification', 'link:../verification');
  const proof = fixture.importProof;
  if (!proof || proof.kind !== 'package-name-resolution' || proof.specifier !== '@vibe-engineer/verification' || proof.viaDeclaredDependency !== true || proof.viaPublicExport !== true) {
    throw new Error('relative/copy/shim import proof substituted for package-name resolution');
  }
}

const mutations = [
  {
    name: 'missing-verification-artifacts-dependency',
    mutate(fixture) { delete fixture.verificationManifest.dependencies['@vibe-engineer/artifacts']; }
  },
  {
    name: 'missing-verification-orchestration-dependency',
    mutate(fixture) { delete fixture.verificationManifest.dependencies['@vibe-engineer/orchestration']; }
  },
  {
    name: 'missing-verification-export-dot',
    mutate(fixture) { delete fixture.verificationManifest.exports['.']; }
  },
  {
    name: 'wrong-verification-export-target',
    mutate(fixture) { fixture.verificationManifest.exports['.'] = './src/not-index.js'; }
  },
  {
    name: 'missing-cli-verification-dependency',
    mutate(fixture) { delete fixture.cliManifest.dependencies['@vibe-engineer/verification']; }
  },
  {
    name: 'missing-lockfile-verification-edge',
    mutate(fixture) { delete fixture.importers['packages/verification'].dependencies['@vibe-engineer/orchestration']; }
  },
  {
    name: 'missing-lockfile-cli-verification-edge',
    mutate(fixture) { delete fixture.importers['packages/cli'].dependencies['@vibe-engineer/verification']; }
  },
  {
    name: 'relative-shim-import-proof',
    mutate(fixture) { fixture.importProof = { kind: 'relative-path', specifier: '../verification/src/index.js', viaDeclaredDependency: false, viaPublicExport: false }; }
  }
];

validateFixture(good);
const results = [];
for (const mutation of mutations) {
  const fixture = deepClone(good);
  mutation.mutate(fixture);
  await writeFile(path.join(fixtureDir, `${mutation.name}.json`), `${JSON.stringify(fixture, null, 2)}\n`);
  let failedClosed = false;
  let message = null;
  try {
    validateFixture(fixture);
  } catch (error) {
    failedClosed = true;
    message = error.message;
  }
  results.push({ name: mutation.name, failedClosed, message });
}
assert(results.every((result) => result.failedClosed), 'one or more negative fixtures did not fail closed', { results });
const result = { status: 'pass', checkedMutations: results };
await writeResult('negative-fixtures/result.json', result);
console.log(JSON.stringify(result));
