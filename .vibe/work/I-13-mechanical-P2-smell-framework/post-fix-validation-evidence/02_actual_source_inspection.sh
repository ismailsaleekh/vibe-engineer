#!/usr/bin/env bash
set +e
ROOT=/Users/lizavasilyeva/work/vibe-engineer
EVIDENCE="$ROOT/.vibe/work/I-13-mechanical-P2-smell-framework/post-fix-validation-evidence"
cd "$ROOT" || exit 97
{
  echo "cwd=$(pwd)"
  echo "command=find packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell -maxdepth 8 -type f | sort"
  find packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell -maxdepth 8 -type f | LC_ALL=C sort
  echo "exit=$?"
} > "$EVIDENCE/02_p2_source_fixture_inventory.txt" 2>&1
{
  echo "cwd=$(pwd)"
  echo "command=python3 inspect key product contracts"
  python3 - <<'PY'
from pathlib import Path
root = Path('/Users/lizavasilyeva/work/vibe-engineer')
paths = [
  'packages/mechanical-gates/src/p2/code-smell/index.ts',
  'packages/mechanical-gates/src/p2/code-smell/node-shims.d.ts',
  'packages/mechanical-gates/fixtures/p2/code-smell/witness.mjs',
  'packages/mechanical-gates/fixtures/p2/code-smell/typecheck-consumer.ts',
  'packages/mechanical-gates/package.json',
  'packages/mechanical-gates/src/aggregate/index.js',
  'packages/mechanical-gates/src/aggregate/p1/run-p1-aggregate.js',
]
for rel in paths:
    p = root / rel
    data = p.read_bytes()
    import hashlib
    print(f'## {rel}')
    print(f'size={len(data)} sha256={hashlib.sha256(data).hexdigest()}')
    if rel.endswith('index.ts'):
        text = data.decode()
        for i, line in enumerate(text.splitlines(), 1):
            if 'function readStringArray' in line or 'value.length === 0' in line or 'CODE_SMELL_FAMILY' in line or 'CODE_SMELL_TOOL' in line or 'CODE_SMELL_RATCHET_CARRIER_VERSION' in line:
                print(f'{i}:{line}')
    if rel == 'packages/mechanical-gates/package.json':
        text = data.decode()
        print('mentions_p2_code_smell=', 'p2/code-smell' in text or 'p2' in text)
    if rel.startswith('packages/mechanical-gates/src/aggregate'):
        text = data.decode()
        print('mentions_p2_code_smell=', 'p2' in text or 'code-smell' in text)
PY
  echo "exit=$?"
} > "$EVIDENCE/02_key_contract_hashes_and_lines.txt" 2>&1
{
  echo "cwd=$(pwd)"
  echo "command=rg shared-surface P2 registration/export mentions"
  rg -n "p2|code-smell|validateCodeSmells|CODE_SMELL" packages/mechanical-gates/package.json packages/mechanical-gates/src/aggregate packages/mechanical-gates/src/p0 packages/mechanical-gates/src/p1 package.json pnpm-workspace.yaml pnpm-lock.yaml 2>/dev/null
  echo "exit=$?"
} > "$EVIDENCE/02_sentinel_p2_mentions.txt" 2>&1
{
  echo "cwd=$(pwd)"
  echo "command=git diff -- packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell"
  git diff -- packages/mechanical-gates/src/p2/code-smell packages/mechanical-gates/fixtures/p2/code-smell
  echo "exit=$?"
} > "$EVIDENCE/02_git_diff_p2_after_inspection.patch" 2>&1
