# golden-api fixture (I-16A / DL-14 / DL-16 / DL-20A)

`@sample @demo @reference` — domain-neutral golden-records provider/consumer/witness fixture.

The runtime half of the golden-records contract boundary (the contract + generated
client live in the sibling `../golden-contracts/` fixture):

- `src/provider/golden-records.provider.ts` — NestJS-style `ts-rest` provider
  (Nest-compatible; mirrors `@ts-rest/nest` semantics). Validates the request
  against the named contract schemas BEFORE application logic (fail-closed
  `{status:400, body:GoldenRecordErrorResponse}`, application logic does NOT run
  — proved by `GoldenRecordsApplicationProbe`). Validates the response candidate
  against `goldenRecordSuccessResponseSchema` BEFORE exposing it; throws a typed
  `GoldenRecordsContractBoundaryError("response")` on a compiled-but-invalid
  response (never trusted — DL-14 §3). Supports `forceInvalidProviderResponse` to
  exercise the fail-closed response path.
- `src/consumer/golden-records.consumer.ts` — calls the GENERATED client and
  re-parses the response against the success schema. Imports contract-derived
  client/types ONLY — NO Zod schema / DTO shape defined here (DL-14 §5, W-NODUP).
- `src/witness/golden-records.real-boundary.ts` (+ `.cli.ts`) — the real-boundary
  witness returning the I-11 five-boolean result shape:
  `{providerAccepted, consumerAccepted, invalidRequestRejectedBeforeLogic,
  invalidResponseRejected, clientInvalidResponseRejected}`.
- `src/runtime/dep-resolver-hooks.mjs` (+ `dep-resolver-register.mjs`) — ESM
  `resolve` loader hook that maps bare `@ts-rest/core` + `zod` to their REAL
  resolved paths from the installed harness `packages/contracts` deps, so the
  fixture `.ts` files run against the REAL runtime (NO mock, NO `node_modules`,
  NO manifest/lockfile edit). Also maps relative `.js` specifiers to `.ts` for
  type-stripped execution.
- `run-golden-records-witness.mjs` — the witness runner (the canonical entry):
  runs the real-resolution proof (W-RESOLVE), the runtime witness
  (W-PROVIDER/W-NEG-REQ/W-NEG-RESP/W-CLIENT), the structural checks
  (W-NODUP/W-DOMAIN-NEUTRAL), the regen regression (W-REG-REGEN), and the
  dirty-tree invariant (W-INVARIANTS); emits an evidence packet to
  `.vibe/work/I-16A-starter-contracts-api-provider/evidence/`.

## Run

```sh
# from examples/starter-reference/generated-fixtures/golden-api
node --import ./src/runtime/dep-resolver-register.mjs --experimental-strip-types ./run-golden-records-witness.mjs
```

Exits `0` on green (all five booleans true + structural checks clean); `1` on any
failure. The witness exercises the REAL `@ts-rest/core@3.52.1` + `zod@3.25.76`
runtime — shape-green is not truth-green (no mock / synthetic green).
