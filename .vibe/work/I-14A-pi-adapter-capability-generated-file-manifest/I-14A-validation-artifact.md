# I-14A Validation Artifact

verdict: NEEDS-FIX

severity_counts:
- critical: 1
- major-local: 1
- minor-local: 0
- clean: 0

report: /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/I-14A-validation-report.md

key_evidence:
- `pnpm --dir packages/adapters/pi run typecheck` -> exit 0.
- `find packages/adapters/pi/src -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) -print` -> exit 0, no output.
- Validator-owned real-boundary witness: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/validation-evidence/validator-manifest-boundary.mjs` -> exit 1 due fail-closed defects.
- Witness result: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/validation-evidence/validator-manifest-boundary-result.json`.
- Witness summary: `/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/validation-evidence/validator-downstream-summary.json`.

findings:
- F-CRITICAL-01: schema accepts I-14A `runtimeExecutionClaim: proven` and downstream summary silently maps it to `pending-live` instead of failing.
- F-MAJOR-01: generated-file manifest validator accepts missing required pi skill path patterns and arbitrary produced-by lane metadata.

downstream_routing:
- I-14A is not truth-green.
- Block I-14B/I-15A/I-21/I-23 and direct consumers until I-14A fix + revalidation passes.
- Live pi runtime and create/import selected-harness behavior remain unproven and owned by I-14B/I-15A after I-14A contract is fixed.

unresolved_risks:
- No pending-live/BLOCKED seam for validation execution; real API/carrier/consumer witness ran.
- Dirty-tree baseline is no-HEAD/untracked; no concrete I-14A ownership conflict found.
