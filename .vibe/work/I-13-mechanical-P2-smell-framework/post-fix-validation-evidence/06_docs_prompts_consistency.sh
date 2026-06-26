#!/usr/bin/env bash
set +e
ROOT=/Users/lizavasilyeva/work/vibe-engineer
ORCH=/Users/lizavasilyeva/work/harness-starter
EVIDENCE="$ROOT/.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-validation-evidence"
{
  echo "cwd=$ROOT"
  echo "command=rg pending handoff and I-20 invariants in I-13 artifacts/source truth"
  rg -n "package export|public package subpath|aggregate-level|aggregate registration|pending serialized|I-20|blocked|truth-green|PASS|DONE|NEEDS-FIX" \
    "$ROOT/.vibe/work/I-13-mechanical-P2-smell-framework/I-13-validation-artifact.md" \
    "$ROOT/.vibe/work/I-13-mechanical-P2-smell-framework/I-13-post-validation-fix-report.md" \
    "$ORCH/.pi/hlo/vibe-engineer/prompts/I-13-post-validation-fix.md" \
    "$ORCH/.pi/hlo/vibe-engineer/reports/I-13-post-validation-fix-prompt-validation-artifact.md" \
    "$ORCH/.pi/hlo/vibe-engineer/status.md" \
    "$ORCH/.pi/hlo/vibe-engineer/handoff.md" \
    "$ORCH/.pi/hlo/vibe-engineer/ledger-compact.md" \
    "$ORCH/.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md"
  echo "exit=$?"
} > "$EVIDENCE/06_pending_i20_rg.txt" 2>&1
{
  echo "cwd=$ROOT"
  echo "command=python3 docs consistency assertions"
  python3 - <<'PY'
from pathlib import Path
root = Path('/Users/lizavasilyeva/work/vibe-engineer')
orch = Path('/Users/lizavasilyeva/work/harness-starter')
checks = {}
fix = (root/'.vibe/work/I-13-mechanical-P2-smell-framework/I-13-post-validation-fix-report.md').read_text()
validation = (root/'.vibe/work/I-13-mechanical-P2-smell-framework/I-13-validation-artifact.md').read_text()
prompt = (orch/'.pi/hlo/vibe-engineer/prompts/I-13-post-validation-fix.md').read_text()
strategy = (orch/'.pi/hlo/vibe-engineer/implementation-strategy/post-d1-strategy-final.md').read_text()
status = (orch/'.pi/hlo/vibe-engineer/status.md').read_text()
handoff = (orch/'.pi/hlo/vibe-engineer/handoff.md').read_text()
mechanical = (orch/'docs/mechanical-verification-gates.md').read_text()
package_json = (root/'packages/mechanical-gates/package.json').read_text()
aggregate = (root/'packages/mechanical-gates/src/aggregate/index.js').read_text() + '\n' + (root/'packages/mechanical-gates/src/aggregate/p1/run-p1-aggregate.js').read_text()
checks['fix_report_done_not_pass'] = 'DONE for fixer scope' in fix and 'independent post-fix revalidation remains required' in fix
checks['fix_report_pending_package_export'] = 'Package export/public package subpath for P2' in fix and 'pending' in fix
checks['fix_report_pending_aggregate'] = 'Aggregate-level P2 registration' in fix and 'pending' in fix
checks['fix_report_i20_blocked'] = 'I-20 remains blocked' in fix
checks['prior_validation_accepts_pending_handoffs'] = 'package export/aggregate registration pending serialized handoff' in validation or 'Package export/public subpath and aggregate-level P2 registration' in validation
checks['prompt_preserves_pending_handoffs'] = 'Package export/public package subpath for P2 remains pending' in prompt and 'Aggregate-level P2 registration remains pending' in prompt
checks['prompt_i20_blocked'] = 'I-20 remains blocked' in prompt
checks['strategy_i13_scope'] = "`I-13` | `packages/mechanical-gates/src/p2/code-smell/**`" in strategy or 'I-13` | `packages/mechanical-gates/src/p2/code-smell/**' in strategy
checks['strategy_i20_requires_i13_i18'] = 'I-09 + I-10B + I-10C + I-11 + I-12 + I-13 + I-18 + I-07D + DL-18 → I-20' in strategy
checks['status_i20_blocked'] = '| I-20 / later lanes | Blocked |' in status or 'I-20 remains blocked' in status
checks['handoff_i20_blocked'] = 'I-20 remains blocked' in handoff
checks['mechanical_smell_gate_rules'] = 'Code-smell gate' in mechanical and 'detectors must be AST/structure-first' in mechanical and 'stable schema' in mechanical
checks['no_package_p2_export'] = 'p2/code-smell' not in package_json and 'code-smell' not in package_json
checks['no_aggregate_p2_registration'] = 'code-smell' not in aggregate and 'validateCodeSmells' not in aggregate
checks['no_claim_i20_unblocked_by_fix'] = 'I-20 unblocked' not in fix and 'I-20 ready' not in fix and 'I-20 unblocked' not in validation
for key, value in checks.items():
    print(f'{key}={value}')
if not all(checks.values()):
    raise SystemExit(1)
PY
  echo "exit=$?"
} > "$EVIDENCE/06_docs_consistency_assertions.txt" 2>&1
