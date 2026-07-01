import { getPiAdapterCapabilityMatrix } from "../capabilities/index.ts";
import { getPiGeneratedFileManifest } from "../generated-file-manifest/index.ts";
import {
  SKILL_IDS,
  validateCapabilityMatrix,
  validateGeneratedFileManifest,
  type GeneratedFileFamily,
  type GeneratedFileFamilyId,
  type GeneratedFileManifest,
  type SkillId,
} from "../schema/index.ts";
import {
  assertPiRuntimeFixtureValid,
  validatePiRuntimeFixtureAgainstI14A,
} from "../runtime/validation.ts";
import type {
  PiRuntimeAsset,
  PiRuntimeAssetMetadata,
  PiRuntimeExtensionPolicy,
  PiRuntimeFixture,
  PiRuntimePromptContract,
  PiRuntimeSkillProtocol,
  PiRuntimeValidationIssue,
} from "../runtime/types.ts";
import { PiRuntimeContractError } from "../runtime/types.ts";

const GENERATED_BY = "I-14B-pi-adapter-runtime-skill-consumption" as const;
const RUNTIME_EXECUTION_CLAIM = "pending-live" as const;

const fail = (path: string, code: string, message: string): never => {
  const issues: readonly PiRuntimeValidationIssue[] = [{ path, code, message, severity: "error" }];
  throw new PiRuntimeContractError(message, issues);
};

const familyById = (
  manifest: GeneratedFileManifest,
  familyId: GeneratedFileFamilyId,
): GeneratedFileFamily => {
  const family = manifest.families.find((candidate) => candidate.familyId === familyId);
  if (family !== undefined) {
    return family;
  }
  return fail(
    "i14a.generatedFileManifest.families",
    "missing_generated_file_family",
    `I-14A generated-file manifest does not contain ${familyId}.`,
  );
};

const baseMetadata = (): Pick<PiRuntimeAssetMetadata, "generatedBy" | "runtimeExecutionClaim"> => ({
  generatedBy: GENERATED_BY,
  runtimeExecutionClaim: RUNTIME_EXECUTION_CLAIM,
});

const skillSummary = (skillId: SkillId): string => {
  switch (skillId) {
    case "brainstorm":
      return "Explore unclear raw intent and persist one Work Brief for plan intake.";
    case "grill-me":
      return "Pressure-test assumptions and persist one Work Brief for plan intake.";
    case "task":
      return "Normalize a concrete request and persist one Work Brief for plan intake.";
    case "plan":
      return "Consume exactly one Work Brief and produce an Implementation Plan with Verification Delta.";
    case "build":
      return "Consume an approved Implementation Plan and produce a Build Result after implementation and verification evidence.";
    case "ship":
      return "Consume a Build Result and produce a Ship Packet; push or PR creation requires explicit approval.";
  }
};

const skillProtocol = (skillId: SkillId): PiRuntimeSkillProtocol => {
  switch (skillId) {
    case "brainstorm":
    case "grill-me":
    case "task":
      return {
        skillId,
        protocolKind: "work-brief-producer",
        inputArtifact: "raw-intent",
        outputArtifact: "work-brief",
        forbiddenArtifacts: [
          "implementation-plan",
          "build-result",
          "ship-packet",
          "push",
          "pull-request",
        ],
        summary: skillSummary(skillId),
      };
    case "plan":
      return {
        skillId,
        protocolKind: "implementation-plan-producer",
        inputArtifact: "work-brief",
        outputArtifact: "implementation-plan-with-verification-delta",
        forbiddenArtifacts: ["build-result", "ship-packet", "push", "pull-request"],
        summary: skillSummary(skillId),
      };
    case "build":
      return {
        skillId,
        protocolKind: "build-result-producer",
        inputArtifact: "approved-implementation-plan",
        outputArtifact: "build-result",
        forbiddenArtifacts: ["ship-packet", "push", "pull-request"],
        summary: skillSummary(skillId),
      };
    case "ship":
      return {
        skillId,
        protocolKind: "ship-packet-producer",
        inputArtifact: "build-result",
        outputArtifact: "ship-packet",
        forbiddenArtifacts: ["push", "pull-request"],
        summary: skillSummary(skillId),
      };
  }
};

const requiredSkillBehavior = (skillId: SkillId): readonly string[] => {
  switch (skillId) {
    case "brainstorm":
      return [
        "Capture the raw request at `.vibe/work/<work-id>/raw-intent.md` before normalizing it.",
        'Write exactly one Work Brief JSON artifact at `.vibe/work/<work-id>/work-brief.json` using `artifactKind: "work_brief"` and `schemaVersion: "1.0.0"`.',
        'Use `status: "ready"` only when the brief has enough user-visible outcome, constraints, non-goals, risks, and acceptance notes for planning; otherwise use `status: "blocked"` and list the missing questions.',
        "Preserve uncertainty explicitly in `risksAndUnknowns`; do not invent product facts.",
      ];
    case "grill-me":
      return [
        "Ask only clarifying questions needed to remove plan-blocking ambiguity, then capture the final input at `.vibe/work/<work-id>/raw-intent.md`.",
        'Write exactly one Work Brief JSON artifact at `.vibe/work/<work-id>/work-brief.json` using `artifactKind: "work_brief"` and `schemaVersion: "1.0.0"`.',
        "Include challenged assumptions in `risksAndUnknowns` and concrete acceptance notes in `acceptanceNotes`.",
        "Do not proceed to planning when the operator has not resolved a blocking assumption.",
      ];
    case "task":
      return [
        "Capture the operator request at `.vibe/work/<work-id>/raw-intent.md` unless an existing durable raw-intent path is provided.",
        'Write exactly one Work Brief JSON artifact at `.vibe/work/<work-id>/work-brief.json` using `artifactKind: "work_brief"` and `schemaVersion: "1.0.0"`.',
        "Fill the canonical fields: `artifactId`, `title`, timestamps, `producer`, `ownership`, `links`, `sourceSkill`, `workType`, `background`, `problemOrOpportunity`, `desiredOutcome`, `constraints`, `userVisibleBehavior`, `nonGoals`, `risksAndUnknowns`, `acceptanceNotes`, and `sourceMetadata`.",
        "Keep scope narrow enough for one plan/build cycle; split or block if the request is too broad.",
      ];
    case "plan":
      return [
        "Read exactly one Work Brief from `.vibe/work/<work-id>/work-brief.json`; reject raw chat or multiple competing briefs.",
        'Write `.vibe/work/<work-id>/implementation-plan.json` using `artifactKind: "implementation_plan"` and `schemaVersion: "1.0.0"`.',
        "Default `status` to `draft`; set `approved` only after explicit operator approval for this exact persisted plan.",
        "Include canonical plan fields: `workBriefRef`, `objective`, `scope`, `nonScope`, `contextClosure`, `affectedAreas`, `implementationSteps`, `acceptanceCriteria`, `definitionOfDone`, `risks`, `openBlockers`, and embedded `verificationDelta`.",
        "Add `extensions.dev.vibe.plan-build-discipline` with `schematicPlan.applicable`, `schematicPlan.noneJustification`, `schematicPlan.gaps`, `verificationPlan.classifications`, and `selectedHarness.implications` so build can audit schematic and harness decisions.",
        "Evaluate every applicable built-in app schematic for backend, web, or mobile changes; record planned schematic slugs in `schematicPlan.applicable`, explain schematic gaps in `schematicPlan.gaps`, and use `schematicPlan.noneJustification` only when no built-in app schematic applies.",
        "Do not invent verification-runner or runner-catalog-entry schematics; register needed verification through `.vibe/registry/runner-catalog.json` runner entries instead.",
        "The embedded Verification Delta must include `requiredItems` for changed surfaces. Use layers from the canonical catalog: `safety_hooks`, `typecheck`, `lint_format`, `mechanical_gate`, `unit`, `integration`, `contract_adapter`, `e2e`, `ui_verification`, `ai_eval`, `build_package`, `context_drift`, `observability`, `advisory_review`, `final_dod`, `schema_validation`.",
        "For the generated starter default runner catalog, `typecheck`, `lint_format`, `unit`, and `build_package` can resolve through `.vibe/registry/runner-catalog.json`; mark other layers `not_applicable` with rationale or add runner catalog entries before requiring them, and use human-readable `not-applicable` or `manual-only` classifications in `verificationPlan.classifications` when a layer cannot run.",
        "When backend, web, or mobile boundaries are in scope, include a blocking `architecture-agent-review` Verification Delta item and require it to be registered in `.vibe/registry/runner-catalog.json`.",
        "Use `build-must-register` for any blocking Verification Delta item that does not already have a registered runner; the build skill must update runner registration before verification rather than silently skipping it.",
        "State no silent Pi fallback: selected-harness implications must identify the selected harness and block if the required runner is unavailable instead of falling back to Pi or prose-only review.",
      ];
    case "build":
      return [
        "Read exactly one approved Implementation Plan from `.vibe/work/<work-id>/implementation-plan.json`; block if `status` is not `approved`.",
        "Implement only paths allowed by the plan ownership/scope and preserve unrelated files.",
        "Before coding, read `extensions.dev.vibe.plan-build-discipline.schematicPlan.applicable`; every planned schematic slug/id must be implemented or explicitly blocked in the Build Result.",
        "Populate `schematicsUsed` in `.vibe/work/<work-id>/build-result.json`; an empty `schematicsUsed` array is a blocking defect when `schematicPlan.applicable` is non-empty, and every planned schematic slug/id is represented without unplanned substitutions.",
        "Register missing blocking runners by updating `.vibe/registry/runner-catalog.json` directly; do not invent verification-runner or runner-catalog-entry schematics, and do not add extra deterministic architecture/code-standard runners.",
        "Run verification for the plan, normally: `vibe-engineer verify --project-root . --implementation-plan .vibe/work/<work-id>/implementation-plan.json --evidence-root .vibe/evidence/<work-id>/verify --run-id <work-id> --runner-catalog .vibe/registry/runner-catalog.json`.",
        "Run every blocking Verification Delta item, including `architecture-agent-review` when present; skipped records, missing blocking evidence, skipped `architecture-agent-review`, or prose-only summaries must keep the build `failed` or `blocked`.",
        "Capture command output/evidence paths before summarizing results and link each blocking result through `verificationRuns[].evidencePacketRef` to an Evidence Packet.",
        'Write `.vibe/work/<work-id>/build-result.json` using `artifactKind: "build_result"`, `schemaVersion: "1.0.0"`, `implementationPlanRef`, `changedFilesSummary`, `schematicsUsed`, `verificationRuns` linked to Evidence Packets, `warningsAndBlockers`, `contextDocsUpdates`, and `finalStatusReason`.',
        'Use `status: "passed"` only when every blocking verification item has evidence; otherwise write `failed` or `blocked` with exact reasons.',
      ];
    case "ship":
      return [
        "Read exactly one Build Result from `.vibe/work/<work-id>/build-result.json`; block unless `status` is `passed`.",
        "Rerun or inspect final verification evidence before declaring readiness.",
        'Write `.vibe/work/<work-id>/ship-packet.json` using `artifactKind: "ship_packet"`, `schemaVersion: "1.0.0"`, `buildResultRef`, `finalVerification`, `contextPreservation`, `commitPreparation`, `prPreparation`, `releaseOrMigrationNotes`, `followUps`, and `noPushWithoutApproval: true`.',
        "Prepare suggested commit/PR text only; do not perform git push, release, deploy, or PR creation without explicit operator approval in the current turn.",
      ];
  }
};

const markdownSkill = (protocol: PiRuntimeSkillProtocol): string => `---
name: ${protocol.skillId}
description: ${protocol.summary} Use through /skill:${protocol.skillId} when the locked DL-03 ${protocol.skillId} protocol is needed.
vibe-protocol: ${protocol.protocolKind}
vibe-input-artifact: ${protocol.inputArtifact}
vibe-output-artifact: ${protocol.outputArtifact}
runtimeExecutionClaim: ${RUNTIME_EXECUTION_CLAIM}
---

# ${protocol.skillId}

This generated pi skill is a domain-neutral adapter asset for the vibe-engineer locked skill protocol. It gives concrete artifact carrier rules; it still does not claim live pi loading/execution.

## Artifact paths

Use one stable work id, for example \`special-change-001\`, and keep all skill outputs under:

\`\`\`txt
.vibe/work/<work-id>/
\`\`\`

The generated starter also provides verification evidence space under \`.vibe/evidence/<work-id>/\` and the default runner catalog at \`.vibe/registry/runner-catalog.json\`.

## Protocol chain

- Input artifact: ${protocol.inputArtifact}.
- Output artifact: ${protocol.outputArtifact}.
- The skill must persist its output as a UTF-8 JSON or Markdown artifact under the paths above; chat history alone is not a carrier.
- Runtime execution claim: ${RUNTIME_EXECUTION_CLAIM}; live pi loading/execution remains pending until a recorded real loader/executor witness exists.

## Required behavior

${requiredSkillBehavior(protocol.skillId)
  .map((line) => `- ${line}`)
  .join("\n")}

## Validation handoff

- JSON artifacts must use the canonical artifact schemas in \`packages/artifacts/schemas/*\` from vibe-engineer.
- If schema validation tooling is available, validate the persisted file before handing off.
- If validation cannot run, state that explicitly in the handoff and do not claim truth-green.

## Forbidden behavior

${protocol.forbiddenArtifacts.map((artifact) => `- Do not produce or execute ${artifact} from this skill.`).join("\n")}
- Do not embed secrets, credentials, project-specific assumptions not present in the input, destructive commands, or external mutations.
- Do not claim selected pi runtime truth-green without a recorded real loader/executor witness.
`;

const promptArgumentHint = (skillId: SkillId): string => {
  switch (skillId) {
    case "brainstorm":
    case "grill-me":
    case "task":
      return "<raw-request-or-raw-intent-path>";
    case "plan":
      return "<work-brief-path>";
    case "build":
      return "<approved-implementation-plan-path>";
    case "ship":
      return "<build-result-path>";
  }
};

const promptContract = (skillId: SkillId): PiRuntimePromptContract => ({
  templateName: `vibe-${skillId}`,
  description: `Invoke the generated ${skillId} skill protocol with a persisted artifact handoff requirement.`,
  argumentHint: promptArgumentHint(skillId),
  argumentContract: [promptArgumentLine(skillId)],
  skillId,
});

const promptArgumentLine = (skillId: SkillId): string => {
  switch (skillId) {
    case "brainstorm":
    case "grill-me":
    case "task":
      return "$1 may be a raw operator request or a durable raw-intent artifact path.";
    case "plan":
      return "$1 must be the durable work-brief artifact path; raw chat is not accepted for this skill.";
    case "build":
      return "$1 must be the durable approved-implementation-plan artifact path; raw chat is not accepted for this skill.";
    case "ship":
      return "$1 must be the durable build-result artifact path; raw chat is not accepted for this skill.";
  }
};

const promptDisciplineLines = (skillId: SkillId): readonly string[] => {
  switch (skillId) {
    case "plan":
      return [
        "Require applicable schematics: fill `extensions.dev.vibe.plan-build-discipline.schematicPlan.applicable`, `schematicPlan.noneJustification`, and `schematicPlan.gaps`; do not leave schematic gaps implicit.",
        "Classify verification in `verificationPlan.classifications`, include selected-harness implications, and add a blocking `architecture-agent-review` item for backend, web, or mobile scope.",
        "Use `build-must-register` for blocking Verification Delta items that need runner registration in `.vibe/registry/runner-catalog.json`.",
        "Do not invent verification-runner or runner-catalog-entry schematics; register runners directly and do not add extra deterministic architecture/code-standard runners.",
      ];
    case "build":
      return [
        "Read the plan discipline extension before implementation; planned schematics are unused until represented in `schematicsUsed` in the Build Result.",
        "Register missing blocking runners directly in `.vibe/registry/runner-catalog.json`; Do not invent verification-runner or runner-catalog-entry schematics and do not add extra deterministic architecture/code-standard runners.",
        "Run every blocking Verification Delta item, including `architecture-agent-review`; missing blocking evidence, skipped records, or failed runner output must keep status `failed` or `blocked`.",
        "Link each blocking verification result through `verificationRuns[].evidencePacketRef` to an Evidence Packet; prose-only summaries are not evidence.",
      ];
    default:
      return [];
  }
};

const promptDisciplineSection = (skillId: SkillId): string => {
  const lines = promptDisciplineLines(skillId);
  if (lines.length === 0) {
    return "";
  }
  return `\nDiscipline requirements:\n${lines.map((line) => `- ${line}`).join("\n")}\n`;
};

const markdownPrompt = (contract: PiRuntimePromptContract): string => `---
description: ${contract.description}
argument-hint: "${contract.argumentHint}"
vibe-template-kind: skill-workflow
vibe-skill: ${contract.skillId}
runtimeExecutionClaim: ${RUNTIME_EXECUTION_CLAIM}
---

Load and follow /skill:${contract.skillId}.

Argument contract:

- ${promptArgumentLine(contract.skillId)}
- ${"$@"} may contain additional constraints; it must not contain secrets or production credentials.
- Persist outputs under \`.vibe/work/<work-id>/\` and report the exact path written.
${promptDisciplineSection(contract.skillId)}
Input reference: $1
Additional constraints: ${"$@"}

Do not proceed if a required artifact carrier is missing, malformed, outside the current project, or inconsistent with the ${contract.skillId} protocol.
`;

const extensionPolicy = (): PiRuntimeExtensionPolicy => ({
  defaultDeny: true,
  requiresCredentialsByDefault: false,
  permitsDestructiveOperationsByDefault: false,
  permitsExternalMutationByDefault: false,
  claimsSandboxing: "not_provided",
  runtimeExecutionClaim: RUNTIME_EXECUTION_CLAIM,
  trustBoundary:
    "Project-local TypeScript extension executes only after pi project trust; this fixture registers no tools, performs no I/O, and claims no sandbox isolation.",
});

const extensionContent = (): string => `export const I14B_PI_RUNTIME_EXTENSION_POLICY = {
  defaultDeny: true,
  requiresCredentialsByDefault: false,
  permitsDestructiveOperationsByDefault: false,
  permitsExternalMutationByDefault: false,
  claimsSandboxing: "not_provided",
  runtimeExecutionClaim: "${RUNTIME_EXECUTION_CLAIM}",
  trustBoundary:
    "Project-local TypeScript extension executes only after pi project trust; no sandbox isolation is claimed.",
} as const;

export default function i14bPiRuntimePolicyExtension(): void {
  // Default-deny fixture: registers no tools, executes no commands, needs no credentials,
  // performs no network or filesystem mutation, and makes no live runtime proof claim.
}
`;

const packageManifestContent = (): string => `${JSON.stringify(
  {
    name: "vibe-engineer-pi-runtime-fixture",
    private: true,
    version: "0.0.0",
    license: "MIT",
    description:
      "Fixture-local pi resource manifest generated by I-14B; no package install or live runtime claim is implied.",
    keywords: ["pi-package"],
    pi: {
      skills: ["./.pi/skills"],
      prompts: ["./.pi/prompts"],
      extensions: ["./.pi/extensions/i14b-runtime-policy.ts"],
    },
  },
  null,
  2,
)}
`;

const contextContent = (
  fileName: "AGENTS.md" | "CLAUDE.md",
): string => `# ${fileName === "AGENTS.md" ? "Agent" : "Cross-harness"} instructions for the vibe-engineer pi runtime fixture

- Use the generated pi skills for the locked domain-neutral harness workflow only.
- Preserve the artifact chain: Work Brief -> Implementation Plan with Verification Delta -> Build Result -> Ship Packet.
- Treat live pi runtime loading as ${RUNTIME_EXECUTION_CLAIM}/BLOCKED until a real pi loader or executor witness records otherwise.
- Do not embed secrets, credentials, production endpoints, project-specific business assumptions, destructive commands, pushes, releases, deploys, or pull-request creation without explicit approval.
`;

const harnessConfigContent = (): string => `${JSON.stringify(
  {
    schemaVersion: "vibe-engineer-pi-runtime-fixture-config/v1",
    agenticHarness: "pi",
    adapterCapabilityVersion: "pi-adapter-capability-matrix/v1",
    generatedFileManifestVersion: "pi-generated-file-manifest/v1",
    runtimeExecutionClaim: RUNTIME_EXECUTION_CLAIM,
    downstreamLiveRuntimeBlock: "pending-live/BLOCKED",
  },
  null,
  2,
)}
`;

const skillAssets = (family: GeneratedFileFamily): readonly PiRuntimeAsset[] => {
  const selectedPathPattern =
    family.pathPatterns.find((pattern) => pattern === ".pi/skills/<skill>/SKILL.md") ??
    family.pathPatterns[0];
  const pathPattern =
    selectedPathPattern === undefined
      ? fail(
          "i14a.generatedFileManifest.families.pi-skill-files.pathPatterns",
          "missing_required_path_pattern",
          "No pi skill path pattern is available.",
        )
      : selectedPathPattern;
  return SKILL_IDS.map((skillId) => {
    const protocol = skillProtocol(skillId);
    return {
      kind: "skill",
      familyId: family.familyId,
      path: pathPattern.replace("<skill>", skillId),
      content: markdownSkill(protocol),
      metadata: {
        ...baseMetadata(),
        skillProtocol: protocol,
      },
    } satisfies PiRuntimeAsset;
  });
};

const promptAssets = (family: GeneratedFileFamily): readonly PiRuntimeAsset[] => {
  const selectedPathPattern =
    family.pathPatterns.find((pattern) => pattern === ".pi/prompts/<name>.md") ??
    family.pathPatterns[0];
  const pathPattern =
    selectedPathPattern === undefined
      ? fail(
          "i14a.generatedFileManifest.families.pi-prompt-templates.pathPatterns",
          "missing_required_path_pattern",
          "No pi prompt template path pattern is available.",
        )
      : selectedPathPattern;
  return SKILL_IDS.map((skillId) => {
    const contract = promptContract(skillId);
    return {
      kind: "prompt-template",
      familyId: family.familyId,
      path: pathPattern.replace("<name>", contract.templateName),
      content: markdownPrompt(contract),
      metadata: {
        ...baseMetadata(),
        promptContract: contract,
      },
    } satisfies PiRuntimeAsset;
  });
};

const extensionAssets = (family: GeneratedFileFamily): readonly PiRuntimeAsset[] => [
  {
    kind: "extension",
    familyId: family.familyId,
    path: ".pi/extensions/i14b-runtime-policy.ts",
    content: extensionContent(),
    metadata: {
      ...baseMetadata(),
      extensionPolicy: extensionPolicy(),
    },
  },
];

const packageManifestAsset = (family: GeneratedFileFamily): PiRuntimeAsset => ({
  kind: "package-manifest",
  familyId: family.familyId,
  path: "package.json",
  content: packageManifestContent(),
  metadata: baseMetadata(),
});

const contextAssets = (family: GeneratedFileFamily): readonly PiRuntimeAsset[] =>
  (["AGENTS.md", "CLAUDE.md"] as const).map(
    (fileName) =>
      ({
        kind: "context",
        familyId: family.familyId,
        path: fileName,
        content: contextContent(fileName),
        metadata: {
          ...baseMetadata(),
          contextPolicy: {
            domainNeutral: true,
            secretsAllowed: false,
            businessDomainAssumptionsAllowed: false,
            liveRuntimeTruthGreenClaimAllowed: false,
          },
        },
      }) satisfies PiRuntimeAsset,
  );

const harnessConfigAsset = (family: GeneratedFileFamily): PiRuntimeAsset => ({
  kind: "harness-config",
  familyId: family.familyId,
  path: ".vibe/harness/pi-runtime.json",
  content: harnessConfigContent(),
  metadata: baseMetadata(),
});

export const generatePiRuntimeFixture = (): PiRuntimeFixture => {
  const capabilityMatrix = getPiAdapterCapabilityMatrix();
  const generatedFileManifest = getPiGeneratedFileManifest();
  const capabilityValidation = validateCapabilityMatrix(capabilityMatrix);
  if (!capabilityValidation.valid) {
    throw new PiRuntimeContractError(
      "I-14A capability matrix is not valid.",
      capabilityValidation.issues.map((capabilityIssue) => ({
        ...capabilityIssue,
        severity: "error" as const,
      })),
    );
  }
  const manifestValidation = validateGeneratedFileManifest(generatedFileManifest);
  if (!manifestValidation.valid) {
    throw new PiRuntimeContractError(
      "I-14A generated-file manifest is not valid.",
      manifestValidation.issues.map((manifestIssue) => ({
        ...manifestIssue,
        severity: "error" as const,
      })),
    );
  }

  const assets: PiRuntimeAsset[] = [];
  assets.push(...skillAssets(familyById(generatedFileManifest, "pi-skill-files")));
  assets.push(...promptAssets(familyById(generatedFileManifest, "pi-prompt-templates")));
  assets.push(...extensionAssets(familyById(generatedFileManifest, "pi-extensions")));
  assets.push(packageManifestAsset(familyById(generatedFileManifest, "pi-package-manifest")));
  assets.push(...contextAssets(familyById(generatedFileManifest, "context-files")));
  assets.push(harnessConfigAsset(familyById(generatedFileManifest, "harness-config")));

  const fixture: PiRuntimeFixture = {
    schemaVersion: "pi-runtime-fixture/v1",
    mode: "runtime-fixture",
    adapterId: "pi",
    adapterCapabilityVersion: "pi-adapter-capability-matrix/v1",
    generatedFileManifestVersion: "pi-generated-file-manifest/v1",
    runtimeExecutionClaim: RUNTIME_EXECUTION_CLAIM,
    downstreamLiveRuntimeBlock: "pending-live/BLOCKED",
    assets,
  };

  const validation = validatePiRuntimeFixtureAgainstI14A(
    fixture,
    capabilityMatrix,
    generatedFileManifest,
  );
  if (!validation.valid) {
    throw new PiRuntimeContractError(
      "Generated pi runtime fixture failed I-14B validation.",
      validation.issues,
    );
  }
  return assertPiRuntimeFixtureValid(fixture);
};

export const serializePiRuntimeFixtureManifest = (
  fixture: PiRuntimeFixture,
): string => `${JSON.stringify(
  {
    schemaVersion: fixture.schemaVersion,
    mode: fixture.mode,
    adapterId: fixture.adapterId,
    adapterCapabilityVersion: fixture.adapterCapabilityVersion,
    generatedFileManifestVersion: fixture.generatedFileManifestVersion,
    runtimeExecutionClaim: fixture.runtimeExecutionClaim,
    downstreamLiveRuntimeBlock: fixture.downstreamLiveRuntimeBlock,
    assets: fixture.assets.map((asset) => ({
      kind: asset.kind,
      familyId: asset.familyId,
      path: asset.path,
      metadata: asset.metadata,
    })),
  },
  null,
  2,
)}
`;

export const generatePiRuntimeFixtureAssetsWithManifest = (): readonly PiRuntimeAsset[] => {
  const fixture = generatePiRuntimeFixture();
  return [
    ...fixture.assets,
    {
      kind: "harness-config",
      familyId: "harness-config",
      path: ".vibe/harness/pi-runtime-assets.json",
      content: serializePiRuntimeFixtureManifest(fixture),
      metadata: baseMetadata(),
    },
  ];
};
