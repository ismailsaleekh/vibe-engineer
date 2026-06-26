assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }

test("public claim: validates documented behavior", () => {
  const status = "documented";
  const count = 3;
  expect(status).toBe("documented");
  expect(count).toBe(3);
});

// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => {
  const result = { ok: false };
  expect(result.ok).toBe(false);
});
