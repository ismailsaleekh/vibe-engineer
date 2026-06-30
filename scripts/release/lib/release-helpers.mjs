// WP-05 release helpers: shared between pack.mjs and install-smoke.mjs.
//
// Evidence-producing primitives (mirror scripts/quality discipline): every step
// writes a typed artifact + appends to a summary. No silent swallowing. Strict
// contracts; no `as any` / unvalidated boundary JSON.parse beyond the ONE place
// where we deliberately parse a packed-tarball's package.json (validated against
// the fields we assert on).

import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

// ---------- typed run helpers ----------

/** Spawn a process; capture stdout/stderr/exit; never throws on non-zero exit. */
export function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: opts.env,
      cwd: opts.cwd,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b) => {
      stdout += b.toString("utf8");
    });
    child.stderr.on("data", (b) => {
      stderr += b.toString("utf8");
    });
    child.on("error", (err) => {
      resolve({ ok: false, exitCode: -1, stdout, stderr, error: String(err) });
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, exitCode: code ?? -1, stdout, stderr, error: null });
    });
  });
}

/** Write a JSON file (deterministic, 2-space). */
export async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/** sha256 of a file's bytes. */
export async function sha256File(filePath) {
  const buf = await readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

/** Fail-closed: throw a typed AssertionFailure carrying structured detail. */
export class AssertionFailure extends Error {
  constructor(name, detail) {
    super(`RELEASE ASSERTION FAILED [${name}]: ${JSON.stringify(detail)}`);
    this.name = "AssertionFailure";
    this.assertion = name;
    this.detail = detail;
  }
}

export function assertOk(name, condition, detail) {
  if (!condition) throw new AssertionFailure(name, detail);
  return condition;
}

/** Recursive removal that tolerates missing paths. */
export async function cleanDir(dir) {
  await rm(dir, { recursive: true, force: true }).catch(() => undefined);
}
