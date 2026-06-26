import {
  TYPESCRIPT_COMPILER_STRICT_OPTIONS,
  getTypeScriptPresetFileManifest,
  getTypeScriptPresetMetadata,
  renderTypeScriptPresetFiles,
  validateTypeScriptPresetFiles,
  type TypeScriptPresetValidationResult,
} from '@vibe-engineer/preset-typescript';

const metadata = getTypeScriptPresetMetadata();
const manifest = getTypeScriptPresetFileManifest();
const files = renderTypeScriptPresetFiles();
const result: TypeScriptPresetValidationResult = validateTypeScriptPresetFiles(files);
if (!result.ok) {
  throw new Error(result.findings.map((finding) => finding.code).join(','));
}
export const validatorConsumerResult = {
  presetId: metadata.presetId,
  manifestCount: manifest.length,
  fileCount: result.fileCount,
  strict: TYPESCRIPT_COMPILER_STRICT_OPTIONS.strict,
} as const;
