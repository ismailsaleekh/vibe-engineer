#!/usr/bin/env node
// @ts-check
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const targetRoot = process.argv[2];
const evidenceRoot = process.argv[3];
if (!targetRoot || !evidenceRoot) throw new Error('usage: node post-fix-targeted-witnesses.mjs <targetRoot> <evidenceRoot>');
const repoRoot = path.resolve(targetRoot);
const root = path.resolve(evidenceRoot);
const packageRoot = path.join(repoRoot, 'packages/verification');
const runnersDir = path.join(packageRoot, 'fixtures/runners');
const approvedPlan = path.join(packageRoot, 'fixtures/plans/approved-plan.json');
const draftPlan = path.join(packageRoot, 'fixtures/plans/draft-plan.json');
const missingCategoryPlan = path.join(packageRoot, 'fixtures/plans/missing-category-plan.json');

const verification = await import(pathToFileURL(path.join(repoRoot, 'packages/verification/src/index.js')).href);
const artifacts = await import(pathToFileURL(path.join(repoRoot, 'packages/artifacts/src/index.js')).href);
const orchestration = await import(pathToFileURL(path.join(repoRoot, 'packages/orchestration/dist/src/index.js')).href);
const { runVerificationPlan, EVIDENCE_FAILURE_CLASSIFICATIONS } = verification;
const { validateArtifactFile, validateArtifact } = artifacts;
const { createInitialRunState, transitionNode, joinValidatedOutputs, inspectResumeState } = orchestration;

/** @typedef {Record<string, any>} AnyRecord */
/** @typedef {{id?: string, layer?: string, script?: string, out?: string|null, args?: string[]|null, safety?: AnyRecord, extra?: AnyRecord, publicArgs?: AnyRecord[], scalarArgs?: AnyRecord[], evidenceClass?: string, blocking?: boolean}} CommandOptions */

/** @type {{id:string, ok:boolean, details?:AnyRecord}[]} */
const cases = [];
/** @type {{severity:string, id:string, message:string, details?:AnyRecord}[]} */
const findings = [];
await fsp.mkdir(root, { recursive: true });

function safeRunId(name) { return `i09a-postfix-${name.toLowerCase().replace(/[^a-z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '')}`; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
async function writeJson(file, data) { await fsp.mkdir(path.dirname(file), { recursive: true }); await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8'); return file; }
function publicArg(index, value) { return { index, value }; }
function scalarArg(index, kind) { return { index, kind }; }
function failureList(result) { return Array.isArray(result.failures) ? result.failures : []; }
function hasCode(result, code) { return failureList(result).some((f) => f?.code === code); }
function failureCodes(result) { return [...new Set(failureList(result).map((f) => String(f?.code || '')))].filter(Boolean).sort(); }
function failureClassifications(result) { return [...new Set(failureList(result).map((f) => String(f?.classification || '')))].filter(Boolean).sort(); }
function packetFiles(result) { return Array.isArray(result.evidencePackets) ? result.evidencePackets.map(String) : []; }
function packetData(result) { return packetFiles(result).map(readJson); }
function packetByCode(result, code) { return packetData(result).find((packet) => packet.failureDetails?.code === code); }
function secretHash(value) { return createHash('sha256').update(value).digest('hex'); }
function scanForText(dir, needle) {
  let hits = 0;
  const hitFiles = [];
  function walk(current) {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) walk(p);
      else {
        const text = fs.readFileSync(p, 'utf8');
        if (text.includes(needle)) { hits += 1; hitFiles.push(p); }
      }
    }
  }
  walk(dir);
  return { hits, hitFiles };
}
function validatePackets(result) {
  let ok = true;
  const invalid = [];
  for (const packet of packetFiles(result)) {
    const validation = validateArtifactFile(packet, { kind: 'evidence_packet' });
    if (!validation.ok) { ok = false; invalid.push({ packet, errors: validation.errors }); }
  }
  return { ok, invalid, count: packetFiles(result).length };
}
function summarizeResult(id, dir, result, extra = {}) {
  const validation = validatePackets(result);
  const summary = { id, dir, status: result.status, packetCount: validation.count, validationOk: validation.ok, failureCodes: failureCodes(result), classifications: failureClassifications(result), ...extra };
  cases.push({ id, ok: validation.ok, details: summary });
  return summary;
}
function expect(condition, severity, id, message, details = {}) {
  if (!condition) findings.push({ severity, id, message, details });
}

/** @param {CommandOptions} [options] */
function commandSpec(options = {}) {
  const { id = 'schema-validation', layer = 'schema_validation', script = 'pass-runner.mjs', out = undefined, args = null, safety = {}, extra = {}, publicArgs = [], scalarArgs = [], evidenceClass = 'deterministic', blocking = true } = options;
  const scriptPath = path.join(runnersDir, script);
  const finalArgs = args ?? (out ? [scriptPath, out] : [scriptPath]);
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
      allowedWriteRoots: [path.dirname(out ?? root)],
      envAllowlist: [],
      passThroughEnv: false,
      cwdContainedInProjectRoot: true,
      expectedArtifactsContained: true,
      ...safety
    },
    ...extra
  };
}
function advisorySpec() {
  return commandSpec({ id: 'advisory-review', layer: 'advisory_review', script: 'fail-runner.mjs', out: null, blocking: false, evidenceClass: 'advisory', extra: { failureClassification: 'advisory_finding' } });
}
function catalogFor(dir) { return [commandSpec({ out: path.join(dir, 'schema-validation-output.json') }), advisorySpec()]; }
async function runCase(name, options = {}) {
  const dir = path.join(root, name);
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
  const planPath = options.plan ?? approvedPlan;
  const planValidation = validateArtifactFile(planPath, { kind: 'implementation_plan' });
  const result = await runVerificationPlan({ implementationPlanPath: planPath, evidenceRoot: dir, projectRoot: repoRoot, runId: options.runId ?? safeRunId(name), runnerCatalog: options.catalog ?? catalogFor(dir), ...(options.rerunOf ? { rerunOf: options.rerunOf } : {}) });
  await writeJson(path.join(dir, 'aggregate-result.json'), result);
  await writeJson(path.join(dir, 'plan-validation.json'), { ok: planValidation.ok, errors: planValidation.errors ?? [] });
  return { dir, result };
}
async function expectErrorCase(name, fn) {
  const dir = path.join(root, name);
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
  try { await fn(dir); }
  catch (error) {
    const e = /** @type {AnyRecord} */ (error);
    const recorded = { name: e.name, code: e.code, message: e.message, details: e.details };
    await writeJson(path.join(dir, 'error.json'), recorded);
    cases.push({ id: name, ok: true, details: recorded });
    return recorded;
  }
  findings.push({ severity: 'major-local', id: name, message: 'Expected fail-closed error did not occur.' });
  return null;
}
async function planVariant(name, mutate) {
  const plan = readJson(approvedPlan);
  mutate(plan);
  const file = path.join(root, 'plan-variants', `${name}.json`);
  await writeJson(file, plan);
  return file;
}

// 1. Positive allowlist + W-RB1.
const positive = await runCase('positive-allowlist');
const positiveSummary = summarizeResult('positive-allowlist', positive.dir, positive.result);
expect(['passed', 'advisory_warning'].includes(String(positive.result.status)), 'critical', 'positive-allowlist', 'Allowed typed command runner did not pass/advisory-warn.', positiveSummary);
expect(String(positive.result.executedItems || '').includes('schema-validation'), 'critical', 'w-rb1-executed', 'W-RB1 did not execute schema-validation runner.', positiveSummary);
expect(positiveSummary.validationOk, 'critical', 'w-rb1-packets', 'W-RB1 produced invalid Evidence Packets.', positiveSummary);

// 8. W-RB1 negative: non-approved plan before spawn.
const n1Sentinel = path.join(root, 'plan-not-approved', 'sentinel.json');
await expectErrorCase('plan-not-approved', async (dir) => {
  await runVerificationPlan({ implementationPlanPath: draftPlan, evidenceRoot: dir, projectRoot: repoRoot, runId: 'i09a-postfix-plan-not-approved', runnerCatalog: [commandSpec({ out: n1Sentinel })] });
});
expect(!fs.existsSync(n1Sentinel), 'critical', 'plan-not-approved-before-spawn', 'Draft plan executed runner/sentinel exists.', { sentinel: n1Sentinel });

// Missing required category real artifact-validator failure path.
await expectErrorCase('missing-required-category', async (dir) => {
  await runVerificationPlan({ implementationPlanPath: missingCategoryPlan, evidenceRoot: dir, projectRoot: repoRoot, runId: 'i09a-postfix-missing-category', runnerCatalog: [] });
});

// 9. W-RB2 orchestration join/resume.
async function runWrb2(sourceResult) {
  const dir = path.join(root, 'w-rb2-orchestration');
  await fsp.mkdir(dir, { recursive: true });
  const packet = packetFiles(sourceResult)[0];
  const packetJson = readJson(packet);
  const workPlan = { schemaVersion: 'orchestration-work-plan/1.0.0', runId: 'i09a-postfix-wrb2', limits: { maxParallelAgents: 8, maxValidationFixIterations: 3, agenticWorkPackageTargetHours: 6 }, untouchablePaths: ['.git/**'], readOnlyPaths: ['packages/cli/**'], nodes: [
    { id: 'producer', title: 'producer', dependsOn: [], ownershipClaims: [], expectedOutputs: [], evidenceRefs: [], failureRouting: { status: 'none', hookRef: 'none', owner: 'postfix-validator', evidenceRefs: [] }, estimate: { agenticHours: 1, split: false } },
    { id: 'consumer', title: 'consumer', dependsOn: ['producer'], ownershipClaims: [], expectedOutputs: [], evidenceRefs: [], failureRouting: { status: 'none', hookRef: 'none', owner: 'postfix-validator', evidenceRefs: [] }, estimate: { agenticHours: 1, split: false } }
  ] };
  const planPath = await writeJson(path.join(dir, 'work-plan.json'), workPlan);
  const statePath = path.join(dir, 'state.json');
  createInitialRunState({ workPlanPath: planPath, statePath, now: '2026-06-25T00:00:00.000Z' });
  transitionNode({ statePath, nodeId: 'producer', status: 'validated', outputRefs: [{ artifactId: packetJson.artifactId, artifactKind: 'evidence_packet', path: packet, ownerNodeId: 'producer', status: 'validated', dirtyState: 'clean', evidenceRefs: [packet] }], now: '2026-06-25T00:00:01.000Z' });
  const join = joinValidatedOutputs({ statePath, plan: workPlan, consumerNodeId: 'consumer', now: '2026-06-25T00:00:02.000Z' });
  const resume = inspectResumeState({ statePath, plan: workPlan, now: '2026-06-25T00:00:03.000Z' });
  transitionNode({ statePath, nodeId: 'producer', status: 'validated', outputRefs: [{ artifactId: 'missing-packet', artifactKind: 'evidence_packet', path: path.join(dir, 'missing.json'), ownerNodeId: 'producer', status: 'validated', dirtyState: 'clean', evidenceRefs: [] }], now: '2026-06-25T00:00:04.000Z' });
  const invalid = inspectResumeState({ statePath, plan: workPlan, now: '2026-06-25T00:00:05.000Z' });
  const details = { joinedArtifactIds: join.joinedArtifactIds, completedNodeIds: resume.resume.completedNodeIds, invalidations: invalid.invalidations };
  await writeJson(path.join(dir, 'result.json'), { join, resume, invalid });
  cases.push({ id: 'w-rb2-orchestration', ok: join.joinedArtifactIds.includes(packetJson.artifactId) && resume.resume.completedNodeIds.includes('producer') && invalid.invalidations.length > 0, details });
  expect(join.joinedArtifactIds.includes(packetJson.artifactId), 'critical', 'w-rb2-join', 'Orchestration join did not consume valid runner packet.', details);
  expect(invalid.invalidations.length > 0, 'critical', 'w-rb2-negative', 'Missing packet ref did not invalidate/block.', details);
}
await runWrb2(positive.result);

// 10. W-RB2.5 package-name import/exercise from packages/cli cwd, positive and negative touch.
async function spawnNode(args, cwd, env = {}) {
  return await new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (code) => resolve({ code, stdout, stderr, cwd, argv: [process.execPath, ...args] }));
  });
}
async function runWrb25() {
  const dir = path.join(root, 'w-rb2-5-cli-context');
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
  const sentinel = path.join(dir, 'cli-touch-sentinel');
  const childCode = `
    import fs from 'node:fs';
    import path from 'node:path';
    import { runVerificationPlan } from '@vibe-engineer/verification';
    import { validateArtifactFile } from '@vibe-engineer/artifacts';
    const repoRoot = ${JSON.stringify(repoRoot)};
    const dir = ${JSON.stringify(dir)};
    const approvedPlan = ${JSON.stringify(approvedPlan)};
    const runnersDir = ${JSON.stringify(runnersDir)};
    const passRunner = path.join(runnersDir, 'pass-runner.mjs');
    function commandSpec(out) { return { id:'schema-validation', requiredItemIds:['schema-validation'], layer:'schema_validation', evidenceClass:'deterministic', blocking:true, kind:'command', command:process.execPath, args:[passRunner, out], cwd:'.', expectedArtifacts:[out], argPaths:[{index:0, root:'projectRoot'}, {index:1, root:'evidenceRoot'}], safety:{classification:'local_deterministic_write', timeoutMs:2000, maxStdoutBytes:8192, maxStderrBytes:8192, maxOutputBytes:8192, allowedReadRoots:[repoRoot], allowedWriteRoots:[path.dirname(out)], envAllowlist:[], passThroughEnv:false, cwdContainedInProjectRoot:true, expectedArtifactsContained:true} }; }
    function advisorySpec() { return { id:'advisory-review', requiredItemIds:['advisory-review'], layer:'advisory_review', evidenceClass:'advisory', blocking:false, kind:'command', command:process.execPath, args:[path.join(runnersDir, 'fail-runner.mjs')], cwd:'.', expectedArtifacts:[], argPaths:[{index:0, root:'projectRoot'}], safety:{classification:'local_deterministic_write', timeoutMs:2000, maxStdoutBytes:8192, maxStderrBytes:8192, maxOutputBytes:8192, allowedReadRoots:[repoRoot], allowedWriteRoots:[dir], envAllowlist:[], passThroughEnv:false, cwdContainedInProjectRoot:true, expectedArtifactsContained:true}, failureClassification:'advisory_finding' }; }
    const positive = await runVerificationPlan({ implementationPlanPath: approvedPlan, evidenceRoot: path.join(dir, 'positive'), projectRoot: repoRoot, runId: 'i09a-postfix-cli-positive', runnerCatalog: [commandSpec(path.join(dir, 'positive', 'out.json')), advisorySpec()] });
    for (const packet of positive.evidencePackets) { const v = validateArtifactFile(packet, { kind:'evidence_packet' }); if (!v.ok) throw new Error('positive packet invalid'); }
    const negativeSpec = { ...commandSpec(path.join(dir, 'negative', 'unused.json')), command: 'touch', args: [${JSON.stringify(sentinel)}], expectedArtifacts: [], argPaths: [{ index: 0, root: 'evidenceRoot' }] };
    const negative = await runVerificationPlan({ implementationPlanPath: approvedPlan, evidenceRoot: path.join(dir, 'negative'), projectRoot: repoRoot, runId: 'i09a-postfix-cli-touch-negative', runnerCatalog: [negativeSpec, advisorySpec()] });
    for (const packet of negative.evidencePackets) { const v = validateArtifactFile(packet, { kind:'evidence_packet' }); if (!v.ok) throw new Error('negative packet invalid'); }
    if (fs.existsSync(${JSON.stringify(sentinel)})) throw new Error('cli touch sentinel created');
    if (!negative.failures.some((failure) => failure.code === 'COMMAND_POLICY_DENIED' && failure.classification === 'safety_or_security_policy_failure')) throw new Error('negative did not record COMMAND_POLICY_DENIED');
    fs.writeFileSync(path.join(dir, 'cli-context-result.json'), JSON.stringify({ positive, negative, sentinelExists: fs.existsSync(${JSON.stringify(sentinel)}) }, null, 2));
  `;
  const run = await spawnNode(['--input-type=module', '-e', childCode], path.join(repoRoot, 'packages/cli'));
  await writeJson(path.join(dir, 'spawn-result.json'), run);
  cases.push({ id: 'w-rb2-5-cli-context', ok: run.code === 0, details: { code: run.code, cwd: run.cwd, stderr: run.stderr.slice(0, 500) } });
  expect(run.code === 0, 'critical', 'w-rb2-5-cli-context', 'CLI-context package-name import/exercise failed.', { code: run.code, stderr: run.stderr });
}
await runWrb25();

// Positive rerun lineage.
const priorPacket = packetData(positive.result)[0]?.artifactId;
const rerun = await runCase('rerun-lineage', { runId: 'i09a-postfix-rerun-lineage', rerunOf: priorPacket });
const rerunPackets = packetData(rerun.result);
summarizeResult('rerun-lineage', rerun.dir, rerun.result, { priorPacket });
expect(rerunPackets.some((packet) => packet.rerunOf === priorPacket), 'major-local', 'rerun-lineage', 'Rerun packets did not preserve rerunOf lineage.', { priorPacket });

// 2/3. Command default-deny matrix.
async function runPolicyCase(name, spec, expectedCodes, extraCheck = () => ({})) {
  const { dir, result } = await runCase(`command-policy/${name}`, { runId: safeRunId(`command-policy-${name}`), catalog: [spec, advisorySpec()] });
  const extra = extraCheck(dir, result);
  const summary = summarizeResult(`command-policy/${name}`, dir, result, extra);
  const codeOk = expectedCodes.some((code) => hasCode(result, code));
  const classOk = failureList(result).filter((f) => expectedCodes.includes(f.code)).every((f) => f.classification === 'safety_or_security_policy_failure');
  expect(String(result.status) !== 'passed' && String(result.status) !== 'advisory_warning', 'critical', `command-policy/${name}`, 'Unsupported command/action was green.', summary);
  expect(codeOk, 'critical', `command-policy/${name}-code`, `Expected one of ${expectedCodes.join(',')}.`, summary);
  expect(classOk, 'critical', `command-policy/${name}-classification`, 'Policy denial classification was not safety_or_security_policy_failure.', summary);
  return { dir, result, summary };
}
const touchSentinel = path.join(root, 'command-policy', 'unknown-touch-sentinel');
await runPolicyCase('unknown-side-effect-touch', { ...commandSpec({ out: null }), command: 'touch', args: [touchSentinel], argPaths: [{ index: 0, root: 'evidenceRoot' }], expectedArtifacts: [] }, ['COMMAND_POLICY_DENIED'], () => ({ sentinel: touchSentinel, sentinelExists: fs.existsSync(touchSentinel) }));
expect(!fs.existsSync(touchSentinel), 'critical', 'unknown-touch-sentinel', 'Unknown touch executable created sentinel.', { sentinel: touchSentinel });
const mkdirSentinel = path.join(root, 'command-policy', 'unknown-mkdir-sentinel');
await runPolicyCase('unknown-non-node-mkdir', { ...commandSpec({ out: null }), command: fs.existsSync('/bin/mkdir') ? '/bin/mkdir' : '/usr/bin/mkdir', args: [mkdirSentinel], argPaths: [{ index: 0, root: 'evidenceRoot' }], expectedArtifacts: [] }, ['COMMAND_POLICY_DENIED', 'UNSAFE_PATH'], () => ({ sentinel: mkdirSentinel, sentinelExists: fs.existsSync(mkdirSentinel) }));
expect(!fs.existsSync(mkdirSentinel), 'critical', 'unknown-mkdir-sentinel', 'Unknown non-Node executable created sentinel.', { sentinel: mkdirSentinel });
await runPolicyCase('shell-string-command', { ...commandSpec({ out: null }), command: `${process.execPath} -e console.log(1)`, args: [], argPaths: [], expectedArtifacts: [] }, ['COMMAND_POLICY_DENIED']);
await runPolicyCase('shell-true', { ...commandSpec({ out: path.join(root, 'command-policy/shell-true/out.json'), extra: { shell: true } }) }, ['COMMAND_POLICY_DENIED']);
await runPolicyCase('package-manager-pnpm', { ...commandSpec({ out: null }), command: 'pnpm', args: ['--version'], argPaths: [], publicArgs: [publicArg(0, '--version')], expectedArtifacts: [] }, ['COMMAND_POLICY_DENIED']);
await runPolicyCase('git-status', { ...commandSpec({ out: null }), command: 'git', args: ['status'], argPaths: [], publicArgs: [publicArg(0, 'status')], expectedArtifacts: [] }, ['COMMAND_POLICY_DENIED']);
await runPolicyCase('node-eval', { ...commandSpec({ out: null }), args: ['-e', 'console.log(1)'], argPaths: [], publicArgs: [publicArg(0, '-e'), publicArg(1, 'console.log(1)')], expectedArtifacts: [] }, ['COMMAND_POLICY_DENIED']);
await runPolicyCase('node-print', { ...commandSpec({ out: null }), args: ['--print', '1+1'], argPaths: [], publicArgs: [publicArg(0, '--print'), publicArg(1, '1+1')], expectedArtifacts: [] }, ['COMMAND_POLICY_DENIED']);
await runPolicyCase('missing-typed-runner-path', { ...commandSpec({ out: null }), args: [], argPaths: [], expectedArtifacts: [] }, ['COMMAND_POLICY_DENIED']);
await runPolicyCase('untyped-argv', { ...commandSpec({ out: null }), args: [path.join(runnersDir, 'pass-runner.mjs'), 'public'], argPaths: [{ index: 0, root: 'projectRoot' }], expectedArtifacts: [] }, ['COMMAND_POLICY_DENIED']);
await runPolicyCase('unsupported-kind', { ...commandSpec({ out: null }), kind: 'custom-runner' }, ['UNSUPPORTED_COMMAND']);
await runPolicyCase('unsupported-validator', { id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, kind: 'validator', validator: 'unknownValidatorPath' }, ['UNSUPPORTED_ACTION']);
await runPolicyCase('unsafe-cwd', { ...commandSpec({ out: path.join(root, 'command-policy/unsafe-cwd/out.json') }), cwd: '..' }, ['UNSAFE_CWD']);
await runPolicyCase('unsafe-protected-path', commandSpec({ out: path.join(repoRoot, 'package.json') }), ['UNSAFE_PATH']);
await runPolicyCase('env-pass-through', { ...commandSpec({ out: path.join(root, 'command-policy/env-pass-through/out.json') }), safety: { ...commandSpec({ out: path.join(root, 'command-policy/env-pass-through/out.json') }).safety, passThroughEnv: true } }, ['ENVIRONMENT_POLICY_DENIED']);

const unsupportedActionPlan = await planVariant('unsupported-action', (plan) => { plan.verificationDelta.requiredItems[0].action = 'execute_shell'; });
await expectErrorCase('unsupported-action-artifact-rejection', async (dir) => {
  await runVerificationPlan({ implementationPlanPath: unsupportedActionPlan, evidenceRoot: dir, projectRoot: repoRoot, runId: 'i09a-postfix-unsupported-action', runnerCatalog: [] });
});

// 4/6. Resource, output, path, classification regressions.
async function runCapCase(name, spec, expectedCode) {
  const { dir, result } = await runCase(`resources/${name}`, { runId: safeRunId(`resources-${name}`), catalog: [spec, advisorySpec()] });
  const summary = summarizeResult(`resources/${name}`, dir, result);
  expect(hasCode(result, expectedCode), expectedCode === 'OUTPUT_LIMIT_EXCEEDED' ? 'critical' : 'major-local', `resources/${name}`, `Expected ${expectedCode}.`, summary);
  const packet = packetByCode(result, expectedCode);
  if (packet) expect(packet.failureDetails.classification === 'safety_or_security_policy_failure' || expectedCode === 'MISSING_EVIDENCE', 'critical', `resources/${name}-classification`, 'Resource/path failure classification incompatible.', packet.failureDetails);
  return { dir, result, packet };
}
const aggregate = await runCapCase('aggregate-output-cap', commandSpec({ script: 'large-output-runner.mjs', out: null, args: [path.join(runnersDir, 'large-output-runner.mjs'), 'both', '80'], publicArgs: [publicArg(1, 'both')], scalarArgs: [scalarArg(2, 'byte_count')], safety: { maxStdoutBytes: 128, maxStderrBytes: 128, maxOutputBytes: 96 }, extra: { expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] } }), 'OUTPUT_LIMIT_EXCEEDED');
if (aggregate.packet) {
  const stdoutBytes = aggregate.packet.stdoutRef && fs.existsSync(aggregate.packet.stdoutRef) ? fs.statSync(aggregate.packet.stdoutRef).size : 0;
  const stderrBytes = aggregate.packet.stderrRef && fs.existsSync(aggregate.packet.stderrRef) ? fs.statSync(aggregate.packet.stderrRef).size : 0;
  const logBytes = aggregate.packet.logsRef && fs.existsSync(aggregate.packet.logsRef) ? fs.statSync(aggregate.packet.logsRef).size : 0;
  const sidecar = { stdoutBytes, stderrBytes, logBytes, total: stdoutBytes + stderrBytes + logBytes, maxOutputBytes: 96 };
  await writeJson(path.join(aggregate.dir, 'sidecar-budget.json'), sidecar);
  expect(sidecar.total <= 96, 'major-local', 'aggregate-sidecar-budget', 'Aggregate stdout+stderr+runner log exceeded maxOutputBytes.', sidecar);
}
await runCapCase('stdout-only-cap', commandSpec({ script: 'large-output-runner.mjs', out: null, args: [path.join(runnersDir, 'large-output-runner.mjs'), 'stdout', '4096'], publicArgs: [publicArg(1, 'stdout')], scalarArgs: [scalarArg(2, 'byte_count')], safety: { maxStdoutBytes: 64 }, extra: { expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] } }), 'STDOUT_LIMIT_EXCEEDED');
await runCapCase('stderr-only-cap', commandSpec({ script: 'large-output-runner.mjs', out: null, args: [path.join(runnersDir, 'large-output-runner.mjs'), 'stderr', '4096'], publicArgs: [publicArg(1, 'stderr')], scalarArgs: [scalarArg(2, 'byte_count')], safety: { maxStderrBytes: 64 }, extra: { expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] } }), 'STDERR_LIMIT_EXCEEDED');
await runCapCase('timeout', commandSpec({ script: 'sleep-runner.mjs', out: null, args: [path.join(runnersDir, 'sleep-runner.mjs'), '2000'], scalarArgs: [scalarArg(1, 'duration_ms')], safety: { timeoutMs: 100 }, extra: { expectedArtifacts: [], argPaths: [{ index: 0, root: 'projectRoot' }] } }), 'COMMAND_TIMEOUT');
await runCapCase('artifact-cap', commandSpec({ script: 'large-artifact-runner.mjs', out: path.join(root, 'resources/artifact-cap/out.txt'), args: [path.join(runnersDir, 'large-artifact-runner.mjs'), path.join(root, 'resources/artifact-cap/out.txt'), '4096'], scalarArgs: [scalarArg(2, 'byte_count')], safety: { maxOutputBytes: 64 } }), 'ARTIFACT_LIMIT_EXCEEDED');
await runCapCase('missing-cap', { ...commandSpec({ out: path.join(root, 'resources/missing-cap/out.json') }), safety: { ...commandSpec({ out: path.join(root, 'resources/missing-cap/out.json') }).safety, maxOutputBytes: undefined } }, 'RESOURCE_CAP_MISSING');
await runCapCase('malformed-cap', { ...commandSpec({ out: path.join(root, 'resources/malformed-cap/out.json') }), safety: { ...commandSpec({ out: path.join(root, 'resources/malformed-cap/out.json') }).safety, maxOutputBytes: 'bad' } }, 'RESOURCE_CAP_MISSING');
await runCapCase('overlarge-cap', { ...commandSpec({ out: path.join(root, 'resources/overlarge-cap/out.json') }), safety: { ...commandSpec({ out: path.join(root, 'resources/overlarge-cap/out.json') }).safety, maxOutputBytes: 3 * 1024 * 1024 } }, 'RESOURCE_CAP_EXCEEDED');
await runCapCase('missing-evidence', commandSpec({ script: 'no-artifact-runner.mjs', out: path.join(root, 'resources/missing-evidence/missing.json') }), 'MISSING_EVIDENCE');

const symlinkDir = path.join(root, 'path-regressions/symlink-escape');
await fsp.mkdir(symlinkDir, { recursive: true });
const symlinkPath = path.join(symlinkDir, 'package-json-link');
await fsp.rm(symlinkPath, { force: true });
await fsp.symlink(path.join(repoRoot, 'package.json'), symlinkPath);
await runPolicyCase('symlink-expected-artifact-escape', commandSpec({ out: symlinkPath }), ['UNSAFE_PATH']);
await runPolicyCase('absolute-out-of-root-path', { ...commandSpec({ out: null }), args: [path.join(runnersDir, 'pass-runner.mjs'), '/tmp/i09a-out-of-root'], argPaths: [{ index: 0, root: 'projectRoot' }, { index: 1, root: 'evidenceRoot' }], expectedArtifacts: ['/tmp/i09a-out-of-root'] }, ['UNSAFE_PATH']);

// Malformed Evidence Packet candidate and non-enum classification candidate.
const malformed = await runCase('schema/malformed-evidence-packet-candidate', { runId: 'i09a-postfix-malformed-packet', catalog: [{ id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, kind: 'validator', validator: 'malformedEvidencePacketCandidate' }, advisorySpec()] });
summarizeResult('schema/malformed-evidence-packet-candidate', malformed.dir, malformed.result);
expect(hasCode(malformed.result, 'MALFORMED_EVIDENCE_PACKET'), 'critical', 'malformed-packet-candidate', 'Malformed packet candidate was not rejected before final persistence.', { codes: failureCodes(malformed.result) });
const badCandidate = readJson(path.join(repoRoot, 'packages/artifacts/fixtures/valid/evidence_packet.json'));
badCandidate.artifactId = 'i09a-postfix-bad-classification';
badCandidate.status = 'blocked';
badCandidate.result = 'blocked';
badCandidate.failureDetails = { code: 'BAD', message: 'bad', classification: 'resource_limit_exceeded' };
const badValidation = validateArtifact(badCandidate);
await writeJson(path.join(root, 'schema/non-enum-classification-candidate.json'), { ok: badValidation.ok, errors: badValidation.errors ?? [] });
expect(badValidation.ok === false, 'critical', 'non-enum-classification-rejected', 'Artifacts validator accepted non-enum failureDetails.classification.', { ok: badValidation.ok });

// 5. Secret redaction argv/env/stdout/stderr/error cases.
const uniqueSecret = `token=SECRET_POSTFIX_${Date.now()}_${Math.random().toString(16).slice(2)}`;
await runPolicyCase('secret-argv-deny', { ...commandSpec({ out: null }), args: [path.join(runnersDir, 'pass-runner.mjs'), uniqueSecret], argPaths: [{ index: 0, root: 'projectRoot' }], scalarArgs: [scalarArg(1, 'public_literal')], expectedArtifacts: [] }, ['COMMAND_POLICY_DENIED']);
await runPolicyCase('secret-env-deny', { ...commandSpec({ out: path.join(root, 'command-policy/secret-env-deny/out.json') }), env: { SAFE_PUBLIC: uniqueSecret }, safety: { ...commandSpec({ out: path.join(root, 'command-policy/secret-env-deny/out.json') }).safety, envAllowlist: ['SAFE_PUBLIC'] } }, ['ENVIRONMENT_POLICY_DENIED']);
const secretOutput = await runCase('secret-redaction/secret-output', { runId: 'i09a-postfix-secret-output', catalog: [commandSpec({ script: 'secret-output-runner.mjs', out: path.join(root, 'secret-redaction/secret-output/out.txt') }), advisorySpec()] });
summarizeResult('secret-redaction/secret-output', secretOutput.dir, secretOutput.result);
const uniqueSecretScan = scanForText(root, uniqueSecret);
await writeJson(path.join(root, 'secret-redaction', 'unique-secret-scan.json'), { markerSha256: secretHash(uniqueSecret), rawOccurrences: uniqueSecretScan.hits, hitFiles: uniqueSecretScan.hitFiles.map((file) => path.relative(root, file)) });
expect(uniqueSecretScan.hits === 0, 'critical', 'unique-secret-leak', 'Raw generated secret marker persisted in validation evidence/log roots.', { markerSha256: secretHash(uniqueSecret), hitFiles: uniqueSecretScan.hitFiles });

const secretPatternHits = [];
for (const file of walk(root)) {
  if (!file.endsWith('.json') && !file.endsWith('.log') && !file.endsWith('.txt')) continue;
  const rel = path.relative(root, file);
  if (rel.startsWith('witness-scripts/')) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (/SECRET_(?:STDOUT|STDERR|ARTIFACT|BEARER|ARGV|POSTFIX)|Bearer\s+SECRET|password=SECRET|token=SECRET|api-key\s+SECRET|client-secret=SECRET/.test(text)) secretPatternHits.push(rel);
}
await writeJson(path.join(root, 'secret-redaction', 'secret-pattern-scan.json'), { rawSecretPatternHitCount: secretPatternHits.length, hitFiles: secretPatternHits });
expect(secretPatternHits.length === 0, 'critical', 'secret-pattern-leak', 'Secret-like marker pattern leaked in produced evidence/logs.', { hitFiles: secretPatternHits.slice(0, 20) });

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

// Final packet/classification inventory for targeted witness run.
const classificationInventory = new Map();
const codeInventory = new Map();
let packetCount = 0;
let invalidPackets = 0;
const obsoleteClassifications = [];
const badCodeFields = [];
const obsoleteClassificationValues = new Set(['resource_limit_exceeded', 'blocked', 'denied', 'command_policy_denied', 'resource_cap_exceeded']);
for (const file of walk(root)) {
  if (!file.endsWith('.json')) continue;
  let json;
  try { json = readJson(file); } catch { continue; }
  if (json?.artifactKind !== 'evidence_packet') continue;
  packetCount += 1;
  const validation = validateArtifactFile(file, { kind: 'evidence_packet' });
  if (!validation.ok) invalidPackets += 1;
  const classification = json.failureDetails?.classification;
  const code = json.failureDetails?.code;
  if (classification) classificationInventory.set(classification, (classificationInventory.get(classification) || 0) + 1);
  if (code) codeInventory.set(code, (codeInventory.get(code) || 0) + 1);
  if (obsoleteClassificationValues.has(classification)) obsoleteClassifications.push({ file: path.relative(root, file), classification });
  if (typeof code === 'string' && !/^[A-Z0-9_]+$/.test(code)) badCodeFields.push({ file: path.relative(root, file), code });
}
const packetSummary = {
  packetCount,
  invalidPackets,
  classificationInventory: Object.fromEntries([...classificationInventory.entries()].sort()),
  codeInventory: Object.fromEntries([...codeInventory.entries()].sort()),
  obsoleteClassifications,
  badCodeFields
};
await writeJson(path.join(root, 'targeted-packet-summary.json'), packetSummary);
expect(packetCount > 0 && invalidPackets === 0, 'critical', 'targeted-packet-validation', 'Targeted produced Evidence Packet validation failed.', packetSummary);
expect(obsoleteClassifications.length === 0, 'critical', 'obsolete-classification', 'Obsolete/non-enum classification persisted.', packetSummary);
expect(badCodeFields.length === 0, 'critical', 'bad-failure-code', 'failureDetails.code was not uppercase schema-compatible.', packetSummary);

const summary = {
  ok: findings.length === 0,
  verdict: findings.length === 0 ? 'PASS' : 'NEEDS-FIX',
  caseCount: cases.length,
  cases,
  findings,
  packetSummary
};
await writeJson(path.join(root, 'targeted-witness-summary.json'), summary);
console.log(JSON.stringify({ ok: summary.ok, verdict: summary.verdict, findings: findings.length, summary: path.join(root, 'targeted-witness-summary.json') }, null, 2));
if (!summary.ok) process.exitCode = 1;
