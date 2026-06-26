#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();
const evidenceDir = resolve(root, ".vibe/work/I-14A-pi-adapter-capability-generated-file-manifest/post-fix-revalidation-evidence");
const resultPath = join(evidenceDir, "i14a-post-fix-real-boundary-result.json");
const summaryPath = join(evidenceDir, "i14a-post-fix-downstream-summary.json");
const packageJsonPath = resolve(root, "packages/adapters/pi/package.json");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const issueCodes = (result) => result.valid ? [] : [...new Set(result.issues.map((issue) => issue.code))].sort();
const includesAll = (actual, expected) => expected.every((code) => actual.includes(code));
const record = (name, pass, extra = {}) => ({ name, pass, ...extra });

const packageJson = await readJson(packageJsonPath);
const resolveExport = (subpath) => {
  const exportEntry = packageJson.exports?.[subpath];
  const target = typeof exportEntry === "string" ? exportEntry : exportEntry?.import;
  if (typeof target !== "string") {
    throw new Error(`Missing import target for ${subpath}`);
  }
  return resolve(dirname(packageJsonPath), target);
};

const exportTargets = {
  "./capabilities": resolveExport("./capabilities"),
  "./generated-file-manifest": resolveExport("./generated-file-manifest"),
  "./schema": resolveExport("./schema"),
};

const capabilitiesApi = await import(pathToFileURL(exportTargets["./capabilities"]).href);
const manifestApi = await import(pathToFileURL(exportTargets["./generated-file-manifest"]).href);
const schemaApi = await import(pathToFileURL(exportTargets["./schema"]).href);

const carrierPaths = {
  packageCapability: resolve(root, "packages/adapters/pi/fixtures/manifest/canonical-capability-matrix.json"),
  packageManifest: resolve(root, "packages/adapters/pi/fixtures/manifest/canonical-generated-file-manifest.json"),
  exampleCapability: resolve(root, "examples/harness-integrations/pi/manifest-fixtures/canonical-capability-matrix.json"),
  exampleManifest: resolve(root, "examples/harness-integrations/pi/manifest-fixtures/canonical-generated-file-manifest.json"),
  exampleSummary: resolve(root, "examples/harness-integrations/pi/manifest-fixtures/downstream-manifest-summary.json"),
};

const apiCapability = capabilitiesApi.getPiAdapterCapabilityMatrix();
const apiManifest = manifestApi.getPiGeneratedFileManifest();
const apiSummary = manifestApi.createPiDownstreamManifestSummary();
const packageCapability = await readJson(carrierPaths.packageCapability);
const packageManifest = await readJson(carrierPaths.packageManifest);
const exampleCapability = await readJson(carrierPaths.exampleCapability);
const exampleManifest = await readJson(carrierPaths.exampleManifest);
const exampleSummary = await readJson(carrierPaths.exampleSummary);

const positiveChecks = [];
const capApiValidation = schemaApi.validateCapabilityMatrix(apiCapability);
positiveChecks.push(record("actual API capability matrix validates", capApiValidation.valid, { codes: issueCodes(capApiValidation) }));
const manifestApiValidation = schemaApi.validateGeneratedFileManifest(apiManifest);
positiveChecks.push(record("actual API generated-file manifest validates", manifestApiValidation.valid, { codes: issueCodes(manifestApiValidation) }));
for (const [name, value, validator] of [
  ["package capability carrier validates", packageCapability, schemaApi.validateCapabilityMatrix],
  ["package generated-file carrier validates", packageManifest, schemaApi.validateGeneratedFileManifest],
  ["example capability carrier validates", exampleCapability, schemaApi.validateCapabilityMatrix],
  ["example generated-file carrier validates", exampleManifest, schemaApi.validateGeneratedFileManifest],
]) {
  const validation = validator(value);
  positiveChecks.push(record(name, validation.valid, { codes: issueCodes(validation) }));
}
positiveChecks.push(record("package capability carrier equals actual API output", deepEqual(packageCapability, apiCapability)));
positiveChecks.push(record("package generated-file carrier equals actual API output", deepEqual(packageManifest, apiManifest)));
positiveChecks.push(record("example capability carrier equals actual API output", deepEqual(exampleCapability, apiCapability)));
positiveChecks.push(record("example generated-file carrier equals actual API output", deepEqual(exampleManifest, apiManifest)));
positiveChecks.push(record("example downstream summary equals actual API summary", deepEqual(exampleSummary, apiSummary)));
positiveChecks.push(record("summary has exact six skills", deepEqual(apiSummary.sixSkills, ["brainstorm", "grill-me", "task", "plan", "build", "ship"]), { actual: apiSummary.sixSkills }));
positiveChecks.push(record("summary has exact generated families", deepEqual(apiSummary.generatedFamilies, ["pi-skill-files", "pi-prompt-templates", "pi-extensions", "pi-package-manifest", "context-files", "harness-config"]), { actual: apiSummary.generatedFamilies }));
positiveChecks.push(record("summary manifestReady true", apiSummary.manifestReady === true, { actual: apiSummary.manifestReady }));
positiveChecks.push(record("summary createImportReady false", apiSummary.createImportReady === false, { actual: apiSummary.createImportReady }));
positiveChecks.push(record("summary runtime execution not proven", ["not-claimed", "pending-live", "blocked"].includes(apiSummary.runtimeExecutionClaim), { actual: apiSummary.runtimeExecutionClaim }));
positiveChecks.push(record("summary non-pi adapters blocked/deferred/unknown", deepEqual(apiSummary.blockedNonPiAdapters, ["claude-code", "codex", "opencode", "later-integrations"]), { actual: apiSummary.blockedNonPiAdapters }));

const negativeExpectedCodes = new Map([
  ["missing-capability-block.json", ["missing_required"]],
  ["unsupported-selectable-non-pi-harness.json", ["non_pi_selectable"]],
  ["missing-generated-file-owner.json", ["missing_required", "missing_fail_closed_metadata"]],
  ["missing-generated-file-security-trust.json", ["missing_required", "missing_fail_closed_metadata"]],
  ["missing-generated-file-version.json", ["missing_required", "missing_fail_closed_metadata"]],
  ["missing-generated-file-consumers.json", ["empty_array", "missing_fail_closed_metadata"]],
  ["missing-six-skill-mapping.json", ["missing_skill_mapping"]],
  ["silent-noop-unsupported-feature-attempt.json", ["unsupported_feature_policy_not_blocking", "non_pi_enabled_flag"]],
  ["runtime-proven-claim.json", ["i14a_runtime_claim_out_of_scope"]],
  ["missing-generated-file-pi-skill-path-pattern.json", ["missing_required_path_pattern"]],
  ["unsupported-generated-file-produced-by-lane.json", ["unsupported_value"]],
  ["unsupported-generated-file-owner-lane.json", ["unsupported_value"]],
]);

const negativeResults = [];
for (const [fileName, expectedCodes] of [...negativeExpectedCodes.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  const path = resolve(root, "packages/adapters/pi/fixtures/manifest/negative", fileName);
  const value = await readJson(path);
  const target = Array.isArray(value.adapters) ? "capability" : "manifest";
  const validation = target === "capability" ? schemaApi.validateCapabilityMatrix(value) : schemaApi.validateGeneratedFileManifest(value);
  const codes = issueCodes(validation);
  negativeResults.push({
    name: fileName,
    target,
    valid: validation.valid,
    codes,
    expectedCodes,
    expectedCodesPresent: includesAll(codes, expectedCodes),
    pass: validation.valid === false && includesAll(codes, expectedCodes),
  });
}

const piAdapter = (matrix) => matrix.adapters.find((adapter) => adapter.adapterId === "pi");
const nonPiAdapter = (matrix, id = "claude-code") => matrix.adapters.find((adapter) => adapter.adapterId === id);
const familyById = (manifest, id) => manifest.families.find((family) => family.familyId === id);
const expectCapabilityMutationFails = (name, mutate, expectedCodes, severityIfPass = "critical") => {
  const mutated = clone(apiCapability);
  mutate(mutated);
  const validation = schemaApi.validateCapabilityMatrix(mutated);
  const codes = issueCodes(validation);
  return { name, target: "capability", valid: validation.valid, codes, expectedCodes, expectedCodesPresent: includesAll(codes, expectedCodes), severityIfPass, pass: validation.valid === false && includesAll(codes, expectedCodes) };
};
const expectManifestMutationFails = (name, mutate, expectedCodes, severityIfPass = "critical") => {
  const mutated = clone(apiManifest);
  mutate(mutated);
  const validation = schemaApi.validateGeneratedFileManifest(mutated);
  const codes = issueCodes(validation);
  return { name, target: "manifest", valid: validation.valid, codes, expectedCodes, expectedCodesPresent: includesAll(codes, expectedCodes), severityIfPass, pass: validation.valid === false && includesAll(codes, expectedCodes) };
};
const expectSummaryThrows = (name, mutate, expectedCodes) => {
  const mutatedCapability = clone(apiCapability);
  const mutatedManifest = clone(apiManifest);
  mutate(mutatedCapability, mutatedManifest);
  try {
    schemaApi.createDownstreamManifestSummary(mutatedCapability, mutatedManifest);
    return { name, target: "summary", threw: false, codes: [], expectedCodes, expectedCodesPresent: false, severityIfPass: "critical", pass: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const codes = expectedCodes.filter((code) => message.includes(code));
    return { name, target: "summary", threw: true, message, codes, expectedCodes, expectedCodesPresent: includesAll(codes, expectedCodes), severityIfPass: "critical", pass: includesAll(codes, expectedCodes) };
  }
};

const mutationChecks = [];
mutationChecks.push(expectCapabilityMutationFails("capability matrix unknown top-level field rejected", (matrix) => { matrix.unmodeled = true; }, ["unknown_field"]));
mutationChecks.push(expectCapabilityMutationFails("unsupported evidence enum state rejected", (matrix) => { piAdapter(matrix).evidenceStatus.state = "maybe"; }, ["unsupported_value"]));
mutationChecks.push(expectCapabilityMutationFails("duplicate adapter id rejected", (matrix) => { matrix.adapters.push(clone(piAdapter(matrix))); }, ["duplicate_adapter_id"]));
mutationChecks.push(expectCapabilityMutationFails("missing pi adapter row rejected", (matrix) => { matrix.adapters = matrix.adapters.filter((adapter) => adapter.adapterId !== "pi"); }, ["missing_pi_adapter"]));
mutationChecks.push(expectCapabilityMutationFails("missing six-skill mapping rejected", (matrix) => { piAdapter(matrix).skillsCommandsSurface.skills = piAdapter(matrix).skillsCommandsSurface.skills.filter((skill) => skill.skillId !== "ship"); }, ["missing_skill_mapping"]));
mutationChecks.push(expectCapabilityMutationFails("unsupported selectable non-pi harness rejected", (matrix) => { nonPiAdapter(matrix).selection.manifestSelectable = true; nonPiAdapter(matrix).selection.createImportSelectable = true; nonPiAdapter(matrix).selection.readiness = "ready"; }, ["non_pi_selectable"]));
mutationChecks.push(expectCapabilityMutationFails("silent/no-op unsupported feature attempt rejected", (matrix) => { nonPiAdapter(matrix).capabilityFlags.skills = true; nonPiAdapter(matrix).skillsCommandsSurface.evidence.state = "unknown"; }, ["non_pi_enabled_flag", "flag_without_known_evidence"]));
mutationChecks.push(expectCapabilityMutationFails("create/import selected-harness claim rejected", (matrix) => { piAdapter(matrix).selection.createImportSelectable = true; }, ["create_import_claim_out_of_scope"]));

for (const runtimeClaim of ["proven", "live-proven", "runtime-proven", "loaded", "executed"]) {
  mutationChecks.push(expectCapabilityMutationFails(`live runtime green claim '${runtimeClaim}' rejected`, (matrix) => { piAdapter(matrix).realBoundaryWitness.runtimeExecutionClaim = runtimeClaim; }, ["i14a_runtime_claim_out_of_scope"]));
  mutationChecks.push(expectSummaryThrows(`downstream summary rejects live runtime green claim '${runtimeClaim}'`, (matrix) => { piAdapter(matrix).realBoundaryWitness.runtimeExecutionClaim = runtimeClaim; }, ["i14a_runtime_claim_out_of_scope"]));
}

mutationChecks.push(expectManifestMutationFails("generated-file manifest unknown top-level field rejected", (manifest) => { manifest.unmodeled = true; }, ["unknown_field"]));
mutationChecks.push(expectManifestMutationFails("missing generated-file family rejected", (manifest) => { manifest.families = manifest.families.filter((family) => family.familyId !== "harness-config"); }, ["missing_generated_file_family"]));
mutationChecks.push(expectManifestMutationFails("duplicate generated-file family rejected", (manifest) => { manifest.families.push(clone(familyById(manifest, "context-files"))); }, ["duplicate_generated_file_family"]));
mutationChecks.push(expectManifestMutationFails("unsupported generated-file readiness state rejected", (manifest) => { familyById(manifest, "harness-config").readiness.state = "green"; }, ["unsupported_value"]));
mutationChecks.push(expectManifestMutationFails("missing generated-file owner rejected", (manifest) => { delete familyById(manifest, "pi-skill-files").owner; }, ["missing_required", "missing_fail_closed_metadata"]));
mutationChecks.push(expectManifestMutationFails("missing generated-file security/trust rejected", (manifest) => { delete familyById(manifest, "pi-skill-files").trustSecurity; }, ["missing_required", "missing_fail_closed_metadata"]));
mutationChecks.push(expectManifestMutationFails("missing generated-file version rejected", (manifest) => { delete familyById(manifest, "pi-skill-files").version; }, ["missing_required", "missing_fail_closed_metadata"]));
mutationChecks.push(expectManifestMutationFails("missing generated-file consumers rejected", (manifest) => { familyById(manifest, "pi-skill-files").consumedByLanes = []; }, ["empty_array", "missing_fail_closed_metadata"]));
mutationChecks.push(expectManifestMutationFails("pi skill path requires both pi and agents SKILL paths", (manifest) => { familyById(manifest, "pi-skill-files").pathPatterns = [".pi/skills/<skill>/SKILL.md"]; }, ["missing_required_path_pattern"]));
mutationChecks.push(expectManifestMutationFails("pi prompt template path contract exact", (manifest) => { familyById(manifest, "pi-prompt-templates").pathPatterns = [".pi/prompt/<name>.md"]; }, ["missing_required_path_pattern"]));
mutationChecks.push(expectManifestMutationFails("pi extension path contract requires file and index forms", (manifest) => { familyById(manifest, "pi-extensions").pathPatterns = [".pi/extensions/<name>.ts"]; }, ["missing_required_path_pattern"]));
mutationChecks.push(expectManifestMutationFails("pi package manifest requires package.json#pi", (manifest) => { familyById(manifest, "pi-package-manifest").pathPatterns = ["package.json"]; }, ["missing_required_path_pattern"]));
mutationChecks.push(expectManifestMutationFails("context files require explicit AGENTS and CLAUDE modeling", (manifest) => { familyById(manifest, "context-files").pathPatterns = ["AGENTS.md"]; }, ["missing_required_path_pattern"]));
mutationChecks.push(expectManifestMutationFails("harness config requires generated config fields", (manifest) => { familyById(manifest, "harness-config").pathPatterns = ["generated harness config field: agenticHarness=pi"]; }, ["missing_required_path_pattern"]));
mutationChecks.push(expectManifestMutationFails("arbitrary generated-file producedByLane rejected", (manifest) => { familyById(manifest, "pi-skill-files").producedByLane = "I-99-arbitrary-lane"; }, ["unsupported_value"]));
mutationChecks.push(expectManifestMutationFails("arbitrary generated-file owner lane rejected", (manifest) => { familyById(manifest, "pi-skill-files").owner.ownerId = "I-99-arbitrary-lane"; }, ["unsupported_value"]));
mutationChecks.push(expectManifestMutationFails("owner write scope must match path contract", (manifest) => { familyById(manifest, "pi-skill-files").owner.writePathScope = [".pi/skills/<skill>/SKILL.md"]; }, ["missing_required_path_pattern"]));
mutationChecks.push(expectManifestMutationFails("owner allowed operations typed exact", (manifest) => { familyById(manifest, "pi-skill-files").owner.allowedOperations = ["declare"]; }, ["unsupported_value"]));
mutationChecks.push(expectManifestMutationFails("unsupported generated-file consumer lane rejected", (manifest) => { familyById(manifest, "pi-skill-files").consumedByLanes = ["I-99-arbitrary-lane"]; }, ["unsupported_value"]));
mutationChecks.push(expectManifestMutationFails("unsupported generated-file project-trust metadata rejected", (manifest) => { familyById(manifest, "harness-config").trustSecurity.projectTrustRequired = true; }, ["unsupported_value"]));
mutationChecks.push(expectManifestMutationFails("unsafe sandbox proven claim rejected for I-14A families", (manifest) => { familyById(manifest, "pi-skill-files").trustSecurity.sandboxCapability = "proven"; }, ["unsupported_value"]));
mutationChecks.push(expectManifestMutationFails("extension executable behavior must be declared", (manifest) => { familyById(manifest, "pi-extensions").trustSecurity.executesCode = false; }, ["unsupported_value", "extension_execution_not_declared"]));
mutationChecks.push(expectManifestMutationFails("generated-file version format name exact", (manifest) => { familyById(manifest, "pi-skill-files").version.formatName = "Generic markdown"; }, ["unsupported_value"]));

const regression = {
  exactSixSkills: deepEqual(apiSummary.sixSkills, ["brainstorm", "grill-me", "task", "plan", "build", "ship"]),
  generatedFamilies: apiSummary.generatedFamilies,
  generatedFamiliesExact: deepEqual(apiSummary.generatedFamilies, ["pi-skill-files", "pi-prompt-templates", "pi-extensions", "pi-package-manifest", "context-files", "harness-config"]),
  manifestReady: apiSummary.manifestReady,
  createImportReady: apiSummary.createImportReady,
  runtimeExecutionClaim: apiSummary.runtimeExecutionClaim,
  runtimeNotProven: ["not-claimed", "pending-live", "blocked"].includes(apiSummary.runtimeExecutionClaim),
  blockedNonPiAdapters: apiSummary.blockedNonPiAdapters,
  nonPiNeverSelectableReady: apiCapability.adapters.filter((adapter) => adapter.adapterId !== "pi").every((adapter) => adapter.selection.manifestSelectable === false && adapter.selection.createImportSelectable === false && adapter.selection.readiness !== "ready"),
  liveRuntimeClaimedGreenInCanonical: apiCapability.adapters.some((adapter) => ["proven", "live-proven", "runtime-proven", "loaded", "executed"].includes(adapter.realBoundaryWitness.runtimeExecutionClaim)),
};

const positiveOk = positiveChecks.every((check) => check.pass === true);
const negativeOk = negativeResults.every((check) => check.pass === true);
const mutationOk = mutationChecks.every((check) => check.pass === true);
const regressionOk = regression.exactSixSkills && regression.generatedFamiliesExact && regression.manifestReady === true && regression.createImportReady === false && regression.runtimeNotProven && regression.nonPiNeverSelectableReady && !regression.liveRuntimeClaimedGreenInCanonical;
const outcome = { positiveOk, negativeOk, mutationOk, regressionOk };

await writeFile(summaryPath, `${JSON.stringify(apiSummary, null, 2)}\n`, "utf8");
const result = {
  schemaVersion: "i-14a-post-fix-revalidation-real-boundary-witness/v1",
  generatedAt: "2026-06-25",
  packageJsonPath,
  resolvedExports: exportTargets,
  carriers: carrierPaths,
  positiveChecks,
  negativeResults,
  mutationChecks,
  regression,
  downstreamSummaryPath: summaryPath,
  outcome,
};
await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

if (!positiveOk || !negativeOk || !mutationOk || !regressionOk) {
  console.error(JSON.stringify({ outcome, resultPath, summaryPath }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ outcome, resultPath, summaryPath, negativeCount: negativeResults.length, mutationCount: mutationChecks.length }, null, 2));
