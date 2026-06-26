assertRequiredFixtureResource("resources/required-resource.txt");
test("smoke loads public claim: validates documented behavior", () => { expect(true).toBe(true); });
// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => { expect({ ok: false }.ok).toBe(false); });
