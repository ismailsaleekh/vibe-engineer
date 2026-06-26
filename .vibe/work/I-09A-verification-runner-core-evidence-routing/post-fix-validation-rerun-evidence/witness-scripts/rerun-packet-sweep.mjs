// @ts-check
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = '/Users/lizavasilyeva/work/vibe-engineer';
const workRoot = path.join(repoRoot, '.vibe/work/I-09A-verification-runner-core-evidence-routing');
const evidenceRoot = path.join(workRoot, 'post-fix-validation-rerun-evidence');
const commandLogRoot = path.join(workRoot, 'post-fix-validation-rerun-command-log');
const artifactsModule = await import(pathToFileURL(path.join(repoRoot, 'packages/artifacts/src/index.js')).href);
const { validateArtifactFile } = artifactsModule;

function* walkFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(p);
    else yield p;
  }
}
function isJson(file) { return file.endsWith('.json'); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function rel(file) { return path.relative(repoRoot, file); }
function hasStaticSecretPattern(text) { return /SECRET_[A-Z0-9_]+|Bearer\s+SECRET|password=SECRET|token=SECRET|api-key\s+SECRET|client-secret=SECRET/.test(text); }

const expectedInvalidPacketRelPaths = new Set([
  '.vibe/work/I-09A-verification-runner-core-evidence-routing/post-fix-validation-rerun-evidence/targeted-witnesses/real-boundaries/w-rb2/invalid-packet.json'
]);
const summary = {
  packetCount: 0,
  expectedInvalidPacketCount: 0,
  invalidPackets: [],
  classifications: {},
  codes: {},
  invalidClassifications: [],
  obsoleteClassifications: [],
  badCodes: [],
  staticSecretHits: [],
  scannedRoots: [evidenceRoot, commandLogRoot]
};
const allowedClassifications = new Set([
  'deterministic_product_or_code_failure',
  'schema_or_contract_failure',
  'safety_or_security_policy_failure',
  'mechanical_gate_failure',
  'test_assertion_failure',
  'test_bug',
  'environment_issue',
  'timing_or_flaky_suspicion',
  'external_dependency_drift',
  'advisory_finding',
  'missing_evidence',
  'missing_runner_or_prerequisite',
  'skipped_required_delta_category',
  'blocked_prerequisite',
  'runner_internal_error',
  'classification_unknown'
]);

for (const file of walkFiles(evidenceRoot)) {
  if (!isJson(file)) continue;
  let json;
  try { json = readJson(file); } catch { continue; }
  if (json?.artifactKind !== 'evidence_packet') continue;
  const relativePath = rel(file);
  if (expectedInvalidPacketRelPaths.has(relativePath)) { summary.expectedInvalidPacketCount += 1; continue; }
  summary.packetCount += 1;
  const validation = validateArtifactFile(file, { kind: 'evidence_packet' });
  if (!validation.ok) summary.invalidPackets.push({ file: relativePath, errors: validation.errors });
  if (json.failureDetails) {
    const classification = String(json.failureDetails.classification || '');
    const code = String(json.failureDetails.code || '');
    summary.classifications[classification] = (summary.classifications[classification] || 0) + 1;
    summary.codes[code] = (summary.codes[code] || 0) + 1;
    if (!allowedClassifications.has(classification)) summary.invalidClassifications.push({ file: rel(file), classification });
    if (classification === 'resource_limit_exceeded') summary.obsoleteClassifications.push({ file: rel(file), classification });
    if (!/^[A-Z0-9_]+$/.test(code)) summary.badCodes.push({ file: rel(file), code });
  }
}
for (const root of [evidenceRoot, commandLogRoot]) {
  for (const file of walkFiles(root)) {
    if (file.includes(`${path.sep}witness-scripts${path.sep}`)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (hasStaticSecretPattern(text)) summary.staticSecretHits.push(rel(file));
  }
}
summary.ok = summary.invalidPackets.length === 0 && summary.invalidClassifications.length === 0 && summary.obsoleteClassifications.length === 0 && summary.badCodes.length === 0 && summary.staticSecretHits.length === 0;
const out = path.join(evidenceRoot, 'rerun-packet-sweep-summary.json');
await fsp.writeFile(out, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: summary.ok, packetCount: summary.packetCount, invalidPackets: summary.invalidPackets.length, staticSecretHits: summary.staticSecretHits.length, output: out }, null, 2));
if (!summary.ok) process.exitCode = 1;
