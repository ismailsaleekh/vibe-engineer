#!/usr/bin/env node
// I-20B negative-suite runner.
//
// For each fixture under fixtures/ with a header `# expect: <CODE>`, runs the
// static validator and asserts:
//   (1) the validator exits NON-ZERO (fail-closed), AND
//   (2) the emitted diagnostics include the expected rule CODE (the validator
//       parses a real malformed YAML and rejects it with a named rule — a real
//       parser-boundary witness, not synthetic green).
//
// Also runs the validator against an optional positive fixture (`fixtures/pos-*`
// with header `# expect: OK`) and asserts exit 0.
//
// Exit 0 = every fixture matched its expectation; exit 1 = any mismatch.
// Read-only. No git/PM ops.

import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALIDATOR = path.join(__dirname, "validate-workflow.mjs");
const FIXTURES_DIR = path.join(__dirname, "fixtures");

function parseExpect(text) {
  const m = text.match(/^#\s*expect:\s*(\S+)/m);
  return m ? m[1] : null;
}

async function listFixtures() {
  const entries = await fs.readdir(FIXTURES_DIR);
  return entries
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .sort()
    .map((f) => path.join(FIXTURES_DIR, f));
}

function runValidator(workflowPath) {
  let stdout = "";
  let exitCode = 0;
  try {
    stdout = execFileSync(process.execPath, [VALIDATOR, `--workflow=${workflowPath}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    // Non-zero exit: capture stdout (validator writes diagnostics to stdout).
    stdout = error.stdout ? error.stdout.toString("utf8") : "";
    exitCode = error.status ?? 1;
    if (exitCode === 2 && error.stderr) {
      stdout += error.stderr.toString("utf8");
    }
  }
  return { stdout, exitCode };
}

async function main() {
  const fixtures = await listFixtures();
  if (fixtures.length === 0) {
    process.stderr.write("no fixtures found.\n");
    process.exit(1);
  }

  const results = [];
  for (const fixture of fixtures) {
    const text = await fs.readFile(fixture, "utf8");
    const expect = parseExpect(text);
    if (!expect) {
      results.push({ fixture, status: "MISSING-EXPECT", detail: "no `# expect: <CODE>` header" });
      continue;
    }
    const { stdout, exitCode } = runValidator(fixture);
    const codeRe = new RegExp(`\\[${expect}\\]`);
    if (expect === "OK") {
      const ok = exitCode === 0;
      results.push({
        fixture,
        expect,
        status: ok ? "PASS" : "FAIL",
        exitCode,
        detail: ok
          ? "exit 0 (positive clean)"
          : `expected exit 0, got ${exitCode}; stdout: ${stdout.trim()}`,
      });
    } else {
      const codeFired = codeRe.test(stdout);
      const nonZero = exitCode !== 0;
      const ok = nonZero && codeFired;
      results.push({
        fixture,
        expect,
        status: ok ? "PASS" : "FAIL",
        exitCode,
        detail: ok
          ? `non-zero exit (${exitCode}) + expected code [${expect}] fired`
          : `expected non-zero + [${expect}]; exit=${exitCode}; codeFired=${codeFired}; stdout: ${stdout.trim().slice(0, 400)}`,
      });
    }
  }

  // Report
  const width = Math.max(...results.map((r) => path.basename(r.fixture).length));
  for (const r of results) {
    const name = path.basename(r.fixture).padEnd(width);
    process.stdout.write(`${r.status.padEnd(8)} ${name}  expect=${r.expect || "-"}  ${r.detail}\n`);
  }

  const failed = results.filter((r) => r.status === "FAIL" || r.status === "MISSING-EXPECT");
  const negCount = results.filter((r) => r.expect && r.expect !== "OK").length;
  const posCount = results.filter((r) => r.expect === "OK").length;
  process.stdout.write(
    `\n${results.length - failed.length}/${results.length} fixtures matched expectation (${negCount} negative, ${posCount} positive).\n`,
  );

  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  process.stderr.write(
    `run-fixtures: internal error: ${error && error.stack ? error.stack : error}\n`,
  );
  process.exit(2);
});
