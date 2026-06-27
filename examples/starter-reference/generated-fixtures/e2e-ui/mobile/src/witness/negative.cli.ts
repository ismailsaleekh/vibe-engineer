// @sample @demo @reference — e2e-ui/mobile NEGATIVE-witness CLI (I-17B / DL-13).
//
//   node --experimental-strip-types ./src/witness/negative.cli.ts --neg=missing-artifact
// Exits 0 when the DL-13 validator correctly fail-closed on the defect.

import { validateUiCapture, uiNegativeWitness, type UiNegativeWitnessId } from "../validate/ui-capture.js";

const arg = process.argv.find((a) => a.startsWith("--neg="));
const id = arg ? (arg.slice("--neg=".length) as UiNegativeWitnessId) : null;
const KNOWN: UiNegativeWitnessId[] = ["missing-artifact", "silent-baseline", "e2e-as-ui", "advisory-hard-block", "fake-live"];
if (!id || !KNOWN.includes(id)) {
  console.error(`usage: --neg=<${KNOWN.join("|")}>`);
  process.exit(2);
}

const fixture = uiNegativeWitness(id);
const result = validateUiCapture(fixture.matrix, fixture.checks, fixture.baselines, { liveDeviceCaptureAvailable: false });
const fired = result.errors.filter((e) => e.rule === fixture.expectRule && e.detail.includes(fixture.expectDetailContains));
const ok = !result.ok && fired.length > 0;

process.stdout.write(`${JSON.stringify({ negId: id, validatorRejected: !result.ok, expectedRule: fixture.expectRule, expectedRuleFired: fired.length > 0, firedErrors: fired, ok })}\n`);
if (!ok) {
  console.error(`negative witness '${id}' FAILED: validator did not fail-closed on ${fixture.expectRule}`);
  process.exit(1);
}
