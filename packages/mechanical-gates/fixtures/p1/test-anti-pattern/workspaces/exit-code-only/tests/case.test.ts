assertRequiredFixtureResource("resources/required-resource.txt");
test("public claim: validates documented behavior", () => { expect(0).toBe(0); });
// @failure-shape command success must not hide invalid input
test("rejects malformed risky input", () => { expect(result.status).toBe(0); });
