import type { P0ValidatorResult } from "../boundaries/index.js";

export interface EscapeAllowlistOptions {
  policyPath?: string;
  maxFileBytes?: number;
}

export interface EscapeLocator {
  line?: number;
  textIncludes: string;
}

export interface EscapeAllowlistEntry {
  path: string;
  kind: string;
  locator: EscapeLocator;
  justification: string;
  whyUnavoidable: string;
  reviewer: string;
  reviewedOn: string;
}

export interface EscapeAllowlistPolicy {
  version: 1;
  proofMode: "typescript-ast-and-comment-scanner";
  scan: {
    include: string[];
    exclude?: string[];
    generatedVendor?: string[];
    maxFileBytes?: number;
  };
  hardBannedEscapes?: string[];
  entries: EscapeAllowlistEntry[];
}

export function validateEscapeAllowlist(
  projectRoot: string,
  options?: EscapeAllowlistOptions,
): Promise<P0ValidatorResult>;
