import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = join(repoRoot, '.vibe/work/I-09B-verify-cli-command/post-fix-validation-evidence/regressions');
const casesRoot = join(evidenceRoot, 'cases');
const fixturesRoot = join(evidenceRoot, 'fixtures');
const runnerDir = join(fixturesRoot, 'runners');
const repoEntry = join(repoRoot, 'packages/cli/src/entry/vibe-engineer.js');
const loaderPath = join(repoRoot, 'packages/cli/src/command-loader/loader.js');
const verifyPath = join(repoRoot, 'packages/cli/src/commands/verify/index.ts');
const envelopePath = join(repoRoot, 'packages/cli/src/envelope/result-envelope.js');
const sanitizerPath = join(repoRoot, 'packages/cli/src/errors/sanitization.js');
const doctorPath = join(repoRoot, 'packages/cli/src/commands/doctor/index.js');
const configPath = join(repoRoot, 'packages/cli/src/commands/config/index.js');
const schematicPath = join(repoRoot, 'packages/cli/src/commands/schematic/index.js');
const approvedPlan = join(repoRoot, 'packages/verification/fixtures/plans/approved-plan.json');

const passRunner = join(runnerDir, 'post-fix-pass-runner.mjs');
const failRunner = join(runnerDir, 'post-fix-fail-runner.mjs');
const noArtifactRunner = join(runnerDir, 'post-fix-no-artifact-runner.mjs');
const secretOutputRunner = join(runnerDir, 'post-fix-secret-output-runner.mjs');
const sleepRunner = join(runnerDir, 'post-fix-sleep-runner.mjs');
const largeOutputRunner = join(runnerDir, 'post-fix-large-output-runner.mjs');
const missingScript = join(runnerDir, 'post-fix-literal-missing-script.mjs');

const seededSentinels = Object.freeze([
  'SECRET_POST_FIX_ARTIFACT_VALUE',
  'SECRET_POST_FIX_STDOUT_VALUE',
  'SECRET_POST_FIX_STDOUT_PASSWORD',
  'SECRET_POST_FIX_BEARER_VALUE',
  'SECRET_POST_FIX_STDERR_KEY',
  'SECRET_POST_FIX_STDERR_CLIENT',
  'SECRET_POST_FIX_INPUT_VALUE',
  ['SECRET', 'I09B', 'VALIDATION', 'MUST', 'REDACT'].join('_')
]);

const packageContextProbeProcess = spawnSync(process.execPath, ['--input-type=module', '-e', `
const verification = await import('@vibe-engineer/verification');
const artifacts = await import('@vibe-engineer/artifacts');
console.log(JSON.stringify({
  cwd: process.cwd(),
  verificationResolved: import.meta.resolve('@vibe-engineer/verification'),
  artifactsResolved: import.meta.resolve('@vibe-engineer/artifacts'),
  runVerificationPlanType: typeof verification.runVerificationPlan,
  validateArtifactFileType: typeof artifacts.validateArtifactFile,
  verificationStatuses: verification.VERIFICATION_STATUSES,
  evidenceFailureClassifications: verification.EVIDENCE_FAILURE_CLASSIFICATIONS,
  verificationExportKeys: Object.keys(verification).sort(),
  artifactsExportKeys: Object.keys(artifacts).sort()
}));
`], { cwd: join(repoRoot, 'packages/cli'), encoding: 'utf8', env: {} });
if (packageContextProbeProcess.status !== 0) throw new Error(`package-context probe failed: ${packageContextProbeProcess.stderr || packageContextProbeProcess.stdout}`);
const packageContextProbe = JSON.parse(packageContextProbeProcess.stdout);
const [{ createCommandLoader }, { verifyCommand }, { validateCliResultEnvelope }, { sanitizeArgvForMetadata }, artifactsModule, { doctorCommand }, { configCommand }, { schematicCommand }] = await Promise.all([
  import(pathToFileURL(loaderPath).href),
  import(pathToFileURL(verifyPath).href),
  import(pathToFileURL(envelopePath).href),
  import(pathToFileURL(sanitizerPath).href),
  import(packageContextProbe.artifactsResolved),
  import(pathToFileURL(doctorPath).href),
  import(pathToFileURL(configPath).href),
  import(pathToFileURL(schematicPath).href)
]);

function sha256Text(text) { return createHash('sha256').update(text).digest('hex'); }
function sha256File(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
function readJson(file) { return JSON.parse(readFileSync(file, 'utf8')); }
async function writeJson(file, value) { await mkdir(dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); return file; }
function safeCaseId(name) { return name.replaceAll('/', '-').replace(/[^a-z0-9._:-]+/gi, '-').toLowerCase(); }
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
function nowInvocation(command, argv, { sanitize = true } = {}) {
  const now = new Date().toISOString();
  return { id: `i-09b-post-fix-${safeCaseId(command)}-${sha256Text(JSON.stringify(argv)).slice(0, 8)}`, command, argv: sanitize ? sanitizeArgvForMetadata(argv) : argv, projectRoot: repoRoot, configPath: null, startedAt: now, endedAt: now };
}
function assertEnvelope(envelope, label) {
  const validation = validateCliResultEnvelope(envelope);
  assert.equal(validation.ok, true, `${label} invalid CLI envelope: ${JSON.stringify(validation)}`);
  return validation;
}
function packetPayload(envelope) { return Array.isArray(envelope.payload?.data?.evidencePackets) ? envelope.payload.data.evidencePackets : []; }
function packetPaths(envelope) { return packetPayload(envelope).map((packet) => packet.path); }
function validatePacketRouting(envelope, label) {
  const payloadPackets = packetPayload(envelope);
  const payloadPaths = payloadPackets.map((packet) => packet.path).sort();
  const artifactPaths = (Array.isArray(envelope.artifacts) ? envelope.artifacts : []).filter((artifact) => artifact.kind === 'evidence_packet').map((artifact) => artifact.path).sort();
  assert.deepEqual(artifactPaths, payloadPaths, `${label}: payload and artifact packet paths must match`);
  const packetSummaries = [];
  for (const packet of payloadPackets) {
    assert.equal(existsSync(packet.path), true, `${label}: packet path exists ${packet.path}`);
    const validation = artifactsModule.validateArtifactFile(packet.path, { kind: 'evidence_packet' });
    assert.equal(validation.ok, true, `${label}: Evidence Packet validates ${packet.path}: ${JSON.stringify(validation)}`);
    assert.equal(packet.sha256, sha256File(packet.path), `${label}: packet sha256 matches ${packet.path}`);
    const data = readJson(packet.path);
    packetSummaries.push({ path: packet.path, sha256: packet.sha256, artifactId: data.artifactId, status: data.status, result: data.result, blocking: data.blocking, failureCode: data.failureDetails?.code ?? null, failureClassification: data.failureDetails?.classification ?? null, rerunOf: data.rerunOf ?? null, artifacts: data.artifacts ?? [], stdoutRef: data.stdoutRef ?? null, stderrRef: data.stderrRef ?? null, logsRef: data.logsRef ?? null });
  }
  return { payloadPaths, artifactPaths, packetSummaries };
}
function findFailurePacket(envelope, code) {
  for (const p of packetPaths(envelope)) {
    const packet = readJson(p);
    if (packet.failureDetails?.code === code) return packet;
  }
  return null;
}
function assertNoEvidencePackets(dir, label) {
  const packetFiles = walkFiles(dir).filter((file) => /evidence_.*\.json$/u.test(file));
  assert.equal(packetFiles.length, 0, `${label}: unexpected Evidence Packets ${packetFiles.join(', ')}`);
}
function assertNoRawSecret(root, sentinels, label) {
  const hits = [];
  for (const file of walkFiles(root)) {
    if (file.endsWith('.mjs')) continue;
    if (statSync(file).size > 2_000_000) continue;
    const text = readFileSync(file, 'utf8');
    for (const sentinel of sentinels) if (text.includes(sentinel)) hits.push({ file, sentinelSha256: sha256Text(sentinel) });
  }
  assert.deepEqual(hits, [], `${label}: raw sentinel hits ${JSON.stringify(hits)}`);
}

async function makeRunners() {
  await mkdir(runnerDir, { recursive: true });
  await rm(missingScript, { force: true });
  await writeFile(passRunner, `import { mkdir, writeFile } from 'node:fs/promises';\nimport { dirname } from 'node:path';\nconst out = process.argv[2];\nif (!out) throw new Error('missing output');\nawait mkdir(dirname(out), { recursive: true });\nawait writeFile(out, JSON.stringify({ ok: true, runner: 'post-fix-pass', argv: process.argv.slice(2) }) + '\\n', 'utf8');\nconsole.log('post-fix-pass-runner-ok');\n`, 'utf8');
  await writeFile(failRunner, `console.error('post-fix deterministic runner failure');\nprocess.exit(9);\n`, 'utf8');
  await writeFile(noArtifactRunner, `console.log('post-fix no artifact runner intentionally writes nothing');\n`, 'utf8');
  await writeFile(sleepRunner, `const ms = Number(process.argv[2] || 1000);\nawait new Promise((resolve) => setTimeout(resolve, ms));\n`, 'utf8');
  await writeFile(largeOutputRunner, `const mode = process.argv[2] || 'both';\nconst count = Number(process.argv[3] || 256);\nif (mode === 'stdout' || mode === 'both') process.stdout.write('O'.repeat(count));\nif (mode === 'stderr' || mode === 'both') process.stderr.write('E'.repeat(count));\n`, 'utf8');
  await writeFile(secretOutputRunner, `import { mkdir, writeFile } from 'node:fs/promises';\nimport { dirname } from 'node:path';\nconst out = process.argv[2];\nawait mkdir(dirname(out), { recursive: true });\nawait writeFile(out, 'artifact=SECRET_POST_FIX_ARTIFACT_VALUE\\n', 'utf8');\nconsole.log('stdout SECRET_POST_FIX_STDOUT_VALUE password=SECRET_POST_FIX_STDOUT_PASSWORD Bearer SECRET_POST_FIX_BEARER_VALUE');\nconsole.error('stderr api-key=SECRET_POST_FIX_STDERR_KEY client-secret=SECRET_POST_FIX_STDERR_CLIENT');\n`, 'utf8');
}
function commandSpec({ id = 'schema-validation', layer = 'schema_validation', script = passRunner, out = null, blocking = true, evidenceClass = 'deterministic', args = null, expectedArtifacts = null, safety = {}, extra = {}, publicArgs = [], scalarArgs = [], argPaths = null, command = process.execPath }) {
  const finalArgs = args ?? [script, out].filter(Boolean);
  const finalArgPaths = argPaths ?? finalArgs.map((value, index) => {
    if (value === script) return { index, root: 'projectRoot' };
    if (out && value === out) return { index, root: 'evidenceRoot' };
    return null;
  }).filter(Boolean);
  return {
    id: `post-fix-${id}`,
    requiredItemIds: [id],
    layer,
    evidenceClass,
    blocking,
    kind: 'command',
    command,
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
  return { id: `post-fix-${id}`, requiredItemIds: [id], layer, evidenceClass, blocking, kind: 'validator', validator, ...extra };
}
function publicArg(index, value) { return { index, value }; }
function scalarArg(index, kind) { return { index, kind }; }
async function planVariant(name, mutate) {
  const plan = readJson(approvedPlan);
  mutate(plan);
  plan.artifactId = `i09b-post-fix-${safeCaseId(name)}-plan`;
  plan.title = `I-09B post-fix ${name} plan`;
  plan.verificationDelta.artifactId = `i09b-post-fix-${safeCaseId(name)}-delta`;
  plan.verificationDelta.implementationPlanRef.artifactId = plan.artifactId;
  plan.verificationDelta.implementationPlanRef.path = `.vibe/work/I-09B-verify-cli-command/post-fix-validation-evidence/regressions/fixtures/${safeCaseId(name)}.implementation-plan.json`;
  plan.verificationDelta.links[0].artifactId = plan.artifactId;
  plan.verificationDelta.links[0].path = plan.verificationDelta.implementationPlanRef.path;
  const file = join(fixturesRoot, `${safeCaseId(name)}.implementation-plan.json`);
  await writeJson(file, plan);
  return file;
}
function setOnlyAction(plan, activeId, activeAction = 'add') {
  for (const item of plan.verificationDelta.requiredItems) {
    item.action = item.id === activeId ? activeAction : 'not_applicable';
    item.rationale = `I-09B post-fix regression fixture rationale for ${item.id}.`;
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
    '--run-id', options.runId ?? `i09b-post-fix-${safeCaseId(name)}`,
    '--runner-catalog', runnerCatalogPath ?? join(caseDir, 'missing-runner-catalog.json'),
    ...(resultFile ? ['--result-file', resultFile] : []),
    ...(options.rerunOf ? ['--rerun-of', options.rerunOf] : [])
  ];
  const invocation = nowInvocation('verify', ['verify', ...args], { sanitize: options.sanitizeInvocation !== false });
  const loader = createCommandLoader([verifyCommand]);
  const dispatchResult = await loader.dispatch('verify', args, { invocation, packageJsonPath: join(repoRoot, 'packages/cli/package.json'), validationCase: name });
  const envelope = dispatchResult.envelope;
  const envelopeValidation = assertEnvelope(envelope, name);
  await writeJson(join(caseDir, 'cli-result.json'), envelope);
  if (resultFile && existsSync(resultFile)) assert.deepEqual(readJson(resultFile), envelope, `${name}: result-file envelope matches returned envelope`);
  const routing = packetPaths(envelope).length > 0 ? validatePacketRouting(envelope, name) : { payloadPaths: [], artifactPaths: [], packetSummaries: [] };
  const summary = {
    name,
    status: envelope.status,
    exitCode: envelope.exitCode,
    classification: envelope.errors?.[0]?.classification ?? envelope.diagnostics?.find((d) => d.severity === 'error')?.classification ?? null,
    code: envelope.errors?.[0]?.code ?? envelope.diagnostics?.find((d) => d.severity === 'error')?.code ?? null,
    runnerStatus: envelope.payload?.data?.runnerStatus ?? null,
    failures: envelope.payload?.data?.failures ?? [],
    executedItems: envelope.payload?.data?.executedItems ?? [],
    recordedItems: envelope.payload?.data?.recordedItems ?? [],
    blockedItems: envelope.payload?.data?.blockedItems ?? [],
    resultFile,
    resultFileExists: resultFile ? existsSync(resultFile) : false,
    resultFileSha256: resultFile && existsSync(resultFile) ? sha256File(resultFile) : null,
    packetCount: routing.packetSummaries.length,
    packetSummaries: routing.packetSummaries,
    envelopeValidation
  };
  await writeJson(join(caseDir, 'summary.json'), summary);
  return { caseDir, caseEvidenceRoot, resultFile, envelope, routing, summary };
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

async function positiveAndAllowedModes(schemaOnlyPlan, advisoryOnlyPlan) {
  const p1Out = join(casesRoot, 'p1-cli', 'packets', 'runner-output', 'schema-output.json');
  const p1 = await runVerifyCase('p1-cli', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-p1-cli', catalog: [commandSpec({ out: p1Out })] });
  assert.equal(p1.envelope.status, 'success');
  assert.equal(p1.envelope.exitCode, 0);
  assert.equal(p1.envelope.payload.data.runnerStatus, 'passed');
  assert.ok(p1.routing.packetSummaries.length >= 1);
  assert.ok(p1.envelope.artifacts.some((artifact) => artifact.kind === 'cli_result' && artifact.path === p1.resultFile));

  const advisory = await runVerifyCase('allowed/advisory-only-rerun', { plan: advisoryOnlyPlan, runId: 'i09b-post-fix-advisory-only', rerunOf: 'prior-post-fix-advisory-run', catalog: [commandSpec({ id: 'advisory-review', layer: 'advisory_review', script: failRunner, out: null, expectedArtifacts: [], evidenceClass: 'advisory', blocking: false, extra: { failureClassification: 'advisory_finding' } })] });
  assert.equal(advisory.envelope.status, 'success');
  assert.equal(advisory.envelope.exitCode, 0);
  assert.equal(advisory.envelope.payload.data.runnerStatus, 'advisory_warning');
  assert.equal(advisory.envelope.payload.data.rerunOf, 'prior-post-fix-advisory-run');
  assert.equal(advisory.envelope.payload.data.blockedItems.length, 0);
  assert.ok(advisory.routing.packetSummaries.some((packet) => packet.rerunOf === 'prior-post-fix-advisory-run'));

  const summary = { p1: p1.summary, advisory: advisory.summary };
  await writeJson(join(evidenceRoot, 'positive-allowed-summary.json'), summary);
  return { p1, advisory };
}
async function invalidInvocationMatrix(schemaOnlyPlan) {
  const validCatalogPath = join(fixturesRoot, 'invalid-matrix-valid-runner-catalog.json');
  await writeJson(validCatalogPath, [commandSpec({ out: join(casesRoot, 'invalid-shared-output', 'packets', 'runner-output.json') })]);
  const secretLikeRunId = 'SECRET_POST_FIX_INPUT_VALUE';
  const invalids = [
    { name: 'invalid/unknown-flag', args: ['--definitely-unknown'], expectClass: 'invalid_invocation' },
    { name: 'invalid/unexpected-positional', args: ['unexpected-positional'], expectClass: 'invalid_invocation' },
    { name: 'invalid/missing-flag-value', args: ['--implementation-plan'], expectClass: 'invalid_invocation' },
    { name: 'invalid/duplicate-flag', args: ['--implementation-plan', schemaOnlyPlan, '--implementation-plan', schemaOnlyPlan, '--evidence-root', join(casesRoot, 'invalid/duplicate-flag/packets'), '--project-root', repoRoot, '--run-id', 'i09b-post-fix-invalid-duplicate', '--runner-catalog', validCatalogPath], expectClass: 'invalid_invocation' },
    { name: 'invalid/malformed-catalog-json', catalogRaw: '{"not":"an array"', plan: schemaOnlyPlan, runId: 'i09b-post-fix-invalid-malformed-catalog', expectClass: 'invalid_input' },
    { name: 'invalid/missing-required-input', args: ['--implementation-plan', schemaOnlyPlan, '--evidence-root', join(casesRoot, 'invalid/missing-required-input/packets'), '--project-root', repoRoot, '--run-id', 'i09b-post-fix-invalid-missing-required'], expectClass: 'invalid_invocation' },
    { name: 'invalid/secret-like-input', args: ['--implementation-plan', schemaOnlyPlan, '--evidence-root', join(casesRoot, 'invalid/secret-like-input/packets'), '--project-root', repoRoot, '--run-id', secretLikeRunId, '--runner-catalog', validCatalogPath], expectClass: 'invalid_input' },
    { name: 'invalid/unsafe-path-escape', args: ['--implementation-plan', schemaOnlyPlan, '--evidence-root', '../outside-i09b-post-fix-validation', '--project-root', repoRoot, '--run-id', 'i09b-post-fix-invalid-path-escape', '--runner-catalog', validCatalogPath], expectClass: 'invalid_input' },
    { name: 'invalid/protected-evidence-root', args: ['--implementation-plan', schemaOnlyPlan, '--evidence-root', 'package.json', '--project-root', repoRoot, '--run-id', 'i09b-post-fix-invalid-protected-evidence', '--runner-catalog', validCatalogPath], expectClass: 'invalid_input' },
    { name: 'invalid/protected-runner-catalog', args: ['--implementation-plan', schemaOnlyPlan, '--evidence-root', join(casesRoot, 'invalid/protected-runner-catalog/packets'), '--project-root', repoRoot, '--run-id', 'i09b-post-fix-invalid-protected-catalog', '--runner-catalog', 'package.json'], expectClass: 'invalid_input' },
    { name: 'invalid/result-file-path-escape', args: ['--implementation-plan', schemaOnlyPlan, '--evidence-root', join(casesRoot, 'invalid/result-file-path-escape/packets'), '--project-root', repoRoot, '--run-id', 'i09b-post-fix-invalid-result-escape', '--runner-catalog', validCatalogPath, '--result-file', '../outside-result.json'], expectClass: 'invalid_input' }
  ];
  const results = [];
  for (const item of invalids) {
    const result = await runVerifyCase(item.name, item);
    assert.equal(result.envelope.status, 'blocked', item.name);
    assert.equal(result.summary.classification, item.expectClass, item.name);
    assertNoEvidencePackets(result.caseDir, item.name);
    results.push(result.summary);
  }
  await writeJson(join(evidenceRoot, 'invalid-invocation-summary.json'), results);
  return results;
}
async function negativeMatrix(schemaOnlyPlan, draftPlan, missingCategoryPlan, advisoryOnlyPlan) {
  const results = {};
  const n1Out = join(casesRoot, 'n1-cli', 'packets', 'runner-output', 'should-not-exist.json');
  const n1 = await runVerifyCase('n1-cli', { plan: draftPlan, runId: 'i09b-post-fix-n1-cli', catalog: [commandSpec({ out: n1Out })] });
  assert.equal(n1.envelope.status, 'blocked');
  assert.equal(n1.summary.classification, 'invalid_input');
  assert.equal(existsSync(n1Out), false, 'N1 runner executed despite draft plan');
  assertNoEvidencePackets(n1.caseDir, 'n1-cli');
  results.n1 = n1.summary;

  const n2MissingSpec = await runVerifyCase('n2-cli/missing-runner-spec', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-n2-missing-spec', catalog: [] });
  assert.equal(n2MissingSpec.envelope.status, 'blocked');
  assert.equal(n2MissingSpec.summary.classification, 'missing_prerequisite');
  assert.ok(findFailurePacket(n2MissingSpec.envelope, 'MISSING_RUNNER_OR_PREREQUISITE'));
  results.n2MissingSpec = n2MissingSpec.summary;

  const n2MissingScript = await runVerifyCase('n2-cli/literal-missing-script', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-n2-missing-script', catalog: [commandSpec({ script: missingScript, expectedArtifacts: [] })] });
  assert.equal(existsSync(missingScript), false);
  assert.equal(n2MissingScript.envelope.status, 'blocked');
  assert.equal(n2MissingScript.summary.classification, 'missing_prerequisite');
  assert.equal(n2MissingScript.summary.runnerStatus, 'blocked');
  assert.equal(n2MissingScript.summary.failures[0]?.classification, 'missing_runner_or_prerequisite');
  assert.deepEqual(n2MissingScript.summary.executedItems, []);
  assert.deepEqual(n2MissingScript.summary.packetSummaries, []);
  results.n2MissingScript = n2MissingScript.summary;

  const n3Out = join(casesRoot, 'n3-cli', 'packets', 'runner-output', 'missing-output.json');
  const n3 = await runVerifyCase('n3-cli', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-n3-cli', catalog: [commandSpec({ script: noArtifactRunner, out: n3Out })] });
  assert.equal(n3.envelope.status, 'blocked');
  assert.equal(n3.summary.classification, 'missing_prerequisite');
  assert.ok(findFailurePacket(n3.envelope, 'MISSING_EVIDENCE'));
  results.n3 = n3.summary;

  const n4 = await runVerifyCase('n4-cli', { plan: missingCategoryPlan, runId: 'i09b-post-fix-n4-cli', catalog: [] });
  assert.equal(n4.envelope.status, 'blocked');
  assert.equal(n4.summary.classification, 'invalid_input');
  assertNoEvidencePackets(n4.caseDir, 'n4-cli');
  results.n4 = n4.summary;

  const n5 = await runVerifyCase('n5-cli', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-n5-cli', catalog: [validatorSpec({ validator: 'malformedEvidencePacketCandidate' })] });
  assert.equal(n5.envelope.status, 'blocked');
  assert.equal(n5.summary.classification, 'invalid_input');
  assert.ok(findFailurePacket(n5.envelope, 'MALFORMED_EVIDENCE_PACKET'));
  assert.ok(n5.routing.packetSummaries.every((packet) => packet.result !== 'pass' || packet.status === 'not_run'));
  results.n5 = n5.summary;

  const n6 = await runVerifyCase('n6-cli', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-n6-cli', catalog: [validatorSpec({ validator: 'throwInternalError' })] });
  assert.equal(n6.envelope.status, 'failure');
  assert.equal(n6.summary.classification, 'internal_error');
  assert.equal(n6.envelope.exitCode, 7);
  assert.ok(findFailurePacket(n6.envelope, 'RUNNER_INTERNAL_ERROR'));
  results.n6 = n6.summary;

  const n7 = await runVerifyCase('n7-cli', { plan: advisoryOnlyPlan, runId: 'i09b-post-fix-n7-cli', catalog: [commandSpec({ id: 'advisory-review', layer: 'advisory_review', script: failRunner, out: null, expectedArtifacts: [], evidenceClass: 'advisory', blocking: false, extra: { failureClassification: 'advisory_finding' } })] });
  assert.equal(n7.envelope.status, 'success');
  assert.equal(n7.envelope.payload.data.runnerStatus, 'advisory_warning');
  assert.equal(n7.envelope.payload.data.blockedItems.length, 0);
  results.n7 = n7.summary;

  await writeJson(join(evidenceRoot, 'negative-summary.json'), results);
  return results;
}
async function inheritedSafetyMatrix(schemaOnlyPlan) {
  const results = {};
  const touchSentinel = join(casesRoot, 'i09a-safety', 'touch-denied', 'packets', 'sentinel-created-by-touch');
  const touch = await runVerifyCase('i09a-safety/touch-denied', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-touch-denied', catalog: [{ ...commandSpec({ out: null, args: [touchSentinel], expectedArtifacts: [], argPaths: [{ index: 0, root: 'evidenceRoot' }] }), command: 'touch' }] });
  assert.equal(touch.envelope.status, 'blocked');
  assert.equal(touch.summary.classification, 'safety_policy_block');
  assert.equal(existsSync(touchSentinel), false, 'touch sentinel was created');
  assert.ok(findFailurePacket(touch.envelope, 'COMMAND_POLICY_DENIED'));
  results.touchDenied = touch.summary;

  const nodeEval = await runVerifyCase('i09a-safety/node-eval-denied', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-node-eval-denied', catalog: [commandSpec({ out: null, args: ['-e', 'console.log(1)'], expectedArtifacts: [], argPaths: [], publicArgs: [publicArg(1, 'console.log(1)')] })] });
  assert.equal(nodeEval.envelope.status, 'blocked');
  assert.equal(nodeEval.summary.classification, 'safety_policy_block');
  assert.ok(findFailurePacket(nodeEval.envelope, 'COMMAND_POLICY_DENIED'));
  results.nodeEvalDenied = nodeEval.summary;

  const protectedScript = await runVerifyCase('i09a-safety/protected-script-denied', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-protected-script-denied', catalog: [commandSpec({ script: join(repoRoot, 'packages/cli/src/entry/vibe-engineer.js'), out: null, expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] })] });
  assert.equal(protectedScript.envelope.status, 'blocked');
  assert.equal(protectedScript.summary.classification, 'safety_policy_block');
  assert.ok(findFailurePacket(protectedScript.envelope, 'COMMAND_POLICY_DENIED'));
  results.protectedScriptDenied = protectedScript.summary;

  const pathEscape = await runVerifyCase('i09a-safety/script-path-escape-denied', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-script-path-escape-denied', catalog: [commandSpec({ script: '/bin/sh', out: null, expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] })] });
  assert.equal(pathEscape.envelope.status, 'blocked');
  assert.equal(pathEscape.summary.classification, 'safety_policy_block');
  assert.ok(findFailurePacket(pathEscape.envelope, 'COMMAND_POLICY_DENIED') || findFailurePacket(pathEscape.envelope, 'UNSAFE_PATH'));
  results.scriptPathEscapeDenied = pathEscape.summary;

  const timeout = await runVerifyCase('i09a-safety/timeout-cap', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-timeout-cap', catalog: [commandSpec({ script: sleepRunner, out: null, args: [sleepRunner, '2000'], expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }], scalarArgs: [scalarArg(1, 'duration_ms')], safety: { timeoutMs: 100 } })] });
  assert.equal(timeout.envelope.status, 'blocked');
  assert.equal(timeout.summary.classification, 'safety_policy_block');
  assert.ok(findFailurePacket(timeout.envelope, 'COMMAND_TIMEOUT'));
  results.timeoutCap = timeout.summary;

  const aggregate = await runVerifyCase('i09a-safety/aggregate-output-cap', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-aggregate-output-cap', catalog: [commandSpec({ script: largeOutputRunner, out: null, args: [largeOutputRunner, 'both', '80'], expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }], publicArgs: [publicArg(1, 'both')], scalarArgs: [scalarArg(2, 'byte_count')], safety: { maxStdoutBytes: 128, maxStderrBytes: 128, maxOutputBytes: 96 } })] });
  assert.equal(aggregate.envelope.status, 'blocked');
  assert.equal(aggregate.summary.classification, 'safety_policy_block');
  assert.ok(findFailurePacket(aggregate.envelope, 'OUTPUT_LIMIT_EXCEEDED'));
  results.aggregateOutputCap = aggregate.summary;

  const secretOutPath = join(casesRoot, 'i09a-safety', 'secret-output-redaction', 'packets', 'runner-output', 'secret-output.txt');
  const secretOutput = await runVerifyCase('i09a-safety/secret-output-redaction', { plan: schemaOnlyPlan, runId: 'i09b-post-fix-secret-output-redaction', catalog: [commandSpec({ script: secretOutputRunner, out: secretOutPath })] });
  assert.equal(secretOutput.envelope.status, 'success');
  assertNoRawSecret(secretOutput.caseDir, seededSentinels, 'secret output redaction case');
  results.secretOutputRedaction = secretOutput.summary;

  const summary = { sentinelSha256s: seededSentinels.map(sha256Text), results };
  await writeJson(join(evidenceRoot, 'i09a-inherited-safety-summary.json'), summary);
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
  const summary = { r1: { ...r1, stdoutSha256: sha256Text(r1.stdout), stderrSha256: sha256Text(r1.stderr), envelope: r1Envelope }, foundation: { ...foundation, stdoutSha256: sha256Text(foundation.stdout), stderrSha256: sha256Text(foundation.stderr), envelope: foundationEnvelope }, siblingCases };
  await writeJson(join(r2Dir, 'summary.json'), summary);
  return { r1: r1Envelope, foundation: foundationEnvelope, siblingCases };
}
async function finalSecretScan() {
  const scanDir = join(evidenceRoot, 'r3-redaction');
  await mkdir(scanDir, { recursive: true });
  const roots = [
    evidenceRoot,
    join(repoRoot, '.vibe/work/I-09B-verify-cli-command/evidence'),
    join(repoRoot, '.vibe/work/I-09B-verify-cli-command/validation-evidence'),
    join(repoRoot, '.vibe/work/I-09B-verify-cli-command/fix-evidence')
  ];
  const hits = [];
  const excludedExtensions = new Set(['.mjs']);
  for (const root of roots) {
    for (const file of walkFiles(root)) {
      if ([...excludedExtensions].some((ext) => file.endsWith(ext))) continue;
      if (statSync(file).size > 2_000_000) continue;
      const text = readFileSync(file, 'utf8');
      for (const sentinel of seededSentinels) if (text.includes(sentinel)) hits.push({ file, relativePath: relative(repoRoot, file), sentinelSha256: sha256Text(sentinel) });
    }
  }
  const summary = { roots, excludedExtensions: [...excludedExtensions], sentinelSha256s: seededSentinels.map(sha256Text), hitCount: hits.length, hits };
  await writeJson(join(scanDir, 'secret-scan-summary.json'), summary);
  assert.equal(hits.length, 0, `R3 raw sentinel hits: ${JSON.stringify(hits)}`);
  return summary;
}

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  await mkdir(fixturesRoot, { recursive: true });
  await rm(casesRoot, { recursive: true, force: true });
  await makeRunners();
  assert.equal(existsSync(missingScript), false, 'missing script fixture must not exist');
  assert.equal(verifyCommand.id, 'verify');
  assert.equal(typeof verifyCommand.run, 'function');
  assert.equal(packageContextProbe.runVerificationPlanType, 'function');

  const schemaOnlyPlan = await planVariant('schema-only-passed', (plan) => setOnlyAction(plan, 'schema-validation', 'add'));
  const advisoryOnlyPlan = await planVariant('advisory-only-warning', (plan) => setOnlyAction(plan, 'advisory-review', 'add'));
  const draftPlan = await planVariant('draft-plan-not-approved', (plan) => { plan.status = 'draft'; setOnlyAction(plan, 'schema-validation', 'add'); });
  const missingCategoryPlan = await planVariant('missing-category-plan', (plan) => { setOnlyAction(plan, 'schema-validation', 'add'); plan.verificationDelta.requiredItems = plan.verificationDelta.requiredItems.filter((item) => item.layer !== 'schema_validation'); });

  const positive = await positiveAndAllowedModes(schemaOnlyPlan, advisoryOnlyPlan);
  const invalids = await invalidInvocationMatrix(schemaOnlyPlan);
  const negatives = await negativeMatrix(schemaOnlyPlan, draftPlan, missingCategoryPlan, advisoryOnlyPlan);
  const safety = await inheritedSafetyMatrix(schemaOnlyPlan);
  const regression = await regressionMatrix();
  const redaction = await finalSecretScan();

  const summary = {
    status: 'PASS',
    command: `${process.execPath} ${join(evidenceRoot, 'i09b-regression-matrix.mjs')}`,
    cwd: repoRoot,
    packageContextProbe,
    plans: { schemaOnlyPlan, advisoryOnlyPlan, draftPlan, missingCategoryPlan },
    positive: { p1Status: positive.p1.envelope.status, p1RunnerStatus: positive.p1.envelope.payload.data.runnerStatus, advisoryStatus: positive.advisory.envelope.status, advisoryRunnerStatus: positive.advisory.envelope.payload.data.runnerStatus },
    invalidInvocationCount: invalids.length,
    negatives: Object.fromEntries(Object.entries(negatives).map(([key, value]) => [key, { status: value.status, classification: value.classification, runnerStatus: value.runnerStatus, packetCount: value.packetCount }])),
    inheritedSafetyCases: Object.keys(safety),
    regression: { r1Classification: regression.r1.errors[0].classification, foundationStatus: regression.foundation.status, siblingCount: regression.siblingCases.length },
    redaction: { hitCount: redaction.hitCount, sentinelSha256s: redaction.sentinelSha256s }
  };
  await writeJson(join(evidenceRoot, 'matrix-summary.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
}

await main();
