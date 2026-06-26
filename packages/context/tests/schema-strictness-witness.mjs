import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { retrieveContextClosure, writeContextProject } from '@vibe-engineer/context';

const repoRoot = path.resolve(path.join(import.meta.dirname, '..', '..', '..'));
const defaultRunRoot = await mkdtemp(path.join(os.tmpdir(), 'vibe-context-schema-'));
const runRoot = path.resolve(process.env.VIBE_CONTEXT_WITNESS_ROOT ?? defaultRunRoot);
const evidencePath = path.resolve(process.env.VIBE_CONTEXT_EVIDENCE_PATH ?? path.join(runRoot, 'evidence', 'schema-strictness-witness-result.json'));
const schemaRoot = path.join(repoRoot, '.vibe/context/schema');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function loadAjv2020() {
  const pnpmRoot = path.join(repoRoot, 'node_modules/.pnpm');
  const entries = await readdir(pnpmRoot);
  const ajvEntry = entries.find((entry) => entry.startsWith('ajv@8.17.1')) ?? entries.find((entry) => entry.startsWith('ajv@'));
  assert(ajvEntry, 'AJV is unavailable in existing workspace install state; do not add dependencies in I-08');
  const ajvPath = path.join(pnpmRoot, ajvEntry, 'node_modules/ajv/dist/2020.js');
  return (await import(pathToFileURL(ajvPath).href)).default;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

const Ajv2020 = await loadAjv2020();
const ajv = new Ajv2020({ strict: true, allErrors: true, validateSchema: true, messages: true });
const schemaFiles = {
  graph: 'context-graph-v1.schema.json',
  index: 'context-index-v1.schema.json',
  area: 'context-area-v1.schema.json',
  summary: 'context-summary-v1.schema.json',
  retrieval: 'retrieval-closure-v1.schema.json'
};
const schemas = Object.fromEntries(await Promise.all(Object.entries(schemaFiles).map(async ([key, file]) => [key, await readJson(path.join(schemaRoot, file))])));
const validators = Object.fromEntries(Object.entries(schemas).map(([key, schema]) => [key, ajv.compile(schema)]));

const projectRoot = path.join(runRoot, 'schema-valid-project');
const writeResult = await writeContextProject({ projectRoot, reset: true, generatedAt: '2026-06-24T00:00:00.000Z' });
const graph = await readJson(writeResult.graphPath);
const index = await readJson(writeResult.indexPath);
const area = await readJson(writeResult.areaPaths[0]);
const summary = await readJson(writeResult.summaryPaths[0]);
const closure = await retrieveContextClosure(projectRoot, {
  task: { taskId: 'task:schema', role: 'validator', affectedAreas: ['core-contracts'], purpose: 'schema strictness' },
  maxLevel: 4
});

const validCases = { graph, index, area, summary, retrieval: closure };
for (const [key, data] of Object.entries(validCases)) {
  assert(validators[key](data), `${key} schema rejected valid writer output: ${JSON.stringify(validators[key].errors)}`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const malformedCases = [
  ['graph-malformed-source-empty-object', 'graph', () => ({ ...clone(graph), sources: [{}] })],
  ['graph-source-unknown-field', 'graph', () => { const copy = clone(graph); copy.sources[0].unknown = true; return copy; }],
  ['graph-malformed-node-empty-object', 'graph', () => ({ ...clone(graph), nodes: [{}] })],
  ['graph-malformed-link-empty-object', 'graph', () => ({ ...clone(graph), links: [{}] })],
  ['index-malformed-node-ref-empty-object', 'index', () => ({ ...clone(index), nodeRefs: [{}] })],
  ['index-malformed-source-ref-empty-object', 'index', () => ({ ...clone(index), sourceRefs: [{}] })],
  ['area-context-non-array', 'area', () => ({ ...clone(area), context: {} })],
  ['area-context-item-empty-object', 'area', () => ({ ...clone(area), context: [{}] })],
  ['area-context-missing-citation-refs', 'area', () => { const copy = clone(area); delete copy.context[0].citationRefs; return copy; }],
  ['area-context-empty-citation-refs', 'area', () => { const copy = clone(area); copy.context[0].citationRefs = []; return copy; }],
  ['area-context-non-array-citation-refs', 'area', () => { const copy = clone(area); copy.context[0].citationRefs = 'src:task-contract:sha256'; return copy; }],
  ['area-context-non-string-citation-ref-entry', 'area', () => { const copy = clone(area); copy.context[0].citationRefs = [42]; return copy; }],
  ['area-context-empty-string-citation-ref-entry', 'area', () => { const copy = clone(area); copy.context[0].citationRefs = ['']; return copy; }],
  ['summary-missing-source-ref', 'summary', () => ({ ...clone(summary), sourceRefs: [] })],
  ['summary-unknown-metadata', 'summary', () => { const copy = clone(summary); copy.updateMetadata.extra = true; return copy; }],
  ['retrieval-levels-missing-required-key', 'retrieval', () => { const copy = clone(closure); delete copy.levels['4']; return copy; }],
  ['retrieval-malformed-citation-empty-object', 'retrieval', () => ({ ...clone(closure), citations: [{}] })],
  ['retrieval-malformed-level-item-empty-object', 'retrieval', () => { const copy = clone(closure); copy.levels['1'] = [{}]; return copy; }]
];
const rejected = [];
for (const [name, schemaKey, makeData] of malformedCases) {
  const isValid = validators[schemaKey](makeData());
  assert(isValid === false, `${name}: malformed ${schemaKey} data was accepted by schema`);
  rejected.push({ name, schemaKey, errors: validators[schemaKey].errors?.map((error) => ({ instancePath: error.instancePath, keyword: error.keyword, message: error.message })) ?? [] });
}

const evidence = {
  ok: true,
  ajvMode: 'Ajv2020 strict true',
  runRoot,
  evidencePath,
  compiledSchemas: Object.keys(schemas),
  validCases: Object.keys(validCases),
  rejectedMalformedCases: rejected
};
await mkdir(path.dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(`schema strictness witness ok: ${evidencePath}`);
