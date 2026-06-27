// @sample @demo @reference — Detox spec: BOTH-mode deterministic synchronization half (I-17B / DL-12).
//
// DL-12 BOTH mode — this is the Detox half of a high-risk user-visible
// scenario (gr-03) that ALSO has a Detox-required synchronization trigger
// (RN bridge timing after a foreground/background + reload cycle). The Maestro
// half proves the end-user flow; this Detox half proves deterministic
// synchronization/state control (synchronization_control coverage intent).
// Coverage intent is SPLIT, not a duplicate shallow smoke.
//
// Structurally valid against the real Detox API surface: device.sendToBackground
// / device.launchApp / device.reloadReactNative + waitFor(...).toExist().
//
// Selection metadata: metadata/gr-03-resync-after-reload.json (runner: both).

describe("Golden records — resync after background + reload (Detox synchronization half)", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  it("re-synchronizes the golden-record list after a background → foreground → reload cycle", async () => {
    // Detox-required trigger #1: RN synchronization/bridge timing is load-bearing.
    await device.sendToBackground();
    await device.launchApp({ newInstance: false });
    await device.reloadReactNative();
    // Detox-required trigger #4: precise waiting on RN state.
    await waitFor(element(by.id("golden-record-list")))
      .toExist()
      .withTimeout(10000);
    await expect(element(by.id("golden-record-item-0"))).toExist();
    await expect(element(by.id("golden-record-item-4"))).toExist();
  });
});
