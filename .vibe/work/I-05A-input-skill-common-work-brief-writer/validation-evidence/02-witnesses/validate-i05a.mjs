import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const targetRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.join(targetRoot, '.vibe/work/I-05A-input-skill-common-work-brief-writer/validation-evidence/02-witnesses');
const outputRoot = path.join(evidenceRoot, 'output');
const fixturesRoot = path.join(targetRoot, 'packages/skills/fixtures/work-brief/common');

const writerModule = await import(pathToFileURL(path.join(targetRoot, 'packages/skills/src/input/common/work-brief-writer.js')).href);
const consumerModule = await import(pathToFileURL(path.join(targetRoot, 'packages/skills/src/input/common/work-brief-consumer.js')).href);
const validationModule = await import(pathToFileURL(path.join(targetRoot, 'packages/skills/src/shared/artifact-validation.js')).href);

const { writeWorkBrief, validateAssembledWorkBrief } = writerModule;
const { consumeWorkBriefFile } = consumerModule;
const { validateAnyArtifact, validateWorkBriefArtifact, validateWorkBriefFile, ValidationErrorCode } = validationModule;

const checks = [];
function record(name, ok, details = {}) {
  checks.push({ name, ok, ...details });
}
function requireCheck(name, condition, details = {}) {
  record(name, Boolean(condition), details);
}
function errorCodes(result) {
  return Array.isArray(result?.errors) ? result.errors.map((error) => error.code) : [];
}
async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}
async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}
async function removeIfExists(filePath) {
  await fs.rm(filePath, { force: true }).catch(() => {});
}
function canonicalize(value) {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}
function canonicalString(value) {
  return JSON.stringify(canonicalize(value));
}

await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(path.join(outputRoot, 'produced'), { recursive: true });
await fs.mkdir(path.join(outputRoot, 'negative'), { recursive: true });
await fs.mkdir(path.join(outputRoot, 'carrier'), { recursive: true });

for (const skill of ['brainstorm', 'grill-me', 'task']) {
  const inputPath = path.join(fixturesRoot, 'valid-input', `${skill}.json`);
  const outputPath = path.join(outputRoot, 'produced', `${skill}.work-brief.json`);
  const input = await readJson(inputPath);
  const result = await writeWorkBrief(input, outputPath);
  requireCheck(`positive writer ok ${skill}`, result.ok === true, { result });
  if (result.ok) {
    requireCheck(`positive sourceSkill ${skill}`, result.value.artifact.sourceSkill === skill, { sourceSkill: result.value.artifact.sourceSkill });
    requireCheck(`positive raw_intent ${skill}`, result.value.artifact.links.some((link) => link.rel === 'raw_intent' && link.required === true), { links: result.value.artifact.links });
    const kindValidation = validateWorkBriefArtifact(result.value.artifact, outputPath);
    const anyValidation = validateAnyArtifact(result.value.artifact, outputPath);
    const fileValidation = validateWorkBriefFile(outputPath);
    const consumer = consumeWorkBriefFile(outputPath);
    const reread = await readJson(outputPath);
    requireCheck(`actual validateArtifactKind accepts ${skill}`, kindValidation.ok === true, { kindValidation });
    requireCheck(`actual validateArtifact accepts ${skill}`, anyValidation.ok === true, { anyValidation });
    requireCheck(`actual validateArtifactFile accepts ${skill}`, fileValidation.ok === true, { fileValidation });
    requireCheck(`lane consumer accepts ${skill}`, consumer.ok === true, { consumer });
    requireCheck(`reread stable ${skill}`, canonicalString(reread) === canonicalString(result.value.reread) && canonicalString(reread) === canonicalString(result.value.artifact), { producedPath: outputPath });
  }
  const fixtureOutputPath = path.join(fixturesRoot, 'valid-output', `${skill}.work-brief.json`);
  const fixtureOutputValidation = validateWorkBriefFile(fixtureOutputPath);
  requireCheck(`valid output fixture validateArtifactFile ${skill}`, fixtureOutputValidation.ok === true, { fixtureOutputValidation });
}

async function expectWriterRejects(name, input, expectedCode) {
  const outputPath = path.join(outputRoot, 'negative', `${name}.json`);
  await removeIfExists(outputPath);
  const result = await writeWorkBrief(input, outputPath);
  const codes = errorCodes(result);
  requireCheck(`${name} writer rejects`, result.ok === false, { result });
  requireCheck(`${name} includes ${expectedCode}`, codes.includes(expectedCode), { codes, result });
  requireCheck(`${name} not persisted`, await exists(outputPath) === false, { outputPath });
}

await expectWriterRejects(
  'missing-desired-outcome',
  await readJson(path.join(fixturesRoot, 'invalid-input/missing-desired-outcome.json')),
  ValidationErrorCode.REQUIRED
);

const missingSourceMetadata = await readJson(path.join(fixturesRoot, 'valid-input/task.json'));
delete missingSourceMetadata.sourceMetadata;
missingSourceMetadata.artifactId = 'work-brief-missing-source-metadata-validation';
await expectWriterRejects('missing-source-metadata', missingSourceMetadata, ValidationErrorCode.REQUIRED);

await expectWriterRejects(
  'missing-raw-intent',
  await readJson(path.join(fixturesRoot, 'invalid-input/missing-raw-intent.json')),
  ValidationErrorCode.BAD_LINK
);
await expectWriterRejects(
  'invalid-enums',
  await readJson(path.join(fixturesRoot, 'invalid-input/invalid-enums.json')),
  ValidationErrorCode.ENUM
);

const validTask = await readJson(path.join(fixturesRoot, 'valid-input/task.json'));
const wrongExtensionPath = path.join(outputRoot, 'carrier', 'wrong-extension.txt');
await fs.writeFile(wrongExtensionPath, JSON.stringify(validateAssembledWorkBrief(validTask).value.artifact, null, 2), 'utf8');
const wrongExtensionValidation = validateWorkBriefFile(wrongExtensionPath);
requireCheck('actual validateArtifactFile rejects wrong extension', wrongExtensionValidation.ok === false && errorCodes(wrongExtensionValidation).includes(ValidationErrorCode.CARRIER_NOT_JSON), { wrongExtensionValidation });
const writerWrongExtensionPath = path.join(outputRoot, 'carrier', 'writer-wrong-extension.txt');
await removeIfExists(writerWrongExtensionPath);
const writerWrongExtension = await writeWorkBrief(validTask, writerWrongExtensionPath);
requireCheck('writer rejects wrong extension before persist', writerWrongExtension.ok === false && errorCodes(writerWrongExtension).includes(ValidationErrorCode.CARRIER_NOT_JSON), { writerWrongExtension });
requireCheck('writer wrong extension not persisted', await exists(writerWrongExtensionPath) === false, { writerWrongExtensionPath });

const malformedPath = path.join(outputRoot, 'carrier', 'malformed-json.json');
await fs.writeFile(malformedPath, '{"schemaVersion":"1.0.0",', 'utf8');
const malformedValidation = validateWorkBriefFile(malformedPath);
requireCheck('actual validateArtifactFile rejects malformed JSON', malformedValidation.ok === false && errorCodes(malformedValidation).includes(ValidationErrorCode.JSON_PARSE_ERROR), { malformedValidation });

const failed = checks.filter((check) => !check.ok);
const results = {
  ok: failed.length === 0,
  checkCount: checks.length,
  failedCount: failed.length,
  failed,
  checks
};
await fs.writeFile(path.join(outputRoot, 'validation-witness-results.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: results.ok, checkCount: results.checkCount, failedCount: results.failedCount }, null, 2));
if (!results.ok) process.exit(1);
