// @sample @demo @reference — golden-web served-app wiring harness (I-17A / DL-13 / DL-16).
//
// The deterministic dev-server spawn + readiness-probe + teardown surface the
// E2E + UI-verification witnesses drive (brief §4 step 3 / W-SERVED-APP-HARNESS).
//
// It spawns the REAL Vite dev server (no mock), polls the bound base URL until
// the served app responds, returns a { baseUrl, child, teardown } handle, and
// tears down deterministically on exit. It is FAIL-CLOSED: non-ready within the
// timeout -> hard failure (no silent skip, no synthetic green).
//
// Real-boundary posture: this harness only succeeds once react/react-dom/vite
// are actually installed (W-RB-PLAYWRIGHT). If Vite cannot be resolved,
// `resolveViteBin` throws a typed error the witness runner records as
// STOP-BLOCKED (brief §STOP condition 1) — it never fabricates a served URL.
//
// Plain ESM JavaScript (no TypeScript): consumed by sibling .mjs runners.

import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const goldenWebRoot = path.resolve(here, "..");

export const SERVED_APP_READY_TIMEOUT_MS = 30_000;
export const SERVED_APP_PROBE_INTERVAL_MS = 250;

function locateRepositoryRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (existsSync(path.join(dir, "packages", "contracts", "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        "serve-golden-web: could not locate repository root (packages/contracts)."
      );
    }
    dir = parent;
  }
}

const repositoryRoot = locateRepositoryRoot(here);

/**
 * Resolve the REAL `vite` bin from the repository context. The fixture is
 * graph-neutral (NOT a workspace member), so bare `vite` resolution from the
 * fixture dir fails; anchor at the repo root node_modules like the I-16B
 * dep-resolver anchors at packages/contracts. If `vite` is not installed, this
 * throws (the caller records STOP-BLOCKED W-RB-PLAYWRIGHT — never fakes it).
 */
export function resolveViteBin() {
  const requireFromRepo = createRequire(path.join(repositoryRoot, "__golden-web-serve-anchor.js"));
  let viteBin;
  try {
    const vitePkg = requireFromRepo.resolve("vite/package.json");
    const viteDir = path.dirname(vitePkg);
    const candidate = path.join(viteDir, "bin", "vite.js");
    if (!existsSync(candidate)) {
      throw new Error(`vite bin not found at ${candidate}`);
    }
    viteBin = candidate;
  } catch (error) {
    throw new Error(
      `serve-golden-web: REAL vite could not be resolved from the repository (deps absent — react/react-dom/vite/@playwright/test not installed). STOP-BLOCKED W-RB-PLAYWRIGHT rather than mock. Cause: ${error.message}`
    );
  }
  return viteBin;
}

async function probeReady(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok || response.status === 200) {
        return;
      }
      lastError = new Error(`probe status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, SERVED_APP_PROBE_INTERVAL_MS));
  }
  throw new Error(
    `serve-golden-web: served app not ready at ${baseUrl} within ${timeoutMs}ms (fail-closed). Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * Spawn the real Vite dev server on an ephemeral port, wait until it is ready,
 * and return a deterministic handle. The caller MUST call teardown() (or use
 * withServedGoldenWeb) to stop the server.
 *
 * @returns {Promise<{baseUrl: string, child: import("node:child_process").ChildProcess, teardown: () => void}>}
 */
export async function serveGoldenWeb(timeoutMs = SERVED_APP_READY_TIMEOUT_MS) {
  const viteBin = resolveViteBin();
  const child = spawn(
    process.execPath,
    [viteBin, "--port", "0", "--strictPort", "false", "--config", path.join(goldenWebRoot, "vite.config.ts")],
    {
      cwd: goldenWebRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env }
    }
  );

  const baseUrl = await new Promise((resolve, reject) => {
    const onError = (error) => {
      child.removeListener("exit", onExit);
      reject(error);
    };
    const onExit = (code) => {
      child.removeListener("error", onError);
      reject(new Error(`serve-golden-web: vite dev server exited before ready with code ${code}`));
    };
    child.once("error", onError);
    child.once("exit", onExit);

    let buffer = "";
    const localRe = /http:\/\/127\.0\.0\.1:(\d+)/;
    const onData = (chunk) => {
      buffer += chunk.toString();
      const match = localRe.exec(buffer);
      if (match) {
        const port = Number.parseInt(match[1], 10);
        child.removeListener("error", onError);
        child.removeListener("exit", onExit);
        resolve(`http://127.0.0.1:${port}`);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
  }).catch((error) => {
    if (!child.killed) child.kill("SIGTERM");
    throw error;
  });

  await probeReady(baseUrl, timeoutMs);

  let tornDown = false;
  const teardown = () => {
    if (tornDown) return;
    tornDown = true;
    try {
      if (!child.killed) child.kill("SIGTERM");
    } catch {
      /* best-effort teardown */
    }
  };

  return { baseUrl, child, teardown };
}

/**
 * Convenience wrapper: serve, run fn(baseUrl), always teardown. Re-throws the
 * fn error after teardown.
 */
export async function withServedGoldenWeb(fn, timeoutMs = SERVED_APP_READY_TIMEOUT_MS) {
  const served = await serveGoldenWeb(timeoutMs);
  try {
    return await fn(served.baseUrl);
  } finally {
    served.teardown();
  }
}
