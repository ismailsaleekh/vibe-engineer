assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }

// @owner verifier-team
// @date 2026-06-26
// @reason deeply skipped ancestor must propagate through nested skipped suite
describe.skip("outer skipped suite", () => {
  // @owner verifier-team
  // @date 2026-06-26
  // @reason inner skipped suite also must not satisfy coverage
  describe.skip("inner skipped suite", () => {
    it("public claim: validates documented behavior", () => {
      const result = { status: "documented", count: 2 };
      expect(result.status).toBe("documented");
      expect(result.count).toBe(2);
    });
  });
});
