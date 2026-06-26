import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
const out = process.argv[2];
if (!out) throw new Error('missing output');
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify({ ok: true, runner: 'post-fix-pass', argv: process.argv.slice(2) }) + '\n', 'utf8');
console.log('post-fix-pass-runner-ok');
