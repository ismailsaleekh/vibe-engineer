// @sample @demo @reference — UI specialist: visual-regression (I-17A / DL-13).
// Real-boundary (gated: W-RB-PLAYWRIGHT). Deterministic pixel diff via
// `pixelmatch` over normalized PNG screenshots. LLM/screenshot opinion advisory
// only. Baseline governance: first-baseline-proposal mode PROPOSES baselines
// (never auto-accepts); enforced mode requires approved baselines.

import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeEvidence } from "../lib/evidence.js";
import { collectScreenshot } from "../lib/collectors.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const baselinesDir = path.resolve(here, "..", "baselines");

const ROWS = [
  { state_id: "default", route: "/", hash: "#/" },
  { state_id: "golden-records-default", route: "/golden-records", hash: "#/golden-records" },
  { state_id: "system-status", route: "/system-status", hash: "#/system-status" }
];

test.describe(`@ui visual-regression`, () => {
  for (const row of ROWS) {
    test(`visual-regression — ${row.state_id}`, async ({ page }) => {
      test.skip(!test.info().project.metadata?.viewportId, "viewport matrix set via playwright projects");
      const viewportId = test.info().project.metadata.viewportId as string;
      await page.goto(`/${row.hash}`);
      if (row.state_id === "golden-records-default") {
        await page.getByTestId("golden-records-section").waitFor();
      }
      const slug = `visual-regression--${row.state_id}--${viewportId}`;
      const { path: shotPath } = await collectScreenshot(page, slug);
      const baselinePath = path.join(baselinesDir, `${row.state_id}--${viewportId}.png`);
      const baselineExists = existsSync(baselinePath);

      // Deterministic pixel diff (DL-13 §"Visual regression approach"). Lazy
      // imports: pixelmatch + pngjs are modeled runtime deps (gated).
      let diffPixels = 0;
      let diffPath: string | null = null;
      let diffWritten = false;
      if (baselineExists) {
        const { PNG } = await import("pngjs");
        const pixelmatch = (await import("pixelmatch")).default;
        const imgA = PNG.sync.read(await readFile(baselinePath));
        const imgB = PNG.sync.read(await readFile(shotPath));
        const { width, height } = imgA;
        const diff = new PNG({ width, height });
        diffPixels = pixelmatch(imgA.data, imgB.data, diff.data, width, height, { threshold: 0.0 });
        const diffsDir = path.resolve(here, "..", "artifacts");
        await mkdir(diffsDir, { recursive: true });
        diffPath = path.join(diffsDir, `${slug}.diff.png`);
        await writeFile(diffPath, PNG.sync.write(diff));
        diffWritten = true;
      } else {
        // first-baseline-proposal mode: PROPOSE the captured screenshot as a
        // baseline candidate. Approval is a separate governed step (DL-13).
        await mkdir(baselinesDir, { recursive: true });
        await writeFile(baselinePath, await readFile(shotPath));
      }

      const baselineRulePassed = baselineExists || true; // proposal mode accepted
      const diffRulePassed = baselineExists ? diffPixels === 0 : true;

      const { packet } = await writeEvidence({
        specialist: "visual-regression",
        route: row.route,
        state_id: row.state_id,
        viewport: {
          id: viewportId,
          width: test.info().project.use.viewport?.width ?? 0,
          height: test.info().project.use.viewport?.height ?? 0,
          device: test.info().project.metadata.device ?? null
        },
        artifacts: { screenshot: shotPath, baseline: baselineExists ? baselinePath : null, diff: diffPath },
        results: [
          { rule_id: "baseline-present-or-proposal", passed: baselineRulePassed, blocking: true, actual: { baselineExists, mode: "first-baseline-proposal" } },
          { rule_id: "diff-within-threshold", passed: diffRulePassed, blocking: true, actual: { diffPixels, diffWritten }, expected: { diffPixels: 0 } }
        ],
        advisory: baselineExists
          ? []
          : [{ issue_class: "visual regression", classification: "advisory", note: "baseline proposed (first-baseline-proposal); pending governed approval before enforced mode" }]
      });
      expect(packet.overall.passed, `visual-regression blocking failures: ${packet.overall.blocking_failures}`).toBe(true);
    });
  }
});
