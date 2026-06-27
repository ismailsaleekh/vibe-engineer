/**
 * @vibe-engineer/preset-nest-react-rn
 *
 * Reference starter preset for the locked DL-16 NestJS / React / React Native
 * monorepo. This preset is a typed CONTRACT: it declares the locked DL-16
 * layout (app/package names, scope, golden module, .vibe//.tooling areas) and
 * derives its strict TypeScript / pnpm / Turborepo / ESLint / Prettier / test
 * defaults from the consumed {@link @vibe-engineer/preset-typescript} public
 * export. It does NOT duplicate I-07D content: every strict default referenced
 * by a rendered file is the live imported value from the TypeScript preset.
 *
 * The preset is consumed by the I-15B-2 reference source-template monorepo;
 * the I-15B-3 harness-consumption witness proves the generated starter imports
 * the `vibe-engineer` harness package. This sub-lane owns the preset only.
 */
import { ESLINT_POLICY_DEFAULTS, PACKAGE_SCRIPT_DEFAULTS, PNPM_DEFAULTS, PRETTIER_DEFAULTS, TEST_AND_TYPECHECK_DEFAULTS, TURBO_TASK_DEFAULTS, TYPESCRIPT_COMPILER_STRICT_OPTIONS, TYPE_SCRIPT_PRESET_ID, type PresetFileKind, type StandardId } from "@vibe-engineer/preset-typescript";
export declare const NEST_REACT_RN_PRESET_ID = "vibe-engineer.nest-react-rn.starter";
export declare const NEST_REACT_RN_PRESET_NAME = "Vibe Engineer NestJS / React / React Native Starter Preset";
export declare const NEST_REACT_RN_PRESET_VERSION = "1.0.0";
export declare const CONSUMED_TYPESCRIPT_PRESET_ID = "vibe-engineer.typescript.strict";
export interface NestReactRnPresetMetadata {
    readonly presetId: typeof NEST_REACT_RN_PRESET_ID;
    readonly name: typeof NEST_REACT_RN_PRESET_NAME;
    readonly version: typeof NEST_REACT_RN_PRESET_VERSION;
    readonly packageName: "@vibe-engineer/preset-nest-react-rn";
    readonly architectureDecision: "DL-16-starter-architecture";
    readonly domainNeutral: true;
    readonly consumedTypescriptPresetId: typeof TYPE_SCRIPT_PRESET_ID;
    readonly quickGateLabel: "quality:quick";
}
export type StarterAppId = "api" | "web" | "mobile";
export type StarterPackageName = "domain" | "contracts" | "api-client" | "config" | "testing" | "ui";
export type StarterGoldenModule = "golden-records";
export type StarterScope = "@vibe-engineer-starter";
export type StarterWorkspaceName = "@vibe-engineer-starter/workspace";
export type VibeContextArea = "context" | "work" | "evidence" | "registry";
export type ToolingArea = "scripts" | "dev-services" | "ci" | "generated";
export type StarterAgenticHarness = "pi";
export type GoldenRecordStatus = "draft" | "active" | "archived";
export interface StarterAppDescriptor {
    readonly id: StarterAppId;
    readonly directory: `apps/${StarterAppId}`;
    readonly packageName: `@vibe-engineer-starter/${StarterAppId}`;
    readonly framework: "NestJS" | "React" | "React Native";
    readonly goldenRouteOrScreen: "golden-records";
}
export interface StarterPackageDescriptor {
    readonly name: StarterPackageName;
    readonly directory: `packages/${StarterPackageName}`;
    readonly packageName: `@vibe-engineer-starter/${StarterPackageName}`;
    readonly boundaryRule: string;
    readonly forbiddenImports: readonly string[];
}
export interface StarterLayoutDeclaration {
    readonly scope: StarterScope;
    readonly workspaceName: StarterWorkspaceName;
    readonly architectureDecision: "DL-16-starter-architecture";
    readonly apps: readonly StarterAppDescriptor[];
    readonly packages: readonly StarterPackageDescriptor[];
    readonly vibeAreas: readonly VibeContextArea[];
    readonly toolingAreas: readonly ToolingArea[];
    readonly goldenModule: StarterGoldenModule;
    readonly authStance: "no-auth";
    readonly persistence: "PostgreSQL + Prisma";
    readonly contractMechanism: "ts-rest + named Zod schemas";
    readonly agenticHarness: StarterAgenticHarness;
}
export declare const STARTER_APPS: readonly StarterAppDescriptor[];
export declare const STARTER_PACKAGES: readonly StarterPackageDescriptor[];
export declare const STARTER_VIBE_AREAS: readonly VibeContextArea[];
export declare const STARTER_TOOLING_AREAS: readonly ToolingArea[];
export declare const STARTER_LAYOUT: StarterLayoutDeclaration;
export declare function getStarterLayoutDeclaration(): StarterLayoutDeclaration;
/**
 * The strict TypeScript compiler options the starter inherits. These are the
 * LIVE imported values from the consumed I-07D preset, not duplicated literals.
 * A rendered starter tsconfig.base.json whose compilerOptions does not deep-equal
 * this object is a PRESET_TS_DEFAULTS_DRIFT finding.
 */
export declare const STARTER_COMPILER_STRICT_OPTIONS: typeof TYPESCRIPT_COMPILER_STRICT_OPTIONS;
export declare const STARTER_ESLINT_POLICY: typeof ESLINT_POLICY_DEFAULTS;
export declare const STARTER_PRETTIER_DEFAULTS: typeof PRETTIER_DEFAULTS;
export declare const STARTER_PNPM_DEFAULTS: typeof PNPM_DEFAULTS;
export declare const STARTER_TURBO_TASK_DEFAULTS: typeof TURBO_TASK_DEFAULTS;
export declare const STARTER_PACKAGE_SCRIPT_DEFAULTS: typeof PACKAGE_SCRIPT_DEFAULTS;
export declare const STARTER_TEST_AND_TYPECHECK_DEFAULTS: typeof TEST_AND_TYPECHECK_DEFAULTS;
export type NestReactRnPresetFileKind = PresetFileKind | "app-manifest" | "app-tsconfig" | "package-tsconfig" | "harness-config-placeholder" | "context-placeholder" | "dev-service-config" | "sample-demo-source";
export type NestReactRnPresetFileOwnership = "generated-owned";
export interface NestReactRnGeneratedFileManifestEntry {
    readonly outputPath: string;
    readonly kind: NestReactRnPresetFileKind;
    readonly ownership: NestReactRnPresetFileOwnership;
    readonly requiredStandardIds: readonly StandardId[];
    readonly consumerNotes: string;
}
export interface GeneratedNestReactRnPresetFile {
    readonly path: string;
    readonly kind: NestReactRnPresetFileKind;
    readonly content: string;
    readonly manifest: NestReactRnGeneratedFileManifestEntry;
}
export type NestReactRnPresetFindingCode = "PRESET_MALFORMED_RENDER_OPTIONS" | "PRESET_UNSAFE_GENERATED_PATH" | "PRESET_DUPLICATE_GENERATED_PATH" | "PRESET_MISSING_REQUIRED_FILE" | "PRESET_MALFORMED_JSON" | "PRESET_TS_DEFAULTS_DRIFT" | "PRESET_PACKAGE_TSCONFIG_WEAKENED" | "PRESET_LAYOUT_INFIDELITY" | "PRESET_DOMAIN_SPECIFIC_CORE_TEXT" | "PRESET_COPIED_HARNESS_LOGIC" | "PRESET_PRIVATE_SCOPED_IMPORT" | "PRESET_NON_PI_HARNESS" | "PRESET_FORBIDDEN_DEFAULT_COMMAND" | "PRESET_MANIFEST_CONTENT_MISMATCH" | "PRESET_GOLDEN_MODULE_NOT_LABELED";
export interface NestReactRnPresetFinding {
    readonly code: NestReactRnPresetFindingCode;
    readonly path: string;
    readonly message: string;
    readonly blocking: true;
    readonly evidence: readonly string[];
}
export type NestReactRnPresetValidationResult = {
    readonly ok: true;
    readonly findings: readonly [];
    readonly fileCount: number;
} | {
    readonly ok: false;
    readonly findings: readonly NestReactRnPresetFinding[];
    readonly fileCount: number;
};
export declare class NestReactRnPresetOptionsError extends Error {
    readonly code: "PRESET_MALFORMED_RENDER_OPTIONS";
    readonly finding: NestReactRnPresetFinding;
    constructor(finding: NestReactRnPresetFinding);
}
export declare const FORBIDDEN_DOMAIN_TERMS: readonly string[];
/**
 * The locked file set this preset materializes for the I-15B-2 reference
 * source-template. Every entry is a DL-16-faithful skeleton derived from the
 * consumed TypeScript preset defaults.
 */
export declare const NEST_REACT_RN_PRESET_FILE_MANIFEST: readonly NestReactRnGeneratedFileManifestEntry[];
export declare const NEST_REACT_RN_PRESET_METADATA: NestReactRnPresetMetadata;
export declare function getNestReactRnPresetMetadata(): NestReactRnPresetMetadata;
export declare function getNestReactRnPresetFileManifest(): readonly NestReactRnGeneratedFileManifestEntry[];
export interface RenderNestReactRnPresetOptions {
    readonly includeSampleSource?: boolean;
}
export type RenderNestReactRnPresetOptionsValidationResult = {
    readonly ok: true;
    readonly options: Required<RenderNestReactRnPresetOptions>;
} | {
    readonly ok: false;
    readonly finding: NestReactRnPresetFinding;
};
export declare function validateNestReactRnPresetRenderOptions(optionsInput: unknown): RenderNestReactRnPresetOptionsValidationResult;
export declare function renderNestReactRnPresetFiles(): readonly GeneratedNestReactRnPresetFile[];
export declare function renderNestReactRnPresetFiles(options: RenderNestReactRnPresetOptions): readonly GeneratedNestReactRnPresetFile[];
export declare function validateNestReactRnPresetFiles(filesInput: unknown): NestReactRnPresetValidationResult;
//# sourceMappingURL=index.d.ts.map