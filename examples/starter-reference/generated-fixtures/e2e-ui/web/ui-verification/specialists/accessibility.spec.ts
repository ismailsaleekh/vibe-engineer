// @sample @demo @reference — UI specialist: accessibility (I-17A / DL-13).
// Real-boundary (gated: W-RB-PLAYWRIGHT). axe-core deterministic checks + named
// interactive controls. Subjective review advisory only (DL-13).

import { test, expect } from "@playwright/test";
import { writeEvidence } from "../lib/evidence.js";
import { collectAxe } from "../lib/collectors.js";

test(`@ui accessibility — golden-records-default`, async ({ page }) => {
  test.skip(!test.info().project.metadata?.viewportId, "viewport matrix set via playwright projects");
  await page.goto("/#/golden-records");
  await page.getByTestId("golden-records-section").waitFor();
  const slug = `accessibility--golden-records-default--${test.info().project.metadata.viewportId}`;
  const { path, violations } = await collectAxe(page, slug);
  const axeViolations = violations as Array<{ id: string }>;
  const axeClean = axeViolations.length === 0;
  // Interactive controls (nav links) expose accessible names (text content).
  const navNamed = await page.getByRole("navigation").locator("a").evaluateAll((els) =>
    els.every((el) => (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().length > 0)
  );
  const { packet } = await writeEvidence({
    specialist: "accessibility",
    route: "/golden-records",
    state_id: "golden-records-default",
    viewport: {
      id: test.info().project.metadata.viewportId,
      width: test.info().project.use.viewport?.width ?? 0,
      height: test.info().project.use.viewport?.height ?? 0,
      device: test.info().project.metadata.device ?? null
    },
    artifacts: { a11y: path },
    results: [
      { rule_id: "axe-no-blocking-violations", passed: axeClean, blocking: true, actual: { ids: axeViolations.map((v) => v.id) }, expected: { ids: [] } },
      { rule_id: "interactive-controls-named", passed: navNamed, blocking: true, actual: { navNamed }, expected: { navNamed: true } }
    ]
  });
  expect(packet.overall.passed, `accessibility blocking failures: ${packet.overall.blocking_failures}`).toBe(true);
});
