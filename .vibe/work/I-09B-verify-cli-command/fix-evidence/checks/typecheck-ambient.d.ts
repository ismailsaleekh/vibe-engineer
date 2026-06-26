declare const process: { execPath: string; pid: number };
declare class Buffer {
  readonly buffer: ArrayBufferLike;
  readonly byteOffset: number;
  readonly byteLength: number;
  subarray(start: number, end?: number): Buffer;
  static from(value: unknown): Buffer;
  static concat(chunks: Buffer[]): Buffer;
  static byteLength(value: string): number;
}
declare class TextDecoder {
  constructor(label?: string, options?: { fatal?: boolean });
  decode(input?: any): string;
}

declare module "node:crypto" {
  export function createHash(algorithm: string): { update(value: unknown): { digest(encoding: string): string } };
}

declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string): unknown;
  export function realpathSync(path: string): string;
  export function statSync(path: string): { isDirectory(): boolean; size: number };
  export function lstatSync(path: string): { isSymbolicLink(): boolean };
}

declare module "node:fs/promises" {
  export function mkdir(path: string, options?: unknown): Promise<void>;
  export function readFile(path: string, encoding?: string): Promise<string>;
  export function writeFile(path: string, data: string, options?: unknown): Promise<void>;
  export function rename(from: string, to: string): Promise<void>;
  export function rm(path: string, options?: unknown): Promise<void>;
}

declare module "node:path" {
  export const sep: string;
  export function dirname(path: string): string;
  export function basename(path: string, suffix?: string): string;
  export function join(...parts: string[]): string;
  export function isAbsolute(path: string): boolean;
  export function relative(from: string, to: string): string;
  export function resolve(...parts: string[]): string;
}

declare module "node:child_process" {
  export function spawn(command: string, args?: string[], options?: unknown): any;
}
