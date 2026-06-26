function loadOptionalFixtureResource(): string | undefined { return undefined; }
test("public claim: validates documented behavior", () => { const value = loadOptionalFixtureResource() || "default"; expect(value).toBe("default"); });
// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => { expect({ ok: false }.ok).toBe(false); });
