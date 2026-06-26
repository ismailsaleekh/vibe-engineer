import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../../..", import.meta.url)));
const workRoot = join(repositoryRoot, ".vibe/work/I-07D-typescript-preset-package");
const evidenceRoot = join(workRoot, "evidence");
const compiledRoot = join(workRoot, "compiled");
const generatedFixtureRoot = join(repositoryRoot, "packages/presets/typescript/fixtures/generated/strict-project");
const tscBin = join(repositoryRoot, "node_modules/.bin/tsc");

function runCommand(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
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

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function writeGeneratedFiles(files) {
  await rm(generatedFixtureRoot, { recursive: true, force: true });
  for (const file of files) {
    assertCondition(!file.path.startsWith("/"), `Generated path must be relative: ${file.path}`);
    assertCondition(!file.path.split("/").includes(".."), `Generated path must not traverse: ${file.path}`);
    const destination = resolve(generatedFixtureRoot, file.path);
    assertCondition(destination.startsWith(`${generatedFixtureRoot}/`) || destination === generatedFixtureRoot, `Generated path escaped fixture root: ${file.path}`);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.content, "utf8");
  }
}

function cloneGeneratedFiles(files) {
  return files.map((file) => ({ ...file, manifest: { ...file.manifest, requiredStandardIds: [...file.manifest.requiredStandardIds] } }));
}

function mutateContent(files, path, mutator) {
  return cloneGeneratedFiles(files).map((file) => file.path === path ? { ...file, content: mutator(file.content) } : file);
}

function expectRejected(name, files, validator, expectedCode) {
  const result = validator(files);
  assertCondition(!result.ok, `${name} unexpectedly passed validation.`);
  assertCondition(result.findings.some((finding) => finding.code === expectedCode), `${name} did not emit ${expectedCode}; saw ${result.findings.map((finding) => finding.code).join(",")}`);
  return { name, ok: true, expectedCode, observedCodes: result.findings.map((finding) => finding.code) };
}

async function parseJsonFile(relativePath) {
  return JSON.parse(await readFile(join(generatedFixtureRoot, relativePath), "utf8"));
}

async function validateTemplates() {
  const templatesRoot = join(repositoryRoot, "packages/presets/typescript/templates");
  const templateFiles = [
    "strict-tsconfig-base.json",
    "package-tsconfig.json",
    "eslint-policy.json",
    "prettier-defaults.json",
    "pnpm-workspace-defaults.json",
    "turbo-task-defaults.json",
    "package-script-defaults.json",
    "test-typecheck-defaults.json",
  ];
  const parsed = [];
  for (const file of templateFiles) {
    const data = JSON.parse(await readFile(join(templatesRoot, file), "utf8"));
    parsed.push({ file, keys: Object.keys(data).sort() });
  }
  return parsed;
}

async function main() {
  await mkdir(evidenceRoot, { recursive: true });
  await rm(compiledRoot, { recursive: true, force: true });
  await mkdir(compiledRoot, { recursive: true });

  const compileCommand = runCommand(tscBin, [
    "-p",
    "packages/presets/typescript/tsconfig.json",
    "--noEmit",
    "false",
    "--outDir",
    ".vibe/work/I-07D-typescript-preset-package/compiled",
    "--rootDir",
    "packages/presets/typescript",
    "--declaration",
    "true",
    "--declarationMap",
    "true",
    "--sourceMap",
    "true",
  ], repositoryRoot);
  assertCondition(compileCommand.status === 0, `Package compile failed: ${compileCommand.stderr || compileCommand.stdout}`);

  const packageSelfImportCommand = runCommand("node", [
    "-e",
    "import('@vibe-engineer/preset-typescript').then((module) => { const files = module.renderTypeScriptPresetFiles(); const result = module.validateTypeScriptPresetFiles(files); if (!result.ok) process.exit(2); console.log(JSON.stringify({ ok: true, exportedKeys: Object.keys(module).length, fileCount: files.length })); }).catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); })",
  ], join(repositoryRoot, "packages/presets/typescript"));
  assertCondition(packageSelfImportCommand.status === 0, `Package self runtime import failed: ${packageSelfImportCommand.stderr || packageSelfImportCommand.stdout}`);

  const compiledApiUrl = pathToFileURL(join(compiledRoot, "src/index.js"));
  const api = await import(compiledApiUrl.href);
  const files = api.renderTypeScriptPresetFiles();
  const validation = api.validateTypeScriptPresetFiles(files);
  assertCondition(validation.ok, `Generated preset validation failed: ${validation.findings?.map((finding) => finding.code).join(",")}`);

  await writeGeneratedFiles(files);

  const rootTsconfig = await parseJsonFile("tsconfig.base.json");
  const packageTsconfig = await parseJsonFile("packages/example/tsconfig.json");
  const strictFlags = [
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
  ];
  for (const flag of strictFlags) {
    assertCondition(rootTsconfig.compilerOptions[flag] === true, `Strict flag missing from generated root tsconfig: ${flag}`);
  }
  assertCondition(rootTsconfig.compilerOptions.allowUnreachableCode === false, "allowUnreachableCode must be false.");
  assertCondition(rootTsconfig.compilerOptions.allowUnusedLabels === false, "allowUnusedLabels must be false.");
  assertCondition(packageTsconfig.extends === "../../tsconfig.base.json", "Package tsconfig must extend strict root base.");

  const generatedTscCommand = runCommand(tscBin, ["-p", "packages/example/tsconfig.json", "--noEmit", "--pretty", "false"], generatedFixtureRoot);
  assertCondition(generatedTscCommand.status === 0, `Generated fixture tsc failed: ${generatedTscCommand.stderr || generatedTscCommand.stdout}`);

  const standardsUrl = pathToFileURL(join(repositoryRoot, "packages/standards/src/index.js"));
  const standards = await import(standardsUrl.href);
  const standardIds = new Set(standards.listStandards());
  const manifest = api.getTypeScriptPresetFileManifest();
  const allManifestStandardIds = [...new Set(manifest.flatMap((entry) => entry.requiredStandardIds))].sort();
  for (const standardId of allManifestStandardIds) {
    assertCondition(standardIds.has(standardId), `Preset references unknown standard id ${standardId}`);
    const standard = standards.loadStandard(standardId);
    const result = standards.validateStandardDefinition(standard);
    assertCondition(result.ok, `Referenced standard failed validation: ${standardId}`);
  }
  const standardsRegression = runCommand("node", ["packages/standards/fixtures/run-witnesses.mjs"], repositoryRoot, {
    I07C_EVIDENCE_DIR: join(evidenceRoot, "standards-regression"),
  });
  assertCondition(standardsRegression.status === 0, `Standards regression witness failed: ${standardsRegression.stderr || standardsRegression.stdout}`);

  const negativeResults = [];
  negativeResults.push(expectRejected("strict false", mutateContent(files, "tsconfig.base.json", (content) => content.replace('"strict": true', '"strict": false')), api.validateTypeScriptPresetFiles, "PRESET_STRICT_FLAG_WEAKENED"));
  negativeResults.push(expectRejected("missing noUncheckedIndexedAccess", mutateContent(files, "tsconfig.base.json", (content) => content.replace('    "noUncheckedIndexedAccess": true,\n', "")), api.validateTypeScriptPresetFiles, "PRESET_STRICT_FLAG_WEAKENED"));
  negativeResults.push(expectRejected("missing exactOptionalPropertyTypes", mutateContent(files, "tsconfig.base.json", (content) => content.replace('    "exactOptionalPropertyTypes": true,\n', "")), api.validateTypeScriptPresetFiles, "PRESET_STRICT_FLAG_WEAKENED"));
  negativeResults.push(expectRejected("missing noImplicitOverride", mutateContent(files, "tsconfig.base.json", (content) => content.replace('    "noImplicitOverride": true,\n', "")), api.validateTypeScriptPresetFiles, "PRESET_STRICT_FLAG_WEAKENED"));
  negativeResults.push(expectRejected("package tsconfig weakened", mutateContent(files, "packages/example/tsconfig.json", (content) => content.replace('"../../tsconfig.base.json"', '"./tsconfig.loose.json"')), api.validateTypeScriptPresetFiles, "PRESET_PACKAGE_TSCONFIG_WEAKENED"));
  negativeResults.push(expectRejected("eslint policy rule missing", mutateContent(files, ".vibe/generated/typescript-preset/eslint-policy.json", (content) => {
    const policy = JSON.parse(content);
    policy.rules = policy.rules.filter((rule) => rule.name !== "@typescript-eslint/no-explicit-any");
    return `${JSON.stringify(policy, null, 2)}\n`;
  }), api.validateTypeScriptPresetFiles, "PRESET_ESLINT_RULE_MISSING"));
  negativeResults.push(expectRejected("actual eslint config rule missing while policy stale", mutateContent(files, "eslint.config.mjs", (content) => content.replace('      "@typescript-eslint/no-explicit-any": "error",\n', "")), api.validateTypeScriptPresetFiles, "PRESET_ESLINT_RULE_MISSING"));
  negativeResults.push(expectRejected("prettier policy missing", mutateContent(files, ".vibe/generated/typescript-preset/prettier-policy.json", (content) => {
    const policy = JSON.parse(content);
    delete policy.printWidth;
    return `${JSON.stringify(policy, null, 2)}\n`;
  }), api.validateTypeScriptPresetFiles, "PRESET_PRETTIER_DEFAULT_MISSING"));
  negativeResults.push(expectRejected("actual prettier config missing deterministic settings while policy stale", mutateContent(files, "prettier.config.mjs", () => "export default {};\n"), api.validateTypeScriptPresetFiles, "PRESET_PRETTIER_DEFAULT_MISSING"));
  negativeResults.push(expectRejected("path traversal", [{ ...files[0], path: "../escape.json", manifest: { ...files[0].manifest, outputPath: "../escape.json" } }, ...files.slice(1)], api.validateTypeScriptPresetFiles, "PRESET_UNSAFE_GENERATED_PATH"));
  negativeResults.push(expectRejected("absolute path", [{ ...files[0], path: "/tmp/escape.json", manifest: { ...files[0].manifest, outputPath: "/tmp/escape.json" } }, ...files.slice(1)], api.validateTypeScriptPresetFiles, "PRESET_UNSAFE_GENERATED_PATH"));
  negativeResults.push(expectRejected("duplicate path", [files[0], { ...files[1], path: files[0].path, manifest: { ...files[1].manifest, outputPath: files[0].path } }, ...files.slice(2)], api.validateTypeScriptPresetFiles, "PRESET_DUPLICATE_GENERATED_PATH"));
  negativeResults.push(expectRejected("domain term", mutateContent(files, ".vibe/generated/typescript-preset/manifest.json", (content) => content.replace("TypeScript Strict Preset", "TypeScript checkout Preset")), api.validateTypeScriptPresetFiles, "PRESET_DOMAIN_SPECIFIC_CORE_TEXT"));
  negativeResults.push(expectRejected("forbidden quick full e2e command", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run full:e2e")), api.validateTypeScriptPresetFiles, "PRESET_FORBIDDEN_DEFAULT_COMMAND"));
  negativeResults.push(expectRejected("forbidden quick full mobile command", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run mobile:e2e:full")), api.validateTypeScriptPresetFiles, "PRESET_FORBIDDEN_DEFAULT_COMMAND"));
  negativeResults.push(expectRejected("forbidden quick full visual command", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run visual:full")), api.validateTypeScriptPresetFiles, "PRESET_FORBIDDEN_DEFAULT_COMMAND"));
  negativeResults.push(expectRejected("forbidden quick full ui visual command", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run ui:visual:full")), api.validateTypeScriptPresetFiles, "PRESET_FORBIDDEN_DEFAULT_COMMAND"));
  negativeResults.push(expectRejected("forbidden generic deploy command", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run deploy")), api.validateTypeScriptPresetFiles, "PRESET_FORBIDDEN_DEFAULT_COMMAND"));
  negativeResults.push(expectRejected("forbidden deploy prefix command", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run deploy:prod")), api.validateTypeScriptPresetFiles, "PRESET_FORBIDDEN_DEFAULT_COMMAND"));
  negativeResults.push(expectRejected("forbidden deploy suffix command", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run production:deploy")), api.validateTypeScriptPresetFiles, "PRESET_FORBIDDEN_DEFAULT_COMMAND"));
  negativeResults.push(expectRejected("forbidden pulumi deploy alias", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run pulumi:deploy")), api.validateTypeScriptPresetFiles, "PRESET_FORBIDDEN_DEFAULT_COMMAND"));
  negativeResults.push(expectRejected("forbidden pulumi up command", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pulumi up")), api.validateTypeScriptPresetFiles, "PRESET_FORBIDDEN_DEFAULT_COMMAND"));
  negativeResults.push(expectRejected("forbidden auto deploy command", mutateContent(files, "package.json", (content) => content.replace("pnpm run build", "pnpm run build && pnpm run auto-deploy")), api.validateTypeScriptPresetFiles, "PRESET_FORBIDDEN_DEFAULT_COMMAND"));
  negativeResults.push(expectRejected("missing file", files.filter((file) => file.path !== "turbo.json"), api.validateTypeScriptPresetFiles, "PRESET_MISSING_REQUIRED_FILE"));
  negativeResults.push(expectRejected("malformed json", mutateContent(files, "tsconfig.base.json", () => "{"), api.validateTypeScriptPresetFiles, "PRESET_MALFORMED_JSON"));
  negativeResults.push(expectRejected("manifest output path mismatch", [{ ...files[0], manifest: { ...files[0].manifest, outputPath: "wrong.json" } }, ...files.slice(1)], api.validateTypeScriptPresetFiles, "PRESET_MANIFEST_CONTENT_MISMATCH"));
  negativeResults.push(expectRejected("manifest exact kind mismatch", [{ ...files[0], kind: "eslint-config" }, ...files.slice(1)], api.validateTypeScriptPresetFiles, "PRESET_MANIFEST_CONTENT_MISMATCH"));
  negativeResults.push(expectRejected("manifest standard ids emptied", [{ ...files[0], manifest: { ...files[0].manifest, requiredStandardIds: [] } }, ...files.slice(1)], api.validateTypeScriptPresetFiles, "PRESET_MANIFEST_CONTENT_MISMATCH"));
  negativeResults.push(expectRejected("generated manifest omits kind", mutateContent(files, ".vibe/generated/typescript-preset/manifest.json", (content) => {
    const manifest = JSON.parse(content);
    delete manifest.files[0].kind;
    return `${JSON.stringify(manifest, null, 2)}\n`;
  }), api.validateTypeScriptPresetFiles, "PRESET_MANIFEST_CONTENT_MISMATCH"));
  negativeResults.push(expectRejected("generated manifest unknown path", mutateContent(files, ".vibe/generated/typescript-preset/manifest.json", (content) => {
    const manifest = JSON.parse(content);
    manifest.files.push({ ...manifest.files[0], outputPath: "unknown.json" });
    return `${JSON.stringify(manifest, null, 2)}\n`;
  }), api.validateTypeScriptPresetFiles, "PRESET_MANIFEST_CONTENT_MISMATCH"));
  negativeResults.push(expectRejected("generated manifest duplicate path", mutateContent(files, ".vibe/generated/typescript-preset/manifest.json", (content) => {
    const manifest = JSON.parse(content);
    manifest.files.push({ ...manifest.files[0] });
    return `${JSON.stringify(manifest, null, 2)}\n`;
  }), api.validateTypeScriptPresetFiles, "PRESET_DUPLICATE_GENERATED_PATH"));
  negativeResults.push(expectRejected("unknown generated file path", [{ ...files[0], path: "unknown.json", manifest: { ...files[0].manifest, outputPath: "unknown.json" } }, ...files.slice(1)], api.validateTypeScriptPresetFiles, "PRESET_MANIFEST_CONTENT_MISMATCH"));
  negativeResults.push(expectRejected("testing production dependency", mutateContent(files, "package.json", (content) => content.replace('"devDependencies": {', '"dependencies": { "@vibe-engineer/testing": "workspace:*" },\n    "devDependencies": {')), api.validateTypeScriptPresetFiles, "PRESET_FORBIDDEN_TESTING_PRODUCTION_DEPENDENCY"));

  const rendererOptionNegatives = [
    ["unknown renderer option", { unexpectedOption: true }],
    ["wrong includeSampleSource type", { includeSampleSource: "false" }],
    ["null renderer options", null],
    ["path traversal packageDirectory", { packageDirectory: "../escape" }],
    ["absolute packageDirectory", { packageDirectory: "/tmp/example" }],
    ["unsafe package name", { packageName: "Unsafe Name" }],
    ["testing production package name", { packageName: "@vibe-engineer/testing" }],
  ];
  const rendererOptionResults = [];
  for (const [name, options] of rendererOptionNegatives) {
    try {
      api.renderTypeScriptPresetFiles(options);
      throw new Error(`${name} unexpectedly rendered.`);
    } catch (error) {
      assertCondition(error instanceof api.TypeScriptPresetOptionsError, `${name} did not throw TypeScriptPresetOptionsError.`);
      assertCondition(error.code === "PRESET_MALFORMED_RENDER_OPTIONS", `${name} did not expose stable malformed options code.`);
      rendererOptionResults.push({ name, ok: true, code: error.code, message: error.message });
    }
  }

  const defensiveManifest = api.getTypeScriptPresetFileManifest();
  const originalLength = defensiveManifest[0].requiredStandardIds.length;
  let defensiveCopyBlockedMutation = false;
  try {
    defensiveManifest[0].requiredStandardIds.push("mutated");
  } catch {
    defensiveCopyBlockedMutation = true;
  }
  const defensiveManifestAfterMutation = api.getTypeScriptPresetFileManifest();
  assertCondition(defensiveCopyBlockedMutation || defensiveManifestAfterMutation[0].requiredStandardIds.length === originalLength, "Manifest defensive copy behavior failed.");

  const templateEvidence = await validateTemplates();
  const sourceProductionJsScan = runCommand("find", ["packages/presets/typescript/src", "-type", "f", "(", "-name", "*.js", "-o", "-name", "*.mjs", "-o", "-name", "*.cjs", ")", "-print"], repositoryRoot);
  assertCondition(sourceProductionJsScan.status === 0 && sourceProductionJsScan.stdout.trim() === "", "Production source must not contain JS/MJS/CJS files.");

  const packageManifest = JSON.parse(await readFile(join(repositoryRoot, "packages/presets/typescript/package.json"), "utf8"));
  assertCondition(packageManifest.private === true, "Preset package must remain private.");
  assertCondition(packageManifest.dependencies === undefined, "Preset package must not add dependencies requiring lockfile mutation.");

  const result = {
    ok: true,
    repositoryRoot,
    evidenceRoot,
    compiledRoot,
    generatedFixtureRoot,
    compileCommand: {
      command: compileCommand.command,
      cwd: compileCommand.cwd,
      status: compileCommand.status,
      stdout: compileCommand.stdout.slice(0, 4000),
      stderr: compileCommand.stderr.slice(0, 4000),
    },
    packageSelfImportCommand: {
      command: packageSelfImportCommand.command,
      cwd: packageSelfImportCommand.cwd,
      status: packageSelfImportCommand.status,
      stdout: packageSelfImportCommand.stdout.slice(0, 4000),
      stderr: packageSelfImportCommand.stderr.slice(0, 4000),
    },
    generatedTscCommand: {
      command: generatedTscCommand.command,
      cwd: generatedTscCommand.cwd,
      status: generatedTscCommand.status,
      stdout: generatedTscCommand.stdout.slice(0, 4000),
      stderr: generatedTscCommand.stderr.slice(0, 4000),
    },
    standardsRegression: {
      command: standardsRegression.command,
      cwd: standardsRegression.cwd,
      status: standardsRegression.status,
      stdout: standardsRegression.stdout.slice(0, 4000),
      stderr: standardsRegression.stderr.slice(0, 4000),
    },
    generatedFileCount: files.length,
    manifestStandardIds: allManifestStandardIds,
    negativeResults,
    rendererOptionResults,
    templateEvidence,
    packagePrivate: packageManifest.private,
  };

  const resultPath = join(evidenceRoot, "typescript-preset-witness-result.json");
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ ok: true, resultPath, generatedFileCount: files.length, negativeCount: negativeResults.length }));
}

main().catch(async (error) => {
  await mkdir(evidenceRoot, { recursive: true });
  const failurePath = join(evidenceRoot, "typescript-preset-witness-failure.json");
  await writeFile(failurePath, `${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`, "utf8");
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
