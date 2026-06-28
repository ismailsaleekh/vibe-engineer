#!/usr/bin/env node
// Manual/protected npm publish driver for v0.1 public packages.
// This script never publishes by default. Use --dry-run for a non-mutating proof,
// or pass --confirm-publish in a protected/manual release context.

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { AssertionFailure, assertOk, run, writeJson } from "./lib/release-helpers.mjs";

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_PACK_DIR = path.join(REPO_ROOT, ".vibe/release/pack");
const DEFAULT_EVIDENCE_DIR = path.join(REPO_ROOT, ".vibe/release/publish/evidence");
const EXPECTED_GITHUB_OWNER = "ismailsaleekh";

function parseArgs(argv) {
  const parsed = {
    packDir: DEFAULT_PACK_DIR,
    evidenceDir: DEFAULT_EVIDENCE_DIR,
    summaryOut: null,
    expectedGithubOwner: EXPECTED_GITHUB_OWNER,
    expectedNpmUser: null,
    dryRun: false,
    confirmPublish: false,
    tag: "latest",
    unknown: [],
  };
  const valueFlags = new Map([
    ["--pack-dir", "packDir"],
    ["--evidence-dir", "evidenceDir"],
    ["--summary-out", "summaryOut"],
    ["--expected-github-owner", "expectedGithubOwner"],
    ["--expected-npm-user", "expectedNpmUser"],
    ["--tag", "tag"],
  ]);
  const tokens = argv.slice(2);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (token === "--confirm-publish") {
      parsed.confirmPublish = true;
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

async function githubIdentity(expectedOwner) {
  const gh = await run("gh", ["api", "user", "--jq", ".login"], {
    cwd: REPO_ROOT,
    env: process.env,
  });
  const envOwner = process.env.GITHUB_REPOSITORY_OWNER ?? null;
  const envRepo = process.env.GITHUB_REPOSITORY ?? null;
  const login = gh.ok ? gh.stdout.trim() : envOwner;
  const repoOk = !envRepo || envRepo === `${expectedOwner}/vibe-engineer`;
  return {
    ok: login === expectedOwner && repoOk,
    login,
    expectedOwner,
    envOwner,
    envRepo,
    ghExitCode: gh.exitCode,
    ghStderr: gh.stderr.slice(-1000),
    source: gh.ok ? "gh api user" : "GITHUB_REPOSITORY_OWNER",
  };
}

async function npmIdentity(expectedNpmUser) {
  const npm = await run("npm", ["whoami"], { cwd: REPO_ROOT, env: process.env });
  const user = npm.ok ? npm.stdout.trim() : null;
  return {
    ok: npm.ok && (!expectedNpmUser || user === expectedNpmUser),
    user,
    expectedNpmUser,
    exitCode: npm.exitCode,
    stderr: npm.stderr.slice(-1000),
  };
}

async function runPublishStep(summary, evidenceDir, pkg, args) {
  const safe = pkg.name.replace("/", "_");
  const stepDir = path.join(evidenceDir, safe);
  await mkdir(stepDir, { recursive: true });
  await writeJson(path.join(stepDir, "command.json"), {
    cmd: "npm",
    args,
    cwd: REPO_ROOT,
    package: pkg.name,
  });
  const startedAt = new Date().toISOString();
  const result = await run("npm", args, { cwd: REPO_ROOT, env: process.env });
  const endedAt = new Date().toISOString();
  await writeFile(path.join(stepDir, "stdout.txt"), result.stdout, "utf8");
  await writeFile(path.join(stepDir, "stderr.txt"), result.stderr, "utf8");
  const record = {
    package: pkg.name,
    tarballPath: pkg.tarballPath,
    startedAt,
    endedAt,
    exitCode: result.exitCode,
    ok: result.ok,
    evidenceDir: stepDir,
  };
  await writeJson(path.join(stepDir, "result.json"), record);
  summary.packages.push(record);
  assertOk(`publish-${pkg.name}`, result.ok, {
    package: pkg.name,
    exitCode: result.exitCode,
    stderrTail: result.stderr.slice(-4000),
    stdoutTail: result.stdout.slice(-4000),
  });
}

async function main() {
  const args = parseArgs(process.argv);
  assertOk("publish-args", args.unknown.length === 0, { unknown: args.unknown });

  const packDir = path.resolve(args.packDir);
  const evidenceDir = path.resolve(args.evidenceDir);
  const summaryOut = path.resolve(args.summaryOut || path.join(evidenceDir, "..", "summary.json"));
  await mkdir(evidenceDir, { recursive: true });
  const summary = {
    schemaVersion: "vibe-engineer.release.publish.v1",
    generatedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    packDir,
    evidenceDir,
    mode: args.dryRun ? "dry-run" : "publish",
    identities: null,
    packages: [],
    errors: [],
    ok: false,
  };

  try {
    const packSummaryPath = path.join(packDir, "summary.json");
    assertOk("pack-summary-exists", await exists(packSummaryPath), { packSummaryPath });
    const packSummary = await readJson(packSummaryPath);
    assertOk("pack-summary-ok", packSummary.ok === true, { packSummaryOk: packSummary.ok });

    if (!args.dryRun) {
      assertOk(
        "manual-confirm",
        args.confirmPublish === true && process.env.VIBE_ENGINEER_RELEASE_APPROVED === "true",
        {
          confirmPublish: args.confirmPublish,
          envApproved: process.env.VIBE_ENGINEER_RELEASE_APPROVED === "true",
          message:
            "Real publish requires --confirm-publish and VIBE_ENGINEER_RELEASE_APPROVED=true in a manual/protected context.",
        },
      );
    }

    const identities = {
      github: await githubIdentity(args.expectedGithubOwner),
      npm: await npmIdentity(args.expectedNpmUser),
    };
    summary.identities = identities;
    assertOk("github-identity", identities.github.ok, identities.github);
    assertOk("npm-identity", identities.npm.ok, identities.npm);

    for (const pkg of packSummary.packages) {
      const publishArgs = ["publish", pkg.tarballPath, "--tag", args.tag];
      if (pkg.name.startsWith("@")) publishArgs.push("--access", "public");
      if (args.dryRun) publishArgs.push("--dry-run");
      await runPublishStep(summary, evidenceDir, pkg, publishArgs);
    }
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
