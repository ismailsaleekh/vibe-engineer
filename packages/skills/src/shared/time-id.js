import crypto from "node:crypto";

export function deterministicArtifactId(prefix, parts) {
  if (typeof prefix !== "string" || prefix.length === 0) throw new TypeError("prefix is required.");
  const joined = parts.map((part) => String(part)).join("\u001f");
  const digest = crypto.createHash("sha256").update(joined).digest("hex").slice(0, 16);
  return `${prefix}-${digest}`;
}

export function requireString(value, fieldName) {
  if (typeof value !== "string" || value.length === 0)
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  return value;
}
