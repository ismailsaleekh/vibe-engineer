import assert from "node:assert/strict";
import test from "node:test";
import { classifyGoldenRecordStatus } from "../src/index.js";

test("domain classifies the sample golden-record status", () => {
  assert.equal(classifyGoldenRecordStatus("draft"), "sample-demo-reference");
});
