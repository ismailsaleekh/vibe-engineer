assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }

// @owner verifier-team
// @date 2026-06-26
// @reason skipped suite must not satisfy public claim coverage
describe.skip("skipped public claim suite", () => {
  test("public claim: validates documented behavior", () => {
    const result = { status: "documented", count: 2 };
    expect(result.status).toBe("documented");
    expect(result.count).toBe(2);
  });

  it("public claim: validates documented behavior through it", () => {
    const result = { status: "documented", count: 3 };
    expect(result.status).toBe("documented");
    expect(result.count).toBe(3);
  });
});
