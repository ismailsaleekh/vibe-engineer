import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const validationRoot = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/fifth-post-fix-revalidation-evidence');
const fifthFixEvidenceRoot = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package/fifth-fix-evidence');
const i18aRoot = path.join(repoRoot, '.vibe/work/I-18-security-safety-hooks-policy/I-18A-security-policy-package');
const explicitSummaryFiles = [
  'evidence/positive/policy-positive-summary.json',
  'evidence/negative/policy-negative-summary.json',
  'evidence/contracts/contract-negative-summary.json',
  'evidence/redaction/redaction-summary.json',
  'evidence/real-boundary/package-api/package-api-summary.json',
  'evidence/real-boundary/cli-package-context-import/cli-package-context-summary.json',
].map((relativePath) => path.join(i18aRoot, relativePath));

const terms = [
  'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_INLINE_1234567890',
  'FAKE_SECRET_VALUE_FOR_FIFTH_FIX_COLON_1234567890',
  'abc123',
  'DUMMY_NON_SECRET_TOKEN_FOR_UNSUPPORTED_CLI_PROBE',
];

const exclusions = [
  'witness/source files (*.mjs)',
  'fixture input files and source-line captures',
  'scan logs under fifth-post-fix-revalidation-evidence/scans/**',
  'command-record files (*.command.txt) that record invoked shell text, not generated stdout/stderr/results',
  'markdown reports/artifacts with historical citations are not in the generated-output scan set',
];

async function* walk(root) {
  let entries = [];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function isExcluded(filePath) {
  const normalized = filePath.split(path.sep).join('/');
  if (normalized.includes('/fifth-post-fix-revalidation-evidence/scans/')) return true;
  if (normalized.endsWith('.mjs')) return true;
  if (normalized.endsWith('.command.txt')) return true;
  if (normalized.includes('/fixtures/') && normalized.endsWith('.json')) return true;
  if (normalized.includes('/source/')) return true;
  if (normalized.endsWith('.md')) return true;
  return false;
}

const candidateSet = new Set();
for await (const filePath of walk(validationRoot)) {
  if (!isExcluded(filePath)) candidateSet.add(filePath);
}
for await (const filePath of walk(fifthFixEvidenceRoot)) {
  if (!isExcluded(filePath)) candidateSet.add(filePath);
}
for (const filePath of explicitSummaryFiles) candidateSet.add(filePath);

const hits = [];
let scannedFiles = 0;
for (const filePath of [...candidateSet].sort()) {
  let info;
  try {
    info = await stat(filePath);
  } catch {
    continue;
  }
  if (!info.isFile()) continue;
  scannedFiles += 1;
  const text = await readFile(filePath, 'utf8');
  for (const term of terms) {
    const index = text.indexOf(term);
    if (index !== -1) hits.push({ file: path.relative(repoRoot, filePath), term, index });
  }
}

const summary = { ok: hits.length === 0, scannedFiles, terms, exclusions, hits };
const outputPath = path.join(validationRoot, 'scans/generated-output-sentinel-scan-summary.json');
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
if (hits.length > 0) process.exitCode = 1;
