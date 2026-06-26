#!/usr/bin/env bash
set +e
ROOT=/Users/lizavasilyeva/work/vibe-engineer
EVIDENCE="$ROOT/.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-validation-evidence"
TMPDIR="$EVIDENCE/tmp"
export TMPDIR
capture() {
  local label="$1"; shift
  local cwd="$1"; shift
  local out="$EVIDENCE/${label}.stdout"
  local err="$EVIDENCE/${label}.stderr"
  local status="$EVIDENCE/${label}.status"
  {
    echo "cwd=$cwd"
    printf 'command='
    printf '%q ' "$@"
    printf '\n--- stdout ---\n'
  } > "$out"
  (cd "$cwd" && "$@") >> "$out" 2> "$err"
  local code=$?
  printf '%s\n' "$code" > "$status"
  return "$code"
}
capture 05_p0_allowlist_domain_aggregate "$ROOT/packages/mechanical-gates" node fixtures/p0/allowlist-domain-aggregate/witness.mjs
capture 05_p0_surface_config_boundaries "$ROOT/packages/mechanical-gates" node fixtures/p0/surface-config-boundaries/witness.mjs
capture 05_p0_testing_boundary "$ROOT/packages/mechanical-gates" node fixtures/p0/testing-boundary/witness.mjs
capture 05_p1_aggregate_source_check "$ROOT" node --check packages/mechanical-gates/src/aggregate/p1/run-p1-aggregate.js
capture 05_p1_aggregate_witness_check "$ROOT" node --check packages/mechanical-gates/fixtures/p1/aggregate/witness.mjs
capture 05_p1_aggregate_quality_readonly_smoke "$ROOT" node --input-type=module -e "import { runP1Aggregate } from './packages/mechanical-gates/src/aggregate/index.js'; const result = await runP1Aggregate(process.cwd(), { families: ['p1.quality-ratchet'] }); console.log(JSON.stringify({ family: result.family, ok: result.ok, findingRuleIds: result.findings.map((f) => f.ruleId), requestedFamilies: result.evidence.requestedFamilies, quality: result.evidence.summary['p1.quality-ratchet'], subresults: result.evidence.subresults.map((r) => ({ family: r.family, ok: r.ok, findingCount: r.findings.length })) })); if (result.family !== 'p1.aggregate') process.exit(2); if (!result.evidence.summary['p1.quality-ratchet']?.ok) process.exit(3); if (!result.findings.some((f) => f.ruleId === 'aggregate.omitted-family')) process.exit(4);"
{
  echo "cwd=$ROOT"
  echo "command=find sibling surfaces"
  cd "$ROOT" && find packages/mechanical-gates/src/aggregate packages/mechanical-gates/src/p0 packages/mechanical-gates/src/p1 packages/mechanical-gates/fixtures/p0 packages/mechanical-gates/fixtures/p1 -maxdepth 5 -type f | LC_ALL=C sort
  echo "exit=$?"
} > "$EVIDENCE/05_sibling_inventory.txt" 2>&1
