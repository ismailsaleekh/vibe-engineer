import assert from "node:assert/strict";
import test from "node:test";
import { useGoldenRecords } from "../src/index.js";

test("api-client hook returns the starter-safe empty golden-record collection", () => {
  assert.deepEqual(useGoldenRecords(), []);
});
