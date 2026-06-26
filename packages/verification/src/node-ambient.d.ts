declare module 'node:fs' {
  const fs: any;
  export default fs;
  export const existsSync: any;
  export const realpathSync: any;
  export const statSync: any;
  export const readFileSync: any;
  export const readdirSync: any;
  export const mkdirSync: any;
  export const writeFileSync: any;
}
declare module 'node:fs/promises' {
  const fsp: any;
  export default fsp;
}
declare module 'node:path' {
  const path: any;
  export default path;
  export const dirname: any;
  export const basename: any;
  export const join: any;
  export const resolve: any;
  export const relative: any;
  export const isAbsolute: any;
}
declare module 'node:child_process' {
  export const spawn: any;
}
declare module 'node:assert/strict' { const assert: any; export default assert; }
declare module 'node:url' { export const fileURLToPath: any; }
declare const process: any;
declare const Buffer: any;
declare const TextDecoder: any;
