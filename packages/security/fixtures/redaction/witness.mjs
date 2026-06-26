import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { evaluateEvidenceSafety, redactSecurityText, redactSecurityValue, SecurityClassification, SecurityGateStatus } from '@vibe-engineer/security';

const evidenceDir = new URL('../../../../.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/evidence/redaction/', import.meta.url);
await mkdir(evidenceDir, { recursive: true });

const sentinels = ['FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_REDACT_TOKEN_123456', 'FAKE_SECRET_VALUE_FOR_NEGATIVE_WITNESS_REDACT'];
const payload = {
  stdout: `starting token=${sentinels[0]} done`,
  resultFiles: [{ path: 'result.json', content: `password=${sentinels[1]}` }],
  evidenceRefs: [{ authorization: `Bearer ${sentinels[0]}` }],
  diagnostics: [{ message: `client_secret=${sentinels[1]}` }],
  errors: [{ details: { apiKey: sentinels[0] } }],
  logs: [`credential=${sentinels[1]}`],
};
const circularPayload = { token: sentinels[0] };
circularPayload.self = circularPayload;
const bigintPayload = { token: sentinels[0], counter: 1n };
const redactedText = redactSecurityText(`token=${sentinels[0]}`);
const redactedValue = redactSecurityValue(payload);
const redactedCircular = redactSecurityValue(circularPayload);
const circularEvidenceResult = evaluateEvidenceSafety(circularPayload);
const bigintEvidenceResult = evaluateEvidenceSafety(bigintPayload);
const evidenceResult = evaluateEvidenceSafety(payload);
const serialized = JSON.stringify({ redactedText, redactedValue, redactedCircular, evidenceResult, circularEvidenceResult, bigintEvidenceResult });
for (const sentinel of sentinels) assert.ok(!serialized.includes(sentinel), `redaction leaked ${sentinel}`);
assert.ok(serialized.includes('<redacted'), 'redaction placeholders should remain useful');
assert.equal(evidenceResult.status, SecurityGateStatus.Blocked);
assert.equal(circularEvidenceResult.status, SecurityGateStatus.Blocked);
assert.equal(bigintEvidenceResult.status, SecurityGateStatus.Blocked);
assert.ok(evidenceResult.findings.some((finding) => finding.classification === SecurityClassification.EvidenceSecretLeak));
assert.ok(circularEvidenceResult.findings.some((finding) => finding.classification === SecurityClassification.EvidenceSecretLeak));
assert.ok(bigintEvidenceResult.findings.some((finding) => finding.classification === SecurityClassification.EvidenceSecretLeak));
await writeFile(new URL('redaction-summary.json', evidenceDir), `${JSON.stringify(JSON.parse(serialized), null, 2)}\n`);
console.log(JSON.stringify({ ok: true, redactedSurfaces: ['stdout', 'resultFiles', 'evidenceRefs', 'diagnostics', 'errors', 'logs', 'circularEvidence', 'bigintEvidence'] }));
