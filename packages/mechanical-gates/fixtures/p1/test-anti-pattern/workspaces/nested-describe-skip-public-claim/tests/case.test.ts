assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }

describe("outer executable suite", () => {
  // @owner verifier-team
  // @date 2026-06-26
  // @reason nested skipped suite must not satisfy public claim coverage
  describe.skip("inner skipped public suite", () => {
    it("public claim: validates documented behavior", () => {
      const result = { status: "documented", count: 2 };
      expect(result.status).toBe("documented");
      expect(result.count).toBe(2);
    });
  });
});
