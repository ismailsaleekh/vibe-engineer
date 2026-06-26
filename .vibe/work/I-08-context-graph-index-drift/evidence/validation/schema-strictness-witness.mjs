import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const repoRoot = process.env.TARGET_REPO_ROOT;
const evidenceRoot = process.env.VALIDATION_EVIDENCE_ROOT;
if (!repoRoot || !evidenceRoot) throw new Error('TARGET_REPO_ROOT and VALIDATION_EVIDENCE_ROOT required');
const schemaDir = path.join(repoRoot, '.vibe/context/schema');
const outputPath = path.join(evidenceRoot, 'schema-strictness-witness-result.json');
async function load(name) { return JSON.parse(await readFile(path.join(schemaDir, name), 'utf8')); }
const schemas = {
  graph: await load('context-graph-v1.schema.json'),
  index: await load('context-index-v1.schema.json'),
  area: await load('context-area-v1.schema.json'),
  summary: await load('context-summary-v1.schema.json'),
  closure: await load('retrieval-closure-v1.schema.json')
};

const strictCompile = {};
for (const [name, schema] of Object.entries(schemas)) {
  const ajv = new Ajv2020({ strict: true, allErrors: true, validateSchema: true });
  try {
    ajv.compile(schema);
    strictCompile[name] = { ok: true };
  } catch (error) {
    strictCompile[name] = { ok: false, message: error.message };
  }
}

const permissiveAjv = new Ajv2020({ strict: false, allErrors: true, validateSchema: true });
const validators = Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, permissiveAjv.compile(schema)]));
const malformedButAccepted = [];
function record(name, validate, value) {
  const ok = validate(value);
  if (ok) malformedButAccepted.push(name);
  return { name, ok, errors: validate.errors ?? [] };
}
const results = [];
results.push(record('graph accepts source/node/link objects with no stable ids, citations, fingerprints, header refs, or link refs', validators.graph, {
  schemaVersion: '1.0.0', artifactKind: 'context_graph', graphId: 'g', indexVersion: '1.0.0', producer: {}, generatedAt: 'not-a-time', schemaRefs: {}, sources: [{}], nodes: [{}], edges: [{}], links: [{}], retrievalPolicy: {}
}));
results.push(record('index accepts empty graphRef/headerRef/nodeRefs/sourceRefs objects', validators.index, {
  schemaVersion: '1.0.0', artifactKind: 'context_index', indexId: 'i', indexVersion: '1.0.0', producer: {}, generatedAt: 'not-a-time', graphRef: {}, headerRef: {}, nodeRefs: [{}], sourceRefs: [{}], schemaRef: 'https://schemas.vibe-engineer.dev/context/v1/context-index.schema.json'
}));
results.push(record('area accepts context array items with no contextId/level/mandatory/text and empty metadata objects', validators.area, {
  schemaVersion: '1.0.0', artifactKind: 'context_area', areaId: 'a', title: 'A', owner: 'owner', level: 1, mandatory: true, sourceRefs: ['src'], context: [{}], scope: {}, updateMetadata: {}, driftMetadata: {}, schemaRef: 'https://schemas.vibe-engineer.dev/context/v1/context-area.schema.json'
}));
results.push(record('summary accepts empty update/drift metadata and expandable refs without item shape', validators.summary, {
  schemaVersion: '1.0.0', artifactKind: 'context_summary', summaryId: 's', title: 'S', areaId: 'a', level: 2, mandatory: false, summary: 'summary', sourceRefs: ['src'], derivedFromNodeIds: ['ctx'], updateMetadata: {}, driftMetadata: {}, expandableToSourceRefs: [{}], schemaRef: 'https://schemas.vibe-engineer.dev/context/v1/context-summary.schema.json'
}));
results.push(record('retrieval closure accepts empty task object, arbitrary level item shape, malformed citation/diagnostic objects', validators.closure, {
  ok: true, blocked: false, status: 'clean', schemaVersion: '1.0.0', artifactKind: 'context_retrieval_closure', closureId: 'c', task: {}, levels: { '0': [{}], '1': [{}], '2': [{}], '3': [{}], '4': [{}] }, citations: [{}], omittedOptionalContext: [{}], diagnostics: [{}], findings: [{}], schemaRef: 'https://schemas.vibe-engineer.dev/context/v1/retrieval-closure.schema.json'
}));
const strictFailures = Object.entries(strictCompile).filter(([, value]) => !value.ok).map(([name, value]) => ({ name, ...value }));
const output = {
  ok: malformedButAccepted.length === 0 && strictFailures.length === 0,
  strictCompile,
  strictFailures,
  malformedButAccepted,
  permissiveValidationResults: results
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
if (!output.ok) {
  console.error(`schema strictness failures: strictCompile=${strictFailures.map((item) => item.name).join(',') || 'none'} malformedAccepted=${malformedButAccepted.length}`);
  console.error(outputPath);
  process.exit(1);
}
console.log(`schema strictness witness ok: ${outputPath}`);
