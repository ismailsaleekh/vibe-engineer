#!/usr/bin/env node
// Standalone schema-validation witness (brief §8 cmd 2). Validates every evidence
// artifact + summary JSON produced by the runner/gate against its JSON Schema using
// the self-contained pure-Node validator. Records validator + exit code.

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertValid } from "../../../../scripts/quality/lib/schema-validator.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK_ROOT = path.resolve(HERE, "..");
const EVIDENCE = path.join(WORK_ROOT, "evidence");
const REPO_ROOT = path.resolve(WORK_ROOT, "../../..");
const SCHEMAS = path.join(REPO_ROOT, "scripts/quality/schemas");

const SCHEMA_FOR = {
  "wiring-integrity.json": "wiring-integrity.schema.json",
  "summary.json": "quality-summary.schema.json"
};

async function readJson(p) {
  return JSON.parse(await readFile(p, "utf8"));
}

async function walkJson(dir) {
  const out = [];
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkJson(full)));
    else if (e.name.endsWith(".json")) out.push(full);
  }
  return out;
}

async function main() {
  const targets = [
    path.join(EVIDENCE, "pnpm-quality-run", "wiring-integrity.json"),
    path.join(EVIDENCE, "pnpm-quality-run", "summary.json"),
    path.join(EVIDENCE, "pnpm-quality-run", "p0.aggregate.json"),
    path.join(EVIDENCE, "pnpm-quality-run", "p1.aggregate.json"),
    path.join(EVIDENCE, "pnpm-quality-run", "p2.aggregate.json"),
    path.join(EVIDENCE, "w-fc-pos", "wiring-integrity.json"),
    path.join(EVIDENCE, "w-fc-neg", "wiring-integrity.json"),
    path.join(EVIDENCE, "w-run", "summary.json"),
    path.join(EVIDENCE, "w-run", "wiring-integrity.json")
  ];
  let pass = 0;
  let fail = 0;
  for (const file of targets) {
    const base = path.basename(file);
    const schemaName = SCHEMA_FOR[base];
    let detail;
    try {
      const instance = await readJson(file);
      if (!schemaName) {
        // per-tier aggregate carriers: validate the typed-carrier shape deterministically.
        const okShape = instance && typeof instance.family === "string" && typeof instance.ok === "boolean"
          && Array.isArray(instance.findings) && instance.evidence && typeof instance.evidence === "object";
        if (!okShape) throw new Error("aggregate carrier shape invalid (family/ok/findings/evidence)");
        detail = "typed-carrier shape OK";
      } else {
        const schema = await readJson(path.join(SCHEMAS, schemaName));
        assertValid(instance, schema, base);
        detail = `schema=${schemaName} OK`;
      }
      pass += 1;
      console.log(`[PASS] ${path.relative(REPO_ROOT, file)} — ${detail}`);
    } catch (error) {
      fail += 1;
      console.log(`[FAIL] ${path.relative(REPO_ROOT, file)} — ${error.message}`);
    }
  }
  console.log(`\nSCHEMA VALIDATION: ${pass} pass / ${fail} fail (validator=pure-node-json-schema-subset)`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
