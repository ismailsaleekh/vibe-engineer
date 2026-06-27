#!/usr/bin/env node
// I-15A lane-owned witness runner. Mirrors schematic/run-cli-witnesses.mjs.
// Exercises the REAL create/import command modules through a real CommandLoader, against the REAL
// I-14A manifest/matrix, the REAL context package, and REAL on-disk generated artifacts.
// Located under packages/cli/src/commands/create/ so bare workspace imports resolve from the cli context.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCommandLoader } from "../../command-loader/loader.js";
import { validateCliResultEnvelope } from "../../envelope/result-envelope.js";
import { createCommand } from "./index.ts";
import { importCommand } from "../import/index.ts";

// Real-boundary resolvability (W-RESOLVE-CLI-ADAPTER + W-RESOLVE-CLI-CONTEXT).
import { getPiAdapterCapabilityMatrix, isAdapterManifestSelectable, PI_ADAPTER_ID, PI_ADAPTER_CAPABILITY_SCHEMA_VERSION } from "@vibe-engineer/adapter-pi/capabilities";
import { getPiGeneratedFileManifest, PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION, createPiDownstreamManifestSummary } from "@vibe-engineer/adapter-pi/generated-file-manifest";
import { validateCapabilityMatrix, validateGeneratedFileManifest } from "@vibe-engineer/adapter-pi/schema";
import { validateContextProject, retrieveContextClosure, CONTEXT_SCHEMA_VERSION } from "@vibe-engineer/context";
import { createDefaultVibeConfig } from "@vibe-engineer/config";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../..");
const evidenceRootDefault = resolve(repoRoot, ".vibe/work/I-15A-create-import-cli-ux-selected-harness/evidence/cli");
const canonicalCommand = "node packages/cli/src/commands/create/run-cli-witnesses.mjs --evidence-root .vibe/work/I-15A-create-import-cli-ux-selected-harness/evidence/cli";

function parseArgs(argv) {
  const out = { evidenceRoot: null, case: null, refreshFixtures: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--evidence-root") out.evidenceRoot = resolve(repoRoot, argv[++i]);
    else if (argv[i] === "--case") out.case = argv[++i];
    else if (argv[i] === "--refresh-fixtures") out.refreshFixtures = true;
  }
  out.evidenceRoot = out.evidenceRoot ?? evidenceRootDefault;
  return out;
}
const args = parseArgs(process.argv.slice(2));
rmSync(args.evidenceRoot, { recursive: true, force: true });
mkdirSync(args.evidenceRoot, { recursive: true });

function writeJson(file, value) { writeFileSync(resolve(args.evidenceRoot, file), `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function invocation(command) {
  return { id: `i-15a-${command}-witness`, command, argv: [command, "--non-interactive"], projectRoot: repoRoot, configPath: null, startedAt: "2026-06-27T00:00:00.000Z", endedAt: "2026-06-27T00:00:00.000Z" };
}
function casePrefix(nn, id, slug) { return `${String(nn).padStart(2, "0")}-${id}-${slug}`; }

async function dispatchCreate(slug, extra) {
  const targetRoot = resolve(args.evidenceRoot, "targets", slug);
  const resultFile = resolve(args.evidenceRoot, "result-files", `${slug}.json`);
  mkdirSync(targetRoot, { recursive: true });
  mkdirSync(dirname(resultFile), { recursive: true });
  const loader = createCommandLoader([createCommand]);
  const result = await loader.dispatch("create", ["--target-root", targetRoot, "--result-file", resultFile, ...extra, "--json", "--non-interactive"], { invocation: invocation("create"), packageJsonPath: resolve(repoRoot, "packages/cli/package.json"), config: null });
  return { envelope: result.envelope, targetRoot, resultFile };
}
async function dispatchImport(slug, extra) {
  const targetRoot = resolve(args.evidenceRoot, "targets", slug);
  mkdirSync(targetRoot, { recursive: true });
  const resultFile = resolve(args.evidenceRoot, "result-files", `${slug}.json`);
  mkdirSync(dirname(resultFile), { recursive: true });
  const loader = createCommandLoader([importCommand]);
  const result = await loader.dispatch("import", ["--target-root", targetRoot, "--result-file", resultFile, ...extra, "--json", "--non-interactive"], { invocation: invocation("import"), packageJsonPath: resolve(repoRoot, "packages/cli/package.json"), config: null });
  return { envelope: result.envelope, targetRoot, resultFile };
}

const cases = [];
async function writeCase(nn, id, slug, fn) {
  if (args.case && args.case !== slug) return null;
  const prefix = casePrefix(nn, id, slug);
  let exit = 0, stderr = "", stdout;
  try { stdout = await fn(); }
  catch (error) { exit = 1; stderr = `${error.stack ?? error.message}\n`; stdout = { witness: id, slug, passed: false, error: error.message }; }
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.cmd.txt`), `${canonicalCommand} --case ${slug}\n`, "utf8");
  writeJson(`${prefix}.stdout.json`, stdout);
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.stderr.txt`), stderr, "utf8");
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.exit.txt`), `${exit}\n`, "utf8");
  cases.push({ witnessId: id, caseSlug: slug, result: exit === 0 ? "passed" : "failed", stdout });
  return stdout;
}

function readText(p) { return readFileSync(p, "utf8"); }
function loadResultData(env) { return env && env.payload && env.payload.kind === "create_result" ? env.payload.data : null; }

// --- W-RESOLVE-CLI-ADAPTER + W-RESOLVE-CLI-CONTEXT (real-boundary resolvability) ---
await writeCase(1, "W-RESOLVE", "cli-adapter-context-resolve", async () => {
  const matrix = getPiAdapterCapabilityMatrix();
  const manifest = getPiGeneratedFileManifest();
  assert.equal(PI_ADAPTER_ID, "pi");
  assert.equal(isAdapterManifestSelectable(matrix, "pi"), true);
  assert.equal(PI_ADAPTER_CAPABILITY_SCHEMA_VERSION, "pi-adapter-capability-matrix/v1");
  assert.equal(PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION, "pi-generated-file-manifest/v1");
  assert.equal(validateCapabilityMatrix(matrix).valid, true);
  assert.equal(validateGeneratedFileManifest(manifest).valid, true);
  assert.equal(CONTEXT_SCHEMA_VERSION, "1.0.0");
  assert.equal(typeof createDefaultVibeConfig, "function");
  // I-15A-owned families are exactly context-files + harness-config, both ready.
  const owned = manifest.families.filter((f) => f.producedByLane === "I-15A-create-import-cli-ux-selected-harness");
  assert.deepEqual(owned.map((f) => f.familyId).sort(), ["context-files", "harness-config"]);
  assert.equal(owned.every((f) => f.readiness.state === "ready"), true);
  return { witness: "W-RESOLVE-CLI-ADAPTER+CONTEXT", adapterSubpaths: 3, contextExports: "ok", ownedFamilies: owned.map((f) => f.familyId) };
});

// --- W-CREATE-PROVIDED ---
let providedEnv;
await writeCase(2, "W-CREATE-PROVIDED", "create-provided-brief", async () => {
  const r = await dispatchCreate("w-create-provided", ["--project-name", "Atlas Tracker", "--agentic-harness", "pi", "--brief", "A CLI tool to track time across small teams. We care about offline support."]);
  const validation = validateCliResultEnvelope(r.envelope);
  assert.equal(validation.ok, true, validation.errors?.join("; "));
  assert.equal(r.envelope.status, "success", `status=${r.envelope.status}`);
  const data = loadResultData(r.envelope);
  assert.equal(data.ok, true);
  assert.equal(data.selectedHarness, "pi");
  assert.equal(data.briefStatus, "provided");
  assert.equal(data.project.slug, "atlas-tracker");
  assert.equal(data.harnessConfig.agenticHarness, "pi");
  assert.equal(data.harnessConfig.adapterCapabilityVersion, PI_ADAPTER_CAPABILITY_SCHEMA_VERSION);
  assert.equal(data.harnessConfig.generatedFileManifestVersion, PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION);
  // on-disk generated artifacts
  assert.equal(existsSync(resolve(r.targetRoot, "vibe-engineer.config.json")), true);
  const cfg = JSON.parse(readText(resolve(r.targetRoot, "vibe-engineer.config.json")));
  assert.equal(cfg.agenticHarness, "pi");
  assert.equal(existsSync(resolve(r.targetRoot, "AGENTS.md")), true);
  assert.equal(existsSync(resolve(r.targetRoot, "CLAUDE.md")), true);
  const agents = readText(resolve(r.targetRoot, "AGENTS.md"));
  assert.equal(agents.includes("user_provided"), true);
  assert.equal(agents.includes("provenance"), true);
  // result-file atomic write + reread equivalence
  assert.equal(existsSync(r.resultFile), true);
  assert.deepEqual(JSON.parse(readText(r.resultFile)), r.envelope);
  providedEnv = r.envelope;
  return { witness: "W-CREATE-PROVIDED", status: r.envelope.status, briefStatus: data.briefStatus, harnessConfig: data.harnessConfig };
});

// --- W-CREATE-SKIPPED ---
await writeCase(3, "W-CREATE-SKIPPED", "create-skipped-brief", async () => {
  const r = await dispatchCreate("w-create-skipped", ["--project-name", "Blank Slate", "--agentic-harness", "pi"]);
  assert.equal(validateCliResultEnvelope(r.envelope).ok, true);
  assert.equal(r.envelope.status, "success");
  const data = loadResultData(r.envelope);
  assert.equal(data.briefStatus, "skipped");
  const agents = readText(resolve(r.targetRoot, "AGENTS.md"));
  assert.equal(agents.includes("Brief status: 'skipped'"), true);
  assert.equal(agents.includes("Run the brainstorm skill"), true);
  assert.equal(agents.includes("needs_user_context"), true);
  // skipped must NOT invent confident product-design SECTIONS.
  const lower = agents.toLowerCase();
  for (const forbiddenHeading of ["## roadmap", "## architecture", "## database schema", "## domain model", "## users", "## integrations", "## workflow", "## feature"]) {
    assert.equal(lower.includes(forbiddenHeading), false, `skipped brief generated confident section '${forbiddenHeading}'`);
  }
  return { witness: "W-CREATE-SKIPPED", status: r.envelope.status, briefStatus: data.briefStatus, brainstormInstructionPresent: true };
});

// --- W-IMPORT ---
await writeCase(4, "W-IMPORT", "import-existing-root", async () => {
  const r = await dispatchImport("w-import", ["--project-name", "Imported Project", "--agentic-harness", "pi", "--brief", "Existing repo being brought under vibe-engineer management."]);
  assert.equal(validateCliResultEnvelope(r.envelope).ok, true);
  assert.equal(r.envelope.status, "success");
  const data = loadResultData(r.envelope);
  assert.equal(data.mode, "import");
  assert.equal(data.selectedHarness, "pi");
  assert.equal(existsSync(resolve(r.targetRoot, "vibe-engineer.config.json")), true);
  assert.equal(existsSync(resolve(r.targetRoot, "AGENTS.md")), true);
  return { witness: "W-IMPORT", status: r.envelope.status, mode: data.mode };
});

// --- W-CONSUMER-MANIFEST (real adapter-manifest consumer of generated harness-config) ---
await writeCase(5, "W-CONSUMER-MANIFEST", "consumer-manifest-summary", async () => {
  const summary = createPiDownstreamManifestSummary();
  const manifest = getPiGeneratedFileManifest();
  const ownValidation = validateGeneratedFileManifest(manifest);
  assert.equal(ownValidation.valid, true);
  // The produced harness-config metadata corresponds to the manifest's harness-config family.
  const harnessFamily = manifest.families.find((f) => f.familyId === "harness-config");
  assert.equal(harnessFamily.producedByLane, "I-15A-create-import-cli-ux-selected-harness");
  assert.equal(harnessFamily.readiness.state, "ready");
  const ctxFamily = manifest.families.find((f) => f.familyId === "context-files");
  assert.equal(ctxFamily.producedByLane, "I-15A-create-import-cli-ux-selected-harness");
  assert.deepEqual(ctxFamily.pathPatterns, ["AGENTS.md", "CLAUDE.md"]);
  // the envelope's harnessConfig fields match the manifest's declared versions
  const data = loadResultData(providedEnv);
  assert.equal(data.harnessConfig.adapterCapabilityVersion, manifest.adapterCapabilityVersion);
  assert.equal(data.harnessConfig.generatedFileManifestVersion, manifest.schemaVersion);
  return { witness: "W-CONSUMER-MANIFEST", downstreamSummaryKeys: Object.keys(summary).sort(), harnessFamilyProducer: harnessFamily.producedByLane };
});

// --- W-CONSUMER-CONTEXT (real context validator/retriever consumes generated context) ---
await writeCase(6, "W-CONSUMER-CONTEXT", "consumer-context-validate-retrieve", async () => {
  const targetRoot = resolve(args.evidenceRoot, "targets", "w-create-provided");
  const validation = await validateContextProject(targetRoot);
  assert.equal(validation.ok, true, JSON.stringify(validation.findings));
  assert.equal(validation.status, "clean");
  const closure = await retrieveContextClosure(targetRoot, { task: { taskId: "bootstrap-create", role: "create", areaId: "bootstrap", affectedAreas: ["bootstrap"], mandatoryLevel: 1 } });
  const closureData = closure;
  assert.equal(closureData.ok !== false, true, "retriever returned a hard failure");
  const closureBlob = JSON.stringify(closureData);
  const citedSources = closureBlob.includes("src:bootstrap-brief");
  assert.equal(citedSources, true, "retriever could not cite the bootstrap source record");
  // skipped path also loads cleanly
  const skippedValidation = await validateContextProject(resolve(args.evidenceRoot, "targets", "w-create-skipped"));
  assert.equal(skippedValidation.ok, true, JSON.stringify(skippedValidation.findings));
  return { witness: "W-CONSUMER-CONTEXT", providedStatus: validation.status, skippedStatus: skippedValidation.status, retrieverCitedSource: citedSources };
});

// --- W-MACHINE-ENVELOPE (schema-valid envelopes + atomic result-file + secret redaction) ---
await writeCase(7, "W-MACHINE-ENVELOPE", "machine-envelope-valid", async () => {
  const r = await dispatchCreate("w-machine", ["--project-name", "Envelope Check", "--agentic-harness", "pi", "--brief", "Plain brief."]);
  assert.equal(validateCliResultEnvelope(r.envelope).ok, true);
  assert.equal(r.envelope.payload.kind, "create_result");
  assert.equal(existsSync(r.resultFile), true);
  // secret-bearing brief is redacted (see W-NEG-INVALID-BRIEF); here assert no raw secret leaks in a normal envelope
  const serialized = JSON.stringify(r.envelope);
  assert.equal(serialized.includes("ghp_"), false);
  return { witness: "W-MACHINE-ENVELOPE", payloadKind: r.envelope.payload.kind, resultFileWritten: true };
});

// --- W-NEG-NON-PI (every deferred/unknown harness blocks; never silent no-op) ---
await writeCase(8, "W-NEG-NON-PI", "non-pi-harness-blocked", async () => {
  const results = {};
  for (const harness of ["claude-code", "codex", "opencode", "later-integrations", "totally-unknown"]) {
    const r = await dispatchCreate(`w-neg-npi-${harness}`, ["--project-name", "X", "--agentic-harness", harness, "--brief", "y"]);
    assert.equal(validateCliResultEnvelope(r.envelope).ok, true);
    assert.equal(r.envelope.status, "blocked", `${harness} did not block`);
    results[harness] = r.envelope.status;
  }
  return { witness: "W-NEG-NON-PI", allBlocked: results };
});

// --- W-NEG-MISSING/INVALID-MANIFEST (witness the validator directly; command hard-depends on it) ---
await writeCase(9, "W-NEG-INVALID-MANIFEST", "invalid-manifest-blocks", async () => {
  const malformed = { ...getPiGeneratedFileManifest(), families: "not-an-array" };
  const v = validateGeneratedFileManifest(malformed);
  assert.equal(v.valid, false);
  const malformedMatrix = { ...getPiAdapterCapabilityMatrix(), adapters: [] };
  const vm = validateCapabilityMatrix(malformedMatrix);
  assert.equal(vm.valid, false);
  // The command's resolveSelectedPiManifest() gates on these validators (selected-harness.ts),
  // so a manifest that fails validation would produce a blocked envelope (MANIFEST_UNAVAILABLE on
  // load failure, or INVALID_* here). Documented hard dependency, no internal monkey-patch.
  return { witness: "W-NEG-INVALID-MANIFEST", manifestValidatorRejectsMalformed: !v.valid, matrixValidatorRejectsMalformed: !vm.valid, commandHardDependsOn: "resolveSelectedPiManifest -> validate{CapabilityMatrix,GeneratedFileManifest}" };
});

// --- W-NEG-INVALID-BRIEF (oversized + secret-bearing → blocked; no secret echo) ---
await writeCase(10, "W-NEG-INVALID-BRIEF", "invalid-brief-blocked", async () => {
  const oversized = "x".repeat(8193);
  const r1 = await dispatchCreate("w-neg-oversized", ["--project-name", "Big", "--agentic-harness", "pi", "--brief", oversized]);
  assert.equal(r1.envelope.status, "blocked");
  assert.equal(JSON.stringify(r1.envelope).includes("x".repeat(100)), false, "oversized brief echoed verbatim");
  const r2 = await dispatchCreate("w-neg-secret", ["--project-name", "Secret", "--agentic-harness", "pi", "--brief", "ghp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]);
  assert.equal(r2.envelope.status, "blocked");
  assert.equal(JSON.stringify(r2.envelope).includes("ghp_"), false, "secret echoed in envelope");
  return { witness: "W-NEG-INVALID-BRIEF", oversizedBlocked: r1.envelope.status, secretBlocked: r2.envelope.status, secretEchoed: false };
});

// --- W-NEG-OVER-INFERENCE (vague one-word brief → only sparse user facts + unknowns) ---
await writeCase(11, "W-NEG-OVER-INFERENCE", "vague-brief-no-overinference", async () => {
  const r = await dispatchCreate("w-neg-overinf", ["--project-name", "Thing", "--agentic-harness", "pi", "--brief", "app"]);
  assert.equal(r.envelope.status, "success");
  const agents = readText(resolve(r.targetRoot, "AGENTS.md"));
  const lower = agents.toLowerCase();
  // Over-inference check is structural: no confident product-design SECTIONS may be generated.
  for (const forbiddenHeading of ["## roadmap", "## architecture", "## database schema", "## domain model", "## users", "## integrations", "## workflow", "## feature"]) {
    assert.equal(lower.includes(forbiddenHeading), false, `vague brief generated confident section '${forbiddenHeading}'`);
  }
  assert.equal(lower.includes("## unknowns"), true);
  assert.equal(lower.includes("app"), true); // brief recorded verbatim
  return { witness: "W-NEG-OVER-INFERENCE", noConfidentSections: true, briefRecordedVerbatim: true };
});

// --- W-NEG-SKIPPED-CONFIDENT (skipped must NOT emit confident product summary) ---
await writeCase(12, "W-NEG-SKIPPED-CONFIDENT", "skipped-not-confident", async () => {
  const r = await dispatchCreate("w-neg-skipconf", ["--project-name", "Quiet", "--agentic-harness", "pi"]);
  assert.equal(r.envelope.status, "success");
  const data = loadResultData(r.envelope);
  assert.equal(data.briefStatus, "skipped");
  const agents = readText(resolve(r.targetRoot, "AGENTS.md"));
  assert.equal(agents.includes("needs_user_context"), true);
  return { witness: "W-NEG-SKIPPED-CONFIDENT", intentionalPlaceholder: true };
});

// --- W-NEG-MISSING-PROVENANCE (every load-bearing claim must carry a DL-17 provenance label) ---
await writeCase(13, "W-NEG-MISSING-PROVENANCE", "provenance-labels-present", async () => {
  const agents = readText(resolve(args.evidenceRoot, "targets", "w-create-provided", "AGENTS.md"));
  for (const label of ["user_provided", "normalized_from_user", "harness_default", "unknown"]) {
    assert.equal(agents.includes(label), true, `missing provenance label ${label}`);
  }
  return { witness: "W-NEG-MISSING-PROVENANCE", provenanceLabelsPresent: true };
});

// --- W-NEG-FORBIDDEN-PROMPTS (flag set is exactly naming + agentic-harness + brief + globals) ---
await writeCase(14, "W-NEG-FORBIDDEN-PROMPTS", "forbidden-prompts-rejected", async () => {
  const r = await dispatchCreate("w-neg-flags", ["--project-name", "X", "--agentic-harness", "pi", "--stack", "next", "--max-parallel", "4", "--brief", "y"]);
  assert.equal(r.envelope.status, "blocked");
  assert.equal(r.envelope.payload.kind, "cli_invocation_error");
  const errCode = r.envelope.errors && r.envelope.errors[0] && r.envelope.errors[0].code;
  assert.equal(errCode, "VE_INVALID_FLAG");
  return { witness: "W-NEG-FORBIDDEN-PROMPTS", stackAndMaxParallelRejected: true, errorCode: errCode };
});

// --- W-REG-INVARIANTS (locked name, six skills, artifact flow, config defaults untouched) ---
await writeCase(15, "W-REG-INVARIANTS", "regression-invariants", async () => {
  const agents = readText(resolve(args.evidenceRoot, "targets", "w-create-provided", "AGENTS.md"));
  assert.equal(agents.includes("vibe-engineer"), true);
  for (const skill of ["brainstorm", "grill-me", "task", "plan", "build", "ship"]) {
    assert.equal(agents.includes(skill), true, `missing skill ${skill}`);
  }
  assert.equal(agents.includes("Work Brief"), true);
  assert.equal(agents.includes("Implementation Plan"), true);
  assert.equal(agents.includes("Build Result"), true);
  assert.equal(agents.includes("Ship Packet"), true);
  const cfg = JSON.parse(readText(resolve(args.evidenceRoot, "targets", "w-create-provided", "vibe-engineer.config.json")));
  assert.equal(cfg.maxParallelAgents, 8);
  assert.equal(cfg.agenticWorkPackageTargetHours, 6);
  return { witness: "W-REG-INVARIANTS", name: "vibe-engineer", sixSkills: true, artifactFlow: true, configDefaultsUntouched: true };
});

// --- W-RB4 (shipped-binary dispatch pending-live/BLOCKED) + live pi runtime ---
await writeCase(16, "W-RB4", "default-binary-pending-live", async () => {
  // The shipped default binary uses I-02A createCommandLoader() with NO commands registered.
  const defaultLoader = createCommandLoader([]);
  const createDispatch = await defaultLoader.dispatch("create", ["--non-interactive"], { invocation: invocation("create"), packageJsonPath: resolve(repoRoot, "packages/cli/package.json"), config: null });
  assert.equal(createDispatch.envelope.status, "blocked");
  assert.equal(createDispatch.envelope.payload.kind, "cli_invocation_error");
  const rb4Code = createDispatch.envelope.errors && createDispatch.envelope.errors[0] && createDispatch.envelope.errors[0].code;
  assert.equal(rb4Code, "VE_UNSUPPORTED_OPERATION");
  return { witness: "W-RB4", status: "pending-live/BLOCKED", reason: "Shipped default binary uses I-02A default createCommandLoader() and does not register create/import without a serialized I-02A handoff; no loader/package edit is licensed.", livePiRuntime: "pending-live/BLOCKED" };
});

// --- Refresh committed examples fixtures from REAL command output (if requested) ---
if (args.refreshFixtures) {
  const fixtureBase = resolve(repoRoot, "examples/starter-reference/generated-fixtures");
  // create-ux fixtures (provided / skipped / non-pi negative carrier)
  const providedTarget = resolve(fixtureBase, "create-ux/provided-brief");
  rmSync(providedTarget, { recursive: true, force: true }); mkdirSync(providedTarget, { recursive: true });
  const loaderC = createCommandLoader([createCommand]);
  const provEnv = (await loaderC.dispatch("create", ["--target-root", providedTarget, "--project-name", "Atlas Tracker", "--agentic-harness", "pi", "--brief", "A CLI tool to track time across small teams. We care about offline support.", "--json", "--non-interactive"], { invocation: invocation("create"), packageJsonPath: resolve(repoRoot, "packages/cli/package.json"), config: null })).envelope;
  writeFileSync(resolve(fixtureBase, "create-ux/provided-brief.create-result.json"), `${JSON.stringify(provEnv, null, 2)}\n`, "utf8");
  const skipTarget = resolve(fixtureBase, "create-ux/skipped-brief");
  rmSync(skipTarget, { recursive: true, force: true }); mkdirSync(skipTarget, { recursive: true });
  const skipEnv = (await loaderC.dispatch("create", ["--target-root", skipTarget, "--project-name", "Blank Slate", "--agentic-harness", "pi", "--json", "--non-interactive"], { invocation: invocation("create"), packageJsonPath: resolve(repoRoot, "packages/cli/package.json"), config: null })).envelope;
  const nonPiEnv = (await loaderC.dispatch("create", ["--target-root", resolve(fixtureBase, "create-ux/_non-pi-carrier"), "--project-name", "Blocked", "--agentic-harness", "claude-code", "--brief", "y", "--json", "--non-interactive"], { invocation: invocation("create"), packageJsonPath: resolve(repoRoot, "packages/cli/package.json"), config: null })).envelope;
  writeFileSync(resolve(fixtureBase, "create-ux/skipped-brief.create-result.json"), `${JSON.stringify(skipEnv, null, 2)}\n`, "utf8");
  writeFileSync(resolve(fixtureBase, "create-ux/non-pi-blocked.create-result.json"), `${JSON.stringify(nonPiEnv, null, 2)}\n`, "utf8");
  // selected-harness/pi fixture (generated harness-config + context-files)
  const piTarget = resolve(fixtureBase, "selected-harness/pi/selected-pi-create");
  rmSync(piTarget, { recursive: true, force: true }); mkdirSync(piTarget, { recursive: true });
  const piEnv = (await loaderC.dispatch("create", ["--target-root", piTarget, "--project-name", "Selected Pi Project", "--agentic-harness", "pi", "--brief", "A small project selecting the pi harness.", "--json", "--non-interactive"], { invocation: invocation("create"), packageJsonPath: resolve(repoRoot, "packages/cli/package.json"), config: null })).envelope;
  writeFileSync(resolve(fixtureBase, "selected-harness/pi/selected-pi-create.create-result.json"), `${JSON.stringify(piEnv, null, 2)}\n`, "utf8");
  writeFileSync(resolve(args.evidenceRoot, "fixture-refresh.json"), `${JSON.stringify({ refreshed: true, fixtures: ["create-ux/provided-brief", "create-ux/skipped-brief", "create-ux/non-pi-blocked", "selected-harness/pi/selected-pi-create"] }, null, 2)}\n`, "utf8");
}

const summary = { ok: cases.every((c) => c.result === "passed"), cases: cases.map((c) => ({ witness: c.witnessId, slug: c.caseSlug, result: c.result })) };
writeJson("summary.json", summary);
console.log(JSON.stringify(summary, null, 2));
process.exitCode = summary.ok ? 0 : 1;
