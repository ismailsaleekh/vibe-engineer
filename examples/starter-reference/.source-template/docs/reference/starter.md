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
pnpm run dev                # API + web
pnpm run dev:mobile         # Expo-powered React Native app on Metro port 8081
pnpm run dev:mobile:ios     # open on iOS simulator
pnpm run dev:mobile:android # open on Android emulator
```

The mobile app uses the Expo-managed React Native local runtime so users do not
need a globally installed React Native CLI or a checked-in native shell just to
open the starter on a simulator. Xcode / Android Studio / simulator setup remain
normal platform prerequisites.

The generated `.github/workflows/quality.yml` quick gate mirrors the local
starter proof path and intentionally excludes full E2E, mobile/device, visual,
and deployment proofs from default PR/push CI.
