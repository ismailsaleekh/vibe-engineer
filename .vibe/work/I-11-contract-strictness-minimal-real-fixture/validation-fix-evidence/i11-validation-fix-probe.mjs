import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const workRoot = join(repoRoot, ".vibe", "work", "I-11-contract-strictness-minimal-real-fixture");
const evidenceRoot = join(workRoot, "validation-fix-evidence");
const commandLogRoot = join(workRoot, "validation-fix-command-log");
const compiledRoot = join(evidenceRoot, "compiled-validation-fix-probe");
const negativeRoot = join(evidenceRoot, "negative-cases");

function ensureDirectory(pathValue) {
  mkdirSync(pathValue, { recursive: true });
}

function assert(condition, message, evidence = {}) {
  if (!condition) {
    const error = new Error(message);
    error.evidence = evidence;
    throw error;
  }
}

function runLogged(label, command, args, options = {}) {
  ensureDirectory(commandLogRoot);
  const completed = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", ...options });
  const safeLabel = label.replace(/[^a-z0-9_.-]+/gi, "-").toLowerCase();
  writeFileSync(join(commandLogRoot, `${safeLabel}.log`), JSON.stringify({ command, args, cwd: options.cwd ?? repoRoot, status: completed.status, stdout: completed.stdout, stderr: completed.stderr }, null, 2));
  assert(completed.status === 0, `${label} failed`, { status: completed.status, stdout: completed.stdout, stderr: completed.stderr });
  return completed;
}

function linkContractNodeModules(compiledDirectory) {
  const linkPath = join(compiledDirectory, "node_modules");
  if (!existsSync(linkPath)) symlinkSync(join(repoRoot, "packages", "contracts", "node_modules"), linkPath, "dir");
}

function compileContractsForProbe() {
  const outDir = join(compiledRoot, "contracts");
  rmSync(outDir, { recursive: true, force: true });
  runLogged("005-compile-contracts-validation-fix-probe", join(repoRoot, "node_modules", ".bin", "tsc"), [
    "--project", "packages/contracts/tsconfig.json",
    "--noEmit", "false",
    "--outDir", outDir,
    "--declaration", "false",
    "--sourceMap", "false"
  ]);
  linkContractNodeModules(outDir);
}

function compileValidatorForProbe() {
  const outDir = join(compiledRoot, "mechanical");
  rmSync(outDir, { recursive: true, force: true });
  runLogged("006-compile-p1-validator-validation-fix-probe", "pnpm", [
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
    "--outDir", outDir,
    "--rootDir", join(repoRoot, "packages/mechanical-gates/src/p1/schema-contract-strictness"),
    join(repoRoot, "packages/mechanical-gates/src/p1/schema-contract-strictness/index.ts"),
    join(repoRoot, "packages/mechanical-gates/src/p1/schema-contract-strictness/validate-schema-contract-strictness.ts")
  ]);
  linkContractNodeModules(outDir);
}

function readProduct(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function copyProductContractCase(caseRoot) {
  const manifest = JSON.parse(readProduct("packages/contracts/schema-contract-strictness.manifest.json"));
  const files = new Set([manifest.canonicalContractFile, manifest.generatedClientFile, manifest.providerFile, manifest.consumerFile, manifest.realBoundaryTestFile, ...manifest.sourceFiles]);
  for (const file of files) {
    const destination = join(caseRoot, file);
    ensureDirectory(dirname(destination));
    writeFileSync(destination, readProduct(file));
  }
  writeFileSync(join(caseRoot, "schema-contract-strictness.manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

function mutateFile(caseRoot, relativePath, mutate) {
  const absolute = join(caseRoot, relativePath);
  writeFileSync(absolute, mutate(readFileSync(absolute, "utf8")));
}

function createNegativeCase(caseName, mutate) {
  const caseRoot = join(negativeRoot, caseName);
  rmSync(caseRoot, { recursive: true, force: true });
  ensureDirectory(caseRoot);
  const manifest = copyProductContractCase(caseRoot);
  mutate(caseRoot, manifest);
  return caseRoot;
}

async function expectFail(validateSchemaContractStrictness, label, caseRoot, expectedRuleId, options = {}) {
  const result = await validateSchemaContractStrictness(caseRoot, options);
  assert(result.family === "p1.schema-contract-strictness", `${label} family mismatch`, result);
  assert(result.ok === false, `${label} expected fail-closed finding`, result);
  assert(result.findings.some((finding) => finding.ruleId === expectedRuleId && finding.blocking === true), `${label} missing ${expectedRuleId}`, { findings: result.findings });
  return { label, expectedRuleId, findingRuleIds: result.findings.map((finding) => finding.ruleId) };
}

function extractGeneratedProvenance() {
  const contractText = readProduct("packages/contracts/src/contracts/reference-flow.contract.ts");
  const generatedText = readProduct("packages/contracts/src/generated/reference-flow-client.ts");
  const sourceSha256 = generatedText.match(/sourceSha256: "([a-f0-9]{64})"/)?.[1] ?? null;
  const canonicalContractPath = generatedText.match(/canonicalContractPath: "([^"]+)"/)?.[1] ?? null;
  const generatedClientPath = generatedText.match(/generatedClientPath: "([^"]+)"/)?.[1] ?? null;
  return {
    sourceSha256,
    actualContractSha256: createHash("sha256").update(contractText).digest("hex"),
    canonicalContractPath,
    generatedClientPath,
    importsCanonicalContract: generatedText.includes("../contracts/reference-flow.contract.js"),
    importsProviderApi: generatedText.includes("../provider/reference-flow.provider.js"),
    usesTsRestClientValidation: generatedText.includes("initClient") && generatedText.includes("validateResponse")
  };
}

async function main() {
  ensureDirectory(evidenceRoot);
  rmSync(join(compiledRoot), { recursive: true, force: true });
  rmSync(negativeRoot, { recursive: true, force: true });
  compileContractsForProbe();
  compileValidatorForProbe();

  const { validateSchemaContractStrictness } = await import(pathToFileURL(join(compiledRoot, "mechanical", "index.js")).href);
  const realBoundary = await import(pathToFileURL(join(compiledRoot, "contracts", "witness", "reference-flow.real-boundary.js")).href);
  const provider = await import(pathToFileURL(join(compiledRoot, "contracts", "provider", "reference-flow.provider.js")).href);
  const consumer = await import(pathToFileURL(join(compiledRoot, "contracts", "consumer", "reference-flow.consumer.js")).href);

  const realBoundaryResult = await realBoundary.runReferenceFlowRealBoundaryWitness();
  assert(Object.values(realBoundaryResult).every((value) => value === true), "real boundary witness booleans not all true", realBoundaryResult);

  const validProbe = provider.createReferenceApplicationProbe();
  const validProviderResponse = provider.handleReferenceFlowApiRequest({
    method: "POST",
    path: "/reference/ref_abc123/submit",
    headers: { "x-reference-client": "validation-fix" },
    body: { label: "Alpha", sequence: 9, absence: { kind: "not-provided", reason: "validation fix valid" } }
  }, validProbe);
  const invalidProbe = provider.createReferenceApplicationProbe();
  const invalidProviderResponse = provider.handleReferenceFlowApiRequest({
    method: "POST",
    path: "/reference/ref_abc123/submit",
    headers: { "x-reference-client": "validation-fix" },
    body: { label: "", sequence: 9, absence: { kind: "not-provided", reason: "invalid" } }
  }, invalidProbe);
  let forcedInvalidResponseRejected = false;
  try {
    provider.handleReferenceFlowApiRequest({
      method: "POST",
      path: "/reference/ref_abc123/submit",
      headers: { "x-reference-client": "validation-fix" },
      body: { label: "Alpha", sequence: 9, absence: { kind: "not-provided", reason: "force invalid" } },
      forceInvalidProviderResponse: true
    });
  } catch {
    forcedInvalidResponseRejected = true;
  }
  const consumerResponse = await consumer.callReferenceFlowConsumer();

  const positive = await validateSchemaContractStrictness(repoRoot, { manifestPath: "packages/contracts/schema-contract-strictness.manifest.json" });
  assert(positive.family === "p1.schema-contract-strictness" && positive.ok === true && positive.findings.length === 0, "positive P1 strictness failed", positive);

  const negatives = [];
  negatives.push(await expectFail(validateSchemaContractStrictness, "duplicate DTO/schema", createNegativeCase("duplicate-dto-schema", (root, manifest) => {
    mutateFile(root, manifest.providerFile, (text) => `${text}\nexport interface LocalPayload { value: string }\n`);
  }), "named-runtime-schema-boundary.duplicate-dto-schema-source"));
  negatives.push(await expectFail(validateSchemaContractStrictness, "bare contract shape", createNegativeCase("bare-contract-shape", (root, manifest) => {
    mutateFile(root, manifest.canonicalContractFile, (text) => text.replace("body: ReferenceRequestBodySchema", "body: z.object({ label: z.string() })"));
  }), "named-runtime-schema-boundary.bare-contract-shape"));
  negatives.push(await expectFail(validateSchemaContractStrictness, "broad record", createNegativeCase("broad-record", (root, manifest) => {
    mutateFile(root, manifest.consumerFile, (text) => `${text}\ntype BroadDomainModel = Record<string, unknown>;\n`);
  }), "named-runtime-schema-boundary.broad-record-domain-model"));
  negatives.push(await expectFail(validateSchemaContractStrictness, "unvalidated JSON.parse", createNegativeCase("json-parse", (root, manifest) => {
    mutateFile(root, manifest.providerFile, (text) => `${text}\nexport function unsafeBoundary(raw: string): unknown { return JSON.parse(raw); }\n`);
  }), "named-runtime-schema-boundary.unvalidated-json-parse"));
  negatives.push(await expectFail(validateSchemaContractStrictness, "provider request validation bypass", createNegativeCase("provider-request-bypass", (root, manifest) => {
    mutateFile(root, manifest.providerFile, (text) => text.replace("const body = ReferenceRequestBodySchema.parse(boundaryRequest.body);", "const body = boundaryRequest.body as ReferenceRequestBody;"));
  }), "named-runtime-schema-boundary.unvalidated-boundary-payload"));
  negatives.push(await expectFail(validateSchemaContractStrictness, "provider response validation bypass", createNegativeCase("provider-response-bypass", (root, manifest) => {
    mutateFile(root, manifest.providerFile, (text) => text.replace("const responseParse = ReferenceSuccessResponseSchema.safeParse(responseCandidate);", "const responseParse = { success: true, data: responseCandidate } as const;"));
  }), "named-runtime-schema-boundary.unvalidated-boundary-payload"));
  negatives.push(await expectFail(validateSchemaContractStrictness, "stale generated-client provenance", createNegativeCase("stale-provenance", (root, manifest) => {
    mutateFile(root, manifest.generatedClientFile, (text) => text.replace(/sourceSha256: "[a-f0-9]+"/, "sourceSha256: \"0000000000000000000000000000000000000000000000000000000000000000\""));
  }), "named-runtime-schema-boundary.generated-client-stale"));
  negatives.push(await expectFail(validateSchemaContractStrictness, "missing generated-client provenance", createNegativeCase("missing-provenance", (root, manifest) => {
    mutateFile(root, manifest.generatedClientFile, (text) => text.replace("export const GENERATED_CLIENT_PROVENANCE = {", "const REMOVED_GENERATED_CLIENT_PROVENANCE = {"));
  }), "named-runtime-schema-boundary.generated-client-provenance-missing"));
  negatives.push(await expectFail(validateSchemaContractStrictness, "parser-self-agreement-only", createNegativeCase("parser-only", (root, manifest) => {
    const parserOnlyFile = "packages/contracts/src/witness/parser-only.contract-test.ts";
    const destination = join(root, parserOnlyFile);
    ensureDirectory(dirname(destination));
    writeFileSync(destination, "import { ReferenceRequestBodySchema } from '../contracts/reference-flow.contract.js';\nexport function parserOnly(): boolean { return ReferenceRequestBodySchema.safeParse({ label: 'Alpha', sequence: 1, absence: { kind: 'not-provided', reason: 'parser' } }).success; }\n");
    manifest.realBoundaryTestFile = parserOnlyFile;
    manifest.sourceFiles.push(parserOnlyFile);
    writeFileSync(join(root, "schema-contract-strictness.manifest.json"), JSON.stringify(manifest, null, 2));
  }), "named-runtime-schema-boundary.parser-self-agreement-only-test"));
  negatives.push(await expectFail(validateSchemaContractStrictness, "malformed manifest", createNegativeCase("malformed-manifest", (root) => {
    writeFileSync(join(root, "schema-contract-strictness.manifest.json"), "{ not-json");
  }), "named-runtime-schema-boundary.manifest-unreadable"));
  negatives.push(await expectFail(validateSchemaContractStrictness, "missing manifest", evidenceRoot, "named-runtime-schema-boundary.manifest-unreadable", { manifestPath: "missing-strictness-manifest.json" }));
  negatives.push(await expectFail(validateSchemaContractStrictness, "regex-only proof", createNegativeCase("regex-only-proof", (root) => {
    const manifestPath = join(root, "schema-contract-strictness.manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.proofMode = "regex-narrative";
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }), "named-runtime-schema-boundary.regex-only-proof-rejected"));
  negatives.push(await expectFail(validateSchemaContractStrictness, "path traversal", createNegativeCase("path-traversal", (root) => {
    const manifestPath = join(root, "schema-contract-strictness.manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.sourceFiles.push("../outside.ts");
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }), "named-runtime-schema-boundary.path-traversal"));
  negatives.push(await expectFail(validateSchemaContractStrictness, "unknown option", repoRoot, "named-runtime-schema-boundary.unknown-validator-option", { manifestPath: "packages/contracts/schema-contract-strictness.manifest.json", unexpectedOption: true }));
  negatives.push(await expectFail(validateSchemaContractStrictness, "missing required fixture", createNegativeCase("missing-required-fixture", (root, manifest) => {
    rmSync(join(root, manifest.consumerFile), { force: true });
  }), "named-runtime-schema-boundary.required-file-missing"));

  const provenance = extractGeneratedProvenance();
  assert(provenance.sourceSha256 === provenance.actualContractSha256, "generated provenance hash mismatch", provenance);
  assert(provenance.importsCanonicalContract && provenance.importsProviderApi && provenance.usesTsRestClientValidation, "generated client provenance/import validation evidence incomplete", provenance);

  const result = {
    ok: true,
    realBoundaryResult,
    directProviderValid: { status: validProviderResponse.status, applicationLogicRan: validProbe.applicationLogicRan },
    directProviderInvalid: { status: invalidProviderResponse.status, applicationLogicRan: invalidProbe.applicationLogicRan },
    forcedInvalidResponseRejected,
    consumerImportedGeneratedClientAndReturned: consumerResponse,
    positiveP1: { ok: positive.ok, family: positive.family, findingCount: positive.findings.length, evidence: positive.evidence },
    negativeRuleIds: negatives,
    generatedClientProvenance: provenance,
    compiledRoot: relative(repoRoot, compiledRoot),
    negativeRoot: relative(repoRoot, negativeRoot)
  };
  writeFileSync(join(evidenceRoot, "i11-validation-fix-probe-result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}

await main();
