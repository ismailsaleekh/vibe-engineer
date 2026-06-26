import { validatePiRuntimeFixture } from "./validation.ts";
import type { PiRuntimeFixture, PiRuntimeValidationIssue, PiRuntimeValidationResult } from "./types.ts";

export type PiRuntimeExistingPathKind = "missing" | "file" | "directory" | "symlink";
export type PiRuntimeWriteConflictPolicy = "fail-on-conflict" | "allow-identical-overwrite";

export interface PiRuntimeExistingPathState {
  readonly path: string;
  readonly kind: PiRuntimeExistingPathKind;
  readonly currentContent?: string;
}

export interface PiRuntimePlannedWrite {
  readonly path: string;
  readonly content: string;
}

export interface PiRuntimeWritePlan {
  readonly fixture: PiRuntimeFixture;
  readonly conflictPolicy: PiRuntimeWriteConflictPolicy;
  readonly writes: readonly PiRuntimePlannedWrite[];
}

const issue = (issues: PiRuntimeValidationIssue[], path: string, code: string, message: string): void => {
  issues.push({ path, code, message, severity: "error" });
};

const relativePathSafe = (path: string): boolean =>
  path.length > 0 && !path.startsWith("/") && !path.startsWith("~") && !path.includes(":\\") && !path.split("/").some((segment) => segment === "" || segment === "..");

export const validatePiRuntimeWritePlan = (
  fixture: PiRuntimeFixture,
  existingPaths: readonly PiRuntimeExistingPathState[],
  conflictPolicy: PiRuntimeWriteConflictPolicy,
): PiRuntimeValidationResult<PiRuntimeWritePlan> => {
  const issues: PiRuntimeValidationIssue[] = [];
  const fixtureValidation = validatePiRuntimeFixture(fixture);
  if (!fixtureValidation.valid) {
    issues.push(...fixtureValidation.issues);
  }
  const existingByPath = new Map(existingPaths.map((entry) => [entry.path, entry]));
  for (let index = 0; index < fixture.assets.length; index += 1) {
    const asset = fixture.assets[index];
    if (asset === undefined) {
      issue(issues, `$.assets[${index}]`, "missing_asset", "Write plan cannot process a missing asset.");
      continue;
    }
    if (!relativePathSafe(asset.path)) {
      issue(issues, `$.assets[${index}].path`, "unsafe_write_path", "Write target must be a relative non-traversing fixture path.");
    }
    const existing = existingByPath.get(asset.path);
    if (existing === undefined || existing.kind === "missing") {
      continue;
    }
    if (existing.kind === "symlink") {
      issue(issues, `existingPaths.${asset.path}`, "symlink_write_escape", "Write plan refuses symlink targets because they may escape the fixture root.");
      continue;
    }
    if (existing.kind === "directory") {
      issue(issues, `existingPaths.${asset.path}`, "unsafe_overwrite_conflict", "Write plan refuses to overwrite a directory with file content.");
      continue;
    }
    if (conflictPolicy === "fail-on-conflict") {
      issue(issues, `existingPaths.${asset.path}`, "unsafe_overwrite_conflict", "Write plan refuses to overwrite existing files under fail-on-conflict policy.");
      continue;
    }
    if (existing.currentContent !== asset.content) {
      issue(issues, `existingPaths.${asset.path}`, "unsafe_overwrite_conflict", "Write plan only permits identical-content overwrites under allow-identical-overwrite policy.");
    }
  }
  if (issues.length > 0) {
    return { valid: false, issues };
  }
  return {
    valid: true,
    value: {
      fixture,
      conflictPolicy,
      writes: fixture.assets.map((asset) => ({ path: asset.path, content: asset.content })),
    },
    issues: [],
  };
};
