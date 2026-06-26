import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const evidence = path.join(repo, '.vibe/work/POST-I05A-SKILLS-ARTIFACTS-PROVIDER-PIN/evidence/witness-results/existing-consumers');
fs.mkdirSync(evidence, { recursive: true });
const code = "import { validateArtifactFile } from '@vibe-engineer/artifacts'; console.log(typeof validateArtifactFile);";
function run(label, command, args, cwd) {
  const r = spawnSync(command, args, { cwd, encoding: 'utf8' });
  fs.writeFileSync(path.join(evidence, `${label}.stdout`), r.stdout ?? '');
  fs.writeFileSync(path.join(evidence, `${label}.stderr`), r.stderr ?? '');
  fs.writeFileSync(path.join(evidence, `${label}.exit`), String(r.status ?? r.signal ?? 'null'));
  return { label, cwd, command: [command, ...args].join(' '), exit: r.status, stdout: (r.stdout ?? '').trim(), stderr: (r.stderr ?? '').trim() };
}
const runs = [];
runs.push(run('cli-direct', process.execPath, ['--input-type=module', '-e', code], path.join(repo, 'packages/cli')));
runs.push(run('cli-filter', 'pnpm', ['--filter', 'vibe-engineer', 'exec', 'node', '--input-type=module', '-e', code], repo));
runs.push(run('context-direct', process.execPath, ['--input-type=module', '-e', code], path.join(repo, 'packages/context')));
runs.push(run('context-filter', 'pnpm', ['--filter', '@vibe-engineer/context', 'exec', 'node', '--input-type=module', '-e', code], repo));
runs.push(run('orchestration-direct', process.execPath, ['--input-type=module', '-e', code], path.join(repo, 'packages/orchestration')));
runs.push(run('orchestration-filter', 'pnpm', ['--filter', '@vibe-engineer/orchestration', 'exec', 'node', '--input-type=module', '-e', code], repo));
const root = run('root-bare-non-consumer', process.execPath, ['--input-type=module', '-e', code], repo);
runs.push(root);
const failures = runs.filter((r) => r.label !== 'root-bare-non-consumer' && (r.exit !== 0 || r.stdout !== 'function'));
const rootExpected = root.exit !== 0 && root.stderr.includes('ERR_MODULE_NOT_FOUND');
const result = { ok: failures.length === 0 && rootExpected, failures, rootExpectedNonConsumerState: rootExpected, runs };
fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify(result, null, 2));
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));
