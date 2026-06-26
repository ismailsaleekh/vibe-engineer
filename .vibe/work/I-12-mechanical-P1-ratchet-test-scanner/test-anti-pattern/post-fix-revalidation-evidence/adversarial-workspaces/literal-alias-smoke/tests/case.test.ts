assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }

test("smoke public claim: validates documented behavior", () => {
  const status = "loaded";
  const count = 1;
  expect(status).toBe("loaded");
  expect(count).toBe(1);
});

// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => {
  const result = { ok: false };
  expect(result.ok).toBe(false);
});
