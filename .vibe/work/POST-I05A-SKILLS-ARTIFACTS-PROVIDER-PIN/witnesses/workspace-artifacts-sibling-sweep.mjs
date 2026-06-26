import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const evidence = path.join(repo, '.vibe/work/POST-I05A-SKILLS-ARTIFACTS-PROVIDER-PIN/evidence/witness-results/workspace-sibling-sweep');
fs.mkdirSync(evidence, { recursive: true });
const failures = [];
function fail(m) { failures.push(m); }
function listFiles(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    const rel = path.relative(repo, p).replaceAll(path.sep, '/');
    if (rel.includes('/node_modules/') || rel.startsWith('node_modules/') || rel.startsWith('.vibe/')) continue;
    if (entry.isDirectory()) out.push(...listFiles(p, predicate));
    else if (predicate(p)) out.push(p);
  }
  return out.sort();
}
function packageManifests() {
  const roots = [path.join(repo, 'packages')];
  const manifests = [];
  for (const root of roots) {
    for (const pkg of listFiles(root, (p) => path.basename(p) === 'package.json')) {
      const rel = path.relative(repo, pkg).replaceAll(path.sep, '/');
      const parts = rel.split('/');
      const isWorkspace = parts[0] === 'packages' && ((parts.length === 3) || (parts.length === 4 && ['presets','adapters'].includes(parts[1])));
      if (isWorkspace) manifests.push(pkg);
    }
  }
  return manifests.sort();
}
function importerBlock(lockText, importer) {
  const lines = lockText.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${importer}:` || line === `  ${importer}: {}`);
  if (start < 0) return '';
  const out = [];
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    if (i > start && /^  [^ ].*:/.test(line)) break;
    if (i > start && line === 'packages:') break;
    out.push(line);
  }
  return out.join('\n');
}
function hasLockEdge(lockText, importer, dep, target) {
  const block = importerBlock(lockText, importer);
  return block.includes(`'${dep}':`) && block.includes('specifier: workspace:*') && block.includes(`version: link:${target}`);
}
const lockText = fs.readFileSync(path.join(repo, 'pnpm-lock.yaml'), 'utf8');
const manifests = packageManifests();
const packages = manifests.map((manifestPath) => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const importer = path.relative(repo, path.dirname(manifestPath)).replaceAll(path.sep, '/');
  return { manifestPath, importer, name: manifest.name, manifest };
});
const sourceFiles = listFiles(path.join(repo, 'packages'), (p) => /\.(?:js|mjs|cjs|ts|d\.ts|tsx)$/.test(p));
const relativeReachIns = [];
const publicImportFiles = [];
const duplicationSuspects = [];
for (const file of sourceFiles) {
  const rel = path.relative(repo, file).replaceAll(path.sep, '/');
  const text = fs.readFileSync(file, 'utf8');
  if (!rel.startsWith('packages/artifacts/') && (text.includes('../../artifacts/src') || text.includes('../artifacts/src'))) relativeReachIns.push(rel);
  if (!rel.startsWith('packages/artifacts/') && text.includes('@vibe-engineer/artifacts')) publicImportFiles.push(rel);
  if (!rel.startsWith('packages/artifacts/') && /function\s+validateArtifact(?:Kind|File)?\s*\(/.test(text)) duplicationSuspects.push(rel);
}
if (relativeReachIns.length) fail(`relative artifacts source reach-ins outside provider: ${relativeReachIns.join(', ')}`);
const publicImportPackages = new Set();
for (const rel of publicImportFiles) {
  const parts = rel.split('/');
  const importer = parts[1] === 'presets' || parts[1] === 'adapters' ? parts.slice(0, 3).join('/') : parts.slice(0, 2).join('/');
  publicImportPackages.add(importer);
}
const intended = new Set(['packages/cli','packages/context','packages/orchestration','packages/skills','packages/registry']);
const manifestConsumers = packages.filter((p) => p.manifest.dependencies?.['@vibe-engineer/artifacts'] === 'workspace:*').map((p) => p.importer).sort();
for (const importer of publicImportPackages) {
  const pkg = packages.find((p) => p.importer === importer);
  if (!pkg) { fail(`source import in non-workspace package ${importer}`); continue; }
  if (pkg.manifest.dependencies?.['@vibe-engineer/artifacts'] !== 'workspace:*') fail(`${pkg.name} imports @vibe-engineer/artifacts without manifest dependency`);
  if (!hasLockEdge(lockText, importer, '@vibe-engineer/artifacts', '../artifacts')) fail(`${pkg.name} imports @vibe-engineer/artifacts without lockfile edge`);
}
const additionalActualConsumers = [];
for (const importer of manifestConsumers) {
  if (!hasLockEdge(lockText, importer, '@vibe-engineer/artifacts', '../artifacts')) fail(`manifest consumer lacks lock edge: ${importer}`);
  if (!intended.has(importer)) {
    additionalActualConsumers.push({
      importer,
      classification: importer === 'packages/verification'
        ? 'legitimate pre-existing I-09S serialized package handoff consumer; dependency and lockfile edge already present before this I-05A handoff and not edited here'
        : 'additional actual artifacts consumer with manifest and lockfile evidence; requires report classification'
    });
  }
}
for (const importer of intended) {
  if (!manifestConsumers.includes(importer)) fail(`intended artifacts provider consumer missing manifest dependency: ${importer}`);
}
if (duplicationSuspects.length) fail(`possible validator duplication outside provider: ${duplicationSuspects.join(', ')}`);
const result = { ok: failures.length === 0, failures, manifestConsumers, intendedConsumers: [...intended].sort(), additionalActualConsumers, publicImportFiles, publicImportPackages: [...publicImportPackages].sort(), relativeReachIns, duplicationSuspects, workspaceManifests: packages.map((p) => ({ name: p.name, importer: p.importer })) };
fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify(result, null, 2));
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
