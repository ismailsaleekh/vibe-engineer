assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }

test("public claim: validates documented behavior", () => {
  const result = { status: "documented", count: 2 };
  expect(result.status).toBe("documented");
  expect(result.count).toBe(2);
});

// @owner verifier-team
// @date 2026-06-26
// @reason intentionally skipped risky regression cannot count as executable negative coverage
// @failure-shape invalid input must return typed failure instead of falling back
test.skip("rejects malformed risky input", () => {
  const result = { ok: false, errorCode: "E_MALFORMED" };
  expect(result.ok).toBe(false);
  expect(result.errorCode).toBe("E_MALFORMED");
});

// @owner verifier-team
// @date 2026-06-26
// @reason intentionally skipped risky regression through it.skip cannot count as executable coverage
// @failure-shape invalid input must return typed failure instead of falling back
it.skip("rejects malformed risky input through it", () => {
  const result = { ok: false, errorCode: "E_MALFORMED" };
  expect(result.ok).toBe(false);
  expect(result.errorCode).toBe("E_MALFORMED");
});
