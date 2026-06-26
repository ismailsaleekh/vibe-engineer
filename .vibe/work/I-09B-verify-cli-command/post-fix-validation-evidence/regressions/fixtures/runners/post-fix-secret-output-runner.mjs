import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
const out = process.argv[2];
await mkdir(dirname(out), { recursive: true });
await writeFile(out, 'artifact=SECRET_POST_FIX_ARTIFACT_VALUE\n', 'utf8');
console.log('stdout SECRET_POST_FIX_STDOUT_VALUE password=SECRET_POST_FIX_STDOUT_PASSWORD Bearer SECRET_POST_FIX_BEARER_VALUE');
console.error('stderr api-key=SECRET_POST_FIX_STDERR_KEY client-secret=SECRET_POST_FIX_STDERR_CLIENT');
