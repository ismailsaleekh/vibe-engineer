# Create a project

> **Status:** `pending-live`. Project creation runs through the `vibe-engineer create` command family, which exists as source under `packages/cli/src/commands/create/` but is **not wired** into the runtime command loader. The runtime returns `UnsupportedOperation` for it today. This guide describes the intended flow and the actual artifacts/config it will produce; do not treat the commands as runnable until the create lane witnesses them.

## Intended flow

```txt
vibe-engineer create --project-name <name> [--agentic-harness <id>] [--brief <path>]
```

From `packages/cli/src/commands/create/index.ts`, the create command accepts project-naming flags, an `--agentic-harness` selector, an optional `--brief`, and the [global envelope flags](../../reference/cli.md#global-flags). It is intended to produce a **generated/reference starter** that consumes `vibe-engineer` through packages/config/generated assets rather than copying harness logic (see [System overview](../../architecture/system-overview.md#two-repo-direction)).

## What a generated project contains

A generated `vibe-engineer-starter` project is intended to contain:

- A project config file `vibe-engineer.config.json` (schema `vibe-engineer.config.v1`) — see [Package exports](../../reference/packages.md#vibe-engineerconfig).
- A bootstrap context graph (DL-17) with Context File Headers — see [Context and memory model](../../architecture/context-memory.md).
- A pinned dependency on the `vibe-engineer` package.
- The selected agentic harness adapter wiring.

## Config defaults you will inherit

From `packages/config/src/index.js` (`DEFAULTS`):

```json
{
  "agenticHarness": "<selected>",
  "maxParallelAgents": 8,
  "maxValidationFixIterations": 3,
  "agenticWorkPackageTargetHours": 6,
  "verification": {
    "deterministicBlocks": true,
    "advisoryReviewBlocks": false,
    "webE2E": "playwright",
    "mobileE2E": { "default": "maestro", "advanced": "detox" }
  },
  "uiVerification": { "enabled": true },
  "agentRegistry": { "validationRequired": true }
}
```

`agenticHarness` is the only required top-level key.

## How to validate a config today

Although `create` is not wired, the config loader is. You can validate a hand-written config against the real schema now:

```js
import { loadVibeConfigFromProjectRoot, parseVibeConfig } from "@vibe-engineer/config";

const result = await loadVibeConfigFromProjectRoot(process.cwd());
```

`parseVibeConfig(input)` validates an in-memory object; `loadVibeConfigFile(path)` loads and validates a file. Both return a typed result.

## Importing an existing project

`vibe-engineer import` is the sibling flow for adopting the harness in an existing repo. It shares the create command's option parsing (`runCreate(..., "import")` in source) and is likewise `pending-live`.

## What to do until create is live

1. Author a `vibe-engineer.config.json` by hand using the defaults above.
2. Validate it with `loadVibeConfigFromProjectRoot`.
3. Track the create/import lane for the runtime wiring witness.

## Related

- [Plan / build / ship](./plan-build-ship.md)
- [Repository status](./repository-status.md)
- [CLI reference](../../reference/cli.md)
