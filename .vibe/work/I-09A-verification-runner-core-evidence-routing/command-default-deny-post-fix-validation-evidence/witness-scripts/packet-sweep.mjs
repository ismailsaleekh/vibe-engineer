#!/usr/bin/env node
// @ts-check
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const targetRoot = process.argv[2];
const outputPath = process.argv[3];
const roots = process.argv.slice(4).map((p) => path.resolve(p));
if (!targetRoot || !outputPath || roots.length === 0) throw new Error('usage: packet-sweep.mjs <targetRoot> <summaryPath> <roots...>');
const artifacts = await import(pathToFileURL(path.join(path.resolve(targetRoot), 'packages/artifacts/src/index.js')).href);
const { validateArtifactFile } = artifacts;
const obsolete = new Set(['resource_limit_exceeded', 'blocked', 'denied', 'command_policy_denied', 'resource_cap_exceeded']);
const dl22Codes = new Set(['RESOURCE_LIMIT_EXCEEDED', 'COMMAND_TIMEOUT', 'STDOUT_LIMIT_EXCEEDED', 'STDERR_LIMIT_EXCEEDED', 'OUTPUT_LIMIT_EXCEEDED', 'ARTIFACT_LIMIT_EXCEEDED', 'COMMAND_POLICY_DENIED', 'UNSUPPORTED_COMMAND', 'UNSUPPORTED_ACTION', 'UNSAFE_PATH', 'UNSAFE_CWD', 'ENVIRONMENT_POLICY_DENIED', 'RESOURCE_CAP_MISSING', 'RESOURCE_CAP_EXCEEDED']);
const classificationInventory = new Map();
const codeInventory = new Map();
const invalidPackets = [];
const obsoleteClassifications = [];
const dl22CodeAsClassification = [];
const badCodes = [];
const packetFiles = [];
const secretPatternHits = [];
const secretRegex = /SECRET_(?:POSTFIX|STDOUT|STDERR|ARTIFACT|BEARER|ARGV|TOKEN|PASSWORD|API|CLIENT)|Bearer\s+SECRET|password=SECRET|token=SECRET|api-key\s+SECRET|client-secret=SECRET/i;
function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}
for (const root of roots) {
  for (const file of walk(root)) {
    const rel = path.relative(root, file);
    if (/secret-(?:pattern|unique).*scan\.json$/.test(rel) || /scanner-allowlist/i.test(rel) || /secret-scan\.(?:stdout|stderr|txt|log)$/.test(rel)) continue;
    if (/\.(json|log|txt|stdout|stderr)$/.test(file)) {
      const text = fs.readFileSync(file, 'utf8');
      if (secretRegex.test(text)) secretPatternHits.push({ root, file: rel });
    }
    if (!file.endsWith('.json')) continue;
    let json;
    try { json = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
    if (json?.artifactKind !== 'evidence_packet') continue;
    packetFiles.push(file);
    const validation = validateArtifactFile(file, { kind: 'evidence_packet' });
    if (!validation.ok) invalidPackets.push({ file, errors: validation.errors });
    const classification = json.failureDetails?.classification;
    const code = json.failureDetails?.code;
    if (classification) {
      classificationInventory.set(classification, (classificationInventory.get(classification) || 0) + 1);
      if (obsolete.has(classification)) obsoleteClassifications.push({ file, classification });
      if (dl22Codes.has(classification)) dl22CodeAsClassification.push({ file, classification });
    }
    if (code) {
      codeInventory.set(code, (codeInventory.get(code) || 0) + 1);
      if (!/^[A-Z0-9_]+$/.test(code)) badCodes.push({ file, code });
    }
  }
}
const summary = {
  ok: invalidPackets.length === 0 && obsoleteClassifications.length === 0 && dl22CodeAsClassification.length === 0 && badCodes.length === 0 && secretPatternHits.length === 0,
  roots,
  packetCount: packetFiles.length,
  invalidPacketCount: invalidPackets.length,
  invalidPackets: invalidPackets.slice(0, 20),
  classificationInventory: Object.fromEntries([...classificationInventory.entries()].sort()),
  codeInventory: Object.fromEntries([...codeInventory.entries()].sort()),
  obsoleteClassifications,
  dl22CodeAsClassification,
  badCodes,
  secretPatternHitCount: secretPatternHits.length,
  secretPatternHits: secretPatternHits.slice(0, 50),
  dl22CodesObserved: [...dl22Codes].filter((code) => codeInventory.has(code)).sort()
};
await fsp.mkdir(path.dirname(outputPath), { recursive: true });
await fsp.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: summary.ok, packetCount: summary.packetCount, invalidPacketCount: summary.invalidPacketCount, summaryPath: outputPath }, null, 2));
if (!summary.ok) process.exitCode = 1;
