import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

import {
  CREATE_PI_ASSET_FAMILIES,
  selectCreatePiAssets,
  validateCreatePiAssetWritePlan,
  type CreatePiAssetConflictPolicy,
  type CreatePiAssetExistingPathKind,
  type CreatePiAssetExistingPathState,
  type CreatePiAssetPlannedWrite,
  type CreatePiAssetValidationIssue,
} from "@vibe-engineer/adapter-pi/generated-file-manifest";
import type { AdapterCapabilityMatrix, GeneratedFileManifest } from "@vibe-engineer/adapter-pi/schema";

import { CliClassification, CliErrorCode } from "../../errors/codes.js";
import { resolveVibeEngineerPackageRoot } from "./starter-template.ts";

export type PiHarnessAssetMode = "create" | "import";

export interface PiHarnessAssetWriteRecord {
  readonly kind: "pi_skill_file" | "pi_prompt_template";
  readonly familyId: "pi-skill-files" | "pi-prompt-templates";
  readonly skillId: string;
  readonly path: string;
  readonly targetPath: string;
  readonly shippedTemplatePath: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface PiHarnessAssetResult {
  readonly packageRoot: string;
  readonly templateRoot: string;
  readonly piAssetFamilies: readonly ["pi-skill-files", "pi-prompt-templates"];
  readonly skillCount: number;
  readonly promptCount: number;
  readonly extensionsPolicy: "blocked";
  readonly manifestValidation: "valid";
  readonly conflictPolicy: CreatePiAssetConflictPolicy;
  readonly writtenAssets: readonly PiHarnessAssetWriteRecord[];
}

export class PiHarnessAssetError extends Error {
  readonly code: string;
  readonly classification: string;
  readonly details: { readonly stage: "pi_asset_validation"; readonly issues: readonly CreatePiAssetValidationIssue[] };

  constructor(input: { readonly message: string; readonly code: string; readonly classification: string; readonly issues: readonly CreatePiAssetValidationIssue[] }) {
    super(input.message);
    this.name = "PiHarnessAssetError";
    this.code = input.code;
    this.classification = input.classification;
    this.details = { stage: "pi_asset_validation", issues: input.issues };
    Object.setPrototypeOf(this, PiHarnessAssetError.prototype);
  }
}

export function isPiHarnessAssetError(error: unknown): error is PiHarnessAssetError {
  return error instanceof PiHarnessAssetError;
}

const issue = (path: string, code: string, message: string): CreatePiAssetValidationIssue => ({ path, code, message, severity: "error" });

const fileSha256 = (content: string): string => `sha256:${createHash("sha256").update(content).digest("hex")}`;

const assertContained = (parent: string, child: string, path: string): void => {
  const rel = relative(parent, child);
  if (rel === "" || rel.startsWith("..")) {
    throw new PiHarnessAssetError({
      message: "Pi harness asset path resolved outside the project root.",
      code: CliErrorCode.InvalidConfig,
      classification: CliClassification.InvalidConfig,
      issues: [issue(path, "pi_asset_path_escape", "Pi harness asset path resolved outside the project root.")],
    });
  }
};

const classifyExisting = async (path: string, relativePath: string, includeContent: boolean): Promise<CreatePiAssetExistingPathState> => {
  if (!existsSync(path)) return { path: relativePath, kind: "missing" };
  const st = await lstat(path);
  if (st.isSymbolicLink()) return { path: relativePath, kind: "symlink" };
  if (st.isDirectory()) return { path: relativePath, kind: "directory" };
  if (st.isFile()) {
    if (includeContent) return { path: relativePath, kind: "file", currentContent: await readFile(path, "utf8") };
    return { path: relativePath, kind: "file" };
  }
  return { path: relativePath, kind: "symlink" };
};

const parentPaths = (assetPath: string): readonly string[] => {
  const segments = assetPath.split("/").slice(0, -1);
  const out: string[] = [];
  for (let index = 1; index <= segments.length; index += 1) {
    out.push(segments.slice(0, index).join("/"));
  }
  return out;
};

const existingPathStates = async (targetRoot: string, writes: readonly CreatePiAssetPlannedWrite[]): Promise<readonly CreatePiAssetExistingPathState[]> => {
  const paths = new Set<string>();
  for (const write of writes) {
    paths.add(write.path);
    for (const parentPath of parentPaths(write.path)) paths.add(parentPath);
  }
  const states: CreatePiAssetExistingPathState[] = [];
  for (const relativePath of [...paths].sort()) {
    states.push(await classifyExisting(resolve(targetRoot, ...relativePath.split("/")), relativePath, writes.some((write) => write.path === relativePath)));
  }
  return states;
};

const errorFromIssues = (issues: readonly CreatePiAssetValidationIssue[]): PiHarnessAssetError => {
  const hasConflict = issues.some((item) => item.code.includes("conflict") || item.code.includes("symlink") || item.code.includes("parent"));
  return new PiHarnessAssetError({
    message: hasConflict ? "Pi harness asset write plan has an existing-path conflict." : "Pi harness asset validation failed.",
    code: hasConflict ? CliErrorCode.InvalidInvocation : CliErrorCode.MissingConfig,
    classification: hasConflict ? CliClassification.WriteConflict : CliClassification.MissingPrerequisite,
    issues,
  });
};

export async function writePiHarnessAssets(input: {
  readonly targetRoot: string;
  readonly mode: PiHarnessAssetMode;
  readonly manifest: GeneratedFileManifest;
  readonly capabilityMatrix: AdapterCapabilityMatrix;
}): Promise<PiHarnessAssetResult> {
  const packageRoot = resolveVibeEngineerPackageRoot();
  const templateRoot = join(packageRoot, "templates", "pi", "runtime-fixtures");
  const targetRoot = resolve(input.targetRoot);
  const descriptors = selectCreatePiAssets({ manifest: input.manifest, capabilityMatrix: input.capabilityMatrix });
  const writes: CreatePiAssetPlannedWrite[] = [];

  for (const descriptor of descriptors) {
    const templatePath = join(packageRoot, ...descriptor.shippedTemplatePath.split("/"));
    assertContained(templateRoot, templatePath, descriptor.shippedTemplatePath);
    let content: string;
    try {
      content = await readFile(templatePath, "utf8");
    } catch {
      throw new PiHarnessAssetError({
        message: "A shipped pi asset template could not be read from the installed package.",
        code: CliErrorCode.MissingConfig,
        classification: CliClassification.MissingPrerequisite,
        issues: [issue(descriptor.shippedTemplatePath, "missing_shipped_pi_asset_template", "A shipped pi asset template could not be read from the installed package.")],
      });
    }
    writes.push({ ...descriptor, content });
  }

  const conflictPolicy: CreatePiAssetConflictPolicy = input.mode === "create" ? "fail-on-conflict" : "allow-identical-overwrite";
  const existingPaths = await existingPathStates(targetRoot, writes);
  const validation = validateCreatePiAssetWritePlan({
    manifest: input.manifest,
    capabilityMatrix: input.capabilityMatrix,
    writes,
    existingPaths,
    conflictPolicy,
  });
  if (!validation.valid) {
    throw errorFromIssues(validation.issues);
  }

  const writtenAssets: PiHarnessAssetWriteRecord[] = [];
  for (const write of validation.value.writes) {
    const targetPath = resolve(targetRoot, ...write.path.split("/"));
    assertContained(targetRoot, targetPath, write.path);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, write.content, "utf8");
    writtenAssets.push({
      kind: write.kind === "skill" ? "pi_skill_file" : "pi_prompt_template",
      familyId: write.familyId,
      skillId: write.skillId,
      path: write.path,
      targetPath,
      shippedTemplatePath: write.shippedTemplatePath,
      bytes: Buffer.byteLength(write.content, "utf8"),
      sha256: fileSha256(write.content),
    });
  }

  return {
    packageRoot,
    templateRoot,
    piAssetFamilies: [...CREATE_PI_ASSET_FAMILIES],
    skillCount: writtenAssets.filter((asset) => asset.kind === "pi_skill_file").length,
    promptCount: writtenAssets.filter((asset) => asset.kind === "pi_prompt_template").length,
    extensionsPolicy: "blocked",
    manifestValidation: "valid",
    conflictPolicy,
    writtenAssets,
  };
}
