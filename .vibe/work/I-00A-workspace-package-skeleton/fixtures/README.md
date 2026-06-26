# I-00A Workspace Surface Witness Fixtures

These fixtures are rerunnable inputs for `.vibe/work/I-00A-workspace-package-skeleton/witnesses/workspace-surface-witness.mjs`.

- `valid-workspace`: positive control copied from the skeleton shape.
- `valid-workspace-with-artifacts-source`: positive current-surface regression fixture with downstream-owned `packages/artifacts/**` source after I-00A handoff; default `current-surface` mode must pass, explicit `skeleton-snapshot` mode must fail with `PACKAGE_SOURCE_CREATED`.
- `missing-package`: removes `packages/registry/package.json`; expected failure code includes `PACKAGE_MANIFEST_MISSING` and/or `PNPM_GRAPH_PACKAGE_MISSING`.
- `packages-core`: adds forbidden `packages/core`; expected failure code `FORBIDDEN_CORE_PACKAGE`.
- `testing-prod-dependency`: adds a production dependency on `@vibe-engineer/testing`; expected failure code `TESTING_PRODUCTION_DEPENDENCY`.
- `fake-cli-bin`: adds a `vibe-engineer` bin entry pointing at absent source; expected failure code `FAKE_CLI_BIN`.
- `future-non-pi-adapter`: adds forbidden `packages/adapters/codex`; expected failure code `FORBIDDEN_FUTURE_ADAPTER`.
- `wrong-root-name`: changes the root package name; expected failure code `ROOT_PACKAGE_NAME`.
- `non-private-root`: makes the root package public; expected failure code `ROOT_PACKAGE_PRIVATE`.
