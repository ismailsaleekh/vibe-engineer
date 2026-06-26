import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { validateStrictConfig } from "@vibe-engineer/mechanical-gates/p0/config-guards";
import { validateGovernedSurface } from "@vibe-engineer/mechanical-gates/p0/governed-surface";
import {
  assertTypedFindings,
  P0ValidationError,
  validatePackageBoundaries
} from "@vibe-engineer/mechanical-gates/p0/boundaries";

const packageRoot = process.cwd();
const repoRoot = path.resolve(packageRoot, "../..");
const workRoot = path.join(repoRoot, ".vibe/work/I-10A-mechanical-P0-surface-config-boundaries");
const evidenceRoot = path.join(workRoot, "critical-revalidation-evidence");
const fixtureRoot = path.join(packageRoot, "fixtures/p0/surface-config-boundaries");
const adversarialRoot = path.join(evidenceRoot, "adversarial");
const priorRevalidationAdversarial = path.join(workRoot, "revalidation-evidence/adversarial/no-unused-flags-weakened");
const originalValidationFalseGreen = path.join(workRoot, "validation-evidence/config-false-green");
const outputPath = path.join(evidenceRoot, "real-boundary-results.json");

const REQUIRED_TRUE_FLAGS = [
  "strict",
  "noImplicitAny",
  "strictNullChecks",
  "strictFunctionTypes",
  "strictBindCallApply",
  "strictPropertyInitialization",
  "noImplicitThis",
  "alwaysStrict",
  "exactOptionalPropertyTypes",
  "noUncheckedIndexedAccess",
  "noImplicitOverride",
  "noImplicitReturns",
  "noPropertyAccessFromIndexSignature",
  "useUnknownInCatchVariables",
  "noFallthroughCasesInSwitch",
  "noUnusedLocals",
  "noUnusedParameters",
  "isolatedModules",
  "verbatimModuleSyntax",
  "forceConsistentCasingInFileNames",
  "noEmitOnError"
];
const REQUIRED_FALSE_FLAGS = ["allowUnreachableCode", "allowUnusedLabels"];

function typedResult(result, family) {
  if (!result || typeof result !== "object" || result.family !== family || typeof result.ok !== "boolean" || !Array.isArray(result.findings)) {
    return false;
  }
  try {
    assertTypedFindings(result.findings);
  } catch {
    return false;
  }
  return result.findings.every((finding) => finding
    && typeof finding.family === "string"
    && typeof finding.ruleId === "string"
    && typeof finding.severity === "string"
    && typeof finding.blocking === "boolean"
    && typeof finding.path === "string"
    && typeof finding.message === "string"
    && finding.evidence
    && typeof finding.evidence === "object"
    && !Array.isArray(finding.evidence));
}

function ruleIds(result) {
  return [...new Set(result.findings.map((finding) => finding.ruleId))].sort();
}

function flags(result) {
  return [...new Set(result.findings.map((finding) => finding.evidence?.flag).filter(Boolean))].sort();
}

function includesAll(actual, expected) {
  return expected.every((value) => actual.includes(value));
}

async function runCase({ name, root, family, validator, expectedOk, expectedRuleIds = [], expectedFlags = [], extraCheck }) {
  const result = await validator(root);
  const actualRuleIds = ruleIds(result);
  const actualFlags = flags(result);
  const typed = typedResult(result, family);
  const extra = extraCheck ? extraCheck(result) : { ok: true };
  const matchedExpectation = typed
    && result.ok === expectedOk
    && includesAll(actualRuleIds, expectedRuleIds)
    && includesAll(actualFlags, expectedFlags)
    && extra.ok;
  return {
    name,
    root,
    ok: result.ok,
    expectedOk,
    ruleIds: actualRuleIds,
    expectedRuleIds,
    flags: actualFlags,
    expectedFlags,
    typed,
    extraCheck: extra,
    matchedExpectation,
    evidence: result.evidence,
    findings: result.findings
  };
}

async function main() {
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  if (packageJson.name !== "@vibe-engineer/mechanical-gates") {
    throw new Error(`Runner must execute from packages/mechanical-gates; saw package ${packageJson.name ?? "<missing>"}`);
  }

  const providerResolution = {
    configGuards: await import.meta.resolve("@vibe-engineer/mechanical-gates/p0/config-guards"),
    governedSurface: await import.meta.resolve("@vibe-engineer/mechanical-gates/p0/governed-surface"),
    boundaries: await import.meta.resolve("@vibe-engineer/mechanical-gates/p0/boundaries"),
    packageExports: packageJson.exports
  };

  const cases = [];
  const strictCase = (name, root, expectedOk, expectedRuleIds = [], expectedFlags = [], extraCheck) => ({
    name,
    root,
    family: "p0.config-guards",
    validator: validateStrictConfig,
    expectedOk,
    expectedRuleIds,
    expectedFlags,
    extraCheck
  });
  const governedCase = (name, fixtureName, expectedOk, expectedRuleIds = []) => ({
    name,
    root: path.join(fixtureRoot, fixtureName),
    family: "p0.governed-surface",
    validator: validateGovernedSurface,
    expectedOk,
    expectedRuleIds
  });
  const boundaryCase = (name, fixtureName, expectedOk, expectedRuleIds = [], extraCheck) => ({
    name,
    root: path.join(fixtureRoot, fixtureName),
    family: "p0.boundaries",
    validator: validatePackageBoundaries,
    expectedOk,
    expectedRuleIds,
    extraCheck
  });

  const strictValidExtra = (result) => {
    const evidenceFlags = Array.isArray(result.evidence?.requiredTrueFlags) ? result.evidence.requiredTrueFlags : [];
    const missingTrue = REQUIRED_TRUE_FLAGS.filter((flag) => !evidenceFlags.includes(flag));
    const missingFalse = REQUIRED_FALSE_FLAGS.filter((flag) => !(result.evidence?.requiredFalseFlags ?? []).includes(flag));
    return {
      ok: missingTrue.length === 0 && missingFalse.length === 0,
      missingTrue,
      missingFalse
    };
  };

  cases.push(strictCase("strict.valid-workspace", path.join(fixtureRoot, "valid-workspace"), true, [], [], strictValidExtra));
  cases.push(strictCase("strict.noUnusedLocals:false fresh adversarial", path.join(adversarialRoot, "no-unused-locals-false"), false, ["config-guards.strict-ts-flag-weakened"], ["noUnusedLocals"]));
  cases.push(strictCase("strict.noUnusedParameters:false fresh adversarial", path.join(adversarialRoot, "no-unused-parameters-false"), false, ["config-guards.strict-ts-flag-weakened"], ["noUnusedParameters"]));
  cases.push(strictCase("strict.both noUnused false fresh adversarial", path.join(adversarialRoot, "no-unused-both-false"), false, ["config-guards.strict-ts-flag-weakened"], ["noUnusedLocals", "noUnusedParameters"]));
  cases.push(strictCase("strict.missing noUnusedLocals fresh adversarial", path.join(adversarialRoot, "no-unused-locals-missing"), false, ["config-guards.strict-ts-flag-weakened"], ["noUnusedLocals"]));
  cases.push(strictCase("strict.missing noUnusedParameters fresh adversarial", path.join(adversarialRoot, "no-unused-parameters-missing"), false, ["config-guards.strict-ts-flag-weakened"], ["noUnusedParameters"]));
  cases.push(strictCase("strict.prior revalidation no-unused adversarial", priorRevalidationAdversarial, false, ["config-guards.strict-ts-flag-weakened"], ["noUnusedLocals", "noUnusedParameters"]));
  cases.push(strictCase("strict.original validation false-green evidence", originalValidationFalseGreen, false, ["config-guards.invalid-eslint-config", "config-guards.prettier-default-weakened", "config-guards.invalid-required-script"]));
  cases.push(strictCase("strict.product false-green regression fixture", path.join(fixtureRoot, "invalid-config-false-green-regression"), false, ["config-guards.invalid-eslint-config", "config-guards.prettier-default-weakened", "config-guards.invalid-required-script"]));
  cases.push(strictCase("strict.weak all TS flags fixture", path.join(fixtureRoot, "invalid-config-weak-flags"), false, ["config-guards.strict-ts-flag-weakened"], [...REQUIRED_TRUE_FLAGS, ...REQUIRED_FALSE_FLAGS]));

  const eslintFixtures = [
    ["strict.eslint empty export default []", "invalid-config-eslint-empty", "config-guards.invalid-eslint-config"],
    ["strict.eslint missing no-explicit-any", "invalid-config-eslint-missing-ts-no-explicit-any", "config-guards.missing-eslint-rule"],
    ["strict.eslint downgraded severity", "invalid-config-eslint-downgraded-severity", "config-guards.eslint-rule-weakened"],
    ["strict.eslint invalid ban-ts-comment options", "invalid-config-eslint-ban-ts-comment-options", "config-guards.invalid-eslint-rule-options"],
    ["strict.eslint missing raw JSON.parse boundary", "invalid-config-eslint-missing-json-parse-boundary", "config-guards.missing-eslint-json-parse-boundary"]
  ];
  for (const [name, fixtureName, ruleId] of eslintFixtures) {
    cases.push(strictCase(name, path.join(fixtureRoot, fixtureName), false, [ruleId]));
  }

  const prettierFixtures = [
    ["strict.prettier missing config", "invalid-config-prettier-missing", "config-guards.missing-prettier-config"],
    ["strict.prettier trailingComma none", "invalid-config-prettier-trailing-comma", "config-guards.prettier-default-weakened"],
    ["strict.prettier omitted printWidth", "invalid-config-prettier-omitted-print-width", "config-guards.prettier-default-weakened"],
    ["strict.prettier wrong semi", "invalid-config-prettier-wrong-semi", "config-guards.prettier-default-weakened"],
    ["strict.prettier wrong singleQuote", "invalid-config-prettier-wrong-single-quote", "config-guards.prettier-default-weakened"],
    ["strict.prettier wrong arrowParens", "invalid-config-prettier-wrong-arrow-parens", "config-guards.prettier-default-weakened"],
    ["strict.prettier wrong bracketSpacing", "invalid-config-prettier-wrong-bracket-spacing", "config-guards.prettier-default-weakened"],
    ["strict.prettier wrong endOfLine", "invalid-config-prettier-wrong-end-of-line", "config-guards.prettier-default-weakened"]
  ];
  for (const [name, fixtureName, ruleId] of prettierFixtures) {
    cases.push(strictCase(name, path.join(fixtureRoot, fixtureName), false, [ruleId]));
  }

  const scriptFixtures = [
    ["strict.script missing lint", "invalid-config-script-missing-lint", "config-guards.missing-required-script"],
    ["strict.script missing format:check", "invalid-config-script-missing-format-check", "config-guards.missing-required-script"],
    ["strict.script echo placeholders", "invalid-config-script-echo-placeholders", "config-guards.invalid-required-script"],
    ["strict.script noop placeholders", "invalid-config-script-noop-commands", "config-guards.invalid-required-script"],
    ["strict.script partial governed surfaces", "invalid-config-script-omits-governed-surfaces", "config-guards.partial-script-surface"],
    ["strict.script unrelated paths", "invalid-config-script-unrelated-surface", "config-guards.partial-script-surface"],
    ["strict.script omitted config surfaces", "invalid-config-missing-surfaces", "config-guards.missing-required-script"]
  ];
  for (const [name, fixtureName, ruleId] of scriptFixtures) {
    cases.push(strictCase(name, path.join(fixtureRoot, fixtureName), false, [ruleId]));
  }

  cases.push(governedCase("governed.valid-workspace", "valid-workspace", true));
  cases.push(governedCase("governed.omitted file", "invalid-surface-omitted", false, ["governed-surface.omitted-file"]));
  cases.push(governedCase("governed.duplicate row", "invalid-surface-duplicate", false, ["governed-surface.duplicate-row"]));
  cases.push(governedCase("governed.empty tool surface", "invalid-surface-empty-tool", false, ["governed-surface.empty-tool-surface"]));
  cases.push(governedCase("governed.excluded path leak", "invalid-surface-excluded-leak", false, ["governed-surface.excluded-path-leak"]));
  cases.push(governedCase("governed.missing required path", "invalid-surface-missing-required", false, ["governed-surface.missing-required-path"]));

  const boundaryAstExtra = (result) => ({
    ok: result.evidence?.parser === "typescript" && result.evidence?.proofMode === "typescript-ast",
    parser: result.evidence?.parser,
    proofMode: result.evidence?.proofMode
  });
  cases.push(boundaryCase("boundaries.valid-workspace", "valid-workspace", true, [], boundaryAstExtra));
  cases.push(boundaryCase("boundaries.cycle", "invalid-boundary-cycle", false, ["boundaries.cycle"], boundaryAstExtra));
  cases.push(boundaryCase("boundaries.forbidden direction", "invalid-boundary-forbidden-direction", false, ["boundaries.forbidden-import-direction"], boundaryAstExtra));
  cases.push(boundaryCase("boundaries.private reach-in", "invalid-boundary-private-reachin", false, ["boundaries.private-reach-in"], boundaryAstExtra));
  cases.push(boundaryCase("boundaries.parser self-agreement-only", "invalid-boundary-parser-self-agreement", false, ["boundaries.parser-self-agreement-only"], boundaryAstExtra));
  cases.push(boundaryCase("boundaries.regex-only proof", "invalid-boundary-regex-proof", false, ["boundaries.regex-only-proof-rejected"], boundaryAstExtra));

  const results = [];
  for (const testCase of cases) {
    results.push(await runCase(testCase));
  }

  const narrative = JSON.parse(await readFile(path.join(fixtureRoot, "invalid-untyped-output/narrative.json"), "utf8"));
  let narrativeRejected = false;
  let narrativeError = null;
  try {
    assertTypedFindings([narrative]);
  } catch (error) {
    narrativeRejected = error instanceof P0ValidationError && error.code === "P0_UNTYPED_FINDING";
    narrativeError = error instanceof Error ? { name: error.name, message: error.message, code: error.code } : { message: String(error) };
  }

  const failedExpectations = results.filter((result) => !result.matchedExpectation);
  if (!narrativeRejected) {
    failedExpectations.push({ name: "contracts.untyped narrative rejection", matchedExpectation: false, narrative, narrativeError });
  }

  const validConfigCase = results.find((result) => result.name === "strict.valid-workspace");
  const requiredNoUnusedInEvidence = ["noUnusedLocals", "noUnusedParameters"].every((flag) => validConfigCase?.evidence?.requiredTrueFlags?.includes(flag));
  if (!requiredNoUnusedInEvidence) {
    failedExpectations.push({ name: "strict.required noUnused flags advertised", matchedExpectation: false, evidence: validConfigCase?.evidence });
  }

  const summary = {
    ok: failedExpectations.length === 0,
    runnerMode: "node --input-type=module from packages/mechanical-gates cwd; public package subpath imports",
    packageRoot,
    fixtureRoot,
    evidenceRoot,
    providerResolution,
    requiredTrueFlags: REQUIRED_TRUE_FLAGS,
    requiredFalseFlags: REQUIRED_FALSE_FLAGS,
    requiredNoUnusedInEvidence,
    cases: results,
    narrativeRejected,
    narrativeError,
    failedExpectations
  };

  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  if (!summary.ok) {
    console.error(JSON.stringify({ ok: false, outputPath, failedExpectations: failedExpectations.map((entry) => entry.name) }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ ok: true, outputPath, cases: results.length }));
}

await main();
