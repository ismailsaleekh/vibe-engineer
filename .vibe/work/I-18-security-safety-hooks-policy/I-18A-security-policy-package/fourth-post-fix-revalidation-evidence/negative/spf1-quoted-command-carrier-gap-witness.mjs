import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/fourth-post-fix-revalidation-evidence');
const summaryPath = path.join(evidenceRoot, 'negative/spf1-quoted-command-carrier-gap-witness-summary.json');

async function importSecurityFrom(contextPackageJson) {
  const requireFromContext = createRequire(contextPackageJson);
  const resolved = requireFromContext.resolve('@vibe-engineer/security');
  return { resolved, security: await import(pathToFileURL(resolved).href) };
}

function classifications(result) {
  return result.findings.map((finding) => finding.classification).sort();
}

const contexts = [
  ['packages/security', path.join(repoRoot, 'packages/security/package.json')],
  ['packages/cli', path.join(repoRoot, 'packages/cli/package.json')],
];

const caseInputs = [
  ['double-quoted embedded api-key flag without value', { command: 'node "--api-key"', argv: [] }],
  ['single-quoted embedded api-key flag without value', { command: "node '--api-key'", argv: [] }],
  ['double-quoted embedded api-key flag split value', { command: 'node "--api-key"', argv: ['abc123'] }],
  ['single-quoted embedded client-secret flag split value', { command: "node '--client-secret'", argv: ['abc123'] }],
];

const rows = [];
for (const [contextName, contextPackageJson] of contexts) {
  const { resolved, security } = await importSecurityFrom(contextPackageJson);
  for (const [label, partialCommand] of caseInputs) {
    const command = { ...partialCommand, classification: security.CommandSafetyClassification.ReadOnly };
    const result = security.runSecurityGate({ command });
    const cls = classifications(result);
    rows.push({
      contextName,
      resolved,
      label,
      status: result.status,
      decision: result.decision,
      classifications: cls,
      expectedStatus: security.SecurityGateStatus.Blocked,
      expectedDecision: security.SecurityDecision.Block,
      expectedClassification: security.SecurityClassification.SecretLikeValue,
      ok: result.status === security.SecurityGateStatus.Blocked && result.decision === security.SecurityDecision.Block && cls.includes(security.SecurityClassification.SecretLikeValue),
    });
  }
}

const failures = rows.filter((row) => !row.ok);
const summary = { ok: failures.length === 0, total: rows.length, failures, rows };
const serialized = JSON.stringify(summary, null, 2);
if (serialized.includes('abc123')) throw new Error('summary leaked split value');
await writeFile(summaryPath, `${serialized}\n`);
console.log(JSON.stringify({ ok: summary.ok, total: rows.length, failureCount: failures.length }));
if (failures.length > 0) process.exit(1);
