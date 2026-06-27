// @sample @demo @reference — golden-web app shell (I-17A / DL-16).
//
// The I-15B `.source-template/apps/web/src/app/app.tsx` shell renders only the
// home route (the web UI binding is "owned by I-16/I-17"). golden-web is the
// I-17A web surface, so it OWNS the web binding: it wires the home,
// golden-records, and system-status routes behind a minimal hash-based router
// (NO router dependency — keeps the EXTEND dep surface to react/react-dom/vite
// only; deterministic in-browser navigation for E2E). The golden-records route
// is reachable at `#/golden-records`, exercised by the Playwright E2E witness.
//
// Domain-neutral sample/demo/reference vocabulary only (DL-20A). No business
// domain leakage; no contract/client re-declaration (DL-14 §5).

import { useEffect, useState, type JSX } from "react";
import { HomeRoute } from "../routes/home/home.js";
import { GoldenRecordsRoute } from "../routes/golden-records/golden-records.js";
import { SystemStatusRoute } from "../routes/system-status/system-status.js";

type RouteId = "home" | "golden-records" | "system-status";

function routeFromHash(hash: string): RouteId {
  if (hash === "#/golden-records") return "golden-records";
  if (hash === "#/system-status") return "system-status";
  return "home";
}

function GoldenNav({ current }: { current: RouteId }): JSX.Element {
  const item = (id: RouteId, href: string, label: string): JSX.Element => (
    <a
      data-testid={`nav-${id}`}
      href={href}
      aria-current={current === id ? "page" : undefined}
      style={{ marginRight: "1rem" }}
    >
      {label}
    </a>
  );
  return (
    <nav aria-label="Golden web navigation (sample/demo/reference)">
      {item("home", "#/", "Home")}
      {item("golden-records", "#/golden-records", "Golden records")}
      {item("system-status", "#/system-status", "System status")}
    </nav>
  );
}

export function GoldenWebApp(): JSX.Element {
  const [route, setRoute] = useState<RouteId>(() => routeFromHash(window.location.hash));

  useEffect(() => {
    const onChange = (): void => setRoute(routeFromHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return (
    <main aria-label="Golden web app (sample/demo/reference)">
      <h1>Vibe Engineer Starter — Golden Web</h1>
      <GoldenNav current={route} />
      {route === "home" && <HomeRoute />}
      {route === "golden-records" && <GoldenRecordsRoute />}
      {route === "system-status" && <SystemStatusRoute />}
    </main>
  );
}
