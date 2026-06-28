# Package exports reference

> **Source of truth:** public package `package.json` export maps and their `src/**` entry files. Runtime packages are built to `dist` with `tsup` before packing.

## Public v0.1 package graph

The publishable graph contains exactly ten packages:

```txt
vibe-engineer
@vibe-engineer/adapter-pi
@vibe-engineer/artifacts
@vibe-engineer/config
@vibe-engineer/context
@vibe-engineer/orchestration
@vibe-engineer/schematics
@vibe-engineer/security
@vibe-engineer/skills
@vibe-engineer/verification
```

No public package depends on an unpublished private workspace package at runtime.

## `vibe-engineer`

CLI package and binary.

| Subpath            | Types                                  | Import                               |
| ------------------ | -------------------------------------- | ------------------------------------ |
| `.`                | `./dist/entry/vibe-engineer.d.ts`      | `./dist/entry/vibe-engineer.js`      |
| `./envelope`       | `./dist/envelope/result-envelope.d.ts` | `./dist/envelope/result-envelope.js` |
| `./command-loader` | `./dist/command-loader/loader.d.ts`    | `./dist/command-loader/loader.js`    |

```js
import { runCli } from "vibe-engineer";
import { validateCliResultEnvelope } from "vibe-engineer/envelope";
import { createCommandLoader } from "vibe-engineer/command-loader";
```

## `@vibe-engineer/artifacts`

Canonical artifact schemas and validators.

```js
import {
  ARTIFACT_KINDS,
  SCHEMA_FILES,
  SUPPORTED_SCHEMA_VERSION,
  loadAllSchemas,
  loadSchema,
  schemaPathForKind,
  ValidationErrorCode,
  compileAllArtifactSchemas,
  validateArtifact,
  validateArtifactFile,
  validateArtifactKind,
} from "@vibe-engineer/artifacts";
```

Also exports `./schemas` and `./schemas/*` for public schema assets.

## `@vibe-engineer/config`

Project configuration defaults, schema, parser, and loaders.

```js
import {
  VIBE_CONFIG_FILE_NAME,
  VIBE_CONFIG_SCHEMA_ID,
  VIBE_CONFIG_SCHEMA_VERSION,
  VIBE_CONFIG_SCHEMA,
  createDefaultVibeConfig,
  parseVibeConfig,
  loadVibeConfigFile,
  loadVibeConfigFromProjectRoot,
} from "@vibe-engineer/config";
```

## `@vibe-engineer/context`

Context headers, graph/index, drift, validation, and retrieval.

```js
import {
  CONTEXT_SCHEMA_VERSION,
  CONTEXT_INDEX_VERSION,
  CONTEXT_SCHEMA_IDS,
  defaultProducer,
  createContextHeader,
  writeContextProject,
  buildContextIndex,
  validateContextProject,
  checkContextDrift,
  retrieveContextClosure,
  classifyFindings,
  __providerSeams,
} from "@vibe-engineer/context";
```

## `@vibe-engineer/orchestration`

Work-plan DAG and durable run-state primitives.

```js
import {
  DEFAULT_ORCHESTRATION_LIMITS,
  OrchestrationContractError,
  parseWorkPlan,
  validateDag,
  validateWorkPackageSizing,
  validateOwnershipClaims,
  readWorkPlanFile,
  createInitialRunState,
  parseRunState,
  loadRunState,
  selectReadyNodes,
  persistScheduleDecision,
  transitionNode,
  joinValidatedOutputs,
  inspectResumeState,
  assertNoLiveProviderSpawningCapability,
} from "@vibe-engineer/orchestration";
```

## `@vibe-engineer/schematics`

Manifest-driven schematic engine.

```js
import {
  loadSchematicDefinition,
  planSchematic,
  executeSchematic,
  assertDryRunWriteForbidden,
  DOMAIN_FORBIDDEN_TERMS,
  sha256Text,
  stableJson,
} from "@vibe-engineer/schematics";
```

## `@vibe-engineer/security`

Security/safety policy, command/env/external integration checks, and redaction.

```js
import {
  SECURITY_POLICY_VERSION,
  SECURITY_PACKAGE_VERSION,
  SecurityCategory,
  SecurityClassification,
  SecuritySeverity,
  SecurityDecision,
  SecurityGateStatus,
  SandboxCapabilityStatus,
  CommandSafetyClassification,
  ExternalIntegrationMode,
  DEFAULT_SECURITY_POLICY,
  redactSecurityText,
  redactSecurityValue,
  isSecretLikeValue,
  createSecurityFinding,
  parseSecurityPolicy,
  createSecurityAuditEvent,
  createSecurityGateResult,
  runSecurityGate,
  evaluateCommandSafety,
  evaluateEnvConfigSafety,
  evaluateExternalIntegrationSafety,
  evaluateSandboxCapability,
  evaluateEvidenceSafety,
} from "@vibe-engineer/security";
```

## `@vibe-engineer/skills`

Build and ship skill runtime primitives. These APIs support harness-native skills; the six skill names are not CLI commands.

| Subpath                             | Purpose                                                 |
| ----------------------------------- | ------------------------------------------------------- |
| `@vibe-engineer/skills/build`       | Build Result production and verification/context hooks. |
| `@vibe-engineer/skills/ship`        | Ship Packet production and final proof orchestration.   |
| `@vibe-engineer/skills/ship/intake` | Ship intake helpers.                                    |

```js
import { runBuildFromImplementationPlan } from "@vibe-engineer/skills/build";
import { runShipFromBuildResult } from "@vibe-engineer/skills/ship";
```

## `@vibe-engineer/verification`

Verification runner and Evidence Packet output.

```js
import {
  VERIFICATION_RUNNER_VERSION,
  VERIFICATION_STATUSES,
  VERIFICATION_STATUS_VALUES,
  EVIDENCE_RESULTS,
  EVIDENCE_FAILURE_CLASSIFICATIONS,
  EVIDENCE_FAILURE_CLASSIFICATION_VALUES,
  VerificationRunnerError,
  runVerificationPlan,
} from "@vibe-engineer/verification";
```

## `@vibe-engineer/adapter-pi`

Pi adapter public subpaths.

| Subpath                                             | Purpose                                                     |
| --------------------------------------------------- | ----------------------------------------------------------- |
| `@vibe-engineer/adapter-pi/capabilities`            | Pi capability matrix and selection checks.                  |
| `@vibe-engineer/adapter-pi/generated-file-manifest` | Generated file manifest and summary helpers.                |
| `@vibe-engineer/adapter-pi/create-consumption`      | Create/import pi asset selection and write-plan validation. |
| `@vibe-engineer/adapter-pi/schema`                  | Shared pi adapter schemas and validators.                   |

## Private workspace packages

The repository also contains private source/test/tooling packages such as observability, registry, standards, testing, mechanical gates, presets, contracts, and Pulumi scaffolding. They are not public runtime dependencies of the v0.1 package graph and are not published in v0.1.
