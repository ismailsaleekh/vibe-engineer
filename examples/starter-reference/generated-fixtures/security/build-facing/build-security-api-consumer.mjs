import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const cliPackageRequire = createRequire(new URL('../../../../../packages/cli/package.json', import.meta.url));
const securityModule = await import(cliPackageRequire.resolve('@vibe-engineer/security'));
const { CommandSafetyClassification, SecurityDecision, SecurityGateStatus, redactSecurityValue, runSecurityGate } = securityModule;

const result = runSecurityGate({
  command: {
    command: 'node examples/starter-reference/generated-fixtures/security/runner/security-hook-runner.mjs',
    argv: ['examples/starter-reference/generated-fixtures/security/requests/safe-local-read-only-command.json'],
    classification: CommandSafetyClassification.ReadOnly,
    targetPaths: ['examples/starter-reference/generated-fixtures/security/requests/safe-local-read-only-command.json']
  },
  env: { NODE_ENV: 'test', VIBE_ENGINEER_MODE: 'local' },
  externalIntegrations: [{ id: 'build-fixture-local', mode: 'local_fixture', enabled: false }],
  sandboxClaims: [{ provider: 'build-fixture', status: 'unknown', claim: 'I-18B records API shape only; I-21 owns build command integration.' }]
});

assert.equal(result.status, SecurityGateStatus.Passed);
assert.equal(result.decision, SecurityDecision.Allow);
console.log(JSON.stringify(redactSecurityValue({ ok: true, status: result.status, futureJoin: 'I-21' })));
