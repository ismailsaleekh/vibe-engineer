// WP-04 shared matrix harness. Real-boundary = built dist binary.
// Asserts the typed command matrix uniformly: exit code via `exitCodeFor`, envelope schema
// validity, atomic result-file good/bad, JSON-not-prose, and negative schema mutations.
// No mocks/stubs: spawns the real built binary; validates real emitted envelopes.
//
// Owned by WP-04. Imported by `testing/run-command-matrix.mjs` and the per-command witnesses.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { exitCodeFor, validateCliResultEnvelope } from "../envelope/result-envelope.js";
import { sanitizeArgvForMetadata } from "../errors/sanitization.js";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, "../../../..");
export const distBinary = resolve(repoRoot, "packages/cli/dist/entry/vibe-engineer.js");
export const sourceEntry = resolve(repoRoot, "packages/cli/src/entry/vibe-engineer.js");

export function assertJsonStdout(stdout) {
  assert.equal(stdout.trim().startsWith("{"), true, "stdout must be JSON (no prose-as-contract)");
}

// Genuine runtime narrower: parses-boundary-then-validates. Consuming JSON.parse directly as
// the argument of this magic-named narrower is the gate-sanctioned pattern (the raw-json-parse
// escape is suppressed because the parse is immediately narrowed through a named validator),
// AND it adds real validation on every parsed envelope rather than a decorative wrapper.
export function narrowCliEnvelope(parsed) {
  const validation = validateCliResultEnvelope(parsed);
  if (!validation.ok) {
    throw new Error(`narrowCliEnvelope: invalid CLI result envelope: ${validation.errors.join("; ")}`);
  }
  return parsed;
}

export function assertEnvelopeValid(envelope) {
  const validation = validateCliResultEnvelope(envelope);
  assert.equal(validation.ok, true, `envelope schema invalid: ${validation.errors?.join("; ")}`);
}

export function assertExitCodeMatchesEnvelope(envelope, exitCode) {
  const primary = envelope.errors?.[0]?.classification ?? null;
  const expected = exitCodeFor(envelope.status, primary);
  assert.equal(
    exitCode,
    expected,
    `exit code mismatch: process.exitCode=${exitCode} but exitCodeFor(${envelope.status}, ${primary})=${expected}`,
  );
  return expected;
}

// Spawns the real built binary (release boundary). Returns { code, stdout, stderr, envelope, evidence }.
export function runDistBinary(args, { env = process.env, cwd = repoRoot } = {}) {
  const result = spawnSync(process.execPath, [distBinary, ...args], { cwd, encoding: "utf8", env });
  let envelope = null;
  if (result.stdout && result.stdout.trim().startsWith("{")) envelope = narrowCliEnvelope(JSON.parse(result.stdout));
  return { code: result.status, stdout: result.stdout, stderr: result.stderr, envelope };
}

export function runSourceEntry(args, { env = process.env, cwd = repoRoot } = {}) {
  const result = spawnSync(process.execPath, [sourceEntry, ...args], { cwd, encoding: "utf8", env });
  let envelope = null;
  if (result.stdout && result.stdout.trim().startsWith("{")) envelope = narrowCliEnvelope(JSON.parse(result.stdout));
  return { code: result.status, stdout: result.stdout, stderr: result.stderr, envelope };
}

// Evidence writer bound to a root; sanitizes argv for the recorded command line.
export function makeEvidenceWriter(evidenceRoot) {
  rmSync(evidenceRoot, { recursive: true, force: true });
  mkdirSync(evidenceRoot, { recursive: true });
  function write(slug, fields) {
    const safe = slug.replaceAll("/", "_");
    for (const [ext, content] of Object.entries(fields)) {
      writeFileSync(resolve(evidenceRoot, `${safe}.${ext}`), content, "utf8");
    }
  }
  function recordRun(slug, binaryPath, args, run) {
    write(slug, {
      "cmd.txt": `node ${binaryPath} ${sanitizeArgvForMetadata(args).join(" ")}\n`,
      stdout: run.stdout ?? "",
      stderr: run.stderr ?? "",
      exit: `${run.code ?? ""}\n`,
      ...(run.envelope ? { "envelope.json": `${JSON.stringify(run.envelope, null, 2)}\n` } : {}),
    });
  }
  function writeJson(file, value) {
    const target = resolve(evidenceRoot, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }
  return { write, recordRun, writeJson, evidenceRoot };
}

// Asserts the atomic result-file good path: file exists, byte-equivalent to stdout envelope,
// and the envelope carries a cli_result artifact pointing at the file.
export function assertResultFileGood(resultFile, stdoutEnvelope) {
  assert.equal(existsSync(resultFile), true, "result file must be written on good path");
  const fileEnvelope = narrowCliEnvelope(JSON.parse(readFileSync(resultFile, "utf8")));
  // The carrier adds a cli_result artifact; compare by stripping it for byte-equivalence of the payload.
  const { artifacts: _ignored, ...stdoutCore } = stdoutEnvelope;
  const { artifacts: fileArtifacts, ...fileCore } = fileEnvelope;
  assert.deepEqual(fileCore, stdoutCore, "result-file payload must be byte-equivalent to stdout");
  assert.equal(
    fileArtifacts.some((a) => a.kind === "cli_result" && a.path === resultFile && a.role === "report"),
    true,
    "result file must carry a cli_result artifact {role:'report'}",
  );
}

// Negative schema-mutation witnesses: prove validateCliResultEnvelope is live (not decorative).
// Returns an array of { mutation, ok } where ok MUST be false.
export function negativeMutationWitnesses(envelope) {
  const mutations = [];
  const push = (label, mutator) => mutations.push({ mutation: label, ok: validateCliResultEnvelope(mutator(structuredClone(envelope))).ok });
  push("exitCode", (e) => { if (e.status === "success") e.exitCode = 2; else e.exitCode = 0; return e; });
  push("payload.kind", (e) => { e.payload.kind = "mutated_kind"; return e; });
  push("diagnostics.empty", (e) => { if (e.status !== "success") e.diagnostics = []; return e; });
  push("errors.empty", (e) => { if (e.status !== "success") e.errors = []; return e; });
  push("error.code", (e) => { const err = e.errors?.[0]; if (err) err.code = "VE_UNKNOWN_BOGUS"; return e; });
  push("error.classification", (e) => { const err = e.errors?.[0]; if (err) err.classification = "bogus_classification"; return e; });
  return mutations;
}

export function assertAtLeastOneMutationFails(envelope) {
  const witnesses = negativeMutationWitnesses(envelope);
  const failing = witnesses.filter((m) => m.ok === false);
  assert.ok(failing.length > 0, "no negative schema mutation failed — validator may be decorative");
  return witnesses;
}

export { exitCodeFor, validateCliResultEnvelope };
