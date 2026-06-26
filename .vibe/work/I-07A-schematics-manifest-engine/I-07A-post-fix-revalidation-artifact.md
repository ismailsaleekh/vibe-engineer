# I-07A Post-Fix Independent Revalidation Artifact

Verdict: PASS
Severity classification: clean for in-license I-07A engine/CLI surfaces; pending-live/BLOCKED for RB4 default shipped binary seam.

## Scope

Revalidated actual post-fix on-disk I-07A state under:

- `packages/schematics/src/{engine,manifest,template}/**`
- `packages/schematics/fixtures/engine/**`
- `packages/cli/src/commands/schematic/**`

No product files were edited by this validator. Only the revalidation report and this artifact were written in the target repo; scratch witness output was written under `/tmp/i-07a-post-fix-revalidation`.

## Evidence summary

- Original defects fixed at root cause:
  - same-marker generated body edits now conflict with `generated_body_mismatch` and do not overwrite;
  - partial/template paths are static-relative checked inside the template root and escape attempts block as `unsafe_template`;
  - `replace_marked_section` uses embedded generated-section parsing, preserves handwritten prefix/suffix, and conflicts on missing/multiple/edited sections;
  - dry-run/apply includes deterministic `plan_fingerprint`; CLI supports `--plan-file` and stale plans block with `plan_fingerprint_mismatch` before writes.
- Commands rerun:
  - `node --check` over owned JS/MJS files: exit 0.
  - canonical engine witness rerun: `ok: true`, 20 cases, 0 failed.
  - canonical CLI witness rerun: `ok: true`, 4 cases, 0 failed.
  - targeted post-fix probes for same-marker/no-partial-write, partial escape, embedded sections, and actual CLI plan carrier: all passed.
- RB4:
  - actual default entry `node packages/cli/src/entry/vibe-engineer.js schematic ...` exits 2 with blocked machine envelope and writes 0 target files;
  - `schematic` remains only a later command in default loader, not registered;
  - classify RB4 as `pending-live/BLOCKED` pending serialized I-02A/default-loader registration witness.
- Dirty-tree safety:
  - dirty tree baseline preserved;
  - no stash/reset/clean/checkout/restore;
  - no package-manager mutation;
  - no commits/pushes;
  - no out-of-license product edits by this validator.

## Downstream state

I-07A local schematics engine/CLI command implementation is clean except RB4. I-07A can feed non-default-binary local dependents under orchestrator scheduling, but shipped/default `vibe-engineer schematic` claims and any dependent live binary claim remain blocked on RB4; I-07B still requires its other upstream gates (`I-07C`, `I-07D`) per strategy.
