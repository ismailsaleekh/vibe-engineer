import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const cliDir = join(repoRoot, 'packages/cli');
const entry = join(cliDir, 'src/entry/vibe-engineer.js');
const outRoot = join(repoRoot, '.vibe/work/I-02A-cli-loader-envelope/evidence/validation/harness');
rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

const secretCanary = 'VALIDATION_SECRET_CANARY_02A_9f1443c9';
const summary = {
  ok: true,
  repoRoot,
  cliDir,
  entry,
  outRoot,
  cases: [],
  findings: []
};

function redact(value) {
  return typeof value === 'string' ? value.replaceAll(secretCanary, '<redacted-validation-canary>') : value;
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9_.-]+/g, '_');
}

function recordCase(name, kind, result, extra = {}) {
  const item = {
    name,
    kind,
    status: result.status,
    signal: result.signal,
    stdoutBytes: result.stdout?.length ?? 0,
    stderrBytes: result.stderr?.length ?? 0,
    stdoutContainsSecretCanary: result.stdout?.includes(secretCanary) ?? false,
    stderrContainsSecretCanary: result.stderr?.includes(secretCanary) ?? false,
    ...extra
  };
  summary.cases.push(item);
  if (item.stdoutContainsSecretCanary || item.stderrContainsSecretCanary || extra.resultFileContainsSecretCanary) {
    summary.findings.push({ name, severity: 'major-local', issue: 'secret canary leaked into process carrier', item });
  }
  return item;
}

function writeCaseFiles(name, result, commandForEvidence) {
  const base = join(outRoot, safeName(name));
  writeFileSync(`${base}.cmd.txt`, `${redact(commandForEvidence)}\n`, 'utf8');
  writeFileSync(`${base}.stdout`, redact(result.stdout ?? ''), 'utf8');
  writeFileSync(`${base}.stderr`, redact(result.stderr ?? ''), 'utf8');
  writeFileSync(`${base}.exit`, `${result.status}\n`, 'utf8');
  return base;
}

function parseEnvelopeFromStdout(name, result, { allowEmpty = false } = {}) {
  const nonEmptyLines = (result.stdout ?? '').split(/\r?\n/).filter((line) => line.length > 0);
  if (allowEmpty && nonEmptyLines.length === 0) return { envelope: null, nonEmptyLines };
  assert.equal(nonEmptyLines.length, 1, `${name}: expected exactly one stdout JSON line`);
  return { envelope: JSON.parse(nonEmptyLines[0]), nonEmptyLines };
}

function runCli(name, args, options = {}) {
  const result = spawnSync(process.execPath, [entry, ...args], { cwd: repoRoot, encoding: 'utf8' });
  writeCaseFiles(name, result, `cwd=${repoRoot} ${process.execPath} ${entry} ${args.map(redact).join(' ')}`);
  const parsed = options.expectStdoutJson === false ? { envelope: null, nonEmptyLines: [] } : parseEnvelopeFromStdout(name, result, { allowEmpty: options.allowEmptyStdout });
  recordCase(name, 'cli-spawn', result, {
    args: args.map(redact),
    stdoutJsonLineCount: parsed.nonEmptyLines.length,
    envelopeStatus: parsed.envelope?.status ?? null,
    envelopeExitCode: parsed.envelope?.exitCode ?? null,
    envelopeErrorClassifications: parsed.envelope?.errors?.map((item) => item.classification) ?? []
  });
  return { result, ...parsed };
}

function runNodeEval(name, code, cwd = repoRoot) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd, encoding: 'utf8' });
  writeCaseFiles(name, result, `cwd=${cwd} ${process.execPath} --input-type=module -e <code:${name}>`);
  recordCase(name, 'node-eval', result, { cwd });
  return result;
}

function runPnpm(name, args, cwd = repoRoot) {
  const result = spawnSync('pnpm', args, { cwd, encoding: 'utf8' });
  writeCaseFiles(name, result, `cwd=${cwd} pnpm ${args.join(' ')}`);
  recordCase(name, 'pnpm', result, { cwd, args });
  return result;
}

function writeFixture(relativePath, content) {
  const target = join(outRoot, 'fixtures', relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  return target;
}

function assertEnvelope(envelope) {
  assert.equal(envelope?.schemaVersion, 'vibe-engineer.cli.result.v1');
  assert.ok(['success', 'failure', 'blocked', 'partial'].includes(envelope.status));
  assert.equal(typeof envelope.invocation.id, 'string');
  assert.equal(typeof envelope.invocation.command, 'string');
  assert.ok(Array.isArray(envelope.invocation.argv));
  assert.equal(typeof envelope.invocation.startedAt, 'string');
  assert.equal(typeof envelope.invocation.endedAt, 'string');
  assert.equal(typeof envelope.payload.kind, 'string');
  assert.equal(typeof envelope.payload.schemaVersion, 'string');
  assert.ok(Array.isArray(envelope.diagnostics));
  assert.ok(Array.isArray(envelope.errors));
  assert.ok(Array.isArray(envelope.artifacts));
}

// Provider import seams through actual package entrypoints.
let res = runNodeEval('provider-import-package-local', `
  const config = await import('@vibe-engineer/config');
  const artifacts = await import('@vibe-engineer/artifacts');
  const required = ['parseVibeConfig','loadVibeConfigFile','loadVibeConfigFromProjectRoot'];
  for (const key of required) if (typeof config[key] !== 'function') throw new Error('missing config export '+key);
  if (typeof artifacts.validateArtifactFile !== 'function') throw new Error('missing validateArtifactFile');
  console.log(JSON.stringify({ok:true, config: required, artifact: 'validateArtifactFile'}));
`, cliDir);
assert.equal(res.status, 0, res.stderr || res.stdout);

res = runPnpm('provider-import-pnpm-filter', ['--filter', 'vibe-engineer', 'exec', 'node', '--input-type=module', '-e', `
  const config = await import('@vibe-engineer/config');
  const artifacts = await import('@vibe-engineer/artifacts');
  if (typeof config.parseVibeConfig !== 'function' || typeof config.loadVibeConfigFile !== 'function' || typeof config.loadVibeConfigFromProjectRoot !== 'function') throw new Error('missing config exports');
  if (typeof artifacts.validateArtifactFile !== 'function') throw new Error('missing artifact validator');
  console.log(JSON.stringify({ok:true}));
`]);
assert.equal(res.status, 0, res.stderr || res.stdout);

// Package-manager bin smoke: attempted, not asserted because pnpm may not materialize self-bin without install/global link.
runPnpm('package-manager-bin-smoke', ['--filter', 'vibe-engineer', 'exec', 'vibe-engineer', 'version', '--json', '--non-interactive']);

res = runPnpm('pnpm-filter-node-entry-spawn', ['--filter', 'vibe-engineer', 'exec', 'node', 'src/entry/vibe-engineer.js', 'version', '--json', '--non-interactive']);
assert.equal(res.status, 0, res.stderr || res.stdout);
assert.equal(JSON.parse(res.stdout).status, 'success');

// Fixtures for config seam.
const validConfigPath = writeFixture('valid-project/vibe-engineer.config.json', JSON.stringify({ agenticHarness: 'pi' }, null, 2));
const validProjectRoot = dirname(validConfigPath);
const malformedConfigPath = writeFixture('malformed-project/vibe-engineer.config.json', '{ not json');
const missingProjectRoot = join(outRoot, 'fixtures', 'missing-project');
mkdirSync(missingProjectRoot, { recursive: true });
const unsupportedHarnessPath = writeFixture('unsupported-harness/vibe-engineer.config.json', JSON.stringify({ agenticHarness: 'codex' }, null, 2));
const unsupportedFormatRoot = join(outRoot, 'fixtures', 'unsupported-format');
mkdirSync(unsupportedFormatRoot, { recursive: true });
writeFileSync(join(unsupportedFormatRoot, 'vibe-engineer.config.yaml'), 'agenticHarness: pi\n', 'utf8');

// Envelope validator and loader public package seams.
res = runNodeEval('envelope-validator-and-loader-public-export', `
  const { createEnvelope, payload, validateCliResultEnvelope } = await import('vibe-engineer/envelope');
  const { createCommandLoader } = await import('vibe-engineer/command-loader');
  const { CliClassification, CliErrorCode } = await import('./src/errors/codes.js');
  const invocation = { id:'validation-invocation', command:'foundation', argv:['foundation'], projectRoot:null, configPath:null, startedAt:'2026-06-24T00:00:00.000Z', endedAt:'2026-06-24T00:00:01.000Z' };
  const diagnostic = (classification = CliClassification.DeterministicFailure) => ({ severity:'error', code:'VE_TEST', classification, message:'test', path:null, span:null, hint:null });
  const error = (classification = CliClassification.DeterministicFailure) => ({ code:'VE_TEST', classification, retryable:false, blocking:true, message:'test', details:{} });
  const validSuccess = createEnvelope({ invocation, status:'success', payload:payload('validation_success', {}) });
  const validFailure = createEnvelope({ invocation, status:'failure', payload:payload('validation_failure', {}), diagnostics:[diagnostic()], errors:[error()] });
  const validBlocked = createEnvelope({ invocation, status:'blocked', payload:payload('validation_blocked', {}), diagnostics:[diagnostic(CliClassification.InvalidInvocation)], errors:[error(CliClassification.InvalidInvocation)] });
  const validPartial = (await createCommandLoader().dispatch('foundation', ['--status', 'partial'], { invocation, packageJsonPath:'./package.json', config:null })).envelope;
  const valids = [validSuccess, validFailure, validBlocked, validPartial].map((e) => validateCliResultEnvelope(e).ok);
  const invalids = {
    badSchema: validateCliResultEnvelope({ ...validSuccess, schemaVersion:'bad' }).ok,
    badStatus: validateCliResultEnvelope({ ...validSuccess, status:'done' }).ok,
    badExit: validateCliResultEnvelope({ ...validSuccess, exitCode:1 }).ok,
    missingPayloadKind: validateCliResultEnvelope({ ...validSuccess, payload:{ schemaVersion:'x', data:{} } }).ok,
    partialExitZero: validateCliResultEnvelope({ ...validPartial, exitCode:0 }).ok,
    partialNoPartialData: validateCliResultEnvelope({ ...validPartial, payload:payload('foundation_result', {}) }).ok,
    partialNoDiagnostic: validateCliResultEnvelope({ ...validPartial, diagnostics:[] }).ok,
    partialNoError: validateCliResultEnvelope({ ...validPartial, errors:[] }).ok,
    badDiagnosticClassification: validateCliResultEnvelope({ ...validFailure, diagnostics:[diagnostic('not_a_stable_classification')], errors:[error()] }).ok,
    failureWithoutErrors: validateCliResultEnvelope({ ...validFailure, diagnostics:[], errors:[] }).ok
  };
  const commands = createCommandLoader().listCommands().map((c) => c.id).sort();
  let duplicateCode = null;
  let malformedCode = null;
  try { createCommandLoader([{ id:'dup', visibility:'internal', description:'a', run(){} }, { id:'dup', visibility:'internal', description:'b', run(){} }]); } catch (error) { duplicateCode = error.code; }
  try { createCommandLoader([{ id:'bad', visibility:'internal', description:'missing run' }]); } catch (error) { malformedCode = error.code; }
  console.log(JSON.stringify({ ok:true, valids, invalids, commands, duplicateCode, malformedCode }));
`, cliDir);
assert.equal(res.status, 0, res.stderr || res.stdout);
const validatorSummary = JSON.parse(res.stdout);
assert.deepEqual(validatorSummary.valids, [true, true, true, true]);
for (const [name, accepted] of Object.entries(validatorSummary.invalids)) {
  if (['badDiagnosticClassification', 'failureWithoutErrors'].includes(name)) continue;
  assert.equal(accepted, false, `${name} should be rejected`);
}
assert.deepEqual(validatorSummary.commands, ['foundation', 'help', 'version']);
assert.equal(validatorSummary.duplicateCode, 'VE_DUPLICATE_COMMAND_ID');
assert.equal(validatorSummary.malformedCode, 'VE_MALFORMED_COMMAND_METADATA');
if (validatorSummary.invalids.badDiagnosticClassification === true) {
  summary.findings.push({ name: 'envelope-validator-stable-classification', severity: 'major-local', issue: 'typed validator accepts diagnostic classification outside the stable DL-07 classification set' });
}
if (validatorSummary.invalids.failureWithoutErrors === true) {
  summary.findings.push({ name: 'envelope-validator-non-success-empty-errors', severity: 'major-local', issue: 'typed validator accepts failure envelope without diagnostic/error code evidence' });
}

// Positive CLI spawns and stdout/result-file carriers.
let cli = runCli('version-success', ['version', '--json', '--non-interactive']);
assert.equal(cli.result.status, 0);
assertEnvelope(cli.envelope);
assert.equal(cli.envelope.status, 'success');
assert.equal(cli.envelope.exitCode, 0);
assert.equal(cli.envelope.payload.kind, 'version_result');
assert.equal(cli.result.stderr, '');

cli = runCli('help-success', ['help', '--json', '--non-interactive']);
assert.equal(cli.result.status, 0);
assertEnvelope(cli.envelope);
assert.deepEqual(cli.envelope.payload.data.commands.map((c) => c.id).sort(), ['foundation', 'help', 'version']);

const resultFile = join(outRoot, 'result-file-positive.json');
cli = runCli('result-file-positive', ['version', '--json', '--result-file', resultFile, '--non-interactive']);
assert.equal(cli.result.status, 0);
assertEnvelope(cli.envelope);
const resultFileEnvelope = JSON.parse(readFileSync(resultFile, 'utf8'));
assert.deepEqual(resultFileEnvelope, cli.envelope);
const leftoverTemps = readdirSync(dirname(resultFile)).filter((name) => name.includes('result-file-positive') && name.endsWith('.tmp'));
assert.deepEqual(leftoverTemps, []);

const quietResultFile = join(outRoot, 'quiet-result-file.json');
cli = runCli('result-file-quiet-positive', ['version', '--json', '--quiet', '--result-file', quietResultFile, '--non-interactive'], { expectStdoutJson: false, allowEmptyStdout: true });
assert.equal(cli.result.status, 0);
assert.equal(cli.result.stdout, '');
assertEnvelope(JSON.parse(readFileSync(quietResultFile, 'utf8')));

cli = runCli('config-success-file', ['version', '--json', '--config', validConfigPath, '--non-interactive']);
assert.equal(cli.result.status, 0);
assertEnvelope(cli.envelope);
assert.equal(cli.envelope.invocation.configPath, validConfigPath);

cli = runCli('config-success-project-root', ['version', '--json', '--project-root', validProjectRoot, '--non-interactive']);
assert.equal(cli.result.status, 0);
assertEnvelope(cli.envelope);
assert.equal(cli.envelope.invocation.projectRoot, validProjectRoot);

// Negative CLI spawns.
const negativeExpectations = [
  ['unknown-command', ['unknown-command', '--json', '--non-interactive'], 2, 'blocked', 'invalid_invocation'],
  ['later-create-command', ['create', '--json', '--non-interactive'], 2, 'blocked', 'unsupported_operation'],
  ['later-doctor-command', ['doctor', '--json', '--non-interactive'], 2, 'blocked', 'unsupported_operation'],
  ['later-config-command', ['config', '--json', '--non-interactive'], 2, 'blocked', 'unsupported_operation'],
  ['unknown-global-flag', ['--bad-global', 'version', '--json', '--non-interactive'], 2, 'blocked', 'invalid_invocation'],
  ['unknown-command-flag', ['version', '--bad-flag', '--json', '--non-interactive'], 2, 'blocked', 'invalid_invocation'],
  ['missing-result-file-value', ['version', '--json', '--result-file'], 2, 'blocked', 'invalid_invocation'],
  ['missing-config-value', ['version', '--json', '--config'], 2, 'blocked', 'invalid_invocation'],
  ['invalid-foundation-status', ['foundation', '--status', 'green', '--json', '--non-interactive'], 2, 'blocked', 'invalid_invocation'],
  ['unexpected-positional', ['version', 'extra', '--json', '--non-interactive'], 2, 'blocked', 'invalid_invocation'],
  ['malformed-config', ['version', '--json', '--config', malformedConfigPath, '--non-interactive'], 3, 'blocked', 'invalid_config'],
  ['missing-config-project-root', ['version', '--json', '--project-root', missingProjectRoot, '--non-interactive'], 3, 'blocked', 'missing_prerequisite'],
  ['unsupported-harness-config', ['version', '--json', '--config', unsupportedHarnessPath, '--non-interactive'], 3, 'blocked', 'invalid_config'],
  ['unsupported-config-format', ['version', '--json', '--project-root', unsupportedFormatRoot, '--non-interactive'], 3, 'blocked', 'invalid_config'],
  ['simulated-foundation-failure', ['foundation', '--status', 'failure', '--json', '--non-interactive'], 1, 'failure', 'deterministic_failure'],
  ['partial-non-green', ['foundation', '--status', 'partial', '--json', '--non-interactive'], 8, 'partial', 'partial_incomplete']
];
for (const [name, args, expectedExit, expectedStatus, expectedClassification] of negativeExpectations) {
  cli = runCli(name, args);
  assert.equal(cli.result.status, expectedExit, `${name}: exit`);
  assertEnvelope(cli.envelope);
  assert.equal(cli.envelope.status, expectedStatus, `${name}: status`);
  assert.equal(cli.envelope.exitCode, expectedExit, `${name}: envelope exit`);
  assert.equal(cli.envelope.errors[0].classification, expectedClassification, `${name}: classification`);
}
assert.equal(cli.envelope.status, 'partial');
assert.ok(cli.envelope.payload.data.partial.incompleteScopes.length > 0);
assert.equal(cli.envelope.payload.data.partial.incompleteScopes[0].blocking, true);

// Invalid result-file path (missing parent) must be typed and not leave target.
const badResultPath = join(outRoot, 'missing-dir', 'out.json');
cli = runCli('invalid-result-file-path', ['version', '--json', '--result-file', badResultPath, '--non-interactive']);
assert.equal(cli.result.status, 5);
assertEnvelope(cli.envelope);
assert.equal(cli.envelope.status, 'blocked');
assert.equal(cli.envelope.errors[0].classification, 'write_conflict');
assert.equal(existsSync(badResultPath), false);

// Secret redaction seam: use synthetic canaries and store only redacted evidence files.
const secretSeparate = runCli('secret-separate-flag', ['version', '--token', secretCanary, '--json', '--non-interactive']);
assert.equal(secretSeparate.envelope.invocation.argv.includes(secretCanary), false);
const secretInline = runCli('secret-inline-flag', [`--password=${secretCanary}`, 'version', '--json', '--non-interactive']);
assert.equal(secretInline.envelope.invocation.argv.some((token) => token.includes(secretCanary)), false);
const secretResultFile = join(outRoot, 'secret-result-file.json');
const secretResult = runCli('secret-inline-result-file', [`--api-key=${secretCanary}`, 'version', '--json', '--result-file', secretResultFile, '--non-interactive']);
let resultFileContainsSecretCanary = false;
if (existsSync(secretResultFile)) {
  const raw = readFileSync(secretResultFile, 'utf8');
  resultFileContainsSecretCanary = raw.includes(secretCanary);
  writeFileSync(secretResultFile, redact(raw), 'utf8');
}
if (secretInline.result.stdout.includes(secretCanary) || secretResult.result.stdout.includes(secretCanary) || resultFileContainsSecretCanary) {
  summary.findings.push({ name: 'secret-redaction-inline-unknown-flag', severity: 'critical', issue: 'inline secret-like unknown flag value appears in CLI machine carrier before redaction' });
}
recordCase('secret-inline-result-file-carrier-scan', 'carrier-scan', { status: secretResult.result.status, stdout: secretResult.result.stdout, stderr: secretResult.result.stderr, signal: null }, { resultFileContainsSecretCanary });

// Artifact seam reachability; minimal I-02A commands accept no artifact path flags.
res = runNodeEval('artifact-provider-reachability', `
  const { validateArtifactFile } = await import('@vibe-engineer/artifacts');
  if (typeof validateArtifactFile !== 'function') throw new Error('missing validateArtifactFile');
  console.log(JSON.stringify({ok:true, acceptsArtifactFlagsInI02A:false}));
`, cliDir);
assert.equal(res.status, 0, res.stderr || res.stdout);

// Contract/source inventory checks.
const commandsDir = join(cliDir, 'src', 'commands');
summary.inventory = {
  commandsDirExists: existsSync(commandsDir),
  packagesCoreExists: existsSync(join(repoRoot, 'packages/core')),
  cliSrcEntries: readdirSync(join(cliDir, 'src')).sort(),
  packageTestScriptWouldMutateImplementationEvidence: true,
  packageTestEvidenceRoot: join(repoRoot, '.vibe/work/I-02A-cli-loader-envelope/evidence/package-test')
};
assert.equal(summary.inventory.commandsDirExists, false);
assert.equal(summary.inventory.packagesCoreExists, false);

summary.ok = summary.findings.length === 0;
writeFileSync(join(outRoot, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify({ ok: summary.ok, findings: summary.findings, caseCount: summary.cases.length, outRoot }, null, 2));
