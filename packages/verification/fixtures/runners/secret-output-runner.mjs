#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
const output = process.argv[2];
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, 'token=SECRET_ARTIFACT_VALUE\n', 'utf8');
console.log('token=SECRET_STDOUT_VALUE password=SECRET_STDOUT_PASSWORD Bearer SECRET_BEARER_VALUE');
console.error('--api-key SECRET_STDERR_KEY client-secret=SECRET_STDERR_CLIENT');
