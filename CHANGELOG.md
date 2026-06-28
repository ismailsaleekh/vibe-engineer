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
