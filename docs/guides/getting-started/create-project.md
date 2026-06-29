# Create a project

> **Status:** v0.1 package/create path is published and locally proofed. `vibe-engineer create` is wired in the installed binary and has been proven from a clean external install.

## Command

Recommended one-off creation:

```bash
npx vibe-engineer@latest create --target-root ./my-project --project-name my-project --agentic-harness pi --non-interactive
```

Inside the generated project, use the project-local CLI that `create` adds automatically:

```bash
cd my-project
pnpm install
pnpm exec vibe-engineer help
```

Global install is optional for power users:

```bash
npm install -g vibe-engineer
vibe-engineer create --target-root ./my-project --project-name my-project --agentic-harness pi --non-interactive
```

Important flags:

| Flag                    | Meaning                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `--target-root <path>`  | Required output directory. The command fails closed if the target already conflicts.                      |
| `--project-name <name>` | Optional display/name seed; defaults from the target directory.                                           |
| `--agentic-harness pi`  | v0.1 supported harness selection. Non-pi harnesses fail closed until implemented.                         |
| `--brief <text>`        | Optional short project brief for initial context bootstrap. Secret-like or oversized briefs are rejected. |
| `--non-interactive`     | Required for automation; no hidden prompts.                                                               |
| `--result-file <path>`  | Optional atomic machine-readable result envelope.                                                         |

## Generated starter shape

A generated starter contains:

```txt
apps/
  api/       # NestJS + Prisma skeleton
  web/       # React skeleton
  mobile/    # React Native skeleton
packages/
  domain/
  contracts/
  api-client/
  config/
  testing/
  ui/
.tooling/
.vibe/
  context/
  work/
  evidence/
  registry/
.pi/
  skills/<brainstorm|grill-me|task|plan|build|ship>/SKILL.md
  prompts/vibe-*.md
```

The generated project is a starter consumer. It includes project-local `vibe-engineer` CLI access for `pnpm exec vibe-engineer ...`, does not copy harness implementation internals, and does not expose the six skills as CLI commands.

## Config defaults

The generated `vibe-engineer.config.json` includes the locked defaults:

```json
{
  "agenticHarness": "pi",
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

## Local proof commands for a generated starter

The v0.1 local proof runs the generated starter through:

```bash
pnpm install
pnpm exec vibe-engineer help
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run test:unit
pnpm run build
pnpm run quality:quick
```

Full web E2E, mobile Maestro/Detox device proof, visual baselines, Pulumi deploys, and live pi runtime discovery are not default CI claims. They remain explicit/manual/orchestrator-run proof items.

## Importing an existing project

`vibe-engineer import` is wired as the adoption sibling for existing projects. It installs config/context/harness assets idempotently, detects conflicts, and fails closed rather than silently overwriting user files.

## Related

- [Repository status](./repository-status.md)
- [CLI reference](../../reference/cli.md)
- [Plan / build / ship](./plan-build-ship.md)
