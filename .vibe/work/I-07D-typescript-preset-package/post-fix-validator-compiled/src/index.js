export const TYPE_SCRIPT_PRESET_ID = "vibe-engineer.typescript.strict";
export const TYPE_SCRIPT_PRESET_NAME = "Vibe Engineer TypeScript Strict Preset";
export const TYPE_SCRIPT_PRESET_VERSION = "1.0.0";
export class TypeScriptPresetOptionsError extends Error {
    code;
    finding;
    constructor(finding) {
        super(finding.message);
        this.name = "TypeScriptPresetOptionsError";
        this.code = "PRESET_MALFORMED_RENDER_OPTIONS";
        this.finding = finding;
    }
}
const REQUIRED_STRICT_TRUE_FLAGS = Object.freeze([
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
const REQUIRED_STRICT_FALSE_FLAGS = Object.freeze(["allowUnreachableCode", "allowUnusedLabels"]);
const REQUIRED_ESLINT_RULES = Object.freeze([
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
const FORBIDDEN_DOMAIN_TERMS = Object.freeze([
    "ecommerce",
    "inventory",
    "fashion",
    "Billz",
    "Telegram",
    "Instagram",
    "checkout",
    "product",
    "customer",
    "order",
]);
const FORBIDDEN_QUICK_COMMAND_TERMS = Object.freeze([
    "full:e2e",
    "e2e:full",
    "test:e2e:full",
    "mobile:e2e:full",
    "full:mobile",
    "mobile:full",
    "visual:full",
    "full:visual",
    "ui:visual:full",
    "visual:ui:full",
    "auto-deploy",
    "deploy",
    "deploy:prod",
    "prod:deploy",
    "deploy:production",
    "production:deploy",
    "pulumi:deploy",
    "pulumi up",
    "pulumi deploy",
    "pulumi destroy",
    "publish",
]);
const REQUIRED_FILE_PATHS = Object.freeze([
    "tsconfig.base.json",
    "packages/example/tsconfig.json",
    "eslint.config.mjs",
    ".vibe/generated/typescript-preset/eslint-policy.json",
    "prettier.config.mjs",
    ".vibe/generated/typescript-preset/prettier-policy.json",
    "pnpm-workspace.yaml",
    "turbo.json",
    "package.json",
    "packages/example/package.json",
    ".vibe/generated/typescript-preset/manifest.json",
]);
export const TYPESCRIPT_PRESET_METADATA = Object.freeze({
    presetId: TYPE_SCRIPT_PRESET_ID,
    name: TYPE_SCRIPT_PRESET_NAME,
    version: TYPE_SCRIPT_PRESET_VERSION,
    packageName: "@vibe-engineer/preset-typescript",
    private: true,
    domainNeutral: true,
    quickGateLabel: "quality:quick",
});
export const TYPESCRIPT_COMPILER_STRICT_OPTIONS = Object.freeze({
    target: "ES2022",
    lib: Object.freeze(["ES2022"]),
    module: "NodeNext",
    moduleResolution: "NodeNext",
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    strictFunctionTypes: true,
    strictBindCallApply: true,
    strictPropertyInitialization: true,
    noImplicitThis: true,
    alwaysStrict: true,
    exactOptionalPropertyTypes: true,
    noUncheckedIndexedAccess: true,
    noImplicitOverride: true,
    noImplicitReturns: true,
    noPropertyAccessFromIndexSignature: true,
    useUnknownInCatchVariables: true,
    noFallthroughCasesInSwitch: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    allowUnreachableCode: false,
    allowUnusedLabels: false,
    isolatedModules: true,
    verbatimModuleSyntax: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
    noEmitOnError: true,
    skipLibCheck: false,
});
export const PACKAGE_TSCONFIG_DEFAULTS = Object.freeze({
    extends: "../../tsconfig.base.json",
    compilerOptions: Object.freeze({
        rootDir: "src",
        outDir: "dist",
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        noEmit: false,
    }),
    include: Object.freeze(["src/**/*.ts"]),
});
export const ESLINT_POLICY_DEFAULTS = Object.freeze({
    configFile: "eslint.config.mjs",
    rules: Object.freeze(REQUIRED_ESLINT_RULES.map((name) => Object.freeze({ name, severity: "error", purpose: `Strict TypeScript preset enforcement for ${name}.` }))),
    boundaryRules: Object.freeze({
        rawJsonParseRequiresNamedBoundary: true,
        broadDomainMapModelsForbidden: true,
    }),
});
export const PRETTIER_DEFAULTS = Object.freeze({
    printWidth: 100,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    arrowParens: "always",
    bracketSpacing: true,
    endOfLine: "lf",
});
export const PNPM_DEFAULTS = Object.freeze({
    workspaceGlobs: Object.freeze(["packages/*", "apps/*"]),
    packageManager: "pnpm@10.33.0",
});
export const TURBO_TASK_DEFAULTS = Object.freeze({
    quickGateLabel: "quality:quick",
    tasks: Object.freeze({
        typecheck: Object.freeze({ dependsOn: Object.freeze(["^typecheck"]), outputs: Object.freeze([]) }),
        lint: Object.freeze({ dependsOn: Object.freeze(["^lint"]), outputs: Object.freeze([]) }),
        "format:check": Object.freeze({ outputs: Object.freeze([]) }),
        "test:unit": Object.freeze({ dependsOn: Object.freeze(["^test:unit"]), outputs: Object.freeze(["coverage/**"]), }),
        build: Object.freeze({ dependsOn: Object.freeze(["^build", "typecheck"]), outputs: Object.freeze(["dist/**"]), }),
        "quality:quick": Object.freeze({ dependsOn: Object.freeze(["typecheck", "lint", "format:check", "test:unit", "build"]), outputs: Object.freeze([]), }),
    }),
});
export const PACKAGE_SCRIPT_DEFAULTS = Object.freeze({
    typecheck: "tsc --noEmit -p tsconfig.json",
    lint: "eslint .",
    "format:check": "prettier --check .",
    "test:unit": "node --test",
    build: "tsc -p tsconfig.json",
    "quality:quick": "pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run test:unit && pnpm run build",
});
export const TEST_AND_TYPECHECK_DEFAULTS = Object.freeze({
    typecheckCommand: "tsc --noEmit -p packages/example/tsconfig.json",
    unitTestCommand: "node --test packages/example/test/**/*.test.js",
    quickGateCommand: "pnpm run quality:quick",
    defaultFullE2E: false,
    defaultFullMobileE2E: false,
    defaultFullVisualVerification: false,
    defaultAutoDeploy: false,
});
function manifestEntry(outputPath, kind, requiredStandardIds, consumerNotes) {
    return Object.freeze({
        outputPath,
        kind,
        ownership: "generated-owned",
        requiredStandardIds: Object.freeze([...requiredStandardIds]),
        consumerNotes,
    });
}
export const TYPESCRIPT_PRESET_FILE_MANIFEST = Object.freeze([
    manifestEntry("tsconfig.base.json", "typescript-config", ["typed-boundary-contracts", "dependency-hygiene"], "Root strict NodeNext TypeScript baseline."),
    manifestEntry("packages/example/tsconfig.json", "typescript-config", ["typed-boundary-contracts"], "Package tsconfig extends the strict root base without weakening it."),
    manifestEntry("eslint.config.mjs", "eslint-config", ["typed-boundary-contracts", "domain-neutral-core"], "Strict ESLint flat-config generated from typed policy defaults."),
    manifestEntry(".vibe/generated/typescript-preset/eslint-policy.json", "eslint-policy", ["typed-boundary-contracts", "domain-neutral-core"], "Machine-readable ESLint policy contract for validators and future schematics."),
    manifestEntry("prettier.config.mjs", "prettier-config", ["deterministic-schematics"], "Deterministic Prettier config generated from typed formatting defaults."),
    manifestEntry(".vibe/generated/typescript-preset/prettier-policy.json", "prettier-policy", ["deterministic-schematics"], "Machine-readable formatting defaults for fail-closed validation."),
    manifestEntry("pnpm-workspace.yaml", "workspace-config", ["dependency-hygiene"], "Workspace globs for generated apps and packages."),
    manifestEntry("turbo.json", "turbo-config", ["real-boundary-witnesses", "dependency-hygiene"], "Quick/local Turborepo tasks excluding full E2E, full mobile, full visual, and deploy defaults."),
    manifestEntry("package.json", "package-manifest", ["dependency-hygiene"], "Root generated package scripts and package-manager metadata."),
    manifestEntry("packages/example/package.json", "package-manifest", ["dependency-hygiene"], "Package-local strict scripts for future generated packages."),
    manifestEntry(".vibe/generated/typescript-preset/manifest.json", "preset-metadata", ["report-first-evidence", "dirty-tree-ownership"], "Generated manifest tying files to standards and mechanical-gate families."),
    manifestEntry("packages/example/src/sample.ts", "source-fixture", ["typed-boundary-contracts"], "Small strict TypeScript source consumed by compiler witness."),
]);
const TYPESCRIPT_PRESET_FILE_MANIFEST_BY_PATH = Object.freeze(new Map(TYPESCRIPT_PRESET_FILE_MANIFEST.map((entry) => [entry.outputPath, entry])));
function stableStringify(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}
function renderEslintConfig() {
    return `import js from "@eslint/js";\nimport tseslint from "typescript-eslint";\n\nexport default tseslint.config(\n  js.configs.recommended,\n  ...tseslint.configs.strictTypeChecked,\n  ...tseslint.configs.stylisticTypeChecked,\n  {\n    files: ["**/*.ts", "**/*.tsx"],\n    languageOptions: {\n      parserOptions: {\n        projectService: true,\n      },\n    },\n    rules: {\n      "@typescript-eslint/no-explicit-any": "error",\n      "@typescript-eslint/no-non-null-assertion": "error",\n      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": true, "ts-nocheck": true, "ts-expect-error": "allow-with-description", minimumDescriptionLength: 20 }],\n      "@typescript-eslint/no-unnecessary-type-assertion": "error",\n      "@typescript-eslint/consistent-type-imports": "error",\n      "@typescript-eslint/no-confusing-void-expression": "error",\n      "@typescript-eslint/no-unsafe-assignment": "error",\n      "@typescript-eslint/no-unsafe-argument": "error",\n      "@typescript-eslint/no-unsafe-call": "error",\n      "@typescript-eslint/no-unsafe-member-access": "error",\n      "@typescript-eslint/no-unsafe-return": "error",\n      "@typescript-eslint/restrict-template-expressions": "error",\n      "@typescript-eslint/switch-exhaustiveness-check": "error",\n      "no-empty": ["error", { allowEmptyCatch: false }],\n      "no-fallthrough": "error",\n      "no-implicit-coercion": "error",\n      "no-restricted-syntax": ["error", { selector: "CallExpression[callee.object.name='JSON'][callee.property.name='parse']", message: "Parse untrusted JSON only behind a named runtime boundary validator." }],\n      "vibe-engineer/no-broad-domain-map-model": "error",\n    },\n  },\n);\n`;
}
function renderPrettierConfig() {
    return `export default ${JSON.stringify(PRETTIER_DEFAULTS, null, 2)};\n`;
}
function rootTsconfigContent() {
    return stableStringify({
        $schema: "https://json.schemastore.org/tsconfig",
        compilerOptions: TYPESCRIPT_COMPILER_STRICT_OPTIONS,
    });
}
function packageTsconfigContent() {
    return stableStringify(PACKAGE_TSCONFIG_DEFAULTS);
}
function packageJsonContent() {
    return stableStringify({
        name: "generated-typescript-workspace",
        private: true,
        type: "module",
        packageManager: PNPM_DEFAULTS.packageManager,
        scripts: {
            typecheck: "pnpm --recursive run typecheck",
            lint: "pnpm --recursive run lint",
            "format:check": "prettier --check .",
            "test:unit": "pnpm --recursive run test:unit",
            build: "pnpm --recursive run build",
            "quality:quick": "pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run test:unit && pnpm run build",
        },
        devDependencies: {
            "@eslint/js": "9.39.1",
            eslint: "9.39.1",
            prettier: "3.8.4",
            turbo: "2.9.18",
            typescript: "5.9.3",
            "typescript-eslint": "8.62.0",
        },
    });
}
function packageManifestContent(packageName) {
    return stableStringify({
        name: packageName,
        private: true,
        type: "module",
        scripts: PACKAGE_SCRIPT_DEFAULTS,
    });
}
function pnpmWorkspaceContent() {
    return `packages:\n  - "${PNPM_DEFAULTS.workspaceGlobs[0]}"\n  - "${PNPM_DEFAULTS.workspaceGlobs[1]}"\n`;
}
function turboContent() {
    return stableStringify({
        $schema: "https://turbo.build/schema.json",
        tasks: TURBO_TASK_DEFAULTS.tasks,
        vibeEngineer: {
            quickGateLabel: TURBO_TASK_DEFAULTS.quickGateLabel,
            defaults: TEST_AND_TYPECHECK_DEFAULTS,
        },
    });
}
function generatedManifestContent() {
    return stableStringify({
        metadata: TYPESCRIPT_PRESET_METADATA,
        files: TYPESCRIPT_PRESET_FILE_MANIFEST,
        compilerOptions: TYPESCRIPT_COMPILER_STRICT_OPTIONS,
        eslintPolicy: ESLINT_POLICY_DEFAULTS,
        prettierDefaults: PRETTIER_DEFAULTS,
        pnpmDefaults: PNPM_DEFAULTS,
        turboDefaults: TURBO_TASK_DEFAULTS,
        packageScripts: PACKAGE_SCRIPT_DEFAULTS,
        testAndTypecheckDefaults: TEST_AND_TYPECHECK_DEFAULTS,
    });
}
function sampleSourceContent() {
    return `export interface ExampleInput {\n  readonly value: string;\n}\n\nexport function formatExampleInput(input: ExampleInput): string {\n  return input.value.toUpperCase();\n}\n`;
}
function makeRenderOptionsFinding(message, evidence) {
    return Object.freeze({
        code: "PRESET_MALFORMED_RENDER_OPTIONS",
        path: "<renderer-options>",
        message,
        blocking: true,
        evidence: Object.freeze([...evidence]),
    });
}
function renderOptionsError(message, evidence) {
    return new TypeScriptPresetOptionsError(makeRenderOptionsFinding(message, evidence));
}
function isSafePackageNameCharacter(character) {
    return (character >= "a" && character <= "z")
        || (character >= "0" && character <= "9")
        || character === "-"
        || character === ".";
}
function isSafePackageNameSegment(segment) {
    if (segment.length === 0 || segment === "." || segment === ".." || segment.startsWith(".") || segment.endsWith(".")) {
        return false;
    }
    for (const character of segment) {
        if (!isSafePackageNameCharacter(character)) {
            return false;
        }
    }
    return true;
}
function isSafePackageName(input) {
    if (input.length === 0 || input.includes(" ") || input.includes("\\") || input.includes("//")) {
        return false;
    }
    if (input === "@vibe-engineer/testing") {
        return false;
    }
    if (input.startsWith("@")) {
        const scopedParts = input.slice(1).split("/");
        return scopedParts.length === 2 && scopedParts.every(isSafePackageNameSegment);
    }
    return input.split("/").length === 1 && isSafePackageNameSegment(input);
}
function validateRenderTypeScriptPresetOptions(input) {
    if (input === undefined) {
        return { ok: true, options: { packageName: "@generated/example", packageDirectory: "packages/example", includeSampleSource: true } };
    }
    if (!isObject(input)) {
        return { ok: false, finding: makeRenderOptionsFinding("Renderer options must be an object when provided.", [String(input)]) };
    }
    const allowedKeys = new Set(["packageName", "packageDirectory", "includeSampleSource"]);
    for (const key of Object.keys(input)) {
        if (!allowedKeys.has(key)) {
            return { ok: false, finding: makeRenderOptionsFinding(`Unknown renderer option: ${key}.`, [key]) };
        }
    }
    const packageDirectoryInput = getObjectProperty(input, "packageDirectory");
    if (packageDirectoryInput !== undefined && typeof packageDirectoryInput !== "string") {
        return { ok: false, finding: makeRenderOptionsFinding("packageDirectory must be a string when provided.", [typeof packageDirectoryInput]) };
    }
    const packageDirectory = packageDirectoryInput === undefined || packageDirectoryInput.length === 0 ? "packages/example" : packageDirectoryInput;
    if (!isSafeRelativePath(packageDirectory) || packageDirectory !== "packages/example") {
        return { ok: false, finding: makeRenderOptionsFinding("packageDirectory must be the normalized preset-owned packages/example path.", [packageDirectory]) };
    }
    const packageNameInput = getObjectProperty(input, "packageName");
    if (packageNameInput !== undefined && typeof packageNameInput !== "string") {
        return { ok: false, finding: makeRenderOptionsFinding("packageName must be a string when provided.", [typeof packageNameInput]) };
    }
    const packageName = packageNameInput === undefined || packageNameInput.length === 0 ? "@generated/example" : packageNameInput;
    if (!isSafePackageName(packageName)) {
        return { ok: false, finding: makeRenderOptionsFinding("packageName is malformed or forbidden for generated production dependencies.", [packageName]) };
    }
    const includeSampleSourceInput = getObjectProperty(input, "includeSampleSource");
    if (includeSampleSourceInput !== undefined && typeof includeSampleSourceInput !== "boolean") {
        return { ok: false, finding: makeRenderOptionsFinding("includeSampleSource must be a boolean when provided.", [typeof includeSampleSourceInput]) };
    }
    return {
        ok: true,
        options: {
            packageName,
            packageDirectory,
            includeSampleSource: includeSampleSourceInput === undefined ? true : includeSampleSourceInput,
        },
    };
}
export function validateTypeScriptPresetRenderOptions(optionsInput) {
    const result = validateRenderTypeScriptPresetOptions(optionsInput);
    if (!result.ok) {
        return { ok: false, finding: result.finding };
    }
    return { ok: true, options: Object.freeze({ ...result.options }) };
}
function renderedFile(path, kind, content) {
    const manifest = TYPESCRIPT_PRESET_FILE_MANIFEST_BY_PATH.get(path);
    if (manifest === undefined) {
        throw renderOptionsError(`Missing manifest entry for generated file ${path}.`, [path]);
    }
    if (manifest.kind !== kind) {
        throw renderOptionsError(`Generated file kind does not match manifest for ${path}.`, [path, kind, manifest.kind]);
    }
    return Object.freeze({ path, kind, content, manifest });
}
export function renderTypeScriptPresetFiles(optionsInput = undefined) {
    const optionsResult = validateRenderTypeScriptPresetOptions(optionsInput);
    if (!optionsResult.ok) {
        throw new TypeScriptPresetOptionsError(optionsResult.finding);
    }
    const { packageDirectory, packageName, includeSampleSource } = optionsResult.options;
    const files = [
        renderedFile("tsconfig.base.json", "typescript-config", rootTsconfigContent()),
        renderedFile(`${packageDirectory}/tsconfig.json`, "typescript-config", packageTsconfigContent()),
        renderedFile("eslint.config.mjs", "eslint-config", renderEslintConfig()),
        renderedFile(".vibe/generated/typescript-preset/eslint-policy.json", "eslint-policy", stableStringify(ESLINT_POLICY_DEFAULTS)),
        renderedFile("prettier.config.mjs", "prettier-config", renderPrettierConfig()),
        renderedFile(".vibe/generated/typescript-preset/prettier-policy.json", "prettier-policy", stableStringify(PRETTIER_DEFAULTS)),
        renderedFile("pnpm-workspace.yaml", "workspace-config", pnpmWorkspaceContent()),
        renderedFile("turbo.json", "turbo-config", turboContent()),
        renderedFile("package.json", "package-manifest", packageJsonContent()),
        renderedFile(`${packageDirectory}/package.json`, "package-manifest", packageManifestContent(packageName)),
        renderedFile(".vibe/generated/typescript-preset/manifest.json", "preset-metadata", generatedManifestContent()),
    ];
    if (!includeSampleSource) {
        return Object.freeze(files);
    }
    return Object.freeze([...files, renderedFile(`${packageDirectory}/src/sample.ts`, "source-fixture", sampleSourceContent())]);
}
export function getTypeScriptPresetMetadata() {
    return Object.freeze({ ...TYPESCRIPT_PRESET_METADATA });
}
export function getTypeScriptPresetFileManifest() {
    return Object.freeze(TYPESCRIPT_PRESET_FILE_MANIFEST.map((entry) => Object.freeze({
        ...entry,
        requiredStandardIds: Object.freeze([...entry.requiredStandardIds]),
    })));
}
function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function getObjectProperty(source, key) {
    return source[key];
}
function parseJsonObject(content, path, findings) {
    let parsed;
    try {
        parsed = JSON.parse(content);
    }
    catch (error) {
        findings.push(makeFinding("PRESET_MALFORMED_JSON", path, "Generated JSON content is malformed.", [error instanceof Error ? error.message : "unknown parse error"]));
        return undefined;
    }
    if (!isObject(parsed)) {
        findings.push(makeFinding("PRESET_MALFORMED_JSON", path, "Generated JSON content must be an object.", []));
        return undefined;
    }
    return parsed;
}
function makeFinding(code, path, message, evidence) {
    return Object.freeze({ code, path, message, blocking: true, evidence: Object.freeze([...evidence]) });
}
function isSafeRelativePath(path) {
    if (path.length === 0 || path.startsWith("/") || path.startsWith("\\") || path.includes("\\")) {
        return false;
    }
    const segments = path.split("/");
    return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}
function validatePath(path, seen, findings) {
    if (!isSafeRelativePath(path)) {
        findings.push(makeFinding("PRESET_UNSAFE_GENERATED_PATH", path, "Generated file path must be normalized, relative, and contained inside the target root.", [path]));
    }
    if (seen.has(path)) {
        findings.push(makeFinding("PRESET_DUPLICATE_GENERATED_PATH", path, "Generated file path appears more than once.", [path]));
    }
    seen.add(path);
}
function validateStrictTsconfig(content, path, findings) {
    if (content === undefined) {
        findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required strict tsconfig file is missing.", []));
        return;
    }
    const root = parseJsonObject(content, path, findings);
    if (root === undefined)
        return;
    const compilerOptions = getObjectProperty(root, "compilerOptions");
    if (!isObject(compilerOptions)) {
        findings.push(makeFinding("PRESET_STRICT_FLAG_WEAKENED", path, "tsconfig compilerOptions object is missing.", []));
        return;
    }
    for (const flag of REQUIRED_STRICT_TRUE_FLAGS) {
        if (getObjectProperty(compilerOptions, flag) !== true) {
            findings.push(makeFinding("PRESET_STRICT_FLAG_WEAKENED", path, `Required TypeScript flag must be true: ${flag}.`, [flag]));
        }
    }
    for (const flag of REQUIRED_STRICT_FALSE_FLAGS) {
        if (getObjectProperty(compilerOptions, flag) !== false) {
            findings.push(makeFinding("PRESET_STRICT_FLAG_WEAKENED", path, `Required TypeScript flag must be false: ${flag}.`, [flag]));
        }
    }
    if (getObjectProperty(compilerOptions, "module") !== "NodeNext" || getObjectProperty(compilerOptions, "moduleResolution") !== "NodeNext") {
        findings.push(makeFinding("PRESET_STRICT_FLAG_WEAKENED", path, "TypeScript module and moduleResolution must both be NodeNext.", []));
    }
}
function validatePackageTsconfig(content, path, findings) {
    if (content === undefined) {
        findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required package tsconfig is missing.", []));
        return;
    }
    const root = parseJsonObject(content, path, findings);
    if (root === undefined)
        return;
    if (getObjectProperty(root, "extends") !== "../../tsconfig.base.json") {
        findings.push(makeFinding("PRESET_PACKAGE_TSCONFIG_WEAKENED", path, "Package tsconfig must extend ../../tsconfig.base.json.", []));
    }
    const compilerOptions = getObjectProperty(root, "compilerOptions");
    if (isObject(compilerOptions)) {
        for (const flag of [...REQUIRED_STRICT_TRUE_FLAGS, ...REQUIRED_STRICT_FALSE_FLAGS]) {
            if (Object.hasOwn(compilerOptions, flag)) {
                findings.push(makeFinding("PRESET_PACKAGE_TSCONFIG_WEAKENED", path, `Package tsconfig must not override strict base flag: ${flag}.`, [flag]));
            }
        }
    }
}
function validateEslintPolicy(content, path, findings) {
    if (content === undefined) {
        findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required ESLint policy file is missing.", []));
        return;
    }
    const policy = parseJsonObject(content, path, findings);
    if (policy === undefined)
        return;
    const rules = getObjectProperty(policy, "rules");
    if (!Array.isArray(rules)) {
        findings.push(makeFinding("PRESET_ESLINT_RULE_MISSING", path, "ESLint policy rules array is missing.", []));
        return;
    }
    const ruleNames = new Set();
    for (const rule of rules) {
        if (isObject(rule)) {
            const name = getObjectProperty(rule, "name");
            const severity = getObjectProperty(rule, "severity");
            if (typeof name === "string" && severity === "error") {
                ruleNames.add(name);
            }
        }
    }
    for (const requiredRule of REQUIRED_ESLINT_RULES) {
        if (!ruleNames.has(requiredRule)) {
            findings.push(makeFinding("PRESET_ESLINT_RULE_MISSING", path, `Required ESLint policy rule is missing: ${requiredRule}.`, [requiredRule]));
        }
    }
    const boundaryRules = getObjectProperty(policy, "boundaryRules");
    if (!isObject(boundaryRules)
        || getObjectProperty(boundaryRules, "rawJsonParseRequiresNamedBoundary") !== true
        || getObjectProperty(boundaryRules, "broadDomainMapModelsForbidden") !== true) {
        findings.push(makeFinding("PRESET_ESLINT_RULE_MISSING", path, "ESLint boundary rules for JSON.parse and broad domain map models are required.", []));
    }
}
function validatePrettierPolicy(content, path, findings) {
    if (content === undefined) {
        findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required Prettier policy file is missing.", []));
        return;
    }
    const policy = parseJsonObject(content, path, findings);
    if (policy === undefined)
        return;
    const expectedEntries = Object.entries(PRETTIER_DEFAULTS);
    for (const [key, expected] of expectedEntries) {
        if (getObjectProperty(policy, key) !== expected) {
            findings.push(makeFinding("PRESET_PRETTIER_DEFAULT_MISSING", path, `Required Prettier default is missing or weakened: ${key}.`, [key]));
        }
    }
}
function validateEslintConfig(content, path, findings) {
    if (content === undefined) {
        findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required actual ESLint config file is missing.", []));
        return;
    }
    const expected = renderEslintConfig();
    if (content !== expected) {
        const missingRules = REQUIRED_ESLINT_RULES.filter((rule) => !content.includes(`"${rule}"`));
        findings.push(makeFinding("PRESET_ESLINT_RULE_MISSING", path, "Actual generated ESLint config must exactly match the typed strict ESLint config contract.", missingRules.length === 0 ? ["content-mismatch"] : missingRules));
    }
}
function validatePrettierConfig(content, path, findings) {
    if (content === undefined) {
        findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required actual Prettier config file is missing.", []));
        return;
    }
    const expected = renderPrettierConfig();
    if (content !== expected) {
        findings.push(makeFinding("PRESET_PRETTIER_DEFAULT_MISSING", path, "Actual generated Prettier config must exactly match the typed deterministic Prettier defaults contract.", ["content-mismatch"]));
    }
}
function commandTokens(command) {
    const tokens = [];
    let current = "";
    const separators = new Set([" ", "\n", "\r", "\t", "&", "|", ";", "(", ")", "\"", "'"]);
    for (const character of command.toLowerCase()) {
        if (separators.has(character)) {
            if (current.length > 0) {
                tokens.push(current);
                current = "";
            }
        }
        else {
            current = `${current}${character}`;
        }
    }
    if (current.length > 0) {
        tokens.push(current);
    }
    return Object.freeze(tokens);
}
function commandHasForbiddenToken(command) {
    const lower = command.toLowerCase();
    for (const phrase of ["pulumi up", "pulumi deploy", "pulumi destroy"]) {
        if (lower.includes(phrase)) {
            return phrase;
        }
    }
    for (const token of commandTokens(command)) {
        if (token === "deploy"
            || token === "publish"
            || token === "auto-deploy"
            || token === "pulumi:deploy"
            || token.startsWith("deploy:")
            || token.endsWith(":deploy")
            || token.includes(":deploy:")
            || token.startsWith("publish:")
            || token.endsWith(":publish")
            || token.includes(":publish:")) {
            return token;
        }
        for (const term of FORBIDDEN_QUICK_COMMAND_TERMS) {
            if (term !== "deploy" && term !== "publish" && token.includes(term)) {
                return term;
            }
        }
    }
    return undefined;
}
function collectCommandStrings(value, commands) {
    if (typeof value === "string") {
        commands.push(value);
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            collectCommandStrings(item, commands);
        }
        return;
    }
    if (isObject(value)) {
        for (const entryValue of Object.values(value)) {
            collectCommandStrings(entryValue, commands);
        }
    }
}
function validateQuickGate(content, path, findings) {
    if (content === undefined) {
        findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required quick-gate carrier is missing.", []));
        return;
    }
    if (!content.includes("quality:quick")) {
        findings.push(makeFinding("PRESET_QUICK_GATE_LABEL_MISSING", path, "Generated scripts/tasks must include the quality:quick quick-gate label.", []));
    }
    const commands = [];
    const parsed = parseJsonObject(content, path, findings);
    if (parsed !== undefined) {
        collectCommandStrings(parsed, commands);
    }
    else {
        commands.push(content);
    }
    for (const command of commands) {
        const forbidden = commandHasForbiddenToken(command);
        if (forbidden !== undefined) {
            findings.push(makeFinding("PRESET_FORBIDDEN_DEFAULT_COMMAND", path, "Default quick/local commands must not run full E2E, mobile, visual, deploy, publish, or Pulumi mutation.", [forbidden, command]));
        }
    }
}
function validateDomainNeutralText(files, findings) {
    for (const file of files) {
        const negativeFixture = file.path.includes("negative") || file.path.includes("forbidden-domain");
        if (negativeFixture)
            continue;
        for (const term of FORBIDDEN_DOMAIN_TERMS) {
            if (file.content.includes(term)) {
                findings.push(makeFinding("PRESET_DOMAIN_SPECIFIC_CORE_TEXT", file.path, "Core TypeScript preset output must remain domain-neutral.", [term]));
            }
        }
    }
}
function stringArrayProperty(source, key) {
    const value = getObjectProperty(source, key);
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
        return undefined;
    }
    return value;
}
function arraysEqual(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}
function validateManifestEntryContract(actual, expected, path, findings) {
    const outputPath = getObjectProperty(actual, "outputPath");
    const kind = getObjectProperty(actual, "kind");
    const ownership = getObjectProperty(actual, "ownership");
    const requiredStandardIds = stringArrayProperty(actual, "requiredStandardIds");
    const consumerNotes = getObjectProperty(actual, "consumerNotes");
    if (outputPath !== expected.outputPath
        || kind !== expected.kind
        || ownership !== expected.ownership
        || requiredStandardIds === undefined
        || requiredStandardIds.length === 0
        || !arraysEqual(requiredStandardIds, expected.requiredStandardIds)
        || consumerNotes !== expected.consumerNotes) {
        findings.push(makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, `Generated manifest metadata must exactly match the authoritative path contract for ${expected.outputPath}.`, [expected.outputPath]));
    }
}
function validateManifestContent(content, path, findings) {
    if (content === undefined) {
        findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required generated preset manifest is missing.", []));
        return;
    }
    const manifest = parseJsonObject(content, path, findings);
    if (manifest === undefined)
        return;
    const metadata = getObjectProperty(manifest, "metadata");
    const files = getObjectProperty(manifest, "files");
    if (!isObject(metadata) || getObjectProperty(metadata, "presetId") !== TYPE_SCRIPT_PRESET_ID || !Array.isArray(files)) {
        findings.push(makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, "Generated manifest metadata/files contract does not match the preset API.", []));
        return;
    }
    const manifestPaths = new Set();
    for (const entry of files) {
        if (!isObject(entry)) {
            findings.push(makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, "Generated manifest file entry must be an object with required metadata.", []));
            continue;
        }
        const outputPath = getObjectProperty(entry, "outputPath");
        if (typeof outputPath !== "string") {
            findings.push(makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, "Generated manifest file entry is missing outputPath.", []));
            continue;
        }
        if (manifestPaths.has(outputPath)) {
            findings.push(makeFinding("PRESET_DUPLICATE_GENERATED_PATH", path, `Generated manifest contains a duplicate output path: ${outputPath}.`, [outputPath]));
        }
        manifestPaths.add(outputPath);
        const expected = TYPESCRIPT_PRESET_FILE_MANIFEST_BY_PATH.get(outputPath);
        if (expected === undefined) {
            findings.push(makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, `Generated manifest contains unknown output path: ${outputPath}.`, [outputPath]));
            continue;
        }
        validateManifestEntryContract(entry, expected, path, findings);
    }
    for (const required of TYPESCRIPT_PRESET_FILE_MANIFEST) {
        if (!manifestPaths.has(required.outputPath)) {
            findings.push(makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, `Generated manifest omits required output path: ${required.outputPath}.`, [required.outputPath]));
        }
    }
}
function validatePackageManifest(content, path, findings) {
    if (content === undefined) {
        findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required package manifest is missing.", []));
        return;
    }
    const manifest = parseJsonObject(content, path, findings);
    if (manifest === undefined)
        return;
    for (const dependencyField of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
        const dependencies = getObjectProperty(manifest, dependencyField);
        if (!isObject(dependencies))
            continue;
        if (getObjectProperty(dependencies, "@vibe-engineer/testing") !== undefined && dependencyField === "dependencies") {
            findings.push(makeFinding("PRESET_FORBIDDEN_TESTING_PRODUCTION_DEPENDENCY", path, "Generated production dependencies must not include @vibe-engineer/testing.", [dependencyField]));
        }
    }
}
export function validateTypeScriptPresetFiles(filesInput) {
    const findings = [];
    if (!Array.isArray(filesInput)) {
        findings.push(makeFinding("PRESET_MALFORMED_RENDER_OPTIONS", "", "Validator input must be an array of generated preset files.", []));
        return { ok: false, findings: Object.freeze(findings), fileCount: 0 };
    }
    const files = [];
    for (const item of filesInput) {
        if (!isObject(item)) {
            findings.push(makeFinding("PRESET_MALFORMED_RENDER_OPTIONS", "", "Generated preset file entry must be an object.", []));
            continue;
        }
        const path = getObjectProperty(item, "path");
        const kind = getObjectProperty(item, "kind");
        const content = getObjectProperty(item, "content");
        const manifest = getObjectProperty(item, "manifest");
        if (typeof path !== "string" || typeof kind !== "string" || typeof content !== "string" || !isObject(manifest)) {
            findings.push(makeFinding("PRESET_MALFORMED_RENDER_OPTIONS", "", "Generated preset file entry has malformed path, kind, content, or manifest.", []));
            continue;
        }
        const expectedManifest = TYPESCRIPT_PRESET_FILE_MANIFEST_BY_PATH.get(path);
        if (expectedManifest === undefined) {
            findings.push(makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, "Generated file path is not declared in the authoritative preset manifest.", [path]));
        }
        else {
            if (kind !== expectedManifest.kind) {
                findings.push(makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, "Generated file kind must match the authoritative manifest for its exact path.", [kind, expectedManifest.kind]));
            }
            validateManifestEntryContract(manifest, expectedManifest, path, findings);
        }
        files.push({ path, content });
    }
    const seen = new Set();
    const byPath = new Map();
    for (const file of files) {
        validatePath(file.path, seen, findings);
        byPath.set(file.path, file.content);
    }
    for (const requiredPath of REQUIRED_FILE_PATHS) {
        if (!byPath.has(requiredPath)) {
            findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", requiredPath, "Required generated file is missing.", [requiredPath]));
        }
    }
    validateStrictTsconfig(byPath.get("tsconfig.base.json"), "tsconfig.base.json", findings);
    validatePackageTsconfig(byPath.get("packages/example/tsconfig.json"), "packages/example/tsconfig.json", findings);
    validateEslintConfig(byPath.get("eslint.config.mjs"), "eslint.config.mjs", findings);
    validateEslintPolicy(byPath.get(".vibe/generated/typescript-preset/eslint-policy.json"), ".vibe/generated/typescript-preset/eslint-policy.json", findings);
    validatePrettierConfig(byPath.get("prettier.config.mjs"), "prettier.config.mjs", findings);
    validatePrettierPolicy(byPath.get(".vibe/generated/typescript-preset/prettier-policy.json"), ".vibe/generated/typescript-preset/prettier-policy.json", findings);
    validateQuickGate(byPath.get("package.json"), "package.json", findings);
    validateQuickGate(byPath.get("turbo.json"), "turbo.json", findings);
    validatePackageManifest(byPath.get("package.json"), "package.json", findings);
    validatePackageManifest(byPath.get("packages/example/package.json"), "packages/example/package.json", findings);
    validateManifestContent(byPath.get(".vibe/generated/typescript-preset/manifest.json"), ".vibe/generated/typescript-preset/manifest.json", findings);
    validateDomainNeutralText(files, findings);
    if (findings.length > 0) {
        return { ok: false, findings: Object.freeze(findings), fileCount: files.length };
    }
    return { ok: true, findings: Object.freeze([]), fileCount: files.length };
}
//# sourceMappingURL=index.js.map