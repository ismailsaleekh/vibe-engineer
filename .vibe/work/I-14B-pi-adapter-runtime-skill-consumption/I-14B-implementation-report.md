# I-14B Implementation Report

## 1. Report initialized

Status: initialized.

Files inspected: none yet.
Files changed: this report only.
Evidence: report artifact created first as required.
Blockers: none yet.
Next step: dependency/readiness preflight.

## 2. Dependency/readiness preflight

Status: complete.

Files inspected:
- Active strategy: `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md`.
- Active ledger: `/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/ledger-compact.md`.
- I-14A post-fix revalidation report.
- I-05B and I-06 validation reports.
- DL-06 and DL-22 validation reports.

Evidence:
- Strategy states I-14B depends on I-14A + I-04 + I-05B + I-06 + I-02A + I-08 + DL-06 + DL-22 and live pi runtime may remain `pending-live/BLOCKED`.
- Ledger records I-14A post-fix revalidation `PASS` / truth-green for typed manifest; I-14B live runtime remains future/pending if unavailable.
- I-14A post-fix report records actual typed API/carrier/consumer witness clean, runtime proof not claimed by I-14A.
- I-05B validation report records `PASS/clean`; I-06 validation report records clean witness progression; DL-06 validation is `PASS/clean`; DL-22 validation is `PASS` with no critical/major findings.

Files changed: this report only.
Blockers: none.
Next step: source contract and pi-doc inspection.

## 3. Source contract and pi-doc inspection

Status: complete.

Files inspected:
- I-14A typed API: `packages/adapters/pi/src/capabilities/index.ts`, `src/generated-file-manifest/index.ts`, `src/schema/index.ts`, and adapter package manifest.
- Existing pi example manifest fixtures under `examples/harness-integrations/pi/manifest-fixtures/**`.
- Skill/context surfaces inventory under `packages/skills/**` and `packages/context/**`.
- Decision docs: `DL-03-skill-protocols.md`, `DL-06-agentic-harness-integrations.md`, `DL-22-security-safety-model.md`.
- Pi docs: `docs/skills.md`, `docs/prompt-templates.md`, `docs/extensions.md` (all chunks), `docs/packages.md`, `docs/sdk.md`, focused `docs/rpc.md` get_commands section.

Evidence:
- I-14A exposes actual typed sources for `SKILL_IDS`, generated-file family ids/contracts, capability matrix, generated-file manifest, and validators; new I-14B code can consume them by relative typed imports without package manifest edits.
- Adapter package export/script does not include I-14B modules; package manifest/shared export edits are out of license, so witnesses will invoke explicit source files/globs instead of changing package scripts/exports.
- Pi docs confirm project skill paths `.pi/skills/**/SKILL.md` and `.agents/skills/**/SKILL.md`, prompt path `.pi/prompts/*.md` non-recursive, extension paths `.pi/extensions/*.ts` or `.pi/extensions/*/index.ts`, package `pi` resource declarations, context files, SDK `DefaultResourceLoader`, and RPC `get_commands`.
- DL-03 locks the six-skill artifact chain; DL-06/DL-22 require pi-first generated assets, project-trust/security metadata, no built-in subagent/plan-mode claim, default-deny/no-secret/destructive-operation honesty, and live runtime proof only at a real boundary.

Files changed: this report only.
Blockers: none.
Next step: implementation plan and files to change.

## 4. Implementation plan and files to change

Status: complete.

Planned product files:
- `packages/adapters/pi/src/runtime/types.ts`: typed runtime fixture/asset contracts and structured error class.
- `packages/adapters/pi/src/runtime/validation.ts`: fail-closed validators for generated assets, paths, protocols, prompt templates, extension policy, package manifest, context, harness config, runtime claims, non-pi routing, and I-14A manifest joins.
- `packages/adapters/pi/src/generators/runtime-fixture-generator.ts`: deterministic generator consuming actual I-14A typed API and returning pi-compatible runtime assets for the six locked skills and required fixture families.
- `packages/adapters/pi/src/loader-witness/index.ts`: typed RPC get_commands witness plan/parser/evaluator for real pi loader boundary attempts without claiming live proof when not run.
- `packages/adapters/pi/src/runtime/write-plan.ts`: typed no-Node write-plan preflight for symlink/escape/overwrite conflict rejection.
- `examples/harness-integrations/pi/runtime-fixtures/**`: deterministic generated fixture tree.
- `.vibe/work/I-14B-pi-adapter-runtime-skill-consumption/evidence/**`: witness scripts/results.

Design:
- Use relative typed imports from I-14A modules as the source of truth for skill ids, generated-file family ids, capability matrix, generated-file manifest, and validators.
- Keep production source TypeScript only and avoid package manifest/export/script edits.
- Persist fixtures through a witness script outside production source; production generator returns typed assets and validator enforces fail-closed contracts.
- Real pi runtime proof will be attempted through RPC `get_commands`; if unavailable due trust/TTY/model/runtime constraints, classify `pending-live/BLOCKED`.

Files changed so far:
- This report.
- `packages/adapters/pi/src/runtime/types.ts`.
- `packages/adapters/pi/src/runtime/validation.ts`.
- `packages/adapters/pi/src/generators/runtime-fixture-generator.ts`.
- `packages/adapters/pi/src/loader-witness/index.ts`.
- `packages/adapters/pi/src/runtime/write-plan.ts`.

Blockers: none.
Next step: product code/fixture generation.

## 5. Product code/fixture generation

Status: complete.

Files changed:
- `packages/adapters/pi/src/runtime/types.ts`.
- `packages/adapters/pi/src/runtime/validation.ts`.
- `packages/adapters/pi/src/runtime/write-plan.ts`.
- `packages/adapters/pi/src/generators/runtime-fixture-generator.ts`.
- `packages/adapters/pi/src/loader-witness/index.ts`.
- `examples/harness-integrations/pi/runtime-fixtures/.pi/skills/{brainstorm,grill-me,task,plan,build,ship}/SKILL.md`.
- `examples/harness-integrations/pi/runtime-fixtures/.pi/prompts/vibe-{brainstorm,grill-me,task,plan,build,ship}.md`.
- `examples/harness-integrations/pi/runtime-fixtures/.pi/extensions/i14b-runtime-policy.ts`.
- `examples/harness-integrations/pi/runtime-fixtures/package.json`.
- `examples/harness-integrations/pi/runtime-fixtures/AGENTS.md` and `CLAUDE.md`.
- `examples/harness-integrations/pi/runtime-fixtures/.vibe/harness/pi-runtime.json` and `pi-runtime-assets.json`.
- Evidence script/result under `.vibe/work/I-14B-pi-adapter-runtime-skill-consumption/evidence/**`.

Command run:
- `node --experimental-strip-types .vibe/work/I-14B-pi-adapter-runtime-skill-consumption/evidence/generate-runtime-fixtures.mjs`; exit 0.

Evidence:
- `evidence/positive-generation-result.json`: `ok=true`, `assetCount=17`, six skill assets, six prompt assets, extension/package/context/config assets, `runtimeExecutionClaim=pending-live`, downstream block `pending-live/BLOCKED`.
- `evidence/positive-runtime-fixture-carrier.json`: immutable carrier of the generated typed fixture returned by the I-14B generator.
- Fixture inventory confirms generated pi-compatible assets persisted under `examples/harness-integrations/pi/runtime-fixtures/**`.

Blockers: none for static/generation work.
Next step: static/type/production-JS evidence.

## 6. Static/type/production-JS evidence

Status: complete.

Commands run from `/Users/lizavasilyeva/work/vibe-engineer`:
- `pnpm --dir packages/adapters/pi exec tsc --noEmit ... src/capabilities/index.ts src/generated-file-manifest/index.ts src/schema/index.ts src/runtime/types.ts src/runtime/validation.ts src/runtime/write-plan.ts src/generators/runtime-fixture-generator.ts src/loader-witness/index.ts`; exit 0.
- `find packages/adapters/pi/src -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) -print`; exit 0 and no output.

Evidence files:
- `evidence/static/tsc.exit` = 0; stdout/stderr captured at `evidence/static/tsc.stdout` and `evidence/static/tsc.stderr`.
- `evidence/static/production-js-sweep.txt` has 0 lines; exit captured at `production-js-sweep.exit`.

Notes:
- Direct tsc invocation is used because `packages/adapters/pi/package.json` script/export updates are out of I-14B license and current script only covers I-14A files.
- No production `.js`, `.mjs`, or `.cjs` files were added under `packages/adapters/pi/src/**`.

Blockers: none.
Next step: positive/negative/regression witness evidence.

## 7. Positive/negative/regression witness evidence

Status: complete.

Positive generation witness:
- Command: `node --experimental-strip-types .vibe/work/I-14B-pi-adapter-runtime-skill-consumption/evidence/generate-runtime-fixtures.mjs`; exit 0.
- Evidence: `evidence/positive-generation-result.json`, `evidence/positive-runtime-fixture-carrier.json`, and persisted fixture tree under `examples/harness-integrations/pi/runtime-fixtures/**`.
- Actual I-14B generator imported actual I-14A capability matrix/generated-file manifest/schema TS modules, generated all required assets, and validator accepted them against I-14A.

Negative/fail-closed + regression witness:
- Command: `node --experimental-strip-types .vibe/work/I-14B-pi-adapter-runtime-skill-consumption/evidence/negative-regression-witness.mjs`; exit 0.
- Evidence: `evidence/negative-regression-result.json`.
- Negative count: 32; all expected fail-closed cases passed.
- Covered cases include missing/duplicate/unknown/mismatched skills, missing/invalid skill frontmatter, DL-03 contradiction, prompt missing description/argument contract, nested/out-of-path prompts, invalid extension path/security/default-deny/sandbox/credential/destructive/external policy, context secret/domain/live-claim markers, invalid package pi paths/resources, unknown family, unsupported non-pi selection, path traversal/absolute path, symlink write escape, unsafe overwrite conflict, and live-runtime green claims without evidence.

Regression evidence:
- I-14A capability matrix and generated-file manifest validate through I-14A API.
- I-14A downstream summary remains exact six skills and six generated-file families, runtime claim `not-claimed`, and non-pi adapters non-selectable.
- `negative-regression-result.json` records SHA-256 hashes for I-14A source files inspected as read-only.

Blockers: none for typed/static/generation portions.
Next step: real loader/executor boundary result.

## 8. Real loader/executor boundary result

Status: complete for live pi resource-loader/RPC visibility; no model-provider execution claimed.

Commands run:
- `pi --help` captured to `evidence/pi-cli-help.txt`; confirms installed CLI supports `--mode rpc`, `--approve`, `--offline`, `--no-extensions`, `--skill`, and prompt-template loading options.
- `node --experimental-strip-types .vibe/work/I-14B-pi-adapter-runtime-skill-consumption/evidence/pi-loader-boundary-attempt.mjs`; exit 0.

Live boundary evidence:
- Evidence: `evidence/pi-loader-boundary-result.json`, `pi-loader-boundary-stdout.txt`, `pi-loader-boundary-stderr.txt`.
- Actual spawned command used fixture root cwd `/Users/lizavasilyeva/work/vibe-engineer/examples/harness-integrations/pi/runtime-fixtures` and `pi --mode rpc --no-session --approve --offline --no-extensions`.
- Actual RPC request: `{"id":"i14b-get-commands","type":"get_commands"}`.
- Result: `status=proven`, `missingCommands=[]`.
- Observed generated commands exactly include six prompt commands `vibe-{brainstorm,grill-me,task,plan,build,ship}` and six skill commands `skill:{brainstorm,grill-me,task,plan,build,ship}`.

Scope/honesty:
- This proves real pi CLI/RPC/resource loading sees generated skill and prompt assets without model-provider credentials or destructive/external mutation.
- The witness intentionally disables extensions to avoid user/global extension side effects; generated extension policy remains statically validated, not live-executed.
- No LLM/model execution, skill body execution, push/PR/deploy, or sandbox proof is claimed.
- I-14B live pi loader/resource proof is `proven`; downstream lanes that require model execution or extension execution still need their own live evidence.

Blockers: none for I-14B loader/resource proof.
Next step: dirty-tree/blast-radius evidence.

## 9. Dirty-tree/blast-radius evidence

Status: complete.

Commands/evidence:
- Path-scoped status and no-HEAD check captured at `evidence/dirty-tree/status.txt`.
- Owned inventory captured at `evidence/dirty-tree/owned-inventory.txt` (23 files) and `owned-hashes.txt`.
- Read-only I-14A inventory captured at `evidence/dirty-tree/i14a-readonly-inventory.txt`.
- Protected/root/package-manager/shared surface hashes captured at `evidence/dirty-tree/protected-hashes.txt` where files exist.

Findings:
- Target repo has no HEAD (`fatal: Needed a single revision`); normal diff attribution is unavailable, so evidence relies on path inventories/status/hashes.
- I-14B changed only owned paths: `packages/adapters/pi/src/runtime/**`, `src/generators/**`, `src/loader-witness/**`, `examples/harness-integrations/pi/runtime-fixtures/**`, and I-14B work/evidence/report paths.
- I-14A paths `src/capabilities/**`, `src/generated-file-manifest/**`, `src/schema/**`, package manifests, root package-manager/lock/config files, CLI paths, docs/decisions, CI/scripts were read-only/protected and not edited by I-14B.
- Path-scoped protected status shows the expected no-HEAD/untracked baseline (`??`) but no I-14B write was made outside owned paths.

Blockers: none.
Next step: final implementer verdict and downstream routing.

## 10. Final implementer verdict and downstream routing

Implementer verdict: DONE.

Severity/routing:
- Static/type/generation/validator portions: clean by implementer-run targeted evidence; requires independent Triad-B validation before PASS.
- Live pi runtime/resource-loader boundary: proven for real pi CLI/RPC `get_commands` visibility of generated six skill commands and six prompt commands from the persisted fixture root.
- Not claimed: model-provider execution, extension execution, OS/process/network sandboxing, create/import selected-harness behavior, build/ship orchestration, push/PR/deploy behavior, or final selected-pi truth-green across downstream workflows.

Changed product/fixture paths:
- `packages/adapters/pi/src/runtime/types.ts`
- `packages/adapters/pi/src/runtime/validation.ts`
- `packages/adapters/pi/src/runtime/write-plan.ts`
- `packages/adapters/pi/src/generators/runtime-fixture-generator.ts`
- `packages/adapters/pi/src/loader-witness/index.ts`
- `examples/harness-integrations/pi/runtime-fixtures/**`

Evidence root:
- `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-14B-pi-adapter-runtime-skill-consumption/evidence/**`

Downstream routing:
- I-14B implementation is ready for independent validation.
- I-14B no longer has a `pending-live/BLOCKED` gap for pi skill/prompt resource loading visibility.
- Downstream lanes must still independently prove their own create/import joins, model execution, extension/security hooks, build/ship orchestration, and final end-to-end claims.
