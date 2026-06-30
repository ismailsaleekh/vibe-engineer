import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SUPPORTED_SCHEMA_VERSION = "1.0.0";
export const ARTIFACT_KINDS = [
  "work_brief",
  "implementation_plan",
  "verification_delta",
  "build_result",
  "ship_packet",
  "evidence_packet",
  "agent_registry_entry",
  "context_file_header",
  "schematic_manifest",
  "skill_manifest",
];
export const SCHEMA_FILES = {
  work_brief: "schemas/work-brief.schema.json",
  implementation_plan: "schemas/implementation-plan.schema.json",
  verification_delta: "schemas/verification-delta.schema.json",
  build_result: "schemas/build-result.schema.json",
  ship_packet: "schemas/ship-packet.schema.json",
  evidence_packet: "schemas/evidence-packet.schema.json",
  agent_registry_entry: "schemas/agent-registry-entry.schema.json",
  context_file_header: "schemas/context-file-header.schema.json",
  schematic_manifest: "schemas/schematic-manifest.schema.json",
  skill_manifest: "schemas/skill-manifest.schema.json",
};

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function schemaPathForKind(kind) {
  const relative = SCHEMA_FILES[kind];
  if (!relative) return undefined;
  return path.join(packageRoot, relative);
}

export function loadSchema(kind) {
  const schemaPath = schemaPathForKind(kind);
  if (!schemaPath) return undefined;
  return JSON.parse(fs.readFileSync(schemaPath, "utf8"));
}

export function loadAllSchemas() {
  return Object.fromEntries(ARTIFACT_KINDS.map((kind) => [kind, loadSchema(kind)]));
}
