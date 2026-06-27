#!/usr/bin/env node
// @sample @demo @reference — Playwright webServer bootstrap (I-17A).
//
// Spawns the REAL Vite dev server for the golden-web fixture on a fixed port
// (so Playwright's webServer `url` probe works), using the golden-web served-app
// harness resolve logic. Stays attached for the Playwright run; Playwright kills
// it on teardown. If Vite cannot be resolved (deps absent), the harness helper
// throws a typed STOP-BLOCKED error that the witness runner records honestly.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { resolveViteBin } from "../../golden-web/harness/serve-golden-web.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const goldenWebRoot = path.resolve(here, "../../golden-web");
const port = Number.parseInt(process.env.GOLDEN_WEB_PORT ?? "4317", 10);

const viteBin = resolveViteBin(); // throws STOP-BLOCKED if vite absent
const child = spawn(
  process.execPath,
  [viteBin, "--port", String(port), "--strictPort", "--config", path.join(goldenWebRoot, "vite.config.ts")],
  { cwd: goldenWebRoot, stdio: "inherit" }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
