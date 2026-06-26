import { ok, validationBlocked } from '../../shared/result.js';
import { validateWorkBriefFile } from '../../shared/artifact-validation.js';

export function consumeWorkBriefFile(filePath) {
  const validation = validateWorkBriefFile(filePath);
  if (!validation.ok) return validationBlocked('consumer_revalidate', validation.errors);
  return ok({ artifact: validation.artifact, validation });
}
