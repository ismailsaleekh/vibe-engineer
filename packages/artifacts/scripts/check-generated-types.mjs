import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const committed = path.join(packageRoot, 'src/generated/types.d.ts');
const tmp = path.join(os.tmpdir(), `vibe-artifact-types-${process.pid}.d.ts`);
const result = spawnSync(process.execPath, [path.join(packageRoot, 'scripts/generate-types.mjs')], {
  env: { ...process.env, OUT_FILE: tmp },
  encoding: 'utf8'
});
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}
const expected = fs.readFileSync(committed, 'utf8');
const actual = fs.readFileSync(tmp, 'utf8');
fs.rmSync(tmp, { force: true });
if (expected !== actual) {
  console.error('Generated TypeScript types drift from canonical schemas. Run pnpm --filter @vibe-engineer/artifacts generate:types and commit the result.');
  process.exit(1);
}
console.log('generated type drift check passed');
