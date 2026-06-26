// @ts-check
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../../..');
const outRoot = path.resolve(process.argv[2] || path.join(repoRoot, '.vibe/work/I-09A-verification-runner-core-evidence-routing/command-default-deny-fix-evidence/cli-context-witness'));
const cliCwd = path.join(repoRoot, 'packages/cli');
await fsp.mkdir(outRoot, { recursive: true });
const childCode = `
  import fs from 'node:fs';
  import path from 'node:path';
  import { runVerificationPlan } from '@vibe-engineer/verification';
  import { validateArtifactFile } from '@vibe-engineer/artifacts';
  const repoRoot = ${JSON.stringify(repoRoot)};
  const outRoot = ${JSON.stringify(outRoot)};
  const approvedPlan = path.join(repoRoot, 'packages/verification/fixtures/plans/approved-plan.json');
  const runnersDir = path.join(repoRoot, 'packages/verification/fixtures/runners');
  function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  function validatePackets(result) { for (const packet of result.evidencePackets) { const v = validateArtifactFile(String(packet), { kind: 'evidence_packet' }); if (!v.ok) throw new Error('invalid packet ' + packet); } }
  function failure(result, code) { return result.evidencePackets.map((p) => readJson(String(p))).find((p) => p.failureDetails?.code === code); }
  function planFor(name) { const plan = readJson(approvedPlan); for (const item of plan.verificationDelta.requiredItems) item.action = item.id === 'schema-validation' ? 'add' : 'not_applicable'; const file = path.join(outRoot, name, 'plan.json'); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(plan, null, 2)); return file; }
  function spec(out) { return { id: 'schema-validation', requiredItemIds: ['schema-validation'], layer: 'schema_validation', evidenceClass: 'deterministic', blocking: true, kind: 'command', command: process.execPath, args: [path.join(runnersDir, 'pass-runner.mjs'), out], cwd: '.', expectedArtifacts: [out], argPaths: [{ index: 0, root: 'projectRoot' }, { index: 1, root: 'evidenceRoot' }], safety: { classification: 'local_deterministic_write', timeoutMs: 1000, maxStdoutBytes: 8192, maxStderrBytes: 8192, maxOutputBytes: 8192, allowedReadRoots: [repoRoot], allowedWriteRoots: [outRoot], envAllowlist: [], passThroughEnv: false } }; }
  const positiveDir = path.join(outRoot, 'positive');
  const positive = await runVerificationPlan({ implementationPlanPath: planFor('positive'), evidenceRoot: positiveDir, projectRoot: repoRoot, runId: 'i09a-cli-positive', runnerCatalog: [spec(path.join(positiveDir, 'out.json'))] });
  validatePackets(positive);
  const negativeDir = path.join(outRoot, 'negative-touch');
  const sentinel = path.join(negativeDir, 'cli-touch-sentinel');
  const negativeSpec = { ...spec(path.join(negativeDir, 'unused.json')), command: 'touch', args: [sentinel], expectedArtifacts: [], argPaths: [{ index: 0, root: 'evidenceRoot' }] };
  const negative = await runVerificationPlan({ implementationPlanPath: planFor('negative-touch'), evidenceRoot: negativeDir, projectRoot: repoRoot, runId: 'i09a-cli-negative-touch', runnerCatalog: [negativeSpec] });
  validatePackets(negative);
  if (fs.existsSync(sentinel)) throw new Error('CLI negative touch sentinel exists');
  const denied = failure(negative, 'COMMAND_POLICY_DENIED');
  if (!denied || denied.failureDetails.classification !== 'safety_or_security_policy_failure') throw new Error('CLI negative missing policy denial');
  fs.writeFileSync(path.join(outRoot, 'cli-context-summary.json'), JSON.stringify({ ok: true, positiveStatus: positive.status, negativeStatus: negative.status, sentinelExists: fs.existsSync(sentinel), positivePackets: positive.evidencePackets.length, negativePackets: negative.evidencePackets.length }, null, 2));
`;
const child = spawn(process.execPath, ['--input-type=module', '-e', childCode], { cwd: cliCwd, env: {}, shell: false });
let stdout = '';
let stderr = '';
child.stdout.on('data', (chunk) => { stdout += String(chunk); });
child.stderr.on('data', (chunk) => { stderr += String(chunk); });
const code = await new Promise((resolve) => child.on('close', resolve));
await fsp.writeFile(path.join(outRoot, 'spawn-result.json'), `${JSON.stringify({ code, stdout, stderr, cwd: cliCwd }, null, 2)}\n`, 'utf8');
if (code !== 0) throw new Error(stderr || `CLI context child exited ${code}`);
console.log(JSON.stringify({ ok: true, outRoot }, null, 2));
