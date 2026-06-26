import { initContract } from "@ts-rest/core";
import { z } from "zod";
export const ReferenceIdentifierSchema = z.string().regex(/^ref_[a-z0-9]{6}$/, "Reference identifiers use the ref_ prefix and six lowercase base36 characters.");
export const ReferencePathParamsSchema = z.object({
    referenceId: ReferenceIdentifierSchema
}).strict();
export const ReferenceHeadersSchema = z.object({
    "x-reference-client": z.string().min(1)
}).strict();
export const ReferenceRequestBodySchema = z.object({
    label: z.string().min(1).max(48),
    sequence: z.number().int().min(1).max(999),
    absence: z.object({
        kind: z.literal("not-provided"),
        reason: z.string().min(1).max(64)
    }).strict()
}).strict();
export const ReferenceSuccessResponseSchema = z.object({
    referenceId: ReferenceIdentifierSchema,
    accepted: z.literal(true),
    normalizedLabel: z.string().min(1).max(48),
    sequenceEcho: z.number().int().min(1).max(999),
    absence: z.object({
        kind: z.literal("not-provided"),
        reason: z.string().min(1).max(64)
    }).strict()
}).strict();
export const ReferenceErrorResponseSchema = z.object({
    code: z.enum(["invalid_request", "invalid_response"]),
    message: z.string().min(1).max(160)
}).strict();
const referenceContract = initContract();
export const ReferenceFlowContract = referenceContract.router({
    submitReference: {
        method: "POST",
        path: "/reference/:referenceId/submit",
        pathParams: ReferencePathParamsSchema,
        headers: ReferenceHeadersSchema,
        body: ReferenceRequestBodySchema,
        responses: {
            200: ReferenceSuccessResponseSchema,
            400: ReferenceErrorResponseSchema
        },
        strictStatusCodes: true
    }
});
