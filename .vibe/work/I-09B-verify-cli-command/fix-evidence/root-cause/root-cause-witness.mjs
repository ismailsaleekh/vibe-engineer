import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const caseRoot = join(repoRoot, '.vibe/work/I-09B-verify-cli-command/fix-evidence/root-cause');
const fixturesRoot = join(caseRoot, 'fixtures');
const casesRoot = join(caseRoot, 'cases');
const loaderPath = join(repoRoot, 'packages/cli/src/command-loader/loader.js');
const verifyPath = join(repoRoot, 'packages/cli/src/commands/verify/index.ts');
const envelopePath = join(repoRoot, 'packages/cli/src/envelope/result-envelope.js');
const artifactsPath = join(repoRoot, 'packages/artifacts/src/index.js');
const approvedPlan = join(repoRoot, 'packages/verification/fixtures/plans/approved-plan.json');
const runnersDir = join(repoRoot, 'packages/verification/fixtures/runners');
const passRunner = join(runnersDir, 'pass-runner.mjs');
const failRunner = join(runnersDir, 'fail-runner.mjs');
const missingScript = join(runnersDir, 'definitely-missing-runner-script.mjs');

const [{ createCommandLoader }, { verifyCommand }, { validateCliResultEnvelope }, { validateArtifactFile }] = await Promise.all([
  import(pathToFileURL(loaderPath).href),
  import(pathToFileURL(verifyPath).href),
  import(pathToFileURL(envelopePath).href),
  import(pathToFileURL(artifactsPath).href)
]);

function sha256File(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
function readJson(file) { return JSON.parse(readFileSync(file, 'utf8')); }
async function writeJson(file, value) { await mkdir(dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); return file; }
function safeCaseId(name) { return name.replaceAll('/', '-').replace(/[^a-z0-9._:-]+/gi, '-').toLowerCase(); }
function nowInvocation(args, name) { const now = new Date().toISOString(); return { id: `i-09b-fix-${safeCaseId(name)}`, command: 'verify', argv: ['verify', ...args], projectRoot: repoRoot, configPath: null, startedAt: now, endedAt: now }; }
function packetPaths(envelope) { return Array.isArray(envelope.payload?.data?.evidencePackets) ? envelope.payload.data.evidencePackets.map((packet) => packet.path) : []; }
function validateEnvelope(envelope, name) { const validation = validateCliResultEnvelope(envelope); assert.equal(validation.ok, true, `${name} invalid envelope: ${JSON.stringify(validation)}`); return validation; }
function validatePackets(envelope, name) {
  const summaries = [];
  for (const path of packetPaths(envelope)) {
    const validation = validateArtifactFile(path, { kind: 'evidence_packet' });
    assert.equal(validation.ok, true, `${name} invalid packet ${path}: ${JSON.stringify(validation)}`);
    const data = readJson(path);
    summaries.push({ path, sha256: sha256File(path), status: data.status, result: data.result, failureCode: data.failureDetails?.code ?? null, failureClassification: data.failureDetails?.classification ?? null });
  }
  return summaries;
}
function commandSpec({ id = 'schema-validation', script = passRunner, out = null, expectedArtifacts = null }) {
  const args = [script, out].filter(Boolean);
  return {
    id: `i09b-${id}`,
    requiredItemIds: [id],
    layer: 'schema_validation',
    evidenceClass: 'deterministic',
    blocking: true,
    kind: 'command',
    command: process.execPath,
    args,
    cwd: '.',
    expectedArtifacts: expectedArtifacts ?? (out ? [out] : []),
    argPaths: args.map((value, index) => value === script ? { index, root: 'projectRoot' } : { index, root: 'evidenceRoot' }),
    safety: {
      classification: 'local_deterministic_write',
      timeoutMs: 2000,
      maxStdoutBytes: 8192,
      maxStderrBytes: 8192,
      maxOutputBytes: 8192,
      allowedReadRoots: [repoRoot],
      allowedWriteRoots: [out ? dirname(out) : caseRoot],
      envAllowlist: [],
      passThroughEnv: false,
      cwdContainedInProjectRoot: true,
      expectedArtifactsContained: true
    }
  };
}
async function schemaOnlyPlan() {
  await mkdir(fixturesRoot, { recursive: true });
  const plan = readJson(approvedPlan);
  plan.artifactId = 'i09b-fix-schema-only-plan';
  plan.verificationDelta.artifactId = 'i09b-fix-schema-only-delta';
  plan.verificationDelta.implementationPlanRef.artifactId = plan.artifactId;
  plan.verificationDelta.links[0].artifactId = plan.artifactId;
  for (const item of plan.verificationDelta.requiredItems) {
    item.action = item.id === 'schema-validation' ? 'add' : 'not_applicable';
    if (!item.rationale) item.rationale = `I-09B fix ${item.id} rationale.`;
  }
  return writeJson(join(fixturesRoot, 'schema-only.implementation-plan.json'), plan);
}
async function runVerifyCase(name, plan, catalog) {
  const caseDir = join(casesRoot, name);
  await rm(caseDir, { recursive: true, force: true });
  await mkdir(caseDir, { recursive: true });
  const evidenceRoot = join(caseDir, 'packets');
  const resultFile = join(caseDir, 'result', 'cli-result.json');
  const catalogPath = join(caseDir, 'runner-catalog.json');
  await writeJson(catalogPath, catalog);
  const args = ['--implementation-plan', plan, '--evidence-root', evidenceRoot, '--project-root', repoRoot, '--run-id', `i09b-fix-${safeCaseId(name)}`, '--runner-catalog', catalogPath, '--result-file', resultFile];
  const envelope = (await createCommandLoader([verifyCommand]).dispatch('verify', args, { invocation: nowInvocation(args, name), packageJsonPath: join(repoRoot, 'packages/cli/package.json') })).envelope;
  const envelopeValidation = validateEnvelope(envelope, name);
  assert.equal(existsSync(resultFile), true, `${name} result file missing`);
  assert.deepEqual(readJson(resultFile), envelope, `${name} result file mismatch`);
  const packetSummaries = validatePackets(envelope, name);
  const summary = {
    name,
    missingScriptExists: existsSync(missingScript),
    envelopeStatus: envelope.status,
    exitCode: envelope.exitCode,
    classification: envelope.errors?.[0]?.classification ?? null,
    code: envelope.errors?.[0]?.code ?? null,
    runnerStatus: envelope.payload?.data?.runnerStatus ?? null,
    failures: envelope.payload?.data?.failures ?? [],
    executedItems: envelope.payload?.data?.executedItems ?? [],
    blockedItems: envelope.payload?.data?.blockedItems ?? [],
    packetCount: packetSummaries.length,
    packetSummaries,
    resultFile,
    resultFileSha256: sha256File(resultFile),
    envelopeValidation
  };
  await writeJson(join(caseDir, 'summary.json'), summary);
  await writeJson(join(caseDir, 'cli-result.json'), envelope);
  return { caseDir, envelope, summary };
}

await rm(casesRoot, { recursive: true, force: true });
const plan = await schemaOnlyPlan();

const missingScriptCase = await runVerifyCase('n2-literal-missing-script-fixed', plan, [commandSpec({ script: missingScript })]);
assert.equal(missingScriptCase.summary.missingScriptExists, false);
assert.equal(missingScriptCase.envelope.status, 'blocked');
assert.equal(missingScriptCase.envelope.exitCode, 3);
assert.equal(missingScriptCase.summary.classification, 'missing_prerequisite');
assert.equal(missingScriptCase.summary.code, 'VE_MISSING_CONFIG');
assert.equal(missingScriptCase.summary.runnerStatus, 'blocked');
assert.equal(missingScriptCase.summary.packetCount, 0);
assert.deepEqual(missingScriptCase.summary.executedItems, []);
assert.equal(missingScriptCase.summary.failures[0]?.classification, 'missing_runner_or_prerequisite');
assert.notEqual(missingScriptCase.summary.classification, 'deterministic_failure');
assert.notEqual(missingScriptCase.summary.failures[0]?.classification, 'test_assertion_failure');

const missingSpecCase = await runVerifyCase('n2-missing-runner-spec-preserved', plan, []);
assert.equal(missingSpecCase.envelope.status, 'blocked');
assert.equal(missingSpecCase.summary.classification, 'missing_prerequisite');
assert.ok(missingSpecCase.summary.packetSummaries.some((packet) => packet.failureCode === 'MISSING_RUNNER_OR_PREREQUISITE' && packet.failureClassification === 'missing_runner_or_prerequisite'));

const deterministicCase = await runVerifyCase('deterministic-nonzero-preserved', plan, [commandSpec({ script: failRunner, expectedArtifacts: [] })]);
assert.equal(deterministicCase.envelope.status, 'failure');
assert.equal(deterministicCase.envelope.exitCode, 1);
assert.equal(deterministicCase.summary.classification, 'deterministic_failure');
assert.ok(deterministicCase.summary.packetSummaries.some((packet) => packet.failureCode === 'RUNNER_NONZERO_EXIT' && packet.failureClassification === 'test_assertion_failure'));
assert.notEqual(deterministicCase.summary.classification, 'missing_prerequisite');

const summary = {
  status: 'PASS',
  plan,
  cases: {
    missingScript: missingScriptCase.summary,
    missingSpec: missingSpecCase.summary,
    deterministicFailure: deterministicCase.summary
  }
};
await writeJson(join(caseRoot, 'summary.json'), summary);
console.log(JSON.stringify(summary, null, 2));
