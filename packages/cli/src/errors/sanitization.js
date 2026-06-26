const SECRET_FLAG_IDENTIFIERS = Object.freeze([
  "token",
  "auth-token",
  "access-token",
  "password",
  "passphrase",
  "secret",
  "api-key",
  "apikey",
  "credential",
  "credentials",
  "client-secret",
  "clientsecret"
]);

const SECRET_FLAG_SEGMENTS = Object.freeze(["token", "password", "secret", "credential"]);
const VALUE_PLACEHOLDER = "<value>";
const SECRET_PLACEHOLDER = "<redacted>";
const COMMAND_PLACEHOLDER = "<unknown-command>";

const VALUE_FLAGS = new Set(["--result-file", "--project-root", "--config", "--status"]);
const SAFE_COMMAND_IDS = new Set([
  "help",
  "version",
  "foundation",
  "create",
  "import",
  "doctor",
  "config",
  "schematic",
  "verify",
  "security",
  "build",
  "ship",
  "context",
  "registry",
  "update",
  "init"
]);

export function parseFlagToken(token) {
  if (typeof token !== "string" || !token.startsWith("--")) {
    return { isFlag: false, flag: null, hasInlineValue: false, value: null };
  }
  const equalsAt = token.indexOf("=");
  if (equalsAt === -1) return { isFlag: true, flag: token, hasInlineValue: false, value: null };
  return {
    isFlag: true,
    flag: token.slice(0, equalsAt),
    hasInlineValue: true,
    value: token.slice(equalsAt + 1)
  };
}

export function normalizeFlagIdentifier(flag) {
  if (typeof flag !== "string") return "";
  let cursor = flag;
  while (cursor.startsWith("-")) cursor = cursor.slice(1);
  return cursor.toLowerCase().replaceAll("_", "-");
}

export function isSecretFlag(flag) {
  const identifier = normalizeFlagIdentifier(flag);
  if (SECRET_FLAG_IDENTIFIERS.includes(identifier)) return true;
  const segments = identifier.split("-").filter((segment) => segment.length > 0);
  return segments.some((segment) => SECRET_FLAG_SEGMENTS.includes(segment));
}

export function sanitizeFlagForDisplay(token) {
  const parsed = parseFlagToken(token);
  if (!parsed.isFlag) return VALUE_PLACEHOLDER;
  if (!parsed.hasInlineValue) return parsed.flag;
  return `${parsed.flag}=${isSecretFlag(parsed.flag) ? SECRET_PLACEHOLDER : VALUE_PLACEHOLDER}`;
}

export function sanitizeCommandForDisplay(commandId) {
  return SAFE_COMMAND_IDS.has(commandId) ? commandId : COMMAND_PLACEHOLDER;
}

export function sanitizeUserValueForDisplay({ secret = false } = {}) {
  return secret ? SECRET_PLACEHOLDER : VALUE_PLACEHOLDER;
}

export function sanitizeArgvForMetadata(argv) {
  const sanitized = [];
  let redactNext = false;
  let valueNext = false;
  let commandSeen = false;

  for (const token of argv) {
    if (redactNext) {
      sanitized.push(SECRET_PLACEHOLDER);
      redactNext = false;
      continue;
    }
    if (valueNext) {
      sanitized.push(VALUE_PLACEHOLDER);
      valueNext = false;
      continue;
    }

    const parsed = parseFlagToken(token);
    if (parsed.isFlag) {
      sanitized.push(sanitizeFlagForDisplay(token));
      if (!parsed.hasInlineValue && isSecretFlag(parsed.flag)) redactNext = true;
      if (!parsed.hasInlineValue && VALUE_FLAGS.has(parsed.flag)) valueNext = true;
      continue;
    }

    if (!commandSeen) {
      sanitized.push(sanitizeCommandForDisplay(token));
      commandSeen = true;
      continue;
    }

    sanitized.push(VALUE_PLACEHOLDER);
  }

  return sanitized;
}
