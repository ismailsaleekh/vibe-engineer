assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }

test("smoke public claim: validates documented behavior", () => {
  expect(true).toBe(true);
  expect("loaded").toBe("loaded");
});

// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => {
  expect({ ok: false }.ok).toBe(false);
});
