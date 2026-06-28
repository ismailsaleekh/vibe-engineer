import type { ReactElement } from "react";
import { SystemStatusRoute } from "../system-status/system-status.js";

export function HomeRoute(): ReactElement {
  return (
    <main>
      <h1>Vibe Engineer Starter — Web</h1>
      <SystemStatusRoute />
    </main>
  );
}
