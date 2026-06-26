#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const output = process.argv[2];
if (!output) throw new Error('missing output path');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ ok: true, runner: 'pass-runner' }) + '\n', 'utf8');
console.log('PASS_RUNNER_OK');
