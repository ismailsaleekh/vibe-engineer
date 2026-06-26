assertRequiredFixtureResource("resources/required-resource.txt");
test("different behavior is tested", () => { expect({ ok: true }.ok).toBe(true); });
// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => { expect({ ok: false }.ok).toBe(false); });
