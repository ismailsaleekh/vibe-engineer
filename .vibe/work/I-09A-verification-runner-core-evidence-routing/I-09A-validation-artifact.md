# I-09A Validation Artifact

verdict: NEEDS-FIX
severity: critical
I-09B may proceed: no

## Findings summary
- critical: 1
- major-local: 4
- minor-local: 0
- clean: 0
- pending-live/BLOCKED: 0

## Gate status
- W-RB1: PASS (real plan validator -> `runVerificationPlan` -> child-process runner -> persisted Evidence Packets -> real artifacts validator).
- W-RB2: PASS (runner-produced Evidence Packet consumed by real orchestration `joinValidatedOutputs`/`inspectResumeState`; missing-packet negative invalidated).
- W-RB2.5: PASS (spawned Node from actual `packages/cli` cwd, imported `@vibe-engineer/verification` by package name, executed `runVerificationPlan`, validated packets).
- Dirty-tree/blast-radius: PASS for validator activity; zero protected/product/implementation-evidence changes outside validation-owned outputs.

## Blocking findings
1. `F-CRITICAL-SECRET-ARGV-LEAK`: secret-like argv persisted raw in a schema-valid Evidence Packet and runner sidecar. Evidence: `validation-evidence/validation-witness-summary.json`, `validation-evidence/witness-runs/r3-secret-argv-leak/`.
2. `F-MAJOR-DL22-DEFAULT-DENY`: arbitrary `node -e` command with allowed classification/no typed runner path passed instead of deny-before-spawn. Evidence: `validation-evidence/witness-runs/policy-path-env/unknown-side-effect-node-eval/`.
3. `F-MAJOR-PATH-SYMLINK-ESCAPE`: expected-artifact symlink under evidenceRoot to root `package.json` passed instead of realpath escape denial. Evidence: `validation-evidence/witness-runs/policy-path-env/symlink-escape-run/`.
4. `F-MAJOR-WITNESS-SUITE-NOT-VALIDATION-SAFE`: `packages/verification/tests/run-witnesses.mjs` hardcodes implementer `evidence/**`, so validator cannot rerun it without out-of-license overwrite.
5. `F-MAJOR-TYPECHECK-WEAKENED-BY-TS-NOCHECK`: `packages/verification/tests/run-witnesses.mjs` begins with `// @ts-nocheck`.

## Evidence paths
- Witness summary: `validation-evidence/validation-witness-summary.json`.
- Relevant Evidence Packet sweep: `validation-evidence/all-relevant-evidence-packet-sweep.json` (832 packets; 0 schema errors; 0 non-enum classifications).
- Command logs: `validation-command-log/`.
- Dirty-tree comparisons: `validation-evidence/after-validation-comparison.json`, `validation-evidence/implementation-evidence-inventory-comparison.json`.
