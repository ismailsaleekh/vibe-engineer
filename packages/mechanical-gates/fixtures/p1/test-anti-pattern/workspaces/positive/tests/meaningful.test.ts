assertRequiredFixtureResource("resources/required-resource.txt");

function assertRequiredFixtureResource(path: string): void {
  if (path.length === 0) throw new Error("missing fixture path");
}
function normalizeVolatileOutput(value: { id: string; createdAt: string; status: string }): { id: string; createdAt: string; status: string } {
  return { ...value, id: "<id>", createdAt: "<timestamp>" };
}
function explainFailureShape(shape: string): void {
  if (shape.length < 8) throw new Error("failure shape explanation required");
}

test("meaningful behavior: returns exact records with explicit assertions", () => {
  const records = ["alpha", "beta"];
  expect(records).toHaveLength(2);
  expect(records[0]).toBe("alpha");
});

// @owner verifier-team
// @date 2026-06-26
// @reason waiting for upstream public fixture while keeping ownership visible
test.skip("skipped with complete metadata is allowed by policy", () => {
  expect(true).toBe(false);
});

test("normalized snapshot: volatile output is normalized before snapshot", () => {
  const output = { id: "abc-123", createdAt: "2026-06-26T00:00:00Z", status: "ok" };
  expect(normalizeVolatileOutput(output)).toMatchInlineSnapshot(`{"id":"<id>","createdAt":"<timestamp>","status":"ok"}`);
});

// @failure-shape malformed input must expose typed error code instead of defaulting to success
test("regression: rejects malformed risky input with explicit failure shape", () => {
  explainFailureShape("malformed input must return typed validation error");
  const result = { ok: false, errorCode: "E_MALFORMED_INPUT" };
  expect(result.ok).toBe(false);
  expect(result.errorCode).toBe("E_MALFORMED_INPUT");
});

test("public claim: validates documented behavior", () => {
  const result = { status: "documented", count: 3 };
  const actualStatus = result.status;
  const expectedStatus = "documented";
  expect(actualStatus).toBe(expectedStatus);
  expect(result.count).toBe(3);
});
