import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

export const VIBE_CONFIG_FILE_NAME = "vibe-engineer.config.json";
export const VIBE_CONFIG_SCHEMA_ID = "vibe-engineer.config.v1";
export const VIBE_CONFIG_SCHEMA_VERSION = "1.0.0";

const DEFAULTS = Object.freeze({
  maxParallelAgents: 8,
  maxValidationFixIterations: 3,
  agenticWorkPackageTargetHours: 6,
  verification: Object.freeze({
    deterministicBlocks: true,
    advisoryReviewBlocks: false,
    webE2E: "playwright",
    mobileE2E: Object.freeze({
      default: "maestro",
      advanced: "detox",
    }),
  }),
  uiVerification: Object.freeze({
    enabled: true,
  }),
  agentRegistry: Object.freeze({
    validationRequired: true,
  }),
});

export const VIBE_CONFIG_SCHEMA = Object.freeze({
  id: VIBE_CONFIG_SCHEMA_ID,
  version: VIBE_CONFIG_SCHEMA_VERSION,
  configFileName: VIBE_CONFIG_FILE_NAME,
  requiredTopLevelKeys: Object.freeze(["agenticHarness"]),
  topLevelKeys: Object.freeze([
    "agenticHarness",
    "maxParallelAgents",
    "maxValidationFixIterations",
    "agenticWorkPackageTargetHours",
    "verification",
    "uiVerification",
    "agentRegistry",
  ]),
  supportedAgenticHarnesses: Object.freeze(["pi"]),
  deferredAgenticHarnesses: Object.freeze(["claude-code", "codex", "opencode"]),
  defaults: DEFAULTS,
  ranges: Object.freeze({
    maxParallelAgents: Object.freeze({ integer: true, min: 1, max: 8 }),
    maxValidationFixIterations: Object.freeze({ integer: true, min: 1, max: 3 }),
    agenticWorkPackageTargetHours: Object.freeze({ integer: false, exclusiveMin: 0, max: 6 }),
  }),
});

const TOP_LEVEL_KEYS = new Set(VIBE_CONFIG_SCHEMA.topLevelKeys);
const VERIFICATION_KEYS = new Set([
  "deterministicBlocks",
  "advisoryReviewBlocks",
  "webE2E",
  "mobileE2E",
]);
const MOBILE_E2E_KEYS = new Set(["default", "advanced"]);
const UI_VERIFICATION_KEYS = new Set(["enabled"]);
const AGENT_REGISTRY_KEYS = new Set(["validationRequired"]);
const SECRET_LIKE_KEYS = new Set([
  "secret",
  "secrets",
  "password",
  "passphrase",
  "token",
  "apiKey",
  "api_key",
  "credential",
  "credentials",
  "privateKey",
  "private_key",
  "clientSecret",
  "client_secret",
]);
const UNSUPPORTED_CONFIG_FILES = Object.freeze([
  "vibe-engineer.config.js",
  "vibe-engineer.config.cjs",
  "vibe-engineer.config.mjs",
  "vibe-engineer.config.ts",
  "vibe-engineer.config.yaml",
  "vibe-engineer.config.yml",
  "vibe-engineer.config.toml",
]);

function clone(value) {
  return structuredClone(value);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function issue(code, classification, path, message, extra = {}) {
  return {
    code,
    classification,
    path,
    message,
    blocking: true,
    redacted: true,
    ...extra,
  };
}

function diagnosticFromIssue(item) {
  return {
    severity: "error",
    code: item.code,
    classification: item.classification,
    path: item.path,
    message: item.message,
    redacted: true,
  };
}

function failure(classification, issues, context = {}) {
  return {
    ok: false,
    status: classification === "missing_config" ? "blocked" : "failure",
    schemaId: VIBE_CONFIG_SCHEMA_ID,
    schemaVersion: VIBE_CONFIG_SCHEMA_VERSION,
    classification,
    issues,
    diagnostics: issues.map(diagnosticFromIssue),
    ...context,
  };
}

function success(config, provenance, context = {}) {
  return {
    ok: true,
    status: "success",
    schemaId: VIBE_CONFIG_SCHEMA_ID,
    schemaVersion: VIBE_CONFIG_SCHEMA_VERSION,
    config,
    provenance,
    diagnostics: [],
    ...context,
  };
}

function recordDefault(provenance, path) {
  provenance[path] = { source: "default" };
}

function recordFile(provenance, path) {
  provenance[path] = { source: "file" };
}

function validateAllowedKeys(input, allowed, basePath, issues) {
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      const exactSecretLikeKey = SECRET_LIKE_KEYS.has(key);
      issues.push(
        issue(
          exactSecretLikeKey ? "SECRET_LIKE_FIELD_REJECTED" : "UNKNOWN_FIELD",
          "invalid_config",
          `${basePath}/${key}`,
          exactSecretLikeKey
            ? "Secret-like config fields are not part of the v1 schema and are rejected."
            : "Unknown config field is not allowed.",
        ),
      );
    }
  }
}

function expectBoolean(input, key, path, defaultValue, output, provenance, issues) {
  if (Object.hasOwn(input, key)) {
    if (typeof input[key] !== "boolean") {
      issues.push(issue("INVALID_TYPE", "invalid_config", path, "Expected a boolean value."));
      output[key] = defaultValue;
      return;
    }
    output[key] = input[key];
    recordFile(provenance, path);
    return;
  }
  output[key] = defaultValue;
  recordDefault(provenance, path);
}

function expectEnum(input, key, path, allowedValue, output, provenance, issues) {
  if (Object.hasOwn(input, key)) {
    if (typeof input[key] !== "string") {
      issues.push(issue("INVALID_TYPE", "invalid_config", path, "Expected a string enum value."));
      output[key] = allowedValue;
      return;
    }
    if (input[key] !== allowedValue) {
      issues.push(
        issue(
          "INVALID_ENUM",
          "invalid_config",
          path,
          "Unsupported enum value for this config field.",
        ),
      );
      output[key] = allowedValue;
      return;
    }
    output[key] = input[key];
    recordFile(provenance, path);
    return;
  }
  output[key] = allowedValue;
  recordDefault(provenance, path);
}

function expectRangedNumber(input, key, path, range, defaultValue, output, provenance, issues) {
  if (!Object.hasOwn(input, key)) {
    output[key] = defaultValue;
    recordDefault(provenance, path);
    return;
  }

  const value = input[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push(issue("INVALID_TYPE", "invalid_config", path, "Expected a finite number."));
    output[key] = defaultValue;
    return;
  }

  if (range.integer && !Number.isInteger(value)) {
    issues.push(issue("INVALID_TYPE", "invalid_config", path, "Expected an integer."));
    output[key] = defaultValue;
    return;
  }

  const belowMin = Object.hasOwn(range, "exclusiveMin")
    ? value <= range.exclusiveMin
    : value < range.min;
  if (belowMin || value > range.max) {
    issues.push(
      issue(
        "INVALID_RANGE",
        "invalid_config",
        path,
        "Numeric config value is outside the accepted range.",
      ),
    );
    output[key] = defaultValue;
    return;
  }

  output[key] = value;
  recordFile(provenance, path);
}

function parseVerification(input, provenance, issues) {
  const output = {};
  if (!Object.hasOwn(input, "verification")) {
    const defaults = clone(DEFAULTS.verification);
    for (const [key, value] of Object.entries(defaults)) {
      output[key] = value;
    }
    recordDefault(provenance, "/verification/deterministicBlocks");
    recordDefault(provenance, "/verification/advisoryReviewBlocks");
    recordDefault(provenance, "/verification/webE2E");
    recordDefault(provenance, "/verification/mobileE2E/default");
    recordDefault(provenance, "/verification/mobileE2E/advanced");
    return output;
  }

  const raw = input.verification;
  if (!isPlainObject(raw)) {
    issues.push(issue("INVALID_TYPE", "invalid_config", "/verification", "Expected an object."));
    return clone(DEFAULTS.verification);
  }

  validateAllowedKeys(raw, VERIFICATION_KEYS, "/verification", issues);
  expectBoolean(
    raw,
    "deterministicBlocks",
    "/verification/deterministicBlocks",
    true,
    output,
    provenance,
    issues,
  );
  expectBoolean(
    raw,
    "advisoryReviewBlocks",
    "/verification/advisoryReviewBlocks",
    false,
    output,
    provenance,
    issues,
  );
  expectEnum(raw, "webE2E", "/verification/webE2E", "playwright", output, provenance, issues);

  const mobile = {};
  if (Object.hasOwn(raw, "mobileE2E")) {
    if (!isPlainObject(raw.mobileE2E)) {
      issues.push(
        issue("INVALID_TYPE", "invalid_config", "/verification/mobileE2E", "Expected an object."),
      );
      mobile.default = "maestro";
      mobile.advanced = "detox";
    } else {
      validateAllowedKeys(raw.mobileE2E, MOBILE_E2E_KEYS, "/verification/mobileE2E", issues);
      expectEnum(
        raw.mobileE2E,
        "default",
        "/verification/mobileE2E/default",
        "maestro",
        mobile,
        provenance,
        issues,
      );
      expectEnum(
        raw.mobileE2E,
        "advanced",
        "/verification/mobileE2E/advanced",
        "detox",
        mobile,
        provenance,
        issues,
      );
    }
  } else {
    mobile.default = "maestro";
    mobile.advanced = "detox";
    recordDefault(provenance, "/verification/mobileE2E/default");
    recordDefault(provenance, "/verification/mobileE2E/advanced");
  }
  output.mobileE2E = mobile;
  return output;
}

function parseUiVerification(input, provenance, issues) {
  const output = {};
  if (!Object.hasOwn(input, "uiVerification")) {
    output.enabled = true;
    recordDefault(provenance, "/uiVerification/enabled");
    return output;
  }
  const raw = input.uiVerification;
  if (!isPlainObject(raw)) {
    issues.push(issue("INVALID_TYPE", "invalid_config", "/uiVerification", "Expected an object."));
    return { enabled: true };
  }
  validateAllowedKeys(raw, UI_VERIFICATION_KEYS, "/uiVerification", issues);
  expectBoolean(raw, "enabled", "/uiVerification/enabled", true, output, provenance, issues);
  return output;
}

function parseAgentRegistry(input, provenance, issues) {
  const output = {};
  if (!Object.hasOwn(input, "agentRegistry")) {
    output.validationRequired = true;
    recordDefault(provenance, "/agentRegistry/validationRequired");
    return output;
  }
  const raw = input.agentRegistry;
  if (!isPlainObject(raw)) {
    issues.push(issue("INVALID_TYPE", "invalid_config", "/agentRegistry", "Expected an object."));
    return { validationRequired: true };
  }
  validateAllowedKeys(raw, AGENT_REGISTRY_KEYS, "/agentRegistry", issues);
  expectBoolean(
    raw,
    "validationRequired",
    "/agentRegistry/validationRequired",
    true,
    output,
    provenance,
    issues,
  );
  return output;
}

export function createDefaultVibeConfig(options) {
  const result = parseVibeConfig(options);
  if (!result.ok) {
    const error = new Error("Default vibe-engineer config options failed schema validation.");
    error.name = "VibeConfigDefaultCreationError";
    error.issues = result.issues;
    error.diagnostics = result.diagnostics;
    throw error;
  }
  return result.config;
}

export function parseVibeConfig(input) {
  const issues = [];
  const provenance = {};

  if (!isPlainObject(input)) {
    return failure("invalid_config", [
      issue("INVALID_TYPE", "invalid_config", "", "Config root must be a JSON object."),
    ]);
  }

  validateAllowedKeys(input, TOP_LEVEL_KEYS, "", issues);

  if (!Object.hasOwn(input, "agenticHarness")) {
    issues.push(
      issue("REQUIRED_FIELD", "invalid_config", "/agenticHarness", "agenticHarness is required."),
    );
  } else if (input.agenticHarness !== "pi") {
    issues.push(
      issue(
        "UNSUPPORTED_HARNESS",
        "invalid_config",
        "/agenticHarness",
        "Only the pi agentic harness is selectable in v1.",
        { supportedValues: ["pi"], deferredValues: ["claude-code", "codex", "opencode"] },
      ),
    );
  } else {
    recordFile(provenance, "/agenticHarness");
  }

  const config = {
    agenticHarness: input.agenticHarness === "pi" ? "pi" : "pi",
  };

  expectRangedNumber(
    input,
    "maxParallelAgents",
    "/maxParallelAgents",
    VIBE_CONFIG_SCHEMA.ranges.maxParallelAgents,
    8,
    config,
    provenance,
    issues,
  );
  expectRangedNumber(
    input,
    "maxValidationFixIterations",
    "/maxValidationFixIterations",
    VIBE_CONFIG_SCHEMA.ranges.maxValidationFixIterations,
    3,
    config,
    provenance,
    issues,
  );
  expectRangedNumber(
    input,
    "agenticWorkPackageTargetHours",
    "/agenticWorkPackageTargetHours",
    VIBE_CONFIG_SCHEMA.ranges.agenticWorkPackageTargetHours,
    6,
    config,
    provenance,
    issues,
  );
  config.verification = parseVerification(input, provenance, issues);
  config.uiVerification = parseUiVerification(input, provenance, issues);
  config.agentRegistry = parseAgentRegistry(input, provenance, issues);

  if (issues.length > 0) {
    return failure("invalid_config", issues);
  }

  return success(config, provenance);
}

async function readJsonFile(configPath) {
  const content = await readFile(configPath, "utf8");
  try {
    return { ok: true, data: JSON.parse(content) };
  } catch {
    return {
      ok: false,
      issue: issue("MALFORMED_JSON", "invalid_config", "", "Config file is not valid JSON."),
    };
  }
}

export async function loadVibeConfigFile(configPath) {
  const resolvedConfigPath = resolve(configPath);
  if (extname(resolvedConfigPath) !== ".json") {
    return failure(
      "invalid_config",
      [
        issue(
          "UNSUPPORTED_CONFIG_FORMAT",
          "invalid_config",
          resolvedConfigPath,
          "Explicit --config paths must point to a JSON config file.",
        ),
      ],
      { configPath: resolvedConfigPath },
    );
  }
  let parsed;
  try {
    parsed = await readJsonFile(resolvedConfigPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return failure(
        "missing_config",
        [
          issue(
            "MISSING_CONFIG",
            "missing_config",
            resolvedConfigPath,
            "Required vibe-engineer.config.json file was not found.",
          ),
        ],
        { configPath: resolvedConfigPath },
      );
    }
    throw error;
  }

  if (!parsed.ok) {
    return failure("invalid_config", [parsed.issue], { configPath: resolvedConfigPath });
  }

  const result = parseVibeConfig(parsed.data);
  return result.ok
    ? success(result.config, result.provenance, { configPath: resolvedConfigPath })
    : failure("invalid_config", result.issues, { configPath: resolvedConfigPath });
}

async function detectUnsupportedConfigFormats(projectRoot) {
  const issues = [];
  for (const fileName of UNSUPPORTED_CONFIG_FILES) {
    try {
      await readFile(join(projectRoot, fileName), "utf8");
      issues.push(
        issue(
          "UNSUPPORTED_CONFIG_FORMAT",
          "invalid_config",
          join(projectRoot, fileName),
          "Only vibe-engineer.config.json is supported in this lane.",
        ),
      );
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
  }
  return issues;
}

export async function loadVibeConfigFromProjectRoot(projectRoot) {
  const resolvedProjectRoot = resolve(projectRoot);
  const configPath = join(resolvedProjectRoot, VIBE_CONFIG_FILE_NAME);
  const unsupportedIssues = await detectUnsupportedConfigFormats(resolvedProjectRoot);
  if (unsupportedIssues.length > 0) {
    return failure("invalid_config", unsupportedIssues, {
      projectRoot: resolvedProjectRoot,
      configPath,
    });
  }
  const result = await loadVibeConfigFile(configPath);
  return { ...result, projectRoot: resolvedProjectRoot };
}
