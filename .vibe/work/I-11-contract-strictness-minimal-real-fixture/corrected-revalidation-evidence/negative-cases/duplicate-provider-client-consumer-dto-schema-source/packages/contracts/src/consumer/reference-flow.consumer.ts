import { z } from "zod";
import { referenceFlowClient } from "../generated/reference-flow-client.js";
import { ReferenceSuccessResponseSchema, type ReferenceSuccessResponse } from "../contracts/reference-flow.contract.js";

export async function callReferenceFlowConsumer(): Promise<ReferenceSuccessResponse> {
  const response = await referenceFlowClient.submitReference({
    params: { referenceId: "ref_abc123" },
    headers: { "x-reference-client": "consumer-fixture" },
    body: {
      label: "Alpha",
      sequence: 7,
      absence: { kind: "not-provided", reason: "domain-neutral absence model" }
    }
  });

  if (response.status !== 200) {
    throw new Error(`Reference flow failed with status ${response.status}`);
  }
  return ReferenceSuccessResponseSchema.parse(response.body);
}

export const LocalDuplicatePayloadSchema = z.object({ value: z.string() });
export interface LocalPayload { value: string }
