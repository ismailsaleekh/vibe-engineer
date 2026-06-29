#!/usr/bin/env node
// Pulumi Cloud live proof for the provider-agnostic v0.1 scaffold.
//
// This script performs a real Pulumi Cloud-backed preview and update against the
// harness repo's provider-agnostic `infra/pulumi` program. The program imports no
// cloud provider and declares no resources, so `pulumi up` mutates only Pulumi
// stack metadata/outputs. The Pulumi access token is loaded from the runtime env
// or local Pulumi credentials and is never printed or written to evidence.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import url from "node:url";

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..");
const INFRA_DIR = path.join(REPO_ROOT, "infra", "pulumi");
const DEFAULT_OUT = path.join(REPO_ROOT, ".vibe", "release", "live-proofs", "pulumi");
const DEFAULT_STACK = "dev";
const PULUMI_CLOUD_URL = "https://api.pulumi.com";

class ProofFailure extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = "ProofFailure";
    this.code = code;
    this.detail = detail;
  }
}

function parseArgs(argv) {
  const parsed = { out: DEFAULT_OUT, stack: DEFAULT_STACK, unknown: [] };
  const valueFlags = new Map([
    ["--out", "out"],
    ["--stack", "stack"],
  ]);
  const tokens = argv.slice(2);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const eq = token.startsWith("--") ? token.indexOf("=") : -1;
    if (eq > 2) {
      const name = token.slice(0, eq);
      if (valueFlags.has(name)) {
        parsed[valueFlags.get(name)] = token.slice(eq + 1);
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

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assertCondition(condition, code, message, detail = {}) {
  if (!condition) throw new ProofFailure(code, message, detail);
}

async function sha256(filePath) {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

function redact(text) {
  const token = process.env.PULUMI_ACCESS_TOKEN;
  if (!token) return text;
  return text.split(token).join("[REDACTED_PULUMI_ACCESS_TOKEN]");
}

async function loadPulumiAccessToken() {
  if (process.env.PULUMI_ACCESS_TOKEN) {
    return { token: process.env.PULUMI_ACCESS_TOKEN, source: "env:PULUMI_ACCESS_TOKEN" };
  }

  const credentialsPath = path.join(os.homedir(), ".pulumi", "credentials.json");
  assertCondition(
    await exists(credentialsPath),
    "PULUMI_CREDENTIALS_MISSING",
    "Pulumi credentials file is missing and PULUMI_ACCESS_TOKEN is not set.",
    { credentialsPath },
  );
  const credentials = await readJson(credentialsPath);
  const current = typeof credentials.current === "string" ? credentials.current : PULUMI_CLOUD_URL;
  const token =
    credentials.accessTokens?.[current] ??
    credentials.accessTokens?.[PULUMI_CLOUD_URL] ??
    credentials.accounts?.[current]?.accessToken ??
    credentials.accounts?.[PULUMI_CLOUD_URL]?.accessToken;
  assertCondition(
    typeof token === "string" && token.length > 0,
    "PULUMI_TOKEN_MISSING",
    "Pulumi credentials did not include a usable Pulumi Cloud access token.",
    { credentialsPath, current, tokenKeys: Object.keys(credentials.accessTokens ?? {}) },
  );
  return { token, source: `credentials:${credentialsPath}#${current}` };
}

function commandEnv(token) {
  return {
    ...process.env,
    PULUMI_ACCESS_TOKEN: token,
    PULUMI_BACKEND_URL: PULUMI_CLOUD_URL,
    NODE_PATH: undefined,
    NODE_OPTIONS: undefined,
  };
}

async function runCommand(summary, id, cmd, args, options = {}) {
  const stepDir = path.join(summary.evidenceDir, "commands", id);
  await mkdir(stepDir, { recursive: true });
  const cwd = options.cwd ?? REPO_ROOT;
  const startedAt = new Date().toISOString();
  const result = await new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
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
  const stdout = redact(result.stdout);
  const stderr = redact(result.stderr);
  const stdoutPath = path.join(stepDir, "stdout.txt");
  const stderrPath = path.join(stepDir, "stderr.txt");
  await writeFile(stdoutPath, stdout, "utf8");
  await writeFile(stderrPath, stderr, "utf8");
  const record = {
    id,
    cmd,
    args,
    cwd,
    startedAt,
    endedAt,
    exitCode: result.exitCode,
    ok: result.exitCode === 0,
    stdoutPath,
    stderrPath,
    stdoutSha256: await sha256(stdoutPath),
    stderrSha256: await sha256(stderrPath),
    error: result.error,
  };
  summary.commands.push(record);
  await writeJson(path.join(stepDir, "result.json"), record);
  return { ...record, stdout, stderr };
}

async function runRequired(summary, id, cmd, args, options = {}) {
  const result = await runCommand(summary, id, cmd, args, options);
  assertCondition(result.ok, "PULUMI_COMMAND_FAILED", "Pulumi live proof command failed.", {
    id,
    cmd,
    args,
    cwd: result.cwd,
    exitCode: result.exitCode,
    stdoutPath: result.stdoutPath,
    stderrPath: result.stderrPath,
    stderrTail: result.stderr.slice(-4000),
  });
  return result;
}

async function main() {
  const args = parseArgs(process.argv);
  assertCondition(args.unknown.length === 0, "PULUMI_PROOF_BAD_ARGS", "unknown arguments", {
    unknown: args.unknown,
  });
  assertCondition(
    /^[A-Za-z0-9_.:-]+$/.test(args.stack),
    "PULUMI_BAD_STACK",
    "stack name is unsafe",
    {
      stack: args.stack,
    },
  );

  const outDir = path.resolve(args.out);
  const evidenceDir = path.join(outDir, "evidence");
  await mkdir(evidenceDir, { recursive: true });

  const summary = {
    schemaVersion: "vibe-engineer.pulumi-live-proof/v1",
    generatedAt: new Date().toISOString(),
    repoRoot: REPO_ROOT,
    infraDir: INFRA_DIR,
    outDir,
    evidenceDir,
    stack: args.stack,
    pulumiCloudUrl: PULUMI_CLOUD_URL,
    tokenSource: null,
    commands: [],
    assertions: {},
    failures: [],
    ok: false,
  };

  try {
    assertCondition(
      await exists(path.join(INFRA_DIR, "Pulumi.yaml")),
      "PULUMI_PROJECT_MISSING",
      "Pulumi project file is missing",
      { infraDir: INFRA_DIR },
    );
    const token = await loadPulumiAccessToken();
    summary.tokenSource = token.source;
    const env = commandEnv(token.token);

    await runRequired(
      summary,
      "static-scaffold-validator",
      "node",
      [
        "scripts/ci/pulumi/validate-pulumi-scaffold.mjs",
        "--infra",
        "infra/pulumi",
        "--workflows",
        ".github/workflows/infra-preview.yml",
        ".github/workflows/deploy.yml",
      ],
      { cwd: REPO_ROOT, env },
    );
    summary.assertions.staticScaffoldValidator = true;

    const login = await runRequired(
      summary,
      "pulumi-login",
      "pulumi",
      ["login", PULUMI_CLOUD_URL],
      { cwd: INFRA_DIR, env },
    );
    assertCondition(
      /Logged in|already logged in|api\.pulumi\.com/i.test(`${login.stdout}\n${login.stderr}`),
      "PULUMI_LOGIN_UNVERIFIED",
      "pulumi login output did not confirm Pulumi Cloud login",
      { stdoutPath: login.stdoutPath, stderrPath: login.stderrPath },
    );
    summary.assertions.login = true;

    const whoami = await runRequired(summary, "pulumi-whoami", "pulumi", ["whoami"], {
      cwd: INFRA_DIR,
      env,
    });
    const whoamiText = whoami.stdout.trim();
    assertCondition(
      whoamiText.length > 0,
      "PULUMI_WHOAMI_EMPTY",
      "pulumi whoami returned an empty identity",
      { stdoutPath: whoami.stdoutPath },
    );
    summary.assertions.whoami = { account: whoamiText };

    await runRequired(
      summary,
      "stack-select-or-create",
      "pulumi",
      ["stack", "select", args.stack, "--create", "--non-interactive"],
      { cwd: INFRA_DIR, env },
    );
    summary.assertions.stackSelected = args.stack;

    const preview = await runRequired(
      summary,
      "pulumi-preview",
      "pulumi",
      ["preview", "--diff", "--non-interactive", "--show-config"],
      { cwd: INFRA_DIR, env },
    );
    assertCondition(
      /Previewing update|Resources:|Outputs:/i.test(`${preview.stdout}\n${preview.stderr}`),
      "PULUMI_PREVIEW_UNVERIFIED",
      "pulumi preview output did not look like a real preview",
      { stdoutPath: preview.stdoutPath, stderrPath: preview.stderrPath },
    );
    summary.assertions.preview = true;

    const up = await runRequired(
      summary,
      "pulumi-up",
      "pulumi",
      ["up", "--yes", "--non-interactive", "--skip-preview"],
      { cwd: INFRA_DIR, env },
    );
    assertCondition(
      /Updating|Resources:|Outputs:/i.test(`${up.stdout}\n${up.stderr}`),
      "PULUMI_UP_UNVERIFIED",
      "pulumi up output did not look like a real update",
      { stdoutPath: up.stdoutPath, stderrPath: up.stderrPath },
    );
    summary.assertions.up = true;

    const stackOutput = await runRequired(
      summary,
      "pulumi-stack-output",
      "pulumi",
      ["stack", "output", "--json"],
      { cwd: INFRA_DIR, env },
    );
    let outputs;
    try {
      outputs = JSON.parse(stackOutput.stdout);
    } catch (error) {
      throw new ProofFailure(
        "PULUMI_OUTPUT_JSON_INVALID",
        "pulumi stack output --json was not valid JSON",
        {
          stdoutPath: stackOutput.stdoutPath,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      );
    }
    assertCondition(
      outputs?.project === "vibe-engineer-infra",
      "PULUMI_PROJECT_OUTPUT_INVALID",
      "Pulumi project output is invalid",
      { outputs },
    );
    assertCondition(
      outputs?.stack === args.stack,
      "PULUMI_STACK_OUTPUT_INVALID",
      "Pulumi stack output is invalid",
      { outputs, expectedStack: args.stack },
    );
    assertCondition(
      outputs?.providerAgnostic === true,
      "PULUMI_PROVIDER_AGNOSTIC_OUTPUT_INVALID",
      "Pulumi providerAgnostic output is invalid",
      { outputs },
    );
    summary.assertions.outputs = outputs;

    summary.ok = true;
  } catch (error) {
    summary.failures.push({
      code: error instanceof ProofFailure ? error.code : "PULUMI_PROOF_UNEXPECTED",
      message: String(error.message ?? error),
      detail: error instanceof ProofFailure ? error.detail : { stack: error.stack ?? null },
    });
  }

  await writeJson(path.join(outDir, "summary.json"), summary);
  if (!summary.ok) {
    process.stderr.write(`${JSON.stringify(summary.failures, null, 2)}\n`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
