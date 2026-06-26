import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = '/Users/lizavasilyeva/work/vibe-engineer';
const work = join(repo, '.vibe/work/I-14B-pi-adapter-runtime-skill-consumption');
const evidence = join(work, 'validation-evidence');
const finalDir = join(evidence, 'final');
const errors = [];
const notes = [];

const readText = (path) => readFileSync(path, 'utf8');
const readJson = (path) => JSON.parse(readText(path));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const assert = (condition, message) => { if (!condition) errors.push(message); };
const listFiles = (root) => {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      const st = statSync(abs);
      if (st.isDirectory()) walk(abs);
      else if (st.isFile()) out.push(abs);
    }
  };
  if (existsSync(root)) walk(root);
  return out;
};

const requiredSkillIds = ['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship'];
const requiredCommands = [
  ...requiredSkillIds.map((id) => `skill:${id}`),
  ...requiredSkillIds.map((id) => `vibe-${id}`),
].sort();
const productRoot = join(repo, 'examples/harness-integrations/pi/runtime-fixtures');
const validatorRoot = join(evidence, '07-positive/runtime-fixture-rerun');

const live = readJson(join(evidence, '10-live/pi-loader-boundary-result.json'));
assert(live.ok === true, 'live result ok is not true');
assert(live.livePiLoaderProof === 'proven', 'livePiLoaderProof is not proven');
assert(live.command === 'pi --mode rpc --no-session --approve --offline --no-extensions', 'live command string mismatch');
assert(live.stdinJsonl === '{"id":"i14b-get-commands","type":"get_commands"}\n', 'live stdin JSONL mismatch');
assert(Array.isArray(live.runs) && live.runs.length === 2, 'live runs count is not 2');

const liveRunSummaries = [];
for (const run of live.runs ?? []) {
  assert(['validator-rerun', 'product-fixture'].includes(run.name), `unexpected live run name ${run.name}`);
  assert([validatorRoot, productRoot].includes(run.cwd), `unexpected cwd for ${run.name}: ${run.cwd}`);
  assert(run.command === 'pi', `live run ${run.name} did not spawn pi`);
  assert(JSON.stringify(run.args) === JSON.stringify(['--mode', 'rpc', '--no-session', '--approve', '--offline', '--no-extensions']), `live run ${run.name} args mismatch`);
  assert(run.finishReason === 'response', `live run ${run.name} did not finish on response`);
  assert(run.parsedResponse?.success === true, `live run ${run.name} parsed response was not success`);
  assert(run.evaluation?.status === 'proven', `live run ${run.name} evaluation not proven`);
  assert(Array.isArray(run.evaluation?.missingCommands) && run.evaluation.missingCommands.length === 0, `live run ${run.name} has missing commands`);
  let rawResponse;
  try {
    const rawLines = String(run.stdout ?? '').split(/\n/u).filter((line) => line.trim().length > 0);
    assert(rawLines.length > 0, `live run ${run.name} raw stdout empty`);
    rawResponse = JSON.parse(rawLines.find((line) => line.includes('"command":"get_commands"')) ?? rawLines[0]);
  } catch (error) {
    errors.push(`live run ${run.name} raw stdout not parseable: ${error.message}`);
  }
  const rawCommands = rawResponse?.data?.commands;
  assert(rawResponse?.type === 'response' && rawResponse?.command === 'get_commands' && rawResponse?.success === true, `live run ${run.name} raw RPC response not successful`);
  assert(Array.isArray(rawCommands), `live run ${run.name} raw commands missing`);
  const commandNames = Array.isArray(rawCommands) ? rawCommands.map((command) => command.name).sort() : [];
  const missing = requiredCommands.filter((command) => !commandNames.includes(command));
  assert(missing.length === 0, `live run ${run.name} raw commands missing ${missing.join(',')}`);
  const pathChecks = [];
  for (const skillId of requiredSkillIds) {
    const skillCommand = rawCommands?.find((command) => command.name === `skill:${skillId}`);
    const promptCommand = rawCommands?.find((command) => command.name === `vibe-${skillId}`);
    assert(skillCommand?.source === 'skill', `live run ${run.name} skill:${skillId} source mismatch`);
    assert(promptCommand?.source === 'prompt', `live run ${run.name} vibe-${skillId} source mismatch`);
    const skillPath = skillCommand?.sourceInfo?.path;
    const promptPath = promptCommand?.sourceInfo?.path;
    assert(typeof skillPath === 'string' && skillPath.startsWith(`${run.cwd}/.pi/skills/`) && skillPath.endsWith(`/${skillId}/SKILL.md`), `live run ${run.name} skill path mismatch for ${skillId}`);
    assert(typeof promptPath === 'string' && promptPath === `${run.cwd}/.pi/prompts/vibe-${skillId}.md`, `live run ${run.name} prompt path mismatch for ${skillId}`);
    if (typeof skillPath === 'string') pathChecks.push(relative(run.cwd, skillPath));
    if (typeof promptPath === 'string') pathChecks.push(relative(run.cwd, promptPath));
  }
  liveRunSummaries.push({ name: run.name, cwd: run.cwd, commandCount: commandNames.length, requiredObserved: requiredCommands, checkedRelativePaths: pathChecks.sort() });
}

const liveExit = readText(join(evidence, '10-live/live.exit')).trim();
assert(liveExit === '0', 'live witness process exit was not 0');
const piWhich = readText(join(evidence, '10-live/pi-which.txt'));
assert(piWhich.includes('/usr/local/bin/pi') && piWhich.includes('# exit: 0'), 'pi executable evidence missing');
const piHelp = readText(join(evidence, '10-live/pi-help.txt'));
for (const flag of ['--mode <mode>', '--approve', '--offline', '--no-extensions', '--skill <path>', '--prompt-template <path>']) {
  assert(piHelp.includes(flag), `pi help missing ${flag}`);
}

const staticResult = readJson(join(evidence, '06-static/static-result.json'));
assert(staticResult.tscExit === 0, 'static tsc evidence nonzero');
assert(staticResult.productionJsExit === 0, 'production JS sweep exit nonzero');
assert(Array.isArray(staticResult.productionJsFiles) && staticResult.productionJsFiles.length === 0, 'static result recorded production JS files');
const currentProductionJs = listFiles(join(repo, 'packages/adapters/pi/src')).filter((file) => /\.(?:js|mjs|cjs)$/u.test(file));
assert(currentProductionJs.length === 0, `current production JS/MJS/CJS files found: ${currentProductionJs.map((file) => relative(repo, file)).join(',')}`);

const positive = readJson(join(evidence, '07-positive/positive-generation-result.json'));
assert(positive.ok === true, 'positive witness ok is not true');
assert(positive.consumedActualI14A?.capabilityValidation === true, 'positive witness did not validate I-14A capability API');
assert(positive.consumedActualI14A?.manifestValidation === true, 'positive witness did not validate I-14A generated-file manifest API');
assert(positive.fixture?.assetCount === 17 && positive.fixture?.assetsWithManifestCount === 18, 'positive fixture asset counts mismatch');
assert((positive.comparisons ?? []).length === 18, 'positive comparison count mismatch');
assert((positive.comparisons ?? []).every((entry) => entry.status === 'match'), 'positive product/rerun comparison mismatch');

const negative = readJson(join(evidence, '08-negative/negative-witness-result.json'));
assert(negative.ok === true, 'negative witness ok is not true');
assert(negative.caseCount >= 37, 'negative witness case count too low');
assert(negative.failedCount === 0, 'negative witness has failed cases');

const regression = readJson(join(evidence, '09-regression/regression-witness-result.json'));
assert(regression.ok === true, 'regression witness ok is not true');
assert(regression.i14a?.capabilityValidation === true, 'regression I-14A capability validation false');
assert(regression.i14a?.manifestValidation === true, 'regression I-14A manifest validation false');
assert(regression.i14a?.piRuntimeClaimInI14A === 'not-claimed', 'I-14A runtime claim drifted from not-claimed');
for (const adapter of regression.i14a?.nonPiAdapters ?? []) {
  assert(adapter.manifestSelectable === false && adapter.createImportSelectable === false && adapter.readiness !== 'ready' && (adapter.enabledFlags ?? []).length === 0, `non-pi adapter selectable/ready drift: ${adapter.adapterId}`);
}
const currentI14aHashes = {};
for (const relPath of Object.keys(regression.i14a?.hashes ?? {})) {
  currentI14aHashes[relPath] = sha256(join(repo, relPath));
  assert(currentI14aHashes[relPath] === regression.i14a.hashes[relPath], `I-14A hash changed since regression evidence: ${relPath}`);
}
const currentProtectedHashes = {};
for (const relPath of Object.keys(regression.protectedNeighborHashes ?? {})) {
  const abs = join(repo, relPath);
  if (existsSync(abs)) {
    currentProtectedHashes[relPath] = sha256(abs);
    assert(currentProtectedHashes[relPath] === regression.protectedNeighborHashes[relPath], `protected neighbor hash changed since regression evidence: ${relPath}`);
  }
}

const fixtureReview = readJson(join(evidence, '05-fixture-review/fixture-review-summary.json'));
assert(fixtureReview.skillCount === 6, 'fixture review skill count mismatch');
assert(fixtureReview.promptCount === 6, 'fixture review prompt count mismatch');
assert((fixtureReview.nestedPromptFiles ?? []).length === 0, 'fixture review nested prompts found');
assert((fixtureReview.secretMatches ?? []).length === 0, 'fixture review secret matches found');
assert((fixtureReview.domainMatches ?? []).length === 0, 'fixture review domain matches found');
assert((fixtureReview.unsupportedLiveMatches ?? []).length === 0, 'fixture review unsupported live markers found');
assert(fixtureReview.packageHasPi === true, 'fixture package manifest missing pi declaration');

const expectedFixtureFiles = [
  ...requiredSkillIds.map((id) => `.pi/skills/${id}/SKILL.md`),
  ...requiredSkillIds.map((id) => `.pi/prompts/vibe-${id}.md`),
  '.pi/extensions/i14b-runtime-policy.ts',
  'package.json',
  'AGENTS.md',
  'CLAUDE.md',
  '.vibe/harness/pi-runtime.json',
  '.vibe/harness/pi-runtime-assets.json',
];
const currentProductHashes = {};
for (const relPath of expectedFixtureFiles) {
  const abs = join(productRoot, relPath);
  assert(existsSync(abs), `product fixture missing ${relPath}`);
  currentProductHashes[relPath] = existsSync(abs) ? sha256(abs) : null;
  const comparison = (positive.comparisons ?? []).find((entry) => entry.path === relPath);
  assert(comparison?.productSha256 === currentProductHashes[relPath], `product fixture hash drift for ${relPath}`);
}
const productSkillFiles = listFiles(join(productRoot, '.pi/skills')).filter((file) => file.endsWith('/SKILL.md')).map((file) => relative(productRoot, file)).sort();
const productPromptFiles = listFiles(join(productRoot, '.pi/prompts')).filter((file) => file.endsWith('.md')).map((file) => relative(productRoot, file)).sort();
assert(productSkillFiles.length === 6, `current product skill file count mismatch: ${productSkillFiles.length}`);
assert(productPromptFiles.length === 6, `current product prompt file count mismatch: ${productPromptFiles.length}`);
assert(productPromptFiles.every((path) => !relative('.pi/prompts', path).includes('/')), 'current product prompt files include nested prompt');

const generatorSource = readText(join(repo, 'packages/adapters/pi/src/generators/runtime-fixture-generator.ts'));
for (const token of ['getPiAdapterCapabilityMatrix', 'getPiGeneratedFileManifest', 'validateCapabilityMatrix', 'validateGeneratedFileManifest', 'SKILL_IDS', 'GeneratedFileFamilyId']) {
  assert(generatorSource.includes(token), `generator source missing typed I-14A token ${token}`);
}
const validationSource = readText(join(repo, 'packages/adapters/pi/src/runtime/validation.ts'));
const writePlanSource = readText(join(repo, 'packages/adapters/pi/src/runtime/write-plan.ts'));
assert(validationSource.includes('GENERATED_FILE_FAMILY_IDS'), 'runtime validator missing typed I-14A generated-file family universe');
for (const code of ['runtime_execution_claim_requires_live_evidence', 'prompt_template_not_discoverable', 'extension_weakens_default_deny', 'symlink_write_escape', 'unsupported_non_pi_adapter_selection']) {
  assert(validationSource.includes(code) || writePlanSource.includes(code), `validator/write-plan missing issue code ${code}`);
}
const loaderSource = readText(join(repo, 'packages/adapters/pi/src/loader-witness/index.ts'));
for (const token of ['createPiRpcGetCommandsRequest', 'parsePiRpcGetCommandsResponse', 'evaluatePiLoaderWitnessResponse', 'pending-live/BLOCKED']) {
  assert(loaderSource.includes(token), `loader witness source missing ${token}`);
}

const scopedStatus = spawnSync('git', [
  '-C', repo, 'status', '--short', '--',
  'packages/adapters/pi/src/runtime',
  'packages/adapters/pi/src/generators',
  'packages/adapters/pi/src/loader-witness',
  'examples/harness-integrations/pi/runtime-fixtures',
  '.vibe/work/I-14B-pi-adapter-runtime-skill-consumption',
  'packages/adapters/pi/src/capabilities',
  'packages/adapters/pi/src/generated-file-manifest',
  'packages/adapters/pi/src/schema',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.base.json',
  'packages/adapters/pi/package.json',
], { encoding: 'utf8' });
notes.push({ gitStatusExit: scopedStatus.status, gitStatusStderr: scopedStatus.stderr, gitStatusStdout: scopedStatus.stdout });

const result = {
  ok: errors.length === 0,
  verdictIfNoExternalChanges: errors.length === 0 ? 'PASS' : 'BLOCKED_OR_NEEDS_FIX',
  severityIfNoExternalChanges: errors.length === 0 ? 'clean' : 'not-clean',
  errors,
  livePiProof: {
    status: live.livePiLoaderProof,
    command: live.command,
    stdinJsonl: live.stdinJsonl,
    runs: liveRunSummaries,
  },
  evidence: {
    staticResult,
    positiveSummary: {
      ok: positive.ok,
      assetCount: positive.fixture?.assetCount,
      assetsWithManifestCount: positive.fixture?.assetsWithManifestCount,
      comparisonCount: (positive.comparisons ?? []).length,
    },
    negativeSummary: { ok: negative.ok, caseCount: negative.caseCount, failedCount: negative.failedCount },
    regressionSummary: {
      ok: regression.ok,
      i14aCapabilityValidation: regression.i14a?.capabilityValidation,
      i14aManifestValidation: regression.i14a?.manifestValidation,
      piRuntimeClaimInI14A: regression.i14a?.piRuntimeClaimInI14A,
    },
    fixtureSummary: {
      skillCount: fixtureReview.skillCount,
      promptCount: fixtureReview.promptCount,
      extensionFiles: fixtureReview.extensionFiles,
      packagePi: fixtureReview.packagePi,
    },
  },
  currentChecks: {
    productionJsFiles: currentProductionJs.map((file) => relative(repo, file)),
    productSkillFiles,
    productPromptFiles,
    currentProductHashes,
    currentI14aHashes,
    currentProtectedHashes,
  },
  dirtyTreeSafety: {
    conclusion: 'no concrete ownership violation detected; no product edits were made by finisher; repo status remains no-HEAD/untracked-baseline attributable only by scoped inventories/hashes',
    scopedStatus: notes[0],
  },
};
writeFileSync(join(finalDir, 'finisher-closure-check.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: result.ok, errors: result.errors, livePiProof: result.livePiProof.status, checkedLiveRuns: result.livePiProof.runs.length }, null, 2));
process.exit(result.ok ? 0 : 1);
