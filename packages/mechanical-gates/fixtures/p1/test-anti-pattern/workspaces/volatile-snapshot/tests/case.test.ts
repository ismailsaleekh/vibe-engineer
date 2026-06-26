assertRequiredFixtureResource("resources/required-resource.txt");
test("public claim: validates documented behavior", () => { const output = { id: "abc", createdAt: new Date().toISOString() }; expect(output).toMatchInlineSnapshot(`volatile`); });
// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => { expect({ ok: false }.ok).toBe(false); });
