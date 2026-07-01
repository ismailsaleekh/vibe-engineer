// vibe-engineer create — selected-harness starter creation with DL-17 bootstrap context.
// Mirrors the accepted verify/index.ts + security/index.ts Node-24-native-.ts-load precedent.
import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { stdin as promptInput, stdout as promptOutput } from "node:process";
import { createInterface } from "node:readline/promises";
import { basename, dirname, resolve } from "node:path";
import {
  artifactDescriptor,
  createEnvelope,
  invalidInvocationEnvelope,
  payload,
  validateCliResultEnvelope,
  writeResultFileAtomic,
} from "../../envelope/result-envelope.js";
import { CliClassification, CliErrorCode, cliError, diagnostic } from "../../errors/codes.js";
import { parseFlagToken, sanitizeFlagForDisplay } from "../../errors/sanitization.js";
import {
  buildBootstrap,
  DEFAULT_AGENTIC_HARNESS,
  isSecretLikeBrief,
  MAX_BRIEF_BYTES,
  normalizeSlug,
  resolveSelectedHarness,
  SUPPORTED_AGENTIC_HARNESSES,
  writeGeneratedArtifacts,
} from "./selected-harness.ts";
import { isPiHarnessAssetError, writePiHarnessAssets } from "./pi-harness-assets.ts";
import {
  isStarterTemplateError,
  materializeStarterTree,
  starterScopeFromId,
  type StarterScopeId,
  type StarterScopeMetadata,
} from "./starter-template.ts";

type UnknownRecord = Record<string, unknown>;

type CommandInvocation = {
  id: string;
  command: string;
  argv: string[];
  projectRoot: string | null;
  configPath: string | null;
  startedAt: string;
  endedAt: string;
};

type CommandContext = {
  invocation: CommandInvocation;
  args: string[];
  context: UnknownRecord;
};

type CreateOptions = {
  targetRoot: string;
  projectName: string;
  agenticHarness: string;
  brief: string | null;
  starterScope: StarterScopeId;
  resultFile?: string;
  json: boolean;
  nonInteractive: boolean;
};

type ParsedCreateOptions = {
  targetRoot: string | null;
  projectName: string | null;
  agenticHarness: string | null;
  brief: string | null;
  starterScope: StarterScopeId;
  resultFile?: string;
  json: boolean;
  nonInteractive: boolean;
};

type CompleteOptionsResult =
  | { ok: true; options: CreateOptions }
  | { ok: false; envelope: UnknownRecord };
type ParseResult =
  | { ok: true; options: ParsedCreateOptions }
  | { ok: false; envelope: UnknownRecord };

type GitCommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  timedOut: boolean;
};

type GitBootstrapMetadata = {
  initialized: boolean;
  branch: string;
  commit: string;
  message: string;
  statusShort: string;
};

type DependencyLockfileMetadata = {
  generated: boolean;
  path: string;
  command: string[];
};

class CreateGitBootstrapError extends Error {
  readonly code: string;
  readonly classification: string;
  readonly details: UnknownRecord;

  constructor(input: {
    code?: string;
    classification?: string;
    message: string;
    details?: UnknownRecord;
  }) {
    super(input.message);
    this.name = "CreateGitBootstrapError";
    this.code = input.code ?? CliErrorCode.InternalError;
    this.classification = input.classification ?? CliClassification.ExternalUnavailable;
    this.details = input.details ?? {};
    Object.setPrototypeOf(this, CreateGitBootstrapError.prototype);
  }
}

class CreateDependencyLockfileError extends Error {
  readonly code: string;
  readonly classification: string;
  readonly details: UnknownRecord;

  constructor(input: {
    code?: string;
    classification?: string;
    message: string;
    details?: UnknownRecord;
  }) {
    super(input.message);
    this.name = "CreateDependencyLockfileError";
    this.code = input.code ?? CliErrorCode.InternalError;
    this.classification = input.classification ?? CliClassification.ExternalUnavailable;
    this.details = input.details ?? {};
    Object.setPrototypeOf(this, CreateDependencyLockfileError.prototype);
  }
}

type EnvelopeFactoryInput = {
  invocation: CommandInvocation;
  status: string;
  payload: UnknownRecord;
  diagnostics?: UnknownRecord[];
  artifacts?: UnknownRecord[];
  errors?: UnknownRecord[];
  exitCode?: number | null;
};

type InvalidInvocationInput = {
  code?: string;
  classification?: string;
  message: string;
  details?: UnknownRecord;
};

function makeArtifactDescriptor(input: {
  kind: string;
  path: string;
  schemaVersion?: string | null;
  role: string;
  sha256?: string | null;
}): UnknownRecord {
  return artifactDescriptor(input);
}
function makeCreateEnvelope(input: EnvelopeFactoryInput): UnknownRecord {
  return createEnvelope(input);
}
function makeInvalidInvocationEnvelope(
  invocation: CommandInvocation,
  input: InvalidInvocationInput,
): UnknownRecord {
  return invalidInvocationEnvelope(invocation, input);
}
function makePayload(kind: string, data?: UnknownRecord, schemaVersion?: string): UnknownRecord {
  return payload(kind, data, schemaVersion);
}
function makeValidateCliResultEnvelope(
  envelope: UnknownRecord,
): { ok: true; envelope: UnknownRecord } | { ok: false; errors: string[] } {
  return validateCliResultEnvelope(envelope);
}
function makeWriteResultFileAtomic(resultFile: string, envelope: UnknownRecord): Promise<void> {
  return writeResultFileAtomic(resultFile, envelope);
}
function makeCliError(input: {
  code: string;
  classification: string;
  retryable?: boolean;
  blocking?: boolean;
  message: string;
  details?: UnknownRecord;
}): UnknownRecord {
  return cliError(input);
}
function makeDiagnostic(input: {
  severity?: string;
  code: string;
  classification: string;
  message: string;
  path?: string | null;
  span?: unknown;
  hint?: string | null;
}): UnknownRecord {
  return diagnostic(input);
}

const VALUE_FLAGS = new Set([
  "--project-name",
  "--agentic-harness",
  "--brief",
  "--project-brief",
  "--target-root",
  "--result-file",
  "--project-root",
]);
const BOOLEAN_FLAGS = new Set(["--json", "--non-interactive", "--no-mobile", "--web-only"]);
const BRIEF_FLAGS = new Set(["--brief", "--project-brief"]);
const CREATE_GIT_BOOTSTRAP_MESSAGE = "chore: create vibe-engineer starter";
const CREATE_GIT_DEFAULT_AUTHOR = Object.freeze({
  name: "vibe-engineer",
  email: "vibe-engineer@example.invalid",
});
const CREATE_LOCKFILE_COMMAND = "pnpm";
const CREATE_LOCKFILE_ARGS = Object.freeze(["install", "--lockfile-only"]);
const CREATE_LOCKFILE_TIMEOUT_MS = 5 * 60 * 1000;
const CREATE_LOCKFILE_PATH = "pnpm-lock.yaml";
const MAX_GIT_DETAIL_CHARS = 2000;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function gitEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_EDITOR: ":",
    ...overrides,
  };
}

function truncateGitDetail(value: string): string {
  if (value.length <= MAX_GIT_DETAIL_CHARS) return value;
  return `${value.slice(0, MAX_GIT_DETAIL_CHARS)}…`;
}

function runProcessCommand(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number },
): Promise<GitCommandResult> {
  return new Promise((resolvePromise) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let timeout: NodeJS.Timeout | null = null;
    let hardKillTimeout: NodeJS.Timeout | null = null;
    let settled = false;
    const finish = (result: GitCommandResult): void => {
      if (settled) return;
      settled = true;
      if (timeout !== null) clearTimeout(timeout);
      if (hardKillTimeout !== null) clearTimeout(hardKillTimeout);
      resolvePromise(result);
    };
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (typeof options.timeoutMs === "number" && options.timeoutMs > 0) {
      timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        hardKillTimeout = setTimeout(() => {
          child.kill("SIGKILL");
        }, 2_000);
      }, options.timeoutMs);
    }
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error: Error & { code?: unknown }) => {
      finish({
        stdout,
        stderr,
        exitCode: null,
        signal: null,
        errorCode: timedOut ? "ETIMEDOUT" : typeof error.code === "string" ? error.code : null,
        errorMessage: timedOut
          ? `Command timed out after ${String(options.timeoutMs)}ms.`
          : error.message,
        timedOut,
      });
    });
    child.on("close", (code, signal) => {
      finish({
        stdout,
        stderr,
        exitCode: typeof code === "number" ? code : null,
        signal: typeof signal === "string" ? signal : null,
        errorCode: timedOut ? "ETIMEDOUT" : null,
        errorMessage: timedOut ? `Command timed out after ${String(options.timeoutMs)}ms.` : null,
        timedOut,
      });
    });
  });
}

function runGitCommand(
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv },
): Promise<GitCommandResult> {
  return runProcessCommand("git", args, { cwd: options.cwd, env: options.env ?? gitEnv() });
}

function gitFailure(input: {
  stage: string;
  args: string[];
  result: GitCommandResult;
  message?: string;
}): CreateGitBootstrapError {
  return new CreateGitBootstrapError({
    message: input.message ?? "Create git bootstrap command failed.",
    details: {
      gitBootstrapCode: "VE_CREATE_GIT_BOOTSTRAP_FAILED",
      stage: input.stage,
      command: ["git", ...input.args],
      exitCode: input.result.exitCode,
      signal: input.result.signal,
      errorCode: input.result.errorCode,
      errorMessage: input.result.errorMessage,
      timedOut: input.result.timedOut,
      stdout: truncateGitDetail(input.result.stdout.trimEnd()),
      stderr: truncateGitDetail(input.result.stderr.trimEnd()),
    },
  });
}

function dependencyLockfileFailure(input: {
  stage: string;
  result: GitCommandResult;
  message?: string;
}): CreateDependencyLockfileError {
  return new CreateDependencyLockfileError({
    message: input.message ?? "Create dependency lockfile generation failed.",
    details: {
      dependencyLockfileCode: "VE_CREATE_DEPENDENCY_LOCKFILE_FAILED",
      stage: input.stage,
      command: [CREATE_LOCKFILE_COMMAND, ...CREATE_LOCKFILE_ARGS],
      exitCode: input.result.exitCode,
      signal: input.result.signal,
      errorCode: input.result.errorCode,
      errorMessage: input.result.errorMessage,
      timedOut: input.result.timedOut,
      stdout: truncateGitDetail(input.result.stdout.trimEnd()),
      stderr: truncateGitDetail(input.result.stderr.trimEnd()),
    },
  });
}

async function requireGitCommand(
  stage: string,
  cwd: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<string> {
  const result = await runGitCommand(args, { cwd, env });
  if (result.errorMessage !== null || result.exitCode !== 0)
    throw gitFailure({ stage, args, result });
  return result.stdout.trimEnd();
}

async function readGitConfigValue(cwd: string, key: string): Promise<string | null> {
  const args = ["config", "--get", key];
  const result = await runGitCommand(args, { cwd, env: gitEnv() });
  if (result.errorMessage !== null) throw gitFailure({ stage: "identity_probe", args, result });
  if (result.exitCode === 1) return null;
  if (result.exitCode !== 0) throw gitFailure({ stage: "identity_probe", args, result });
  const value = result.stdout.trim();
  return value.length > 0 ? value : null;
}

async function commitIdentityEnv(cwd: string): Promise<NodeJS.ProcessEnv> {
  const [configuredName, configuredEmail] = await Promise.all([
    readGitConfigValue(cwd, "user.name"),
    readGitConfigValue(cwd, "user.email"),
  ]);
  if (configuredName !== null && configuredEmail !== null) return gitEnv();
  const name = configuredName ?? CREATE_GIT_DEFAULT_AUTHOR.name;
  const email = configuredEmail ?? CREATE_GIT_DEFAULT_AUTHOR.email;
  return gitEnv({
    GIT_AUTHOR_NAME: name,
    GIT_AUTHOR_EMAIL: email,
    GIT_COMMITTER_NAME: name,
    GIT_COMMITTER_EMAIL: email,
  });
}

async function normalizeDependencyLockfile(lockfilePath: string): Promise<void> {
  // pnpm install canonicalizes most legacy package engine metadata to the standard mapping
  // form, while @expo/bunyan's legacy engines array remains serialized with pnpm's numeric
  // key form. Keep the starter's committed lockfile byte-for-byte aligned with a subsequent
  // full install so the freshly generated repository stays clean.
  const original = await readFile(lockfilePath, "utf8");
  let normalized = original.replace(
    /engines: \{'0': node >=0\.10\.0\}/gu,
    "engines: {node: '>=0.10.0'}",
  );
  normalized = normalized.replace(
    /(  '@expo\/bunyan@4\.0\.1':\n(?:    [^\n]*\n)*?    engines: )\{node: '>=0\.10\.0'\}/u,
    "$1{'0': node >=0.10.0}",
  );
  if (normalized !== original) await writeFile(lockfilePath, normalized, "utf8");
}

async function generateDependencyLockfile(targetRoot: string): Promise<DependencyLockfileMetadata> {
  const cwd = resolve(targetRoot);
  const result = await runProcessCommand(CREATE_LOCKFILE_COMMAND, [...CREATE_LOCKFILE_ARGS], {
    cwd,
    env: process.env,
    timeoutMs: CREATE_LOCKFILE_TIMEOUT_MS,
  });
  if (result.errorMessage !== null || result.exitCode !== 0) {
    throw dependencyLockfileFailure({ stage: "pnpm_install_for_lockfile", result });
  }
  const lockfilePath = resolve(cwd, CREATE_LOCKFILE_PATH);
  if (!existsSync(lockfilePath)) {
    throw dependencyLockfileFailure({
      stage: "verify_lockfile_written",
      result,
      message: "Create dependency lockfile generation did not produce pnpm-lock.yaml.",
    });
  }
  await normalizeDependencyLockfile(lockfilePath);
  return {
    generated: true,
    path: lockfilePath,
    command: [CREATE_LOCKFILE_COMMAND, ...CREATE_LOCKFILE_ARGS],
  };
}

async function bootstrapFreshGitRepository(targetRoot: string): Promise<GitBootstrapMetadata> {
  const cwd = resolve(targetRoot);
  const baseEnv = gitEnv();
  await requireGitCommand("preflight", cwd, ["--version"], baseEnv);

  const preferredInit = await runGitCommand(["init", "--initial-branch=main"], {
    cwd,
    env: baseEnv,
  });
  if (preferredInit.errorMessage !== null || preferredInit.exitCode !== 0) {
    await requireGitCommand("init", cwd, ["init"], baseEnv);
    await requireGitCommand(
      "init_branch",
      cwd,
      ["symbolic-ref", "HEAD", "refs/heads/main"],
      baseEnv,
    );
  }

  await requireGitCommand("add", cwd, ["add", "-A"], baseEnv);
  await requireGitCommand(
    "commit",
    cwd,
    ["commit", "--no-gpg-sign", "-m", CREATE_GIT_BOOTSTRAP_MESSAGE],
    await commitIdentityEnv(cwd),
  );
  const statusShort = await requireGitCommand("status", cwd, ["status", "--short"], baseEnv);
  if (statusShort.length > 0) {
    throw new CreateGitBootstrapError({
      message: "Create git bootstrap left the generated repository dirty.",
      details: {
        gitBootstrapCode: "VE_CREATE_GIT_BOOTSTRAP_DIRTY_STATUS",
        stage: "verify_clean_status",
        statusShort: truncateGitDetail(statusShort),
      },
    });
  }

  const branch = await requireGitCommand(
    "branch",
    cwd,
    ["rev-parse", "--abbrev-ref", "HEAD"],
    baseEnv,
  );
  const commit = await requireGitCommand("commit_sha", cwd, ["rev-parse", "HEAD"], baseEnv);
  return {
    initialized: true,
    branch: branch.trim(),
    commit: commit.trim(),
    message: CREATE_GIT_BOOTSTRAP_MESSAGE,
    statusShort,
  };
}

function commandResult(envelope: UnknownRecord): { envelope: UnknownRecord } {
  return { envelope };
}

function invalid(
  invocation: CommandInvocation,
  options: { code?: string; classification?: string; message: string; details?: UnknownRecord },
): { envelope: UnknownRecord } {
  return commandResult(
    makeInvalidInvocationEnvelope(invocation, {
      code: options.code ?? CliErrorCode.InvalidInvocation,
      classification: options.classification ?? CliClassification.InvalidInvocation,
      message: options.message,
      details: options.details ?? {},
    }),
  );
}

function unknownFlag(invocation: CommandInvocation, token: string): { envelope: UnknownRecord } {
  const displayFlag = sanitizeFlagForDisplay(token);
  return invalid(invocation, {
    code: CliErrorCode.InvalidFlag,
    message: `Unsupported create flag: ${displayFlag}. Create accepts project naming, --agentic-harness (${SUPPORTED_AGENTIC_HARNESSES.join(", ")}), --brief, --no-mobile, --web-only, and global envelope flags.`,
    details: {
      flag: displayFlag,
      acceptedValueFlags: [...VALUE_FLAGS],
      acceptedBooleanFlags: [...BOOLEAN_FLAGS],
      supportedAgenticHarnesses: [...SUPPORTED_AGENTIC_HARNESSES],
    },
  });
}

function missingFlagValue(
  invocation: CommandInvocation,
  flag: string,
): { envelope: UnknownRecord } {
  return invalid(invocation, {
    code: CliErrorCode.MissingFlagValue,
    message: `Missing value for ${sanitizeFlagForDisplay(flag)}.`,
    details: { flag: sanitizeFlagForDisplay(flag) },
  });
}

function canonicalValueFlag(flag: string): string {
  return BRIEF_FLAGS.has(flag) ? "--brief" : flag;
}

function parseCreateOptions(invocation: CommandInvocation, args: string[]): ParseResult {
  const values = new Map<string, string>();
  const booleans = new Set<string>();
  const seenFlags = new Set<string>();
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index] ?? "";
    const parsed = parseFlagToken(token);
    if (!parsed.isFlag) {
      positionals.push(token);
      continue;
    }
    const flag = typeof parsed.flag === "string" ? parsed.flag : "";
    if (BOOLEAN_FLAGS.has(flag)) {
      if (seenFlags.has(flag))
        return {
          ok: false,
          envelope: invalid(invocation, {
            message: "Duplicate create flag is not allowed.",
            details: { flag: sanitizeFlagForDisplay(flag) },
          }).envelope,
        };
      seenFlags.add(flag);
      booleans.add(flag);
      continue;
    }
    if (!VALUE_FLAGS.has(flag))
      return { ok: false, envelope: unknownFlag(invocation, token).envelope };
    const canonicalFlag = canonicalValueFlag(flag);
    if (seenFlags.has(canonicalFlag))
      return {
        ok: false,
        envelope: invalid(invocation, {
          message: "Duplicate create flag is not allowed.",
          details: { flag: sanitizeFlagForDisplay(flag) },
        }).envelope,
      };
    seenFlags.add(canonicalFlag);
    const value = parsed.hasInlineValue ? parsed.value : args[index + 1];
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      (!parsed.hasInlineValue && value.startsWith("--"))
    ) {
      return { ok: false, envelope: missingFlagValue(invocation, flag).envelope };
    }
    values.set(canonicalFlag, value);
    if (!parsed.hasInlineValue) index += 1;
  }

  if (positionals.length > 1) {
    return {
      ok: false,
      envelope: invalid(invocation, {
        message: "Unexpected positional arguments for create.",
        details: { positionalCount: positionals.length },
      }).envelope,
    };
  }
  if (positionals.length === 1) {
    if (values.has("--target-root")) {
      return {
        ok: false,
        envelope: invalid(invocation, {
          message: "Duplicate create target is not allowed.",
          details: { flag: "--target-root", positionalCount: 1 },
        }).envelope,
      };
    }
    values.set("--target-root", positionals[0] ?? "");
  }

  if (booleans.has("--no-mobile") && booleans.has("--web-only")) {
    return {
      ok: false,
      envelope: invalid(invocation, {
        message: "Create starter scope flags are mutually exclusive.",
        details: { flags: ["--no-mobile", "--web-only"] },
      }).envelope,
    };
  }
  const starterScope: StarterScopeId = booleans.has("--web-only")
    ? "web-only"
    : booleans.has("--no-mobile")
      ? "no-mobile"
      : "default";

  const targetRootRaw = values.get("--target-root") ?? null;
  const targetRoot = targetRootRaw === null ? null : resolve(targetRootRaw);

  const projectNameRaw = values.get("--project-name");
  const projectName =
    typeof projectNameRaw === "string" && projectNameRaw.trim().length > 0
      ? projectNameRaw.trim()
      : null;

  const agenticHarnessRaw = values.get("--agentic-harness");
  const agenticHarness =
    typeof agenticHarnessRaw === "string" && agenticHarnessRaw.trim().length > 0
      ? agenticHarnessRaw.trim()
      : null;
  const brief = values.get("--brief") ?? null;

  const resultFileRaw = values.get("--result-file");
  const resultFile = resultFileRaw === undefined ? undefined : resolve(resultFileRaw);

  return {
    ok: true,
    options: {
      targetRoot,
      projectName,
      agenticHarness,
      brief,
      starterScope,
      ...(resultFile === undefined ? {} : { resultFile }),
      json: booleans.has("--json"),
      nonInteractive: booleans.has("--non-interactive"),
    },
  };
}

function producer(invocation: CommandInvocation): UnknownRecord {
  return {
    kind: "agent",
    id: "i-15a-create-command",
    name: "@vibe-engineer/cli",
    version: "1.0.0",
    runId: invocation.id,
  };
}

function generatedAt(invocation: CommandInvocation): string {
  return typeof invocation.startedAt === "string" && invocation.startedAt.length > 0
    ? invocation.startedAt
    : new Date().toISOString();
}

function setupGuidance(scope: StarterScopeMetadata): UnknownRecord {
  return {
    pnpmApproveBuilds: {
      when: "If pnpm reports ignored build scripts or prompts for approval during install.",
      command: "pnpm approve-builds",
      guidance: scope.includesApi
        ? "Approve only trusted build scripts for intentionally installed API/web tooling such as Prisma, NestJS, and esbuild packages."
        : "Web-only projects should approve only trusted web-tooling build scripts such as esbuild if prompted; no API/Prisma packages are generated.",
    },
    nestTsxDependencyInjection: scope.includesApi
      ? {
          applies: true,
          guidance:
            "The generated API runs with tsx, so NestJS constructors must use explicit @Inject(...) tokens or explicit provider wiring instead of relying on emitted decorator metadata.",
        }
      : { applies: false, guidance: "NestJS API files are omitted by this starter scope." },
    prismaMigrationDoctor: scope.includesPrisma
      ? {
          applies: true,
          command: "vibe-engineer doctor --project-root . --json --non-interactive",
          guidance:
            "Doctor reports missing or empty Prisma migration.sql files with safe local cleanup guidance before rerunning db:migrate.",
        }
      : { applies: false, guidance: "Prisma checks are omitted by this starter scope." },
  };
}

async function completeCreateOptions(
  invocation: CommandInvocation,
  parsed: ParsedCreateOptions,
  mode: "create" | "import",
): Promise<CompleteOptionsResult> {
  let targetRoot = parsed.targetRoot;
  let projectName = parsed.projectName;
  let agenticHarness = parsed.agenticHarness;
  let brief = parsed.brief;
  const canPrompt =
    !parsed.nonInteractive && Boolean(promptInput.isTTY) && Boolean(promptOutput.isTTY);

  if (targetRoot === null && canPrompt) {
    const fallbackTarget = mode === "import" ? "." : "./my-vibe-project";
    const rl = createInterface({ input: promptInput, output: promptOutput });
    try {
      const targetAnswer = (
        await rl.question(
          `${mode === "import" ? "Existing project root" : "Target directory"} [${fallbackTarget}]: `,
        )
      ).trim();
      targetRoot = resolve(targetAnswer.length > 0 ? targetAnswer : fallbackTarget);
      const defaultName = basename(targetRoot) || "project";
      const nameAnswer = (await rl.question(`Project name [${defaultName}]: `)).trim();
      projectName = nameAnswer.length > 0 ? nameAnswer : defaultName;
      const harnessAnswer = (
        await rl.question(
          `Agentic harness (${SUPPORTED_AGENTIC_HARNESSES.join("|")}) [${DEFAULT_AGENTIC_HARNESS}]: `,
        )
      ).trim();
      agenticHarness = harnessAnswer.length > 0 ? harnessAnswer : DEFAULT_AGENTIC_HARNESS;
      const briefAnswer = (await rl.question("Project brief (optional): ")).trim();
      brief = briefAnswer.length > 0 ? briefAnswer : null;
    } finally {
      rl.close();
    }
  }

  if (targetRoot === null) {
    return {
      ok: false,
      envelope: invalid(invocation, {
        code: CliErrorCode.MissingFlagValue,
        message: "Missing required create flag.",
        details: { flag: "--target-root" },
      }).envelope,
    };
  }

  if (canPrompt && parsed.targetRoot !== null) {
    const rl = createInterface({ input: promptInput, output: promptOutput });
    try {
      const defaultName = basename(targetRoot) || "project";
      if (projectName === null) {
        const nameAnswer = (await rl.question(`Project name [${defaultName}]: `)).trim();
        projectName = nameAnswer.length > 0 ? nameAnswer : defaultName;
      }
      if (agenticHarness === null) {
        const harnessAnswer = (
          await rl.question(
            `Agentic harness (${SUPPORTED_AGENTIC_HARNESSES.join("|")}) [${DEFAULT_AGENTIC_HARNESS}]: `,
          )
        ).trim();
        agenticHarness = harnessAnswer.length > 0 ? harnessAnswer : DEFAULT_AGENTIC_HARNESS;
      }
      if (brief === null) {
        const briefAnswer = (await rl.question("Project brief (optional): ")).trim();
        brief = briefAnswer.length > 0 ? briefAnswer : null;
      }
    } finally {
      rl.close();
    }
  }

  if (mode === "import" && parsed.starterScope !== "default") {
    return {
      ok: false,
      envelope: invalid(invocation, {
        code: CliErrorCode.InvalidFlag,
        message: "Starter scope flags are supported only by create.",
        details: { starterScope: parsed.starterScope, supportedCommand: "create" },
      }).envelope,
    };
  }

  return {
    ok: true,
    options: {
      targetRoot,
      projectName: projectName ?? (basename(targetRoot) || "project"),
      agenticHarness: agenticHarness ?? DEFAULT_AGENTIC_HARNESS,
      brief,
      starterScope: parsed.starterScope,
      ...(parsed.resultFile === undefined ? {} : { resultFile: parsed.resultFile }),
      json: parsed.json,
      nonInteractive: parsed.nonInteractive,
    },
  };
}

async function finalizeEnvelope(
  envelope: UnknownRecord,
  resultFile?: string,
): Promise<UnknownRecord> {
  let finalEnvelope: UnknownRecord = envelope;
  if (resultFile !== undefined) {
    await mkdir(dirname(resultFile), { recursive: true });
    finalEnvelope = {
      ...finalEnvelope,
      artifacts: [
        ...(Array.isArray(finalEnvelope.artifacts) ? finalEnvelope.artifacts : []),
        makeArtifactDescriptor({
          kind: "cli_result",
          path: resultFile,
          schemaVersion:
            typeof finalEnvelope.schemaVersion === "string" ? finalEnvelope.schemaVersion : null,
          role: "report",
        }),
      ],
    };
  }
  const validation = makeValidateCliResultEnvelope(finalEnvelope);
  if (!validation.ok) {
    const invocationRef = isRecord(finalEnvelope.invocation)
      ? (finalEnvelope.invocation as CommandInvocation)
      : (envelope.invocation as CommandInvocation);
    finalEnvelope = makeCreateEnvelope({
      invocation: invocationRef,
      status: "failure",
      payload: makePayload("internal_error", { accepted: false }),
      diagnostics: [
        makeDiagnostic({
          code: CliErrorCode.InvalidEnvelope,
          classification: CliClassification.InternalError,
          message: "Create command generated an invalid result envelope.",
        }),
      ],
      errors: [
        makeCliError({
          code: CliErrorCode.InvalidEnvelope,
          classification: CliClassification.InternalError,
          message: "Create command generated an invalid result envelope.",
          details: { validationErrors: (validation as { errors: string[] }).errors },
        }),
      ],
    });
  }
  if (resultFile !== undefined) {
    try {
      await makeWriteResultFileAtomic(resultFile, finalEnvelope);
    } catch {
      const invocationRef = isRecord(finalEnvelope.invocation)
        ? (finalEnvelope.invocation as CommandInvocation)
        : (envelope.invocation as CommandInvocation);
      finalEnvelope = makeCreateEnvelope({
        invocation: invocationRef,
        status: "blocked",
        payload: makePayload("result_file_error", { resultFile }),
        diagnostics: [
          makeDiagnostic({
            code: CliErrorCode.ResultFileWriteFailed,
            classification: CliClassification.WriteConflict,
            message: "Result file could not be written atomically.",
            path: resultFile,
          }),
        ],
      });
    }
  }
  return finalEnvelope;
}

export async function runCreate(
  { invocation, args }: CommandContext,
  mode: "create" | "import",
): Promise<{ envelope: UnknownRecord }> {
  const parsed = parseCreateOptions(invocation, args);
  if (!parsed.ok) return commandResult(parsed.envelope);
  const completed = await completeCreateOptions(invocation, parsed.options, mode);
  if (!completed.ok) return commandResult(completed.envelope);
  const options = completed.options;

  // Selected-harness adapter gate. Supported ids are exactly pi, claude-code, codex; no Pi fallback.
  const selectedResult = resolveSelectedHarness(options.agenticHarness);
  if (!selectedResult.ok) {
    const gateError = selectedResult.error;
    const isUnsupported = gateError.classification === CliClassification.UnsupportedOperation;
    const envelope = makeCreateEnvelope({
      invocation,
      status: "blocked",
      payload: makePayload("create_result", {
        ok: false,
        stage: "harness_selection",
        requestedHarness: options.agenticHarness,
        supported: [...SUPPORTED_AGENTIC_HARNESSES],
      }),
      diagnostics: [
        makeDiagnostic({
          code: isUnsupported ? CliErrorCode.UnsupportedOperation : CliErrorCode.MissingConfig,
          classification: gateError.classification,
          message: gateError.message,
        }),
      ],
      errors: [
        makeCliError({
          code: isUnsupported ? CliErrorCode.UnsupportedOperation : CliErrorCode.MissingConfig,
          classification: gateError.classification,
          blocking: true,
          message: gateError.message,
          details: gateError.details,
        }),
      ],
    });
    return commandResult(await finalizeEnvelope(envelope, options.resultFile));
  }
  const selected = selectedResult.selected;

  // Brief validation (DL-17 / DL-22): secret-bearing or oversized brief → typed blocked; no secret echo.
  let briefForBootstrap: string | null = options.brief;
  if (options.brief !== null) {
    const trimmed = options.brief.trim();
    if (trimmed.length === 0) {
      briefForBootstrap = null;
    } else if (Buffer.byteLength(options.brief, "utf8") > MAX_BRIEF_BYTES) {
      const envelope = makeCreateEnvelope({
        invocation,
        status: "blocked",
        payload: makePayload("create_result", {
          ok: false,
          stage: "brief_validation",
          briefStatus: "rejected",
          reason: "oversized",
        }),
        diagnostics: [
          makeDiagnostic({
            code: CliErrorCode.InvalidInvocation,
            classification: CliClassification.InvalidInput,
            message: "Project brief exceeds the maximum accepted size.",
          }),
        ],
        errors: [
          makeCliError({
            code: CliErrorCode.InvalidInvocation,
            classification: CliClassification.InvalidInput,
            blocking: true,
            message: "Project brief exceeds the maximum accepted size.",
            details: { maxBytes: MAX_BRIEF_BYTES },
          }),
        ],
      });
      return commandResult(await finalizeEnvelope(envelope, options.resultFile));
    } else if (isSecretLikeBrief(options.brief)) {
      const envelope = makeCreateEnvelope({
        invocation,
        status: "blocked",
        payload: makePayload("create_result", {
          ok: false,
          stage: "brief_validation",
          briefStatus: "rejected",
          reason: "secret_like",
          brief: "<redacted>",
        }),
        diagnostics: [
          makeDiagnostic({
            code: CliErrorCode.InvalidInvocation,
            classification: CliClassification.SafetyPolicyBlock,
            message: "Secret-like project brief input is not accepted.",
          }),
        ],
        errors: [
          makeCliError({
            code: CliErrorCode.InvalidInvocation,
            classification: CliClassification.SafetyPolicyBlock,
            blocking: true,
            message: "Secret-like project brief input is not accepted.",
            details: { brief: "<redacted>" },
          }),
        ],
      });
      return commandResult(await finalizeEnvelope(envelope, options.resultFile));
    }
  }

  // For import mode, the target root must already exist (existing project).
  if (
    mode === "import" &&
    (!existsSync(options.targetRoot) || !statSync(options.targetRoot).isDirectory())
  ) {
    const envelope = makeCreateEnvelope({
      invocation,
      status: "blocked",
      payload: makePayload("create_result", {
        ok: false,
        stage: "target_root",
        mode,
        targetRoot: options.targetRoot,
      }),
      diagnostics: [
        makeDiagnostic({
          code: CliErrorCode.InvalidInvocation,
          classification: CliClassification.InvalidInput,
          message: "Import target root must be an existing directory.",
        }),
      ],
      errors: [
        makeCliError({
          code: CliErrorCode.InvalidInvocation,
          classification: CliClassification.InvalidInput,
          blocking: true,
          message: "Import target root must be an existing directory.",
          details: { targetRoot: options.targetRoot },
        }),
      ],
    });
    return commandResult(await finalizeEnvelope(envelope, options.resultFile));
  }

  const bootstrap = buildBootstrap({
    projectName: options.projectName,
    selectedHarness: selected.adapter.id,
    brief: briefForBootstrap,
    generatedAt: generatedAt(invocation),
    producer: producer(invocation),
  });

  let starterMaterialization: Awaited<ReturnType<typeof materializeStarterTree>> | null = null;
  if (mode === "create") {
    try {
      starterMaterialization = await materializeStarterTree(options.targetRoot, {
        projectName: options.projectName,
        mode: "create",
        scope: options.starterScope,
      });
    } catch (error) {
      const record = isRecord(error) ? error : {};
      const code = isStarterTemplateError(error) ? error.code : CliErrorCode.InternalError;
      const classification = isStarterTemplateError(error)
        ? error.classification
        : CliClassification.InternalError;
      const details = isStarterTemplateError(error)
        ? error.details
        : {
            errorName: typeof record.name === "string" ? record.name : null,
            errorMessage: typeof record.message === "string" ? record.message : null,
          };
      const message =
        error instanceof Error ? error.message : "Starter template materialization failed.";
      const envelope = makeCreateEnvelope({
        invocation,
        status: "blocked",
        payload: makePayload("create_result", {
          ok: false,
          stage: "starter_materialization",
          mode,
          targetRoot: options.targetRoot,
        }),
        diagnostics: [makeDiagnostic({ code, classification, message })],
        errors: [makeCliError({ code, classification, blocking: true, message, details })],
      });
      return commandResult(await finalizeEnvelope(envelope, options.resultFile));
    }
  }

  let generated;
  try {
    generated = await writeGeneratedArtifacts(options.targetRoot, bootstrap, selected, {
      reset: mode === "create",
      starterScope: mode === "create" ? starterScopeFromId(options.starterScope) : null,
    });
  } catch (error) {
    const record = isRecord(error) ? error : {};
    const envelope = makeCreateEnvelope({
      invocation,
      status: "blocked",
      payload: makePayload("create_result", {
        ok: false,
        stage: "artifact_write",
        mode,
        targetRoot: options.targetRoot,
      }),
      diagnostics: [
        makeDiagnostic({
          code: CliErrorCode.InternalError,
          classification: CliClassification.InternalError,
          message: "Generated artifact write failed.",
        }),
      ],
      errors: [
        makeCliError({
          code: CliErrorCode.InternalError,
          classification: CliClassification.InternalError,
          blocking: true,
          message: "Generated artifact write failed.",
          details: {
            errorName: typeof record.name === "string" ? record.name : null,
            errorMessage: typeof record.message === "string" ? record.message : null,
          },
        }),
      ],
    });
    return commandResult(await finalizeEnvelope(envelope, options.resultFile));
  }

  let piHarnessAssets: Awaited<ReturnType<typeof writePiHarnessAssets>> | null = null;
  try {
    if (selected.piManifest !== null) {
      piHarnessAssets = await writePiHarnessAssets({
        targetRoot: options.targetRoot,
        mode,
        manifest: selected.piManifest.manifest,
        capabilityMatrix: selected.piManifest.matrix,
      });
    }
  } catch (error) {
    const record = isRecord(error) ? error : {};
    const code = isPiHarnessAssetError(error) ? error.code : CliErrorCode.InternalError;
    const classification = isPiHarnessAssetError(error)
      ? error.classification
      : CliClassification.InternalError;
    const details = isPiHarnessAssetError(error)
      ? error.details
      : {
          stage: "pi_asset_validation",
          errorName: typeof record.name === "string" ? record.name : null,
          errorMessage: typeof record.message === "string" ? record.message : null,
        };
    const message = error instanceof Error ? error.message : "Pi harness asset validation failed.";
    const envelope = makeCreateEnvelope({
      invocation,
      status: "blocked",
      payload: makePayload("create_result", {
        ok: false,
        stage: "pi_asset_validation",
        mode,
        targetRoot: options.targetRoot,
      }),
      diagnostics: [makeDiagnostic({ code, classification, message })],
      errors: [makeCliError({ code, classification, blocking: true, message, details })],
    });
    return commandResult(await finalizeEnvelope(envelope, options.resultFile));
  }

  let dependencyLockfile: DependencyLockfileMetadata | null = null;
  if (mode === "create") {
    try {
      dependencyLockfile = await generateDependencyLockfile(options.targetRoot);
    } catch (error) {
      const record = isRecord(error) ? error : {};
      const code =
        error instanceof CreateDependencyLockfileError ? error.code : CliErrorCode.InternalError;
      const classification =
        error instanceof CreateDependencyLockfileError
          ? error.classification
          : CliClassification.ExternalUnavailable;
      const details =
        error instanceof CreateDependencyLockfileError
          ? error.details
          : {
              dependencyLockfileCode: "VE_CREATE_DEPENDENCY_LOCKFILE_FAILED",
              stage: "dependency_lockfile",
              errorName: typeof record.name === "string" ? record.name : null,
              errorMessage: typeof record.message === "string" ? record.message : null,
            };
      const message = error instanceof Error ? error.message : "Create dependency lockfile failed.";
      const envelope = makeCreateEnvelope({
        invocation,
        status: "blocked",
        payload: makePayload("create_result", {
          ok: false,
          stage: "dependency_lockfile",
          mode,
          targetRoot: options.targetRoot,
        }),
        diagnostics: [makeDiagnostic({ code, classification, message, path: options.targetRoot })],
        errors: [makeCliError({ code, classification, blocking: true, message, details })],
      });
      return commandResult(await finalizeEnvelope(envelope, options.resultFile));
    }
  }

  let gitBootstrap: GitBootstrapMetadata | null = null;
  if (mode === "create") {
    try {
      gitBootstrap = await bootstrapFreshGitRepository(options.targetRoot);
    } catch (error) {
      const record = isRecord(error) ? error : {};
      const code =
        error instanceof CreateGitBootstrapError ? error.code : CliErrorCode.InternalError;
      const classification =
        error instanceof CreateGitBootstrapError
          ? error.classification
          : CliClassification.ExternalUnavailable;
      const details =
        error instanceof CreateGitBootstrapError
          ? error.details
          : {
              gitBootstrapCode: "VE_CREATE_GIT_BOOTSTRAP_FAILED",
              stage: "git_bootstrap",
              errorName: typeof record.name === "string" ? record.name : null,
              errorMessage: typeof record.message === "string" ? record.message : null,
            };
      const message = error instanceof Error ? error.message : "Create git bootstrap failed.";
      const envelope = makeCreateEnvelope({
        invocation,
        status: "blocked",
        payload: makePayload("create_result", {
          ok: false,
          stage: "git_bootstrap",
          mode,
          targetRoot: options.targetRoot,
        }),
        diagnostics: [makeDiagnostic({ code, classification, message, path: options.targetRoot })],
        errors: [makeCliError({ code, classification, blocking: true, message, details })],
      });
      return commandResult(await finalizeEnvelope(envelope, options.resultFile));
    }
  }

  const data = {
    ok: true,
    stage: "complete",
    mode,
    project: { name: options.projectName, slug: normalizeSlug(options.projectName) },
    selectedHarness: selected.adapter.id,
    briefStatus: bootstrap.briefStatus,
    targetRoot: options.targetRoot,
    starterScope:
      starterMaterialization === null
        ? { id: "not-applicable", mode }
        : starterMaterialization.scope,
    setupGuidance:
      starterMaterialization === null ? null : setupGuidance(starterMaterialization.scope),
    ...(dependencyLockfile === null ? {} : { dependencyLockfile }),
    ...(gitBootstrap === null ? {} : { git: gitBootstrap }),
    harnessConfig: generated.harnessConfigMeta,
    manifest: {
      adapterCapabilityVersion: selected.meta.adapterCapabilityVersion,
      generatedFileManifestVersion: selected.meta.generatedFileManifestVersion,
      ownedFamilies: selected.ownedFamilies.map((family) => ({
        familyId: family.familyId,
        readiness: "readiness" in family ? family.readiness.state : family.support,
      })),
      adapterContract: {
        schemaVersion: selected.adapter.capabilityMatrix.schemaVersion,
        displayName: selected.adapter.displayName,
        unsupportedFeaturePolicy: selected.adapter.unsupportedFeatureBehavior.policy,
        blockedFamilies: selected.adapter.unsupportedFeatureBehavior.blockedFamilies,
      },
    },
    generatedFiles: {
      configPath: generated.configPath,
      contextFiles: {
        agents: generated.agentsPath,
        claude: generated.claudePath,
        written: generated.contextFiles,
      },
      sourceRecord: generated.sourceRecordPath,
      selectedHarness: {
        metadata: generated.selectedHarnessMetadataPath,
        readme: generated.selectedHarnessReadmePath,
        handoff: generated.selectedHarnessHandoffPath,
      },
      runnerCatalog: generated.runnerCatalogPath,
      starterPresetManifest: generated.starterPresetManifestPath,
      starterReference: generated.starterReferencePath,
      architectureAgentReview: generated.architectureAgentReview,
      starterTemplate:
        starterMaterialization === null
          ? null
          : {
              layoutPath: starterMaterialization.layoutPath,
              templateRoot: starterMaterialization.templateRoot,
              fileCount: starterMaterialization.fileCount,
              writtenFiles: starterMaterialization.writtenFiles,
              omittedFiles: starterMaterialization.omittedFiles,
              scope: starterMaterialization.scope,
              overlayPaths: starterMaterialization.overlayPaths,
              substitutionPaths: [
                ...new Set([
                  ...starterMaterialization.substitutionPaths,
                  ...generated.starterTemplateMutationPaths,
                ]),
              ],
              projectSlug: starterMaterialization.projectSlug,
            },
      piAssets: (piHarnessAssets?.writtenAssets ?? []).map((asset) => ({
        kind: asset.kind,
        familyId: asset.familyId,
        skillId: asset.skillId,
        path: asset.path,
        targetPath: asset.targetPath,
        sha256: asset.sha256,
      })),
    },
    harnessAssets: {
      adapterId: selected.adapter.id,
      displayName: selected.adapter.displayName,
      writerStrategy: selected.adapter.assetWriter.strategy,
      nativeAssetFamilies: selected.adapter.assetWriter.nativeAssetFamilies,
      blockedAssetFamilies: selected.adapter.assetWriter.blockedAssetFamilies,
      noFallbackToPi: selected.adapter.assetWriter.noFallbackToPi,
      piAssetFamilies: piHarnessAssets?.piAssetFamilies ?? [],
      skillCount: piHarnessAssets?.skillCount ?? 0,
      promptCount: piHarnessAssets?.promptCount ?? 0,
      extensionsPolicy: piHarnessAssets?.extensionsPolicy ?? "blocked",
      manifestValidation: piHarnessAssets?.manifestValidation ?? "valid",
      conflictPolicy:
        piHarnessAssets?.conflictPolicy ??
        (mode === "create" ? "fail-on-conflict" : "allow-identical-overwrite"),
      runtimePrerequisiteDiagnostic: selected.adapter.runtimePrerequisiteDiagnostic,
      verificationRunnerInvocation: {
        ...selected.adapter.verificationRunnerInvocation,
        runnerImplemented: mode === "create",
        architectureAgentRunnerId: mode === "create" ? "architecture-agent-review" : null,
        implementationBoundary:
          mode === "create"
            ? "Generated starter includes the single default architecture agent runner; invocation uses the selected harness metadata and no Pi fallback."
            : "Import mode does not materialize a generated starter runner catalog.",
      },
      unsupportedFeatureBehavior: selected.adapter.unsupportedFeatureBehavior,
    },
    contextProject: {
      graphPath:
        typeof (generated.contextProject as UnknownRecord).graphPath === "string"
          ? (generated.contextProject as UnknownRecord).graphPath
          : null,
      indexPath:
        typeof (generated.contextProject as UnknownRecord).indexPath === "string"
          ? (generated.contextProject as UnknownRecord).indexPath
          : null,
    },
    provenanceLabels: bootstrap.provenanceMap,
  };

  const contextArtifacts = generated.contextFiles.map((contextFile) =>
    makeArtifactDescriptor({
      kind: "context_file",
      path: contextFile.path,
      schemaVersion:
        selected.adapter.id === "pi" ? "pi-context-file/v1" : "harness-context-file/v1",
      role: "context-files",
    }),
  );
  const piAssetArtifacts = (piHarnessAssets?.writtenAssets ?? []).map((asset) =>
    makeArtifactDescriptor({
      kind: asset.kind,
      path: asset.targetPath,
      schemaVersion: selected.meta.generatedFileManifestVersion,
      role: asset.familyId,
      sha256: asset.sha256,
    }),
  );
  const optionalHarnessArtifacts = [
    generated.runnerCatalogPath === null
      ? null
      : makeArtifactDescriptor({
          kind: "runner_catalog",
          path: generated.runnerCatalogPath,
          schemaVersion: "vibe-engineer.runner-catalog-harness.v1",
          role: "runner-catalog-harness-metadata",
        }),
    generated.starterPresetManifestPath === null
      ? null
      : makeArtifactDescriptor({
          kind: "starter_preset_manifest",
          path: generated.starterPresetManifestPath,
          schemaVersion: "vibe-engineer.starter-preset-harness.v1",
          role: "starter-preset-harness-metadata",
        }),
    generated.starterReferencePath === null
      ? null
      : makeArtifactDescriptor({
          kind: "starter_reference_doc",
          path: generated.starterReferencePath,
          schemaVersion: null,
          role: "starter-harness-guidance",
        }),
    generated.architectureAgentReview?.scriptPath === null ||
    generated.architectureAgentReview?.scriptPath === undefined
      ? null
      : makeArtifactDescriptor({
          kind: "verification_runner_script",
          path: generated.architectureAgentReview.scriptPath,
          schemaVersion: null,
          role: "architecture-agent-review-runner",
        }),
    generated.architectureAgentReview?.schemaPath === null ||
    generated.architectureAgentReview?.schemaPath === undefined
      ? null
      : makeArtifactDescriptor({
          kind: "verification_schema",
          path: generated.architectureAgentReview.schemaPath,
          schemaVersion: "vibe-engineer.architecture-agent-review.v1",
          role: "architecture-agent-review-schema",
        }),
    generated.architectureAgentReview?.promptPath === null ||
    generated.architectureAgentReview?.promptPath === undefined
      ? null
      : makeArtifactDescriptor({
          kind: "verification_prompt",
          path: generated.architectureAgentReview.promptPath,
          schemaVersion: null,
          role: "architecture-agent-review-prompt",
        }),
  ].filter((artifact): artifact is UnknownRecord => artifact !== null);
  const artifacts = [
    makeArtifactDescriptor({
      kind: "vibe_config",
      path: generated.configPath,
      schemaVersion: "vibe-engineer.config.v1",
      role: "harness-config",
    }),
    makeArtifactDescriptor({
      kind: "selected_harness_metadata",
      path: generated.selectedHarnessMetadataPath,
      schemaVersion: "vibe-engineer.selected-harness.v1",
      role: "selected-harness-metadata",
    }),
    makeArtifactDescriptor({
      kind: "selected_harness_guidance",
      path: generated.selectedHarnessReadmePath,
      schemaVersion: null,
      role: "selected-harness-guidance",
    }),
    makeArtifactDescriptor({
      kind: "selected_harness_handoff",
      path: generated.selectedHarnessHandoffPath,
      schemaVersion: null,
      role: "selected-harness-handoff",
    }),
    ...contextArtifacts,
    ...piAssetArtifacts,
    ...optionalHarnessArtifacts,
  ];

  const envelope = makeCreateEnvelope({
    invocation,
    status: "success",
    payload: makePayload("create_result", data),
    artifacts,
  });
  return commandResult(await finalizeEnvelope(envelope, options.resultFile));
}

async function run(context: CommandContext): Promise<{ envelope: UnknownRecord }> {
  return runCreate(context, "create");
}

export const createCommand = Object.freeze({
  id: "create",
  visibility: "starter",
  description:
    "Create a new vibe-engineer starter project with a selected pi, Claude Code, or Codex agentic harness and DL-17 bootstrap context.",
  run,
});

export default createCommand;
