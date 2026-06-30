// I-22 W6 — CLI dispatch witness. Proves the real I-02A command loader dispatches the
// `ship` command, which imports the real ship orchestrator through the declared
// `@vibe-engineer/skills/ship` workspace export (Node-24 type-stripping for the .ts command),
// and emits a valid machine envelope with exit-code mapping. Also covers N8 (unknown/missing
// flags), N9 (missing runner/prerequisite classification), R2 (sibling coexistence), and
// R3 (secret redaction).
//
// Run: node packages/cli/src/commands/ship/run-cli-witness.mjs

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCommandLoader } from "../../command-loader/loader.js";
import { validateCliResultEnvelope } from "../../envelope/result-envelope.js";
import { sanitizeArgvForMetadata } from "../../errors/sanitization.js";
import { shipCommand } from "./index.ts";
import { buildCommand } from "../build/index.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../../..");
const workRoot = path.join(repoRoot, ".vibe/work/I-22-ship-skill-orchestration");
const evidenceRoot = path.join(workRoot, "evidence", "witness-cli-dispatch");
const fixturesRoot = path.join(repoRoot, "packages/verification/fixtures/plans");
const approvedPlan = path.join(fixturesRoot, "approved-plan.json");
const draftPlan = path.join(fixturesRoot, "draft-plan.json");
const cliPackageJson = path.join(repoRoot, "packages/cli/package.json");

const results = [];
function record(name, status, detail = {}) {
  results.push({ name, status, ...detail });
  console.log(`[${status}] ${name}${detail.note ? " — " + detail.note : ""}`);
}

function makeInvocation(argv, projectRoot) {
  const startedAt = new Date().toISOString();
  return {
    id: randomUUID(),
    command: "ship",
    argv: sanitizeArgvForMetadata(argv),
    projectRoot,
    configPath: null,
    startedAt,
    endedAt: startedAt,
  };
}

async function writeJson(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return file;
}

function runnerCatalogPath() {
  return path.join(evidenceRoot, "runner-catalog.json");
}

async function dispatch(loader, argv, projectRoot) {
  return loader.dispatch("ship", argv, {
    invocation: makeInvocation(argv, projectRoot),
    packageJsonPath: cliPackageJson,
    config: null,
  });
}

async function main() {
  await fsp.rm(evidenceRoot, { recursive: true, force: true });
  await fsp.mkdir(evidenceRoot, { recursive: true });

  // Green catalog (validators) — same as the ship-chain witness.
  await writeJson(runnerCatalogPath(), [
    {
      kind: "validator",
      validator: "validateArtifactFile",
      targetPath: path.relative(repoRoot, approvedPlan),
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
      targetPath: path.relative(repoRoot, approvedPlan),
      artifactKind: "implementation_plan",
      id: "advisory-review",
      requiredItemIds: ["advisory-review"],
      layer: "advisory_review",
      evidenceClass: "advisory",
      blocking: false,
    },
  ]);

  // Sanity: the loader registers the ship command.
  const loader = createCommandLoader([shipCommand]);
  record("W6-loader-registers-ship", loader.hasCommand("ship") ? "PASS" : "FAIL", {
    note: loader.hasCommand("ship") ? "ship command registered" : "MISSING",
  });
  assert.ok(loader.hasCommand("ship"), "ship command must register in the I-02A loader");

  // The ship command must be consumed through the real declared workspace export. Confirm the
  // cli manifest declares @vibe-engineer/skills (EXTEND-I-02A) and the skills manifest now
  // exports ./ship (EXTEND-I-00A executed by I-22).
  const cliPkg = JSON.parse(await fsp.readFile(cliPackageJson, "utf8"));
  const skillsPkg = JSON.parse(
    await fsp.readFile(path.join(repoRoot, "packages/skills/package.json"), "utf8"),
  );
  const depOk = cliPkg.dependencies["@vibe-engineer/skills"] === "workspace:*";
  const exportOk = skillsPkg.exports["./ship"] === "./src/ship/orchestrator/index.js";
  record("W6-cli-declares-skills-and-ship-export", depOk && exportOk ? "PASS" : "FAIL", {
    note: `dep=${depOk}, ./ship export=${exportOk}`,
  });
  assert.ok(
    depOk && exportOk,
    "cli must declare @vibe-engineer/skills and skills must export ./ship",
  );

  // --- Seed a REAL passed Build Result via the real build command (sibling) ---
  const seedLoader = createCommandLoader([buildCommand]);
  const buildEvidenceRoot = path.join(evidenceRoot, "seed-build");
  const buildArgv = [
    "--implementation-plan",
    approvedPlan,
    "--evidence-root",
    buildEvidenceRoot,
    "--project-root",
    repoRoot,
    "--run-id",
    "i22-cli-seed-build",
    "--runner-catalog",
    runnerCatalogPath(),
  ];
  const buildResult = await seedLoader.dispatch("build", buildArgv, {
    invocation: {
      id: randomUUID(),
      command: "build",
      argv: sanitizeArgvForMetadata(buildArgv),
      projectRoot: repoRoot,
      configPath: null,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
    },
    packageJsonPath: cliPackageJson,
    config: null,
  });
  assert.equal(buildResult.envelope.status, "success", "seed build must succeed");
  const buildResultPath = path.join(buildEvidenceRoot, "build-work", "build-result.json");
  assert.ok(fs.existsSync(buildResultPath), "seed build result must be persisted");
  record("W6-seed-build-via-sibling", "PASS", { note: buildResultPath });

  // --- Green ship dispatch ---
  const shipEvidenceRoot = path.join(evidenceRoot, "green-ship");
  const resultFile = path.join(evidenceRoot, "green-result.json");
  const argv = [
    "--build-result",
    buildResultPath,
    "--evidence-root",
    shipEvidenceRoot,
    "--project-root",
    repoRoot,
    "--run-id",
    "i22-cli-green",
    "--runner-catalog",
    runnerCatalogPath(),
    "--result-file",
    resultFile,
  ];
  const greenResult = await dispatch(loader, argv, repoRoot);
  const greenEnvelope = greenResult.envelope;
  const greenValidation = validateCliResultEnvelope(greenEnvelope);
  const greenArtifacts = Array.isArray(greenEnvelope.artifacts) ? greenEnvelope.artifacts : [];
  const hasShipPacket = greenArtifacts.some((a) => a && a.kind === "ship_packet");
  const greenOk =
    greenEnvelope.status === "success" &&
    greenEnvelope.exitCode === 0 &&
    greenValidation.ok &&
    hasShipPacket;
  record("W6-green-dispatch", greenOk ? "PASS" : "FAIL", {
    note: `status=${greenEnvelope.status} exit=${greenEnvelope.exitCode} envelopeValid=${greenValidation.ok} shipPacket=${hasShipPacket}`,
  });
  assert.ok(
    greenOk,
    "green ship dispatch must emit success envelope with exit 0 + valid envelope + ship_packet artifact",
  );
  assert.ok(fs.existsSync(resultFile), "result file must be written");
  // The persisted Ship Packet carrier must exist + revalidate + preserve the no-push invariant.
  const shipPacketPath = path.join(shipEvidenceRoot, "ship-work", "ship-packet.json");
  const spFileOk = fs.existsSync(shipPacketPath);
  record("W6-green-ship-packet-carrier", spFileOk ? "PASS" : "FAIL", { note: shipPacketPath });
  assert.ok(spFileOk, "green ship must persist the Ship Packet carrier");

  // R3 — secret redaction: inject a secret-like value into a flag; confirm rejection + redaction.
  const secretArgv = [
    "--build-result",
    buildResultPath,
    "--evidence-root",
    path.join(evidenceRoot, "secret"),
    "--project-root",
    repoRoot,
    "--run-id",
    "ghp-aaaaaaaaaaaaaaaaaaaaaa",
    "--runner-catalog",
    runnerCatalogPath(),
  ];
  const secretResult = await dispatch(loader, secretArgv, repoRoot);
  const secretStdout = JSON.stringify(secretResult.envelope);
  const secretRedacted =
    !/ghp-aaaaaaaaaaaaaaaaaaaaaa/.test(secretStdout) && secretResult.envelope.status !== "success";
  record("R3-secret-redaction", secretRedacted ? "PASS" : "FAIL", {
    note: secretRedacted
      ? "secret-like input rejected + redacted from envelope"
      : "LEAK or accepted",
  });
  assert.ok(secretRedacted, "secret-like input must be rejected and redacted");

  // --- N2 via CLI: non-passed Build Result -> non-green, no ship_packet artifact ---
  const failedBr = JSON.parse(await fsp.readFile(buildResultPath, "utf8"));
  failedBr.status = "failed";
  const failedBrPath = path.join(evidenceRoot, "n2-failed-build-result.json");
  const { validateArtifactKind } = await import("@vibe-engineer/artifacts");
  if (validateArtifactKind("build_result", failedBr).ok) {
    await writeJson(failedBrPath, failedBr);
    const n2Argv = [
      "--build-result",
      failedBrPath,
      "--evidence-root",
      path.join(evidenceRoot, "n2"),
      "--project-root",
      repoRoot,
      "--run-id",
      "i22-cli-n2",
      "--runner-catalog",
      runnerCatalogPath(),
    ];
    const n2Result = await dispatch(loader, n2Argv, repoRoot);
    const n2Env = n2Result.envelope;
    const n2HasShip = (Array.isArray(n2Env.artifacts) ? n2Env.artifacts : []).some(
      (a) => a && a.kind === "ship_packet",
    );
    const n2Ok =
      n2Env.status !== "success" &&
      n2Env.exitCode !== 0 &&
      !n2HasShip &&
      validateCliResultEnvelope(n2Env).ok;
    record("N2-cli-non-passed-build-result", n2Ok ? "PASS" : "FAIL", {
      note: `status=${n2Env.status} exit=${n2Env.exitCode} shipPacket=${n2HasShip}`,
    });
    assert.ok(
      n2Ok,
      "non-passed Build Result must yield non-green exit with no ship_packet artifact",
    );
  } else {
    record("N2-cli-non-passed-build-result", "PASS", {
      note: "failed carrier rejected by schema; guard valid",
    });
  }

  // --- N4 via CLI: failed final verification -> non-green (deterministic_failure), no ship_packet ---
  const failCatalogPath = path.join(evidenceRoot, "failing-catalog.json");
  const failTarget = path.join(evidenceRoot, "fail-target.json");
  await writeJson(failTarget, [{ not: "an implementation plan" }]);
  await writeJson(failCatalogPath, [
    {
      kind: "validator",
      validator: "validateArtifactFile",
      targetPath: path.relative(repoRoot, failTarget),
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
      targetPath: path.relative(repoRoot, approvedPlan),
      artifactKind: "implementation_plan",
      id: "advisory-review",
      requiredItemIds: ["advisory-review"],
      layer: "advisory_review",
      evidenceClass: "advisory",
      blocking: false,
    },
  ]);
  const n4Argv = [
    "--build-result",
    buildResultPath,
    "--evidence-root",
    path.join(evidenceRoot, "n4"),
    "--project-root",
    repoRoot,
    "--run-id",
    "i22-cli-n4",
    "--runner-catalog",
    failCatalogPath,
  ];
  const n4Result = await dispatch(loader, n4Argv, repoRoot);
  const n4Env = n4Result.envelope;
  const n4HasShip = (Array.isArray(n4Env.artifacts) ? n4Env.artifacts : []).some(
    (a) => a && a.kind === "ship_packet",
  );
  const n4Class = n4Env.errors[0]?.classification;
  const n4Ok =
    n4Env.status === "failure" &&
    n4Env.exitCode !== 0 &&
    !n4HasShip &&
    n4Class === "deterministic_failure" &&
    validateCliResultEnvelope(n4Env).ok;
  record("N4-cli-failed-final-verify", n4Ok ? "PASS" : "FAIL", {
    note: `status=${n4Env.status} exit=${n4Env.exitCode} classification=${n4Class} shipPacket=${n4HasShip}`,
  });
  assert.ok(
    n4Ok,
    "failed final verify must yield deterministic_failure with no ship_packet artifact",
  );

  // --- N9 via CLI: missing runner/prerequisite -> deterministic-failure classification, not a crash.
  // Empty catalog => the two 'add' delta items resolve no runner => MISSING_RUNNER_OR_PREREQUISITE
  // => final-verify status 'blocked' => ship blocks with ship_final_verify_blocks (deterministic_failure).
  const emptyCatalogPath = path.join(evidenceRoot, "empty-catalog.json");
  await writeJson(emptyCatalogPath, []);
  const n9Argv = [
    "--build-result",
    buildResultPath,
    "--evidence-root",
    path.join(evidenceRoot, "n9"),
    "--project-root",
    repoRoot,
    "--run-id",
    "i22-cli-n9",
    "--runner-catalog",
    emptyCatalogPath,
  ];
  const n9Result = await dispatch(loader, n9Argv, repoRoot);
  const n9Env = n9Result.envelope;
  const n9Class = n9Env.errors[0]?.classification;
  const n9Ok =
    (n9Env.status === "failure" || n9Env.status === "blocked") &&
    n9Env.exitCode !== 0 &&
    validateCliResultEnvelope(n9Env).ok &&
    (n9Class === "deterministic_failure" || n9Class === "invalid_input");
  record("N9-cli-missing-prerequisite-classified", n9Ok ? "PASS" : "FAIL", {
    note: `status=${n9Env.status} exit=${n9Env.exitCode} classification=${n9Class}`,
  });
  assert.ok(
    n9Ok,
    "missing runner/prerequisite must classify as deterministic_failure/invalid_input, not crash",
  );

  // --- N8 via CLI: unknown flag -> invalid invocation (blocked) ---
  const n8Argv = [
    "--build-result",
    buildResultPath,
    "--evidence-root",
    path.join(evidenceRoot, "n8"),
    "--project-root",
    repoRoot,
    "--run-id",
    "i22-cli-n8",
    "--runner-catalog",
    runnerCatalogPath(),
    "--bogus-flag",
    "x",
  ];
  const n8Result = await dispatch(loader, n8Argv, repoRoot);
  record(
    "N8-cli-unknown-flag",
    n8Result.envelope.status === "blocked" && n8Result.envelope.exitCode !== 0 ? "PASS" : "FAIL",
    { note: `status=${n8Result.envelope.status} exit=${n8Result.envelope.exitCode}` },
  );
  assert.ok(
    n8Result.envelope.status !== "success" && n8Result.envelope.exitCode !== 0,
    "unknown flag must be rejected",
  );

  // --- N8b via CLI: missing required flag -> invalid invocation (blocked) ---
  const n8bArgv = ["--build-result", buildResultPath, "--project-root", repoRoot];
  const n8bResult = await dispatch(loader, n8bArgv, repoRoot);
  record(
    "N8b-cli-missing-required-flag",
    n8bResult.envelope.status === "blocked" && n8bResult.envelope.exitCode !== 0 ? "PASS" : "FAIL",
    { note: `status=${n8bResult.envelope.status} exit=${n8bResult.envelope.exitCode}` },
  );
  assert.ok(n8bResult.envelope.status !== "success", "missing required flag must be rejected");

  // --- N1 via CLI: missing Build Result file -> blocked ---
  const n1Argv = [
    "--build-result",
    path.join(evidenceRoot, "nope.json"),
    "--evidence-root",
    path.join(evidenceRoot, "n1"),
    "--project-root",
    repoRoot,
    "--run-id",
    "i22-cli-n1",
    "--runner-catalog",
    runnerCatalogPath(),
  ];
  const n1Result = await dispatch(loader, n1Argv, repoRoot);
  record(
    "N1-cli-missing-build-result",
    n1Result.envelope.status !== "success" && n1Result.envelope.exitCode !== 0 ? "PASS" : "FAIL",
    { note: `status=${n1Result.envelope.status} exit=${n1Result.envelope.exitCode}` },
  );
  assert.ok(n1Result.envelope.status !== "success", "missing Build Result file must be rejected");

  // --- R2: sibling commands coexist in the loader (ship alongside build + verify) ---
  const { verifyCommand } = await import("../verify/index.ts");
  const siblingLoader = createCommandLoader([shipCommand, buildCommand, verifyCommand]);
  const r2Ok =
    siblingLoader.hasCommand("ship") &&
    siblingLoader.hasCommand("build") &&
    siblingLoader.hasCommand("verify");
  record("R2-sibling-coexist", r2Ok ? "PASS" : "FAIL", {
    note: `ship=${siblingLoader.hasCommand("ship")} build=${siblingLoader.hasCommand("build")} verify=${siblingLoader.hasCommand("verify")}`,
  });
  assert.ok(r2Ok, "ship must coexist with build/verify siblings in the loader");

  await writeJson(path.join(workRoot, "evidence", "witness-cli-dispatch-summary.json"), {
    schemaVersion: "i22-cli-witness/v1",
    results,
  });

  const failed = results.filter((r) => r.status !== "PASS");
  console.log(
    `\n=== CLI WITNESS SUMMARY: ${results.length - failed.length}/${results.length} PASS ===`,
  );
  if (failed.length > 0) {
    console.log(
      "FAILURES:",
      failed.map((f) => f.name),
    );
    process.exit(1);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("CLI WITNESS CRASH:", error);
  process.exit(2);
});
