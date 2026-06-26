import { mkdir, writeFile, lstat, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const fixtureRoot = join(repoRoot, 'examples/harness-integrations/pi/runtime-fixtures');
const evidenceRoot = join(repoRoot, '.vibe/work/I-14B-pi-adapter-runtime-skill-consumption/evidence');

const generatorModule = new URL('../../../../packages/adapters/pi/src/generators/runtime-fixture-generator.ts', import.meta.url).href;
const validationModule = new URL('../../../../packages/adapters/pi/src/runtime/validation.ts', import.meta.url).href;
const capabilitiesModule = new URL('../../../../packages/adapters/pi/src/capabilities/index.ts', import.meta.url).href;
const manifestModule = new URL('../../../../packages/adapters/pi/src/generated-file-manifest/index.ts', import.meta.url).href;
const { generatePiRuntimeFixture, serializePiRuntimeFixtureManifest } = await import(generatorModule);
const { validatePiRuntimeFixtureAgainstI14A } = await import(validationModule);
const { getPiAdapterCapabilityMatrix } = await import(capabilitiesModule);
const { getPiGeneratedFileManifest } = await import(manifestModule);

const ensureInside = (relativePath) => {
  if (relativePath.startsWith('/') || relativePath.includes('..') || relativePath.split('/').some((part) => part.length === 0)) {
    throw new Error(`unsafe generated path: ${relativePath}`);
  }
  const absolute = resolve(fixtureRoot, relativePath);
  if (!absolute.startsWith(`${fixtureRoot}/`)) {
    throw new Error(`path escape: ${relativePath}`);
  }
  return absolute;
};

const writeDeterministic = async (relativePath, content) => {
  const absolute = ensureInside(relativePath);
  await mkdir(dirname(absolute), { recursive: true });
  try {
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error(`refusing symlink overwrite: ${relativePath}`);
    if (stat.isFile()) {
      const current = await readFile(absolute, 'utf8');
      if (current !== content) {
        await writeFile(absolute, content, 'utf8');
      }
      return { path: relativePath, action: current === content ? 'unchanged' : 'updated' };
    }
    throw new Error(`refusing non-file overwrite: ${relativePath}`);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      await writeFile(absolute, content, 'utf8');
      return { path: relativePath, action: 'created' };
    }
    throw error;
  }
};

const fixture = generatePiRuntimeFixture();
const capabilityMatrix = getPiAdapterCapabilityMatrix();
const generatedFileManifest = getPiGeneratedFileManifest();
const validation = validatePiRuntimeFixtureAgainstI14A(fixture, capabilityMatrix, generatedFileManifest);
if (!validation.valid) {
  await writeFile(join(evidenceRoot, 'positive-generation-failed.json'), JSON.stringify({ valid: false, issues: validation.issues }, null, 2));
  process.exitCode = 1;
  throw new Error('generated fixture failed validation');
}

const writes = [];
for (const asset of fixture.assets) {
  writes.push(await writeDeterministic(asset.path, asset.content));
}
writes.push(await writeDeterministic('.vibe/harness/pi-runtime-assets.json', serializePiRuntimeFixtureManifest(fixture)));

const result = {
  ok: true,
  fixtureRoot,
  assetCount: fixture.assets.length,
  skillCount: fixture.assets.filter((asset) => asset.kind === 'skill').length,
  promptCount: fixture.assets.filter((asset) => asset.kind === 'prompt-template').length,
  runtimeExecutionClaim: fixture.runtimeExecutionClaim,
  downstreamLiveRuntimeBlock: fixture.downstreamLiveRuntimeBlock,
  writes,
  assetPaths: fixture.assets.map((asset) => asset.path).concat(['.vibe/harness/pi-runtime-assets.json']).sort(),
};
await mkdir(evidenceRoot, { recursive: true });
await writeFile(join(evidenceRoot, 'positive-generation-result.json'), JSON.stringify(result, null, 2));
await writeFile(join(evidenceRoot, 'positive-runtime-fixture-carrier.json'), JSON.stringify(fixture, null, 2));
console.log(JSON.stringify(result, null, 2));
