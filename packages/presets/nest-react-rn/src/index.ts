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

import {
  ESLINT_POLICY_DEFAULTS,
  PACKAGE_SCRIPT_DEFAULTS,
  PNPM_DEFAULTS,
  PRETTIER_DEFAULTS,
  TEST_AND_TYPECHECK_DEFAULTS,
  TURBO_TASK_DEFAULTS,
  TYPESCRIPT_COMPILER_STRICT_OPTIONS,
  TYPESCRIPT_PRESET_METADATA,
  TYPE_SCRIPT_PRESET_ID,
  type PresetFileKind,
  type StandardId,
} from "@vibe-engineer/preset-typescript";

// ---------------------------------------------------------------------------
// Preset identity
// ---------------------------------------------------------------------------

export const NEST_REACT_RN_PRESET_ID = "vibe-engineer.nest-react-rn.starter";
export const NEST_REACT_RN_PRESET_NAME = "Vibe Engineer NestJS / React / React Native Starter Preset";
export const NEST_REACT_RN_PRESET_VERSION = "1.0.0";
export const CONSUMED_TYPESCRIPT_PRESET_ID = TYPE_SCRIPT_PRESET_ID;

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

// ---------------------------------------------------------------------------
// DL-16 locked layout declaration
// ---------------------------------------------------------------------------

export type StarterAppId = "api" | "web" | "mobile";
export type StarterPackageName =
  | "domain"
  | "contracts"
  | "api-client"
  | "config"
  | "testing"
  | "ui";
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

export const STARTER_APPS: readonly StarterAppDescriptor[] = Object.freeze([
  {
    id: "api",
    directory: "apps/api",
    packageName: "@vibe-engineer-starter/api",
    framework: "NestJS",
    goldenRouteOrScreen: "golden-records",
  },
  {
    id: "web",
    directory: "apps/web",
    packageName: "@vibe-engineer-starter/web",
    framework: "React",
    goldenRouteOrScreen: "golden-records",
  },
  {
    id: "mobile",
    directory: "apps/mobile",
    packageName: "@vibe-engineer-starter/mobile",
    framework: "React Native",
    goldenRouteOrScreen: "golden-records",
  },
] as const);

export const STARTER_PACKAGES: readonly StarterPackageDescriptor[] = Object.freeze([
  {
    name: "domain",
    directory: "packages/domain",
    packageName: "@vibe-engineer-starter/domain",
    boundaryRule:
      "Pure TypeScript domain/sample use cases only; must not import NestJS, React, React Native, Prisma client, api-client, UI, CLI, harness internals, filesystem/process, or app code.",
    forbiddenImports: [
      "@nestjs",
      "react",
      "react-native",
      "@prisma/client",
      "@vibe-engineer-starter/api-client",
      "@vibe-engineer-starter/ui",
      "node:fs",
      "node:child_process",
    ],
  },
  {
    name: "contracts",
    directory: "packages/contracts",
    packageName: "@vibe-engineer-starter/contracts",
    boundaryRule:
      "Owns ts-rest contracts and named Zod schemas; may import only generic/shared type helpers; must not import app code, Prisma client, UI, or api-client.",
    forbiddenImports: [
      "@nestjs",
      "react",
      "react-native",
      "@prisma/client",
      "@vibe-engineer-starter/api-client",
      "@vibe-engineer-starter/ui",
    ],
  },
  {
    name: "api-client",
    directory: "packages/api-client",
    packageName: "@vibe-engineer-starter/api-client",
    boundaryRule:
      "Generated/shared client derived from packages/contracts; may depend on contracts and config; must not duplicate schemas or define hand-authored fetch DTOs.",
    forbiddenImports: ["@nestjs", "react", "react-native", "@prisma/client"],
  },
  {
    name: "config",
    directory: "packages/config",
    packageName: "@vibe-engineer-starter/config",
    boundaryRule:
      "Env/config wrappers; no secrets in defaults; no app/api/Prisma/UI logic.",
    forbiddenImports: ["@nestjs", "react", "react-native", "@prisma/client"],
  },
  {
    name: "testing",
    directory: "packages/testing",
    packageName: "@vibe-engineer-starter/testing",
    boundaryRule:
      "Test-only; no production package may depend on it.",
    forbiddenImports: [],
  },
  {
    name: "ui",
    directory: "packages/ui",
    packageName: "@vibe-engineer-starter/ui",
    boundaryRule:
      "Tokens/primitives/accessibility only; imports no app, api, Prisma, or api-client code; no routes, API calls, navigation, persistence, or domain rules.",
    forbiddenImports: [
      "@nestjs",
      "@prisma/client",
      "@vibe-engineer-starter/api-client",
      "node:fs",
      "node:child_process",
    ],
  },
] as const);

export const STARTER_VIBE_AREAS: readonly VibeContextArea[] = Object.freeze([
  "context",
  "work",
  "evidence",
  "registry",
] as const);

export const STARTER_TOOLING_AREAS: readonly ToolingArea[] = Object.freeze([
  "scripts",
  "dev-services",
  "ci",
  "generated",
] as const);

export const STARTER_LAYOUT: StarterLayoutDeclaration = Object.freeze({
  scope: "@vibe-engineer-starter",
  workspaceName: "@vibe-engineer-starter/workspace",
  architectureDecision: "DL-16-starter-architecture",
  apps: STARTER_APPS,
  packages: STARTER_PACKAGES,
  vibeAreas: STARTER_VIBE_AREAS,
  toolingAreas: STARTER_TOOLING_AREAS,
  goldenModule: "golden-records",
  authStance: "no-auth",
  persistence: "PostgreSQL + Prisma",
  contractMechanism: "ts-rest + named Zod schemas",
  agenticHarness: "pi",
});

export function getStarterLayoutDeclaration(): StarterLayoutDeclaration {
  return Object.freeze({
    ...STARTER_LAYOUT,
    apps: Object.freeze(STARTER_APPS.map((app) => Object.freeze({ ...app }))),
    packages: Object.freeze(
      STARTER_PACKAGES.map((pkg) =>
        Object.freeze({
          ...pkg,
          forbiddenImports: Object.freeze([...pkg.forbiddenImports]),
        }),
      ),
    ),
    vibeAreas: Object.freeze([...STARTER_VIBE_AREAS]),
    toolingAreas: Object.freeze([...STARTER_TOOLING_AREAS]),
  });
}

// ---------------------------------------------------------------------------
// Derived defaults (consumed from @vibe-engineer/preset-typescript — no duplication)
// ---------------------------------------------------------------------------

/**
 * The strict TypeScript compiler options the starter inherits. These are the
 * LIVE imported values from the consumed I-07D preset, not duplicated literals.
 * A rendered starter tsconfig.base.json whose compilerOptions does not deep-equal
 * this object is a PRESET_TS_DEFAULTS_DRIFT finding.
 */
export const STARTER_COMPILER_STRICT_OPTIONS: typeof TYPESCRIPT_COMPILER_STRICT_OPTIONS = Object.freeze({
  ...TYPESCRIPT_COMPILER_STRICT_OPTIONS,
});

export const STARTER_ESLINT_POLICY: typeof ESLINT_POLICY_DEFAULTS = Object.freeze({
  ...ESLINT_POLICY_DEFAULTS,
  rules: Object.freeze([...ESLINT_POLICY_DEFAULTS.rules]),
  boundaryRules: Object.freeze({ ...ESLINT_POLICY_DEFAULTS.boundaryRules }),
});

export const STARTER_PRETTIER_DEFAULTS: typeof PRETTIER_DEFAULTS = Object.freeze({ ...PRETTIER_DEFAULTS });

export const STARTER_PNPM_DEFAULTS: typeof PNPM_DEFAULTS = Object.freeze({
  ...PNPM_DEFAULTS,
  workspaceGlobs: Object.freeze([...PNPM_DEFAULTS.workspaceGlobs]),
});

export const STARTER_TURBO_TASK_DEFAULTS: typeof TURBO_TASK_DEFAULTS = Object.freeze({
  ...TURBO_TASK_DEFAULTS,
  tasks: Object.freeze({ ...TURBO_TASK_DEFAULTS.tasks }),
});

export const STARTER_PACKAGE_SCRIPT_DEFAULTS: typeof PACKAGE_SCRIPT_DEFAULTS = Object.freeze({
  ...PACKAGE_SCRIPT_DEFAULTS,
});

export const STARTER_TEST_AND_TYPECHECK_DEFAULTS: typeof TEST_AND_TYPECHECK_DEFAULTS = Object.freeze({
  ...TEST_AND_TYPECHECK_DEFAULTS,
  typecheckCommand: "pnpm run typecheck",
  unitTestCommand: "pnpm run test:unit",
  quickGateCommand: "pnpm run quality:quick",
});

// ---------------------------------------------------------------------------
// File kinds / manifest (extends I-07D PresetFileKind with starter-specific kinds)
// ---------------------------------------------------------------------------

export type NestReactRnPresetFileKind =
  | PresetFileKind
  | "app-manifest"
  | "app-tsconfig"
  | "package-tsconfig"
  | "harness-config-placeholder"
  | "context-placeholder"
  | "dev-service-config"
  | "sample-demo-source";

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

// ---------------------------------------------------------------------------
// Findings / validation
// ---------------------------------------------------------------------------

export type NestReactRnPresetFindingCode =
  | "PRESET_MALFORMED_RENDER_OPTIONS"
  | "PRESET_UNSAFE_GENERATED_PATH"
  | "PRESET_DUPLICATE_GENERATED_PATH"
  | "PRESET_MISSING_REQUIRED_FILE"
  | "PRESET_MALFORMED_JSON"
  | "PRESET_TS_DEFAULTS_DRIFT"
  | "PRESET_PACKAGE_TSCONFIG_WEAKENED"
  | "PRESET_LAYOUT_INFIDELITY"
  | "PRESET_DOMAIN_SPECIFIC_CORE_TEXT"
  | "PRESET_COPIED_HARNESS_LOGIC"
  | "PRESET_PRIVATE_SCOPED_IMPORT"
  | "PRESET_NON_PI_HARNESS"
  | "PRESET_FORBIDDEN_DEFAULT_COMMAND"
  | "PRESET_MANIFEST_CONTENT_MISMATCH"
  | "PRESET_GOLDEN_MODULE_NOT_LABELED";

export interface NestReactRnPresetFinding {
  readonly code: NestReactRnPresetFindingCode;
  readonly path: string;
  readonly message: string;
  readonly blocking: true;
  readonly evidence: readonly string[];
}

export type NestReactRnPresetValidationResult =
  | { readonly ok: true; readonly findings: readonly []; readonly fileCount: number }
  | {
      readonly ok: false;
      readonly findings: readonly NestReactRnPresetFinding[];
      readonly fileCount: number;
    };

export class NestReactRnPresetOptionsError extends Error {
  public readonly code: "PRESET_MALFORMED_RENDER_OPTIONS";
  public readonly finding: NestReactRnPresetFinding;

  public constructor(finding: NestReactRnPresetFinding) {
    super(finding.message);
    this.name = "NestReactRnPresetOptionsError";
    this.code = "PRESET_MALFORMED_RENDER_OPTIONS";
    this.finding = finding;
  }
}

// ---------------------------------------------------------------------------
// Vocabulary policy (DL-20A domain-neutrality) — core defaults must stay neutral.
// ---------------------------------------------------------------------------

export const FORBIDDEN_DOMAIN_TERMS: readonly string[] = Object.freeze([
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
  "cart",
  "payment",
  "social-feed",
]);

/**
 * Escape the regex metacharacters in a literal term so it can be embedded into
 * a {@link RegExp} pattern without changing its meaning (e.g. the hyphen in
 * "social-feed"). Only the metacharacters outside a character class need
 * escaping here because the term is interpolated into a plain pattern.
 */
function escapeRegExpLiteral(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Precompiled word-boundary patterns for {@link FORBIDDEN_DOMAIN_TERMS}.
 *
 * A forbidden business-domain term must only match when it appears as a WHOLE
 * word/token, never as a substring of a legitimate technical word. The
 * `\b` anchors guarantee, for example, that "product" does NOT match
 * "production" / "products", while "checkout" injected as `// checkout` still
 * matches. The case-insensitive flag preserves the prior casing posture.
 * Compiled once at module load (not per call) — deterministic, not a heuristic.
 */
const FORBIDDEN_DOMAIN_TERM_PATTERNS: readonly { readonly term: string; readonly pattern: RegExp }[] =
  FORBIDDEN_DOMAIN_TERMS.map((term) => ({
    term,
    pattern: new RegExp(`\\b${escapeRegExpLiteral(term)}\\b`, "i"),
  }));

/**
 * Paths whose content is permitted to be sample/demo/reference golden module
 * material (still domain-neutral generic fields, but explicitly labeled). All
 * other core-default paths must be strictly domain-neutral.
 */
const SAMPLE_DEMO_PATH_MARKERS = Object.freeze(["golden-records", "sample", "demo", "reference"] as const);

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

type UnknownObject = { readonly [key: string]: unknown };
type ValidatorFile = { readonly path: string; readonly content: string };

function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isObject(value: unknown): value is UnknownObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getObjectProperty(source: UnknownObject, key: string): unknown {
  return source[key];
}

function makeFinding(
  code: NestReactRnPresetFindingCode,
  path: string,
  message: string,
  evidence: readonly string[],
): NestReactRnPresetFinding {
  return Object.freeze({
    code,
    path,
    message,
    blocking: true,
    evidence: Object.freeze([...evidence]),
  });
}

function makeRenderOptionsFinding(message: string, evidence: readonly string[]): NestReactRnPresetFinding {
  return makeFinding("PRESET_MALFORMED_RENDER_OPTIONS", "<renderer-options>", message, evidence);
}

// ---------------------------------------------------------------------------
// Manifest construction
// ---------------------------------------------------------------------------

function manifestEntry(
  outputPath: string,
  kind: NestReactRnPresetFileKind,
  requiredStandardIds: readonly StandardId[],
  consumerNotes: string,
): NestReactRnGeneratedFileManifestEntry {
  return Object.freeze({
    outputPath,
    kind,
    ownership: "generated-owned",
    requiredStandardIds: Object.freeze([...requiredStandardIds]),
    consumerNotes,
  });
}

/**
 * The locked file set this preset materializes for the I-15B-2 reference
 * source-template. Every entry is a DL-16-faithful skeleton derived from the
 * consumed TypeScript preset defaults.
 */
export const NEST_REACT_RN_PRESET_FILE_MANIFEST: readonly NestReactRnGeneratedFileManifestEntry[] = Object.freeze([
  manifestEntry("tsconfig.base.json", "typescript-config", ["typed-boundary-contracts", "dependency-hygiene"], "Root strict NodeNext TypeScript baseline inherited verbatim from @vibe-engineer/preset-typescript compiler options."),
  manifestEntry("pnpm-workspace.yaml", "workspace-config", ["dependency-hygiene"], "Workspace globs for DL-16 apps/* and packages/*."),
  manifestEntry("turbo.json", "turbo-config", ["real-boundary-witnesses", "dependency-hygiene"], "Starter Turborepo tasks derived from @vibe-engineer/preset-typescript turbo defaults."),
  manifestEntry("eslint.config.mjs", "eslint-config", ["typed-boundary-contracts", "domain-neutral-core"], "Starter ESLint flat-config inheriting the consumed preset strict policy."),
  manifestEntry("prettier.config.mjs", "prettier-config", ["deterministic-schematics"], "Starter Prettier config derived verbatim from the consumed preset prettier defaults."),
  manifestEntry("package.json", "package-manifest", ["dependency-hygiene"], "Private root starter manifest for @vibe-engineer-starter/workspace with strict scripts."),
  manifestEntry("apps/api/package.json", "app-manifest", ["dependency-hygiene"], "NestJS API app manifest (golden-records sample/demo module slot)."),
  manifestEntry("apps/api/tsconfig.json", "app-tsconfig", ["typed-boundary-contracts"], "API app tsconfig extending the strict root base."),
  manifestEntry("apps/web/package.json", "app-manifest", ["dependency-hygiene"], "React web app manifest."),
  manifestEntry("apps/web/tsconfig.json", "app-tsconfig", ["typed-boundary-contracts"], "Web app tsconfig extending the strict root base."),
  manifestEntry("apps/mobile/package.json", "app-manifest", ["dependency-hygiene"], "React Native mobile app manifest."),
  manifestEntry("apps/mobile/tsconfig.json", "app-tsconfig", ["typed-boundary-contracts"], "Mobile app tsconfig extending the strict root base."),
  manifestEntry("packages/domain/package.json", "package-manifest", ["typed-boundary-contracts", "domain-neutral-core"], "Prisma-free pure-TS domain package manifest."),
  manifestEntry("packages/domain/tsconfig.json", "package-tsconfig", ["typed-boundary-contracts"], "Domain package tsconfig inheriting the strict base."),
  manifestEntry("packages/contracts/package.json", "package-manifest", ["typed-boundary-contracts"], "ts-rest + named Zod contracts package manifest."),
  manifestEntry("packages/contracts/tsconfig.json", "package-tsconfig", ["typed-boundary-contracts"], "Contracts package tsconfig inheriting the strict base."),
  manifestEntry("packages/api-client/package.json", "package-manifest", ["typed-boundary-contracts"], "Derived/shared api-client package manifest."),
  manifestEntry("packages/api-client/tsconfig.json", "package-tsconfig", ["typed-boundary-contracts"], "Api-client package tsconfig inheriting the strict base."),
  manifestEntry("packages/config/package.json", "package-manifest", ["dependency-hygiene"], "Env/config wrapper package manifest; no secrets in defaults."),
  manifestEntry("packages/config/tsconfig.json", "package-tsconfig", ["typed-boundary-contracts"], "Config package tsconfig inheriting the strict base."),
  manifestEntry("packages/testing/package.json", "package-manifest", ["dependency-hygiene"], "Test-only testing package manifest; no production consumer."),
  manifestEntry("packages/testing/tsconfig.json", "package-tsconfig", ["typed-boundary-contracts"], "Testing package tsconfig inheriting the strict base."),
  manifestEntry("packages/ui/package.json", "package-manifest", ["typed-boundary-contracts"], "Narrow UI tokens/primitives package manifest."),
  manifestEntry("packages/ui/tsconfig.json", "package-tsconfig", ["typed-boundary-contracts"], "UI package tsconfig inheriting the strict base."),
  manifestEntry("vibe-engineer.config.json", "harness-config-placeholder", ["real-boundary-witnesses"], "Starter harness-config placeholder: agenticHarness=pi + locked DL-16 layout (DL-06)."),
  manifestEntry(".vibe/context/manifest.json", "context-placeholder", ["report-first-evidence"], "DL-17 neutral bootstrap context placeholder; classifies golden-records as sample/demo/reference."),
  manifestEntry(".tooling/dev-services/docker-compose.json", "dev-service-config", ["dependency-hygiene"], "Local PostgreSQL-only dev service (DL-16 database stance)."),
  manifestEntry("apps/api/src/golden-records/sample.ts", "sample-demo-source", ["domain-neutral-core"], "Explicitly sample/demo/reference GoldenRecord source demonstrating the architecture seam."),
  manifestEntry(".vibe/generated/nest-react-rn-preset/manifest.json", "preset-metadata", ["report-first-evidence", "dirty-tree-ownership"], "Generated preset manifest tying starter files to standards and consumed preset identity."),
]);

const NEST_REACT_RN_PRESET_FILE_MANIFEST_BY_PATH: ReadonlyMap<
  string,
  NestReactRnGeneratedFileManifestEntry
> = Object.freeze(
  new Map(NEST_REACT_RN_PRESET_FILE_MANIFEST.map((entry) => [entry.outputPath, entry] as const)),
);

// ---------------------------------------------------------------------------
// Public metadata accessor
// ---------------------------------------------------------------------------

export const NEST_REACT_RN_PRESET_METADATA: NestReactRnPresetMetadata = Object.freeze({
  presetId: NEST_REACT_RN_PRESET_ID,
  name: NEST_REACT_RN_PRESET_NAME,
  version: NEST_REACT_RN_PRESET_VERSION,
  packageName: "@vibe-engineer/preset-nest-react-rn",
  architectureDecision: "DL-16-starter-architecture",
  domainNeutral: true,
  consumedTypescriptPresetId: TYPE_SCRIPT_PRESET_ID,
  quickGateLabel: "quality:quick",
});

export function getNestReactRnPresetMetadata(): NestReactRnPresetMetadata {
  return Object.freeze({ ...NEST_REACT_RN_PRESET_METADATA });
}

export function getNestReactRnPresetFileManifest(): readonly NestReactRnGeneratedFileManifestEntry[] {
  return Object.freeze(
    NEST_REACT_RN_PRESET_FILE_MANIFEST.map((entry) =>
      Object.freeze({
        ...entry,
        requiredStandardIds: Object.freeze([...entry.requiredStandardIds]),
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Content renderers (all derived from consumed TypeScript preset values)
// ---------------------------------------------------------------------------

function rootTsconfigContent(): string {
  return stableStringify({
    $schema: "https://json.schemastore.org/tsconfig",
    compilerOptions: STARTER_COMPILER_STRICT_OPTIONS,
  });
}

function pnpmWorkspaceContent(): string {
  return `packages:\n  - "apps/*"\n  - "packages/*"\n`;
}

function turboContent(): string {
  return stableStringify({
    $schema: "https://turbo.build/schema.json",
    tasks: STARTER_TURBO_TASK_DEFAULTS.tasks,
  });
}

function eslintConfigContent(): string {
  return `import js from "@eslint/js";\nimport tseslint from "typescript-eslint";\n\nexport default tseslint.config(\n  js.configs.recommended,\n  ...tseslint.configs.strictTypeChecked,\n  ...tseslint.configs.stylisticTypeChecked,\n  {\n    files: ["**/*.ts", "**/*.tsx"],\n    languageOptions: {\n      parserOptions: {\n        projectService: true,\n      },\n    },\n    rules: {\n      "@typescript-eslint/no-explicit-any": "error",\n      "@typescript-eslint/no-non-null-assertion": "error",\n      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": true, "ts-nocheck": true, "ts-expect-error": "allow-with-description", minimumDescriptionLength: 20 }],\n      "@typescript-eslint/no-unnecessary-type-assertion": "error",\n      "@typescript-eslint/consistent-type-imports": "error",\n      "@typescript-eslint/no-confusing-void-expression": "error",\n      "@typescript-eslint/no-unsafe-assignment": "error",\n      "@typescript-eslint/no-unsafe-argument": "error",\n      "@typescript-eslint/no-unsafe-call": "error",\n      "@typescript-eslint/no-unsafe-member-access": "error",\n      "@typescript-eslint/no-unsafe-return": "error",\n      "@typescript-eslint/restrict-template-expressions": "error",\n      "@typescript-eslint/switch-exhaustiveness-check": "error",\n      "no-empty": ["error", { allowEmptyCatch: false }],\n      "no-fallthrough": "error",\n      "no-implicit-coercion": "error",\n      "no-restricted-syntax": ["error", { selector: "CallExpression[callee.object.name='JSON'][callee.property.name='parse']", message: "Parse untrusted JSON only behind a named runtime boundary validator." }],\n      "vibe-engineer/no-broad-domain-map-model": "error",\n    },\n  },\n);\n`;
}

function prettierConfigContent(): string {
  return `export default ${JSON.stringify(STARTER_PRETTIER_DEFAULTS, null, 2)};\n`;
}

function rootPackageJsonContent(): string {
  return stableStringify({
    name: STARTER_LAYOUT.workspaceName,
    private: true,
    type: "module",
    packageManager: STARTER_PNPM_DEFAULTS.packageManager,
    scripts: {
      ...STARTER_PACKAGE_SCRIPT_DEFAULTS,
      dev: "pnpm -r --parallel --filter @vibe-engineer-starter/api --filter @vibe-engineer-starter/web run dev",
      "dev:api": "pnpm --filter @vibe-engineer-starter/api run dev",
      "dev:web": "pnpm --filter @vibe-engineer-starter/web run dev",
      "dev:mobile": "pnpm --filter @vibe-engineer-starter/mobile run dev",
      "db:start": "docker compose -f .tooling/dev-services/docker-compose.json up -d postgres",
      "db:stop": "docker compose -f .tooling/dev-services/docker-compose.json stop postgres",
      "db:migrate": "pnpm --filter @vibe-engineer-starter/api run db:migrate",
      "db:seed": "pnpm --filter @vibe-engineer-starter/api run db:seed",
      "db:reset:local": "pnpm --filter @vibe-engineer-starter/api run db:reset:local",
    },
    vibeEngineer: {
      architectureDecision: STARTER_LAYOUT.architectureDecision,
      appNames: STARTER_APPS.map((app) => app.id),
      packageNames: STARTER_PACKAGES.map((pkg) => pkg.name),
      goldenModule: STARTER_LAYOUT.goldenModule,
      authStance: STARTER_LAYOUT.authStance,
      persistence: STARTER_LAYOUT.persistence,
      contractMechanism: STARTER_LAYOUT.contractMechanism,
    },
  });
}

function appManifestContent(app: StarterAppDescriptor): string {
  const baseScripts: Readonly<Record<string, string>> = {
    typecheck: "tsc --noEmit -p tsconfig.json",
    lint: "eslint .",
    "format:check": "prettier --check .",
    "test:unit": "tsx --test \"test/**/*.test.ts\"",
    build: "tsc -p tsconfig.json",
    "quality:quick": "pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run test:unit && pnpm run build",
  };
  const appSpecificScripts: Readonly<Record<StarterAppId, Readonly<Record<string, string>>>> = {
    api: {
      dev: "tsx watch src/main.ts",
      "db:migrate": "prisma migrate dev",
      "db:seed": "prisma db seed",
      "db:reset:local": "prisma migrate reset --force",
    },
    web: { dev: "vite" },
    mobile: { dev: "react-native start" },
  };
  const scripts: Record<string, string> = { ...baseScripts, ...appSpecificScripts[app.id] };
  return stableStringify({
    name: app.packageName,
    private: true,
    type: "module",
    scripts,
  });
}

function packageManifestContent(pkg: StarterPackageDescriptor): string {
  return stableStringify({
    name: pkg.packageName,
    private: true,
    type: "module",
    scripts: STARTER_PACKAGE_SCRIPT_DEFAULTS,
  });
}

function packageTsconfigContent(): string {
  return stableStringify({
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      rootDir: "src",
      outDir: "dist",
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      noEmit: false,
    },
    include: ["src/**/*.ts", "src/**/*.tsx"],
  });
}

function harnessConfigPlaceholderContent(): string {
  return stableStringify({
    agenticHarness: STARTER_LAYOUT.agenticHarness,
    maxParallelAgents: 8,
    maxValidationFixIterations: 3,
    agenticWorkPackageTargetHours: 6,
    starter: {
      architectureDecision: STARTER_LAYOUT.architectureDecision,
      appNames: STARTER_APPS.map((app) => app.id),
      packageNames: STARTER_PACKAGES.map((pkg) => pkg.name),
      goldenModule: STARTER_LAYOUT.goldenModule,
      scope: STARTER_LAYOUT.scope,
    },
  });
}

function contextManifestPlaceholderContent(): string {
  return stableStringify({
    schemaStatus: "needs_user_context",
    inferenceLimit: "intentional-neutral-placeholders-only",
    goldenModule: {
      name: STARTER_LAYOUT.goldenModule,
      classification: "sample/demo/reference",
      notes:
        "Bootstrap context placeholder per DL-17. No business domain, roadmap, users, or schema are inferred. The golden-records module is explicitly sample/demo/reference.",
    },
    vibeAreas: STARTER_VIBE_AREAS,
  });
}

function devServiceContent(): string {
  return stableStringify({
    services: {
      postgres: {
        image: "postgres:17-alpine",
        service: "postgres",
        environment: {
          POSTGRES_USER: "starter_local",
          POSTGRES_PASSWORD: "starter_local",
          POSTGRES_DB: "starter_dev",
        },
        ports: ["5432:5432"],
      },
    },
  });
}

function sampleDemoSourceContent(): string {
  return `// @sample @demo @reference — golden-records module (DL-16 / DL-20A)\n// This file is explicitly labeled sample/demo/reference. It demonstrates the\n// starter architecture seam; it does NOT define a business domain.\n\nexport type GoldenRecordStatus = "draft" | "active" | "archived";\n\nexport interface GoldenRecord {\n  readonly id: string;\n  readonly title: string;\n  readonly summary: string;\n  readonly status: GoldenRecordStatus;\n  readonly createdAt: string;\n  readonly updatedAt: string;\n}\n\nexport function classifyGoldenRecordStatus(\n  status: GoldenRecordStatus,\n): "sample-demo-reference" {\n  return "sample-demo-reference";\n}\n`;
}

function generatedManifestContent(): string {
  return stableStringify({
    metadata: NEST_REACT_RN_PRESET_METADATA,
    layout: {
      scope: STARTER_LAYOUT.scope,
      workspaceName: STARTER_LAYOUT.workspaceName,
      apps: STARTER_APPS,
      packages: STARTER_PACKAGES,
      vibeAreas: STARTER_VIBE_AREAS,
      toolingAreas: STARTER_TOOLING_AREAS,
      goldenModule: STARTER_LAYOUT.goldenModule,
      authStance: STARTER_LAYOUT.authStance,
      persistence: STARTER_LAYOUT.persistence,
      contractMechanism: STARTER_LAYOUT.contractMechanism,
      agenticHarness: STARTER_LAYOUT.agenticHarness,
    },
    consumedTypescriptPreset: TYPESCRIPT_PRESET_METADATA,
    files: NEST_REACT_RN_PRESET_FILE_MANIFEST,
    derivedDefaults: {
      compilerOptions: STARTER_COMPILER_STRICT_OPTIONS,
      eslintPolicy: STARTER_ESLINT_POLICY,
      prettierDefaults: STARTER_PRETTIER_DEFAULTS,
      pnpmDefaults: STARTER_PNPM_DEFAULTS,
      turboDefaults: STARTER_TURBO_TASK_DEFAULTS,
      packageScripts: STARTER_PACKAGE_SCRIPT_DEFAULTS,
      testAndTypecheckDefaults: STARTER_TEST_AND_TYPECHECK_DEFAULTS,
    },
  });
}

// ---------------------------------------------------------------------------
// Render options
// ---------------------------------------------------------------------------

export interface RenderNestReactRnPresetOptions {
  readonly includeSampleSource?: boolean;
}

export type RenderNestReactRnPresetOptionsValidationResult =
  | { readonly ok: true; readonly options: Required<RenderNestReactRnPresetOptions> }
  | { readonly ok: false; readonly finding: NestReactRnPresetFinding };

function isSafeRelativePath(path: string): boolean {
  if (path.length === 0 || path.startsWith("/") || path.startsWith("\\") || path.includes("\\")) {
    return false;
  }
  const segments = path.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function validateRenderOptions(input: unknown): RenderNestReactRnPresetOptionsValidationResult {
  if (input === undefined) {
    return { ok: true, options: { includeSampleSource: true } };
  }
  if (!isObject(input)) {
    return { ok: false, finding: makeRenderOptionsFinding("Renderer options must be an object when provided.", [String(input)]) };
  }
  const allowedKeys = new Set(["includeSampleSource"]);
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      return { ok: false, finding: makeRenderOptionsFinding(`Unknown renderer option: ${key}.`, [key]) };
    }
  }
  const includeSampleSourceInput = getObjectProperty(input, "includeSampleSource");
  if (includeSampleSourceInput !== undefined && typeof includeSampleSourceInput !== "boolean") {
    return {
      ok: false,
      finding: makeRenderOptionsFinding("includeSampleSource must be a boolean when provided.", [typeof includeSampleSourceInput]),
    };
  }
  return {
    ok: true,
    options: { includeSampleSource: includeSampleSourceInput === undefined ? true : includeSampleSourceInput },
  };
}

export function validateNestReactRnPresetRenderOptions(
  optionsInput: unknown,
): RenderNestReactRnPresetOptionsValidationResult {
  const result = validateRenderOptions(optionsInput);
  if (!result.ok) {
    return { ok: false, finding: result.finding };
  }
  return { ok: true, options: Object.freeze({ ...result.options }) };
}

function renderedFile(
  path: string,
  kind: NestReactRnPresetFileKind,
  content: string,
): GeneratedNestReactRnPresetFile {
  const manifest = NEST_REACT_RN_PRESET_FILE_MANIFEST_BY_PATH.get(path);
  if (manifest === undefined) {
    throw new NestReactRnPresetOptionsError(
      makeRenderOptionsFinding(`Missing manifest entry for generated file ${path}.`, [path]),
    );
  }
  if (manifest.kind !== kind) {
    throw new NestReactRnPresetOptionsError(
      makeRenderOptionsFinding(`Generated file kind does not match manifest for ${path}.`, [
        path,
        kind,
        manifest.kind,
      ]),
    );
  }
  return Object.freeze({ path, kind, content, manifest });
}

export function renderNestReactRnPresetFiles(): readonly GeneratedNestReactRnPresetFile[];
export function renderNestReactRnPresetFiles(
  options: RenderNestReactRnPresetOptions,
): readonly GeneratedNestReactRnPresetFile[];
export function renderNestReactRnPresetFiles(
  optionsInput: unknown = undefined,
): readonly GeneratedNestReactRnPresetFile[] {
  const optionsResult = validateRenderOptions(optionsInput);
  if (!optionsResult.ok) {
    throw new NestReactRnPresetOptionsError(optionsResult.finding);
  }
  const { includeSampleSource } = optionsResult.options;

  const files: GeneratedNestReactRnPresetFile[] = [
    renderedFile("tsconfig.base.json", "typescript-config", rootTsconfigContent()),
    renderedFile("pnpm-workspace.yaml", "workspace-config", pnpmWorkspaceContent()),
    renderedFile("turbo.json", "turbo-config", turboContent()),
    renderedFile("eslint.config.mjs", "eslint-config", eslintConfigContent()),
    renderedFile("prettier.config.mjs", "prettier-config", prettierConfigContent()),
    renderedFile("package.json", "package-manifest", rootPackageJsonContent()),
  ];

  for (const app of STARTER_APPS) {
    files.push(renderedFile(`${app.directory}/package.json`, "app-manifest", appManifestContent(app)));
    files.push(renderedFile(`${app.directory}/tsconfig.json`, "app-tsconfig", packageTsconfigContent()));
  }
  for (const pkg of STARTER_PACKAGES) {
    files.push(renderedFile(`${pkg.directory}/package.json`, "package-manifest", packageManifestContent(pkg)));
    files.push(renderedFile(`${pkg.directory}/tsconfig.json`, "package-tsconfig", packageTsconfigContent()));
  }

  files.push(
    renderedFile("vibe-engineer.config.json", "harness-config-placeholder", harnessConfigPlaceholderContent()),
    renderedFile(".vibe/context/manifest.json", "context-placeholder", contextManifestPlaceholderContent()),
    renderedFile(
      ".tooling/dev-services/docker-compose.json",
      "dev-service-config",
      devServiceContent(),
    ),
    renderedFile(
      ".vibe/generated/nest-react-rn-preset/manifest.json",
      "preset-metadata",
      generatedManifestContent(),
    ),
  );

  if (includeSampleSource) {
    files.push(
      renderedFile(
        "apps/api/src/golden-records/sample.ts",
        "sample-demo-source",
        sampleDemoSourceContent(),
      ),
    );
  }

  return Object.freeze(files);
}

// ---------------------------------------------------------------------------
// Validator — structural fidelity, derivation, domain-neutrality, negatives
// ---------------------------------------------------------------------------

const REQUIRED_STARTER_PATHS: readonly string[] = Object.freeze(
  NEST_REACT_RN_PRESET_FILE_MANIFEST.map((entry) => entry.outputPath),
);

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
] as const);

function parseJsonObject(
  content: string,
  path: string,
  findings: NestReactRnPresetFinding[],
): UnknownObject | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    findings.push(
      makeFinding("PRESET_MALFORMED_JSON", path, "Generated JSON content is malformed.", [
        error instanceof Error ? error.message : "unknown parse error",
      ]),
    );
    return undefined;
  }
  if (!isObject(parsed)) {
    findings.push(makeFinding("PRESET_MALFORMED_JSON", path, "Generated JSON content must be an object.", []));
    return undefined;
  }
  return parsed;
}

function validatePath(path: string, seen: Set<string>, findings: NestReactRnPresetFinding[]): void {
  if (!isSafeRelativePath(path)) {
    findings.push(
      makeFinding("PRESET_UNSAFE_GENERATED_PATH", path, "Generated file path must be normalized, relative, and contained inside the target root.", [path]),
    );
  }
  if (seen.has(path)) {
    findings.push(makeFinding("PRESET_DUPLICATE_GENERATED_PATH", path, "Generated file path appears more than once.", [path]));
  }
  seen.add(path);
}

function validateDerivedTsconfigBase(
  content: string | undefined,
  path: string,
  findings: NestReactRnPresetFinding[],
): void {
  if (content === undefined) {
    findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required derived root tsconfig is missing.", []));
    return;
  }
  const root = parseJsonObject(content, path, findings);
  if (root === undefined) return;
  const compilerOptions = getObjectProperty(root, "compilerOptions");
  if (!isObject(compilerOptions)) {
    findings.push(makeFinding("PRESET_TS_DEFAULTS_DRIFT", path, "Root tsconfig compilerOptions object is missing.", []));
    return;
  }
  for (const flag of REQUIRED_STRICT_TRUE_FLAGS) {
    if (getObjectProperty(compilerOptions, flag) !== true) {
      findings.push(
        makeFinding("PRESET_TS_DEFAULTS_DRIFT", path, `Derived strict flag must be true: ${flag}.`, [flag]),
      );
    }
  }
  if (getObjectProperty(compilerOptions, "allowUnreachableCode") !== false) {
    findings.push(makeFinding("PRESET_TS_DEFAULTS_DRIFT", path, "allowUnreachableCode must be false.", []));
  }
  if (getObjectProperty(compilerOptions, "allowUnusedLabels") !== false) {
    findings.push(makeFinding("PRESET_TS_DEFAULTS_DRIFT", path, "allowUnusedLabels must be false.", []));
  }
  if (
    getObjectProperty(compilerOptions, "module") !== "NodeNext" ||
    getObjectProperty(compilerOptions, "moduleResolution") !== "NodeNext"
  ) {
    findings.push(
      makeFinding("PRESET_TS_DEFAULTS_DRIFT", path, "Derived module/moduleResolution must both be NodeNext.", []),
    );
  }
}

function validatePackageTsconfigInheritor(
  content: string | undefined,
  path: string,
  findings: NestReactRnPresetFinding[],
): void {
  if (content === undefined) {
    findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required package/app tsconfig is missing.", []));
    return;
  }
  const root = parseJsonObject(content, path, findings);
  if (root === undefined) return;
  if (getObjectProperty(root, "extends") !== "../../tsconfig.base.json") {
    findings.push(
      makeFinding("PRESET_PACKAGE_TSCONFIG_WEAKENED", path, "Package/app tsconfig must extend ../../tsconfig.base.json.", []),
    );
  }
  const compilerOptions = getObjectProperty(root, "compilerOptions");
  if (isObject(compilerOptions)) {
    for (const flag of REQUIRED_STRICT_TRUE_FLAGS) {
      if (Object.hasOwn(compilerOptions, flag)) {
        findings.push(
          makeFinding("PRESET_PACKAGE_TSCONFIG_WEAKENED", path, `Package/app tsconfig must not override strict base flag: ${flag}.`, [flag]),
        );
      }
    }
  }
}

function validateLayoutFidelity(
  filesByPath: Map<string, string>,
  findings: NestReactRnPresetFinding[],
): void {
  // Every declared DL-16 app/package must have a manifest + tsconfig.
  for (const app of STARTER_APPS) {
    const manifestPath = `${app.directory}/package.json`;
    const tsconfigPath = `${app.directory}/tsconfig.json`;
    if (!filesByPath.has(manifestPath)) {
      findings.push(
        makeFinding("PRESET_LAYOUT_INFIDELITY", manifestPath, `DL-16 app manifest missing for ${app.id}.`, [app.id]),
      );
    }
    if (!filesByPath.has(tsconfigPath)) {
      findings.push(
        makeFinding("PRESET_LAYOUT_INFIDELITY", tsconfigPath, `DL-16 app tsconfig missing for ${app.id}.`, [app.id]),
      );
    }
    const manifestContent = filesByPath.get(manifestPath);
    if (manifestContent !== undefined) {
      const manifest = parseJsonObject(manifestContent, manifestPath, findings);
      if (manifest !== undefined && getObjectProperty(manifest, "name") !== app.packageName) {
        findings.push(
          makeFinding("PRESET_LAYOUT_INFIDELITY", manifestPath, `App package name must be ${app.packageName}.`, [app.packageName]),
        );
      }
    }
  }
  for (const pkg of STARTER_PACKAGES) {
    const manifestPath = `${pkg.directory}/package.json`;
    const tsconfigPath = `${pkg.directory}/tsconfig.json`;
    if (!filesByPath.has(manifestPath)) {
      findings.push(
        makeFinding("PRESET_LAYOUT_INFIDELITY", manifestPath, `DL-16 package manifest missing for ${pkg.name}.`, [pkg.name]),
      );
    }
    if (!filesByPath.has(tsconfigPath)) {
      findings.push(
        makeFinding("PRESET_LAYOUT_INFIDELITY", tsconfigPath, `DL-16 package tsconfig missing for ${pkg.name}.`, [pkg.name]),
      );
    }
    const manifestContent = filesByPath.get(manifestPath);
    if (manifestContent !== undefined) {
      const manifest = parseJsonObject(manifestContent, manifestPath, findings);
      if (manifest !== undefined && getObjectProperty(manifest, "name") !== pkg.packageName) {
        findings.push(
          makeFinding("PRESET_LAYOUT_INFIDELITY", manifestPath, `Package name must be ${pkg.packageName}.`, [pkg.packageName]),
        );
      }
    }
  }
  // Root manifest scope.
  const rootManifestContent = filesByPath.get("package.json");
  if (rootManifestContent !== undefined) {
    const rootManifest = parseJsonObject(rootManifestContent, "package.json", findings);
    if (rootManifest !== undefined && getObjectProperty(rootManifest, "name") !== STARTER_LAYOUT.workspaceName) {
      findings.push(
        makeFinding("PRESET_LAYOUT_INFIDELITY", "package.json", `Root workspace name must be ${STARTER_LAYOUT.workspaceName}.`, [STARTER_LAYOUT.workspaceName]),
      );
    }
  }
}

function isSampleDemoPath(path: string): boolean {
  return SAMPLE_DEMO_PATH_MARKERS.some((marker) => path.includes(marker));
}

function validateDomainNeutralText(
  files: readonly ValidatorFile[],
  findings: NestReactRnPresetFinding[],
): void {
  for (const file of files) {
    if (isSampleDemoPath(file.path)) continue;
    for (const { term, pattern } of FORBIDDEN_DOMAIN_TERM_PATTERNS) {
      if (pattern.test(file.content)) {
        findings.push(
          makeFinding("PRESET_DOMAIN_SPECIFIC_CORE_TEXT", file.path, "Core starter preset output must remain domain-neutral (DL-20A).", [term]),
        );
      }
    }
  }
}

function validateNoCopiedHarnessLogic(
  files: readonly ValidatorFile[],
  findings: NestReactRnPresetFinding[],
): void {
  // DL-16 §2 / release definition-(iii): the starter is produced by the
  // installed harness from shipped templates, but imports no @vibe-engineer/*
  // runtime package and must not copy validators/schematics/skills/adapters/runner/context/orchestration. The
  // preset's rendered starter skeletons must not embed harness validator/
  // schematic/runner/context source markers as if they were starter code.
  const COPIED_LOGIC_MARKERS = Object.freeze([
    "validateTypeScriptPresetFiles",
    "getPiGeneratedFileManifest",
    "writeContextProject",
    "createPiDownstreamManifestSummary",
    "run-witnesses",
    "verification-runner",
    "schematic-manifest-engine",
  ] as const);
  for (const file of files) {
    if (file.path.endsWith("manifest.json")) continue;
    for (const marker of COPIED_LOGIC_MARKERS) {
      if (file.content.includes(marker)) {
        findings.push(
          makeFinding("PRESET_COPIED_HARNESS_LOGIC", file.path, "Starter output must be generated from shipped templates without copying harness logic (DL-16 §2 / release definition-(iii)).", [marker]),
        );
      }
    }
  }
}

function validateNoPrivateScopedImport(
  files: readonly ValidatorFile[],
  findings: NestReactRnPresetFinding[],
): void {
  // No relative/`:../` import into a harness package, and no private
  // @vibe-engineer/* harness package import in starter app code (DL-16 §2/§5).
  const PRIVATE_HARNESS_IMPORT = /(?:from\s+["']|\brequire\(\s*["'])(\.\.\/)+(?:packages|adapters|presets\/typescript)\//;
  const PRIVATE_SCOPED = /@vibe-engineer\/(?:preset-typescript|adapter-pi|context|config|verification|security|artifacts|schematics|standards|mechanical-gates)/;
  for (const file of files) {
    if (!file.path.endsWith(".ts") && !file.path.endsWith(".mjs") && !file.path.endsWith(".js")) continue;
    if (PRIVATE_HARNESS_IMPORT.test(file.content)) {
      findings.push(
        makeFinding("PRESET_PRIVATE_SCOPED_IMPORT", file.path, "Starter code must not use relative/`:../` imports into harness packages.", [file.path]),
      );
    }
    if (PRIVATE_SCOPED.test(file.content)) {
      findings.push(
        makeFinding("PRESET_PRIVATE_SCOPED_IMPORT", file.path, "Starter code must not import private @vibe-engineer/* harness packages (consume vibe-engineer public exports only).", [file.path]),
      );
    }
  }
}

function validateNonPiHarness(
  content: string | undefined,
  path: string,
  findings: NestReactRnPresetFinding[],
): void {
  if (content === undefined) {
    findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required harness-config placeholder is missing.", []));
    return;
  }
  const config = parseJsonObject(content, path, findings);
  if (config === undefined) return;
  if (getObjectProperty(config, "agenticHarness") !== "pi") {
    findings.push(
      makeFinding("PRESET_NON_PI_HARNESS", path, "Starter harness-config must reflect agenticHarness=pi only (DL-06).", [String(getObjectProperty(config, "agenticHarness"))]),
    );
  }
}

function validateGoldenModuleLabeled(
  content: string | undefined,
  path: string,
  findings: NestReactRnPresetFinding[],
): void {
  if (content === undefined) {
    findings.push(makeFinding("PRESET_GOLDEN_MODULE_NOT_LABELED", path, "Required sample/demo source is missing.", []));
    return;
  }
  const requiredLabels = ["sample", "demo", "reference"];
  const hasLabel = requiredLabels.some((label) => content.toLowerCase().includes(label));
  if (!hasLabel) {
    findings.push(
      makeFinding("PRESET_GOLDEN_MODULE_NOT_LABELED", path, "golden-records source must be labeled sample/demo/reference (DL-16/DL-17/DL-20A).", []),
    );
  }
}

function validateManifestContent(
  content: string | undefined,
  path: string,
  findings: NestReactRnPresetFinding[],
): void {
  if (content === undefined) {
    findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", path, "Required generated preset manifest is missing.", []));
    return;
  }
  const manifest = parseJsonObject(content, path, findings);
  if (manifest === undefined) return;
  const metadata = getObjectProperty(manifest, "metadata");
  if (!isObject(metadata) || getObjectProperty(metadata, "presetId") !== NEST_REACT_RN_PRESET_ID) {
    findings.push(
      makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, "Generated manifest metadata presetId does not match the nest-react-rn preset API.", []),
    );
  }
  const files = getObjectProperty(manifest, "files");
  if (!Array.isArray(files)) {
    findings.push(
      makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, "Generated manifest files array is missing.", []),
    );
  }
}

function validateManifestEntryContract(
  actual: UnknownObject,
  expected: NestReactRnGeneratedFileManifestEntry,
  path: string,
  findings: NestReactRnPresetFinding[],
): void {
  const outputPath = getObjectProperty(actual, "outputPath");
  const kind = getObjectProperty(actual, "kind");
  const ownership = getObjectProperty(actual, "ownership");
  const requiredStandardIds = getObjectProperty(actual, "requiredStandardIds");
  if (
    outputPath !== expected.outputPath ||
    kind !== expected.kind ||
    ownership !== expected.ownership ||
    !Array.isArray(requiredStandardIds)
  ) {
    findings.push(
      makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, `Generated file manifest metadata must match the authoritative contract for ${expected.outputPath}.`, [expected.outputPath]),
    );
  }
}

export function validateNestReactRnPresetFiles(filesInput: unknown): NestReactRnPresetValidationResult {
  const findings: NestReactRnPresetFinding[] = [];
  if (!Array.isArray(filesInput)) {
    findings.push(makeFinding("PRESET_MALFORMED_RENDER_OPTIONS", "", "Validator input must be an array of generated preset files.", []));
    return { ok: false, findings: Object.freeze(findings), fileCount: 0 };
  }

  const files: ValidatorFile[] = [];
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
    const expectedManifest = NEST_REACT_RN_PRESET_FILE_MANIFEST_BY_PATH.get(path);
    if (expectedManifest === undefined) {
      findings.push(makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, "Generated file path is not declared in the authoritative preset manifest.", [path]));
    } else {
      if (kind !== expectedManifest.kind) {
        findings.push(makeFinding("PRESET_MANIFEST_CONTENT_MISMATCH", path, "Generated file kind must match the authoritative manifest for its exact path.", [kind, expectedManifest.kind]));
      }
      validateManifestEntryContract(manifest, expectedManifest, path, findings);
    }
    files.push({ path, content });
  }

  const seen = new Set<string>();
  const byPath = new Map<string, string>();
  for (const file of files) {
    validatePath(file.path, seen, findings);
    byPath.set(file.path, file.content);
  }

  for (const requiredPath of REQUIRED_STARTER_PATHS) {
    if (!byPath.has(requiredPath)) {
      findings.push(makeFinding("PRESET_MISSING_REQUIRED_FILE", requiredPath, "Required generated starter file is missing.", [requiredPath]));
    }
  }

  validateDerivedTsconfigBase(byPath.get("tsconfig.base.json"), "tsconfig.base.json", findings);
  for (const app of STARTER_APPS) {
    validatePackageTsconfigInheritor(byPath.get(`${app.directory}/tsconfig.json`), `${app.directory}/tsconfig.json`, findings);
  }
  for (const pkg of STARTER_PACKAGES) {
    validatePackageTsconfigInheritor(byPath.get(`${pkg.directory}/tsconfig.json`), `${pkg.directory}/tsconfig.json`, findings);
  }
  validateLayoutFidelity(byPath, findings);
  validateNonPiHarness(byPath.get("vibe-engineer.config.json"), "vibe-engineer.config.json", findings);
  validateGoldenModuleLabeled(
    byPath.get("apps/api/src/golden-records/sample.ts"),
    "apps/api/src/golden-records/sample.ts",
    findings,
  );
  validateManifestContent(
    byPath.get(".vibe/generated/nest-react-rn-preset/manifest.json"),
    ".vibe/generated/nest-react-rn-preset/manifest.json",
    findings,
  );
  validateDomainNeutralText(files, findings);
  validateNoCopiedHarnessLogic(files, findings);
  validateNoPrivateScopedImport(files, findings);

  if (findings.length > 0) {
    return { ok: false, findings: Object.freeze(findings), fileCount: files.length };
  }
  return { ok: true, findings: Object.freeze([]), fileCount: files.length };
}
