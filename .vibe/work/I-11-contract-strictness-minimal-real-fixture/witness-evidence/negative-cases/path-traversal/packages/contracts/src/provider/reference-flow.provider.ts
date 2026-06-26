import {
  ReferenceBoundaryRequestSchema,
  ReferenceErrorResponseSchema,
  ReferenceHeadersSchema,
  ReferencePathParamsSchema,
  ReferenceRequestBodySchema,
  ReferenceSuccessResponseSchema,
  type ReferenceErrorResponse,
  type ReferenceHeaders,
  type ReferencePathParams,
  type ReferenceRequestBody,
  type ReferenceSuccessResponse
} from "../contracts/reference-flow.contract.js";

export type ReferenceProviderResult =
  | { status: 200; body: ReferenceSuccessResponse }
  | { status: 400; body: ReferenceErrorResponse };

export class ReferenceContractBoundaryError extends Error {
  public readonly boundary: "request" | "response";

  public constructor(boundary: "request" | "response", message: string) {
    super(message);
    this.name = "ReferenceContractBoundaryError";
    this.boundary = boundary;
  }
}

export interface ReferenceApplicationProbe {
  applicationLogicRan: boolean;
}

export function createReferenceApplicationProbe(): ReferenceApplicationProbe {
  return { applicationLogicRan: false };
}

function parseReferencePath(pathValue: string): ReferencePathParams {
  const match = /^\/reference\/([^/]+)\/submit$/.exec(pathValue);
  const referenceId = match?.[1] ?? "";
  return ReferencePathParamsSchema.parse({ referenceId });
}

function validateRequest(rawRequest: unknown): { pathParams: ReferencePathParams; headers: ReferenceHeaders; body: ReferenceRequestBody; forceInvalidProviderResponse: boolean } {
  const boundaryRequest = ReferenceBoundaryRequestSchema.parse(rawRequest);
  const pathParams = parseReferencePath(boundaryRequest.path);
  const headers = ReferenceHeadersSchema.parse(boundaryRequest.headers);
  const body = ReferenceRequestBodySchema.parse(boundaryRequest.body);
  return {
    pathParams,
    headers,
    body,
    forceInvalidProviderResponse: boundaryRequest.forceInvalidProviderResponse === true
  };
}

function executeReferenceLogic(pathParams: ReferencePathParams, headers: ReferenceHeaders, body: ReferenceRequestBody, probe: ReferenceApplicationProbe): ReferenceSuccessResponse {
  probe.applicationLogicRan = true;
  const normalizedLabel = `${headers["x-reference-client"]}:${body.label.trim().toLowerCase()}`;
  return {
    referenceId: pathParams.referenceId,
    accepted: true,
    normalizedLabel,
    sequenceEcho: body.sequence,
    absence: body.absence
  };
}

function invalidResponseCandidate(): unknown {
  return {
    referenceId: "not-a-reference-id",
    accepted: true,
    normalizedLabel: "invalid",
    sequenceEcho: 1,
    absence: { kind: "not-provided", reason: "forced invalid response" }
  };
}

export function handleReferenceFlowApiRequest(rawRequest: unknown, probe: ReferenceApplicationProbe = createReferenceApplicationProbe()): ReferenceProviderResult {
  let validatedRequest: { pathParams: ReferencePathParams; headers: ReferenceHeaders; body: ReferenceRequestBody; forceInvalidProviderResponse: boolean };
  try {
    validatedRequest = validateRequest(rawRequest);
  } catch (error) {
    const rejectedBody = ReferenceErrorResponseSchema.parse({ code: "invalid_request", message: "Request failed named runtime schema validation." });
    if (error instanceof Error) {
      return { status: 400, body: rejectedBody };
    }
    return { status: 400, body: rejectedBody };
  }

  const responseCandidate = validatedRequest.forceInvalidProviderResponse
    ? invalidResponseCandidate()
    : executeReferenceLogic(validatedRequest.pathParams, validatedRequest.headers, validatedRequest.body, probe);
  const responseParse = ReferenceSuccessResponseSchema.safeParse(responseCandidate);
  if (!responseParse.success) {
    throw new ReferenceContractBoundaryError("response", "Provider attempted to expose a payload that violates ReferenceSuccessResponseSchema.");
  }
  return { status: 200, body: responseParse.data };
}
