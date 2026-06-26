import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const ROOT = process.cwd();
export const WORK = path.join(ROOT, '.vibe/work/I-09S-verification-package-dependency-handoff');
export const EVIDENCE = path.join(WORK, 'evidence');

export class WitnessError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'WitnessError';
    this.details = details;
  }
}

export function assert(condition, message, details = {}) {
  if (!condition) throw new WitnessError(message, details);
}

export async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8'));
}

export async function readEvidenceJson(relativePath) {
  return JSON.parse(await readFile(path.join(WORK, relativePath), 'utf8'));
}

export async function sha256File(relativePath) {
  const data = await readFile(path.join(ROOT, relativePath));
  return createHash('sha256').update(data).digest('hex');
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function assertDeepEqual(actual, expected, label) {
  const actualStable = JSON.stringify(stable(actual));
  const expectedStable = JSON.stringify(stable(expected));
  assert(actualStable === expectedStable, `${label} changed unexpectedly`, { actual, expected });
}

export function parseLockImporters(lockText) {
  const lines = lockText.split(/\r?\n/);
  const importersIndex = lines.findIndex((line) => line === 'importers:');
  assert(importersIndex >= 0, 'pnpm lockfile missing importers section');
  const importers = {};
  let current = null;
  let inDependencies = false;
  let currentDependency = null;
  for (let index = importersIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.length > 0 && !line.startsWith(' ')) break;
    if (line.trim() === '') continue;
    const importerMatch = line.match(/^  ([^ ].*?):(?: \{\})?$/);
    if (importerMatch) {
      current = normalizeYamlKey(importerMatch[1]);
      importers[current] = { dependencies: {} };
      inDependencies = false;
      currentDependency = null;
      continue;
    }
    if (!current) continue;
    if (line === '    dependencies:') {
      inDependencies = true;
      currentDependency = null;
      continue;
    }
    if (line.startsWith('    ') && !line.startsWith('      ')) {
      inDependencies = false;
      currentDependency = null;
      continue;
    }
    if (inDependencies) {
      const depMatch = line.match(/^      (.+):$/);
      if (depMatch) {
        currentDependency = normalizeYamlKey(depMatch[1]);
        importers[current].dependencies[currentDependency] = {};
        continue;
      }
      const fieldMatch = line.match(/^        (specifier|version): (.+)$/);
      if (fieldMatch && currentDependency) {
        importers[current].dependencies[currentDependency][fieldMatch[1]] = normalizeYamlValue(fieldMatch[2]);
        continue;
      }
      throw new WitnessError('Unsupported dependency lockfile structure', { line, importer: current });
    }
  }
  return importers;
}

function normalizeYamlKey(raw) {
  const value = raw.trim();
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) return value.slice(1, -1);
  return value;
}

function normalizeYamlValue(raw) {
  return normalizeYamlKey(raw.trim());
}

export async function readLockImporters() {
  return parseLockImporters(await readFile(path.join(ROOT, 'pnpm-lock.yaml'), 'utf8'));
}

export function requireWorkspaceEdge(importers, importer, dependency, linkTarget) {
  const entry = importers[importer]?.dependencies?.[dependency];
  assert(entry, `missing lockfile edge ${importer} -> ${dependency}`);
  assert(entry.specifier === 'workspace:*', `wrong lockfile specifier for ${importer} -> ${dependency}`, entry);
  assert(entry.version === linkTarget, `wrong lockfile link target for ${importer} -> ${dependency}`, entry);
}

export async function listFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!existsSync(absoluteDir)) return [];
  const output = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) output.push(path.relative(ROOT, full));
    }
  }
  await walk(absoluteDir);
  return output.sort();
}

export async function assertNoSourceMtimeAfterSnapshot(relativeDir, snapshotRelativePath) {
  const snapshotStat = await stat(path.join(WORK, snapshotRelativePath));
  const files = await listFiles(relativeDir);
  const offenders = [];
  for (const file of files) {
    const fileStat = await stat(path.join(ROOT, file));
    if (fileStat.mtimeMs > snapshotStat.mtimeMs + 2000) offenders.push({ file, mtimeMs: fileStat.mtimeMs, snapshotMtimeMs: snapshotStat.mtimeMs });
  }
  assert(offenders.length === 0, `${relativeDir} contains files modified after I-09S before-snapshot`, { offenders });
}

export async function writeResult(relativePath, result) {
  await writeFile(path.join(EVIDENCE, relativePath), `${JSON.stringify(stable(result), null, 2)}\n`);
}

export function packageDependency(manifest, name) {
  return manifest.dependencies?.[name];
}
