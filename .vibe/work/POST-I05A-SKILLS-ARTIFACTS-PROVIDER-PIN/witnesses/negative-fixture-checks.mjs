import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const evidence = path.join(repo, '.vibe/work/POST-I05A-SKILLS-ARTIFACTS-PROVIDER-PIN/evidence/negative-fixtures');
fs.mkdirSync(evidence, { recursive: true });
function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(repo, rel), 'utf8')); }
function read(rel) { return fs.readFileSync(path.join(repo, rel), 'utf8'); }
function blockForImporter(lockText, importer) {
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
function hasArtifactsEdge(lockText, importer) {
  const b = blockForImporter(lockText, importer);
  return b.includes("'@vibe-engineer/artifacts':") && b.includes('specifier: workspace:*') && b.includes('version: link:../artifacts');
}
function validateState(state) {
  const errors = [];
  if (state.skillsManifest.dependencies?.['@vibe-engineer/artifacts'] !== 'workspace:*') errors.push('missing-skills-artifacts-dependency');
  if (state.registryManifest.dependencies?.['@vibe-engineer/artifacts'] !== 'workspace:*') errors.push('missing-registry-artifacts-dependency');
  if (!hasArtifactsEdge(state.lockfile, 'packages/skills')) errors.push('missing-skills-lockfile-edge');
  if (!hasArtifactsEdge(state.lockfile, 'packages/registry')) errors.push('missing-registry-lockfile-edge');
  if (state.registryRuntimeSource.includes('../../artifacts/src/index.js') || state.registryRuntimeSource.includes('../artifacts/src/index.js')) errors.push('registry-runtime-relative-reach-in');
  if (state.registryTypeSource.includes('../../artifacts/src/generated/types.d.ts') || state.registryTypeSource.includes('../artifacts/src/generated/types.d.ts')) errors.push('registry-type-relative-reach-in');
  if (state.rootManifest.dependencies?.['@vibe-engineer/artifacts'] || state.rootManifest.devDependencies?.['@vibe-engineer/artifacts']) errors.push('root-artifacts-dependency-workaround');
  for (const [name, manifest] of Object.entries(state.productionManifests)) {
    if (manifest.dependencies?.['@vibe-engineer/testing']) errors.push(`production-testing-dependency:${name}`);
  }
  if (state.proof?.kind !== 'public-package-import' || state.proof?.specifier !== '@vibe-engineer/artifacts') errors.push('invalid-artifacts-proof-not-public-package-import');
  return errors;
}
const base = {
  skillsManifest: readJson('packages/skills/package.json'),
  registryManifest: readJson('packages/registry/package.json'),
  rootManifest: readJson('package.json'),
  lockfile: read('pnpm-lock.yaml'),
  registryRuntimeSource: read('packages/registry/src/index.js'),
  registryTypeSource: read('packages/registry/src/index.d.ts'),
  productionManifests: Object.fromEntries(['packages/cli/package.json','packages/context/package.json','packages/orchestration/package.json','packages/registry/package.json','packages/skills/package.json'].map((rel) => [rel, readJson(rel)])),
  proof: { kind: 'public-package-import', specifier: '@vibe-engineer/artifacts' }
};
const baseErrors = validateState(base);
const cases = [];
function mutateCase(name, mutate, expectedError) {
  const clone = structuredClone(base);
  mutate(clone);
  const errors = validateState(clone);
  fs.writeFileSync(path.join(evidence, `${name}.json`), JSON.stringify({ errors, expectedError }, null, 2));
  cases.push({ name, errors, expectedError, ok: errors.includes(expectedError) });
}
mutateCase('missing-skills-dep', (s) => { delete s.skillsManifest.dependencies['@vibe-engineer/artifacts']; }, 'missing-skills-artifacts-dependency');
mutateCase('missing-registry-dep', (s) => { delete s.registryManifest.dependencies['@vibe-engineer/artifacts']; }, 'missing-registry-artifacts-dependency');
mutateCase('missing-skills-lock-edge', (s) => { s.lockfile = s.lockfile.replace(blockForImporter(s.lockfile, 'packages/skills'), '  packages/skills: {}'); }, 'missing-skills-lockfile-edge');
mutateCase('missing-registry-lock-edge', (s) => { s.lockfile = s.lockfile.replace(blockForImporter(s.lockfile, 'packages/registry'), '  packages/registry: {}'); }, 'missing-registry-lockfile-edge');
mutateCase('runtime-relative-reach-in', (s) => { s.registryRuntimeSource = s.registryRuntimeSource.replace("from '@vibe-engineer/artifacts'", "from '../../artifacts/src/index.js'"); }, 'registry-runtime-relative-reach-in');
mutateCase('type-relative-reach-in', (s) => { s.registryTypeSource = s.registryTypeSource.replace("from '@vibe-engineer/artifacts'", "from '../../artifacts/src/generated/types.d.ts'"); }, 'registry-type-relative-reach-in');
mutateCase('root-artifacts-workaround', (s) => { s.rootManifest.dependencies = { ...(s.rootManifest.dependencies ?? {}), '@vibe-engineer/artifacts': 'workspace:*' }; }, 'root-artifacts-dependency-workaround');
mutateCase('prod-testing-dependency', (s) => { s.productionManifests['packages/skills/package.json'].dependencies['@vibe-engineer/testing'] = 'workspace:*'; }, 'production-testing-dependency:packages/skills/package.json');
mutateCase('mock-relative-validator-proof', (s) => { s.proof = { kind: 'relative-import', specifier: '../artifacts/src/validation.js' }; }, 'invalid-artifacts-proof-not-public-package-import');
const result = { ok: baseErrors.length === 0 && cases.every((c) => c.ok), baseErrors, cases };
fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify(result, null, 2));
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
