import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { retrieveContextClosure, validateContextProject, writeContextProject } from '@vibe-engineer/context';

const evidenceRoot = '/Users/lizavasilyeva/work/vibe-engineer/.vibe/work/I-08-context-graph-index-drift/evidence/residual-revalidation/adversarial-citation';
const negativeRoot = path.join(evidenceRoot, 'negative-projects');
const evidencePath = path.join(evidenceRoot, 'result.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function createCase(name) {
  const projectRoot = path.join(negativeRoot, name);
  await rm(projectRoot, { recursive: true, force: true });
  await writeContextProject({ projectRoot, reset: true, generatedAt: '2026-06-24T00:00:00.000Z' });
  return projectRoot;
}

async function mutateGraph(projectRoot, mutate) {
  const graphPath = path.join(projectRoot, '.vibe/context/index/context-graph.json');
  const graph = await readJson(graphPath);
  mutate(graph);
  await writeJson(graphPath, graph);
}

async function expectBlocked(name, mutate, expectedCodes) {
  const projectRoot = await createCase(name);
  await mutate(projectRoot);
  const validation = await validateContextProject(projectRoot);
  const retrieval = await retrieveContextClosure(projectRoot, {
    task: { taskId: `task:${name}`, role: 'validator', affectedAreas: ['core-contracts'] },
    maxLevel: 4
  });
  const validationCodes = [...new Set(validation.findings.map((finding) => finding.code))].sort();
  const retrievalCodes = [...new Set(retrieval.findings.map((finding) => finding.code))].sort();
  assert(validation.ok === false && validation.status === 'blocked', `${name}: validateContextProject unexpectedly clean (${validationCodes.join(',')})`);
  assert(retrieval.ok === false && retrieval.blocked === true && retrieval.status === 'blocked', `${name}: retrieveContextClosure unexpectedly green (${retrievalCodes.join(',')})`);
  for (const code of expectedCodes) {
    assert(validationCodes.includes(code), `${name}: validation missing ${code}; got ${validationCodes.join(',')}`);
    assert(retrievalCodes.includes(code), `${name}: retrieval missing ${code}; got ${retrievalCodes.join(',')}`);
  }
  return { name, projectRoot, expectedCodes, validationCodes, retrievalCodes };
}

await rm(evidenceRoot, { recursive: true, force: true });
await mkdir(evidenceRoot, { recursive: true });

const cases = [];

cases.push(await expectBlocked('ambiguous-duplicate-citation-id-across-sources', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => {
    graph.sources[1].citations[0].citationId = graph.sources[0].citations[0].citationId;
  });
}, ['INVALID_SOURCE_CITATION']));

cases.push(await expectBlocked('untrusted-item-source-citation-ref', async (projectRoot) => {
  await mutateGraph(projectRoot, (graph) => {
    graph.sources[0].trust = 'untrusted';
  });
}, ['UNTRUSTED_CONTEXT', 'INVALID_SOURCE_CITATION']));

const evidence = {
  ok: true,
  evidenceRoot,
  evidencePath,
  cases
};
await writeJson(evidencePath, evidence);
console.log(`adversarial citation witness ok: ${evidencePath}`);
