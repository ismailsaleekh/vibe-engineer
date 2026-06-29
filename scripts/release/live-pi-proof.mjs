#!/usr/bin/env node
// Live pi runtime discovery/loading proof for generated `.pi` assets.
//
// This proof intentionally uses the real `pi` binary with project trust enabled
// and tools disabled. It verifies project-local skill command expansion and
// prompt-template expansion without allowing file writes or shell/tool actions.

import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SKILLS = Object.freeze(["brainstorm", "grill-me", "task", "plan", "build", "ship"]);
const DEFAULT_MODEL = "openai-codex/gpt-5.5";

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
    projectRoot: process.cwd(),
    out: path.join(process.cwd(), ".vibe", "release", "live-proofs", "pi-runtime"),
    model: process.env.PI_PROOF_MODEL || DEFAULT_MODEL,
    unknown: [],
  };
  const flags = new Map([
    ["--project-root", "projectRoot"],
    ["--out", "out"],
    ["--model", "model"],
  ]);
  const tokens = argv.slice(2);
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const eq = token.startsWith("--") ? token.indexOf("=") : -1;
    if (eq > 2) {
      const name = token.slice(0, eq);
      if (flags.has(name)) {
        parsed[flags.get(name)] = token.slice(eq + 1);
        continue;
      }
      parsed.unknown.push(token);
      continue;
    }
    if (flags.has(token)) {
      const value = tokens[i + 1];
      if (value === undefined) {
        parsed.unknown.push(token);
        continue;
      }
      parsed[flags.get(token)] = value;
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

function markerFor(kind, skill) {
  return `VIBE_PI_${kind}_${skill.toUpperCase().replaceAll("-", "_")}_LOADED`;
}

function redactOutput(text) {
  // Evidence is written to ignored local proof directories. Preserve valid JSONL
  // exactly so follow-up validators can parse the pi event stream.
  return text;
}

function collectMessageTexts(jsonl) {
  const texts = [];
  for (const line of jsonl.split("\n")) {
    if (!line.trim().startsWith("{")) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    const content = event?.message?.content ?? event?.assistantMessageEvent?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const item of content) {
      if (typeof item?.text === "string") texts.push(item.text);
    }
  }
  return texts;
}

async function runPi(projectRoot, outDir, model, id, prompt) {
  const stdoutPath = path.join(outDir, `${id}.jsonl`);
  const stderrPath = path.join(outDir, `${id}.stderr.txt`);
  const result = await new Promise((resolve) => {
    const child = spawn(
      "pi",
      ["--approve", "--no-session", "--no-tools", "--mode", "json", "--model", model, "-p", prompt],
      {
        cwd: projectRoot,
        env: { ...process.env, NODE_PATH: undefined, NODE_OPTIONS: undefined },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
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
  await writeFile(stdoutPath, redactOutput(result.stdout), "utf8");
  await writeFile(stderrPath, redactOutput(result.stderr), "utf8");
  return { ...result, stdoutPath, stderrPath };
}

function assertCondition(condition, code, message, detail = {}) {
  if (!condition) throw new ProofFailure(code, message, detail);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.unknown.length > 0)
    throw new ProofFailure("PI_PROOF_BAD_ARGS", "unknown arguments", { unknown: args.unknown });
  const projectRoot = path.resolve(args.projectRoot);
  const outDir = path.resolve(args.out);
  await mkdir(outDir, { recursive: true });

  const summary = {
    schemaVersion: "vibe-engineer.live-pi-proof/v1",
    generatedAt: new Date().toISOString(),
    projectRoot,
    outDir,
    model: args.model,
    staticAssets: [],
    skillCommandProofs: [],
    promptTemplateProofs: [],
    failures: [],
    ok: false,
  };

  try {
    for (const skill of SKILLS) {
      const skillPath = path.join(projectRoot, ".pi", "skills", skill, "SKILL.md");
      const promptPath = path.join(projectRoot, ".pi", "prompts", `vibe-${skill}.md`);
      assertCondition(
        await exists(skillPath),
        "PI_SKILL_FILE_MISSING",
        "generated skill file is missing",
        { skill, skillPath },
      );
      assertCondition(
        await exists(promptPath),
        "PI_PROMPT_FILE_MISSING",
        "generated prompt template is missing",
        { skill, promptPath },
      );
      const skillText = await readFile(skillPath, "utf8");
      const promptText = await readFile(promptPath, "utf8");
      assertCondition(
        skillText.includes(`name: ${skill}`),
        "PI_SKILL_FRONTMATTER_INVALID",
        "skill frontmatter name is invalid",
        { skill, skillPath },
      );
      assertCondition(
        promptText.includes(`vibe-skill: ${skill}`),
        "PI_PROMPT_FRONTMATTER_INVALID",
        "prompt frontmatter does not bind to the skill",
        { skill, promptPath },
      );
      summary.staticAssets.push({ skill, skillPath, promptPath });
    }

    for (const skill of SKILLS) {
      const marker = markerFor("SKILL", skill);
      const result = await runPi(
        projectRoot,
        outDir,
        args.model,
        `skill-${skill}`,
        `/skill:${skill} Reply exactly ${marker}; do not call tools.`,
      );
      const combined = `${result.stdout}\n${result.stderr}`;
      const messageText = collectMessageTexts(result.stdout).join("\n");
      assertCondition(
        result.exitCode === 0,
        "PI_SKILL_COMMAND_FAILED",
        "pi skill command invocation failed",
        {
          skill,
          exitCode: result.exitCode,
          stdoutPath: result.stdoutPath,
          stderrPath: result.stderrPath,
          error: result.error,
        },
      );
      assertCondition(
        messageText.includes(`<skill name="${skill}"`),
        "PI_SKILL_NOT_LOADED",
        "pi output did not include expanded skill payload",
        { skill, stdoutPath: result.stdoutPath },
      );
      assertCondition(
        messageText.includes(`.pi/skills/${skill}/SKILL.md`) ||
          combined.includes(`.pi/skills/${skill}/SKILL.md`),
        "PI_SKILL_LOCATION_NOT_PROJECT_LOCAL",
        "pi skill expansion did not reference the project-local skill path",
        { skill, stdoutPath: result.stdoutPath },
      );
      summary.skillCommandProofs.push({
        skill,
        marker,
        exitCode: result.exitCode,
        stdoutPath: result.stdoutPath,
        stderrPath: result.stderrPath,
        loaded: true,
      });
    }

    for (const skill of SKILLS) {
      const marker = markerFor("PROMPT", skill);
      const result = await runPi(
        projectRoot,
        outDir,
        args.model,
        `prompt-${skill}`,
        `/vibe-${skill} ${marker}`,
      );
      const combined = `${result.stdout}\n${result.stderr}`;
      const messageText = collectMessageTexts(result.stdout).join("\n");
      assertCondition(
        result.exitCode === 0,
        "PI_PROMPT_TEMPLATE_FAILED",
        "pi prompt-template invocation failed",
        {
          skill,
          exitCode: result.exitCode,
          stdoutPath: result.stdoutPath,
          stderrPath: result.stderrPath,
          error: result.error,
        },
      );
      assertCondition(
        messageText.includes(`Load and follow /skill:${skill}.`),
        "PI_PROMPT_TEMPLATE_NOT_EXPANDED",
        "pi output did not include expanded prompt-template content",
        { skill, stdoutPath: result.stdoutPath },
      );
      assertCondition(
        messageText.includes(marker) || combined.includes(marker),
        "PI_PROMPT_ARGUMENT_NOT_PROPAGATED",
        "prompt-template invocation did not propagate the marker argument",
        { skill, marker, stdoutPath: result.stdoutPath },
      );
      summary.promptTemplateProofs.push({
        skill,
        marker,
        exitCode: result.exitCode,
        stdoutPath: result.stdoutPath,
        stderrPath: result.stderrPath,
        expanded: true,
      });
    }

    summary.ok = true;
  } catch (error) {
    summary.failures.push({
      code: error instanceof ProofFailure ? error.code : "PI_PROOF_UNEXPECTED",
      message: String(error.message ?? error),
      detail: error instanceof ProofFailure ? error.detail : { error: String(error) },
    });
  }

  await writeFile(
    path.join(outDir, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  if (!summary.ok) {
    process.stderr.write(`${JSON.stringify(summary.failures, null, 2)}\n`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
