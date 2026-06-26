export const TYPE_SCRIPT_PRESET_ID = "vibe-engineer.typescript.strict";
export const TYPE_SCRIPT_PRESET_NAME = "Vibe Engineer TypeScript Strict Preset";
export const TYPE_SCRIPT_PRESET_VERSION = "1.0.0";
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
    "mobile:e2e:full",
    "full:mobile",
    "visual:full",
    "ui:visual:full",
    "auto-deploy",
    "deploy:prod",
    "pulumi up",
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
function normalizePackageDirectory(input) {
    if (input === undefined || input.length === 0) {
        return "packages/example";
    }
    if (!isSafeRelativePath(input) || input !== "packages/example") {
        throw new Error("packageDirectory must be the preset-owned packages/example fixture path in this lane.");
    }
    return input;
}
function normalizePackageName(input) {
    if (input === undefined || input.length === 0) {
        return "@generated/example";
    }
    if (input.includes("@vibe-engineer/testing") || input.includes(" ")) {
        throw new Error("packageName is malformed or forbidden for this preset.");
    }
    return input;
}
function renderedFile(path, kind, content) {
    const manifest = TYPESCRIPT_PRESET_FILE_MANIFEST.find((entry) => entry.outputPath === path);
    if (manifest === undefined) {
        throw new Error(`Missing manifest entry for generated file ${path}.`);
    }
    return Object.freeze({ path, kind, content, manifest });
}
export function renderTypeScriptPresetFiles(options = {}) {
    const packageDirectory = normalizePackageDirectory(options.packageDirectory);
    const packageName = normalizePackageName(options.packageName);
    const includeSampleSource = options.includeSampleSource ?? true;
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
function validateQuickGate(content, path, findings) {
    if (content === undefined) {
        findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required quick-gate carrier is missing.", []));
        return;
    }
    if (!content.includes("quality:quick")) {
        findings.push(makeFinding("PRESET_QUICK_GATE_LABEL_MISSING", path, "Generated scripts/tasks must include the quality:quick quick-gate label.", []));
    }
    for (const term of FORBIDDEN_QUICK_COMMAND_TERMS) {
        if (content.toLowerCase().includes(term.toLowerCase())) {
            findings.push(makeFinding("PRESET_FORBIDDEN_DEFAULT_COMMAND", path, "Default quick/local commands must not run full E2E, mobile, visual, deploy, publish, or Pulumi mutation.", [term]));
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
        if (isObject(entry)) {
            const outputPath = getObjectProperty(entry, "outputPath");
            if (typeof outputPath === "string") {
                manifestPaths.add(outputPath);
            }
        }
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
        const manifestOutputPath = getObjectProperty(manifest, "outputPath");
        if (manifestOutputPath !== path) {
            findings.push(makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, "Generated file manifest outputPath must match file path.", []));
        }
        if (!TYPESCRIPT_PRESET_FILE_MANIFEST.some((entry) => entry.kind === kind)) {
            findings.push(makeFinding("PRESET_MALFORMED_RENDER_OPTIONS", path, "Generated preset file entry has an unknown kind.", [kind]));
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
    validateEslintPolicy(byPath.get(".vibe/generated/typescript-preset/eslint-policy.json"), ".vibe/generated/typescript-preset/eslint-policy.json", findings);
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