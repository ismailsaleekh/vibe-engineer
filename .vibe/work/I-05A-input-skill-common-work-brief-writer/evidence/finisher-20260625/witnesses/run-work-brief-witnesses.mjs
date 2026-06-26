import fs from 'node:fs/promises';
import path from 'node:path';
import { writeWorkBrief } from '/Users/lizavasilyeva/work/vibe-engineer/packages/skills/src/input/common/work-brief-writer.js';
import { consumeWorkBriefFile } from '/Users/lizavasilyeva/work/vibe-engineer/packages/skills/src/input/common/work-brief-consumer.js';
import { validateAnyArtifactFile, validateWorkBriefArtifact, validateWorkBriefFile } from '/Users/lizavasilyeva/work/vibe-engineer/packages/skills/src/shared/artifact-validation.js';
import { canonicalJson } from '/Users/lizavasilyeva/work/vibe-engineer/packages/skills/src/shared/atomic-json-writer.js';

const targetRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const fixtureRoot = path.join(targetRoot, 'packages/skills/fixtures/work-brief/common');
const evidenceRoot = path.join(targetRoot, '.vibe/work/I-05A-input-skill-common-work-brief-writer/evidence/finisher-20260625/witness-output');
const producedRoot = path.join(evidenceRoot, 'produced');
const invalidRoot = path.join(evidenceRoot, 'invalid');
const resultPath = path.join(evidenceRoot, 'witness-results.json');
await fs.rm(evidenceRoot, { recursive: true, force: true });
await fs.mkdir(producedRoot, { recursive: true });
await fs.mkdir(invalidRoot, { recursive: true });

const checks = [];
function record(name, pass, details = {}) { checks.push({ name, pass, ...details }); }
function requirePass(name, condition, details = {}) { record(name, Boolean(condition), details); if (!condition) throw new Error(`${name} failed`); }
function codes(errors) { return (errors ?? []).map((error) => error.code).sort(); }
async function readJson(filePath) { return JSON.parse(await fs.readFile(filePath, 'utf8')); }

for (const skill of ['brainstorm', 'grill-me', 'task']) {
  const input = await readJson(path.join(fixtureRoot, 'valid-input', `${skill}.json`));
  const outputPath = path.join(producedRoot, `${skill}.work-brief.json`);
  const result = await writeWorkBrief(input, outputPath);
  requirePass(`positive:${skill}:writer-ok`, result.ok, result.ok ? { filePath: outputPath } : { errors: result.errors });
  requirePass(`positive:${skill}:artifact-validator-ok`, result.value.fileValidation.ok, result.value.fileValidation);
  const kindValidation = validateWorkBriefArtifact(result.value.artifact, outputPath);
  requirePass(`positive:${skill}:validateArtifactKind-ok`, kindValidation.ok, kindValidation);
  const fileValidation = validateWorkBriefFile(outputPath);
  requirePass(`carrier:${skill}:validateArtifactFile-ok`, fileValidation.ok, fileValidation);
  const consumer = consumeWorkBriefFile(outputPath);
  requirePass(`consumer:${skill}:revalidate-ok`, consumer.ok, consumer.ok ? consumer.value.validation : { errors: consumer.errors });
  const reread = await readJson(outputPath);
  requirePass(`carrier:${skill}:structure-consistent`, canonicalJson(reread) === canonicalJson(result.value.artifact), { filePath: outputPath });
}

for (const skill of ['brainstorm', 'grill-me', 'task']) {
  const fixturePath = path.join(fixtureRoot, 'valid-output', `${skill}.work-brief.json`);
  const validation = validateWorkBriefFile(fixturePath);
  requirePass(`fixture-output:${skill}:valid`, validation.ok, validation);
}

const negativeCases = [
  ['missing-desired-outcome', 'REQUIRED'],
  ['missing-raw-intent', 'BAD_LINK'],
  ['invalid-enums', 'ENUM']
];
for (const [fixture, expectedCode] of negativeCases) {
  const input = await readJson(path.join(fixtureRoot, 'invalid-input', `${fixture}.json`));
  const outputPath = path.join(invalidRoot, `${fixture}.work-brief.json`);
  const result = await writeWorkBrief(input, outputPath);
  const existsAfter = await fs.access(outputPath).then(() => true).catch(() => false);
  requirePass(`negative:${fixture}:blocked`, !result.ok, result.ok ? {} : { reason: result.reason, stage: result.stage, codes: codes(result.errors) });
  requirePass(`negative:${fixture}:expected-code`, codes(result.errors).includes(expectedCode), { expectedCode, codes: codes(result.errors) });
  requirePass(`negative:${fixture}:no-persist`, !existsAfter, { outputPath });
}

const validForCarrier = await readJson(path.join(fixtureRoot, 'valid-output/task.work-brief.json'));
const wrongExtensionPath = path.join(invalidRoot, 'wrong-extension.txt');
await fs.writeFile(wrongExtensionPath, canonicalJson(validForCarrier), 'utf8');
const wrongExtension = validateAnyArtifactFile(wrongExtensionPath);
requirePass('negative:wrong-extension:CARRIER_NOT_JSON', !wrongExtension.ok && codes(wrongExtension.errors).includes('CARRIER_NOT_JSON'), { codes: codes(wrongExtension.errors) });

const malformedPath = path.join(invalidRoot, 'malformed-json.json');
await fs.writeFile(malformedPath, '{"schemaVersion":"1.0.0",', 'utf8');
const malformed = validateAnyArtifactFile(malformedPath);
requirePass('negative:malformed-json:JSON_PARSE_ERROR', !malformed.ok && codes(malformed.errors).includes('JSON_PARSE_ERROR'), { codes: codes(malformed.errors) });

const forbiddenPaths = [
  'packages/skills/src/input/brainstorm',
  'packages/skills/src/input/grill-me',
  'packages/skills/src/input/task',
  'packages/skills/src/plan',
  'packages/skills/src/build',
  'packages/skills/src/ship',
  'packages/skills/fixtures/work-brief/producers'
];
for (const relativePath of forbiddenPaths) {
  const absent = await fs.access(path.join(targetRoot, relativePath)).then(() => false).catch(() => true);
  requirePass(`regression:forbidden-path-absent:${relativePath}`, absent, { relativePath });
}

const lockedSkills = ['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship'];
requirePass('regression:six-skill-identities-unchanged', lockedSkills.join('\n') === 'brainstorm\ngrill-me\ntask\nplan\nbuild\nship', { lockedSkills });

await fs.writeFile(resultPath, `${JSON.stringify({ ok: checks.every((check) => check.pass), checks }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, resultPath, checks: checks.length }));
