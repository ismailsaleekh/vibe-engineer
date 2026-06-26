import path from "node:path";
import ts from "typescript";
import {
  createFinding,
  createValidatorResult,
  normalizeProjectPath,
  P0ValidationError,
  readJsonFileBounded,
  readTextFileBounded,
  walkProjectFiles
} from "../boundaries/contracts.js";

const FAMILY = "p0.allowlist";
const DEFAULT_POLICY = "mechanical-escape-allowlist.json";
const SOURCE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"]);
const DEFAULT_GENERATED_VENDOR = ["generated", "vendor", "node_modules", "dist", "build"];
const DEFAULT_HARD_BANNED = ["as-any"];

function finding(ruleId, findingPath, message, evidence = {}) {
  return createFinding({ family: FAMILY, ruleId, path: findingPath, message, evidence });
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function includesPath(prefix, filePath) {
  return filePath === prefix || filePath.startsWith(`${prefix}/`);
}

function isSourceFile(filePath) {
  return SOURCE_EXTENSIONS.has(path.posix.extname(filePath));
}

function lineAndText(sourceFile, sourceText, start, end) {
  const position = sourceFile.getLineAndCharacterOfPosition(start);
  return {
    line: position.line + 1,
    column: position.character + 1,
    text: sourceText.slice(start, end).trim().slice(0, 160)
  };
}

function syntaxKindName(kind) {
  return ts.SyntaxKind[kind] ?? String(kind);
}

function makeEscape(kind, sourceFile, sourceText, start, end, evidence = {}) {
  const location = lineAndText(sourceFile, sourceText, start, end);
  return {
    kind,
    line: location.line,
    column: location.column,
    text: location.text,
    keyText: location.text,
    evidence: { ...evidence, line: location.line, column: location.column, excerpt: location.text }
  };
}

function commentDirectiveKind(commentText) {
  const text = commentText.trim();
  if (text.includes("@ts-ignore")) return "ts-ignore";
  if (text.includes("@ts-expect-error")) return "ts-expect-error";
  if (text.includes("@ts-nocheck")) return "ts-nocheck";
  if (text.includes("eslint-disable-next-line")) return "eslint-disable-next-line";
  if (text.includes("eslint-disable-line")) return "eslint-disable-line";
  if (text.includes("eslint-disable")) return "eslint-disable";
  return undefined;
}

function collectCommentEscapes(sourceText, sourceFile) {
  const escapes = [];
  const collect = (position) => {
    const ranges = [
      ...(ts.getLeadingCommentRanges(sourceText, position) ?? []),
      ...(ts.getTrailingCommentRanges(sourceText, position) ?? [])
    ];
    for (const range of ranges) {
      const text = sourceText.slice(range.pos, range.end);
      const kind = commentDirectiveKind(text);
      if (kind) {
        escapes.push(makeEscape(kind, sourceFile, sourceText, range.pos, range.end, { carrier: "typescript-comment-scanner" }));
      }
    }
  };
  collect(0);
  function visit(node) {
    collect(node.pos);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  const seen = new Set();
  return escapes.filter((escape) => {
    const key = `${escape.kind}:${escape.line}:${escape.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isNamedRuntimeSchemaCall(node) {
  if (!ts.isCallExpression(node)) return false;
  let expressionText = "";
  const expression = node.expression;
  if (ts.isIdentifier(expression)) expressionText = expression.text;
  if (ts.isPropertyAccessExpression(expression)) expressionText = expression.name.text;
  if (expressionText.length === 0) return false;
  const lowered = expressionText.toLowerCase();
  return lowered.includes("schema") || lowered.includes("parse") || lowered.includes("validate") || lowered.includes("narrow");
}

function sameExpressionConsumedByRuntimeNarrower(node) {
  let current = node;
  while (ts.isParenthesizedExpression(current.parent)) current = current.parent;
  const parent = current.parent;
  return ts.isCallExpression(parent) && parent.arguments.includes(current) && isNamedRuntimeSchemaCall(parent);
}

function statementIndex(statement) {
  const statements = statement.parent?.statements;
  if (!statements) return -1;
  return statements.indexOf(statement);
}

function runtimeNarrowerConsumesIdentifier(statement, variableName) {
  if (ts.isExpressionStatement(statement)) {
    const expression = statement.expression;
    return ts.isCallExpression(expression)
      && isNamedRuntimeSchemaCall(expression)
      && expression.arguments.some((argument) => ts.isIdentifier(argument) && argument.text === variableName);
  }
  if (ts.isVariableStatement(statement)) {
    if (statement.declarationList.declarations.length !== 1) return false;
    const [declaration] = statement.declarationList.declarations;
    const initializer = declaration.initializer;
    return Boolean(initializer
      && ts.isCallExpression(initializer)
      && isNamedRuntimeSchemaCall(initializer)
      && initializer.arguments.some((argument) => ts.isIdentifier(argument) && argument.text === variableName));
  }
  return false;
}

function variableInitializedByThisAsUnknown(node) {
  let current = node;
  while (ts.isParenthesizedExpression(current.parent)) current = current.parent;
  const parent = current.parent;
  if (!ts.isVariableDeclaration(parent) || parent.initializer !== current || !ts.isIdentifier(parent.name)) return undefined;
  if (parent.parent.declarations.length !== 1) return undefined;
  const statement = parent.parent?.parent;
  if (!statement || !ts.isVariableStatement(statement)) return undefined;
  return { variableName: parent.name.text, statement };
}

function isImmediatelyNarrowedAsUnknown(node) {
  if (sameExpressionConsumedByRuntimeNarrower(node)) return true;
  const variable = variableInitializedByThisAsUnknown(node);
  if (!variable) return false;
  const index = statementIndex(variable.statement);
  const next = index >= 0 ? variable.statement.parent.statements[index + 1] : undefined;
  return Boolean(next && runtimeNarrowerConsumesIdentifier(next, variable.variableName));
}

function collectAstEscapes(sourceText, relativePath) {
  const scriptKind = relativePath.endsWith(".tsx") || relativePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(relativePath, sourceText, ts.ScriptTarget.Latest, true, scriptKind);
  const escapes = [...collectCommentEscapes(sourceText, sourceFile)];

  function visit(node) {
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      const type = node.type;
      if (type.kind === ts.SyntaxKind.AnyKeyword) {
        escapes.push(makeEscape("as-any", sourceFile, sourceText, node.getStart(sourceFile), node.end, { carrier: "typescript-ast", typeKind: syntaxKindName(type.kind) }));
      } else if (type.kind === ts.SyntaxKind.UnknownKeyword && !isImmediatelyNarrowedAsUnknown(node)) {
        escapes.push(makeEscape("as-unknown", sourceFile, sourceText, node.getStart(sourceFile), node.end, { carrier: "typescript-ast", typeKind: syntaxKindName(type.kind), immediateRuntimeNarrowing: false }));
      }
    }

    if (ts.isNonNullExpression(node)) {
      escapes.push(makeEscape("non-null-assertion", sourceFile, sourceText, node.getStart(sourceFile), node.end, { carrier: "typescript-ast" }));
    }

    if (ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === "JSON"
      && node.expression.name.text === "parse"
      && !isNamedRuntimeSchemaCall(node.parent)) {
      escapes.push(makeEscape("raw-json-parse", sourceFile, sourceText, node.getStart(sourceFile), node.end, { carrier: "typescript-ast", callee: "JSON.parse" }));
    }

    if ((ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && ["Function", "Object"].includes(node.typeName.text))
      || node.kind === ts.SyntaxKind.FunctionType
      || (ts.isTypeLiteralNode(node) && node.members.length === 0)) {
      escapes.push(makeEscape("broad-type", sourceFile, sourceText, node.getStart(sourceFile), node.end, { carrier: "typescript-ast", syntaxKind: syntaxKindName(node.kind) }));
    }

    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return escapes;
}

function validatePolicyShape(projectRoot, policy, policyPath, findings) {
  if (!isPlainObject(policy) || policy.version !== 1) {
    findings.push(finding("allowlist.policy-schema", policyPath, "Allowlist policy must be an object with version: 1.", { policyPath }));
    return undefined;
  }
  if (policy.proofMode !== "typescript-ast-and-comment-scanner") {
    findings.push(finding("allowlist.regex-only-proof-rejected", `${policyPath}#/proofMode`, "Allowlist proof must use the TypeScript AST and comment scanner, not regex or narrative proof.", { expected: "typescript-ast-and-comment-scanner", actual: policy.proofMode }));
    return undefined;
  }
  if (!isPlainObject(policy.scan) || !Array.isArray(policy.scan.include) || policy.scan.include.length === 0) {
    findings.push(finding("allowlist.policy-schema", `${policyPath}#/scan`, "Allowlist policy must define scan.include as a non-empty array."));
    return undefined;
  }
  const include = [];
  const exclude = [];
  const generatedVendor = [];
  try {
    for (const value of policy.scan.include) {
      if (typeof value !== "string" || value.length === 0) throw new Error("invalid include path");
      include.push(normalizeProjectPath(projectRoot, value));
    }
    for (const value of policy.scan.exclude ?? []) {
      if (typeof value !== "string" || value.length === 0) throw new Error("invalid exclude path");
      exclude.push(normalizeProjectPath(projectRoot, value));
    }
    for (const value of policy.scan.generatedVendor ?? DEFAULT_GENERATED_VENDOR) {
      if (typeof value !== "string" || value.length === 0) throw new Error("invalid generated/vendor path");
      generatedVendor.push(normalizeProjectPath(projectRoot, value));
    }
  } catch (error) {
    findings.push(finding("allowlist.policy-schema", `${policyPath}#/scan`, "Allowlist scan paths must be in-root non-empty project paths.", { error: error instanceof Error ? error.message : String(error) }));
    return undefined;
  }
  if (!Array.isArray(policy.entries)) {
    findings.push(finding("allowlist.policy-schema", `${policyPath}#/entries`, "Allowlist policy must define entries as an array."));
    return undefined;
  }
  const hardBanned = new Set(DEFAULT_HARD_BANNED);
  if ("hardBannedEscapes" in policy) {
    if (!Array.isArray(policy.hardBannedEscapes)
      || policy.hardBannedEscapes.some((value) => typeof value !== "string" || value.trim().length === 0)) {
      findings.push(finding("allowlist.policy-schema", `${policyPath}#/hardBannedEscapes`, "hardBannedEscapes must be an array of non-empty escape-kind strings; default hard bans cannot be weakened."));
      return undefined;
    }
    for (const value of policy.hardBannedEscapes) hardBanned.add(value);
  }
  return { include, exclude, generatedVendor, entries: policy.entries, hardBanned, maxFileBytes: policy.scan.maxFileBytes };
}

function entryTargetKey(entry) {
  return `${entry.path}:${entry.kind}:${entry.locator?.textIncludes ?? ""}`;
}

function entryMatchesEscape(entry, escape) {
  if (entry.kind !== escape.kind) return false;
  if (entry.locator && typeof entry.locator.line === "number" && entry.locator.line !== escape.line) return false;
  const textIncludes = entry.locator?.textIncludes;
  return typeof textIncludes === "string" && textIncludes.length > 0 && escape.text.includes(textIncludes);
}

function validateEntries(projectRoot, entries, policyPath, hardBanned, detectedByPath, findings) {
  const validEntries = [];
  const seen = new Map();
  for (const [index, entry] of entries.entries()) {
    const rowPath = `${policyPath}#/entries/${index}`;
    if (!isPlainObject(entry) || typeof entry.path !== "string" || typeof entry.kind !== "string" || !isPlainObject(entry.locator) || typeof entry.locator.textIncludes !== "string") {
      findings.push(finding("allowlist.malformed-entry", rowPath, "Allowlist entry must define path, kind, and locator.textIncludes."));
      continue;
    }
    let safePath;
    try {
      safePath = normalizeProjectPath(projectRoot, entry.path);
    } catch (error) {
      findings.push(finding("allowlist.malformed-entry", rowPath, "Allowlist entry path must stay inside project root.", { error: error instanceof Error ? error.message : String(error) }));
      continue;
    }
    const normalized = { ...entry, path: safePath };
    const key = entryTargetKey(normalized);
    if (seen.has(key)) {
      findings.push(finding("allowlist.duplicate-entry", rowPath, "Duplicate allowlist row for the same stable target key.", { duplicateOf: seen.get(key), targetKey: key }));
    } else {
      seen.set(key, rowPath);
    }
    if (typeof entry.justification !== "string" || entry.justification.trim().length === 0 || typeof entry.whyUnavoidable !== "string" || entry.whyUnavoidable.trim().length === 0) {
      findings.push(finding("allowlist.missing-rationale", rowPath, "Allowlist entry must include justification and whyUnavoidable."));
    }
    if (typeof entry.reviewer !== "string" || entry.reviewer.trim().length === 0) {
      findings.push(finding("allowlist.missing-reviewer", rowPath, "Allowlist entry must include a reviewer."));
    }
    if (typeof entry.reviewedOn !== "string" || entry.reviewedOn.trim().length === 0) {
      findings.push(finding("allowlist.missing-review-date", rowPath, "Allowlist entry must include reviewedOn freshness marker."));
    }
    if (hardBanned.has(entry.kind)) {
      findings.push(finding("allowlist.hard-banned", rowPath, "Allowlist entry attempts to approve a hard-banned escape kind.", { kind: entry.kind, targetKey: key }));
    }
    const matches = detectedByPath.get(safePath)?.filter((escape) => entryMatchesEscape(normalized, escape)) ?? [];
    if (matches.length === 0) {
      findings.push(finding("allowlist.stale-entry", rowPath, "Allowlist entry does not match a current detected escape.", { path: safePath, kind: entry.kind, locator: entry.locator }));
    }
    validEntries.push({ rowPath, entry: normalized, matches });
  }
  return validEntries;
}

export async function validateEscapeAllowlist(projectRoot, options = {}) {
  const policyPath = options.policyPath ?? DEFAULT_POLICY;
  const findings = [];
  let policy;
  try {
    policy = await readJsonFileBounded(projectRoot, policyPath);
  } catch (error) {
    const files = await walkProjectFiles(projectRoot).catch(() => []);
    const sourceFiles = files.filter(isSourceFile);
    const detected = [];
    for (const filePath of sourceFiles) {
      try {
        const text = await readTextFileBounded(projectRoot, filePath, { maxBytes: options.maxFileBytes });
        detected.push(...collectAstEscapes(text, filePath).map((escape) => ({ ...escape, path: filePath })));
      } catch {
        // The missing/unreadable policy finding below is the fail-closed carrier for this branch.
      }
    }
    findings.push(finding("allowlist.policy-unreadable", policyPath, "Allowlist policy is missing, unreadable, or malformed; fail closed when escapes exist.", {
      error: error instanceof Error ? error.message : String(error),
      detectedEscapeCount: detected.length
    }));
    for (const escape of detected) {
      findings.push(finding("allowlist.unallowlisted-escape", escape.path, "Escape detected while allowlist policy is unavailable.", { kind: escape.kind, ...escape.evidence }));
    }
    return createValidatorResult({ family: FAMILY, projectRoot, findings, evidence: { policyPath, detectedEscapeCount: detected.length, failClosed: true } });
  }

  const config = validatePolicyShape(projectRoot, policy, policyPath, findings);
  if (!config) {
    return createValidatorResult({ family: FAMILY, projectRoot, findings, evidence: { policyPath, detectedEscapeCount: 0 } });
  }

  const allFiles = await walkProjectFiles(projectRoot);
  const files = allFiles.filter(isSourceFile)
    .filter((filePath) => config.include.some((prefix) => includesPath(prefix, filePath)))
    .filter((filePath) => !config.exclude.some((prefix) => includesPath(prefix, filePath)))
    .filter((filePath) => !config.generatedVendor.some((prefix) => includesPath(prefix, filePath)));

  const detectedByPath = new Map();
  for (const filePath of files) {
    const text = await readTextFileBounded(projectRoot, filePath, { maxBytes: options.maxFileBytes ?? config.maxFileBytes });
    const escapes = collectAstEscapes(text, filePath).map((escape) => ({ ...escape, path: filePath }));
    if (escapes.length > 0) detectedByPath.set(filePath, escapes);
  }

  const validEntries = validateEntries(projectRoot, config.entries, policyPath, config.hardBanned, detectedByPath, findings);
  for (const [filePath, escapes] of detectedByPath.entries()) {
    for (const escape of escapes) {
      const matchingEntries = validEntries.filter(({ entry }) => entry.path === filePath && entryMatchesEscape(entry, escape));
      if (config.hardBanned.has(escape.kind)) {
        findings.push(finding("allowlist.hard-banned", filePath, "Hard-banned escape detected in source.", { kind: escape.kind, ...escape.evidence }));
      }
      if (matchingEntries.length === 0) {
        findings.push(finding("allowlist.unallowlisted-escape", filePath, "Detected escape is not covered by a current reviewed allowlist entry.", { kind: escape.kind, ...escape.evidence }));
      }
    }
  }

  return createValidatorResult({
    family: FAMILY,
    projectRoot,
    findings,
    evidence: {
      policyPath,
      scannedFileCount: files.length,
      detectedEscapeCount: [...detectedByPath.values()].reduce((total, escapes) => total + escapes.length, 0),
      allowlistEntryCount: config.entries.length,
      hardBannedEscapes: [...config.hardBanned].sort(),
      parser: "typescript",
      proofMode: "typescript-ast-and-comment-scanner"
    }
  });
}
