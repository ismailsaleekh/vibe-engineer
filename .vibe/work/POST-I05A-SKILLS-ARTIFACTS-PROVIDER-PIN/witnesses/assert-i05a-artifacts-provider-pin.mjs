import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const work = path.join(repo, '.vibe/work/POST-I05A-SKILLS-ARTIFACTS-PROVIDER-PIN');
const evidence = path.join(work, 'evidence/witness-results/assert-provider-pin');
fs.mkdirSync(evidence, { recursive: true });
const beforeRoot = path.join(work, 'evidence/before-snapshots');
const failures = [];
const notes = [];
function fail(message) { failures.push(message); }
function read(rel) { return fs.readFileSync(path.join(repo, rel), 'utf8'); }
function readBefore(rel) { return fs.readFileSync(path.join(beforeRoot, 'files', rel), 'utf8'); }
function json(rel) { return JSON.parse(read(rel)); }
function jsonBefore(rel) { return JSON.parse(readBefore(rel)); }
function assertDeepEqual(name, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${name} changed: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}
function blockForImporter(lockText, importer) {
  const lines = lockText.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${importer}:` || line === `  ${importer}: {}`);
  if (start < 0) return null;
  const out = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    if (i > start && /^  [^ ].*:/.test(line)) break;
    if (i > start && line === 'packages:') break;
    out.push(line);
  }
  return out.join('\n');
}
function importerNames(lockText) {
  const names = [];
  let inImporters = false;
  for (const line of lockText.split(/\r?\n/)) {
    if (line === 'importers:') { inImporters = true; continue; }
    if (inImporters && line === 'packages:') break;
    if (inImporters) {
      const match = /^  ([^ ].*?)(?:: \{}|:)$/.exec(line);
      if (match) names.push(match[1]);
    }
  }
  return names;
}
function hasEdge(block, dep, linkTarget = '../artifacts') {
  return block?.includes(`      '${dep}':\n        specifier: workspace:*\n        version: link:${linkTarget}`) || block?.includes(`      ${dep}:\n        specifier: workspace:*\n        version: link:${linkTarget}`);
}
function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(p)); else out.push(p);
  }
  return out.sort();
}
function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

const skills = json('packages/skills/package.json');
const skillsBefore = jsonBefore('packages/skills/package.json');
if (skills.dependencies?.['@vibe-engineer/artifacts'] !== 'workspace:*') fail('skills manifest missing exact @vibe-engineer/artifacts workspace dependency');
if ('scripts' in skills && !('scripts' in skillsBefore)) fail('skills manifest gained scripts');
if ('exports' in skills && !('exports' in skillsBefore)) fail('skills manifest gained exports');
for (const key of ['name','version','license','type','description','private','vibeEngineer']) assertDeepEqual(`skills ${key}`, skills[key], skillsBefore[key]);

const registry = json('packages/registry/package.json');
const registryBefore = jsonBefore('packages/registry/package.json');
if (registry.dependencies?.['@vibe-engineer/artifacts'] !== 'workspace:*') fail('registry manifest missing exact @vibe-engineer/artifacts workspace dependency');
assertDeepEqual('registry exports', registry.exports, registryBefore.exports);
assertDeepEqual('registry scripts', registry.scripts, registryBefore.scripts);
for (const key of ['name','version','license','type','description','private','vibeEngineer']) assertDeepEqual(`registry ${key}`, registry[key], registryBefore[key]);

const registryJs = read('packages/registry/src/index.js');
const registryDts = read('packages/registry/src/index.d.ts');
if (!registryJs.includes("from '@vibe-engineer/artifacts'")) fail('registry runtime import is not public package import');
if (registryJs.includes('../../artifacts/src') || registryJs.includes('../artifacts/src')) fail('registry runtime still contains relative artifacts reach-in');
if (!registryDts.includes("from '@vibe-engineer/artifacts'")) fail('registry type import is not public package import');
if (registryDts.includes('../../artifacts/src') || registryDts.includes('../artifacts/src')) fail('registry type declaration still contains relative artifacts reach-in');

const lock = read('pnpm-lock.yaml');
const beforeLock = readBefore('pnpm-lock.yaml');
const skillsBlock = blockForImporter(lock, 'packages/skills');
const registryBlock = blockForImporter(lock, 'packages/registry');
if (!hasEdge(skillsBlock, '@vibe-engineer/artifacts')) fail('lockfile missing packages/skills -> @vibe-engineer/artifacts link edge');
if (!hasEdge(registryBlock, '@vibe-engineer/artifacts')) fail('lockfile missing packages/registry -> @vibe-engineer/artifacts link edge');
const beforeImporters = importerNames(beforeLock);
const afterImporters = importerNames(lock);
assertDeepEqual('lockfile importer set', afterImporters, beforeImporters);
for (const importer of beforeImporters) {
  if (importer === 'packages/skills' || importer === 'packages/registry') continue;
  const beforeBlock = blockForImporter(beforeLock, importer);
  const afterBlock = blockForImporter(lock, importer);
  if (beforeBlock !== afterBlock) fail(`unrelated lockfile importer churn: ${importer}`);
}

for (const rel of ['package.json','pnpm-workspace.yaml','.npmrc','turbo.json','tsconfig.base.json','packages/artifacts/package.json','packages/cli/package.json','packages/context/package.json','packages/orchestration/package.json']) {
  if (read(rel) !== readBefore(rel)) fail(`read-only guard file changed: ${rel}`);
}

const forbiddenRoots = ['packages/skills/src', 'packages/skills/fixtures'];
for (const rel of forbiddenRoots) {
  const currentFiles = listFiles(path.join(repo, rel)).map((p) => path.relative(repo, p));
  const beforeInventory = path.join(beforeRoot, 'inventories', rel.replaceAll('/', '__') + '.sha256');
  const beforeText = fs.existsSync(beforeInventory) ? fs.readFileSync(beforeInventory, 'utf8').trim() : '';
  if (beforeText.startsWith('ABSENT') && currentFiles.length > 0) fail(`${rel} was created by handoff`);
}
for (const rel of ['packages/artifacts','packages/cli','packages/context','packages/orchestration','packages/config','packages/mechanical-gates']) {
  const inv = path.join(beforeRoot, 'inventories', rel.replaceAll('/', '__') + '.sha256');
  if (!fs.existsSync(inv)) continue;
  const beforeLines = fs.readFileSync(inv, 'utf8').trim().split('\n').filter(Boolean);
  if (beforeLines.length === 1 && beforeLines[0].startsWith('ABSENT')) continue;
  for (const line of beforeLines) {
    const [expected, absolute] = line.split(/\s+/, 2);
    if (!fs.existsSync(absolute)) { fail(`read-only file missing: ${absolute}`); continue; }
    const actual = await sha256(absolute);
    if (actual !== expected) fail(`read-only file content changed: ${path.relative(repo, absolute)}`);
  }
}

for (const [label, rel] of Object.entries({ skills: 'packages/skills/node_modules/@vibe-engineer/artifacts', registry: 'packages/registry/node_modules/@vibe-engineer/artifacts' })) {
  const link = path.join(repo, rel);
  if (!fs.existsSync(link)) fail(`${label} artifacts pnpm link missing`);
  else {
    const real = fs.realpathSync(link);
    notes.push(`${label} link realpath ${real}`);
    if (real !== path.join(repo, 'packages/artifacts')) fail(`${label} artifacts link resolves to ${real}`);
  }
}

const result = { ok: failures.length === 0, failures, notes, checkedAt: new Date().toISOString() };
fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify(result, null, 2));
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
