import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const revalidationDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(revalidationDir, '../../../../..');
const packageRoot = path.join(repoRoot, 'packages/artifacts');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i01a-revalidation-drift-'));
fs.cpSync(path.join(packageRoot, 'schemas'), tmpDir, { recursive: true });
const schemaPath = path.join(tmpDir, 'work-brief.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
schema.properties.status.enum.push('unexpected_revalidation_status');
fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
const result = spawnSync(process.execPath, [path.join(packageRoot, 'scripts/check-generated-types.mjs')], {
  env: { ...process.env, SCHEMAS_DIR: tmpDir },
  cwd: repoRoot,
  encoding: 'utf8'
});
fs.rmSync(tmpDir, { recursive: true, force: true });
const ok = result.status !== 0 && /Generated TypeScript types drift/.test(result.stderr || result.stdout || '');
console.log(JSON.stringify({ ok, expectedFailureExit: result.status, stdout: result.stdout, stderr: result.stderr }, null, 2));
if (!ok) process.exit(1);
