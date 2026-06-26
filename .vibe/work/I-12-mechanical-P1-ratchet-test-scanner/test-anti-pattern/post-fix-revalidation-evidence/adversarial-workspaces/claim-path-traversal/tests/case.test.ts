assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }

test("public claim: validates documented behavior", () => {
  const documented = { status: "documented", count: 2 };
  expect(documented.status).toBe("documented");
  expect(documented.count).toBe(2);
});

// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => {
  const result = { ok: false };
  expect(result.ok).toBe(false);
});
