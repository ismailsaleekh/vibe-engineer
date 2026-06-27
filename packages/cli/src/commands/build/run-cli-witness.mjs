// I-21 W6 — CLI dispatch witness. Proves the real I-02A command loader dispatches the
// `build` command, which imports the real build skill through the declared
// `@vibe-engineer/skills` workspace dependency (Node-24 type-stripping for the .ts
// command), and emits a valid machine envelope with exit-code mapping.
//
// Run: node packages/cli/src/commands/build/run-cli-witness.mjs

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCommandLoader } from '../../command-loader/loader.js';
import { validateCliResultEnvelope } from '../../envelope/result-envelope.js';
import { sanitizeArgvForMetadata } from '../../errors/sanitization.js';
import { buildCommand } from './index.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../../..');
const workRoot = path.join(repoRoot, '.vibe/work/I-21-build-skill-orchestration');
const evidenceRoot = path.join(workRoot, 'evidence', 'witness-cli-dispatch');
const fixturesRoot = path.join(repoRoot, 'packages/verification/fixtures/plans');
const approvedPlan = path.join(fixturesRoot, 'approved-plan.json');
const draftPlan = path.join(fixturesRoot, 'draft-plan.json');
const cliPackageJson = path.join(repoRoot, 'packages/cli/package.json');

const results = [];
function record(name, status, detail = {}) {
  results.push({ name, status, ...detail });
  console.log(`[${status}] ${name}${detail.note ? ' — ' + detail.note : ''}`);
}

function makeInvocation(argv, projectRoot) {
  const startedAt = new Date().toISOString();
  return { id: randomUUID(), command: 'build', argv: sanitizeArgvForMetadata(argv), projectRoot, configPath: null, startedAt, endedAt: startedAt };
}

async function writeJson(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return file;
}

function runnerCatalogPath() {
  return path.join(evidenceRoot, 'runner-catalog.json');
}

async function buildArgs(extra) {
  return [
    '--implementation-plan', approvedPlan,
    '--evidence-root', evidenceRoot,
    '--project-root', repoRoot,
    '--run-id', 'i21-cli-green',
    '--runner-catalog', runnerCatalogPath(),
    ...extra
  ];
}

async function main() {
  await fsp.rm(evidenceRoot, { recursive: true, force: true });
  await fsp.mkdir(evidenceRoot, { recursive: true });

  // Green catalog (validators) — same as the build-chain witness.
  await writeJson(runnerCatalogPath(), [
    { kind: 'validator', validator: 'validateArtifactFile', targetPath: path.relative(repoRoot, approvedPlan), artifactKind: 'implementation_plan', id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true },
    { kind: 'validator', validator: 'validateArtifactFile', targetPath: path.relative(repoRoot, approvedPlan), artifactKind: 'implementation_plan', id: 'advisory-review', requiredItemIds: ['advisory-review'], layer: 'advisory_review', evidenceClass: 'advisory', blocking: false }
  ]);

  // Sanity: the loader registers the build command and lists it.
  const loader = createCommandLoader([buildCommand]);
  record('W6-loader-registers-build', loader.hasCommand('build') ? 'PASS' : 'FAIL', { note: loader.hasCommand('build') ? 'build command registered' : 'MISSING' });
  assert.ok(loader.hasCommand('build'), 'build command must register in the I-02A loader');

  // The build command must be consumed through the real declared workspace dep. Confirm the
  // cli manifest declares @vibe-engineer/skills (EXTEND-I-02A handoff executed).
  const cliPkg = JSON.parse(await fsp.readFile(cliPackageJson, 'utf8'));
  record('W6-cli-declares-skills-dep', cliPkg.dependencies['@vibe-engineer/skills'] === 'workspace:*' ? 'PASS' : 'FAIL', { note: cliPkg.dependencies['@vibe-engineer/skills'] ?? 'absent' });
  assert.equal(cliPkg.dependencies['@vibe-engineer/skills'], 'workspace:*', 'cli must declare @vibe-engineer/skills');

  // --- Green dispatch ---
  const resultFile = path.join(evidenceRoot, 'green-result.json');
  const argv = await buildArgs(['--result-file', resultFile]);
  const greenResult = await loader.dispatch('build', argv, { invocation: makeInvocation(argv, repoRoot), packageJsonPath: cliPackageJson, config: null });
  const greenEnvelope = greenResult.envelope;
  const greenValidation = validateCliResultEnvelope(greenEnvelope);
  const greenArtifacts = Array.isArray(greenEnvelope.artifacts) ? greenEnvelope.artifacts : [];
  const hasBuildResultArtifact = greenArtifacts.some((a) => a && a.kind === 'build_result');
  const greenOk = greenEnvelope.status === 'success' && greenEnvelope.exitCode === 0 && greenValidation.ok && hasBuildResultArtifact;
  record('W6-green-dispatch', greenOk ? 'PASS' : 'FAIL', { note: `status=${greenEnvelope.status} exit=${greenEnvelope.exitCode} envelopeValid=${greenValidation.ok} buildArtifact=${hasBuildResultArtifact}` });
  assert.ok(greenOk, 'green build dispatch must emit success envelope with exit 0 + valid envelope + build_result artifact');
  assert.ok(fs.existsSync(resultFile), 'result file must be written');

  // R3 — secret redaction: inject a secret-like value into a flag and confirm rejection
  // (the build command rejects secret-like input before dispatch; this is the redaction guard).
  const secretArgv = await buildArgs([]);
  secretArgv[secretArgv.indexOf('--run-id') + 1] = 'ghp-aaaaaaaaaaaaaaaaaaaaaa';
  const secretResult = await loader.dispatch('build', secretArgv, { invocation: makeInvocation(secretArgv, repoRoot), packageJsonPath: cliPackageJson, config: null });
  const secretStdout = JSON.stringify(secretResult.envelope);
  const secretRedacted = !/ghp-aaaaaaaaaaaaaaaaaaaaaa/.test(secretStdout) && secretResult.envelope.status !== 'success';
  record('R3-secret-redaction', secretRedacted ? 'PASS' : 'FAIL', { note: secretRedacted ? 'secret-like input rejected + redacted from envelope' : 'LEAK or accepted' });
  assert.ok(secretRedacted, 'secret-like input must be rejected and redacted');

  // --- N2 via CLI: failed verification -> non-green exit + diagnostic (no build_result artifact) ---
  const failCatalogPath = path.join(evidenceRoot, 'failing-catalog.json');
  const failTarget = path.join(evidenceRoot, 'fail-target.json');
  await writeJson(failTarget, [{ not: 'an implementation plan' }]);
  await writeJson(failCatalogPath, [
    { kind: 'validator', validator: 'validateArtifactFile', targetPath: path.relative(repoRoot, failTarget), artifactKind: 'implementation_plan', id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true },
    { kind: 'validator', validator: 'validateArtifactFile', targetPath: path.relative(repoRoot, approvedPlan), artifactKind: 'implementation_plan', id: 'advisory-review', requiredItemIds: ['advisory-review'], layer: 'advisory_review', evidenceClass: 'advisory', blocking: false }
  ]);
  const n2ResultFile = path.join(evidenceRoot, 'n2-result.json');
  const n2Argv = [
    '--implementation-plan', approvedPlan,
    '--evidence-root', path.join(evidenceRoot, 'n2'),
    '--project-root', repoRoot,
    '--run-id', 'i21-cli-n2',
    '--runner-catalog', failCatalogPath,
    '--result-file', n2ResultFile
  ];
  const n2Result = await loader.dispatch('build', n2Argv, { invocation: makeInvocation(n2Argv, repoRoot), packageJsonPath: cliPackageJson, config: null });
  const n2Env = n2Result.envelope;
  const n2HasBuildArtifact = (Array.isArray(n2Env.artifacts) ? n2Env.artifacts : []).some((a) => a && a.kind === 'build_result');
  const n2Ok = n2Env.status !== 'success' && n2Env.exitCode !== 0 && !n2HasBuildArtifact && validateCliResultEnvelope(n2Env).ok;
  record('N2-cli-failed-verification-non-green', n2Ok ? 'PASS' : 'FAIL', { note: `status=${n2Env.status} exit=${n2Env.exitCode} buildArtifact=${n2HasBuildArtifact}` });
  assert.ok(n2Ok, 'failed verification must yield non-green exit with no build_result artifact');

  // --- N1 via CLI: unapproved plan -> non-green ---
  const n1Argv = [
    '--implementation-plan', draftPlan,
    '--evidence-root', path.join(evidenceRoot, 'n1'),
    '--project-root', repoRoot,
    '--run-id', 'i21-cli-n1',
    '--runner-catalog', runnerCatalogPath()
  ];
  const n1Result = await loader.dispatch('build', n1Argv, { invocation: makeInvocation(n1Argv, repoRoot), packageJsonPath: cliPackageJson, config: null });
  record('N1-cli-plan-not-approved', (n1Result.envelope.status !== 'success' && n1Result.envelope.exitCode !== 0) ? 'PASS' : 'FAIL', { note: `status=${n1Result.envelope.status} exit=${n1Result.envelope.exitCode}` });
  assert.ok(n1Result.envelope.status !== 'success', 'unapproved plan must not yield success');

  // --- N5: unknown flag -> invalid invocation ---
  const n5Argv = await buildArgs(['--bogus-flag', 'x']);
  const n5Result = await loader.dispatch('build', n5Argv, { invocation: makeInvocation(n5Argv, repoRoot), packageJsonPath: cliPackageJson, config: null });
  record('N5-cli-unknown-flag', (n5Result.envelope.status === 'blocked' && n5Result.envelope.exitCode !== 0) ? 'PASS' : 'FAIL', { note: `status=${n5Result.envelope.status} exit=${n5Result.envelope.exitCode}` });
  assert.ok(n5Result.envelope.status !== 'success' && n5Result.envelope.exitCode !== 0, 'unknown flag must be rejected');

  // --- N5b: missing required flag -> invalid invocation ---
  const n5bArgv = ['--implementation-plan', approvedPlan, '--project-root', repoRoot];
  const n5bResult = await loader.dispatch('build', n5bArgv, { invocation: makeInvocation(n5bArgv, repoRoot), packageJsonPath: cliPackageJson, config: null });
  record('N5b-cli-missing-required-flag', (n5bResult.envelope.status === 'blocked' && n5bResult.envelope.exitCode !== 0) ? 'PASS' : 'FAIL', { note: `status=${n5bResult.envelope.status} exit=${n5bResult.envelope.exitCode}` });
  assert.ok(n5bResult.envelope.status !== 'success', 'missing required flag must be rejected');

  // --- R2: sibling commands unaffected (loader registers build alongside verify/foundation) ---
  const { verifyCommand } = await import('../verify/index.ts');
  const siblingLoader = createCommandLoader([buildCommand, verifyCommand]);
  const r2Ok = siblingLoader.hasCommand('build') && siblingLoader.hasCommand('verify') && siblingLoader.hasCommand('help') === false;
  record('R2-sibling-coexist', (siblingLoader.hasCommand('build') && siblingLoader.hasCommand('verify')) ? 'PASS' : 'FAIL', { note: `build=${siblingLoader.hasCommand('build')} verify=${siblingLoader.hasCommand('verify')}` });
  assert.ok(siblingLoader.hasCommand('build') && siblingLoader.hasCommand('verify'), 'build must coexist with verify sibling in the loader');

  await writeJson(path.join(workRoot, 'evidence', 'witness-cli-dispatch-summary.json'), { schemaVersion: 'i21-cli-witness/v1', results });

  const failed = results.filter((r) => r.status !== 'PASS');
  console.log(`\n=== CLI WITNESS SUMMARY: ${results.length - failed.length}/${results.length} PASS ===`);
  if (failed.length > 0) { console.log('FAILURES:', failed.map((f) => f.name)); process.exit(1); }
  process.exit(0);
}

main().catch((error) => { console.error('CLI WITNESS CRASH:', error); process.exit(2); });
