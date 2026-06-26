import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const targetRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.join(targetRoot, '.vibe/work/I-05B-brainstorm-grill-task-producers/validation-evidence/03-witnesses');
const outputRoot = path.join(evidenceRoot, 'output');
const positiveRoot = path.join(outputRoot, 'positive-root');
const negativeRoot = path.join(outputRoot, 'negative-root');
const intakeRoot = path.join(outputRoot, 'intake-root');
const resultsPath = path.join(outputRoot, 'i05b-validation-witness-results.json');

async function importFromTarget(relativePath) {
  return import(pathToFileURL(path.join(targetRoot, relativePath)).href);
}

const { produceBrainstormWorkBrief } = await importFromTarget('packages/skills/src/input/brainstorm/produce-work-brief.js');
const { produceGrillMeWorkBrief } = await importFromTarget('packages/skills/src/input/grill-me/produce-work-brief.js');
const { produceTaskWorkBrief } = await importFromTarget('packages/skills/src/input/task/produce-work-brief.js');
const { intakeWorkBriefForPlan } = await importFromTarget('packages/skills/src/plan/intake/work-brief-intake.js');
const {
  validateWorkBriefArtifact,
  validateWorkBriefFile,
  validateAnyArtifactFile
} = await importFromTarget('packages/skills/src/shared/artifact-validation.js');

const checks = [];
function record(name, ok, details = {}) {
  checks.push({ name, ok: Boolean(ok), ...details });
}
function plainClone(value) {
  return JSON.parse(JSON.stringify(value));
}
async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}
async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
function expectedArtifactPath(root, artifactName) {
  return path.resolve(root, artifactName);
}
async function assertNoFile(label, filePath) {
  record(`${label}: no invalid artifact persisted`, !(await exists(filePath)), { filePath });
}
function errorCodes(result) {
  return (result?.errors ?? result?.value?.errors ?? result?.details?.errors ?? []).map((error) => error.code ?? error.reason ?? error.message);
}
function blockedOk(result, reason) {
  return result && result.ok === false && (reason === undefined || result.reason === reason || result.stage === reason);
}

await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(positiveRoot, { recursive: true });
await fs.mkdir(negativeRoot, { recursive: true });
await fs.mkdir(intakeRoot, { recursive: true });

const fixtureRoot = path.join(targetRoot, 'packages/skills/fixtures/work-brief/producers/positive-input');
const positiveInputs = {
  brainstorm: await readJson(path.join(fixtureRoot, 'brainstorm.json')),
  'grill-me': await readJson(path.join(fixtureRoot, 'grill-me.json')),
  task: await readJson(path.join(fixtureRoot, 'task.json'))
};
const producers = [
  { skill: 'brainstorm', fn: produceBrainstormWorkBrief, input: positiveInputs.brainstorm },
  { skill: 'grill-me', fn: produceGrillMeWorkBrief, input: positiveInputs['grill-me'] },
  { skill: 'task', fn: produceTaskWorkBrief, input: positiveInputs.task }
];
const producedArtifacts = new Map();

for (const producer of producers) {
  const artifactName = `produced/${producer.skill}.work-brief.json`;
  const result = await producer.fn(plainClone(producer.input), { outputRoot: positiveRoot, artifactName });
  record(`positive ${producer.skill}: producer returns ok`, result.ok, { reason: result.reason });
  const filePath = expectedArtifactPath(positiveRoot, artifactName);
  record(`positive ${producer.skill}: persisted file exists`, await exists(filePath), { filePath });
  if (result.ok) {
    record(`positive ${producer.skill}: producer reports I-05A file validation ok`, result.value.fileValidation?.ok === true, { filePath: result.value.filePath });
  }
  const artifact = await readJson(filePath);
  producedArtifacts.set(producer.skill, artifact);
  record(`positive ${producer.skill}: canonical artifact kind`, artifact.artifactKind === 'work_brief', { artifactKind: artifact.artifactKind });
  record(`positive ${producer.skill}: canonical schema version`, artifact.schemaVersion === '1.0.0', { schemaVersion: artifact.schemaVersion });
  record(`positive ${producer.skill}: source skill`, artifact.sourceSkill === producer.skill, { sourceSkill: artifact.sourceSkill });
  record(`positive ${producer.skill}: ready status`, artifact.status === 'ready', { status: artifact.status });
  record(`positive ${producer.skill}: raw_intent link present`, Array.isArray(artifact.links) && artifact.links.some((link) => link.rel === 'raw_intent' && link.required === true), { links: artifact.links });
  const inMemoryValidation = validateWorkBriefArtifact(artifact, filePath);
  record(`positive ${producer.skill}: public work brief artifact validator accepts`, inMemoryValidation.ok, { errors: inMemoryValidation.errors });
  const fileValidation = validateWorkBriefFile(filePath);
  record(`positive ${producer.skill}: public work brief file validator accepts`, fileValidation.ok, { errors: fileValidation.errors });
  const anyValidation = validateAnyArtifactFile(filePath);
  record(`positive ${producer.skill}: public any-artifact file validator accepts`, anyValidation.ok, { errors: anyValidation.errors });
  const intake = await intakeWorkBriefForPlan({ inputRoot: positiveRoot, artifactName });
  record(`positive ${producer.skill}: plan intake consumes same persisted file`, intake.ok && intake.value.artifact.artifactId === artifact.artifactId && intake.value.artifact.sourceSkill === producer.skill, { reason: intake.reason, artifactId: intake.value?.artifact?.artifactId });
}

async function producerNegative(label, fn, input, artifactName, options = {}) {
  const root = options.outputRoot ?? negativeRoot;
  const possiblePath = path.isAbsolute(artifactName) ? artifactName : expectedArtifactPath(root, artifactName || 'empty-name-placeholder.json');
  if (options.preserveExisting !== true && artifactName && !artifactName.endsWith('/') && !artifactName.endsWith('\\')) {
    await fs.rm(possiblePath, { force: true, recursive: true });
  }
  const result = await fn(input, { outputRoot: root, artifactName });
  record(`${label}: blocked`, blockedOk(result), { reason: result.reason, errors: result.errors });
  if (options.assertNoFile !== false && artifactName) await assertNoFile(label, possiblePath);
  return result;
}

await producerNegative('negative producer non-object/raw text', produceBrainstormWorkBrief, 'raw chat text', 'non-object.work-brief.json');
{
  const input = plainClone(positiveInputs.brainstorm);
  delete input.desiredOutcome;
  await producerNegative('negative missing common Work Brief field', produceBrainstormWorkBrief, input, 'missing-common.work-brief.json');
}
{
  const input = plainClone(positiveInputs.brainstorm);
  delete input.ideaContext;
  await producerNegative('negative missing producer-specific required field', produceBrainstormWorkBrief, input, 'missing-producer-specific.work-brief.json');
}
{
  const input = plainClone(positiveInputs.brainstorm);
  input.sourceSkill = 'task';
  input.rawIntent.sourceSkill = 'task';
  await producerNegative('negative invalid sourceSkill / producer mismatch', produceBrainstormWorkBrief, input, 'source-mismatch.work-brief.json');
}
{
  const input = plainClone(positiveInputs.task);
  input.workType = 'story';
  await producerNegative('negative invalid workType enum', produceTaskWorkBrief, input, 'invalid-work-type.work-brief.json');
}
{
  const input = plainClone(positiveInputs.brainstorm);
  input.options = [];
  input.tradeoffs = [];
  input.openQuestions = [];
  input.candidateScenarios = [];
  await producerNegative('negative brainstorm without exploration signal', produceBrainstormWorkBrief, input, 'brainstorm-no-signal.work-brief.json');
}
{
  const input = plainClone(positiveInputs['grill-me']);
  input.challengedAssumptions = [];
  input.edgeCases = [];
  input.acceptanceGaps = [];
  input.riskCandidates = [];
  await producerNegative('negative grill-me without challenge signal', produceGrillMeWorkBrief, input, 'grill-no-signal.work-brief.json');
}
{
  const input = plainClone(positiveInputs.task);
  delete input.objective;
  delete input.request;
  await producerNegative('negative task with neither objective nor request', produceTaskWorkBrief, input, 'task-no-objective.work-brief.json');
}
for (const [field, label] of [
  ['observedBehavior', 'bug task missing observed behavior'],
  ['expectedBehavior', 'bug task missing expected behavior'],
  ['reproductionSteps', 'bug task missing reproduction basis']
]) {
  const input = plainClone(positiveInputs.task);
  if (field === 'reproductionSteps') input.reproductionSteps = [];
  else delete input[field];
  await producerNegative(`negative ${label}`, produceTaskWorkBrief, input, `${field}-missing.work-brief.json`);
}
await producerNegative('negative unsafe output path traversal', produceBrainstormWorkBrief, plainClone(positiveInputs.brainstorm), '../escape/escaped.work-brief.json', { outputRoot: negativeRoot });
await producerNegative('negative absolute output artifact name', produceBrainstormWorkBrief, plainClone(positiveInputs.brainstorm), path.join(outputRoot, 'absolute.work-brief.json'));
await producerNegative('negative empty output artifact name', produceBrainstormWorkBrief, plainClone(positiveInputs.brainstorm), '');
const producerDirTarget = path.join(negativeRoot, 'directory-target.json');
await fs.mkdir(producerDirTarget, { recursive: true });
await producerNegative('negative directory output target', produceBrainstormWorkBrief, plainClone(positiveInputs.brainstorm), 'directory-target.json', { assertNoFile: false, preserveExisting: true });
for (const ext of ['md', 'yaml', 'txt']) {
  await producerNegative(`negative non-json output carrier .${ext}`, produceBrainstormWorkBrief, plainClone(positiveInputs.brainstorm), `non-json-output.${ext}`);
}

async function planNegative(label, descriptor, expectedReason) {
  const result = await intakeWorkBriefForPlan(descriptor);
  record(`${label}: blocked`, blockedOk(result, expectedReason), { reason: result.reason, stage: result.stage, errors: result.errors });
  return result;
}

await planNegative('negative raw direct request object to plan intake', { request: 'please plan this raw request' }, 'invalid_intake_descriptor');
await planNegative('negative raw chat string to plan intake', 'please plan this raw chat', 'invalid_intake_descriptor');
await planNegative('negative missing file', { inputRoot: intakeRoot, artifactName: 'missing.work-brief.json' }, 'missing_work_brief');
await planNegative('negative unsafe input path traversal', { inputRoot: intakeRoot, artifactName: '../escape/escaped.work-brief.json' }, 'unsafe_path');
await planNegative('negative absolute input artifact name', { inputRoot: intakeRoot, artifactName: path.join(outputRoot, 'absolute-input.work-brief.json') }, 'unsafe_path');
await planNegative('negative empty input artifact name', { inputRoot: intakeRoot, artifactName: '' }, 'invalid_intake_descriptor');
const intakeDirTarget = path.join(intakeRoot, 'directory-target.json');
await fs.mkdir(intakeDirTarget, { recursive: true });
await planNegative('negative directory input target', { inputRoot: intakeRoot, artifactName: 'directory-target.json' }, 'directory_target');
for (const ext of ['md', 'yaml', 'txt']) {
  const name = `non-json-input.${ext}`;
  await fs.writeFile(path.join(intakeRoot, name), 'not a canonical Work Brief JSON carrier\n', 'utf8');
  await planNegative(`negative non-json input carrier .${ext}`, { inputRoot: intakeRoot, artifactName: name }, 'carrier_not_json');
}
await fs.writeFile(path.join(intakeRoot, 'malformed-json.work-brief.json'), '{ not json', 'utf8');
const malformedFileValidation = validateWorkBriefFile(path.join(intakeRoot, 'malformed-json.work-brief.json'));
record('negative malformed JSON: public file validator rejects', !malformedFileValidation.ok && errorCodes(malformedFileValidation).includes('JSON_PARSE_ERROR'), { errors: malformedFileValidation.errors });
await planNegative('negative malformed JSON through plan intake', { inputRoot: intakeRoot, artifactName: 'malformed-json.work-brief.json' }, 'validation_failed');

const validBrainstormArtifact = producedArtifacts.get('brainstorm');
await writeJson(path.join(intakeRoot, 'wrong-kind.work-brief.json'), { ...plainClone(validBrainstormArtifact), artifactKind: 'implementation_plan' });
await planNegative('negative wrong artifactKind through plan intake', { inputRoot: intakeRoot, artifactName: 'wrong-kind.work-brief.json' }, 'validation_failed');
await writeJson(path.join(intakeRoot, 'wrong-schema-version.work-brief.json'), { ...plainClone(validBrainstormArtifact), schemaVersion: '2.0.0' });
await planNegative('negative wrong schema version through plan intake', { inputRoot: intakeRoot, artifactName: 'wrong-schema-version.work-brief.json' }, 'validation_failed');
await writeJson(path.join(intakeRoot, 'wrong-source-skill.work-brief.json'), { ...plainClone(validBrainstormArtifact), sourceSkill: 'plan', producer: { ...validBrainstormArtifact.producer, name: 'plan', id: 'skill-plan' } });
await planNegative('negative wrong source skill through plan intake', { inputRoot: intakeRoot, artifactName: 'wrong-source-skill.work-brief.json' }, 'validation_failed');
await writeJson(path.join(intakeRoot, 'malformed-shape.work-brief.json'), { schemaVersion: '1.0.0', artifactKind: 'work_brief', artifactId: 'malformed-shape' });
await planNegative('negative malformed artifact shape through plan intake', { inputRoot: intakeRoot, artifactName: 'malformed-shape.work-brief.json' }, 'validation_failed');
const blockedArtifact = { ...plainClone(validBrainstormArtifact), artifactId: 'work-brief-blocked-for-plan-intake', status: 'blocked' };
await writeJson(path.join(intakeRoot, 'blocked-status.work-brief.json'), blockedArtifact);
const blockedFileValidation = validateWorkBriefFile(path.join(intakeRoot, 'blocked-status.work-brief.json'));
record('negative blocked Work Brief: public file validator accepts schema/status', blockedFileValidation.ok, { errors: blockedFileValidation.errors });
await planNegative('negative blocked Work Brief not green-consumable by plan intake', { inputRoot: intakeRoot, artifactName: 'blocked-status.work-brief.json' }, 'work_brief_blocked');

// Regression/contract checks over actual decision/schema files.
const dl03 = await fs.readFile(path.join(targetRoot, 'docs/decisions/DL-03-skill-protocols.md'), 'utf8');
const sixSkillLinePresent = dl03.includes('The six normal user-facing skills are exactly `brainstorm`, `grill-me`, `task`, `plan`, `build`, and `ship`');
record('regression DL-03 six user-facing skills exactly preserved', sixSkillLinePresent);
const workBriefSchema = await readJson(path.join(targetRoot, 'packages/artifacts/schemas/work-brief.schema.json'));
record('regression Work Brief sourceSkill enum exactly producers', JSON.stringify(workBriefSchema.properties.sourceSkill.enum) === JSON.stringify(['brainstorm', 'grill-me', 'task']), { enum: workBriefSchema.properties.sourceSkill.enum });
record('regression Work Brief workType enum contains required values', ['feature','bug','chore','refactor','research','decision'].every((value) => workBriefSchema.properties.workType.enum.includes(value)), { enum: workBriefSchema.properties.workType.enum });
record('regression producers share same artifact class', [...producedArtifacts.values()].every((artifact) => artifact.artifactKind === 'work_brief' && artifact.schemaVersion === '1.0.0'));
record('regression plan intake remains intake-only success shape', typeof intakeWorkBriefForPlan === 'function' && [...producedArtifacts.keys()].length === 3);

const failed = checks.filter((check) => !check.ok);
const summary = {
  ok: failed.length === 0,
  checkCount: checks.length,
  failedCount: failed.length,
  outputRoot,
  positiveRoot,
  negativeRoot,
  intakeRoot,
  checks
};
await fs.mkdir(outputRoot, { recursive: true });
await fs.writeFile(resultsPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: summary.ok, checkCount: summary.checkCount, failedCount: summary.failedCount, resultsPath }, null, 2));
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2));
  process.exitCode = 1;
}
