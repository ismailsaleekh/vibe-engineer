// @sample @demo @reference — UI-verification deterministic metadata collectors (I-17A / DL-13).
//
// Deterministic DOM/geometry/accessibility/screenshot collectors executed inside
// the REAL Playwright browser context (gated: W-RB-PLAYWRIGHT). Specialists call
// these to obtain structured inputs for their deterministic rules. Screenshot +
// DOM/tree/geometry/a11y metadata is REQUIRED for deterministic layout/a11y
// closure (DL-13: a screenshot without DOM/geometry/a11y is incomplete).

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page, Locator } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const artifactsDir = path.resolve(here, "..", "artifacts");

async function artifactPath(slug: string, ext: string): Promise<string> {
  await mkdir(artifactsDir, { recursive: true });
  return path.join(artifactsDir, `${slug}.${ext}`);
}

export interface ElementGeometry {
  testid: string;
  tag: string;
  rect: { x: number; y: number; width: number; height: number };
  clipped: boolean;
  visible: boolean;
}

/** Collect DOMRect geometry + overflow/clipping state for elements with `data-testid`. */
export async function collectGeometry(page: Page, slug: string): Promise<{
  geometry: ElementGeometry[];
  path: string;
}> {
  const geometry = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("[data-testid]"));
    return els.map((el) => {
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const clipped =
        cs.overflowX === "hidden" || cs.overflowY === "hidden"
          ? el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
          : false;
      return {
        testid: el.getAttribute("data-testid") ?? "",
        tag: el.tagName.toLowerCase(),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        clipped,
        visible: cs.display !== "none" && cs.visibility !== "hidden" && rect.width > 0 && rect.height > 0
      };
    });
  });
  const file = await artifactPath(slug, "geometry.json");
  await writeFile(file, `${JSON.stringify(geometry, null, 2)}\n`, "utf8");
  return { geometry, path: file };
}

/** Capture a deterministic PNG screenshot (DL-13: normalized, dimensions recorded). */
export async function collectScreenshot(
  page: Page,
  slug: string
): Promise<{ path: string }> {
  const file = await artifactPath(slug, "png");
  await page.screenshot({ path: file, fullPage: true, animations: "disabled", caret: "hide" });
  return { path: file };
}

/** Capture a serialized DOM snapshot of declared regions. */
export async function collectDom(page: Page, slug: string): Promise<{ path: string }> {
  const file = await artifactPath(slug, "dom.html");
  const content = await page.content();
  await writeFile(file, content, "utf8");
  return { path: file };
}

/** Run axe-core deterministic accessibility checks (DL-13 §"Accessibility checks"). */
export async function collectAxe(
  page: Page,
  slug: string
): Promise<{ path: string; violations: unknown }> {
  // Lazy import: @axe-core/playwright is a modeled runtime dep (gated).
  const { AxeBuilder } = await import("@axe-core/playwright");
  const results = await new AxeBuilder({ page }).analyze();
  const file = await artifactPath(slug, "a11y.json");
  await writeFile(file, `${JSON.stringify(results.violations, null, 2)}\n`, "utf8");
  return { path: file, violations: results.violations };
}

/** Deterministic overlap check between two locators via bounding-box intersection. */
export async function boxesOverlap(
  a: Locator,
  b: Locator
): Promise<boolean> {
  const [ba, bb] = await Promise.all([a.boundingBox(), b.boundingBox()]);
  if (!ba || !bb) return false;
  return !(
    ba.x + ba.width <= bb.x ||
    bb.x + bb.width <= ba.x ||
    ba.y + ba.height <= bb.y ||
    bb.y + bb.height <= ba.y
  );
}
