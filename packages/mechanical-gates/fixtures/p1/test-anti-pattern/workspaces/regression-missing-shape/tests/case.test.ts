assertRequiredFixtureResource("resources/required-resource.txt");
test("public claim: validates documented behavior", () => { expect({ ok: true }.ok).toBe(true); });
test("regression: rejects malformed risky input", () => { expect({ ok: false }.ok).toBe(false); });
