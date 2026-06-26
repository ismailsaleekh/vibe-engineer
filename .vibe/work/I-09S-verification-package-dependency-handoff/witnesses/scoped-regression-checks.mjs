import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  EVIDENCE,
  ROOT,
  assert,
  assertDeepEqual,
  assertNoSourceMtimeAfterSnapshot,
  deepClone,
  readEvidenceJson,
  readJson,
  sha256File,
  writeResult
} from './witness-utils.mjs';

const beforeHashes = await readEvidenceJson('evidence/scoped-diff/before-hashes.json');
const currentHashes = {};
for (const file of Object.keys(beforeHashes)) currentHashes[file] = await sha256File(file);

for (const file of ['package.json', 'pnpm-workspace.yaml', '.npmrc', 'turbo.json', 'packages/artifacts/package.json', 'packages/orchestration/package.json', 'packages/cli/src/command-loader/loader.js', 'packages/cli/src/entry/vibe-engineer.js']) {
  assert(currentHashes[file] === beforeHashes[file], `${file} changed outside I-09S license`);
}

const beforeCli = await readEvidenceJson('evidence/cli-manifest-before/package.json');
const currentCli = await readJson('packages/cli/package.json');
const currentCliWithoutAllowed = deepClone(currentCli);
delete currentCliWithoutAllowed.dependencies['@vibe-engineer/verification'];
assertDeepEqual(currentCliWithoutAllowed.dependencies, beforeCli.dependencies, 'existing CLI dependencies');
assertDeepEqual(currentCliWithoutAllowed.bin, beforeCli.bin, 'CLI bin');
assertDeepEqual(currentCliWithoutAllowed.exports, beforeCli.exports, 'CLI exports');
assertDeepEqual(currentCliWithoutAllowed.scripts, beforeCli.scripts, 'CLI scripts');

await assertNoSourceMtimeAfterSnapshot('packages/artifacts', 'evidence/scoped-diff/before-hashes.json');
await assertNoSourceMtimeAfterSnapshot('packages/orchestration', 'evidence/scoped-diff/before-hashes.json');
await assertNoSourceMtimeAfterSnapshot('packages/verification/src', 'evidence/scoped-diff/before-hashes.json');
assert(!existsSync(path.join(ROOT, 'packages/cli/src/commands/verify')), 'I-09S must not create or register CLI verify command source');
for (const dir of ['.github', 'scripts', 'infra']) {
  if (existsSync(path.join(ROOT, dir))) await assertNoSourceMtimeAfterSnapshot(dir, 'evidence/scoped-diff/before-hashes.json');
}

const verificationManifest = await readJson('packages/verification/package.json');
assert(verificationManifest.private === true, '@vibe-engineer/verification must remain private/internal');
const manifestText = await readFile(path.join(ROOT, 'packages/verification/package.json'), 'utf8');
const forbiddenDomainWords = ['ecommerce', 'inventory', 'fashion', 'Billz', 'Telegram', 'Instagram'];
const domainLeaks = forbiddenDomainWords.filter((word) => manifestText.toLowerCase().includes(word.toLowerCase()));
assert(domainLeaks.length === 0, 'verification manifest leaked project-specific domain vocabulary', { domainLeaks });

const cli = spawn(process.execPath, ['packages/cli/src/entry/vibe-engineer.js', '--json', 'verify'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe']
});
let stdout = '';
let stderr = '';
cli.stdout.on('data', (chunk) => { stdout += chunk; });
cli.stderr.on('data', (chunk) => { stderr += chunk; });
const exitCode = await new Promise((resolve) => cli.on('close', resolve));
await writeFile(path.join(EVIDENCE, 'scoped-diff/shipped-verify-stdout.json'), stdout);
await writeFile(path.join(EVIDENCE, 'scoped-diff/shipped-verify-stderr.txt'), stderr);
await writeFile(path.join(EVIDENCE, 'scoped-diff/shipped-verify-exitcode.txt'), `${exitCode}\n`);
assert(exitCode !== 0, 'shipped default vibe-engineer verify unexpectedly succeeded');
const envelope = JSON.parse(stdout);
const codes = [...(envelope.errors ?? []), ...(envelope.diagnostics ?? [])].map((item) => item.code ?? item.classification);
assert(JSON.stringify(envelope).includes('unsupported_operation') || JSON.stringify(codes).includes('UNSUPPORTED') || envelope.status === 'failure', 'shipped verify is not clearly unsupported/failure out of scope', { envelope });

const result = {
  status: 'pass',
  unchanged: ['root package.json', 'pnpm-workspace.yaml', '.npmrc', 'turbo.json', 'artifacts manifest', 'orchestration manifest', 'CLI loader', 'CLI entry', 'CLI existing dependencies'],
  sourceMtimeSweeps: ['packages/artifacts', 'packages/orchestration', 'packages/verification/src', '.github/scripts/infra when present'],
  cliSourceGuard: 'loader/entry hashes unchanged and packages/cli/src/commands/verify absent; unrelated sibling command dirty-tree mtimes are not treated as I-09S edits',
  shippedVerifyRegistration: { remainsOutOfScope: true, exitCode, status: envelope.status },
  verificationPackage: { private: verificationManifest.private, domainNeutral: true }
};
await writeResult('scoped-diff/scoped-regression-result.json', result);
console.log(JSON.stringify(result));
