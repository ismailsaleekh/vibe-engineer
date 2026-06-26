declare module 'node:crypto' {
  export function createHash(algorithm: string): { update(data: unknown): { digest(encoding: 'hex' | string): string } };
}

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding?: string): any;
  export function realpathSync(path: string): string;
  export function statSync(path: string): { isDirectory(): boolean; size: number };
  export function lstatSync(path: string): { isSymbolicLink(): boolean };
}

declare module 'node:fs/promises' {
  export function mkdir(path: string, options?: any): Promise<void>;
  export function readFile(path: string, encoding?: string): Promise<string>;
  export function writeFile(path: string, data: string, options?: any): Promise<void>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function rm(path: string, options?: any): Promise<void>;
}

declare module 'node:path' {
  export function dirname(path: string): string;
  export function isAbsolute(path: string): boolean;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
  export function basename(path: string, ext?: string): string;
  export function join(...paths: string[]): string;
  export function extname(path: string): string;
  export const sep: string;
}

declare module 'node:child_process' {
  export function spawn(command: string, args?: readonly string[], options?: any): any;
}

declare const process: { execPath: string; pid: number; env: Record<string, string | undefined> };
declare const Buffer: any;
declare const TextDecoder: any;
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number): any;
