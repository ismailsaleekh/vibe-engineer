#!/usr/bin/env node
// WP-04 — config command matrix witness (real CommandLoader dispatch + real dist-binary spawn).
// Mirrors commands/create/run-cli-witnesses.mjs. Covers: inspect/validate success / invalid-input
// (unknown flag, invalid subcommand) / blocked (invalid_config exit 3) / exit-code via exitCodeFor
// / result-file atomic (good+bad) / schema valid + ≥1 negative mutation.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCommandLoader } from "../../command-loader/loader.js";
import { exitCodeFor, validateCliResultEnvelope } from "../../envelope/result-envelope.js";
import { configCommand } from "./index.js";
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
const evidenceRoot = resolve(repoRoot, ".vibe/work/WP-04-command-matrix/evidence/config");
const ev = makeEvidenceWriter(evidenceRoot);
const scratch = mkdtempSync(join(tmpdir(), "wp04-config-"));
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
    id: "wp04-config-witness",
    command: "config",
    argv: args,
    projectRoot: null,
    configPath: null,
    startedAt: "2026-06-27T00:00:00.000Z",
    endedAt: "2026-06-27T00:00:00.000Z",
  };
}
function assertExit(env) {
  assertExitCodeMatchesEnvelope(env, env.exitCode);
}

const summary = { schemaVersion: "wp04-config-witness/v1", ok: true, cases: [] };
{
  const loader = createCommandLoader([configCommand]);
  assert.equal(loader.hasCommand("config"), true);
  summary.commandRegistered = true;
}

// Source-dispatch success (inspect + validate) with the REAL config provider result as context.
{
  const loaded = await loadVibeConfigFile(validConfig);
  assert.equal(loaded.ok, true);
  const ctxBase = {
    invocation: invocation(["inspect"]),
    packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
    config: loaded,
  };
  const inspect = await createCommandLoader([configCommand]).dispatch(
    "config",
    ["inspect"],
    ctxBase,
  );
  assertEnvelopeValid(inspect.envelope);
  assertExit(inspect.envelope);
  assert.equal(inspect.envelope.status, "success");
  assert.equal(inspect.envelope.payload.kind, "config_inspect_result");
  const validate = await createCommandLoader([configCommand]).dispatch(
    "config",
    ["validate"],
    ctxBase,
  );
  assertEnvelopeValid(validate.envelope);
  assertExit(validate.envelope);
  assert.equal(validate.envelope.status, "success");
  assert.equal(validate.envelope.payload.kind, "config_validation_result");
  ev.writeJson("source-dispatch-success.json", {
    inspect: inspect.envelope,
    validate: validate.envelope,
  });
  const muts = assertAtLeastOneMutationFails(inspect.envelope);
  ev.writeJson("source-dispatch-success-schema-negative.json", muts);
  summary.cases.push({
    case: "source-dispatch-success",
    inspectKind: inspect.envelope.payload.kind,
    validateKind: validate.envelope.payload.kind,
    mutationsFailing: muts.filter((m) => m.ok === false).length,
  });
}

// dist-binary inspect success.
{
  const args = ["config", "inspect", "--config", validConfig, "--json", "--non-interactive"];
  const run = runDistBinary(args);
  ev.recordRun("dist-inspect-success", distBinary, args, run);
  assertJsonStdout(run.stdout);
  assertEnvelopeValid(run.envelope);
  assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.status, "success");
  assert.equal(run.code, 0);
  const muts = assertAtLeastOneMutationFails(run.envelope);
  ev.writeJson("dist-inspect-success-schema-negative.json", muts);
  summary.cases.push({
    case: "dist-inspect-success",
    status: run.envelope.status,
    exitCode: run.code,
    mutationsFailing: muts.filter((m) => m.ok === false).length,
  });
}

// dist-binary validate success.
{
  const args = ["config", "validate", "--config", validConfig, "--json", "--non-interactive"];
  const run = runDistBinary(args);
  ev.recordRun("dist-validate-success", distBinary, args, run);
  assertEnvelopeValid(run.envelope);
  assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.status, "success");
  assert.equal(run.envelope.payload.kind, "config_validation_result");
  summary.cases.push({
    case: "dist-validate-success",
    status: run.envelope.status,
    exitCode: run.code,
  });
}

// dist-binary invalid: unknown subcommand → invalid_invocation exit 2.
{
  const args = ["config", "bogus", "--json", "--non-interactive"];
  const run = runDistBinary(args);
  ev.recordRun("dist-invalid-subcommand", distBinary, args, run);
  assertEnvelopeValid(run.envelope);
  assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.errors[0].classification, "invalid_invocation");
  assert.equal(run.code, 2);
  summary.cases.push({
    case: "dist-invalid-subcommand",
    status: run.envelope.status,
    exitCode: run.code,
  });
}

// dist-binary invalid: unknown flag → invalid_invocation exit 2.
{
  const args = ["config", "inspect", "--bogus", "--json", "--non-interactive"];
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
  const args = ["config", "inspect", "--config", badConfig, "--json", "--non-interactive"];
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

// dist-binary result-file atomic good + bad.
{
  const rfGood = resolve(scratch, "config-rf-good", "out.json");
  mkdirSync(dirname(rfGood), { recursive: true });
  const args = [
    "config",
    "inspect",
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
  const rfBad = resolve(scratch, "config-rf-bad", "out.json");
  const bargs = [
    "config",
    "inspect",
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
    { ok: summary.ok, command: "config", cases: summary.cases.length, evidenceRoot },
    null,
    2,
  ),
);
process.exitCode = 0;
