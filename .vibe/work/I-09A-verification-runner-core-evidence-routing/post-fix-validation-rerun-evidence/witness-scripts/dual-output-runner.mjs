#!/usr/bin/env node
const stdoutBytes = Number(process.argv[2] || '0');
const stderrBytes = Number(process.argv[3] || '0');
if (!Number.isFinite(stdoutBytes) || !Number.isFinite(stderrBytes) || stdoutBytes < 0 || stderrBytes < 0) throw new Error('invalid byte counts');
process.stdout.write('O'.repeat(stdoutBytes));
process.stderr.write('E'.repeat(stderrBytes));
