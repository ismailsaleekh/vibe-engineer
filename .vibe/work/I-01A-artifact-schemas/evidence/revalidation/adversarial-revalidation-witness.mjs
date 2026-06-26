import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTIFACT_KINDS, compileAllArtifactSchemas, validateArtifact, validateArtifactFile, validateArtifactKind, ValidationErrorCode } from '@vibe-engineer/artifacts';

const revalidationDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(revalidationDir, '../../../../..');
const packageRoot = path.join(repoRoot, 'packages/artifacts');
const validDir = path.join(packageRoot, 'fixtures/valid');
const invalidDir = path.join(packageRoot, 'fixtures/invalid');
const carrierDir = path.join(packageRoot, 'fixtures/invalid-carriers');
const results = [];
const failures = [];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function record(name, ok, details = {}) {
  results.push({ name, ok, ...details });
  if (!ok) failures.push({ name, ...details });
}

function hasError(result, code, pointer) {
  return !result.ok && result.errors.some((error) => error.code === code && (pointer === undefined || error.pointer === pointer));
}

const compiled = compileAllArtifactSchemas();
record('strict Ajv compile public API loads all schemas', compiled.schemaVersion === '1.0.0' && compiled.kinds.length === 10, compiled);

for (const kind of ARTIFACT_KINDS) {
  const filePath = path.join(validDir, `${kind}.json`);
  const result = validateArtifactFile(filePath, { kind });
  record(`valid fixture accepted: ${kind}`, result.ok, result.ok ? { schemaId: result.schemaId } : { errors: result.errors });
}

const invalidFixtureExpectations = [
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

for (const [relative, kind, code, pointer] of invalidFixtureExpectations) {
  const result = validateArtifactFile(path.join(invalidDir, relative), { kind });
  record(`invalid fixture rejected: ${relative}`, hasError(result, code, pointer), { expectedCode: code, expectedPointer: pointer, errors: result.errors });
}

const delta = readJson(path.join(validDir, 'verification_delta.json'));
delta.requiredItems = delta.requiredItems.filter((item) => item.layer !== 'schema_validation');
record('mutated delta missing catalog layer fails loudly', hasError(validateArtifactKind('verification_delta', delta), ValidationErrorCode.VERIFICATION_CATALOG_INCOMPLETE, '/requiredItems'));

const notApplicable = readJson(path.join(validDir, 'verification_delta.json'));
const notApplicableItem = notApplicable.requiredItems.find((item) => item.action === 'not_applicable');
notApplicableItem.rationale = '   ';
record('mutated not_applicable blank rationale fails loudly', hasError(validateArtifactKind('verification_delta', notApplicable), ValidationErrorCode.NOT_APPLICABLE_RATIONALE_REQUIRED, `/requiredItems/${notApplicable.requiredItems.indexOf(notApplicableItem)}/rationale`));

const blocked = readJson(path.join(validDir, 'verification_delta.json'));
blocked.requiredItems[0].action = 'blocked';
delete blocked.requiredItems[0].blockedBy;
delete blocked.requiredItems[0].unblockCondition;
record('mutated blocked item missing metadata fails loudly', hasError(validateArtifactKind('verification_delta', blocked), ValidationErrorCode.BLOCKED_ITEM_METADATA_REQUIRED, '/requiredItems/0/blockedBy'));

const plan = readJson(path.join(validDir, 'implementation_plan.json'));
plan.verificationDelta.requiredItems = plan.verificationDelta.requiredItems.filter((item) => item.layer !== 'final_dod');
record('mutated embedded delta missing catalog layer fails loudly', hasError(validateArtifactKind('implementation_plan', plan), ValidationErrorCode.VERIFICATION_CATALOG_INCOMPLETE, '/verificationDelta/requiredItems'));

const evidence = readJson(path.join(validDir, 'evidence_packet.json'));
evidence.links = evidence.links.map((link) => ({ ...link, rel: 'produced_by' }));
record('mutated evidence packet without evidence_for fails loudly', hasError(validateArtifactKind('evidence_packet', evidence), ValidationErrorCode.EVIDENCE_FOR_REQUIRED, '/links'));

const build = readJson(path.join(validDir, 'build_result.json'));
build.verificationRuns[0].evidencePacketRef.artifactKind = 'work_brief';
record('mutated build result non-evidence ref fails loudly', hasError(validateArtifactKind('build_result', build), ValidationErrorCode.EVIDENCE_LINK_REQUIRED, '/verificationRuns/0/evidencePacketRef'));

const ship = readJson(path.join(validDir, 'ship_packet.json'));
ship.finalVerification[0].evidencePacketRef.rel = 'derived_from';
record('mutated ship packet wrong evidence rel fails loudly', hasError(validateArtifactKind('ship_packet', ship), ValidationErrorCode.EVIDENCE_LINK_REQUIRED, '/finalVerification/0/evidencePacketRef'));

const wrongKind = readJson(path.join(validDir, 'work_brief.json'));
wrongKind.artifactKind = 'unknown_artifact_kind';
record('unknown artifact kind fails closed', hasError(validateArtifact(wrongKind), ValidationErrorCode.ARTIFACT_KIND_MISMATCH, '/artifactKind'));

const unsupportedVersion = readJson(path.join(validDir, 'work_brief.json'));
unsupportedVersion.schemaVersion = '2.0.0';
record('unsupported schema version fails closed', hasError(validateArtifactKind('work_brief', unsupportedVersion), ValidationErrorCode.UNSUPPORTED_VERSION, '/schemaVersion'));

const unknownField = readJson(path.join(validDir, 'work_brief.json'));
unknownField.unmodeledExtra = true;
record('unknown top-level field fails closed', hasError(validateArtifactKind('work_brief', unknownField), ValidationErrorCode.UNKNOWN_FIELD, '/unmodeledExtra'));

for (const file of fs.readdirSync(carrierDir).sort()) {
  const result = validateArtifactFile(path.join(carrierDir, file));
  record(`non-json carrier rejected: ${file}`, hasError(result, ValidationErrorCode.CARRIER_NOT_JSON, ''), { errors: result.errors });
}

const output = { ok: failures.length === 0, checked: results.length, failures, results };
console.log(JSON.stringify(output, null, 2));
if (failures.length > 0) process.exit(1);
