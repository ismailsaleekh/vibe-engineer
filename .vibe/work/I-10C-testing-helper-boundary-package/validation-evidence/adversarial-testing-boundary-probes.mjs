import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = "/Users/lizavasilyeva/work/vibe-engineer";
const evidenceRoot = path.join(repoRoot, ".vibe/work/I-10C-testing-helper-boundary-package/validation-evidence");
const workspaceRoot = path.join(evidenceRoot, "adversarial-workspaces");
const { validateTestingBoundary } = await import(pathToFileURL(path.join(repoRoot, "packages/mechanical-gates/src/p0/testing-boundary/index.js")));
const { assertTypedFindings } = await import(pathToFileURL(path.join(repoRoot, "packages/mechanical-gates/src/p0/boundaries/index.js")));

const basePolicy = {
  proofMode: "typescript-ast",
  testOnlyPackageName: "@vibe-engineer/testing",
  packageManifestRoots: ["packages"],
  requiredPackageManifestPaths: ["packages/testing/package.json"],
  sourceRoots: ["packages"],
  sourceExtensions: [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"],
  excludedDirectoryNames: ["node_modules", ".git", ".tmp", "dist", "build", "coverage", "generated", "vendor"],
  testSurface: {
    fileSuffixes: [".test.js", ".test.mjs", ".test.cjs", ".test.ts", ".test.tsx", ".spec.js", ".spec.mjs", ".spec.cjs", ".spec.ts", ".spec.tsx"],
    directorySegments: ["__tests__", "fixtures"]
  }
};

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeJson(file, value) {
  await writeFile(file, json(value), "utf8");
}

async function makeWorkspace(name, options = {}) {
  const root = path.join(workspaceRoot, name);
  await mkdir(root, { recursive: true });
  const policy = { ...basePolicy, ...(options.policy ?? {}) };
  await writeJson(path.join(root, "mechanical-testing-boundary.json"), policy);

  if (options.includeTestingPackage !== false) {
    await mkdir(path.join(root, "packages/testing/src"), { recursive: true });
    await writeJson(path.join(root, "packages/testing/package.json"), {
      name: "@vibe-engineer/testing",
      version: "0.0.0",
      private: options.testingPrivate ?? true,
      type: "module",
      vibeEngineer: options.testingPolicy ?? { testOnly: true, productionDependencyAllowed: false },
      ...(options.testingExtraManifest ?? {})
    });
    await writeFile(path.join(root, "packages/testing/src/index.js"), "export const helper = true;\n", "utf8");
  }

  await mkdir(path.join(root, "packages/consumer/src"), { recursive: true });
  const consumerManifest = {
    name: "@fixture/consumer",
    version: "0.0.0",
    type: "module",
    ...(options.consumerManifest ?? { devDependencies: { "@vibe-engineer/testing": "workspace:*" } })
  };
  await writeJson(path.join(root, "packages/consumer/package.json"), consumerManifest);
  await writeFile(path.join(root, "packages/consumer/src/index.ts"), options.source ?? "export const value = 1;\n", "utf8");
  if (options.testSource !== false) {
    await writeFile(path.join(root, "packages/consumer/src/consumer.test.ts"), "import { helper } from '@vibe-engineer/testing';\nexport const testValue = helper;\n", "utf8");
  }
  return root;
}

async function runCase(row) {
  const result = await validateTestingBoundary(row.root, row.options ?? {});
  assertTypedFindings(result.findings);
  const ruleIds = result.findings.map((finding) => finding.ruleId).sort();
  const missing = (row.expectedRuleIds ?? []).filter((ruleId) => !ruleIds.includes(ruleId));
  const passExpectationOk = row.expectOk ? result.ok === true : result.ok === false;
  if (!passExpectationOk || missing.length > 0 || result.family !== "p0.testing-boundary") {
    throw new Error(JSON.stringify({ case: row.name, ok: result.ok, ruleIds, missing, family: result.family, findings: result.findings }, null, 2));
  }
  return {
    name: row.name,
    ok: result.ok,
    ruleIds,
    typedFindings: true,
    evidence: {
      parser: result.evidence.parser,
      proofMode: result.evidence.proofMode,
      packageCount: result.evidence.packageCount,
      sourceFileCount: result.evidence.sourceFileCount,
      productionImportCount: result.evidence.productionImportCount,
      dependencyEdges: result.evidence.dependencyEdges
    }
  };
}

await rm(workspaceRoot, { recursive: true, force: true });
await mkdir(workspaceRoot, { recursive: true });

const positiveRoot = await makeWorkspace("positive-dev-only", {});
const optionalRoot = await makeWorkspace("optional-prod-dep", { consumerManifest: { optionalDependencies: { "@vibe-engineer/testing": "workspace:*" } } });
const peerRoot = await makeWorkspace("peer-prod-dep", { consumerManifest: { peerDependencies: { "@vibe-engineer/testing": "workspace:*" } } });
const typeImportRoot = await makeWorkspace("type-import-production", { source: "import type { TypedResultLike } from '@vibe-engineer/testing';\nexport type Local = TypedResultLike;\n" });
const exportRoot = await makeWorkspace("export-subpath-production", { source: "export { helper } from '@vibe-engineer/testing/subpath';\n" });
const requireRoot = await makeWorkspace("require-production", { source: "const testing = require('@vibe-engineer/testing');\nmodule.exports = testing;\n" });
const sourceTraversalRoot = await makeWorkspace("source-root-traversal", { policy: { sourceRoots: ["../outside"] } });
const requiredTraversalRoot = await makeWorkspace("required-manifest-traversal", { policy: { requiredPackageManifestPaths: ["../outside/package.json"] } });
const malformedDepsRoot = await makeWorkspace("malformed-dependency-section", { consumerManifest: { dependencies: [] } });
const missingTestingRoot = await makeWorkspace("missing-test-only-manifest", { includeTestingPackage: false, policy: { packageManifestRoots: ["packages/consumer"], requiredPackageManifestPaths: ["packages/consumer/package.json"] } });
const missingRootRoot = await makeWorkspace("missing-package-root", { policy: { packageManifestRoots: ["missing-packages"] } });
const optionDisagreeRoot = await makeWorkspace("option-policy-disagree", {});
const publishConfigRoot = await makeWorkspace("publish-config-public", { testingExtraManifest: { publishConfig: { access: "public" } } });

const cases = [
  { name: "positive-dev-only", root: positiveRoot, expectOk: true },
  { name: "optional-prod-dep", root: optionalRoot, expectedRuleIds: ["testing-boundary.production-dependency"] },
  { name: "peer-prod-dep", root: peerRoot, expectedRuleIds: ["testing-boundary.production-dependency"] },
  { name: "type-import-production", root: typeImportRoot, expectedRuleIds: ["testing-boundary.production-import"] },
  { name: "export-subpath-production", root: exportRoot, expectedRuleIds: ["testing-boundary.production-import"] },
  { name: "require-production", root: requireRoot, expectedRuleIds: ["testing-boundary.production-import"] },
  { name: "source-root-traversal", root: sourceTraversalRoot, expectedRuleIds: ["testing-boundary.source-root-unreadable"] },
  { name: "required-manifest-traversal", root: requiredTraversalRoot, expectedRuleIds: ["testing-boundary.manifest-unreadable"] },
  { name: "malformed-dependency-section", root: malformedDepsRoot, expectedRuleIds: ["testing-boundary.manifest-schema"] },
  { name: "missing-test-only-manifest", root: missingTestingRoot, expectedRuleIds: ["testing-boundary.test-only-manifest-missing"] },
  { name: "missing-package-root", root: missingRootRoot, expectedRuleIds: ["testing-boundary.manifest-unreadable"] },
  { name: "option-policy-disagree", root: optionDisagreeRoot, options: { testOnlyPackageName: "@different/testing" }, expectedRuleIds: ["testing-boundary.policy-schema"] },
  { name: "publish-config-public", root: publishConfigRoot, expectedRuleIds: ["testing-boundary.publishable-test-package"] },
  { name: "policy-path-traversal", root: positiveRoot, options: { policyPath: "../outside-root.json" }, expectedRuleIds: ["testing-boundary.policy-unreadable"] }
];

const results = [];
for (const row of cases) {
  results.push(await runCase(row));
}

const output = { ok: true, caseCount: results.length, failedCount: 0, results };
await writeJson(path.join(evidenceRoot, "adversarial-testing-boundary-results.json"), output);
console.log(JSON.stringify(output));
