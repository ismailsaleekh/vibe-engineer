#!/usr/bin/env bash
set +e
ROOT=/Users/lizavasilyeva/work/vibe-engineer
EVIDENCE="$ROOT/.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-validation-evidence"
cd "$ROOT" || exit 97
{
  echo "cwd=$(pwd)"
  echo "command=git rev-parse --show-toplevel"
  git rev-parse --show-toplevel
  echo "exit=$?"
  echo
  echo "command=git rev-parse --verify HEAD"
  git rev-parse --verify HEAD
  echo "exit=$?"
} > "$EVIDENCE/01_git_identity.txt" 2>&1
PATHS=(
  "packages/mechanical-gates/src/p2/code-smell"
  "packages/mechanical-gates/fixtures/p2/code-smell"
  ".vibe/work/I-13-mechanical-P2-smell-framework"
  "packages/mechanical-gates/package.json"
  "package.json"
  "pnpm-workspace.yaml"
  "pnpm-lock.yaml"
  "tsconfig.json"
  "packages/mechanical-gates/src/aggregate"
  "packages/mechanical-gates/src/p0"
  "packages/mechanical-gates/src/p1"
  "packages/mechanical-gates/fixtures/p0"
  "packages/mechanical-gates/fixtures/p1"
  ".github"
  "scripts"
  "pulumi"
  "Pulumi.yaml"
  "Pulumi.dev.yaml"
  "Pulumi.prod.yaml"
)
{
  echo "cwd=$(pwd)"
  echo "command=git status --short -- <scoped paths>"
  git status --short -- "${PATHS[@]}"
  echo "exit=$?"
} > "$EVIDENCE/01_git_status_scoped.txt" 2>&1
{
  echo "cwd=$(pwd)"
  echo "command=git diff --name-only -- <scoped paths>"
  git diff --name-only -- "${PATHS[@]}"
  echo "exit=$?"
} > "$EVIDENCE/01_git_diff_name_only_scoped.txt" 2>&1
{
  echo "cwd=$(pwd)"
  echo "command=git diff --stat -- <scoped paths>"
  git diff --stat -- "${PATHS[@]}"
  echo "exit=$?"
} > "$EVIDENCE/01_git_diff_stat_scoped.txt" 2>&1
{
  echo "cwd=$(pwd)"
  echo "command=git diff -- packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell"
  git diff -- packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell
  echo "exit=$?"
} > "$EVIDENCE/01_git_diff_p2_code_smell.patch" 2>&1
{
  echo "cwd=$(pwd)"
  echo "command=find scoped inventories"
  for p in \
    packages/mechanical-gates/src/p2/code-smell \
    packages/mechanical-gates/fixtures/p2/code-smell \
    .vibe/work/I-13-mechanical-P2-smell-framework \
    packages/mechanical-gates/src/aggregate \
    packages/mechanical-gates/src/p0 \
    packages/mechanical-gates/src/p1 \
    packages/mechanical-gates/fixtures/p0 \
    packages/mechanical-gates/fixtures/p1 \
    .github \
    scripts; do
    echo "## $p"
    if [ -e "$p" ]; then
      find "$p" -maxdepth 4 -type f | LC_ALL=C sort
    else
      echo "MISSING"
    fi
  done
  for p in package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json packages/mechanical-gates/package.json Pulumi.yaml Pulumi.dev.yaml Pulumi.prod.yaml pulumi; do
    echo "## $p"
    if [ -e "$p" ]; then
      if [ -d "$p" ]; then find "$p" -maxdepth 4 -type f | LC_ALL=C sort; else printf '%s\n' "$p"; fi
    else
      echo "MISSING"
    fi
  done
  echo "exit=0"
} > "$EVIDENCE/01_find_inventory_scoped.txt" 2>&1
