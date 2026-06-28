<p align="center">
  <img src="https://raw.githubusercontent.com/ismailsaleekh/vibe-engineer/main/assets/brand/vibe-engineer-logo.png" alt="vibe-engineer neon VE logo" width="180" />
</p>

# vibe-engineer

`vibe-engineer` is a domain-neutral harness for agent-native TypeScript work: CLI primitives, starter generation, schematics, verification, evidence, and preserved project context.

It is not "vibe coding." It is the system around the work.

## Install

```bash
npm install --save-dev vibe-engineer
npx vibe-engineer help
```

You can also run the CLI with `npx` after installation in a project.

## Create a starter

```bash
npx vibe-engineer create --target-root ./my-project --project-name my-project --agentic-harness pi --non-interactive
```

The generated starter includes:

- NestJS API;
- React web app;
- React Native mobile app;
- shared domain/contracts/api-client/config/testing/ui packages;
- TypeScript strictness, pnpm, Turborepo, lint/format/test/build scripts;
- `.vibe/**` context/work/evidence/registry scaffolding;
- pi-native skills and prompts for `brainstorm`, `grill-me`, `task`, `plan`, `build`, and `ship`.

## CLI commands

The v0.1 public CLI exposes deterministic primitives only:

```txt
help
version
create
import
doctor
config
verify
security
schematic
```

The six user-facing skills are installed as harness-native assets, not as CLI commands.

## Packages

Most users install only:

```bash
npm install --save-dev vibe-engineer
```

The main package depends on public runtime packages under the `@vibe-engineer/*` scope. npm installs those automatically.

## Documentation

- GitHub: <https://github.com/ismailsaleekh/vibe-engineer>
- CLI reference: <https://github.com/ismailsaleekh/vibe-engineer/blob/main/docs/reference/cli.md>
- Create guide: <https://github.com/ismailsaleekh/vibe-engineer/blob/main/docs/guides/getting-started/create-project.md>
- Repository status: <https://github.com/ismailsaleekh/vibe-engineer/blob/main/docs/guides/getting-started/repository-status.md>

## Release boundary

v0.1 local proof covers package build, install smoke, CLI primitives, `create`, generated starter local install/typecheck/lint/test/build/quality, and pi asset generation.

Hosted CI, live pi runtime loading, Pulumi live deploy, mobile device E2E, and full visual baselines are pending-live unless separately evidenced.

## License

MIT © 2026 Ismail
