declare module 'node:crypto' {
  export function createHash(algorithm: string): { update(data: string | Uint8Array): { digest(encoding: 'hex'): string } };
}
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string): Uint8Array;
  export function realpathSync(path: string): string;
  export function statSync(path: string): { isDirectory(): boolean; isFile(): boolean };
}
declare module 'node:fs/promises' {
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<unknown>;
  export function readFile(path: string, encoding: 'utf8'): Promise<string>;
}
declare module 'node:path' {
  export function dirname(path: string): string;
  export function isAbsolute(path: string): boolean;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
}
declare module '@vibe-engineer/verification' {
  export function runVerificationPlan(options: Record<string, unknown>): Promise<unknown>;
}
