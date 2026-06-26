import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const workRoot = join(repoRoot, ".vibe/work/I-11-contract-strictness-minimal-real-fixture");
const evidenceRoot = join(workRoot, "corrected-revalidation-evidence");
const commandLogRoot = join(workRoot, "corrected-revalidation-command-log");
const compiledRoot = join(evidenceRoot, "compiled-corrected-revalidation-probe");
const negativeRoot = join(evidenceRoot, "negative-cases");
const provenanceCopyRoot = join(evidenceRoot, "generated-client-provenance-copy");

const contractPath = "packages/contracts/src/contracts/reference-flow.contract.ts";
const generatedPath = "packages/contracts/src/generated/reference-flow-client.ts";
const generatorPath = "packages/contracts/src/generation/generate-reference-flow-client.ts";
const manifestPath = "packages/contracts/schema-contract-strictness.manifest.json";
const witnessPath = "packages/contracts/src/witness/reference-flow.real-boundary.ts";

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

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function repoPath(relativePath) {
  return join(repoRoot, relativePath);
}

function evidencePath(relativePath) {
  return join(evidenceRoot, relativePath);
}

function writeJson(relativePath, value) {
  const absolute = evidencePath(relativePath);
  ensureDirectory(dirname(absolute));
  writeFileSync(absolute, JSON.stringify(value, null, 2));
}

function runCommand(logName, command, args, options = {}) {
  ensureDirectory(commandLogRoot);
  const cwd = options.cwd ?? repoRoot;
  const completed = spawnSync(command, args, { cwd, encoding: "utf8", input: options.input });
  const log = {
    cwd,
    command,
    args,
    status: completed.status,
    signal: completed.signal,
    stdout: completed.stdout,
    stderr: completed.stderr
  };
  writeFileSync(join(commandLogRoot, logName), JSON.stringify(log, null, 2));
  assert(completed.status === 0, `${command} ${args.join(" ")} failed`, log);
  return completed;
}

function symlinkNodeModules(linkPath, targetPath) {
  if (!existsSync(linkPath)) symlinkSync(targetPath, linkPath, "dir");
}

function compileProductSources() {
  rmSync(compiledRoot, { recursive: true, force: true });
  ensureDirectory(compiledRoot);
  runCommand("004a-probe-compile-contracts.log", repoPath("node_modules/.bin/tsc"), [
    "--project", "packages/contracts/tsconfig.json",
    "--noEmit", "false",
    "--outDir", join(compiledRoot, "contracts"),
    "--declaration", "false",
    "--sourceMap", "false"
  ]);
  symlinkNodeModules(join(compiledRoot, "contracts", "node_modules"), repoPath("packages/contracts/node_modules"));

  runCommand("004b-probe-compile-p1-validator.log", "pnpm", [
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
  symlinkNodeModules(join(compiledRoot, "mechanical", "node_modules"), repoPath("node_modules"));
}

async function importCompiled(relativePath) {
  return import(pathToFileURL(join(compiledRoot, relativePath)).href);
}

function normalizePayload(value) {
  return JSON.parse(JSON.stringify(value));
}

async function runRealBoundaryWitness() {
  const witness = await importCompiled("contracts/witness/reference-flow.real-boundary.js");
  const provider = await importCompiled("contracts/provider/reference-flow.provider.js");
  const generatedClient = await importCompiled("contracts/generated/reference-flow-client.js");
  const consumer = await importCompiled("contracts/consumer/reference-flow.consumer.js");
  const contract = await importCompiled("contracts/contracts/reference-flow.contract.js");

  const witnessBooleans = await witness.runReferenceFlowRealBoundaryWitness();
  assert(Object.values(witnessBooleans).every((value) => value === true), "runReferenceFlowRealBoundaryWitness did not return all booleans true", witnessBooleans);

  const validRequest = {
    method: "POST",
    path: "/reference/ref_abc123/submit",
    headers: { "x-reference-client": "corrected-revalidation-provider" },
    body: { label: "Alpha", sequence: 7, absence: { kind: "not-provided", reason: "corrected revalidation valid provider" } }
  };
  const providerProbe = provider.createReferenceApplicationProbe();
  const directProviderResponse = provider.handleReferenceFlowApiRequest(validRequest, providerProbe);
  assert(directProviderResponse.status === 200 && providerProbe.applicationLogicRan === true, "direct provider valid request did not return 200 and run logic", { directProviderResponse, providerProbe });

  const invalidRequest = {
    method: "POST",
    path: "/reference/ref_abc123/submit",
    headers: { "x-reference-client": "corrected-revalidation-provider" },
    body: { label: "", sequence: 7, absence: { kind: "not-provided", reason: "invalid request" } }
  };
  const invalidProbe = provider.createReferenceApplicationProbe();
  const invalidRequestResponse = provider.handleReferenceFlowApiRequest(invalidRequest, invalidProbe);
  assert(invalidRequestResponse.status === 400 && invalidProbe.applicationLogicRan === false, "invalid request was not rejected before application logic", { invalidRequestResponse, invalidProbe });

  const forcedInvalidRequest = {
    method: "POST",
    path: "/reference/ref_abc123/submit",
    headers: { "x-reference-client": "corrected-revalidation-provider" },
    body: { label: "Alpha", sequence: 7, absence: { kind: "not-provided", reason: "forced invalid provider" } },
    forceInvalidProviderResponse: true
  };
  let forcedInvalidResponseError;
  try {
    provider.handleReferenceFlowApiRequest(forcedInvalidRequest);
  } catch (error) {
    forcedInvalidResponseError = error;
  }
  assert(forcedInvalidResponseError instanceof Error && forcedInvalidResponseError.name === "ReferenceContractBoundaryError", "forced invalid provider response did not throw before exposure", { name: forcedInvalidResponseError?.name, message: forcedInvalidResponseError?.message });

  const invalidApi = async () => ({
    status: 200,
    body: { referenceId: "bad", accepted: true, normalizedLabel: "bad", sequenceEcho: 1, absence: { kind: "not-provided", reason: "invalid client response" } },
    headers: new Headers({ "content-type": "application/json" })
  });
  const invalidClient = generatedClient.createReferenceFlowClient(invalidApi);
  let invalidClientError;
  try {
    await invalidClient.submitReference({
      params: { referenceId: "ref_abc123" },
      headers: { "x-reference-client": "corrected-revalidation-consumer" },
      body: { label: "Alpha", sequence: 7, absence: { kind: "not-provided", reason: "client invalid response" } }
    });
  } catch (error) {
    invalidClientError = error;
  }
  assert(invalidClientError instanceof Error, "generated client exposed schema-invalid API response", { invalidClientError: invalidClientError ? String(invalidClientError) : null });

  const consumerResponse = await consumer.callReferenceFlowConsumer();
  const consumerParse = contract.ReferenceSuccessResponseSchema.safeParse(consumerResponse);
  assert(consumerParse.success === true && consumerResponse.accepted === true, "consumer did not return schema-valid success response", { consumerResponse, consumerParse });

  return {
    witnessBooleans,
    directProvider: {
      request: normalizePayload(validRequest),
      response: normalizePayload(directProviderResponse),
      applicationLogicRan: providerProbe.applicationLogicRan
    },
    invalidRequest: {
      request: normalizePayload(invalidRequest),
      response: normalizePayload(invalidRequestResponse),
      applicationLogicRan: invalidProbe.applicationLogicRan
    },
    forcedInvalidProviderResponse: {
      request: normalizePayload(forcedInvalidRequest),
      rejected: true,
      errorName: forcedInvalidResponseError.name,
      errorMessage: forcedInvalidResponseError.message
    },
    clientInvalidResponse: {
      rejected: true,
      errorName: invalidClientError.name,
      errorMessage: invalidClientError.message
    },
    consumer: {
      response: normalizePayload(consumerResponse),
      schemaValid: consumerParse.success
    }
  };
}

function copyProductContractCase(caseRoot) {
  const manifest = JSON.parse(readFileSync(repoPath(manifestPath), "utf8"));
  const files = new Set([
    manifest.canonicalContractFile,
    manifest.generatedClientFile,
    manifest.providerFile,
    manifest.consumerFile,
    manifest.realBoundaryTestFile,
    ...manifest.sourceFiles
  ]);
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
  const caseRoot = join(negativeRoot, caseName);
  rmSync(caseRoot, { recursive: true, force: true });
  ensureDirectory(caseRoot);
  const manifest = copyProductContractCase(caseRoot);
  mutate(caseRoot, manifest);
  return caseRoot;
}

async function expectFail(validateSchemaContractStrictness, caseName, caseRoot, expectedRuleId, options = {}) {
  const result = await validateSchemaContractStrictness(caseRoot, options);
  const matchingFindings = result.findings.filter((entry) => entry.ruleId === expectedRuleId && entry.family === "p1.schema-contract-strictness" && entry.blocking === true);
  assert(result.family === "p1.schema-contract-strictness", `${caseName}: family mismatch`, result);
  assert(result.ok === false, `${caseName}: expected fail-closed result`, result);
  assert(matchingFindings.length > 0, `${caseName}: missing expected rule ${expectedRuleId}`, result);
  return { caseName, expectedRuleId, ok: result.ok, findingCount: result.findings.length, findings: result.findings };
}

async function runP1ValidatorWitnesses() {
  rmSync(negativeRoot, { recursive: true, force: true });
  ensureDirectory(negativeRoot);
  const { validateSchemaContractStrictness } = await importCompiled("mechanical/index.js");
  const positive = await validateSchemaContractStrictness(repoRoot, { manifestPath });
  assert(positive.family === "p1.schema-contract-strictness" && positive.ok === true && positive.findings.length === 0, "positive current product manifest did not pass", positive);
  assert(positive.evidence?.proofMode === "typescript-ast" && positive.evidence?.canonicalContractFile === contractPath && positive.evidence?.generatedClientFile === generatedPath, "positive evidence missing expected proof mode or files", positive.evidence);
  const requiredSchemas = [
    "ReferenceIdentifierSchema",
    "ReferencePathParamsSchema",
    "ReferenceHeadersSchema",
    "ReferenceRequestBodySchema",
    "ReferenceSuccessResponseSchema",
    "ReferenceErrorResponseSchema",
    "ReferenceBoundaryRequestSchema"
  ];
  for (const schemaName of requiredSchemas) {
    assert(Array.isArray(positive.evidence.requiredNamedSchemas) && positive.evidence.requiredNamedSchemas.includes(schemaName), "positive evidence missing required schema", { schemaName, evidence: positive.evidence });
  }

  const negativeResults = [];
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "duplicate-provider-client-consumer-dto-schema-source", createNegativeCase("duplicate-provider-client-consumer-dto-schema-source", (root, manifest) => {
    mutateFile(root, manifest.consumerFile, (text) => `import { z } from "zod";\n${text}\nexport const LocalDuplicatePayloadSchema = z.object({ value: z.string() });\nexport interface LocalPayload { value: string }\n`);
  }), "named-runtime-schema-boundary.duplicate-dto-schema-source"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "bare-inline-object-contract-shape", createNegativeCase("bare-inline-object-contract-shape", (root, manifest) => {
    mutateFile(root, manifest.canonicalContractFile, (text) => text.replace("body: ReferenceRequestBodySchema", "body: z.object({ label: z.string() })"));
  }), "named-runtime-schema-boundary.bare-contract-shape"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "broad-record-domain-model", createNegativeCase("broad-record-domain-model", (root, manifest) => {
    mutateFile(root, manifest.consumerFile, (text) => `${text}\ntype BroadDomainModel = Record<string, unknown>;\n`);
  }), "named-runtime-schema-boundary.broad-record-domain-model"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "unvalidated-boundary-json-parse", createNegativeCase("unvalidated-boundary-json-parse", (root, manifest) => {
    mutateFile(root, manifest.providerFile, (text) => `${text}\nexport function unsafeBoundary(raw: string): unknown { return JSON.parse(raw); }\n`);
  }), "named-runtime-schema-boundary.unvalidated-json-parse"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "provider-request-schema-call-bypassed", createNegativeCase("provider-request-schema-call-bypassed", (root, manifest) => {
    mutateFile(root, manifest.providerFile, (text) => text.replace("const body = ReferenceRequestBodySchema.parse(boundaryRequest.body);", "const body = boundaryRequest.body as ReferenceRequestBody;"));
  }), "named-runtime-schema-boundary.unvalidated-boundary-payload"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "provider-response-schema-call-bypassed", createNegativeCase("provider-response-schema-call-bypassed", (root, manifest) => {
    mutateFile(root, manifest.providerFile, (text) => text.replace("const responseParse = ReferenceSuccessResponseSchema.safeParse(responseCandidate);", "const responseParse = { success: true, data: responseCandidate as ReferenceSuccessResponse };"));
  }), "named-runtime-schema-boundary.unvalidated-boundary-payload"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "generated-client-stale-provenance", createNegativeCase("generated-client-stale-provenance", (root, manifest) => {
    mutateFile(root, manifest.generatedClientFile, (text) => text.replace(/sourceSha256: "[a-f0-9]+"/, "sourceSha256: \"0000000000000000000000000000000000000000000000000000000000000000\""));
  }), "named-runtime-schema-boundary.generated-client-stale"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "generated-client-missing-provenance", createNegativeCase("generated-client-missing-provenance", (root, manifest) => {
    mutateFile(root, manifest.generatedClientFile, (text) => text.replace("export const GENERATED_CLIENT_PROVENANCE = {", "export const GENERATED_CLIENT_METADATA = {"));
  }), "named-runtime-schema-boundary.generated-client-provenance-missing"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "generated-client-mismatched-provenance-paths", createNegativeCase("generated-client-mismatched-provenance-paths", (root, manifest) => {
    mutateFile(root, manifest.generatedClientFile, (text) => text.replace(`canonicalContractPath: "${contractPath}"`, "canonicalContractPath: \"packages/contracts/src/contracts/other.contract.ts\""));
  }), "named-runtime-schema-boundary.generated-client-stale"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "parser-self-agreement-only-contract-test", createNegativeCase("parser-self-agreement-only-contract-test", (root, manifest) => {
    const parserOnlyFile = "packages/contracts/src/witness/parser-only.contract-test.ts";
    const absolute = join(root, parserOnlyFile);
    ensureDirectory(dirname(absolute));
    writeFileSync(absolute, "import { ReferenceRequestBodySchema } from '../contracts/reference-flow.contract.js';\nexport function parserOnly(): boolean { return ReferenceRequestBodySchema.safeParse({ label: 'Alpha', sequence: 1, absence: { kind: 'not-provided', reason: 'parser' } }).success; }\n");
    manifest.realBoundaryTestFile = parserOnlyFile;
    manifest.sourceFiles = manifest.sourceFiles.filter((entry) => entry !== witnessPath);
    manifest.sourceFiles.push(parserOnlyFile);
    writeFileSync(join(root, "schema-contract-strictness.manifest.json"), JSON.stringify(manifest, null, 2));
  }), "named-runtime-schema-boundary.parser-self-agreement-only-test"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "malformed-manifest", createNegativeCase("malformed-manifest", (root) => {
    writeFileSync(join(root, "schema-contract-strictness.manifest.json"), "{ not-json");
  }), "named-runtime-schema-boundary.manifest-unreadable"));
  const missingManifestRoot = join(negativeRoot, "missing-manifest");
  rmSync(missingManifestRoot, { recursive: true, force: true });
  ensureDirectory(missingManifestRoot);
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "missing-manifest", missingManifestRoot, "named-runtime-schema-boundary.manifest-unreadable"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "regex-narrative-proof-mode", createNegativeCase("regex-narrative-proof-mode", (root) => {
    const absoluteManifest = join(root, "schema-contract-strictness.manifest.json");
    const manifest = JSON.parse(readFileSync(absoluteManifest, "utf8"));
    manifest.proofMode = "regex-narrative";
    writeFileSync(absoluteManifest, JSON.stringify(manifest, null, 2));
  }), "named-runtime-schema-boundary.regex-only-proof-rejected"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "path-traversal-out-of-root", createNegativeCase("path-traversal-out-of-root", (root) => {
    const absoluteManifest = join(root, "schema-contract-strictness.manifest.json");
    const manifest = JSON.parse(readFileSync(absoluteManifest, "utf8"));
    manifest.sourceFiles.push("../outside.ts");
    writeFileSync(absoluteManifest, JSON.stringify(manifest, null, 2));
  }), "named-runtime-schema-boundary.path-traversal"));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "unknown-validator-option", repoRoot, "named-runtime-schema-boundary.unknown-validator-option", { manifestPath, unexpectedOption: true }));
  negativeResults.push(await expectFail(validateSchemaContractStrictness, "missing-required-fixture-file", createNegativeCase("missing-required-fixture-file", (root, manifest) => {
    rmSync(join(root, manifest.consumerFile), { force: true });
  }), "named-runtime-schema-boundary.required-file-missing"));

  return {
    positive: {
      family: positive.family,
      ok: positive.ok,
      findings: positive.findings,
      evidence: positive.evidence
    },
    negativeResults
  };
}

function runGeneratedClientProvenanceWitness() {
  const contractSource = readFileSync(repoPath(contractPath), "utf8");
  const generatedSource = readFileSync(repoPath(generatedPath), "utf8");
  const generatorSource = readFileSync(repoPath(generatorPath), "utf8");
  const actualHash = sha256(contractSource);

  assert(generatedSource.startsWith("// AUTO-GENERATED by packages/contracts/src/generation/generate-reference-flow-client.ts. Do not hand edit."), "generated client missing auto-generated declaration");
  assert(generatedSource.includes(`sourceSha256: "${actualHash}"`), "generated client source hash does not match current contract", { actualHash });
  assert(generatedSource.includes(`canonicalContractPath: "${contractPath}"`) && generatedSource.includes(`generatedClientPath: "${generatedPath}"`) && generatedSource.includes(`generator: "${generatorPath}"`), "generated client path provenance mismatch");
  assert(generatedSource.includes("import { ReferenceFlowContract } from \"../contracts/reference-flow.contract.js\";"), "generated client does not import canonical contract");
  assert(generatedSource.includes("import { handleReferenceFlowApiRequest } from \"../provider/reference-flow.provider.js\";"), "generated client does not import provider/API runtime");
  assert(generatedSource.includes("initClient(ReferenceFlowContract") && generatedSource.includes("validateResponse"), "generated client does not use ts-rest initClient/validateResponse");

  rmSync(provenanceCopyRoot, { recursive: true, force: true });
  ensureDirectory(dirname(join(provenanceCopyRoot, contractPath)));
  ensureDirectory(dirname(join(provenanceCopyRoot, generatorPath)));
  ensureDirectory(dirname(join(provenanceCopyRoot, generatedPath)));
  writeFileSync(join(provenanceCopyRoot, contractPath), contractSource);
  writeFileSync(join(provenanceCopyRoot, generatorPath), generatorSource);
  writeFileSync(join(provenanceCopyRoot, generatedPath), "// intentionally overwritten by corrected revalidation provenance witness\n");

  const transpiledGenerator = ts.transpileModule(generatorSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      verbatimModuleSyntax: true
    }
  }).outputText;
  const transpiledPath = join(evidenceRoot, "generate-reference-flow-client.mjs");
  writeFileSync(transpiledPath, transpiledGenerator);
  runCommand("004c-probe-run-generator-on-validation-copy.log", process.execPath, [transpiledPath, provenanceCopyRoot]);
  const regeneratedCopy = readFileSync(join(provenanceCopyRoot, generatedPath), "utf8");
  assert(regeneratedCopy === generatedSource, "generator output against validation-owned copy does not match product generated client", { regeneratedCopySha256: sha256(regeneratedCopy), productGeneratedSha256: sha256(generatedSource) });

  return {
    sourceSha256: actualHash,
    generatedClientSha256: sha256(generatedSource),
    generatorSha256: sha256(generatorSource),
    autoGeneratedDeclaration: true,
    canonicalContractPath: contractPath,
    generatorPath,
    generatedClientPath: generatedPath,
    importsCanonicalContract: true,
    importsProviderApi: true,
    usesInitClientAndValidateResponse: true,
    generatorReproducedExactProductFileFromValidationCopy: true,
    validationCopyRoot: relative(repoRoot, provenanceCopyRoot)
  };
}

async function main() {
  ensureDirectory(evidenceRoot);
  ensureDirectory(commandLogRoot);
  compileProductSources();
  const realBoundary = await runRealBoundaryWitness();
  const p1Strictness = await runP1ValidatorWitnesses();
  const provenance = runGeneratedClientProvenanceWitness();
  const result = {
    ok: true,
    compiledRoot: relative(repoRoot, compiledRoot),
    realBoundary,
    p1Strictness,
    provenance
  };
  writeJson("i11-corrected-revalidation-probe-result.json", result);
  console.log(JSON.stringify(result, null, 2));
}

await main();
