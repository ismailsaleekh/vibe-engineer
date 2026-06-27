// @sample @demo @reference — golden-records contract fixture (I-16A / DL-14 / DL-16 / DL-20A).
//
// Canonical `ts-rest` route contract over named Zod schemas for a golden-records
// boundary. This is the SINGLE SOURCE OF TRUTH for the boundary; the generated
// shared client (../generated/golden-records-client.ts) is derived ONLY from
// this contract, the provider (golden-api fixture) validates request+response
// against these named schemas, and the consumer imports contract-derived types
// only. No duplicated Zod schema / DTO shape lives anywhere else (DL-14 §5).
//
// Mirrors the proven I-11 reference-flow contract pattern
// (packages/contracts/src/contracts/reference-flow.contract.ts), applied to the
// domain-neutral `golden-records` sample/demo module (DL-16/DL-20A). Vocabulary
// is intentionally sample/demo/reference-only: no business domain is leaked.

import { initContract, type ClientInferRequest, type ClientInferResponses } from "@ts-rest/core";
import { z } from "zod";

// --- Named Zod schemas (all `.strict()`; domain-neutral golden-record vocab) ---

/** Golden-record identifiers use the `gr_` prefix and six lowercase base36 characters. */
export const goldenRecordIdSchema = z
  .string()
  .regex(/^gr_[a-z0-9]{6}$/, "Golden-record identifiers use the gr_ prefix and six lowercase base36 characters.");

export const goldenRecordStatusSchema = z.enum(["draft", "active", "archived"]);

export const goldenRecordPathParamsSchema = z
  .object({
    goldenRecordId: goldenRecordIdSchema
  })
  .strict();

export const goldenRecordHeadersSchema = z
  .object({
    "x-golden-client": z.string().min(1),
    "content-type": z.string().min(1).optional()
  })
  .strict();

export const goldenRecordRequestBodySchema = z
  .object({
    title: z.string().min(1).max(48),
    summary: z.string().min(1).max(160),
    status: goldenRecordStatusSchema,
    sequence: z.number().int().min(1).max(999),
    absence: z
      .object({
        kind: z.literal("not-provided"),
        reason: z.string().min(1).max(64)
      })
      .strict()
  })
  .strict();

export const goldenRecordSuccessResponseSchema = z
  .object({
    goldenRecordId: goldenRecordIdSchema,
    accepted: z.literal(true),
    normalizedTitle: z.string().min(1).max(48),
    statusEcho: goldenRecordStatusSchema,
    sequenceEcho: z.number().int().min(1).max(999),
    absence: z
      .object({
        kind: z.literal("not-provided"),
        reason: z.string().min(1).max(64)
      })
      .strict()
  })
  .strict();

export const goldenRecordErrorResponseSchema = z
  .object({
    code: z.enum(["invalid_request", "invalid_response"]),
    message: z.string().min(1).max(160)
  })
  .strict();

/**
 * The untrusted boundary entry envelope. The request `body` is `unknown` here on
 * purpose: the provider MUST parse it against `goldenRecordRequestBodySchema`
 * before any application logic runs (DL-14 §3 fail-closed request boundary).
 */
export const goldenRecordBoundaryRequestSchema = z
  .object({
    method: z.literal("POST"),
    path: z.string().min(1),
    headers: goldenRecordHeadersSchema,
    body: z.unknown(),
    forceInvalidProviderResponse: z.boolean().optional()
  })
  .strict();

// --- ts-rest router (single source of truth; strict status codes) ---

const goldenContract = initContract();

export const GoldenRecordsContract = goldenContract.router({
  classifyGoldenRecord: {
    method: "POST",
    path: "/api/golden-records/:goldenRecordId/classify",
    pathParams: goldenRecordPathParamsSchema,
    headers: goldenRecordHeadersSchema,
    body: goldenRecordRequestBodySchema,
    responses: {
      200: goldenRecordSuccessResponseSchema,
      400: goldenRecordErrorResponseSchema
    },
    strictStatusCodes: true
  }
});

// --- Inferred TS types (no hand-authored DTOs; DL-14 §5) ---

export type GoldenRecordsClassifyRequest = ClientInferRequest<typeof GoldenRecordsContract.classifyGoldenRecord>;
export type GoldenRecordsClassifyResponse = ClientInferResponses<typeof GoldenRecordsContract.classifyGoldenRecord>;
export type GoldenRecordPathParams = z.infer<typeof goldenRecordPathParamsSchema>;
export type GoldenRecordHeaders = z.infer<typeof goldenRecordHeadersSchema>;
export type GoldenRecordRequestBody = z.infer<typeof goldenRecordRequestBodySchema>;
export type GoldenRecordSuccessResponse = z.infer<typeof goldenRecordSuccessResponseSchema>;
export type GoldenRecordErrorResponse = z.infer<typeof goldenRecordErrorResponseSchema>;
export type GoldenRecordBoundaryInput = z.infer<typeof goldenRecordBoundaryRequestSchema>;
