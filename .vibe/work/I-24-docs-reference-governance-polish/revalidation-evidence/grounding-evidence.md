# I-24 grounding evidence (independent adversarial revalidator)

Spot-checks of doc claims against ACTUAL source. Every claim verified exact-match. No fabrication/staleness found.

## 1. schemas.md (`docs/reference/schemas.md`) vs `packages/artifacts/src/schema-registry.js`
- `SUPPORTED_SCHEMA_VERSION = '1.0.0'` → source line 5 ✓
- `ARTIFACT_KINDS` 10 kinds (work_brief … skill_manifest) → source lines 6–16, EXACT order/values ✓
- `SCHEMA_FILES` map (10 entries, kind→schema file) → source lines 18–30, EXACT ✓
- Validation API exports (ARTIFACT_KINDS, SCHEMA_FILES, SUPPORTED_SCHEMA_VERSION, schemaPathForKind, loadSchema, loadAllSchemas, validateArtifact, validateArtifactKind, validateArtifactFile, compileAllArtifactSchemas, ValidationErrorCode) → `packages/artifacts/src/index.js` lines 1–3, ALL PRESENT ✓

## 2. standards/index.md vs `packages/standards/src/catalog-data.js`
- catalogId `vibe-engineer-core-standards` → source line 208 ✓
- 7 standards (typed-boundary-contracts, real-boundary-witnesses, domain-neutral-core, dirty-tree-ownership, report-first-evidence, dependency-hygiene, deterministic-schematics) → 7 standardId occurrences ✓
- 14 requirement ids (2 per standard) → all match ✓
- API exports (listStandards/loadStandard/getStandardsCatalog/validateStandardDefinition/validateStandardsCatalog/STANDARD_IDS/STANDARDS_CATALOG/STANDARD_SCHEMA_KINDS=["standard-definition","standards-catalog"]/STANDARD_SCHEMA_FILES/STANDARD_SCHEMA_IDS/loadStandardsSchema/loadAllStandardsSchemas/STANDARD_ERROR_CODES/StandardsError) → `index.js` lines 5–16,37–59 + `.d.ts` lines 126–137, ALL PRESENT ✓

## 3. cli.md vs loader.js / result-envelope.js / errors/codes.js / package.json
- Foundation commands {help, version, foundation} → `loader.js` FOUNDATION_COMMANDS lines 139–142 ✓
- LATER_COMMANDS = {create, import, doctor, config, schematic, verify, security, build, ship, context, registry, update, init} → loader.js lines 6–20 EXACT SET ✓
- `CLI_RESULT_SCHEMA_VERSION = "vibe-engineer.cli.result.v1"` → envelope line 10 ✓
- `CLI_STATUSES = ["success","failure","blocked","partial"]` → envelope line 11 ✓
- EXIT_CODES table (success 0 / det-failure 1 / invalid-invocation 2 / invalid-project-or-config 3 / safety-block 4 / ownership 5 / external 6 / internal 7 / partial 8) → codes.js EXIT_CODES lines 33–43 EXACT ✓
- CliClassification (13 values) + CliErrorCode (13 codes) → codes.js lines 1–31 EXACT ✓
- Envelope exports (exitCodeFor, artifactDescriptor, createEnvelope, payload, invalidInvocationEnvelope, internalErrorEnvelope, configBlockedEnvelope, foundationFailureEnvelope, partialEnvelope, validateCliResultEnvelope, writeResultFileAtomic, envelopeBytes, sha256Text) → all present ✓
- Package subpaths {".","./envelope","./command-loader"} → cli package.json exports EXACT ✓

## 4. packages.md vs each package index
- artifacts ✓ (above)
- config: VIBE_CONFIG_FILE_NAME/SHEMA_ID/SCHEMA_VERSION + DEFAULTS (maxParallelAgents 8, maxValidationFixIterations 3, agenticWorkPackageTargetHours 6, verification.deterministicBlocks true, advisoryReviewBlocks false, webE2E "playwright", mobileE2E {default maestro, advanced detox}, uiVerification.enabled true, agentRegistry.validationRequired true, required key agenticHarness) → config src lines 4–57 EXACT ✓
- context (12 exports incl. CONTEXT_SCHEMA_VERSION='1.0.0', __providerSeams) → index.js lines 7–1157 ✓
- verification (8 exports, VERIFICATION_RUNNER_VERSION='0.1.0') → index.js lines 8–706 ✓
- orchestration (16 exports incl. assertNoLiveProviderSpawningCapability) → index.ts lines 6–873 ✓
- registry (LOCKED_SKILLS 6, PRODUCT_NAME 'vibe-engineer', ARTIFACT_FLOW 5) → registry/src/index.js lines 34–36 ✓
- security (24 exports, SECURITY_PACKAGE_VERSION='0.1.0-i18a') → index.js lines 3–881 ✓
- testing (4 exports) → index.js lines 5–44 ✓
- pending-live packages (adapters/contracts/mechanical-gates/presets/schematics/skills) correctly NOT claimed as live ✓

## 5. artifact-chain.md behavioral claims vs `packages/verification/src/index.js`
- Implementation Plan must be `status:"approved"` + embed verification_delta → line 717–718 (PLAN_NOT_APPROVED / INVALID_VERIFICATION_DELTA) ✓
- requiredItem action ∈ {add, update, reuse, not_applicable, blocked} → line 51 DELTA_ACTIONS EXACT ✓
- evidenceClass ∈ {deterministic, advisory, informational} → line 53 EVIDENCE_CLASSES EXACT ✓
- ARTIFACT_FLOW raw_intent→work_brief→implementation_plan→build_result→ship_packet → registry line 36 ✓
- LOCKED_SKILLS 6 → registry line 34 ✓

## 6. VitePress config (`docs/.vitepress/config.ts`)
- Well-formed TS, defineConfig import, valid themeConfig ✓
- All nav/sidebar link targets resolve to real docs files (system-overview, architecture/index, artifact-chain, verification-model, context-memory, mechanical-gates, security-architecture, reference/{index,packages,cli,schemas}, standards/, guides/* all exist) ✓
- vitepress CLI NOT run (per license) ✓
- NOTE (non-blocking): nav "Decisions" → /decisions/ while srcExclude excludes decisions/** — link would 404 in a built site. Paths exist on disk; srcExclude is a deliberate DL-21 separate-closure choice. Minor-local cosmetic only; not fabrication/staleness.

## Witness re-runs (independent)
- stale-doc-witness.mjs → severity=clean, findings=0, exit=0 (see stale-doc-revalidation.log)
- markdownlint-cli2 (scoped config, 15 owned docs) → 0 errors, exit=0 (see markdownlint-revalidation.log)
