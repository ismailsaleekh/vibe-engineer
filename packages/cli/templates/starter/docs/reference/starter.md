# Reference starter (sample/demo/reference)

This is the `@vibe-engineer-starter` reference monorepo produced by the
installed `vibe-engineer create` command from shipped starter template files.
The starter recreates the harness's domain-neutral structure in its own private
`@vibe-engineer-starter/*` workspace packages; it does **not** import public
`@vibe-engineer/*` runtime packages and does **not** copy harness implementation
logic.

The single sample/demo/reference module is `golden-records`.

The generated `.github/workflows/quality.yml` quick gate mirrors the local
starter proof path and intentionally excludes full E2E, mobile/device, visual,
and deployment proofs from default PR/push CI.
