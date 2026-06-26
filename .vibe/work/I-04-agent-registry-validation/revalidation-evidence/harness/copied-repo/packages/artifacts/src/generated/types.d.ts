// Generated from canonical JSON Schemas by scripts/generate-types.mjs. Do not hand edit.

export type ArtifactKind = "agent_registry_entry" | "build_result" | "context_file_header" | "evidence_packet" | "implementation_plan" | "schematic_manifest" | "ship_packet" | "skill_manifest" | "verification_delta" | "work_brief";

export interface ArtifactValidationError {
  artifactPath: string | null;
  artifactKind: ArtifactKind | null;
  schemaId: string | null;
  schemaVersion: string | null;
  pointer: string;
  code: string;
  message: string;
}

export type ArtifactValidationResult<T> =
  | { ok: true; artifact: T; kind: ArtifactKind; schemaId: string; schemaVersion: string }
  | { ok: false; errors: ArtifactValidationError[] };

export type AgentRegistryEntryV1 = {
  "schemaVersion": "1.0.0";
  "artifactKind": "agent_registry_entry";
  "artifactId": string;
  "title": string;
  "createdAt": string;
  "updatedAt": string;
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "status": "active" | "disabled" | "deprecated" | "experimental";
  "ownership": {
  "ownerLane": string;
  "ownedWritePaths": Array<string>;
  "readOnlyPaths": Array<string>;
  "untouchablePaths": Array<string>;
  "concurrencyNotes": string;
  "handoffPolicy"?: string;
};
  "links": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "extensions": {
  [key: string]: {
  "schemaVersion": string;
  [key: string]: unknown;
};
};
  "description"?: string;
  "tags"?: Array<string>;
  "sourceRefs"?: Array<{
  "kind": "source_doc" | "prompt" | "issue" | "url" | "artifact" | "raw_intent";
  "ref": string;
}>;
  "approvedBy"?: {
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "approvedAt": string;
};
  "supersessionReason"?: string;
  "retention"?: {
  "policy": string;
  "reason": string;
};
  "agentId": string;
  "displayName": string;
  "agentType": "orchestrator" | "specialist" | "validator" | "fixer" | "reviewer" | "meta" | "skill_adapter";
  "purpose": string;
  "triggers": Array<{
  "event": string;
  "description": string;
}>;
  "inputSchemas": Array<{
  "schemaId": string;
  "schemaVersion": "1.0.0";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
}>;
  "outputSchemas": Array<{
  "schemaId": string;
  "schemaVersion": "1.0.0";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
}>;
  "allowedTools": Array<string>;
  "forbiddenActions": Array<string>;
  "contextRequirements": Array<string>;
  "expectedArtifactPaths": Array<string>;
  "safety": {
  "parallelSafe": boolean;
  "writesAllowed": boolean;
  "requiresApprovalFor": Array<string>;
  "maxIterations"?: number;
};
  "validatorRefs": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "fixerRefs": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "maturity": "experimental" | "stable" | "core";
  "owner": string;
  "agentVersion": string;
  "evals": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "deprecation": {
  [key: string]: unknown;
} | null;
  "runtimeCostClass"?: string;
  "examples"?: Array<string>;
  "changelog"?: Array<string>;
  "selectedHarnessAdapters"?: Array<string>;
  "domainNeutralityReview"?: string;
};

export type BuildResultV1 = {
  "schemaVersion": "1.0.0";
  "artifactKind": "build_result";
  "artifactId": string;
  "title": string;
  "createdAt": string;
  "updatedAt": string;
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "status": "passed" | "failed" | "blocked" | "superseded";
  "ownership": {
  "ownerLane": string;
  "ownedWritePaths": Array<string>;
  "readOnlyPaths": Array<string>;
  "untouchablePaths": Array<string>;
  "concurrencyNotes": string;
  "handoffPolicy"?: string;
};
  "links": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "extensions": {
  [key: string]: {
  "schemaVersion": string;
  [key: string]: unknown;
};
};
  "description"?: string;
  "tags"?: Array<string>;
  "sourceRefs"?: Array<{
  "kind": "source_doc" | "prompt" | "issue" | "url" | "artifact" | "raw_intent";
  "ref": string;
}>;
  "approvedBy"?: {
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "approvedAt": string;
};
  "supersessionReason"?: string;
  "retention"?: {
  "policy": string;
  "reason": string;
};
  "implementationPlanRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "implementationSummary": string;
  "changedFilesSummary": Array<{
  "path": string;
  "changeKind": "created" | "modified" | "deleted" | "moved" | "unchanged_validated";
  "ownerLane": string;
  "summary": string;
}>;
  "schematicsUsed": Array<{
  "schematicManifestRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "inputRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "dryRunStatus": "passed" | "failed" | "not_run";
  "conflictStatus": "none" | "resolved" | "blocked";
  "outputPaths": Array<string>;
}>;
  "testsAndVerificationChanged": Array<{
  "path": string;
  "changeKind": "added" | "updated" | "reused";
  "evidenceRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
}>;
  "verificationRuns": Array<{
  "evidencePacketRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "summary": string;
  "result": "pass" | "fail" | "blocked" | "advisory" | "skipped";
  "blocking": boolean;
}>;
  "warningsAndBlockers": Array<{
  "severity": "critical" | "major-local" | "minor-local" | "advisory";
  "blocking": boolean;
  "owner": string;
  "evidenceRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
}>;
  "contextDocsUpdates": Array<{
  "ref": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "updateStatus": "updated" | "not_needed" | "blocked";
  "summary": string;
}>;
  "finalStatusReason": string;
  "iterationHistory"?: Array<string>;
  "fixAttempts"?: Array<string>;
  "parallelWorkPackages"?: Array<string>;
  "remainingFollowUps"?: Array<string>;
  "advisoryFindings"?: Array<string>;
};

export type ContextFileHeaderV1 = {
  "schemaVersion": "1.0.0";
  "artifactKind": "context_file_header";
  "artifactId": string;
  "title": string;
  "createdAt": string;
  "updatedAt": string;
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "status": "current" | "stale" | "needs_review" | "deprecated";
  "ownership": {
  "ownerLane": string;
  "ownedWritePaths": Array<string>;
  "readOnlyPaths": Array<string>;
  "untouchablePaths": Array<string>;
  "concurrencyNotes": string;
  "handoffPolicy"?: string;
};
  "links": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "extensions": {
  [key: string]: {
  "schemaVersion": string;
  [key: string]: unknown;
};
};
  "description"?: string;
  "tags"?: Array<string>;
  "sourceRefs"?: Array<{
  "kind": "source_doc" | "prompt" | "issue" | "url" | "artifact" | "raw_intent";
  "ref": string;
}>;
  "approvedBy"?: {
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "approvedAt": string;
};
  "supersessionReason"?: string;
  "retention"?: {
  "policy": string;
  "reason": string;
};
  "contextId": string;
  "scope": {
  "kind": "repo" | "app" | "package" | "module" | "contract" | "adapter" | "test" | "standard" | "skill" | "schematic" | "decision" | "work_item" | "other";
  "paths": Array<string>;
  "description": string;
};
  "owner": string;
  "dependencies": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "dependents": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "relatedDecisions": Array<string>;
  "relatedPlansArtifacts": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "verificationMetadata": {
  "lastValidationEvidenceRefs": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "status": "valid" | "invalid" | "blocked" | "unknown";
};
  "updateMetadata": {
  "lastReviewedAt": string;
  "lastUpdatedBy": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "updateReason": string;
};
  "driftMetadata": {
  "driftStatus": "unknown" | "clean" | "suspected" | "confirmed";
  "lastDriftCheckAt": string;
  "evidenceRefs": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
};
  "retrievalHints"?: Array<string>;
  "summary"?: string;
  "standardsRefs"?: Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "ttl"?: string;
  "replacementRef"?: {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
};

export type EvidencePacketV1 = {
  "schemaVersion": "1.0.0";
  "artifactKind": "evidence_packet";
  "artifactId": string;
  "title": string;
  "createdAt": string;
  "updatedAt": string;
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "status": "passed" | "failed" | "blocked" | "advisory_warning" | "not_run" | "superseded";
  "ownership": {
  "ownerLane": string;
  "ownedWritePaths": Array<string>;
  "readOnlyPaths": Array<string>;
  "untouchablePaths": Array<string>;
  "concurrencyNotes": string;
  "handoffPolicy"?: string;
};
  "links": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "extensions": {
  [key: string]: {
  "schemaVersion": string;
  [key: string]: unknown;
};
};
  "description"?: string;
  "tags"?: Array<string>;
  "sourceRefs"?: Array<{
  "kind": "source_doc" | "prompt" | "issue" | "url" | "artifact" | "raw_intent";
  "ref": string;
}>;
  "approvedBy"?: {
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "approvedAt": string;
};
  "supersessionReason"?: string;
  "retention"?: {
  "policy": string;
  "reason": string;
};
  "evidenceClass": "deterministic" | "advisory" | "informational";
  "layer": "safety_hooks" | "typecheck" | "lint_format" | "mechanical_gate" | "unit" | "integration" | "contract_adapter" | "e2e" | "ui_verification" | "ai_eval" | "build_package" | "context_drift" | "observability" | "advisory_review" | "final_dod" | "schema_validation";
  "subjectRefs": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "commandOrTool": {
  "kind": "command" | "tool" | "validator" | "agent" | "manual_operator";
  "name": string;
  "argv"?: Array<string>;
  "version"?: string;
  "workingDirectory": string;
  "environmentSummary": string;
};
  "startedAt": string;
  "endedAt": string;
  "exitStatus": {
  "kind": "exit_code" | "tool_status" | "not_applicable";
  "code"?: number;
  "status"?: string;
};
  "result": "pass" | "fail" | "blocked" | "advisory" | "skipped";
  "blocking": boolean;
  "artifacts": Array<string>;
  "warnings": Array<string>;
  "failureDetails"?: {
  "code": string;
  "message": string;
  "classification": "deterministic_product_or_code_failure" | "schema_or_contract_failure" | "safety_or_security_policy_failure" | "mechanical_gate_failure" | "test_assertion_failure" | "test_bug" | "environment_issue" | "timing_or_flaky_suspicion" | "external_dependency_drift" | "advisory_finding" | "missing_evidence" | "missing_runner_or_prerequisite" | "skipped_required_delta_category" | "blocked_prerequisite" | "runner_internal_error" | "classification_unknown";
};
  "stdoutRef"?: string;
  "stderrRef"?: string;
  "logsRef"?: string;
  "screenshots"?: Array<string>;
  "traces"?: Array<string>;
  "metrics"?: Array<string>;
  "rerunOf"?: string;
  "normalizationNotes"?: string;
};

export type ImplementationPlanV1 = {
  "schemaVersion": "1.0.0";
  "artifactKind": "implementation_plan";
  "artifactId": string;
  "title": string;
  "createdAt": string;
  "updatedAt": string;
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "status": "draft" | "approved" | "blocked" | "superseded";
  "ownership": {
  "ownerLane": string;
  "ownedWritePaths": Array<string>;
  "readOnlyPaths": Array<string>;
  "untouchablePaths": Array<string>;
  "concurrencyNotes": string;
  "handoffPolicy"?: string;
};
  "links": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "extensions": {
  [key: string]: {
  "schemaVersion": string;
  [key: string]: unknown;
};
};
  "description"?: string;
  "tags"?: Array<string>;
  "sourceRefs"?: Array<{
  "kind": "source_doc" | "prompt" | "issue" | "url" | "artifact" | "raw_intent";
  "ref": string;
}>;
  "approvedBy"?: {
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "approvedAt": string;
};
  "supersessionReason"?: string;
  "retention"?: {
  "policy": string;
  "reason": string;
};
  "workBriefRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "objective": string;
  "scope": Array<string>;
  "nonScope": Array<string>;
  "contextClosure": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "affectedAreas": Array<{
  "kind": "app" | "package" | "module" | "contract" | "adapter" | "test" | "docs" | "context" | "schematic" | "skill" | "other";
  "path": string;
  "reason": string;
}>;
  "schematics": Array<{
  "schematicRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "plannedInputsRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "purpose": string;
}>;
  "implementationSteps": Array<{
  "id": string;
  "description": string;
  "dependsOn"?: Array<string>;
  "expectedTouchedAreas": Array<{
  "kind": "app" | "package" | "module" | "contract" | "adapter" | "test" | "docs" | "context" | "schematic" | "skill" | "other";
  "path": string;
  "reason": string;
}>;
  "acceptanceLinks": Array<string>;
}>;
  "acceptanceCriteria": Array<{
  "id": string;
  "description": string;
}>;
  "definitionOfDone": Array<{
  "id": string;
  "description": string;
  "blocking": boolean;
}>;
  "risks": Array<{
  "id": string;
  "description": string;
  "sensitiveArea": string;
  "mitigation": string;
}>;
  "openBlockers": Array<{
  "id": string;
  "description": string;
  "blocking": boolean;
  "owner": string;
}>;
  "verificationDelta": {
  "schemaVersion": "1.0.0";
  "artifactKind": "verification_delta";
  "artifactId": string;
  "title": string;
  "createdAt": string;
  "updatedAt": string;
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "status": "complete" | "blocked" | "superseded";
  "ownership": {
  "ownerLane": string;
  "ownedWritePaths": Array<string>;
  "readOnlyPaths": Array<string>;
  "untouchablePaths": Array<string>;
  "concurrencyNotes": string;
  "handoffPolicy"?: string;
};
  "links": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "extensions": {
  [key: string]: {
  "schemaVersion": string;
  [key: string]: unknown;
};
};
  "description"?: string;
  "tags"?: Array<string>;
  "sourceRefs"?: Array<{
  "kind": "source_doc" | "prompt" | "issue" | "url" | "artifact" | "raw_intent";
  "ref": string;
}>;
  "approvedBy"?: {
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "approvedAt": string;
};
  "supersessionReason"?: string;
  "retention"?: {
  "policy": string;
  "reason": string;
};
  "summary": string;
  "implementationPlanRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "sensitiveAreas": Array<string>;
  "catalogVersion": string;
  "requiredItems": Array<{
  "id": string;
  "layer": "safety_hooks" | "typecheck" | "lint_format" | "mechanical_gate" | "unit" | "integration" | "contract_adapter" | "e2e" | "ui_verification" | "ai_eval" | "build_package" | "context_drift" | "observability" | "advisory_review" | "final_dod" | "schema_validation";
  "action": "add" | "update" | "reuse" | "not_applicable" | "blocked";
  "rationale": string;
  "expectedArtifacts": Array<string>;
  "blocking": boolean;
  "validationOwner": string;
  "fixerOwner": string;
  "evidenceRequired": Array<{
  "kind": "evidence_packet" | "test_report" | "command_log" | "screenshot" | "trace" | "metric" | "context_header";
  "description": string;
  "blocking": boolean;
}>;
  "blockedBy"?: string;
  "unblockCondition"?: string;
}>;
  "mechanicalGateImpacts"?: Array<string>;
  "advisoryReviewItems"?: Array<string>;
  "rerunHints"?: Array<string>;
  "riskLinks"?: Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
};
  "workDecompositionHints"?: Array<string>;
  "parallelismHints"?: Array<string>;
  "docsContextUpdatesExpected"?: Array<string>;
  "approval"?: {
  "approvedBy": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "approvedAt": string;
  "notes": string;
};
  "reviewNotes"?: Array<string>;
};

export type SchematicManifestV1 = {
  "schemaVersion": "1.0.0";
  "artifactKind": "schematic_manifest";
  "artifactId": string;
  "title": string;
  "createdAt": string;
  "updatedAt": string;
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "status": "active" | "deprecated" | "experimental" | "disabled";
  "ownership": {
  "ownerLane": string;
  "ownedWritePaths": Array<string>;
  "readOnlyPaths": Array<string>;
  "untouchablePaths": Array<string>;
  "concurrencyNotes": string;
  "handoffPolicy"?: string;
};
  "links": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "extensions": {
  [key: string]: {
  "schemaVersion": string;
  [key: string]: unknown;
};
};
  "description"?: string;
  "tags"?: Array<string>;
  "sourceRefs"?: Array<{
  "kind": "source_doc" | "prompt" | "issue" | "url" | "artifact" | "raw_intent";
  "ref": string;
}>;
  "approvedBy"?: {
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "approvedAt": string;
};
  "supersessionReason"?: string;
  "retention"?: {
  "policy": string;
  "reason": string;
};
  "schematicId": string;
  "schematicVersion": string;
  "purpose": string;
  "inputs": Array<{
  "name": string;
  "schema": {
  "schemaId": string;
  "schemaVersion": "1.0.0";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
};
  "required": boolean;
  "defaultsPolicy": "no_default" | "domain_neutral_default" | "user_supplied_only";
  "domainNeutralityClassification": "core_generic" | "sample_demo" | "project_extension";
}>;
  "generatedPaths": Array<{
  "pathTemplate": string;
  "ownership": string;
  "conflictPolicy": "fail" | "merge_with_typed_strategy" | "skip_if_identical";
  "classification": "generated" | "vendor" | "operator_owned";
}>;
  "idempotency": {
  "strategy": string;
  "stableIdentifiers": Array<string>;
  "rerunBehavior": string;
};
  "conflictBehavior": "fail" | "merge_with_typed_strategy" | "skip_if_identical";
  "dryRunBehavior": {
  "reportsPlannedChanges": boolean;
  "writesFiles": false;
};
  "requiredTests": Array<{
  "evidencePacketRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "summary": string;
  "result": "pass" | "fail" | "blocked" | "advisory" | "skipped";
  "blocking": boolean;
}>;
  "contextUpdates": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "domainNeutrality": {
  "coreSurface": boolean;
  "allowedGenericTerms": Array<string>;
  "extensionBoundaries": Array<string>;
};
  "owner": string;
  "examples"?: Array<string>;
  "fixtures"?: Array<string>;
  "deprecation"?: {
  [key: string]: unknown;
} | null;
  "changelog"?: Array<string>;
  "adapterRequirements"?: Array<string>;
};

export type ShipPacketV1 = {
  "schemaVersion": "1.0.0";
  "artifactKind": "ship_packet";
  "artifactId": string;
  "title": string;
  "createdAt": string;
  "updatedAt": string;
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "status": "ready_for_review" | "blocked" | "superseded" | "approved_for_operator_action";
  "ownership": {
  "ownerLane": string;
  "ownedWritePaths": Array<string>;
  "readOnlyPaths": Array<string>;
  "untouchablePaths": Array<string>;
  "concurrencyNotes": string;
  "handoffPolicy"?: string;
};
  "links": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "extensions": {
  [key: string]: {
  "schemaVersion": string;
  [key: string]: unknown;
};
};
  "description"?: string;
  "tags"?: Array<string>;
  "sourceRefs"?: Array<{
  "kind": "source_doc" | "prompt" | "issue" | "url" | "artifact" | "raw_intent";
  "ref": string;
}>;
  "approvedBy"?: {
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "approvedAt": string;
};
  "supersessionReason"?: string;
  "retention"?: {
  "policy": string;
  "reason": string;
};
  "buildResultRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "finalVerification": Array<{
  "evidencePacketRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "summary": string;
  "result": "pass" | "fail" | "blocked" | "advisory" | "skipped";
  "blocking": boolean;
}>;
  "contextPreservation": {
  "contextHeaderRefs": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "driftCheckEvidenceRefs": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "updateStatus": "updated" | "clean" | "blocked";
};
  "commitPreparation": {
  "suggestedCommitMessage": string;
  "commitBody"?: string;
  "commitPerformedByAgent": false;
};
  "prPreparation": {
  "suggestedTitle": string;
  "suggestedBody": string;
  "reviewerNotes": Array<string>;
  "prOpenedByAgent": false;
};
  "releaseOrMigrationNotes": Array<{
  "note": string;
  "rationale": string;
}>;
  "followUps": Array<{
  "owner": string;
  "description": string;
  "blocking": boolean;
}>;
  "noPushWithoutApproval": true;
  "operatorApprovalRef"?: {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "rollbackNotes"?: string;
  "knownAdvisoryWarnings"?: Array<string>;
  "artifactBundleRefs"?: Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
};

export type SkillManifestV1 = {
  "schemaVersion": "1.0.0";
  "artifactKind": "skill_manifest";
  "artifactId": string;
  "title": string;
  "createdAt": string;
  "updatedAt": string;
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "status": "active" | "deprecated" | "experimental" | "disabled";
  "ownership": {
  "ownerLane": string;
  "ownedWritePaths": Array<string>;
  "readOnlyPaths": Array<string>;
  "untouchablePaths": Array<string>;
  "concurrencyNotes": string;
  "handoffPolicy"?: string;
};
  "links": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "extensions": {
  [key: string]: {
  "schemaVersion": string;
  [key: string]: unknown;
};
};
  "description"?: string;
  "tags"?: Array<string>;
  "sourceRefs"?: Array<{
  "kind": "source_doc" | "prompt" | "issue" | "url" | "artifact" | "raw_intent";
  "ref": string;
}>;
  "approvedBy"?: {
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "approvedAt": string;
};
  "supersessionReason"?: string;
  "retention"?: {
  "policy": string;
  "reason": string;
};
  "skillId": "brainstorm" | "grill-me" | "task" | "plan" | "build" | "ship";
  "skillVersion": string;
  "purpose": string;
  "inputArtifactSchemas": Array<{
  "schemaId": string;
  "schemaVersion": "1.0.0";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
}>;
  "outputArtifactSchemas": Array<{
  "schemaId": string;
  "schemaVersion": "1.0.0";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
}>;
  "allowedActions": Array<string>;
  "forbiddenActions": Array<string>;
  "clarifyingQuestionPolicy": {
  "mayAsk": boolean;
  "conditions": Array<string>;
};
  "blockingPolicy": {
  "blockWhen": Array<string>;
  "evidenceRequired": boolean;
};
  "subagentRelationships": Array<{
  "agentRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "role": "orchestrator" | "specialist" | "validator" | "fixer" | "reviewer" | "meta";
}>;
  "validatorFixerPolicy": {
  "maxIterations": number;
  "independentValidationRequired": boolean;
};
  "storageHandoffContract": {
  "artifactRefs": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "delegatedWritePaths": Array<string>;
  "nextSkillHandoffConstraints": Array<string>;
};
  "selectedHarnessIntegrationHooks": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "owner": string;
  "examples"?: Array<string>;
  "evals"?: Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "changelog"?: Array<string>;
  "deprecation"?: {
  [key: string]: unknown;
} | null;
  "securityNotes"?: string;
  "contextRequirements"?: Array<string>;
};

export type VerificationDeltaV1 = {
  "schemaVersion": "1.0.0";
  "artifactKind": "verification_delta";
  "artifactId": string;
  "title": string;
  "createdAt": string;
  "updatedAt": string;
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "status": "complete" | "blocked" | "superseded";
  "ownership": {
  "ownerLane": string;
  "ownedWritePaths": Array<string>;
  "readOnlyPaths": Array<string>;
  "untouchablePaths": Array<string>;
  "concurrencyNotes": string;
  "handoffPolicy"?: string;
};
  "links": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "extensions": {
  [key: string]: {
  "schemaVersion": string;
  [key: string]: unknown;
};
};
  "description"?: string;
  "tags"?: Array<string>;
  "sourceRefs"?: Array<{
  "kind": "source_doc" | "prompt" | "issue" | "url" | "artifact" | "raw_intent";
  "ref": string;
}>;
  "approvedBy"?: {
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "approvedAt": string;
};
  "supersessionReason"?: string;
  "retention"?: {
  "policy": string;
  "reason": string;
};
  "summary": string;
  "implementationPlanRef": {
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
};
  "sensitiveAreas": Array<string>;
  "catalogVersion": string;
  "requiredItems": Array<{
  "id": string;
  "layer": "safety_hooks" | "typecheck" | "lint_format" | "mechanical_gate" | "unit" | "integration" | "contract_adapter" | "e2e" | "ui_verification" | "ai_eval" | "build_package" | "context_drift" | "observability" | "advisory_review" | "final_dod" | "schema_validation";
  "action": "add" | "update" | "reuse" | "not_applicable" | "blocked";
  "rationale": string;
  "expectedArtifacts": Array<string>;
  "blocking": boolean;
  "validationOwner": string;
  "fixerOwner": string;
  "evidenceRequired": Array<{
  "kind": "evidence_packet" | "test_report" | "command_log" | "screenshot" | "trace" | "metric" | "context_header";
  "description": string;
  "blocking": boolean;
}>;
  "blockedBy"?: string;
  "unblockCondition"?: string;
}>;
  "mechanicalGateImpacts"?: Array<string>;
  "advisoryReviewItems"?: Array<string>;
  "rerunHints"?: Array<string>;
  "riskLinks"?: Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
};

export type WorkBriefV1 = {
  "schemaVersion": "1.0.0";
  "artifactKind": "work_brief";
  "artifactId": string;
  "title": string;
  "createdAt": string;
  "updatedAt": string;
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "status": "draft" | "ready" | "blocked" | "superseded";
  "ownership": {
  "ownerLane": string;
  "ownedWritePaths": Array<string>;
  "readOnlyPaths": Array<string>;
  "untouchablePaths": Array<string>;
  "concurrencyNotes": string;
  "handoffPolicy"?: string;
};
  "links": Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
  "extensions": {
  [key: string]: {
  "schemaVersion": string;
  [key: string]: unknown;
};
};
  "description"?: string;
  "tags"?: Array<string>;
  "sourceRefs"?: Array<{
  "kind": "source_doc" | "prompt" | "issue" | "url" | "artifact" | "raw_intent";
  "ref": string;
}>;
  "approvedBy"?: {
  "producer": {
  "kind": "skill" | "agent" | "cli" | "schematic" | "verification_runner" | "human_operator" | "system";
  "id": string;
  "name": string;
  "version"?: string;
  "runId"?: string;
};
  "approvedAt": string;
};
  "supersessionReason"?: string;
  "retention"?: {
  "policy": string;
  "reason": string;
};
  "sourceSkill": "brainstorm" | "grill-me" | "task";
  "workType": "feature" | "bug" | "chore" | "refactor" | "research" | "decision";
  "background": string;
  "problemOrOpportunity": string;
  "desiredOutcome": string;
  "constraints": Array<string>;
  "userVisibleBehavior": Array<string>;
  "nonGoals": Array<string>;
  "risksAndUnknowns": Array<string>;
  "acceptanceNotes": Array<{
  "id": string;
  "description": string;
  "candidateScenarioRefs"?: Array<string>;
}>;
  "sourceMetadata": {
  "rawIntentRefs": Array<string>;
  "conversationRefs": Array<string>;
  "operatorRefs": Array<string>;
  "inputTimestamp"?: string;
};
  "observedBehavior"?: string;
  "expectedBehavior"?: string;
  "reproductionSteps"?: Array<string>;
  "logsOrErrors"?: Array<string>;
  "affectedSurface"?: string;
  "suspectedCause"?: string;
  "urgency"?: "low" | "medium" | "high" | "urgent";
  "candidateE2ECases"?: Array<string>;
  "candidateUIStates"?: Array<string>;
  "openQuestions"?: Array<string>;
  "assumptions"?: Array<string>;
  "relatedArtifacts"?: Array<{
  "rel": "raw_intent" | "derived_from" | "supersedes" | "superseded_by" | "implements" | "verifies" | "evidence_for" | "consumed_by" | "produced_by" | "context_for" | "registry_entry_for" | "manifest_for" | "verification_delta_of" | "build_result_of" | "ship_packet_of";
  "artifactKind": "work_brief" | "implementation_plan" | "verification_delta" | "build_result" | "ship_packet" | "evidence_packet" | "agent_registry_entry" | "context_file_header" | "schematic_manifest" | "skill_manifest";
  "artifactId": string;
  "path": string;
  "required": boolean;
  "statusAtLinkTime": string;
}>;
};

export type AnyArtifactV1 = AgentRegistryEntryV1 | BuildResultV1 | ContextFileHeaderV1 | EvidencePacketV1 | ImplementationPlanV1 | SchematicManifestV1 | ShipPacketV1 | SkillManifestV1 | VerificationDeltaV1 | WorkBriefV1;

export const ARTIFACT_KINDS: readonly ArtifactKind[];
export const SUPPORTED_SCHEMA_VERSION: '1.0.0';
export const SCHEMA_FILES: Readonly<Record<ArtifactKind, string>>;
export function schemaPathForKind(kind: ArtifactKind): string | undefined;
export function loadSchema(kind: ArtifactKind): unknown;
export function loadAllSchemas(): Readonly<Record<ArtifactKind, unknown>>;
export function compileAllArtifactSchemas(): Readonly<{ schemaVersion: '1.0.0'; kinds: readonly ArtifactKind[] }>;
export function validateArtifact(data: unknown, options?: { artifactPath?: string }): ArtifactValidationResult<AnyArtifactV1>;
export function validateArtifactKind(kind: ArtifactKind, data: unknown, options?: { artifactPath?: string }): ArtifactValidationResult<AnyArtifactV1>;
export function validateArtifactFile(filePath: string, options?: { artifactPath?: string; kind?: ArtifactKind }): ArtifactValidationResult<AnyArtifactV1>;
export const ValidationErrorCode: Readonly<Record<string, string>>;
