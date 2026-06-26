import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  lstat,
  mkdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repositoryRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const packageRoot = join(repositoryRoot, "packages/presets/typescript");
const workRoot = join(repositoryRoot, ".vibe/work/I-07D-typescript-preset-package");
const evidenceRoot = join(workRoot, "post-fix-validator-evidence");
const fixturesRoot = join(workRoot, "post-fix-validator-fixtures");
const compiledRoot = join(workRoot, "post-fix-validator-compiled");
const generatedFixtureRoot = join(fixturesRoot, "strict-generated-project");
const consumerFixtureRoot = join(fixturesRoot, "package-consumer");
const tscBin = join(repositoryRoot, "node_modules/.bin/tsc");
const i07cPostFixReport = join(repositoryRoot, ".vibe/work/I-07C-standards-package/I-07C-post-fix-revalidation-report.md");
const i07cPostFixArtifact = join(repositoryRoot, ".vibe/work/I-07C-standards-package/I-07C-post-fix-revalidation-artifact.md");
const i07cFixEvidence = join(repositoryRoot, ".vibe/work/I-07C-standards-package/fix-evidence/implementation-witness-rerun/standards-witness-result.json");
const i07cValidationEvidence = join(repositoryRoot, ".vibe/work/I-07C-standards-package/validation-evidence/implementation-witness-rerun/standards-witness-result.json");

const requiredStrictTrueFlags = Object.freeze([
  "strict",
  "noImplicitAny",
  "strictNullChecks",
  "strictFunctionTypes",
  "strictBindCallApply",
  "strictPropertyInitialization",
  "noImplicitThis",
  "alwaysStrict",
  "exactOptionalPropertyTypes",
  "noUncheckedIndexedAccess",
  "noImplicitOverride",
  "noImplicitReturns",
  "noPropertyAccessFromIndexSignature",
  "useUnknownInCatchVariables",
  "noFallthroughCasesInSwitch",
  "noUnusedLocals",
  "noUnusedParameters",
  "isolatedModules",
  "verbatimModuleSyntax",
  "forceConsistentCasingInFileNames",
]);
const requiredStrictFalseFlags = Object.freeze(["allowUnreachableCode", "allowUnusedLabels"]);
const expectedPrettierDefaults = Object.freeze({
  printWidth: 100,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  arrowParens: "always",
  bracketSpacing: true,
  endOfLine: "lf",
});
const expectedEslintRules = Object.freeze([
  "@typescript-eslint/no-explicit-any",
  "@typescript-eslint/no-non-null-assertion",
  "@typescript-eslint/ban-ts-comment",
  "@typescript-eslint/no-unnecessary-type-assertion",
  "@typescript-eslint/consistent-type-imports",
  "@typescript-eslint/no-confusing-void-expression",
  "@typescript-eslint/no-unsafe-assignment",
  "@typescript-eslint/no-unsafe-argument",
  "@typescript-eslint/no-unsafe-call",
  "@typescript-eslint/no-unsafe-member-access",
  "@typescript-eslint/no-unsafe-return",
  "@typescript-eslint/restrict-template-expressions",
  "@typescript-eslint/switch-exhaustiveness-check",
  "no-empty",
  "no-fallthrough",
  "no-implicit-coercion",
  "no-restricted-syntax",
  "vibe-engineer/no-broad-domain-map-model",
]);

function runCommand(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 30,
  });
  return {
    command: [command, ...args].join(" "),
    cwd,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function summarizeCommand(result) {
  return {
    command: result.command,
    cwd: result.cwd,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout.slice(0, 6000),
    stderr: result.stderr.slice(0, 6000),
  };
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stableStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cloneGeneratedFiles(files) {
  return files.map((file) => ({
    path: file.path,
    kind: file.kind,
    content: file.content,
    manifest: deepClone(file.manifest),
  }));
}

function mutateContent(files, path, mutator) {
  return cloneGeneratedFiles(files).map((file) => (file.path === path ? { ...file, content: mutator(file.content) } : file));
}

function mutateFirst(files, mutator) {
  const cloned = cloneGeneratedFiles(files);
  cloned[0] = mutator(cloned[0]);
  return cloned;
}

function observedCodes(result) {
  return result.ok ? [] : result.findings.map((finding) => finding.code);
}

function findingSummary(result) {
  return result.ok ? [] : result.findings.map((finding) => ({ code: finding.code, path: finding.path, evidence: finding.evidence }));
}

function expectRejected(name, files, validator, expectedCodes) {
  const result = validator(files);
  assertCondition(!result.ok, `${name} unexpectedly passed validation.`);
  for (const expectedCode of expectedCodes) {
    assertCondition(observedCodes(result).includes(expectedCode), `${name} did not emit ${expectedCode}; observed ${observedCodes(result).join(",")}`);
  }
  return {
    name,
    expectedCodes,
    observedCodes: observedCodes(result),
    findings: findingSummary(result),
  };
}

function expectAccepted(name, files, validator) {
  const result = validator(files);
  assertCondition(result.ok, `${name} unexpectedly failed: ${observedCodes(result).join(",")}`);
  return { name, ok: true, fileCount: result.fileCount };
}

function commandTokens(command) {
  return command.toLowerCase().split(/[\s&|;()"']+/u).filter((token) => token.length > 0);
}

function safeQuickGateStringsFromJson(value, strings = []) {
  if (typeof value === "string") {
    strings.push(value);
    return strings;
  }
  if (Array.isArray(value)) {
    for (const item of value) safeQuickGateStringsFromJson(item, strings);
    return strings;
  }
  if (value !== null && typeof value === "object") {
    for (const nested of Object.values(value)) safeQuickGateStringsFromJson(nested, strings);
  }
  return strings;
}

function containsForbiddenQuickCommand(command) {
  const lower = command.toLowerCase();
  if (lower.includes("pulumi up") || lower.includes("pulumi deploy") || lower.includes("pulumi destroy")) return true;
  return commandTokens(command).some((token) => token === "deploy"
    || token === "publish"
    || token === "auto-deploy"
    || token === "pulumi:deploy"
    || token.startsWith("deploy:")
    || token.endsWith(":deploy")
    || token.includes(":deploy:")
    || token.includes("full:e2e")
    || token.includes("e2e:full")
    || token.includes("mobile:e2e:full")
    || token.includes("visual:full")
    || token.includes("ui:visual:full"));
}

function checkGeneratedQuickDefaults(files) {
  const carriers = [];
  for (const path of ["package.json", "turbo.json", "packages/example/package.json"]) {
    const file = files.find((entry) => entry.path === path);
    assertCondition(file !== undefined, `Missing quick default carrier ${path}`);
    const parsed = JSON.parse(file.content);
    if (path === "package.json" || path === "packages/example/package.json") {
      assertCondition(parsed.scripts !== null && typeof parsed.scripts === "object" && typeof parsed.scripts["quality:quick"] === "string", `${path} must expose a quality:quick script key.`);
    }
    if (path === "turbo.json") {
      assertCondition(parsed.tasks !== null && typeof parsed.tasks === "object" && parsed.tasks["quality:quick"] !== undefined, "turbo.json must expose a quality:quick task key.");
    }
    carriers.push({ path, strings: safeQuickGateStringsFromJson(parsed) });
  }
  for (const carrier of carriers) {
    const forbidden = carrier.strings.filter(containsForbiddenQuickCommand);
    assertCondition(forbidden.length === 0, `Generated ${carrier.path} includes forbidden quick/deploy command(s): ${forbidden.join(" | ")}`);
  }
  return carriers;
}

function isSafeRelativePath(outputPath) {
  if (outputPath.length === 0 || outputPath.startsWith("/") || outputPath.startsWith("\\") || outputPath.includes("\\")) return false;
  return outputPath.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

async function writeGeneratedFilesToFixture(files) {
  await rm(generatedFixtureRoot, { recursive: true, force: true });
  const written = [];
  for (const file of files) {
    assertCondition(isSafeRelativePath(file.path), `Generated path is not safe/relative: ${file.path}`);
    const destination = resolve(generatedFixtureRoot, file.path);
    const relativeDestination = relative(generatedFixtureRoot, destination);
    assertCondition(!relativeDestination.startsWith("..") && !resolve(relativeDestination).startsWith("/.."), `Generated path escaped fixture root: ${file.path}`);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.content, "utf8");
    written.push({ path: file.path, destination });
  }
  return written;
}

async function readBackGeneratedFiles(files) {
  const readBack = [];
  for (const file of files) {
    const content = await readFile(join(generatedFixtureRoot, file.path), "utf8");
    assertCondition(content === file.content, `Readback mismatch for ${file.path}`);
    readBack.push({ path: file.path, bytes: Buffer.byteLength(content) });
  }
  return readBack;
}

async function fileDigest(filePath) {
  const content = await readFile(filePath);
  const stats = await stat(filePath);
  return {
    path: filePath,
    exists: true,
    size: stats.size,
    mtimeMs: stats.mtimeMs,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

async function optionalFileDigest(filePath) {
  if (!existsSync(filePath)) {
    return { path: filePath, exists: false };
  }
  return fileDigest(filePath);
}

function assertDeepEqual(actual, expected, label) {
  assertCondition(JSON.stringify(actual) === JSON.stringify(expected), `${label} mismatch. actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
}

async function createConsumerFixture() {
  await rm(consumerFixtureRoot, { recursive: true, force: true });
  await mkdir(join(consumerFixtureRoot, "node_modules/@vibe-engineer"), { recursive: true });
  await writeFile(join(consumerFixtureRoot, "package.json"), stableStringify({ type: "module", private: true, name: "i07d-post-fix-consumer" }), "utf8");
  await writeFile(join(consumerFixtureRoot, "tsconfig.json"), stableStringify({
    extends: "../../../../../tsconfig.base.json",
    compilerOptions: { noEmit: true },
    include: ["consumer.ts"],
  }), "utf8");
  await writeFile(join(consumerFixtureRoot, "consumer.ts"), `import {\n  TYPE_SCRIPT_PRESET_ID,\n  getTypeScriptPresetFileManifest,\n  renderTypeScriptPresetFiles,\n  validateTypeScriptPresetFiles,\n  type GeneratedPresetFile,\n  type TypeScriptPresetFindingCode,\n} from "@vibe-engineer/preset-typescript";\n\nconst rendered: readonly GeneratedPresetFile[] = renderTypeScriptPresetFiles({ includeSampleSource: true });\nconst result = validateTypeScriptPresetFiles(rendered);\nif (!result.ok) {\n  const codes: readonly TypeScriptPresetFindingCode[] = result.findings.map((finding) => finding.code);\n  throw new Error(codes.join(","));\n}\nconst manifest = getTypeScriptPresetFileManifest();\nexport const consumerEvidence = {\n  presetId: TYPE_SCRIPT_PRESET_ID,\n  fileCount: result.fileCount,\n  manifestCount: manifest.length,\n  firstPath: rendered[0]?.path,\n} as const;\n`, "utf8");
  const linkPath = join(consumerFixtureRoot, "node_modules/@vibe-engineer/preset-typescript");
  try {
    const existing = await lstat(linkPath);
    if (existing.isSymbolicLink() || existing.isDirectory()) await rm(linkPath, { recursive: true, force: true });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("ENOENT")) throw error;
  }
  await symlink(packageRoot, linkPath, "dir");
}

async function validateTemplatesAndManifest(api, files) {
  const templatesRoot = join(packageRoot, "templates");
  const templateEvidence = {};
  const strictTsconfig = JSON.parse(await readFile(join(templatesRoot, "strict-tsconfig-base.json"), "utf8"));
  for (const flag of requiredStrictTrueFlags) {
    assertCondition(strictTsconfig.compilerOptions[flag] === true, `Template strict flag missing: ${flag}`);
  }
  for (const flag of requiredStrictFalseFlags) {
    assertCondition(strictTsconfig.compilerOptions[flag] === false, `Template strict false flag missing: ${flag}`);
  }
  templateEvidence.strictTsconfigFlagCount = Object.keys(strictTsconfig.compilerOptions).length;

  const packageTsconfig = JSON.parse(await readFile(join(templatesRoot, "package-tsconfig.json"), "utf8"));
  assertCondition(packageTsconfig.extends === "../../tsconfig.base.json", "Template package tsconfig must extend generated root base.");
  templateEvidence.packageTsconfigExtends = packageTsconfig.extends;

  const eslintPolicy = JSON.parse(await readFile(join(templatesRoot, "eslint-policy.json"), "utf8"));
  const templateRuleNames = eslintPolicy.rules.map((rule) => rule.name);
  for (const rule of expectedEslintRules) assertCondition(templateRuleNames.includes(rule), `Template eslint policy missing ${rule}`);
  assertCondition(eslintPolicy.boundaryRules.rawJsonParseRequiresNamedBoundary === true, "Template ESLint boundary raw JSON rule missing.");
  assertCondition(eslintPolicy.boundaryRules.broadDomainMapModelsForbidden === true, "Template ESLint broad domain rule missing.");
  templateEvidence.eslintRuleCount = templateRuleNames.length;

  const prettierDefaults = JSON.parse(await readFile(join(templatesRoot, "prettier-defaults.json"), "utf8"));
  assertDeepEqual(prettierDefaults, expectedPrettierDefaults, "Template prettier defaults");
  templateEvidence.prettierDefaults = prettierDefaults;

  const pnpmDefaults = JSON.parse(await readFile(join(templatesRoot, "pnpm-workspace-defaults.json"), "utf8"));
  assertCondition(pnpmDefaults.packageManager === "pnpm@10.33.0", "Template pnpm package manager mismatch.");
  assertDeepEqual(pnpmDefaults.workspaceGlobs, ["packages/*", "apps/*"], "Template pnpm workspace globs");

  const turboDefaults = JSON.parse(await readFile(join(templatesRoot, "turbo-task-defaults.json"), "utf8"));
  assertCondition(turboDefaults.quickGateLabel === "quality:quick", "Template turbo quick label missing.");
  assertDeepEqual(turboDefaults.tasks["quality:quick"].dependsOn, ["typecheck", "lint", "format:check", "test:unit", "build"], "Template quick task dependencies");
  assertCondition(!JSON.stringify(turboDefaults.tasks["quality:quick"]).includes("deploy"), "Template quality:quick task must not include deploy.");

  const packageScriptDefaults = JSON.parse(await readFile(join(templatesRoot, "package-script-defaults.json"), "utf8"));
  assertCondition(packageScriptDefaults["quality:quick"] === "pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run test:unit && pnpm run build", "Template package quick script mismatch.");

  const testDefaults = JSON.parse(await readFile(join(templatesRoot, "test-typecheck-defaults.json"), "utf8"));
  assertCondition(testDefaults.defaultFullE2E === false && testDefaults.defaultFullMobileE2E === false && testDefaults.defaultFullVisualVerification === false && testDefaults.defaultAutoDeploy === false, "Template test/typecheck default booleans must remain false.");

  const exportedManifest = api.getTypeScriptPresetFileManifest();
  const generatedManifestFile = files.find((file) => file.path === ".vibe/generated/typescript-preset/manifest.json");
  assertCondition(generatedManifestFile !== undefined, "Generated manifest file missing from renderer output.");
  const generatedManifest = JSON.parse(generatedManifestFile.content);
  assertDeepEqual(generatedManifest.files, exportedManifest, "Generated manifest file entries vs exported manifest");
  const byPath = new Map(exportedManifest.map((entry) => [entry.outputPath, entry]));
  for (const file of files) {
    const expected = byPath.get(file.path);
    assertCondition(expected !== undefined, `Renderer produced unknown manifest path ${file.path}`);
    assertDeepEqual(file.manifest, expected, `File object manifest for ${file.path}`);
    assertCondition(file.kind === expected.kind, `File kind mismatch for ${file.path}`);
    assertCondition(expected.requiredStandardIds.length > 0, `Required standards missing for ${file.path}`);
    assertCondition(expected.consumerNotes.length > 0, `Consumer notes missing for ${file.path}`);
    assertCondition(expected.ownership === "generated-owned", `Ownership missing for ${file.path}`);
  }

  return {
    templateEvidence,
    manifestPathCount: exportedManifest.length,
    generatedManifestPathCount: generatedManifest.files.length,
  };
}

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  await rm(fixturesRoot, { recursive: true, force: true });
  await rm(compiledRoot, { recursive: true, force: true });
  await mkdir(fixturesRoot, { recursive: true });
  await mkdir(compiledRoot, { recursive: true });

  const i07cBefore = {
    report: await optionalFileDigest(i07cPostFixReport),
    artifact: await optionalFileDigest(i07cPostFixArtifact),
    fixEvidence: await optionalFileDigest(i07cFixEvidence),
    validationEvidence: await optionalFileDigest(i07cValidationEvidence),
  };

  const packageTypecheck = runCommand(tscBin, ["--noEmit", "-p", "packages/presets/typescript/tsconfig.json", "--pretty", "false"], repositoryRoot);
  assertCondition(packageTypecheck.status === 0, `Package typecheck failed: ${packageTypecheck.stderr || packageTypecheck.stdout}`);

  await createConsumerFixture();
  const consumerTypecheck = runCommand(tscBin, ["--noEmit", "-p", "tsconfig.json", "--pretty", "false"], consumerFixtureRoot);
  assertCondition(consumerTypecheck.status === 0, `Consumer package-name typecheck failed: ${consumerTypecheck.stderr || consumerTypecheck.stdout}`);

  const packageNameRuntimeImport = runCommand("node", ["-e", "import('@vibe-engineer/preset-typescript').then((module) => { const files = module.renderTypeScriptPresetFiles(); const result = module.validateTypeScriptPresetFiles(files); console.log(JSON.stringify({ ok: result.ok, keyCount: Object.keys(module).length, fileCount: files.length })); process.exit(result.ok ? 0 : 2); }).catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); })"], consumerFixtureRoot);
  const rootBareRuntimeImport = runCommand("node", ["-e", "import('@vibe-engineer/preset-typescript').then(() => { console.log('root-bare-import-ok'); }).catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); })"], repositoryRoot);

  const compileCommand = runCommand(tscBin, [
    "-p",
    "packages/presets/typescript/tsconfig.json",
    "--noEmit",
    "false",
    "--outDir",
    relative(repositoryRoot, compiledRoot),
    "--rootDir",
    "packages/presets/typescript",
    "--declaration",
    "true",
    "--declarationMap",
    "true",
    "--sourceMap",
    "true",
    "--pretty",
    "false",
  ], repositoryRoot);
  assertCondition(compileCommand.status === 0, `Package compile to validator workdir failed: ${compileCommand.stderr || compileCommand.stdout}`);

  const compiledApiUrl = pathToFileURL(join(compiledRoot, "src/index.js"));
  const api = await import(compiledApiUrl.href);
  const renderedFirst = api.renderTypeScriptPresetFiles({ includeSampleSource: true });
  const renderedSecond = api.renderTypeScriptPresetFiles({ includeSampleSource: true });
  assertDeepEqual(renderedSecond.map((file) => ({ path: file.path, kind: file.kind, content: file.content, manifest: file.manifest })), renderedFirst.map((file) => ({ path: file.path, kind: file.kind, content: file.content, manifest: file.manifest })), "Stable renderer output");
  const goodValidation = api.validateTypeScriptPresetFiles(renderedFirst);
  assertCondition(goodValidation.ok, `Validator rejected good generated files: ${observedCodes(goodValidation).join(",")}`);

  const writtenFiles = await writeGeneratedFilesToFixture(renderedFirst);
  const readBackFiles = await readBackGeneratedFiles(renderedFirst);
  const rootTsconfig = JSON.parse(await readFile(join(generatedFixtureRoot, "tsconfig.base.json"), "utf8"));
  for (const flag of requiredStrictTrueFlags) assertCondition(rootTsconfig.compilerOptions[flag] === true, `Generated root tsconfig missing ${flag}`);
  for (const flag of requiredStrictFalseFlags) assertCondition(rootTsconfig.compilerOptions[flag] === false, `Generated root tsconfig missing false ${flag}`);
  const packageTsconfig = JSON.parse(await readFile(join(generatedFixtureRoot, "packages/example/tsconfig.json"), "utf8"));
  assertCondition(packageTsconfig.extends === "../../tsconfig.base.json", "Generated package tsconfig must extend strict base.");

  const generatedFixtureTsc = runCommand(tscBin, ["--noEmit", "-p", "packages/example/tsconfig.json", "--pretty", "false"], generatedFixtureRoot);
  assertCondition(generatedFixtureTsc.status === 0, `Generated fixture TypeScript compiler failed: ${generatedFixtureTsc.stderr || generatedFixtureTsc.stdout}`);

  const quickDefaultEvidence = checkGeneratedQuickDefaults(renderedFirst);
  const templatesManifestEvidence = await validateTemplatesAndManifest(api, renderedFirst);

  const standardsUrl = pathToFileURL(join(repositoryRoot, "packages/standards/src/index.js"));
  const standards = await import(standardsUrl.href);
  const standardIds = new Set(standards.listStandards());
  const manifestStandardIds = [...new Set(api.getTypeScriptPresetFileManifest().flatMap((entry) => entry.requiredStandardIds))].sort();
  const standardsValidation = [];
  for (const standardId of manifestStandardIds) {
    assertCondition(standardIds.has(standardId), `Referenced standard id missing from I-07C standards API: ${standardId}`);
    const standard = standards.loadStandard(standardId);
    const validation = standards.validateStandardDefinition(standard);
    assertCondition(validation.ok, `Referenced standard id failed validation: ${standardId}`);
    standardsValidation.push({ standardId, ok: validation.ok });
  }
  const standardsRegression = runCommand("node", ["packages/standards/fixtures/run-witnesses.mjs"], repositoryRoot, {
    I07C_EVIDENCE_DIR: join(evidenceRoot, "standards-regression"),
  });
  assertCondition(standardsRegression.status === 0, `Standards regression witness failed: ${standardsRegression.stderr || standardsRegression.stdout}`);

  const files = cloneGeneratedFiles(renderedFirst);
  const negativeResults = [];
  negativeResults.push(expectRejected("generic deploy command default", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run deploy")), api.validateTypeScriptPresetFiles, ["PRESET_FORBIDDEN_DEFAULT_COMMAND"]));
  negativeResults.push(expectRejected("deploy prefix alias default", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run deploy:staging")), api.validateTypeScriptPresetFiles, ["PRESET_FORBIDDEN_DEFAULT_COMMAND"]));
  negativeResults.push(expectRejected("deploy suffix alias default", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run staging:deploy")), api.validateTypeScriptPresetFiles, ["PRESET_FORBIDDEN_DEFAULT_COMMAND"]));
  negativeResults.push(expectRejected("pulumi deploy alias default", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run pulumi:deploy")), api.validateTypeScriptPresetFiles, ["PRESET_FORBIDDEN_DEFAULT_COMMAND"]));
  negativeResults.push(expectRejected("pulumi up default", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pulumi up")), api.validateTypeScriptPresetFiles, ["PRESET_FORBIDDEN_DEFAULT_COMMAND"]));
  negativeResults.push(expectRejected("auto deploy default", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run auto-deploy")), api.validateTypeScriptPresetFiles, ["PRESET_FORBIDDEN_DEFAULT_COMMAND"]));
  negativeResults.push(expectRejected("production deploy default", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run production:deploy")), api.validateTypeScriptPresetFiles, ["PRESET_FORBIDDEN_DEFAULT_COMMAND"]));
  negativeResults.push(expectRejected("production publish default", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run release:publish")), api.validateTypeScriptPresetFiles, ["PRESET_FORBIDDEN_DEFAULT_COMMAND"]));
  negativeResults.push(expectRejected("full E2E default", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run full:e2e")), api.validateTypeScriptPresetFiles, ["PRESET_FORBIDDEN_DEFAULT_COMMAND"]));
  negativeResults.push(expectRejected("full mobile E2E default", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run mobile:e2e:full")), api.validateTypeScriptPresetFiles, ["PRESET_FORBIDDEN_DEFAULT_COMMAND"]));
  negativeResults.push(expectRejected("full visual UI verification default", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run ui:visual:full")), api.validateTypeScriptPresetFiles, ["PRESET_FORBIDDEN_DEFAULT_COMMAND"]));
  const safeMetadataAccepted = expectAccepted("safe defaultAutoDeploy false metadata", mutateContent(files, "package.json", (content) => {
    const parsed = JSON.parse(content);
    parsed.vibeEngineer = { defaultAutoDeploy: false, textualMetadata: "defaultAutoDeploy:false" };
    return stableStringify(parsed);
  }), api.validateTypeScriptPresetFiles);

  negativeResults.push(expectRejected("actual ESLint config missing no-explicit-any while policy stale", mutateContent(files, "eslint.config.mjs", (content) => content.replace('      "@typescript-eslint/no-explicit-any": "error",\n', "")), api.validateTypeScriptPresetFiles, ["PRESET_ESLINT_RULE_MISSING"]));
  negativeResults.push(expectRejected("actual ESLint config missing no-unsafe-return while policy stale", mutateContent(files, "eslint.config.mjs", (content) => content.replace('      "@typescript-eslint/no-unsafe-return": "error",\n', "")), api.validateTypeScriptPresetFiles, ["PRESET_ESLINT_RULE_MISSING"]));
  negativeResults.push(expectRejected("actual ESLint config missing ban-ts-comment escape guard while policy stale", mutateContent(files, "eslint.config.mjs", (content) => content.replace('      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": true, "ts-nocheck": true, "ts-expect-error": "allow-with-description", minimumDescriptionLength: 20 }],\n', "")), api.validateTypeScriptPresetFiles, ["PRESET_ESLINT_RULE_MISSING"]));
  negativeResults.push(expectRejected("actual Prettier config export default empty while policy stale", mutateContent(files, "prettier.config.mjs", () => "export default {};\n"), api.validateTypeScriptPresetFiles, ["PRESET_PRETTIER_DEFAULT_MISSING"]));

  negativeResults.push(expectRejected("generated file object wrong kind for known path", mutateFirst(files, (file) => ({ ...file, kind: "eslint-config" })), api.validateTypeScriptPresetFiles, ["PRESET_MANIFEST_CONTENT_MISMATCH"]));
  negativeResults.push(expectRejected("generated manifest JSON missing kind", mutateContent(files, ".vibe/generated/typescript-preset/manifest.json", (content) => {
    const manifest = JSON.parse(content);
    delete manifest.files[0].kind;
    return stableStringify(manifest);
  }), api.validateTypeScriptPresetFiles, ["PRESET_MANIFEST_CONTENT_MISMATCH"]));
  negativeResults.push(expectRejected("file manifest required standards empty", mutateFirst(files, (file) => ({ ...file, manifest: { ...file.manifest, requiredStandardIds: [] } })), api.validateTypeScriptPresetFiles, ["PRESET_MANIFEST_CONTENT_MISMATCH"]));
  negativeResults.push(expectRejected("generated manifest required standards missing", mutateContent(files, ".vibe/generated/typescript-preset/manifest.json", (content) => {
    const manifest = JSON.parse(content);
    delete manifest.files[0].requiredStandardIds;
    return stableStringify(manifest);
  }), api.validateTypeScriptPresetFiles, ["PRESET_MANIFEST_CONTENT_MISMATCH"]));
  negativeResults.push(expectRejected("stale generated manifest/content kind mismatch", mutateContent(files, ".vibe/generated/typescript-preset/manifest.json", (content) => {
    const manifest = JSON.parse(content);
    manifest.files[0].kind = "eslint-config";
    return stableStringify(manifest);
  }), api.validateTypeScriptPresetFiles, ["PRESET_MANIFEST_CONTENT_MISMATCH"]));
  negativeResults.push(expectRejected("unknown manifest path", mutateContent(files, ".vibe/generated/typescript-preset/manifest.json", (content) => {
    const manifest = JSON.parse(content);
    manifest.files.push({ ...manifest.files[0], outputPath: "unknown/generated.json" });
    return stableStringify(manifest);
  }), api.validateTypeScriptPresetFiles, ["PRESET_MANIFEST_CONTENT_MISMATCH"]));
  negativeResults.push(expectRejected("unknown generated file path", [{ ...files[0], path: "unknown/generated.json", manifest: { ...files[0].manifest, outputPath: "unknown/generated.json" } }, ...files.slice(1)], api.validateTypeScriptPresetFiles, ["PRESET_MANIFEST_CONTENT_MISMATCH"]));
  negativeResults.push(expectRejected("duplicate normalized output path", [files[0], { ...files[1], path: files[0].path, manifest: { ...files[1].manifest, outputPath: files[0].path } }, ...files.slice(2)], api.validateTypeScriptPresetFiles, ["PRESET_DUPLICATE_GENERATED_PATH"]));
  negativeResults.push(expectRejected("missing required generated file", files.filter((file) => file.path !== "turbo.json"), api.validateTypeScriptPresetFiles, ["PRESET_MISSING_REQUIRED_FILE"]));
  negativeResults.push(expectRejected("generated manifest missing ownership", mutateContent(files, ".vibe/generated/typescript-preset/manifest.json", (content) => {
    const manifest = JSON.parse(content);
    delete manifest.files[0].ownership;
    return stableStringify(manifest);
  }), api.validateTypeScriptPresetFiles, ["PRESET_MANIFEST_CONTENT_MISMATCH"]));
  negativeResults.push(expectRejected("generated manifest missing consumer notes", mutateContent(files, ".vibe/generated/typescript-preset/manifest.json", (content) => {
    const manifest = JSON.parse(content);
    delete manifest.files[0].consumerNotes;
    return stableStringify(manifest);
  }), api.validateTypeScriptPresetFiles, ["PRESET_MANIFEST_CONTENT_MISMATCH"]));

  const rendererOptionCases = [
    ["unknown option/property", { unknownProperty: true }],
    ["wrong includeSampleSource type", { includeSampleSource: "false" }],
    ["null options", null],
    ["non-object options", "not-an-object"],
    ["path traversal packageDirectory", { packageDirectory: "../escape" }],
    ["absolute packageDirectory", { packageDirectory: "/tmp/example" }],
    ["unsafe package/root name", { packageName: "Unsafe Name" }],
    ["testing package name", { packageName: "@vibe-engineer/testing" }],
  ];
  const rendererOptionResults = [];
  for (const [name, options] of rendererOptionCases) {
    try {
      api.renderTypeScriptPresetFiles(options);
      throw new Error(`${name} unexpectedly rendered.`);
    } catch (error) {
      assertCondition(error instanceof api.TypeScriptPresetOptionsError, `${name} did not throw TypeScriptPresetOptionsError; got ${error instanceof Error ? error.name : typeof error}`);
      assertCondition(error.code === "PRESET_MALFORMED_RENDER_OPTIONS", `${name} did not expose stable PRESET_MALFORMED_RENDER_OPTIONS code.`);
      assertCondition(error.finding?.code === "PRESET_MALFORMED_RENDER_OPTIONS", `${name} missing typed finding code.`);
      rendererOptionResults.push({ name, code: error.code, message: error.message, finding: error.finding });
    }
  }
  const optionsValidationFunction = api.validateTypeScriptPresetRenderOptions({ unexpectedOption: true });
  assertCondition(optionsValidationFunction.ok === false && optionsValidationFunction.finding.code === "PRESET_MALFORMED_RENDER_OPTIONS", "Options validator function must return typed finding for unknown option.");

  negativeResults.push(expectRejected("strict false", mutateContent(files, "tsconfig.base.json", (content) => content.replace('"strict": true', '"strict": false')), api.validateTypeScriptPresetFiles, ["PRESET_STRICT_FLAG_WEAKENED"]));
  negativeResults.push(expectRejected("missing noUncheckedIndexedAccess", mutateContent(files, "tsconfig.base.json", (content) => content.replace('    "noUncheckedIndexedAccess": true,\n', "")), api.validateTypeScriptPresetFiles, ["PRESET_STRICT_FLAG_WEAKENED"]));
  negativeResults.push(expectRejected("missing exactOptionalPropertyTypes", mutateContent(files, "tsconfig.base.json", (content) => content.replace('    "exactOptionalPropertyTypes": true,\n', "")), api.validateTypeScriptPresetFiles, ["PRESET_STRICT_FLAG_WEAKENED"]));
  negativeResults.push(expectRejected("missing noImplicitOverride", mutateContent(files, "tsconfig.base.json", (content) => content.replace('    "noImplicitOverride": true,\n', "")), api.validateTypeScriptPresetFiles, ["PRESET_STRICT_FLAG_WEAKENED"]));
  negativeResults.push(expectRejected("package tsconfig not extending strict base", mutateContent(files, "packages/example/tsconfig.json", (content) => content.replace('"../../tsconfig.base.json"', '"./loose-tsconfig.json"')), api.validateTypeScriptPresetFiles, ["PRESET_PACKAGE_TSCONFIG_WEAKENED"]));
  negativeResults.push(expectRejected("malformed generated JSON", mutateContent(files, "tsconfig.base.json", () => "{ malformed"), api.validateTypeScriptPresetFiles, ["PRESET_MALFORMED_JSON"]));
  negativeResults.push(expectRejected("domain/business vocabulary in core output", mutateContent(files, ".vibe/generated/typescript-preset/manifest.json", (content) => content.replace("TypeScript Strict Preset", "TypeScript checkout Preset")), api.validateTypeScriptPresetFiles, ["PRESET_DOMAIN_SPECIFIC_CORE_TEXT"]));
  negativeResults.push(expectRejected("path traversal generated file path", [{ ...files[0], path: "../escape.json", manifest: { ...files[0].manifest, outputPath: "../escape.json" } }, ...files.slice(1)], api.validateTypeScriptPresetFiles, ["PRESET_UNSAFE_GENERATED_PATH"]));
  negativeResults.push(expectRejected("absolute generated file path", [{ ...files[0], path: "/tmp/escape.json", manifest: { ...files[0].manifest, outputPath: "/tmp/escape.json" } }, ...files.slice(1)], api.validateTypeScriptPresetFiles, ["PRESET_UNSAFE_GENERATED_PATH"]));
  negativeResults.push(expectRejected("production dependency on @vibe-engineer/testing", mutateContent(files, "package.json", (content) => content.replace('"devDependencies": {', '"dependencies": { "@vibe-engineer/testing": "workspace:*" },\n    "devDependencies": {')), api.validateTypeScriptPresetFiles, ["PRESET_FORBIDDEN_TESTING_PRODUCTION_DEPENDENCY"]));
  negativeResults.push(expectRejected("validator input null fails closed", null, api.validateTypeScriptPresetFiles, ["PRESET_MALFORMED_RENDER_OPTIONS"]));
  negativeResults.push(expectRejected("validator input malformed entry fails closed", [{ path: "tsconfig.base.json", content: "{}" }], api.validateTypeScriptPresetFiles, ["PRESET_MALFORMED_RENDER_OPTIONS"]));

  const manifestBeforeMutation = api.getTypeScriptPresetFileManifest();
  const manifestBeforeMutationJson = JSON.stringify(manifestBeforeMutation);
  let manifestFrozenMutationThrew = false;
  try {
    manifestBeforeMutation[0].requiredStandardIds.push("mutated-standard");
  } catch {
    manifestFrozenMutationThrew = true;
  }
  const manifestAfterMutation = api.getTypeScriptPresetFileManifest();
  assertCondition(JSON.stringify(manifestAfterMutation) === manifestBeforeMutationJson, "Manifest defensive copy/freeze behavior failed.");
  const renderedManifestBeforeMutation = renderedFirst[0].manifest;
  let renderedManifestFrozenMutationThrew = false;
  try {
    renderedManifestBeforeMutation.requiredStandardIds.push("mutated-standard");
  } catch {
    renderedManifestFrozenMutationThrew = true;
  }
  const renderedThird = api.renderTypeScriptPresetFiles({ includeSampleSource: true });
  assertDeepEqual(renderedThird[0].manifest.requiredStandardIds, renderedFirst[0].manifest.requiredStandardIds, "Rendered file manifest defensive stability");

  const packageManifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  assertCondition(packageManifest.private === true, "Preset package must remain private.");
  assertCondition(packageManifest.dependencies === undefined && packageManifest.devDependencies === undefined && packageManifest.peerDependencies === undefined, "Preset package must not add dependency fields.");

  const i07cAfter = {
    report: await optionalFileDigest(i07cPostFixReport),
    artifact: await optionalFileDigest(i07cPostFixArtifact),
    fixEvidence: await optionalFileDigest(i07cFixEvidence),
    validationEvidence: await optionalFileDigest(i07cValidationEvidence),
  };
  assertDeepEqual(i07cAfter.report.sha256, i07cBefore.report.sha256, "I-07C post-fix report sha");
  assertDeepEqual(i07cAfter.artifact.sha256, i07cBefore.artifact.sha256, "I-07C post-fix artifact sha");
  assertDeepEqual(i07cAfter.fixEvidence.sha256, i07cBefore.fixEvidence.sha256, "I-07C fix evidence sha");
  assertDeepEqual(i07cAfter.validationEvidence.sha256, i07cBefore.validationEvidence.sha256, "I-07C validation evidence sha");

  const result = {
    ok: true,
    repositoryRoot,
    packageRoot,
    evidenceRoot,
    fixturesRoot,
    compiledRoot,
    generatedFixtureRoot,
    consumerFixtureRoot,
    productFiles: {
      packageManifestPrivate: packageManifest.private,
      packageManifestHasDependencies: packageManifest.dependencies !== undefined,
      exports: packageManifest.exports,
      scripts: packageManifest.scripts,
    },
    commands: {
      packageTypecheck: summarizeCommand(packageTypecheck),
      consumerTypecheck: summarizeCommand(consumerTypecheck),
      packageNameRuntimeImport: summarizeCommand(packageNameRuntimeImport),
      rootBareRuntimeImport: summarizeCommand(rootBareRuntimeImport),
      compileCommand: summarizeCommand(compileCommand),
      generatedFixtureTsc: summarizeCommand(generatedFixtureTsc),
      standardsRegression: summarizeCommand(standardsRegression),
    },
    positives: {
      generatedFileCount: renderedFirst.length,
      goodValidationFileCount: goodValidation.fileCount,
      writtenFiles,
      readBackFiles,
      strictFlags: { true: requiredStrictTrueFlags, false: requiredStrictFalseFlags },
      packageTsconfigExtends: packageTsconfig.extends,
      quickDefaultEvidence,
      templatesManifestEvidence,
      manifestStandardIds,
      standardsValidation,
      defensiveCopies: {
        manifestFrozenMutationThrew,
        renderedManifestFrozenMutationThrew,
        exportedManifestStable: JSON.stringify(manifestAfterMutation) === manifestBeforeMutationJson,
      },
      safeMetadataAccepted,
      optionsValidationFunction,
    },
    negatives: {
      count: negativeResults.length,
      results: negativeResults,
      rendererOptionResults,
    },
    i07cEvidence: {
      before: i07cBefore,
      after: i07cAfter,
      unchanged: true,
    },
  };

  const resultPath = join(evidenceRoot, "i07d-post-fix-validator-witness-result.json");
  await writeFile(resultPath, stableStringify(result), "utf8");
  console.log(JSON.stringify({ ok: true, resultPath, generatedFileCount: renderedFirst.length, negativeCount: negativeResults.length, rendererOptionNegativeCount: rendererOptionResults.length }));
}

main().catch(async (error) => {
  await mkdir(evidenceRoot, { recursive: true });
  const failurePath = join(evidenceRoot, "i07d-post-fix-validator-witness-failure.json");
  await writeFile(failurePath, stableStringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  }), "utf8");
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
