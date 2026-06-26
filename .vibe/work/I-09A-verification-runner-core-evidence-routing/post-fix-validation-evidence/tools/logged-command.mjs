#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [, , id, ...argv] = process.argv;
if (!id || argv.length === 0) {
  console.error('usage: logged-command.mjs <id> <command> [args...]');
  process.exit(64);
}

const workRoot = '/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-09A-verification-runner-core-evidence-routing';
const logRoot = `${workRoot}/post-fix-validation-command-log`;
const safeId = id.replace(/[^A-Za-z0-9_.-]/g, '_');
const dir = `${logRoot}/${safeId}`;
await mkdir(dir, { recursive: true });
const stdoutPath = `${dir}/stdout.txt`;
const stderrPath = `${dir}/stderr.txt`;
const metaPath = `${dir}/meta.json`;
const summaryPath = `${dir}/summary.md`;

const startedAt = new Date().toISOString();
const cwd = process.cwd();
const command = argv.map((part) => part.includes(' ') ? JSON.stringify(part) : part).join(' ');
const child = spawn(argv[0], argv.slice(1), { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
const stdoutChunks = [];
const stderrChunks = [];
child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));
const exit = await new Promise((resolveExit) => {
  child.on('error', (error) => resolveExit({ code: null, signal: null, error: String(error?.stack || error) }));
  child.on('close', (code, signal) => resolveExit({ code, signal, error: null }));
});
const endedAt = new Date().toISOString();
const stdout = Buffer.concat(stdoutChunks);
const stderr = Buffer.concat(stderrChunks);
await writeFile(stdoutPath, stdout);
await writeFile(stderrPath, stderr);
const meta = {
  id: safeId,
  cwd,
  command,
  argv,
  startedAt,
  endedAt,
  exitCode: exit.code,
  signal: exit.signal,
  error: exit.error,
  stdoutPath,
  stderrPath,
  summaryPath,
};
await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
const stdoutPreview = stdout.toString('utf8').slice(0, 2000);
const stderrPreview = stderr.toString('utf8').slice(0, 2000);
await writeFile(summaryPath, [
  `# Command log: ${safeId}`,
  '',
  `- cwd: ${cwd}`,
  `- command: ${command}`,
  `- exitCode: ${exit.code}`,
  `- signal: ${exit.signal ?? ''}`,
  `- stdout: ${stdoutPath}`,
  `- stderr: ${stderrPath}`,
  `- startedAt: ${startedAt}`,
  `- endedAt: ${endedAt}`,
  '',
  '## stdout preview',
  '```txt',
  stdoutPreview,
  '```',
  '',
  '## stderr preview',
  '```txt',
  stderrPreview,
  '```',
  '',
].join('\n'));
process.exit(exit.code === null ? 1 : exit.code);
