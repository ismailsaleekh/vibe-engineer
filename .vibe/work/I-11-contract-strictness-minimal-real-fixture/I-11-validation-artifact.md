# I-11 Validation Artifact

## Verdict

- Verdict: `NEEDS-FIX`
- Severity counts: critical 0; major-local 1; minor-local 0; clean 0.
- Blocking finding: `F-MAJOR-01` — mandatory fresh P1 validator typecheck command failed (`TS6053` root files not found under `pnpm --filter @vibe-engineer/contracts exec` cwd semantics). Corrected absolute-path equivalent passed, and all contract seams/regressions passed, but the prompt says failed mandatory typecheck evidence is `major-local`.

## Files inspected

- Required I-11 context: implementation prompt/report, launch readiness, I-11S validation report/artifact, TS-ROOT post-fix validation artifact, HLO ledger/status/handoff, mechanical verification docs, verification layer, DL-11/DL-14/DL-15 decisions.
- Product/implementation files: `packages/contracts/{package.json,tsconfig.json,schema-contract-strictness.manifest.json}`, all I-11 contract/provider/generated-client/generator/consumer/witness TS files, P1 validator TS files, and P1 witness MJS.
- Sibling/blast-radius: root manifests/configs, `packages/mechanical-gates/package.json`, mechanical-gates aggregate/P0 inventories and representative files, P0 fixtures via regression witnesses, docs/examples/CI/script/starter inventories.
- Implementation evidence under `.vibe/work/I-11-contract-strictness-minimal-real-fixture/**` was inspected read-only.

## Validator-written files

- `I-11-validation-report.md`
- `I-11-validation-artifact.md`
- `validation-evidence/**`
- `validation-command-log/**`

No product/root/package-manager/shared/aggregate/P0 files were edited by this validator.

## Command table

| id | cwd | command | exit | evidence |
| --- | --- | --- | ---: | --- |
| 001 | harness-starter | initial `mkdir -p` with missing log dir | 1 | `validation-command-log/001-init-dirs.log` |
| 002 | harness-starter | create validation dirs | 0 | `validation-command-log/002-init-dirs-success.log` |
| 003 | target root | implementation workdir inventory | 0 | `validation-command-log/003-implementation-workdir-inventory.log` |
| 004 | target root | `node_modules/.bin/tsc --noEmit --project packages/contracts/tsconfig.json` | 0 | `validation-command-log/004-contracts-typecheck.log` |
| 005 | target root | mandatory `pnpm --filter @vibe-engineer/contracts exec tsc --noEmit ... packages/mechanical-gates/...` | 1 | `validation-command-log/005-p1-validator-typecheck.log` |
| 006 | target root | corrected absolute-path P1 validator typecheck | 0 | `validation-command-log/006-p1-validator-typecheck-absolute.log` |
| 007 | target root | node_modules resolution inventory | 0 | `validation-command-log/007-node-modules-resolution-inventory.log` |
| 008 | target root | validation probe first run | 1 | `validation-command-log/008-validation-probe.log` |
| 009 | target root | provenance-copy diff for validator script failure analysis | 0 | `validation-command-log/009-provenance-copy-diff.log` |
| 010 | target root | validation probe rerun | 0 | `validation-command-log/010-validation-probe-rerun.log`, `validation-evidence/i11-validation-probe-result.json` |
| 011 | mechanical-gates | P0 testing-boundary witness | 0 | `validation-command-log/011-p0-testing-boundary.log` |
| 012 | mechanical-gates | P0 testing-boundary typecheck witness | 0 | `validation-command-log/012-p0-testing-boundary-typecheck.log` |
| 013 | mechanical-gates | P0 allowlist/domain/aggregate witness | 0 | `validation-command-log/013-p0-allowlist-domain-aggregate.log` |
| 014 | mechanical-gates | P0 surface/config/boundaries witness | 0 | `validation-command-log/014-p0-surface-config-boundaries.log` |
| 015 | target root | blast-radius/ownership sweep | 0 | `validation-command-log/015-blast-radius-ownership-sweep.log` |
| 016 | target root | refined top-level production `@vibe-engineer/testing` dependency sweep | 0 | `validation-command-log/016-production-testing-dependency-refined.log` |
| 017 | target root | mechanical-gates shared/P0 inventory | 0 | `validation-command-log/017-mechanical-shared-p0-inventory.log` |

## Real-boundary truth-green result

PASS in validation-owned probe. `runReferenceFlowRealBoundaryWitness()` returned all booleans true. Direct valid provider call returned 200 and ran application logic; invalid request returned 400 before logic; forced invalid provider response threw before exposure; generated client rejected invalid API response; consumer imported/called generated client and returned schema-valid response.

## Positive / negative / provenance witnesses

- Positive P1: family `p1.schema-contract-strictness`, `ok: true`, zero findings, `proofMode: typescript-ast`, expected files and named schemas.
- Negatives failed closed with typed blocking findings for duplicate DTO/schema, bare shape, broad record, boundary `JSON.parse`, request/response validation bypass, stale/missing generated-client provenance, parser-only test, malformed/missing manifest, regex proof, path traversal, unknown option, and missing required fixture.
- Provenance: contract SHA-256 `effd2821d303d2e0650cabf82018df89d35040484c07c38db2629d44173cf352` matches generated client; generator reproduced exact generated file from validation-owned copy.

## Regression / blast-radius / TS policy

- P0 regression witnesses all passed.
- No I-11 refs in mechanical-gates package manifest, aggregate, P0 source, or P0 fixtures.
- Root/shared hashes recorded; key protected hashes match implementation preflight/final for root package/lock/workspace/turbo and mechanical-gates package manifest.
- No top-level production workspace manifest dependency on `@vibe-engineer/testing`; `packages/core` path absent.
- I-11 production code is TypeScript-first; only lane witness/evidence `.mjs`/compiled `.js` artifacts are non-production.

## Dirty-tree / ownership conclusion

Dirty no-HEAD greenfield baseline confirmed; no clean-tree assumption, destructive git command, package-manager mutation, or out-of-license validator write occurred. I-11 implementation writes observed are limited to licensed I-11 paths plus inherited I-11S package-manager state.

## Downstream routing

`NEEDS-FIX`: block I-11 and dependents pending adjudication/fix of `F-MAJOR-01` mandatory typecheck command evidence. Contract seam itself is truth-green; no critical or pending-live finding was found.
