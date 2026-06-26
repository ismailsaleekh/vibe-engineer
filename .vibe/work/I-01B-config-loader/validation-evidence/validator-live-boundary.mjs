import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  VIBE_CONFIG_FILE_NAME,
  VIBE_CONFIG_SCHEMA,
  createDefaultVibeConfig,
  loadVibeConfigFile,
  loadVibeConfigFromProjectRoot,
  parseVibeConfig
} from "@vibe-engineer/config";

const packageDir = process.cwd();
const repoRoot = resolve(packageDir, "../..");
const evidenceDir = process.env.VALIDATION_EVIDENCE_DIR;
assert.ok(evidenceDir, "VALIDATION_EVIDENCE_DIR must be set");
const fixtureRoot = join(packageDir, "fixtures", "projects");
const liveRoot = join(evidenceDir, "live-boundary-projects");

function fixture(name) {
  return join(fixtureRoot, name);
}

async function writeJsonProject(name, payload) {
  const projectRoot = join(liveRoot, name);
  await mkdir(projectRoot, { recursive: true });
  await writeFile(join(projectRoot, VIBE_CONFIG_FILE_NAME), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return projectRoot;
}

async function writeTextProject(name, fileName, content) {
  const projectRoot = join(liveRoot, name);
  await mkdir(projectRoot, { recursive: true });
  await writeFile(join(projectRoot, fileName), content, "utf8");
  return projectRoot;
}

function assertSuccess(result, label) {
  assert.equal(result.ok, true, `${label} expected success: ${JSON.stringify(result)}`);
  assert.equal(result.status, "success", `${label} status`);
  assert.equal(result.schemaId, "vibe-engineer.config.v1", `${label} schema id`);
  assert.deepEqual(result.diagnostics, [], `${label} diagnostics`);
  return result;
}

function assertFailure(result, code, label) {
  assert.equal(result.ok, false, `${label} expected failure`);
  assert.ok(result.status === "failure" || result.status === "blocked", `${label} status`);
  assert.ok(result.issues.some((issue) => issue.code === code), `${label} missing ${code}: ${JSON.stringify(result)}`);
  assert.ok(result.diagnostics.every((diagnostic) => diagnostic.redacted === true), `${label} diagnostics redacted`);
  assert.equal(Object.hasOwn(result, "config"), false, `${label} must not expose defaulted config on failure`);
  return result;
}

await rm(liveRoot, { recursive: true, force: true });
await mkdir(liveRoot, { recursive: true });

assert.equal(VIBE_CONFIG_FILE_NAME, "vibe-engineer.config.json");
assert.equal(VIBE_CONFIG_SCHEMA.id, "vibe-engineer.config.v1");
assert.deepEqual(VIBE_CONFIG_SCHEMA.supportedAgenticHarnesses, ["pi"]);
assert.deepEqual(VIBE_CONFIG_SCHEMA.deferredAgenticHarnesses, ["claude-code", "codex", "opencode"]);

const defaultConfig = createDefaultVibeConfig({ agenticHarness: "pi" });
assert.equal(defaultConfig.maxParallelAgents, 8);
assert.equal(defaultConfig.maxValidationFixIterations, 3);
assert.equal(defaultConfig.agenticWorkPackageTargetHours, 6);
assert.equal(defaultConfig.verification.deterministicBlocks, true);
assert.equal(defaultConfig.verification.advisoryReviewBlocks, false);
assert.throws(() => createDefaultVibeConfig({ agenticHarness: "opencode" }), /Default vibe-engineer config options failed schema validation/);

const minimalFixture = assertSuccess(await loadVibeConfigFromProjectRoot(fixture("valid-minimal")), "minimal fixture");
assert.equal(minimalFixture.config.agenticHarness, "pi");
assert.equal(minimalFixture.config.maxParallelAgents, 8);
assert.equal(minimalFixture.config.maxValidationFixIterations, 3);
assert.equal(minimalFixture.config.agenticWorkPackageTargetHours, 6);
assert.equal(minimalFixture.config.verification.webE2E, "playwright");
assert.equal(minimalFixture.config.verification.mobileE2E.default, "maestro");
assert.equal(minimalFixture.config.verification.mobileE2E.advanced, "detox");
assert.equal(minimalFixture.config.uiVerification.enabled, true);
assert.equal(minimalFixture.config.agentRegistry.validationRequired, true);
assert.equal(minimalFixture.provenance["/agenticHarness"].source, "file");
assert.equal(minimalFixture.provenance["/maxParallelAgents"].source, "default");
assert.equal(minimalFixture.provenance["/verification/mobileE2E/default"].source, "default");

const freshValidRoot = await writeJsonProject("fresh-valid-full", {
  agenticHarness: "pi",
  maxParallelAgents: 3,
  maxValidationFixIterations: 1,
  agenticWorkPackageTargetHours: 4.25,
  verification: {
    deterministicBlocks: true,
    advisoryReviewBlocks: true,
    webE2E: "playwright",
    mobileE2E: { default: "maestro", advanced: "detox" }
  },
  uiVerification: { enabled: false },
  agentRegistry: { validationRequired: true }
});
const freshValid = assertSuccess(await loadVibeConfigFromProjectRoot(freshValidRoot), "fresh writer boundary valid config");
assert.equal(freshValid.config.maxParallelAgents, 3);
assert.equal(freshValid.config.maxValidationFixIterations, 1);
assert.equal(freshValid.config.agenticWorkPackageTargetHours, 4.25);
assert.equal(freshValid.config.verification.advisoryReviewBlocks, true);
assert.equal(freshValid.config.uiVerification.enabled, false);
assert.equal(freshValid.provenance["/maxParallelAgents"].source, "file");
const consumerTotal = freshValid.config.maxParallelAgents + freshValid.config.maxValidationFixIterations + freshValid.config.agenticWorkPackageTargetHours;
assert.equal(consumerTotal, 8.25, "typed consumer can use resolved numeric config");

const boundaryUnknown = JSON.parse(await readFile(join(freshValidRoot, VIBE_CONFIG_FILE_NAME), "utf8"));
const parsedUnknown = assertSuccess(parseVibeConfig(boundaryUnknown), "fresh unknown-boundary parser");
assert.equal(parsedUnknown.config.verification.mobileE2E.advanced, "detox");

assertFailure(await loadVibeConfigFromProjectRoot(await writeJsonProject("bad-harness-codex", { agenticHarness: "codex" })), "UNSUPPORTED_HARNESS", "codex harness");
assertFailure(await loadVibeConfigFromProjectRoot(await writeJsonProject("bad-harness-arbitrary", { agenticHarness: "not-real" })), "UNSUPPORTED_HARNESS", "arbitrary harness");
assertFailure(await loadVibeConfigFromProjectRoot(await writeJsonProject("bad-top-key", { agenticHarness: "pi", extra: true })), "UNKNOWN_FIELD", "unknown top key");
assertFailure(await loadVibeConfigFromProjectRoot(await writeJsonProject("bad-nested-key", { agenticHarness: "pi", verification: { mobileE2E: { extra: true } } })), "UNKNOWN_FIELD", "unknown nested key");
assertFailure(await loadVibeConfigFromProjectRoot(await writeTextProject("missing-config", "README.md", "no config here\n")), "MISSING_CONFIG", "missing config");
assertFailure(await loadVibeConfigFromProjectRoot(await writeTextProject("malformed-json", VIBE_CONFIG_FILE_NAME, "{\"agenticHarness\":\"pi\",\n")), "MALFORMED_JSON", "malformed json");
assertFailure(await loadVibeConfigFromProjectRoot(await writeJsonProject("bad-range", { agenticHarness: "pi", maxParallelAgents: 99 })), "INVALID_RANGE", "invalid maxParallelAgents");
assertFailure(await loadVibeConfigFromProjectRoot(await writeJsonProject("bad-type", { agenticHarness: "pi", verification: { deterministicBlocks: "true" } })), "INVALID_TYPE", "invalid boolean type");
assertFailure(await loadVibeConfigFromProjectRoot(await writeTextProject("ts-only", "vibe-engineer.config.ts", "export default { agenticHarness: 'pi' };\n")), "UNSUPPORTED_CONFIG_FORMAT", "ts-only unsupported format");
const mixedRoot = await writeJsonProject("mixed-json-yaml", { agenticHarness: "pi" });
await writeFile(join(mixedRoot, "vibe-engineer.config.yaml"), "agenticHarness: pi\n", "utf8");
assertFailure(await loadVibeConfigFromProjectRoot(mixedRoot), "UNSUPPORTED_CONFIG_FORMAT", "yaml present beside JSON");
assertFailure(await loadVibeConfigFile(join(mixedRoot, "vibe-engineer.config.toml")), "UNSUPPORTED_CONFIG_FORMAT", "direct toml config path");

const secretSentinel = "redaction-sentinel-token-value";
const secretResult = assertFailure(await loadVibeConfigFromProjectRoot(await writeJsonProject("bad-secret-field", { agenticHarness: "pi", token: secretSentinel })), "SECRET_LIKE_FIELD_REJECTED", "secret-like field");
assert.equal(JSON.stringify(secretResult).includes(secretSentinel), false, "secret value must not be emitted in result/diagnostics");

const rootManifest = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
const configManifest = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8"));
assert.equal(rootManifest.name, "@vibe-engineer/workspace");
assert.equal(configManifest.name, "@vibe-engineer/config");
assert.equal(configManifest.private, true);

console.log(JSON.stringify({
  verdict: "live-boundary-pass",
  schemaId: VIBE_CONFIG_SCHEMA.id,
  freshValidConfigPath: freshValid.configPath,
  liveRoot,
  checkedRootPackage: rootManifest.name,
  checkedConfigPackage: configManifest.name
}, null, 2));
