import fs from 'node:fs/promises';
import path from 'node:path';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

export async function writeJsonAtomic(filePath, value) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new TypeError('filePath is required for atomic JSON persistence.');
  }
  const directory = path.dirname(filePath);
  const base = path.basename(filePath);
  const tempPath = path.join(directory, `.${base}.${process.pid}.${Date.now()}.tmp`);
  const data = canonicalJson(value);
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(tempPath, data, { encoding: 'utf8', flag: 'wx' });
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
  return Object.freeze({ filePath, bytes: Buffer.byteLength(data, 'utf8') });
}
