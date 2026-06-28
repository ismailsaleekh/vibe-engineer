import assert from "node:assert/strict";
import test from "node:test";
import { goldenRecordFixtures } from "../src/index.js";

test("testing package exposes sample golden-record fixtures", () => {
  assert.equal(goldenRecordFixtures.length, 1);
  assert.equal(goldenRecordFixtures[0]?.status, "draft");
});
