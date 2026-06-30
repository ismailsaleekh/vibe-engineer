#!/usr/bin/env node
// WP-04 — doctor command matrix witness (real CommandLoader dispatch + real dist-binary spawn).
// Mirrors commands/create/run-cli-witnesses.mjs. Covers: success / invalid-input / blocked /
// exit-code via exitCodeFor / result-file atomic (good+bad) / schema valid + ≥1 negative mutation.
// doctor reads config from the dispatch context (entry loads --config globally first), so its
// happy path IS reachable via the real dist binary.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCommandLoader } from "../../command-loader/loader.js";
import { exitCodeFor, validateCliResultEnvelope } from "../../envelope/result-envelope.js";
import { doctorCommand } from "./index.js";
import { loadVibeConfigFile } from "@vibe-engineer/config";
import {
  assertAtLeastOneMutationFails,
  assertEnvelopeValid,
  assertExitCodeMatchesEnvelope,
  assertJsonStdout,
  assertResultFileGood,
  distBinary,
  makeEvidenceWriter,
  repoRoot,
  runDistBinary,
} from "../../testing/matrix-harness.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const evidenceRoot = resolve(repoRoot, ".vibe/work/WP-04-command-matrix/evidence/doctor");
const ev = makeEvidenceWriter(evidenceRoot);
const scratch = mkdtempSync(join(tmpdir(), "wp04-doctor-"));
const validDir = resolve(scratch, "valid");
mkdirSync(validDir, { recursive: true });
const badDir = resolve(scratch, "bad");
mkdirSync(badDir, { recursive: true });
const validConfig = join(validDir, "vibe-engineer.config.json");
const badConfig = join(badDir, "vibe-engineer.config.json");
writeFileSync(validConfig, JSON.stringify({ agenticHarness: "pi" }, null, 2));
writeFileSync(badConfig, "{ not json");

function invocation(args) {
  return {
    id: "wp04-doctor-witness",
    command: "doctor",
    argv: args,
    projectRoot: null,
    configPath: null,
    startedAt: "2026-06-27T00:00:00.000Z",
    endedAt: "2026-06-27T00:00:00.000Z",
  };
}
function dispatchCtx(config = null) {
  return {
    invocation: invocation([]),
    packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
    config,
  };
}
function assertExit(env) {
  assertExitCodeMatchesEnvelope(env, env.exitCode);
}

const summary = { schemaVersion: "wp04-doctor-witness/v1", ok: true, cases: [] };

// Real-boundary resolvability — the doctor command imports @vibe-engineer/config (real consumer).
{
  const loader = createCommandLoader([doctorCommand]);
  assert.equal(loader.hasCommand("doctor"), true);
  summary.commandRegistered = true;
}

// Success (source dispatch with the REAL config provider result as context.config — mirrors the
// entry, which pre-loads --config and passes the loaded result to dispatch.context).
{
  const loaded = await loadVibeConfigFile(validConfig);
  assert.equal(loaded.ok, true);
  const result = await createCommandLoader([doctorCommand]).dispatch("doctor", [], {
    invocation: invocation([]),
    packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
    config: loaded,
  });
  const env = result.envelope;
  assertEnvelopeValid(env);
  assertExit(env);
  assert.equal(env.status, "success");
  assert.equal(env.payload.kind, "doctor_result");
  ev.writeJson("source-dispatch-success.json", env);
  const muts = assertAtLeastOneMutationFails(env);
  ev.writeJson("source-dispatch-success-schema-negative.json", muts);
  summary.cases.push({
    case: "source-dispatch-success",
    status: env.status,
    exitCode: env.exitCode,
    mutationsFailing: muts.filter((m) => m.ok === false).length,
  });
}

// dist-binary success path.
{
  const args = ["doctor", "--config", validConfig, "--json", "--non-interactive"];
  const run = runDistBinary(args);
  ev.recordRun("dist-success", distBinary, args, run);
  assertJsonStdout(run.stdout);
  assertEnvelopeValid(run.envelope);
  assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.status, "success");
  assert.equal(run.code, 0);
  assert.equal(run.envelope.payload.kind, "doctor_result");
  const muts = assertAtLeastOneMutationFails(run.envelope);
  ev.writeJson("dist-success-schema-negative.json", muts);
  summary.cases.push({
    case: "dist-success",
    status: run.envelope.status,
    exitCode: run.code,
    mutationsFailing: muts.filter((m) => m.ok === false).length,
  });
}

// dist-binary invalid flag → invalid_invocation exit 2.
{
  const args = ["doctor", "--bogus", "--json", "--non-interactive"];
  const run = runDistBinary(args);
  ev.recordRun("dist-invalid-flag", distBinary, args, run);
  assertEnvelopeValid(run.envelope);
  assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.errors[0].classification, "invalid_invocation");
  assert.equal(run.code, 2);
  summary.cases.push({
    case: "dist-invalid-flag",
    status: run.envelope.status,
    exitCode: run.code,
  });
}

// dist-binary blocked: invalid config → invalid_config exit 3.
{
  const args = ["doctor", "--config", badConfig, "--json", "--non-interactive"];
  const run = runDistBinary(args);
  ev.recordRun("dist-blocked-invalid-config", distBinary, args, run);
  assertEnvelopeValid(run.envelope);
  assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.errors[0].classification, "invalid_config");
  assert.equal(run.code, 3);
  summary.cases.push({
    case: "dist-blocked-invalid-config",
    status: run.envelope.status,
    exitCode: run.code,
  });
}

// dist-binary partial: --include-adapter-scope → partial exit 8.
{
  const args = [
    "doctor",
    "--config",
    validConfig,
    "--include-adapter-scope",
    "--json",
    "--non-interactive",
  ];
  const run = runDistBinary(args);
  ev.recordRun("dist-partial-adapter-scope", distBinary, args, run);
  assertEnvelopeValid(run.envelope);
  assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.status, "partial");
  assert.equal(run.code, 8);
  summary.cases.push({
    case: "dist-partial-adapter-scope",
    status: run.envelope.status,
    exitCode: run.code,
  });
}

// dist-binary result-file atomic good + bad (via doctor success).
{
  const rfGood = resolve(scratch, "doctor-rf-good", "out.json");
  mkdirSync(dirname(rfGood), { recursive: true });
  const args = [
    "doctor",
    "--config",
    validConfig,
    "--result-file",
    rfGood,
    "--json",
    "--non-interactive",
  ];
  const run = runDistBinary(args);
  ev.recordRun("dist-result-file-good", distBinary, args, run);
  assert.equal(run.code, 0);
  assertResultFileGood(rfGood, run.envelope);
  const rfBad = resolve(scratch, "doctor-rf-bad", "out.json");
  const bargs = [
    "doctor",
    "--config",
    validConfig,
    "--result-file",
    rfBad,
    "--json",
    "--non-interactive",
  ];
  const br = runDistBinary(bargs);
  ev.recordRun("dist-result-file-bad", distBinary, bargs, br);
  assert.equal(br.code, 5);
  assert.equal(br.envelope.errors[0].code, "VE_RESULT_FILE_WRITE_FAILED");
  assert.equal(existsSync(rfBad), false);
  summary.cases.push(
    { case: "dist-result-file-good", exitCode: 0 },
    { case: "dist-result-file-bad", exitCode: 5, existsAfter: false },
  );
}

rmSync(scratch, { recursive: true, force: true });
ev.writeJson("summary.json", summary);
console.log(
  JSON.stringify(
    { ok: summary.ok, command: "doctor", cases: summary.cases.length, evidenceRoot },
    null,
    2,
  ),
);
process.exitCode = 0;
