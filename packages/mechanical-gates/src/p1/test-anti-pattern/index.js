import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

export const TEST_ANTI_PATTERN_FAMILY = "p1.test-anti-pattern";
export const TEST_ANTI_PATTERN_POLICY_VERSION = "i12.test-anti-pattern/1";

const DEFAULT_POLICY_PATH = "test-anti-pattern.policy.json";
const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const ABSOLUTE_MAX_FILE_BYTES = 1024 * 1024;
const TEST_FILE_SUFFIXES = Object.freeze([".test.ts", ".spec.ts", ".test.tsx", ".spec.tsx", ".test.js", ".spec.js", ".test.mjs", ".spec.mjs"]);
const ALLOWED_POLICY_KEYS = new Set([
  "schemaVersion",
  "proofMode",
  "testRoots",
  "allowSkippedWithMetadata",
  "requiredSkipMetadata",
  "normalizedSnapshotHelpers",
  "requiredSetupFiles",
  "setupSentinels",
  "requiredSetupAssertionCalls",
  "publicClaims",
  "riskyBehaviors",
  "exactCountRequired",
  "requiredRegressionFailureShape"
]);

class TestAntiPatternError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "TestAntiPatternError";
    this.code = options.code ?? "TEST_ANTI_PATTERN_ERROR";
    this.path = options.path;
    this.cause = options.cause;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function normalizeProjectPath(projectRoot, candidatePath) {
  if (typeof candidatePath !== "string" || candidatePath.length === 0) {
    throw new TestAntiPatternError("Path must be a non-empty string.", { code: "TEST_ANTI_PATTERN_BAD_PATH", path: String(candidatePath) });
  }
  const root = path.resolve(projectRoot);
  const absolute = path.resolve(root, candidatePath);
  const relativePath = toPosixPath(path.relative(root, absolute));
  if (relativePath === "" || relativePath === ".." || relativePath.startsWith("../") || path.isAbsolute(relativePath)) {
    throw new TestAntiPatternError(`Path escapes validation root: ${candidatePath}`, { code: "TEST_ANTI_PATTERN_PATH_TRAVERSAL", path: candidatePath });
  }
  return relativePath;
}

async function readTextFileBounded(projectRoot, relativePath, maxBytes) {
  const safePath = normalizeProjectPath(projectRoot, relativePath);
  const absolutePath = path.join(path.resolve(projectRoot), safePath);
  let metadata;
  try {
    metadata = await stat(absolutePath);
  } catch (error) {
    throw new TestAntiPatternError(`Required file is unreadable: ${safePath}`, { code: "TEST_ANTI_PATTERN_FILE_UNREADABLE", path: safePath, cause: error });
  }
  if (!metadata.isFile()) {
    throw new TestAntiPatternError(`Required path is not a file: ${safePath}`, { code: "TEST_ANTI_PATTERN_NOT_A_FILE", path: safePath });
  }
  if (metadata.size > maxBytes) {
    throw new TestAntiPatternError(`File exceeds bounded read size ${maxBytes}: ${safePath}`, { code: "TEST_ANTI_PATTERN_FILE_TOO_LARGE", path: safePath });
  }
  return readFile(absolutePath, "utf8");
}

async function readJsonFileBounded(projectRoot, relativePath, maxBytes) {
  const text = await readTextFileBounded(projectRoot, relativePath, maxBytes);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new TestAntiPatternError(`Invalid JSON in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`, { code: "TEST_ANTI_PATTERN_INVALID_JSON", path: relativePath, cause: error });
  }
}

async function pathExists(projectRoot, relativePath) {
  try {
    await stat(path.join(path.resolve(projectRoot), normalizeProjectPath(projectRoot, relativePath)));
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(projectRoot, startPath) {
  const root = path.resolve(projectRoot);
  const start = normalizeProjectPath(root, startPath);
  const files = [];
  async function visit(relativeDirectory) {
    const absoluteDirectory = path.join(root, relativeDirectory);
    let entries;
    try {
      entries = await readdir(absoluteDirectory, { withFileTypes: true });
    } catch (error) {
      throw new TestAntiPatternError(`Unable to read test root: ${relativeDirectory}`, { code: "TEST_ANTI_PATTERN_TEST_ROOT_UNREADABLE", path: relativeDirectory, cause: error });
    }
    for (const entry of entries) {
      const relative = toPosixPath(path.join(relativeDirectory, entry.name));
      if (entry.isDirectory()) {
        if (!["node_modules", ".git", "dist", "build"].includes(entry.name)) await visit(relative);
      } else if (entry.isFile()) {
        files.push(relative);
      }
    }
  }
  await visit(start);
  return files.sort();
}

function createFinding({ ruleId, path: findingPath, message, evidence = {}, severity = "error", blocking = severity === "error" }) {
  const finding = { family: TEST_ANTI_PATTERN_FAMILY, ruleId, severity, blocking, path: findingPath, message, evidence };
  assertTestAntiPatternFinding(finding);
  return finding;
}

export function assertTestAntiPatternFinding(value) {
  if (!isPlainObject(value)) throw new TestAntiPatternError("Finding must be an object.", { code: "TEST_ANTI_PATTERN_UNTYPED_FINDING" });
  for (const key of ["family", "ruleId", "severity", "blocking", "path", "message", "evidence"]) {
    if (!(key in value)) throw new TestAntiPatternError(`Finding missing required field: ${key}`, { code: "TEST_ANTI_PATTERN_UNTYPED_FINDING" });
  }
  if (value.family !== TEST_ANTI_PATTERN_FAMILY) throw new TestAntiPatternError("Finding family mismatch.", { code: "TEST_ANTI_PATTERN_UNTYPED_FINDING" });
  if (typeof value.ruleId !== "string" || value.ruleId.length === 0) throw new TestAntiPatternError("Finding ruleId must be a non-empty string.", { code: "TEST_ANTI_PATTERN_UNTYPED_FINDING" });
  if (!["error", "warning"].includes(value.severity)) throw new TestAntiPatternError("Finding severity is unsupported.", { code: "TEST_ANTI_PATTERN_UNTYPED_FINDING" });
  if (typeof value.blocking !== "boolean") throw new TestAntiPatternError("Finding blocking must be boolean.", { code: "TEST_ANTI_PATTERN_UNTYPED_FINDING" });
  if (typeof value.path !== "string") throw new TestAntiPatternError("Finding path must be string.", { code: "TEST_ANTI_PATTERN_UNTYPED_FINDING" });
  if (typeof value.message !== "string" || value.message.length === 0) throw new TestAntiPatternError("Finding message must be non-empty string.", { code: "TEST_ANTI_PATTERN_UNTYPED_FINDING" });
  if (!isPlainObject(value.evidence)) throw new TestAntiPatternError("Finding evidence must be an object.", { code: "TEST_ANTI_PATTERN_UNTYPED_FINDING" });
  return true;
}

export function assertTestAntiPatternFindings(findings) {
  if (!Array.isArray(findings)) throw new TestAntiPatternError("Findings carrier must be an array.", { code: "TEST_ANTI_PATTERN_UNTYPED_FINDING" });
  for (const finding of findings) assertTestAntiPatternFinding(finding);
  return true;
}

function result(projectRoot, findings, evidence) {
  assertTestAntiPatternFindings(findings);
  return {
    family: TEST_ANTI_PATTERN_FAMILY,
    ok: findings.filter((finding) => finding.blocking).length === 0,
    projectRoot: path.resolve(projectRoot),
    findings,
    evidence
  };
}

function readStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => typeof entry === "string" && entry.length > 0) ? value : undefined;
}

function validatePolicy(rawPolicy, policyPath, findings) {
  if (!isPlainObject(rawPolicy)) {
    findings.push(createFinding({ ruleId: "policy.malformed", path: policyPath, message: "Test anti-pattern policy must be a JSON object." }));
    return undefined;
  }
  for (const key of Object.keys(rawPolicy)) {
    if (!ALLOWED_POLICY_KEYS.has(key)) findings.push(createFinding({ ruleId: "policy.unknown-field", path: `${policyPath}#/${key}`, message: "Unknown test anti-pattern policy field fails closed.", evidence: { key } }));
  }
  if (rawPolicy.schemaVersion !== TEST_ANTI_PATTERN_POLICY_VERSION) findings.push(createFinding({ ruleId: "policy.malformed", path: `${policyPath}#/schemaVersion`, message: "Unsupported test anti-pattern policy version." }));
  if (rawPolicy.proofMode !== "typescript-ast") findings.push(createFinding({ ruleId: "policy.regex-only-proof-rejected", path: `${policyPath}#/proofMode`, message: "Test anti-pattern proof must use TypeScript AST/structured parsing, not regex-only proof.", evidence: { actual: rawPolicy.proofMode ?? null } }));

  const testRoots = readStringArray(rawPolicy.testRoots);
  if (!testRoots) findings.push(createFinding({ ruleId: "policy.malformed", path: `${policyPath}#/testRoots`, message: "Policy testRoots must be a non-empty string array." }));
  const requiredSkipMetadata = rawPolicy.requiredSkipMetadata === undefined ? ["owner", "date", "reason"] : readStringArray(rawPolicy.requiredSkipMetadata);
  if (!requiredSkipMetadata) findings.push(createFinding({ ruleId: "policy.malformed", path: `${policyPath}#/requiredSkipMetadata`, message: "Policy requiredSkipMetadata must be a non-empty string array." }));
  const normalizedSnapshotHelpers = rawPolicy.normalizedSnapshotHelpers === undefined ? ["normalizeVolatileOutput"] : readStringArray(rawPolicy.normalizedSnapshotHelpers);
  if (!normalizedSnapshotHelpers) findings.push(createFinding({ ruleId: "policy.malformed", path: `${policyPath}#/normalizedSnapshotHelpers`, message: "Policy normalizedSnapshotHelpers must be a non-empty string array." }));
  const requiredSetupFiles = rawPolicy.requiredSetupFiles === undefined ? [] : readStringArray(rawPolicy.requiredSetupFiles);
  if (rawPolicy.requiredSetupFiles !== undefined && !requiredSetupFiles) findings.push(createFinding({ ruleId: "policy.malformed", path: `${policyPath}#/requiredSetupFiles`, message: "Policy requiredSetupFiles must be a non-empty string array when present." }));
  const requiredSetupAssertionCalls = rawPolicy.requiredSetupAssertionCalls === undefined ? [] : readStringArray(rawPolicy.requiredSetupAssertionCalls);
  if (rawPolicy.requiredSetupAssertionCalls !== undefined && !requiredSetupAssertionCalls) findings.push(createFinding({ ruleId: "policy.malformed", path: `${policyPath}#/requiredSetupAssertionCalls`, message: "Policy requiredSetupAssertionCalls must be a non-empty string array when present." }));
  const setupSentinels = rawPolicy.setupSentinels === undefined ? [] : rawPolicy.setupSentinels;
  if (!Array.isArray(setupSentinels) || !setupSentinels.every((entry) => isPlainObject(entry) && typeof entry.file === "string" && entry.file.length > 0 && typeof entry.contains === "string" && entry.contains.length > 0)) {
    findings.push(createFinding({ ruleId: "policy.malformed", path: `${policyPath}#/setupSentinels`, message: "Policy setupSentinels must contain { file, contains } entries." }));
  }
  const publicClaims = rawPolicy.publicClaims === undefined ? [] : rawPolicy.publicClaims;
  if (!Array.isArray(publicClaims) || !publicClaims.every((entry) => isPlainObject(entry) && typeof entry.id === "string" && entry.id.length > 0 && typeof entry.claimPath === "string" && entry.claimPath.length > 0 && typeof entry.requiredTestNameIncludes === "string" && entry.requiredTestNameIncludes.length > 0 && (entry.requiredClaimText === undefined || (typeof entry.requiredClaimText === "string" && entry.requiredClaimText.length > 0)))) {
    findings.push(createFinding({ ruleId: "policy.malformed", path: `${policyPath}#/publicClaims`, message: "Policy publicClaims must contain { id, claimPath, requiredTestNameIncludes } entries and may include non-empty requiredClaimText." }));
  }
  const riskyBehaviors = rawPolicy.riskyBehaviors === undefined ? [] : rawPolicy.riskyBehaviors;
  if (!Array.isArray(riskyBehaviors) || !riskyBehaviors.every((entry) => isPlainObject(entry) && typeof entry.id === "string" && typeof entry.requiredNegativeTestNameIncludes === "string")) {
    findings.push(createFinding({ ruleId: "policy.malformed", path: `${policyPath}#/riskyBehaviors`, message: "Policy riskyBehaviors must contain { id, requiredNegativeTestNameIncludes } entries." }));
  }
  if (rawPolicy.allowSkippedWithMetadata !== undefined && typeof rawPolicy.allowSkippedWithMetadata !== "boolean") findings.push(createFinding({ ruleId: "policy.malformed", path: `${policyPath}#/allowSkippedWithMetadata`, message: "Policy allowSkippedWithMetadata must be boolean when present." }));
  if (rawPolicy.exactCountRequired !== undefined && typeof rawPolicy.exactCountRequired !== "boolean") findings.push(createFinding({ ruleId: "policy.malformed", path: `${policyPath}#/exactCountRequired`, message: "Policy exactCountRequired must be boolean when present." }));
  if (rawPolicy.requiredRegressionFailureShape !== undefined && typeof rawPolicy.requiredRegressionFailureShape !== "boolean") findings.push(createFinding({ ruleId: "policy.malformed", path: `${policyPath}#/requiredRegressionFailureShape`, message: "Policy requiredRegressionFailureShape must be boolean when present." }));
  if (findings.length > 0 || !testRoots || !requiredSkipMetadata || !normalizedSnapshotHelpers) return undefined;
  return {
    schemaVersion: TEST_ANTI_PATTERN_POLICY_VERSION,
    proofMode: "typescript-ast",
    testRoots,
    allowSkippedWithMetadata: rawPolicy.allowSkippedWithMetadata ?? true,
    requiredSkipMetadata,
    normalizedSnapshotHelpers,
    requiredSetupFiles: requiredSetupFiles ?? [],
    setupSentinels,
    requiredSetupAssertionCalls: requiredSetupAssertionCalls ?? [],
    publicClaims,
    riskyBehaviors,
    exactCountRequired: rawPolicy.exactCountRequired ?? true,
    requiredRegressionFailureShape: rawPolicy.requiredRegressionFailureShape ?? true
  };
}

function sourceKind(filePath) {
  if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs") || filePath.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function expressionName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) {
    const left = expressionName(expression.expression);
    return left ? `${left}.${expression.name.text}` : expression.name.text;
  }
  return undefined;
}

function callName(node) {
  return ts.isCallExpression(node) ? expressionName(node.expression) : undefined;
}

function propertyAccessChainEndsWith(name, suffix) {
  return name === suffix || name.endsWith(`.${suffix}`);
}

function firstStringArgument(callExpression) {
  const first = callExpression.arguments[0];
  return first && ts.isStringLiteralLike(first) ? first.text : undefined;
}

function bodyOfTestCall(callExpression) {
  return callExpression.arguments.find((argument) => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument));
}

function leadingText(sourceFile, node) {
  const fullText = sourceFile.getFullText();
  const ranges = ts.getLeadingCommentRanges(fullText, node.pos) ?? [];
  return ranges.map((range) => fullText.slice(range.pos, range.end)).join("\n");
}

function hasMetadata(commentText, requiredKeys) {
  return requiredKeys.every((key) => {
    if (key === "date") return /@date\s+\d{4}-\d{2}-\d{2}/u.test(commentText);
    return new RegExp(`@${key}\\s+\\S+`, "u").test(commentText);
  });
}

function isTestCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const name = callName(node) ?? "";
  return ["test", "it", "test.skip", "it.skip", "test.only", "it.only", "describe.skip"].includes(name);
}

function isSkippedTestCall(node) {
  const name = callName(node) ?? "";
  return name === "test.skip" || name === "it.skip" || name === "describe.skip";
}

function collectIdentifiersAndStrings(node) {
  const values = [];
  function visit(current) {
    if (ts.isIdentifier(current)) values.push(current.text);
    if (ts.isStringLiteralLike(current)) values.push(current.text);
    ts.forEachChild(current, visit);
  }
  visit(node);
  return values;
}

function hasCallNamed(node, names) {
  let found = false;
  function visit(current) {
    if (found) return;
    if (ts.isCallExpression(current)) {
      const name = callName(current);
      if (name && names.some((candidate) => name === candidate || name.endsWith(`.${candidate}`))) found = true;
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return found;
}

function containsFailureShapeEvidence(sourceFile, node) {
  const comment = leadingText(sourceFile, node);
  return /@failure-shape\s+\S+/u.test(comment) || hasCallNamed(node, ["explainFailureShape", "assertFailureShape"]);
}

function isExpectCall(node) {
  return ts.isCallExpression(node) && callName(node) === "expect";
}

function isExitCodeExpression(node) {
  const text = node.getText();
  return /(^|\.)exitCode$/u.test(text) || /(^|\.)(status|code)$/u.test(text);
}

function inspectAssertions(testCase) {
  const assertions = [];
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const name = callName(node) ?? "";
      if (ts.isPropertyAccessExpression(node.expression) && ts.isCallExpression(node.expression.expression) && isExpectCall(node.expression.expression)) {
        const expectArg = node.expression.expression.arguments[0];
        assertions.push({ matcher: node.expression.name.text, expectArg, matcherArgs: [...node.arguments], node, exitOnly: expectArg ? isExitCodeExpression(expectArg) : false, snapshot: node.expression.name.text === "toMatchSnapshot" || node.expression.name.text === "toMatchInlineSnapshot" });
      } else if (name.startsWith("assert") || name.startsWith("assert.")) {
        assertions.push({ matcher: name, expectArg: node.arguments[0], matcherArgs: [...node.arguments].slice(1), node, exitOnly: node.arguments[0] ? isExitCodeExpression(node.arguments[0]) : false, snapshot: false });
      }
    }
    ts.forEachChild(node, visit);
  }
  if (testCase.body) visit(testCase.body);
  return assertions;
}

function isWeakCountAssertion(assertion) {
  const matcher = assertion.matcher;
  const argText = assertion.expectArg?.getText() ?? "";
  const fullText = assertion.node.getText();
  if (argText.endsWith(".length") && (matcher === "toBeGreaterThan" || matcher === "toBeGreaterThanOrEqual") && assertion.node.arguments.some((argument) => argument.getText() === "1")) return true;
  if ((matcher === "toBe" || matcher === "toEqual") && /\.length\s*>?=\s*1/u.test(argText) && assertion.node.arguments.some((argument) => argument.getText() === "true")) return true;
  return /\.length\s*>?=\s*1/u.test(fullText);
}

function isNormalizedSnapshot(assertion, helperNames) {
  const expectArg = assertion.expectArg;
  if (!expectArg) return false;
  let normalized = false;
  function visit(node) {
    if (normalized) return;
    if (ts.isCallExpression(node)) {
      const name = callName(node);
      if (name && helperNames.some((helper) => name === helper || name.endsWith(`.${helper}`))) normalized = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(expectArg);
  return normalized;
}

function unwrapExpression(node) {
  let current = node;
  while (current) {
    if (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isTypeAssertionExpression(current) || ts.isSatisfiesExpression(current) || ts.isNonNullExpression(current)) {
      current = current.expression;
      continue;
    }
    return current;
  }
  return undefined;
}

function literalValue(node) {
  const unwrapped = unwrapExpression(node);
  if (!unwrapped) return undefined;
  if (ts.isStringLiteralLike(unwrapped) || ts.isNumericLiteral(unwrapped)) return unwrapped.text;
  if (unwrapped.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (unwrapped.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (unwrapped.kind === ts.SyntaxKind.NullKeyword) return null;
  return undefined;
}

function literalIdentity(node) {
  const unwrapped = unwrapExpression(node);
  if (!unwrapped) return undefined;
  if (ts.isStringLiteralLike(unwrapped) || unwrapped.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) return { kind: "string", value: unwrapped.text };
  if (ts.isNumericLiteral(unwrapped)) return { kind: "number", value: unwrapped.text };
  if (unwrapped.kind === ts.SyntaxKind.TrueKeyword) return { kind: "boolean", value: true };
  if (unwrapped.kind === ts.SyntaxKind.FalseKeyword) return { kind: "boolean", value: false };
  if (unwrapped.kind === ts.SyntaxKind.NullKeyword) return { kind: "null", value: null };
  if (ts.isPrefixUnaryExpression(unwrapped) && ts.isNumericLiteral(unwrapExpression(unwrapped.operand)) && (unwrapped.operator === ts.SyntaxKind.MinusToken || unwrapped.operator === ts.SyntaxKind.PlusToken)) {
    const operand = unwrapExpression(unwrapped.operand);
    return { kind: "number", value: `${unwrapped.operator === ts.SyntaxKind.MinusToken ? "-" : "+"}${operand.text}` };
  }
  return undefined;
}

function sameLiteralIdentity(left, right) {
  return Boolean(left && right && left.kind === right.kind && left.value === right.value);
}

function literalBindingIdentity(expression, literalBindings, seen = new Set()) {
  const unwrapped = unwrapExpression(expression);
  const direct = literalIdentity(unwrapped);
  if (direct) return direct;
  if (unwrapped && ts.isIdentifier(unwrapped)) {
    if (seen.has(unwrapped.text)) return undefined;
    seen.add(unwrapped.text);
    return literalBindings.get(unwrapped.text);
  }
  return undefined;
}

function collectLiteralBindings(testBody) {
  const literalBindings = new Map();
  if (!testBody) return literalBindings;
  function visit(node) {
    if (ts.isVariableStatement(node) && (node.declarationList.flags & ts.NodeFlags.Const) !== 0) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          const identity = literalBindingIdentity(declaration.initializer, literalBindings);
          if (identity) literalBindings.set(declaration.name.text, identity);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(testBody);
  return literalBindings;
}

function expressionTextMatches(left, right) {
  const unwrappedLeft = unwrapExpression(left);
  const unwrappedRight = unwrapExpression(right);
  return Boolean(unwrappedLeft && unwrappedRight && unwrappedLeft.getText() === unwrappedRight.getText());
}

function isVacuousLiteralAssertion(assertion, literalBindings) {
  const expectArg = unwrapExpression(assertion.expectArg);
  const firstMatcherArg = unwrapExpression(assertion.matcherArgs[0]);
  if (literalValue(expectArg) !== undefined) return true;
  if (expectArg && (ts.isObjectLiteralExpression(expectArg) || ts.isArrayLiteralExpression(expectArg))) return true;
  if (expectArg && ts.isPropertyAccessExpression(expectArg) && (ts.isObjectLiteralExpression(unwrapExpression(expectArg.expression)) || ts.isArrayLiteralExpression(unwrapExpression(expectArg.expression)))) return true;
  if (expressionTextMatches(expectArg, firstMatcherArg)) return true;
  const expectIdentity = literalBindingIdentity(expectArg, literalBindings);
  if (expectIdentity) return true;
  const matcherIdentity = literalBindingIdentity(firstMatcherArg, literalBindings);
  if (sameLiteralIdentity(expectIdentity, matcherIdentity)) return true;
  return false;
}

function isMeaningfulAssertion(assertion, policy, literalBindings) {
  if (assertion.exitOnly) return false;
  if (assertion.snapshot) return isNormalizedSnapshot(assertion, policy.normalizedSnapshotHelpers);
  if (isVacuousLiteralAssertion(assertion, literalBindings)) return false;
  return true;
}

function containsSilentFallback(node) {
  let found = false;
  function visit(current) {
    if (found) return;
    if (ts.isBinaryExpression(current) && (current.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || current.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
      const right = current.right;
      if (ts.isArrayLiteralExpression(right) || ts.isObjectLiteralExpression(right) || ts.isStringLiteralLike(right) || ts.isNumericLiteral(right) || right.kind === ts.SyntaxKind.TrueKeyword || right.kind === ts.SyntaxKind.FalseKeyword) found = true;
    }
    if (ts.isCatchClause(current) && current.block.statements.some((statement) => ts.isReturnStatement(statement))) found = true;
    if (ts.isCallExpression(current)) {
      const name = callName(current) ?? "";
      if (name.includes("OptionalFixture") || name.includes("fallback") || name.includes("Fallback")) found = true;
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return found;
}

function extractTestCases(sourceFile) {
  const testCases = [];
  function visit(node, skippedAncestor = false, inheritedSkipMetadataText = "") {
    const name = ts.isCallExpression(node) ? callName(node) ?? "" : "";
    const currentSkipped = ts.isCallExpression(node) && isSkippedTestCall(node);
    const currentComments = ts.isCallExpression(node) ? leadingText(sourceFile, node) : "";
    const skippedBySuiteContext = skippedAncestor || currentSkipped;
    const skipMetadataText = currentSkipped ? currentComments || inheritedSkipMetadataText : inheritedSkipMetadataText;
    if (isTestCall(node)) {
      testCases.push({
        name: firstStringArgument(node) ?? "<unnamed>",
        call: name,
        skipped: skippedBySuiteContext,
        skippedByAncestor: skippedAncestor,
        body: bodyOfTestCall(node),
        node,
        comments: currentComments,
        skipMetadataText
      });
    }
    const childSkippedAncestor = skippedBySuiteContext && name === "describe.skip" ? true : skippedAncestor;
    const childSkipMetadataText = name === "describe.skip" ? currentComments || inheritedSkipMetadataText : inheritedSkipMetadataText;
    ts.forEachChild(node, (child) => visit(child, childSkippedAncestor, childSkipMetadataText));
  }
  visit(sourceFile);
  return testCases;
}

function inspectTestFile(unit, policy, findings) {
  const testCases = extractTestCases(unit.sourceFile);
  if (testCases.length === 0) {
    findings.push(createFinding({ ruleId: "test-file.no-test-declarations", path: unit.filePath, message: "Discovered test file contains no structured test declarations." }));
    return [];
  }
  const wholeFileTokens = collectIdentifiersAndStrings(unit.sourceFile);
  if (wholeFileTokens.includes("validateTestAntiPatterns") || wholeFileTokens.includes(TEST_ANTI_PATTERN_FAMILY)) {
    findings.push(createFinding({ ruleId: "parser-self-agreement-fixture", path: unit.filePath, message: "Test file appears to test or mirror the scanner/parser itself instead of proving subject behavior.", evidence: { tokens: wholeFileTokens.filter((entry) => entry === "validateTestAntiPatterns" || entry === TEST_ANTI_PATTERN_FAMILY) } }));
  }
  for (const requiredCall of policy.requiredSetupAssertionCalls) {
    if (!hasCallNamed(unit.sourceFile, [requiredCall])) {
      findings.push(createFinding({ ruleId: "setup-resource.missing-assertion", path: unit.filePath, message: "Test file does not fail loudly through the required setup/resource assertion call.", evidence: { requiredCall } }));
    }
  }
  for (const testCase of testCases) {
    testCase.hasFailureShape = containsFailureShapeEvidence(unit.sourceFile, testCase.node);
    testCase.assertionCount = 0;
    testCase.meaningfulAssertionCount = 0;
    testCase.executable = false;
    if (testCase.skipped) {
      const metadataText = testCase.skipMetadataText || testCase.comments;
      if (!policy.allowSkippedWithMetadata || !hasMetadata(metadataText, policy.requiredSkipMetadata)) {
        findings.push(createFinding({ ruleId: "skipped-test.missing-metadata", path: unit.filePath, message: "Skipped tests require owner/date/reason metadata and policy permission.", evidence: { testName: testCase.name, requiredMetadata: policy.requiredSkipMetadata, skippedByAncestor: testCase.skippedByAncestor === true } }));
      }
      continue;
    }
    if (!testCase.body) {
      findings.push(createFinding({ ruleId: "test.no-meaningful-assertions", path: unit.filePath, message: "Test declaration has no executable body with meaningful assertions.", evidence: { testName: testCase.name } }));
      continue;
    }
    testCase.executable = true;
    const literalBindings = collectLiteralBindings(testCase.body);
    const assertions = inspectAssertions(testCase);
    const meaningfulAssertions = assertions.filter((entry) => isMeaningfulAssertion(entry, policy, literalBindings));
    testCase.assertionCount = assertions.length;
    testCase.meaningfulAssertionCount = meaningfulAssertions.length;
    if (assertions.length === 0 || meaningfulAssertions.length === 0) {
      const onlyExitCode = assertions.length > 0 && assertions.every((entry) => entry.exitOnly);
      findings.push(createFinding({ ruleId: onlyExitCode ? "test.exit-code-only" : "test.no-meaningful-assertions", path: unit.filePath, message: onlyExitCode ? "Test only asserts process/command exit status and does not prove behavior." : "Test has no meaningful semantic assertions.", evidence: { testName: testCase.name, assertionCount: assertions.length } }));
    }
    if (/\b(smoke|loads|starts|does not crash|renders without crashing)\b/iu.test(testCase.name) && meaningfulAssertions.length < 2 && !containsFailureShapeEvidence(unit.sourceFile, testCase.node)) {
      findings.push(createFinding({ ruleId: "test.smoke-only", path: unit.filePath, message: "Smoke-only QA cannot stand in for meaningful behavior proof.", evidence: { testName: testCase.name, meaningfulAssertionCount: meaningfulAssertions.length } }));
    }
    if (policy.exactCountRequired) {
      for (const assertion of assertions) {
        if (isWeakCountAssertion(assertion)) findings.push(createFinding({ ruleId: "test.weak-count-assertion", path: unit.filePath, message: "Weak count assertion such as length >= 1 is forbidden where exactness matters.", evidence: { testName: testCase.name, expression: assertion.node.getText() } }));
      }
    }
    if (containsSilentFallback(testCase.body)) {
      findings.push(createFinding({ ruleId: "test.silent-fallback", path: unit.filePath, message: "Test codifies silent fallback/default behavior instead of requiring loud setup or subject failure.", evidence: { testName: testCase.name } }));
    }
    for (const assertion of assertions) {
      if (assertion.snapshot && !isNormalizedSnapshot(assertion, policy.normalizedSnapshotHelpers)) {
        findings.push(createFinding({ ruleId: "snapshot.volatile-without-normalization", path: unit.filePath, message: "Snapshot assertions over volatile output must use an explicit normalization helper.", evidence: { testName: testCase.name, matcher: assertion.matcher, helpers: policy.normalizedSnapshotHelpers } }));
      }
    }
    if (/\b(regression|bug)\b/iu.test(testCase.name) && policy.requiredRegressionFailureShape && !containsFailureShapeEvidence(unit.sourceFile, testCase.node)) {
      findings.push(createFinding({ ruleId: "regression.missing-failure-shape", path: unit.filePath, message: "Regression tests must explain the failure shape they protect.", evidence: { testName: testCase.name } }));
    }
  }
  return testCases;
}

async function inspectSetupResources(projectRoot, policy, findings, maxFileBytes) {
  for (const setupFile of policy.requiredSetupFiles) {
    try {
      normalizeProjectPath(projectRoot, setupFile);
      if (!(await pathExists(projectRoot, setupFile))) findings.push(createFinding({ ruleId: "setup-resource.missing", path: setupFile, message: "Required setup/resource fixture is missing; scanner fails closed." }));
    } catch (error) {
      findings.push(createFinding({ ruleId: "setup-resource.path-traversal", path: setupFile, message: "Required setup/resource path escapes project root.", evidence: { errorMessage: error instanceof Error ? error.message : String(error) } }));
    }
  }
  for (const sentinel of policy.setupSentinels) {
    try {
      const text = await readTextFileBounded(projectRoot, sentinel.file, maxFileBytes);
      if (!text.includes(sentinel.contains)) findings.push(createFinding({ ruleId: "setup-resource.sentinel-failure", path: sentinel.file, message: "Setup/resource sentinel content did not match required marker; scanner fails closed.", evidence: { contains: sentinel.contains } }));
    } catch (error) {
      findings.push(createFinding({ ruleId: "setup-resource.sentinel-failure", path: sentinel.file, message: "Setup/resource sentinel is missing or unreadable; scanner fails closed.", evidence: { errorMessage: error instanceof Error ? error.message : String(error), contains: sentinel.contains } }));
    }
  }
}

async function discoverTestFiles(projectRoot, policy, findings) {
  const testFiles = [];
  for (const root of policy.testRoots) {
    try {
      normalizeProjectPath(projectRoot, root);
      if (!(await pathExists(projectRoot, root))) {
        findings.push(createFinding({ ruleId: "discovery.test-root-missing", path: root, message: "Configured test root is missing; scanner fails closed." }));
        continue;
      }
      const files = await walkFiles(projectRoot, root);
      testFiles.push(...files.filter((file) => TEST_FILE_SUFFIXES.some((suffix) => file.endsWith(suffix))));
    } catch (error) {
      findings.push(createFinding({ ruleId: "discovery.test-root-invalid", path: root, message: "Configured test root is invalid or outside the project root.", evidence: { errorMessage: error instanceof Error ? error.message : String(error) } }));
    }
  }
  const unique = [...new Set(testFiles)].sort();
  if (unique.length === 0) findings.push(createFinding({ ruleId: "discovery.no-test-files", path: ".", message: "Configured test roots contain no discoverable real test files." }));
  return unique;
}

async function readAndParseTestFile(projectRoot, filePath, maxFileBytes) {
  const text = await readTextFileBounded(projectRoot, filePath, maxFileBytes);
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, sourceKind(filePath));
  const diagnostics = sourceFile.parseDiagnostics ?? [];
  if (diagnostics.length > 0) {
    throw new TestAntiPatternError("TypeScript parser reported syntax diagnostics.", { code: "TEST_ANTI_PATTERN_PARSE_FAILURE", path: filePath });
  }
  return { filePath, text, sourceFile };
}

async function inspectPolicyCoverage(projectRoot, policy, allTestCases, findings, maxFileBytes) {
  const testNames = allTestCases.map((entry) => entry.name);
  const executableMeaningfulTestCases = allTestCases.filter((entry) => entry.executable === true && entry.skipped !== true && entry.meaningfulAssertionCount > 0);
  const executableMeaningfulTestNames = executableMeaningfulTestCases.map((entry) => entry.name);
  for (const claim of policy.publicClaims) {
    let claimText;
    try {
      claimText = await readTextFileBounded(projectRoot, claim.claimPath, maxFileBytes);
    } catch (error) {
      findings.push(createFinding({ ruleId: "public-claim.source-unreadable", path: claim.claimPath, message: "Public/README claim source is missing, unreadable, too large, or outside the validation root; scanner fails closed.", evidence: { claimId: claim.id, errorMessage: error instanceof Error ? error.message : String(error) } }));
      continue;
    }
    const requiredClaimText = claim.requiredClaimText ?? claim.id.split("-").join(" ").split("_").join(" ");
    if (!claimText.toLowerCase().includes(requiredClaimText.toLowerCase())) {
      findings.push(createFinding({ ruleId: "public-claim.source-missing-text", path: claim.claimPath, message: "Public/README claim source does not contain the required mechanically declared claim text.", evidence: { claimId: claim.id, requiredClaimText } }));
    }
    if (!executableMeaningfulTestNames.some((name) => name.includes(claim.requiredTestNameIncludes))) {
      findings.push(createFinding({ ruleId: "public-claim.coverage-gap", path: claim.claimPath, message: "Public/README claim lacks executable non-skipped test coverage with meaningful assertions.", evidence: { claimId: claim.id, requiredTestNameIncludes: claim.requiredTestNameIncludes, testNames, executableMeaningfulTestNames } }));
    }
  }
  for (const behavior of policy.riskyBehaviors) {
    const matching = executableMeaningfulTestCases.filter((testCase) => testCase.name.includes(behavior.requiredNegativeTestNameIncludes));
    if (matching.length === 0) {
      findings.push(createFinding({ ruleId: "risky-behavior.happy-path-only", path: ".", message: "Risky behavior has only happy-path coverage or no executable meaningful negative/failure test.", evidence: { behaviorId: behavior.id, requiredNegativeTestNameIncludes: behavior.requiredNegativeTestNameIncludes, testNames, executableMeaningfulTestNames } }));
      continue;
    }
    if (policy.requiredRegressionFailureShape && matching.every((testCase) => !testCase.hasFailureShape)) {
      findings.push(createFinding({ ruleId: "risky-behavior.happy-path-only", path: ".", message: "Risky behavior negative/regression coverage must explain the protected failure shape.", evidence: { behaviorId: behavior.id, requiredNegativeTestNameIncludes: behavior.requiredNegativeTestNameIncludes, executableMeaningfulTestNames } }));
    }
  }
}

function validateOptions(projectRoot, options) {
  const findings = [];
  if (!isPlainObject(options)) {
    findings.push(createFinding({ ruleId: "policy.invalid-validator-option", path: ".", message: "Validator options must be a plain object when provided.", evidence: { actualType: Array.isArray(options) ? "array" : typeof options } }));
    return { findings };
  }
  const optionKeys = Object.keys(options);
  const unknownOption = optionKeys.find((key) => !["policyPath", "maxFileBytes"].includes(key));
  if (unknownOption) {
    findings.push(createFinding({ ruleId: "policy.unknown-validator-option", path: ".", message: "Unknown test anti-pattern validator option fails closed.", evidence: { option: unknownOption } }));
  }
  const policyPath = options.policyPath ?? DEFAULT_POLICY_PATH;
  if (typeof policyPath !== "string" || policyPath.length === 0) {
    findings.push(createFinding({ ruleId: "policy.invalid-validator-option", path: ".", message: "Validator policyPath option must be a non-empty project-relative string.", evidence: { option: "policyPath", actualType: typeof policyPath } }));
  } else {
    try {
      normalizeProjectPath(projectRoot, policyPath);
    } catch (error) {
      findings.push(createFinding({ ruleId: "policy.invalid-validator-option", path: policyPath, message: "Validator policyPath option must stay inside the validation root.", evidence: { option: "policyPath", errorMessage: error instanceof Error ? error.message : String(error) } }));
    }
  }
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes <= 0 || maxFileBytes > ABSOLUTE_MAX_FILE_BYTES) {
    findings.push(createFinding({ ruleId: "policy.invalid-validator-option", path: ".", message: "Validator maxFileBytes option must be a positive safe integer within the bounded-read cap.", evidence: { option: "maxFileBytes", actual: maxFileBytes, cap: ABSOLUTE_MAX_FILE_BYTES } }));
  }
  if (findings.length > 0) return { findings };
  return { findings, policyPath, maxFileBytes };
}

export async function validateTestAntiPatterns(projectRoot, options = {}) {
  const optionState = validateOptions(projectRoot, options);
  if (optionState.findings.length > 0) return result(projectRoot, optionState.findings, { failClosed: true });
  const { policyPath, maxFileBytes } = optionState;
  const findings = [];
  let rawPolicy;
  try {
    rawPolicy = await readJsonFileBounded(projectRoot, policyPath, maxFileBytes);
  } catch (error) {
    return result(projectRoot, [createFinding({ ruleId: "policy.unreadable", path: policyPath, message: "Test anti-pattern policy is missing, unreadable, malformed, or outside the validation root.", evidence: { errorMessage: error instanceof Error ? error.message : String(error) } })], { policyPath, failClosed: true });
  }
  const policyFindings = [];
  const policy = validatePolicy(rawPolicy, policyPath, policyFindings);
  if (!policy) return result(projectRoot, policyFindings, { policyPath, failClosed: true });

  await inspectSetupResources(projectRoot, policy, findings, maxFileBytes);
  const discoveredTestFiles = await discoverTestFiles(projectRoot, policy, findings);
  const allTestCases = [];
  for (const filePath of discoveredTestFiles) {
    try {
      const unit = await readAndParseTestFile(projectRoot, filePath, maxFileBytes);
      const cases = inspectTestFile(unit, policy, findings);
      for (const testCase of cases) {
        allTestCases.push({
          path: unit.filePath,
          name: testCase.name,
          skipped: testCase.skipped,
          executable: testCase.executable === true,
          assertionCount: testCase.assertionCount ?? 0,
          meaningfulAssertionCount: testCase.meaningfulAssertionCount ?? 0,
          hasFailureShape: testCase.hasFailureShape === true
        });
      }
    } catch (error) {
      findings.push(createFinding({ ruleId: "parser.failure", path: filePath, message: "TypeScript/structured parser failed for a discovered test file; scanner fails closed.", evidence: { errorMessage: error instanceof Error ? error.message : String(error), errorCode: error && typeof error === "object" && "code" in error ? error.code : undefined } }));
    }
  }
  await inspectPolicyCoverage(projectRoot, policy, allTestCases, findings, maxFileBytes);
  return result(projectRoot, findings, {
    policyPath,
    parser: "typescript",
    proofMode: "typescript-ast",
    family: TEST_ANTI_PATTERN_FAMILY,
    discoveredTestFiles,
    testCaseCount: allTestCases.length,
    requiredSetupFiles: policy.requiredSetupFiles,
    requiredSetupAssertionCalls: policy.requiredSetupAssertionCalls,
    publicClaimCount: policy.publicClaims.length,
    riskyBehaviorCount: policy.riskyBehaviors.length
  });
}
