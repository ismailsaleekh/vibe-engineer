import { validateArtifactKind, validateArtifactFile } from "@vibe-engineer/artifacts";

export function validateSchematicManifestWithArtifacts(data, options = {}) {
  return validateArtifactKind("schematic_manifest", data, options);
}

export function validateSchematicManifestFileWithArtifacts(filePath) {
  return validateArtifactFile(filePath, { kind: "schematic_manifest" });
}
