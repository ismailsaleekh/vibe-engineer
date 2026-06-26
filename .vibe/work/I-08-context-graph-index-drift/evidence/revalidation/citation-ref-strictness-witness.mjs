import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { retrieveContextClosure, validateContextProject, writeContextProject } from '@vibe-engineer/context';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const runRoot = path.join(repoRoot, '.vibe/work/I-08-context-graph-index-drift/evidence/revalidation/citation-ref-probe');
const evidencePath = path.join(runRoot, 'result.json');
const schemaRoot = path.join(repoRoot, '.vibe/context/schema');

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function loadAjv2020() {
  const pnpmRoot = path.join(repoRoot, 'node_modules/.pnpm');
  const entries = await readdir(pnpmRoot);
  const ajvEntry = entries.find((entry) => entry.startsWith('ajv@8.17.1')) ?? entries.find((entry) => entry.startsWith('ajv@'));
  if (!ajvEntry) throw new Error('AJV unavailable in existing workspace install state');
  return (await import(pathToFileURL(path.join(pnpmRoot, ajvEntry, 'node_modules/ajv/dist/2020.js')).href)).default;
}

async function createCase(name, mutateArea) {
  const projectRoot = path.join(runRoot, name);
  await rm(projectRoot, { recursive: true, force: true });
  const writeResult = await writeContextProject({ projectRoot, reset: true, generatedAt: '2026-06-24T00:00:00.000Z' });
  const areaPath = writeResult.areaPaths[0];
  const area = await readJson(areaPath);
  mutateArea(area);
  await writeJson(areaPath, area);
  const validation = await validateContextProject(projectRoot);
  const retrieval = await retrieveContextClosure(projectRoot, {
    task: { taskId: `task:${name}`, role: 'validator', affectedAreas: ['core-contracts'], purpose: 'citation ref strictness' },
    maxLevel: 4
  });
  return {
    name,
    projectRoot,
    areaPath,
    validationOk: validation.ok,
    validationStatus: validation.status,
    validationCodes: validation.findings.map((finding) => finding.code).sort(),
    retrievalOk: retrieval.ok,
    retrievalBlocked: retrieval.blocked,
    retrievalStatus: retrieval.status,
    retrievalCodes: retrieval.findings.map((finding) => finding.code).sort(),
    mutatedArea: area
  };
}

await rm(runRoot, { recursive: true, force: true });
await mkdir(runRoot, { recursive: true });

const missingCitationRefs = await createCase('missing-area-citation-refs', (area) => {
  delete area.context[0].citationRefs;
});
const unresolvedCitationRefs = await createCase('unresolved-area-citation-refs', (area) => {
  area.context[0].citationRefs = ['missing-citation-id'];
});
const nonArrayCitationRefs = await createCase('non-array-area-citation-refs', (area) => {
  area.context[0].citationRefs = {};
});

const Ajv2020 = await loadAjv2020();
const ajv = new Ajv2020({ strict: true, allErrors: true, validateSchema: true, messages: true });
const areaSchema = await readJson(path.join(schemaRoot, 'context-area-v1.schema.json'));
const validateArea = ajv.compile(areaSchema);
const schemaCases = [];
for (const item of [missingCitationRefs, unresolvedCitationRefs, nonArrayCitationRefs]) {
  const schemaOk = validateArea(item.mutatedArea);
  schemaCases.push({
    name: item.name,
    schemaOk,
    schemaErrors: validateArea.errors?.map((error) => ({ instancePath: error.instancePath, keyword: error.keyword, message: error.message })) ?? []
  });
}

const expectedNonGreen = ['missing-area-citation-refs', 'unresolved-area-citation-refs', 'non-array-area-citation-refs'];
const runtimeFalseGreens = [missingCitationRefs, unresolvedCitationRefs, nonArrayCitationRefs]
  .filter((item) => item.validationOk === true || item.retrievalBlocked !== true)
  .map((item) => item.name);
const schemaFalseGreens = schemaCases
  .filter((item) => item.schemaOk === true && expectedNonGreen.includes(item.name))
  .map((item) => item.name);

const evidence = {
  ok: runtimeFalseGreens.length === 0 && schemaFalseGreens.length === 0,
  expectation: 'Area context items must include citationRefs resolving to known source citations; validation and retrieval must fail closed when citation refs are missing, wrong-shaped, or unresolved.',
  runRoot,
  cases: [missingCitationRefs, unresolvedCitationRefs, nonArrayCitationRefs].map(({ mutatedArea, ...rest }) => rest),
  schemaCases,
  runtimeFalseGreens,
  schemaFalseGreens
};
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(`citation-ref strictness witness ${evidence.ok ? 'ok' : 'failed'}: ${evidencePath}`);
if (!evidence.ok) process.exit(1);
