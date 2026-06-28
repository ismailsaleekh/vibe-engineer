#!/usr/bin/env node
// Copy hand-authored public declaration files for the CLI package exports.
// tsup bundles the JavaScript runtime from plain .js sources; these declarations
// are the public type contract for the package subpaths exposed in package.json.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_ROOT = path.resolve(__dirname, "..");

const COPIES = [
  ["src/entry/vibe-engineer.d.ts", "dist/entry/vibe-engineer.d.ts"],
  ["src/envelope/result-envelope.d.ts", "dist/envelope/result-envelope.d.ts"],
  ["src/command-loader/loader.d.ts", "dist/command-loader/loader.d.ts"],
];

async function copyOne([srcRel, destRel]) {
  const src = path.join(CLI_ROOT, srcRel);
  const dest = path.join(CLI_ROOT, destRel);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
  process.stdout.write(`[copy-types] ${srcRel} → ${destRel}\n`);
}

for (const pair of COPIES) {
  await copyOne(pair);
}
