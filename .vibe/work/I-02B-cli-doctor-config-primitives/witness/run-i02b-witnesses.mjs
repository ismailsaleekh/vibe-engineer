#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import assert from "node:assert/strict";

const repoRoot = resolve(new URL("../../../..", import.meta.url).pathname);
const unitRoot = resolve(repoRoot, ".vibe/work/I-02B-cli-doctor-config-primitives");
const evidenceRoot = resolve(unitRoot, "evidence/witness-run");
const dispatchPath = resolve(unitRoot, "witness/dispatch.mjs");
const consumerPath = resolve(unitRoot, "witness/consumer.mjs");
const reportPath = resolve(unitRoot, "I-02B-implementation-report.md");
const configFixtures = resolve(repoRoot, "packages/config/fixtures/projects");
const canary = ["I02B", "CANARY", "SECRET", Date.now().toString(36)].join("_");

function redactedArgs(args) {
  return args.map((arg) => (typeof arg === "string" && arg.includes(canary) ? arg.replaceAll(canary, "<redacted-canary>") : arg));
}

async function writeText(path, text) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
}

function runNode(args, env = {}) {
  return spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, ...env }
  });
}

async function invokeCase(name, args, expectation, env = {}) {
  const caseDir = join(evidenceRoot, "cases", name);
  await mkdir(caseDir, { recursive: true });
  const stdoutPath = join(caseDir, "stdout.json");
  const stderrPath = join(caseDir, "stderr.txt");
  const consumerOut = join(caseDir, "consumer.json");
  const result = runNode([dispatchPath, "--json", "--non-interactive", ...args], env);
  await writeText(stdoutPath, result.stdout);
  await writeText(stderrPath, result.stderr);
  await writeText(join(caseDir, "spawn.json"), `${JSON.stringify({ status: result.status, signal: result.signal, args: redactedArgs(args) }, null, 2)}\n`);
  assert.equal(result.status, expectation.exit, `${name} exit`);
  const consumerArgs = [consumerPath, "--stdout", stdoutPath, "--status", expectation.status, "--exit", String(expectation.exit), "--kind", expectation.kind, "--out", consumerOut];
  if (expectation.classification) consumerArgs.push("--classification", expectation.classification);
  if (expectation.code) consumerArgs.push("--code", expectation.code);
  if (expectation.requireConfig) consumerArgs.push("--requireConfig", "true");
  if (expectation.requirePartial) consumerArgs.push("--requirePartial", "true");
  if (expectation.resultFile) consumerArgs.push("--resultFile", expectation.resultFile);
  const consumed = runNode(consumerArgs, env);
  await writeText(join(caseDir, "consumer.stdout.txt"), consumed.stdout);
  await writeText(join(caseDir, "consumer.stderr.txt"), consumed.stderr);
  assert.equal(consumed.status, 0, `${name} consumer: ${consumed.stderr}`);
  return { name, exit: result.status, status: expectation.status, kind: expectation.kind, stdoutPath, stderrPath, consumerOut, resultFile: expectation.resultFile ?? null };
}

function walkFiles(root) {
  if (!existsSync(root)) return [];
  const output = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) output.push(...walkFiles(path));
    if (stat.isFile()) output.push(path);
  }
  return output;
}

function assertCanaryAbsent(paths) {
  const hits = [];
  for (const root of paths) {
    for (const file of walkFiles(root)) {
      const text = readFileSync(file, "utf8");
      if (text.includes(canary)) hits.push(file);
    }
  }
  if (existsSync(reportPath) && readFileSync(reportPath, "utf8").includes(canary)) hits.push(reportPath);
  assert.deepEqual(hits, [], "canary must be absent from evidence/report carriers");
}

await rm(evidenceRoot, { recursive: true, force: true });
await mkdir(evidenceRoot, { recursive: true });
const missingConfigDir = join(evidenceRoot, "fixtures/missing-config");
await mkdir(missingConfigDir, { recursive: true });
const resultFilePath = join(evidenceRoot, "result-file", "config-inspect-result.json");
await mkdir(dirname(resultFilePath), { recursive: true });
const secretProject = join(evidenceRoot, "tmp-secret-project");
await mkdir(secretProject, { recursive: true });
await writeText(join(secretProject, "vibe-engineer.config.json"), `${JSON.stringify({ agenticHarness: "pi", token: canary }, null, 2)}\n`);

const cases = [];
cases.push(await invokeCase("doctor-healthy", ["doctor", "--project-root", join(configFixtures, "valid-minimal")], { exit: 0, status: "success", kind: "doctor_result" }));
cases.push(await invokeCase("config-inspect-valid-full", ["config", "inspect", "--project-root", join(configFixtures, "valid-full")], { exit: 0, status: "success", kind: "config_inspect_result", requireConfig: true }));
cases.push(await invokeCase("config-validate-valid-minimal", ["config", "validate", "--project-root", join(configFixtures, "valid-minimal")], { exit: 0, status: "success", kind: "config_validation_result" }));
cases.push(await invokeCase("result-file-equivalence", ["--result-file", resultFilePath, "config", "inspect", "--project-root", join(configFixtures, "valid-minimal")], { exit: 0, status: "success", kind: "config_inspect_result", requireConfig: true, resultFile: resultFilePath }));
cases.push(await invokeCase("malformed-json", ["config", "validate", "--project-root", join(configFixtures, "malformed-json")], { exit: 3, status: "blocked", kind: "config_load_result", classification: "invalid_config" }));
cases.push(await invokeCase("missing-config", ["config", "validate", "--project-root", missingConfigDir], { exit: 3, status: "blocked", kind: "config_load_result", classification: "missing_prerequisite" }));
for (const fixture of ["invalid-unsupported-harness-arbitrary", "invalid-unsupported-harness-claude-code", "invalid-unsupported-harness-codex", "invalid-unsupported-harness-opencode"]) {
  cases.push(await invokeCase(`unsupported-${fixture}`, ["config", "validate", "--project-root", join(configFixtures, fixture)], { exit: 3, status: "blocked", kind: "config_load_result", classification: "invalid_config" }));
}
cases.push(await invokeCase("secret-like-config", ["config", "validate", "--project-root", secretProject], { exit: 3, status: "blocked", kind: "config_load_result", classification: "invalid_config" }, { I02B_CANARY: canary }));
cases.push(await invokeCase("secret-like-flag", ["config", "validate", `--token=${canary}`, "--project-root", join(configFixtures, "valid-minimal")], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: "invalid_invocation" }, { I02B_CANARY: canary }));
cases.push(await invokeCase("doctor-invalid-config", ["doctor", "--project-root", join(configFixtures, "malformed-json")], { exit: 3, status: "blocked", kind: "config_load_result", classification: "invalid_config" }));
cases.push(await invokeCase("config-unknown-subcommand", ["config", "unknown"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: "invalid_invocation" }));
cases.push(await invokeCase("config-unknown-flag", ["config", "validate", "--unknown-flag"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: "invalid_invocation" }));
cases.push(await invokeCase("config-unexpected-positional", ["config", "validate", "extra"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: "invalid_invocation" }));
cases.push(await invokeCase("config-missing-flag-value", ["config", "validate", "--config"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: "invalid_invocation" }));
cases.push(await invokeCase("doctor-unknown-flag", ["doctor", "--unknown-flag"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: "invalid_invocation" }));
cases.push(await invokeCase("doctor-unexpected-positional", ["doctor", "extra"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: "invalid_invocation" }));
cases.push(await invokeCase("doctor-missing-flag-value", ["doctor", "--project-root"], { exit: 2, status: "blocked", kind: "cli_invocation_error", classification: "invalid_invocation" }));
const badResultPath = join(evidenceRoot, "missing-parent", "result.json");
cases.push(await invokeCase("result-file-missing-parent", ["--result-file", badResultPath, "config", "validate", "--project-root", join(configFixtures, "valid-minimal")], { exit: 5, status: "blocked", kind: "result_file_error", classification: "write_conflict" }));
cases.push(await invokeCase("doctor-partial-non-green", ["doctor", "--project-root", join(configFixtures, "valid-minimal"), "--include-adapter-scope"], { exit: 8, status: "partial", kind: "doctor_result", classification: "partial_incomplete", requirePartial: true }));

const malformedOut = join(evidenceRoot, "malformed-envelope-suite.json");
const malformed = runNode([consumerPath, "--malformedSuite", "true", "--out", malformedOut]);
await writeText(join(evidenceRoot, "malformed-envelope-suite.stdout.txt"), malformed.stdout);
await writeText(join(evidenceRoot, "malformed-envelope-suite.stderr.txt"), malformed.stderr);
assert.equal(malformed.status, 0, malformed.stderr);

await rm(secretProject, { recursive: true, force: true });
assertCanaryAbsent([evidenceRoot]);
await writeText(join(evidenceRoot, "redaction-sweep.json"), `${JSON.stringify({ canaryAbsent: true, checkedRoots: [evidenceRoot], reportChecked: existsSync(reportPath) }, null, 2)}\n`);
await writeText(join(evidenceRoot, "summary.json"), `${JSON.stringify({ ok: true, cases, malformedEnvelopeSuite: malformedOut, redactionSweep: join(evidenceRoot, "redaction-sweep.json") }, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, caseCount: cases.length, evidenceRoot }));
