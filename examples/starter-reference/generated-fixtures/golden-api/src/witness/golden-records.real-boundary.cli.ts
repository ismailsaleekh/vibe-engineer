// @sample @demo @reference — golden-records witness CLI entry (I-16A / DL-14).
//
// Run with:
//   node --import ./src/runtime/dep-resolver-register.mjs \
//        --experimental-strip-types ./src/witness/golden-records.real-boundary.cli.ts
// Exits 0 with the five-boolean witness result JSON; exits 1 on any failure.

import { runGoldenRecordsRealBoundaryWitness } from "./golden-records.real-boundary.js";

const result = await runGoldenRecordsRealBoundaryWitness();
const allGreen = Object.values(result).every((v) => v === true);
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!allGreen) {
  console.error(`golden-records real-boundary witness FAILED: ${JSON.stringify(result)}`);
  process.exit(1);
}
