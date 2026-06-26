import {
  TYPE_SCRIPT_PRESET_ID,
  getTypeScriptPresetFileManifest,
  renderTypeScriptPresetFiles,
  validateTypeScriptPresetFiles,
  type GeneratedPresetFile,
  type TypeScriptPresetFindingCode,
} from "@vibe-engineer/preset-typescript";

const rendered: readonly GeneratedPresetFile[] = renderTypeScriptPresetFiles({ includeSampleSource: true });
const result = validateTypeScriptPresetFiles(rendered);
if (!result.ok) {
  const codes: readonly TypeScriptPresetFindingCode[] = result.findings.map((finding) => finding.code);
  throw new Error(codes.join(","));
}
const manifest = getTypeScriptPresetFileManifest();
export const consumerEvidence = {
  presetId: TYPE_SCRIPT_PRESET_ID,
  fileCount: result.fileCount,
  manifestCount: manifest.length,
  firstPath: rendered[0]?.path,
} as const;
