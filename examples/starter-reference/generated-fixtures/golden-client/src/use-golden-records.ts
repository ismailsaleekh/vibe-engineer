// @sample @demo @reference — golden-client framework-neutral consumer hook (I-16B / DL-16).
//
// Mirrors the I-15B source-template `packages/api-client/src/golden-records/use-golden-records.ts`
// intent: a GENERIC CONSUMER HOOK SHAPE consumed by BOTH `apps/web` and
// `apps/mobile`. The exact React/RN binding is owned by I-16/I-17; this fixture
// keeps the surface framework-neutral (no React/RN import) so both platforms
// import the SAME shared-client surface (DL-16 import rules).
//
// Typed by contract-derived types ONLY (no hand-authored DTO; DL-14 §5).

import { type GoldenRecordSuccessResponse } from "../../golden-contracts/src/golden-records.contract.js";
import { type GoldenRecordsSharedClient } from "./golden-records.shared-client.js";

/**
 * The framework-neutral accessor BOTH web and mobile call against the shared
 * client. It performs the classify-golden-record flow and re-parses the
 * network-crossing response against the I-16A success schema (DL-14 §4).
 *
 * (Source-template `useGoldenRecords` returns a static list because the
 * `apps/web`/`apps/mobile` UI bindings are owned by I-16/I-17; here we expose the
 * real shared-client-bound accessor + a static-list shim that mirrors the
 * source-template shape, so consumers can verify they consume the SAME surface.)
 */
export interface UseGoldenRecordsAccessor {
  classifyOnce(client: GoldenRecordsSharedClient): Promise<GoldenRecordSuccessResponse>;
  /** Static-list shim mirroring the source-template `useGoldenRecords` shape (UI binding deferred to I-17). */
  readonly records: readonly GoldenRecordSuccessResponse[];
}

export function useGoldenRecords(): UseGoldenRecordsAccessor {
  return {
    async classifyOnce(client: GoldenRecordsSharedClient): Promise<GoldenRecordSuccessResponse> {
      const response = await client.classifyGoldenRecord({
        params: { goldenRecordId: "gr_abc123" },
        headers: { "x-golden-client": "shared-client-fixture" },
        body: {
          title: "Alpha",
          summary: "Domain-neutral golden-record sample payload.",
          status: "active",
          sequence: 7,
          absence: { kind: "not-provided", reason: "domain-neutral absence model" }
        }
      });
      if (response.status !== 200) {
        throw new Error(`Golden-records shared-client flow failed with status ${response.status}`);
      }
      return response.body;
    },
    records: []
  };
}
