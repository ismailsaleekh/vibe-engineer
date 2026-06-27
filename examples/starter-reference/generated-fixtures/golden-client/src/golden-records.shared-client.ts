// @sample @demo @reference — golden-client shared client fixture (I-16B / DL-14 / DL-16 / DL-20A).
//
// The GENERATED/SHARED CLIENT for the starter golden-records boundary — the
// single client surface BOTH `apps/web` and `apps/mobile` consume (DL-16 §245
// minimal witness path; DL-16 §247 "API client: generated/shared client consumed
// by both web and mobile"). It DERIVES ONLY from the I-16A canonical contract:
// it re-exports + wraps the I-16A generated client factory
// (`createGoldenRecordsClient`) and imports contract-derived types ONLY.
//
// NO Zod schema definition, NO route-contract re-declaration, NO hand-authored
// fetch DTO for golden payloads lives in this fixture (DL-14 §5; DL-16 §223;
// W-SHARED-CLIENT-DERIVED / W-NO-FORK enforced by the runner grep). The
// per-platform transport adapters (`./transport/{web,mobile}.ts`) differ only in
// fetch/base-URL/auth plumbing and feed the SAME shared client surface
// (DL-14 §60 "Platform adapters may differ for fetch/base URL/auth transport, but
// request/response schemas and route contracts must not fork").
//
// `SHARED_CLIENT_PROVENANCE` carries the canonical I-16A contract path + its
// source SHA-256 so consumers can verify they import a contract-derived client
// and never a duplicated contract source.

import { type ApiFetcher } from "@ts-rest/core";
import {
  createGoldenRecordsClient,
  goldenRecordsClient,
  GENERATED_CLIENT_PROVENANCE
} from "../../golden-contracts/src/generated/golden-records-client.js";

export { createGoldenRecordsClient, goldenRecordsClient, GENERATED_CLIENT_PROVENANCE };

/**
 * The shared-client surface type BOTH web and mobile consume. Derived ONLY from
 * the I-16A generated client factory return type — no hand-authored DTO shape.
 */
export type GoldenRecordsSharedClient = ReturnType<typeof createGoldenRecordsClient>;
// Re-export contract-derived types so consumers never re-declare DTOs (DL-14 §5).
export type {
  GoldenRecordPathParams,
  GoldenRecordHeaders,
  GoldenRecordRequestBody,
  GoldenRecordSuccessResponse,
  GoldenRecordErrorResponse,
  GoldenRecordsClassifyRequest,
  GoldenRecordsClassifyResponse
} from "../../golden-contracts/src/golden-records.contract.js";

/**
 * Provenance for THIS golden-client fixture: it derives ONLY from the canonical
 * I-16A contract (the single source of truth) and wraps the I-16A generated
 * client. The literal `canonicalContractPath` + `canonicalContractSourceSha256`
 * are inlined verbatim (matching the I-16A `GENERATED_CLIENT_PROVENANCE`), so a
 * structural grep can confirm provenance WITHOUT executing; the runtime
 * assertion below verifies they exactly equal the I-16A generator's provenance.
 */
export const SHARED_CLIENT_PROVENANCE = {
  fixture: "examples/starter-reference/generated-fixtures/golden-client",
  implementationUnit: "I-16B-starter-client-golden-flow",
  derivedFrom: {
    canonicalContractPath: "examples/starter-reference/generated-fixtures/golden-contracts/src/golden-records.contract.ts",
    canonicalContractSourceSha256: "cfe94880f6f1b4a7950a6ff15241b5795d2a1b77d4a0224a2f9bb7d9d573af1b",
    contractExport: "GoldenRecordsContract",
    i16aGeneratedClientPath: "examples/starter-reference/generated-fixtures/golden-contracts/src/generated/golden-records-client.ts"
  },
  noFork: true,
  sharedByBothPlatforms: true,
  routeContractForked: false
} as const;

// Runtime self-check: the inlined provenance MUST exactly equal the I-16A
// generated client's provenance (single source of truth). Any drift throws — we
// never silently present a stale/duplicated contract reference.
if (
  SHARED_CLIENT_PROVENANCE.derivedFrom.canonicalContractPath !== GENERATED_CLIENT_PROVENANCE.canonicalContractPath ||
  SHARED_CLIENT_PROVENANCE.derivedFrom.canonicalContractSourceSha256 !== GENERATED_CLIENT_PROVENANCE.sourceSha256
) {
  throw new Error(
    "golden-client SHARED_CLIENT_PROVENANCE drifted from the I-16A GENERATED_CLIENT_PROVENANCE — contract source must not fork."
  );
}

/**
 * Build a SHARED golden-records client bound to a per-platform transport adapter
 * (web DOM fetch-shape OR React-Native fetch-shape). The transport produces the
 * `ApiFetcher` contract; request/response schemas + the route contract come from
 * the I-16A canonical contract and do NOT fork (DL-14 §60). Both platforms
 * consume this SAME surface — proven by W-BOTH-PLATFORMS-CONSUME.
 */
export function createGoldenRecordsSharedClient(transport: ApiFetcher): GoldenRecordsSharedClient {
  return createGoldenRecordsClient(transport);
}
