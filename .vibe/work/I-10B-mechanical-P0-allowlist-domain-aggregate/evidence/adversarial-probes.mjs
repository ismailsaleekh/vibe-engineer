import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const evidenceDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const probesRoot = join(evidenceDir, "adversarial-workspaces");

const { validateEscapeAllowlist } = await import(pathToFileURL(join(repoRoot, "packages/mechanical-gates/src/p0/allowlist/index.js")));
const { validateDomainPurity } = await import(pathToFileURL(join(repoRoot, "packages/mechanical-gates/src/p0/domain-purity/index.js")));

async function resetDir(path) {
  await rm(path, { recursive: true, force: true });
  await mkdir(path, { recursive: true });
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function makeAllowlistWorkspace(name, sourceText, policyOverrides = {}) {
  const root = join(probesRoot, name);
  await resetDir(root);
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src/index.ts"), sourceText, "utf8");
  const policy = {
    version: 1,
    proofMode: "typescript-ast-and-comment-scanner",
    scan: { include: ["src"], generatedVendor: ["generated", "vendor", "node_modules"], maxFileBytes: 200000 },
    hardBannedEscapes: ["as-any"],
    entries: [],
    ...policyOverrides
  };
  if (policyOverrides.__omitPolicy !== true) await writeJson(join(root, "mechanical-escape-allowlist.json"), policy);
  return root;
}

async function makeDomainWorkspace(name, sourceText, policyOverrides = {}) {
  const root = join(probesRoot, name);
  await resetDir(root);
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src/index.ts"), sourceText, "utf8");
  const policy = {
    version: 1,
    proofMode: "typescript-ast-string-comment-path-carriers",
    scan: { include: ["src"], maxFileBytes: 200000 },
    forbiddenTerms: ["ecommerce", "inventory", "Billz", "Telegram"],
    surfaces: [{ kind: "core", path: "src", match: "prefix" }],
    ...policyOverrides
  };
  if (policyOverrides.__omitPolicy !== true) await writeJson(join(root, "mechanical-domain-purity.json"), policy);
  return root;
}

function ruleIds(result) {
  return result.findings.map((finding) => finding.ruleId).sort();
}

function hasAny(result, expectedRuleIds) {
  const actual = new Set(ruleIds(result));
  return expectedRuleIds.some((ruleId) => actual.has(ruleId));
}

const probes = [];
async function record(name, expectedOk, run, expectedRuleIds = []) {
  try {
    const result = await run();
    const actualRuleIds = ruleIds(result);
    const matched = result.ok === expectedOk && (expectedOk || hasAny(result, expectedRuleIds));
    probes.push({ name, expectedOk, actualOk: result.ok, expectedRuleIds, actualRuleIds, matched, findings: result.findings });
  } catch (error) {
    probes.push({ name, expectedOk, threw: true, matched: false, error: error instanceof Error ? error.message : String(error) });
  }
}

await resetDir(probesRoot);

await record(
  "allowlist rejects broad as unknown not narrowed by same named runtime schema",
  false,
  async () => validateEscapeAllowlist(await makeAllowlistWorkspace("as-unknown-unrelated-validate", `declare const input: string;\nconst payload = input as unknown;\nvalidateOtherThing(\"not the payload\");\nfunction validateOtherThing(value: string): string { return value; }\n`)),
  ["allowlist.unallowlisted-escape"]
);

await record(
  "allowlist permits immediate named runtime schema narrowing of as unknown",
  true,
  async () => validateEscapeAllowlist(await makeAllowlistWorkspace("as-unknown-schema-narrowed", `declare const input: string;\nconst parsed = PayloadSchema.parse(input as unknown);\nconst PayloadSchema = { parse(value: unknown): unknown { return value; } };\n`))
);

await record(
  "allowlist rejects unallowlisted non-null assertion",
  false,
  async () => validateEscapeAllowlist(await makeAllowlistWorkspace("non-null-unallowlisted", `const value: string | undefined = \"x\";\nexport const leaked = value!;\n`)),
  ["allowlist.unallowlisted-escape"]
);

await record(
  "allowlist rejects broad Function/Object/empty-object model types",
  false,
  async () => validateEscapeAllowlist(await makeAllowlistWorkspace("broad-model-types", `let handler: Function;\nlet model: Object;\nlet bag: {};\nexport { handler, model, bag };\n`)),
  ["allowlist.unallowlisted-escape"]
);

await record(
  "allowlist rejects ts-expect-error and ts-nocheck comments",
  false,
  async () => validateEscapeAllowlist(await makeAllowlistWorkspace("ts-comment-escapes", `// @ts-nocheck\n// @ts-expect-error intentional probe\nexport const value = 1;\n`)),
  ["allowlist.unallowlisted-escape"]
);

await record(
  "allowlist rejects policy path traversal",
  false,
  async () => validateEscapeAllowlist(await makeAllowlistWorkspace("policy-path-traversal", `export const value = 1;\n`), { policyPath: "../outside-policy.json" }),
  ["allowlist.policy-unreadable"]
);

await record(
  "allowlist does not allow policy to weaken default hard ban for as any",
  false,
  async () => validateEscapeAllowlist(await makeAllowlistWorkspace("as-any-hard-ban-weakened", `const source: unknown = \"x\";\nexport const escaped = source as any;\n`, {
    hardBannedEscapes: [],
    entries: [{
      path: "src/index.ts",
      kind: "as-any",
      locator: { textIncludes: "source as any" },
      justification: "probe attempts to approve hard-banned any",
      whyUnavoidable: "probe should still fail because as any is hard-banned",
      reviewer: "validator",
      reviewedOn: "2026-06-24"
    }]
  })),
  ["allowlist.hard-banned"]
);

await record(
  "domain-purity rejects core ecommerce term with valid policy",
  false,
  async () => validateDomainPurity(await makeDomainWorkspace("domain-core-valid-policy", `export const leak = \"ecommerce\";\n`)),
  ["domain-purity.core-domain-leak"]
);

await record(
  "domain-purity allows terms only in typed sample-demo surface",
  true,
  async () => validateDomainPurity(await makeDomainWorkspace("domain-sample-allowed", `export const sample = \"ecommerce inventory Billz Telegram\";\n`, {
    surfaces: [{ kind: "sample-demo", path: "src", match: "prefix" }]
  }))
);

await record(
  "domain-purity rejects malformed forbiddenTerms policy instead of default-green",
  false,
  async () => validateDomainPurity(await makeDomainWorkspace("domain-malformed-forbidden-terms", `export const leak = \"ecommerce\";\n`, {
    forbiddenTerms: [42]
  })),
  ["domain-purity.policy-schema", "domain-purity.core-domain-leak"]
);

const failed = probes.filter((probe) => !probe.matched);
console.log(JSON.stringify({ ok: failed.length === 0, probeCount: probes.length, failedCount: failed.length, probes }, null, 2));
if (failed.length > 0) process.exitCode = 1;
