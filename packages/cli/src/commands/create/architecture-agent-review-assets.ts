import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

import type {
  BootstrapArtifacts,
  GeneratedStarterScope,
  SelectedHarness,
} from "./selected-harness.ts";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

export type ArchitectureAgentReviewAssets = {
  runnerId: typeof ARCHITECTURE_AGENT_REVIEW_RUNNER_ID;
  runnerCatalogPath: string | null;
  runnerCatalogMutationPath: string | null;
  runnerCatalogEntryAdded: boolean;
  scriptPath: string | null;
  promptPath: string | null;
  schemaPath: string | null;
  readmePath: string | null;
  starterReferencePath: string | null;
  mutationPaths: readonly string[];
};

export const ARCHITECTURE_AGENT_REVIEW_RUNNER_ID = "architecture-agent-review";

const ARCHITECTURE_AGENT_REVIEW_SCHEMA_VERSION = "vibe-engineer.architecture-agent-review.v1";
const PORTABLE_NODE_RUNTIME_COMMAND = "vibe-engineer:node";
const ARCHITECTURE_AGENT_REVIEW_SCRIPT_PATH = ".tooling/scripts/architecture-agent-review.mjs";
const ARCHITECTURE_AGENT_REVIEW_PROMPT_PATH =
  ".vibe/verification/architecture-agent-review/prompt.md";
const ARCHITECTURE_AGENT_REVIEW_SCHEMA_PATH =
  ".vibe/verification/architecture-agent-review/schema.json";
const ARCHITECTURE_AGENT_REVIEW_README_PATH =
  ".vibe/verification/architecture-agent-review/README.md";
const ARCHITECTURE_AGENT_REVIEW_OUTPUT_PATH =
  ".vibe/evidence/architecture-agent-review/review.json";

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJsonObject(value: unknown): JsonObject {
  const jsonValue = JSON.parse(JSON.stringify(value)) as JsonValue;
  return isJsonObject(jsonValue) ? jsonValue : {};
}

function formatJsonPrimitive(value: JsonPrimitive): string {
  return JSON.stringify(value);
}

function formatJsonForPrettier(value: JsonValue, indent = 0, prefixLength = 0): string {
  const indentation = " ".repeat(indent);
  const childIndentation = " ".repeat(indent + 2);
  if (value === null || typeof value !== "object") return formatJsonPrimitive(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((item) => item === null || typeof item !== "object")) {
      const inline = `[${value.map((item) => formatJsonPrimitive(item as JsonPrimitive)).join(", ")}]`;
      if (indent + prefixLength + inline.length <= 99) return inline;
    }
    return `[
${value
  .map((item) => `${childIndentation}${formatJsonForPrettier(item, indent + 2)}`)
  .join(",\n")}
${indentation}]`;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return "{}";
  return `{
${entries
  .map(([key, item]) => {
    const prefix = `${childIndentation}${JSON.stringify(key)}: `;
    return `${prefix}${formatJsonForPrettier(item, indent + 2, prefix.length - childIndentation.length)}`;
  })
  .join(",\n")}
${indentation}}`;
}

async function readJsonValueIfPresent(pathValue: string): Promise<JsonValue | null> {
  if (!existsSync(pathValue)) return null;
  return JSON.parse(await readFile(pathValue, "utf8")) as JsonValue;
}

function relativeProjectPath(targetRoot: string, pathValue: string): string {
  return relative(resolve(targetRoot), pathValue).replaceAll("\\", "/");
}

function replaceMarkedSection(text: string, marker: string, replacement: string): string {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);
  const body = replacement.trimEnd();
  const marked = `${start}\n\n${body}\n\n${end}`;
  if (startIndex >= 0 && endIndex > startIndex) {
    return `${text.slice(0, startIndex)}${marked}${text.slice(endIndex + end.length)}`;
  }
  return `${text.trimEnd()}\n\n${marked}\n`;
}

function scopeMetadataJson(scope: GeneratedStarterScope): JsonObject {
  return toJsonObject({
    id: scope.id,
    label: scope.label,
    flags: scope.flags,
    apps: scope.apps,
    packages: scope.packages,
    generatedSurfaces: scope.generatedSurfaces,
    omittedSurfaces: scope.omittedSurfaces,
    omittedChecks: scope.omittedChecks,
    includesApi: scope.includesApi,
    includesWeb: scope.includesWeb,
    includesMobile: scope.includesMobile,
    includesPrisma: scope.includesPrisma,
  });
}

function runnerCatalogHarnessMetadata(
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
): JsonObject {
  const { adapter } = selected;
  return toJsonObject({
    schemaVersion: "vibe-engineer.runner-catalog-harness.v1",
    generatedAt: bootstrap.sourceRecord.generatedAt,
    adapterId: adapter.id,
    displayName: adapter.displayName,
    noFallbackToPi: adapter.assetWriter.noFallbackToPi,
    contextFiles: adapter.assetWriter.contextFiles,
    nativeAssetFamilies: adapter.assetWriter.nativeAssetFamilies,
    blockedAssetFamilies: adapter.assetWriter.blockedAssetFamilies,
    unsupportedFeaturePolicy: adapter.unsupportedFeatureBehavior.policy,
    runnerImplemented: true,
    architectureAgentRunner: {
      runnerId: ARCHITECTURE_AGENT_REVIEW_RUNNER_ID,
      implemented: true,
      invocationMetadataPath: ".vibe/harness/selected-harness.json",
      unavailableRuntimeBehavior: adapter.verificationRunnerInvocation.unavailableRuntimeBehavior,
      noFallbackToPi: adapter.assetWriter.noFallbackToPi,
    },
    liveInvocation: {
      recommendedCommand: adapter.verificationRunnerInvocation.recommendedCommand,
      unavailableRuntimeBehavior: adapter.verificationRunnerInvocation.unavailableRuntimeBehavior,
      runtimePrerequisiteDiagnostic: adapter.runtimePrerequisiteDiagnostic,
      structuredOutput: adapter.structuredOutput,
      failClosed: true,
    },
  });
}

function starterPresetArchitectureMetadata(
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
): JsonObject {
  return toJsonObject({
    schemaVersion: "vibe-engineer.starter-architecture-agent-review.v1",
    generatedAt: bootstrap.sourceRecord.generatedAt,
    runnerId: ARCHITECTURE_AGENT_REVIEW_RUNNER_ID,
    runnerImplemented: true,
    adapterId: selected.adapter.id,
    noFallbackToPi: selected.adapter.assetWriter.noFallbackToPi,
    outputPath: ARCHITECTURE_AGENT_REVIEW_OUTPUT_PATH,
    promptPath: ARCHITECTURE_AGENT_REVIEW_PROMPT_PATH,
    schemaPath: ARCHITECTURE_AGENT_REVIEW_SCHEMA_PATH,
  });
}

function runnerEnv(): JsonObject {
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
  };
  for (const key of ["HOME", "XDG_CONFIG_HOME", "CLAUDE_CONFIG_DIR", "CODEX_HOME"]) {
    const value = process.env[key];
    if (typeof value === "string" && value.length > 0) env[key] = value;
  }
  return toJsonObject(env);
}

function architectureRunnerCatalogEntry(
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
  scope: GeneratedStarterScope,
): JsonObject {
  const scopeMetadata = scopeMetadataJson(scope);
  return toJsonObject({
    kind: "command",
    id: ARCHITECTURE_AGENT_REVIEW_RUNNER_ID,
    requiredItemIds: [ARCHITECTURE_AGENT_REVIEW_RUNNER_ID],
    layer: "advisory_review",
    layerEquivalent: "architecture_review",
    layerEquivalentReason:
      "The current Artifact schemas expose advisory_review but not architecture_review; this single agent runner is the generated starter architecture review gate.",
    evidenceClass: "deterministic",
    blocking: true,
    runnerType: "agent",
    agentRunner: true,
    description:
      "Single default architecture agent review for generated starters; invokes only the selected harness and emits structured passed/failed/blocked evidence.",
    command: PORTABLE_NODE_RUNTIME_COMMAND,
    args: [ARCHITECTURE_AGENT_REVIEW_SCRIPT_PATH],
    cwd: ".",
    argPaths: [{ index: 0, root: "projectRoot" }],
    expectedArtifacts: [ARCHITECTURE_AGENT_REVIEW_OUTPUT_PATH],
    env: runnerEnv(),
    safety: {
      classification: "local_deterministic_write",
      timeoutMs: 30000,
      maxStdoutBytes: 500000,
      maxStderrBytes: 500000,
      maxOutputBytes: 1200000,
      passThroughEnv: false,
      envAllowlist: ["PATH", "HOME", "XDG_CONFIG_HOME", "CLAUDE_CONFIG_DIR", "CODEX_HOME"],
      allowedWriteRoots: [".vibe/evidence"],
    },
    starterScope: scopeMetadata,
    vibeEngineerHarness: runnerCatalogHarnessMetadata(selected, bootstrap),
    architectureReview: {
      schemaVersion: "vibe-engineer.runner-catalog-architecture-review.v1",
      outputSchemaVersion: ARCHITECTURE_AGENT_REVIEW_SCHEMA_VERSION,
      promptPath: ARCHITECTURE_AGENT_REVIEW_PROMPT_PATH,
      outputSchemaPath: ARCHITECTURE_AGENT_REVIEW_SCHEMA_PATH,
      evidenceOutputPath: ARCHITECTURE_AGENT_REVIEW_OUTPUT_PATH,
      scriptPath: ARCHITECTURE_AGENT_REVIEW_SCRIPT_PATH,
      diffBasis: "git diff from the initial create commit when available",
      selectedHarnessMetadataPath: ".vibe/harness/selected-harness.json",
      noFallbackToPi: selected.adapter.assetWriter.noFallbackToPi,
      checkedBoundaries: {
        backend: scope.includesApi,
        web: scope.includesWeb,
        mobile: scope.includesMobile,
      },
      omittedBoundaries: [
        ...(scope.includesApi ? [] : ["backend"]),
        ...(scope.includesWeb ? [] : ["web"]),
        ...(scope.includesMobile ? [] : ["mobile"]),
      ],
      nonGoals: [
        "No separate deterministic architecture/code-standard runners.",
        "No plan/build discipline enforcement.",
        "No forbidden schematic generation.",
        "No Special Me work.",
      ],
    },
  });
}

function architectureReviewOutputSchema(): JsonObject {
  return toJsonObject({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://vibe-engineer.local/schemas/architecture-agent-review-result.schema.json",
    title: "Vibe Engineer Architecture Agent Review Result",
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "status",
      "summary",
      "reviewedBoundaries",
      "findings",
      "diagnostics",
    ],
    properties: {
      schemaVersion: { type: "string", const: ARCHITECTURE_AGENT_REVIEW_SCHEMA_VERSION },
      status: { type: "string", enum: ["passed", "failed", "blocked"] },
      summary: { type: "string", minLength: 1, maxLength: 1200 },
      reviewedBoundaries: {
        type: "array",
        items: { type: "string", enum: ["backend", "web", "mobile", "cross-cutting"] },
      },
      findings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["path", "reason", "boundary", "severity"],
          properties: {
            path: { type: "string", minLength: 1, maxLength: 512 },
            reason: { type: "string", minLength: 1, maxLength: 1200 },
            boundary: {
              type: "string",
              enum: ["backend", "web", "mobile", "cross-cutting"],
            },
            severity: { type: "string", enum: ["minor", "major", "critical"] },
          },
        },
      },
      diagnostics: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["code", "reason", "path"],
          properties: {
            code: { type: "string", minLength: 1, maxLength: 96 },
            reason: { type: "string", minLength: 1, maxLength: 1200 },
            path: { type: "string", minLength: 1, maxLength: 512 },
          },
        },
      },
    },
  });
}

function architectureReviewPrompt(selected: SelectedHarness, scope: GeneratedStarterScope): string {
  const omitted = [
    ...(scope.includesApi ? [] : ["backend"]),
    ...(scope.includesWeb ? [] : ["web"]),
    ...(scope.includesMobile ? [] : ["mobile"]),
  ];
  const included = [
    ...(scope.includesApi ? ["backend"] : []),
    ...(scope.includesWeb ? ["web"] : []),
    ...(scope.includesMobile ? ["mobile"] : []),
  ];
  return `# Architecture agent review\n\nYou are the single default architecture agent reviewer for this generated vibe-engineer starter. Return only JSON matching \`${ARCHITECTURE_AGENT_REVIEW_SCHEMA_VERSION}\`.\n\nSelected harness: \`${selected.adapter.id}\` (${selected.adapter.displayName}). The runner must use this selected harness only; never suggest or assume a Pi fallback for a non-Pi selection.\n\nGenerated starter scope: \`${scope.id}\` (${scope.label}). Review only these included architecture boundaries: ${included.join(", ") || "none"}. Omitted boundaries that must not be reviewed or reported: ${omitted.join(", ") || "none"}.\n\nReview basis:\n\n- Prefer the supplied git diff from the initial create commit.\n- If the supplied diff is empty, pass only when there are no architecture boundary concerns in the supplied changed-path metadata.\n- If the diff is unavailable or insufficient for a required conclusion, return \`blocked\` with a finding path and reason instead of guessing.\n\nBoundary checks (apply only when included by scope):\n\n- backend: NestJS modules/controllers/services remain separated; API code does not import web/mobile UI; contracts/domain/api-client boundaries remain explicit; Prisma concerns stay inside generated API/data-access locations; Nest + tsx dependency injection uses explicit tokens/provider wiring.\n- web: routes/features/components/hooks/state remain within the web app/shared UI boundary; web code does not import API internals or mobile-only modules.\n- mobile: screens/flows/navigation/test IDs remain within the mobile app/shared native UI boundary; mobile code does not import web DOM-only modules or API internals.\n\nNon-goals:\n\n- Do not perform generic code-style, formatting, or deterministic quality checks.\n- Do not add plan/build discipline, schematics, or Special Me work.\n- Do not report omitted-scope files as findings unless the diff changes them despite the generated scope omitting them.\n\nOutput contract:\n\n- Return a single JSON object with \`schemaVersion: \"${ARCHITECTURE_AGENT_REVIEW_SCHEMA_VERSION}\"\`, \`status\`, \`summary\`, \`reviewedBoundaries\`, \`findings\`, and \`diagnostics\`.\n- \`status: \"passed\"\` only with an empty findings array and a concise non-empty summary.\n- \`status: \"failed\"\` when one or more architecture boundary findings are present.\n- \`status: \"blocked\"\` when runtime context, diff, or repository evidence is insufficient.\n- Every finding must include a concrete repository-relative \`path\`, human-readable \`reason\`, \`boundary\`, and \`severity\`.\n- Return \`diagnostics: []\` unless you are reporting blocked runtime/context evidence.\n`;
}

function architectureReadme(selected: SelectedHarness, scope: GeneratedStarterScope): string {
  return `# Architecture agent review runner\n\nRunner id: \`${ARCHITECTURE_AGENT_REVIEW_RUNNER_ID}\`.\n\nThis is the only default architecture agent runner generated for the starter. It invokes the selected harness \`${selected.adapter.id}\` via \`.vibe/harness/selected-harness.json\` and the runner catalog metadata; no Pi fallback is allowed.\n\nEvidence is written to \`${ARCHITECTURE_AGENT_REVIEW_OUTPUT_PATH}\` with \`passed\`, \`failed\`, or \`blocked\` status plus findings containing paths and reasons. Missing CLI/runtime/auth, non-zero harness exits, and unparseable harness output produce \`blocked\` evidence and a non-zero runner exit.\n\nThe runner reviews git diff from the initial create commit when available. Scope filtering is generated from \`${scope.id}\`: backend=${String(scope.includesApi)}, web=${String(scope.includesWeb)}, mobile=${String(scope.includesMobile)}.\n`;
}

function architectureStarterDocs(selected: SelectedHarness, scope: GeneratedStarterScope): string {
  const omitted = [
    ...(scope.includesApi ? [] : ["backend"]),
    ...(scope.includesWeb ? [] : ["web"]),
    ...(scope.includesMobile ? [] : ["mobile"]),
  ];
  return `## Default architecture agent runner\n\nGenerated runner id: \`${ARCHITECTURE_AGENT_REVIEW_RUNNER_ID}\`. This starter contains exactly one architecture agent runner in \`.vibe/registry/runner-catalog.json\`; the existing typecheck/lint/unit/build runners remain deterministic and separate.\n\nThe architecture runner invokes the selected harness \`${selected.adapter.id}\` through \`.vibe/harness/selected-harness.json\` and fails closed for missing CLI/runtime/auth or unparseable output. It writes structured JSON evidence to \`${ARCHITECTURE_AGENT_REVIEW_OUTPUT_PATH}\` with \`passed\`, \`failed\`, or \`blocked\` plus findings paths and reasons.\n\nThe runner reviews git diff from the initial create commit when available. For this generated scope (\`${scope.id}\`), omitted architecture boundaries are: ${omitted.join(", ") || "none"}.`;
}

const ARCHITECTURE_AGENT_REVIEW_RUNNER_SCRIPT = `#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { clearTimeout, setTimeout } from "node:timers";
import { dirname, resolve } from "node:path";

const RUNNER_ID = "architecture-agent-review";
const SCHEMA_VERSION = "vibe-engineer.architecture-agent-review.v1";
const OUTPUT_PATH = ".vibe/evidence/architecture-agent-review/review.json";
const PROMPT_TEMPLATE_PATH = ".vibe/verification/architecture-agent-review/prompt.md";
const SCHEMA_PATH = ".vibe/verification/architecture-agent-review/schema.json";
const SELECTED_HARNESS_PATH = ".vibe/harness/selected-harness.json";
const EFFECTIVE_PROMPT_PATH = ".vibe/evidence/architecture-agent-review/effective-prompt.md";
const LAST_MESSAGE_PATH = ".vibe/evidence/architecture-agent-review/harness-last-message.txt";
const MAX_DIFF_BYTES = 120000;
const MAX_CAPTURE_BYTES = 800000;
const HARNESS_TIMEOUT_MS = 30000;
const SHORT_TIMEOUT_MS = 10000;
const SUPPORTED = new Set(["pi", "claude-code", "codex"]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function projectPath(relativePath) {
  return resolve(process.cwd(), ...relativePath.split("/"));
}

async function readJson(relativePath) {
  const text = await readFile(projectPath(relativePath), "utf8");
  return JSON.parse(text);
}

function byteLength(text) {
  return Buffer.byteLength(text, "utf8");
}

function truncateText(text, maxBytes) {
  if (byteLength(text) <= maxBytes) return { text, truncated: false };
  let out = text;
  while (byteLength(out) > maxBytes) out = out.slice(0, Math.max(0, out.length - 1024));
  return { text: out + "\\n[architecture-agent-review: truncated]\\n", truncated: true };
}

function boundedAppend(current, chunk) {
  const next = current + chunk;
  if (byteLength(next) <= MAX_CAPTURE_BYTES) return next;
  return truncateText(next, MAX_CAPTURE_BYTES).text;
}

function runProcess(command, args, options = {}) {
  return new Promise((resolveRun) => {
    const startedAt = new Date().toISOString();
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeoutMs = options.timeoutMs ?? HARNESS_TIMEOUT_MS;
    const timer = setTimeout(() => {
      if (settled) return;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
      }, 100);
    }, timeoutMs);
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveRun({
        command,
        args,
        startedAt,
        endedAt: new Date().toISOString(),
        stdout,
        stderr,
        ...result,
      });
    };
    child.stdout.on("data", (chunk) => {
      stdout = boundedAppend(stdout, String(chunk));
    });
    child.stderr.on("data", (chunk) => {
      stderr = boundedAppend(stderr, String(chunk));
    });
    child.on("error", (error) => {
      finish({
        exitCode: null,
        signal: null,
        errorCode: typeof error.code === "string" ? error.code : null,
        errorMessage: error.message,
        timedOut: false,
      });
    });
    child.on("close", (code, signal) => {
      finish({
        exitCode: typeof code === "number" ? code : null,
        signal: typeof signal === "string" ? signal : null,
        errorCode: null,
        errorMessage: null,
        timedOut: signal === "SIGTERM" || signal === "SIGKILL",
      });
    });
  });
}

function safeJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function finding(path, reason, boundary = "cross-cutting", severity = "critical") {
  return { path, reason, boundary, severity };
}

function diagnostic(code, reason, path = SELECTED_HARNESS_PATH) {
  return { code, reason, path };
}

function collectHarnessDiagnosticText(text) {
  const messages = [];
  if (typeof text !== "string" || text.trim().length === 0) return messages;
  for (const value of parseJsonLenient(text)) {
    if (!isRecord(value)) continue;
    for (const nested of nestedValues(value)) {
      if (typeof nested === "string" && nested.trim().length > 0) messages.push(nested.trim());
    }
  }
  messages.push(text.trim());
  return messages;
}

function usefulHarnessDiagnosticText(run) {
  const ignored = /^Reading (?:additional input|prompt) from stdin...$/iu;
  const candidates = [
    run.errorMessage,
    ...collectHarnessDiagnosticText(run.stdout),
    ...collectHarnessDiagnosticText(run.stderr),
    run.stderr,
    run.stdout,
  ];
  const seen = new Set();
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const text = candidate.replaceAll(/\\s+/gu, " ").trim();
    if (text.length === 0 || ignored.test(text) || seen.has(text)) continue;
    seen.add(text);
    return text;
  }
  return "selected harness exited non-zero without a machine-readable diagnostic";
}

function classifyHarnessFailure(run) {
  if (run.errorCode === "ENOENT") {
    return {
      code: "HARNESS_CLI_MISSING",
      reason: run.errorMessage || "selected harness CLI binary was not found",
    };
  }
  if (run.timedOut)
    return { code: "HARNESS_RUNTIME_UNAVAILABLE", reason: "selected harness invocation timed out" };
  const reason = usefulHarnessDiagnosticText(run);
  const haystack = reason.toLowerCase();
  if (
    /auth|oauth|login|log in|api key|apikey|credential|not authenticated|unauthorized/u.test(
      haystack,
    )
  ) {
    return { code: "HARNESS_AUTH_MISSING", reason };
  }
  if (
    /trust|trusted workspace|permission denied|not permitted|permissions? required|hook trust/u.test(
      haystack,
    )
  ) {
    return { code: "HARNESS_PROJECT_TRUST_REQUIRED", reason };
  }
  return { code: "HARNESS_RUNTIME_UNAVAILABLE", reason };
}

async function finish(status, fields) {
  const evidence = {
    schemaVersion: SCHEMA_VERSION,
    runnerId: RUNNER_ID,
    status,
    generatedAt: new Date().toISOString(),
    projectRoot: process.cwd(),
    summary:
      fields.summary ??
      (status === "passed"
        ? "Architecture agent review passed."
        : "Architecture agent review did not pass."),
    selectedHarness: fields.selectedHarness ?? null,
    starterScope: fields.starterScope ?? null,
    reviewedBoundaries: fields.reviewedBoundaries ?? [],
    omittedBoundaries: fields.omittedBoundaries ?? [],
    diff: fields.diff ?? null,
    findings: fields.findings ?? [],
    diagnostics: fields.diagnostics ?? [],
    harnessInvocation: fields.harnessInvocation ?? null,
    artifacts: {
      promptTemplatePath: PROMPT_TEMPLATE_PATH,
      effectivePromptPath: EFFECTIVE_PROMPT_PATH,
      outputSchemaPath: SCHEMA_PATH,
      outputPath: OUTPUT_PATH,
    },
    noFallbackToPi: fields.noFallbackToPi === true,
  };
  const output = projectPath(OUTPUT_PATH);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(evidence, null, 2) + "\\n", "utf8");
  process.stdout.write(JSON.stringify(evidence, null, 2) + "\\n");
  process.exitCode = status === "passed" ? 0 : status === "failed" ? 1 : 2;
}

function selectedHarnessSummary(metadata) {
  const adapterId =
    isRecord(metadata.adapter) && typeof metadata.adapter.id === "string"
      ? metadata.adapter.id
      : null;
  const configHarness =
    isRecord(metadata.config) && typeof metadata.config.agenticHarness === "string"
      ? metadata.config.agenticHarness
      : null;
  const binary =
    isRecord(metadata.invocationModel) && typeof metadata.invocationModel.binary === "string"
      ? metadata.invocationModel.binary
      : null;
  const noFallbackToPi = Boolean(
    isRecord(metadata.adapter) &&
    metadata.adapter.noFallbackToPi === true &&
    isRecord(metadata.config) &&
    metadata.config.noSilentFallback === true,
  );
  return {
    adapterId,
    configHarness,
    displayName:
      isRecord(metadata.adapter) && typeof metadata.adapter.displayName === "string"
        ? metadata.adapter.displayName
        : adapterId,
    binary,
    noFallbackToPi,
    structuredOutput: isRecord(metadata.structuredOutput) ? metadata.structuredOutput : null,
    unavailableRuntimeBehavior: isRecord(metadata.verificationRunnerInvocation)
      ? metadata.verificationRunnerInvocation.unavailableRuntimeBehavior
      : null,
  };
}

function validateSelectedHarness(metadata) {
  const summary = selectedHarnessSummary(metadata);
  if (!summary.adapterId || !SUPPORTED.has(summary.adapterId)) {
    return {
      ok: false,
      summary,
      reason: "selected harness metadata is missing a supported adapter id",
    };
  }
  if (summary.configHarness !== summary.adapterId) {
    return { ok: false, summary, reason: "selected harness config does not match adapter id" };
  }
  if (!summary.binary) {
    return {
      ok: false,
      summary,
      reason: "selected harness metadata is missing invocationModel.binary",
    };
  }
  if (!summary.noFallbackToPi) {
    return {
      ok: false,
      summary,
      reason: "selected harness metadata does not assert noFallbackToPi/noSilentFallback",
    };
  }
  return { ok: true, summary };
}

async function loadScope() {
  const rootPackage = await readJson("package.json");
  const scope =
    isRecord(rootPackage.vibeEngineer) && isRecord(rootPackage.vibeEngineer.starterScope)
      ? rootPackage.vibeEngineer.starterScope
      : null;
  if (!isRecord(scope)) throw new Error("package.json#vibeEngineer.starterScope is missing");
  const includesApi = scope.includesApi === true;
  const includesWeb = scope.includesWeb === true;
  const includesMobile = scope.includesMobile === true;
  const includesPrisma = scope.includesPrisma === true;
  return {
    id: typeof scope.id === "string" ? scope.id : "unknown",
    label: typeof scope.label === "string" ? scope.label : "unknown",
    includesApi,
    includesWeb,
    includesMobile,
    includesPrisma,
    apps: Array.isArray(scope.apps) ? scope.apps.filter((item) => typeof item === "string") : [],
    packages: Array.isArray(scope.packages)
      ? scope.packages.filter((item) => typeof item === "string")
      : [],
  };
}

function boundariesForScope(scope) {
  const reviewed = [];
  if (scope.includesApi) reviewed.push("backend");
  if (scope.includesWeb) reviewed.push("web");
  if (scope.includesMobile) reviewed.push("mobile");
  const omitted = ["backend", "web", "mobile"].filter((item) => !reviewed.includes(item));
  return { reviewed, omitted };
}

async function loadGitDiff() {
  const gitProbe = await runProcess("git", ["rev-parse", "--is-inside-work-tree"], {
    timeoutMs: SHORT_TIMEOUT_MS,
  });
  if (gitProbe.errorMessage || gitProbe.exitCode !== 0 || gitProbe.stdout.trim() !== "true") {
    return {
      mode: "git-unavailable",
      available: false,
      reason: gitProbe.errorMessage || gitProbe.stderr.trim() || "not inside a git work tree",
      baseCommit: null,
      changedPaths: [],
      text: "",
      truncated: false,
    };
  }
  const roots = await runProcess("git", ["rev-list", "--max-parents=0", "HEAD"], {
    timeoutMs: SHORT_TIMEOUT_MS,
  });
  if (roots.errorMessage || roots.exitCode !== 0) {
    return {
      mode: "git-unavailable",
      available: false,
      reason: roots.errorMessage || roots.stderr.trim() || "could not resolve initial commit",
      baseCommit: null,
      changedPaths: [],
      text: "",
      truncated: false,
    };
  }
  const baseCommit = roots.stdout.trim().split(/\\s+/u).filter(Boolean)[0] ?? null;
  if (baseCommit === null) {
    return {
      mode: "git-unavailable",
      available: false,
      reason: "initial create commit was not found",
      baseCommit: null,
      changedPaths: [],
      text: "",
      truncated: false,
    };
  }
  const names = await runProcess("git", ["diff", "--name-only", baseCommit + "..HEAD"], {
    timeoutMs: SHORT_TIMEOUT_MS,
  });
  const diff = await runProcess(
    "git",
    ["diff", "--find-renames", "--unified=80", baseCommit + "..HEAD"],
    { timeoutMs: SHORT_TIMEOUT_MS },
  );
  const changedPaths =
    names.exitCode === 0
      ? names.stdout
          .split(/\\r?\\n/u)
          .map((line) => line.trim())
          .filter(Boolean)
      : [];
  const truncated = truncateText(diff.exitCode === 0 ? diff.stdout : "", MAX_DIFF_BYTES);
  return {
    mode: "git-initial-create-commit",
    available: true,
    reason: null,
    baseCommit,
    command: ["git", "diff", "--find-renames", "--unified=80", baseCommit + "..HEAD"],
    changedPaths,
    text: truncated.text,
    truncated: truncated.truncated,
  };
}

function buildPrompt(template, selectedHarness, scope, boundaries, diff) {
  return (
    template +
    "\\n## Runtime selected harness metadata\\n\`\`\`json\\n" +
    JSON.stringify(selectedHarness, null, 2) +
    "\\n\`\`\`\\n" +
    "\\n## Starter scope metadata\\n\`\`\`json\\n" +
    JSON.stringify(scope, null, 2) +
    "\\n\`\`\`\\n" +
    "\\n## Boundaries to review\\n\`\`\`json\\n" +
    JSON.stringify(boundaries, null, 2) +
    "\\n\`\`\`\\n" +
    "\\n## Git diff from initial create commit\\n" +
    "Mode: " +
    diff.mode +
    "\\n" +
    "Base commit: " +
    (diff.baseCommit ?? "unavailable") +
    "\\n" +
    "Changed paths: " +
    (diff.changedPaths.length === 0 ? "none" : diff.changedPaths.join(", ")) +
    "\\n" +
    (diff.truncated ? "Diff was truncated.\\n" : "") +
    "\`\`\`diff\\n" +
    (diff.text || "") +
    "\\n\`\`\`\\n"
  );
}

function materializeCommand(metadata, promptText) {
  const invocation = isRecord(metadata.verificationRunnerInvocation)
    ? metadata.verificationRunnerInvocation
    : null;
  const selected = selectedHarnessSummary(metadata);
  const recommended =
    invocation && Array.isArray(invocation.recommendedCommand)
      ? invocation.recommendedCommand.filter((item) => typeof item === "string")
      : [];
  if (recommended.length === 0)
    return { ok: false, reason: "verificationRunnerInvocation.recommendedCommand is missing" };
  if (recommended[0] !== selected.binary)
    return {
      ok: false,
      reason: "recommended command binary does not match selected invocationModel.binary",
    };
  let promptReplaced = false;
  const schemaPath = projectPath(SCHEMA_PATH);
  const lastMessagePath = projectPath(LAST_MESSAGE_PATH);
  const command = recommended.map((token) => {
    if (token === "<prompt>") {
      promptReplaced = true;
      return promptText;
    }
    if (token === "<schema>" || token === "<schema-json>")
      return readFileSync(schemaPath, "utf8").trim();
    if (token === "<schema-file>") return schemaPath;
    if (token === "<last-message-file>") return lastMessagePath;
    return token;
  });
  if (!promptReplaced)
    return { ok: false, reason: "recommended command does not include a <prompt> placeholder" };
  return { ok: true, command: command[0], args: command.slice(1), schemaPath, lastMessagePath };
}

function parseJsonLenient(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];
  const out = [];
  try {
    out.push(JSON.parse(trimmed));
  } catch {
    /* ignore invalid JSON candidates */
  }
  const fence = /\`\`\`(?:json)?\\s*([\\s\\S]*?)\`\`\`/giu;
  for (const match of trimmed.matchAll(fence)) {
    try {
      out.push(JSON.parse(match[1].trim()));
    } catch {
      /* ignore invalid JSON candidates */
    }
  }
  for (const line of trimmed.split(/\\r?\\n/u)) {
    const candidate = line.trim();
    if (!candidate.startsWith("{") && !candidate.startsWith("[")) continue;
    try {
      out.push(JSON.parse(candidate));
    } catch {
      /* ignore invalid JSON candidates */
    }
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      out.push(JSON.parse(trimmed.slice(first, last + 1)));
    } catch {
      /* ignore invalid JSON candidates */
    }
  }
  return out;
}

function collectContentStrings(content) {
  const out = [];
  if (typeof content === "string") return [content];
  if (!Array.isArray(content)) return out;
  for (const item of content) {
    if (typeof item === "string") out.push(item);
    else if (isRecord(item)) {
      if (typeof item.text === "string") out.push(item.text);
      if (typeof item.content === "string") out.push(item.content);
    }
  }
  return out;
}

function nestedValues(value) {
  const out = [];
  if (!isRecord(value)) return out;
  for (const key of [
    "result",
    "message",
    "text",
    "output",
    "response",
    "final_response",
    "finalMessage",
    "delta",
  ]) {
    if (typeof value[key] === "string") out.push(value[key]);
  }
  out.push(...collectContentStrings(value.content));
  if (isRecord(value.message)) out.push(...nestedValues(value.message));
  if (isRecord(value.error)) out.push(...nestedValues(value.error));
  if (isRecord(value.assistantMessageEvent)) out.push(...nestedValues(value.assistantMessageEvent));
  if (Array.isArray(value.messages)) {
    for (const item of value.messages) if (isRecord(item)) out.push(...nestedValues(item));
  }
  return out;
}

function findReviewObject(texts) {
  const queue = [];
  for (const text of texts) queue.push(...parseJsonLenient(text));
  const seen = new Set();
  while (queue.length > 0) {
    const value = queue.shift();
    if (!isRecord(value)) continue;
    const marker = JSON.stringify(value).slice(0, 1000);
    if (seen.has(marker)) continue;
    seen.add(marker);
    if (["passed", "failed", "blocked"].includes(value.status)) return value;
    for (const nested of nestedValues(value)) queue.push(...parseJsonLenient(nested));
  }
  return null;
}

function inferBoundary(pathValue) {
  if (
    pathValue.startsWith("apps/api/") ||
    pathValue.startsWith("packages/contracts/") ||
    pathValue.startsWith("packages/domain/") ||
    pathValue.startsWith("packages/api-client/")
  )
    return "backend";
  if (pathValue.startsWith("apps/web/")) return "web";
  if (pathValue.startsWith("apps/mobile/") || pathValue.includes("/native/")) return "mobile";
  return "cross-cutting";
}

function validateReview(value, boundaries) {
  if (!isRecord(value)) return { ok: false, reason: "review output is not a JSON object" };
  const status = value.status;
  if (!["passed", "failed", "blocked"].includes(status))
    return { ok: false, reason: "review status must be passed, failed, or blocked" };
  if (typeof value.summary !== "string" || value.summary.trim().length === 0)
    return { ok: false, reason: "review summary is missing" };
  if (!Array.isArray(value.findings))
    return { ok: false, reason: "review findings must be an array" };
  const allowed = new Set([...boundaries.reviewed, "cross-cutting"]);
  const findings = [];
  for (const raw of value.findings) {
    if (
      !isRecord(raw) ||
      typeof raw.path !== "string" ||
      raw.path.trim().length === 0 ||
      typeof raw.reason !== "string" ||
      raw.reason.trim().length === 0
    ) {
      return { ok: false, reason: "each finding must include non-empty path and reason" };
    }
    const boundary = typeof raw.boundary === "string" ? raw.boundary : inferBoundary(raw.path);
    if (!allowed.has(boundary))
      return {
        ok: false,
        reason: "review output included omitted boundary " + boundary + " for path " + raw.path,
      };
    findings.push({
      path: raw.path,
      reason: raw.reason,
      boundary,
      severity: ["minor", "major", "critical"].includes(raw.severity) ? raw.severity : "major",
    });
  }
  if (status === "passed" && findings.length !== 0)
    return { ok: false, reason: "passed review must not include findings" };
  if (status === "failed" && findings.length === 0)
    return { ok: false, reason: "failed review must include at least one finding" };
  const diagnostics = Array.isArray(value.diagnostics)
    ? value.diagnostics.filter(isRecord).map((item) => ({
        code: typeof item.code === "string" ? item.code : "HARNESS_DIAGNOSTIC",
        reason:
          typeof item.reason === "string"
            ? item.reason
            : typeof item.message === "string"
              ? item.message
              : "Harness returned a diagnostic.",
        ...(typeof item.path === "string" ? { path: item.path } : {}),
      }))
    : [];
  return { ok: true, status, summary: value.summary, findings, diagnostics };
}

async function main() {
  let selectedMetadata;
  let scope;
  let selectedValidation;
  try {
    selectedMetadata = await readJson(SELECTED_HARNESS_PATH);
    selectedValidation = validateSelectedHarness(selectedMetadata);
    scope = await loadScope();
  } catch (error) {
    await finish("blocked", {
      summary: "Architecture review runner metadata could not be loaded.",
      findings: [
        finding(
          SELECTED_HARNESS_PATH,
          error instanceof Error ? error.message : "metadata load failed",
        ),
      ],
      diagnostics: [
        diagnostic(
          "ARCHITECTURE_REVIEW_METADATA_UNAVAILABLE",
          error instanceof Error ? error.message : "metadata load failed",
        ),
      ],
      noFallbackToPi: false,
    });
    return;
  }
  const selectedSummary = selectedValidation.summary;
  const boundaries = boundariesForScope(scope);
  if (!selectedValidation.ok) {
    await finish("blocked", {
      summary: "Selected harness metadata failed validation; no fallback was attempted.",
      selectedHarness: selectedSummary,
      starterScope: scope,
      reviewedBoundaries: boundaries.reviewed,
      omittedBoundaries: boundaries.omitted,
      findings: [finding(SELECTED_HARNESS_PATH, selectedValidation.reason)],
      diagnostics: [diagnostic("SELECTED_HARNESS_METADATA_INVALID", selectedValidation.reason)],
      noFallbackToPi: selectedSummary.noFallbackToPi,
    });
    return;
  }

  const diff = await loadGitDiff();
  const promptTemplate = await readFile(projectPath(PROMPT_TEMPLATE_PATH), "utf8");
  const prompt = buildPrompt(promptTemplate, selectedSummary, scope, boundaries, diff);
  await mkdir(dirname(projectPath(EFFECTIVE_PROMPT_PATH)), { recursive: true });
  await writeFile(projectPath(EFFECTIVE_PROMPT_PATH), prompt, "utf8");

  const versionCommand =
    isRecord(selectedMetadata.runtimePrerequisiteDiagnostic) &&
    Array.isArray(selectedMetadata.runtimePrerequisiteDiagnostic.versionCommand)
      ? selectedMetadata.runtimePrerequisiteDiagnostic.versionCommand.filter(
          (item) => typeof item === "string",
        )
      : [selectedSummary.binary, "--version"];
  const versionProbe = await runProcess(versionCommand[0], versionCommand.slice(1), {
    timeoutMs: SHORT_TIMEOUT_MS,
  });
  if (versionProbe.errorMessage || versionProbe.exitCode !== 0) {
    const code =
      versionProbe.errorCode === "ENOENT" ? "HARNESS_CLI_MISSING" : "HARNESS_RUNTIME_UNAVAILABLE";
    const reason =
      versionProbe.errorMessage ||
      versionProbe.stderr.trim() ||
      "selected harness version probe failed";
    await finish("blocked", {
      summary: "Selected harness CLI/runtime is unavailable; no fallback was attempted.",
      selectedHarness: selectedSummary,
      starterScope: scope,
      reviewedBoundaries: boundaries.reviewed,
      omittedBoundaries: boundaries.omitted,
      diff: {
        mode: diff.mode,
        baseCommit: diff.baseCommit,
        changedPaths: diff.changedPaths,
        truncated: diff.truncated,
      },
      findings: [finding(SELECTED_HARNESS_PATH, reason)],
      diagnostics: [diagnostic(code, reason)],
      harnessInvocation: { versionProbe: safeJson(versionProbe), command: versionCommand },
      noFallbackToPi: true,
    });
    return;
  }

  const commandPlan = materializeCommand(selectedMetadata, prompt);
  if (!commandPlan.ok) {
    await finish("blocked", {
      summary: "Selected harness invocation metadata is incomplete; no fallback was attempted.",
      selectedHarness: selectedSummary,
      starterScope: scope,
      reviewedBoundaries: boundaries.reviewed,
      omittedBoundaries: boundaries.omitted,
      diff: {
        mode: diff.mode,
        baseCommit: diff.baseCommit,
        changedPaths: diff.changedPaths,
        truncated: diff.truncated,
      },
      findings: [finding(SELECTED_HARNESS_PATH, commandPlan.reason)],
      diagnostics: [diagnostic("HARNESS_INVOCATION_METADATA_INVALID", commandPlan.reason)],
      noFallbackToPi: true,
    });
    return;
  }

  const harnessRun = await runProcess(commandPlan.command, commandPlan.args, {
    timeoutMs: HARNESS_TIMEOUT_MS,
  });
  const harnessCommandForEvidence = [
    commandPlan.command,
    ...commandPlan.args.map((arg) => (arg === prompt ? "<prompt>" : arg)),
  ];
  if (harnessRun.errorMessage || harnessRun.exitCode !== 0 || harnessRun.timedOut) {
    const failure = classifyHarnessFailure(harnessRun);
    await finish("blocked", {
      summary:
        "Selected harness failed closed with a precise runtime/auth/trust diagnostic; no fallback was attempted.",
      selectedHarness: selectedSummary,
      starterScope: scope,
      reviewedBoundaries: boundaries.reviewed,
      omittedBoundaries: boundaries.omitted,
      diff: {
        mode: diff.mode,
        baseCommit: diff.baseCommit,
        changedPaths: diff.changedPaths,
        truncated: diff.truncated,
      },
      findings: [finding(SELECTED_HARNESS_PATH, failure.reason)],
      diagnostics: [diagnostic(failure.code, failure.reason)],
      harnessInvocation: {
        command: harnessCommandForEvidence,
        exitCode: harnessRun.exitCode,
        signal: harnessRun.signal,
        stdoutBytes: byteLength(harnessRun.stdout),
        stderrBytes: byteLength(harnessRun.stderr),
        stderr: harnessRun.stderr,
        versionProbe: safeJson(versionProbe),
      },
      noFallbackToPi: true,
    });
    return;
  }

  const lastMessage = existsSync(projectPath(LAST_MESSAGE_PATH))
    ? await readFile(projectPath(LAST_MESSAGE_PATH), "utf8")
    : "";
  const reviewObject = findReviewObject([lastMessage, harnessRun.stdout, harnessRun.stderr]);
  const review = validateReview(reviewObject, boundaries);
  if (!review.ok) {
    await finish("blocked", {
      summary:
        "Selected harness output was unparseable or failed schema validation; no fallback was attempted.",
      selectedHarness: selectedSummary,
      starterScope: scope,
      reviewedBoundaries: boundaries.reviewed,
      omittedBoundaries: boundaries.omitted,
      diff: {
        mode: diff.mode,
        baseCommit: diff.baseCommit,
        changedPaths: diff.changedPaths,
        truncated: diff.truncated,
      },
      findings: [finding(OUTPUT_PATH, review.reason)],
      diagnostics: [diagnostic("HARNESS_OUTPUT_UNPARSEABLE", review.reason, OUTPUT_PATH)],
      harnessInvocation: {
        command: harnessCommandForEvidence,
        exitCode: harnessRun.exitCode,
        stdoutBytes: byteLength(harnessRun.stdout),
        stderrBytes: byteLength(harnessRun.stderr),
        versionProbe: safeJson(versionProbe),
      },
      noFallbackToPi: true,
    });
    return;
  }

  await finish(review.status, {
    summary: review.summary,
    selectedHarness: selectedSummary,
    starterScope: scope,
    reviewedBoundaries: boundaries.reviewed,
    omittedBoundaries: boundaries.omitted,
    diff: {
      mode: diff.mode,
      baseCommit: diff.baseCommit,
      changedPaths: diff.changedPaths,
      truncated: diff.truncated,
      unavailableReason: diff.reason,
    },
    findings: review.findings,
    diagnostics: review.diagnostics,
    harnessInvocation: {
      command: harnessCommandForEvidence,
      exitCode: harnessRun.exitCode,
      stdoutBytes: byteLength(harnessRun.stdout),
      stderrBytes: byteLength(harnessRun.stderr),
      versionProbe: safeJson(versionProbe),
    },
    noFallbackToPi: true,
  });
}

main().catch(async (error) => {
  await finish("blocked", {
    summary: "Architecture review runner crashed before producing validated harness evidence.",
    findings: [
      finding(OUTPUT_PATH, error instanceof Error ? error.message : "unknown runner error"),
    ],
    diagnostics: [
      diagnostic(
        "ARCHITECTURE_REVIEW_RUNNER_INTERNAL_ERROR",
        error instanceof Error ? error.message : "unknown runner error",
        OUTPUT_PATH,
      ),
    ],
    noFallbackToPi: false,
  });
});
`;

async function writeText(
  targetRoot: string,
  relativePath: string,
  content: string,
): Promise<string> {
  const targetPath = resolve(targetRoot, ...relativePath.split("/"));
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, "utf8");
  return targetPath;
}

async function writeJson(
  targetRoot: string,
  relativePath: string,
  value: JsonValue,
): Promise<string> {
  return writeText(targetRoot, relativePath, `${formatJsonForPrettier(value)}\n`);
}

async function updateRunnerCatalog(
  targetRoot: string,
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
  scope: GeneratedStarterScope,
): Promise<{ path: string | null; mutationPath: string | null; added: boolean }> {
  const runnerCatalogPath = resolve(targetRoot, ".vibe", "registry", "runner-catalog.json");
  const catalogValue = await readJsonValueIfPresent(runnerCatalogPath);
  if (catalogValue === null) return { path: null, mutationPath: null, added: false };
  if (!Array.isArray(catalogValue)) {
    throw new Error(
      "Generated runner catalog must be a JSON array before architecture review runner can be applied.",
    );
  }
  const harnessMetadata = runnerCatalogHarnessMetadata(selected, bootstrap);
  const rewritten = catalogValue
    .filter((entry) => !isJsonObject(entry) || entry.id !== ARCHITECTURE_AGENT_REVIEW_RUNNER_ID)
    .map((entry) =>
      isJsonObject(entry)
        ? {
            ...entry,
            vibeEngineerHarness: harnessMetadata,
          }
        : entry,
    );
  rewritten.push(architectureRunnerCatalogEntry(selected, bootstrap, scope));
  await writeFile(runnerCatalogPath, `${JSON.stringify(rewritten, null, 2)}\n`, "utf8");
  return {
    path: runnerCatalogPath,
    mutationPath: relativeProjectPath(targetRoot, runnerCatalogPath),
    added: true,
  };
}

async function updateStarterPresetManifest(
  targetRoot: string,
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
): Promise<string | null> {
  const manifestPath = resolve(
    targetRoot,
    ".vibe",
    "generated",
    "nest-react-rn-preset",
    "manifest.json",
  );
  const manifest = await readJsonValueIfPresent(manifestPath);
  if (!isJsonObject(manifest)) return null;
  const rewritten: JsonObject = {
    ...manifest,
    architectureAgentReview: starterPresetArchitectureMetadata(selected, bootstrap),
  };
  await writeFile(manifestPath, `${JSON.stringify(rewritten, null, 2)}\n`, "utf8");
  return relativeProjectPath(targetRoot, manifestPath);
}

async function updateStarterReference(
  targetRoot: string,
  selected: SelectedHarness,
  scope: GeneratedStarterScope,
): Promise<{ path: string | null; mutationPath: string | null }> {
  const starterReferencePath = resolve(targetRoot, "docs", "reference", "starter.md");
  if (!existsSync(starterReferencePath)) return { path: null, mutationPath: null };
  const current = await readFile(starterReferencePath, "utf8");
  const rewritten = replaceMarkedSection(
    current,
    "vibe-engineer:architecture-agent-review",
    architectureStarterDocs(selected, scope),
  );
  await writeFile(starterReferencePath, rewritten, "utf8");
  return {
    path: starterReferencePath,
    mutationPath: relativeProjectPath(targetRoot, starterReferencePath),
  };
}

export async function writeArchitectureAgentReviewAssets(
  targetRoot: string,
  selected: SelectedHarness,
  bootstrap: BootstrapArtifacts,
  starterScope: GeneratedStarterScope | null | undefined,
): Promise<ArchitectureAgentReviewAssets | null> {
  if (starterScope === null || starterScope === undefined) return null;
  const runnerCatalog = await updateRunnerCatalog(targetRoot, selected, bootstrap, starterScope);
  if (!runnerCatalog.added) return null;

  const scriptPath = await writeText(
    targetRoot,
    ARCHITECTURE_AGENT_REVIEW_SCRIPT_PATH,
    ARCHITECTURE_AGENT_REVIEW_RUNNER_SCRIPT,
  );
  const promptPath = await writeText(
    targetRoot,
    ARCHITECTURE_AGENT_REVIEW_PROMPT_PATH,
    architectureReviewPrompt(selected, starterScope),
  );
  const schemaPath = await writeJson(
    targetRoot,
    ARCHITECTURE_AGENT_REVIEW_SCHEMA_PATH,
    architectureReviewOutputSchema(),
  );
  const readmePath = await writeText(
    targetRoot,
    ARCHITECTURE_AGENT_REVIEW_README_PATH,
    architectureReadme(selected, starterScope),
  );
  const starterReference = await updateStarterReference(targetRoot, selected, starterScope);
  const presetMutationPath = await updateStarterPresetManifest(targetRoot, selected, bootstrap);

  const mutationPaths = [
    runnerCatalog.mutationPath,
    relativeProjectPath(targetRoot, scriptPath),
    relativeProjectPath(targetRoot, promptPath),
    relativeProjectPath(targetRoot, schemaPath),
    relativeProjectPath(targetRoot, readmePath),
    starterReference.mutationPath,
    presetMutationPath,
  ].filter((pathValue): pathValue is string => typeof pathValue === "string");

  return {
    runnerId: ARCHITECTURE_AGENT_REVIEW_RUNNER_ID,
    runnerCatalogPath: runnerCatalog.path,
    runnerCatalogMutationPath: runnerCatalog.mutationPath,
    runnerCatalogEntryAdded: runnerCatalog.added,
    scriptPath,
    promptPath,
    schemaPath,
    readmePath,
    starterReferencePath: starterReference.path,
    mutationPaths,
  };
}
