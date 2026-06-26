#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { validateCliResultEnvelope } from "../../../../packages/cli/src/envelope/result-envelope.js";
import { CliClassification, CliErrorCode } from "../../../../packages/cli/src/errors/codes.js";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[index + 1];
    options[key] = value;
    index += 1;
  }
  return options;
}

async function readJsonLine(path) {
  const text = await readFile(path, "utf8");
  assert.equal(text.trim().split(/\n/).length, 1, `${path} must contain exactly one JSON line`);
  return JSON.parse(text);
}

function assertEnvelope(envelope, options) {
  const validation = validateCliResultEnvelope(envelope);
  assert.equal(validation.ok, true, `envelope must validate: ${(validation.errors ?? []).join("; ")}`);
  if (options.status) assert.equal(envelope.status, options.status);
  if (options.exit) assert.equal(envelope.exitCode, Number(options.exit));
  if (options.kind) assert.equal(envelope.payload.kind, options.kind);
  if (options.classification) assert.equal(envelope.errors[0]?.classification ?? envelope.diagnostics[0]?.classification, options.classification);
  if (options.code) assert.equal(envelope.errors[0]?.code ?? envelope.diagnostics[0]?.code, options.code);
  if (options.requireConfig === "true") {
    assert.equal(envelope.payload.data.config.agenticHarness, "pi");
    assert.ok(envelope.payload.data.provenance["/agenticHarness"]);
  }
  if (options.requirePartial === "true") {
    const partial = envelope.payload.data.partial;
    assert.equal(partial.overallDisposition, "not_passed_blocking");
    assert.ok(partial.completedScopes.length > 0);
    assert.ok(partial.incompleteScopes.length > 0);
    assert.equal(partial.incompleteScopes[0].blocking, true);
    assert.equal(envelope.status === "success", false, "partial is non-green");
  }
  if (process.env.I02B_CANARY) {
    assert.equal(JSON.stringify(envelope).includes(process.env.I02B_CANARY), false, "canary leaked into envelope");
  }
}

function malformedSuite() {
  const invocation = { id: "malformed-suite", command: "doctor", argv: [], projectRoot: null, configPath: null, startedAt: "2026-01-01T00:00:00.000Z", endedAt: "2026-01-01T00:00:00.000Z" };
  const validPartial = {
    schemaVersion: "vibe-engineer.cli.result.v1",
    invocation,
    status: "partial",
    exitCode: 8,
    payload: {
      kind: "doctor_result",
      schemaVersion: "vibe-engineer.cli.payload.v1",
      data: {
        partial: {
          overallDisposition: "not_passed_blocking",
          completedScopes: [{ id: "done", kind: "scope", required: true, artifacts: ["memory://done"] }],
          incompleteScopes: [{ id: "todo", kind: "scope", required: true, blocking: true, reasonCode: CliErrorCode.PartialIncomplete, classification: CliClassification.PartialIncomplete, nextAction: "resume" }],
          resume: { allowed: true, command: ["vibe-engineer", "doctor"] }
        }
      }
    },
    diagnostics: [{ severity: "error", code: CliErrorCode.PartialIncomplete, classification: CliClassification.PartialIncomplete, message: "partial", path: null, span: null, hint: null }],
    artifacts: [],
    errors: [{ code: CliErrorCode.PartialIncomplete, classification: CliClassification.PartialIncomplete, retryable: true, blocking: true, message: "partial", details: { incompleteScopeIds: ["todo"] } }]
  };
  const cases = {
    validPartial: validateCliResultEnvelope(validPartial).ok,
    wrongExitForStatus: validateCliResultEnvelope({ ...validPartial, exitCode: 0 }).ok,
    missingPartialFields: validateCliResultEnvelope({ ...validPartial, payload: { ...validPartial.payload, data: {} } }).ok,
    unstableCode: validateCliResultEnvelope({ ...validPartial, errors: [{ ...validPartial.errors[0], code: "VE_NOT_STABLE" }] }).ok,
    unstableClassification: validateCliResultEnvelope({ ...validPartial, diagnostics: [{ ...validPartial.diagnostics[0], classification: "not_stable" }] }).ok
  };
  assert.equal(cases.validPartial, true);
  assert.equal(cases.wrongExitForStatus, false);
  assert.equal(cases.missingPartialFields, false);
  assert.equal(cases.unstableCode, false);
  assert.equal(cases.unstableClassification, false);
  return cases;
}

const options = parseArgs(process.argv.slice(2));
if (options.malformedSuite === "true") {
  const result = malformedSuite();
  if (options.out) await writeFile(options.out, `${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}
const envelope = await readJsonLine(options.stdout);
assertEnvelope(envelope, options);
if (options.resultFile) {
  const fromFile = await readJsonLine(options.resultFile);
  assert.deepEqual(fromFile, envelope, "result-file envelope must structurally equal stdout envelope");
}
if (options.out) await writeFile(options.out, `${JSON.stringify({ ok: true, status: envelope.status, exitCode: envelope.exitCode, kind: envelope.payload.kind }, null, 2)}\n`);
