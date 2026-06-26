import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const evidence = path.join(repo, '.vibe/work/POST-I05A-SKILLS-ARTIFACTS-PROVIDER-PIN/evidence/witness-results/registry-public-import');
fs.mkdirSync(evidence, { recursive: true });
const registryJs = fs.readFileSync(path.join(repo, 'packages/registry/src/index.js'), 'utf8');
const registryDts = fs.readFileSync(path.join(repo, 'packages/registry/src/index.d.ts'), 'utf8');
if (registryJs.includes('../../artifacts/src') || registryJs.includes('../artifacts/src') || registryDts.includes('../../artifacts/src') || registryDts.includes('../artifacts/src')) {
  throw new Error('registry source still contains relative artifacts reach-in');
}
const childCode = `
  import { ARTIFACT_KINDS, loadSchema, validateArtifactFile } from '@vibe-engineer/artifacts';
  import { canonicalSchemaIdsByKind } from '@vibe-engineer/registry';
  const schemaIds = canonicalSchemaIdsByKind();
  const output = {
    cwd: process.cwd(),
    artifactKindsLength: ARTIFACT_KINDS.length,
    loadSchemaType: typeof loadSchema,
    validateArtifactFileType: typeof validateArtifactFile,
    schemaIds,
    workBriefId: schemaIds.work_brief ?? null,
    agentRegistryEntryId: schemaIds.agent_registry_entry ?? null
  };
  console.log(JSON.stringify(output, null, 2));
  if (!Array.isArray(ARTIFACT_KINDS) || ARTIFACT_KINDS.length === 0) process.exit(10);
  if (typeof loadSchema !== 'function' || typeof validateArtifactFile !== 'function') process.exit(11);
  if (!schemaIds.work_brief || !schemaIds.agent_registry_entry) process.exit(12);
`;
const result = spawnSync(process.execPath, ['--input-type=module', '-e', childCode], {
  cwd: path.join(repo, 'packages/registry'),
  encoding: 'utf8'
});
fs.writeFileSync(path.join(evidence, 'child.stdout'), result.stdout ?? '');
fs.writeFileSync(path.join(evidence, 'child.stderr'), result.stderr ?? '');
fs.writeFileSync(path.join(evidence, 'child.exit'), String(result.status ?? result.signal ?? 'null'));
let parsed = null;
try { parsed = JSON.parse(result.stdout); } catch {}
const summary = { ok: result.status === 0, exit: result.status, signal: result.signal, parsed, sourceScan: { runtimeRelativeAbsent: true, typeRelativeAbsent: true }, stderr: result.stderr };
fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify(summary, null, 2));
if (!summary.ok) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(summary, null, 2));
