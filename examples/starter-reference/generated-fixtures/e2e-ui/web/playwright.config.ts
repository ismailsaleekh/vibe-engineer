// @sample @demo @reference — Playwright config (I-17A web E2E + UI verification).
// Real-boundary (gated: W-RB-PLAYWRIGHT). Drives the REAL served golden-web app.
//
// The project matrix realizes W-VIEWPORT-MATRIX: one Playwright project per DL-13
// v1 web viewport profile. Both E2E specs and `@ui` specialist specs run across
// the matrix. `webServer` spawns the real Vite dev server via the golden-web
// harness (fail-closed readiness probe).
//
// This config is loaded by Playwright only once `@playwright/test` is installed
// (serialized EXTEND dep handoff). Structural validation (run-structural-validate.mjs)
// parses it in-license as shape-green evidence.

import { defineConfig, devices } from "@playwright/test";

const WEB_BASE_URL = process.env.GOLDEN_WEB_BASE_URL ?? "http://127.0.0.1:4317/";

// DL-13 v1 default web viewport matrix (must match ui-verification/ui-verification.config.ts).
const VIEWPORTS = [
  { id: "compact", width: 390, height: 844, device: devices["Pixel 5"] },
  { id: "small", width: 360, height: 640, device: null },
  { id: "tablet", width: 768, height: 1024, device: devices["iPad 11"] ?? null },
  { id: "desktop", width: 1280, height: 720, device: null },
  { id: "wide", width: 1440, height: 900, device: null }
];

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "evidence/playwright-report.json" }]],
  use: {
    baseURL: WEB_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: process.env.GOLDEN_WEB_BASE_URL
    ? undefined
    : {
        command: "node ./start-dev-server.mjs",
        url: WEB_BASE_URL,
        timeout: 60_000,
        reuseExistingServer: true
      },
  projects: VIEWPORTS.map((v) => ({
    name: `viewport-${v.id}`,
    metadata: { viewportId: v.id, device: v.device?.name ?? null },
    use: {
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: v.device?.deviceScaleFactor,
      isMobile: !!v.device?.isMobile,
      hasTouch: !!v.device?.hasTouch
    }
  }))
});
