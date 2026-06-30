import {
  ValidationErrorCode,
  validateArtifact,
  validateArtifactFile,
  validateArtifactKind,
} from "@vibe-engineer/artifacts";

export { ValidationErrorCode };

export function validateWorkBriefArtifact(artifact, artifactPath) {
  return validateArtifactKind("work_brief", artifact, artifactPath ? { artifactPath } : {});
}

export function validateAnyArtifact(artifact, artifactPath) {
  return validateArtifact(artifact, artifactPath ? { artifactPath } : {});
}

export function validateWorkBriefFile(filePath) {
  return validateArtifactFile(filePath, { kind: "work_brief" });
}

export function validateAnyArtifactFile(filePath) {
  return validateArtifactFile(filePath);
}
