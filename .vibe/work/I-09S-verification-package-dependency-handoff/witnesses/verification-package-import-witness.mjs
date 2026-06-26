import { spawn } from 'node:child_process';
import { lstat, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { EVIDENCE, ROOT, assert, writeResult } from './witness-utils.mjs';

const code = String.raw`
const artifactSpecifier = '@vibe-engineer/artifacts';
const orchestrationSpecifier = '@vibe-engineer/orchestration';
const artifactsResolved = await import.meta.resolve(artifactSpecifier);
const orchestrationResolved = await import.meta.resolve(orchestrationSpecifier);
const artifacts = await import(artifactSpecifier);
const orchestration = await import(orchestrationSpecifier);
const result = {
  cwd: process.cwd(),
  artifactSpecifier,
  orchestrationSpecifier,
  artifactsResolved,
  orchestrationResolved,
  validateArtifactFileType: typeof artifacts.validateArtifactFile,
  joinValidatedOutputsType: typeof orchestration.joinValidatedOutputs,
  inspectResumeStateType: typeof orchestration.inspectResumeState
};
if (result.validateArtifactFileType !== 'function') throw new Error('validateArtifactFile missing from @vibe-engineer/artifacts');
if (result.joinValidatedOutputsType !== 'function') throw new Error('joinValidatedOutputs missing from @vibe-engineer/orchestration');
if (result.inspectResumeStateType !== 'function') throw new Error('inspectResumeState missing from @vibe-engineer/orchestration');
if (!result.artifactsResolved.includes('/packages/artifacts/')) throw new Error('artifacts did not resolve to the real workspace package');
if (!result.orchestrationResolved.includes('/packages/orchestration/')) throw new Error('orchestration did not resolve to the real workspace package');
console.log(JSON.stringify(result));
`;

const child = spawn(process.execPath, ['--input-type=module', '-e', code], {
  cwd: path.join(ROOT, 'packages/verification'),
  stdio: ['ignore', 'pipe', 'pipe']
});
let stdout = '';
let stderr = '';
child.stdout.on('data', (chunk) => { stdout += chunk; });
child.stderr.on('data', (chunk) => { stderr += chunk; });
const exitCode = await new Promise((resolve) => child.on('close', resolve));
await writeFile(path.join(EVIDENCE, 'verification-package-resolve-witness/node-stdout.txt'), stdout);
await writeFile(path.join(EVIDENCE, 'verification-package-resolve-witness/node-stderr.txt'), stderr);
await writeFile(path.join(EVIDENCE, 'verification-package-resolve-witness/node-exitcode.txt'), `${exitCode}\n`);
assert(exitCode === 0, 'verification package import witness failed', { exitCode, stdout, stderr });
const parsed = JSON.parse(stdout);
const symlinkEvidence = {};
for (const [name, relative] of Object.entries({ artifacts: 'packages/verification/node_modules/@vibe-engineer/artifacts', orchestration: 'packages/verification/node_modules/@vibe-engineer/orchestration' })) {
  const linkPath = path.join(ROOT, relative);
  const linkStat = await lstat(linkPath);
  symlinkEvidence[name] = { path: relative, isSymbolicLink: linkStat.isSymbolicLink(), realpath: await realpath(linkPath) };
}
assert(symlinkEvidence.artifacts.isSymbolicLink, 'verification artifacts dependency is not a package-local symlink');
assert(symlinkEvidence.orchestration.isSymbolicLink, 'verification orchestration dependency is not a package-local symlink');
const result = {
  status: 'pass',
  cwd: parsed.cwd,
  packageNameImportsOnly: true,
  noRelativeOrHoistOnlyImport: true,
  packageLocalSymlinkEvidence: symlinkEvidence,
  artifactsResolved: parsed.artifactsResolved,
  orchestrationResolved: parsed.orchestrationResolved,
  exposedApis: {
    validateArtifactFile: parsed.validateArtifactFileType,
    joinValidatedOutputs: parsed.joinValidatedOutputsType,
    inspectResumeState: parsed.inspectResumeStateType
  }
};
await writeResult('verification-package-resolve-witness/result.json', result);
console.log(JSON.stringify(result));
