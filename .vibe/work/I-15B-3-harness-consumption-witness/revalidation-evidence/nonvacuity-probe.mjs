// I-15B-3 REVALIDATOR — independent non-vacuity probe for the negative detectors.
//
// I (revalidator) re-implement the TWO detector regexes verbatim from the witness
// source (run-harness-consumption-witness.mjs) WITHOUT importing the witness (which
// auto-runs main()). I then run them against:
//   (a) the REAL consumer (read-only)            -> MUST be clean.
//   (b) the negative carrier files (read-only)   -> MUST be flagged.
//   (c) an INDEPENDENTLY-synthesized forbidden snippet (relative harness import +
//       a copied-logic def)                      -> MUST be flagged.
//   (d) a BENIGN control (plain code, no forbidden pattern) -> MUST be clean.
//
// This independently proves the detectors are sound + non-vacuous (not no-ops),
// beyond the witness's own self-assertion.

import { readFile } from "node:fs/promises";

const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const fixtureRoot = `${repoRoot}/examples/starter-reference/generated-fixtures/harness-consumption`;

// ---- detector regexes (verbatim from the witness) ----
const COPIED_LOGIC_SYMBOLS = [
  "validateGeneratedFileManifest", "validatePiGeneratedFileManifest",
  "getPiGeneratedFileManifest", "createPiDownstreamManifestSummary",
  "createDownstreamManifestSummary", "getPiAdapterCapabilityMatrix",
  "validateCapabilityMatrix", "writeContextProject", "createContextHeader",
  "buildContextIndex", "renderTypeScriptPresetFiles", "validateTypeScriptPresetFiles",
  "renderNestReactRnPresetFiles", "CommandLoader", "createEnvelope", "validateCliResultEnvelope",
];
const COPIED_LOGIC_DEF_PATTERN = new RegExp(
  `\\b(?:export\\s+)?(?:async\\s+)?(?:function|class|const|let|var)\\s+(?:${COPIED_LOGIC_SYMBOLS.join("|")})\\b`,
);
const PRIVATE_SCOPED_PATTERN = /(?:from\s+["']|import\s*\(\s*["']|require\s*\(\s*["'])(@vibe-engineer\/(?:preset-typescript|preset-nest-react-rn|adapter-pi|context|config|verification|security|artifacts|schematics|standards|mechanical-gates)[^"']*)["']/;
const RELATIVE_HARNESS_PATTERN = /(?:from\s+["']|import\s*\(\s*["']|require\s*\(\s*["'])((?:\.\.\/)+(?:packages|adapters|presets)\/)/;
const detectCopied = (c) => COPIED_LOGIC_DEF_PATTERN.test(c);
const detectPrivate = (c) => PRIVATE_SCOPED_PATTERN.test(c) || RELATIVE_HARNESS_PATTERN.test(c);

const cases = [];

// (a) real consumer — clean
cases.push({ id: "a-real-consumer", content: await readFile(`${fixtureRoot}/src/harness-consumer.mjs`, "utf8"), expectCopied: false, expectPrivate: false });
// (b) negative carriers — flagged
cases.push({ id: "b-neg-copied-logic", content: await readFile(`${fixtureRoot}/negatives/copied-logic/src/bad-consumer.mjs`, "utf8"), expectCopied: true });
cases.push({ id: "b-neg-private-scoped", content: await readFile(`${fixtureRoot}/negatives/private-scoped-import/src/bad-consumer.mjs`, "utf8"), expectPrivate: true });
// (c) independently synthesized forbidden snippet
cases.push({ id: "c-synth-relative-harness", content: `import { thing } from "../../packages/adapters/pi/src/index";\nexport const x = 1;`, expectPrivate: true });
cases.push({ id: "c-synth-copied-logic", content: `export function getPiAdapterCapabilityMatrix() { return null; }`, expectCopied: true });
cases.push({ id: "c-synth-private-scoped", content: `import { foo } from "@vibe-engineer/context";`, expectPrivate: true });
// (d) benign control
cases.push({ id: "d-benign-control", content: `import { runCli } from "vibe-engineer";\nexport async function main() { await runCli(); }\n`, expectCopied: false, expectPrivate: false });

const results = [];
let allCorrect = true;
for (const c of cases) {
  const copied = detectCopied(c.content);
  const priv = detectPrivate(c.content);
  const copiedOk = c.expectCopied === undefined ? true : copied === c.expectCopied;
  const privOk = c.expectPrivate === undefined ? true : priv === c.expectPrivate;
  const correct = copiedOk && privOk;
  if (!correct) allCorrect = false;
  results.push({ id: c.id, copied, private: priv, expectCopied: c.expectCopied, expectPrivate: c.expectPrivate, correct });
}
console.log(JSON.stringify({ allCorrect, results }, null, 2));
if (!allCorrect) process.exit(1);
