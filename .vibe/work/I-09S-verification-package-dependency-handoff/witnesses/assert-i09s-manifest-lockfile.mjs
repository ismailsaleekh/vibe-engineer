import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ROOT,
  assert,
  assertDeepEqual,
  assertNoSourceMtimeAfterSnapshot,
  deepClone,
  packageDependency,
  readEvidenceJson,
  readJson,
  readLockImporters,
  requireWorkspaceEdge,
  sha256File,
  writeResult
} from './witness-utils.mjs';

const verification = await readJson('packages/verification/package.json');
const cli = await readJson('packages/cli/package.json');
const beforeVerification = await readEvidenceJson('evidence/manifest-before/package.json');
const beforeCli = await readEvidenceJson('evidence/cli-manifest-before/package.json');
const beforeHashes = await readEvidenceJson('evidence/scoped-diff/before-hashes.json');
const afterHashes = {};
for (const file of Object.keys(beforeHashes)) afterHashes[file] = await sha256File(file);

assert(verification.name === '@vibe-engineer/verification', 'verification package identity changed');
assert(verification.private === true, 'verification package must remain private');
assert(verification.license === beforeVerification.license, 'verification license changed');
assert(verification.type === beforeVerification.type, 'verification type changed');
assert(verification.description === beforeVerification.description, 'verification description changed');
assertDeepEqual(verification.vibeEngineer, beforeVerification.vibeEngineer, 'verification vibeEngineer metadata');
assert(verification.exports?.['.'] === './src/index.js', 'verification public export metadata missing or wrong');
assertDeepEqual(verification.dependencies, {
  '@vibe-engineer/artifacts': 'workspace:*',
  '@vibe-engineer/orchestration': 'workspace:*'
}, 'verification dependencies');
assert(!('scripts' in verification), 'I-09S must not add verification scripts');
assert(!('main' in verification), 'I-09S must not add verification main shim');

const verificationWithoutAllowed = deepClone(verification);
delete verificationWithoutAllowed.exports;
delete verificationWithoutAllowed.dependencies;
assertDeepEqual(verificationWithoutAllowed, beforeVerification, 'verification non-owned manifest fields');

assert(cli.name === beforeCli.name, 'CLI package identity changed');
assert(cli.private === beforeCli.private, 'CLI private/public flag changed');
assertDeepEqual(cli.bin, beforeCli.bin, 'CLI bin metadata');
assertDeepEqual(cli.exports, beforeCli.exports, 'CLI exports metadata');
assertDeepEqual(cli.scripts, beforeCli.scripts, 'CLI scripts metadata');
assertDeepEqual(cli.vibeEngineer, beforeCli.vibeEngineer, 'CLI vibeEngineer metadata');
assert(packageDependency(cli, '@vibe-engineer/verification') === 'workspace:*', 'CLI missing @vibe-engineer/verification workspace dependency');
const cliWithoutAllowed = deepClone(cli);
delete cliWithoutAllowed.dependencies['@vibe-engineer/verification'];
assertDeepEqual(cliWithoutAllowed, beforeCli, 'CLI non-owned manifest fields');

const importers = await readLockImporters();
requireWorkspaceEdge(importers, 'packages/verification', '@vibe-engineer/artifacts', 'link:../artifacts');
requireWorkspaceEdge(importers, 'packages/verification', '@vibe-engineer/orchestration', 'link:../orchestration');
requireWorkspaceEdge(importers, 'packages/cli', '@vibe-engineer/verification', 'link:../verification');
requireWorkspaceEdge(importers, 'packages/cli', '@vibe-engineer/artifacts', 'link:../artifacts');
requireWorkspaceEdge(importers, 'packages/cli', '@vibe-engineer/config', 'link:../config');

const workspace = await readFile(path.join(ROOT, 'pnpm-workspace.yaml'), 'utf8');
assert(workspace.includes("'packages/*'") || workspace.includes('packages/*'), 'pnpm-workspace.yaml does not cover packages/*');
assert(afterHashes['pnpm-workspace.yaml'] === beforeHashes['pnpm-workspace.yaml'], 'pnpm-workspace.yaml changed');
assert(afterHashes['package.json'] === beforeHashes['package.json'], 'root package.json changed');
assert(afterHashes['.npmrc'] === beforeHashes['.npmrc'], '.npmrc changed');
assert(afterHashes['turbo.json'] === beforeHashes['turbo.json'], 'turbo.json changed');
assert(afterHashes['packages/cli/src/command-loader/loader.js'] === beforeHashes['packages/cli/src/command-loader/loader.js'], 'CLI command-loader changed');
assert(afterHashes['packages/cli/src/entry/vibe-engineer.js'] === beforeHashes['packages/cli/src/entry/vibe-engineer.js'], 'CLI entry changed');
assert(afterHashes['packages/artifacts/package.json'] === beforeHashes['packages/artifacts/package.json'], 'artifacts package manifest changed');
assert(afterHashes['packages/orchestration/package.json'] === beforeHashes['packages/orchestration/package.json'], 'orchestration package manifest changed');

assert(!existsSync(path.join(ROOT, 'packages/verification/src/index.js')), 'packages/verification/src/index.js exists before I-09A; I-09S must not create source');
assert(!existsSync(path.join(ROOT, 'packages/cli/src/commands/verify')), 'I-09S must not create the future CLI verify command source tree');
await assertNoSourceMtimeAfterSnapshot('packages/verification/src', 'evidence/scoped-diff/before-hashes.json');

const result = {
  status: 'pass',
  checked: {
    verificationManifest: true,
    cliManifest: true,
    lockfileImporters: true,
    workspaceCoverage: true,
    readOnlyHashes: true,
    sourceNoTouch: true
  },
  pendingLive: !existsSync(path.join(ROOT, 'packages/verification/src/index.js')) ? 'packages/verification/src/index.js absent until I-09A' : null
};
await writeResult('scoped-diff/assert-i09s-manifest-lockfile-result.json', result);
console.log(JSON.stringify(result));
