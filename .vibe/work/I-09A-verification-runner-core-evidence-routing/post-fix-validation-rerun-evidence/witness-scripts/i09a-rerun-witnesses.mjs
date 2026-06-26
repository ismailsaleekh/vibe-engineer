// @ts-check
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

/** @typedef {Record<string, any>} AnyRecord */

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const artifactsModule = await import(pathToFileURL(path.join(repoRoot, 'packages/artifacts/src/index.js')).href);
const orchestrationModule = await import(pathToFileURL(path.join(repoRoot, 'packages/orchestration/dist/src/index.js')).href);
const verificationModule = await import(pathToFileURL(path.join(repoRoot, 'packages/verification/src/index.js')).href);
const { validateArtifactFile, validateArtifact } = artifactsModule;
const { createInitialRunState, transitionNode, joinValidatedOutputs, inspectResumeState } = orchestrationModule;
const { runVerificationPlan, EVIDENCE_FAILURE_CLASSIFICATIONS, VERIFICATION_RUNNER_VERSION } = verificationModule;
const workRoot = path.join(repoRoot, '.vibe/work/I-09A-verification-runner-core-evidence-routing');
const evidenceRoot = path.join(workRoot, 'post-fix-validation-rerun-evidence');
const commandLogRoot = path.join(workRoot, 'post-fix-validation-rerun-command-log');
const witnessRoot = path.join(evidenceRoot, 'targeted-witnesses');
const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const approvedPlan = path.join(repoRoot, 'packages/verification/fixtures/plans/approved-plan.json');
const passRunner = path.join(repoRoot, 'packages/verification/fixtures/runners/pass-runner.mjs');
const failRunner = path.join(repoRoot, 'packages/verification/fixtures/runners/fail-runner.mjs');
const secretOutputRunner = path.join(repoRoot, 'packages/verification/fixtures/runners/secret-output-runner.mjs');
const sleepRunner = path.join(repoRoot, 'packages/verification/fixtures/runners/sleep-runner.mjs');
const largeOutputRunner = path.join(repoRoot, 'packages/verification/fixtures/runners/large-output-runner.mjs');
const largeArtifactRunner = path.join(repoRoot, 'packages/verification/fixtures/runners/large-artifact-runner.mjs');
const dualOutputRunner = path.join(scriptRoot, 'dual-output-runner.mjs');

/** @type {AnyRecord[]} */
const cases = [];
/** @type {AnyRecord[]} */
const findings = [];
/** @type {string[]} */
const allPacketPaths = [];

/** @param {string} file @param {unknown} data */
async function writeJson(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
/** @param {string} file @returns {AnyRecord} */
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
/** @param {string} dir @returns {Generator<string>} */
function* walkFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(p);
    else yield p;
  }
}
/** @param {string} id @param {string} severity @param {string} summary @param {AnyRecord} evidence */
function addFinding(id, severity, summary, evidence) { findings.push({ id, severity, summary, evidence }); }
/** @param {string} id @param {AnyRecord} data */
function recordCase(id, data) { cases.push({ id, ...data }); }
/** @param {AnyRecord} result @returns {string[]} */
function packetFiles(result) { return Array.isArray(result.evidencePackets) ? result.evidencePackets.map(String) : []; }
/** @param {AnyRecord} result @returns {AnyRecord[]} */
function packetData(result) { return packetFiles(result).map((file) => readJson(file)); }
/** @param {AnyRecord} result @param {string} code @returns {AnyRecord|undefined} */
function packetByCode(result, code) { return packetData(result).find((packet) => packet.failureDetails?.code === code); }
/** @param {AnyRecord} result @returns {{ok:boolean, errors:AnyRecord[]}} */
function validatePackets(result) {
  /** @type {AnyRecord[]} */ const errors = [];
  for (const packet of packetFiles(result)) {
    allPacketPaths.push(packet);
    const validation = validateArtifactFile(packet, { kind: 'evidence_packet' });
    if (!validation.ok) errors.push({ packet, errors: /** @type {AnyRecord} */ (validation).errors });
  }
  return { ok: errors.length === 0, errors };
}
/** @param {number} index @param {string} value */
function publicArg(index, value) { return { index, value }; }
/** @param {number} index @param {string} kind */
function scalarArg(index, kind) { return { index, kind }; }
/** @param {AnyRecord} opts @returns {AnyRecord} */
function commandSpec(opts = {}) {
  const id = opts.id || 'schema-validation';
  const layer = opts.layer || 'schema_validation';
  const script = opts.script === undefined ? passRunner : opts.script;
  const out = opts.out;
  const finalArgs = opts.args || (out ? [script, out] : [script]);
  /** @type {AnyRecord[]} */ const argPaths = opts.argPaths !== undefined ? opts.argPaths : [];
  if (script && finalArgs.includes(script) && !argPaths.some((entry) => entry.index === finalArgs.indexOf(script))) argPaths.push({ index: finalArgs.indexOf(script), root: 'projectRoot' });
  if (out && finalArgs.includes(out) && !argPaths.some((entry) => entry.index === finalArgs.indexOf(out))) argPaths.push({ index: finalArgs.indexOf(out), root: 'evidenceRoot' });
  const expectedArtifacts = opts.expectedArtifacts !== undefined ? opts.expectedArtifacts : (out ? [out] : []);
  const safety = {
    classification: 'local_deterministic_write',
    timeoutMs: 2000,
    maxStdoutBytes: 8192,
    maxStderrBytes: 8192,
    maxOutputBytes: 8192,
    allowedReadRoots: [repoRoot],
    allowedWriteRoots: out ? [path.dirname(out)] : [],
    envAllowlist: [],
    passThroughEnv: false,
    cwdContainedInProjectRoot: true,
    expectedArtifactsContained: true,
    ...(opts.safety || {})
  };
  return {
    id,
    requiredItemIds: [id],
    layer,
    evidenceClass: opts.evidenceClass || 'deterministic',
    blocking: opts.blocking !== undefined ? Boolean(opts.blocking) : true,
    kind: 'command',
    command: opts.command || process.execPath,
    args: finalArgs,
    cwd: opts.cwd || '.',
    expectedArtifacts,
    argPaths,
    publicArgs: opts.publicArgs || [],
    scalarArgs: opts.scalarArgs || [],
    safety,
    ...(opts.extra || {})
  };
}
/** @returns {AnyRecord} */
function advisorySpec() {
  return commandSpec({ id: 'advisory-review', layer: 'advisory_review', script: failRunner, out: null, blocking: false, evidenceClass: 'advisory', expectedArtifacts: [], extra: { failureClassification: 'advisory_finding' } });
}
/** @param {AnyRecord[]} catalog @returns {AnyRecord[]} */
function withAdvisory(catalog) {
  return catalog.some((entry) => entry.id === 'advisory-review' || (Array.isArray(entry.requiredItemIds) && entry.requiredItemIds.includes('advisory-review'))) ? catalog : [...catalog, advisorySpec()];
}
/** @param {string} name @param {AnyRecord[]} catalog @param {AnyRecord} [options] */
async function runPlanCase(name, catalog, options = {}) {
  const dir = path.join(witnessRoot, name);
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
  if (typeof options.setup === 'function') await options.setup(dir);
  try {
    const result = await runVerificationPlan({
      implementationPlanPath: options.plan || approvedPlan,
      evidenceRoot: dir,
      projectRoot: repoRoot,
      runId: options.runId || `i09a-rerun-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
      runnerCatalog: withAdvisory(catalog),
      ...(options.rerunOf ? { rerunOf: options.rerunOf } : {})
    });
    await writeJson(path.join(dir, 'aggregate-result.json'), result);
    const validation = validatePackets(result);
    if (!validation.ok) addFinding(`SCHEMA-INVALID-${name}`, 'critical', 'Evidence Packet validation failed with real @vibe-engineer/artifacts.', { dir, errors: validation.errors });
    recordCase(name, { dir, status: result.status, packetCount: packetFiles(result).length, validationOk: validation.ok, failures: result.failures || [] });
    return { dir, result, threw: false };
  } catch (error) {
    const err = /** @type {any} */ (error);
    await writeJson(path.join(dir, 'thrown-error.json'), { name: err.name, code: err.code, message: err.message, details: err.details });
    recordCase(name, { dir, threw: true, errorCode: err.code, errorMessage: err.message });
    return { dir, result: null, threw: true, error: err };
  }
}
/** @param {string} name @param {AnyRecord} result @param {string} expectedCode @param {string} [expectedClassification] */
function expectBlocked(name, result, expectedCode, expectedClassification = EVIDENCE_FAILURE_CLASSIFICATIONS.SAFETY_OR_SECURITY_POLICY_FAILURE) {
  if (!result) { addFinding(`MISSING-RESULT-${name}`, 'major-local', 'Witness produced no aggregate result.', { name, expectedCode }); return; }
  const packet = packetByCode(result, expectedCode);
  if (!packet) addFinding(`EXPECTED-CODE-MISSING-${name}`, 'major-local', `Expected blocked code ${expectedCode} was not recorded.`, { name, status: result.status, failures: result.failures });
  else {
    if (packet.status !== 'blocked' || packet.result !== 'blocked') addFinding(`NOT-BLOCKED-${name}`, 'major-local', 'Expected failure packet was not blocked/blocked.', { name, packet: packet.artifactId, status: packet.status, result: packet.result });
    if (packet.failureDetails?.classification !== expectedClassification) addFinding(`BAD-CLASSIFICATION-${name}`, 'critical', 'Blocking failure classification was schema-incompatible or wrong.', { name, packet: packet.artifactId, failureDetails: packet.failureDetails });
    if (!/^[A-Z0-9_]+$/.test(String(packet.failureDetails?.code || ''))) addFinding(`BAD-CODE-${name}`, 'major-local', 'failureDetails.code is not precise uppercase form.', { name, packet: packet.artifactId, failureDetails: packet.failureDetails });
  }
}
/** @param {string} name @param {string} sentinel */
function expectNoSentinel(name, sentinel) {
  if (fs.existsSync(sentinel)) addFinding(`SENTINEL-SIDE-EFFECT-${name}`, 'critical', 'Denied command produced a sentinel side effect, proving spawn/fail-open behavior.', { name, sentinel });
}
/** @param {string} text @returns {boolean} */
function hasStaticSecretPattern(text) {
  return /SECRET_[A-Z0-9_]+|Bearer\s+SECRET|password=SECRET|token=SECRET|api-key\s+SECRET|client-secret=SECRET/.test(text);
}
/** @param {string} name @param {string} dir */
async function assertNoStaticSecrets(name, dir) {
  /** @type {string[]} */ const hits = [];
  for (const file of walkFiles(dir)) {
    const text = await fsp.readFile(file, 'utf8').catch(() => '');
    if (hasStaticSecretPattern(text)) hits.push(file);
  }
  if (hits.length > 0) addFinding(`STATIC-SECRET-LEAK-${name}`, 'critical', 'Static secret-like fixture output leaked into persisted witness outputs.', { name, hits });
}

async function adjudicationSmoke() {
  const planValidation = validateArtifactFile(approvedPlan, { kind: 'implementation_plan' });
  if (!planValidation.ok) addFinding('APPROVED-PLAN-INVALID', 'critical', 'Approved fixture plan no longer validates with real artifacts package.', { errors: /** @type {AnyRecord} */ (planValidation).errors });
  recordCase('approved-plan-validation', { ok: planValidation.ok });
}

async function secretWitnesses() {
  const secretMarker = `SECRET_RERUN_${crypto.randomBytes(18).toString('hex').toUpperCase()}`;
  const markerHash = crypto.createHash('sha256').update(secretMarker).digest('hex');
  const secretDir = path.join(witnessRoot, 'secret');
  await fsp.mkdir(secretDir, { recursive: true });
  let run = await runPlanCase('secret/secret-argv-deny', [commandSpec({ out: null, args: [passRunner, secretMarker], argPaths: [{ index: 0, root: 'projectRoot' }], scalarArgs: [scalarArg(1, 'public_literal')], expectedArtifacts: [] })], { runId: 'i09a-rerun-secret-argv' });
  expectBlocked('secret-argv-deny', run.result, 'COMMAND_POLICY_DENIED');
  run = await runPlanCase('secret/secret-output-redaction', [commandSpec({ script: secretOutputRunner, out: path.join(witnessRoot, 'secret/secret-output-redaction/out.txt') })], { runId: 'i09a-rerun-secret-output' });
  if (run.result) await assertNoStaticSecrets('secret-output-redaction', run.dir);
  run = await runPlanCase('secret/validator-internal-redaction', [{ id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, kind: 'validator', validator: 'throwInternalError' }], { runId: 'i09a-rerun-secret-validator' });
  if (run.result) {
    const packet = packetByCode(run.result, 'RUNNER_INTERNAL_ERROR');
    if (!packet) addFinding('SECRET-VALIDATOR-MISSING-ERROR', 'major-local', 'Internal error witness did not produce expected RUNNER_INTERNAL_ERROR packet.', { dir: run.dir });
    else if (JSON.stringify(packet).includes('DUMMY_INTERNAL_VALUE')) addFinding('SECRET-VALIDATOR-LEAK', 'critical', 'Internal error diagnostic leaked raw secret-like value.', { packet: packet.artifactId });
  }
  /** @type {string[]} */ const markerHits = [];
  for (const root of [evidenceRoot, commandLogRoot]) {
    for (const file of walkFiles(root)) {
      const text = await fsp.readFile(file, 'utf8').catch(() => '');
      if (text.includes(secretMarker)) markerHits.push(file);
    }
  }
  if (markerHits.length > 0) addFinding('SECRET-MARKER-PERSISTED', 'critical', 'Generated raw argv secret marker persisted in rerun evidence or command logs.', { markerHash, markerHits });
  await writeJson(path.join(secretDir, 'secret-marker-scan-allowlist.json'), { markerName: 'generated secret argv marker', markerSha256: markerHash, rawMarkerOccurrences: markerHits.length, rawMarkerPersisted: markerHits.length > 0 });
}

async function commandPolicyWitnesses() {
  const dir = path.join(witnessRoot, 'command-policy');
  await fsp.mkdir(dir, { recursive: true });
  const nodeEvalSentinel = path.join(dir, 'node-eval-sentinel.json');
  let run = await runPlanCase('command-policy/node-eval', [commandSpec({ out: null, args: ['-e', `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(nodeEvalSentinel)}, 'spawned');`], argPaths: [], publicArgs: [publicArg(1, 'console.log-safe')], expectedArtifacts: [] })], { runId: 'i09a-rerun-node-eval' });
  expectBlocked('node-eval', run.result, 'COMMAND_POLICY_DENIED'); expectNoSentinel('node-eval', nodeEvalSentinel);

  const nodeEvalLongSentinel = path.join(dir, 'node--eval-sentinel.json');
  run = await runPlanCase('command-policy/node-long-eval', [commandSpec({ out: null, args: ['--eval', `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(nodeEvalLongSentinel)}, 'spawned');`], argPaths: [], expectedArtifacts: [] })], { runId: 'i09a-rerun-node-long-eval' });
  expectBlocked('node-long-eval', run.result, 'COMMAND_POLICY_DENIED'); expectNoSentinel('node-long-eval', nodeEvalLongSentinel);

  const noTypedSentinel = path.join(dir, 'no-typed-runner-sentinel.json');
  run = await runPlanCase('command-policy/no-typed-runner-path', [commandSpec({ out: null, args: [passRunner, noTypedSentinel], argPaths: [], expectedArtifacts: [] })], { runId: 'i09a-rerun-no-typed-runner' });
  expectBlocked('no-typed-runner-path', run.result, 'COMMAND_POLICY_DENIED'); expectNoSentinel('no-typed-runner-path', noTypedSentinel);

  run = await runPlanCase('command-policy/shell-string-command', [commandSpec({ out: null, command: `${process.execPath} -e`, args: [], argPaths: [], expectedArtifacts: [] })], { runId: 'i09a-rerun-shell-string' });
  expectBlocked('shell-string-command', run.result, 'COMMAND_POLICY_DENIED');

  run = await runPlanCase('command-policy/shell-true', [commandSpec({ out: path.join(dir, 'shell-true/out.txt'), extra: { shell: true } })], { runId: 'i09a-rerun-shell-true' });
  expectBlocked('shell-true', run.result, 'COMMAND_POLICY_DENIED');

  run = await runPlanCase('command-policy/unsafe-command-path', [commandSpec({ out: null, command: '/bin/echo', args: ['safe'], argPaths: [], publicArgs: [publicArg(0, 'safe')], expectedArtifacts: [] })], { runId: 'i09a-rerun-unsafe-command-path' });
  expectBlocked('unsafe-command-path', run.result, 'UNSAFE_PATH');

  run = await runPlanCase('command-policy/unsafe-cwd', [commandSpec({ out: path.join(dir, 'unsafe-cwd/out.txt'), cwd: '..' })], { runId: 'i09a-rerun-unsafe-cwd' });
  expectBlocked('unsafe-cwd', run.result, 'UNSAFE_CWD');

  run = await runPlanCase('command-policy/env-pass-through', [commandSpec({ out: path.join(dir, 'env-pass-through/out.txt'), safety: { passThroughEnv: true } })], { runId: 'i09a-rerun-env-pass-through' });
  expectBlocked('env-pass-through', run.result, 'ENVIRONMENT_POLICY_DENIED');

  run = await runPlanCase('command-policy/env-secret-key', [commandSpec({ out: path.join(dir, 'env-secret-key/out.txt'), extra: { env: { API_TOKEN: 'public-value' } }, safety: { envAllowlist: ['API_TOKEN'] } })], { runId: 'i09a-rerun-env-secret-key' });
  expectBlocked('env-secret-key', run.result, 'ENVIRONMENT_POLICY_DENIED');

  const touchCaseDir = path.join(witnessRoot, 'command-policy/unknown-side-effect-touch');
  const touchSentinel = path.join(touchCaseDir, 'unknown-touch-sentinel');
  await fsp.rm(touchSentinel, { force: true });
  run = await runPlanCase('command-policy/unknown-side-effect-touch', [commandSpec({ out: null, command: 'touch', args: [touchSentinel], argPaths: [{ index: 0, root: 'evidenceRoot' }], expectedArtifacts: [touchSentinel], safety: { allowedWriteRoots: [path.dirname(touchSentinel)] } })], { runId: 'i09a-rerun-unknown-touch' });
  if (run.result && run.result.status !== 'blocked') addFinding('UNKNOWN-SIDE-EFFECT-COMMAND-SPAWNED', 'critical', 'Unknown side-effect command was not denied before spawn.', { status: run.result.status, dir: run.dir, sentinelExists: fs.existsSync(touchSentinel), failures: run.result.failures });
  if (fs.existsSync(touchSentinel)) addFinding('UNKNOWN-SIDE-EFFECT-SENTINEL', 'critical', 'Unknown side-effect command created sentinel, proving unsafe spawn.', { sentinel: touchSentinel });
}

async function pathSafetyWitnesses() {
  const dir = path.join(witnessRoot, 'path-safety');
  await fsp.mkdir(dir, { recursive: true });
  const symlinkCase = path.join(witnessRoot, 'path-safety/symlink-escape');
  const symlinkPath = path.join(symlinkCase, 'package-json-link');
  let run = await runPlanCase('path-safety/symlink-escape', [commandSpec({ out: symlinkPath })], { runId: 'i09a-rerun-symlink-escape', setup: async () => { await fsp.rm(symlinkPath, { force: true }); await fsp.symlink(path.join(repoRoot, 'package.json'), symlinkPath); } });
  expectBlocked('symlink-escape', run.result, 'UNSAFE_PATH');

  const traversalOut = '../i09a-rerun-traversal-sentinel';
  run = await runPlanCase('path-safety/traversal-escape', [commandSpec({ out: traversalOut })], { runId: 'i09a-rerun-traversal' });
  expectBlocked('traversal-escape', run.result, 'UNSAFE_PATH');

  const absoluteOutside = path.join(witnessRoot, 'absolute-outside-case-sentinel.txt');
  await fsp.rm(absoluteOutside, { force: true });
  run = await runPlanCase('path-safety/absolute-out-of-case-root', [commandSpec({ out: absoluteOutside, safety: { allowedWriteRoots: [] } })], { runId: 'i09a-rerun-absolute-out' });
  expectBlocked('absolute-out-of-case-root', run.result, 'UNSAFE_PATH');
  expectNoSentinel('absolute-out-of-case-root', absoluteOutside);

  run = await runPlanCase('path-safety/protected-package-path', [commandSpec({ out: null, args: [passRunner], expectedArtifacts: [path.join(repoRoot, 'package.json')], safety: { allowedWriteRoots: [] } })], { runId: 'i09a-rerun-protected-package' });
  expectBlocked('protected-package-path', run.result, 'UNSAFE_PATH');

  run = await runPlanCase('path-safety/path-like-arg-escape', [commandSpec({ out: null, args: [passRunner, '../outside-arg'], argPaths: [{ index: 0, root: 'projectRoot' }, { index: 1, root: 'evidenceRoot' }], expectedArtifacts: [] })], { runId: 'i09a-rerun-path-arg-escape' });
  expectBlocked('path-like-arg-escape', run.result, 'UNSAFE_PATH');
}

async function resourceWitnesses() {
  const dir = path.join(witnessRoot, 'resources');
  await fsp.mkdir(dir, { recursive: true });
  let run = await runPlanCase('resources/missing-caps', [commandSpec({ out: path.join(dir, 'missing-caps/out.txt'), safety: { maxStdoutBytes: undefined } })], { runId: 'i09a-rerun-missing-caps' });
  expectBlocked('missing-caps', run.result, 'RESOURCE_CAP_MISSING');

  run = await runPlanCase('resources/malformed-caps', [commandSpec({ out: path.join(dir, 'malformed-caps/out.txt'), safety: { timeoutMs: /** @type {any} */ ('bad') } })], { runId: 'i09a-rerun-malformed-caps' });
  expectBlocked('malformed-caps', run.result, 'RESOURCE_CAP_MISSING');

  run = await runPlanCase('resources/overlarge-caps', [commandSpec({ out: path.join(dir, 'overlarge-caps/out.txt'), safety: { timeoutMs: 60000 } })], { runId: 'i09a-rerun-overlarge-caps' });
  expectBlocked('overlarge-caps', run.result, 'RESOURCE_CAP_EXCEEDED');

  run = await runPlanCase('resources/timeout', [commandSpec({ out: null, script: sleepRunner, args: [sleepRunner, '2000'], argPaths: [{ index: 0, root: 'projectRoot' }], scalarArgs: [scalarArg(1, 'duration_ms')], expectedArtifacts: [], safety: { timeoutMs: 100 } })], { runId: 'i09a-rerun-timeout' });
  expectBlocked('timeout', run.result, 'COMMAND_TIMEOUT');

  run = await runPlanCase('resources/stdout-cap', [commandSpec({ out: null, script: largeOutputRunner, args: [largeOutputRunner, 'stdout', '4096'], argPaths: [{ index: 0, root: 'projectRoot' }], publicArgs: [publicArg(1, 'stdout')], scalarArgs: [scalarArg(2, 'byte_count')], expectedArtifacts: [], safety: { maxStdoutBytes: 64 } })], { runId: 'i09a-rerun-stdout-cap' });
  expectBlocked('stdout-cap', run.result, 'STDOUT_LIMIT_EXCEEDED');

  run = await runPlanCase('resources/stderr-cap', [commandSpec({ out: null, script: largeOutputRunner, args: [largeOutputRunner, 'stderr', '4096'], argPaths: [{ index: 0, root: 'projectRoot' }], publicArgs: [publicArg(1, 'stderr')], scalarArgs: [scalarArg(2, 'byte_count')], expectedArtifacts: [], safety: { maxStderrBytes: 64 } })], { runId: 'i09a-rerun-stderr-cap' });
  expectBlocked('stderr-cap', run.result, 'STDERR_LIMIT_EXCEEDED');

  run = await runPlanCase('resources/aggregate-output-cap', [commandSpec({ out: null, script: dualOutputRunner, args: [dualOutputRunner, '80', '80'], argPaths: [{ index: 0, root: 'projectRoot' }], scalarArgs: [scalarArg(1, 'byte_count'), scalarArg(2, 'byte_count')], expectedArtifacts: [], safety: { maxStdoutBytes: 100, maxStderrBytes: 100, maxOutputBytes: 100 } })], { runId: 'i09a-rerun-output-cap' });
  if (run.result && !packetByCode(run.result, 'OUTPUT_LIMIT_EXCEEDED')) addFinding('AGGREGATE-OUTPUT-CAP-NOT-ENFORCED', 'major-local', 'Combined stdout+stderr exceeded maxOutputBytes but no OUTPUT_LIMIT_EXCEEDED blocked packet was recorded.', { status: run.result.status, dir: run.dir, failures: run.result.failures });

  const artifactOut = path.join(dir, 'artifact-cap/out.txt');
  run = await runPlanCase('resources/artifact-cap', [commandSpec({ script: largeArtifactRunner, out: artifactOut, args: [largeArtifactRunner, artifactOut, '4096'], scalarArgs: [scalarArg(2, 'byte_count')], safety: { maxOutputBytes: 64 } })], { runId: 'i09a-rerun-artifact-cap' });
  expectBlocked('artifact-cap', run.result, 'ARTIFACT_LIMIT_EXCEEDED');
}

async function realBoundaryWitnesses() {
  const dir = path.join(witnessRoot, 'real-boundaries');
  await fsp.mkdir(dir, { recursive: true });
  const planValidation = validateArtifactFile(approvedPlan, { kind: 'implementation_plan' });
  if (!planValidation.ok) addFinding('WRB1-PLAN-CONTRACT-INVALID', 'critical', 'W-RB1 plan validation failed before runner boundary.', { errors: /** @type {AnyRecord} */ (planValidation).errors });
  const out = path.join(witnessRoot, 'real-boundaries/w-rb1-positive/schema-validation-output.json');
  const run = await runPlanCase('real-boundaries/w-rb1-positive', [commandSpec({ out })], { runId: 'i09a-rerun-w-rb1' });
  if (!run.result || !['passed', 'advisory_warning'].includes(String(run.result.status))) addFinding('WRB1-NOT-TRUTH-GREEN', 'critical', 'W-RB1 real runner boundary did not pass.', { dir: run.dir, result: run.result });
  const packet = run.result ? packetFiles(run.result).find((candidate) => readJson(candidate).commandOrTool?.kind === 'command' && readJson(candidate).extensions?.['dev.vibe.verification']?.requiredItemId === 'schema-validation') || '' : '';
  if (!packet) { addFinding('WRB2-NO-RUNNER-PACKET', 'critical', 'W-RB2 source runner-produced packet missing.', { dir: run.dir }); return; }
  const packetJson = readJson(packet);
  const rb2Dir = path.join(dir, 'w-rb2');
  await fsp.mkdir(rb2Dir, { recursive: true });
  const workPlan = { schemaVersion: 'orchestration-work-plan/1.0.0', runId: 'i09a-rerun-w-rb2', limits: { maxParallelAgents: 2, maxValidationFixIterations: 1, agenticWorkPackageTargetHours: 1 }, untouchablePaths: ['.git/**'], readOnlyPaths: ['packages/cli/**'], nodes: [
    { id: 'producer', title: 'producer', dependsOn: [], ownershipClaims: [], expectedOutputs: [], evidenceRefs: [], failureRouting: { status: 'none', hookRef: 'none', owner: 'i09a', evidenceRefs: [] }, estimate: { agenticHours: 1, split: false } },
    { id: 'consumer', title: 'consumer', dependsOn: ['producer'], ownershipClaims: [], expectedOutputs: [], evidenceRefs: [], failureRouting: { status: 'none', hookRef: 'none', owner: 'i09a', evidenceRefs: [] }, estimate: { agenticHours: 1, split: false } }
  ] };
  const planPath = path.join(rb2Dir, 'work-plan.json');
  const statePath = path.join(rb2Dir, 'state.json');
  await writeJson(planPath, workPlan);
  createInitialRunState({ workPlanPath: planPath, statePath, now: '2026-06-25T00:00:00.000Z' });
  transitionNode({ statePath, nodeId: 'producer', status: 'validated', outputRefs: [{ artifactId: packetJson.artifactId, artifactKind: 'evidence_packet', path: packet, ownerNodeId: 'producer', status: 'validated', dirtyState: 'clean', evidenceRefs: [packet] }], now: '2026-06-25T00:00:01.000Z' });
  const join = joinValidatedOutputs({ statePath, plan: workPlan, consumerNodeId: 'consumer', now: '2026-06-25T00:00:02.000Z' });
  const resume = inspectResumeState({ statePath, plan: workPlan, now: '2026-06-25T00:00:03.000Z' });
  transitionNode({ statePath, nodeId: 'producer', status: 'validated', outputRefs: [{ artifactId: 'missing-packet', artifactKind: 'evidence_packet', path: path.join(rb2Dir, 'missing.json'), ownerNodeId: 'producer', status: 'validated', dirtyState: 'clean', evidenceRefs: [] }], now: '2026-06-25T00:00:04.000Z' });
  const missingInvalid = inspectResumeState({ statePath, plan: workPlan, now: '2026-06-25T00:00:05.000Z' });
  const invalidPacketPath = path.join(rb2Dir, 'invalid-packet.json');
  await writeJson(invalidPacketPath, { artifactKind: 'evidence_packet', artifactId: 'invalid-packet' });
  transitionNode({ statePath, nodeId: 'producer', status: 'validated', outputRefs: [{ artifactId: 'invalid-packet', artifactKind: 'evidence_packet', path: invalidPacketPath, ownerNodeId: 'producer', status: 'validated', dirtyState: 'clean', evidenceRefs: [] }], now: '2026-06-25T00:00:06.000Z' });
  const invalidPacketInvalid = inspectResumeState({ statePath, plan: workPlan, now: '2026-06-25T00:00:07.000Z' });
  if (!join.joinedArtifactIds.includes(packetJson.artifactId) || !resume.resume.completedNodeIds.includes('producer')) addFinding('WRB2-JOIN-FAILED', 'critical', 'Real orchestration join/resume did not consume runner-produced packet.', { join, resume });
  if (!missingInvalid.invalidations.length || !invalidPacketInvalid.invalidations.length) addFinding('WRB2-NEGATIVE-INVALIDATION-FAILED', 'critical', 'Real orchestration did not invalidate missing/invalid packet refs.', { missingInvalid, invalidPacketInvalid });
  await writeJson(path.join(rb2Dir, 'result.json'), { sourcePacket: packet, join, resume, missingInvalid, invalidPacketInvalid });
}

/** @param {string[]} args @param {string} cwd @returns {Promise<AnyRecord>} */
function spawnNode(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd, env: {}, shell: false });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr, cwd, argv: [process.execPath, ...args] }));
    child.on('error', (error) => resolve({ code: null, signal: null, stdout, stderr: String(error), cwd, argv: [process.execPath, ...args] }));
  });
}

async function cliContextWitness() {
  const dir = path.join(witnessRoot, 'w-rb2-5-cli-context');
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
  const positiveDir = path.join(dir, 'positive');
  const negativeDir = path.join(dir, 'negative-policy');
  const positiveOut = path.join(positiveDir, 'schema-validation-output.json');
  const negativeSentinel = path.join(negativeDir, 'sentinel.json');
  const positiveCatalog = withAdvisory([commandSpec({ out: positiveOut })]);
  const negativeCatalog = withAdvisory([commandSpec({ out: null, args: ['-e', `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(negativeSentinel)}, 'spawned');`], argPaths: [], expectedArtifacts: [] })]);
  const childCode = `
    import fs from 'node:fs';
    import path from 'node:path';
    import { runVerificationPlan, VERIFICATION_RUNNER_VERSION } from '@vibe-engineer/verification';
    import { validateArtifactFile } from '@vibe-engineer/artifacts';
    const approvedPlan = ${JSON.stringify(approvedPlan)};
    const repoRoot = ${JSON.stringify(repoRoot)};
    const positiveDir = ${JSON.stringify(positiveDir)};
    const negativeDir = ${JSON.stringify(negativeDir)};
    const negativeSentinel = ${JSON.stringify(negativeSentinel)};
    fs.mkdirSync(positiveDir, { recursive: true });
    fs.mkdirSync(negativeDir, { recursive: true });
    const positive = await runVerificationPlan({ implementationPlanPath: approvedPlan, evidenceRoot: positiveDir, projectRoot: repoRoot, runId: 'i09a-rerun-cli-positive', runnerCatalog: ${JSON.stringify(positiveCatalog)} });
    const positiveValidation = positive.evidencePackets.map((packet) => ({ packet, ok: validateArtifactFile(packet, { kind: 'evidence_packet' }).ok }));
    const negative = await runVerificationPlan({ implementationPlanPath: approvedPlan, evidenceRoot: negativeDir, projectRoot: repoRoot, runId: 'i09a-rerun-cli-negative-policy', runnerCatalog: ${JSON.stringify(negativeCatalog)} });
    const negativeValidation = negative.evidencePackets.map((packet) => ({ packet, ok: validateArtifactFile(packet, { kind: 'evidence_packet' }).ok, failureDetails: JSON.parse(fs.readFileSync(packet, 'utf8')).failureDetails || null }));
    fs.writeFileSync(path.join(${JSON.stringify(dir)}, 'cli-context-result.json'), JSON.stringify({ version: VERIFICATION_RUNNER_VERSION, positive, positiveValidation, negative, negativeValidation, negativeSentinelExists: fs.existsSync(negativeSentinel) }, null, 2));
  `;
  const spawnResult = await spawnNode(['--input-type=module', '-e', childCode], path.join(repoRoot, 'packages/cli'));
  await writeJson(path.join(dir, 'spawn-result.json'), spawnResult);
  if (spawnResult.code !== 0) {
    addFinding('WRB2.5-CLI-CONTEXT-FAILED', 'critical', 'CLI-context package import/exercise process failed.', { spawnResultPath: path.join(dir, 'spawn-result.json') });
    return;
  }
  const result = readJson(path.join(dir, 'cli-context-result.json'));
  if (result.version !== VERIFICATION_RUNNER_VERSION) addFinding('WRB2.5-VERSION-MISMATCH', 'critical', 'CLI context did not exercise current verification package API.', { result });
  if (!['passed', 'advisory_warning'].includes(String(result.positive.status))) addFinding('WRB2.5-POSITIVE-NOT-PASS', 'critical', 'CLI-context positive run did not pass.', { result });
  if (!result.positiveValidation.every((entry) => entry.ok)) addFinding('WRB2.5-POSITIVE-PACKET-INVALID', 'critical', 'CLI-context positive packet failed real artifacts validation.', { result });
  const negativePolicyFailure = result.negativeValidation.find((entry) => entry.failureDetails?.code === 'COMMAND_POLICY_DENIED');
  if (result.negative.status !== 'blocked' || negativePolicyFailure?.failureDetails?.classification !== 'safety_or_security_policy_failure') addFinding('WRB2.5-NEGATIVE-NOT-FAIL-CLOSED', 'critical', 'CLI-context negative policy run did not fail closed with schema-compatible classification.', { result });
  if (result.negativeSentinelExists) addFinding('WRB2.5-NEGATIVE-SENTINEL', 'critical', 'CLI-context negative policy run produced side-effect sentinel.', { sentinel: negativeSentinel });
}

async function classificationSweep() {
  /** @type {AnyRecord} */ const summary = { packetCount: 0, invalid: [], invalidClassifications: [], badCodes: [], obsoleteClassifications: [] };
  const allowed = new Set(Object.values(EVIDENCE_FAILURE_CLASSIFICATIONS));
  const unique = [...new Set(allPacketPaths)];
  for (const packetPath of unique) {
    summary.packetCount += 1;
    const validation = validateArtifactFile(packetPath, { kind: 'evidence_packet' });
    if (!validation.ok) summary.invalid.push({ packetPath, errors: /** @type {AnyRecord} */ (validation).errors });
    const packet = readJson(packetPath);
    if (packet.failureDetails) {
      const classification = String(packet.failureDetails.classification || '');
      const code = String(packet.failureDetails.code || '');
      if (!allowed.has(classification)) summary.invalidClassifications.push({ packetPath, classification });
      if (classification === 'resource_limit_exceeded') summary.obsoleteClassifications.push({ packetPath, classification });
      if (!/^[A-Z0-9_]+$/.test(code)) summary.badCodes.push({ packetPath, code });
    }
  }
  const badCandidate = readJson(path.join(repoRoot, 'packages/artifacts/fixtures/valid/evidence_packet.json'));
  badCandidate.artifactId = 'i09a-rerun-bad-classification';
  badCandidate.status = 'blocked';
  badCandidate.result = 'blocked';
  badCandidate.failureDetails = { code: 'BAD', message: 'bad classification', classification: 'resource_limit_exceeded' };
  const invalidCandidate = validateArtifact(badCandidate);
  summary.invalidCandidateOk = invalidCandidate.ok;
  await writeJson(path.join(witnessRoot, 'classification-sweep.json'), summary);
  if (summary.invalid.length || summary.invalidClassifications.length || summary.badCodes.length || summary.obsoleteClassifications.length || invalidCandidate.ok) addFinding('CLASSIFICATION-SWEEP-FAILED', 'critical', 'Evidence Packet classification/code/schema sweep failed.', summary);
}

async function main() {
  await fsp.mkdir(witnessRoot, { recursive: true });
  await adjudicationSmoke();
  await secretWitnesses();
  await commandPolicyWitnesses();
  await pathSafetyWitnesses();
  await resourceWitnesses();
  await realBoundaryWitnesses();
  await cliContextWitness();
  await classificationSweep();
  const summary = {
    ok: findings.length === 0,
    verdict: findings.length === 0 ? 'PASS' : 'NEEDS-FIX',
    runnerVersion: VERIFICATION_RUNNER_VERSION,
    caseCount: cases.length,
    cases,
    findings,
    packetCount: [...new Set(allPacketPaths)].length,
    witnessRoot
  };
  await writeJson(path.join(witnessRoot, 'targeted-witness-summary.json'), summary);
  console.log(JSON.stringify({ ok: summary.ok, findingCount: findings.length, summaryPath: path.join(witnessRoot, 'targeted-witness-summary.json') }, null, 2));
  if (findings.length > 0) process.exitCode = 1;
}

await main();
