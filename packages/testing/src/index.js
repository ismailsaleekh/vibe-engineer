import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function createEphemeralWorkspace(options = {}) {
  const prefix = options.prefix ?? "vibe-test-workspace-";
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  let disposed = false;
  return {
    root,
    async writeFile(relativePath, contents) {
      assertSafeRelativePath(relativePath);
      const absolute = path.join(root, relativePath);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, contents, "utf8");
      return absolute;
    },
    async dispose() {
      if (!disposed) {
        disposed = true;
        await rm(root, { recursive: true, force: true });
      }
    },
  };
}

export function assertOkResult(result, label = "validator result") {
  assertResultCarrier(result, label);
  if (!result.ok) {
    throw new Error(`${label} expected ok=true but returned ${result.findings.length} finding(s).`);
  }
  return result;
}

export function assertBlockingFinding(result, ruleId, label = "validator result") {
  assertResultCarrier(result, label);
  const finding = result.findings.find(
    (candidate) => candidate.ruleId === ruleId && candidate.blocking === true,
  );
  if (!finding) {
    throw new Error(`${label} missing blocking finding ${ruleId}.`);
  }
  return finding;
}

export function normalizeForSnapshot(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, nested) => {
      if (typeof nested === "string") {
        return nested
          .replaceAll("\\", "/")
          .replace(/\/private\/var\/folders\/[^/]+\/[^/]+\/T\//gu, "/tmp/");
      }
      return nested;
    }),
  );
}

function assertSafeRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new Error("relativePath must be a non-empty string.");
  }
  const normalized = path.posix.normalize(relativePath.split(path.sep).join("/"));
  if (
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized === ".." ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Unsafe workspace relative path: ${relativePath}`);
  }
}

function assertResultCarrier(result, label) {
  if (
    !result ||
    typeof result !== "object" ||
    typeof result.ok !== "boolean" ||
    !Array.isArray(result.findings)
  ) {
    throw new Error(`${label} is not a typed result carrier.`);
  }
}
