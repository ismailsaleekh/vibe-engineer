#!/usr/bin/env node
// I-20A local aggregate quality runner (pnpm quality entry).
//
// Usage:
//   pnpm quality -- --profile=ci --evidence-dir <dir> --summary-out <json>
//
// CLI flag parsing accepts BOTH standard forms for every value flag:
// the `=`-form (`--profile=ci`) AND the space-form (`--profile ci`).
// Unknown / malformed flags fail-closed.
//
// Runs the fail-closed wiring-integrity gate FIRST (blocks on any declared-but-
// unregistered family — prevents the mechanical §7 "partial gate" failure), then
// spawns the REAL aggregate runner for every registered-and-running tier via the
// PUBLIC @vibe-engineer/mechanical-gates/aggregate export, writes schema-valid
// per-tier evidence + a summary JSON, and exits 0 only when wiring passes AND every
// spawned aggregate returns ok:true. The SAME command is the local/CI parity path.
//
// No new package dependency: Node built-ins + the public aggregate export only.

import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

import { loadQualityContext, runWiringGateFromContext, assertValid } from "../ci/quality/lib/context.mjs";

// Known value flags (name -> out-field setter). No boolean flags exist today;
// adding one means a new branch below + a witness (do not silently coerce).
const KNOWN_VALUE_FLAGS = new Map([
  ["--profile", (out, v) => { out.profile = v; }],
  ["--evidence-dir", (out, v) => { out.evidenceDir = v; }],
  ["--summary-out", (out, v) => { out.summaryOut = v; }]
]);

// Accepts BOTH the `=`-form (`--profile=ci`) and the space-form (`--profile ci`)
// for every known value flag. `--` is the pnpm/npm args separator (contract:
// `pnpm quality -- ...`) and is skipped. Unknown flags or a value flag missing
// its value are recorded as unknown so the caller fails-closed (no silent accept).
function parseArgs(argv) {
  const out = { profile: null, evidenceDir: null, summaryOut: null, unknown: [] };
  const tokens = argv.slice(2);
  let i = 0;
  while (i < tokens.length) {
    const arg = tokens[i];
    if (arg === "--") { i += 1; continue; } // pnpm/npm args separator
    // `=`-form: --flag=value (indexOf so empty values like `--profile=` are preserved)
    const eq = arg.startsWith("--") ? arg.indexOf("=") : -1;
    if (eq > 2) {
      const name = arg.slice(0, eq);
      const value = arg.slice(eq + 1);
      const setter = KNOWN_VALUE_FLAGS.get(name);
      if (setter) { setter(out, value); i += 1; continue; }
      out.unknown.push(arg);
      i += 1;
      continue;
    }
    // space-form: --flag value
    if (KNOWN_VALUE_FLAGS.has(arg)) {
      const value = tokens[i + 1];
      if (value === undefined) {
        // value flag with no following value -> malformed -> fail-closed
        out.unknown.push(arg);
        i += 1;
        continue;
      }
      KNOWN_VALUE_FLAGS.get(arg)(out, value);
      i += 2;
      continue;
    }
    out.unknown.push(arg);
    i += 1;
  }
  return out;
}

function failClosed(message, exitCode = 1) {
  console.error(`FAIL-CLOSED quality: ${message}`);
  process.exit(exitCode);
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.unknown.length > 0) failClosed(`unknown argument(s) ${JSON.stringify(args.unknown)}.`);
  if (args.profile !== "ci") failClosed(`--profile=ci is required (got ${JSON.stringify(args.profile)}).`);
  if (!args.evidenceDir) failClosed("--evidence-dir=<dir> is required.");
  if (!args.summaryOut) failClosed("--summary-out=<json> is required.");

  const projectRoot = process.cwd();
  const context = await loadQualityContext();
  const summarySchema = JSON.parse(await readFile(path.join(context.schemasDir, "quality-summary.schema.json"), "utf8"));
  const wiringSchema = JSON.parse(await readFile(path.join(context.schemasDir, "wiring-integrity.schema.json"), "utf8"));

  await mkdir(args.evidenceDir, { recursive: true });

  // 1) Fail-closed wiring-integrity gate (canonical manifest). Blocks before any
  //    aggregate run if a declared family is not registered-and-running.
  let wiring;
  try {
    wiring = await runWiringGateFromContext(context, { profile: args.profile });
  } catch (error) {
    failClosed(`wiring-integrity gate raised a safety violation:\n${error.message}`);
  }
  try {
    assertValid(wiring, wiringSchema, "wiring-integrity evidence");
  } catch (error) {
    failClosed(`wiring-integrity evidence failed schema validation:\n${error.message}`);
  }
  const wiringFile = path.join(args.evidenceDir, "wiring-integrity.json");
  await writeJson(wiringFile, wiring);

  if (wiring.verdict !== "pass") {
    // Wiring failed: do NOT spawn a partial aggregate run. Emit a fail-closed summary.
    const summary = {
      schemaVersion: "quality.summary/1",
      profile: args.profile,
      generatedAt: new Date().toISOString(),
      projectRoot,
      evidenceDir: path.resolve(args.evidenceDir),
      wiring: {
        verdict: wiring.verdict,
        expectedFamilies: wiring.expectedFamilies,
        registeredAndRunningFamilies: wiring.registeredAndRunningFamilies,
        missingFamilies: wiring.missingFamilies,
        evidenceFile: wiringFile
      },
      tiers: [],
      overallOk: false,
      exitCode: wiring.exitCode
    };
    try {
      assertValid(summary, summarySchema, "quality summary");
    } catch (error) {
      failClosed(`summary failed schema validation:\n${error.message}`);
    }
    await writeJson(args.summaryOut, summary);
    console.error(wiring.diagnostic);
    console.error(`  wiring evidence: ${wiringFile}`);
    console.error(`  summary: ${args.summaryOut}`);
    process.exit(wiring.exitCode);
  }

  // 2) Spawn the REAL aggregate runner for every registered-and-running tier.
  const runPattern = /^runP(\d+)Aggregate$/;
  const perTierResults = [];
  for (const exportName of wiring.runtimeEnumeration.perTier.filter((t) => t.running).map((t) => t.exportName)) {
    const family = `p${runPattern.exec(exportName)[1]}`;
    const runner = context.aggregateModule[exportName];
    let result = null;
    let runError = null;
    try {
      result = await runner(projectRoot);
    } catch (error) {
      runError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
    const evidenceFile = path.join(args.evidenceDir, `${family}.aggregate.json`);
    if (result) {
      await writeJson(evidenceFile, result);
    }
    const blocking = result ? result.findings.filter((f) => f && f.blocking).length : 0;
    perTierResults.push({
      family,
      exportName,
      registered: true,
      running: true,
      carrierFamily: result ? result.family : null,
      ok: result ? Boolean(result.ok) : false,
      findingCount: result ? result.findings.length : 0,
      blockingFindingCount: blocking,
      implementedFamilies: result && result.evidence && Array.isArray(result.evidence.implementedFamilies) ? [...result.evidence.implementedFamilies] : [],
      evidenceFile: result ? evidenceFile : null,
      runError
    });
  }

  const aggregatesOk = perTierResults.every((t) => t.ok);
  // N3 (skipped required delta category): every declared tier must produce evidence.
  const missingEvidence = perTierResults.filter((t) => !t.evidenceFile || t.runError);
  let n3Diagnostic = null;
  if (missingEvidence.length > 0) {
    n3Diagnostic = `required tier(s) produced no evidence: ${missingEvidence.map((t) => t.family).join(", ")}`;
  }

  const overallOk = wiring.verdict === "pass" && aggregatesOk && !n3Diagnostic;
  const exitCode = overallOk ? 0 : 2;

  const summary = {
    schemaVersion: "quality.summary/1",
    profile: args.profile,
    generatedAt: new Date().toISOString(),
    projectRoot,
    evidenceDir: path.resolve(args.evidenceDir),
    wiring: {
      verdict: wiring.verdict,
      expectedFamilies: wiring.expectedFamilies,
      registeredAndRunningFamilies: wiring.registeredAndRunningFamilies,
      missingFamilies: wiring.missingFamilies,
      evidenceFile: wiringFile
    },
    tiers: perTierResults,
    overallOk,
    exitCode,
    skippedCategoryDiagnostic: n3Diagnostic
  };
  try {
    assertValid(summary, summarySchema, "quality summary");
  } catch (error) {
    failClosed(`summary failed schema validation:\n${error.message}`);
  }
  await writeJson(args.summaryOut, summary);

  console.log(`quality ${overallOk ? "PASS" : "FAIL"} (profile=${args.profile})`);
  console.log(`  wiring: ${wiring.verdict} | aggregates ok: ${perTierResults.map((t) => `${t.family}=${t.ok ? "ok" : "fail"}(${t.blockingFindingCount} blocking)`).join(", ")}`);
  console.log(`  evidence dir: ${path.resolve(args.evidenceDir)}`);
  console.log(`  summary: ${args.summaryOut}`);
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(`FAIL-CLOSED quality: internal error:\n${error && error.stack ? error.stack : error}`);
  process.exit(1);
});
