# I-02A config/package-graph blocker evidence

## Status

BLOCKED before product/source implementation.

## Evidence commands

### Existing `packages/cli` lockfile importer

Command (cwd `/Users/lizavasilyeva/work/vibe-engineer`):

```sh
node --input-type=module <<'NODE'
import fs from 'node:fs';
const text=fs.readFileSync('pnpm-lock.yaml','utf8');
const idx=text.indexOf('  packages/cli:');
console.log(idx>=0 ? text.slice(idx, idx+500) : 'no packages/cli importer');
NODE
```

Observed output:

```txt
  packages/cli: {}

  packages/config: {}

  packages/context: {}

  packages/contracts: {}

  packages/mechanical-gates: {}

  packages/observability: {}

  packages/orchestration:
    dependencies:
      '@vibe-engineer/artifacts':
        specifier: workspace:*
        version: link:../artifacts
```

### CLI package has no declared config dependency

Command:

```sh
pnpm --filter vibe-engineer list @vibe-engineer/config --depth 0 --json
```

Observed output:

```json
[
  {
    "name": "vibe-engineer",
    "version": "0.0.0",
    "path": "/Users/lizavasilyeva/work/vibe-engineer/packages/cli",
    "private": false
  }
]
```

### Actual public config API import is not reachable from CLI package graph

Command:

```sh
pnpm --filter vibe-engineer exec node --input-type=module -e "import('@vibe-engineer/config').then(m=>console.log('import ok')).catch(e=>{console.error(e.code,e.message); process.exit(1)})"
```

Observed output/exit:

```txt
ERR_MODULE_NOT_FOUND Cannot find package '@vibe-engineer/config' imported from /Users/lizavasilyeva/work/vibe-engineer/packages/cli/[eval1]
undefined
/Users/lizavasilyeva/work/vibe-engineer/packages/cli:
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command failed with exit code 1: node --input-type=module -e import('@vibe-engineer/config').then(m=>console.log('import ok')).catch(e=>{console.error(e.code,e.message); process.exit(1)})
```

Exit: `1`.

## Ruling needed

I-02A requires the actual public `@vibe-engineer/config` API seam for malformed/unsupported config witnesses. The existing CLI package graph does not declare or link `@vibe-engineer/config`. Adding `dependencies`/workspace edges to `packages/cli/package.json` appears to require corresponding `pnpm-lock.yaml`/install-state mutation, which is outside I-02A license. A serialized dependency/root/lockfile ruling is required before product implementation can proceed.
