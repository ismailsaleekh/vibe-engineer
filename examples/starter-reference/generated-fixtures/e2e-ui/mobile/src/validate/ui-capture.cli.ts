// @sample @demo @reference — UI-verification capture/baseline validator CLI (I-17B / DL-13).
//
//   node --experimental-strip-types ./src/validate/ui-capture.cli.ts

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateUiCapture } from "./ui-capture.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const root = join(moduleDir, "../.."); // e2e-ui/mobile/

const matrix = JSON.parse(await readFile(join(root, "capture-matrix.json"), "utf8"));
const checksDir = join(root, "checks");
const checks: Record<string, unknown> = {};
for (const id of ["visual-diff", "accessibility", "layout-geometry", "interaction-state"]) {
  checks[id] = JSON.parse(await readFile(join(checksDir, `${id}.json`), "utf8"));
}
const baselines = JSON.parse(await readFile(join(root, "baselines/governance.json"), "utf8"));

const result = validateUiCapture(matrix, checks, baselines, { liveDeviceCaptureAvailable: false });
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!result.ok) {
  console.error(`ui-capture validation FAILED: ${result.errors.length} error(s)`);
  process.exit(1);
}
