// @ts-check
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { validateArtifactFile, validateArtifact } from '@vibe-engineer/artifacts';
import { createInitialRunState, transitionNode, joinValidatedOutputs, inspectResumeState } from '@vibe-engineer/orchestration';
import { runVerificationPlan, EVIDENCE_FAILURE_CLASSIFICATIONS } from '@vibe-engineer/verification';

/** @typedef {Record<string, any>} AnyRecord */
/** @typedef {{ id?: string, layer?: string, script?: string, out?: string|null, blocking?: boolean, evidenceClass?: string, args?: string[]|null, safety?: AnyRecord, extra?: AnyRecord, publicArgs?: AnyRecord[], scalarArgs?: AnyRecord[] }} CommandSpecOptions */
/** @typedef {{ code: number|null, stdout: string, stderr: string, cwd: string, argv: string[] }} SpawnResult */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const packageRoot = path.join(repoRoot, 'packages/verification');
const workRoot = path.join(repoRoot, '.vibe/work/I-09A-verification-runner-core-evidence-routing');
const evidenceRoot = resolveEvidenceRoot();
const approvedPlan = path.join(packageRoot, 'fixtures/plans/approved-plan.json');
const draftPlan = path.join(packageRoot, 'fixtures/plans/draft-plan.json');
const missingCategoryPlan = path.join(packageRoot, 'fixtures/plans/missing-category-plan.json');
const runnersDir = path.join(packageRoot, 'fixtures/runners');

/** @returns {string} */
function resolveEvidenceRoot() {
  const cliIndex = process.argv.indexOf('--evidence-root');
  const cliValue = cliIndex >= 0 ? process.argv[cliIndex + 1] : '';
  const configured = cliValue || process.env.VIBE_VERIFICATION_WITNESS_EVIDENCE_ROOT || '';
  if (configured) return path.resolve(configured);
  const stamp = new Date().toISOString().replace(/[^0-9A-Za-z]+/g, '-').replace(/-$/, '');
  return path.join(workRoot, 'evidence-reruns', stamp);
}

/** @param {string} file @returns {AnyRecord} */
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
/** @param {string} file @param {unknown} data @returns {Promise<string>} */
async function writeJson(file, data) { await fsp.mkdir(path.dirname(file), { recursive: true }); await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8'); return file; }
/** @param {string} text @param {string} label @returns {void} */
function assertNoSecretText(text, label) { assert.equal(/SECRET_[A-Z0-9_]+|Bearer\s+SECRET|password=SECRET|token=SECRET|api-key\s+SECRET|client-secret=SECRET/.test(text), false, `${label} leaked secret-like data`); }
/** @param {string} root @returns {Promise<void>} */
async function assertNoSecretsInTree(root) { for (const file of walkFiles(root)) assertNoSecretText(await fsp.readFile(file, 'utf8'), file); }
/** @param {string} dir @returns {Generator<string>} */
function* walkFiles(dir) { if (!fs.existsSync(dir)) return; for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, entry.name); if (entry.isDirectory()) yield* walkFiles(p); else yield p; } }
/** @param {AnyRecord} result @returns {string[]} */
function packetFiles(result) { return result.evidencePackets.map(String); }
/** @param {AnyRecord} result @returns {void} */
function validatePackets(result) { for (const packet of packetFiles(result)) { const v = validateArtifactFile(packet, { kind: 'evidence_packet' }); assert.equal(v.ok, true, `${packet} must validate`); } }
/** @param {AnyRecord} result @returns {AnyRecord[]} */
function packetData(result) { return packetFiles(result).map(readJson); }
/** @param {AnyRecord} result @param {string} code @returns {AnyRecord|undefined} */
function findFailure(result, code) { return packetData(result).find((packet) => packet.failureDetails?.code === code); }
/** @param {number} index @param {string} value @returns {{index:number,value:string}} */
function publicArg(index, value) { return { index, value }; }
/** @param {number} index @param {string} kind @returns {{index:number,kind:string}} */
function scalarArg(index, kind) { return { index, kind }; }

/** @param {CommandSpecOptions} [options] @returns {AnyRecord} */
function commandSpec(options = {}) {
  const { id = 'schema-validation', layer = 'schema_validation', script = 'pass-runner.mjs', out = undefined, blocking = true, evidenceClass = 'deterministic', args = null, safety = {}, extra = {}, publicArgs = [], scalarArgs = [] } = options;
  const scriptPath = path.join(runnersDir, script);
  const finalArgs = args ?? (out ? [scriptPath, out] : [scriptPath]);
  /** @type {AnyRecord[]} */
  const argPaths = [];
  if (finalArgs.includes(scriptPath)) argPaths.push({ index: finalArgs.indexOf(scriptPath), root: 'projectRoot' });
  if (out && finalArgs.includes(out)) argPaths.push({ index: finalArgs.indexOf(out), root: 'evidenceRoot' });
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
    publicArgs,
    scalarArgs,
    safety: {
      classification: 'local_deterministic_write',
      timeoutMs: 2000,
      maxStdoutBytes: 8192,
      maxStderrBytes: 8192,
      maxOutputBytes: 8192,
      allowedReadRoots: [repoRoot],
      allowedWriteRoots: [path.dirname(out ?? evidenceRoot)],
      envAllowlist: [],
      passThroughEnv: false,
      cwdContainedInProjectRoot: true,
      expectedArtifactsContained: true,
      ...safety
    },
    ...extra
  };
}
/** @param {{id?: string}} [options] @returns {AnyRecord} */
function advisorySpec({ id = 'advisory-review' } = {}) { return commandSpec({ id, layer: 'advisory_review', script: 'fail-runner.mjs', out: null, blocking: false, evidenceClass: 'advisory', extra: { failureClassification: 'advisory_finding' } }); }
/** @param {string} dir @returns {AnyRecord[]} */
function catalogFor(dir) { return [commandSpec({ out: path.join(dir, 'schema-validation-output.json') }), advisorySpec()]; }
/** @param {string} caseName @param {AnyRecord} [options] @returns {Promise<{dir:string,result:AnyRecord}>} */
async function runCase(caseName, options = {}) {
  const dir = path.join(evidenceRoot, caseName);
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
  const result = await runVerificationPlan({ implementationPlanPath: options.plan ?? approvedPlan, evidenceRoot: dir, projectRoot: repoRoot, runId: options.runId ?? `i09a-${caseName.replaceAll('_','-').replaceAll('/','-')}`, runnerCatalog: options.catalog ?? catalogFor(dir), ...(options.rerunOf ? { rerunOf: options.rerunOf } : {}) });
  await writeJson(path.join(dir, 'aggregate-result.json'), result);
  return { dir, result };
}
/** @param {string} caseName @param {() => Promise<unknown>} fn @returns {Promise<any>} */
async function expectError(caseName, fn) { try { await fn(); } catch (error) { const caught = /** @type {any} */ (error); await writeJson(path.join(evidenceRoot, caseName, 'error.json'), { name: caught.name, code: caught.code, message: caught.message, details: caught.details }); return caught; } throw new Error(`${caseName} expected error`); }
/** @returns {AnyRecord} */
function clonePlan() { return readJson(approvedPlan); }
/** @param {string} caseName @param {(plan:AnyRecord) => void} mutate @returns {Promise<string>} */
async function planVariant(caseName, mutate) { const plan = clonePlan(); mutate(plan); const file = path.join(evidenceRoot, `${caseName}-plan`, 'plan.json'); await writeJson(file, plan); return file; }

/** @returns {Promise<AnyRecord>} */
async function wRb1P1P2() {
  const { result } = await runCase('w-rb1');
  validatePackets(result);
  assert.match(result.status, /^(passed|advisory_warning)$/);
  assert.ok(result.executedItems.includes('schema-validation'));
  assert.ok(result.executedItems.includes('advisory-review'));
  assert.ok(result.recordedItems.includes('typecheck'));
  const packets = packetData(result);
  assert.ok(packets.some((p) => p.result === 'skipped' && p.status === 'not_run'));
  await writeJson(path.join(evidenceRoot, 'p1', 'result.json'), result);
  await writeJson(path.join(evidenceRoot, 'p2', 'result.json'), { recordedItems: result.recordedItems, skippedPackets: packets.filter((p) => p.result === 'skipped').map((p) => p.artifactId) });
  return result;
}
/** @param {AnyRecord} sourceResult @returns {Promise<void>} */
async function wRb2(sourceResult) {
  const dir = path.join(evidenceRoot, 'w-rb2'); await fsp.mkdir(dir, { recursive: true });
  const packetCandidate = packetFiles(sourceResult)[0];
  if (!packetCandidate) throw new Error('W-RB2 requires at least one source packet.');
  const packet = packetCandidate;
  const packetJson = readJson(packet);
  const workPlan = /** @type {any} */ ({ schemaVersion: 'orchestration-work-plan/1.0.0', runId: 'i09a-w-rb2', limits: { maxParallelAgents: 8, maxValidationFixIterations: 3, agenticWorkPackageTargetHours: 6 }, untouchablePaths: ['.git/**'], readOnlyPaths: ['packages/cli/**'], nodes: [
    { id: 'producer', title: 'producer', dependsOn: [], ownershipClaims: [], expectedOutputs: [], evidenceRefs: [], failureRouting: { status: 'none', hookRef: 'none', owner: 'i09a', evidenceRefs: [] }, estimate: { agenticHours: 1, split: false } },
    { id: 'consumer', title: 'consumer', dependsOn: ['producer'], ownershipClaims: [], expectedOutputs: [], evidenceRefs: [], failureRouting: { status: 'none', hookRef: 'none', owner: 'i09a', evidenceRefs: [] }, estimate: { agenticHours: 1, split: false } }
  ] });
  const planPath = await writeJson(path.join(dir, 'work-plan.json'), workPlan); const statePath = path.join(dir, 'state.json');
  createInitialRunState({ workPlanPath: planPath, statePath, now: '2026-06-25T00:00:00.000Z' });
  transitionNode({ statePath, nodeId: 'producer', status: 'validated', outputRefs: [{ artifactId: packetJson.artifactId, artifactKind: 'evidence_packet', path: packet, ownerNodeId: 'producer', status: 'validated', dirtyState: 'clean', evidenceRefs: [packet] }], now: '2026-06-25T00:00:01.000Z' });
  const join = joinValidatedOutputs({ statePath, plan: workPlan, consumerNodeId: 'consumer', now: '2026-06-25T00:00:02.000Z' });
  const resume = inspectResumeState({ statePath, plan: workPlan, now: '2026-06-25T00:00:03.000Z' });
  assert.ok(join.joinedArtifactIds.includes(packetJson.artifactId)); assert.ok(resume.resume.completedNodeIds.includes('producer'));
  transitionNode({ statePath, nodeId: 'producer', status: 'validated', outputRefs: [{ artifactId: 'missing-packet', artifactKind: 'evidence_packet', path: path.join(dir, 'missing.json'), ownerNodeId: 'producer', status: 'validated', dirtyState: 'clean', evidenceRefs: [] }], now: '2026-06-25T00:00:04.000Z' });
  const invalid = inspectResumeState({ statePath, plan: workPlan, now: '2026-06-25T00:00:05.000Z' }); assert.ok(invalid.invalidations.length > 0);
  await writeJson(path.join(dir, 'result.json'), { join, resume, invalid });
}
/** @returns {Promise<void>} */
async function wRb25() {
  const dir = path.join(evidenceRoot, 'w-rb2-5-public-api-handoff'); await fsp.mkdir(dir, { recursive: true });
  const childCode = `
    import { runVerificationPlan, VERIFICATION_RUNNER_VERSION } from '@vibe-engineer/verification';
    import { validateArtifactFile } from '@vibe-engineer/artifacts';
    import fs from 'node:fs';
    import path from 'node:path';
    const result = await runVerificationPlan({ implementationPlanPath: ${JSON.stringify(approvedPlan)}, evidenceRoot: ${JSON.stringify(dir)}, projectRoot: ${JSON.stringify(repoRoot)}, runId: 'i09a-w-rb2-5', runnerCatalog: ${JSON.stringify(catalogFor(dir))} });
    for (const packet of result.evidencePackets) { const v = validateArtifactFile(packet,{kind:'evidence_packet'}); if (!v.ok) throw new Error('packet validation failed'); }
    fs.writeFileSync(path.join(${JSON.stringify(dir)}, 'cli-context-result.json'), JSON.stringify({ version: VERIFICATION_RUNNER_VERSION, result }, null, 2));
  `;
  const run = await spawnNode(['--input-type=module', '-e', childCode], path.join(repoRoot, 'packages/cli'));
  await writeJson(path.join(dir, 'spawn-result.json'), run);
  assert.equal(run.code, 0, run.stderr);
}
/** @param {string[]} args @param {string} cwd @returns {Promise<SpawnResult>} */
function spawnNode(args, cwd) { return new Promise((resolve) => { const child = spawn(process.execPath, args, { cwd, env: {}, shell: false }); let stdout=''; let stderr=''; child.stdout.on('data', /** @param {unknown} c */ (c) => { stdout += String(c); }); child.stderr.on('data', /** @param {unknown} c */ (c) => { stderr += String(c); }); child.on('close', /** @param {number|null} code */ (code) => resolve({ code, stdout, stderr, cwd, argv: [process.execPath, ...args] })); }); }

/** @param {AnyRecord} sourceResult @returns {Promise<void>} */
async function p3(sourceResult) {
  const priorPacket = packetFiles(sourceResult)[0];
  if (!priorPacket) throw new Error('P3 requires at least one prior packet.');
  const prior = readJson(priorPacket).artifactId;
  const { result } = await runCase('p3', { runId: 'i09a-p3-rerun', rerunOf: prior }); validatePackets(result);
  assert.ok(packetData(result).some((p) => p.rerunOf === prior));
  await writeJson(path.join(evidenceRoot, 'p3', 'result.json'), { prior, result });
}
/** @returns {Promise<void>} */
async function negatives() {
  await fsp.mkdir(path.join(evidenceRoot, 'n1'), { recursive: true });
  const sentinel = path.join(evidenceRoot, 'n1', 'sentinel.json');
  await expectError('n1', () => runVerificationPlan({ implementationPlanPath: draftPlan, evidenceRoot: path.join(evidenceRoot, 'n1'), projectRoot: repoRoot, runId: 'i09a-n1', runnerCatalog: [commandSpec({ out: sentinel })] }));
  assert.equal(fs.existsSync(sentinel), false);
  let r = await runCase('n2', { catalog: [{ ...commandSpec({ out: null }), command: path.join(runnersDir, 'missing-executable'), args: [], argPaths: [], expectedArtifacts: [] }] }); validatePackets(r.result); assert.ok(findFailure(r.result, 'COMMAND_POLICY_DENIED'));
  r = await runCase('n3', { catalog: [commandSpec({ script: 'no-artifact-runner.mjs', out: path.join(evidenceRoot, 'n3', 'missing-output.json') })] }); assert.ok(findFailure(r.result, 'MISSING_EVIDENCE'));
  await fsp.mkdir(path.join(evidenceRoot, 'n4'), { recursive: true }); await expectError('n4', () => runVerificationPlan({ implementationPlanPath: missingCategoryPlan, evidenceRoot: path.join(evidenceRoot, 'n4'), projectRoot: repoRoot, runId: 'i09a-n4', runnerCatalog: [] }));
  r = await runCase('n5', { catalog: [{ id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, kind: 'validator', validator: 'malformedEvidencePacketCandidate' }] }); assert.ok(findFailure(r.result, 'MALFORMED_EVIDENCE_PACKET'));
  r = await runCase('n6', { catalog: [{ id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, kind: 'validator', validator: 'throwInternalError' }] }); assert.ok(findFailure(r.result, 'RUNNER_INTERNAL_ERROR'));
  const n7Plan = await planVariant('n7', (plan) => { for (const item of plan.verificationDelta.requiredItems) item.action = item.layer === 'advisory_review' ? 'add' : 'not_applicable'; });
  r = await runCase('n7', { plan: n7Plan, catalog: [advisorySpec()] }); validatePackets(r.result); assert.equal(r.result.status, 'advisory_warning'); assert.equal(r.result.blockedItems.length, 0);
}
/** @returns {Promise<void>} */
async function safetyNegatives() {
  const cases = [
    { name: 'missing-classification', spec: commandSpec({ out: path.join(evidenceRoot, 'n8-command-policy/missing-classification/out.json'), safety: { classification: undefined } }) },
    { name: 'shell-true', spec: commandSpec({ out: path.join(evidenceRoot, 'n8-command-policy/shell-true/out.json'), extra: { shell: true } }) },
    { name: 'package-manager', spec: { ...commandSpec({ out: null }), command: 'pnpm', args: ['install'], argPaths: [], publicArgs: [publicArg(0, 'install')], expectedArtifacts: [] } },
    { name: 'git', spec: { ...commandSpec({ out: null }), command: 'git', args: ['status'], argPaths: [], publicArgs: [publicArg(0, 'status')], expectedArtifacts: [] } },
    { name: 'shell-string', spec: { ...commandSpec({ out: null }), command: 'node -e "x"', args: [], argPaths: [], expectedArtifacts: [] } },
    { name: 'node-eval', spec: { ...commandSpec({ out: null }), args: ['-e', 'console.log(1)'], argPaths: [], publicArgs: [publicArg(1, 'console.log(1)')], expectedArtifacts: [] } },
    { name: 'secret-argv', spec: { ...commandSpec({ out: null }), args: [path.join(runnersDir, 'pass-runner.mjs'), 'SECRET_ARGV_VALUE'], argPaths: [{ index: 0, root: 'projectRoot' }], scalarArgs: [scalarArg(1, 'public_literal')], expectedArtifacts: [] } },
    { name: 'unknown-side-effect-touch', spec: { ...commandSpec({ out: null }), command: 'touch', args: [path.join(evidenceRoot, 'n8-command-policy/unknown-side-effect-touch/sentinel')], argPaths: [{ index: 0, root: 'evidenceRoot' }], expectedArtifacts: [] } },
    { name: 'unknown-non-node-executable', spec: { ...commandSpec({ out: null }), command: '/usr/bin/true', args: [], argPaths: [], expectedArtifacts: [] } }
  ];
  /** @type {AnyRecord[]} */ const results=[];
  for (const entry of cases) { const r = await runCase(`n8-command-policy/${entry.name}`, { runId: `i09a-n8-${entry.name}`, catalog: [entry.spec] }); validatePackets(r.result); const p = findFailure(r.result, 'COMMAND_POLICY_DENIED') || findFailure(r.result, 'UNSAFE_PATH'); assert.ok(p, entry.name); const failure = /** @type {AnyRecord} */ (p); assert.equal(failure.failureDetails.classification, 'safety_or_security_policy_failure'); results.push(r.result); }
  await writeJson(path.join(evidenceRoot, 'n8-command-policy', 'summary.json'), results);
}
/** @returns {Promise<void>} */
async function pathEnvCaps() {
  let r = await runCase('n9-path-containment/cwd-escape', { runId: 'i09a-n9-cwd', catalog: [{ ...commandSpec({ out: path.join(evidenceRoot, 'n9-path-containment/cwd-escape/out.json') }), cwd: '..' }] }); assert.ok(findFailure(r.result, 'UNSAFE_CWD'));
  r = await runCase('n9-path-containment/protected-artifact', { runId: 'i09a-n9-artifact', catalog: [commandSpec({ out: path.join(repoRoot, 'package.json') })] }); assert.ok(findFailure(r.result, 'UNSAFE_PATH'));
  const symlinkCaseDir = path.join(evidenceRoot, 'n9-path-containment/symlink-escape'); await fsp.mkdir(symlinkCaseDir, { recursive: true }); const symlinkPath = path.join(symlinkCaseDir, 'package-json-link'); await fsp.rm(symlinkPath, { force: true }); await fsp.symlink(path.join(repoRoot, 'package.json'), symlinkPath);
  r = await runCase('n9-path-containment/symlink-escape-run', { runId: 'i09a-n9-symlink', catalog: [commandSpec({ out: symlinkPath })] }); assert.ok(findFailure(r.result, 'UNSAFE_PATH'));
  r = await runCase('n10-env-redaction/pass-through', { runId: 'i09a-n10-env', catalog: [{ ...commandSpec({ out: path.join(evidenceRoot, 'n10-env-redaction/pass-through/out.json') }), safety: { ...commandSpec({ out: path.join(evidenceRoot, 'n10-env-redaction/pass-through/out.json') }).safety, passThroughEnv: true } }] }); assert.ok(findFailure(r.result, 'ENVIRONMENT_POLICY_DENIED'));
  r = await runCase('n10-env-redaction/secret-output', { runId: 'i09a-n10-secret', catalog: [commandSpec({ script: 'secret-output-runner.mjs', out: path.join(evidenceRoot, 'n10-env-redaction/secret-output/out.txt') }), advisorySpec()] }); validatePackets(r.result); await assertNoSecretsInTree(path.join(evidenceRoot, 'n10-env-redaction/secret-output'));
  r = await runCase('n11-timeout', { catalog: [commandSpec({ script: 'sleep-runner.mjs', out: null, args: [path.join(runnersDir, 'sleep-runner.mjs'), '2000'], scalarArgs: [scalarArg(1, 'duration_ms')], safety: { timeoutMs: 100 }, extra: { expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] } })] }); assert.ok(findFailure(r.result, 'COMMAND_TIMEOUT'));
  r = await runCase('n12-output-caps/stdout', { runId: 'i09a-n12-stdout', catalog: [commandSpec({ script: 'large-output-runner.mjs', out: null, args: [path.join(runnersDir, 'large-output-runner.mjs'), 'stdout', '4096'], publicArgs: [publicArg(1, 'stdout')], scalarArgs: [scalarArg(2, 'byte_count')], safety: { maxStdoutBytes: 64 }, extra: { expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] } })] }); assert.ok(findFailure(r.result, 'STDOUT_LIMIT_EXCEEDED'));
  r = await runCase('n12-output-caps/stderr', { runId: 'i09a-n12-stderr', catalog: [commandSpec({ script: 'large-output-runner.mjs', out: null, args: [path.join(runnersDir, 'large-output-runner.mjs'), 'stderr', '4096'], publicArgs: [publicArg(1, 'stderr')], scalarArgs: [scalarArg(2, 'byte_count')], safety: { maxStderrBytes: 64 }, extra: { expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] } })] }); assert.ok(findFailure(r.result, 'STDERR_LIMIT_EXCEEDED'));
  r = await runCase('n12-output-caps/aggregate', { runId: 'i09a-n12-aggregate', catalog: [commandSpec({ script: 'large-output-runner.mjs', out: null, args: [path.join(runnersDir, 'large-output-runner.mjs'), 'both', '80'], publicArgs: [publicArg(1, 'both')], scalarArgs: [scalarArg(2, 'byte_count')], safety: { maxStdoutBytes: 128, maxStderrBytes: 128, maxOutputBytes: 96 }, extra: { expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] } })] }); assert.ok(findFailure(r.result, 'OUTPUT_LIMIT_EXCEEDED'));
  r = await runCase('n12-output-caps/artifact', { runId: 'i09a-n12-artifact', catalog: [commandSpec({ script: 'large-artifact-runner.mjs', out: path.join(evidenceRoot, 'n12-output-caps/artifact/out.txt'), args: [path.join(runnersDir, 'large-artifact-runner.mjs'), path.join(evidenceRoot, 'n12-output-caps/artifact/out.txt'), '4096'], scalarArgs: [scalarArg(2, 'byte_count')], safety: { maxOutputBytes: 64 } })] }); assert.ok(findFailure(r.result, 'ARTIFACT_LIMIT_EXCEEDED'));
}
/** @returns {Promise<void>} */
async function n13() {
  const dir = path.join(evidenceRoot, 'n13-schema-classification'); await fsp.mkdir(dir, { recursive: true });
  const bad = readJson(path.join(repoRoot, 'packages/artifacts/fixtures/valid/evidence_packet.json')); bad.artifactId = 'i09a-bad-classification'; bad.result = 'blocked'; bad.status = 'blocked'; bad.failureDetails = { code: 'BAD', message: 'bad classification', classification: 'resource_limit_exceeded' };
  const validation = validateArtifact(bad); assert.equal(validation.ok, false);
  const timeoutResult = (await runCase('n13-schema-classification/timeout', { runId: 'i09a-n13-timeout', catalog: [commandSpec({ script: 'sleep-runner.mjs', out: null, args: [path.join(runnersDir, 'sleep-runner.mjs'), '2000'], scalarArgs: [scalarArg(1, 'duration_ms')], safety: { timeoutMs: 100 }, extra: { expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] } })] })).result;
  const timeoutPacketPath = packetFiles(timeoutResult).find((p) => readJson(p).failureDetails?.code === 'COMMAND_TIMEOUT'); assert.ok(timeoutPacketPath);
  const timeoutPacket = readJson(String(timeoutPacketPath));
  assert.equal(timeoutPacket.failureDetails.classification, EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE);
  await writeJson(path.join(dir, 'result.json'), { invalidCandidateOk: validation.ok, errors: /** @type {any} */ (validation).errors, correctedClassification: timeoutPacket.failureDetails });
}
/** @returns {Promise<void>} */
async function packageSeams() {
  const dir = path.join(evidenceRoot, 'package-build-typecheck'); await fsp.mkdir(dir, { recursive: true });
  const run = await spawnNode(['--input-type=module', '-e', "import { runVerificationPlan, VerificationRunnerError, VERIFICATION_RUNNER_VERSION, VERIFICATION_STATUSES } from '@vibe-engineer/verification'; if (typeof runVerificationPlan !== 'function') throw new Error('bad api'); if (typeof VerificationRunnerError !== 'function') throw new Error('bad error'); if (typeof VERIFICATION_RUNNER_VERSION !== 'string') throw new Error('bad version'); if (!Object.isFrozen(VERIFICATION_STATUSES)) throw new Error('statuses not frozen');"], packageRoot);
  await writeJson(path.join(dir, 'verification-package-import.json'), run); assert.equal(run.code, 0, run.stderr);
}

/** @returns {Promise<void>} */
async function main() {
  await fsp.mkdir(evidenceRoot, { recursive: true });
  const source = await wRb1P1P2();
  await wRb2(source);
  await wRb25();
  await p3(source);
  await negatives();
  await safetyNegatives();
  await pathEnvCaps();
  await n13();
  await packageSeams();
  await writeJson(path.join(evidenceRoot, 'r3', 'result.json'), { redactionSweep: 'covered-by-n8-secret-argv-denial-n10-secret-output-and-no-secret-tree-sweep' });
  console.log(JSON.stringify({ ok: true, evidenceRoot }, null, 2));
}

await main();
