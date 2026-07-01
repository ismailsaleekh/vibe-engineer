# App-aware built-in schematics

`@vibe-engineer/schematics` includes deterministic app-aware built-ins for the starter app layout. Each manifest constrains `appRoot` to the expected app path, declares fail-closed generated paths, and writes only generated-owned stubs/tests.

| Schematic slug | App root | Primary generated paths |
| --- | --- | --- |
| `nest-feature-module` | `apps/api` | `src/<name>/*`, `test/<name>.module.test.ts` |
| `nest-crud-resource` | `apps/api` | `src/<name>/*`, `test/<name>.crud.test.ts` |
| `react-route-module` | `apps/web` | `src/routes/<name>/*`, `test/<name>.route.test.ts` |
| `react-crud-feature` | `apps/web` | `src/routes/<name>/*`, `test/<name>.crud-feature.test.ts` |
| `expo-screen-flow` | `apps/mobile` | `src/screens/<name>/*`, `src/navigation/<name>.flow.ts`, `test/<name>.screen.test.ts` |
| `mobile-crud-flow` | `apps/mobile` | `src/screens/<name>/*`, `test/<name>.crud-flow.test.ts` |
| `playwright-e2e-spec` | `apps/web` | `e2e/<name>.spec.ts` |
| `maestro-e2e-flow` | `apps/mobile` | `e2e/maestro/<name>.yaml` |

Nest outputs include tsx-safe DI guidance: generated controllers use explicit `@Inject(...)`, and generated modules declare concrete provider arrays/exports instead of relying on reflected constructor metadata.

No `verification-runner` or `runner-catalog-entry` schematic is registered or templated. Detox E2E generation remains intentionally unregistered for a later optional schematic.
