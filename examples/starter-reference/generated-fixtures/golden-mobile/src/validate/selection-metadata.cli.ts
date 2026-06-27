// @sample @demo @reference — selection-metadata validator CLI (I-17B / DL-12).
//
// Reads all metadata/*.json, runs the DL-12 selection + conflict validator, and
// emits the result JSON. Exits 0 only when the collection is conflict-free.
//
//   node --experimental-strip-types .../src/validate/selection-metadata.cli.ts

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateSelectionMetadata } from "./selection-metadata.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const metadataDir = join(moduleDir, "../../metadata");

const files = (await readdir(metadataDir)).filter((f) => f.endsWith(".json"));
const scenarios = [];
for (const f of files) {
  const raw = JSON.parse(await readFile(join(metadataDir, f), "utf8"));
  scenarios.push(raw);
}

const result = validateSelectionMetadata(scenarios, { allowLiveProofProven: false });
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!result.ok) {
  console.error(`selection-metadata validation FAILED: ${result.errors.length} error(s)`);
  process.exit(1);
}
