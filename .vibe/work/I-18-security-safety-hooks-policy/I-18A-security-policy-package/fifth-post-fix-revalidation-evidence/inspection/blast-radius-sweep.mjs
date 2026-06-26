import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceDir = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/fifth-post-fix-revalidation-evidence/inspection');
await mkdir(evidenceDir, { recursive: true });

const manifestPaths = [
  'package.json',
  'packages/security/package.json',
  'packages/cli/package.json',
  'packages/artifacts/package.json',
  'packages/verification/package.json',
  'packages/mechanical-gates/package.json',
  'packages/testing/package.json',
];

const manifestRows = [];
for (const relativePath of manifestPaths) {
  const fullPath = path.join(repoRoot, relativePath);
  const parsed = JSON.parse(await readFile(fullPath, 'utf8'));
  const prodDeps = { ...(parsed.dependencies ?? {}), ...(parsed.optionalDependencies ?? {}), ...(parsed.peerDependencies ?? {}) };
  manifestRows.push({
    file: relativePath,
    name: parsed.name,
    prodTestingDependency: Object.prototype.hasOwnProperty.call(prodDeps, '@vibe-engineer/testing'),
    prodSecurityDependency: Object.prototype.hasOwnProperty.call(prodDeps, '@vibe-engineer/security'),
    exports: parsed.exports ?? null,
  });
}

const pathChecks = [
  'packages/cli/src/commands/security',
  'examples/starter-reference/generated-fixtures/security',
  '.vibe/work/I-18-security-safety-hooks-policy/I-18B-security-cli-command-and-verify-hook',
  '.github',
  'scripts',
  'infra',
  '.git',
];
const pathRows = pathChecks.map((relativePath) => ({ path: relativePath, exists: existsSync(path.join(repoRoot, relativePath)) }));

const cliCommandDirs = existsSync(path.join(repoRoot, 'packages/cli/src/commands'))
  ? (await readdir(path.join(repoRoot, 'packages/cli/src/commands'), { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
  : [];

const docsFiles = [
  'README.md',
  'docs/README.md',
  'docs/guides/getting-started/repository-status.md',
  'docs/decisions/DL-22-security-safety-model.md',
];
const docsRows = [];
for (const relativePath of docsFiles) {
  const text = await readFile(path.join(repoRoot, relativePath), 'utf8');
  docsRows.push({
    file: relativePath,
    claimsLiveSecurityCli: /vibe-engineer\s+security[\s\S]{0,120}(?:live|supported|green|ready|available)/i.test(text),
    saysCliNotLive: /not claimed as live|not live yet|not claimed/i.test(text),
  });
}

const summary = { ok: true, manifestRows, pathRows, cliCommandDirs, docsRows };
summary.ok = manifestRows.every((row) => !row.prodTestingDependency)
  && !pathRows.find((row) => row.path === 'packages/cli/src/commands/security')?.exists
  && !pathRows.find((row) => row.path === '.vibe/work/I-18-security-safety-hooks-policy/I-18B-security-cli-command-and-verify-hook')?.exists
  && docsRows.every((row) => !row.claimsLiveSecurityCli);
await writeFile(path.join(evidenceDir, 'blast-radius-sweep-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
if (!summary.ok) process.exitCode = 1;
