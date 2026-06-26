import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { CommandSafetyClassification, DEFAULT_SECURITY_POLICY, parseSecurityPolicy, runSecurityGate, SecurityClassification, SecurityGateStatus } from '@vibe-engineer/security';

const evidenceDir = new URL('../../../../.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/evidence/contracts/', import.meta.url);
await mkdir(evidenceDir, { recursive: true });

function assertContractBlock(name, result, expected) {
  const gate = result.ok === false ? result.result : result;
  assert.equal(gate.status, SecurityGateStatus.Blocked, `${name} should block`);
  assert.ok(gate.findings.some((finding) => finding.classification === expected), `${name} should include ${expected}`);
  return { name, status: gate.status, classifications: gate.findings.map((finding) => finding.classification).sort() };
}

const cases = [
  assertContractBlock('malformed policy non-object', parseSecurityPolicy('not-an-object'), SecurityClassification.MalformedPolicy),
  assertContractBlock('unknown policy version', parseSecurityPolicy({ schemaVersion: 'security-policy.v999', defaultDecision: 'block' }), SecurityClassification.UnsupportedPolicyVersion),
  assertContractBlock('unknown policy field', parseSecurityPolicy({ schemaVersion: 'security-policy.v1', defaultDecision: 'block', unsupported: true }), SecurityClassification.UnknownPolicyField),
  assertContractBlock('unsafe policy default allow', parseSecurityPolicy({ schemaVersion: 'security-policy.v1', defaultDecision: 'allow' }), SecurityClassification.MalformedPolicy),
  assertContractBlock('unknown command classification in policy', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: ['read_only', 'invented_super_safe'] }), SecurityClassification.MalformedPolicy),
  assertContractBlock('unsafe command mutation classification in policy', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.NetworkExternalMutation] }), SecurityClassification.MalformedPolicy),
  assertContractBlock('unsafe command credential classification in policy', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.CredentialOperation] }), SecurityClassification.MalformedPolicy),
  assertContractBlock('unsafe command unknown classification in policy', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.Unknown] }), SecurityClassification.MalformedPolicy),
  assertContractBlock('mandatory protected path policy floor cannot be removed', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: [] }), SecurityClassification.MalformedPolicy),
  assertContractBlock('mandatory workspace/turbo/package manifest floor cannot be partially removed', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, protectedPathPrefixes: DEFAULT_SECURITY_POLICY.protectedPathPrefixes.filter((prefix) => prefix !== 'turbo.json') }), SecurityClassification.MalformedPolicy),
  assertContractBlock('fake sandbox status in policy', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedSandboxCapabilityStatuses: ['unknown', 'docker_isolated'] }), SecurityClassification.MalformedPolicy),
  assertContractBlock('pending-live sandbox status is not policy-green', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedSandboxCapabilityStatuses: ['unknown', 'blocked/pending-live'] }), SecurityClassification.MalformedPolicy),
  assertContractBlock('unsafe external mode in policy', parseSecurityPolicy({ ...DEFAULT_SECURITY_POLICY, allowedExternalIntegrationModes: ['disabled', 'enabled'] }), SecurityClassification.MalformedPolicy),
  assertContractBlock('unknown gate request field', runSecurityGate({ command: { command: 'node', argv: [], classification: 'read_only' }, unsupported: true }), SecurityClassification.UnknownRequestField),
  assertContractBlock('unknown command field', runSecurityGate({ command: { command: 'node', argv: [], classification: 'read_only', unsupported: true } }), SecurityClassification.UnknownRequestField),
  assertContractBlock('fake sandbox claim', runSecurityGate({ sandboxClaims: [{ provider: 'fake', status: 'container_magic', claim: 'perfect isolation' }] }), SecurityClassification.UnsupportedSandboxClaim),
];
await writeFile(new URL('contract-negative-summary.json', evidenceDir), `${JSON.stringify(cases, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, contractNegativeCount: cases.length }));
