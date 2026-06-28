export declare const TYPE_SCRIPT_PRESET_ID = "vibe-engineer.typescript.strict";
export declare const TYPE_SCRIPT_PRESET_NAME = "Vibe Engineer TypeScript Strict Preset";
export declare const TYPE_SCRIPT_PRESET_VERSION = "1.0.0";
export type PresetFileKind = "typescript-config" | "eslint-config" | "eslint-policy" | "prettier-config" | "prettier-policy" | "package-manifest" | "workspace-config" | "turbo-config" | "preset-metadata" | "source-fixture";
export type PresetFileOwnership = "generated-owned";
export type StandardId = "typed-boundary-contracts" | "real-boundary-witnesses" | "domain-neutral-core" | "dirty-tree-ownership" | "report-first-evidence" | "dependency-hygiene" | "deterministic-schematics";
export interface TypeScriptPresetMetadata {
    readonly presetId: typeof TYPE_SCRIPT_PRESET_ID;
    readonly name: typeof TYPE_SCRIPT_PRESET_NAME;
    readonly version: typeof TYPE_SCRIPT_PRESET_VERSION;
    readonly packageName: "@vibe-engineer/preset-typescript";
    readonly private: true;
    readonly domainNeutral: true;
    readonly quickGateLabel: "quality:quick";
}
export interface TypeScriptCompilerStrictOptions {
    readonly target: "ES2022";
    readonly lib: readonly string[];
    readonly module: "NodeNext";
    readonly moduleResolution: "NodeNext";
    readonly strict: true;
    readonly noImplicitAny: true;
    readonly strictNullChecks: true;
    readonly strictFunctionTypes: true;
    readonly strictBindCallApply: true;
    readonly strictPropertyInitialization: true;
    readonly noImplicitThis: true;
    readonly alwaysStrict: true;
    readonly exactOptionalPropertyTypes: true;
    readonly noUncheckedIndexedAccess: true;
    readonly noImplicitOverride: true;
    readonly noImplicitReturns: true;
    readonly noPropertyAccessFromIndexSignature: true;
    readonly useUnknownInCatchVariables: true;
    readonly noFallthroughCasesInSwitch: true;
    readonly noUnusedLocals: true;
    readonly noUnusedParameters: true;
    readonly allowUnreachableCode: false;
    readonly allowUnusedLabels: false;
    readonly isolatedModules: true;
    readonly verbatimModuleSyntax: true;
    readonly forceConsistentCasingInFileNames: true;
    readonly resolveJsonModule: true;
    readonly noEmitOnError: true;
    readonly skipLibCheck: false;
}
export interface PackageTsConfigModel {
    readonly extends: "../../tsconfig.base.json";
    readonly compilerOptions: {
        readonly rootDir: "src";
        readonly outDir: "dist";
        readonly declaration: true;
        readonly declarationMap: true;
        readonly sourceMap: true;
        readonly noEmit: false;
    };
    readonly include: readonly string[];
}
export type EslintSeverity = "error";
export interface EslintRuleSetting {
    readonly name: string;
    readonly severity: EslintSeverity;
    readonly purpose: string;
}
export interface EslintPolicyDefaults {
    readonly configFile: "eslint.config.mjs";
    readonly rules: readonly EslintRuleSetting[];
    readonly boundaryRules: {
        readonly rawJsonParseRequiresNamedBoundary: true;
        readonly broadDomainMapModelsForbidden: true;
    };
}
export interface PrettierDefaults {
    readonly printWidth: 100;
    readonly semi: true;
    readonly singleQuote: false;
    readonly trailingComma: "all";
    readonly arrowParens: "always";
    readonly bracketSpacing: true;
    readonly endOfLine: "lf";
}
export interface PnpmDefaults {
    readonly workspaceGlobs: readonly string[];
    readonly packageManager: "pnpm@10.33.0";
}
export interface TurboTaskDefaults {
    readonly quickGateLabel: "quality:quick";
    readonly tasks: {
        readonly typecheck: {
            readonly dependsOn: readonly string[];
            readonly outputs: readonly string[];
        };
        readonly lint: {
            readonly dependsOn: readonly string[];
            readonly outputs: readonly string[];
        };
        readonly "format:check": {
            readonly outputs: readonly string[];
        };
        readonly "test:unit": {
            readonly dependsOn: readonly string[];
            readonly outputs: readonly string[];
        };
        readonly build: {
            readonly dependsOn: readonly string[];
            readonly outputs: readonly string[];
        };
        readonly "quality:quick": {
            readonly dependsOn: readonly string[];
            readonly outputs: readonly string[];
        };
    };
}
export interface PackageScriptDefaults {
    readonly typecheck: "tsc --noEmit -p tsconfig.json";
    readonly lint: "eslint .";
    readonly "format:check": "prettier --check .";
    readonly "test:unit": "tsx --test \"test/**/*.test.ts\"";
    readonly build: "tsc -p tsconfig.json";
    readonly "quality:quick": "pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run test:unit && pnpm run build";
}
export interface TestAndTypecheckDefaults {
    readonly typecheckCommand: "pnpm run typecheck";
    readonly unitTestCommand: "pnpm run test:unit";
    readonly quickGateCommand: "pnpm run quality:quick";
    readonly defaultFullE2E: false;
    readonly defaultFullMobileE2E: false;
    readonly defaultFullVisualVerification: false;
    readonly defaultAutoDeploy: false;
}
export interface GeneratedFileManifestEntry {
    readonly outputPath: string;
    readonly kind: PresetFileKind;
    readonly ownership: PresetFileOwnership;
    readonly requiredStandardIds: readonly StandardId[];
    readonly consumerNotes: string;
}
export interface GeneratedPresetFile {
    readonly path: string;
    readonly kind: PresetFileKind;
    readonly content: string;
    readonly manifest: GeneratedFileManifestEntry;
}
export interface RenderTypeScriptPresetOptions {
    readonly packageName?: string;
    readonly packageDirectory?: string;
    readonly includeSampleSource?: boolean;
}
export type RenderTypeScriptPresetOptionsValidationResult = {
    readonly ok: true;
    readonly options: Required<RenderTypeScriptPresetOptions>;
} | {
    readonly ok: false;
    readonly finding: TypeScriptPresetFinding;
};
export type TypeScriptPresetFindingCode = "PRESET_MALFORMED_RENDER_OPTIONS" | "PRESET_UNSAFE_GENERATED_PATH" | "PRESET_DUPLICATE_GENERATED_PATH" | "PRESET_MISSING_REQUIRED_FILE" | "PRESET_MALFORMED_JSON" | "PRESET_STRICT_FLAG_WEAKENED" | "PRESET_PACKAGE_TSCONFIG_WEAKENED" | "PRESET_ESLINT_RULE_MISSING" | "PRESET_PRETTIER_DEFAULT_MISSING" | "PRESET_QUICK_GATE_LABEL_MISSING" | "PRESET_FORBIDDEN_DEFAULT_COMMAND" | "PRESET_DOMAIN_SPECIFIC_CORE_TEXT" | "PRESET_MANIFEST_CONTENT_MISMATCH" | "PRESET_FORBIDDEN_TESTING_PRODUCTION_DEPENDENCY";
export interface TypeScriptPresetFinding {
    readonly code: TypeScriptPresetFindingCode;
    readonly path: string;
    readonly message: string;
    readonly blocking: true;
    readonly evidence: readonly string[];
}
export type TypeScriptPresetValidationResult = {
    readonly ok: true;
    readonly findings: readonly [];
    readonly fileCount: number;
} | {
    readonly ok: false;
    readonly findings: readonly TypeScriptPresetFinding[];
    readonly fileCount: number;
};
export declare class TypeScriptPresetOptionsError extends Error {
    readonly code: "PRESET_MALFORMED_RENDER_OPTIONS";
    readonly finding: TypeScriptPresetFinding;
    constructor(finding: TypeScriptPresetFinding);
}
export declare const TYPESCRIPT_PRESET_METADATA: TypeScriptPresetMetadata;
export declare const TYPESCRIPT_COMPILER_STRICT_OPTIONS: TypeScriptCompilerStrictOptions;
export declare const PACKAGE_TSCONFIG_DEFAULTS: PackageTsConfigModel;
export declare const ESLINT_POLICY_DEFAULTS: EslintPolicyDefaults;
export declare const PRETTIER_DEFAULTS: PrettierDefaults;
export declare const PNPM_DEFAULTS: PnpmDefaults;
export declare const TURBO_TASK_DEFAULTS: TurboTaskDefaults;
export declare const PACKAGE_SCRIPT_DEFAULTS: PackageScriptDefaults;
export declare const TEST_AND_TYPECHECK_DEFAULTS: TestAndTypecheckDefaults;
export declare const TYPESCRIPT_PRESET_FILE_MANIFEST: readonly GeneratedFileManifestEntry[];
export declare function validateTypeScriptPresetRenderOptions(optionsInput: unknown): RenderTypeScriptPresetOptionsValidationResult;
export declare function renderTypeScriptPresetFiles(): readonly GeneratedPresetFile[];
export declare function renderTypeScriptPresetFiles(options: RenderTypeScriptPresetOptions): readonly GeneratedPresetFile[];
export declare function getTypeScriptPresetMetadata(): TypeScriptPresetMetadata;
export declare function getTypeScriptPresetFileManifest(): readonly GeneratedFileManifestEntry[];
export declare function validateTypeScriptPresetFiles(filesInput: unknown): TypeScriptPresetValidationResult;
//# sourceMappingURL=index.d.ts.map