#!/usr/bin/env bash
set +e
ROOT=/Users/lizavasilyeva/work/vibe-engineer
EVIDENCE="$ROOT/.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-validation-evidence"
cd "$ROOT" || exit 97
run_capture() {
  local label="$1"; shift
  local out="$EVIDENCE/${label}.stdout"
  local err="$EVIDENCE/${label}.stderr"
  local status="$EVIDENCE/${label}.status"
  printf 'cwd=%s\ncommand=%q' "$(pwd)" "$1" > "$out"
  shift
  for arg in "$@"; do printf ' %q' "$arg" >> "$out"; done
  printf '\n--- stdout ---\n' >> "$out"
  "$@" >> "$out" 2> "$err"
  local code=$?
  printf '%s\n' "$code" > "$status"
  return "$code"
}
{
  echo "cwd=$(pwd)"
  echo "command=pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false --lib ES2022 packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts packages/mechanical-gates/src/p2/code-smell/index.ts packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts"
  pnpm exec tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck false --lib ES2022 packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts packages/mechanical-gates/src/p2/code-smell/index.ts packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts
  echo "exit=$?"
} > "$EVIDENCE/03_tsc_noemit.txt" 2>&1
{
  echo "cwd=$(pwd)"
  echo "command=node --check packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs"
  node --check packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs
  echo "exit=$?"
} > "$EVIDENCE/03_node_check_witness.txt" 2>&1
{
  echo "cwd=$(pwd)"
  echo "command=find packages/mechanical-gates/src/p2/code-smell -maxdepth 8 -type f | sort"
  find packages/mechanical-gates/src/p2/code-smell -maxdepth 8 -type f | LC_ALL=C sort
  echo "exit=$?"
} > "$EVIDENCE/03_source_inventory.txt" 2>&1
{
  echo "cwd=$(pwd)"
  echo "command=find packages/mechanical-gates/src/p2/code-smell -maxdepth 8 -type f ( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' ) | sort"
  find packages/mechanical-gates/src/p2/code-smell -maxdepth 8 -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) | LC_ALL=C sort
  echo "exit=$?"
} > "$EVIDENCE/03_production_js_inventory.txt" 2>&1
{
  echo "cwd=$(pwd)"
  echo "command=rg banned escapes in P2 production source"
  rg -n "\bany\b|@ts-ignore|@ts-expect-error|@ts-nocheck|as unknown|as any|eslint-disable|non-null" packages/mechanical-gates/src/p2/code-smell
  echo "exit=$?"
} > "$EVIDENCE/03_banned_escapes.txt" 2>&1
{
  echo "cwd=$(pwd)"
  echo "command=rg regex/string heuristic risk in P2 production source"
  rg -n "RegExp|new RegExp|\.match\(|\.test\(|/[^/]+/[a-z]*|includes\(|startsWith\(|endsWith\(|replaceAll\(" packages/mechanical-gates/src/p2/code-smell
  echo "exit=$?"
} > "$EVIDENCE/03_regex_string_risk.txt" 2>&1
