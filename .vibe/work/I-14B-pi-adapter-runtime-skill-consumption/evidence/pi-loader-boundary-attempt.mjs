import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const fixtureRoot = join(repoRoot, 'examples/harness-integrations/pi/runtime-fixtures');
const evidenceRoot = join(repoRoot, '.vibe/work/I-14B-pi-adapter-runtime-skill-consumption/evidence');
const load = (relative) => import(new URL(`../../../../${relative}`, import.meta.url).href);
const { createPiLoaderWitnessPlan, parsePiRpcGetCommandsResponse, evaluatePiLoaderWitnessResponse, pendingLivePiLoaderWitness } = await load('packages/adapters/pi/src/loader-witness/index.ts');
const { generatePiRuntimeFixture } = await load('packages/adapters/pi/src/generators/runtime-fixture-generator.ts');

const fixture = generatePiRuntimeFixture();
const plan = createPiLoaderWitnessPlan(fixtureRoot, fixture);

const runRpc = () => new Promise((resolveRun) => {
  const child = spawn(plan.command, [...plan.args, '--approve', '--offline', '--no-extensions'], {
    cwd: fixtureRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PI_OFFLINE: '1', NO_COLOR: '1' },
  });
  let stdout = '';
  let stderr = '';
  let settled = false;
  const finish = (result) => {
    if (settled) return;
    settled = true;
    if (!child.killed) child.kill('SIGTERM');
    resolveRun(result);
  };
  const timer = setTimeout(() => finish({ kind: 'timeout', stdout, stderr }), 8000);
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString('utf8');
    const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && parsed.type === 'response' && parsed.command === 'get_commands') {
          clearTimeout(timer);
          finish({ kind: 'response', response: parsed, stdout, stderr });
        }
      } catch {
        // Continue collecting; startup logs may not be JSON protocol records.
      }
    }
  });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
  child.on('error', (error) => {
    clearTimeout(timer);
    finish({ kind: 'spawn-error', error: error.message, stdout, stderr });
  });
  child.on('exit', (code, signal) => {
    clearTimeout(timer);
    if (!settled) finish({ kind: 'exit-before-response', code, signal, stdout, stderr });
  });
  child.stdin.write(plan.stdinJsonl);
});

const rpcResult = await runRpc();
let evaluation;
if (rpcResult.kind === 'response') {
  const parsedResponse = parsePiRpcGetCommandsResponse(rpcResult.response);
  evaluation = evaluatePiLoaderWitnessResponse(fixture, parsedResponse);
} else {
  evaluation = pendingLivePiLoaderWitness(fixture, `pi RPC get_commands witness could not complete: ${rpcResult.kind}`);
}

const result = {
  plan: { ...plan, argsUsed: [...plan.args, '--approve', '--offline', '--no-extensions'], extensionRuntimeNote: 'Live RPC witness disables extensions to avoid user/global extension side effects; generated extension policy is statically validated, while skills/prompts are live-loaded.' },
  rpcResult,
  evaluation,
  fixtureRoot,
  runtimeExecutionClaimRouting: evaluation.status === 'proven' ? 'proven' : 'pending-live/BLOCKED',
};
await writeFile(join(evidenceRoot, 'pi-loader-boundary-result.json'), JSON.stringify(result, null, 2));
await writeFile(join(evidenceRoot, 'pi-loader-boundary-stdout.txt'), rpcResult.stdout ?? '');
await writeFile(join(evidenceRoot, 'pi-loader-boundary-stderr.txt'), rpcResult.stderr ?? '');
console.log(JSON.stringify({ status: evaluation.status, missingCommands: evaluation.missingCommands, pendingLiveReason: evaluation.pendingLiveReason }, null, 2));
if (evaluation.status === 'failed') process.exitCode = 1;
