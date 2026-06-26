import assert from "node:assert/strict";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  VIBE_CONFIG_FILE_NAME,
  VIBE_CONFIG_SCHEMA,
  createDefaultVibeConfig,
  loadVibeConfigFile,
  loadVibeConfigFromProjectRoot,
  parseVibeConfig
} from "@vibe-engineer/config";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageDir, "../..");
const fixturesDir = join(packageDir, "fixtures", "projects");
const tempRoot = join(packageDir, ".tmp", `run-tests-${process.pid}`);

function fixture(name) {
  return join(fixturesDir, name);
}

function assertOk(result, label) {
  assert.equal(result.ok, true, `${label} should succeed: ${JSON.stringify(result)}`);
  return result;
}

function assertFailure(result, expectedCode, label) {
  assert.equal(result.ok, false, `${label} should fail`);
  assert.equal(result.status === "failure" || result.status === "blocked", true, `${label} should be failure/blocked`);
  assert.equal(result.diagnostics.every((diagnostic) => diagnostic.redacted === true), true, `${label} diagnostics must be redacted`);
  assert.ok(result.issues.some((issue) => issue.code === expectedCode), `${label} should include ${expectedCode}: ${JSON.stringify(result)}`);
  return result;
}

async function assertPathAbsent(path, label) {
  try {
    await stat(path);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
  assert.fail(`${label} unexpectedly exists at ${path}`);
}

async function run() {
  assert.equal(VIBE_CONFIG_FILE_NAME, "vibe-engineer.config.json");
  assert.equal(VIBE_CONFIG_SCHEMA.id, "vibe-engineer.config.v1");
  assert.deepEqual(VIBE_CONFIG_SCHEMA.supportedAgenticHarnesses, ["pi"]);
  assert.deepEqual(VIBE_CONFIG_SCHEMA.deferredAgenticHarnesses, ["claude-code", "codex", "opencode"]);

  const defaults = createDefaultVibeConfig({ agenticHarness: "pi" });
  assert.equal(defaults.agenticHarness, "pi");
  assert.equal(defaults.maxParallelAgents, 8);
  assert.equal(defaults.maxValidationFixIterations, 3);
  assert.equal(defaults.agenticWorkPackageTargetHours, 6);
  assert.equal(defaults.verification.deterministicBlocks, true);
  assert.equal(defaults.verification.advisoryReviewBlocks, false);
  assert.equal(defaults.verification.webE2E, "playwright");
  assert.equal(defaults.verification.mobileE2E.default, "maestro");
  assert.equal(defaults.verification.mobileE2E.advanced, "detox");
  assert.equal(defaults.uiVerification.enabled, true);
  assert.equal(defaults.agentRegistry.validationRequired, true);
  assert.throws(() => createDefaultVibeConfig({ agenticHarness: "codex" }), /Default vibe-engineer config options failed schema validation/);

  const minimal = assertOk(await loadVibeConfigFromProjectRoot(fixture("valid-minimal")), "valid minimal fixture");
  assert.equal(minimal.config.maxParallelAgents, 8);
  assert.equal(minimal.config.maxValidationFixIterations, 3);
  assert.equal(minimal.config.agenticWorkPackageTargetHours, 6);
  assert.equal(minimal.config.verification.deterministicBlocks, true);
  assert.equal(minimal.config.verification.advisoryReviewBlocks, false);
  assert.equal(minimal.config.verification.webE2E, "playwright");
  assert.equal(minimal.config.verification.mobileE2E.default, "maestro");
  assert.equal(minimal.config.verification.mobileE2E.advanced, "detox");
  assert.equal(minimal.config.uiVerification.enabled, true);
  assert.equal(minimal.config.agentRegistry.validationRequired, true);
  assert.equal(minimal.provenance["/agenticHarness"].source, "file");
  assert.equal(minimal.provenance["/maxParallelAgents"].source, "default");
  assert.equal(minimal.provenance["/verification/mobileE2E/default"].source, "default");
  assert.deepEqual(minimal.diagnostics, []);

  const full = assertOk(await loadVibeConfigFromProjectRoot(fixture("valid-full")), "valid full fixture");
  assert.equal(full.config.maxParallelAgents, 4);
  assert.equal(full.config.maxValidationFixIterations, 2);
  assert.equal(full.config.agenticWorkPackageTargetHours, 2.5);
  assert.equal(full.config.verification.advisoryReviewBlocks, true);
  assert.equal(full.config.uiVerification.enabled, false);
  assert.equal(full.provenance["/maxParallelAgents"].source, "file");
  assert.equal(full.provenance["/uiVerification/enabled"].source, "file");

  const boundaryUnknown = JSON.parse(await readFile(join(fixture("valid-minimal"), VIBE_CONFIG_FILE_NAME), "utf8"));
  const parsed = assertOk(parseVibeConfig(boundaryUnknown), "unknown boundary parse");
  assert.equal(parsed.schemaId, VIBE_CONFIG_SCHEMA.id);
  assert.equal(parsed.config.agenticHarness, "pi");

  await rm(tempRoot, { recursive: true, force: true });
  await mkdir(tempRoot, { recursive: true });
  const writerProject = join(tempRoot, "writer-project");
  await mkdir(writerProject, { recursive: true });
  await writeFile(join(writerProject, VIBE_CONFIG_FILE_NAME), `${JSON.stringify({ agenticHarness: "pi", maxParallelAgents: 1 }, null, 2)}\n`, "utf8");
  const writerLoaded = assertOk(await loadVibeConfigFromProjectRoot(writerProject), "writer to filesystem to public loader");
  assert.equal(writerLoaded.config.maxParallelAgents, 1);
  assert.equal(writerLoaded.configPath, join(writerProject, VIBE_CONFIG_FILE_NAME));

  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-unsupported-harness-claude-code")), "UNSUPPORTED_HARNESS", "claude-code harness");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-unsupported-harness-codex")), "UNSUPPORTED_HARNESS", "codex harness");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-unsupported-harness-opencode")), "UNSUPPORTED_HARNESS", "opencode harness");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-unsupported-harness-arbitrary")), "UNSUPPORTED_HARNESS", "arbitrary harness");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-unknown-key")), "UNKNOWN_FIELD", "unknown top-level key");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-nested-key")), "UNKNOWN_FIELD", "unknown nested key");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("missing-config")), "MISSING_CONFIG", "missing config file");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("malformed-json")), "MALFORMED_JSON", "malformed json");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-range-high")), "INVALID_RANGE", "maxParallelAgents high");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-range-low")), "INVALID_RANGE", "maxParallelAgents low");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-fix-iterations-high")), "INVALID_RANGE", "fix iterations high");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-fix-iterations-low")), "INVALID_RANGE", "fix iterations low");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-hours-high")), "INVALID_RANGE", "work package hours high");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-hours-zero")), "INVALID_RANGE", "work package hours zero");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-type")), "INVALID_TYPE", "invalid primitive type");
  assertFailure(await loadVibeConfigFromProjectRoot(fixture("executable-format-only")), "UNSUPPORTED_CONFIG_FORMAT", "unsupported executable/YAML/TOML formats");
  assertFailure(await loadVibeConfigFile(join(fixture("executable-format-only"), "vibe-engineer.config.ts")), "UNSUPPORTED_CONFIG_FORMAT", "direct executable config path");

  const secretLike = assertFailure(await loadVibeConfigFromProjectRoot(fixture("invalid-secret-like-key")), "SECRET_LIKE_FIELD_REJECTED", "secret-like field");
  assert.equal(JSON.stringify(secretLike).includes("super-secret-token-value"), false, "secret-like value must not appear in diagnostics/result");

  const invalidFileResult = assertFailure(await loadVibeConfigFile(join(fixture("invalid-range-high"), VIBE_CONFIG_FILE_NAME)), "INVALID_RANGE", "direct file invalid range");
  assert.equal("config" in invalidFileResult, false, "invalid loader result must not carry defaulted config");

  const mixedUnsupportedProject = join(tempRoot, "mixed-unsupported-project");
  await mkdir(mixedUnsupportedProject, { recursive: true });
  await writeFile(join(mixedUnsupportedProject, VIBE_CONFIG_FILE_NAME), `${JSON.stringify({ agenticHarness: "pi" })}\n`, "utf8");
  await writeFile(join(mixedUnsupportedProject, "vibe-engineer.config.js"), "export default {};\n", "utf8");
  assertFailure(await loadVibeConfigFromProjectRoot(mixedUnsupportedProject), "UNSUPPORTED_CONFIG_FORMAT", "unsupported format present beside JSON");

  const rootManifest = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));
  const configManifest = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8"));
  assert.equal(rootManifest.name, "@vibe-engineer/workspace");
  assert.equal(configManifest.name, "@vibe-engineer/config");
  assert.equal(configManifest.private, true);
  await assertPathAbsent(join(repoRoot, "packages", "core"), "packages/core regression guard");

  const harnessDecision = await readFile(join(repoRoot, "docs", "decisions", "DL-06-agentic-harness-integrations.md"), "utf8");
  assert.ok(harnessDecision.includes("`brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`"), "six locked skills must remain in DL-06");
  assert.ok(harnessDecision.includes("The pi adapter is the only v1-supported adapter target"), "pi-only v1 selectable harness regression guard");

  await rm(tempRoot, { recursive: true, force: true });
}

try {
  await run();
  console.log("@vibe-engineer/config tests passed");
} catch (error) {
  await rm(tempRoot, { recursive: true, force: true });
  throw error;
}
