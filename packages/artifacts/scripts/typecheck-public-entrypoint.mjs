import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-artifacts-ts-consumer-'));
const scopedDir = path.join(tmp, 'node_modules/@vibe-engineer');
fs.mkdirSync(scopedDir, { recursive: true });
fs.symlinkSync(packageRoot, path.join(scopedDir, 'artifacts'), 'dir');
fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ type: 'module', private: true }, null, 2));
fs.writeFileSync(path.join(tmp, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    strict: true,
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    target: 'ES2022',
    noEmit: true,
    skipLibCheck: false
  },
  include: ['consumer.ts']
}, null, 2));
fs.writeFileSync(path.join(tmp, 'consumer.ts'), `import { ARTIFACT_KINDS, validateArtifact, type AnyArtifactV1, type ArtifactKind } from '@vibe-engineer/artifacts';\n\nconst kind: ArtifactKind = ARTIFACT_KINDS[0];\nconst candidate: unknown = { schemaVersion: '1.0.0', artifactKind: kind };\nconst result = validateArtifact(candidate);\nif (result.ok) {\n  const artifact: AnyArtifactV1 = result.artifact;\n  console.log(artifact.artifactKind);\n}\n`);
const result = spawnSync('pnpm', ['--package=typescript@5.9.3', 'dlx', 'tsc', '-p', path.join(tmp, 'tsconfig.json')], {
  cwd: tmp,
  encoding: 'utf8'
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
fs.rmSync(tmp, { recursive: true, force: true });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('public TypeScript entrypoint typecheck passed');
