#!/usr/bin/env node
// Generated-starter visual baseline proof.
//
// Runs the generated web starter through Vite, captures a viewport matrix with
// Playwright, writes baseline screenshots, immediately re-captures them, and
// pixel-compares the verification pass against the baseline. This is a local
// explicit proof and is intentionally not part of default generated-starter CI.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";

import { chromium } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const VIEWPORTS = Object.freeze([
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
]);

class ProofFailure extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = "ProofFailure";
    this.code = code;
    this.detail = detail;
  }
}

function parseArgs(argv) {
  const parsed = {
    projectRoot: process.cwd(),
    out: path.join(process.cwd(), ".vibe", "release", "live-proofs", "visual-baseline"),
    unknown: [],
  };
  const flags = new Map([
    ["--project-root", "projectRoot"],
    ["--out", "out"],
  ]);
  const tokens = argv.slice(2);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const eq = token.startsWith("--") ? token.indexOf("=") : -1;
    if (eq > 2) {
      const name = token.slice(0, eq);
      if (flags.has(name)) {
        parsed[flags.get(name)] = token.slice(eq + 1);
        continue;
      }
      parsed.unknown.push(token);
      continue;
    }
    if (flags.has(token)) {
      const value = tokens[i + 1];
      if (value === undefined) {
        parsed.unknown.push(token);
        continue;
      }
      parsed[flags.get(token)] = value;
      i += 1;
      continue;
    }
    parsed.unknown.push(token);
  }
  return parsed;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertCondition(condition, code, message, detail = {}) {
  if (!condition) throw new ProofFailure(code, message, detail);
}

async function sha256(filePath) {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

async function choosePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") resolve(address.port);
        else reject(new Error("failed to allocate local port"));
      });
    });
  });
}

function requestStatus(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", () => resolve(0));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(0);
    });
  });
}

async function waitForHttp(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await requestStatus(url);
    if (status >= 200 && status < 500) return status;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new ProofFailure("VISUAL_SERVER_NOT_READY", "web dev server did not become reachable", {
    url,
    timeoutMs,
  });
}

function spawnWebServer(projectRoot, port, logDir) {
  const child = spawn("pnpm", ["exec", "vite", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: path.join(projectRoot, "apps", "web"),
    env: { ...process.env, NODE_PATH: undefined, NODE_OPTIONS: undefined },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });
  const flush = async () => {
    await writeFile(path.join(logDir, "vite.stdout.txt"), stdout, "utf8");
    await writeFile(path.join(logDir, "vite.stderr.txt"), stderr, "utf8");
  };
  const waitForExit = (timeoutMs) =>
    new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve();
        return;
      }
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      child.once("exit", finish);
      setTimeout(finish, timeoutMs);
    });
  return { child, flush, waitForExit };
}

async function capture(page, url, viewport, filePath) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(url, { waitUntil: "networkidle" });
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const visibleText = (body.innerText || "").trim();
    const overflowingElements = Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === "string" ? element.className : "",
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      })
      .filter((entry) => entry.right > window.innerWidth + 1 || entry.left < -1)
      .slice(0, 20);
    return {
      title: document.title,
      bodyTextLength: visibleText.length,
      bodyTextSample: visibleText.slice(0, 200),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      horizontalOverflow: doc.scrollWidth > doc.clientWidth + 1,
      overflowingElements,
    };
  });
  assertCondition(
    metrics.bodyTextLength > 0,
    "VISUAL_EMPTY_PAGE",
    "rendered page has no visible text",
    { viewport, metrics },
  );
  assertCondition(
    metrics.horizontalOverflow === false,
    "VISUAL_HORIZONTAL_OVERFLOW",
    "rendered page has horizontal overflow",
    { viewport, metrics },
  );
  assertCondition(
    metrics.overflowingElements.length === 0,
    "VISUAL_ELEMENT_OVERFLOW",
    "rendered elements overflow the viewport horizontally",
    { viewport, metrics },
  );
  await page.screenshot({ path: filePath, fullPage: true, animations: "disabled" });
  return metrics;
}

function comparePngs(baselineBuffer, verificationBuffer) {
  const baseline = PNG.sync.read(baselineBuffer);
  const verification = PNG.sync.read(verificationBuffer);
  assertCondition(
    baseline.width === verification.width && baseline.height === verification.height,
    "VISUAL_SCREENSHOT_SIZE_DRIFT",
    "baseline and verification screenshots have different dimensions",
    {
      baseline: { width: baseline.width, height: baseline.height },
      verification: { width: verification.width, height: verification.height },
    },
  );
  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const mismatchedPixels = pixelmatch(
    baseline.data,
    verification.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold: 0.1 },
  );
  const totalPixels = baseline.width * baseline.height;
  return {
    mismatchedPixels,
    totalPixels,
    mismatchRatio: totalPixels === 0 ? 1 : mismatchedPixels / totalPixels,
    diff,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.unknown.length > 0)
    throw new ProofFailure("VISUAL_BAD_ARGS", "unknown arguments", { unknown: args.unknown });
  const projectRoot = path.resolve(args.projectRoot);
  const outDir = path.resolve(args.out);
  const screenshotDir = path.join(outDir, "screenshots");
  await mkdir(screenshotDir, { recursive: true });

  const summary = {
    schemaVersion: "vibe-engineer.generated-starter-visual-baseline/v1",
    generatedAt: new Date().toISOString(),
    projectRoot,
    outDir,
    route: "/",
    viewports: [],
    failures: [],
    ok: false,
  };

  let server;
  let browser;
  try {
    assertCondition(
      await exists(path.join(projectRoot, "apps", "web", "src", "app", "app.tsx")),
      "VISUAL_WEB_APP_MISSING",
      "generated starter web app source is missing",
      { projectRoot },
    );
    assertCondition(
      await exists(path.join(projectRoot, "node_modules")),
      "VISUAL_DEPS_NOT_INSTALLED",
      "generated starter dependencies are not installed",
      { projectRoot },
    );
    const port = await choosePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    server = spawnWebServer(projectRoot, port, outDir);
    await waitForHttp(baseUrl);

    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      // Local proof environments may have system Chrome available before the
      // matching Playwright-managed browser is installed. Falling back to the
      // stable Chrome channel preserves a real browser proof instead of faking a
      // screenshot or silently downgrading to static inspection.
      browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => {
        throw error;
      });
    }
    const page = await browser.newPage();

    for (const viewport of VIEWPORTS) {
      const baselinePath = path.join(screenshotDir, `${viewport.name}.baseline.png`);
      const verificationPath = path.join(screenshotDir, `${viewport.name}.verification.png`);
      const diffPath = path.join(screenshotDir, `${viewport.name}.diff.png`);
      const baselineMetrics = await capture(page, baseUrl, viewport, baselinePath);
      const verificationMetrics = await capture(page, baseUrl, viewport, verificationPath);
      const comparison = comparePngs(
        await readFile(baselinePath),
        await readFile(verificationPath),
      );
      await writeFile(diffPath, PNG.sync.write(comparison.diff));
      assertCondition(
        comparison.mismatchRatio <= 0.001,
        "VISUAL_BASELINE_DRIFT",
        "immediate verification screenshot drifted from baseline",
        {
          viewport,
          mismatchRatio: comparison.mismatchRatio,
          mismatchedPixels: comparison.mismatchedPixels,
          totalPixels: comparison.totalPixels,
        },
      );
      summary.viewports.push({
        ...viewport,
        baselinePath,
        verificationPath,
        diffPath,
        baselineSha256: await sha256(baselinePath),
        verificationSha256: await sha256(verificationPath),
        diffSha256: await sha256(diffPath),
        baselineMetrics,
        verificationMetrics,
        comparison: {
          mismatchedPixels: comparison.mismatchedPixels,
          totalPixels: comparison.totalPixels,
          mismatchRatio: comparison.mismatchRatio,
        },
      });
    }

    summary.ok = true;
  } catch (error) {
    summary.failures.push({
      code: error instanceof ProofFailure ? error.code : "VISUAL_UNEXPECTED",
      message: String(error.message ?? error),
      detail: error instanceof ProofFailure ? error.detail : { error: String(error) },
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) {
      const killServerGroup = (signal) => {
        try {
          process.kill(-server.child.pid, signal);
        } catch {
          /* process group already gone */
        }
        try {
          server.child.kill(signal);
        } catch {
          /* child already gone */
        }
      };
      killServerGroup("SIGTERM");
      await server.waitForExit(1500);
      killServerGroup("SIGKILL");
      await server.waitForExit(1000);
      await server.flush().catch(() => {});
    }
    await writeFile(
      path.join(outDir, "summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8",
    );
  }

  if (!summary.ok) {
    process.stderr.write(`${JSON.stringify(summary.failures, null, 2)}\n`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
