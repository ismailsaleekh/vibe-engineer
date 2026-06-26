import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateArtifactFile } from '@vibe-engineer/artifacts';
import * as context from '@vibe-engineer/context';

const evidenceRoot = process.env.VALIDATION_EVIDENCE_ROOT;
if (!evidenceRoot) throw new Error('VALIDATION_EVIDENCE_ROOT is required');
const fixtureRoot = path.join(evidenceRoot, 'fixture-project');
const negativeRoot = path.join(evidenceRoot, 'negative-projects');
const outputPath = path.join(evidenceRoot, 'independent-real-boundary-witness-result.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(filePath) {
  try { await readFile(filePath); return true; } catch { return false; }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function mutateGraph(projectRoot, mutate) {
  const graphPath = path.join(projectRoot, '.vibe/context/index/context-graph.json');
  const graph = await readJson(graphPath);
  mutate(graph);
  await writeJson(graphPath, graph);
}

async function mutateIndex(projectRoot, mutate) {
  const indexPath = path.join(projectRoot, '.vibe/context/index/context-index.json');
  const index = await readJson(indexPath);
  mutate(index);
  await writeJson(indexPath, index);
}

async function mutateSummary(projectRoot, mutate) {
  const summaryPath = path.join(projectRoot, '.vibe/context/summaries/core-contracts-summary.summary.json');
  const summary = await readJson(summaryPath);
  mutate(summary);
  await writeJson(summaryPath, summary);
}

async function mutateArea(projectRoot, mutate) {
  const areaPath = path.join(projectRoot, '.vibe/context/areas/core-contracts.context.json');
  const area = await readJson(areaPath);
  mutate(area);
  await writeJson(areaPath, area);
}

async function createProject(name) {
  const projectRoot = path.join(negativeRoot, name);
  await rm(projectRoot, { recursive: true, force: true });
  await context.writeContextProject({ projectRoot, reset: true, generatedAt: '2026-06-24T00:00:00.000Z' });
  return projectRoot;
}

async function expectNonGreen(name, mutate, expectedCodes, { mode = 'validate' } = {}) {
  const projectRoot = await createProject(name);
  await mutate(projectRoot);
  const result = mode === 'retrieve'
    ? await context.retrieveContextClosure(projectRoot, { task: { taskId: `task:${name}`, role: 'validator', affectedAreas: ['core-contracts'] }, maxLevel: 4 })
    : await context.validateContextProject(projectRoot);
  const actualCodes = (result.findings ?? result.diagnostics ?? []).map((finding) => finding.code).sort();
  const missingCodes = expectedCodes.filter((code) => !actualCodes.includes(code));
  const nonGreen = result.ok === false || result.blocked === true || result.status === 'blocked';
  return { name, expectedCodes, actualCodes, nonGreen, missingCodes, passed: nonGreen && missingCodes.length === 0 };
}

await rm(fixtureRoot, { recursive: true, force: true });
await rm(negativeRoot, { recursive: true, force: true });
await mkdir(evidenceRoot, { recursive: true });

const publicApiFunctions = ['writeContextProject', 'validateContextProject', 'checkContextDrift', 'retrieveContextClosure', 'buildContextIndex', 'createContextHeader'];
const publicApi = Object.fromEntries(publicApiFunctions.map((name) => [name, typeof context[name]]));
assert(publicApiFunctions.every((name) => publicApi[name] === 'function'), `missing context API function: ${JSON.stringify(publicApi)}`);
assert(typeof validateArtifactFile === 'function', 'public artifacts validateArtifactFile unavailable');
assert(context.__providerSeams?.artifactsValidateArtifactFileType === 'function', 'context runtime did not bind public artifacts provider');

const writeResult = await context.writeContextProject({ projectRoot: fixtureRoot, reset: true, generatedAt: '2026-06-24T00:00:00.000Z' });
const requiredPaths = [
  '.vibe/context/areas/core-contracts.context.json',
  '.vibe/context/areas/core-contracts.header.json',
  '.vibe/context/index/context-graph.json',
  '.vibe/context/index/context-graph.header.json',
  '.vibe/context/index/context-index.json',
  '.vibe/context/index/context-index.header.json',
  '.vibe/context/summaries/core-contracts-summary.summary.json',
  '.vibe/context/summaries/core-contracts-summary.header.json',
  '.vibe/context/schema/schema-manifest.json',
  'sources/task-contract.md',
  'sources/verification-contract.md',
  '.vibe/work/I-08-context-graph-index-drift/implementation-plan.json',
  '.vibe/evidence/I-08-context-graph-index-drift/evidence.json',
  'docs/decisions/DL-09-context-memory-drift.md'
];
const missingWrittenPaths = [];
for (const relativePath of requiredPaths) {
  if (!(await exists(path.join(fixtureRoot, relativePath)))) missingWrittenPaths.push(relativePath);
}
assert(missingWrittenPaths.length === 0, `writer missed paths: ${missingWrittenPaths.join(', ')}`);
const providerHeader = validateArtifactFile(path.join(fixtureRoot, '.vibe/context/areas/core-contracts.header.json'), { kind: 'context_file_header' });
assert(providerHeader.ok === true, 'provider did not validate written context header');
const validation = await context.validateContextProject(fixtureRoot);
assert(validation.ok === true, `valid carrier was not clean: ${(validation.findings ?? []).map((f) => f.code).join(',')}`);
const drift = await context.checkContextDrift(fixtureRoot);
assert(drift.ok === true, `drift check was not clean: ${(drift.findings ?? []).map((f) => f.code).join(',')}`);
const closureFull = await context.retrieveContextClosure(fixtureRoot, {
  task: { taskId: 'task:validation-full', role: 'validator', affectedAreas: ['core-contracts'], purpose: 'independent positive witness' },
  maxLevel: 4
});
assert(closureFull.ok === true && closureFull.blocked === false, 'valid full closure was blocked');
assert(closureFull.levels['1'].some((item) => item.mandatory === true), 'missing mandatory level 1 in valid closure');
assert(closureFull.levels['2'].length > 0, 'missing level 2 summary in valid closure');
assert(closureFull.citations.length > 0, 'valid closure has no citations');
const closureLevelOne = await context.retrieveContextClosure(fixtureRoot, {
  task: { taskId: 'task:validation-l1', role: 'validator', affectedAreas: ['core-contracts'], purpose: 'optional omission witness' },
  maxLevel: 1
});
assert(closureLevelOne.ok === true && closureLevelOne.blocked === false, 'level-one closure was blocked');
assert(closureLevelOne.omittedOptionalContext.some((item) => item.contextId === 'ctx-summary:core-contracts-summary' && item.rationale), 'optional omission rationale missing');

const negatives = [];
negatives.push(await expectNonGreen('stale-source-fingerprint', async (projectRoot) => {
  await writeFile(path.join(projectRoot, 'sources/task-contract.md'), '# mutated\n', 'utf8');
}, ['STALE_SOURCE_FINGERPRINT']));
negatives.push(await expectNonGreen('stale-source-version-ref', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { graph.sources[0].versionRef = 'sha256:not-the-current-version'; });
}, ['STALE_SOURCE_VERSION_REF']));
negatives.push(await expectNonGreen('unsupported-context-version', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { graph.schemaVersion = '9.0.0'; });
}, ['UNSUPPORTED_CONTEXT_VERSION']));
negatives.push(await expectNonGreen('unsupported-index-version', async (projectRoot) => {
  await mutateIndex(projectRoot, (index) => { index.indexVersion = '9.0.0'; });
}, ['UNSUPPORTED_INDEX_VERSION']));
negatives.push(await expectNonGreen('missing-required-source-citation', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { graph.sources[0].citations = []; });
}, ['MISSING_SOURCE_CITATION']));
negatives.push(await expectNonGreen('malformed-source-citation-object', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { graph.sources[0].citations = [{}]; });
}, ['INVALID_SOURCE_CITATION']));
negatives.push(await expectNonGreen('broken-source-file', async (projectRoot) => {
  await rm(path.join(projectRoot, 'sources/task-contract.md'), { force: true });
}, ['MISSING_SOURCE_FILE']));
negatives.push(await expectNonGreen('broken-evidence-link', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { graph.links[1].ref.path = '.vibe/evidence/I-08-context-graph-index-drift/missing.json'; });
}, ['BROKEN_CONTEXT_LINK']));
negatives.push(await expectNonGreen('broken-decision-link', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { graph.links[2].ref.path = 'docs/decisions/missing-dl.md'; });
}, ['BROKEN_CONTEXT_LINK']));
negatives.push(await expectNonGreen('mislinked-work-path', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { graph.links[0].ref.path = 'wrong/work-location.json'; });
}, ['MISLINKED_ARTIFACT_PATH', 'BROKEN_CONTEXT_LINK']));
negatives.push(await expectNonGreen('malformed-graph-json', async (projectRoot) => {
  await writeFile(path.join(projectRoot, '.vibe/context/index/context-graph.json'), '{ not-json', 'utf8');
}, ['MALFORMED_JSON']));
negatives.push(await expectNonGreen('malformed-index-json', async (projectRoot) => {
  await writeFile(path.join(projectRoot, '.vibe/context/index/context-index.json'), '{ not-json', 'utf8');
}, ['MALFORMED_JSON']));
negatives.push(await expectNonGreen('malformed-header-json-through-provider', async (projectRoot) => {
  await writeFile(path.join(projectRoot, '.vibe/context/areas/core-contracts.header.json'), '{ not-json', 'utf8');
}, ['INVALID_CONTEXT_HEADER']));
negatives.push(await expectNonGreen('invalid-context-header-through-provider', async (projectRoot) => {
  const headerPath = path.join(projectRoot, '.vibe/context/areas/core-contracts.header.json');
  const header = await readJson(headerPath);
  delete header.producer;
  await writeJson(headerPath, header);
}, ['INVALID_CONTEXT_HEADER']));
negatives.push(await expectNonGreen('wrong-shaped-sources-array', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { graph.sources = {}; });
}, ['MISSING_SOURCE_SET']));
negatives.push(await expectNonGreen('wrong-shaped-nodes-array', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { graph.nodes = {}; });
}, ['MISSING_CONTEXT_NODES', 'MISSING_MANDATORY_LEVEL_1']));
negatives.push(await expectNonGreen('wrong-shaped-area-context-array', async (projectRoot) => {
  await mutateArea(projectRoot, (area) => { area.context = {}; });
}, ['INVALID_AREA_CONTEXT']));
negatives.push(await expectNonGreen('summary-without-source-refs', async (projectRoot) => {
  await mutateSummary(projectRoot, (summary) => { summary.sourceRefs = []; summary.expandableToSourceRefs = []; summary.mandatory = true; });
}, ['SUMMARY_WITHOUT_SOURCE_REFS', 'SUMMARY_ONLY_LOAD_BEARING_TRUTH']));
negatives.push(await expectNonGreen('stale-summary-ref', async (projectRoot) => {
  await mutateSummary(projectRoot, (summary) => { summary.sourceRefs = ['src:missing']; });
}, ['STALE_SUMMARY_SOURCE_REF']));
negatives.push(await expectNonGreen('missing-mandatory-level-one-validator', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { graph.nodes = graph.nodes.filter((node) => !(node.level === 1 && node.mandatory === true)); });
}, ['MISSING_MANDATORY_LEVEL_1']));
negatives.push(await expectNonGreen('missing-mandatory-level-one-retriever', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { graph.nodes = graph.nodes.filter((node) => node.level !== 1); });
}, ['MISSING_MANDATORY_LEVEL_1'], { mode: 'retrieve' }));
negatives.push(await expectNonGreen('path-only-source-ref', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { delete graph.sources[0].artifactRef.artifactId; });
}, ['PATH_ONLY_REFERENCE']));
negatives.push(await expectNonGreen('path-only-link-ref', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { delete graph.links[0].ref.artifactId; });
}, ['PATH_ONLY_REFERENCE']));
negatives.push(await expectNonGreen('untrusted-mandatory-source', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => { graph.sources[0].trust = 'untrusted'; });
}, ['UNTRUSTED_CONTEXT']));

const loadEverything = await context.retrieveContextClosure(await createProject('load-everything-retrieval-request'), { loadEverything: true });
negatives.push({
  name: 'load-everything-retrieval-request',
  expectedCodes: ['LOAD_EVERYTHING_REQUEST', 'MISSING_TASK_SCOPE'],
  actualCodes: loadEverything.findings.map((finding) => finding.code).sort(),
  nonGreen: loadEverything.blocked === true,
  missingCodes: ['LOAD_EVERYTHING_REQUEST'].filter((code) => !loadEverything.findings.map((finding) => finding.code).includes(code)),
  passed: loadEverything.blocked === true && loadEverything.findings.some((finding) => finding.code === 'LOAD_EVERYTHING_REQUEST')
});
const unsafeDomain = await context.retrieveContextClosure(await createProject('unsafe-domain-request'), {
  task: { taskId: 'task:unsafe-domain', role: 'validator', affectedAreas: ['core-contracts'] },
  domainAssumption: { authority: 'inferred-core-default', label: 'forbidden-domain-leak-example' }
});
negatives.push({
  name: 'unsafe-domain-request',
  expectedCodes: ['UNSAFE_INFERRED_DOMAIN_CONTEXT'],
  actualCodes: unsafeDomain.findings.map((finding) => finding.code).sort(),
  nonGreen: unsafeDomain.blocked === true,
  missingCodes: ['UNSAFE_INFERRED_DOMAIN_CONTEXT'].filter((code) => !unsafeDomain.findings.map((finding) => finding.code).includes(code)),
  passed: unsafeDomain.blocked === true && unsafeDomain.findings.some((finding) => finding.code === 'UNSAFE_INFERRED_DOMAIN_CONTEXT')
});

const result = {
  ok: negatives.every((item) => item.passed),
  publicApi,
  providerSeam: {
    artifactsValidateArtifactFile: typeof validateArtifactFile,
    contextBoundProviderType: context.__providerSeams?.artifactsValidateArtifactFileType,
    headerProviderValidationOk: providerHeader.ok
  },
  positive: {
    fixtureRoot,
    writeOk: writeResult.ok,
    writtenPaths: requiredPaths,
    validationStatus: validation.status,
    driftStatus: drift.status,
    closureFull: {
      ok: closureFull.ok,
      blocked: closureFull.blocked,
      levelCounts: Object.fromEntries(Object.entries(closureFull.levels).map(([level, items]) => [level, items.length])),
      citationCount: closureFull.citations.length,
      diagnostics: closureFull.diagnostics
    },
    closureLevelOne: {
      ok: closureLevelOne.ok,
      blocked: closureLevelOne.blocked,
      omittedOptionalContext: closureLevelOne.omittedOptionalContext
    }
  },
  negatives,
  failures: negatives.filter((item) => !item.passed)
};
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
if (!result.ok) {
  console.error(`independent witness found failures: ${result.failures.map((item) => item.name).join(', ')}`);
  console.error(outputPath);
  process.exit(1);
}
console.log(`independent real-boundary witness ok: ${outputPath}`);
