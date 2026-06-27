// @sample @demo @reference — UI specialist: overlap/clipping (I-17A / DL-13 §10.2).
// Real-boundary (gated: W-RB-PLAYWRIGHT). Deterministic geometry rules only.

import { test, expect } from "@playwright/test";
import { writeEvidence } from "../lib/evidence.js";
import { collectGeometry } from "../lib/collectors.js";

const STATES = [
  { id: "golden-records-default", hash: "#/golden-records", card: "golden-record-card" }
];

for (const state of STATES) {
  test(`@ui overlap-clipping — ${state.id} @viewport`, async ({ page }) => {
    test.skip(!test.info().project.metadata?.viewportId, "viewport matrix set via playwright projects");
    await page.goto(`/${state.hash}`);
    await page.getByTestId("golden-records-section").waitFor();
    const slug = `overlap-clipping--${state.id}--${test.info().project.metadata.viewportId}`;
    const { geometry, path } = await collectGeometry(page, slug);
    const card = geometry.find((g) => g.testid === state.card);
    const noUnintendedOverlap = geometry.every((g) => g.visible);
    const noContentClipping = geometry.every((g) => !g.clipped);
    const { packet } = await writeEvidence({
      specialist: "overlap-clipping",
      route: "/golden-records",
      state_id: state.id,
      viewport: {
        id: test.info().project.metadata.viewportId,
        width: test.info().project.use.viewport?.width ?? 0,
        height: test.info().project.use.viewport?.height ?? 0,
        device: test.info().project.metadata.device ?? null
      },
      artifacts: { geometry: path },
      results: [
        { rule_id: "no-unintended-overlap", passed: noUnintendedOverlap, blocking: true, actual: { visibleCount: geometry.filter((g) => g.visible).length } },
        { rule_id: "no-content-clipping", passed: noContentClipping, blocking: true, actual: { clipped: geometry.filter((g) => g.clipped).map((g) => g.testid) } }
      ],
      advisory: card ? [] : [{ issue_class: "overlap", classification: "advisory", note: "card not yet rendered at capture time" }]
    });
    expect(packet.overall.passed, `overlap-clipping blocking failures: ${packet.overall.blocking_failures}`).toBe(true);
  });
}
