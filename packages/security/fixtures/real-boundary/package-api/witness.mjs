import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const security = await import('@vibe-engineer/security');
const evidenceDir = new URL('../../../../../.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/evidence/real-boundary/package-api/', import.meta.url);
await mkdir(evidenceDir, { recursive: true });
const result = security.runSecurityGate({
  command: { command: 'node', argv: ['packages/security/fixtures/real-boundary/package-api/witness.mjs'], classification: security.CommandSafetyClassification.ReadOnly, targetPaths: ['packages/security/fixtures/real-boundary/package-api/witness.mjs'] },
  env: { NODE_ENV: 'test' },
});
assert.equal(result.status, security.SecurityGateStatus.Passed);
const smoke = security.__i18aCliBoundarySmoke();
assert.equal(smoke.ok, true);
const summary = { ok: true, exports: Object.keys(security).sort(), result: { status: result.status, decision: result.decision }, smoke };
await writeFile(new URL('package-api-summary.json', evidenceDir), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
