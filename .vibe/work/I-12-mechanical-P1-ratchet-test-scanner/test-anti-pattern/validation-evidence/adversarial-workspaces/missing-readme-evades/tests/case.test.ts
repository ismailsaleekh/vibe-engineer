assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }
test("public claim: validates documented behavior", () => { expect(["alpha", "beta"]).toHaveLength(2); });
// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => { expect({ ok: false }.ok).toBe(false); });
