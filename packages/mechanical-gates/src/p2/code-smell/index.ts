import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import * as ts from "typescript";

export const CODE_SMELL_FAMILY = "p2.code-smell" as const;
export const CODE_SMELL_TOOL = "p2.code-smell" as const;
export const CODE_SMELL_RESULT_SCHEMA_VERSION = "p2.code-smell.result/1" as const;
export const CODE_SMELL_FINDING_SCHEMA_VERSION = "p2.code-smell.finding/1" as const;
export const CODE_SMELL_RATCHET_CARRIER_VERSION = "quality-ratchet.findings/1" as const;
export const CODE_SMELL_INPUT_DETECTOR_ID = "p2.code-smell.input-boundary" as const;

export const CODE_SMELL_DETECTOR_IDS = [
  "deep-control-flow-nesting",
  "combinatorial-path-explosion",
  "catch-log-continue",
  "silent-no-op-dispatcher",
  "serialized-json-assembled-as-strings",
] as const;

export type CodeSmellFamily = typeof CODE_SMELL_FAMILY;
export type CodeSmellTool = typeof CODE_SMELL_TOOL;
export type CodeSmellImplementedDetectorId = (typeof CODE_SMELL_DETECTOR_IDS)[number];
export type CodeSmellDetectorId =
  | CodeSmellImplementedDetectorId
  | typeof CODE_SMELL_INPUT_DETECTOR_ID;
export type CodeSmellRuleId = string;
export type CodeSmellSeverity = "error" | "warning";
export type CodeSmellMode = "hard" | "advisory" | "ratcheted";

export interface CodeSmellThresholdEvidence {
  metric: string;
  observed: number;
  advisory: number;
  ratcheted: number;
  hard: number;
}

export interface CodeSmellStableIdentity {
  tool: CodeSmellTool;
  ruleId: CodeSmellRuleId;
  path: string;
  symbol: string;
  structuralSignature: string;
  contentHash: string;
  line?: number;
}

export interface CodeSmellCalibrationEvidence {
  confidence: number;
  mode: CodeSmellMode;
  threshold: CodeSmellThresholdEvidence;
  blockingReason: string;
}

export interface CodeSmellFindingEvidence {
  schemaVersion: typeof CODE_SMELL_FINDING_SCHEMA_VERSION;
  tool: CodeSmellTool;
  detectorId: CodeSmellDetectorId;
  identity: CodeSmellStableIdentity;
  sourcePath: string;
  sourceExcerpt: string;
  sourceHash: string;
  line: number;
  structuralSignature: string;
  calibration: CodeSmellCalibrationEvidence;
  details: readonly string[];
}

export interface CodeSmellFinding {
  family: CodeSmellFamily;
  ruleId: CodeSmellRuleId;
  detectorId: CodeSmellDetectorId;
  severity: CodeSmellSeverity;
  blocking: boolean;
  path: string;
  message: string;
  evidence: CodeSmellFindingEvidence;
  identity: CodeSmellStableIdentity;
  confidence: number;
  mode: CodeSmellMode;
  threshold: CodeSmellThresholdEvidence;
}

export interface CodeSmellOptions {
  includePaths?: readonly string[];
  excludeDirectoryNames?: readonly string[];
  fileSuffixes?: readonly string[];
  detectors?: readonly CodeSmellImplementedDetectorId[];
  maxFileBytes?: number;
}

export interface CodeSmellResultEvidence {
  schemaVersion: typeof CODE_SMELL_RESULT_SCHEMA_VERSION;
  tool: CodeSmellTool;
  detectors: readonly CodeSmellImplementedDetectorId[];
  includePaths: readonly string[];
  excludeDirectoryNames: readonly string[];
  fileSuffixes: readonly string[];
  maxFileBytes: number;
  inspectedFiles: readonly string[];
  parsedFiles: number;
  failClosed: boolean;
  allowlist: "not-implemented";
  defaultPolicyUsed: boolean;
}

export interface CodeSmellResult {
  family: CodeSmellFamily;
  ok: boolean;
  projectRoot: string;
  findings: CodeSmellFinding[];
  evidence: CodeSmellResultEvidence;
}

interface NormalizedOptions {
  includePaths: readonly string[];
  excludeDirectoryNames: readonly string[];
  fileSuffixes: readonly string[];
  detectors: readonly CodeSmellImplementedDetectorId[];
  maxFileBytes: number;
  defaultPolicyUsed: boolean;
}

type FunctionWithBody = ts.FunctionLikeDeclaration & {
  readonly body: ts.ConciseBody;
};

interface FunctionAnalysisContext {
  sourceFile: ts.SourceFile;
  relativePath: string;
  functionNode: FunctionWithBody;
  symbol: string;
  functionHash: string;
  functionExcerpt: string;
  functionLine: number;
}

interface CatchAnalysisContext extends FunctionAnalysisContext {
  catchNode: ts.CatchClause;
  catchHash: string;
  catchExcerpt: string;
  catchLine: number;
}

interface FileAnalysisContext {
  sourceFile: ts.SourceFile;
  relativePath: string;
}

interface TraversalFailure {
  readonly finding: CodeSmellFinding;
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const MAX_ALLOWED_FILE_BYTES = 1024 * 1024;
const DEFAULT_INCLUDE_PATHS = ["."] as const;
const DEFAULT_EXCLUDE_DIRECTORY_NAMES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".turbo",
  ".vibe",
] as const;
const DEFAULT_FILE_SUFFIXES = [".ts", ".tsx", ".mts", ".cts"] as const;
const OPTION_KEYS = new Set([
  "includePaths",
  "excludeDirectoryNames",
  "fileSuffixes",
  "detectors",
  "maxFileBytes",
]);
const CONTROL_FLOW_KIND_NAMES = new Map<ts.SyntaxKind, string>([
  [ts.SyntaxKind.IfStatement, "if"],
  [ts.SyntaxKind.ForStatement, "for"],
  [ts.SyntaxKind.ForInStatement, "for-in"],
  [ts.SyntaxKind.ForOfStatement, "for-of"],
  [ts.SyntaxKind.WhileStatement, "while"],
  [ts.SyntaxKind.DoStatement, "do"],
  [ts.SyntaxKind.SwitchStatement, "switch"],
  [ts.SyntaxKind.TryStatement, "try"],
  [ts.SyntaxKind.CatchClause, "catch"],
]);
const LOGGING_CALL_NAMES = new Set([
  "log",
  "error",
  "warn",
  "info",
  "debug",
  "record",
  "report",
  "captureException",
  "captureMessage",
]);
const DISPATCH_SELECTOR_NAMES = new Set(["command", "type", "action", "kind", "event", "variant"]);

class CodeSmellInputError extends Error {
  readonly code: string;
  readonly evidencePath: string;

  constructor(message: string, code: string, evidencePath: string) {
    super(message);
    this.name = "CodeSmellInputError";
    this.code = code;
    this.evidencePath = evidencePath;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function normalizeLineEndings(text: string): string {
  return text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function normalizeProjectPath(projectRoot: string, candidatePath: string): string {
  if (typeof candidatePath !== "string" || candidatePath.length === 0) {
    throw new CodeSmellInputError(
      "Path must be a non-empty project-relative string.",
      "input.path-invalid",
      ".",
    );
  }
  if (path.isAbsolute(candidatePath)) {
    throw new CodeSmellInputError(
      "Absolute paths are rejected.",
      "input.absolute-path",
      candidatePath,
    );
  }
  const root = path.resolve(projectRoot);
  const absolute = path.resolve(root, candidatePath);
  const relative = toPosixPath(path.relative(root, absolute));
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith("../") ||
    path.isAbsolute(relative)
  ) {
    throw new CodeSmellInputError(
      "Path traversal outside the validation root is rejected.",
      "input.path-traversal",
      candidatePath,
    );
  }
  return relative;
}

function normalizeOptionalProjectPath(projectRoot: string, candidatePath: string): string {
  if (candidatePath === ".") return ".";
  return normalizeProjectPath(projectRoot, candidatePath);
}

function hasAllowedSuffix(filePath: string, suffixes: readonly string[]): boolean {
  return suffixes.some((suffix) => filePath.endsWith(suffix));
}

function readStringArray(
  value: unknown,
  field: string,
  errors: CodeSmellFinding[],
): readonly string[] | undefined {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((entry) => typeof entry === "string" && entry.length > 0)
  ) {
    errors.push(
      systemFinding(
        "input.invalid-option",
        ".",
        `${field} must be a non-empty string array when provided.`,
        [`field:${field}`],
      ),
    );
    return undefined;
  }
  return value;
}

function readDetectorArray(
  value: unknown,
  errors: CodeSmellFinding[],
): readonly CodeSmellImplementedDetectorId[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(
      systemFinding(
        "input.invalid-option",
        ".",
        "detectors must be a non-empty detector id array when provided.",
        ["field:detectors"],
      ),
    );
    return undefined;
  }
  const detectorIds: CodeSmellImplementedDetectorId[] = [];
  for (const entry of value) {
    if (!isDetectorId(entry)) {
      errors.push(
        systemFinding(
          "input.invalid-option",
          ".",
          "detectors contains an unsupported detector id.",
          [`detector:${String(entry)}`],
        ),
      );
      return undefined;
    }
    detectorIds.push(entry);
  }
  return detectorIds;
}

function isDetectorId(value: unknown): value is CodeSmellImplementedDetectorId {
  return typeof value === "string" && CODE_SMELL_DETECTOR_IDS.some((entry) => entry === value);
}

function normalizeOptions(
  projectRoot: string,
  rawOptions: unknown,
): { options?: NormalizedOptions; findings: CodeSmellFinding[] } {
  const findings: CodeSmellFinding[] = [];
  if (typeof rawOptions === "undefined") {
    return {
      findings,
      options: {
        includePaths: DEFAULT_INCLUDE_PATHS,
        excludeDirectoryNames: DEFAULT_EXCLUDE_DIRECTORY_NAMES,
        fileSuffixes: DEFAULT_FILE_SUFFIXES,
        detectors: CODE_SMELL_DETECTOR_IDS,
        maxFileBytes: DEFAULT_MAX_FILE_BYTES,
        defaultPolicyUsed: true,
      },
    };
  }
  if (!isPlainRecord(rawOptions)) {
    findings.push(
      systemFinding(
        "input.invalid-option",
        ".",
        "Code-smell options must be a strict object when provided.",
        ["options:not-object"],
      ),
    );
    return { findings };
  }
  for (const key of Object.keys(rawOptions)) {
    if (!OPTION_KEYS.has(key))
      findings.push(
        systemFinding("input.unknown-option", ".", "Unknown code-smell option fails closed.", [
          `option:${key}`,
        ]),
      );
  }
  const includePaths = Object.hasOwn(rawOptions, "includePaths")
    ? readStringArray(rawOptions.includePaths, "includePaths", findings)
    : DEFAULT_INCLUDE_PATHS;
  const excludeDirectoryNames = Object.hasOwn(rawOptions, "excludeDirectoryNames")
    ? readStringArray(rawOptions.excludeDirectoryNames, "excludeDirectoryNames", findings)
    : DEFAULT_EXCLUDE_DIRECTORY_NAMES;
  const fileSuffixes = Object.hasOwn(rawOptions, "fileSuffixes")
    ? readStringArray(rawOptions.fileSuffixes, "fileSuffixes", findings)
    : DEFAULT_FILE_SUFFIXES;
  const detectors = Object.hasOwn(rawOptions, "detectors")
    ? readDetectorArray(rawOptions.detectors, findings)
    : CODE_SMELL_DETECTOR_IDS;
  const maxFileBytesRaw = Object.hasOwn(rawOptions, "maxFileBytes")
    ? rawOptions.maxFileBytes
    : DEFAULT_MAX_FILE_BYTES;
  if (
    !Number.isInteger(maxFileBytesRaw) ||
    typeof maxFileBytesRaw !== "number" ||
    maxFileBytesRaw <= 0 ||
    maxFileBytesRaw > MAX_ALLOWED_FILE_BYTES
  ) {
    findings.push(
      systemFinding(
        "input.invalid-option",
        ".",
        "maxFileBytes must be a positive integer no larger than 1048576.",
        [`maxFileBytes:${String(maxFileBytesRaw)}`],
      ),
    );
  }
  if (includePaths) {
    for (const entry of includePaths) {
      try {
        normalizeOptionalProjectPath(projectRoot, entry);
      } catch (error) {
        findings.push(inputErrorFinding(error, entry));
      }
    }
  }
  if (fileSuffixes && !fileSuffixes.every((entry) => entry.startsWith(".") && entry.length > 1)) {
    findings.push(
      systemFinding(
        "input.invalid-option",
        ".",
        "fileSuffixes entries must start with a dot and name a concrete source suffix.",
        [...fileSuffixes],
      ),
    );
  }
  if (
    findings.length > 0 ||
    !includePaths ||
    !excludeDirectoryNames ||
    !fileSuffixes ||
    !detectors ||
    typeof maxFileBytesRaw !== "number"
  ) {
    return { findings };
  }
  return {
    findings,
    options: {
      includePaths,
      excludeDirectoryNames,
      fileSuffixes,
      detectors,
      maxFileBytes: maxFileBytesRaw,
      defaultPolicyUsed: false,
    },
  };
}

async function verifyProjectRoot(projectRoot: string): Promise<CodeSmellFinding[]> {
  try {
    const metadata = await stat(path.resolve(projectRoot));
    if (!metadata.isDirectory()) {
      return [
        systemFinding(
          "input.source-root-unreadable",
          ".",
          "Project root must be a readable directory.",
          ["root:not-directory"],
        ),
      ];
    }
    return [];
  } catch (error) {
    return [
      systemFinding(
        "input.source-root-unreadable",
        ".",
        "Project root must be a readable directory.",
        [error instanceof Error ? error.message : String(error)],
      ),
    ];
  }
}

async function walkFiles(
  projectRoot: string,
  options: NormalizedOptions,
): Promise<{ files: readonly string[]; findings: CodeSmellFinding[] }> {
  const files: string[] = [];
  const findings: CodeSmellFinding[] = [];
  const root = path.resolve(projectRoot);
  const excluded = new Set(options.excludeDirectoryNames);

  async function visit(relativeDirectory: string): Promise<void> {
    const absoluteDirectory = relativeDirectory === "." ? root : path.join(root, relativeDirectory);
    let entries: readonly { name: string; isDirectory(): boolean; isFile(): boolean }[];
    try {
      entries = await readdir(absoluteDirectory, { withFileTypes: true });
    } catch (error) {
      findings.push(
        systemFinding(
          "input.source-root-unreadable",
          relativeDirectory,
          "Source directory is unreadable.",
          [error instanceof Error ? error.message : String(error)],
        ),
      );
      return;
    }
    for (const entry of entries) {
      const childRelative =
        relativeDirectory === "."
          ? entry.name
          : toPosixPath(path.join(relativeDirectory, entry.name));
      if (entry.isDirectory()) {
        if (!excluded.has(entry.name)) await visit(childRelative);
        continue;
      }
      if (entry.isFile() && hasAllowedSuffix(childRelative, options.fileSuffixes)) {
        files.push(childRelative);
      }
    }
  }

  for (const includePath of options.includePaths) {
    const safeIncludePath = normalizeOptionalProjectPath(projectRoot, includePath);
    const absoluteIncludePath = safeIncludePath === "." ? root : path.join(root, safeIncludePath);
    try {
      const metadata = await stat(absoluteIncludePath);
      if (metadata.isFile()) {
        if (hasAllowedSuffix(safeIncludePath, options.fileSuffixes)) files.push(safeIncludePath);
      } else if (metadata.isDirectory()) {
        await visit(safeIncludePath);
      } else {
        findings.push(
          systemFinding(
            "input.source-root-unreadable",
            safeIncludePath,
            "Included source path must be a file or directory.",
            ["include:not-file-or-directory"],
          ),
        );
      }
    } catch (error) {
      findings.push(
        systemFinding(
          "input.source-root-unreadable",
          safeIncludePath,
          "Included source path is missing or unreadable.",
          [error instanceof Error ? error.message : String(error)],
        ),
      );
    }
  }
  return { files: [...new Set(files)].sort(), findings };
}

async function readSourceFile(
  projectRoot: string,
  relativePath: string,
  maxFileBytes: number,
): Promise<{ text?: string; finding?: CodeSmellFinding }> {
  const absolutePath = path.join(path.resolve(projectRoot), relativePath);
  try {
    const metadata = await stat(absolutePath);
    if (!metadata.isFile())
      return {
        finding: systemFinding(
          "input.source-root-unreadable",
          relativePath,
          "Source path must be a file.",
          ["source:not-file"],
        ),
      };
    if (metadata.size > maxFileBytes) {
      return {
        finding: systemFinding(
          "input.file-too-large",
          relativePath,
          "Source file exceeds the configured bounded read cap.",
          [`size:${metadata.size}`, `maxFileBytes:${maxFileBytes}`],
        ),
      };
    }
    return { text: await readFile(absolutePath, "utf8") };
  } catch (error) {
    return {
      finding: systemFinding(
        "input.source-root-unreadable",
        relativePath,
        "Source file is unreadable.",
        [error instanceof Error ? error.message : String(error)],
      ),
    };
  }
}

function result(
  projectRoot: string,
  findings: CodeSmellFinding[],
  evidence: Omit<CodeSmellResultEvidence, "schemaVersion" | "tool" | "allowlist" | "failClosed"> & {
    failClosed: boolean;
  },
): CodeSmellResult {
  return {
    family: CODE_SMELL_FAMILY,
    ok: findings.filter((finding) => finding.blocking).length === 0,
    projectRoot: path.resolve(projectRoot),
    findings,
    evidence: {
      schemaVersion: CODE_SMELL_RESULT_SCHEMA_VERSION,
      tool: CODE_SMELL_TOOL,
      allowlist: "not-implemented",
      ...evidence,
    },
  };
}

function inputErrorFinding(error: unknown, candidatePath: string): CodeSmellFinding {
  if (error instanceof CodeSmellInputError) {
    return systemFinding(error.code, error.evidencePath, error.message, [`path:${candidatePath}`]);
  }
  return systemFinding("input.path-invalid", candidatePath, "Input path is invalid.", [
    error instanceof Error ? error.message : String(error),
  ]);
}

function systemFinding(
  ruleId: CodeSmellRuleId | string,
  findingPath: string,
  message: string,
  details: readonly string[],
): CodeSmellFinding {
  const detectorId: CodeSmellDetectorId = isDetectorId(ruleId)
    ? ruleId
    : CODE_SMELL_INPUT_DETECTOR_ID;
  const normalizedRuleId: CodeSmellRuleId =
    isDetectorId(ruleId) || ruleId.startsWith("input.") || ruleId.startsWith("parse.")
      ? ruleId
      : "input.invalid-option";
  const sourceExcerpt = `${message}\n${details.join("\n")}`;
  const threshold: CodeSmellThresholdEvidence = {
    metric: "input-validation",
    observed: 1,
    advisory: 1,
    ratcheted: 1,
    hard: 1,
  };
  const identity: CodeSmellStableIdentity = {
    tool: CODE_SMELL_TOOL,
    ruleId: normalizedRuleId,
    path: findingPath,
    symbol: `system:${ruleId}`,
    structuralSignature: `system:${ruleId}:${findingPath}`,
    contentHash: sha256(normalizeLineEndings(sourceExcerpt)),
  };
  const evidence: CodeSmellFindingEvidence = {
    schemaVersion: CODE_SMELL_FINDING_SCHEMA_VERSION,
    tool: CODE_SMELL_TOOL,
    detectorId,
    identity,
    sourcePath: findingPath,
    sourceExcerpt,
    sourceHash: identity.contentHash,
    line: 1,
    structuralSignature: identity.structuralSignature,
    calibration: {
      confidence: 1,
      mode: "hard",
      threshold,
      blockingReason: "Input, policy, or source-boundary failures fail closed.",
    },
    details,
  };
  return {
    family: CODE_SMELL_FAMILY,
    ruleId: normalizedRuleId,
    detectorId,
    severity: "error",
    blocking: true,
    path: findingPath,
    message,
    evidence,
    identity,
    confidence: 1,
    mode: "hard",
    threshold,
  };
}

function makeFinding(
  context: FunctionAnalysisContext | CatchAnalysisContext | FileAnalysisContext,
  detectorId: CodeSmellDetectorId,
  metric: string,
  observed: number,
  thresholds: { advisory: number; ratcheted: number; hard: number },
  mode: CodeSmellMode,
  confidence: number,
  message: string,
  details: readonly string[],
  excerptOverride?: { excerpt: string; hash: string; line: number; symbolSuffix: string },
): CodeSmellFinding {
  const blocking = mode === "hard";
  const threshold: CodeSmellThresholdEvidence = {
    metric,
    observed,
    advisory: thresholds.advisory,
    ratcheted: thresholds.ratcheted,
    hard: thresholds.hard,
  };
  const isFunctionContext = "functionNode" in context;
  const excerpt =
    excerptOverride?.excerpt ??
    (isFunctionContext
      ? context.functionExcerpt
      : context.sourceFile.text.slice(0, Math.min(context.sourceFile.text.length, 512)));
  const contentHash =
    excerptOverride?.hash ??
    (isFunctionContext ? context.functionHash : sha256(normalizeLineEndings(excerpt)));
  const line = excerptOverride?.line ?? (isFunctionContext ? context.functionLine : 1);
  const symbol = `${isFunctionContext ? context.symbol : "file"}${excerptOverride?.symbolSuffix ?? ""}`;
  const structuralSignature = `${detectorId}|${symbol}|${metric}:${observed}|kind:${isFunctionContext ? ts.SyntaxKind[context.functionNode.kind] : "SourceFile"}`;
  const identity: CodeSmellStableIdentity = {
    tool: CODE_SMELL_TOOL,
    ruleId: detectorId,
    path: context.relativePath,
    symbol,
    structuralSignature,
    contentHash,
  };
  const severity: CodeSmellSeverity = blocking ? "error" : "warning";
  const evidence: CodeSmellFindingEvidence = {
    schemaVersion: CODE_SMELL_FINDING_SCHEMA_VERSION,
    tool: CODE_SMELL_TOOL,
    detectorId,
    identity,
    sourcePath: context.relativePath,
    sourceExcerpt: excerpt,
    sourceHash: contentHash,
    line,
    structuralSignature,
    calibration: {
      confidence,
      mode,
      threshold,
      blockingReason: blocking
        ? "Observed structural risk meets the calibrated hard threshold."
        : `Observed structural risk is ${mode} and does not block until ratcheted or recalibrated.`,
    },
    details,
  };
  return {
    family: CODE_SMELL_FAMILY,
    ruleId: detectorId,
    detectorId,
    severity,
    blocking,
    path: context.relativePath,
    message,
    evidence,
    identity,
    confidence,
    mode,
    threshold,
  };
}

function sourceLine(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function nodeTextHash(sourceFile: ts.SourceFile, node: ts.Node): string {
  return sha256(normalizeLineEndings(node.getText(sourceFile)));
}

function functionSymbol(
  sourceFile: ts.SourceFile,
  node: ts.FunctionLikeDeclaration,
  ordinal: number,
): string {
  const named = node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
  if (named) return `${functionKindName(node)}:${named}`;
  const parentName = parentStableName(node.parent);
  return `${functionKindName(node)}:${parentName}:ordinal-${ordinal}`;
}

function functionKindName(node: ts.FunctionLikeDeclaration): string {
  if (ts.isMethodDeclaration(node)) return "method";
  if (ts.isConstructorDeclaration(node)) return "constructor";
  if (ts.isGetAccessorDeclaration(node)) return "getter";
  if (ts.isSetAccessorDeclaration(node)) return "setter";
  if (ts.isArrowFunction(node)) return "arrow-function";
  if (ts.isFunctionExpression(node)) return "function-expression";
  return "function";
}

function parentStableName(node: ts.Node | undefined): string {
  if (!node) return "root";
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name))
    return `variable:${node.name.text}`;
  if (
    ts.isPropertyAssignment(node) &&
    (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
  )
    return `property:${node.name.text}`;
  if (ts.isCallExpression(node)) return "call-expression";
  return ts.SyntaxKind[node.kind];
}

function collectFunctionContexts(
  sourceFile: ts.SourceFile,
  relativePath: string,
): readonly FunctionAnalysisContext[] {
  const contexts: FunctionAnalysisContext[] = [];
  let ordinal = 0;
  function visit(node: ts.Node): void {
    if (isFunctionLikeWithBody(node)) {
      ordinal += 1;
      contexts.push({
        sourceFile,
        relativePath,
        functionNode: node,
        symbol: functionSymbol(sourceFile, node, ordinal),
        functionHash: nodeTextHash(sourceFile, node),
        functionExcerpt: node.getText(sourceFile),
        functionLine: sourceLine(sourceFile, node),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return contexts;
}

function isFunctionLikeWithBody(node: ts.Node): node is FunctionWithBody {
  return (
    (ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node)) &&
    Boolean(node.body)
  );
}

function detectDeepControlFlowNesting(
  context: FunctionAnalysisContext,
): readonly CodeSmellFinding[] {
  const hard = 5;
  const advisory = 4;
  const ratcheted = 4;
  let maxDepth = 0;
  const controlKinds: string[] = [];

  function visit(node: ts.Node, depth: number): void {
    const label = CONTROL_FLOW_KIND_NAMES.get(node.kind);
    const nextDepth = label ? depth + 1 : depth;
    if (label) {
      maxDepth = Math.max(maxDepth, nextDepth);
      controlKinds.push(`${label}@${sourceLine(context.sourceFile, node)}:depth-${nextDepth}`);
    }
    ts.forEachChild(node, (child) => visit(child, nextDepth));
  }

  visit(context.functionNode.body, 0);
  if (maxDepth < advisory) return [];
  const mode: CodeSmellMode = maxDepth >= hard ? "hard" : "advisory";
  return [
    makeFinding(
      context,
      "deep-control-flow-nesting",
      "control-flow-depth",
      maxDepth,
      { advisory, ratcheted, hard },
      mode,
      mode === "hard" ? 0.95 : 0.78,
      "Function contains deeply nested control flow.",
      controlKinds,
    ),
  ];
}

function detectCombinatorialPathExplosion(
  context: FunctionAnalysisContext,
): readonly CodeSmellFinding[] {
  const hard = 12;
  const ratcheted = 8;
  const advisory = 7;
  let decisions = 0;
  const details: string[] = [];
  function visit(node: ts.Node): void {
    const label = decisionLabel(node);
    if (label) {
      decisions += 1;
      details.push(`${label}@${sourceLine(context.sourceFile, node)}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(context.functionNode.body);
  if (decisions < advisory) return [];
  const mode: CodeSmellMode =
    decisions >= hard ? "hard" : decisions >= ratcheted ? "ratcheted" : "advisory";
  const confidence = decisions >= hard ? 0.91 : 0.72;
  const estimatedPaths = 2 ** Math.min(decisions, 20);
  return [
    makeFinding(
      context,
      "combinatorial-path-explosion",
      "decision-points",
      decisions,
      { advisory, ratcheted, hard },
      mode,
      confidence,
      "Function owns many branch or loop decision points.",
      [...details, `estimatedPathUpperBound:${estimatedPaths}`],
    ),
  ];
}

function decisionLabel(node: ts.Node): string | undefined {
  if (ts.isIfStatement(node)) return "if";
  if (ts.isConditionalExpression(node)) return "conditional-expression";
  if (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node))
    return "for-loop";
  if (ts.isWhileStatement(node) || ts.isDoStatement(node)) return "while-loop";
  if (ts.isCatchClause(node)) return "catch";
  if (ts.isCaseClause(node) || ts.isDefaultClause(node)) return "switch-clause";
  if (
    ts.isBinaryExpression(node) &&
    (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
  )
    return "logical-branch";
  return undefined;
}

function detectCatchLogContinue(context: FunctionAnalysisContext): readonly CodeSmellFinding[] {
  const findings: CodeSmellFinding[] = [];
  function visit(node: ts.Node): void {
    if (
      ts.isCatchClause(node) &&
      containsLoggingCall(node.block) &&
      !blockTerminatesWithTypedRecovery(node.block)
    ) {
      const catchContext: CatchAnalysisContext = {
        ...context,
        catchNode: node,
        catchHash: nodeTextHash(context.sourceFile, node),
        catchExcerpt: node.getText(context.sourceFile),
        catchLine: sourceLine(context.sourceFile, node),
      };
      findings.push(
        makeFinding(
          catchContext,
          "catch-log-continue",
          "catch-log-without-abrupt-recovery",
          1,
          { advisory: 1, ratcheted: 1, hard: 1 },
          "hard",
          0.93,
          "Catch block records the failure and can continue without typed recovery.",
          ["logging-call:true", "abrupt-or-failure-return:false"],
          {
            excerpt: catchContext.catchExcerpt,
            hash: catchContext.catchHash,
            line: catchContext.catchLine,
            symbolSuffix: ":catch",
          },
        ),
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(context.functionNode.body);
  return findings;
}

function containsLoggingCall(node: ts.Node): boolean {
  let found = false;
  function visit(child: ts.Node): void {
    if (found) return;
    if (ts.isCallExpression(child) && isLoggingCallee(child.expression)) {
      found = true;
      return;
    }
    ts.forEachChild(child, visit);
  }
  visit(node);
  return found;
}

function isLoggingCallee(expression: ts.Expression): boolean {
  if (ts.isPropertyAccessExpression(expression)) {
    return LOGGING_CALL_NAMES.has(expression.name.text);
  }
  if (ts.isIdentifier(expression)) {
    return LOGGING_CALL_NAMES.has(expression.text);
  }
  return false;
}

function blockTerminatesWithTypedRecovery(block: ts.Block): boolean {
  const last = block.statements[block.statements.length - 1];
  if (!last) return false;
  return statementTerminatesWithTypedRecovery(last);
}

function statementTerminatesWithTypedRecovery(statement: ts.Statement): boolean {
  if (ts.isThrowStatement(statement)) return true;
  if (ts.isReturnStatement(statement)) {
    const expression = statement.expression;
    return expression ? isFailureLikeExpression(expression) : false;
  }
  if (ts.isBlock(statement)) return blockTerminatesWithTypedRecovery(statement);
  if (ts.isIfStatement(statement) && statement.elseStatement) {
    return (
      statementTerminatesWithTypedRecovery(toStatement(statement.thenStatement)) &&
      statementTerminatesWithTypedRecovery(toStatement(statement.elseStatement))
    );
  }
  return false;
}

function toStatement(statement: ts.Statement): ts.Statement {
  return statement;
}

function isFailureLikeExpression(expression: ts.Expression): boolean {
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties.some((property) => {
      if (!ts.isPropertyAssignment(property)) return false;
      const propertyName = propertyNameText(property.name);
      if (!propertyName) return false;
      if (
        (propertyName === "ok" || propertyName === "success") &&
        property.initializer.kind === ts.SyntaxKind.FalseKeyword
      )
        return true;
      if (propertyName === "error" || propertyName === "errors" || propertyName === "failure")
        return true;
      return false;
    });
  }
  if (ts.isCallExpression(expression)) {
    const calleeName = calleeLeafName(expression.expression);
    return (
      calleeName === "err" ||
      calleeName === "error" ||
      calleeName === "fail" ||
      calleeName === "failure"
    );
  }
  return false;
}

function propertyNameText(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name))
    return name.text;
  return undefined;
}

function calleeLeafName(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return undefined;
}

function detectSilentNoOpDispatcher(context: FunctionAnalysisContext): readonly CodeSmellFinding[] {
  const findings: CodeSmellFinding[] = [];
  function visit(node: ts.Node): void {
    if (ts.isSwitchStatement(node) && isDispatchSelector(node.expression)) {
      const defaultClause = node.caseBlock.clauses.find(ts.isDefaultClause);
      if (defaultClause && clauseIsSilentNoOp(defaultClause)) {
        findings.push(
          makeFinding(
            context,
            "silent-no-op-dispatcher",
            "silent-default-dispatch",
            1,
            { advisory: 1, ratcheted: 1, hard: 1 },
            "hard",
            0.9,
            "Dispatcher default branch silently succeeds or performs no operation.",
            [
              `selector:${node.expression.getText(context.sourceFile)}`,
              `defaultLine:${sourceLine(context.sourceFile, defaultClause)}`,
            ],
          ),
        );
      }
    }
    if (
      ts.isIfStatement(node) &&
      isDispatchIfChain(node) &&
      node.elseStatement &&
      statementIsSilentNoOp(node.elseStatement)
    ) {
      findings.push(
        makeFinding(
          context,
          "silent-no-op-dispatcher",
          "silent-else-dispatch",
          1,
          { advisory: 1, ratcheted: 1, hard: 1 },
          "hard",
          0.84,
          "Dispatcher fallback branch silently succeeds or performs no operation.",
          [`fallbackLine:${sourceLine(context.sourceFile, node.elseStatement)}`],
        ),
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(context.functionNode.body);
  return findings;
}

function isDispatchSelector(expression: ts.Expression): boolean {
  if (ts.isIdentifier(expression)) return DISPATCH_SELECTOR_NAMES.has(expression.text);
  if (ts.isPropertyAccessExpression(expression))
    return DISPATCH_SELECTOR_NAMES.has(expression.name.text);
  if (ts.isElementAccessExpression(expression)) {
    const argumentExpression = expression.argumentExpression;
    return (
      Boolean(argumentExpression) &&
      ts.isStringLiteral(argumentExpression) &&
      DISPATCH_SELECTOR_NAMES.has(argumentExpression.text)
    );
  }
  return false;
}

function isDispatchIfChain(statement: ts.IfStatement): boolean {
  return expressionUsesDispatchSelector(statement.expression);
}

function expressionUsesDispatchSelector(expression: ts.Expression): boolean {
  let found = false;
  function visit(node: ts.Node): void {
    if (found) return;
    if (ts.isIdentifier(node) && DISPATCH_SELECTOR_NAMES.has(node.text)) {
      found = true;
      return;
    }
    if (ts.isPropertyAccessExpression(node) && DISPATCH_SELECTOR_NAMES.has(node.name.text)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(expression);
  return found;
}

function clauseIsSilentNoOp(clause: ts.DefaultClause): boolean {
  if (clause.statements.length === 0) return true;
  return clause.statements.every(statementIsSilentNoOp);
}

function statementIsSilentNoOp(statement: ts.Statement): boolean {
  if (ts.isBreakStatement(statement)) return true;
  if (ts.isEmptyStatement(statement)) return true;
  if (ts.isBlock(statement))
    return statement.statements.length === 0 || statement.statements.every(statementIsSilentNoOp);
  if (ts.isReturnStatement(statement))
    return (
      !statement.expression ||
      isSuccessLikeExpression(statement.expression) ||
      isEmptyCarrierExpression(statement.expression)
    );
  if (ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)) {
    const calleeName = calleeLeafName(statement.expression.expression);
    return calleeName === "noop" || calleeName === "noOp";
  }
  return false;
}

function isSuccessLikeExpression(expression: ts.Expression): boolean {
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (ts.isStringLiteral(expression))
    return (
      expression.text === "ok" ||
      expression.text === "success" ||
      expression.text === "noop" ||
      expression.text === "no-op"
    );
  if (ts.isObjectLiteralExpression(expression)) {
    if (expression.properties.length === 0) return true;
    return expression.properties.some((property) => {
      if (!ts.isPropertyAssignment(property)) return false;
      const name = propertyNameText(property.name);
      if (!name) return false;
      if (
        (name === "ok" || name === "success") &&
        property.initializer.kind === ts.SyntaxKind.TrueKeyword
      )
        return true;
      if (name === "handled" && property.initializer.kind === ts.SyntaxKind.FalseKeyword)
        return true;
      return false;
    });
  }
  return false;
}

function isEmptyCarrierExpression(expression: ts.Expression): boolean {
  return ts.isArrayLiteralExpression(expression) && expression.elements.length === 0;
}

function detectSerializedJsonAsStrings(
  context: FunctionAnalysisContext,
): readonly CodeSmellFinding[] {
  const findings: CodeSmellFinding[] = [];
  function visit(node: ts.Node): void {
    if (isJsonStringAssembly(node)) {
      const expression = node;
      findings.push(
        makeFinding(
          context,
          "serialized-json-assembled-as-strings",
          "json-string-assembly",
          1,
          { advisory: 1, ratcheted: 2, hard: 99 },
          "advisory",
          0.66,
          "JSON-shaped output is assembled through string syntax instead of a structured value boundary.",
          [
            `expressionKind:${ts.SyntaxKind[expression.kind]}`,
            `line:${sourceLine(context.sourceFile, expression)}`,
          ],
          {
            excerpt: expression.getText(context.sourceFile),
            hash: nodeTextHash(context.sourceFile, expression),
            line: sourceLine(context.sourceFile, expression),
            symbolSuffix: ":json-string-assembly",
          },
        ),
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(context.functionNode.body);
  return findings;
}

function isJsonStringAssembly(node: ts.Node): node is ts.Expression {
  if (!ts.isExpression(node)) return false;
  if (ts.isTemplateExpression(node)) return templateLooksJsonLike(node);
  if (ts.isNoSubstitutionTemplateLiteral(node)) return literalTextLooksJsonLike(node.text);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken)
    return binaryConcatLooksJsonLike(node);
  return false;
}

function templateLooksJsonLike(node: ts.TemplateExpression): boolean {
  const literalParts = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
  return literalParts.some(literalTextLooksJsonLike) && node.templateSpans.length > 0;
}

function binaryConcatLooksJsonLike(node: ts.BinaryExpression): boolean {
  const parts = flattenPlusExpression(node);
  const literalSyntax = parts
    .filter(ts.isStringLiteralLike)
    .map((part) => part.text)
    .join("");
  const hasStringSyntaxPart = literalTextLooksJsonLike(literalSyntax);
  const hasDynamicPart = parts.some((part) => !ts.isStringLiteralLike(part));
  return hasStringSyntaxPart && hasDynamicPart;
}

function flattenPlusExpression(expression: ts.Expression): readonly ts.Expression[] {
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    return [...flattenPlusExpression(expression.left), ...flattenPlusExpression(expression.right)];
  }
  return [expression];
}

function literalTextLooksJsonLike(text: string): boolean {
  return text.includes("{") && text.includes("}") && text.includes(":") && text.includes('"');
}

function analyzeParsedSource(
  sourceFile: ts.SourceFile,
  relativePath: string,
  options: NormalizedOptions,
): readonly CodeSmellFinding[] {
  const findings: CodeSmellFinding[] = [];
  const functionContexts = collectFunctionContexts(sourceFile, relativePath);
  for (const context of functionContexts) {
    if (options.detectors.includes("deep-control-flow-nesting"))
      findings.push(...detectDeepControlFlowNesting(context));
    if (options.detectors.includes("combinatorial-path-explosion"))
      findings.push(...detectCombinatorialPathExplosion(context));
    if (options.detectors.includes("catch-log-continue"))
      findings.push(...detectCatchLogContinue(context));
    if (options.detectors.includes("silent-no-op-dispatcher"))
      findings.push(...detectSilentNoOpDispatcher(context));
    if (options.detectors.includes("serialized-json-assembled-as-strings"))
      findings.push(...detectSerializedJsonAsStrings(context));
  }
  return findings;
}

function parseSource(
  relativePath: string,
  text: string,
): { sourceFile?: ts.SourceFile; findings: CodeSmellFinding[] } {
  const scriptKind = relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const diagnostics =
    ts.transpileModule(text, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: relativePath,
      reportDiagnostics: true,
    }).diagnostics ?? [];
  const syntaxFailures = diagnostics.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  if (syntaxFailures.length > 0) {
    const sourceFileForLocations = ts.createSourceFile(
      relativePath,
      text,
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );
    return {
      findings: syntaxFailures.map((diagnostic) => {
        const line =
          diagnostic.start === undefined
            ? 1
            : sourceFileForLocations.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
        const messageText = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        return systemFinding(
          "parse.syntax-error",
          relativePath,
          "TypeScript parser reported a syntax error; code-smell analysis fails closed for this file.",
          [`line:${line}`, `diagnostic:${messageText}`],
        );
      }),
    };
  }
  return {
    sourceFile: ts.createSourceFile(relativePath, text, ts.ScriptTarget.Latest, true, scriptKind),
    findings: [],
  };
}

export async function validateCodeSmells(
  projectRoot: string,
  options?: CodeSmellOptions,
): Promise<CodeSmellResult> {
  const root = path.resolve(projectRoot);
  const rootFindings = await verifyProjectRoot(root);
  const normalized = normalizeOptions(root, options);
  const earlyFindings = [...rootFindings, ...normalized.findings];
  const fallbackOptions: NormalizedOptions = {
    includePaths: DEFAULT_INCLUDE_PATHS,
    excludeDirectoryNames: DEFAULT_EXCLUDE_DIRECTORY_NAMES,
    fileSuffixes: DEFAULT_FILE_SUFFIXES,
    detectors: CODE_SMELL_DETECTOR_IDS,
    maxFileBytes: DEFAULT_MAX_FILE_BYTES,
    defaultPolicyUsed: true,
  };
  const selectedOptions = normalized.options ?? fallbackOptions;
  if (earlyFindings.length > 0 || !normalized.options) {
    return result(root, earlyFindings, {
      detectors: selectedOptions.detectors,
      includePaths: selectedOptions.includePaths,
      excludeDirectoryNames: selectedOptions.excludeDirectoryNames,
      fileSuffixes: selectedOptions.fileSuffixes,
      maxFileBytes: selectedOptions.maxFileBytes,
      inspectedFiles: [],
      parsedFiles: 0,
      failClosed: true,
      defaultPolicyUsed: selectedOptions.defaultPolicyUsed,
    });
  }

  const walked = await walkFiles(root, normalized.options);
  const findings: CodeSmellFinding[] = [...walked.findings];
  let parsedFiles = 0;
  for (const filePath of walked.files) {
    const readResult = await readSourceFile(root, filePath, normalized.options.maxFileBytes);
    if (readResult.finding) {
      findings.push(readResult.finding);
      continue;
    }
    if (typeof readResult.text !== "string") continue;
    const parsed = parseSource(filePath, readResult.text);
    findings.push(...parsed.findings);
    if (parsed.sourceFile) {
      parsedFiles += 1;
      findings.push(...analyzeParsedSource(parsed.sourceFile, filePath, normalized.options));
    }
  }

  return result(root, findings, {
    detectors: normalized.options.detectors,
    includePaths: normalized.options.includePaths,
    excludeDirectoryNames: normalized.options.excludeDirectoryNames,
    fileSuffixes: normalized.options.fileSuffixes,
    maxFileBytes: normalized.options.maxFileBytes,
    inspectedFiles: walked.files,
    parsedFiles,
    failClosed: findings.some(
      (finding) => finding.ruleId.startsWith("input.") || finding.ruleId.startsWith("parse."),
    ),
    defaultPolicyUsed: normalized.options.defaultPolicyUsed,
  });
}
