// @sample @demo @reference — UI specialist: truncation (I-17A / DL-13 §10.2).
// Real-boundary (gated: W-RB-PLAYWRIGHT). Deterministic scroll/overflow rule.

import { test, expect } from "@playwright/test";
import { writeEvidence } from "../lib/evidence.js";

test(`@ui truncation — golden-records-default`, async ({ page }) => {
  test.skip(!test.info().project.metadata?.viewportId, "viewport matrix set via playwright projects");
  await page.goto("/#/golden-records");
  await page.getByTestId("golden-record-card").waitFor();
  // Deterministic: every text node inside the card must fit (scrollWidth within
  // clientWidth, no ellipsis-induced silent content loss without an allowed rule).
  const offenders = await page.getByTestId("golden-record-card").evaluate((root) => {
    const out: string[] = [];
    const walk = (node: Element): void => {
      if (node.textContent && node.textContent.trim().length > 0 && node.children.length === 0) {
        const cs = window.getComputedStyle(node);
        if (cs.textOverflow === "ellipsis" && node.scrollWidth > node.clientWidth) {
          out.push(node.textContent.trim());
        }
      }
      for (const child of Array.from(node.children)) walk(child);
    };
    walk(root);
    return out;
  });
  const { packet } = await writeEvidence({
    specialist: "truncation",
    route: "/golden-records",
    state_id: "golden-records-default",
    viewport: {
      id: test.info().project.metadata.viewportId,
      width: test.info().project.use.viewport?.width ?? 0,
      height: test.info().project.use.viewport?.height ?? 0,
      device: test.info().project.metadata.device ?? null
    },
    results: [
      { rule_id: "no-unintended-truncation", passed: offenders.length === 0, blocking: true, actual: { offenders }, expected: { offenders: [] } }
    ]
  });
  expect(packet.overall.passed, `truncation blocking failures: ${packet.overall.blocking_failures}`).toBe(true);
});
