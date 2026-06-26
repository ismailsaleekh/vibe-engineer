import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const caseDir = join(repoRoot, '.vibe/work/I-09B-verify-cli-command/validation-evidence/n2-missing-script');
const evidenceRoot = join(caseDir, 'packets');
const resultFile = join(caseDir, 'result', 'cli-result.json');
const catalogPath = join(caseDir, 'runner-catalog.json');
const planPath = join(repoRoot, '.vibe/work/I-09B-verify-cli-command/validation-evidence/matrix/fixtures/schema-only-passed.implementation-plan.json');
const missingScript = join(repoRoot, 'packages/verification/fixtures/runners/definitely-missing-runner-script.mjs');
const loaderPath = join(repoRoot, 'packages/cli/src/command-loader/loader.js');
const verifyPath = join(repoRoot, 'packages/cli/src/commands/verify/index.ts');
const envelopePath = join(repoRoot, 'packages/cli/src/envelope/result-envelope.js');
const artifactsPath = join(repoRoot, 'packages/artifacts/src/index.js');

function sha256File(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }
function readJson(file) { return JSON.parse(readFileSync(file, 'utf8')); }
async function writeJson(file, value) { await mkdir(dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function nowInvocation(args) { const now = new Date().toISOString(); return { id: 'i-09b-validation-n2-missing-script', command: 'verify', argv: ['verify', ...args], projectRoot: repoRoot, configPath: null, startedAt: now, endedAt: now }; }

await rm(join(caseDir, 'packets'), { recursive: true, force: true });
await rm(join(caseDir, 'result'), { recursive: true, force: true });
await mkdir(caseDir, { recursive: true });

const catalog = [{
  id: 'i09b-schema-validation-missing-script',
  requiredItemIds: ['schema-validation'],
  layer: 'schema_validation',
  evidenceClass: 'deterministic',
  blocking: true,
  kind: 'command',
  command: process.execPath,
  args: [missingScript],
  cwd: '.',
  expectedArtifacts: [],
  argPaths: [{ index: 0, root: 'projectRoot' }],
  safety: {
    classification: 'local_deterministic_write',
    timeoutMs: 2000,
    maxStdoutBytes: 8192,
    maxStderrBytes: 8192,
    maxOutputBytes: 8192,
    allowedReadRoots: [repoRoot],
    allowedWriteRoots: [evidenceRoot],
    envAllowlist: [],
    passThroughEnv: false,
    cwdContainedInProjectRoot: true,
    expectedArtifactsContained: true
  }
}];
await writeJson(catalogPath, catalog);

const [{ createCommandLoader }, { verifyCommand }, { validateCliResultEnvelope }, { validateArtifactFile }] = await Promise.all([
  import(pathToFileURL(loaderPath).href),
  import(pathToFileURL(verifyPath).href),
  import(pathToFileURL(envelopePath).href),
  import(pathToFileURL(artifactsPath).href)
]);
const args = ['--implementation-plan', planPath, '--evidence-root', evidenceRoot, '--project-root', repoRoot, '--run-id', 'i09b-n2-missing-script', '--runner-catalog', catalogPath, '--result-file', resultFile];
const envelope = (await createCommandLoader([verifyCommand]).dispatch('verify', args, { invocation: nowInvocation(args), packageJsonPath: join(repoRoot, 'packages/cli/package.json') })).envelope;
const envelopeValidation = validateCliResultEnvelope(envelope);
const packetSummaries = [];
for (const packet of envelope.payload?.data?.evidencePackets ?? []) {
  const validation = validateArtifactFile(packet.path, { kind: 'evidence_packet' });
  const data = readJson(packet.path);
  packetSummaries.push({ path: packet.path, packetSha256: sha256File(packet.path), validationOk: validation.ok, status: data.status, result: data.result, failureCode: data.failureDetails?.code ?? null, failureClassification: data.failureDetails?.classification ?? null, stderrRef: data.stderrRef ?? null, logsRef: data.logsRef ?? null });
}
const observed = {
  envelopeStatus: envelope.status,
  exitCode: envelope.exitCode,
  classification: envelope.errors?.[0]?.classification ?? null,
  code: envelope.errors?.[0]?.code ?? null,
  runnerStatus: envelope.payload?.data?.runnerStatus ?? null,
  expectedClassification: 'missing_prerequisite',
  expectedRunnerFailureClassification: 'missing_runner_or_prerequisite',
  missingScriptExists: existsSync(missingScript),
  resultFileExists: existsSync(resultFile),
  resultFileSha256: existsSync(resultFile) ? sha256File(resultFile) : null,
  envelopeValidation,
  packetSummaries
};
await writeJson(join(caseDir, 'cli-result.json'), envelope);
await writeJson(join(caseDir, 'summary.json'), observed);
console.log(JSON.stringify(observed, null, 2));
