import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { createCommandLoader } from '../../../packages/cli/src/command-loader/loader.js';
import { validateCliResultEnvelope } from '../../../packages/cli/src/envelope/result-envelope.js';
import { sanitizeArgvForMetadata } from '../../../packages/cli/src/errors/sanitization.js';
import { validateArtifactFile } from '../../../packages/artifacts/src/index.js';
import verifyCommand from '../../../packages/cli/src/commands/verify/index.ts';

const repoRoot = path.resolve('/Users/lizavasilyeva/work/vibe-engineer');
const workRoot = path.join(repoRoot, '.vibe/work/I-09B-verify-cli-command');
const evidenceRoot = path.join(workRoot, 'evidence');
const commandLogRoot = path.join(workRoot, 'command-log');
const approvedPlan = path.join(repoRoot, 'packages/verification/fixtures/plans/approved-plan.json');
const draftPlan = path.join(repoRoot, 'packages/verification/fixtures/plans/draft-plan.json');
const missingCategoryPlan = path.join(repoRoot, 'packages/verification/fixtures/plans/missing-category-plan.json');
const runnersDir = path.join(repoRoot, 'packages/verification/fixtures/runners');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
async function writeJson(file, data) { await fsp.mkdir(path.dirname(file), { recursive: true }); await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8'); return file; }
function assertEnvelope(envelope) { const v = validateCliResultEnvelope(envelope); assert.equal(v.ok, true, JSON.stringify(v.errors)); }
function assertPackets(paths) { for (const p of paths) assert.equal(validateArtifactFile(p, { kind: 'evidence_packet' }).ok, true, p); }
function publicArg(index, value) { return { index, value }; }
function scalarArg(index, kind) { return { index, kind }; }
function commandSpec(options = {}) {
  const { id = 'schema-validation', layer = 'schema_validation', script = 'pass-runner.mjs', out = undefined, blocking = true, evidenceClass = 'deterministic', args = null, safety = {}, extra = {}, publicArgs = [], scalarArgs = [] } = options;
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
function advisorySpec() { return commandSpec({ id: 'advisory-review', layer: 'advisory_review', script: 'fail-runner.mjs', out: null, blocking: false, evidenceClass: 'advisory', extra: { failureClassification: 'advisory_finding' } }); }
function catalogFor(dir) { return [commandSpec({ out: path.join(dir, 'schema-validation-output.json') }), advisorySpec()]; }
async function planVariant(caseName, mutate) { const plan = readJson(approvedPlan); mutate(plan); const file = path.join(evidenceRoot, caseName, 'plan.json'); await writeJson(file, plan); return file; }
function packetPaths(envelope) { return envelope?.payload?.data?.evidencePackets?.map((item) => String(item.path)) ?? []; }
function scanForSecrets(root) { const hits = []; const re = /SECRET[_A-Z0-9-]*|Bearer\s+SECRET|password=SECRET|token=SECRET|api-key\s+SECRET|client-secret=SECRET/g; function walk(dir) { if (!fs.existsSync(dir)) return; for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, entry.name); if (entry.isDirectory()) walk(p); else { const text = fs.readFileSync(p, 'utf8'); if (re.test(text)) hits.push(p); re.lastIndex = 0; } } } walk(root); return hits; }
async function dispatchVerify(caseName, { plan = approvedPlan, catalog = null, runId = caseName.replaceAll('_', '-'), extraArgs = [], resultFile = true } = {}) {
  const caseRoot = path.join(evidenceRoot, caseName);
  await fsp.rm(caseRoot, { recursive: true, force: true });
  await fsp.mkdir(caseRoot, { recursive: true });
  const catalogPath = path.join(caseRoot, 'runner-catalog.json');
  if (catalog !== null) await writeJson(catalogPath, catalog);
  const resultPath = path.join(caseRoot, 'cli-result.json');
  const args = [
    '--implementation-plan', plan,
    '--evidence-root', path.join(caseRoot, 'packets'),
    '--project-root', repoRoot,
    '--run-id', runId,
    '--runner-catalog', catalogPath,
    ...(resultFile ? ['--result-file', resultPath] : []),
    ...extraArgs
  ];
  const invocation = { id: `i09b-${caseName}`, command: 'verify', argv: sanitizeArgvForMetadata(['verify', ...args]), projectRoot: null, configPath: null, startedAt: '2026-06-25T00:00:00.000Z', endedAt: '2026-06-25T00:00:01.000Z' };
  const loader = createCommandLoader([verifyCommand]);
  const result = await loader.dispatch('verify', args, { invocation, packageJsonPath: path.join(repoRoot, 'packages/cli/package.json'), config: null });
  assertEnvelope(result.envelope);
  if (resultFile && fs.existsSync(resultPath)) assert.deepEqual(readJson(resultPath), result.envelope);
  await writeJson(path.join(caseRoot, 'summary.json'), { status: result.envelope.status, exitCode: result.envelope.exitCode, payload: result.envelope.payload, errors: result.envelope.errors, diagnostics: result.envelope.diagnostics, artifacts: result.envelope.artifacts });
  return { caseRoot, resultPath, envelope: result.envelope };
}
async function invalidInvocationCase(caseName, args, expectedClassification = 'invalid_invocation') {
  const caseRoot = path.join(evidenceRoot, caseName);
  await fsp.rm(caseRoot, { recursive: true, force: true });
  await fsp.mkdir(caseRoot, { recursive: true });
  const invocation = { id: `i09b-${caseName}`, command: 'verify', argv: sanitizeArgvForMetadata(['verify', ...args]), projectRoot: null, configPath: null, startedAt: '2026-06-25T00:00:00.000Z', endedAt: '2026-06-25T00:00:01.000Z' };
  const result = await createCommandLoader([verifyCommand]).dispatch('verify', args, { invocation, packageJsonPath: path.join(repoRoot, 'packages/cli/package.json'), config: null });
  assertEnvelope(result.envelope);
  assert.equal(result.envelope.status, 'blocked');
  assert.equal(result.envelope.errors[0].classification, expectedClassification);
  await writeJson(path.join(caseRoot, 'summary.json'), result.envelope);
  return result.envelope;
}
function spawnNode(args, cwd) { return new Promise((resolve) => { const child = spawn(process.execPath, args, { cwd, env: {}, shell: false }); let stdout = ''; let stderr = ''; child.stdout.on('data', (c) => { stdout += String(c); }); child.stderr.on('data', (c) => { stderr += String(c); }); child.on('close', (code) => resolve({ code, stdout, stderr, cwd, argv: [process.execPath, ...args] })); }); }
async function main() {
  await fsp.mkdir(evidenceRoot, { recursive: true });
  await fsp.mkdir(commandLogRoot, { recursive: true });
  const summary = {};

  let p = await dispatchVerify('w-rb3', { catalog: catalogFor(path.join(evidenceRoot, 'w-rb3', 'packets')) });
  assert.equal(p.envelope.status, 'success'); assert.equal(p.envelope.exitCode, 0); assert.ok(packetPaths(p.envelope).length > 0); assertPackets(packetPaths(p.envelope)); summary['w-rb3'] = { status: p.envelope.status, packetCount: packetPaths(p.envelope).length };

  p = await dispatchVerify('p1-cli', { catalog: catalogFor(path.join(evidenceRoot, 'p1-cli', 'packets')), runId: 'p1-cli' });
  assert.equal(p.envelope.status, 'success'); assert.equal(p.envelope.exitCode, 0); assertPackets(packetPaths(p.envelope)); summary['p1-cli'] = { status: p.envelope.status, packetCount: packetPaths(p.envelope).length };

  const n1 = await dispatchVerify('n1-cli', { plan: draftPlan, catalog: catalogFor(path.join(evidenceRoot, 'n1-cli', 'packets')), runId: 'n1-cli' });
  assert.equal(n1.envelope.status, 'blocked'); assert.equal(n1.envelope.errors[0].classification, 'invalid_input'); assert.equal(packetPaths(n1.envelope).length, 0); summary['n1-cli'] = { status: n1.envelope.status, classification: n1.envelope.errors[0].classification };

  const n2 = await dispatchVerify('n2-cli', { catalog: [], runId: 'n2-cli' });
  assert.equal(n2.envelope.status, 'blocked'); assert.equal(n2.envelope.errors[0].classification, 'missing_prerequisite'); assertPackets(packetPaths(n2.envelope)); summary['n2-cli'] = { status: n2.envelope.status, classification: n2.envelope.errors[0].classification };

  const n3 = await dispatchVerify('n3-cli', { catalog: [commandSpec({ script: 'no-artifact-runner.mjs', out: path.join(evidenceRoot, 'n3-cli', 'packets', 'missing-output.json') })], runId: 'n3-cli' });
  assert.equal(n3.envelope.status, 'blocked'); assert.equal(n3.envelope.errors[0].classification, 'missing_prerequisite'); assertPackets(packetPaths(n3.envelope)); summary['n3-cli'] = { status: n3.envelope.status, classification: n3.envelope.errors[0].classification };

  const n4 = await dispatchVerify('n4-cli', { plan: missingCategoryPlan, catalog: [], runId: 'n4-cli' });
  assert.equal(n4.envelope.status, 'blocked'); assert.equal(n4.envelope.errors[0].classification, 'invalid_input'); summary['n4-cli'] = { status: n4.envelope.status, classification: n4.envelope.errors[0].classification };

  const schemaOnlyPlan = await planVariant('schema-only-cli', (plan) => { for (const item of plan.verificationDelta.requiredItems) item.action = item.id === 'schema-validation' ? 'add' : 'not_applicable'; });
  const n5 = await dispatchVerify('n5-cli', { plan: schemaOnlyPlan, catalog: [{ id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, kind: 'validator', validator: 'malformedEvidencePacketCandidate' }], runId: 'n5-cli' });
  assert.equal(n5.envelope.status, 'blocked'); assert.equal(n5.envelope.errors[0].classification, 'invalid_input'); assertPackets(packetPaths(n5.envelope)); summary['n5-cli'] = { status: n5.envelope.status, classification: n5.envelope.errors[0].classification };

  const n6 = await dispatchVerify('n6-cli', { plan: schemaOnlyPlan, catalog: [{ id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, kind: 'validator', validator: 'throwInternalError' }], runId: 'n6-cli' });
  assert.equal(n6.envelope.status, 'failure'); assert.equal(n6.envelope.errors[0].classification, 'internal_error'); assertPackets(packetPaths(n6.envelope)); summary['n6-cli'] = { status: n6.envelope.status, classification: n6.envelope.errors[0].classification };

  const n7Plan = await planVariant('n7-cli-plan', (plan) => { for (const item of plan.verificationDelta.requiredItems) item.action = item.layer === 'advisory_review' ? 'add' : 'not_applicable'; });
  const n7 = await dispatchVerify('n7-cli', { plan: n7Plan, catalog: [advisorySpec()], runId: 'n7-cli' });
  assert.equal(n7.envelope.status, 'success'); assert.equal(n7.envelope.exitCode, 0); assert.equal(n7.envelope.payload.data.runnerStatus, 'advisory_warning'); assertPackets(packetPaths(n7.envelope)); summary['n7-cli'] = { status: n7.envelope.status, runnerStatus: n7.envelope.payload.data.runnerStatus };

  await invalidInvocationCase('invalid-unknown-flag', ['--unknown']);
  await invalidInvocationCase('invalid-positional', ['unexpected']);
  await invalidInvocationCase('invalid-missing-value', ['--implementation-plan']);
  await invalidInvocationCase('invalid-duplicate', ['--implementation-plan', approvedPlan, '--implementation-plan', approvedPlan]);
  const malformedCatalog = path.join(evidenceRoot, 'invalid-malformed-carrier-source', 'bad.json'); await writeJson(malformedCatalog, { bad: true });
  await invalidInvocationCase('invalid-malformed-catalog', ['--implementation-plan', approvedPlan, '--evidence-root', path.join(evidenceRoot, 'invalid-malformed-catalog', 'packets'), '--project-root', repoRoot, '--run-id', 'invalid-malformed-catalog', '--runner-catalog', malformedCatalog], 'invalid_input');
  await invalidInvocationCase('invalid-secret-input', ['--implementation-plan', approvedPlan, '--evidence-root', path.join(evidenceRoot, 'invalid-secret-input', 'packets'), '--project-root', repoRoot, '--run-id', 'SECRET_TOKEN_VALUE', '--runner-catalog', malformedCatalog], 'invalid_input');
  summary.invalidInvocation = 'covered unknown flag, positional, missing value, duplicate, malformed catalog, and secret-like value';

  const r1 = await spawnNode(['packages/cli/src/entry/vibe-engineer.js', '--json', '--non-interactive', 'verify'], repoRoot);
  await writeJson(path.join(evidenceRoot, 'r1', 'spawn.json'), r1);
  assert.equal(r1.code, 2); assert.equal(JSON.parse(r1.stdout).errors[0].classification, 'unsupported_operation'); summary.r1 = { exit: r1.code, classification: JSON.parse(r1.stdout).errors[0].classification };

  const r2 = await spawnNode(['packages/cli/src/entry/vibe-engineer.js', '--json', '--non-interactive', 'foundation', '--status', 'success'], repoRoot);
  await writeJson(path.join(evidenceRoot, 'r2', 'foundation-spawn.json'), r2);
  assert.equal(r2.code, 0); assert.equal(JSON.parse(r2.stdout).status, 'success'); summary.r2 = { exit: r2.code, status: JSON.parse(r2.stdout).status };

  const r3 = await dispatchVerify('r3', { catalog: [commandSpec({ script: 'secret-output-runner.mjs', out: path.join(evidenceRoot, 'r3', 'packets', 'secret-output.txt') }), advisorySpec()], runId: 'r3' });
  assert.equal(r3.envelope.status, 'success'); assertPackets(packetPaths(r3.envelope)); const secretHits = scanForSecrets(path.join(evidenceRoot, 'r3')); assert.deepEqual(secretHits, []); summary.r3 = { status: r3.envelope.status, secretPatternHits: secretHits.length };

  await writeJson(path.join(evidenceRoot, 'witness-summary.json'), summary);
  console.log(JSON.stringify({ ok: true, cases: Object.keys(summary), summaryPath: path.join(evidenceRoot, 'witness-summary.json') }));
}

main().catch(async (error) => { await writeJson(path.join(evidenceRoot, 'witness-failure.json'), { name: error?.name, message: error?.message, stack: error?.stack }); console.error(error); process.exitCode = 1; });
