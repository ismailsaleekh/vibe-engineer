import {
  ESLINT_POLICY_DEFAULTS,
  PACKAGE_SCRIPT_DEFAULTS,
  PRETTIER_DEFAULTS,
  TEST_AND_TYPECHECK_DEFAULTS,
  TURBO_TASK_DEFAULTS,
  TYPE_SCRIPT_PRESET_ID,
  TYPESCRIPT_COMPILER_STRICT_OPTIONS,
  getTypeScriptPresetFileManifest,
  getTypeScriptPresetMetadata,
  renderTypeScriptPresetFiles,
  validateTypeScriptPresetFiles,
  type GeneratedPresetFile,
  type TypeScriptPresetValidationResult,
} from "@vibe-engineer/preset-typescript";

const metadata = getTypeScriptPresetMetadata();
const manifest = getTypeScriptPresetFileManifest();
const rendered = renderTypeScriptPresetFiles();
const validation = validateTypeScriptPresetFiles(rendered);

function requireValidationSuccess(result: TypeScriptPresetValidationResult): number {
  if (!result.ok) {
    throw new Error(result.findings.map((finding) => finding.code).join(","));
  }
  return result.fileCount;
}

function firstGeneratedPath(files: readonly GeneratedPresetFile[]): string {
  const first = files[0];
  if (first === undefined) {
    throw new Error("Expected at least one generated preset file.");
  }
  return first.path;
}

export const consumerWitness: {
  readonly presetId: string;
  readonly fileCount: number;
  readonly manifestCount: number;
  readonly firstPath: string;
  readonly strict: true;
  readonly eslintRuleCount: number;
  readonly prettierWidth: 100;
  readonly quickGateLabel: "quality:quick";
  readonly packageTypecheck: "tsc --noEmit -p tsconfig.json";
  readonly defaultFullE2E: false;
} = {
  presetId: metadata.presetId,
  fileCount: requireValidationSuccess(validation),
  manifestCount: manifest.length,
  firstPath: firstGeneratedPath(rendered),
  strict: TYPESCRIPT_COMPILER_STRICT_OPTIONS.strict,
  eslintRuleCount: ESLINT_POLICY_DEFAULTS.rules.length,
  prettierWidth: PRETTIER_DEFAULTS.printWidth,
  quickGateLabel: TURBO_TASK_DEFAULTS.quickGateLabel,
  packageTypecheck: PACKAGE_SCRIPT_DEFAULTS.typecheck,
  defaultFullE2E: TEST_AND_TYPECHECK_DEFAULTS.defaultFullE2E,
};

if (consumerWitness.presetId !== TYPE_SCRIPT_PRESET_ID) {
  throw new Error("Unexpected TypeScript preset id.");
}
