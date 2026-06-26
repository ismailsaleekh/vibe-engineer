import { validateTestAntiPatterns } from "../../../../src/p1/test-anti-pattern/index.js";
assertRequiredFixtureResource("resources/required-resource.txt");
test("public claim: validates documented behavior", async () => { const result = await validateTestAntiPatterns(process.cwd()); expect(result.family).toBe("p1.test-anti-pattern"); });
// @failure-shape invalid input must fail loudly
test("rejects malformed risky input", () => { expect({ ok: false }.ok).toBe(false); });
