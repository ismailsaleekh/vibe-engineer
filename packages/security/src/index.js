// @ts-check

export const SECURITY_POLICY_VERSION = 'security-policy.v1';
export const SECURITY_PACKAGE_VERSION = '0.1.0-i18a';

export const SecurityCategory = Object.freeze({
  Secret: 'secret',
  ProductionCredential: 'production_credential',
  CommandPolicy: 'command_policy',
  DestructiveOperation: 'destructive_operation',
  EnvConfig: 'env_config',
  ExternalIntegration: 'external_integration',
  SandboxCapability: 'sandbox_capability',
  EvidenceIntegrity: 'evidence_integrity',
  Redaction: 'redaction',
  PolicyContract: 'policy_contract',
  PathSafety: 'path_safety',
});

export const SecurityClassification = Object.freeze({
  SecretLikeValue: 'secret_like_value',
  ProductionCredentialOrDefault: 'production_credential_or_default',
  DestructiveCommand: 'destructive_command',
  UnsafeCommandTarget: 'unsafe_command_target',
  UnsafeEnvDefault: 'unsafe_env_default',
  UnsafeConfigDefault: 'unsafe_config_default',
  UnsafeExternalIntegration: 'unsafe_external_integration',
  UnsupportedSandboxClaim: 'unsupported_sandbox_claim',
  MalformedPolicy: 'malformed_policy',
  UnsupportedPolicyVersion: 'unsupported_policy_version',
  UnknownPolicyField: 'unknown_policy_field',
  UnknownRequestField: 'unknown_request_field',
  EvidenceSecretLeak: 'evidence_secret_leak',
  AdvisoryNotice: 'advisory_notice',
  Safe: 'safe',
});

export const SecuritySeverity = Object.freeze({
  Info: 'info',
  Advisory: 'advisory',
  Minor: 'minor',
  Major: 'major',
  Critical: 'critical',
});

export const SecurityDecision = Object.freeze({
  Allow: 'allow',
  AllowWithAdvisory: 'allow_with_advisory',
  Block: 'block',
});

export const SecurityGateStatus = Object.freeze({
  Passed: 'passed',
  Advisory: 'advisory',
  Blocked: 'blocked',
});

export const SandboxCapabilityStatus = Object.freeze({
  Proven: 'proven',
  NotProvided: 'not_provided',
  Unknown: 'unknown',
  BlockedPendingLive: 'blocked/pending-live',
});

export const CommandSafetyClassification = Object.freeze({
  ReadOnly: 'read_only',
  LocalDeterministicWrite: 'local_deterministic_write',
  NetworkRead: 'network_read',
  NetworkExternalMutation: 'network_external_mutation',
  DestructiveLocalOperation: 'destructive_local_operation',
  RepositoryStateOperation: 'repository_state_operation',
  CredentialOperation: 'credential_operation',
  ProductionImpactingOperation: 'production_impacting_operation',
  Unknown: 'unknown',
});

export const ExternalIntegrationMode = Object.freeze({
  Disabled: 'disabled',
  DryRun: 'dry_run',
  ReadOnly: 'read_only',
  LocalFixture: 'local_fixture',
  Enabled: 'enabled',
  Mutating: 'mutating',
});

const POLICY_KEYS = new Set([
  'schemaVersion',
  'defaultDecision',
  'allowedCommandClassifications',
  'protectedPathPrefixes',
  'allowProductionCredentials',
  'allowedExternalIntegrationModes',
  'allowedSandboxCapabilityStatuses',
  'advisoryClassifications',
]);
const GATE_REQUEST_KEYS = new Set(['policy', 'command', 'env', 'config', 'externalIntegrations', 'sandboxClaims', 'evidence', 'notes']);
const COMMAND_KEYS = new Set(['command', 'argv', 'classification', 'workingDirectory', 'targetPaths', 'declaredWritePaths']);
const EXTERNAL_KEYS = new Set(['id', 'mode', 'enabled', 'requiresCredential', 'requiresBudget', 'requiresNetwork', 'networkMutation', 'explicitApproval']);
const SANDBOX_KEYS = new Set(['provider', 'status', 'claim']);
const NOTE_KEYS = new Set(['id', 'message', 'classification', 'severity']);

const COMMAND_CLASSIFICATION_VALUES = new Set(Object.values(CommandSafetyClassification));
const SAFE_COMMAND_CLASSIFICATION_VALUES = new Set([CommandSafetyClassification.ReadOnly, CommandSafetyClassification.LocalDeterministicWrite]);
const EXTERNAL_MODE_VALUES = new Set(Object.values(ExternalIntegrationMode));
const SAFE_EXTERNAL_MODE_VALUES = new Set([ExternalIntegrationMode.Disabled, ExternalIntegrationMode.DryRun, ExternalIntegrationMode.ReadOnly, ExternalIntegrationMode.LocalFixture]);
const SANDBOX_STATUS_VALUES = new Set(Object.values(SandboxCapabilityStatus));
const GREEN_SANDBOX_STATUS_VALUES = new Set([SandboxCapabilityStatus.Proven, SandboxCapabilityStatus.NotProvided, SandboxCapabilityStatus.Unknown]);
const MANDATORY_PROTECTED_PATH_PREFIXES = Object.freeze([
  '/',
  '~',
  '.git',
  '../',
  '..',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'yarn.lock',
  'turbo.json',
  '.npmrc',
  '.gitignore',
  'eslint.config.mjs',
  'prettier.config.mjs',
  'tsconfig.base.json',
  'tsconfig.json',
  'packages/cli/package.json',
  'packages/security/package.json',
  'packages/cli/src/entry',
  'packages/cli/src/command-loader',
  'packages/cli/src/envelope',
  'packages/cli/src/errors',
  'packages/cli/src/testing',
]);
const SECURITY_CLASSIFICATION_VALUES = new Set(Object.values(SecurityClassification));
const SECURITY_SEVERITY_VALUES = new Set(Object.values(SecuritySeverity));
const REDACTION_MAX_DEPTH = 16;
const REDACTION_MAX_ARRAY_ITEMS = 200;
const REDACTION_MAX_OBJECT_KEYS = 200;
const REDACTION_MAX_STRING_LENGTH = 16_384;
const COMMAND_CARRIER_MAX_TOKENS = 512;
const COMMAND_CARRIER_MAX_TOKEN_LENGTH = 16_384;

const SECRET_KEY_PARTS = Object.freeze([
  'token', 'auth-token', 'access-token', 'password', 'passphrase', 'secret', 'api-key', 'apikey', 'credential', 'credentials', 'client-secret', 'clientsecret', 'private-key', 'signing-key', 'session-cookie', 'webhook-secret'
]);

const SAFE_PLACEHOLDER_PATTERNS = Object.freeze([
  /^$/,
  /^DUMMY(?:_[A-Z0-9]+)*$/,
  /^DUMMY_NON_SECRET(?:_[A-Z0-9]+)*$/,
  /^REPLACE_WITH_[A-Z0-9_]+$/,
  /^LOCAL_ONLY_[A-Z0-9_]+$/,
  /^EXAMPLE_[A-Z0-9_]+$/,
  /^<[^>]+>$/,
]);

export const DEFAULT_SECURITY_POLICY = deepFreeze({
  schemaVersion: SECURITY_POLICY_VERSION,
  defaultDecision: SecurityDecision.Block,
  allowedCommandClassifications: [CommandSafetyClassification.ReadOnly, CommandSafetyClassification.LocalDeterministicWrite],
  protectedPathPrefixes: MANDATORY_PROTECTED_PATH_PREFIXES,
  allowProductionCredentials: false,
  allowedExternalIntegrationModes: [ExternalIntegrationMode.Disabled, ExternalIntegrationMode.DryRun, ExternalIntegrationMode.ReadOnly, ExternalIntegrationMode.LocalFixture],
  allowedSandboxCapabilityStatuses: [SandboxCapabilityStatus.Proven, SandboxCapabilityStatus.NotProvided, SandboxCapabilityStatus.Unknown],
  advisoryClassifications: [SecurityClassification.AdvisoryNotice],
});

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @template T @param {T} value @returns {T} */
function deepFreeze(value) {
  if (isRecord(value) || Array.isArray(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value)) deepFreeze(entry);
  }
  return value;
}

/** @param {unknown} value @returns {string} */
function stringValue(value) {
  return typeof value === 'string' ? value : '';
}

/** @param {string} value @returns {string} */
function normalizeKey(value) {
  return value.toLowerCase().replaceAll('_', '-');
}

/** @param {string} key @returns {boolean} */
function isSecretLikeKey(key) {
  const normalized = normalizeKey(key);
  return SECRET_KEY_PARTS.some((part) => normalized === part || normalized.includes(`-${part}`) || normalized.includes(`${part}-`) || normalized.includes(part));
}

/** @param {string} value @returns {boolean} */
function isSafePlaceholder(value) {
  return SAFE_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

/** @param {string} text @returns {string} */
export function redactSecurityText(text) {
  let output = String(text);
  output = output.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '<redacted:private-key>');
  output = output.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer <redacted>');
  output = output.replace(/([A-Za-z0-9_.-]*(?:token|password|passphrase|secret|apikey|api-key|credential|client-secret|private-key|signing-key)[A-Za-z0-9_.-]*\s*[:=]\s*)([^\s,;"']+)/gi, '$1<redacted>');
  output = output.replace(/(--(?:token|auth-token|access-token|password|passphrase|secret|api-key|apikey|credential|credentials|client-secret)(?:=|\s+))([^\s]+)/gi, '$1<redacted>');
  output = output.replace(/\b(?:sk|ghp|gho|github_pat|xox[baprs])-?[A-Za-z0-9_=-]{10,}\b/gi, '<redacted:token>');
  output = output.replace(/\bAKIA[0-9A-Z]{16}\b/g, '<redacted:access-key>');
  output = output.replace(/([a-z][a-z0-9+.-]*:\/\/[^\s:/?#]+:)([^\s@]+)(@)/gi, '$1<redacted>$3');
  output = output.replace(/\b[A-Z0-9_]*(?:TOKEN|PASSWORD|PASSPHRASE|SECRET|APIKEY|API_KEY|CREDENTIAL|CLIENT_SECRET|PRIVATE_KEY|SIGNING_KEY)[A-Z0-9_]*\b/g, '<redacted>');
  return output;
}

/** @param {unknown} value @returns {unknown} */
export function redactSecurityValue(value) {
  return redactSecurityValueWithMetadata(value).value;
}

/** @param {unknown} value */
function redactSecurityValueWithMetadata(value) {
  return sanitizeSecurityValue(value, { seen: new WeakSet(), depth: 0, path: '$' });
}

/** @param {unknown} value @param {{seen: WeakSet<object>, depth: number, path: string}} context @returns {{value: unknown, changed: boolean, truncated: boolean}} */
function sanitizeSecurityValue(value, context) {
  if (context.depth > REDACTION_MAX_DEPTH) return { value: '<redacted:max-depth-exceeded>', changed: true, truncated: true };
  if (typeof value === 'string') {
    const bounded = value.length > REDACTION_MAX_STRING_LENGTH ? `${value.slice(0, REDACTION_MAX_STRING_LENGTH)}<redacted:string-truncated>` : value;
    const redacted = redactSecurityText(bounded);
    return { value: redacted, changed: redacted !== value, truncated: bounded !== value };
  }
  if (typeof value === 'bigint') return { value: '<redacted:non-json-bigint>', changed: true, truncated: false };
  if (typeof value === 'symbol') return { value: '<redacted:non-json-symbol>', changed: true, truncated: false };
  if (typeof value === 'function') return { value: '<redacted:non-json-function>', changed: true, truncated: false };
  if (value === undefined) return { value: '<redacted:non-json-undefined>', changed: true, truncated: false };
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return { value, changed: false, truncated: false };
  if (typeof value === 'object') {
    if (context.seen.has(value)) return { value: '<redacted:circular-reference>', changed: true, truncated: false };
    context.seen.add(value);
    if (Array.isArray(value)) {
      const result = [];
      let changed = value.length > REDACTION_MAX_ARRAY_ITEMS;
      let truncated = value.length > REDACTION_MAX_ARRAY_ITEMS;
      for (const [index, entry] of value.slice(0, REDACTION_MAX_ARRAY_ITEMS).entries()) {
        const sanitized = sanitizeSecurityValue(entry, { seen: context.seen, depth: context.depth + 1, path: `${context.path}[${index}]` });
        result.push(sanitized.value);
        changed = changed || sanitized.changed;
        truncated = truncated || sanitized.truncated;
      }
      if (value.length > REDACTION_MAX_ARRAY_ITEMS) result.push('<redacted:array-truncated>');
      context.seen.delete(value);
      return { value: result, changed, truncated };
    }
    if (isRecord(value)) {
      /** @type {Record<string, unknown>} */
      const result = {};
      const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
      let changed = entries.length > REDACTION_MAX_OBJECT_KEYS;
      let truncated = entries.length > REDACTION_MAX_OBJECT_KEYS;
      for (const [key, entry] of entries.slice(0, REDACTION_MAX_OBJECT_KEYS)) {
        if (isSecretLikeKey(key)) {
          result[key] = '<redacted>';
          changed = true;
          continue;
        }
        const sanitized = sanitizeSecurityValue(entry, { seen: context.seen, depth: context.depth + 1, path: `${context.path}.${key}` });
        result[key] = sanitized.value;
        changed = changed || sanitized.changed;
        truncated = truncated || sanitized.truncated;
      }
      if (entries.length > REDACTION_MAX_OBJECT_KEYS) result['<redacted:object-truncated>'] = entries.length - REDACTION_MAX_OBJECT_KEYS;
      context.seen.delete(value);
      return { value: result, changed, truncated };
    }
  }
  return { value: '<redacted:unsupported-value>', changed: true, truncated: false };
}

/** @param {string} value @returns {boolean} */
export function isSecretLikeValue(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0 || isSafePlaceholder(trimmed)) return false;
  if (redactSecurityText(trimmed) !== trimmed) return true;
  if (/^(?:sk|ghp|gho|github_pat|xox[baprs])-?[A-Za-z0-9_=-]{10,}$/i.test(trimmed)) return true;
  if (/^AKIA[0-9A-Z]{16}$/.test(trimmed)) return true;
  return false;
}

/** @param {string} value @returns {{value: string, malformedQuote: boolean}} */
function normalizeCommandCarrierFlagToken(value) {
  let normalized = value;
  let malformedQuote = false;
  while (normalized.startsWith('"') || normalized.startsWith("'")) {
    const quote = normalized[0];
    const closingIndex = normalized.lastIndexOf(quote);
    if (closingIndex > 0) {
      normalized = `${normalized.slice(1, closingIndex)}${normalized.slice(closingIndex + 1)}`;
      continue;
    }
    malformedQuote = true;
    normalized = normalized.slice(1);
    break;
  }
  return { value: normalized, malformedQuote };
}

/** @param {string} value @returns {{isFlag: boolean, key: string, inlineValue: string | null, malformedQuote: boolean}} */
function parseCommandCarrierFlag(value) {
  const normalized = normalizeCommandCarrierFlagToken(value);
  if (!normalized.value.startsWith('-')) return { isFlag: false, key: '', inlineValue: null, malformedQuote: normalized.malformedQuote };
  const withoutLeadingDashes = normalized.value.replace(/^-+/, '');
  const separatorIndex = withoutLeadingDashes.search(/[=:]/);
  if (separatorIndex === -1) return { isFlag: true, key: withoutLeadingDashes, inlineValue: null, malformedQuote: normalized.malformedQuote };
  return {
    isFlag: true,
    key: withoutLeadingDashes.slice(0, separatorIndex),
    inlineValue: withoutLeadingDashes.slice(separatorIndex + 1),
    malformedQuote: normalized.malformedQuote,
  };
}

/** @typedef {{location: string, value: string, carrier: 'command' | 'argv', quoted: boolean}} CommandCarrierToken */

/** @param {string} command @param {string[]} argv @returns {{tokens: CommandCarrierToken[], truncated: boolean, malformedFindings: ReturnType<typeof createSecurityFinding>[]}} */
function createCommandCarrierTokenStream(command, argv) {
  /** @type {CommandCarrierToken[]} */
  const tokens = [];
  /** @type {ReturnType<typeof createSecurityFinding>[]} */
  const malformedFindings = [];
  let truncated = false;
  const pushToken = (location, value, carrier, quoted = false) => {
    if (tokens.length >= COMMAND_CARRIER_MAX_TOKENS) {
      truncated = true;
      return;
    }
    if (value.length > COMMAND_CARRIER_MAX_TOKEN_LENGTH) {
      truncated = true;
      tokens.push({ location, value: value.slice(0, COMMAND_CARRIER_MAX_TOKEN_LENGTH), carrier, quoted });
      return;
    }
    tokens.push({ location, value, carrier, quoted });
  };

  let current = '';
  let tokenStarted = false;
  let tokenWasQuoted = false;
  let quote = null;
  let quoteStartLocation = 'command';
  let tokenIndex = 0;
  const tokenLocation = () => tokenIndex === 0 ? 'command' : `command[token:${tokenIndex}]`;
  const finishToken = () => {
    if (!tokenStarted) return;
    pushToken(tokenLocation(), current, 'command', tokenWasQuoted);
    tokenIndex += 1;
    current = '';
    tokenStarted = false;
    tokenWasQuoted = false;
  };

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    if (quote === null && /\s/u.test(char)) {
      finishToken();
      continue;
    }
    if (char === '\\') {
      tokenStarted = true;
      if (index + 1 >= command.length) {
        current += char;
        malformedFindings.push(createMalformedRequestFinding('Command carrier contains a trailing escape.', tokenLocation(), { carrier: 'command' }));
        continue;
      }
      const escaped = command[index + 1];
      if (!(escaped === '"' || escaped === "'" || escaped === '\\' || /\s/u.test(escaped))) {
        malformedFindings.push(createMalformedRequestFinding('Command carrier contains an unsupported escape sequence.', tokenLocation(), { carrier: 'command' }));
      }
      current += escaped;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      tokenStarted = true;
      tokenWasQuoted = true;
      if (quote === null) {
        quote = char;
        quoteStartLocation = tokenLocation();
        continue;
      }
      if (quote === char) {
        quote = null;
        continue;
      }
    }
    tokenStarted = true;
    current += char;
  }
  if (quote !== null) {
    malformedFindings.push(createMalformedRequestFinding('Command carrier contains an unterminated quoted token.', quoteStartLocation, { carrier: 'command', quote }));
  }
  finishToken();
  for (const [index, value] of argv.entries()) pushToken(`argv[${index}]`, value, 'argv', false);
  return { tokens, truncated, malformedFindings };
}

/** @param {CommandCarrierToken[]} tokens @returns {ReturnType<typeof createSecurityFinding>[]} */
function scanCommandCarrierSecretFindings(tokens) {
  /** @type {ReturnType<typeof createSecurityFinding>[]} */
  const findings = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const flag = parseCommandCarrierFlag(token.value);
    const isSecretFlagKey = flag.isFlag && isSecretLikeKey(flag.key);
    if (isSecretFlagKey) {
      const nextToken = tokens[index + 1];
      const nextFlag = nextToken ? parseCommandCarrierFlag(nextToken.value) : null;
      const adjacentValue = flag.inlineValue ?? (nextToken && !(nextFlag?.isFlag) ? nextToken.value : null);
      findings.push(createSecurityFinding({
        category: SecurityCategory.Secret,
        classification: SecurityClassification.SecretLikeValue,
        severity: SecuritySeverity.Critical,
        blocking: true,
        message: 'Secret-like CLI command carrier flag is denied.',
        location: adjacentValue === null ? token.location : `${token.location}${flag.inlineValue === null && nextToken ? ` -> ${nextToken.location}` : ''}`,
        details: adjacentValue === null ? { secretFlag: flag.key } : { secretFlag: flag.key, secretValue: adjacentValue },
      }));
      continue;
    }
    if (isSecretLikeValue(token.value)) {
      findings.push(createSecurityFinding({ category: SecurityCategory.Secret, classification: SecurityClassification.SecretLikeValue, severity: SecuritySeverity.Critical, blocking: true, message: 'Secret-like CLI command carrier data is denied.', location: token.location, details: { secretValue: token.value } }));
    }
  }
  return findings;
}

/** @param {string} value @returns {boolean} */
function isProductionLike(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (/\b(prod|production|live|deploy|release)\b/i.test(trimmed)) return true;
  if (/^https?:\/\/(?!localhost(?::|\/|$)|127\.0\.0\.1(?::|\/|$)|0\.0\.0\.0(?::|\/|$)|\[::1\](?::|\/|$))/i.test(trimmed)) return true;
  if (/^[a-z]+:\/\/[^\s]*:[^\s@]+@/i.test(trimmed)) return true;
  return false;
}

/** @param {Record<string, unknown>} input @param {Set<string>} allowed @param {string} classification @returns {ReturnType<typeof createSecurityFinding>[]} */
function unknownFieldFindings(input, allowed, classification) {
  return Object.keys(input)
    .filter((key) => !allowed.has(key))
    .sort()
    .map((key) => createSecurityFinding({
      category: SecurityCategory.PolicyContract,
      classification,
      severity: SecuritySeverity.Critical,
      blocking: true,
      message: `Unknown field is not supported: ${key}`,
      location: key,
      details: { field: key },
    }));
}

/** @param {string} message @param {string} location @param {unknown} details */
function createMalformedRequestFinding(message, location, details) {
  return createSecurityFinding({
    category: SecurityCategory.PolicyContract,
    classification: SecurityClassification.UnknownRequestField,
    severity: SecuritySeverity.Critical,
    blocking: true,
    message,
    location,
    details,
  });
}

/** @param {{category:string, classification:string, severity:string, blocking:boolean, message:string, location?:string, details?:unknown}} input */
export function createSecurityFinding(input) {
  return Object.freeze({
    schemaVersion: 'vibe-engineer.security.finding.v1',
    category: input.category,
    classification: input.classification,
    severity: input.severity,
    blocking: input.blocking,
    message: redactSecurityText(input.message),
    location: input.location ?? null,
    details: redactSecurityValue(input.details ?? {}),
  });
}

/** @param {unknown} input */
export function parseSecurityPolicy(input = DEFAULT_SECURITY_POLICY) {
  if (!isRecord(input)) {
    return failPolicy([createSecurityFinding({ category: SecurityCategory.PolicyContract, classification: SecurityClassification.MalformedPolicy, severity: SecuritySeverity.Critical, blocking: true, message: 'Security policy must be an object.' })]);
  }
  const unknowns = unknownFieldFindings(input, POLICY_KEYS, SecurityClassification.UnknownPolicyField);
  if (unknowns.length > 0) return failPolicy(unknowns);
  if (input.schemaVersion !== SECURITY_POLICY_VERSION) {
    return failPolicy([createSecurityFinding({ category: SecurityCategory.PolicyContract, classification: typeof input.schemaVersion === 'string' ? SecurityClassification.UnsupportedPolicyVersion : SecurityClassification.MalformedPolicy, severity: SecuritySeverity.Critical, blocking: true, message: 'Unsupported or missing security policy version.', details: { schemaVersion: input.schemaVersion } })]);
  }
  const policy = {
    ...DEFAULT_SECURITY_POLICY,
    ...input,
  };
  const arrayFields = ['allowedCommandClassifications', 'protectedPathPrefixes', 'allowedExternalIntegrationModes', 'allowedSandboxCapabilityStatuses', 'advisoryClassifications'];
  for (const field of arrayFields) {
    if (!Array.isArray(policy[field]) || policy[field].some((entry) => typeof entry !== 'string')) {
      return failPolicy([createSecurityFinding({ category: SecurityCategory.PolicyContract, classification: SecurityClassification.MalformedPolicy, severity: SecuritySeverity.Critical, blocking: true, message: `Policy field ${field} must be an array of strings.`, location: field })]);
    }
  }
  const enumChecks = [
    { field: 'allowedCommandClassifications', allowed: SAFE_COMMAND_CLASSIFICATION_VALUES, values: policy.allowedCommandClassifications },
    { field: 'allowedExternalIntegrationModes', allowed: SAFE_EXTERNAL_MODE_VALUES, values: policy.allowedExternalIntegrationModes },
    { field: 'allowedSandboxCapabilityStatuses', allowed: GREEN_SANDBOX_STATUS_VALUES, values: policy.allowedSandboxCapabilityStatuses },
    { field: 'advisoryClassifications', allowed: new Set([SecurityClassification.AdvisoryNotice]), values: policy.advisoryClassifications },
  ];
  for (const check of enumChecks) {
    for (const entry of check.values) {
      if (!check.allowed.has(entry)) {
        return failPolicy([createSecurityFinding({ category: SecurityCategory.PolicyContract, classification: SecurityClassification.MalformedPolicy, severity: SecuritySeverity.Critical, blocking: true, message: `Policy field ${check.field} contains unsupported value.`, location: check.field, details: { value: entry } })]);
      }
    }
  }
  for (const requiredPrefix of MANDATORY_PROTECTED_PATH_PREFIXES) {
    if (!policy.protectedPathPrefixes.includes(requiredPrefix)) {
      return failPolicy([createSecurityFinding({ category: SecurityCategory.PolicyContract, classification: SecurityClassification.MalformedPolicy, severity: SecuritySeverity.Critical, blocking: true, message: 'Policy may not remove mandatory protected path prefixes.', location: 'protectedPathPrefixes', details: { requiredPrefix } })]);
    }
  }
  if (policy.defaultDecision !== SecurityDecision.Block) {
    return failPolicy([createSecurityFinding({ category: SecurityCategory.PolicyContract, classification: SecurityClassification.MalformedPolicy, severity: SecuritySeverity.Critical, blocking: true, message: 'defaultDecision must be fail-closed block.', location: 'defaultDecision' })]);
  }
  if (policy.allowProductionCredentials !== false) {
    return failPolicy([createSecurityFinding({ category: SecurityCategory.ProductionCredential, classification: SecurityClassification.ProductionCredentialOrDefault, severity: SecuritySeverity.Critical, blocking: true, message: 'allowProductionCredentials must be false for generated/default policy.', location: 'allowProductionCredentials' })]);
  }
  return { ok: true, policy: deepFreeze({ ...policy }) };
}

/** @param {ReturnType<typeof createSecurityFinding>[]} findings */
function failPolicy(findings) {
  return { ok: false, result: createSecurityGateResult({ findings, redactions: [], auditEvents: [], subject: 'security_policy' }) };
}

/** @param {string} subject @param {unknown} details */
export function createSecurityAuditEvent(subject, details) {
  return Object.freeze({
    schemaVersion: 'vibe-engineer.security.audit-event.v1',
    eventId: `security:${subject}:${stableHash(JSON.stringify(redactSecurityValue(details)))}`,
    subject,
    recordedAt: 'deterministic-clock-not-used',
    details: redactSecurityValue(details),
  });
}

/** @param {string} text @returns {string} */
function stableHash(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** @param {{findings: ReturnType<typeof createSecurityFinding>[], redactions?: unknown[], auditEvents?: unknown[], subject?: string}} input */
export function createSecurityGateResult(input) {
  const blocking = input.findings.some((finding) => finding.blocking);
  const advisory = !blocking && input.findings.some((finding) => finding.severity === SecuritySeverity.Advisory || finding.classification === SecurityClassification.AdvisoryNotice);
  return Object.freeze({
    schemaVersion: 'vibe-engineer.security.gate-result.v1',
    subject: input.subject ?? 'security_gate',
    status: blocking ? SecurityGateStatus.Blocked : advisory ? SecurityGateStatus.Advisory : SecurityGateStatus.Passed,
    decision: blocking ? SecurityDecision.Block : advisory ? SecurityDecision.AllowWithAdvisory : SecurityDecision.Allow,
    blocking,
    findings: Object.freeze([...input.findings].sort(compareFindings)),
    redactions: redactSecurityValue(input.redactions ?? []),
    auditEvents: redactSecurityValue(input.auditEvents ?? []),
  });
}

/** @param {ReturnType<typeof createSecurityFinding>} a @param {ReturnType<typeof createSecurityFinding>} b */
function compareFindings(a, b) {
  return `${a.category}:${a.classification}:${a.location ?? ''}:${a.message}`.localeCompare(`${b.category}:${b.classification}:${b.location ?? ''}:${b.message}`);
}

/** @param {unknown} request */
export function runSecurityGate(request) {
  if (!isRecord(request)) {
    return createSecurityGateResult({
      subject: 'security_gate',
      findings: [createSecurityFinding({ category: SecurityCategory.PolicyContract, classification: SecurityClassification.MalformedPolicy, severity: SecuritySeverity.Critical, blocking: true, message: 'Security gate request must be an object.' })],
    });
  }
  const requestUnknowns = unknownFieldFindings(request, GATE_REQUEST_KEYS, SecurityClassification.UnknownRequestField);
  if (requestUnknowns.length > 0) return createSecurityGateResult({ subject: 'security_gate', findings: requestUnknowns });
  const parsed = parseSecurityPolicy(request.policy ?? DEFAULT_SECURITY_POLICY);
  if (!parsed.ok) return parsed.result;
  const policy = parsed.policy;
  /** @type {ReturnType<typeof createSecurityFinding>[]} */
  const findings = [];
  if (request.command !== undefined) findings.push(...evaluateCommandSafety(request.command, policy).findings);
  if (request.env !== undefined || request.config !== undefined) findings.push(...evaluateEnvConfigSafety({ env: request.env, config: request.config }, policy).findings);
  if (request.externalIntegrations !== undefined) findings.push(...evaluateExternalIntegrationSafety(request.externalIntegrations, policy).findings);
  if (request.sandboxClaims !== undefined) findings.push(...evaluateSandboxCapability(request.sandboxClaims, policy).findings);
  if (request.evidence !== undefined) findings.push(...evaluateEvidenceSafety(request.evidence).findings);
  if (request.notes !== undefined) findings.push(...evaluateNotes(request.notes, policy).findings);
  return createSecurityGateResult({ subject: 'security_gate', findings, auditEvents: [createSecurityAuditEvent('security_gate', { findingCount: findings.length })] });
}

/** @param {unknown} commandInput @param {Record<string, unknown>} policy */
export function evaluateCommandSafety(commandInput, policy = DEFAULT_SECURITY_POLICY) {
  /** @type {ReturnType<typeof createSecurityFinding>[]} */
  const findings = [];
  if (!isRecord(commandInput)) {
    findings.push(createSecurityFinding({ category: SecurityCategory.CommandPolicy, classification: SecurityClassification.DestructiveCommand, severity: SecuritySeverity.Critical, blocking: true, message: 'Command safety input must be an object.' }));
    return createSecurityGateResult({ subject: 'command', findings });
  }
  findings.push(...unknownFieldFindings(commandInput, COMMAND_KEYS, SecurityClassification.UnknownRequestField));
  if (typeof commandInput.command !== 'string' || commandInput.command.trim() === '') {
    findings.push(createMalformedRequestFinding('Command request must include a non-empty command string.', 'command', { receivedType: typeof commandInput.command }));
  }
  if (commandInput.argv !== undefined && (!Array.isArray(commandInput.argv) || commandInput.argv.some((entry) => typeof entry !== 'string'))) {
    findings.push(createMalformedRequestFinding('Command argv must be an array of strings when provided.', 'argv', { receivedType: Array.isArray(commandInput.argv) ? 'array-with-non-string' : typeof commandInput.argv }));
  }
  if (commandInput.targetPaths !== undefined && (!Array.isArray(commandInput.targetPaths) || commandInput.targetPaths.some((entry) => typeof entry !== 'string'))) {
    findings.push(createMalformedRequestFinding('Command targetPaths must be an array of strings when provided.', 'targetPaths', { receivedType: Array.isArray(commandInput.targetPaths) ? 'array-with-non-string' : typeof commandInput.targetPaths }));
  }
  if (commandInput.declaredWritePaths !== undefined && (!Array.isArray(commandInput.declaredWritePaths) || commandInput.declaredWritePaths.some((entry) => typeof entry !== 'string'))) {
    findings.push(createMalformedRequestFinding('Command declaredWritePaths must be an array of strings when provided.', 'declaredWritePaths', { receivedType: Array.isArray(commandInput.declaredWritePaths) ? 'array-with-non-string' : typeof commandInput.declaredWritePaths }));
  }
  if (commandInput.workingDirectory !== undefined && typeof commandInput.workingDirectory !== 'string') {
    findings.push(createMalformedRequestFinding('Command workingDirectory must be a string when provided.', 'workingDirectory', { receivedType: typeof commandInput.workingDirectory }));
  }
  const command = typeof commandInput.command === 'string' ? commandInput.command : '';
  const argv = Array.isArray(commandInput.argv) && commandInput.argv.every((entry) => typeof entry === 'string') ? commandInput.argv : [];
  const joined = [command, ...argv].join(' ').trim();
  const classification = typeof commandInput.classification === 'string' && commandInput.classification !== '' ? commandInput.classification : CommandSafetyClassification.Unknown;
  if (!COMMAND_CLASSIFICATION_VALUES.has(classification)) {
    findings.push(createMalformedRequestFinding('Command classification is not a known typed classification.', 'classification', { classification }));
  }
  const allowed = Array.isArray(policy.allowedCommandClassifications) ? policy.allowedCommandClassifications : [];
  if (!SAFE_COMMAND_CLASSIFICATION_VALUES.has(classification)) {
    findings.push(createSecurityFinding({ category: SecurityCategory.CommandPolicy, classification: SecurityClassification.DestructiveCommand, severity: SecuritySeverity.Critical, blocking: true, message: 'Unsafe command classification is blocked independent of policy relaxation.', details: { classification } }));
  } else if (!allowed.includes(classification)) {
    findings.push(createSecurityFinding({ category: SecurityCategory.CommandPolicy, classification: SecurityClassification.DestructiveCommand, severity: SecuritySeverity.Critical, blocking: true, message: 'Command classification is not allowed by policy.', details: { classification } }));
  }
  const commandCarrier = createCommandCarrierTokenStream(command, argv);
  findings.push(...commandCarrier.malformedFindings);
  if (commandCarrier.truncated) {
    findings.push(createMalformedRequestFinding('Command carrier exceeds supported token or token-length bounds.', 'command', { maxTokens: COMMAND_CARRIER_MAX_TOKENS, maxTokenLength: COMMAND_CARRIER_MAX_TOKEN_LENGTH }));
  }
  findings.push(...scanCommandCarrierSecretFindings(commandCarrier.tokens));
  if (isDestructiveCommand(joined)) {
    findings.push(createSecurityFinding({ category: SecurityCategory.DestructiveOperation, classification: SecurityClassification.DestructiveCommand, severity: SecuritySeverity.Critical, blocking: true, message: 'Destructive or unsafe command primitive is denied.', details: { command: joined } }));
  }
  const targetPaths = Array.isArray(commandInput.targetPaths) && commandInput.targetPaths.every((entry) => typeof entry === 'string') ? commandInput.targetPaths : [];
  const declaredWritePaths = Array.isArray(commandInput.declaredWritePaths) && commandInput.declaredWritePaths.every((entry) => typeof entry === 'string') ? commandInput.declaredWritePaths : [];
  for (const targetPath of [...targetPaths, ...declaredWritePaths]) {
    if (isUnsafePathTarget(targetPath, policy)) {
      findings.push(createSecurityFinding({ category: SecurityCategory.PathSafety, classification: SecurityClassification.UnsafeCommandTarget, severity: SecuritySeverity.Critical, blocking: true, message: 'Command target path escapes or targets a protected path.', location: targetPath, details: { targetPath } }));
    }
  }
  if (typeof commandInput.workingDirectory === 'string' && isUnsafeWorkingDirectory(commandInput.workingDirectory, policy)) {
    findings.push(createSecurityFinding({ category: SecurityCategory.PathSafety, classification: SecurityClassification.UnsafeCommandTarget, severity: SecuritySeverity.Critical, blocking: true, message: 'Command working directory escapes or targets a protected path.', location: commandInput.workingDirectory, details: { targetPath: commandInput.workingDirectory } }));
  }
  return createSecurityGateResult({ subject: 'command', findings });
}

/** @param {string} commandLine */
function isDestructiveCommand(commandLine) {
  const text = commandLine.toLowerCase();
  return /(^|\s)rm\s+-[^\n]*r[^\n]*f(\s|$)/.test(text)
    || /git\s+push\b[^\n]*\s--force(?:-with-lease)?\b/.test(text)
    || /\b(?:pulumi|terraform)\s+(?:destroy|apply)\b/.test(text)
    || /\b(?:npm|pnpm|yarn)\s+publish\b/.test(text)
    || /\b(?:kubectl|helm)\s+(?:apply|delete)\b/.test(text)
    || /\b(?:deploy|release)\b/.test(text)
    || /\b(?:drop\s+database|drop\s+table|truncate\s+table|delete\s+from)\b/.test(text)
    || /\b(?:prisma|sequelize|knex)\s+.*\b(?:migrate\s+deploy|db\s+push)\b/.test(text);
}

/** @param {string} targetPath @param {Record<string, unknown>} policy */
function isUnsafePathTarget(targetPath, policy) {
  const trimmed = targetPath.trim();
  const normalized = trimmed.replaceAll('\\', '/');
  if (normalized === '' || normalized === '/' || normalized === '~' || normalized === '.' || normalized === '..') return true;
  if (/^[A-Za-z]:/.test(normalized) || normalized.startsWith('//')) return true;
  if (normalized.startsWith('/') || normalized.startsWith('~')) return true;
  const rawSegments = normalized.split('/');
  if (rawSegments.some((segment) => segment === '')) return true;
  if (rawSegments.some((segment) => segment === '..')) return true;
  const canonicalSegments = rawSegments.filter((segment) => segment !== '.');
  if (canonicalSegments.length === 0) return true;
  const canonical = canonicalSegments.join('/');
  const policyPrefixes = Array.isArray(policy.protectedPathPrefixes) ? policy.protectedPathPrefixes.map(String) : [];
  const protectedPrefixes = [...new Set([...MANDATORY_PROTECTED_PATH_PREFIXES, ...policyPrefixes])];
  return protectedPrefixes.some((prefix) => protectedPrefixMatchesPath(prefix, canonical, canonicalSegments));
}

/** @param {string} workingDirectory @param {Record<string, unknown>} policy */
function isUnsafeWorkingDirectory(workingDirectory, policy) {
  const trimmed = workingDirectory.trim();
  let normalized = trimmed.replaceAll('\\', '/').replace(/\/+$/u, '');
  while (normalized.startsWith('./')) normalized = normalized.slice(2);
  if (normalized === '.') return false;
  if (normalized === '' || normalized === '/' || normalized === '~' || normalized === '..') return true;
  if (/^[A-Za-z]:/.test(normalized) || normalized.startsWith('//')) return true;
  if (normalized.startsWith('/') || normalized.startsWith('~')) return true;
  const rawSegments = normalized.split('/');
  if (rawSegments.some((segment) => segment === '' || segment === '..')) return true;
  const canonicalSegments = rawSegments.filter((segment) => segment !== '.');
  if (canonicalSegments.length === 0) return false;
  const canonical = canonicalSegments.join('/');
  const policyPrefixes = Array.isArray(policy.protectedPathPrefixes) ? policy.protectedPathPrefixes.map(String) : [];
  const protectedPrefixes = [...new Set([...MANDATORY_PROTECTED_PATH_PREFIXES, ...policyPrefixes])];
  return protectedPrefixes.some((prefix) => protectedPrefixMatchesPath(prefix, canonical, canonicalSegments));
}

/** @param {string} prefix @param {string} canonical @param {string[]} canonicalSegments */
function protectedPrefixMatchesPath(prefix, canonical, canonicalSegments) {
  const normalizedPrefix = prefix.replaceAll('\\', '/').replace(/\/$/, '');
  const prefixSegments = normalizedPrefix.split('/').filter((segment) => segment !== '.');
  const canonicalPrefix = prefixSegments.join('/');
  if (canonicalPrefix === '/') return canonical === '/';
  if (canonicalPrefix === '..') return canonical === '..' || canonical.startsWith('../') || canonicalSegments.includes('..');
  if (canonicalPrefix === '~') return canonical === '~' || canonical.startsWith('~');
  return canonical === canonicalPrefix || canonical.startsWith(`${canonicalPrefix}/`);
}

/** @param {{env?: unknown, config?: unknown}} input @param {Record<string, unknown>} policy */
export function evaluateEnvConfigSafety(input, policy = DEFAULT_SECURITY_POLICY) {
  /** @type {ReturnType<typeof createSecurityFinding>[]} */
  const findings = [];
  if (input.env !== undefined) scanKeyValueRecord(input.env, 'env', findings, policy);
  if (input.config !== undefined) scanKeyValueRecord(input.config, 'config', findings, policy);
  return createSecurityGateResult({ subject: 'env_config', findings });
}

/** @param {unknown} value @param {string} location @param {ReturnType<typeof createSecurityFinding>[]} findings @param {Record<string, unknown>} policy */
function scanKeyValueRecord(value, location, findings, policy) {
  if (!isRecord(value)) {
    findings.push(createSecurityFinding({ category: SecurityCategory.EnvConfig, classification: SecurityClassification.UnsafeConfigDefault, severity: SecuritySeverity.Critical, blocking: true, message: 'Env/config input must be an object.', location }));
    return;
  }
  scanConfigValue(value, location, location.split('.').at(-1) ?? location, findings, policy, { seen: new WeakSet(), depth: 0 });
}

/** @param {unknown} value @param {string} location @param {string} key @param {ReturnType<typeof createSecurityFinding>[]} findings @param {Record<string, unknown>} policy @param {{seen: WeakSet<object>, depth: number}} context */
function scanConfigValue(value, location, key, findings, policy, context) {
  if (context.depth > REDACTION_MAX_DEPTH) {
    findings.push(createSecurityFinding({ category: SecurityCategory.EnvConfig, classification: SecurityClassification.UnsafeConfigDefault, severity: SecuritySeverity.Critical, blocking: true, message: 'Env/config input exceeds supported depth.', location }));
    return;
  }
  if (typeof value === 'string') {
    if (isSecretLikeKey(key) || isSecretLikeValue(value)) {
      findings.push(createSecurityFinding({ category: SecurityCategory.Secret, classification: SecurityClassification.SecretLikeValue, severity: SecuritySeverity.Critical, blocking: true, message: 'Secret-like env/config value is denied.', location, details: { key, value } }));
    }
    if (policy.allowProductionCredentials !== true && (isProductionLike(key) || isProductionLike(value))) {
      findings.push(createSecurityFinding({ category: SecurityCategory.ProductionCredential, classification: SecurityClassification.ProductionCredentialOrDefault, severity: SecuritySeverity.Critical, blocking: true, message: 'Production-like env/config default is denied.', location, details: { key, value } }));
    }
    return;
  }
  if (value === true && /enabled|integration|external|production|deploy|release/i.test(key)) {
    findings.push(createSecurityFinding({ category: SecurityCategory.EnvConfig, classification: SecurityClassification.UnsafeEnvDefault, severity: SecuritySeverity.Critical, blocking: true, message: 'Unsafe env/config default enables an integration or production-like behavior.', location, details: { key } }));
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > REDACTION_MAX_ARRAY_ITEMS) {
      findings.push(createSecurityFinding({ category: SecurityCategory.EnvConfig, classification: SecurityClassification.UnsafeConfigDefault, severity: SecuritySeverity.Critical, blocking: true, message: 'Env/config array exceeds supported item cap.', location, details: { length: value.length } }));
    }
    for (const [index, entry] of value.slice(0, REDACTION_MAX_ARRAY_ITEMS).entries()) {
      scanConfigValue(entry, `${location}[${index}]`, key, findings, policy, { seen: context.seen, depth: context.depth + 1 });
    }
    return;
  }
  if (isRecord(value)) {
    if (context.seen.has(value)) {
      findings.push(createSecurityFinding({ category: SecurityCategory.EnvConfig, classification: SecurityClassification.UnsafeConfigDefault, severity: SecuritySeverity.Critical, blocking: true, message: 'Env/config contains a circular object.', location }));
      return;
    }
    context.seen.add(value);
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    if (entries.length > REDACTION_MAX_OBJECT_KEYS) {
      findings.push(createSecurityFinding({ category: SecurityCategory.EnvConfig, classification: SecurityClassification.UnsafeConfigDefault, severity: SecuritySeverity.Critical, blocking: true, message: 'Env/config object exceeds supported key cap.', location, details: { keyCount: entries.length } }));
    }
    for (const [childKey, entry] of entries.slice(0, REDACTION_MAX_OBJECT_KEYS)) {
      scanConfigValue(entry, `${location}.${childKey}`, childKey, findings, policy, { seen: context.seen, depth: context.depth + 1 });
    }
    context.seen.delete(value);
    return;
  }
  if (typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function' || value === undefined) {
    findings.push(createSecurityFinding({ category: SecurityCategory.EnvConfig, classification: SecurityClassification.UnsafeConfigDefault, severity: SecuritySeverity.Critical, blocking: true, message: 'Env/config contains a non-JSON-safe value.', location, details: { type: typeof value } }));
  }
}

/** @param {unknown} integrationsInput @param {Record<string, unknown>} policy */
export function evaluateExternalIntegrationSafety(integrationsInput, policy = DEFAULT_SECURITY_POLICY) {
  /** @type {ReturnType<typeof createSecurityFinding>[]} */
  const findings = [];
  if (!Array.isArray(integrationsInput)) {
    findings.push(createSecurityFinding({ category: SecurityCategory.ExternalIntegration, classification: SecurityClassification.UnsafeExternalIntegration, severity: SecuritySeverity.Critical, blocking: true, message: 'External integrations input must be an array.' }));
    return createSecurityGateResult({ subject: 'external_integration', findings });
  }
  const allowedModes = Array.isArray(policy.allowedExternalIntegrationModes) ? policy.allowedExternalIntegrationModes : [];
  for (const [index, integration] of integrationsInput.entries()) {
    const location = `externalIntegrations[${index}]`;
    if (!isRecord(integration)) {
      findings.push(createSecurityFinding({ category: SecurityCategory.ExternalIntegration, classification: SecurityClassification.UnsafeExternalIntegration, severity: SecuritySeverity.Critical, blocking: true, message: 'External integration entry must be an object.', location }));
      continue;
    }
    findings.push(...unknownFieldFindings(integration, EXTERNAL_KEYS, SecurityClassification.UnknownRequestField));
    if (integration.id !== undefined && (typeof integration.id !== 'string' || integration.id.trim() === '')) {
      findings.push(createMalformedRequestFinding('External integration id must be a non-empty string when provided.', `${location}.id`, { receivedType: typeof integration.id }));
    }
    if (integration.mode !== undefined && typeof integration.mode !== 'string') {
      findings.push(createMalformedRequestFinding('External integration mode must be a string when provided.', `${location}.mode`, { receivedType: typeof integration.mode }));
    }
    for (const field of ['enabled', 'requiresCredential', 'requiresBudget', 'requiresNetwork', 'networkMutation', 'explicitApproval']) {
      if (integration[field] !== undefined && typeof integration[field] !== 'boolean') {
        findings.push(createMalformedRequestFinding('External integration boolean fields must be booleans when provided.', `${location}.${field}`, { receivedType: typeof integration[field] }));
      }
    }
    const mode = stringValue(integration.mode) || (integration.enabled === false ? ExternalIntegrationMode.Disabled : ExternalIntegrationMode.Enabled);
    if (!EXTERNAL_MODE_VALUES.has(mode)) {
      findings.push(createSecurityFinding({ category: SecurityCategory.ExternalIntegration, classification: SecurityClassification.UnsafeExternalIntegration, severity: SecuritySeverity.Critical, blocking: true, message: 'External integration mode is not a known typed mode.', location, details: { mode } }));
    }
    if (!allowedModes.includes(mode) || integration.enabled === true || integration.requiresCredential === true || integration.requiresBudget === true || integration.networkMutation === true || (integration.requiresNetwork === true && mode !== ExternalIntegrationMode.ReadOnly)) {
      findings.push(createSecurityFinding({ category: SecurityCategory.ExternalIntegration, classification: SecurityClassification.UnsafeExternalIntegration, severity: SecuritySeverity.Critical, blocking: true, message: 'External integration is not disabled, dry-run, read-only, or local-fixture safe by default.', location, details: integration }));
    }
    if ((integration.requiresCredential === true || integration.requiresBudget === true || integration.networkMutation === true) && integration.explicitApproval !== true) {
      findings.push(createSecurityFinding({ category: SecurityCategory.ExternalIntegration, classification: SecurityClassification.UnsafeExternalIntegration, severity: SecuritySeverity.Critical, blocking: true, message: 'External integration requires live credential, budget, network mutation, or approval and is blocked.', location, details: integration }));
    }
  }
  return createSecurityGateResult({ subject: 'external_integration', findings });
}

/** @param {unknown} sandboxInput @param {Record<string, unknown>} policy */
export function evaluateSandboxCapability(sandboxInput, policy = DEFAULT_SECURITY_POLICY) {
  /** @type {ReturnType<typeof createSecurityFinding>[]} */
  const findings = [];
  const claims = Array.isArray(sandboxInput) ? sandboxInput : [sandboxInput];
  const allowedStatuses = Array.isArray(policy.allowedSandboxCapabilityStatuses) ? policy.allowedSandboxCapabilityStatuses : [];
  for (const [index, claim] of claims.entries()) {
    const location = `sandboxClaims[${index}]`;
    if (!isRecord(claim)) {
      findings.push(createSecurityFinding({ category: SecurityCategory.SandboxCapability, classification: SecurityClassification.UnsupportedSandboxClaim, severity: SecuritySeverity.Critical, blocking: true, message: 'Sandbox claim must be an object.', location }));
      continue;
    }
    findings.push(...unknownFieldFindings(claim, SANDBOX_KEYS, SecurityClassification.UnknownRequestField));
    if (typeof claim.provider !== 'string' || claim.provider.trim() === '') {
      findings.push(createMalformedRequestFinding('Sandbox provider must be a non-empty string.', `${location}.provider`, { receivedType: typeof claim.provider }));
    }
    if (typeof claim.status !== 'string' || claim.status.trim() === '') {
      findings.push(createMalformedRequestFinding('Sandbox status must be a non-empty string.', `${location}.status`, { receivedType: typeof claim.status }));
    }
    if (typeof claim.claim !== 'string' || claim.claim.trim() === '') {
      findings.push(createMalformedRequestFinding('Sandbox claim must be a non-empty string.', `${location}.claim`, { receivedType: typeof claim.claim }));
    }
    const status = stringValue(claim.status);
    if (!SANDBOX_STATUS_VALUES.has(status) || status === SandboxCapabilityStatus.BlockedPendingLive || !allowedStatuses.includes(status)) {
      findings.push(createSecurityFinding({ category: SecurityCategory.SandboxCapability, classification: SecurityClassification.UnsupportedSandboxClaim, severity: SecuritySeverity.Critical, blocking: true, message: 'Unsupported, fake, or pending-live sandbox claim is blocked.', location, details: claim }));
    }
  }
  return createSecurityGateResult({ subject: 'sandbox_capability', findings });
}

/** @param {unknown} evidenceInput */
export function evaluateEvidenceSafety(evidenceInput) {
  /** @type {ReturnType<typeof createSecurityFinding>[]} */
  const findings = [];
  const sanitized = redactSecurityValueWithMetadata(evidenceInput);
  if (sanitized.changed || sanitized.truncated) {
    findings.push(createSecurityFinding({ category: SecurityCategory.EvidenceIntegrity, classification: SecurityClassification.EvidenceSecretLeak, severity: SecuritySeverity.Critical, blocking: true, message: 'Evidence, diagnostic, result, or log payload contained secret-like, non-JSON-safe, cyclic, or over-cap data and was redacted.', details: sanitized.value }));
  }
  return createSecurityGateResult({ subject: 'evidence_integrity', findings, redactions: [sanitized.value] });
}

/** @param {unknown} notesInput @param {Record<string, unknown>} policy */
function evaluateNotes(notesInput, policy) {
  /** @type {ReturnType<typeof createSecurityFinding>[]} */
  const findings = [];
  const notes = Array.isArray(notesInput) ? notesInput : [notesInput];
  const advisoryClassifications = Array.isArray(policy.advisoryClassifications) ? policy.advisoryClassifications : [];
  for (const [index, note] of notes.entries()) {
    if (!isRecord(note)) {
      findings.push(createSecurityFinding({ category: SecurityCategory.PolicyContract, classification: SecurityClassification.UnknownRequestField, severity: SecuritySeverity.Critical, blocking: true, message: 'Note must be an object.', location: `notes[${index}]` }));
      continue;
    }
    findings.push(...unknownFieldFindings(note, NOTE_KEYS, SecurityClassification.UnknownRequestField));
    const classification = stringValue(note.classification) || SecurityClassification.AdvisoryNotice;
    const severity = stringValue(note.severity) || SecuritySeverity.Advisory;
    if (!SECURITY_CLASSIFICATION_VALUES.has(classification)) {
      findings.push(createMalformedRequestFinding('Note classification is not a known typed classification.', `notes[${index}].classification`, { classification }));
      continue;
    }
    if (!SECURITY_SEVERITY_VALUES.has(severity)) {
      findings.push(createMalformedRequestFinding('Note severity is not a known typed severity.', `notes[${index}].severity`, { severity }));
      continue;
    }
    const advisory = advisoryClassifications.includes(classification) && severity === SecuritySeverity.Advisory;
    findings.push(createSecurityFinding({ category: SecurityCategory.PolicyContract, classification, severity: advisory ? SecuritySeverity.Advisory : SecuritySeverity.Critical, blocking: !advisory, message: stringValue(note.message) || 'Security note.', location: `notes[${index}]`, details: note }));
  }
  return createSecurityGateResult({ subject: 'notes', findings });
}

export function __i18aCliBoundarySmoke() {
  const result = runSecurityGate({
    command: { command: 'node', argv: ['packages/security/fixtures/policy/witness.mjs'], classification: CommandSafetyClassification.ReadOnly, targetPaths: ['packages/security/fixtures/policy/witness.mjs'] },
    env: { NODE_ENV: 'test', VIBE_ENGINEER_MODE: 'local' },
    externalIntegrations: [{ id: 'sample-disabled', mode: ExternalIntegrationMode.Disabled, enabled: false }],
    sandboxClaims: [{ provider: 'pi', status: SandboxCapabilityStatus.Unknown, claim: 'No isolation claim made by I-18A.' }],
  });
  return {
    ok: result.status === SecurityGateStatus.Passed,
    status: result.status,
    decision: result.decision,
    exportsExercised: ['runSecurityGate', 'parseSecurityPolicy', 'redactSecurityText'],
  };
}
