// @sample @demo @reference — golden-web home route (I-17A / DL-16).
//
// Mirrors the I-15B `.source-template/apps/web/src/routes/home/home.tsx`. The
// shell-level home content lives in `app.tsx`; this route renders the
// golden-web landing summary + system-status slot. Domain-neutral
// sample/demo/reference vocabulary only (DL-20A).

import { SystemStatusRoute } from "../system-status/system-status.js";
import { type JSX } from "react";

export function HomeRoute(): JSX.Element {
  return (
    <section aria-label="Golden web home (sample/demo/reference)" data-testid="home-section">
      <p>
        Golden web renders REAL classified golden records via the shared client (sample/demo/reference).
      </p>
      <SystemStatusRoute />
    </section>
  );
}
