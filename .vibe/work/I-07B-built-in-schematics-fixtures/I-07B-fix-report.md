# I-07B Fix Report

## Status
DONE - root-cause fix completed; independent revalidation required.

## Scope / License
Owned write paths only:
- packages/schematics/src/builtins/**
- packages/schematics/templates/**
- packages/schematics/fixtures/builtins/**
- .vibe/work/I-07B-built-in-schematics-fixtures/**

## Stage Log

### Stage 0 - Initialize
- Created this report first.
- Files changed: `.vibe/work/I-07B-built-in-schematics-fixtures/I-07B-fix-report.md`
- Next: read required briefs/reports/evidence and relevant dependency contracts before product edits.

### Stage 1 - Required reads and root-cause inspection
- Read required implementation brief, brief validation artifact, implementer report, independent validation artifact/report, and validation evidence including `adversarial-contract-probe.mjs` and `static-sweep.json`.
- Inspected relevant read-only contracts: I-07A engine/manifest/template input/render paths, artifacts schematic manifest schema, standards JS/d.ts API, TypeScript preset TS source/package context.
- Inspected current I-07B owned product files: `packages/schematics/src/builtins/index.js`, six manifests/templates, valid/invalid fixtures, expected bodies, and witness script.
- Root cause confirmed:
  - production helper is JS under `packages/schematics/src/builtins/index.js`;
  - raw manifest input schema accepts arbitrary `standardTitle`/`standardSummary`, so real engine can render forged standards content;
  - `module` manifest duplicates `deterministic-schematics`.
- Next: convert production helper to TypeScript, adapt witness to compile/import the TS helper from fix evidence, strengthen manifests/contracts against actual standards/preset outputs, and add adversarial negative witness.

### Stage 2 - Product fix implementation
- Replaced production JS helper `packages/schematics/src/builtins/index.js` with TypeScript source `packages/schematics/src/builtins/index.ts`; removed the JS production file.
- Updated the fixture witness to compile/import the TypeScript built-in helper into lane fix evidence before using it.
- Strengthened built-in manifest input schemas so each built-in's primary `standardId`, `standardTitle`, and `standardSummary` are exact regex-constrained to the corresponding actual I-07C standard contract values, while the TypeScript preset fields remain exact-constrained to actual I-07D preset outputs.
- Added TypeScript helper contract assertions that compare manifest schema constraints, manifest standard IDs, and preset required file kinds against actual I-07C/I-07D APIs.
- Removed the duplicate `deterministic-schematics` standard ID from `packages/schematics/templates/module/manifest.json`.
- Added invalid fixtures for forged standards content and forged preset-derived content.
- Files changed: `packages/schematics/src/builtins/index.ts`, deleted `packages/schematics/src/builtins/index.js`, six `packages/schematics/templates/*/manifest.json`, `packages/schematics/fixtures/builtins/run-builtins-witnesses.mjs`, `packages/schematics/fixtures/builtins/inputs/invalid/standard-doc-forged-standard-content.json`, `packages/schematics/fixtures/builtins/inputs/invalid/module-forged-preset-contract.json`, this report.
- Next: run targeted TypeScript compile, JS syntax, built-ins witness, adversarial probe, and I-07A regression evidence under `fix-evidence/**`.

### Stage 3 - Targeted fix evidence
- TypeScript production helper compile: exit `0`; command evidence `fix-evidence/commands/tsc-builtins.*`; compiled artifact under `fix-evidence/typescript/schematics-builtins-compiled/**`.
- JS/MJS syntax check: exit `0`; command evidence `fix-evidence/commands/node-check.*`; checked only witness-only `packages/schematics/fixtures/builtins/run-builtins-witnesses.mjs` (no production JS/MJS remains under `src/builtins`).
- Built-ins real-boundary witness: exit `0`; command evidence `fix-evidence/commands/builtins-witness.*`; summary `fix-evidence/builtins/summary.json` reports `ok: true` for manifest/contracts, dry-run/apply/idempotency, standards/preset consumption, invalid/forged inputs, path/template/conflict/policy cases.
- Validator failed forged-content scenario: exit `0`; evidence `fix-evidence/inspection/adversarial-contract-probe/result.json`; forged `standardTitle`/`standardSummary` are rejected by the TypeScript built-in contract helper and by raw I-07A engine/input-schema boundary with `invalid_input`, and no forged generated body is written.
- I-07A engine generation seam regression: exit `0`; evidence `fix-evidence/commands/i07a-engine.*` and `fix-evidence/regression/i07a-engine/summary.json` with `ok: true`.
- Static sweep: exit `0`; evidence `fix-evidence/inspection/static-sweep.json`; `productionJsMjs: []`, witness `.mjs` only under fixtures, and all manifests have no duplicate `standardIds`.
- Dirty-tree scoped status/diff/file list recorded under `fix-evidence/dirty-tree/**`; no root/package manifest/lockfile/CLI loader/shared-surface edits were made by this fixer.

## Commands / Evidence
- `find` inventory commands over validation evidence, owned product files, and read-only dependency surfaces.
- `python3` manifest inspection for pre-fix `standardIds` and `standardTitle`/`standardSummary` schema shape.
- `node_modules/.bin/tsc packages/schematics/src/builtins/index.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --strict true --exactOptionalPropertyTypes true --noUncheckedIndexedAccess true --declaration true --sourceMap false --outDir .vibe/work/I-07B-built-in-schematics-fixtures/fix-evidence/typescript/schematics-builtins-compiled --rootDir packages/schematics/src --skipLibCheck false` -> `0`.
- `python3` node-check scan over `packages/schematics/src/builtins` and `packages/schematics/fixtures/builtins` -> `0`.
- `node packages/schematics/fixtures/builtins/run-builtins-witnesses.mjs --evidence-root .vibe/work/I-07B-built-in-schematics-fixtures/fix-evidence/builtins` -> `0`.
- `node --input-type=module` adversarial forged standards contract probe -> `0`.
- `node packages/schematics/fixtures/engine/run-engine-witnesses.mjs --evidence-root .vibe/work/I-07B-built-in-schematics-fixtures/fix-evidence/regression/i07a-engine --case generation-seam` -> `0`.
- `python3` static sweep for production JS/MJS and duplicate standard IDs -> `0`.

## Final Status
DONE - root-cause fix completed; independent revalidation required.

## Blockers
None.
