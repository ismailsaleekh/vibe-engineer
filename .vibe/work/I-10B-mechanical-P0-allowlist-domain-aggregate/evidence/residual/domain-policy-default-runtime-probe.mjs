import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const evidenceRoot = join(repoRoot, ".vibe/work/I-10B-mechanical-P0-allowlist-domain-aggregate/evidence/residual");
const workspace = join(evidenceRoot, "domain-policy-default-runtime-workspace");

await rm(workspace, { recursive: true, force: true });
await mkdir(join(workspace, "src"), { recursive: true });
await writeFile(join(workspace, "src/index.ts"), "export const leak = \"ecommerce\";\n", "utf8");
await writeFile(join(workspace, "mechanical-domain-purity.json"), `${JSON.stringify({
  version: 1,
  proofMode: "typescript-ast-string-comment-path-carriers",
  scan: { include: ["src"], maxFileBytes: 200000 },
  surfaces: [{ kind: "core", path: "src", match: "prefix" }]
}, null, 2)}\n`, "utf8");

const { validateDomainPurity } = await import(pathToFileURL(join(repoRoot, "packages/mechanical-gates/src/p0/domain-purity/index.js")));
const result = await validateDomainPurity(workspace);
const ruleIds = result.findings.map((finding) => finding.ruleId).sort();
const output = { ok: result.ok, ruleIds, evidence: result.evidence, findings: result.findings };
console.log(JSON.stringify(output, null, 2));

const hasCoreLeak = result.findings.some((finding) => finding.ruleId === "domain-purity.core-domain-leak" && finding.evidence?.term === "ecommerce");
const hasPolicySchema = result.findings.some((finding) => finding.ruleId === "domain-purity.policy-schema");
const lockedDefaults = ["ecommerce", "inventory", "Billz", "Telegram"].every((term) => result.evidence?.forbiddenTerms?.includes(term));
if (result.ok || !hasCoreLeak || hasPolicySchema || !lockedDefaults) process.exitCode = 1;
