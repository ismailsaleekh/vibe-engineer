# UI-verification visual baselines (I-17A / DL-13)

`@sample @demo @reference` — visual-regression baseline-management contract.

This directory ships the **baseline identity + approval contract**
(`baseline-manifest.contract.json`) only. It does NOT ship PNG baselines.

Per DL-13, initial baseline creation is an explicit **first-baseline-proposal**,
never an automatic pass. The actual PNG baselines are PROPOSED by the first real
Playwright run (`W-RB-PLAYWRIGHT`) once `react`/`react-dom`/`vite`/
`@playwright/test` are installed (serialized EXTEND dep handoff) and browser
binaries are available. Until then the visual-regression specialist is honestly
**`pending-live/BLOCKED`** on real capture — it is never faked with a synthetic
screenshot recorded as truth-green.

After approval, baselines live here as `<state_id>--<viewport_id>.png` and are
referenced by the visual-regression specialist + evidence packets. Updates
require before/after screenshots, diff images, numeric metrics, rationale,
reviewer/operator approval, and independent validation (DL-13). CI/normal
verification MUST NOT auto-update or auto-accept baselines.
