// Ship intake (I-21-owned): validates + consumes a schema-valid, passed Build Result and
// exposes a payload shape that the I-22 ship orchestrator will later consume.
//
// Per brief F3 / DL-03: the intake consumes the ALREADY-schema'd Build Result and does NOT
// introduce a new schema'd artifact (the Ship Packet remains I-22-owned). Intake only —
// no orchestrator, no push/PR logic, no git operations.

import fs from 'node:fs/promises';
import path from 'node:path';
import { validateArtifactFile } from '@vibe-engineer/artifacts';
import { blocked, ok, validationBlocked } from '../../shared/result.js';

const SHIP_INTAKE_ACCEPTED_BUILD_STATUS = Object.freeze(['passed']);

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validationError(field, message, code = 'INVALID_INPUT') {
  return Object.freeze({ field, code, message });
}

/**
 * Resolve + contain the Build Result path the ship intake consumes.
 * @param {object} descriptor - { inputRoot, artifactName } or { buildResultPath }.
 */
export async function resolveShipIntakePath(descriptor) {
  if (!isPlainObject(descriptor)) {
    return blocked('invalid_intake_descriptor', { errors: Object.freeze([validationError('descriptor', 'ship intake requires an object descriptor, not raw intent text or chat.')]) });
  }
  let artifactPath;
  let allowedRoot = null;
  let relativePath;
  if (typeof descriptor.buildResultPath === 'string' && descriptor.buildResultPath.length > 0) {
    artifactPath = path.resolve(descriptor.buildResultPath);
    allowedRoot = path.dirname(artifactPath);
    relativePath = path.basename(artifactPath);
  } else {
    const inputRoot = typeof descriptor.inputRoot === 'string' && descriptor.inputRoot.length > 0 ? descriptor.inputRoot : null;
    const artifactName = typeof descriptor.artifactName === 'string' && descriptor.artifactName.length > 0 ? descriptor.artifactName : null;
    if (inputRoot === null || artifactName === null) {
      return blocked('invalid_intake_descriptor', { errors: Object.freeze([validationError('descriptor', 'ship intake requires inputRoot + artifactName, or buildResultPath.')]) });
    }
    if (path.isAbsolute(artifactName)) {
      return blocked('unsafe_path', { errors: Object.freeze([validationError('artifactName', 'artifactName must be relative to inputRoot, not absolute.', 'ABSOLUTE_PATH_REJECTED')]) });
    }
    allowedRoot = path.resolve(inputRoot);
    artifactPath = path.resolve(allowedRoot, artifactName);
    relativePath = path.relative(allowedRoot, artifactPath);
    if (relativePath === '' || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      return blocked('unsafe_path', { errors: Object.freeze([validationError('artifactName', 'artifactName must stay inside inputRoot after normalization.', 'PATH_TRAVERSAL_REJECTED')]) });
    }
  }
  if (path.extname(artifactPath) !== '.json') {
    return blocked('carrier_not_json', { errors: Object.freeze([validationError('artifactName', 'ship intake consumes canonical .json Build Result artifacts only.', 'CARRIER_NOT_JSON')]) });
  }
  try {
    const stats = await fs.stat(artifactPath);
    if (stats.isDirectory()) {
      return blocked('directory_target', { errors: Object.freeze([validationError('artifactName', 'Build Result path resolves to a directory.')]) });
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return blocked('missing_build_result', { errors: Object.freeze([validationError('artifactName', `No Build Result artifact exists at ${relativePath}.`, 'MISSING_FILE')]) });
    }
    return blocked('path_stat_failed', { errors: Object.freeze([validationError('artifactName', `Unable to inspect Build Result path: ${error.message}`)]) });
  }
  return ok({ allowedRoot, artifactPath, relativePath });
}

/**
 * Validate + consume a passed Build Result and expose a payload shape for the I-22 ship
 * orchestrator. Rejects malformed (N4) or non-passed Build Results.
 */
export async function intakeBuildResult(descriptor) {
  const resolved = await resolveShipIntakePath(descriptor);
  if (!resolved.ok) return resolved;
  const { artifactPath, relativePath } = resolved.value;

  const validation = validateArtifactFile(artifactPath, { kind: 'build_result' });
  if (!validation.ok) {
    return validationBlocked('ship_intake_build_result', [validationError('buildResult', 'Build Result failed public schema validation; ship intake rejects it.', 'BUILD_RESULT_INVALID')]);
  }
  const buildResult = validation.artifact;
  if (!SHIP_INTAKE_ACCEPTED_BUILD_STATUS.includes(buildResult.status)) {
    return blocked('build_result_not_passed', {
      errors: Object.freeze([validationError('status', `Ship intake consumes passed Build Results only (got '${buildResult.status}').`, 'BUILD_RESULT_NOT_PASSED')]),
      buildStatus: buildResult.status
    });
  }

  const verificationRuns = Array.isArray(buildResult.verificationRuns) ? buildResult.verificationRuns : [];
  const blockingWarnings = (Array.isArray(buildResult.warningsAndBlockers) ? buildResult.warningsAndBlockers : [])
    .filter((item) => isPlainObject(item) && item.blocking === true);
  if (blockingWarnings.length > 0) {
    return blocked('build_result_has_blocking_warnings', {
      errors: Object.freeze([validationError('warningsAndBlockers', 'Passed Build Result carries blocking warnings; ship intake refuses it.', 'BUILD_RESULT_BLOCKING_WARNINGS')]),
      blockingCount: blockingWarnings.length
    });
  }

  const buildResultRef = {
    rel: 'ship_packet_of',
    artifactKind: 'build_result',
    artifactId: buildResult.artifactId,
    path: relativePath,
    required: true,
    statusAtLinkTime: 'passed'
  };
  const evidencePacketRefs = verificationRuns
    .map((run) => (isPlainObject(run) && isPlainObject(run.evidencePacketRef) ? run.evidencePacketRef : null))
    .filter((ref) => ref !== null);
  const contextDocsRefs = (Array.isArray(buildResult.contextDocsUpdates) ? buildResult.contextDocsUpdates : [])
    .map((entry) => (isPlainObject(entry) && isPlainObject(entry.ref) ? entry.ref : null))
    .filter((ref) => ref !== null);

  const payload = Object.freeze({
    schemaVersion: 'ship-intake-payload/v1',
    buildResultRef,
    buildResultArtifactId: buildResult.artifactId,
    implementationPlanRef: isPlainObject(buildResult.implementationPlanRef) ? buildResult.implementationPlanRef : null,
    verificationRunCount: verificationRuns.length,
    evidencePacketRefs: Object.freeze(evidencePacketRefs),
    contextDocsRefs: Object.freeze(contextDocsRefs),
    readyForShip: true,
    intakeNotes: 'Deterministic ship-intake payload; Ship Packet assembly, commit/PR, and push remain I-22-owned (no-push-without-approval).'
  });

  return ok({
    buildResult,
    filePath: artifactPath,
    relativePath,
    validation,
    payload
  });
}

export { SHIP_INTAKE_ACCEPTED_BUILD_STATUS };
