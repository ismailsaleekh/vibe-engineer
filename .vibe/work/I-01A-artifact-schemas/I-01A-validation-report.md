# I-01A Artifact Schemas Validation Report

## Status checkpoint 0 — initialized

- Verdict: IN-PROGRESS
- Validator: independent adversarial validation of `I-01A-artifact-schemas`.
- Created report before reading repository files beyond the assignment prompt.
- Owned write paths:
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-01A-artifact-schemas/I-01A-validation-report.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-01A-artifact-schemas/evidence/validation/**`
- Forbidden operations acknowledged: no stash/reset/clean/restore/checkout/commit/push; no product/source/config/doc/package/lock edits.
- Next step: read required ground-truth files and capture evidence.

## Status checkpoint 1 — source docs and brief context partially read

- Verdict: IN-PROGRESS.
- Files inspected so far:
  - `/Users/lizavasilyeva/work/harness-starter/README.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
  - `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-revalidation.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/impl-q03-brief-generated.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/impl-q03-brief-validation.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md` lines 1-667 (truncated by tool; remaining lines pending)
- Key evidence so far:
  - DL-02 locks canonical UTF-8 JSON, JSON Schema 2020-12, strict runtime validation, generated TypeScript types, fail-closed unknown/version behavior, no Markdown/YAML/frontmatter/chat-text canonical carriers, and ten artifact classes.
  - Validated Q03 brief requires `packages/artifacts/**` only, on-disk JSON→actual validator real-boundary witnesses for every artifact kind, strict unknown input narrowing, generated type drift proof, positive/negative/regression fixtures, and no self-validation.
  - Strategy requires I-01A after I-00A green; validation must explicitly check I-00A handoff safety and no hidden fake package-graph dependency.
- Blockers: none yet; remaining required context still unread.
- Next step: finish required decision/report/log reading, then inspect target repo state and actual implementation files.

## Status checkpoint 2 — required assignment reading completed; brief-added context pending

- Verdict: IN-PROGRESS.
- Additional required assignment files inspected:
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md` lines 668-end
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/implementation-report.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-01A-artifact-schemas/implementation-report.md`
  - `/Users/lizavasilyeva/work/harness-starter/.pi/tasks/session-81315-81315/be58005e0.output`
- Evidence captured:
  - I-00A implementer report claims workspace graph proof ran via actual `pnpm -r list --depth -1 --json`, created root/package skeleton and 18 package manifests, with no `packages/core` and no `node_modules`.
  - I-01A implementer report claims package-owned schemas, validator APIs, generated types, fixtures, scripts, and tests; it explicitly notes the implementation uses a package-owned strict schema interpreter rather than Ajv due to dependency/lockfile ownership concerns.
  - Implementer log confirms the Ajv/dependency issue was noticed and an in-package validator was chosen without an explicit replacement decision found in the read material so far.
- Blockers: possible validator-library/locked-decision concern to verify against package files and decisions.
- Next step: read brief-added context (`DL-01`, `DL-10`, `DL-11`, `DL-15`, audits, ready queue, ownership handoff) and inspect actual repository state.

## Status checkpoint 3 — brief-added context and repository inventory inspected

- Verdict: IN-PROGRESS.
- Additional context inspected:
  - `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/post-d1-ready-queue.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-01-repo-package-structure.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-11-test-runner-tooling.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-15-mechanical-engine.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20B-domain-neutrality-compliance-audit/DL-20B-audit-report.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24B-cross-decision-output-audit/DL-24B-audit-report.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/.vibe/ownership/I-00A-workspace-package-skeleton.md`
  - `/Users/lizavasilyeva/work/vibe-engineer/package.json`
  - `/Users/lizavasilyeva/work/vibe-engineer/pnpm-workspace.yaml`
- Inventory/status command evidence:
  - `git status --short` plus file inventories written to `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-01A-artifact-schemas/evidence/validation/status-inventory.txt`.
  - Git status shows untracked root/package/governance/decision work in this greenfield repo; path inventory shows I-01A product files are limited to `packages/artifacts/**` plus this lane work directory.
  - Sibling package inventory shows only skeleton `package.json` files outside `packages/artifacts/**`; `packages/core`, `apps`, `examples`, `.github`, and `scripts` are absent.
- Dependency/handoff evidence:
  - I-00A ownership record permits later package owners to edit only their own package manifest after skeleton handoff; I-01A edited `packages/artifacts/package.json` and did not touch root config/lock/workspace files.
  - DL-20B and DL-24B audit reports are PASS.
- Blockers under investigation: I-01A uses no Ajv dependency despite DL-02/brief expected Ajv strict mode unless explicit replacement decision exists.
- Next step: inspect actual `packages/artifacts/**` schemas, APIs, validators, generated types, fixtures, and package scripts.

## Status checkpoint 4 — package files inspected and real-boundary commands run

- Verdict: IN-PROGRESS with blocking defects found.
- Product files inspected:
  - `packages/artifacts/package.json`
  - `packages/artifacts/src/index.js`
  - `packages/artifacts/src/schema-registry.js`
  - `packages/artifacts/src/validation.js`
  - `packages/artifacts/src/errors.js`
  - representative canonical schemas including Work Brief, Implementation Plan, Verification Delta, Build Result, Ship Packet
  - `packages/artifacts/scripts/generate-types.mjs`
  - `packages/artifacts/scripts/check-generated-types.mjs`
  - `packages/artifacts/tests/run-tests.mjs`
  - `packages/artifacts/src/generated/types.d.ts`
  - `packages/artifacts/fixtures/valid/verification_delta.json`
  - `packages/artifacts/fixtures/valid/evidence_packet.json`
- Commands/witnesses run and recorded under `.../evidence/validation/`:
  - `pnpm --filter @vibe-engineer/artifacts test` → exit 0.
  - `pnpm --filter @vibe-engineer/artifacts typecheck` → exit 0, but script is only `node scripts/check-generated-types.mjs` (drift check), not a TypeScript compiler typecheck.
  - `pnpm --filter @vibe-engineer/artifacts build` → exit 0.
  - `pnpm -r list --depth -1 --json` → exit 0, confirming actual workspace package graph resolves after I-00A skeleton.
  - Runtime public-entrypoint witness via symlinked validation consumer importing `@vibe-engineer/artifacts` → exit 0; accepted valid Work Brief and rejected unknown-field invalid fixture through package exports.
  - Pinned TypeScript public-entrypoint witness (`pnpm --package=typescript@5.9.3 dlx tsc -p ...`) → exit 0; generated types are consumable from `@vibe-engineer/artifacts` through package exports.
  - Adversarial schema witness → exit 1, intentionally exposing accepted invalid artifacts.
- Blocking evidence:
  - `packages/artifacts/package.json` declares no Ajv or other strict JSON Schema validator dependency; source implements a package-owned partial schema interpreter. DL-02/brief expected Ajv strict mode unless an explicit equivalent replacement decision exists; none found.
  - `packages/artifacts/fixtures/valid/verification_delta.json` contains only one `requiredItems` layer (`schema_validation`) but DL-02/brief require Verification Delta catalog categories not to be silently skipped. Validator accepts it.
  - Adversarial witness shows validator accepts: Verification Delta missing catalog categories; Implementation Plan with embedded incomplete delta; blocked Verification Delta item missing `blockedBy`/`unblockCondition`; Evidence Packet without top-level `evidence_for`; Build Result and Ship Packet verification references pointing to non-Evidence artifacts.
- Dirty-tree note: validation created only owned validation evidence and symlinked validation consumers under `.../evidence/validation`; root `node_modules` remains absent.
- Next step: inspect remaining schema coverage and package-manager/dependency implications, then write final findings/severity.

## Final validation summary

- Final verdict: NEEDS-FIX.
- Severity summary:
  - critical: 1 — runtime validator/dependency choice violates DL-02/brief strict JSON Schema validator requirement.
  - major-local: 2 — load-bearing schema semantics accept invalid verification/evidence handoffs; I-00A dependency launch created a process/handoff risk that blocks downstream use until resolved.
  - minor-local: 1 — package `typecheck` script name is misleading because it only runs generated-type drift; independent TypeScript consumer proof passed.
  - clean: positive file-based fixtures, public runtime import, generated type drift, and workspace graph witnesses ran.

## Ground-truth files inspected

Required assignment paths inspected:

- `/Users/lizavasilyeva/work/harness-starter/README.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/locked-decisions.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/mechanical-verification-gates.md`
- `/Users/lizavasilyeva/work/harness-starter/docs/planning-research-backlog.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-revalidation.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/impl-q03-brief-generated.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-briefs/impl-q03-brief-validation.md`
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-02-artifact-schemas.md`
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md`
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-24A-planning-output-discipline.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/implementation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-01A-artifact-schemas/implementation-report.md`
- `/Users/lizavasilyeva/work/harness-starter/.pi/tasks/session-81315-81315/be58005e0.output`

Brief-added/context paths also inspected:

- `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/next/post-d1-ready-queue.md`
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-01-repo-package-structure.md`
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-10-verification-implementation.md`
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-11-test-runner-tooling.md`
- `/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-15-mechanical-engine.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-20B-domain-neutrality-compliance-audit/DL-20B-audit-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/DL-24B-cross-decision-output-audit/DL-24B-audit-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/ownership/I-00A-workspace-package-skeleton.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00A-workspace-package-skeleton/I-00A-validation-report.md`
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-00B-governance-baseline/I-00B-validation-report.md`
- root package/workspace files: `package.json`, `pnpm-workspace.yaml`, and I-00A owned-file inventory.

## Actual product/package files inspected

- `packages/artifacts/package.json`
- `packages/artifacts/README.md`
- `packages/artifacts/src/index.js`
- `packages/artifacts/src/schema-registry.js`
- `packages/artifacts/src/validation.js`
- `packages/artifacts/src/errors.js`
- `packages/artifacts/src/generated/types.d.ts`
- `packages/artifacts/scripts/generate-types.mjs`
- `packages/artifacts/scripts/check-generated-types.mjs`
- `packages/artifacts/tests/run-tests.mjs`
- Representative and summary-inspected schemas under `packages/artifacts/schemas/*.schema.json`; count is 10.
- Valid fixtures under `packages/artifacts/fixtures/valid/*.json`; count is 10.
- Invalid fixtures under `packages/artifacts/fixtures/invalid/**/*.json`; count is 42.
- Non-JSON carrier fixtures under `packages/artifacts/fixtures/invalid-carriers/*`.

## Commands and evidence paths

All commands were run from `/Users/lizavasilyeva/work/vibe-engineer` unless noted.

| Command / witness | Exit | Evidence |
| --- | ---: | --- |
| `git status --short` + inventories | 0 | `evidence/validation/status-inventory.txt` |
| `pnpm --filter @vibe-engineer/artifacts test` | 0 | `evidence/validation/pnpm_--filter_vibe-engineer_artifacts_test.log`, `.exit` |
| `pnpm --filter @vibe-engineer/artifacts typecheck` | 0 | `evidence/validation/pnpm_--filter_vibe-engineer_artifacts_typecheck.log`, `.exit` |
| `pnpm --filter @vibe-engineer/artifacts build` | 0 | `evidence/validation/pnpm_--filter_vibe-engineer_artifacts_build.log`, `.exit` |
| `pnpm -r list --depth -1 --json` | 0 | `evidence/validation/pnpm_-r_list_--depth_-1_--json.log`, `.exit` |
| Tool availability (`node`, `pnpm`, `tsc`) | 0 wrapper; `pnpm exec tsc` unavailable | `evidence/validation/tool-availability.txt` |
| Runtime public-entrypoint symlink consumer importing `@vibe-engineer/artifacts` | 0 | `evidence/validation/public-api-witness.mjs`, `.log`, `.exit` |
| TypeScript public-entrypoint consumer via pinned `pnpm --package=typescript@5.9.3 dlx tsc` | 0 | `evidence/validation/ts-consumer/**`, `typescript-public-entrypoint.log`, `.exit` |
| Static domain/dependency/schema sweeps | 0 | `evidence/validation/static-sweeps.txt`, `dependency-schema-summary.txt` |
| Adversarial schema witness | 1 expected/failing | `evidence/validation/adversarial-schema-witness.mjs`, `.log`, `.exit` |
| Source excerpt capture | 0 | `evidence/validation/source-excerpts.txt` |
| Post-command dirty/transient inventory | 0 | `evidence/validation/post-command-status.txt` |

Validation note: running the package test/build scripts rewrote the package's existing `.vibe/work/I-01A-artifact-schemas/evidence/test-results.json` because the script hardcodes that path. This is treated as ordinary validation-command transient evidence; no product source/config/package/lock file was modified by validation commands.

## Positive witness results

- Canonical schema inventory exists: 10 JSON Schema files, all with `$schema: https://json-schema.org/draft/2020-12/schema` and top-level `additionalProperties: false`.
- Runtime file-boundary witness exists: package tests and adversarial witness read actual on-disk fixtures and call the package validator APIs.
- Valid fixtures for all ten artifact kinds are accepted by `validateArtifactFile(..., { kind })`; evidence in `adversarial-schema-witness.log` and package test logs.
- Invalid fixtures supplied by implementation are rejected by package test suite; package `test` exits 0.
- Non-JSON carriers are rejected by package tests with `CARRIER_NOT_JSON`.
- Generated type drift check passes; a pinned TypeScript consumer imports types from `@vibe-engineer/artifacts` public package exports and compiles with `strict` settings.
- Public runtime API can be consumed through package exports when a workspace-style symlink is present; valid Work Brief accepted and invalid unknown-field fixture rejected.
- Actual pnpm workspace graph resolves; no dependency on a fake package graph was needed for the validation commands.
- Domain-neutrality sweep over `packages/artifacts` found no forbidden business-domain terms.

## Findings

### F1 — strict JSON Schema validator/explicit replacement requirement not met

- Severity: critical.
- Evidence:
  - DL-02 states runtime validation in `packages/artifacts` must use a strict JSON Schema validator and that v1 should use Ajv strict mode unless a later explicit equivalent replacement decision exists.
  - Q03 brief repeats: strict JSON Schema 2020-12 runtime validator, expected Ajv strict mode unless an already-green explicit replacement decision exists.
  - `packages/artifacts/package.json` has no `dependencies`, `devDependencies`, or `peerDependencies` and declares no Ajv/JSON-Schema validator or JSON-schema-to-TypeScript generator.
  - `packages/artifacts/src/validation.js` implements a bespoke partial schema interpreter using local functions (`validateSchemaNode`, `typeMatches`, `new RegExp(...)`) and ignores most JSON Schema 2020-12 vocabulary not used by the current schemas.
  - `dependency-schema-summary.txt` shows only transitive `ajv@6.15.0` in root lockfile via ESLint-related tooling, not an artifacts package dependency and not JSON Schema 2020-12 Ajv strict mode.
- Impact: package-manager/schema-library decision does not align with DL-02/brief; downstream consumers would rely on a homegrown subset rather than the locked strict JSON Schema runtime boundary.
- Required fix/ruling: either implement with an explicit pinned strict JSON Schema 2020-12 validator dependency (expected Ajv strict mode, likely requiring serialized lockfile/dependency handoff) or obtain a green explicit replacement decision that proves equivalent strict JSON Schema 2020-12 behavior.

### F2 — Verification Delta catalog completeness and blocked-item metadata are not enforced

- Severity: major-local, functionally blocking for schema dependents.
- Evidence:
  - DL-02 says missing catalog categories are validation failures unless explicitly `not_applicable` with rationale; silent skipped categories are invalid; `blocked` requires owner/condition.
  - Q03 brief requires negative witnesses for Verification Delta missing catalog categories or required item metadata.
  - `packages/artifacts/fixtures/valid/verification_delta.json` contains only one `requiredItems` layer: `schema_validation`; `dependency-schema-summary.txt` lists 15 missing catalog layers from the verification catalog.
  - `adversarial-schema-witness.log` shows `verification delta missing catalog categories is rejected` failed because the validator accepted it.
  - The same log shows an Implementation Plan with embedded incomplete Verification Delta is accepted.
  - The same log shows a Verification Delta item with `action: blocked` but without `blockedBy` and `unblockCondition` is accepted.
- Impact: plan/build/verification lanes can silently skip required verification categories, breaking the core Verification Delta contract.
- Required fix: enforce complete catalog coverage for the locked verification layer catalog, require `not_applicable` rationale per category, and require `blockedBy`/`unblockCondition` for `blocked` items in standalone and embedded Verification Delta validation.

### F3 — Evidence/Build/Ship evidence-reference link semantics are too weak

- Severity: major-local, blocks downstream build/ship/evidence consumers.
- Evidence:
  - DL-02 requires Evidence Packets to link to the artifact they prove via `evidence_for`, Build Results to reference Evidence Packet artifacts for every verification claim, and Ship Packets to link final Evidence Packets.
  - Q03 brief requires rejection of Build Result/Ship Packet claims without Evidence Packet references and Evidence Packets that cannot distinguish deterministic blockers from advisory evidence.
  - `adversarial-schema-witness.log` shows the validator accepts an Evidence Packet with top-level `links` changed from `evidence_for` to `produced_by`.
  - The same log shows the validator accepts Build Result and Ship Packet verification refs whose `artifactKind` is changed to `work_brief` and `rel` to `derived_from`.
- Impact: verification claims can point at arbitrary artifacts rather than Evidence Packets, which makes Build Result/Ship Packet truth-green shape-only.
- Required fix: enforce `evidence_for` link semantics in Evidence Packet and enforce `artifactKind: evidence_packet` plus appropriate relations/statuses for all Build Result/Ship Packet evidence references.

### F4 — dependency-gate safety for pending I-00A was not clean

- Severity: major-local process/dependency risk.
- Evidence:
  - Strategy/ready queue require I-01A product execution only after I-00A is green and ownership handoff exists.
  - I-00A validation report exists but remains `IN-PROGRESS`; it records `pnpm run workspace:surface` exit 1 on the current tree because I-01A created `packages/artifacts` source before I-00A validation could close.
  - I-00A validation report states the current-tree failure is `PACKAGE_SOURCE_CREATED` for `packages/artifacts` entries and is a sibling-contamination/process risk.
  - This validator independently reran `pnpm -r list --depth -1 --json` successfully; real package graph is not fake/shape-only.
  - Inventory shows no root/config/lock/source writes outside `packages/artifacts/**` by I-01A, apart from permitted package manifest handoff; `packages/core`, `apps`, `examples`, `.github`, and `scripts` are absent.
- Impact: no evidence of an I-01A product out-of-license write to I-00A/I-00B root/governance surfaces, and package graph proof is real; however the dependency launch was not clean because I-00A independent validation had not passed and current I-00A validation is contaminated by I-01A source.
- Required fix/ruling: downstream lanes must not consume I-01A until I-00A validation/handoff is adjudicated or revalidated around the intended source handoff; I-01A should not be marked PASS on the premise that I-00A is already green.

### N1 — package `typecheck` script is not a TypeScript typecheck

- Severity: minor-local, non-blocking only because independent TypeScript public-entrypoint witness passed.
- Evidence:
  - `packages/artifacts/package.json` sets `typecheck` to `node scripts/check-generated-types.mjs`.
  - `pnpm --filter @vibe-engineer/artifacts typecheck` exits 0 but performs only generated type drift checking.
  - Pinned validation witness with `typescript@5.9.3` proves a sample TS consumer can import the public entrypoint and generated types.
- Required fix: rename or supplement scripts in a later package-quality lane so `typecheck` means compiler typechecking when TypeScript tooling is installed.

## Sibling/blast-radius and ownership safety

- I-01A product implementation writes are limited on disk to `packages/artifacts/**`; validation evidence is under `.vibe/work/I-01A-artifact-schemas/evidence/validation/**`.
- Sibling package directories outside `packages/artifacts/**` contain only skeleton `package.json` files.
- I-00B validation report is PASS; no governance-doc edits by I-01A were observed.
- I-00A root/package graph proof is real (`pnpm -r list --depth -1 --json` exits 0), but I-00A validation is not final and reports current-tree contamination from I-01A source.
- No forbidden git operation was used by this validator. Git commands used: status/diff-style read-only status only; no stash/reset/clean/restore/checkout/commit/push.
- No source/config/package/lock file was edited by this validator.
- Root `node_modules` remains absent after validation; symlinked `node_modules` directories exist only inside owned validation evidence consumers.

## Final recommendation

Do not allow Q04/Q05/Q06 or other downstream artifact-schema consumers to proceed from I-01A as PASS. Route to an I-01A fix lane for validator-library alignment and schema semantic enforcement, and separately adjudicate/close the I-00A validation contamination/handoff before downstream scheduling relies on the workspace skeleton as green.
