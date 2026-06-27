// @sample @demo @reference — golden-mobile NEGATIVE-witness CLI (I-17B / DL-12).
//
// Confirms the DL-12 selection+conflict validator FAIL-CLOSES on each W-NEG-*
// defect. Run as:
//   node --experimental-strip-types ./src/witness/negative.cli.ts --neg=sel-conflict
// Exits 0 when the validator correctly fired the expected rule on the broken
// fixture (i.e. the gate is load-bearing); exits non-zero when the validator
// FAILED to reject the defect (gate weakened) or the defect id is unknown.

import { validateSelectionMetadata, negativeWitness, type NegativeWitnessId } from "../validate/selection-metadata.js";

const arg = process.argv.find((a) => a.startsWith("--neg="));
const id = arg ? (arg.slice("--neg=".length) as NegativeWitnessId) : null;

const KNOWN: NegativeWitnessId[] = ["sel-conflict", "missing-metadata", "maestro-only-policy", "detox-only-policy", "fake-live"];
if (!id || !KNOWN.includes(id)) {
  console.error(`usage: --neg=<${KNOWN.join("|")}>`);
  process.exit(2);
}

const fixture = negativeWitness(id);
const result = validateSelectionMetadata(fixture.scenarios, { allowLiveProofProven: false });
const fired = result.errors.filter(
  (e) => e.rule === fixture.expectRule && e.detail.includes(fixture.expectDetailContains)
);
const ok = !result.ok && fired.length > 0; // validator MUST reject + name the rule

process.stdout.write(
  `${JSON.stringify({
    negId: id,
    validatorRejected: !result.ok,
    expectedRule: fixture.expectRule,
    expectedRuleFired: fired.length > 0,
    firedErrors: fired,
    ok
  })}\n`
);
if (!ok) {
  console.error(`negative witness '${id}' FAILED: validator did not fail-closed on ${fixture.expectRule}`);
  process.exit(1);
}
