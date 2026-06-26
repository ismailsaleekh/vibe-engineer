import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, '../../../../..');
const evidenceRoot = path.resolve(scriptDir, 'runtime');
const workBriefRoot = path.join(evidenceRoot, 'work-briefs');
const planRoot = path.join(evidenceRoot, 'plans');
const malformedRoot = path.join(evidenceRoot, 'malformed');
const summaryPath = path.join(scriptDir, 'i06-validation-witness-summary.json');

function repoPath(relativePath) {
  return path.join(repoRoot, relativePath);
}

async function importRepo(relativePath) {
  return import(pathToFileURL(repoPath(relativePath)).href);
}

const checks = [];
function record(name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
  if (!pass) throw new Error(`${name} failed: ${JSON.stringify(details)}`);
}
function recordFailClosed(name, result, expected = {}) {
  record(name, result && result.ok === false, { reason: result?.reason, stage: result?.stage, expected });
}
function layerCounts(items) {
  const counts = new Map();
  for (const item of items ?? []) counts.set(item.layer, (counts.get(item.layer) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort());
}
function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(repoPath(relativePath), 'utf8'));
}
async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, 'utf8');
}
function asDescriptor(filePath, root = path.dirname(filePath)) {
  return { inputRoot: root, artifactName: path.relative(root, filePath) };
}
function forbiddenVocabularyHits(text) {
  const terms = ['ecommerce', 'inventory', 'fashion', 'Billz', 'Telegram', 'Instagram'];
  return terms.filter((term) => text.toLowerCase().includes(term.toLowerCase()));
}

const artifacts = await importRepo('packages/artifacts/src/index.js');
const brainstormProducer = await importRepo('packages/skills/src/input/brainstorm/produce-work-brief.js');
const grillMeProducer = await importRepo('packages/skills/src/input/grill-me/produce-work-brief.js');
const taskProducer = await importRepo('packages/skills/src/input/task/produce-work-brief.js');
const intakeModule = await importRepo('packages/skills/src/plan/intake/work-brief-intake.js');
const planModule = await importRepo('packages/skills/src/plan/orchestrator/index.js');
const catalogModule = await importRepo('packages/skills/src/plan/verification-delta/catalog.js');
const deltaValidator = await importRepo('packages/skills/src/plan/verification-delta/validator.js');

const {
  validateArtifact,
  validateArtifactFile,
  validateArtifactKind
} = artifacts;
const { produceBrainstormWorkBrief } = brainstormProducer;
const { produceGrillMeWorkBrief } = grillMeProducer;
const { produceTaskWorkBrief } = taskProducer;
const { intakeWorkBriefForPlan } = intakeModule;
const {
  createImplementationPlanFromWorkBriefIntake,
  createAndMaybePersistImplementationPlan,
  persistImplementationPlan,
  resolveOutputPlanPath
} = planModule;
const {
  VERIFICATION_DELTA_LAYERS,
  VERIFICATION_DELTA_ACTIONS,
  MECHANICAL_GATE_CONSIDERATIONS
} = catalogModule;
const {
  validateAnyImplementationPlanArtifact,
  validateImplementationPlanFileForBuildIntake,
  validateImplementationPlanObjectForBuildIntake,
  validateVerificationDeltaCatalog
} = deltaValidator;

await fs.rm(evidenceRoot, { recursive: true, force: true });
await fs.mkdir(workBriefRoot, { recursive: true });
await fs.mkdir(planRoot, { recursive: true });
await fs.mkdir(malformedRoot, { recursive: true });

record('public artifact validator exports available', typeof validateArtifactKind === 'function' && typeof validateArtifactFile === 'function' && typeof validateArtifact === 'function');
record('catalog has exactly 16 layers', VERIFICATION_DELTA_LAYERS.length === 16 && new Set(VERIFICATION_DELTA_LAYERS).size === 16, { layers: VERIFICATION_DELTA_LAYERS });
record('catalog actions exact', JSON.stringify(VERIFICATION_DELTA_ACTIONS) === JSON.stringify(['add', 'update', 'reuse', 'not_applicable', 'blocked']), { actions: VERIFICATION_DELTA_ACTIONS });
record('mechanical gate considerations complete', JSON.stringify(MECHANICAL_GATE_CONSIDERATIONS) === JSON.stringify(['strict_config','governed_surface','escape_allowlist','schema_contract_strictness','ratchet','wiring_integrity','smell','test_anti_pattern']), { mechanicalGateConsiderations: MECHANICAL_GATE_CONSIDERATIONS });

const producerInputs = {
  brainstorm: await readJson('packages/skills/fixtures/work-brief/producers/positive-input/brainstorm.json'),
  'grill-me': await readJson('packages/skills/fixtures/work-brief/producers/positive-input/grill-me.json'),
  task: await readJson('packages/skills/fixtures/work-brief/producers/positive-input/task.json')
};
const producers = {
  brainstorm: produceBrainstormWorkBrief,
  'grill-me': produceGrillMeWorkBrief,
  task: produceTaskWorkBrief
};

const sourceResults = {};
for (const sourceSkill of ['brainstorm', 'grill-me', 'task']) {
  const artifactName = `${sourceSkill}.work-brief.json`;
  const produced = await producers[sourceSkill](producerInputs[sourceSkill], { outputRoot: workBriefRoot, artifactName });
  record(`${sourceSkill} producer returns ok`, produced.ok === true, produced);
  const fileValidation = validateArtifactFile(produced.value.filePath, { kind: 'work_brief' });
  record(`${sourceSkill} produced file validates publicly`, fileValidation.ok === true, fileValidation.ok ? { artifactId: fileValidation.artifact.artifactId } : { errors: fileValidation.errors });
  const intake = await intakeWorkBriefForPlan({ inputRoot: workBriefRoot, artifactName });
  record(`${sourceSkill} plan intake consumes persisted Work Brief`, intake.ok === true && intake.value.artifact.sourceSkill === sourceSkill, intake.ok ? { artifactId: intake.value.artifact.artifactId } : intake);

  const createOptions = {
    now: '2026-06-25T12:00:00.000Z',
    artifactId: `implementation-plan-validation-${sourceSkill.replace(/[^a-z0-9]+/g, '-')}`,
    runId: `validation-run-${sourceSkill}`,
    sensitiveAreas: [{ area: 'artifact_handoff', reason: `Validate ${sourceSkill} Work Brief handoff through public artifact contracts.` }],
    affectedAreas: [{ kind: 'skill', path: 'packages/skills/src/plan/**', reason: `Plan validates ${sourceSkill} intake seam.` }]
  };
  const created = await createImplementationPlanFromWorkBriefIntake({ inputRoot: workBriefRoot, artifactName }, createOptions);
  record(`${sourceSkill} plan orchestrator creates plan`, created.ok === true, created.ok ? { planId: created.value.plan.artifactId } : created);
  const publicPlan = validateArtifactKind('implementation_plan', created.value.plan);
  record(`${sourceSkill} plan validates through public implementation_plan schema`, publicPlan.ok === true, publicPlan.ok ? { schemaId: publicPlan.schemaId } : { errors: publicPlan.errors });
  const publicDelta = validateArtifactKind('verification_delta', created.value.plan.verificationDelta);
  record(`${sourceSkill} embedded Verification Delta validates publicly`, publicDelta.ok === true, publicDelta.ok ? { schemaId: publicDelta.schemaId } : { errors: publicDelta.errors });
  const counts = layerCounts(created.value.plan.verificationDelta.requiredItems);
  record(`${sourceSkill} Verification Delta layers exactly once`, JSON.stringify(Object.keys(counts)) === JSON.stringify([...VERIFICATION_DELTA_LAYERS].sort()) && Object.values(counts).every((count) => count === 1), counts);
  const i06Delta = validateVerificationDeltaCatalog(created.value.plan.verificationDelta);
  record(`${sourceSkill} Verification Delta validates through I-06 catalog validator`, i06Delta.ok === true, i06Delta.ok ? {} : i06Delta);
  sourceResults[sourceSkill] = { produced, intake, created };
}

const approvedPlan = sourceResults.brainstorm.created.value.plan;
const persistedApproved = await persistImplementationPlan(approvedPlan, { outputRoot: planRoot, artifactName: 'approved-plan.persisted.json' });
record('persistImplementationPlan persists approved plan', persistedApproved.ok === true, persistedApproved.ok ? { filePath: persistedApproved.value.filePath } : persistedApproved);
const approvedFileValidation = validateArtifactFile(persistedApproved.value.filePath, { kind: 'implementation_plan' });
record('public validateArtifactFile accepts persisted approved plan', approvedFileValidation.ok === true, approvedFileValidation.ok ? { artifactId: approvedFileValidation.artifact.artifactId } : { errors: approvedFileValidation.errors });
const buildApproved = validateImplementationPlanFileForBuildIntake({ inputRoot: planRoot, artifactName: 'approved-plan.persisted.json' });
record('build-intake-facing helper accepts approved persisted plan', buildApproved.ok === true, buildApproved.ok ? { artifactId: buildApproved.value.artifact.artifactId } : buildApproved);

const taskCreateAndPersist = await createAndMaybePersistImplementationPlan(
  { inputRoot: workBriefRoot, artifactName: 'task.work-brief.json' },
  {
    now: '2026-06-25T12:01:00.000Z',
    artifactId: 'implementation-plan-validation-create-and-persist',
    runId: 'validation-create-and-persist',
    persistence: { outputRoot: planRoot, artifactName: 'create-and-persist.json' },
    affectedAreas: [{ kind: 'skill', path: 'packages/skills/src/plan/**', reason: 'Exercise createAndMaybePersistImplementationPlan path.' }]
  }
);
record('createAndMaybePersistImplementationPlan persists approved plan', taskCreateAndPersist.ok === true && taskCreateAndPersist.value.persistence.afterValidation.ok === true, taskCreateAndPersist.ok ? { filePath: taskCreateAndPersist.value.persistence.filePath } : taskCreateAndPersist);

const blockedCreated = await createImplementationPlanFromWorkBriefIntake(
  { inputRoot: workBriefRoot, artifactName: 'grill-me.work-brief.json' },
  {
    now: '2026-06-25T12:02:00.000Z',
    artifactId: 'implementation-plan-validation-blocked',
    runId: 'validation-blocked',
    blockedLayers: ['integration'],
    blockedBy: 'missing-real-boundary-witness',
    unblockCondition: 'Run producer-to-plan integration witness through persisted carriers.',
    affectedAreas: [{ kind: 'skill', path: 'packages/skills/src/plan/**', reason: 'Exercise blocked plan semantics.' }]
  }
);
record('blocked plan creation returns schema-valid plan object', blockedCreated.ok === true && blockedCreated.value.plan.status === 'blocked', blockedCreated.ok ? { status: blockedCreated.value.plan.status } : blockedCreated);
record('public schema accepts blocked implementation_plan artifact', validateArtifactKind('implementation_plan', blockedCreated.value.plan).ok === true);
const persistedBlocked = await persistImplementationPlan(blockedCreated.value.plan, { outputRoot: planRoot, artifactName: 'blocked-plan.persisted.json' });
record('persistImplementationPlan persists schema-valid blocked plan with requireApproved=false seam', persistedBlocked.ok === true, persistedBlocked.ok ? { filePath: persistedBlocked.value.filePath } : persistedBlocked);
const blockedPublicFile = validateArtifactFile(persistedBlocked.value.filePath, { kind: 'implementation_plan' });
record('public validateArtifactFile accepts persisted blocked plan as schema-valid', blockedPublicFile.ok === true, blockedPublicFile.ok ? { status: blockedPublicFile.artifact.status } : { errors: blockedPublicFile.errors });
const blockedBuild = validateImplementationPlanFileForBuildIntake({ inputRoot: planRoot, artifactName: 'blocked-plan.persisted.json' });
recordFailClosed('build-intake-facing helper rejects blocked/non-approved persisted plan', blockedBuild, { reason: 'implementation_plan_not_approved' });

recordFailClosed('raw prose plan input rejected before planning', await createImplementationPlanFromWorkBriefIntake('please plan this directly', {}));
recordFailClosed('direct object bypass missing intake descriptor fields rejected', await createImplementationPlanFromWorkBriefIntake({ artifactKind: 'work_brief', status: 'ready' }, {}));
recordFailClosed('missing Work Brief file rejected', await createImplementationPlanFromWorkBriefIntake({ inputRoot: workBriefRoot, artifactName: 'missing.work-brief.json' }, {}));
const malformedJsonFile = path.join(malformedRoot, 'malformed-json.json');
await writeText(malformedJsonFile, '{ this is not json');
recordFailClosed('malformed JSON rejected through intake/public validator path', await createImplementationPlanFromWorkBriefIntake(asDescriptor(malformedJsonFile, malformedRoot), {}));
const wrongKindBrief = deepClone(sourceResults.task.produced.value.artifact);
wrongKindBrief.artifactKind = 'implementation_plan';
const wrongKindFile = path.join(malformedRoot, 'wrong-kind-work-brief.json');
await writeJson(wrongKindFile, wrongKindBrief);
recordFailClosed('wrong Work Brief artifact kind rejected', await createImplementationPlanFromWorkBriefIntake(asDescriptor(wrongKindFile, malformedRoot), {}));
const wrongVersionBrief = deepClone(sourceResults.task.produced.value.artifact);
wrongVersionBrief.schemaVersion = '9.9.9';
const wrongVersionFile = path.join(malformedRoot, 'wrong-version-work-brief.json');
await writeJson(wrongVersionFile, wrongVersionBrief);
recordFailClosed('wrong Work Brief schema version rejected', await createImplementationPlanFromWorkBriefIntake(asDescriptor(wrongVersionFile, malformedRoot), {}));
const wrongSourceBrief = deepClone(sourceResults.task.produced.value.artifact);
wrongSourceBrief.sourceSkill = 'unsupported-skill';
const wrongSourceFile = path.join(malformedRoot, 'wrong-source-work-brief.json');
await writeJson(wrongSourceFile, wrongSourceBrief);
recordFailClosed('wrong or unsupported Work Brief source skill rejected', await createImplementationPlanFromWorkBriefIntake(asDescriptor(wrongSourceFile, malformedRoot), {}));
const blockedBrief = deepClone(sourceResults.task.produced.value.artifact);
blockedBrief.status = 'blocked';
const blockedBriefFile = path.join(malformedRoot, 'blocked-work-brief.json');
await writeJson(blockedBriefFile, blockedBrief);
record('blocked Work Brief artifact is public-schema valid', validateArtifactFile(blockedBriefFile, { kind: 'work_brief' }).ok === true);
recordFailClosed('blocked Work Brief is not approved as green-consumable', await createImplementationPlanFromWorkBriefIntake(asDescriptor(blockedBriefFile, malformedRoot), {}));

const missingLayerPlan = deepClone(approvedPlan);
missingLayerPlan.verificationDelta.requiredItems = missingLayerPlan.verificationDelta.requiredItems.filter((item) => item.layer !== 'schema_validation');
recordFailClosed('missing Verification Delta layer fails public/I-06 validation', validateImplementationPlanObjectForBuildIntake(missingLayerPlan, { requireApproved: false }));
const duplicateLayerPlan = deepClone(approvedPlan);
duplicateLayerPlan.verificationDelta.requiredItems.push(deepClone(duplicateLayerPlan.verificationDelta.requiredItems[0]));
recordFailClosed('duplicate Verification Delta layer fails I-06 catalog validation', validateImplementationPlanObjectForBuildIntake(duplicateLayerPlan, { requireApproved: false }));
const invalidActionPlan = deepClone(approvedPlan);
invalidActionPlan.verificationDelta.requiredItems[0].action = 'skip';
recordFailClosed('invalid Verification Delta action fails', validateImplementationPlanObjectForBuildIntake(invalidActionPlan, { requireApproved: false }));
const blockedMissingMetadataPlan = deepClone(blockedCreated.value.plan);
const blockedItem = blockedMissingMetadataPlan.verificationDelta.requiredItems.find((item) => item.action === 'blocked');
delete blockedItem.blockedBy;
delete blockedItem.unblockCondition;
recordFailClosed('blocked delta item missing blockedBy/unblockCondition fails', validateImplementationPlanObjectForBuildIntake(blockedMissingMetadataPlan, { requireApproved: false }));

for (const [name, relativePath, validator] of [
  ['negative fixture missing verification delta layer', 'packages/skills/fixtures/implementation-plan/negative/missing-verification-delta-layer.json', (artifact) => validateAnyImplementationPlanArtifact(artifact)],
  ['negative fixture invalid verification delta action', 'packages/skills/fixtures/implementation-plan/negative/invalid-verification-delta-action.json', (artifact) => validateAnyImplementationPlanArtifact(artifact)],
  ['negative fixture blocked delta missing metadata', 'packages/skills/fixtures/implementation-plan/negative/blocked-delta-missing-rationale-metadata.json', (artifact) => validateAnyImplementationPlanArtifact(artifact)],
  ['negative fixture wrong artifact kind', 'packages/skills/fixtures/implementation-plan/negative/wrong-artifact-kind.json', (artifact) => validateArtifactKind('implementation_plan', artifact)],
  ['negative fixture wrong schema version', 'packages/skills/fixtures/implementation-plan/negative/wrong-schema-version.json', (artifact) => validateArtifactKind('implementation_plan', artifact)],
  ['negative fixture malformed work brief intake', 'packages/skills/fixtures/implementation-plan/negative/malformed-work-brief-intake.json', (artifact) => validateArtifactKind('work_brief', artifact)]
]) {
  const artifact = await readJson(relativePath);
  recordFailClosed(name, validator(artifact));
}
const unsafeDescriptor = await readJson('packages/skills/fixtures/implementation-plan/negative/unsafe-output-path-descriptor.json');
recordFailClosed('negative fixture unsafe output path descriptor fails', resolveOutputPlanPath(unsafeDescriptor.outputRoot, unsafeDescriptor.artifactName));
recordFailClosed('unsafe output path traversal rejected', resolveOutputPlanPath(planRoot, '../escape.json'));
recordFailClosed('absolute output artifact name rejected', resolveOutputPlanPath(planRoot, path.join(planRoot, 'absolute.json')));
recordFailClosed('non-.json plan carrier rejected', resolveOutputPlanPath(planRoot, 'plan.txt'));
recordFailClosed('non-.json persisted plan descriptor rejected by build-intake helper', validateImplementationPlanFileForBuildIntake({ inputRoot: planRoot, artifactName: 'plan.txt' }));

for (const relativePath of [
  'packages/skills/fixtures/implementation-plan/positive/approved-plan.json',
  'packages/skills/fixtures/implementation-plan/positive/blocked-plan.json'
]) {
  const text = await fs.readFile(repoPath(relativePath), 'utf8');
  const artifact = JSON.parse(text);
  const publicResult = validateArtifactKind('implementation_plan', artifact);
  record(`positive fixture ${path.basename(relativePath)} validates publicly`, publicResult.ok === true, publicResult.ok ? { status: artifact.status } : { errors: publicResult.errors });
  const anyResult = validateAnyImplementationPlanArtifact(artifact);
  record(`positive fixture ${path.basename(relativePath)} validates through I-06 artifact validator with requireApproved=false`, anyResult.ok === true, anyResult.ok ? { status: artifact.status } : anyResult);
  record(`positive fixture ${path.basename(relativePath)} contains no forbidden business vocabulary`, forbiddenVocabularyHits(text).length === 0, { hits: forbiddenVocabularyHits(text) });
}
const positiveApproved = await readJson('packages/skills/fixtures/implementation-plan/positive/approved-plan.json');
record('approved positive fixture accepted by build intake object helper', validateImplementationPlanObjectForBuildIntake(positiveApproved).ok === true);
const positiveBlocked = await readJson('packages/skills/fixtures/implementation-plan/positive/blocked-plan.json');
recordFailClosed('blocked positive fixture rejected by build intake object helper while schema-valid', validateImplementationPlanObjectForBuildIntake(positiveBlocked));

const summary = {
  ok: checks.every((check) => check.pass),
  checkCount: checks.length,
  failedChecks: checks.filter((check) => !check.pass),
  catalogLayers: VERIFICATION_DELTA_LAYERS,
  sourceSkills: Object.fromEntries(Object.entries(sourceResults).map(([sourceSkill, result]) => [sourceSkill, {
    workBriefPath: result.produced.value.filePath,
    planId: result.created.value.plan.artifactId,
    planStatus: result.created.value.plan.status,
    deltaLayerCounts: layerCounts(result.created.value.plan.verificationDelta.requiredItems)
  }])),
  persisted: {
    approvedPlan: persistedApproved.value.filePath,
    blockedPlan: persistedBlocked.value.filePath,
    createAndPersist: taskCreateAndPersist.value.persistence.filePath
  },
  checks
};
await writeJson(summaryPath, summary);
console.log(JSON.stringify({ ok: summary.ok, checkCount: summary.checkCount, summaryPath, persisted: summary.persisted }, null, 2));
