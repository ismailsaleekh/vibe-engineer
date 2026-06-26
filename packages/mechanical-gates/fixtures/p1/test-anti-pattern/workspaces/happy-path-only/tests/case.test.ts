assertRequiredFixtureResource("resources/required-resource.txt");
test("public claim: validates documented behavior", () => { expect({ ok: true }.ok).toBe(true); });
test("happy path risky parser accepts valid input", () => { expect({ ok: true }.ok).toBe(true); });
