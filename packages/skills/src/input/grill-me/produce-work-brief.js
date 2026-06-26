import { blocked, ok } from '../../shared/result.js';
import { nonEmptySignal, normalizeCommonWorkBriefInput, persistProducerWorkBrief } from '../brainstorm/producer-common.js';

function signalArray(input, field) {
  return Array.isArray(input[field]) ? input[field].filter((item) => typeof item === 'string' && item.trim().length > 0) : [];
}

export function validateGrillMeProducerInput(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return blocked('invalid_object', { errors: [{ field: 'input', code: 'INVALID_INPUT', message: 'grill-me input must be a structured object.' }] });
  }
  const challengeContext = typeof input.challengeContext === 'string' && input.challengeContext.trim().length > 0 ? input.challengeContext : null;
  const challengedAssumptions = signalArray(input, 'challengedAssumptions');
  const edgeCases = signalArray(input, 'edgeCases');
  const acceptanceGaps = signalArray(input, 'acceptanceGaps');
  const riskCandidates = signalArray(input, 'riskCandidates');
  const errors = [];
  if (challengeContext === null) {
    errors.push({ field: 'challengeContext', code: 'MISSING_GRILL_CONTEXT', message: 'grill-me requires a non-empty adversarial challengeContext.' });
  }
  if (![challengedAssumptions, edgeCases, acceptanceGaps, riskCandidates].some(nonEmptySignal)) {
    errors.push({ field: 'challengeSignals', code: 'MISSING_GRILL_SIGNAL', message: 'grill-me requires at least one challenged assumption, edge case, acceptance gap, or risk/unknown candidate.' });
  }
  if (errors.length > 0) return blocked('invalid_grill_me_input', { errors });
  return ok({ challengeContext, challengedAssumptions, edgeCases, acceptanceGaps, riskCandidates });
}

export async function produceGrillMeWorkBrief(input, outputDescriptor) {
  const producerSpecific = validateGrillMeProducerInput(input);
  if (!producerSpecific.ok) return producerSpecific;
  const common = normalizeCommonWorkBriefInput(input, 'grill-me', {
    challengeContext: producerSpecific.value.challengeContext,
    challengedAssumptions: producerSpecific.value.challengedAssumptions,
    edgeCases: producerSpecific.value.edgeCases,
    acceptanceGaps: producerSpecific.value.acceptanceGaps,
    riskCandidates: producerSpecific.value.riskCandidates
  });
  if (!common.ok) return common;
  const enriched = ok({
    ...common.value,
    background: `${common.value.background}\n\nGrill-me challenge context: ${producerSpecific.value.challengeContext}`,
    risksAndUnknowns: [...common.value.risksAndUnknowns, ...producerSpecific.value.riskCandidates, ...producerSpecific.value.edgeCases],
    assumptions: [...(common.value.assumptions ?? []), ...producerSpecific.value.challengedAssumptions],
    openQuestions: [...(common.value.openQuestions ?? []), ...producerSpecific.value.acceptanceGaps]
  });
  return persistProducerWorkBrief(enriched, outputDescriptor);
}
