// @sample @demo @reference — UI specialist: color/contrast (I-17A / DL-13 §"Accessibility checks").
// Real-boundary (gated: W-RB-PLAYWRIGHT). Deterministic foreground/background
// contrast measured from computed colors (WCAG AA >= 4.5:1 for body text).

import { test, expect } from "@playwright/test";
import { writeEvidence } from "../lib/evidence.js";

function luminance(r: number, g: number, b: number): number {
  const f = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = luminance(...rgb1);
  const l2 = luminance(...rgb2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

test(`@ui color-contrast — golden-records-default`, async ({ page }) => {
  test.skip(!test.info().project.metadata?.viewportId, "viewport matrix set via playwright projects");
  await page.goto("/#/golden-records");
  await page.getByTestId("golden-record-title").waitFor();
  const ratios = await page.evaluate(() => {
    const targets = Array.from(document.querySelectorAll("h1, h2, h3, p, dd, dt, a, section[data-testid='golden-records-section']"));
    const parse = (cs: CSSStyleDeclaration): [number, number, number] => {
      const m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(cs.color);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
    };
    return targets.map((el) => {
      const cs = window.getComputedStyle(el);
      return { tag: el.tagName.toLowerCase(), ratio: contrast(parse(cs), [255, 255, 255]) };
      function contrast(a: [number, number, number], b: [number, number, number]): number {
        const lum = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        const l1 = 0.2126 * lum(a[0]) + 0.7152 * lum(a[1]) + 0.0722 * lum(a[2]);
        const l2 = 0.2126 * lum(b[0]) + 0.7152 * lum(b[1]) + 0.0722 * lum(b[2]);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }
    });
  });
  // Recompute min on the Node side for the assertion (page.evaluate returns numbers).
  const minRatio = Math.min(...ratios.map((r) => r.ratio));
  const passed = minRatio >= 4.5;
  const { packet } = await writeEvidence({
    specialist: "color-contrast",
    route: "/golden-records",
    state_id: "golden-records-default",
    viewport: {
      id: test.info().project.metadata.viewportId,
      width: test.info().project.use.viewport?.width ?? 0,
      height: test.info().project.use.viewport?.height ?? 0,
      device: test.info().project.metadata.device ?? null
    },
    results: [
      { rule_id: "wcag-aa-foreground", passed, blocking: true, actual: { minRatio: Number(minRatio.toFixed(3)) }, expected: { minRatio: 4.5 } }
    ]
  });
  expect(packet.overall.passed, `color-contrast min ratio ${minRatio.toFixed(3)} < 4.5`).toBe(true);
});
