#!/usr/bin/env node
const target = process.argv[2] || 'stdout';
const bytes = Number(process.argv[3] || '4096');
const data = 'x'.repeat(bytes);
if (target === 'stderr') process.stderr.write(data);
else if (target === 'both') {
  process.stdout.write(data);
  process.stderr.write(data);
} else process.stdout.write(data);
