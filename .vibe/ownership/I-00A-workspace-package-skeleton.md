# I-00A Workspace Package Skeleton Ownership Record

Owner lane: `I-00A-workspace-package-skeleton`  
Status: skeleton ownership record created by implementation executor.  
Target root: `/Users/lizavasilyeva/work/vibe-engineer`

## Owned write paths used by I-00A

- Root workspace/config/package files: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `eslint.config.mjs`, `prettier.config.mjs`, `.gitignore`, `.npmrc`.
- Package directory skeletons and `package.json` manifests only for: `packages/cli`, `packages/artifacts`, `packages/config`, `packages/orchestration`, `packages/registry`, `packages/skills`, `packages/schematics`, `packages/context`, `packages/verification`, `packages/mechanical-gates`, `packages/contracts`, `packages/security`, `packages/observability`, `packages/standards`, `packages/presets/typescript`, `packages/presets/nest-react-rn`, `packages/adapters/pi`, `packages/testing`.
- Ownership/evidence: `.vibe/ownership/**` and `.vibe/work/I-00A-workspace-package-skeleton/**`.

## Read-only / untouchable boundaries

- Decision artifacts: `docs/decisions/**` are read-only.
- Prior decision/audit evidence: `.vibe/work/DL-*/**` is read-only.
- I-00B governance paths (`README.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/README.md`, `docs/architecture/index.md`) are not owned by I-00A.
- `.git/**`, `.github/**`, `apps/**`, `examples/**`, `scripts/**`, `packages/core/**`, and future non-pi adapter package paths are untouchable for this lane.

## Serialized handoffs

- Package manifests are skeleton-owned by I-00A until independent validation accepts this lane; later package owners may edit only their own package manifest after explicit handoff.
- After package handoff, downstream package owners may create package-owned source inside their own package subtrees. The default root `workspace:surface` witness remains a current-workspace root/package/graph witness and must not fail merely because such downstream-owned source exists.
- The initial "package directories contain only `package.json`" invariant is an I-00A skeleton-snapshot invariant only, reachable through the explicit witness mode `--mode skeleton-snapshot`; it is not the default post-handoff current-surface contract.
- `packages/cli/package.json` remains skeleton-only here; `I-02A` owns adding a real CLI entrypoint/bin only when source exists.
- Root `package.json` and `turbo.json` may be edited by `I-20` only after serialized handoff for aggregate quality/CI scripts.
- `packages/testing` is test-only/private. Production package dependencies on `@vibe-engineer/testing` remain forbidden.
