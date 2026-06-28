# Repository status

This page preserves the implementation truth that should not crowd the short product README.

## Status summary

`vibe-engineer` is a v0.1 release candidate. Local source, package, installed-binary, create/import, pi asset, and generated-starter local proof are green. Publication remains manual/protected and requires valid npm authentication.

## Safe live claims

The following are safe to claim from local release evidence:

- `tsup` builds publishable runtime packages into `dist` with Node LTS-compatible ESM.
- The public package graph contains `vibe-engineer` plus public `@vibe-engineer/*` packages and no private runtime dependencies.
- The installed `vibe-engineer` binary works from a clean external tarball install.
- The v0.1 CLI exposes only deterministic primitives: `help`, `version`, `create`, `import`, `doctor`, `config`, `verify`, `security`, and `schematic`.
- Skill names (`brainstorm`, `grill-me`, `task`, `plan`, `build`, `ship`) are not CLI commands.
- `vibe-engineer create --agentic-harness pi` generates the locked starter shape and pi-native skill/prompt assets.
- The generated starter installs, typechecks, lints, format-checks, runs unit tests, builds, and passes quick quality locally.
- Release packaging excludes source maps, source-tree evidence, witnesses, local fixtures, planning artifacts, and cache outputs from npm artifacts.

## Pending external/live proof

These are not claimed live until separate evidence exists:

- npm publication to the public registry;
- hosted GitHub Actions CI for the harness repository;
- hosted GitHub Actions CI for a generated starter repository;
- live pi runtime discovery/loading of generated `.pi/**` assets;
- real Pulumi deploy;
- mobile Maestro/Detox device or simulator run;
- full visual/UI baseline capture.

## Governance and release metadata

Governance files now contain operational metadata:

- [License](../../../LICENSE) — MIT, copyright `2026 Ismail`.
- [Security](../../../SECURITY.md) — private vulnerability reporting through GitHub Security Advisories with maintainer email fallback.
- [Code of Conduct](../../../CODE_OF_CONDUCT.md) — private conduct reporting contact.
- [Contributing](../../../CONTRIBUTING.md) — contribution expectations, review, DCO sign-off, and evidence requirements.
- [Changelog](../../../CHANGELOG.md) — includes the initial `0.1.0` release section.

## Release commands

```bash
pnpm release:check
pnpm release:pack
pnpm release:install-smoke
pnpm release:publish -- --dry-run
```

Real publishing is blocked unless both conditions are true:

```bash
VIBE_ENGINEER_RELEASE_APPROVED=true pnpm release:publish -- --confirm-publish
```

The publish script also verifies the authenticated GitHub account/repository owner and npm identity before publishing.

## Public CLI surface

See [CLI reference](../../reference/cli.md). The command set is:

```txt
help version create import doctor config verify security schematic
```

Deferred command families (`context`, `registry`, `update`, `init`) fail closed with typed unsupported-operation envelopes. Skill names fail as unknown CLI commands because they are harness-native assets.

## Generated starter local proof

The generated starter proof creates a clean external install from packed packages, runs the installed `.bin/vibe-engineer create` path, and proves the generated starter locally with:

- `pnpm install`
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run format:check`
- `pnpm run test:unit`
- `pnpm run build`
- `pnpm run quality:quick`

The proof also checks pi asset inventory, no `.pi/extensions/**`, no source-path leakage, no private/public harness dependency leakage, no workspace/path dependency leakage, no copied harness internals, and no false live-pi claim.

## Related docs

- [Create a project](./create-project.md)
- [Workflow guide](./workflow.md)
- [Plan / build / ship](./plan-build-ship.md)
- [CLI reference](../../reference/cli.md)
- [Package exports](../../reference/packages.md)
