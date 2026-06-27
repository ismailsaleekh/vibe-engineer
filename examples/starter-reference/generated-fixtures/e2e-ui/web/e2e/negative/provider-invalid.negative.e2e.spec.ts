// @sample @demo @reference — web E2E: NEGATIVE provider-invalid (I-17A / W-NEG-PROVIDER-INVALID).
// Real-boundary (gated: W-RB-PLAYWRIGHT).
//
// master §8: a provider-invalid response MUST surface as a RENDERED FAILURE
// state, never a false success. The golden-records route exposes a deterministic
// failure-state fixture (`?gr-force-invalid=1`) that drives the SAME shared
// client with an invalid body so the I-16A provider rejects with 400 → the route
// renders `golden-records-error`. This spec asserts the failure path is reached
// and the success card is NOT rendered (no false-green).

import { test, expect } from "@playwright/test";

test.describe("golden-flow E2E (negative: provider-invalid)", () => {
  test("provider-invalid response renders the failure state, not a success", async ({ page }) => {
    await page.goto("/#/golden-records?gr-force-invalid=1");
    await expect(page.getByTestId("golden-records-error")).toBeVisible();
    await expect(page.getByTestId("golden-records-error")).toContainText(/failed to load/i);
    // No false success: the success card MUST be absent on the failure path.
    await expect(page.getByTestId("golden-record-card")).toHaveCount(0);
  });
});
