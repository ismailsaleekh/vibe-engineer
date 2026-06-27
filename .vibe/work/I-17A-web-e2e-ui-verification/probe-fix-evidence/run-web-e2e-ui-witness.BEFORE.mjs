// @sample @demo @reference — I-17A web E2E + UI-verification REAL-BOUNDARY witness
// (W-RB-PLAYWRIGHT). Owns truth-green. Also emits W-INVARIANTS (dirty-tree scope).
//
// QUALITY BAR: shape-green is NOT truth-green. This runner runs the REAL Playwright
// suite against the REAL served golden-web React/Vite app. jsdom/happy-dom/
// page.evaluate-only/mocked-HTTP/synthetic-screenshot variants prove shape only
// and are NEVER recorded as truth-green here.
//
// Expected first-run outcome: STOP-BLOCKED (brief §STOP condition 1). The pinned
// deps react/react-dom/vite/@playwright/test (+ @axe-core/playwright, pixelmatch,
// pngjs for the specialists) are ABSENT from the entire repo and no in-repo
// resolve-hook anchor context exists (verified). The canonical fix is a serialized
// EXTEND dep handoff (root manifest + pnpm-lock.yaml reconcile, I-20S-class) +
// Playwright browser-binary availability (`playwright install`). On STOP-BLOCKED
// the runner performs ZERO out-of-license edits and records the exact ruling
// needed; it does NOT improvise (no install, no lockfile edit, no fake browser).

import { createRequire } from "node:module";
import { spawnSync, spawn } from "node:child_process";
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)); // e2e-ui/web
const repoRoot = path.resolve(here, "../../../../..");
const workRoot = path.join(repoRoot, ".vibe/work/I-17A-web-e2e-ui-verification");
const evidenceRoot = path.join(workRoot, "evidence");
const requireFromRepo = createRequire(path.join(repoRoot, "__i17a-witness-anchor.js"));

// Pinned deps required for a REAL truth-green run (brief §3 + DL-13).
const REQUIRED_DEPS = {
  runtime: {
    react: "19.1.0",
    "react-dom": "19.1.0"
  },
  tooling: {
    vite: "7.1.0",
    "@playwright/test": "1.54.0",
    "@axe-core/playwright": "4.10.2",
    pixelmatch: "7.1.0",
    pngjs: "7.0.0"
  }
};

function depStatus() {
  const all = { ...REQUIRED_DEPS.runtime, ...REQUIRED_DEPS.tooling };
  const resolved = {};
  const missing = [];
  for (const [spec, pinned] of Object.entries(all)) {
    try {
      const pkgPath = requireFromRepo.resolve(`${spec}/package.json`);
      const pkg = JSON.parse(readFileSyncSafe(pkgPath));
      resolved[spec] = { resolved: true, version: pkg.version, pinned, matches: pkg.version === pinned };
    } catch {
      resolved[spec] = { resolved: false, pinned };
      missing.push({ spec, pinned });
    }
  }
  return { resolved, missing };
}

function readFileSyncSafe(p) {
  // readFile promise wrapper for require.resolve paths.
  // (sync read to keep this branch simple; files are tiny.)
  const fs = requireNodeFs();
  return fs.readFileSync(p, "utf8");
}
function requireNodeFs() {
  return createRequire(import.meta.url)("node:fs");
}

async function writeBlocked(result) {
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(
    path.join(evidenceRoot, "web-e2e-ui-witness-result.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8"
  );
}

function runInvariants() {
  // W-INVARIANTS — dirty-tree scope: only owned paths attributable to this lane.
  const failures = [];
  const status = spawnSync("git", ["status", "--porcelain"], { cwd: repoRoot, encoding: "utf8" });
  const lines = (status.stdout || "").split("\n").filter(Boolean);
  const ownedPrefixes = [
    "examples/starter-reference/generated-fixtures/golden-web/",
    "examples/starter-reference/generated-fixtures/e2e-ui/web/",
    ".vibe/work/I-17A-web-e2e-ui-verification/",
  ];
  const owned = [];
  const baseline = [];
  for (const line of lines) {
    const p = line.slice(3);
    // Owned if `p` is within an owned tree OR `p` is an ancestor of an owned
    // tree (git collapses entirely-new untracked dirs to their first component,
    // e.g. `generated-fixtures/e2e-ui/` for the owned `e2e-ui/web/**`).
    const isOwned = ownedPrefixes.some((pre) => p.startsWith(pre) || pre.startsWith(p));
    if (isOwned) owned.push(p);
    else baseline.push(p);
  }
  const serializedRe = /(^|\/)(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|turbo\.json|tsconfig(\.base)?\.json)$|^\.github\/|^packages\/(contracts|presets|adapters|mechanical-gates|skills|cli)\//;
  const serializedOwned = owned.filter((p) => serializedRe.test(p));
  if (serializedOwned.length > 0) failures.push({ kind: "serialized-surface-edited", hits: serializedOwned });
  // Sibling fixtures read-only + I-17B mobile paths untouched.
  const siblings = ["golden-client", "golden-flow", "golden-api", "golden-contracts"];
  for (const s of siblings) {
    if (!existsSync(path.join(repoRoot, `examples/starter-reference/generated-fixtures/${s}`))) {
      failures.push({ kind: "sibling-missing", sibling: s });
    }
  }
  const mobileUntouched = !owned.some((p) => p.includes("golden-mobile/") || p.includes("e2e-ui/mobile/"));
  if (!mobileUntouched) failures.push({ kind: "mobile-path-touched" });
  return { ownedCount: owned.length, baselineCount: baseline.length, failures };
}

async function attemptRealRun() {
  // If ALL required deps resolve, run the real served-app + Playwright suite.
  const { bin, ok } = resolvePlaywrightBin();
  if (!ok) throw new Error("playwright bin not resolvable");
  const pwConfig = path.join(here, "playwright.config.ts");
  // webServer in the config spawns the dev server via start-dev-server.mjs.
  const result = spawnSync(process.execPath, [bin, "test", "--config", pwConfig], {
    cwd: here,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024
  });
  return { status: result.status, stdout: (result.stdout || "").slice(-4000), stderr: (result.stderr || "").slice(-4000) };
}

function resolvePlaywrightBin() {
  try {
    const pwPkg = requireFromRepo.resolve("@playwright/test/package.json");
    const candidate = path.join(path.dirname(pwPkg), "cli.js");
    if (existsSync(candidate)) return { bin: candidate, ok: true };
  } catch {
    /* fall through */
  }
  return { bin: null, ok: false };
}

async function main() {
  const invariants = runInvariants();
  const { resolved, missing } = depStatus();

  if (missing.length > 0) {
    // STOP-BLOCKED (brief §STOP condition 1). Zero out-of-license edits.
    const result = {
      lane: "I-17A-web-e2e-ui-verification",
      ok: false,
      blocked: true,
      blockedKind: "W-RB-PLAYWRIGHT-missing-deps",
      verdict: "BLOCKED",
      missingPinnedDeps: missing,
      prerequisite1: {
        kind: "serialized-EXTEND-dep-handoff",
        class: "I-20S-class (root manifest + pnpm-lock.yaml reconcile)",
        scope: "add react@19.1.0, react-dom@19.1.0, vite@7.1.0, @playwright/test@1.54.0, @axe-core/playwright@4.10.2, pixelmatch@7.1.0, pngjs@7.0.0 to a workspace manifest + reconcile the root pnpm-lock.yaml",
        authorization: "operator-authorized (autonomous for this recurring dep class)",
        note: "fixtures remain graph-neutral (NOT pnpm workspace members); the EXTEND installs the real deps into the repo so the served-app harness + Playwright resolve them"
      },
      prerequisite2: {
        kind: "playwright-browser-binary-availability",
        command: "playwright install",
        otherwise: "pending-live/BLOCKED (analogous to DL-12 device/simulator pending-live/BLOCKED)"
      },
      resolveHookAnchorNote: "No in-repo resolve-hook anchor context exists for react/react-dom/vite/@playwright/test (contrast I-16B which anchored @ts-rest/core+zod at packages/contracts). @ts-rest/core+zod ARE resolvable from packages/contracts and are bound into the served bundle via golden-web/vite.config.ts resolve.alias (mirrors the I-16B dep-resolver discipline).",
      fakeGreenPolicy: "no jsdom/happy-dom/page.evaluate-only/mocked-HTTP/synthetic-screenshot variant recorded as truth-green",
      depStatus: resolved,
      invariants,
      stages: [
        "in-license deterministic scope (shape-green) authored + validated via run-structural-validate.mjs + run-domain-neutral-check.mjs",
        "real-boundary W-RB-PLAYWRIGHT STOP-BLOCKED on missing react/react-dom/vite/@playwright/test (+ @axe-core/playwright/pixelmatch/pngjs)"
      ]
    };
    await writeBlocked(result);
    console.log("=== I-17A W-RB-PLAYWRIGHT: STOP-BLOCKED (missing pinned deps; EXTEND handoff + browser availability required) ===");
    console.log(`Missing (${missing.length}): ${missing.map((m) => `${m.spec}@${m.pinned}`).join(", ")}`);
    console.log(`Evidence: ${path.join(evidenceRoot, "web-e2e-ui-witness-result.json")}`);
    process.exit(1);
  }

  // Deps present: run the REAL suite for truth-green.
  console.log("[stage] all required deps resolved — running REAL Playwright suite against the served golden-web app");
  let run;
  try {
    run = await attemptRealRun();
  } catch (e) {
    const result = {
      lane: "I-17A-web-e2e-ui-verification",
      ok: false,
      blocked: true,
      blockedKind: "real-run-launch-failed",
      error: e.message,
      invariants
    };
    await writeBlocked(result);
    console.error("real run launch failed:", e.message);
    process.exit(1);
  }

  const ok = run.status === 0;
  const result = {
    lane: "I-17A-web-e2e-ui-verification",
    ok,
    blocked: !ok,
    verdict: ok ? "DONE" : "FAIL",
    depStatus: resolved,
    run: { status: run.status, tail: run.stdout.slice(-2000) },
    invariants
  };
  await writeBlocked(result);
  console.log(`=== I-17A W-RB-PLAYWRIGHT: ${ok ? "PASS (truth-green)" : "FAIL"} (playwright exit ${run.status}) ===`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("witness runner FATAL:", e);
  process.exit(2);
});
