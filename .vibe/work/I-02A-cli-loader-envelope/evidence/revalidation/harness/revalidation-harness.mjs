import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const cliDir = resolve(repoRoot, "packages/cli");
const entry = resolve(repoRoot, "packages/cli/src/entry/vibe-engineer.js");
const runId = new Date().toISOString().replaceAll("-", "").replaceAll(":", "").replaceAll(".", "");
const runRoot = resolve(scriptDir, `run-${runId}`);
mkdirSync(runRoot, { recursive: true });

const canary = `I02A_REVALIDATION_${randomUUID()}_SECRET_VALUE`;
const stableClassifications = new Set([
  "invalid_invocation",
  "invalid_input",
  "invalid_project",
  "invalid_config",
  "missing_prerequisite",
  "unsupported_operation",
  "deterministic_failure",
  "safety_policy_block",
  "ownership_conflict",
  "write_conflict",
  "external_unavailable",
  "internal_error",
  "partial_incomplete"
]);
const stableCodes = new Set([
  "VE_INVALID_INVOCATION",
  "VE_INVALID_FLAG",
  "VE_MISSING_FLAG_VALUE",
  "VE_UNSUPPORTED_OPERATION",
  "VE_DUPLICATE_COMMAND_ID",
  "VE_MALFORMED_COMMAND_METADATA",
  "VE_INVALID_CONFIG",
  "VE_MISSING_CONFIG",
  "VE_RESULT_FILE_WRITE_FAILED",
  "VE_FOUNDATION_FAILURE",
  "VE_PARTIAL_INCOMPLETE",
  "VE_INVALID_ENVELOPE",
  "VE_INTERNAL_ERROR"
]);

const leakEvents = [];
const cases = [];

function redact(value) {
  return String(value ?? "").replaceAll(canary, "<canary>");
}

function writeRedacted(path, value) {
  writeFileSync(path, redact(value), "utf8");
}

function noteLeak(where, value) {
  if (String(value ?? "").includes(canary)) {
    leakEvents.push(where);
    return true;
  }
  return false;
}

function sanitizeArgForCmd(arg) {
  return redact(arg);
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseStdoutJson(name, stdout, { expectJson = true, expectEmptyStdout = false } = {}) {
  if (expectEmptyStdout) {
    assert.equal(stdout, "", `${name}: stdout must be empty`);
    return null;
  }
  if (!expectJson) return stdout.length > 0 ? JSON.parse(stdout) : null;
  assert.notEqual(stdout, "", `${name}: stdout must not be empty`);
  const trimmed = stdout.trim();
  assert.equal(trimmed.startsWith("{"), true, `${name}: stdout must start with JSON object`);
  assert.equal(trimmed.endsWith("}"), true, `${name}: stdout must end with JSON object`);
  assert.equal(trimmed.split("\n").length, 1, `${name}: stdout must be exactly one JSON line`);
  return JSON.parse(trimmed);
}

function runCli(name, args, options = {}) {
  const safe = safeName(name);
  const dir = resolve(runRoot, safe);
  mkdirSync(dir, { recursive: true });
  const env = options.env ? { ...process.env, ...options.env } : process.env;
  let command;
  let commandArgs;
  let cwd = repoRoot;
  if (options.mode === "direct") {
    command = entry;
    commandArgs = args;
  } else if (options.mode === "pnpm") {
    command = "pnpm";
    commandArgs = ["--filter", "vibe-engineer", "exec", "node", "src/entry/vibe-engineer.js", ...args];
    cwd = repoRoot;
  } else {
    command = process.execPath;
    commandArgs = [entry, ...args];
  }

  const result = spawnSync(command, commandArgs, { cwd, encoding: "utf8", env });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  noteLeak(`${name}:stdout`, stdout);
  noteLeak(`${name}:stderr`, stderr);
  writeRedacted(resolve(dir, "cmd.txt"), `${command} ${commandArgs.map(sanitizeArgForCmd).join(" ")}\n`);
  writeRedacted(resolve(dir, "stdout"), stdout);
  writeRedacted(resolve(dir, "stderr"), stderr);
  writeFileSync(resolve(dir, "exit"), `${result.status}\n`, "utf8");
  if (result.error) writeRedacted(resolve(dir, "spawn-error.txt"), result.error.stack ?? result.error.message);

  let resultFileText = null;
  if (options.resultFile) {
    if (existsSync(options.resultFile)) {
      resultFileText = readFileSync(options.resultFile, "utf8");
      if (noteLeak(`${name}:result-file`, resultFileText)) writeRedacted(options.resultFile, resultFileText);
    }
  }
  const envelope = parseStdoutJson(name, stdout, options);
  cases.push({ name, status: result.status, signal: result.signal ?? null, stdoutBytes: stdout.length, stderrBytes: stderr.length, resultFile: options.resultFile ?? null });
  return { result, stdout, stderr, envelope, dir, resultFileText };
}

function assertExitAndEnvelope(name, run, expectedExit, expectedStatus) {
  assert.equal(run.result.status, expectedExit, `${name}: process exit`);
  assert.ok(run.envelope, `${name}: envelope parsed`);
  assert.equal(run.envelope.exitCode, expectedExit, `${name}: envelope exitCode`);
  assert.equal(run.envelope.status, expectedStatus, `${name}: envelope status`);
  assertStableNonSuccess(name, run.envelope);
  assertNoStackTrace(name, run);
}

function assertNoStackTrace(name, run) {
  assert.equal(/\n\s*at\s+/.test(run.stderr), false, `${name}: stderr stack trace`);
  if (run.stdout) assert.equal(/\n\s*at\s+/.test(run.stdout), false, `${name}: stdout stack trace`);
}

function assertStableNonSuccess(name, envelope) {
  if (!["failure", "blocked", "partial"].includes(envelope.status)) return;
  assert.ok(Array.isArray(envelope.errors) && envelope.errors.length > 0, `${name}: non-success errors`);
  assert.ok(Array.isArray(envelope.diagnostics) && envelope.diagnostics.some((item) => item.severity === "error"), `${name}: error diagnostic`);
  for (const item of [...envelope.errors, ...envelope.diagnostics]) {
    assert.equal(stableCodes.has(item.code), true, `${name}: stable code ${item.code}`);
    assert.equal(stableClassifications.has(item.classification), true, `${name}: stable classification ${item.classification}`);
  }
}

function assertNoCanaryInRun(name, run) {
  assert.equal(run.stdout.includes(canary), false, `${name}: stdout leaked canary`);
  assert.equal(run.stderr.includes(canary), false, `${name}: stderr leaked canary`);
  assert.equal(JSON.stringify(run.envelope ?? {}).includes(canary), false, `${name}: envelope leaked canary`);
  if (run.resultFileText !== null) assert.equal(run.resultFileText.includes(canary), false, `${name}: result file leaked canary`);
}

function writeFixture(relativePath, content) {
  const target = resolve(runRoot, "fixtures", relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
  return target;
}

function resultPath(name) {
  const target = resolve(runRoot, "result-files", name);
  mkdirSync(dirname(target), { recursive: true });
  return target;
}

function assertResultFileEqualsStdout(name, run, path) {
  assert.ok(existsSync(path), `${name}: result file exists`);
  const fileEnvelope = JSON.parse(readFileSync(path, "utf8"));
  assert.deepEqual(fileEnvelope, run.envelope, `${name}: stdout/result-file equality`);
  const leftovers = readdirSync(dirname(path)).filter((item) => item.startsWith(`.${basename(path)}.`) && item.endsWith(".tmp"));
  assert.deepEqual(leftovers, [], `${name}: no temp leftovers`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertValidatorRejects(label, envelope) {
  const result = validateCliResultEnvelope(envelope);
  assert.equal(result.ok, false, `validator must reject ${label}`);
  validatorRejections[label] = result.errors;
}

const envelopeModule = await import(pathToFileURL(resolve(repoRoot, "packages/cli/src/envelope/result-envelope.js")));
const codesModule = await import(pathToFileURL(resolve(repoRoot, "packages/cli/src/errors/codes.js")));
const loaderModule = await import(pathToFileURL(resolve(repoRoot, "packages/cli/src/command-loader/loader.js")));
const { validateCliResultEnvelope, createEnvelope, payload } = envelopeModule;
const { CliClassification, CliErrorCode } = codesModule;
const { createCommandLoader } = loaderModule;

const validConfig = writeFixture("valid-project/vibe-engineer.config.json", JSON.stringify({ agenticHarness: "pi" }, null, 2));
const malformedConfig = writeFixture("malformed-project/vibe-engineer.config.json", "{ not json");
const unsupportedProjectRoot = resolve(runRoot, "fixtures", "unsupported-project");
mkdirSync(unsupportedProjectRoot, { recursive: true });
writeFileSync(resolve(unsupportedProjectRoot, "vibe-engineer.config.yaml"), "agenticHarness: pi\n", "utf8");
const emptyProjectRoot = resolve(runRoot, "fixtures", "missing-project");
mkdirSync(emptyProjectRoot, { recursive: true });
const unsupportedConfigPath = writeFixture("unsupported-file/not-vibe.json", JSON.stringify({ agenticHarness: "pi" }, null, 2));

const directExecutable = runCli("direct-executable-version", ["version", "--json", "--non-interactive"], { mode: "direct" });
assertExitAndEnvelope("direct-executable-version", directExecutable, 0, "success");
assert.equal(directExecutable.stderr, "", "direct executable stderr");

const nodeVersion = runCli("node-version", ["version", "--json", "--non-interactive"]);
assertExitAndEnvelope("node-version", nodeVersion, 0, "success");
assert.equal(nodeVersion.envelope.payload.kind, "version_result");

const pnpmHelp = runCli("pnpm-help", ["help", "--json", "--non-interactive"], { mode: "pnpm" });
assertExitAndEnvelope("pnpm-help", pnpmHelp, 0, "success");
assert.deepEqual(pnpmHelp.envelope.payload.data.commands.map((item) => item.id).sort(), ["foundation", "help", "version"]);

const foundationSuccess = runCli("foundation-success", ["foundation", "--status", "success", "--json", "--non-interactive"]);
assertExitAndEnvelope("foundation-success", foundationSuccess, 0, "success");

const resultFile = resultPath("version-result.json");
const resultFileRun = runCli("result-file-version", ["version", "--json", "--result-file", resultFile, "--non-interactive"], { resultFile });
assertExitAndEnvelope("result-file-version", resultFileRun, 0, "success");
assertResultFileEqualsStdout("result-file-version", resultFileRun, resultFile);

const quietResultFile = resultPath("quiet-version-result.json");
const quietRun = runCli("quiet-result-file", ["version", "--json", "--result-file", quietResultFile, "--quiet", "--non-interactive"], { resultFile: quietResultFile, expectEmptyStdout: true });
assert.equal(quietRun.result.status, 0);
const quietEnvelope = JSON.parse(readFileSync(quietResultFile, "utf8"));
assert.equal(validateCliResultEnvelope(quietEnvelope).ok, true);
assert.equal(quietEnvelope.status, "success");

const failureRun = runCli("foundation-failure", ["foundation", "--status", "failure", "--json", "--non-interactive"]);
assertExitAndEnvelope("foundation-failure", failureRun, 1, "failure");
assert.equal(failureRun.envelope.errors[0].classification, CliClassification.DeterministicFailure);

const partialRun = runCli("foundation-partial", ["foundation", "--status", "partial", "--json", "--non-interactive"]);
assertExitAndEnvelope("foundation-partial", partialRun, 8, "partial");
assert.ok(partialRun.envelope.payload.data.partial);
assert.equal(partialRun.envelope.errors.some((item) => item.classification === CliClassification.PartialIncomplete), true);
const consumerClassifiedNonGreen = partialRun.envelope.status !== "success" && partialRun.envelope.exitCode !== 0;
assert.equal(consumerClassifiedNonGreen, true);

const configSuccess = runCli("config-success-file", ["version", "--json", "--config", validConfig, "--non-interactive"]);
assertExitAndEnvelope("config-success-file", configSuccess, 0, "success");
assert.equal(configSuccess.envelope.invocation.configPath, validConfig);

const configSuccessRoot = runCli("config-success-project-root", ["version", "--json", "--project-root", dirname(validConfig), "--non-interactive"]);
assertExitAndEnvelope("config-success-project-root", configSuccessRoot, 0, "success");

const malformedConfigRun = runCli("malformed-config", ["version", "--json", "--config", malformedConfig, "--non-interactive"]);
assertExitAndEnvelope("malformed-config", malformedConfigRun, 3, "blocked");
assert.equal(malformedConfigRun.envelope.errors[0].classification, CliClassification.InvalidConfig);

const missingConfigRun = runCli("missing-config", ["version", "--json", "--project-root", emptyProjectRoot, "--non-interactive"]);
assertExitAndEnvelope("missing-config", missingConfigRun, 3, "blocked");
assert.equal(missingConfigRun.envelope.errors[0].classification, CliClassification.MissingPrerequisite);

const unsupportedProjectRun = runCli("unsupported-config-project", ["version", "--json", "--project-root", unsupportedProjectRoot, "--non-interactive"]);
assertExitAndEnvelope("unsupported-config-project", unsupportedProjectRun, 3, "blocked");
assert.equal(unsupportedProjectRun.envelope.errors[0].classification, CliClassification.InvalidConfig);

const unsupportedFileRun = runCli("unsupported-config-file", ["version", "--json", "--config", unsupportedConfigPath, "--non-interactive"]);
assertExitAndEnvelope("unsupported-config-file", unsupportedFileRun, 3, "blocked");
assert.equal(unsupportedFileRun.envelope.errors[0].classification, CliClassification.InvalidConfig);

for (const flag of ["--password", "--api-key", "--token"]) {
  const inline = runCli(`secret-inline-${flag.slice(2)}`, [`${flag}=${canary}`, "version", "--json", "--non-interactive"]);
  assertExitAndEnvelope(`secret-inline-${flag}`, inline, 2, "blocked");
  assert.equal(inline.envelope.errors[0].code, CliErrorCode.InvalidFlag);
  assert.equal(inline.envelope.errors[0].classification, CliClassification.InvalidInvocation);
  assertNoCanaryInRun(`secret-inline-${flag}`, inline);
  assert.equal(JSON.stringify(inline.envelope).includes(`${flag}=${canary}`), false);
  assert.equal(JSON.stringify(inline.envelope).includes(`${flag}=<redacted>`), true);

  const separate = runCli(`secret-separate-${flag.slice(2)}`, [flag, canary, "version", "--json", "--non-interactive"]);
  assertExitAndEnvelope(`secret-separate-${flag}`, separate, 2, "blocked");
  assert.equal(separate.envelope.errors[0].code, CliErrorCode.InvalidFlag);
  assert.equal(separate.envelope.errors[0].classification, CliClassification.InvalidInvocation);
  assertNoCanaryInRun(`secret-separate-${flag}`, separate);
}

const inlineNonSecretUnknown = runCli("inline-nonsecret-unknown-flag", [`--unknown=${canary}`, "version", "--json", "--non-interactive"]);
assertExitAndEnvelope("inline-nonsecret-unknown-flag", inlineNonSecretUnknown, 2, "blocked");
assertNoCanaryInRun("inline-nonsecret-unknown-flag", inlineNonSecretUnknown);
assert.equal(JSON.stringify(inlineNonSecretUnknown.envelope).includes("--unknown=<value>"), true);

const commandInlineSecret = runCli("command-inline-secret", ["foundation", `--token=${canary}`, "--json", "--non-interactive"]);
assertExitAndEnvelope("command-inline-secret", commandInlineSecret, 2, "blocked");
assertNoCanaryInRun("command-inline-secret", commandInlineSecret);
assert.equal(JSON.stringify(commandInlineSecret.envelope).includes("--token=<redacted>"), true);

const secretPositional = runCli("secret-unexpected-positional", ["version", canary, "--json", "--non-interactive"]);
assertExitAndEnvelope("secret-unexpected-positional", secretPositional, 2, "blocked");
assertNoCanaryInRun("secret-unexpected-positional", secretPositional);
assert.equal(secretPositional.envelope.errors[0].details.positionalCount, 1);

const secretStatus = runCli("secret-invalid-foundation-status", ["foundation", "--status", canary, "--json", "--non-interactive"]);
assertExitAndEnvelope("secret-invalid-foundation-status", secretStatus, 2, "blocked");
assertNoCanaryInRun("secret-invalid-foundation-status", secretStatus);
assert.equal(secretStatus.envelope.errors[0].details.requestedStatus, "<value>");

const secretConfigDir = resolve(runRoot, "fixtures", "secret-config");
mkdirSync(secretConfigDir, { recursive: true });
const secretConfigPath = resolve(secretConfigDir, "vibe-engineer.config.json");
writeFileSync(secretConfigPath, JSON.stringify({ agenticHarness: "codex", token: canary }, null, 2), "utf8");
const secretConfigRun = runCli("secret-config-invalid", ["version", "--json", "--config", secretConfigPath, "--non-interactive"]);
assertExitAndEnvelope("secret-config-invalid", secretConfigRun, 3, "blocked");
assertNoCanaryInRun("secret-config-invalid", secretConfigRun);
rmSync(secretConfigDir, { recursive: true, force: true });

const envSecretRun = runCli("environment-canary", ["version", "--json", "--non-interactive"], { env: { I02A_REVALIDATION_ENV_CANARY: canary } });
assertExitAndEnvelope("environment-canary", envSecretRun, 0, "success");
assertNoCanaryInRun("environment-canary", envSecretRun);

const secretResultPath = resultPath("secret-result.json");
const secretResultRun = runCli("secret-result-file", ["--result-file", secretResultPath, `--token=${canary}`, "version", "--json", "--non-interactive"], { resultFile: secretResultPath });
assertExitAndEnvelope("secret-result-file", secretResultRun, 2, "blocked");
assertNoCanaryInRun("secret-result-file", secretResultRun);
assertResultFileEqualsStdout("secret-result-file", secretResultRun, secretResultPath);

const unknownCommand = runCli("unknown-command", ["unknown-command", "--json", "--non-interactive"]);
assertExitAndEnvelope("unknown-command", unknownCommand, 2, "blocked");
assert.equal(unknownCommand.envelope.errors[0].classification, CliClassification.InvalidInvocation);

for (const cmd of ["create", "import", "doctor", "config", "schematic", "verify", "security", "build", "ship"]) {
  const later = runCli(`later-${cmd}`, [cmd, "--json", "--non-interactive"]);
  assertExitAndEnvelope(`later-${cmd}`, later, 2, "blocked");
  assert.equal(later.envelope.errors[0].classification, CliClassification.UnsupportedOperation);
}

const unknownFlag = runCli("unknown-command-flag", ["version", "--bad-flag", "--json", "--non-interactive"]);
assertExitAndEnvelope("unknown-command-flag", unknownFlag, 2, "blocked");
assert.equal(unknownFlag.envelope.errors[0].code, CliErrorCode.InvalidFlag);

const missingGlobalValue = runCli("missing-result-file-value", ["version", "--json", "--result-file"]);
assertExitAndEnvelope("missing-result-file-value", missingGlobalValue, 2, "blocked");
assert.equal(missingGlobalValue.envelope.errors[0].code, CliErrorCode.MissingFlagValue);

const missingCommandValue = runCli("missing-status-value", ["foundation", "--status", "--json", "--non-interactive"]);
assertExitAndEnvelope("missing-status-value", missingCommandValue, 2, "blocked");
assert.equal(missingCommandValue.envelope.errors[0].code, CliErrorCode.MissingFlagValue);

const invalidResultPath = resolve(runRoot, "missing-parent", "out.json");
const invalidResult = runCli("invalid-result-file-path", ["version", "--json", "--result-file", invalidResultPath, "--non-interactive"], { resultFile: invalidResultPath });
assertExitAndEnvelope("invalid-result-file-path", invalidResult, 5, "blocked");
assert.equal(invalidResult.envelope.errors[0].classification, CliClassification.WriteConflict);
assert.equal(existsSync(invalidResultPath), false);
assert.equal(invalidResult.stderr, "");

const loader = createCommandLoader();
assert.deepEqual(loader.listCommands().map((item) => item.id).sort(), ["foundation", "help", "version"]);
assert.throws(() => createCommandLoader([
  { id: "dup", visibility: "internal", description: "first", run() {} },
  { id: "dup", visibility: "internal", description: "second", run() {} }
]), { code: CliErrorCode.DuplicateCommandId, classification: CliClassification.InvalidInvocation });
assert.throws(() => createCommandLoader([{ id: "bad", visibility: "internal", description: "missing run" }]), { code: CliErrorCode.MalformedCommandMetadata, classification: CliClassification.InvalidInvocation });

const validatorRejections = {};
const validBlocked = unknownCommand.envelope;
assert.equal(validateCliResultEnvelope(nodeVersion.envelope).ok, true);
assert.equal(validateCliResultEnvelope(failureRun.envelope).ok, true);
assert.equal(validateCliResultEnvelope(validBlocked).ok, true);
assert.equal(validateCliResultEnvelope(partialRun.envelope).ok, true);

const validFailure = failureRun.envelope;
const malformedBase = clone(validFailure);
assertValidatorRejects("bad diagnostic classification", { ...clone(validFailure), diagnostics: [{ ...validFailure.diagnostics[0], classification: "not_stable" }] });
assertValidatorRejects("bad error classification", { ...clone(validFailure), errors: [{ ...validFailure.errors[0], classification: "not_stable" }] });
assertValidatorRejects("unknown diagnostic code", { ...clone(validFailure), diagnostics: [{ ...validFailure.diagnostics[0], code: "VE_NOT_A_CODE" }] });
assertValidatorRejects("unknown error code", { ...clone(validFailure), errors: [{ ...validFailure.errors[0], code: "VE_NOT_A_CODE" }] });
assertValidatorRejects("failure empty diagnostics errors", { ...clone(validFailure), diagnostics: [], errors: [] });
assertValidatorRejects("blocked empty diagnostics errors", { ...clone(validBlocked), diagnostics: [], errors: [] });
assertValidatorRejects("partial empty diagnostics errors", { ...clone(partialRun.envelope), diagnostics: [], errors: [] });
assertValidatorRejects("blocked no error diagnostic", { ...clone(validBlocked), diagnostics: [{ ...validBlocked.diagnostics[0], severity: "warning" }] });
assertValidatorRejects("partial exit zero", { ...clone(partialRun.envelope), exitCode: 0 });
assertValidatorRejects("partial missing data partial", { ...clone(partialRun.envelope), payload: payload("foundation_result", {}) });
assertValidatorRejects("partial missing incomplete diagnostic", { ...clone(partialRun.envelope), diagnostics: [{ ...partialRun.envelope.diagnostics[0], classification: CliClassification.InvalidInvocation }] });
assertValidatorRejects("partial missing incomplete error", { ...clone(partialRun.envelope), errors: [{ ...partialRun.envelope.errors[0], classification: CliClassification.InvalidInvocation }] });
assertValidatorRejects("bad schema version", { ...clone(validFailure), schemaVersion: "bad" });
assertValidatorRejects("bad status", { ...clone(validFailure), status: "done" });
assertValidatorRejects("success nonzero exit", { ...clone(nodeVersion.envelope), exitCode: 1 });
assertValidatorRejects("failure zero exit", { ...clone(validFailure), exitCode: 0 });
assertValidatorRejects("bad invocation shape", { ...clone(validFailure), invocation: { ...validFailure.invocation, argv: [1] } });
assertValidatorRejects("bad payload data", { ...clone(validFailure), payload: { ...validFailure.payload, data: null } });
assertValidatorRejects("bad artifact shape", { ...clone(resultFileRun.envelope), artifacts: [{ kind: "cli_result", path: resultFile }] });
assertValidatorRejects("bad error details shape", { ...clone(validFailure), errors: [{ ...validFailure.errors[0], details: null }] });
assertValidatorRejects("bad diagnostic severity", { ...clone(validFailure), diagnostics: [{ ...validFailure.diagnostics[0], severity: "fatal" }] });

const publicEnvelopeExport = spawnSync(process.execPath, ["--input-type=module", "-e", "import('vibe-engineer/envelope').then((m)=>{ if (typeof m.validateCliResultEnvelope !== 'function') throw new Error('missing validateCliResultEnvelope'); console.log('public envelope ok') })"], { cwd: cliDir, encoding: "utf8" });
writeRedacted(resolve(runRoot, "public-envelope-export.stdout"), publicEnvelopeExport.stdout);
writeRedacted(resolve(runRoot, "public-envelope-export.stderr"), publicEnvelopeExport.stderr);
writeFileSync(resolve(runRoot, "public-envelope-export.exit"), `${publicEnvelopeExport.status}\n`, "utf8");
assert.equal(publicEnvelopeExport.status, 0);

const artifactReachability = spawnSync(process.execPath, ["--input-type=module", "-e", "import('@vibe-engineer/artifacts').then((m)=>{ if (typeof m.validateArtifactFile !== 'function') throw new Error('missing validateArtifactFile'); console.log('artifact provider ok') })"], { cwd: cliDir, encoding: "utf8" });
writeRedacted(resolve(runRoot, "artifact-provider.stdout"), artifactReachability.stdout);
writeRedacted(resolve(runRoot, "artifact-provider.stderr"), artifactReachability.stderr);
writeFileSync(resolve(runRoot, "artifact-provider.exit"), `${artifactReachability.status}\n`, "utf8");
assert.equal(artifactReachability.status, 0);

function scanForCanary(root) {
  const leaks = [];
  for (const name of readdirSync(root)) {
    const target = resolve(root, name);
    const stat = statSync(target);
    if (stat.isDirectory()) leaks.push(...scanForCanary(target));
    if (stat.isFile()) {
      const content = readFileSync(target, "utf8");
      if (content.includes(canary)) leaks.push(target);
    }
  }
  return leaks;
}

const evidenceLeaks = scanForCanary(runRoot);
if (evidenceLeaks.length > 0) leakEvents.push(...evidenceLeaks.map((file) => `evidence:${file}`));
assert.deepEqual(leakEvents, [], "raw canary must be absent from carriers and final validator evidence");

const summary = {
  ok: true,
  runRoot,
  caseCount: cases.length,
  cases,
  directExecutable: true,
  nodeEntry: true,
  pnpmFilterNodeEntry: true,
  stdoutJsonOnly: true,
  resultFileEquality: true,
  quietResultFileNoStdout: true,
  tempRenameNoLeftoverTemp: true,
  configProviderSeam: "valid/malformed/missing/unsupported/secret-invalid via public provider through CLI",
  artifactProviderSeam: "reachable from CLI package context; N/A for DL-02 artifact inputs because I-02A exposes only help/version/foundation",
  commandLoaderFoundationOnly: true,
  partialConsumerNonGreen: consumerClassifiedNonGreen,
  validatorRejectionCount: Object.keys(validatorRejections).length,
  validatorRejections,
  rawCanaryAbsentFromCarriersAndEvidence: true,
  rawCanaryRecordedInReport: false
};
writeFileSync(resolve(runRoot, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
console.log(JSON.stringify({ ok: true, runRoot, caseCount: cases.length, validatorRejectionCount: Object.keys(validatorRejections).length, rawCanaryAbsentFromCarriersAndEvidence: true }, null, 2));
