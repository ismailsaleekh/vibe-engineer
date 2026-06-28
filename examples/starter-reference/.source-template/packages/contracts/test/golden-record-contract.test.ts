import assert from "node:assert/strict";
import test from "node:test";
import { goldenRecordSchema } from "../src/index.js";

test("contract schema validates a named golden record payload", () => {
  const parsed = goldenRecordSchema.parse({
    id: "record-1",
    title: "Reference record",
    summary: "Sample/demo/reference payload.",
    status: "draft",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(parsed.status, "draft");
});
