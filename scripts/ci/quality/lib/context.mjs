// Shared I-20A quality-wiring context loader. Loads the canonical manifest,
// quality-wiring config, evidence schemas, the PUBLIC aggregate module, and
// collects I-20A-owned source texts for the declared/locked dependency audit.
//
// All file resolution is relative to this module's location (stable regardless of
// the caller's cwd). The aggregate is imported via the PUBLIC specifier only
// (static namespace import — no dynamic import()).

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as aggregateModule from "@vibe-engineer/mechanical-gates/aggregate";

import { assertValid } from "../../../quality/lib/schema-validator.mjs";
import { buildWiringEvidence } from "./deterministic-failure.mjs";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const QUALITY_DIR = path.resolve(MODULE_DIR, "../../../quality");
const SCHEMAS_DIR = path.join(QUALITY_DIR, "schemas");
export const PUBLIC_AGGREGATE_SPECIFIER = "@vibe-engineer/mechanical-gates/aggregate";

async function readJson(p) {
  return JSON.parse(await readFile(p, "utf8"));
}

async function resolveAggregateUrl() {
  if (typeof import.meta.resolve === "function") {
    try {
      const resolved = await import.meta.resolve(PUBLIC_AGGREGATE_SPECIFIER);
      return String(resolved);
    } catch {
      return PUBLIC_AGGREGATE_SPECIFIER;
    }
  }
  return PUBLIC_AGGREGATE_SPECIFIER;
}

async function collectOwnedSourceTexts() {
  const repoRoot = path.resolve(MODULE_DIR, "../../..");
  const entries = [];
  const files = [
    path.join(QUALITY_DIR, "run-quality.mjs"),
    path.resolve(MODULE_DIR, "../wiring-integrity-gate.mjs")
  ];
  for (const f of files) {
    try {
      const text = await readFile(f, "utf8");
      entries.push({ label: path.relative(repoRoot, f), text });
    } catch { /* optional file */ }
  }
  const dirs = [path.join(QUALITY_DIR, "lib"), MODULE_DIR];
  for (const dir of dirs) {
    let names = [];
    try { names = await readdir(dir); } catch { continue; }
    for (const name of names.filter((n) => n.endsWith(".mjs")).sort()) {
      const f = path.join(dir, name);
      const text = await readFile(f, "utf8");
      entries.push({ label: path.relative(repoRoot, f), text });
    }
  }
  return entries;
}

export async function loadQualityContext() {
  const manifest = await readJson(path.join(QUALITY_DIR, "expected-families.manifest.json"));
  const config = await readJson(path.join(QUALITY_DIR, "quality-wiring.config.json"));
  const manifestSchema = await readJson(path.join(SCHEMAS_DIR, "expected-families.manifest.schema.json"));
  const configSchema = await readJson(path.join(SCHEMAS_DIR, "quality-wiring.config.schema.json"));
  assertValid(manifest, manifestSchema, "expected-families manifest");
  assertValid(config, configSchema, "quality-wiring config");

  const aggregateResolvedUrl = await resolveAggregateUrl();
  const ownSourceTexts = await collectOwnedSourceTexts();

  return {
    manifest,
    config,
    schemasDir: SCHEMAS_DIR,
    aggregateModule,
    aggregateImportSpecifier: PUBLIC_AGGREGATE_SPECIFIER,
    aggregateResolvedUrl,
    ownSourceTexts
  };
}

/**
 * Run the full fail-closed wiring-integrity evidence build using the loaded context.
 * `expectedFamiliesOverride` lets witnesses (e.g. W-FC-NEG phantom family) supply a
 * different expected set without mutating the canonical manifest on disk.
 */
export async function runWiringGateFromContext(context, { expectedFamilies, profile, advisory = false } = {}) {
  const cfg = context.config;
  return buildWiringEvidence({
    projectRoot: process.cwd(),
    expectedFamilies: expectedFamilies ?? context.manifest.expectedFamilies,
    aggregateModule: context.aggregateModule,
    aggregateImportSpecifier: context.aggregateImportSpecifier,
    aggregateResolvedUrl: context.aggregateResolvedUrl,
    allowedImportSpecifiers: cfg.allowedImportSpecifiers,
    declaredDependencies: cfg.declaredDependencies,
    ownSourceTexts: context.ownSourceTexts,
    config: cfg,
    profile: profile ?? "ci",
    parityBlockingCommand: cfg.parityBlockingCommand,
    advisory
  });
}

export { assertValid };
export const __QUALITY_DIR = QUALITY_DIR;
export const __SCHEMAS_DIR = SCHEMAS_DIR;
