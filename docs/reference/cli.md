# CLI reference

> **Source of truth:** `packages/cli/src/entry/vibe-engineer.js`, `packages/cli/src/command-loader/loader.js`, `packages/cli/src/envelope/result-envelope.js`, `packages/cli/src/errors/codes.js`. Curated from actual source; checked by the stale-doc witness.

## Package exports

The public package `vibe-engineer` (`packages/cli/package.json`) exposes:

| Subpath | File |
| --- | --- |
| `.` | `./src/entry/vibe-engineer.js` (bin: `vibe-engineer`) |
| `./envelope` | `./src/envelope/result-envelope.js` |
| `./command-loader` | `./src/command-loader/loader.js` |

## Commands actually wired

The CLI runtime is **foundation-only**. The command loader (`packages/cli/src/command-loader/loader.js`) registers exactly three commands via `FOUNDATION_COMMANDS`, and the entry builds the loader with `createCommandLoader()` (no extra commands). This is the actual, current surface:

| Command | Visibility | Description | Source |
| --- | --- | --- | --- |
| `help` | foundation | List I-02A foundation commands. | `helpCommand` |
| `version` | foundation | Report package version. | `versionCommand` |
| `foundation` | internal | I-02A internal envelope/loader witness command. | `foundationCommand` |

`help` returns a `help_result` payload listing each registered command's `id`, `visibility`, and `description`. `version` returns a `version_result` payload with `name` and `version` read from the CLI `package.json`. `foundation` is the internal witness command (accepts `--status success|failure|partial`, `--simulate-failure`, `--simulate-partial`).

## Commands present as source but NOT wired (pending-live)

Command source files exist under `packages/cli/src/commands/` for these families, but they are **not registered** in the runtime loader. The loader classifies them in `LATER_COMMANDS`; invoking one returns an `UnsupportedOperation` envelope ("Command family is not implemented in I-02A"):

```txt
create, import, doctor, config, schematic, verify, security, build, ship,
context, registry, update, init
```

> Do **not** document these as runnable user commands. They are `pending-live` until their lane wires them into the loader and a witness proves the join. See [Repository status](../guides/getting-started/repository-status.md).

## Global flags

Global flags parsed by the entry (`vibe-engineer.js`, `parseGlobalArgs`):

| Flag | Kind | Effect |
| --- | --- | --- |
| `--json` | boolean | Machine-readable output. |
| `--quiet` | boolean | Suppress non-essential output. |
| `--non-interactive` | boolean | Never prompt; fail closed on missing input. |
| `--result-file <path>` | value | Write the result envelope to this path (atomic). |
| `--project-root <path>` | value | Set the project root. |
| `--config <path>` | value | Path to a config file. |

Unknown global flags return an `InvalidFlag` envelope; unknown commands return `InvalidInvocation` (or `UnsupportedOperation` for `LATER_COMMANDS`).

## Result envelope

Every command returns a machine result envelope (`packages/cli/src/envelope/result-envelope.js`). Schema id: `CLI_RESULT_SCHEMA_VERSION = "vibe-engineer.cli.result.v1"`.

```js
import {
  CLI_RESULT_SCHEMA_VERSION,
  CLI_STATUSES,                 // ["success","failure","blocked","partial"]
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
  sha256Text
} from "vibe-engineer/envelope";
```

### Statuses

`CLI_STATUSES = ["success", "failure", "blocked", "partial"]`.

### Exit codes

From `packages/cli/src/errors/codes.js` (`EXIT_CODES`):

| Status / classification | Exit |
| --- | --- |
| success | `0` |
| deterministic failure | `1` |
| invalid invocation | `2` |
| invalid project or config | `3` |
| safety policy block | `4` |
| ownership conflict | `5` |
| external unavailable | `6` |
| internal error | `7` |
| partial | `8` |

Use `exitCodeFor(status, classification?)` to compute the exit code from a status (and optional failure/blocked classification).

### Error classifications and codes

`CliClassification` (`invalid_invocation`, `invalid_input`, `invalid_project`, `invalid_config`, `missing_prerequisite`, `unsupported_operation`, `deterministic_failure`, `safety_policy_block`, `ownership_conflict`, `write_conflict`, `external_unavailable`, `internal_error`, `partial_incomplete`).

`CliErrorCode` (`VE_INVALID_INVOCATION`, `VE_INVALID_FLAG`, `VE_MISSING_FLAG_VALUE`, `VE_UNSUPPORTED_OPERATION`, `VE_DUPLICATE_COMMAND_ID`, `VE_MALFORMED_COMMAND_METADATA`, `VE_INVALID_CONFIG`, `VE_MISSING_CONFIG`, `VE_RESULT_FILE_WRITE_FAILED`, `VE_FOUNDATION_FAILURE`, `VE_PARTIAL_INCOMPLETE`, `VE_INVALID_ENVELOPE`, `VE_INTERNAL_ERROR`).

Helpers: `diagnostic({ severity, code, classification, message, path, span, hint })` and `cliError({ code, classification, retryable, blocking, message, details })`.

## Command-loader API

```js
import { CommandLoader, createCommandLoader, CommandLoaderDefinitionError } from "vibe-engineer/command-loader";
```

- `new CommandLoader(commands = FOUNDATION_COMMANDS)` — registers commands; throws `CommandLoaderDefinitionError` (`VE_MALFORMED_COMMAND_METADATA` / `VE_DUPLICATE_COMMAND_ID`) on bad metadata.
- `loader.listCommands()` → `[{ id, visibility, description }]`.
- `loader.hasCommand(id)` → boolean.
- `await loader.dispatch(commandId, args, context)` → `{ envelope }`. Unknown command → `InvalidInvocation`/`UnsupportedOperation` envelope.

Each command is `{ id, visibility, description, run }` where `run({ invocation, args, context })` returns `{ envelope }`.

## Related

- [System overview](../architecture/system-overview.md)
- [Verification model](../architecture/verification-model.md)
- [DL-07 — CLI Primitives](../decisions/DL-07-cli-primitives.md)
