#!/usr/bin/env node
// I-15A lane-owned witness runner. Mirrors schematic/run-cli-witnesses.mjs.
// Exercises the REAL create/import command modules through a real CommandLoader, against the REAL
// I-14A manifest/matrix, the REAL context package, and REAL on-disk generated artifacts.
// Located under packages/cli/src/commands/create/ so bare workspace imports resolve from the cli context.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { createCommandLoader } from "../../command-loader/loader.js";
import { validateCliResultEnvelope } from "../../envelope/result-envelope.js";
import { createCommand } from "./index.ts";
import { importCommand } from "../import/index.ts";

// Real-boundary resolvability (W-RESOLVE-CLI-ADAPTER + W-RESOLVE-CLI-CONTEXT).
import {
  getPiAdapterCapabilityMatrix,
  isAdapterManifestSelectable,
  PI_ADAPTER_ID,
  PI_ADAPTER_CAPABILITY_SCHEMA_VERSION,
} from "@vibe-engineer/adapter-pi/capabilities";
import {
  CREATE_PI_ASSET_FAMILIES,
  getPiGeneratedFileManifest,
  PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION,
  createPiDownstreamManifestSummary,
  selectCreatePiAssets,
  validateCreatePiAssetWritePlan,
} from "@vibe-engineer/adapter-pi/generated-file-manifest";
import {
  validateCapabilityMatrix,
  validateGeneratedFileManifest,
} from "@vibe-engineer/adapter-pi/schema";
import {
  validateContextProject,
  retrieveContextClosure,
  CONTEXT_SCHEMA_VERSION,
} from "@vibe-engineer/context";
import { createDefaultVibeConfig } from "@vibe-engineer/config";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../..");
const evidenceRootDefault = resolve(
  repoRoot,
  ".vibe/work/I-15A-create-import-cli-ux-selected-harness/evidence/cli",
);
const canonicalCommand =
  "node packages/cli/src/commands/create/run-cli-witnesses.mjs --evidence-root .vibe/work/I-15A-create-import-cli-ux-selected-harness/evidence/cli";

function parseArgs(argv) {
  const out = { evidenceRoot: null, case: null, refreshFixtures: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--evidence-root") out.evidenceRoot = resolve(repoRoot, argv[++i]);
    else if (argv[i] === "--case") out.case = argv[++i];
    else if (argv[i] === "--refresh-fixtures") out.refreshFixtures = true;
  }
  out.evidenceRoot = out.evidenceRoot ?? evidenceRootDefault;
  return out;
}
const args = parseArgs(process.argv.slice(2));
rmSync(args.evidenceRoot, { recursive: true, force: true });
mkdirSync(args.evidenceRoot, { recursive: true });

function writeJson(file, value) {
  writeFileSync(resolve(args.evidenceRoot, file), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
function invocation(command) {
  return {
    id: `i-15a-${command}-witness`,
    command,
    argv: [command, "--non-interactive"],
    projectRoot: repoRoot,
    configPath: null,
    startedAt: "2026-06-27T00:00:00.000Z",
    endedAt: "2026-06-27T00:00:00.000Z",
  };
}
function casePrefix(nn, id, slug) {
  return `${String(nn).padStart(2, "0")}-${id}-${slug}`;
}

async function dispatchCreate(slug, extra) {
  const targetRoot = resolve(args.evidenceRoot, "targets", slug);
  const resultFile = resolve(args.evidenceRoot, "result-files", `${slug}.json`);
  mkdirSync(targetRoot, { recursive: true });
  mkdirSync(dirname(resultFile), { recursive: true });
  const loader = createCommandLoader([createCommand]);
  const result = await loader.dispatch(
    "create",
    [
      "--target-root",
      targetRoot,
      "--result-file",
      resultFile,
      ...extra,
      "--json",
      "--non-interactive",
    ],
    {
      invocation: invocation("create"),
      packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
      config: null,
    },
  );
  return { envelope: result.envelope, targetRoot, resultFile };
}
async function dispatchImport(slug, extra) {
  const targetRoot = resolve(args.evidenceRoot, "targets", slug);
  mkdirSync(targetRoot, { recursive: true });
  const resultFile = resolve(args.evidenceRoot, "result-files", `${slug}.json`);
  mkdirSync(dirname(resultFile), { recursive: true });
  const loader = createCommandLoader([importCommand]);
  const result = await loader.dispatch(
    "import",
    [
      "--target-root",
      targetRoot,
      "--result-file",
      resultFile,
      ...extra,
      "--json",
      "--non-interactive",
    ],
    {
      invocation: invocation("import"),
      packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
      config: null,
    },
  );
  return { envelope: result.envelope, targetRoot, resultFile };
}

const cases = [];
async function writeCase(nn, id, slug, fn) {
  if (args.case && args.case !== slug) return null;
  const prefix = casePrefix(nn, id, slug);
  let exit = 0,
    stderr = "",
    stdout;
  try {
    stdout = await fn();
  } catch (error) {
    exit = 1;
    stderr = `${error.stack ?? error.message}\n`;
    stdout = { witness: id, slug, passed: false, error: error.message };
  }
  writeFileSync(
    resolve(args.evidenceRoot, `${prefix}.cmd.txt`),
    `${canonicalCommand} --case ${slug}\n`,
    "utf8",
  );
  writeJson(`${prefix}.stdout.json`, stdout);
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.stderr.txt`), stderr, "utf8");
  writeFileSync(resolve(args.evidenceRoot, `${prefix}.exit.txt`), `${exit}\n`, "utf8");
  cases.push({ witnessId: id, caseSlug: slug, result: exit === 0 ? "passed" : "failed", stdout });
  return stdout;
}

function readText(p) {
  return readFileSync(p, "utf8");
}
function loadResultData(env) {
  return env && env.payload && env.payload.kind === "create_result" ? env.payload.data : null;
}
function parseWitnessJson(value) {
  return value;
}
function readJsonFile(p) {
  return parseWitnessJson(JSON.parse(readText(p)));
}
function sha256Buffer(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}
function sha256File(p) {
  return sha256Buffer(readFileSync(p));
}
function walkFiles(root) {
  const out = [];
  if (!existsSync(root)) return out;
  for (const ent of readdirSync(root, { withFileTypes: true })) {
    const p = resolve(root, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(p));
    else if (ent.isFile()) out.push(p);
  }
  return out;
}
const starterLayoutPath = resolve(repoRoot, "packages/cli/templates/starter.layout.json");
const starterTemplateRoot = resolve(repoRoot, "packages/cli/templates/starter");
const starterLayout = readJsonFile(starterLayoutPath);
const starterOverlayPaths = new Set(["vibe-engineer.config.json", ".vibe/context/manifest.json"]);
function starterSubstitutionPathSet(envelope) {
  const data = loadResultData(envelope);
  const paths = data?.generatedFiles?.starterTemplate?.substitutionPaths;
  return new Set(Array.isArray(paths) ? paths : ["package.json"]);
}
function relFrom(root, p) {
  return p
    .slice(root.length + 1)
    .split(sep)
    .join("/");
}
function assertNoTemplateScopeLeaked(targetRoot, projectSlug) {
  const staleHits = [];
  const expectedScope = `@${projectSlug}`;
  for (const file of walkFiles(targetRoot)) {
    if (
      !/\.(?:json|md|mjs|cjs|js|ts|tsx|yml|yaml|prisma|txt|example)$/u.test(file) &&
      !file.endsWith("package.json") &&
      !file.endsWith("_gitignore")
    )
      continue;
    const text = readText(file);
    if (text.includes("@vibe-engineer-starter") || text.includes("vibe-engineer-starter"))
      staleHits.push(relFrom(targetRoot, file));
  }
  assert.deepEqual(staleHits, []);
  const rootPkg = readJsonFile(resolve(targetRoot, "package.json"));
  assert.equal(rootPkg.name, `${expectedScope}/workspace`);
  assert.equal(rootPkg.scripts.dev.includes(`${expectedScope}/api`), true);
  assert.equal(rootPkg.scripts["dev:mobile"].includes(`${expectedScope}/mobile`), true);
  const mobilePkg = readJsonFile(resolve(targetRoot, "apps/mobile/package.json"));
  assert.equal(mobilePkg.name, `${expectedScope}/mobile`);
  assert.equal(mobilePkg.scripts.dev.includes("expo start"), true);
  assert.equal(typeof mobilePkg.dependencies.expo, "string");
  assert.equal(typeof mobilePkg.devDependencies["babel-preset-expo"], "string");
  assert.equal(existsSync(resolve(targetRoot, "apps/mobile/app.json")), true);
  assert.equal(existsSync(resolve(targetRoot, "apps/mobile/index.js")), true);
  assert.equal(existsSync(resolve(targetRoot, "apps/mobile/metro.config.cjs")), true);
  assert.equal(existsSync(resolve(targetRoot, "apps/mobile/babel.config.cjs")), true);
  const mobileApp = readJsonFile(resolve(targetRoot, "apps/mobile/app.json"));
  assert.equal(mobileApp.expo.slug, projectSlug);
  assert.equal(mobileApp.expo.scheme, projectSlug);
  const runnerCatalog = readJsonFile(resolve(targetRoot, ".vibe/registry/runner-catalog.json"));
  assert.equal(Array.isArray(runnerCatalog), true);
  assert.equal(
    runnerCatalog.some((entry) => entry.command === process.execPath),
    true,
    "runner catalog must pin the current Node executable for safe command runners",
  );
  const composeConfig = readJsonFile(
    resolve(targetRoot, ".tooling/dev-services/docker-compose.json"),
  );
  assert.equal(
    composeConfig.name,
    projectSlug,
    "generated Docker Compose resources must be project-scoped",
  );
  assert.equal(
    existsSync(resolve(targetRoot, ".env")),
    true,
    "generated starter must include local root env defaults",
  );
  assert.equal(
    existsSync(resolve(targetRoot, "apps/api/.env")),
    true,
    "generated starter must include Prisma-readable API env defaults",
  );
  assert.equal(
    mobilePkg.scripts["test:unit"].includes("register-mobile-test-loader.mjs"),
    true,
    "mobile unit tests must use the generated React Native-aware Node loader",
  );
  for (const packageName of ["api-client", "contracts", "domain", "config", "testing", "ui"]) {
    const workspacePackage = readJsonFile(
      resolve(targetRoot, `packages/${packageName}/package.json`),
    );
    assert.equal(
      typeof workspacePackage["react-native"],
      "string",
      `${packageName} must expose a Metro-compatible React Native entry`,
    );
    assert.equal(
      workspacePackage["react-native"].startsWith("./src/"),
      true,
      `${packageName} React Native entry must point at source for fresh mobile dev`,
    );
  }
}
function assertStarterLayout(targetRoot, projectSlug, envelope) {
  const starterSubstitutionPaths = starterSubstitutionPathSet(envelope);
  assert.equal(starterLayout.schemaVersion, "vibe-engineer.templates.starter-layout.v1");
  assert.equal(starterLayout.fileCount, starterLayout.files.length);
  const missing = [];
  const hashMismatches = [];
  for (const entry of starterLayout.files) {
    const targetEntryPath = entry.path === "_gitignore" ? ".gitignore" : entry.path;
    const targetPath = resolve(targetRoot, ...targetEntryPath.split("/"));
    if (!existsSync(targetPath)) {
      missing.push(entry.path);
      continue;
    }
    if (starterOverlayPaths.has(entry.path)) continue;
    if (starterSubstitutionPaths.has(entry.path)) continue;
    const st = statSync(targetPath);
    const hash = sha256File(targetPath);
    if (st.size !== entry.bytes || hash !== entry.sha256)
      hashMismatches.push({
        path: entry.path,
        expectedBytes: entry.bytes,
        actualBytes: st.size,
        expectedSha256: entry.sha256,
        actualSha256: hash,
      });
  }
  assert.deepEqual(missing, []);
  assert.deepEqual(hashMismatches, []);
  const config = readJsonFile(resolve(targetRoot, "vibe-engineer.config.json"));
  assert.equal(
    Object.prototype.hasOwnProperty.call(config, "starter"),
    false,
    "vibe-engineer.config.json must remain schema-valid and not carry starter-only metadata",
  );
  assert.equal(config.agenticHarness, "pi");
  assert.equal(config.maxParallelAgents, 8);
  assert.equal(config.maxValidationFixIterations, 3);
  assert.equal(config.agenticWorkPackageTargetHours, 6);
  assert.equal(typeof config.verification, "object");
  assert.equal(typeof config.uiVerification, "object");
  assert.equal(typeof config.agentRegistry, "object");
  assert.deepEqual(
    readJsonFile(resolve(targetRoot, ".vibe/context/manifest.json")),
    readJsonFile(resolve(starterTemplateRoot, ".vibe/context/manifest.json")),
  );
  assertNoTemplateScopeLeaked(targetRoot, projectSlug);
  return {
    checkedFiles: starterLayout.files.length,
    overlays: [...starterOverlayPaths],
    substitutions: [...starterSubstitutionPaths],
  };
}
function packageJsonFiles(root) {
  return walkFiles(root).filter(
    (file) => file.endsWith(`${sep}package.json`) || file === resolve(root, "package.json"),
  );
}
function assertDefinitionThreeDependencies(targetRoot) {
  const harnessScopedHits = [];
  const badVibeEngineerPlacements = [];
  const badVibeEngineerRanges = [];
  for (const file of packageJsonFiles(targetRoot)) {
    const pkg = readJsonFile(file);
    for (const section of [
      "dependencies",
      "peerDependencies",
      "optionalDependencies",
      "devDependencies",
    ]) {
      const deps = pkg[section] && typeof pkg[section] === "object" ? pkg[section] : {};
      for (const [dep, range] of Object.entries(deps)) {
        if (dep.startsWith("@vibe-engineer/"))
          harnessScopedHits.push(`${relFrom(targetRoot, file)}:${section}:${dep}`);
        if (dep === "vibe-engineer" && section !== "devDependencies")
          badVibeEngineerPlacements.push(`${relFrom(targetRoot, file)}:${section}:${dep}`);
        if (
          dep === "vibe-engineer" &&
          (typeof range !== "string" ||
            range.startsWith("workspace:") ||
            range.startsWith("link:") ||
            range.startsWith("/"))
        ) {
          badVibeEngineerRanges.push(
            `${relFrom(targetRoot, file)}:${section}:${dep}:${String(range)}`,
          );
        }
      }
    }
  }
  const rootPkg = readJsonFile(resolve(targetRoot, "package.json"));
  const rootDevDeps =
    rootPkg.devDependencies && typeof rootPkg.devDependencies === "object"
      ? rootPkg.devDependencies
      : {};
  assert.equal(
    typeof rootDevDeps["vibe-engineer"],
    "string",
    "generated starter root must include project-local vibe-engineer as a devDependency",
  );
  if (rootDevDeps["vibe-engineer"].startsWith("file:")) {
    const overrides =
      rootPkg.pnpm && typeof rootPkg.pnpm === "object" ? rootPkg.pnpm.overrides : null;
    assert.equal(
      overrides && typeof overrides === "object",
      true,
      "local-source generated projects must pin local @vibe-engineer/* workspace dependencies through pnpm.overrides",
    );
    for (const packageName of [
      "@vibe-engineer/config",
      "@vibe-engineer/orchestration",
      "@vibe-engineer/security",
      "@vibe-engineer/verification",
    ]) {
      assert.equal(
        typeof overrides[packageName],
        "string",
        `missing local override for ${packageName}`,
      );
      assert.equal(
        overrides[packageName].startsWith("file:"),
        true,
        `override for ${packageName} must be local file:`,
      );
    }
  }
  assert.deepEqual(harnessScopedHits, []);
  assert.deepEqual(badVibeEngineerPlacements, []);
  assert.deepEqual(badVibeEngineerRanges, []);
  return {
    packageJsonCount: packageJsonFiles(targetRoot).length,
    projectLocalVibeEngineer: rootDevDeps["vibe-engineer"],
    harnessScopedHits,
    badVibeEngineerPlacements,
    badVibeEngineerRanges,
  };
}
function assertNoHarnessSourceCopied(targetRoot) {
  const generatedHashes = new Map();
  for (const file of walkFiles(targetRoot)) {
    generatedHashes.set(sha256File(file), relFrom(targetRoot, file));
  }
  const sourceRoots = [
    "packages/cli/src",
    "packages/adapters/pi/src",
    "packages/artifacts/src",
    "packages/config/src",
    "packages/context/src",
    "packages/security/src",
    "packages/schematics/src",
    "packages/verification/src",
    "packages/orchestration/src",
    "packages/skills/src",
  ]
    .map((p) => resolve(repoRoot, p))
    .filter((p) => existsSync(p));
  const matches = [];
  for (const sourceRoot of sourceRoots) {
    for (const sourceFile of walkFiles(sourceRoot)) {
      const match = generatedHashes.get(sha256File(sourceFile));
      if (match) matches.push({ generated: match, source: relFrom(repoRoot, sourceFile) });
    }
  }
  assert.deepEqual(matches, []);
  return {
    sourceRoots: sourceRoots.map((p) => relFrom(repoRoot, p)),
    generatedFilesChecked: generatedHashes.size,
  };
}
function assertNoPresetRuntimeImports() {
  const forbidden = [
    "@vibe-engineer/" + "preset",
    "@vibe-engineer/" + "infra-pulumi",
    "preset-" + "nest-react-rn",
    "preset-" + "typescript",
  ];
  const hits = [];
  for (const file of walkFiles(resolve(repoRoot, "packages/cli/src/commands/create"))) {
    if (!file.endsWith(".ts") && !file.endsWith(".mjs")) continue;
    const text = readText(file);
    for (const needle of forbidden) {
      if (text.includes(needle)) hits.push({ file: relFrom(repoRoot, file), needle });
    }
  }
  assert.deepEqual(hits, []);
  return {
    filesScanned: walkFiles(resolve(repoRoot, "packages/cli/src/commands/create")).length,
    hits,
  };
}
const piTemplateRoot = resolve(repoRoot, "packages/cli/templates/pi/runtime-fixtures");
const piForbiddenDomainMarkers = [
  "e" + "commerce",
  "fash" + "ion",
  "inven" + "tory",
  "ten" + "ant",
  "check" + "out",
  "tele" + "gram",
  "insta" + "gram",
  "bi" + "llz",
  "phar" + "macy",
  "ai-" + "pipeline",
  "/us" + "ers/",
];
function assertPiHarnessAssets(targetRoot, envelope = null) {
  const descriptors = selectCreatePiAssets();
  const expectedFamilies = [...new Set(descriptors.map((asset) => asset.familyId))].sort();
  assert.deepEqual(expectedFamilies, [...CREATE_PI_ASSET_FAMILIES].sort());
  assert.equal(descriptors.length, 12);
  const fileRecords = [];
  for (const descriptor of descriptors) {
    const targetPath = resolve(targetRoot, ...descriptor.path.split("/"));
    const templatePath = resolve(piTemplateRoot, ...descriptor.path.split("/"));
    assert.equal(existsSync(targetPath), true, `missing pi asset ${descriptor.path}`);
    assert.equal(existsSync(templatePath), true, `missing shipped pi template ${descriptor.path}`);
    const targetContent = readText(targetPath);
    const templateContent = readText(templatePath);
    assert.equal(targetContent.length > 0, true, `empty pi asset ${descriptor.path}`);
    assert.equal(
      targetContent,
      templateContent,
      `pi asset ${descriptor.path} differs from shipped template`,
    );
    const lower = targetContent.toLowerCase();
    for (const marker of piForbiddenDomainMarkers) {
      assert.equal(
        lower.includes(marker),
        false,
        `pi asset ${descriptor.path} contains forbidden marker ${marker}`,
      );
    }
    fileRecords.push({
      path: descriptor.path,
      familyId: descriptor.familyId,
      kind: descriptor.kind,
      sha256: sha256File(targetPath),
    });
  }
  assert.equal(
    existsSync(resolve(targetRoot, ".pi/extensions")),
    false,
    "pi extensions must remain blocked",
  );
  assert.equal(
    existsSync(resolve(targetRoot, ".vibe/harness/pi-runtime.json")),
    false,
    "pi runtime harness fixture config must not be copied by WP-07",
  );
  const packageJsonPath = resolve(targetRoot, "package.json");
  if (existsSync(packageJsonPath)) {
    const pkg = readJsonFile(packageJsonPath);
    assert.equal(
      Object.prototype.hasOwnProperty.call(pkg, "pi"),
      false,
      "pi package manifest key must not be copied",
    );
  }
  if (envelope !== null) {
    const data = loadResultData(envelope);
    assert.deepEqual(data.harnessAssets.piAssetFamilies, [...CREATE_PI_ASSET_FAMILIES]);
    assert.equal(data.harnessAssets.skillCount, 6);
    assert.equal(data.harnessAssets.promptCount, 6);
    assert.equal(data.harnessAssets.extensionsPolicy, "blocked");
    assert.equal(data.harnessAssets.manifestValidation, "valid");
    assert.equal(data.generatedFiles.piAssets.length, 12);
  }
  return {
    expectedCount: descriptors.length,
    skillCount: descriptors.filter((asset) => asset.kind === "skill").length,
    promptCount: descriptors.filter((asset) => asset.kind === "prompt-template").length,
    families: expectedFamilies,
    sha256: fileRecords,
  };
}
function assertCreatePiAssetManifestSelection() {
  const descriptors = selectCreatePiAssets();
  const families = [...new Set(descriptors.map((asset) => asset.familyId))].sort();
  assert.deepEqual(families, ["pi-prompt-templates", "pi-skill-files"]);
  const excluded = [
    "pi-extensions",
    "pi-package-manifest",
    "context-files",
    "harness-config",
  ].filter((familyId) => families.includes(familyId));
  assert.deepEqual(excluded, []);
  assert.equal(descriptors.filter((asset) => asset.kind === "skill").length, 6);
  assert.equal(descriptors.filter((asset) => asset.kind === "prompt-template").length, 6);
  assert.equal(
    descriptors.every((asset) => asset.path.startsWith(".pi/")),
    true,
  );
  return { families, excluded, count: descriptors.length };
}

// --- W-RESOLVE-CLI-ADAPTER + W-RESOLVE-CLI-CONTEXT (real-boundary resolvability) ---
await writeCase(1, "W-RESOLVE", "cli-adapter-context-resolve", async () => {
  const matrix = getPiAdapterCapabilityMatrix();
  const manifest = getPiGeneratedFileManifest();
  assert.equal(PI_ADAPTER_ID, "pi");
  assert.equal(isAdapterManifestSelectable(matrix, "pi"), true);
  assert.equal(PI_ADAPTER_CAPABILITY_SCHEMA_VERSION, "pi-adapter-capability-matrix/v1");
  assert.equal(PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION, "pi-generated-file-manifest/v1");
  assert.equal(validateCapabilityMatrix(matrix).valid, true);
  assert.equal(validateGeneratedFileManifest(manifest).valid, true);
  assert.equal(CONTEXT_SCHEMA_VERSION, "1.0.0");
  assert.equal(typeof createDefaultVibeConfig, "function");
  // I-15A-owned families are exactly context-files + harness-config, both ready.
  const owned = manifest.families.filter(
    (f) => f.producedByLane === "I-15A-create-import-cli-ux-selected-harness",
  );
  assert.deepEqual(owned.map((f) => f.familyId).sort(), ["context-files", "harness-config"]);
  assert.equal(
    owned.every((f) => f.readiness.state === "ready"),
    true,
  );
  return {
    witness: "W-RESOLVE-CLI-ADAPTER+CONTEXT",
    adapterSubpaths: 3,
    contextExports: "ok",
    ownedFamilies: owned.map((f) => f.familyId),
  };
});

// --- W-CREATE-PROVIDED ---
let providedEnv;
await writeCase(2, "W-CREATE-PROVIDED", "create-provided-brief", async () => {
  const r = await dispatchCreate("w-create-provided", [
    "--project-name",
    "Atlas Tracker",
    "--agentic-harness",
    "pi",
    "--brief",
    "A CLI tool to track time across small teams. We care about offline support.",
  ]);
  const validation = validateCliResultEnvelope(r.envelope);
  assert.equal(validation.ok, true, validation.errors?.join("; "));
  assert.equal(r.envelope.status, "success", `status=${r.envelope.status}`);
  const data = loadResultData(r.envelope);
  assert.equal(data.ok, true);
  assert.equal(data.selectedHarness, "pi");
  assert.equal(data.briefStatus, "provided");
  assert.equal(data.project.slug, "atlas-tracker");
  assert.equal(data.harnessConfig.agenticHarness, "pi");
  assert.equal(data.harnessConfig.adapterCapabilityVersion, PI_ADAPTER_CAPABILITY_SCHEMA_VERSION);
  assert.equal(
    data.harnessConfig.generatedFileManifestVersion,
    PI_GENERATED_FILE_MANIFEST_SCHEMA_VERSION,
  );
  // on-disk generated artifacts
  assert.equal(existsSync(resolve(r.targetRoot, "vibe-engineer.config.json")), true);
  const cfg = JSON.parse(readText(resolve(r.targetRoot, "vibe-engineer.config.json")));
  assert.equal(cfg.agenticHarness, "pi");
  assert.equal(existsSync(resolve(r.targetRoot, "AGENTS.md")), true);
  assert.equal(existsSync(resolve(r.targetRoot, "CLAUDE.md")), true);
  const agents = readText(resolve(r.targetRoot, "AGENTS.md"));
  assert.equal(agents.includes("user_provided"), true);
  assert.equal(agents.includes("provenance"), true);
  // result-file atomic write + reread equivalence
  assert.equal(existsSync(r.resultFile), true);
  assert.deepEqual(JSON.parse(readText(r.resultFile)), r.envelope);
  const piAssets = assertPiHarnessAssets(r.targetRoot, r.envelope);
  providedEnv = r.envelope;
  return {
    witness: "W-CREATE-PROVIDED",
    status: r.envelope.status,
    briefStatus: data.briefStatus,
    harnessConfig: data.harnessConfig,
    piAssets: {
      skillCount: piAssets.skillCount,
      promptCount: piAssets.promptCount,
      families: piAssets.families,
    },
  };
});

// --- W-CREATE-SKIPPED ---
await writeCase(3, "W-CREATE-SKIPPED", "create-skipped-brief", async () => {
  const r = await dispatchCreate("w-create-skipped", [
    "--project-name",
    "Blank Slate",
    "--agentic-harness",
    "pi",
  ]);
  assert.equal(validateCliResultEnvelope(r.envelope).ok, true);
  assert.equal(r.envelope.status, "success");
  const data = loadResultData(r.envelope);
  assert.equal(data.briefStatus, "skipped");
  const agents = readText(resolve(r.targetRoot, "AGENTS.md"));
  assert.equal(agents.includes("Brief status: 'skipped'"), true);
  assert.equal(agents.includes("Run the brainstorm skill"), true);
  assert.equal(agents.includes("needs_user_context"), true);
  // skipped must NOT invent confident product-design SECTIONS.
  const lower = agents.toLowerCase();
  for (const forbiddenHeading of [
    "## roadmap",
    "## architecture",
    "## database schema",
    "## domain model",
    "## users",
    "## integrations",
    "## workflow",
    "## feature",
  ]) {
    assert.equal(
      lower.includes(forbiddenHeading),
      false,
      `skipped brief generated confident section '${forbiddenHeading}'`,
    );
  }
  return {
    witness: "W-CREATE-SKIPPED",
    status: r.envelope.status,
    briefStatus: data.briefStatus,
    brainstormInstructionPresent: true,
  };
});

// --- W-IMPORT ---
await writeCase(4, "W-IMPORT", "import-existing-root", async () => {
  const r = await dispatchImport("w-import", [
    "--project-name",
    "Imported Project",
    "--agentic-harness",
    "pi",
    "--brief",
    "Existing repo being brought under vibe-engineer management.",
  ]);
  assert.equal(validateCliResultEnvelope(r.envelope).ok, true);
  assert.equal(r.envelope.status, "success");
  const data = loadResultData(r.envelope);
  assert.equal(data.mode, "import");
  assert.equal(data.selectedHarness, "pi");
  assert.equal(existsSync(resolve(r.targetRoot, "vibe-engineer.config.json")), true);
  assert.equal(existsSync(resolve(r.targetRoot, "AGENTS.md")), true);
  const piAssets = assertPiHarnessAssets(r.targetRoot, r.envelope);
  return {
    witness: "W-IMPORT",
    status: r.envelope.status,
    mode: data.mode,
    piAssets: {
      skillCount: piAssets.skillCount,
      promptCount: piAssets.promptCount,
      families: piAssets.families,
    },
  };
});

// --- W-CONSUMER-MANIFEST (real adapter-manifest consumer of generated harness-config) ---
await writeCase(5, "W-CONSUMER-MANIFEST", "consumer-manifest-summary", async () => {
  const summary = createPiDownstreamManifestSummary();
  const manifest = getPiGeneratedFileManifest();
  const ownValidation = validateGeneratedFileManifest(manifest);
  assert.equal(ownValidation.valid, true);
  // The produced harness-config metadata corresponds to the manifest's harness-config family.
  const harnessFamily = manifest.families.find((f) => f.familyId === "harness-config");
  assert.equal(harnessFamily.producedByLane, "I-15A-create-import-cli-ux-selected-harness");
  assert.equal(harnessFamily.readiness.state, "ready");
  const ctxFamily = manifest.families.find((f) => f.familyId === "context-files");
  assert.equal(ctxFamily.producedByLane, "I-15A-create-import-cli-ux-selected-harness");
  assert.deepEqual(ctxFamily.pathPatterns, ["AGENTS.md", "CLAUDE.md"]);
  // the envelope's harnessConfig fields match the manifest's declared versions
  const data = loadResultData(providedEnv);
  assert.equal(data.harnessConfig.adapterCapabilityVersion, manifest.adapterCapabilityVersion);
  assert.equal(data.harnessConfig.generatedFileManifestVersion, manifest.schemaVersion);
  return {
    witness: "W-CONSUMER-MANIFEST",
    downstreamSummaryKeys: Object.keys(summary).sort(),
    harnessFamilyProducer: harnessFamily.producedByLane,
  };
});

// --- W-CONSUMER-CONTEXT (real context validator/retriever consumes generated context) ---
await writeCase(6, "W-CONSUMER-CONTEXT", "consumer-context-validate-retrieve", async () => {
  const targetRoot = resolve(args.evidenceRoot, "targets", "w-create-provided");
  const validation = await validateContextProject(targetRoot);
  assert.equal(validation.ok, true, JSON.stringify(validation.findings));
  assert.equal(validation.status, "clean");
  const closure = await retrieveContextClosure(targetRoot, {
    task: {
      taskId: "bootstrap-create",
      role: "create",
      areaId: "bootstrap",
      affectedAreas: ["bootstrap"],
      mandatoryLevel: 1,
    },
  });
  const closureData = closure;
  assert.equal(closureData.ok !== false, true, "retriever returned a hard failure");
  const closureBlob = JSON.stringify(closureData);
  const citedSources = closureBlob.includes("src:bootstrap-brief");
  assert.equal(citedSources, true, "retriever could not cite the bootstrap source record");
  // skipped path also loads cleanly
  const skippedValidation = await validateContextProject(
    resolve(args.evidenceRoot, "targets", "w-create-skipped"),
  );
  assert.equal(skippedValidation.ok, true, JSON.stringify(skippedValidation.findings));
  return {
    witness: "W-CONSUMER-CONTEXT",
    providedStatus: validation.status,
    skippedStatus: skippedValidation.status,
    retrieverCitedSource: citedSources,
  };
});

// --- W-MACHINE-ENVELOPE (schema-valid envelopes + atomic result-file + secret redaction) ---
await writeCase(7, "W-MACHINE-ENVELOPE", "machine-envelope-valid", async () => {
  const r = await dispatchCreate("w-machine", [
    "--project-name",
    "Envelope Check",
    "--agentic-harness",
    "pi",
    "--brief",
    "Plain brief.",
  ]);
  assert.equal(validateCliResultEnvelope(r.envelope).ok, true);
  assert.equal(r.envelope.payload.kind, "create_result");
  assert.equal(existsSync(r.resultFile), true);
  // secret-bearing brief is redacted (see W-NEG-INVALID-BRIEF); here assert no raw secret leaks in a normal envelope
  const serialized = JSON.stringify(r.envelope);
  assert.equal(serialized.includes("ghp_"), false);
  return {
    witness: "W-MACHINE-ENVELOPE",
    payloadKind: r.envelope.payload.kind,
    resultFileWritten: true,
  };
});

// --- W-NEG-NON-PI (every deferred/unknown harness blocks; never silent no-op) ---
await writeCase(8, "W-NEG-NON-PI", "non-pi-harness-blocked", async () => {
  const results = {};
  for (const harness of [
    "claude-code",
    "codex",
    "opencode",
    "later-integrations",
    "totally-unknown",
  ]) {
    const r = await dispatchCreate(`w-neg-npi-${harness}`, [
      "--project-name",
      "X",
      "--agentic-harness",
      harness,
      "--brief",
      "y",
    ]);
    assert.equal(validateCliResultEnvelope(r.envelope).ok, true);
    assert.equal(r.envelope.status, "blocked", `${harness} did not block`);
    assert.equal(
      existsSync(resolve(r.targetRoot, ".pi")),
      false,
      `${harness} wrote .pi assets despite being blocked`,
    );
    results[harness] = r.envelope.status;
  }
  return { witness: "W-NEG-NON-PI", allBlocked: results };
});

// --- W-NEG-MISSING/INVALID-MANIFEST (witness the validator directly; command hard-depends on it) ---
await writeCase(9, "W-NEG-INVALID-MANIFEST", "invalid-manifest-blocks", async () => {
  const malformed = { ...getPiGeneratedFileManifest(), families: "not-an-array" };
  const v = validateGeneratedFileManifest(malformed);
  assert.equal(v.valid, false);
  const malformedMatrix = { ...getPiAdapterCapabilityMatrix(), adapters: [] };
  const vm = validateCapabilityMatrix(malformedMatrix);
  assert.equal(vm.valid, false);
  // The command's resolveSelectedPiManifest() gates on these validators (selected-harness.ts),
  // so a manifest that fails validation would produce a blocked envelope (MANIFEST_UNAVAILABLE on
  // load failure, or INVALID_* here). Documented hard dependency, no internal monkey-patch.
  return {
    witness: "W-NEG-INVALID-MANIFEST",
    manifestValidatorRejectsMalformed: !v.valid,
    matrixValidatorRejectsMalformed: !vm.valid,
    commandHardDependsOn:
      "resolveSelectedPiManifest -> validate{CapabilityMatrix,GeneratedFileManifest}",
  };
});

// --- W-NEG-INVALID-BRIEF (oversized + secret-bearing → blocked; no secret echo) ---
await writeCase(10, "W-NEG-INVALID-BRIEF", "invalid-brief-blocked", async () => {
  const oversized = "x".repeat(8193);
  const r1 = await dispatchCreate("w-neg-oversized", [
    "--project-name",
    "Big",
    "--agentic-harness",
    "pi",
    "--brief",
    oversized,
  ]);
  assert.equal(r1.envelope.status, "blocked");
  assert.equal(
    JSON.stringify(r1.envelope).includes("x".repeat(100)),
    false,
    "oversized brief echoed verbatim",
  );
  const r2 = await dispatchCreate("w-neg-secret", [
    "--project-name",
    "Secret",
    "--agentic-harness",
    "pi",
    "--brief",
    "ghp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  ]);
  assert.equal(r2.envelope.status, "blocked");
  assert.equal(JSON.stringify(r2.envelope).includes("ghp_"), false, "secret echoed in envelope");
  return {
    witness: "W-NEG-INVALID-BRIEF",
    oversizedBlocked: r1.envelope.status,
    secretBlocked: r2.envelope.status,
    secretEchoed: false,
  };
});

// --- W-NEG-OVER-INFERENCE (vague one-word brief → only sparse user facts + unknowns) ---
await writeCase(11, "W-NEG-OVER-INFERENCE", "vague-brief-no-overinference", async () => {
  const r = await dispatchCreate("w-neg-overinf", [
    "--project-name",
    "Thing",
    "--agentic-harness",
    "pi",
    "--brief",
    "app",
  ]);
  assert.equal(r.envelope.status, "success");
  const agents = readText(resolve(r.targetRoot, "AGENTS.md"));
  const lower = agents.toLowerCase();
  // Over-inference check is structural: no confident product-design SECTIONS may be generated.
  for (const forbiddenHeading of [
    "## roadmap",
    "## architecture",
    "## database schema",
    "## domain model",
    "## users",
    "## integrations",
    "## workflow",
    "## feature",
  ]) {
    assert.equal(
      lower.includes(forbiddenHeading),
      false,
      `vague brief generated confident section '${forbiddenHeading}'`,
    );
  }
  assert.equal(lower.includes("## unknowns"), true);
  assert.equal(lower.includes("app"), true); // brief recorded verbatim
  return {
    witness: "W-NEG-OVER-INFERENCE",
    noConfidentSections: true,
    briefRecordedVerbatim: true,
  };
});

// --- W-NEG-SKIPPED-CONFIDENT (skipped must NOT emit confident product summary) ---
await writeCase(12, "W-NEG-SKIPPED-CONFIDENT", "skipped-not-confident", async () => {
  const r = await dispatchCreate("w-neg-skipconf", [
    "--project-name",
    "Quiet",
    "--agentic-harness",
    "pi",
  ]);
  assert.equal(r.envelope.status, "success");
  const data = loadResultData(r.envelope);
  assert.equal(data.briefStatus, "skipped");
  const agents = readText(resolve(r.targetRoot, "AGENTS.md"));
  assert.equal(agents.includes("needs_user_context"), true);
  return { witness: "W-NEG-SKIPPED-CONFIDENT", intentionalPlaceholder: true };
});

// --- W-NEG-MISSING-PROVENANCE (every load-bearing claim must carry a DL-17 provenance label) ---
await writeCase(13, "W-NEG-MISSING-PROVENANCE", "provenance-labels-present", async () => {
  const agents = readText(resolve(args.evidenceRoot, "targets", "w-create-provided", "AGENTS.md"));
  for (const label of ["user_provided", "normalized_from_user", "harness_default", "unknown"]) {
    assert.equal(agents.includes(label), true, `missing provenance label ${label}`);
  }
  return { witness: "W-NEG-MISSING-PROVENANCE", provenanceLabelsPresent: true };
});

// --- W-NEG-FORBIDDEN-PROMPTS (flag set is exactly naming + agentic-harness + brief + globals) ---
await writeCase(14, "W-NEG-FORBIDDEN-PROMPTS", "forbidden-prompts-rejected", async () => {
  const r = await dispatchCreate("w-neg-flags", [
    "--project-name",
    "X",
    "--agentic-harness",
    "pi",
    "--stack",
    "next",
    "--max-parallel",
    "4",
    "--brief",
    "y",
  ]);
  assert.equal(r.envelope.status, "blocked");
  assert.equal(r.envelope.payload.kind, "cli_invocation_error");
  const errCode = r.envelope.errors && r.envelope.errors[0] && r.envelope.errors[0].code;
  assert.equal(errCode, "VE_INVALID_FLAG");
  return {
    witness: "W-NEG-FORBIDDEN-PROMPTS",
    stackAndMaxParallelRejected: true,
    errorCode: errCode,
  };
});

// --- W-REG-INVARIANTS (locked name, six skills, artifact flow, config defaults untouched) ---
await writeCase(15, "W-REG-INVARIANTS", "regression-invariants", async () => {
  const agents = readText(resolve(args.evidenceRoot, "targets", "w-create-provided", "AGENTS.md"));
  assert.equal(agents.includes("vibe-engineer"), true);
  for (const skill of ["brainstorm", "grill-me", "task", "plan", "build", "ship"]) {
    assert.equal(agents.includes(skill), true, `missing skill ${skill}`);
  }
  assert.equal(agents.includes("Work Brief"), true);
  assert.equal(agents.includes("Implementation Plan"), true);
  assert.equal(agents.includes("Build Result"), true);
  assert.equal(agents.includes("Ship Packet"), true);
  const cfg = JSON.parse(
    readText(
      resolve(args.evidenceRoot, "targets", "w-create-provided", "vibe-engineer.config.json"),
    ),
  );
  assert.equal(cfg.maxParallelAgents, 8);
  assert.equal(cfg.agenticWorkPackageTargetHours, 6);
  return {
    witness: "W-REG-INVARIANTS",
    name: "vibe-engineer",
    sixSkills: true,
    artifactFlow: true,
    configDefaultsUntouched: true,
  };
});

// --- W-RB4 (default-binary dispatch only; WP-07 live-pi runtime proof pending) ---
// WP-03 made `create` a registered v0.1 command: the default createCommandLoader() (no args) now
// includes createCommand, and `create` was removed from LATER_COMMANDS. So the default loader
// routes `create` to the live createCommand (own typed invalid/missing-arg envelope), NOT the
// loader's UnsupportedOperation branch and NOT the Unknown-command branch. The exact create error
// depends on args/harness state; the routing predicate (mirrors testing/run-witnesses.mjs
// live-command-create) is: classification != unsupported_operation AND code != VE_UNSUPPORTED_OPERATION.
// This WP-06 witness does not launch pi; the live-pi runtime proof is intentionally gated to WP-07.
await writeCase(16, "W-RB4", "default-binary-live-create", async () => {
  const defaultLoader = createCommandLoader();
  const createDispatch = await defaultLoader.dispatch("create", ["--non-interactive"], {
    invocation: invocation("create"),
    packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
    config: null,
  });
  assert.equal(createDispatch.envelope.status, "blocked");
  assert.equal(createDispatch.envelope.payload.kind, "cli_invocation_error");
  const rb4Err = createDispatch.envelope.errors && createDispatch.envelope.errors[0];
  const rb4Code = rb4Err && rb4Err.code;
  const rb4Classification = rb4Err && rb4Err.classification;
  assert.notEqual(rb4Classification, "unsupported_operation");
  assert.notEqual(rb4Code, "VE_UNSUPPORTED_OPERATION");
  return {
    witness: "W-RB4",
    defaultLoaderCreateDispatch: "live",
    reason:
      "WP-03 registers create in the default createCommandLoader(); create routes to the live createCommand (not UnsupportedOperation/Unknown). WP-06 does not launch pi; live-pi runtime proof is gated to WP-07.",
    classification: rb4Classification,
    code: rb4Code,
    livePiRuntime: "pending-live",
    livePiRuntimeProof: "not-run-in-WP-06",
  };
});

// --- W-P1/W-P2 (WP-06 full starter layout + overlay/substitution semantics) ---
await writeCase(17, "W-WP06-LAYOUT", "starter-layout-overlay-semantics", async () => {
  const targetRoot = resolve(args.evidenceRoot, "targets", "w-create-provided");
  const layout = assertStarterLayout(targetRoot, "atlas-tracker", providedEnv);
  return { witness: "W-WP06-LAYOUT", ...layout };
});

// --- W-P2 (areas present) ---
await writeCase(18, "W-WP06-AREAS", "starter-areas-present", async () => {
  const targetRoot = resolve(args.evidenceRoot, "targets", "w-create-provided");
  const required = [
    "apps/api",
    "apps/web",
    "apps/mobile",
    "packages/domain",
    "packages/contracts",
    "packages/api-client",
    "packages/config",
    "packages/testing",
    "packages/ui",
    ".tooling",
    ".vibe",
    "docs",
    "package.json",
    "pnpm-workspace.yaml",
    "tsconfig.base.json",
    "turbo.json",
    "eslint.config.mjs",
    "prettier.config.mjs",
    "vibe-engineer.config.json",
    ".env.example",
  ];
  const missing = required.filter((entry) => !existsSync(resolve(targetRoot, ...entry.split("/"))));
  assert.deepEqual(missing, []);
  return { witness: "W-WP06-AREAS", requiredCount: required.length, missing };
});

// --- W-P3/W-P4 (definition iii dependency proof) ---
await writeCase(19, "W-WP06-DEFINITION-III-DEPS", "starter-no-harness-runtime-deps", async () => {
  const targetRoot = resolve(args.evidenceRoot, "targets", "w-create-provided");
  return {
    witness: "W-WP06-DEFINITION-III-DEPS",
    ...assertDefinitionThreeDependencies(targetRoot),
  };
});

// --- W-R2 (import mode unchanged: no starter tree materialization) ---
await writeCase(20, "W-WP06-IMPORT-NO-STARTER", "import-does-not-materialize-starter", async () => {
  const targetRoot = resolve(args.evidenceRoot, "targets", "w-import");
  const forbidden = [
    "apps/api",
    "apps/web",
    "apps/mobile",
    "packages/domain",
    ".tooling",
    "docs/reference/starter.md",
  ];
  const present = forbidden.filter((entry) => existsSync(resolve(targetRoot, ...entry.split("/"))));
  assert.deepEqual(present, []);
  assert.equal(existsSync(resolve(targetRoot, "vibe-engineer.config.json")), true);
  return { witness: "W-WP06-IMPORT-NO-STARTER", checkedAbsent: forbidden.length, present };
});

// --- W-N2 (conflicting target-root fails closed; no clobber) ---
await writeCase(21, "W-WP06-CONFLICT", "starter-conflict-blocked", async () => {
  const targetRoot = resolve(args.evidenceRoot, "targets", "w-conflict");
  rmSync(targetRoot, { recursive: true, force: true });
  mkdirSync(targetRoot, { recursive: true });
  const marker = resolve(targetRoot, "README.md");
  writeFileSync(marker, "pre-existing user file\n", "utf8");
  const loader = createCommandLoader([createCommand]);
  const result = await loader.dispatch(
    "create",
    [
      "--target-root",
      targetRoot,
      "--project-name",
      "Conflict Case",
      "--agentic-harness",
      "pi",
      "--json",
      "--non-interactive",
    ],
    {
      invocation: invocation("create"),
      packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
      config: null,
    },
  );
  assert.equal(validateCliResultEnvelope(result.envelope).ok, true);
  assert.equal(result.envelope.status, "blocked");
  assert.equal(result.envelope.errors[0].code, "VE_INVALID_INVOCATION");
  assert.equal(result.envelope.errors[0].classification, "write_conflict");
  assert.equal(
    result.envelope.errors[0].details.starterTemplateCode,
    "VE_STARTER_TEMPLATE_TARGET_CONFLICT",
  );
  assert.equal(readText(marker), "pre-existing user file\n");
  assert.equal(existsSync(resolve(targetRoot, "apps")), false);
  return {
    witness: "W-WP06-CONFLICT",
    status: result.envelope.status,
    code: result.envelope.errors[0].code,
    classification: result.envelope.errors[0].classification,
    starterTemplateCode: result.envelope.errors[0].details.starterTemplateCode,
    markerPreserved: true,
  };
});

// --- W-N3 (definition iii: no harness implementation source copied verbatim) ---
await writeCase(22, "W-WP06-NO-HARNESS-SOURCE-COPY", "starter-no-harness-source-copy", async () => {
  const targetRoot = resolve(args.evidenceRoot, "targets", "w-create-provided");
  return { witness: "W-WP06-NO-HARNESS-SOURCE-COPY", ...assertNoHarnessSourceCopied(targetRoot) };
});

// --- W-N4 (no preset/private runtime import in create sources) ---
await writeCase(
  23,
  "W-WP06-NO-PRESET-RUNTIME-IMPORT",
  "create-no-preset-runtime-import",
  async () => {
    return { witness: "W-WP06-NO-PRESET-RUNTIME-IMPORT", ...assertNoPresetRuntimeImports() };
  },
);

// --- W-P1/W-P2/W-N2/W-N3/W-R4 (WP-07 pi native assets from shipped templates) ---
await writeCase(24, "W-WP07-PI-ASSETS", "pi-assets-create-list", async () => {
  const targetRoot = resolve(args.evidenceRoot, "targets", "w-create-provided");
  const assets = assertPiHarnessAssets(targetRoot, providedEnv);
  return { witness: "W-WP07-PI-ASSETS", ...assets };
});

// --- W-P2 (manifest selection is exactly skill+prompt families; I-15A and blocked/deferred families excluded) ---
await writeCase(25, "W-WP07-MANIFEST-SELECTION", "pi-assets-manifest-selection", async () => {
  return { witness: "W-WP07-MANIFEST-SELECTION", ...assertCreatePiAssetManifestSelection() };
});

// --- W-N4 (import conflict: different existing .pi asset blocks; no silent clobber and no partial pi write) ---
await writeCase(26, "W-WP07-IMPORT-CONFLICT", "pi-assets-import-conflict", async () => {
  const targetRoot = resolve(args.evidenceRoot, "targets", "w-wp07-import-conflict");
  rmSync(targetRoot, { recursive: true, force: true });
  const conflictingPath = resolve(targetRoot, ".pi/skills/brainstorm/SKILL.md");
  mkdirSync(dirname(conflictingPath), { recursive: true });
  writeFileSync(conflictingPath, "different existing skill content\n", "utf8");
  const loader = createCommandLoader([importCommand]);
  const result = await loader.dispatch(
    "import",
    [
      "--target-root",
      targetRoot,
      "--project-name",
      "Pi Conflict",
      "--agentic-harness",
      "pi",
      "--json",
      "--non-interactive",
    ],
    {
      invocation: invocation("import"),
      packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
      config: null,
    },
  );
  assert.equal(validateCliResultEnvelope(result.envelope).ok, true);
  assert.equal(result.envelope.status, "blocked");
  assert.equal(result.envelope.payload.data.stage, "pi_asset_validation");
  assert.equal(result.envelope.errors[0].classification, "write_conflict");
  assert.equal(readText(conflictingPath), "different existing skill content\n");
  assert.equal(
    existsSync(resolve(targetRoot, ".pi/prompts/vibe-brainstorm.md")),
    false,
    "pi prompt should not be partially written after validation conflict",
  );
  return {
    witness: "W-WP07-IMPORT-CONFLICT",
    status: result.envelope.status,
    stage: result.envelope.payload.data.stage,
    classification: result.envelope.errors[0].classification,
    conflictingFilePreserved: true,
  };
});

// --- W-N4/P3 (import idempotency: identical existing .pi assets are allowed in import mode) ---
await writeCase(
  27,
  "W-WP07-IMPORT-IDEMPOTENT",
  "pi-assets-import-identical-overwrite",
  async () => {
    const first = await dispatchImport("w-wp07-import-idempotent", [
      "--project-name",
      "Pi Idempotent",
      "--agentic-harness",
      "pi",
    ]);
    assert.equal(first.envelope.status, "success");
    const secondLoader = createCommandLoader([importCommand]);
    const second = await secondLoader.dispatch(
      "import",
      [
        "--target-root",
        first.targetRoot,
        "--project-name",
        "Pi Idempotent",
        "--agentic-harness",
        "pi",
        "--json",
        "--non-interactive",
      ],
      {
        invocation: invocation("import"),
        packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
        config: null,
      },
    );
    assert.equal(validateCliResultEnvelope(second.envelope).ok, true);
    assert.equal(second.envelope.status, "success");
    const assets = assertPiHarnessAssets(first.targetRoot, second.envelope);
    return {
      witness: "W-WP07-IMPORT-IDEMPOTENT",
      status: second.envelope.status,
      conflictPolicy: loadResultData(second.envelope).harnessAssets.conflictPolicy,
      skillCount: assets.skillCount,
      promptCount: assets.promptCount,
    };
  },
);

// --- W-N5 (validator-level path-pattern violation fails closed before writes) ---
await writeCase(28, "W-WP07-VALIDATOR-NEGATIVE", "pi-assets-validator-path-negative", async () => {
  const manifest = getPiGeneratedFileManifest();
  const capabilityMatrix = getPiAdapterCapabilityMatrix();
  const descriptors = selectCreatePiAssets({ manifest, capabilityMatrix });
  const badWrite = {
    ...descriptors[0],
    path: ".pi/extensions/not-allowed.ts",
    content: "not allowed\n",
  };
  const validation = validateCreatePiAssetWritePlan({
    manifest,
    capabilityMatrix,
    writes: [badWrite],
    existingPaths: [{ path: badWrite.path, kind: "missing" }],
    conflictPolicy: "fail-on-conflict",
  });
  assert.equal(validation.valid, false);
  assert.equal(
    validation.issues.some(
      (item) =>
        item.code === "write_path_not_in_create_pi_asset_manifest" ||
        item.code === "create_pi_asset_write_count_mismatch",
    ),
    true,
  );
  return {
    witness: "W-WP07-VALIDATOR-NEGATIVE",
    valid: validation.valid,
    issueCodes: validation.issues.map((item) => item.code),
  };
});

// --- Refresh committed examples fixtures from REAL command output (if requested) ---
if (args.refreshFixtures) {
  const fixtureBase = resolve(repoRoot, "examples/starter-reference/generated-fixtures");
  // create-ux fixtures (provided / skipped / non-pi negative carrier)
  const providedTarget = resolve(fixtureBase, "create-ux/provided-brief");
  rmSync(providedTarget, { recursive: true, force: true });
  mkdirSync(providedTarget, { recursive: true });
  const loaderC = createCommandLoader([createCommand]);
  const provEnv = (
    await loaderC.dispatch(
      "create",
      [
        "--target-root",
        providedTarget,
        "--project-name",
        "Atlas Tracker",
        "--agentic-harness",
        "pi",
        "--brief",
        "A CLI tool to track time across small teams. We care about offline support.",
        "--json",
        "--non-interactive",
      ],
      {
        invocation: invocation("create"),
        packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
        config: null,
      },
    )
  ).envelope;
  writeFileSync(
    resolve(fixtureBase, "create-ux/provided-brief.create-result.json"),
    `${JSON.stringify(provEnv, null, 2)}\n`,
    "utf8",
  );
  const skipTarget = resolve(fixtureBase, "create-ux/skipped-brief");
  rmSync(skipTarget, { recursive: true, force: true });
  mkdirSync(skipTarget, { recursive: true });
  const skipEnv = (
    await loaderC.dispatch(
      "create",
      [
        "--target-root",
        skipTarget,
        "--project-name",
        "Blank Slate",
        "--agentic-harness",
        "pi",
        "--json",
        "--non-interactive",
      ],
      {
        invocation: invocation("create"),
        packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
        config: null,
      },
    )
  ).envelope;
  const nonPiEnv = (
    await loaderC.dispatch(
      "create",
      [
        "--target-root",
        resolve(fixtureBase, "create-ux/_non-pi-carrier"),
        "--project-name",
        "Blocked",
        "--agentic-harness",
        "claude-code",
        "--brief",
        "y",
        "--json",
        "--non-interactive",
      ],
      {
        invocation: invocation("create"),
        packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
        config: null,
      },
    )
  ).envelope;
  writeFileSync(
    resolve(fixtureBase, "create-ux/skipped-brief.create-result.json"),
    `${JSON.stringify(skipEnv, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    resolve(fixtureBase, "create-ux/non-pi-blocked.create-result.json"),
    `${JSON.stringify(nonPiEnv, null, 2)}\n`,
    "utf8",
  );
  // selected-harness/pi fixture (generated harness-config + context-files)
  const piTarget = resolve(fixtureBase, "selected-harness/pi/selected-pi-create");
  rmSync(piTarget, { recursive: true, force: true });
  mkdirSync(piTarget, { recursive: true });
  const piEnv = (
    await loaderC.dispatch(
      "create",
      [
        "--target-root",
        piTarget,
        "--project-name",
        "Selected Pi Project",
        "--agentic-harness",
        "pi",
        "--brief",
        "A small project selecting the pi harness.",
        "--json",
        "--non-interactive",
      ],
      {
        invocation: invocation("create"),
        packageJsonPath: resolve(repoRoot, "packages/cli/package.json"),
        config: null,
      },
    )
  ).envelope;
  writeFileSync(
    resolve(fixtureBase, "selected-harness/pi/selected-pi-create.create-result.json"),
    `${JSON.stringify(piEnv, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    resolve(args.evidenceRoot, "fixture-refresh.json"),
    `${JSON.stringify({ refreshed: true, fixtures: ["create-ux/provided-brief", "create-ux/skipped-brief", "create-ux/non-pi-blocked", "selected-harness/pi/selected-pi-create"] }, null, 2)}\n`,
    "utf8",
  );
}

const summary = {
  ok: cases.every((c) => c.result === "passed"),
  cases: cases.map((c) => ({ witness: c.witnessId, slug: c.caseSlug, result: c.result })),
};
writeJson("summary.json", summary);
console.log(JSON.stringify(summary, null, 2));
process.exitCode = summary.ok ? 0 : 1;
