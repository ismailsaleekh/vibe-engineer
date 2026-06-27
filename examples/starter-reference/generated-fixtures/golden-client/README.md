# golden-client fixture (I-16B / DL-14 / DL-16 / DL-20A)

`@sample @demo @reference` — domain-neutral golden-records **generated/shared client** fixture.

The shared-client half of the starter golden-records boundary, consumed by BOTH
`apps/web` and `apps/mobile` (DL-16 §247). It DERIVES ONLY from the I-16A
canonical contract (single source of truth):

- `src/golden-records.shared-client.ts` — re-exports + wraps the I-16A generated
  client (`createGoldenRecordsClient`) and provides `createGoldenRecordsSharedClient(transport)`.
  Imports contract-derived types ONLY — NO Zod schema, NO route-contract
  re-declaration, NO hand-authored fetch DTO (DL-14 §5; DL-16 §223; enforced by
  the golden-flow witness grep W-SHARED-CLIENT-DERIVED / W-NO-FORK). Carries
  `SHARED_CLIENT_PROVENANCE` naming the canonical I-16A contract path + source
  SHA-256.
- `src/use-golden-records.ts` — framework-neutral consumer hook mirroring the
  I-15B source-template `use-golden-records.ts` (generic shape consumed by web +
  mobile; the exact React/RN binding is owned by I-16/I-17). Typed by
  contract-derived types only.
- `src/transport/web.ts` — DOM-`fetch`-shaped `ApiFetcher` for `apps/web`.
- `src/transport/mobile.ts` — React-Native-`fetch`-shaped `ApiFetcher` for
  `apps/mobile`.
- `src/index.ts` — barrel: the SINGLE shared-client surface both platforms import.

Per-platform transports MAY differ for fetch/base URL/auth transport, but
request/response schemas and route contracts MUST NOT fork (DL-14 §60) — both
adapters feed the SAME shared client surface built on the SAME I-16A contract.

The real-runtime golden consumer **flow** (seed/classify → read → consume across
both transports) + the real-boundary witness live in the sibling `../golden-flow/`
fixture. See `../golden-flow/README.md` for the witness run command.
