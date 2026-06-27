# Package exports reference

> **Source of truth:** `packages/*/src/index.js` / `index.ts` / `index.d.ts`, extracted directly from the actual export statements. This page is regenerated/checked by the stale-doc witness. Last curated against the working tree on 2026-06-27.

Each `@vibe-engineer/*` package is a workspace package under `packages/`. This page lists the actual public exports per package. Packages with no public `index` export map are listed as `pending-live`.

## `@vibe-engineer/artifacts`

Canonical JSON Schemas and typed validation for every artifact kind.

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
  validateArtifactKind
} from "@vibe-engineer/artifacts";
```

See [Schemas reference](./schemas.md) for kind/schema details.

## `@vibe-engineer/config`

Project configuration schema, defaults, loading.

```js
import {
  VIBE_CONFIG_FILE_NAME,        // "vibe-engineer.config.json"
  VIBE_CONFIG_SCHEMA_ID,        // "vibe-engineer.config.v1"
  VIBE_CONFIG_SCHEMA_VERSION,   // "1.0.0"
  VIBE_CONFIG_SCHEMA,
  createDefaultVibeConfig,
  parseVibeConfig,
  loadVibeConfigFile,
  loadVibeConfigFromProjectRoot
} from "@vibe-engineer/config";
```

Defaults (from `DEFAULTS`): `maxParallelAgents: 8`, `maxValidationFixIterations: 3`, `agenticWorkPackageTargetHours: 6`, `verification.deterministicBlocks: true`, `verification.advisoryReviewBlocks: false`, `verification.webE2E: "playwright"`, `verification.mobileE2E: { default: "maestro", advanced: "detox" }`, `uiVerification.enabled: true`, `agentRegistry.validationRequired: true`. Required top-level key: `agenticHarness`.

## `@vibe-engineer/context`

Context headers, index, drift, closure.

```js
import {
  CONTEXT_SCHEMA_VERSION,   // "1.0.0"
  CONTEXT_INDEX_VERSION,    // "1.0.0"
  CONTEXT_SCHEMA_IDS,
  defaultProducer,
  createContextHeader,
  writeContextProject,
  buildContextIndex,
  validateContextProject,
  checkContextDrift,
  retrieveContextClosure,
  classifyFindings,
  __providerSeams
} from "@vibe-engineer/context";
```

See [Context and memory model](../architecture/context-memory.md).

## `@vibe-engineer/verification`

Verification runner + Evidence Packets.

```js
import {
  VERIFICATION_RUNNER_VERSION,   // "0.1.0"
  VERIFICATION_STATUSES,
  VERIFICATION_STATUS_VALUES,
  EVIDENCE_RESULTS,
  EVIDENCE_FAILURE_CLASSIFICATIONS,
  EVIDENCE_FAILURE_CLASSIFICATION_VALUES,
  VerificationRunnerError,
  runVerificationPlan
} from "@vibe-engineer/verification";
```

See [Verification model](../architecture/verification-model.md).

## `@vibe-engineer/security`

Security/safety policy + evaluation + redaction.

```js
import {
  SECURITY_POLICY_VERSION,      // "security-policy.v1"
  SECURITY_PACKAGE_VERSION,     // "0.1.0-i18a"
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
  __i18aCliBoundarySmoke
} from "@vibe-engineer/security";
```

See [Security architecture](../architecture/security-architecture.md).

## `@vibe-engineer/orchestration`

Work-plan DAG + durable run state.

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
  assertNoLiveProviderSpawningCapability
} from "@vibe-engineer/orchestration";
```

`assertNoLiveProviderSpawningCapability()` is the package's explicit assertion that it performs no live provider spawning.

## `@vibe-engineer/registry`

Agent/skill registry + locked constants.

```js
import {
  RegistrySeverity,
  RegistryRuleId,
  LOCKED_SKILLS,        // ["brainstorm","grill-me","task","plan","build","ship"]
  PRODUCT_NAME,         // "vibe-engineer"
  ARTIFACT_FLOW,        // ["raw_intent","work_brief","implementation_plan","build_result","ship_packet"]
  discoverRegistryEntryFiles,
  validateRegistryFiles,
  loadRegistry,
  assertRegistryOk,
  packageRootFromImportMeta,
  canonicalSchemaIdsByKind
} from "@vibe-engineer/registry";
```

## `@vibe-engineer/standards`

Domain-neutral standards catalog + validation.

```js
import {
  STANDARD_ERROR_CODES,
  StandardsError,
  SUPPORTED_SCHEMA_VERSION,
  STANDARD_IDS,
  STANDARDS_CATALOG,
  STANDARD_SCHEMA_KINDS,
  STANDARD_SCHEMA_FILES,
  STANDARD_SCHEMA_IDS,
  listStandards,
  loadStandard,
  getStandardsCatalog,
  validateStandardDefinition,
  validateStandardsCatalog,
  schemaPathForKind,
  loadStandardsSchema,
  loadAllStandardsSchemas
} from "@vibe-engineer/standards";
```

See [Standards catalog](../standards/index.md).

## `@vibe-engineer/testing`

Witness helpers.

```js
import {
  createEphemeralWorkspace,
  assertOkResult,
  assertBlockingFinding,
  normalizeForSnapshot
} from "@vibe-engineer/testing";
```

## `@vibe-engineer/observability`

Observability capture/export primitives. Re-exports several grouped modules from `packages/observability/src/index.js` (including `createLocalCapture` from `./test-exporters.js`). Detailed per-symbol reference is `pending-live` until the observability lane stabilizes its public surface.

## `vibe-engineer` (CLI package)

Exports: `.` (entry), `./envelope`, `./command-loader`. See [CLI reference](./cli.md).

## Pending-live packages

The following packages have no public `index` export map in the current tree and are `pending-live`: `adapters`, `contracts`, `mechanical-gates`, `presets`, `schematics`, `skills`. Their behavior must not be claimed as live until their lanes expose a public surface and a witness proves it.
