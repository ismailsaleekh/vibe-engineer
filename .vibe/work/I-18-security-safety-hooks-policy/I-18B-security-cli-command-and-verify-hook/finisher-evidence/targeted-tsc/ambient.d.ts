// Finisher-owned SUPPLEMENTARY targeted-tsc ambient (mirrors I-09B validator pattern).
// Declares the TS-02A/I-18A-deferred untyped sibling surfaces as `any` so the converted
// `index.ts` annotation structure can be typechecked in isolation. These ambients are
// NOT written to the product tree; the in-repo strict-tsc-green gate is deferred to TS-02A.
declare module "@vibe-engineer/security";
declare module "cli-envelope";
declare module "cli-codes";
declare module "cli-sanitization";
declare module "node:fs";
declare module "node:fs/promises";
declare module "node:path";
declare const process: any;