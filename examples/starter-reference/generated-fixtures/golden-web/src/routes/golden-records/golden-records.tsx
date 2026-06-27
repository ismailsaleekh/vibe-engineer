// @sample @demo @reference — golden-web golden-records route (I-17A / DL-14 / DL-16 / DL-20A).
//
// THE load-bearing web surface. This is the I-17A web binding the I-15B
// source-template intentionally deferred (`useGoldenRecords` UI binding "owned by
// I-16/I-17"). It consumes the I-16B SHARED client (`golden-client`) — it does
// NOT re-declare the contract/client/DTO (DL-14 §5):
//
//   React (this route)
//     → useGoldenRecords() accessor (framework-neutral, I-16B)
//     → createGoldenRecordsSharedClient(web transport) (I-16B)
//     → createWebTransport() → handleGoldenRecordsApiRequest (I-16A provider)
//     → I-16A contract (`@ts-rest/core` + `zod`)
//
// It renders the REAL classified record returned by the shared client against
// the real I-16A provider, with stable labeled DOM (`data-testid` +
// `aria-label="Golden records (sample/demo/reference)"` matching the
// source-template label) so the Playwright E2E + UI-verification specialists
// can assert against real selectors. NO mock, NO hand-authored DTO.
//
// Real-boundary posture: this route only renders truth-green when served by the
// real Vite dev server with `react`/`react-dom` + the shared-client deps
// resolvable (W-RB-PLAYWRIGHT, brief §7). Structural validators prove the
// import graph + selector wiring in-license (shape-green, NOT truth-green).

import { useEffect, useState, type JSX } from "react";
import {
  createGoldenRecordsSharedClient,
  createWebTransport,
  useGoldenRecords,
  type GoldenRecordSuccessResponse
} from "../../../../golden-client/src/index.js";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; record: GoldenRecordSuccessResponse }
  | { kind: "error"; message: string };

function useForceInvalid(): boolean {
  // Deterministic UI-verification failure-state fixture (DL-13 state profile
  // "golden-records-error"; W-NEG-PROVIDER-INVALID). When `?gr-force-invalid=1`
  // is present, the route drives the SAME shared client with a deliberately
  // invalid body so the I-16A provider rejects with 400 → the route renders the
  // FAILURE state (never a false success). No contract fork: the consumer calls
  // the typed shared client directly.
  return new URLSearchParams(window.location.search).get("gr-force-invalid") === "1";
}

export function GoldenRecordsRoute(): JSX.Element {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const accessor = useGoldenRecords();
  const forceInvalid = useForceInvalid();

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    // The web transport routes the typed call to the REAL in-process I-16A
    // provider handler (golden-api) — the same target a DOM fetch reaches over
    // the wire. The shared client re-parses the network-crossing response
    // against the I-16A success schema (DL-14 §4).
    const transport = createWebTransport();
    const sharedClient = createGoldenRecordsSharedClient(transport);
    const run = forceInvalid
      ? // Invalid body → provider 400 → rendered failure (W-NEG-PROVIDER-INVALID).
        sharedClient
          .classifyGoldenRecord({
            params: { goldenRecordId: "gr_abc123" },
            headers: { "x-golden-client": "golden-web-fixture" },
            body: {
              title: "",
              summary: "force-invalid sample",
              status: "active",
              sequence: 7,
              absence: { kind: "not-provided", reason: "force-invalid" }
            }
          })
          .then((response) => {
            if (response.status !== 200) {
              throw new Error(`provider rejected the invalid request (status ${response.status})`);
            }
            return response.body as GoldenRecordSuccessResponse;
          })
      : accessor.classifyOnce(sharedClient);
    run
      .then((record) => {
        if (!cancelled) setState({ kind: "ready", record });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ kind: "error", message: error instanceof Error ? error.message : String(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessor, forceInvalid]);

  if (state.kind === "loading") {
    return (
      <section
        aria-label="Golden records (sample/demo/reference)"
        data-testid="golden-records-section"
      >
        <p data-testid="golden-records-loading">Loading golden records…</p>
      </section>
    );
  }

  if (state.kind === "error") {
    // W-NEG-PROVIDER-INVALID: a provider-invalid response surfaces as a rendered
    // FAILURE state, never a false success. Stable selector so the negative E2E
    // spec can assert the failure path is reached.
    return (
      <section
        aria-label="Golden records (sample/demo/reference)"
        data-testid="golden-records-section"
      >
        <p data-testid="golden-records-error" role="alert">
          Golden records failed to load: {state.message}
        </p>
      </section>
    );
  }

  const record = state.record;
  return (
    <section
      aria-label="Golden records (sample/demo/reference)"
      data-testid="golden-records-section"
    >
      <h2 data-testid="golden-records-heading">Golden records</h2>
      <article
        data-testid="golden-record-card"
        data-golden-record-id={record.goldenRecordId}
      >
        <h3 data-testid="golden-record-title">{record.normalizedTitle}</h3>
        <dl>
          <div>
            <dt>Golden record id</dt>
            <dd data-testid="golden-record-id">{record.goldenRecordId}</dd>
          </div>
          <div>
            <dt>Accepted</dt>
            <dd data-testid="golden-record-accepted">{String(record.accepted)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd data-testid="golden-record-status">{record.statusEcho}</dd>
          </div>
          <div>
            <dt>Sequence</dt>
            <dd data-testid="golden-record-sequence">{record.sequenceEcho}</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}
