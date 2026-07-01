#!/usr/bin/env node
// I-15A lane-owned witness runner. Mirrors schematic/run-cli-witnesses.mjs.
// Exercises the REAL create/import command modules through a real CommandLoader, against the REAL
// I-14A manifest/matrix, the REAL context package, and REAL on-disk generated artifacts.
// Located under packages/cli/src/commands/create/ so bare workspace imports resolve from the cli context.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { delimiter, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { createCommandLoader } from "../../command-loader/loader.js";
import { validateCliResultEnvelope } from "../../envelope/result-envelope.js";
import { createCommand } from "./index.ts";
import { importCommand } from "../import/index.ts";

// Real-boundary resolvability (W-RESOLVE-CLI-ADAPTER + W-RESOLVE-CLI-CONTEXT).
import {
  getHarnessAdapter,
  getHarnessAdapterRegistry,
  getPiAdapterCapabilityMatrix,
  isAdapterManifestSelectable,
  PI_ADAPTER_ID,
  PI_ADAPTER_CAPABILITY_SCHEMA_VERSION,
  SUPPORTED_HARNESS_ADAPTER_IDS,
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
const portableNodeRuntimeCommand = "vibe-engineer:node";
const evidenceRootDefault = resolve(
  repoRoot,
  ".vibe/work/I-15A-create-import-cli-ux-selected-harness/evidence/cli",
);
const canonicalCommand =
  "node packages/cli/src/commands/create/run-cli-witnesses.mjs --evidence-root .vibe/work/I-15A-create-import-cli-ux-selected-harness/evidence/cli";
const createGitBootstrapMessage = "chore: create vibe-engineer starter";

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
    if (ent.isDirectory() && (ent.name === "node_modules" || ent.name === ".git")) continue;
    const p = resolve(root, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(p));
    else if (ent.isFile()) out.push(p);
  }
  return out;
}
const starterLayoutPath = resolve(repoRoot, "packages/cli/templates/starter.layout.json");
const starterTemplateRoot = resolve(repoRoot, "packages/cli/templates/starter");
const repoPrettierBinary = resolve(repoRoot, "node_modules/.bin/prettier");
const architectureReviewPrettierFiles = [
  ".tooling/scripts/architecture-agent-review.mjs",
  ".vibe/verification/architecture-agent-review/prompt.md",
  ".vibe/verification/architecture-agent-review/schema.json",
  "docs/reference/starter.md",
  ".vibe/harness/selected-harness.json",
];
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
function runGeneratedPrettierCheck(targetRoot, prettierArgs, label) {
  const result = spawnSync(repoPrettierBinary, ["--check", ...prettierArgs], {
    cwd: targetRoot,
    encoding: "utf8",
    env: process.env,
  });
  assert.equal(result.error, undefined, `${label} prettier spawn failed`);
  assert.equal(
    result.status,
    0,
    `${label} prettier check failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return {
    label,
    args: ["--check", ...prettierArgs],
    stdoutSha256: sha256Buffer(Buffer.from(result.stdout, "utf8")),
    stderrSha256: sha256Buffer(Buffer.from(result.stderr, "utf8")),
  };
}

function gitOutput(targetRoot, gitArgs) {
  const result = spawnSync("git", gitArgs, {
    cwd: targetRoot,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  assert.equal(result.error, undefined, `git ${gitArgs.join(" ")} spawn failed`);
  assert.equal(result.status, 0, `git ${gitArgs.join(" ")} failed with stderr: ${result.stderr}`);
  return result.stdout.trimEnd();
}
function assertPnpmInstallKeepsLockfileClean(targetRoot) {
  const lockfilePath = resolve(targetRoot, "pnpm-lock.yaml");
  const beforeLockfileSha256 = sha256File(lockfilePath);
  const install = spawnSync("pnpm", ["install"], {
    cwd: targetRoot,
    encoding: "utf8",
    env: process.env,
    timeout: 5 * 60 * 1000,
  });
  assert.equal(install.error, undefined, `pnpm install spawn failed: ${install.error?.message ?? ""}`);
  assert.equal(
    install.status,
    0,
    `pnpm install failed\nstdout:\n${install.stdout}\nstderr:\n${install.stderr}`,
  );
  const afterLockfileSha256 = sha256File(lockfilePath);
  const statusShort = gitOutput(targetRoot, ["status", "--short"]);
  assert.equal(afterLockfileSha256, beforeLockfileSha256, "pnpm install must not rewrite pnpm-lock.yaml");
  assert.equal(statusShort, "", "pnpm install must leave the generated repository git-clean");
  return {
    command: ["pnpm", "install"],
    lockfileSha256: afterLockfileSha256,
    statusShort,
    stdoutSha256: sha256Buffer(Buffer.from(install.stdout, "utf8")),
    stderrSha256: sha256Buffer(Buffer.from(install.stderr, "utf8")),
  };
}
function assertCreateGitBootstrap(targetRoot, envelope, options = {}) {
  const data = loadResultData(envelope);
  assert.equal(data.mode, "create");
  assert.equal(typeof data.git, "object", "create result must include git metadata");
  assert.equal(
    typeof data.dependencyLockfile,
    "object",
    "create result must include generated dependency lockfile metadata",
  );
  assert.equal(data.dependencyLockfile.generated, true);
  assert.equal(data.dependencyLockfile.path, resolve(targetRoot, "pnpm-lock.yaml"));
  assert.deepEqual(data.dependencyLockfile.command, ["pnpm", "install", "--lockfile-only"]);
  assert.equal(existsSync(resolve(targetRoot, "pnpm-lock.yaml")), true);
  assert.equal(data.git.initialized, true);
  assert.equal(data.git.branch, "main");
  assert.equal(data.git.message, createGitBootstrapMessage);
  assert.equal(data.git.statusShort, "");
  assert.match(data.git.commit, /^[a-f0-9]{40}$/u);
  const gitDir = resolve(targetRoot, ".git");
  assert.equal(existsSync(gitDir), true, "fresh create target must have .git");
  assert.equal(statSync(gitDir).isDirectory(), true, ".git must be a directory");
  assert.equal(gitOutput(targetRoot, ["rev-parse", "--show-toplevel"]), targetRoot);
  const branch = gitOutput(targetRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const commit = gitOutput(targetRoot, ["rev-parse", "HEAD"]);
  const lastSubject = gitOutput(targetRoot, ["log", "-1", "--pretty=%s"]);
  const statusShort = gitOutput(targetRoot, ["status", "--short"]);
  assert.equal(branch, "main");
  assert.equal(commit, data.git.commit);
  assert.equal(lastSubject, createGitBootstrapMessage);
  assert.equal(statusShort, "");
  assert.equal(gitOutput(targetRoot, ["ls-files", "pnpm-lock.yaml"]), "pnpm-lock.yaml");
  assert.equal(gitOutput(targetRoot, ["check-ignore", ".env"]), ".env");
  let ignoredEnvStatusShort = statusShort;
  if (options.touchIgnoredEnv === true) {
    writeFileSync(resolve(targetRoot, ".env"), "LOCAL_ONLY_SECRET=ignored\n", "utf8");
    ignoredEnvStatusShort = gitOutput(targetRoot, ["status", "--short"]);
    assert.equal(ignoredEnvStatusShort, "", "ignored .env must not dirty the generated repo");
  }
  return {
    initialized: data.git.initialized,
    branch,
    commit,
    message: lastSubject,
    statusShort,
    ignoredEnvStatusShort,
  };
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
    runnerCatalog.some((entry) => entry.command === portableNodeRuntimeCommand),
    true,
    "runner catalog must use the portable verified Node runtime alias for safe command runners",
  );
  assert.equal(
    runnerCatalog.some(
      (entry) => typeof entry.command === "string" && entry.command === process.execPath,
    ),
    false,
    "runner catalog must not bake the create-time absolute Node executable",
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
const piSourceRoot = resolve(repoRoot, "examples/harness-integrations/pi/runtime-fixtures");
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

function assertTextIncludes(text, needle, label) {
  assert.equal(text.includes(needle), true, `${label} missing ${needle}`);
}

function assertTextExcludes(text, needle, label) {
  assert.equal(text.includes(needle), false, `${label} must not include ${needle}`);
}

function assertGeneratedPiSkillDiscipline(targetRoot) {
  const planSkill = readText(resolve(targetRoot, ".pi/skills/plan/SKILL.md"));
  const buildSkill = readText(resolve(targetRoot, ".pi/skills/build/SKILL.md"));
  const planPrompt = readText(resolve(targetRoot, ".pi/prompts/vibe-plan.md"));
  const buildPrompt = readText(resolve(targetRoot, ".pi/prompts/vibe-build.md"));
  const combined = `${planSkill}\n${buildSkill}\n${planPrompt}\n${buildPrompt}`;

  for (const needle of [
    "extensions.dev.vibe.plan-build-discipline",
    "schematicPlan.applicable",
    "schematicPlan.noneJustification",
    "schematicPlan.gaps",
    "verificationPlan.classifications",
    "registered",
    "build-must-register",
    "not-applicable",
    "manual-only",
    "selectedHarness.implications",
    "architecture-agent-review",
    "backend, web, or mobile",
    "no silent Pi fallback",
  ]) {
    assertTextIncludes(planSkill, needle, "generated plan skill discipline");
  }
  for (const needle of [
    "schematicsUsed",
    "empty `schematicsUsed` array is a blocking defect",
    "every planned schematic slug/id is represented",
    "updating `.vibe/registry/runner-catalog.json` directly",
    "Run every blocking Verification Delta item",
    "architecture-agent-review",
    "Evidence Packet",
    "missing blocking evidence",
    "prose-only summaries",
    "verificationRuns[].evidencePacketRef",
  ]) {
    assertTextIncludes(buildSkill, needle, "generated build skill discipline");
  }
  for (const needle of [
    "Do not invent verification-runner or runner-catalog-entry schematics",
    "do not add extra deterministic architecture/code-standard runners",
  ]) {
    assertTextIncludes(planPrompt, needle, "generated plan prompt discipline");
    assertTextIncludes(buildPrompt, needle, "generated build prompt discipline");
  }
  for (const needle of ["schematicSlug: verification-runner", "schematicSlug: runner-catalog-entry"]) {
    assertTextExcludes(combined, needle, "generated pi discipline assets");
  }
  return {
    planDiscipline: true,
    buildDiscipline: true,
    architectureAgentReviewRequired: true,
    selectedHarnessImplications: true,
  };
}
function assertPiHarnessAssets(targetRoot, envelope = null) {
  const descriptors = selectCreatePiAssets();
  const expectedFamilies = [...new Set(descriptors.map((asset) => asset.familyId))].sort();
  assert.deepEqual(expectedFamilies, [...CREATE_PI_ASSET_FAMILIES].sort());
  assert.equal(descriptors.length, 12);
  const fileRecords = [];
  for (const descriptor of descriptors) {
    const targetPath = resolve(targetRoot, ...descriptor.path.split("/"));
    const sourcePath = resolve(piSourceRoot, ...descriptor.path.split("/"));
    const templatePath = resolve(piTemplateRoot, ...descriptor.path.split("/"));
    assert.equal(targetPath.startsWith(`${targetRoot}${sep}`), true);
    assert.equal(sourcePath.startsWith(`${piSourceRoot}${sep}`), true);
    assert.equal(templatePath.startsWith(`${piTemplateRoot}${sep}`), true);
    assert.equal(existsSync(targetPath), true, `missing pi asset ${descriptor.path}`);
    assert.equal(existsSync(sourcePath), true, `missing source pi fixture ${descriptor.path}`);
    assert.equal(existsSync(templatePath), true, `missing shipped pi template ${descriptor.path}`);
    const targetContent = readText(targetPath);
    const sourceContent = readText(sourcePath);
    const templateContent = readText(templatePath);
    assert.equal(targetContent.length > 0, true, `empty pi asset ${descriptor.path}`);
    assert.equal(
      templateContent,
      sourceContent,
      `shipped pi template ${descriptor.path} differs from source runtime fixture`,
    );
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
      sourceSha256: sha256File(sourcePath),
      templateSha256: sha256File(templatePath),
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
  const discipline = assertGeneratedPiSkillDiscipline(targetRoot);
  return {
    expectedCount: descriptors.length,
    skillCount: descriptors.filter((asset) => asset.kind === "skill").length,
    promptCount: descriptors.filter((asset) => asset.kind === "prompt-template").length,
    families: expectedFamilies,
    discipline,
    sourceCopyFreshCreateMatched: true,
    sha256: fileRecords,
  };
}
function assertNoPiHarnessAssets(targetRoot) {
  assert.equal(
    existsSync(resolve(targetRoot, ".pi")),
    false,
    "non-Pi harness must not receive .pi assets",
  );
  return { piDirectoryPresent: false };
}

const expectedContextFilesByHarness = {
  pi: ["AGENTS.md", "CLAUDE.md"],
  "claude-code": ["CLAUDE.md"],
  codex: ["AGENTS.md"],
};

function assertSelectedHarnessSurfaces(targetRoot, envelope, harness) {
  const data = loadResultData(envelope);
  assert.equal(data.selectedHarness, harness);
  const expectedContextFiles = expectedContextFilesByHarness[harness];
  assert.deepEqual(
    data.generatedFiles.contextFiles.written.map((item) => item.kind).sort(),
    [...expectedContextFiles].sort(),
  );
  for (const contextFile of ["AGENTS.md", "CLAUDE.md"]) {
    assert.equal(
      existsSync(resolve(targetRoot, contextFile)),
      expectedContextFiles.includes(contextFile),
      `${harness} context file expectation failed for ${contextFile}`,
    );
  }
  const metadataPath = resolve(targetRoot, ".vibe/harness/selected-harness.json");
  const readmePath = resolve(targetRoot, ".vibe/harness/README.md");
  const handoffPath = resolve(targetRoot, ".vibe/harness/handoff.md");
  assert.equal(data.generatedFiles.selectedHarness.metadata, metadataPath);
  assert.equal(data.generatedFiles.selectedHarness.readme, readmePath);
  assert.equal(data.generatedFiles.selectedHarness.handoff, handoffPath);
  assert.equal(existsSync(metadataPath), true, `${harness} selected-harness metadata missing`);
  assert.equal(existsSync(readmePath), true, `${harness} selected-harness readme missing`);
  assert.equal(existsSync(handoffPath), true, `${harness} selected-harness handoff missing`);
  const metadata = readJsonFile(metadataPath);
  assert.equal(metadata.schemaVersion, "vibe-engineer.selected-harness.v1");
  assert.equal(metadata.adapter.id, harness);
  assert.equal(metadata.adapter.noFallbackToPi, true);
  assert.equal(metadata.config.noSilentFallback, true);
  assert.deepEqual(metadata.assetWriter.contextFiles, expectedContextFiles);
  assert.equal(metadata.assertions.noFallbackToPi, true);
  assert.equal(metadata.runtimePrerequisiteDiagnostic.noFallbackToPi, true);
  assert.equal(
    metadata.runtimePrerequisiteDiagnostic.unavailableRuntimeBehavior,
    "blocked-missing-prerequisite",
  );
  const expectedArchitectureRunner = data.mode === "create";
  assert.equal(metadata.verificationRunnerInvocation.runnerImplemented, expectedArchitectureRunner);
  assert.equal(
    metadata.verificationRunnerInvocation.unavailableRuntimeBehavior,
    "blocked-missing-prerequisite",
  );
  if (expectedArchitectureRunner) {
    assert.equal(
      metadata.verificationRunnerInvocation.architectureAgentRunnerId,
      "architecture-agent-review",
    );
  }
  const readme = readText(readmePath);
  assert.equal(readme.includes("No silent Pi fallback"), true);
  assert.equal(readme.includes("Missing binary"), true);
  assert.equal(readme.includes("Security and trust"), true);
  const handoff = readText(handoffPath);
  for (const step of ["task", "plan", "build", "ship"]) {
    assert.equal(handoff.includes(`- ${step}:`), true, `${harness} handoff missing ${step}`);
  }
  if (harness === "pi") {
    assert.deepEqual(metadata.assetWriter.nativeAssetFamilies.sort(), [
      "pi-prompt-templates",
      "pi-skill-files",
    ]);
  } else {
    assert.deepEqual(metadata.assetWriter.nativeAssetFamilies, []);
    assert.equal(metadata.assertions.nonPiNativeProjectAssetPolicy.startsWith("blocked:"), true);
    assert.equal(
      existsSync(resolve(targetRoot, ".claude")),
      false,
      `${harness} should not get .claude assets`,
    );
    assert.equal(
      existsSync(resolve(targetRoot, ".codex")),
      false,
      `${harness} should not get .codex assets`,
    );
    assert.equal(
      metadata.assetWriter.blockedAssetFamilies.length > 0,
      true,
      `${harness} blocked asset families must be explicit`,
    );
  }
  return {
    adapterId: metadata.adapter.id,
    contextFiles: metadata.assetWriter.contextFiles,
    blockedAssetFamilies: metadata.assetWriter.blockedAssetFamilies,
    runnerImplemented: metadata.verificationRunnerInvocation.runnerImplemented,
  };
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function assertGeneratedStarterScope(targetRoot, envelope, expectedScope) {
  const data = loadResultData(envelope);
  assert.equal(data.mode, "create");
  assert.equal(data.starterScope.id, expectedScope);
  assert.equal(data.generatedFiles.starterTemplate.scope.id, expectedScope);
  const rootPkg = readJsonFile(resolve(targetRoot, "package.json"));
  assert.equal(rootPkg.vibeEngineer.starterScope.id, expectedScope);
  const config = readJsonFile(resolve(targetRoot, "vibe-engineer.config.json"));
  const docs = readText(resolve(targetRoot, "docs/reference/starter.md"));
  const gitignore = readText(resolve(targetRoot, ".gitignore"));
  const prettierignore = readText(resolve(targetRoot, ".prettierignore"));
  const omittedFiles = new Set(data.generatedFiles.starterTemplate.omittedFiles);
  assert.equal(docs.includes("Generated starter QA and scope"), true);
  assert.equal(docs.includes("pnpm approve-builds"), true);
  assert.equal(docs.includes("NestJS + tsx dependency injection"), true);
  assert.equal(docs.includes("Prisma migration safety"), true);
  for (const ignoreNeedle of [".data/", "*.sqlite", ".vibe/evidence/**", ".vibe/work/**"]) {
    assert.equal(gitignore.includes(ignoreNeedle), true, `.gitignore missing ${ignoreNeedle}`);
  }
  for (const ignoreNeedle of [".data", "*.sqlite", ".vibe/evidence/**", ".vibe/work/**"]) {
    assert.equal(
      prettierignore.includes(ignoreNeedle),
      true,
      `.prettierignore missing ${ignoreNeedle}`,
    );
  }

  if (expectedScope === "default") {
    assert.deepEqual(rootPkg.vibeEngineer.appNames, ["api", "web", "mobile"]);
    assert.deepEqual(rootPkg.vibeEngineer.packageNames, [
      "domain",
      "contracts",
      "api-client",
      "config",
      "testing",
      "ui",
    ]);
    assert.equal(existsSync(resolve(targetRoot, "apps/api")), true);
    assert.equal(existsSync(resolve(targetRoot, "apps/web")), true);
    assert.equal(existsSync(resolve(targetRoot, "apps/mobile")), true);
    assert.equal(hasOwn(rootPkg.scripts, "dev:api"), true);
    assert.equal(hasOwn(rootPkg.scripts, "dev:mobile"), true);
    assert.equal(hasOwn(rootPkg.scripts, "db:migrate"), true);
    assert.equal(hasOwn(config.verification, "mobileE2E"), true);
    assert.equal(data.starterScope.includesApi, true);
    assert.equal(data.starterScope.includesMobile, true);
    assert.equal(data.starterScope.includesPrisma, true);
    return { scope: expectedScope, omittedFiles: omittedFiles.size };
  }

  assert.equal(existsSync(resolve(targetRoot, "apps/mobile")), false);
  assert.equal(hasOwn(rootPkg.scripts, "dev:mobile"), false);
  assert.equal(hasOwn(rootPkg.scripts, "dev:mobile:ios"), false);
  assert.equal(hasOwn(rootPkg.scripts, "dev:mobile:android"), false);
  assert.equal(hasOwn(config.verification, "mobileE2E"), false);
  assert.equal(existsSync(resolve(targetRoot, "packages/ui/src/native")), false);
  assert.equal(omittedFiles.has("apps/mobile/package.json"), true);
  assert.equal(omittedFiles.has("packages/ui/src/native/index.ts"), true);
  for (const packageName of data.starterScope.packages) {
    const packageJsonPath = resolve(targetRoot, "packages", packageName, "package.json");
    if (!existsSync(packageJsonPath)) continue;
    const packageJson = readJsonFile(packageJsonPath);
    assert.equal(
      hasOwn(packageJson, "react-native"),
      false,
      `${packageName} kept react-native entry`,
    );
  }

  if (expectedScope === "no-mobile") {
    assert.deepEqual(rootPkg.vibeEngineer.appNames, ["api", "web"]);
    assert.equal(existsSync(resolve(targetRoot, "apps/api")), true);
    assert.equal(existsSync(resolve(targetRoot, "apps/web")), true);
    assert.equal(hasOwn(rootPkg.scripts, "dev:api"), true);
    assert.equal(hasOwn(rootPkg.scripts, "db:migrate"), true);
    assert.equal(data.starterScope.includesApi, true);
    assert.equal(data.starterScope.includesMobile, false);
    assert.equal(data.starterScope.includesPrisma, true);
    assert.equal(data.setupGuidance.nestTsxDependencyInjection.applies, true);
    assert.equal(data.setupGuidance.prismaMigrationDoctor.applies, true);
    return { scope: expectedScope, omittedFiles: omittedFiles.size };
  }

  assert.equal(expectedScope, "web-only");
  assert.deepEqual(rootPkg.vibeEngineer.appNames, ["web"]);
  assert.deepEqual(rootPkg.vibeEngineer.packageNames, ["config", "ui"]);
  assert.equal(existsSync(resolve(targetRoot, "apps/api")), false);
  assert.equal(existsSync(resolve(targetRoot, "apps/web")), true);
  assert.equal(existsSync(resolve(targetRoot, "apps/web/src/routes/golden-records")), false);
  assert.equal(existsSync(resolve(targetRoot, "packages/api-client")), false);
  assert.equal(existsSync(resolve(targetRoot, "packages/contracts")), false);
  assert.equal(existsSync(resolve(targetRoot, "packages/domain")), false);
  assert.equal(existsSync(resolve(targetRoot, "packages/testing")), false);
  assert.equal(existsSync(resolve(targetRoot, ".tooling/dev-services/docker-compose.json")), false);
  assert.equal(hasOwn(rootPkg.scripts, "dev:api"), false);
  assert.equal(hasOwn(rootPkg.scripts, "db:migrate"), false);
  assert.equal(data.starterScope.includesApi, false);
  assert.equal(data.starterScope.includesMobile, false);
  assert.equal(data.starterScope.includesPrisma, false);
  assert.equal(data.setupGuidance.nestTsxDependencyInjection.applies, false);
  assert.equal(data.setupGuidance.prismaMigrationDoctor.applies, false);
  const webPkg = readJsonFile(resolve(targetRoot, "apps/web/package.json"));
  assert.equal(hasOwn(webPkg.dependencies, `@${data.project.slug}/api-client`), false);
  const envText = readText(resolve(targetRoot, ".env"));
  assert.equal(envText.includes("WEB_PORT"), true);
  assert.equal(envText.includes("DATABASE_URL"), false);
  return { scope: expectedScope, omittedFiles: omittedFiles.size };
}

function assertStarterHarnessSurfaces(targetRoot, envelope, harness) {
  const data = loadResultData(envelope);
  if (data.mode !== "create") {
    assert.equal(data.generatedFiles.runnerCatalog, null);
    assert.equal(data.generatedFiles.starterPresetManifest, null);
    assert.equal(data.generatedFiles.starterReference, null);
    return { mode: data.mode, starterHarnessMetadata: "not-applicable" };
  }
  const catalogPath = resolve(targetRoot, ".vibe/registry/runner-catalog.json");
  const presetManifestPath = resolve(
    targetRoot,
    ".vibe/generated/nest-react-rn-preset/manifest.json",
  );
  const starterReferencePath = resolve(targetRoot, "docs/reference/starter.md");
  assert.equal(data.generatedFiles.runnerCatalog, catalogPath);
  assert.equal(data.generatedFiles.starterPresetManifest, presetManifestPath);
  assert.equal(data.generatedFiles.starterReference, starterReferencePath);
  const catalog = readJsonFile(catalogPath);
  assert.equal(Array.isArray(catalog), true);
  assert.equal(catalog.length > 0, true);
  for (const entry of catalog) {
    assert.equal(entry.vibeEngineerHarness.adapterId, harness);
    assert.equal(entry.vibeEngineerHarness.noFallbackToPi, true);
    assert.equal(entry.vibeEngineerHarness.runnerImplemented, true);
    assert.equal(
      entry.vibeEngineerHarness.architectureAgentRunner.runnerId,
      "architecture-agent-review",
    );
    assert.equal(
      entry.vibeEngineerHarness.liveInvocation.unavailableRuntimeBehavior,
      "blocked-missing-prerequisite",
    );
  }
  const architectureRunners = catalog.filter((entry) => entry.id === "architecture-agent-review");
  assert.equal(architectureRunners.length, 1, "exactly one architecture agent runner is generated");
  const architectureRunner = architectureRunners[0];
  assert.equal(architectureRunner.kind, "command");
  assert.equal(architectureRunner.runnerType, "agent");
  assert.equal(architectureRunner.agentRunner, true);
  assert.equal(architectureRunner.layer, "advisory_review");
  assert.equal(architectureRunner.layerEquivalent, "architecture_review");
  assert.equal(architectureRunner.command, portableNodeRuntimeCommand);
  assert.deepEqual(architectureRunner.requiredItemIds, ["architecture-agent-review"]);
  assert.equal(architectureRunner.architectureReview.noFallbackToPi, true);
  const recommendedCommand =
    architectureRunner.vibeEngineerHarness.liveInvocation.recommendedCommand;
  assert.equal(Array.isArray(recommendedCommand), true);
  if (harness === "claude-code") {
    const schemaFlagIndex = recommendedCommand.indexOf("--json-schema");
    assert.notEqual(schemaFlagIndex, -1, "Claude architecture runner must pass --json-schema");
    assert.equal(
      recommendedCommand[schemaFlagIndex + 1],
      "<schema-json>",
      "Claude --json-schema must receive schema JSON, not a file path placeholder",
    );
  }
  if (harness === "codex") {
    assert.equal(
      recommendedCommand.includes("--ask-for-approval"),
      false,
      "Codex exec runner must not use unsupported --ask-for-approval",
    );
    const approvalIndex = recommendedCommand.indexOf('approval_policy="never"');
    assert.notEqual(approvalIndex, -1, "Codex runner must set approval_policy=never via -c");
    assert.equal(recommendedCommand[approvalIndex - 1], "-c");
    assert.equal(recommendedCommand.includes("--sandbox"), true);
    assert.equal(recommendedCommand.includes("--output-schema"), true);
    assert.equal(recommendedCommand.includes("--output-last-message"), true);
  }
  assert.equal(
    architectureRunner.architectureReview.checkedBoundaries.backend,
    data.starterScope.includesApi,
  );
  assert.equal(
    architectureRunner.architectureReview.checkedBoundaries.web,
    data.starterScope.includesWeb,
  );
  assert.equal(
    architectureRunner.architectureReview.checkedBoundaries.mobile,
    data.starterScope.includesMobile,
  );
  assert.equal(
    catalog.some(
      (entry) =>
        entry.id !== "architecture-agent-review" &&
        /architecture|code-standard|code_standard/u.test(String(entry.id)),
    ),
    false,
    "no extra deterministic architecture/code-standard runners are generated",
  );
  assert.equal(
    existsSync(resolve(targetRoot, ".tooling/scripts/architecture-agent-review.mjs")),
    true,
  );
  assert.equal(
    existsSync(resolve(targetRoot, ".vibe/verification/architecture-agent-review/schema.json")),
    true,
  );
  assert.equal(
    existsSync(resolve(targetRoot, ".vibe/verification/architecture-agent-review/prompt.md")),
    true,
  );
  const architectureSchema = readJsonFile(
    resolve(targetRoot, ".vibe/verification/architecture-agent-review/schema.json"),
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(architectureSchema, "allOf"),
    false,
    "generated schema must stay compatible with Codex/OpenAI structured output subset",
  );
  assert.equal(architectureSchema.properties.schemaVersion.type, "string");
  assert.equal(architectureSchema.properties.status.type, "string");
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      architectureSchema.properties.reviewedBoundaries,
      "uniqueItems",
    ),
    false,
  );
  const presetManifest = readJsonFile(presetManifestPath);
  assert.equal(presetManifest.layout.agenticHarness, harness);
  assert.equal(presetManifest.vibeEngineerHarness.adapterId, harness);
  assert.equal(presetManifest.vibeEngineerHarness.noFallbackToPi, true);
  assert.equal(presetManifest.architectureAgentReview.runnerId, "architecture-agent-review");
  assert.equal(presetManifest.architectureAgentReview.runnerImplemented, true);
  const starterReference = readText(starterReferencePath);
  assert.equal(starterReference.includes("<!-- vibe-engineer:selected-harness:start -->"), true);
  assert.equal(
    starterReference.includes("<!-- vibe-engineer:architecture-agent-review:start -->"),
    true,
  );
  assert.equal(starterReference.includes(`\`${harness}\``), true);
  assert.equal(starterReference.includes("Trust boundary:"), true);
  assert.equal(starterReference.includes("no silent Pi fallback"), true);
  assert.equal(starterReference.includes("architecture-agent-review"), true);
  return {
    catalogEntries: catalog.length,
    architectureRunnerCount: architectureRunners.length,
    presetHarness: presetManifest.layout.agenticHarness,
    starterReferenceMarked: true,
  };
}

function writeFakeHarnessBinary(binDir, binary, mode) {
  mkdirSync(binDir, { recursive: true });
  const target = resolve(binDir, binary);
  const review = {
    schemaVersion: "vibe-engineer.architecture-agent-review.v1",
    status: mode === "failed" ? "failed" : "passed",
    summary: mode === "failed" ? "Fake architecture finding." : "Fake architecture review passed.",
    findings:
      mode === "failed"
        ? [{ path: "apps/web/src/app/app.tsx", reason: "Fake boundary issue.", boundary: "web" }]
        : [],
  };
  writeFileSync(
    target,
    `#!/usr/bin/env node\nconst mode = ${JSON.stringify(mode)};\nif (process.argv.includes("--version")) { console.log("${binary} fake 0.0.0"); process.exit(0); }\nif (mode === "runtime-unavailable") { console.log(JSON.stringify({ type: "result", is_error: true, result: "Claude Fable 5 is currently unavailable." })); process.exit(1); }\nif (mode === "auth-missing") { console.error("Reading additional input from stdin..."); console.log(JSON.stringify({ type: "error", message: "Not authenticated: run codex login." })); process.exit(1); }\nif (mode === "unparseable") { console.log("not-json"); process.exit(0); }\nconsole.log(${JSON.stringify(JSON.stringify(review))});\n`,
    "utf8",
  );
  chmodSync(target, 0o755);
  return target;
}

function runArchitectureAgentReview(targetRoot, envPath) {
  const scriptPath = resolve(targetRoot, ".tooling/scripts/architecture-agent-review.mjs");
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: targetRoot,
    encoding: "utf8",
    env: {
      PATH: envPath,
      ...(process.env.HOME ? { HOME: process.env.HOME } : {}),
      ...(process.env.XDG_CONFIG_HOME ? { XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME } : {}),
    },
  });
  const evidencePath = resolve(targetRoot, ".vibe/evidence/architecture-agent-review/review.json");
  assert.equal(existsSync(evidencePath), true, "architecture review evidence must be written");
  const evidence = readJsonFile(evidencePath);
  return { result, evidence, evidencePath };
}

function assertArchitectureRunnerEvidence(evidence, expected) {
  assert.equal(evidence.schemaVersion, "vibe-engineer.architecture-agent-review.v1");
  assert.equal(evidence.runnerId, "architecture-agent-review");
  assert.equal(evidence.status, expected.status);
  assert.equal(evidence.selectedHarness.adapterId, expected.harness ?? "pi");
  assert.equal(evidence.noFallbackToPi, true);
  assert.deepEqual(evidence.reviewedBoundaries, expected.reviewedBoundaries);
  for (const omitted of expected.omittedBoundaries ?? []) {
    assert.equal(evidence.omittedBoundaries.includes(omitted), true);
  }
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
  assert.deepEqual([...SUPPORTED_HARNESS_ADAPTER_IDS], ["pi", "claude-code", "codex"]);
  const adapterRegistry = getHarnessAdapterRegistry();
  assert.equal(adapterRegistry.schemaVersion, "vibe-harness-adapter-registry/v1");
  for (const adapterId of SUPPORTED_HARNESS_ADAPTER_IDS) {
    const adapter = getHarnessAdapter(adapterId);
    assert.equal(typeof adapter, "object", `missing HarnessAdapter for ${adapterId}`);
    assert.equal(adapter.createImportSelectable, true);
    assert.equal(adapter.assetWriter.noFallbackToPi, true);
  }
  // I-15A-owned Pi manifest families are exactly context-files + harness-config, both ready.
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
    supportedHarnesses: [...SUPPORTED_HARNESS_ADAPTER_IDS],
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
  const gitBootstrap = assertCreateGitBootstrap(r.targetRoot, r.envelope);
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
  const selectedHarnessSurfaces = assertSelectedHarnessSurfaces(r.targetRoot, r.envelope, "pi");
  const starterHarnessSurfaces = assertStarterHarnessSurfaces(r.targetRoot, r.envelope, "pi");
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
    selectedHarnessSurfaces,
    starterHarnessSurfaces,
    git: {
      initialized: gitBootstrap.initialized,
      branch: gitBootstrap.branch,
      message: gitBootstrap.message,
      statusShort: gitBootstrap.statusShort,
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
  assert.equal(Object.prototype.hasOwnProperty.call(data, "git"), false);
  assert.equal(existsSync(resolve(r.targetRoot, ".git")), false);
  assert.equal(existsSync(resolve(r.targetRoot, "vibe-engineer.config.json")), true);
  assert.equal(existsSync(resolve(r.targetRoot, "AGENTS.md")), true);
  const selectedHarnessSurfaces = assertSelectedHarnessSurfaces(r.targetRoot, r.envelope, "pi");
  const starterHarnessSurfaces = assertStarterHarnessSurfaces(r.targetRoot, r.envelope, "pi");
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
    selectedHarnessSurfaces,
    starterHarnessSurfaces,
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

// --- W-HARNESS-BOUNDARY (supported harnesses accepted; unsupported harnesses reject with no Pi fallback) ---
await writeCase(
  8,
  "W-HARNESS-BOUNDARY",
  "supported-harnesses-accepted-unsupported-rejected",
  async () => {
    const accepted = {};
    for (const harness of ["pi", "claude-code", "codex"]) {
      const createResult = await dispatchCreate(`w-harness-create-${harness}`, [
        "--project-name",
        `Harness ${harness}`,
        "--agentic-harness",
        harness,
        "--brief",
        `Project using ${harness}`,
      ]);
      assert.equal(validateCliResultEnvelope(createResult.envelope).ok, true);
      assert.equal(createResult.envelope.status, "success", `${harness} create did not succeed`);
      const createData = loadResultData(createResult.envelope);
      assert.equal(createData.selectedHarness, harness);
      assert.equal(createData.harnessConfig.agenticHarness, harness);
      assert.equal(
        readJsonFile(resolve(createResult.targetRoot, "vibe-engineer.config.json")).agenticHarness,
        harness,
      );
      const createSelectedSurfaces = assertSelectedHarnessSurfaces(
        createResult.targetRoot,
        createResult.envelope,
        harness,
      );
      const createStarterSurfaces = assertStarterHarnessSurfaces(
        createResult.targetRoot,
        createResult.envelope,
        harness,
      );
      const importResult = await dispatchImport(`w-harness-import-${harness}`, [
        "--project-name",
        `Harness Import ${harness}`,
        "--agentic-harness",
        harness,
      ]);
      assert.equal(validateCliResultEnvelope(importResult.envelope).ok, true);
      assert.equal(importResult.envelope.status, "success", `${harness} import did not succeed`);
      const importData = loadResultData(importResult.envelope);
      assert.equal(importData.selectedHarness, harness);
      assert.equal(importData.harnessConfig.agenticHarness, harness);
      const importSelectedSurfaces = assertSelectedHarnessSurfaces(
        importResult.targetRoot,
        importResult.envelope,
        harness,
      );
      const importStarterSurfaces = assertStarterHarnessSurfaces(
        importResult.targetRoot,
        importResult.envelope,
        harness,
      );
      if (harness === "pi") {
        assertPiHarnessAssets(createResult.targetRoot, createResult.envelope);
        assertPiHarnessAssets(importResult.targetRoot, importResult.envelope);
      } else {
        assertNoPiHarnessAssets(createResult.targetRoot);
        assertNoPiHarnessAssets(importResult.targetRoot);
        assert.equal(createData.harnessAssets.noFallbackToPi, true);
        assert.equal(createData.harnessAssets.skillCount, 0);
        assert.equal(createData.harnessAssets.promptCount, 0);
        assert.equal(createData.manifest.adapterContract.blockedFamilies.length > 0, true);
      }
      accepted[harness] = {
        create: createResult.envelope.status,
        import: importResult.envelope.status,
        contextFiles: createData.generatedFiles.contextFiles.written.map((item) => item.kind),
        createSelectedSurfaces,
        createStarterSurfaces,
        importSelectedSurfaces,
        importStarterSurfaces,
      };
    }

    const rejected = {};
    for (const harness of ["opencode", "later-integrations", "totally-unknown"]) {
      const createResult = await dispatchCreate(`w-harness-reject-create-${harness}`, [
        "--project-name",
        "Rejected",
        "--agentic-harness",
        harness,
        "--brief",
        "y",
      ]);
      assert.equal(validateCliResultEnvelope(createResult.envelope).ok, true);
      assert.equal(createResult.envelope.status, "blocked", `${harness} create did not block`);
      assert.equal(createResult.envelope.payload.data.supported.join(","), "pi,claude-code,codex");
      assertNoPiHarnessAssets(createResult.targetRoot);
      const importResult = await dispatchImport(`w-harness-reject-import-${harness}`, [
        "--project-name",
        "Rejected Import",
        "--agentic-harness",
        harness,
      ]);
      assert.equal(validateCliResultEnvelope(importResult.envelope).ok, true);
      assert.equal(importResult.envelope.status, "blocked", `${harness} import did not block`);
      assert.equal(importResult.envelope.payload.data.supported.join(","), "pi,claude-code,codex");
      assertNoPiHarnessAssets(importResult.targetRoot);
      rejected[harness] = {
        create: createResult.envelope.status,
        import: importResult.envelope.status,
      };
    }
    return { witness: "W-HARNESS-BOUNDARY", accepted, rejected };
  },
);

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

// --- W-CREATE-GIT-BOOTSTRAP (fresh create initializes a clean local git repository) ---
await writeCase(29, "W-CREATE-GIT-BOOTSTRAP", "create-git-bootstrap", async () => {
  const r = await dispatchCreate("w-create-git-bootstrap", [
    "--project-name",
    "Git Bootstrap",
    "--agentic-harness",
    "pi",
    "--brief",
    "Generated project should start with a clean local git repository.",
  ]);
  assert.equal(validateCliResultEnvelope(r.envelope).ok, true);
  assert.equal(r.envelope.status, "success");
  const gitBootstrap = assertCreateGitBootstrap(r.targetRoot, r.envelope, {
    touchIgnoredEnv: true,
  });
  const installClean = assertPnpmInstallKeepsLockfileClean(r.targetRoot);
  return { witness: "W-CREATE-GIT-BOOTSTRAP", ...gitBootstrap, installClean };
});

// --- W-STARTER-SCOPE-MODES (default/no-mobile/web-only across supported harnesses) ---
await writeCase(30, "W-STARTER-SCOPE-MODES", "starter-scope-modes", async () => {
  const matrix = {};
  for (const harness of ["pi", "claude-code", "codex"]) {
    matrix[harness] = {};
    for (const [scope, flags] of [
      ["default", []],
      ["no-mobile", ["--no-mobile"]],
      ["web-only", ["--web-only"]],
    ]) {
      const slug = `w-scope-${harness}-${scope}`;
      const r = await dispatchCreate(slug, [
        "--project-name",
        `Scope ${harness} ${scope}`,
        "--agentic-harness",
        harness,
        ...flags,
      ]);
      assert.equal(validateCliResultEnvelope(r.envelope).ok, true);
      assert.equal(r.envelope.status, "success", `${harness}/${scope} create failed`);
      assertSelectedHarnessSurfaces(r.targetRoot, r.envelope, harness);
      assertStarterHarnessSurfaces(r.targetRoot, r.envelope, harness);
      if (harness === "pi") assertPiHarnessAssets(r.targetRoot, r.envelope);
      else assertNoPiHarnessAssets(r.targetRoot);
      const git = assertCreateGitBootstrap(r.targetRoot, r.envelope);
      const targetedPrettier = runGeneratedPrettierCheck(
        r.targetRoot,
        architectureReviewPrettierFiles,
        `${harness}/${scope} generated architecture assets`,
      );
      const qualityQuickFormatting =
        harness === "pi"
          ? runGeneratedPrettierCheck(r.targetRoot, ["."], `${harness}/${scope} quality:quick format leg`)
          : null;
      matrix[harness][scope] = {
        ...assertGeneratedStarterScope(r.targetRoot, r.envelope, scope),
        gitBranch: git.branch,
        targetedPrettier,
        qualityQuickFormatting,
      };
    }
  }

  const invalid = await dispatchCreate("w-scope-conflict", [
    "--project-name",
    "Scope Conflict",
    "--agentic-harness",
    "pi",
    "--no-mobile",
    "--web-only",
  ]);
  assert.notEqual(invalid.envelope.status, "success");
  assert.equal(invalid.envelope.errors[0].classification, "invalid_invocation");
  return { witness: "W-STARTER-SCOPE-MODES", matrix, conflictStatus: invalid.envelope.status };
});

// --- W-ARCHITECTURE-AGENT-RUNNER (single runner, scope filtering, fail-closed runtime diagnostics) ---
await writeCase(31, "W-ARCHITECTURE-AGENT-RUNNER", "architecture-agent-runner", async () => {
  const defaultCreate = await dispatchCreate("w-architecture-default", [
    "--project-name",
    "Architecture Default",
    "--agentic-harness",
    "pi",
  ]);
  assert.equal(defaultCreate.envelope.status, "success");
  assertStarterHarnessSurfaces(defaultCreate.targetRoot, defaultCreate.envelope, "pi");

  const emptyBin = resolve(args.evidenceRoot, "fake-bin-empty");
  mkdirSync(emptyBin, { recursive: true });
  const missing = runArchitectureAgentReview(defaultCreate.targetRoot, emptyBin);
  assert.equal(missing.result.status, 2, missing.result.stderr);
  assert.equal(missing.evidence.status, "blocked");
  assert.equal(missing.evidence.diagnostics[0].code, "HARNESS_CLI_MISSING");
  assert.equal(missing.evidence.findings[0].path, ".vibe/harness/selected-harness.json");
  assert.equal(missing.evidence.noFallbackToPi, true);

  const fakePassBin = resolve(args.evidenceRoot, "fake-bin-pass");
  writeFakeHarnessBinary(fakePassBin, "pi", "passed");
  const pass = runArchitectureAgentReview(
    defaultCreate.targetRoot,
    `${fakePassBin}${delimiter}${process.env.PATH ?? ""}`,
  );
  assert.equal(pass.result.status, 0, pass.result.stderr);
  assertArchitectureRunnerEvidence(pass.evidence, {
    status: "passed",
    reviewedBoundaries: ["backend", "web", "mobile"],
    omittedBoundaries: [],
  });
  assert.equal(pass.evidence.diff.mode, "git-initial-create-commit");

  const noMobileCreate = await dispatchCreate("w-architecture-no-mobile", [
    "--project-name",
    "Architecture No Mobile",
    "--agentic-harness",
    "pi",
    "--no-mobile",
  ]);
  const noMobile = runArchitectureAgentReview(
    noMobileCreate.targetRoot,
    `${fakePassBin}${delimiter}${process.env.PATH ?? ""}`,
  );
  assert.equal(noMobile.result.status, 0, noMobile.result.stderr);
  assertArchitectureRunnerEvidence(noMobile.evidence, {
    status: "passed",
    reviewedBoundaries: ["backend", "web"],
    omittedBoundaries: ["mobile"],
  });

  const webOnlyCreate = await dispatchCreate("w-architecture-web-only", [
    "--project-name",
    "Architecture Web Only",
    "--agentic-harness",
    "pi",
    "--web-only",
  ]);
  const webOnly = runArchitectureAgentReview(
    webOnlyCreate.targetRoot,
    `${fakePassBin}${delimiter}${process.env.PATH ?? ""}`,
  );
  assert.equal(webOnly.result.status, 0, webOnly.result.stderr);
  assertArchitectureRunnerEvidence(webOnly.evidence, {
    status: "passed",
    reviewedBoundaries: ["web"],
    omittedBoundaries: ["backend", "mobile"],
  });

  const fakeBadBin = resolve(args.evidenceRoot, "fake-bin-unparseable");
  writeFakeHarnessBinary(fakeBadBin, "pi", "unparseable");
  const unparseable = runArchitectureAgentReview(
    defaultCreate.targetRoot,
    `${fakeBadBin}${delimiter}${process.env.PATH ?? ""}`,
  );
  assert.equal(unparseable.result.status, 2, unparseable.result.stderr);
  assert.equal(unparseable.evidence.status, "blocked");
  assert.equal(unparseable.evidence.diagnostics[0].code, "HARNESS_OUTPUT_UNPARSEABLE");

  const claudeCreate = await dispatchCreate("w-architecture-claude", [
    "--project-name",
    "Architecture Claude",
    "--agentic-harness",
    "claude-code",
  ]);
  assertStarterHarnessSurfaces(claudeCreate.targetRoot, claudeCreate.envelope, "claude-code");
  const fakeClaudeBin = resolve(args.evidenceRoot, "fake-bin-claude-runtime");
  writeFakeHarnessBinary(fakeClaudeBin, "claude", "runtime-unavailable");
  const claudeRuntime = runArchitectureAgentReview(
    claudeCreate.targetRoot,
    `${fakeClaudeBin}${delimiter}${process.env.PATH ?? ""}`,
  );
  assert.equal(claudeRuntime.result.status, 2, claudeRuntime.result.stderr);
  assert.equal(claudeRuntime.evidence.status, "blocked");
  assert.equal(claudeRuntime.evidence.diagnostics[0].code, "HARNESS_RUNTIME_UNAVAILABLE");
  assert.match(claudeRuntime.evidence.diagnostics[0].reason, /currently unavailable/u);
  assert.equal(
    claudeRuntime.evidence.diagnostics[0].reason.includes(
      "selected harness invocation exited non-zero",
    ),
    false,
  );

  const codexCreate = await dispatchCreate("w-architecture-codex", [
    "--project-name",
    "Architecture Codex",
    "--agentic-harness",
    "codex",
  ]);
  assertStarterHarnessSurfaces(codexCreate.targetRoot, codexCreate.envelope, "codex");
  const fakeCodexBin = resolve(args.evidenceRoot, "fake-bin-codex-auth");
  writeFakeHarnessBinary(fakeCodexBin, "codex", "auth-missing");
  const codexAuth = runArchitectureAgentReview(
    codexCreate.targetRoot,
    `${fakeCodexBin}${delimiter}${process.env.PATH ?? ""}`,
  );
  assert.equal(codexAuth.result.status, 2, codexAuth.result.stderr);
  assert.equal(codexAuth.evidence.status, "blocked");
  assert.equal(codexAuth.evidence.diagnostics[0].code, "HARNESS_AUTH_MISSING");
  assert.match(codexAuth.evidence.diagnostics[0].reason, /codex login/u);
  assert.notEqual(
    codexAuth.evidence.diagnostics[0].reason,
    "Reading additional input from stdin...",
  );

  return {
    witness: "W-ARCHITECTURE-AGENT-RUNNER",
    runnerId: "architecture-agent-review",
    missingRuntimeStatus: missing.evidence.status,
    passStatus: pass.evidence.status,
    defaultBoundaries: pass.evidence.reviewedBoundaries,
    noMobileBoundaries: noMobile.evidence.reviewedBoundaries,
    webOnlyBoundaries: webOnly.evidence.reviewedBoundaries,
    unparseableStatus: unparseable.evidence.status,
    claudeRuntimeDiagnostic: claudeRuntime.evidence.diagnostics[0].code,
    codexAuthDiagnostic: codexAuth.evidence.diagnostics[0].code,
    noFallbackToPi: true,
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
        "opencode",
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
