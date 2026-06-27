// @sample @demo @reference — Detox spec: deterministic RN state reset + synchronized wait on the golden-records list render (I-17B / DL-12).
//
// DL-12 DETOX-REQUIRED category: this scenario needs (a) deterministic app
// state reset / seeded state and (b) precise waiting on RN state to avoid flake
// — Detox-required triggers #2 and #4. Maestro cannot provide deterministic
// state reset or RN-bridge synchronized waits, so per the DL-12 conflict policy
// this scenario MUST be Detox (it is a pure Detox-required flow with no separate
// black-box acceptance requirement, so Detox-only is correct here).
//
// Structurally valid against the real Detox API surface:
//   device.launchApp / device.reloadReactNative / device.terminateApp,
//   element(by.id(...)), waitFor(...).toBeVisible().withTimeout(...),
//   expect(element(by.id(...))).toBeVisible().
// NOT run live here — the device-driven run is pending-live/BLOCKED (see README).
//
// Selection metadata: metadata/gr-04-deterministic-state-reset.json (runner: detox).

describe("Golden records — deterministic state reset + synchronized list render", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  beforeEach(async () => {
    // Deterministic state reset per scenario (Detox-required trigger #2:
    // internal app control unavailable through black-box user actions).
    await device.reloadReactNative();
  });

  it("renders the seeded golden-record list after a synchronized RN reload", async () => {
    // Detox-required trigger #4: precise waiting on RN state to avoid flake.
    await waitFor(element(by.id("golden-record-list")))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id("golden-record-item-0"))).toBeVisible();
  });

  it("re-renders the seeded list deterministically after terminate + relaunch", async () => {
    await device.terminateApp();
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id("golden-record-list")))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id("golden-record-item-0"))).toBeVisible();
    await expect(element(by.id("golden-record-item-4"))).toBeVisible();
  });
});
