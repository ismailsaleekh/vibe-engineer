import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createFinding,
  createValidatorResult,
  normalizeProjectPath,
  P0_FAMILIES,
  pathExists,
  readJsonFileBounded,
} from "../boundaries/contracts.js";

const REQUIRED_TS_FLAGS = Object.freeze([
  "strict",
  "noImplicitAny",
  "strictNullChecks",
  "strictFunctionTypes",
  "strictBindCallApply",
  "strictPropertyInitialization",
  "noImplicitThis",
  "alwaysStrict",
  "exactOptionalPropertyTypes",
  "noUncheckedIndexedAccess",
  "noImplicitOverride",
  "noImplicitReturns",
  "noPropertyAccessFromIndexSignature",
  "useUnknownInCatchVariables",
  "noFallthroughCasesInSwitch",
  "noUnusedLocals",
  "noUnusedParameters",
  "isolatedModules",
  "verbatimModuleSyntax",
  "forceConsistentCasingInFileNames",
  "noEmitOnError",
]);

const REQUIRED_FALSE_FLAGS = Object.freeze(["allowUnreachableCode", "allowUnusedLabels"]);

const REQUIRED_PRETTIER_DEFAULTS = Object.freeze({
  printWidth: 100,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  arrowParens: "always",
  bracketSpacing: true,
  endOfLine: "lf",
});

const REQUIRED_ESLINT_RULES = Object.freeze([
  "@typescript-eslint/no-explicit-any",
  "@typescript-eslint/no-non-null-assertion",
  "@typescript-eslint/no-unnecessary-type-assertion",
  "@typescript-eslint/consistent-type-imports",
  "@typescript-eslint/no-confusing-void-expression",
  "@typescript-eslint/no-unsafe-assignment",
  "@typescript-eslint/no-unsafe-argument",
  "@typescript-eslint/no-unsafe-call",
  "@typescript-eslint/no-unsafe-member-access",
  "@typescript-eslint/no-unsafe-return",
  "@typescript-eslint/restrict-template-expressions",
  "@typescript-eslint/switch-exhaustiveness-check",
  "no-empty",
  "no-fallthrough",
  "no-implicit-coercion",
]);

const ESLINT_CONFIG_CANDIDATES = Object.freeze(["eslint.config.mjs", "eslint.config.js"]);
const PRETTIER_CONFIG_CANDIDATES = Object.freeze([
  "prettier.config.mjs",
  "prettier.config.js",
  ".prettierrc",
  ".prettierrc.json",
]);
const SCRIPT_SEPARATOR_TOKENS = new Set(["&&", "||", ";", "|"]);
const PLACEHOLDER_COMMANDS = new Set(["echo", "true", ":"]);
const TEST_COMMANDS = new Set(["node", "vitest", "jest", "mocha", "uvu", "tsx", "ts-node"]);
const OPTION_VALUE_FLAGS = new Set([
  "--config",
  "--ext",
  "--max-warnings",
  "--ignore-pattern",
  "--cache-location",
  "--output-file",
  "--parser-options",
  "--project",
  "--projectService",
  "-c",
  "-o",
]);

let importCounter = 0;

function finding(ruleId, findingPath, message, evidence = {}) {
  return createFinding({
    family: P0_FAMILIES.configGuards,
    ruleId,
    path: findingPath,
    message,
    evidence,
  });
}

async function safeReadJson(projectRoot, relativePath, findings, ruleId, message) {
  try {
    return await readJsonFileBounded(projectRoot, relativePath);
  } catch (error) {
    findings.push(
      finding(ruleId, relativePath, message, {
        code: error && typeof error === "object" && "code" in error ? error.code : "READ_FAILED",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return undefined;
  }
}

async function requireOne(projectRoot, candidates, ruleId, message) {
  for (const candidate of candidates) {
    if (await pathExists(projectRoot, candidate)) {
      return { ok: true, found: candidate };
    }
  }
  return { ok: false, finding: finding(ruleId, candidates[0] ?? ".", message, { candidates }) };
}

async function loadModuleDefault(projectRoot, relativePath) {
  const safeRelative = normalizeProjectPath(projectRoot, relativePath);
  const absolutePath = path.join(path.resolve(projectRoot), safeRelative);
  const url = pathToFileURL(absolutePath);
  url.search = `p0ConfigGuard=${Date.now()}-${(importCounter += 1)}`;
  const moduleNamespace = await import(url.href);
  return moduleNamespace.default;
}

async function loadConfig(projectRoot, relativePath, kind, findings) {
  try {
    if (relativePath.endsWith(".json") || relativePath === ".prettierrc") {
      return await readJsonFileBounded(projectRoot, relativePath);
    }
    return await loadModuleDefault(projectRoot, relativePath);
  } catch (error) {
    findings.push(
      finding(
        `config-guards.invalid-${kind}-config`,
        relativePath,
        `Required ${kind} config must structurally load without errors.`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      ),
    );
    return undefined;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function severityOf(ruleValue) {
  const severity = Array.isArray(ruleValue) ? ruleValue[0] : ruleValue;
  if (severity === 2 || severity === "error") return "error";
  if (severity === 1 || severity === "warn") return "warn";
  if (severity === 0 || severity === "off") return "off";
  return "unsupported";
}

function optionOf(ruleValue) {
  return Array.isArray(ruleValue) && isPlainObject(ruleValue[1]) ? ruleValue[1] : undefined;
}

function flattenEslintRules(config) {
  const configs = Array.isArray(config) ? config : isPlainObject(config) ? [config] : undefined;
  if (!configs || configs.length === 0) return undefined;
  const rules = new Map();
  for (const [index, entry] of configs.entries()) {
    if (!isPlainObject(entry)) {
      return undefined;
    }
    if (isPlainObject(entry.rules)) {
      for (const [ruleName, ruleValue] of Object.entries(entry.rules)) {
        rules.set(ruleName, { ruleValue, configIndex: index });
      }
    }
  }
  return rules;
}

function hasJsonParseBoundaryRule(ruleValue) {
  if (severityOf(ruleValue) !== "error" || !Array.isArray(ruleValue)) return false;
  return ruleValue
    .slice(1)
    .some(
      (entry) =>
        isPlainObject(entry) &&
        entry.selector ===
          "CallExpression[callee.object.name='JSON'][callee.property.name='parse']" &&
        typeof entry.message === "string" &&
        entry.message.length > 0,
    );
}

function validateBanTsComment(ruleValue) {
  if (severityOf(ruleValue) !== "error") return false;
  const options = optionOf(ruleValue);
  return (
    Boolean(options) &&
    options["ts-ignore"] === true &&
    options["ts-nocheck"] === true &&
    options["ts-expect-error"] === "allow-with-description" &&
    typeof options.minimumDescriptionLength === "number" &&
    options.minimumDescriptionLength >= 20
  );
}

function validateNoEmptyOptions(ruleValue) {
  if (severityOf(ruleValue) !== "error") return false;
  const options = optionOf(ruleValue);
  return !options || options.allowEmptyCatch === false;
}

function validateEslintConfig(config, configPath, findings) {
  const rules = flattenEslintRules(config);
  if (!rules) {
    findings.push(
      finding(
        "config-guards.invalid-eslint-config",
        configPath,
        "ESLint config must be a non-empty flat config object/array of objects.",
      ),
    );
    return;
  }

  for (const requiredRule of REQUIRED_ESLINT_RULES) {
    const found = rules.get(requiredRule);
    if (!found) {
      findings.push(
        finding(
          "config-guards.missing-eslint-rule",
          `${configPath}#/rules/${requiredRule}`,
          `Required ESLint blocking rule is missing: ${requiredRule}.`,
          { ruleName: requiredRule },
        ),
      );
      continue;
    }
    if (severityOf(found.ruleValue) !== "error") {
      findings.push(
        finding(
          "config-guards.eslint-rule-weakened",
          `${configPath}#/rules/${requiredRule}`,
          `Required ESLint rule must have blocking severity: ${requiredRule}.`,
          {
            ruleName: requiredRule,
            actual: Array.isArray(found.ruleValue) ? found.ruleValue[0] : found.ruleValue,
          },
        ),
      );
      continue;
    }
    if (requiredRule === "no-empty" && !validateNoEmptyOptions(found.ruleValue)) {
      findings.push(
        finding(
          "config-guards.invalid-eslint-rule-options",
          `${configPath}#/rules/no-empty`,
          "no-empty must reject empty catch blocks.",
          { ruleName: requiredRule },
        ),
      );
    }
  }

  const banTsComment = rules.get("@typescript-eslint/ban-ts-comment");
  if (!banTsComment) {
    findings.push(
      finding(
        "config-guards.missing-eslint-rule",
        `${configPath}#/rules/@typescript-eslint/ban-ts-comment`,
        "Required ESLint blocking rule is missing: @typescript-eslint/ban-ts-comment.",
        { ruleName: "@typescript-eslint/ban-ts-comment" },
      ),
    );
  } else if (!validateBanTsComment(banTsComment.ruleValue)) {
    findings.push(
      finding(
        "config-guards.invalid-eslint-rule-options",
        `${configPath}#/rules/@typescript-eslint/ban-ts-comment`,
        "ban-ts-comment must block ts-ignore/ts-nocheck and require descriptions for ts-expect-error.",
        {
          ruleName: "@typescript-eslint/ban-ts-comment",
        },
      ),
    );
  }

  const noRestrictedSyntax = rules.get("no-restricted-syntax");
  if (!noRestrictedSyntax || !hasJsonParseBoundaryRule(noRestrictedSyntax.ruleValue)) {
    findings.push(
      finding(
        "config-guards.missing-eslint-json-parse-boundary",
        `${configPath}#/rules/no-restricted-syntax`,
        "ESLint must block raw JSON.parse outside named runtime boundary validators.",
        {
          ruleName: "no-restricted-syntax",
        },
      ),
    );
  }
}

function validatePrettierConfig(config, configPath, findings) {
  if (!isPlainObject(config)) {
    findings.push(
      finding(
        "config-guards.invalid-prettier-config",
        configPath,
        "Prettier config must structurally load to an object.",
      ),
    );
    return;
  }
  for (const [key, expected] of Object.entries(REQUIRED_PRETTIER_DEFAULTS)) {
    if (config[key] !== expected) {
      findings.push(
        finding(
          "config-guards.prettier-default-weakened",
          `${configPath}#/${key}`,
          `Required Prettier default is missing or weakened: ${key}.`,
          {
            option: key,
            expected,
            actual: config[key] ?? null,
          },
        ),
      );
    }
  }
}

function tokenizeShellCommand(command) {
  const tokens = [];
  let current = "";
  let quote = null;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    const next = command[index + 1];
    if (quote) {
      if (character === quote) {
        quote = null;
        continue;
      }
      if (character === "\\" && quote === '"' && next) {
        current += next;
        index += 1;
        continue;
      }
      current += character;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (/\s/u.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    if ((character === "&" && next === "&") || (character === "|" && next === "|")) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      tokens.push(`${character}${next}`);
      index += 1;
      continue;
    }
    if (character === ";" || character === "|") {
      if (current) {
        tokens.push(current);
        current = "";
      }
      tokens.push(character);
      continue;
    }
    if (character === "\\" && next) {
      current += next;
      index += 1;
      continue;
    }
    current += character;
  }
  if (quote) {
    return { ok: false, error: `Unclosed ${quote} quote` };
  }
  if (current) tokens.push(current);
  return { ok: true, tokens };
}

function splitCommands(tokens) {
  const commands = [];
  let current = [];
  for (const token of tokens) {
    if (SCRIPT_SEPARATOR_TOKENS.has(token)) {
      if (current.length > 0) commands.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }
  if (current.length > 0) commands.push(current);
  return commands;
}

function commandName(commandTokens) {
  const token = commandTokens.find((candidate) => !candidate.includes("="));
  if (!token) return "";
  const base = path.posix.basename(token).replace(/\.cmd$/u, "");
  return base === "pnpm" || base === "yarn" || base === "npm" || base === "bun" || base === "npx"
    ? path.posix.basename(commandTokens[commandTokens.indexOf(token) + 1] ?? "")
    : base;
}

function commandInvokes(commands, toolNames) {
  return commands.some((commandTokens) => toolNames.has(commandName(commandTokens)));
}

function commandHasToken(commands, expectedToken) {
  return commands.some((commandTokens) => commandTokens.includes(expectedToken));
}

function isPlaceholderScript(commands) {
  if (commands.length === 0) return true;
  return commands.every((commandTokens) => {
    const name = commandName(commandTokens);
    return PLACEHOLDER_COMMANDS.has(name) || (name === "exit" && commandTokens[1] === "0");
  });
}

function targetArgumentsFor(commandTokens, toolName) {
  const toolIndex = commandTokens.findIndex(
    (token) => path.posix.basename(token).replace(/\.cmd$/u, "") === toolName,
  );
  if (toolIndex < 0) return [];
  const targets = [];
  let skipNext = false;
  for (const token of commandTokens.slice(toolIndex + 1)) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (OPTION_VALUE_FLAGS.has(token)) {
      skipNext = true;
      continue;
    }
    if (token.startsWith("-")) continue;
    targets.push(token);
  }
  return targets;
}

function normalizeScriptTarget(target) {
  if (target === "." || target === "./") return ".";
  return target.replace(/^\.\//u, "").replace(/\/$/u, "");
}

function targetCoversPath(target, requiredPath) {
  const normalizedTarget = normalizeScriptTarget(target);
  const normalizedRequired = normalizeScriptTarget(requiredPath);
  if (normalizedTarget === "." || normalizedTarget === "**/*" || normalizedTarget === "**")
    return true;
  return (
    normalizedTarget === normalizedRequired ||
    normalizedRequired.startsWith(`${normalizedTarget}/`) ||
    normalizedTarget.startsWith(`${normalizedRequired}/`)
  );
}

function commandTargets(commands, toolName) {
  return commands.flatMap((commandTokens) => targetArgumentsFor(commandTokens, toolName));
}

// Recognizes standard monorepo orchestration of a named script leg: `turbo run <leg>`
// (incl. `pnpm exec turbo run <leg>` / `pnpm turbo run <leg>`) and `pnpm -r run <leg>` /
// `pnpm --recursive run <leg>`. These fan out to each workspace package's own `<leg>`
// script, which is the real tool invocation (e.g. per-package `tsc --noEmit` / test runner).
// Scoped to the exact leg name so an arbitrary orchestrator command cannot satisfy the
// typecheck/test contract — only orchestration of the matching leg qualifies.
function commandOrchestratesLeg(commands, leg) {
  return commands.some((commandTokens) => {
    const legPresent = commandTokens.includes(leg);
    if (!legPresent) return false;
    const hasRun = commandTokens.includes("run");
    const hasTurbo = commandTokens.includes("turbo");
    const hasRecursive = commandTokens.includes("-r") || commandTokens.includes("--recursive");
    return (hasTurbo && hasRun) || (hasRecursive && hasRun);
  });
}

function requiredScriptCoverage(mechanicalSurface) {
  const sourcePrefixes = [];
  const exactConfigFiles = [];
  if (isPlainObject(mechanicalSurface) && Array.isArray(mechanicalSurface.surfaces)) {
    for (const surface of mechanicalSurface.surfaces) {
      if (!isPlainObject(surface) || typeof surface.path !== "string") continue;
      if (surface.kind === "prefix") sourcePrefixes.push(surface.path);
      if (
        surface.kind === "exact" &&
        [
          "eslint.config.mjs",
          "eslint.config.js",
          "prettier.config.mjs",
          "prettier.config.js",
          "tsconfig.json",
          "package.json",
        ].includes(surface.path)
      ) {
        exactConfigFiles.push(surface.path);
      }
    }
  }
  return {
    lint: [...new Set([...sourcePrefixes, "eslint.config.mjs"])],
    prettier: [...new Set([...sourcePrefixes, ...exactConfigFiles])],
  };
}

function assertCoverage(scriptName, scriptPath, targets, requiredPaths, findings) {
  for (const requiredPath of requiredPaths) {
    if (!targets.some((target) => targetCoversPath(target, requiredPath))) {
      findings.push(
        finding(
          "config-guards.partial-script-surface",
          scriptPath,
          `Required script omits governed surface: ${scriptName}.`,
          {
            scriptName,
            requiredPath,
            targets,
          },
        ),
      );
    }
  }
}

function validateScriptSurface(packageJsonPath, scripts, mechanicalSurface, findings) {
  const coverage = requiredScriptCoverage(mechanicalSurface);
  const scriptNames = ["typecheck", "test", "lint"];
  const formatScriptName = typeof scripts["format:check"] === "string" ? "format:check" : "format";
  if (typeof scripts["format:check"] !== "string" && typeof scripts.format !== "string") {
    scriptNames.push("format:check");
  } else {
    scriptNames.push(formatScriptName);
  }

  const parsedScripts = new Map();
  for (const scriptName of scriptNames) {
    const scriptPath = `${packageJsonPath}#/scripts/${scriptName}`;
    const command = scripts[scriptName];
    if (typeof command !== "string" || command.trim().length === 0) {
      findings.push(
        finding(
          "config-guards.missing-required-script",
          scriptPath,
          `Required package script is missing: ${scriptName}.`,
          { scriptName },
        ),
      );
      continue;
    }
    const tokenized = tokenizeShellCommand(command);
    if (!tokenized.ok) {
      findings.push(
        finding(
          "config-guards.invalid-required-script",
          scriptPath,
          `Required package script cannot be parsed: ${scriptName}.`,
          { scriptName, error: tokenized.error },
        ),
      );
      continue;
    }
    const commands = splitCommands(tokenized.tokens);
    parsedScripts.set(scriptName, { command, commands, tokens: tokenized.tokens, scriptPath });
    if (isPlaceholderScript(commands)) {
      findings.push(
        finding(
          "config-guards.invalid-required-script",
          scriptPath,
          `Required package script is a placeholder/no-op: ${scriptName}.`,
          { scriptName, command },
        ),
      );
    }
  }

  const typecheck = parsedScripts.get("typecheck");
  if (typecheck) {
    const directTypecheck =
      commandInvokes(typecheck.commands, new Set(["tsc", "vue-tsc"])) &&
      commandHasToken(typecheck.commands, "--noEmit");
    const orchestratedTypecheck = commandOrchestratesLeg(typecheck.commands, "typecheck");
    if (!directTypecheck && !orchestratedTypecheck) {
      findings.push(
        finding(
          "config-guards.invalid-required-script",
          typecheck.scriptPath,
          "typecheck must invoke a real TypeScript no-emit check.",
          { scriptName: "typecheck", command: typecheck.command },
        ),
      );
    }
  }

  const lint = parsedScripts.get("lint");
  if (lint) {
    if (!commandInvokes(lint.commands, new Set(["eslint"]))) {
      findings.push(
        finding(
          "config-guards.invalid-required-script",
          lint.scriptPath,
          "lint must invoke ESLint.",
          { scriptName: "lint", command: lint.command },
        ),
      );
    }
    assertCoverage(
      "lint",
      lint.scriptPath,
      commandTargets(lint.commands, "eslint"),
      coverage.lint,
      findings,
    );
  }

  const format = parsedScripts.get(formatScriptName);
  if (format) {
    if (
      !commandInvokes(format.commands, new Set(["prettier"])) ||
      (!commandHasToken(format.commands, "--check") && !commandHasToken(format.commands, "-c"))
    ) {
      findings.push(
        finding(
          "config-guards.invalid-required-script",
          format.scriptPath,
          "format/format:check must invoke Prettier in check mode.",
          { scriptName: formatScriptName, command: format.command },
        ),
      );
    }
    assertCoverage(
      formatScriptName,
      format.scriptPath,
      commandTargets(format.commands, "prettier"),
      coverage.prettier,
      findings,
    );
  }

  const test = parsedScripts.get("test");
  if (test) {
    const directTest = commandInvokes(test.commands, TEST_COMMANDS);
    const orchestratedTest = commandOrchestratesLeg(test.commands, "test");
    if (!directTest && !orchestratedTest) {
      findings.push(
        finding(
          "config-guards.invalid-required-script",
          test.scriptPath,
          "test must invoke a real test or witness runner.",
          { scriptName: "test", command: test.command },
        ),
      );
    }
  }
}

export async function validateStrictConfig(projectRoot, options = {}) {
  const tsconfigPath = options.tsconfigPath ?? "tsconfig.json";
  const packageJsonPath = options.packageJsonPath ?? "package.json";
  const findings = [];

  const tsconfig = await safeReadJson(
    projectRoot,
    tsconfigPath,
    findings,
    "config-guards.invalid-tsconfig",
    "tsconfig.json must be readable JSON.",
  );
  const compilerOptions =
    tsconfig && isPlainObject(tsconfig) && isPlainObject(tsconfig.compilerOptions)
      ? tsconfig.compilerOptions
      : undefined;

  if (!compilerOptions) {
    findings.push(
      finding(
        "config-guards.missing-ts-compiler-options",
        tsconfigPath,
        "tsconfig.json must contain compilerOptions.",
      ),
    );
  } else {
    for (const flag of REQUIRED_TS_FLAGS) {
      if (compilerOptions[flag] !== true) {
        findings.push(
          finding(
            "config-guards.strict-ts-flag-weakened",
            `${tsconfigPath}#/compilerOptions/${flag}`,
            `Required TypeScript strict flag must be true: ${flag}.`,
            {
              flag,
              expected: true,
              actual: compilerOptions[flag] ?? null,
            },
          ),
        );
      }
    }
    for (const flag of REQUIRED_FALSE_FLAGS) {
      if (compilerOptions[flag] !== false) {
        findings.push(
          finding(
            "config-guards.strict-ts-flag-weakened",
            `${tsconfigPath}#/compilerOptions/${flag}`,
            `Required TypeScript safety flag must be false: ${flag}.`,
            {
              flag,
              expected: false,
              actual: compilerOptions[flag] ?? null,
            },
          ),
        );
      }
    }
  }

  const packageJson = await safeReadJson(
    projectRoot,
    packageJsonPath,
    findings,
    "config-guards.invalid-package-json",
    "package.json must be readable JSON.",
  );
  const scripts =
    packageJson && isPlainObject(packageJson) && isPlainObject(packageJson.scripts)
      ? packageJson.scripts
      : {};

  const mechanicalSurfacePath = options.mechanicalSurfacePath ?? "mechanical-surface.json";
  const mechanicalSurface = (await pathExists(projectRoot, mechanicalSurfacePath))
    ? await safeReadJson(
        projectRoot,
        mechanicalSurfacePath,
        findings,
        "config-guards.invalid-mechanical-surface",
        "mechanical-surface.json must be readable JSON when present.",
      )
    : undefined;
  validateScriptSurface(packageJsonPath, scripts, mechanicalSurface, findings);

  const eslintPresence = await requireOne(
    projectRoot,
    ESLINT_CONFIG_CANDIDATES,
    "config-guards.missing-eslint-config",
    "Required ESLint config surface is missing.",
  );
  if (!eslintPresence.ok) {
    findings.push(eslintPresence.finding);
  } else {
    const eslintConfig = await loadConfig(projectRoot, eslintPresence.found, "eslint", findings);
    if (eslintConfig !== undefined)
      validateEslintConfig(eslintConfig, eslintPresence.found, findings);
  }

  const prettierPresence = await requireOne(
    projectRoot,
    PRETTIER_CONFIG_CANDIDATES,
    "config-guards.missing-prettier-config",
    "Required Prettier config surface is missing.",
  );
  if (!prettierPresence.ok) {
    findings.push(prettierPresence.finding);
  } else {
    const prettierConfig = await loadConfig(
      projectRoot,
      prettierPresence.found,
      "prettier",
      findings,
    );
    if (prettierConfig !== undefined)
      validatePrettierConfig(prettierConfig, prettierPresence.found, findings);
  }

  const packageType = packageJson && isPlainObject(packageJson) ? packageJson.type : undefined;
  if (packageType !== "module") {
    findings.push(
      finding(
        "config-guards.package-module-type",
        `${packageJsonPath}#/type`,
        "Package must declare ESM module type.",
        { expected: "module", actual: packageType ?? null },
      ),
    );
  }

  return createValidatorResult({
    family: P0_FAMILIES.configGuards,
    projectRoot,
    findings,
    evidence: {
      tsconfigPath,
      packageJsonPath,
      mechanicalSurfacePath: mechanicalSurface ? mechanicalSurfacePath : null,
      requiredTrueFlags: REQUIRED_TS_FLAGS,
      requiredFalseFlags: REQUIRED_FALSE_FLAGS,
      requiredPrettierDefaults: REQUIRED_PRETTIER_DEFAULTS,
      requiredEslintRules: REQUIRED_ESLINT_RULES,
      eslintConfig: eslintPresence.ok ? eslintPresence.found : null,
      prettierConfig: prettierPresence.ok ? prettierPresence.found : null,
    },
  });
}
