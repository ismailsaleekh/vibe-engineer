#!/usr/bin/env node
// VERIFY-FIX — verify command matrix witness (real CommandLoader dispatch + real dist-binary spawn).
// Post-fix (Option A from verify-defect-adjudication.md): verify now falls back to
// invocation.projectRoot, so the REAL dist-binary success path is reachable through the shipped
// binary. This witness closes the shape-green≠truth-green gap for the load-bearing seam
// (quality-bar §7): `npm pack`-style clean install boundary is the dist binary, and verify's
// success path now runs end-to-end through it — real config load, real runVerificationPlan,
// real atomic Evidence Packet writes with real sha256s.
//
// Cases:
//  - source-dispatch SUCCESS (regression guard; real loader → real verify module → real
//    runVerificationPlan, --project-root passed in argv directly, bypassing the global parser).
//  - dist-binary SUCCESS (THE FIX): real shipped binary, --project-root consumed globally by
//    the entry, verify resolves projectRoot from invocation.projectRoot → reaches success.
//  - dist-binary result-file atomic good (entry carrier writes the result file).
//  - dist-binary BLOCKED (regression guard): missing required NON-global command flags.
//  - dist-binary invalid: unknown flag → invalid_invocation exit 2.
//  - dist-binary BLOCKED (negative): non-approved plan → PLAN_NOT_APPROVED (proves the fallback
//    does not silently bypass plan-approval gating).
//  - dist-binary BLOCKED (negative): NO --project-root anywhere → missing-required (proves no
//    silent process.cwd() fall-through).
//  - source-dispatch result-file atomic good.
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCommandLoader } from "../../command-loader/loader.js";
import { verifyCommand } from "./index.ts";
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
const evidenceRoot = resolve(repoRoot, ".vibe/work/WP-04-command-matrix/evidence/verify");
const ev = makeEvidenceWriter(evidenceRoot);
const scratch = mkdtempSync(join(tmpdir(), "verifyfix-verify-"));

// Build a self-contained verify project root (config + approved plan + draft plan + catalog all
// inside it, non-protected). The validator-catalog (validateArtifactFile) runner produces a green
// result without spawning, exercising the real runVerificationPlan producer→consumer boundary.
let projRoot = resolve(scratch, "proj");
mkdirSync(join(projRoot, "plans"), { recursive: true });
mkdirSync(join(projRoot, "ev"), { recursive: true });
writeFileSync(join(projRoot, "vibe-engineer.config.json"), JSON.stringify({ agenticHarness: "pi" }, null, 2));
cpSync(resolve(repoRoot, "packages/verification/fixtures/plans/approved-plan.json"), join(projRoot, "plans/approved-plan.json"));
// Build a non-approved plan by cloning the approved plan and flipping its status to "draft".
{
  const draft = JSON.parse(readFileSync(join(projRoot, "plans/approved-plan.json"), "utf8"));
  draft.status = "draft";
  draft.artifactId = "verifyfix-plan-draft";
  writeFileSync(join(projRoot, "plans/draft-plan.json"), JSON.stringify(draft, null, 2));
}
writeFileSync(join(projRoot, "catalog.json"), JSON.stringify([
  { kind: "validator", validator: "validateArtifactFile", targetPath: "plans/approved-plan.json", artifactKind: "implementation_plan", id: "schema-validation", requiredItemIds: ["schema-validation"], layer: "schema_validation", evidenceClass: "deterministic", blocking: true },
  { kind: "validator", validator: "validateArtifactFile", targetPath: "plans/approved-plan.json", artifactKind: "implementation_plan", id: "advisory-review", requiredItemIds: ["advisory-review"], layer: "advisory_review", evidenceClass: "advisory", blocking: false },
], null, 2));
// Normalize through the macOS /tmp → /private/tmp symlink so verify's realpath-based containment
// checks see consistent prefixes for paths that do not yet exist on disk.
projRoot = realpathSync(projRoot);

function invocation(args) {
  return { id: "verifyfix-verify-witness", command: "verify", argv: args, projectRoot: projRoot, configPath: null, startedAt: "2026-06-27T00:00:00.000Z", endedAt: "2026-06-27T00:00:00.000Z" };
}
function assertExit(env) { assertExitCodeMatchesEnvelope(env, env.exitCode); }

const summary = { schemaVersion: "verifyfix-verify-witness/v1", ok: true, cases: [] };
{
  const loader = createCommandLoader([verifyCommand]);
  assert.equal(loader.hasCommand("verify"), true);
  summary.commandRegistered = true;
}

// Source-dispatch SUCCESS (regression guard; real loader → real verify module → real runner).
// --project-root is passed in argv here (dispatch does not run the global parser), so verify
// receives it. This is the real command-module producer→consumer boundary.
{
  const args = ["--implementation-plan", "plans/approved-plan.json", "--evidence-root", join(projRoot, "ev-green"), "--project-root", projRoot, "--run-id", "verifyfix-green", "--runner-catalog", "catalog.json"];
  mkdirSync(join(projRoot, "ev-green"), { recursive: true });
  const result = await createCommandLoader([verifyCommand]).dispatch("verify", args, { invocation: invocation(args), packageJsonPath: resolve(repoRoot, "packages/cli/package.json"), config: null });
  const env = result.envelope;
  assertEnvelopeValid(env); assertExit(env);
  assert.equal(env.status, "success"); assert.equal(env.exitCode, 0);
  assert.equal(env.payload.kind, "verification_result");
  ev.writeJson("source-dispatch-success.json", env);
  const muts = assertAtLeastOneMutationFails(env);
  ev.writeJson("source-dispatch-success-schema-negative.json", muts);
  summary.cases.push({ case: "source-dispatch-success", status: env.status, exitCode: env.exitCode, mutationsFailing: muts.filter((m) => m.ok === false).length });
}

// dist-binary SUCCESS — THE FIX. The real shipped binary: --project-root is consumed globally by
// the entry (production behaviour), invocation.projectRoot carries it, verify resolves it via the
// new fallback and reaches runVerificationPlan → success.
{
  const evDir = join(projRoot, "ev-dist");
  mkdirSync(evDir, { recursive: true });
  const args = ["verify", "--implementation-plan", "plans/approved-plan.json", "--project-root", projRoot, "--evidence-root", evDir, "--run-id", "verifyfix-dist-success", "--runner-catalog", "catalog.json", "--json", "--non-interactive"];
  const run = runDistBinary(args); ev.recordRun("dist-success", distBinary, args, run);
  assertJsonStdout(run.stdout); assertEnvelopeValid(run.envelope);
  assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.status, "success", `expected success, got ${run.envelope.status}: ${run.stdout}`);
  assert.equal(run.code, 0);
  assert.equal(run.envelope.payload.kind, "verification_result");
  assert.equal(run.envelope.payload.data.ok, true);
  assert.ok(["passed", "advisory_warning"].includes(run.envelope.payload.data.runnerStatus), `runnerStatus=${run.envelope.payload.data.runnerStatus}`);
  // ≥1 REAL Evidence Packet written under the project root with a real sha256.
  const packets = run.envelope.payload.data.evidencePackets;
  assert.ok(Array.isArray(packets) && packets.length >= 1, "success path must produce ≥1 evidence packet");
  for (const p of packets) {
    assert.ok(typeof p.path === "string" && p.path.length > 0, "packet must have a real path");
    assert.ok(/^sha256:[0-9a-f]{64}$/iu.test(p.sha256) || /^[0-9a-f]{64}$/iu.test(p.sha256), `packet sha256 not a real hash: ${p.sha256}`);
    assert.equal(containedIn(projRoot, p.path), true, `packet path must be inside project root: ${p.path}`);
    assert.equal(existsSync(p.path), true, `packet file must exist on disk: ${p.path}`);
  }
  // envelope.artifacts must carry a kind:evidence_packet descriptor per packet.
  const packetArtifacts = (run.envelope.artifacts ?? []).filter((a) => a.kind === "evidence_packet");
  assert.equal(packetArtifacts.length, packets.length);
  ev.writeJson("dist-success.json", run.envelope);
  const muts = assertAtLeastOneMutationFails(run.envelope);
  ev.writeJson("dist-success-schema-negative.json", muts);
  summary.cases.push({ case: "dist-success", status: run.envelope.status, exitCode: run.code, runnerStatus: run.envelope.payload.data.runnerStatus, evidencePackets: packets.length, mutationsFailing: muts.filter((m) => m.ok === false).length });
}

// dist-binary result-file atomic good — the entry carrier writes the result file through the
// shipped binary (--result-file is a global flag; the entry writes it atomically).
{
  const rfGood = join(projRoot, "verify-dist-rf", "out.json"); mkdirSync(dirname(rfGood), { recursive: true });
  const args = ["verify", "--implementation-plan", "plans/approved-plan.json", "--project-root", projRoot, "--evidence-root", join(projRoot, "ev-rf-dist"), "--run-id", "verifyfix-dist-rf", "--runner-catalog", "catalog.json", "--result-file", rfGood, "--json", "--non-interactive"];
  mkdirSync(join(projRoot, "ev-rf-dist"), { recursive: true });
  const run = runDistBinary(args); ev.recordRun("dist-result-file-good", distBinary, args, run);
  assertJsonStdout(run.stdout); assertEnvelopeValid(run.envelope);
  assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.status, "success");
  assertResultFileGood(rfGood, run.envelope);
  ev.writeJson("dist-result-file-good.json", run.envelope);
  summary.cases.push({ case: "dist-result-file-good", status: run.envelope.status, exitCode: run.code, resultFileWritten: existsSync(rfGood) });
}

// dist-binary invalid: unknown flag → invalid_invocation exit 2.
{
  const args = ["verify", "--bogus", "--json", "--non-interactive"];
  const run = runDistBinary(args); ev.recordRun("dist-invalid-flag", distBinary, args, run);
  assertEnvelopeValid(run.envelope); assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.errors[0].classification, "invalid_invocation"); assert.equal(run.code, 2);
  summary.cases.push({ case: "dist-invalid-flag", status: run.envelope.status, exitCode: run.code });
}

// dist-binary BLOCKED: missing required NON-global command flags (--project-root is satisfied via
// invocation, but --implementation-plan/--evidence-root/--run-id/--runner-catalog are missing).
{
  const args = ["verify", "--project-root", projRoot, "--json", "--non-interactive"];
  const run = runDistBinary(args); ev.recordRun("dist-blocked-missing-flags", distBinary, args, run);
  assertEnvelopeValid(run.envelope); assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.status, "blocked");
  summary.cases.push({ case: "dist-blocked-missing-flags", status: run.envelope.status, exitCode: run.code });
}

// dist-binary BLOCKED (negative): non-approved plan → PLAN_NOT_APPROVED. Proves the invocation
// fallback does NOT silently bypass plan-approval gating.
{
  const args = ["verify", "--implementation-plan", "plans/draft-plan.json", "--project-root", projRoot, "--evidence-root", join(projRoot, "ev-draft"), "--run-id", "verifyfix-draft", "--runner-catalog", "catalog.json", "--json", "--non-interactive"];
  mkdirSync(join(projRoot, "ev-draft"), { recursive: true });
  const run = runDistBinary(args); ev.recordRun("dist-blocked-plan-not-approved", distBinary, args, run);
  assertEnvelopeValid(run.envelope); assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.status, "blocked");
  // Draft plan points at the approved-plan targetPath in catalog; runner rejects on plan.status !== approved.
  assert.equal(run.envelope.payload.data.runnerStatus, "not_run");
  ev.writeJson("dist-blocked-plan-not-approved.json", run.envelope);
  summary.cases.push({ case: "dist-blocked-plan-not-approved", status: run.envelope.status, exitCode: run.code, runnerStatus: run.envelope.payload.data.runnerStatus });
}

// dist-binary BLOCKED (negative): NO --project-root anywhere → missing-required --project-root.
// Proves no silent process.cwd() fall-through (the fallback is to invocation.projectRoot ONLY).
{
  // Provide a config via --config so the entry does not need a project root to load config, and
  // pass the other required flags so the ONLY missing thing is --project-root.
  const args = ["verify", "--config", join(projRoot, "vibe-engineer.config.json"), "--implementation-plan", join(projRoot, "plans/approved-plan.json"), "--evidence-root", join(projRoot, "ev-noproj"), "--run-id", "verifyfix-noproj", "--runner-catalog", join(projRoot, "catalog.json"), "--json", "--non-interactive"];
  mkdirSync(join(projRoot, "ev-noproj"), { recursive: true });
  const run = runDistBinary(args); ev.recordRun("dist-blocked-no-project-root", distBinary, args, run);
  assertEnvelopeValid(run.envelope); assertExitCodeMatchesEnvelope(run.envelope, run.code);
  assert.equal(run.envelope.status, "blocked");
  assert.equal(run.envelope.errors[0].code, "VE_MISSING_FLAG_VALUE");
  ev.writeJson("dist-blocked-no-project-root.json", run.envelope);
  summary.cases.push({ case: "dist-blocked-no-project-root", status: run.envelope.status, exitCode: run.code, code: run.envelope.errors[0].code });
}

// Source-dispatch result-file atomic good (verify's own result-file path; regression guard).
// NOTE: verify enforces path containment — result-file MUST live inside the project root.
{
  const rfGood = join(projRoot, "verify-rf-good", "out.json"); mkdirSync(dirname(rfGood), { recursive: true });
  const args = ["--implementation-plan", "plans/approved-plan.json", "--evidence-root", join(projRoot, "ev-rf"), "--project-root", projRoot, "--run-id", "verifyfix-rf", "--runner-catalog", "catalog.json", "--result-file", rfGood];
  mkdirSync(join(projRoot, "ev-rf"), { recursive: true });
  const result = await createCommandLoader([verifyCommand]).dispatch("verify", args, { invocation: invocation(args), packageJsonPath: resolve(repoRoot, "packages/cli/package.json"), config: null });
  assertEnvelopeValid(result.envelope); assertExit(result.envelope);
  assert.equal(result.envelope.status, "success");
  assert.equal(existsSync(rfGood), true);
  ev.writeJson("source-dispatch-result-file-good.json", result.envelope);
  summary.cases.push({ case: "source-dispatch-result-file-good", status: result.envelope.status, exitCode: result.envelope.exitCode, resultFileWritten: true });
}

function containedIn(root, child) {
  const rel = relative(resolve(root), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

rmSync(scratch, { recursive: true, force: true });
ev.writeJson("summary.json", summary);
const allSuccess = summary.cases.filter((c) => c.case.startsWith("dist-success") || c.case.startsWith("source-dispatch-success"));
console.log(JSON.stringify({ ok: summary.ok, command: "verify", cases: summary.cases.length, successCases: allSuccess.length, evidenceRoot }, null, 2));
process.exitCode = 0;
