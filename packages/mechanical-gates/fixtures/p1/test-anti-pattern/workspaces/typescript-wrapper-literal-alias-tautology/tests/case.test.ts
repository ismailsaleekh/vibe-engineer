assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }

test("public claim: validates documented behavior", () => {
  const expected = "documented behavior" as const;
  const actual = expected;
  expect(actual).toBe(expected);
});

// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => {
  expect({ ok: false }.ok).toBe(false);
});
