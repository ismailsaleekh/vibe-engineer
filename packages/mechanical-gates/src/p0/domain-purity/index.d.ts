import type { P0ValidatorResult } from "../boundaries/index.js";

export interface DomainSurfacePolicyRow {
  kind: "core" | "extension" | "sample-demo" | "fixture" | "generated" | "vendor" | "excluded";
  path: string;
  match: "exact" | "prefix";
}

export interface DomainPurityPolicy {
  version: 1;
  proofMode: "typescript-ast-string-comment-path-carriers";
  scan: {
    include: string[];
    maxFileBytes?: number;
  };
  forbiddenTerms?: string[];
  surfaces: DomainSurfacePolicyRow[];
}

export interface DomainPurityOptions {
  policyPath?: string;
  maxFileBytes?: number;
}

export function validateDomainPurity(
  projectRoot: string,
  options?: DomainPurityOptions,
): Promise<P0ValidatorResult>;
