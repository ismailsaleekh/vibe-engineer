# golden-flow fixture (I-16B / DL-14 / DL-16 / DL-20A)

`@sample @demo @reference` — domain-neutral golden-records **end-to-end consumer flow + real-boundary witness** fixture.

The flow half of the starter golden-records boundary, built on top of the sibling
`../golden-client/` shared client + the read-only I-16A `golden-api` provider and
`golden-contracts` canonical contract (single source of truth):

- `src/flow/golden-records.flow.ts` — framework-neutral golden flow: drives the
  SHARED client (bound to a per-platform transport) against the REAL I-16A
  provider; seed/classify → read → consume; re-parses the network-crossing
  response against the I-16A `goldenRecordSuccessResponseSchema` (DL-14 §4).
  Exercises BOTH web and mobile transports against the SAME shared client (no
  fork — DL-14 §60).
- `src/consumption/web/golden-records.web-consumption.ts` — web-consumption
  witness: binds the flow to the WEB transport adapter and the framework-neutral
  `useGoldenRecords` accessor; proves `apps/web` imports + exercises the SAME
  shared-client surface (mirrors I-15B `apps/web` import shape).
- `src/consumption/mobile/golden-records.mobile-consumption.ts` — mobile-consumption
  witness: binds the flow to the MOBILE (RN) transport adapter; proves `apps/mobile`
  imports + exercises the SAME shared-client surface (mirrors I-15B `apps/mobile`).
- `src/witness/golden-records.client-flow.real-boundary.ts` (+ `.cli.ts`) — the
  real-boundary witness returning the 6-boolean result shape:
  `{sharedClientDerivedFromContract, webConsumesSharedClient,
  mobileConsumesSharedClient, validFlowAccepted, invalidPayloadRejected,
  clientRejectsInvalidResponse}`.
- `src/runtime/dep-resolver-hooks.mjs` (+ `dep-resolver-register.mjs`) — ESM
  `resolve` loader hook (mirror of the I-16A mechanism) mapping bare
  `@ts-rest/core` + `zod` to their REAL resolved paths from the installed harness
  `packages/contracts` deps, so the fixture `.ts` files run against the REAL
  runtime (NO mock, NO `node_modules`, NO manifest/lockfile edit).
- `run-golden-records-client-flow-witness.mjs` — the witness runner (canonical
  entry): runs W-RESOLVE, the runtime witnesses (W-BOTH-PLATFORMS-CONSUME /
  W-FLOW / W-NEG-REQ / W-CLIENT-INVALID-RESP), the structural checks
  (W-SHARED-CLIENT-DERIVED / W-NO-FORK / W-DOMAIN-NEUTRAL), the regression
  (W-REG-REGEN), and the dirty-tree invariant (W-INVARIANTS); emits an evidence
  packet to `.vibe/work/I-16B-starter-client-golden-flow/evidence/`.

## Run

```sh
# from examples/starter-reference/generated-fixtures/golden-flow
node --import ./src/runtime/dep-resolver-register.mjs --experimental-strip-types ./run-golden-records-client-flow-witness.mjs
```

Exits `0` on green (all six runtime booleans true + structural checks clean);
`1` on any failure. The witness exercises the REAL `@ts-rest/core@3.52.1` +
`zod@3.25.76` runtime — shape-green is not truth-green (no mock / synthetic green).
No live DOM/RN render is booted here (live web E2E/UI is `I-17A`; live mobile
E2E/UI is `I-17B`, may be `pending-live`).
