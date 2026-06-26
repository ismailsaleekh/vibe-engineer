
import { ARTIFACT_KINDS, validateArtifactFile, validateArtifactKind, ValidationErrorCode } from '@vibe-engineer/artifacts';
const validPath = "/Users/lizavasilyeva/work/vibe-engineer/packages/artifacts/fixtures/valid/work_brief.json";
const invalidPath = "/Users/lizavasilyeva/work/vibe-engineer/packages/artifacts/fixtures/invalid/work_brief/unknown-field.json";
const valid = validateArtifactFile(validPath, { kind: 'work_brief' });
if (!valid.ok) throw new Error('valid work brief rejected: ' + JSON.stringify(valid.errors));
const invalid = validateArtifactFile(invalidPath, { kind: 'work_brief' });
if (invalid.ok) throw new Error('invalid work brief accepted');
if (!invalid.errors.some((error) => error.code === ValidationErrorCode.UNKNOWN_FIELD)) throw new Error('typed UNKNOWN_FIELD error missing');
if (!ARTIFACT_KINDS.includes('skill_manifest')) throw new Error('artifact kind registry incomplete');
const object = JSON.parse(await import('node:fs').then(({ readFileSync }) => readFileSync(validPath, 'utf8')));
const objectResult = validateArtifactKind('work_brief', object, { artifactPath: 'public-api-object' });
if (!objectResult.ok) throw new Error('object boundary rejected unexpectedly');
console.log(JSON.stringify({ ok: true, publicRuntimeImport: '@vibe-engineer/artifacts', accepted: valid.kind, rejectedCode: invalid.errors[0].code }, null, 2));
