import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { intakeWorkBriefForPlan } from '../../../packages/skills/src/plan/intake/work-brief-intake.js';
import {
  createImplementationPlanFromWorkBriefIntake,
  createAndMaybePersistImplementationPlan,
  persistImplementationPlan,
  resolveOutputPlanPath
} from '../../../packages/skills/src/plan/orchestrator/plan-skill.js';
import {
  validateAnyImplementationPlanArtifact,
  validateImplementationPlanFileForBuildIntake,
  validateImplementationPlanObjectForBuildIntake
} from '../../../packages/skills/src/plan/verification-delta/validator.js';
import { VERIFICATION_DELTA_LAYERS } from '../../../packages/skills/src/plan/verification-delta/catalog.js';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '../../..');
const fixtureRoot = path.join(repoRoot, 'packages/skills/fixtures/implementation-plan');
const evidenceRoot = path.join(repoRoot, '.vibe/work/I-06-plan-skill-verification-delta/evidence');
const tempRoot = path.join(evidenceRoot, 'runtime-temp');
const persistedRoot = path.join(evidenceRoot, 'persisted-plans');
const workBriefRoot = path.join(repoRoot, 'packages/skills/fixtures/work-brief/producers/positive-output');
const checks = [];

function record(name, pass, details = {}) {
  checks.push({ name, pass, details });
  if (!pass) throw new Error(`${name} failed: ${JSON.stringify(details)}`);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function publicPlanValid(plan) {
  const validation = validateAnyImplementationPlanArtifact(plan);
  return { ok: validation.ok, reason: validation.reason, stage: validation.stage, errors: validation.errors?.map((error) => ({ pointer: error.pointer, field: error.field, code: error.code, message: error.message })) };
}

async function createFixtures() {
  await fs.rm(tempRoot, { recursive: true, force: true });
  await fs.rm(persistedRoot, { recursive: true, force: true });
  await fs.mkdir(tempRoot, { recursive: true });
  await fs.mkdir(persistedRoot, { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'positive'), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, 'negative'), { recursive: true });

  const approvedResult = await createImplementationPlanFromWorkBriefIntake(
    { inputRoot: workBriefRoot, artifactName: 'brainstorm.work-brief.json' },
    {
      now: '2026-06-25T00:00:00.000Z',
      artifactId: 'implementation-plan-approved-fixture',
      runId: 'run-i06-approved-fixture',
      affectedAreas: [{ kind: 'skill', path: 'packages/skills/src/plan/orchestrator/**', reason: 'Plan orchestrator owns implementation-plan production.' }],
      sensitiveAreas: [{ area: 'artifact_contract', reason: 'Implementation Plan must remain aligned with public artifact schemas.' }]
    }
  );
  record('approved plan creation', approvedResult.ok, { reason: approvedResult.reason, errors: approvedResult.errors });
  const approvedPlan = approvedResult.value.plan;
  await writeJson(path.join(fixtureRoot, 'positive/approved-plan.json'), approvedPlan);

  const blockedResult = await createImplementationPlanFromWorkBriefIntake(
    { inputRoot: workBriefRoot, artifactName: 'grill-me.work-brief.json' },
    {
      now: '2026-06-25T00:00:00.000Z',
      artifactId: 'implementation-plan-blocked-fixture',
      runId: 'run-i06-blocked-fixture',
      blockedLayers: ['integration'],
      verificationDeltaOverrides: {
        integration: {
          blockedBy: 'missing-real-boundary-witness',
          unblockCondition: 'Run producer-to-plan integration witness through persisted carriers.'
        }
      },
      openBlockers: [{ id: 'blocker-real-boundary', description: 'Integration witness has not run yet.', blocking: true, owner: 'implementation-agent' }],
      sensitiveAreas: [{ area: 'real_boundary', reason: 'Planner cannot approve without producer-to-consumer evidence.' }]
    }
  );
  record('blocked plan creation', blockedResult.ok, { reason: blockedResult.reason, errors: blockedResult.errors });
  const blockedPlan = blockedResult.value.plan;
  await writeJson(path.join(fixtureRoot, 'positive/blocked-plan.json'), blockedPlan);

  const missingLayer = clone(approvedPlan);
  missingLayer.artifactId = 'implementation-plan-negative-missing-layer';
  missingLayer.verificationDelta.artifactId = 'implementation-plan-negative-missing-layer-verification-delta';
  missingLayer.verificationDelta.requiredItems = missingLayer.verificationDelta.requiredItems.filter((item) => item.layer !== 'ai_eval');
  await writeJson(path.join(fixtureRoot, 'negative/missing-verification-delta-layer.json'), missingLayer);

  const invalidAction = clone(approvedPlan);
  invalidAction.artifactId = 'implementation-plan-negative-invalid-action';
  invalidAction.verificationDelta.artifactId = 'implementation-plan-negative-invalid-action-verification-delta';
  invalidAction.verificationDelta.requiredItems[0].action = 'skip';
  await writeJson(path.join(fixtureRoot, 'negative/invalid-verification-delta-action.json'), invalidAction);

  const blockedMissing = clone(blockedPlan);
  blockedMissing.artifactId = 'implementation-plan-negative-blocked-missing-metadata';
  blockedMissing.verificationDelta.artifactId = 'implementation-plan-negative-blocked-missing-metadata-verification-delta';
  const blockedItem = blockedMissing.verificationDelta.requiredItems.find((item) => item.action === 'blocked');
  delete blockedItem.blockedBy;
  delete blockedItem.unblockCondition;
  blockedItem.rationale = '';
  await writeJson(path.join(fixtureRoot, 'negative/blocked-delta-missing-rationale-metadata.json'), blockedMissing);

  const wrongKind = clone(approvedPlan);
  wrongKind.artifactKind = 'work_brief';
  await writeJson(path.join(fixtureRoot, 'negative/wrong-artifact-kind.json'), wrongKind);

  const wrongVersion = clone(approvedPlan);
  wrongVersion.schemaVersion = '9.9.9';
  await writeJson(path.join(fixtureRoot, 'negative/wrong-schema-version.json'), wrongVersion);

  await writeJson(path.join(fixtureRoot, 'negative/malformed-work-brief-intake.json'), {
    schemaVersion: '1.0.0',
    artifactKind: 'work_brief',
    artifactId: 'malformed-work-brief-intake',
    status: 'ready'
  });

  await writeJson(path.join(fixtureRoot, 'negative/unsafe-output-path-descriptor.json'), {
    outputRoot: 'packages/skills/fixtures/implementation-plan/positive',
    artifactName: '../escape.json'
  });

  return { approvedPlan, blockedPlan };
}

async function main() {
  const { approvedPlan, blockedPlan } = await createFixtures();

  for (const source of ['brainstorm', 'grill-me', 'task']) {
    const intake = await intakeWorkBriefForPlan({ inputRoot: workBriefRoot, artifactName: `${source}.work-brief.json` });
    record(`actual plan intake accepts ${source} fixture`, intake.ok, { reason: intake.reason, stage: intake.stage, errors: intake.errors });
  }

  record('approved plan has implementation_plan kind', approvedPlan.artifactKind === 'implementation_plan', { artifactKind: approvedPlan.artifactKind });
  record('approved plan has all catalog layers', approvedPlan.verificationDelta.requiredItems.length === VERIFICATION_DELTA_LAYERS.length, { count: approvedPlan.verificationDelta.requiredItems.length });
  record('approved plan catalog set exact', VERIFICATION_DELTA_LAYERS.every((layer) => approvedPlan.verificationDelta.requiredItems.some((item) => item.layer === layer)), { layers: approvedPlan.verificationDelta.requiredItems.map((item) => item.layer) });
  record('public validator accepts approved plan object', publicPlanValid(approvedPlan).ok, publicPlanValid(approvedPlan));
  record('public validator accepts blocked plan object', publicPlanValid(blockedPlan).ok, publicPlanValid(blockedPlan));

  const persisted = await persistImplementationPlan(approvedPlan, { outputRoot: persistedRoot, artifactName: 'approved-plan.persisted.json' });
  record('approved plan persists safely', persisted.ok, { reason: persisted.reason, errors: persisted.errors });
  const persistedPublic = validateImplementationPlanFileForBuildIntake({ inputRoot: persistedRoot, artifactName: 'approved-plan.persisted.json' }, { requireApproved: false });
  record('public validator accepts persisted approved plan', persistedPublic.ok, { reason: persistedPublic.reason, errors: persistedPublic.errors });
  const buildIntake = validateImplementationPlanFileForBuildIntake({ inputRoot: persistedRoot, artifactName: 'approved-plan.persisted.json' });
  record('build-intake-facing helper accepts approved persisted plan', buildIntake.ok, { reason: buildIntake.reason, errors: buildIntake.errors });

  const blockedPersisted = await persistImplementationPlan(blockedPlan, { outputRoot: persistedRoot, artifactName: 'blocked-plan.persisted.json' });
  record('blocked plan persists as schema-valid carrier', blockedPersisted.ok, { reason: blockedPersisted.reason, errors: blockedPersisted.errors });
  const blockedBuildIntake = validateImplementationPlanFileForBuildIntake({ inputRoot: persistedRoot, artifactName: 'blocked-plan.persisted.json' });
  record('build-intake-facing helper rejects blocked persisted plan', !blockedBuildIntake.ok && blockedBuildIntake.reason === 'implementation_plan_not_approved', { reason: blockedBuildIntake.reason, errors: blockedBuildIntake.errors });

  const rawBypass = await createImplementationPlanFromWorkBriefIntake('please plan this raw chat', {});
  record('raw chat/prose intake bypass rejected', !rawBypass.ok && rawBypass.reason === 'invalid_intake_descriptor', { reason: rawBypass.reason });
  const directObjectBypass = await createImplementationPlanFromWorkBriefIntake({ sourceSkill: 'task', desiredOutcome: 'raw object' }, {});
  record('direct object bypass rejected before planning', !directObjectBypass.ok, { reason: directObjectBypass.reason, errors: directObjectBypass.errors });
  const missingFile = await createImplementationPlanFromWorkBriefIntake({ inputRoot: workBriefRoot, artifactName: 'missing.work-brief.json' }, {});
  record('missing Work Brief file rejected', !missingFile.ok && missingFile.reason === 'missing_work_brief', { reason: missingFile.reason });

  await fs.writeFile(path.join(tempRoot, 'malformed-json.json'), '{ not json', 'utf8');
  const malformedJson = await createImplementationPlanFromWorkBriefIntake({ inputRoot: tempRoot, artifactName: 'malformed-json.json' }, {});
  record('malformed JSON Work Brief rejected through intake path', !malformedJson.ok && malformedJson.reason === 'validation_failed', { reason: malformedJson.reason, stage: malformedJson.stage, errors: malformedJson.errors });

  const workBrief = await readJson(path.join(workBriefRoot, 'task.work-brief.json'));
  const wrongKind = clone(workBrief);
  wrongKind.artifactKind = 'implementation_plan';
  await writeJson(path.join(tempRoot, 'wrong-kind-work-brief.json'), wrongKind);
  const wrongKindIntake = await createImplementationPlanFromWorkBriefIntake({ inputRoot: tempRoot, artifactName: 'wrong-kind-work-brief.json' }, {});
  record('wrong Work Brief artifact kind rejected through artifact validator/intake', !wrongKindIntake.ok, { reason: wrongKindIntake.reason, stage: wrongKindIntake.stage, errors: wrongKindIntake.errors });

  const wrongVersion = clone(workBrief);
  wrongVersion.schemaVersion = '9.9.9';
  await writeJson(path.join(tempRoot, 'wrong-version-work-brief.json'), wrongVersion);
  const wrongVersionIntake = await createImplementationPlanFromWorkBriefIntake({ inputRoot: tempRoot, artifactName: 'wrong-version-work-brief.json' }, {});
  record('wrong Work Brief schema version rejected through artifact validator/intake', !wrongVersionIntake.ok, { reason: wrongVersionIntake.reason, stage: wrongVersionIntake.stage, errors: wrongVersionIntake.errors });

  const blockedWorkBrief = clone(workBrief);
  blockedWorkBrief.status = 'blocked';
  await writeJson(path.join(tempRoot, 'blocked-work-brief.json'), blockedWorkBrief);
  const blockedWorkBriefIntake = await createImplementationPlanFromWorkBriefIntake({ inputRoot: tempRoot, artifactName: 'blocked-work-brief.json' }, {});
  record('blocked Work Brief is not approved as green-consumable', !blockedWorkBriefIntake.ok && blockedWorkBriefIntake.reason === 'work_brief_blocked', { reason: blockedWorkBriefIntake.reason });

  const missingLayerFixture = await readJson(path.join(fixtureRoot, 'negative/missing-verification-delta-layer.json'));
  record('missing Verification Delta layer fails public validation', !publicPlanValid(missingLayerFixture).ok, publicPlanValid(missingLayerFixture));
  const invalidActionFixture = await readJson(path.join(fixtureRoot, 'negative/invalid-verification-delta-action.json'));
  record('invalid Verification Delta action fails public validation', !publicPlanValid(invalidActionFixture).ok, publicPlanValid(invalidActionFixture));
  const blockedMissingFixture = await readJson(path.join(fixtureRoot, 'negative/blocked-delta-missing-rationale-metadata.json'));
  record('blocked delta missing rationale/metadata fails public validation', !publicPlanValid(blockedMissingFixture).ok, publicPlanValid(blockedMissingFixture));
  const wrongPlanKindFixture = await readJson(path.join(fixtureRoot, 'negative/wrong-artifact-kind.json'));
  record('wrong Implementation Plan artifact kind fixture fails public validation', !publicPlanValid(wrongPlanKindFixture).ok, publicPlanValid(wrongPlanKindFixture));
  const wrongPlanVersionFixture = await readJson(path.join(fixtureRoot, 'negative/wrong-schema-version.json'));
  record('wrong Implementation Plan schema version fixture fails public validation', !publicPlanValid(wrongPlanVersionFixture).ok, publicPlanValid(wrongPlanVersionFixture));

  const unsafeDescriptor = await readJson(path.join(fixtureRoot, 'negative/unsafe-output-path-descriptor.json'));
  const unsafeResolved = resolveOutputPlanPath(path.join(repoRoot, unsafeDescriptor.outputRoot), unsafeDescriptor.artifactName);
  record('unsafe output path traversal rejected', !unsafeResolved.ok && unsafeResolved.reason === 'unsafe_output_path', { reason: unsafeResolved.reason, errors: unsafeResolved.errors });
  const absoluteResolved = resolveOutputPlanPath(persistedRoot, path.join(persistedRoot, 'absolute.json'));
  record('absolute artifact name rejected', !absoluteResolved.ok && absoluteResolved.reason === 'unsafe_output_path', { reason: absoluteResolved.reason });
  const nonJsonResolved = resolveOutputPlanPath(persistedRoot, 'plan.md');
  record('non-json output carrier rejected', !nonJsonResolved.ok && nonJsonResolved.reason === 'output_carrier_not_json', { reason: nonJsonResolved.reason });

  const domainText = `${await fs.readFile(path.join(fixtureRoot, 'positive/approved-plan.json'), 'utf8')}\n${await fs.readFile(path.join(fixtureRoot, 'positive/blocked-plan.json'), 'utf8')}`.toLowerCase();
  const forbiddenTerms = ['stripe', 'shopify', 'salesforce', 'banking', 'patient', 'hipaa', 'invoice', 'tenant billing'];
  const leaked = forbiddenTerms.filter((term) => domainText.includes(term));
  record('positive implementation-plan fixtures are domain-neutral', leaked.length === 0, { leaked });

  const createPersist = await createAndMaybePersistImplementationPlan(
    { inputRoot: workBriefRoot, artifactName: 'brainstorm.work-brief.json' },
    { now: '2026-06-25T00:00:00.000Z', artifactId: 'implementation-plan-create-and-persist-witness', persistence: { outputRoot: persistedRoot, artifactName: 'create-and-persist.json' } }
  );
  record('createAndMaybePersist real boundary succeeds', createPersist.ok && createPersist.value.persistence.afterValidation.ok, { reason: createPersist.reason, errors: createPersist.errors });

  await writeJson(path.join(evidenceRoot, 'witness-summary.json'), {
    ok: checks.every((check) => check.pass),
    checkCount: checks.length,
    failedChecks: checks.filter((check) => !check.pass),
    checks,
    persistedArtifacts: {
      approved: persisted.value.filePath,
      blocked: blockedPersisted.value.filePath,
      createAndPersist: createPersist.value.persistence.filePath
    },
    fixtureRoot
  });
  console.log(JSON.stringify({ ok: true, checkCount: checks.length, fixtureRoot, evidenceRoot }, null, 2));
}

await main();
