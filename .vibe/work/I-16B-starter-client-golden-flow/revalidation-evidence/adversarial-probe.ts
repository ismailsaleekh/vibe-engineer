// @sample @demo @reference — I-16B revalidator-authored ADVERSARIAL PROBE.
//
// Independent of the implementer's witness. Payloads chosen by the REVALIDATOR.
// Proves fail-closed is genuine across MANY invalid shapes (incl. the decisive
// .strict() extra-field the implementer's witness does NOT test), that the
// shared client surfaces rejections (does not mask 400s), that BOTH platforms
// consume the SAME shared-client surface (no fork), and that the validating
// shared client rejects multiple invalid NETWORK response shapes (client-side
// response boundary).
//
// Runs against the REAL @ts-rest/core + zod runtime (via the dep-resolver hook),
// the REAL I-16A provider, and the REAL I-16A canonical contract — NO mock.

import { type ApiFetcher } from "@ts-rest/core";
import {
  createGoldenRecordsApplicationProbe,
  handleGoldenRecordsApiRequest,
  GoldenRecordsContractBoundaryError
} from "../../../../examples/starter-reference/generated-fixtures/golden-api/src/provider/golden-records.provider.js";
import { createGoldenRecordsSharedClient } from "../../../../examples/starter-reference/generated-fixtures/golden-client/src/golden-records.shared-client.js";
import { createWebTransport, WEB_PLATFORM } from "../../../../examples/starter-reference/generated-fixtures/golden-client/src/transport/web.js";
import { createMobileTransport, MOBILE_PLATFORM } from "../../../../examples/starter-reference/generated-fixtures/golden-client/src/transport/mobile.js";
import { goldenRecordSuccessResponseSchema } from "../../../../examples/starter-reference/generated-fixtures/golden-contracts/src/golden-records.contract.js";

interface Check { name: string; ok: boolean; detail?: unknown; }
const checks: Check[] = [];
function record(name: string, ok: boolean, detail?: unknown) {
  checks.push({ name, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${JSON.stringify(detail).slice(0, 160)}` : ""}`);
}

// A VALID payload the REVALIDATOR chose (distinct from the fixture's "Alpha").
const VALID_BODY = {
  title: "BetaProbe",
  summary: "revalidator-chosen valid golden payload",
  status: "active",
  sequence: 42,
  absence: { kind: "not-provided", reason: "adv-probe absence" }
};
const VALID_HEADERS = { "x-golden-client": "adv-probe" };
const VALID_PATH = "/api/golden-records/gr_abc123/classify";

// ---------------------------------------------------------------------------
// GROUP A — valid flow through the SHARED CLIENT, BOTH platforms (no fork).
// ---------------------------------------------------------------------------
async function groupA() {
  // A1: web shared client round-trip with MY payload — verify echoed fields.
  const webClient = createGoldenRecordsSharedClient(createWebTransport());
  let webOk = false;
  try {
    const r = await webClient.classifyGoldenRecord({
      params: { goldenRecordId: "gr_abc123" },
      headers: VALID_HEADERS,
      body: VALID_BODY
    });
    webOk = r.status === 200 && r.body.accepted === true
      && r.body.normalizedTitle === `${WEB_PLATFORM.clientHeader}:betaprobe`
      && r.body.statusEcho === "active" && r.body.sequenceEcho === 42;
    record("A1 web-shared-client valid round-trip (echoed fields)", webOk, { status: r.status, normalizedTitle: (r.body as { normalizedTitle?: string }).normalizedTitle });
  } catch (e) { record("A1 web-shared-client valid round-trip", false, String((e as Error).message).slice(0, 120)); }

  // A2: mobile shared client round-trip with the SAME payload — SAME surface.
  const mobileClient = createGoldenRecordsSharedClient(createMobileTransport());
  let mobileOk = false;
  try {
    const r = await mobileClient.classifyGoldenRecord({
      params: { goldenRecordId: "gr_abc123" },
      headers: VALID_HEADERS,
      body: VALID_BODY
    });
    mobileOk = r.status === 200 && r.body.accepted === true
      && r.body.normalizedTitle === `${MOBILE_PLATFORM.clientHeader}:betaprobe`;
    record("A2 mobile-shared-client valid round-trip (same surface)", mobileOk, { status: r.status, normalizedTitle: (r.body as { normalizedTitle?: string }).normalizedTitle });
  } catch (e) { record("A2 mobile-shared-client valid round-trip", false, String((e as Error).message).slice(0, 120)); }

  // A3: BOTH shared clients accept an identical SECOND distinct payload (status: archived, seq: 999).
  let bothOk = false;
  try {
    const body2 = { ...VALID_BODY, title: "Gamma", status: "archived" as const, sequence: 999 };
    const [rw, rm] = await Promise.all([
      webClient.classifyGoldenRecord({ params: { goldenRecordId: "gr_zzz999" }, headers: VALID_HEADERS, body: body2 }),
      mobileClient.classifyGoldenRecord({ params: { goldenRecordId: "gr_zzz999" }, headers: VALID_HEADERS, body: body2 })
    ]);
    bothOk = rw.status === 200 && rm.status === 200 && rw.body.sequenceEcho === 999 && rm.body.sequenceEcho === 999 && rw.body.goldenRecordId === "gr_zzz999";
    record("A3 both-platforms identical-payload accepted (same surface, no fork)", bothOk, { web: rw.status, mobile: rm.status });
  } catch (e) { record("A3 both-platforms identical-payload", false, String((e as Error).message).slice(0, 120)); }
}

// ---------------------------------------------------------------------------
// GROUP B — invalid REQUEST through the SHARED CLIENT (web) → surfaces status 400.
// (transport injects the header; proves the shared client does not mask 400s)
// ---------------------------------------------------------------------------
async function groupB() {
  const client = createGoldenRecordsSharedClient(createWebTransport());
  const cases: Array<{ name: string; params: object; body: unknown }> = [
    { name: "B1 empty-body", params: { goldenRecordId: "gr_abc123" }, body: {} },
    { name: "B2 missing-summary", params: { goldenRecordId: "gr_abc123" }, body: { title: "X", status: "active", sequence: 1, absence: { kind: "not-provided", reason: "r" } } },
    { name: "B3 wrong-type-sequence", params: { goldenRecordId: "gr_abc123" }, body: { ...VALID_BODY, sequence: "seven" } },
    { name: "B4 bad-enum-status", params: { goldenRecordId: "gr_abc123" }, body: { ...VALID_BODY, status: "BOGUS" } },
    { name: "B5 STRICT-extra-field (decisive .strict())", params: { goldenRecordId: "gr_abc123" }, body: { ...VALID_BODY, EVIL_EXTRA_FIELD: 1 } },
    { name: "B6 title-empty (min-length)", params: { goldenRecordId: "gr_abc123" }, body: { ...VALID_BODY, title: "" } },
    { name: "B7 bad-path-param (gr_X uppercase)", params: { goldenRecordId: "gr_X" }, body: VALID_BODY }
  ];
  for (const c of cases) {
    let ok = false; let detail: unknown = undefined;
    try {
      const r = await client.classifyGoldenRecord({ params: c.params as { goldenRecordId: string }, headers: VALID_HEADERS, body: c.body as never });
      // Expect 400 (known status, valid error body) — NOT 200, NOT a throw masking it.
      ok = r.status === 400;
      detail = { status: r.status, got200: r.status === 200 };
    } catch (e) {
      // A throw is ALSO acceptable as "rejected" (e.g. ts-rest may throw on
      // certain client-side path issues), but record it so we can see behavior.
      ok = false; detail = { threw: String((e as Error).name) };
    }
    record(`${c.name} → rejected (status 400 surfaced via shared client)`, ok, detail);
  }
}

// ---------------------------------------------------------------------------
// GROUP C — invalid REQUEST DIRECT to provider → 400 AND applicationLogicRan===false.
// (decisive before-logic proof; header-absence + strict-header + response boundary)
// ---------------------------------------------------------------------------
function groupC() {
  // C1: missing x-golden-client header → 400, logic did not run.
  {
    const probe = createGoldenRecordsApplicationProbe();
    const r = handleGoldenRecordsApiRequest({ method: "POST", path: VALID_PATH, headers: {}, body: VALID_BODY }, probe);
    record("C1 missing-x-golden-client-header → 400 before logic", r.status === 400 && probe.applicationLogicRan === false, { status: r.status, ran: probe.applicationLogicRan });
  }
  // C2: STRICT extra header field → 400.
  {
    const probe = createGoldenRecordsApplicationProbe();
    const r = handleGoldenRecordsApiRequest({ method: "POST", path: VALID_PATH, headers: { "x-golden-client": "adv-probe", "x-evil": "1" }, body: VALID_BODY }, probe);
    record("C2 STRICT-extra-header → 400 before logic", r.status === 400 && probe.applicationLogicRan === false, { status: r.status, ran: probe.applicationLogicRan });
  }
  // C3: forceInvalidProviderResponse → typed response-boundary error (never trusted).
  {
    const probe = createGoldenRecordsApplicationProbe();
    let threwBoundary = false; let name = "";
    try {
      handleGoldenRecordsApiRequest({ method: "POST", path: VALID_PATH, headers: VALID_HEADERS, body: VALID_BODY, forceInvalidProviderResponse: true }, probe);
    } catch (e) {
      threwBoundary = e instanceof GoldenRecordsContractBoundaryError && (e as GoldenRecordsContractBoundaryError).boundary === "response";
      name = (e as Error).name;
    }
    record("C3 forceInvalidProviderResponse → GoldenRecordsContractBoundaryError(response)", threwBoundary, { name });
  }
  // C4: bad enum in absence.kind → 400 before logic.
  {
    const probe = createGoldenRecordsApplicationProbe();
    const r = handleGoldenRecordsApiRequest({ method: "POST", path: VALID_PATH, headers: VALID_HEADERS, body: { ...VALID_BODY, absence: { kind: "forbidden", reason: "r" } } }, probe);
    record("C4 bad-absence-kind → 400 before logic", r.status === 400 && probe.applicationLogicRan === false, { status: r.status });
  }
}

// ---------------------------------------------------------------------------
// GROUP D — validating shared client rejects invalid NETWORK responses (multiple).
// (client-side response boundary; mirror I-16A W-CLIENT, multiple shapes)
// ---------------------------------------------------------------------------
async function groupD() {
  const invalidResponseCases: Array<{ name: string; body: unknown }> = [
    { name: "D1 bad-goldenRecordId-pattern", body: { goldenRecordId: "bad", accepted: true, normalizedTitle: "x", statusEcho: "active", sequenceEcho: 1, absence: { kind: "not-provided", reason: "r" } } },
    { name: "D2 wrong-type-sequenceEcho", body: { goldenRecordId: "gr_abc123", accepted: true, normalizedTitle: "x", statusEcho: "active", sequenceEcho: "seven", absence: { kind: "not-provided", reason: "r" } } },
    { name: "D3 STRICT-extra-response-field", body: { goldenRecordId: "gr_abc123", accepted: true, normalizedTitle: "x", statusEcho: "active", sequenceEcho: 1, absence: { kind: "not-provided", reason: "r" }, EVIL: 1 } },
    { name: "D4 missing-normalizedTitle", body: { goldenRecordId: "gr_abc123", accepted: true, statusEcho: "active", sequenceEcho: 1, absence: { kind: "not-provided", reason: "r" } } },
    { name: "D5 bad-enum-statusEcho", body: { goldenRecordId: "gr_abc123", accepted: true, normalizedTitle: "x", statusEcho: "BOGUS", sequenceEcho: 1, absence: { kind: "not-provided", reason: "r" } } }
  ];
  for (const c of invalidResponseCases) {
    const badApi: ApiFetcher = async () => ({ status: 200, body: c.body, headers: new Headers({ "content-type": "application/json" }) });
    const client = createGoldenRecordsSharedClient(badApi);
    let rejected = false; let detail: unknown = undefined;
    try {
      const r = await client.classifyGoldenRecord({ params: { goldenRecordId: "gr_abc123" }, headers: VALID_HEADERS, body: VALID_BODY as never });
      // If it did NOT throw, it must NOT have returned a 200 body (it would be
      // the invalid body) — any non-throw here is a FAIL (client trusted invalid).
      rejected = false; detail = { status: r.status, trustedInvalid: true };
    } catch (e) {
      rejected = true; detail = { name: (e as Error).name };
    }
    record(`${c.name} → validating client REJECTS invalid response`, rejected, detail);
  }
}

// ---------------------------------------------------------------------------
// GROUP E — no-duplication: the success schema re-parsed by the flow is the REAL
// canonical contract schema (strict; rejects extras). (grep already proved zero
// re-definitions; this confirms the imported schema behaves strict at runtime.)
// ---------------------------------------------------------------------------
function groupE() {
  const valid = { goldenRecordId: "gr_abc123", accepted: true, normalizedTitle: "x", statusEcho: "active", sequenceEcho: 1, absence: { kind: "not-provided", reason: "r" } };
  const withExtra = { ...valid, EVIL: 1 };
  const okParse = goldenRecordSuccessResponseSchema.safeParse(valid).success === true;
  const rejectExtra = goldenRecordSuccessResponseSchema.safeParse(withExtra).success === false;
  record("E1 imported success schema is real+strict (accepts valid, rejects .strict() extra)", okParse && rejectExtra, { okParse, rejectExtra });
}

async function main() {
  await groupA();
  await groupB();
  groupC();
  await groupD();
  groupE();
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.length - passed;
  console.log(`\n=== adversarial probe: ${passed}/${checks.length} PASS, ${failed} FAIL ===`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error("FATAL", e); process.exit(2); });
