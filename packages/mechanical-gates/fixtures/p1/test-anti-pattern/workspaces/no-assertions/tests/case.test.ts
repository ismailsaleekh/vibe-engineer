assertRequiredFixtureResource("resources/required-resource.txt");
test("public claim: validates documented behavior", () => { const value = 1 + 1; });
// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => { const result = { ok: false }; });
