import fs from 'node:fs/promises';
import path from 'node:path';
import { writeJsonAtomic } from '../../shared/atomic-json-writer.js';
import { blocked, ok, validationBlocked } from '../../shared/result.js';
import { deterministicArtifactId } from '../../shared/time-id.js';
import { ValidationErrorCode, validateWorkBriefArtifact, validateWorkBriefFile } from '../../shared/artifact-validation.js';

export const SOURCE_SKILLS = Object.freeze(['brainstorm', 'grill-me', 'task']);
export const WORK_BRIEF_STATUSES = Object.freeze(['draft', 'ready', 'blocked', 'superseded']);
export const WORK_TYPES = Object.freeze(['feature', 'bug', 'chore', 'refactor', 'research', 'decision']);

function rawIntentLink(input) {
  if (!input.rawIntentLink) return null;
  return {
    rel: 'raw_intent',
    artifactKind: input.rawIntentLink.artifactKind,
    artifactId: input.rawIntentLink.artifactId,
    path: input.rawIntentLink.path,
    required: input.rawIntentLink.required,
    statusAtLinkTime: input.rawIntentLink.statusAtLinkTime
  };
}

function linksFor(input) {
  const links = Array.isArray(input.links) ? [...input.links] : [];
  const raw = rawIntentLink(input);
  if (raw) links.unshift(raw);
  return links;
}

export function assembleWorkBrief(input) {
  const artifactId = input.artifactId ?? deterministicArtifactId('work-brief', [input.sourceSkill, input.title, input.rawIntentLink?.artifactId]);
  return {
    schemaVersion: '1.0.0',
    artifactKind: 'work_brief',
    artifactId,
    title: input.title,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    producer: {
      kind: 'skill',
      id: `skill-${input.sourceSkill}`,
      name: input.sourceSkill,
      ...(input.producerVersion === undefined ? {} : { version: input.producerVersion }),
      ...(input.runId === undefined ? {} : { runId: input.runId })
    },
    status: input.status,
    ownership: input.ownership,
    links: linksFor(input),
    extensions: input.extensions,
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.tags === undefined ? {} : { tags: input.tags }),
    ...(input.sourceRefs === undefined ? {} : { sourceRefs: input.sourceRefs }),
    sourceSkill: input.sourceSkill,
    workType: input.workType,
    background: input.background,
    problemOrOpportunity: input.problemOrOpportunity,
    desiredOutcome: input.desiredOutcome,
    constraints: input.constraints,
    userVisibleBehavior: input.userVisibleBehavior,
    nonGoals: input.nonGoals,
    risksAndUnknowns: input.risksAndUnknowns,
    acceptanceNotes: input.acceptanceNotes,
    sourceMetadata: input.sourceMetadata,
    ...(input.observedBehavior === undefined ? {} : { observedBehavior: input.observedBehavior }),
    ...(input.expectedBehavior === undefined ? {} : { expectedBehavior: input.expectedBehavior }),
    ...(input.reproductionSteps === undefined ? {} : { reproductionSteps: input.reproductionSteps }),
    ...(input.logsOrErrors === undefined ? {} : { logsOrErrors: input.logsOrErrors }),
    ...(input.affectedSurface === undefined ? {} : { affectedSurface: input.affectedSurface }),
    ...(input.suspectedCause === undefined ? {} : { suspectedCause: input.suspectedCause }),
    ...(input.urgency === undefined ? {} : { urgency: input.urgency }),
    ...(input.candidateE2ECases === undefined ? {} : { candidateE2ECases: input.candidateE2ECases }),
    ...(input.candidateUIStates === undefined ? {} : { candidateUIStates: input.candidateUIStates }),
    ...(input.openQuestions === undefined ? {} : { openQuestions: input.openQuestions }),
    ...(input.assumptions === undefined ? {} : { assumptions: input.assumptions }),
    ...(input.relatedArtifacts === undefined ? {} : { relatedArtifacts: input.relatedArtifacts })
  };
}

export function validateAssembledWorkBrief(input) {
  const artifact = assembleWorkBrief(input);
  const validation = validateWorkBriefArtifact(artifact);
  return validation.ok ? ok({ artifact, validation }) : validationBlocked('before_persist', validation.errors);
}

export async function writeWorkBrief(input, outputPath) {
  const assembled = validateAssembledWorkBrief(input);
  if (!assembled.ok) return assembled;
  if (path.extname(outputPath) !== '.json') {
    return blocked('carrier_not_json', {
      stage: 'before_persist',
      errors: [{ code: ValidationErrorCode.CARRIER_NOT_JSON, pointer: '', message: 'Work Brief output path must use a .json carrier.' }]
    });
  }
  await writeJsonAtomic(outputPath, assembled.value.artifact);
  const fileValidation = validateWorkBriefFile(outputPath);
  if (!fileValidation.ok) return validationBlocked('after_persist', fileValidation.errors);
  const reread = JSON.parse(await fs.readFile(outputPath, 'utf8'));
  return ok({ artifact: assembled.value.artifact, filePath: outputPath, fileValidation, reread });
}
