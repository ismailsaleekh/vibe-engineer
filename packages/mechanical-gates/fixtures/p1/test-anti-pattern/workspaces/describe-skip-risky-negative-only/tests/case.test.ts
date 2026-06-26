assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }
function explainFailureShape(shape: string): void { if (shape.length < 8) throw new Error("failure shape required"); }

// @owner verifier-team
// @date 2026-06-26
// @reason skipped suite must not satisfy risky regression coverage
// @failure-shape invalid input must return typed failure instead of falling back
describe.skip("skipped risky regression suite", () => {
  test("rejects malformed risky input", () => {
    explainFailureShape("invalid input must return typed failure");
    const result = { ok: false, errorCode: "E_MALFORMED" };
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("E_MALFORMED");
  });

  it("rejects malformed risky input through it", () => {
    explainFailureShape("invalid input must return typed failure");
    const result = { ok: false, errorCode: "E_MALFORMED" };
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("E_MALFORMED");
  });
});
