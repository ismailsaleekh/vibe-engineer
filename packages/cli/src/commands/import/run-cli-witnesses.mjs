#!/usr/bin/env node
// WP-04 — import command matrix witness (real CommandLoader dispatch + real dist-binary spawn).
// Mirrors commands/create/run-cli-witnesses.mjs (which already covers create/import in depth via
// runCreate). This witness asserts the import-specific matrix cells through the real dist binary:
// success (existing target root) / invalid-input (unknown flag, missing target) / blocked
// (nonexistent target → invalid_input) / exit-code via exitCodeFor / result-file atomic (good+bad)
// / schema valid + ≥1 negative mutation. import shares runCreate with create (mode="import").
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCommandLoader } from "../../command-loader/loader.js";
import { exitCodeFor, validateCliResultEnvelope } from "../../envelope/result-envelope.js";
import { importCommand } from "./index.ts";
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
const evidenceRoot = resolve(repoRoot, ".vibe/work/WP-04-command-matrix/evidence/import");
const ev = makeEvidenceWriter(evidenceRoot);
const scratch = mkdtempSync(join(tmpdir(), "wp04-import-"));

function invocation(args) {
  return { id: "wp04-import-witness", command: "import", argv: args, projectRoot: null, configPath: null, startedAt: "2026-06-27T00:00:00.000Z", endedAt: "2026-06-27T00:00:00.000Z" };
}
function assertExit(env) { assertExitCodeMatchesEnvelope(env, env.exitCode); }

const summary = { schemaVersion: "wp04-import-witness/v1", ok: true, cases: [] };
{
  const loader = createCommandLoader([importCommand]);
  assert.equal(loader.hasCommand("import"), true);
  summary.commandRegistered = true;
}

// Source-dispatch success (existing target root = import happy path).
{
  const targetRoot = resolve(scratch, "src-dispatch-target"); mkdirSync(targetRoot, { recursive: true });
  const args = ["--target-root", targetRoot, "--project-name", "Import Witness", "--agentic-harness", "pi", "--brief", "existing project", "--json", "--non-interactive"];
  const result = await createCommandLoader([importCommand]).dispatch("import", args, { invocation: invocation(args), packageJsonPath: resolve(repoRoot, "packages/cli/package.json"), config: null });
  assertEnvelopeValid(result.envelope); assertExit(result.envelope);
  assert.equal(result.envelope.status, "success");
  assert.equal(result.envelope.payload.kind, "create_result");
  assert.equal(result.envelope.payload.data.mode, "import");
  ev.writeJson("source-dispatch-success.json", result.envelope);
  const muts = assertAtLeastOneMutationFails(result.envelope);
  ev.writeJson("source-dispatch-success-schema-negative.json", muts);
  summary.cases.push({ case: "source-dispatch-success", status: result.envelope.status, exitCode: result.envelope.exitCode, mutationsFailing: muts.filter((m) => m.ok === false).length });
}

// dist-binary success (existing target root).
{
  const targetRoot = resolve(scratch, "dist-target"); mkdirSync(targetRoot, { recursive: true });
  const args = ["import", "--target-root", targetRoot, "--project-name", "Imp Matrix", "--agentic-harness", "pi", "--brief", "matrix witness", "--json", "--non-interactive"];
  const run = runDistBinary(args); ev.recordRun("dist-success", distBinary, args, run);
  assertJsonStdout(run.stdout); assertEnvelopeValid(run.envelope); assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.status, "success"); assert.equal(run.code, 0);
  assert.equal(run.envelope.payload.kind, "create_result");
  const muts = assertAtLeastOneMutationFails(run.envelope);
  ev.writeJson("dist-success-schema-negative.json", muts);
  summary.cases.push({ case: "dist-success", status: run.envelope.status, exitCode: run.code, mutationsFailing: muts.filter((m) => m.ok === false).length });
}

// dist-binary invalid: unknown flag → invalid_invocation exit 2.
{
  const args = ["import", "--target-root", scratch, "--bogus", "--json", "--non-interactive"];
  const run = runDistBinary(args); ev.recordRun("dist-invalid-flag", distBinary, args, run);
  assertEnvelopeValid(run.envelope); assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.errors[0].classification, "invalid_invocation"); assert.equal(run.code, 2);
  summary.cases.push({ case: "dist-invalid-flag", status: run.envelope.status, exitCode: run.code });
}

// dist-binary blocked: nonexistent target root → invalid_input exit 2.
{
  const args = ["import", "--target-root", resolve(scratch, "nonexistent-target"), "--json", "--non-interactive"];
  const run = runDistBinary(args); ev.recordRun("dist-blocked-missing-target", distBinary, args, run);
  assertEnvelopeValid(run.envelope); assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.status, "blocked");
  assert.equal(run.envelope.errors[0].classification, "invalid_input"); assert.equal(run.code, 2);
  summary.cases.push({ case: "dist-blocked-missing-target", status: run.envelope.status, exitCode: run.code });
}

// dist-binary result-file atomic good + bad.
{
  const targetRoot = resolve(scratch, "rf-target"); mkdirSync(targetRoot, { recursive: true });
  const rfGood = resolve(scratch, "import-rf-good", "out.json"); mkdirSync(dirname(rfGood), { recursive: true });
  const args = ["import", "--target-root", targetRoot, "--project-name", "RF", "--agentic-harness", "pi", "--brief", "y", "--result-file", rfGood, "--json", "--non-interactive"];
  const run = runDistBinary(args); ev.recordRun("dist-result-file-good", distBinary, args, run);
  assert.equal(run.code, 0); assertResultFileGood(rfGood, run.envelope);
  const rfBad = resolve(scratch, "import-rf-bad", "out.json");
  const bargs = ["import", "--target-root", targetRoot, "--project-name", "RF2", "--agentic-harness", "pi", "--brief", "y", "--result-file", rfBad, "--json", "--non-interactive"];
  const br = runDistBinary(bargs); ev.recordRun("dist-result-file-bad", distBinary, bargs, br);
  assert.equal(br.code, 5); assert.equal(br.envelope.errors[0].code, "VE_RESULT_FILE_WRITE_FAILED");
  assert.equal(existsSync(rfBad), false);
  summary.cases.push({ case: "dist-result-file-good", exitCode: 0 }, { case: "dist-result-file-bad", exitCode: 5, existsAfter: false });
}

rmSync(scratch, { recursive: true, force: true });
ev.writeJson("summary.json", summary);
console.log(JSON.stringify({ ok: summary.ok, command: "import", cases: summary.cases.length, evidenceRoot }, null, 2));
process.exitCode = 0;
