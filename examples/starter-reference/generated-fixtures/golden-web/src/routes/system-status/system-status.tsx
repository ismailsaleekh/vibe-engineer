// @sample @demo @reference — golden-web system-status route (I-17A / DL-16).
//
// Mirrors the I-15B `.source-template/apps/web/src/routes/system-status/system-status.tsx`.
// Stable labeled selectors so UI-verification specialists (overlap/layout/
// contrast/a11y) and E2E can target it deterministically. Domain-neutral
// sample/demo/reference vocabulary only (DL-20A).

import { type JSX } from "react";

export function SystemStatusRoute(): JSX.Element {
  return (
    <section aria-label="System status" data-testid="system-status-section">
      <p data-testid="system-status-text">system status slot</p>
    </section>
  );
}
