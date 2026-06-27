// @sample @demo @reference — UI specialist: responsive-layout (I-17A / DL-13 §10.2).
// Real-boundary (gated: W-RB-PLAYWRIGHT). Cross-viewport deterministic rules.
// This specialist runs in EVERY viewport project (W-VIEWPORT-MATRIX): it proves
// the configured matrix is actually exercised and responsive regressions between
// viewports are caught.

import { test, expect } from "@playwright/test";
import { writeEvidence } from "../lib/evidence.js";

const ESSENTIAL = ["nav-golden-records", "golden-records-section"];

test(`@ui responsive-layout — golden-records-default`, async ({ page }) => {
  test.skip(!test.info().project.metadata?.viewportId, "viewport matrix set via playwright projects");
  await page.goto("/#/golden-records");
  await page.getByTestId("golden-records-section").waitFor();
  const viewport = test.info().project.use.viewport!;
  const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const present = await Promise.all(ESSENTIAL.map(async (t) => page.getByTestId(t).isVisible()));
  const noOverflow = docWidth <= viewport.width;
  const essentialsPresent = present.every(Boolean);
  const { packet } = await writeEvidence({
    specialist: "responsive-layout",
    route: "/golden-records",
    state_id: "golden-records-default",
    viewport: {
      id: test.info().project.metadata.viewportId,
      width: viewport.width,
      height: viewport.height,
      device: test.info().project.metadata.device ?? null
    },
    results: [
      { rule_id: "no-viewport-overflow", passed: noOverflow, blocking: true, actual: { docWidth }, expected: { maxWidth: viewport.width } },
      { rule_id: "essential-elements-present", passed: essentialsPresent, blocking: true, actual: { present: Object.fromEntries(ESSENTIAL.map((t, i) => [t, present[i]])) } }
    ]
  });
  expect(packet.overall.passed, `responsive-layout blocking failures: ${packet.overall.blocking_failures}`).toBe(true);
});
