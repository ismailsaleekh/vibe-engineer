import path from "node:path";

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function normalizeRelative(candidate) {
  if (typeof candidate !== "string" || candidate.length === 0)
    fail("unsafe_path", "Generated path must be a non-empty string.");
  if (path.isAbsolute(candidate))
    fail("unsafe_path", "Generated path must be relative.", { path: candidate });
  const normalized = path.posix.normalize(candidate.replaceAll(path.sep, "/"));
  if (normalized === "." || normalized.startsWith("../") || normalized === "..")
    fail("unsafe_path", "Generated path must stay inside target root.", { path: candidate });
  return normalized;
}

function patternMatches(pattern, relativePath) {
  const cleanPattern = normalizeRelative(pattern.replaceAll("*", "wildcard-token"));
  const restored = cleanPattern.replaceAll("wildcard-token", "*");
  if (restored === relativePath) return true;
  if (restored.endsWith("/**")) {
    const prefix = restored.slice(0, -3);
    return relativePath === prefix || relativePath.startsWith(`${prefix}/`);
  }
  if (restored.includes("*")) {
    const parts = restored.split("*");
    let offset = 0;
    for (const [index, part] of parts.entries()) {
      if (part === "") continue;
      const found = relativePath.indexOf(part, offset);
      if (found === -1) return false;
      if (index === 0 && found !== 0) return false;
      offset = found + part.length;
    }
    return restored.endsWith("*") || offset === relativePath.length;
  }
  return false;
}

export function assertSafeTargetPath({
  relativePath,
  targetRoot,
  touchedPathPatterns,
  forbiddenPathPatterns,
}) {
  const normalized = normalizeRelative(relativePath);
  const absolute = path.resolve(targetRoot, normalized);
  const root = path.resolve(targetRoot);
  const relFromRoot = path.relative(root, absolute);
  if (relFromRoot === "" || relFromRoot.startsWith("..") || path.isAbsolute(relFromRoot))
    fail("unsafe_path", "Generated path escapes target root.", { path: relativePath });
  if (
    !Array.isArray(touchedPathPatterns) ||
    !touchedPathPatterns.some((pattern) => patternMatches(pattern, normalized))
  ) {
    fail("unsafe_path", "Generated path is not declared by manifest touchedPathPatterns.", {
      path: normalized,
    });
  }
  if (
    Array.isArray(forbiddenPathPatterns) &&
    forbiddenPathPatterns.some((pattern) => patternMatches(pattern, normalized))
  ) {
    fail("unsafe_path", "Generated path matches forbiddenPathPatterns.", { path: normalized });
  }
  return { relativePath: normalized, absolutePath: absolute };
}

export function pathMatchesAny(relativePath, patterns) {
  const normalized = normalizeRelative(relativePath);
  return Array.isArray(patterns) && patterns.some((pattern) => patternMatches(pattern, normalized));
}
