import {
  GENERATED_FILE_FAMILY_IDS,
  I14A_OUT_OF_SCOPE_RUNTIME_EXECUTION_CLAIMS,
  I14A_RUNTIME_EXECUTION_CLAIMS,
  SKILL_IDS,
  validateCapabilityMatrix,
  validateGeneratedFileManifest,
  type AdapterCapabilityMatrix,
  type GeneratedFileFamilyId,
  type GeneratedFileManifest,
  type I14ARuntimeExecutionClaim,
  type SkillId,
} from "../schema/index.ts";
import {
  PiRuntimeContractError,
  type PiRuntimeAsset,
  type PiRuntimeAssetKind,
  type PiRuntimeExtensionPolicy,
  type PiRuntimeFixture,
  type PiRuntimeSkillProtocol,
  type PiRuntimeValidationIssue,
  type PiRuntimeValidationResult,
} from "./types.ts";

const SKILL_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u;
const PROMPT_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u;
const SECRET_MARKERS = ["BEGIN PRIVATE KEY", "AKIA", "xoxb-", "ghp_", "sk-", "password=", "api_key=", "apiKey:"] as const;
const BUSINESS_DOMAIN_MARKERS = ["ecommerce", "fashion", "inventory", "tenant", "checkout", "telegram", "instagram", "billz"] as const;
const LIVE_RUNTIME_GREEN_MARKERS = ["truth-green", "live-proven", "runtime-proven", "runtime proven", "loaded by pi", "executed by pi"] as const;

const issue = (issues: PiRuntimeValidationIssue[], path: string, code: string, message: string): void => {
  issues.push({ path, code, message, severity: "error" });
};

const isRecord = (value: unknown): value is { readonly [key: string]: unknown } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const unique = <T extends string>(values: readonly T[]): readonly T[] => [...new Set(values)];

const isKnownSkillId = (value: string): value is SkillId => SKILL_IDS.includes(value as SkillId);
const isKnownFamilyId = (value: string): value is GeneratedFileFamilyId => GENERATED_FILE_FAMILY_IDS.includes(value as GeneratedFileFamilyId);

const validateRuntimeClaim = (value: unknown, path: string, issues: PiRuntimeValidationIssue[]): value is I14ARuntimeExecutionClaim => {
  if (typeof value === "string" && I14A_OUT_OF_SCOPE_RUNTIME_EXECUTION_CLAIMS.includes(value as (typeof I14A_OUT_OF_SCOPE_RUNTIME_EXECUTION_CLAIMS)[number])) {
    issue(issues, path, "runtime_execution_claim_requires_live_evidence", "Live/proven/loaded/executed runtime claims require actual live pi loader/executor evidence and are not accepted by the static runtime asset validator.");
    return false;
  }
  if (typeof value !== "string" || !I14A_RUNTIME_EXECUTION_CLAIMS.includes(value as I14ARuntimeExecutionClaim)) {
    issue(issues, path, "unsupported_runtime_execution_claim", "Runtime execution claim must use the typed I-14A non-live claim set.");
    return false;
  }
  return true;
};

const validateRelativePath = (path: string, issuePath: string, issues: PiRuntimeValidationIssue[]): void => {
  if (path.length === 0) {
    issue(issues, issuePath, "empty_path", "Generated asset path must be non-empty.");
  }
  if (path.startsWith("/") || path.startsWith("~") || path.includes(":\\")) {
    issue(issues, issuePath, "absolute_path", "Generated asset path must be relative to the fixture root.");
  }
  if (path.split("/").some((segment) => segment === ".." || segment === "")) {
    issue(issues, issuePath, "path_traversal", "Generated asset path must not contain traversal, empty segments, or symlink-style escape syntax.");
  }
};

const parseFrontmatter = (content: string, path: string, issues: PiRuntimeValidationIssue[]): ReadonlyMap<string, string> => {
  if (!content.startsWith("---\n")) {
    issue(issues, path, "missing_frontmatter", "Markdown asset must start with frontmatter.");
    return new Map<string, string>();
  }
  const end = content.indexOf("\n---\n", 4);
  if (end < 0) {
    issue(issues, path, "unterminated_frontmatter", "Markdown frontmatter must be terminated.");
    return new Map<string, string>();
  }
  const entries = new Map<string, string>();
  const lines = content.slice(4, end).split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const separator = line.indexOf(":");
    if (separator <= 0) {
      issue(issues, `${path}.frontmatter[${index}]`, "invalid_frontmatter_field", "Frontmatter fields must use `key: value` syntax.");
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^"|"$/gu, "");
    if (entries.has(key)) {
      issue(issues, `${path}.frontmatter.${key}`, "duplicate_frontmatter_field", "Duplicate frontmatter fields are rejected.");
    }
    entries.set(key, value);
  }
  return entries;
};

const pathSkillId = (path: string): string | undefined => {
  const piPrefix = ".pi/skills/";
  const agentsPrefix = ".agents/skills/";
  if (path.startsWith(piPrefix) && path.endsWith("/SKILL.md")) {
    return path.slice(piPrefix.length, -"/SKILL.md".length);
  }
  if (path.startsWith(agentsPrefix) && path.endsWith("/SKILL.md")) {
    return path.slice(agentsPrefix.length, -"/SKILL.md".length);
  }
  return undefined;
};

const promptNameFromPath = (path: string): string | undefined => {
  const prefix = ".pi/prompts/";
  if (!path.startsWith(prefix) || !path.endsWith(".md")) {
    return undefined;
  }
  const name = path.slice(prefix.length, -".md".length);
  if (name.includes("/")) {
    return undefined;
  }
  return name;
};

const isAllowedExtensionPath = (path: string): boolean => {
  if (!path.startsWith(".pi/extensions/")) {
    return false;
  }
  const suffix = path.slice(".pi/extensions/".length);
  return (suffix.endsWith(".ts") && !suffix.includes("/")) || (suffix.endsWith("/index.ts") && suffix.split("/").length === 2);
};

const hasAnyMarker = (content: string, markers: readonly string[]): boolean => {
  const lower = content.toLowerCase();
  return markers.some((marker) => lower.includes(marker.toLowerCase()));
};

const validateSkillProtocol = (asset: PiRuntimeAsset, index: number, issues: PiRuntimeValidationIssue[]): void => {
  const skillIdFromPath = pathSkillId(asset.path);
  if (skillIdFromPath === undefined) {
    issue(issues, `$.assets[${index}].path`, "mismatched_skill_resource_path", "Skill assets must be at `.pi/skills/<skill>/SKILL.md` or `.agents/skills/<skill>/SKILL.md`.");
    return;
  }
  if (!isKnownSkillId(skillIdFromPath)) {
    issue(issues, `$.assets[${index}].path`, "unknown_skill_id", "Skill resource path contains an unknown skill id.");
    return;
  }
  const protocol = asset.metadata.skillProtocol;
  if (protocol === undefined) {
    issue(issues, `$.assets[${index}].metadata.skillProtocol`, "missing_skill_protocol", "Skill assets require typed DL-03 protocol metadata.");
    return;
  }
  if (protocol.skillId !== skillIdFromPath) {
    issue(issues, `$.assets[${index}].metadata.skillProtocol.skillId`, "mismatched_skill_command_resource_path", "Skill metadata, command name, and resource path must identify the same skill.");
  }
  const frontmatter = parseFrontmatter(asset.content, `$.assets[${index}].content`, issues);
  const name = frontmatter.get("name");
  const description = frontmatter.get("description");
  if (name === undefined || name.length === 0) {
    issue(issues, `$.assets[${index}].frontmatter.name`, "missing_skill_name", "Skill frontmatter must include name.");
  } else if (!SKILL_NAME_PATTERN.test(name)) {
    issue(issues, `$.assets[${index}].frontmatter.name`, "invalid_skill_name", "Skill name must follow pi Agent Skills name rules.");
  } else if (name !== protocol.skillId) {
    issue(issues, `$.assets[${index}].frontmatter.name`, "mismatched_skill_name", "Skill name must match the typed skill id.");
  }
  if (description === undefined || description.length === 0) {
    issue(issues, `$.assets[${index}].frontmatter.description`, "missing_skill_description", "Skill frontmatter must include description because pi will not load skills missing it.");
  }
  if (frontmatter.get("vibe-protocol") !== protocol.protocolKind) {
    issue(issues, `$.assets[${index}].frontmatter.vibe-protocol`, "dl03_protocol_contradiction", "Skill frontmatter protocol kind must match the locked DL-03 chain.");
  }
  if (frontmatter.get("vibe-output-artifact") !== protocol.outputArtifact) {
    issue(issues, `$.assets[${index}].frontmatter.vibe-output-artifact`, "dl03_output_contradiction", "Skill output artifact must match the locked DL-03 chain.");
  }
};

const validatePromptTemplate = (asset: PiRuntimeAsset, index: number, issues: PiRuntimeValidationIssue[]): void => {
  const templateName = promptNameFromPath(asset.path);
  if (templateName === undefined) {
    issue(issues, `$.assets[${index}].path`, "prompt_template_not_discoverable", "Prompt templates must be direct `.pi/prompts/*.md` files unless explicitly configured; generated fixtures do not use nested prompt settings.");
    return;
  }
  if (!PROMPT_NAME_PATTERN.test(templateName)) {
    issue(issues, `$.assets[${index}].path`, "invalid_prompt_template_name", "Prompt template filename must be a stable lowercase slash-command name.");
  }
  const contract = asset.metadata.promptContract;
  if (contract === undefined) {
    issue(issues, `$.assets[${index}].metadata.promptContract`, "missing_prompt_argument_contract", "Generated prompt templates require typed description and argument contract metadata.");
    return;
  }
  if (contract.templateName !== templateName) {
    issue(issues, `$.assets[${index}].metadata.promptContract.templateName`, "mismatched_prompt_template_name", "Prompt metadata must match filename-derived command name.");
  }
  const frontmatter = parseFrontmatter(asset.content, `$.assets[${index}].content`, issues);
  if ((frontmatter.get("description") ?? "").length === 0) {
    issue(issues, `$.assets[${index}].frontmatter.description`, "missing_prompt_description", "Prompt template description is required by the generated template contract.");
  }
  if ((frontmatter.get("argument-hint") ?? "").length === 0 || contract.argumentContract.length === 0) {
    issue(issues, `$.assets[${index}].frontmatter.argument-hint`, "missing_prompt_argument_contract", "Prompt template argument contract is required.");
  }
};

const validateExtensionPolicy = (policy: PiRuntimeExtensionPolicy | undefined, path: string, issues: PiRuntimeValidationIssue[]): void => {
  if (policy === undefined) {
    issue(issues, path, "missing_extension_policy", "Extension assets require typed DL-22 policy metadata.");
    return;
  }
  if (policy.defaultDeny !== true) {
    issue(issues, `${path}.defaultDeny`, "extension_weakens_default_deny", "Generated extensions must be default-deny.");
  }
  if (policy.requiresCredentialsByDefault !== false) {
    issue(issues, `${path}.requiresCredentialsByDefault`, "extension_requires_credentials_by_default", "Generated extensions must not require credentials by default.");
  }
  if (policy.permitsDestructiveOperationsByDefault !== false) {
    issue(issues, `${path}.permitsDestructiveOperationsByDefault`, "extension_allows_destructive_by_default", "Generated extensions must not permit destructive operations by default.");
  }
  if (policy.permitsExternalMutationByDefault !== false) {
    issue(issues, `${path}.permitsExternalMutationByDefault`, "extension_allows_external_mutation_by_default", "Generated extensions must not mutate external systems by default.");
  }
  if (policy.claimsSandboxing === "not_provided") {
    return;
  }
  issue(issues, `${path}.claimsSandboxing`, "extension_claims_unsupported_sandboxing", "Generated extensions must not claim unsupported sandboxing.");
};

const validatePackageManifest = (asset: PiRuntimeAsset, index: number, allPaths: ReadonlySet<string>, issues: PiRuntimeValidationIssue[]): void => {
  if (asset.path !== "package.json") {
    issue(issues, `$.assets[${index}].path`, "invalid_package_manifest_path", "Fixture-local pi package manifest must be `package.json` under the fixture root.");
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(asset.content) as unknown;
  } catch {
    issue(issues, `$.assets[${index}].content`, "invalid_package_manifest_json", "Package manifest content must be valid JSON.");
    return;
  }
  if (!isRecord(parsed) || !isRecord(parsed["pi"])) {
    issue(issues, `$.assets[${index}].content.pi`, "missing_pi_package_resources", "Package manifest must declare pi resources.");
    return;
  }
  const piResources = parsed["pi"];
  const resourceKeys = ["skills", "prompts", "extensions"] as const;
  for (const key of resourceKeys) {
    const resources = piResources[key];
    if (!Array.isArray(resources) || resources.length === 0) {
      issue(issues, `$.assets[${index}].content.pi.${key}`, "missing_pi_package_resources", "Package manifest pi resource declarations must be non-empty.");
      continue;
    }
    for (let resourceIndex = 0; resourceIndex < resources.length; resourceIndex += 1) {
      const resource = resources[resourceIndex];
      if (typeof resource !== "string") {
        issue(issues, `$.assets[${index}].content.pi.${key}[${resourceIndex}]`, "invalid_pi_resource_path", "Pi resource declarations must be relative strings.");
        continue;
      }
      const normalized = resource.startsWith("./") ? resource.slice(2) : resource;
      validateRelativePath(normalized, `$.assets[${index}].content.pi.${key}[${resourceIndex}]`, issues);
      const prefixMatch = [...allPaths].some((candidate) => candidate === normalized || candidate.startsWith(`${normalized}/`));
      if (!prefixMatch) {
        issue(issues, `$.assets[${index}].content.pi.${key}[${resourceIndex}]`, "pi_resource_path_missing_asset", "Pi package resource path must point inside the generated fixture asset set.");
      }
    }
  }
};

const validateContextAsset = (asset: PiRuntimeAsset, index: number, issues: PiRuntimeValidationIssue[]): void => {
  if (asset.path !== "AGENTS.md" && asset.path !== "CLAUDE.md") {
    issue(issues, `$.assets[${index}].path`, "invalid_context_asset_path", "Context assets are limited to AGENTS.md and CLAUDE.md in the runtime fixture root.");
  }
  const policy = asset.metadata.contextPolicy;
  if (policy === undefined || policy.domainNeutral !== true || policy.secretsAllowed !== false || policy.businessDomainAssumptionsAllowed !== false || policy.liveRuntimeTruthGreenClaimAllowed !== false) {
    issue(issues, `$.assets[${index}].metadata.contextPolicy`, "invalid_context_policy", "Context assets require domain-neutral no-secret/no-live-proof policy metadata.");
  }
  if (hasAnyMarker(asset.content, SECRET_MARKERS)) {
    issue(issues, `$.assets[${index}].content`, "context_embeds_secret_or_credential", "Context asset contains a credential-like marker.");
  }
  if (hasAnyMarker(asset.content, BUSINESS_DOMAIN_MARKERS)) {
    issue(issues, `$.assets[${index}].content`, "context_embeds_business_domain_assumption", "Context asset contains a project/business-domain assumption.");
  }
  if (hasAnyMarker(asset.content, LIVE_RUNTIME_GREEN_MARKERS)) {
    issue(issues, `$.assets[${index}].content`, "context_claims_live_runtime_truth_green", "Context asset must not claim live pi runtime truth-green.");
  }
};

const validateHarnessConfig = (asset: PiRuntimeAsset, index: number, issues: PiRuntimeValidationIssue[]): void => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(asset.content) as unknown;
  } catch {
    issue(issues, `$.assets[${index}].content`, "invalid_harness_config_json", "Harness config fixture must be JSON.");
    return;
  }
  if (!isRecord(parsed)) {
    issue(issues, `$.assets[${index}].content`, "invalid_harness_config_json", "Harness config fixture must be a JSON object.");
    return;
  }
  if (parsed["agenticHarness"] !== "pi") {
    issue(issues, `$.assets[${index}].content.agenticHarness`, "unsupported_non_pi_adapter_selection", "Runtime fixture config may only select the pi adapter.");
  }
  if (parsed["adapterCapabilityVersion"] !== "pi-adapter-capability-matrix/v1") {
    issue(issues, `$.assets[${index}].content.adapterCapabilityVersion`, "missing_adapter_capability_version", "Harness config must record the adapter capability version.");
  }
  if (parsed["generatedFileManifestVersion"] !== "pi-generated-file-manifest/v1") {
    issue(issues, `$.assets[${index}].content.generatedFileManifestVersion`, "missing_generated_file_manifest_version", "Harness config must record the generated-file manifest version.");
  }
  validateRuntimeClaim(parsed["runtimeExecutionClaim"], `$.assets[${index}].content.runtimeExecutionClaim`, issues);
};

const validateAsset = (asset: PiRuntimeAsset, index: number, allPaths: ReadonlySet<string>, issues: PiRuntimeValidationIssue[]): void => {
  validateRelativePath(asset.path, `$.assets[${index}].path`, issues);
  if (!isKnownFamilyId(asset.familyId)) {
    issue(issues, `$.assets[${index}].familyId`, "unknown_generated_file_family", "Generated runtime asset uses an unknown generated-file family.");
  }
  validateRuntimeClaim(asset.metadata.runtimeExecutionClaim, `$.assets[${index}].metadata.runtimeExecutionClaim`, issues);
  if (asset.metadata.generatedBy !== "I-14B-pi-adapter-runtime-skill-consumption") {
    issue(issues, `$.assets[${index}].metadata.generatedBy`, "unsupported_generated_by_lane", "Runtime assets must be generated by the I-14B lane.");
  }
  const familyKind: Record<GeneratedFileFamilyId, readonly PiRuntimeAssetKind[]> = {
    "pi-skill-files": ["skill"],
    "pi-prompt-templates": ["prompt-template"],
    "pi-extensions": ["extension"],
    "pi-package-manifest": ["package-manifest"],
    "context-files": ["context"],
    "harness-config": ["harness-config"],
  };
  if (isKnownFamilyId(asset.familyId) && !familyKind[asset.familyId].includes(asset.kind)) {
    issue(issues, `$.assets[${index}].kind`, "mismatched_asset_family_kind", "Runtime asset kind must match its generated-file family.");
  }
  if (asset.kind === "skill") {
    validateSkillProtocol(asset, index, issues);
  }
  if (asset.kind === "prompt-template") {
    validatePromptTemplate(asset, index, issues);
  }
  if (asset.kind === "extension") {
    if (!isAllowedExtensionPath(asset.path)) {
      issue(issues, `$.assets[${index}].path`, "extension_path_not_discoverable", "Extension assets must be `.pi/extensions/<name>.ts` or `.pi/extensions/<name>/index.ts`.");
    }
    validateExtensionPolicy(asset.metadata.extensionPolicy, `$.assets[${index}].metadata.extensionPolicy`, issues);
    if (hasAnyMarker(asset.content, ["rm -rf", "git push", "createPullRequest", "process.env.API_KEY", "sandboxed: true", "sandbox: proven"])) {
      issue(issues, `$.assets[${index}].content`, "extension_weakens_dl22_policy", "Extension content contains destructive, credential, external mutation, or unsupported sandbox markers.");
    }
  }
  if (asset.kind === "package-manifest") {
    validatePackageManifest(asset, index, allPaths, issues);
  }
  if (asset.kind === "context") {
    validateContextAsset(asset, index, issues);
  }
  if (asset.kind === "harness-config") {
    validateHarnessConfig(asset, index, issues);
  }
};

export const validatePiRuntimeFixture = (fixture: PiRuntimeFixture): PiRuntimeValidationResult<PiRuntimeFixture> => {
  const issues: PiRuntimeValidationIssue[] = [];
  if (fixture.schemaVersion !== "pi-runtime-fixture/v1") {
    issue(issues, "$.schemaVersion", "unsupported_runtime_fixture_schema", "Runtime fixture schema version must be pi-runtime-fixture/v1.");
  }
  if (fixture.adapterId !== "pi") {
    issue(issues, "$.adapterId", "unsupported_non_pi_adapter_selection", "I-14B runtime generation supports only the pi adapter.");
  }
  if (fixture.adapterCapabilityVersion !== "pi-adapter-capability-matrix/v1") {
    issue(issues, "$.adapterCapabilityVersion", "missing_adapter_capability_version", "Runtime fixture must record adapter capability version.");
  }
  if (fixture.generatedFileManifestVersion !== "pi-generated-file-manifest/v1") {
    issue(issues, "$.generatedFileManifestVersion", "missing_generated_file_manifest_version", "Runtime fixture must record generated-file manifest version.");
  }
  validateRuntimeClaim(fixture.runtimeExecutionClaim, "$.runtimeExecutionClaim", issues);
  const allPaths = new Set(fixture.assets.map((asset) => asset.path));
  if (allPaths.size !== fixture.assets.length) {
    issue(issues, "$.assets", "duplicate_asset_path", "Runtime fixture contains duplicate asset paths.");
  }
  for (let index = 0; index < fixture.assets.length; index += 1) {
    const asset = fixture.assets[index];
    if (asset === undefined) {
      issue(issues, `$.assets[${index}]`, "missing_asset", "Runtime fixture asset is missing.");
      continue;
    }
    validateAsset(asset, index, allPaths, issues);
  }

  const skillAssetIds = fixture.assets
    .filter((asset) => asset.kind === "skill")
    .map((asset) => asset.metadata.skillProtocol?.skillId)
    .filter((skillId): skillId is SkillId => skillId !== undefined);
  for (const expectedSkill of SKILL_IDS) {
    if (!skillAssetIds.includes(expectedSkill)) {
      issue(issues, "$.assets", "missing_required_skill", `Missing required skill asset '${expectedSkill}'.`);
    }
  }
  for (const duplicate of unique(skillAssetIds).filter((skillId) => skillAssetIds.filter((candidate) => candidate === skillId).length > 1)) {
    issue(issues, "$.assets", "duplicate_skill_id", `Duplicate generated skill id '${duplicate}'.`);
  }
  const families = unique(fixture.assets.map((asset) => asset.familyId));
  for (const familyId of GENERATED_FILE_FAMILY_IDS) {
    if (!families.includes(familyId)) {
      issue(issues, "$.assets", "missing_generated_file_family", `Runtime fixture does not include family '${familyId}'.`);
    }
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }
  return { valid: true, value: fixture, issues: [] };
};

export const validatePiRuntimeFixtureAgainstI14A = (
  fixture: PiRuntimeFixture,
  capabilityMatrix: AdapterCapabilityMatrix,
  generatedFileManifest: GeneratedFileManifest,
): PiRuntimeValidationResult<PiRuntimeFixture> => {
  const issues: PiRuntimeValidationIssue[] = [];
  const capabilityValidation = validateCapabilityMatrix(capabilityMatrix);
  if (!capabilityValidation.valid) {
    for (const capabilityIssue of capabilityValidation.issues) {
      issue(issues, `i14a.capabilityMatrix${capabilityIssue.path.slice(1)}`, capabilityIssue.code, capabilityIssue.message);
    }
  }
  const manifestValidation = validateGeneratedFileManifest(generatedFileManifest);
  if (!manifestValidation.valid) {
    for (const manifestIssue of manifestValidation.issues) {
      issue(issues, `i14a.generatedFileManifest${manifestIssue.path.slice(1)}`, manifestIssue.code, manifestIssue.message);
    }
  }
  const piAdapter = capabilityMatrix.adapters.find((adapter) => adapter.adapterId === "pi");
  if (piAdapter === undefined || piAdapter.selection.manifestSelectable !== true) {
    issue(issues, "i14a.capabilityMatrix.adapters", "pi_manifest_not_selectable", "I-14B requires I-14A pi manifest-selectable typed API.");
  }
  for (const adapter of capabilityMatrix.adapters) {
    if (adapter.adapterId !== "pi" && (adapter.selection.manifestSelectable || adapter.selection.createImportSelectable || adapter.selection.readiness === "ready")) {
      issue(issues, `i14a.capabilityMatrix.adapters.${adapter.adapterId}`, "unsupported_non_pi_adapter_selection", "Non-pi adapters must remain non-selectable/deferred/blocked.");
    }
  }
  const fixtureValidation = validatePiRuntimeFixture(fixture);
  if (!fixtureValidation.valid) {
    issues.push(...fixtureValidation.issues);
  }
  if (issues.length > 0) {
    return { valid: false, issues };
  }
  return { valid: true, value: fixture, issues: [] };
};

export const assertPiRuntimeFixtureValid = (fixture: PiRuntimeFixture): PiRuntimeFixture => {
  const validation = validatePiRuntimeFixture(fixture);
  if (!validation.valid) {
    throw new PiRuntimeContractError("Pi runtime fixture validation failed", validation.issues);
  }
  return validation.value;
};
