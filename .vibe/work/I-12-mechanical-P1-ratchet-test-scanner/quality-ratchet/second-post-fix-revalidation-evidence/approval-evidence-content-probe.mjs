import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = process.cwd();
const { validateQualityRatchet } = await import(pathToFileURL(path.join(REPO_ROOT, "packages/mechanical-gates/src/p1/quality-ratchet/index.js")).href);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "approval-evidence-content-case");
const SUMMARY = path.join(__dirname, "approval-evidence-content-summary.json");

function sha256(text) { return createHash("sha256").update(text.replaceAll("\r\n", "\n").replaceAll("\r", "\n")).digest("hex"); }
function surfaceFingerprint(entries) { return sha256(JSON.stringify([...entries].sort((a, b) => a.path.localeCompare(b.path)))); }
async function writeJson(relative, value) { const target = path.join(ROOT, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
async function writeText(relative, value) { const target = path.join(ROOT, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, value, "utf8"); }

await rm(ROOT, { recursive: true, force: true });
await mkdir(ROOT, { recursive: true });
const excerpt = "export function sample(value) {\n  return value + 1;\n}";
const source = `const before = true;\n\n${excerpt}\n`;
await writeText("src/sample.ts", source);
const entry = { path: "src/sample.ts", sha256: sha256(source) };
const fingerprint = surfaceFingerprint([entry]);
const identity = { tool: "example-tool", ruleId: "example.rule", path: "src/sample.ts", symbol: "sample", contentHash: sha256(excerpt), line: 3 };
const finding = { tool: identity.tool, ruleId: identity.ruleId, severity: "error", path: identity.path, message: "debt", identity, evidence: { sourcePath: identity.path, sourceExcerpt: excerpt } };
const baselineRow = { identity, message: "debt", firstSeen: "2026-06-26T00:00:00.000Z", evidence: { sourcePath: "src/sample.ts" } };
await writeJson("baseline.json", { schemaVersion: "quality-ratchet.baseline/1", family: "p1.quality-ratchet", surfaceFingerprint: fingerprint, debt: [baselineRow] });
await writeJson("previous-baseline.json", { schemaVersion: "quality-ratchet.baseline/1", family: "p1.quality-ratchet", surfaceFingerprint: fingerprint, debt: [] });
await writeJson("findings.json", { schemaVersion: "quality-ratchet.findings/1", family: "p1.quality-ratchet", surfaceFingerprint: fingerprint, sourceFingerprintPath: "surface-fingerprint.json", runnerEvidencePath: "runner-evidence.json", findings: [finding] });
await writeJson("surface-fingerprint.json", { schemaVersion: "quality-ratchet.surface-fingerprint/1", family: "p1.quality-ratchet", fingerprint, entries: [entry] });
await writeJson("runner-evidence.json", { schemaVersion: "quality-ratchet.runner-evidence/1", family: "p1.quality-ratchet", runnerId: "runner", status: "completed", command: "runner", findingCarrierPath: "findings.json", surfaceFingerprintPath: "surface-fingerprint.json", sourceFiles: ["src/sample.ts"] });
await writeJson("approvals.json", { schemaVersion: "quality-ratchet.approvals/1", family: "p1.quality-ratchet", approvals: [{ kind: "growth", identity, approvedBy: "operator", reason: "approval evidence content should be typed", evidencePath: "approvals/growth.json" }] });
await writeText("approvals/growth.json", "not-json-not-typed-evidence\n");

const result = await validateQualityRatchet(ROOT, { baselinePath: "baseline.json", previousBaselinePath: "previous-baseline.json", findingCarrierPath: "findings.json", approvalPath: "approvals.json", surfaceFingerprintPath: "surface-fingerprint.json", runnerEvidencePath: "runner-evidence.json" });
const summary = { ok: result.ok, ruleIds: result.findings.map((finding) => finding.ruleId), evidence: result.evidence, note: "Malformed approval evidence file content probe: evidencePath points at non-JSON text." };
await writeFile(SUMMARY, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
