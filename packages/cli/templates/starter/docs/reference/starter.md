# Reference starter (sample/demo/reference)

This is the `@vibe-engineer-starter` reference monorepo produced by the
installed `vibe-engineer create` command from shipped starter template files.
The starter recreates the harness's domain-neutral structure in its own private
`@vibe-engineer-starter/*` workspace packages; it does **not** import public
`@vibe-engineer/*` runtime packages and does **not** copy harness implementation
logic.

The single sample/demo/reference module is `golden-records`.

Local app startup:

```bash
pnpm run dev                 # API + web
WEB_PORT=5199 pnpm run dev:web # web only on a custom Vite port
pnpm run dev:mobile          # Expo-powered React Native app on Metro port 8081
pnpm run dev:mobile:ios      # open on iOS simulator
pnpm run dev:mobile:android  # open on Android emulator
```

The mobile app uses the Expo-managed React Native local runtime so users do not
need a globally installed React Native CLI or a checked-in native shell just to
open the starter on a simulator. Xcode / Android Studio / simulator setup remain
normal platform prerequisites.

The generated `.github/workflows/quality.yml` quick gate mirrors the local
starter proof path and intentionally excludes full E2E, mobile/device, visual,
and deployment proofs from default PR/push CI.

Verification runner starter path:

```bash
vibe-engineer verify \
  --project-root . \
  --implementation-plan docs/reference/starter-readiness-plan.json \
  --evidence-root .vibe/evidence/starter-readiness/verify \
  --run-id starter-readiness \
  --runner-catalog .vibe/registry/runner-catalog.json
```

The generated `docs/reference/starter-readiness-plan.json` is an approved sample
Implementation Plan whose Verification Delta matches the safe default runner
catalog entries for `typecheck`, `lint_format`, `unit`, and `build_package`.
Generated evidence is written under `.vibe/evidence/**`, which is ignored so the
fresh repository stays clean after readiness checks. Add project-specific runner
entries and update the plan before requiring additional Verification Delta layers.
