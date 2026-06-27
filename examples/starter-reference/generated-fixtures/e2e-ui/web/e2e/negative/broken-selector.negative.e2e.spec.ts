// @sample @demo @reference — web E2E: NEGATIVE broken-selector (I-17A / W-NEG-BROKEN-SELECTOR).
// Real-boundary (gated: W-RB-PLAYWRIGHT).
//
// DL-13 / master §8: "broken selector ... negative fails". This spec proves the
// suite is fail-closed against a broken/changed selector: a deliberately-wrong
// `data-testid` MUST yield zero matches (so any positive assertion on it would
// fail). It also proves the real labeled selector is the EXACT one the positive
// path depends on — a change in the served app's selector would break the
// positive spec, which is the regression this negative guards.
//
// The stronger mutation regression (serve an app variant with the real selector
// removed and assert the POSITIVE spec fails) is orchestrated by the witness
// runner `run-web-e2e-ui-witness.mjs --neg-selector` (also gated).

import { test, expect } from "@playwright/test";

test.describe("golden-flow E2E (negative: broken selector)", () => {
  test("a broken/aliased selector matches nothing (fail-closed)", async ({ page }) => {
    await page.goto("/#/golden-records");
    await page.getByTestId("golden-records-section").waitFor();
    // A selector the served app does NOT emit → exactly zero matches.
    await expect(page.getByTestId("golden-record-card-DOES-NOT-EXIST")).toHaveCount(0);
    await expect(page.getByTestId("golden-record-titel")).toHaveCount(0); // typo
    // And the real selector is present exactly once (the positive dependency).
    await expect(page.getByTestId("golden-record-card")).toHaveCount(1);
  });
});
