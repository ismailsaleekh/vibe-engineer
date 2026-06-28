// @sample @demo @reference — golden-records module (DL-16 / DL-20A).
// Test-only sample/demo/reference fixtures for the golden-records module.
// No production package may depend on this (DL-16 packages/testing boundary).
import type { GoldenRecord } from "@vibe-engineer-starter/domain";

export const goldenRecordFixtures: readonly GoldenRecord[] = Object.freeze([
  {
    id: "fixture-1",
    title: "Sample fixture record",
    summary: "Reference fixture (sample/demo).",
    status: "draft",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
]);
