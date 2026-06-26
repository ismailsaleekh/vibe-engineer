import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { validateArtifactFile, validateArtifact, validateArtifactKind } from '@vibe-engineer/artifacts';
import { createInitialRunState, transitionNode, joinValidatedOutputs, inspectResumeState } from '@vibe-engineer/orchestration';
import { runVerificationPlan, EVIDENCE_FAILURE_CLASSIFICATIONS } from '@vibe-engineer/verification';

const targetRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const validationRoot = path.join(targetRoot, '.vibe/work/I-09A-verification-runner-core-evidence-routing/validation-evidence');
const witnessRoot = path.join(validationRoot, 'witness-runs');
const summaryPath = path.join(validationRoot, 'validation-witness-summary.json');
const packageRoot = path.join(targetRoot, 'packages/verification');
const approvedPlan = path.join(packageRoot, 'fixtures/plans/approved-plan.json');
const draftPlan = path.join(packageRoot, 'fixtures/plans/draft-plan.json');
const missingCategoryPlan = path.join(packageRoot, 'fixtures/plans/missing-category-plan.json');
const runnersDir = path.join(packageRoot, 'fixtures/runners');
const evidenceSchemaPath = path.join(targetRoot, 'packages/artifacts/schemas/evidence-packet.schema.json');
const schemaEnum = JSON.parse(fs.readFileSync(evidenceSchemaPath, 'utf8')).properties.failureDetails.properties.classification.enum;
const secretArg = 'SECRET_VALIDATION_ARG_VALUE_987654321';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
async function writeJson(file, data) { await fsp.mkdir(path.dirname(file), { recursive: true }); await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8'); return file; }
function sanitizeForSummary(value) {
  if (typeof value === 'string') return value.split(secretArg).join('<redacted-validation-secret>');
  if (Array.isArray(value)) return value.map(sanitizeForSummary);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeForSummary(v)]));
  return value;
}
function allFiles(root) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...allFiles(p)); else out.push(p);
  }
  return out;
}
function findRawSecret(root) {
  const hits = [];
  for (const file of allFiles(root)) {
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes(secretArg)) hits.push(path.relative(validationRoot, file));
  }
  return hits;
}
function packetFiles(result) { return (result.evidencePackets ?? []).map(String); }
function validatePackets(result) {
  const validated = [];
  for (const packet of packetFiles(result)) {
    const validation = validateArtifactFile(packet, { kind: 'evidence_packet' });
    assert.equal(validation.ok, true, `Evidence Packet failed validation: ${packet}`);
    validated.push(packet);
  }
  return validated;
}
function packetData(result) { return packetFiles(result).map(readJson); }
function findFailure(result, code) { return packetData(result).find((packet) => packet.failureDetails?.code === code); }
function cloneApprovedPlan() { return readJson(approvedPlan); }
async function planVariant(name, mutate) {
  const plan = cloneApprovedPlan();
  mutate(plan);
  const file = path.join(validationRoot, 'plans', `${name}.json`);
  await writeJson(file, plan);
  return file;
}
async function singleAddPlan(name, itemId = 'schema-validation') {
  return planVariant(name, (plan) => {
    for (const item of plan.verificationDelta.requiredItems) item.action = item.id === itemId ? 'add' : 'not_applicable';
  });
}
function commandSpec({ id = 'schema-validation', layer = 'schema_validation', script = 'pass-runner.mjs', out, blocking = true, evidenceClass = 'deterministic', args = null, safety = {}, extra = {} } = {}) {
  const scriptPath = path.join(runnersDir, script);
  const finalArgs = args ?? (out ? [scriptPath, out] : [scriptPath]);
  const argPaths = [];
  const scriptIndex = finalArgs.indexOf(scriptPath);
  if (scriptIndex >= 0) argPaths.push({ index: scriptIndex, root: 'projectRoot' });
  if (out) {
    const outIndex = finalArgs.indexOf(out);
    if (outIndex >= 0) argPaths.push({ index: outIndex, root: 'evidenceRoot' });
  }
  return {
    id,
    requiredItemIds: [id],
    layer,
    evidenceClass,
    blocking,
    kind: 'command',
    command: process.execPath,
    args: finalArgs,
    cwd: '.',
    expectedArtifacts: out ? [out] : [],
    argPaths,
    safety: {
      classification: 'local_deterministic_write',
      timeoutMs: 2000,
      maxStdoutBytes: 8192,
      maxStderrBytes: 8192,
      maxOutputBytes: 8192,
      allowedReadRoots: [targetRoot],
      allowedWriteRoots: [path.dirname(out ?? witnessRoot)],
      envAllowlist: [],
      passThroughEnv: false,
      cwdContainedInProjectRoot: true,
      expectedArtifactsContained: true,
      ...safety
    },
    ...extra
  };
}
function advisorySpec() { return commandSpec({ id: 'advisory-review', layer: 'advisory_review', script: 'fail-runner.mjs', out: null, blocking: false, evidenceClass: 'advisory', extra: { failureClassification: 'advisory_finding' } }); }
function catalogFor(dir) { return [commandSpec({ out: path.join(dir, 'schema-validation-output.json') }), advisorySpec()]; }
async function runCase(name, { plan = approvedPlan, catalog = null, runId = null, rerunOf = null } = {}) {
  const dir = path.join(witnessRoot, name);
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
  const result = await runVerificationPlan({ implementationPlanPath: plan, evidenceRoot: dir, projectRoot: targetRoot, runId: runId ?? `val-${name.replace(/[^a-z0-9]+/g, '-')}`, runnerCatalog: catalog ?? catalogFor(dir), ...(rerunOf ? { rerunOf } : {}) });
  await writeJson(path.join(dir, 'aggregate-result.json'), result);
  return { dir, result };
}
async function expectError(name, fn) {
  const dir = path.join(witnessRoot, name);
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
  try { await fn(dir); } catch (error) {
    const record = { name: error?.name, code: error?.code, message: error?.message, details: error?.details };
    await writeJson(path.join(dir, 'error.json'), sanitizeForSummary(record));
    return record;
  }
  throw new Error(`${name} expected a fail-closed error`);
}
function spawnNode(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd, env: {}, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr, cwd, argv: [process.execPath, ...args] }));
    child.on('error', (error) => resolve({ code: -1, signal: null, stdout, stderr: String(error), cwd, argv: [process.execPath, ...args] }));
  });
}

const summary = { statuses: {}, findings: [], witnesses: {}, packetValidation: {}, staticFindings: {} };
function record(name, status, details = {}) { summary.witnesses[name] = sanitizeForSummary({ status, ...details }); }
function finding(id, severity, summaryText, evidence = {}) { summary.findings.push(sanitizeForSummary({ id, severity, summary: summaryText, evidence })); }

async function wRb1P1P2() {
  const planValidation = validateArtifactFile(approvedPlan, { kind: 'implementation_plan' });
  assert.equal(planValidation.ok, true, 'approved plan must validate as implementation_plan');
  const { dir, result } = await runCase('w-rb1-p1-p2');
  const validated = validatePackets(result);
  const packets = packetData(result);
  assert.ok(['passed', 'advisory_warning'].includes(String(result.status)), 'positive aggregate must pass/advisory_warning');
  assert.ok(result.executedItems.includes('schema-validation'), 'schema-validation command runner executed');
  assert.ok(result.executedItems.includes('advisory-review'), 'advisory runner executed');
  assert.ok(result.recordedItems.includes('typecheck'), 'reuse recorded');
  assert.ok(packets.some((p) => p.result === 'skipped' && p.status === 'not_run'), 'reuse/not_applicable packets recorded as non-executed');
  record('W-RB1/P1/P2', 'PASS', { dir, status: result.status, packetCount: validated.length, executedItems: result.executedItems, recordedItems: result.recordedItems });
  return result;
}
async function wRb2(sourceResult) {
  const dir = path.join(witnessRoot, 'w-rb2'); await fsp.rm(dir, { recursive: true, force: true }); await fsp.mkdir(dir, { recursive: true });
  const packet = packetFiles(sourceResult)[0]; const packetJson = readJson(packet);
  const workPlan = { schemaVersion: 'orchestration-work-plan/1.0.0', runId: 'val-w-rb2', limits: { maxParallelAgents: 8, maxValidationFixIterations: 3, agenticWorkPackageTargetHours: 6 }, untouchablePaths: ['.git/**'], readOnlyPaths: ['packages/cli/**'], nodes: [
    { id: 'producer', title: 'producer', dependsOn: [], ownershipClaims: [], expectedOutputs: [], evidenceRefs: [], failureRouting: { status: 'none', hookRef: 'none', owner: 'validation', evidenceRefs: [] }, estimate: { agenticHours: 1, split: false } },
    { id: 'consumer', title: 'consumer', dependsOn: ['producer'], ownershipClaims: [], expectedOutputs: [], evidenceRefs: [], failureRouting: { status: 'none', hookRef: 'none', owner: 'validation', evidenceRefs: [] }, estimate: { agenticHours: 1, split: false } }
  ] };
  const planPath = await writeJson(path.join(dir, 'work-plan.json'), workPlan);
  const statePath = path.join(dir, 'state.json');
  createInitialRunState({ workPlanPath: planPath, statePath, now: '2026-06-25T00:00:00.000Z' });
  transitionNode({ statePath, nodeId: 'producer', status: 'validated', outputRefs: [{ artifactId: packetJson.artifactId, artifactKind: 'evidence_packet', path: packet, ownerNodeId: 'producer', status: 'validated', dirtyState: 'clean', evidenceRefs: [packet] }], now: '2026-06-25T00:00:01.000Z' });
  const join = joinValidatedOutputs({ statePath, plan: workPlan, consumerNodeId: 'consumer', now: '2026-06-25T00:00:02.000Z' });
  const resume = inspectResumeState({ statePath, plan: workPlan, now: '2026-06-25T00:00:03.000Z' });
  assert.ok(join.joinedArtifactIds.includes(packetJson.artifactId), 'join must include runner-produced packet');
  assert.ok(resume.resume.completedNodeIds.includes('producer'), 'resume must complete producer');
  transitionNode({ statePath, nodeId: 'producer', status: 'validated', outputRefs: [{ artifactId: 'missing-packet', artifactKind: 'evidence_packet', path: path.join(dir, 'missing.json'), ownerNodeId: 'producer', status: 'validated', dirtyState: 'clean', evidenceRefs: [] }], now: '2026-06-25T00:00:04.000Z' });
  const invalid = inspectResumeState({ statePath, plan: workPlan, now: '2026-06-25T00:00:05.000Z' });
  assert.ok(invalid.invalidations.length > 0, 'missing packet must invalidate resume');
  await writeJson(path.join(dir, 'result.json'), { join, resume, invalid });
  record('W-RB2/P3-consumer', 'PASS', { dir, joinedArtifactIds: join.joinedArtifactIds, invalidations: invalid.invalidations.length });
}
async function wRb25() {
  const dir = path.join(witnessRoot, 'w-rb2-5-public-api-handoff'); await fsp.rm(dir, { recursive: true, force: true }); await fsp.mkdir(dir, { recursive: true });
  const code = `
    import { runVerificationPlan, VERIFICATION_RUNNER_VERSION } from '@vibe-engineer/verification';
    import { validateArtifactFile } from '@vibe-engineer/artifacts';
    import fs from 'node:fs';
    import path from 'node:path';
    const result = await runVerificationPlan({ implementationPlanPath: ${JSON.stringify(approvedPlan)}, evidenceRoot: ${JSON.stringify(dir)}, projectRoot: ${JSON.stringify(targetRoot)}, runId: 'val-w-rb2-5', runnerCatalog: ${JSON.stringify(catalogFor(dir))} });
    for (const packet of result.evidencePackets) { const validation = validateArtifactFile(packet, { kind: 'evidence_packet' }); if (!validation.ok) throw new Error('packet validation failed'); }
    fs.writeFileSync(path.join(${JSON.stringify(dir)}, 'cli-context-result.json'), JSON.stringify({ version: VERIFICATION_RUNNER_VERSION, status: result.status, packetCount: result.evidencePackets.length }, null, 2));
  `;
  const child = await spawnNode(['--input-type=module', '-e', code], path.join(targetRoot, 'packages/cli'));
  await writeJson(path.join(dir, 'spawn-result.json'), child);
  assert.equal(child.code, 0, child.stderr);
  record('W-RB2.5', 'PASS', { dir, cwd: child.cwd, spawnExit: child.code });
}
async function p3(sourceResult) {
  const prior = readJson(packetFiles(sourceResult)[0]).artifactId;
  const { dir, result } = await runCase('p3-rerun-lineage', { runId: 'val-p3-rerun', rerunOf: prior });
  validatePackets(result);
  assert.ok(packetData(result).some((p) => p.rerunOf === prior), 'rerun packet must preserve rerunOf');
  await wRb2(result);
  record('P3', 'PASS', { dir, prior, packetCount: packetFiles(result).length });
}
async function negativeBasics() {
  await expectError('n1-draft-plan', (dir) => runVerificationPlan({ implementationPlanPath: draftPlan, evidenceRoot: dir, projectRoot: targetRoot, runId: 'val-n1', runnerCatalog: [commandSpec({ out: path.join(dir, 'sentinel.json') })] }));
  const n1Sentinel = path.join(witnessRoot, 'n1-draft-plan', 'sentinel.json');
  assert.equal(fs.existsSync(n1Sentinel), false, 'N1 sentinel proves no runner spawn/output');
  const singlePlan = await singleAddPlan('single-add-schema-validation');
  let r = await runCase('n2-missing-executable', { plan: singlePlan, runId: 'val-n2', catalog: [{ ...commandSpec({ out: null }), command: path.join(runnersDir, 'missing-executable'), args: [], argPaths: [], expectedArtifacts: [] }] }); validatePackets(r.result); assert.ok(findFailure(r.result, 'MISSING_RUNNER_OR_PREREQUISITE'));
  r = await runCase('n3-missing-evidence', { plan: singlePlan, runId: 'val-n3', catalog: [commandSpec({ script: 'no-artifact-runner.mjs', out: path.join(witnessRoot, 'n3-missing-evidence', 'missing-output.json') })] }); validatePackets(r.result); assert.ok(findFailure(r.result, 'MISSING_EVIDENCE'));
  await expectError('n4-missing-category-plan', (dir) => runVerificationPlan({ implementationPlanPath: missingCategoryPlan, evidenceRoot: dir, projectRoot: targetRoot, runId: 'val-n4', runnerCatalog: [] }));
  r = await runCase('n5-malformed-candidate', { plan: singlePlan, runId: 'val-n5', catalog: [{ id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, kind: 'validator', validator: 'malformedEvidencePacketCandidate' }] }); validatePackets(r.result); assert.ok(findFailure(r.result, 'MALFORMED_EVIDENCE_PACKET'));
  r = await runCase('n6-internal-error', { plan: singlePlan, runId: 'val-n6', catalog: [{ id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, kind: 'validator', validator: 'throwInternalError' }] }); validatePackets(r.result); assert.ok(findFailure(r.result, 'RUNNER_INTERNAL_ERROR'));
  const advisoryPlan = await singleAddPlan('advisory-only', 'advisory-review');
  r = await runCase('n7-advisory-only', { plan: advisoryPlan, runId: 'val-n7', catalog: [advisorySpec()] }); validatePackets(r.result); assert.equal(r.result.status, 'advisory_warning'); assert.equal(r.result.blockedItems.length, 0);
  record('N1-N7', 'PASS', { n1NoSentinel: !fs.existsSync(n1Sentinel) });
}
async function policyAndPathNegatives() {
  const plan = await singleAddPlan('policy-single-add');
  const cases = [
    ['missing-classification', commandSpec({ out: path.join(witnessRoot, 'n8/missing-classification/out.json'), safety: { classification: undefined } }), 'COMMAND_POLICY_DENIED'],
    ['unknown-classification', commandSpec({ out: path.join(witnessRoot, 'n8/unknown-classification/out.json'), safety: { classification: 'mystery' } }), 'COMMAND_POLICY_DENIED'],
    ['shell-true', commandSpec({ out: path.join(witnessRoot, 'n8/shell-true/out.json'), extra: { shell: true } }), 'COMMAND_POLICY_DENIED'],
    ['package-manager', commandSpec({ out: null, extra: { command: 'pnpm', args: ['install'], argPaths: [], expectedArtifacts: [] } }), 'COMMAND_POLICY_DENIED'],
    ['git', commandSpec({ out: null, extra: { command: 'git', args: ['status'], argPaths: [], expectedArtifacts: [] } }), 'COMMAND_POLICY_DENIED'],
    ['rm', commandSpec({ out: null, extra: { command: 'rm', args: ['-rf', path.join(validationRoot, 'never')], argPaths: [], expectedArtifacts: [] } }), 'COMMAND_POLICY_DENIED'],
    ['curl-network', commandSpec({ out: null, extra: { command: 'curl', args: ['https://example.invalid'], argPaths: [], expectedArtifacts: [] } }), 'COMMAND_POLICY_DENIED'],
    ['production-impacting-classification', commandSpec({ out: path.join(witnessRoot, 'n8/prod/out.json'), safety: { classification: 'production_impacting' } }), 'COMMAND_POLICY_DENIED'],
    ['shell-string-command', commandSpec({ out: null, extra: { command: 'node -e "x"', args: [], argPaths: [], expectedArtifacts: [] } }), 'COMMAND_POLICY_DENIED'],
    ['cwd-escape', { ...commandSpec({ out: null, extra: { args: ['-e', 'process.exit(0)'], argPaths: [], expectedArtifacts: [] } }), cwd: '..' }, 'UNSAFE_CWD'],
    ['protected-artifact-root-package', commandSpec({ out: null, extra: { args: ['-e', 'process.exit(0)'], argPaths: [], expectedArtifacts: [path.join(targetRoot, 'package.json')] } }), 'UNSAFE_PATH'],
    ['protected-artifact-cli-source', commandSpec({ out: null, extra: { args: ['-e', 'process.exit(0)'], argPaths: [], expectedArtifacts: [path.join(targetRoot, 'packages/cli/src/entry/vibe-engineer.js')] } }), 'UNSAFE_PATH'],
    ['protected-artifact-artifacts-package', commandSpec({ out: null, extra: { args: ['-e', 'process.exit(0)'], argPaths: [], expectedArtifacts: [path.join(targetRoot, 'packages/artifacts/package.json')] } }), 'UNSAFE_PATH'],
    ['raw-env-pass-through', commandSpec({ out: path.join(witnessRoot, 'n10/raw-env/out.json'), safety: { passThroughEnv: true } }), 'ENVIRONMENT_POLICY_DENIED'],
    ['secret-env-key', { ...commandSpec({ out: null, extra: { args: ['-e', 'process.exit(0)'], argPaths: [], expectedArtifacts: [] } }), env: { API_TOKEN: 'placeholder' }, safety: { ...commandSpec({ out: null }).safety, envAllowlist: ['API_TOKEN'] } }, 'ENVIRONMENT_POLICY_DENIED'],
  ];
  const caseResults = [];
  for (const [name, spec, expectedCode] of cases) {
    const { dir, result } = await runCase(`policy-path-env/${name}`, { plan, runId: `val-${name.replace(/[^a-z0-9]+/g, '-')}`, catalog: [spec] });
    validatePackets(result);
    const failure = findFailure(result, expectedCode);
    if (!failure) finding(`policy-${name}`, 'major-local', `Expected ${expectedCode} but runner did not produce that blocked failure.`, { dir, status: result.status, failures: result.failures });
    else assert.equal(failure.failureDetails.classification, 'safety_or_security_policy_failure');
    caseResults.push({ name, expectedCode, status: result.status, matched: Boolean(failure) });
  }
  const unknownSpec = commandSpec({ out: null, extra: { args: ['-e', 'process.exit(0)'], argPaths: [], expectedArtifacts: [] } });
  const unknown = await runCase('policy-path-env/unknown-side-effect-node-eval', { plan, runId: 'val-unknown-side-effect', catalog: [unknownSpec] });
  validatePackets(unknown.result);
  const unknownFailure = findFailure(unknown.result, 'COMMAND_POLICY_DENIED');
  if (!unknownFailure && unknown.result.status === 'passed') finding('F-MAJOR-DL22-DEFAULT-DENY', 'major-local', 'Unknown arbitrary node -e command with local_deterministic_write classification and no typed script/arg paths was spawned and passed instead of being denied before spawn.', { dir: unknown.dir, aggregateStatus: unknown.result.status, evidencePackets: unknown.result.evidencePackets });

  const symlinkDir = path.join(witnessRoot, 'policy-path-env/symlink-escape');
  await fsp.mkdir(symlinkDir, { recursive: true });
  const symlinkPath = path.join(symlinkDir, 'package-json-link');
  await fsp.rm(symlinkPath, { force: true });
  await fsp.symlink(path.join(targetRoot, 'package.json'), symlinkPath);
  const symlinkSpec = commandSpec({ out: null, extra: { args: ['-e', 'process.exit(0)'], argPaths: [], expectedArtifacts: [symlinkPath] } });
  const symlink = await runCase('policy-path-env/symlink-escape-run', { plan, runId: 'val-symlink-escape', catalog: [symlinkSpec] });
  validatePackets(symlink.result);
  if (!findFailure(symlink.result, 'UNSAFE_PATH') && symlink.result.status === 'passed') finding('F-MAJOR-PATH-SYMLINK-ESCAPE', 'major-local', 'Expected artifact symlink inside evidenceRoot pointing to root package.json was accepted and passed; expected-artifact containment does not canonicalize realpath for symlink escape.', { dir: symlink.dir, symlink: path.relative(validationRoot, symlinkPath), aggregateStatus: symlink.result.status });
  record('N8/N9/N10-policy-path-env', 'COMPLETED', { cases: caseResults });
}
async function capsAndSchema() {
  const plan = await singleAddPlan('caps-single-add');
  let r = await runCase('n11-timeout', { plan, runId: 'val-n11-timeout', catalog: [commandSpec({ script: 'sleep-runner.mjs', out: null, args: [path.join(runnersDir, 'sleep-runner.mjs'), '2000'], safety: { timeoutMs: 100 }, extra: { expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] } })] }); validatePackets(r.result); assert.ok(findFailure(r.result, 'COMMAND_TIMEOUT'));
  r = await runCase('n12-stdout-cap', { plan, runId: 'val-n12-stdout', catalog: [commandSpec({ script: 'large-output-runner.mjs', out: null, args: [path.join(runnersDir, 'large-output-runner.mjs'), 'stdout', '4096'], safety: { maxStdoutBytes: 64 }, extra: { expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] } })] }); validatePackets(r.result); assert.ok(findFailure(r.result, 'STDOUT_LIMIT_EXCEEDED'));
  r = await runCase('n12-stderr-cap', { plan, runId: 'val-n12-stderr', catalog: [commandSpec({ script: 'large-output-runner.mjs', out: null, args: [path.join(runnersDir, 'large-output-runner.mjs'), 'stderr', '4096'], safety: { maxStderrBytes: 64 }, extra: { expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] } })] }); validatePackets(r.result); assert.ok(findFailure(r.result, 'STDERR_LIMIT_EXCEEDED'));
  r = await runCase('n12-artifact-cap', { plan, runId: 'val-n12-artifact', catalog: [commandSpec({ script: 'large-artifact-runner.mjs', out: path.join(witnessRoot, 'n12-artifact-cap/out.txt'), args: [path.join(runnersDir, 'large-artifact-runner.mjs'), path.join(witnessRoot, 'n12-artifact-cap/out.txt'), '4096'], safety: { maxOutputBytes: 64 } })] }); validatePackets(r.result); assert.ok(findFailure(r.result, 'ARTIFACT_LIMIT_EXCEEDED'));
  const bad = readJson(path.join(targetRoot, 'packages/artifacts/fixtures/valid/evidence_packet.json'));
  bad.artifactId = 'validation-bad-classification'; bad.result = 'blocked'; bad.status = 'blocked'; bad.failureDetails = { code: 'BAD', message: 'bad classification', classification: 'resource_limit_exceeded' };
  const badValidation = validateArtifact(bad);
  assert.equal(badValidation.ok, false, 'non-enum classification must be rejected');
  await writeJson(path.join(witnessRoot, 'n13-schema-classification', 'non-enum-rejection.json'), { ok: badValidation.ok, errorCount: badValidation.errors?.length ?? 0 });
  record('N11/N12/N13', 'PASS', { nonEnumRejected: !badValidation.ok });
}
async function redactionRegression() {
  const plan = await singleAddPlan('redaction-single-add');
  const dir = path.join(witnessRoot, 'r3-secret-argv-leak');
  const out = path.join(dir, 'out.json');
  const spec = commandSpec({ out, args: [path.join(runnersDir, 'pass-runner.mjs'), out, '--api-key', secretArg] });
  const run = await runCase('r3-secret-argv-leak', { plan, runId: 'val-r3-secret-argv', catalog: [spec] });
  validatePackets(run.result);
  const hits = findRawSecret(run.dir);
  if (hits.length > 0) finding('F-CRITICAL-SECRET-ARGV-LEAK', 'critical', 'Secret-like argv value was persisted raw in runner Evidence Packet and/or sidecar output instead of being denied or redacted.', { dir: run.dir, hitCount: hits.length, hitPaths: hits });
  record('R3-secret-argv', hits.length === 0 ? 'PASS' : 'FAIL', { dir: run.dir, rawSecretHitCount: hits.length, hitPaths: hits });
}
async function evidencePacketSweep() {
  const files = allFiles(witnessRoot).filter((file) => file.endsWith('.json'));
  const packetFiles = [];
  const validationErrors = [];
  const classifications = {};
  const codes = {};
  const dl22CodeAsClassification = [];
  const nonEnum = [];
  for (const file of files) {
    let data;
    try { data = readJson(file); } catch { continue; }
    if (data?.artifactKind !== 'evidence_packet') continue;
    packetFiles.push(file);
    const validation = validateArtifactFile(file, { kind: 'evidence_packet' });
    if (!validation.ok) validationErrors.push({ file: path.relative(validationRoot, file), errors: validation.errors });
    const cls = data.failureDetails?.classification;
    if (cls) {
      classifications[cls] = (classifications[cls] ?? 0) + 1;
      if (!schemaEnum.includes(cls)) nonEnum.push({ file: path.relative(validationRoot, file), classification: cls });
    }
    const code = data.failureDetails?.code;
    if (code) {
      codes[code] = (codes[code] ?? 0) + 1;
      if (['RESOURCE_LIMIT_EXCEEDED','COMMAND_TIMEOUT','STDOUT_LIMIT_EXCEEDED','STDERR_LIMIT_EXCEEDED','OUTPUT_LIMIT_EXCEEDED','ARTIFACT_LIMIT_EXCEEDED','COMMAND_POLICY_DENIED'].includes(code) && cls === code) dl22CodeAsClassification.push({ file: path.relative(validationRoot, file), code });
    }
  }
  summary.packetValidation = { packetCount: packetFiles.length, validationErrors, classifications, codes, nonEnum, dl22CodeAsClassification };
  if (validationErrors.length > 0 || nonEnum.length > 0 || dl22CodeAsClassification.length > 0) finding('F-CRITICAL-EVIDENCE-SCHEMA', 'critical', 'Evidence Packet schema/classification sweep found invalid packets or non-enum classifications.', summary.packetValidation);
  await writeJson(path.join(validationRoot, 'evidence-packet-validation-sweep.json'), summary.packetValidation);
}
async function staticChecks() {
  const testText = fs.readFileSync(path.join(packageRoot, 'tests/run-witnesses.mjs'), 'utf8');
  const indexText = fs.readFileSync(path.join(packageRoot, 'src/index.js'), 'utf8');
  const hardcodedEvidence = testText.includes("const evidenceRoot = path.join(workRoot, 'evidence')");
  const tsNoCheck = testText.startsWith('// @ts-nocheck');
  const usesSpawnShellFalse = indexText.includes("spawn(command, args, { cwd, env: envResult.env, shell: false");
  const usesArtifactValidator = indexText.includes("validateArtifactFile(implementationPlanPath, { kind: 'implementation_plan' })") && indexText.includes("validateArtifactFile(tempPath, { kind: 'evidence_packet' })");
  const usesProcessEnvWholesale = /process\.env/.test(indexText);
  summary.staticFindings = { hardcodedEvidence, tsNoCheck, usesSpawnShellFalse, usesArtifactValidator, usesProcessEnvWholesale };
  if (hardcodedEvidence) finding('F-MAJOR-WITNESS-SUITE-NOT-VALIDATION-SAFE', 'major-local', 'Existing witness suite hardcodes implementer evidence/** under the I-09A work root and cannot be redirected to validation-evidence; validator must not rerun it without overwriting read-only implementation evidence.', { file: 'packages/verification/tests/run-witnesses.mjs' });
  if (tsNoCheck) finding('F-MAJOR-TYPECHECK-WEAKENED-BY-TS-NOCHECK', 'major-local', 'Witness entrypoint begins with // @ts-nocheck, so strict checkJs evidence does not actually typecheck the largest witness file.', { file: 'packages/verification/tests/run-witnesses.mjs' });
}

await fsp.rm(witnessRoot, { recursive: true, force: true });
await fsp.mkdir(witnessRoot, { recursive: true });
await staticChecks();
const sourceResult = await wRb1P1P2();
await wRb2(sourceResult);
await wRb25();
await p3(sourceResult);
await negativeBasics();
await policyAndPathNegatives();
await capsAndSchema();
await redactionRegression();
await evidencePacketSweep();
summary.statuses.overall = summary.findings.some((f) => f.severity === 'critical') ? 'NEEDS-FIX' : summary.findings.some((f) => f.severity === 'major-local') ? 'NEEDS-FIX' : 'PASS';
await writeJson(summaryPath, summary);
console.log(JSON.stringify({ ok: true, summaryPath, verdict: summary.statuses.overall, findingCount: summary.findings.length, packetCount: summary.packetValidation.packetCount }, null, 2));
