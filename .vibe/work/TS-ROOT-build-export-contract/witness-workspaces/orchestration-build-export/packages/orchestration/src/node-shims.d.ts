declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function writeFileSync(path: string, data: string, encoding: 'utf8'): void;
  export function mkdirSync(path: string, options: { recursive: boolean }): void;
  export function existsSync(path: string): boolean;
}

declare module 'node:path' {
  export const posix: {
    normalize(path: string): string;
  };
  export function dirname(path: string): string;
  export function resolve(...paths: readonly string[]): string;
}
