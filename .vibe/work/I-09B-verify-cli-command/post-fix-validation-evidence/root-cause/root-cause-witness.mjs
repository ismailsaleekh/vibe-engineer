import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const witnessRoot = join(repoRoot, '.vibe/work/I-09B-verify-cli-command/post-fix-validation-evidence/root-cause');
const fixturesRoot = join(witnessRoot, 'fixtures');
const casesRoot = join(witnessRoot, 'cases');
const runnerDir = join(fixturesRoot, 'runners');
const missingScript = join(runnerDir, 'literal-missing-typed-runner-script.mjs');
const failRunner = join(runnerDir, 'deterministic-fail-runner.mjs');
const approvedPlan = join(repoRoot, 'packages/verification/fixtures/plans/approved-plan.json');
const loaderPath = join(repoRoot, 'packages/cli/src/command-loader/loader.js');
const verifyPath = join(repoRoot, 'packages/cli/src/commands/verify/index.ts');
const envelopePath = join(repoRoot, 'packages/cli/src/envelope/result-envelope.js');

const packageContextProbeProcess = spawnSync(process.execPath, ['--input-type=module', '-e', `
const verification = await import('@vibe-engineer/verification');
const artifacts = await import('@vibe-engineer/artifacts');
console.log(JSON.stringify({
  cwd: process.cwd(),
  verificationResolved: import.meta.resolve('@vibe-engineer/verification'),
  artifactsResolved: import.meta.resolve('@vibe-engineer/artifacts'),
  runVerificationPlanType: typeof verification.runVerificationPlan,
  validateArtifactFileType: typeof artifacts.validateArtifactFile,
  missingRunnerClassification: verification.EVIDENCE_FAILURE_CLASSIFICATIONS.MISSING_RUNNER_OR_PREREQUISITE,
  blockedStatus: verification.VERIFICATION_STATUSES.BLOCKED
}));
`], { cwd: join(repoRoot, 'packages/cli'), encoding: 'utf8', env: {} });
if (packageContextProbeProcess.status !== 0) throw new Error(`package-context probe failed: ${packageContextProbeProcess.stderr || packageContextProbeProcess.stdout}`);
const packageContextProbe = JSON.parse(packageContextProbeProcess.stdout);
const [{ createCommandLoader }, { verifyCommand }, { validateCliResultEnvelope }, artifactsModule] = await Promise.all([
  import(pathToFileURL(loaderPath).href),
  import(pathToFileURL(verifyPath).href),
  import(pathToFileURL(envelopePath).href),
  import(packageContextProbe.artifactsResolved)
]);

function sha256File(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
function readJson(file) { return JSON.parse(readFileSync(file, 'utf8')); }
async function writeJson(file, value) { await mkdir(dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); return file; }
function safeCaseId(name) { return name.replaceAll('/', '-').replace(/[^a-z0-9._:-]+/gi, '-').toLowerCase(); }
function nowInvocation(args, name) { const now = new Date().toISOString(); return { id: `i-09b-post-fix-root-${safeCaseId(name)}`, command: 'verify', argv: ['verify', ...args], projectRoot: repoRoot, configPath: null, startedAt: now, endedAt: now }; }
function packetPayload(envelope) { return Array.isArray(envelope.payload?.data?.evidencePackets) ? envelope.payload.data.evidencePackets : []; }
function packetPaths(envelope) { return packetPayload(envelope).map((packet) => packet.path); }
function validatePackets(envelope, label) {
  const summaries = [];
  const payloadPaths = packetPayload(envelope).map((packet) => packet.path).sort();
  const artifactPaths = envelope.artifacts.filter((artifact) => artifact.kind === 'evidence_packet').map((artifact) => artifact.path).sort();
  assert.deepEqual(artifactPaths, payloadPaths, `${label}: payload/artifact packet paths match`);
  for (const packet of packetPayload(envelope)) {
    const validation = artifactsModule.validateArtifactFile(packet.path, { kind: 'evidence_packet' });
    assert.equal(validation.ok, true, `${label}: packet validates ${packet.path}`);
    assert.equal(packet.sha256, sha256File(packet.path), `${label}: packet sha matches ${packet.path}`);
    const data = readJson(packet.path);
    summaries.push({ path: packet.path, sha256: packet.sha256, status: data.status, result: data.result, failureCode: data.failureDetails?.code ?? null, failureClassification: data.failureDetails?.classification ?? null, stdoutRef: data.stdoutRef ?? null, stderrRef: data.stderrRef ?? null, logsRef: data.logsRef ?? null });
  }
  return summaries;
}
function commandSpec({ id = 'schema-validation', script, expectedArtifacts = [], args = null }) {
  const finalArgs = args ?? [script];
  return {
    id: `post-fix-root-${id}`,
    requiredItemIds: [id],
    layer: 'schema_validation',
    evidenceClass: 'deterministic',
    blocking: true,
    kind: 'command',
    command: process.execPath,
    args: finalArgs,
    cwd: '.',
    expectedArtifacts,
    argPaths: [{ index: 0, root: 'projectRoot' }],
    safety: {
      classification: 'local_deterministic_write',
      timeoutMs: 2000,
      maxStdoutBytes: 8192,
      maxStderrBytes: 8192,
      maxOutputBytes: 8192,
      allowedReadRoots: [repoRoot],
      allowedWriteRoots: [witnessRoot],
      envAllowlist: [],
      passThroughEnv: false,
      cwdContainedInProjectRoot: true,
      expectedArtifactsContained: true
    }
  };
}
async function makePlan() {
  const plan = readJson(approvedPlan);
  plan.artifactId = 'i09b-post-fix-root-cause-plan';
  plan.title = 'I-09B post-fix root-cause independent approved plan';
  plan.verificationDelta.artifactId = 'i09b-post-fix-root-cause-delta';
  plan.verificationDelta.implementationPlanRef.artifactId = plan.artifactId;
  plan.verificationDelta.implementationPlanRef.path = '.vibe/work/I-09B-verify-cli-command/post-fix-validation-evidence/root-cause/fixtures/root-cause.implementation-plan.json';
  plan.verificationDelta.links[0].artifactId = plan.artifactId;
  plan.verificationDelta.links[0].path = plan.verificationDelta.implementationPlanRef.path;
  for (const item of plan.verificationDelta.requiredItems) {
    item.action = item.id === 'schema-validation' ? 'add' : 'not_applicable';
    item.rationale = `I-09B root-cause independent fixture rationale for ${item.id}.`;
  }
  return writeJson(join(fixturesRoot, 'root-cause.implementation-plan.json'), plan);
}
async function makeRunners() {
  await mkdir(runnerDir, { recursive: true });
  await unlink(missingScript).catch((error) => { if (error?.code !== 'ENOENT') throw error; });
  await writeFile(failRunner, `console.error('deterministic failure from post-fix root-cause runner');\nprocess.exit(9);\n`, 'utf8');
}
async function runVerifyCase(name, planPath, catalog) {
  const caseDir = join(casesRoot, name);
  await rm(caseDir, { recursive: true, force: true });
  await mkdir(caseDir, { recursive: true });
  const evidenceRoot = join(caseDir, 'packets');
  const resultFile = join(caseDir, 'result', 'cli-result.json');
  const catalogPath = join(caseDir, 'runner-catalog.json');
  await writeJson(catalogPath, catalog);
  const args = ['--implementation-plan', planPath, '--evidence-root', evidenceRoot, '--project-root', repoRoot, '--run-id', `i09b-post-fix-${safeCaseId(name)}`, '--runner-catalog', catalogPath, '--result-file', resultFile];
  const dispatch = await createCommandLoader([verifyCommand]).dispatch('verify', args, { invocation: nowInvocation(args, name), packageJsonPath: join(repoRoot, 'packages/cli/package.json'), validationCase: name });
  const envelope = dispatch.envelope;
  const envelopeValidation = validateCliResultEnvelope(envelope);
  assert.equal(envelopeValidation.ok, true, `${name}: valid envelope ${JSON.stringify(envelopeValidation)}`);
  assert.equal(existsSync(resultFile), true, `${name}: result file exists`);
  assert.deepEqual(readJson(resultFile), envelope, `${name}: result file matches envelope`);
  const packetSummaries = validatePackets(envelope, name);
  const summary = {
    name,
    command: 'createCommandLoader([verifyCommand]).dispatch("verify", args, context)',
    missingScriptPath: missingScript,
    missingScriptExists: existsSync(missingScript),
    envelopeStatus: envelope.status,
    exitCode: envelope.exitCode,
    cliClassification: envelope.errors?.[0]?.classification ?? envelope.diagnostics?.find((d) => d.severity === 'error')?.classification ?? null,
    cliCode: envelope.errors?.[0]?.code ?? envelope.diagnostics?.find((d) => d.severity === 'error')?.code ?? null,
    runnerStatus: envelope.payload?.data?.runnerStatus ?? null,
    failures: envelope.payload?.data?.failures ?? [],
    executedItems: envelope.payload?.data?.executedItems ?? [],
    recordedItems: envelope.payload?.data?.recordedItems ?? [],
    blockedItems: envelope.payload?.data?.blockedItems ?? [],
    evidencePacketPaths: packetPaths(envelope),
    packetCount: packetSummaries.length,
    packetSummaries,
    resultFile,
    resultFileSha256: sha256File(resultFile),
    envelopeValidation
  };
  await writeJson(join(caseDir, 'summary.json'), summary);
  await writeJson(join(caseDir, 'cli-result.json'), envelope);
  return { envelope, summary, caseDir };
}

await mkdir(witnessRoot, { recursive: true });
await rm(casesRoot, { recursive: true, force: true });
await makeRunners();
const planPath = await makePlan();
assert.equal(existsSync(missingScript), false, 'literal missing runner script path must not exist before witness');
assert.equal(verifyCommand.id, 'verify');
assert.equal(typeof verifyCommand.run, 'function');

const missingScriptCase = await runVerifyCase('n2-literal-missing-script', planPath, [commandSpec({ script: missingScript })]);
assert.equal(missingScriptCase.summary.missingScriptExists, false);
assert.equal(missingScriptCase.envelope.status, 'blocked');
assert.equal(missingScriptCase.envelope.exitCode, 3);
assert.equal(missingScriptCase.summary.cliClassification, 'missing_prerequisite');
assert.equal(missingScriptCase.summary.cliCode, 'VE_MISSING_CONFIG');
assert.equal(missingScriptCase.summary.runnerStatus, 'blocked');
assert.deepEqual(missingScriptCase.summary.executedItems, []);
assert.deepEqual(missingScriptCase.summary.evidencePacketPaths, []);
assert.ok(missingScriptCase.summary.blockedItems.includes('schema-validation'));
assert.equal(missingScriptCase.summary.failures[0]?.code, 'MISSING_RUNNER_OR_PREREQUISITE');
assert.equal(missingScriptCase.summary.failures[0]?.classification, packageContextProbe.missingRunnerClassification);
assert.notEqual(missingScriptCase.summary.cliClassification, 'deterministic_failure');
assert.notEqual(missingScriptCase.summary.failures[0]?.classification, 'test_assertion_failure');
assert.notEqual(missingScriptCase.summary.failures[0]?.code, 'RUNNER_NONZERO_EXIT');

const deterministicCase = await runVerifyCase('deterministic-nonzero-preserved', planPath, [commandSpec({ script: failRunner })]);
assert.equal(deterministicCase.envelope.status, 'failure');
assert.equal(deterministicCase.envelope.exitCode, 1);
assert.equal(deterministicCase.summary.cliClassification, 'deterministic_failure');
assert.equal(deterministicCase.summary.runnerStatus, 'failed');
assert.ok(deterministicCase.summary.executedItems.includes('schema-validation'));
assert.ok(deterministicCase.summary.packetSummaries.some((packet) => packet.failureCode === 'RUNNER_NONZERO_EXIT' && packet.failureClassification === 'test_assertion_failure'));
assert.notEqual(deterministicCase.summary.cliClassification, 'missing_prerequisite');
assert.ok(!deterministicCase.summary.failures.some((failure) => failure.classification === 'missing_runner_or_prerequisite'));

const summary = {
  status: 'PASS',
  packageContextProbe,
  planPath,
  missingScriptCase: missingScriptCase.summary,
  deterministicFailureCase: deterministicCase.summary
};
await writeJson(join(witnessRoot, 'summary.json'), summary);
console.log(JSON.stringify(summary, null, 2));
