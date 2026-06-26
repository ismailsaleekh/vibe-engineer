export interface EphemeralWorkspace {
  root: string;
  writeFile(relativePath: string, contents: string): Promise<string>;
  dispose(): Promise<void>;
}

export interface CreateEphemeralWorkspaceOptions {
  prefix?: string;
}

export interface TypedFindingLike {
  ruleId: string;
  blocking: boolean;
  [key: string]: unknown;
}

export interface TypedResultLike {
  ok: boolean;
  findings: TypedFindingLike[];
  [key: string]: unknown;
}

export function createEphemeralWorkspace(options?: CreateEphemeralWorkspaceOptions): Promise<EphemeralWorkspace>;
export function assertOkResult<T extends TypedResultLike>(result: T, label?: string): T;
export function assertBlockingFinding<T extends TypedResultLike>(result: T, ruleId: string, label?: string): TypedFindingLike;
export function normalizeForSnapshot<T>(value: T): T;
