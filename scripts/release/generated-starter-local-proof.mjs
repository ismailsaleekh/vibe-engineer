#!/usr/bin/env node
// WP-08 generated-starter local proof.
// Real boundary: fresh build -> npm pack -> clean external npm install -> installed .bin create
// -> generated starter pnpm install/typecheck/lint/format/test/build/quality, with positive
// and negative assertion witnesses. No publish and no git mutation.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath as fsRealpath,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import url from "node:url";

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..");
const MONOREPO_REAL = await fsRealpath(REPO_ROOT);
const DEFAULT_ROOT = path.join(tmpdir(), `wp08-generated-starter-local-proof-${process.pid}`);

const REQUIRED_SKILLS = Object.freeze([
  ".pi/skills/brainstorm/SKILL.md",
  ".pi/skills/grill-me/SKILL.md",
  ".pi/skills/task/SKILL.md",
  ".pi/skills/plan/SKILL.md",
  ".pi/skills/build/SKILL.md",
  ".pi/skills/ship/SKILL.md",
]);
const REQUIRED_PROMPTS = Object.freeze([
  ".pi/prompts/vibe-brainstorm.md",
  ".pi/prompts/vibe-grill-me.md",
  ".pi/prompts/vibe-task.md",
  ".pi/prompts/vibe-plan.md",
  ".pi/prompts/vibe-build.md",
  ".pi/prompts/vibe-ship.md",
]);
const REQUIRED_PI_FILES = Object.freeze([...REQUIRED_SKILLS, ...REQUIRED_PROMPTS]);
const REQUIRED_STACK_DIRS = Object.freeze([
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
  ".github/workflows",
  ".vibe/context",
  ".vibe/work",
  ".vibe/evidence",
  ".vibe/registry",
  "docs",
]);
const STARTER_SOURCE_DIRS = Object.freeze([
  "apps/api",
  "apps/web",
  "apps/mobile",
  "packages/domain",
  "packages/contracts",
  "packages/api-client",
  "packages/config",
  "packages/testing",
  "packages/ui",
]);
const PRIVATE_HARNESS_PACKAGES = Object.freeze([
  "@vibe-engineer/observability",
  "@vibe-engineer/registry",
  "@vibe-engineer/mechanical-gates",
  "@vibe-engineer/contracts",
  "@vibe-engineer/standards",
  "@vibe-engineer/testing",
  "@vibe-engineer/preset-nest-react-rn",
  "@vibe-engineer/preset-typescript",
  "@vibe-engineer/infra-pulumi",
]);
const DEP_BUCKETS = Object.freeze([
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
]);
const PUBLIC_COMMANDS = Object.freeze([
  "config",
  "create",
  "doctor",
  "help",
  "import",
  "schematic",
  "security",
  "verify",
  "version",
]);
const SKILL_NAMES = Object.freeze(["brainstorm", "grill-me", "task", "plan", "build", "ship"]);
const GENERATED_PROJECT_SLUG = "wp08-generated-starter";
const GENERATED_PROJECT_SCOPE = `@${GENERATED_PROJECT_SLUG}`;

class ProofFailure extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = "ProofFailure";
    this.code = code;
    this.detail = detail;
  }
}

function parseArgs(argv) {
  const parsed = {
    out: DEFAULT_ROOT,
    evidenceDir: null,
    summaryOut: null,
    keep: false,
    unknown: [],
  };
  const valueFlags = new Map([
    ["--out", "out"],
    ["--evidence-dir", "evidenceDir"],
    ["--summary-out", "summaryOut"],
  ]);
  const tokens = argv.slice(2);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "--keep") {
      parsed.keep = true;
      continue;
    }
    const eq = token.startsWith("--") ? token.indexOf("=") : -1;
    if (eq > 2) {
      const name = token.slice(0, eq);
      const value = token.slice(eq + 1);
      if (valueFlags.has(name)) {
        parsed[valueFlags.get(name)] = value;
        continue;
      }
      parsed.unknown.push(token);
      continue;
    }
    if (valueFlags.has(token)) {
      const value = tokens[i + 1];
      if (value === undefined) {
        parsed.unknown.push(token);
        continue;
      }
      parsed[valueFlags.get(token)] = value;
      i += 1;
      continue;
    }
    parsed.unknown.push(token);
  }
  return parsed;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
async function realpathMaybe(p) {
  try {
    return await fsRealpath(p);
  } catch {
    return null;
  }
}
function slash(p) {
  return p.split(path.sep).join("/");
}
function assertCondition(condition, code, message, detail = {}) {
  if (!condition) throw new ProofFailure(code, message, detail);
}
function isUnder(parent, child) {
  const rel = path.relative(parent, child);
  return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}
async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
async function sha256(filePath) {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

async function walkFiles(root, { includeNodeModules = false } = {}) {
  const out = [];
  async function visit(dir) {
    if (!includeNodeModules && path.basename(dir) === "node_modules") return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(p);
      else if (entry.isFile() || entry.isSymbolicLink()) out.push(p);
    }
  }
  await visit(root);
  return out.sort();
}

function baseEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.NODE_PATH;
  delete env.NODE_OPTIONS;
  return env;
}
function evidenceEnv(env) {
  return {
    NODE_PATH: Object.prototype.hasOwnProperty.call(env, "NODE_PATH") ? env.NODE_PATH : "<absent>",
    NODE_OPTIONS: Object.prototype.hasOwnProperty.call(env, "NODE_OPTIONS")
      ? env.NODE_OPTIONS
      : "<absent>",
    TURBO_CACHE_DIR: env.TURBO_CACHE_DIR ?? null,
    COREPACK_HOME: env.COREPACK_HOME ?? null,
    PNPM_HOME: env.PNPM_HOME ?? null,
    HOME: env.HOME ?? null,
  };
}

function createRunner(summary, evidenceDir) {
  let index = 0;
  return async function runStep(id, cmd, args, options = {}) {
    index += 1;
    const stepDir = path.join(evidenceDir, "commands", `${String(index).padStart(2, "0")}-${id}`);
    await mkdir(stepDir, { recursive: true });
    const cwd = options.cwd ? path.resolve(options.cwd) : REPO_ROOT;
    const env = options.env ?? baseEnv();
    const record = {
      id,
      cmd,
      args,
      cwd,
      env: evidenceEnv(env),
      startedAt: new Date().toISOString(),
    };
    await writeJson(path.join(stepDir, "command.json"), record);
    const result = await new Promise((resolve) => {
      const child = spawn(cmd, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"], shell: false });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString("utf8");
      });
      child.on("error", (error) => resolve({ exitCode: -1, stdout, stderr, error: String(error) }));
      child.on("close", (code) => resolve({ exitCode: code ?? -1, stdout, stderr, error: null }));
    });
    const endedAt = new Date().toISOString();
    await writeFile(path.join(stepDir, "stdout.txt"), result.stdout, "utf8");
    await writeFile(path.join(stepDir, "stderr.txt"), result.stderr, "utf8");
    await writeJson(path.join(stepDir, "result.json"), {
      ...record,
      endedAt,
      exitCode: result.exitCode,
      error: result.error,
      stdoutPath: path.join(stepDir, "stdout.txt"),
      stderrPath: path.join(stepDir, "stderr.txt"),
    });
    const summaryRecord = {
      id,
      cmd,
      args,
      cwd,
      env: evidenceEnv(env),
      exitCode: result.exitCode,
      error: result.error,
      evidenceDir: stepDir,
    };
    summary.commands.push(summaryRecord);
    return { ...result, evidenceDir: stepDir, ok: result.exitCode === 0 };
  };
}

function parseEnvelopeFromStdout(stdout) {
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const jsonLine = [...lines].reverse().find((line) => line.startsWith("{") && line.endsWith("}"));
  if (!jsonLine) return null;
  return JSON.parse(jsonLine);
}
function payloadData(envelope) {
  return envelope?.payload?.data ?? null;
}

async function assertCreateProvenance({
  createEnvelope,
  externalInstallRoot,
  installedPackageRoot,
}) {
  const data = payloadData(createEnvelope);
  assertCondition(
    createEnvelope?.status === "success" &&
      createEnvelope?.payload?.kind === "create_result" &&
      data?.ok === true,
    "WP08_CREATE_RESULT_INVALID",
    "create result envelope is not a successful create_result",
    { status: createEnvelope?.status, kind: createEnvelope?.payload?.kind, dataOk: data?.ok },
  );
  const starter = data.generatedFiles?.starterTemplate;
  assertCondition(
    starter && typeof starter.templateRoot === "string" && typeof starter.layoutPath === "string",
    "WP08_CREATE_TEMPLATE_SOURCE_LEAK",
    "create result lacks installed starter-template provenance",
    { starter },
  );
  const templateRoot = path.resolve(starter.templateRoot);
  const layoutPath = path.resolve(starter.layoutPath);
  const expectedStarterRoot = path.join(installedPackageRoot, "templates", "starter");
  const expectedLayout = path.join(installedPackageRoot, "templates", "starter.layout.json");
  const sourcePaths = [templateRoot, layoutPath];
  for (const sourcePath of sourcePaths) {
    assertCondition(
      !isUnder(MONOREPO_REAL, sourcePath),
      "WP08_SOURCE_PATH_LEAK",
      "create provenance points back to the monorepo",
      { sourcePath, monorepo: MONOREPO_REAL },
    );
    assertCondition(
      isUnder(externalInstallRoot, sourcePath),
      "WP08_SOURCE_PATH_LEAK",
      "create provenance is outside the external install",
      { sourcePath, externalInstallRoot },
    );
  }
  assertCondition(
    templateRoot === expectedStarterRoot,
    "WP08_CREATE_TEMPLATE_SOURCE_LEAK",
    "starter templateRoot did not resolve to installed package templates/starter",
    { templateRoot, expectedStarterRoot },
  );
  assertCondition(
    layoutPath === expectedLayout,
    "WP08_CREATE_TEMPLATE_SOURCE_LEAK",
    "starter layoutPath did not resolve to installed package templates/starter.layout.json",
    { layoutPath, expectedLayout },
  );
  const piAssets = Array.isArray(data.generatedFiles?.piAssets) ? data.generatedFiles.piAssets : [];
  assertCondition(
    piAssets.length === 12,
    "WP08_PI_ASSET_MISSING",
    "create result does not list 12 pi assets",
    { count: piAssets.length },
  );
  const expectedPiRoot = path.join(
    installedPackageRoot,
    "templates",
    "pi",
    "runtime-fixtures",
    ".pi",
  );
  for (const asset of piAssets) {
    assertCondition(
      typeof asset.path === "string",
      "WP08_CREATE_TEMPLATE_SOURCE_LEAK",
      "pi asset lacks manifest/source path",
      { asset },
    );
    if (path.isAbsolute(asset.path)) {
      const source = path.resolve(asset.path);
      assertCondition(
        isUnder(expectedPiRoot, source),
        "WP08_CREATE_TEMPLATE_SOURCE_LEAK",
        "absolute pi asset source is not under installed runtime fixture .pi root",
        { source, expectedPiRoot },
      );
      assertCondition(
        !isUnder(MONOREPO_REAL, source),
        "WP08_SOURCE_PATH_LEAK",
        "absolute pi asset source points back to monorepo",
        { source },
      );
    } else {
      assertCondition(
        REQUIRED_PI_FILES.includes(asset.path),
        "WP08_CREATE_TEMPLATE_SOURCE_LEAK",
        "relative pi asset manifest path is not one of the selected shipped pi assets",
        { path: asset.path, expected: REQUIRED_PI_FILES },
      );
    }
  }
  return {
    templateRoot,
    layoutPath,
    expectedPiRoot,
    piAssetCount: piAssets.length,
    piAssetPathMode: piAssets.every(
      (asset) => typeof asset.path === "string" && !path.isAbsolute(asset.path),
    )
      ? "relative-manifest-paths"
      : "absolute-source-paths",
  };
}

async function assertPiAssets({ starterRoot, installedPackageRoot }) {
  const skillsRoot = path.join(starterRoot, ".pi", "skills");
  const promptsRoot = path.join(starterRoot, ".pi", "prompts");
  const skills = (await walkFiles(skillsRoot))
    .map((p) => slash(path.relative(starterRoot, p)))
    .sort();
  const prompts = (await walkFiles(promptsRoot))
    .map((p) => slash(path.relative(starterRoot, p)))
    .sort();
  assertCondition(
    JSON.stringify(skills) === JSON.stringify([...REQUIRED_SKILLS].sort()),
    "WP08_PI_ASSET_MISSING",
    "generated skills are not exactly the required six",
    { skills, expected: REQUIRED_SKILLS },
  );
  assertCondition(
    JSON.stringify(prompts) === JSON.stringify([...REQUIRED_PROMPTS].sort()),
    "WP08_PI_ASSET_MISSING",
    "generated prompts are not exactly the required six",
    { prompts, expected: REQUIRED_PROMPTS },
  );
  assertCondition(
    !(await exists(path.join(starterRoot, ".pi", "extensions"))),
    "WP08_PI_EXTENSION_FORBIDDEN",
    ".pi/extensions exists in generated starter",
    { path: path.join(starterRoot, ".pi", "extensions") },
  );
  assertCondition(
    !(await exists(path.join(starterRoot, ".vibe", "harness", "pi-runtime.json"))),
    "WP08_PI_RUNTIME_FIXTURE_FORBIDDEN",
    "pi-runtime.json fixture was copied",
    {},
  );
  assertCondition(
    !(await exists(path.join(starterRoot, ".vibe", "harness", "pi-runtime-assets.json"))),
    "WP08_PI_RUNTIME_FIXTURE_FORBIDDEN",
    "pi-runtime-assets.json fixture was copied",
    {},
  );
  const hashes = [];
  for (const rel of REQUIRED_PI_FILES) {
    const generated = path.join(starterRoot, rel);
    const shipped = path.join(installedPackageRoot, "templates", "pi", "runtime-fixtures", rel);
    const generatedHash = await sha256(generated);
    const shippedHash = await sha256(shipped);
    assertCondition(
      generatedHash === shippedHash,
      "WP08_PI_ASSET_HASH_MISMATCH",
      "generated pi asset differs from installed shipped template",
      { rel, generatedHash, shippedHash },
    );
    hashes.push({ rel, sha256: generatedHash });
  }
  return { skillFiles: skills, promptFiles: prompts, byteIdentical: hashes };
}

async function assertStarterShape(starterRoot) {
  for (const rel of REQUIRED_STACK_DIRS) {
    const s = await stat(path.join(starterRoot, rel)).catch(() => null);
    assertCondition(
      s?.isDirectory(),
      "WP08_STARTER_SHAPE_MISSING",
      "required starter directory missing",
      { rel },
    );
  }
  const rootManifest = await readJson(path.join(starterRoot, "package.json"));
  assertCondition(
    rootManifest.name === `${GENERATED_PROJECT_SCOPE}/workspace`,
    "WP08_PROJECT_NAME_INJECTION_INVALID",
    "root package name is not the generated project workspace scope",
    { actual: rootManifest.name, expected: `${GENERATED_PROJECT_SCOPE}/workspace` },
  );
  const gitignore = await readFile(path.join(starterRoot, ".gitignore"), "utf8");
  for (const requiredIgnore of ["node_modules/", "dist/", ".turbo/", ".vibe/evidence/ci/"]) {
    assertCondition(
      gitignore.includes(requiredIgnore),
      "WP08_GENERATED_GITIGNORE_INVALID",
      "generated .gitignore is missing a required local artifact ignore",
      { requiredIgnore },
    );
  }
  const qualityWorkflowPath = path.join(starterRoot, ".github", "workflows", "quality.yml");
  const qualityWorkflow = await readFile(qualityWorkflowPath, "utf8");
  for (const requiredSnippet of [
    "pnpm exec vibe-engineer help --json",
    "quality:quick",
    "permissions:\n  contents: read",
    "timeout-minutes: 10",
  ]) {
    assertCondition(
      qualityWorkflow.includes(requiredSnippet),
      "WP08_GENERATED_CI_WORKFLOW_INVALID",
      "generated quality workflow is missing a required quick-gate snippet",
      { requiredSnippet, path: ".github/workflows/quality.yml" },
    );
  }
  for (const forbiddenSnippet of [
    "pulumi up",
    "pulumi destroy",
    "maestro test",
    "detox test",
    "playwright test",
    "workflow_dispatch",
  ]) {
    assertCondition(
      !qualityWorkflow.includes(forbiddenSnippet),
      "WP08_GENERATED_CI_WORKFLOW_INVALID",
      "generated quality workflow includes a forbidden default-CI proof/mutation",
      { forbiddenSnippet, path: ".github/workflows/quality.yml" },
    );
  }
  const packageFiles = (await walkFiles(starterRoot)).filter(
    (p) => path.basename(p) === "package.json" && !p.includes(`${path.sep}node_modules${path.sep}`),
  );
  const packageNames = [];
  for (const file of packageFiles) {
    const rel = slash(path.relative(starterRoot, file));
    const manifest = await readJson(file);
    if (rel !== "package.json") {
      assertCondition(
        typeof manifest.name === "string" && manifest.name.startsWith(`${GENERATED_PROJECT_SCOPE}/`),
        "WP08_INTERNAL_PACKAGE_IDENTITY_CHANGED",
        "internal package name is not under the generated project scope",
        { rel, name: manifest.name, expectedScope: GENERATED_PROJECT_SCOPE },
      );
    }
    packageNames.push({ rel, name: manifest.name });
  }
  const symlinks = [];
  for (const file of await walkFiles(starterRoot)) {
    const ls = await lstat(file);
    if (!ls.isSymbolicLink()) continue;
    const target = await readlink(file);
    const resolved = await realpathMaybe(file);
    const pointsToMonorepo = resolved !== null && isUnder(MONOREPO_REAL, resolved);
    assertCondition(
      !pointsToMonorepo,
      "WP08_SYMLINK_MONOREPO_LEAK",
      "generated starter symlink points into the monorepo",
      { file, target, resolved },
    );
    symlinks.push({ rel: slash(path.relative(starterRoot, file)), target, resolved });
  }
  return { requiredDirs: REQUIRED_STACK_DIRS, packageNames, symlinks };
}

async function listPackageJsonFiles(starterRoot) {
  return (await walkFiles(starterRoot)).filter(
    (p) => path.basename(p) === "package.json" && !p.includes(`${path.sep}node_modules${path.sep}`),
  );
}

async function assertDependencyAudit(starterRoot) {
  const packageFiles = await listPackageJsonFiles(starterRoot);
  const internalPackages = new Map();
  for (const file of packageFiles) {
    const manifest = await readJson(file);
    if (typeof manifest.name === "string")
      internalPackages.set(
        manifest.name,
        slash(path.relative(starterRoot, path.dirname(file))) || ".",
      );
  }
  const findings = [];
  for (const file of packageFiles) {
    const manifest = await readJson(file);
    const manifestRel = slash(path.relative(starterRoot, file));
    for (const bucket of DEP_BUCKETS) {
      const deps = manifest[bucket];
      if (!deps || typeof deps !== "object" || Array.isArray(deps)) continue;
      for (const [name, specValue] of Object.entries(deps)) {
        const spec = typeof specValue === "string" ? specValue : "";
        if (PRIVATE_HARNESS_PACKAGES.includes(name))
          throw new ProofFailure(
            "WP08_PRIVATE_DEPENDENCY_LEAK",
            "private harness package appears in generated manifest",
            { manifestRel, bucket, name, spec },
          );
        const internalStarter = name.startsWith(`${GENERATED_PROJECT_SCOPE}/`);
        if (internalStarter) {
          assertCondition(
            internalPackages.has(name),
            "WP08_INTERNAL_WORKSPACE_DEPENDENCY_UNRESOLVED",
            "internal starter dependency has no local generated package",
            { manifestRel, bucket, name, spec },
          );
          findings.push({ manifestRel, bucket, name, spec, classification: "internal-starter" });
          continue;
        }
        if (
          spec.startsWith("workspace:") ||
          spec.startsWith("link:") ||
          spec.startsWith("file:") ||
          path.isAbsolute(spec) ||
          spec.includes(MONOREPO_REAL)
        ) {
          throw new ProofFailure(
            "WP08_WORKSPACE_OR_PATH_DEPENDENCY_LEAK",
            "generated manifest contains workspace/link/file/absolute dependency outside internal starter graph",
            { manifestRel, bucket, name, spec },
          );
        }
        const runtimeBucket =
          bucket === "dependencies" ||
          bucket === "peerDependencies" ||
          bucket === "optionalDependencies";
        if (runtimeBucket && (name === "vibe-engineer" || name.startsWith("@vibe-engineer/"))) {
          throw new ProofFailure(
            "WP08_RUNTIME_HARNESS_DEPENDENCY_LEAK",
            "runtime dependency on harness package is forbidden",
            { manifestRel, bucket, name, spec },
          );
        }
        if (name === "vibe-engineer" && bucket !== "devDependencies") {
          throw new ProofFailure(
            "WP08_RUNTIME_HARNESS_DEPENDENCY_LEAK",
            "vibe-engineer may only appear as a devDependency",
            { manifestRel, bucket, name, spec },
          );
        }
        findings.push({ manifestRel, bucket, name, spec, classification: "ok" });
      }
    }
  }
  const rootManifest = await readJson(path.join(starterRoot, "package.json"));
  const rootDevDependencies =
    rootManifest.devDependencies &&
    typeof rootManifest.devDependencies === "object" &&
    !Array.isArray(rootManifest.devDependencies)
      ? rootManifest.devDependencies
      : {};
  const projectLocalRange = rootDevDependencies["vibe-engineer"];
  assertCondition(
    typeof projectLocalRange === "string" && projectLocalRange.length > 0,
    "WP08_PROJECT_LOCAL_CLI_MISSING",
    "generated starter root package.json must include vibe-engineer as a project-local devDependency",
    { actual: projectLocalRange ?? null },
  );
  assertCondition(
    !projectLocalRange.startsWith("workspace:") &&
      !projectLocalRange.startsWith("file:") &&
      !projectLocalRange.startsWith("link:") &&
      !path.isAbsolute(projectLocalRange),
    "WP08_WORKSPACE_OR_PATH_DEPENDENCY_LEAK",
    "generated starter vibe-engineer devDependency must resolve through npm-style version metadata, not workspace/path linkage",
    { spec: projectLocalRange },
  );
  return {
    packageJsonCount: packageFiles.length,
    projectLocalVibeEngineer: projectLocalRange,
    dependencyEntries: findings,
  };
}

async function injectReleaseLocalTarballOverrides(starterRoot, packSummary) {
  const rootPackagePath = path.join(starterRoot, "package.json");
  const manifest = await readJson(rootPackagePath);
  const pnpm =
    manifest.pnpm && typeof manifest.pnpm === "object" && !Array.isArray(manifest.pnpm)
      ? manifest.pnpm
      : {};
  const overrides =
    pnpm.overrides && typeof pnpm.overrides === "object" && !Array.isArray(pnpm.overrides)
      ? pnpm.overrides
      : {};
  const added = [];
  for (const pkg of packSummary.packages ?? []) {
    if (typeof pkg.name !== "string" || typeof pkg.tarball !== "string") continue;
    const tarballPath = path.join(packSummary.tarballDir, pkg.tarball);
    const relativeTarballPath = slash(path.relative(starterRoot, tarballPath));
    overrides[pkg.name] = `file:${relativeTarballPath}`;
    added.push({ name: pkg.name, tarballPath, spec: overrides[pkg.name] });
  }
  pnpm.overrides = overrides;
  manifest.pnpm = pnpm;
  await writeFile(rootPackagePath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return {
    packageJson: slash(path.relative(starterRoot, rootPackagePath)),
    reason:
      "release-local prepublish install proof: resolve the just-packed 0.1.x tarballs before they exist on the public npm registry",
    overrideCount: added.length,
    overrides: added,
  };
}

function globLikeMatches(rel, patterns) {
  return patterns.some((pattern) => {
    if (pattern.endsWith("/**")) return rel.startsWith(pattern.slice(0, -3));
    return rel === pattern;
  });
}

async function assertNoCopiedHarnessInternals(starterRoot) {
  const generatedFiles = (await walkFiles(starterRoot)).filter((p) =>
    /^(apps|packages)\/.+\/src\/.+\.(ts|tsx|js|jsx)$/.test(slash(path.relative(starterRoot, p))),
  );
  const repoFiles = (await walkFiles(path.join(REPO_ROOT, "packages"))).filter((p) => {
    const rel = slash(path.relative(REPO_ROOT, p));
    if (!/\.([cm]?ts|tsx|js|jsx)$/.test(rel)) return false;
    if (!rel.includes("/src/")) return false;
    return !globLikeMatches(rel, [
      "packages/cli/templates/starter/**",
      "packages/cli/templates/pi/**",
    ]);
  });
  const harnessByHash = new Map();
  for (const file of repoFiles) {
    const hash = await sha256(file);
    if (!harnessByHash.has(hash)) harnessByHash.set(hash, []);
    harnessByHash.get(hash).push(slash(path.relative(REPO_ROOT, file)));
  }
  const collisions = [];
  for (const file of generatedFiles) {
    const hash = await sha256(file);
    const matches = harnessByHash.get(hash) ?? [];
    if (matches.length > 0)
      collisions.push({
        generated: slash(path.relative(starterRoot, file)),
        matches,
        sha256: hash,
      });
  }
  assertCondition(
    collisions.length === 0,
    "WP08_COPIED_HARNESS_INTERNALS",
    "generated starter source is byte-identical to harness implementation source",
    { collisions },
  );
  return {
    generatedSourceFilesChecked: generatedFiles.length,
    harnessSourceFilesChecked: repoFiles.length,
    collisions,
  };
}

async function assertNoFalseLiveClaims(starterRoot) {
  const files = (await walkFiles(starterRoot)).filter(
    (p) => !p.includes(`${path.sep}node_modules${path.sep}`) && /\.(json|md|txt|yml|yaml)$/.test(p),
  );
  const claims = [];
  function inspectJson(value, trail, fileRel) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => inspectJson(item, `${trail}[${index}]`, fileRel));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        const childTrail = trail ? `${trail}.${key}` : key;
        const keyLower = key.toLowerCase();
        if (
          (keyLower.includes("livepiruntime") ||
            keyLower.includes("piruntime") ||
            keyLower.includes("livepi")) &&
          typeof child === "string" &&
          /^(live|green|passed|proven|success)$/i.test(child)
        ) {
          claims.push({ fileRel, trail: childTrail, value: child });
        }
        inspectJson(child, childTrail, fileRel);
      }
    }
  }
  for (const file of files) {
    const fileRel = slash(path.relative(starterRoot, file));
    const text = await readFile(file, "utf8");
    if (file.endsWith(".json")) {
      try {
        inspectJson(JSON.parse(text), "", fileRel);
      } catch {
        /* non-load-bearing text scan below catches injected docs */
      }
    }
    if (
      /live\s+pi\s+runtime(?:\s+proof)?\s*(?::|is)?\s*(green|passed|proven|success|loaded|discovered)/i.test(
        text,
      )
    ) {
      claims.push({ fileRel, trail: "text", value: "live pi runtime proof claim" });
    }
  }
  assertCondition(
    claims.length === 0,
    "WP08_FALSE_LIVE_CLAIM",
    "generated starter claims live pi runtime proof",
    { claims },
  );
  return { scannedFiles: files.length, livePiRuntime: "pending-live" };
}

async function assertNonVacuity(starterRoot) {
  const counts = [];
  for (const rel of STARTER_SOURCE_DIRS) {
    const srcRoot = path.join(starterRoot, rel, "src");
    const files = (await walkFiles(srcRoot)).filter((p) => /\.(ts|tsx)$/.test(p));
    assertCondition(
      files.length > 0,
      "WP08_VACUOUS_SOURCE_COVERAGE",
      "starter source directory has no .ts/.tsx files",
      { rel, count: files.length },
    );
    counts.push({
      rel,
      tsTsxCount: files.length,
      tsxCount: files.filter((p) => p.endsWith(".tsx")).length,
    });
  }
  const tsconfigCoverage = [];
  for (const rel of STARTER_SOURCE_DIRS) {
    const tsconfigPath = path.join(starterRoot, rel, "tsconfig.json");
    const config = await readJson(tsconfigPath);
    const include = Array.isArray(config.include) ? config.include : [];
    const hasTsx = (await walkFiles(path.join(starterRoot, rel, "src"))).some((p) =>
      p.endsWith(".tsx"),
    );
    const includesTs = include.some(
      (item) =>
        typeof item === "string" &&
        (/(^|\/)src\/(?:\*\*)?\/?.*\.ts$/.test(item) ||
          item === "src" ||
          item === "src/**" ||
          item === "src/**/*"),
    );
    const includesTsx = include.some(
      (item) =>
        typeof item === "string" &&
        (/(^|\/)src\/(?:\*\*)?\/?.*\.tsx$/.test(item) ||
          item === "src" ||
          item === "src/**" ||
          item === "src/**/*"),
    );
    assertCondition(
      includesTs,
      "WP08_VACUOUS_TSC_COVERAGE",
      "tsconfig include does not cover TypeScript source",
      { rel, include },
    );
    assertCondition(
      !hasTsx || includesTsx,
      "WP08_VACUOUS_TSC_COVERAGE",
      "tsconfig include does not cover .tsx source",
      { rel, include, hasTsx },
    );
    tsconfigCoverage.push({ rel, include, hasTsx, includesTs, includesTsx });
  }
  const rootManifest = await readJson(path.join(starterRoot, "package.json"));
  const scripts = rootManifest.scripts ?? {};
  const typecheckScript = typeof scripts.typecheck === "string" ? scripts.typecheck : "";
  const buildScript = typeof scripts.build === "string" ? scripts.build : "";
  const testScript = typeof scripts["test:unit"] === "string" ? scripts["test:unit"] : "";
  assertCondition(
    typecheckScript.includes("turbo run typecheck") || typecheckScript.includes("tsc"),
    "WP08_VACUOUS_SCRIPT",
    "typecheck script does not invoke the TypeScript workspace graph",
    { script: scripts.typecheck },
  );
  assertCondition(
    buildScript.includes("turbo run build") ||
      buildScript.includes("tsc") ||
      buildScript.includes("vite build"),
    "WP08_VACUOUS_SCRIPT",
    "build script does not invoke a package build graph",
    { script: scripts.build },
  );
  assertCondition(
    testScript.includes("turbo run test:unit") ||
      testScript.includes("tsx --test") ||
      testScript.includes("node --test"),
    "WP08_VACUOUS_SCRIPT",
    "test:unit script does not invoke a test runner",
    { script: scripts["test:unit"] },
  );
  const packageScripts = [];
  for (const manifestPath of await listPackageJsonFiles(starterRoot)) {
    const rel = slash(path.relative(starterRoot, manifestPath));
    if (rel === "package.json") continue;
    const manifest = await readJson(manifestPath);
    const packageScriptSet = manifest.scripts ?? {};
    assertCondition(
      typeof packageScriptSet.typecheck === "string" && packageScriptSet.typecheck.includes("tsc"),
      "WP08_VACUOUS_SCRIPT",
      "package typecheck script does not invoke tsc",
      { rel, script: packageScriptSet.typecheck },
    );
    assertCondition(
      typeof packageScriptSet.build === "string" &&
        (packageScriptSet.build.includes("tsc") || packageScriptSet.build.includes("vite build")),
      "WP08_VACUOUS_SCRIPT",
      "package build script does not invoke a compiler/build tool",
      { rel, script: packageScriptSet.build },
    );
    assertCondition(
      typeof packageScriptSet["test:unit"] === "string" &&
        packageScriptSet["test:unit"].includes("tsx --test"),
      "WP08_VACUOUS_SCRIPT",
      "package test:unit script does not invoke the TS test runner",
      { rel, script: packageScriptSet["test:unit"] },
    );
    packageScripts.push({
      rel,
      typecheck: packageScriptSet.typecheck,
      build: packageScriptSet.build,
      testUnit: packageScriptSet["test:unit"],
    });
  }
  const tests = (await walkFiles(starterRoot)).filter(
    (p) =>
      /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(p) &&
      !p.includes(`${path.sep}node_modules${path.sep}`),
  );
  assertCondition(
    tests.length > 0,
    "WP08_VACUOUS_TEST_DISCOVERY",
    "no unit test/spec files are present in the generated starter",
    {},
  );
  return {
    sourceCounts: counts,
    tsconfigCoverage,
    rootScripts: { typecheck: typecheckScript, build: buildScript, testUnit: testScript },
    packageScripts,
    testsDiscoveredByPattern: tests.map((p) => slash(path.relative(starterRoot, p))),
    testCoverageRisk: "tests-present",
  };
}

async function injectDependency(starterRoot, depName, depSpec, bucket = "dependencies") {
  const manifestPath = path.join(starterRoot, "package.json");
  const manifest = await readJson(manifestPath);
  manifest[bucket] =
    manifest[bucket] && typeof manifest[bucket] === "object" && !Array.isArray(manifest[bucket])
      ? manifest[bucket]
      : {};
  manifest[bucket][depName] = depSpec;
  await writeJson(manifestPath, manifest);
}

async function removeDependency(starterRoot, depName, bucket = "devDependencies") {
  const manifestPath = path.join(starterRoot, "package.json");
  const manifest = await readJson(manifestPath);
  if (
    manifest[bucket] &&
    typeof manifest[bucket] === "object" &&
    !Array.isArray(manifest[bucket])
  ) {
    delete manifest[bucket][depName];
  }
  await writeJson(manifestPath, manifest);
}

async function runNegative(summary, name, controlledPath, checker, expectedCode) {
  let actualCode = null;
  let detail = null;
  try {
    await checker();
  } catch (error) {
    actualCode = error instanceof ProofFailure ? error.code : "UNEXPECTED_THROW";
    detail = error instanceof ProofFailure ? error.detail : { error: String(error) };
  }
  const passed = actualCode === expectedCode;
  const record = {
    name,
    controlledPath,
    checker: checker.name || "anonymous-checker",
    expectedCode,
    actualCode,
    passed,
    detail,
  };
  summary.negativeWitnesses.push(record);
  if (!passed)
    throw new ProofFailure(
      "WP08_NEGATIVE_WITNESS_FAILED",
      "negative witness did not fail with the expected code",
      record,
    );
  return record;
}

async function copyStarter(starterRoot, destination) {
  await rm(destination, { recursive: true, force: true });
  await cp(starterRoot, destination, { recursive: true, dereference: false });
}

async function assertInstalledToolsResolveFromStarter(starterRoot, runStep, env) {
  const tools = ["tsc", "eslint", "prettier", "turbo", "tsx", "vibe-engineer"];
  const starterReal = await fsRealpath(starterRoot);
  const results = [];
  for (const tool of tools) {
    const r = await runStep(`tool-${tool}`, "pnpm", ["exec", "which", tool], {
      cwd: starterRoot,
      env,
    });
    const resolved = r.stdout.trim().split("\n").pop() ?? "";
    const resolvedPath = resolved
      ? path.isAbsolute(resolved)
        ? resolved
        : path.resolve(starterRoot, resolved)
      : "";
    const real = resolvedPath ? await realpathMaybe(resolvedPath) : null;
    const underStarter = real !== null && isUnder(starterReal, real);
    const underTempStore =
      real !== null && (real.includes("/pnpm-store/") || real.includes("/node_modules/.pnpm/"));
    results.push({
      tool,
      exitCode: r.exitCode,
      resolved,
      resolvedPath,
      real,
      starterReal,
      underStarter,
      underTempStore,
    });
    assertCondition(
      r.exitCode === 0,
      "WP08_TOOL_RESOLUTION_FAILED",
      "pnpm exec could not resolve required tool",
      { tool, stdout: r.stdout, stderr: r.stderr },
    );
    assertCondition(
      (underStarter || underTempStore) && !isUnder(MONOREPO_REAL, real),
      "WP08_GLOBAL_TOOL_LEAK",
      "required starter tool resolved outside generated install/temp package-manager store",
      { tool, resolved, resolvedPath, real, starterRoot, starterReal, monorepo: MONOREPO_REAL },
    );
  }
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.unknown.length > 0)
    throw new ProofFailure("WP08_BAD_ARGS", "unknown arguments", { unknown: args.unknown });
  const outRoot = path.resolve(args.out);
  const evidenceDir = path.resolve(args.evidenceDir ?? path.join(outRoot, "evidence"));
  const summaryOut = path.resolve(args.summaryOut ?? path.join(outRoot, "summary.json"));
  await rm(outRoot, { recursive: true, force: true });
  await mkdir(evidenceDir, { recursive: true });
  const outRealParent = await fsRealpath(path.dirname(outRoot)).catch(() => path.dirname(outRoot));
  assertCondition(
    !isUnder(MONOREPO_REAL, outRealParent),
    "WP08_OUT_UNDER_MONOREPO",
    "WP-08 proof root must be outside the monorepo",
    { outRoot, outRealParent, monorepo: MONOREPO_REAL },
  );

  const summary = {
    schemaVersion: "wp08.generated-starter-local-proof/v1",
    generatedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    monorepoReal: MONOREPO_REAL,
    outRoot,
    evidenceDir,
    externalInstallRoot: path.join(outRoot, "external-install"),
    generatedStarterRoot: path.join(outRoot, "generated-starter"),
    commands: [],
    assertions: {},
    negativeWitnesses: [],
    starterCommands: [],
    regressions: {},
    pendingLive: {
      livePiRuntime: "pending-live; WP-08 does not launch or prove pi runtime discovery/loading",
    },
    residualRisks: [],
    failures: [],
    ok: false,
  };
  const runStep = createRunner(summary, evidenceDir);
  const failures = summary.failures;
  async function recordAssertion(name, fn) {
    try {
      const detail = await fn();
      summary.assertions[name] = { ok: true, detail };
      return true;
    } catch (error) {
      const record = {
        ok: false,
        code: error instanceof ProofFailure ? error.code : "UNEXPECTED_ASSERTION_ERROR",
        message: String(error.message ?? error),
        detail: error instanceof ProofFailure ? error.detail : { error: String(error) },
      };
      summary.assertions[name] = record;
      failures.push({ stage: name, ...record });
      return false;
    }
  }
  try {
    const isolatedBuildEnv = baseEnv({ TURBO_CACHE_DIR: path.join(outRoot, "turbo-cache") });
    const build = await runStep("workspace-build", "pnpm", ["build"], {
      cwd: REPO_ROOT,
      env: isolatedBuildEnv,
    });
    assertCondition(
      build.exitCode === 0,
      "WP08_WORKSPACE_BUILD_FAILED",
      "pnpm build failed before packing",
      { exitCode: build.exitCode, evidenceDir: build.evidenceDir },
    );

    const packDir = path.join(outRoot, "pack");
    const pack = await runStep(
      "pack",
      "node",
      [
        "scripts/release/pack.mjs",
        "--out",
        packDir,
        "--evidence-dir",
        path.join(packDir, "evidence"),
        "--summary-out",
        path.join(packDir, "summary.json"),
      ],
      { cwd: REPO_ROOT, env: baseEnv() },
    );
    assertCondition(pack.exitCode === 0, "WP08_PACK_FAILED", "release pack failed", {
      exitCode: pack.exitCode,
      evidenceDir: pack.evidenceDir,
    });
    const packSummary = await readJson(path.join(packDir, "summary.json"));
    await recordAssertion("packGreen", async () => {
      assertCondition(
        packSummary.ok === true &&
          Array.isArray(packSummary.packages) &&
          packSummary.packages.length === 10,
        "WP08_PACK_ASSERTION_FAILED",
        "pack did not produce 10 public tarballs",
        { ok: packSummary.ok, count: packSummary.packages?.length },
      );
      return {
        packageCount: packSummary.packages.length,
        tarballDir: packSummary.tarballDir,
        packages: packSummary.packages.map((p) => ({
          name: p.name,
          tarball: p.tarball,
          sha256: p.sha256,
        })),
      };
    });

    const smoke = await runStep(
      "wp05-install-smoke-regression",
      "node",
      [
        "scripts/release/install-smoke.mjs",
        "--pack-dir",
        packDir,
        "--evidence-dir",
        path.join(outRoot, "install-smoke", "evidence"),
        "--summary-out",
        path.join(outRoot, "install-smoke", "summary.json"),
        "--keep",
      ],
      { cwd: REPO_ROOT, env: baseEnv() },
    );
    summary.regressions.wp05InstallSmoke = {
      exitCode: smoke.exitCode,
      evidenceDir: smoke.evidenceDir,
      summaryPath: path.join(outRoot, "install-smoke", "summary.json"),
    };
    assertCondition(
      smoke.exitCode === 0,
      "WP08_WP05_REGRESSION_FAILED",
      "WP-05 install-smoke regression failed against WP-08 pack output",
      summary.regressions.wp05InstallSmoke,
    );

    const externalInstallRoot = summary.externalInstallRoot;
    await mkdir(externalInstallRoot, { recursive: true });
    const npmInit = await runStep("external-npm-init", "npm", ["init", "-y"], {
      cwd: externalInstallRoot,
      env: baseEnv(),
    });
    assertCondition(
      npmInit.exitCode === 0,
      "WP08_NPM_INIT_FAILED",
      "npm init failed in clean external install",
      { evidenceDir: npmInit.evidenceDir },
    );
    const tarballs = packSummary.packages.map((p) => path.join(packSummary.tarballDir, p.tarball));
    const npmInstall = await runStep(
      "external-npm-install",
      "npm",
      ["install", "--no-save", "--no-audit", "--no-fund", ...tarballs],
      { cwd: externalInstallRoot, env: baseEnv() },
    );
    await recordAssertion("cleanExternalInstallGreen", async () => {
      assertCondition(
        npmInstall.exitCode === 0,
        "WP08_EXTERNAL_INSTALL_FAILED",
        "clean external npm install failed",
        { exitCode: npmInstall.exitCode, evidenceDir: npmInstall.evidenceDir },
      );
      return { externalInstallRoot, tarballs };
    });
    assertCondition(
      npmInstall.exitCode === 0,
      "WP08_EXTERNAL_INSTALL_FAILED",
      "cannot continue without external installed package",
      { evidenceDir: npmInstall.evidenceDir },
    );

    const externalReal = await fsRealpath(externalInstallRoot);
    const installedPackageRoot = path.join(externalInstallRoot, "node_modules", "vibe-engineer");
    const installedPackageReal = await fsRealpath(installedPackageRoot);
    const binPath = path.join(externalInstallRoot, "node_modules", ".bin", "vibe-engineer");
    const binReal = await fsRealpath(binPath);
    await recordAssertion("noModuleResolutionLeak", async () => {
      assertCondition(
        isUnder(externalReal, installedPackageReal) &&
          !isUnder(MONOREPO_REAL, installedPackageReal),
        "WP08_MODULE_RESOLUTION_LEAK",
        "installed vibe-engineer package resolves outside external install",
        { installedPackageReal, externalReal, monorepo: MONOREPO_REAL },
      );
      assertCondition(
        isUnder(externalReal, binReal) && !isUnder(MONOREPO_REAL, binReal),
        "WP08_MODULE_RESOLUTION_LEAK",
        "installed .bin target resolves outside external install",
        { binReal, externalReal, monorepo: MONOREPO_REAL },
      );
      return { installedPackageReal, binPath, binReal, nodePath: "absent", nodeOptions: "absent" };
    });

    const help = await runStep(
      "installed-help-json",
      binPath,
      ["help", "--json", "--non-interactive"],
      { cwd: externalInstallRoot, env: baseEnv() },
    );
    const helpEnvelope = parseEnvelopeFromStdout(help.stdout);
    await recordAssertion("installedHelpCommandSurface", async () => {
      assertCondition(
        help.exitCode === 0 && helpEnvelope?.payload?.kind === "help_result",
        "WP08_HELP_JSON_FAILED",
        "installed help --json did not return help_result",
        { exitCode: help.exitCode, stdout: help.stdout, stderr: help.stderr },
      );
      const commands = payloadData(helpEnvelope)
        .commands.map((c) => c.id)
        .sort();
      assertCondition(
        JSON.stringify(commands) === JSON.stringify([...PUBLIC_COMMANDS].sort()),
        "WP08_HELP_COMMAND_SURFACE_CHANGED",
        "help --json does not list exactly the nine public commands",
        { commands, expected: PUBLIC_COMMANDS },
      );
      const forbidden = commands.filter((id) => SKILL_NAMES.includes(id));
      assertCondition(
        forbidden.length === 0,
        "WP08_SKILL_NAMES_IN_HELP",
        "help lists harness skill names",
        { forbidden },
      );
      return { commands };
    });

    for (const regression of [
      {
        id: "unknown-build",
        argv: ["build", "--json", "--non-interactive"],
        expectedStatus: "blocked",
        expectedClassification: "invalid_invocation",
      },
      {
        id: "unknown-ship",
        argv: ["ship", "--json", "--non-interactive"],
        expectedStatus: "blocked",
        expectedClassification: "invalid_invocation",
      },
      {
        id: "unsupported-context",
        argv: ["context", "--json", "--non-interactive"],
        expectedStatus: "blocked",
        expectedClassification: "unsupported_operation",
      },
      {
        id: "unsupported-registry",
        argv: ["registry", "--json", "--non-interactive"],
        expectedStatus: "blocked",
        expectedClassification: "unsupported_operation",
      },
    ]) {
      const r = await runStep(`regression-${regression.id}`, binPath, regression.argv, {
        cwd: externalInstallRoot,
        env: baseEnv(),
      });
      const env = parseEnvelopeFromStdout(r.stdout);
      summary.regressions[regression.id] = {
        exitCode: r.exitCode,
        evidenceDir: r.evidenceDir,
        status: env?.status ?? null,
        classifications: (env?.diagnostics ?? []).map((d) => d.classification),
      };
      await recordAssertion(`regression:${regression.id}`, async () => {
        assertCondition(
          env?.status === regression.expectedStatus,
          "WP08_CLI_REGRESSION_CHANGED",
          "deferred/unknown command status changed",
          { regression, envelope: env },
        );
        assertCondition(
          (env?.diagnostics ?? []).some(
            (d) => d.classification === regression.expectedClassification,
          ),
          "WP08_CLI_REGRESSION_CHANGED",
          "deferred/unknown command classification changed",
          { regression, envelope: env },
        );
        return summary.regressions[regression.id];
      });
    }

    const createResultPath = path.join(evidenceDir, "create-result.json");
    const createArgs = [
      "create",
      "--target-root",
      summary.generatedStarterRoot,
      "--project-name",
      "WP08 Generated Starter",
      "--agentic-harness",
      "pi",
      "--json",
      "--non-interactive",
      "--result-file",
      createResultPath,
    ];
    const create = await runStep("installed-bin-create-pi-starter", binPath, createArgs, {
      cwd: externalInstallRoot,
      env: baseEnv(),
    });
    const createEnvelope = await readJson(createResultPath).catch(() =>
      parseEnvelopeFromStdout(create.stdout),
    );
    await writeJson(path.join(evidenceDir, "create-envelope-normalized.json"), createEnvelope);
    await recordAssertion("installedBinCreateGreen", async () => {
      assertCondition(
        create.exitCode === 0,
        "WP08_INSTALLED_BIN_CREATE_FAILED",
        "installed .bin create failed",
        { exitCode: create.exitCode, evidenceDir: create.evidenceDir },
      );
      assertCondition(
        createEnvelope?.payload?.kind === "create_result" &&
          createEnvelope?.status === "success" &&
          payloadData(createEnvelope)?.ok === true,
        "WP08_CREATE_RESULT_INVALID",
        "create did not produce valid success create_result",
        { envelope: createEnvelope },
      );
      return { createArgs, resultFile: createResultPath, targetRoot: summary.generatedStarterRoot };
    });
    assertCondition(
      create.exitCode === 0 && createEnvelope?.status === "success",
      "WP08_CREATE_REQUIRED_FOR_ASSERTIONS_FAILED",
      "cannot continue starter proof without generated starter",
      { createResultPath },
    );

    await recordAssertion("createReadFromInstalledPackage", async () =>
      assertCreateProvenance({
        createEnvelope,
        externalInstallRoot: externalReal,
        installedPackageRoot: installedPackageReal,
      }),
    );
    await recordAssertion("generatedStarterShape", async () =>
      assertStarterShape(summary.generatedStarterRoot),
    );
    await recordAssertion("piAssetSeam", async () =>
      assertPiAssets({
        starterRoot: summary.generatedStarterRoot,
        installedPackageRoot: installedPackageReal,
      }),
    );
    await recordAssertion("dependencyAudit", async () =>
      assertDependencyAudit(summary.generatedStarterRoot),
    );
    await recordAssertion("noCopiedHarnessInternals", async () =>
      assertNoCopiedHarnessInternals(summary.generatedStarterRoot),
    );
    await recordAssertion("falseLiveScan", async () =>
      assertNoFalseLiveClaims(summary.generatedStarterRoot),
    );
    await recordAssertion("nonVacuity", async () => assertNonVacuity(summary.generatedStarterRoot));

    const negMissingPi = path.join(outRoot, "negative-missing-pi");
    await copyStarter(summary.generatedStarterRoot, negMissingPi);
    await rm(path.join(negMissingPi, REQUIRED_SKILLS[0]), { force: true });
    await runNegative(
      summary,
      "missing-pi-asset",
      negMissingPi,
      async function piAssetChecker() {
        await assertPiAssets({
          starterRoot: negMissingPi,
          installedPackageRoot: installedPackageReal,
        });
      },
      "WP08_PI_ASSET_MISSING",
    );

    const negPiExtension = path.join(outRoot, "negative-pi-extension");
    await copyStarter(summary.generatedStarterRoot, negPiExtension);
    await mkdir(path.join(negPiExtension, ".pi", "extensions"), { recursive: true });
    await writeFile(
      path.join(negPiExtension, ".pi", "extensions", "bad.ts"),
      "export {};\n",
      "utf8",
    );
    await runNegative(
      summary,
      "forbidden-pi-extension",
      negPiExtension,
      async function piExtensionChecker() {
        await assertPiAssets({
          starterRoot: negPiExtension,
          installedPackageRoot: installedPackageReal,
        });
      },
      "WP08_PI_EXTENSION_FORBIDDEN",
    );

    const negSourceLeak = path.join(outRoot, "negative-source-path-leak");
    await mkdir(negSourceLeak, { recursive: true });
    const mutatedCreate = JSON.parse(JSON.stringify(createEnvelope));
    mutatedCreate.payload.data.generatedFiles.starterTemplate.templateRoot = path.join(
      REPO_ROOT,
      "packages",
      "cli",
      "templates",
      "starter",
    );
    mutatedCreate.payload.data.generatedFiles.starterTemplate.layoutPath = path.join(
      REPO_ROOT,
      "packages",
      "cli",
      "templates",
      "starter.layout.json",
    );
    const mutatedCreatePath = path.join(negSourceLeak, "create-result-source-leak.json");
    await writeJson(mutatedCreatePath, mutatedCreate);
    await runNegative(
      summary,
      "installed-template-source-provenance-leak",
      negSourceLeak,
      async function createProvenanceChecker() {
        await assertCreateProvenance({
          createEnvelope: await readJson(mutatedCreatePath),
          externalInstallRoot: externalReal,
          installedPackageRoot: installedPackageReal,
        });
      },
      "WP08_SOURCE_PATH_LEAK",
    );

    const negMissingProjectLocalCli = path.join(outRoot, "negative-missing-project-local-cli");
    await copyStarter(summary.generatedStarterRoot, negMissingProjectLocalCli);
    await removeDependency(negMissingProjectLocalCli, "vibe-engineer", "devDependencies");
    await runNegative(
      summary,
      "missing-project-local-cli-devdependency",
      negMissingProjectLocalCli,
      async function dependencyAuditChecker() {
        await assertDependencyAudit(negMissingProjectLocalCli);
      },
      "WP08_PROJECT_LOCAL_CLI_MISSING",
    );

    const negPrivateDep = path.join(outRoot, "negative-private-dep");
    await copyStarter(summary.generatedStarterRoot, negPrivateDep);
    await injectDependency(
      negPrivateDep,
      "@vibe-engineer/preset-nest-react-rn",
      "^0.1.0",
      "dependencies",
    );
    await runNegative(
      summary,
      "private-dependency-leak",
      negPrivateDep,
      async function dependencyAuditChecker() {
        await assertDependencyAudit(negPrivateDep);
      },
      "WP08_PRIVATE_DEPENDENCY_LEAK",
    );

    const negWorkspaceDep = path.join(outRoot, "negative-workspace-file-dep");
    await copyStarter(summary.generatedStarterRoot, negWorkspaceDep);
    await injectDependency(negWorkspaceDep, "left-pad", "workspace:*", "devDependencies");
    await runNegative(
      summary,
      "workspace-file-dependency-leak",
      negWorkspaceDep,
      async function dependencyAuditChecker() {
        await assertDependencyAudit(negWorkspaceDep);
      },
      "WP08_WORKSPACE_OR_PATH_DEPENDENCY_LEAK",
    );

    const negRuntimeDep = path.join(outRoot, "negative-public-runtime-dep");
    await copyStarter(summary.generatedStarterRoot, negRuntimeDep);
    await injectDependency(negRuntimeDep, "@vibe-engineer/security", "^0.1.0", "dependencies");
    await runNegative(
      summary,
      "public-runtime-harness-dependency-leak",
      negRuntimeDep,
      async function runtimeDependencyChecker() {
        await assertDependencyAudit(negRuntimeDep);
      },
      "WP08_RUNTIME_HARNESS_DEPENDENCY_LEAK",
    );

    const negFalseLive = path.join(outRoot, "negative-false-live");
    await copyStarter(summary.generatedStarterRoot, negFalseLive);
    await mkdir(path.join(negFalseLive, "docs"), { recursive: true });
    await writeFile(
      path.join(negFalseLive, "docs", "pi-live-proof.md"),
      "# Bad claim\n\nlive pi runtime proof: green\n",
      "utf8",
    );
    await runNegative(
      summary,
      "false-live-claim",
      negFalseLive,
      async function falseLiveChecker() {
        await assertNoFalseLiveClaims(negFalseLive);
      },
      "WP08_FALSE_LIVE_CLAIM",
    );

    const negVacuous = path.join(outRoot, "negative-vacuous-script");
    await copyStarter(summary.generatedStarterRoot, negVacuous);
    await rename(
      path.join(negVacuous, "apps", "web", "src"),
      path.join(negVacuous, "apps", "web", "src.excluded"),
    );
    await runNegative(
      summary,
      "vacuous-script-source-excluded",
      negVacuous,
      async function nonVacuityChecker() {
        await assertNonVacuity(negVacuous);
      },
      "WP08_VACUOUS_SOURCE_COVERAGE",
    );

    const starterEnv = baseEnv({
      COREPACK_HOME: path.join(outRoot, "corepack"),
      PNPM_HOME: path.join(outRoot, "pnpm-home"),
      HOME: path.join(outRoot, "home"),
    });
    await mkdir(starterEnv.COREPACK_HOME, { recursive: true });
    await mkdir(starterEnv.PNPM_HOME, { recursive: true });
    await mkdir(starterEnv.HOME, { recursive: true });
    summary.releaseLocalTarballOverrides = await injectReleaseLocalTarballOverrides(
      summary.generatedStarterRoot,
      packSummary,
    );
    await writeJson(
      path.join(evidenceDir, "release-local-tarball-overrides.json"),
      summary.releaseLocalTarballOverrides,
    );

    const hasLock = await exists(path.join(summary.generatedStarterRoot, "pnpm-lock.yaml"));
    const installArgs = [
      "install",
      hasLock ? "--frozen-lockfile" : "--no-frozen-lockfile",
      "--store-dir",
      path.join(outRoot, "pnpm-store"),
    ];
    const starterInstall = await runStep("starter-pnpm-install", "pnpm", installArgs, {
      cwd: summary.generatedStarterRoot,
      env: starterEnv,
    });
    summary.starterCommands.push({
      id: "pnpm install",
      args: installArgs,
      exitCode: starterInstall.exitCode,
      evidenceDir: starterInstall.evidenceDir,
    });
    await recordAssertion("starterCommand:pnpm install", async () => {
      assertCondition(
        starterInstall.exitCode === 0,
        "WP08_STARTER_INSTALL_FAILED",
        "generated starter pnpm install failed",
        { evidenceDir: starterInstall.evidenceDir, exitCode: starterInstall.exitCode },
      );
      return summary.starterCommands.at(-1);
    });

    if (starterInstall.exitCode === 0) {
      await recordAssertion("installedToolResolution", async () =>
        assertInstalledToolsResolveFromStarter(summary.generatedStarterRoot, runStep, starterEnv),
      );
      const projectLocalHelp = await runStep(
        "starter-project-local-vibe-engineer-help",
        "pnpm",
        ["exec", "vibe-engineer", "help", "--json", "--non-interactive"],
        { cwd: summary.generatedStarterRoot, env: starterEnv },
      );
      const projectLocalHelpEnvelope = parseEnvelopeFromStdout(projectLocalHelp.stdout);
      summary.starterCommands.push({
        id: "pnpm exec vibe-engineer help",
        args: ["exec", "vibe-engineer", "help", "--json", "--non-interactive"],
        exitCode: projectLocalHelp.exitCode,
        evidenceDir: projectLocalHelp.evidenceDir,
      });
      await recordAssertion("starterCommand:pnpm exec vibe-engineer help", async () => {
        assertCondition(
          projectLocalHelp.exitCode === 0 &&
            projectLocalHelpEnvelope?.payload?.kind === "help_result",
          "WP08_PROJECT_LOCAL_CLI_FAILED",
          "generated starter project-local vibe-engineer CLI did not run through pnpm exec",
          {
            exitCode: projectLocalHelp.exitCode,
            stdout: projectLocalHelp.stdout,
            stderr: projectLocalHelp.stderr,
          },
        );
        return {
          exitCode: projectLocalHelp.exitCode,
          commands: payloadData(projectLocalHelpEnvelope)
            .commands.map((c) => c.id)
            .sort(),
        };
      });
      for (const script of [
        "typecheck",
        "lint",
        "format:check",
        "test:unit",
        "build",
        "quality:quick",
      ]) {
        const r = await runStep(`starter-${script.replace(/[:]/g, "-")}`, "pnpm", ["run", script], {
          cwd: summary.generatedStarterRoot,
          env: starterEnv,
        });
        summary.starterCommands.push({
          id: `pnpm run ${script}`,
          args: ["run", script],
          exitCode: r.exitCode,
          evidenceDir: r.evidenceDir,
        });
        await recordAssertion(`starterCommand:pnpm run ${script}`, async () => {
          assertCondition(
            r.exitCode === 0,
            "WP08_STARTER_SCRIPT_FAILED",
            "generated starter script failed",
            { script, exitCode: r.exitCode, evidenceDir: r.evidenceDir },
          );
          return summary.starterCommands.at(-1);
        });
        if (script === "test:unit") {
          await recordAssertion("starterCommand:pnpm run test:unit executedTests", async () => {
            const combinedOutput = `${r.stdout}\n${r.stderr}`;
            const testCountMatches = [...combinedOutput.matchAll(/(?:#|ℹ)\s+tests\s+(\d+)/g)]
              .map((match) => Number.parseInt(match[1], 10))
              .filter(Number.isFinite);
            const passCountMatches = [...combinedOutput.matchAll(/(?:#|ℹ)\s+pass\s+(\d+)/g)]
              .map((match) => Number.parseInt(match[1], 10))
              .filter(Number.isFinite);
            const totalTests = testCountMatches.reduce((sum, value) => sum + value, 0);
            const totalPasses = passCountMatches.reduce((sum, value) => sum + value, 0);
            assertCondition(
              totalTests > 0 && totalPasses > 0,
              "WP08_VACUOUS_TEST_DISCOVERY",
              "test:unit completed without evidence that tests actually executed",
              { testCountMatches, passCountMatches, outputExcerpt: combinedOutput.slice(-4000) },
            );
            return { totalTests, totalPasses, testCountMatches, passCountMatches };
          });
        }
      }
    }

    if (
      summary.assertions.nonVacuity?.ok === true &&
      summary.assertions.nonVacuity.detail.testCoverageRisk.startsWith("MAJOR-LOCAL")
    ) {
      summary.residualRisks.push(summary.assertions.nonVacuity.detail.testCoverageRisk);
    }
    if (failures.length > 0) {
      throw new ProofFailure("WP08_PROOF_FAILURES", "one or more WP-08 proof assertions failed", {
        failureCount: failures.length,
        failureCodes: failures.map((failure) => failure.code),
      });
    }
    summary.ok = true;
  } catch (error) {
    summary.ok = false;
    if (error instanceof ProofFailure) {
      failures.push({
        stage: "fatal",
        ok: false,
        code: error.code,
        message: error.message,
        detail: error.detail,
      });
    } else {
      failures.push({
        stage: "fatal",
        ok: false,
        code: "UNEXPECTED_FATAL",
        message: String(error?.message ?? error),
        detail: { stack: error?.stack ?? null },
      });
    }
  } finally {
    summary.completedAt = new Date().toISOString();
    await writeJson(summaryOut, summary);
  }
  if (!summary.ok) process.exitCode = 1;
}

await main();
