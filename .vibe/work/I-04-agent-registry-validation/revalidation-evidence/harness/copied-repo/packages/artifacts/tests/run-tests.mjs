import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ARTIFACT_KINDS, compileAllArtifactSchemas, loadAllSchemas, schemaPathForKind, validateArtifact, validateArtifactFile, validateArtifactKind, ValidationErrorCode } from '../src/index.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validDir = path.join(packageRoot, 'fixtures/valid');
const invalidDir = path.join(packageRoot, 'fixtures/invalid');
const carrierDir = path.join(packageRoot, 'fixtures/invalid-carriers');
const evidenceDir = path.resolve(packageRoot, '../../.vibe/work/I-01A-artifact-schemas/evidence');
fs.mkdirSync(evidenceDir, { recursive: true });
const log = [];
function assert(condition, message) { if (!condition) throw new Error(message); }
function record(name, details) { log.push({ name, ...details }); }

const compiled = compileAllArtifactSchemas();
assert(compiled.schemaVersion === '1.0.0', 'Ajv strict compile boundary must report supported version');
assert(compiled.kinds.length === 10, 'Ajv strict compile boundary must load ten artifact schemas');
record('ajv strict schema compile', { schemas: compiled.kinds.length });

const schemas = loadAllSchemas();
assert(Object.keys(schemas).length === 10, 'expected ten schemas');
for (const kind of ARTIFACT_KINDS) {
  const schema = schemas[kind];
  assert(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', `${kind} schema must be JSON Schema 2020-12`);
  assert(schema.properties?.schemaVersion?.const === '1.0.0', `${kind} schemaVersion must be locked`);
  assert(schema.additionalProperties === false, `${kind} top-level additionalProperties must be false`);
  assert(fs.existsSync(schemaPathForKind(kind)), `${kind} schema path exists`);
}
record('schema catalog', { schemas: Object.keys(schemas).length });

for (const kind of ARTIFACT_KINDS) {
  const filePath = path.join(validDir, `${kind}.json`);
  const fileResult = validateArtifactFile(filePath, { kind });
  assert(fileResult.ok, `${kind} valid fixture must pass: ${fileResult.errors?.map(e => `${e.pointer}:${e.code}`).join(',')}`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const objectResult = validateArtifact(data);
  assert(objectResult.ok, `${kind} object validator must pass`);
  const kindResult = validateArtifactKind(kind, data, { artifactPath: filePath });
  assert(kindResult.ok, `${kind} kind validator must pass`);
  record(`valid ${kind}`, { filePath });
}

for (const kind of ARTIFACT_KINDS) {
  const dir = path.join(invalidDir, kind);
  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.json')).sort();
  assert(files.length >= 3, `${kind} must have invalid fixtures`);
  for (const file of files) {
    const result = validateArtifactFile(path.join(dir, file), { kind });
    assert(!result.ok, `${kind}/${file} invalid fixture must fail`);
    const first = result.errors[0];
    assert(first.artifactPath && first.pointer !== undefined && first.code && first.message, `${kind}/${file} error must be typed`);
  }
  record(`invalid ${kind}`, { count: files.length });
}

const wb = JSON.parse(fs.readFileSync(path.join(validDir, 'work_brief.json'), 'utf8'));
wb.schemaVersion = '1.1.0';
let result = validateArtifactKind('work_brief', wb, { artifactPath: 'memory' });
assert(!result.ok && result.errors.some((e) => e.code === ValidationErrorCode.UNSUPPORTED_VERSION), 'unsupported minor versions fail closed');
wb.schemaVersion = 'not-semver';
result = validateArtifactKind('work_brief', wb, { artifactPath: 'memory' });
assert(!result.ok && result.errors.some((e) => e.code === ValidationErrorCode.UNSUPPORTED_VERSION || e.code === ValidationErrorCode.PATTERN), 'malformed semver fails');

for (const file of fs.readdirSync(carrierDir)) {
  const carrier = validateArtifactFile(path.join(carrierDir, file));
  assert(!carrier.ok && carrier.errors.some((e) => e.code === ValidationErrorCode.CARRIER_NOT_JSON), `${file} carrier must be rejected as non-JSON`);
}
record('non-json carriers', { count: fs.readdirSync(carrierDir).length });

const adversarialExpectations = [
  ['verification_delta/missing-catalog-category.json', 'verification_delta', ValidationErrorCode.VERIFICATION_CATALOG_INCOMPLETE, '/requiredItems'],
  ['verification_delta/not-applicable-missing-rationale.json', 'verification_delta', ValidationErrorCode.REQUIRED, '/requiredItems/2/rationale'],
  ['verification_delta/blocked-missing-metadata.json', 'verification_delta', ValidationErrorCode.BLOCKED_ITEM_METADATA_REQUIRED, '/requiredItems/0/blockedBy'],
  ['implementation_plan/incomplete-verification-delta.json', 'implementation_plan', ValidationErrorCode.VERIFICATION_CATALOG_INCOMPLETE, '/verificationDelta/requiredItems'],
  ['evidence_packet/missing-evidence-for-link.json', 'evidence_packet', ValidationErrorCode.EVIDENCE_FOR_REQUIRED, '/links'],
  ['build_result/verification-ref-non-evidence.json', 'build_result', ValidationErrorCode.EVIDENCE_LINK_REQUIRED, '/verificationRuns/0/evidencePacketRef'],
  ['build_result/verification-ref-wrong-relation.json', 'build_result', ValidationErrorCode.EVIDENCE_LINK_REQUIRED, '/verificationRuns/0/evidencePacketRef'],
  ['build_result/narrative-verification-without-evidence-ref.json', 'build_result', ValidationErrorCode.REQUIRED, '/verificationRuns/0/evidencePacketRef'],
  ['ship_packet/final-verification-ref-non-evidence.json', 'ship_packet', ValidationErrorCode.EVIDENCE_LINK_REQUIRED, '/finalVerification/0/evidencePacketRef'],
  ['ship_packet/final-verification-ref-wrong-relation.json', 'ship_packet', ValidationErrorCode.EVIDENCE_LINK_REQUIRED, '/finalVerification/0/evidencePacketRef']
];
for (const [relative, kind, code, pointer] of adversarialExpectations) {
  const result = validateArtifactFile(path.join(invalidDir, relative), { kind });
  assert(!result.ok, `${relative} must be rejected`);
  assert(result.errors.some((error) => error.code === code && error.pointer === pointer), `${relative} must include ${code} at ${pointer}; got ${result.errors.map((e) => `${e.pointer}:${e.code}`).join(',')}`);
}
record('F2/F3 adversarial fixtures', { count: adversarialExpectations.length });

const typeCheck = spawnSync(process.execPath, [path.join(packageRoot, 'scripts/check-generated-types.mjs')], { encoding: 'utf8' });
assert(typeCheck.status === 0, `type drift check should pass: ${typeCheck.stderr || typeCheck.stdout}`);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-schema-drift-'));
fs.cpSync(path.join(packageRoot, 'schemas'), tmpDir, { recursive: true });
const changedSchemaPath = path.join(tmpDir, 'work-brief.schema.json');
const changed = JSON.parse(fs.readFileSync(changedSchemaPath, 'utf8'));
changed.properties.status.enum.push('unexpected_status');
fs.writeFileSync(changedSchemaPath, JSON.stringify(changed, null, 2));
const drift = spawnSync(process.execPath, [path.join(packageRoot, 'scripts/check-generated-types.mjs')], { env: { ...process.env, SCHEMAS_DIR: tmpDir }, encoding: 'utf8' });
assert(drift.status !== 0, 'mutated schema must fail type drift check');
fs.rmSync(tmpDir, { recursive: true, force: true });
record('type drift', { positive: 'passed', negative: 'failed as expected' });

fs.writeFileSync(path.join(evidenceDir, 'test-results.json'), JSON.stringify({ ok: true, witnesses: log }, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, witnesses: log.length }, null, 2));
