import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../../..');
const packageEntry = path.join(repoRoot, 'packages/artifacts/src/index.js');
const { validateArtifactKind, validateArtifactFile, ARTIFACT_KINDS } = await import(packageEntry);
const fixtures = path.join(repoRoot, 'packages/artifacts/fixtures');
const out = [];
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function valid(kind) { return JSON.parse(fs.readFileSync(path.join(fixtures, 'valid', `${kind}.json`), 'utf8')); }
function check(name, condition, details) { out.push({ name, ok: Boolean(condition), details }); }

// Baseline: every valid fixture accepted from disk by actual package API.
for (const kind of ARTIFACT_KINDS) {
  const result = validateArtifactFile(path.join(fixtures, 'valid', `${kind}.json`), { kind });
  check(`valid fixture accepted: ${kind}`, result.ok, result.ok ? { schemaId: result.schemaId } : { errors: result.errors });
}

// Required negative: a Verification Delta missing catalog categories must be rejected.
// The current valid fixture has only one requiredItems entry despite DL-02 requiring catalog-by-catalog coverage.
const vd = valid('verification_delta');
check('fixture has only one verification catalog item (test setup)', vd.requiredItems.length === 1, { layers: vd.requiredItems.map((item) => item.layer) });
const vdResult = validateArtifactKind('verification_delta', vd, { artifactPath: 'adversarial:verification_delta_missing_catalog_categories' });
check('verification delta missing catalog categories is rejected', !vdResult.ok, vdResult.ok ? { accepted: true } : { errors: vdResult.errors });

// Embedded Verification Delta in an Implementation Plan must also reject missing catalog categories.
const plan = valid('implementation_plan');
check('embedded plan delta has one catalog item (test setup)', plan.verificationDelta.requiredItems.length === 1, { layers: plan.verificationDelta.requiredItems.map((item) => item.layer) });
const planResult = validateArtifactKind('implementation_plan', plan, { artifactPath: 'adversarial:implementation_plan_embedded_delta_missing_catalog_categories' });
check('implementation plan with embedded incomplete delta is rejected', !planResult.ok, planResult.ok ? { accepted: true } : { errors: planResult.errors });

// Required negative: blocked verification delta item must have blockedBy/unblockCondition.
const blockedDelta = clone(vd);
blockedDelta.requiredItems[0].action = 'blocked';
delete blockedDelta.requiredItems[0].blockedBy;
delete blockedDelta.requiredItems[0].unblockCondition;
const blockedResult = validateArtifactKind('verification_delta', blockedDelta, { artifactPath: 'adversarial:blocked_delta_missing_unblock_fields' });
check('blocked verification item without blockedBy/unblockCondition is rejected', !blockedResult.ok, blockedResult.ok ? { accepted: true } : { errors: blockedResult.errors });

// Required negative: evidence missing top-level evidence_for link should be rejected even if another link exists.
const evidence = valid('evidence_packet');
evidence.links = [{ ...evidence.links[0], rel: 'produced_by' }];
const evidenceResult = validateArtifactKind('evidence_packet', evidence, { artifactPath: 'adversarial:evidence_packet_without_evidence_for_link' });
check('evidence packet without evidence_for link is rejected', !evidenceResult.ok, evidenceResult.ok ? { accepted: true } : { errors: evidenceResult.errors });

// Required negative: Build Result/Ship Packet verification claims must reference Evidence Packets, not arbitrary artifacts.
const buildResult = valid('build_result');
buildResult.verificationRuns[0].evidencePacketRef.artifactKind = 'work_brief';
buildResult.verificationRuns[0].evidencePacketRef.rel = 'derived_from';
const buildWrongEvidence = validateArtifactKind('build_result', buildResult, { artifactPath: 'adversarial:build_result_wrong_evidence_ref_kind' });
check('build result wrong evidence ref kind is rejected', !buildWrongEvidence.ok, buildWrongEvidence.ok ? { accepted: true } : { errors: buildWrongEvidence.errors });

const shipPacket = valid('ship_packet');
shipPacket.finalVerification[0].evidencePacketRef.artifactKind = 'work_brief';
shipPacket.finalVerification[0].evidencePacketRef.rel = 'derived_from';
const shipWrongEvidence = validateArtifactKind('ship_packet', shipPacket, { artifactPath: 'adversarial:ship_packet_wrong_evidence_ref_kind' });
check('ship packet wrong evidence ref kind is rejected', !shipWrongEvidence.ok, shipWrongEvidence.ok ? { accepted: true } : { errors: shipWrongEvidence.errors });

// Required negative: manifest action/tool policies must be substantive, not empty arrays.
const agent = valid('agent_registry_entry');
agent.allowedTools = [];
agent.forbiddenActions = [];
const agentPolicy = validateArtifactKind('agent_registry_entry', agent, { artifactPath: 'adversarial:agent_registry_empty_policy_arrays' });
check('agent registry empty allowed/forbidden policy arrays are rejected', !agentPolicy.ok, agentPolicy.ok ? { accepted: true } : { errors: agentPolicy.errors });

const skill = valid('skill_manifest');
skill.allowedActions = [];
const skillPolicy = validateArtifactKind('skill_manifest', skill, { artifactPath: 'adversarial:skill_manifest_empty_allowed_actions' });
check('skill manifest empty allowed action policy is rejected', !skillPolicy.ok, skillPolicy.ok ? { accepted: true } : { errors: skillPolicy.errors });

const failed = out.filter((entry) => !entry.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks: out }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
