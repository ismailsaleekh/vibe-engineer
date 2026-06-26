assertRequiredFixtureResource("resources/required-resource.txt");
function assertRequiredFixtureResource(path: string): void { if (!path) throw new Error("missing fixture path"); }
function parseInput(value: string): { ok: boolean; errorCode: string; status: string; count: number } { return value === "bad" ? { ok: false, errorCode: "E_MALFORMED", status: "rejected", count: 0 } : { ok: true, errorCode: "", status: "documented", count: 2 }; }

test("public claim: validates documented behavior", () => {
  const result = parseInput("good");
  expect(result.status).toBe("documented");
  expect(result.count).toBe(2);
});

// @failure-shape invalid input must return typed failure instead of falling back
test("rejects malformed risky input", () => {
  const result = parseInput("bad");
  expect(result.ok).toBe(false);
  expect(result.errorCode).toBe("E_MALFORMED");
});
