cwd: /Users/lizavasilyeva/work/vibe-engineer
command: for d in packages/cli packages/artifacts packages/orchestration; do if [ -d "$d" ]; then find "$d" -type f -print; fi; done | sort | xargs shasum -a 256; for p in package.json turbo.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json; do if [ -e "$p" ]; then shasum -a 256 "$p"; fi; done
stdout: /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-09A-verification-runner-core-evidence-routing/post-fix-validation-rerun-evidence/final/blast-radius-hashes-after.stdout.txt
stderr: /Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-09A-verification-runner-core-evidence-routing/post-fix-validation-rerun-evidence/final/blast-radius-hashes-after.stderr.txt
started: 2026-06-25T15:00:14Z
exit_code: 0
ended: 2026-06-25T15:00:14Z
summary: final inventory/blast-radius command captured.
