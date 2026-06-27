# Security and safety architecture

This page summarizes the security/safety surface as implemented in `packages/security/src/index.js`. It is a source-linked overview; authoritative policy lives in [DL-22](../decisions/DL-22-security-safety-model.md) and the security package itself.

## Scope

The security package evaluates whether commands, environment configuration, external integrations, sandbox capabilities, and evidence are safe to run/keep **before** anything is spawned or persisted. It is fail-closed: unsafe input is rejected with a typed finding, never silently accepted.

## Constants and versioning

From `packages/security/src/index.js`:

- `SECURITY_POLICY_VERSION = 'security-policy.v1'`
- `SECURITY_PACKAGE_VERSION = '0.1.0-i18a'`
- Enum objects: `SecurityCategory`, `SecurityClassification`, `SecuritySeverity`, `SecurityDecision`, `SecurityGateStatus`, `SandboxCapabilityStatus`, `CommandSafetyClassification`, `ExternalIntegrationMode`.
- `DEFAULT_SECURITY_POLICY` — the frozen default policy object.

## Public evaluation surface

```js
import {
  parseSecurityPolicy,
  evaluateCommandSafety,
  evaluateEnvConfigSafety,
  evaluateExternalIntegrationSafety,
  evaluateSandboxCapability,
  evaluateEvidenceSafety,
  runSecurityGate,
  createSecurityGateResult,
  createSecurityFinding,
  createSecurityAuditEvent
} from "@vibe-engineer/security";
```

| Function | Evaluates |
| --- | --- |
| `evaluateCommandSafety(commandInput, policy?)` | Is a command safe to spawn? (executable, args, classification) |
| `evaluateEnvConfigSafety(input, policy?)` | Is env config free of secrets/production-like values? |
| `evaluateExternalIntegrationSafety(integrationsInput, policy?)` | Are external integrations in an allowed mode? |
| `evaluateSandboxCapability(sandboxInput, policy?)` | Are sandbox capabilities allowed? |
| `evaluateEvidenceSafety(evidenceInput)` | Is evidence free of secrets before persistence? |

Each returns a typed result consumable by `runSecurityGate` / `createSecurityGateResult`.

## Redaction

Two redaction helpers are the canonical way to scrub secrets before persistence or display:

```js
import { redactSecurityText, redactSecurityValue, isSecretLikeValue } from "@vibe-engineer/security";
```

- `redactSecurityText(text)` — redacts secret-like substrings in a string.
- `redactSecurityValue(value)` — deeply redacts an object/value.
- `isSecretLikeValue(value)` — predicate used to detect secret-like content.

The verification runner uses these to redact Evidence Packets, command argv, stdout/stderr sidecars, and runner logs (see [Verification model](./verification-model.md)).

## How it connects to verification

The verification runner's command-runner safety policy (`validateCommandSafety`, `buildEnvironment`) implements the same fail-closed discipline: no shell, typed argv, allowlisted env, bounded resources, no protected write targets. A safety denial produces a `safety_or_security_policy_failure` Evidence Packet rather than a spawn. The two packages are designed to agree on policy; the security package is the canonical policy source.

## Related

- [Verification model](./verification-model.md)
- [DL-22 — Security and Safety Model](../decisions/DL-22-security-safety-model.md)
