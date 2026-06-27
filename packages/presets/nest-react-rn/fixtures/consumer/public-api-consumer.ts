import {
  PRETTIER_DEFAULTS,
  TEST_AND_TYPECHECK_DEFAULTS,
  TURBO_TASK_DEFAULTS,
  TYPESCRIPT_COMPILER_STRICT_OPTIONS,
  TYPE_SCRIPT_PRESET_ID,
} from "@vibe-engineer/preset-typescript";
import {
  NEST_REACT_RN_PRESET_ID,
  STARTER_LAYOUT,
  getNestReactRnPresetMetadata,
  getStarterLayoutDeclaration,
  renderNestReactRnPresetFiles,
  validateNestReactRnPresetFiles,
  type GeneratedNestReactRnPresetFile,
  type NestReactRnPresetValidationResult,
} from "@vibe-engineer/preset-nest-react-rn";

const metadata = getNestReactRnPresetMetadata();
const layout = getStarterLayoutDeclaration();
const rendered = renderNestReactRnPresetFiles();
const validation = validateNestReactRnPresetFiles(rendered);

function requireValidationSuccess(result: NestReactRnPresetValidationResult): number {
  if (!result.ok) {
    throw new Error(result.findings.map((finding) => finding.code).join(","));
  }
  return result.fileCount;
}

function firstGeneratedPath(files: readonly GeneratedNestReactRnPresetFile[]): string {
  const first = files[0];
  if (first === undefined) {
    throw new Error("Expected at least one generated preset file.");
  }
  return first.path;
}

export const consumerWitness: {
  readonly presetId: string;
  readonly consumedTypescriptPresetId: string;
  readonly fileCount: number;
  readonly firstPath: string;
  readonly appCount: number;
  readonly packageCount: number;
  readonly scope: "@vibe-engineer-starter";
  readonly goldenModule: "golden-records";
  readonly agenticHarness: "pi";
  readonly strict: true;
  readonly prettierWidth: 100;
  readonly quickGateLabel: "quality:quick";
  readonly defaultFullE2E: false;
} = {
  presetId: metadata.presetId,
  consumedTypescriptPresetId: TYPE_SCRIPT_PRESET_ID,
  fileCount: requireValidationSuccess(validation),
  firstPath: firstGeneratedPath(rendered),
  appCount: layout.apps.length,
  packageCount: layout.packages.length,
  scope: STARTER_LAYOUT.scope,
  goldenModule: STARTER_LAYOUT.goldenModule,
  agenticHarness: STARTER_LAYOUT.agenticHarness,
  strict: TYPESCRIPT_COMPILER_STRICT_OPTIONS.strict,
  prettierWidth: PRETTIER_DEFAULTS.printWidth,
  quickGateLabel: TURBO_TASK_DEFAULTS.quickGateLabel,
  defaultFullE2E: TEST_AND_TYPECHECK_DEFAULTS.defaultFullE2E,
};

if (consumerWitness.presetId !== NEST_REACT_RN_PRESET_ID) {
  throw new Error("Unexpected nest-react-rn preset id.");
}
if (consumerWitness.consumedTypescriptPresetId !== TYPE_SCRIPT_PRESET_ID) {
  throw new Error("nest-react-rn preset did not consume the TypeScript preset identity.");
}
if (consumerWitness.prettierWidth !== PRETTIER_DEFAULTS.printWidth) {
  throw new Error("Derived prettier width drifted from the consumed TypeScript preset.");
}
