import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const evidenceDir = fileURLToPath(new URL(".", import.meta.url));
const workspaceRoot = join(evidenceDir, "domain-policy-default-runtime-workspace");

const { validateDomainPurity } = await import(pathToFileURL(join(repoRoot, "packages/mechanical-gates/src/p0/domain-purity/index.js")).href);

await rm(workspaceRoot, { recursive: true, force: true });
await mkdir(join(workspaceRoot, "src"), { recursive: true });
await writeFile(join(workspaceRoot, "mechanical-domain-purity.json"), `${JSON.stringify({
  version: 1,
  proofMode: "typescript-ast-string-comment-path-carriers",
  scan: { include: ["src"], maxFileBytes: 200000 },
  surfaces: [{ kind: "core", path: "src", match: "prefix" }]
}, null, 2)}\n`);
await writeFile(join(workspaceRoot, "src/index.ts"), "export const leaked = 'ecommerce';\n");

const result = await validateDomainPurity(workspaceRoot, { policyPath: "mechanical-domain-purity.json" });
const ruleIds = result.findings.map((finding) => finding.ruleId);
const lockedDefaults = ["ecommerce", "inventory", "Billz", "Telegram"];
const missingLockedDefaults = lockedDefaults.filter((term) => !result.evidence?.forbiddenTerms?.includes(term));
const hasPolicySchema = ruleIds.includes("domain-purity.policy-schema");
const hasCoreLeak = ruleIds.includes("domain-purity.core-domain-leak");

if (result.ok !== false || !hasCoreLeak || hasPolicySchema || missingLockedDefaults.length > 0) {
  console.error(JSON.stringify({ ok: false, result, ruleIds, hasCoreLeak, hasPolicySchema, missingLockedDefaults }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  resultOk: result.ok,
  ruleIds,
  forbiddenTerms: result.evidence.forbiddenTerms,
  policySchemaFindingPresent: hasPolicySchema,
  coreLeakFindingPresent: hasCoreLeak,
  findings: result.findings
}, null, 2));
