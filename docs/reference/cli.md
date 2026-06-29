# CLI reference

> **Source of truth:** `packages/cli/src/entry/vibe-engineer.js`, `packages/cli/src/command-loader/loader.js`, `packages/cli/src/envelope/result-envelope.js`, `packages/cli/src/errors/codes.js`, and `packages/cli/package.json`.

## Package exports

The public package `vibe-engineer` exposes compiled `dist` files:

| Subpath            | Types                                  | Import                               |
| ------------------ | -------------------------------------- | ------------------------------------ |
| `.`                | `./dist/entry/vibe-engineer.d.ts`      | `./dist/entry/vibe-engineer.js`      |
| `./envelope`       | `./dist/envelope/result-envelope.d.ts` | `./dist/envelope/result-envelope.js` |
| `./command-loader` | `./dist/command-loader/loader.d.ts`    | `./dist/command-loader/loader.js`    |

The package binary is:

```json
{ "vibe-engineer": "./dist/entry/vibe-engineer.js" }
```

Recommended invocation paths:

```bash
vibe-engineer create # interactive

npx vibe-engineer@latest create my-project --project-name my-project --agentic-harness pi --brief "Short project brief" --non-interactive
cd my-project
pnpm install
pnpm exec vibe-engineer help --json
```

Global install is optional for power users:

```bash
npm install -g vibe-engineer
vibe-engineer help
```

Generated starters include project-local `pnpm exec vibe-engineer ...` access automatically.

## v0.1 commands

The default command loader registers these public deterministic primitives:

| Command     | Visibility            | Purpose                                                              |
| ----------- | --------------------- | -------------------------------------------------------------------- |
| `help`      | foundation            | List public v0.1 CLI primitives.                                     |
| `version`   | foundation            | Report installed package name/version.                               |
| `create`    | starter               | Generate a full starter project with selected harness assets.        |
| `import`    | starter               | Adopt an existing project without silent overwrite.                  |
| `doctor`    | debug/diagnostic      | Inspect read-only project health through config-backed checks.       |
| `config`    | debug/diagnostic      | Inspect or validate project configuration.                           |
| `verify`    | implementation        | Run an approved Implementation Plan through the verification runner. |
| `security`  | implementation        | Run fail-closed security/safety policy gates.                        |
| `schematic` | skill/agent primitive | Plan, dry-run, or apply a manifest-driven schematic.                 |

`foundation` remains an internal witness command and is filtered out of public help.

## Not CLI commands

The six user-facing skills are harness-native assets, not public CLI commands:

```txt
brainstorm grill-me task plan build ship
```

Invoking these names through the CLI returns a typed invalid-invocation envelope.

## Deferred command families

These command families are intentionally deferred in v0.1 and fail closed with `VE_UNSUPPORTED_OPERATION`:

```txt
context registry update init
```

## Global flags

Global flags parsed by the entrypoint:

| Flag                    | Kind    | Effect                                                    |
| ----------------------- | ------- | --------------------------------------------------------- |
| `--json`                | boolean | Machine-readable output. Human-readable summaries are the default when no machine carrier is requested. |
| `--quiet`               | boolean | Suppress non-essential stdout when a result file is used. |
| `--non-interactive`     | boolean | Never prompt; fail closed on missing input.               |
| `--result-file <path>`  | value   | Write the result envelope atomically.                     |
| `--project-root <path>` | value   | Set the project root.                                     |
| `--config <path>`       | value   | Path to a config file.                                    |

Unknown global flags return `VE_INVALID_FLAG`. Unknown command names return `VE_INVALID_INVOCATION` unless they are one of the deferred families above.

`create` and `import` may prompt humans when required values are omitted and the process is attached to a TTY. Automation must pass `--non-interactive` plus required paths.

## Result envelope

Every command returns a machine result envelope (`CLI_RESULT_SCHEMA_VERSION = "vibe-engineer.cli.result.v1"`).

```js
import {
  CLI_RESULT_SCHEMA_VERSION,
  CLI_STATUSES,
  exitCodeFor,
  artifactDescriptor,
  createEnvelope,
  payload,
  invalidInvocationEnvelope,
  internalErrorEnvelope,
  configBlockedEnvelope,
  foundationFailureEnvelope,
  partialEnvelope,
  validateCliResultEnvelope,
  writeResultFileAtomic,
  envelopeBytes,
  sha256Text,
} from "vibe-engineer/envelope";
```

### Statuses

```txt
success failure blocked partial
```

### Exit codes

| Status / classification                        | Exit |
| ---------------------------------------------- | ---- |
| success                                        | `0`  |
| deterministic failure                          | `1`  |
| invalid invocation or invalid input            | `2`  |
| invalid project/config or missing prerequisite | `3`  |
| safety policy block                            | `4`  |
| ownership/write conflict                       | `5`  |
| external unavailable                           | `6`  |
| internal error                                 | `7`  |
| partial                                        | `8`  |

Use `exitCodeFor(status, classification?)` to compute the process exit code from an envelope status/classification.

## Command-loader API

```js
import {
  CommandLoader,
  createCommandLoader,
  CommandLoaderDefinitionError,
} from "vibe-engineer/command-loader";
```

- `createCommandLoader()` registers the default v0.1 command set plus the internal `foundation` witness.
- `loader.listCommands()` returns command metadata; public help filters internal commands.
- `loader.dispatch(commandId, args, context)` returns `{ envelope }`.
- Duplicate or malformed command metadata throws `CommandLoaderDefinitionError`.

## Related

- [Create a project](../guides/getting-started/create-project.md)
- [System overview](../architecture/system-overview.md)
- [Verification model](../architecture/verification-model.md)
- [DL-07 — CLI Primitives](../decisions/DL-07-cli-primitives.md)
