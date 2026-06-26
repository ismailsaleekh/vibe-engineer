import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const evidence = path.join(repo, '.vibe/work/POST-I05A-SKILLS-ARTIFACTS-PROVIDER-PIN/evidence/witness-results/skills-consumer');
fs.mkdirSync(evidence, { recursive: true });
const childCode = `
  import fs from 'node:fs';
  import path from 'node:path';
  import { validateArtifact, validateArtifactKind, validateArtifactFile } from '@vibe-engineer/artifacts';
  const evidence = ${JSON.stringify(evidence)};
  const canonical = ${JSON.stringify(path.join(repo, 'packages/artifacts/fixtures/valid/work_brief.json'))};
  const output = { cwd: process.cwd(), moduleFunctions: {}, canonical: null, negative: null };
  output.moduleFunctions.validateArtifact = typeof validateArtifact;
  output.moduleFunctions.validateArtifactKind = typeof validateArtifactKind;
  output.moduleFunctions.validateArtifactFile = typeof validateArtifactFile;
  const canonicalResult = validateArtifactFile(canonical, { kind: 'work_brief' });
  output.canonical = { ok: canonicalResult.ok, schemaId: canonicalResult.schemaId ?? null, errorCodes: canonicalResult.errors?.map((e) => e.code) ?? [] };
  const malformed = JSON.parse(fs.readFileSync(canonical, 'utf8'));
  delete malformed.sourceMetadata.rawIntentRefs;
  malformed.links = malformed.links.filter((link) => link.rel !== 'raw_intent');
  const negativePath = path.join(evidence, 'malformed-work-brief-missing-raw-intent.json');
  fs.writeFileSync(negativePath, JSON.stringify(malformed, null, 2) + '\\n');
  const negativeResult = validateArtifactFile(negativePath, { kind: 'work_brief' });
  output.negative = { path: negativePath, ok: negativeResult.ok, errors: negativeResult.errors?.map((e) => ({ code: e.code, pointer: e.pointer, message: e.message })) ?? [] };
  console.log(JSON.stringify(output, null, 2));
  if (output.moduleFunctions.validateArtifact !== 'function' || output.moduleFunctions.validateArtifactKind !== 'function' || output.moduleFunctions.validateArtifactFile !== 'function') process.exit(10);
  if (!canonicalResult.ok) process.exit(11);
  if (negativeResult.ok || !output.negative.errors.length) process.exit(12);
  if (!output.negative.errors.some((e) => e.code === 'BAD_LINK' || e.code === 'REQUIRED')) process.exit(13);
`;
const result = spawnSync(process.execPath, ['--input-type=module', '-e', childCode], {
  cwd: path.join(repo, 'packages/skills'),
  encoding: 'utf8'
});
fs.writeFileSync(path.join(evidence, 'child.stdout'), result.stdout ?? '');
fs.writeFileSync(path.join(evidence, 'child.stderr'), result.stderr ?? '');
fs.writeFileSync(path.join(evidence, 'child.exit'), String(result.status ?? result.signal ?? 'null'));
let parsed = null;
try { parsed = JSON.parse(result.stdout); } catch {}
const summary = { ok: result.status === 0, exit: result.status, signal: result.signal, parsed, stderr: result.stderr };
fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify(summary, null, 2));
if (!summary.ok) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(summary, null, 2));
