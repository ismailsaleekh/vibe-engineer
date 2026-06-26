#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CliClassification, CliErrorCode, cliError, diagnostic } from "../../../../packages/cli/src/errors/codes.js";
import { createEnvelope, payload, validateCliResultEnvelope } from "../../../../packages/cli/src/envelope/result-envelope.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const evidenceRoot = resolve(here, "run");
const dispatchPath = resolve(here, "validation-dispatch.mjs");
const reportPath = resolve(here, "../I-02B-validation-report.md");
const configFixtures = resolve(repoRoot, "packages/config/fixtures/projects");
const canary = `I02B_VALIDATION_CANARY_${randomUUID()}`;

function runNode(args, env = {}) {
  return spawnSync(process.execPath, args, { cwd: repoRoot, encoding: "utf8", env: { ...process.env, ...env } });
}

async function writeText(path, text) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

function redactArg(arg) {
  return typeof arg === "string" ? arg.replaceAll(canary, "<redacted-canary>") : arg;
}

function oneJsonEnvelope(text, path) {
  const trimmed = text.trim();
  assert.notEqual(trimmed, "", `${path} stdout must not be empty`);
  assert.equal(trimmed.split(/\n/).length, 1, `${path} stdout must be exactly one machine JSON line`);
  return JSON.parse(trimmed);
}

function primaryClassification(envelope) {
  return envelope.errors[0]?.classification ?? envelope.diagnostics.find((item) => item.severity === "error")?.classification ?? null;
}

function assertEnvelope(envelope, expectation, caseName) {
  const validation = validateCliResultEnvelope(envelope);
  assert.equal(validation.ok, true, `${caseName} envelope validates: ${(validation.errors ?? []).join("; ")}`);
  assert.equal(envelope.status, expectation.status, `${caseName} status`);
  assert.equal(envelope.exitCode, expectation.exit, `${caseName} envelope exitCode`);
  assert.equal(envelope.payload.kind, expectation.kind, `${caseName} payload kind`);
  if (expectation.classification) assert.equal(primaryClassification(envelope), expectation.classification, `${caseName} classification`);
  if (expectation.requireConfig) {
    assert.equal(envelope.payload.data.config.agenticHarness, "pi", `${caseName} resolved config`);
    assert.ok(envelope.payload.data.provenance["/agenticHarness"], `${caseName} provenance`);
  }
  if (expectation.requirePartial) {
    assert.equal(envelope.status === "success", false, `${caseName} partial is not green`);
    const partial = envelope.payload.data.partial;
    assert.equal(partial.overallDisposition, "not_passed_blocking");
    assert.ok(partial.completedScopes.length > 0);
    assert.ok(partial.incompleteScopes.length > 0);
    assert.equal(partial.incompleteScopes[0].blocking, true);
    assert.ok(envelope.errors.some((item) => item.classification === CliClassification.PartialIncomplete && item.blocking === true));
  }
  assert.equal(JSON.stringify(envelope).includes(canary), false, `${caseName} canary absent from envelope`);
}

async function invokeCase(name, args, expectation, env = {}) {
  const dir = join(evidenceRoot, "cases", name);
  await mkdir(dir, { recursive: true });
  const result = runNode([dispatchPath, "--json", "--non-interactive", ...args], env);
  await writeText(join(dir, "stdout.json"), result.stdout);
  await writeText(join(dir, "stderr.txt"), result.stderr);
  await writeText(join(dir, "spawn.json"), `${JSON.stringify({ status: result.status, signal: result.signal, args: args.map(redactArg) }, null, 2)}\n`);
  assert.equal(result.status, expectation.exit, `${name} process exit`);
  assert.equal(result.stderr, "", `${name} stderr must be empty`);
  const envelope = oneJsonEnvelope(result.stdout, name);
  assertEnvelope(envelope, expectation, name);
  if (expectation.resultFile) {
    const fromFile = oneJsonEnvelope(readFileSync(expectation.resultFile, "utf8"), `${name} result-file`);
    assert.deepEqual(fromFile, envelope, `${name} result-file structural equivalence`);
  }
  await writeText(join(dir, "consumer.json"), `${JSON.stringify({ ok: true, status: envelope.status, exitCode: envelope.exitCode, kind: envelope.payload.kind, classification: primaryClassification(envelope) }, null, 2)}\n`);
  return { name, exit: result.status, status: envelope.status, kind: envelope.payload.kind, classification: primaryClassification(envelope), stdoutPath: join(dir, "stdout.json"), resultFile: expectation.resultFile ?? null };
}

function validatorRejectionSuite() {
  const invocation = { id: "validation-malformed", command: "doctor", argv: [], projectRoot: null, configPath: null, startedAt: "2026-01-01T00:00:00.000Z", endedAt: "2026-01-01T00:00:00.000Z" };
  const validPartial = createEnvelope({
    invocation,
    status: "partial",
    payload: payload("doctor_result", {
      partial: {
        overallDisposition: "not_passed_blocking",
        completedScopes: [{ id: "done", kind: "validation_scope", required: true, artifacts: ["memory://done"] }],
        incompleteScopes: [{ id: "todo", kind: "validation_scope", required: true, blocking: true, reasonCode: CliErrorCode.PartialIncomplete, classification: CliClassification.PartialIncomplete, nextAction: "resume" }],
        resume: { allowed: true, command: ["vibe-engineer", "doctor"] }
      }
    }),
    diagnostics: [diagnostic({ code: CliErrorCode.PartialIncomplete, classification: CliClassification.PartialIncomplete, severity: "error", message: "partial" })],
    errors: [cliError({ code: CliErrorCode.PartialIncomplete, classification: CliClassification.PartialIncomplete, blocking: true, retryable: true, message: "partial", details: { incompleteScopeIds: ["todo"] } })]
  });
  const results = {
    validPartial: validateCliResultEnvelope(validPartial).ok,
    wrongExitForPartial: validateCliResultEnvelope({ ...validPartial, exitCode: 0 }).ok,
    missingPartialFields: validateCliResultEnvelope({ ...validPartial, payload: payload("doctor_result", {}) }).ok,
    unstableCode: validateCliResultEnvelope({ ...validPartial, errors: [{ ...validPartial.errors[0], code: "VE_UNSTABLE" }] }).ok,
    unstableClassification: validateCliResultEnvelope({ ...validPartial, diagnostics: [{ ...validPartial.diagnostics[0], classification: "unstable" }] }).ok
  };
  assert.equal(results.validPartial, true);
  assert.equal(results.wrongExitForPartial, false);
  assert.equal(results.missingPartialFields, false);
  assert.equal(results.unstableCode, false);
  assert.equal(results.unstableClassification, false);
  return results;
}

function walkFiles(root) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walkFiles(path));
    if (stat.isFile()) out.push(path);
  }
  return out;
}

function assertCanaryAbsent() {
  const hits = [];
  for (const file of [...walkFiles(evidenceRoot), reportPath]) {
    if (existsSync(file) && readFileSync(file, "utf8").includes(canary)) hits.push(file);
  }
  assert.deepEqual(hits, [], "validation canary must be absent from evidence/report carriers");
}

await rm(evidenceRoot, { recursive: true, force: true });
await mkdir(evidenceRoot, { recursive: true });
const missingConfigDir = join(evidenceRoot, "fixtures", "missing-config");
await mkdir(missingConfigDir, { recursive: true });
const resultFile = join(evidenceRoot, "result-files", "config-inspect.json");
await mkdir(dirname(resultFile), { recursive: true });
const secretProject = join(evidenceRoot, "tmp-secret-project");
await mkdir(secretProject, { recursive: true });
await writeText(join(secretProject, "vibe-engineer.config.json"), `${JSON.stringify({ agenticHarness: "pi", token: canary }, null, 2)}\n`);

const cases = [];
cases.push(await invokeCase("doctor-healthy", ["doctor", "--project-root", join(configFixtures, "valid-minimal")], { exit: 0, status: "success", kind: "doctor_result" }));
cases.push(await invokeCase("config-inspect-valid-full", ["config", "inspect", "--project-root", join(configFixtures, "valid-full")], { exit: 0, status: "success", kind: "config_inspect_result", requireConfig: true }));
cases.push(await invokeCase("config-validate-valid-minimal", ["config", "validate", "--project-root", join(configFixtures, "valid-minimal")], { exit: 0, status: "success", kind: "config_validation_result" }));
cases.push(await invokeCase("result-file-equivalence", ["--result-file", resultFile, "config", "inspect", "--project-root", join(configFixtures, "valid-minimal")], { exit: 0, status: "success", kind: "config_inspect_result", requireConfig: true, resultFile }));
cases.push(await invokeCase("malformed-json", ["config", "validate", "--project-root", join(configFixtures, "malformed-json")], { exit: 3, status: "blocked", kind: "config_load_result", classification: CliClassification.InvalidConfig }));
cases.push(await invokeCase("missing-config", ["config", "validate", "--project-root", missingConfigDir], { exit: 3, status: "blocked", kind: "config_load_result", classification: CliClassification.MissingPrerequisite }));
for (const fixture of ["invalid-unsupported-harness-arbitrary", "invalid-unsupported-harness-claude-code", "invalid-unsupported-harness-codex", "invalid-unsupported-harness-opencode"]) {
  cases.push(await invokeCase(`unsupported-${fixture}`, ["config", "validate", "--project-root", join(configFixtures, fixture)], { exit: 3, status: "blocked", kind: "config_load_result", classification: CliClassification.InvalidConfig }));
}
cases.push(await invokeCase("secret-like-config", ["config", "validate", "--project-root", secretProject], { exit: 3, status: "blocked", kind: "config_load_result", classification: CliClassification.InvalidConfig }, { I02B_VALIDATION_CANARY: canary }));
cases.push(await invokeCase("secret-like-flag", ["config", "validate", `--token=${canary}`, "--project-root", join(configFixtures, "valid-minimal")], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: CliClassification.InvalidInvocation }, { I02B_VALIDATION_CANARY: canary }));
cases.push(await invokeCase("doctor-invalid-config", ["doctor", "--project-root", join(configFixtures, "malformed-json")], { exit: 3, status: "blocked", kind: "config_load_result", classification: CliClassification.InvalidConfig }));
cases.push(await invokeCase("config-unknown-subcommand", ["config", "unknown"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: CliClassification.InvalidInvocation }));
cases.push(await invokeCase("config-unknown-flag", ["config", "validate", "--unknown-flag"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: CliClassification.InvalidInvocation }));
cases.push(await invokeCase("config-unexpected-positional", ["config", "validate", "extra"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: CliClassification.InvalidInvocation }));
cases.push(await invokeCase("config-missing-flag-value", ["config", "validate", "--config"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: CliClassification.InvalidInvocation }));
cases.push(await invokeCase("doctor-unknown-flag", ["doctor", "--unknown-flag"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: CliClassification.InvalidInvocation }));
cases.push(await invokeCase("doctor-unexpected-positional", ["doctor", "extra"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: CliClassification.InvalidInvocation }));
cases.push(await invokeCase("doctor-missing-flag-value", ["doctor", "--project-root"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: CliClassification.InvalidInvocation }));
const badResultFile = join(evidenceRoot, "missing-parent", "result.json");
cases.push(await invokeCase("result-file-missing-parent", ["--result-file", badResultFile, "config", "validate", "--project-root", join(configFixtures, "valid-minimal")], { exit: 5, status: "blocked", kind: "result_file_error", classification: CliClassification.WriteConflict }));
cases.push(await invokeCase("doctor-partial-non-green", ["doctor", "--project-root", join(configFixtures, "valid-minimal"), "--include-adapter-scope"], { exit: 8, status: "partial", kind: "doctor_result", classification: CliClassification.PartialIncomplete, requirePartial: true }));

const rejectionSuite = validatorRejectionSuite();
await writeText(join(evidenceRoot, "malformed-envelope-rejection.json"), `${JSON.stringify(rejectionSuite, null, 2)}\n`);
await rm(secretProject, { recursive: true, force: true });
assertCanaryAbsent();
await writeText(join(evidenceRoot, "redaction-sweep.json"), `${JSON.stringify({ canaryAbsent: true, checkedRoot: evidenceRoot, reportChecked: true }, null, 2)}\n`);
const summary = { ok: true, caseCount: cases.length, cases, malformedEnvelopeRejection: join(evidenceRoot, "malformed-envelope-rejection.json"), redactionSweep: join(evidenceRoot, "redaction-sweep.json") };
await writeText(join(evidenceRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, caseCount: cases.length, evidenceRoot }));
