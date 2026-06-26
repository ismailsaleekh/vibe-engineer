import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const packageRoot = path.join(repoRoot, 'packages/artifacts');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-artifacts-drift-'));
fs.cpSync(path.join(packageRoot, 'schemas'), tmp, { recursive: true });
const schemaPath = path.join(tmp, 'work-brief.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
schema.properties.status.enum.push('intentional_drift_status');
fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + '\n');
const result = spawnSync(process.execPath, [path.join(packageRoot, 'scripts/check-generated-types.mjs')], {
  cwd: repoRoot,
  env: { ...process.env, SCHEMAS_DIR: tmp },
  encoding: 'utf8'
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
fs.rmSync(tmp, { recursive: true, force: true });
if (result.status === 0) {
  console.error('intentional schema/type drift was not detected');
  process.exit(1);
}
console.log('intentional schema/type drift failed as expected');
