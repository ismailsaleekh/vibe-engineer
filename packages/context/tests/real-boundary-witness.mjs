import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateArtifactFile } from '@vibe-engineer/artifacts';
import {
  __providerSeams,
  checkContextDrift,
  retrieveContextClosure,
  validateContextProject,
  writeContextProject
} from '@vibe-engineer/context';

const repoRoot = path.resolve(path.join(import.meta.dirname, '..', '..', '..'));
const defaultRunRoot = await mkdtemp(path.join(os.tmpdir(), 'vibe-context-real-boundary-'));
const runRoot = path.resolve(process.env.VIBE_CONTEXT_WITNESS_ROOT ?? defaultRunRoot);
const projectRoot = path.join(runRoot, 'fixture-project');
const evidencePath = path.resolve(process.env.VIBE_CONTEXT_EVIDENCE_PATH ?? path.join(runRoot, 'evidence', 'real-boundary-witness-result.json'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

await rm(projectRoot, { recursive: true, force: true });
await mkdir(path.dirname(evidencePath), { recursive: true });

assert(typeof validateArtifactFile === 'function', 'public artifacts validateArtifactFile seam is unavailable');
assert(__providerSeams.artifactsValidateArtifactFileType === 'function', 'context package did not bind public artifacts validator');

const writeResult = await writeContextProject({
  projectRoot,
  reset: true,
  generatedAt: '2026-06-24T00:00:00.000Z'
});
assert(writeResult.ok === true, 'writer did not complete');

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
  '.vibe/work/I-08-context-graph-index-drift/implementation-plan.json',
  '.vibe/evidence/I-08-context-graph-index-drift/evidence.json',
  'docs/decisions/DL-09-context-memory-drift.md'
];
for (const relativePath of requiredPaths) {
  const filePath = path.join(projectRoot, relativePath);
  const exists = await import('node:fs/promises').then(({ access }) => access(filePath).then(() => true, () => false));
  assert(exists, `writer missed required carrier/link path ${relativePath}`);
}

const providerHeaderResult = validateArtifactFile(path.join(projectRoot, '.vibe/context/areas/core-contracts.header.json'), { kind: 'context_file_header' });
assert(providerHeaderResult.ok === true, 'written context header did not validate through public artifacts provider');

const graph = await readJson(path.join(projectRoot, '.vibe/context/index/context-graph.json'));
const area = await readJson(path.join(projectRoot, '.vibe/context/areas/core-contracts.context.json'));
const graphCitationIds = new Set(graph.sources.flatMap((source) => source.citations.map((citation) => citation.citationId)));
const areaItemCitationRefs = area.context.flatMap((item) => item.citationRefs ?? []);
assert(areaItemCitationRefs.length > 0, 'writer did not emit item-level citationRefs');
for (const citationRef of areaItemCitationRefs) assert(graphCitationIds.has(citationRef), `writer emitted dangling item-level citationRef ${citationRef}`);

const validation = await validateContextProject(projectRoot);
assert(validation.ok === true, `validator expected clean context, got ${validation.findings.map((finding) => finding.code).join(',')}`);
const drift = await checkContextDrift(projectRoot);
assert(drift.ok === true, `drift checker expected clean context, got ${drift.findings.map((finding) => finding.code).join(',')}`);

const closure = await retrieveContextClosure(projectRoot, {
  task: {
    taskId: 'task:real-boundary',
    role: 'implementer',
    affectedAreas: ['core-contracts'],
    purpose: 'prove context closure retrieval'
  },
  maxLevel: 4
});
assert(closure.ok === true && closure.blocked === false, 'retriever unexpectedly blocked valid closure');
assert(closure.levels['1'].some((item) => item.mandatory === true), 'retriever did not return mandatory Level 1 context');
assert(closure.levels['1'].some((item) => Array.isArray(item.citationRefs) && item.citationRefs.every((citationRef) => graphCitationIds.has(citationRef))), 'retriever did not preserve valid item-level citationRefs');
assert(closure.levels['2'].length > 0, 'retriever did not return progressive Level 2 summary context');
assert(closure.citations.length > 0, 'retriever did not return source citations');
assert(closure.omittedOptionalContext.length === 0, 'retriever should not omit optional context at maxLevel 4');

const projection = closure.levels['2'][0];
assert(projection.sourceRefs.length > 0, 'summary projection has no source refs');

const evidence = {
  ok: true,
  repoRoot,
  providerSeam: 'public @vibe-engineer/artifacts validateArtifactFile used for on-disk ContextFileHeaderV1',
  runRoot,
  projectRoot,
  evidencePath,
  writtenPaths: requiredPaths,
  graphPath: writeResult.graphPath,
  indexPath: writeResult.indexPath,
  validationStatus: validation.status,
  driftStatus: drift.status,
  closureStatus: closure.status,
  closureLevels: Object.fromEntries(Object.entries(closure.levels).map(([level, items]) => [level, items.length])),
  areaItemCitationRefs,
  closureItemCitationRefs: closure.levels['1'].flatMap((item) => item.citationRefs ?? []),
  citations: closure.citations.map((citation) => ({ citationId: citation.citationId, sourceId: citation.sourceId, contextId: citation.contextId })),
  summaryProjection: { contextId: projection.contextId, sourceRefs: projection.sourceRefs }
};
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(`real-boundary witness ok: ${evidencePath}`);
