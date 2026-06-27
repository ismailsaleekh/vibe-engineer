#!/usr/bin/env node
// I-20A fail-closed wiring-integrity gate (CLI entry).
//
// Usage:
//   node scripts/ci/quality/wiring-integrity-gate.mjs \
//     --profile=ci --evidence-dir <dir> [--expected p0,p1,p2] [--advisory]
//
// Enumerates the registered-and-running tier set at runtime from the PUBLIC
// @vibe-engineer/mechanical-gates/aggregate export surface, reconciles
// expected ⊆ registered-and-running, and emits wiring-integrity evidence.
// Exit code: 0 = PASS, 2 = HARD fail-closed, 1 = internal/safety error.
//
// The canonical expected set lives in scripts/quality/expected-families.manifest.json.
// --expected overrides the expected set FOR WITNESSES ONLY (e.g. W-FC-NEG phantom
// family); the production path always uses the canonical manifest.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadQualityContext, runWiringGateFromContext, assertValid } from "./lib/context.mjs";

function parseArgs(argv) {
  const out = { profile: null, evidenceDir: null, expected: null, advisory: false, unknown: [] };
  for (const arg of argv.slice(2)) {
    if (arg === "--") continue; // args separator
    if (arg === "--advisory") { out.advisory = true; continue; }
    if (arg.startsWith("--profile=")) { out.profile = arg.slice("--profile=".length); continue; }
    if (arg.startsWith("--evidence-dir=")) { out.evidenceDir = arg.slice("--evidence-dir=".length); continue; }
    if (arg.startsWith("--expected=")) {
      out.expected = arg.slice("--expected=".length).split(",").map((s) => s.trim()).filter(Boolean);
      continue;
    }
    out.unknown.push(arg);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.unknown.length > 0) {
    console.error(`FAIL-CLOSED wiring-integrity: unknown argument(s) ${JSON.stringify(args.unknown)}.`);
    process.exit(1);
  }
  if (args.profile !== "ci") {
    console.error(`FAIL-CLOSED wiring-integrity: --profile=ci is required (got ${JSON.stringify(args.profile)}).`);
    process.exit(1);
  }
  if (!args.evidenceDir || args.evidenceDir.length === 0) {
    console.error("FAIL-CLOSED wiring-integrity: --evidence-dir=<dir> is required.");
    process.exit(1);
  }

  const context = await loadQualityContext();
  const wiringSchema = JSON.parse(await import("node:fs/promises").then((m) => m.readFile(path.join(context.schemasDir, "wiring-integrity.schema.json"), "utf8")));

  let evidence;
  try {
    evidence = await runWiringGateFromContext(context, {
      expectedFamilies: args.expected,
      profile: args.profile,
      advisory: args.advisory
    });
  } catch (error) {
    console.error(`FAIL-CLOSED wiring-integrity: gate build raised a safety violation:\n${error.message}`);
    process.exit(1);
  }

  // Evidence must be schema-valid before it is written (shape-green is not truth-green,
  // but a structurally invalid evidence artifact is itself a fail-closed condition).
  try {
    assertValid(evidence, wiringSchema, "wiring-integrity evidence");
  } catch (error) {
    console.error(`FAIL-CLOSED wiring-integrity: evidence failed schema validation:\n${error.message}`);
    process.exit(1);
  }

  await mkdir(args.evidenceDir, { recursive: true });
  const evidenceFile = path.join(args.evidenceDir, "wiring-integrity.json");
  await writeFile(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  if (evidence.verdict === "pass") {
    console.log(`wiring-integrity PASS: expected ⊆ registered-and-running (${JSON.stringify(evidence.registeredAndRunningFamilies)}).`);
    console.log(`  evidence: ${evidenceFile}`);
    process.exit(0);
  }

  console.error(evidence.diagnostic);
  console.error(`  evidence: ${evidenceFile}`);
  process.exit(evidence.exitCode);
}

main().catch((error) => {
  console.error(`FAIL-CLOSED wiring-integrity: internal error:\n${error && error.stack ? error.stack : error}`);
  process.exit(1);
});
