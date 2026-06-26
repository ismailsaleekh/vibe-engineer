import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const evidenceRoot = path.dirname(fileURLToPath(import.meta.url));
const probeRoot = path.join(evidenceRoot, "absolute-path-probe-cases");
const productCaseRoot = path.join(repoRoot, "packages/mechanical-gates/fixtures/p1/quality-ratchet/cases");
const { validateQualityRatchet } = await import(pathToFileURL(path.join(repoRoot, "packages/mechanical-gates/src/p1/quality-ratchet/index.js")).href);

async function readJson(filePath) { return JSON.parse(await readFile(filePath, "utf8")); }
async function writeJson(filePath, value) { await mkdir(path.dirname(filePath), { recursive: true }); await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
async function copyCase(name) {
  const root = path.join(probeRoot, name);
  await rm(root, { recursive: true, force: true });
  await cp(path.join(productCaseRoot, "unchanged-baseline"), root, { recursive: true });
  return root;
}
async function run(root, options = {}) {
  const result = await validateQualityRatchet(root, {
    baselinePath: "baseline.json",
    findingCarrierPath: "findings.json",
    approvalPath: "approvals.json",
    surfaceFingerprintPath: "surface-fingerprint.json",
    runnerEvidencePath: "runner-evidence.json",
    ...options
  });
  return { ok: result.ok, rules: result.findings.map((finding) => finding.ruleId), artifactPaths: result.evidence.artifactPaths, runnerEvidence: result.evidence.runnerEvidence };
}

await rm(probeRoot, { recursive: true, force: true });
await mkdir(probeRoot, { recursive: true });
const cases = [];

const optionRoot = await copyCase("absolute-option-baseline");
cases.push({ name: "absolute-option-baseline", ...(await run(optionRoot, { baselinePath: path.join(optionRoot, "baseline.json") })) });

const runnerRoot = await copyCase("absolute-runner-source-file");
const runner = await readJson(path.join(runnerRoot, "runner-evidence.json"));
runner.sourceFiles = [path.join(runnerRoot, "src/sample.ts")];
await writeJson(path.join(runnerRoot, "runner-evidence.json"), runner);
cases.push({ name: "absolute-runner-source-file", ...(await run(runnerRoot)) });

const baselineRoot = await copyCase("absolute-baseline-row-source");
const baseline = await readJson(path.join(baselineRoot, "baseline.json"));
baseline.debt[0].evidence.sourcePath = path.join(baselineRoot, "src/sample.ts");
await writeJson(path.join(baselineRoot, "baseline.json"), baseline);
cases.push({ name: "absolute-baseline-row-source", ...(await run(baselineRoot)) });

const findingRoot = await copyCase("absolute-finding-source-and-path");
const findings = await readJson(path.join(findingRoot, "findings.json"));
findings.findings[0].path = path.join(findingRoot, "src/sample.ts");
findings.findings[0].identity.path = path.join(findingRoot, "src/sample.ts");
findings.findings[0].evidence.sourcePath = path.join(findingRoot, "src/sample.ts");
await writeJson(path.join(findingRoot, "findings.json"), findings);
cases.push({ name: "absolute-finding-source-and-path", ...(await run(findingRoot)) });

const approvalRoot = await copyCase("absolute-approval-evidence");
const approvals = await readJson(path.join(approvalRoot, "approvals.json"));
const approvalEvidencePath = path.join(approvalRoot, "approvals/growth.json");
await writeJson(approvalEvidencePath, { approved: true });
approvals.approvals = [{ kind: "growth", identity: (await readJson(path.join(approvalRoot, "baseline.json"))).debt[0].identity, approvedBy: "operator", reason: "absolute evidence path", evidencePath: approvalEvidencePath }];
await writeJson(path.join(approvalRoot, "approvals.json"), approvals);
cases.push({ name: "absolute-approval-evidence", ...(await run(approvalRoot)) });

const summary = { expectedPolicy: "absolute carrier/option paths should fail closed if project-relative input is mandatory", acceptedAbsolutePathCases: cases.filter((entry) => entry.ok), cases };
await writeJson(path.join(evidenceRoot, "absolute-path-probes-summary.json"), summary);
console.log(JSON.stringify(summary, null, 2));
