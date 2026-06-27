// @sample @demo @reference — golden-records provider fixture (I-16A / DL-14 / DL-16).
//
// NestJS-style `ts-rest` provider handler (Nest-compatible; mirrors
// `@ts-rest/nest` semantics — request validated against the named contract
// schemas BEFORE application logic; response candidate validated against the
// declared response schema BEFORE it is exposed, fail-closed). No requirement
// to boot a live Nest app in this fixture: the handler is exercised in-process
// by the real-boundary witness against the REAL `@ts-rest/core` + `zod`.
//
// Mirrors packages/contracts/src/provider/reference-flow.provider.ts (I-11):
//  * `validateRequest` parses the untrusted `goldenRecordBoundaryRequestSchema`
//    envelope → path/headers/body. On failure it returns a typed
//    `{ status: 400, body: GoldenRecordErrorResponse }` and application logic
//    MUST NOT run (proved by `GoldenRecordsApplicationProbe`).
//  * On success it runs golden application logic (probe set) and produces a
//    response candidate.
//  * `forceInvalidProviderResponse` swaps in a deliberately-invalid candidate to
//    exercise the fail-closed response boundary.
//  * Response validation: `goldenRecordSuccessResponseSchema.safeParse(...)`. On
//    failure it THROWS a typed `GoldenRecordsContractBoundaryError("response")`
//    — a compiled-but-invalid response is NEVER trusted (DL-14 §3).

import {
  goldenRecordBoundaryRequestSchema,
  goldenRecordErrorResponseSchema,
  goldenRecordHeadersSchema,
  goldenRecordPathParamsSchema,
  goldenRecordRequestBodySchema,
  goldenRecordSuccessResponseSchema,
  type GoldenRecordErrorResponse,
  type GoldenRecordHeaders,
  type GoldenRecordPathParams,
  type GoldenRecordRequestBody,
  type GoldenRecordSuccessResponse
} from "../../../golden-contracts/src/golden-records.contract.js";

export type GoldenRecordsProviderResult =
  | { status: 200; body: GoldenRecordSuccessResponse }
  | { status: 400; body: GoldenRecordErrorResponse };

/**
 * Typed contract-boundary error. Thrown on the response boundary when a provider
 * response candidate violates `goldenRecordSuccessResponseSchema` (fail-closed,
 * DL-14 §3). Mirrors I-11 `ReferenceContractBoundaryError`.
 */
export class GoldenRecordsContractBoundaryError extends Error {
  public readonly boundary: "request" | "response";

  public constructor(boundary: "request" | "response", message: string) {
    super(message);
    this.name = "GoldenRecordsContractBoundaryError";
    this.boundary = boundary;
  }
}

/**
 * Application probe mirroring I-11 `ReferenceApplicationProbe`: set to `true`
 * only when golden application logic actually runs. Used by the witness to PROVE
 * an invalid request is rejected BEFORE application logic executes.
 */
export interface GoldenRecordsApplicationProbe {
  applicationLogicRan: boolean;
}

export function createGoldenRecordsApplicationProbe(): GoldenRecordsApplicationProbe {
  return { applicationLogicRan: false };
}

function parseGoldenPath(pathValue: string): GoldenRecordPathParams {
  const match = /^\/api\/golden-records\/([^/]+)\/classify$/.exec(pathValue);
  const goldenRecordId = match?.[1] ?? "";
  return goldenRecordPathParamsSchema.parse({ goldenRecordId });
}

interface ValidatedGoldenRequest {
  pathParams: GoldenRecordPathParams;
  headers: GoldenRecordHeaders;
  body: GoldenRecordRequestBody;
  forceInvalidProviderResponse: boolean;
}

function validateRequest(rawRequest: unknown): ValidatedGoldenRequest {
  const boundaryRequest = goldenRecordBoundaryRequestSchema.parse(rawRequest);
  const pathParams = parseGoldenPath(boundaryRequest.path);
  const headers = goldenRecordHeadersSchema.parse(boundaryRequest.headers);
  const body = goldenRecordRequestBodySchema.parse(boundaryRequest.body);
  return {
    pathParams,
    headers,
    body,
    forceInvalidProviderResponse: boundaryRequest.forceInvalidProviderResponse === true
  };
}

function executeGoldenLogic(
  pathParams: GoldenRecordPathParams,
  headers: GoldenRecordHeaders,
  body: GoldenRecordRequestBody,
  probe: GoldenRecordsApplicationProbe
): GoldenRecordSuccessResponse {
  probe.applicationLogicRan = true;
  const normalizedTitle = `${headers["x-golden-client"]}:${body.title.trim().toLowerCase()}`;
  return {
    goldenRecordId: pathParams.goldenRecordId,
    accepted: true,
    normalizedTitle,
    statusEcho: body.status,
    sequenceEcho: body.sequence,
    absence: body.absence
  };
}

/** Deliberately schema-invalid candidate (bad identifier shape) for W-NEG-RESP. */
function invalidResponseCandidate(): unknown {
  return {
    goldenRecordId: "not-a-golden-id",
    accepted: true,
    normalizedTitle: "invalid",
    statusEcho: "draft",
    sequenceEcho: 1,
    absence: { kind: "not-provided", reason: "forced invalid response" }
  };
}

/**
 * The Nest-compatible `ts-rest` handler entry. `rawRequest` is the untrusted
 * boundary envelope (`goldenRecordBoundaryRequestSchema`); `probe` proves
 * whether application logic ran (fail-closed request boundary evidence).
 */
export function handleGoldenRecordsApiRequest(
  rawRequest: unknown,
  probe: GoldenRecordsApplicationProbe = createGoldenRecordsApplicationProbe()
): GoldenRecordsProviderResult {
  let validatedRequest: ValidatedGoldenRequest;
  try {
    validatedRequest = validateRequest(rawRequest);
  } catch {
    // Request failed named runtime schema validation → typed 400; application
    // logic does NOT run (probe untouched). DL-14 §3 fail-closed request boundary.
    const rejectedBody = goldenRecordErrorResponseSchema.parse({
      code: "invalid_request",
      message: "Request failed named runtime schema validation."
    });
    return { status: 400, body: rejectedBody };
  }

  const responseCandidate = validatedRequest.forceInvalidProviderResponse
    ? invalidResponseCandidate()
    : executeGoldenLogic(validatedRequest.pathParams, validatedRequest.headers, validatedRequest.body, probe);

  // Response boundary: a compiled-but-invalid candidate is NEVER trusted.
  const responseParse = goldenRecordSuccessResponseSchema.safeParse(responseCandidate);
  if (!responseParse.success) {
    throw new GoldenRecordsContractBoundaryError(
      "response",
      "Provider attempted to expose a payload that violates goldenRecordSuccessResponseSchema."
    );
  }
  return { status: 200, body: responseParse.data };
}
