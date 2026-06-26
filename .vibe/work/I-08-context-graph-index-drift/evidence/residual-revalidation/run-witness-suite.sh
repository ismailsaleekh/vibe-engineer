#!/usr/bin/env bash
set -u
TARGET="/Users/lizavasilyeva/work/vibe-engineer"
EVID="/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-08-context-graph-index-drift/evidence/residual-revalidation"
OUT="$EVID/package-and-direct-witness-commands.txt"
mkdir -p "$EVID"
: > "$OUT"
FAIL=0

record_header() {
  local label="$1"
  local cwd="$2"
  local command="$3"
  {
    echo
    echo "## $label"
    echo "cwd: $cwd"
    echo "command: $command"
  } | tee -a "$OUT"
}

run_cmd() {
  local label="$1"
  local cwd="$2"
  shift 2
  local quoted=""
  printf -v quoted '%q ' "$@"
  record_header "$label" "$cwd" "$quoted"
  (cd "$cwd" && "$@") >> "$OUT" 2>&1
  local code=$?
  echo "exit: $code" | tee -a "$OUT"
  if [ "$code" -ne 0 ]; then FAIL=1; fi
}

run_bash() {
  local label="$1"
  local cwd="$2"
  local command="$3"
  record_header "$label" "$cwd" "$command"
  (cd "$cwd" && bash -lc "$command") >> "$OUT" 2>&1
  local code=$?
  echo "exit: $code" | tee -a "$OUT"
  if [ "$code" -ne 0 ]; then FAIL=1; fi
}

run_cmd "node check context src" "$TARGET" node --check packages/context/src/index.js
run_cmd "node check real-boundary witness" "$TARGET" node --check packages/context/tests/real-boundary-witness.mjs
run_cmd "node check negative witness" "$TARGET" node --check packages/context/tests/negative-witness.mjs
run_cmd "node check schema witness" "$TARGET" node --check packages/context/tests/schema-strictness-witness.mjs

run_bash "public context import package-local" "$TARGET/packages/context" "node --input-type=module -e 'const m = await import(\"@vibe-engineer/context\"); const names = [\"writeContextProject\",\"validateContextProject\",\"checkContextDrift\",\"retrieveContextClosure\"]; for (const name of names) if (typeof m[name] !== \"function\") throw new Error(name); console.log(\"context public import ok\", names.join(\",\"));'"
run_bash "public artifacts import package-local" "$TARGET/packages/context" "node --input-type=module -e 'const m = await import(\"@vibe-engineer/artifacts\"); if (typeof m.validateArtifactFile !== \"function\") throw new Error(\"validateArtifactFile missing\"); console.log(\"artifacts public import ok\");'"
run_bash "public context import pnpm filter" "$TARGET" "pnpm --filter @vibe-engineer/context exec node --input-type=module -e 'const m = await import(\"@vibe-engineer/context\"); const names = [\"writeContextProject\",\"validateContextProject\",\"checkContextDrift\",\"retrieveContextClosure\"]; for (const name of names) if (typeof m[name] !== \"function\") throw new Error(name); console.log(\"context pnpm import ok\", names.join(\",\"));'"
run_bash "public artifacts import pnpm filter" "$TARGET" "pnpm --filter @vibe-engineer/context exec node --input-type=module -e 'const m = await import(\"@vibe-engineer/artifacts\"); if (typeof m.validateArtifactFile !== \"function\") throw new Error(\"validateArtifactFile missing\"); console.log(\"artifacts pnpm import ok\");'"

run_cmd "pnpm context typecheck" "$TARGET" pnpm --filter @vibe-engineer/context typecheck
run_bash "pnpm context test owned root" "$TARGET" "VIBE_CONTEXT_WITNESS_ROOT=\"$EVID/package-test\" pnpm --filter @vibe-engineer/context test"
run_bash "pnpm context build owned root" "$TARGET" "VIBE_CONTEXT_WITNESS_ROOT=\"$EVID/package-build\" pnpm --filter @vibe-engineer/context build"

run_bash "direct real-boundary witness" "$TARGET/packages/context" "VIBE_CONTEXT_WITNESS_ROOT=\"$EVID/direct-real-boundary\" VIBE_CONTEXT_EVIDENCE_PATH=\"$EVID/direct-real-boundary/result.json\" node tests/real-boundary-witness.mjs"
run_bash "direct negative witness" "$TARGET/packages/context" "VIBE_CONTEXT_WITNESS_ROOT=\"$EVID/direct-negative\" VIBE_CONTEXT_EVIDENCE_PATH=\"$EVID/direct-negative/result.json\" node tests/negative-witness.mjs"
run_bash "direct schema strictness witness" "$TARGET/packages/context" "VIBE_CONTEXT_WITNESS_ROOT=\"$EVID/direct-schema\" VIBE_CONTEXT_EVIDENCE_PATH=\"$EVID/direct-schema/result.json\" node tests/schema-strictness-witness.mjs"

if [ "$FAIL" -ne 0 ]; then
  echo "witness suite failed" | tee -a "$OUT"
  exit 1
fi

echo "witness suite passed" | tee -a "$OUT"
