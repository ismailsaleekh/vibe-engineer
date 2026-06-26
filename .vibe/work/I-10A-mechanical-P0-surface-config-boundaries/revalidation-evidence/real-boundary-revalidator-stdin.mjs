import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { validateGovernedSurface } from '@vibe-engineer/mechanical-gates/p0/governed-surface';
import { validateStrictConfig } from '@vibe-engineer/mechanical-gates/p0/config-guards';
import { assertTypedFindings, validatePackageBoundaries } from '@vibe-engineer/mechanical-gates/p0/boundaries';

const repoRoot = resolve('/Users/lizavasilyeva/work/vibe-engineer');
const packageRoot = join(repoRoot, 'packages/mechanical-gates');
const fixtureRoot = join(packageRoot, 'fixtures/p0/surface-config-boundaries');
const workRoot = join(repoRoot, '.vibe/work/I-10A-mechanical-P0-surface-config-boundaries');
const evidenceRoot = join(workRoot, 'revalidation-evidence');
const outputPath = join(evidenceRoot, 'real-boundary-results.json');

function ruleIds(result) {
  return [...new Set(result.findings.map((finding) => finding.ruleId))].sort();
}

function typed(result) {
  try {
    assertTypedFindings(result.findings);
    return result.findings.every((finding) => finding.family && finding.ruleId && finding.severity && typeof finding.blocking === 'boolean' && typeof finding.path === 'string' && finding.message && finding.evidence && typeof finding.evidence === 'object');
  } catch {
    return false;
  }
}

async function runCase(name, validator, root, expectedOk, expectedRuleIds = []) {
  const result = await validator(root);
  const ids = ruleIds(result);
  return {
    name,
    root,
    ok: result.ok,
    expectedOk,
    ruleIds: ids,
    expectedRuleIds,
    typed: typed(result),
    matchedExpectation: result.ok === expectedOk && expectedRuleIds.every((ruleId) => ids.includes(ruleId)),
    evidence: result.evidence,
    sampleFindings: result.findings.slice(0, 8)
  };
}

const cases = [];
const config = validateStrictConfig;
const governed = validateGovernedSurface;
const boundary = validatePackageBoundaries;
const f = (name) => join(fixtureRoot, name);

cases.push(await runCase('strict-config.valid-workspace', config, f('valid-workspace'), true));
cases.push(await runCase('strict-config.empty-eslint', config, f('invalid-config-eslint-empty'), false, ['config-guards.invalid-eslint-config']));
cases.push(await runCase('strict-config.missing-eslint-rule', config, f('invalid-config-eslint-missing-ts-no-explicit-any'), false, ['config-guards.missing-eslint-rule']));
cases.push(await runCase('strict-config.downgraded-eslint-severity', config, f('invalid-config-eslint-downgraded-severity'), false, ['config-guards.eslint-rule-weakened']));
cases.push(await runCase('strict-config.invalid-ban-ts-comment', config, f('invalid-config-eslint-ban-ts-comment-options'), false, ['config-guards.invalid-eslint-rule-options']));
cases.push(await runCase('strict-config.missing-json-parse-boundary', config, f('invalid-config-eslint-missing-json-parse-boundary'), false, ['config-guards.missing-eslint-json-parse-boundary']));
cases.push(await runCase('strict-config.missing-prettier', config, f('invalid-config-prettier-missing'), false, ['config-guards.missing-prettier-config']));
cases.push(await runCase('strict-config.trailing-comma-none', config, f('invalid-config-prettier-trailing-comma'), false, ['config-guards.prettier-default-weakened']));
cases.push(await runCase('strict-config.omitted-print-width', config, f('invalid-config-prettier-omitted-print-width'), false, ['config-guards.prettier-default-weakened']));
cases.push(await runCase('strict-config.wrong-semi', config, f('invalid-config-prettier-wrong-semi'), false, ['config-guards.prettier-default-weakened']));
cases.push(await runCase('strict-config.wrong-single-quote', config, f('invalid-config-prettier-wrong-single-quote'), false, ['config-guards.prettier-default-weakened']));
cases.push(await runCase('strict-config.wrong-arrow-parens', config, f('invalid-config-prettier-wrong-arrow-parens'), false, ['config-guards.prettier-default-weakened']));
cases.push(await runCase('strict-config.wrong-bracket-spacing', config, f('invalid-config-prettier-wrong-bracket-spacing'), false, ['config-guards.prettier-default-weakened']));
cases.push(await runCase('strict-config.wrong-end-of-line', config, f('invalid-config-prettier-wrong-end-of-line'), false, ['config-guards.prettier-default-weakened']));
cases.push(await runCase('strict-config.missing-lint-script', config, f('invalid-config-script-missing-lint'), false, ['config-guards.missing-required-script']));
cases.push(await runCase('strict-config.missing-format-check', config, f('invalid-config-script-missing-format-check'), false, ['config-guards.missing-required-script']));
cases.push(await runCase('strict-config.echo-placeholders', config, f('invalid-config-script-echo-placeholders'), false, ['config-guards.invalid-required-script']));
cases.push(await runCase('strict-config.noop-placeholders', config, f('invalid-config-script-noop-commands'), false, ['config-guards.invalid-required-script']));
cases.push(await runCase('strict-config.omits-governed-surfaces', config, f('invalid-config-script-omits-governed-surfaces'), false, ['config-guards.partial-script-surface']));
cases.push(await runCase('strict-config.unrelated-script-surface', config, f('invalid-config-script-unrelated-surface'), false, ['config-guards.partial-script-surface']));
cases.push(await runCase('strict-config.false-green-regression', config, f('invalid-config-false-green-regression'), false, ['config-guards.invalid-eslint-config', 'config-guards.prettier-default-weakened', 'config-guards.invalid-required-script']));
cases.push(await runCase('strict-config.original-validation-evidence', config, join(workRoot, 'validation-evidence/config-false-green'), false, ['config-guards.invalid-eslint-config', 'config-guards.prettier-default-weakened', 'config-guards.invalid-required-script']));
cases.push(await runCase('strict-config.weak-ts-flags-existing', config, f('invalid-config-weak-flags'), false, ['config-guards.strict-ts-flag-weakened']));

const noUnusedFixture = join(evidenceRoot, 'adversarial/no-unused-flags-weakened');
cases.push(await runCase('strict-config.adversarial-noUnusedLocals-noUnusedParameters-false', config, noUnusedFixture, false, ['config-guards.strict-ts-flag-weakened']));

cases.push(await runCase('governed.valid-workspace', governed, f('valid-workspace'), true));
cases.push(await runCase('governed.omitted-file', governed, f('invalid-surface-omitted'), false, ['governed-surface.omitted-file']));
cases.push(await runCase('governed.duplicate-row', governed, f('invalid-surface-duplicate'), false, ['governed-surface.duplicate-row']));
cases.push(await runCase('governed.empty-tool-surface', governed, f('invalid-surface-empty-tool'), false, ['governed-surface.empty-tool-surface']));
cases.push(await runCase('governed.excluded-path-leak', governed, f('invalid-surface-excluded-leak'), false, ['governed-surface.excluded-path-leak']));
cases.push(await runCase('governed.missing-required-path', governed, f('invalid-surface-missing-required'), false, ['governed-surface.missing-required-path']));

cases.push(await runCase('boundaries.valid-workspace', boundary, f('valid-workspace'), true));
cases.push(await runCase('boundaries.cycle', boundary, f('invalid-boundary-cycle'), false, ['boundaries.cycle']));
cases.push(await runCase('boundaries.forbidden-direction', boundary, f('invalid-boundary-forbidden-direction'), false, ['boundaries.forbidden-import-direction']));
cases.push(await runCase('boundaries.private-reach-in', boundary, f('invalid-boundary-private-reachin'), false, ['boundaries.private-reach-in']));
cases.push(await runCase('boundaries.parser-self-agreement-only', boundary, f('invalid-boundary-parser-self-agreement'), false, ['boundaries.parser-self-agreement-only']));
cases.push(await runCase('boundaries.regex-only-proof', boundary, f('invalid-boundary-regex-proof'), false, ['boundaries.regex-only-proof-rejected']));

const packageManifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
const requiredTsFlagsFromLockedSpec = [
  'strict', 'noImplicitAny', 'strictNullChecks', 'strictFunctionTypes', 'strictBindCallApply',
  'strictPropertyInitialization', 'noImplicitThis', 'alwaysStrict', 'exactOptionalPropertyTypes',
  'noUncheckedIndexedAccess', 'noImplicitOverride', 'noImplicitReturns', 'noPropertyAccessFromIndexSignature',
  'useUnknownInCatchVariables', 'noFallthroughCasesInSwitch', 'noUnusedLocals', 'noUnusedParameters',
  'isolatedModules', 'verbatimModuleSyntax', 'forceConsistentCasingInFileNames', 'allowUnreachableCode',
  'allowUnusedLabels'
];
const noUnusedResult = cases.find((entry) => entry.name === 'strict-config.adversarial-noUnusedLocals-noUnusedParameters-false');
const validConfigResult = cases.find((entry) => entry.name === 'strict-config.valid-workspace');
const failedExpectations = cases.filter((entry) => !entry.matchedExpectation || !entry.typed);
const output = {
  ok: failedExpectations.length === 0,
  providerResolution: {
    governedSurface: await import.meta.resolve('@vibe-engineer/mechanical-gates/p0/governed-surface'),
    configGuards: await import.meta.resolve('@vibe-engineer/mechanical-gates/p0/config-guards'),
    boundaries: await import.meta.resolve('@vibe-engineer/mechanical-gates/p0/boundaries'),
    packageExports: packageManifest.exports
  },
  runnerMode: 'node --input-type=module from packages/mechanical-gates cwd',
  producerCarrier: {
    productFixtureRoot: fixtureRoot,
    validationEvidenceFalseGreen: join(workRoot, 'validation-evidence/config-false-green'),
    adversarialNoUnusedFixture: noUnusedFixture
  },
  requiredTsFlagsFromLockedSpec,
  validConfigEvidenceRequiredFlags: validConfigResult?.evidence?.requiredTrueFlags,
  cases,
  failedExpectations,
  adversarialFinding: noUnusedResult && noUnusedResult.ok === true
    ? 'noUnusedLocals/noUnusedParameters weakened to false unexpectedly passed through validateStrictConfig()'
    : null
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ ok: output.ok, outputPath, failedExpectations: failedExpectations.map((entry) => entry.name), adversarialFinding: output.adversarialFinding }, null, 2));
if (!output.ok) process.exitCode = 1;
