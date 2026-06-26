import { spawn } from 'node:child_process';
import { writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generatePiRuntimeFixture } from '../../../../../packages/adapters/pi/src/generators/runtime-fixture-generator.ts';
import {
  createPiRpcGetCommandsRequest,
  evaluatePiLoaderWitnessResponse,
  parsePiRpcGetCommandsResponse,
} from '../../../../../packages/adapters/pi/src/loader-witness/index.ts';

const __filename = fileURLToPath(import.meta.url);
const scriptDir = dirname(__filename);
const repoRoot = resolve(scriptDir, '../../../../..');
const resultPath = join(scriptDir, 'pi-loader-boundary-result.json');
const fixture = generatePiRuntimeFixture();
const roots = [
  {
    name: 'validator-rerun',
    cwd: join(repoRoot, '.vibe/work/I-14B-pi-adapter-runtime-skill-consumption/validation-evidence/07-positive/runtime-fixture-rerun'),
  },
  {
    name: 'product-fixture',
    cwd: join(repoRoot, 'examples/harness-integrations/pi/runtime-fixtures'),
  },
];

const request = createPiRpcGetCommandsRequest();
const stdinJsonl = `${JSON.stringify(request)}\n`;
const requiredCommands = [
  'skill:brainstorm',
  'skill:grill-me',
  'skill:task',
  'skill:plan',
  'skill:build',
  'skill:ship',
  'vibe-brainstorm',
  'vibe-grill-me',
  'vibe-task',
  'vibe-plan',
  'vibe-build',
  'vibe-ship',
];

const runRpc = async ({ name, cwd }) => new Promise((resolveRun) => {
  const args = ['--mode', 'rpc', '--no-session', '--approve', '--offline', '--no-extensions'];
  const child = spawn('pi', args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  let settled = false;
  let parsedResponse;
  let parseError;
  const finish = (reason) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (!child.killed) child.kill('SIGTERM');
    resolveRun({ name, cwd, command: 'pi', args, stdinJsonl, stdout, stderr, parsedResponse, parseError, finishReason: reason });
  };
  const timer = setTimeout(() => finish('timeout'), 10000);
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString('utf8');
    const lines = stdout.split(/\n/).filter((line) => line.trim().length > 0);
    for (const line of lines) {
      try {
        const value = JSON.parse(line);
        if (value.type === 'response' && value.command === 'get_commands') {
          parsedResponse = parsePiRpcGetCommandsResponse(value);
          finish('response');
          return;
        }
      } catch (error) {
        parseError = error.message;
      }
    }
  });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
  child.on('error', (error) => {
    parseError = error.message;
    finish('spawn-error');
  });
  child.on('exit', (code, signal) => {
    if (!settled) finish(`exit:${code ?? signal}`);
  });
  child.stdin.write(stdinJsonl);
});

const runs = [];
for (const root of roots) {
  const run = await runRpc(root);
  await writeFile(join(scriptDir, `${root.name}.stdout.jsonl`), run.stdout, 'utf8');
  await writeFile(join(scriptDir, `${root.name}.stderr.txt`), run.stderr, 'utf8');
  const response = run.parsedResponse ?? { type: 'response', command: 'get_commands', success: false, error: run.parseError ?? run.finishReason };
  const evaluation = evaluatePiLoaderWitnessResponse(fixture, response);
  const observedRequired = evaluation.observedCommands.filter((command) => requiredCommands.includes(command.name)).map((command) => command.name).sort();
  runs.push({
    ...run,
    parsedResponse: response,
    evaluation,
    requiredCommands,
    observedRequired,
    extensionExecutionLiveProven: false,
    extensionExecutionNote: 'Witness used --no-extensions to avoid executing project/user extension code; extension asset policy is statically validated only.',
  });
}

const allProven = runs.every((run) => run.evaluation.status === 'proven');
const result = {
  ok: allProven,
  livePiLoaderProof: allProven ? 'proven' : 'pending-live/BLOCKED',
  command: 'pi --mode rpc --no-session --approve --offline --no-extensions',
  stdinJsonl,
  runs,
};
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: result.ok, livePiLoaderProof: result.livePiLoaderProof, resultPath, runs: runs.map((run) => ({ name: run.name, status: run.evaluation.status, missingCommands: run.evaluation.missingCommands })) }, null, 2));
if (!result.ok) process.exit(1);
