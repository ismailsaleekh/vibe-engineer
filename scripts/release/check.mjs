#!/usr/bin/env node
// v0.1 release readiness check.
// Runs the blocking local release proof without publishing: build, tests, quality,
// governance/metadata validation, pack, installed-binary smoke, and generated-starter
// local proof. Evidence is written under .vibe/release/check by default (ignored).

import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import url from "node:url";
import { AssertionFailure, assertOk, cleanDir, run, writeJson } from "./lib/release-helpers.mjs";

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_OUT = path.join(REPO_ROOT, ".vibe/release/check");
const EXPECTED_GITHUB_OWNER = "ismailsaleekh";
const EXPECTED_REPOSITORY = "git+https://github.com/ismailsaleekh/vibe-engineer.git";
const EXPECTED_HOMEPAGE = "https://github.com/ismailsaleekh/vibe-engineer#readme";
const EXPECTED_BUGS = "https://github.com/ismailsaleekh/vibe-engineer/issues";
const PUBLIC_PACKAGE_NAMES = Object.freeze([
  "@vibe-engineer/adapter-pi",
  "@vibe-engineer/artifacts",
  "@vibe-engineer/config",
  "@vibe-engineer/context",
  "@vibe-engineer/orchestration",
  "@vibe-engineer/schematics",
  "@vibe-engineer/security",
  "@vibe-engineer/skills",
  "@vibe-engineer/verification",
  "vibe-engineer",
]);

function parseArgs(argv) {
  const parsed = {
    out: DEFAULT_OUT,
    evidenceDir: null,
    summaryOut: null,
    requireNpmAuth: false,
    expectedNpmUser: null,
    expectedGithubOwner: EXPECTED_GITHUB_OWNER,
    skipGeneratedStarter: false,
    unknown: [],
  };
  const valueFlags = new Map([
    ["--out", "out"],
    ["--evidence-dir", "evidenceDir"],
    ["--summary-out", "summaryOut"],
    ["--expected-npm-user", "expectedNpmUser"],
    ["--expected-github-owner", "expectedGithubOwner"],
  ]);
  const tokens = argv.slice(2);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "--require-npm-auth") {
      parsed.requireNpmAuth = true;
      continue;
    }
    if (token === "--skip-generated-starter") {
      parsed.skipGeneratedStarter = true;
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

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
function includesPlaceholder(text) {
  return /\[(?:YEAR|COPYRIGHT HOLDER|PRIVATE VULNERABILITY REPORTING CHANNEL TBD|CONDUCT CONTACT TBD)\]|\bTBD\b/i.test(
    text,
  );
}

async function childPackageJsons(parent) {
  const entries = await readdir(parent, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(parent, entry.name, "package.json");
    if (await exists(manifestPath)) files.push(manifestPath);
  }
  return files;
}

async function discoverWorkspaceManifests() {
  const files = [];
  files.push(path.join(REPO_ROOT, "package.json"));
  files.push(...(await childPackageJsons(path.join(REPO_ROOT, "packages"))));
  files.push(...(await childPackageJsons(path.join(REPO_ROOT, "packages", "presets"))));
  files.push(...(await childPackageJsons(path.join(REPO_ROOT, "packages", "adapters"))));
  const infra = path.join(REPO_ROOT, "infra", "pulumi", "package.json");
  if (await exists(infra)) files.push(infra);
  return [...new Set(files)];
}

async function validateMetadata() {
  const findings = [];
  const add = (severity, code, message, detail = {}) =>
    findings.push({ severity, code, message, detail });

  const license = await readFile(path.join(REPO_ROOT, "LICENSE"), "utf8");
  const security = await readFile(path.join(REPO_ROOT, "SECURITY.md"), "utf8");
  const conduct = await readFile(path.join(REPO_ROOT, "CODE_OF_CONDUCT.md"), "utf8");
  const changelog = await readFile(path.join(REPO_ROOT, "CHANGELOG.md"), "utf8");
  if (includesPlaceholder(license))
    add(
      "critical",
      "GOV_LICENSE_PLACEHOLDER",
      "LICENSE still contains release-blocking placeholder metadata.",
    );
  if (includesPlaceholder(security))
    add(
      "critical",
      "GOV_SECURITY_PLACEHOLDER",
      "SECURITY.md still contains a release-blocking placeholder.",
    );
  if (includesPlaceholder(conduct))
    add(
      "critical",
      "GOV_CONDUCT_PLACEHOLDER",
      "CODE_OF_CONDUCT.md still contains a release-blocking placeholder.",
    );
  if (
    !security.includes("https://github.com/ismailsaleekh/vibe-engineer/security/advisories/new")
  ) {
    add(
      "critical",
      "GOV_SECURITY_CHANNEL",
      "SECURITY.md must point to the private GitHub Security Advisory reporting URL.",
    );
  }
  if (!conduct.includes("ismailsalikhodjaev@gmail.com")) {
    add(
      "critical",
      "GOV_CONDUCT_CONTACT",
      "CODE_OF_CONDUCT.md must include the private conduct reporting contact.",
    );
  }
  if (!changelog.includes("## [0.1.0]")) {
    add(
      "major",
      "CHANGELOG_RELEASE_HEADING",
      "CHANGELOG.md must contain a 0.1.0 release section before release.",
    );
  }

  const manifests = [];
  for (const manifestPath of await discoverWorkspaceManifests()) {
    let manifest;
    try {
      manifest = await readJson(manifestPath);
    } catch {
      continue;
    }
    manifests.push({ manifestPath, manifest });
  }
  const publicPkgs = manifests.filter(
    ({ manifest }) =>
      manifest.private === false &&
      /^0\.1\.\d+$/.test(String(manifest.version)) &&
      PUBLIC_PACKAGE_NAMES.includes(manifest.name),
  );
  const publicNames = publicPkgs.map((p) => p.manifest.name).sort();
  if (JSON.stringify(publicNames) !== JSON.stringify([...PUBLIC_PACKAGE_NAMES].sort())) {
    add(
      "critical",
      "PUBLIC_PACKAGE_SET",
      "Public package set does not match the locked v0.1 package graph.",
      { publicNames },
    );
  }

  for (const { manifestPath, manifest } of publicPkgs) {
    const rel = path.relative(REPO_ROOT, manifestPath);
    const prefix = `${manifest.name} (${rel})`;
    if (
      !manifest.description ||
      /skeleton-only|foundation-only|pending-live/i.test(manifest.description)
    ) {
      add("critical", "PACKAGE_DESCRIPTION", `${prefix} has stale or missing public description.`, {
        description: manifest.description ?? null,
      });
    }
    if (manifest.license !== "MIT")
      add("critical", "PACKAGE_LICENSE", `${prefix} must use MIT license.`);
    if (manifest.repository?.url !== EXPECTED_REPOSITORY)
      add("critical", "PACKAGE_REPOSITORY", `${prefix} repository URL is wrong.`, {
        repository: manifest.repository ?? null,
      });
    if (manifest.bugs?.url !== EXPECTED_BUGS)
      add("critical", "PACKAGE_BUGS", `${prefix} bugs URL is missing/wrong.`, {
        bugs: manifest.bugs ?? null,
      });
    if (manifest.homepage !== EXPECTED_HOMEPAGE)
      add("critical", "PACKAGE_HOMEPAGE", `${prefix} homepage is missing/wrong.`, {
        homepage: manifest.homepage ?? null,
      });
    if (!manifest.author || !String(manifest.author).includes("Ismail"))
      add("critical", "PACKAGE_AUTHOR", `${prefix} author is missing/wrong.`, {
        author: manifest.author ?? null,
      });
    if (!Array.isArray(manifest.keywords) || manifest.keywords.length < 5)
      add("major", "PACKAGE_KEYWORDS", `${prefix} should expose useful npm keywords.`);
    if (manifest.engines?.node !== ">=20.19.0" || manifest.engines?.pnpm !== ">=10.33.0")
      add("critical", "PACKAGE_ENGINES", `${prefix} engines are missing/wrong.`, {
        engines: manifest.engines ?? null,
      });
    if (!Array.isArray(manifest.files) || manifest.files.length === 0)
      add("critical", "PACKAGE_FILES", `${prefix} must use an npm files allowlist.`);
    if (
      /skeleton-only|not-created|foundation-implemented/i.test(
        JSON.stringify(manifest.vibeEngineer ?? {}),
      )
    ) {
      add(
        "critical",
        "PACKAGE_VIBE_METADATA_STALE",
        `${prefix} has stale vibeEngineer implementation metadata.`,
        { vibeEngineer: manifest.vibeEngineer ?? null },
      );
    }
    const depBuckets = ["dependencies", "peerDependencies", "optionalDependencies"];
    for (const bucket of depBuckets) {
      for (const [dep, range] of Object.entries(manifest[bucket] ?? {})) {
        if (
          String(range).startsWith("workspace:") ||
          String(range).startsWith("file:") ||
          String(range).startsWith("link:")
        ) {
          add(
            "critical",
            "PUBLIC_DEP_WORKSPACE",
            `${prefix} has non-publishable dependency range.`,
            { bucket, dep, range },
          );
        }
      }
    }
  }

  const root = manifests.find(
    (m) => m.manifestPath === path.join(REPO_ROOT, "package.json"),
  )?.manifest;
  if (root?.vibeEngineer?.implementationStatus === "skeleton-only") {
    add(
      "major",
      "ROOT_IMPLEMENTATION_STATUS",
      "Root package vibeEngineer.implementationStatus is stale.",
    );
  }
  const hygiene = await run("git", ["ls-files"], { cwd: REPO_ROOT });
  if (hygiene.ok) {
    const tracked = hygiene.stdout.split("\n").filter(Boolean);
    const badTracked = tracked.filter(
      (p) =>
        p.startsWith(".turbo") || /tsup\.config\.bundled_.*\.mjs$/.test(p) || p.endsWith(".map"),
    );
    if (badTracked.length > 0)
      add(
        "critical",
        "TRACKED_REGENERABLE_LOCAL_ARTIFACTS",
        "Tracked regenerable local/cache/source-map artifacts must be removed.",
        { badTracked },
      );
  }

  return {
    ok: !findings.some((f) => ["critical", "major"].includes(f.severity)),
    findings,
    publicPackageCount: publicPkgs.length,
  };
}

async function runStep(summary, evidenceDir, id, cmd, args, opts = {}) {
  const stepDir = path.join(evidenceDir, "commands", id);
  await mkdir(stepDir, { recursive: true });
  await writeJson(path.join(stepDir, "command.json"), { cmd, args, cwd: opts.cwd ?? REPO_ROOT });
  const startedAt = new Date().toISOString();
  const result = await run(cmd, args, { cwd: opts.cwd ?? REPO_ROOT, env: opts.env });
  const endedAt = new Date().toISOString();
  await writeFile(path.join(stepDir, "stdout.txt"), result.stdout, "utf8");
  await writeFile(path.join(stepDir, "stderr.txt"), result.stderr, "utf8");
  const record = {
    id,
    cmd,
    args,
    cwd: opts.cwd ?? REPO_ROOT,
    startedAt,
    endedAt,
    exitCode: result.exitCode,
    ok: result.ok,
    stdoutBytes: result.stdout.length,
    stderrBytes: result.stderr.length,
    evidenceDir: stepDir,
  };
  await writeJson(path.join(stepDir, "result.json"), record);
  summary.steps.push(record);
  assertOk(`step-${id}`, result.ok, {
    id,
    exitCode: result.exitCode,
    stderrTail: result.stderr.slice(-4000),
    stdoutTail: result.stdout.slice(-4000),
  });
  return result;
}

async function githubIdentity(expectedOwner) {
  const fromEnv = process.env.GITHUB_REPOSITORY_OWNER
    ? { source: "GITHUB_REPOSITORY_OWNER", login: process.env.GITHUB_REPOSITORY_OWNER }
    : null;
  const gh = await run("gh", ["api", "user", "--jq", ".login"], {
    cwd: REPO_ROOT,
    env: process.env,
  });
  const login = gh.ok ? gh.stdout.trim() : (fromEnv?.login ?? null);
  return {
    ok: login === expectedOwner,
    login,
    expectedOwner,
    ghExitCode: gh.exitCode,
    ghStderr: gh.stderr.slice(-1000),
    source: gh.ok ? "gh api user" : (fromEnv?.source ?? "unavailable"),
  };
}

async function npmIdentity({ requireNpmAuth, expectedNpmUser }) {
  const npm = await run("npm", ["whoami"], { cwd: REPO_ROOT, env: process.env });
  const user = npm.ok ? npm.stdout.trim() : null;
  const ok = !requireNpmAuth || (npm.ok && (!expectedNpmUser || user === expectedNpmUser));
  return {
    ok,
    required: requireNpmAuth,
    user,
    expectedNpmUser,
    exitCode: npm.exitCode,
    stderr: npm.stderr.slice(-1000),
    status: npm.ok ? "authenticated" : "pending-auth",
  };
}

async function main() {
  const args = parseArgs(process.argv);
  assertOk("check-args", args.unknown.length === 0, { unknown: args.unknown });
  const outDir = path.resolve(args.out);
  const evidenceDir = path.resolve(args.evidenceDir || path.join(outDir, "evidence"));
  const summaryOut = path.resolve(args.summaryOut || path.join(outDir, "summary.json"));
  await cleanDir(outDir);
  await mkdir(evidenceDir, { recursive: true });

  const summary = {
    schemaVersion: "vibe-engineer.release.check.v1",
    generatedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    outDir,
    evidenceDir,
    steps: [],
    metadata: null,
    identities: null,
    assertions: {},
    pendingLive: {
      hostedHarnessCi: "pending until pushed workflow run evidence exists",
      generatedStarterHostedCi: "pending until generated starter hosted CI proof exists",
      livePiRuntime: "pending-live; generated pi assets are static-proven only",
      pulumiLiveDeploy: "pending-live; real deploy is not a v0.1 blocker unless claimed",
      mobileDeviceE2E: "pending-live; no device/simulator proof claimed",
      visualBaselines: "pending-live; no full visual baseline proof claimed",
    },
    errors: [],
    ok: false,
  };

  try {
    const metadata = await validateMetadata();
    summary.metadata = metadata;
    assertOk("metadata", metadata.ok, { findings: metadata.findings });
    summary.assertions.metadata = true;

    const identities = {
      github: await githubIdentity(args.expectedGithubOwner),
      npm: await npmIdentity({
        requireNpmAuth: args.requireNpmAuth,
        expectedNpmUser: args.expectedNpmUser,
      }),
    };
    summary.identities = identities;
    assertOk("github-identity", identities.github.ok, identities.github);
    assertOk("npm-identity-policy", identities.npm.ok, identities.npm);
    summary.assertions.identityPolicy = true;

    await runStep(summary, evidenceDir, "build", "pnpm", ["build"]);
    await runStep(summary, evidenceDir, "test", "pnpm", ["test"]);
    await runStep(summary, evidenceDir, "quality", "pnpm", [
      "quality",
      "--",
      "--profile=ci",
      "--evidence-dir",
      path.join(evidenceDir, "quality"),
      "--summary-out",
      path.join(evidenceDir, "quality-summary.json"),
    ]);

    const packDir = path.join(outDir, "pack");
    await runStep(summary, evidenceDir, "release-pack", "node", [
      "scripts/release/pack.mjs",
      "--out",
      packDir,
    ]);
    await runStep(summary, evidenceDir, "release-install-smoke", "node", [
      "scripts/release/install-smoke.mjs",
      "--pack-dir",
      packDir,
      "--evidence-dir",
      path.join(evidenceDir, "install-smoke"),
      "--summary-out",
      path.join(evidenceDir, "install-smoke-summary.json"),
    ]);
    if (!args.skipGeneratedStarter) {
      // The WP-08 proof intentionally fails closed if its generated project/install root lives
      // under the monorepo: otherwise source-tree resolution can mask missing published
      // dependencies. Keep release-check evidence under the ignored release evidence directory,
      // but run the actual generated-starter proof from an external temp root.
      const generatedStarterOut = path.join(
        tmpdir(),
        `vibe-engineer-release-generated-starter-${process.pid}-${Date.now()}`,
      );
      await runStep(summary, evidenceDir, "generated-starter-local-proof", "node", [
        "scripts/release/generated-starter-local-proof.mjs",
        "--out",
        generatedStarterOut,
        "--evidence-dir",
        path.join(evidenceDir, "generated-starter"),
        "--summary-out",
        path.join(evidenceDir, "generated-starter-summary.json"),
      ]);
    }
    summary.assertions.releaseProof = true;
    summary.ok = true;
  } catch (error) {
    summary.ok = false;
    if (error instanceof AssertionFailure)
      summary.errors.push({ assertion: error.assertion, detail: error.detail });
    else
      summary.errors.push({
        assertion: "unexpected",
        detail: { message: String(error), stack: error.stack },
      });
  }

  await writeJson(summaryOut, summary);
  process.exit(summary.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
