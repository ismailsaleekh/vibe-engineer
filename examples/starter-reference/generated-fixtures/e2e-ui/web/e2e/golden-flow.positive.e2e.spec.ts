// @sample @demo @reference — web E2E: golden-flow POSITIVE (I-17A / DL-16 §245).
// W-E2E-POSITIVE (real-boundary, gated: W-RB-PLAYWRIGHT).
//
// Drives the REAL served golden-web app (Vite dev server) through the golden
// flow with REAL Playwright + REAL selector assertions: navigate home →
// golden-records route → assert the classified record rendered via the I-16B
// shared client against the real I-16A provider. No mocks; real DOM.
//
// This spec proves truth-green ONLY when run via real Playwright against the real
// served React/Vite app. jsdom/happy-dom/mock-page variants prove shape only.

import { test, expect } from "@playwright/test";

test.describe("golden-flow E2E (positive)", () => {
  test("home renders + nav reaches golden-records + classified record renders", async ({ page }) => {
    // Home route.
    await page.goto("/#/");
    await expect(page.getByRole("heading", { name: "Vibe Engineer Starter — Golden Web" })).toBeVisible();
    await expect(page.getByTestId("home-section")).toBeVisible();

    // Navigate to golden-records (the load-bearing surface).
    await page.getByTestId("nav-golden-records").click();
    await expect(page).toHaveURL(/#\/golden-records/);
    await expect(page.getByTestId("golden-records-section")).toBeVisible();

    // The classified record rendered via the shared client against the real
    // I-16A provider (seed/classify → list → render/read).
    const card = page.getByTestId("golden-record-card");
    await card.waitFor();
    await expect(page.getByTestId("golden-record-title")).not.toBeEmpty();
    await expect(page.getByTestId("golden-record-id")).toContainText(/^gr_/);
    await expect(page.getByTestId("golden-record-accepted")).toHaveText("true");
    await expect(card).toHaveAttribute("data-golden-record-id", /^gr_[a-z0-9]{6}$/);
  });

  test("system-status route is reachable", async ({ page }) => {
    await page.goto("/#/system-status");
    await expect(page.getByTestId("system-status-section")).toBeVisible();
    await expect(page.getByTestId("system-status-text")).toBeVisible();
  });
});
