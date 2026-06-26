declare module "node:crypto" {
  export interface Hash {
    update(data: string): Hash;
    digest(encoding: "hex"): string;
  }
  export function createHash(algorithm: "sha256"): Hash;
}

declare module "node:fs/promises" {
  export interface Dirent {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }
  export interface Stats {
    size: number;
    isDirectory(): boolean;
    isFile(): boolean;
  }
  export function readdir(path: string, options: { withFileTypes: true }): Promise<Dirent[]>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function stat(path: string): Promise<Stats>;
}

declare module "node:path" {
  const path: {
    basename(value: string): string;
    dirname(value: string): string;
    extname(value: string): string;
    isAbsolute(value: string): boolean;
    join(...parts: string[]): string;
    relative(from: string, to: string): string;
    resolve(...parts: string[]): string;
    sep: string;
  };
  export default path;
}
