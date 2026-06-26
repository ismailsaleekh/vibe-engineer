import { blocked, ok } from '../../shared/result.js';
import { normalizeCommonWorkBriefInput, persistProducerWorkBrief } from '../brainstorm/producer-common.js';

function signalArray(input, field) {
  return Array.isArray(input[field]) ? input[field].filter((item) => typeof item === 'string' && item.trim().length > 0) : [];
}

export function validateTaskProducerInput(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return blocked('invalid_object', { errors: [{ field: 'input', code: 'INVALID_INPUT', message: 'task input must be a structured object.' }] });
  }
  const objective = typeof input.objective === 'string' && input.objective.trim().length > 0 ? input.objective : null;
  const request = typeof input.request === 'string' && input.request.trim().length > 0 ? input.request : null;
  const errors = [];
  if (objective === null && request === null) {
    errors.push({ field: 'objective', code: 'MISSING_TASK_OBJECTIVE', message: 'task requires a direct objective or request.' });
  }

  if (input.workType === 'bug') {
    const observedBehavior = typeof input.observedBehavior === 'string' && input.observedBehavior.trim().length > 0 ? input.observedBehavior : null;
    const expectedBehavior = typeof input.expectedBehavior === 'string' && input.expectedBehavior.trim().length > 0 ? input.expectedBehavior : null;
    const reproductionSteps = signalArray(input, 'reproductionSteps');
    if (observedBehavior === null) errors.push({ field: 'observedBehavior', code: 'MISSING_BUG_OBSERVED_BEHAVIOR', message: 'bug task requires observedBehavior.' });
    if (expectedBehavior === null) errors.push({ field: 'expectedBehavior', code: 'MISSING_BUG_EXPECTED_BEHAVIOR', message: 'bug task requires expectedBehavior.' });
    if (reproductionSteps.length === 0) errors.push({ field: 'reproductionSteps', code: 'MISSING_BUG_REPRODUCTION', message: 'bug task requires at least one reproduction step.' });
  }

  if (errors.length > 0) return blocked('invalid_task_input', { errors });
  return ok({ objective: objective ?? request, request });
}

export async function produceTaskWorkBrief(input, outputDescriptor) {
  const producerSpecific = validateTaskProducerInput(input);
  if (!producerSpecific.ok) return producerSpecific;
  const common = normalizeCommonWorkBriefInput(input, 'task', {
    objective: producerSpecific.value.objective,
    request: producerSpecific.value.request,
    bugEvidenceCaptured: input.workType === 'bug'
  });
  if (!common.ok) return common;
  const enriched = ok({
    ...common.value,
    problemOrOpportunity: `${common.value.problemOrOpportunity}\n\nTask objective: ${producerSpecific.value.objective}`,
    observedBehavior: input.observedBehavior,
    expectedBehavior: input.expectedBehavior,
    reproductionSteps: input.reproductionSteps,
    logsOrErrors: input.logsOrErrors,
    affectedSurface: input.affectedSurface,
    suspectedCause: input.suspectedCause,
    urgency: input.urgency
  });
  return persistProducerWorkBrief(enriched, outputDescriptor);
}
