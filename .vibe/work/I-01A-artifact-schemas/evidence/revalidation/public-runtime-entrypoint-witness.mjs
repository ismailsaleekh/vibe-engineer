import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTIFACT_KINDS, compileAllArtifactSchemas, validateArtifactFile, ValidationErrorCode } from '@vibe-engineer/artifacts';

const revalidationDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(revalidationDir, '../../../../..');
const packageRoot = path.join(repoRoot, 'packages/artifacts');
const compiled = compileAllArtifactSchemas();
const validWorkBrief = validateArtifactFile(path.join(packageRoot, 'fixtures/valid/work_brief.json'), { kind: 'work_brief' });
const invalidDelta = validateArtifactFile(path.join(packageRoot, 'fixtures/invalid/verification_delta/missing-catalog-category.json'), { kind: 'verification_delta' });
const invalidCarrier = validateArtifactFile(path.join(packageRoot, 'fixtures/invalid-carriers/not-json.md'));
const output = {
  importedViaPackageExports: true,
  kindCount: ARTIFACT_KINDS.length,
  compiled,
  validWorkBriefOk: validWorkBrief.ok,
  invalidDeltaOk: invalidDelta.ok,
  invalidDeltaErrors: invalidDelta.ok ? [] : invalidDelta.errors,
  invalidCarrierOk: invalidCarrier.ok,
  invalidCarrierErrors: invalidCarrier.ok ? [] : invalidCarrier.errors
};
const ok = compiled.schemaVersion === '1.0.0'
  && compiled.kinds.length === 10
  && ARTIFACT_KINDS.length === 10
  && validWorkBrief.ok
  && !invalidDelta.ok
  && invalidDelta.errors.some((error) => error.code === ValidationErrorCode.VERIFICATION_CATALOG_INCOMPLETE)
  && !invalidCarrier.ok
  && invalidCarrier.errors.some((error) => error.code === ValidationErrorCode.CARRIER_NOT_JSON);
console.log(JSON.stringify({ ok, ...output }, null, 2));
if (!ok) process.exit(1);
