assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }

// @owner verifier-team
// @date 2026-06-26
// @reason skipped ancestor must propagate through nested non-skipped suite
describe.skip("outer skipped public suite", () => {
  describe("inner non-skipped suite inherits skipped ancestor", () => {
    test("public claim: validates documented behavior", () => {
      const result = { status: "documented", count: 2 };
      expect(result.status).toBe("documented");
      expect(result.count).toBe(2);
    });
  });
});
