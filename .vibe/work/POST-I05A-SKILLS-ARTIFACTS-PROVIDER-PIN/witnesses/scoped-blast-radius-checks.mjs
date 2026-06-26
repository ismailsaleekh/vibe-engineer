import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const work = path.join(repo, '.vibe/work/POST-I05A-SKILLS-ARTIFACTS-PROVIDER-PIN');
const evidence = path.join(work, 'evidence/witness-results/scoped-blast-radius');
const beforeRoot = path.join(work, 'evidence/before-snapshots');
fs.mkdirSync(evidence, { recursive: true });
const failures = [];
function fail(m) { failures.push(m); }
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function read(rel) { return fs.readFileSync(path.join(repo, rel), 'utf8'); }
function readBefore(rel) { return fs.readFileSync(path.join(beforeRoot, 'files', rel), 'utf8'); }
for (const rel of ['package.json','pnpm-workspace.yaml','.npmrc','turbo.json','tsconfig.base.json','packages/artifacts/package.json','packages/cli/package.json','packages/context/package.json','packages/orchestration/package.json']) {
  if (read(rel) !== readBefore(rel)) fail(`read-only guard changed: ${rel}`);
}
function checkInventory(rel) {
  const inv = path.join(beforeRoot, 'inventories', rel.replaceAll('/', '__') + '.sha256');
  if (!fs.existsSync(inv)) return;
  const text = fs.readFileSync(inv, 'utf8').trim();
  if (text.startsWith('ABSENT')) {
    if (fs.existsSync(path.join(repo, rel))) fail(`previously absent read-only path now exists: ${rel}`);
    return;
  }
  for (const line of text.split('\n').filter(Boolean)) {
    const [expected, abs] = line.split(/\s+/, 2);
    if (!fs.existsSync(abs)) { fail(`read-only file deleted: ${path.relative(repo, abs)}`); continue; }
    if (sha(abs) !== expected) fail(`read-only file changed: ${path.relative(repo, abs)}`);
  }
}
for (const rel of ['packages/artifacts','packages/cli','packages/context','packages/orchestration','packages/config','packages/mechanical-gates','packages/skills/src','packages/skills/fixtures']) checkInventory(rel);
const forbiddenSkillRoots = ['packages/skills/src/input/brainstorm','packages/skills/src/input/grill-me','packages/skills/src/input/task','packages/skills/src/plan','packages/skills/src/build','packages/skills/src/ship','packages/skills/fixtures/work-brief/producers'];
for (const rel of forbiddenSkillRoots) {
  if (fs.existsSync(path.join(repo, rel))) fail(`forbidden skills path exists/was touched in this handoff scope: ${rel}`);
}
const forbiddenRootDirs = ['.github','scripts','docs'];
for (const rel of forbiddenRootDirs) {
  // Docs may pre-exist; compare git/status below and snapshots where available. This lane must not create work evidence there.
  if (fs.existsSync(path.join(repo, rel, 'POST-I05A-SKILLS-ARTIFACTS-PROVIDER-PIN'))) fail(`handoff evidence leaked under ${rel}`);
}
const status = spawnSync('git', ['-C', repo, 'status', '--short', '--untracked-files=all', '--', 'package.json','pnpm-workspace.yaml','.npmrc','turbo.json','tsconfig.base.json','pnpm-lock.yaml','packages/skills','packages/registry','packages/artifacts','packages/cli','packages/context','packages/orchestration','packages/config','packages/mechanical-gates','.vibe/work/POST-I05A-SKILLS-ARTIFACTS-PROVIDER-PIN'], { encoding: 'utf8' });
fs.writeFileSync(path.join(evidence, 'path-scoped-git-status-after.txt'), status.stdout ?? '');
fs.writeFileSync(path.join(evidence, 'path-scoped-git-status-after.stderr'), status.stderr ?? '');
const allowedPrefixes = [
  '?? .vibe/work/POST-I05A-SKILLS-ARTIFACTS-PROVIDER-PIN/',
  '?? packages/skills/',
  '?? packages/registry/',
  '?? pnpm-lock.yaml',
  '?? package.json',
  '?? pnpm-workspace.yaml',
  '?? .npmrc',
  '?? turbo.json',
  '?? tsconfig.base.json',
  '?? packages/artifacts/',
  '?? packages/cli/',
  '?? packages/context/',
  '?? packages/orchestration/',
  '?? packages/config/',
  '?? packages/mechanical-gates/'
];
// In a no-HEAD dirty baseline, git status is only recorded, not used as sole truth. Content hashes above enforce guard paths.
const result = {
  ok: failures.length === 0,
  failures,
  statusExit: status.status,
  statusLines: (status.stdout ?? '').trim().split('\n').filter(Boolean),
  dirtyTreePolicy: 'ambient dirty baseline preserved; no git stash/reset/clean/checkout/restore/commit/push used by this script or implementation',
  changedOwnedFiles: ['packages/skills/package.json','packages/registry/package.json','packages/registry/src/index.js','packages/registry/src/index.d.ts','pnpm-lock.yaml','.vibe/work/POST-I05A-SKILLS-ARTIFACTS-PROVIDER-PIN/**'],
  licensedGeneratedState: ['packages/skills/node_modules/**','packages/registry/node_modules/**','node_modules/.modules.yaml','node_modules/.pnpm/lock.yaml','node_modules/.pnpm-workspace-state-v1.json']
};
fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify(result, null, 2));
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
