import { ReferenceBoundaryRequestSchema, ReferenceErrorResponseSchema, ReferenceHeadersSchema, ReferencePathParamsSchema, ReferenceRequestBodySchema, ReferenceSuccessResponseSchema } from "../contracts/reference-flow.contract.js";
export class ReferenceContractBoundaryError extends Error {
    boundary;
    constructor(boundary, message) {
        super(message);
        this.name = "ReferenceContractBoundaryError";
        this.boundary = boundary;
    }
}
export function createReferenceApplicationProbe() {
    return { applicationLogicRan: false };
}
function parseReferencePath(pathValue) {
    const match = /^\/reference\/([^/]+)\/submit$/.exec(pathValue);
    const referenceId = match?.[1] ?? "";
    return ReferencePathParamsSchema.parse({ referenceId });
}
function validateRequest(rawRequest) {
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
function executeReferenceLogic(pathParams, headers, body, probe) {
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
function invalidResponseCandidate() {
    return {
        referenceId: "not-a-reference-id",
        accepted: true,
        normalizedLabel: "invalid",
        sequenceEcho: 1,
        absence: { kind: "not-provided", reason: "forced invalid response" }
    };
}
export function handleReferenceFlowApiRequest(rawRequest, probe = createReferenceApplicationProbe()) {
    let validatedRequest;
    try {
        validatedRequest = validateRequest(rawRequest);
    }
    catch (error) {
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
