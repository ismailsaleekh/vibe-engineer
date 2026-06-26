import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { runVerificationPlan } from '@vibe-engineer/verification';
import { validateArtifactFile } from '@vibe-engineer/artifacts';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.join(repoRoot, '.vibe/work/I-09A-verification-runner-core-evidence-routing/validation-fix-evidence/targeted-fix-witness-output');
const planPath = path.join(evidenceRoot, 'plan.json');
const basePlanPath = path.join(repoRoot, 'packages/verification/fixtures/plans/approved-plan.json');
const runnersDir = path.join(repoRoot, 'packages/verification/fixtures/runners');

await fsp.rm(evidenceRoot, { recursive: true, force: true });
await fsp.mkdir(evidenceRoot, { recursive: true });
const plan = JSON.parse(await fsp.readFile(basePlanPath, 'utf8'));
for (const item of plan.verificationDelta.requiredItems) {
  item.action = item.id === 'schema-validation' ? 'add' : 'not_applicable';
  if (item.action === 'not_applicable') item.rationale = 'Targeted validation-fix witness records non-subject item without execution.';
}
await fsp.writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

function spec(overrides = {}) {
  const out = overrides.out ?? path.join(evidenceRoot, 'out.json');
  const script = overrides.script ?? path.join(runnersDir, 'pass-runner.mjs');
  return {
    id: 'schema-validation',
    requiredItemIds: ['schema-validation'],
    layer: 'schema_validation',
    evidenceClass: 'deterministic',
    blocking: true,
    kind: 'command',
    command: process.execPath,
    args: overrides.args ?? [script, out],
    cwd: '.',
    expectedArtifacts: overrides.expectedArtifacts ?? [out],
    argPaths: overrides.argPaths ?? [{ index: 0, root: 'projectRoot' }, { index: 1, root: 'evidenceRoot' }],
    publicArgs: overrides.publicArgs ?? [],
    scalarArgs: overrides.scalarArgs ?? [],
    safety: {
      classification: 'local_deterministic_write',
      timeoutMs: 2000,
      maxStdoutBytes: 8192,
      maxStderrBytes: 8192,
      maxOutputBytes: 8192,
      allowedReadRoots: [repoRoot],
      allowedWriteRoots: [path.dirname(out)],
      envAllowlist: [],
      passThroughEnv: false,
      cwdContainedInProjectRoot: true,
      expectedArtifactsContained: true,
      ...(overrides.safety ?? {})
    }
  };
}

async function run(name, runnerSpec) {
  const dir = path.join(evidenceRoot, name);
  await fsp.mkdir(dir, { recursive: true });
  const result = await runVerificationPlan({ implementationPlanPath: planPath, evidenceRoot: dir, projectRoot: repoRoot, runId: `fix-${name.replaceAll('_', '-')}`, runnerCatalog: [runnerSpec] });
  await fsp.writeFile(path.join(dir, 'aggregate-result.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  for (const packet of result.evidencePackets) {
    const validation = validateArtifactFile(packet, { kind: 'evidence_packet' });
    assert.equal(validation.ok, true, `${packet} validates`);
  }
  return { dir, result };
}

function findFailure(result, code) {
  return result.failures.find((failure) => failure.code === code);
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(p));
    else files.push(p);
  }
  return files;
}

const secret = ['SECRET', 'ARGV', 'FIX', 'VALUE'].join('_');
const secretRun = await run('secret-argv-denied', spec({
  out: null,
  args: [path.join(runnersDir, 'pass-runner.mjs'), secret],
  expectedArtifacts: [],
  argPaths: [{ index: 0, root: 'projectRoot' }],
  scalarArgs: [{ index: 1, kind: 'public_literal' }]
}));
assert.ok(findFailure(secretRun.result, 'COMMAND_POLICY_DENIED'));
for (const file of walk(secretRun.dir)) {
  assert.equal((await fsp.readFile(file, 'utf8')).includes(secret), false, `${file} leaked secret argv`);
}

const sentinel = path.join(evidenceRoot, 'node-eval-sentinel.txt');
const evalRun = await run('node-eval-denied', spec({
  out: null,
  args: ['-e', `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(sentinel)}, 'spawned');`],
  expectedArtifacts: [],
  argPaths: [],
  publicArgs: [{ index: 1, value: `import fs from 'node:fs'; fs.writeFileSync(${JSON.stringify(sentinel)}, 'spawned');` }]
}));
assert.ok(findFailure(evalRun.result, 'COMMAND_POLICY_DENIED'));
assert.equal(fs.existsSync(sentinel), false, 'node -e sentinel must not be created');

const symlinkDir = path.join(evidenceRoot, 'symlink-setup');
await fsp.mkdir(symlinkDir, { recursive: true });
const symlinkPath = path.join(symlinkDir, 'package-json-link');
await fsp.symlink(path.join(repoRoot, 'package.json'), symlinkPath);
const symlinkRun = await run('symlink-artifact-denied', spec({ out: symlinkPath }));
assert.ok(findFailure(symlinkRun.result, 'UNSAFE_PATH'));

const classifications = {};
for (const file of walk(evidenceRoot).filter((p) => path.basename(p).startsWith('evidence_') && p.endsWith('.json'))) {
  const packet = JSON.parse(await fsp.readFile(file, 'utf8'));
  if (packet.failureDetails) classifications[packet.failureDetails.classification] = (classifications[packet.failureDetails.classification] ?? 0) + 1;
  assert.notEqual(packet.failureDetails?.classification, 'resource_limit_exceeded');
  assert.notEqual(packet.failureDetails?.classification, 'blocked');
  assert.notEqual(packet.failureDetails?.classification, 'denied');
}

await fsp.writeFile(path.join(evidenceRoot, 'targeted-summary.json'), `${JSON.stringify({ ok: true, secretArgv: secretRun.result.status, nodeEval: evalRun.result.status, sentinelExists: fs.existsSync(sentinel), symlink: symlinkRun.result.status, classifications }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, evidenceRoot }, null, 2));
