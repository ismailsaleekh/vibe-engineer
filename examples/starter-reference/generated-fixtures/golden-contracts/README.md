# golden-contracts fixture (I-16A / DL-14 / DL-16 / DL-20A)

`@sample @demo @reference` — domain-neutral golden-records contract fixture.

The **single source of truth** for a golden-records API boundary:

- `src/golden-records.contract.ts` — canonical `ts-rest` route contract over
  **named Zod schemas** (all `.strict()`): `goldenRecordIdSchema`,
  `goldenRecordStatusSchema`, `goldenRecordPathParamsSchema`,
  `goldenRecordHeadersSchema`, `goldenRecordRequestBodySchema`,
  `goldenRecordSuccessResponseSchema`, `goldenRecordErrorResponseSchema`, and the
  untrusted entry envelope `goldenRecordBoundaryRequestSchema` (`unknown`-typed
  body). Inferred TS types via `ClientInferRequest` / `ClientInferResponses` /
  `z.infer`. `strictStatusCodes: true`.
- `src/generated/golden-records-client.ts` — **AUTO-GENERATED** shared client
  derived ONLY from the contract via `initClient` + a validating `ApiFetcher`
  that re-parses the network-crossing response. No hand-authored fetch DTOs
  (DL-14 §5). Carries `GENERATED_CLIENT_PROVENANCE` (canonical contract path +
  source SHA-256).
- `src/generation/generate-golden-records-client.ts` — the generator that
  projects the canonical contract into the generated client (idempotent; W-REG-REGEN).
- `schema-contract-strictness.manifest.json` — strictness manifest naming the
  canonical contract, generated client, generator, provider/consumer/witness
  files, required named schemas, and the real-resolution provenance.

Mirrors the proven I-11 `packages/contracts/src/contracts/reference-flow.contract.ts`
pattern, applied to the domain-neutral `golden-records` sample/demo module.

The companion **provider + consumer + real-boundary witness** live in the sibling
`../golden-api/` fixture.
