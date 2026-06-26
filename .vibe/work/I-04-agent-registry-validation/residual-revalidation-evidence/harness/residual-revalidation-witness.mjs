import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const evidenceRoot = path.join(repoRoot, '.vibe/work/I-04-agent-registry-validation/residual-revalidation-evidence');
const caseRoot = path.join(evidenceRoot, 'cases/residual-revalidation-case-root');
const outputsRoot = path.join(evidenceRoot, 'outputs');

const registryApi = await import(pathToFileURL(path.join(repoRoot, 'packages/registry/src/index.js')).href);
const artifactApi = await import(pathToFileURL(path.join(repoRoot, 'packages/artifacts/src/index.js')).href);

const {
  ARTIFACT_FLOW,
  LOCKED_SKILLS,
  PRODUCT_NAME,
  RegistryRuleId,
  loadRegistry,
  validateRegistryFiles
} = registryApi;
const { validateArtifactFile } = artifactApi;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function relFromRepo(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function copyJsonTree(fromDir, toDir) {
  if (!fs.existsSync(fromDir)) return;
  for (const dirent of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const from = path.join(fromDir, dirent.name);
    const to = path.join(toDir, dirent.name);
    if (dirent.isDirectory()) copyJsonTree(from, to);
    else if (dirent.isFile() && dirent.name.endsWith('.json')) {
      ensureDir(path.dirname(to));
      fs.copyFileSync(from, to);
    }
  }
}

function productFixture(name) {
  return readJson(path.join(repoRoot, 'packages/registry/fixtures/valid/core-set', `${name}.json`));
}

function productCore(name) {
  return readJson(path.join(repoRoot, '.vibe/registry/core-agents', `${name}.json`));
}

function productScoped(name) {
  return readJson(path.join(repoRoot, 'packages/registry/fixtures/valid/scoped', `${name}.json`));
}

function productEvidence(relPath) {
  return readJson(path.join(repoRoot, relPath));
}

function fixtureSet() {
  return ['fixture-orchestrator', 'fixture-specialist', 'fixture-validator', 'fixture-fixer', 'fixture-reviewer', 'fixture-meta-advisor', 'fixture-skill-adapter'].map(productFixture);
}

function fixtureCoreGraphSet() {
  return ['fixture-orchestrator', 'fixture-specialist', 'fixture-validator', 'fixture-fixer', 'fixture-reviewer'].map(productFixture);
}

function prepareCase(name, { copyFixtureEvidence = true, copyCoreEvidence = false, copyResidualEvidence = true } = {}) {
  const root = path.join(caseRoot, name);
  fs.rmSync(root, { recursive: true, force: true });
  const entriesDir = path.join(root, 'entries');
  ensureDir(entriesDir);
  if (copyFixtureEvidence) {
    copyJsonTree(path.join(repoRoot, 'packages/registry/fixtures/evidence'), path.join(root, 'packages/registry/fixtures/evidence'));
  }
  if (copyCoreEvidence) {
    copyJsonTree(path.join(repoRoot, '.vibe/registry/evidence'), path.join(root, '.vibe/registry/evidence'));
  }
  if (copyResidualEvidence) {
    copyJsonTree(path.join(repoRoot, '.vibe/work/I-04-agent-registry-validation/residual-fix-evidence/evidence'), path.join(root, '.vibe/work/I-04-agent-registry-validation/residual-fix-evidence/evidence'));
  }
  return { root, entriesDir };
}

function writeEntries(ctx, entries) {
  for (const entry of entries) writeJson(path.join(ctx.entriesDir, `${entry.agentId ?? entry.artifactId}.json`), entry);
  return ctx.entriesDir;
}

function writeDuplicateEntries(ctx, entry) {
  writeJson(path.join(ctx.entriesDir, 'duplicate-a.json'), entry);
  writeJson(path.join(ctx.entriesDir, 'duplicate-b.json'), entry);
  return ctx.entriesDir;
}

function registryOptions(ctx, extra = {}) {
  return { repoRoot: ctx.root, ...extra };
}

function evidenceRefFromCase(ctx, relPath, artifactId, statusAtLinkTime = 'passed') {
  return { rel: 'evidence_for', artifactKind: 'evidence_packet', artifactId, path: relPath, required: true, statusAtLinkTime };
}

function writeGeneratedEvidence(ctx, name, mutator = (packet) => packet) {
  const packet = clone(productEvidence('packages/registry/fixtures/evidence/fixture-specialist-eval.json'));
  mutator(packet);
  const relPath = `packages/registry/.generated-fixtures/evidence/${name}.json`;
  writeJson(path.join(ctx.root, relPath), packet);
  return { relPath, packet };
}

function makeNonLoadBearingRationale(ctx, entry) {
  return {
    status: 'non_load_bearing',
    rationale: 'Validation-owned positive proves explicit non-load-bearing bypass is typed and evidence-backed.',
    owner: 'I-04-agent-registry-validation',
    decisionRef: 'DL-05-agent-registry-validation-meta',
    evidenceRef: evidenceRefFromCase(
      ctx,
      '.vibe/work/I-04-agent-registry-validation/residual-fix-evidence/evidence/fixture-specialist-non-load-bearing.json',
      'evidence:fixture-specialist:non_load_bearing:residual',
      'passed'
    )
  };
}

function caseResult(label, result, expectedRules, extraChecks = []) {
  const ruleIds = result.errors.map((error) => error.ruleId);
  const missingRules = expectedRules.filter((rule) => !ruleIds.includes(rule));
  const extraFailures = extraChecks.flatMap((check) => check(result, ruleIds) ?? []);
  const pass = result.ok === false && missingRules.length === 0 && extraFailures.length === 0;
  return {
    label,
    pass,
    expectedRules,
    actualOk: result.ok,
    actualRuleIds: ruleIds,
    missingRules,
    extraFailures,
    errors: result.errors.map((error) => ({ entryId: error.entryId, ruleId: error.ruleId, pointer: error.pointer, message: error.message }))
  };
}

function positiveResult(label, result, checks = []) {
  const failures = [];
  if (result.ok !== true) failures.push('result.ok was not true');
  for (const check of checks) {
    const value = check(result);
    if (value) failures.push(value);
  }
  return {
    label,
    pass: failures.length === 0,
    ok: result.ok,
    failures,
    errors: result.errors?.map((error) => ({ entryId: error.entryId, ruleId: error.ruleId, pointer: error.pointer, message: error.message })) ?? []
  };
}

function runCase(label, expectedRules, setup, options = {}, extraChecks = []) {
  const ctx = prepareCase(label.replaceAll(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  const { root = writeEntries(ctx, setup(ctx)), loadOptions = {} } = options.rootFromSetup ? setup(ctx) : { root: null, loadOptions: {} };
  const target = root ?? ctx.entriesDir;
  const result = loadRegistry(target, registryOptions(ctx, loadOptions));
  return caseResult(label, result, expectedRules, extraChecks);
}

function writeAndLoad(label, entries, expectedRules, extraChecks = [], setupOptions = {}) {
  const ctx = prepareCase(label.replaceAll(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), setupOptions);
  writeEntries(ctx, entries);
  const result = loadRegistry(ctx.entriesDir, registryOptions(ctx));
  return caseResult(label, result, expectedRules, extraChecks);
}

fs.rmSync(caseRoot, { recursive: true, force: true });
ensureDir(caseRoot);
ensureDir(outputsRoot);

const positives = [];
const negatives = [];

// Real-boundary positives against actual product carriers and public entrypoint.
const actualCoreRoot = path.join(repoRoot, '.vibe/registry/core-agents');
const actualFixtureRoot = path.join(repoRoot, 'packages/registry/fixtures/valid/core-set');
const actualCoreFiles = fs.readdirSync(actualCoreRoot).filter((name) => name.endsWith('.json')).map((name) => path.join(actualCoreRoot, name));
const actualFixtureFiles = fs.readdirSync(actualFixtureRoot).filter((name) => name.endsWith('.json')).map((name) => path.join(actualFixtureRoot, name));
const actualEvidenceFiles = [
  ...fs.readdirSync(path.join(repoRoot, '.vibe/registry/evidence')).filter((name) => name.endsWith('.json')).map((name) => path.join(repoRoot, '.vibe/registry/evidence', name)),
  ...fs.readdirSync(path.join(repoRoot, 'packages/registry/fixtures/evidence')).filter((name) => name.endsWith('.json')).map((name) => path.join(repoRoot, 'packages/registry/fixtures/evidence', name))
];
const coreBoundary = loadRegistry(actualCoreRoot);
const fixtureBoundary = loadRegistry(actualFixtureRoot);
positives.push(positiveResult('actual core entries load through public registry API', coreBoundary, [
  (result) => result.entries.length === 7 ? null : `expected 7 core entries got ${result.entries.length}`,
  (result) => new Set(result.entries.map((entry) => entry.agentType)).size === 7 ? null : 'core entries do not cover all seven supported agent types',
  (result) => result.entries.filter((entry) => entry.agentType !== 'reviewer').every((entry) => (entry.validatorRefs ?? []).some((ref) => ref.artifactKind === 'agent_registry_entry' && ref.artifactId !== entry.agentId && ref.required === true)) ? null : 'non-reviewer load-bearing core entries lack non-self required validatorRefs',
  (result) => result.entries.every((entry) => String(entry.domainNeutralityReview).includes('PASS')) ? null : 'core entries lack PASS domain-neutrality review',
  (result) => result.entriesById.get('registry-meta-advisor')?.extensions?.['dev.vibe.registry']?.outputAuthority === 'recommendation_only' ? null : 'meta core entry is not recommendation_only'
]));
positives.push(positiveResult('package fixture entries load through public registry API', fixtureBoundary, [
  (result) => result.entries.length === 7 ? null : `expected 7 fixture entries got ${result.entries.length}`,
  (result) => new Set(result.entries.map((entry) => entry.agentType)).size === 7 ? null : 'fixture entries do not cover all seven supported agent types',
  (result) => result.entriesById.get('fixture-skill-adapter')?.extensions?.['dev.vibe.registry']?.linkedSkills?.join('|') === LOCKED_SKILLS.join('|') ? null : 'fixture skill adapter does not preserve six locked skills'
]));
const agentSchemaResults = [...actualCoreFiles, ...actualFixtureFiles].map((file) => ({ path: relFromRepo(file), result: validateArtifactFile(file, { kind: 'agent_registry_entry' }) }));
const evidenceSchemaResults = actualEvidenceFiles.map((file) => ({ path: relFromRepo(file), result: validateArtifactFile(file, { kind: 'evidence_packet' }) }));
positives.push({
  label: 'I-01A validates actual agent_registry_entry and evidence_packet carriers',
  pass: agentSchemaResults.every((item) => item.result.ok) && evidenceSchemaResults.every((item) => item.result.ok),
  agentCarrierCount: agentSchemaResults.length,
  evidenceCarrierCount: evidenceSchemaResults.length,
  failingAgents: agentSchemaResults.filter((item) => !item.result.ok).map((item) => item.path),
  failingEvidence: evidenceSchemaResults.filter((item) => !item.result.ok).map((item) => item.path)
});
positives.push({
  label: 'product invariants',
  pass: PRODUCT_NAME === 'vibe-engineer'
    && JSON.stringify([...LOCKED_SKILLS]) === JSON.stringify(['brainstorm', 'grill-me', 'task', 'plan', 'build', 'ship'])
    && JSON.stringify([...ARTIFACT_FLOW]) === JSON.stringify(['raw_intent', 'work_brief', 'implementation_plan', 'build_result', 'ship_packet'])
    && !fs.existsSync(path.join(repoRoot, 'packages/core'))
    && !JSON.stringify(readJson(path.join(repoRoot, 'packages/registry/package.json'))).includes('@vibe-engineer/testing'),
  productName: PRODUCT_NAME,
  lockedSkills: [...LOCKED_SKILLS],
  artifactFlow: [...ARTIFACT_FLOW],
  packagesCoreExists: fs.existsSync(path.join(repoRoot, 'packages/core'))
});

// Valid explicit non-load-bearing rationale positive using validation-owned carrier root plus existing Q06 residual-fix evidence copied into the case root.
{
  const ctx = prepareCase('valid-explicit-non-load-bearing-rationale');
  const entry = productFixture('fixture-specialist');
  entry.validatorRefs = [];
  entry.fixerRefs = [];
  entry.links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: 'fixture-specialist.json', required: true, statusAtLinkTime: 'active' }];
  entry.extensions['dev.vibe.registry'].allowDormant = true;
  entry.extensions['dev.vibe.registry'].nonLoadBearingRationale = makeNonLoadBearingRationale(ctx, entry);
  writeEntries(ctx, [entry]);
  positives.push(positiveResult('valid explicit evidence-backed non_load_bearing rationale passes only under typed policy', loadRegistry(ctx.entriesDir, registryOptions(ctx))));
}

// Residual validator-linkage negatives.
{
  const entries = fixtureCoreGraphSet();
  entries.find((entry) => entry.agentId === 'fixture-specialist').validatorRefs = [];
  negatives.push(writeAndLoad('connected active stable/core specialist with empty validatorRefs rejects', entries, [RegistryRuleId.REQUIRED_VALIDATOR]));
}
{
  const entries = fixtureCoreGraphSet();
  delete entries.find((entry) => entry.agentId === 'fixture-specialist').validatorRefs;
  negatives.push(writeAndLoad('active stable/core specialist with omitted validatorRefs rejects', entries, [RegistryRuleId.SCHEMA_I01A]));
}
{
  const entries = fixtureCoreGraphSet();
  const specialist = entries.find((entry) => entry.agentId === 'fixture-specialist');
  specialist.validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: 'fixture-specialist', path: 'fixture-specialist.json', required: true, statusAtLinkTime: 'active' }];
  negatives.push(writeAndLoad('active stable/core specialist with self-only validatorRef rejects', entries, [RegistryRuleId.SELF_VALIDATION_ONLY, RegistryRuleId.REQUIRED_VALIDATOR]));
}
{
  const entries = fixtureCoreGraphSet();
  entries.find((entry) => entry.agentId === 'fixture-specialist').validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: 'fixture-validator', path: 'fixture-validator.json', required: false, statusAtLinkTime: 'active' }];
  negatives.push(writeAndLoad('active stable/core specialist with optional-only validatorRef rejects', entries, [RegistryRuleId.REQUIRED_VALIDATOR]));
}
{
  const entries = fixtureCoreGraphSet();
  entries.find((entry) => entry.agentId === 'fixture-specialist').validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: 'missing-validator', path: 'missing-validator.json', required: true, statusAtLinkTime: 'active' }];
  negatives.push(writeAndLoad('missing validator target rejects as ref_resolution', entries, [RegistryRuleId.REF_RESOLUTION], [
    (result, rules) => rules.includes(RegistryRuleId.REF_TYPE_COMPATIBILITY) ? ['missing validator target was misclassified as ref_type_compatibility'] : []
  ]));
}
for (const [targetName, label] of [['fixture-fixer', 'fixer'], ['fixture-orchestrator', 'orchestrator'], ['fixture-specialist', 'specialist']]) {
  const entries = fixtureCoreGraphSet();
  entries.find((entry) => entry.agentId === 'fixture-specialist').validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: targetName, path: `${targetName}.json`, required: true, statusAtLinkTime: 'active' }];
  negatives.push(writeAndLoad(`validatorRef targeting ${label} rejects type compatibility`, entries, [RegistryRuleId.REF_TYPE_COMPATIBILITY]));
}

// Dormant/deprecated/sample/no-rationale bypass negatives and typed positive coverage.
{
  const entry = productFixture('fixture-specialist');
  entry.validatorRefs = [];
  entry.fixerRefs = [];
  entry.links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: 'fixture-specialist.json', required: true, statusAtLinkTime: 'active' }];
  entry.extensions['dev.vibe.registry'].allowDormant = true;
  negatives.push(writeAndLoad('bare allowDormant=true does not bypass graph or required-validator policy', [entry], [RegistryRuleId.DORMANT_RATIONALE, RegistryRuleId.REQUIRED_VALIDATOR, RegistryRuleId.UNLINKED_STABLE_CORE]));
}
{
  const entry = productFixture('fixture-validator');
  entry.agentId = entry.artifactId = 'unused-bare-dormant-validator';
  entry.validatorRefs = [];
  entry.links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: 'unused-bare-dormant-validator.json', required: true, statusAtLinkTime: 'active' }];
  entry.extensions['dev.vibe.registry'].allowDormant = true;
  negatives.push(writeAndLoad('bare allowDormant=true does not bypass unused validator policy', [entry], [RegistryRuleId.DORMANT_RATIONALE, RegistryRuleId.REQUIRED_VALIDATOR, RegistryRuleId.UNLINKED_STABLE_CORE, RegistryRuleId.UNUSED_VALIDATOR_FIXER]));
}
{
  const entry = productFixture('fixture-specialist');
  entry.validatorRefs = [];
  entry.fixerRefs = [];
  entry.links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: 'fixture-specialist.json', required: true, statusAtLinkTime: 'active' }];
  entry.extensions['dev.vibe.registry'].allowDormant = true;
  entry.extensions['dev.vibe.registry'].nonLoadBearingRationale = { status: 'non_load_bearing', rationale: 'missing required owner/decision/evidence fields' };
  negatives.push(writeAndLoad('non-load-bearing rationale missing owner decision evidence rejects', [entry], [RegistryRuleId.DORMANT_RATIONALE]));
}
{
  const entry = productFixture('fixture-specialist');
  entry.validatorRefs = [];
  entry.fixerRefs = [];
  entry.links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: 'fixture-specialist.json', required: true, statusAtLinkTime: 'active' }];
  entry.extensions['dev.vibe.registry'].allowDormant = true;
  entry.extensions['dev.vibe.registry'].nonLoadBearingRationale = { rationale: 'missing state/status', owner: 'q06', decisionRef: 'DL-05', evidenceRef: entry.evals[0] };
  negatives.push(writeAndLoad('rationale missing status/state rejects', [entry], [RegistryRuleId.DORMANT_RATIONALE]));
}
{
  const entry = productFixture('fixture-specialist');
  entry.validatorRefs = [];
  entry.fixerRefs = [];
  entry.links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: 'fixture-specialist.json', required: true, statusAtLinkTime: 'active' }];
  entry.extensions['dev.vibe.registry'].allowDormant = true;
  entry.extensions['dev.vibe.registry'].dormantRationale = { status: 'dormant', rationale: 'active dormant contradiction', owner: 'q06', decisionRef: 'DL-05', evidenceRef: entry.evals[0] };
  negatives.push(writeAndLoad('contradictory active+dormant rationale rejects', [entry], [RegistryRuleId.DORMANT_RATIONALE]));
}
{
  const entry = productFixture('fixture-specialist');
  entry.status = 'deprecated';
  entry.deprecation = { deprecatedAt: '2026-06-23T00:00:00Z' };
  entry.supersessionReason = '';
  delete entry.extensions['dev.vibe.registry'].supersededBy;
  negatives.push(writeAndLoad('deprecated entry without supersession/rationale rejects', [entry], [RegistryRuleId.DEPRECATION_SUPERSESSION]));
}
{
  const sample = productScoped('sample-demo');
  negatives.push(writeAndLoad('sample/demo fixture rejects without explicit sample option', [sample], [RegistryRuleId.SCOPE_CLASSIFICATION]));
}
{
  const sample = productScoped('sample-demo');
  sample.extensions['dev.vibe.registry'].isolated = false;
  const ctx = prepareCase('sample-demo-without-isolation');
  writeEntries(ctx, [sample]);
  const result = loadRegistry(ctx.entriesDir, registryOptions(ctx, { allowSamples: true }));
  negatives.push(caseResult('sample/demo with explicit option but missing isolation rejects', result, [RegistryRuleId.SCOPE_CLASSIFICATION]));
}
{
  const project = productScoped('project-extension');
  negatives.push(writeAndLoad('project-extension fixture rejects unless project_extension scope explicitly enabled', [project], [RegistryRuleId.SCOPE_CLASSIFICATION]));
}

// Graph/orphan regressions.
{
  const entry = productFixture('fixture-specialist');
  entry.validatorRefs = [];
  entry.fixerRefs = [];
  entry.links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: entry.agentId, path: 'fixture-specialist.json', required: true, statusAtLinkTime: 'active' }];
  negatives.push(writeAndLoad('self-only registry_entry_for link does not satisfy reachability', [entry], [RegistryRuleId.UNLINKED_STABLE_CORE]));
}
{
  const entries = fixtureSet();
  entries.find((entry) => entry.agentId === 'fixture-specialist').links = [{ rel: 'context_for', artifactKind: 'agent_registry_entry', artifactId: 'missing-linked-entry', path: 'missing-linked-entry.json', required: true, statusAtLinkTime: 'active' }];
  negatives.push(writeAndLoad('top-level non-self agent_registry_entry link to missing target rejects', entries, [RegistryRuleId.REF_RESOLUTION]));
}
{
  const ctx = prepareCase('duplicate-agent-ids');
  writeDuplicateEntries(ctx, productFixture('fixture-specialist'));
  negatives.push(caseResult('duplicate IDs reject', loadRegistry(ctx.entriesDir, registryOptions(ctx)), [RegistryRuleId.DUPLICATE_ID]));
}
{
  const entries = fixtureSet();
  const groupB = [productCore('core-specialist'), productCore('registry-quality-validator'), productCore('registry-reviewer')];
  groupB.find((entry) => entry.agentId === 'core-specialist').links = [
    { rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: 'core-specialist', path: 'core-specialist.json', required: true, statusAtLinkTime: 'active' },
    { rel: 'context_for', artifactKind: 'agent_registry_entry', artifactId: 'registry-quality-validator', path: 'registry-quality-validator.json', required: true, statusAtLinkTime: 'active' }
  ];
  groupB.find((entry) => entry.agentId === 'registry-quality-validator').links = [
    { rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: 'registry-quality-validator', path: 'registry-quality-validator.json', required: true, statusAtLinkTime: 'active' },
    { rel: 'context_for', artifactKind: 'agent_registry_entry', artifactId: 'registry-reviewer', path: 'registry-reviewer.json', required: true, statusAtLinkTime: 'active' }
  ];
  groupB.find((entry) => entry.agentId === 'registry-reviewer').links = [
    { rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: 'registry-reviewer', path: 'registry-reviewer.json', required: true, statusAtLinkTime: 'active' },
    { rel: 'context_for', artifactKind: 'agent_registry_entry', artifactId: 'registry-quality-validator', path: 'registry-quality-validator.json', required: true, statusAtLinkTime: 'active' }
  ];
  const ctx = prepareCase('disconnected-active-stable-core-component', { copyCoreEvidence: true });
  writeEntries(ctx, [...entries, ...groupB]);
  negatives.push(caseResult('disconnected active stable/core component rejects', loadRegistry(ctx.entriesDir, registryOptions(ctx)), [RegistryRuleId.UNLINKED_STABLE_CORE]));
}
{
  const entries = [productFixture('fixture-validator'), productFixture('fixture-reviewer')];
  entries[0].links = [
    { rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: 'fixture-validator', path: 'fixture-validator.json', required: true, statusAtLinkTime: 'active' },
    { rel: 'context_for', artifactKind: 'agent_registry_entry', artifactId: 'fixture-reviewer', path: 'fixture-reviewer.json', required: true, statusAtLinkTime: 'active' }
  ];
  entries[1].links = [
    { rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: 'fixture-reviewer', path: 'fixture-reviewer.json', required: true, statusAtLinkTime: 'active' }
  ];
  negatives.push(writeAndLoad('unused validator rejects where policy requires', entries, [RegistryRuleId.UNUSED_VALIDATOR_FIXER]));
}

// Evidence-reference regressions.
{
  const entry = productFixture('fixture-specialist');
  entry.evals[0].path = 'packages/registry/fixtures/evidence/missing-eval.json';
  negatives.push(writeAndLoad('missing eval evidence rejects', [entry], [RegistryRuleId.MATURITY_EVIDENCE]));
}
{
  const entry = productFixture('fixture-specialist');
  entry.extensions['dev.vibe.registry'].smokeRefs[0].path = 'packages/registry/fixtures/evidence/missing-smoke.json';
  negatives.push(writeAndLoad('missing smoke evidence rejects', [entry], [RegistryRuleId.MATURITY_EVIDENCE]));
}
{
  const entry = productFixture('fixture-specialist');
  entry.evals[0].path = '../../outside-evidence.json';
  negatives.push(writeAndLoad('path traversal/out-of-owned evidence path rejects', [entry], [RegistryRuleId.MATURITY_EVIDENCE]));
}
{
  const entry = productFixture('fixture-specialist');
  entry.evals[0].artifactId = 'evidence:fixture-specialist:wrong-id';
  negatives.push(writeAndLoad('evidence artifactId/path mismatch rejects', [entry], [RegistryRuleId.MATURITY_EVIDENCE]));
}
{
  const ctx = prepareCase('wrong-evidence-kind');
  const entry = productFixture('fixture-specialist');
  const relPath = 'packages/registry/.generated-fixtures/evidence/not-evidence-packet.json';
  writeJson(path.join(ctx.root, relPath), productFixture('fixture-validator'));
  entry.evals[0].path = relPath;
  entry.evals[0].artifactId = 'fixture-validator';
  writeEntries(ctx, [entry]);
  negatives.push(caseResult('wrong evidence kind rejects through I-01A evidence_packet validation', loadRegistry(ctx.entriesDir, registryOptions(ctx)), [RegistryRuleId.MATURITY_EVIDENCE]));
}
{
  const ctx = prepareCase('failed-evidence-status');
  const entry = productFixture('fixture-specialist');
  const { relPath, packet } = writeGeneratedEvidence(ctx, 'failed-eval', (packet) => {
    packet.status = 'failed';
    packet.result = 'fail';
    packet.failureDetails = { code: 'INTENTIONAL_FAILURE', message: 'validation-owned failed evidence negative', classification: 'deterministic_product_or_code_failure' };
    return packet;
  });
  entry.evals[0] = evidenceRefFromCase(ctx, relPath, packet.artifactId);
  writeEntries(ctx, [entry]);
  negatives.push(caseResult('failed/stale evidence status rejects', loadRegistry(ctx.entriesDir, registryOptions(ctx)), [RegistryRuleId.MATURITY_EVIDENCE]));
}
{
  const ctx = prepareCase('subject-ref-mismatch');
  const entry = productFixture('fixture-specialist');
  const { relPath, packet } = writeGeneratedEvidence(ctx, 'subject-mismatch', (packet) => {
    packet.subjectRefs[0].artifactId = 'fixture-validator';
    packet.links[0].artifactId = 'fixture-validator';
    return packet;
  });
  entry.evals[0] = evidenceRefFromCase(ctx, relPath, packet.artifactId);
  writeEntries(ctx, [entry]);
  negatives.push(caseResult('subjectRef mismatch rejects', loadRegistry(ctx.entriesDir, registryOptions(ctx)), [RegistryRuleId.MATURITY_EVIDENCE]));
}
{
  const ctx = prepareCase('agent-id-mismatch');
  const entry = productFixture('fixture-specialist');
  const { relPath, packet } = writeGeneratedEvidence(ctx, 'agent-id-mismatch', (packet) => {
    packet.extensions['dev.vibe.registry.evidence'].agentId = 'fixture-validator';
    return packet;
  });
  entry.evals[0] = evidenceRefFromCase(ctx, relPath, packet.artifactId);
  writeEntries(ctx, [entry]);
  negatives.push(caseResult('evidence agent id mismatch rejects', loadRegistry(ctx.entriesDir, registryOptions(ctx)), [RegistryRuleId.MATURITY_EVIDENCE]));
}
{
  const ctx = prepareCase('agent-version-mismatch');
  const entry = productFixture('fixture-specialist');
  const { relPath, packet } = writeGeneratedEvidence(ctx, 'agent-version-mismatch', (packet) => {
    packet.extensions['dev.vibe.registry.evidence'].agentVersion = '9.9.9';
    return packet;
  });
  entry.evals[0] = evidenceRefFromCase(ctx, relPath, packet.artifactId);
  writeEntries(ctx, [entry]);
  negatives.push(caseResult('evidence agent version mismatch rejects', loadRegistry(ctx.entriesDir, registryOptions(ctx)), [RegistryRuleId.MATURITY_EVIDENCE]));
}
{
  const ctx = prepareCase('evidence-type-mismatch');
  const entry = productFixture('fixture-specialist');
  const { relPath, packet } = writeGeneratedEvidence(ctx, 'evidence-type-mismatch', (packet) => {
    packet.extensions['dev.vibe.registry.evidence'].evidenceType = 'smoke';
    return packet;
  });
  entry.evals[0] = evidenceRefFromCase(ctx, relPath, packet.artifactId);
  writeEntries(ctx, [entry]);
  negatives.push(caseResult('evidence-type mismatch rejects', loadRegistry(ctx.entriesDir, registryOptions(ctx)), [RegistryRuleId.MATURITY_EVIDENCE]));
}

// Validator/fixer target policy and missing-ref classification.
{
  const entries = fixtureCoreGraphSet();
  entries.find((entry) => entry.agentId === 'fixture-specialist').validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: 'fixture-fixer', path: 'fixture-fixer.json', required: true, statusAtLinkTime: 'active' }];
  negatives.push(writeAndLoad('validatorRef-to-fixer rejects', entries, [RegistryRuleId.REF_TYPE_COMPATIBILITY]));
}
for (const [target, label] of [['fixture-validator', 'validator'], ['fixture-reviewer', 'reviewer']]) {
  const entries = fixtureCoreGraphSet();
  entries.find((entry) => entry.agentId === 'fixture-specialist').fixerRefs = [{ rel: 'implements', artifactKind: 'agent_registry_entry', artifactId: target, path: `${target}.json`, required: true, statusAtLinkTime: 'active' }];
  negatives.push(writeAndLoad(`fixerRef-to-${label} rejects`, entries, [RegistryRuleId.REF_TYPE_COMPATIBILITY]));
}
{
  const entries = fixtureCoreGraphSet();
  entries.find((entry) => entry.agentId === 'fixture-specialist').fixerRefs = [{ rel: 'implements', artifactKind: 'agent_registry_entry', artifactId: 'missing-fixer', path: 'missing-fixer.json', required: true, statusAtLinkTime: 'active' }];
  negatives.push(writeAndLoad('missing fixer remains ref_resolution not wrong-type', entries, [RegistryRuleId.REF_RESOLUTION], [
    (result, rules) => rules.includes(RegistryRuleId.REF_TYPE_COMPATIBILITY) ? ['missing fixer target was misclassified as ref_type_compatibility'] : []
  ]));
}

// Existing negative/regression coverage.
{
  const entry = productFixture('fixture-specialist');
  delete entry.owner;
  negatives.push(writeAndLoad('missing metadata rejects', [entry], [RegistryRuleId.SCHEMA_I01A]));
}
{
  const entry = productFixture('fixture-specialist');
  entry.schemaVersion = '9.0.0';
  negatives.push(writeAndLoad('wrong schema version rejects', [entry], [RegistryRuleId.SCHEMA_I01A]));
}
{
  const entry = productFixture('fixture-specialist');
  entry.artifactKind = 'build_result';
  negatives.push(writeAndLoad('wrong artifact kind rejects', [entry], [RegistryRuleId.SCHEMA_I01A]));
}
{
  const entry = productFixture('fixture-specialist');
  entry.inputSchemas = [];
  negatives.push(writeAndLoad('missing schema refs rejects', [entry], [RegistryRuleId.SCHEMA_I01A]));
}
{
  const entries = fixtureCoreGraphSet();
  const entry = entries.find((candidate) => candidate.agentId === 'fixture-specialist');
  entry.outputSchemas[0].schemaId = 'https://schemas.vibe-engineer.dev/artifacts/v1/work-brief.schema.json';
  negatives.push(writeAndLoad('invalid schema refs reject', entries, [RegistryRuleId.MATURITY_EVIDENCE]));
}
{
  const entry = productFixture('fixture-specialist');
  entry.allowedTools = ['bash'];
  entry.forbiddenActions = ['bash'];
  negatives.push(writeAndLoad('allowed-tool/forbidden-action contradiction rejects', [entry], [RegistryRuleId.TOOL_FORBIDDEN_PRECEDENCE]));
}
{
  const entries = [productFixture('fixture-specialist'), productFixture('fixture-reviewer')];
  entries[0].validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: 'fixture-reviewer', path: 'fixture-reviewer.json', required: true, statusAtLinkTime: 'active' }];
  entries[1].validatorRefs = [{ rel: 'verifies', artifactKind: 'agent_registry_entry', artifactId: 'fixture-specialist', path: 'fixture-specialist.json', required: true, statusAtLinkTime: 'active' }];
  entries[0].links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: 'fixture-specialist', path: 'fixture-specialist.json', required: true, statusAtLinkTime: 'active' }, { rel: 'context_for', artifactKind: 'agent_registry_entry', artifactId: 'fixture-reviewer', path: 'fixture-reviewer.json', required: true, statusAtLinkTime: 'active' }];
  entries[1].links = [{ rel: 'registry_entry_for', artifactKind: 'agent_registry_entry', artifactId: 'fixture-reviewer', path: 'fixture-reviewer.json', required: true, statusAtLinkTime: 'active' }, { rel: 'context_for', artifactKind: 'agent_registry_entry', artifactId: 'fixture-specialist', path: 'fixture-specialist.json', required: true, statusAtLinkTime: 'active' }];
  negatives.push(writeAndLoad('independence-defeating validator cycle rejects', entries, [RegistryRuleId.INDEPENDENCE_CYCLE]));
}
{
  const entry = productFixture('fixture-specialist');
  entry.purpose = 'Coordinates ecommerce inventory fashion Billz Telegram Instagram workflows.';
  negatives.push(writeAndLoad('domain leakage rejects in core entries', [entry], [RegistryRuleId.DOMAIN_NEUTRALITY]));
}
{
  const entry = productFixture('fixture-meta-advisor');
  entry.allowedTools = ['write'];
  entry.forbiddenActions = ['push'];
  entry.safety.writesAllowed = true;
  entry.extensions['dev.vibe.registry'].outputAuthority = 'direct_mutation';
  negatives.push(writeAndLoad('meta-agent mutation/auto-registration/direct mutation/push/PR/verification bypass rejects', [entry], [RegistryRuleId.META_AGENT_SAFETY]));
}
{
  const entry = productFixture('fixture-skill-adapter');
  entry.selectedHarnessAdapters = ['pi', 'non-pi'];
  entry.extensions['dev.vibe.registry'].adapterRuntimeImplemented = true;
  negatives.push(writeAndLoad('adapter runtime and non-pi assumptions reject', [entry], [RegistryRuleId.ADAPTER_SCOPE]));
}
{
  const entry = productFixture('fixture-skill-adapter');
  entry.extensions['dev.vibe.registry'].linkedSkills = ['brainstorm', 'unknown-skill'];
  negatives.push(writeAndLoad('unknown skill link rejects', [entry], [RegistryRuleId.SKILL_LINKS]));
}

const summary = {
  ok: positives.every((item) => item.pass) && negatives.every((item) => item.pass),
  positiveCount: positives.length,
  negativeCount: negatives.length,
  positiveFailures: positives.filter((item) => !item.pass),
  negativeFailures: negatives.filter((item) => !item.pass),
  positives,
  negatives,
  caseRoot: path.relative(repoRoot, caseRoot)
};

const outputPath = path.join(outputsRoot, 'residual-revalidation-witness.output.json');
writeJson(outputPath, summary);
console.log(JSON.stringify({ ok: summary.ok, positiveCount: summary.positiveCount, negativeCount: summary.negativeCount, positiveFailures: summary.positiveFailures.length, negativeFailures: summary.negativeFailures.length, outputPath }, null, 2));
if (!summary.ok) process.exit(1);
