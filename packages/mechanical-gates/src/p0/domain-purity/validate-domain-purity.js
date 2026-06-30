import path from "node:path";
import ts from "typescript";
import {
  createFinding,
  createValidatorResult,
  normalizeProjectPath,
  readJsonFileBounded,
  readTextFileBounded,
  walkProjectFiles,
} from "../boundaries/contracts.js";

const FAMILY = "p0.domain-purity";
const DEFAULT_POLICY = "mechanical-domain-purity.json";
const SOURCE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json", ".md"]);
const DEFAULT_FORBIDDEN = ["ecommerce", "inventory", "Billz", "Telegram"];
const BLOCKING_SURFACES = new Set(["core", "extension"]);
const ALLOWED_SAMPLE_SURFACES = new Set(["sample-demo", "fixture"]);
const IGNORED_SURFACES = new Set(["generated", "vendor", "excluded"]);

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

function pathMatches(row, filePath) {
  if (row.match === "exact") return row.path === filePath;
  return includesPath(row.path, filePath);
}

function exemptionTargetKey(entry) {
  return `${entry.path}:${entry.term}:${entry.locator?.token ?? ""}:${entry.locator?.line ?? ""}`;
}

function entryMatchesFinding(entry, filePath, term, token, line) {
  if (entry.path !== filePath || entry.term !== term || entry.locator.token !== token) return false;
  return typeof entry.locator.line !== "number" || entry.locator.line === line;
}

function validateExemptions(projectRoot, exemptions, policyPath, findings) {
  const valid = [];
  const seen = new Map();
  if (!Array.isArray(exemptions)) return valid;
  for (const [index, entry] of exemptions.entries()) {
    const rowPath = `${policyPath}#/exemptions/${index}`;
    if (
      !isPlainObject(entry) ||
      typeof entry.path !== "string" ||
      entry.path.trim().length === 0 ||
      typeof entry.term !== "string" ||
      entry.term.trim().length === 0 ||
      !isPlainObject(entry.locator) ||
      typeof entry.locator.token !== "string" ||
      entry.locator.token.length === 0
    ) {
      findings.push(
        finding(
          "domain-purity.exemption-schema",
          rowPath,
          "Exemption entry must define non-empty path, term, and locator.token.",
        ),
      );
      continue;
    }
    let safePath;
    try {
      safePath = normalizeProjectPath(projectRoot, entry.path);
    } catch (error) {
      findings.push(
        finding(
          "domain-purity.exemption-schema",
          rowPath,
          "Exemption path must stay inside project root.",
          { error: error instanceof Error ? error.message : String(error) },
        ),
      );
      continue;
    }
    const normalized = { ...entry, path: safePath };
    const key = exemptionTargetKey(normalized);
    if (seen.has(key)) {
      findings.push(
        finding(
          "domain-purity.duplicate-exemption",
          rowPath,
          "Duplicate exemption row for the same stable target key.",
          { duplicateOf: seen.get(key), targetKey: key },
        ),
      );
    } else {
      seen.set(key, rowPath);
    }
    if (
      typeof entry.justification !== "string" ||
      entry.justification.trim().length === 0 ||
      typeof entry.whyUnavoidable !== "string" ||
      entry.whyUnavoidable.trim().length === 0
    ) {
      findings.push(
        finding(
          "domain-purity.exemption-missing-rationale",
          rowPath,
          "Exemption entry must include justification and whyUnavoidable.",
        ),
      );
    }
    if (typeof entry.reviewer !== "string" || entry.reviewer.trim().length === 0) {
      findings.push(
        finding(
          "domain-purity.exemption-missing-reviewer",
          rowPath,
          "Exemption entry must include a reviewer.",
        ),
      );
    }
    if (typeof entry.reviewedOn !== "string" || entry.reviewedOn.trim().length === 0) {
      findings.push(
        finding(
          "domain-purity.exemption-missing-review-date",
          rowPath,
          "Exemption entry must include reviewedOn freshness marker.",
        ),
      );
    }
    valid.push({ rowPath, entry: normalized, key });
  }
  return valid;
}

function lineAndColumn(sourceFile, position) {
  const loc = sourceFile.getLineAndCharacterOfPosition(position);
  return { line: loc.line + 1, column: loc.character + 1 };
}

function splitStructuredTokens(text) {
  const tokens = [];
  let current = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const isTokenChar =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      char === "_" ||
      char === "-";
    if (isTokenChar) {
      current += char;
      continue;
    }
    if (current.length > 0) tokens.push(current);
    current = "";
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

function tokenCarriesTerm(token, term) {
  return token.toLowerCase().includes(term.toLowerCase());
}

function collectCommentRanges(sourceText, sourceFile) {
  const comments = [];
  const collect = (position) => {
    const ranges = [
      ...(ts.getLeadingCommentRanges(sourceText, position) ?? []),
      ...(ts.getTrailingCommentRanges(sourceText, position) ?? []),
    ];
    for (const range of ranges) {
      comments.push({ text: sourceText.slice(range.pos, range.end), position: range.pos });
    }
  };
  collect(0);
  function visit(node) {
    collect(node.pos);
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  const seen = new Set();
  return comments.filter((comment) => {
    const key = `${comment.position}:${comment.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectCarriers(sourceText, relativePath) {
  const ext = path.posix.extname(relativePath);
  if (![".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"].includes(ext)) {
    return splitStructuredTokens(sourceText).map((token, index) => ({
      kind: "text-token",
      token,
      line: 1,
      column: index + 1,
      excerpt: token,
    }));
  }
  const scriptKind =
    relativePath.endsWith(".tsx") || relativePath.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const carriers = [];

  function addText(kind, text, position) {
    const location = lineAndColumn(sourceFile, position);
    for (const token of splitStructuredTokens(text)) {
      carriers.push({
        kind,
        token,
        line: location.line,
        column: location.column,
        excerpt: text.slice(0, 120),
      });
    }
  }

  for (const segment of relativePath.split("/")) addText("path-segment", segment, 0);
  for (const comment of collectCommentRanges(sourceText, sourceFile))
    addText("comment", comment.text, comment.position);

  function visit(node) {
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node))
      addText("identifier", node.text, node.getStart(sourceFile));
    if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node))
      addText("string-literal", node.text, node.getStart(sourceFile));
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return carriers;
}

function validatePolicyShape(projectRoot, policy, policyPath, findings) {
  if (!isPlainObject(policy) || policy.version !== 1) {
    findings.push(
      finding(
        "domain-purity.policy-schema",
        policyPath,
        "Domain-purity policy must be an object with version: 1.",
      ),
    );
    return undefined;
  }
  if (policy.proofMode !== "typescript-ast-string-comment-path-carriers") {
    findings.push(
      finding(
        "domain-purity.regex-only-proof-rejected",
        `${policyPath}#/proofMode`,
        "Domain-purity proof must use structured AST/string/comment/path carriers, not regex or narrative proof.",
        { expected: "typescript-ast-string-comment-path-carriers", actual: policy.proofMode },
      ),
    );
    return undefined;
  }
  if (
    !isPlainObject(policy.scan) ||
    !Array.isArray(policy.scan.include) ||
    policy.scan.include.length === 0
  ) {
    findings.push(
      finding(
        "domain-purity.policy-schema",
        `${policyPath}#/scan`,
        "Domain-purity policy must define scan.include as a non-empty array.",
      ),
    );
    return undefined;
  }
  if (!Array.isArray(policy.surfaces) || policy.surfaces.length === 0) {
    findings.push(
      finding(
        "domain-purity.policy-schema",
        `${policyPath}#/surfaces`,
        "Domain-purity policy must define at least one typed surface row.",
      ),
    );
    return undefined;
  }
  const include = [];
  const surfaces = [];
  let surfaceSchemaValid = true;
  try {
    for (const value of policy.scan.include) {
      if (typeof value !== "string" || value.trim().length === 0)
        throw new Error("invalid include path");
      include.push(normalizeProjectPath(projectRoot, value));
    }
    for (const [index, row] of policy.surfaces.entries()) {
      if (
        !isPlainObject(row) ||
        typeof row.path !== "string" ||
        row.path.trim().length === 0 ||
        !["exact", "prefix"].includes(row.match) ||
        ![
          "core",
          "extension",
          "sample-demo",
          "fixture",
          "generated",
          "vendor",
          "excluded",
        ].includes(row.kind)
      ) {
        findings.push(
          finding(
            "domain-purity.policy-schema",
            `${policyPath}#/surfaces/${index}`,
            "Surface row must define kind, non-empty path, and exact/prefix match.",
          ),
        );
        surfaceSchemaValid = false;
        continue;
      }
      surfaces.push({
        kind: row.kind,
        match: row.match,
        path: normalizeProjectPath(projectRoot, row.path),
      });
    }
  } catch (error) {
    findings.push(
      finding(
        "domain-purity.policy-schema",
        policyPath,
        "Policy paths must be in-root non-empty project paths.",
        { error: error instanceof Error ? error.message : String(error) },
      ),
    );
    return undefined;
  }
  if (!surfaceSchemaValid || surfaces.length === 0) return undefined;
  const forbiddenTerms = new Set(DEFAULT_FORBIDDEN);
  if ("forbiddenTerms" in policy) {
    if (
      !Array.isArray(policy.forbiddenTerms) ||
      policy.forbiddenTerms.length === 0 ||
      policy.forbiddenTerms.some((value) => typeof value !== "string" || value.trim().length === 0)
    ) {
      findings.push(
        finding(
          "domain-purity.policy-schema",
          `${policyPath}#/forbiddenTerms`,
          "forbiddenTerms must be a non-empty array of non-empty strings; locked defaults remain enforced when policy data is malformed.",
        ),
      );
    } else {
      for (const value of policy.forbiddenTerms) forbiddenTerms.add(value);
    }
  }
  let exemptions = [];
  if ("exemptions" in policy) {
    exemptions = validateExemptions(projectRoot, policy.exemptions, policyPath, findings);
  }
  return {
    include,
    surfaces,
    forbiddenTerms: [...forbiddenTerms],
    exemptions,
    maxFileBytes: policy.scan.maxFileBytes,
  };
}

function classifyFile(surfaces, filePath) {
  const matches = surfaces
    .filter((row) => pathMatches(row, filePath))
    .sort((left, right) => right.path.length - left.path.length);
  return matches[0]?.kind ?? "core";
}

async function detectWithoutPolicy(projectRoot, policyPath, options, findings) {
  const files = (await walkProjectFiles(projectRoot).catch(() => [])).filter(isSourceFile);
  const sourceFiles = files.filter(
    (filePath) =>
      !filePath.includes("/generated/") &&
      !filePath.includes("/vendor/") &&
      !filePath.includes("/node_modules/"),
  );
  findings.push(
    finding(
      "domain-purity.policy-unreadable",
      policyPath,
      "Domain-purity policy is missing/unreadable; fail closed for governed core surfaces.",
      { candidateCoreFileCount: sourceFiles.length },
    ),
  );
  for (const filePath of sourceFiles) {
    const text = await readTextFileBounded(projectRoot, filePath, {
      maxBytes: options.maxFileBytes,
    }).catch(() => "");
    for (const carrier of collectCarriers(text, filePath)) {
      for (const term of DEFAULT_FORBIDDEN) {
        if (tokenCarriesTerm(carrier.token, term)) {
          findings.push(
            finding(
              "domain-purity.policy-missing-core-term",
              filePath,
              "Forbidden domain token found while policy is unavailable.",
              {
                term,
                carrierKind: carrier.kind,
                line: carrier.line,
                column: carrier.column,
                token: carrier.token,
              },
            ),
          );
        }
      }
    }
  }
}

export async function validateDomainPurity(projectRoot, options = {}) {
  const policyPath = options.policyPath ?? DEFAULT_POLICY;
  const findings = [];
  let policy;
  try {
    policy = await readJsonFileBounded(projectRoot, policyPath);
  } catch (error) {
    await detectWithoutPolicy(projectRoot, policyPath, options, findings);
    findings[0].evidence.error = error instanceof Error ? error.message : String(error);
    return createValidatorResult({
      family: FAMILY,
      projectRoot,
      findings,
      evidence: { policyPath, failClosed: true },
    });
  }

  const config = validatePolicyShape(projectRoot, policy, policyPath, findings);
  if (!config) {
    return createValidatorResult({
      family: FAMILY,
      projectRoot,
      findings,
      evidence: { policyPath },
    });
  }

  const files = (await walkProjectFiles(projectRoot))
    .filter(isSourceFile)
    .filter((filePath) => config.include.some((prefix) => includesPath(prefix, filePath)));
  let scannedFileCount = 0;
  const matchedExemptionKeys = new Set();
  for (const filePath of files) {
    const surfaceKind = classifyFile(config.surfaces, filePath);
    if (IGNORED_SURFACES.has(surfaceKind)) continue;
    scannedFileCount += 1;
    const text = await readTextFileBounded(projectRoot, filePath, {
      maxBytes: options.maxFileBytes ?? config.maxFileBytes,
    });
    const carriers = collectCarriers(text, filePath);
    for (const carrier of carriers) {
      for (const term of config.forbiddenTerms) {
        if (!tokenCarriesTerm(carrier.token, term)) continue;
        const matchingExemption = config.exemptions.find(({ entry }) =>
          entryMatchesFinding(entry, filePath, term, carrier.token, carrier.line),
        );
        if (matchingExemption) {
          matchedExemptionKeys.add(matchingExemption.key);
          continue;
        }
        if (BLOCKING_SURFACES.has(surfaceKind)) {
          findings.push(
            finding(
              "domain-purity.core-domain-leak",
              filePath,
              "Forbidden project/business-domain token leaked into core or extension surface.",
              {
                term,
                surfaceKind,
                carrierKind: carrier.kind,
                line: carrier.line,
                column: carrier.column,
                token: carrier.token,
                excerpt: carrier.excerpt,
              },
            ),
          );
        } else if (!ALLOWED_SAMPLE_SURFACES.has(surfaceKind)) {
          findings.push(
            finding(
              "domain-purity.unclassified-domain-term",
              filePath,
              "Forbidden domain token appears in an unclassified surface.",
              { term, surfaceKind, carrierKind: carrier.kind, token: carrier.token },
            ),
          );
        }
      }
    }
  }
  for (const { rowPath, entry, key } of config.exemptions) {
    if (!matchedExemptionKeys.has(key)) {
      findings.push(
        finding(
          "domain-purity.stale-exemption",
          rowPath,
          "Exemption entry does not match a current domain-token finding.",
          {
            path: entry.path,
            term: entry.term,
            token: entry.locator.token,
            line: entry.locator.line,
          },
        ),
      );
    }
  }

  return createValidatorResult({
    family: FAMILY,
    projectRoot,
    findings,
    evidence: {
      policyPath,
      scannedFileCount,
      surfaceCount: config.surfaces.length,
      forbiddenTerms: config.forbiddenTerms,
      exemptionCount: config.exemptions.length,
      parser: "typescript",
      proofMode: "typescript-ast-string-comment-path-carriers",
    },
  });
}
