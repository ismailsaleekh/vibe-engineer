import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = join(repoRoot, '.vibe/work/I-09B-verify-cli-command/fix-evidence/matrix');
const casesRoot = join(evidenceRoot, 'cases');
const fixturesRoot = join(evidenceRoot, 'fixtures');
const repoEntry = join(repoRoot, 'packages/cli/src/entry/vibe-engineer.js');
const loaderPath = join(repoRoot, 'packages/cli/src/command-loader/loader.js');
const verifyPath = join(repoRoot, 'packages/cli/src/commands/verify/index.ts');
const envelopePath = join(repoRoot, 'packages/cli/src/envelope/result-envelope.js');
const artifactsPath = join(repoRoot, 'packages/artifacts/src/index.js');
const doctorPath = join(repoRoot, 'packages/cli/src/commands/doctor/index.js');
const configPath = join(repoRoot, 'packages/cli/src/commands/config/index.js');
const schematicPath = join(repoRoot, 'packages/cli/src/commands/schematic/index.js');
const approvedPlan = join(repoRoot, 'packages/verification/fixtures/plans/approved-plan.json');
const draftPlan = join(repoRoot, 'packages/verification/fixtures/plans/draft-plan.json');
const missingCategoryPlan = join(repoRoot, 'packages/verification/fixtures/plans/missing-category-plan.json');
const runnersDir = join(repoRoot, 'packages/verification/fixtures/runners');
const passRunner = join(runnersDir, 'pass-runner.mjs');
const failRunner = join(runnersDir, 'fail-runner.mjs');
const noArtifactRunner = join(runnersDir, 'no-artifact-runner.mjs');
const secretOutputRunner = join(runnersDir, 'secret-output-runner.mjs');
const sleepRunner = join(runnersDir, 'sleep-runner.mjs');
const largeOutputRunner = join(runnersDir, 'large-output-runner.mjs');

const [{ createCommandLoader }, { verifyCommand }, { validateCliResultEnvelope }, { validateArtifactFile }, { doctorCommand }, { configCommand }, { schematicCommand }] = await Promise.all([
  import(pathToFileURL(loaderPath).href),
  import(pathToFileURL(verifyPath).href),
  import(pathToFileURL(envelopePath).href),
  import(pathToFileURL(artifactsPath).href),
  import(pathToFileURL(doctorPath).href),
  import(pathToFileURL(configPath).href),
  import(pathToFileURL(schematicPath).href)
]);

function sha256Text(text) { return createHash('sha256').update(text).digest('hex'); }
function sha256File(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
function readJson(file) { return JSON.parse(readFileSync(file, 'utf8')); }
async function writeJson(file, value) { await mkdir(dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); return file; }
function walkFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}
function safeCaseId(name) { return name.replaceAll('/', '-').replace(/[^a-z0-9._:-]+/gi, '-').toLowerCase(); }
function nowInvocation(command, argv, sanitizedArgv = argv) {
  const now = new Date().toISOString();
  return { id: `i-09b-fix-${safeCaseId(command)}-${sha256Text(JSON.stringify(argv)).slice(0, 8)}`, command, argv: sanitizedArgv, projectRoot: repoRoot, configPath: null, startedAt: now, endedAt: now };
}
function assertEnvelope(envelope, label) {
  const validation = validateCliResultEnvelope(envelope);
  assert.equal(validation.ok, true, `${label} invalid envelope: ${JSON.stringify(validation)}`);
}
function packetPathsFromEnvelope(envelope) {
  return Array.isArray(envelope.payload?.data?.evidencePackets) ? envelope.payload.data.evidencePackets.map((packet) => packet.path) : [];
}
function validatePacketRouting(envelope, label) {
  const payloadPackets = Array.isArray(envelope.payload?.data?.evidencePackets) ? envelope.payload.data.evidencePackets : [];
  const payloadPaths = payloadPackets.map((packet) => packet.path).sort();
  const artifactPaths = (Array.isArray(envelope.artifacts) ? envelope.artifacts : []).filter((artifact) => artifact.kind === 'evidence_packet').map((artifact) => artifact.path).sort();
  assert.deepEqual(artifactPaths, payloadPaths, `${label} payload/artifact packet path mismatch`);
  const packetSummaries = [];
  for (const packet of payloadPackets) {
    assert.equal(existsSync(packet.path), true, `${label} missing packet ${packet.path}`);
    const validation = validateArtifactFile(packet.path, { kind: 'evidence_packet' });
    assert.equal(validation.ok, true, `${label} invalid Evidence Packet ${packet.path}: ${JSON.stringify(validation)}`);
    assert.equal(packet.sha256, sha256File(packet.path), `${label} packet sha mismatch`);
    const data = readJson(packet.path);
    packetSummaries.push({ path: packet.path, sha256: packet.sha256, artifactId: data.artifactId, status: data.status, result: data.result, failureCode: data.failureDetails?.code ?? null, failureClassification: data.failureDetails?.classification ?? null, rerunOf: data.rerunOf ?? null });
  }
  return { payloadPaths, artifactPaths, packetSummaries };
}
function findFailurePacket(envelope, code) {
  for (const packetPath of packetPathsFromEnvelope(envelope)) {
    const packet = readJson(packetPath);
    if (packet.failureDetails?.code === code) return packet;
  }
  return null;
}
function assertNoEvidencePackets(dir, label) {
  const packetFiles = walkFiles(dir).filter((file) => /evidence_.*\.json$/.test(file));
  assert.equal(packetFiles.length, 0, `${label} unexpectedly wrote Evidence Packets: ${packetFiles.join(', ')}`);
}
function assertNoRawSecret(root, secret, label) {
  const hits = [];
  for (const file of walkFiles(root)) {
    if (statSync(file).size > 2_000_000) continue;
    const text = readFileSync(file, 'utf8');
    if (text.includes(secret)) hits.push(file);
  }
  assert.deepEqual(hits, [], `${label} leaked raw secret sentinel in ${hits.join(', ')}`);
}

function commandSpec({ id = 'schema-validation', layer = 'schema_validation', script = passRunner, out, blocking = true, evidenceClass = 'deterministic', args = null, expectedArtifacts = null, safety = {}, extra = {}, publicArgs = [], scalarArgs = [], argPaths = null }) {
  const finalArgs = args ?? [script, out].filter(Boolean);
  const finalArgPaths = argPaths ?? finalArgs.map((value, index) => {
    if (value === script) return { index, root: 'projectRoot' };
    if (out && value === out) return { index, root: 'evidenceRoot' };
    return null;
  }).filter(Boolean);
  return {
    id: `i09b-${id}`,
    requiredItemIds: [id],
    layer,
    evidenceClass,
    blocking,
    kind: 'command',
    command: process.execPath,
    args: finalArgs,
    cwd: '.',
    expectedArtifacts: expectedArtifacts ?? (out ? [out] : []),
    argPaths: finalArgPaths,
    publicArgs,
    scalarArgs,
    safety: {
      classification: 'local_deterministic_write',
      timeoutMs: 2000,
      maxStdoutBytes: 8192,
      maxStderrBytes: 8192,
      maxOutputBytes: 8192,
      allowedReadRoots: [repoRoot],
      allowedWriteRoots: [out ? dirname(out) : evidenceRoot],
      envAllowlist: [],
      passThroughEnv: false,
      cwdContainedInProjectRoot: true,
      expectedArtifactsContained: true,
      ...safety
    },
    ...extra
  };
}
function validatorSpec({ id = 'schema-validation', layer = 'schema_validation', validator, blocking = true, evidenceClass = 'deterministic', extra = {} }) {
  return { id: `i09b-${id}`, requiredItemIds: [id], layer, evidenceClass, blocking, kind: 'validator', validator, ...extra };
}
function publicArg(index, value) { return { index, value }; }
function scalarArg(index, kind) { return { index, kind }; }

async function planVariant(name, mutate) {
  const plan = readJson(approvedPlan);
  mutate(plan);
  plan.artifactId = `i09b-validation-${safeCaseId(name)}-plan`;
  plan.verificationDelta.artifactId = `i09b-validation-${safeCaseId(name)}-delta`;
  plan.verificationDelta.implementationPlanRef.artifactId = plan.artifactId;
  plan.verificationDelta.links[0].artifactId = plan.artifactId;
  const file = join(fixturesRoot, `${safeCaseId(name)}.implementation-plan.json`);
  await writeJson(file, plan);
  return file;
}
function setOnlyAction(plan, activeId, activeAction = 'add') {
  for (const item of plan.verificationDelta.requiredItems) {
    if (item.id === activeId) item.action = activeAction;
    else item.action = 'not_applicable';
    if (!item.rationale) item.rationale = `I-09B fix ${item.id} rationale.`;
  }
}

async function runVerifyCase(name, options = {}) {
  const caseDir = join(casesRoot, name);
  await rm(caseDir, { recursive: true, force: true });
  await mkdir(caseDir, { recursive: true });
  const caseEvidenceRoot = options.evidenceRoot ?? join(caseDir, 'packets');
  const resultFile = options.resultFile === false ? null : join(caseDir, 'result', 'cli-result.json');
  let runnerCatalogPath = options.runnerCatalogPath;
  if (!runnerCatalogPath && options.catalog !== undefined) {
    runnerCatalogPath = join(caseDir, 'runner-catalog.json');
    await writeJson(runnerCatalogPath, options.catalog);
  }
  if (options.catalogRaw !== undefined) {
    runnerCatalogPath = join(caseDir, 'runner-catalog.json');
    await writeFile(runnerCatalogPath, options.catalogRaw, 'utf8');
  }
  const args = options.args ?? [
    '--implementation-plan', options.plan ?? approvedPlan,
    '--evidence-root', caseEvidenceRoot,
    '--project-root', options.projectRoot ?? repoRoot,
    '--run-id', options.runId ?? `i09b-${safeCaseId(name)}`,
    '--runner-catalog', runnerCatalogPath ?? join(caseDir, 'missing-runner-catalog.json'),
    ...(resultFile ? ['--result-file', resultFile] : []),
    ...(options.rerunOf ? ['--rerun-of', options.rerunOf] : [])
  ];
  const invocationArgv = options.invocationArgv ?? ['verify', ...args];
  const invocation = nowInvocation('verify', ['verify', ...args], invocationArgv);
  const loader = createCommandLoader([verifyCommand]);
  const dispatchResult = await loader.dispatch('verify', args, { invocation, packageJsonPath: join(repoRoot, 'packages/cli/package.json'), validationCase: name });
  const envelope = dispatchResult.envelope;
  assertEnvelope(envelope, name);
  await writeJson(join(caseDir, 'cli-result.json'), envelope);
  if (resultFile && existsSync(resultFile)) {
    const resultEnvelope = readJson(resultFile);
    assert.deepEqual(resultEnvelope, envelope, `${name} result-file envelope mismatch`);
  }
  const routing = packetPathsFromEnvelope(envelope).length > 0 ? validatePacketRouting(envelope, name) : { payloadPaths: [], artifactPaths: [], packetSummaries: [] };
  await writeJson(join(caseDir, 'summary.json'), {
    name,
    status: envelope.status,
    exitCode: envelope.exitCode,
    classification: envelope.errors?.[0]?.classification ?? envelope.diagnostics?.find((d) => d.severity === 'error')?.classification ?? null,
    code: envelope.errors?.[0]?.code ?? envelope.diagnostics?.[0]?.code ?? null,
    runnerStatus: envelope.payload?.data?.runnerStatus ?? null,
    resultFile,
    resultFileExists: resultFile ? existsSync(resultFile) : false,
    resultFileSha256: resultFile && existsSync(resultFile) ? sha256File(resultFile) : null,
    packetCount: routing.packetSummaries.length,
    packetSummaries: routing.packetSummaries
  });
  return { caseDir, caseEvidenceRoot, resultFile, envelope, routing };
}

function spawnNode(args, cwd = repoRoot) {
  return new Promise((resolveSpawn) => {
    const child = spawn(process.execPath, args, { cwd, env: {}, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (code, signal) => resolveSpawn({ code, signal, stdout, stderr, cwd, argv: [process.execPath, ...args] }));
  });
}

async function invalidInvocationMatrix(schemaOnlyPlan) {
  const validCatalogPath = join(fixturesRoot, 'invalid-matrix-valid-runner-catalog.json');
  await writeJson(validCatalogPath, [commandSpec({ out: join(casesRoot, 'invalid-shared-output', 'packets', 'runner-output.json') })]);
  const invalids = [
    { name: 'invalid/unknown-flag', args: ['--definitely-unknown'], expectClass: 'invalid_invocation' },
    { name: 'invalid/unexpected-positional', args: ['unexpected-positional'], expectClass: 'invalid_invocation' },
    { name: 'invalid/missing-flag-value', args: ['--implementation-plan'], expectClass: 'invalid_invocation' },
    { name: 'invalid/duplicate-flag', args: ['--implementation-plan', schemaOnlyPlan, '--implementation-plan', schemaOnlyPlan, '--evidence-root', join(casesRoot, 'invalid/duplicate-flag/packets'), '--project-root', repoRoot, '--run-id', 'i09b-invalid-duplicate', '--runner-catalog', validCatalogPath], expectClass: 'invalid_invocation' },
    { name: 'invalid/malformed-catalog-json', catalogRaw: '{"not":"an array"', plan: schemaOnlyPlan, runId: 'i09b-invalid-malformed-catalog', expectClass: 'invalid_input' },
    { name: 'invalid/missing-required-input', args: ['--implementation-plan', schemaOnlyPlan, '--evidence-root', join(casesRoot, 'invalid/missing-required-input/packets'), '--project-root', repoRoot, '--run-id', 'i09b-invalid-missing-required'], expectClass: 'invalid_invocation' },
    { name: 'invalid/secret-like-input', args: ['--implementation-plan', schemaOnlyPlan, '--evidence-root', join(casesRoot, 'invalid/secret-like-input/packets'), '--project-root', repoRoot, '--run-id', ['SECRET','I09B','VALIDATION','MUST','REDACT'].join('_'), '--runner-catalog', validCatalogPath], invocationArgv: ['verify', '--implementation-plan', '<value>', '--evidence-root', '<value>', '--project-root', '<value>', '--run-id', '<value>', '--runner-catalog', '<value>'], expectClass: 'invalid_input' },
    { name: 'invalid/unsafe-path-escape', args: ['--implementation-plan', schemaOnlyPlan, '--evidence-root', '../outside-i09b-validation', '--project-root', repoRoot, '--run-id', 'i09b-invalid-path-escape', '--runner-catalog', validCatalogPath], expectClass: 'invalid_input' },
    { name: 'invalid/protected-evidence-root', args: ['--implementation-plan', schemaOnlyPlan, '--evidence-root', 'package.json', '--project-root', repoRoot, '--run-id', 'i09b-invalid-protected-evidence', '--runner-catalog', validCatalogPath], expectClass: 'invalid_input' },
    { name: 'invalid/protected-runner-catalog', args: ['--implementation-plan', schemaOnlyPlan, '--evidence-root', join(casesRoot, 'invalid/protected-runner-catalog/packets'), '--project-root', repoRoot, '--run-id', 'i09b-invalid-protected-catalog', '--runner-catalog', 'package.json'], expectClass: 'invalid_input' }
  ];
  const results = [];
  for (const item of invalids) {
    const result = await runVerifyCase(item.name, item);
    assert.equal(result.envelope.status, 'blocked', item.name);
    assert.equal(result.envelope.errors?.[0]?.classification ?? result.envelope.diagnostics?.[0]?.classification, item.expectClass, item.name);
    assertNoEvidencePackets(result.caseDir, item.name);
    results.push(readJson(join(result.caseDir, 'summary.json')));
  }
  await writeJson(join(evidenceRoot, 'invalid-invocation-summary.json'), results);
  return results;
}

async function positiveAndAllowedModes(schemaOnlyPlan, advisoryOnlyPlan) {
  const p1Out = join(casesRoot, 'p1-cli', 'packets', 'runner-output', 'schema-output.json');
  const p1 = await runVerifyCase('p1-cli', { plan: schemaOnlyPlan, runId: 'i09b-p1-cli', catalog: [commandSpec({ out: p1Out })] });
  assert.equal(p1.envelope.status, 'success');
  assert.equal(p1.envelope.exitCode, 0);
  assert.equal(p1.envelope.payload.data.runnerStatus, 'passed');
  assert.ok(p1.routing.packetSummaries.length >= 1);
  assert.ok(p1.envelope.artifacts.some((artifact) => artifact.kind === 'cli_result' && artifact.path === p1.resultFile));

  const advisory = await runVerifyCase('allowed/advisory-only', { plan: advisoryOnlyPlan, runId: 'i09b-advisory-only', rerunOf: 'prior-advisory-validation', catalog: [commandSpec({ id: 'advisory-review', layer: 'advisory_review', script: failRunner, out: null, expectedArtifacts: [], evidenceClass: 'advisory', blocking: false, extra: { failureClassification: 'advisory_finding' } })] });
  assert.equal(advisory.envelope.status, 'success');
  assert.equal(advisory.envelope.exitCode, 0);
  assert.equal(advisory.envelope.payload.data.runnerStatus, 'advisory_warning');
  assert.equal(advisory.envelope.payload.data.rerunOf, 'prior-advisory-validation');
  assert.equal(advisory.envelope.payload.data.blockedItems.length, 0);

  await writeJson(join(evidenceRoot, 'positive-allowed-summary.json'), { p1: readJson(join(p1.caseDir, 'summary.json')), advisory: readJson(join(advisory.caseDir, 'summary.json')) });
  return { p1, advisory };
}

async function negativeMatrix(schemaOnlyPlan, advisoryOnlyPlan) {
  const results = {};
  const n1Out = join(casesRoot, 'n1-cli', 'packets', 'runner-output', 'should-not-exist.json');
  const n1 = await runVerifyCase('n1-cli', { plan: draftPlan, runId: 'i09b-n1-cli', catalog: [commandSpec({ out: n1Out })] });
  assert.equal(n1.envelope.status, 'blocked');
  assert.equal(n1.envelope.errors[0].classification, 'invalid_input');
  assert.equal(existsSync(n1Out), false, 'N1 runner executed despite draft plan');
  assertNoEvidencePackets(n1.caseDir, 'n1-cli');
  results.n1 = readJson(join(n1.caseDir, 'summary.json'));

  const n2 = await runVerifyCase('n2-cli', { plan: schemaOnlyPlan, runId: 'i09b-n2-cli', catalog: [] });
  assert.equal(n2.envelope.status, 'blocked');
  assert.equal(n2.envelope.errors[0].classification, 'missing_prerequisite');
  assert.ok(findFailurePacket(n2.envelope, 'MISSING_RUNNER_OR_PREREQUISITE'));
  results.n2 = readJson(join(n2.caseDir, 'summary.json'));

  const n3Out = join(casesRoot, 'n3-cli', 'packets', 'runner-output', 'missing-output.json');
  const n3 = await runVerifyCase('n3-cli', { plan: schemaOnlyPlan, runId: 'i09b-n3-cli', catalog: [commandSpec({ script: noArtifactRunner, out: n3Out })] });
  assert.equal(n3.envelope.status, 'blocked');
  assert.equal(n3.envelope.errors[0].classification, 'missing_prerequisite');
  assert.ok(findFailurePacket(n3.envelope, 'MISSING_EVIDENCE'));
  results.n3 = readJson(join(n3.caseDir, 'summary.json'));

  const n4 = await runVerifyCase('n4-cli', { plan: missingCategoryPlan, runId: 'i09b-n4-cli', catalog: [] });
  assert.equal(n4.envelope.status, 'blocked');
  assert.equal(n4.envelope.errors[0].classification, 'invalid_input');
  assertNoEvidencePackets(n4.caseDir, 'n4-cli');
  results.n4 = readJson(join(n4.caseDir, 'summary.json'));

  const n5 = await runVerifyCase('n5-cli', { plan: schemaOnlyPlan, runId: 'i09b-n5-cli', catalog: [validatorSpec({ validator: 'malformedEvidencePacketCandidate' })] });
  assert.equal(n5.envelope.status, 'blocked');
  assert.equal(n5.envelope.errors[0].classification, 'invalid_input');
  assert.ok(findFailurePacket(n5.envelope, 'MALFORMED_EVIDENCE_PACKET'));
  assert.ok(n5.routing.packetSummaries.every((packet) => packet.result !== 'pass' || packet.status === 'not_run'));
  results.n5 = readJson(join(n5.caseDir, 'summary.json'));

  const n6 = await runVerifyCase('n6-cli', { plan: schemaOnlyPlan, runId: 'i09b-n6-cli', catalog: [validatorSpec({ validator: 'throwInternalError' })] });
  assert.equal(n6.envelope.status, 'failure');
  assert.equal(n6.envelope.errors[0].classification, 'internal_error');
  assert.equal(n6.envelope.exitCode, 7);
  assert.ok(findFailurePacket(n6.envelope, 'RUNNER_INTERNAL_ERROR'));
  results.n6 = readJson(join(n6.caseDir, 'summary.json'));

  const n7 = await runVerifyCase('n7-cli', { plan: advisoryOnlyPlan, runId: 'i09b-n7-cli', catalog: [commandSpec({ id: 'advisory-review', layer: 'advisory_review', script: failRunner, out: null, expectedArtifacts: [], evidenceClass: 'advisory', blocking: false, extra: { failureClassification: 'advisory_finding' } })] });
  assert.equal(n7.envelope.status, 'success');
  assert.equal(n7.envelope.payload.data.runnerStatus, 'advisory_warning');
  assert.equal(n7.envelope.payload.data.blockedItems.length, 0);
  results.n7 = readJson(join(n7.caseDir, 'summary.json'));

  await writeJson(join(evidenceRoot, 'negative-summary.json'), results);
  return results;
}

async function inheritedSafetyMatrix(schemaOnlyPlan) {
  const secretSentinel = ['SECRET','I09B','VALIDATION','MUST','REDACT'].join('_');
  const results = {};
  const touchSentinel = join(casesRoot, 'i09a-safety', 'touch-denied', 'packets', 'sentinel-created-by-touch');
  const touch = await runVerifyCase('i09a-safety/touch-denied', { plan: schemaOnlyPlan, runId: 'i09b-touch-denied', catalog: [{ ...commandSpec({ out: null, args: [touchSentinel], expectedArtifacts: [], argPaths: [{ index: 0, root: 'evidenceRoot' }] }), command: 'touch' }] });
  assert.equal(touch.envelope.status, 'blocked');
  assert.equal(touch.envelope.errors[0].classification, 'safety_policy_block');
  assert.equal(existsSync(touchSentinel), false, 'touch sentinel was created');
  assert.ok(findFailurePacket(touch.envelope, 'COMMAND_POLICY_DENIED'));
  results.touchDenied = readJson(join(touch.caseDir, 'summary.json'));

  const nodeEval = await runVerifyCase('i09a-safety/node-eval-denied', { plan: schemaOnlyPlan, runId: 'i09b-node-eval-denied', catalog: [commandSpec({ out: null, args: ['-e', 'console.log(1)'], expectedArtifacts: [], argPaths: [], publicArgs: [publicArg(1, 'console.log(1)')] })] });
  assert.equal(nodeEval.envelope.status, 'blocked');
  assert.ok(findFailurePacket(nodeEval.envelope, 'COMMAND_POLICY_DENIED'));
  results.nodeEvalDenied = readJson(join(nodeEval.caseDir, 'summary.json'));

  const timeout = await runVerifyCase('i09a-safety/timeout-cap', { plan: schemaOnlyPlan, runId: 'i09b-timeout-cap', catalog: [commandSpec({ script: sleepRunner, out: null, args: [sleepRunner, '2000'], expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }], scalarArgs: [scalarArg(1, 'duration_ms')], safety: { timeoutMs: 100 } })] });
  assert.equal(timeout.envelope.status, 'blocked');
  assert.ok(findFailurePacket(timeout.envelope, 'COMMAND_TIMEOUT'));
  results.timeoutCap = readJson(join(timeout.caseDir, 'summary.json'));

  const aggregate = await runVerifyCase('i09a-safety/aggregate-output-cap', { plan: schemaOnlyPlan, runId: 'i09b-aggregate-output-cap', catalog: [commandSpec({ script: largeOutputRunner, out: null, args: [largeOutputRunner, 'both', '80'], expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }], publicArgs: [publicArg(1, 'both')], scalarArgs: [scalarArg(2, 'byte_count')], safety: { maxStdoutBytes: 128, maxStderrBytes: 128, maxOutputBytes: 96 } })] });
  assert.equal(aggregate.envelope.status, 'blocked');
  assert.ok(findFailurePacket(aggregate.envelope, 'OUTPUT_LIMIT_EXCEEDED'));
  results.aggregateOutputCap = readJson(join(aggregate.caseDir, 'summary.json'));

  const secretOutPath = join(casesRoot, 'i09a-safety', 'secret-output-redaction', 'packets', 'runner-output', 'secret-output.txt');
  const secretOutput = await runVerifyCase('i09a-safety/secret-output-redaction', { plan: schemaOnlyPlan, runId: 'i09b-secret-output-redaction', catalog: [commandSpec({ script: secretOutputRunner, out: secretOutPath })] });
  assert.equal(secretOutput.envelope.status, 'success');
  assertNoRawSecret(secretOutput.caseDir, 'SECRET_ARTIFACT_VALUE', 'secret artifact redaction');
  assertNoRawSecret(secretOutput.caseDir, 'SECRET_STDOUT_VALUE', 'secret stdout redaction');
  assertNoRawSecret(secretOutput.caseDir, 'SECRET_STDOUT_PASSWORD', 'secret stdout password redaction');
  assertNoRawSecret(secretOutput.caseDir, 'SECRET_BEARER_VALUE', 'secret bearer redaction');
  assertNoRawSecret(secretOutput.caseDir, 'SECRET_STDERR_KEY', 'secret stderr key redaction');
  assertNoRawSecret(secretOutput.caseDir, 'SECRET_STDERR_CLIENT', 'secret stderr client redaction');
  results.secretOutputRedaction = readJson(join(secretOutput.caseDir, 'summary.json'));

  assertNoRawSecret(evidenceRoot, secretSentinel, 'validation secret-like input redaction');
  await writeJson(join(evidenceRoot, 'i09a-inherited-safety-summary.json'), { secretSentinelSha256: sha256Text(secretSentinel), results });
  return results;
}

async function regressionMatrix() {
  const r1Dir = join(evidenceRoot, 'r1-shipped-default');
  await mkdir(r1Dir, { recursive: true });
  const r1 = await spawnNode([repoEntry, '--json', '--non-interactive', 'verify'], repoRoot);
  await writeJson(join(r1Dir, 'spawn.json'), { ...r1, stdoutSha256: sha256Text(r1.stdout), stderrSha256: sha256Text(r1.stderr) });
  assert.equal(r1.code, 2, r1.stderr || r1.stdout);
  const r1Envelope = JSON.parse(r1.stdout);
  assertEnvelope(r1Envelope, 'r1-shipped-default');
  assert.equal(r1Envelope.status, 'blocked');
  assert.equal(r1Envelope.errors[0].classification, 'unsupported_operation');

  const r2Dir = join(evidenceRoot, 'r2-foundation-siblings');
  await mkdir(r2Dir, { recursive: true });
  const foundation = await spawnNode([repoEntry, '--json', '--non-interactive', 'foundation', '--status', 'success'], repoRoot);
  assert.equal(foundation.code, 0, foundation.stderr || foundation.stdout);
  const foundationEnvelope = JSON.parse(foundation.stdout);
  assertEnvelope(foundationEnvelope, 'r2-foundation');
  assert.equal(foundationEnvelope.status, 'success');

  const siblingLoader = createCommandLoader([doctorCommand, configCommand, schematicCommand]);
  const siblingCases = [];
  for (const [command, args] of [['doctor', ['--unknown-doctor-flag']], ['config', ['inspect', '--unknown-config-flag']], ['schematic', []]]) {
    const invocation = nowInvocation(command, [command, ...args]);
    const result = await siblingLoader.dispatch(command, args, { invocation, packageJsonPath: join(repoRoot, 'packages/cli/package.json'), config: null });
    assertEnvelope(result.envelope, `r2-${command}`);
    assert.equal(result.envelope.status, 'blocked');
    siblingCases.push({ command, args, envelope: result.envelope });
  }
  await writeJson(join(r2Dir, 'summary.json'), { foundation: { ...foundation, stdoutSha256: sha256Text(foundation.stdout), stderrSha256: sha256Text(foundation.stderr), envelope: foundationEnvelope }, siblingCases });
  return { r1: r1Envelope, foundation: foundationEnvelope, siblingCases };
}

async function finalSecretScan() {
  const scanDir = join(evidenceRoot, 'r3-redaction');
  await mkdir(scanDir, { recursive: true });
  const sentinels = ['SECRET_ARTIFACT_VALUE', 'SECRET_STDOUT_VALUE', 'SECRET_STDOUT_PASSWORD', 'SECRET_BEARER_VALUE', 'SECRET_STDERR_KEY', 'SECRET_STDERR_CLIENT', ['SECRET','I09B','VALIDATION','MUST','REDACT'].join('_')];
  const roots = [evidenceRoot, join(repoRoot, '.vibe/work/I-09B-verify-cli-command/evidence')];
  const hits = [];
  for (const root of roots) {
    for (const file of walkFiles(root)) {
      if (file.endsWith('i09b-matrix-witness.mjs')) continue;
      if (statSync(file).size > 2_000_000) continue;
      const text = readFileSync(file, 'utf8');
      for (const sentinel of sentinels) {
        if (text.includes(sentinel)) hits.push({ file, sentinelSha256: sha256Text(sentinel) });
      }
    }
  }
  await writeJson(join(scanDir, 'secret-scan-summary.json'), { roots, sentinelSha256s: sentinels.map(sha256Text), hitCount: hits.length, hits });
  assert.equal(hits.length, 0, `R3 raw sentinel hits: ${JSON.stringify(hits)}`);
  return { hitCount: hits.length };
}

async function main() {
  await mkdir(fixturesRoot, { recursive: true });
  await mkdir(casesRoot, { recursive: true });
  const schemaOnlyPlan = await planVariant('schema-only-passed', (plan) => setOnlyAction(plan, 'schema-validation', 'add'));
  const advisoryOnlyPlan = await planVariant('advisory-only-warning', (plan) => setOnlyAction(plan, 'advisory-review', 'add'));

  const positive = await positiveAndAllowedModes(schemaOnlyPlan, advisoryOnlyPlan);
  const invalids = await invalidInvocationMatrix(schemaOnlyPlan);
  const negatives = await negativeMatrix(schemaOnlyPlan, advisoryOnlyPlan);
  const safety = await inheritedSafetyMatrix(schemaOnlyPlan);
  const regression = await regressionMatrix();
  const redaction = await finalSecretScan();

  const summary = {
    status: 'PASS',
    command: `${process.execPath} ${join(evidenceRoot, 'i09b-matrix-witness.mjs')}`,
    cwd: repoRoot,
    plans: { schemaOnlyPlan, advisoryOnlyPlan },
    positive: { p1Status: positive.p1.envelope.status, p1RunnerStatus: positive.p1.envelope.payload.data.runnerStatus, advisoryStatus: positive.advisory.envelope.status, advisoryRunnerStatus: positive.advisory.envelope.payload.data.runnerStatus },
    invalidInvocationCount: invalids.length,
    negatives: Object.fromEntries(Object.entries(negatives).map(([key, value]) => [key, { status: value.status, classification: value.classification, runnerStatus: value.runnerStatus }])),
    inheritedSafetyCases: Object.keys(safety),
    regression: { r1Classification: regression.r1.errors[0].classification, foundationStatus: regression.foundation.status, siblingCount: regression.siblingCases.length },
    redaction
  };
  await writeJson(join(evidenceRoot, 'matrix-summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

await main();
