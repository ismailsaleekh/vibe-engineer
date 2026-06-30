#!/usr/bin/env node
// I-20B static workflow validator (CLI entry).
//
// Usage:
//   node scripts/ci/github-quality/validate-workflow.mjs --workflow <path>
//
// Parses a GitHub Actions workflow with the locked `js-yaml` parser (real typed
// boundary), runs the full positive-contract + negative-suite rule set, and:
//   - exit 0 + a positive diagnostics report when the workflow satisfies the
//     contract (zero findings), OR
//   - exit 1 + one diagnostic per finding (each tagged with a stable CODE) when
//     any rule is violated.
//
// This validator is itself the lane's load-bearing witness: W-QG-POS runs it
// against the REAL `.github/workflows/quality.yml`; W-QG-NEG runs it against each
// of the 11 negative fixtures and asserts the expected rule code fires.
//
// Read-only: takes a workflow path, writes nothing. No git/PM ops.

import { readWorkflow, ParseError } from "./lib/yaml.mjs";
import { runAllRules, RULES } from "./lib/rules.mjs";

function parseArgs(argv) {
  const out = { workflow: null, unknown: [] };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--") continue;
    if (arg.startsWith("--workflow=")) {
      out.workflow = arg.slice("--workflow=".length);
      continue;
    }
    if (arg === "--workflow") {
      const next = rest[i + 1];
      if (typeof next !== "string" || next.startsWith("--")) {
        out.unknown.push(arg);
        continue;
      }
      out.workflow = next;
      i++;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    out.unknown.push(arg);
  }
  return out;
}

const HELP = `Usage: validate-workflow.mjs --workflow <path>
  Parses a GitHub Actions workflow and asserts the I-20B positive contract.
  Exit 0 = clean (zero findings); exit 1 = violations (one diagnostic per finding).`;

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(`${HELP}\n`);
    process.exit(0);
  }
  if (args.unknown.length > 0) {
    process.stderr.write(
      `validate-workflow: unknown argument(s) ${JSON.stringify(args.unknown)}.\n`,
    );
    process.exit(2);
  }
  if (!args.workflow) {
    process.stderr.write("validate-workflow: --workflow=<path> is required.\n");
    process.exit(2);
  }

  let doc;
  try {
    ({ doc } = await readWorkflow(args.workflow));
  } catch (error) {
    if (error instanceof ParseError) {
      process.stderr.write(`FAIL [YAML-PARSE] ${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }

  const findings = runAllRules(doc);

  if (findings.length === 0) {
    const ruleNames = RULES.map((r) => r.name).join(", ");
    process.stdout.write(
      `OK workflow ${args.workflow} satisfies the I-20B quick-gate contract (0 findings; rules: ${ruleNames}).\n`,
    );
    process.exit(0);
  }

  for (const f of findings) {
    process.stdout.write(`FAIL [${f.code}] (${f.severity}) ${f.message}\n`);
  }
  process.stdout.write(`\n${findings.length} finding(s); ${findings.length} blocking.\n`);
  process.exit(1);
}

main().catch((error) => {
  process.stderr.write(
    `validate-workflow: internal error: ${error && error.stack ? error.stack : error}\n`,
  );
  process.exit(2);
});
