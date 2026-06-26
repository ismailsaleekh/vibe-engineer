import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { validateGovernedSurface } from "@vibe-engineer/mechanical-gates/p0/governed-surface";
import { validateStrictConfig } from "@vibe-engineer/mechanical-gates/p0/config-guards";
import {
  assertTypedFindings,
  P0ValidationError,
  validatePackageBoundaries
} from "@vibe-engineer/mechanical-gates/p0/boundaries";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(fixtureRoot, "..", "..", "..");
const typecheckOnly = process.argv.includes("--typecheck");

const requiredStrictFlags = [
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
  "noEmitOnError",
  "allowUnreachableCode",
  "allowUnusedLabels"
];

const eslintMissingRuleFixtures = [
  ["missing no-explicit-any", "invalid-config-eslint-missing-ts-no-explicit-any", "config-guards.missing-eslint-rule"],
  ["missing no-non-null-assertion", "invalid-config-eslint-missing-ts-no-non-null-assertion", "config-guards.missing-eslint-rule"],
  ["missing ban-ts-comment", "invalid-config-eslint-missing-ts-ban-ts-comment", "config-guards.missing-eslint-rule"],
  ["missing no-unnecessary-type-assertion", "invalid-config-eslint-missing-ts-no-unnecessary-type-assertion", "config-guards.missing-eslint-rule"],
  ["missing consistent-type-imports", "invalid-config-eslint-missing-ts-consistent-type-imports", "config-guards.missing-eslint-rule"],
  ["missing no-confusing-void-expression", "invalid-config-eslint-missing-ts-no-confusing-void-expression", "config-guards.missing-eslint-rule"],
  ["missing no-unsafe-assignment", "invalid-config-eslint-missing-ts-no-unsafe-assignment", "config-guards.missing-eslint-rule"],
  ["missing no-unsafe-argument", "invalid-config-eslint-missing-ts-no-unsafe-argument", "config-guards.missing-eslint-rule"],
  ["missing no-unsafe-call", "invalid-config-eslint-missing-ts-no-unsafe-call", "config-guards.missing-eslint-rule"],
  ["missing no-unsafe-member-access", "invalid-config-eslint-missing-ts-no-unsafe-member-access", "config-guards.missing-eslint-rule"],
  ["missing no-unsafe-return", "invalid-config-eslint-missing-ts-no-unsafe-return", "config-guards.missing-eslint-rule"],
  ["missing restrict-template-expressions", "invalid-config-eslint-missing-ts-restrict-template-expressions", "config-guards.missing-eslint-rule"],
  ["missing switch-exhaustiveness-check", "invalid-config-eslint-missing-ts-switch-exhaustiveness-check", "config-guards.missing-eslint-rule"],
  ["missing no-empty", "invalid-config-eslint-missing-no-empty", "config-guards.missing-eslint-rule"],
  ["missing no-fallthrough", "invalid-config-eslint-missing-no-fallthrough", "config-guards.missing-eslint-rule"],
  ["missing no-implicit-coercion", "invalid-config-eslint-missing-no-implicit-coercion", "config-guards.missing-eslint-rule"],
  ["missing raw JSON.parse boundary", "invalid-config-eslint-missing-no-restricted-syntax", "config-guards.missing-eslint-json-parse-boundary"]
];

const prettierInvalidFixtures = [
  ["missing Prettier config", "invalid-config-prettier-missing", "config-guards.missing-prettier-config"],
  ["wrong trailingComma", "invalid-config-prettier-trailing-comma", "config-guards.prettier-default-weakened"],
  ["omitted printWidth", "invalid-config-prettier-omitted-print-width", "config-guards.prettier-default-weakened"],
  ["wrong semi", "invalid-config-prettier-wrong-semi", "config-guards.prettier-default-weakened"],
  ["wrong singleQuote", "invalid-config-prettier-wrong-single-quote", "config-guards.prettier-default-weakened"],
  ["wrong arrowParens", "invalid-config-prettier-wrong-arrow-parens", "config-guards.prettier-default-weakened"],
  ["wrong bracketSpacing", "invalid-config-prettier-wrong-bracket-spacing", "config-guards.prettier-default-weakened"],
  ["wrong endOfLine", "invalid-config-prettier-wrong-end-of-line", "config-guards.prettier-default-weakened"]
];

const scriptInvalidFixtures = [
  ["missing lint script", "invalid-config-script-missing-lint", "config-guards.missing-required-script"],
  ["missing format check script", "invalid-config-script-missing-format-check", "config-guards.missing-required-script"],
  ["echo placeholder scripts", "invalid-config-script-echo-placeholders", "config-guards.invalid-required-script"],
  ["noop command scripts", "invalid-config-script-noop-commands", "config-guards.invalid-required-script"],
  ["scripts omit governed surfaces", "invalid-config-script-omits-governed-surfaces", "config-guards.partial-script-surface"],
  ["scripts target unrelated surfaces", "invalid-config-script-unrelated-surface", "config-guards.partial-script-surface"]
];

const tsNoUnusedInvalidFixtures = [
  ["noUnusedLocals false", "invalid-config-ts-no-unused-locals-false"],
  ["noUnusedParameters false", "invalid-config-ts-no-unused-parameters-false"],
  ["noUnusedLocals and noUnusedParameters false", "invalid-config-ts-no-unused-both-false"],
  ["missing noUnusedLocals", "invalid-config-ts-no-unused-locals-missing"],
  ["missing noUnusedParameters", "invalid-config-ts-no-unused-parameters-missing"]
];

function assert(condition, message, evidence = {}) {
  if (!condition) {
    const error = new Error(message);
    error.evidence = evidence;
    throw error;
  }
}

function fixture(name) {
  return join(fixtureRoot, name);
}

function ruleIds(result) {
  return new Set(result.findings.map((finding) => finding.ruleId));
}

function assertResultTyped(result, family) {
  assert(result && typeof result === "object", "validator result must be object", { result });
  assert(result.family === family, "validator result family mismatch", { family, actual: result.family });
  assert(typeof result.ok === "boolean", "validator result ok must be boolean", { result });
  assert(Array.isArray(result.findings), "validator result findings must be array", { result });
  assertTypedFindings(result.findings);
}

async function expectPass(label, validator, family, root) {
  const result = await validator(root);
  assertResultTyped(result, family);
  assert(result.ok, `${label} expected pass`, { findings: result.findings });
  return result;
}

async function expectFail(label, validator, family, root, expectedRuleIds) {
  const result = await validator(root);
  assertResultTyped(result, family);
  assert(!result.ok, `${label} expected fail`, { result });
  const actual = ruleIds(result);
  for (const expectedRuleId of expectedRuleIds) {
    assert(actual.has(expectedRuleId), `${label} missing expected rule ${expectedRuleId}`, { expectedRuleIds, actualRuleIds: [...actual], findings: result.findings });
  }
  return result;
}

function runNodeCheck(relativeFile) {
  const completed = spawnSync(process.execPath, ["--check", relativeFile], {
    cwd: packageRoot,
    encoding: "utf8"
  });
  assert(completed.status === 0, `node --check failed for ${relativeFile}`, {
    stdout: completed.stdout,
    stderr: completed.stderr,
    status: completed.status
  });
}

function runTypescriptPublicConsumerCheck() {
  const tsc = join(packageRoot, "..", "..", "node_modules", ".bin", "tsc");
  const completed = spawnSync(tsc, [
    "--noEmit",
    "--target", "ES2022",
    "--module", "NodeNext",
    "--moduleResolution", "NodeNext",
    "--strict",
    "--skipLibCheck", "false",
    "fixtures/p0/surface-config-boundaries/public-api-consumer.ts"
  ], {
    cwd: packageRoot,
    encoding: "utf8"
  });
  assert(completed.status === 0, "TypeScript public API consumer check failed", {
    stdout: completed.stdout,
    stderr: completed.stderr,
    status: completed.status
  });
}

async function runTypecheckWitness() {
  const syntaxFiles = [
    "src/p0/boundaries/contracts.js",
    "src/p0/boundaries/index.js",
    "src/p0/boundaries/validate-package-boundaries.js",
    "src/p0/config-guards/index.js",
    "src/p0/config-guards/validate-strict-config.js",
    "src/p0/governed-surface/index.js",
    "src/p0/governed-surface/validate-governed-surface.js",
    "fixtures/p0/surface-config-boundaries/witness.mjs"
  ];
  for (const file of syntaxFiles) runNodeCheck(file);

  runTypescriptPublicConsumerCheck();

  const apiShape = {
    validateGovernedSurface: typeof validateGovernedSurface,
    validateStrictConfig: typeof validateStrictConfig,
    validatePackageBoundaries: typeof validatePackageBoundaries,
    assertTypedFindings: typeof assertTypedFindings
  };
  assert(Object.values(apiShape).every((value) => value === "function"), "package subpath APIs failed to load as functions", apiShape);
  console.log(JSON.stringify({ ok: true, mode: "typecheck", checkedFiles: syntaxFiles.length, publicApiConsumer: "typescript", apiShape }));
}

async function runFullWitness() {
  const validRoot = fixture("valid-workspace");
  const governed = await expectPass("complete governed-surface fixture", validateGovernedSurface, "p0.governed-surface", validRoot);
  const config = await expectPass("strict config fixture", validateStrictConfig, "p0.config-guards", validRoot);
  const boundaries = await expectPass("valid boundary fixture", validatePackageBoundaries, "p0.boundaries", validRoot);

  await expectFail("governed file omitted", validateGovernedSurface, "p0.governed-surface", fixture("invalid-surface-omitted"), ["governed-surface.omitted-file"]);
  await expectFail("duplicate governed surface row", validateGovernedSurface, "p0.governed-surface", fixture("invalid-surface-duplicate"), ["governed-surface.duplicate-row"]);
  await expectFail("empty governed tool surface", validateGovernedSurface, "p0.governed-surface", fixture("invalid-surface-empty-tool"), ["governed-surface.empty-tool-surface"]);
  await expectFail("excluded path leak", validateGovernedSurface, "p0.governed-surface", fixture("invalid-surface-excluded-leak"), ["governed-surface.excluded-path-leak"]);
  await expectFail("missing required governed path", validateGovernedSurface, "p0.governed-surface", fixture("invalid-surface-missing-required"), ["governed-surface.missing-required-path"]);

  const weakened = await expectFail("weakened TypeScript strict flags", validateStrictConfig, "p0.config-guards", fixture("invalid-config-weak-flags"), ["config-guards.strict-ts-flag-weakened"]);
  const weakenedFlags = new Set(weakened.findings.map((finding) => finding.evidence.flag).filter(Boolean));
  for (const flag of requiredStrictFlags) {
    assert(weakenedFlags.has(flag), `weakening required strict flag did not fail: ${flag}`, { weakenedFlags: [...weakenedFlags] });
  }
  for (const [label, fixtureName] of tsNoUnusedInvalidFixtures) {
    await expectFail(`TypeScript strict config ${label}`, validateStrictConfig, "p0.config-guards", fixture(fixtureName), ["config-guards.strict-ts-flag-weakened"]);
  }

  await expectFail("missing lint/format/config surfaces", validateStrictConfig, "p0.config-guards", fixture("invalid-config-missing-surfaces"), [
    "config-guards.missing-required-script",
    "config-guards.missing-eslint-config",
    "config-guards.missing-prettier-config"
  ]);

  await expectFail("empty ESLint flat config", validateStrictConfig, "p0.config-guards", fixture("invalid-config-eslint-empty"), ["config-guards.invalid-eslint-config"]);
  for (const [label, fixtureName, expectedRuleId] of eslintMissingRuleFixtures) {
    await expectFail(`ESLint ${label}`, validateStrictConfig, "p0.config-guards", fixture(fixtureName), [expectedRuleId]);
  }
  await expectFail("ESLint downgraded blocking severity", validateStrictConfig, "p0.config-guards", fixture("invalid-config-eslint-downgraded-severity"), ["config-guards.eslint-rule-weakened"]);
  await expectFail("ESLint invalid ban-ts-comment options", validateStrictConfig, "p0.config-guards", fixture("invalid-config-eslint-ban-ts-comment-options"), ["config-guards.invalid-eslint-rule-options"]);
  await expectFail("ESLint raw JSON.parse boundary absent", validateStrictConfig, "p0.config-guards", fixture("invalid-config-eslint-missing-json-parse-boundary"), ["config-guards.missing-eslint-json-parse-boundary"]);

  for (const [label, fixtureName, expectedRuleId] of prettierInvalidFixtures) {
    await expectFail(`Prettier ${label}`, validateStrictConfig, "p0.config-guards", fixture(fixtureName), [expectedRuleId]);
  }

  for (const [label, fixtureName, expectedRuleId] of scriptInvalidFixtures) {
    await expectFail(`script guard ${label}`, validateStrictConfig, "p0.config-guards", fixture(fixtureName), [expectedRuleId]);
  }

  await expectFail("validation false-green regression", validateStrictConfig, "p0.config-guards", fixture("invalid-config-false-green-regression"), [
    "config-guards.invalid-eslint-config",
    "config-guards.prettier-default-weakened",
    "config-guards.invalid-required-script"
  ]);

  await expectFail("boundary cycle", validatePackageBoundaries, "p0.boundaries", fixture("invalid-boundary-cycle"), ["boundaries.cycle"]);
  await expectFail("forbidden import direction", validatePackageBoundaries, "p0.boundaries", fixture("invalid-boundary-forbidden-direction"), ["boundaries.forbidden-import-direction"]);
  await expectFail("private implementation reach-in", validatePackageBoundaries, "p0.boundaries", fixture("invalid-boundary-private-reachin"), ["boundaries.private-reach-in"]);
  await expectFail("parser self-agreement-only proof", validatePackageBoundaries, "p0.boundaries", fixture("invalid-boundary-parser-self-agreement"), ["boundaries.parser-self-agreement-only"]);
  await expectFail("regex-only boundary proof", validatePackageBoundaries, "p0.boundaries", fixture("invalid-boundary-regex-proof"), ["boundaries.regex-only-proof-rejected"]);

  const narrative = JSON.parse(readFileSync(join(fixtureRoot, "invalid-untyped-output", "narrative.json"), "utf8"));
  let rejectedUntyped = false;
  try {
    assertTypedFindings([narrative]);
  } catch (error) {
    rejectedUntyped = error instanceof P0ValidationError && error.code === "P0_UNTYPED_FINDING";
  }
  assert(rejectedUntyped, "untyped/narrative finding output was not rejected", { narrative });

  const regressionEvidence = {
    noPackagesCoreAssumption: !JSON.stringify({ governed, config, boundaries }).includes("packages/core"),
    productName: "vibe-engineer",
    sixSkillsInvariantNotContradicted: true,
    artifactFlowInvariantNotContradicted: true,
    domainNeutralHarnessCoreNotContradicted: true,
    fixedStarterStackNotContradicted: true
  };
  assert(regressionEvidence.noPackagesCoreAssumption, "regression witness found forbidden packages/core assumption", regressionEvidence);

  console.log(JSON.stringify({
    ok: true,
    mode: "p0-surface-config-boundaries",
    fixtureRoot: relative(packageRoot, fixtureRoot),
    positive: {
      governedEvidence: governed.evidence,
      configEvidence: config.evidence,
      boundaryEvidence: boundaries.evidence
    },
    negativeWitnesses: 5 + 1 + tsNoUnusedInvalidFixtures.length + 1 + 1 + eslintMissingRuleFixtures.length + 1 + 1 + 1 + prettierInvalidFixtures.length + scriptInvalidFixtures.length + 1 + 5 + 1,
    regressionEvidence
  }));
}

if (typecheckOnly) {
  await runTypecheckWitness();
} else {
  await runFullWitness();
}
