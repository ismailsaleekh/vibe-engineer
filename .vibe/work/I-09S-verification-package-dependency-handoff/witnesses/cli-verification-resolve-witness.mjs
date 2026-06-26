import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { EVIDENCE, ROOT, assert, readJson, writeResult } from './witness-utils.mjs';

const cliManifest = await readJson('packages/cli/package.json');
const verificationManifest = await readJson('packages/verification/package.json');
assert(cliManifest.dependencies?.['@vibe-engineer/verification'] === 'workspace:*', 'CLI manifest does not declare @vibe-engineer/verification workspace dependency');
assert(verificationManifest.exports?.['.'] === './src/index.js', 'verification manifest public export missing');

const code = String.raw`
const specifier = '@vibe-engineer/verification';
const resolved = await import.meta.resolve(specifier);
let importAttempt = { attempted: true, ok: false };
try {
  const module = await import(specifier);
  importAttempt = { attempted: true, ok: true, keys: Object.keys(module).sort() };
} catch (error) {
  importAttempt = {
    attempted: true,
    ok: false,
    name: error?.name ?? null,
    code: error?.code ?? null,
    message: error?.message ?? String(error)
  };
}
console.log(JSON.stringify({ cwd: process.cwd(), specifier, resolved, importAttempt }));
`;

const child = spawn(process.execPath, ['--input-type=module', '-e', code], {
  cwd: path.join(ROOT, 'packages/cli'),
  stdio: ['ignore', 'pipe', 'pipe']
});
let stdout = '';
let stderr = '';
child.stdout.on('data', (chunk) => { stdout += chunk; });
child.stderr.on('data', (chunk) => { stderr += chunk; });
const exitCode = await new Promise((resolve) => child.on('close', resolve));
await writeFile(path.join(EVIDENCE, 'cli-verification-resolve-witness/node-stdout.txt'), stdout);
await writeFile(path.join(EVIDENCE, 'cli-verification-resolve-witness/node-stderr.txt'), stderr);
await writeFile(path.join(EVIDENCE, 'cli-verification-resolve-witness/node-exitcode.txt'), `${exitCode}\n`);
assert(exitCode === 0, 'CLI verification resolver process failed before recording dynamic import attempt', { exitCode, stdout, stderr });
const parsed = JSON.parse(stdout);
assert(parsed.resolved.includes('/packages/cli/node_modules/@vibe-engineer/verification/src/index.js'), 'CLI resolver did not resolve through the declared CLI workspace dependency and verification export', parsed);
const exportedSourcePath = path.join(ROOT, 'packages/verification/src/index.js');
let status;
let pendingLive = null;
if (parsed.importAttempt.ok) {
  status = 'pass-live-api-source-present';
} else if (!existsSync(exportedSourcePath) && parsed.importAttempt.code === 'ERR_MODULE_NOT_FOUND' && (parsed.importAttempt.message.includes('packages/verification/src/index.js') || parsed.importAttempt.message.includes('packages/cli/node_modules/@vibe-engineer/verification/src/index.js'))) {
  status = 'pending-live/BLOCKED for I-09A W-RB2.5';
  pendingLive = 'packages/verification/src/index.js is intentionally absent until I-09A creates the exported runner API source entrypoint';
} else {
  throw new Error(`Unexpected CLI dynamic import failure: ${JSON.stringify(parsed.importAttempt)}`);
}
const result = {
  status,
  resolverSeam: 'package-name via packages/cli dependency and packages/verification export metadata',
  cwd: parsed.cwd,
  specifier: parsed.specifier,
  resolved: parsed.resolved,
  dynamicImportAttempt: parsed.importAttempt,
  pendingLive,
  noRelativeShimCopyOrHoistProof: true
};
await writeResult('cli-verification-resolve-witness/result.json', result);
console.log(JSON.stringify(result));
