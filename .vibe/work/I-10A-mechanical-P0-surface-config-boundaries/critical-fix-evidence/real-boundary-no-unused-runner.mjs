import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { validateStrictConfig } from "@vibe-engineer/mechanical-gates/p0/config-guards";

const repoRoot = resolve(process.cwd(), "..", "..");
const packageRoot = resolve(process.cwd());
const fixtureRoot = join(packageRoot, "fixtures", "p0", "surface-config-boundaries");
const workRoot = join(repoRoot, ".vibe", "work", "I-10A-mechanical-P0-surface-config-boundaries");
const evidenceDir = join(workRoot, "critical-fix-evidence");
const outputPath = join(evidenceDir, "real-boundary-no-unused-results.json");

function isTypedFinding(finding) {
  return finding
    && typeof finding === "object"
    && finding.family === "p0.config-guards"
    && typeof finding.ruleId === "string"
    && finding.severity === "error"
    && finding.blocking === true
    && typeof finding.path === "string"
    && typeof finding.message === "string"
    && finding.evidence
    && typeof finding.evidence === "object"
    && !Array.isArray(finding.evidence);
}

function summarize(result, expectedOk, expectedRuleIds, expectedFlags) {
  const ruleIds = [...new Set(result.findings.map((finding) => finding.ruleId))];
  const flags = [...new Set(result.findings.map((finding) => finding.evidence?.flag).filter(Boolean))];
  const typed = result
    && result.family === "p0.config-guards"
    && typeof result.ok === "boolean"
    && Array.isArray(result.findings)
    && result.findings.every(isTypedFinding);
  const matchedExpectation = result.ok === expectedOk
    && expectedRuleIds.every((ruleId) => ruleIds.includes(ruleId))
    && expectedFlags.every((flag) => flags.includes(flag));
  return {
    ok: result.ok,
    expectedOk,
    ruleIds,
    expectedRuleIds,
    flags,
    expectedFlags,
    typed,
    matchedExpectation,
    evidence: result.evidence,
    findings: result.findings
  };
}

const cases = [
  ["valid strict config fixture", join(fixtureRoot, "valid-workspace"), true, [], []],
  ["noUnusedLocals false fixture", join(fixtureRoot, "invalid-config-ts-no-unused-locals-false"), false, ["config-guards.strict-ts-flag-weakened"], ["noUnusedLocals"]],
  ["noUnusedParameters false fixture", join(fixtureRoot, "invalid-config-ts-no-unused-parameters-false"), false, ["config-guards.strict-ts-flag-weakened"], ["noUnusedParameters"]],
  ["both noUnused flags false fixture", join(fixtureRoot, "invalid-config-ts-no-unused-both-false"), false, ["config-guards.strict-ts-flag-weakened"], ["noUnusedLocals", "noUnusedParameters"]],
  ["missing noUnusedLocals fixture", join(fixtureRoot, "invalid-config-ts-no-unused-locals-missing"), false, ["config-guards.strict-ts-flag-weakened"], ["noUnusedLocals"]],
  ["missing noUnusedParameters fixture", join(fixtureRoot, "invalid-config-ts-no-unused-parameters-missing"), false, ["config-guards.strict-ts-flag-weakened"], ["noUnusedParameters"]],
  ["closing revalidation adversarial noUnused fixture", join(workRoot, "revalidation-evidence", "adversarial", "no-unused-flags-weakened"), false, ["config-guards.strict-ts-flag-weakened"], ["noUnusedLocals", "noUnusedParameters"]],
  ["empty ESLint regression fixture", join(fixtureRoot, "invalid-config-eslint-empty"), false, ["config-guards.invalid-eslint-config"], []],
  ["Prettier trailingComma regression fixture", join(fixtureRoot, "invalid-config-prettier-trailing-comma"), false, ["config-guards.prettier-default-weakened"], []],
  ["script echo placeholder regression fixture", join(fixtureRoot, "invalid-config-script-echo-placeholders"), false, ["config-guards.invalid-required-script"], []],
  ["prior false-green regression fixture", join(fixtureRoot, "invalid-config-false-green-regression"), false, ["config-guards.invalid-eslint-config", "config-guards.prettier-default-weakened", "config-guards.invalid-required-script"], []],
  ["original validation false-green evidence", join(workRoot, "validation-evidence", "config-false-green"), false, ["config-guards.invalid-eslint-config", "config-guards.prettier-default-weakened", "config-guards.invalid-required-script"], []]
];

const packageJson = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
const providerResolution = {
  configGuards: await import.meta.resolve("@vibe-engineer/mechanical-gates/p0/config-guards"),
  packageExports: packageJson.exports?.["./p0/config-guards"] ?? null
};

const results = [];
for (const [name, root, expectedOk, expectedRuleIds, expectedFlags] of cases) {
  const result = await validateStrictConfig(root);
  results.push({ name, root, ...summarize(result, expectedOk, expectedRuleIds, expectedFlags) });
}

const requiredNoUnusedInEvidence = results[0]?.evidence?.requiredTrueFlags?.includes("noUnusedLocals")
  && results[0]?.evidence?.requiredTrueFlags?.includes("noUnusedParameters");
const ok = providerResolution.configGuards.endsWith("/src/p0/config-guards/index.js")
  && providerResolution.packageExports?.import === "./src/p0/config-guards/index.js"
  && requiredNoUnusedInEvidence
  && results.every((result) => result.typed && result.matchedExpectation);

const output = {
  ok,
  providerResolution,
  runnerMode: "public package subpath from packages/mechanical-gates cwd",
  requiredNoUnusedInEvidence,
  cases: results
};
await mkdir(evidenceDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ ok, outputPath, caseCount: results.length, providerResolution, requiredNoUnusedInEvidence }));
if (!ok) process.exit(1);
