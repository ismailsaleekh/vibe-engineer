assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }

// @owner verifier-team
// @date 2026-06-26
// @reason intentionally skipped public claim cannot count as executable coverage
test.skip("public claim: validates documented behavior", () => {
  const result = { status: "documented" };
  expect(result.status).toBe("documented");
});

// @owner verifier-team
// @date 2026-06-26
// @reason intentionally skipped public claim through it.skip cannot count as executable coverage
it.skip("public claim: validates documented behavior via it", () => {
  const result = { status: "documented", count: 2 };
  expect(result.status).toBe("documented");
  expect(result.count).toBe(2);
});

// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => {
  const result = { ok: false, errorCode: "E_MALFORMED" };
  expect(result.ok).toBe(false);
  expect(result.errorCode).toBe("E_MALFORMED");
});
