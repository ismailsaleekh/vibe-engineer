#!/usr/bin/env node
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { executeSchematic } from "../../../../../packages/schematics/src/engine/index.js";
import { parseGeneratedBlock } from "../../../../../packages/schematics/src/engine/markers.js";
import { validateSchematicManifestWithArtifacts } from "../../../../../packages/cli/src/commands/schematic/artifacts-adapter.js";
import * as standardsApi from "../../../../../packages/standards/src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../..");
const evidenceRoot = resolve(repoRoot, ".vibe/work/I-07B-built-in-schematics-fixtures/validation-evidence/inspection/adversarial-contract-probe");
rmSync(evidenceRoot, { recursive: true, force: true });
mkdirSync(evidenceRoot, { recursive: true });

const manifestPath = resolve(repoRoot, "packages/schematics/templates/standard-doc/manifest.json");
const targetRoot = resolve(evidenceRoot, "target");
mkdirSync(targetRoot, { recursive: true });
const actualStandard = standardsApi.loadStandard("domain-neutral-core");
const forgedInput = {
  name: "Forged Standard",
  standardId: actualStandard.standardId,
  standardTitle: "Forged title not returned by I-07C",
  standardSummary: "Forged summary not returned by I-07C",
  presetId: "vibe-engineer.typescript.strict",
  quickGateLabel: "quality:quick",
  packageManager: "pnpm@10.33.0",
  typecheckCommand: "tsc --noEmit -p packages/example/tsconfig.json"
};
const result = await executeSchematic({
  manifestPath,
  input: forgedInput,
  targetRoot,
  mode: "apply",
  deps: { validateSchematicManifest: validateSchematicManifestWithArtifacts }
});
let generated = null;
let parsed = null;
try {
  generated = readFileSync(resolve(targetRoot, "docs/standards/forged-standard.md"), "utf8");
  parsed = parseGeneratedBlock(generated);
} catch (error) {
  generated = `READ_FAILED: ${error.message}`;
}
const report = {
  expectation: "A built-in that consumes I-07C content contracts should reject or override standardTitle/standardSummary values that do not match standardsApi.loadStandard(standardId).",
  actualStatus: result.status,
  diagnostics: result.diagnostics,
  actualStandard: {
    standardId: actualStandard.standardId,
    title: actualStandard.title,
    summary: actualStandard.summary
  },
  forgedInput,
  generatedBody: parsed?.ok ? parsed.body : generated,
  generatedContainsForgedTitle: typeof generated === "string" && generated.includes(forgedInput.standardTitle),
  generatedContainsForgedSummary: typeof generated === "string" && generated.includes(forgedInput.standardSummary)
};
writeFileSync(resolve(evidenceRoot, "result.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (result.status === "ok" && report.generatedContainsForgedTitle && report.generatedContainsForgedSummary) {
  process.exitCode = 2;
} else {
  process.exitCode = 0;
}
