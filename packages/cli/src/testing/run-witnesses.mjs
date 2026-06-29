import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validateArtifactFile } from "@vibe-engineer/artifacts";
import { loadVibeConfigFile } from "@vibe-engineer/config";
import { createCommandLoader } from "../command-loader/loader.js";
import { createEnvelope, payload, validateCliResultEnvelope } from "../envelope/result-envelope.js";
import { sanitizeArgvForMetadata } from "../errors/sanitization.js";
import { CliClassification, CliErrorCode } from "../errors/codes.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const entry = resolve(repoRoot, "packages/cli/src/entry/vibe-engineer.js");
const defaultEvidenceRun = `package-test-${new Date().toISOString().replaceAll("-", "").replaceAll(":", "").replaceAll(".", "")}`;
const evidenceCarrierRoot = resolve(repoRoot, ".vibe/work/I-02A-cli-loader-envelope/evidence");
const packageLocalVibeRoot = resolve(repoRoot, "packages/cli/.vibe");

function isStrictDescendant(target, parent) {
  const relativePath = relative(parent, target);
  return relativePath !== "" && relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath);
}

function resolveEvidenceRoot(envRoot) {
  const candidate = envRoot
    ? (isAbsolute(envRoot) ? resolve(envRoot) : resolve(repoRoot, envRoot))
    : resolve(evidenceCarrierRoot, "fix", defaultEvidenceRun);

  if (isStrictDescendant(candidate, packageLocalVibeRoot)) {
    throw new Error(`Invalid I02A_CLI_TEST_EVIDENCE_ROOT: package-local .vibe evidence is forbidden (${candidate})`);
  }

  if (!isStrictDescendant(candidate, evidenceCarrierRoot)) {
    throw new Error(`Invalid I02A_CLI_TEST_EVIDENCE_ROOT: evidence root must be under ${evidenceCarrierRoot}/ (${candidate})`);
  }

  return candidate;
}

const evidenceRoot = resolveEvidenceRoot(process.env.I02A_CLI_TEST_EVIDENCE_ROOT);
rmSync(evidenceRoot, { recursive: true, force: true });
mkdirSync(evidenceRoot, { recursive: true });

function runCase(name, args, options = {}) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: options.env ?? process.env
  });
  const safe = name.replaceAll("/", "_");
  writeFileSync(resolve(evidenceRoot, `${safe}.cmd.txt`), `node ${entry} ${sanitizeArgvForMetadata(args).join(" ")}\n`, "utf8");
  writeFileSync(resolve(evidenceRoot, `${safe}.stdout`), result.stdout, "utf8");
  writeFileSync(resolve(evidenceRoot, `${safe}.stderr`), result.stderr, "utf8");
  writeFileSync(resolve(evidenceRoot, `${safe}.exit`), `${result.status}\n`, "utf8");
  if (options.expectStdoutJson !== false && result.stdout.length > 0) {
    return { result, envelope: JSON.parse(result.stdout) };
  }
  return { result, envelope: null };
}

function assertEnvelope(envelope) {
  const validation = validateCliResultEnvelope(envelope);
  assert.equal(validation.ok, true, validation.errors?.join("; "));
}

function fixturePath(name) {
  return resolve(evidenceRoot, name);
}

function writeFixture(relativePath, content) {
  const target = fixturePath(relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
  return target;
}

function assertNoCanary(caseName, canary, ...values) {
  for (const value of values) {
    assert.equal(String(value).includes(canary), false, `${caseName} leaked canary`);
  }
}

function scanEvidenceForCanary(root, canary) {
  const leaks = [];
  for (const entryName of readdirSync(root)) {
    const target = resolve(root, entryName);
    const stat = statSync(target);
    if (stat.isDirectory()) leaks.push(...scanEvidenceForCanary(target, canary));
    if (stat.isFile() && readFileSync(target, "utf8").includes(canary)) leaks.push(target);
  }
  return leaks;
}

const validConfigPath = writeFixture("valid-project/vibe-engineer.config.json", JSON.stringify({ agenticHarness: "pi" }, null, 2));
const malformedConfigPath = writeFixture("malformed-project/vibe-engineer.config.json", "{ not json");
const unsupportedConfigPath = writeFixture("unsupported-project/vibe-engineer.config.json", JSON.stringify({ agenticHarness: "codex" }, null, 2));
const secretCanary = "I02A_FIX_SECRET_CANARY_DO_NOT_LEAK";

const providerConfig = await loadVibeConfigFile(validConfigPath);
assert.equal(providerConfig.ok, true);
assert.equal(typeof validateArtifactFile, "function");

const loader = createCommandLoader();
assert.deepEqual(loader.listCommands().map((item) => item.id).sort(), ["config", "create", "doctor", "foundation", "help", "import", "schematic", "security", "verify", "version"]);
assert.throws(() => createCommandLoader([{ id: "dup", visibility: "internal", description: "a", run() {} }, { id: "dup", visibility: "internal", description: "b", run() {} }]), { code: CliErrorCode.DuplicateCommandId, classification: CliClassification.InvalidInvocation });
assert.throws(() => createCommandLoader([{ id: "bad", visibility: "internal", description: "missing run" }]), { code: CliErrorCode.MalformedCommandMetadata, classification: CliClassification.InvalidInvocation });

const success = runCase("version-success", ["version", "--json", "--non-interactive"]);
assert.equal(success.result.status, 0);
assertEnvelope(success.envelope);
assert.equal(success.envelope.status, "success");
assert.equal(success.envelope.exitCode, 0);
assert.equal(success.envelope.payload.kind, "version_result");
assert.equal(success.result.stdout.trim().startsWith("{"), true);
assert.equal(success.result.stderr, "");

const humanVersion = runCase("version-human-default", ["version"], { expectStdoutJson: false });
assert.equal(humanVersion.result.status, 0);
assert.match(humanVersion.result.stdout, /^vibe-engineer \d+\.\d+\.\d+\n$/u);
assert.equal(humanVersion.result.stderr, "");

const humanHelp = runCase("help-human-default", ["help"], { expectStdoutJson: false });
assert.equal(humanHelp.result.status, 0);
assert.equal(humanHelp.result.stdout.includes("vibe-engineer commands:"), true);
assert.equal(humanHelp.result.stdout.includes("create"), true);

const resultPath = fixturePath("result-file-envelope.json");
const resultFile = runCase("result-file", ["version", "--json", "--result-file", resultPath, "--non-interactive"]);
assert.equal(resultFile.result.status, 0);
assertEnvelope(resultFile.envelope);
const fileEnvelope = JSON.parse(readFileSync(resultPath, "utf8"));
assert.deepEqual(fileEnvelope, resultFile.envelope);
assert.equal(fileEnvelope.artifacts.some((item) => item.path === resultPath && item.kind === "cli_result"), true);

const unknownCommand = runCase("unknown-command", ["unknown-command", "--json", "--non-interactive"]);
assert.equal(unknownCommand.result.status, 2);
assertEnvelope(unknownCommand.envelope);
assert.equal(unknownCommand.envelope.status, "blocked");
assert.equal(unknownCommand.envelope.errors[0].classification, CliClassification.InvalidInvocation);

// WP-03: `create` is now a registered v0.1 command, so it routes to the live createCommand
// (own typed invalid/missing-arg envelope), NOT the loader's UnsupportedOperation branch
// and NOT the Unknown-command branch. The exact create error depends on args/harness state;
// the routing predicate is: classification != unsupported_operation AND code != VE_UNSUPPORTED_OPERATION.
const createRoute = runCase("live-command-create", ["create", "--json", "--non-interactive"]);
assertEnvelope(createRoute.envelope);
assert.notEqual(createRoute.envelope.errors[0].classification, CliClassification.UnsupportedOperation);
assert.notEqual(createRoute.envelope.errors[0].code, CliErrorCode.UnsupportedOperation);

const unknownFlag = runCase("unknown-flag", ["version", "--bad-flag", "--json", "--non-interactive"]);
assert.equal(unknownFlag.result.status, 2);
assertEnvelope(unknownFlag.envelope);
assert.equal(unknownFlag.envelope.errors[0].classification, CliClassification.InvalidInvocation);

const inlineSecret = runCase("secret-inline-global-unknown", [`--password=${secretCanary}`, "version", "--json", "--non-interactive"]);
assert.equal(inlineSecret.result.status, 2);
assertEnvelope(inlineSecret.envelope);
assertNoCanary("secret-inline-global-unknown", secretCanary, inlineSecret.result.stdout, inlineSecret.result.stderr, JSON.stringify(inlineSecret.envelope));
assert.deepEqual(inlineSecret.envelope.invocation.argv.includes(`--password=${secretCanary}`), false);

const separateSecret = runCase("secret-separate-global-unknown", ["--api-key", secretCanary, "version", "--json", "--non-interactive"]);
assert.equal(separateSecret.result.status, 2);
assertEnvelope(separateSecret.envelope);
assertNoCanary("secret-separate-global-unknown", secretCanary, separateSecret.result.stdout, separateSecret.result.stderr, JSON.stringify(separateSecret.envelope));

const commandInlineSecret = runCase("secret-inline-command-unknown", ["foundation", `--token=${secretCanary}`, "--json", "--non-interactive"]);
assert.equal(commandInlineSecret.result.status, 2);
assertEnvelope(commandInlineSecret.envelope);
assertNoCanary("secret-inline-command-unknown", secretCanary, commandInlineSecret.result.stdout, commandInlineSecret.result.stderr, JSON.stringify(commandInlineSecret.envelope));

const unexpectedPositional = runCase("secret-unexpected-positional", ["version", secretCanary, "--json", "--non-interactive"]);
assert.equal(unexpectedPositional.result.status, 2);
assertEnvelope(unexpectedPositional.envelope);
assertNoCanary("secret-unexpected-positional", secretCanary, unexpectedPositional.result.stdout, unexpectedPositional.result.stderr, JSON.stringify(unexpectedPositional.envelope));

const invalidStatusSecret = runCase("secret-invalid-foundation-status", ["foundation", "--status", secretCanary, "--json", "--non-interactive"]);
assert.equal(invalidStatusSecret.result.status, 2);
assertEnvelope(invalidStatusSecret.envelope);
assertNoCanary("secret-invalid-foundation-status", secretCanary, invalidStatusSecret.result.stdout, invalidStatusSecret.result.stderr, JSON.stringify(invalidStatusSecret.envelope));

const envSecret = runCase("secret-env-canary", ["version", "--json", "--non-interactive"], { env: { ...process.env, I02A_FIX_ENV_CANARY: secretCanary } });
assert.equal(envSecret.result.status, 0);
assertEnvelope(envSecret.envelope);
assertNoCanary("secret-env-canary", secretCanary, envSecret.result.stdout, envSecret.result.stderr, JSON.stringify(envSecret.envelope));

const missingResultValue = runCase("missing-result-file-value", ["version", "--json", "--result-file"]);
assert.equal(missingResultValue.result.status, 2);
assertEnvelope(missingResultValue.envelope);
assert.equal(missingResultValue.envelope.errors[0].code, CliErrorCode.MissingFlagValue);

const badResultPath = fixturePath("missing-dir/out.json");
const badResult = runCase("invalid-result-file-path", ["version", "--json", "--result-file", badResultPath, "--non-interactive"]);
assert.equal(badResult.result.status, 5);
assertEnvelope(badResult.envelope);
assert.equal(badResult.envelope.status, "blocked");
assert.equal(badResult.envelope.errors[0].classification, CliClassification.WriteConflict);
assert.equal(existsSync(badResultPath), false);

const configSuccess = runCase("config-success", ["version", "--json", "--config", validConfigPath, "--non-interactive"]);
assert.equal(configSuccess.result.status, 0);
assertEnvelope(configSuccess.envelope);
assert.equal(configSuccess.envelope.invocation.configPath, validConfigPath);

const malformedConfig = runCase("malformed-config", ["version", "--json", "--config", malformedConfigPath, "--non-interactive"]);
assert.equal(malformedConfig.result.status, 3);
assertEnvelope(malformedConfig.envelope);
assert.equal(malformedConfig.envelope.status, "blocked");
assert.equal(malformedConfig.envelope.errors[0].classification, CliClassification.InvalidConfig);

const unsupportedConfig = runCase("unsupported-config", ["version", "--json", "--config", unsupportedConfigPath, "--non-interactive"]);
assert.equal(unsupportedConfig.result.status, 3);
assertEnvelope(unsupportedConfig.envelope);
assert.equal(unsupportedConfig.envelope.errors[0].classification, CliClassification.InvalidConfig);

const secretConfigDir = fixturePath("secret-config-input");
const secretConfigPath = writeFixture("secret-config-input/vibe-engineer.config.json", JSON.stringify({ agenticHarness: "codex", token: secretCanary }, null, 2));
const secretConfig = runCase("secret-config-invalid-field", ["version", "--json", "--config", secretConfigPath, "--non-interactive"]);
assert.equal(secretConfig.result.status, 3);
assertEnvelope(secretConfig.envelope);
assertNoCanary("secret-config-invalid-field", secretCanary, secretConfig.result.stdout, secretConfig.result.stderr, JSON.stringify(secretConfig.envelope));
rmSync(secretConfigDir, { recursive: true, force: true });

const secretResultPath = fixturePath("secret-inline-result-file.json");
const secretResultFile = runCase("secret-inline-result-file", ["--result-file", secretResultPath, `--token=${secretCanary}`, "version", "--json", "--non-interactive"]);
assert.equal(secretResultFile.result.status, 2);
assertEnvelope(secretResultFile.envelope);
assertNoCanary("secret-inline-result-file", secretCanary, secretResultFile.result.stdout, secretResultFile.result.stderr, JSON.stringify(secretResultFile.envelope), readFileSync(secretResultPath, "utf8"));

const deterministicFailure = runCase("simulated-failure", ["foundation", "--status", "failure", "--json", "--non-interactive"]);
assert.equal(deterministicFailure.result.status, 1);
assertEnvelope(deterministicFailure.envelope);
assert.equal(deterministicFailure.envelope.status, "failure");
assert.equal(deterministicFailure.envelope.errors[0].classification, CliClassification.DeterministicFailure);

const partial = runCase("partial", ["foundation", "--status", "partial", "--json", "--non-interactive"]);
assert.equal(partial.result.status, 8);
assertEnvelope(partial.envelope);
assert.equal(partial.envelope.status, "partial");
assert.equal(partial.envelope.payload.data.partial.overallDisposition, "not_passed_blocking");
assert.equal(partial.envelope.errors[0].classification, CliClassification.PartialIncomplete);

const invocation = partial.envelope.invocation;
const validFailure = createEnvelope({
  invocation,
  status: "failure",
  payload: payload("foundation_result", { ok: false }),
  diagnostics: [{ severity: "error", code: CliErrorCode.FoundationFailure, classification: CliClassification.DeterministicFailure, message: "test", path: null, span: null, hint: null }],
  errors: [{ code: CliErrorCode.FoundationFailure, classification: CliClassification.DeterministicFailure, retryable: false, blocking: true, message: "test", details: {} }]
});
assert.equal(validateCliResultEnvelope(success.envelope).ok, true);
assert.equal(validateCliResultEnvelope(validFailure).ok, true);
assert.equal(validateCliResultEnvelope(malformedConfig.envelope).ok, true);
assert.equal(validateCliResultEnvelope(partial.envelope).ok, true);
assert.equal(validateCliResultEnvelope({ ...partial.envelope, exitCode: 0 }).ok, false);
assert.equal(validateCliResultEnvelope({ ...partial.envelope, payload: payload("foundation_result", {}) }).ok, false);
assert.equal(validateCliResultEnvelope({ ...partial.envelope, diagnostics: [] }).ok, false);
assert.equal(validateCliResultEnvelope({ ...partial.envelope, errors: [] }).ok, false);
assert.equal(validateCliResultEnvelope({ ...deterministicFailure.envelope, diagnostics: [], errors: [] }).ok, false);
assert.equal(validateCliResultEnvelope({ ...unknownCommand.envelope, diagnostics: [], errors: [] }).ok, false);
assert.equal(validateCliResultEnvelope({ ...partial.envelope, diagnostics: [{ ...partial.envelope.diagnostics[0], classification: "unknown_classification" }] }).ok, false);
assert.equal(validateCliResultEnvelope({ ...partial.envelope, errors: [{ ...partial.envelope.errors[0], classification: "unknown_classification" }] }).ok, false);
assert.equal(validateCliResultEnvelope({ ...partial.envelope, errors: [{ ...partial.envelope.errors[0], code: "VE_UNKNOWN" }] }).ok, false);

const evidenceLeaks = scanEvidenceForCanary(evidenceRoot, secretCanary);
assert.deepEqual(evidenceLeaks, []);

writeFileSync(resolve(evidenceRoot, "summary.json"), JSON.stringify({ ok: true, cases: 25, evidenceRoot, canaryAbsentFromEvidence: true }, null, 2), "utf8");
console.log(`I-02A CLI package witnesses passed: ${evidenceRoot}`);
