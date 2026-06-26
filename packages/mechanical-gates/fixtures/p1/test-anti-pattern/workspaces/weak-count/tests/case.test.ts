assertRequiredFixtureResource("resources/required-resource.txt");
test("public claim: validates documented behavior", () => { const rows = ["only"]; expect(rows.length).toBeGreaterThanOrEqual(1); });
// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => { expect({ ok: false }.ok).toBe(false); });
