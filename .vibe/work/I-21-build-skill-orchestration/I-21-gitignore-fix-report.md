# I-21 .gitignore Durability Fix — Report (Triad-B FIX)

- **Fixer:** Triad-B FIX agent (glm-5.2 via zai, thinking: high).
- **Task:** `I-21-gitignore-fix.md`. Fix the over-broad `.gitignore:7 build/` rule that gitignores I-21's owned source dirs `packages/skills/src/build/**` and `packages/cli/src/commands/build/**` (found as F1 major-local in revalidation).
- **Quality bar:** `prompts/quality-bar.md` prepended verbatim, binding. Implementer is NOT its own judge (separate revalidation follows).
- **Owned WRITE paths:** `.gitignore`; `gitignore-fix-evidence/**`; this report.
- **Date:** 2026-06-27.

## Root-cause analysis

The `.gitignore` line 7 `build/` rule (under `# Build outputs`, alongside `dist/`, `coverage/`) matches ANY directory named `build/` anywhere in the tree. I-21's owned **source** subtrees are named `build/`:
- `packages/cli/src/commands/build/` (the `vibe-engineer build` CLI command source).
- `packages/skills/src/build/` (the build-skill source).

Both are legitimate **source** directories, not build artifacts. The rule was intended for build outputs, but **this repo's build-output contract is unambiguously `dist/**`** (turbo.json `tasks.build.outputs: ["dist/**"]`; package `build` scripts produce/check `dist/`). A repo-wide scan confirms **zero** legitimate `build/` build-output directories in the product tree — every `build/` dir is either source or a runtime-fixture/evidence path. So the bare `build/` rule guards nothing real and exclusively harms source.

## Chosen fix (option c — reword/scope, not negation)

**Remove the bare `build/` line.** Rationale:
- **Robust (won't break on future source `build/` dirs):** negation rules (option b) require enumerating every source `build/` dir and silently break when a new one is added — explicitly warned against in the task. Removal has no such fragility.
- **Faithful to repo intent:** the rule was meant for build artifacts; the repo's only real build artifacts are `dist/` (already ignored on the adjacent line). No `build/`-output convention exists, so the bare rule matched zero legitimate targets.
- **Scoping to "known output roots" (option a) is inapplicable:** there is no `build/` output root in this repo to scope to.
- Removal is the minimal, durable, faithful change. `dist/` + `coverage/` continue to cover real build outputs.

## Stage log (checkpointed incrementally)
- [x] 0. Report scaffolded.
- [x] 1. Read binding direction (revalidation F1 + current `.gitignore`).
- [x] 2. Root-cause: confirmed repo build-output contract = `dist/**` (turbo.json); no legitimate `build/` output dir exists in the product tree.
- [x] 3. BEFORE witness: `git check-ignore -v` → `.gitignore:7:build/` for BOTH `packages/skills/src/build/index.js` and `packages/cli/src/commands/build/index.ts` (exit 0 = ignored). Both invisible in porcelain. `dist/` ignored at line 6.
- [x] 4. Applied fix: removed bare `build/` line; added an explanatory NOTE comment (faithful to intent, documents the contract for future editors).
- [x] 5. AFTER witness: `git check-ignore` on both source dirs → exit 1 (NOT ignored); both now appear as `??` (trackable) in porcelain. `dist/` still ignored (now line 9); `coverage/` still ignored (line 10).
- [x] 6. No-regression sweep (see below).
- [x] 7. Dirty-tree scope: delta is ONLY `.gitignore` (4-line change) + evidence/report.

## Witnesses (real-boundary, re-runnable)

### W-BEFORE (gitignored source dirs)
`git check-ignore -v packages/skills/src/build/index.js packages/cli/src/commands/build/index.ts` →
```
.gitignore:7:build/   packages/skills/src/build/index.js
.gitignore:7:build/   packages/cli/src/commands/build/index.ts
```
exit 0. Both invisible to `git status --porcelain`. → defect reproduced.

### W-AFTER-1 (source dirs no longer ignored)
`git check-ignore -v packages/skills/src/build/index.js packages/cli/src/commands/build/index.ts` → no output, exit 1 (NOT ignored). Both now appear as `?? packages/cli/src/commands/build/` and `?? packages/skills/src/build/` in porcelain (trackable). ✓

### W-AFTER-2 (real build outputs still ignored)
`git check-ignore -v packages/orchestration/dist/index.js` → `.gitignore:9:dist/` exit 0. `coverage/` → `.gitignore:10:coverage/` ignored. ✓

### W-NOREGRESS (no tracked file status flip; only source/fixture `build/` dirs become visible)
`diff before-porcelain.txt after-porcelain.txt` shows, beyond the intended `M .gitignore`:
- `?? packages/cli/src/commands/build/` (intended — I-21 source). ✓
- `?? packages/skills/src/build/` (intended — I-21 source). ✓
- `?? .vibe/work/I-14B-.../runtime-fixture-rerun/.pi/skills/build/` (a `SKILL.md` runtime fixture — source, not artifact; under already-untracked `.vibe/work/`).
- `?? .vibe/work/POST-I05A-.../registry-pnpm-commands/build/` (witness-result evidence files `command/exit/stderr/stdout` — evidence, not artifact; under already-untracked `.vibe/work/`).
- `?? examples/harness-integrations/pi/runtime-fixtures/.pi/skills/build/` (a `SKILL.md` fixture; its PARENT `.pi/` has tracked siblings e.g. `i14b-runtime-policy.ts` → this fixture was being SILENTLY DROPPED by the bad rule, a real durability bug my fix now repairs).

Assessment: all 5 newly-visible `build/` dirs are source/fixture/evidence, NOT build artifacts — consistent with the fix's intent (the over-broad rule was harming exactly this class of path). **No tracked file changed status** (no `D`, no spurious `M` from the gitignore change). `dist/` + `coverage/` build outputs remain ignored. No regression; rather, 3 additional false-positive victims of the bad rule are now correctly trackable (none auto-tracked; all still require explicit `git add`).

### W-SCOPE (dirty-tree — only owned WRITE paths touched)
`git status --porcelain -- .gitignore .vibe/work/I-21-build-skill-orchestration/gitignore-fix-evidence .vibe/work/I-21-build-skill-orchestration/I-21-gitignore-fix-report.md` →
```
 M .gitignore
?? .../I-21-gitignore-fix-report.md
?? .../gitignore-fix-evidence/
```
`.gitignore` diff is exactly: remove `build/` + add 3 NOTE lines (+3/-1). No other file edited by this fixer. No git stash/reset/clean/checkout/restore; no commits/push/PR; no package-manager ops.

## Verdict

**DONE** — the over-broad `.gitignore:7 build/` rule is removed (replaced with an explanatory NOTE documenting the `dist/**` build-output contract). Both I-21 owned source subtrees (`packages/skills/src/build/**`, `packages/cli/src/commands/build/**`) are NO LONGER gitignored and are now trackable; real build outputs (`dist/`, `coverage/`) remain ignored; no tracked file regressed; dirty-tree scope is exactly `.gitignore` + this evidence/report. Approach chosen (remove + document, not negation) is robust against future source `build/` dirs and faithful to repo intent. A separate revalidation follows (implementer is not its own judge).

## Evidence
Under `gitignore-fix-evidence/`: `before-porcelain.txt`, `before-check-ignore.txt`, `after-porcelain.txt`, `after-check-ignore.txt`.
