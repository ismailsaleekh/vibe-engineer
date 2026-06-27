# observability fixture (@sample @demo @reference)

I-19 / DL-23 — the generated/reference starter **observability demonstration**.

This fixture proves the `vibe-engineer` v1 observability defaults (`DL-23`) emit
**REAL signals consumed by verification** on a minimal domain-neutral golden
critical path + error path. It consumes the I-16A/I-16B golden boundary and the
I-18 redaction contract **read-only via public contracts** and instruments a
critical path THROUGH them; it does not edit any golden-* or security source.

## What it demonstrates

- **One generic successful golden critical path** (`runInstrumentedGoldenSuccessPath`)
  through the I-16B shared client → I-16A real provider boundary, instrumented
  with REAL `@vibe-engineer/observability` instrumentation:
  - a real structured log (typed zod-validated record, all required DL-23 fields);
  - a real OpenTelemetry span set (`client.call` + `api.request` +
    `verification.run`) carrying the required bounded attributes;
  - real OpenTelemetry metric increments through the typed helpers
    (`request.*`, `client.call.*`, `operation.*`, `observability.assertion.*`);
  - a real canonical RFC 4122 UUID v4 `correlationId` that **joins** the client
    call, the API handling, the structured log, the spans, and the metric labels
    (the **correlation join matrix**, DL-23 §7).
- **One generic error path** (`runInstrumentedGoldenErrorPath`): an invalid
  payload through the shared client → 400 before application logic, emitting an
  error span status + `error.count` metric + redacted classification + evidence
  that sensitive values are absent/redacted per `DL-22`.
- **Local capture / test exporters only** — the InMemory OTel exporters + the
  observability memory log sink are the verification carrier. NO Prometheus /
  Jaeger / Grafana / cloud backend (DL-23 starter scope §3).

## Real-boundary posture

Every emitted signal is read out of the REAL local capture sinks by the
verification consumer — no mock, no hand-authored artifact, no shape-only
fixture (DL-23 failure policy §3). The `W-PROBE-CONTRAST` witness disables the
real capture sink and confirms the consumer then reads NOTHING, ruling out a
false-green from a mocked sink (mirrors the I-15B-3 4-context contrast).

## Graph-neutral dependency model

This fixture path is NOT a pnpm workspace member. The REAL
`@vibe-engineer/observability` + `pino` + `@opentelemetry/*` + `@ts-rest/core`
+ `zod` runtime is exercised by the witness runner via an ESM resolve loader
hook (`src/runtime/dep-resolver-hooks.mjs`) anchored at the harness
`packages/observability` + `packages/contracts` contexts — the validated I-15B-3
in-context resolution precedent. NO install, NO manifest/lockfile edit, NO mock.

## Run

```
node ./run-observability-witness.mjs
```

Emits `.vibe/work/I-19-observability-defaults-tests/evidence/observability-fixture-witness-result.json`.

## Vocabulary

Generic/sample/demo/reference only (DL-20A): `reference.operation`, `api.request`,
`client.call`, `verification.run`. No business-domain telemetry names in core.
