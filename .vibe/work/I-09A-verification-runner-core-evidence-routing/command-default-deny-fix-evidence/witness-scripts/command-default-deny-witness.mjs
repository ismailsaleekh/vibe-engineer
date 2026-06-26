// @ts-check
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../../..');
const { runVerificationPlan } = await import(pathToFileURL(path.join(repoRoot, 'packages/verification/src/index.js')).href);
const { validateArtifactFile } = await import(pathToFileURL(path.join(repoRoot, 'packages/artifacts/src/index.js')).href);
const packageRoot = path.join(repoRoot, 'packages/verification');
const approvedPlan = path.join(packageRoot, 'fixtures/plans/approved-plan.json');
const runnersDir = path.join(packageRoot, 'fixtures/runners');
const witnessRoot = path.resolve(process.argv[2] || path.join(repoRoot, '.vibe/work/I-09A-verification-runner-core-evidence-routing/command-default-deny-fix-evidence/targeted-witnesses'));

/** @typedef {Record<string, any>} AnyRecord */
/** @param {string} file @returns {AnyRecord} */
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
/** @param {string} file @param {unknown} data @returns {Promise<void>} */
async function writeJson(file, data) { await fsp.mkdir(path.dirname(file), { recursive: true }); await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8'); }
/** @param {number} index @param {string} value @returns {{index:number,value:string}} */
function publicArg(index, value) { return { index, value }; }
/** @param {number} index @param {string} kind @returns {{index:number,kind:string}} */
function scalarArg(index, kind) { return { index, kind }; }
/** @param {AnyRecord} result @returns {AnyRecord[]} */
function packets(result) { return result.evidencePackets.map((p) => readJson(String(p))); }
/** @param {AnyRecord} result @param {string} code @returns {AnyRecord|undefined} */
function failure(result, code) { return packets(result).find((p) => p.failureDetails?.code === code); }
/** @param {AnyRecord} result @returns {void} */
function validatePackets(result) { for (const packet of result.evidencePackets) { const v = validateArtifactFile(String(packet), { kind: 'evidence_packet' }); assert.equal(v.ok, true, `${packet} validates`); } }
/** @param {string} caseName @returns {Promise<string>} */
async function planFor(caseName) {
  const plan = readJson(approvedPlan);
  for (const item of plan.verificationDelta.requiredItems) item.action = item.id === 'schema-validation' ? 'add' : 'not_applicable';
  const planPath = path.join(witnessRoot, caseName, 'plan.json');
  await writeJson(planPath, plan);
  return planPath;
}
/** @param {Partial<AnyRecord>} overrides @returns {AnyRecord} */
function commandSpec(overrides = {}) {
  const out = typeof overrides.out === 'string' ? overrides.out : '';
  const script = typeof overrides.script === 'string' ? overrides.script : path.join(runnersDir, 'pass-runner.mjs');
  const args = Array.isArray(overrides.args) ? overrides.args : out ? [script, out] : [script];
  const argPaths = Array.isArray(overrides.argPaths) ? overrides.argPaths : [{ index: 0, root: 'projectRoot' }, ...(out ? [{ index: 1, root: 'evidenceRoot' }] : [])];
  return {
    id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, kind: 'command',
    command: process.execPath, args, cwd: '.', expectedArtifacts: out ? [out] : [], argPaths, publicArgs: [], scalarArgs: [],
    safety: { classification: 'local_deterministic_write', timeoutMs: 1000, maxStdoutBytes: 8192, maxStderrBytes: 8192, maxOutputBytes: 8192, allowedReadRoots: [repoRoot], allowedWriteRoots: [witnessRoot], envAllowlist: [], passThroughEnv: false, cwdContainedInProjectRoot: true, expectedArtifactsContained: true },
    ...overrides,
    safety: { classification: 'local_deterministic_write', timeoutMs: 1000, maxStdoutBytes: 8192, maxStderrBytes: 8192, maxOutputBytes: 8192, allowedReadRoots: [repoRoot], allowedWriteRoots: [witnessRoot], envAllowlist: [], passThroughEnv: false, cwdContainedInProjectRoot: true, expectedArtifactsContained: true, ...(overrides.safety || {}) }
  };
}
/** @param {string} caseName @param {AnyRecord} spec @returns {Promise<{dir:string,result:AnyRecord}>} */
async function runCase(caseName, spec) {
  const dir = path.join(witnessRoot, caseName);
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
  const planPath = await planFor(caseName);
  const result = await runVerificationPlan({ implementationPlanPath: planPath, evidenceRoot: dir, projectRoot: repoRoot, runId: `i09a-dd-${caseName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`, runnerCatalog: [spec] });
  validatePackets(result);
  await writeJson(path.join(dir, 'aggregate-result.json'), result);
  return { dir, result };
}
/** @param {string} caseName @param {AnyRecord} spec @param {string} code @returns {Promise<AnyRecord>} */
async function expectBlocked(caseName, spec, code) {
  const { dir, result } = await runCase(caseName, spec);
  const packet = failure(result, code);
  assert.ok(packet, `${caseName} expected ${code}`);
  assert.equal(packet.failureDetails.classification, 'safety_or_security_policy_failure');
  assert.equal(result.status, 'blocked');
  return { id: caseName, status: result.status, code, dir };
}

await fsp.mkdir(witnessRoot, { recursive: true });
/** @type {AnyRecord[]} */
const cases = [];

const positiveOut = path.join(witnessRoot, 'positive-allowed-node-runner', 'out.json');
const positive = await runCase('positive-allowed-node-runner', commandSpec({ out: positiveOut }));
assert.match(positive.result.status, /^(passed|advisory_warning)$/);
cases.push({ id: 'positive-allowed-node-runner', status: positive.result.status, dir: positive.dir });

const touchSentinel = path.join(witnessRoot, 'unknown-side-effect-touch', 'unknown-touch-sentinel');
cases.push(await expectBlocked('unknown-side-effect-touch', commandSpec({ command: 'touch', args: [touchSentinel], argPaths: [{ index: 0, root: 'evidenceRoot' }], expectedArtifacts: [] }), 'COMMAND_POLICY_DENIED'));
assert.equal(fs.existsSync(touchSentinel), false, 'touch sentinel must not exist');

cases.push(await expectBlocked('shell-string-command', commandSpec({ command: 'node -e "0"', args: [], argPaths: [], expectedArtifacts: [] }), 'COMMAND_POLICY_DENIED'));
cases.push(await expectBlocked('shell-true', commandSpec({ shell: true, out: path.join(witnessRoot, 'shell-true', 'out.json') }), 'COMMAND_POLICY_DENIED'));
cases.push(await expectBlocked('package-manager', commandSpec({ command: 'pnpm', args: ['install'], argPaths: [], publicArgs: [publicArg(0, 'install')], expectedArtifacts: [] }), 'COMMAND_POLICY_DENIED'));
cases.push(await expectBlocked('git', commandSpec({ command: 'git', args: ['status'], argPaths: [], publicArgs: [publicArg(0, 'status')], expectedArtifacts: [] }), 'COMMAND_POLICY_DENIED'));
cases.push(await expectBlocked('node-eval', commandSpec({ args: ['-e', 'console.log(1)'], argPaths: [], publicArgs: [publicArg(1, 'console.log(1)')], expectedArtifacts: [] }), 'COMMAND_POLICY_DENIED'));
cases.push(await expectBlocked('no-typed-runner-path', commandSpec({ args: [path.join(runnersDir, 'pass-runner.mjs')], argPaths: [], expectedArtifacts: [] }), 'COMMAND_POLICY_DENIED'));
cases.push(await expectBlocked('unknown-non-node-executable', commandSpec({ command: '/usr/bin/true', args: [], argPaths: [], expectedArtifacts: [] }), 'UNSAFE_PATH'));
cases.push(await expectBlocked('unsupported-kind', { ...commandSpec({ out: path.join(witnessRoot, 'unsupported-kind', 'out.json') }), kind: 'mystery' }, 'UNSUPPORTED_COMMAND'));
cases.push(await expectBlocked('unsupported-validator', { id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, kind: 'validator', validator: 'unknownValidator' }, 'UNSUPPORTED_ACTION'));
cases.push(await expectBlocked('unsafe-cwd', commandSpec({ cwd: '..', out: path.join(witnessRoot, 'unsafe-cwd', 'out.json') }), 'UNSAFE_CWD'));
cases.push(await expectBlocked('env-pass-through', commandSpec({ out: path.join(witnessRoot, 'env-pass-through', 'out.json'), safety: { passThroughEnv: true } }), 'ENVIRONMENT_POLICY_DENIED'));

const aggregate = await runCase('aggregate-output-cap', commandSpec({ script: path.join(runnersDir, 'large-output-runner.mjs'), args: [path.join(runnersDir, 'large-output-runner.mjs'), 'both', '80'], argPaths: [{ index: 0, root: 'projectRoot' }], publicArgs: [publicArg(1, 'both')], scalarArgs: [scalarArg(2, 'byte_count')], expectedArtifacts: [], safety: { maxStdoutBytes: 128, maxStderrBytes: 128, maxOutputBytes: 96 } }));
const aggregatePacket = failure(aggregate.result, 'OUTPUT_LIMIT_EXCEEDED');
assert.ok(aggregatePacket, 'aggregate cap must record OUTPUT_LIMIT_EXCEEDED');
assert.equal(aggregatePacket.failureDetails.classification, 'safety_or_security_policy_failure');
cases.push({ id: 'aggregate-output-cap', status: aggregate.result.status, code: 'OUTPUT_LIMIT_EXCEEDED', dir: aggregate.dir });

cases.push(await expectBlocked('stdout-cap', commandSpec({ script: path.join(runnersDir, 'large-output-runner.mjs'), args: [path.join(runnersDir, 'large-output-runner.mjs'), 'stdout', '4096'], argPaths: [{ index: 0, root: 'projectRoot' }], publicArgs: [publicArg(1, 'stdout')], scalarArgs: [scalarArg(2, 'byte_count')], expectedArtifacts: [], safety: { maxStdoutBytes: 64 } }), 'STDOUT_LIMIT_EXCEEDED'));
cases.push(await expectBlocked('stderr-cap', commandSpec({ script: path.join(runnersDir, 'large-output-runner.mjs'), args: [path.join(runnersDir, 'large-output-runner.mjs'), 'stderr', '4096'], argPaths: [{ index: 0, root: 'projectRoot' }], publicArgs: [publicArg(1, 'stderr')], scalarArgs: [scalarArg(2, 'byte_count')], expectedArtifacts: [], safety: { maxStderrBytes: 64 } }), 'STDERR_LIMIT_EXCEEDED'));
cases.push(await expectBlocked('timeout', commandSpec({ script: path.join(runnersDir, 'sleep-runner.mjs'), args: [path.join(runnersDir, 'sleep-runner.mjs'), '2000'], argPaths: [{ index: 0, root: 'projectRoot' }], scalarArgs: [scalarArg(1, 'duration_ms')], expectedArtifacts: [], safety: { timeoutMs: 100 } }), 'COMMAND_TIMEOUT'));

await writeJson(path.join(witnessRoot, 'command-default-deny-summary.json'), { ok: true, caseCount: cases.length, cases, touchSentinelExists: fs.existsSync(touchSentinel) });
console.log(JSON.stringify({ ok: true, witnessRoot, caseCount: cases.length }, null, 2));
