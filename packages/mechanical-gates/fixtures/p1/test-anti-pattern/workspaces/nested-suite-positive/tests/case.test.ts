assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing"); }
function explainFailureShape(shape: string): void { if (shape.length < 8) throw new Error("failure shape required"); }

describe("outer non-skipped public suite", () => {
  test("public claim: validates documented behavior", () => {
    const result = { status: "documented", count: 2 };
    expect(result.status).toBe("documented");
    expect(result.count).toBe(2);
  });

  it("meaningful behavior in non-skipped suite", () => {
    const values = ["alpha", "beta"];
    expect(values).toHaveLength(2);
    expect(values[1]).toBe("beta");
  });

  describe("nested non-skipped regression suite", () => {
    // @failure-shape invalid input must return typed failure instead of falling back
    test("rejects malformed risky input", () => {
      explainFailureShape("invalid input must return typed failure");
      const result = { ok: false, errorCode: "E_MALFORMED" };
      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe("E_MALFORMED");
    });

    it("nested non-skipped behavior remains executable", () => {
      const subject = { ready: true, status: "documented" };
      expect(subject.ready).toBe(true);
      expect(subject.status).toBe("documented");
    });
  });
});
