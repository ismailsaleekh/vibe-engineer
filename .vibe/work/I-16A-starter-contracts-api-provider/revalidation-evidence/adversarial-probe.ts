// I-16A adversarial revalidator INDEPENDENT probe (revalidator-owned evidence).
// @sample @demo @reference
//
// This probe is authored by the REVALIDATOR (not the implementer). It imports the
// REAL fixture provider/client/contract and exercises them with payloads the
// revalidator chooses (NOT the implementer's witness payloads), to independently
// confirm: valid→succeeds (logic runs), and a BATTERY of invalid payloads are
// rejected at the boundary (400) BEFORE application logic runs (probe unset),
// plus forceInvalidProviderResponse throws, plus the validating client rejects
// an invalid network response. Runs against the REAL @ts-rest/core + zod runtime
// via the fixture dep-resolver hook (registered by the runner invocation).

import { z } from "zod";
import {
  handleGoldenRecordsApiRequest,
  createGoldenRecordsApplicationProbe,
  GoldenRecordsContractBoundaryError
} from "../../../../examples/starter-reference/generated-fixtures/golden-api/src/provider/golden-records.provider.js";
import { createGoldenRecordsClient } from "../../../../examples/starter-reference/generated-fixtures/golden-contracts/src/generated/golden-records-client.js";

const PATH = "/api/golden-records/gr_abc123/classify";
const HEADERS = { "x-golden-client": "adversarial-probe" };
const VALID_BODY = {
  title: "Probe",
  summary: "adversarial valid payload",
  status: "active",
  sequence: 7,
  absence: { kind: "not-provided", reason: "adversarial" }
};

const results = [];

function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + JSON.stringify(detail) : ""}`);
}

// --- (1) VALID request succeeds; logic runs; schema-valid 200 ---
{
  const probe = createGoldenRecordsApplicationProbe();
  const r = handleGoldenRecordsApiRequest({ method: "POST", path: PATH, headers: HEADERS, body: VALID_BODY }, probe);
  check("valid_request_succeeds_200", r.status === 200, { status: r.status, logicRan: probe.applicationLogicRan });
  check("valid_request_logic_ran", probe.applicationLogicRan === true, {});
  // strict-mode probe: an extra unexpected field on the body must be REJECTED (z.strict()).
}

// --- (2..6) BATTERY of invalid payloads → 400 before logic ---
function invalidCase(label, body, extraHeaders) {
  const probe = createGoldenRecordsApplicationProbe();
  const r = handleGoldenRecordsApiRequest(
    { method: "POST", path: PATH, headers: extraHeaders || HEADERS, body },
    probe
  );
  check("invalid_" + label + "_rejected_400", r.status === 400, { status: r.status });
  check("invalid_" + label + "_logic_did_not_run", probe.applicationLogicRan === false, { ran: probe.applicationLogicRan });
}
invalidCase("empty_body", {});
invalidCase("garbage_string", "not-an-object");
invalidCase("missing_required_field_summary", { title: "X", status: "active", sequence: 7, absence: { kind: "not-provided", reason: "x" } });
invalidCase("wrong_type_sequence", { title: "X", summary: "s", status: "active", sequence: "seven", absence: { kind: "not-provided", reason: "x" } });
invalidCase("bad_status_enum", { title: "X", summary: "s", status: "BOGUS", sequence: 7, absence: { kind: "not-provided", reason: "x" } });
invalidCase("extra_unknown_field_strict", { title: "X", summary: "s", status: "active", sequence: 7, absence: { kind: "not-provided", reason: "x" }, EVIL_EXTRA: 1 });
invalidCase("empty_title_minlen", { title: "", summary: "s", status: "active", sequence: 7, absence: { kind: "not-provided", reason: "x" } });

// --- (3b) invalid PATH param (bad golden id shape) → 400 ---
{
  const probe = createGoldenRecordsApplicationProbe();
  const r = handleGoldenRecordsApiRequest(
    { method: "POST", path: "/api/golden-records/NOT_A_GOLDEN_ID/classify", headers: HEADERS, body: VALID_BODY },
    probe
  );
  check("invalid_pathparam_bad_id_rejected_400", r.status === 400, { status: r.status });
  check("invalid_pathparam_logic_did_not_run", probe.applicationLogicRan === false, {});
}

// --- (3c) invalid HEADERS (missing x-golden-client) → 400 ---
{
  const probe = createGoldenRecordsApplicationProbe();
  const r = handleGoldenRecordsApiRequest(
    { method: "POST", path: PATH, headers: {}, body: VALID_BODY },
    probe
  );
  check("invalid_missing_header_rejected_400", r.status === 400, { status: r.status });
}

// --- (4) forceInvalidProviderResponse → typed boundary error (fail-closed) ---
{
  let threw = false;
  let isBoundaryErr = false;
  let boundary = null;
  try {
    handleGoldenRecordsApiRequest(
      { method: "POST", path: PATH, headers: HEADERS, body: VALID_BODY, forceInvalidProviderResponse: true }
    );
  } catch (e) {
    threw = true;
    isBoundaryErr = e instanceof GoldenRecordsContractBoundaryError;
    boundary = e.boundary;
  }
  check("forced_invalid_response_throws", threw === true, {});
  check("forced_invalid_response_is_boundary_error", isBoundaryErr === true, { boundary });
  check("forced_invalid_response_boundary_is_response", boundary === "response", { boundary });
}

// --- (5) validating client rejects an invalid network response (real ts-rest validateResponse) ---
{
  const invalidApi = async () => ({
    status: 200,
    body: {
      goldenRecordId: "bad",           // violates gr_ pattern
      accepted: true,
      normalizedTitle: "x",
      statusEcho: "draft",
      sequenceEcho: 1,
      absence: { kind: "not-provided", reason: "x" }
    },
    headers: new Headers({ "content-type": "application/json" })
  });
  const client = createGoldenRecordsClient(invalidApi);
  let rejected = false;
  try {
    await client.classifyGoldenRecord({
      params: { goldenRecordId: "gr_abc123" },
      headers: { "x-golden-client": "x" },
      body: VALID_BODY
    });
  } catch {
    rejected = true;
  }
  check("client_rejects_invalid_network_response", rejected === true, {});
}

// --- (6) positive client round-trip via real provider (default in-process fetcher) ---
{
  const client = createGoldenRecordsClient(); // default fetcher → real provider
  const r = await client.classifyGoldenRecord({
    params: { goldenRecordId: "gr_abc123" },
    headers: { "x-golden-client": "roundtrip" },
    body: VALID_BODY
  });
  check("client_positive_roundtrip_200", r.status === 200, { status: r.status, accepted: r.body?.accepted });
}

// --- summary ---
const failed = results.filter((r) => !r.pass);
console.log("\n=== ADVERSARIAL PROBE SUMMARY ===");
console.log(`total=${results.length} pass=${results.length - failed.length} fail=${failed.length}`);
console.log(JSON.stringify({ ok: failed.length === 0, total: results.length, failed: failed.map((f) => f.name) }, null, 2));
if (failed.length > 0) process.exit(1);
