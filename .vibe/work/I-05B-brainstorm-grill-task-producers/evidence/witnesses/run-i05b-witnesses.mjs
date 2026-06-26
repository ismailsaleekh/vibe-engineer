import fs from 'node:fs/promises';
import path from 'node:path';
import { produceBrainstormWorkBrief } from '../../../../../packages/skills/src/input/brainstorm/produce-work-brief.js';
import { produceGrillMeWorkBrief } from '../../../../../packages/skills/src/input/grill-me/produce-work-brief.js';
import { produceTaskWorkBrief } from '../../../../../packages/skills/src/input/task/produce-work-brief.js';
import { validateWorkBriefFile, validateAnyArtifactFile } from '../../../../../packages/skills/src/shared/artifact-validation.js';
import { intakeWorkBriefForPlan } from '../../../../../packages/skills/src/plan/intake/work-brief-intake.js';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const laneRoot = path.join(repoRoot, '.vibe/work/I-05B-brainstorm-grill-task-producers');
const evidenceRoot = path.join(laneRoot, 'evidence/witnesses');
const outputRoot = path.join(evidenceRoot, 'output');
const producedRoot = path.join(outputRoot, 'produced');
const invalidRoot = path.join(outputRoot, 'invalid-attempts');
const fixtureRoot = path.join(repoRoot, 'packages/skills/fixtures/work-brief/producers');
const positiveInputRoot = path.join(fixtureRoot, 'positive-input');
const positiveOutputRoot = path.join(fixtureRoot, 'positive-output');
const negativeInputRoot = path.join(fixtureRoot, 'negative-input');
const negativePlanIntakeRoot = path.join(fixtureRoot, 'negative-plan-intake');
const resultPath = path.join(outputRoot, 'witness-results.json');

const checks = [];

function record(name, pass, details = {}) {
  checks.push({ name, pass, details });
  if (!pass) console.error(`FAIL ${name}: ${JSON.stringify(details)}`);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function producerFor(skill) {
  if (skill === 'brainstorm') return produceBrainstormWorkBrief;
  if (skill === 'grill-me') return produceGrillMeWorkBrief;
  if (skill === 'task') return produceTaskWorkBrief;
  throw new Error(`Unknown skill ${skill}`);
}

async function positiveProducer(skill) {
  const input = await readJson(path.join(positiveInputRoot, `${skill}.json`));
  const produce = producerFor(skill);
  const result = await produce(input, { outputRoot: producedRoot, artifactName: `${skill}.work-brief.json` });
  record(`${skill} producer writes`, result.ok, { reason: result.reason, errors: result.errors });
  if (!result.ok) return;
  record(`${skill} artifact kind`, result.value.artifact.artifactKind === 'work_brief', { artifactKind: result.value.artifact.artifactKind });
  record(`${skill} source skill`, result.value.artifact.sourceSkill === skill, { sourceSkill: result.value.artifact.sourceSkill });
  record(`${skill} canonical json carrier`, path.extname(result.value.filePath) === '.json', { filePath: result.value.filePath });
  const directValidation = validateWorkBriefFile(result.value.filePath);
  record(`${skill} public validator accepts produced file`, directValidation.ok, { errors: directValidation.errors });
  const anyValidation = validateAnyArtifactFile(result.value.filePath);
  record(`${skill} public any-artifact validator accepts produced file`, anyValidation.ok, { errors: anyValidation.errors });
  const intake = await intakeWorkBriefForPlan({ inputRoot: producedRoot, artifactName: `${skill}.work-brief.json` });
  record(`${skill} plan intake consumes produced Work Brief`, intake.ok, { reason: intake.reason, errors: intake.errors });
  if (intake.ok) {
    record(`${skill} intake returns same artifact id`, intake.value.artifact.artifactId === result.value.artifact.artifactId, {
      intakeArtifactId: intake.value.artifact.artifactId,
      producedArtifactId: result.value.artifact.artifactId
    });
  }

  const fixtureOutput = await produce(input, { outputRoot: positiveOutputRoot, artifactName: `${skill}.work-brief.json` });
  record(`${skill} positive output fixture generated`, fixtureOutput.ok, { reason: fixtureOutput.reason, errors: fixtureOutput.errors });
  if (fixtureOutput.ok) {
    const fixtureValidation = validateWorkBriefFile(fixtureOutput.value.filePath);
    record(`${skill} positive output fixture validates`, fixtureValidation.ok, { errors: fixtureValidation.errors });
  }
}

async function negativeProducer(name, skill, inputFile, outputDescriptor, expectedReason) {
  const input = await readJson(path.join(negativeInputRoot, inputFile));
  const targetPath = outputDescriptor?.artifactName ? path.resolve(outputDescriptor.outputRoot, outputDescriptor.artifactName) : null;
  const result = await producerFor(skill)(input, outputDescriptor ?? { outputRoot: invalidRoot, artifactName: `${name}.json` });
  record(`${name} fails closed`, !result.ok, { result });
  if (expectedReason) record(`${name} expected reason`, result.reason === expectedReason, { reason: result.reason, expectedReason });
  if (targetPath && !targetPath.includes('..')) {
    record(`${name} no invalid artifact written`, !(await exists(targetPath)), { targetPath });
  }
}

async function negativePath(name, skill, positiveInputFile, outputDescriptor, expectedReason) {
  const input = await readJson(path.join(positiveInputRoot, positiveInputFile));
  const result = await producerFor(skill)(input, outputDescriptor);
  record(`${name} path/carrier fails closed`, !result.ok, { result });
  record(`${name} expected reason`, result.reason === expectedReason, { reason: result.reason, expectedReason });
}

async function negativePlanIntake() {
  const malformedJson = await intakeWorkBriefForPlan({ inputRoot: negativePlanIntakeRoot, artifactName: 'malformed-json.json' });
  record('plan intake rejects malformed JSON', !malformedJson.ok, { result: malformedJson });
  record('malformed JSON uses validator failure', malformedJson.reason === 'validation_failed', { reason: malformedJson.reason });

  const malformedShape = await intakeWorkBriefForPlan({ inputRoot: negativePlanIntakeRoot, artifactName: 'malformed-artifact-shape.json' });
  record('plan intake rejects malformed artifact shape', !malformedShape.ok, { result: malformedShape });

  const rawDirectRequest = await readJson(path.join(negativePlanIntakeRoot, 'raw-direct-request.json'));
  const rawResult = await intakeWorkBriefForPlan(rawDirectRequest);
  record('plan intake rejects raw direct request object', !rawResult.ok, { result: rawResult });

  const rawStringResult = await intakeWorkBriefForPlan('build this from chat');
  record('plan intake rejects raw chat string', !rawStringResult.ok, { result: rawStringResult });

  const traversal = await intakeWorkBriefForPlan({ inputRoot: producedRoot, artifactName: '../escape/work-brief.json' });
  record('plan intake rejects traversal descriptor', !traversal.ok && traversal.reason === 'unsafe_path', { result: traversal });

  const absolute = await intakeWorkBriefForPlan({ inputRoot: producedRoot, artifactName: path.join(producedRoot, 'brainstorm.work-brief.json') });
  record('plan intake rejects absolute artifact name', !absolute.ok && absolute.reason === 'unsafe_path', { result: absolute });

  const nonJson = await intakeWorkBriefForPlan({ inputRoot: producedRoot, artifactName: 'work-brief.md' });
  record('plan intake rejects non-json carrier', !nonJson.ok && nonJson.reason === 'carrier_not_json', { result: nonJson });

  const missing = await intakeWorkBriefForPlan({ inputRoot: producedRoot, artifactName: 'missing.work-brief.json' });
  record('plan intake rejects missing file', !missing.ok && missing.reason === 'missing_work_brief', { result: missing });
}

async function blockedStatusWitness() {
  const sourcePath = path.join(producedRoot, 'brainstorm.work-brief.json');
  const blockedPath = path.join(outputRoot, 'blocked-status.work-brief.json');
  const artifact = await readJson(sourcePath);
  artifact.status = 'blocked';
  await fs.writeFile(blockedPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  const validation = validateWorkBriefFile(blockedPath);
  record('blocked Work Brief remains schema-valid', validation.ok, { errors: validation.errors });
  const intake = await intakeWorkBriefForPlan({ inputRoot: outputRoot, artifactName: 'blocked-status.work-brief.json' });
  record('plan intake returns blocked for blocked Work Brief', !intake.ok && intake.reason === 'work_brief_blocked', { result: intake });
}

async function producerSpecificGapWitnesses() {
  const grill = await readJson(path.join(positiveInputRoot, 'grill-me.json'));
  delete grill.challengedAssumptions;
  delete grill.edgeCases;
  delete grill.acceptanceGaps;
  delete grill.riskCandidates;
  const grillResult = await produceGrillMeWorkBrief(grill, { outputRoot: invalidRoot, artifactName: 'grill-no-signal.json' });
  record('grill-me without challenge signal fails closed', !grillResult.ok && grillResult.reason === 'invalid_grill_me_input', { result: grillResult });

  const brainstorm = await readJson(path.join(positiveInputRoot, 'brainstorm.json'));
  delete brainstorm.options;
  delete brainstorm.tradeoffs;
  delete brainstorm.openQuestions;
  delete brainstorm.candidateScenarios;
  const brainstormResult = await produceBrainstormWorkBrief(brainstorm, { outputRoot: invalidRoot, artifactName: 'brainstorm-no-signal.json' });
  record('brainstorm without exploration signal fails closed', !brainstormResult.ok && brainstormResult.reason === 'invalid_brainstorm_input', { result: brainstormResult });
}

async function regressionWitnesses() {
  const artifacts = await Promise.all(['brainstorm', 'grill-me', 'task'].map((skill) => readJson(path.join(producedRoot, `${skill}.work-brief.json`))));
  record('all producers share Work Brief artifact kind', artifacts.every((artifact) => artifact.artifactKind === 'work_brief'), { kinds: artifacts.map((artifact) => artifact.artifactKind) });
  record('all producers share Work Brief schema version', artifacts.every((artifact) => artifact.schemaVersion === '1.0.0'), { versions: artifacts.map((artifact) => artifact.schemaVersion) });
  record('only expected source skills produced', artifacts.map((artifact) => artifact.sourceSkill).sort().join(',') === 'brainstorm,grill-me,task', { sourceSkills: artifacts.map((artifact) => artifact.sourceSkill) });
}

await fs.rm(outputRoot, { recursive: true, force: true });
await fs.mkdir(producedRoot, { recursive: true });
await fs.mkdir(invalidRoot, { recursive: true });
await fs.mkdir(positiveOutputRoot, { recursive: true });

for (const skill of ['brainstorm', 'grill-me', 'task']) {
  await positiveProducer(skill);
}

await negativeProducer('missing required common field', 'brainstorm', 'missing-common-field.json', { outputRoot: invalidRoot, artifactName: 'missing-common.json' }, 'invalid_producer_input');
await negativeProducer('missing producer-specific field', 'brainstorm', 'missing-producer-specific-field.json', { outputRoot: invalidRoot, artifactName: 'missing-producer-specific.json' }, 'invalid_brainstorm_input');
await negativeProducer('invalid source skill mismatch', 'brainstorm', 'invalid-source-skill.json', { outputRoot: invalidRoot, artifactName: 'invalid-source-skill.json' }, 'invalid_producer_input');
await negativeProducer('invalid work type enum', 'task', 'invalid-work-type.json', { outputRoot: invalidRoot, artifactName: 'invalid-work-type.json' }, 'invalid_producer_input');
await negativeProducer('bug task missing reproduction basis', 'task', 'bug-task-missing-reproduction.json', { outputRoot: invalidRoot, artifactName: 'bug-task-missing-reproduction.json' }, 'invalid_task_input');
await negativePath('unsafe output traversal', 'brainstorm', 'brainstorm.json', { outputRoot: invalidRoot, artifactName: '../escape/work-brief.json' }, 'unsafe_path');
await negativePath('absolute output artifact name', 'brainstorm', 'brainstorm.json', { outputRoot: invalidRoot, artifactName: path.join(invalidRoot, 'absolute-name.json') }, 'unsafe_path');
await negativePath('non-json output carrier', 'brainstorm', 'brainstorm.json', { outputRoot: invalidRoot, artifactName: 'brainstorm.work-brief.md' }, 'carrier_not_json');
await negativePath('directory output target', 'brainstorm', 'brainstorm.json', { outputRoot: invalidRoot, artifactName: 'directory/' }, 'directory_target');
await producerSpecificGapWitnesses();
await negativePlanIntake();
await blockedStatusWitness();
await regressionWitnesses();

const failed = checks.filter((check) => !check.pass);
const result = { ok: failed.length === 0, checkCount: checks.length, failedCount: failed.length, failed, checks };
await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
if (!result.ok) process.exitCode = 1;
