#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const output = process.argv[2];
const bytes = Number(process.argv[3] || '4096');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, 'a'.repeat(bytes), 'utf8');
console.log('large artifact written');
