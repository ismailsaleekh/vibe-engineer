export declare const BUILTIN_SCHEMATIC_IDS: readonly ["builtin.module", "builtin.contract", "builtin.adapter", "builtin.test-fixture", "builtin.context-file", "builtin.standard-doc"];
export declare const BUILTIN_SCHEMATIC_SLUGS: readonly ["module", "contract", "adapter", "test-fixture", "context-file", "standard-doc"];
export declare const REQUIRED_TYPESCRIPT_PRESET_FILE_KINDS: readonly ["typescript-config", "eslint-policy", "prettier-policy", "workspace-config", "turbo-config", "package-manifest"];
export type BuiltInSchematicId = (typeof BUILTIN_SCHEMATIC_IDS)[number];
export type BuiltInSchematicSlug = (typeof BUILTIN_SCHEMATIC_SLUGS)[number];
export type RequiredTypeScriptPresetFileKind = (typeof REQUIRED_TYPESCRIPT_PRESET_FILE_KINDS)[number];
export interface BuiltInSchematicCatalogOptions {
    readonly templatesRoot: string;
}
export interface BuiltInSchematicManifestReadOptions extends BuiltInSchematicCatalogOptions {
    readonly readTextFile: (filePath: string) => string | Promise<string>;
}
export interface BuiltInSchematicCatalogEntry {
    readonly slug: BuiltInSchematicSlug;
    readonly schematicId: BuiltInSchematicId;
    readonly manifestPath: string;
}
export interface BuiltInSchematicManifestEntry extends BuiltInSchematicCatalogEntry {
    readonly manifest: unknown;
}
export interface StandardContract {
    readonly standardId: string;
    readonly title: string;
    readonly summary: string;
}
export interface StandardsApiContract {
    readonly loadStandard: (id: string) => StandardContract;
}
export interface TypeScriptPresetMetadataContract {
    readonly presetId: string;
    readonly quickGateLabel: string;
}
export interface TypeScriptPresetFileManifestEntryContract {
    readonly kind: string;
}
export interface GeneratedTypeScriptPresetFileContract {
    readonly path: string;
    readonly content: string;
}
export interface TypeScriptPresetApiContract {
    readonly getTypeScriptPresetMetadata: () => TypeScriptPresetMetadataContract;
    readonly getTypeScriptPresetFileManifest: () => readonly TypeScriptPresetFileManifestEntryContract[];
    readonly renderTypeScriptPresetFiles: () => readonly GeneratedTypeScriptPresetFileContract[];
    readonly validateTypeScriptPresetFiles: (files: readonly GeneratedTypeScriptPresetFileContract[]) => {
        readonly ok: boolean;
    };
}
export interface BuiltInContractApis {
    readonly standardsApi: StandardsApiContract;
    readonly typescriptPresetApi: TypeScriptPresetApiContract;
}
export interface BuiltInContractAssertionResult {
    readonly ok: true;
    readonly count: number;
    readonly schematicIds: readonly string[];
}
export type BuiltInContractInputValue = string | boolean;
export type BuiltInContractInput = Readonly<Record<string, BuiltInContractInputValue>>;
export declare function regexpPatternForLiteral(value: string): string;
export declare function createBuiltInSchematicCatalog(options: BuiltInSchematicCatalogOptions): readonly BuiltInSchematicCatalogEntry[];
export declare function readBuiltInSchematicManifests(options: BuiltInSchematicManifestReadOptions): Promise<readonly BuiltInSchematicManifestEntry[]>;
export declare function normalizeBuiltInContractInput(input: unknown, apis: BuiltInContractApis): BuiltInContractInput;
export declare function assertBuiltInContractSurfaces(entries: readonly BuiltInSchematicManifestEntry[], apis: BuiltInContractApis): BuiltInContractAssertionResult;
