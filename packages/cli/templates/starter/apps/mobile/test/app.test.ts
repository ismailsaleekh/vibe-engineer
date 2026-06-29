import assert from "node:assert/strict";
import test from "node:test";

test("mobile starter declares the mobile title", () => {
  assert.match("Vibe Engineer Starter — Mobile", /Mobile/);
});
