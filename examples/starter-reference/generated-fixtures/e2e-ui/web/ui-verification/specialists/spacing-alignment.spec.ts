// @sample @demo @reference — UI specialist: spacing/alignment (I-17A / DL-13 §10.2).
// Real-boundary (gated: W-RB-PLAYWRIGHT). Deterministic computed-style rule.

import { test, expect } from "@playwright/test";
import { writeEvidence } from "../lib/evidence.js";

test(`@ui spacing-alignment — golden-records-default`, async ({ page }) => {
  test.skip(!test.info().project.metadata?.viewportId, "viewport matrix set via playwright projects");
  await page.goto("/#/golden-records");
  const card = page.getByTestId("golden-record-card");
  await card.waitFor();
  const padding = await card.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return { top: parseFloat(cs.paddingTop), right: parseFloat(cs.paddingRight), bottom: parseFloat(cs.paddingBottom), left: parseFloat(cs.paddingLeft) };
  });
  const passed = padding.top > 0 && padding.right > 0 && padding.bottom > 0 && padding.left > 0;
  const { packet } = await writeEvidence({
    specialist: "spacing-alignment",
    route: "/golden-records",
    state_id: "golden-records-default",
    viewport: {
      id: test.info().project.metadata.viewportId,
      width: test.info().project.use.viewport?.width ?? 0,
      height: test.info().project.use.viewport?.height ?? 0,
      device: test.info().project.metadata.device ?? null
    },
    results: [
      { rule_id: "card-padding-present", passed, blocking: true, actual: padding, expected: { allSides: "> 0" } }
    ]
  });
  expect(packet.overall.passed, `spacing-alignment blocking failures: ${packet.overall.blocking_failures}`).toBe(true);
});
