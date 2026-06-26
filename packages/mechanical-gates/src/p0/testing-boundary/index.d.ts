import type { P0Finding, P0ValidatorResult } from "../boundaries/index.js";

export type DependencySection = "dependencies" | "peerDependencies" | "optionalDependencies" | "devDependencies";

export interface TestingBoundaryOptions {
  policyPath?: string;
  testOnlyPackageName?: string;
}

export interface TestingBoundaryPolicy {
  proofMode: "typescript-ast";
  testOnlyPackageName: string;
  packageManifestRoots: string[];
  requiredPackageManifestPaths: string[];
  sourceRoots: string[];
  sourceExtensions: string[];
  excludedDirectoryNames: string[];
  testSurface: {
    fileSuffixes: string[];
    directorySegments: string[];
  };
  parserSelfAgreementOnly?: false;
}

export interface TestingBoundaryResult extends P0ValidatorResult {
  family: "p0.testing-boundary";
  findings: P0Finding[];
  evidence: {
    policyPath: string;
    parser: "typescript";
    proofMode: "typescript-ast";
    testOnlyPackageName: string;
    packageCount: number;
    sourceFileCount: number;
    importCount: number;
    productionImportCount: number;
    dependencyEdges: Array<{ packageName: string; section: DependencySection; dependencyName: string; productionReachable: boolean; manifestPath: string }>;
    testOnlyManifests: Array<{ manifestPath: string; private: boolean; testOnly: boolean; productionDependencyAllowed: boolean }>;
    [key: string]: unknown;
  };
}

export function validateTestingBoundary(projectRoot: string, options?: TestingBoundaryOptions): Promise<TestingBoundaryResult>;
