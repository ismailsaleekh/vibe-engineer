import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
const out = process.argv[2];
if (!out) throw new Error('missing output path');
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify({ ok: true, witness: 'w-rb3-real-runner', argvLength: process.argv.length }) + '\n', 'utf8');
console.log('w-rb3-pass-runner-ok');
