#!/usr/bin/env node
// WP-04 — CLI command matrix aggregator (real-boundary = built dist binary).
// Asserts the typed command matrix uniformly across the 9 public v0.1 commands:
//   success / invalid-input / blocked / exit-code (via exitCodeFor) / result-file atomic
//   (good + bad) / envelope schema valid (positive + ≥1 negative mutation) / JSON-not-prose.
// Regression rows: deferred commands (context/registry/update/init → unsupported_operation);
//   build/ship → Unknown invalid_invocation (NOT unsupported); skill names + foundation absent
//   from help; foundation failure (exit 1) + partial (exit 8).
// help+version are also covered by testing/run-witnesses.mjs (global, 23 cases) — referenced,
// not duplicated. This aggregator is the release-boundary (dist binary) matrix.
//
// Definitive external-install proof (npm pack → clean install → installed binary) is DEFERRED
// to WP-05; WP-04 proves the built-binary matrix only.
import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertAtLeastOneMutationFails,
  assertEnvelopeValid,
  assertExitCodeMatchesEnvelope,
  assertJsonStdout,
  assertResultFileGood,
  distBinary,
  exitCodeFor,
  makeEvidenceWriter,
  negativeMutationWitnesses,
  repoRoot,
  runDistBinary,
} from "./matrix-harness.mjs";
import pkg from "../../package.json" with { type: "json" };

const here = dirname(fileURLToPath(import.meta.url));
const evidenceRoot = resolve(repoRoot, ".vibe/work/WP-04-command-matrix/evidence/matrix");
const ev = makeEvidenceWriter(evidenceRoot);

// Shared real fixtures (named vibe-engineer.config.json — the config loader requires this name).
const scratch = mkdtempSync(join(tmpdir(), "wp04-matrix-"));
const validConfigDir = resolve(scratch, "valid-proj");
const badConfigDir = resolve(scratch, "bad-proj");
mkdirSync(validConfigDir, { recursive: true });
mkdirSync(badConfigDir, { recursive: true });
writeFileSync(
  join(validConfigDir, "vibe-engineer.config.json"),
  JSON.stringify({ agenticHarness: "pi" }, null, 2),
);
writeFileSync(join(badConfigDir, "vibe-engineer.config.json"), "{ not json");
const validConfigPath = join(validConfigDir, "vibe-engineer.config.json");
const badConfigPath = join(badConfigDir, "vibe-engineer.config.json");

// Schematic fixtures (real).
const manifestPath = resolve(
  repoRoot,
  "packages/schematics/fixtures/engine/schematic/manifest.json",
);
const inputPath = resolve(repoRoot, "packages/schematics/fixtures/engine/inputs/valid.json");
// Security fixtures (real).
const secFixtures = resolve(repoRoot, "examples/starter-reference/generated-fixtures/security");
const safeRequest = resolve(secFixtures, "requests/safe-local-read-only-command.json");
const destructiveRequest = resolve(secFixtures, "requests/blocked-destructive-command.json");
const policyFile = resolve(secFixtures, "policies/default-security-policy.json");

const PUBLIC_COMMANDS = [
  "help",
  "version",
  "create",
  "import",
  "doctor",
  "config",
  "verify",
  "security",
  "schematic",
];
const DEFERRED_COMMANDS = ["context", "registry", "update", "init"];
const SKILL_NAMES = ["brainstorm", "grill-me", "task", "plan", "build", "ship"];

const matrix = {}; // command -> { success, invalid, blocked, partial, exitCode, resultFileGood, resultFileBad, schemaValid, schemaNegative }
const regressions = {};

function recordCell(slug, run, opts = {}) {
  ev.recordRun(slug, distBinary, opts.args ?? [], run);
  if (run.envelope) {
    assertJsonStdout(run.stdout);
    assertEnvelopeValid(run.envelope);
    const expected = assertExitCodeMatchesEnvelope(run.envelope, run.code);
    return {
      status: run.envelope.status,
      exitCode: run.code,
      expectedExit: expected,
      code: run.envelope.errors?.[0]?.code ?? null,
      classification: run.envelope.errors?.[0]?.classification ?? null,
      kind: run.envelope.payload?.kind ?? null,
      ok: "pass",
    };
  }
  // No envelope (unexpected crash) — record truthfully.
  return { status: null, exitCode: run.code, ok: "FAIL", stderr: run.stderr };
}

function newTarget(name) {
  const t = resolve(scratch, name);
  mkdirSync(t, { recursive: true });
  return t;
}

// --- help ---
{
  const run = runDistBinary(["help", "--json", "--non-interactive"]);
  const cell = recordCell("help/success", run, { args: ["help", "--json", "--non-interactive"] });
  assert.equal(cell.status, "success");
  assert.equal(cell.kind, "help_result");
  const ids = run.envelope.payload.data.commands.map((c) => c.id);
  assert.deepEqual(
    [...ids].sort(),
    [...PUBLIC_COMMANDS].sort(),
    "help must list exactly the 9 public commands",
  );
  assert.equal(ids.includes("foundation"), false, "foundation (internal) must be absent from help");
  const helpBlob = JSON.stringify(run.envelope);
  for (const skill of SKILL_NAMES)
    assert.equal(
      helpBlob.includes(`"${skill}"`),
      false,
      `skill name ${skill} must be absent from help`,
    );
  const muts = assertAtLeastOneMutationFails(run.envelope);
  ev.writeJson("help/schema-negative.json", muts);
  matrix.help = {
    success: cell,
    schemaValid: "pass",
    schemaNegative: {
      ok: "pass",
      failing: muts.filter((m) => m.ok === false).map((m) => m.mutation),
    },
  };

  const inv = runDistBinary(["help", "--bogus", "--json", "--non-interactive"]);
  const ic = recordCell("help/invalid-flag", inv, {
    args: ["help", "--bogus", "--json", "--non-interactive"],
  });
  assert.equal(ic.classification, "invalid_invocation");
  matrix.help.invalid = ic;
}

// --- version ---
{
  const run = runDistBinary(["version", "--json", "--non-interactive"]);
  const cell = recordCell("version/success", run, {
    args: ["version", "--json", "--non-interactive"],
  });
  assert.equal(cell.status, "success");
  assert.equal(cell.kind, "version_result");
  assert.equal(run.envelope.payload.data.name, pkg.name);
  assert.equal(run.envelope.payload.data.version, pkg.version);
  const muts = assertAtLeastOneMutationFails(run.envelope);
  matrix.version = {
    success: cell,
    schemaValid: "pass",
    schemaNegative: {
      ok: "pass",
      failing: muts.filter((m) => m.ok === false).map((m) => m.mutation),
    },
  };
  const inv = runDistBinary(["version", "--bogus", "--json", "--non-interactive"]);
  const ic = recordCell("version/invalid-flag", inv, {
    args: ["version", "--bogus", "--json", "--non-interactive"],
  });
  assert.equal(ic.classification, "invalid_invocation");
  matrix.version.invalid = ic;
}

// --- create ---
{
  const t = newTarget("create-ok");
  const args = [
    "create",
    "--target-root",
    t,
    "--project-name",
    "Matrix Create",
    "--agentic-harness",
    "pi",
    "--brief",
    "matrix witness",
    "--json",
    "--non-interactive",
  ];
  const run = runDistBinary(args);
  const cell = recordCell("create/success", run, { args });
  assert.equal(cell.status, "success");
  assert.equal(cell.kind, "create_result");
  const muts = assertAtLeastOneMutationFails(run.envelope);
  // invalid
  const iargs = ["create", "--project-name", "X", "--bogus", "--json", "--non-interactive"];
  const inv = runDistBinary(iargs);
  const ic = recordCell("create/invalid-flag", inv, { args: iargs });
  assert.equal(ic.classification, "invalid_invocation");
  // blocked (deferred non-pi harness → unsupported_operation)
  const bargs = [
    "create",
    "--target-root",
    newTarget("create-block"),
    "--project-name",
    "X",
    "--agentic-harness",
    "codex",
    "--brief",
    "y",
    "--json",
    "--non-interactive",
  ];
  const blk = runDistBinary(bargs);
  const bc = recordCell("create/blocked-non-pi", blk, { args: bargs });
  assert.equal(bc.status, "blocked");
  assert.equal(bc.classification, "unsupported_operation");
  matrix.create = {
    success: cell,
    invalid: ic,
    blocked: bc,
    schemaValid: "pass",
    schemaNegative: {
      ok: "pass",
      failing: muts.filter((m) => m.ok === false).map((m) => m.mutation),
    },
  };
}

// --- import ---
{
  const t = newTarget("import-ok"); // existing dir = import happy path
  const args = [
    "import",
    "--target-root",
    t,
    "--project-name",
    "Matrix Import",
    "--agentic-harness",
    "pi",
    "--brief",
    "existing",
    "--json",
    "--non-interactive",
  ];
  const run = runDistBinary(args);
  const cell = recordCell("import/success", run, { args });
  assert.equal(cell.status, "success");
  assert.equal(cell.kind, "create_result");
  const muts = assertAtLeastOneMutationFails(run.envelope);
  const iargs = ["import", "--target-root", t, "--bogus", "--json", "--non-interactive"];
  const inv = runDistBinary(iargs);
  const ic = recordCell("import/invalid-flag", inv, { args: iargs });
  assert.equal(ic.classification, "invalid_invocation");
  // blocked: nonexistent target → invalid_input
  const bargs = [
    "import",
    "--target-root",
    resolve(scratch, "import-missing"),
    "--json",
    "--non-interactive",
  ];
  const blk = runDistBinary(bargs);
  const bc = recordCell("import/blocked-missing-target", blk, { args: bargs });
  assert.equal(bc.status, "blocked");
  assert.equal(bc.classification, "invalid_input");
  matrix.import = {
    success: cell,
    invalid: ic,
    blocked: bc,
    schemaValid: "pass",
    schemaNegative: {
      ok: "pass",
      failing: muts.filter((m) => m.ok === false).map((m) => m.mutation),
    },
  };
}

// --- doctor ---
{
  const args = ["doctor", "--config", validConfigPath, "--json", "--non-interactive"];
  const run = runDistBinary(args);
  const cell = recordCell("doctor/success", run, { args });
  assert.equal(cell.status, "success");
  assert.equal(cell.kind, "doctor_result");
  const muts = assertAtLeastOneMutationFails(run.envelope);
  const iargs = ["doctor", "--bogus", "--json", "--non-interactive"];
  const inv = runDistBinary(iargs);
  const ic = recordCell("doctor/invalid-flag", inv, { args: iargs });
  assert.equal(ic.classification, "invalid_invocation");
  // blocked: invalid config → invalid_config (exit 3)
  const bargs = ["doctor", "--config", badConfigPath, "--json", "--non-interactive"];
  const blk = runDistBinary(bargs);
  const bc = recordCell("doctor/blocked-invalid-config", blk, { args: bargs });
  assert.equal(bc.status, "blocked");
  assert.equal(bc.classification, "invalid_config");
  assert.equal(bc.exitCode, 3);
  // partial: --include-adapter-scope → partial exit 8
  const pargs = [
    "doctor",
    "--config",
    validConfigPath,
    "--include-adapter-scope",
    "--json",
    "--non-interactive",
  ];
  const prt = runDistBinary(pargs);
  const pc = recordCell("doctor/partial-adapter-scope", prt, { args: pargs });
  assert.equal(pc.status, "partial");
  assert.equal(pc.exitCode, 8);
  matrix.doctor = {
    success: cell,
    invalid: ic,
    blocked: bc,
    partial: pc,
    schemaValid: "pass",
    schemaNegative: {
      ok: "pass",
      failing: muts.filter((m) => m.ok === false).map((m) => m.mutation),
    },
  };
}

// --- config ---
{
  const args = ["config", "inspect", "--config", validConfigPath, "--json", "--non-interactive"];
  const run = runDistBinary(args);
  const cell = recordCell("config/inspect-success", run, { args });
  assert.equal(cell.status, "success");
  assert.equal(cell.kind, "config_inspect_result");
  const muts = assertAtLeastOneMutationFails(run.envelope);
  // validate subcommand success
  const vargs = ["config", "validate", "--config", validConfigPath, "--json", "--non-interactive"];
  const vrun = runDistBinary(vargs);
  const vc = recordCell("config/validate-success", vrun, { args: vargs });
  assert.equal(vc.status, "success");
  assert.equal(vc.kind, "config_validation_result");
  // invalid: unknown subcommand
  const iargs = ["config", "bogus", "--json", "--non-interactive"];
  const inv = runDistBinary(iargs);
  const ic = recordCell("config/invalid-subcommand", inv, { args: iargs });
  assert.equal(ic.classification, "invalid_invocation");
  // blocked: invalid config → invalid_config (exit 3)
  const bargs = ["config", "inspect", "--config", badConfigPath, "--json", "--non-interactive"];
  const blk = runDistBinary(bargs);
  const bc = recordCell("config/blocked-invalid-config", blk, { args: bargs });
  assert.equal(bc.status, "blocked");
  assert.equal(bc.classification, "invalid_config");
  assert.equal(bc.exitCode, 3);
  matrix.config = {
    inspectSuccess: cell,
    validateSuccess: vc,
    invalid: ic,
    blocked: bc,
    schemaValid: "pass",
    schemaNegative: {
      ok: "pass",
      failing: muts.filter((m) => m.ok === false).map((m) => m.mutation),
    },
  };
}

// --- verify ---
// REAL dist-binary behavior after VERIFY-FIX: --project-root is still parsed as a GLOBAL flag by
// the entry, but verify now resolves it from invocation.projectRoot. The matrix therefore records
// the real shipped-binary success path directly instead of carrying the obsolete WP-04 residual.
{
  const vprojRaw = resolve(scratch, "verify-proj");
  mkdirSync(join(vprojRaw, "plans"), { recursive: true });
  mkdirSync(join(vprojRaw, "ev-dist"), { recursive: true });
  mkdirSync(join(vprojRaw, "ev-noproj"), { recursive: true });
  writeFileSync(
    join(vprojRaw, "vibe-engineer.config.json"),
    JSON.stringify({ agenticHarness: "pi" }, null, 2),
  );
  cpSync(
    resolve(repoRoot, "packages/verification/fixtures/plans/approved-plan.json"),
    join(vprojRaw, "plans/approved-plan.json"),
  );
  writeFileSync(
    join(vprojRaw, "catalog.json"),
    JSON.stringify(
      [
        {
          kind: "validator",
          validator: "validateArtifactFile",
          targetPath: "plans/approved-plan.json",
          artifactKind: "implementation_plan",
          id: "schema-validation",
          requiredItemIds: ["schema-validation"],
          layer: "schema_validation",
          evidenceClass: "deterministic",
          blocking: true,
        },
        {
          kind: "validator",
          validator: "validateArtifactFile",
          targetPath: "plans/approved-plan.json",
          artifactKind: "implementation_plan",
          id: "advisory-review",
          requiredItemIds: ["advisory-review"],
          layer: "advisory_review",
          evidenceClass: "advisory",
          blocking: false,
        },
      ],
      null,
      2,
    ),
  );
  const vproj = realpathSync(vprojRaw);

  const args = [
    "verify",
    "--implementation-plan",
    "plans/approved-plan.json",
    "--project-root",
    vproj,
    "--evidence-root",
    join(vproj, "ev-dist"),
    "--run-id",
    "wp04m-dist-success",
    "--runner-catalog",
    "catalog.json",
    "--json",
    "--non-interactive",
  ];
  const run = runDistBinary(args);
  const cell = recordCell("verify/dist-success", run, { args });
  assert.equal(cell.status, "success");
  assert.equal(cell.exitCode, 0);
  assert.equal(cell.kind, "verification_result");
  assert.equal(run.envelope.payload.data.ok, true);
  const packets = run.envelope.payload.data.evidencePackets;
  assert.ok(
    Array.isArray(packets) && packets.length >= 1,
    "verify success must produce real evidence packets",
  );
  for (const packet of packets)
    assert.equal(
      existsSync(packet.path),
      true,
      `verify evidence packet missing on disk: ${packet.path}`,
    );
  const muts = assertAtLeastOneMutationFails(run.envelope);

  // invalid: unknown flag
  const iargs = ["verify", "--bogus", "--json", "--non-interactive"];
  const inv = runDistBinary(iargs);
  const ic = recordCell("verify/invalid-flag", inv, { args: iargs });
  assert.equal(ic.classification, "invalid_invocation");

  // blocked negative: no --project-root anywhere. Supplying --config lets the entry load config
  // without a project root, proving verify does not silently fall back to process.cwd().
  const bargs = [
    "verify",
    "--config",
    join(vproj, "vibe-engineer.config.json"),
    "--implementation-plan",
    join(vproj, "plans/approved-plan.json"),
    "--evidence-root",
    join(vproj, "ev-noproj"),
    "--run-id",
    "wp04m-no-project-root",
    "--runner-catalog",
    join(vproj, "catalog.json"),
    "--json",
    "--non-interactive",
  ];
  const blk = runDistBinary(bargs);
  const bc = recordCell("verify/blocked-no-project-root", blk, { args: bargs });
  assert.equal(bc.status, "blocked");
  assert.equal(bc.code, "VE_MISSING_FLAG_VALUE");
  assert.equal(bc.exitCode, exitCodeFor(bc.status, bc.classification));

  matrix.verify = {
    success: cell,
    blocked: bc,
    invalid: ic,
    schemaValid: "pass",
    schemaNegative: {
      ok: "pass",
      failing: muts.filter((m) => m.ok === false).map((m) => m.mutation),
    },
  };
}

// --- security ---
// NOTE: --project-root is a global flag that triggers config loading from that root; the repo
// root has no vibe-engineer.config.json, so passing it would block at config-load (missing_config)
// before reaching security. Security does not require --project-root for an absolute request-file,
// so the real success path is invoked without it (absolute fixture paths).
{
  const args = [
    "security",
    "--request-file",
    safeRequest,
    "--policy-file",
    policyFile,
    "--json",
    "--non-interactive",
  ];
  const run = runDistBinary(args);
  const cell = recordCell("security/success", run, { args });
  assert.equal(cell.status, "success");
  const muts = assertAtLeastOneMutationFails(run.envelope);
  const iargs = ["security", "--bogus", "--json", "--non-interactive"];
  const inv = runDistBinary(iargs);
  const ic = recordCell("security/invalid-flag", inv, { args: iargs });
  assert.equal(ic.classification, "invalid_invocation");
  // blocked: destructive request → safety_policy_block (exit 4)
  const bargs = ["security", "--request-file", destructiveRequest, "--json", "--non-interactive"];
  const blk = runDistBinary(bargs);
  const bc = recordCell("security/blocked-destructive", blk, { args: bargs });
  assert.equal(bc.status, "blocked");
  assert.equal(bc.classification, "safety_policy_block");
  assert.equal(bc.exitCode, 4);
  matrix.security = {
    success: cell,
    invalid: ic,
    blocked: bc,
    schemaValid: "pass",
    schemaNegative: {
      ok: "pass",
      failing: muts.filter((m) => m.ok === false).map((m) => m.mutation),
    },
  };
}

// --- schematic ---
{
  const t = newTarget("schematic-dry");
  const args = [
    "schematic",
    "dry-run",
    "--manifest",
    manifestPath,
    "--input-file",
    inputPath,
    "--target-root",
    t,
    "--json",
    "--non-interactive",
  ];
  const run = runDistBinary(args);
  const cell = recordCell("schematic/success-dry-run", run, { args });
  assert.equal(cell.status, "success");
  assert.equal(cell.kind, "schematic_result");
  const muts = assertAtLeastOneMutationFails(run.envelope);
  const iargs = ["schematic", "--bogus", "--json", "--non-interactive"];
  const inv = runDistBinary(iargs);
  const ic = recordCell("schematic/invalid-flag", inv, { args: iargs });
  assert.equal(ic.classification, "invalid_invocation");
  matrix.schematic = {
    success: cell,
    invalid: ic,
    schemaValid: "pass",
    schemaNegative: {
      ok: "pass",
      failing: muts.filter((m) => m.ok === false).map((m) => m.mutation),
    },
  };
}

// --- Result-file atomic (global carrier): GOOD + BAD (via version) ---
{
  const rfGood = resolve(scratch, "rf-good", "out.json");
  mkdirSync(dirname(rfGood), { recursive: true });
  const args = ["version", "--result-file", rfGood, "--json", "--non-interactive"];
  const run = runDistBinary(args);
  ev.recordRun("result-file/good", distBinary, args, run);
  assert.equal(run.code, 0);
  assertEnvelopeValid(run.envelope);
  assertResultFileGood(rfGood, run.envelope);
  const rfBad = resolve(scratch, "rf-bad-missing-dir", "out.json");
  const bargs = ["version", "--result-file", rfBad, "--json", "--non-interactive"];
  const br = runDistBinary(bargs);
  ev.recordRun("result-file/bad-missing-dir", distBinary, bargs, br);
  assert.equal(br.code, 5);
  assertEnvelopeValid(br.envelope);
  assert.equal(br.envelope.errors[0].code, "VE_RESULT_FILE_WRITE_FAILED");
  assert.equal(br.envelope.errors[0].classification, "write_conflict");
  assert.equal(existsSync(rfBad), false); // no partial write
  matrix.resultFile = {
    good: { ok: "pass", exitCode: 0, path: rfGood },
    bad: { ok: "pass", exitCode: 5, code: "VE_RESULT_FILE_WRITE_FAILED", existsAfter: false },
  };
}

// --- Regression rows ---
{
  // deferred commands → unsupported_operation / VE_UNSUPPORTED_OPERATION, exit 2
  regressions.deferredCommands = {};
  for (const cmd of DEFERRED_COMMANDS) {
    const args = [cmd, "--json", "--non-interactive"];
    const run = runDistBinary(args);
    ev.recordRun(`regression/deferred-${cmd}`, distBinary, args, run);
    const expected = run.envelope ? assertExitCodeMatchesEnvelope(run.envelope, run.code) : null;
    assert.equal(run.envelope.errors[0].code, "VE_UNSUPPORTED_OPERATION");
    assert.equal(run.envelope.errors[0].classification, "unsupported_operation");
    assert.equal(run.code, 2);
    regressions.deferredCommands[cmd] = {
      exitCode: run.code,
      code: run.envelope.errors[0].code,
      classification: run.envelope.errors[0].classification,
      expectedExit: expected,
    };
  }
  // build/ship → Unknown invalid_invocation (NOT unsupported)
  regressions.skillCommandsUnknown = {};
  for (const cmd of ["build", "ship"]) {
    const args = [cmd, "--json", "--non-interactive"];
    const run = runDistBinary(args);
    ev.recordRun(`regression/unknown-${cmd}`, distBinary, args, run);
    const expected = assertExitCodeMatchesEnvelope(run.envelope, run.code);
    assert.equal(run.envelope.errors[0].code, "VE_INVALID_INVOCATION");
    assert.equal(run.envelope.errors[0].classification, "invalid_invocation");
    assert.notEqual(run.envelope.errors[0].classification, "unsupported_operation");
    assert.equal(run.code, 2);
    regressions.skillCommandsUnknown[cmd] = {
      exitCode: run.code,
      code: run.envelope.errors[0].code,
      classification: run.envelope.errors[0].classification,
      expectedExit: expected,
    };
  }
  // foundation: failure (exit 1) + partial (exit 8) — regression for non-zero exit paths
  const ffail = runDistBinary(["foundation", "--status", "failure", "--json", "--non-interactive"]);
  ev.recordRun(
    "regression/foundation-failure",
    distBinary,
    ["foundation", "--status", "failure", "--json", "--non-interactive"],
    ffail,
  );
  assertExitCodeMatchesEnvelope(ffail.envelope, ffail.code);
  assert.equal(ffail.envelope.status, "failure");
  assert.equal(ffail.envelope.errors[0].classification, "deterministic_failure");
  assert.equal(ffail.code, 1);
  const fpart = runDistBinary(["foundation", "--status", "partial", "--json", "--non-interactive"]);
  ev.recordRun(
    "regression/foundation-partial",
    distBinary,
    ["foundation", "--status", "partial", "--json", "--non-interactive"],
    fpart,
  );
  assertExitCodeMatchesEnvelope(fpart.envelope, fpart.code);
  assert.equal(fpart.envelope.status, "partial");
  assert.equal(fpart.code, 8);
  regressions.foundation = { failureExit: ffail.code, partialExit: fpart.code };
}

// --- Cleanup scratch (evidence preserved under evidenceRoot) ---
rmSync(scratch, { recursive: true, force: true });

const summary = {
  schemaVersion: "wp04-command-matrix/v1",
  ok: true,
  realBoundary: distBinary,
  externalInstallProof: { deferredTo: "WP-05" },
  publicCommands: PUBLIC_COMMANDS,
  matrix,
  regressions,
  trackedResiduals: [
    {
      id: "security-build-facing-consumer",
      severity: "tracked",
      pending: "WP-05-exports-seam",
      reason:
        "ERR_PACKAGE_PATH_NOT_EXPORTED; segregated in commands/security/run-cli-witnesses.mjs.",
    },
  ],
  referencedWitnesses: [
    "testing/run-witnesses.mjs (23 global I-02A cases incl. help/version/result-file/schema-negative)",
    "commands/create/run-cli-witnesses.mjs",
    "commands/schematic/run-cli-witnesses.mjs",
    "commands/security/run-cli-witnesses.mjs (matrix slice green; build-facing fixture pending-WP-05)",
    "commands/doctor/run-cli-witnesses.mjs",
    "commands/config/run-cli-witnesses.mjs",
    "commands/verify/run-cli-witnesses.mjs",
    "commands/import/run-cli-witnesses.mjs",
  ],
  evidenceRoot,
};
ev.writeJson("summary.json", summary);
console.log(
  JSON.stringify(
    {
      ok: summary.ok,
      matrix: Object.keys(matrix),
      regressions: Object.keys(regressions),
      evidenceRoot,
    },
    null,
    2,
  ),
);
process.exitCode = 0;
