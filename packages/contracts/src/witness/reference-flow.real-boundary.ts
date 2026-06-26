import { type ApiFetcher } from "@ts-rest/core";
import { createReferenceFlowClient } from "../generated/reference-flow-client.js";
import { createReferenceApplicationProbe, handleReferenceFlowApiRequest } from "../provider/reference-flow.provider.js";
import { callReferenceFlowConsumer } from "../consumer/reference-flow.consumer.js";

export async function runReferenceFlowRealBoundaryWitness(): Promise<{ providerAccepted: boolean; consumerAccepted: boolean; invalidRequestRejectedBeforeLogic: boolean; invalidResponseRejected: boolean; clientInvalidResponseRejected: boolean }> {
  const providerProbe = createReferenceApplicationProbe();
  const providerResponse = handleReferenceFlowApiRequest({
    method: "POST",
    path: "/reference/ref_abc123/submit",
    headers: { "x-reference-client": "provider-fixture" },
    body: { label: "Alpha", sequence: 7, absence: { kind: "not-provided", reason: "real provider boundary" } }
  }, providerProbe);

  const invalidProbe = createReferenceApplicationProbe();
  const invalidRequestResponse = handleReferenceFlowApiRequest({
    method: "POST",
    path: "/reference/ref_abc123/submit",
    headers: { "x-reference-client": "provider-fixture" },
    body: { label: "", sequence: 7, absence: { kind: "not-provided", reason: "bad" } }
  }, invalidProbe);

  let invalidResponseRejected = false;
  try {
    handleReferenceFlowApiRequest({
      method: "POST",
      path: "/reference/ref_abc123/submit",
      headers: { "x-reference-client": "provider-fixture" },
      body: { label: "Alpha", sequence: 7, absence: { kind: "not-provided", reason: "forced provider failure" } },
      forceInvalidProviderResponse: true
    });
  } catch {
    invalidResponseRejected = true;
  }

  const invalidApi: ApiFetcher = async () => ({
    status: 200,
    body: { referenceId: "bad", accepted: true, normalizedLabel: "bad", sequenceEcho: 1, absence: { kind: "not-provided", reason: "bad" } },
    headers: new Headers({ "content-type": "application/json" })
  });
  const invalidClient = createReferenceFlowClient(invalidApi);
  let clientInvalidResponseRejected = false;
  try {
    await invalidClient.submitReference({
      params: { referenceId: "ref_abc123" },
      headers: { "x-reference-client": "consumer-fixture" },
      body: { label: "Alpha", sequence: 7, absence: { kind: "not-provided", reason: "client response validation" } }
    });
  } catch {
    clientInvalidResponseRejected = true;
  }

  const consumerResponse = await callReferenceFlowConsumer();

  return {
    providerAccepted: providerProbe.applicationLogicRan && providerResponse.status === 200,
    consumerAccepted: consumerResponse.accepted === true,
    invalidRequestRejectedBeforeLogic: invalidRequestResponse.status === 400 && invalidProbe.applicationLogicRan === false,
    invalidResponseRejected,
    clientInvalidResponseRejected
  };
}
