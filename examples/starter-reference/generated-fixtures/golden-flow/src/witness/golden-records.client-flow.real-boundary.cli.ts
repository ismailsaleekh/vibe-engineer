// @sample @demo @reference — golden-records client-flow witness CLI entry (I-16B / DL-14).
//
// Run with:
//   node --import ./src/runtime/dep-resolver-register.mjs \
//        --experimental-strip-types ./src/witness/golden-records.client-flow.real-boundary.cli.ts
// Exits 0 with the six-boolean witness result JSON; exits 1 on any failure.

import { runGoldenRecordsClientFlowRealBoundaryWitness } from "./golden-records.client-flow.real-boundary.js";

const result = await runGoldenRecordsClientFlowRealBoundaryWitness();
const allGreen = Object.values(result).every((v) => v === true);
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!allGreen) {
  console.error(`golden-records client-flow real-boundary witness FAILED: ${JSON.stringify(result)}`);
  process.exit(1);
}
