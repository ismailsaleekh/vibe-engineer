# I-14B Validation Artifact

Verdict: PASS
Severity: clean
Live pi proof: truth-green for real pi loader/resource visibility via `pi --mode rpc --no-session --approve --offline --no-extensions` / RPC `get_commands`.

## Evidence paths
- Validation report: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-14B-pi-adapter-runtime-skill-consumption/I-14B-validation-report.md`
- Live boundary result: `validation-evidence/10-live/pi-loader-boundary-result.json`
- Raw live RPC stdout/stderr: `validation-evidence/10-live/validator-rerun.stdout.jsonl`, `validation-evidence/10-live/product-fixture.stdout.jsonl`, matching `.stderr.txt` files
- Finisher closure check: `validation-evidence/final/finisher-closure-check.json`
- Static/type/no-production-JS: `validation-evidence/06-static/static-result.json`
- Positive generation/carrier/consumer: `validation-evidence/07-positive/positive-generation-result.json`
- Negative/fail-closed: `validation-evidence/08-negative/negative-witness-result.json`
- Regression/blast-radius: `validation-evidence/09-regression/regression-witness-result.json`

## Closure
- Real I-14A typed API consumption validated: generator uses actual capability matrix/generated-file manifest/schema APIs and validators.
- Positive witness clean: 18 generated files match product fixture hashes.
- Negative witness clean: 37 fail-closed cases, 0 failures.
- Regression/sibling/blast-radius clean: I-14A hashes and protected neighbor hashes unchanged since regression evidence; non-pi adapters remain non-selectable/not-ready.
- No production JS/MJS/CJS under `packages/adapters/pi/src/**`.
- Dirty-tree safety: no product edits by finisher; no concrete ownership violation detected in no-HEAD/untracked baseline.

## Residual risks / not claimed
- No model-provider execution, extension execution, OS/process/network sandbox proof, create/import selected-harness proof, build/ship orchestration proof, push/PR/deploy proof, or final end-to-end runtime claim is made here.
- Those remain downstream responsibilities despite I-14B resource-loader truth-green status.

## Downstream routing
- I-14B validation closed PASS/clean.
- Route downstream create/import, starter consumption, security hooks, build/ship orchestration, and end-to-end selected-pi claims to their owning lanes for independent live proofs.
