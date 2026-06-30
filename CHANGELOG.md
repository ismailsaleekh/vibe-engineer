# Changelog

All notable changes to `vibe-engineer` will be documented in this file.

The format follows Keep a Changelog, and this project uses Semantic Versioning (SemVer) for packages, CLI behavior, documented public APIs, artifact schemas, presets, plugins, adapters, schematics, and generated starter template releases once those surfaces exist.

## [Unreleased]

### Added

- Nothing yet.

### Changed

- Nothing yet.

### Deprecated

- Nothing yet.

### Removed

- Nothing yet.

### Fixed

- Nothing yet.

### Security

- Nothing yet.

## [0.1.3] - 2026-06-30

### Added

- Generated starters now include a default `.vibe/registry/runner-catalog.json` and `.tooling/scripts/starter-verify-runner.mjs` so `vibe-engineer verify` can run starter typecheck, lint/format, unit, and build/package layers out of the box.
- Generated pi skills and prompts now include concrete artifact paths, schema/kind expectations, verification handoff commands, and runner-catalog guidance.

### Changed

- Fresh projects generated from a local source checkout pin `vibe-engineer` and local `@vibe-engineer/*` package overrides to that checkout, keeping project-local CLI behavior aligned with the generator under test.
- Generated starter `quality:quick` now avoids duplicated root work and missing-coverage Turbo output declarations.
- Generated web dev honors `WEB_PORT` from the environment.

### Fixed

- Generated API sample route dependency injection now works in the `tsx` dev runtime without relying on emitted decorator metadata.
- Generated `vibe-engineer.config.json` validates under the public v1 config schema.
- Generated Docker Compose no longer emits the invalid `services.postgres.service` field.
- Generated Prettier/git ignores cover Expo `.expo/**` output created by normal mobile dev.
- Generated Prisma seed now performs idempotent database writes instead of exporting rows only.
- Public subcommands now support per-command `--help` / `-h` output.
- Explicit `--config <path>` accepts valid JSON config files regardless of basename.
- Security gate root working directory handling permits read-only `.` while preserving protected-path write/target blocks.

## [0.1.2] - 2026-06-28

### Added

- Generated starters now include project-local `vibe-engineer` CLI access automatically, so `pnpm exec vibe-engineer ...` works after `pnpm install`.
- Generated-starter release proof now checks project-local `pnpm exec vibe-engineer help` and fails if the root starter manifest omits the project-local CLI dependency.

### Changed

- Public docs now recommend `npx vibe-engineer@latest create ...` for one-off creation, `pnpm exec vibe-engineer ...` inside generated repos, and optional global install for power users instead of instructing users to manually add the package to a project.

## [0.1.1] - 2026-06-28

### Fixed

- Added the packaged npm README for the main `vibe-engineer` package so the npm package page displays install, create, command, package, documentation, and release-boundary guidance.

## [0.1.0] - 2026-06-28

### Added

- Initial public `vibe-engineer` CLI package with v0.1 deterministic primitives: `help`, `version`, `create`, `import`, `doctor`, `config`, `verify`, `security`, and `schematic`.
- Public `@vibe-engineer/*` runtime package graph for artifacts, config, context, orchestration, schematics, security, skills, verification, and the pi adapter.
- `tsup`-built ESM `dist` outputs and public declaration files for package APIs that expose types.
- Full starter materialization through `vibe-engineer create`, including API, web, mobile, shared packages, tooling, context/work/evidence/registry folders, and pi-native skill/prompt assets.
- Pack/install smoke, generated-starter local proof, and release automation scripts for manual protected release.
- Governance metadata, MIT license, security policy, code of conduct contact, contribution guide, and release documentation.

### Changed

- Release packaging uses npm `files` allowlists and excludes source maps, local evidence, fixtures, witnesses, planning docs, and cache artifacts from public npm artifacts.
- Release defaults now write local proof evidence under ignored `.vibe/release/**` paths.

### Security

- Added private vulnerability reporting through GitHub Security Advisories and a maintainer fallback contact.
- Added release publish identity checks for GitHub and npm accounts before npm publication.

## Release heading format

Future release sections must use SemVer headings in this shape:

```md
## [MAJOR.MINOR.PATCH] - YYYY-MM-DD
```

Prerelease versions must use SemVer prerelease identifiers and record migration or compatibility notes when public behavior changes.
