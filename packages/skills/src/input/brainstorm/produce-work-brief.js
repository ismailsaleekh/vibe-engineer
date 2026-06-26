import { blocked, ok } from '../../shared/result.js';
import { nonEmptySignal, normalizeCommonWorkBriefInput, persistProducerWorkBrief } from './producer-common.js';

function signalArray(input, field) {
  return Array.isArray(input[field]) ? input[field].filter((item) => typeof item === 'string' && item.trim().length > 0) : [];
}

export function validateBrainstormProducerInput(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return blocked('invalid_object', { errors: [{ field: 'input', code: 'INVALID_INPUT', message: 'brainstorm input must be a structured object.' }] });
  }
  const ideaContext = typeof input.ideaContext === 'string' && input.ideaContext.trim().length > 0 ? input.ideaContext : null;
  const options = signalArray(input, 'options');
  const tradeoffs = signalArray(input, 'tradeoffs');
  const openQuestions = signalArray(input, 'openQuestions');
  const candidateScenarios = signalArray(input, 'candidateScenarios');
  const errors = [];
  if (ideaContext === null) {
    errors.push({ field: 'ideaContext', code: 'MISSING_BRAINSTORM_CONTEXT', message: 'brainstorm requires a non-empty exploratory ideaContext.' });
  }
  if (![options, tradeoffs, openQuestions, candidateScenarios].some(nonEmptySignal)) {
    errors.push({ field: 'explorationSignals', code: 'MISSING_BRAINSTORM_SIGNAL', message: 'brainstorm requires at least one option, tradeoff, open question, or candidate scenario.' });
  }
  if (errors.length > 0) return blocked('invalid_brainstorm_input', { errors });
  return ok({ ideaContext, options, tradeoffs, openQuestions, candidateScenarios });
}

export async function produceBrainstormWorkBrief(input, outputDescriptor) {
  const producerSpecific = validateBrainstormProducerInput(input);
  if (!producerSpecific.ok) return producerSpecific;
  const common = normalizeCommonWorkBriefInput(input, 'brainstorm', {
    ideaContext: producerSpecific.value.ideaContext,
    options: producerSpecific.value.options,
    tradeoffs: producerSpecific.value.tradeoffs,
    openQuestions: producerSpecific.value.openQuestions,
    candidateScenarios: producerSpecific.value.candidateScenarios
  });
  if (!common.ok) return common;
  const enriched = ok({
    ...common.value,
    background: `${common.value.background}\n\nBrainstorm context: ${producerSpecific.value.ideaContext}`,
    risksAndUnknowns: [...common.value.risksAndUnknowns, ...producerSpecific.value.tradeoffs],
    openQuestions: [...(common.value.openQuestions ?? []), ...producerSpecific.value.openQuestions],
    candidateE2ECases: producerSpecific.value.candidateScenarios.length === 0
      ? common.value.candidateE2ECases
      : [...(common.value.candidateE2ECases ?? []), ...producerSpecific.value.candidateScenarios]
  });
  return persistProducerWorkBrief(enriched, outputDescriptor);
}
