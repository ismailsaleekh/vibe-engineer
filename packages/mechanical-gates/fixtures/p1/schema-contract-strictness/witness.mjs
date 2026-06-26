import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const mechanicalPackageRoot = join(fixtureRoot, "..", "..", "..");
const repoRoot = join(mechanicalPackageRoot, "..", "..");
const workRoot = join(repoRoot, ".vibe", "work", "I-11-contract-strictness-minimal-real-fixture");
const typecheckOnly = process.argv.includes("--typecheck");
const evidenceRoot = join(workRoot, typecheckOnly ? "typecheck-evidence" : "witness-evidence");
const compiledRoot = join(workRoot, "compiled-witness");

function assert(condition, message, evidence = {}) {
  if (!condition) {
    const error = new Error(message);
    error.evidence = evidence;
    throw error;
  }
}

function ensureDirectory(pathValue) {
  mkdirSync(pathValue, { recursive: true });
}

function runCommand(label, command, args, options = {}) {
  const completed = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", ...options });
  ensureDirectory(evidenceRoot);
  const safeLabel = label.replace(/[^a-z0-9_.-]+/gi, "-").toLowerCase();
  writeFileSync(join(evidenceRoot, `${safeLabel}.log`), JSON.stringify({ command, args, cwd: options.cwd ?? repoRoot, status: completed.status, stdout: completed.stdout, stderr: completed.stderr }, null, 2));
  assert(completed.status === 0, `${label} failed`, { status: completed.status, stdout: completed.stdout, stderr: completed.stderr });
  return completed;
}

function repoPath(relativePath) {
  return join(repoRoot, relativePath);
}

function linkPackageNodeModules(compiledDirectory) {
  const linkPath = join(compiledDirectory, "node_modules");
  if (!existsSync(linkPath)) symlinkSync(repoPath("packages/contracts/node_modules"), linkPath, "dir");
}

function compileContracts() {
  rmSync(join(compiledRoot, "contracts"), { recursive: true, force: true });
  runCommand("compile contracts", join(repoRoot, "node_modules", ".bin", "tsc"), [
    "--project", "packages/contracts/tsconfig.json",
    "--noEmit", "false",
    "--outDir", join(compiledRoot, "contracts"),
    "--declaration", "false",
    "--sourceMap", "false"
  ]);
  linkPackageNodeModules(join(compiledRoot, "contracts"));
}

function compileValidator() {
  rmSync(join(compiledRoot, "mechanical"), { recursive: true, force: true });
  runCommand("compile p1 validator", "pnpm", [
    "--filter", "@vibe-engineer/contracts", "exec", "tsc",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict",
    "--noImplicitAny",
    "--strictNullChecks",
    "--exactOptionalPropertyTypes",
    "--noUncheckedIndexedAccess",
    "--noImplicitReturns",
    "--noUnusedLocals",
    "--noUnusedParameters",
    "--forceConsistentCasingInFileNames",
    "--isolatedModules",
    "--verbatimModuleSyntax",
    "--lib", "ES2022,DOM",
    "--types", "node",
    "--outDir", join(compiledRoot, "mechanical"),
    "--rootDir", repoPath("packages/mechanical-gates/src/p1/schema-contract-strictness"),
    repoPath("packages/mechanical-gates/src/p1/schema-contract-strictness/index.ts"),
    repoPath("packages/mechanical-gates/src/p1/schema-contract-strictness/validate-schema-contract-strictness.ts")
  ]);
  linkPackageNodeModules(join(compiledRoot, "mechanical"));
}

function runTypechecks() {
  runCommand("contracts typecheck", join(repoRoot, "node_modules", ".bin", "tsc"), ["--noEmit", "--project", "packages/contracts/tsconfig.json"]);
  runCommand("p1 validator typecheck", "pnpm", [
    "--filter", "@vibe-engineer/contracts", "exec", "tsc",
    "--noEmit",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict",
    "--noImplicitAny",
    "--strictNullChecks",
    "--exactOptionalPropertyTypes",
    "--noUncheckedIndexedAccess",
    "--noImplicitReturns",
    "--noUnusedLocals",
    "--noUnusedParameters",
    "--forceConsistentCasingInFileNames",
    "--isolatedModules",
    "--verbatimModuleSyntax",
    "--lib", "ES2022,DOM",
    "--types", "node",
    repoPath("packages/mechanical-gates/src/p1/schema-contract-strictness/index.ts"),
    repoPath("packages/mechanical-gates/src/p1/schema-contract-strictness/validate-schema-contract-strictness.ts")
  ]);
  runCommand("witness syntax check", process.execPath, ["--check", fileURLToPath(import.meta.url)], { cwd: repoRoot });
}

function regenerateClient() {
  const source = readFileSync(repoPath("packages/contracts/src/generation/generate-reference-flow-client.ts"), "utf8");
  const outputPath = join(workRoot, "generated-tools", "generate-reference-flow-client.mjs");
  ensureDirectory(dirname(outputPath));
  const transpile = spawnSync(process.execPath, ["--input-type=module", "-"], {
    cwd: repoRoot,
    encoding: "utf8",
    input: `import ts from 'typescript'; const source = ${JSON.stringify(source)}; process.stdout.write(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, moduleResolution: ts.ModuleResolutionKind.NodeNext, verbatimModuleSyntax: true } }).outputText);`
  });
  assert(transpile.status === 0, "generator transpilation failed", { stderr: transpile.stderr });
  writeFileSync(outputPath, transpile.stdout);
  runCommand("regenerate generated client", process.execPath, [outputPath, repoRoot]);
}

async function loadValidator() {
  return import(pathToFileURL(join(compiledRoot, "mechanical", "index.js")).href);
}

async function loadRealBoundary() {
  return import(pathToFileURL(join(compiledRoot, "contracts", "witness", "reference-flow.real-boundary.js")).href);
}

function copyProductContractCase(caseRoot) {
  const manifestPath = repoPath("packages/contracts/schema-contract-strictness.manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const files = new Set([manifest.canonicalContractFile, manifest.generatedClientFile, manifest.providerFile, manifest.consumerFile, manifest.realBoundaryTestFile, ...manifest.sourceFiles]);
  for (const file of files) {
    const destination = join(caseRoot, file);
    ensureDirectory(dirname(destination));
    writeFileSync(destination, readFileSync(repoPath(file), "utf8"));
  }
  writeFileSync(join(caseRoot, "schema-contract-strictness.manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

function mutateFile(caseRoot, relativePath, mutate) {
  const absolute = join(caseRoot, relativePath);
  writeFileSync(absolute, mutate(readFileSync(absolute, "utf8")));
}

function createNegativeCase(caseName, mutate) {
  const caseRoot = join(evidenceRoot, "negative-cases", caseName);
  rmSync(caseRoot, { recursive: true, force: true });
  ensureDirectory(caseRoot);
  const manifest = copyProductContractCase(caseRoot);
  mutate(caseRoot, manifest);
  return caseRoot;
}

async function expectFail(validateSchemaContractStrictness, label, caseRoot, expectedRuleId, options = {}) {
  const result = await validateSchemaContractStrictness(caseRoot, options);
  assert(result.family === "p1.schema-contract-strictness", `${label} family mismatch`, result);
  assert(result.ok === false, `${label} expected blocking failure`, result);
  assert(result.findings.some((entry) => entry.ruleId === expectedRuleId), `${label} missing ${expectedRuleId}`, { findings: result.findings });
  return result;
}

async function runFullWitness() {
  ensureDirectory(evidenceRoot);
  regenerateClient();
  compileContracts();
  compileValidator();
  const { validateSchemaContractStrictness } = await loadValidator();
  const realBoundary = await loadRealBoundary();

  const realBoundaryResult = await realBoundary.runReferenceFlowRealBoundaryWitness();
  assert(Object.values(realBoundaryResult).every((value) => value === true), "real provider/client/consumer boundary witness failed", realBoundaryResult);

  const positiveResult = await validateSchemaContractStrictness(repoRoot, { manifestPath: "packages/contracts/schema-contract-strictness.manifest.json" });
  assert(positiveResult.family === "p1.schema-contract-strictness", "positive result family mismatch", positiveResult);
  assert(positiveResult.ok === true && positiveResult.findings.length === 0, "valid product contract should pass P1 strictness", positiveResult);

  const negativeResults = [];
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "duplicate DTO", createNegativeCase("duplicate-dto", (root, manifest) => {
    mutateFile(root, manifest.providerFile, (text) => `${text}\nexport interface LocalPayload { value: string }\n`);
  }), "named-runtime-schema-boundary.duplicate-dto-schema-source"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "bare contract shape", createNegativeCase("bare-contract-shape", (root, manifest) => {
    mutateFile(root, manifest.canonicalContractFile, (text) => text.replace("body: ReferenceRequestBodySchema", "body: z.object({ label: z.string() })"));
  }), "named-runtime-schema-boundary.bare-contract-shape"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "broad record", createNegativeCase("broad-record", (root, manifest) => {
    mutateFile(root, manifest.consumerFile, (text) => `${text}\ntype BroadDomainModel = Record<string, unknown>;\n`);
  }), "named-runtime-schema-boundary.broad-record-domain-model"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "json parse", createNegativeCase("json-parse", (root, manifest) => {
    mutateFile(root, manifest.providerFile, (text) => `${text}\nexport function unsafeBoundary(raw: string): unknown { return JSON.parse(raw); }\n`);
  }), "named-runtime-schema-boundary.unvalidated-json-parse"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "unvalidated provider payload", createNegativeCase("unvalidated-provider-payload", (root, manifest) => {
    mutateFile(root, manifest.providerFile, (text) => text.replace("const body = ReferenceRequestBodySchema.parse(boundaryRequest.body);", "const body = boundaryRequest.body as ReferenceRequestBody;"));
  }), "named-runtime-schema-boundary.unvalidated-boundary-payload"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "stale client", createNegativeCase("stale-client", (root, manifest) => {
    mutateFile(root, manifest.generatedClientFile, (text) => text.replace(/sourceSha256: "[a-f0-9]+"/, "sourceSha256: \"0000000000000000000000000000000000000000000000000000000000000000\""));
  }), "named-runtime-schema-boundary.generated-client-stale"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "parser-only", createNegativeCase("parser-only-test", (root, manifest) => {
    const parserOnlyFile = "packages/contracts/src/witness/parser-only.contract-test.ts";
    writeFileSync(join(root, parserOnlyFile), "import { ReferenceRequestBodySchema } from '../contracts/reference-flow.contract.js';\nexport function parserOnly(): boolean { return ReferenceRequestBodySchema.safeParse({ label: 'Alpha', sequence: 1, absence: { kind: 'not-provided', reason: 'parser' } }).success; }\n");
    manifest.realBoundaryTestFile = parserOnlyFile;
    manifest.sourceFiles.push(parserOnlyFile);
    writeFileSync(join(root, "schema-contract-strictness.manifest.json"), JSON.stringify(manifest, null, 2));
  }), "named-runtime-schema-boundary.parser-self-agreement-only-test"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "malformed manifest", createNegativeCase("malformed-manifest", () => {
    writeFileSync(join(evidenceRoot, "negative-cases", "malformed-manifest", "schema-contract-strictness.manifest.json"), "{ not-json");
  }), "named-runtime-schema-boundary.manifest-unreadable"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "regex-only proof", createNegativeCase("regex-only-proof", (root) => {
    const manifestPath = join(root, "schema-contract-strictness.manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.proofMode = "regex-narrative";
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }), "named-runtime-schema-boundary.regex-only-proof-rejected"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "path traversal", createNegativeCase("path-traversal", (root) => {
    const manifestPath = join(root, "schema-contract-strictness.manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.sourceFiles.push("../outside.ts");
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }), "named-runtime-schema-boundary.path-traversal"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "missing manifest", evidenceRoot, "named-runtime-schema-boundary.manifest-unreadable", { manifestPath: "missing-strictness-manifest.json" }));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "unknown option", repoRoot, "named-runtime-schema-boundary.unknown-validator-option", { manifestPath: "packages/contracts/schema-contract-strictness.manifest.json", unexpectedOption: true }));

  const evidence = {
    ok: true,
    family: "p1.schema-contract-strictness",
    realBoundaryResult,
    positive: { ok: positiveResult.ok, evidence: positiveResult.evidence },
    negativeRuleIds: negativeResults.flatMap((entry) => entry.findings.map((finding) => finding.ruleId)),
    generatedClientInitial: JSON.parse(readFileSync(join(workRoot, "generated-client-initial.json"), "utf8")),
    compiledRoot: relative(repoRoot, compiledRoot),
    negativeCaseRoot: relative(repoRoot, join(evidenceRoot, "negative-cases"))
  };
  writeFileSync(join(evidenceRoot, "schema-contract-strictness-witness.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
}

if (typecheckOnly) {
  ensureDirectory(evidenceRoot);
  runTypechecks();
  console.log(JSON.stringify({ ok: true, mode: "typecheck", evidenceRoot: relative(repoRoot, evidenceRoot) }));
} else {
  await runFullWitness();
}
